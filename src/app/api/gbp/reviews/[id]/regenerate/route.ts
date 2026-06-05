import { NextRequest, NextResponse } from 'next/server';
import { createClient }      from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateReply }     from '@/lib/ai/generateReply';
import type { ReplyLength }  from '@/lib/ai/generateReply';

const DEFAULTS = {
  tone:         'friendly',
  signature:    null as string | null,
  language:     null as string | null,
  reply_length: 'medium',
};

/* POST /api/gbp/reviews/[id]/regenerate
   Auth + ownership check. Re-generates reply_text using current reply_settings.
   Keeps reply_status = 'awaiting_approval'. Returns { reply_text }. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: reviewId } = await params;
  const db = createAdminClient();

  // Resolve caller's business
  const { data: biz } = await db
    .from('businesses')
    .select('id, language')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // Load review
  const { data: review } = await db
    .from('gbp_reviews')
    .select('id, connection_id, rating, comment, reviewer_name')
    .eq('id', reviewId)
    .maybeSingle();

  if (!review) {
    return NextResponse.json({ error: 'Review not found' }, { status: 404 });
  }

  // Ownership: connection must belong to caller's business
  const { data: conn } = await db
    .from('gbp_connections')
    .select('id, business_id')
    .eq('id', review.connection_id as string)
    .maybeSingle();

  if (!conn || (conn.business_id as string) !== (biz.id as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Load reply_settings
  const { data: settings } = await db
    .from('reply_settings')
    .select('tone, signature, language, reply_length')
    .eq('business_id', biz.id as string)
    .maybeSingle();

  const s = settings as { tone?: string; signature?: string | null; language?: string | null; reply_length?: string } | null;

  const tone        = s?.tone        ?? DEFAULTS.tone;
  const signature   = s?.signature   ?? DEFAULTS.signature;
  const language    = s?.language    ?? DEFAULTS.language ?? (biz.language as string | null) ?? 'en';
  const replyLength = (s?.reply_length ?? DEFAULTS.reply_length) as ReplyLength;

  const replyText = await generateReply({
    reviewText:  (review.comment as string | null) ?? '',
    rating:      (review.rating  as number | null) ?? 3,
    tone,
    signature,
    language,
    replyLength,
  });

  await db
    .from('gbp_reviews')
    .update({ reply_text: replyText, reply_status: 'awaiting_approval' })
    .eq('id', reviewId);

  return NextResponse.json({ reply_text: replyText });
}
