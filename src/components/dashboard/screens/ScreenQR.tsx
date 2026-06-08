'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { IconName } from '../ui';
import {
  Icon, Card, CardHeader, Btn, Badge, Counter,
  Switch, fmt,
} from '../ui';
import { QRCanvas } from '../ui-qr';

const fetcher = (url: string) =>
  fetch(url).then(r => { if (!r.ok) throw new Error('fetch failed'); return r.json(); });

const TONES = ['primary', 'violet', 'cyan', 'success', 'warning'] as const;

// ── types ─────────────────────────────────────────────────────

interface QRCode {
  id:             string;
  token:          string;
  campaign_name:  string;
  status:         string;
  dynamic:        boolean;
  ab_testing:     boolean;
  pause_fallback: boolean;
  created_at:     string;
}

interface OverviewCampaign {
  id:         string;
  scans:      number;
  completes:  number;
  conversion: number;
}

interface MergedCampaign extends QRCode {
  scans:      number;
  completes:  number;
  conversion: number;
  tone:       string;
}

// ── sub-components ───────────────────────────────────────────

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

function MicroStat({ label, value, suffix, icon }: { label: string; value: number; suffix?: string; icon: IconName }) {
  return (
    <div className="lp-microstat">
      <div className="lp-microstat-label"><Icon name={icon} size={12} /> {label}</div>
      <div className="lp-microstat-val"><Counter value={value} suffix={suffix ?? ''} /></div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div style={{ padding: '8px 0' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ padding: '12px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--lp-border)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: 110, height: 11, background: 'var(--lp-border)', borderRadius: 4, marginBottom: 6 }} />
            <div style={{ width: 80, height: 9, background: 'var(--lp-border)', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── create modal ─────────────────────────────────────────────

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState('');
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErr('Campaign name is required'); return; }
    setSaving(true);
    setErr('');
    const res  = await fetch('/api/qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaign_name: name.trim(), status: 'draft' }),
    });
    const json = await res.json();
    if (!res.ok) { setErr(json.error ?? 'Failed to create'); setSaving(false); return; }
    onCreated(json.code.id);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--lp-surface)', borderRadius: 14, padding: 28,
        width: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>New QR campaign</h2>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--lp-fg-muted)' }}>
          Give it a descriptive name — e.g. &quot;Front Counter&quot;, &quot;Table Tents&quot;.
        </p>
        <form onSubmit={submit}>
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Campaign name"
            style={{
              width: '100%', boxSizing: 'border-box', padding: '10px 14px',
              borderRadius: 8, border: '1.5px solid var(--lp-border)',
              background: 'var(--lp-bg)', fontSize: 14, marginBottom: 12, outline: 'none',
            }}
          />
          {err && <div style={{ color: 'var(--lp-danger)', fontSize: 12, marginBottom: 10 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={onClose} type="button">Cancel</Btn>
            <Btn variant="primary" type="submit">{saving ? 'Creating…' : 'Create campaign'}</Btn>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── main component ───────────────────────────────────────────

export default function ScreenQR() {
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [creating,     setCreating]     = useState(false);
  const [patching,     setPatching]     = useState(false);
  const [downloading,  setDownloading]  = useState<'png' | 'svg' | null>(null);
  const [sharing,      setSharing]      = useState(false);
  const [shareError,   setShareError]   = useState('');
  const [supportsShare, setSupportsShare] = useState(false);

  useEffect(() => {
    setSupportsShare(typeof navigator.canShare === 'function');
  }, []);

  const queryClient = useQueryClient();
  const { data: qrData, isLoading: qrLoading, error: qrError, refetch: qrRefetch } = useQuery<{ codes: QRCode[] }>({
    queryKey: ['/api/qr'],
    queryFn:  () => fetcher('/api/qr'),
  });
  const { data: overviewData } = useQuery<{ campaigns: OverviewCampaign[] }>({
    queryKey: ['/api/dashboard/overview'],
    queryFn:  () => fetcher('/api/dashboard/overview'),
  });

  // Merge QR codes with analytics stats from overview
  const codes: MergedCampaign[] = (qrData?.codes ?? []).map((qr, i) => {
    const stats = (overviewData?.campaigns ?? []).find(c => c.id === qr.id);
    return {
      ...qr,
      scans:      stats?.scans      ?? 0,
      completes:  stats?.completes  ?? 0,
      conversion: stats?.conversion ?? 0,
      tone:       TONES[i % TONES.length],
    };
  });

  const liveCount  = codes.filter(c => c.status === 'live').length;
  const effectiveId = selectedId ?? codes[0]?.id ?? null;
  const current     = codes.find(c => c.id === effectiveId) ?? null;

  // Build the funnel URL for the QR canvas
  const origin  = typeof window !== 'undefined' ? window.location.origin : '';
  const funnelUrl = current ? `${origin}/r/${current.token}` : '';

  // Copy URL to clipboard
  function copyUrl() {
    if (funnelUrl) navigator.clipboard.writeText(funnelUrl);
  }

  // Blob-URL download — works on mobile Safari where <a download> is unreliable
  async function downloadQR(format: 'png' | 'svg') {
    if (!current || downloading) return;
    setDownloading(format);
    try {
      const res  = await fetch(`/api/qr/${current.id}/image?format=${format}`);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${current.campaign_name}-qr.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[QR download]', e);
    } finally {
      setDownloading(null);
    }
  }

  // Web Share API — PNG only; SVG stays download-only (WhatsApp/gallery don't accept SVG)
  async function shareQR() {
    if (!current || sharing) return;
    setSharing(true);
    setShareError('');
    try {
      const res  = await fetch(`/api/qr/${current.id}/image?format=png`);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], `${current.campaign_name}-qr.png`, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${current.campaign_name} QR code` });
      } else {
        // canShare returned false mid-flight (e.g. PWA context changed) — fall back to download
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${current.campaign_name}-qr.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // user cancelled share sheet — silent
      console.error('[QR share]', e);
      setShareError('Share failed — try downloading instead.');
    } finally {
      setSharing(false);
    }
  }

  // PATCH a single field on the current campaign
  async function patch(field: string, value: unknown) {
    if (!current || patching) return;
    setPatching(true);
    await fetch(`/api/qr/${current.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ [field]: value }),
    });
    await queryClient.invalidateQueries({ queryKey: ['/api/qr'] });
    setPatching(false);
  }

  // Toggle live/paused via the status field
  async function toggleLive() {
    if (!current) return;
    const next = current.status === 'live' ? 'paused' : 'live';
    await patch('status', next);
  }

  if (qrError) {
    return (
      <div className="lp-page">
        <PageHeader title="QR codes" sub="Generate, customize and track QR campaigns" />
        <Card>
          <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--lp-fg-muted)' }}>
            <div style={{ marginBottom: 12 }}>Could not load QR campaigns.</div>
            <Btn variant="ghost" onClick={() => qrRefetch()}>Retry</Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onCreated={id => { setCreating(false); queryClient.invalidateQueries({ queryKey: ['/api/qr'] }); setSelectedId(id); }}
        />
      )}

      <div className="lp-page">
        <PageHeader
          title="QR codes"
          sub="Generate, customize and track QR campaigns"
          actions={
            <>
              <Btn icon="package">Order printed materials</Btn>
              <Btn variant="primary" icon="plus" onClick={() => setCreating(true)}>New campaign</Btn>
            </>
          }
        />

        <div className="lp-grid" style={{ gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16, alignItems: 'start' }}>

          {/* ── Detail panel ── */}
          <div className="lp-stack">
            {!current ? (
              <Card>
                <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--lp-fg-muted)' }}>
                  {qrData ? (
                    <>No campaigns yet. <button className="lp-link" onClick={() => setCreating(true)}>Create your first →</button></>
                  ) : 'Loading…'}
                </div>
              </Card>
            ) : (
              <>
                <Card>
                  <div className="lp-flex" style={{ gap: 28, alignItems: 'flex-start' }}>
                    {/* QR image */}
                    <div>
                      <div className="lp-qr-frame" style={{ borderColor: `var(--lp-${current.tone})` }}>
                        <QRCanvas value={funnelUrl || 'https://reevo.io'} size={220} color="#0A0B14" bg="#FFFFFF" radius={16} />
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' }}>
                        <Btn
                          icon="download" size="sm"
                          disabled={downloading !== null || sharing}
                          onClick={() => downloadQR('png')}
                        >
                          {downloading === 'png' ? 'Saving…' : 'PNG'}
                        </Btn>
                        <Btn
                          icon="download" size="sm"
                          disabled={downloading !== null || sharing}
                          onClick={() => downloadQR('svg')}
                        >
                          {downloading === 'svg' ? 'Saving…' : 'SVG'}
                        </Btn>
                        {supportsShare && (
                          <Btn
                            icon="upload" size="sm"
                            disabled={sharing || downloading !== null}
                            onClick={shareQR}
                          >
                            {sharing ? 'Sharing…' : 'Share'}
                          </Btn>
                        )}
                        {shareError && (
                          <div style={{ width: '100%', fontSize: 11, color: 'var(--lp-danger)', textAlign: 'center' }}>
                            {shareError}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Campaign info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="lp-flex lp-flex-between" style={{ marginBottom: 6 }}>
                        <h2 className="lp-h2" style={{ fontSize: 22, margin: 0 }}>{current.campaign_name}</h2>
                        <Badge
                          tone={current.status === 'live' ? 'success' : current.status === 'paused' ? 'warning' : 'neutral'}
                          dot
                        >
                          {current.status}
                        </Badge>
                      </div>

                      <div className="lp-flex" style={{ gap: 8, alignItems: 'center', marginBottom: 18 }}>
                        <span className="lp-link-pill"><Icon name="link" size={12} /> {origin}/r/{current.token}</span>
                        <Btn variant="ghost" size="sm" icon="copy" onClick={copyUrl} />
                        <a href={funnelUrl} target="_blank" rel="noopener noreferrer">
                          <Btn variant="ghost" size="sm" icon="external" />
                        </a>
                      </div>

                      <div className="lp-grid lp-grid-3" style={{ gap: 10, marginBottom: 18 }}>
                        <MicroStat label="Total scans"  value={current.scans}      icon="qr" />
                        <MicroStat label="Conversion"   value={current.conversion} suffix="%" icon="trendUp" />
                        <MicroStat label="Completed"    value={current.completes}  icon="check" />
                      </div>

                      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                        <Btn
                          variant={current.status === 'live' ? 'ghost' : 'primary'}
                          icon={current.status === 'live' ? 'play' : 'play'}
                          size="sm"
                          onClick={toggleLive}
                        >
                          {current.status === 'live' ? 'Pause campaign' : 'Go live'}
                        </Btn>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Heatmap placeholder */}
                <Card>
                  <CardHeader
                    title="Scan activity"
                    subtitle={`${fmt(current.scans)} total scans · ${current.conversion.toFixed(1)}% conversion`}
                  />
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--lp-fg-muted)', fontSize: 13 }}>
                    Per-campaign daily breakdown coming in the next update.
                    <br />
                    <span style={{ fontSize: 12 }}>See the Analytics tab for business-wide hourly heatmap.</span>
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="lp-stack" style={{ position: 'sticky', top: 12 }}>
            {/* Campaign list */}
            <Card padded={false}>
              <div style={{ padding: '16px 18px 6px' }}>
                <CardHeader
                  title="Campaigns"
                  subtitle={`${codes.length} total · ${liveCount} live`}
                />
              </div>

              {qrLoading ? <SkeletonList /> : (
                <div className="lp-camp-list">
                  {codes.length === 0 ? (
                    <div style={{ padding: '20px 18px', color: 'var(--lp-fg-muted)', fontSize: 13 }}>
                      No campaigns yet.
                    </div>
                  ) : codes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`lp-camp-row ${effectiveId === c.id ? 'is-on' : ''}`}
                    >
                      <div className="lp-camp-thumb" style={{ background: `var(--lp-${c.tone}-soft)`, color: `var(--lp-${c.tone})` }}>
                        <Icon name="qr" size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="lp-camp-name">{c.campaign_name}</div>
                        <div className="lp-muted lp-truncate" style={{ fontSize: 11 }}>
                          /r/{c.token}
                        </div>
                      </div>
                      <div className="lp-camp-meta">
                        <div>{fmt(c.scans)}</div>
                        <div className="lp-muted" style={{ fontSize: 11 }}>{c.conversion.toFixed(1)}%</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div style={{ padding: '10px 16px 16px' }}>
                <Btn variant="ghost" icon="plus" className="lp-block" onClick={() => setCreating(true)}>
                  Create campaign
                </Btn>
              </div>
            </Card>

            {/* Settings toggles */}
            {current && (
              <Card>
                <CardHeader title="Campaign settings" subtitle={current.campaign_name} />
                <Switch
                  label="Dynamic redirect"
                  sub="Change destination without reprinting"
                  checked={current.dynamic}
                  onChange={v => patch('dynamic', v)}
                />
                <Switch
                  label="Pause fallback"
                  sub="Customers see a friendly page when paused"
                  checked={current.pause_fallback}
                  onChange={v => patch('pause_fallback', v)}
                />
                <Switch
                  label="A/B testing"
                  sub="Split traffic between funnel variants"
                  checked={current.ab_testing}
                  onChange={v => patch('ab_testing', v)}
                />
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
