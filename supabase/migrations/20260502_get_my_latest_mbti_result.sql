-- ============================================
-- Kiwimu Passport — latest MBTI result bridge
-- 2026-05-02
-- Purpose:
--   Let Passport read the currently authenticated user's latest MBTI result
--   without exposing the mbti schema through PostgREST.
-- ============================================

CREATE OR REPLACE FUNCTION public.get_my_latest_mbti_result()
RETURNS TABLE (
  mbti_type TEXT,
  result_type TEXT,
  suffix TEXT,
  finished_at TIMESTAMPTZ,
  share_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    COALESCE(
      NULLIF(tr.mbti_type, ''),
      concat_ws('-', NULLIF(tr.result_type, ''), NULLIF(tr.suffix, ''))
    )::TEXT AS mbti_type,
    tr.result_type::TEXT,
    tr.suffix::TEXT,
    tr.finished_at,
    tr.share_url::TEXT
  FROM mbti.test_runs AS tr
  WHERE tr.uid = auth.uid()::TEXT
  ORDER BY tr.finished_at DESC NULLS LAST
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_latest_mbti_result() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_latest_mbti_result() TO authenticated;

COMMENT ON FUNCTION public.get_my_latest_mbti_result()
IS 'Returns the current authenticated user latest MBTI result from mbti.test_runs for Passport profile hydration.';
