import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentBusiness } from '@/lib/businesses/current';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { business } = await getCurrentBusiness(supabase, user.id);
  if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

  const body = await request.json().catch(() => ({})) as { connection_id?: string };
  const db   = createAdminClient();

  // Disconnect a specific location or all locations for this business.
  // Always scope to the authenticated business — prevents cross-business revocation.
  let q = db
    .from('gbp_connections')
    .update({ status: 'revoked', refresh_token: null })
    .eq('business_id', String(business.id));

  if (body.connection_id) {
    q = q.eq('id', body.connection_id);
  }

  const { error } = await q;
  if (error) {
    console.error('[gbp/disconnect]', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
