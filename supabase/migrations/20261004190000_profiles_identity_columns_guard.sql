-- 2026-10-04 草稿：尚未套用任何資料庫。需 review 與 Penso 核准後由 coordinator 套用。
-- 前置：20261004160000_profiles_server_managed_columns_guard.sql 已在線上（trigger trg_profiles_guard_server_managed_columns
-- 目前只保護 points／total_points／tier／v2_unlocked_at）。本 migration 沿用同一支 trigger 函式與同一套規則，往上擴充，不另開第二支。
--
-- 修正：登入會員目前可以直接 PATCH／upsert 自己 profiles 的身分欄位 email、google_id、auth_provider、line_user_id
-- （RLS 的 UPDATE／ALL policy 只比對 auth.uid() = id、不限欄位；authenticated／anon 有表級 UPDATE 權限）。
--   * email：shop 以它比對訪客訂單（findUserByEmail），會員可改成別人的 email 去認領他人訂單。
--   * line_user_id：get_own_profile_by_line_id 以它查人；會員可把自己的 line_user_id 改成別人的，
--     或先佔住別人的 LINE id。
--   * google_id／auth_provider：身分來源標記，不應由用戶端宣稱。
--
-- ── 新規則（非 postgres／service_role／supabase_admin 的呼叫端，即經 PostgREST 的 authenticated／anon）──
--   INSERT（不報錯，直接校正，首次登入的 upsert 不會壞）：
--     google_id := NULL；line_user_id := NULL；auth_provider := 'google'（= 欄位預設值，與 handle_new_user 的結果一致）；
--     email := 簽名 JWT 內的 email claim（僅當 new.id = auth.uid()），否則 NULL。
--     JWT 的 email 來自 auth.users.email（已驗證），不是 user_metadata（那是用戶可自行改的），所以可信。
--   UPDATE：
--     google_id／auth_provider／line_user_id 任何變動 -> 42501（PostgREST 403），訊息指出欄位名。
--     email 變動 -> 42501，唯一例外：新值等於「呼叫者自己簽名 JWT 內的 email」（大小寫不拘）。
--       這等於 handle_new_user 本來就會做的事，所以不是讓用戶端宣稱身分；它讓舊資料（線上有 2 筆 profiles.email 為
--       NULL 但 auth.users 有 email）能被下一次合法 upsert 自癒，而且 shop 的 PATCH 每次都帶 email: user.email，
--       不會因為本 migration 而 403。
--     沒變的值（整列回寫）一律放行。
--   上述外的任何路徑：SECURITY DEFINER 函式（owner = postgres，函式內 current_user = postgres）、service_role、
--   supabase_admin 照常放行——handle_new_user 與下面的 bind_line_user_id 因此不受影響。
--
-- ── 五站 payload 盤點（2026-10-04 各 repo origin/main，唯讀 grep；結論：沒有任何站台寫 google_id／line_user_id／auth_provider）──
--   passport  src/api/profileCenter.ts update：full_name／nickname／display_name／is_mbti_public／is_footprint_public／
--             favorite_character_id／passport_title_id（hasOwn 檢查，線上沒有 full_name 欄位所以實際只送其餘幾個）——不含身分欄位。
--   shop      app/api/user/profile PATCH upsert { id, email: user.email, full_name, phone } onConflict id：
--             email 恆等於 JWT email -> INSERT 校正後同值、UPDATE 無變動，通過。（full_name 欄位線上不存在，這支本來就會因
--             「column does not exist」失敗，與本 migration 無關，另案。）
--             user.repository：update { mbti_type }、rpc update_last_seen_for_user——不含身分欄位。
--   kiwimu    utils/moonIslandSync.ts upsert { email, mbti_type, nickname, avatar_url, updated_at } onConflict 'email'：
--             線上 profiles.email 沒有 unique index、payload 也沒有 id，這支今天就會失敗（42P10 或 id NOT NULL），
--             本 migration 前後行為相同。若日後要讓它運作，請改 onConflict:'id' 並帶 id；email 屆時同樣等於 JWT email。
--             server/linePayFulfillment.ts 用 service_role 寫 v2_unlocked_at，放行。
--   map／gacha 只讀 profiles。
--
-- ── line_user_id：改為只能經「已驗證的 LINE ID token」寫入 ──
--   盤點結論：目前沒有任何程式碼寫 line_user_id（線上 236 筆 profiles、line_user_id 非空 = 0；google_id 非空 = 0）。
--   passport 的 LiffContext.getIdToken()（commit 040e7d4）是為綁定流程預備的，但流程本身尚未存在。
--   新增 public.bind_line_user_id(p_user_id uuid, p_line_user_id text)：SECURITY DEFINER、只給 service_role。
--   呼叫者是 passport 的 Vercel function api/line-bind.ts：它先用 LINE verify API 驗 ID token（簽章、aud、exp）、
--   再用 Supabase /auth/v1/user 驗登入者，然後才帶著 service_role 金鑰呼叫本函式。SQL 無法驗 LINE 簽章，所以驗證在函式外、
--   本函式只負責「在已驗證前提下的原子寫入與衝突處理」：
--     * 一個 profile 只能綁一個 LINE id（已綁不同 id -> profile_bound_to_other_line，不覆蓋；要換綁請由管理員處理）；
--     * 一個 LINE id 只能綁一個 profile（-> line_id_in_use；另有 partial unique index 兜底）；
--     * 重複綁同一個 id 是冪等成功。
--
-- ── get_own_profile_by_line_id 審計結果（保持簽名與回傳形狀）──
--   線上現行版本沒有驗證呼叫者是否擁有該 LINE id：SECURITY DEFINER、EXECUTE 開給 PUBLIC／anon／authenticated，
--   任何人只要有 anon key + 對方的 LINE userId，就能取回 id／nickname／display_name／points／公開旗標／
--   favorite_character_id／passport_title_id（本機沙盒實測重現）。目前 0 筆 profiles 有 line_user_id 所以尚無資料外洩，
--   但一旦綁定流程上線就會開始外洩。修正：必須有 auth.uid()，且只回傳 id = auth.uid() 的那一列（名實相符的 "own"）；
--   找不到仍回 {ok:true,data:null}（不洩漏「這個 LINE id 存不存在」）；未登入回 {ok:false,error:'auth_required'}。
--   影響：沒有 Supabase session 的 LIFF-only 訪客不再能用 LINE id 查積分／個人中心資料——但線上今天沒有任何列有
--   line_user_id，這條路本來就查不到東西，用戶端遇到 auth_required／data:null 的處理是同一條 fallback（改用本機資料）。
--   EXECUTE 保留給 anon（回 auth_required）而不是 revoke，避免 LIFF-only 訪客每次載入都在 console 噴 permission denied。

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- 一個 LINE id 只能屬於一個 profile（線上目前 0 筆非空，建立不會失敗）。
create unique index if not exists profiles_line_user_id_key
  on public.profiles (line_user_id)
  where line_user_id is not null;

create or replace function public.guard_profiles_server_managed_columns()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  v_uid uuid;
  v_jwt_email text;
begin
  -- 特權角色與以 postgres 身分執行的 SECURITY DEFINER 函式：放行。
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;

  -- 以下只剩經 PostgREST 的 authenticated／anon。身分只信簽名過的 JWT（claims 由 PostgREST 驗章後注入）。
  v_uid := auth.uid();
  v_jwt_email := nullif(btrim(auth.jwt() ->> 'email'), '');

  if tg_op = 'INSERT' then
    -- 餘額類預設值對應 catalog：points/total_points 預設 0、tier 預設 'New'、v2_unlocked_at 預設 NULL。
    new.points := 0;
    new.total_points := 0;
    new.tier := 'New';
    new.v2_unlocked_at := null;
    -- 身分欄位：只能由認證系統／server 寫。auth_provider 回到欄位預設值 'google'。
    new.google_id := null;
    new.line_user_id := null;
    new.auth_provider := 'google';
    new.email := case when v_uid is not null and new.id = v_uid then v_jwt_email else null end;
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

  if new.google_id is distinct from old.google_id then
    raise exception 'profiles.google_id is server-managed and cannot be changed by the client'
      using errcode = '42501';
  end if;
  if new.auth_provider is distinct from old.auth_provider then
    raise exception 'profiles.auth_provider is server-managed and cannot be changed by the client'
      using errcode = '42501';
  end if;
  if new.line_user_id is distinct from old.line_user_id then
    raise exception 'profiles.line_user_id is server-managed and cannot be changed by the client (use the verified LINE bind endpoint)'
      using errcode = '42501';
  end if;
  if new.email is distinct from old.email then
    -- 唯一例外：改成呼叫者自己簽名 JWT 內已驗證的 email（見檔頭說明）。
    if not coalesce(
         v_uid is not null
         and old.id = v_uid
         and v_jwt_email is not null
         and new.email is not null
         and lower(btrim(new.email)) = lower(v_jwt_email),
         false
       ) then
      raise exception 'profiles.email is server-managed and cannot be changed by the client'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;

-- 只給 trigger 機制用，不需要任何角色能直接執行（CREATE OR REPLACE 會保留既有 ACL，這裡再明示一次）。
revoke execute on function public.guard_profiles_server_managed_columns() from public, anon, authenticated;

drop trigger if exists trg_profiles_guard_server_managed_columns on public.profiles;
create trigger trg_profiles_guard_server_managed_columns
  before insert or update of points, total_points, tier, v2_unlocked_at,
                             email, google_id, auth_provider, line_user_id
  on public.profiles
  for each row
  execute function public.guard_profiles_server_managed_columns();

-- 唯一合法的 line_user_id 寫入口：只給 service_role（Vercel function 驗完 LINE ID token 之後呼叫）。
create or replace function public.bind_line_user_id(p_user_id uuid, p_line_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_current text;
begin
  -- LINE userId 格式：'U' + 32 碼英數。ID token 的 sub 就是這個值；格式不符一律拒絕。
  if p_user_id is null or p_line_user_id is null or p_line_user_id !~ '^U[0-9A-Za-z]{32}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;

  -- 鎖住該 profile 列，同一人並發綁定在這裡排隊。
  select line_user_id into v_current
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'profile_not_found');
  end if;

  if v_current is not null then
    if v_current = p_line_user_id then
      return jsonb_build_object('ok', true, 'already_bound', true);
    end if;
    return jsonb_build_object('ok', false, 'error', 'profile_bound_to_other_line');
  end if;

  begin
    update public.profiles
    set line_user_id = p_line_user_id,
        updated_at = now()
    where id = p_user_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'line_id_in_use');
  end;

  return jsonb_build_object('ok', true);
end;
$function$;

revoke all on function public.bind_line_user_id(uuid, text) from public, anon, authenticated;
grant execute on function public.bind_line_user_id(uuid, text) to service_role;

-- get_own_profile_by_line_id：保持簽名與回傳形狀，改為只回傳呼叫者自己的那一列。
create or replace function public.get_own_profile_by_line_id(p_line_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_uid uuid := auth.uid();
  v_row record;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;

  if p_line_user_id is null or btrim(p_line_user_id) = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_line_user_id');
  end if;

  select id, nickname, display_name, points, is_mbti_public, is_footprint_public,
         favorite_character_id, passport_title_id
    into v_row
    from public.profiles
   where line_user_id = p_line_user_id
     and id = v_uid
   limit 1;

  if not found then
    return jsonb_build_object('ok', true, 'data', null);
  end if;

  return jsonb_build_object('ok', true, 'data', to_jsonb(v_row));
end;
$function$;

revoke all on function public.get_own_profile_by_line_id(text) from public;
grant execute on function public.get_own_profile_by_line_id(text) to anon, authenticated, service_role;

commit;
