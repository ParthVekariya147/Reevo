import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import FunnelFlow, { type BusinessData } from './FunnelFlow';
import { type ReviewPlatformEntry } from '@/lib/platforms';
import { checkDemoLimits } from '@/lib/demo/limits';

export const metadata: Metadata = {
  title: 'Share your experience',
  description: 'Leave a quick review — it only takes 30 seconds.',
};

async function lookupToken(
  token: string,
): Promise<{ business: BusinessData; businessId: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  if (!supabaseUrl.startsWith('http')) return null;

  try {
    const supabase = await createClient();
    const { data: qr } = await supabase
      .from('qr_codes')
      .select(`
        id, token, status,
        businesses (
          id, name, tagline, google_link, brand_color,
          logo_initials, logo_url, min_rating_for_google, language, review_platforms,
          funnel_style, funnel_heading, funnel_sub, instagram_handle
        )
      `)
      .eq('token', token)
      .eq('status', 'live')
      .single();

    if (!qr || !qr.businesses) return null;

    const biz = (Array.isArray(qr.businesses) ? qr.businesses[0] : qr.businesses) as {
      id: string;
      name: string; tagline: string | null; google_link: string | null;
      brand_color: string; logo_initials: string; logo_url: string | null;
      min_rating_for_google: number; language: string;
      review_platforms: ReviewPlatformEntry[] | null;
      funnel_style: string | null; funnel_heading: string | null; funnel_sub: string | null;
      instagram_handle: string | null;
    };

    // Use saved platforms; fall back to google_link so old records still work
    const reviewPlatforms: ReviewPlatformEntry[] =
      biz.review_platforms?.length
        ? biz.review_platforms
        : (biz.google_link ? [{ id: 'google', url: biz.google_link, enabled: true }] : []);

    return {
      businessId: biz.id,
      business: {
        name:               biz.name,
        tagline:            biz.tagline     ?? '',
        googleLink:         biz.google_link ?? '',
        reviewPlatforms,
        brandColor:         biz.brand_color,
        logoInitials:       biz.logo_initials,
        logoUrl:            biz.logo_url    ?? null,
        minRatingForGoogle: biz.min_rating_for_google,
        language:           biz.language,
        funnelStyle:        biz.funnel_style     ?? 'elegant',
        funnelHeading:      biz.funnel_heading   ?? null,
        funnelSub:          biz.funnel_sub       ?? null,
        instagramHandle:    biz.instagram_handle ?? null,
      },
    };
  } catch {
    return null;
  }
}

export default async function FunnelPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await lookupToken(token);

  let demoLimit: { reached: boolean; reason?: 'scan_limit' | 'review_limit' | 'expired' } | null = null;
  if (result) {
    const check = await checkDemoLimits(result.businessId);
    if (!check.allowed) {
      demoLimit = { reached: true, reason: check.reason };
    }
  }

  return (
    <FunnelFlow
      business={result?.business ?? null}
      token={token}
      valid={result !== null}
      demoLimit={demoLimit}
    />
  );
}
