# Product Overview — Reevo

## What is Reevo?

Reevo is an AI-powered review generation and reputation management platform for local businesses. It turns satisfied customers into published 5-star reviews on Google, TripAdvisor, Facebook, and 11 other platforms — automatically, without the business owner doing anything after setup.

The core mechanic is a **smart QR funnel**: a customer scans a QR code at the point of service, rates their experience, and an AI instantly drafts a review in their own voice. If the rating is high (4★+), they are routed to a public review platform. If the rating is low, the feedback is captured privately so the business can respond before it becomes a public negative review.

---

## Problem Reevo Solves

Most businesses have far more satisfied customers than their online star-rating suggests. The gap exists because:
1. Happy customers don't think to leave reviews unprompted.
2. Leaving a review is friction — logging in, finding the page, writing something — so they abandon.
3. Unhappy customers are more motivated to write, so the average skews negative.

Reevo removes all three barriers:
- QR code at the moment of peak satisfaction (leaving the restaurant, checking out of the salon).
- AI writes the review draft in one tap — customer just edits and posts.
- Unhappy customers are quietly redirected to private feedback instead.

---

## Target Customers

| Segment | Examples |
|---------|---------|
| Food & Beverage | Cafes, restaurants, bakeries, bars |
| Health & Beauty | Salons, spas, barbershops, clinics |
| Hospitality | Hotels, guesthouses, holiday rentals |
| Trades & Services | Plumbers, electricians, cleaners |
| Retail | Boutiques, pharmacies, optical stores |
| Professional | Dentists, lawyers, accountants |

Reevo is designed for owner-operated businesses that do not have a dedicated marketing team. The product is designed to work out of the box with minimal setup.

---

## Core Value Proposition

> **One QR code. More 5-star reviews. Without asking.**

- No app required for customers — mobile web, works on any phone.
- Setup in under 10 minutes (no technical knowledge needed).
- AI-drafted reviews are authentic-sounding and never fabricated — they are grounded in the actual rating given.
- Private feedback loop means problems get fixed, not broadcast.
- Multi-platform: one funnel routes to whichever review site matters for the business's region and category.

---

## Key Metrics (Design Targets)

| Metric | Target |
|--------|--------|
| Time from QR scan to review posted | Under 3 minutes |
| API response time (dashboard) | < 150ms p95 |
| Funnel uptime | 99.9% |
| AI review generation latency | < 4 seconds |

---

## Business Model

- **Freemium SaaS** — monthly or annual subscription.
- Free plan with permanent 1-location, 20-review/month limit after 14-day trial.
- Paid plans: Starter ($X/mo), Growth (most popular), Enterprise (custom).
- No per-review charges; billing is based on monthly limits tied to the plan.
- Annual billing available at up to 17% discount.
- Non-profit / education discount: 50% off Starter, Growth, Enterprise.

---

## Compliance & Trust

- Google-compliant review funnel — customers write and post their own reviews; Reevo only drafts a suggestion.
- No fake reviews — AI text is a starting point that the customer edits and submits personally.
- GDPR-compliant — no PII collected from end-customers scanning the QR code; scans are anonymous.
- SOC 2 Type II report available (Enterprise).
- RLS (Row Level Security) enforced at the database layer — no data leakage between tenants.
