import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/admin/audit';
import { can } from '@/lib/admin/permissions';

export async function GET() {
  const result = await requireAdmin();
  if ('error' in result) return result.error;

  const db = createAdminClient();

  const [pricesRes, countsRes] = await Promise.all([
    db.from('plan_prices')
      .select('plan, amount_cents, currency, label, trial_days, review_limit, scan_limit, campaign_limit, is_popular, updated_at')
      .order('amount_cents'),
    // DB-side GROUP BY instead of fetching all businesses into Node
    db.rpc('admin_business_plan_counts'),
  ]);

  if (pricesRes.error) return NextResponse.json({ error: pricesRes.error.message }, { status: 500 });

  const counts: Record<string, number> = {};
  for (const row of (countsRes.data ?? []) as { plan: string; count: number }[]) {
    counts[row.plan] = Number(row.count);
  }

  const data = (pricesRes.data ?? []).map(p => ({
    ...p,
    is_popular:     p.is_popular ?? false,
    business_count: counts[p.plan] ?? 0,
    mrr_cents:      p.amount_cents * (counts[p.plan] ?? 0),
  }));

  return NextResponse.json({ data });
}

const VALID_PLANS = ['free', 'starter', 'pro', 'enterprise'];

export async function PATCH(request: NextRequest) {
  const result = await requireAdmin();
  if ('error' in result) return result.error;
  const { ctx } = result;

  if (!can(ctx.adminUser.role, 'plans.edit')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { plan, amount_cents, trial_days, review_limit, scan_limit, campaign_limit, is_popular } = body;

  if (!plan || !VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: `plan must be one of: ${VALID_PLANS.join(', ')}` }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (amount_cents !== undefined) {
    if (typeof amount_cents !== 'number' || !Number.isInteger(amount_cents) || amount_cents < 0) {
      return NextResponse.json({ error: 'amount_cents must be a non-negative integer' }, { status: 400 });
    }
    patch.amount_cents = amount_cents;
  }

  if (trial_days !== undefined) {
    if (trial_days !== null && (typeof trial_days !== 'number' || !Number.isInteger(trial_days) || trial_days < 1)) {
      return NextResponse.json({ error: 'trial_days must be a positive integer or null' }, { status: 400 });
    }
    patch.trial_days = trial_days;
  }

  for (const [key, val] of [['review_limit', review_limit], ['scan_limit', scan_limit], ['campaign_limit', campaign_limit]] as const) {
    if (val !== undefined) {
      if (typeof val !== 'number' || !Number.isInteger(val) || (val < -1)) {
        return NextResponse.json({ error: `${key} must be -1 (unlimited) or a positive integer` }, { status: 400 });
      }
      patch[key] = val;
    }
  }

  if (is_popular !== undefined) {
    if (typeof is_popular !== 'boolean') {
      return NextResponse.json({ error: 'is_popular must be a boolean' }, { status: 400 });
    }
    patch.is_popular = is_popular;
  }

  if (Object.keys(patch).length === 1) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const db = createAdminClient();

  // When marking a plan as popular, unset all others first (only one popular at a time)
  if (is_popular === true) {
    await db.from('plan_prices').update({ is_popular: false }).neq('plan', plan);
  }

  const { error } = await db.from('plan_prices').update(patch).eq('plan', plan);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(ctx.user.id, 'plan.limits_updated', 'plan', plan, { ...patch, admin: ctx.user.email });
  return NextResponse.json({ ok: true });
}
