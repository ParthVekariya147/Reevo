'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Icon, Card, CardHeader, Btn, Badge, Stat, Chart, Field, Input, Select, Switch, Tabs, StarRating, Counter, pct } from '../ui';
import { PLATFORM_DEFS, type ReviewPlatformEntry } from '@/lib/platforms';
import { LogoUpload } from '../LogoUpload';

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ── types ─────────────────────────────────────────────────────

interface Business {
  id:                    string;
  name:                  string;
  tagline:               string | null;
  google_link:           string | null;
  brand_color:           string;
  logo_initials:         string;
  logo_url?:             string | null;
  min_rating_for_google: number;
  language:              string;
  plan:                  string;
  review_platforms?:     ReviewPlatformEntry[] | null;
  review_keywords?:      string | null;
  business_type?:        string | null;
  funnel_style?:         string | null;
  funnel_heading?:       string | null;
  funnel_sub?:           string | null;
  funnel_font?:          string | null;
  funnel_accent_color?:  string | null;
  funnel_bg_image_url?:  string | null;
  funnel_bg_blur?:       number | null;
  funnel_bg_dim?:        number | null;
  funnel_card_bg?:       string | null;
  funnel_preset_name?:   string | null;
}

interface UserInfo { id: string; email: string; full_name: string }

interface Props {
  initialBusiness: Business | null;
  user:            UserInfo;
}

// ── helpers ───────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

async function patchBusiness(updates: Record<string, unknown>): Promise<boolean> {
  const res = await fetch('/api/businesses', {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(updates),
  });
  return res.ok;
}

const LANGUAGES = [
  { value: 'en', label: 'English'    },
  { value: 'es', label: 'Spanish'    },
  { value: 'fr', label: 'French'     },
  { value: 'de', label: 'German'     },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian'    },
  { value: 'ja', label: 'Japanese'   },
];

const FUNNEL_STYLES = [
  'minimal', 'glass', 'dark', 'luxury', 'neon', 'clay', 'elegant', 'vivid', 'playful',
] as const;

const FUNNEL_FONTS = [
  { label: 'DM Sans',   value: 'DM Sans'            },
  { label: 'Playfair',  value: 'Playfair Display'   },
  { label: 'Syne',      value: 'Syne'               },
  { label: 'Fraunces',  value: 'Fraunces'           },
  { label: 'Cormorant', value: 'Cormorant Garamond' },
];

const ACCENT_PRESETS = [
  { color: '#1a1a1a', title: 'Midnight'   },
  { color: '#b5541c', title: 'Burnt Terra'},
  { color: '#2d5a3d', title: 'Forest'     },
  { color: '#9e3a5c', title: 'Rosé'       },
  { color: '#1a3a6c', title: 'Navy'       },
  { color: '#3d4a5c', title: 'Slate'      },
  { color: '#8a6a1a', title: 'Gold'       },
  { color: '#5a2d6e', title: 'Plum'       },
];

// ── sub-components ────────────────────────────────────────────

function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="lp-page-hd">
      <div>
        <h1 className="lp-h1">{title}</h1>
        {sub && <div className="lp-page-sub">{sub}</div>}
      </div>
      {actions && <div className="lp-page-act">{actions}</div>}
    </div>
  );
}

// ── funnel state type ─────────────────────────────────────────

interface FunnelState {
  style?:       string;
  heading?:     string;
  sub?:         string;
  tone?:        string;
  language?:    string;
  threshold?:   number;
  reviewCount?: number;
}

// ── funnel mockup — mirrors the real /r/[token] page ─────────

function FunnelMockup({ brand, step = 'landing', funnel = {}, appearance = {} }: {
  brand: { name: string; color: string; initials: string; logoUrl?: string | null; tagline?: string };
  step?: string;
  funnel?: FunnelState;
  appearance?: { font?: string; accent?: string; bgImage?: string | null; bgBlur?: number; bgDim?: number };
}) {
  const accent   = appearance.accent  ?? brand.color ?? '#1a1a1a';
  const font     = appearance.font    ?? 'DM Sans';
  const bgImage  = appearance.bgImage ?? null;
  const bgBlur   = appearance.bgBlur  ?? 0;
  const bgDim    = appearance.bgDim   ?? 0;

  const logoText = brand.initials || brand.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || '??';
  const bizName  = brand.name || 'Your Business';
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
  const sv = styleMap[funnel.style ?? 'elegant'] ?? styleMap.elegant;
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
                    fill="rgba(0,0,0,0.1)" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
              ))}
            </div>
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

// ── main component ────────────────────────────────────────────

export default function ScreenFunnel({ initialBusiness }: Props) {
  const [tab,        setTab]        = useState('design');
  const [simStep,    setSimStep]    = useState('landing');
  const [simRunning, setSimRunning] = useState(false);
  const [saveState,  setSaveState]  = useState<SaveState>('idle');
  const [logoUrl,    setLogoUrl]    = useState<string | null>(initialBusiness?.logo_url ?? null);
  const [logoToast,  setLogoToast]  = useState<'uploaded' | 'removed' | null>(null);

  // Appearance state
  const [funnelFont,    setFunnelFont]    = useState(initialBusiness?.funnel_font         ?? 'DM Sans');
  const [funnelAccent,  setFunnelAccent]  = useState(initialBusiness?.funnel_accent_color ?? '#1a1a1a');
  const [funnelBgUrl,   setFunnelBgUrl]   = useState<string | null>(initialBusiness?.funnel_bg_image_url ?? null);
  const [funnelBgBlur,  setFunnelBgBlur]  = useState(initialBusiness?.funnel_bg_blur ?? 0);
  const [funnelBgDim,   setFunnelBgDim]   = useState(initialBusiness?.funnel_bg_dim  ?? 0);
  const [bgUploading,   setBgUploading]   = useState(false);
  const [bgUploadError, setBgUploadError] = useState<string | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  function handleLogoUpdate(url: string | null) {
    setLogoUrl(url);
    setLogoToast(url ? 'uploaded' : 'removed');
    setTimeout(() => setLogoToast(null), 2500);
  }

  async function handleBgUpload(file: File) {
    if (file.size > 2 * 1024 * 1024) { setBgUploadError('Image must be under 2 MB'); return; }
    setBgUploading(true);
    setBgUploadError(null);
    try {
      const supabase = createClient();
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${initialBusiness?.id ?? 'anon'}/bg.${ext}`;
      const { error } = await supabase.storage
        .from('funnel-backgrounds')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('funnel-backgrounds').getPublicUrl(path);
      setFunnelBgUrl(data.publicUrl);
      setSaveState('idle');
    } catch {
      setBgUploadError('Upload failed, please try again');
    } finally {
      setBgUploading(false);
    }
  }

  const { data: overview } = useQuery<{
    kpis: { scans: number; generates: number; copies: number; redirects: number; completes: number; conversion: number };
    daily_series: { date: string; scans: number }[];
  }>({
    queryKey: ['/api/dashboard/overview'],
    queryFn:  () => fetcher('/api/dashboard/overview'),
  });

  const { data: rep } = useQuery<{ avg_rating: number; total_reviews: number }>({
    queryKey: ['/api/businesses/reputation'],
    queryFn:  () => fetcher('/api/businesses/reputation'),
  });

  const kpis = overview?.kpis;
  const funnelSteps = kpis ? [
    kpis.scans,
    kpis.generates,
    kpis.copies,
    kpis.redirects,
    kpis.completes,
  ] : null;

  const [funnel, setFunnel] = useState({
    style:       initialBusiness?.funnel_style   ?? 'elegant',
    heading:     initialBusiness?.funnel_heading ?? (initialBusiness?.name ? `Thanks for visiting ${initialBusiness.name}!` : 'Thanks for visiting!'),
    sub:         initialBusiness?.funnel_sub     ?? "We'd love to hear about your experience.",
    tone:        'warm',
    reviewCount: 3,
  });

  // Local-only switch states (no DB columns)
  const [showHours,      setShowHours]      = useState(true);
  const [showStaff,      setShowStaff]      = useState(false);
  const [discloseAI,     setDiscloseAI]     = useState(true);
  const [capturePrivate, setCapturePrivate] = useState(true);
  const [notify5Star,    setNotify5Star]    = useState(true);
  const [throttleScans,  setThrottleScans]  = useState(true);

  // Talking points — parsed from business.review_keywords (comma-separated)
  const [talkingPoints, setTalkingPoints] = useState<string[]>(() =>
    initialBusiness?.review_keywords
      ? initialBusiness.review_keywords.split(',').map(k => k.trim()).filter(Boolean)
      : []
  );
  const [addingTopic, setAddingTopic] = useState(false);
  const [topicInput,  setTopicInput]  = useState('');

  // Business-level fields that ARE persisted
  const [language,  setLanguage]  = useState(initialBusiness?.language              ?? 'en');
  const [threshold, setThreshold] = useState(initialBusiness?.min_rating_for_google ?? 4);

  // Review platforms — init from saved data or seed with google_link.
  // Back-fill google_link into any existing Google entry whose URL is empty,
  // so a stale empty review_platforms row never shadows a valid google_link.
  const [platforms, setPlatforms] = useState<ReviewPlatformEntry[]>(() => {
    const saved = initialBusiness?.review_platforms;
    const gl    = initialBusiness?.google_link ?? '';
    if (saved && saved.length > 0) {
      return saved.map(p =>
        p.id === 'google' && !p.url && gl ? { ...p, url: gl } : p
      );
    }
    return [{ id: 'google', url: gl, enabled: true }];
  });

  const brand = {
    name:     initialBusiness?.name          ?? '',
    tagline:  initialBusiness?.tagline       ?? '',
    color:    initialBusiness?.brand_color   ?? '#6E5BFF',
    initials: initialBusiness?.logo_initials ?? '',
    logoUrl,
  };

  useEffect(() => {
    if (!simRunning) return;
    const steps = ['landing', 'rate', 'generate', 'redirect'];
    const i  = steps.indexOf(simStep);
    const id = setTimeout(() => {
      const ni = (i + 1) % steps.length;
      setSimStep(steps[ni]);
      if (ni === 0) setSimRunning(false);
    }, 1900);
    return () => clearTimeout(id);
  }, [simRunning, simStep]);

  const setFunnelField = (k: string, v: string | number) => setFunnel(f => ({ ...f, [k]: v }));

  // Ensure URLs have a protocol so sanitizeUrl on the server doesn't strip them.
  // 'www.google.com' → 'https://www.google.com', already-valid URLs are untouched.
  function normalizeUrl(u: string): string {
    if (!u) return u;
    if (u.startsWith('http://') || u.startsWith('https://')) return u;
    return `https://${u}`;
  }

  async function publish() {
    setSaveState('saving');
    // Normalize all platform URLs before sending, and update local state so
    // the input reflects the corrected value (e.g. adds https://) after publish.
    const normalizedPlatforms = platforms.map(p => ({ ...p, url: normalizeUrl(p.url) }));
    setPlatforms(normalizedPlatforms);
    const googleUrl = normalizedPlatforms.find(p => p.id === 'google')?.url ?? null;
    const ok = await patchBusiness({
      language,
      min_rating_for_google: threshold,
      review_platforms:      normalizedPlatforms,
      review_keywords:       talkingPoints.join(', ') || null,
      google_link:           googleUrl || null,
      funnel_style:          funnel.style,
      funnel_heading:        funnel.heading     || null,
      funnel_sub:            funnel.sub         || null,
      funnel_font:           funnelFont,
      funnel_accent_color:   funnelAccent,
      funnel_bg_image_url:   funnelBgUrl        || null,
      funnel_bg_blur:        funnelBgBlur,
      funnel_bg_dim:         funnelBgDim,
    });
    setSaveState(ok ? 'saved' : 'error');
    if (ok) setTimeout(() => setSaveState('idle'), 2500);
  }

  function addTalkingPoint() {
    const v = topicInput.trim();
    if (v && !talkingPoints.includes(v)) {
      setTalkingPoints(ps => [...ps, v]);
      setSaveState('idle');
    }
    setTopicInput('');
    setAddingTopic(false);
  }

  function removeTalkingPoint(p: string) {
    setTalkingPoints(ps => ps.filter(x => x !== p));
    setSaveState('idle');
  }

  // Platform helpers
  function setPlatformEnabled(id: string, enabled: boolean) {
    setPlatforms(ps => ps.map(p => p.id === id ? { ...p, enabled } : p));
    setSaveState('idle');
  }
  function setPlatformUrl(id: string, url: string) {
    setPlatforms(ps => ps.map(p => p.id === id ? { ...p, url } : p));
    setSaveState('idle');
  }
  function addPlatform(id: string) {
    if (platforms.find(p => p.id === id)) return;
    setPlatforms(ps => [...ps, { id, url: '', enabled: true }]);
    setSaveState('idle');
  }
  function removePlatform(id: string) {
    setPlatforms(ps => ps.filter(p => p.id !== id));
    setSaveState('idle');
  }

  const publishLabel =
    saveState === 'saving' ? 'Saving…' :
    saveState === 'saved'  ? 'Published!' :
    saveState === 'error'  ? 'Error' : 'Publish changes';

  return (
    <div className="lp-page">
      <PageHeader
        title="Customer review funnel"
        sub="Design what customers see after they scan your QR code"
        actions={
          <>
            <Btn icon="eye" onClick={() => { setSimRunning(true); setSimStep('landing'); }}>Preview</Btn>
            <Btn variant="primary" icon="check" onClick={publish}>{publishLabel}</Btn>
          </>
        }
      />
      <div className="lp-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 360px', gap: 16, alignItems: 'start' }}>
        <Card>
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'design',    label: 'Design'          },
            { value: 'flow',      label: 'Customer flow'   },
            { value: 'ai',        label: 'AI tone & language' },
            { value: 'rules',     label: 'Routing rules'   },
            { value: 'analytics', label: 'Conversion'      },
          ]} />

          {tab === 'design' && (
            <div className="lp-stack" style={{ marginTop: 16 }}>

              {/* Style pills */}
              <Field label="Style">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {FUNNEL_STYLES.map(s => (
                    <button key={s} onClick={() => { setFunnelField('style', s); setSaveState('idle'); }} style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize',
                      border: funnel.style === s ? '1.5px solid var(--lp-fg)' : '1px solid var(--lp-border)',
                      background: funnel.style === s ? 'var(--lp-fg)' : 'var(--lp-surface)',
                      color: funnel.style === s ? 'var(--lp-bg)' : 'var(--lp-fg)',
                      fontWeight: funnel.style === s ? 600 : 400, transition: 'all .15s',
                    }}>{s}</button>
                  ))}
                </div>
              </Field>

              {/* Font pills */}
              <Field label="Font">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {FUNNEL_FONTS.map(f => (
                    <button key={f.value} onClick={() => { setFunnelFont(f.value); setSaveState('idle'); }} style={{
                      padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                      border: funnelFont === f.value ? '1.5px solid var(--lp-fg)' : '1px solid var(--lp-border)',
                      background: funnelFont === f.value ? 'var(--lp-fg)' : 'var(--lp-surface)',
                      color: funnelFont === f.value ? 'var(--lp-bg)' : 'var(--lp-fg)',
                      fontWeight: funnelFont === f.value ? 600 : 400, transition: 'all .15s',
                    }}>{f.label}</button>
                  ))}
                </div>
              </Field>

              {/* Accent color */}
              <Field label="Accent color">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {ACCENT_PRESETS.map(p => (
                    <button key={p.color} title={p.title} onClick={() => { setFunnelAccent(p.color); setSaveState('idle'); }} style={{
                      width: 24, height: 24, borderRadius: '50%', cursor: 'pointer', background: p.color,
                      border: funnelAccent === p.color ? '2.5px solid var(--lp-fg)' : '2px solid transparent',
                      outline: funnelAccent === p.color ? '1.5px solid var(--lp-bg)' : 'none',
                      transition: 'all .15s',
                    }} />
                  ))}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginLeft: 4 }}>
                    <input type="color" value={funnelAccent}
                      onChange={e => { setFunnelAccent(e.target.value); setSaveState('idle'); }}
                      style={{ width: 24, height: 24, border: 'none', padding: 0, borderRadius: 4, cursor: 'pointer', background: 'none' }} />
                    <span style={{ fontSize: 11, color: 'var(--lp-fg-muted)' }}>Custom</span>
                  </label>
                </div>
              </Field>

              {/* Background image */}
              <Field label="Background image">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {funnelBgUrl && (
                    <div style={{ position: 'relative', width: 80, height: 56, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--lp-border)' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={funnelBgUrl} alt="BG" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => { setFunnelBgUrl(null); setSaveState('idle'); }} style={{
                        position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%',
                        border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, lineHeight: 1,
                      }}>×</button>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input ref={bgInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleBgUpload(f); e.target.value = ''; }} />
                    <Btn variant="ghost" size="sm" icon="upload" onClick={() => bgInputRef.current?.click()}>
                      {bgUploading ? 'Uploading…' : funnelBgUrl ? 'Replace image' : 'Upload image'}
                    </Btn>
                    {bgUploadError && <span style={{ fontSize: 11, color: '#ef4444' }}>{bgUploadError}</span>}
                  </div>
                </div>
              </Field>

              {/* Blur */}
              <Field label="Background blur" hint={`${funnelBgBlur}px`}>
                <input type="range" min={0} max={20} step={1} value={funnelBgBlur}
                  onChange={e => { setFunnelBgBlur(Number(e.target.value)); setSaveState('idle'); }}
                  style={{ width: '100%', accentColor: 'var(--lp-fg)' }} />
              </Field>

              {/* Dim */}
              <Field label="Background dim" hint={`${funnelBgDim}%`}>
                <input type="range" min={0} max={80} step={5} value={funnelBgDim}
                  onChange={e => { setFunnelBgDim(Number(e.target.value)); setSaveState('idle'); }}
                  style={{ width: '100%', accentColor: 'var(--lp-fg)' }} />
              </Field>

              <div className="lp-grid lp-grid-2" style={{ gap: 14 }}>
                <Field label="Headline">
                  <Input value={funnel.heading} onChange={e => setFunnelField('heading', e.target.value)} />
                </Field>
                <Field label="Sub-headline">
                  <Input value={funnel.sub} onChange={e => setFunnelField('sub', e.target.value)} />
                </Field>
                <Field label="Primary CTA"><Input defaultValue="Rate your visit" /></Field>
                <Field label="Logo">
                  <LogoUpload currentLogoUrl={logoUrl} onSuccess={handleLogoUpdate} />
                  {logoToast && (
                    <span style={{
                      display: 'inline-block', marginTop: 6,
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                      background: logoToast === 'uploaded' ? '#dcfce7' : 'var(--lp-surface-muted)',
                      color:      logoToast === 'uploaded' ? '#16a34a' : 'var(--lp-fg-muted)',
                    }}>
                      {logoToast === 'uploaded' ? '✓ Logo uploaded' : 'Logo removed'}
                    </span>
                  )}
                </Field>
              </div>
              <Switch label="Show business hours & address" sub="Helps customer recall the visit" checked={showHours} onChange={setShowHours} />
              <Switch label="Show staff signature" sub="Personalize with the staff member's name" checked={showStaff} onChange={setShowStaff} />
            </div>
          )}

          {tab === 'flow' && (
            <div style={{ marginTop: 16 }}>
              <div className="lp-flow-canvas">
                {['Scan QR','Rate visit','AI suggests review','Customer edits/refreshes','Redirect to Google'].map((s, i, arr) => {
                  const steps = funnelSteps ?? [0, 0, 0, 0, 0];
                  const top   = steps[0] || 1;
                  const count = steps[i] ?? 0;
                  const prev  = steps[i - 1] ?? top;
                  return (
                    <div key={s} style={{ display: 'contents' }}>
                      <div className={`lp-flow-node ${i === 2 ? 'is-accent' : ''}`}>
                        <div className="lp-flow-num">{i + 1}</div>
                        <div className="lp-flow-name">{s}</div>
                        <div className="lp-flow-stat">
                          <Counter value={count} />
                          <span className="lp-muted"> · {pct(count / top)}</span>
                        </div>
                      </div>
                      {i < arr.length - 1 && (
                        <div className="lp-flow-arrow">
                          <Icon name="chevron" size={16} />
                          <div className="lp-flow-drop">
                            {prev > 0 ? `−${Math.round((1 - count / prev) * 100)}%` : '—'}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="lp-callout" style={{ marginTop: 16 }}>
                <Icon name="sparkles" size={16} />
                <div>
                  <div><b>Optimization tip</b> — Add a &quot;skip writing, use suggestion&quot; CTA between steps 3 &amp; 4</div>
                  <div className="lp-muted">Could lift conversion by ~6% based on similar restaurants.</div>
                </div>
                <Btn variant="ghost" size="sm">Apply</Btn>
              </div>
            </div>
          )}

          {tab === 'ai' && (
            <div className="lp-stack" style={{ marginTop: 16 }}>
              <Field label="Default tone preset">
                <div className="lp-grid lp-grid-4" style={{ gap: 8 }}>
                  {['warm','professional','casual','enthusiastic'].map(p => (
                    <button key={p} onClick={() => setFunnelField('tone', p)}
                            className={`lp-tone-pick ${funnel.tone === p ? 'is-on' : ''}`}>
                      <div style={{ textTransform: 'capitalize', fontWeight: 600 }}>{p}</div>
                      <div className="lp-muted" style={{ fontSize: 11, marginTop: 2 }}>
                        {({'warm':'Inviting & friendly','professional':'Polished tone','casual':'Conversational','enthusiastic':'Energetic & glowing'} as Record<string, string>)[p]}
                      </div>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Default language" hint="Saved to your business record">
                <Select value={language} onChange={v => { setLanguage(v); setSaveState('idle'); }} options={LANGUAGES} />
              </Field>
              <Field label="Number of AI suggestions per customer" hint="More options means higher copy rate but more compute usage">
                <div className="lp-stepper">
                  <button onClick={() => setFunnelField('reviewCount', Math.max(1, funnel.reviewCount - 1))}>−</button>
                  <span><b>{funnel.reviewCount}</b> suggestions</span>
                  <button onClick={() => setFunnelField('reviewCount', Math.min(5, funnel.reviewCount + 1))}>+</button>
                </div>
              </Field>
              <Field label="Suggested talking points" hint="Topics to weave into AI suggestions">
                <div className="lp-chips">
                  {talkingPoints.map(c => (
                    <span className="lp-chip" key={c} onClick={() => removeTalkingPoint(c)} style={{ cursor: 'pointer' }}>
                      {c} <Icon name="x" size={11} />
                    </span>
                  ))}
                  {addingTopic ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Input
                        value={topicInput}
                        onChange={e => setTopicInput(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === 'Enter') addTalkingPoint();
                          if (e.key === 'Escape') { setAddingTopic(false); setTopicInput(''); }
                        }}
                        placeholder="e.g. great coffee"
                        style={{ width: 140, height: 28, fontSize: 12 }}
                        autoFocus
                      />
                      <button className="lp-chip lp-chip-add" onClick={addTalkingPoint}><Icon name="check" size={11} /></button>
                    </span>
                  ) : (
                    <button className="lp-chip lp-chip-add" onClick={() => setAddingTopic(true)}><Icon name="plus" size={11} /> Add topic</button>
                  )}
                </div>
              </Field>
              <Switch label="Disclose AI assistance to customers" sub="Recommended for Google policy compliance" checked={discloseAI} onChange={setDiscloseAI} />
            </div>
          )}

          {tab === 'rules' && (
            <div className="lp-stack" style={{ marginTop: 16 }}>

              {/* ── Star threshold ── */}
              <Field label="Star threshold for redirect" hint="Customers below this rating see a private feedback form instead">
                <div className="lp-thresh">
                  <StarRating value={threshold} onChange={v => { setThreshold(v); setSaveState('idle'); }} size={26} />
                  <span className="lp-muted">≥ {threshold} stars → review platform</span>
                </div>
              </Field>

              {/* ── Platform manager ── */}
              <Field label="Review platforms" hint="Enable the platforms you want customers redirected to after rating">
                <div className="lp-stack" style={{ gap: 8, marginTop: 4 }}>

                  {/* Active / configured platforms */}
                  {platforms.map(entry => {
                    const def = PLATFORM_DEFS.find(d => d.id === entry.id);
                    if (!def) return null;
                    return (
                      <div key={entry.id} className="lp-stack" style={{ gap: 6, padding: '10px 12px', background: 'var(--lp-surface-raised)', borderRadius: 8, border: '1px solid var(--lp-border)' }}>
                        <div className="lp-flex lp-flex-between" style={{ alignItems: 'center' }}>
                          <div className="lp-flex" style={{ gap: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 20 }}>{def.emoji}</span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{def.name}</div>
                              <div style={{ display: 'flex', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
                                {def.regionTags.map(r => (
                                  <span key={r} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--lp-surface-muted)', color: 'var(--lp-fg-muted)', fontWeight: 600 }}>{r}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="lp-flex" style={{ gap: 8, alignItems: 'center' }}>
                            <Switch checked={entry.enabled} onChange={v => setPlatformEnabled(entry.id, v)} />
                            {entry.id !== 'google' && (
                              <button onClick={() => removePlatform(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lp-fg-muted)', padding: 2 }}>
                                <Icon name="x" size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        {entry.enabled && (
                          <Input
                            value={entry.url}
                            onChange={e => setPlatformUrl(entry.id, e.target.value)}
                            placeholder={def.placeholder}
                            icon="link"
                          />
                        )}
                      </div>
                    );
                  })}

                  {/* Add platform picker */}
                  {PLATFORM_DEFS.filter(d => !platforms.find(p => p.id === d.id)).length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--lp-fg-muted)', fontWeight: 600, marginBottom: 8, marginTop: 4 }}>Add platform</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {PLATFORM_DEFS.filter(d => !platforms.find(p => p.id === d.id)).map(def => (
                          <button
                            key={def.id}
                            onClick={() => addPlatform(def.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6,
                              padding: '5px 10px', borderRadius: 6, border: '1px dashed var(--lp-border)',
                              background: 'none', cursor: 'pointer', fontSize: 12,
                              color: 'var(--lp-fg)', fontWeight: 500,
                            }}
                          >
                            <span>{def.emoji}</span>
                            {def.name}
                            <div style={{ display: 'flex', gap: 3 }}>
                              {def.regionTags.slice(0, 3).map(r => (
                                <span key={r} style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'var(--lp-surface-muted)', color: 'var(--lp-fg-muted)' }}>{r}</span>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Field>

              <Switch label="Capture low ratings privately" sub="Below-threshold customers send feedback directly to you" checked={capturePrivate} onChange={setCapturePrivate} />
              <Switch label="Notify owner on every 5★ review" sub="Push notifications and email" checked={notify5Star} onChange={setNotify5Star} />
              <Switch label="Throttle repeat scans" sub="One review per customer device per 30 days" checked={throttleScans} onChange={setThrottleScans} />
            </div>
          )}

          {tab === 'analytics' && (
            <div style={{ marginTop: 16 }}>
              <div className="lp-grid lp-grid-4" style={{ marginBottom: 14 }}>
                <Stat label="Funnel starts" icon="qr"   value={kpis?.scans    ?? 0} tone="primary" />
                <Stat label="Completions"   icon="check" value={kpis?.completes ?? 0} tone="success" />
                <Stat label="Avg. rating"   icon="star"  value={rep?.avg_rating ?? 0} decimals={1} tone="warning" />
                <Stat label="Conversion"    icon="trendUp" value={kpis?.conversion ?? 0} suffix="%" decimals={1} tone="violet" />
              </div>
              <Chart
                data={(overview?.daily_series ?? []).map(d => ({ x: d.date.slice(5), y: d.scans }))}
                keys={['y']} colors={['primary']} kind="area" height={220}
              />
            </div>
          )}
        </Card>

        <div className="lp-stack" style={{ position: 'sticky', top: 12 }}>
          <Card>
            <CardHeader
              title="Live preview"
              subtitle={`Customer view — ${simStep}`}
              action={
                <Btn variant="primary" size="sm" icon={simRunning ? 'x' : 'play'}
                     onClick={() => { setSimRunning(r => !r); if (!simRunning) setSimStep('landing'); }}>
                  {simRunning ? 'Stop' : 'Simulate'}
                </Btn>
              }
            />
            <div className="lp-phone" style={{ margin: '0 auto' }}>
              <FunnelMockup
                brand={brand}
                step={simStep}
                funnel={{ ...funnel, language, threshold }}
                appearance={{ font: funnelFont, accent: funnelAccent, bgImage: funnelBgUrl, bgBlur: funnelBgBlur, bgDim: funnelBgDim }}
              />
            </div>
            <div className="lp-flex" style={{ gap: 6, marginTop: 14, justifyContent: 'center' }}>
              {['landing','rate','generate','redirect'].map(s => (
                <button key={s} className={`lp-step-dot ${simStep === s ? 'is-on' : ''}`} onClick={() => setSimStep(s)}>
                  {s}
                </button>
              ))}
            </div>
          </Card>

          {initialBusiness && (
            <Card>
              <CardHeader title="Brand" subtitle="From business profile" />
              <div className="lp-flex" style={{ gap: 10, alignItems: 'center' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: brand.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, overflow: 'hidden', flexShrink: 0 }}>
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt={brand.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (brand.initials || brand.name.slice(0, 2).toUpperCase())}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{brand.name}</div>
                  <div className="lp-muted" style={{ fontSize: 11 }}>{brand.color}</div>
                </div>
                <span style={{ marginLeft: 'auto' }}>
                  <Badge tone={initialBusiness.plan === 'pro' ? 'primary' : initialBusiness.plan === 'enterprise' ? 'success' : 'neutral'}>
                    {initialBusiness.plan}
                  </Badge>
                </span>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
