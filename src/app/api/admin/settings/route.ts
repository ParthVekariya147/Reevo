import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/admin/audit';
import { can } from '@/lib/admin/permissions';

type SettingsRow = { key: string; value: string };

const ALLOWED_KEYS = new Set([
  'site_name',
  'support_email',
  'maintenance_mode',
  'feature_flag_ai_v2',
  'feature_flag_new_funnel',
  'feature_flag_gbp_live',
  'free_reply_draft_limit',
]);

export async function GET() {
  const result = await requireAdmin();
  if ('error' in result) return result.error;

  const db = createAdminClient();
  const { data, error } = await db
    .from('admin_settings')
    .select('key, value')
    .order('key');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings: Record<string, string> = {};
  for (const row of (data ?? []) as SettingsRow[]) {
    settings[row.key] = row.value;
  }
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const result = await requireAdmin();
  if ('error' in result) return result.error;
  const { ctx } = result;

  if (!can(ctx.adminUser.role, 'settings.edit')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;

  const updates: SettingsRow[] = [];
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (typeof value !== 'string') continue;
    updates.push({ key, value });
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No valid keys to update' }, { status: 400 });
  }

  const db = createAdminClient();
  const now = new Date().toISOString();

  const { error } = await db
    .from('admin_settings')
    .upsert(
      updates.map(u => ({ ...u, updated_at: now, updated_by: ctx.adminUser.id })),
      { onConflict: 'key' },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(ctx.user.id, 'admin_settings.updated', 'admin_settings', 'global', {
    keys: updates.map(u => u.key),
    by: ctx.user.email,
  });

  return NextResponse.json({ ok: true });
}
