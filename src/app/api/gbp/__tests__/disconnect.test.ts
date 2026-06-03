import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/env', () => ({
  env: {
    GBP_TOKEN_ENC_KEY:       'e'.repeat(64),
    GBP_OAUTH_CLIENT_ID:     undefined,
    GBP_OAUTH_CLIENT_SECRET: undefined,
    GBP_OAUTH_REDIRECT_URI:  undefined,
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
vi.mock('@/lib/supabase/admin',  () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/businesses/current', () => ({ getCurrentBusiness: vi.fn() }));

import { POST } from '../disconnect/route';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentBusiness } from '@/lib/businesses/current';

// Build a chainable Supabase query mock that captures .eq() calls
function buildDbMock() {
  const updateResult = { error: null };
  const eqCalls: { col: string; val: string }[] = [];

  const eqFn = vi.fn().mockImplementation((col: string, val: string) => {
    eqCalls.push({ col, val });
    return { eq: eqFn, then: (resolve: (v: typeof updateResult) => void) => resolve(updateResult) };
  });

  const updateMock = vi.fn().mockReturnValue({ eq: eqFn });
  const fromMock   = vi.fn().mockReturnValue({ update: updateMock });

  vi.mocked(createAdminClient).mockReturnValue({ from: fromMock } as unknown as ReturnType<typeof createAdminClient>);
  return { fromMock, updateMock, eqFn, eqCalls };
}

function mockUser(userId: string | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

function makeReq(body: object = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/gbp/disconnect', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe('POST /api/gbp/disconnect', () => {
  it('returns 401 when unauthenticated', async () => {
    mockUser(null);
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 404 when no business found for the user', async () => {
    mockUser('user-1');
    vi.mocked(getCurrentBusiness).mockResolvedValue({ business: null, error: null, schema: null });
    buildDbMock();
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
  });

  it('revokes all connections for the business when no connection_id provided', async () => {
    mockUser('user-1');
    vi.mocked(getCurrentBusiness).mockResolvedValue({
      business: { id: 'biz-1', name: 'Test' } as never,
      error: null,
      schema: 'current',
    });
    const { updateMock, eqFn } = buildDbMock();

    const res = await POST(makeReq({}));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    // update called with revoked state
    expect(updateMock).toHaveBeenCalledWith({ status: 'revoked', refresh_token: null });
    // business_id filter always applied
    expect(eqFn).toHaveBeenCalledWith('business_id', 'biz-1');
    // connection_id filter NOT applied (no body.connection_id)
    const connIdCalls = eqFn.mock.calls.filter(c => c[0] === 'id');
    expect(connIdCalls).toHaveLength(0);
  });

  it('revokes only the specified connection when connection_id is provided', async () => {
    mockUser('user-1');
    vi.mocked(getCurrentBusiness).mockResolvedValue({
      business: { id: 'biz-1', name: 'Test' } as never,
      error: null,
      schema: 'current',
    });
    const { updateMock, eqFn } = buildDbMock();

    const res = await POST(makeReq({ connection_id: 'conn-abc' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(updateMock).toHaveBeenCalledWith({ status: 'revoked', refresh_token: null });
    // Both business_id AND id filters applied
    expect(eqFn).toHaveBeenCalledWith('business_id', 'biz-1');
    expect(eqFn).toHaveBeenCalledWith('id', 'conn-abc');
  });

  it('cannot revoke another business connection — business_id always scoped to authenticated user', async () => {
    // User owns biz-1 but tries to disconnect conn from biz-2
    mockUser('user-1');
    vi.mocked(getCurrentBusiness).mockResolvedValue({
      business: { id: 'biz-1', name: 'My Biz' } as never,
      error: null,
      schema: 'current',
    });
    const { eqFn } = buildDbMock();

    await POST(makeReq({ connection_id: 'conn-from-biz-2' }));

    // business_id filter is always 'biz-1' regardless of connection_id
    expect(eqFn).toHaveBeenCalledWith('business_id', 'biz-1');
    // The id filter is also applied (conn-from-biz-2) but business_id scoping means
    // it won't match in the real DB — the test verifies the filter is always present
    expect(eqFn).toHaveBeenCalledWith('id', 'conn-from-biz-2');
  });
});
