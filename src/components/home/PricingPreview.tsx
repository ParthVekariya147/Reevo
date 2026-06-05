import type { PlanApiRow } from "@/app/pricing/PricingPageClient";
import PricingPreviewClient from "./PricingPreviewClient";

async function fetchPlans(): Promise<PlanApiRow[]> {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/public/plans`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.plans ?? [];
  } catch {
    return [];
  }
}

export default async function PricingPreview() {
  const plans = await fetchPlans();
  return <PricingPreviewClient plans={plans} />;
}
