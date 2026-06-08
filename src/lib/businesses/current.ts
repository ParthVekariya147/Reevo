import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const BUSINESS_COOKIE = 'reevo_business_id';

const MODERN_SELECT = [
  'id',
  'owner_id',
  'name',
  'tagline',
  'google_link',
  'brand_color',
  'logo_initials',
  'logo_url',
  'min_rating_for_google',
  'language',
  'plan',
  'review_platforms',
  'onboarding_complete',
  'onboarding_step',
  'owner_name',
  'business_type',
  'review_keywords',
  'review_length_preference',
  'funnel_style',
  'funnel_heading',
  'funnel_sub',
  'funnel_font',
  'funnel_accent_color',
  'funnel_bg_image_url',
  'funnel_bg_blur',
  'funnel_bg_dim',
  'funnel_card_bg',
  'funnel_preset_name',
  'created_at',
  'updated_at',
].join(', ');

const LEGACY_SELECT = [
  'id',
  'name',
  'category',
  'services',
  'google_review_link',
  'logo_url',
  'created_at',
  'description',
  'brand_primary_color',
  'brand_tagline',
  'onboarding_completed',
  'qr_request_status',
  'updated_at',
].join(', ');

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type AdminClient = ReturnType<typeof createAdminClient>;
type AnyClient = SupabaseClient | AdminClient;
type ApiError = { code?: string | null; message?: string | null } | null;
type BusinessRow = Record<string, unknown>;

function autoInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('');
}

function isMissingColumnError(error: ApiError) {
  if (!error?.message) return false;

  return (
    error.code === '42703'
    || error.code === 'PGRST204'
    || [
      'owner_id',
      'brand_color',
      'google_link',
      'logo_initials',
      'min_rating_for_google',
      'review_platforms',
      'onboarding_complete',
      'language',
    ].some((column) => error.message?.includes(column))
  );
}

export function normalizeBusiness(business: BusinessRow | null): BusinessRow | null {
  if (!business) return null;

  const name = typeof business.name === 'string' ? business.name : '';
  const fallbackInitials = autoInitials(name) || 'BZ';

  return {
    ...business,
    tagline: typeof business.tagline === 'string' ? business.tagline : null,
    google_link: typeof business.google_link === 'string' ? business.google_link : null,
    brand_color: typeof business.brand_color === 'string' && business.brand_color
      ? business.brand_color
      : '#6E5BFF',
    logo_initials: typeof business.logo_initials === 'string' && business.logo_initials
      ? business.logo_initials
      : fallbackInitials,
    min_rating_for_google: typeof business.min_rating_for_google === 'number'
      ? business.min_rating_for_google
      : 4,
    language: typeof business.language === 'string' && business.language
      ? business.language
      : 'en',
    plan: typeof business.plan === 'string' && business.plan
      ? business.plan
      : 'free',
    review_platforms: Array.isArray(business.review_platforms)
      ? business.review_platforms
      : [],
    onboarding_complete: typeof business.onboarding_complete === 'boolean'
      ? business.onboarding_complete
      : false,
    onboarding_step: typeof business.onboarding_step === 'number'
      ? business.onboarding_step
      : 0,
    owner_name: typeof business.owner_name === 'string' ? business.owner_name : null,
    review_length_preference: Array.isArray(business.review_length_preference)
      ? business.review_length_preference
      : ['short', 'medium'],
    funnel_style: typeof business.funnel_style === 'string' && business.funnel_style
      ? business.funnel_style
      : 'elegant',
    funnel_heading: typeof business.funnel_heading === 'string' ? business.funnel_heading : null,
    funnel_sub: typeof business.funnel_sub === 'string' ? business.funnel_sub : null,
    funnel_font: typeof business.funnel_font === 'string' && business.funnel_font
      ? business.funnel_font
      : 'DM Sans',
    funnel_accent_color: typeof business.funnel_accent_color === 'string' && business.funnel_accent_color
      ? business.funnel_accent_color
      : '#1a1a1a',
    funnel_bg_image_url: typeof business.funnel_bg_image_url === 'string' ? business.funnel_bg_image_url : null,
    funnel_bg_blur: typeof business.funnel_bg_blur === 'number' ? business.funnel_bg_blur : 0,
    funnel_bg_dim: typeof business.funnel_bg_dim === 'number' ? business.funnel_bg_dim : 0,
    funnel_card_bg: typeof business.funnel_card_bg === 'string' ? business.funnel_card_bg : null,
    funnel_preset_name: typeof business.funnel_preset_name === 'string' ? business.funnel_preset_name : null,
  };
}

export function normalizeLegacyBusiness(business: BusinessRow | null): BusinessRow | null {
  if (!business) return null;

  const name = typeof business.name === 'string' ? business.name : '';
  const tagline = typeof business.brand_tagline === 'string' && business.brand_tagline
    ? business.brand_tagline
    : (typeof business.description === 'string' ? business.description : null);

  return {
    id: business.id,
    owner_id: null,
    name,
    tagline,
    google_link: typeof business.google_review_link === 'string' ? business.google_review_link : null,
    brand_color: typeof business.brand_primary_color === 'string' && business.brand_primary_color
      ? business.brand_primary_color
      : '#6E5BFF',
    logo_initials: autoInitials(name) || 'BZ',
    min_rating_for_google: 4,
    language: 'en',
    plan: 'free',
    review_platforms: [],
    onboarding_complete: Boolean(business.onboarding_completed),
    created_at: typeof business.created_at === 'string' ? business.created_at : new Date().toISOString(),
    updated_at: typeof business.updated_at === 'string' ? business.updated_at : new Date().toISOString(),
    legacy_category: typeof business.category === 'string' ? business.category : null,
    legacy_services: Array.isArray(business.services) ? business.services : [],
    legacy_logo_url: typeof business.logo_url === 'string' ? business.logo_url : null,
    legacy_qr_request_status: typeof business.qr_request_status === 'string' ? business.qr_request_status : null,
  };
}

async function getLegacyBusinessById(supabase: AnyClient, businessId: string) {
  const { data, error } = await supabase
    .from('businesses')
    .select(LEGACY_SELECT)
    .eq('id', businessId)
    .maybeSingle();

  return {
    business: normalizeLegacyBusiness((data ?? null) as BusinessRow | null),
    error,
  };
}

export async function getCurrentBusiness(supabase: SupabaseClient, userId: string) {
  const db = createAdminClient();

  const modern = await db
    .from('businesses')
    .select(MODERN_SELECT)
    .eq('owner_id', userId)
    .maybeSingle();

  if (!modern.error) {
    return {
      business: normalizeBusiness((modern.data ?? null) as BusinessRow | null),
      error: null,
      schema: 'modern' as const,
    };
  }

  if (!isMissingColumnError(modern.error)) {
    return { business: null, error: modern.error, schema: 'modern' as const };
  }

  const cookieStore = await cookies();
  const legacyId = cookieStore.get(BUSINESS_COOKIE)?.value;
  if (!legacyId) {
    return { business: null, error: null, schema: 'legacy' as const };
  }

  const legacy = await getLegacyBusinessById(db, legacyId);

  // CRIT-2: verify ownership — cookie value must belong to this user
  if (legacy.business && (legacy.business as BusinessRow).owner_id !== userId) {
    return { business: null, error: null, schema: 'legacy' as const };
  }

  return {
    business: legacy.business,
    error: legacy.error,
    schema: 'legacy' as const,
  };
}

export async function getCurrentBusinessId(supabase: SupabaseClient, userId: string) {
  const { business, error, schema } = await getCurrentBusiness(supabase, userId);
  return {
    businessId: typeof business?.id === 'string' ? business.id : null,
    business,
    error,
    schema,
  };
}

export function shouldUseLegacyBusinessFallback(error: ApiError) {
  return isMissingColumnError(error);
}
