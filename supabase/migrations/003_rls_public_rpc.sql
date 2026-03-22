-- ============================================
-- 003 — SECURITY DEFINER RPC（取代直接 table 操作）
-- 2026-03-23
-- 問題：002 的 auth.uid() RLS 過度收緊，導致
--       邀請/展示/兌換三個公開流程全部被擋
-- 解法：移除直接 table 操作 policies，改用
--       SECURITY DEFINER RPC 繞過 RLS
-- ============================================

-- ────────────────────────────────────────────
-- 1. 移除 002 建的過度收緊 policies
--    （passports / invitations / redemptions）
--    保留 point_transactions 的 auth.uid() policies
-- ────────────────────────────────────────────

DROP POLICY IF EXISTS "passport_select_own" ON passports;
DROP POLICY IF EXISTS "passport_update_own" ON passports;
DROP POLICY IF EXISTS "invitation_select_own" ON invitations;
DROP POLICY IF EXISTS "invitation_insert_own" ON invitations;
DROP POLICY IF EXISTS "redemption_select_own" ON redemptions;
DROP POLICY IF EXISTS "redemption_insert_own" ON redemptions;

-- RLS 保持啟用、無 policy = 所有直接 table 操作被擋
-- SECURITY DEFINER functions 繞過 RLS

-- ────────────────────────────────────────────
-- 2. RPC: get_passport_public
--    用途：/join/:passportId 和 /passport/:id 匿名讀取
--    只回傳公開欄位，不回傳 holder_contact / user_id
-- ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_passport_public(p_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', id,
    'passport_number', passport_number,
    'holder_name', holder_name,
    'status', status,
    'invite_slots_total', invite_slots_total,
    'invite_slots_used', invite_slots_used,
    'pudding_claimed', pudding_claimed
  ) INTO v_result
  FROM passports
  WHERE id = p_id;

  IF v_result IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Passport not found');
  END IF;

  RETURN json_build_object('ok', true, 'data', v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 3. RPC: create_invitation_public
--    用途：/join 頁面匿名送出邀請
--    內部驗證：passport 存在 + active + 有空位
--    寫入 invitations（auto-approved）
--    invite_slots_used 由既有 trigger 自動更新
-- ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION create_invitation_public(
  p_passport_id UUID,
  p_contact TEXT,
  p_contact_type TEXT
)
RETURNS JSON AS $$
DECLARE
  v_passport RECORD;
  v_invitation_id UUID;
BEGIN
  -- 驗證 passport 存在且可用
  SELECT id, status, invite_slots_total, invite_slots_used
  INTO v_passport
  FROM passports
  WHERE id = p_passport_id;

  IF v_passport IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Passport not found');
  END IF;

  IF v_passport.status != 'active' THEN
    RETURN json_build_object('ok', false, 'error', 'Passport is suspended');
  END IF;

  IF v_passport.invite_slots_used >= v_passport.invite_slots_total THEN
    RETURN json_build_object('ok', false, 'error', 'No invite slots available');
  END IF;

  -- 寫入邀請（auto-approved）
  INSERT INTO invitations (
    from_passport_id,
    invitee_contact,
    invitee_contact_type,
    status,
    auto_approved_reason,
    approved_at
  ) VALUES (
    p_passport_id,
    p_contact,
    p_contact_type::contact_type,
    'approved',
    'trusted_referral',
    now()
  )
  RETURNING id INTO v_invitation_id;

  -- invite_slots_used 由 trg_update_invite_slots trigger 自動 +1

  RETURN json_build_object('ok', true, 'invitation_id', v_invitation_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ────────────────────────────────────────────
-- 4. RPC: redeem_pudding_staff
--    用途：/redeem 店員兌換（密碼驗證在 DB 層）
--    密碼暫時硬編碼在 function 內，之後移到 Vault
--    驗證：密碼正確 + passport 存在 + 邀請滿額
--         + pudding 未兌換
--    寫入 redemptions + 更新 pudding_claimed
-- ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION redeem_pudding_staff(
  p_passport_number INT,
  p_staff_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_password TEXT := 'MOONMOON2025';  -- TODO: 移到 Supabase Vault
  v_passport RECORD;
BEGIN
  -- 1. 驗證密碼
  IF p_staff_password != v_password THEN
    RETURN json_build_object('ok', false, 'error', 'Invalid password');
  END IF;

  -- 2. 查詢 passport
  SELECT id, passport_number, holder_name, status,
         invite_slots_total, invite_slots_used, pudding_claimed
  INTO v_passport
  FROM passports
  WHERE passport_number = p_passport_number;

  IF v_passport IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Passport not found');
  END IF;

  -- 3. 驗證資格
  IF v_passport.invite_slots_used < v_passport.invite_slots_total THEN
    RETURN json_build_object('ok', false, 'error', 'Invite slots not full');
  END IF;

  IF v_passport.pudding_claimed THEN
    RETURN json_build_object('ok', false, 'error', 'Already redeemed');
  END IF;

  -- 4. 寫入兌換紀錄
  INSERT INTO redemptions (passport_id, reward_type, verified_by, source)
  VALUES (v_passport.id, 'pudding', 'staff', 'passport');

  -- 5. 更新 pudding_claimed
  UPDATE passports
  SET pudding_claimed = true
  WHERE id = v_passport.id;

  RETURN json_build_object(
    'ok', true,
    'passport_number', v_passport.passport_number,
    'holder_name', v_passport.holder_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
