import { createClient } from '@/lib/supabase/server';
import { getCurrentBusiness } from '@/lib/businesses/current';
import { redirect } from 'next/navigation';
import ScreenOnboarding from '@/components/dashboard/screens/ScreenOnboarding';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ gbp_error?: string }>;
}) {
  const sp       = await searchParams;
  const gbpError = sp.gbp_error
    ? 'Could not connect Google Business Profile. Please try again.'
    : null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Load any partial save so the wizard can pre-fill and resume.
  // The layout already ensures the user is authenticated.
  const { business: biz } = await getCurrentBusiness(supabase, user!.id);

  // If onboarding is already complete, redirect to dashboard (handles direct URL access)
  if (biz?.onboarding_complete) redirect('/app/business_dashboard');

  // Check whether this business already has an active GBP connection
  const gbpConnected = biz
    ? await supabase
        .from('gbp_connections')
        .select('id')
        .eq('business_id', String(biz.id))
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
        .then(({ data }) => !!data)
    : false;

  const existingBusiness = biz ? {
    name:             biz.name as string,
    tagline:          (biz.tagline as string | null) ?? null,
    brand_color:      biz.brand_color as string,
    logo_initials:    biz.logo_initials as string,
    google_link:      (biz.google_link as string | null) ?? null,
    review_platforms: Array.isArray(biz.review_platforms) ? biz.review_platforms : [],
    min_rating_for_google: Number(biz.min_rating_for_google ?? 4),
    language:         String(biz.language ?? 'en'),
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
      initialStep={Number(biz?.onboarding_step ?? 0)}
      gbpConnected={gbpConnected}
      gbpError={gbpError}
    />
  );
}
