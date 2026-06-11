"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

/* ── Public plan shape (matches /api/public/plans) ── */
export interface PlanApiRow {
  plan:                string;
  amount_cents:        number;
  amount_cents_yearly: number | null;
  currency:            string;
  label:               string;
  trial_days:          number | null;
  review_limit:        number;
  scan_limit:          number;
  campaign_limit:      number;
  is_popular:          boolean;
}

/* ── Icons ── */
const CheckIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const MinusIcon = () => (
  <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
  </svg>
);
const ArrowIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="M13 5l7 7-7 7" />
  </svg>
);

/* ── Static display metadata per DB plan ID ── */
const PLAN_META: Record<string, { displayName: string; sub: string; cta: string }> = {
  free:       { displayName: "Free",       sub: "Try Reevo free for 14 days. No credit card required.",  cta: "Start free trial"  },
  starter:    { displayName: "Starter",    sub: "For single-location businesses serious about reviews.", cta: "Get started"       },
  growth:     { displayName: "Growth",     sub: "Best for growing cafes with 2–5 locations.",            cta: "Get started"       },
  enterprise: { displayName: "Enterprise", sub: "For franchises and multi-location chains.",              cta: "Get started"       },
};

/* ── Static feature bullets per DB plan ID ── */
const PLAN_FEATURES: Record<string, [string, boolean][]> = {
  free: [
    ["1 location",                     true ],
    ["20 reviews / month",             true ],
    ["20 scans / month",               true ],
    ["1 QR code",                      true ],
    ["Basic AI review suggestions",    true ],
    ["Standard analytics",             true ],
    ["14-day full access, no card",    true ],
    ["Auto-reply to reviews",          false],
    ["Custom branding",                false],
    ["Multi-location",                 false],
    ["Priority support",               false],
  ],
  starter: [
    ["1 location",                     true ],
    ["200 reviews / month",            true ],
    ["200 scans / month",              true ],
    ["Dynamic QR codes",               true ],
    ["AI review suggestions",          true ],
    ["Standard analytics",             true ],
    ["Custom branding",                true ],
    ["Auto-reply to reviews",          false],
    ["Multi-location",                 false],
    ["Priority support",               false],
  ],
  growth: [
    ["Up to 5 locations",              true ],
    ["500 reviews / month",            true ],
    ["500 scans / month",              true ],
    ["Dynamic QR codes",               true ],
    ["GPT-4 review suggestions",       true ],
    ["Advanced funnel analytics",      true ],
    ["Custom branding & domain",       true ],
    ["Auto-reply to reviews",          true ],
    ["Multi-staff accounts",           true ],
    ["Priority support",               false],
  ],
  enterprise: [
    ["Unlimited locations",            true ],
    ["Unlimited reviews",              true ],
    ["Unlimited scans",                true ],
    ["Dynamic QR codes",               true ],
    ["AI suggestions + tone tuning",   true ],
    ["Cohort & device analytics",      true ],
    ["Custom branding & domain",       true ],
    ["Auto-reply to reviews",          true ],
    ["SSO + role-based access",        true ],
    ["Priority + dedicated CSM",       true ],
  ],
};

// Plans shown on the marketing page — in display order
const MARKETING_PLAN_IDS = ["free", "starter", "growth", "enterprise"];

/* ── Full comparison table (static marketing copy) ── */
const COMPARISON_GROUPS = [
  { group: "Funnels", items: [
    ["Locations",         "1",        "1",                 "Up to 5",           "Unlimited"         ],
    ["QR codes",          "1 static", "Unlimited dynamic", "Unlimited dynamic", "Unlimited dynamic" ],
    ["Active campaigns",  "1",        "3",                 "5",                 "Unlimited"         ],
    ["Branded domain",    false,      true,                true,                true                ],
  ]},
  { group: "AI", items: [
    ["Reviews per month",    "20",      "200",      "500",       "Unlimited"           ],
    ["AI suggestion model",  "GPT-3.5", "GPT-3.5", "GPT-4",     "GPT-4 + tone training"],
    ["Languages",            "1",       "4",        "8",         "24"                  ],
    ["Auto-reply to reviews",false,     false,      true,        true                  ],
  ]},
  { group: "Analytics", items: [
    ["Real-time dashboards",  true,    true,       true,        true              ],
    ["Funnel breakdown",      "Basic", "Standard", "Advanced",  "Advanced + cohorts"],
    ["Device & geo analytics",false,   false,      true,        true              ],
    ["Export to CSV / API",   false,   false,      true,        true              ],
  ]},
  { group: "Workspace", items: [
    ["Team seats",         "1",   "1",   "5",   "Unlimited"],
    ["Role-based access",  false, false, false, true       ],
    ["SSO (Google, SAML)", false, false, false, true       ],
    ["Audit log",          false, false, false, true       ],
  ]},
  { group: "Support", items: [
    ["Email support",      true,  true,  true,      true         ],
    ["Priority support",   false, false, true,      true         ],
    ["Dedicated CSM",      false, false, false,     true         ],
    ["Onboarding session", false, false, "30 min",  "2 hours"    ],
  ]},
];

/* ── Pricing FAQ ── */
const PRICING_FAQS = [
  { q: "Is there really a free plan?", a: "Yes — Free gives you a full 14-day trial with no credit card required. After the trial, you keep 1 location, 20 AI-drafted reviews per month, and one QR code forever." },
  { q: "Can I switch between plans?", a: "Yes. Upgrade or downgrade any time from the billing page. Upgrades are prorated; downgrades take effect at the next billing cycle." },
  { q: "Do you charge per location?", a: "No per-location fees on Growth and Enterprise. Growth includes up to 5 locations; Enterprise is unlimited." },
  { q: "What happens if I exceed limits on the free plan?", a: "The funnel keeps working — but new AI suggestions pause once you hit 20 in a month. Reviews already in flight always complete." },
  { q: "Can I get an invoice?", a: "Yes. Every charge generates a downloadable PDF invoice with VAT, business name, and tax ID fields editable in billing." },
  { q: "Do you offer non-profit or education discounts?", a: "Yes — 50% off Starter, Growth, and Enterprise for verified non-profits and educational institutions. Contact sales to apply." },
];

function FAQItem({ q, a, defaultOpen = false }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid var(--border)" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ all: "unset", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "22px 0", cursor: "pointer", gap: 16 }}
      >
        <span style={{ fontSize: 17, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em" }}>{q}</span>
        <span style={{ width: 32, height: 32, borderRadius: "50%", border: "1px solid var(--border)", display: "grid", placeItems: "center", flexShrink: 0, background: "var(--surface)" }}>
          {open
            ? <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14"/></svg>
            : <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          }
        </span>
      </button>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows .35s ease" }}>
        <div style={{ overflow: "hidden" }}>
          <div style={{ paddingBottom: 22, color: "var(--muted)", fontSize: 15, lineHeight: 1.6, maxWidth: 640 }}>{a}</div>
        </div>
      </div>
    </div>
  );
}

function CompValue({ v }: { v: boolean | string }) {
  if (v === true) return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
  if (v === false) return <span style={{ color: "var(--muted-2)", fontSize: 14 }}>—</span>;
  return <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{v}</span>;
}

export default function PricingPageClient({ plans }: { plans: PlanApiRow[] }) {
  const [yearly, setYearly] = useState(true);

  const planMap = Object.fromEntries(plans.map(p => [p.plan, p]));

  const marketingPlans = MARKETING_PLAN_IDS.map(id => {
    const db = planMap[id];
    const meta = PLAN_META[id];
    const monthly = db ? db.amount_cents / 100 : 0;
    const yearlyTotal = db?.amount_cents_yearly != null ? db.amount_cents_yearly / 100 : null;
    return {
      id,
      name:         meta?.displayName ?? id,
      sub:          meta?.sub ?? "",
      cta:          meta?.cta ?? "Get started",
      monthly,
      yearly:       yearlyTotal,
      yearlySaving: yearlyTotal != null ? Math.round(monthly * 12 - yearlyTotal) : 0,
      popular:      db?.is_popular ?? false,
      features:     PLAN_FEATURES[id] ?? [],
    };
  });

  const headerPrices = marketingPlans.map(p => (yearly && p.yearly !== null) ? p.yearly : p.monthly);

  return (
    <>
      <Navbar />
      <main style={{ flexGrow: 1 }}>
        {/* Hero */}
        <section className="section" style={{ paddingTop: 80, paddingBottom: 48, position: "relative", overflow: "hidden" }}>
          <div className="bg-gradients" />
          <div className="container" style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 760 }}>
            <span className="eyebrow"><span className="dot" /> Pricing</span>
            <h1 className="h1" style={{ marginTop: 18 }}>
              Pricing that scales with <em>your reviews,</em> not your revenue.
            </h1>
            <p className="lead" style={{ margin: "22px auto 0", textAlign: "center" }}>
              Start free, no credit card. Upgrade only when you need unlimited reviews, multi-location, or advanced analytics.
            </p>
          </div>
        </section>

        {/* Pricing cards */}
        <section style={{ padding: "0 0 80px" }}>
          <div className="container">
            <div style={{ display: "flex", flexDirection: "column", gap: 28, alignItems: "center" }}>
              {/* Toggle */}
              <div className="tabs">
                <button className={!yearly ? "on" : ""} onClick={() => setYearly(false)}>Monthly</button>
                <button className={yearly ? "on" : ""} onClick={() => setYearly(true)}>
                  Yearly <span className="chip accent" style={{ marginLeft: 6, fontSize: 10, padding: "2px 8px" }}>Save up to 17%</span>
                </button>
              </div>

              {/* Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, width: "100%" }} className="pricing-grid">
                {marketingPlans.map((plan) => {
                  const showYearly = yearly && plan.yearly !== null;
                  const price = showYearly ? plan.yearly : plan.monthly;
                  return (
                    <div key={plan.id} className="card lift" style={{
                      padding: 28,
                      border: plan.popular ? "1.5px solid var(--accent)" : "1px solid var(--border)",
                      position: "relative",
                      boxShadow: plan.popular ? "0 30px 60px -30px color-mix(in oklab, var(--accent) 35%, transparent), var(--shadow-md)" : "var(--shadow-sm)",
                      background: plan.popular ? "linear-gradient(180deg, color-mix(in oklab, var(--accent) 4%, var(--surface)) 0%, var(--surface) 30%)" : "var(--surface)",
                    }}>
                      {plan.popular && (
                        <div style={{ position: "absolute", top: -12, left: 24, padding: "4px 12px", fontSize: 11, fontWeight: 600, background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "white", borderRadius: 999, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                          MOST POPULAR
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>{plan.name.toUpperCase()}</div>
                        <div style={{ marginTop: 12, display: "flex", alignItems: "baseline", gap: 6 }}>
                          <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.03em" }}>${price}</span>
                          <span style={{ color: "var(--muted)", fontSize: 14 }}>{showYearly ? "/ yr" : "/ mo"}</span>
                        </div>
                        {showYearly && plan.yearlySaving > 0 && (
                          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="chip accent" style={{ fontSize: 11, padding: "2px 8px" }}>Save ${plan.yearlySaving}/yr</span>
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>vs monthly</span>
                          </div>
                        )}
                        {plan.monthly === 0 && (
                          <div style={{ marginTop: 4, fontSize: 12, color: "var(--muted)" }}>No credit card required</div>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 14, marginBottom: 20, lineHeight: 1.5 }}>{plan.sub}</p>
                      <Link
                        href="/signup"
                        className={"btn " + (plan.popular ? "btn-accent" : "btn-primary")}
                        style={{ width: "100%", justifyContent: "center", display: "flex" }}
                      >
                        {plan.cta} <ArrowIcon />
                      </Link>
                      <div style={{ marginTop: 22, borderTop: "1px solid var(--border)", paddingTop: 18 }}>
                        <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.06em", fontFamily: "var(--font-mono)", marginBottom: 10 }}>INCLUDED</div>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                          {plan.features.map(([label, on], i) => (
                            <li key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: on ? "var(--ink-2)" : "var(--muted-2)" }}>
                              <span style={{ width: 18, height: 18, borderRadius: 999, background: on ? "color-mix(in oklab, var(--accent) 12%, transparent)" : "var(--surface-2)", color: on ? "var(--accent)" : "var(--muted-2)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                                {on ? <CheckIcon /> : <MinusIcon />}
                              </span>
                              {label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Full comparison */}
        <section className="section" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          <div className="container">
            <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 40px" }}>
              <span className="eyebrow"><span className="dot" /> Compare</span>
              <h2 className="h2" style={{ marginTop: 18 }}>Full feature comparison.</h2>
            </div>
            <div className="comparison-scroll">
            <div className="card" style={{ padding: 0, overflow: "hidden", minWidth: 640 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "20px 24px", background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "sticky", top: 60, zIndex: 5 }}>
                <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>FEATURE</div>
                {marketingPlans.map((p, i) => (
                  <div key={p.id}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: p.popular ? "var(--accent)" : "var(--ink)" }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {headerPrices[i] === 0
                        ? "Free"
                        : `$${headerPrices[i]}${(yearly && marketingPlans[i].yearly !== null) ? "/yr" : "/mo"}`}
                    </div>
                  </div>
                ))}
              </div>
              {COMPARISON_GROUPS.map((g) => (
                <div key={g.group}>
                  <div style={{ padding: "20px 24px 8px", fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em", borderBottom: "1px solid var(--border)", background: "var(--bg-soft)" }}>
                    {g.group.toUpperCase()}
                  </div>
                  {g.items.map(([label, ...vals], i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "14px 24px", borderBottom: i === g.items.length - 1 ? "none" : "1px solid var(--border)", alignItems: "center" }}>
                      <div style={{ fontSize: 14, color: "var(--ink-2)" }}>{label as string}</div>
                      {(vals as (boolean | string)[]).map((v, j) => (
                        <div key={j}><CompValue v={v} /></div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            </div>
          </div>
        </section>

        {/* Enterprise strip */}
        <section className="section">
          <div className="container">
            <div className="card ent-grid" style={{
              padding: 40, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 40, alignItems: "center",
              background: "linear-gradient(135deg, var(--surface), var(--bg-soft))",
              borderRadius: 24, boxShadow: "var(--shadow-md)",
            }}>
              <div>
                <span className="eyebrow"><span className="dot" /> Enterprise</span>
                <h2 className="h2" style={{ marginTop: 18, fontSize: "clamp(28px, 3vw, 36px)" }}>Franchises, multi&#8209;brand, agencies.</h2>
                <p className="lead" style={{ marginTop: 14, fontSize: 16 }}>
                  Custom volume pricing, dedicated CSM, white-label, SSO, audit log, contractual SLA. Built for 50+ locations.
                </p>
                <div style={{ display: "flex", marginTop: 22, gap: 12, flexWrap: "wrap" }}>
                  <Link href="/contact" className="btn btn-primary">Talk to sales <ArrowIcon /></Link>
                  <button className="btn btn-ghost">Download SOC 2 report</button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { icon: "building", label: "Multi-tenant workspaces" },
                  { icon: "shield",   label: "SOC 2 Type II + GDPR" },
                  { icon: "users",    label: "SSO + SAML + SCIM" },
                  { icon: "bolt",     label: "99.99% SLA" },
                  { icon: "link",     label: "API + webhook integrations" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10 }}>
                    <EnterpriseIcon name={item.icon} />
                    <span style={{ fontSize: 14 }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing FAQ */}
        <section className="section" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          <div className="container narrow">
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span className="eyebrow"><span className="dot" /> Pricing FAQ</span>
              <h2 className="h2" style={{ marginTop: 18 }}>Billing &amp; plan questions.</h2>
            </div>
            {PRICING_FAQS.map((item, i) => (
              <FAQItem key={i} q={item.q} a={item.a} defaultOpen={i === 0} />
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="container">
            <CTABanner />
          </div>
        </section>
      </main>
      <Footer />

      <style>{`
        @media (max-width: 1200px) { .pricing-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 700px)  { .pricing-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 900px)  { .ent-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 640px) {
          .cta-pricing-banner { padding: 40px 24px !important; }
          .cta-pricing-banner .cta-btns { flex-wrap: wrap !important; }
          .cta-pricing-banner .cta-btns a { flex: 1 1 auto !important; justify-content: center !important; text-align: center !important; }
        }
      `}</style>
    </>
  );
}

function EnterpriseIcon({ name }: { name: string }) {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "var(--accent)" as string, strokeWidth: "1.6", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "building") return <svg {...props}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/></svg>;
  if (name === "shield")   return <svg {...props}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>;
  if (name === "users")    return <svg {...props}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
  if (name === "bolt")     return <svg {...props}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
  return <svg {...props}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
}

function CTABanner() {
  return (
    <div className="cta-pricing-banner" style={{
      position: "relative", overflow: "hidden", borderRadius: 28, padding: "72px 64px",
      background: "linear-gradient(135deg, #0A0A14 0%, #1A1538 60%, #2D2070 100%)",
      color: "white", boxShadow: "0 40px 80px -30px rgba(40,30,120,0.4)",
    }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 80% 20%, color-mix(in oklab, var(--accent-2) 60%, transparent), transparent 50%), radial-gradient(circle at 10% 90%, color-mix(in oklab, var(--accent) 50%, transparent), transparent 50%)", opacity: 0.6 }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "48px 48px", maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)" }} />
      <div style={{ position: "relative", maxWidth: 720 }}>
        <div className="eyebrow" style={{ background: "rgba(255,255,255,0.1)", color: "white", borderColor: "rgba(255,255,255,0.2)", display: "inline-flex" }}>
          <span className="dot" style={{ background: "white", boxShadow: "0 0 0 4px rgba(255,255,255,0.2)" }} />
          Free 14-day trial — no card required
        </div>
        <h2 className="h1" style={{ color: "white", marginTop: 18, fontSize: "clamp(36px, 5vw, 64px)" }}>
          Start growing your Google reviews{" "}
          <em style={{ background: "linear-gradient(110deg, #C8C1FF, #8FC2FF)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>today.</em>
        </h2>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", marginTop: 18, maxWidth: 540, lineHeight: 1.55 }}>
          Set up one QR code, start collecting authentic reviews tonight. Cancel anytime.
        </p>
        <div className="cta-btns" style={{ display: "flex", marginTop: 28, gap: 12 }}>
          <Link href="/signup" className="btn btn-lg" style={{ background: "white", color: "#0A0A14", borderColor: "white" }}>
            Start free trial <ArrowIcon />
          </Link>
          <Link href="/contact" className="btn btn-lg" style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}>
            Book a demo
          </Link>
        </div>
      </div>
    </div>
  );
}
