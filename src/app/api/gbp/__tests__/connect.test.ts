import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted values (available inside vi.mock factories) ────────
const TEST_KEY = vi.hoisted(() => 'c'.repeat(64));
const { mockGenerateAuthUrl, mockBuildState } = vi.hoisted(() => ({
  mockGenerateAuthUrl: vi.fn((opts: Record<string, unknown>) => {
    const scope = Array.isArray(opts.scope)
      ? (opts.scope as string[]).join(' ')
      : String(opts.scope);
    return `https://accounts.google.com/o/oauth2/v2/auth?scope=${encodeURIComponent(scope)}&state=${opts.state}&access_type=${opts.access_type}&prompt=${opts.prompt}`;
  }),
  mockBuildState: vi.fn((businessId: string, next: string) => `state::${businessId}::${next}`),
}));

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

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/businesses/current', () => ({ getCurrentBusiness: vi.fn() }));

vi.mock('@/lib/gbp/oauth', () => ({
  GBP_SCOPE:           'https://www.googleapis.com/auth/business.manage',
  buildState:          mockBuildState,
  parseState:          vi.fn(),
  createOAuth2Client:  vi.fn(() => ({ generateAuthUrl: mockGenerateAuthUrl })),
  listAccounts:        vi.fn(),
  listLocations:       vi.fn(),
  fetchReviews:        vi.fn(),
  starRatingToInt:     vi.fn(),
  withRetry:           vi.fn(),
}));

import { GET } from '../connect/route';
import { createClient } from '@/lib/supabase/server';
import { getCurrentBusiness } from '@/lib/businesses/current';

function mockAuth(userId: string | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

function makeReq(path = 'http://localhost:3000/api/gbp/connect'): NextRequest {
  return new NextRequest(path);
}

beforeEach(() => vi.clearAllMocks());

describe('GET /api/gbp/connect', () => {
  it('redirects to /login when unauthenticated', async () => {
    mockAuth(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/login');
  });

  it('returns 404 when user has no business', async () => {
    mockAuth('user-1');
    vi.mocked(getCurrentBusiness).mockResolvedValue({ business: null, error: null, schema: 'modern' });
    const res = await GET(makeReq());
    expect(res.status).toBe(404);
  });

  it('redirects to Google consent URL with correct OAuth params', async () => {
    mockAuth('user-1');
    vi.mocked(getCurrentBusiness).mockResolvedValue({
      business: { id: 'biz-1', name: 'Test Biz' } as never,
      error: null, schema: 'modern',
    });

    const res      = await GET(makeReq());
    expect(res.status).toBe(307);
    const location = res.headers.get('location')!;
    expect(location).toContain('accounts.google.com');

    const url = new URL(location);
    expect(decodeURIComponent(url.searchParams.get('scope')!))
      .toContain('business.manage');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
  });

  it('calls buildState with the correct businessId', async () => {
    mockAuth('user-1');
    vi.mocked(getCurrentBusiness).mockResolvedValue({
      business: { id: 'biz-abc', name: 'Test' } as never,
      error: null, schema: 'modern',
    });

    await GET(makeReq());
    expect(mockBuildState).toHaveBeenCalledWith('biz-abc', expect.any(String));
  });

  it('embeds the state returned by buildState in the redirect URL', async () => {
    mockAuth('user-1');
    vi.mocked(getCurrentBusiness).mockResolvedValue({
      business: { id: 'biz-1', name: 'Test' } as never,
      error: null, schema: 'modern',
    });
    mockBuildState.mockReturnValue('my-signed-state');

    const res      = await GET(makeReq());
    const location = res.headers.get('location')!;
    expect(location).toContain('my-signed-state');
  });

  it('defaults next to /app/business_dashboard when not provided', async () => {
    mockAuth('user-1');
    vi.mocked(getCurrentBusiness).mockResolvedValue({
      business: { id: 'biz-1', name: 'Test' } as never,
      error: null, schema: 'modern',
    });

    await GET(makeReq());
    expect(mockBuildState).toHaveBeenCalledWith(
      expect.any(String),
      '/app/business_dashboard',
    );
  });

  it('passes a safe next param through to buildState', async () => {
    mockAuth('user-1');
    vi.mocked(getCurrentBusiness).mockResolvedValue({
      business: { id: 'biz-1', name: 'Test' } as never,
      error: null, schema: 'modern',
    });

    await GET(new NextRequest('http://localhost:3000/api/gbp/connect?next=/app/business_dashboard/onboarding'));
    expect(mockBuildState).toHaveBeenCalledWith(
      expect.any(String),
      '/app/business_dashboard/onboarding',
    );
  });

  it('returns 503 when createOAuth2Client throws (missing GBP env vars)', async () => {
    mockAuth('user-1');
    vi.mocked(getCurrentBusiness).mockResolvedValue({
      business: { id: 'biz-1', name: 'Test' } as never,
      error: null, schema: 'modern',
    });
    const { createOAuth2Client } = await import('@/lib/gbp/oauth');
    vi.mocked(createOAuth2Client).mockImplementationOnce(() => {
      throw new Error('[gbp] env not set');
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(503);
  });
});
