// Centralised env var access. Throws at first import if a required var is
// missing, surfacing misconfiguration immediately rather than mid-request.
//
// During `next build` (NEXT_PHASE=phase-production-build) required vars are
// checked lazily so static-page generation doesn't need real secrets.

const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v && !isBuild) throw new Error(`[env] Required env var not set: ${name}`);
  return v ?? '';
}

function optional(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

export const env = {
  // ── Supabase (required) ────────────────────────────────────
  SUPABASE_URL:          required('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY:     required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
  SUPABASE_SERVICE_ROLE: required('SUPABASE_SERVICE_ROLE_KEY'),

  // ── App ───────────────────────────────────────────────────
  APP_URL: optional('NEXT_PUBLIC_APP_URL') ?? 'http://localhost:3000',

  // ── Rate limiting (optional — falls back to in-memory) ────
  UPSTASH_URL:   optional('UPSTASH_REDIS_REST_URL'),
  UPSTASH_TOKEN: optional('UPSTASH_REDIS_REST_TOKEN'),

  // ── Resend (optional — required for transactional email) ─
  RESEND_API_KEY: optional('RESEND_API_KEY'),
  EMAIL_FROM:     optional('EMAIL_FROM') ?? 'Reevo <noreply@reevo.io>',

  // ── Stripe (optional — required for billing features) ────
  STRIPE_SECRET_KEY:      optional('STRIPE_SECRET_KEY'),
  STRIPE_WEBHOOK_SECRET:  optional('STRIPE_WEBHOOK_SECRET'),
  STRIPE_PRICE_STARTER:   optional('STRIPE_PRICE_STARTER'),
  STRIPE_PRICE_PRO:       optional('STRIPE_PRICE_PRO'),
  STRIPE_PRICE_ENTERPRISE: optional('STRIPE_PRICE_ENTERPRISE'),

  // ── Error monitoring (optional in dev) ────────────────────
  SENTRY_DSN: optional('NEXT_PUBLIC_SENTRY_DSN'),

  // ── AI providers (at least one required in production) ────
  // Numbered keys (_1 … _9) are read dynamically in lib/ai/generate.ts
  ANTHROPIC_KEY: optional('ANTHROPIC_API_KEY'),
  OPENAI_KEY:    optional('OPENAI_API_KEY'),
  GEMINI_KEY:    optional('GEMINI_API_KEY'),

  // ── Google Business Profile OAuth ─────────────────────────
  // Required for Automated Google Review Reply feature.
  // GBP_TOKEN_ENC_KEY must be exactly 64 hex chars (32 bytes) for AES-256-GCM.
  GBP_OAUTH_CLIENT_ID:     optional('GBP_OAUTH_CLIENT_ID'),
  GBP_OAUTH_CLIENT_SECRET: optional('GBP_OAUTH_CLIENT_SECRET'),
  GBP_OAUTH_REDIRECT_URI:  optional('GBP_OAUTH_REDIRECT_URI'),
  GBP_TOKEN_ENC_KEY:       optional('GBP_TOKEN_ENC_KEY'),

  // ── Cron jobs ─────────────────────────────────────────────
  // Set the same value in Vercel env vars — Vercel passes it as
  // Authorization: Bearer <CRON_SECRET> on every cron invocation.
  CRON_SECRET: optional('CRON_SECRET'),
} as const;
