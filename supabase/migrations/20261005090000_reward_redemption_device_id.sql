-- 補齊積分流水必填 device_id，修復合法兌換因 NOT NULL 而整筆回滾。
-- 保留既有身分、價格、餘額檢查與單一交易；識別碼由伺服器的兌換 ID 產生。
-- 不接受用戶傳入點數或 device_id，不改商品、點數及已存在資料。
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

CREATE OR REPLACE FUNCTION public.redeem_reward_item(p_reward_id text, p_expected_points_cost integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_reward_id TEXT := btrim(coalesce(p_reward_id, ''));
  v_item RECORD;
  v_current_points INTEGER;
  v_new_balance INTEGER;
  v_redemption_id UUID;
  v_redemption_code TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_required');
  END IF;

  SELECT reward_id, name, description, points_cost, category, redemption_method
  INTO v_item
  FROM public.reward_items
  WHERE reward_id = v_reward_id
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reward_unavailable');
  END IF;

  IF p_expected_points_cost IS NOT NULL AND p_expected_points_cost <> v_item.points_cost THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'reward_price_changed',
      'points_cost', v_item.points_cost
    );
  END IF;

  UPDATE public.profiles
  SET points = COALESCE(points, 0) - v_item.points_cost
  WHERE id = v_user_id
    AND COALESCE(points, 0) >= v_item.points_cost
  RETURNING points INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    SELECT COALESCE(points, 0)
    INTO v_current_points
    FROM public.profiles
    WHERE id = v_user_id;

    IF v_current_points IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'profile_not_found');
    END IF;

    RETURN jsonb_build_object(
      'ok', false,
      'error', 'insufficient_points',
      'balance', v_current_points,
      'points_cost', v_item.points_cost
    );
  END IF;

  FOR v_attempt IN 1..5 LOOP
    v_redemption_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

    BEGIN
      INSERT INTO public.reward_redemptions (
        user_id,
        reward_id,
        reward_name,
        reward_category,
        points_cost,
        redemption_code,
        metadata
      )
      VALUES (
        v_user_id,
        v_item.reward_id,
        v_item.name,
        v_item.category,
        v_item.points_cost,
        v_redemption_code,
        jsonb_build_object('redemption_method', v_item.redemption_method)
      )
      RETURNING id INTO v_redemption_id;

      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt = 5 THEN
        RAISE;
      END IF;
    END;
  END LOOP;

  INSERT INTO public.point_transactions (user_id, device_id, points, action, description, source)
  VALUES (
    v_user_id,
    'server:reward_redeem:' || v_redemption_id::text,
    -v_item.points_cost,
    'reward_redeem',
    '兌換 ' || v_item.name,
    'passport'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'balance', v_new_balance,
    'redemption', jsonb_build_object(
      'id', v_redemption_id,
      'reward_id', v_item.reward_id,
      'reward_name', v_item.name,
      'reward_category', v_item.category,
      'points_cost', v_item.points_cost,
      'redemption_code', v_redemption_code,
      'status', 'issued',
      'issued_at', now(),
      'expires_at', now() + interval '30 days'
    )
  );
END;
$function$
;

revoke all on function public.redeem_reward_item(text, integer) from public, anon;
grant execute on function public.redeem_reward_item(text, integer) to authenticated;
commit;
