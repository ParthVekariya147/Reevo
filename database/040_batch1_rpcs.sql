-- Migration 040: Batch-1 performance RPCs
-- Replaces three Node.js aggregations with server-side GROUP BY functions.
-- Conventions match 025: LANGUAGE sql STABLE SECURITY DEFINER, SET search_path = public, no p_ prefix.

-- ── 1. admin_abuse_scan_summary ─────────────────────────────
-- Replaces GET /api/admin/abuse fetching all qr_scans then JS GROUP BY.
-- Returns one row per QR code that exceeded 100 scans in the window,
-- with copy_count joined in the same query. Caller does flag classification only.
--
-- Index plan:
--   scan_counts CTE  → idx_qr_scans_qr_time  (qr_id, scanned_at DESC)
--   copy_counts CTE  → analytics_events_type_idx (event_type, created_at)
--   JOIN qr_codes    → PK (id)
--   JOIN businesses  → PK (id)
CREATE OR REPLACE FUNCTION admin_abuse_scan_summary(since timestamptz)
RETURNS TABLE (
  qr_id         uuid,
  campaign_name text,
  business_id   uuid,
  business_name text,
  scan_count    bigint,
  copy_count    bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH scan_counts AS (
    SELECT qs.qr_id, COUNT(*) AS scan_count
    FROM   public.qr_scans qs
    WHERE  qs.scanned_at >= since
    GROUP  BY qs.qr_id
    HAVING COUNT(*) > 100
  ),
  copy_counts AS (
    SELECT ae.qr_id, COUNT(*) AS copy_count
    FROM   public.analytics_events ae
    WHERE  ae.event_type = 'copy'
      AND  ae.created_at >= since
      AND  ae.qr_id IN (SELECT qr_id FROM scan_counts)
    GROUP  BY ae.qr_id
  )
  SELECT
    sc.qr_id,
    qc.campaign_name,
    qc.business_id,
    b.name        AS business_name,
    sc.scan_count,
    COALESCE(cc.copy_count, 0) AS copy_count
  FROM       scan_counts  sc
  JOIN       public.qr_codes   qc ON qc.id = sc.qr_id
  JOIN       public.businesses b  ON b.id  = qc.business_id
  LEFT JOIN  copy_counts   cc ON cc.qr_id = sc.qr_id
  ORDER BY   sc.scan_count DESC;
$$;

-- ── 2. analytics_draft_acceptance ───────────────────────────
-- Replaces GET /api/analytics/summary fetching all copy-event meta rows
-- into Node then tallying draft_index via JS loop.
-- Returns a single row: first = draft_index 0 (or missing), second = draft_index 1.
--
-- Index plan: idx_ae_business_type_time (business_id, event_type, created_at DESC)
-- Note: param named biz_id (not business_id) to avoid shadowing the column name.
CREATE OR REPLACE FUNCTION analytics_draft_acceptance(biz_id uuid, since timestamptz)
RETURNS TABLE (first bigint, second bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (
      WHERE meta->>'draft_index' IS NULL
         OR meta->>'draft_index' = '0'
    )                                    AS first,
    COUNT(*) FILTER (
      WHERE meta->>'draft_index' = '1'
    )                                    AS second
  FROM   public.analytics_events
  WHERE  analytics_events.business_id = biz_id
    AND  event_type  = 'copy'
    AND  created_at >= since;
$$;

-- ── 3. admin_business_plan_counts ───────────────────────────
-- Replaces GET /api/admin/plans fetching all businesses.plan into Node
-- then doing a JS GROUP BY for the per-plan business_count / mrr_cents fields.
--
-- Index plan: businesses_plan_idx (plan)
-- Distinct from the existing admin_plan_distribution() which reads subscriptions.
CREATE OR REPLACE FUNCTION admin_business_plan_counts()
RETURNS TABLE (plan text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT plan, COUNT(*) AS count
  FROM   public.businesses
  GROUP  BY plan;
$$;
