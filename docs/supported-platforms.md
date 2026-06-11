# Supported Review Platforms — Reevo

Reevo routes customers to 14 review platforms across 6 global regions. A single QR funnel can target any combination of platforms — the business owner configures which platforms appear and in what order.

---

## All Platforms

| Platform | Regions | URL Pattern |
|---------|---------|------------|
| Google Reviews | US, EU, UK, AU, AE, RU | `https://g.page/r/…/review` |
| TripAdvisor | US, EU, UK, AU, AE | `https://www.tripadvisor.com/…` |
| Facebook Reviews | US, EU, UK, AU, AE | `https://www.facebook.com/…/reviews` |
| Yelp | US, AU | `https://www.yelp.com/biz/…` |
| Trustpilot | EU, UK | `https://www.trustpilot.com/review/…` |
| Booking.com | EU, UK, AE | `https://www.booking.com/hotel/…` |
| Checkatrade | UK | `https://www.checkatrade.com/trades/…` |
| ProductReview.com.au | AU | `https://www.productreview.com.au/listings/…` |
| True Local | AU | `https://www.truelocal.com.au/business/…` |
| Yandex Maps | RU | `https://yandex.ru/maps/org/…` |
| 2GIS | RU | `https://2gis.ru/…` |
| Flamp | RU | `https://flamp.ru/…` |
| Zomato | AE, AU | `https://www.zomato.com/…` |
| Talabat | AE | `https://www.talabat.com/uae/…` |

**Total: 14 platforms across 6 regions.**

---

## By Region

### Global (all regions)
- **Google Reviews** — The most important platform for local businesses worldwide. Reevo defaults to Google as the first redirect target.

---

### United States (US)
- Google Reviews
- TripAdvisor
- Facebook Reviews
- Yelp

---

### Europe (EU)
- Google Reviews
- TripAdvisor
- Facebook Reviews
- Trustpilot
- Booking.com

---

### United Kingdom (UK)
- Google Reviews
- TripAdvisor
- Facebook Reviews
- Trustpilot
- Booking.com
- Checkatrade *(specialist for tradespeople)*

---

### Australia (AU)
- Google Reviews
- TripAdvisor
- Facebook Reviews
- Yelp
- ProductReview.com.au *(largest AU consumer review site)*
- True Local
- Zomato *(food delivery / restaurants)*

---

### UAE & Middle East (AE)
- Google Reviews
- TripAdvisor
- Facebook Reviews
- Booking.com
- Zomato
- Talabat *(largest food delivery platform in MENA)*

---

### Russia & CIS (RU)
- Google Reviews
- Yandex Maps *(dominant local search in Russia)*
- 2GIS *(offline-first mapping platform)*
- Flamp *(Siberia-origin local reviews)*

---

## How Platform Routing Works

1. Business owner adds platform URLs in the **Settings → Review Platforms** screen.
2. Each platform can be individually enabled or disabled.
3. When a customer completes the funnel (4★+), they are shown the configured platforms in order.
4. The platform link opens in a new tab; the AI-generated text is already on the clipboard.

### Default behaviour
- Google Reviews is the default primary platform for all new accounts.
- Additional platforms can be added at any time without reprinting the QR code (dynamic routing).

### Multi-platform support
A single QR code can redirect to multiple platforms. The customer sees a list and chooses which to post on — giving the business coverage across multiple review sites from a single scan.

---

## Adding a New Platform

The `review_platforms` field on the `businesses` table stores a JSONB array:

```json
[
  { "id": "google",      "url": "https://g.page/r/xxx/review", "enabled": true  },
  { "id": "tripadvisor", "url": "https://www.tripadvisor.com/…", "enabled": true  },
  { "id": "facebook",    "url": "https://www.facebook.com/…", "enabled": false }
]
```

Fields:
- `id` — must match a key in `PLATFORM_DEFS` (`src/lib/platforms.ts`)
- `url` — the direct review submission URL for this business
- `enabled` — whether this platform appears in the funnel

To add a new platform to the product, add an entry to `PLATFORM_DEFS` in `src/lib/platforms.ts`.
