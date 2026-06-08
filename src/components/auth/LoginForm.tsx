"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import GoogleAuthButton from "./GoogleAuthButton";

// ── shared helpers ────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "rgba(213,75,63,0.08)", border: "1px solid rgba(213,75,63,0.2)", borderRadius: 8, color: "#B42A1B", fontSize: 13 }}>
      {msg}
    </div>
  );
}

function SuccessBox({ msg }: { msg: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "rgba(52,168,83,0.08)", border: "1px solid rgba(52,168,83,0.2)", borderRadius: 8, color: "#1E7E34", fontSize: 13 }}>
      {msg}
    </div>
  );
}

const Spinner = () => (
  <span style={{ width: 14, height: 14, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
);

// ── main component ────────────────────────────────────────────────────────────

type Mode    = "password" | "otp";
type OtpStep = "email" | "code";

export default function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const DASHBOARD    = "/app/business_dashboard";
  const rawNext      = searchParams.get("next") ?? "";
  const nextPath     = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : DASHBOARD;

  // ── shared ──────────────────────────────────────────────────────────────────
  const [mode,  setMode]  = useState<Mode>("password");
  const [email, setEmail] = useState("");

  // ── password mode ────────────────────────────────────────────────────────────
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw,   setShowPw]   = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError,   setPwError]   = useState<string | null>(null);

  // ── OTP mode ─────────────────────────────────────────────────────────────────
  const [otpStep,     setOtpStep]     = useState<OtpStep>("email");
  const [otpCode,     setOtpCode]     = useState("");
  const [otpLoading,  setOtpLoading]  = useState(false);
  const [otpError,    setOtpError]    = useState<string | null>(null);
  const [otpSuccess,  setOtpSuccess]  = useState<string | null>(null);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Resend cooldown tick
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setTimeout(() => setOtpCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCooldown]);

  // Reset OTP state when switching modes
  function switchMode(next: Mode) {
    setMode(next);
    setOtpStep("email");
    setOtpCode("");
    setOtpError(null);
    setOtpSuccess(null);
    setPwError(null);
  }

  // ── password submit ──────────────────────────────────────────────────────────
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    if (!EMAIL_RE.test(email))  { setPwError("Please enter a valid email."); return; }
    if (!password)              { setPwError("Enter your password."); return; }
    if (!supabaseConfigured)    { setPwError("Auth is not configured. Add your Supabase credentials to .env.local."); return; }
    setPwLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) { setPwError(error.message); setPwLoading(false); return; }
    router.push(nextPath);
    router.refresh();
  }

  // ── OTP send ─────────────────────────────────────────────────────────────────
  async function handleOtpSend(e: React.FormEvent) {
    e.preventDefault();
    setOtpError(null);
    if (!EMAIL_RE.test(email)) { setOtpError("Please enter a valid email."); return; }
    if (!supabaseConfigured)   { setOtpError("Auth is not configured. Add your Supabase credentials to .env.local."); return; }
    setOtpLoading(true);
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.status === 429) {
      const data = await res.json();
      setOtpError(data.error ?? "Too many requests. Please wait before trying again.");
      setOtpLoading(false);
      return;
    }
    setOtpStep("code");
    setOtpCooldown(30);
    setOtpLoading(false);
  }

  // ── OTP resend ────────────────────────────────────────────────────────────────
  async function handleResend() {
    if (otpCooldown > 0) return;
    setOtpError(null);
    setOtpSuccess(null);
    setOtpLoading(true);
    const res = await fetch("/api/auth/otp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.status === 429) {
      const data = await res.json();
      setOtpError(data.error ?? "Too many requests. Please wait.");
    } else {
      setOtpSuccess("New code sent — check your inbox.");
      setOtpCooldown(30);
    }
    setOtpLoading(false);
  }

  // ── OTP verify ────────────────────────────────────────────────────────────────
  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setOtpError(null);
    const token = otpCode.trim();
    if (token.length !== 6 || !/^\d{6}$/.test(token)) {
      setOtpError("Enter the 6-digit code from your email.");
      return;
    }
    setOtpLoading(true);
    const { error } = await createClient().auth.verifyOtp({ email, token, type: "email" });
    if (error) { setOtpError(error.message); setOtpLoading(false); return; }
    router.push(nextPath);
    router.refresh();
  }

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <GoogleAuthButton label="Continue with Google" />

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontSize: 12, color: "var(--muted)" }}>or with email</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 4, background: "var(--bg-soft)", borderRadius: 10, padding: 4, marginBottom: 20 }}>
        {(["password", "otp"] as Mode[]).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            style={{
              flex: 1, padding: "7px 0", fontSize: 13, fontWeight: 500,
              borderRadius: 7, border: 0, cursor: "pointer", transition: "all 0.15s",
              background: mode === m ? "var(--surface)" : "transparent",
              color:      mode === m ? "var(--ink)"     : "var(--muted)",
              boxShadow:  mode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            {m === "password" ? "Password" : "Email code"}
          </button>
        ))}
      </div>

      {/* ── PASSWORD FORM ───────────────────────────────────────────────── */}
      {mode === "password" && (
        <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {pwError && <ErrorBox msg={pwError} />}

          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@yourbiz.com" autoComplete="email" className="input" />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label className="label" htmlFor="password" style={{ margin: 0 }}>Password</label>
              <a href="/forgot-password" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none" }}>Forgot?</a>
            </div>
            <div style={{ position: "relative" }}>
              <input id="password" type={showPw ? "text" : "password"} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                autoComplete="current-password" className="input" style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPw(s => !s)}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: 0, padding: 6, color: "var(--muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
                aria-label={showPw ? "Hide password" : "Show password"}>
                {showPw ? (
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-2)", cursor: "pointer", userSelect: "none" }}>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
              style={{ accentColor: "var(--accent)", width: 14, height: 14 }} />
            Remember me for 30 days
          </label>

          <button type="submit" disabled={pwLoading} className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center", marginTop: 6, opacity: pwLoading ? 0.65 : 1, cursor: pwLoading ? "not-allowed" : "pointer" }}>
            {pwLoading ? <><Spinner /> Signing in…</> : <>Sign in <ArrowIcon /></>}
          </button>
        </form>
      )}

      {/* ── OTP FORM — step: email ──────────────────────────────────────── */}
      {mode === "otp" && otpStep === "email" && (
        <form onSubmit={handleOtpSend} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {otpError && <ErrorBox msg={otpError} />}

          <div>
            <label className="label" htmlFor="otp-email">Email</label>
            <input id="otp-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@yourbiz.com" autoComplete="email" className="input" />
          </div>

          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.55 }}>
            We&apos;ll send a 6-digit code to this address. No password needed.
          </p>

          <button type="submit" disabled={otpLoading} className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center", opacity: otpLoading ? 0.65 : 1, cursor: otpLoading ? "not-allowed" : "pointer" }}>
            {otpLoading ? <><Spinner /> Sending…</> : <>Send code <ArrowIcon /></>}
          </button>
        </form>
      )}

      {/* ── OTP FORM — step: code ───────────────────────────────────────── */}
      {mode === "otp" && otpStep === "code" && (
        <form onSubmit={handleOtpVerify} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {otpError   && <ErrorBox   msg={otpError} />}
          {otpSuccess && <SuccessBox msg={otpSuccess} />}

          {/* Sent-to banner */}
          <div style={{ padding: "10px 14px", background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 13, color: "var(--muted)" }}>
            Code sent to <strong style={{ color: "var(--ink)" }}>{email}</strong>
            {" · "}
            <button type="button" onClick={() => { setOtpStep("email"); setOtpCode(""); setOtpError(null); setOtpSuccess(null); }}
              style={{ background: "none", border: 0, padding: 0, color: "var(--accent)", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
              Change
            </button>
          </div>

          <div>
            <label className="label" htmlFor="otp-code">6-digit code</label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              autoComplete="one-time-code"
              className="input"
              style={{ letterSpacing: "0.3em", fontSize: 20, textAlign: "center" }}
              autoFocus
            />
          </div>

          <button type="submit" disabled={otpLoading || otpCode.length !== 6} className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center", opacity: (otpLoading || otpCode.length !== 6) ? 0.65 : 1, cursor: (otpLoading || otpCode.length !== 6) ? "not-allowed" : "pointer" }}>
            {otpLoading ? <><Spinner /> Verifying…</> : <>Verify code <ArrowIcon /></>}
          </button>

          {/* Resend */}
          <button type="button" onClick={handleResend} disabled={otpCooldown > 0 || otpLoading}
            style={{ background: "none", border: 0, padding: 0, fontSize: 13, cursor: otpCooldown > 0 ? "default" : "pointer", color: otpCooldown > 0 ? "var(--muted)" : "var(--accent)", textAlign: "center", fontWeight: 500 }}>
            {otpCooldown > 0 ? `Resend code in ${otpCooldown}s` : "Resend code"}
          </button>
        </form>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="M13 5l7 7-7 7"/>
    </svg>
  );
}
