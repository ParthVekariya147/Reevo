# Roadmap — Reevo

## Completed Work

### Phase 1 — Critical Blockers
- [x] Fix `private_feedback` status constraint in DB (migration 020)
- [x] Fix open redirect vulnerability on login
- [x] Enforce billing quotas on AI generation (402 on limit exceeded)

### Phase 2 — Security Hardening
- [x] Admin header verification (JWT user.id vs x-admin-id)
- [x] QR status whitelist on creation (always `draft`, client cannot override)
- [x] Silent partial-success on plan change → now returns HTTP 207
- [x] Service role key fallback to empty string → now throws at startup
- [x] env.ts bypass in auth routes → fixed + open redirect patched

### Phase 3 — OOM & Data Integrity
- [x] Admin analytics OOM fix (10k-row fetch → DB RPCs)
- [x] Billing usage OOM fix (unbounded fetch → DB RPCs)
- [x] Admin businesses N+1 fix (single RPC replaces loop)
- [x] Business detail scan count fix (DB COUNT via RPC)
- [x] JSONB `draft_index` comparison fix (int cast in DB)

### Phase 4 — Medium Issues
- [x] Cap admin search input at 100 chars
- [x] Production warning when Upstash not configured

### Phase 5 — Performance
- [x] AI key round-robin → `Math.random()` stateless selection
- [x] Chart.tsx XSS guard — hex colour regex validator before CSS injection

### Phase 6 — Code Quality
- [x] QR app URL fallback → env.APP_URL (throws if missing)
- [x] Dead comment cleanup in QR route

### Phase 7 — Testing
- [x] Test infrastructure (Vitest 4.1.7 + Playwright 1.60)
- [x] Unit tests: 64 tests (security, rate limiter, tokens, admin auth)
- [x] E2E tests: 9 scenarios covering happy path + edge cases
- [x] CI: GitHub Actions unit gate (every PR) + E2E gate (on demand)

### Security Fixes (Bugs.md Audit)
- [x] RLS: `reviews_public_update` policy closed (migration 018)
- [x] RLS: `qr_scans_public_insert` restricted to live QR codes (migration 019)
- [x] `listUsers()` OOM — already using paginated Auth REST API
- [x] `/api/funnel/status` ownership verification

### Database Migrations Applied
- `001` — Initial schema
- `018` — Fix reviews_public_update RLS
- `019` — Fix qr_scans_insert RLS
- `020` — Fix private_feedback status constraint
- `021` — Analytics RPCs
- `022` — Billing usage RPCs
- `023` — Scan count RPCs
- `024` — DB indexes (apply manually: `database/024_db_indexes.sql`)

---

## In Progress / Pending

### Infrastructure (Manual Action Required)
- [ ] Apply `database/024_db_indexes.sql` — trigram search index on `businesses.name`
  - Run manually in Supabase SQL editor: `CREATE INDEX CONCURRENTLY businesses_name_trgm ON businesses USING gin(name gin_trgm_ops);`
- [ ] Configure Upstash Redis for production rate limiting
  - Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel

### Deferred (Technical Decisions Required)
- [ ] **CSP hardening** — Remove `unsafe-inline` / `unsafe-eval`; requires nonce-based refactor across all components. Dependent on Recharts compatibility.
- [ ] **Session forced re-verification** — Re-validate session on sensitive admin actions. Requires UX design decision.
- [ ] **Next.js upgrade to ≥15.5.18** — Fixes moderate PostCSS vulnerability. Requires full regression testing.
- [ ] **Unify rate limiters** — Single strategy for in-memory vs. Redis. Requires infra decision on Upstash.
- [ ] **Admin login DB connection on every page load** — Middleware refactor; deferred until after E2E test coverage improved.

### Deferred Refactors (No Correctness Impact)
- [ ] Split `FunnelFlow.tsx` (549 lines) — requires E2E coverage first
- [ ] Split dashboard `ui.tsx` god file — requires E2E coverage first
- [ ] Centralise constants — pure refactor, no correctness issue

### Integration Tests (Needs Live Supabase Test Project)
- [ ] RLS integration tests
- [ ] Auth flow integration tests
- [ ] Billing integration tests

---

## Planned Features (Not Started)

### Module 7 — Billing (Stripe Full Integration)
- Lemon Squeezy checkout flow → webhook → `subscriptions` table
- Billing screen with invoice list
- Prorated upgrade / downgrade
- PDF invoice download

### Module 8 — Admin Panel Enhancements
- Revenue analytics
- Churn analysis
- Email blast to segment of businesses

### Future Features
- **Multi-staff accounts** — Team member invite flow (Growth plan: 5 seats)
- **Role-based access control** — Admin / Manager / Viewer roles (Enterprise)
- **SSO** — Google OAuth and SAML 2.0 (Enterprise)
- **SCIM provisioning** — Auto-provision / deprovision team members (Enterprise)
- **White-label** — Remove Reevo branding entirely (Enterprise)
- **Webhook integrations** — Push events (new review, private feedback) to customer endpoints
- **API access** — Machine-readable access to analytics and review history (Growth+)
- **CSV export** — Bulk download of review history and analytics (Growth+)
- **Zapier / Make integration** — Connect Reevo to CRM, Slack, email workflows

---

## Testing Status

| Suite | Count | Status |
|-------|-------|--------|
| Unit tests (`npm test`) | 64 | All passing |
| E2E tests (`npm run test:e2e`) | 9 | Passing (requires `.env.test` + seeded token) |
| Integration tests (RLS, auth, billing) | 0 | Blocked on live Supabase test project |

CI gates:
- `ci.yml` — runs `npm test` on every PR (unit gate)
- `e2e.yml` — runs Playwright; activates when `E2E_ENABLED=true` + 4 secrets configured
