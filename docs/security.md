# Security Architecture — Reevo

## Threat Model

Reevo is a multi-tenant SaaS where:
- Business owners have authenticated dashboard sessions.
- End-customers are **anonymous** — they interact via QR token only.
- Admins have elevated privileges with a separate access control layer.

The primary threats are:
1. **Tenant data leakage** — one business reading another's data.
2. **Unauthenticated API abuse** — bots generating reviews or spamming events.
3. **Privilege escalation** — regular users accessing admin routes.
4. **Billing quota bypass** — generating unlimited reviews without paying.
5. **Injection attacks** — XSS, SQL injection via user input.
6. **OAuth token theft** — GBP refresh tokens stored at rest.

---

## 1. Multi-Tenant Isolation — Row Level Security (RLS)

Every table has RLS enabled in Supabase. Policies enforce `business_id` ownership:

```sql
-- businesses: owner can only see/modify own row
create policy "owner_select" on businesses for select
  using (owner_id = auth.uid());
create policy "owner_update" on businesses for update
  using (owner_id = auth.uid());

-- qr_codes: must belong to user's business
create policy "owner_qr_select" on qr_codes for select
  using (business_id in (select id from businesses where owner_id = auth.uid()));

-- analytics_events: read own events only
create policy "owner_ae_select" on analytics_events for select
  using (business_id in (select id from businesses where owner_id = auth.uid()));
```

**QR scans insert policy:** Only allows inserts for QR codes with `status = 'live'`:
```sql
-- Migration 019
create policy "live_qr_only_insert" on qr_scans for insert
  with check (qr_id in (select id from qr_codes where status = 'live'));
```

**Review public update policy:** Closed — only the service-role client (after ownership verification) can update review status:
```sql
-- Migration 018: dropped open policy; route now uses createAdminClient()
-- after verifying token ownership via qr_codes!inner(token, status) JOIN
```

---

## 2. Authentication

### Session validation
All authenticated routes use `supabase.auth.getUser()` — **never** `getSession()`.

- `getUser()` makes a live network call to the Supabase Auth server to validate the JWT.
- `getSession()` only reads the cookie — it does not re-validate and is vulnerable to token replay.

### Open redirect protection
Login and auth callback both validate redirect targets:

```typescript
// src/lib/validation/urls.ts
function isSafeRedirect(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}
```

Applied in `LoginForm.tsx` and `src/app/auth/callback/route.ts`.

### Admin identity verification
Admin routes verify that the `x-admin-id` header matches the authenticated `user.id` from the JWT:

```typescript
// src/lib/admin/auth.ts
if (user.id !== adminId) return 403;
```

This prevents header spoofing where a non-admin session claims to be an admin.

---

## 3. Rate Limiting

All routes are rate-limited using a sliding window algorithm.

### Implementation
- **Primary:** Upstash Redis (`@upstash/ratelimit`) — distributed, works across Vercel instances.
- **Fallback:** In-memory `Map` — used in local dev when `UPSTASH_REDIS_REST_URL` is not set. A warning is logged to stdout in production if falling back.

### Limits
| Route group | Limit |
|-------------|-------|
| Admin routes | 60 req/min/IP (via `requireAdmin()`) |
| Public funnel routes | In-memory fallback |

Admin routes automatically apply rate limiting through `requireAdmin()` which is called at the top of every admin API handler.

---

## 4. Input Sanitization

All string inputs at API boundaries are sanitized before database writes:

```typescript
// src/lib/security/sanitize.ts
export function sanitizeString(s: unknown, maxLen = 255): string {
  if (typeof s !== 'string') return '';
  return s.trim().slice(0, maxLen).replace(/[<>]/g, '');
}
```

Applied to: `business.name`, `campaign_name`, `tagline`, all free-text fields in POST/PATCH handlers.

Additional bounds:
- Admin search queries: capped at 100 characters (returns 400 if exceeded).
- QR status on creation: hardcoded to `'draft'` — client-supplied `status` is ignored.

---

## 5. Content Security Policy

Current status:
- CSP header is present in `next.config.ts`.
- Contains `unsafe-inline` and `unsafe-eval` (required for Recharts and other third-party libs).
- A nonce-based CSP hardening sprint is planned but not yet implemented (tracked as HIGH-1 in bugs.md).

---

## 6. Billing Quota Enforcement

Before any AI generation call, the server enforces the plan limit:

```typescript
// src/app/api/funnel/generate/route.ts
const { data: biz } = await db.from('businesses').select('plan').eq(...)
const limits = getPlanLimits(biz.plan);
const count = await db.from('generated_reviews').select('count').gt('created_at', thirtyDaysAgo);
if (count >= limits.reviews) return 402;
```

Returns `HTTP 402 Payment Required` with a clear error if the monthly limit is exceeded. The funnel continues to work — the AI suggestion step pauses but scan tracking still functions.

---

## 7. OAuth Refresh Token Encryption

GBP OAuth refresh tokens are encrypted at rest using AES-256-GCM:

```typescript
// src/lib/security/encrypt.ts
// encrypt(plaintext) → base64-encoded IV + ciphertext + auth tag
// decrypt(ciphertext) → plaintext
```

- Key sourced from `ENCRYPTION_KEY` environment variable (never hardcoded).
- IV is randomly generated per encrypt call.
- Auth tag provides tamper detection.
- Tokens are **never** logged or included in API responses.

---

## 8. Environment Variable Validation

`src/lib/env.ts` validates required environment variables at startup:

```typescript
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
```

This means missing secrets fail loudly at startup rather than silently falling back (e.g. using an empty string as an API key, which would pass auth silently until a live request).

### Secret classification
| Variable | Classification | Rule |
|---------|--------------|------|
| `NEXT_PUBLIC_*` | Public | Safe to expose to browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | **Never** in `NEXT_PUBLIC_*`; admin routes only |
| `GEMINI_API_KEY` | Server-only | — |
| `OPENAI_API_KEY` | Server-only | — |
| `ANTHROPIC_API_KEY` | Server-only | — |
| `STRIPE_SECRET_KEY` | Server-only | — |
| `ENCRYPTION_KEY` | Server-only | — |

---

## 9. dangerouslySetInnerHTML Audit

`src/components/ui/chart.tsx` uses `dangerouslySetInnerHTML` to inject CSS variables for chart theming.

**Assessment: safe.** Content is exclusively developer-controlled hex colour values from the `chart.config` object. User input never flows into this path.

Additionally, a runtime hex colour validator guards the injection:

```typescript
// src/components/ui/chart.tsx
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{3,8}$/;
function safeColor(c: unknown): string | null {
  return typeof c === 'string' && HEX_COLOR_RE.test(c) ? c : null;
}
```

Only valid hex values are injected; invalid values are dropped (null).

---

## 10. Audit Logging

All admin mutations write to `audit_logs`:

```typescript
await supabase.from('audit_logs').insert({
  actor_id:    adminUser.id,
  action:      'suspend_business',
  target_type: 'business',
  target_id:   businessId,
  meta:        { reason },
});
```

Fields: `actor_id`, `action`, `target_type`, `target_id`, `meta` (JSONB), `created_at`.

Available in the admin panel under Audit Logs.

---

## 11. Known Limitations (Deferred)

| Issue | Status | Notes |
|-------|--------|-------|
| CSP `unsafe-inline` / `unsafe-eval` | Deferred | Requires nonce-based refactor; third-party libs (Recharts) depend on `unsafe-eval` |
| In-memory rate limiter on Vercel | Deferred | Replaced by Upstash when `UPSTASH_REDIS_REST_URL` is configured |
| Admin session forced re-verification | Deferred | Session TTL configured in Supabase Auth dashboard; re-verify on sensitive actions is a UX design decision |
| Next.js / PostCSS moderate vulnerability | Deferred | `npm audit fix --force` would downgrade Next.js to v9; manual upgrade to Next.js ≥15.5.18 required |

---

## 12. Compliance

| Standard | Status |
|---------|--------|
| GDPR | Compliant — no PII collected from anonymous funnel customers |
| SOC 2 Type II | Available (Enterprise tier) |
| Google Review Policy | Compliant — customers write and submit their own reviews; AI only drafts a suggestion |
