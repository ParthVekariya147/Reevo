import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';

const PAGE_SIZE = 25;

export async function GET(request: NextRequest) {
  const result = await requireAdmin();
  if ('error' in result) return result.error;

  const db = createAdminClient();
  const sp = request.nextUrl.searchParams;
  const page   = Math.max(1, parseInt(sp.get('page') ?? '1'));
  const status = sp.get('status') ?? '';
  const search = (sp.get('q') ?? '').toLowerCase();

  const offset = (page - 1) * PAGE_SIZE;

  let query = db
    .from('invoices')
    .select(`
      id, subscription_id, business_id, amount_cents, currency,
      status, provider_inv_id, pdf_url, created_at,
      businesses (name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false });   // hits invoices_created_idx

  if (status) query = query.eq('status', status); // hits invoices_status_idx

  // Push business-name search to SQL: look up matching business IDs via trgm ilike,
  // then filter invoices by business_id. Avoids full table fetch into Node.
  if (search) {
    const { data: bizMatches } = await db
      .from('businesses')
      .select('id')
      .ilike('name', `%${search}%`)
      .limit(500);
    const matchingBizIds = (bizMatches ?? []).map((b: { id: string }) => b.id);
    if (matchingBizIds.length === 0) {
      // Short-circuit: no businesses match — still return global summary
      const summary = await buildInvoiceSummary(db);
      return NextResponse.json({ data: [], total: 0, page, page_size: PAGE_SIZE, has_more: false, summary });
    }
    query = query.in('business_id', matchingBizIds);
  }

  // .range() applied on ALL paths — count:'exact' reflects filtered set
  query = query.range(offset, offset + PAGE_SIZE - 1);

  // Main query + summary in parallel (was sequential before)
  const [{ data, count, error }, summary] = await Promise.all([
    query,
    buildInvoiceSummary(db),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type BizJoin = { name: string };
  const pageRows = (data ?? []).map(inv => {
    const raw = inv.businesses;
    const biz = (Array.isArray(raw) ? raw[0] : raw) as BizJoin | null;
    return { ...inv, business_name: biz?.name ?? '', businesses: undefined };
  });

  const total = count ?? 0;

  return NextResponse.json({
    data: pageRows,
    total,
    page,
    page_size: PAGE_SIZE,
    has_more: total > page * PAGE_SIZE,
    summary,
  });
}

async function buildInvoiceSummary(db: SupabaseClient) {
  const [{ count: openCount }, { count: paidCount }, { data: revenueData }] = await Promise.all([
    db.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    db.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'paid'),
    db.from('invoices').select('amount_cents.sum()').eq('status', 'paid').single(),
  ]);
  return {
    total_revenue: ((revenueData as Record<string, number> | null)?.sum) ?? 0,
    open_count:    openCount ?? 0,
    paid_count:    paidCount ?? 0,
  };
}
