import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentBusiness } from '@/lib/businesses/current';
import ScreenOnboarding from '@/components/dashboard/screens/ScreenOnboarding';
import { redirect } from 'next/navigation';

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Admin accounts have no business profile
  const db = createAdminClient();
  const { data: adminRow } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle();
  if (adminRow) redirect('/admin/dashboard');

  // Load any partial save so the wizard can pre-fill and resume
  const { business: biz } = await getCurrentBusiness(supabase, user.id);
  const existingBusiness = biz ? {
    name: biz.name as string,
    tagline: (biz.tagline as string | null) ?? null,
    brand_color: biz.brand_color as string,
    logo_initials: biz.logo_initials as string,
    google_link: (biz.google_link as string | null) ?? null,
    review_platforms: Array.isArray(biz.review_platforms) ? biz.review_platforms : [],
    min_rating_for_google: Number(biz.min_rating_for_google ?? 4),
    language: String(biz.language ?? 'en'),
    business_type:    (biz.business_type as string | null) ?? null,
    review_keywords:  (biz.review_keywords as string | null) ?? null,
    owner_name:       (biz.owner_name as string | null) ?? null,
  } : null;

  return (
    <ScreenOnboarding
      user={{
        id:            user!.id,
        email:         user!.email            ?? '',
        full_name:     user!.user_metadata?.full_name     ?? '',
        business_name: user!.user_metadata?.business_name ?? '',
        google_link:   user!.user_metadata?.google_link   ?? '',
        industry:      user!.user_metadata?.industry      ?? '',
      }}
      existingBusiness={existingBusiness}
    />
  );
}
