import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentBusiness } from '@/lib/businesses/current';

/* GET /api/businesses/reputation
   Returns real review stats for the authenticated business:
   avg_rating, total_reviews, distribution {1..5: count}     */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { business, error: bizError } = await getCurrentBusiness(supabase, user.id);
  if (bizError) {
    console.error('[businesses/reputation] business error:', bizError);
    return NextResponse.json({ error: 'Failed to load business' }, { status: 500 });
  }
  if (!business) return NextResponse.json({ error: 'No business found' }, { status: 404 });

  const { data: rows, error } = await supabase
    .from('generated_reviews')
    .select('rating')
    .eq('business_id', business.id)
    .neq('status', 'private_feedback')
    .limit(10000);

  if (error) {
    console.error('[businesses/reputation] DB error:', error);
    return NextResponse.json({ error: 'Failed to load reputation data' }, { status: 500 });
  }

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  let sum = 0;

  for (const row of rows ?? []) {
    const r = row.rating as number;
    if (r >= 1 && r <= 5) {
      distribution[r] = (distribution[r] ?? 0) + 1;
      sum += r;
      total++;
    }
  }

  const avg_rating = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;

  return NextResponse.json({ avg_rating, total_reviews: total, distribution });
}
