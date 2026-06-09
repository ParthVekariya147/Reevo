'use client';

import { useEffect } from 'react';

// ── types ─────────────────────────────────────────────────────

export interface FunnelState {
  style?:       string;
  heading?:     string;
  sub?:         string;
  tone?:        string;
  language?:    string;
  threshold?:   number;
  reviewCount?: number;
}

export interface FunnelAppearance {
  font?:    string;
  accent?:  string;
  bgImage?: string | null;
  bgBlur?:  number;
  bgDim?:   number;
}

export interface FunnelBrand {
  name:      string;
  color:     string;
  initials:  string;
  logoUrl?:  string | null;
  tagline?:  string;
}

// ── FunnelMockup — mirrors the real /r/[token] page ──────────

export function FunnelMockup({ brand, step = 'landing', funnel = {}, appearance = {} }: {
  brand:       FunnelBrand;
  step?:       string;
  funnel?:     FunnelState;
  appearance?: FunnelAppearance;
}) {
  const accent   = appearance.accent  ?? brand.color ?? '#1a1a1a';
  const font     = appearance.font    ?? 'DM Sans';
  const bgImage  = appearance.bgImage ?? null;
  const bgBlur   = appearance.bgBlur  ?? 0;
  const bgDim    = appearance.bgDim   ?? 0;

  const logoText    = brand.initials || brand.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || '??';
  const bizName     = brand.name || 'Your Business';
  const sampleReview = `${bizName} is a dream! The atmosphere, service, and quality made for an unforgettable experience. Highly recommend!`;

  useEffect(() => {
    if (font === 'DM Sans') return;
    const id = `gfont-${font.replace(/\s/g, '-')}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@300;400;500;600&display=swap`;
    document.head.appendChild(link);
  }, [font]);

  type SV = { bg: string; fg: string; sub: string; divider: string; card: string; btnBg: string; btnFg: string };
  const styleMap: Record<string, SV> = {
    elegant: { bg: '#FAFAF7',                                              fg: '#0F0F12', sub: '#6B7280',               divider: '#E5E7EB',                card: 'rgba(255,255,255,0.6)',   btnBg: accent, btnFg: '#fff' },
    vivid:   { bg: `linear-gradient(160deg, ${accent} 0%, #8B5CF6 100%)`, fg: '#fff',    sub: 'rgba(255,255,255,0.75)', divider: 'rgba(255,255,255,0.2)',  card: 'rgba(255,255,255,0.15)',  btnBg: '#fff', btnFg: accent },
    minimal: { bg: '#FFFFFF',                                              fg: '#000',    sub: '#6B7280',                divider: '#E5E7EB',                card: 'rgba(255,255,255,0.97)',  btnBg: accent, btnFg: '#fff' },
    playful: { bg: '#FFF6E8',                                              fg: '#3F2E1B', sub: '#92745A',                divider: '#F0DFC0',                card: 'rgba(255,255,255,0.7)',   btnBg: accent, btnFg: '#fff' },
    glass:   { bg: 'rgba(120,120,160,0.25)',                               fg: '#fff',    sub: 'rgba(255,255,255,0.75)', divider: 'rgba(255,255,255,0.2)',  card: 'rgba(255,255,255,0.25)',  btnBg: accent, btnFg: '#fff' },
    dark:    { bg: '#0a0a0a',                                              fg: '#f0ece6', sub: 'rgba(240,236,230,0.6)', divider: 'rgba(255,255,255,0.1)',   card: 'rgba(15,15,15,0.92)',     btnBg: accent, btnFg: '#fff' },
    luxury:  { bg: '#f5f0e8',                                              fg: '#1a1208', sub: '#6b5a3a',               divider: 'rgba(180,150,80,0.25)',   card: 'rgba(250,246,238,0.97)', btnBg: accent, btnFg: '#fff' },
    neon:    { bg: '#050514',                                              fg: '#e0fff0', sub: 'rgba(224,255,240,0.6)', divider: 'rgba(100,255,180,0.25)',  card: 'rgba(5,5,20,0.92)',      btnBg: accent, btnFg: '#000' },
    clay:    { bg: '#f0e8d8',                                              fg: '#3a2a18', sub: '#7a5a3a',               divider: 'rgba(180,140,100,0.2)',   card: 'rgba(245,235,220,0.96)', btnBg: accent, btnFg: '#fff' },
  };
  const sv         = styleMap[funnel.style ?? 'elegant'] ?? styleMap.elegant;
  const fontFamily = font !== 'DM Sans' ? `'${font}', system-ui, sans-serif` : 'system-ui, sans-serif';

  return (
    <div className="lp-funnel" style={{
      background: sv.bg, color: sv.fg, fontFamily, padding: '0',
      position: 'relative', overflow: 'hidden',
      ...(bgImage ? { backgroundImage: `url('${bgImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}),
    }}>
      {bgBlur > 0 && (
        <div style={{ position: 'absolute', inset: 0, backdropFilter: `blur(${bgBlur}px)`, WebkitBackdropFilter: `blur(${bgBlur}px)`, pointerEvents: 'none', zIndex: 1 } as React.CSSProperties} />
      )}
      {bgDim > 0 && (
        <div style={{ position: 'absolute', inset: 0, background: `rgba(0,0,0,${bgDim / 100})`, pointerEvents: 'none', zIndex: 1 }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 20px 0', gap: 6, textAlign: 'center', position: 'relative', zIndex: 2 }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, overflow: 'hidden', flexShrink: 0 }}>
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={bizName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : logoText}
        </div>
        <div style={{ fontWeight: 700, fontSize: 14, color: sv.fg }}>{bizName}</div>
        {brand.tagline && <div style={{ fontSize: 10, color: sv.sub, lineHeight: 1.4, maxWidth: 200 }}>{brand.tagline}</div>}
        <div style={{ width: '100%', height: 1, background: sv.divider, marginTop: 8 }} />
      </div>

      <div className="lp-funnel-body" style={{ position: 'relative', zIndex: 2 }}>

        {step === 'landing' && (
          <>
            <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.25, textAlign: 'center', marginTop: 4, color: sv.fg }}>
              {funnel.heading || 'How was your experience?'}
            </div>
            <div style={{ fontSize: 11, color: sv.sub, textAlign: 'center', lineHeight: 1.5 }}>
              {funnel.sub || 'Your feedback helps us grow. It only takes 30 seconds.'}
            </div>
            <div style={{ marginTop: 'auto', background: sv.btnBg, borderRadius: 10, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: sv.btnFg, fontWeight: 600, fontSize: 13 }}>
              <svg width="14" height="14" viewBox="0 0 18 18" fill="currentColor">
                <path d="M9 1.5l2.09 4.24L16 6.62l-3.5 3.4.83 4.82L9 12.5l-4.33 2.34.83-4.82L2 6.62l4.91-.88L9 1.5z"/>
              </svg>
              Share your feedback
            </div>
          </>
        )}

        {step === 'rate' && (
          <>
            <div style={{ fontWeight: 700, fontSize: 16, textAlign: 'center', marginTop: 4, color: sv.fg }}>Tap a star to rate your visit</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '10px 0' }}>
              {[1,2,3,4,5].map(i => (
                <svg key={i} width="28" height="28" viewBox="0 0 48 48" fill="none">
                  <path d="M24 4l5.09 10.26L41 15.27l-8.5 8.27 2.01 11.72L24 30l-10.51 5.26 2.01-11.72L7 15.27l11.91-1.01L24 4z"
                    fill={i <= 4 ? accent : 'rgba(0,0,0,0.08)'}
                    stroke={i <= 4 ? accent : 'rgba(0,0,0,0.12)'}
                    strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              ))}
            </div>
            <div style={{ fontSize: 11, textAlign: 'center', color: accent, fontWeight: 500 }}>Amazing!</div>
          </>
        )}

        {step === 'generate' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, flex: 1, padding: '8px 0' }}>
            <div style={{ width: 36, height: 36, border: `3px solid ${sv.btnBg}40`, borderTopColor: sv.btnBg, borderRadius: '50%', animation: 'lp-spin 0.9s linear infinite' }} />
            <div style={{ fontWeight: 700, fontSize: 15, textAlign: 'center', color: sv.fg }}>Crafting your review…</div>
            <div style={{ fontSize: 11, color: sv.sub, textAlign: 'center', lineHeight: 1.5 }}>Our AI is writing a personalised draft for you…</div>
          </div>
        )}

        {step === 'redirect' && (
          <>
            <div style={{ fontWeight: 700, fontSize: 15, textAlign: 'center', marginTop: 4, color: sv.fg }}>Here&apos;s your review draft</div>
            <div style={{ fontSize: 10, color: sv.sub, textAlign: 'center' }}>Review, edit, then post it — takes 10 seconds!</div>
            <div style={{ background: sv.card, border: `1px solid ${sv.divider}`, borderRadius: 9, padding: '9px 10px', fontSize: 11, lineHeight: 1.5, color: sv.fg }}>{sampleReview}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ flex: 1, height: 32, borderRadius: 8, border: `1px solid ${sv.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: sv.fg }}>
                <svg width="11" height="11" viewBox="0 0 15 15" fill="none"><path d="M13 7.5A5.5 5.5 0 112.5 4.5M2.5 1.5v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Try another
              </div>
              <div style={{ flex: 1, height: 32, borderRadius: 8, border: `1px solid ${sv.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: sv.fg }}>
                <svg width="11" height="11" viewBox="0 0 15 15" fill="none"><path d="M10 2l3 3-8 8H2v-3l8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/></svg>
                Edit
              </div>
            </div>
            <div style={{ background: sv.btnBg, borderRadius: 10, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: sv.btnFg, fontWeight: 600, fontSize: 12, marginTop: 'auto' }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 11V3h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Copy &amp; open Google Reviews
            </div>
          </>
        )}

      </div>
    </div>
  );
}
