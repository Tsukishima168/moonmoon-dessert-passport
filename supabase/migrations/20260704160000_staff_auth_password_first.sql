-- 2026-07-04 已套用線上（Management API）。
-- 目的：修正 staff 防暴力的 DoS 弱點——把密碼檢查移到鎖定閘門之前。
-- 正確密碼永遠放行（成功嘗試不計入鎖定），延遲/鎖定只作用於錯誤嘗試，
-- 因此攻擊者狂打錯密碼無法再連帶把持有正確密碼的真店員鎖住。
-- 取代先前 migration 裡『鎖定閘門在密碼檢查之前』的版本。冪等（CREATE OR REPLACE）。

BEGIN;

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
  SELECT value INTO v_password FROM _app_config WHERE key = 'staff_password';
  IF v_password IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Server configuration error');
  END IF;

  -- 密碼優先檢查：正確密碼永遠放行，鎖定/延遲只作用於錯誤嘗試
  IF p_staff_password IS NULL OR p_staff_password != v_password THEN
    v_fail_count := public._staff_auth_recent_failures(v_bucket, 15);
    IF v_fail_count >= 20 THEN
      INSERT INTO public.staff_auth_attempts (bucket_key, success) VALUES (v_bucket, false);
      RETURN json_build_object('ok', false, 'error', 'too_many_attempts_locked');
    ELSIF v_fail_count >= 5 THEN
      v_delay_seconds := LEAST(5, (v_fail_count - 4) * 0.5);
      PERFORM pg_sleep(v_delay_seconds);
    END IF;
    INSERT INTO public.staff_auth_attempts (bucket_key, success) VALUES (v_bucket, false);
    RETURN json_build_object('ok', false, 'error', 'Invalid password');
  END IF;

  INSERT INTO public.staff_auth_attempts (bucket_key, success) VALUES (v_bucket, true);

  SELECT id, passport_number, holder_name, status,
         invite_slots_total, invite_slots_used, pudding_claimed
  INTO v_passport
  FROM passports
  WHERE passport_number = p_passport_number;

  IF v_passport IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Passport not found');
  END IF;

  IF v_passport.invite_slots_used < v_passport.invite_slots_total THEN
    RETURN json_build_object('ok', false, 'error', 'Invite slots not full');
  END IF;

  IF v_passport.pudding_claimed THEN
    RETURN json_build_object('ok', false, 'error', 'Already redeemed');
  END IF;

  INSERT INTO redemptions (passport_id, reward_type, verified_by, source)
  VALUES (v_passport.id, 'pudding', 'staff', 'passport');

  UPDATE passports SET pudding_claimed = true WHERE id = v_passport.id;

  RETURN json_build_object(
    'ok', true,
    'passport_number', v_passport.passport_number,
    'holder_name', v_passport.holder_name
  );
END;
$function$;

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
  SELECT value INTO v_password FROM public._app_config WHERE key = 'staff_password';
  IF v_password IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'server_configuration_error');
  END IF;

  -- 密碼優先檢查：正確密碼永遠放行，鎖定/延遲只作用於錯誤嘗試
  IF p_staff_password IS NULL OR p_staff_password <> v_password THEN
    v_fail_count := public._staff_auth_recent_failures(v_bucket, 15);
    IF v_fail_count >= 20 THEN
      INSERT INTO public.staff_auth_attempts (bucket_key, success) VALUES (v_bucket, false);
      RETURN jsonb_build_object('ok', false, 'error', 'too_many_attempts_locked');
    ELSIF v_fail_count >= 5 THEN
      v_delay_seconds := LEAST(5, (v_fail_count - 4) * 0.5);
      PERFORM pg_sleep(v_delay_seconds);
    END IF;
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
    id, user_id, reward_id, reward_name, reward_category, points_cost,
    redemption_code, status, issued_at, expires_at, fulfilled_at
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

COMMIT;
