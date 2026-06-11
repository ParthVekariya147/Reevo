'use client';

import { useEffect, useState, useCallback } from 'react';
import { MdEdit, MdCheck, MdClose, MdPeople, MdAttachMoney, MdTrendingUp, MdStar, MdStarBorder } from 'react-icons/md';
import AdminTopbar from '../../_components/shell/topbar';
import PlanBadge from '../../_components/badges/plan-badge';
import type { Plan } from '@/types/admin';

interface PlanRow {
  plan: Plan;
  amount_cents: number;
  amount_cents_yearly: number | null;
  currency: string;
  label: string;
  trial_days: number | null;
  review_limit: number;
  scan_limit: number;
  campaign_limit: number;
  location_limit: number;
  auto_reply: boolean;
  is_popular: boolean;
  updated_at: string;
  business_count: number;
  mrr_cents: number;
}

// Marketing feature bullets shown on /pricing — displayed here so admin can
// see what features each plan advertises without leaving the config page.
const PLAN_FEATURES: Record<string, string[]> = {
  free:       ['1 location', '20 reviews / month', '20 scans / month', '1 QR code', 'Basic AI review suggestions', 'Standard analytics', '14-day full access, no card'],
  starter:    ['1 location', '200 reviews / month', '200 scans / month', 'Dynamic QR codes', 'AI review suggestions', 'Standard analytics', 'Custom branding'],
  growth:     ['Up to 5 locations', '500 reviews / month', '500 scans / month', 'Dynamic QR codes', 'GPT-4 review suggestions', 'Advanced funnel analytics', 'Custom branding & domain', 'Auto-reply to reviews', 'Multi-staff accounts'],
  enterprise: ['Unlimited locations', 'Unlimited reviews', 'Unlimited scans', 'Dynamic QR codes', 'AI suggestions + tone tuning', 'Cohort & device analytics', 'Custom branding & domain', 'Auto-reply to reviews', 'SSO + role-based access', 'Priority + dedicated CSM'],
};

interface DraftLimits {
  amount_cents: string;
  amount_cents_yearly: string;
  trial_days: string;
  review_limit: string;
  scan_limit: string;
  campaign_limit: string;
  location_limit: string;
  auto_reply: boolean;
}

type DraftErrors = Partial<Record<Exclude<keyof DraftLimits, 'auto_reply'>, string>>;

function validateDraft(draft: DraftLimits): DraftErrors {
  const errors: DraftErrors = {};
  const price = parseFloat(draft.amount_cents);
  if (draft.amount_cents.trim() === '' || isNaN(price) || price < 0) {
    errors.amount_cents = 'Price must be 0 or greater';
  }
  const yearly = draft.amount_cents_yearly.trim();
  if (yearly !== '') {
    const y = parseFloat(yearly);
    if (isNaN(y) || y < 0) errors.amount_cents_yearly = 'Must be 0 or greater (or leave blank for no yearly option)';
  }
  const td = draft.trial_days.trim();
  if (td !== '') {
    const n = parseInt(td, 10);
    if (isNaN(n) || n < 1) errors.trial_days = 'Must be a positive number (or leave blank)';
  }
  for (const key of ['review_limit', 'scan_limit', 'campaign_limit', 'location_limit'] as const) {
    const v = parseInt(draft[key], 10);
    if (isNaN(v) || (v !== -1 && v < 1)) errors[key] = 'Must be −1 (unlimited) or ≥ 1';
  }
  return errors;
}

function fmtMoney(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtLimit(val: number) {
  return val === -1 ? 'Unlimited' : val.toLocaleString();
}

const PLAN_ORDER: Plan[] = ['free', 'starter', 'growth', 'enterprise'];

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [draft, setDraft] = useState<DraftLimits>({ amount_cents: '', amount_cents_yearly: '', trial_days: '', review_limit: '', scan_limit: '', campaign_limit: '', location_limit: '', auto_reply: false });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [draftErrors, setDraftErrors] = useState<DraftErrors>({});
  const [togglingPopular, setTogglingPopular] = useState<Plan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/plans');
    if (res.ok) {
      const json = await res.json();
      setPlans(json.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(plan: PlanRow) {
    const initial: DraftLimits = {
      amount_cents:        (plan.amount_cents / 100).toFixed(2),
      amount_cents_yearly: plan.amount_cents_yearly != null ? (plan.amount_cents_yearly / 100).toFixed(2) : '',
      trial_days:          plan.trial_days != null ? String(plan.trial_days) : '',
      review_limit:        String(plan.review_limit),
      scan_limit:          String(plan.scan_limit),
      campaign_limit:      String(plan.campaign_limit),
      location_limit:      String(plan.location_limit),
      auto_reply:          plan.auto_reply,
    };
    setEditing(plan.plan);
    setDraft(initial);
    setDraftErrors(validateDraft(initial));
    setSaveError('');
  }

  function handleDraftChange<K extends keyof DraftLimits>(key: K, value: DraftLimits[K]) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setDraftErrors(validateDraft(next));
  }

  function cancelEdit() {
    setEditing(null);
    setDraftErrors({});
    setSaveError('');
  }

  async function togglePopular(plan: Plan, currentlyPopular: boolean) {
    if (currentlyPopular) return; // already popular — nothing to do
    setTogglingPopular(plan);
    await fetch('/api/admin/plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, is_popular: true }),
    });
    setTogglingPopular(null);
    load();
  }

  async function savePlan(plan: Plan) {
    const errors = validateDraft(draft);
    if (Object.keys(errors).length > 0) {
      setDraftErrors(errors);
      return;
    }

    const amount_cents        = Math.round(parseFloat(draft.amount_cents) * 100);
    const yearly_raw          = draft.amount_cents_yearly.trim();
    const amount_cents_yearly = yearly_raw === '' ? null : Math.round(parseFloat(yearly_raw) * 100);
    const trial_days_raw      = draft.trial_days.trim();
    const trial_days          = trial_days_raw === '' ? null : parseInt(trial_days_raw, 10);
    const review_limit        = parseInt(draft.review_limit, 10);
    const scan_limit          = parseInt(draft.scan_limit, 10);
    const campaign_limit      = parseInt(draft.campaign_limit, 10);
    const location_limit      = parseInt(draft.location_limit, 10);
    const auto_reply          = draft.auto_reply;

    setSaving(true);
    setSaveError('');
    const res = await fetch('/api/admin/plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, amount_cents, amount_cents_yearly, trial_days, review_limit, scan_limit, campaign_limit, location_limit, auto_reply }),
    });

    if (res.ok) {
      setEditing(null);
      load();
    } else {
      const j = await res.json().catch(() => ({}));
      setSaveError(j.error ?? 'Failed to save');
    }
    setSaving(false);
  }

  const totalBusinesses = plans.reduce((s, p) => s + p.business_count, 0) || 1;
  const totalMrr = plans.reduce((s, p) => s + p.mrr_cents, 0);
  const orderedPlans = PLAN_ORDER.map(p => plans.find(r => r.plan === p)).filter(Boolean) as PlanRow[];

  return (
    <>
      <AdminTopbar breadcrumbs={['Admin', 'Subscriptions', 'Plan Config']} pageTitle="Plan Configuration" />

      <main className="admin-main-pad" style={{ padding: '28px 32px', width: '100%', boxSizing: 'border-box' }}>

        {/* MRR summary strip */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          {[
            { icon: <MdAttachMoney size={18} />, label: 'Total Est. MRR', value: fmtMoney(totalMrr), accent: true },
            { icon: <MdPeople size={18} />, label: 'Total Businesses', value: totalBusinesses.toLocaleString(), accent: false },
            {
              icon: <MdTrendingUp size={18} />, label: 'Paid Ratio', accent: false,
              value: `${Math.round(((totalBusinesses - (plans.find(p => p.plan === 'free')?.business_count ?? 0)) / totalBusinesses) * 100)}%`,
            },
          ].map(item => (
            <div key={item.label} style={{
              background: item.accent ? 'var(--accent)' : 'var(--surface)',
              border: `1px solid ${item.accent ? 'transparent' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)', padding: '14px 22px',
              display: 'flex', alignItems: 'center', gap: 12, minWidth: 170,
            }}>
              <span style={{ color: item.accent ? 'rgba(255,255,255,0.8)' : 'var(--muted)' }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 11, color: item.accent ? 'rgba(255,255,255,0.7)' : 'var(--muted)', fontWeight: 500 }}>{item.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: item.accent ? '#fff' : 'var(--ink)' }}>{item.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Plan cards */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 400, borderRadius: 'var(--radius-md)', background: 'var(--surface)', border: '1px solid var(--border)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {orderedPlans.map(plan => {
              const isEditing = editing === plan.plan;
              const pct = Math.round((plan.business_count / totalBusinesses) * 100);

              return (
                <div key={plan.plan} style={{
                  background: 'var(--surface)',
                  border: `1px solid ${plan.is_popular ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-md)', padding: 22,
                  display: 'flex', flexDirection: 'column', gap: 14, position: 'relative',
                }}>
                  {plan.is_popular && (
                    <span style={{
                      position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                      background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700,
                      padding: '2px 10px', borderRadius: 100, letterSpacing: '0.05em', textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}>Most Popular</span>
                  )}

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <PlanBadge plan={plan.plan} />
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => togglePopular(plan.plan, plan.is_popular)}
                        disabled={plan.is_popular || togglingPopular !== null}
                        title={plan.is_popular ? 'This plan is Most Popular' : 'Set as Most Popular'}
                        style={{
                          background: 'none', border: 'none', cursor: plan.is_popular ? 'default' : 'pointer',
                          color: plan.is_popular ? 'var(--accent)' : 'var(--muted)',
                          padding: 4, display: 'flex', borderRadius: 6,
                          opacity: togglingPopular === plan.plan ? 0.5 : 1,
                        }}
                      >
                        {plan.is_popular ? <MdStar size={16} /> : <MdStarBorder size={16} />}
                      </button>
                      <button
                        onClick={() => isEditing ? cancelEdit() : startEdit(plan)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, display: 'flex', borderRadius: 6 }}
                        title={isEditing ? 'Cancel' : 'Edit plan'}
                      >
                        {isEditing ? <MdClose size={16} /> : <MdEdit size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div>
                    {isEditing ? (
                      <div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 18, color: 'var(--ink)', fontWeight: 700 }}>$</span>
                          <input
                            type="number" min="0" step="0.01" value={draft.amount_cents}
                            onChange={e => handleDraftChange('amount_cents', e.target.value)}
                            autoFocus
                            style={{ width: 90, padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: `1.5px solid ${draftErrors.amount_cents ? '#DC2626' : 'var(--accent)'}`, background: 'var(--bg-tint)', color: 'var(--ink)', fontSize: 16, fontWeight: 700 }}
                            onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                          />
                          <span style={{ fontSize: 13, color: 'var(--muted)' }}>/mo</span>
                        </div>
                        {draftErrors.amount_cents && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0' }}>{draftErrors.amount_cents}</p>}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>
                          {plan.amount_cents === 0 ? 'Free' : fmtMoney(plan.amount_cents, plan.currency)}
                        </span>
                        {plan.amount_cents > 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>/mo</span>}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                      Last updated {fmtDate(plan.updated_at)}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1, background: 'var(--bg-tint)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Businesses</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{plan.business_count.toLocaleString()}</div>
                    </div>
                    <div style={{ flex: 1, background: 'var(--bg-tint)', borderRadius: 'var(--radius-sm)', padding: '8px 10px' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>MRR</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: plan.mrr_cents > 0 ? 'var(--accent-ink)' : 'var(--muted-2)' }}>
                        {plan.mrr_cents > 0 ? fmtMoney(plan.mrr_cents, plan.currency) : '—'}
                      </div>
                    </div>
                  </div>

                  {/* Distribution bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>% of all users</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)' }}>{pct}%</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--border)', borderRadius: 100, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`,
                        background: plan.is_popular ? 'var(--accent)' : plan.plan === 'enterprise' ? 'linear-gradient(90deg, var(--accent), #7C3AED)' : 'var(--ink-2)',
                        borderRadius: 100, transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>

                  {/* Limits section */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Limits
                    </div>

                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {([
                          { key: 'amount_cents_yearly' as const, label: 'Yearly price', hint: 'blank = no yearly option' },
                          { key: 'trial_days' as const,          label: 'Trial days',   hint: 'blank = no trial' },
                          { key: 'review_limit' as const,        label: 'Reviews / mo', hint: '-1 = unlimited' },
                          { key: 'scan_limit' as const,          label: 'Scans / mo',   hint: '-1 = unlimited' },
                          { key: 'campaign_limit' as const,      label: 'Campaigns',    hint: '-1 = unlimited' },
                          { key: 'location_limit' as const,      label: 'Locations',    hint: '-1 = unlimited' },
                        ] as const).map(({ key, label, hint }) => (
                          <div key={key}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <label style={{ fontSize: 11, color: 'var(--muted)', width: 96, flexShrink: 0 }}>{label}</label>
                              <input
                                type="number"
                                value={draft[key] as string}
                                onChange={e => handleDraftChange(key, e.target.value as DraftLimits[typeof key])}
                                placeholder={hint}
                                style={{
                                  flex: 1, padding: '5px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  border: `1.5px solid ${draftErrors[key] ? '#DC2626' : 'var(--border)'}`,
                                  background: 'var(--bg-tint)',
                                  color: 'var(--ink)', fontSize: 13,
                                }}
                                onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
                              />
                            </div>
                            {draftErrors[key] && <p style={{ fontSize: 11, color: '#DC2626', margin: '3px 0 0', paddingLeft: 104 }}>{draftErrors[key]}</p>}
                          </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ fontSize: 11, color: 'var(--muted)', width: 96, flexShrink: 0 }}>Auto-reply</label>
                          <input
                            type="checkbox"
                            checked={draft.auto_reply}
                            onChange={e => handleDraftChange('auto_reply', e.target.checked)}
                            style={{ width: 16, height: 16, cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Enabled on this plan</span>
                        </div>

                        {saveError && <p style={{ fontSize: 11, color: '#991B1B', margin: 0 }}>{saveError}</p>}

                        <button
                          onClick={() => savePlan(plan.plan)}
                          disabled={saving || Object.keys(draftErrors).length > 0}
                          title={Object.keys(draftErrors).length > 0 ? 'Fix validation errors above' : undefined}
                          style={{
                            marginTop: 4, padding: '8px 0',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--accent)', border: 'none',
                            color: '#fff', cursor: (saving || Object.keys(draftErrors).length > 0) ? 'not-allowed' : 'pointer',
                            fontWeight: 600, fontSize: 13,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            opacity: (saving || Object.keys(draftErrors).length > 0) ? 0.55 : 1,
                          }}
                        >
                          <MdCheck size={15} /> {saving ? 'Saving…' : 'Save changes'}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[
                          { label: 'Yearly price', value: plan.amount_cents_yearly != null ? fmtMoney(plan.amount_cents_yearly, plan.currency) + '/yr' : 'No yearly option' },
                          { label: 'Trial days',   value: plan.trial_days != null ? `${plan.trial_days} days` : 'No trial' },
                          { label: 'Reviews / mo', value: fmtLimit(plan.review_limit) },
                          { label: 'Scans / mo',   value: fmtLimit(plan.scan_limit) },
                          { label: 'Campaigns',    value: fmtLimit(plan.campaign_limit) },
                          { label: 'Locations',    value: fmtLimit(plan.location_limit) },
                          { label: 'Auto-reply',   value: plan.auto_reply ? 'Enabled' : 'Disabled' },
                        ].map(({ label, value }) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</span>
                            <span style={{
                              fontSize: 12, fontWeight: 600,
                              color: value === 'Unlimited' ? 'var(--accent)' : 'var(--ink)',
                              background: value === 'Unlimited' ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg-tint)',
                              padding: '2px 8px', borderRadius: 100,
                            }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Marketing features preview */}
                  {!isEditing && (PLAN_FEATURES[plan.plan] ?? []).length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Marketing Features
                      </div>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {(PLAN_FEATURES[plan.plan] ?? []).map((f, i) => (
                          <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--ink-2)' }}>
                            <span style={{ width: 14, height: 14, borderRadius: 999, background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 9 }}>✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p style={{ marginTop: 20, fontSize: 12, color: 'var(--muted)' }}>
          Changes update <code>plan_prices</code> table and are reflected immediately. Only super_admin can edit plans.
        </p>
      </main>
    </>
  );
}
