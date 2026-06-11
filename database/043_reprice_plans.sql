-- ============================================================
-- 043 — Reprice plans: new 4-tier structure
--
-- New plans: free / starter / growth / enterprise
-- Removes: pro (DB row deleted; type kept in app code for
--           existing business records that reference plan='pro')
--
-- New columns:
--   location_limit      — max locations (-1 = unlimited)
--   auto_reply          — whether plan includes auto-reply feature
--   amount_cents_yearly — yearly price in cents (NULL = no yearly option)
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS; DELETE+INSERT is
-- idempotent on primary key 'plan'.
-- ============================================================

-- 1. Add new columns if not already present
ALTER TABLE public.plan_prices
  ADD COLUMN IF NOT EXISTS location_limit     INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS auto_reply         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount_cents_yearly INTEGER;

-- 2. Remove old plan rows (pro was the old "popular" plan)
DELETE FROM public.plan_prices
  WHERE plan IN ('free', 'starter', 'pro', 'growth', 'enterprise');

-- 3. Insert new pricing structure
INSERT INTO public.plan_prices
  (plan, label, amount_cents, amount_cents_yearly, currency, trial_days,
   review_limit, scan_limit, campaign_limit, location_limit, auto_reply, is_popular)
VALUES
  ('free',       'Free',       0,     NULL,  'usd', 14,   20,  20,  1,  1,  false, false),
  ('starter',    'Starter',    1000,  10000, 'usd', NULL, 200, 200, 3,  1,  false, false),
  ('growth',     'Growth',     2000,  19900, 'usd', NULL, 500, 500, 5,  5,  true,  true),
  ('enterprise', 'Enterprise', 5000,  50000, 'usd', NULL, -1,  -1, -1, -1, true,  false);

-- ── ROLLBACK ─────────────────────────────────────────────────
-- DELETE FROM public.plan_prices WHERE plan IN ('free','starter','growth','enterprise');
-- INSERT INTO public.plan_prices (plan, label, amount_cents, currency, trial_days,
--   review_limit, scan_limit, campaign_limit, is_popular)
-- VALUES
--   ('free',       'Free',       0,     'usd', 14,  20,  20,  1,  false),
--   ('starter',    'Starter',    1000,  'usd', NULL,200, 200, 3,  false),
--   ('pro',        'Pro',        999,   'usd', 1,   200, 200, 2,  true),
--   ('enterprise', 'Enterprise', 19900, 'usd', NULL,-1,  -1, -1,  false);
-- ALTER TABLE public.plan_prices
--   DROP COLUMN IF EXISTS location_limit,
--   DROP COLUMN IF EXISTS auto_reply,
--   DROP COLUMN IF EXISTS amount_cents_yearly;
-- ─────────────────────────────────────────────────────────────
