# Passport Member Center Roadmap

## Product Role

`passport.kiwimu.com` is the primary member center in the KIWIMU ecosystem.

Site boundaries:

- `passport.kiwimu.com`: member home, profile, tasks, points, rewards, order visibility, cross-site routing
- `map.kiwimu.com`: brand guide and discovery surface
- `shop.kiwimu.com`: transaction and ordering flow
- `kiwimu.com`: MBTI and story identity source
- `gacha.kiwimu.com`: game and bonus point source

## Current Reality

Passport already has the right data and modules to become the member center:

- shared auth and redirect handling
- profile center editing
- member hub / ecosystem progress
- checkin and points
- reward shop
- shop order history

What is still wrong today is the information architecture.
It still opens like a passport-themed task app, not like the main member home.

## Principles

1. Keep the passport metaphor, but make the first view feel like a member home.
2. Use existing modules first before inventing new backend scope.
3. Keep site roles clean: member center in passport, discovery in map, transaction in shop.
4. Do not expand backend identity logic until the UX priority is correct.

## Phases

### Phase 1

Status: shipped in this PR

Scope:

- make the member-center view the default first view after opening the passport
- reorder tabs so the member home comes before tasks, rewards, and shop
- update landing and summary copy so Passport clearly reads as the member center

Acceptance criteria:

- opening the passport lands on the member home first
- users immediately see Passport as the center of profile, tasks, orders, and points
- passport metaphor remains intact

### Phase 2

Status: next

Scope:

- redesign the member-home tab as a true dashboard using existing modules
- surface profile snapshot, today action, points, checkin, and latest order at the top
- turn journey / rewards / shop into secondary deeper views

Acceptance criteria:

- member home answers who am I, what should I do next, and where should I go
- users do not need to bounce between tabs to understand their current state

### Phase 3

Status: planned

Scope:

- unify member identity rules across Supabase auth, LIFF, local state, and shared profiles
- define canonical ownership for orders, points, profile, and footprint data
- reduce local-only state where it creates cross-device inconsistency

Acceptance criteria:

- one canonical member identity model
- clear source of truth per data domain
- fewer local/cloud mismatch risks

### Phase 4

Status: planned

Scope:

- harden backend dependencies and shared RPC assumptions
- improve observability for home tab usage, downstream routing, and member retention
- expand center-specific UX once identity and data boundaries are stable

Acceptance criteria:

- Passport is measurably the primary member center
- the team can track what routes users take after opening Passport

## This PR

Included:

- member-home tab becomes the default opening view
- tab order now prioritizes the member center
- landing and summary copy now frame Passport as the member home
- roadmap documenting the corrected product direction

Excluded:

- no new backend schema
- no identity rewrite
- no new RPC/API contract
- no redesign of map or shop
