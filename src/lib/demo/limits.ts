import { createAdminClient } from '@/lib/supabase/admin';

export type DemoLimitResult = {
  allowed: boolean;
  reason?: 'scan_limit' | 'review_limit' | 'expired';
  current_scans: number;
  max_scans: number | null;
  current_reviews: number;
  max_reviews: number | null;
  expires_at: string | null;
};

export async function checkDemoLimits(businessId: string): Promise<DemoLimitResult> {
  const db = createAdminClient();

  const { data: biz } = await db
    .from('businesses')
    .select('is_demo, demo_max_scans, demo_max_reviews, demo_expires_at')
    .eq('id', businessId)
    .single();

  if (!biz || !biz.is_demo) {
    return { allowed: true, current_scans: 0, max_scans: null, current_reviews: 0, max_reviews: null, expires_at: null };
  }

  if (biz.demo_expires_at && new Date(biz.demo_expires_at) < new Date()) {
    return {
      allowed:         false,
      reason:          'expired',
      current_scans:   0,
      max_scans:       biz.demo_max_scans   ?? null,
      current_reviews: 0,
      max_reviews:     biz.demo_max_reviews ?? null,
      expires_at:      biz.demo_expires_at,
    };
  }

  // Get all QR code IDs for this business to count scans
  const { data: qrCodes } = await db
    .from('qr_codes')
    .select('id')
    .eq('business_id', businessId);

  const qrIds = (qrCodes ?? []).map((q: { id: string }) => q.id);

  const [scanRes, reviewRes] = await Promise.all([
    qrIds.length > 0
      ? db.from('qr_scans').select('id', { count: 'exact', head: true }).in('qr_id', qrIds)
      : Promise.resolve({ count: 0 as number | null, data: null, error: null }),
    db.from('generated_reviews').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
  ]);

  const currentScans   = scanRes.count   ?? 0;
  const currentReviews = reviewRes.count ?? 0;

  if (biz.demo_max_scans !== null && currentScans >= biz.demo_max_scans) {
    return {
      allowed:         false,
      reason:          'scan_limit',
      current_scans:   currentScans,
      max_scans:       biz.demo_max_scans,
      current_reviews: currentReviews,
      max_reviews:     biz.demo_max_reviews ?? null,
      expires_at:      biz.demo_expires_at  ?? null,
    };
  }

  if (biz.demo_max_reviews !== null && currentReviews >= biz.demo_max_reviews) {
    return {
      allowed:         false,
      reason:          'review_limit',
      current_scans:   currentScans,
      max_scans:       biz.demo_max_scans   ?? null,
      current_reviews: currentReviews,
      max_reviews:     biz.demo_max_reviews,
      expires_at:      biz.demo_expires_at  ?? null,
    };
  }

  return {
    allowed:         true,
    current_scans:   currentScans,
    max_scans:       biz.demo_max_scans   ?? null,
    current_reviews: currentReviews,
    max_reviews:     biz.demo_max_reviews ?? null,
    expires_at:      biz.demo_expires_at  ?? null,
  };
}
