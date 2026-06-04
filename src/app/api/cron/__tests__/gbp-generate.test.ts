import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted values ─────────────────────────────────────────────
const { CRON_SECRET } = vi.hoisted(() => ({
  CRON_SECRET: 'generate-cron-secret',
}));

const { mockGenerateReply, mockUpdate, mockFrom } = vi.hoisted(() => ({
  mockGenerateReply: vi.fn(),
  mockUpdate:        vi.fn(),
  mockFrom:          vi.fn(),
}));

const mockIsPaid = vi.hoisted(() => vi.fn<[{ plan: string; plan_expires_at?: string | null }], boolean>());

// ── Module mocks ───────────────────────────────────────────────

vi.mock('@/lib/env', () => ({
  env: {
    SUPABASE_URL:            'http://localhost:54321',
    SUPABASE_ANON_KEY:       'test-anon',
    SUPABASE_SERVICE_ROLE:   'test-service-role',
    APP_URL:                 'http://localhost:3000',
    UPSTASH_URL:             undefined,
    UPSTASH_TOKEN:           undefined,
    CRON_SECRET,
    SENTRY_DSN:              undefined,
    GBP_TOKEN_ENC_KEY:       'a'.repeat(64),
    GBP_OAUTH_CLIENT_ID:     undefined,
    GBP_OAUTH_CLIENT_SECRET: undefined,
    GBP_OAUTH_REDIRECT_URI:  undefined,
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock('@/lib/ai/generateReply', () => ({
  generateReply: mockGenerateReply,
}));

vi.mock('@/lib/billing/tier', () => ({
  isPaid: mockIsPaid,
}));

// ── Imports after mocks ────────────────────────────────────────
import { GET } from '../gbp-generate/route';

// ── Shared fixtures ───────────────────────────────────────────

const REVIEW_1 = {
  id:            'rev-1',
  connection_id: 'conn-1',
  rating:        5,
  comment:       'Amazing experience!',
  reviewer_name: 'Alice',
};

const CONN_1   = { id: 'conn-1', business_id: 'biz-1' };
const BIZ_FREE = { id: 'biz-1', plan: 'free', plan_expires_at: null, language: 'en' };
const BIZ_PAID = { id: 'biz-1', plan: 'pro',  plan_expires_at: null, language: 'en' };

function makeSettings(overrides: Partial<{
  auto_reply_enabled: boolean;
  auto_activated:     boolean;
  admin_force_state:  string | null;
}> = {}) {
  return {
    business_id:        'biz-1',
    tone:               'friendly',
    signature:          null,
    language:           null,
    reply_length:       'medium',
    auto_reply_enabled: true,
    auto_activated:     true,
    admin_force_state:  null,
    ...overrides,
  };
}

// Sets up mockFrom to return the right mock for each table.
// gbp_reviews SELECT uses .eq().limit() chain; UPDATE uses .eq() chain.
// gbp_connections / businesses / reply_settings use .in() chain.
function setupDb({
  reviews  = [REVIEW_1],
  conns    = [CONN_1],
  bizRows  = [BIZ_FREE] as object[],
  settings = [makeSettings()] as object[],
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
          update: mockUpdate,
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
        };
      default:
        return {};
    }
  });
}

function makeReq(authHeader?: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/cron/gbp-generate', {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

const validAuth = `Bearer ${CRON_SECRET}`;

beforeEach(() => {
  vi.clearAllMocks();
  mockGenerateReply.mockResolvedValue('Thank you for your feedback!');
  mockIsPaid.mockReturnValue(false);
  mockUpdate.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  });
});

// ── Auth ──────────────────────────────────────────────────────

describe('GET /api/cron/gbp-generate — auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    setupDb({ reviews: [] });
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it('returns 401 when CRON_SECRET is wrong', async () => {
    setupDb({ reviews: [] });
    const res = await GET(makeReq('Bearer wrong-secret'));
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid CRON_SECRET and no pending reviews', async () => {
    setupDb({ reviews: [] });
    const res  = await GET(makeReq(validAuth));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ processed: 0, generated: 0, skipped: 0, failed: 0 });
  });
});

// ── Status transitions ────────────────────────────────────────

describe('GET /api/cron/gbp-generate — status transitions', () => {
  it('free plan → reply_status=awaiting_approval', async () => {
    setupDb({ bizRows: [BIZ_FREE] });
    mockIsPaid.mockReturnValue(false);

    const body = await GET(makeReq(validAuth)).then(r => r.json());

    expect(body).toMatchObject({ processed: 1, generated: 1, skipped: 0, failed: 0 });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ reply_status: 'awaiting_approval' }),
    );
  });

  it('paid + auto_activated=true → reply_status=approved', async () => {
    setupDb({
      bizRows:  [BIZ_PAID],
      settings: [makeSettings({ auto_activated: true })],
    });
    mockIsPaid.mockReturnValue(true);

    const body = await GET(makeReq(validAuth)).then(r => r.json());

    expect(body.generated).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ reply_status: 'approved' }),
    );
  });

  it('paid + auto_activated=false → reply_status=awaiting_approval', async () => {
    setupDb({
      bizRows:  [BIZ_PAID],
      settings: [makeSettings({ auto_activated: false })],
    });
    mockIsPaid.mockReturnValue(true);

    const body = await GET(makeReq(validAuth)).then(r => r.json());

    expect(body.generated).toBe(1);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ reply_status: 'awaiting_approval' }),
    );
  });

  it('admin_force_state=off → skipped even when auto_reply_enabled=true', async () => {
    setupDb({
      settings: [makeSettings({ admin_force_state: 'off', auto_reply_enabled: true })],
    });

    const body = await GET(makeReq(validAuth)).then(r => r.json());

    expect(body).toMatchObject({ processed: 1, skipped: 1, generated: 0, failed: 0 });
    expect(mockGenerateReply).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('generateReply throws → reply_status=failed, summary.failed incremented', async () => {
    mockGenerateReply.mockRejectedValue(new Error('AI provider unavailable'));
    setupDb({ settings: [makeSettings()] });

    const body = await GET(makeReq(validAuth)).then(r => r.json());

    expect(body).toMatchObject({ processed: 1, generated: 0, failed: 1, skipped: 0 });
    expect(mockUpdate).toHaveBeenCalledWith({ reply_status: 'failed' });
  });
});

// ── generateReply call shape ──────────────────────────────────

describe('GET /api/cron/gbp-generate — generateReply wiring', () => {
  it('calls generateReply with correct shape derived from review + settings + business', async () => {
    // settings.language = null → falls back to biz.language = 'en'
    setupDb({ settings: [makeSettings()] });
    mockIsPaid.mockReturnValue(false);

    await GET(makeReq(validAuth));

    expect(mockGenerateReply).toHaveBeenCalledWith({
      reviewText:  REVIEW_1.comment,
      rating:      REVIEW_1.rating,
      tone:        'friendly',
      signature:   null,
      language:    'en',
      replyLength: 'medium',
    });
  });
});
