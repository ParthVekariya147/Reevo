'use client';

import { useCallback, useEffect, useState } from 'react';
import { MdSave, MdSettings, MdFlag, MdWarning } from 'react-icons/md';
import AdminTopbar from '../_components/shell/topbar';

type Settings = {
  site_name:               string;
  support_email:           string;
  maintenance_mode:        string;
  feature_flag_ai_v2:      string;
  feature_flag_new_funnel: string;
  free_reply_draft_limit:  string;
};

const DEFAULTS: Settings = {
  site_name:               '',
  support_email:           '',
  maintenance_mode:        'false',
  feature_flag_ai_v2:      'false',
  feature_flag_new_funnel: 'false',
  free_reply_draft_limit:  '10',
};

type Toast = { type: 'success' | 'error'; message: string };

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--muted)' }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>{title}</span>
      </div>
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="admin-field-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <div className="admin-field-label" style={{ width: 200, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function ToggleRow({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <FieldRow label={label} hint={hint}>
      <button
        onClick={() => onChange(!value)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
          cursor: 'pointer', padding: 0,
        }}
      >
        <div style={{
          width: 40, height: 22, borderRadius: 100, position: 'relative', flexShrink: 0,
          background: value ? 'var(--accent)' : 'var(--border-strong)',
          transition: 'background 0.15s',
        }}>
          <div style={{
            position: 'absolute', top: 3, left: value ? 21 : 3,
            width: 16, height: 16, borderRadius: '50%', background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s',
          }} />
        </div>
        <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: value ? 600 : 400 }}>
          {value ? 'Enabled' : 'Disabled'}
        </span>
      </button>
    </FieldRow>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/settings');
    if (res.ok) {
      const json = await res.json();
      setSettings({ ...DEFAULTS, ...json.settings });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function set<K extends keyof Settings>(key: K, value: string) {
    setSettings(s => ({ ...s, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      setToast({ type: 'success', message: 'Settings saved' });
    } else {
      const j = await res.json().catch(() => ({}));
      setToast({ type: 'error', message: (j as { error?: string }).error ?? 'Failed to save' });
    }
    setSaving(false);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--bg-tint)',
    color: 'var(--ink)', fontSize: 13, boxSizing: 'border-box',
  };

  return (
    <>
      <AdminTopbar
        breadcrumbs={['Admin', 'Settings']}
        pageTitle="Settings"
        actions={
          <button
            onClick={save}
            disabled={saving || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)', border: 'none', color: '#fff',
              fontWeight: 600, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            <MdSave size={15} /> {saving ? 'Saving…' : 'Save changes'}
          </button>
        }
      />

      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 20, zIndex: 1000,
          padding: '10px 18px', borderRadius: 'var(--radius-md)',
          background: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
          border: `1px solid ${toast.type === 'success' ? '#6EE7B7' : '#FECACA'}`,
          color: toast.type === 'success' ? '#065F46' : '#991B1B',
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          {toast.message}
        </div>
      )}

      <main className="admin-main-pad" style={{ padding: '28px 32px', width: '100%', maxWidth: 760, boxSizing: 'border-box' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 160, borderRadius: 'var(--radius-md)', background: 'var(--surface)', border: '1px solid var(--border)', animation: 'skeleton-pulse 1.4s ease-in-out infinite' }} />
            ))}
          </div>
        ) : (
          <>
            {/* General */}
            <SectionCard title="General" icon={<MdSettings size={16} />}>
              <FieldRow label="Site name" hint="Shown in emails and the admin panel">
                <input
                  type="text"
                  value={settings.site_name}
                  onChange={e => set('site_name', e.target.value)}
                  placeholder="Reevo"
                  style={inputStyle}
                />
              </FieldRow>
              <FieldRow label="Support email" hint="Shown to users on error and cancellation screens">
                <input
                  type="email"
                  value={settings.support_email}
                  onChange={e => set('support_email', e.target.value)}
                  placeholder="support@example.com"
                  style={inputStyle}
                />
              </FieldRow>
              <FieldRow
                label="Free reply draft limit"
                hint="Max AI reply drafts per month for free-plan businesses. Per-business overrides take precedence."
              >
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={settings.free_reply_draft_limit}
                  onChange={e => set('free_reply_draft_limit', e.target.value)}
                  placeholder="10"
                  style={{ ...inputStyle, width: 100 }}
                />
              </FieldRow>
            </SectionCard>

            {/* Feature flags */}
            <SectionCard title="Feature flags" icon={<MdFlag size={16} />}>
              <ToggleRow
                label="AI v2 generation"
                hint="Enable next-gen AI review generation (experimental)"
                value={settings.feature_flag_ai_v2 === 'true'}
                onChange={v => set('feature_flag_ai_v2', v ? 'true' : 'false')}
              />
              <ToggleRow
                label="New funnel UI"
                hint="Rolls out the redesigned funnel flow to all accounts"
                value={settings.feature_flag_new_funnel === 'true'}
                onChange={v => set('feature_flag_new_funnel', v ? 'true' : 'false')}
              />
            </SectionCard>

            {/* Maintenance mode */}
            <SectionCard title="Maintenance mode" icon={<MdWarning size={16} />}>
              {settings.maintenance_mode === 'true' && (
                <div style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                  background: '#FEF3C7', border: '1px solid #FCD34D',
                  color: '#92400E', fontSize: 12, fontWeight: 500, marginBottom: 4,
                }}>
                  Maintenance mode is active — users see a maintenance page instead of the app.
                </div>
              )}
              <ToggleRow
                label="Maintenance mode"
                hint="Blocks all user-facing pages with a maintenance message"
                value={settings.maintenance_mode === 'true'}
                onChange={v => set('maintenance_mode', v ? 'true' : 'false')}
              />
            </SectionCard>
          </>
        )}
      </main>
    </>
  );
}
