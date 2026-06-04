import { OAuth2Client } from 'google-auth-library';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '@/lib/env';
import { decryptToken } from '@/lib/security/encrypt';

export const GBP_SCOPE = 'https://www.googleapis.com/auth/business.manage';

/**
 * Decrypts a stored refresh token blob and exchanges it for a fresh access token.
 * Reuses createOAuth2Client() — the single source of Google credential config.
 * Throws if decryption fails or Google returns no token.
 */
export async function refreshAccessToken(encryptedToken: string): Promise<string> {
  const refreshToken = decryptToken(encryptedToken);
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { token } = await oauth2Client.getAccessToken();
  if (!token) throw new Error('[gbp] getAccessToken returned null');
  return token;
}

/** Returns a configured OAuth2Client, throws if env vars are missing. */
export function createOAuth2Client(): OAuth2Client {
  if (!env.GBP_OAUTH_CLIENT_ID || !env.GBP_OAUTH_CLIENT_SECRET || !env.GBP_OAUTH_REDIRECT_URI) {
    throw new Error('[gbp] GBP_OAUTH_CLIENT_ID / CLIENT_SECRET / REDIRECT_URI are not set');
  }
  return new OAuth2Client(
    env.GBP_OAUTH_CLIENT_ID,
    env.GBP_OAUTH_CLIENT_SECRET,
    env.GBP_OAUTH_REDIRECT_URI,
  );
}

interface StatePayload {
  businessId: string;
  next:       string;
  ts:         number;
}

function hmacKey(): string {
  if (!env.GBP_TOKEN_ENC_KEY) throw new Error('[gbp] GBP_TOKEN_ENC_KEY is not set');
  return env.GBP_TOKEN_ENC_KEY;
}

/**
 * Signs state for the OAuth CSRF parameter.
 * Payload is base64url-encoded JSON; HMAC-SHA256 prevents tampering.
 */
export function buildState(businessId: string, next: string): string {
  const payload = JSON.stringify({ businessId, next, ts: Date.now() } satisfies StatePayload);
  const sig     = createHmac('sha256', hmacKey()).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ p: payload, s: sig })).toString('base64url');
}

/**
 * Verifies the CSRF state parameter returned by Google.
 * Returns null if the state is invalid, tampered, or expired (10-min window).
 */
export function parseState(state: string): { businessId: string; next: string } | null {
  try {
    const { p, s } = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
      p: string;
      s: string;
    };
    const expected = createHmac('sha256', hmacKey()).update(p).digest();
    const actual   = Buffer.from(s, 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

    const data = JSON.parse(p) as StatePayload;
    if (Date.now() - data.ts > 10 * 60 * 1000) return null;
    if (!data.businessId || typeof data.businessId !== 'string') return null;

    // Validate next is same-origin path
    const safeNext =
      typeof data.next === 'string' &&
      data.next.startsWith('/') &&
      !data.next.startsWith('//')
        ? data.next
        : '/app/business_dashboard';

    return { businessId: data.businessId, next: safeNext };
  } catch {
    return null;
  }
}

/** Fetches GBP accounts for the given access token via the Account Management REST API. */
export async function listAccounts(accessToken: string): Promise<
  { name: string; accountName: string }[]
> {
  const res  = await fetch(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`[gbp] listAccounts failed: ${res.status} ${await res.text()}`);
  const body = await res.json() as { accounts?: { name: string; accountName: string }[] };
  return body.accounts ?? [];
}

/** Fetches locations for a given account name (e.g. "accounts/123"). */
export async function listLocations(
  accountName: string,
  accessToken: string,
): Promise<{ name: string; title?: string }[]> {
  const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`;
  const res  = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`[gbp] listLocations failed: ${res.status} ${await res.text()}`);
  const body = await res.json() as { locations?: { name: string; title?: string }[] };
  return body.locations ?? [];
}

// ── Review sync ───────────────────────────────────────────────

/** Typed error with HTTP status for retry-backoff classification. */
export class GbpApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'GbpApiError';
  }
}

export interface GbpReviewFromApi {
  reviewId:    string;
  reviewer:    { displayName?: string; isAnonymous: boolean };
  starRating:  string; // 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE'
  comment?:    string;
  createTime:  string;
  reviewReply?: { comment: string };
}

const STAR_MAP: Record<string, number> = {
  ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
};

export function starRatingToInt(rating: string): number {
  return STAR_MAP[rating] ?? 0;
}

/**
 * Lists reviews for a location via the My Business v4 API.
 * Throws GbpApiError on non-2xx responses.
 */
export async function fetchReviews(
  accountId:   string,
  locationId:  string,
  accessToken: string,
  pageToken?:  string,
): Promise<{ reviews: GbpReviewFromApi[]; nextPageToken?: string }> {
  const params = new URLSearchParams({ pageSize: '50' });
  if (pageToken) params.set('pageToken', pageToken);
  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?${params}`;
  const res  = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new GbpApiError(`fetchReviews failed: ${res.status} ${text}`, res.status);
  }
  return res.json() as Promise<{ reviews: GbpReviewFromApi[]; nextPageToken?: string }>;
}

/**
 * Retries fn up to maxAttempts on transient errors (429, 5xx).
 * Non-transient errors and client errors (4xx except 429) are re-thrown immediately.
 * delayMs is injectable so tests can pass () => 0 to skip waiting.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs: (attempt: number) => number = (n) => 1000 * Math.pow(2, n - 1),
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const status = (e instanceof GbpApiError) ? e.status : undefined;
      const isTransient = status === 429 || (status !== undefined && status >= 500);
      if (!isTransient || attempt === maxAttempts) throw e;
      await new Promise<void>(resolve => setTimeout(resolve, delayMs(attempt)));
    }
  }
  throw new Error('[withRetry] unreachable');
}
