import { describe, it, expect, vi } from 'vitest';

const TEST_KEY = vi.hoisted(() => 'b'.repeat(64));

vi.mock('@/lib/env', () => ({
  env: {
    GBP_TOKEN_ENC_KEY:       TEST_KEY,
    GBP_OAUTH_CLIENT_ID:     'test-client-id',
    GBP_OAUTH_CLIENT_SECRET: 'test-client-secret',
    GBP_OAUTH_REDIRECT_URI:  'http://localhost:3000/api/gbp/callback',
    SUPABASE_URL:            'http://localhost:54321',
    SUPABASE_ANON_KEY:       'test-anon',
    SUPABASE_SERVICE_ROLE:   'test-service-role',
    APP_URL:                 'http://localhost:3000',
    UPSTASH_URL:             undefined,
    UPSTASH_TOKEN:           undefined,
    CRON_SECRET:             undefined,
    SENTRY_DSN:              undefined,
  },
}));

import { buildState, parseState, GbpApiError, withRetry, starRatingToInt } from '../oauth';

// ── buildState / parseState ────────────────────────────────────

describe('buildState / parseState', () => {
  it('round-trips businessId and next path', () => {
    const state  = buildState('biz-123', '/app/business_dashboard/onboarding');
    const result = parseState(state);
    expect(result).not.toBeNull();
    expect(result!.businessId).toBe('biz-123');
    expect(result!.next).toBe('/app/business_dashboard/onboarding');
  });

  it('returns null for a tampered state', () => {
    const state   = buildState('biz-123', '/dashboard');
    const tampered = state.slice(0, -4) + 'XXXX';
    expect(parseState(tampered)).toBeNull();
  });

  it('returns null for an expired state (>10 min)', () => {
    vi.useFakeTimers();
    const state = buildState('biz-123', '/dashboard');
    vi.advanceTimersByTime(11 * 60 * 1000);
    expect(parseState(state)).toBeNull();
    vi.useRealTimers();
  });

  it('sanitises an unsafe next path to /app/business_dashboard', () => {
    const state  = buildState('biz-123', '//evil.com/steal');
    const result = parseState(state);
    expect(result).not.toBeNull();
    expect(result!.next).toBe('/app/business_dashboard');
  });

  it('returns null for completely invalid base64', () => {
    expect(parseState('not-valid-base64!!!')).toBeNull();
  });
});

// ── starRatingToInt ───────────────────────────────────────────

describe('starRatingToInt', () => {
  it.each([
    ['ONE', 1], ['TWO', 2], ['THREE', 3], ['FOUR', 4], ['FIVE', 5],
  ])('maps %s → %i', (rating, expected) => {
    expect(starRatingToInt(rating)).toBe(expected);
  });

  it('returns 0 for unknown rating strings', () => {
    expect(starRatingToInt('UNKNOWN')).toBe(0);
    expect(starRatingToInt('')).toBe(0);
  });
});

// ── withRetry ─────────────────────────────────────────────────

describe('withRetry', () => {
  it('returns immediately when fn succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    expect(await withRetry(fn, 3, () => 0)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 and succeeds on second attempt', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new GbpApiError('rate limited', 429))
      .mockResolvedValueOnce('ok');
    expect(await withRetry(fn, 3, () => 0)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on 503 (5xx transient)', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new GbpApiError('server error', 503))
      .mockRejectedValueOnce(new GbpApiError('server error', 503))
      .mockResolvedValueOnce('ok');
    expect(await withRetry(fn, 3, () => 0)).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry on 401 (non-transient)', async () => {
    const fn = vi.fn().mockRejectedValue(new GbpApiError('unauthorized', 401));
    await expect(withRetry(fn, 3, () => 0)).rejects.toThrow('unauthorized');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry on 404 (non-transient)', async () => {
    const fn = vi.fn().mockRejectedValue(new GbpApiError('not found', 404));
    await expect(withRetry(fn, 3, () => 0)).rejects.toThrow('not found');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('exhausts retries and re-throws the last error', async () => {
    const fn = vi.fn().mockRejectedValue(new GbpApiError('rate limited', 429));
    await expect(withRetry(fn, 3, () => 0)).rejects.toThrow('rate limited');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry plain Error (no .status property)', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('network error'));
    await expect(withRetry(fn, 3, () => 0)).rejects.toThrow('network error');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
