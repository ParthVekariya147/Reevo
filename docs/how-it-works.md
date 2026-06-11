# How It Works — Reevo

## The 3-Step Customer Journey

Reevo's funnel is designed to work in under 3 minutes, on any smartphone, with no app download or login required.

```
Customer scans QR
       ↓
  Branded funnel loads (branded with business logo & colours)
       ↓
  Customer taps a star rating (1–5)
       ↓
        ┌──────────────────────────────────────────────┐
  4★ or 5★                                       1★, 2★, or 3★
        │                                              │
        ↓                                              ↓
  AI generates review draft              Private feedback form shown
  Customer edits (optional)              Customer submits feedback
  Copies text → Opens Google / TripAdvisor / etc.   Business receives it in dashboard
  Pastes & posts review                  Never goes public
```

---

## Step 1 — Scan

The business places a printed QR code at the point of service:
- Restaurant table / counter
- Hotel check-out desk
- Salon reception
- Delivery packaging
- Receipt / invoice

The QR encodes a short URL: `reevo.io/r/<token>`

The customer scans it with their phone camera — no app required. The funnel opens in the phone's browser.

---

## Step 2 — AI Writes It

The customer taps a star rating. Immediately, the AI generates a review draft:

- Tailored to the rating (5★ draft is enthusiastic; 4★ is positive but measured).
- Written in natural, first-person language — not generic or robotic.
- The customer's voice is preserved — they edit freely before copying.
- If they don't like the draft, they tap "Try another" for a regenerated version.
- The copy-to-clipboard button copies the text in one tap.

**AI models used:** OpenAI GPT-3.5 / GPT-4, Google Gemini, Anthropic Claude (rotated randomly per request for load distribution across serverless cold starts).

---

## Step 3 — Smart Routing

After copying the text:

**High rating (at or above threshold, default 4★):**
- A list of the business's configured review platforms appears (Google, TripAdvisor, etc.).
- The customer taps their preferred platform — the review site opens.
- They paste their copied text and submit.
- Event logged: `redirect` → `complete`.

**Low rating (below threshold):**
- A private feedback form appears: "Tell us what went wrong."
- Customer submits directly to the business — never to a public platform.
- Business sees the feedback in their dashboard within seconds.
- Event logged: `private_feedback`.

---

## Business Owner Setup Flow

### Onboarding (one-time, ~10 minutes)

1. **Sign up** — email/password or Google OAuth.
2. **Business name & tagline** — displayed on the funnel.
3. **Google Business Profile link** — paste the Google review URL.
4. **Additional platforms** — optionally add TripAdvisor, Facebook, etc.
5. **Brand colour** — choose your brand hex colour; the funnel updates in real-time preview.
6. **Logo** — upload a logo or use auto-generated initials avatar.
7. **Generate QR code** — system creates a live QR code in under 1 second.
8. **Download & print** — PNG download ready for print.

### Ongoing management (dashboard)

| Screen | Purpose |
|--------|---------|
| Dashboard | KPIs, daily chart, active campaigns, recent activity |
| Analytics | Detailed funnel breakdown, device & geo data |
| QR Codes | Manage campaigns — create, pause, archive, A/B test |
| Funnel | Customise funnel appearance and AI settings |
| Reviews | Full history of all generated reviews |
| GBP Replies | AI reply drafts for incoming Google reviews |
| Usage | Plan consumption — reviews, scans, campaigns |
| Billing | Invoices, upgrade / downgrade |
| Notifications | Alerts for new reviews, feedback, billing events |
| Settings | Business profile, review platforms |
| Profile | Owner name, email, password |

---

## Data Flow Diagram

```
[Customer Phone]
      │  HTTPS
      ▼
[Vercel Edge — Next.js]
      │
      ├── GET /r/<token> → Lookup QR code → Serve funnel page
      │
      ├── POST /api/funnel/generate → AI model → Return draft
      │
      ├── POST /api/analytics/event → Log: scan, generate, copy, redirect, complete, private_feedback
      │
      └── PATCH /api/funnel/status → Update review status

[Business Owner Browser]
      │  HTTPS
      ▼
[Vercel — Next.js Dashboard]
      │
      ├── GET /api/dashboard/overview → KPIs + chart + campaigns
      ├── GET /api/analytics/summary → Funnel breakdown
      ├── GET /api/qr → Campaign list
      ├── GET /api/reviews → Review history
      ├── GET /api/billing/usage → Plan limits
      └── GET /api/gbp/reviews → GBP reply queue

[Supabase PostgreSQL + Auth + Storage]
      │
      └── Row Level Security enforces tenant isolation
          All data is scoped to `business_id` owned by the authenticated user
```

---

## Event Tracking

Every meaningful action is logged to `analytics_events`:

| Event | Trigger |
|-------|---------|
| `scan` | QR code scanned (funnel page loaded) |
| `generate` | AI review draft generated |
| `refresh` | Customer tapped "Try another" |
| `copy` | Customer copied the draft text |
| `redirect` | Customer tapped a review platform link |
| `complete` | Customer confirmed they posted the review |
| `private_feedback` | Low-rating feedback submitted |

Each event records: `qr_id`, `business_id`, `event_type`, `device`, `country`, `created_at`.
