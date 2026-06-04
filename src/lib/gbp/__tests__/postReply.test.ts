import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock isGbpLive ─────────────────────────────────────────────
const mockIsGbpLive = vi.hoisted(() => vi.fn<[], Promise<boolean>>());

vi.mock('@/lib/gbp/liveFlag', () => ({
  isGbpLive: mockIsGbpLive,
}));

vi.mock('@/lib/env', () => ({
  env: {
    SUPABASE_URL:          'http://localhost:54321',
    SUPABASE_ANON_KEY:     'test-anon',
    SUPABASE_SERVICE_ROLE: 'test-service-role',
    APP_URL:               'http://localhost:3000',
    GBP_TOKEN_ENC_KEY:     'a'.repeat(64),
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    }),
  })),
}));

import { postReplyToGoogle } from '../postReply';

const ARGS = {
  accountId:      'acct-123',
  locationId:     'loc-456',
  googleReviewId: 'review-789',
  replyText:      'Thank you for your review!',
  accessToken:    'mock-access-token',
};

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

// ── Mock mode (GBP_LIVE = false) ──────────────────────────────

describe('postReplyToGoogle — mock mode', () => {
  it('returns {ok:true} without calling fetch', async () => {
    mockIsGbpLive.mockResolvedValue(false);
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    const result = await postReplyToGoogle(ARGS);

    expect(result).toEqual({ ok: true });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('never reaches Google URL in mock mode', async () => {
    mockIsGbpLive.mockResolvedValue(false);
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await postReplyToGoogle({ ...ARGS, googleReviewId: 'review-should-not-be-called' });

    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('mybusiness.googleapis.com'),
      expect.anything(),
    );
  });
});

// ── Live mode (GBP_LIVE = true) ───────────────────────────────

describe('postReplyToGoogle — live mode', () => {
  it('PUTs to the correct Google URL with correct headers and body', async () => {
    mockIsGbpLive.mockResolvedValue(true);
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);

    await postReplyToGoogle(ARGS);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://mybusiness.googleapis.com/v4/accounts/acct-123/locations/loc-456/reviews/review-789/reply',
    );
    expect(opts.method).toBe('PUT');
    expect((opts.headers as Record<string, string>)['Authorization']).toBe('Bearer mock-access-token');
    expect(JSON.parse(opts.body as string)).toEqual({ comment: ARGS.replyText });
  });

  it('throws on non-2xx response', async () => {
    mockIsGbpLive.mockResolvedValue(true);
    const mockFetch = vi.fn().mockResolvedValue({
      ok:   false,
      status: 403,
      text: vi.fn().mockResolvedValue('Permission denied'),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(postReplyToGoogle(ARGS)).rejects.toThrow('403');
  });
});
