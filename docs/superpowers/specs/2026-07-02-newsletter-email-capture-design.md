# Newsletter / Email Capture — Design Spec

**Date:** 2026-07-02
**Repo:** `atelier-website` (marketing site — Astro on Cloudflare Pages)
**Status:** Approved design, pending implementation plan

## Problem

The #1 leak in the funnel: visitors read the Journal and browse the marketing
site, then leave with no way to stay in touch. There is currently **no email
capture** anywhere on myatelier.style. We want consented email capture feeding a
MailerLite audience, so we can nurture readers toward a Studio trial and send a
newsletter ("the Atelier letter").

## Goals

- Capture emails with valid UK consent from four surfaces, all feeding one list.
- Keep the marketing site's privacy posture intact: **no third-party JS, no new
  cookies, no cookie banner** (see `apps/marketing/src/pages/legal/privacy.mdx`).
- Sending is handled entirely in MailerLite's dashboard — no send logic here.
- Degrade gracefully: never lose a signup to a broken script.

## Non-goals (out of scope for this build)

- Building any email-sending / broadcast logic (MailerLite does this).
- Lead magnets / the public taste-test (Phase 2 — will reuse this plumbing).
- Welcome-automation sequences (configured later in MailerLite, no code).
- A/B testing of copy or placement.

## Decisions (settled)

- **ESP:** MailerLite, via the user's **existing account**; Atelier lives as its
  own **group** so it can be sent to independently. (Separate-account option was
  considered; group chosen for simplicity. Architecture is identical either way —
  only the group ID differs.)
- **Integration:** server-side via a Cloudflare Pages Function calling the
  MailerLite API. **Not** MailerLite's embed snippet (that would load third-party
  JS/cookies and force a cookie banner).
- **Consent model:** double opt-in (confirmed opt-in).
- **Consent UI:** a clear statement under the button (not a mandatory checkbox).
- **Placement:** all four surfaces — end of each Journal post, Journal index,
  site-wide footer, homepage band, and a dedicated `/subscribe` page.

## Architecture

### 1. Reusable component — `NewsletterSignup.astro`

One Astro component, dropped into every surface. Props:

- `variant`: `'compact'` (single-line email + button — footer) or `'feature'`
  (heading + subtext + field — homepage band, Journal, `/subscribe`).
- `source`: string identifying the placement (`'footer'`, `'homepage'`,
  `'journal:{slug}'`, `'journal-index'`, `'subscribe-page'`). Sent to the backend
  and stored so MailerLite shows where each subscriber signed up.
- Optional `heading` / `subtext` overrides for the `feature` variant.

Styled in the existing Playfair/Jost + cream/stone/brass design vocabulary.

**Progressive enhancement:** it renders a real `<form method="POST"
action="/api/subscribe">`. A small inline vanilla `<script>` intercepts submit,
POSTs via `fetch`, and swaps in inline success/error states. With JS disabled or
broken, the native POST still works and the function redirects to
`/subscribe/thanks`. No React island (avoids hydrating React site-wide via the
footer); zero third-party JS.

Hidden fields: `source`, plus a **honeypot** field (e.g. `company`) that real
users never see and never fill.

### 2. Backend — `functions/api/subscribe.ts` (Cloudflare Pages Function)

Mirrors the existing `functions/api/lemonsqueezy-webhook.ts` conventions.

Flow:
1. Accept `POST` only (405 otherwise). Parse form-encoded or JSON body.
2. **Honeypot check** — if the honeypot field is non-empty, return a
   success-shaped response (200) but do nothing (don't tip off bots).
3. **Validate** `email` (basic RFC-ish check). Invalid → 400 with a message.
4. **Light rate-limit** per IP (best-effort; see Open Questions).
5. Call MailerLite: `POST https://connect.mailerlite.com/api/subscribers`
   with `Authorization: Bearer ${MAILERLITE_API_KEY}` and body:
   ```json
   {
     "email": "<email>",
     "groups": ["${ATELIER_GROUP_ID}"],
     "status": "unconfirmed",
     "fields": { "source": "<source>" }
   }
   ```
   `status: unconfirmed` is the double-opt-in lever. `201` = new, `200` = existing
   (non-destructive upsert — safe for re-signups), `422` = invalid.
6. Return `{ ok: true }` (JSON path) or `302 → /subscribe/thanks` (no-JS path),
   keyed off the `Accept` header or an `x-requested-with`-style flag.

**Never reveal** whether an email was already subscribed (privacy) — treat 200
and 201 identically as success.

### 3. Pages — `/subscribe` and `/subscribe/thanks`

- `pages/subscribe.astro` — standalone page with the `feature` component; a clean
  link target for social bios and share links.
- `pages/subscribe/thanks.astro` — "Check your inbox to confirm" page; the no-JS
  redirect target and the message the JS path mirrors inline.

### 4. Placement wiring

- `components/Footer.astro` → `compact` variant, `source="footer"`.
- `pages/index.astro` → `feature` band, `source="homepage"`.
- `pages/journal/[slug].astro` → `feature` after article body,
  `source="journal:{slug}"`.
- `pages/journal/index.astro` → `feature`, `source="journal-index"`.
- `pages/subscribe.astro` → `feature`, `source="subscribe-page"`.

## Consent & compliance (UK PECR / UK GDPR)

- **Double opt-in**: only confirmed subscribers are ever emailed; the confirmation
  step is the record of consent.
- **Consent statement** under the button, e.g.: *"Subscribe to the Atelier letter
  — occasional essays and updates. Unsubscribe anytime. See our Privacy Policy."*
  with a link to `/legal/privacy`. (Clear affirmative action + clear purpose =
  valid consent; no pre-ticked boxes.)
- **Privacy policy update** (`privacy.mdx`): add **MailerLite** (MailerLite Limited)
  to the sub-processor list as our email-marketing provider, and a short
  "Newsletter" note (consent basis, unsubscribe, double opt-in). Consistent with
  the existing line "we do not use your data for marketing emails unless you
  explicitly opt in."
- **No cookie-banner impact**: the form sets no cookies and loads no third-party
  script, so the site's current no-banner position holds.

## Anti-spam

- Honeypot hidden field (primary; keeps zero third-party JS — no CAPTCHA).
- Best-effort per-IP rate limiting in the function.
- Basic email-format validation before hitting MailerLite.

## Configuration / secrets

- `MAILERLITE_API_KEY` — Cloudflare Pages secret (Production + Preview).
- `ATELIER_GROUP_ID` — the MailerLite group ID (env var; not secret but kept in
  config for parity).
- Manual MailerLite setup (documented in the plan): create the "Atelier" group,
  create an API token, **enable double opt-in** in account settings, and set the
  confirmation email + sender identity/branding.

## Error handling

| Case | Behaviour |
|------|-----------|
| Honeypot filled | 200 success-shaped, silently dropped |
| Invalid email | 400 + inline message |
| MailerLite 422 | 400 + inline "check your email address" |
| MailerLite 5xx / network | 502 + "something went wrong, try again" |
| Already subscribed (200) | Treated as success, no disclosure |
| Missing env secret | 500, logged server-side |

## Testing

- Vitest unit tests for `subscribe.ts` mirroring `tests/functions/`: valid email
  path (MailerLite mocked), honeypot drop, invalid email, MailerLite error paths,
  method-not-allowed, and the no-JS redirect vs JSON response branch.

## Open questions / verification during implementation

1. **Double-opt-in email auto-send:** MailerLite's API docs don't state whether an
   API-added `unconfirmed` subscriber automatically receives the confirmation
   email, or whether that depends on the account double-opt-in setting. Verify
   with a live test after enabling double opt-in; if it does not auto-send,
   determine the correct trigger (account setting vs. a MailerLite automation).
2. **Exact MailerLite base-field for `source`:** confirm whether a custom field
   must be pre-created in MailerLite before it accepts `fields.source`.
3. **Rate-limit mechanism:** Cloudflare Pages Functions are stateless; decide
   between a lightweight KV-based counter or relying on Cloudflare's platform
   protections + honeypot only (may defer KV to keep v1 simple).
