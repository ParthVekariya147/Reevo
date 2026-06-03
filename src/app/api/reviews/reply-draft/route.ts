import { NextRequest, NextResponse } from 'next/server';
import { createClient }       from '@/lib/supabase/server';
import { createAdminClient }  from '@/lib/supabase/admin';
import { rateLimit }          from '@/lib/security/rateLimit';
import { isPaid }             from '@/lib/billing/tier';
import { generateReply }      from '@/lib/ai/generateReply';
import type { ReplyLength }   from '@/lib/ai/generateReply';

/* PATCH /api/reviews/reply-draft
   Body: { draftId: string; copied: true }
   Marks copied_at on the draft row so we can track copy events. */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();

  const { data: biz } = await db
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!biz) {
    return NextResponse.json({ error: 'No business found for this account' }, { status: 404 });
  }

  let body: { draftId?: unknown; copied?: unknown };
  try { body = await req.json(); } catch { body = {}; }

  const draftId = typeof body.draftId === 'string' ? body.draftId.trim() : '';
  const copied  = body.copied === true;

  if (!draftId || !copied) {
    return NextResponse.json({ error: 'draftId and copied: true are required' }, { status: 400 });
  }

  const { error: updateError } = await db
    .from('review_reply_drafts')
    .update({ copied_at: new Date().toISOString() })
    .eq('id', draftId)
    .eq('business_id', biz.id as string);

  if (updateError) {
    console.error('[reply-draft PATCH]', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

const VALID_LENGTHS = new Set<ReplyLength>(['short', 'medium', 'long']);

/* POST /api/reviews/reply-draft
   Auth required. Body: { reviewText, rating, reviewerName? }
   Returns: { draftId, reply, remaining }
   remaining = null means unlimited (paid plan). */
export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();

  // ── Resolve business ──────────────────────────────────────
  const { data: biz, error: bizError } = await db
    .from('businesses')
    .select('id, plan, plan_expires_at, language, reply_draft_limit_override')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (bizError) {
    console.error('[reply-draft] business lookup:', bizError);
    return NextResponse.json({ error: 'Failed to load business' }, { status: 500 });
  }
  if (!biz) {
    return NextResponse.json({ error: 'No business found for this account' }, { status: 404 });
  }

  const bizId = biz.id as string;

  // ── Per-minute abuse guard (Redis sliding window) ─────────
  const rl = await rateLimit(`reply-draft:${bizId}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests — please wait a moment and try again.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) },
      },
    );
  }

  // ── Monthly tier limit ────────────────────────────────────
  const paid = isPaid({ plan: biz.plan as string, plan_expires_at: biz.plan_expires_at as string | null });

  let remaining: number | null = null;

  if (!paid) {
    // Read global default from admin_settings
    const { data: settingRow } = await db
      .from('admin_settings')
      .select('value')
      .eq('key', 'free_reply_draft_limit')
      .maybeSingle();

    const globalLimit = parseInt((settingRow as { value: string } | null)?.value ?? '10', 10) || 10;

    // Per-business override wins when set; -1 = unlimited for this business
    const override = biz.reply_draft_limit_override as number | null;
    const effectiveLimit = override !== null && override !== undefined ? override : globalLimit;

    if (effectiveLimit !== -1) {
      const startOfMonth = new Date(
        Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
      ).toISOString();

      const { count, error: countError } = await db
        .from('review_reply_drafts')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', bizId)
        .gte('created_at', startOfMonth);

      if (countError) {
        console.error('[reply-draft] usage count:', countError);
        return NextResponse.json({ error: 'Could not check usage' }, { status: 500 });
      }

      const used = count ?? 0;

      if (used >= effectiveLimit) {
        return NextResponse.json(
          {
            error: `Monthly draft limit reached (${effectiveLimit} drafts/month on free plan). Upgrade to get unlimited drafts.`,
            remaining: 0,
            limit: effectiveLimit,
          },
          { status: 429 },
        );
      }

      remaining = effectiveLimit - used - 1; // after this draft is saved
    }
  }

  // ── Parse + validate body ─────────────────────────────────
  let body: { reviewText?: unknown; rating?: unknown; reviewerName?: unknown };
  try { body = await req.json(); } catch { body = {}; }

  const reviewText = typeof body.reviewText === 'string' ? body.reviewText.trim() : '';
  const rating     = typeof body.rating === 'number' ? Math.round(body.rating) : 0;
  const reviewerName = typeof body.reviewerName === 'string' ? body.reviewerName.trim() : null;

  if (!reviewText) {
    return NextResponse.json({ error: 'reviewText is required' }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 });
  }
  if (reviewText.length > 5000) {
    return NextResponse.json({ error: 'reviewText too long (max 5000 chars)' }, { status: 400 });
  }

  // ── Load reply_settings for this business ─────────────────
  const { data: settings } = await db
    .from('reply_settings')
    .select('tone, signature, language, reply_length')
    .eq('business_id', bizId)
    .maybeSingle();

  const tone       = (settings as { tone?: string } | null)?.tone       ?? 'friendly';
  const signature  = (settings as { signature?: string | null } | null)?.signature ?? null;
  const language   = (settings as { language?: string | null } | null)?.language  ?? (biz.language as string | null) ?? 'en';
  const rawLength  = (settings as { reply_length?: string } | null)?.reply_length ?? 'medium';
  const replyLength: ReplyLength = VALID_LENGTHS.has(rawLength as ReplyLength)
    ? (rawLength as ReplyLength)
    : 'medium';

  // ── Generate reply ────────────────────────────────────────
  const reply = await generateReply({ reviewText, rating, tone, signature, language, replyLength });

  // ── Persist draft ─────────────────────────────────────────
  const { data: saved, error: insertError } = await db
    .from('review_reply_drafts')
    .insert({
      business_id:   bizId,
      reviewer_name: reviewerName,
      rating,
      review_text:   reviewText,
      reply_draft:   reply,
      tone_used:     tone,
      length_used:   replyLength,
    })
    .select('id')
    .single();

  if (insertError || !saved) {
    console.error('[reply-draft] insert error:', insertError);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }

  return NextResponse.json({ draftId: saved.id, reply, remaining });
}
