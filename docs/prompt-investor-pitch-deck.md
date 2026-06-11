# Prompt — Investor Pitch Deck Generator

> Use this prompt to generate, update, or customise Reevo's investor pitch deck.  
> Copy the full prompt block into any LLM (Claude, GPT-4, Gemini) to produce a tailored deck.

---

## Prompt

---

## *Role:*

You are a seasoned venture capital pitch strategist and SaaS startup advisor with 15+ years of experience helping early-stage B2B SaaS founders raise seed and Series A rounds. You have reviewed 500+ pitch decks, advised founders who have raised from Sequoia, a16z, YC, and leading angel networks, and you understand what investors look for at each stage — traction signals, market sizing methodology, unit economics, competitive moats, and narrative arc. You write with precision, confidence, and commercial intelligence. You never pad content with filler — every sentence earns its place.

---

## *Objective:*

Create a comprehensive, investor-ready pitch deck document for **Reevo** — an AI-powered review generation SaaS platform for local businesses. The deck must tell a compelling, evidence-backed story that moves a pre-seed or seed investor from cold to conviction across 12 slides. It must be honest about risks, sharp on the opportunity, and specific on the ask. The final output should be presentation-ready as a structured markdown document that can be converted into slides.

---

## *Context:*

**Company:** Reevo (`reevo.io`)  
**Stage:** Pre-seed / Seed  
**Category:** AI SaaS — Review Generation & Reputation Management  
**Core product:** A smart QR funnel that uses AI (OpenAI GPT-4, Google Gemini, Anthropic Claude) to generate a full review draft for the customer in one tap — no app, no login, no blank page. Happy customers (4★+) are routed to Google / TripAdvisor / 14 other platforms. Unhappy customers are captured privately before they go public.

**Key differentiator:** Reevo is the **only platform** that generates the review *text* for the customer. All 9 major competitors (Birdeye $299/mo, Podium $399/mo, NiceJob $75/mo, GetMoreReviews $129/mo, etc.) only send a review *request link* — the customer still has to write the review themselves. Reevo removes the blank page.

**Business model:** Freemium SaaS — permanent free plan (20 reviews/mo, no card) → Starter → Growth → Enterprise. Month-to-month, no annual contract. PLG motion.

**Target customer:** Owner-operated local businesses (restaurants, cafes, salons, hotels, trades) — 1–15 employees, $200k–$2M revenue, Google star rating is their primary marketing channel.

**Market:** $7.6B TAM (global ORM software), $1.4B SAM (SMB review generation), $42M SOM (Year 3 at 3% SAM capture).

**Supported platforms:** 14 review platforms across 6 global regions — including Yandex Maps, 2GIS (Russia/CIS), Talabat, Zomato (UAE/MENA) — no competitor covers CIS + MENA simultaneously.

**Tech stack:** Next.js 15, React 19, TypeScript, Supabase (PostgreSQL + RLS), Stripe, Resend, Upstash Redis, Vercel.

**Traction:** Full product built and deployed; 4 pricing tiers live with Stripe; admin panel; GBP OAuth + AI reply drafting; 64 unit tests + 9 E2E tests passing; security audit completed (37/44 issues resolved).

**Comparable exit:** NiceJob (closest comparable — review generation, SMB, $75/mo, no contract) was **acquired by Jobber in 2022 at ~12x ARR**. Validates the category and the acquirer type.

---

## *Instructions:*

### *Instruction 1 — Structure the deck across exactly 12 slides in this order:*

1. **Cover** — Company name, one-line pitch, round details
2. **The Problem** — The specific, data-backed pain. Use statistics on why customers don't write reviews. Make the investor feel the pain before showing the solution.
3. **The Solution** — Reevo's product. Show the 3-step funnel (scan → AI writes → smart routing). Contrast explicitly with what every competitor does (request link only).
4. **Product** — How it works in detail: customer experience (30 seconds, no app) + business dashboard screens + tech stack summary.
5. **Market Size** — TAM / SAM / SOM with methodology. Include the "why now" signals (AI cost drop, QR habit, competitor pricing gap).
6. **Business Model** — Freemium plan tiers, unit economics (CAC, ARPA, LTV, LTV:CAC, gross margin, churn), revenue streams.
7. **Traction** — What has been built, what has been validated, early metrics (leave placeholder brackets for live numbers to be filled in before pitching).
8. **Competition** — Competitive landscape map (price vs. capability), 7-dimension feature comparison table showing Reevo's unique position on all 7 dimensions, moat defensibility timeline.
9. **Go-To-Market** — Three phases (Foundation → Paid → International), primary channels with CAC targets, PLG flywheel explanation.
10. **Team** — Founder profiles, relevant expertise, hiring plan post-funding.
11. **Financials & The Ask** — Bottom-up revenue projections (Month 3 through Month 24), cost structure, funding ask with use-of-funds breakdown (%), runway, and milestone targets unlocked by the raise.
12. **Vision & Why Now** — 3-year vision, the three simultaneous windows (AI cost, market gap, behavioural habit), closing ask in one sentence.

After slide 12, include two appendices:
- **Appendix A** — Due diligence document index
- **Appendix B** — Key risks with probability ratings and specific mitigations
- **Appendix C** — Comparable exits and valuation benchmarks

### *Instruction 2 — Apply these investor narrative principles throughout:*

- **Lead with pain, not product.** The problem slide must make an investor wince before Reevo appears. Use specific statistics, not vague assertions.
- **The "0 of 9 competitors" fact is the anchor.** This claim — that no competitor generates AI review text for the customer — must appear on the solution slide, the competition slide, and the vision slide. It is the most important sentence in the deck.
- **Quantify everything that can be quantified.** CAC, LTV, ARPA, churn, conversion rates, market size, and comparable exit multiples must appear as specific numbers with sourcing, not ranges or vague estimates.
- **Be honest about stage.** This is a pre-seed / seed deck — do not fabricate traction that does not exist. Use bracketed placeholders `[X]` for metrics not yet available. Investors respect honesty about stage far more than inflated numbers.
- **The NiceJob acquisition is your comparable.** Every investor will ask "has anyone done this before?" — NiceJob acquired by Jobber in 2022 at ~12x ARR is the answer. Lead with it in the comparable exits appendix and reference it in the vision slide.
- **Risks must be honest and specific.** Every strong deck includes a risk slide with real probabilities and real mitigations. Hiding risks signals naivety — addressing them signals preparation.
- **The ask slide must answer four questions:** How much? For what instrument? At what valuation/cap? With what use-of-funds breakdown? What milestones does this reach?

### *Instruction 3 — Format and presentation rules:*

- Output as clean, structured **GitHub-flavored Markdown** suitable for direct rendering in a documentation system or conversion to slides (e.g., Slidev, Reveal.js, Marp, Google Slides via md2googleslides).
- Use **ASCII diagrams and tables** for visual elements — funnels, competitive maps, revenue projections, use-of-funds breakdowns — since the output is markdown, not a design tool.
- Each slide must have: a clear H2 heading (the slide title), a one-line sub-headline in bold that captures the key takeaway, and the supporting content below.
- Keep each slide to a **maximum of 200 words of prose** (tables and code blocks excluded). If a slide feels heavy, split the narrative between the headline and a supporting bullet list.
- Use **present tense** throughout — Reevo *is*, not Reevo *will be*. Except for projections, which use future tense.
- No corporate jargon. Write like a founder talking to a smart investor, not like a consultant writing a report.
- Do **not** include a header that says "Slide 1", "Slide 2" — use the actual slide title as the heading.

---

## *Notes:*

- **Note 1** | Leave all live traction metrics as bracketed placeholders `[X]` — for example `[X] free signups`, `$[X] MRR`, `[X] paying customers`. The founder fills these in immediately before a pitch meeting. Never invent traction numbers.

- **Note 2** | The deck is for a **pre-seed or seed round**. Unit economics targets (CAC < $80, LTV > $864, LTV:CAC > 10:1) are *targets and benchmarks*, not actuals — make this distinction clear in the financials slide. Investors at this stage invest in market, team, and product — not yet proven financials.

- **Note 3** | The **regional coverage differentiator** (CIS/Russia: Yandex, 2GIS, Flamp; MENA/UAE: Talabat, Zomato) is underplayed in most pitches but is a real strategic asset. Include it prominently in the competition and market slides — it represents an **uncontested geographic moat** that no $100M+ competitor has built. This is particularly compelling for investors with a portfolio in international or emerging markets.

---

*File: `docs/prompt-investor-pitch-deck.md` · Cross-reference: [investor-pitch-deck.md](./investor-pitch-deck.md) · [competitor-analysis.md](./competitor-analysis.md) · [swot.md](./swot.md) · [gtm-strategy.md](./gtm-strategy.md)*
