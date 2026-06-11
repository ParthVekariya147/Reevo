# Tech Stack — Reevo

## Overview

Reevo is a full-stack TypeScript SaaS application built on Next.js 15 (App Router), deployed on Vercel, with Supabase as the database, auth, and storage layer.

---

## Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 15.5.18 | Full-stack React framework (App Router) |
| React | 19.0 | UI library |
| TypeScript | 5.x | Type safety across the entire codebase |
| Tailwind CSS | 3.4 | Utility-first CSS (supplemented by custom CSS vars) |
| SWR | 2.4 | Client-side data fetching with caching & revalidation |
| TanStack React Query | 5.x | Used in specific dashboard screens |
| Recharts | 2.15 | Analytics charts (daily series, funnel breakdown) |
| Lucide React | 1.16 | Icon set |
| React Icons | 5.6 | Platform logos (Google, TripAdvisor, etc.) |
| Sonner | 2.x | Toast notifications |
| clsx + tailwind-merge | latest | Conditional className utilities |

### Design system
- Custom CSS variables (`--accent`, `--surface`, `--ink`, `--border`, etc.)
- 4 built-in themes switchable in the funnel customiser
- Mobile-first responsive design
- Font: System sans-serif stack + monospace for data/labels

---

## Backend

All backend logic runs as **Next.js API Routes** (serverless functions) deployed to Vercel.

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js API Routes | 15.x | Server-side logic, REST API |
| Supabase JS SDK | 2.46 | Database, Auth, Storage client |
| @supabase/ssr | 0.5 | Server-side Supabase client with cookie-based session |
| Stripe | 22.1 | Payment processing, webhooks, invoice generation |
| Resend | 6.12 | Transactional email (welcome, invoices, alerts) |
| nanoid | 5.1 | Cryptographically secure short token generation |
| qrcode | 1.5 | Server-side QR code image generation (PNG) |
| googleapis | 173.x | Google My Business API (review sync & reply) |
| google-auth-library | 10.6 | OAuth 2.0 for GBP connection |

---

## Database

**Supabase** (hosted PostgreSQL with managed Auth, Storage, and Edge Functions).

| Feature | Usage |
|---------|-------|
| PostgreSQL | Primary data store |
| Row Level Security (RLS) | Enforces tenant isolation — every table has RLS policies |
| Supabase Auth | User signup / login (email + Google OAuth) |
| Supabase Storage | Logo uploads |
| PgBouncer (connection pooling) | Transaction-mode pooler (port 6543) for serverless connections |
| Database RPCs (Stored Functions) | Aggregation queries that would OOM in JS (analytics, billing usage) |

### Key tables

| Table | Purpose |
|-------|---------|
| `businesses` | One row per location — all config, plan, branding |
| `qr_codes` | QR campaigns per business |
| `qr_scans` | Raw scan events (lightweight — no AI text) |
| `generated_reviews` | Full AI review records including draft text |
| `analytics_events` | All funnel events (scan, generate, copy, redirect, etc.) |
| `subscriptions` | Stripe subscription state per business |
| `invoices` | Invoice records per subscription charge |
| `plan_prices` | Pricing table (sourced by the pricing page) |
| `audit_logs` | Admin action log |
| `admin_users` | Admin panel access control |
| `gbp_connections` | Google Business Profile OAuth connections |
| `gbp_reviews` | Synced Google reviews awaiting reply |
| `reply_settings` | Per-business GBP reply configuration |

### Migrations
Numbered SQL migration files in `database/` — applied in order via Supabase SQL editor:
- `001_initial_schema.sql` — base schema
- `018–023` — RLS fixes, RPCs, performance indexes
- `024_db_indexes.sql` — trigram search indexes (apply manually with `CREATE INDEX CONCURRENTLY`)

---

## AI Providers

| Provider | SDK | Models Used |
|---------|-----|------------|
| OpenAI | `openai` 6.38 | GPT-3.5-turbo, GPT-4 |
| Google | `@google/generative-ai` 0.24 | Gemini 1.5 Flash / Pro |
| Anthropic | `@anthropic-ai/sdk` 0.97 | Claude 3.5 Haiku / Sonnet |

Key rotation: Multiple API keys per provider. Selection is randomised per request using `Math.random()` (stateless — works correctly on serverless cold starts).

Usage:
- **Review generation:** `src/lib/ai/generate.ts`
- **GBP reply drafting:** `src/lib/ai/generateReply.ts`

---

## Caching & Rate Limiting

| Technology | Purpose |
|-----------|---------|
| Vercel CDN | Static assets + `Cache-Control` headers on GET routes |
| Upstash Redis | Distributed rate limiting (when `UPSTASH_REDIS_REST_URL` is set) |
| In-memory `Map` | Rate limiter fallback for local dev (not suitable for production multi-instance) |
| `@upstash/ratelimit` | Sliding window rate limiter library |
| `@upstash/redis` | Redis client for Upstash |

Rate limit targets:
| Route | Limit |
|-------|-------|
| Admin routes | 60 req/min/IP |
| Funnel generate | Enforced via billing quota (not IP rate limit) |
| Public funnel routes | In-memory fallback |

---

## Security Libraries

| Library | Purpose |
|---------|---------|
| Node.js `crypto` | AES-256-GCM encryption for OAuth refresh tokens |
| `@supabase/ssr` | Validates JWT on every server request (`getUser()` not `getSession()`) |
| Sanitize utility (`src/lib/security/sanitize.ts`) | Strips `<>` and truncates all string inputs at API boundaries |
| `src/lib/validation/urls.ts` | Same-origin redirect validation to prevent open redirect attacks |
| `src/lib/env.ts` | Centralised env var validation — throws at startup if required vars missing |

---

## Monitoring & Observability

| Tool | Purpose |
|------|---------|
| Sentry (`@sentry/nextjs` 10.53) | Error tracking + performance monitoring in production |
| Vercel Analytics | Web vitals, page performance |

---

## Testing

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 4.1.7 | Unit test runner |
| @vitest/coverage-v8 | 4.1.7 | Code coverage |
| Playwright | 1.60.0 | End-to-end browser tests |

Coverage:
- Unit tests: 64 tests across security, rate limiter, tokens, admin auth (all passing).
- E2E tests: 9 scenarios covering happy path and edge cases (invalid token, private feedback, auth redirect protection).
- CI: GitHub Actions — unit tests gate every PR; E2E gate activates on demand.

---

## Deployment

| Service | Usage |
|---------|-------|
| Vercel | Hosting — Edge + Serverless functions |
| Vercel Environment Variables | All secrets managed in Vercel dashboard |
| GitHub Actions | CI/CD — `ci.yml` (unit tests) + `e2e.yml` (E2E gate) |

### Required environment variables

| Variable | Exposure | Notes |
|---------|---------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Row-level-security enforces access |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | Admin operations only; never in client code |
| `GEMINI_API_KEY` | Server-only | Google AI |
| `OPENAI_API_KEY` | Server-only | OpenAI |
| `ANTHROPIC_API_KEY` | Server-only | Anthropic |
| `STRIPE_SECRET_KEY` | Server-only | Stripe billing |
| `STRIPE_WEBHOOK_SECRET` | Server-only | Stripe webhook verification |
| `RESEND_API_KEY` | Server-only | Transactional email |
| `UPSTASH_REDIS_REST_URL` | Server-only | Distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only | Distributed rate limiting |
| `ENCRYPTION_KEY` | Server-only | AES-256-GCM for OAuth tokens |
| `NEXT_PUBLIC_APP_URL` | Public | Used in QR image URLs and email links |

---

## Repository Structure

```
/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── api/                # All REST API endpoints
│   │   │   ├── admin/          # Admin-only routes (require admin auth)
│   │   │   ├── analytics/      # Analytics event + summary
│   │   │   ├── billing/        # Usage + Stripe webhook
│   │   │   ├── businesses/     # Business CRUD
│   │   │   ├── dashboard/      # Combined overview endpoint
│   │   │   ├── funnel/         # Funnel generate + status
│   │   │   ├── gbp/            # Google Business Profile OAuth + replies
│   │   │   ├── public/         # Unauthenticated routes (plans, etc.)
│   │   │   ├── qr/             # QR code management
│   │   │   └── reviews/        # Review history
│   │   ├── (dashboard)/        # Protected dashboard screens
│   │   ├── (marketing)/        # Public marketing pages
│   │   ├── auth/               # Auth callback
│   │   ├── login/              # Login page
│   │   ├── signup/             # Signup page
│   │   └── r/[token]/          # Customer-facing funnel
│   ├── components/
│   │   ├── auth/               # LoginForm, SignupForm, GoogleAuthButton
│   │   ├── dashboard/          # Dashboard shell, sidebar, all screen components
│   │   ├── home/               # Marketing page sections
│   │   ├── layout/             # Navbar, Footer
│   │   ├── providers/          # QueryProvider
│   │   └── ui/                 # Shared UI components (card, chart)
│   ├── lib/
│   │   ├── admin/              # Admin auth, audit, permissions
│   │   ├── ai/                 # AI generation (review + reply)
│   │   ├── analytics/          # Event logging
│   │   ├── billing/            # Plan limits, Stripe client, tier logic
│   │   ├── businesses/         # Business context helper
│   │   ├── email/              # Resend client + email templates
│   │   ├── gbp/                # GBP OAuth, review sync, reply posting
│   │   ├── qr/                 # QR generation + token utilities
│   │   ├── security/           # Rate limiter, sanitize, encrypt
│   │   ├── supabase/           # Client, server, admin Supabase instances
│   │   ├── validation/         # URL validation
│   │   └── env.ts              # Centralised env validation
│   └── types/
│       ├── database.ts         # TypeScript mirrors of DB schema
│       └── admin.ts            # Admin-specific types
├── database/                   # SQL migration files
├── e2e/                        # Playwright E2E tests
├── .github/workflows/          # CI/CD pipelines
└── docs/                       # This documentation
```
