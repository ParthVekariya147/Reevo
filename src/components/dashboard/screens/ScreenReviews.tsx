'use client';

import { useState, useEffect } from 'react';
import {
  Icon, Card, CardHeader, Btn, Badge,
  Field, Input, Select, StarRating,
} from '../ui';

// ── types ─────────────────────────────────────────────────────

type ReplyLength = 'short' | 'medium' | 'long';

interface ReplySettings {
  tone:         string;
  signature:    string | null;
  language:     string | null;
  reply_length: ReplyLength;
}

// ── constants ─────────────────────────────────────────────────

const TONE_OPTIONS = [
  { value: 'friendly',     label: 'Friendly'     },
  { value: 'professional', label: 'Professional' },
  { value: 'casual',       label: 'Casual'       },
  { value: 'empathetic',   label: 'Empathetic'   },
  { value: 'formal',       label: 'Formal'       },
];

const LENGTH_OPTIONS = [
  { value: 'short',  label: 'Short — 1 line'     },
  { value: 'medium', label: 'Medium — 2–3 lines' },
  { value: 'long',   label: 'Long — 4–5 lines'   },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English'    },
  { value: 'es', label: 'Spanish'    },
  { value: 'fr', label: 'French'     },
  { value: 'de', label: 'German'     },
  { value: 'hi', label: 'Hindi'      },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese'   },
  { value: 'zh', label: 'Chinese'    },
  { value: 'ar', label: 'Arabic'     },
];

const RATING_HINT: Record<number, string> = {
  5: 'Excellent — warm, enthusiastic reply',
  4: 'Good — positive, specific thanks',
  3: 'Neutral — thank + light acknowledgement',
  2: 'Disappointing — empathetic, offer to resolve',
  1: 'Critical — apologetic, invite direct contact',
};

const SETTINGS_DEFAULTS: ReplySettings = {
  tone:         'friendly',
  signature:    null,
  language:     null,
  reply_length: 'medium',
};

// ── helpers ───────────────────────────────────────────────────

function PageHeader({ title, sub, action }: { title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className="lp-page-hd">
      <div>
        <h1 className="lp-h1">{title}</h1>
        <div className="lp-page-sub">{sub}</div>
      </div>
      {action && <div className="lp-page-act">{action}</div>}
    </div>
  );
}

// ── main component ────────────────────────────────────────────

export default function ScreenReviews() {
  // ── generate form state ──────────────────────────────────
  const [reviewText,   setReviewText]   = useState('');
  const [rating,       setRating]       = useState(0);
  const [reviewerName, setReviewerName] = useState('');

  // ── generate result state ────────────────────────────────
  const [generating,    setGenerating]    = useState(false);
  const [genError,      setGenError]      = useState('');
  const [limitReached,  setLimitReached]  = useState(false);
  const [reply,         setReply]         = useState('');
  const [draftId,       setDraftId]       = useState('');
  const [remaining,     setRemaining]     = useState<number | null>(null);
  const [copied,        setCopied]        = useState(false);

  // ── settings state ───────────────────────────────────────
  const [settings,       setSettings]       = useState<ReplySettings>(SETTINGS_DEFAULTS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved,  setSettingsSaved]  = useState(false);
  const [settingsError,  setSettingsError]  = useState('');

  // ── load settings on mount ───────────────────────────────
  useEffect(() => {
    fetch('/api/reviews/reply-settings')
      .then(r => r.ok ? r.json() : Promise.resolve(null))
      .then(data => {
        if (data?.settings) {
          setSettings({
            tone:         data.settings.tone         ?? SETTINGS_DEFAULTS.tone,
            signature:    data.settings.signature    ?? null,
            language:     data.settings.language     ?? null,
            reply_length: (data.settings.reply_length ?? SETTINGS_DEFAULTS.reply_length) as ReplyLength,
          });
        }
      })
      .catch(() => {/* keep defaults */})
      .finally(() => setSettingsLoaded(true));
  }, []);

  // ── generate ─────────────────────────────────────────────
  async function handleGenerate() {
    if (!reviewText.trim() || !rating) return;
    setGenerating(true);
    setGenError('');
    setLimitReached(false);
    setReply('');
    setDraftId('');
    setCopied(false);

    try {
      const res  = await fetch('/api/reviews/reply-draft', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          reviewText:   reviewText.trim(),
          rating,
          reviewerName: reviewerName.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (res.status === 429 && data.remaining === 0) {
        setLimitReached(true);
        return;
      }
      if (!res.ok) {
        setGenError(data.error ?? 'Generation failed — please try again.');
        return;
      }

      setReply(data.reply as string);
      setDraftId(data.draftId as string);
      setRemaining(data.remaining as number | null);
    } catch {
      setGenError('Network error — check your connection and try again.');
    } finally {
      setGenerating(false);
    }
  }

  // ── copy + track ─────────────────────────────────────────
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(reply);
    } catch {
      const el = document.createElement('textarea');
      el.value = reply;
      el.style.position = 'fixed';
      el.style.opacity  = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);

    if (draftId) {
      fetch('/api/reviews/reply-draft', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ draftId, copied: true }),
      }).catch(() => {/* non-critical */});
    }
  }

  // ── save settings ─────────────────────────────────────────
  async function handleSaveSettings() {
    setSettingsSaving(true);
    setSettingsError('');
    setSettingsSaved(false);

    try {
      const res  = await fetch('/api/reviews/reply-settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tone:         settings.tone,
          reply_length: settings.reply_length,
          signature:    settings.signature || null,
          language:     settings.language  || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSettingsError(data.error ?? 'Failed to save settings.');
        return;
      }
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch {
      setSettingsError('Network error — please try again.');
    } finally {
      setSettingsSaving(false);
    }
  }

  const canGenerate = reviewText.trim().length > 0 && rating > 0 && !generating;

  // ── render ────────────────────────────────────────────────
  return (
    <div className="lp-page">
      <PageHeader
        title="AI reply drafts"
        sub="Paste a customer review — Reevo drafts a reply you copy straight to Google"
        action={
          remaining !== null ? (
            <Badge tone={remaining === 0 ? 'danger' : remaining <= 3 ? 'warning' : 'neutral'}>
              <Icon name="zap" size={11} style={{ marginRight: 4 }} />
              {remaining} draft{remaining !== 1 ? 's' : ''} left this month
            </Badge>
          ) : undefined
        }
      />

      <div
        className="lp-grid"
        style={{ gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 16, alignItems: 'start' }}
      >
        {/* ══ Left column: generate ══════════════════════════════════════ */}
        <div className="lp-stack">

          {/* Input card */}
          <Card>
            <CardHeader
              title="Generate a reply"
              subtitle="Paste the customer's Google review text below"
            />

            <Field label="Customer review" required>
              <textarea
                placeholder="Paste the full review text here…"
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                maxLength={5000}
                rows={5}
                style={{
                  width:        '100%',
                  boxSizing:    'border-box',
                  padding:      '9px 12px',
                  borderRadius: 8,
                  border:       '1px solid var(--lp-border, #e2e8f0)',
                  background:   'var(--lp-surface-2, #f8fafc)',
                  color:        'var(--lp-fg)',
                  fontSize:     13,
                  lineHeight:   1.55,
                  resize:       'vertical',
                  fontFamily:   'inherit',
                  outline:      'none',
                  transition:   'border-color .15s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--lp-accent, #6E5BFF)')}
                onBlur={e  => (e.target.style.borderColor = 'var(--lp-border, #e2e8f0)')}
              />
              <div style={{ fontSize: 11, color: 'var(--lp-fg-muted)', textAlign: 'right', marginTop: 2 }}>
                {reviewText.length} / 5000
              </div>
            </Field>

            <Field label="Star rating" required>
              <StarRating value={rating} onChange={v => { setRating(v); setGenError(''); }} size={26} />
              {rating > 0 && (
                <div style={{ fontSize: 11, color: 'var(--lp-fg-muted)', marginTop: 4 }}>
                  {RATING_HINT[rating]}
                </div>
              )}
            </Field>

            <Field label="Reviewer name" hint="Optional — used to personalise the reply">
              <Input
                placeholder="e.g. Sarah M."
                value={reviewerName}
                onChange={e => setReviewerName(e.target.value)}
                maxLength={80}
                icon="user"
              />
            </Field>

            {/* Limit reached banner */}
            {limitReached && (
              <div style={{
                display:      'flex',
                gap:          10,
                alignItems:   'flex-start',
                padding:      '11px 14px',
                borderRadius: 8,
                background:   'var(--lp-warning-bg, #fefce8)',
                border:       '1px solid var(--lp-warning-border, #fde047)',
                fontSize:     13,
                color:        '#92400E',
              }}>
                <Icon name="zap" size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <strong>Monthly draft limit reached.</strong>{' '}
                  Upgrade to a paid plan for unlimited AI reply drafts.
                </div>
              </div>
            )}

            {/* Inline error */}
            {genError && (
              <div style={{ fontSize: 13, color: 'var(--lp-danger, #ef4444)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="x" size={14} />
                {genError}
              </div>
            )}

            {/* Missing-field hint */}
            {!canGenerate && !generating && (reviewText.trim().length === 0 || rating === 0) && (reviewText.length > 0 || rating > 0) && (
              <div style={{ fontSize: 12, color: 'var(--lp-fg-muted)' }}>
                {reviewText.trim().length === 0 ? 'Add the review text to continue.' : 'Select a star rating to continue.'}
              </div>
            )}

            <Btn
              variant="primary"
              icon={generating ? 'refresh' : 'sparkles'}
              disabled={!canGenerate}
              onClick={handleGenerate}
            >
              {generating ? 'Generating…' : 'Generate reply'}
            </Btn>
          </Card>

          {/* Generated reply card — only shown after first generation */}
          {reply && (
            <Card>
              <CardHeader
                title="Generated reply"
                subtitle="Edit if needed, then copy and paste into your Google Business profile"
                action={
                  <Btn
                    variant={copied ? 'secondary' : 'primary'}
                    icon={copied ? 'check' : 'copy'}
                    onClick={handleCopy}
                  >
                    {copied ? 'Copied!' : 'Copy reply'}
                  </Btn>
                }
              />

              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                rows={6}
                style={{
                  width:        '100%',
                  boxSizing:    'border-box',
                  padding:      '10px 13px',
                  borderRadius: 8,
                  border:       `1.5px solid ${copied ? 'var(--lp-success, #10b981)' : 'var(--lp-accent, #6E5BFF)'}`,
                  background:   'var(--lp-surface-2, #f8fafc)',
                  color:        'var(--lp-fg)',
                  fontSize:     13,
                  lineHeight:   1.6,
                  resize:       'vertical',
                  fontFamily:   'inherit',
                  outline:      'none',
                  transition:   'border-color .2s',
                }}
              />

              <div style={{
                display:    'flex',
                alignItems: 'center',
                gap:        6,
                marginTop:  6,
                fontSize:   12,
                color:      'var(--lp-fg-muted)',
              }}>
                <Icon name="external" size={12} />
                Paste this in Google Business Profile → Reviews → Reply to this review.
              </div>
            </Card>
          )}
        </div>

        {/* ══ Right column: settings ═════════════════════════════════════ */}
        <Card>
          <CardHeader
            title="Reply settings"
            subtitle="Applied to all generated replies"
          />

          {!settingsLoaded ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--lp-fg-muted)', fontSize: 13 }}>
              Loading…
            </div>
          ) : (
            <div className="lp-stack" style={{ gap: 14 }}>
              <Field label="Tone">
                <Select
                  value={settings.tone}
                  options={TONE_OPTIONS}
                  onChange={v => { setSettings(s => ({ ...s, tone: v })); setSettingsSaved(false); }}
                />
              </Field>

              <Field label="Reply length">
                <Select
                  value={settings.reply_length}
                  options={LENGTH_OPTIONS}
                  onChange={v => { setSettings(s => ({ ...s, reply_length: v as ReplyLength })); setSettingsSaved(false); }}
                />
              </Field>

              <Field label="Language" hint="Defaults to your business language if left blank">
                <Select
                  value={settings.language ?? 'en'}
                  options={LANGUAGE_OPTIONS}
                  onChange={v => { setSettings(s => ({ ...s, language: v })); setSettingsSaved(false); }}
                />
              </Field>

              <Field label="Signature" hint='Appended to each reply — e.g. "— The Team"'>
                <Input
                  placeholder="— The Owner"
                  value={settings.signature ?? ''}
                  onChange={e => { setSettings(s => ({ ...s, signature: e.target.value || null })); setSettingsSaved(false); }}
                  maxLength={200}
                />
              </Field>

              {settingsError && (
                <div style={{ fontSize: 12, color: 'var(--lp-danger, #ef4444)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="x" size={13} />
                  {settingsError}
                </div>
              )}

              <Btn
                variant={settingsSaved ? 'secondary' : 'primary'}
                icon={settingsSaved ? 'check' : 'cog'}
                disabled={settingsSaving}
                onClick={handleSaveSettings}
              >
                {settingsSaving ? 'Saving…' : settingsSaved ? 'Settings saved!' : 'Save settings'}
              </Btn>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
