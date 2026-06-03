import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted values ─────────────────────────────────────────────
const TEST_KEY = vi.hoisted(() => 'd'.repeat(64));
const {
  mockGetToken,
  mockListAccounts,
  mockListLocations,
  mockParseState,
} = vi.hoisted(() => ({
  mockGetToken:      vi.fn(),
  mockListAccounts:  vi.fn(),
  mockListLocations: vi.fn(),
  mockParseState:    vi.fn(),
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

vi.mock('@/lib/gbp/oauth', () => ({
  createOAuth2Client: vi.fn(() => ({ getToken: mockGetToken })),
  parseState:         mockParseState,
  listAccounts:       mockListAccounts,
  listLocations:      mockListLocations,
}));

const mockUpsert      = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }));
const mockMaybeSingle = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null }));
const mockFrom        = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET } from '../callback/route';
import { decryptToken } from '@/lib/security/encrypt';

const REFRESH_TOKEN = 'mock-refresh-token-xyz';
const ACCESS_TOKEN  = 'mock-access-token-abc';

function makeReq(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/gbp/callback');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url.toString());
}

function setupDb() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'gbp_connections') {
      return {
        upsert: mockUpsert,
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
            }),
          }),
        }),
      };
    }
    if (table === 'reply_settings') {
      return { upsert: mockUpsert };
    }
    return { upsert: mockUpsert };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetToken.mockResolvedValue({ tokens: { access_token: ACCESS_TOKEN, refresh_token: REFRESH_TOKEN } });
  mockMaybeSingle.mockResolvedValue({ data: null });
  mockParseState.mockReturnValue({ businessId: 'biz-1', next: '/app/business_dashboard' });
  mockListAccounts.mockResolvedValue([{ name: 'accounts/123', accountName: 'My Biz' }]);
  mockListLocations.mockResolvedValue([{ name: 'locations/456', title: 'Main Location' }]);
  setupDb();
});

describe('GET /api/gbp/callback', () => {
  it('redirects with gbp_error=denied when Google returns error param', async () => {
    const res = await GET(makeReq({ error: 'access_denied', state: 'x' }));
    expect(res.headers.get('location')).toContain('gbp_error=denied');
  });

  it('redirects with gbp_error=missing when code is absent', async () => {
    const res = await GET(makeReq({ state: 'x' }));
    expect(res.headers.get('location')).toContain('gbp_error=missing');
  });

  it('redirects with gbp_error=missing when state is absent', async () => {
    const res = await GET(makeReq({ code: 'abc' }));
    expect(res.headers.get('location')).toContain('gbp_error=missing');
  });

  it('redirects with gbp_error=invalid_state when parseState returns null', async () => {
    mockParseState.mockReturnValueOnce(null);
    const res = await GET(makeReq({ code: 'abc', state: 'bad-state' }));
    expect(res.headers.get('location')).toContain('gbp_error=invalid_state');
  });

  it('upserts one connection row per location and redirects to next', async () => {
    mockParseState.mockReturnValue({ businessId: 'biz-1', next: '/app/business_dashboard/onboarding' });

    const res = await GET(makeReq({ code: 'mycode', state: 'valid' }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/app/business_dashboard/onboarding');

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        business_id:       'biz-1',
        google_account_id: '123',
        location_id:       '456',
      }),
      expect.objectContaining({ onConflict: 'business_id,location_id' }),
    );
  });

  it('stores the refresh token ENCRYPTED (not plaintext)', async () => {
    await GET(makeReq({ code: 'mycode', state: 'valid' }));

    const call = mockUpsert.mock.calls.find(c => c[0]?.location_id === '456');
    const storedToken = call?.[0]?.refresh_token as string;

    expect(storedToken).toBeDefined();
    expect(storedToken).not.toBe(REFRESH_TOKEN);     // not plaintext
    expect(storedToken.split(':').length).toBe(3);   // iv:authTag:ciphertext
    // Should decrypt back to the original token
    expect(decryptToken(storedToken)).toBe(REFRESH_TOKEN);
  });

  it('upserts one connection per location across multiple locations', async () => {
    mockListLocations.mockResolvedValue([
      { name: 'locations/1' },
      { name: 'locations/2' },
      { name: 'locations/3' },
    ]);

    await GET(makeReq({ code: 'mycode', state: 'valid' }));

    const connectionUpserts = mockUpsert.mock.calls.filter(
      c => c[0]?.business_id === 'biz-1' && c[0]?.location_id,
    );
    expect(connectionUpserts).toHaveLength(3);
  });

  it('initialises reply_settings row with business_id on first connect', async () => {
    await GET(makeReq({ code: 'mycode', state: 'valid' }));

    // reply_settings upsert: has business_id, no location_id
    const settingsCall = mockUpsert.mock.calls.find(
      c => c[0]?.business_id === 'biz-1' && !c[0]?.location_id,
    );
    expect(settingsCall).toBeDefined();
    expect(settingsCall![1]).toMatchObject({ onConflict: 'business_id', ignoreDuplicates: true });
  });

  it('redirects to next with success when missing refresh_token but active connection exists', async () => {
    mockGetToken.mockResolvedValue({ tokens: { access_token: ACCESS_TOKEN } }); // no refresh_token
    mockMaybeSingle.mockResolvedValue({ data: { id: 'conn-existing' } });

    mockParseState.mockReturnValue({ businessId: 'biz-1', next: '/app/business_dashboard/onboarding' });
    const res = await GET(makeReq({ code: 'mycode', state: 'valid' }));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).not.toContain('gbp_error');
    expect(res.headers.get('location')).toContain('/app/business_dashboard/onboarding');
  });

  it('redirects with gbp_error=no_refresh_token when no token and no existing connection', async () => {
    mockGetToken.mockResolvedValue({ tokens: { access_token: ACCESS_TOKEN } }); // no refresh_token
    mockMaybeSingle.mockResolvedValue({ data: null });

    const res = await GET(makeReq({ code: 'mycode', state: 'valid' }));
    expect(res.headers.get('location')).toContain('gbp_error=no_refresh_token');
  });

  it('redirects with gbp_error=token_exchange when getToken throws', async () => {
    mockGetToken.mockRejectedValue(new Error('oauth error'));
    const res = await GET(makeReq({ code: 'badcode', state: 'valid' }));
    expect(res.headers.get('location')).toContain('gbp_error=token_exchange');
  });
});
