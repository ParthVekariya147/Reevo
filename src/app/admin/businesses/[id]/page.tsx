'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { MdArrowBack, MdBlock, MdCheckCircle } from 'react-icons/md';
import AdminTopbar from '../../_components/shell/topbar';
import StatCard from '../../_components/cards/stat-card';
import PlanBadge from '../../_components/badges/plan-badge';
import StatusBadge from '../../_components/badges/status-badge';
import ConfirmActionModal from '../../_components/modals/confirm-action-modal';
import type { Plan, QRStatus, InvoiceStatus } from '@/types/admin';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtMoney(cents: number, currency = 'usd') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

type QRCode = {
  id: string; campaign_name: string; token: string; status: QRStatus;
  scan_count: number; created_at: string;
};
type Invoice = {
  id: string; amount_cents: number; currency: string;
  status: InvoiceStatus; provider_inv_id: string | null; pdf_url: string | null; created_at: string;
};
type Sub = {
  id: string; plan: Plan; status: string;
  current_period_end: string | null; cancel_at_end: boolean;
  provider: string | null; provider_id: string | null;
  invoices: Invoice[];
};
type AuditEntry = { id: string; action: string; actor_email: string | null; meta: Record<string, unknown> | null; created_at: string };
type BizDetail = {
  id: string; name: string; owner_id: string; owner_email: string; plan: Plan;
  plan_expires_at: string | null;
  suspended_at: string | null; suspended_reason: string | null;
  google_link: string | null; created_at: string; scans_30d: number;
  qr_codes: QRCode[]; subscription: Sub | null; audit_logs: AuditEntry[];
  is_demo: boolean;
  demo_max_scans:       number | null;
  demo_max_reviews:     number | null;
  demo_expires_at:      string | null;
  demo_current_scans:   number;
  demo_current_reviews: number;
};

type TabId = 'overview' | 'campaigns' | 'subscription' | 'audit';

export default function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [biz, setBiz] = useState<BizDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('overview');
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspending, setSuspending] = useState(false);
  const [planChanging, setPlanChanging]   = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [newPlan, setNewPlan]             = useState<Plan | ''>('');
  const [newExpiry, setNewExpiry]         = useState(''); // ISO date string YYYY-MM-DD or ''
  const [convertingDemo, setConvertingDemo] = useState(false);
  const [convertOpen, setConvertOpen]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/businesses/${id}`);
    if (res.ok) setBiz(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSuspend() {
    if (!biz) return;
    setSuspending(true);
    await fetch(`/api/admin/businesses/${id}/suspend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suspend: !biz.suspended_at, reason: suspendReason }),
    });
    setSuspending(false);
    setSuspendOpen(false);
    setSuspendReason('');
    load();
  }

  function openPlanModal() {
    if (!biz) return;
    setNewPlan(biz.plan);
    // pre-fill expiry if already set — convert to YYYY-MM-DD for date input
    setNewExpiry(biz.plan_expires_at ? biz.plan_expires_at.slice(0, 10) : '');
    setPlanModalOpen(true);
  }

  async function handlePlanChange() {
    if (!newPlan) return;
    setPlanChanging(true);
    try {
      const body: Record<string, unknown> = {
        plan: newPlan,
        plan_expires_at: newExpiry
          ? new Date(newExpiry + 'T23:59:59').toISOString()
          : null,
      };
      const res  = await fetch(`/api/admin/businesses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update plan');
        return;
      }
      if (data.warning) {
        toast.warning(data.warning, { duration: 10000, description: 'Check audit logs for details.' });
      } else {
        toast.success(`Plan updated to ${newPlan}${newExpiry ? ` (expires ${newExpiry})` : ' (permanent)'}`);
      }
      setPlanModalOpen(false);
      setNewPlan('');
      setNewExpiry('');
      load();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setPlanChanging(false);
    }
  }

  async function handleConvertDemo() {
    if (!biz) return;
    setConvertingDemo(true);
    try {
      const res  = await fetch(`/api/admin/demo/${id}/convert`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to convert account');
        return;
      }
      toast.success('Account converted to full access');
      setConvertOpen(false);
      load();
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setConvertingDemo(false);
    }
  }

  const TABS: { id: TabId; label: string }[] = [
    { id: 'overview',     label: 'Overview'     },
    { id: 'campaigns',    label: 'QR Campaigns'  },
    { id: 'subscription', label: 'Subscription'  },
    { id: 'audit',        label: 'Audit Log'     },
  ];

  return (
    <>
      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .biz-stat-grid{display:grid;gap:12px;grid-template-columns:repeat(2,1fr)}
        @media(min-width:640px){.biz-stat-grid{grid-template-columns:repeat(4,1fr)}}
        .biz-tabs{display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:20px;overflow-x:auto;-webkit-overflow-scrolling:touch}
        .biz-tabs::-webkit-scrollbar{height:3px}
        .biz-tabs::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:2px}
      `}</style>
      <AdminTopbar
        breadcrumbs={['Admin', 'Businesses', biz?.name ?? '…']}
        pageTitle={biz?.name ?? 'Loading…'}
        actions={biz ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={openPlanModal}
              style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Manage plan
            </button>
            <button
              onClick={() => setSuspendOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                background: 'var(--surface)', color: biz.suspended_at ? '#15803D' : '#991B1B',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {biz.suspended_at ? <><MdCheckCircle size={14}/>Unsuspend</> : <><MdBlock size={14}/>Suspend</>}
            </button>
          </div>
        ) : undefined}
      />

      <main className="admin-main-pad" style={{ padding: '24px 32px', width: '100%', boxSizing: 'border-box' }}>
        <Link href="/admin/businesses" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--muted)', textDecoration: 'none', marginBottom: 20 }}>
          <MdArrowBack size={14}/> Back to businesses
        </Link>

        {loading ? (
          <div style={{ height: 200, background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.4s infinite' }}/>
        ) : !biz ? (
          <div style={{ color: 'var(--muted)', fontSize: 14 }}>Business not found.</div>
        ) : (
          <>
            {/* Header info */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px 24px', marginBottom: 20, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Owner</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{biz.owner_email}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Plan</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PlanBadge plan={biz.subscription?.plan ?? biz.plan}/>
                  {biz.plan_expires_at && (() => {
                    const expired = new Date(biz.plan_expires_at) < new Date();
                    return (
                      <span style={{ fontSize: 11, color: expired ? '#991B1B' : '#92400E', background: expired ? '#FEE2E2' : '#FEF3C7', padding: '2px 6px', borderRadius: 4 }}>
                        {expired ? 'Expired' : `Until ${fmtDate(biz.plan_expires_at)}`}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Status</div>
                <StatusBadge status={biz.suspended_at ? 'suspended' : (biz.subscription?.status ?? 'active')}/>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Created</div>
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{fmtDate(biz.created_at)}</div>
              </div>
              {biz.google_link && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Google link</div>
                  <a href={biz.google_link} target="_blank" rel="noopener" style={{ fontSize: 12, color: 'var(--accent)' }}>View →</a>
                </div>
              )}
            </div>

            {biz.suspended_at && (
              <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 'var(--radius-sm)', background: '#FEE2E2', color: '#991B1B', fontSize: 13 }}>
                Suspended on {fmtDate(biz.suspended_at)}{biz.suspended_reason ? ` · Reason: ${biz.suspended_reason}` : ''}
              </div>
            )}

            {/* Tabs */}
            <div className="biz-tabs" style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding: '9px 18px', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                  color: tab === t.id ? 'var(--accent)' : 'var(--muted)',
                  borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
                  border: 'none', background: 'transparent', cursor: 'pointer', marginBottom: -1,
                }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {tab === 'overview' && (
              <div>
                <div className="biz-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                  <StatCard label="Total QR Campaigns" value={biz.qr_codes.length}/>
                  <StatCard label="Live Campaigns"      value={biz.qr_codes.filter(q => q.status === 'live').length}/>
                  <StatCard label="Scans (30d)"         value={biz.scans_30d.toLocaleString()} hero/>
                  <StatCard label="Plan"                value={biz.subscription?.plan?.toUpperCase() ?? biz.plan.toUpperCase()}/>
                </div>

                {biz.is_demo && (() => {
                  const demoExpired = biz.demo_expires_at && new Date(biz.demo_expires_at) < new Date();
                  const scanPct  = biz.demo_max_scans   ? Math.min(100, (biz.demo_current_scans   / biz.demo_max_scans)   * 100) : 0;
                  const revPct   = biz.demo_max_reviews ? Math.min(100, (biz.demo_current_reviews / biz.demo_max_reviews) * 100) : 0;
                  const barColor = (pct: number) => pct >= 100 ? '#EF4444' : 'var(--accent)';
                  return (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px 24px', marginTop: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>Demo Account</div>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                          background: demoExpired ? '#FEE2E2' : '#DCFCE7',
                          color:      demoExpired ? '#991B1B' : '#15803D',
                        }}>
                          {demoExpired ? 'Expired' : 'Active'}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Scans used / max</div>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>
                            {biz.demo_current_scans.toLocaleString()}
                            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 4 }}>
                              / {biz.demo_max_scans?.toLocaleString() ?? '∞'}
                            </span>
                          </div>
                          {biz.demo_max_scans && (
                            <div style={{ marginTop: 5, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: barColor(scanPct), borderRadius: 2, width: `${scanPct}%`, transition: 'width 0.3s' }}/>
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Reviews used / max</div>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>
                            {biz.demo_current_reviews.toLocaleString()}
                            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginLeft: 4 }}>
                              / {biz.demo_max_reviews?.toLocaleString() ?? '∞'}
                            </span>
                          </div>
                          {biz.demo_max_reviews && (
                            <div style={{ marginTop: 5, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', background: barColor(revPct), borderRadius: 2, width: `${revPct}%`, transition: 'width 0.3s' }}/>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                        Expires: <strong style={{ color: 'var(--ink-2)' }}>{biz.demo_expires_at ? fmtDate(biz.demo_expires_at) : 'Never'}</strong>
                      </div>

                      <button
                        onClick={() => setConvertOpen(true)}
                        disabled={convertingDemo}
                        style={{
                          padding: '7px 14px', borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--accent)', background: 'transparent',
                          color: 'var(--accent)', fontSize: 12, fontWeight: 600,
                          cursor: convertingDemo ? 'wait' : 'pointer',
                          opacity: convertingDemo ? 0.6 : 1,
                        }}
                      >
                        {convertingDemo ? 'Converting…' : 'Convert to Full Account'}
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* QR Campaigns tab */}
            {tab === 'campaigns' && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-strong)' }}>
                      {['Campaign', 'Token', 'Status', 'Scans', 'Created'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {biz.qr_codes.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No QR campaigns</td></tr>
                    ) : biz.qr_codes.map(q => (
                      <tr key={q.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{q.campaign_name}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{q.token}</td>
                        <td style={{ padding: '12px 16px' }}><StatusBadge status={q.status}/></td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--ink-2)' }}>{q.scan_count.toLocaleString()}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>{fmtDate(q.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Subscription tab */}
            {tab === 'subscription' && biz.subscription && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '20px 24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                    <div><div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Plan</div><PlanBadge plan={biz.subscription.plan}/></div>
                    <div><div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Status</div><StatusBadge status={biz.subscription.status}/></div>
                    <div><div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Period end</div><div style={{ fontSize: 13 }}>{biz.subscription.current_period_end ? fmtDate(biz.subscription.current_period_end) : '—'}</div></div>
                    <div><div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Cancel at end</div><div style={{ fontSize: 13, color: biz.subscription.cancel_at_end ? '#991B1B' : 'var(--ink-2)' }}>{biz.subscription.cancel_at_end ? 'Yes' : 'No'}</div></div>
                  </div>
                  {biz.subscription.provider && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Provider: {biz.subscription.provider}</span>
                      {biz.subscription.provider_id && <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 12 }}>ID: {biz.subscription.provider_id}</span>}
                    </div>
                  )}
                  {!biz.subscription.provider && (
                    <div style={{ marginTop: 16, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', fontSize: 12, color: 'var(--muted)' }}>
                      Billing provider not configured — billing actions disabled.
                    </div>
                  )}
                </div>

                {/* Invoices */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>Invoice History</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-strong)' }}>
                        {['Amount', 'Status', 'Invoice ID', 'Date', 'PDF'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(biz.subscription.invoices ?? []).length === 0 ? (
                        <tr><td colSpan={5} style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No invoices yet</td></tr>
                      ) : (biz.subscription.invoices ?? []).map(inv => (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{fmtMoney(inv.amount_cents, inv.currency)}</td>
                          <td style={{ padding: '12px 16px' }}><StatusBadge status={inv.status}/></td>
                          <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{inv.provider_inv_id ?? '—'}</td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>{fmtDate(inv.created_at)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            {inv.pdf_url ? <a href={inv.pdf_url} target="_blank" rel="noopener" style={{ fontSize: 12, color: 'var(--accent)' }}>Download</a> : <span style={{ color: 'var(--muted-2)', fontSize: 12 }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {tab === 'subscription' && !biz.subscription && (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No subscription found for this business.</div>
            )}

            {/* Audit log tab */}
            {tab === 'audit' && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                {biz.audit_logs.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No audit events for this business.</div>
                ) : biz.audit_logs.map(log => (
                  <div key={log.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <StatusBadge status={log.action}/>
                    <div style={{ flex: 1, fontSize: 12, color: 'var(--ink-2)' }}>
                      by <strong>{log.actor_email ?? 'System'}</strong>
                      {log.meta && <span style={{ color: 'var(--muted)', marginLeft: 8 }}>{JSON.stringify(log.meta).slice(0, 80)}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted-2)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <ConfirmActionModal
        open={suspendOpen}
        title={biz?.suspended_at ? `Unsuspend ${biz?.name}?` : `Suspend ${biz?.name}?`}
        description={biz?.suspended_at ? 'This restores business access.' : 'This blocks the business immediately.'}
        confirmLabel={biz?.suspended_at ? 'Unsuspend' : 'Suspend'}
        dangerous={!biz?.suspended_at}
        loading={suspending}
        onConfirm={handleSuspend}
        onCancel={() => setSuspendOpen(false)}
      />

      <ConfirmActionModal
        open={convertOpen}
        title={`Convert ${biz?.name ?? ''} to Full Account?`}
        description="This will permanently convert this demo account to a full account. Demo limits will be removed. This cannot be undone."
        confirmLabel="Convert to Full Account"
        dangerous={false}
        loading={convertingDemo}
        onConfirm={handleConvertDemo}
        onCancel={() => { if (!convertingDemo) setConvertOpen(false); }}
      />

      {/* ── Plan management modal ── */}
      {planModalOpen && biz && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
             onClick={() => { if (!planChanging) { setPlanModalOpen(false); } }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: 28, width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
               onClick={e => e.stopPropagation()}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Manage Plan — {biz.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                Current: <strong>{biz.plan}</strong>
                {biz.plan_expires_at && (
                  <span style={{ marginLeft: 8, color: new Date(biz.plan_expires_at) < new Date() ? '#991B1B' : '#92400E' }}>
                    ({new Date(biz.plan_expires_at) < new Date() ? 'expired' : `until ${fmtDate(biz.plan_expires_at)}`})
                  </span>
                )}
              </div>
            </div>

            {/* Plan selector */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>Plan</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(['free', 'starter', 'pro', 'enterprise'] as Plan[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setNewPlan(p)}
                    style={{
                      padding: '10px 14px', borderRadius: 'var(--radius-sm)', textAlign: 'left',
                      border: `2px solid ${newPlan === p ? 'var(--accent)' : 'var(--border)'}`,
                      background: newPlan === p ? 'var(--accent-soft, #EEF2FF)' : 'var(--surface)',
                      cursor: 'pointer', fontSize: 13, fontWeight: newPlan === p ? 700 : 500,
                      color: newPlan === p ? 'var(--accent)' : 'var(--ink)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {p}
                    {p === 'enterprise' && <span style={{ fontSize: 10, marginLeft: 4, color: 'var(--muted)' }}>Unlimited</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry date */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                Plan Expiry Date <span style={{ fontSize: 10, fontWeight: 400, textTransform: 'none' }}>(optional)</span>
              </label>
              <input
                type="date"
                value={newExpiry}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setNewExpiry(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13 }}
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>
                {newExpiry
                  ? `Plan reverts to free after ${newExpiry}.`
                  : 'Leave blank to assign permanently (no auto-revert).'}
              </div>
              {newExpiry && (
                <button onClick={() => setNewExpiry('')} style={{ marginTop: 4, fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Clear expiry → assign permanently
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setPlanModalOpen(false); setNewPlan(''); setNewExpiry(''); }}
                disabled={planChanging}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handlePlanChange}
                disabled={planChanging || !newPlan}
                style={{ padding: '8px 18px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--accent, #6366F1)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: planChanging ? 'wait' : 'pointer', opacity: !newPlan ? 0.5 : 1 }}
              >
                {planChanging ? 'Saving…' : 'Save plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
