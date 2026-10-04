-- 2026-10-04 草稿：尚未套用任何資料庫。需 review 與 Penso 核准後由 coordinator 套用。
-- 修正：public.redeem_reward_item(p_reward_id text, p_expected_points_cost integer) 目前每次呼叫都失敗。
-- 原因：函式最後寫流水帳的 INSERT INTO public.point_transactions 沒帶 device_id，而該欄位是 NOT NULL 且沒有
-- default（2026-10-04 線上 information_schema 實查；表上無 trigger），所以 not-null violation 讓整個交易回滾——
-- 扣點、reward_redemptions 的 INSERT 全部被撤銷。線上 reward_redemptions = 0 筆，與此吻合。
-- 與 20261004150000_adjust_points_lockdown.sql 修的是同一個 bug，做法也一致：device_id 填伺服器端固定標記
-- 'server:redeem_reward_item'（adjust_points 用 'server:adjust_points'），讓這類由 RPC 產生的流水帳可以和
-- 各站裝置端寫入的 device_id 區分。
--
-- 除了那個 INSERT 多一欄之外，函式本體與線上現行版本逐行相同（本機沙盒以 diff 驗證）：
--   * 認證檢查（auth_required）、reward_items 啟用檢查（reward_unavailable）、
--     expected cost 比對（reward_price_changed，回 points_cost）；
--   * 單一 UPDATE ... WHERE points >= cost 同時完成餘額檢查與列鎖（並發兌換第二筆會等第一筆提交後重新評估而失敗），
--     餘額不足回 insufficient_points（附目前 balance 與 points_cost），沒有 profile 回 profile_not_found；
--   * 兌換碼 unique_violation 重試迴圈（最多 5 次）、reward_redemptions INSERT；
--   * 回傳形狀 {ok,balance,redemption{...}} 不變，前端 src/api/rewards.ts／components/RewardShop.tsx 不用改。
-- 函式內的 UPDATE profiles.points 以 owner = postgres 身分執行，會通過 20261004160000／170000 的 profiles 欄位守衛。
-- 簽名、SECURITY DEFINER、search_path 不變；ACL 不變（authenticated、service_role；PUBLIC／anon 無）。
-- 員工核銷路徑 fulfill_reward_redemption_staff 完全不動。

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
    'server:redeem_reward_item',
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

revoke execute on function public.redeem_reward_item(text, integer) from public, anon;
grant execute on function public.redeem_reward_item(text, integer) to authenticated, service_role;

commit;
