import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient }     from '@/lib/supabase/admin';
import { env }                   from '@/lib/env';
import { refreshAccessToken }    from '@/lib/gbp/oauth';
import { postReplyToGoogle }     from '@/lib/gbp/postReply';
import { isPaid }                from '@/lib/billing/tier';

const BATCH_SIZE = 50;

type ConnRow = {
  id:                string;
  business_id:       string;
  google_account_id: string;
  location_id:       string;
  refresh_token:     string | null;
};
type BizRow      = { id: string; plan: string; plan_expires_at: string | null };
type SettingsRow = { business_id: string; auto_activated: boolean };

export async function GET(request: NextRequest) {
  const cronSecret = env.CRON_SECRET;
  const auth       = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db      = createAdminClient();
  const summary = { processed: 0, sent: 0, failed: 0 };

  // ── Step 1: Fetch approved reviews (capped per run) ─────────
  const { data: approvedReviews, error: reviewsError } = await db
    .from('gbp_reviews')
    .select('id, connection_id, google_review_id, reply_text')
    .eq('reply_status', 'approved')
    .limit(BATCH_SIZE);

  if (reviewsError) {
    console.error('[gbp-post] failed to load approved reviews:', reviewsError.message);
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
  }

  if (!approvedReviews || approvedReviews.length === 0) {
    return NextResponse.json(summary);
  }

  // ── Step 2: Resolve connections ─────────────────────────────
  const connectionIds = [...new Set(approvedReviews.map(r => r.connection_id as string))];
  const { data: connections } = await db
    .from('gbp_connections')
    .select('id, business_id, google_account_id, location_id, refresh_token')
    .in('id', connectionIds);

  const connMap: Record<string, ConnRow> = {};
  for (const c of (connections ?? []) as ConnRow[]) connMap[c.id] = c;

  const businessIds = [...new Set(Object.values(connMap).map(c => c.business_id))];
  if (businessIds.length === 0) return NextResponse.json(summary);

  // ── Step 3: Load businesses + reply_settings in parallel ───
  const [{ data: businesses }, { data: settingsRows }] = await Promise.all([
    db.from('businesses').select('id, plan, plan_expires_at').in('id', businessIds),
    db.from('reply_settings').select('business_id, auto_activated').in('business_id', businessIds),
  ]);

  const bizMap: Record<string, BizRow> = {};
  for (const b of (businesses ?? []) as BizRow[]) bizMap[b.id] = b;

  // Mutable local cache — prevents duplicate auto_activated updates within a batch
  const settingsMap: Record<string, SettingsRow> = {};
  for (const s of (settingsRows ?? []) as SettingsRow[]) settingsMap[s.business_id] = { ...s };

  // ── Step 4: Process each approved review ───────────────────
  for (const review of approvedReviews) {
    const conn = connMap[review.connection_id as string];
    if (!conn) continue;

    const biz = bizMap[conn.business_id];
    if (!biz) continue;

    // Safety net: non-paid businesses should not auto-post — leave as 'approved'
    if (!isPaid({ plan: biz.plan, plan_expires_at: biz.plan_expires_at })) continue;

    summary.processed++;

    const replyText = review.reply_text as string | null;
    if (!replyText || !conn.refresh_token) {
      summary.failed++;
      await db.from('gbp_reviews').update({ reply_status: 'failed' }).eq('id', review.id);
      continue;
    }

    // Per-review isolation: one failure must not abort the rest
    try {
      const accessToken = await refreshAccessToken(conn.refresh_token as string);
      await postReplyToGoogle({
        accountId:      conn.google_account_id,
        locationId:     conn.location_id,
        googleReviewId: review.google_review_id as string,
        replyText,
        accessToken,
      });

      await db
        .from('gbp_reviews')
        .update({ reply_status: 'sent', replied_at: new Date().toISOString() })
        .eq('id', review.id);
      summary.sent++;

      // AUTO-ACTIVATION: first successful post for a paid business
      const settings = settingsMap[conn.business_id];
      if (settings && !settings.auto_activated) {
        await db
          .from('reply_settings')
          .update({ auto_activated: true })
          .eq('business_id', conn.business_id);
        settings.auto_activated = true; // prevent duplicate UPDATE in this batch
      }

    } catch (e) {
      summary.failed++;
      console.error(`[gbp-post] failed for review ${review.id as string}:`, (e as Error).message);
      await db.from('gbp_reviews').update({ reply_status: 'failed' }).eq('id', review.id);
      if (env.SENTRY_DSN) {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(e, { tags: { review_id: review.id as string } });
      }
    }
  }

  return NextResponse.json(summary);
}
