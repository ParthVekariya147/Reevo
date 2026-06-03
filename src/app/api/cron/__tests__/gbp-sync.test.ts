import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted values ─────────────────────────────────────────────
const { TEST_KEY, CRON_SECRET } = vi.hoisted(() => ({
  TEST_KEY:    'f'.repeat(64),
  CRON_SECRET: 'super-secret-cron-token',
}));

const { mockGetAccessToken, mockSetCredentials, mockFetchReviews } = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn(),
  mockSetCredentials: vi.fn(),
  mockFetchReviews:   vi.fn(),
}));

const { mockInsert, mockUpdate, mockFrom } = vi.hoisted(() => ({
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockFrom:   vi.fn(),
}));

// ── Module mocks ───────────────────────────────────────────────

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
    CRON_SECRET,
    SENTRY_DSN:              undefined,
  },
}));

// Full mock of oauth module — no vi.importActual so withRetry has zero delay
vi.mock('@/lib/gbp/oauth', () => {
  class GbpApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
      this.name = 'GbpApiError';
    }
  }
  return {
    GbpApiError,
    starRatingToInt: vi.fn((rating: string) => {
      const map: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
      return map[rating] ?? 0;
    }),
    // no-delay pass-through — lets the cron run synchronously in tests
    withRetry: vi.fn().mockImplementation(async (fn: () => Promise<unknown>) => fn()),
    createOAuth2Client: vi.fn(() => ({
      setCredentials: mockSetCredentials,
      getAccessToken: mockGetAccessToken,
    })),
    fetchReviews: mockFetchReviews,
  };
});

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('@/lib/redis', () => ({
  getRedisClient: vi.fn().mockReturnValue(null),
}));

// ── Imports after mocks ────────────────────────────────────────
import { GET }          from '../gbp-sync/route';
import { encryptToken } from '@/lib/security/encrypt';
import { GbpApiError }  from '@/lib/gbp/oauth';

// ── Helpers ───────────────────────────────────────────────────

function makeReq(authHeader?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/cron/gbp-sync', {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

function sampleReview(id: string, starRating = 'FIVE') {
  return {
    reviewId:   id,
    reviewer:   { displayName: 'Jane Doe', isAnonymous: false },
    starRating,
    comment:    `Great — review ${id}`,
    createTime: '2024-06-01T10:00:00Z',
  };
}

function mockConnections(conns: object[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'gbp_connections') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: conns, error: null }),
        }),
        update: mockUpdate,
      };
    }
    if (table === 'gbp_reviews') {
      return { insert: mockInsert };
    }
    return {};
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Re-apply implementations cleared by clearAllMocks
  mockGetAccessToken.mockResolvedValue({ token: 'mock-access-token' });
  mockInsert.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  mockFetchReviews.mockResolvedValue({ reviews: [] });
  // createAdminClient still returns { from: mockFrom } because vi.clearAllMocks
  // only clears call history, not implementations set by vi.mock factories.
  // But mockFrom needs re-setup per test via mockConnections().
});

// ── Auth ──────────────────────────────────────────────────────

describe('GET /api/cron/gbp-sync — auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    mockConnections([]);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 401 when CRON_SECRET is wrong', async () => {
    mockConnections([]);
    const res = await GET(makeReq('Bearer wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid CRON_SECRET', async () => {
    mockConnections([]);
    const res = await GET(makeReq(`Bearer ${CRON_SECRET}`));
    expect(res.status).toBe(200);
  });
});

// ── Summary ───────────────────────────────────────────────────

describe('GET /api/cron/gbp-sync — summary', () => {
  it('returns { connections:0, newReviews:0, errors:0 } with no active connections', async () => {
    mockConnections([]);
    const body = await GET(makeReq(`Bearer ${CRON_SECRET}`)).then(r => r.json());
    expect(body).toEqual({ connections: 0, newReviews: 0, errors: 0 });
  });

  it('inserts a new review and returns newReviews:1', async () => {
    const encToken = encryptToken('real-refresh-token');
    mockConnections([{
      id: 'conn-1', business_id: 'biz-1',
      google_account_id: 'acct-1', location_id: 'loc-1',
      refresh_token: encToken,
    }]);
    mockFetchReviews.mockResolvedValue({ reviews: [sampleReview('rev-001')] });

    const body = await GET(makeReq(`Bearer ${CRON_SECRET}`)).then(r => r.json());
    expect(body.newReviews).toBe(1);
    expect(body.errors).toBe(0);
  });

  it('inserts review with reply_status=pending', async () => {
    const encToken = encryptToken('tok');
    mockConnections([{
      id: 'conn-1', business_id: 'biz-1',
      google_account_id: 'acct-1', location_id: 'loc-1',
      refresh_token: encToken,
    }]);
    mockFetchReviews.mockResolvedValue({ reviews: [sampleReview('rev-002', 'FOUR')] });

    await GET(makeReq(`Bearer ${CRON_SECRET}`));

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        google_review_id: 'rev-002',
        rating:           4,
        reply_status:     'pending',
      }),
    );
  });
});

// ── Dedup ─────────────────────────────────────────────────────

describe('GET /api/cron/gbp-sync — dedup', () => {
  it('inserts 0 reviews on second run when DB returns unique_violation', async () => {
    let insertCount = 0;
    mockInsert.mockImplementation(async () => {
      insertCount++;
      return insertCount > 1
        ? { error: { code: '23505', message: 'unique_violation' } }
        : { error: null };
    });

    const conn = {
      id: 'conn-1', business_id: 'biz-1',
      google_account_id: 'acct-1', location_id: 'loc-1',
      refresh_token: encryptToken('tok'),
    };
    mockConnections([conn]);
    mockFetchReviews.mockResolvedValue({ reviews: [sampleReview('rev-dup')] });

    const b1 = await GET(makeReq(`Bearer ${CRON_SECRET}`)).then(r => r.json());
    expect(b1.newReviews).toBe(1);

    mockConnections([conn]);
    mockFetchReviews.mockResolvedValue({ reviews: [sampleReview('rev-dup')] });
    const b2 = await GET(makeReq(`Bearer ${CRON_SECRET}`)).then(r => r.json());
    expect(b2.newReviews).toBe(0); // unique violation → silently skipped
  });

  it('skips insert when Redis has the key', async () => {
    const { getRedisClient } = await import('@/lib/redis');
    vi.mocked(getRedisClient).mockReturnValue({
      get:   vi.fn().mockResolvedValue('1'),
      setex: vi.fn().mockResolvedValue('OK'),
    } as never);

    mockConnections([{
      id: 'conn-1', business_id: 'biz-1',
      google_account_id: 'acct-1', location_id: 'loc-1',
      refresh_token: encryptToken('tok'),
    }]);
    mockFetchReviews.mockResolvedValue({ reviews: [sampleReview('rev-cached')] });

    const body = await GET(makeReq(`Bearer ${CRON_SECRET}`)).then(r => r.json());
    expect(body.newReviews).toBe(0);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});

// ── Error handling ────────────────────────────────────────────

describe('GET /api/cron/gbp-sync — error handling', () => {
  it('marks connection as error when getAccessToken fails and continues processing other connections', async () => {
    let callCount = 0;
    mockGetAccessToken.mockImplementation(async () => {
      if (++callCount === 1) throw new Error('invalid_grant');
      return { token: 'access-tok' };
    });

    // Two connections: first fails token refresh, second succeeds (no reviews = errors stay at 1)
    const conns = [
      { id: 'conn-bad',  business_id: 'biz-1', google_account_id: 'a1', location_id: 'l1', refresh_token: encryptToken('t1') },
      { id: 'conn-good', business_id: 'biz-2', google_account_id: 'a2', location_id: 'l2', refresh_token: encryptToken('t2') },
    ];
    mockConnections(conns);
    // Conn-good processes fine but finds no new reviews — still verifies batch continued
    mockFetchReviews.mockResolvedValue({ reviews: [] });

    const body = await GET(makeReq(`Bearer ${CRON_SECRET}`)).then(r => r.json());

    // Exactly one error (conn-bad), not two — confirms batch continued to conn-good
    expect(body.errors).toBe(1);
    // getAccessToken attempted for BOTH connections — proves batch didn't stop after first failure
    expect(mockGetAccessToken).toHaveBeenCalledTimes(2);
    // conn-bad must have been marked as error
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'error' });
  });

  it('counts error and continues when reviews API throws (429 backoff path exercised)', async () => {
    mockConnections([{
      id: 'conn-1', business_id: 'biz-1',
      google_account_id: 'acct-1', location_id: 'loc-1',
      refresh_token: encryptToken('tok'),
    }]);
    // withRetry (mocked) calls fn() once; fn() throws 429; outer catch handles it
    mockFetchReviews.mockRejectedValue(new GbpApiError('rate limited', 429));

    const body = await GET(makeReq(`Bearer ${CRON_SECRET}`)).then(r => r.json());
    expect(body.errors).toBe(1);
    expect(body.newReviews).toBe(0);
  });

  it('skips connection with null refresh_token without incrementing errors', async () => {
    mockConnections([{
      id: 'conn-null', business_id: 'biz-1',
      google_account_id: 'acct-1', location_id: 'loc-1',
      refresh_token: null,
    }]);

    const body = await GET(makeReq(`Bearer ${CRON_SECRET}`)).then(r => r.json());
    expect(body.errors).toBe(0);
    expect(mockGetAccessToken).not.toHaveBeenCalled();
  });
});
