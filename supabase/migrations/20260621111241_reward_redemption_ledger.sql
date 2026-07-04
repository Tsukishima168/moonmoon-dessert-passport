-- Reward redemption center: authoritative catalog, ledger, and RPCs.
-- Frontend clients must not deduct points or insert redemption rows directly.

CREATE TABLE IF NOT EXISTS public.reward_items (
  reward_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  category TEXT NOT NULL CHECK (category IN ('drink', 'dessert', 'merch')),
  redemption_method TEXT NOT NULL DEFAULT 'show-screen',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reward_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reward_items_select_active ON public.reward_items;
CREATE POLICY reward_items_select_active
  ON public.reward_items
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

GRANT SELECT ON TABLE public.reward_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reward_items TO service_role;

INSERT INTO public.reward_items (
  reward_id,
  name,
  description,
  points_cost,
  category,
  redemption_method,
  is_active,
  sort_order
)
VALUES
  ('tea_buckwheat', '蕎麥茶', '清爽回甘的日式蕎麥茶', 50, 'drink', 'show-screen', TRUE, 10),
  ('coffee_iced', '冰美式咖啡', '經典冰美式，黑咖啡的純粹力量', 80, 'drink', 'show-screen', TRUE, 20),
  ('coffee_sicily', '西西里咖啡', '檸檬與咖啡的完美碰撞', 100, 'drink', 'show-screen', TRUE, 30),
  ('latte_matcha', '抹茶拿鐵', '小山園抹茶 × 北海道鮮奶', 120, 'drink', 'show-screen', TRUE, 40),
  ('second_half', '第二杯半價券', '任一飲品第二杯享半價', 150, 'dessert', 'show-screen', TRUE, 50),
  ('pudding_classic', '經典烤布丁', '招牌十勝鮮奶烤布丁', 200, 'dessert', 'show-screen', TRUE, 60),
  ('chiffon_slice', '戚風蛋糕切片', '當日限定口味戚風蛋糕一片', 300, 'dessert', 'show-screen', TRUE, 70),
  ('seasonal_fruit', '季節鮮果甜點', '季節限定鮮果甜點一份', 350, 'dessert', 'show-screen', TRUE, 80),
  ('sticker_set', 'Kiwimu 限量貼紙組', '四款 Kiwimu 角色貼紙', 100, 'merch', 'show-screen', TRUE, 90),
  ('cooler_bag', '品牌保冷提袋', '月島專屬環保保冷提袋', 500, 'merch', 'show-screen', TRUE, 100)
ON CONFLICT (reward_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  points_cost = EXCLUDED.points_cost,
  category = EXCLUDED.category,
  redemption_method = EXCLUDED.redemption_method,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_id TEXT NOT NULL REFERENCES public.reward_items(reward_id),
  reward_name TEXT NOT NULL,
  reward_category TEXT NOT NULL CHECK (reward_category IN ('drink', 'dessert', 'merch')),
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  redemption_code TEXT NOT NULL UNIQUE CHECK (char_length(btrim(redemption_code)) >= 10),
  status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'fulfilled', 'cancelled', 'expired')),
  source TEXT NOT NULL DEFAULT 'passport',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_issued
  ON public.reward_redemptions(user_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_code
  ON public.reward_redemptions(redemption_code);

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reward_redemptions_select_own ON public.reward_redemptions;
CREATE POLICY reward_redemptions_select_own
  ON public.reward_redemptions
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.reward_redemptions FROM anon, authenticated;
GRANT SELECT ON TABLE public.reward_redemptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reward_redemptions TO service_role;

CREATE OR REPLACE FUNCTION public.redeem_reward_item(
  p_reward_id TEXT,
  p_expected_points_cost INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
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

  INSERT INTO public.point_transactions (user_id, points, action, description, source)
  VALUES (
    v_user_id,
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
$$;

REVOKE ALL ON FUNCTION public.redeem_reward_item(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_reward_item(TEXT, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.fulfill_reward_redemption_staff(
  p_redemption_code TEXT,
  p_staff_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_password TEXT;
  v_code TEXT := upper(btrim(coalesce(p_redemption_code, '')));
  v_redemption RECORD;
BEGIN
  SELECT value INTO v_password
  FROM public._app_config
  WHERE key = 'staff_password';

  IF v_password IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'server_configuration_error');
  END IF;

  IF p_staff_password IS NULL OR p_staff_password <> v_password THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_password');
  END IF;

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
$$;

REVOKE ALL ON FUNCTION public.fulfill_reward_redemption_staff(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_reward_redemption_staff(TEXT, TEXT) TO anon, authenticated;
