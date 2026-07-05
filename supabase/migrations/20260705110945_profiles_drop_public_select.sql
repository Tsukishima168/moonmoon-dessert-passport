-- 2026-07-05 已套用線上（Management API）。
-- 修正：public.profiles 有一條 "Public profiles are viewable by everyone"
-- (FOR SELECT USING (true))，讓 anon 免登入即可 SELECT 全部 132 筆會員個資
-- （email / phone / google_id / line_user_id / mbti_type / points / tier / region）。
-- 同款問題也存在於 public.shop_profiles（"Anyone can view shop profiles"，目前 0 筆）。
--
-- 前端盤查結果（五站：kiwimu-com / shop-kiwimu-com / passport-kiwimu-com /
-- map-kiwimu-com / gacha-kiwimu-com）：
--   - 絕大多數 profiles 讀取都是 authenticated 讀自己（.eq('id', session.user.id)）
--     或走 service_role/admin client，不依賴這條公開 policy。
--   - 兩處例外，都在 passport-kiwimu-com，且都是 LIFF-only（無 Supabase auth
--     session）用戶用 line_user_id 查詢「自己」的資料，因此無法套用既有的
--     auth.uid() = id own-read policy，過去只能靠這條 USING(true) 才讀得到：
--       * src/api/points.ts        resolveProfile()          .eq(column, value) select('id, points')
--       * src/api/profileCenter.ts fetchProfileRowBySource()  .eq(column, value) select('*')  <- 撈全表欄位
--     這兩處呼叫端本身沒有查任意他人資料的意圖，但因為架構上完全依賴這條公開
--     policy，任何知道他人 line_user_id 的人一樣能用同一支前端程式碼撈到別人
--     的完整 profile（含 email/phone/google_id/points 等）。
--   - 沒有發現任何「公開展示他人 nickname/footprint」的頁面在用這條 policy
--     （is_footprint_public / is_mbti_public 欄位目前只用於使用者編輯自己的
--     公開設定，未被其他頁面拿來過濾展示他人資料）。
--
-- 修法：新增一支 SECURITY DEFINER RPC get_own_profile_by_line_id(text)，只回
-- 白名單非敏感欄位（id / nickname / display_name / points / is_mbti_public /
-- is_footprint_public / favorite_character_id / passport_title_id），不含
-- email / phone / google_id / auth_provider / tier / region 等 PII。
-- 前端兩處呼叫改走這支 RPC 後，DROP 掉 profiles / shop_profiles 上的公開
-- SELECT policy。profiles 既有的 own-read policy（auth.uid() = id）與
-- service_role 全權限維持不變，不受影響。
--
-- shop_profiles 沒有發現任何合法公開需求，且目前 0 筆、無資料外洩風險，
-- 直接收回公開 SELECT，比照 own-update/own-insert 模式補上 own-read policy。

begin;

-- ────────────────────────────────────────────
-- 1. 白名單 RPC：LIFF-only 用戶用 line_user_id 讀自己的
--    profile（僅限非敏感欄位）
-- ────────────────────────────────────────────

create or replace function public.get_own_profile_by_line_id(p_line_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_row record;
begin
  if p_line_user_id is null or btrim(p_line_user_id) = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_line_user_id');
  end if;

  select id, nickname, display_name, points, is_mbti_public, is_footprint_public,
         favorite_character_id, passport_title_id
    into v_row
    from public.profiles
   where line_user_id = p_line_user_id
   limit 1;

  if not found then
    return jsonb_build_object('ok', true, 'data', null);
  end if;

  return jsonb_build_object('ok', true, 'data', to_jsonb(v_row));
end;
$$;

grant execute on function public.get_own_profile_by_line_id(text) to anon, authenticated;

-- ────────────────────────────────────────────
-- 2. profiles — 收回公開 SELECT policy
--    （own-read / own-update / own-insert / service_role 已存在，不受影響）
-- ────────────────────────────────────────────

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;

-- ────────────────────────────────────────────
-- 3. shop_profiles — 收回公開 SELECT policy，補上 own-read
--    （目前 0 筆，無合法公開展示需求；own-update/own-insert 已存在）
-- ────────────────────────────────────────────

drop policy if exists "Anyone can view shop profiles" on public.shop_profiles;

create policy "Users can view own shop profile" on public.shop_profiles
  for select using ((select auth.uid()) = id);

commit;

-- rollback（僅緊急用，會重新打開 132 筆會員個資公開讀取，不建議）：
-- begin;
-- create policy "Public profiles are viewable by everyone" on public.profiles
--   for select using (true);
-- create policy "Anyone can view shop profiles" on public.shop_profiles
--   for select using (true);
-- drop policy if exists "Users can view own shop profile" on public.shop_profiles;
-- drop function if exists public.get_own_profile_by_line_id(text);
-- commit;
