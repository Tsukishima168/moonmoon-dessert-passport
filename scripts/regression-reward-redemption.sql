-- 僅供隔離 PostgreSQL 沙盒；需先載入正式 schema 與待驗 migration。
-- 所有合成資料與故障注入都在交易內回滾；不連正式站、不兌換真實獎品。
\set ON_ERROR_STOP on
begin;
insert into public.profiles(id,points) values
 ('00000000-0000-4000-8000-000000000041',100),
 ('00000000-0000-4000-8000-000000000042',20);
insert into public.reward_items(reward_id,name,points_cost,category) values ('qa_redemption','隔離測試',50,'drink');
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 if public.redeem_reward_item('qa_redemption',50)->>'error' is distinct from 'auth_required' then raise exception 'missing identity accepted'; end if;
 if has_function_privilege('anon','public.redeem_reward_item(text,integer)','EXECUTE') then raise exception 'anon execution allowed'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000041',true);
do $$ declare r jsonb; begin
 if public.redeem_reward_item('missing',50)->>'error' is distinct from 'reward_unavailable' then raise exception 'invalid reward accepted'; end if;
 if public.redeem_reward_item('qa_redemption',1)->>'error' is distinct from 'reward_price_changed' then raise exception 'price override accepted'; end if;
 r:=public.redeem_reward_item('qa_redemption',50);
 if r->>'ok' is distinct from 'true' or (r->>'balance')::int is distinct from 50 then raise exception 'redemption failed'; end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from public.point_transactions where user_id='00000000-0000-4000-8000-000000000041' and action='reward_redeem' and points=-50 and device_id like 'server:reward_redeem:%') <> 1 then raise exception 'ledger invalid'; end if;
 if (select count(*) from public.reward_redemptions where user_id='00000000-0000-4000-8000-000000000041') <> 1 then raise exception 'redemption row invalid'; end if;
 if (select points from public.profiles where id='00000000-0000-4000-8000-000000000042') <> 20 then raise exception 'other balance changed'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000042',true);
do $$ begin
 if public.redeem_reward_item('qa_redemption',50)->>'error' is distinct from 'insufficient_points' then raise exception 'overspend accepted'; end if;
end $$;
reset role;
create function pg_temp.reject_qa_ledger() returns trigger language plpgsql as $$ begin raise exception 'qa injected ledger failure'; end $$;
create trigger qa_reject_ledger before insert on public.point_transactions for each row execute function pg_temp.reject_qa_ledger();
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000041',true);
do $$ begin
 begin perform public.redeem_reward_item('qa_redemption',50); raise exception 'missing injected failure';
 exception when raise_exception then
  if sqlerrm <> 'qa injected ledger failure' then raise; end if;
 end;
 if (select points from public.profiles where id='00000000-0000-4000-8000-000000000041') <> 50 or (select count(*) from public.reward_redemptions where user_id='00000000-0000-4000-8000-000000000041') <> 1 then raise exception 'failed redemption not atomic'; end if;
end $$;
rollback;
\echo 'PASS: auth, anon denial, reward, price, balance, owner isolation, ledger and atomic rollback'
