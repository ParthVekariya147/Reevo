import Link from "next/link";

export default function CTASection() {
  return (
    <section className="section" style={{ paddingBottom: 0 }}>
      <div className="container">
        <div className="cta-card-inner" style={{ position: "relative", overflow: "hidden", borderRadius: 28, padding: "80px 64px", background: "linear-gradient(135deg, #0A0A14 0%, #1A1538 60%, #2D2070 100%)", color: "white", boxShadow: "0 40px 80px -30px rgba(40,30,120,0.4)", textAlign: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 80% 20%, color-mix(in oklab, var(--accent-2) 60%, transparent), transparent 50%), radial-gradient(circle at 10% 90%, color-mix(in oklab, var(--accent) 50%, transparent), transparent 50%)", opacity: 0.6 }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "48px 48px", maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)", WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)" }} />
          <div style={{ position: "relative", maxWidth: 680, margin: "0 auto" }}>
            <h2 className="h1" style={{ color: "white", fontSize: "clamp(32px, 5vw, 60px)" }}>
              Your next 5-star review is{" "}
              <em style={{ background: "linear-gradient(110deg, #C8C1FF, #8FC2FF)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                one scan away.
              </em>
            </h2>
            <div style={{ marginTop: 36 }}>
              <Link href="/signup" className="btn btn-lg" style={{ background: "white", color: "#0A0A14", borderColor: "white", fontSize: 16, padding: "16px 28px" }}>
                Start free — no card needed
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) { .cta-card-inner { padding: 48px 24px !important; } }
      `}</style>
    </section>
  );
}
