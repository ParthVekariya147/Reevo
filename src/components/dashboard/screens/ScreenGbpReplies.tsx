'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card, Btn, Badge, StarRating, Switch, Icon, Empty, Skeleton, Tabs,
} from '../ui';

// ── types ─────────────────────────────────────────────────────

type ReplyStatus = 'pending' | 'awaiting_approval' | 'approved' | 'sent' | 'failed';
type TabValue    = 'needs_approval' | 'sent' | 'all';

interface GbpReview {
  id:                 string;
  rating:             number | null;
  comment:            string | null;
  reviewer_name:      string | null;
  review_created_at:  string | null;
  reply_text:         string | null;
  reply_status:       ReplyStatus;
  replied_at:         string | null;
}

interface ReviewsPage {
  data:           GbpReview[];
  total:          number;
  has_more:       boolean;
  has_connection: boolean;
}

// ── helpers ───────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="lp-page-hd">
      <div>
        <h1 className="lp-h1">{title}</h1>
        <div className="lp-page-sub">{sub}</div>
      </div>
    </div>
  );
}

const TABS: { value: TabValue; label: string }[] = [
  { value: 'needs_approval', label: 'Needs approval' },
  { value: 'sent',           label: 'Posted'          },
  { value: 'all',            label: 'All'              },
];

const TEXTAREA_BASE: React.CSSProperties = {
  width:      '100%',
  boxSizing:  'border-box',
  padding:    '9px 12px',
  borderRadius: 8,
  border:     '1px solid var(--lp-border, #e2e8f0)',
  background: 'var(--lp-surface-2, #f8fafc)',
  color:      'var(--lp-fg)',
  fontSize:   13,
  lineHeight: 1.55,
  resize:     'vertical',
  fontFamily: 'inherit',
  outline:    'none',
  transition: 'border-color .15s',
};

// ── status badge ──────────────────────────────────────────────

function StatusBadge({ status }: { status: ReplyStatus }) {
  if (status === 'awaiting_approval') return <Badge tone="warning" dot>Awaiting approval</Badge>;
  if (status === 'failed')            return <Badge tone="danger"  dot>Failed — retry</Badge>;
  if (status === 'sent')              return <Badge tone="success" dot>Posted</Badge>;
  if (status === 'approved')          return <Badge tone="primary" dot>Approved</Badge>;
  return <Badge tone="neutral" dot>Pending</Badge>;
}

// ── main component ────────────────────────────────────────────

export default function ScreenGbpReplies() {
  // ── settings ─────────────────────────────────────────────
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [settingsLoaded,   setSettingsLoaded]   = useState(false);
  const [settingsSaving,   setSettingsSaving]   = useState(false);

  // ── reviews ───────────────────────────────────────────────
  const [tab,           setTab]           = useState<TabValue>('needs_approval');
  const [reviews,       setReviews]       = useState<GbpReview[]>([]);
  const [total,         setTotal]         = useState(0);
  const [hasMore,       setHasMore]       = useState(false);
  const [hasConnection, setHasConnection] = useState<boolean | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [loadError,     setLoadError]     = useState('');
  const [page,          setPage]          = useState(1);

  // ── per-review local draft edits (before posting) ─────────
  const [draftEdits,   setDraftEdits]   = useState<Record<string, string>>({});

  // ── action states ─────────────────────────────────────────
  const [posting,      setPosting]      = useState<Record<string, boolean>>({});
  const [regenerating, setRegenerating] = useState<Record<string, boolean>>({});
  const [actionError,  setActionError]  = useState<Record<string, string>>({});
  const [toast,        setToast]        = useState('');

  // ── load settings on mount ────────────────────────────────
  useEffect(() => {
    fetch('/api/reviews/reply-settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.settings) setAutoReplyEnabled(!!data.settings.auto_reply_enabled);
      })
      .catch(() => {/* keep defaults */})
      .finally(() => setSettingsLoaded(true));
  }, []);

  // ── load reviews ──────────────────────────────────────────
  const loadReviews = useCallback(async (nextPage: number) => {
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({
        status:    tab,
        page:      String(nextPage),
        page_size: '25',
      });
      const res  = await fetch(`/api/gbp/reviews?${params}`);
      const data = await res.json() as ReviewsPage & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load');

      setReviews(prev => nextPage === 1 ? data.data : [...prev, ...data.data]);
      setTotal(data.total);
      setHasMore(data.has_more);
      setHasConnection(data.has_connection);
      setPage(nextPage);
    } catch {
      setLoadError('Failed to load reviews — please refresh.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadReviews(1);
  }, [loadReviews]);

  // ── toggle auto-reply ─────────────────────────────────────
  async function handleToggleAutoReply(v: boolean) {
    setAutoReplyEnabled(v);
    setSettingsSaving(true);
    try {
      await fetch('/api/reviews/reply-settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ auto_reply_enabled: v }),
      });
    } catch {/* non-critical */} finally {
      setSettingsSaving(false);
    }
  }

  // ── approve & post ────────────────────────────────────────
  async function handleApprove(reviewId: string) {
    const draft = draftEdits[reviewId] ?? reviews.find(r => r.id === reviewId)?.reply_text ?? '';
    if (!draft.trim()) return;

    setPosting(p => ({ ...p, [reviewId]: true }));
    setActionError(e => ({ ...e, [reviewId]: '' }));

    try {
      const res  = await fetch('/api/gbp/reply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reviewId, replyText: draft }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to post');

      const now = new Date().toISOString();
      setReviews(prev => prev.map(r =>
        r.id === reviewId
          ? { ...r, reply_status: 'sent', replied_at: now, reply_text: draft }
          : r
      ));
      // Remove from needs_approval tab after posting
      if (tab === 'needs_approval') {
        setReviews(prev => prev.filter(r => r.id !== reviewId));
        setTotal(t => Math.max(0, t - 1));
      }
      showToast('Reply posted');
    } catch (e) {
      setActionError(p => ({ ...p, [reviewId]: (e as Error).message }));
    } finally {
      setPosting(p => ({ ...p, [reviewId]: false }));
    }
  }

  // ── regenerate ────────────────────────────────────────────
  async function handleRegenerate(reviewId: string) {
    setRegenerating(r => ({ ...r, [reviewId]: true }));
    setActionError(e => ({ ...e, [reviewId]: '' }));

    try {
      const res  = await fetch(`/api/gbp/reviews/${reviewId}/regenerate`, { method: 'POST' });
      const data = await res.json() as { reply_text?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to regenerate');

      const newText = data.reply_text ?? '';
      setDraftEdits(d => ({ ...d, [reviewId]: newText }));
      setReviews(prev => prev.map(r =>
        r.id === reviewId ? { ...r, reply_text: newText } : r
      ));
    } catch (e) {
      setActionError(p => ({ ...p, [reviewId]: (e as Error).message }));
    } finally {
      setRegenerating(r => ({ ...r, [reviewId]: false }));
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  function getDraft(review: GbpReview): string {
    return draftEdits[review.id] ?? review.reply_text ?? '';
  }

  // ── render ────────────────────────────────────────────────

  return (
    <div className="lp-page">
      <PageHeader
        title="Review inbox"
        sub="Approve and post AI-generated replies to your Google reviews"
      />

      {/* ── Auto-reply toggle ── */}
      {settingsLoaded && (
        <Card style={{ marginBottom: 16 }}>
          <Switch
            checked={autoReplyEnabled}
            onChange={handleToggleAutoReply}
            label="Auto-reply enabled"
            sub="Your first reply needs approval. After that, paid plans auto-post."
          />
          {settingsSaving && (
            <div style={{ fontSize: 12, color: 'var(--lp-fg-muted)', marginTop: 6 }}>Saving…</div>
          )}
        </Card>
      )}

      {/* ── No GBP connection → empty state ── */}
      {hasConnection === false && (
        <Card>
          <Empty
            icon="globe"
            title="Connect Google Business Profile"
            sub="Link your Google Business Profile to fetch reviews and post AI replies automatically."
            action={
              <Btn
                variant="primary"
                icon="link"
                onClick={() => {
                  window.location.href = '/api/gbp/connect?next=/app/business_dashboard/gbp-replies';
                }}
              >
                Connect Google Business Profile
              </Btn>
            }
          />
        </Card>
      )}

      {/* ── Reviews list ── */}
      {hasConnection !== false && (
        <>
          {/* Filter tabs */}
          <div style={{ marginBottom: 16 }}>
            <Tabs
              value={tab}
              onChange={v => setTab(v as TabValue)}
              tabs={TABS}
            />
          </div>

          {/* Skeleton loading */}
          {loading && reviews.length === 0 && (
            <div className="lp-stack" style={{ gap: 12 }}>
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <Skeleton w={80} h={14} />
                    <Skeleton w={120} h={14} />
                  </div>
                  <Skeleton w="100%" h={56} />
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <Skeleton w={120} h={32} r={8} />
                    <Skeleton w={100} h={32} r={8} />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Load error */}
          {loadError && (
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--lp-danger)', fontSize: 13 }}>
                <Icon name="x" size={14} />
                {loadError}
                <Btn variant="ghost" size="sm" onClick={() => loadReviews(1)}>Retry</Btn>
              </div>
            </Card>
          )}

          {/* Empty */}
          {!loading && !loadError && reviews.length === 0 && (
            <Card>
              <Empty
                icon="star"
                title={
                  tab === 'needs_approval' ? 'No reviews awaiting approval' :
                  tab === 'sent'           ? 'No posted replies yet'        : 'No reviews yet'
                }
                sub={
                  tab === 'needs_approval'
                    ? 'New reviews appear here once the AI generates a draft.'
                    : 'Replies you approve will show here after posting.'
                }
              />
            </Card>
          )}

          {/* Review cards */}
          {reviews.length > 0 && (
            <div className="lp-stack" style={{ gap: 12 }}>
              {reviews.map(review => {
                const draft       = getDraft(review);
                const isPosting   = posting[review.id]      ?? false;
                const isRegen     = regenerating[review.id] ?? false;
                const reviewError = actionError[review.id]  ?? '';
                const needsAction =
                  review.reply_status === 'awaiting_approval' ||
                  review.reply_status === 'failed';

                return (
                  <Card key={review.id}>
                    {/* Review header row */}
                    <div style={{
                      display:        'flex',
                      alignItems:     'flex-start',
                      justifyContent: 'space-between',
                      gap:            12,
                      marginBottom:   10,
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <StarRating value={review.rating ?? 0} readonly size={15} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>
                            {review.reviewer_name || 'Anonymous'}
                          </span>
                          {review.review_created_at && (
                            <span style={{ fontSize: 12, color: 'var(--lp-fg-muted)' }}>
                              {fmtDate(review.review_created_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <StatusBadge status={review.reply_status} />
                      </div>
                    </div>

                    {/* Review text */}
                    {review.comment ? (
                      <div style={{
                        padding:      '10px 12px',
                        borderRadius: 8,
                        background:   'var(--lp-surface-2, #f8fafc)',
                        border:       '1px solid var(--lp-border)',
                        fontSize:     13,
                        lineHeight:   1.55,
                        color:        'var(--lp-fg)',
                        marginBottom: 12,
                      }}>
                        {review.comment}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--lp-fg-muted)', marginBottom: 12 }}>
                        No review text
                      </div>
                    )}

                    {/* Pending-action section */}
                    {needsAction && (
                      <>
                        {review.reply_status === 'failed' && (
                          <div style={{
                            display:      'flex',
                            gap:          8,
                            alignItems:   'flex-start',
                            padding:      '8px 12px',
                            borderRadius: 8,
                            background:   'rgba(239,68,68,0.06)',
                            border:       '1px solid rgba(239,68,68,0.18)',
                            fontSize:     12,
                            color:        '#DC2626',
                            marginBottom: 10,
                          }}>
                            <Icon name="x" size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                            Previous post attempt failed. Edit the reply if needed and try again.
                          </div>
                        )}

                        {/* Editable draft */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{
                            fontSize:      11,
                            fontWeight:    600,
                            color:         'var(--lp-fg-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            marginBottom:  6,
                          }}>
                            Reply draft
                          </div>
                          <textarea
                            value={draft}
                            onChange={e =>
                              setDraftEdits(d => ({ ...d, [review.id]: e.target.value }))
                            }
                            rows={4}
                            style={TEXTAREA_BASE}
                            onFocus={e => (e.target.style.borderColor = 'var(--lp-accent, #6E5BFF)')}
                            onBlur={e  => (e.target.style.borderColor = 'var(--lp-border, #e2e8f0)')}
                          />
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Btn
                            variant="primary"
                            size="sm"
                            icon={isPosting ? 'refresh' : 'check'}
                            disabled={isPosting || isRegen || !draft.trim()}
                            onClick={() => handleApprove(review.id)}
                          >
                            {isPosting ? 'Posting…' : 'Approve & Post'}
                          </Btn>
                          <Btn
                            variant="secondary"
                            size="sm"
                            icon={isRegen ? 'refresh' : 'sparkles'}
                            disabled={isPosting || isRegen}
                            onClick={() => handleRegenerate(review.id)}
                          >
                            {isRegen ? 'Regenerating…' : 'Regenerate'}
                          </Btn>
                          {reviewError && (
                            <span style={{
                              fontSize:    12,
                              color:       'var(--lp-danger)',
                              display:     'flex',
                              alignItems:  'center',
                              gap:         4,
                            }}>
                              <Icon name="x" size={12} />
                              {reviewError}
                            </span>
                          )}
                        </div>
                      </>
                    )}

                    {/* Sent: read-only posted reply */}
                    {review.reply_status === 'sent' && review.reply_text && (
                      <>
                        <div style={{
                          fontSize:      11,
                          fontWeight:    600,
                          color:         'var(--lp-fg-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginBottom:  6,
                        }}>
                          Posted reply
                        </div>
                        <div style={{
                          padding:      '10px 12px',
                          borderRadius: 8,
                          background:   'rgba(16,185,129,0.05)',
                          border:       '1px solid rgba(16,185,129,0.2)',
                          fontSize:     13,
                          lineHeight:   1.55,
                          color:        'var(--lp-fg)',
                          marginBottom: 8,
                        }}>
                          {review.reply_text}
                        </div>
                        {review.replied_at && (
                          <Badge tone="success" icon="check">
                            Posted {fmtDate(review.replied_at)}
                          </Badge>
                        )}
                      </>
                    )}
                  </Card>
                );
              })}

              {/* Load more */}
              {hasMore && (
                <div style={{ textAlign: 'center', paddingTop: 8 }}>
                  <Btn
                    variant="secondary"
                    disabled={loading}
                    onClick={() => loadReviews(page + 1)}
                  >
                    {loading ? 'Loading…' : `Load more (${total - reviews.length} remaining)`}
                  </Btn>
                </div>
              )}

              {/* Item count */}
              <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--lp-fg-muted)', paddingTop: 4 }}>
                Showing {reviews.length} of {total}
              </div>
            </div>
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position:     'fixed',
          bottom:       24,
          left:         '50%',
          transform:    'translateX(-50%)',
          padding:      '10px 20px',
          borderRadius: 8,
          background:   '#0F172A',
          color:        '#fff',
          fontSize:     13,
          fontWeight:   500,
          zIndex:       1000,
          boxShadow:    '0 4px 16px rgba(0,0,0,0.25)',
          whiteSpace:   'nowrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="check" size={13} />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
