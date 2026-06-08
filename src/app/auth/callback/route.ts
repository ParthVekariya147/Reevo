import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentBusiness } from '@/lib/businesses/current';
import { createAdminClient } from '@/lib/supabase/admin';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const DASHBOARD = "/app/business_dashboard";
  const rawNext = searchParams.get("next") ?? "";
  // Reject external or protocol-relative redirects — same-origin only
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : DASHBOARD;

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && session?.user) {
      const user = session.user;

      // Use admin client to reliably read identities — session.user may have
      // incomplete app_metadata / identities with the publishable key.
      const adminClient = createAdminClient();
      const { data: { user: fullUser } } = await adminClient.auth.admin.getUserById(user.id);

      // Fall back to session user data if admin fetch returns null
      const resolvedUser = fullUser ?? user;
      const identities = resolvedUser.identities ?? [];
      const isGoogleUser =
        identities.some((i: { provider: string }) => i.provider === "google") ||
        resolvedUser.app_metadata?.provider === "google";
      const hasPassword = resolvedUser.user_metadata?.has_password === true;

      if (isGoogleUser && !hasPassword) {
        return NextResponse.redirect(new URL("/set-password", origin));
      }

      // Admin accounts → admin panel, no business flow
      const { data: adminRow } = await adminClient
        .from('admin_users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      if (adminRow) {
        return NextResponse.redirect(new URL('/admin/dashboard', origin));
      }

      // New user with no business → send to onboarding
      const { business: biz } = await getCurrentBusiness(supabase, user.id);
      const dest = biz?.onboarding_complete ? next : "/app/business_dashboard/onboarding";
      return NextResponse.redirect(new URL(dest, origin));
    }

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }

    // Link expired or invalid — show friendly error page
    return NextResponse.redirect(new URL("/link-expired", origin));
  }

  // No code — something went wrong
  return NextResponse.redirect(new URL("/login?error=missing_code", origin));
}
