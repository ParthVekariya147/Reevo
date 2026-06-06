
const AreaChart = ({ data }: { data: { x: string; v: number }[] }) => {
  const w = 780, h = 220, p = { l: 36, r: 16, t: 16, b: 28 };
  const innerW = w - p.l - p.r, innerH = h - p.t - p.b;
  const max = Math.max(...data.map((d) => d.v));
  const xs = (i: number) => p.l + (i / (data.length - 1)) * innerW;
  const ys = (v: number) => p.t + innerH - (v / (max || 1)) * innerH;
  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(d.v).toFixed(1)}`).join(" ");
  const areaPath = linePath + ` L ${xs(data.length - 1)},${h - p.b} L ${xs(0)},${h - p.b} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0" /></linearGradient>
        <linearGradient id="ag2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--accent)" /><stop offset="1" stopColor="var(--accent-2)" /></linearGradient>
      </defs>
      {Array.from({ length: 5 }).map((_, i) => {
        const y = p.t + (i / 4) * innerH;
        return <line key={i} x1={p.l} y1={y} x2={w - p.r} y2={y} stroke="var(--border)" strokeWidth="1" strokeDasharray={i === 4 ? "" : "2 4"} />;
      })}
      <path d={areaPath} fill="url(#ag1)" />
      <path d={linePath} fill="none" stroke="url(#ag2)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const Donut = ({ data, size = 160, thickness = 22 }: { data: { v: number; color: string }[]; size?: number; thickness?: number }) => {
  const total = data.reduce((a, d) => a + d.v, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth={thickness} fill="none" />
      {data.map((d, i) => {
        const len = (d.v / total) * c;
        const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} stroke={d.color} strokeWidth={thickness} fill="none" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} strokeLinecap="butt" />;
        offset += len;
        return el;
      })}
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontSize="22" fontWeight="600" fill="var(--ink)" letterSpacing="-0.02em">{total}</text>
      <text x={size / 2} y={size / 2 + 16} textAnchor="middle" fontSize="11" fill="var(--muted)" fontFamily="var(--font-mono)" letterSpacing="0.05em">TOTAL</text>
    </svg>
  );
};

const BarChart = ({ data }: { data: { x: string; v: number }[] }) => {
  const w = 420, h = 150, p = { l: 28, r: 12, t: 12, b: 28 };
  const innerW = w - p.l - p.r, innerH = h - p.t - p.b;
  const max = Math.max(...data.map((d) => d.v));
  const barW = (innerW / data.length) * 0.6;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity="0.95" /><stop offset="1" stopColor="var(--accent)" stopOpacity="0.6" /></linearGradient></defs>
      {data.map((d, i) => {
        const x = p.l + (i / data.length) * innerW + (innerW / data.length - barW) / 2;
        const bh = (d.v / max) * innerH;
        const y = p.t + innerH - bh;
        return <rect key={i} x={x} y={y} width={barW} height={bh} rx="3" fill="url(#bg1)" />;
      })}
    </svg>
  );
};

const HEATMAP_HOURS = 12;
const HEATMAP_CELLS = (() => {
  const arr: number[] = [];
  for (let d = 0; d < 7; d++)
    for (let h = 0; h < HEATMAP_HOURS; h++) {
      const peak = Math.exp(-Math.pow((h - 8) / 3, 2)) * (d < 5 ? 1 : 0.7);
      arr.push(peak + 0.1);
    }
  return arr;
})();

const Heatmap = () => {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${HEATMAP_HOURS}, 1fr)`, gap: 3 }}>
      {HEATMAP_CELLS.map((v, i) => (
        <div key={i} style={{ aspectRatio: "1 / 1", background: `color-mix(in oklab, var(--accent) ${(v * 70).toFixed(0)}%, var(--surface-2))`, borderRadius: 3 }} />
      ))}
    </div>
  );
};

const AREA_DATA = Array.from({ length: 20 }).map((_, i) => ({
  x: i % 4 === 0 ? `D${i + 1}` : "",
  v: Math.round(40 + Math.sin(i * 0.4) * 18 + i * 2.4 + 4),
}));

const BAR_DATA = Array.from({ length: 8 }, (_, i) => ({
  x: `D${i + 1}`,
  v: 12 + 12 + i * 3,
}));

export default function AnalyticsShowcase() {
  return (
    <section className="section" style={{ background: "var(--bg-soft)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
      <div className="container">
        <div style={{ textAlign: "center", maxWidth: 660, margin: "0 auto 56px" }}>
          <span className="eyebrow"><span className="dot" /> Analytics</span>
          <h2 className="h2" style={{ marginTop: 18 }}>Conversion analytics built for review velocity.</h2>
          <p className="lead" style={{ margin: "16px auto 0" }}>
            Track every QR scan, every rating, every redirect. See where customers drop off and where your best reviews come from.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }} className="an-grid">
          <div className="card" style={{ padding: 28 }}>
            <div className="between" style={{ marginBottom: 18 }}>
              <div>
                <div className="kicker">FUNNEL CONVERSION RATE</div>
                <h4 style={{ margin: "4px 0 0", fontSize: 22, letterSpacing: "-0.01em" }}>Live across 6 locations</h4>
              </div>
              <span className="chip green">+24.6% WoW</span>
            </div>
            <AreaChart data={AREA_DATA} />
          </div>

          <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column" }}>
            <div className="kicker">DEVICE MIX</div>
            <h4 style={{ margin: "4px 0 16px", fontSize: 18 }}>Where reviews come from</h4>
            <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 16px" }}>
              <Donut data={[{ v: 612, color: "var(--accent)" }, { v: 198, color: "var(--accent-2)" }, { v: 88, color: "#C9C5F4" }]} />
            </div>
            <div className="col" style={{ gap: 8 }}>
              {[
                { color: "var(--accent)", label: "iOS", v: "68%", delta: "+4%" },
                { color: "var(--accent-2)", label: "Android", v: "22%", delta: "+1%" },
                { color: "#C9C5F4", label: "Desktop", v: "10%", delta: "-2%" },
              ].map((r) => (
                <div key={r.label} className="between" style={{ fontSize: 13 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 3, background: r.color }} />
                    <span style={{ color: "var(--ink-2)" }}>{r.label}</span>
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <span className="mono" style={{ color: "var(--muted)" }}>{r.v}</span>
                    <span style={{ color: r.delta.startsWith("-") ? "#B42A1B" : "#117047", fontSize: 11 }}>{r.delta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }} className="an-grid-2">
          <div className="card" style={{ padding: 24 }}>
            <div className="kicker">QR SCAN TRENDS</div>
            <h4 style={{ margin: "4px 0 12px", fontSize: 16 }}>Hour-of-day heatmap</h4>
            <Heatmap />
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div className="kicker">COUNTRIES</div>
            <h4 style={{ margin: "4px 0 12px", fontSize: 16 }}>Top regions today</h4>
            <div className="col" style={{ gap: 10 }}>
              {[
                { c: "United States", v: 48, flag: "🇺🇸" },
                { c: "India", v: 18, flag: "🇮🇳" },
                { c: "United Kingdom", v: 12, flag: "🇬🇧" },
                { c: "Germany", v: 9, flag: "🇩🇪" },
                { c: "Australia", v: 7, flag: "🇦🇺" },
              ].map((r) => (
                <div key={r.c} className="row" style={{ gap: 10 }}>
                  <span style={{ fontSize: 16, width: 22 }}>{r.flag}</span>
                  <span style={{ fontSize: 13, color: "var(--ink-2)", width: 140 }}>{r.c}</span>
                  <div style={{ flex: 1, height: 6, background: "var(--surface-2)", borderRadius: 4 }}>
                    <div style={{ width: `${r.v * 2}%`, height: "100%", background: "linear-gradient(90deg, var(--accent), var(--accent-2))", borderRadius: 4 }} />
                  </div>
                  <span className="mono" style={{ fontSize: 12, color: "var(--muted)", width: 32, textAlign: "right" }}>{r.v}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <div className="kicker">REVIEW VELOCITY</div>
            <h4 style={{ margin: "4px 0 12px", fontSize: 16 }}>Reviews per day</h4>
            <BarChart data={BAR_DATA} />
          </div>
        </div>

        <style>{`
          @media (max-width: 1000px) {
            .an-grid { grid-template-columns: 1fr !important; }
            .an-grid-2 { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </section>
  );
}
