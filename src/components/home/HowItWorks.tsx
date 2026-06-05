const StepIcon = ({ name }: { name: string }) => {
  const paths: Record<string, React.ReactNode> = {
    qr: <><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M3 14h7v7H3z"/><path d="M14 14h3"/><path d="M14 17v4"/><path d="M17 17h4v4"/></>,
    sparkles: <><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/></>,
    route: <><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M12 19h4.5a3.5 3.5 0 000-7h-8a3.5 3.5 0 010-7H12"/></>,
  };
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

const STEPS = [
  {
    num: "01",
    icon: "qr",
    title: "Scan",
    body: "Customer scans your QR, lands on your branded funnel. No app, no login.",
  },
  {
    num: "02",
    icon: "sparkles",
    title: "AI writes it",
    body: "One tap and GPT drafts the review in their own words, matching their rating.",
  },
  {
    num: "03",
    icon: "route",
    title: "Smart routing",
    body: "4★+ goes public to Google & co. Below that → private feedback straight to you.",
  },
];

export default function HowItWorks() {
  return (
    <section className="section" id="how-it-works" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 56px" }}>
          <span className="eyebrow"><span className="dot" /> How it works</span>
          <h2 className="h2" style={{ marginTop: 18 }}>From scan to review in 3 taps.</h2>
          <p className="lead" style={{ margin: "16px auto 0" }}>
            A three-step funnel that meets customers where they are: on their phone, at the perfect moment.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }} className="hiw-grid">
          {STEPS.map((step, i) => (
            <div key={i} className="card" style={{
              padding: 32,
              position: "relative",
              overflow: "hidden",
              background: "var(--surface)",
            }}>
              <div style={{
                position: "absolute",
                top: 16,
                right: 20,
                fontSize: 64,
                fontWeight: 700,
                color: "color-mix(in oklab, var(--accent) 6%, transparent)",
                letterSpacing: "-0.04em",
                lineHeight: 1,
                fontFamily: "var(--font-mono)",
                userSelect: "none",
              }}>
                {step.num}
              </div>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "linear-gradient(135deg, color-mix(in oklab, var(--accent) 18%, transparent), color-mix(in oklab, var(--accent-2) 18%, transparent))",
                color: "var(--accent)",
                display: "grid",
                placeItems: "center",
                marginBottom: 20,
                border: "1px solid color-mix(in oklab, var(--accent) 22%, transparent)",
              }}>
                <StepIcon name={step.icon} />
              </div>
              <h3 style={{ margin: "0 0 10px", fontSize: 22, letterSpacing: "-0.015em" }}>{step.title}</h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 15, lineHeight: 1.6 }}>{step.body}</p>

              {i < STEPS.length - 1 && (
                <div className="hiw-arrow" style={{
                  position: "absolute",
                  right: -20,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 40,
                  height: 40,
                  background: "var(--bg-soft)",
                  border: "1px solid var(--border)",
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  zIndex: 1,
                  color: "var(--muted)",
                }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/><path d="M13 5l7 7-7 7"/>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 800px) { .hiw-grid { grid-template-columns: 1fr !important; } .hiw-arrow { display: none !important; } }
      `}</style>
    </section>
  );
}
