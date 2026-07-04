# Connected Badge System

Passport badges turn the five-site Kiwimu ecosystem into a connected member
journey. The source site stays in context; Passport becomes the place where the
member's identity, badges, points, rewards, and history are collected.

## Product Position

Passport is not a discount card. It is the identity layer and achievement wall
for the Kiwimu five-site universe.

Core promise:

> Complete meaningful actions across Kiwimu, Map, Shop, Gacha, and Passport.
> Earn badges without leaving the flow. Open Passport to see what you have
> become and what to do next.

## Principles

1. **No disruptive redirects**
   - Users complete actions on the current site.
   - If login is required, use the Passport popup broker and return to the
     original screen.
   - Passport is the collector, not an interruption.

2. **Server-authoritative unlocks**
   - Frontend sites may emit events.
   - Supabase decides whether a badge is awarded.
   - The browser must not be the source of truth for permanent badges.

3. **Badges and stamps are related but not identical**
   - Stamps are journey/task progress, including store QR, GPS, IG, LINE, and
     local discovery tasks.
   - Badges are durable identity achievements, especially cross-site or
     campaign achievements.
   - A badge can be awarded by earning a stamp, but the data model should not
     collapse them into one table.

4. **Rewards should feel earned, not sprayed**
   - Use badges to create identity and progression.
   - Use points and reward redemptions for economic value.
   - Avoid making every badge a discount.

## First Launch Badge Set

These are the phase-one badges because they explain the whole ecosystem with
minimal complexity.

| Badge ID | Display Name | Trigger Event | Source Site | Purpose |
|---|---|---|---|---|
| `first_quiz_completed` | 人格探索章 | `quiz_completed` or `quiz_completion` | `kiwimu` | MBTI/story identity source |
| `passport_activated` | 護照啟動章 | `passport_opened` or first `site_visited` | `passport` | First membership commitment |
| `first_map_visit` | 月島足跡章 | `map_checkin` or `site_visited` | `map` | Discovery and store-route bridge |
| `first_gacha_played` | 幸運轉蛋章 | `gacha_played` | `gacha` | Habit and playful return loop |
| `first_reward_redeemed` | 首次兌換章 | `reward_redeemed` | `passport` | Proves the reward economy works |

Phase-one optional add-on:

| Badge ID | Display Name | Trigger Event | Source Site | Purpose |
|---|---|---|---|---|
| `first_order_completed` | 甜點收藏章 | `order_placed` | `shop` | Purchase proof and Shop connection |

## Badge Categories

### 1. Action Badges

Awarded once after a meaningful first action.

Examples:

- First quiz completed
- First Passport opened
- First Map check-in
- First Gacha play
- First reward redeemed
- First Shop order

### 2. Habit Badges

Awarded after repeated behavior.

Examples:

- 3-day check-in streak
- 7-day check-in streak
- 3 Gacha plays in 7 days
- 2 reward redemptions in 30 days

### 3. Combination Badges

Awarded after completing a cross-site set. These are the most brand-defining.

Examples:

- `moon_resident`: complete quiz + open Passport + visit Map
- `dessert_pathfinder`: visit Map + place Shop order
- `full_universe_rookie`: complete one action on all five sites

### 4. Seasonal Badges

Campaign-limited badges for a month or season.

Examples:

- Spring limited stamp rally
- Birthday month badge
- Christmas hidden dessert badge
- Offline event attendance badge

## Event Contract

All source sites should emit normalized events into Supabase `user_events`.

| Source | Event Type | Required Metadata | Notes |
|---|---|---|---|
| Kiwimu | `quiz_completed` | `mbti_type`, `source` | Accept `quiz_completion` as GA4 name, normalize to `quiz_completed` in Supabase if possible. |
| Passport | `passport_opened` | `entrance_source` | Can be emitted on authenticated first open. |
| Passport | `passport_checkin` | `location`, `streak_count` | Used for habit badges. |
| Passport | `reward_redeemed` | `reward_id`, `redemption_id` | Award only after server RPC succeeds. |
| Passport | `stamp_claim` | `stamp_id`, `method` | Can map stamp completion into badges. |
| Map | `map_checkin` | `method`, `location_id` | Prefer signed QR or GPS-validated check-in for physical badge. |
| Map | `site_visited` | `path`, `source` | Can unlock low-stakes discovery badge only. |
| Shop | `order_placed` | `order_id`, `order_total` | Emit only after order record is created. |
| Gacha | `gacha_played` | `prize_type`, `points_delta` | One per successful play result. |

## Supabase Design

The existing `user_events` table remains the event intake surface. The badge
system should add durable catalog and award tables.

### Tables

```sql
public.badge_catalog
  id text primary key
  display_name text not null
  description text not null
  category text not null
  rarity text not null default 'common'
  icon_key text
  source_site text
  status text not null default 'active'
  starts_at timestamptz
  ends_at timestamptz
  display_order integer not null default 100
  metadata jsonb not null default '{}'
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()

public.badge_rules
  id uuid primary key default gen_random_uuid()
  badge_id text not null references public.badge_catalog(id)
  rule_type text not null
  event_type text
  site text
  threshold integer not null default 1
  window_days integer
  sequence jsonb not null default '[]'
  metadata jsonb not null default '{}'
  created_at timestamptz not null default now()

public.user_badges
  id uuid primary key default gen_random_uuid()
  user_id uuid not null references auth.users(id)
  badge_id text not null references public.badge_catalog(id)
  awarded_at timestamptz not null default now()
  source_event_id uuid
  source_site text
  metadata jsonb not null default '{}'
  unique (user_id, badge_id)

public.badge_unlock_events
  id uuid primary key default gen_random_uuid()
  user_id uuid not null references auth.users(id)
  badge_id text not null references public.badge_catalog(id)
  event_type text not null
  source_site text
  source_event_id uuid
  metadata jsonb not null default '{}'
  created_at timestamptz not null default now()
```

### RLS

- `badge_catalog`: public read for active catalog rows.
- `badge_rules`: service role only.
- `user_badges`: authenticated users can select their own rows only.
- `badge_unlock_events`: authenticated users can select their own rows only.
- Direct insert/update/delete should be denied to browser roles.

### RPC / Awarding

Preferred first implementation:

```text
insert_user_event(...)
  -> inserts into user_events
  -> calls internal award_badges_for_event(event_id)
  -> returns awarded_badges[]
```

Why:

- Existing sites already call `insert_user_event`.
- The badge logic stays central.
- Source sites do not need to know all badge rules.

Alternative:

```text
record_user_event_and_award_badges(...)
```

This is cleaner long term but requires updating all five sites, so it should be
phase two unless the event RPC is already being refactored.

## Frontend UX

### On Source Site

When a badge is awarded:

```text
Action completed
-> source site shows "徽章已解鎖"
-> if not logged in, show "登入保存徽章"
-> Passport popup broker saves session
-> user returns to original page
```

The user should not be redirected to Passport unless they explicitly tap
"查看我的護照".

### In Passport

Passport should display:

- badge wall
- newest unlocked badge
- next recommended badge
- source-site progress
- reward links unlocked by badges

Recommended navigation:

```text
Home dashboard
  -> Today action
  -> Newest badge
  -> Points balance
  -> Next unlock
Badges
  -> Earned
  -> In progress
  -> Locked / seasonal
Rewards
  -> Redeemable by points
  -> Redeemable by badge conditions
```

## Analytics

GA4 event:

```text
badge_unlocked
```

Parameters:

- `badge_id`
- `badge_category`
- `source_site`
- `trigger_event`
- `rarity`

Supabase event:

```text
badge_unlocked
```

Use this to measure:

- badge unlock rate
- first badge to second badge conversion
- five-site completion rate
- reward redemption after badge unlock
- 7-day return rate after first badge

## Abuse Controls

- Unique `(user_id, badge_id)` prevents duplicate badge awards.
- Physical store badges should use signed QR or GPS validation, not plain query
  params as the final authority.
- Order badges should only come from the Shop server/order handler.
- Reward badges should only trigger after `redeem_reward_item` or staff fulfill
  RPC succeeds.
- Seasonal badges should include `starts_at` and `ends_at`.
- Metadata should not store sensitive contact, payment, or token values.

## Implementation Phases

### Phase 0 - Design Lock

Deliverables:

- This design document.
- First badge catalog confirmed.
- Event contract confirmed with all five sites.

Acceptance:

- No schema or source-site work starts without confirming the first badge IDs.

### Phase 1 - Passport + Supabase Foundation

Deliverables:

- Badge catalog tables.
- User badge award tables.
- `get_my_badges()` read RPC.
- `award_badges_for_event()` internal function.
- Seed five phase-one badges.
- Passport badge wall reads from Supabase.

Acceptance:

- A signed-in user can see earned badges across sessions/devices.
- Duplicate events do not duplicate badges.

### Phase 2 - Five-Site Event Wiring

Deliverables:

- Kiwimu emits quiz completed event with user identity.
- Map emits visit/check-in event.
- Shop emits order placed event from the server side.
- Gacha emits successful play event.
- Passport emits open/check-in/redeem events.
- Source sites display badge unlock feedback without full-page redirect.

Acceptance:

- User can earn at least one badge from each site.
- Login popup returns to the original page.

### Phase 3 - Campaign Layer

Deliverables:

- Combination badges.
- Seasonal campaign badges.
- Badge-gated rewards.
- GA4 badge funnel report.

Acceptance:

- Passport can run a monthly campaign without code changes to all five sites.

## Open Decisions

1. Should `first_map_visit` be awarded on opening Map, or only on physical
   check-in? Recommendation: first launch can use Map visit; store-exclusive
   badges should require QR/GPS later.
2. Should `first_order_completed` be in phase one? Recommendation: yes if Shop
   order server event is reliable; otherwise keep it phase-one optional.
3. Should badges grant points? Recommendation: badges should not automatically
   grant points at first. Keep badges for identity, points for economy.
4. Should public passport pages show badges? Recommendation: show selected
   public badges only after explicit profile/privacy setting exists.
