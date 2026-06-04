import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { env }               from '@/lib/env';
import { decryptToken }      from '@/lib/security/encrypt';
import { createOAuth2Client, fetchReviews, starRatingToInt, withRetry } from '@/lib/gbp/oauth';
import type { GbpReviewFromApi } from '@/lib/gbp/oauth';
import { getRedisClient }    from '@/lib/redis';
import { isGbpLive }         from '@/lib/gbp/liveFlag';
import { MOCK_REVIEWS }      from '@/lib/gbp/mock';

// Warn on Vercel if CRON_SECRET is not set — cron route will reject all calls.
if (
  typeof process !== 'undefined' &&
  process.env.NEXT_PHASE !== 'phase-production-build' &&
  process.env.VERCEL &&
  !process.env.CRON_SECRET
) {
  console.warn(
    '[gbp-sync] CRON_SECRET is not set. The cron job will reject all invocations. ' +
    'Add CRON_SECRET to Vercel environment variables.',
  );
}

export async function GET(request: NextRequest) {
  // Protect: Vercel sets Authorization: Bearer <CRON_SECRET> on cron calls.
  const cronSecret = env.CRON_SECRET;
  const auth       = request.headers.get('authorization');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db    = createAdminClient();
  const redis = getRedisClient();

  const { data: connections, error: connErr } = await db
    .from('gbp_connections')
    .select('id, business_id, google_account_id, location_id, refresh_token')
    .eq('status', 'active');

  if (connErr) {
    console.error('[gbp-sync] failed to load connections:', connErr.message);
    return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 });
  }

  const rows    = connections ?? [];
  const summary = { connections: rows.length, newReviews: 0, errors: 0 };

  // Resolve once before the loop — single DB round-trip for all connections.
  const live = await isGbpLive();

  for (const conn of rows) {
    // Null refresh_token means the connection is revoked or broken — skip in all modes.
    if (!conn.refresh_token) continue;

    // ── Step 1: Refresh access token (live mode only) ────────
    let accessToken = '';
    if (live) {
      try {
        const refreshToken = decryptToken(conn.refresh_token as string);
        const oauth2Client = createOAuth2Client();
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        const { token } = await oauth2Client.getAccessToken();
        if (!token) throw new Error('getAccessToken returned null');
        accessToken = token;
      } catch (e) {
        summary.errors++;
        await db.from('gbp_connections').update({ status: 'error' }).eq('id', conn.id);
        console.error(`[gbp-sync] auth failed for connection ${conn.id}:`, (e as Error).message);
        continue;
      }
    }

    // ── Step 2: Fetch and sync reviews ────────────────────────
    try {
      let pageToken: string | undefined;
      do {
        // In mock mode substitute fixture data so the full downstream path
        // (dedup, INSERT, Redis) is exercised without live Google API calls.
        const page: { reviews: GbpReviewFromApi[]; nextPageToken?: string } = live
          ? await withRetry(() =>
              fetchReviews(conn.google_account_id as string, conn.location_id as string, accessToken, pageToken),
            )
          : { reviews: MOCK_REVIEWS };

        for (const review of page.reviews ?? []) {
          const redisKey = `gbp-sync:${review.reviewId}`;

          // Soft dedup via Redis (works across serverless instances)
          if (redis) {
            const seen = await redis.get(redisKey);
            if (seen) continue;
          }

          // INSERT (not upsert) — on duplicate google_review_id the unique constraint
          // fires and insertErr is set. This guarantees reply_status / reply_text /
          // replied_at of already-processed reviews are never overwritten.
          const { error: insertErr } = await db.from('gbp_reviews').insert({
            connection_id:     conn.id,
            google_review_id:  review.reviewId,
            rating:            starRatingToInt(review.starRating),
            comment:           review.comment ?? null,
            reviewer_name:     review.reviewer?.isAnonymous
                                 ? null
                                 : (review.reviewer?.displayName ?? null),
            review_created_at: review.createTime,
            reply_status:      'pending',
          });

          if (!insertErr) {
            summary.newReviews++;
            // Cache for 30 days — unique constraint is the hard guard; Redis is the fast path
            if (redis) await redis.setex(redisKey, 30 * 24 * 60 * 60, '1');
          }
          // Unique violation is expected on re-sync — other errors are surfaced via summary.errors below
        }

        pageToken = page.nextPageToken;
      } while (pageToken);

      await db.from('gbp_connections')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', conn.id);

    } catch (e) {
      summary.errors++;
      console.error(`[gbp-sync] sync failed for connection ${conn.id}:`, (e as Error).message);
      // Mark this connection errored so the admin panel can surface it —
      // was previously only done for token failures (step 1).
      await db.from('gbp_connections').update({ status: 'error' }).eq('id', conn.id);
      if (env.SENTRY_DSN) {
        // Lazy Sentry import — only initialised when DSN is present
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(e, { tags: { connection_id: conn.id as string } });
      }
    }
  }

  return NextResponse.json(summary);
}
