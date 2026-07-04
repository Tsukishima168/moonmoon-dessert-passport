# Passport AI Handover

Last updated: 2026-06-04

## Project Role

Passport is the identity and membership layer for the Kiwimu five-site universe.

It should own:

- Google OAuth and Supabase session continuity.
- Passport home/dashboard experience.
- Member profile, points, stamps, check-in, and rewards surfaces.
- Connected badge system across Kiwimu, Map, Shop, Gacha, and Passport.
- Public passport, invitation, reward redemption ledger, and staff redeem flows.
- PWA install/update behavior.

It should not own:

- MBTI quiz/content logic. That belongs in `kiwimu-com`.
- Checkout, payment, order fulfillment, or LINE Pay rollout. That belongs in `shop-kiwimu-com`.
- Store map/menu/location product browsing. That belongs in `map-kiwimu-com`.
- Campaign draw mechanics. That belongs in `gacha-kiwimu-com`.

## Current Tech Shape

- React 19 + Vite 6.
- React Router 7.
- Tailwind CSS 3.
- Supabase Auth and shared Supabase data/RPC.
- LINE LIFF support, currently secondary to Google OAuth.
- Vite PWA plugin and service worker regression test.

## Important Flows

- `/`: landing plus dashboard-first passport entry.
- `/?screen=passport`: opens passport surface directly.
- `/passport/:id`: public passport page.
- `/join/:passportId`: public invitation acceptance.
- `/redeem`: staff redemption page for point voucher codes and legacy passport pudding redemption.
- `/auth/callback`: OAuth callback path guarded by service worker and OAuth safety logic.

## Guardrails

- Keep Supabase Auth callback redirects explicit and tested.
- Do not cache OAuth callback/query navigations through service worker.
- Cross-site login should stay in the originating site. Passport may act as the SSO broker, but normal Shop / Map / Gacha / Kiwimu login should use popup broker mode and return to the original page.
- Reward redemption must be server-authoritative. `RewardShop` should call `redeem_reward_item`; do not deduct points locally before the RPC writes `reward_redemptions` and `point_transactions`.
- Keep LIFF optional. Missing `VITE_LIFF_ID` should not break rendering.
- Keep Supabase optional for static render, but authenticated/member flows must show clear unavailable states when env is missing.
- Staff redeem and public invite success paths need real data validation before claiming production readiness.

## Human Verification Needed

- Google OAuth on production domain.
- Supabase Auth Redirect URLs in dashboard.
- LINE in-app browser and LIFF profile behavior.
- Real public passport invitation.
- Real staff redeem write.
- PWA install/update on Android, iOS Safari, and desktop browser.

## Next Maintenance Items

- Keep `CURRENT.md` updated after production smoke tests.
- Add focused regression checks for public invite/redeem once stable fixture data exists.
- Keep cross-site points/profile sync documented against the shared Supabase schema.
- Treat `docs/connected-badge-system.md` as the current product/data contract
  for future cross-site badge implementation.
