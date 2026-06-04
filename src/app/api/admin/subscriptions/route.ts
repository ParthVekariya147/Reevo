import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserEmailsByIds } from '@/lib/admin/getUsersByIds';
import type { SupabaseClient } from '@supabase/supabase-js';

const PAGE_SIZE = 25;

const PLAN_PRICES: Record<string, number> = {
  free: 0, starter: 2900, pro: 7900, enterprise: 19900,
};

async function buildSubscriptionSummary(db: SupabaseClient) {
  const [
    churnResult, pastDueResult,
    freeTotalResult, starterTotalResult, proTotalResult, enterpriseTotalResult,
    activeFreeResult, activeStarterResult, activeProResult, activeEnterpriseResult,
  ] = await Promise.all([
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('cancel_at_end', true),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'past_due'),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'free'),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'starter'),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'pro'),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'enterprise'),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'free').eq('status', 'active'),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'starter').eq('status', 'active'),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'pro').eq('status', 'active'),
    db.from('subscriptions').select('id', { count: 'exact', head: true }).eq('plan', 'enterprise').eq('status', 'active'),
  ]);
  return {
    mrr:
      (activeFreeResult.count       ?? 0) * PLAN_PRICES.free +
      (activeStarterResult.count    ?? 0) * PLAN_PRICES.starter +
      (activeProResult.count        ?? 0) * PLAN_PRICES.pro +
      (activeEnterpriseResult.count ?? 0) * PLAN_PRICES.enterprise,
    churn_risk: churnResult.count ?? 0,
    past_due:   pastDueResult.count ?? 0,
    plan_counts: {
      free:       freeTotalResult.count       ?? 0,
      starter:    starterTotalResult.count    ?? 0,
      pro:        proTotalResult.count        ?? 0,
      enterprise: enterpriseTotalResult.count ?? 0,
    },
  };
}

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if ('error' in result) return result.error;

  const db = createAdminClient();
  const sp = request.nextUrl.searchParams;
  const page   = Math.max(1, parseInt(sp.get('page') ?? '1'));
  const search = sp.get('q') ?? '';
  const plan   = sp.get('plan') ?? '';
  const status = sp.get('status') ?? '';
  const sortBy = sp.get('sort') ?? 'created_at';
  const dir    = sp.get('dir') === 'asc';
  const offset = (page - 1) * PAGE_SIZE;

  let query = db
    .from('subscriptions')
    .select(`
      id, business_id, plan, status, provider, provider_id,
      current_period_end, cancel_at_end, created_at, updated_at,
      businesses (id, name, owner_id)
    `, { count: 'exact' });

  if (plan)   query = query.eq('plan', plan);
  if (status) query = query.eq('status', status);

  // Push business-name search to SQL via ilike on the trgm-indexed businesses.name column.
  // Note: email search is not possible without denormalizing owner email into the DB —
  // the current JS filter on owner_email is dropped; name-only search is correct behaviour.
  if (search) {
    const { data: bizMatches } = await db
      .from('businesses')
      .select('id')
      .ilike('name', `%${search}%`)
      .limit(500);
    const matchingBizIds = (bizMatches ?? []).map((b: { id: string }) => b.id);
    if (matchingBizIds.length === 0) {
      // No businesses match the search — return empty page, still compute global summary
      const summary = await buildSubscriptionSummary(db);
      return NextResponse.json({ data: [], total: 0, page, page_size: PAGE_SIZE, has_more: false, summary });
    }
    query = query.in('business_id', matchingBizIds);
  }

  const sortable = ['plan', 'status', 'current_period_end', 'created_at'].includes(sortBy) ? sortBy : 'created_at';
  // .range() applied on ALL paths — count:'exact' now reflects the filtered set
  query = query.order(sortable, { ascending: dir }).range(offset, offset + PAGE_SIZE - 1);

  // Main query + summary run in parallel (was two sequential awaits before)
  const [{ data, count, error }, summary] = await Promise.all([
    query,
    buildSubscriptionSummary(db),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type BizJoin = { id: string; name: string; owner_id: string };
  function extractBiz(raw: unknown): BizJoin | null {
    if (!raw) return null;
    const r = Array.isArray(raw) ? raw[0] : raw;
    return r as BizJoin | null;
  }

  const ownerIds = [...new Set((data ?? []).map(s => extractBiz(s.businesses)?.owner_id).filter(Boolean) as string[])];
  const emailMap = await getUserEmailsByIds(db, ownerIds);

  const rows = (data ?? []).map(s => {
    const biz = extractBiz(s.businesses);
    return {
      ...s,
      business_name: biz?.name ?? '',
      owner_email:   biz ? (emailMap[biz.owner_id] ?? '') : '',
      businesses:    undefined,
    };
  });

  return NextResponse.json({
    data: rows,
    total: count ?? 0,
    page,
    page_size: PAGE_SIZE,
    has_more: (count ?? 0) > page * PAGE_SIZE,
    summary,
  });
}
