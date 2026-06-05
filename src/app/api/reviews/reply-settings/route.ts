import { NextRequest, NextResponse } from 'next/server';
import { createClient }      from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const VALID_TONES   = new Set(['friendly', 'professional', 'casual', 'empathetic', 'formal']);
const VALID_LENGTHS = new Set(['short', 'medium', 'long']);

const DEFAULTS = {
  tone:               'friendly',
  signature:          null as string | null,
  language:           null as string | null, // null = inherit from businesses.language
  reply_length:       'medium',
  auto_reply_enabled: false,
};

/* GET /api/reviews/reply-settings
   Returns the reply_settings row for the authed business (defaults if none). */
export async function GET() {
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
    return NextResponse.json({ settings: DEFAULTS });
  }

  const { data, error } = await db
    .from('reply_settings')
    .select('tone, signature, language, reply_length, auto_reply_enabled')
    .eq('business_id', biz.id)
    .maybeSingle();

  if (error) {
    console.error('[reply-settings GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data ?? DEFAULTS });
}

/* PATCH /api/reviews/reply-settings
   Updates tone, signature, language, and/or reply_length.
   Upserts the row (creates it if it doesn't exist yet). */
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

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { body = {}; }

  const patch: Record<string, unknown> = { business_id: biz.id };
  const errors: string[] = [];

  if ('tone' in body) {
    if (typeof body.tone !== 'string' || !VALID_TONES.has(body.tone)) {
      errors.push(`tone must be one of: ${[...VALID_TONES].join(', ')}`);
    } else {
      patch.tone = body.tone;
    }
  }

  if ('reply_length' in body) {
    if (typeof body.reply_length !== 'string' || !VALID_LENGTHS.has(body.reply_length)) {
      errors.push(`reply_length must be one of: ${[...VALID_LENGTHS].join(', ')}`);
    } else {
      patch.reply_length = body.reply_length;
    }
  }

  if ('signature' in body) {
    if (body.signature !== null && typeof body.signature !== 'string') {
      errors.push('signature must be a string or null');
    } else {
      patch.signature = typeof body.signature === 'string'
        ? body.signature.trim().slice(0, 200) || null
        : null;
    }
  }

  if ('language' in body) {
    if (body.language !== null && typeof body.language !== 'string') {
      errors.push('language must be a BCP-47 string or null');
    } else {
      patch.language = typeof body.language === 'string'
        ? body.language.trim().slice(0, 10) || null
        : null;
    }
  }

  if ('auto_reply_enabled' in body) {
    if (typeof body.auto_reply_enabled !== 'boolean') {
      errors.push('auto_reply_enabled must be a boolean');
    } else {
      patch.auto_reply_enabled = body.auto_reply_enabled;
    }
  }

  if (errors.length) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 });
  }

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error: upsertError } = await db
    .from('reply_settings')
    .upsert(patch, { onConflict: 'business_id' });

  if (upsertError) {
    console.error('[reply-settings PATCH]', upsertError);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
