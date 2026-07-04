-- Migration: Staff 核銷密碼防暴力（方案 A：attempts 表 + 全域遞增延遲 / 短時鎖定）
--
-- 狀態：已於 2026-07-04 直接套用至 production（project ref xlqwfaailjyvsycjnzkz），
-- 本檔為事後補登的 migration 記錄，供未來環境（staging / 新分支）重建 schema 用。
--
-- 背景：`fulfill_reward_redemption_staff` 與 `redeem_pudding_staff` 共用同一組
-- 明文共用密碼（public._app_config.key = 'staff_password'），且無任何失敗計數或
-- rate limit，可被無限次線上暴力猜測。草案見：
-- Obsidian-Vaults/Penso-SSOT/01_指揮中心/_Session_Reports/2026-07-04_安全與內容稽核/staff_password_ratelimit_草案.md
--
-- 本次改動（方案 A，短期止血，不改前端介面）：
--   1. 新增 public.staff_auth_attempts 表，記錄每次核銷密碼嘗試（成功/失敗）。
--   2. 新增 public._staff_auth_recent_failures(bucket_key, window_minutes) 輔助函式，
--      計算近 N 分鐘內失敗次數。
--   3. 兩支 RPC 在密碼比對前先檢查全域 bucket 近 15 分鐘失敗次數：
--        - >= 20 次：直接回傳 {"ok": false, "error": "too_many_attempts_locked"}（短時鎖定）
--        - >= 5 次：pg_sleep 遞增延遲（每多 1 次 +0.5 秒，上限 5 秒）
--      密碼比對失敗時寫入一筆 success=false 的紀錄；成功則寫入 success=true。
--
-- 最高原則：兩支 RPC 的簽名與回傳值 shape 完全不變（向後相容），前端呼叫不需修改。
--   - fulfill_reward_redemption_staff(p_redemption_code text, p_staff_password text) RETURNS jsonb
--   - redeem_pudding_staff(p_passport_number integer, p_staff_password text) RETURNS json
--   （注意：redeem_pudding_staff 回傳型別維持 json，不是 jsonb，套用時刻意保留原型別）
--
-- 已知取捨（沿用草案記載）：
--   - 全域 bucket（不分 IP／不分店員）：一位同事密碼打錯會拖慢下一位同事的操作，
--     RPC 層目前拿不到呼叫端 IP，之後有需要可改用 request.headers 做分桶。
--   - staff_auth_attempts 需要定期清理（例如排程砍 7 天前的紀錄），本次未加自動清理。
--   - 方案 B（改用 Supabase Auth 角色、廢除共用明文密碼）為長期正確解法，另立任務。
--
-- 套用後驗證（2026-07-04，於 production 執行）：
--   - pg_get_functiondef 確認兩支 RPC 仍存在且定義有效。
--   - 錯誤密碼呼叫：回傳與原本相同 shape 的 invalid_password / Invalid password，無 crash。
--   - staff_auth_attempts 有正確記錄失敗嘗試。
--   - 近 15 分鐘失敗次數達 5 次後，呼叫出現預期延遲（實測約 +0.5~1 秒）。
--   - 近 15 分鐘失敗次數達 20 次以上，兩支 RPC 皆回傳 too_many_attempts_locked，且不再觸發
--     pg_sleep（lockout 分支先短路）。
--   - happy path（正確密碼）**未**用真實資料實測，僅透過定義比對確認：兩支 RPC 原本的
--     成功回傳 jsonb_build_object/json_build_object 區塊逐字保留未改動，唯一新增的是
--     rate-limit 檢查與成功時的 attempts 記錄 INSERT，未變動任何既有分支或欄位。
--   - 驗證用的測試資料已於驗證後從 staff_auth_attempts 清除，避免真實店員被誤鎖。
--
-- ============================================================================
-- ROLLBACK（如需回滾，依序執行下列兩個 CREATE OR REPLACE 還原至套用前的原始定義，
-- 對應內容取自套用前用 pg_get_functiondef 抓取的原始定義；attempts 表與輔助函式可留著
-- 不用管，不影響其他功能，也可選擇性 DROP）：
--
-- CREATE OR REPLACE FUNCTION public.fulfill_reward_redemption_staff(p_redemption_code text, p_staff_password text)
--  RETURNS jsonb
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'pg_catalog', 'public'
-- AS $function$
-- DECLARE
--   v_password TEXT;
--   v_code TEXT := upper(btrim(coalesce(p_redemption_code, '')));
--   v_redemption RECORD;
-- BEGIN
--   SELECT value INTO v_password
--   FROM public._app_config
--   WHERE key = 'staff_password';
--
--   IF v_password IS NULL THEN
--     RETURN jsonb_build_object('ok', false, 'error', 'server_configuration_error');
--   END IF;
--
--   IF p_staff_password IS NULL OR p_staff_password <> v_password THEN
--     RETURN jsonb_build_object('ok', false, 'error', 'invalid_password');
--   END IF;
--
--   IF char_length(v_code) < 10 THEN
--     RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
--   END IF;
--
--   UPDATE public.reward_redemptions
--   SET status = 'fulfilled',
--       fulfilled_at = now(),
--       fulfilled_by = 'staff'
--   WHERE redemption_code = v_code
--     AND status = 'issued'
--     AND expires_at > now()
--   RETURNING
--     id, user_id, reward_id, reward_name, reward_category, points_cost,
--     redemption_code, status, issued_at, expires_at, fulfilled_at
--   INTO v_redemption;
--
--   IF NOT FOUND THEN
--     RETURN jsonb_build_object('ok', false, 'error', 'invalid_used_or_expired');
--   END IF;
--
--   RETURN jsonb_build_object(
--     'ok', true,
--     'redemption', jsonb_build_object(
--       'id', v_redemption.id,
--       'reward_id', v_redemption.reward_id,
--       'reward_name', v_redemption.reward_name,
--       'reward_category', v_redemption.reward_category,
--       'points_cost', v_redemption.points_cost,
--       'redemption_code', v_redemption.redemption_code,
--       'status', v_redemption.status,
--       'issued_at', v_redemption.issued_at,
--       'expires_at', v_redemption.expires_at,
--       'fulfilled_at', v_redemption.fulfilled_at
--     )
--   );
-- END;
-- $function$;
--
-- CREATE OR REPLACE FUNCTION public.redeem_pudding_staff(p_passport_number integer, p_staff_password text)
--  RETURNS json
--  LANGUAGE plpgsql
--  SECURITY DEFINER
--  SET search_path TO 'public'
-- AS $function$
-- DECLARE
--   v_password TEXT;
--   v_passport RECORD;
-- BEGIN
--   SELECT value INTO v_password
--   FROM _app_config
--   WHERE key = 'staff_password';
--
--   IF v_password IS NULL THEN
--     RETURN json_build_object('ok', false, 'error', 'Server configuration error');
--   END IF;
--
--   IF p_staff_password != v_password THEN
--     RETURN json_build_object('ok', false, 'error', 'Invalid password');
--   END IF;
--
--   SELECT id, passport_number, holder_name, status,
--          invite_slots_total, invite_slots_used, pudding_claimed
--   INTO v_passport
--   FROM passports
--   WHERE passport_number = p_passport_number;
--
--   IF v_passport IS NULL THEN
--     RETURN json_build_object('ok', false, 'error', 'Passport not found');
--   END IF;
--
--   IF v_passport.invite_slots_used < v_passport.invite_slots_total THEN
--     RETURN json_build_object('ok', false, 'error', 'Invite slots not full');
--   END IF;
--
--   IF v_passport.pudding_claimed THEN
--     RETURN json_build_object('ok', false, 'error', 'Already redeemed');
--   END IF;
--
--   INSERT INTO redemptions (passport_id, reward_type, verified_by, source)
--   VALUES (v_passport.id, 'pudding', 'staff', 'passport');
--
--   UPDATE passports
--   SET pudding_claimed = true
--   WHERE id = v_passport.id;
--
--   RETURN json_build_object(
--     'ok', true,
--     'passport_number', v_passport.passport_number,
--     'holder_name', v_passport.holder_name
--   );
-- END;
-- $function$;
-- ============================================================================

BEGIN;

-- 1) 失敗嘗試記錄表（冪等）
CREATE TABLE IF NOT EXISTS public.staff_auth_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bucket_key TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_staff_auth_attempts_bucket_time
  ON public.staff_auth_attempts (bucket_key, attempted_at DESC);

-- 2) 輔助函式：計算最近 N 分鐘內的失敗次數
CREATE OR REPLACE FUNCTION public._staff_auth_recent_failures(p_bucket_key TEXT, p_window_minutes INT DEFAULT 15)
RETURNS INT
LANGUAGE sql
STABLE
AS $$
  SELECT count(*)::INT
  FROM public.staff_auth_attempts
  WHERE bucket_key = p_bucket_key
    AND success = false
    AND attempted_at > now() - (p_window_minutes || ' minutes')::interval;
$$;

-- 3) fulfill_reward_redemption_staff — 強化版（簽名/回傳 shape 不變）
CREATE OR REPLACE FUNCTION public.fulfill_reward_redemption_staff(p_redemption_code text, p_staff_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_password TEXT;
  v_code TEXT := upper(btrim(coalesce(p_redemption_code, '')));
  v_redemption RECORD;
  v_bucket TEXT := 'global';
  v_fail_count INT;
  v_delay_seconds NUMERIC;
BEGIN
  v_fail_count := public._staff_auth_recent_failures(v_bucket, 15);

  IF v_fail_count >= 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'too_many_attempts_locked');
  ELSIF v_fail_count >= 5 THEN
    v_delay_seconds := LEAST(5, (v_fail_count - 4) * 0.5);
    PERFORM pg_sleep(v_delay_seconds);
  END IF;

  SELECT value INTO v_password
  FROM public._app_config
  WHERE key = 'staff_password';

  IF v_password IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'server_configuration_error');
  END IF;

  IF p_staff_password IS NULL OR p_staff_password <> v_password THEN
    INSERT INTO public.staff_auth_attempts (bucket_key, success) VALUES (v_bucket, false);
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_password');
  END IF;

  INSERT INTO public.staff_auth_attempts (bucket_key, success) VALUES (v_bucket, true);

  IF char_length(v_code) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_code');
  END IF;

  UPDATE public.reward_redemptions
  SET status = 'fulfilled',
      fulfilled_at = now(),
      fulfilled_by = 'staff'
  WHERE redemption_code = v_code
    AND status = 'issued'
    AND expires_at > now()
  RETURNING
    id,
    user_id,
    reward_id,
    reward_name,
    reward_category,
    points_cost,
    redemption_code,
    status,
    issued_at,
    expires_at,
    fulfilled_at
  INTO v_redemption;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_used_or_expired');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'redemption', jsonb_build_object(
      'id', v_redemption.id,
      'reward_id', v_redemption.reward_id,
      'reward_name', v_redemption.reward_name,
      'reward_category', v_redemption.reward_category,
      'points_cost', v_redemption.points_cost,
      'redemption_code', v_redemption.redemption_code,
      'status', v_redemption.status,
      'issued_at', v_redemption.issued_at,
      'expires_at', v_redemption.expires_at,
      'fulfilled_at', v_redemption.fulfilled_at
    )
  );
END;
$function$;

-- 4) redeem_pudding_staff — 強化版（簽名/回傳 shape 不變，回傳型別仍是 json 不是 jsonb）
CREATE OR REPLACE FUNCTION public.redeem_pudding_staff(p_passport_number integer, p_staff_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_password TEXT;
  v_passport RECORD;
  v_bucket TEXT := 'global';
  v_fail_count INT;
  v_delay_seconds NUMERIC;
BEGIN
  v_fail_count := public._staff_auth_recent_failures(v_bucket, 15);

  IF v_fail_count >= 20 THEN
    RETURN json_build_object('ok', false, 'error', 'too_many_attempts_locked');
  ELSIF v_fail_count >= 5 THEN
    v_delay_seconds := LEAST(5, (v_fail_count - 4) * 0.5);
    PERFORM pg_sleep(v_delay_seconds);
  END IF;

  -- 1. 從設定表讀取密碼（SECURITY DEFINER 可繞過 RLS）
  SELECT value INTO v_password
  FROM _app_config
  WHERE key = 'staff_password';

  IF v_password IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Server configuration error');
  END IF;

  -- 2. 驗證密碼
  IF p_staff_password != v_password THEN
    INSERT INTO public.staff_auth_attempts (bucket_key, success) VALUES (v_bucket, false);
    RETURN json_build_object('ok', false, 'error', 'Invalid password');
  END IF;

  INSERT INTO public.staff_auth_attempts (bucket_key, success) VALUES (v_bucket, true);

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
$function$;

COMMIT;
