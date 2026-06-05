const FeatureIcon = ({ name }: { name: string }) => {
  const paths: Record<string, React.ReactNode> = {
    funnel:   <path d="M3 5h18l-7 8v6l-4-2v-4z"/>,
    sparkles: <><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z"/></>,
    qr:       <><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M3 14h7v7H3z"/><path d="M14 14h3"/><path d="M14 17v4"/><path d="M17 17h4v4"/></>,
    ab:       <><path d="M3 3h7v18H3z"/><path d="M14 3h7v18h-7z"/><path d="M10 12h4"/></>,
    palette:  <><path d="M12 3a9 9 0 100 18c1 0 2-1 2-2s-1-1-1-2 1-2 2-2h2a4 4 0 004-4c0-4-4-8-9-8z"/><circle cx="7.5" cy="10.5" r="1.5"/><circle cx="12" cy="7.5" r="1.5"/><circle cx="16.5" cy="10.5" r="1.5"/></>,
    chart:    <><path d="M3 3v18h18"/><path d="M7 14l3-4 4 3 6-7"/></>,
    reply:    <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M8 10h8"/><path d="M8 14h5"/></>,
    lock:     <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
  };
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

const FEATURES = [
  { icon: "funnel",   title: "Smart funnel",             body: "Rating-threshold routing, automatic. Happy customers go public; unhappy ones come to you." },
  { icon: "sparkles", title: "AI review drafts",         body: "GPT-3.5/4 writes the review for the customer — in their voice, from one tap." },
  { icon: "qr",       title: "Unlimited campaigns",      body: "Named campaigns, dynamic QR codes. Change the destination without reprinting." },
  { icon: "ab",       title: "A/B testing",              body: "Test funnel variants side-by-side. Keep what converts, retire what doesn't." },
  { icon: "palette",  title: "Full branding",            body: "4 themes, brand colors, logo, IG handle, custom keywords. Looks like you, not us." },
  { icon: "chart",    title: "Real-time analytics",      body: "Conversion breakdown per step + scan heatmap. Know exactly where customers drop off." },
  { icon: "reply",    title: "AI reply suggestions",     body: "Respond to Google reviews in your tone. Signature, length, and voice — all customizable." },
  { icon: "lock",     title: "Private feedback capture", body: "Low-star customers land in your inbox, not on Google. Fix issues before they go public." },
];

export default function FeaturesGrid() {
  return (
    <section className="section">
      <div className="container">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "end", marginBottom: 48 }} className="fg-head">
          <div>
            <span className="eyebrow"><span className="dot" /> Features</span>
            <h2 className="h2" style={{ marginTop: 18 }}>Everything a local business needs to win reviews.</h2>
          </div>
          <p style={{ color: "var(--muted)", fontSize: 16, lineHeight: 1.6, maxWidth: 460, marginBottom: 8 }}>
            A complete review-conversion platform built for owners who don&apos;t have a marketing team. Eight tools, one dashboard.
          </p>
        </div>

        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div key={i} className="card lift" style={{ padding: 24, height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, color-mix(in oklab, var(--accent) 18%, transparent), color-mix(in oklab, var(--accent-2) 18%, transparent))", color: "var(--accent)", display: "grid", placeItems: "center", marginBottom: 14, border: "1px solid color-mix(in oklab, var(--accent) 22%, transparent)" }}>
                <FeatureIcon name={f.icon} />
              </div>
              <h4 style={{ margin: 0, fontSize: 17, letterSpacing: "-0.01em" }}>{f.title}</h4>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--muted)", lineHeight: 1.55, flex: 1 }}>{f.body}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 48 }}>
          <a href="/features" className="btn btn-ghost">
            See every feature
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M13 5l7 7-7 7"/></svg>
          </a>
        </div>

        <style>{`@media (max-width: 800px) { .fg-head { grid-template-columns: 1fr !important; gap: 16px !important; } }`}</style>
      </div>
    </section>
  );
}
