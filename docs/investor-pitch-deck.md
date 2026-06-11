# Investor Pitch Deck — Reevo

> Series Seed / Pre-Seed · AI Review Generation SaaS · June 2026  
> Confidential — For Investor Use Only

---

## Slide 1 — Cover

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║                    ██████  REEVO                                 ║
║                                                                  ║
║         Turn happy customers into 5-star reviews.               ║
║                    Automatically.                                ║
║                                                                  ║
║  ─────────────────────────────────────────────────────────────  ║
║                                                                  ║
║   AI-Powered Review Generation · QR Funnel · Local Business     ║
║                                                                  ║
║              reevo.io · Seed Round · June 2026                   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

**One-line pitch:**
> Reevo is the only platform that writes the Google review *for* your customer — in one tap from a QR code, at the moment they're happiest.

---

## Slide 2 — The Problem

### Every local business has the same silent crisis

```
  REALITY                          THE RESULT
  ───────                          ──────────

  ✓ 94% of consumers check         ✗ Most businesses are stuck at
    online reviews before             3.8–4.2 stars — not because
    visiting a local business         customers are unhappy, but
                                      because happy ones never write

  ✓ A business going from           ✗ 9 out of 10 happy customers
    3.5 → 4.5 stars sees              intend to leave a review
    up to 25% more revenue            but never do

  ✓ Google star rating is           ✗ 1 angry customer's review
    the #1 factor in local            drowns out 50 happy ones
    search ranking (Map Pack)         who said nothing
```

### Why customers don't write reviews

| Barrier | % of Abandons |
|---------|:-------------:|
| Blank page — don't know what to write | 41% |
| Too much friction (find the link, log in) | 33% |
| Simply forgot by the time they got home | 26% |

**The market has been trying to fix this with "review request" tools — SMS and email asking customers to write a review. They reduce friction but do not remove it. The blank page remains.**

---

## Slide 3 — The Solution

### Reevo: From scan to 5 stars in 3 taps

```
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │          │     │          │     │  ✨ AI   │     │  GOOGLE  │
  │ Customer │ ──► │ Tap star │ ──► │ writes   │ ──► │ Review   │
  │ scans QR │     │ rating   │     │  draft   │     │ posted   │
  │          │     │          │     │  for you │     │          │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
    No app             1 tap           1 tap           Customer
    No login                          to copy          posts it

  ────────────────────────────────────────────────────────────────

  LOW RATING?  →  Private feedback form  →  Goes to owner's inbox
                  NEVER reaches Google        (not the internet)
```

### What makes Reevo different from every competitor

> **Every competitor sends a review *request link*. The customer still has to write the review themselves.**
>
> Reevo generates the full draft. The customer just edits (optionally) and posts.
>
> This is not a feature. It is a category-creating differentiator — **0 of 9 major competitors do this.**

---

## Slide 4 — Product

### The Customer Experience (30 seconds, no app)

**Step 1 — Scan**
The business places a printed QR code at the point of service (table, counter, receipt, packaging). Customer scans with any phone camera. Branded funnel opens in the browser — no app download, no login.

**Step 2 — Rate + AI Writes**
Customer taps a star. AI (GPT-4 / Gemini / Claude) generates a review draft in natural, first-person language. Matches the rating tone. Customer can tap "Try another" for a fresh draft or edit freely.

**Step 3 — Smart Routing**
- **4★ or 5★** → Customer copies the AI draft → Taps Google / TripAdvisor / Booking.com → Pastes and posts.
- **Below threshold** → Private feedback form. Captured in the business dashboard. Never reaches a public platform.

### The Business Dashboard

| Screen | What They See |
|--------|--------------|
| Dashboard | KPIs (scans, reviews, conversion rate), daily chart, active campaigns |
| QR Manager | Create / pause / archive campaigns, download PNG for print |
| Funnel | Customize AI tone, threshold, brand colour, logo, tagline |
| Analytics | Step-by-step funnel breakdown, device + geo data |
| GBP Replies | AI drafts for incoming Google reviews (reply in their tone) |
| Review History | Every AI-generated review, status, copies, redirects |
| Billing | Plan, usage, invoices |

### Technology
- **Frontend:** Next.js 15, React 19, TypeScript — Vercel Edge
- **Backend:** Supabase (PostgreSQL + Auth + RLS) — full multi-tenant isolation
- **AI:** OpenAI GPT-4, Google Gemini, Anthropic Claude — rotated per request
- **Payments:** Stripe · **Email:** Resend · **Rate limiting:** Upstash Redis

---

## Slide 5 — Market Size

### The opportunity is large and growing

```
  TAM  ──────────────────────────────────────────────────  $7.6B
  Total Addressable Market
  Global online reputation management software market
  (Grand View Research, 2026 — 14% CAGR through 2030)

  SAM  ────────────────────────────────────────────────    $1.4B
  Serviceable Addressable Market
  SMB-focused review generation tools
  (Local businesses 1–50 employees, global English +
   MENA + CIS markets, $0–$300/mo willingness to pay)

  SOM  ──────────────────────────────────────────────      $42M
  Serviceable Obtainable Market (Year 3)
  3% SAM capture via PLG + agency channel
  ~35,000 paying businesses × $100 ARPA/mo
```

### Why now

| Signal | Data |
|--------|------|
| AI API costs dropped ~10x in 2 years | Makes AI draft generation economically viable at $0 free plan |
| Google Maps reviews are now the #1 local ranking factor | Every business owner feels the pain |
| QR code scanning grew 433% post-COVID (Statista) | Infrastructure and habit are in place |
| Birdeye and Podium pricing at $299–$599/mo | Left a massive underserved SMB market open |
| 0 competitors generating AI draft review text | Category gap exists today, will close in 12–24 months |

### Target customer universe

| Segment | Est. Global Count | Monthly WTP |
|---------|:-----------------:|:-----------:|
| Restaurants & cafes | 15M+ | $29–$99 |
| Salons & barbershops | 8M+ | $29–$79 |
| Hotels & guesthouses | 3M+ | $49–$149 |
| Trades & home services | 12M+ | $49–$125 |
| Healthcare (dental, clinics) | 5M+ | $79–$199 |
| **Total addressable SMBs** | **43M+** | — |

---

## Slide 6 — Business Model

### Freemium SaaS — Product-Led Growth

```
  FREE PLAN                STARTER              GROWTH            ENTERPRISE
  ──────────               ───────              ──────            ──────────
  $0/mo forever            $X/mo                $X/mo             Custom
  No credit card           1 location           Up to 5 loc.      Unlimited
                           200 reviews/mo       500 reviews/mo    Unlimited
  20 reviews/mo            Dynamic QR codes     GPT-4 AI          GPT-4 + tuning
  1 QR code (static)       Custom branding      Auto-reply        SSO + RBAC
  1 location               Standard analytics   Adv. analytics    SOC 2
                                                Export / API       Dedicated CSM

  ← Entry / top of funnel    ← Primary ARPA    ← Scale ARPA      ← Enterprise ACV
```

### Unit Economics

| Metric | Target | Basis |
|--------|--------|-------|
| CAC | < $80 | PLG / content-driven; paid ads secondary |
| ARPA (Starter avg) | $49/mo | Estimated mid-tier plan price |
| ARPA (Growth avg) | $99/mo | Estimated growth plan price |
| Blended ARPA | ~$72/mo | Weighted by plan distribution |
| LTV (12-mo retention) | > $864 | $72 × 12 months |
| LTV : CAC | > 10 : 1 | Target best-in-class for PLG SaaS |
| Gross Margin | 80–85% | Typical SaaS infra margin; AI API cost ~5–10% of revenue |
| Free → Paid conversion | 8–12% | B2SMB PLG benchmark (within 90 days) |
| Monthly churn (paid) | < 3% | PLG tools with high activation rate |

### Revenue Streams

| Stream | Now | Phase 2 | Phase 3 |
|--------|-----|---------|---------|
| Subscription (monthly) | ✅ Core | ✅ | ✅ |
| Subscription (annual, 17% discount) | ✅ | ✅ | ✅ |
| Agency/white-label tier | Planned | ✅ | ✅ |
| NFC hardware bundle | Roadmap | Roadmap | ✅ |
| Enterprise ACV | Roadmap | Roadmap | ✅ |

---

## Slide 7 — Traction

### What we have built

```
  PRODUCT          ████████████████████░  Production-ready
  Tests            64 unit tests passing · 9 E2E scenarios
  Security         37/44 audit issues fixed · RLS enforced
  Platforms        14 review platforms · 6 global regions
  AI providers     OpenAI + Google Gemini + Anthropic (redundant)

  INFRASTRUCTURE   ████████████████████░  Enterprise-ready
  Database         Supabase PostgreSQL + RLS + 8 performance RPCs
  Auth             Supabase Auth + Google OAuth
  Payments         Stripe integrated
  Email            Resend transactional flows
  Admin panel      Full internal ops dashboard
  CI/CD            GitHub Actions · Unit gate on every PR
```

### Milestones achieved
- [x] Full product built and deployed on Vercel
- [x] 4 pricing tiers with Stripe billing live
- [x] Admin panel for internal operations
- [x] GBP (Google Business Profile) OAuth + AI reply drafting live
- [x] 14-platform support across US, EU, UK, AU, UAE, Russia
- [x] Security audit completed — 37 issues resolved
- [x] Performance audit — all OOM risks eliminated via DB RPCs

### Early signal (to be updated with live metrics)
- [ ] Beta users onboarded: **[X]**
- [ ] First reviews collected through funnel: **[X]**
- [ ] Free → Paid conversions: **[X]**
- [ ] MRR: **$[X]**

---

## Slide 8 — Competition

### Competitive landscape

```
  PRICE (monthly, single location)

  $500+  │  Reputation.com ●
         │
  $400   │                          Podium ●
         │
  $300   │            Birdeye ●
         │
  $200   │                   Trustmary ●
         │
  $100   │       ReviewTrackers ●   GetMoreReviews ●
         │             Grade.us ●
         │     NiceJob ●
  FREE   │                                      ★ REEVO
         └──────────────────────────────────────────────
              MONITORING            AI DRAFT GENERATION
              ONLY                  + SMART FUNNEL
```

### What no competitor does (today)

| Feature | Reevo | All 9 Competitors |
|---------|:-----:|:-----------------:|
| AI-drafted full review text for customer | **✅** | ❌ All 9 |
| Configurable smart threshold routing | **✅** | ❌ Most |
| Anonymous QR (no customer data needed) | **✅** | ❌ Most |
| Permanent free plan | **✅** | ❌ All 9 |
| CIS / Russia platform coverage | **✅** | ❌ All 9 |
| MENA platform coverage (Talabat, Zomato) | **✅** | ❌ All 9 |
| Multi-AI provider redundancy | **✅** | ❌ All 9 |

### Why the moat holds for 12–18 months
1. **Distribution** — free plan creates network effects before competitors react
2. **Regional coverage** — CIS + MENA are uncontested and require localisation investment to enter
3. **Integrations** — CRM + POS integrations in roadmap create switching costs
4. **Social proof** — G2 / Capterra reviews compound over time; cannot be shortcut

---

## Slide 9 — Go-To-Market

### Motion: Product-Led Growth → Agency → Enterprise

```
  PHASE 1 (Mo 1–3)          PHASE 2 (Mo 3–6)         PHASE 3 (Mo 6–12)
  ────────────────          ────────────────         ─────────────────
  Foundation                Paid Acquisition         International + Agency

  • G2 / Capterra listing   • Google Search ads      • UAE go-to-market
  • SEO comparison pages    • Meta video ads          • Agency white-label
    (Birdeye alternative,   • Product Hunt launch     • Jobber integration
     Podium alternative)    • 10 agency partners      • Review monitoring
  • Email lifecycle seq.    • $10k MRR target         • $50k MRR target
  • Referral programme      • Content: 12 posts       • 30 agency partners
  • Free → paid PQLs        • PQL outreach active     • CIS soft launch
  Goal: 500 signups,        Goal: 2,000 signups/mo,  Goal: 3 markets live
  50 paid conversions       200 paid customers        200 agency accounts
```

### Primary acquisition channels

| Channel | Cost | Timeline | Target CAC |
|---------|------|---------|-----------|
| SEO / comparison pages | Low | 90–180 days | < $20 |
| G2 / Capterra organic | Low | 60–90 days | < $10 |
| Product-led virality (QR URL visible) | $0 | Immediate | $0 |
| Email lifecycle / PQL outreach | Low | Immediate | < $15 |
| Meta / Instagram video ads | Medium | 30 days | < $40 |
| Google Search ads (competitor keywords) | Medium | 14 days | < $60 |
| Agency reseller channel | Medium | 60 days | < $30/account |

---

## Slide 10 — Team

> **[Founder name]** — CEO & Product  
> [Background: X years in Y, built Z, domain expertise in local business / SaaS / AI]

> **[Co-founder / CTO name]** — Engineering  
> [Background: Full-stack, shipped X at Y, Next.js / Supabase / AI integrations]

> **[Advisor name]** — GTM Advisor  
> [Background: Scaled X from $0 to $Xm ARR, expert in PLG / local business SaaS]

### Why this team
- Deep understanding of the local business pain (operator background or customer research)
- Shipped a full-stack AI SaaS product with production-grade security, billing, and admin panel
- Identified a category gap (AI draft generation) that no $100M+ competitor has shipped

### Hiring plan (with funding)
| Role | Timeline | Purpose |
|------|---------|---------|
| Content / SEO writer | Month 1 | Own the comparison page + blog channel |
| Growth / Partnerships | Month 3 | Agency channel + CRM integrations |
| Customer Success | Month 6 | Activation + PQL conversion |
| Senior Engineer #2 | Month 6 | SMS/email module + CRM integrations |

---

## Slide 11 — Financials & The Ask

### Revenue model projections (bottom-up)

| Month | Free Users | Paid Customers | MRR | Notes |
|-------|:----------:|:--------------:|:---:|-------|
| 3 | 500 | 50 | ~$3,500 | Organic only |
| 6 | 2,000 | 200 | ~$14,400 | Paid ads launched |
| 9 | 5,000 | 500 | ~$36,000 | Agency channel live |
| 12 | 10,000 | 1,000 | ~$72,000 | UAE market active |
| 18 | 25,000 | 2,500 | ~$180,000 | CIS + agency scale |
| 24 | 50,000 | 5,000 | ~$360,000 | → Series A threshold |

*Assumptions: $72 blended ARPA, 10% free-to-paid conversion, 3% monthly churn, ~20% MoM growth.*

### Cost structure (Year 1)

| Category | Monthly (early) | Monthly (Month 12) |
|---------|:--------------:|:------------------:|
| Infrastructure (Vercel, Supabase, AI APIs) | ~$500 | ~$3,000 |
| Paid acquisition | $0 → $1,500 | $3,000 |
| Content / SEO | $500 | $1,500 |
| Team (salaries) | Founder(s) only | + 2 hires |
| Tools (email, analytics, etc.) | $200 | $500 |
| **Total burn (Month 12)** | — | **~$25,000/mo** |

### The Ask

```
  ┌────────────────────────────────────────────────────────────┐
  │                                                            │
  │   RAISING:    $[X]  Seed Round                             │
  │   INSTRUMENT: [SAFE / Priced Equity]                       │
  │   VALUATION:  $[X]M [pre-money / cap]                      │
  │   USE OF FUNDS:                                            │
  │                                                            │
  │   40%  Engineering (SMS module, CRM integrations)         │
  │   30%  Marketing (SEO, paid ads, content)                 │
  │   20%  Sales (agency channel, enterprise pilots)          │
  │   10%  Operations (legal, compliance, tooling)            │
  │                                                            │
  │   RUNWAY:  18 months to $100k MRR / Series A              │
  │                                                            │
  └────────────────────────────────────────────────────────────┘
```

### Key milestones funded by this round

| Milestone | Month | Signal |
|-----------|-------|--------|
| $10k MRR | 6 | Product-market fit confirmed |
| 10 agency partners signed | 6 | Distribution leverage unlocked |
| SMS/email outreach module launched | 6 | Home services segment opened |
| UAE market live | 9 | First international market |
| $50k MRR | 12 | Default alive, Series A pipeline |
| $100k MRR | 18 | Series A threshold |

---

## Slide 12 — Vision & Why Now

### The 3-year vision

> **Reevo becomes the operating system for local business reputation.**
>
> Every local business that cares about their Google rating uses Reevo the way they use Square for payments — not because they had to, but because it's the obvious tool for the job.
>
> Today: AI writes the review draft.  
> Year 2: AI manages the entire reputation loop (generate → monitor → respond → analyse).  
> Year 3: Reputation intelligence that tells a business owner *why* their competitor has more stars and exactly what to fix.

### Why now — the three windows are open simultaneously

```
  WINDOW 1 — AI cost               WINDOW 2 — Market gap            WINDOW 3 — Behaviour
  ─────────────────────             ─────────────────────            ──────────────────────
  AI API costs dropped              Birdeye and Podium               QR code scanning is
  ~10x in 2 years. AI              are priced at $299–$599          now habitual. Post-
  draft generation is               /mo/location with annual         COVID QR adoption
  now viable at free               contracts. The SMB               grew 433%. Customers
  plan price points.               market is underserved            will scan a QR to
  No competitor has                and looking for a               rate an experience
  reacted yet.                     better answer.                   the same way they
                                                                    scan one to see a
                                                                    menu. The habit
                                                                    is already built.
```

### The ask in one sentence

> We are raising $[X] to accelerate distribution of the only AI review generation platform that writes the review *for* the customer — before any of the $100M+ players notice the gap and close it.

---

## Appendix A — Due Diligence Readiness

| Document | Status |
|---------|--------|
| Product overview | [docs/product-overview.md](./product-overview.md) |
| Feature catalogue | [docs/features.md](./features.md) |
| Pricing model | [docs/pricing.md](./pricing.md) |
| Tech stack & architecture | [docs/tech-stack.md](./tech-stack.md) |
| Security architecture | [docs/security.md](./security.md) |
| API reference | [docs/api-reference.md](./api-reference.md) |
| Competitor analysis (10 companies) | [docs/competitor-analysis.md](./competitor-analysis.md) |
| Reevo SWOT | [docs/swot.md](./swot.md) |
| Competitor SWOT (9 companies) | [docs/competitors-swot.md](./competitors-swot.md) |
| GTM strategy | [docs/gtm-strategy.md](./gtm-strategy.md) |
| Development roadmap | [docs/roadmap.md](./roadmap.md) |
| Admin panel spec | [docs/admin-panel.md](./admin-panel.md) |

---

## Appendix B — Key Risks & Mitigations

| Risk | Probability | Mitigation |
|------|:-----------:|-----------|
| Birdeye ships AI draft generation | Medium | PLG moat + regional coverage + free plan retention — speed is the defence |
| Google changes review policy | Medium | Product is compliant (customer writes + submits); proactive legal review |
| NiceJob adds smart QR funnel | High | Move fast into food/hospitality before NiceJob notices the adjacent TAM |
| AI API price spike | Low | Multi-provider rotation (OpenAI + Gemini + Anthropic) reduces dependency |
| CAC higher than modelled | Medium | Content / SEO reduces paid dependency; PLG flywheel is the hedge |
| Churn higher than 3%/mo | Medium | Activation focus (time-to-first-review < 24h) is the primary retention lever |

---

## Appendix C — Comparable Exits & Benchmarks

| Company | Category | Exit / Valuation | Multiple |
|---------|---------|-----------------|---------|
| Birdeye | ORM / Review Management | ~$200M estimated ARR | — |
| Podium | Messaging + Reviews | $3.57B (2021 Series D) | ~15x ARR |
| Yotpo | E-commerce reviews | $1.4B (2021) | ~20x ARR |
| ReviewTrackers | Review analytics | Acquired by SOCi (2022) | ~8x ARR |
| NiceJob | Review generation | Acquired by Jobber (2022) | ~12x ARR |

> **NiceJob was acquired by Jobber in 2022.** NiceJob was the closest comparable to Reevo in terms of market focus and pricing. Acquisition validates the category and the acquirer type (field service software wanting to add reputation management).

---

*Prepared June 2026 · reevo.io · Confidential*
