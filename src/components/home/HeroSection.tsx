import Link from "next/link";

const QRMini = ({ size = 80 }: { size?: number }) => {
  const cells = 17;
  const cs = size / cells;
  const seed = 31337;
  const grid: number[] = [];
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const n = Math.sin((x * 53 + y * 91 + seed * 13) * 0.4321) * 10000;
      grid.push((n - Math.floor(n)) > 0.5 ? 1 : 0);
    }
  }
  const setBlock = (sx: number, sy: number) => {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const onBorder = x === 0 || y === 0 || x === 6 || y === 6;
        const inner = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        grid[(sy + y) * cells + (sx + x)] = onBorder || inner ? 1 : 0;
      }
  };
  setBlock(0, 0); setBlock(cells - 7, 0); setBlock(0, cells - 7);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <rect width={size} height={size} fill="white" rx="6" />
      {grid.map((v, i) => {
        if (!v) return null;
        const x = (i % cells) * cs;
        const y = Math.floor(i / cells) * cs;
        return <rect key={i} x={x} y={y} width={cs * 1.05} height={cs * 1.05} fill="#0A0A14" rx={cs * 0.15} />;
      })}
      <rect x={size / 2 - 9} y={size / 2 - 9} width={18} height={18} fill="white" rx="4" />
      <rect x={size / 2 - 6} y={size / 2 - 6} width={12} height={12} rx="3" fill="url(#hqrg)" />
      <defs>
        <linearGradient id="hqrg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
    </svg>
  );
};

function MobileFunnelMini() {
  return (
    <div className="phone">
      <div className="phone-screen">
        <div style={{ height: 38, display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 22px 4px", fontSize: 12, fontWeight: 600, color: "#111" }}>
          <span>9:41</span>
        </div>
        <div style={{ flex: 1, padding: "8px 18px 18px", display: "flex", flexDirection: "column", color: "#111" }}>
          <div className="between" style={{ marginBottom: 16 }}>
            <div className="row" style={{ gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Maison Café</span>
            </div>
            <span style={{ fontSize: 11, color: "#9aa", fontFamily: "var(--font-mono)" }}>via reevo</span>
          </div>
          <div className="fade-up" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center", gap: 18 }}>
            <div>
              <h3 style={{ fontSize: 20, margin: 0, color: "#111", letterSpacing: "-0.02em", lineHeight: 1.2 }}>How was your visit?</h3>
              <p style={{ fontSize: 13, color: "#777", margin: "8px 0 0" }}>Tap a star to continue</p>
            </div>
            <div className="row" style={{ justifyContent: "center", gap: 4 }}>
              {[1,2,3,4,5].map(i => (
                <svg key={i} width={32} height={32} viewBox="0 0 24 24" fill="#F5A623" stroke="#F5A623" strokeWidth="1.5" strokeLinejoin="round">
                  <path d="M12 3l2.7 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.4 6.5 20.3l1.1-6.3L3 9.6l6.3-.9z" />
                </svg>
              ))}
            </div>
            <div style={{ padding: 12, background: "linear-gradient(135deg, #f0eeff, #e8f4ff)", borderRadius: 12, border: "1px solid #ddd", textAlign: "left" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--accent-ink)", marginBottom: 4 }}>✨ AI suggestion</div>
              <div style={{ fontSize: 12, color: "#333", lineHeight: 1.5 }}>Absolutely loved my visit! The team was friendly and the croissants were warm…</div>
            </div>
          </div>
          <div style={{ height: 14, display: "flex", justifyContent: "center", alignItems: "center", marginTop: 8 }}>
            <div style={{ width: 100, height: 4, background: "#111", borderRadius: 999, opacity: 0.85 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="section" style={{ paddingTop: 80, paddingBottom: 100, position: "relative", overflow: "hidden" }}>
      <div className="bg-gradients" />
      <div className="grid-bg" />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }} className="hero-split">
          {/* Left — copy */}
          <div>
            <div className="row" style={{ marginBottom: 24 }}>
              <span className="eyebrow"><span className="dot" />AI-powered · No card needed</span>
            </div>
            <h1 className="h1">
              Turn happy customers into <em>5-star reviews</em> — automatically
            </h1>
            <p className="lead" style={{ marginTop: 22, maxWidth: 520 }}>
              Reevo&apos;s smart QR funnel sends your best experiences to Google, TripAdvisor &amp; more — and quietly catches the unhappy ones before they go public.
            </p>
            <div className="row" style={{ gap: 12, marginTop: 32, flexWrap: "wrap" }}>
              <Link href="/signup" className="btn btn-primary btn-lg">
                Start free
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>
              </Link>
              <a href="#how-it-works" className="btn btn-ghost btn-lg">
                See how it works
              </a>
            </div>
            <div className="row" style={{ marginTop: 20, gap: 6, fontSize: 13, color: "var(--muted)", flexWrap: "wrap" }}>
              {["No card needed", "Free plan forever", "Google compliant"].map((t) => (
                <span key={t} className="row" style={{ gap: 5 }}>
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right — phone + QR */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", paddingTop: 24 }}>
            <MobileFunnelMini />

            {/* QR badge */}
            <div style={{
              position: "absolute",
              bottom: -20,
              right: 0,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "14px 16px",
              boxShadow: "var(--shadow-lg)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}>
              <div style={{ padding: 8, background: "white", border: "1px solid var(--border)", borderRadius: 10 }}>
                <QRMini size={72} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>YOUR QR CODE</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 3 }}>Maison Café</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>reevo.io/r/xxxx</div>
              </div>
            </div>

            {/* Floating review notification */}
            <div className="floater" style={{ position: "absolute", top: 0, left: -24, fontSize: 13 }}>
              <div className="stars">
                {[1,2,3,4,5].map(i => (
                  <svg key={i} width={13} height={13} viewBox="0 0 24 24" fill="#F5A623" stroke="#F5A623" strokeWidth="1.5" strokeLinejoin="round">
                    <path d="M12 3l2.7 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.4 6.5 20.3l1.1-6.3L3 9.6l6.3-.9z" />
                  </svg>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500 }}>New review posted</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Priya N. · 2s ago</div>
              </div>
              <span className="chip green" style={{ fontSize: 10 }}>5★</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .hero-split {
            grid-template-columns: 1fr !important;
            gap: 56px !important;
          }
          .hero-split > div:last-child {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
        }
      `}</style>
    </section>
  );
}
