# Passport SSO Broker Contract

## Goal

Passport is the identity provider for the Kiwimu sites, but it must not become
the visible destination for normal login.

For Shop, Map, Gacha, and Kiwimu, login should feel local to the current site:

1. The current site checks the shared `.kiwimu.com` Supabase session first.
2. If there is no session, the current site opens Passport in a popup.
3. Passport completes Google OAuth inside that popup.
4. Passport posts a `kiwimu:sso:complete` message back to the opener.
5. The opener refreshes its local session state and keeps the user on the same page.
6. If popup is blocked, fallback may use full-page SSO, but it must return to
   `redirect_to` and must not leave the user on the Passport home page.

## URL Contract

Normal popup login:

```text
https://passport.kiwimu.com/?redirect_to=<encoded current URL>&mode=sso&presentation=popup&intent=<intent>&source_site=<site>
```

Popup-blocked fallback:

```text
https://passport.kiwimu.com/?redirect_to=<encoded current URL>&mode=sso&presentation=redirect&intent=<intent>&source_site=<site>
```

Allowed `source_site` values:

- `kiwimu`
- `shop`
- `map`
- `gacha`

`redirect_to` must stay inside `https://*.kiwimu.com` in production. Local
development may allow localhost or same-host HTTP redirects.

## Message Contract

Passport sends this message to the opener origin derived from `redirect_to`:

```ts
{
  type: 'kiwimu:sso:complete',
  status: 'success' | 'error',
  redirectTo?: string,
  message?: string
}
```

The opener must:

- ignore messages from non-Passport origins
- ignore messages with another `type`
- close or let Passport close the popup
- refresh its local auth/session state on success
- show visible feedback on error or popup close

## UX Rules

- Do not navigate the main tab to Passport for normal login.
- Do not use Passport home as a login confirmation page.
- Do not lose result-page, checkout, map, reward, or gacha context.
- Do not silently fail when the popup is closed.
- Only use full-page redirect as a popup-blocked fallback, and always return to
  the original site.

## Regression Surface

Passport-side changes must stay covered by `scripts/regression-passport-oauth.mjs`:

- `presentation=popup` / `mode=sso` broker detection
- broker-only query param scrubbing
- `redirect_to` origin-derived `postMessage` target
- success and error opener notification
- service worker query navigation NetworkOnly behavior

Each client site should keep login entry points routed through its local
`openPassportLogin(...)` helper instead of hard-coding Passport URLs.
