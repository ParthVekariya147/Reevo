import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Features",
  description: "One platform for every part of your review pipeline — QR funnels, AI suggestions, analytics, campaign management, and custom branding.",
  alternates: { canonical: "/features" },
};

const CheckIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const XIcon = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const ArrowIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="M13 5l7 7-7 7" />
  </svg>
);

/* ── QR locations visual ── */
function QRVisual() {
  const locations = [
    { name: "Maison HQ", slug: "maison-hq", active: true },
    { name: "Maison East", slug: "maison-east" },
    { name: "Maison Online", slug: "maison-online" },
    { name: "Maison Pop-up", slug: "maison-pop-up", paused: true },
  ];
  return (
    <div className="card" style={{ padding: 32, background: "var(--surface)", borderRadius: 24, boxShadow: "var(--shadow-md)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {locations.map((loc) => (
          <div key={loc.name} style={{ padding: 14, border: "1px solid var(--border)", borderRadius: 14, textAlign: "center", background: "var(--bg-soft)" }}>
            {/* QR code SVG placeholder */}
            <svg width={88} height={88} viewBox="0 0 88 88" style={{ display: "block", margin: "0 auto" }}>
              <rect width="88" height="88" fill="var(--surface)" rx="8" />
              {/* finder patterns */}
              <rect x="6" y="6" width="24" height="24" rx="3" fill="var(--ink)" />
              <rect x="9" y="9" width="18" height="18" rx="2" fill="var(--surface)" />
              <rect x="12" y="12" width="12" height="12" rx="1" fill="var(--ink)" />
              <rect x="58" y="6" width="24" height="24" rx="3" fill="var(--ink)" />
              <rect x="61" y="9" width="18" height="18" rx="2" fill="var(--surface)" />
              <rect x="64" y="12" width="12" height="12" rx="1" fill="var(--ink)" />
              <rect x="6" y="58" width="24" height="24" rx="3" fill="var(--ink)" />
              <rect x="9" y="61" width="18" height="18" rx="2" fill="var(--surface)" />
              <rect x="12" y="64" width="12" height="12" rx="1" fill="var(--ink)" />
              {/* data modules */}
              {[36, 42, 48, 54].map((x) => [36, 42, 48, 54, 60, 66].map((y) => (
                (x + y) % 8 === 0 ? <rect key={`${x}-${y}`} x={x} y={y} width="5" height="5" rx="1" fill="var(--ink)" /> : null
              )))}
            </svg>
            <div style={{ marginTop: 8, fontSize: 12, fontWeight: 500 }}>{loc.name}</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--muted)" }}>r.evo/{loc.slug}</div>
            {loc.active && <span className="chip green" style={{ fontSize: 10, marginTop: 6, display: "inline-block" }}>ACTIVE</span>}
            {loc.paused && <span className="chip" style={{ fontSize: 10, marginTop: 6, display: "inline-block" }}>PAUSED</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── AI suggestion visual ── */
function AIVisual() {
  const suggestions = [
    "Absolutely loved my visit! The team was warm and the croissants were unreal. Will be back this weekend with friends.",
    "Best café in the neighborhood — staff knew my order by the third visit. Cozy, fast, and the coffee is genuinely great.",
    "Stumbled in for a quick latte and stayed an hour. Beautiful little spot with friendly people and excellent food.",
  ];
  return (
    <div className="card" style={{ padding: 24, background: "var(--surface)", borderRadius: 24, boxShadow: "var(--shadow-md)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, var(--accent), var(--accent-2))", color: "white", display: "grid", placeItems: "center" }}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/>
              <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/>
            </svg>
          </div>
          <strong style={{ fontSize: 14 }}>Reevo AI · 5★ suggestion</strong>
        </div>
        <span className="chip accent">Friendly</span>
      </div>
      {suggestions.map((s, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start",
          padding: 12,
          background: i === 0 ? "var(--accent-soft)" : "var(--bg-soft)",
          border: i === 0 ? "1px solid color-mix(in oklab, var(--accent) 30%, transparent)" : "1px solid var(--border)",
          borderRadius: 10, marginTop: i === 0 ? 0 : 8, gap: 10, fontSize: 13, lineHeight: 1.5, color: "var(--ink-2)",
        }}>
          <span style={{ flexShrink: 0, width: 18, height: 18, borderRadius: "50%", background: i === 0 ? "var(--accent)" : "var(--surface-2)", color: i === 0 ? "white" : "var(--muted)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600 }}>
            {i + 1}
          </span>
          <span>{s}</span>
        </div>
      ))}
      <div style={{ display: "flex", marginTop: 14, gap: 8 }}>
        <button className="btn btn-sm btn-accent">Use suggestion 1</button>
        <button className="btn btn-sm btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/></svg>
          Regenerate
        </button>
      </div>
    </div>
  );
}

/* ── Funnel chart visual ── */
function FunnelVisual() {
  const steps = [
    { label: "QR scans", v: 8421 },
    { label: "Rating selected", v: 6308 },
    { label: "AI review copied", v: 4912 },
    { label: "Redirected to Google", v: 3014 },
    { label: "Posted on Google", v: 1842 },
  ];
  const max = steps[0].v;
  return (
    <div className="card" style={{ padding: 24, boxShadow: "var(--shadow-md)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <strong style={{ fontSize: 14 }}>Last 14 days</strong>
        <span className="chip accent">49.0% conv. rate</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((step, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
              <span style={{ color: "var(--ink-2)" }}>{step.label}</span>
              <span className="mono" style={{ color: "var(--muted)", fontSize: 12 }}>{step.v.toLocaleString()}</span>
            </div>
            <div style={{ height: 8, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 999,
                width: `${(step.v / max) * 100}%`,
                background: `linear-gradient(90deg, var(--accent), var(--accent-2))`,
                opacity: 1 - i * 0.12,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Campaign table visual ── */
function CampaignVisual() {
  const campaigns = [
    { name: "Autumn 2026", status: "live", scans: 8421, reviews: 1842, statusClass: "chip green" },
    { name: "Weekend brunch", status: "live", scans: 2103, reviews: 412, statusClass: "chip green" },
    { name: "Loyalty card", status: "scheduled", scans: 0, reviews: 0, statusClass: "chip" },
    { name: "Summer pop-up", status: "ended", scans: 5681, reviews: 1124, statusClass: "chip" },
  ];
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", boxShadow: "var(--shadow-md)" }}>
      <table className="table">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Status</th>
            <th>Scans</th>
            <th>Reviews</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.name}>
              <td><strong style={{ fontSize: 13 }}>{c.name}</strong></td>
              <td><span className={c.statusClass}>{c.status}</span></td>
              <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{c.scans.toLocaleString()}</td>
              <td className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>{c.reviews.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Branding visual ── */
function BrandingVisual() {
  return (
    <div className="card" style={{ padding: 0, boxShadow: "var(--shadow-md)", overflow: "hidden" }}>
      <div style={{ background: "linear-gradient(135deg, #18203F, #2E1F66)", padding: 32, textAlign: "center", color: "white" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 16px", background: "rgba(255,255,255,0.08)", borderRadius: 999, fontSize: 13, marginBottom: 16 }}>
          <span style={{ fontWeight: 600 }}>maison.com</span>
          <span style={{ opacity: 0.6 }}>/ reviews</span>
        </div>
        <div style={{ fontSize: 36, letterSpacing: "-0.01em", fontWeight: 600 }}>Maison Café</div>
        <p style={{ opacity: 0.7, fontSize: 14, marginTop: 4 }}>How was your visit today?</p>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 14, gap: 4 }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <svg key={s} width={28} height={28} viewBox="0 0 24 24" fill="#F5A623" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ))}
        </div>
      </div>
      <div style={{ padding: 16, background: "var(--surface)" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["#18203F", "#2E1F66", "#F4A861", "#FFFFFF"].map((c) => (
            <div key={c} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", border: "1px solid var(--border)", borderRadius: 999, fontSize: 11 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: c, border: c === "#FFFFFF" ? "1px solid var(--border)" : "none" }} />
              <span className="mono">{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Deep dive section ── */
function Deep({ flip, eyebrow, title, body, bullets, visual }: {
  flip?: boolean;
  eyebrow: string;
  title: string;
  body: string;
  bullets: { title: string; body: string }[];
  visual: React.ReactNode;
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
      gap: 80,
      alignItems: "center",
      direction: flip ? "rtl" : "ltr",
    }} className="deep-grid">
      <div style={{ direction: "ltr", minWidth: 0 }}>
        <span className="eyebrow"><span className="dot" /> {eyebrow}</span>
        <h2 className="h2" style={{ marginTop: 18, fontSize: "clamp(28px, 3.2vw, 40px)" }}>{title}</h2>
        <p className="lead" style={{ marginTop: 18, fontSize: 17 }}>{body}</p>
        <ul style={{ listStyle: "none", padding: 0, margin: "28px 0 0", display: "flex", flexDirection: "column", gap: 12 }}>
          {bullets.map((b) => (
            <li key={b.title} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ width: 22, height: 22, borderRadius: 999, background: "color-mix(in oklab, var(--accent) 14%, transparent)", color: "var(--accent)", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 2 }}>
                <CheckIcon />
              </span>
              <div>
                <strong style={{ fontSize: 15, color: "var(--ink)" }}>{b.title}</strong>
                <p style={{ margin: "2px 0 0", fontSize: 14, color: "var(--muted)", lineHeight: 1.55 }}>{b.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ direction: "ltr", minWidth: 0, overflowX: "auto" }}>{visual}</div>
    </div>
  );
}

/* ── Comparison table cell ── */
function CompCell({ v, accent }: { v: boolean | string; accent?: boolean }) {
  if (v === true) return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: 999, background: accent ? "color-mix(in oklab, var(--accent) 18%, transparent)" : "var(--surface-2)", color: accent ? "var(--accent)" : "var(--muted)" }}>
      <CheckIcon />
    </span>
  );
  if (v === false) return <span style={{ color: "var(--muted-2)" }}><XIcon /></span>;
  if (v === "partial") return <span className="chip" style={{ fontSize: 11 }}>Partial</span>;
  return <span style={{ fontWeight: 500, color: accent ? "var(--accent)" : "var(--ink-2)", fontSize: 13 }}>{v}</span>;
}

const COMPARISON_ROWS: [string, boolean | string, boolean | string, boolean | string][] = [
  ["AI-drafted review suggestions", true, false, false],
  ["Mobile-first funnel UX", true, false, false],
  ["Dynamic QR routing", true, "partial", false],
  ["Real-time funnel analytics", true, false, "partial"],
  ["Google redirect attribution", true, false, false],
  ["Multi-location dashboard", true, false, true],
  ["Custom branding & domain", true, "partial", true],
  ["Average conversion rate", "49%", "8%", "12%"],
];

export default function FeaturesPage() {
  return (
    <>
      <Navbar />
      <main style={{ flexGrow: 1 }}>
        {/* Hero */}
        <section className="section" style={{ paddingTop: 80, paddingBottom: 64, position: "relative", overflow: "hidden" }}>
          <div className="bg-gradients" />
          <div className="container" style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 820 }}>
            <span className="eyebrow"><span className="dot" /> Platform</span>
            <h1 className="h1" style={{ marginTop: 18 }}>
              One platform for every part of <em>your review pipeline.</em>
            </h1>
            <p className="lead" style={{ margin: "22px auto 0", textAlign: "center" }}>
              From the QR a customer scans to the dashboard your CFO loves — Reevo is the only tool you need to turn visits into authentic Google reviews.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
              <Link href="/signup" className="btn btn-accent btn-lg">
                Start free trial <ArrowIcon />
              </Link>
              <Link href="/contact" className="btn btn-ghost btn-lg">Talk to sales</Link>
            </div>
          </div>
        </section>

        {/* Deep dives */}
        <section className="section" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
          <div className="container" style={{ display: "flex", flexDirection: "column", gap: 120 }}>
            <Deep
              eyebrow="QR funnels"
              title="QR codes that adapt to your campaign."
              body="Static QRs print once and live forever. Dynamic QRs route to different funnels by hour, location, language, or campaign — without reprinting."
              bullets={[
                { title: "Dynamic destination", body: "Change where a QR points without changing the printed code." },
                { title: "Per-location codes", body: "Generate, label, and download QR kits for every venue." },
                { title: "Smart routing rules", body: "Hour-of-day, weekday, language, or A/B test variants." },
              ]}
              visual={<QRVisual />}
            />
            <Deep
              flip
              eyebrow="AI suggestions"
              title="GPT-4 powered review suggestions, tuned to your brand."
              body="Every customer sees three review drafts matched to their rating and your business voice. They edit, choose, or write their own — you're never the author."
              bullets={[
                { title: "Tone controls", body: "Pick from Casual, Professional, Warm, Witty — or train a custom voice." },
                { title: "Rating-aware drafts", body: "5★ feels different from 3★. Suggestions reflect that." },
                { title: "Multilingual", body: "Auto-detects language from device locale. 24 languages supported." },
              ]}
              visual={<AIVisual />}
            />
            <Deep
              eyebrow="Funnel analytics"
              title="See every step. Find every leak."
              body="Reevo tracks the entire journey — scan, rating, AI generation, copy, redirect, posted review — and rolls it up into one funnel."
              bullets={[
                { title: "End-to-end attribution", body: "Tie every Google review back to the campaign that produced it." },
                { title: "Cohort comparisons", body: "Compare locations, weekdays, or marketing pushes side by side." },
                { title: "Real-time dashboards", body: "No nightly batches — events stream in under 2 seconds." },
              ]}
              visual={<FunnelVisual />}
            />
            <Deep
              flip
              eyebrow="Campaign management"
              title="Run dozens of campaigns from one console."
              body="Spin up campaigns for a new location, a seasonal push, or an A/B test. Pause, clone, and archive without touching code."
              bullets={[
                { title: "Multi-campaign workspace", body: "Group campaigns by location, brand, or marketing push." },
                { title: "Scheduling", body: "Schedule starts, ends, and rule changes. Set it and forget it." },
                { title: "Approval workflow", body: "Drafts → review → publish. Optional approvers for franchises." },
              ]}
              visual={<CampaignVisual />}
            />
            <Deep
              eyebrow="Branding"
              title="Looks and feels like your brand, not ours."
              body="Custom logo, colors, fonts, and even a domain (reviews.yourbiz.com). Reevo runs in the background — your customers see you."
              bullets={[
                { title: "Custom domain", body: "Funnels live on your subdomain with full SSL." },
                { title: "Brand kit", body: "Upload logo + brand colors once, every funnel inherits." },
                { title: "Tone of voice", body: "Train the AI on your past reviews or website copy." },
              ]}
              visual={<BrandingVisual />}
            />
          </div>
        </section>

        {/* Comparison table */}
        <section className="section">
          <div className="container">
            <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto 48px" }}>
              <span className="eyebrow"><span className="dot" /> Why Reevo</span>
              <h2 className="h2" style={{ marginTop: 18 }}>Built for review velocity, not generic feedback.</h2>
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table className="table" style={{ minWidth: 560 }}>
                <thead>
                  <tr>
                    <th></th>
                    <th style={{ color: "var(--accent)", fontWeight: 600 }}>Reevo</th>
                    <th>Generic QR tools</th>
                    <th>Review request emails</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map(([label, a, b, c]) => (
                    <tr key={label}>
                      <td><strong style={{ fontSize: 13 }}>{label}</strong></td>
                      <td><CompCell v={a} accent /></td>
                      <td><CompCell v={b} /></td>
                      <td><CompCell v={c} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
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
        @media (max-width: 1000px) { .deep-grid { grid-template-columns: 1fr !important; gap: 48px !important; direction: ltr !important; } }
        @media (max-width: 640px) { .features-cta-banner { padding: 44px 24px !important; border-radius: 20px !important; } }
      `}</style>
    </>
  );
}

function CTABanner() {
  return (
    <div className="features-cta-banner" style={{
      position: "relative", overflow: "hidden", borderRadius: 28, padding: "72px 64px",
      background: "linear-gradient(135deg, #0A0A14 0%, #1A1538 60%, #2D2070 100%)",
      color: "white",
      boxShadow: "0 40px 80px -30px rgba(40,30,120,0.4)",
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
          Print one QR code, start collecting authentic reviews tonight. Cancel anytime.
        </p>
        <div style={{ display: "flex", marginTop: 28, gap: 12, flexWrap: "wrap" }}>
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
