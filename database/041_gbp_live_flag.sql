-- Migration 041: GBP_LIVE feature flag
-- Seeds the admin_settings row that gates live Google API calls.
-- Default 'false' → mock mode. Flip to 'true' once Google API access is approved.
-- Safe to re-run: ON CONFLICT DO NOTHING.
INSERT INTO public.admin_settings (key, value) VALUES
  ('feature_flag_gbp_live', 'false')
ON CONFLICT (key) DO NOTHING;
