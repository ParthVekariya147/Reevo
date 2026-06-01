-- 036 — Atomic demo review-limit enforcement
-- Adds a BEFORE INSERT trigger on generated_reviews that raises an exception
-- when a demo business is at its review cap, closing the read-then-write race
-- window that exists in the application-layer checkDemoLimits check.
-- Safe to re-run: DROP TRIGGER IF EXISTS + CREATE OR REPLACE.

CREATE OR REPLACE FUNCTION enforce_demo_review_limit()
RETURNS TRIGGER AS $$
DECLARE
  biz_id        UUID;
  is_demo_biz   BOOLEAN;
  max_reviews   INTEGER;
  review_count  INTEGER;
BEGIN
  -- Resolve the business for the QR code being written
  SELECT b.id, b.is_demo, b.demo_max_reviews
    INTO biz_id, is_demo_biz, max_reviews
    FROM businesses b
    JOIN qr_codes   q ON q.business_id = b.id
   WHERE q.id = NEW.qr_id;

  -- Only enforce for demo businesses that have a review cap set
  IF is_demo_biz AND max_reviews IS NOT NULL THEN
    SELECT COUNT(*)
      INTO review_count
      FROM generated_reviews gr
      JOIN qr_codes           q  ON q.id = gr.qr_id
     WHERE q.business_id = biz_id;

    IF review_count >= max_reviews THEN
      RAISE EXCEPTION 'demo_review_limit_exceeded';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_demo_review_limit ON generated_reviews;
CREATE TRIGGER trg_demo_review_limit
  BEFORE INSERT ON generated_reviews
  FOR EACH ROW EXECUTE FUNCTION enforce_demo_review_limit();

-- ── ROLLBACK ──────────────────────────────────────────────────────────────
-- DROP TRIGGER   IF EXISTS trg_demo_review_limit      ON generated_reviews;
-- DROP FUNCTION  IF EXISTS enforce_demo_review_limit();
-- ──────────────────────────────────────────────────────────────────────────
