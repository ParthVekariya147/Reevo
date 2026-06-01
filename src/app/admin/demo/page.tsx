'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { MdArrowForward, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import AdminTopbar from '../_components/shell/topbar';
import StatCard from '../_components/cards/stat-card';
import DataTable, { type Column } from '../_components/tables/data-table';
import ConfirmActionModal from '../_components/modals/confirm-action-modal';

/* ── Types ─────────────────────────────────────────────── */

type DemoRow = {
  user_id:           string;
  email:             string;
  business_id:       string;
  business_name:     string;
  demo_max_scans:    number | null;
  demo_max_reviews:  number | null;
  demo_expires_at:   string | null;
  demo_converted_at: string | null;
  current_scans:     number;
  current_reviews:   number;
  created_at:        string;
};

type DemoStatus = 'active' | 'expired' | 'converted';

const INITIAL_FORM = {
  email:              '',
  password:           '',
  business_name:      '',
  business_type:      'Other',
  google_review_link: '',
  demo_max_scans:     '15',
  demo_max_reviews:   '5',
  demo_expires_days:  '14',
};

/* ── Helpers ────────────────────────────────────────────── */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getDemoStatus(row: DemoRow): DemoStatus {
  if (row.demo_converted_at) return 'converted';
  if (row.demo_expires_at && new Date(row.demo_expires_at) < new Date()) return 'expired';
  return 'active';
}

function StatusBadge({ status }: { status: DemoStatus }) {
  const map: Record<DemoStatus, { bg: string; color: string; label: string }> = {
    active:    { bg: '#DBEAFE', color: '#1D4ED8', label: 'Active'    },
    expired:   { bg: '#FEE2E2', color: '#991B1B', label: 'Expired'   },
    converted: { bg: '#DCFCE7', color: '#15803D', label: 'Converted' },
  };
  const s = map[status];
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 4,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

function UsageCell({ current, max }: { current: number; max: number | null }) {
  const atLimit = max !== null && current >= max;
  return (
    <span style={{ color: atLimit ? '#EF4444' : 'var(--ink-2)', fontWeight: atLimit ? 700 : 400, fontSize: 13 }}>
      {current.toLocaleString()}
      <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 2 }}>
        / {max !== null ? max.toLocaleString() : '∞'}
      </span>
    </span>
  );
}

/* ── Page ───────────────────────────────────────────────── */

export default function DemoAccountsPage() {
  const [rows, setRows]         = useState<DemoRow[]>([]);
  const [myRole, setMyRole]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalOpen, setModalOpen]   = useState(false);
  const [form, setForm]             = useState(INITIAL_FORM);
  const [showPw, setShowPw]         = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState('');

  const [convertTarget, setConvertTarget] = useState<DemoRow | null>(null);
  const [converting, setConverting]       = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/demo')
      .then(res => res.ok ? res.json() : null)
      .then(json => {
        if (json) { setRows(json.data ?? []); setMyRole(json.my_role ?? ''); }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  /* ── Derived stats ────────────────────────────────────── */
  const activeCount    = rows.filter(r => getDemoStatus(r) === 'active').length;
  const convertedCount = rows.filter(r => getDemoStatus(r) === 'converted').length;
  const expiredCount   = rows.filter(r => getDemoStatus(r) === 'expired').length;

  /* ── Create demo account ──────────────────────────────── */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    if (!form.email || !form.password || !form.business_name || !form.google_review_link) {
      setFormError('Email, password, business name, and Google review link are required.');
      return;
    }
    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:              form.email.trim(),
          password:           form.password,
          business_name:      form.business_name.trim(),
          business_type:      form.business_type,
          google_review_link: form.google_review_link.trim(),
          demo_max_scans:     form.demo_max_scans  ? Number(form.demo_max_scans)  : null,
          demo_max_reviews:   form.demo_max_reviews ? Number(form.demo_max_reviews) : null,
          demo_expires_days:  form.demo_expires_days === 'never' ? 0 : Number(form.demo_expires_days),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? 'Failed to create demo account'); return; }
      toast.success('Demo account created');
      setModalOpen(false);
      setForm(INITIAL_FORM);
      setRefreshKey(k => k + 1);
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Login as user ────────────────────────────────────── */
  async function handleLoginAs(row: DemoRow) {
    try {
      const res  = await fetch(`/api/admin/demo/${row.user_id}/login-as`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Failed to generate link'); return; }
      if (data.link) window.open(data.link, '_blank');
      else toast.error('No link returned');
    } catch {
      toast.error('Network error. Please try again.');
    }
  }

  /* ── Convert to full ──────────────────────────────────── */
  async function handleConvert() {
    if (!convertTarget) return;
    setConverting(true);
    try {
      const res  = await fetch(`/api/admin/demo/${convertTarget.business_id}/convert`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'Convert failed'); return; }
      toast.success(`${convertTarget.email} converted to full account`);
      setConvertTarget(null);
      setRefreshKey(k => k + 1);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setConverting(false);
    }
  }

  /* ── Table columns ────────────────────────────────────── */
  const columns: Column<DemoRow>[] = [
    {
      key: 'email', header: 'Email / Business', width: '220px',
      render: r => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.email}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.business_name}</div>
        </div>
      ),
    },
    {
      key: 'scans', header: 'Scans Used', width: '110px',
      render: r => <UsageCell current={r.current_scans} max={r.demo_max_scans}/>,
    },
    {
      key: 'reviews', header: 'Reviews Used', width: '120px',
      render: r => <UsageCell current={r.current_reviews} max={r.demo_max_reviews}/>,
    },
    {
      key: 'expires', header: 'Expires', width: '120px',
      render: r => (
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {r.demo_expires_at ? fmtDate(r.demo_expires_at) : '—'}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status', width: '100px',
      render: r => <StatusBadge status={getDemoStatus(r)}/>,
    },
    {
      key: 'actions', header: 'Actions', width: '240px',
      render: r => (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {myRole === 'super_admin' && !r.demo_converted_at && (
            <button
              onClick={() => handleLoginAs(r)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--ink-2)', cursor: 'pointer',
              }}
            >
              Login as
            </button>
          )}
          {!r.demo_converted_at && (
            <button
              onClick={() => setConvertTarget(r)}
              style={{
                fontSize: 11, fontWeight: 600, padding: '4px 10px',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                background: 'var(--surface)', color: '#15803D', cursor: 'pointer',
              }}
            >
              Convert
            </button>
          )}
          <Link
            href={`/admin/businesses/${r.business_id}`}
            style={{
              fontSize: 11, fontWeight: 500, color: 'var(--accent)', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 2,
            }}
          >
            View <MdArrowForward size={11}/>
          </Link>
        </div>
      ),
    },
  ];

  /* ── Shared input style ───────────────────────────────── */
  const inputSx: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--surface)',
    color: 'var(--ink)', fontSize: 13,
  };
  const labelSx: React.CSSProperties = {
    display: 'block', marginBottom: 6,
    fontSize: 11, fontWeight: 600, color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  /* ── Render ───────────────────────────────────────────── */
  return (
    <>
      <AdminTopbar
        breadcrumbs={['Admin', 'Demo Accounts']}
        pageTitle="Demo Accounts"
        actions={(
          <button
            onClick={() => { setModalOpen(true); setFormError(''); setForm(INITIAL_FORM); }}
            style={{
              padding: '7px 16px', borderRadius: 'var(--radius-sm)',
              border: 'none', background: 'var(--accent, #6366F1)',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            + Create Demo Account
          </button>
        )}
      />

      <main className="admin-main-pad" style={{ padding: '28px 32px', width: '100%', boxSizing: 'border-box' }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard label="Total Demos"    value={rows.length}    hero/>
          <StatCard label="Active"         value={activeCount}/>
          <StatCard label="Converted"      value={convertedCount}/>
          <StatCard label="Expired"        value={expiredCount}/>
        </div>

        {/* Table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={r => r.business_id}
            loading={loading}
            emptyMessage="No demo accounts yet. Create one to get started."
          />
        </div>
      </main>

      {/* ── Confirm convert modal ── */}
      <ConfirmActionModal
        open={!!convertTarget}
        title={`Convert ${convertTarget?.email ?? ''} to full account?`}
        description="This will remove all demo restrictions. The user will have a regular free account and can upgrade on their own. This cannot be undone."
        confirmLabel="Convert to Full"
        loading={converting}
        onConfirm={handleConvert}
        onCancel={() => setConvertTarget(null)}
      />

      {/* ── Create demo account modal ── */}
      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { if (!submitting) setModalOpen(false); }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}/>
          <div
            style={{
              position: 'relative', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
              padding: '28px 32px', width: 520, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 20px', fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>
              Create Demo Account
            </h2>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelSx}>Email <span style={{ color: '#EF4444' }}>*</span></label>
                  <input
                    type="email" required value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="demo@example.com"
                    style={inputSx}
                  />
                </div>

                <div>
                  <label style={labelSx}>Password <span style={{ color: '#EF4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'} required minLength={8}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Min 8 characters"
                      style={{ ...inputSx, paddingRight: 36 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0,
                      }}
                    >
                      {showPw ? <MdVisibilityOff size={16}/> : <MdVisibility size={16}/>}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelSx}>Business Name <span style={{ color: '#EF4444' }}>*</span></label>
                  <input
                    type="text" required value={form.business_name}
                    onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
                    placeholder="Acme Coffee"
                    style={inputSx}
                  />
                </div>

                <div>
                  <label style={labelSx}>Business Type</label>
                  <select
                    value={form.business_type}
                    onChange={e => setForm(f => ({ ...f, business_type: e.target.value }))}
                    style={{ ...inputSx, cursor: 'pointer' }}
                  >
                    <option value="Café">Café</option>
                    <option value="Restaurant">Restaurant</option>
                    <option value="Salon">Salon</option>
                    <option value="Retail">Retail</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelSx}>Google Review Link <span style={{ color: '#EF4444' }}>*</span></label>
                <input
                  type="url" required value={form.google_review_link}
                  onChange={e => setForm(f => ({ ...f, google_review_link: e.target.value }))}
                  placeholder="https://g.page/r/…/review"
                  style={inputSx}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                <div>
                  <label style={labelSx}>Max Scans</label>
                  <input
                    type="number" min={1} value={form.demo_max_scans}
                    onChange={e => setForm(f => ({ ...f, demo_max_scans: e.target.value }))}
                    style={inputSx}
                  />
                </div>
                <div>
                  <label style={labelSx}>Max Reviews</label>
                  <input
                    type="number" min={1} value={form.demo_max_reviews}
                    onChange={e => setForm(f => ({ ...f, demo_max_reviews: e.target.value }))}
                    style={inputSx}
                  />
                </div>
                <div>
                  <label style={labelSx}>Expires In</label>
                  <select
                    value={form.demo_expires_days}
                    onChange={e => setForm(f => ({ ...f, demo_expires_days: e.target.value }))}
                    style={{ ...inputSx, cursor: 'pointer' }}
                  >
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30">30 days</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>

              {formError && (
                <p style={{ margin: 0, fontSize: 12, color: '#EF4444' }}>{formError}</p>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '8px 18px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', background: 'var(--surface)',
                    color: 'var(--ink-2)', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 20px', borderRadius: 'var(--radius-sm)',
                    border: 'none', background: 'linear-gradient(135deg,#6E5BFF 0%,#2F7DFB 100%)',
                    color: '#fff', fontSize: 13, fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
