import { createAdminClient } from '@/lib/supabase/admin';
import PricingPreviewClient from './PricingPreviewClient';
import type { PlanApiRow } from '@/app/pricing/PricingPageClient';

export default async function PricingPreview() {
  const db = createAdminClient();
  const { data } = await db
    .from('plan_prices')
    .select('plan, amount_cents, currency, label, trial_days, review_limit, scan_limit, campaign_limit, is_popular')
    .order('amount_cents');

  return <PricingPreviewClient plans={(data as PlanApiRow[]) ?? []} />;
}
