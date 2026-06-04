import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ──────────────────────────────────────────────
const { CRON_SECRET } = vi.hoisted(() => ({ CRON_SECRET: 'post-cron-secret' }));

const {
  mockRefreshAccessToken,
  mockPostReplyToGoogle,
  mockIsPaid,
  mockReviewUpdate,
  mockSettingsUpdate,
  mockFrom,
} = vi.hoisted(() => ({
  mockRefreshAccessToken: vi.fn<[string], Promise<string>>(),
  mockPostReplyToGoogle:  vi.fn(),
  mockIsPaid:             vi.fn<[{ plan: string; plan_expires_at?: string | null }], boolean>(),
  mockReviewUpdate:       vi.fn(),
  mockSettingsUpdate:     vi.fn(),
  mockFrom:               vi.fn(),
}));

vi.mock('@/lib/env', () => ({
  env: {
    SUPABASE_URL:            'http://localhost:54321',
    SUPABASE_ANON_KEY:       'test-anon',
    SUPABASE_SERVICE_ROLE:   'test-service-role',
    APP_URL:                 'http://localhost:3000',
    GBP_TOKEN_ENC_KEY:       'a'.repeat(64),
    GBP_OAUTH_CLIENT_ID:     'test-id',
    GBP_OAUTH_CLIENT_SECRET: 'test-secret',
    GBP_OAUTH_REDIRECT_URI:  'http://localhost:3000/api/gbp/callback',
    CRON_SECRET,
    SENTRY_DSN:              undefined,
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock('@/lib/gbp/oauth',     () => ({ refreshAccessToken: mockRefreshAccessToken }));
vi.mock('@/lib/gbp/postReply', () => ({ postReplyToGoogle: mockPostReplyToGoogle }));
vi.mock('@/lib/billing/tier',  () => ({ isPaid: mockIsPaid }));

import { GET } from '../gbp-post/route';

// ── Fixtures ──────────────────────────────────────────────────

const REVIEW_1 = {
  id:               'rev-1',
  connection_id:    'conn-1',
  google_review_id: 'google-rev-001',
  reply_text:       'Great service, thank you!',
};

const CONN_1 = {
  id:                'conn-1',
  business_id:       'biz-1',
  google_account_id: 'acct-1',
  location_id:       'loc-1',
  refresh_token:     'encrypted-tok',
};

const BIZ_PAID = { id: 'biz-1', plan: 'pro',  plan_expires_at: null };
const BIZ_FREE = { id: 'biz-1', plan: 'free', plan_expires_at: null };

function makeSettings(autoActivated = false) {
  return { business_id: 'biz-1', auto_activated: autoActivated };
}

// ── Mock helpers ──────────────────────────────────────────────

function setupDb({
  reviews   = [REVIEW_1] as object[],
  conns     = [CONN_1]   as object[],
  bizRows   = [BIZ_PAID] as object[],
  settings  = [makeSettings()] as object[],
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case 'gbp_reviews':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: reviews, error: null }),
            }),
          }),
          update: mockReviewUpdate,
        };
      case 'gbp_connections':
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: conns, error: null }),
          }),
        };
      case 'businesses':
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: bizRows, error: null }),
          }),
        };
      case 'reply_settings':
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: settings, error: null }),
          }),
          update: mockSettingsUpdate,
        };
      default:
        return {};
    }
  });
  mockReviewUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  mockSettingsUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
}

function makeReq(authHeader?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/cron/gbp-post', {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

const validAuth = `Bearer ${CRON_SECRET}`;

beforeEach(() => {
  vi.clearAllMocks();
  mockRefreshAccessToken.mockResolvedValue('fresh-token');
  mockPostReplyToGoogle.mockResolvedValue({ ok: true });
  mockIsPaid.mockReturnValue(true);
});

// ── Auth ──────────────────────────────────────────────────────

describe('GET /api/cron/gbp-post — auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    setupDb({ reviews: [] });
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 401 when CRON_SECRET is wrong', async () => {
    setupDb({ reviews: [] });
    const res = await GET(makeReq('Bearer wrong'));
    expect(res.status).toBe(401);
  });

  it('returns 200 with no approved reviews', async () => {
    setupDb({ reviews: [] });
    const body = await GET(makeReq(validAuth)).then(r => r.json());
    expect(body).toEqual({ processed: 0, sent: 0, failed: 0 });
  });
});

// ── Happy path ────────────────────────────────────────────────

describe('GET /api/cron/gbp-post — success', () => {
  it('posts reply and marks review as sent', async () => {
    setupDb();

    const body = await GET(makeReq(validAuth)).then(r => r.json());

    expect(body).toMatchObject({ processed: 1, sent: 1, failed: 0 });
    expect(mockRefreshAccessToken).toHaveBeenCalledWith('encrypted-tok');
    expect(mockPostReplyToGoogle).toHaveBeenCalledWith(
      expect.objectContaining({
        googleReviewId: 'google-rev-001',
        replyText:      REVIEW_1.reply_text,
        accessToken:    'fresh-token',
      }),
    );
    expect(mockReviewUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ reply_status: 'sent', replied_at: expect.any(String) }),
    );
  });

  it('mock mode: postReplyToGoogle returns {ok:true} without hitting Google', async () => {
    // postReplyToGoogle is mocked — it already returns {ok:true} in all tests.
    // This test confirms the cron completes successfully regardless of live/mock mode.
    setupDb();

    const body = await GET(makeReq(validAuth)).then(r => r.json());

    expect(body.sent).toBe(1);
    expect(mockPostReplyToGoogle).toHaveBeenCalledOnce();
  });
});

// ── Auto-activation ───────────────────────────────────────────

describe('GET /api/cron/gbp-post — auto-activation', () => {
  it('first paid post: flips auto_activated false → true', async () => {
    setupDb({ settings: [makeSettings(false)] });

    await GET(makeReq(validAuth));

    expect(mockSettingsUpdate).toHaveBeenCalledWith({ auto_activated: true });
  });

  it('second paid post: auto_activated already true → reply_settings NOT updated', async () => {
    setupDb({ settings: [makeSettings(true)] });

    await GET(makeReq(validAuth));

    expect(mockSettingsUpdate).not.toHaveBeenCalled();
  });
});

// ── Safety net ────────────────────────────────────────────────

describe('GET /api/cron/gbp-post — safety net', () => {
  it('skips non-paid business: leaves review as approved, does not post', async () => {
    mockIsPaid.mockReturnValue(false);
    setupDb({ bizRows: [BIZ_FREE] });

    const body = await GET(makeReq(validAuth)).then(r => r.json());

    expect(body).toMatchObject({ processed: 0, sent: 0, failed: 0 });
    expect(mockPostReplyToGoogle).not.toHaveBeenCalled();
    expect(mockReviewUpdate).not.toHaveBeenCalled();
  });
});

// ── Failure handling ──────────────────────────────────────────

describe('GET /api/cron/gbp-post — failure', () => {
  it('marks review as failed when postReplyToGoogle throws, continues batch', async () => {
    mockPostReplyToGoogle.mockRejectedValue(new Error('Google timeout'));
    setupDb();

    const body = await GET(makeReq(validAuth)).then(r => r.json());

    expect(body).toMatchObject({ processed: 1, sent: 0, failed: 1 });
    expect(mockReviewUpdate).toHaveBeenCalledWith({ reply_status: 'failed' });
  });

  it('marks review as failed when refreshAccessToken throws', async () => {
    mockRefreshAccessToken.mockRejectedValue(new Error('invalid_grant'));
    setupDb();

    const body = await GET(makeReq(validAuth)).then(r => r.json());

    expect(body).toMatchObject({ processed: 1, sent: 0, failed: 1 });
    expect(mockReviewUpdate).toHaveBeenCalledWith({ reply_status: 'failed' });
    expect(mockPostReplyToGoogle).not.toHaveBeenCalled();
  });
});
