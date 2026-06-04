import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }         from '@/lib/supabase/admin';
import { env }                       from '@/lib/env';
import { generateReply }             from '@/lib/ai/generateReply';
import type { ReplyLength }          from '@/lib/ai/generateReply';
import { isPaid }                    from '@/lib/billing/tier';

// Max reviews processed per cron run — keeps execution within Vercel function limits.
const BATCH_SIZE = 50;

type BizRow = {
  id:              string;
  plan:            string;
  plan_expires_at: string | null;
  language:        string;
};

type SettingsRow = {
  business_id:        string;
  tone:               string;
  signature:          string | null;
  language:           string | null;
  reply_length:       string;
  auto_reply_enabled: boolean;
  auto_activated:     boolean;
  admin_force_state:  string | null;
};

const SETTING_DEFAULTS: Omit<SettingsRow, 'business_id'> = {
  tone:               'friendly',
  signature:          null,
  language:           null,
  reply_length:       'medium',
  auto_reply_enabled: false,
  auto_activated:     false,
  admin_force_state:  null,
};

export async function GET(request: NextRequest) {
  const cronSecret = env.CRON_SECRET;
  const auth       = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db      = createAdminClient();
  const summary = { processed: 0, generated: 0, skipped: 0, failed: 0 };

  // ── Step 1: Fetch pending reviews (capped per run) ─────────
  const { data: pendingReviews, error: reviewsError } = await db
    .from('gbp_reviews')
    .select('id, connection_id, rating, comment, reviewer_name')
    .eq('reply_status', 'pending')
    .limit(BATCH_SIZE);

  if (reviewsError) {
    console.error('[gbp-generate] failed to load pending reviews:', reviewsError.message);
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
  }

  if (!pendingReviews || pendingReviews.length === 0) {
    return NextResponse.json(summary);
  }

  // ── Step 2: Resolve connection IDs → business IDs ──────────
  const connectionIds = [...new Set(pendingReviews.map(r => r.connection_id as string))];
  const { data: connections } = await db
    .from('gbp_connections')
    .select('id, business_id')
    .in('id', connectionIds);

  const connToBiz: Record<string, string> = {};
  for (const c of (connections ?? []) as { id: string; business_id: string }[]) {
    connToBiz[c.id] = c.business_id;
  }

  const businessIds = [...new Set(Object.values(connToBiz))];
  if (businessIds.length === 0) {
    return NextResponse.json(summary);
  }

  // ── Step 3: Load businesses + reply_settings in parallel ───
  const [{ data: businesses }, { data: settingsRows }] = await Promise.all([
    db.from('businesses')
      .select('id, plan, plan_expires_at, language')
      .in('id', businessIds),
    db.from('reply_settings')
      .select('business_id, tone, signature, language, reply_length, auto_reply_enabled, auto_activated, admin_force_state')
      .in('business_id', businessIds),
  ]);

  const bizMap: Record<string, BizRow> = {};
  for (const b of (businesses ?? []) as BizRow[]) bizMap[b.id] = b;

  const settingsMap: Record<string, SettingsRow> = {};
  for (const s of (settingsRows ?? []) as SettingsRow[]) settingsMap[s.business_id] = s;

  // ── Step 4: Process each review ────────────────────────────
  for (const review of pendingReviews) {
    summary.processed++;

    // Skip reviews without a usable rating (can't determine sentiment for prompt)
    const rating = review.rating as number | null;
    if (!rating || rating < 1 || rating > 5) { summary.skipped++; continue; }

    const businessId = connToBiz[review.connection_id as string];
    const biz        = businessId ? bizMap[businessId] : undefined;
    if (!biz) { summary.skipped++; continue; }

    const settings: SettingsRow = settingsMap[businessId]
      ?? { business_id: businessId, ...SETTING_DEFAULTS };

    // Compute effectiveAuto: admin_force_state takes precedence over business toggle
    const effectiveAuto =
      settings.admin_force_state === 'on'  ? true  :
      settings.admin_force_state === 'off' ? false :
      settings.auto_reply_enabled;

    if (!effectiveAuto) { summary.skipped++; continue; }

    // Per-review isolation: one failure must not abort the rest of the batch
    try {
      const language    = settings.language ?? biz.language ?? 'en';
      const replyLength = (settings.reply_length ?? 'medium') as ReplyLength;

      const replyText = await generateReply({
        reviewText:  (review.comment as string | null) ?? '',
        rating,
        tone:        settings.tone ?? 'friendly',
        signature:   settings.signature,
        language,
        replyLength,
      });

      // needsApproval: free plan always needs approval; paid but not yet auto_activated
      // (auto_activated is set true after the first successful auto-post in B4)
      const paid          = isPaid({ plan: biz.plan, plan_expires_at: biz.plan_expires_at });
      const needsApproval = !paid || !settings.auto_activated;
      const newStatus     = needsApproval ? 'awaiting_approval' : 'approved';

      const { error: updateErr } = await db
        .from('gbp_reviews')
        .update({ reply_text: replyText, reply_status: newStatus })
        .eq('id', review.id);

      if (updateErr) throw updateErr;
      summary.generated++;

    } catch (e) {
      summary.failed++;
      console.error(`[gbp-generate] failed for review ${review.id as string}:`, (e as Error).message);
      await db.from('gbp_reviews').update({ reply_status: 'failed' }).eq('id', review.id);
      if (env.SENTRY_DSN) {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(e, { tags: { review_id: review.id as string } });
      }
    }
  }

  return NextResponse.json(summary);
}
