import { createClient } from '@/lib/supabase/server';
import { getCurrentBusiness } from '@/lib/businesses/current';
import { redirect } from 'next/navigation';
import ScreenSettings from '@/components/dashboard/screens/ScreenSettings';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/app/business_dashboard/settings');

  const { business: currentBusiness } = await getCurrentBusiness(supabase, user.id);
  const business = currentBusiness ? {
    id: String(currentBusiness.id),
    name: String(currentBusiness.name ?? ''),
    tagline: (currentBusiness.tagline as string | null) ?? null,
    google_link: (currentBusiness.google_link as string | null) ?? null,
    brand_color: String(currentBusiness.brand_color ?? '#6E5BFF'),
    logo_initials: String(currentBusiness.logo_initials ?? 'BZ'),
    min_rating_for_google: Number(currentBusiness.min_rating_for_google ?? 4),
    language: String(currentBusiness.language ?? 'en'),
    plan: String(currentBusiness.plan ?? 'free'),
    review_length_preference: Array.isArray(currentBusiness.review_length_preference)
      ? (currentBusiness.review_length_preference as string[])
      : ['short', 'medium'],
    instagram_handle: (currentBusiness.instagram_handle as string | null) ?? null,
    funnel_style:   String(currentBusiness.funnel_style   ?? 'minimal'),
    funnel_heading: (currentBusiness.funnel_heading as string | null) ?? null,
    funnel_sub:     (currentBusiness.funnel_sub     as string | null) ?? null,
    funnel_font: String(currentBusiness.funnel_font ?? 'DM Sans'),
    funnel_accent_color: String(currentBusiness.funnel_accent_color ?? '#1a1a1a'),
    funnel_bg_image_url: (currentBusiness.funnel_bg_image_url as string | null) ?? null,
    funnel_bg_blur: Number(currentBusiness.funnel_bg_blur ?? 0),
    funnel_bg_dim: Number(currentBusiness.funnel_bg_dim ?? 0),
    funnel_card_bg: (currentBusiness.funnel_card_bg as string | null) ?? null,
    funnel_preset_name: (currentBusiness.funnel_preset_name as string | null) ?? null,
  } : null;

  return (
    <ScreenSettings
      initialBusiness={business ?? null}
      user={{
        id:        user.id,
        email:     user.email ?? '',
        full_name: user.user_metadata?.full_name ?? '',
      }}
    />
  );
}
