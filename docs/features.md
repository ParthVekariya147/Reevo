# Features — Reevo

Complete catalogue of all features in the Reevo platform, grouped by area.

---

## 1. Smart Review Funnel

The core product. A branded mobile web page served via a unique QR code URL.

### How it works
1. Customer scans the QR code with any smartphone camera.
2. They land on the business's branded funnel page — no app, no login.
3. They tap a star rating (1–5).
4. AI generates a review draft tailored to their rating.
5. **4★ or 5★:** Customer is guided to copy the text and post it on Google (or another configured platform).
6. **Below the threshold:** Customer is redirected to a private feedback form instead of a public review site.

### Configurable settings (per business)
| Setting | Description |
|---------|-------------|
| `min_rating_for_google` | Minimum star rating that triggers a public redirect (default: 4) |
| `language` | Language for AI-generated draft (supports 24 languages on Enterprise) |
| `brand_color` | Primary hex colour applied to the funnel UI |
| `tagline` | Short message shown at the top of the funnel |
| `logo` | Business logo displayed on the funnel |
| `review_platforms` | Ordered list of platforms the funnel may redirect to |

---

## 2. AI Review Draft Generation

When a customer taps a star, Reevo calls an AI model to generate a review draft in the customer's voice.

- **Model rotation:** Multiple AI keys are used (GPT-3.5, GPT-4, Gemini, Claude) with random selection per request to distribute load across serverless cold starts.
- **Tone-matched:** The draft matches the star rating — enthusiastic for 5★, measured for 4★.
- **Customer edits freely** before posting — Reevo never posts on their behalf.
- **Refresh:** Customer can tap "try another" to regenerate a different draft (uses pre-generated alternatives).
- **Copy-to-clipboard:** One tap copies the text, then the platform link opens.

### Limits by plan
| Plan | Reviews / month |
|------|----------------|
| Free | 20 |
| Starter | 200 |
| Growth | 500 |
| Enterprise | Unlimited |

---

## 3. Dynamic QR Codes

Every campaign generates a QR code that encodes a short token URL (`reevo.io/r/<token>`).

- **Dynamic:** The destination funnel configuration can be updated without reprinting the QR code.
- **Multiple campaigns:** A single business can run multiple named QR codes (e.g. "Front Counter", "Table Cards", "Delivery Bag").
- **Statuses:** `draft` → `live` → `paused` → `archived`. Only `live` codes are active.
- **Pause fallback:** When paused, the QR can redirect to a fallback URL instead of showing an error.
- **A/B testing flag:** Each QR can be part of a variant test.
- **Image download:** PNG QR code downloadable from the dashboard for printing.

### Limits by plan
| Plan | QR codes |
|------|---------|
| Free | 1 static |
| Starter | Unlimited dynamic |
| Growth | Unlimited dynamic |
| Enterprise | Unlimited dynamic |

---

## 4. A/B Testing

Run two funnel variants simultaneously across QR campaigns to optimise conversion.

- Assign QR codes to variant A or B.
- Track conversion rate per variant in the analytics dashboard.
- Keep what converts, retire what doesn't.
- Available on all paid plans.

---

## 5. Full Branding & Customisation

The customer-facing funnel is fully white-labelled.

| Option | Details |
|--------|---------|
| Brand colour | Hex colour applied to buttons, accents, and gradient |
| Logo | Business logo or initials avatar |
| Tagline | Custom message on the funnel landing screen |
| Theme | 4 pre-built visual themes |
| Style combinations | Curated style presets for quick setup (Warm & Inviting, Modern Minimal, Bold & Vibrant, etc.) |
| Custom branding domain | Starter and above |
| Instagram handle | Displayed on funnel (optional social proof) |

---

## 6. Real-Time Analytics Dashboard

Full visibility into funnel performance at every step.

### KPI cards (30-day rolling)
- Total scans
- AI reviews generated
- Redirects to review platforms
- Copies (customer copied the text)
- Conversion rate (scans → complete)
- Delta vs. prior period for each metric

### Charts
- Daily series chart: scans / generates / redirects / completes over time
- Funnel breakdown: conversion % at each step
- Device breakdown: mobile vs. desktop vs. tablet
- Geo heatmap: scans by country

### Campaign-level analytics
- Per-campaign: scan count, conversion rate, status
- A/B variant comparison

### Data export
- CSV export (Growth and Enterprise)
- API access (Growth and Enterprise)

---

## 7. Review History

Full paginated log of every AI review generated through the funnel.

| Column | Description |
|--------|-------------|
| Campaign name | Which QR / campaign triggered it |
| Rating | Star rating the customer selected |
| AI text | The generated draft text |
| Refreshes | How many times the customer regenerated |
| Copies | Whether the customer copied it |
| Status | `generated` / `copied` / `redirected` / `submitted` / `abandoned` |
| Date | Creation timestamp |

- Filterable by campaign (`qr_id`).
- Paginated (25 per page, cursor-based for performance).

---

## 8. Private Feedback Capture

When a customer rates below the configured threshold, they are not sent to Google — they see a private feedback form instead.

- Feedback is stored in the `generated_reviews` table with `status = 'private_feedback'`.
- Business owner sees it in the dashboard under the review history.
- Customer feels heard; negative sentiment never reaches a public platform.
- Configurable minimum rating threshold (default: 4 stars).

---

## 9. AI Reply Suggestions (GBP)

Businesses connected to their Google Business Profile can receive AI-drafted replies to Google reviews they've already received.

### Connection flow
1. Business owner clicks "Connect Google Business Profile" in dashboard.
2. OAuth 2.0 flow — authorises access to Google My Business API.
3. Reevo syncs reviews from the GBP location.
4. AI generates a reply draft per review (tone, signature, length all configurable).
5. Owner approves or edits before the reply is posted.

### Settings
| Setting | Options |
|---------|---------|
| Auto-reply enabled | On / Off (manual approval always available) |
| Tone | Professional / Warm / Casual / Concise |
| Signature | Optional sign-off appended to every reply |
| Language | Overridable per business |

### Reply statuses
`pending` → `drafted` → `awaiting_approval` → `approved` → `sent` / `failed`

- OAuth refresh token stored encrypted (AES-256-GCM) — never logged or displayed.
- GBP connection status: `active` / `revoked` / `error`.

---

## 10. Usage & Billing Dashboard

Real-time view of plan consumption.

| Metric | Description |
|--------|-------------|
| Reviews used / limit | AI drafts generated this billing period |
| Scans used / limit | QR code scans this billing period |
| Campaigns used / limit | Active live QR campaigns |
| Period start / end | Current billing cycle dates |

- Plan displayed with upgrade CTA when approaching limits.
- Billing history (invoices) with PDF download.
- Upgrade / downgrade any time.

---

## 11. Notifications

In-app notification centre for business owners.

- New review generated
- New private feedback received
- Approaching plan limits
- GBP sync status
- Billing events (payment succeeded, failed, subscription renewed)

---

## 12. Onboarding Flow

Step-by-step guided setup for new businesses.

1. Business name & tagline
2. Google Business Profile link
3. Add more review platforms
4. Brand colour & logo
5. Generate first QR code
6. Download / print QR

`onboarding_complete` flag tracked on the `businesses` row. Incomplete profile shows a persistent banner in the dashboard.

---

## 13. Multi-Location Support

| Plan | Locations |
|------|----------|
| Free | 1 |
| Starter | 1 |
| Growth | Up to 5 |
| Enterprise | Unlimited |

Each location is a separate `businesses` row under the same owner account. QR campaigns, analytics, and settings are scoped per location.

---

## 14. Team Seats & Roles

| Plan | Seats | Roles |
|------|-------|-------|
| Free | 1 | — |
| Starter | 1 | — |
| Growth | 5 | — |
| Enterprise | Unlimited | Role-based access (RBAC) |

Enterprise adds:
- SSO via Google and SAML
- SCIM provisioning
- Audit log (every admin action recorded with actor, action, target, timestamp)
- Role-based access control

---

## 15. Email Notifications

Transactional emails sent via Resend:

| Email | Trigger |
|-------|---------|
| Welcome | New account signup |
| Invoice paid | Stripe webhook — charge succeeded |
| Payment failed | Stripe webhook — charge failed |
| Subscription cancelled | Stripe webhook — cancellation |

---

## 16. Security Features

- Row Level Security (RLS) at database level — tenants cannot access each other's data.
- Rate limiting on all API routes (in-memory with Upstash Redis fallback for distributed).
- Admin routes: rate-limited at 60 req/min/IP + JWT user ID verified against header.
- Input sanitization on all POST/PATCH string fields.
- AES-256-GCM encryption for OAuth refresh tokens at rest.
- Open redirect protection on login and auth callback.
- Billing quota enforced server-side before AI generation (returns 402 if limit exceeded).

See [security.md](./security.md) for full detail.
