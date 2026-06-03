/** Minimum fields needed to determine paid/free status. */
export interface BusinessTierFields {
  plan:            string;
  plan_expires_at?: string | null;
}

/**
 * Single source of truth for "is this business on a paid plan?"
 *
 * A business is paid when:
 *   - plan is not 'free', AND
 *   - plan_expires_at is either null (permanent grant) or in the future
 *
 * Matches the admin panel override pattern: admins can set plan_expires_at
 * to a past date to effectively downgrade without changing plan text.
 */
export function isPaid(business: BusinessTierFields): boolean {
  if (business.plan === 'free') return false;
  if (!business.plan_expires_at) return true;
  return new Date(business.plan_expires_at) > new Date();
}
