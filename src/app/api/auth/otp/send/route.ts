import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientIp } from '@/lib/security/rateLimit';
import { env } from '@/lib/env';

// Generic response — identical whether the email exists or not.
// This prevents user-enumeration: an attacker cannot tell from the response
// whether a given email is registered on Reevo.
const GENERIC_OK = {
  message: "If an account exists for this email, a code was sent.",
};

export async function POST(req: NextRequest) {
  // ── Parse body ───────────────────────────────────────────────
  let email: string;
  try {
    const body = await req.json();
    email = (typeof body.email === 'string' ? body.email : '').trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  // ── Rate limits ──────────────────────────────────────────────
  const ip = getClientIp(req);

  const [rlEmail, rlIp] = await Promise.all([
    rateLimit(`otp-send:email:${email}`, 5, 15 * 60_000),  // 5 per 15 min per email
    rateLimit(`otp-send:ip:${ip}`,       10, 15 * 60_000), // 10 per 15 min per IP
  ]);

  if (!rlEmail.allowed || !rlIp.allowed) {
    return NextResponse.json(
      { error: 'Too many code requests. Please wait a few minutes before trying again.' },
      { status: 429 },
    );
  }

  // ── Send OTP ─────────────────────────────────────────────────
  // Use a sessionless client — no cookies needed for sending an OTP.
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false, // OTP is login-only — never creates a new account
    },
  });

  if (error) {
    // Log server-side for observability but never surface to client.
    // Supabase returns "user not found" when shouldCreateUser: false and
    // the email is unregistered — revealing that would enumerate accounts.
    console.error('[otp/send] Supabase signInWithOtp error:', error.message);
  }

  // Always return the same generic response regardless of outcome.
  return NextResponse.json(GENERIC_OK);
}
