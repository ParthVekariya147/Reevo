'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Icon, Card, CardHeader, Btn, Badge, Avatar, Field, Input, Select, Switch, StarRating } from '../ui';

const SecuritySection = dynamic(() => import('./ScreenSettingsSecurity'), {
  ssr: false,
  loading: () => <div style={{ height: 200, background: 'var(--surface-2)', borderRadius: 8 }} />,
});

// ── types ─────────────────────────────────────────────────────

type ReviewLength = 'short' | 'medium' | 'long';

interface Business {
  id:                       string;
  name:                     string;
  tagline:                  string | null;
  google_link:              string | null;
  brand_color:              string;
  logo_initials:            string;
  min_rating_for_google:    number;
  language:                 string;
  plan:                     string;
  review_length_preference: string[];
  instagram_handle:         string | null;
}

interface UserInfo { id: string; email: string; full_name: string }

interface Props {
  initialBusiness: Business | null;
  user:            UserInfo;
}

// ── helpers ───────────────────────────────────────────────────

const INSTAGRAM_RE = /^[a-z0-9._]{1,30}$/i;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

async function patchBusiness(updates: Partial<Business>): Promise<boolean> {
  const res = await fetch('/api/businesses', {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(updates),
  });
  return res.ok;
}

// ── page header ───────────────────────────────────────────────

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

function NotifPref({ title, sub, defaultOn = false }: { title: string; sub: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="lp-flex lp-flex-between" style={{ alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 13 }}>{title}</div>
        <div className="lp-muted" style={{ fontSize: 11 }}>{sub}</div>
      </div>
      <Switch checked={on} onChange={setOn} />
    </div>
  );
}

const SECTIONS = [
  { v: 'profile',  label: 'Business profile',    icon: 'building' },
  { v: 'brand',    label: 'Branding',            icon: 'sparkles' },
  { v: 'funnel',   label: 'Funnel defaults',     icon: 'funnel'   },
  { v: 'notifs',   label: 'Notifications',       icon: 'bell'     },
  { v: 'team',     label: 'Team access',         icon: 'team'     },
  { v: 'security', label: 'Security',            icon: 'shield'   },
  { v: 'api',      label: 'API & webhooks',      icon: 'key'      },
  { v: 'billing',  label: 'Billing preferences', icon: 'card'     },
] as const;

const BRAND_COLORS = ['#6E5BFF','#8B5CF6','#06B6D4','#10B981','#F59E0B','#EF4444','#0F172A'];

const REVIEW_LENGTH_OPTIONS: {
  value:       ReviewLength;
  label:       string;
  wordRange:   string;
  description: string;
  sample:      string;
}[] = [
  {
    value:       'short',
    label:       'Short',
    wordRange:   '15–30 words',
    description: '1–2 sentences — punchy and quick to read',
    sample:      '"Amazing service and super friendly staff. Will definitely be coming back!"',
  },
  {
    value:       'medium',
    label:       'Medium',
    wordRange:   '40–70 words',
    description: '3–4 sentences — balanced with one specific detail',
    sample:      '"Really great experience from start to finish. The team was attentive and the whole process felt effortless. Loved the attention to detail — it\'s clear they genuinely care. Highly recommend to anyone looking for quality."',
  },
  {
    value:       'long',
    label:       'Long',
    wordRange:   '80–150 words',
    description: '5–7 sentences — rich with 2–3 specific details',
    sample:      '"I\'ve been coming here for a while now and it just keeps getting better. From the moment you walk in, you feel genuinely welcomed — not in a scripted way, but in a way that feels real. The [service] was exceptional as always, and this visit they went above and beyond with [detail]. What I appreciate most is the consistency; you always know what you\'re going to get. The staff clearly take pride in their work and it shows in every interaction. If you haven\'t tried them yet, you\'re genuinely missing out."',
  },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French'  },
  { value: 'de', label: 'German'  },
];

// ── main component ────────────────────────────────────────────

export default function ScreenSettings({ initialBusiness, user }: Props) {
  const [section,   setSection]   = useState('profile');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const [instagramError, setInstagramError] = useState('');

  // Single form state covering all editable business fields
  const [form, setForm] = useState({
    name:                     initialBusiness?.name                     ?? '',
    tagline:                  initialBusiness?.tagline                  ?? '',
    google_link:              initialBusiness?.google_link              ?? '',
    brand_color:              initialBusiness?.brand_color              ?? '#6E5BFF',
    logo_initials:            initialBusiness?.logo_initials            ?? '',
    min_rating_for_google:    initialBusiness?.min_rating_for_google    ?? 4,
    language:                 initialBusiness?.language                 ?? 'en',
    review_length_preference: (initialBusiness?.review_length_preference ?? ['short', 'medium']) as ReviewLength[],
    instagram_handle:         initialBusiness?.instagram_handle         ?? '',
  });

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setSaveState('idle');
  }

  function toggleLength(len: ReviewLength) {
    setForm(f => {
      const current = f.review_length_preference;
      const next = current.includes(len)
        ? current.filter(v => v !== len)
        : [...current, len];
      // Always keep at least one option selected
      return { ...f, review_length_preference: next.length > 0 ? next : current };
    });
    setSaveState('idle');
  }

  async function save() {
    setSaveState('saving');
    const payload = {
      ...form,
      instagram_handle: form.instagram_handle.trim() || null,
    };
    const ok = await patchBusiness(payload);
    setSaveState(ok ? 'saved' : 'error');
    if (ok) setTimeout(() => setSaveState('idle'), 2500);
  }

  const saveLabel =
    saveState === 'saving' ? 'Saving…' :
    saveState === 'saved'  ? 'Saved!'  :
    saveState === 'error'  ? 'Error'   : 'Save changes';

  return (
    <div className="lp-page">
      <PageHeader
        title="Settings"
        sub="Account, business and dashboard preferences"
        actions={
          <Btn
            variant="primary"
            icon="check"
            onClick={save}
          >
            {saveLabel}
          </Btn>
        }
      />

      <div className="lp-grid" style={{ gridTemplateColumns: '220px minmax(0,1fr)', gap: 16, alignItems: 'start' }}>
        <Card padded={false} className="lp-sett-nav">
          {SECTIONS.map(s => (
            <button key={s.v} onClick={() => setSection(s.v)} className={`lp-sett-nav-item ${section === s.v ? 'is-on' : ''}`}>
              <Icon name={s.icon} size={15} />
              <span>{s.label}</span>
            </button>
          ))}
        </Card>

        <div className="lp-stack">
          {section === 'profile' && (
            <>
              <Card>
                <CardHeader title="Business profile" subtitle="Public details about your business" />
                <div className="lp-grid lp-grid-2" style={{ gap: 14 }}>
                  <Field label="Business name">
                    <Input value={form.name} onChange={e => set('name', e.target.value)} />
                  </Field>
                  <Field label="Language">
                    <Select value={form.language} options={LANGUAGES} onChange={v => set('language', v)} />
                  </Field>
                  <Field label="Google review URL" hint="Destination for completed 4★+ funnels">
                    <Input value={form.google_link} onChange={e => set('google_link', e.target.value)} icon="link" />
                  </Field>
                  <Field label="Tagline">
                    <Input value={form.tagline} onChange={e => set('tagline', e.target.value)} />
                  </Field>
                  <Field label="Instagram handle" hint="Shown on the thank-you screen after review">
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        position:      'absolute',
                        left:          10,
                        fontSize:      14,
                        color:         'var(--lp-fg-muted, #94a3b8)',
                        pointerEvents: 'none',
                        userSelect:    'none',
                      }}>@</span>
                      <Input
                        value={form.instagram_handle}
                        style={{ paddingLeft: 24 }}
                        onChange={e => {
                          const v = e.target.value.replace(/^@/, '').toLowerCase();
                          set('instagram_handle', v);
                          setInstagramError('');
                        }}
                        onBlur={() => {
                          const v = form.instagram_handle;
                          if (v && !INSTAGRAM_RE.test(v)) {
                            setInstagramError('Letters, numbers, dots and underscores only (max 30 chars)');
                          } else {
                            setInstagramError('');
                          }
                        }}
                      />
                    </div>
                    {instagramError && (
                      <div style={{ fontSize: 12, color: 'var(--lp-danger, #ef4444)', marginTop: 4 }}>
                        {instagramError}
                      </div>
                    )}
                  </Field>
                </div>
              </Card>
              <Card>
                <CardHeader title="Owner account" />
                <div className="lp-grid lp-grid-2" style={{ gap: 14 }}>
                  <Field label="Full name"><Input defaultValue={user.full_name || user.email.split('@')[0]} /></Field>
                  <Field label="Email"><Input defaultValue={user.email} /></Field>
                </div>
              </Card>
            </>
          )}

          {section === 'brand' && (
            <Card>
              <CardHeader title="Branding" subtitle="How your business appears on customer review funnels" />
              <Field label="Logo initials" hint="Shown in the funnel header when no logo is uploaded">
                <Input value={form.logo_initials} maxLength={2} onChange={e => set('logo_initials', e.target.value.toUpperCase())} style={{ width: 80 }} />
              </Field>
              <Field label="Brand color">
                <div className="lp-color-row">
                  {BRAND_COLORS.map(c => (
                    <button
                      key={c}
                      className={`lp-color-sw ${form.brand_color === c ? 'is-on' : ''}`}
                      style={{ background: c }}
                      onClick={() => set('brand_color', c)}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Tagline">
                <Input value={form.tagline} onChange={e => set('tagline', e.target.value)} />
              </Field>
            </Card>
          )}

          {section === 'funnel' && (
            <>
              <Card>
                <CardHeader title="Funnel defaults" subtitle="Applied to all new funnels" />
                <Field label="Language">
                  <Select value={form.language} options={LANGUAGES} onChange={v => set('language', v)} />
                </Field>
                <Field label="Star threshold for Google redirect" hint="Ratings at or above this score redirect to Google — lower ratings are captured privately">
                  <div className="lp-flex" style={{ gap: 10, alignItems: 'center', marginTop: 4 }}>
                    <StarRating value={form.min_rating_for_google} readonly />
                    <Select
                      value={String(form.min_rating_for_google)}
                      options={[
                        { value: '3', label: '3★ and above' },
                        { value: '4', label: '4★ and above' },
                        { value: '5', label: '5★ only'      },
                      ]}
                      onChange={v => set('min_rating_for_google', parseInt(v))}
                    />
                  </div>
                </Field>
              </Card>

              <Card>
                <CardHeader
                  title="Review length"
                  subtitle="AI-generated reviews will randomly use one of the selected lengths, giving your customers natural variety"
                />
                <div className="lp-stack" style={{ gap: 10 }}>
                  {REVIEW_LENGTH_OPTIONS.map(opt => {
                    const active = form.review_length_preference.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => toggleLength(opt.value)}
                        style={{
                          display:       'flex',
                          alignItems:    'center',
                          gap:           12,
                          padding:       '11px 14px',
                          borderRadius:  8,
                          border:        `1.5px solid ${active ? 'var(--lp-accent, #6E5BFF)' : 'var(--lp-border, #e2e8f0)'}`,
                          background:    active ? 'var(--lp-accent-soft, rgba(110,91,255,.08))' : 'transparent',
                          cursor:        'pointer',
                          textAlign:     'left',
                          transition:    'border-color .15s, background .15s',
                          width:         '100%',
                        }}
                      >
                        {/* Checkbox indicator */}
                        <span style={{
                          width:        18,
                          height:       18,
                          borderRadius: 4,
                          border:       `1.5px solid ${active ? 'var(--lp-accent, #6E5BFF)' : 'var(--lp-fg-muted, #94a3b8)'}`,
                          background:   active ? 'var(--lp-accent, #6E5BFF)' : 'transparent',
                          display:      'flex',
                          alignItems:   'center',
                          justifyContent: 'center',
                          flexShrink:   0,
                          transition:   'background .15s, border-color .15s',
                        }}>
                          {active && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>

                        {/* Label + description */}
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{
                            display:    'block',
                            fontSize:   13,
                            fontWeight: 600,
                            color:      active ? 'var(--lp-accent, #6E5BFF)' : 'var(--lp-fg, inherit)',
                          }}>
                            {opt.label}
                          </span>
                          <span style={{
                            display:  'block',
                            fontSize: 11,
                            color:    'var(--lp-fg-muted, #94a3b8)',
                            marginTop: 2,
                          }}>
                            {opt.description}
                          </span>
                        </span>

                        {/* Sample preview pill */}
                        <span style={{
                          fontSize:      10,
                          padding:       '2px 8px',
                          borderRadius:  20,
                          background:    active ? 'var(--lp-accent, #6E5BFF)' : 'var(--lp-surface-2, #f1f5f9)',
                          color:         active ? '#fff' : 'var(--lp-fg-muted, #94a3b8)',
                          whiteSpace:    'nowrap',
                          flexShrink:    0,
                          transition:    'background .15s, color .15s',
                        }}>
                          {opt.wordRange}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sample preview for each length */}
                <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8, background: 'var(--lp-surface-2, #f8fafc)', border: '1px solid var(--lp-border, #e2e8f0)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--lp-fg-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                    Sample previews
                  </div>
                  <div className="lp-stack" style={{ gap: 8 }}>
                    {REVIEW_LENGTH_OPTIONS.filter(o => form.review_length_preference.includes(o.value)).map(opt => (
                      <div key={opt.value} style={{ fontSize: 12, color: 'var(--lp-fg-muted)' }}>
                        <span style={{ fontWeight: 600, color: 'var(--lp-accent, #6E5BFF)', marginRight: 6 }}>{opt.label}:</span>
                        {opt.sample}
                      </div>
                    ))}
                    {form.review_length_preference.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--lp-fg-muted)' }}>Select at least one length above.</div>
                    )}
                  </div>
                </div>
              </Card>
            </>
          )}

          {section === 'notifs' && (
            <Card>
              <CardHeader title="Notification preferences" />
              <div className="lp-stack" style={{ gap: 12 }}>
                <NotifPref title="New 5★ reviews"           sub="Push + email"    defaultOn />
                <NotifPref title="Low ratings captured"     sub="Email only"      defaultOn />
                <NotifPref title="Quota alerts"             sub="Email + SMS"     defaultOn />
                <NotifPref title="Funnel performance digest" sub="Weekly summary" />
                <NotifPref title="Team activity"            sub="Push" />
                <NotifPref title="Billing & invoices"       sub="Email"           defaultOn />
                <NotifPref title="Product updates"          sub="Email" />
              </div>
            </Card>
          )}

          {section === 'team' && (
            <>
              <Card>
                <CardHeader title="Team members" subtitle="Manage who has access to this dashboard" action={<Btn variant="primary" icon="plus" size="sm">Invite member</Btn>} />
                <table className="lp-table lp-table-tight">
                  <thead><tr><th>Member</th><th>Role</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {[
                      { name: user.full_name || user.email.split('@')[0], email: user.email, role: 'Owner', status: 'active' },
                    ].map(m => (
                      <tr key={m.email}>
                        <td>
                          <div className="lp-tcell-main">
                            <Avatar name={m.name} size={28} />
                            <div>
                              <div className="lp-tcell-name">{m.name}</div>
                              <div className="lp-tcell-sub">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><Badge tone="primary">Owner</Badge></td>
                        <td><Badge tone="success" dot>active</Badge></td>
                        <td />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}

          {section === 'security' && (
            <SecuritySection userEmail={user.email} />
          )}

          {section === 'api' && (
            <Card>
              <CardHeader title="API & webhooks" subtitle="Coming in a future update" />
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--lp-fg-muted)', fontSize: 13 }}>
                API key management and webhook configuration will be available soon.
              </div>
            </Card>
          )}

          {section === 'billing' && (
            <Card>
              <CardHeader title="Billing preferences" subtitle="Billing & subscription management coming soon" />
              <Field label="Billing email"><Input defaultValue={user.email} icon="mail" disabled /></Field>
              <div style={{ fontSize: 13, color: 'var(--lp-fg-muted)', padding: '8px 0' }}>
                Full subscription management, plan upgrades, and invoice history will be available in a future update.
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
