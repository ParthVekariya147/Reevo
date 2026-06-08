import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis }     from "@upstash/redis";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseKey    = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabaseConfigured =
  supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://");

// Admin API rate limiter — 100 requests / minute per IP.
// Only instantiated when Upstash credentials are present.
const adminRateLimiter =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis:   new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }),
        limiter: Ratelimit.slidingWindow(100, "60 s"),
        analytics: false,
      })
    : null;

export async function middleware(request: NextRequest) {
  // Build a modified request-headers object that carries the pathname so
  // server components (e.g. the dashboard layout) can read it via headers().
  const requestHeaders = new Headers(request.headers);
  // Strip any client-supplied admin identity headers — only middleware may set these
  requestHeaders.delete('x-admin-id');
  requestHeaders.delete('x-admin-email');
  requestHeaders.delete('x-admin-role');
  requestHeaders.delete('x-admin-created-at');
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  const supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
  const { pathname } = request.nextUrl;

  if (!supabaseConfigured) {
    return supabaseResponse;
  }

  // ── Public routes — skip all auth checks ─────────────────────────────────
  // These paths are hit on every QR scan / funnel step; auth is never needed.
  if (
    pathname.startsWith('/r/') ||
    pathname.startsWith('/api/funnel/') ||
    pathname.startsWith('/api/analytics/') ||
    pathname.startsWith('/api/qr/')
  ) {
    return supabaseResponse;
  }

  // ── 0. Rate-limit /api/admin/* routes ───────────────────────────────────
  // Applied before any DB work so abusive IPs are rejected immediately.
  // Requires Upstash — no-op when UPSTASH_REDIS_REST_URL is not set.
  if (adminRateLimiter && pathname.startsWith("/api/admin")) {
    const ip =
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("cf-connecting-ip") ??
      "unknown";
    const { success, reset } = await adminRateLimiter.limit(`admin:${ip}`);
    if (!success) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((Number(reset) - Date.now()) / 1000)),
        },
      });
    }
  }

  let response = supabaseResponse;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const DASHBOARD = "/app/business_dashboard";
  // ── 1. Unauthenticated → redirect to login ──────────────────────────────
  // /reset-password requires an active Supabase recovery session
  if (!user && pathname === "/reset-password") {
    const url = request.nextUrl.clone();
    url.pathname = "/forgot-password";
    url.searchParams.set("error", "session_expired");
    return NextResponse.redirect(url);
  }
  if (!user && (pathname.startsWith(DASHBOARD) || pathname.startsWith("/app/onboarding"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", DASHBOARD);
    return NextResponse.redirect(url);
  }

  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  // Allow unauthenticated access to the admin login page only
  if (!user && isAdminRoute && pathname !== "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ── 2. Admin route — require admin_users table membership ───────────────
  // We check the database (service role) rather than trusting user_metadata,
  // which can be spoofed by a crafted JWT.
  if (user && isAdminRoute && pathname !== "/admin/login") {
    if (!serviceRoleKey) {
      // Service role not configured — block all admin access
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    const adminDb = createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: adminUser } = await adminDb
      .from("admin_users")
      .select("id, email, role, created_at")
      .eq("id", user.id)
      .maybeSingle();

    if (!adminUser) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("error", "access_denied");
      return NextResponse.redirect(url);
    }

    // Forward verified admin identity so route handlers and layouts can skip
    // a redundant admin_users lookup
    requestHeaders.set("x-admin-id", adminUser.id);
    requestHeaders.set("x-admin-email", adminUser.email ?? "");
    requestHeaders.set("x-admin-role", adminUser.role ?? "admin");
    requestHeaders.set("x-admin-created-at", adminUser.created_at ?? "");
    // Rebuild the forwarded response with updated request headers, preserving
    // any cookies that the Supabase SSR client may have set
    const adminResponse = NextResponse.next({ request: { headers: requestHeaders } });
    for (const c of response.cookies.getAll()) {
      adminResponse.cookies.set(c.name, c.value, { ...c });
    }
    response = adminResponse;
  }

  // Redirect logged-in admin away from /admin/login
  if (user && pathname === "/admin/login") {
    const { data: adminRow } = serviceRoleKey
      ? await createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
          .from("admin_users")
          .select("id")
          .eq("id", user.id)
          .maybeSingle()
      : { data: null };
    if (adminRow) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // ── 3. Logged-in user → redirect away from auth pages ───────────────────
  // Role resolves to a single destination: admin → admin panel, owner → dashboard/onboarding.
  if (user && (pathname === "/login" || pathname === "/signup")) {
    let destPath: string;
    if (serviceRoleKey) {
      const { data: adminRow } = await createSupabaseAdmin(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      destPath = adminRow ? '/admin/dashboard' : (pathname === '/signup' ? '/app/business_dashboard/onboarding' : DASHBOARD);
    } else {
      destPath = pathname === '/signup' ? '/app/business_dashboard/onboarding' : DASHBOARD;
    }
    const url = request.nextUrl.clone();
    url.pathname = destPath;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
