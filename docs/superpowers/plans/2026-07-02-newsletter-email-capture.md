# Newsletter / Email Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture consented emails from four site surfaces into a MailerLite group via a server-side Cloudflare Pages Function, with double opt-in and zero third-party JS.

**Architecture:** A reusable Astro component POSTs (progressively enhanced with `fetch`) to a new Pages Function `functions/api/subscribe.ts`, which calls the MailerLite API to add the subscriber to the "Atelier" group as `unconfirmed` (double opt-in). A thin `functions/lib/mailerlite.ts` isolates the network call for testing, mirroring the existing `lemonsqueezy-webhook` pattern.

**Tech Stack:** Astro + Cloudflare Pages Functions (TypeScript), MailerLite API (`connect.mailerlite.com`), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-02-newsletter-email-capture-design.md`

---

## File Structure

- **Create** `functions/lib/mailerlite.ts` — thin MailerLite API client (`addSubscriberToGroup`).
- **Create** `functions/api/subscribe.ts` — the `/api/subscribe` Pages Function handler.
- **Create** `tests/functions/lib/mailerlite.test.ts` — unit tests for the client.
- **Create** `tests/functions/api/subscribe.test.ts` — unit tests for the handler.
- **Create** `apps/marketing/src/components/NewsletterSignup.astro` — reusable form.
- **Create** `apps/marketing/src/pages/subscribe.astro` — standalone signup page.
- **Create** `apps/marketing/src/pages/subscribe/thanks.astro` — confirmation/no-JS target.
- **Modify** `apps/marketing/src/components/Footer.astro` — add `compact` signup.
- **Modify** `apps/marketing/src/pages/index.astro` — add `feature` signup band.
- **Modify** `apps/marketing/src/pages/journal/[slug].astro` — signup after article.
- **Modify** `apps/marketing/src/pages/journal/index.astro` — signup on the index.
- **Modify** `apps/marketing/src/pages/legal/privacy.mdx` — MailerLite + newsletter note.

**Conventions confirmed from the codebase:**
- Pages Functions export `onRequestPost(context: { request, env })` and return `new Response(...)`.
- `Env` is a TS interface of the env vars the function needs.
- Tests use Vitest, mock `@functions/lib/*` with `vi.mock(...)`, import the handler from `@functions/api/...`, and call `onRequestPost({ request, env } as any)`.
- The repo-root `functions/` directory is the Cloudflare Pages functions dir (that's where `lemonsqueezy-webhook.ts` lives and works).

---

## Task 1: MailerLite API client

**Files:**
- Create: `functions/lib/mailerlite.ts`
- Test: `tests/functions/lib/mailerlite.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/functions/lib/mailerlite.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { addSubscriberToGroup } from '@functions/lib/mailerlite.ts';

describe('addSubscriberToGroup', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('POSTs email as unconfirmed to the group with bearer auth', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 201 }),
    );
    const result = await addSubscriberToGroup('key_abc', 'grp_1', 'a@b.com', 'footer');

    expect(result).toEqual({ ok: true, status: 201 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://connect.mailerlite.com/api/subscribers');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer key_abc');
    const body = JSON.parse(init!.body as string);
    expect(body).toEqual({
      email: 'a@b.com',
      status: 'unconfirmed',
      groups: ['grp_1'],
      fields: { source: 'footer' },
    });
  });

  it('treats 200 (existing subscriber) as success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    expect(await addSubscriberToGroup('k', 'g', 'a@b.com', 's')).toEqual({ ok: true, status: 200 });
  });

  it('returns ok:false on 422 (invalid data)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 422 }));
    expect(await addSubscriberToGroup('k', 'g', 'bad', 's')).toEqual({ ok: false, status: 422 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/functions/lib/mailerlite.test.ts`
Expected: FAIL — cannot resolve `@functions/lib/mailerlite.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// functions/lib/mailerlite.ts
// Thin MailerLite API client. Isolated so the Pages Function stays thin and the
// network call is trivially mockable in tests (same pattern as functions/lib/*).

const MAILERLITE_SUBSCRIBERS_URL = 'https://connect.mailerlite.com/api/subscribers';

export interface AddSubscriberResult {
  ok: boolean;
  status: number;
}

/**
 * Add (or upsert) an email into a MailerLite group as `unconfirmed`, which is
 * the lever for double opt-in. 200 = existing subscriber updated, 201 = created;
 * both are success. 422 = invalid data. Anything else = upstream/config error.
 */
export async function addSubscriberToGroup(
  apiKey: string,
  groupId: string,
  email: string,
  source: string,
): Promise<AddSubscriberResult> {
  const res = await fetch(MAILERLITE_SUBSCRIBERS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      email,
      status: 'unconfirmed',
      groups: [groupId],
      fields: { source },
    }),
  });

  return { ok: res.status === 200 || res.status === 201, status: res.status };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/functions/lib/mailerlite.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/lib/mailerlite.ts tests/functions/lib/mailerlite.test.ts
git commit -m "feat(functions): MailerLite API client for double-opt-in subscribe"
```

---

## Task 2: `/api/subscribe` Pages Function

**Files:**
- Create: `functions/api/subscribe.ts`
- Test: `tests/functions/api/subscribe.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/functions/api/subscribe.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@functions/lib/mailerlite.ts', () => ({
  addSubscriberToGroup: vi.fn().mockResolvedValue({ ok: true, status: 201 }),
}));

import { onRequestPost } from '@functions/api/subscribe.ts';
import { addSubscriberToGroup } from '@functions/lib/mailerlite.ts';

const ENV = { MAILERLITE_API_KEY: 'key', ATELIER_GROUP_ID: 'grp_1' };

function jsonReq(body: object): Request {
  return new Request('https://example.com/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'fetch' },
    body: JSON.stringify(body),
  });
}
function formReq(fields: Record<string, string>): Request {
  const fd = new URLSearchParams(fields);
  return new Request('https://example.com/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: fd.toString(),
  });
}

describe('subscribe onRequestPost', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('valid JSON: adds subscriber and returns 200 ok', async () => {
    const res = await onRequestPost({ request: jsonReq({ email: 'a@b.com', source: 'footer' }), env: ENV } as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
    expect(addSubscriberToGroup).toHaveBeenCalledWith('key', 'grp_1', 'a@b.com', 'footer');
  });

  it('honeypot filled: returns 200 but does NOT call MailerLite', async () => {
    const res = await onRequestPost({ request: jsonReq({ email: 'a@b.com', source: 'footer', company: 'bot' }), env: ENV } as any);
    expect(res.status).toBe(200);
    expect(addSubscriberToGroup).not.toHaveBeenCalled();
  });

  it('invalid email: 400 and no MailerLite call', async () => {
    const res = await onRequestPost({ request: jsonReq({ email: 'nope', source: 'footer' }), env: ENV } as any);
    expect(res.status).toBe(400);
    expect(addSubscriberToGroup).not.toHaveBeenCalled();
  });

  it('MailerLite 422: returns 400', async () => {
    (addSubscriberToGroup as any).mockResolvedValueOnce({ ok: false, status: 422 });
    const res = await onRequestPost({ request: jsonReq({ email: 'a@b.com', source: 'x' }), env: ENV } as any);
    expect(res.status).toBe(400);
  });

  it('MailerLite 500: returns 502', async () => {
    (addSubscriberToGroup as any).mockResolvedValueOnce({ ok: false, status: 500 });
    const res = await onRequestPost({ request: jsonReq({ email: 'a@b.com', source: 'x' }), env: ENV } as any);
    expect(res.status).toBe(502);
  });

  it('no-JS form POST: 303 redirect to /subscribe/thanks on success', async () => {
    const res = await onRequestPost({ request: formReq({ email: 'a@b.com', source: 'footer' }), env: ENV } as any);
    expect(res.status).toBe(303);
    expect(res.headers.get('Location')).toBe('/subscribe/thanks');
  });

  it('missing env secret: returns 500', async () => {
    const res = await onRequestPost({ request: jsonReq({ email: 'a@b.com', source: 'x' }), env: {} as any } as any);
    expect(res.status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/functions/api/subscribe.test.ts`
Expected: FAIL — cannot resolve `@functions/api/subscribe.ts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// functions/api/subscribe.ts
import { addSubscriberToGroup } from '../lib/mailerlite.ts';

interface Env {
  MAILERLITE_API_KEY: string;
  ATELIER_GROUP_ID: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function wantsJson(request: Request): boolean {
  const accept = request.headers.get('Accept') || '';
  return accept.includes('application/json') || request.headers.get('X-Requested-With') === 'fetch';
}

function respond(request: Request, ok: boolean, status: number, message: string): Response {
  if (wantsJson(request)) {
    return new Response(JSON.stringify({ ok, message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // No-JS path: 303 so the browser issues a GET to the target.
  const location = ok ? '/subscribe/thanks' : '/subscribe?error=1';
  return new Response(null, { status: 303, headers: { Location: location } });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  let email = '';
  let source = 'unknown';
  let honeypot = '';
  const contentType = request.headers.get('Content-Type') || '';
  try {
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as Record<string, unknown>;
      email = String(body.email ?? '').trim();
      source = String(body.source ?? 'unknown');
      honeypot = String(body.company ?? '');
    } else {
      const form = await request.formData();
      email = String(form.get('email') ?? '').trim();
      source = String(form.get('source') ?? 'unknown');
      honeypot = String(form.get('company') ?? '');
    }
  } catch {
    return respond(request, false, 400, 'Invalid request.');
  }

  // Honeypot: real users never fill the hidden `company` field. Silently accept.
  if (honeypot) {
    return respond(request, true, 200, 'Thanks — check your inbox to confirm.');
  }

  if (!EMAIL_RE.test(email)) {
    return respond(request, false, 400, 'Please enter a valid email address.');
  }

  if (!env.MAILERLITE_API_KEY || !env.ATELIER_GROUP_ID) {
    console.error('[subscribe] missing MAILERLITE_API_KEY or ATELIER_GROUP_ID');
    return respond(request, false, 500, 'Something went wrong. Please try again later.');
  }

  let result;
  try {
    result = await addSubscriberToGroup(env.MAILERLITE_API_KEY, env.ATELIER_GROUP_ID, email, source);
  } catch (err: any) {
    console.error(`[subscribe] MailerLite request failed: ${err?.message || err}`);
    return respond(request, false, 502, 'Something went wrong. Please try again.');
  }

  if (result.ok) {
    console.log(`[subscribe] ok source=${source} status=${result.status}`);
    return respond(request, true, 200, 'Thanks — check your inbox to confirm your subscription.');
  }
  if (result.status === 422) {
    return respond(request, false, 400, 'Please check your email address.');
  }
  console.error(`[subscribe] MailerLite returned ${result.status}`);
  return respond(request, false, 502, 'Something went wrong. Please try again.');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/functions/api/subscribe.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/api/subscribe.ts tests/functions/api/subscribe.test.ts
git commit -m "feat(functions): /api/subscribe endpoint (honeypot, validation, no-JS redirect)"
```

---

## Task 3: Reusable `NewsletterSignup.astro` component

**Files:**
- Create: `apps/marketing/src/components/NewsletterSignup.astro`

(No unit test — Astro components are verified via build + manual render. TDD does not apply to `.astro` markup here.)

- [ ] **Step 1: Create the component**

```astro
---
// apps/marketing/src/components/NewsletterSignup.astro
// Reusable email capture. Renders a real POST form to /api/subscribe (works
// without JS → function 303-redirects to /subscribe/thanks). A small inline
// script enhances it with fetch + inline status. No third-party JS, no cookies.
interface Props {
  variant?: 'compact' | 'feature';
  source: string;
  heading?: string;
  subtext?: string;
}
const {
  variant = 'feature',
  source,
  heading = 'The Atelier letter',
  subtext = 'Occasional essays on dressing well from what you already own. No noise, unsubscribe anytime.',
} = Astro.props;
const fieldId = `email-${source.replace(/[^a-z0-9]+/gi, '-')}`;
---
<form class:list={['atelier-signup', `atelier-signup--${variant}`]} data-signup method="POST" action="/api/subscribe">
  <input type="hidden" name="source" value={source} />
  {/* Honeypot — visually hidden, off-screen, not announced to AT. */}
  <div class="atelier-signup__hp" aria-hidden="true">
    <label>Company<input type="text" name="company" tabindex="-1" autocomplete="off" /></label>
  </div>

  {variant === 'feature' && (
    <div class="atelier-signup__intro">
      <h3 class="font-display">{heading}</h3>
      <p>{subtext}</p>
    </div>
  )}

  <div class="atelier-signup__row">
    <label class="sr-only" for={fieldId}>Email address</label>
    <input id={fieldId} type="email" name="email" required placeholder="you@example.com" autocomplete="email" />
    <button type="submit">Subscribe</button>
  </div>

  <p class="atelier-signup__consent">
    Occasional essays and updates. Unsubscribe anytime. See our <a href="/legal/privacy">Privacy&nbsp;Policy</a>.
  </p>
  <p class="atelier-signup__status" data-status role="status" aria-live="polite"></p>
</form>

<script>
  document.querySelectorAll('form[data-signup]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.currentTarget as HTMLFormElement;
      const status = f.querySelector('[data-status]') as HTMLElement;
      const btn = f.querySelector('button[type="submit"]') as HTMLButtonElement;
      const data = Object.fromEntries(new FormData(f).entries());
      btn.disabled = true;
      status.textContent = 'One moment…';
      try {
        const res = await fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Requested-With': 'fetch' },
          body: JSON.stringify(data),
        });
        const json = await res.json().catch(() => ({}));
        status.textContent = (res.ok && json.ok)
          ? (f.reset(), json.message || 'Thanks — check your inbox to confirm.')
          : (json.message || 'Something went wrong. Please try again.');
      } catch {
        status.textContent = 'Something went wrong. Please try again.';
      } finally {
        btn.disabled = false;
      }
    });
  });
</script>

<style>
  /* Match existing tokens (cream/stone/brass, Playfair via .font-display). Tune
     against apps/marketing/src/styles/global.css during review. */
  .atelier-signup { max-width: 34rem; }
  .atelier-signup__intro h3 { font-size: 1.5rem; color: #1c1917; margin-bottom: .25rem; }
  .atelier-signup__intro p { color: #57534e; font-size: .95rem; margin-bottom: 1rem; }
  .atelier-signup__row { display: flex; gap: .5rem; flex-wrap: wrap; }
  .atelier-signup__row input {
    flex: 1 1 12rem; padding: .75rem 1rem; border: 1px solid rgba(28,25,23,.18);
    border-radius: 999px; font-size: 16px; background: #fff;
  }
  .atelier-signup__row button {
    padding: .75rem 1.5rem; border-radius: 999px; background: #1c1917; color: #fff;
    font-weight: 500; cursor: pointer; border: 0;
  }
  .atelier-signup__row button:disabled { opacity: .5; cursor: default; }
  .atelier-signup__consent { font-size: .75rem; color: #78716c; margin-top: .5rem; }
  .atelier-signup__consent a { text-decoration: underline; }
  .atelier-signup__status { font-size: .8rem; color: #57534e; margin-top: .5rem; min-height: 1rem; }
  .atelier-signup--compact .atelier-signup__consent { display: none; } /* footer stays slim */
  .atelier-signup__hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
</style>
```

- [ ] **Step 2: Verify it builds**

Run: `pnpm --filter marketing build`
Expected: build completes with no errors (component not yet referenced — this only checks it compiles).

- [ ] **Step 3: Commit**

```bash
git add apps/marketing/src/components/NewsletterSignup.astro
git commit -m "feat(marketing): reusable NewsletterSignup component"
```

---

## Task 4: `/subscribe` and `/subscribe/thanks` pages

**Files:**
- Create: `apps/marketing/src/pages/subscribe.astro`
- Create: `apps/marketing/src/pages/subscribe/thanks.astro`

- [ ] **Step 1: Create the subscribe page**

```astro
---
// apps/marketing/src/pages/subscribe.astro
import Base from '../layouts/Base.astro';
import NewsletterSignup from '../components/NewsletterSignup.astro';
---
<Base title="Subscribe — Atelier" description="Occasional essays on dressing well from what you already own.">
  <main style="max-width: 42rem; margin: 0 auto; padding: 6rem 1.5rem;">
    <NewsletterSignup
      variant="feature"
      source="subscribe-page"
      heading="The Atelier letter"
      subtext="Essays on style, cost-per-wear, and dressing from what you already own — a few times a month, never spam."
    />
  </main>
</Base>
```

- [ ] **Step 2: Create the thanks page**

```astro
---
// apps/marketing/src/pages/subscribe/thanks.astro
import Base from '../../layouts/Base.astro';
---
<Base title="Almost there — Atelier" description="Confirm your subscription to the Atelier letter.">
  <main style="max-width: 42rem; margin: 0 auto; padding: 6rem 1.5rem; text-align: center;">
    <h1 class="font-display" style="font-size: 2rem; color: #1c1917;">Check your inbox</h1>
    <p style="color: #57534e; margin-top: 1rem;">
      We've sent you a confirmation link. Click it to complete your subscription to the Atelier letter.
    </p>
    <p style="margin-top: 2rem;"><a href="/" style="text-decoration: underline;">Back to Atelier</a></p>
  </main>
</Base>
```

- [ ] **Step 3: Verify build**

Run: `pnpm --filter marketing build`
Expected: build completes; `/subscribe` and `/subscribe/thanks` appear in the built page list.

- [ ] **Step 4: Commit**

```bash
git add apps/marketing/src/pages/subscribe.astro apps/marketing/src/pages/subscribe/thanks.astro
git commit -m "feat(marketing): /subscribe and /subscribe/thanks pages"
```

---

## Task 5: Wire the component into the four surfaces

**Files:**
- Modify: `apps/marketing/src/components/Footer.astro`
- Modify: `apps/marketing/src/pages/index.astro`
- Modify: `apps/marketing/src/pages/journal/[slug].astro`
- Modify: `apps/marketing/src/pages/journal/index.astro`

- [ ] **Step 1: Footer (compact)** — in `Footer.astro`, add to the frontmatter imports:

```astro
import NewsletterSignup from './NewsletterSignup.astro';
```

Then place, just above the statutory colophon block (the `&copy; {year}` line):

```astro
<div style="margin: 2rem 0; max-width: 24rem;">
  <NewsletterSignup variant="compact" source="footer" />
</div>
```

- [ ] **Step 2: Homepage band (feature)** — in `index.astro` frontmatter:

```astro
import NewsletterSignup from '../components/NewsletterSignup.astro';
```

Then place near the closing masthead (before `<Footer />` / the `ClosingMasthead` component), inside a section:

```astro
<section style="max-width: 42rem; margin: 4rem auto; padding: 0 1.5rem;">
  <NewsletterSignup variant="feature" source="homepage" />
</section>
```

- [ ] **Step 3: Journal post (feature)** — in `journal/[slug].astro` frontmatter:

```astro
import NewsletterSignup from '../../components/NewsletterSignup.astro';
```

Then place immediately after the rendered article body (`<Content />` / `<slot />`), before the footer:

```astro
<section style="max-width: 42rem; margin: 4rem auto 0; padding: 2rem 1.5rem 0; border-top: 1px solid rgba(28,25,23,.12);">
  <NewsletterSignup variant="feature" source={`journal:${Astro.params.slug}`} heading="Keep reading" subtext="New essays from the Atelier journal, a few times a month." />
</section>
```

- [ ] **Step 4: Journal index (feature)** — in `journal/index.astro` frontmatter:

```astro
import NewsletterSignup from '../../components/NewsletterSignup.astro';
```

Then place after the list of posts, before the footer:

```astro
<section style="max-width: 42rem; margin: 4rem auto 0; padding: 0 1.5rem;">
  <NewsletterSignup variant="feature" source="journal-index" />
</section>
```

- [ ] **Step 5: Verify build**

Run: `pnpm --filter marketing build`
Expected: build completes; grep a built page to confirm the form is present:
`grep -l 'data-signup' apps/marketing/dist/index.html apps/marketing/dist/subscribe/index.html`

- [ ] **Step 6: Commit**

```bash
git add apps/marketing/src/components/Footer.astro apps/marketing/src/pages/index.astro apps/marketing/src/pages/journal/[slug].astro apps/marketing/src/pages/journal/index.astro
git commit -m "feat(marketing): place NewsletterSignup on footer, homepage, journal"
```

---

## Task 6: Privacy policy — MailerLite + newsletter disclosure

**Files:**
- Modify: `apps/marketing/src/pages/legal/privacy.mdx`

- [ ] **Step 1: Add MailerLite to the sub-processor list.** In the "Third parties we use to operate the Service" list, add this bullet after the Microsoft 365 entry:

```markdown
- **MailerLite** (MailerLite Limited) — our email newsletter provider. If you subscribe to the Atelier letter, your email address (and the page you signed up from) is stored in MailerLite so we can send you the newsletter. Used only with your consent; unsubscribe at any time via the link in any email.
```

- [ ] **Step 2: Add a newsletter note.** Under "How we use your data", immediately after the paragraph that begins "We do **not** use your data for marketing emails unless you explicitly opt in", add:

```markdown
### Newsletter

If you subscribe to our newsletter (the Atelier letter), we ask you to confirm your subscription by clicking a link in a confirmation email (double opt-in). We process your email address on the basis of your **consent**, which you can withdraw at any time using the unsubscribe link in any newsletter or by emailing us. We do not add you to the newsletter as part of signing up for the Service — it is always a separate, optional choice.
```

- [ ] **Step 3: Bump the effective date.** Change the frontmatter `lastUpdated:` to the date of implementation (e.g. `lastUpdated: <DD Month 2026>`).

- [ ] **Step 4: Verify build**

Run: `pnpm --filter marketing build`
Expected: build completes; `grep -c MailerLite apps/marketing/dist/legal/privacy/index.html` returns ≥ 1.

- [ ] **Step 5: Commit**

```bash
git add apps/marketing/src/pages/legal/privacy.mdx
git commit -m "docs(legal): disclose MailerLite newsletter processing"
```

---

## Task 7: MailerLite setup, secrets, deploy, and live verification

(No code. This wires the runtime config and resolves the spec's open questions. Do this task last; it makes the feature actually work in production.)

- [ ] **Step 1: MailerLite dashboard setup** (done by the site owner)
  - Create a group named **Atelier**. Copy its **group ID** (Subscribers → Groups → the group → the ID in the URL / group settings).
  - Create an **API token** (Integrations → API → generate). Copy it once.
  - **Enable double opt-in** (Settings → Subscribe settings / Double opt-in → ON). Set the confirmation email content and the sender name/identity for the Atelier brand.
  - If MailerLite requires the custom field `source` to exist before accepting it, create a text field named `source` (Subscribers → Fields). (Resolves spec open question #2.)

- [ ] **Step 2: Set Cloudflare Pages env vars** (Production **and** Preview), via the Cloudflare dashboard (Pages → the `atelier` project → Settings → Environment variables) or:

```bash
npx wrangler pages secret put MAILERLITE_API_KEY --project-name atelier
# then add ATELIER_GROUP_ID as a plain env var (dashboard) or:
npx wrangler pages secret put ATELIER_GROUP_ID --project-name atelier
```

- [ ] **Step 3: Run the full test + build once more, then deploy**

```bash
npx vitest run tests/functions
pnpm --filter marketing build
git push origin main   # Cloudflare Pages auto-deploys from main
```

- [ ] **Step 4: Live verification (resolves open question #1 — does `unconfirmed` auto-send the confirmation email?)**
  - Visit `https://myatelier.style/subscribe`, submit a real address you control.
  - Confirm the inline success message appears ("check your inbox").
  - Confirm the **double opt-in confirmation email arrives**, click it, and verify the subscriber shows as **active** in the MailerLite Atelier group with the correct `source`.
  - If **no confirmation email arrives**: the account-level double opt-in setting governs it — re-check Step 1's double opt-in toggle; if MailerLite still adds as active without confirming, that is acceptable for launch (single opt-in) but update the privacy wording accordingly, or configure a MailerLite confirmation automation. Note the outcome in the spec.
  - Test the **no-JS path**: with JS disabled, submitting the footer form should land on `/subscribe/thanks`.

- [ ] **Step 5: Final commit (if any config files/docs changed)**

```bash
git add -A
git commit -m "chore(newsletter): finalize MailerLite config + verification notes"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- Reusable component + 4 placements → Tasks 3, 5. ✅
- Server-side Pages Function → MailerLite (double opt-in) → Tasks 1, 2. ✅
- `/subscribe` + `/subscribe/thanks` → Task 4. ✅
- Consent statement + double opt-in + no cookie banner → component consent line (Task 3), `unconfirmed` status (Task 1), privacy note (Task 6). ✅
- Honeypot + validation + no-JS redirect → Task 2 (+ tests). ✅
- Privacy policy disclosure → Task 6. ✅
- Config/secrets + MailerLite setup + verification of open questions → Task 7. ✅
- Vitest tests mirroring `tests/functions/` → Tasks 1, 2. ✅

**Placeholder scan:** No TBD/TODO; every code step contains full code; test code is concrete. Rate-limiting was intentionally scoped out of v1 (honeypot + Cloudflare platform protection) per spec open question #3 — noted, not silently dropped.

**Type consistency:** `addSubscriberToGroup(apiKey, groupId, email, source): AddSubscriberResult{ ok, status }` is defined in Task 1 and consumed identically in Task 2 and its tests. Env fields `MAILERLITE_API_KEY` / `ATELIER_GROUP_ID` match across Task 2, its tests, and Task 7. Component `source` values match the placements in Task 5.
