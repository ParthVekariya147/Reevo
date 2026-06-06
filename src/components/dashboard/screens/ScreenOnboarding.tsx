'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, Badge, Field, Input } from '../ui';
import { PLATFORM_DEFS, type ReviewPlatformEntry } from '@/lib/platforms';
import { isValidGoogleReviewUrl } from '@/lib/validation/urls';

// ── types ─────────────────────────────────────────────────────

interface UserMeta {
  id:            string;
  email:         string;
  full_name:     string;
  business_name: string;
  google_link:   string;
  industry:      string;
}

interface ExistingBusiness {
  name:             string;
  tagline:          string | null;
  brand_color:      string;
  logo_initials:    string;
  google_link:      string | null;
  review_platforms: ReviewPlatformEntry[];
  min_rating_for_google: number;
  language:         string;
  business_type:    string | null;
  review_keywords:  string | null;
  owner_name:       string | null;
}

interface Props {
  user:             UserMeta;
  existingBusiness: ExistingBusiness | null;
  initialStep?:     number;
  gbpConnected?:    boolean;
  gbpError?:        string | null;
}

// ── industry config ───────────────────────────────────────────

const INDUSTRY_CONFIG: Record<string, {
  label:     string;
  emoji:     string;
  platforms: string[];
  tip:       string;
}> = {
  restaurants: {
    label:     'Restaurant',
    emoji:     '🍽️',
    platforms: ['google', 'tripadvisor', 'yelp', 'zomato', 'facebook'],
    tip:       'Restaurants see 3× more reviews when Google + TripAdvisor are both active.',
  },
  salons: {
    label:     'Salon & Beauty',
    emoji:     '💇',
    platforms: ['google', 'facebook', 'yelp'],
    tip:       'Facebook Reviews drive 40% of salon referrals — add your page link.',
  },
  clinics: {
    label:     'Clinic & Health',
    emoji:     '🩺',
    platforms: ['google', 'facebook'],
    tip:       'Google Reviews dominate healthcare searches. Focus here first.',
  },
  cafes: {
    label:     'Café',
    emoji:     '☕',
    platforms: ['google', 'tripadvisor', 'yelp', 'facebook'],
    tip:       'TripAdvisor drives tourist traffic — great for cafés in busy areas.',
  },
  gyms: {
    label:     'Gym & Fitness',
    emoji:     '🏋️',
    platforms: ['google', 'facebook', 'yelp'],
    tip:       'Members trust Google Reviews most when choosing a new gym.',
  },
  retail: {
    label:     'Retail',
    emoji:     '🛍️',
    platforms: ['google', 'trustpilot', 'facebook', 'yelp'],
    tip:       'Trustpilot builds trust with online shoppers — pair it with Google.',
  },
  drycleaners: {
    label:     'Dry Cleaner',
    emoji:     '👔',
    platforms: ['google', 'facebook', 'yelp'],
    tip:       'Local Google Reviews drive walk-in traffic for neighbourhood services.',
  },
  services: {
    label:     'Service Business',
    emoji:     '🛠️',
    platforms: ['google', 'checkatrade', 'facebook', 'yelp'],
    tip:       'Checkatrade is trusted by homeowners hiring tradespeople in the UK.',
  },
  hotels: {
    label:     'Hotel',
    emoji:     '🏨',
    platforms: ['google', 'booking', 'tripadvisor', 'facebook'],
    tip:       'Booking.com + TripAdvisor are essential for hospitality businesses.',
  },
  hospitality: {
    label:     'Hospitality',
    emoji:     '🏨',
    platforms: ['google', 'booking', 'tripadvisor', 'facebook'],
    tip:       'Booking.com + TripAdvisor are essential for hospitality businesses.',
  },
};

const DEFAULT_INDUSTRY = {
  label:     'Business',
  emoji:     '🏢',
  platforms: ['google', 'facebook', 'tripadvisor'],
  tip:       'Start with Google Reviews — the most impactful platform for local search.',
};

function industryConfig(id: string) {
  return INDUSTRY_CONFIG[id?.toLowerCase()] ?? DEFAULT_INDUSTRY;
}

const KEYWORD_PLACEHOLDERS: Record<string, string> = {
  restaurants:  'wood-fired pizza, cozy patio, friendly staff',
  salons:       'colour specialists, relaxing atmosphere, precise cuts',
  clinics:      'caring doctors, short wait times, professional staff',
  cafes:        'specialty coffee, cozy seating, friendly baristas',
  gyms:         'modern equipment, expert trainers, clean facilities',
  retail:       'wide selection, knowledgeable staff, great prices',
  drycleaners:  'fast turnaround, careful handling, convenient location',
  services:     'reliable service, fair pricing, professional team',
  hotels:       'comfortable rooms, great location, attentive service',
  hospitality:  'warm welcome, clean facilities, excellent service',
};

function keywordPlaceholder(industry: string): string {
  return KEYWORD_PLACEHOLDERS[industry?.toLowerCase()] ?? 'friendly staff, great value, clean space';
}

// ── constants ─────────────────────────────────────────────────

const STEPS = [
  { key: 'details',   label: 'Details',   icon: 'building'  },
  { key: 'platforms', label: 'Platforms', icon: 'link'      },
  { key: 'branding',  label: 'Branding',  icon: 'sparkles'  },
  { key: 'google',    label: 'Google',    icon: 'link'      },
  { key: 'launch',    label: 'Launch',    icon: 'check'     },
] as const;

const BRAND_COLORS = ['#6E5BFF','#8B5CF6','#06B6D4','#10B981','#F59E0B','#EF4444','#0F172A'];

// Fields that must be touched before showing errors, keyed by step
const STEP_TOUCH_FIELDS: Record<number, string[]> = {
  0: ['name', 'tagline', 'business_type', 'owner_name'],
  1: ['google_url'],
  2: ['initials'],
};

// ── helpers ───────────────────────────────────────────────────

function autoInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('');
}

async function upsertBusiness(payload: Record<string, unknown>): Promise<boolean> {
  const res = await fetch('/api/businesses', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  return res.ok;
}

// ── funnel preview ────────────────────────────────────────────

function FunnelPreview({ name, color, initials }: { name: string; color: string; initials: string }) {
  const logoText = initials || autoInitials(name) || '??';
  return (
    <div style={{ background: '#FAFAF7', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.06)', fontFamily: 'ui-serif, Georgia, serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
          {logoText}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#0F0F12' }}>{name || 'Your Business'}</div>
      </div>
      <div style={{ padding: '24px 18px', textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: '#0F0F12', marginBottom: 6 }}>Thanks for visiting!</div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>We&apos;d love to hear about your experience.</div>
        <div style={{ fontSize: 26, letterSpacing: 4, marginBottom: 20, color: '#D1D5DB' }}>★★★★★</div>
        <div style={{ padding: '12px 20px', borderRadius: 10, background: color, color: '#fff', fontWeight: 600, fontSize: 14 }}>Rate your visit</div>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────

export default function ScreenOnboarding({ user, existingBusiness, initialStep = 0, gbpConnected = false, gbpError }: Props) {
  const router  = useRouter();
  const ind     = industryConfig(user.industry);

  const [step,        setStep]        = useState(Math.min(initialStep, STEPS.length - 1));
  const [saving,      setSaving]      = useState(false);
  const [launching,   setLaunching]   = useState(false);
  const [connecting,  setConnecting]  = useState(false);
  const [error,       setError]       = useState('');
  const [touched,     setTouched]     = useState<Set<string>>(new Set());
  const [toast,       setToast]       = useState('');

  // Form state — pre-fill from existing DB record if resuming
  const [form, setForm] = useState({
    name:            existingBusiness?.name     || user.business_name || '',
    tagline:         existingBusiness?.tagline  || '',
    color:           existingBusiness?.brand_color   || '#6E5BFF',
    initials:        existingBusiness?.logo_initials ||
                     autoInitials(existingBusiness?.name || user.business_name || ''),
    business_type:   existingBusiness?.business_type  ?? ind.label,
    review_keywords: existingBusiness?.review_keywords ?? '',
    owner_name:      existingBusiness?.owner_name || user.full_name || '',
  });

  // Platforms — resume from DB or seed with industry recommendations
  const [platforms, setPlatforms] = useState<ReviewPlatformEntry[]>(() => {
    if (existingBusiness?.review_platforms?.length) {
      return existingBusiness.review_platforms;
    }
    return ind.platforms.map(id => ({
      id,
      url:     id === 'google' ? (user.google_link ?? '') : '',
      enabled: true,
    }));
  });

  function patchForm<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function touch(...fields: string[]) {
    setTouched(t => { const n = new Set(t); fields.forEach(f => n.add(f)); return n; });
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  // ── per-field error helpers ───────────────────────────────

  function getFieldError(field: string): string | null {
    if (!touched.has(field)) return null;
    switch (field) {
      case 'name':
        return !form.name.trim() ? 'Business name is required' : null;
      case 'tagline':
        return !form.tagline.trim() ? 'Tagline is required' : null;
      case 'business_type':
        return !form.business_type.trim() ? 'Business type is required' : null;
      case 'owner_name':
        return !form.owner_name.trim() ? 'Owner name is required' : null;
      case 'initials':
        return !form.initials.trim() ? 'Logo initials are required (1–2 characters)' : null;
      case 'google_url': {
        const url = platforms.find(p => p.id === 'google')?.url ?? '';
        if (!url.trim()) return 'Google Review URL is required';
        if (!isValidGoogleReviewUrl(url)) return 'Please enter a valid Google review URL (e.g. google.com/maps/place/...)';
        return null;
      }
      default: return null;
    }
  }

  function getPlatformError(platformId: string): string | null {
    if (!touched.has(`platform_${platformId}`)) return null;
    const entry = platforms.find(p => p.id === platformId);
    if (!entry || !entry.enabled) return null;
    if (!entry.url.trim()) return 'URL is required when this platform is enabled';
    if (platformId === 'google' && !isValidGoogleReviewUrl(entry.url)) {
      return 'Please enter a valid Google review URL (e.g. google.com/maps/place/...)';
    }
    return null;
  }

  // ── platform helpers ──────────────────────────────────────

  function setPlatformUrl(id: string, url: string) {
    setPlatforms(ps => ps.map(p => p.id === id ? { ...p, url } : p));
  }
  function setPlatformEnabled(id: string, enabled: boolean) {
    setPlatforms(ps => ps.map(p => p.id === id ? { ...p, enabled } : p));
  }
  function addPlatform(id: string) {
    if (platforms.find(p => p.id === id)) return;
    setPlatforms(ps => [...ps, { id, url: '', enabled: true }]);
  }
  function removePlatform(id: string) {
    if (id === 'google') return;
    setPlatforms(ps => ps.filter(p => p.id !== id));
  }

  // ── step validation ───────────────────────────────────────

  function canAdvance(): boolean {
    if (step === 0) {
      return (
        form.name.trim().length > 0 &&
        form.tagline.trim().length > 0 &&
        form.business_type.trim().length > 0 &&
        form.owner_name.trim().length > 0
      );
    }
    if (step === 1) {
      const googleEntry = platforms.find(p => p.id === 'google');
      if (!googleEntry || !isValidGoogleReviewUrl(googleEntry.url)) return false;
      // Every enabled non-Google platform must also have a URL
      const enabledMissingUrl = platforms.filter(p => p.id !== 'google' && p.enabled && !p.url.trim());
      return enabledMissingUrl.length === 0;
    }
    if (step === 2) {
      return form.initials.trim().length >= 1;
    }
    // Step 3 (Google Connect) is always skippable
    return true;
  }

  // ── step navigation with auto-save ───────────────────────

  async function saveAndNext() {
    // Mark all fields for the current step as touched so errors appear
    const fieldsToTouch = STEP_TOUCH_FIELDS[step] ?? [];
    // For step 1, also touch every enabled platform's URL field
    if (step === 1) {
      const platformFields = platforms.filter(p => p.enabled).map(p =>
        p.id === 'google' ? 'google_url' : `platform_${p.id}`
      );
      touch(...fieldsToTouch, ...platformFields);
    } else {
      touch(...fieldsToTouch);
    }

    if (!canAdvance()) {
      showToast('Please fix the highlighted fields');
      return;
    }

    setSaving(true);
    const googleUrl = platforms.find(p => p.id === 'google')?.url ?? '';
    await upsertBusiness({
      name:                form.name.trim(),
      tagline:             form.tagline.trim() || null,
      brand_color:         form.color,
      logo_initials:       form.initials || autoInitials(form.name),
      google_link:         googleUrl || null,
      review_platforms:    platforms,
      language:            'en',
      business_type:       form.business_type.trim() || null,
      review_keywords:     form.review_keywords.trim() || null,
      owner_name:          form.owner_name.trim() || null,
      onboarding_complete: false,
      onboarding_step:     step + 1,
    });
    setSaving(false);
    showToast('Step saved ✓');
    setStep(s => s + 1);
  }

  function back() { setStep(s => Math.max(0, s - 1)); }

  // ── GBP connect ───────────────────────────────────────────

  async function handleConnectGBP() {
    setConnecting(true);
    // Persist current step before leaving the page so the wizard resumes here on return
    await fetch('/api/businesses', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ onboarding_step: 3 }),
    }).catch(() => null);
    window.location.href = '/api/gbp/connect?next=/app/business_dashboard/onboarding';
  }

  // ── launch ────────────────────────────────────────────────

  async function handleLaunch() {
    setLaunching(true);
    setError('');

    const res = await fetch('/api/businesses', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ onboarding_complete: true }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 400 && Array.isArray(data.missing_fields)) {
        // Touch the relevant fields so errors surface in earlier steps
        const touchKeys = (data.missing_fields as string[]).map((f: string) =>
          f === 'google_review_url' ? 'google_url' : f
        );
        touch(...touchKeys);
        setError(data.message || 'Please complete all required fields before launching.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      setLaunching(false);
      return;
    }

    // Create the first live QR campaign
    await fetch('/api/qr', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ campaign_name: `${form.name.trim()} — Main`, status: 'live' }),
    });

    router.push('/app/business_dashboard');
  }

  async function handleLogout() {
    await fetch('/auth/signout', { method: 'POST' });
    window.location.href = '/login';
  }

  // ── render ────────────────────────────────────────────────

  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--lp-bg)' }}>

      {/* ── Top bar ── */}
      <header style={{
        height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', borderBottom: '1px solid var(--lp-border)',
        background: 'var(--lp-surface)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#6E5BFF,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none">
              <path d="M7 4h7a5 5 0 010 10h-3l5 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 4v16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>Reevo</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {user.industry && (
            <span style={{ fontSize: 13, color: 'var(--lp-fg-muted)' }}>
              {ind.emoji} Setting up your {ind.label}
            </span>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i < step ? 'var(--lp-success)' : i === step ? 'var(--lp-primary)' : 'var(--lp-border)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'var(--lp-fg-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {step + 1} / {STEPS.length}
          </span>
          <div style={{ height: 16, width: 1, background: 'var(--lp-border)' }} />
          <span style={{ fontSize: 13, color: 'var(--lp-fg-muted)' }}>{user.email}</span>
          <button
            onClick={handleLogout}
            style={{
              fontSize: 13, color: 'var(--lp-fg-muted)', background: 'none', border: 'none',
              cursor: 'pointer', padding: '4px 8px', borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
        </div>
      </header>

      {/* ── Progress bar ── */}
      <div style={{ height: 3, background: 'var(--lp-border)' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: 'var(--lp-primary)', transition: 'width 0.35s ease' }} />
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px 80px' }}>
        <div style={{ width: '100%', maxWidth: 760 }}>

          {/* Step tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                onClick={() => i < step && setStep(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 999, border: 'none', cursor: i < step ? 'pointer' : 'default',
                  background: i === step ? 'var(--lp-primary)' : i < step ? 'var(--lp-success-soft, rgba(16,185,129,0.1))' : 'var(--lp-surface-raised)',
                  color: i === step ? '#fff' : i < step ? 'var(--lp-success)' : 'var(--lp-fg-muted)',
                  fontWeight: 600, fontSize: 12, transition: 'all 0.15s',
                }}
              >
                {i < step
                  ? <><Icon name="check" size={11} /> {s.label}</>
                  : <>{i + 1}. {s.label}</>
                }
              </button>
            ))}
          </div>

          {/* ── Step 0: Business details ──────────────────────── */}
          {step === 0 && (
            <div className="ob-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
                  {user.industry ? `Set up your ${ind.emoji} ${ind.label}` : 'Tell us about your business'}
                </h1>
                <p style={{ color: 'var(--lp-fg-muted)', fontSize: 15, margin: '0 0 28px', lineHeight: 1.5 }}>
                  We&apos;ll personalise your review funnel and platform recommendations based on these details.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Field label="Business name" required error={getFieldError('name') ?? undefined}>
                    <Input
                      value={form.name}
                      onChange={e => {
                        patchForm('name', e.target.value);
                        if (!existingBusiness?.logo_initials) {
                          patchForm('initials', autoInitials(e.target.value));
                        }
                      }}
                      onBlur={() => touch('name')}
                      placeholder="e.g. Olive & Pine Bistro"
                      icon="building"
                      className={getFieldError('name') ? 'is-error' : ''}
                    />
                  </Field>
                  <Field
                    label="Tagline"
                    required
                    hint="Shows under your name on the review funnel"
                    error={getFieldError('tagline') ?? undefined}
                  >
                    <Input
                      value={form.tagline}
                      onChange={e => patchForm('tagline', e.target.value)}
                      onBlur={() => touch('tagline')}
                      placeholder="e.g. Wood-fired comfort food since 2019"
                      className={getFieldError('tagline') ? 'is-error' : ''}
                    />
                  </Field>
                  <Field
                    label="Business type"
                    required
                    hint="Used to personalise AI review drafts"
                    error={getFieldError('business_type') ?? undefined}
                  >
                    <Input
                      value={form.business_type}
                      onChange={e => patchForm('business_type', e.target.value)}
                      onBlur={() => touch('business_type')}
                      placeholder={ind.label}
                      maxLength={60}
                      className={getFieldError('business_type') ? 'is-error' : ''}
                    />
                  </Field>
                  <Field label="Review keywords" hint="What should customers mention? Comma-separated — optional">
                    <Input
                      value={form.review_keywords}
                      onChange={e => patchForm('review_keywords', e.target.value)}
                      placeholder={keywordPlaceholder(user.industry)}
                      maxLength={300}
                    />
                  </Field>
                  <Field
                    label="Owner name"
                    required
                    error={getFieldError('owner_name') ?? undefined}
                  >
                    <Input
                      value={form.owner_name}
                      onChange={e => patchForm('owner_name', e.target.value)}
                      onBlur={() => touch('owner_name')}
                      placeholder="Your full name"
                      icon="user"
                      className={getFieldError('owner_name') ? 'is-error' : ''}
                    />
                  </Field>
                  <Field label="Account email">
                    <Input defaultValue={user.email} disabled />
                  </Field>
                </div>
              </div>

              {/* Mini preview */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lp-fg-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Funnel preview</div>
                <FunnelPreview name={form.name} color={form.color} initials={form.initials} />
                {existingBusiness && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon name="check" size={14} style={{ color: 'var(--lp-success)' }} />
                    <span style={{ fontSize: 12, color: 'var(--lp-success)', fontWeight: 500 }}>
                      Previous progress restored — continue from where you left off.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 1: Review platforms ──────────────────────── */}
          {step === 1 && (
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
                Where should customers post reviews?
              </h1>
              <p style={{ color: 'var(--lp-fg-muted)', fontSize: 15, margin: '0 0 12px', lineHeight: 1.5 }}>
                Add your review page URLs. Customers are redirected here after giving a high rating.
              </p>

              {/* Industry tip */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', background: 'var(--lp-primary-soft, rgba(110,91,255,0.08))', borderRadius: 10, border: '1px solid rgba(110,91,255,0.15)', marginBottom: 24 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                    Recommended for {ind.label}s
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--lp-fg-muted)', lineHeight: 1.5 }}>{ind.tip}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 640 }}>
                {platforms.map(entry => {
                  const def = PLATFORM_DEFS.find(d => d.id === entry.id);
                  if (!def) return null;
                  const isRecommended = ind.platforms.includes(entry.id);
                  const isGoogle = entry.id === 'google';
                  // Get error: Google uses 'google_url', others use 'platform_<id>'
                  const platformErr = isGoogle
                    ? (getFieldError('google_url') ?? getPlatformError('google'))
                    : getPlatformError(entry.id);
                  return (
                    <div
                      key={entry.id}
                      style={{
                        padding: '12px 16px', borderRadius: 12,
                        border: `1.5px solid ${platformErr ? '#EF4444' : entry.enabled ? 'var(--lp-primary)' : 'var(--lp-border)'}`,
                        background: entry.enabled ? 'var(--lp-primary-soft, rgba(110,91,255,0.04))' : 'var(--lp-surface)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: entry.enabled ? 10 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 22 }}>{def.emoji}</span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{def.name}</span>
                              {isGoogle && (
                                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, background: '#EF4444', color: '#fff', fontWeight: 600 }}>
                                  Required
                                </span>
                              )}
                              {!isGoogle && isRecommended && (
                                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, background: 'var(--lp-primary)', color: '#fff', fontWeight: 600 }}>
                                  Recommended
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                              {def.regionTags.slice(0, 5).map(r => (
                                <span key={r} style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--lp-surface-muted, rgba(0,0,0,0.05))', color: 'var(--lp-fg-muted)', fontWeight: 600 }}>{r}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* Toggle — Google always stays enabled */}
                          {!isGoogle && (
                            <button
                              onClick={() => setPlatformEnabled(entry.id, !entry.enabled)}
                              style={{
                                width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
                                background: entry.enabled ? 'var(--lp-primary)' : 'var(--lp-border)',
                                position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                              }}
                            >
                              <div style={{
                                width: 16, height: 16, borderRadius: '50%', background: '#fff',
                                position: 'absolute', top: 3,
                                left: entry.enabled ? 21 : 3,
                                transition: 'left 0.2s',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                              }} />
                            </button>
                          )}
                          {!isGoogle && (
                            <button
                              onClick={() => removePlatform(entry.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--lp-fg-muted)', padding: 2, display: 'flex' }}
                            >
                              <Icon name="x" size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      {entry.enabled && (
                        <div>
                          <Input
                            value={entry.url}
                            onChange={e => setPlatformUrl(entry.id, e.target.value)}
                            onBlur={() => touch(isGoogle ? 'google_url' : `platform_${entry.id}`)}
                            placeholder={isGoogle ? 'https://g.page/your-business or google.com/maps/place/...' : def.placeholder}
                            icon="link"
                            className={platformErr ? 'is-error' : ''}
                          />
                          {platformErr && (
                            <div style={{ fontSize: 12, color: '#EF4444', marginTop: 4 }}>{platformErr}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add more platforms */}
                {PLATFORM_DEFS.filter(d => !platforms.find(p => p.id === d.id)).length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: 'var(--lp-fg-muted)', fontWeight: 600, marginBottom: 8 }}>Add more platforms</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {PLATFORM_DEFS.filter(d => !platforms.find(p => p.id === d.id)).map(def => (
                        <button
                          key={def.id}
                          onClick={() => addPlatform(def.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', borderRadius: 8,
                            border: '1px dashed var(--lp-border)',
                            background: 'none', cursor: 'pointer',
                            fontSize: 13, color: 'var(--lp-fg)', fontWeight: 500,
                          }}
                        >
                          <span>{def.emoji}</span>
                          {def.name}
                          <div style={{ display: 'flex', gap: 3 }}>
                            {def.regionTags.slice(0, 3).map(r => (
                              <span key={r} style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'var(--lp-surface-muted, rgba(0,0,0,0.05))', color: 'var(--lp-fg-muted)' }}>{r}</span>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p style={{ fontSize: 12, color: 'var(--lp-fg-muted)', margin: '4px 0 0' }}>
                  Add your Google Review URL above — other platforms are optional.
                </p>
              </div>
            </div>
          )}

          {/* ── Step 2: Branding ──────────────────────────────── */}
          {step === 2 && (
            <div className="ob-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
                  Make it yours
                </h1>
                <p style={{ color: 'var(--lp-fg-muted)', fontSize: 15, margin: '0 0 28px', lineHeight: 1.5 }}>
                  Your brand color and initials appear on every customer review funnel.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <Field label="Brand color">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {BRAND_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => patchForm('color', c)}
                          style={{
                            width: 36, height: 36, borderRadius: 10, border: 'none',
                            background: c, cursor: 'pointer',
                            outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
                            outlineOffset: 2,
                            transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                            transition: 'all 0.15s',
                          }}
                        />
                      ))}
                    </div>
                  </Field>
                  <Field
                    label="Logo initials"
                    required
                    hint="2 letters shown in the funnel header — auto-filled from your name"
                    error={getFieldError('initials') ?? undefined}
                  >
                    <Input
                      value={form.initials}
                      maxLength={2}
                      onChange={e => patchForm('initials', e.target.value.toUpperCase())}
                      onBlur={() => touch('initials')}
                      style={{ width: 90 }}
                      placeholder={autoInitials(form.name) || 'AB'}
                      className={getFieldError('initials') ? 'is-error' : ''}
                    />
                  </Field>
                </div>
              </div>

              {/* Live preview */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lp-fg-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live preview</div>
                <FunnelPreview name={form.name} color={form.color} initials={form.initials} />
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--lp-fg-muted)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: form.color }} />
                  Selected: {form.color}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Connect Google Business (skippable) ─── */}
          {step === 3 && (
            <div style={{ maxWidth: 560 }}>
              <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
                Auto-reply to Google Reviews
              </h1>
              <p style={{ color: 'var(--lp-fg-muted)', fontSize: 15, margin: '0 0 24px', lineHeight: 1.5 }}>
                Connect your Google Business Profile so Reevo can fetch new reviews and post AI-generated
                replies on your behalf. You can always connect later from your dashboard.
              </p>

              {gbpError && (
                <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', fontSize: 13 }}>
                  {gbpError}
                </div>
              )}

              {gbpConnected ? (
                <div style={{ padding: '20px 24px', borderRadius: 14, border: '1.5px solid rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="check" size={18} style={{ color: 'var(--lp-success)' }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>Google Business Profile connected</div>
                      <div style={{ fontSize: 13, color: 'var(--lp-fg-muted)', marginTop: 2 }}>
                        Reevo will start fetching reviews and can reply automatically once you enable auto-reply.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ padding: '16px 20px', borderRadius: 14, border: '1px solid var(--lp-border)', background: 'var(--lp-surface)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        'Automatically fetch new Google reviews every 20 minutes',
                        'Generate personalised AI replies matching your tone',
                        'Post replies instantly (paid) or approve them first (free)',
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                          <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#6E5BFF', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</div>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleConnectGBP}
                    disabled={connecting}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      padding: '13px 24px', borderRadius: 10, border: 'none',
                      background: connecting ? 'var(--lp-border)' : '#fff',
                      color: connecting ? 'var(--lp-fg-muted)' : '#1f1f1f',
                      fontWeight: 600, fontSize: 14, cursor: connecting ? 'not-allowed' : 'pointer',
                      boxShadow: connecting ? 'none' : '0 1px 3px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.08)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {/* Google 'G' logo */}
                    {!connecting && (
                      <svg width={18} height={18} viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    {connecting ? 'Redirecting to Google…' : 'Connect Google Business Profile'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 4: Launch ────────────────────────────────── */}
          {step === 4 && (
            <div className="ob-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 6px' }}>
                  You&apos;re ready to launch 🚀
                </h1>
                <p style={{ color: 'var(--lp-fg-muted)', fontSize: 15, margin: '0 0 24px', lineHeight: 1.5 }}>
                  Review your setup and go. You can change everything later from the dashboard.
                </p>

                {/* Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Business */}
                  <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--lp-border)', background: 'var(--lp-surface)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lp-fg-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Business</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: form.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                        {form.initials || autoInitials(form.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{form.name}</div>
                        {form.tagline && <div style={{ fontSize: 12, color: 'var(--lp-fg-muted)', marginTop: 2 }}>{form.tagline}</div>}
                        {user.industry && <div style={{ marginTop: 4 }}><Badge tone="neutral">{ind.emoji} {ind.label}</Badge></div>}
                      </div>
                    </div>
                  </div>

                  {/* Platforms */}
                  <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--lp-border)', background: 'var(--lp-surface)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lp-fg-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Review platforms</div>
                    {platforms.filter(p => p.enabled && p.url.trim()).length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--lp-fg-muted)' }}>None set — add later from Funnel settings.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {platforms.filter(p => p.enabled && p.url.trim()).map(p => {
                          const def = PLATFORM_DEFS.find(d => d.id === p.id);
                          return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                              <span>{def?.emoji ?? '⭐'}</span>
                              <span style={{ fontWeight: 500 }}>{def?.name ?? p.id}</span>
                              <Icon name="check" size={12} style={{ color: 'var(--lp-success)', marginLeft: 2 }} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* What happens next */}
                  <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--lp-border)', background: 'var(--lp-surface)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--lp-fg-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>What happens next</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        'Business profile saved to your account',
                        'A live QR campaign is generated automatically',
                        'Download your QR from the QR Campaigns page',
                        'Place it anywhere — customers scan and review',
                      ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13 }}>
                          <span style={{ width: 20, height: 20, borderRadius: '50%', background: form.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                            {i + 1}
                          </span>
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626', fontSize: 13 }}>
                      {error}
                    </div>
                  )}
                </div>
              </div>

              {/* Funnel preview */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--lp-fg-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Funnel preview</div>
                <FunnelPreview name={form.name} color={form.color} initials={form.initials} />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Fixed bottom navigation ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', background: 'var(--lp-surface)',
        borderTop: '1px solid var(--lp-border)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
      }}>
        <button
          onClick={back}
          disabled={step === 0 || saving || launching}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: 8, border: '1px solid var(--lp-border)',
            background: 'none', cursor: step === 0 ? 'not-allowed' : 'pointer',
            fontSize: 14, fontWeight: 500, color: step === 0 ? 'var(--lp-fg-muted)' : 'var(--lp-fg)',
            opacity: step === 0 ? 0.4 : 1,
          }}
        >
          ← Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {step < STEPS.length - 1 && !canAdvance() && (
            <span style={{ fontSize: 12, color: 'var(--lp-fg-muted)' }}>
              Complete required fields to continue
            </span>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={saveAndNext}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 24px', borderRadius: 8, border: 'none',
                background: canAdvance() ? 'var(--lp-primary)' : 'var(--lp-border)',
                color: canAdvance() ? '#fff' : 'var(--lp-fg-muted)',
                fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {saving
                ? 'Saving…'
                : step === 3
                  ? gbpConnected ? <>Continue →</> : <>Skip for now →</>
                  : <>Save &amp; Continue →</>
              }
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={launching}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 32px', borderRadius: 8, border: 'none',
                background: launching ? 'var(--lp-border)' : 'var(--lp-primary)',
                color: launching ? 'var(--lp-fg-muted)' : '#fff',
                fontSize: 15, fontWeight: 700, cursor: launching ? 'not-allowed' : 'pointer',
                boxShadow: launching ? 'none' : '0 4px 16px rgba(110,91,255,0.35)',
                transition: 'all 0.15s',
              }}
            >
              {launching ? (
                <>
                  <svg width={14} height={14} viewBox="0 0 14 14" style={{ animation: 'spin 0.7s linear infinite' }}>
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" strokeDasharray="20" strokeDashoffset="10" fill="none" />
                  </svg>
                  Launching…
                </>
              ) : (
                <>🚀 Launch my dashboard</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ── Toast notification ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 20px', borderRadius: 8,
          background: '#0F172A', color: '#fff',
          fontSize: 13, fontWeight: 500, zIndex: 1000,
          animation: 'slideInUp 0.2s ease',
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInUp {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        .lp-input.is-error { border-color: #EF4444 !important; box-shadow: 0 0 0 3px rgba(239,68,68,0.1) !important; }
      `}</style>
    </div>
  );
}
