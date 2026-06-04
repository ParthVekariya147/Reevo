import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mocks ──────────────────────────────────────────────
const { mockRefreshAccessToken, mockPostReplyToGoogle, mockIsPaid, mockUpdate, mockFrom } =
  vi.hoisted(() => ({
    mockRefreshAccessToken: vi.fn<[string], Promise<string>>(),
    mockPostReplyToGoogle:  vi.fn(),
    mockIsPaid:             vi.fn<[{ plan: string; plan_expires_at?: string | null }], boolean>(),
    mockUpdate:             vi.fn(),
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
    SENTRY_DSN:              undefined,
  },
}));

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin',  () => ({ createAdminClient: vi.fn(() => ({ from: mockFrom })) }));
vi.mock('@/lib/gbp/oauth',       () => ({ refreshAccessToken: mockRefreshAccessToken }));
vi.mock('@/lib/gbp/postReply',   () => ({ postReplyToGoogle: mockPostReplyToGoogle }));
vi.mock('@/lib/billing/tier',    () => ({ isPaid: mockIsPaid }));

import { POST }           from '../reply/route';
import { createClient }   from '@/lib/supabase/server';

// ── Fixtures ──────────────────────────────────────────────────

const BIZ_FREE = { id: 'biz-1', plan: 'free', plan_expires_at: null };
const BIZ_PAID = { id: 'biz-1', plan: 'pro',  plan_expires_at: null };

const REVIEW = {
  id:               'rev-1',
  connection_id:    'conn-1',
  google_review_id: 'google-rev-001',
  reply_text:       'Draft reply text',
  reply_status:     'awaiting_approval',
};

const CONN = {
  id:                'conn-1',
  business_id:       'biz-1',
  google_account_id: 'acct-1',
  location_id:       'loc-1',
  refresh_token:     'encrypted-token',
};

const SETTINGS_NOT_ACTIVATED = { auto_activated: false };
const SETTINGS_ACTIVATED     = { auto_activated: true };

// ── Mock helpers ──────────────────────────────────────────────

function mockUser(userId: string | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: null,
      }),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>);
}

/**
 * Sets up mockFrom for a scenario. Each table is configured to return
 * the provided fixture on the relevant query chain.
 */
function setupDb({
  biz              = BIZ_FREE as object | null,
  review           = REVIEW  as object | null,
  conn             = CONN    as object | null,
  settings         = SETTINGS_NOT_ACTIVATED as object | null,
  settingsUpdate   = { error: null },
  reviewUpdate     = { error: null },
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case 'businesses':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: biz, error: null }),
            }),
          }),
        };
      case 'gbp_reviews':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: review, error: null }),
            }),
          }),
          update: mockUpdate,
        };
      case 'gbp_connections':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: conn, error: null }),
            }),
          }),
        };
      case 'reply_settings':
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: settings, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue(settingsUpdate),
          }),
        };
      default:
        return {};
    }
  });
  // mockUpdate covers gbp_reviews updates (edit draft, mark sent, mark failed)
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue(reviewUpdate) });
}

function makeReq(body: object = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/gbp/reply', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRefreshAccessToken.mockResolvedValue('fresh-access-token');
  mockPostReplyToGoogle.mockResolvedValue({ ok: true });
  mockIsPaid.mockReturnValue(false);
});

// ── Auth ──────────────────────────────────────────────────────

describe('POST /api/gbp/reply — auth', () => {
  it('returns 401 when unauthenticated', async () => {
    mockUser(null);
    const res = await POST(makeReq({ reviewId: 'rev-1' }));
    expect(res.status).toBe(401);
  });
});

// ── Ownership ─────────────────────────────────────────────────

describe('POST /api/gbp/reply — ownership', () => {
  it('returns 403 when connection belongs to a different business', async () => {
    mockUser('user-1');
    // biz-1 is the caller's business, but connection belongs to biz-2
    setupDb({ conn: { ...CONN, business_id: 'biz-2' } });

    const res = await POST(makeReq({ reviewId: 'rev-1' }));
    expect(res.status).toBe(403);
    expect(mockPostReplyToGoogle).not.toHaveBeenCalled();
  });
});

// ── Success path ──────────────────────────────────────────────

describe('POST /api/gbp/reply — success', () => {
  it('posts draft reply and returns {ok:true}, marks review sent with replied_at', async () => {
    mockUser('user-1');
    setupDb();

    const res  = await POST(makeReq({ reviewId: 'rev-1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(mockRefreshAccessToken).toHaveBeenCalledWith('encrypted-token');
    expect(mockPostReplyToGoogle).toHaveBeenCalledWith(
      expect.objectContaining({
        googleReviewId: 'google-rev-001',
        replyText:      'Draft reply text',
        accessToken:    'fresh-access-token',
      }),
    );
    // Mark sent with replied_at
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ reply_status: 'sent', replied_at: expect.any(String) }),
    );
  });

  it('uses provided replyText (owner edited draft) instead of stored reply_text', async () => {
    mockUser('user-1');
    setupDb();

    await POST(makeReq({ reviewId: 'rev-1', replyText: 'Edited by owner' }));

    expect(mockPostReplyToGoogle).toHaveBeenCalledWith(
      expect.objectContaining({ replyText: 'Edited by owner' }),
    );
    // Should also persist the edit
    expect(mockUpdate).toHaveBeenCalledWith({ reply_text: 'Edited by owner' });
  });
});

// ── Auto-activation ───────────────────────────────────────────

describe('POST /api/gbp/reply — auto-activation', () => {
  it('first paid post: flips auto_activated from false → true', async () => {
    mockUser('user-1');
    mockIsPaid.mockReturnValue(true);
    setupDb({ biz: BIZ_PAID, settings: SETTINGS_NOT_ACTIVATED });

    const settingsUpdateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    // Override reply_settings mock to capture the update
    mockFrom.mockImplementation((table: string) => {
      if (table === 'reply_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: SETTINGS_NOT_ACTIVATED, error: null }),
            }),
          }),
          update: settingsUpdateMock,
        };
      }
      // other tables via default setupDb
      return setupDbTable(table);
    });

    await POST(makeReq({ reviewId: 'rev-1' }));

    expect(settingsUpdateMock).toHaveBeenCalledWith({ auto_activated: true });
  });

  it('second paid post: auto_activated already true → reply_settings NOT updated', async () => {
    mockUser('user-1');
    mockIsPaid.mockReturnValue(true);

    const settingsUpdateMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === 'reply_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: SETTINGS_ACTIVATED, error: null }),
            }),
          }),
          update: settingsUpdateMock,
        };
      }
      return setupDbTable(table);
    });

    await POST(makeReq({ reviewId: 'rev-1' }));

    expect(settingsUpdateMock).not.toHaveBeenCalled();
  });

  it('free plan: auto_activated check is skipped entirely', async () => {
    mockUser('user-1');
    mockIsPaid.mockReturnValue(false);
    const settingsQueryMock = vi.fn();
    setupDb({ biz: BIZ_FREE });
    // Intercept reply_settings select to verify it's never called
    mockFrom.mockImplementation((table: string) => {
      if (table === 'reply_settings') {
        return { select: settingsQueryMock };
      }
      return setupDbTable(table);
    });

    await POST(makeReq({ reviewId: 'rev-1' }));

    expect(settingsQueryMock).not.toHaveBeenCalled();
  });
});

// ── Failure path ──────────────────────────────────────────────

describe('POST /api/gbp/reply — failure', () => {
  it('marks review as failed and returns 502 when postReplyToGoogle throws', async () => {
    mockUser('user-1');
    mockPostReplyToGoogle.mockRejectedValue(new Error('Google API error'));
    setupDb();

    const res  = await POST(makeReq({ reviewId: 'rev-1' }));
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(mockUpdate).toHaveBeenCalledWith({ reply_status: 'failed' });
    expect(body.error).toBeTruthy();
  });
});

// ── Shared table mock for override tests ──────────────────────
// Returns the standard mock for each table. Used when only one table is overridden.
function setupDbTable(table: string) {
  switch (table) {
    case 'businesses':
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: BIZ_PAID, error: null }),
          }),
        }),
      };
    case 'gbp_reviews':
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: REVIEW, error: null }),
          }),
        }),
        update: mockUpdate,
      };
    case 'gbp_connections':
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: CONN, error: null }),
          }),
        }),
      };
    default:
      return {};
  }
}
