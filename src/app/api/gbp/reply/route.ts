import { NextRequest, NextResponse } from 'next/server';
import { createClient }          from '@/lib/supabase/server';
import { createAdminClient }     from '@/lib/supabase/admin';
import { env }                   from '@/lib/env';
import { refreshAccessToken }    from '@/lib/gbp/oauth';
import { postReplyToGoogle }     from '@/lib/gbp/postReply';
import { isPaid }                from '@/lib/billing/tier';

/* POST /api/gbp/reply
   Body: { reviewId: string; replyText?: string }
   Owner manually approves (and optionally edits) then posts a reply.
   replyText is optional — if omitted the stored reply_text draft is used. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();

  // Resolve caller's business (plan fields needed for auto-activation check)
  const { data: biz, error: bizError } = await db
    .from('businesses')
    .select('id, plan, plan_expires_at')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (bizError || !biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const body      = await request.json().catch(() => ({})) as Record<string, unknown>;
  const reviewId  = typeof body.reviewId === 'string' ? body.reviewId.trim() : '';
  if (!reviewId) {
    return NextResponse.json({ error: 'reviewId is required' }, { status: 400 });
  }

  // Load review
  const { data: review, error: reviewError } = await db
    .from('gbp_reviews')
    .select('id, connection_id, google_review_id, reply_text, reply_status')
    .eq('id', reviewId)
    .maybeSingle();

  if (reviewError || !review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  // Load connection — needed for ownership check + token + account/location IDs
  const { data: conn, error: connError } = await db
    .from('gbp_connections')
    .select('id, business_id, google_account_id, location_id, refresh_token')
    .eq('id', review.connection_id as string)
    .maybeSingle();

  if (connError || !conn) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  // Ownership: connection must belong to the caller's business
  if ((conn.business_id as string) !== (biz.id as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Optional: owner edited the draft before posting
  let replyText = review.reply_text as string | null;
  if (typeof body.replyText === 'string' && body.replyText.trim()) {
    replyText = body.replyText.trim();
    await db.from('gbp_reviews').update({ reply_text: replyText }).eq('id', reviewId);
  }

  if (!replyText) {
    return NextResponse.json(
      { error: 'No reply text — provide replyText or generate a draft first' },
      { status: 400 },
    );
  }

  if (!conn.refresh_token) {
    return NextResponse.json(
      { error: 'Connection has no refresh token — reconnect GBP' },
      { status: 409 },
    );
  }

  // Refresh access token using shared helper (same pattern as gbp-sync)
  let accessToken: string;
  try {
    accessToken = await refreshAccessToken(conn.refresh_token as string);
  } catch (e) {
    console.error('[gbp/reply] token refresh failed:', (e as Error).message);
    return NextResponse.json({ error: 'Failed to refresh GBP token' }, { status: 502 });
  }

  // Post reply to Google (mock mode: isGbpLive=false → no network call)
  try {
    await postReplyToGoogle({
      accountId:      conn.google_account_id as string,
      locationId:     conn.location_id as string,
      googleReviewId: review.google_review_id as string,
      replyText,
      accessToken,
    });
  } catch (e) {
    console.error('[gbp/reply] post failed:', (e as Error).message);
    await db.from('gbp_reviews').update({ reply_status: 'failed' }).eq('id', reviewId);
    if (env.SENTRY_DSN) {
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureException(e, { tags: { review_id: reviewId } });
    }
    return NextResponse.json({ error: 'Failed to post reply to Google' }, { status: 502 });
  }

  // Mark as sent
  await db
    .from('gbp_reviews')
    .update({ reply_status: 'sent', replied_at: new Date().toISOString() })
    .eq('id', reviewId);

  // AUTO-ACTIVATION: first successful paid post flips auto_activated → true so the
  // gbp-generate cron will subsequently set new reviews to 'approved' (not 'awaiting_approval').
  if (isPaid({ plan: biz.plan as string, plan_expires_at: biz.plan_expires_at as string | null })) {
    const { data: settings } = await db
      .from('reply_settings')
      .select('auto_activated')
      .eq('business_id', biz.id as string)
      .maybeSingle();

    if ((settings as { auto_activated: boolean } | null)?.auto_activated === false) {
      await db
        .from('reply_settings')
        .update({ auto_activated: true })
        .eq('business_id', biz.id as string);
    }
  }

  return NextResponse.json({ ok: true });
}
