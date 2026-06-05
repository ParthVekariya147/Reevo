import Link from "next/link";

const AUDIENCE_CHIPS = ["Cafés", "Restaurants", "Salons", "Clinics", "Retail", "Service providers"];

const SETUP_STEPS = [
  { icon: "⚡", text: "Sign up free — no card" },
  { icon: "🎨", text: "Brand your funnel in minutes" },
  { icon: "🖨️", text: "Print one QR, place it anywhere" },
  { icon: "⭐", text: "Watch reviews roll in" },
];

export default function IndustriesStrip() {
  return (
    <section className="section">
      <div className="container">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }} className="ind-split">
          {/* Left — copy */}
          <div>
            <span className="eyebrow"><span className="dot" /> Built for you</span>
            <h2 className="h2" style={{ marginTop: 18 }}>Made for the place around the corner.</h2>
            <p className="lead" style={{ marginTop: 18 }}>
              Cafes, salons, clinics, shops — if you serve people, Reevo helps you get found. Set up in minutes, no tech skills needed.
            </p>
            <p style={{ fontSize: 15, color: "var(--muted)", marginTop: 14, lineHeight: 1.65 }}>
              Print one QR, put it on the table or counter or receipt — done. Your customers do the rest.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 28 }}>
              {AUDIENCE_CHIPS.map((chip) => (
                <span key={chip} className="chip" style={{ fontSize: 13, padding: "6px 14px" }}>
                  {chip}
                </span>
              ))}
            </div>
            <div style={{ marginTop: 32 }}>
              <Link href="/signup" className="btn btn-primary">
                Start free — no card needed
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>

          {/* Right — setup steps visual */}
          <div>
            <div className="card" style={{ padding: 32, background: "linear-gradient(180deg, var(--surface), var(--bg-tint))", borderRadius: 24, boxShadow: "var(--shadow-lg)" }}>
              <div style={{ fontSize: 13, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em", marginBottom: 20 }}>
                HOW EASY IS SETUP?
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {SETUP_STEPS.map((step, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "14px 18px",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    boxShadow: "var(--shadow-xs)",
                  }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{step.icon}</span>
                    <span style={{ fontSize: 15, color: "var(--ink-2)", fontWeight: 500 }}>{step.text}</span>
                    <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 20,
                padding: "14px 18px",
                background: "linear-gradient(135deg, color-mix(in oklab, var(--accent) 10%, transparent), color-mix(in oklab, var(--accent-2) 10%, transparent))",
                borderRadius: 12,
                border: "1px solid color-mix(in oklab, var(--accent) 22%, transparent)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <span style={{ fontSize: 14, color: "var(--accent-ink)", fontWeight: 500 }}>Average setup time: <strong>under 3 minutes</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .ind-split { grid-template-columns: 1fr !important; gap: 48px !important; } }`}</style>
    </section>
  );
}
