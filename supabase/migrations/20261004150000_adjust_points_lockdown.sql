-- 2026-10-04 草稿：尚未套用任何資料庫。需 review 與 Penso 核准後由 coordinator 套用。
-- 修正：public.adjust_points(p_amount integer, p_reason text) 是 SECURITY DEFINER，EXECUTE 開給
-- PUBLIC（含 anon）與 authenticated，且對 p_amount 與 p_reason 完全不驗證——任何登入者都能對自己的
-- profiles.points 加任意正數，再用 redeem_reward_item 換 10 項實體福利（50-500 點）。
--
-- 唯一合法呼叫端：每日簽到
--   components/CheckinModal.tsx  -> src/api/points.ts adjustPointsByIdentity() -> rpc('adjust_points', {
--     p_amount: performDailyCheckin().pointsAwarded,
--     p_reason: 'daily_checkin_day_' || streakCount })
--
-- 單日最高獎勵 = 5 點：
--   * performDailyCheckin() 的 pointsAwarded = getCheckinPoints(streak)（types/gamification-types.ts）：
--     STREAK_BONUS_TABLE = {1:1, 2:1, 3:2, 4:2, 5:3, 6:3, 7:5}，((streak-1)%7)+1 循環，最大值 = Day 7 的 5。
--   * 伺服器端對應的 calcStreakPoints()（src/lib/checkinService.ts）同樣上限 5。
--   五站其他 repo（kiwimu-com / shop / gacha / map）沒有任何地方呼叫 adjust_points（origin/main grep）。
--
-- 新規則（失敗一律回 {ok:false,error}，簽名與成功時的回傳 {ok:true,balance} 不變，前端不用改）：
--   1. 必須有 auth.uid()；
--   2. p_reason 必須符合 ^daily_checkin_day_[0-9]+$；
--   3. 1 <= p_amount <= 5；
--   4. 每位使用者每個 Asia/Taipei 日曆日最多一筆 daily_checkin_day_* 入帳（以 point_transactions 判斷，
--      先鎖定該使用者的 profile 列，避免並發請求同時通過檢查）。
--   * 檢查只看 action 符合 daily_checkin_day_<n> 的列；簽到流程另外由 upsert_point_transaction 寫的
--     action = 'daily_checkin' 記錄不會被算進去，也就不會擋到合法簽到。
--   * SET search_path = public 沿用；REVOKE EXECUTE FROM PUBLIC, anon；GRANT 給 authenticated、service_role。
--
-- upsert_point_transaction(text,integer,text,text,text) 只做 INSERT INTO point_transactions，
-- 不碰 profiles.points（2026-10-04 線上 pg_get_functiondef 實查；point_transactions 與 profiles 上
-- 無任何 trigger；沒有函式或 view 以 point_transactions 加總出餘額）。所以它只是流水日誌，不改餘額，
-- 本 migration 不動它。
--
-- 重要發現：線上現行 adjust_points 的 INSERT INTO point_transactions 沒有帶 device_id，而該欄位是
-- NOT NULL 且沒有 default（pg_attribute 實查；表上無 trigger／rule），所以現行函式每次都會在 INSERT 時
-- 丟 not-null violation 並整筆回滾——profiles.points 其實從來沒有被它加過（236 筆 profiles、points 最大值 0、
-- 沒有任何 daily_checkin_day_* 流水，與此吻合），合法的簽到同步也一直是失敗的。redeem_reward_item 的
-- INSERT 同樣沒帶 device_id（reward_redemptions 目前 0 筆）。本 migration 的新版函式補上 device_id
-- ('server:adjust_points')，所以「套用後簽到同步會開始成功運作」（每人每個台北日 <= 5 點）。
-- 若只想先收緊、不啟用，套用前把 INSERT 的 device_id 欄位與值拿掉即可（函式會維持現況的失敗行為）。
--
-- 實查附註（不在本 migration 範圍，另行處理）：profiles 對 authenticated 有表級 UPDATE 權限
-- （has_column_privilege(..., 'points', 'UPDATE') = true），且 "Users can update own profile" 等 policy
-- 的 USING/WITH CHECK 只比對 auth.uid() = id、不限欄位，因此登入者可以繞過 RPC 直接 PATCH 自己的
-- profiles.points。需要另一支 migration 收回欄位權限，並先盤點各站對 profiles 的合法 UPDATE 欄位。
-- 線上資料（2026-10-04）：236 筆 profiles、points 最大值 0，沒有被利用的跡象。

begin;

create or replace function public.adjust_points(p_amount integer, p_reason text)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
  c_max_daily_award constant integer := 5;
  v_profile_id uuid;
  v_new_points integer;
  v_day_start timestamptz;
begin
  v_profile_id := auth.uid();
  if v_profile_id is null then
    return json_build_object('ok', false, 'error', 'Not authenticated');
  end if;

  if p_reason is null
     or length(p_reason) > 40
     or p_reason !~ '^daily_checkin_day_[0-9]+$' then
    return json_build_object('ok', false, 'error', 'Invalid reason');
  end if;

  if p_amount is null or p_amount < 1 or p_amount > c_max_daily_award then
    return json_build_object('ok', false, 'error', 'Invalid amount');
  end if;

  -- 先鎖使用者自己的 profile 列：同一個人的並發呼叫在這裡排隊，後面的「今天領過沒」檢查才可靠。
  perform 1 from public.profiles where id = v_profile_id for update;
  if not found then
    return json_build_object('ok', false, 'error', 'Profile not found');
  end if;

  -- 今天（Asia/Taipei 日曆日）00:00 對應的 timestamptz
  v_day_start := date_trunc('day', now() at time zone 'Asia/Taipei') at time zone 'Asia/Taipei';

  if exists (
    select 1
    from public.point_transactions
    where user_id = v_profile_id
      and action ~ '^daily_checkin_day_[0-9]+$'
      and created_at >= v_day_start
      and created_at < v_day_start + interval '1 day'
  ) then
    return json_build_object('ok', false, 'error', 'Already awarded today');
  end if;

  update public.profiles
  set points = coalesce(points, 0) + p_amount
  where id = v_profile_id
  returning points into v_new_points;

  insert into public.point_transactions (user_id, device_id, points, action, description, source)
  values (v_profile_id, 'server:adjust_points', p_amount, p_reason, p_reason, 'passport');

  return json_build_object('ok', true, 'balance', v_new_points);
end;
$function$;

revoke execute on function public.adjust_points(integer, text) from public, anon;
grant execute on function public.adjust_points(integer, text) to authenticated, service_role;

commit;
