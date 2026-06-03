import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/admin/audit';
import { can } from '@/lib/admin/permissions';

const VALID_PLANS = ['free', 'starter', 'pro', 'enterprise'] as const;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ('error' in result) return result.error;

  const { id } = await params;
  const db = createAdminClient();

  const { data: business, error } = await db
    .from('businesses')
    .select(`
      id, owner_id, name, tagline, google_link, brand_color, logo_initials,
      plan, plan_expires_at, suspended_at, suspended_reason, created_at, updated_at,
      is_demo, demo_max_scans, demo_max_reviews, demo_expires_at,
      subscriptions (id, plan, status, current_period_end, cancel_at_end, provider, provider_id,
        invoices (id, amount_cents, currency, status, provider_inv_id, pdf_url, created_at)
      ),
      qr_codes (id, token, campaign_name, status, dynamic, ab_testing, created_at, updated_at)
    `)
    .eq('id', id)
    .single();

  if (error || !business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  // Owner email
  const { data: authUser } = await db.auth.admin.getUserById(business.owner_id);

  // Scan counts per QR code — use RPC COUNT to avoid fetching all rows (migration 023)
  const qrIds = Array.isArray(business.qr_codes) ? business.qr_codes.map((q: { id: string }) => q.id) : [];
  const scanCounts: Record<string, number> = {};
  if (qrIds.length > 0) {
    const { data: scanRows } = await db.rpc('admin_scan_counts_by_qr', { qr_ids: qrIds });
    (scanRows ?? []).forEach((r: { qr_id: string; count: number }) => { scanCounts[r.qr_id] = Number(r.count); });
  }

  // 30d scans for this business
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count: scans30d } = await db.from('qr_scans').select('id', { count: 'exact', head: true })
    .in('qr_id', qrIds).gte('scanned_at', thirtyDaysAgo);

  // Recent audit logs for this business
  const { data: auditLogs } = await db
    .from('audit_logs')
    .select('id, actor_id, action, target_type, target_id, meta, created_at')
    .eq('target_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Demo usage counts — all-time totals, only fetched when is_demo is true
  let demoCurrentScans   = 0;
  let demoCurrentReviews = 0;
  if ((business as { is_demo?: boolean }).is_demo && qrIds.length > 0) {
    const [{ count: totalScans }, { count: totalReviews }] = await Promise.all([
      db.from('qr_scans').select('id', { count: 'exact', head: true }).in('qr_id', qrIds),
      db.from('generated_reviews').select('id', { count: 'exact', head: true }).eq('business_id', id),
    ]);
    demoCurrentScans   = totalScans   ?? 0;
    demoCurrentReviews = totalReviews ?? 0;
  }

  const sub = Array.isArray(business.subscriptions)
    ? (business.subscriptions[0] ?? null)
    : (business.subscriptions ?? null);

  const qrCodesWithScans = Array.isArray(business.qr_codes)
    ? business.qr_codes.map((q: Record<string, unknown>) => ({ ...q, scan_count: scanCounts[q.id as string] ?? 0 }))
    : [];

  return NextResponse.json({
    ...business,
    owner_email:          authUser?.user?.email ?? '',
    subscription:         sub,
    qr_codes:             qrCodesWithScans,
    scans_30d:            scans30d ?? 0,
    audit_logs:           auditLogs ?? [],
    demo_current_scans:   demoCurrentScans,
    demo_current_reviews: demoCurrentReviews,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAdmin();
  if ('error' in result) return result.error;
  const { ctx } = result;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const db = createAdminClient();

  const updates: Record<string, unknown> = {};
  let action = '';

  if ('suspended' in body) {
    if (typeof body.suspended !== 'boolean') {
      return NextResponse.json({ error: 'suspended must be a boolean' }, { status: 400 });
    }
    const capability = body.suspended ? 'business.suspend' : 'business.unsuspend';
    if (!can(ctx.adminUser.role, capability)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const reason = body.reason ? String(body.reason).slice(0, 500) : null;
    updates.suspended_at     = body.suspended ? new Date().toISOString() : null;
    updates.suspended_reason = body.suspended ? reason : null;
    action = body.suspended ? 'business.suspended' : 'business.unsuspended';
  }

  if ('plan' in body) {
    if (!VALID_PLANS.includes(body.plan)) {
      return NextResponse.json({ error: `plan must be one of: ${VALID_PLANS.join(', ')}` }, { status: 400 });
    }
    if (!can(ctx.adminUser.role, 'business.change_plan')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    updates.plan = body.plan;

    // plan_expires_at: ISO string → set, null/empty → clear
    if ('plan_expires_at' in body) {
      if (body.plan_expires_at) {
        const d = new Date(body.plan_expires_at);
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: 'plan_expires_at must be a valid ISO date' }, { status: 400 });
        }
        updates.plan_expires_at = d.toISOString();
      } else {
        updates.plan_expires_at = null;
      }
    }

    action = 'business.plan_changed';
  }

  if ('reply_draft_limit_override' in body) {
    if (!can(ctx.adminUser.role, 'business.change_plan')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const val = body.reply_draft_limit_override;
    if (val !== null && (typeof val !== 'number' || !Number.isInteger(val) || val < 0)) {
      return NextResponse.json(
        { error: 'reply_draft_limit_override must be a non-negative integer or null' },
        { status: 400 },
      );
    }
    updates.reply_draft_limit_override = val;
    if (!action) action = 'business.reply_draft_override_set';
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  // subscriptions is the billing source of truth (billing/usage/route.ts reads
  // sub?.plan before biz.plan). Update it first so quota enforcement is always correct.
  // If this fails, businesses is untouched — no partial state.
  if ('plan' in body) {
    const { error: subError } = await db
      .from('subscriptions')
      .update({ plan: body.plan })
      .eq('business_id', id);
    if (subError) {
      // Reconciliation query:
      //   select * from audit_logs where action = 'business.plan_sync_failed'
      //   order by created_at desc;
      await writeAuditLog(ctx.user.id, 'business.plan_sync_failed', 'business', id, {
        target_plan: body.plan,
        sub_error:   subError.message,
        note: 'subscriptions NOT updated; businesses NOT touched — no partial state',
      });
      return NextResponse.json(
        { error: 'Failed to update subscription record. No changes were saved.' },
        { status: 500 },
      );
    }
  }

  const { error: bizError } = await db.from('businesses').update(updates).eq('id', id);
  if (bizError) {
    if ('plan' in body) {
      // subscriptions.plan already updated above; businesses.plan failed → billing
      // is correct but UI plan badge is stale. Log for manual reconciliation.
      // Reconciliation query:
      //   select * from audit_logs where action = 'business.plan_sync_failed'
      //   order by created_at desc;
      await writeAuditLog(ctx.user.id, 'business.plan_sync_failed', 'business', id, {
        target_plan: body.plan,
        biz_error:   bizError.message,
        note: 'subscriptions.plan updated; businesses.plan NOT updated — UI stale, billing correct',
      });
      return NextResponse.json({
        ok: false,
        partial: true,
        warning: 'Subscription updated but business record failed to sync. Check audit logs.',
      }, { status: 207 });
    }
    return NextResponse.json({ error: bizError.message }, { status: 500 });
  }

  await writeAuditLog(ctx.user.id, action, 'business', id, {
    changes: updates,
    reason:  body.reason ?? null,
    admin:   ctx.user.email,
  });

  return NextResponse.json({ ok: true });
}
