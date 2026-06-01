-- 037 — Enable RLS on admin_impersonation_logs
-- Without this, the authenticated role could SELECT all impersonation records
-- directly via the Supabase client. Enabling RLS with no policies = deny-all
-- for every non-service role. Admin API routes use createAdminClient()
-- (service role) which bypasses RLS, so server-side reads/writes are unaffected.
-- Safe to re-run: enabling RLS on an already-RLS-enabled table is a no-op.

ALTER TABLE public.admin_impersonation_logs ENABLE ROW LEVEL SECURITY;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────
-- ALTER TABLE public.admin_impersonation_logs DISABLE ROW LEVEL SECURITY;
-- ──────────────────────────────────────────────────────────────────────────
