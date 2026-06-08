-- Migration 042: funnel appearance columns
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS funnel_font          TEXT    NOT NULL DEFAULT 'DM Sans',
  ADD COLUMN IF NOT EXISTS funnel_accent_color  TEXT    NOT NULL DEFAULT '#1a1a1a',
  ADD COLUMN IF NOT EXISTS funnel_bg_image_url  TEXT             DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS funnel_bg_blur       INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS funnel_bg_dim        INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS funnel_card_bg       TEXT             DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS funnel_preset_name   TEXT             DEFAULT NULL;

ALTER TABLE businesses
  ALTER COLUMN funnel_style SET DEFAULT 'minimal';

ALTER TABLE businesses
  ADD CONSTRAINT chk_funnel_bg_blur CHECK (funnel_bg_blur BETWEEN 0 AND 20),
  ADD CONSTRAINT chk_funnel_bg_dim  CHECK (funnel_bg_dim  BETWEEN 0 AND 80);

ALTER TABLE businesses
  ADD CONSTRAINT chk_funnel_font CHECK (
    funnel_font IN ('DM Sans','Playfair Display','Syne','Fraunces','Cormorant Garamond')
  );

ALTER TABLE businesses
  ADD CONSTRAINT chk_funnel_style CHECK (
    funnel_style IN ('minimal','glass','dark','luxury','neon','clay','elegant','vivid','playful')
  );
