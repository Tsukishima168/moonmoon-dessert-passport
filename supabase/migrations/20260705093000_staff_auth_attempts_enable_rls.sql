-- 2026-07-05 已套用線上（Management API）。
-- 修正：staff_auth_attempts 先前 RLS 未啟用 + anon/authenticated 有完整 GRANT，
-- 導致任何人可 INSERT 偽造 success=true 或 DELETE 清空失敗紀錄，
-- 藉此繞過 fulfill_reward_redemption_staff / redeem_pudding_staff 的暴力破解節流。
-- 修法：啟用 RLS（0 policy = deny-all）+ 收回直接權限。
-- 寫入路徑只剩兩支 SECURITY DEFINER 函式（以 owner 身份繞過 RLS），不受影響。
begin;
alter table public.staff_auth_attempts enable row level security;
revoke all on public.staff_auth_attempts from anon, authenticated;
commit;

-- rollback（僅緊急用，會重新打開竄改面，不建議）：
-- alter table public.staff_auth_attempts disable row level security;
