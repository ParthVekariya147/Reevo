import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentBusinessId } from '@/lib/businesses/current';

/* GET /api/analytics/summary?days=30
   Calls the analytics_summary Postgres RPC — single round-trip,
   DB-side aggregation, uses composite indexes from 002 migration. */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const db = createAdminClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawDays = parseInt(req.nextUrl.searchParams.get('days') ?? '30', 10);
  const days = Math.min(Math.max(1, isNaN(rawDays) ? 30 : rawDays), 365);

  const { businessId, error: businessError } = await getCurrentBusinessId(db as Awaited<ReturnType<typeof createClient>>, user.id);

  if (businessError) {
    return NextResponse.json({ error: businessError.message, code: businessError.code }, { status: 500 });
  }

  if (!businessId) {
    return NextResponse.json({ error: 'No business found' }, { status: 404 });
  }

  const sinceIso = new Date(Date.now() - days * 86400_000).toISOString();

  const [{ data, error }, { data: draftData, error: draftError }] = await Promise.all([
    db.rpc('analytics_summary', { p_business_id: businessId, p_days: days }),
    // DB-side tally: draft_index extracted from JSONB meta in SQL, no rows in Node
    db.rpc('analytics_draft_acceptance', { biz_id: businessId, since: sinceIso }),
  ]);

  if (error) {
    console.error('[analytics/summary] RPC error:', error);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  }
  if (draftError) {
    console.error('[analytics/summary] draft_acceptance RPC error:', draftError);
  }

  const draftRow = (draftData as Array<{ first: number; second: number }> | null)?.[0];
  const firstDraftCopied  = Number(draftRow?.first  ?? 0);
  const secondDraftCopied = Number(draftRow?.second ?? 0);

  return NextResponse.json(
    { ...data, draft_acceptance: { first: firstDraftCopied, second: secondDraftCopied } },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } },
  );
}
