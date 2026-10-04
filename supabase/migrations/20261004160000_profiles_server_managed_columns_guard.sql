-- 2026-10-04 草稿：尚未套用任何資料庫。需 review 與 Penso 核准後由 coordinator 套用。
-- 修正：public.profiles 對 authenticated 有表級 UPDATE 權限（含 points 欄位），RLS 的 UPDATE／ALL policy
-- （"profiles: 用戶更新自己"、"Users can update (their) own profile"、users_can_upsert_own_profile）只比對
-- auth.uid() = id、不限欄位，且表上沒有任何非內部 trigger——所以登入的會員可以直接
-- PATCH／upsert 自己的 profiles.points，繞過 adjust_points，再用 redeem_reward_item 換實體福利。
--
-- 做法：加一支 BEFORE INSERT OR UPDATE trigger（SECURITY INVOKER，不是 definer），依 current_user 判斷：
--   * current_user 在 postgres／service_role／supabase_admin：放行。
--     SECURITY DEFINER 函式（adjust_points、redeem_reward_item、handle_new_user、update_last_seen*）
--     owner 都是 postgres，函式內 current_user 就是 postgres，所以 RPC 路徑照常運作（本機沙盒已實測）。
--   * 其他（authenticated／anon，即經 PostgREST 的用戶端）：
--       UPDATE：任一受保護欄位被改成不同的值 -> 丟 42501（PostgREST 回 403），訊息指出欄位名。
--               沒變的值（例如整列回寫 points = points）放行。
--       INSERT：不報錯，直接把受保護欄位校正成預設值（points=0、total_points=0、tier='New'、
--               v2_unlocked_at=NULL），首次登入的 upsert 不會壞。
--       upsert 命中既有列時：BEFORE INSERT 先把 EXCLUDED 的 points 校正成 0，接著 DO UPDATE 會被 UPDATE 規則
--               擋下（若該列 points 不是 0），符合預期；正常 payload（不含這些欄位）完全不受影響。
--
-- 受保護欄位與理由（2026-10-04 盤點五站 origin/main 的 .from('profiles') 寫入 payload + 線上 catalog）：
--   points         餘額；redeem_reward_item 以它扣款兌換實體福利。唯一合法寫入者是 SECURITY DEFINER RPC。
--   total_points   累計點數（餘額類）；沒有任何用戶端程式碼寫它，線上全為 0。
--   tier           會員等級（預設 'New'，236 筆全為 New）；沒有任何用戶端程式碼寫它。
--   v2_unlocked_at 付費解鎖 v2 的時間戳；只有 kiwimu-com 伺服器端（server/linePayFulfillment.ts，
--                  service_role）在 LINE Pay 付款完成後寫入；用戶端寫它等於免費解鎖付費內容。
-- 用戶端合法寫入的欄位（不動）：
--   passport  src/api/profileCenter.ts   full_name / nickname / display_name / is_mbti_public /
--             is_footprint_public / favorite_character_id / passport_title_id
--   shop      app/api/user/profile (upsert) id / email / full_name / phone；user.repository mbti_type
--   kiwimu    utils/moonIslandSync.ts (upsert onConflict=email) email / mbti_type / nickname / avatar_url / updated_at
--   map、gacha 只讀 profiles。
-- 其他看起來敏感、但目前用戶端確實會寫或需要另行設計，故本 migration 不處理（只列出）：
--   email / google_id / line_user_id / auth_provider：身分欄位，會員可自行改成別人的值
--   （例如 email 被 shop 用來比對訪客訂單、line_user_id 被 get_own_profile_by_line_id 用來查人）。
--   daily_checkin_at / first_site / last_seen_*：目前沒有用戶端寫入，但無金額或權限意義，暫不保護。

begin;

create or replace function public.guard_profiles_server_managed_columns()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  -- 特權角色與以 postgres 身分執行的 SECURITY DEFINER 函式：放行。
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- 預設值對應 catalog：points/total_points 預設 0、tier 預設 'New'、v2_unlocked_at 預設 NULL。
    new.points := 0;
    new.total_points := 0;
    new.tier := 'New';
    new.v2_unlocked_at := null;
    return new;
  end if;

  if new.points is distinct from old.points then
    raise exception 'profiles.points is server-managed and cannot be changed by the client'
      using errcode = '42501';
  end if;
  if new.total_points is distinct from old.total_points then
    raise exception 'profiles.total_points is server-managed and cannot be changed by the client'
      using errcode = '42501';
  end if;
  if new.tier is distinct from old.tier then
    raise exception 'profiles.tier is server-managed and cannot be changed by the client'
      using errcode = '42501';
  end if;
  if new.v2_unlocked_at is distinct from old.v2_unlocked_at then
    raise exception 'profiles.v2_unlocked_at is server-managed and cannot be changed by the client'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

-- 只給 trigger 機制用，不需要任何角色能直接執行。
revoke execute on function public.guard_profiles_server_managed_columns() from public, anon, authenticated;

drop trigger if exists trg_profiles_guard_server_managed_columns on public.profiles;
create trigger trg_profiles_guard_server_managed_columns
  before insert or update of points, total_points, tier, v2_unlocked_at on public.profiles
  for each row
  execute function public.guard_profiles_server_managed_columns();

commit;
