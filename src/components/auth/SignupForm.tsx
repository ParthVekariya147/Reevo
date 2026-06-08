"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import GoogleAuthButton from "./GoogleAuthButton";

interface FormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [errs, setErrs] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/app/business_dashboard/onboarding');
    });
  }, [router]);

  function patch(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrs((e) => ({ ...e, [key]: undefined }));
  }

  async function submit() {
    const e: Partial<Record<keyof FormState, string>> = {};
    setSubmitError(null);

    if (!form.fullName.trim()) e.fullName = "Required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Valid email please.";
    if (form.password.length < 8) e.password = "8+ characters.";
    if (form.confirmPassword !== form.password) e.confirmPassword = "Passwords don't match.";

    setErrs(e);
    if (Object.keys(e).length) return;

    if (!supabaseConfigured) {
      setSubmitError("Auth not configured. Add Supabase credentials to .env.local.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, role: "user" },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setSubmitError(error.message);
      setLoading(false);
      return;
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setSubmitError("already_exists");
      setLoading(false);
      return;
    }

    setLoading(false);

    if (data.session) {
      router.refresh();
      router.push('/app/business_dashboard/onboarding');
      return;
    }

    router.push(`/check-email?email=${encodeURIComponent(form.email)}`);
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 4px" }}>Create your account</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 24px", fontSize: 15 }}>14-day free trial. No credit card.</p>

      <GoogleAuthButton label="Sign up with Google" />

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontSize: 12, color: "var(--muted)" }}>or with email</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <input id="fullName" className={`input${errs.fullName ? " error" : ""}`} value={form.fullName} onChange={(e) => patch("fullName", e.target.value)} placeholder="Jane Doe" autoComplete="name" />
          {errs.fullName && <div className="err-msg">{errs.fullName}</div>}
        </div>
        <div>
          <label className="label" htmlFor="email">Work email</label>
          <input id="email" type="email" className={`input${errs.email ? " error" : ""}`} value={form.email} onChange={(e) => patch("email", e.target.value)} placeholder="jane@yourbiz.com" autoComplete="email" />
          {errs.email && <div className="err-msg">{errs.email}</div>}
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className={`input${errs.password ? " error" : ""}`} value={form.password} onChange={(e) => patch("password", e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
          {errs.password && <div className="err-msg">{errs.password}</div>}
          {!errs.password && <div className="helper">Must be 8+ characters with a number.</div>}
        </div>
        <div>
          <label className="label" htmlFor="confirmPassword">Confirm password</label>
          <input id="confirmPassword" type="password" className={`input${errs.confirmPassword ? " error" : ""}`} value={form.confirmPassword} onChange={(e) => patch("confirmPassword", e.target.value)} placeholder="Repeat your password" autoComplete="new-password" />
          {errs.confirmPassword && <div className="err-msg">{errs.confirmPassword}</div>}
        </div>
      </div>

      {submitError && (
        <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--bg-soft)", border: "1px solid var(--danger, #ef4444)", borderRadius: 10, fontSize: 13, color: "var(--danger, #ef4444)" }}>
          {submitError === "already_exists" ? (
            <>An account with this email already exists. <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600, textDecoration: "none" }}>Sign in instead</Link></>
          ) : submitError}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-lg"
        onClick={submit}
        disabled={loading}
        style={{ width: "100%", marginTop: 28, justifyContent: "center", opacity: loading ? 0.65 : 1, cursor: loading ? "not-allowed" : "pointer" }}
      >
        {loading ? (
          <>
            <span className="spinner" />
            Creating account…
          </>
        ) : (
          <>
            Create my account
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 5l7 7-7 7" /></svg>
          </>
        )}
      </button>

      <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "var(--muted)" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--accent)", fontWeight: 500, textDecoration: "none" }}>Sign in</Link>
      </p>
    </div>
  );
}
