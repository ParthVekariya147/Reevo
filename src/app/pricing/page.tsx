import type { Metadata } from "next";
import { createAdminClient } from '@/lib/supabase/admin';
import PricingPageClient, { type PlanApiRow } from "./PricingPageClient";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Pricing",
  description: "Start free with one location and 30 AI-drafted reviews per month. Upgrade for unlimited reviews, dynamic QR codes, and multi-location analytics.",
  alternates: { canonical: "/pricing" },
};

export default async function PricingPage() {
  const db = createAdminClient();
  const { data } = await db
    .from('plan_prices')
    .select('plan, amount_cents, amount_cents_yearly, currency, label, trial_days, review_limit, scan_limit, campaign_limit, is_popular')
    .order('amount_cents');
  const plans = (data as PlanApiRow[]) ?? [];
  return <PricingPageClient plans={plans} />;
}
