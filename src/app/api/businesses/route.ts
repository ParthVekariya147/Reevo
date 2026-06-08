import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  BUSINESS_COOKIE,
  getCurrentBusiness,
  normalizeBusiness,
  normalizeLegacyBusiness,
  shouldUseLegacyBusinessFallback,
} from '@/lib/businesses/current';
import { sendEmail } from '@/lib/email/send';
import { welcomeEmailHtml } from '@/lib/email/templates/welcome';
import {
  sanitizeString, sanitizeColor, sanitizeLang,
  sanitizeRating, sanitizeUrl, sanitizePlatforms,
} from '@/lib/security/sanitize';
import { isValidGoogleReviewUrl } from '@/lib/validation/urls';

const VALID_LENGTHS = new Set(['short', 'medium', 'long']);

const INSTAGRAM_RE = /^[a-z0-9._]{1,30}$/i;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const VALID_FUNNEL_FONTS = new Set(['DM Sans', 'Playfair Display', 'Syne', 'Fraunces', 'Cormorant Garamond']);

function sanitizeInstagramHandle(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const s = String(raw).replace(/^@/, '').toLowerCase().trim();
  return INSTAGRAM_RE.test(s) ? s : null;
}

function sanitizeReviewLengths(raw: unknown): string[] {
  if (!Array.isArray(raw)) return ['short', 'medium'];
  const filtered = raw.filter((v): v is string => typeof v === 'string' && VALID_LENGTHS.has(v));
  return filtered.length > 0 ? filtered : ['short', 'medium'];
}

type ApiError = { code?: string | null; message?: string | null } | null;

type BusinessPayload = {
  owner_id: string;
  name: string;
  tagline: string | null;
  google_link: string | null;
  brand_color: string;
  logo_initials: string;
  min_rating_for_google: number;
  language: string;
  review_platforms: { id: string; url: string; enabled: boolean }[];
  onboarding_complete: boolean;
  business_type: string | null;
  review_keywords: string | null;
  owner_name: string | null;
};

function isMissingUpsertRpcError(error: ApiError) {
  if (!error?.message) return false;
  return error.code === 'PGRST202'
    || (error.message.includes('upsert_business') && error.message.toLowerCase().includes('function'));
}

function buildPayload(body: Record<string, unknown> | null, userId: string): BusinessPayload {
  const name = sanitizeString(body?.name, 120);

  return {
    owner_id:              userId,
    name,
    tagline:               sanitizeString(body?.tagline, 200) || null,
    google_link:           sanitizeUrl(body?.google_link) || null,
    brand_color:           sanitizeColor(body?.brand_color) ?? '#6E5BFF',
    logo_initials:         sanitizeString(body?.logo_initials, 2).toUpperCase() || name.slice(0, 2).toUpperCase(),
    min_rating_for_google: sanitizeRating(body?.min_rating_for_google, 1, 5),
    language:              sanitizeLang(body?.language),
    review_platforms:      sanitizePlatforms(body?.review_platforms),
    onboarding_complete:   Boolean(body?.onboarding_complete),
    business_type:         sanitizeString(body?.business_type, 60) || null,
    review_keywords:       sanitizeString(body?.review_keywords, 300) || null,
    owner_name:            sanitizeString(body?.owner_name, 100) || null,
  };
}

async function upsertBusinessViaRpc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  payload: BusinessPayload,
) {
  const { data, error } = await supabase.rpc('upsert_business', {
    p_owner_id: payload.owner_id,
    p_name: payload.name,
    p_tagline: payload.tagline,
    p_google_link: payload.google_link,
    p_brand_color: payload.brand_color,
    p_logo_initials: payload.logo_initials,
    p_min_rating_for_google: payload.min_rating_for_google,
    p_language: payload.language,
    p_review_platforms: payload.review_platforms,
    p_onboarding_complete: payload.onboarding_complete,
    p_business_type: payload.business_type,
    p_review_keywords: payload.review_keywords,
    p_owner_name: payload.owner_name,
  });

  return {
    business: normalizeBusiness((data ?? null) as Record<string, unknown> | null),
    error,
  };
}

async function upsertBusinessDirect(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string,
  payload: BusinessPayload,
) {
  const { data: existing, error: existingError } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (existingError) {
    return { business: null, error: existingError };
  }

  let data;
  let error;

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { owner_id: _, ...updatePayload } = payload;
    ({ data, error } = await supabase
      .from('businesses')
      .update({ ...updatePayload, updated_at: new Date().toISOString() })
      .eq('owner_id', ownerId)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from('businesses')
      .insert(payload)
      .select()
      .single());
  }

  return {
    business: normalizeBusiness((data ?? null) as Record<string, unknown> | null),
    error,
  };
}

async function upsertLegacyBusiness(
  supabase: Awaited<ReturnType<typeof createClient>>,
  legacyBusinessId: string | null,
  payload: BusinessPayload,
) {
  const legacyPayload = {
    name:                 payload.name,
    category:             'General',
    services:             [],
    google_review_link:   payload.google_link,
    logo_url:             null,
    description:          payload.tagline,
    brand_primary_color:  payload.brand_color,
    brand_tagline:        payload.tagline,
    onboarding_completed: payload.onboarding_complete,
    qr_request_status:    'not_requested',
    updated_at:           new Date().toISOString(),
  };

  let data;
  let error;

  if (legacyBusinessId) {
    ({ data, error } = await supabase
      .from('businesses')
      .update(legacyPayload)
      .eq('id', legacyBusinessId)
      .select()
      .single());
  } else {
    ({ data, error } = await supabase
      .from('businesses')
      .insert(legacyPayload)
      .select()
      .single());
  }

  return {
    business: normalizeLegacyBusiness((data ?? null) as Record<string, unknown> | null),
    error,
  };
}

function attachBusinessCookie(response: NextResponse, businessId: unknown) {
  if (typeof businessId !== 'string' || !businessId) return;

  response.cookies.set(BUSINESS_COOKIE, businessId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  });
}

/* GET /api/businesses */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { business, error } = await getCurrentBusiness(supabase, user.id);
  if (error) {
    console.error('[GET /api/businesses]', error);
    return NextResponse.json({ error: 'Failed to load business' }, { status: 500 });
  }

  // LOW-1: omit ownerEmail from response — fetch from supabase.auth on client if needed
  return NextResponse.json({ business });
}

/* POST /api/businesses - upsert (used by onboarding to progressively save) */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const db = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin accounts cannot own a business profile
  const { data: adminRow } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle();
  if (adminRow) {
    return NextResponse.json({ error: 'Admin accounts cannot create or manage a business profile.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const payload = buildPayload(body as Record<string, unknown> | null, user.id);
  if (!payload.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  let result = await upsertBusinessViaRpc(db as Awaited<ReturnType<typeof createClient>>, payload);

  if (result.error && isMissingUpsertRpcError(result.error)) {
    result = await upsertBusinessDirect(db as Awaited<ReturnType<typeof createClient>>, user.id, payload);
  }

  if (result.error && shouldUseLegacyBusinessFallback(result.error)) {
    result = await upsertLegacyBusiness(
      db as Awaited<ReturnType<typeof createClient>>,
      req.cookies.get(BUSINESS_COOKIE)?.value ?? null,
      payload,
    );
  }

  if (result.error) {
    console.error('[POST /api/businesses]', result.error);
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: 500 },
    );
  }

  // Persist the wizard step for mid-onboarding resume
  const rawStep = (body as Record<string, unknown> | null)?.onboarding_step;
  if (typeof rawStep === 'number' && Number.isInteger(rawStep) && rawStep >= 0) {
    await db.from('businesses').update({ onboarding_step: rawStep }).eq('owner_id', user.id);
  }

  // Send welcome email on first onboarding completion
  if (payload.onboarding_complete && result.business && user.email) {
    sendEmail({
      to:      user.email,
      subject: `Welcome to Reevo, ${payload.name}!`,
      html:    welcomeEmailHtml({ businessName: payload.name, email: user.email, appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'https://reevo.io' }),
    }).catch(e => console.error('[POST /api/businesses] Failed to send welcome email:', e));
  }

  const response = NextResponse.json({ business: result.business }, { status: 200 });
  attachBusinessCookie(response, result.business?.id);
  return response;
}

/* PATCH /api/businesses - partial update */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const db = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin accounts cannot own a business profile
  const { data: adminRow } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle();
  if (adminRow) {
    return NextResponse.json({ error: 'Admin accounts cannot create or manage a business profile.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if ('name'                  in body) updates.name                  = sanitizeString(body.name, 120) || undefined;
  if ('tagline'               in body) updates.tagline               = sanitizeString(body.tagline, 200) || null;
  if ('google_link'           in body) updates.google_link           = sanitizeUrl(body.google_link) || null;
  if ('brand_color'           in body) updates.brand_color           = sanitizeColor(body.brand_color) ?? undefined;
  if ('logo_initials'         in body) updates.logo_initials         = sanitizeString(body.logo_initials, 2).toUpperCase() || undefined;
  if ('min_rating_for_google' in body) updates.min_rating_for_google = sanitizeRating(body.min_rating_for_google, 1, 5);
  if ('language'              in body) updates.language              = sanitizeLang(body.language);
  if ('review_platforms'      in body) updates.review_platforms      = sanitizePlatforms(body.review_platforms);
  if ('onboarding_complete'   in body) updates.onboarding_complete   = Boolean(body.onboarding_complete);
  if ('business_type'            in body) updates.business_type            = sanitizeString(body.business_type, 60) || null;
  if ('review_keywords'          in body) updates.review_keywords          = sanitizeString(body.review_keywords, 300) || null;
  if ('owner_name'               in body) updates.owner_name               = sanitizeString(body.owner_name, 100) || null;
  if ('review_length_preference' in body) updates.review_length_preference = sanitizeReviewLengths(body.review_length_preference);
  if ('funnel_style'      in body) updates.funnel_style      = sanitizeString(body.funnel_style, 20) || 'minimal';
  if ('funnel_heading'    in body) updates.funnel_heading    = sanitizeString(body.funnel_heading, 200) || null;
  if ('funnel_sub'        in body) updates.funnel_sub        = sanitizeString(body.funnel_sub, 300) || null;
  if ('instagram_handle'  in body) updates.instagram_handle  = sanitizeInstagramHandle(body.instagram_handle);

  // Funnel appearance fields — validate before accepting
  if ('funnel_font' in body) {
    const v = String(body.funnel_font ?? '');
    if (v && !VALID_FUNNEL_FONTS.has(v)) {
      return NextResponse.json({ error: 'Invalid funnel_font value' }, { status: 400 });
    }
    updates.funnel_font = v || 'DM Sans';
  }
  if ('funnel_accent_color' in body) {
    const v = String(body.funnel_accent_color ?? '');
    if (v && !HEX_COLOR_RE.test(v)) {
      return NextResponse.json({ error: 'funnel_accent_color must be a 6-digit hex color' }, { status: 400 });
    }
    updates.funnel_accent_color = v || '#1a1a1a';
  }
  if ('funnel_bg_image_url' in body) {
    const v = body.funnel_bg_image_url;
    if (v !== null && v !== undefined && v !== '') {
      try { new URL(String(v)); } catch {
        return NextResponse.json({ error: 'funnel_bg_image_url must be a valid URL or null' }, { status: 400 });
      }
      updates.funnel_bg_image_url = String(v);
    } else {
      updates.funnel_bg_image_url = null;
    }
  }
  if ('funnel_bg_blur' in body) {
    const n = parseInt(String(body.funnel_bg_blur ?? '0'), 10);
    if (isNaN(n) || n < 0 || n > 20) {
      return NextResponse.json({ error: 'funnel_bg_blur must be an integer 0–20' }, { status: 400 });
    }
    updates.funnel_bg_blur = n;
  }
  if ('funnel_bg_dim' in body) {
    const n = parseInt(String(body.funnel_bg_dim ?? '0'), 10);
    if (isNaN(n) || n < 0 || n > 80) {
      return NextResponse.json({ error: 'funnel_bg_dim must be an integer 0–80' }, { status: 400 });
    }
    updates.funnel_bg_dim = n;
  }
  if ('funnel_card_bg'     in body) updates.funnel_card_bg     = sanitizeString(body.funnel_card_bg, 20) || null;
  if ('funnel_preset_name' in body) updates.funnel_preset_name = sanitizeString(body.funnel_preset_name, 60) || null;

  for (const key of Object.keys(updates)) {
    if (updates[key] === undefined) delete updates[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const current = await getCurrentBusiness(supabase, user.id);
  if (current.error) {
    return NextResponse.json({ error: current.error.message, code: current.error.code }, { status: 500 });
  }
  if (!current.business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const payload: BusinessPayload = {
    owner_id: user.id,
    name: typeof updates.name === 'string' ? updates.name : String(current.business.name ?? ''),
    tagline: 'tagline' in updates
      ? (updates.tagline as string | null)
      : (current.business.tagline as string | null),
    google_link: 'google_link' in updates
      ? (updates.google_link as string | null)
      : (current.business.google_link as string | null),
    brand_color: typeof updates.brand_color === 'string'
      ? updates.brand_color
      : String(current.business.brand_color ?? '#6E5BFF'),
    logo_initials: typeof updates.logo_initials === 'string'
      ? updates.logo_initials
      : String(current.business.logo_initials ?? 'BZ'),
    min_rating_for_google: typeof updates.min_rating_for_google === 'number'
      ? updates.min_rating_for_google
      : Number(current.business.min_rating_for_google ?? 4),
    language: typeof updates.language === 'string'
      ? updates.language
      : String(current.business.language ?? 'en'),
    review_platforms: Array.isArray(updates.review_platforms)
      ? updates.review_platforms as { id: string; url: string; enabled: boolean }[]
      : (
        Array.isArray(current.business.review_platforms)
          ? current.business.review_platforms as { id: string; url: string; enabled: boolean }[]
          : []
      ),
    onboarding_complete: typeof updates.onboarding_complete === 'boolean'
      ? updates.onboarding_complete
      : Boolean(current.business.onboarding_complete),
    business_type: 'business_type' in updates
      ? (updates.business_type as string | null)
      : ((current.business.business_type as string | null) ?? null),
    review_keywords: 'review_keywords' in updates
      ? (updates.review_keywords as string | null)
      : ((current.business.review_keywords as string | null) ?? null),
    owner_name: 'owner_name' in updates
      ? (updates.owner_name as string | null)
      : ((current.business.owner_name as string | null) ?? null),
  };

  // ── Guard: validate all required fields before marking onboarding complete ──
  if (updates.onboarding_complete === true) {
    const missingFields: string[] = [];

    if (!payload.name.trim())                     missingFields.push('name');
    if (!payload.tagline?.trim())                 missingFields.push('tagline');
    if (!payload.business_type?.trim())           missingFields.push('business_type');
    if (!payload.owner_name?.trim())              missingFields.push('owner_name');
    if (!payload.logo_initials.trim())            missingFields.push('logo_initials');

    // Google URL must be valid — check review_platforms first, fall back to google_link
    const googleEntry = payload.review_platforms.find(p => p.id === 'google');
    const googleUrl = googleEntry?.url?.trim() ? googleEntry.url : (payload.google_link ?? '');
    if (!isValidGoogleReviewUrl(googleUrl))       missingFields.push('google_review_url');

    if (missingFields.length > 0) {
      return NextResponse.json({
        error: 'Incomplete onboarding',
        missing_fields: missingFields,
        message: 'Please complete all required fields before launching',
      }, { status: 400 });
    }
  }

  let result = current.schema === 'legacy'
    ? await upsertLegacyBusiness(db as Awaited<ReturnType<typeof createClient>>, String(current.business.id), payload)
    : await upsertBusinessViaRpc(db as Awaited<ReturnType<typeof createClient>>, payload);

  if (current.schema !== 'legacy' && result.error && isMissingUpsertRpcError(result.error)) {
    result = await upsertBusinessDirect(db as Awaited<ReturnType<typeof createClient>>, user.id, payload);
  }

  if (result.error && shouldUseLegacyBusinessFallback(result.error)) {
    result = await upsertLegacyBusiness(
      db as Awaited<ReturnType<typeof createClient>>,
      req.cookies.get(BUSINESS_COOKIE)?.value ?? String(current.business.id),
      payload,
    );
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message, code: result.error.code }, { status: 500 });
  }

  // review_length_preference is not in the upsert_business RPC, so save it directly.
  if ('review_length_preference' in updates) {
    await db
      .from('businesses')
      .update({ review_length_preference: updates.review_length_preference })
      .eq('owner_id', user.id);
    if (result.business) {
      result.business.review_length_preference = updates.review_length_preference;
    }
  }

  // Fields not in the upsert_business RPC — save directly.
  const extraUpdates: Record<string, unknown> = {};
  if ('funnel_style'        in updates) extraUpdates.funnel_style        = updates.funnel_style;
  if ('funnel_heading'      in updates) extraUpdates.funnel_heading      = updates.funnel_heading;
  if ('funnel_sub'          in updates) extraUpdates.funnel_sub          = updates.funnel_sub;
  if ('instagram_handle'    in updates) extraUpdates.instagram_handle    = updates.instagram_handle;
  if ('funnel_font'         in updates) extraUpdates.funnel_font         = updates.funnel_font;
  if ('funnel_accent_color' in updates) extraUpdates.funnel_accent_color = updates.funnel_accent_color;
  if ('funnel_bg_image_url' in updates) extraUpdates.funnel_bg_image_url = updates.funnel_bg_image_url;
  if ('funnel_bg_blur'      in updates) extraUpdates.funnel_bg_blur      = updates.funnel_bg_blur;
  if ('funnel_bg_dim'       in updates) extraUpdates.funnel_bg_dim       = updates.funnel_bg_dim;
  if ('funnel_card_bg'      in updates) extraUpdates.funnel_card_bg      = updates.funnel_card_bg;
  if ('funnel_preset_name'  in updates) extraUpdates.funnel_preset_name  = updates.funnel_preset_name;
  if (Object.keys(extraUpdates).length > 0) {
    await db.from('businesses').update(extraUpdates).eq('owner_id', user.id);
    if (result.business) Object.assign(result.business, extraUpdates);
  }

  // When onboarding completes, invalidate the dashboard layout cache so the
  // sidebar appears immediately on the next navigation without a hard refresh.
  if (updates.onboarding_complete === true) {
    revalidatePath('/app/business_dashboard', 'layout');
  }

  const response = NextResponse.json({ business: result.business });
  attachBusinessCookie(response, result.business?.id);
  return response;
}
