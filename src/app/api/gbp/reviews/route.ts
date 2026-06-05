import { NextRequest, NextResponse } from 'next/server';
import { createClient }      from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const PAGE_SIZE_MAX = 50;
const ALL_FETCH_CAP = 500;

const PRIORITY_STATUSES = new Set(['awaiting_approval', 'failed']);

function statusPriority(s: string): number {
  return PRIORITY_STATUSES.has(s) ? 0 : 1;
}

/* GET /api/gbp/reviews
   ?status=needs_approval|sent|all  ?page=1  ?page_size=25
   Returns { data, total, has_more, has_connection } */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();

  const { data: biz } = await db
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!biz) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const page     = Math.max(1, parseInt(searchParams.get('page')      ?? '1',  10));
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(searchParams.get('page_size') ?? '25', 10)));
  const status   = searchParams.get('status') ?? 'all';

  // Fetch connections for this business
  const { data: connections } = await db
    .from('gbp_connections')
    .select('id')
    .eq('business_id', biz.id as string);

  const hasConnection = (connections ?? []).length > 0;

  if (!hasConnection) {
    return NextResponse.json({ data: [], total: 0, has_more: false, has_connection: false });
  }

  const connectionIds = (connections as { id: string }[]).map(c => c.id);

  const SELECT =
    'id, connection_id, rating, comment, reviewer_name, review_created_at, reply_text, reply_status, replied_at';

  // ── Filtered tabs: simple DB-level pagination ──────────────
  if (status !== 'all') {
    let query = db
      .from('gbp_reviews')
      .select(SELECT, { count: 'exact' })
      .in('connection_id', connectionIds)
      .order('review_created_at', { ascending: false });

    if (status === 'needs_approval') {
      query = query.in('reply_status', ['awaiting_approval', 'failed']);
    } else if (status === 'sent') {
      query = query.eq('reply_status', 'sent');
    }

    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data: rows, error, count } = await query;
    if (error) {
      console.error('[gbp/reviews GET]', error);
      return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
    }

    return NextResponse.json({
      data:           rows ?? [],
      total:          count ?? 0,
      has_more:       from + pageSize < (count ?? 0),
      has_connection: true,
    });
  }

  // ── "all" tab: fetch all (capped), sort in JS (priority first, then date desc), paginate ──
  const { data: allRows, error, count } = await db
    .from('gbp_reviews')
    .select(SELECT, { count: 'exact' })
    .in('connection_id', connectionIds)
    .order('review_created_at', { ascending: false })
    .limit(ALL_FETCH_CAP);

  if (error) {
    console.error('[gbp/reviews GET all]', error);
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
  }

  const sorted = (allRows ?? []).slice().sort((a, b) => {
    const pa = statusPriority(a.reply_status as string);
    const pb = statusPriority(b.reply_status as string);
    if (pa !== pb) return pa - pb;
    return (
      new Date(b.review_created_at as string).getTime() -
      new Date(a.review_created_at as string).getTime()
    );
  });

  const total = count ?? sorted.length;
  const from  = (page - 1) * pageSize;
  const paged = sorted.slice(from, from + pageSize);

  return NextResponse.json({
    data:           paged,
    total,
    has_more:       from + pageSize < sorted.length,
    has_connection: true,
  });
}
