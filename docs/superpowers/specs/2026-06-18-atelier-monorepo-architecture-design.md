# Atelier — Monorepo & Marketing Site Architecture

**Date:** 2026-06-18
**Status:** Design — awaiting user approval before implementation
**Scope:** Restructure `Talastron/atelier-website` into a pnpm monorepo (`Talastron/atelier`), scaffold the marketing site in Astro, prepare structure for absorbing the existing `billiesherwood/digital-wardrobe` app in a later phase.

---

## 1. Goals

1. Stand up a production marketing site at `myatelier.style` that sells a paid subscription to the Atelier app.
2. Establish a single monorepo (`Talastron/atelier`) that will house both the marketing site (`apps/marketing`) and the existing wardrobe app (`apps/studio`), sharing a design system as workspace packages (`packages/design-tokens`, `packages/ui`).
3. Migrate the app from `billiesherwood/digital-wardrobe` into the monorepo at a time chosen by the user (Phase 2), with zero impact on running app data and customer access.
4. Preserve design coherence between the marketing site and the app via shared CSS-variable tokens and React components, so a single design change propagates to both surfaces atomically.

## 2. Non-goals

- **Migrating the app's data off Firebase.** Firestore, Firebase Auth, and Firebase Storage remain the production data layer indefinitely. The Cloudflare consolidation applies only to hosting, DNS, and the marketing/commerce surface.
- **Building a freemium tier or multi-tier pricing at launch.** Single paid tier with monthly + annual cadences.
- **Building a physical-goods storefront, consultation booking, or any other commerce surface beyond the app subscription at launch.** Architecture leaves room for these but does not implement them.
- **Automating app deploys in Phase 1.** Existing manual `firebase deploy` workflow continues until the user opts to add CI.

## 3. High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare (DNS for myatelier.style zone)                  │
├─────────────────────────────────────────────────────────────┤
│  myatelier.style          ──CNAME──▶ Cloudflare Pages       │
│  www.myatelier.style      ──301──▶  myatelier.style         │
│  edit.myatelier.style     ──CNAME──▶ Firebase Hosting       │
└─────────────────────────────────────────────────────────────┘
         │                                       │
         ▼                                       ▼
┌──────────────────────┐              ┌────────────────────────┐
│  apps/marketing      │              │  apps/studio           │
│  Astro + React       │              │  Vite + React          │
│  Cloudflare Pages    │              │  Firebase Hosting      │
│  Pages Function      │              │  Firestore / Auth /    │
│  (LS webhook)        │  ─sign-in──▶ │  Storage / rules       │
└──────────────────────┘              └────────────────────────┘
         │
         ▼
   Lemon Squeezy (Merchant of Record)
```

### DNS records (Cloudflare)

| Record | Type | Target | Proxy mode |
|---|---|---|---|
| `@` (apex) | CNAME | `atelier.pages.dev` | Proxied (orange) |
| `www` | CNAME | `myatelier.style` | Proxied (orange) |
| `edit` | CNAME | `<firebase-target>.web.app` | **DNS-only (grey)** |

The `edit.` record must be DNS-only — proxying it through Cloudflare's edge would break Firebase Hosting's automatic SSL provisioning. The apex is proxied to benefit from Cloudflare's CDN/WAF.

## 4. Monorepo structure

```
Talastron/atelier/
├── apps/
│   ├── marketing/                ← Astro + React islands, Cloudflare Pages
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── styles/
│   │   ├── functions/
│   │   │   └── api/
│   │   │       └── lemonsqueezy-webhook.ts   ← Pages Function
│   │   ├── public/
│   │   └── package.json
│   │
│   └── studio/                   ← (arrives in Phase 2) wardrobe app
│       ├── src/
│       ├── firebase.json
│       └── package.json
│
├── packages/
│   ├── design-tokens/            ← single source of truth for design
│   │   ├── colors.css
│   │   ├── type.css
│   │   ├── space.css
│   │   ├── tokens.js             ← same values exposed as JS exports
│   │   └── package.json
│   │
│   └── ui/                       ← shared React components
│       ├── AtelierMark.jsx
│       ├── BrassRule.jsx
│       ├── EditorialHeader.jsx
│       ├── FeatureCard.jsx
│       └── package.json
│
├── docs/
│   └── superpowers/
│       └── specs/
│           └── 2026-06-18-atelier-monorepo-architecture-design.md  (this doc)
│
├── pnpm-workspace.yaml
├── package.json
├── .gitignore
└── README.md
```

### Tooling

- **Package manager:** pnpm 9+, workspaces.
- **Workspace protocol:** `"@atelier/design-tokens": "workspace:*"` — apps consume packages via symlink, no publishing.
- **TypeScript:** optional, project-by-project. The marketing site can start as plain JSX; the webhook handler should be TypeScript for runtime-shape safety.
- **Linting/formatting:** prettier at the root, eslint per app.

## 5. Marketing site — `apps/marketing`

### Stack

- **Astro 5+** with the official React integration. Static-first; renders pages to HTML at build time; ships zero JavaScript by default. React components become "islands" — interactive only where explicitly hydrated.
- **Tailwind v4** via `@tailwindcss/vite` plugin (configless, theme declared via `@theme` blocks in CSS).
- **MDX support** enabled for journal/editorial pages.

### Page inventory (V1)

| Route | Purpose | Content type |
|---|---|---|
| `/` | Hero landing, features, philosophy, primary CTA | Astro page with React islands |
| `/about` | Brand story, manifesto, founder voice | Astro page (mostly static prose) |
| `/journal` | Index of editorial posts | Astro page listing MDX entries |
| `/journal/[slug]` | Individual journal post | MDX |
| `/pricing` | Tier, FAQ, "Start your trial" CTA → Lemon Squeezy | Astro page with React island for the checkout button |
| `/welcome` | Post-checkout success page; tells user to check email for the magic link | Astro page |
| `/legal/terms`, `/legal/privacy` | Boilerplate | MDX |
| `404` | Branded error page | Astro |

### Design tokens & component vocabulary (extracted from existing draft)

The existing `App.jsx` draft (committed at `Talastron/atelier-website@24059a6`) is treated as the moodboard / source of truth for V1 design decisions. The following are extracted into shared packages:

**Colors** (→ `packages/design-tokens/colors.css`):
- `--atelier-cream: #F7F5F2` (background)
- `--atelier-ink: #1c1917` (text, dark surfaces)
- `--atelier-brass-300: #D4B378` (primary accent)
- `--atelier-brass-200: #E2C896` (selection / hover)
- `--atelier-brass-600: #A8884C` (icon accent)
- `--atelier-stone-{500,400,200}: ...` (greys)

**Typography** (→ `packages/design-tokens/type.css`):
- Display: `'Playfair Display', serif` — weights 400/500/600 + italic 400
- Sans: `'Jost', sans-serif` — weights 300/400/500/600
- Loaded via Google Fonts `<link>` in the document head, not inline in components.

**Spacing rhythm** (→ `packages/design-tokens/space.css`):
- Container max-width: `1280px` (modest upgrade from current `max-w-6xl` 1152px)
- Horizontal page padding: `clamp(1.5rem, 4vw, 3rem)`
- Vertical section padding: `clamp(4rem, 8vw, 8rem)`
- Editorial prose max-width: `65ch`
- Display line-height: `1.05–1.15`
- Body line-height: `1.65–1.75`
- 8px baseline grid

**Components** (→ `packages/ui`):
- `AtelierMark` — SVG logomark (clothes-hanger silhouette with brass pendant)
- `BrassRule` — 24×1.5px decorative divider (the `brass-rule` motif)
- `EditorialHeader` — eyebrow + display heading + subtitle composition
- `FeatureCard` — icon + title + description card with hover lift
- `PrimaryCTA`, `SecondaryCTA` — buttons matching the dark-pill / brass-pill styles in the existing draft

### Adjustments from the existing draft

The current `App.jsx` is treated as a draft and the following changes are applied during the port:

1. **Subdomain references**: all `https://app.myatelier.style` URLs become `https://edit.myatelier.style`.
2. **URL constant**: hardcoded URLs replaced with `EDIT_URL` exported from a shared `apps/marketing/src/config.ts`.
3. **Brass palette declared**: Tailwind v4 `@theme` block in `apps/marketing/src/styles/global.css` declares the brass scale so `bg-brass-300` etc. render correctly (currently silently missing).
4. **Inline Google Fonts `<style>` tag moved** out of the JSX and into the document `<head>` for performance.
5. **Vertical rhythm increased** — section padding from `py-24` to `clamp(4rem, 8vw, 8rem)` for the quieter, more luxurious pace.
6. **Wordmark consistency** — the marketing site uses "Atelier." as the wordmark; the URL is `myatelier.style`. This intentional asymmetry is preserved (the brand voice is "Atelier"; the domain reflects the casual possessive).

## 6. Commerce flow

### Commercial model

- **Single paid tier**, monthly + annual cadences (annual ~20% discount).
- **14-day free trial, no credit card required**.
- **30-day no-questions-asked refund policy**.
- **Pricing TBD** — placeholder during build; final number is a marketing-page copy decision, not architectural.

### Payment provider

**Lemon Squeezy** as Merchant of Record. Rationale:
- Solo founder selling internationally → tax/VAT compliance burden eliminated.
- Lemon Squeezy handles VAT collection, filing, invoicing, refunds, and chargebacks in every jurisdiction.
- Fee (~5% + $0.50/txn) is paid in exchange for zero compliance work — a clear win at pre-revenue / early-revenue scale.
- Stripe ownership of Lemon Squeezy (2024) ensures long-term viability.
- Does not preclude using other payment methods for future product types (Stripe direct for consulting/B2B, Shopify for physical goods, etc.) — each marketing-site checkout surface can route to a different provider independently.

### Auth handoff

**Email magic link (Firebase Auth `sendSignInLinkToEmail`).**

End-to-end flow:

```
Customer        myatelier.style       Lemon Squeezy        Pages Function           Firebase
   │                  │                     │                       │                    │
   ├─ Click "Start trial" ───>              │                       │                    │
   │                  ├─ redirect to LS ──> │                       │                    │
   │                  │                     │                       │                    │
   ├─ Enter email + start trial ─────────> │                       │                    │
   │                  │                     │                       │                    │
   │                  │                     ├─ webhook (subscription_created) ─> │       │
   │                  │                     │                       ├─ verify HMAC       │
   │                  │                     │                       ├─ createUser ─────> │
   │                  │                     │                       ├─ write subscription>│
   │                  │                     │                       ├─ sendSignInLink ──>│
   │                  │                     │                       │                    │
   ├─ Redirect to myatelier.style/welcome  │                       │                    │
   │  ("check your email")                  │                       │                    │
   │                                                                                     │
   ├<─ Email with magic link ──────────────────────────────────────────────────────────  │
   │                                                                                     │
   ├─ Click link ─> edit.myatelier.style/auth?... ─────────────────────────────────────  │
   │                                                                                     │
   │                 app calls signInWithEmailLink() ────────────────────────────────── ▶│
   │                 user is signed in, subscription state checked from Firestore       │
```

The magic-link approach is chosen over instant custom-token redirect because:
- It is recoverable (customer can close the success page; the email is the persistent key).
- It is cross-device friendly (pay on phone, sign in on laptop).
- It avoids token-in-URL security mitigations the custom-token approach requires.
- "Check your inbox for the key to your atelier" reads as on-brand (an arrival, not a click-through).

A future upgrade to **Option 3 (instant redirect + email backup)** is a single webhook-handler change and may be considered if customers ever request it.

### Subscription state model (Firestore)

```
users/{uid}
  email
  displayName
  createdAt

subscriptions/{lemonsqueezy_subscription_id}
  userId
  email
  status            ← active | cancelled | expired | past_due | paused
  productId
  variantId         ← monthly vs annual
  currentPeriodEnd  ← timestamp; drives access gating
  cancelledAt       ← nullable
  createdAt
  updatedAt

processed_webhook_events/{event_id}
  receivedAt        ← idempotency record
```

**Lemon Squeezy is the source of truth for subscription state.** The Firestore subscription documents are a cache that webhooks keep up to date. A reconciliation script (queries LS API, rewrites Firestore mirror) is the fallback for any missed webhook.

The app gates access with: `subscription.status === 'active' OR (subscription.status === 'cancelled' AND subscription.currentPeriodEnd > now)` — standard subscription-lifecycle handling.

### Webhook handler — `apps/marketing/functions/api/lemonsqueezy-webhook.ts`

A Cloudflare Pages Function. Responsibilities:
1. Verify HMAC signature on every webhook against `LEMONSQUEEZY_WEBHOOK_SECRET`. Reject non-2xx if signature mismatch.
2. Check idempotency: if `event_id` already in `processed_webhook_events`, return 200 immediately.
3. Switch on event type:
   - `subscription_created` → create Firebase Auth user (or find existing by email), write subscription doc, send magic link.
   - `subscription_updated` → update status + `currentPeriodEnd`.
   - `subscription_cancelled` → mark cancelled (preserve access until period end).
   - `subscription_resumed` → status → active.
   - `subscription_expired`, `subscription_payment_failed` → flag, possibly notify customer.
4. Write `event_id` to `processed_webhook_events`.
5. Return 200 promptly. Heavy work (e.g., email sending) can be deferred via `event.waitUntil()`.

## 7. Deployment & CI

### Marketing site + webhook (one deploy)

- **Trigger:** push to `main` (production) or any branch (preview).
- **Tool:** Cloudflare Pages built-in GitHub integration.
- **Build command:** `pnpm install && pnpm --filter marketing build`
- **Build output:** `apps/marketing/dist`
- **Root directory:** repo root (`/`)
- **Preview deploys:** automatic per-PR at `<branch>.atelier.pages.dev`.

### App — Phase 1 (no change from today)

- Manual `pnpm deploy:studio` from the user's laptop.
- Lives in `apps/studio/` (after Phase 2 migration) or its current location (before).

### App — Phase 2+ (optional CI)

- GitHub Action on push to `main` touching `apps/studio/**`.
- Runs `firebase deploy --only hosting` with `FIREBASE_TOKEN` from GitHub secrets.
- Not required for V1.

### Secrets

| Secret | Stored in | Purpose |
|---|---|---|
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Cloudflare Pages env vars (encrypted) | HMAC verification |
| `LEMONSQUEEZY_API_KEY` | Cloudflare Pages env vars (encrypted) | Reconciliation scripts; admin actions |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT` | Cloudflare Pages env vars (encrypted, JSON) | Pages Function uses Firebase Admin SDK |
| `FIREBASE_PROJECT_ID` | Cloudflare Pages env vars | Configuration |
| Firebase client SDK config | App source code (public per Firebase model) | Standard practice |
| `FIREBASE_TOKEN` (Phase 2 only) | GitHub Actions secrets | CI deploys |

Production and preview environments scoped separately. Preview points at Lemon Squeezy test mode; production points at LS live mode.

### Local development

```bash
pnpm dev                       # marketing + (later) studio in parallel
pnpm --filter marketing dev    # marketing only, includes Pages Functions
```

Wrangler runs Pages Functions automatically at `http://localhost:4321/api/*`. Testing webhooks locally uses Lemon Squeezy test mode + a cloudflared/ngrok tunnel.

## 8. Phased migration plan

### Phase 1 — Marketing repo restructure (executed immediately, zero impact on app)

1. Rename `Talastron/atelier-website` → `Talastron/atelier` on GitHub (auto-redirects preserved).
2. Locally restructure existing files into `apps/marketing/`.
3. Initialize pnpm workspace (`pnpm-workspace.yaml`, root `package.json`).
4. Create `packages/design-tokens/` with extracted color/type/space tokens.
5. Create `packages/ui/` with extracted components (`AtelierMark`, `BrassRule`, `EditorialHeader`, `FeatureCard`).
6. Scaffold Astro 5 in `apps/marketing/`, port the existing landing page to Astro pages + React islands consuming the shared packages.
7. Add scaffolding pages: `/about`, `/journal` (index + first MDX entry), `/pricing`, `/welcome`, `/legal/*`.
8. Apply design adjustments: subdomain refs → `edit.`, brass palette declaration, vertical rhythm upgrade, URL constants.
9. Wire Cloudflare Pages deploy (GitHub integration, build settings, env vars).
10. Implement `lemonsqueezy-webhook.ts` Pages Function (HMAC verify, idempotency, Firebase Admin SDK provisioning, magic link send).
11. Set up Lemon Squeezy product + webhook pointed at `myatelier.style/api/lemonsqueezy-webhook` (test mode initially).
12. End-to-end test in test mode: subscribe → receive email → land in app signed in.
13. Switch Lemon Squeezy to live mode; publish.

**Result:** live marketing site at `myatelier.style`; functional commerce; monorepo structurally ready for `apps/studio/`.

### Phase 2 — Absorb the app (executed when the user signals a stable break in app development)

1. From the new monorepo: `git remote add wardrobe-source git@github.com-personal:billiesherwood/digital-wardrobe.git`
2. `git subtree add --prefix=apps/studio wardrobe-source main` — preserves full commit history.
3. Update `apps/studio/package.json` to add `"@atelier/design-tokens": "workspace:*"` and `"@atelier/ui": "workspace:*"`.
4. Point the app's Tailwind config at `@atelier/design-tokens` (via `@theme` import).
5. Replace the app's local `AtelierMark` (if present) with the shared `@atelier/ui` version.
6. Test `pnpm deploy:studio` from the new location → confirm app at `edit.myatelier.style` deploys identically.
7. On GitHub: archive `billiesherwood/digital-wardrobe` with a README pointing to `Talastron/atelier`.
8. Update local SSH config / git remote URL on user's working machines.

**Result:** full monorepo, both surfaces consuming shared design system, single CI surface. App data and user access unaffected throughout.

### What does *not* change in Phase 2

- Firestore project, Firebase Auth users, Firebase Storage files — untouched.
- Firebase Hosting project, custom domain, SSL — untouched.
- Customer URLs (`edit.myatelier.style`) — unchanged.
- App functionality — unchanged (the source of `apps/studio/` is byte-identical to the prior repo, just in a new location).

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Webhook signature verification mistake → forged subscriptions | Verify HMAC on every webhook; never disable in dev; use Lemon Squeezy test mode |
| Missed webhook → user pays but no account provisioned | LS retries failed webhooks; reconciliation script can rebuild from LS API; customer can re-trigger via support |
| Magic link email delayed / lost | Standard Firebase Auth flow; customer can request resend from `/welcome` page (V1.1) |
| Token-in-URL leak (if Option 3 adopted later) | Short TTL, single-use enforcement, HttpOnly cookie exchange |
| Tailwind brass classes silently missing | Declare via `@theme` block in `apps/marketing/src/styles/global.css`; visual QA pre-launch |
| Phase 2 migration interrupts app development | Phase 2 only runs when user signals readiness; nothing about Phase 1 forces Phase 2 timing |
| Cloudflare Pages build fails on monorepo install | pnpm workspace support is first-class in Pages; build command explicitly uses `pnpm --filter` |
| Customer pays, mistypes email | LS captures email at checkout; magic link goes to that email; customer-support recovery via LS dashboard + Firebase Auth admin |

## 10. Open questions deferred to implementation

- Exact pricing (monthly + annual numbers) — copy decision, settle pre-launch.
- Brand wordmark final treatment — current draft uses "Atelier." with a period; revisit during design pass.
- Journal post #1 content — copywriting task, separate from architecture.
- Whether to add an instant-redirect (Option 3) auth handoff — gated on customer feedback post-launch.
- Whether to enable Firebase Hosting preview channels for the app — quality-of-life upgrade, not architectural.

## 11. Confirmed decisions (summary)

| Decision | Value |
|---|---|
| Marketing site subdomain | `myatelier.style` apex + `www.` redirect |
| App subdomain | `edit.myatelier.style` |
| Marketing site framework | Astro 5 + React islands |
| App framework | unchanged (Vite + React + Firebase) |
| Repo strategy | Monorepo at `Talastron/atelier` (renamed from `atelier-website`) |
| Package manager | pnpm 9+ workspaces |
| Design system delivery | `packages/design-tokens` (CSS variables + JS exports) + `packages/ui` (React components) |
| Marketing host | Cloudflare Pages |
| App host | Firebase Hosting (unchanged) |
| DNS | Cloudflare (proxied for apex/www, DNS-only for `edit.`) |
| Commercial model | Single paid tier, monthly + annual, 14-day no-card trial, 30-day refund |
| Payment provider | Lemon Squeezy (Merchant of Record) |
| Auth handoff | Magic link via Firebase Auth `sendSignInLinkToEmail` |
| Subscription source of truth | Lemon Squeezy; Firestore is a cache |
| Webhook handler location | Cloudflare Pages Function (`apps/marketing/functions/api/lemonsqueezy-webhook.ts`) |
| App migration | Phase 2, on user's timing, via `git subtree add` (preserves history) |
| Phase 1 CI | Auto-deploy marketing on push to main; app stays manual |
