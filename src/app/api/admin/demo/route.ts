import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/admin/audit';

/* GET /api/admin/demo — list all demo accounts */
export async function GET(_req: NextRequest) {
  const result = await requireAdmin();
  if ('error' in result) return result.error;
  const { ctx } = result;

  if (!['admin', 'super_admin'].includes(ctx.adminUser.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const db = createAdminClient();

  const { data: businesses, error } = await db
    .from('businesses')
    .select('id, owner_id, name, demo_max_scans, demo_max_reviews, demo_expires_at, demo_converted_at, demo_created_by, created_at')
    .eq('is_demo', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!businesses || businesses.length === 0) {
    return NextResponse.json({ data: [], my_role: ctx.adminUser.role });
  }

  const businessIds = businesses.map((b: { id: string }) => b.id);

  // Fetch all QR codes for these businesses to enable per-business scan counting
  const { data: qrCodes } = await db
    .from('qr_codes')
    .select('id, business_id')
    .in('business_id', businessIds);

  const qrByBusiness: Record<string, string[]> = {};
  (qrCodes ?? []).forEach((q: { id: string; business_id: string }) => {
    if (!qrByBusiness[q.business_id]) qrByBusiness[q.business_id] = [];
    qrByBusiness[q.business_id].push(q.id);
  });

  // Parallel: scan counts per business, review counts per business, owner emails
  const scanCountPromises = businesses.map((b: { id: string }) => {
    const ids = qrByBusiness[b.id] ?? [];
    if (ids.length === 0) return Promise.resolve({ count: 0 as number | null });
    return db.from('qr_scans').select('id', { count: 'exact', head: true }).in('qr_id', ids);
  });

  const reviewCountPromises = businesses.map((b: { id: string }) =>
    db.from('generated_reviews').select('id', { count: 'exact', head: true }).eq('business_id', b.id),
  );

  const ownerPromises = businesses.map((b: { owner_id: string }) =>
    db.auth.admin.getUserById(b.owner_id),
  );

  const [scanResults, reviewResults, ownerResults] = await Promise.all([
    Promise.all(scanCountPromises),
    Promise.all(reviewCountPromises),
    Promise.all(ownerPromises),
  ]);

  const data = businesses.map((b: {
    id: string; owner_id: string; name: string;
    demo_max_scans: number | null; demo_max_reviews: number | null;
    demo_expires_at: string | null; demo_converted_at: string | null;
    demo_created_by: string | null; created_at: string;
  }, i: number) => ({
    user_id:           b.owner_id,
    email:             (ownerResults[i] as { data: { user?: { email?: string } | null } }).data?.user?.email ?? '',
    business_id:       b.id,
    business_name:     b.name,
    demo_max_scans:    b.demo_max_scans,
    demo_max_reviews:  b.demo_max_reviews,
    demo_expires_at:   b.demo_expires_at,
    demo_converted_at: b.demo_converted_at,
    current_scans:     (scanResults[i] as { count: number | null }).count ?? 0,
    current_reviews:   (reviewResults[i] as { count: number | null }).count ?? 0,
    created_at:        b.created_at,
  }));

  return NextResponse.json({ data, my_role: ctx.adminUser.role });
}

/* POST /api/admin/demo — create a demo account */
export async function POST(req: NextRequest) {
  const result = await requireAdmin();
  if ('error' in result) return result.error;
  const { ctx } = result;

  if (!['admin', 'super_admin'].includes(ctx.adminUser.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    email,
    password,
    business_name,
    business_type,
    google_review_link,
    demo_max_scans,
    demo_max_reviews,
    demo_expires_days,
  } = body as Record<string, unknown>;

  // BUG-010: reject non-string passwords and short passwords with the same check
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  // BUG-007: trim string inputs before validation so whitespace-only values are rejected
  const trimmedEmail       = typeof email              === 'string' ? email.trim()              : '';
  const trimmedBizName     = typeof business_name      === 'string' ? business_name.trim()      : '';
  const trimmedReviewLink  = typeof google_review_link === 'string' ? google_review_link.trim() : '';

  if (!trimmedEmail || !trimmedBizName || !trimmedReviewLink) {
    return NextResponse.json(
      { error: 'email, password, business_name, and google_review_link are required' },
      { status: 400 },
    );
  }

  // BUG-007: validate google_review_link is a real http/https URL
  try {
    const parsed = new URL(trimmedReviewLink);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
  } catch {
    return NextResponse.json({ error: 'Invalid Google review link' }, { status: 400 });
  }

  // BUG-011: validate numeric limits before they reach the DB
  if (demo_max_scans !== null && demo_max_scans !== undefined && demo_max_scans !== '') {
    const n = Number(demo_max_scans);
    if (isNaN(n))  return NextResponse.json({ error: 'Max scans must be a valid number' }, { status: 400 });
    if (n <= 0)    return NextResponse.json({ error: 'Max scans must be greater than 0' }, { status: 400 });
  }
  if (demo_max_reviews !== null && demo_max_reviews !== undefined && demo_max_reviews !== '') {
    const n = Number(demo_max_reviews);
    if (isNaN(n))  return NextResponse.json({ error: 'Max reviews must be a valid number' }, { status: 400 });
    if (n <= 0)    return NextResponse.json({ error: 'Max reviews must be greater than 0' }, { status: 400 });
  }

  const db = createAdminClient();

  // 1. Create auth user
  const { data: newUser, error: userError } = await db.auth.admin.createUser({
    email:         trimmedEmail,
    password,
    email_confirm: true,
  });

  if (userError || !newUser?.user) {
    return NextResponse.json({ error: userError?.message ?? 'Failed to create user' }, { status: 400 });
  }

  const userId = newUser.user.id;

  // 2. Calculate expiry
  const expiresDays = Number(demo_expires_days ?? 0);
  const demoExpiresAt = expiresDays > 0
    ? new Date(Date.now() + expiresDays * 86_400_000).toISOString()
    : null;

  const bizName = trimmedBizName.slice(0, 100);

  // 3. Insert business
  const { data: business, error: bizError } = await db
    .from('businesses')
    .insert({
      owner_id:              userId,
      name:                  bizName,
      plan:                  'free',
      brand_color:           '#6E5BFF',
      logo_initials:         bizName.slice(0, 2).toUpperCase(),
      google_link:           trimmedReviewLink,
      business_type:         business_type ? String(business_type).trim() : null,
      language:              'en',
      min_rating_for_google: 4,
      is_demo:               true,
      demo_max_scans:        demo_max_scans ? Number(demo_max_scans) : null,
      demo_max_reviews:      demo_max_reviews ? Number(demo_max_reviews) : null,
      demo_expires_at:       demoExpiresAt,
      demo_created_by:       ctx.user.id,
    })
    .select('id')
    .single();

  if (bizError || !business) {
    await db.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: bizError?.message ?? 'Failed to create business' }, { status: 500 });
  }

  // 4. Insert free subscription so billing paths work
  const { error: subError } = await db.from('subscriptions').insert({
    business_id: business.id,
    plan:        'free',
    status:      'active',
  });
  if (subError) {
    await db.from('businesses').delete().eq('id', business.id);
    await db.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: 'Failed to create subscription for demo account' }, { status: 500 });
  }

  // 5. Audit log
  await writeAuditLog(ctx.user.id, 'demo_account_created', 'user', userId, {
    business_id:   business.id,
    business_name: bizName,
    admin:         ctx.user.email,
  });

  return NextResponse.json({ user_id: userId, business_id: business.id });
}
