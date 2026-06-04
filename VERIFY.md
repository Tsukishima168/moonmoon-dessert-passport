# Passport Verify

Last updated: 2026-06-04

## Minimum Local Verification

```bash
npm run build
```

This runs:

- `vite build`
- `npm test`
- `scripts/regression-passport-oauth.mjs`

Run the OAuth regression directly when editing auth, service worker, redirect, or PWA code:

```bash
npm test
```

## Preview Smoke

```bash
npm run preview -- --host 127.0.0.1 --port 4120
```

Check these paths:

- `http://127.0.0.1:4120/`
- `http://127.0.0.1:4120/?screen=passport`
- `http://127.0.0.1:4120/redeem`
- `http://127.0.0.1:4120/passport/test-id`
- `http://127.0.0.1:4120/join/test-id`
- `http://127.0.0.1:4120/robots.txt`
- `http://127.0.0.1:4120/sitemap.xml`
- `http://127.0.0.1:4120/llms.txt`

## Browser Checks

- No blank screen on `/`.
- `?screen=passport` opens the dashboard-first passport surface.
- Google login button is visible when signed out.
- Missing Supabase env shows degraded state instead of crashing.
- `/redeem` renders staff form and handles invalid input.
- `/passport/test-id` and `/join/test-id` render controlled missing-data/error states if fixture data does not exist.
- PWA manifest loads from `/manifest.json`.

## Production Smoke

After deploy, verify:

- `https://passport.kiwimu.com/`
- `https://passport.kiwimu.com/?screen=passport`
- `https://passport.kiwimu.com/redeem`
- `https://passport.kiwimu.com/robots.txt`
- `https://passport.kiwimu.com/sitemap.xml`
- `https://passport.kiwimu.com/llms.txt`

Production-only checks:

- Google OAuth returns to Passport and preserves session.
- Supabase Auth Redirect URLs include the production callback/return URL.
- Service worker does not serve stale OAuth callback HTML.
- LIFF is tested inside LINE only after `VITE_LIFF_ID` is configured.

## Release Gate

Before push:

```bash
git diff --check
npm run build
```

Before claiming launch readiness, complete the human verification items listed in `AI_HANDOVER.md`.
