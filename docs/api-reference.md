# API Reference — Reevo

All routes are Next.js App Router API routes served at `/api/*`. All authenticated routes require a valid Supabase session cookie. Requests from the dashboard use the session cookie set at login.

---

## Authentication

All dashboard API routes require authentication via Supabase session.

```
Authorization: Cookie (Supabase session cookie — set automatically by the browser)
```

**Server-side validation:** Every route calls `supabase.auth.getUser()` (not `getSession()`). This makes a network call to validate the JWT against the Supabase Auth server — preventing token replay attacks.

Unauthenticated requests return `401 Unauthorized`.

---

## Customer Funnel Routes (Public — No Auth)

These routes are called by the customer-facing funnel, which has no user session.

---

### GET `/r/[token]`
Serves the customer-facing funnel page.

**Path params:**
- `token` — QR code token

**Response:** HTML — the branded funnel page for the business associated with the token.

**Errors:**
- `404` — Token not found or QR code not in `live` status → "Link not found" page.

---

### POST `/api/funnel/generate`
Generates an AI review draft for a customer.

**Request body:**
```json
{
  "token": "abc123",
  "rating": 5
}
```

**Response:**
```json
{
  "review_id": "uuid",
  "text": "Absolutely loved my visit! The team was incredibly welcoming…",
  "drafts": ["alternative draft 1", "alternative draft 2"]
}
```

**Errors:**
- `404` — Token not found / QR not live
- `402` — Business has exceeded their monthly review generation limit

**Security:** Token is validated via a `qr_codes!inner(token, status)` JOIN before any AI call. No auth session — QR token is the only identity signal.

---

### PATCH `/api/funnel/status`
Updates the status of a generated review (e.g. customer copied, redirected, submitted).

**Request body:**
```json
{
  "review_id": "uuid",
  "token": "abc123",
  "status": "copied"
}
```

**Valid statuses:** `generated` | `copied` | `redirected` | `submitted` | `abandoned`

**Response:** `{ "ok": true }`

**Security:** Ownership is verified — `review_id` must belong to the QR associated with `token`. Uses service-role client for the write after ownership check.

---

### POST `/api/analytics/event`
Logs a funnel analytics event.

**Request body:**
```json
{
  "token": "abc123",
  "event_type": "scan",
  "device": "mobile",
  "country": "AU"
}
```

**Valid event types:** `scan` | `generate` | `refresh` | `copy` | `redirect` | `complete` | `private_feedback`

**Response:** `{ "ok": true }`

**Note:** Designed as fire-and-forget — failures are logged but do not break the funnel.

---

## Dashboard Routes (Authenticated)

### GET `/api/dashboard/overview`
Combined dashboard data fetch — replaces 4 separate queries.

**Response:**
```json
{
  "business": { "id": "uuid", "name": "Maison Café", "plan": "growth" },
  "kpis": {
    "scans": 6204, "scans_delta": 12.4,
    "generates": 1840, "generates_delta": 8.2,
    "redirects": 1102, "redirects_delta": 5.7,
    "conversion": 0.177, "conversion_delta": 2.1
  },
  "chart_series": [
    { "date": "2026-05-21", "scans": 214, "generates": 62, "redirects": 39 }
  ],
  "active_campaigns": [
    { "id": "uuid", "name": "Front Counter", "token": "fc-2k4", "scans": 1284, "conversion": 0.412, "status": "live" }
  ],
  "recent_activity": [
    { "type": "complete", "label": "Customer #4821 submitted a 5★ review", "ts": "2026-05-21T10:02:00Z" }
  ],
  "usage": {
    "reviews_used": 1284, "reviews_limit": 2500,
    "scans_used": 3050, "scans_limit": 10000,
    "campaigns_used": 4, "campaigns_limit": 10
  }
}
```

**Cache:** `s-maxage=30, stale-while-revalidate=60`

---

### GET `/api/analytics/summary`
Analytics aggregation via Postgres RPC — no JS-side aggregation.

**Query params:**
- `days` — `7` | `30` | `90` (default: 30)

**Response:**
```json
{
  "totals": { "scan": 6204, "generate": 1840, "copy": 1500, "redirect": 1102, "complete": 980 },
  "daily_series": [
    { "day": "2026-05-21", "event_type": "scan", "cnt": 214 }
  ],
  "by_device": { "mobile": 5800, "desktop": 350, "tablet": 54 }
}
```

**Cache:** `s-maxage=60, stale-while-revalidate=300`

---

### GET `/api/businesses`
Returns the authenticated user's business profile.

**Response:** Business object (see `src/types/database.ts`).

---

### PATCH `/api/businesses`
Updates the business profile.

**Request body (partial):**
```json
{
  "name": "Maison Café",
  "tagline": "Your neighbourhood coffee spot",
  "brand_color": "#6C63FF",
  "min_rating_for_google": 4,
  "language": "en",
  "review_platforms": [
    { "id": "google", "url": "https://g.page/r/xxx/review", "enabled": true }
  ]
}
```

---

### GET `/api/qr`
Lists all QR campaigns for the authenticated business.

**Response:**
```json
{
  "qr_codes": [
    {
      "id": "uuid",
      "campaign_name": "Front Counter",
      "token": "fc-2k4",
      "status": "live",
      "dynamic": true,
      "ab_testing": false,
      "created_at": "2026-04-01T10:00:00Z"
    }
  ]
}
```

**Cache:** `s-maxage=10, stale-while-revalidate=30`

---

### POST `/api/qr`
Creates a new QR campaign. Status is always set to `draft` — client cannot override.

**Request body:**
```json
{
  "campaign_name": "Table Cards"
}
```

**Response:** Created QR code object.

---

### GET `/api/qr/[id]`
Returns a single QR campaign.

---

### PATCH `/api/qr/[id]`
Updates a QR campaign (name, status, pause_fallback, ab_testing).

**Security:** Verifies `qr_codes.business_id` matches the authenticated user's business before any mutation.

---

### DELETE `/api/qr/[id]`
Soft-deletes a QR campaign (sets `status = 'archived'`).

---

### GET `/api/qr/[id]/image`
Returns the QR code as a PNG image.

**Response:** `image/png`

**Cache:** `public, max-age=86400` (24h CDN cache — QR image is deterministic)

---

### GET `/api/reviews`
Paginated review history.

**Query params:**
- `page` — page number (default: 1)
- `per_page` — results per page (default: 25)
- `qr_id` — optional filter by campaign

**Response:**
```json
{
  "reviews": [
    {
      "id": "uuid",
      "qr_id": "uuid",
      "campaign_name": "Front Counter",
      "rating": 5,
      "ai_text": "Absolutely loved my visit! …",
      "refreshes": 1,
      "copies": 1,
      "status": "submitted",
      "created_at": "2026-05-21T10:02:00Z"
    }
  ],
  "total": 1284,
  "page": 1,
  "per_page": 25
}
```

Pagination uses cursor-based (`created_at + id`) for performance at scale.

---

### GET `/api/billing/usage`
Plan consumption for the current billing period.

**Response:**
```json
{
  "plan": "growth",
  "period_start": "2026-05-01",
  "period_end": "2026-06-01",
  "reviews_used": 1284,
  "reviews_limit": 500,
  "scans_used": 3050,
  "scans_limit": 500,
  "campaigns_used": 4,
  "campaigns_limit": 5
}
```

Limits are pulled from `plan_prices` table (DB source of truth) with a fallback to `PLAN_LIMITS` constant if DB is unreachable.

---

## GBP (Google Business Profile) Routes

### GET `/api/gbp/auth`
Initiates Google OAuth flow for connecting a GBP account.

---

### GET `/api/gbp/callback`
OAuth callback — exchanges code for tokens, stores encrypted refresh token.

---

### DELETE `/api/gbp/disconnect`
Disconnects the GBP integration and revokes the stored refresh token.

---

### GET `/api/gbp/reviews`
Returns synced GBP reviews awaiting a reply.

---

### POST `/api/gbp/reply`
Posts an approved reply to a Google review via the My Business API.

---

### POST `/api/cron/gbp-sync`
Cron job endpoint — syncs latest reviews from GBP (called by Vercel Cron).

---

## Admin Routes (Admin Auth Required)

All admin routes require:
1. Valid Supabase session
2. `x-admin-id` header matching the JWT `user.id`
3. Entry in `admin_users` table
4. Rate limited at 60 req/min/IP

### GET `/api/admin/businesses`
Paginated list of all businesses. Supports `?search=` query (capped at 100 chars).

### GET/PATCH `/api/admin/businesses/[id]`
Business detail view + plan override.

### GET `/api/admin/analytics`
Platform-wide analytics via DB-side RPCs (no OOM risk).

### GET `/api/admin/audit-logs`
Paginated audit log of all admin actions.

### GET/POST/DELETE `/api/admin/settings/admin-users`
Manage admin user access (paginated Auth REST API — no full user list load).

### GET `/api/admin/subscriptions`
All subscription records.

### GET/PATCH `/api/admin/notifications`
System notification management.

### GET `/api/admin/abuse`
Flagged accounts / abuse reports.

---

## Public Routes (No Auth)

### GET `/api/public/plans`
Returns the pricing plan data from `plan_prices` table — used by the pricing page.

---

## Error Responses

All routes return JSON errors in this format:

```json
{ "error": "Error message" }
```

| Status | Meaning |
|--------|---------|
| `400` | Bad request (invalid input, query too long, etc.) |
| `401` | Unauthenticated |
| `402` | Payment required (billing quota exceeded) |
| `403` | Forbidden (not owner, or admin spoof attempt) |
| `404` | Not found |
| `429` | Rate limited |
| `500` | Internal server error |

---

## Response Time Targets

| Route | Target p95 |
|-------|-----------|
| `GET /api/dashboard/overview` | < 150ms |
| `GET /api/analytics/summary` | < 100ms |
| `GET /api/qr` | < 80ms |
| `POST /api/analytics/event` | < 60ms |
| `GET /api/qr/[id]/image` | < 30ms (CDN cache hit) |
