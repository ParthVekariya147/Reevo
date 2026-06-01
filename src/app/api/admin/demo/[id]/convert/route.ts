import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/admin/audit';
import { can } from '@/lib/admin/permissions';

/* POST /api/admin/demo/[id]/convert
   [id] = business ID.
   Converts the demo business to a full account by clearing is_demo. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAdmin();
  if ('error' in result) return result.error;
  const { ctx } = result;

  if (!can(ctx.adminUser.role, 'business.change_plan')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { id: businessId } = await params;
  const db = createAdminClient();

  // Atomic: filter on is_demo=true so a double-fire returns 0 rows on the second call
  const { data, error } = await db
    .from('businesses')
    .update({ is_demo: false, demo_converted_at: new Date().toISOString() })
    .eq('id', businessId)
    .eq('is_demo', true)
    .select('owner_id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Already converted or not found' }, { status: 409 });
  }

  await writeAuditLog(ctx.user.id, 'demo_converted', 'business', businessId, {
    admin:    ctx.user.email,
    owner_id: (data[0] as { owner_id: string }).owner_id,
  });

  return NextResponse.json({ ok: true });
}
