# Reward Redemption Ledger

Passport rewards are now server-authoritative. The browser can display catalog
items and call RPCs, but it must not deduct points or insert redemption rows by
itself.

## Tables

- `public.reward_items`: active reward catalog shown by Passport.
- `public.reward_redemptions`: immutable-ish redemption ledger for issued
  vouchers. Users can only select their own rows through RLS.
- `public.point_transactions`: point debit history. The redemption RPC writes
  this in the same transaction as the point deduction and ledger insert.

## Member Flow

`RewardShop` calls `redeem_reward_item(reward_id, expected_points_cost)`.

The RPC:

1. Requires `auth.uid()`.
2. Checks the catalog item is active.
3. Validates the expected point cost so stale clients cannot redeem at old
   prices.
4. Atomically deducts `profiles.points` only when balance is sufficient.
5. Inserts `reward_redemptions`.
6. Inserts `point_transactions`.
7. Returns the new balance plus a `redemption_code`.

Only after this RPC succeeds does the UI mirror the result into local Passport
state and show the voucher code.

## Staff Flow

`/redeem` has two modes:

- `點數兌換碼`: calls `fulfill_reward_redemption_staff(code, password)`.
- `護照布丁`: keeps the older `redeem_pudding_staff(passport_number, password)`.

Staff password remains in `_app_config.staff_password`, which is inaccessible to
browser roles and read only by `SECURITY DEFINER` RPCs.

## Security Rules

- `reward_redemptions` has RLS enabled.
- `anon` and `authenticated` have no direct write grants on the ledger.
- `redeem_reward_item` is executable only by `authenticated`.
- `fulfill_reward_redemption_staff` is executable by `anon` and
  `authenticated`, but requires the staff password inside the RPC.
- All new public-schema tables explicitly grant only the Data API access they
  need, because new Supabase tables may not be auto-exposed.
