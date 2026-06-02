import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/admin/audit';
import { env } from '@/lib/env';

/* POST /api/admin/demo/[id]/login-as
   Generates a one-time magic link to sign in as the target user.
   Restricted to super_admin only. Logs every use for audit trail. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const result = await requireAdmin();
  if ('error' in result) return result.error;
  const { ctx } = result;

  if (ctx.adminUser.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super_admins can impersonate users' }, { status: 403 });
  }

  const { id: userId } = await params;
  const db = createAdminClient();

  // Verify the target is a demo user
  const { data: biz } = await db
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .eq('is_demo', true)
    .limit(1)
    .maybeSingle();

  if (!biz) {
    return NextResponse.json({ error: 'No demo business found for this user' }, { status: 404 });
  }

  // Fetch target email
  const { data: targetUser } = await db.auth.admin.getUserById(userId);
  if (!targetUser?.user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const targetEmail = targetUser.user.email ?? '';

  // Generate magic link — redirectTo sends the user through the PKCE callback
  // handler so the session is properly established before landing on dashboard.
  const { data: linkData, error: linkError } = await db.auth.admin.generateLink({
    type:  'magiclink',
    email: targetEmail,
    options: {
      redirectTo: `${env.APP_URL}/auth/callback`,
    },
  });

  if (linkError || !linkData) {
    return NextResponse.json({ error: linkError?.message ?? 'Failed to generate link' }, { status: 500 });
  }

  // Log impersonation — parallel with audit log
  await Promise.all([
    db.from('admin_impersonation_logs').insert({
      admin_id:       ctx.user.id,
      admin_email:    ctx.user.email,
      target_user_id: userId,
      target_email:   targetEmail,
    }),
    writeAuditLog(ctx.user.id, 'admin_impersonation', 'user', userId, {
      admin:        ctx.user.email,
      target_email: targetEmail,
    }),
  ]);

  return NextResponse.json({
    link: (linkData as { properties?: { action_link?: string } }).properties?.action_link ?? '',
  });
}
