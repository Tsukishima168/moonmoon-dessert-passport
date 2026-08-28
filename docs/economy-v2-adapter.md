# Passport Economy v2 Adapter

## Scope

Passport is the first client adapter for the shared Economy v2 ledger published
from `shop-kiwimu-com`. This adapter changes client behavior only. It does not
publish Supabase migrations, enable rollout flags, import legacy balances, or
retire the legacy tables.

## Authority rules

- An authenticated wallet reads `economy_get_wallet('passport', ...)` first.
- A valid Economy v2 balance, including `0`, is authoritative and is never
  replaced by `localStorage`, a CustomEvent payload, or a URL parameter.
- The legacy `profiles.points` read is a temporary remote compatibility path.
  It is allowed only when the server explicitly returns `ROLLOUT_DISABLED` or
  the Economy v2 RPC does not exist yet.
- Other Economy v2 errors fail closed and show an unavailable state. They do
  not silently switch authorities.
- Every wallet snapshot is bound to an `auth:<user id>` or `line:<user id>`
  owner key. Account changes invalidate in-flight reads and close check-in;
  stale wallet authority or stale results cannot update another member.
- A success envelope is authoritative only when its code is known and its
  integer balance/history contract is valid. Missing, string, fractional, or
  otherwise malformed amounts fail closed instead of becoming `0`.
- LIFF-only visitors may read the existing limited remote profile RPC, but
  Economy v2 writes require a Supabase Auth user.

## Daily check-in

`performPassportCheckin` submits `passport.daily_checkin` without a point
amount. Economy v2 decides eligibility, `Asia/Taipei` calendar-day limits,
award points, and the
resulting balance in one database transaction.

During rollout only:

- `accepted` uses the Economy v2 result.
- A check-in write is attempted only after the same screen has read an Economy
  v2 wallet. This couples read and write authority.
- `shadow`, `ROLLOUT_DISABLED`, a missing RPC, or a legacy wallet are read-only:
  they award no points and never call the old amount-bearing RPC.
- `ALREADY_PROCESSED` and `LIMIT_REACHED` never award again.

The old amount-bearing `adjust_points` helper is no longer shipped by this
adapter. The database-side legacy function belongs to the v1 retirement gate;
Passport Economy v2 does not call it or treat it as formal authority.

## Pending activity claims

The new URL contract is `?economy_claim=<uuid>`. It is separate from the legacy
MBTI `claim` parameter.

1. `index.html` validates the UUID, stores it in `sessionStorage`, removes it
   from both the visible URL and the app's initial-search global before boot.
2. App reads the claim from `sessionStorage` only.
3. If the visitor is signed out, the existing Google login flow preserves page
   context.
4. After authentication, `economy_claim_pending` decides policy, expiry,
   ownership, idempotency, and award points.
5. Successful or terminally rejected claims are removed. Temporarily disabled
   or unavailable claims remain only for the current browser session.

Terminal rejection uses an explicit allowlist (`NOT_ELIGIBLE`,
`LIMIT_REACHED`, `EXPIRED`, `INVALID_PROOF`). Unknown or newly introduced
codes, malformed success payloads, and thrown transport errors retain the
claim and show a retry-safe message.

The client never accepts a user ID or award amount from this URL.

## Legacy attack surface closed in this adapter

- `?action=add_points&amount=...` is scrubbed and observed but never credited.
- `kiwimu:points_earned`, `passport-points-updated`, and `daily-checkin` events
  are refresh hints only; their balances and deltas are ignored.
- Editing `moonmoon_passport.points` cannot change the displayed official
  wallet.
- Check-in UI derives history and eligibility from a remote wallet snapshot.

## Verification and release gates

Local:

```bash
npx tsc --noEmit --pretty false
npm run build
git diff --check
```

Before merge or deploy:

1. Shop Economy v2 migrations pass a real Supabase staging apply, hosted lint,
   Auth/RLS/PostgREST checks, and independent review.
2. Passport read and write flags are enabled together for dedicated test users;
   a mismatched flag state must remain fail-closed and write nothing.
3. Test a real remote zero, malformed success payload, cross-account switch,
   successful and duplicate check-in, pending/expired/unknown-code claims,
   thrown claim request, forged URL amount, forged CustomEvent, and logout.
4. Verify the dedicated account ledger sum and wallet balance match.
5. Keep the Passport PR unmerged while the foundation migration remains Draft.

As of 2026-07-16, the shared foundation has passed the real hosted staging
apply, Supabase lint, Auth/RLS/PostgREST, concurrency, proof replay, stock
expiry, and default-off kill-switch checks. Production still has none of the
six Economy v2 versions, all rollout flags remain absent/off, and merge/deploy
still require the explicit execution authorization and final PR checks.

Production rollout remains allowlist → 10% → 50% → 100%, with at least 24
hours and 20 valid events at each level. The legacy wallet read is not removed
until the separate observation and reconciliation gates pass.
