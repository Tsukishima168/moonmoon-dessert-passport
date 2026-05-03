-- ============================================
-- 004 — Staff password: function 定義 → _app_config 表
-- 2026-05-03
-- 問題：redeem_pudding_staff 把密碼硬寫在 function body
--       Supabase Dashboard Functions 頁面可直接看到明文
-- 解法：建立 _app_config 受保護設定表，function 從表讀取
--       日後換密碼只需 UPDATE _app_config，不需改 function
-- ============================================

-- ── 1. 建立 _app_config 設定表 ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS _app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 封鎖所有直接存取：anon / authenticated 均無法讀寫
REVOKE ALL ON TABLE _app_config FROM PUBLIC;
REVOKE ALL ON TABLE _app_config FROM anon;
REVOKE ALL ON TABLE _app_config FROM authenticated;

-- RLS 啟用，無 policy = 所有 client 存取一律被擋
ALTER TABLE _app_config ENABLE ROW LEVEL SECURITY;

-- COMMENT 說明用途
COMMENT ON TABLE _app_config IS
  'App-level config store. Inaccessible from PostgREST. Read only by SECURITY DEFINER functions.';

-- ── 2. 寫入新密碼 ──────────────────────────────────────────────────────────

INSERT INTO _app_config (key, value)
VALUES ('staff_password', 'WcthaMQjd6f0uOzjVW58BwVlanb8')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ── 3. 更新 redeem_pudding_staff：從 _app_config 讀取密碼 ───────────────────

CREATE OR REPLACE FUNCTION redeem_pudding_staff(
  p_passport_number INT,
  p_staff_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_password TEXT;
  v_passport RECORD;
BEGIN
  -- 1. 從設定表讀取密碼（SECURITY DEFINER 可繞過 RLS）
  SELECT value INTO v_password
  FROM _app_config
  WHERE key = 'staff_password';

  IF v_password IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Server configuration error');
  END IF;

  -- 2. 驗證密碼
  IF p_staff_password != v_password THEN
    RETURN json_build_object('ok', false, 'error', 'Invalid password');
  END IF;

  -- 3. 查詢 passport
  SELECT id, passport_number, holder_name, status,
         invite_slots_total, invite_slots_used, pudding_claimed
  INTO v_passport
  FROM passports
  WHERE passport_number = p_passport_number;

  IF v_passport IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Passport not found');
  END IF;

  -- 4. 驗證資格
  IF v_passport.invite_slots_used < v_passport.invite_slots_total THEN
    RETURN json_build_object('ok', false, 'error', 'Invite slots not full');
  END IF;

  IF v_passport.pudding_claimed THEN
    RETURN json_build_object('ok', false, 'error', 'Already redeemed');
  END IF;

  -- 5. 執行兌換：寫入兌換紀錄 + 更新 pudding_claimed
  INSERT INTO redemptions (passport_id, reward_type, verified_by, source)
  VALUES (v_passport.id, 'pudding', 'staff', 'passport');

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

COMMENT ON FUNCTION redeem_pudding_staff(INT, TEXT)
  IS 'Staff pudding redemption. Password is read from _app_config table, not hardcoded here.';
