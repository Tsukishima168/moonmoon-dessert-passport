-- ============================================
-- 002 — RLS Security Fix
-- 2026-03-22
-- 修正：所有 USING(true) 改為 auth.uid() 限定
-- 實際執行：透過 Supabase MCP apply_migration
-- ============================================

-- ────────────────────────────────────────────
-- 1. 移除舊的全開 policies
-- ────────────────────────────────────────────

DROP POLICY IF EXISTS "passport_select_public" ON passports;
DROP POLICY IF EXISTS "passport_update_public" ON passports;
DROP POLICY IF EXISTS "invitation_select_public" ON invitations;
DROP POLICY IF EXISTS "invitation_insert_public" ON invitations;
DROP POLICY IF EXISTS "redemption_select_public" ON redemptions;
DROP POLICY IF EXISTS "redemption_insert_public" ON redemptions;
DROP POLICY IF EXISTS "allow_insert_transactions" ON point_transactions;
DROP POLICY IF EXISTS "allow_select_transactions" ON point_transactions;

-- ────────────────────────────────────────────
-- 2. passports — 只能存取自己的護照
-- ────────────────────────────────────────────

CREATE POLICY "passport_select_own" ON passports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "passport_update_own" ON passports
  FOR UPDATE USING (auth.uid() = user_id);

-- ────────────────────────────────────────────
-- 3. invitations — 透過 passport 歸屬判斷
-- ────────────────────────────────────────────

CREATE POLICY "invitation_select_own" ON invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM passports
      WHERE passports.id = invitations.from_passport_id
        AND passports.user_id = auth.uid()
    )
  );

CREATE POLICY "invitation_insert_own" ON invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM passports
      WHERE passports.id = invitations.from_passport_id
        AND passports.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────
-- 4. redemptions — 透過 passport 歸屬判斷
-- ────────────────────────────────────────────

CREATE POLICY "redemption_select_own" ON redemptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM passports
      WHERE passports.id = redemptions.passport_id
        AND passports.user_id = auth.uid()
    )
  );

CREATE POLICY "redemption_insert_own" ON redemptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM passports
      WHERE passports.id = redemptions.passport_id
        AND passports.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────
-- 5. point_transactions — 啟用 RLS + auth.uid() 限定
-- ────────────────────────────────────────────

ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "point_transactions_select_own" ON point_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "point_transactions_insert_own" ON point_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────
-- 6. 修正 check_pudding_eligible — slots_total 未宣告
-- ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_pudding_eligible(p_passport_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  slots_used INT;
  slots_total INT;
  already_claimed BOOLEAN;
BEGIN
  SELECT invite_slots_used, invite_slots_total, pudding_claimed
  INTO slots_used, slots_total, already_claimed
  FROM passports
  WHERE id = p_passport_id;

  RETURN (slots_used >= slots_total AND NOT already_claimed);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 7. RPC: adjust_points — 原子操作加減點數
--    解決 read-then-write race condition
--    寫入 point_transactions（非 point_logs）
-- ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION adjust_points(
  p_amount INT,
  p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  v_profile_id UUID;
  v_new_points INT;
BEGIN
  v_profile_id := auth.uid();
  IF v_profile_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Not authenticated');
  END IF;

  -- 原子更新 points 欄位
  UPDATE profiles
  SET points = COALESCE(points, 0) + p_amount
  WHERE id = v_profile_id
  RETURNING points INTO v_new_points;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Profile not found');
  END IF;

  -- 寫入 point_transactions
  INSERT INTO point_transactions (user_id, points, action, description, source)
  VALUES (v_profile_id, p_amount, p_reason, p_reason, 'passport');

  RETURN json_build_object('ok', true, 'balance', v_new_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
