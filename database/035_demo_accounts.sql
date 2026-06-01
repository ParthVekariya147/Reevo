-- 035 — Demo accounts support
-- Adds demo lifecycle fields to businesses and an impersonation audit table.
-- Safe to re-run: all statements use IF NOT EXISTS.

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_demo            BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS demo_max_scans     INTEGER     NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS demo_max_reviews   INTEGER     NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS demo_expires_at    TIMESTAMPTZ NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS demo_created_by    UUID        NULL REFERENCES public.admin_users(id) ON DELETE SET NULL;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS demo_converted_at  TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS businesses_is_demo_idx ON public.businesses(is_demo) WHERE is_demo = true;

CREATE TABLE IF NOT EXISTS public.admin_impersonation_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID        NOT NULL REFERENCES public.admin_users(id),
  admin_email     TEXT        NOT NULL,
  target_user_id  UUID        NOT NULL,
  target_email    TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS impersonation_logs_admin_idx  ON public.admin_impersonation_logs(admin_id);
CREATE INDEX IF NOT EXISTS impersonation_logs_target_idx ON public.admin_impersonation_logs(target_user_id);
CREATE INDEX IF NOT EXISTS impersonation_logs_created_idx ON public.admin_impersonation_logs(created_at DESC);

-- ── ROLLBACK ──────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS public.admin_impersonation_logs;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS demo_converted_at;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS demo_created_by;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS demo_expires_at;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS demo_max_reviews;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS demo_max_scans;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS is_demo;
-- ──────────────────────────────────────────────────────────────────────────
