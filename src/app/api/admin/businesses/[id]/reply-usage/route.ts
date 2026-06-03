import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin }       from '@/lib/admin/auth';
import { createAdminClient }  from '@/lib/supabase/admin';
import { isPaid }             from '@/lib/billing/tier';

/* GET /api/admin/businesses/[id]/reply-usage
   Returns reply-draft usage + effective limit for a specific business.
   Response: { draftsThisMonth, draftsTotal, effectiveLimit, overrideValue } */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAdmin();
  if ('error' in result) return result.error;

  const { id } = await params;
  const db = createAdminClient();

  // Fetch business plan + override in a single query
  const { data: biz, error: bizError } = await db
    .from('businesses')
    .select('id, plan, plan_expires_at, reply_draft_limit_override')
    .eq('id', id)
    .single();

  if (bizError || !biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const startOfMonth = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
  ).toISOString();

  // Draft counts (month + all-time) in parallel
  const [monthResult, totalResult] = await Promise.all([
    db.from('review_reply_drafts')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', id)
      .gte('created_at', startOfMonth),
    db.from('review_reply_drafts')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', id),
  ]);

  // Effective limit: paid = unlimited (-1), free = override ?? global setting
  const paid = isPaid({
    plan:            biz.plan as string,
    plan_expires_at: biz.plan_expires_at as string | null,
  });

  let effectiveLimit = -1;
  if (!paid) {
    const { data: settingRow } = await db
      .from('admin_settings')
      .select('value')
      .eq('key', 'free_reply_draft_limit')
      .maybeSingle();

    const globalLimit = parseInt(
      (settingRow as { value: string } | null)?.value ?? '10',
      10,
    ) || 10;

    const override = biz.reply_draft_limit_override as number | null;
    effectiveLimit  = override !== null && override !== undefined ? override : globalLimit;
  }

  return NextResponse.json({
    draftsThisMonth: monthResult.count ?? 0,
    draftsTotal:     totalResult.count ?? 0,
    effectiveLimit,
    overrideValue:   biz.reply_draft_limit_override as number | null,
  });
}
