# Atelier Monorepo — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure `Talastron/atelier-website` into a pnpm monorepo (`Talastron/atelier`), port the existing landing page to Astro, build the Lemon Squeezy commerce flow with a Firebase Auth magic-link handoff, and ship a live marketing site at `myatelier.style`.

**Architecture:** pnpm workspaces. `apps/marketing` runs on Astro 5 + React islands and deploys to Cloudflare Pages. `apps/studio` slot is left empty (filled in Phase 2). Shared design lives in `packages/design-tokens` (CSS variables + JS) and `packages/ui` (React components). A Cloudflare Pages Function at `apps/marketing/functions/api/lemonsqueezy-webhook.ts` handles subscription events: verifies HMAC, provisions Firebase Auth users, writes Firestore subscription records, and sends a magic-link email to the customer.

**Tech Stack:** pnpm 9+ workspaces, Astro 5, React 19, Tailwind v4 (Vite plugin), MDX, Cloudflare Pages + Pages Functions, Lemon Squeezy (Merchant of Record), Firebase Admin via Identity Toolkit REST API (Workers-compatible), Vitest for unit tests.

**Spec:** [docs/superpowers/specs/2026-06-18-atelier-monorepo-architecture-design.md](../specs/2026-06-18-atelier-monorepo-architecture-design.md)

**Phase 1 explicitly does NOT touch the existing `billiesherwood/digital-wardrobe` repo.** That repo and its app continue running undisturbed throughout this plan. The `apps/studio/` slot in the monorepo is created as an empty directory with a placeholder README until Phase 2.

---

## File structure (end state of Phase 1)

```
Talastron/atelier/   (renamed from atelier-website)
├── apps/
│   ├── marketing/
│   │   ├── astro.config.mjs
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── wrangler.toml
│   │   ├── public/
│   │   │   ├── favicon.svg
│   │   │   └── icons.svg
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── index.astro
│   │   │   │   ├── about.astro
│   │   │   │   ├── pricing.astro
│   │   │   │   ├── welcome.astro
│   │   │   │   ├── 404.astro
│   │   │   │   ├── journal/
│   │   │   │   │   ├── index.astro
│   │   │   │   │   └── [slug].astro
│   │   │   │   └── legal/
│   │   │   │       ├── terms.mdx
│   │   │   │       └── privacy.mdx
│   │   │   ├── layouts/
│   │   │   │   └── Base.astro
│   │   │   ├── components/
│   │   │   │   ├── Nav.astro
│   │   │   │   ├── Footer.astro
│   │   │   │   ├── Hero.jsx          (React island)
│   │   │   │   ├── Features.jsx       (React island)
│   │   │   │   └── Philosophy.astro
│   │   │   ├── content/
│   │   │   │   └── journal/
│   │   │   │       └── welcome-to-atelier.mdx
│   │   │   ├── styles/
│   │   │   │   └── global.css
│   │   │   └── config.ts
│   │   └── functions/
│   │       ├── api/
│   │       │   └── lemonsqueezy-webhook.ts
│   │       └── lib/
│   │           ├── google-auth.ts
│   │           ├── firebase-identity-toolkit.ts
│   │           ├── firestore.ts
│   │           └── hmac.ts
│   └── studio/
│       └── README.md                  (placeholder — filled in Phase 2)
├── packages/
│   ├── design-tokens/
│   │   ├── package.json
│   │   ├── index.css
│   │   ├── colors.css
│   │   ├── type.css
│   │   ├── space.css
│   │   └── tokens.js
│   └── ui/
│       ├── package.json
│       ├── src/
│       │   ├── index.js
│       │   ├── AtelierMark.jsx
│       │   ├── BrassRule.jsx
│       │   ├── EditorialHeader.jsx
│       │   ├── FeatureCard.jsx
│       │   ├── PrimaryCTA.jsx
│       │   └── SecondaryCTA.jsx
├── docs/
│   └── superpowers/
│       ├── specs/2026-06-18-atelier-monorepo-architecture-design.md
│       └── plans/2026-06-18-atelier-monorepo-phase-1.md   (this file)
├── pnpm-workspace.yaml
├── package.json
├── .npmrc
├── .gitignore
└── README.md
```

---

## Section A — Prerequisites & repo rename

### Task A1: Install pnpm and verify tooling

**Files:** none (system setup)

- [ ] **Step 1:** Install pnpm globally

```bash
npm install -g pnpm@9
```

- [ ] **Step 2:** Verify versions meet requirements

```bash
pnpm --version    # expect 9.x or higher
node --version    # expect 20.x or higher (you have 24.12.0)
wrangler --version  # expect 4.x or higher
```

Expected: all three commands succeed; pnpm prints `9.x.x` or `10.x.x`.

### Task A2: Ensure clean git state and push to origin

**Files:** repo state

- [ ] **Step 1:** Verify working tree is clean

```bash
cd "C:/Users/SibylleMoller-Sherwo/Documents/atelier-website"
git status
```

Expected: "nothing to commit, working tree clean" (the design spec commits from earlier are already in main).

- [ ] **Step 2:** Push current state to origin so it's safe before we restructure

```bash
git push origin main
```

### Task A3: Rename GitHub repo `atelier-website` → `atelier`

**Files:** GitHub UI (manual step)

- [ ] **Step 1:** In GitHub, navigate to `Talastron/atelier-website` → Settings → General
- [ ] **Step 2:** Under "Repository name," change `atelier-website` to `atelier`. Click Rename.
- [ ] **Step 3:** GitHub automatically installs permanent redirects from the old URL — confirm you can still access the repo at `https://github.com/Talastron/atelier-website` (it should 301 to the new URL).

### Task A4: Update local git remote URL

**Files:** local git config

- [ ] **Step 1:** Update the remote URL in the local working copy

```bash
cd "C:/Users/SibylleMoller-Sherwo/Documents/atelier-website"
git remote set-url origin https://github.com/Talastron/atelier.git
git remote -v   # verify the new URL is in place
```

- [ ] **Step 2:** Rename the local directory to match (do this in your file explorer or shell; close any editors first)

```bash
# After closing all editors/terminals using the directory:
cd "C:/Users/SibylleMoller-Sherwo/Documents"
mv atelier-website atelier
cd atelier
git remote -v   # verify origin still points correctly after the move
```

From now on, all paths in this plan use `C:/Users/SibylleMoller-Sherwo/Documents/atelier/`.

---

## Section B — Restructure existing files into `apps/marketing/`

### Task B1: Move existing source files into the apps/marketing/ directory

**Files:** moves the existing scaffold into the apps/marketing/ slot using `git mv` to preserve history.

- [ ] **Step 1:** Create the new directory structure

```bash
mkdir -p apps/marketing
mkdir -p apps/studio
mkdir -p packages/design-tokens
mkdir -p packages/ui/src
```

- [ ] **Step 2:** Move existing files into apps/marketing/ using `git mv` (preserves history per file)

```bash
git mv src apps/marketing/src
git mv public apps/marketing/public
git mv index.html apps/marketing/index.html
git mv vite.config.js apps/marketing/vite.config.js
git mv eslint.config.js apps/marketing/eslint.config.js
git mv package.json apps/marketing/package.json
git mv package-lock.json apps/marketing/package-lock.json
git mv README.md apps/marketing/README.md
```

- [ ] **Step 3:** Delete `node_modules` (will be reinstalled via pnpm at root in Section C)

```bash
rm -rf node_modules apps/marketing/node_modules
```

- [ ] **Step 4:** Verify the restructure with `git status`

```bash
git status
```

Expected: all the file moves shown as renames, no content changes yet.

- [ ] **Step 5:** Commit the restructure

```bash
git add -A
git commit -m "Restructure: move existing site into apps/marketing/ for monorepo"
```

### Task B2: Create placeholder for apps/studio

**Files:**
- Create: `apps/studio/README.md`

- [ ] **Step 1:** Write the placeholder README

```bash
cat > apps/studio/README.md << 'EOF'
# studio

The Atelier app (wardrobe management). This directory will be populated in Phase 2 of the monorepo migration by `git subtree add`ing the history of `billiesherwood/digital-wardrobe`.

Until Phase 2 runs, this README is a placeholder so the directory exists in the monorepo structure.

See: `docs/superpowers/specs/2026-06-18-atelier-monorepo-architecture-design.md` § 8 Phase 2.
EOF
```

- [ ] **Step 2:** Commit

```bash
git add apps/studio/README.md
git commit -m "Add apps/studio placeholder for Phase 2 absorption"
```

---

## Section C — Initialize pnpm workspace at the root

### Task C1: Create `pnpm-workspace.yaml`

**Files:**
- Create: `pnpm-workspace.yaml`

- [ ] **Step 1:** Create the workspace config

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 2:** Commit

```bash
git add pnpm-workspace.yaml
git commit -m "Add pnpm workspace config"
```

### Task C2: Create root `package.json`

**Files:**
- Create: `package.json` (at repo root)

- [ ] **Step 1:** Write the root package.json

```json
{
  "name": "atelier",
  "version": "0.0.0",
  "private": true,
  "description": "Atelier monorepo — marketing site + wardrobe app",
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "dev:marketing": "pnpm --filter marketing dev",
    "build": "pnpm -r build",
    "build:marketing": "pnpm --filter marketing build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test"
  },
  "devDependencies": {
    "prettier": "^3.4.2"
  },
  "engines": {
    "node": ">=20",
    "pnpm": ">=9"
  },
  "packageManager": "pnpm@9.15.0"
}
```

- [ ] **Step 2:** Create `.npmrc` to enforce pnpm best practices

```ini
# .npmrc
auto-install-peers=true
strict-peer-dependencies=false
shamefully-hoist=false
```

- [ ] **Step 3:** Update `.gitignore` for monorepo conventions

```bash
cat > .gitignore << 'EOF'
# dependencies
node_modules/
.pnpm-store/

# build outputs
dist/
.astro/
.wrangler/
.vercel/

# env
.env
.env.local
.env.*.local
.dev.vars

# logs
*.log
npm-debug.log*
pnpm-debug.log*

# editor
.vscode/
.idea/
*.swp
.DS_Store
Thumbs.db
EOF
```

- [ ] **Step 4:** Run `pnpm install` to bootstrap the workspace

```bash
pnpm install
```

Expected: pnpm installs to a single `node_modules` at root; `apps/marketing/node_modules` is mostly symlinks. No errors.

- [ ] **Step 5:** Commit

```bash
git add package.json .npmrc .gitignore pnpm-lock.yaml
git commit -m "Initialize pnpm workspace at root"
```

---

## Section D — `packages/design-tokens`

The single source of truth for design values. CSS variables for runtime consumption, JS exports for the rare cases tokens need to be referenced in code (e.g. SVG `fill` attributes computed in JSX).

### Task D1: Scaffold the design-tokens package

**Files:**
- Create: `packages/design-tokens/package.json`

- [ ] **Step 1:** Write the package.json

```json
{
  "name": "@atelier/design-tokens",
  "version": "0.0.0",
  "private": true,
  "description": "Atelier design tokens — colors, type, spacing",
  "type": "module",
  "main": "./tokens.js",
  "exports": {
    ".": "./tokens.js",
    "./tokens": "./tokens.js",
    "./colors.css": "./colors.css",
    "./type.css": "./type.css",
    "./space.css": "./space.css",
    "./index.css": "./index.css"
  },
  "files": [
    "*.css",
    "*.js"
  ]
}
```

### Task D2: Write `colors.css`

**Files:**
- Create: `packages/design-tokens/colors.css`

- [ ] **Step 1:** Write the colors file (values extracted from `apps/marketing/src/App.jsx` and the spec)

```css
/* packages/design-tokens/colors.css */
/* Atelier color tokens. Consumed by both apps via CSS custom properties. */

:root {
  /* Foundational neutrals */
  --atelier-cream: #F7F5F2;      /* primary background */
  --atelier-ink: #1c1917;        /* primary text, dark surfaces */

  /* Brass — accent / luxury signature */
  --atelier-brass-200: #E2C896;
  --atelier-brass-300: #D4B378;
  --atelier-brass-600: #A8884C;

  /* Stone — extended neutral scale, aligns with Tailwind stone */
  --atelier-stone-50:  #fafaf9;
  --atelier-stone-100: #f5f5f4;
  --atelier-stone-200: #e7e5e4;
  --atelier-stone-300: #d6d3d1;
  --atelier-stone-400: #a8a29e;
  --atelier-stone-500: #78716c;
  --atelier-stone-600: #57534e;
  --atelier-stone-700: #44403c;
  --atelier-stone-800: #292524;
  --atelier-stone-900: #1c1917;

  /* Semantic */
  --atelier-emerald-700: #047857;  /* used sparingly for "investment insight" accents */
}
```

### Task D3: Write `type.css`

**Files:**
- Create: `packages/design-tokens/type.css`

- [ ] **Step 1:** Write the typography tokens

```css
/* packages/design-tokens/type.css */
/* Atelier typography tokens. Font loading is the consumer's responsibility (Google Fonts link in <head>). */

:root {
  --atelier-font-display: 'Playfair Display', 'Times New Roman', Georgia, serif;
  --atelier-font-sans: 'Jost', 'Helvetica Neue', Arial, sans-serif;

  /* Modular type scale (base 16px, ratio ~1.25) */
  --atelier-text-xs:   0.75rem;     /* 12px */
  --atelier-text-sm:   0.875rem;    /* 14px */
  --atelier-text-base: 1rem;        /* 16px */
  --atelier-text-lg:   1.125rem;    /* 18px */
  --atelier-text-xl:   1.25rem;     /* 20px */
  --atelier-text-2xl:  1.5rem;      /* 24px */
  --atelier-text-3xl:  1.875rem;    /* 30px */
  --atelier-text-4xl:  2.25rem;     /* 36px */
  --atelier-text-5xl:  3rem;        /* 48px */
  --atelier-text-6xl:  3.75rem;     /* 60px */
  --atelier-text-7xl:  4.5rem;      /* 72px */

  /* Line heights */
  --atelier-leading-display: 1.05;
  --atelier-leading-tight:   1.15;
  --atelier-leading-snug:    1.35;
  --atelier-leading-body:    1.7;

  /* Letter-spacing for editorial uppercase labels */
  --atelier-tracking-eyebrow: 0.28em;
}
```

### Task D4: Write `space.css`

**Files:**
- Create: `packages/design-tokens/space.css`

- [ ] **Step 1:** Write the spacing tokens

```css
/* packages/design-tokens/space.css */
/* Atelier spacing tokens. Built on an 8px baseline grid. */

:root {
  /* Page container */
  --atelier-container-max: 1280px;
  --atelier-page-padding: clamp(1.5rem, 4vw, 3rem);

  /* Vertical section rhythm — generous, luxurious */
  --atelier-section-padding-y: clamp(4rem, 8vw, 8rem);

  /* Editorial prose constraints */
  --atelier-prose-max: 65ch;
  --atelier-prose-narrow: 50ch;

  /* Radii */
  --atelier-radius-sm: 0.5rem;
  --atelier-radius-md: 1rem;
  --atelier-radius-lg: 2rem;
  --atelier-radius-xl: 3rem;
  --atelier-radius-pill: 9999px;

  /* Shadow — soft, low-contrast */
  --atelier-shadow-smooth: 0 10px 40px -10px rgba(0, 0, 0, 0.08);
  --atelier-shadow-lifted: 0 20px 60px -20px rgba(0, 0, 0, 0.12);

  /* Brass-rule motif (the 24x1.5px decorative line) */
  --atelier-brass-rule-width: 24px;
  --atelier-brass-rule-height: 1.5px;
}
```

### Task D5: Write `index.css` aggregator

**Files:**
- Create: `packages/design-tokens/index.css`

- [ ] **Step 1:** Aggregate all token files

```css
/* packages/design-tokens/index.css */
/* Imports all Atelier design tokens. Apps consume this once in their global stylesheet. */

@import './colors.css';
@import './type.css';
@import './space.css';
```

### Task D6: Write `tokens.js` (JS-accessible mirrors)

**Files:**
- Create: `packages/design-tokens/tokens.js`

- [ ] **Step 1:** Write the JS exports

```js
// packages/design-tokens/tokens.js
// Same values as the CSS custom properties, exposed for cases where tokens
// must be referenced in JS/JSX (e.g. SVG `fill` attributes computed in code).

export const colors = {
  cream: '#F7F5F2',
  ink: '#1c1917',
  brass: {
    200: '#E2C896',
    300: '#D4B378',
    600: '#A8884C',
  },
  stone: {
    50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1',
    400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c',
    800: '#292524', 900: '#1c1917',
  },
  emerald: { 700: '#047857' },
};

export const fonts = {
  display: "'Playfair Display', 'Times New Roman', Georgia, serif",
  sans: "'Jost', 'Helvetica Neue', Arial, sans-serif",
};
```

### Task D7: Commit the design-tokens package

- [ ] **Step 1:** Commit

```bash
git add packages/design-tokens/
git commit -m "Add @atelier/design-tokens package (colors, type, space)"
```

---

## Section E — `packages/ui`

Shared React components — extracted from `apps/marketing/src/App.jsx` and made consumable by both apps. Components import token VALUES from `@atelier/design-tokens` only when they need them at the JS level (e.g. SVG fills); otherwise they reference CSS custom properties.

### Task E1: Scaffold the ui package

**Files:**
- Create: `packages/ui/package.json`

- [ ] **Step 1:** Write the package.json

```json
{
  "name": "@atelier/ui",
  "version": "0.0.0",
  "private": true,
  "description": "Atelier shared React components",
  "type": "module",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js"
  },
  "peerDependencies": {
    "react": ">=18"
  },
  "dependencies": {
    "@atelier/design-tokens": "workspace:*",
    "lucide-react": "^0.460.0"
  },
  "files": [
    "src"
  ]
}
```

### Task E2: Extract `AtelierMark` component

**Files:**
- Create: `packages/ui/src/AtelierMark.jsx`

- [ ] **Step 1:** Write the component (copied verbatim from `apps/marketing/src/App.jsx` lines 189–203, with token import)

```jsx
// packages/ui/src/AtelierMark.jsx
import React from 'react';
import { colors } from '@atelier/design-tokens';

export function AtelierMark({ size = 40, light = false }) {
  const bg = light ? colors.stone[800] : colors.stone[900];
  const line = light ? colors.stone[400] : colors.cream;
  const brass = colors.brass[300];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect width="256" height="256" fill={bg} rx="56" />
      <g
        fill="none"
        stroke={line}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M 160 60 Q 160 44 144 44 Q 128 44 128 58 L 128 110" />
        <path d="M 128 110 L 62 184 L 194 184 Z" />
      </g>
      <line
        x1="128" y1="184" x2="128" y2="206"
        stroke={brass} strokeWidth="1.5" strokeLinecap="round" opacity="0.8"
      />
      <circle cx="128" cy="212" r="5" fill={brass} />
    </svg>
  );
}
```

### Task E3: Extract `BrassRule` component

**Files:**
- Create: `packages/ui/src/BrassRule.jsx`

- [ ] **Step 1:** Write the component

```jsx
// packages/ui/src/BrassRule.jsx
import React from 'react';

export function BrassRule() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 'var(--atelier-brass-rule-width)',
        height: 'var(--atelier-brass-rule-height)',
        backgroundColor: 'var(--atelier-brass-300)',
      }}
    />
  );
}
```

### Task E4: Extract `EditorialHeader` component

**Files:**
- Create: `packages/ui/src/EditorialHeader.jsx`

- [ ] **Step 1:** Write the component (matches the visual contract of `EditorialHeader` in the existing App.jsx)

```jsx
// packages/ui/src/EditorialHeader.jsx
import React from 'react';
import { BrassRule } from './BrassRule.jsx';

export function EditorialHeader({ eyebrow, title, subtitle, className = '', align = 'left' }) {
  const isCenter = align === 'center';
  return (
    <header className={`flex flex-col gap-4 ${isCenter ? 'items-center text-center' : ''} ${className}`}>
      {eyebrow && (
        <div className="flex items-center gap-3 mb-1">
          <BrassRule />
          <span
            className="text-[10px] font-medium text-stone-500 uppercase"
            style={{ letterSpacing: 'var(--atelier-tracking-eyebrow)' }}
          >
            {eyebrow}
          </span>
          {isCenter && <BrassRule />}
        </div>
      )}
      <h2
        className="text-3xl sm:text-4xl md:text-5xl tracking-tight text-stone-900"
        style={{
          fontFamily: 'var(--atelier-font-display)',
          lineHeight: 'var(--atelier-leading-display)',
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="text-stone-500 text-base md:text-lg max-w-xl"
          style={{ lineHeight: 'var(--atelier-leading-body)' }}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}
```

### Task E5: Extract `FeatureCard` component

**Files:**
- Create: `packages/ui/src/FeatureCard.jsx`

- [ ] **Step 1:** Write the component

```jsx
// packages/ui/src/FeatureCard.jsx
import React from 'react';

export function FeatureCard({ icon, title, description }) {
  return (
    <div
      className="bg-white border border-stone-200/60 p-8 rounded-[2rem] hover:-translate-y-1 transition-all duration-300 group"
      style={{ boxShadow: 'var(--atelier-shadow-smooth)' }}
    >
      <div className="w-14 h-14 bg-stone-50 border border-stone-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3
        className="text-2xl text-stone-900 mb-3"
        style={{ fontFamily: 'var(--atelier-font-display)' }}
      >
        {title}
      </h3>
      <p
        className="text-stone-500 text-sm"
        style={{ lineHeight: 'var(--atelier-leading-body)' }}
      >
        {description}
      </p>
    </div>
  );
}
```

### Task E6: Create `PrimaryCTA` and `SecondaryCTA` components

**Files:**
- Create: `packages/ui/src/PrimaryCTA.jsx`
- Create: `packages/ui/src/SecondaryCTA.jsx`

- [ ] **Step 1:** Write PrimaryCTA (dark pill style — matches "Open Studio" / "Start Curating" in the existing draft)

```jsx
// packages/ui/src/PrimaryCTA.jsx
import React from 'react';

export function PrimaryCTA({ href, children, className = '', icon = null }) {
  return (
    <a
      href={href}
      className={`bg-stone-900 text-white px-8 py-4 rounded-full text-base font-medium hover:bg-stone-700 transition-all shadow-lg active:scale-95 inline-flex items-center gap-2 ${className}`}
    >
      {children}
      {icon}
    </a>
  );
}
```

- [ ] **Step 2:** Write SecondaryCTA (brass pill — matches "Begin your curation" on dark surfaces)

```jsx
// packages/ui/src/SecondaryCTA.jsx
import React from 'react';

export function SecondaryCTA({ href, children, className = '' }) {
  return (
    <a
      href={href}
      className={`bg-[var(--atelier-brass-300)] text-stone-900 px-8 py-4 rounded-full text-base font-medium hover:bg-[var(--atelier-brass-200)] transition-all shadow-lg active:scale-95 inline-flex items-center gap-2 ${className}`}
    >
      {children}
    </a>
  );
}
```

### Task E7: Create `index.js` barrel export

**Files:**
- Create: `packages/ui/src/index.js`

- [ ] **Step 1:** Re-export all components

```js
// packages/ui/src/index.js
export { AtelierMark } from './AtelierMark.jsx';
export { BrassRule } from './BrassRule.jsx';
export { EditorialHeader } from './EditorialHeader.jsx';
export { FeatureCard } from './FeatureCard.jsx';
export { PrimaryCTA } from './PrimaryCTA.jsx';
export { SecondaryCTA } from './SecondaryCTA.jsx';
```

### Task E8: Run pnpm install and commit

- [ ] **Step 1:** Reinstall so workspace links are recreated for the new packages

```bash
pnpm install
```

Expected: no errors; `node_modules/@atelier/` contains symlinks to `packages/design-tokens` and `packages/ui`.

- [ ] **Step 2:** Commit

```bash
git add packages/ui/ pnpm-lock.yaml
git commit -m "Add @atelier/ui package with shared React components"
```

---

## Section F — Reinitialize `apps/marketing` as an Astro project

The existing `apps/marketing/` is a Vite + React scaffold with the draft landing page. We replace the build tooling with Astro while preserving the design intent.

### Task F1: Remove the old Vite scaffold files

**Files:**
- Delete: `apps/marketing/index.html`
- Delete: `apps/marketing/vite.config.js`
- Delete: `apps/marketing/eslint.config.js`
- Delete: `apps/marketing/package.json`
- Delete: `apps/marketing/package-lock.json`
- Delete: `apps/marketing/src/main.jsx`
- Delete: `apps/marketing/src/App.css`
- Delete: `apps/marketing/src/index.css`
- (Keep: `apps/marketing/src/App.jsx` and `apps/marketing/public/` until porting is complete; we'll delete App.jsx after porting in Section G.)

- [ ] **Step 1:** Remove the Vite scaffolding files

```bash
cd apps/marketing
rm index.html vite.config.js eslint.config.js package.json package-lock.json
rm src/main.jsx src/App.css src/index.css
cd ../..
```

- [ ] **Step 2:** Stage the deletions but don't commit yet (we'll commit Astro scaffold + deletions together)

```bash
git status   # confirm only the files we intended are deleted
```

### Task F2: Write new `apps/marketing/package.json` for Astro

**Files:**
- Create: `apps/marketing/package.json`

- [ ] **Step 1:** Write the package.json

```json
{
  "name": "marketing",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro"
  },
  "dependencies": {
    "@astrojs/mdx": "^4.0.0",
    "@astrojs/react": "^4.1.0",
    "@atelier/design-tokens": "workspace:*",
    "@atelier/ui": "workspace:*",
    "@tailwindcss/vite": "^4.0.0",
    "astro": "^5.0.0",
    "lucide-react": "^0.460.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.0"
  }
}
```

### Task F3: Write `astro.config.mjs`

**Files:**
- Create: `apps/marketing/astro.config.mjs`

- [ ] **Step 1:** Write the Astro config

```js
// apps/marketing/astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://myatelier.style',
  integrations: [
    react(),
    mdx(),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
```

### Task F4: Write `tsconfig.json` (for Pages Functions later)

**Files:**
- Create: `apps/marketing/tsconfig.json`

- [ ] **Step 1:** Extend Astro's strict preset

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "types": ["@cloudflare/workers-types"]
  }
}
```

### Task F5: Write `wrangler.toml` for Pages Functions

**Files:**
- Create: `apps/marketing/wrangler.toml`

- [ ] **Step 1:** Write the wrangler config (used for local dev of Pages Functions and webhook secrets)

```toml
# apps/marketing/wrangler.toml
name = "atelier"
compatibility_date = "2025-09-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "./dist"
```

### Task F6: Install Astro and dependencies, commit

- [ ] **Step 1:** Install from the monorepo root

```bash
cd C:/Users/SibylleMoller-Sherwo/Documents/atelier
pnpm install
```

Expected: Astro, React 19, integrations installed. Tailwind v4 installed. No errors.

- [ ] **Step 2:** Commit

```bash
git add apps/marketing/ pnpm-lock.yaml
git commit -m "Reinitialize apps/marketing as Astro 5 + React + Tailwind v4"
```

---

## Section G — Global styles and the Base layout

### Task G1: Create `apps/marketing/src/styles/global.css`

**Files:**
- Create: `apps/marketing/src/styles/global.css`

- [ ] **Step 1:** Write the global stylesheet — imports design tokens, declares Tailwind v4 theme, sets base styles

```css
/* apps/marketing/src/styles/global.css */

/* Import design tokens — defines all --atelier-* CSS custom properties */
@import '@atelier/design-tokens/index.css';

/* Tailwind v4 */
@import 'tailwindcss';

/* Tailwind v4 theme: extend the default palette with Atelier tokens
   so utilities like `bg-brass-300`, `text-cream`, etc. work. */
@theme {
  --color-cream: var(--atelier-cream);
  --color-ink: var(--atelier-ink);

  --color-brass-200: var(--atelier-brass-200);
  --color-brass-300: var(--atelier-brass-300);
  --color-brass-600: var(--atelier-brass-600);

  --font-display: var(--atelier-font-display);
  --font-sans: var(--atelier-font-sans);
}

/* Base body styles */
html {
  scroll-behavior: smooth;
}

body {
  background-color: var(--atelier-cream);
  color: var(--atelier-stone-900);
  font-family: var(--atelier-font-sans);
  line-height: var(--atelier-leading-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background-color: var(--atelier-brass-200);
  color: var(--atelier-stone-900);
}

/* Smooth-shadow utility (used by FeatureCard and image frames) */
.smooth-shadow {
  box-shadow: var(--atelier-shadow-smooth);
}
```

### Task G2: Create `apps/marketing/src/config.ts`

**Files:**
- Create: `apps/marketing/src/config.ts`

- [ ] **Step 1:** Define site-wide constants

```ts
// apps/marketing/src/config.ts
// Site-wide configuration. Used across pages and components.

export const SITE = {
  name: 'Atelier',
  url: 'https://myatelier.style',
  supportEmail: 'contact@myatelier.style',
} as const;

/** URL of the app (signed-in experience). All "Open Studio" / "Sign In" CTAs link here. */
export const EDIT_URL = 'https://edit.myatelier.style';
```

### Task G3: Create `apps/marketing/src/layouts/Base.astro`

**Files:**
- Create: `apps/marketing/src/layouts/Base.astro`

- [ ] **Step 1:** Write the base layout

```astro
---
// apps/marketing/src/layouts/Base.astro
import '../styles/global.css';

interface Props {
  title: string;
  description?: string;
}

const { title, description = 'The quiet luxury of a beautifully organised wardrobe.' } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content={description} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

    <!-- Fonts: Playfair Display (display serif) + Jost (body sans). -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap"
    />

    <title>{title}</title>
  </head>
  <body>
    <slot />
  </body>
</html>
```

### Task G4: Commit global styles + layout

- [ ] **Step 1:** Commit

```bash
git add apps/marketing/src/styles/ apps/marketing/src/config.ts apps/marketing/src/layouts/
git commit -m "Add global styles, base layout, and site config"
```

---

## Section H — Port the landing page to Astro

### Task H1: Create `Nav.astro`

**Files:**
- Create: `apps/marketing/src/components/Nav.astro`

- [ ] **Step 1:** Write the navigation component (server-rendered Astro — no JS shipped)

```astro
---
// apps/marketing/src/components/Nav.astro
import { AtelierMark } from '@atelier/ui';
import { EDIT_URL } from '../config.ts';
---

<nav class="fixed top-0 left-0 right-0 z-50 bg-cream/90 backdrop-blur-md border-b border-stone-200/60">
  <div
    class="mx-auto h-20 flex items-center justify-between"
    style="max-width: var(--atelier-container-max); padding-inline: var(--atelier-page-padding);"
  >
    <a href="/" class="flex items-center gap-3">
      <AtelierMark size={32} client:load />
      <span class="font-display text-2xl tracking-tight">Atelier.</span>
    </a>
    <div class="flex items-center gap-6">
      <a href={EDIT_URL} class="hidden md:block text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors">
        Sign In
      </a>
      <a href={EDIT_URL} class="bg-stone-900 text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-stone-700 transition-all shadow-lg active:scale-95">
        Open Studio
      </a>
    </div>
  </div>
</nav>
```

### Task H2: Create `Footer.astro`

**Files:**
- Create: `apps/marketing/src/components/Footer.astro`

- [ ] **Step 1:** Write the footer

```astro
---
// apps/marketing/src/components/Footer.astro
import { AtelierMark } from '@atelier/ui';
import { EDIT_URL, SITE } from '../config.ts';

const year = new Date().getFullYear();
---

<footer class="bg-cream border-t border-stone-200/60 py-12">
  <div
    class="mx-auto flex flex-col md:flex-row items-center justify-between gap-6"
    style="max-width: var(--atelier-container-max); padding-inline: var(--atelier-page-padding);"
  >
    <a href="/" class="flex items-center gap-3">
      <AtelierMark size={28} client:load />
      <span class="font-display text-xl text-stone-900 tracking-tight">Atelier.</span>
    </a>
    <div class="flex gap-6 text-sm text-stone-500 font-medium">
      <a href={EDIT_URL} class="hover:text-stone-900 transition-colors">Sign In</a>
      <a href={`mailto:${SITE.supportEmail}`} class="hover:text-stone-900 transition-colors">Support</a>
      <a href="/legal/privacy" class="hover:text-stone-900 transition-colors">Privacy</a>
      <a href="/legal/terms" class="hover:text-stone-900 transition-colors">Terms</a>
    </div>
    <p class="text-xs text-stone-400 tracking-wider uppercase">
      &copy; {year} Atelier. All rights reserved.
    </p>
  </div>
</footer>
```

### Task H3: Create `Hero.jsx` (React island)

**Files:**
- Create: `apps/marketing/src/components/Hero.jsx`

- [ ] **Step 1:** Write the hero section as a React island (kept as React because the visual currently uses a hover-scale interactive group; could be Astro later)

```jsx
// apps/marketing/src/components/Hero.jsx
import React from 'react';
import { Camera, ChevronRight } from 'lucide-react';
import { BrassRule } from '@atelier/ui';

export function Hero({ editUrl }) {
  return (
    <section
      className="text-center"
      style={{
        paddingTop: '10rem',
        paddingBottom: 'var(--atelier-section-padding-y)',
        paddingInline: 'var(--atelier-page-padding)',
        maxWidth: 'var(--atelier-container-max)',
        margin: '0 auto',
      }}
    >
      <div className="flex items-center justify-center gap-3 mb-6">
        <BrassRule />
        <p
          className="text-xs uppercase text-stone-500 font-semibold"
          style={{ letterSpacing: 'var(--atelier-tracking-eyebrow)' }}
        >
          Your Digital Collection
        </p>
        <BrassRule />
      </div>

      <h1
        className="text-5xl md:text-7xl text-stone-900 tracking-tight max-w-4xl mx-auto mb-8"
        style={{
          fontFamily: 'var(--atelier-font-display)',
          lineHeight: 'var(--atelier-leading-display)',
        }}
      >
        The quiet luxury of a beautifully organised wardrobe.
      </h1>

      <p
        className="text-lg md:text-xl text-stone-500 max-w-2xl mx-auto mb-10"
        style={{ lineHeight: 'var(--atelier-leading-body)' }}
      >
        Digitise your fashion investments in seconds using artificial intelligence.
        Compose editorial outfits, track cost per wear, and plan your weekly styling
        with absolute precision.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href={editUrl}
          className="bg-stone-900 text-white px-8 py-4 rounded-full text-base font-medium hover:bg-stone-700 transition-all shadow-lg active:scale-95 inline-flex items-center gap-2"
        >
          Start Curating <ChevronRight size={18} />
        </a>
        <a
          href="#features"
          className="text-sm font-medium text-stone-600 hover:text-stone-900 px-6 py-4 transition-colors"
        >
          Discover the features
        </a>
      </div>

      {/* Abstract hero visual */}
      <div className="mt-20 aspect-[16/9] md:aspect-[21/9] bg-white rounded-[2rem] border border-stone-200/60 overflow-hidden relative smooth-shadow flex items-center justify-center group cursor-pointer">
        <div className="absolute inset-0 bg-gradient-to-br from-stone-50 to-stone-200/50 opacity-80"></div>
        <div className="text-center z-10 transition-transform duration-500 group-hover:scale-105">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-4">
            <Camera size={28} strokeWidth={1.5} className="text-stone-900" />
          </div>
          <p
            className="text-2xl text-stone-900"
            style={{ fontFamily: 'var(--atelier-font-display)' }}
          >
            Experience the Studio
          </p>
          <p className="text-sm text-stone-500 mt-2">Product interface preview</p>
        </div>
      </div>
    </section>
  );
}
```

### Task H4: Create `Features.jsx` (React island)

**Files:**
- Create: `apps/marketing/src/components/Features.jsx`

- [ ] **Step 1:** Write the features grid

```jsx
// apps/marketing/src/components/Features.jsx
import React from 'react';
import { Sparkles, Wand2, Calendar, BarChart3, Bookmark, Lock } from 'lucide-react';
import { EditorialHeader, FeatureCard } from '@atelier/ui';

const FEATURES = [
  {
    icon: <Sparkles size={24} className="text-brass-600" />,
    title: 'Identify with AI',
    description:
      'Snap a single photo. Our vision artificial intelligence automatically categorises the brand, colours, and materials instantly.',
  },
  {
    icon: <Wand2 size={24} className="text-stone-700" />,
    title: 'Editorial Styling',
    description:
      'Drag and drop your pieces onto a clean canvas to compose layered outfits. Ask Gemini to suggest looks based on the daily weather forecast.',
  },
  {
    icon: <Calendar size={24} className="text-stone-700" />,
    title: 'Travel Planning',
    description:
      'Type any destination in the world. Atelier fetches the forecast and packs a dedicated capsule collection from your existing wardrobe.',
  },
  {
    icon: <BarChart3 size={24} className="text-emerald-700" />,
    title: 'Investment Insights',
    description:
      'Track your true cost per wear. Spot the gaps in your collection and see exactly which pieces deliver the highest value.',
  },
  {
    icon: <Bookmark size={24} className="text-stone-700" />,
    title: 'Style Manifesto',
    description:
      'Atelier analyses your most worn pieces and saved inspirations to write a private three paragraph brief of your true aesthetic.',
  },
  {
    icon: <Lock size={24} className="text-stone-700" />,
    title: 'Private by Design',
    description:
      'Your collection is entirely your own. Share specific looks with friends using read only links while keeping your data perfectly secure.',
  },
];

export function Features() {
  return (
    <section
      id="features"
      style={{
        paddingBlock: 'var(--atelier-section-padding-y)',
        paddingInline: 'var(--atelier-page-padding)',
      }}
    >
      <div
        className="mx-auto"
        style={{ maxWidth: 'var(--atelier-container-max)' }}
      >
        <EditorialHeader
          eyebrow="The Toolkit"
          title="Master your aesthetic."
          subtitle="Built for professionals who treat their wardrobe as an investment portfolio."
          align="center"
          className="mb-16"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

### Task H5: Create `Philosophy.astro` (server-rendered, no JS)

**Files:**
- Create: `apps/marketing/src/components/Philosophy.astro`

- [ ] **Step 1:** Write the philosophy section as pure Astro (no React, ships zero JS)

```astro
---
// apps/marketing/src/components/Philosophy.astro
import { BrassRule } from '@atelier/ui';
import { EDIT_URL } from '../config.ts';
import { Sparkles } from 'lucide-react';
---

<section
  class="text-white rounded-[3rem] mx-4 sm:mx-8 mb-24 relative overflow-hidden shadow-2xl"
  style={`background-color: var(--atelier-ink); padding-block: var(--atelier-section-padding-y); padding-inline: var(--atelier-page-padding);`}
>
  <div class="absolute -right-20 -bottom-20 opacity-[0.03] pointer-events-none">
    <Sparkles size={400} strokeWidth={0.5} />
  </div>

  <div class="max-w-4xl mx-auto text-center relative z-10">
    <div class="flex items-center justify-center gap-3 mb-8">
      <BrassRule client:load />
      <span
        class="text-[10px] uppercase text-brass-300 font-medium"
        style="letter-spacing: var(--atelier-tracking-eyebrow);"
      >
        The Philosophy
      </span>
      <BrassRule client:load />
    </div>

    <h2
      class="text-4xl md:text-5xl lg:text-6xl mb-8"
      style="font-family: var(--atelier-font-display); line-height: var(--atelier-leading-display);"
    >
      Buy less. Wear better. Curate a collection that lasts a lifetime.
    </h2>

    <p
      class="text-stone-400 text-lg md:text-xl max-w-2xl mx-auto mb-12"
      style="line-height: var(--atelier-leading-body);"
    >
      We believe that true style comes from understanding what you own. Stop losing
      beautiful pieces in the back of the closet and start styling with intention.
    </p>

    <a
      href={EDIT_URL}
      class="bg-brass-300 text-stone-900 px-8 py-4 rounded-full text-base font-medium hover:bg-brass-200 transition-all shadow-lg active:scale-95 inline-flex items-center gap-2"
    >
      Begin your curation
    </a>
  </div>
</section>
```

### Task H6: Wire up `apps/marketing/src/pages/index.astro`

**Files:**
- Create: `apps/marketing/src/pages/index.astro`

- [ ] **Step 1:** Compose the landing page

```astro
---
// apps/marketing/src/pages/index.astro
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import Philosophy from '../components/Philosophy.astro';
import { Hero } from '../components/Hero.jsx';
import { Features } from '../components/Features.jsx';
import { EDIT_URL } from '../config.ts';
---

<Base title="Atelier — The quiet luxury of a beautifully organised wardrobe">
  <Nav />
  <main>
    <Hero editUrl={EDIT_URL} client:load />
    <Features client:visible />
    <Philosophy />
  </main>
  <Footer />
</Base>
```

### Task H7: Delete the old `App.jsx` source

**Files:**
- Delete: `apps/marketing/src/App.jsx`

- [ ] **Step 1:** Remove the original draft now that its content has been ported

```bash
rm apps/marketing/src/App.jsx
```

### Task H8: Visual verification — run dev server and compare

- [ ] **Step 1:** Start the dev server

```bash
pnpm --filter marketing dev
```

Expected: Astro starts on `http://localhost:4321/`. No errors in the terminal.

- [ ] **Step 2:** Open `http://localhost:4321/` in a browser. Verify:
  - Cream background renders (not white)
  - Display font is Playfair Display (italics on "luxury" if any)
  - Body font is Jost
  - Brass dividers ("brass-rule") appear above the "Your Digital Collection" eyebrow
  - Nav is fixed top, backdrop-blur visible when scrolling
  - Hero copy matches the original draft
  - Six feature cards render in a 3-column grid (desktop) / 1-column (mobile)
  - "The Philosophy" dark section appears with rounded corners
  - Footer shows AtelierMark + links + copyright
  - All `Sign In` / `Open Studio` / `Start Curating` / `Begin your curation` buttons link to `https://edit.myatelier.style` (hover and check status bar; or right-click → Copy Link)

- [ ] **Step 3:** Inspect element on a brass divider; confirm the computed background is `#D4B378` (proves the Tailwind `@theme` brass extension is wired correctly).

- [ ] **Step 4:** Commit

```bash
git add apps/marketing/src/ apps/marketing/
git rm apps/marketing/src/App.jsx 2>/dev/null || true   # in case it wasn't fully removed above
git commit -m "Port landing page to Astro with React islands consuming @atelier/ui"
```

---

## Section I — Additional pages (about, pricing, welcome, journal, legal, 404)

### Task I1: Create `about.astro`

**Files:**
- Create: `apps/marketing/src/pages/about.astro`

- [ ] **Step 1:** Write the about page (content can be expanded later; structure is the contract)

```astro
---
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import { BrassRule } from '@atelier/ui';
---

<Base title="About — Atelier">
  <Nav />
  <main
    class="mx-auto"
    style="max-width: var(--atelier-container-max); padding-top: 10rem; padding-block-end: var(--atelier-section-padding-y); padding-inline: var(--atelier-page-padding);"
  >
    <div class="flex items-center gap-3 mb-6">
      <BrassRule client:load />
      <p class="text-xs uppercase text-stone-500 font-semibold" style="letter-spacing: var(--atelier-tracking-eyebrow);">
        The Brand
      </p>
    </div>
    <h1
      class="text-5xl md:text-6xl tracking-tight mb-12"
      style="font-family: var(--atelier-font-display); line-height: var(--atelier-leading-display);"
    >
      A house for the considered wardrobe.
    </h1>
    <div
      class="text-stone-700 text-lg space-y-6"
      style="max-width: var(--atelier-prose-max); line-height: var(--atelier-leading-body);"
    >
      <p>
        Atelier began with a private question: what would it look like to treat a personal wardrobe the way
        a fashion house treats a collection — every piece accounted for, every look composed with intention,
        every investment understood for what it returns?
      </p>
      <p>
        We build the digital equivalent of a fitting-room mirror, a stylist's notebook, and a curator's ledger,
        all in one. The aim is not to acquire more clothing. The aim is to live more thoroughly with the clothing
        you have chosen.
      </p>
      <p>
        Quiet luxury, made personal.
      </p>
    </div>
  </main>
  <Footer />
</Base>
```

### Task I2: Create `pricing.astro` with Lemon Squeezy CTA placeholder

**Files:**
- Create: `apps/marketing/src/pages/pricing.astro`

- [ ] **Step 1:** Write the pricing page. The Lemon Squeezy checkout URL is a placeholder that gets filled in Section J after the LS product is created.

```astro
---
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import { BrassRule } from '@atelier/ui';

// PLACEHOLDER — replaced after Lemon Squeezy product is created (see Task J3).
// Format: https://<your-store>.lemonsqueezy.com/checkout/buy/<variant-id>
const LS_CHECKOUT_URL_MONTHLY = 'https://atelier.lemonsqueezy.com/checkout/buy/PLACEHOLDER_MONTHLY_VARIANT_ID';
const LS_CHECKOUT_URL_ANNUAL = 'https://atelier.lemonsqueezy.com/checkout/buy/PLACEHOLDER_ANNUAL_VARIANT_ID';
---

<Base title="Pricing — Atelier">
  <Nav />
  <main
    class="mx-auto"
    style="max-width: var(--atelier-container-max); padding-top: 10rem; padding-block-end: var(--atelier-section-padding-y); padding-inline: var(--atelier-page-padding);"
  >
    <div class="text-center mb-16">
      <div class="flex items-center justify-center gap-3 mb-6">
        <BrassRule client:load />
        <p class="text-xs uppercase text-stone-500 font-semibold" style="letter-spacing: var(--atelier-tracking-eyebrow);">
          Membership
        </p>
        <BrassRule client:load />
      </div>
      <h1
        class="text-5xl md:text-6xl tracking-tight mb-6"
        style="font-family: var(--atelier-font-display); line-height: var(--atelier-leading-display);"
      >
        One considered membership.
      </h1>
      <p class="text-stone-500 text-lg max-w-2xl mx-auto" style="line-height: var(--atelier-leading-body);">
        Begin with a 14-day trial. No card required.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      <article class="bg-white border border-stone-200/60 p-10 rounded-[2rem] smooth-shadow">
        <h2 class="text-2xl mb-2" style="font-family: var(--atelier-font-display);">Monthly</h2>
        <p class="text-stone-500 text-sm mb-8">Flexible, no commitment.</p>
        <p class="text-4xl mb-8" style="font-family: var(--atelier-font-display);">
          $— <span class="text-base text-stone-500">/ month</span>
        </p>
        <a
          href={LS_CHECKOUT_URL_MONTHLY}
          class="block text-center bg-stone-900 text-white px-8 py-4 rounded-full text-base font-medium hover:bg-stone-700 transition-all shadow-lg active:scale-95"
        >
          Start 14-day trial
        </a>
      </article>

      <article class="bg-stone-900 text-white p-10 rounded-[2rem] shadow-2xl">
        <div class="flex items-center gap-3 mb-2">
          <h2 class="text-2xl" style="font-family: var(--atelier-font-display);">Annual</h2>
          <span class="text-xs uppercase text-brass-300 font-medium" style="letter-spacing: var(--atelier-tracking-eyebrow);">
            Best value
          </span>
        </div>
        <p class="text-stone-400 text-sm mb-8">Save ~20% over monthly.</p>
        <p class="text-4xl mb-8" style="font-family: var(--atelier-font-display);">
          $— <span class="text-base text-stone-400">/ year</span>
        </p>
        <a
          href={LS_CHECKOUT_URL_ANNUAL}
          class="block text-center bg-brass-300 text-stone-900 px-8 py-4 rounded-full text-base font-medium hover:bg-brass-200 transition-all shadow-lg active:scale-95"
        >
          Start 14-day trial
        </a>
      </article>
    </div>

    <p class="text-center text-xs text-stone-400 mt-12" style="letter-spacing: 0.1em;">
      30-day no-questions-asked refund · cancel anytime · VAT included where applicable
    </p>
  </main>
  <Footer />
</Base>
```

### Task I3: Create `welcome.astro` (post-checkout success page)

**Files:**
- Create: `apps/marketing/src/pages/welcome.astro`

- [ ] **Step 1:** Write the welcome / "check your email" page

```astro
---
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import { BrassRule } from '@atelier/ui';
---

<Base title="Welcome to Atelier">
  <Nav />
  <main
    class="mx-auto text-center"
    style="max-width: 640px; padding-top: 12rem; padding-block-end: var(--atelier-section-padding-y); padding-inline: var(--atelier-page-padding);"
  >
    <div class="flex items-center justify-center gap-3 mb-8">
      <BrassRule client:load />
      <p class="text-xs uppercase text-stone-500 font-semibold" style="letter-spacing: var(--atelier-tracking-eyebrow);">
        Welcome
      </p>
      <BrassRule client:load />
    </div>
    <h1
      class="text-4xl md:text-5xl tracking-tight mb-8"
      style="font-family: var(--atelier-font-display); line-height: var(--atelier-leading-display);"
    >
      Check your inbox for the key to your atelier.
    </h1>
    <p class="text-stone-500 text-lg mb-12" style="line-height: var(--atelier-leading-body);">
      We've sent a sign-in link to the email address you used at checkout. Click it from any device
      to open your studio.
    </p>
    <p class="text-stone-400 text-sm">
      The link is valid for one hour. Didn't receive it within a few minutes? Check your spam folder
      or <a href="mailto:contact@myatelier.style" class="underline hover:text-stone-700">write to us</a>.
    </p>
  </main>
  <Footer />
</Base>
```

### Task I4: Create journal index and a stub post

**Files:**
- Create: `apps/marketing/src/pages/journal/index.astro`
- Create: `apps/marketing/src/pages/journal/[slug].astro`
- Create: `apps/marketing/src/content/journal/welcome-to-atelier.mdx`
- Create: `apps/marketing/src/content/config.ts`

- [ ] **Step 1:** Set up Astro content collections config

```ts
// apps/marketing/src/content/config.ts
import { defineCollection, z } from 'astro:content';

const journal = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { journal };
```

- [ ] **Step 2:** Write the first journal post (placeholder content)

```mdx
---
title: 'Welcome to the Atelier journal'
date: 2026-06-18
description: 'On considered consumption, why we built Atelier, and what to expect here.'
---

import { BrassRule } from '@atelier/ui';

There is a particular kind of attention required to live well with the clothing one has chosen.
It is not the attention of acquisition — buying more, browsing more, scrolling more. It is the
attention of stewardship: knowing what you own, understanding what it has cost you, and arranging
it so that getting dressed in the morning is a creative act rather than a forensic one.

That is what Atelier is for, and it is what we will write about here.

<BrassRule client:load />

More to come. Subscribe to be notified when new posts are published.
```

- [ ] **Step 3:** Write `journal/index.astro`

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import { BrassRule } from '@atelier/ui';
import { getCollection } from 'astro:content';

const posts = (await getCollection('journal', ({ data }) => !data.draft)).sort(
  (a, b) => b.data.date.getTime() - a.data.date.getTime()
);
---

<Base title="Journal — Atelier" description="Notes on style, stewardship, and the considered wardrobe.">
  <Nav />
  <main
    class="mx-auto"
    style="max-width: var(--atelier-container-max); padding-top: 10rem; padding-block-end: var(--atelier-section-padding-y); padding-inline: var(--atelier-page-padding);"
  >
    <div class="flex items-center gap-3 mb-6">
      <BrassRule client:load />
      <p class="text-xs uppercase text-stone-500 font-semibold" style="letter-spacing: var(--atelier-tracking-eyebrow);">
        The Journal
      </p>
    </div>
    <h1
      class="text-5xl md:text-6xl tracking-tight mb-16"
      style="font-family: var(--atelier-font-display); line-height: var(--atelier-leading-display);"
    >
      Notes on the considered wardrobe.
    </h1>
    <ul class="space-y-12" style="max-width: var(--atelier-prose-max);">
      {posts.map((post) => (
        <li class="border-b border-stone-200/60 pb-12 last:border-0">
          <a href={`/journal/${post.slug}`} class="block group">
            <time class="text-xs uppercase text-stone-400" style="letter-spacing: 0.15em;">
              {post.data.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </time>
            <h2
              class="text-3xl tracking-tight mt-3 mb-3 group-hover:text-stone-600 transition-colors"
              style="font-family: var(--atelier-font-display); line-height: var(--atelier-leading-tight);"
            >
              {post.data.title}
            </h2>
            <p class="text-stone-500" style="line-height: var(--atelier-leading-body);">
              {post.data.description}
            </p>
          </a>
        </li>
      ))}
    </ul>
  </main>
  <Footer />
</Base>
```

- [ ] **Step 4:** Write `journal/[slug].astro`

```astro
---
import Base from '../../layouts/Base.astro';
import Nav from '../../components/Nav.astro';
import Footer from '../../components/Footer.astro';
import { getCollection } from 'astro:content';

export async function getStaticPaths() {
  const posts = await getCollection('journal');
  return posts.map((post) => ({ params: { slug: post.slug }, props: { post } }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<Base title={`${post.data.title} — Atelier`} description={post.data.description}>
  <Nav />
  <article
    class="mx-auto"
    style="max-width: var(--atelier-prose-max); padding-top: 10rem; padding-block-end: var(--atelier-section-padding-y); padding-inline: var(--atelier-page-padding);"
  >
    <time class="text-xs uppercase text-stone-400" style="letter-spacing: 0.15em;">
      {post.data.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
    </time>
    <h1
      class="text-4xl md:text-5xl tracking-tight mt-4 mb-12"
      style="font-family: var(--atelier-font-display); line-height: var(--atelier-leading-display);"
    >
      {post.data.title}
    </h1>
    <div
      class="text-stone-700 text-lg space-y-6 prose-atelier"
      style="line-height: var(--atelier-leading-body);"
    >
      <Content />
    </div>
  </article>
  <Footer />
</Base>
```

### Task I5: Create legal stubs

**Files:**
- Create: `apps/marketing/src/pages/legal/terms.mdx`
- Create: `apps/marketing/src/pages/legal/privacy.mdx`

- [ ] **Step 1:** Write `terms.mdx` placeholder

```mdx
---
layout: ../../layouts/Base.astro
title: Terms of Service — Atelier
---

# Terms of Service

_Last updated: 18 June 2026_

These are placeholder terms. Replace before public launch with terms reviewed by counsel appropriate
to your jurisdiction and to the merchant-of-record arrangement with Lemon Squeezy.

By using Atelier, you agree to [placeholder]. We provide the Service "as is" without warranty of any
kind. You retain ownership of all content you upload. You may cancel your subscription at any time
through the customer portal.

For questions, write to contact@myatelier.style.
```

- [ ] **Step 2:** Write `privacy.mdx` placeholder

```mdx
---
layout: ../../layouts/Base.astro
title: Privacy Policy — Atelier
---

# Privacy Policy

_Last updated: 18 June 2026_

This is a placeholder privacy policy. Replace before public launch with a policy reviewed by counsel.

**What we collect:** account email, payment information (handled by our Merchant of Record, Lemon Squeezy),
items you upload to your wardrobe, usage data sufficient to operate and improve the Service.

**What we don't do:** we do not sell your data. We do not share your wardrobe with anyone except via
read-only share links you explicitly create.

**Where data lives:** Firebase (Google Cloud) for application data; Lemon Squeezy for payment data.

For questions or data requests, write to contact@myatelier.style.
```

### Task I6: Create `404.astro`

**Files:**
- Create: `apps/marketing/src/pages/404.astro`

- [ ] **Step 1:** Write the 404 page

```astro
---
import Base from '../layouts/Base.astro';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
import { BrassRule } from '@atelier/ui';
---

<Base title="Not found — Atelier">
  <Nav />
  <main
    class="mx-auto text-center"
    style="max-width: 640px; padding-top: 12rem; padding-block-end: var(--atelier-section-padding-y); padding-inline: var(--atelier-page-padding);"
  >
    <div class="flex items-center justify-center gap-3 mb-8">
      <BrassRule client:load />
      <p class="text-xs uppercase text-stone-500 font-semibold" style="letter-spacing: var(--atelier-tracking-eyebrow);">
        404
      </p>
      <BrassRule client:load />
    </div>
    <h1
      class="text-4xl md:text-5xl tracking-tight mb-8"
      style="font-family: var(--atelier-font-display); line-height: var(--atelier-leading-display);"
    >
      This page has been misplaced.
    </h1>
    <p class="text-stone-500 text-lg mb-8" style="line-height: var(--atelier-leading-body);">
      Return to the <a href="/" class="underline hover:text-stone-700">main collection</a>.
    </p>
  </main>
  <Footer />
</Base>
```

### Task I7: Visual verification and commit

- [ ] **Step 1:** Start dev server (if not already running)

```bash
pnpm --filter marketing dev
```

- [ ] **Step 2:** Visit each new page and confirm it renders:
  - `http://localhost:4321/about`
  - `http://localhost:4321/pricing`
  - `http://localhost:4321/welcome`
  - `http://localhost:4321/journal`
  - `http://localhost:4321/journal/welcome-to-atelier`
  - `http://localhost:4321/legal/terms`
  - `http://localhost:4321/legal/privacy`
  - `http://localhost:4321/nonexistent-page` (should hit 404)

Expected: all pages render with shared Nav, Footer, and design language intact.

- [ ] **Step 3:** Commit

```bash
git add apps/marketing/src/pages/ apps/marketing/src/content/
git commit -m "Add about, pricing, welcome, journal, legal, and 404 pages"
```

---

## Section J — Lemon Squeezy product setup (manual / external)

This section configures Lemon Squeezy itself. Most steps happen in the LS dashboard.

### Task J1: Create Lemon Squeezy account and store

**Files:** Lemon Squeezy dashboard (external)

- [ ] **Step 1:** Sign up at https://www.lemonsqueezy.com — create a store called "Atelier"
- [ ] **Step 2:** Complete the store onboarding (business details, payout bank account, branding — use Atelier cream/brass/Playfair where possible in the LS branding settings)
- [ ] **Step 3:** Enable Test Mode in the dashboard (toggle in the top navigation). All work below happens in Test Mode until Section M.

### Task J2: Create the Atelier subscription product with two variants

**Files:** Lemon Squeezy dashboard (external)

- [ ] **Step 1:** Products → New Product → Type: "Subscription"
  - Name: `Atelier Membership`
  - Description: `Quiet luxury for your wardrobe — unlimited pieces, AI styling, cost-per-wear analytics, and the full Atelier studio.`
- [ ] **Step 2:** Add variant: `Monthly` — set price (e.g., $12/mo placeholder), billing interval: monthly, trial: 14 days
- [ ] **Step 3:** Add variant: `Annual` — set price (e.g., ~$115/yr if monthly is $12, ~20% off), billing interval: yearly, trial: 14 days
- [ ] **Step 4:** Save. Note the two variant IDs (visible in the URL of each variant page, e.g., `https://app.lemonsqueezy.com/products/123456/variants/789012` → variant ID `789012`).
- [ ] **Step 5:** Note the checkout URLs for each variant (Products → Atelier Membership → Variants → … → "Share / Embed" → copy "Direct Checkout URL").

### Task J3: Wire real LS checkout URLs into the pricing page

**Files:**
- Modify: `apps/marketing/src/pages/pricing.astro`

- [ ] **Step 1:** Replace the placeholder URLs with the real ones from J2.5

```ts
// Replace lines 9–10 of pricing.astro with the actual checkout URLs from Lemon Squeezy:
const LS_CHECKOUT_URL_MONTHLY = 'https://atelier.lemonsqueezy.com/checkout/buy/<actual-monthly-variant-id>';
const LS_CHECKOUT_URL_ANNUAL  = 'https://atelier.lemonsqueezy.com/checkout/buy/<actual-annual-variant-id>';
```

- [ ] **Step 2:** Add a `?embed=1&checkout[success_url]=https://myatelier.style/welcome` query string to each URL so the customer is redirected to the welcome page after checkout

```ts
const LS_CHECKOUT_URL_MONTHLY = 'https://atelier.lemonsqueezy.com/checkout/buy/<id>?checkout[success_url]=https://myatelier.style/welcome';
const LS_CHECKOUT_URL_ANNUAL  = 'https://atelier.lemonsqueezy.com/checkout/buy/<id>?checkout[success_url]=https://myatelier.style/welcome';
```

- [ ] **Step 3:** Restart dev server. From `http://localhost:4321/pricing`, click "Start 14-day trial." Verify the LS hosted checkout opens in a new page.

- [ ] **Step 4:** Commit

```bash
git add apps/marketing/src/pages/pricing.astro
git commit -m "Wire pricing page to live Lemon Squeezy checkout URLs"
```

### Task J4: Generate Lemon Squeezy API key and webhook signing secret

**Files:** Lemon Squeezy dashboard (external)

- [ ] **Step 1:** Settings → API → "Create API key" — name it "atelier-webhook", scope: full access. Copy the key; you'll add it to Cloudflare in Section L.
- [ ] **Step 2:** Settings → Webhooks → "+ Webhook" — URL: `https://myatelier.style/api/lemonsqueezy-webhook` (won't work yet — that's fine), Signing secret: generate one (the dashboard will create a random string; copy it). Select events:
  - `subscription_created`
  - `subscription_updated`
  - `subscription_cancelled`
  - `subscription_resumed`
  - `subscription_expired`
  - `subscription_payment_failed`
  - `subscription_payment_success`
- [ ] **Step 3:** Save. Store both the API key and the signing secret somewhere safe (password manager) — you'll need them for Cloudflare env vars.

---

## Section K — The Lemon Squeezy webhook handler (TDD)

This is the most logic-heavy part of Phase 1, so it gets proper unit tests with Vitest. The handler runs on Cloudflare Pages Functions (V8 Workers runtime), so we use the Firebase Identity Toolkit REST API rather than the `firebase-admin` SDK (which has Node dependencies that complicate Workers builds).

### Task K1: Set up Vitest for testing

**Files:**
- Create: `apps/marketing/vitest.config.ts`
- Modify: `apps/marketing/package.json` (add vitest deps and test script)

- [ ] **Step 1:** Install vitest and helpers

```bash
pnpm --filter marketing add -D vitest @vitest/coverage-v8
```

- [ ] **Step 2:** Write the vitest config

```ts
// apps/marketing/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['functions/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['functions/**/*.ts'],
      exclude: ['functions/**/*.test.ts'],
    },
  },
});
```

- [ ] **Step 3:** Add the `test` script

```json
// In apps/marketing/package.json scripts:
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4:** Commit

```bash
git add apps/marketing/vitest.config.ts apps/marketing/package.json pnpm-lock.yaml
git commit -m "Add Vitest for Pages Functions testing"
```

### Task K2: HMAC verification — write the failing test

**Files:**
- Create: `apps/marketing/functions/lib/hmac.test.ts`

- [ ] **Step 1:** Write the test

```ts
// apps/marketing/functions/lib/hmac.test.ts
import { describe, it, expect } from 'vitest';
import { verifyLemonSqueezySignature } from './hmac.ts';

describe('verifyLemonSqueezySignature', () => {
  const secret = 'test-secret';
  // Pre-computed HMAC-SHA256 of `{"foo":"bar"}` with secret `test-secret`:
  const validSignature = '7b09b6a18ab3f6d2cad13ec03d2dcd35b7eba2c4eed3d36b7a3a5f7e2e1a1e8d';
  const body = '{"foo":"bar"}';

  it('returns true for a valid signature', async () => {
    const result = await verifyLemonSqueezySignature(body, validSignature, secret);
    expect(result).toBe(true);
  });

  it('returns false for an invalid signature', async () => {
    const result = await verifyLemonSqueezySignature(body, 'deadbeef', secret);
    expect(result).toBe(false);
  });

  it('returns false for a tampered body', async () => {
    const result = await verifyLemonSqueezySignature('{"foo":"baz"}', validSignature, secret);
    expect(result).toBe(false);
  });

  it('returns false for an empty signature', async () => {
    const result = await verifyLemonSqueezySignature(body, '', secret);
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2:** Run the test to verify it fails

```bash
pnpm --filter marketing test
```

Expected: FAIL — "Cannot find module './hmac.ts'" or similar.

> **Note on the pre-computed signature:** before committing, replace `7b09b6a18ab3f6d2cad13ec03d2dcd35b7eba2c4eed3d36b7a3a5f7e2e1a1e8d` with the actual HMAC-SHA256 of the exact body string `{"foo":"bar"}` using the secret `test-secret`. Compute with: `node -e "console.log(require('crypto').createHmac('sha256','test-secret').update('{\"foo\":\"bar\"}').digest('hex'))"`. Update the constant in the test to that real value.

### Task K3: Implement `hmac.ts`

**Files:**
- Create: `apps/marketing/functions/lib/hmac.ts`

- [ ] **Step 1:** Write the implementation using the Web Crypto API (available in Workers)

```ts
// apps/marketing/functions/lib/hmac.ts
/**
 * Verify a Lemon Squeezy webhook signature.
 *
 * LS signs every webhook with HMAC-SHA256 over the raw request body, using the
 * signing secret configured in the LS dashboard. The signature arrives in the
 * `X-Signature` header as a lowercase hex string.
 *
 * @param body  The raw request body as a string (must NOT be re-serialized JSON).
 * @param signature  The value of the `X-Signature` header.
 * @param secret  The signing secret from Lemon Squeezy dashboard.
 * @returns true iff the signature is valid; false otherwise (including any error).
 */
export async function verifyLemonSqueezySignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature) return false;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedHex = Array.from(new Uint8Array(signed))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    // Constant-time comparison to avoid timing attacks.
    return constantTimeEquals(expectedHex, signature.toLowerCase());
  } catch {
    return false;
  }
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
```

- [ ] **Step 2:** Run the test to verify it passes

```bash
pnpm --filter marketing test
```

Expected: 4 tests pass.

- [ ] **Step 3:** Commit

```bash
git add apps/marketing/functions/lib/hmac.ts apps/marketing/functions/lib/hmac.test.ts
git commit -m "Add HMAC-SHA256 webhook signature verification (TDD)"
```

### Task K4: Google service-account JWT auth — write the test

**Files:**
- Create: `apps/marketing/functions/lib/google-auth.test.ts`

- [ ] **Step 1:** Write the test (mocks `fetch` to verify we call Google's token endpoint correctly)

```ts
// apps/marketing/functions/lib/google-auth.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getGoogleAccessToken } from './google-auth.ts';

// A throwaway test service account. The private key is a real RSA key generated
// once for tests only — it has no permissions anywhere.
const TEST_SA = {
  client_email: 'test@example.iam.gserviceaccount.com',
  // NOTE: Replace this placeholder with a real PEM-encoded RSA private key
  // generated for the test suite. Generate with:
  //   openssl genpkey -algorithm RSA -out test-key.pem -pkeyopt rsa_keygen_bits:2048
  // Then copy the contents (including BEGIN/END lines) into the string below.
  private_key: '-----BEGIN PRIVATE KEY-----\nTEST_KEY_REPLACE_ME\n-----END PRIVATE KEY-----\n',
};

describe('getGoogleAccessToken', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ access_token: 'fake-token', expires_in: 3600 }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exchanges a signed JWT for an access token at the Google token endpoint', async () => {
    const token = await getGoogleAccessToken(TEST_SA, ['https://www.googleapis.com/auth/firebase']);
    expect(token).toBe('fake-token');
    expect(fetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      })
    );
  });
});
```

- [ ] **Step 2:** Run the test (will fail — file doesn't exist)

```bash
pnpm --filter marketing test
```

Expected: FAIL — module not found.

### Task K5: Implement `google-auth.ts`

**Files:**
- Create: `apps/marketing/functions/lib/google-auth.ts`

- [ ] **Step 1:** Install the `jose` library for JWT signing in Workers

```bash
pnpm --filter marketing add jose
```

- [ ] **Step 2:** Write the implementation

```ts
// apps/marketing/functions/lib/google-auth.ts
import { SignJWT, importPKCS8 } from 'jose';

export interface ServiceAccount {
  client_email: string;
  private_key: string;
}

/**
 * Exchange a signed JWT (assertion) for a short-lived OAuth access token from
 * Google's token endpoint. The returned token can be used as a Bearer token
 * against any Google API in the requested scopes.
 *
 * For Firebase Admin operations we need scopes:
 *   - https://www.googleapis.com/auth/firebase
 *   - https://www.googleapis.com/auth/cloud-platform
 *   - https://www.googleapis.com/auth/datastore  (for Firestore)
 *   - https://www.googleapis.com/auth/identitytoolkit  (for Auth user ops)
 */
export async function getGoogleAccessToken(
  serviceAccount: ServiceAccount,
  scopes: string[]
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');

  const jwt = await new SignJWT({ scope: scopes.join(' ') })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(serviceAccount.client_email)
    .setSubject(serviceAccount.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  return data.access_token;
}

/** Parses a base64-encoded service account JSON env var into a ServiceAccount object. */
export function parseServiceAccount(base64Json: string): ServiceAccount {
  const json = atob(base64Json);
  const obj = JSON.parse(json) as ServiceAccount;
  if (!obj.client_email || !obj.private_key) {
    throw new Error('Invalid service account: missing client_email or private_key');
  }
  return obj;
}
```

- [ ] **Step 3:** Run the test

```bash
pnpm --filter marketing test
```

Expected: PASS (the test mocks fetch, so even with the placeholder private key the assertion logic runs).

- [ ] **Step 4:** Commit

```bash
git add apps/marketing/functions/lib/google-auth.ts apps/marketing/functions/lib/google-auth.test.ts apps/marketing/package.json pnpm-lock.yaml
git commit -m "Add Google service-account JWT auth for Workers (TDD)"
```

### Task K6: Identity Toolkit user operations — write the test

**Files:**
- Create: `apps/marketing/functions/lib/firebase-identity-toolkit.test.ts`

- [ ] **Step 1:** Write tests for `findOrCreateUserByEmail` and `sendSignInLink`

```ts
// apps/marketing/functions/lib/firebase-identity-toolkit.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findOrCreateUserByEmail, sendSignInLink } from './firebase-identity-toolkit.ts';

describe('findOrCreateUserByEmail', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns existing user when lookup finds one', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ users: [{ localId: 'existing-uid', email: 'a@b.com' }] }), { status: 200 })
    );
    const result = await findOrCreateUserByEmail('token', 'project', 'a@b.com');
    expect(result).toEqual({ uid: 'existing-uid', email: 'a@b.com', created: false });
  });

  it('creates a new user when lookup returns no matches', async () => {
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))   // lookup: no users
      .mockResolvedValueOnce(new Response(JSON.stringify({ localId: 'new-uid' }), { status: 200 })); // signUp

    const result = await findOrCreateUserByEmail('token', 'project', 'a@b.com');
    expect(result).toEqual({ uid: 'new-uid', email: 'a@b.com', created: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('sendSignInLink', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('calls Identity Toolkit sendOobCode with EMAIL_SIGNIN', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ email: 'a@b.com' }), { status: 200 })
    );

    await sendSignInLink('token', 'project', 'a@b.com', 'https://edit.myatelier.style/auth');

    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toContain('sendOobCode');
    const body = JSON.parse(call[1].body);
    expect(body.requestType).toBe('EMAIL_SIGNIN');
    expect(body.email).toBe('a@b.com');
    expect(body.continueUrl).toBe('https://edit.myatelier.style/auth');
  });
});
```

- [ ] **Step 2:** Run tests — expect failure (module not found)

```bash
pnpm --filter marketing test
```

### Task K7: Implement `firebase-identity-toolkit.ts`

**Files:**
- Create: `apps/marketing/functions/lib/firebase-identity-toolkit.ts`

- [ ] **Step 1:** Write the implementation

```ts
// apps/marketing/functions/lib/firebase-identity-toolkit.ts
/**
 * Thin wrapper around Firebase Identity Toolkit REST API.
 * Use these in Workers contexts where the Firebase Admin SDK can't easily run.
 *
 * Docs: https://cloud.google.com/identity-platform/docs/reference/rest
 */

const ID_TOOLKIT_BASE = 'https://identitytoolkit.googleapis.com/v1';

export interface UserResult {
  uid: string;
  email: string;
  created: boolean;
}

/**
 * Look up a user by email; if not found, create a new one with a random UID.
 * The user is created without a password — they sign in via magic link.
 */
export async function findOrCreateUserByEmail(
  accessToken: string,
  projectId: string,
  email: string
): Promise<UserResult> {
  const lookupResp = await fetch(
    `${ID_TOOLKIT_BASE}/projects/${projectId}/accounts:lookup`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: [email] }),
    }
  );
  if (!lookupResp.ok) throw new Error(`Lookup failed: ${lookupResp.status} ${await lookupResp.text()}`);
  const lookupData = (await lookupResp.json()) as { users?: Array<{ localId: string; email: string }> };

  if (lookupData.users && lookupData.users.length > 0) {
    return { uid: lookupData.users[0].localId, email: lookupData.users[0].email, created: false };
  }

  const createResp = await fetch(
    `${ID_TOOLKIT_BASE}/projects/${projectId}/accounts`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, emailVerified: true }),
    }
  );
  if (!createResp.ok) throw new Error(`Create user failed: ${createResp.status} ${await createResp.text()}`);
  const createData = (await createResp.json()) as { localId: string };
  return { uid: createData.localId, email, created: true };
}

/**
 * Trigger Firebase Auth to send the user a magic sign-in link.
 * Equivalent to `sendSignInLinkToEmail()` from the client SDK, but server-side.
 *
 * The `continueUrl` is where the user lands after clicking the link — should be
 * a page in the app that calls `signInWithEmailLink()` with the URL parameters.
 */
export async function sendSignInLink(
  accessToken: string,
  projectId: string,
  email: string,
  continueUrl: string
): Promise<void> {
  const resp = await fetch(
    `${ID_TOOLKIT_BASE}/projects/${projectId}/accounts:sendOobCode`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestType: 'EMAIL_SIGNIN',
        email,
        continueUrl,
      }),
    }
  );
  if (!resp.ok) throw new Error(`sendSignInLink failed: ${resp.status} ${await resp.text()}`);
}
```

- [ ] **Step 2:** Run the tests

```bash
pnpm --filter marketing test
```

Expected: 6 total tests pass.

- [ ] **Step 3:** Commit

```bash
git add apps/marketing/functions/lib/firebase-identity-toolkit.ts apps/marketing/functions/lib/firebase-identity-toolkit.test.ts
git commit -m "Add Identity Toolkit REST wrapper: findOrCreateUserByEmail + sendSignInLink"
```

### Task K8: Firestore subscription writes — write the test

**Files:**
- Create: `apps/marketing/functions/lib/firestore.test.ts`

- [ ] **Step 1:** Write the test

```ts
// apps/marketing/functions/lib/firestore.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { upsertSubscription, isEventProcessed, markEventProcessed } from './firestore.ts';

describe('upsertSubscription', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('writes to subscriptions/{subscriptionId} with the right shape', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response('{}', { status: 200 })
    );

    await upsertSubscription('token', 'project', {
      subscriptionId: 'ls_sub_123',
      userId: 'uid_456',
      email: 'a@b.com',
      status: 'active',
      productId: 'prod_1',
      variantId: 'var_monthly',
      currentPeriodEnd: '2026-07-18T00:00:00Z',
    });

    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('/documents/subscriptions/ls_sub_123');
    expect(url).toContain('updateMask.fieldPaths=userId');
    expect(url).toContain('updateMask.fieldPaths=status');
  });
});

describe('event idempotency', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('isEventProcessed returns true when the doc exists', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ name: 'projects/foo/databases/(default)/documents/processed_webhook_events/evt_1' }), { status: 200 })
    );
    expect(await isEventProcessed('token', 'project', 'evt_1')).toBe(true);
  });

  it('isEventProcessed returns false when the doc 404s', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response('{}', { status: 404 })
    );
    expect(await isEventProcessed('token', 'project', 'evt_1')).toBe(false);
  });

  it('markEventProcessed writes a doc with receivedAt', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response('{}', { status: 200 })
    );
    await markEventProcessed('token', 'project', 'evt_1');
    const url = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('/documents/processed_webhook_events?documentId=evt_1');
  });
});
```

### Task K9: Implement `firestore.ts`

**Files:**
- Create: `apps/marketing/functions/lib/firestore.ts`

- [ ] **Step 1:** Write the implementation

```ts
// apps/marketing/functions/lib/firestore.ts
/**
 * Thin Firestore REST wrapper for Worker context.
 * Docs: https://firebase.google.com/docs/firestore/reference/rest
 */

const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1';

export interface SubscriptionRecord {
  subscriptionId: string;   // Lemon Squeezy subscription ID (used as Firestore doc ID)
  userId: string;
  email: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'paused';
  productId: string;
  variantId: string;
  currentPeriodEnd: string; // ISO 8601 timestamp
  cancelledAt?: string;
}

/** Upsert a subscription document at subscriptions/{subscriptionId}. */
export async function upsertSubscription(
  accessToken: string,
  projectId: string,
  sub: SubscriptionRecord
): Promise<void> {
  const docPath = `projects/${projectId}/databases/(default)/documents/subscriptions/${sub.subscriptionId}`;
  const updateMask = [
    'userId', 'email', 'status', 'productId', 'variantId',
    'currentPeriodEnd', 'cancelledAt', 'updatedAt',
  ];

  const fields: Record<string, unknown> = {
    userId: { stringValue: sub.userId },
    email: { stringValue: sub.email },
    status: { stringValue: sub.status },
    productId: { stringValue: sub.productId },
    variantId: { stringValue: sub.variantId },
    currentPeriodEnd: { timestampValue: sub.currentPeriodEnd },
    updatedAt: { timestampValue: new Date().toISOString() },
  };
  if (sub.cancelledAt) fields.cancelledAt = { timestampValue: sub.cancelledAt };

  const url = `${FIRESTORE_BASE}/${docPath}?${
    updateMask.map((f) => `updateMask.fieldPaths=${f}`).join('&')
  }`;

  const resp = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  if (!resp.ok) throw new Error(`upsertSubscription failed: ${resp.status} ${await resp.text()}`);
}

/** Check whether a webhook event has already been processed (idempotency). */
export async function isEventProcessed(
  accessToken: string,
  projectId: string,
  eventId: string
): Promise<boolean> {
  const url = `${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents/processed_webhook_events/${eventId}`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  return resp.ok;
}

/** Record that a webhook event has been processed. */
export async function markEventProcessed(
  accessToken: string,
  projectId: string,
  eventId: string
): Promise<void> {
  const url = `${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents/processed_webhook_events?documentId=${eventId}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: { receivedAt: { timestampValue: new Date().toISOString() } },
    }),
  });
  // 409 (already exists) is acceptable — race conditions.
  if (!resp.ok && resp.status !== 409) {
    throw new Error(`markEventProcessed failed: ${resp.status} ${await resp.text()}`);
  }
}
```

- [ ] **Step 2:** Run the tests

```bash
pnpm --filter marketing test
```

Expected: all tests pass (now 10 total).

- [ ] **Step 3:** Commit

```bash
git add apps/marketing/functions/lib/firestore.ts apps/marketing/functions/lib/firestore.test.ts
git commit -m "Add Firestore REST wrapper: upsertSubscription + event idempotency (TDD)"
```

### Task K10: Webhook handler — write the integration test

**Files:**
- Create: `apps/marketing/functions/api/lemonsqueezy-webhook.test.ts`

- [ ] **Step 1:** Write the integration test (mocks all collaborators; verifies orchestration)

```ts
// apps/marketing/functions/api/lemonsqueezy-webhook.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onRequestPost } from './lemonsqueezy-webhook.ts';

vi.mock('../lib/hmac.ts', () => ({ verifyLemonSqueezySignature: vi.fn().mockResolvedValue(true) }));
vi.mock('../lib/google-auth.ts', () => ({
  getGoogleAccessToken: vi.fn().mockResolvedValue('fake-token'),
  parseServiceAccount: vi.fn().mockReturnValue({ client_email: 'x', private_key: 'y' }),
}));
vi.mock('../lib/firebase-identity-toolkit.ts', () => ({
  findOrCreateUserByEmail: vi.fn().mockResolvedValue({ uid: 'uid_1', email: 'a@b.com', created: true }),
  sendSignInLink: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../lib/firestore.ts', () => ({
  upsertSubscription: vi.fn().mockResolvedValue(undefined),
  isEventProcessed: vi.fn().mockResolvedValue(false),
  markEventProcessed: vi.fn().mockResolvedValue(undefined),
}));

import { verifyLemonSqueezySignature } from '../lib/hmac.ts';
import { findOrCreateUserByEmail, sendSignInLink } from '../lib/firebase-identity-toolkit.ts';
import { upsertSubscription, isEventProcessed } from '../lib/firestore.ts';

const ENV = {
  LEMONSQUEEZY_WEBHOOK_SECRET: 'secret',
  FIREBASE_PROJECT_ID: 'project',
  FIREBASE_ADMIN_SERVICE_ACCOUNT: btoa(JSON.stringify({ client_email: 'x', private_key: 'y' })),
  EDIT_URL: 'https://edit.myatelier.style',
};

function makeRequest(body: object, signature = 'valid'): Request {
  return new Request('https://example.com/api/lemonsqueezy-webhook', {
    method: 'POST',
    headers: { 'X-Signature': signature, 'X-Event-Id': 'evt_123' },
    body: JSON.stringify(body),
  });
}

const SUB_CREATED_EVENT = {
  meta: { event_name: 'subscription_created' },
  data: {
    id: 'ls_sub_999',
    type: 'subscriptions',
    attributes: {
      user_email: 'a@b.com',
      status: 'active',
      product_id: 1,
      variant_id: 100,
      renews_at: '2026-07-18T00:00:00.000000Z',
    },
  },
};

describe('lemonsqueezy-webhook onRequestPost', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 401 when HMAC verification fails', async () => {
    (verifyLemonSqueezySignature as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    const response = await onRequestPost({ request: makeRequest(SUB_CREATED_EVENT), env: ENV } as any);
    expect(response.status).toBe(401);
  });

  it('returns 200 immediately if event already processed (idempotency)', async () => {
    (isEventProcessed as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const response = await onRequestPost({ request: makeRequest(SUB_CREATED_EVENT), env: ENV } as any);
    expect(response.status).toBe(200);
    expect(upsertSubscription).not.toHaveBeenCalled();
    expect(findOrCreateUserByEmail).not.toHaveBeenCalled();
  });

  it('on subscription_created: creates user, writes subscription, sends magic link', async () => {
    const response = await onRequestPost({ request: makeRequest(SUB_CREATED_EVENT), env: ENV } as any);
    expect(response.status).toBe(200);
    expect(findOrCreateUserByEmail).toHaveBeenCalledWith('fake-token', 'project', 'a@b.com');
    expect(upsertSubscription).toHaveBeenCalledWith(
      'fake-token',
      'project',
      expect.objectContaining({ subscriptionId: 'ls_sub_999', userId: 'uid_1', status: 'active' })
    );
    expect(sendSignInLink).toHaveBeenCalledWith(
      'fake-token',
      'project',
      'a@b.com',
      'https://edit.myatelier.style/auth'
    );
  });

  it('on subscription_updated: updates subscription but does NOT send a new magic link', async () => {
    const updatedEvent = { ...SUB_CREATED_EVENT, meta: { event_name: 'subscription_updated' } };
    const response = await onRequestPost({ request: makeRequest(updatedEvent), env: ENV } as any);
    expect(response.status).toBe(200);
    expect(upsertSubscription).toHaveBeenCalled();
    expect(sendSignInLink).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2:** Run — expect failure

```bash
pnpm --filter marketing test
```

### Task K11: Implement the webhook handler

**Files:**
- Create: `apps/marketing/functions/api/lemonsqueezy-webhook.ts`

- [ ] **Step 1:** Write the handler

```ts
// apps/marketing/functions/api/lemonsqueezy-webhook.ts
import { verifyLemonSqueezySignature } from '../lib/hmac.ts';
import { getGoogleAccessToken, parseServiceAccount } from '../lib/google-auth.ts';
import {
  findOrCreateUserByEmail,
  sendSignInLink,
} from '../lib/firebase-identity-toolkit.ts';
import {
  upsertSubscription,
  isEventProcessed,
  markEventProcessed,
  type SubscriptionRecord,
} from '../lib/firestore.ts';

interface Env {
  LEMONSQUEEZY_WEBHOOK_SECRET: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_ADMIN_SERVICE_ACCOUNT: string; // base64-encoded JSON
  EDIT_URL: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

const SCOPES = [
  'https://www.googleapis.com/auth/datastore',
  'https://www.googleapis.com/auth/identitytoolkit',
  'https://www.googleapis.com/auth/firebase',
];

// Statuses LS sends that we map directly to our internal status enum.
function mapStatus(lsStatus: string): SubscriptionRecord['status'] {
  switch (lsStatus) {
    case 'active':
    case 'on_trial':
      return 'active';
    case 'cancelled':
      return 'cancelled';
    case 'expired':
      return 'expired';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'paused':
      return 'paused';
    default:
      return 'active';
  }
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  // 1. Read raw body for signature verification (cannot re-serialize!).
  const rawBody = await request.text();
  const signature = request.headers.get('X-Signature') || '';
  const eventId = request.headers.get('X-Event-Id') || '';

  // 2. Verify HMAC.
  const valid = await verifyLemonSqueezySignature(rawBody, signature, env.LEMONSQUEEZY_WEBHOOK_SECRET);
  if (!valid) return new Response('invalid signature', { status: 401 });

  // 3. Parse payload (we know it's safe now).
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  const eventName: string = payload.meta?.event_name;
  if (!eventName) return new Response('missing event_name', { status: 400 });

  // 4. Authenticate to Google for downstream Firestore + Identity Toolkit calls.
  const sa = parseServiceAccount(env.FIREBASE_ADMIN_SERVICE_ACCOUNT);
  const token = await getGoogleAccessToken(sa, SCOPES);

  // 5. Idempotency: skip if already processed.
  if (eventId && (await isEventProcessed(token, env.FIREBASE_PROJECT_ID, eventId))) {
    return new Response('already processed', { status: 200 });
  }

  // 6. Dispatch by event type.
  const attrs = payload.data?.attributes;
  const subscriptionId = String(payload.data?.id ?? '');
  const email = attrs?.user_email;

  if (!attrs || !subscriptionId || !email) {
    return new Response('missing required fields', { status: 400 });
  }

  const subscriptionRecord: SubscriptionRecord = {
    subscriptionId,
    userId: '',  // filled in below when we know the Firebase UID
    email,
    status: mapStatus(attrs.status),
    productId: String(attrs.product_id ?? ''),
    variantId: String(attrs.variant_id ?? ''),
    currentPeriodEnd: attrs.renews_at ?? attrs.ends_at ?? new Date().toISOString(),
    cancelledAt: attrs.cancelled ? new Date().toISOString() : undefined,
  };

  switch (eventName) {
    case 'subscription_created': {
      const user = await findOrCreateUserByEmail(token, env.FIREBASE_PROJECT_ID, email);
      subscriptionRecord.userId = user.uid;
      await upsertSubscription(token, env.FIREBASE_PROJECT_ID, subscriptionRecord);
      await sendSignInLink(token, env.FIREBASE_PROJECT_ID, email, `${env.EDIT_URL}/auth`);
      break;
    }
    case 'subscription_updated':
    case 'subscription_resumed':
    case 'subscription_payment_success': {
      const user = await findOrCreateUserByEmail(token, env.FIREBASE_PROJECT_ID, email);
      subscriptionRecord.userId = user.uid;
      await upsertSubscription(token, env.FIREBASE_PROJECT_ID, subscriptionRecord);
      break;
    }
    case 'subscription_cancelled': {
      const user = await findOrCreateUserByEmail(token, env.FIREBASE_PROJECT_ID, email);
      subscriptionRecord.userId = user.uid;
      subscriptionRecord.status = 'cancelled';
      subscriptionRecord.cancelledAt = new Date().toISOString();
      await upsertSubscription(token, env.FIREBASE_PROJECT_ID, subscriptionRecord);
      break;
    }
    case 'subscription_expired':
    case 'subscription_payment_failed': {
      const user = await findOrCreateUserByEmail(token, env.FIREBASE_PROJECT_ID, email);
      subscriptionRecord.userId = user.uid;
      subscriptionRecord.status = eventName === 'subscription_expired' ? 'expired' : 'past_due';
      await upsertSubscription(token, env.FIREBASE_PROJECT_ID, subscriptionRecord);
      break;
    }
    default:
      // Unknown event — log and accept so LS doesn't retry forever.
      console.log(`Unhandled LS event: ${eventName}`);
  }

  // 7. Mark processed.
  if (eventId) await markEventProcessed(token, env.FIREBASE_PROJECT_ID, eventId);

  return new Response('ok', { status: 200 });
}
```

- [ ] **Step 2:** Run all tests

```bash
pnpm --filter marketing test
```

Expected: all tests pass (14 total: 4 hmac + 1 google-auth + 2 identity-toolkit + 4 firestore + 4 webhook).

- [ ] **Step 3:** Commit

```bash
git add apps/marketing/functions/
git commit -m "Add Lemon Squeezy webhook handler with subscription lifecycle dispatch (TDD)"
```

---

## Section L — Firebase setup for the webhook handler

### Task L1: Generate Firebase Admin service account

**Files:** Firebase Console (external)

- [ ] **Step 1:** Open https://console.firebase.google.com → select the existing wardrobe project (the same one the app uses).
- [ ] **Step 2:** Project Settings → Service Accounts → "Generate new private key" → download the JSON file. **Treat this file like a password.**
- [ ] **Step 3:** Base64-encode the JSON file contents (the value will go into a Cloudflare env var):

```bash
# On the machine where you downloaded the file (PowerShell):
[Convert]::ToBase64String([IO.File]::ReadAllBytes("path\to\service-account.json")) | Out-File -Encoding ASCII service-account.b64
# Open service-account.b64 in a text editor; copy the entire single-line base64 string.
```

Or using Git Bash / WSL:

```bash
base64 -w 0 service-account.json
```

Store the base64 string in your password manager. You'll paste it into Cloudflare in Section M.

- [ ] **Step 4:** Delete the JSON file from disk once base64-encoded and stored safely.

### Task L2: Authorize `edit.myatelier.style` for Firebase Auth magic links

**Files:** Firebase Console (external)

- [ ] **Step 1:** Firebase Console → Authentication → Settings → "Authorized domains" → "Add domain" → `edit.myatelier.style`
- [ ] **Step 2:** Confirm `localhost` is also listed (for local dev).

### Task L3: Add a Firestore security rule for subscriptions

**Files:**
- Modify: the existing `firestore.rules` in `billiesherwood/digital-wardrobe` (cannot edit here; user does manually in app repo)

> **Note:** This rule lives in the app repo (`billiesherwood/digital-wardrobe`). It is the ONE place Phase 1 requires the user to touch the app repo. Coordinate with in-flight app work.

- [ ] **Step 1:** Open `firestore.rules` in the app repo. Add these rules:

```javascript
// Inside the existing `match /databases/{database}/documents { ... }` block:

match /subscriptions/{subId} {
  // Only the owning user can read their subscription; nobody can write client-side.
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow write: if false;
}

match /processed_webhook_events/{eventId} {
  // Internal — webhook handler only; nothing client-side touches these.
  allow read, write: if false;
}
```

- [ ] **Step 2:** Deploy from the app repo: `firebase deploy --only firestore:rules`
- [ ] **Step 3:** Test the rules briefly via the Firebase Console Rules Playground.

---

## Section M — Cloudflare Pages deployment

### Task M1: Create the Cloudflare Pages project

**Files:** Cloudflare dashboard (external)

- [ ] **Step 1:** Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git
- [ ] **Step 2:** Authorize Cloudflare to access `Talastron/atelier`. Select the repo.
- [ ] **Step 3:** Configure project:
  - **Project name:** `atelier`
  - **Production branch:** `main`
  - **Build command:** `pnpm install && pnpm --filter marketing build`
  - **Build output directory:** `apps/marketing/dist`
  - **Root directory:** `/` (leave default)
  - **Environment variables (Build):** `NODE_VERSION = 22` (or `20`+; Astro 5 needs Node 18+)
- [ ] **Step 4:** Save and trigger the first build. Watch the build log. Expected: succeeds; URL like `atelier.pages.dev` becomes live.

### Task M2: Configure runtime environment variables (secrets)

**Files:** Cloudflare dashboard (external)

- [ ] **Step 1:** In the Pages project → Settings → Environment variables → Production. Add each as **Encrypted**:

| Variable | Value |
|---|---|
| `LEMONSQUEEZY_WEBHOOK_SECRET` | (from Task J4.2) |
| `LEMONSQUEEZY_API_KEY` | (from Task J4.1) |
| `FIREBASE_PROJECT_ID` | the Firebase project ID (e.g., `digital-wardrobe-xxxx`) |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT` | (base64 string from Task L1) |
| `EDIT_URL` | `https://edit.myatelier.style` |

- [ ] **Step 2:** Repeat for **Preview** environment — but use Lemon Squeezy **test mode** credentials (you can switch LS to test mode and create separate test API key + webhook).

### Task M3: Configure custom domain

**Files:** Cloudflare dashboard (external)

- [ ] **Step 1:** Pages project → Custom domains → "Set up a custom domain" → `myatelier.style` → "Activate domain"
- [ ] **Step 2:** Add second custom domain: `www.myatelier.style`. After activation, Cloudflare will automatically create the DNS records.
- [ ] **Step 3:** In Cloudflare DNS settings for the `myatelier.style` zone, add a redirect rule for `www` → apex (or rely on Pages' built-in www handling).

### Task M3a: Set up `edit.myatelier.style` to point at Firebase Hosting

**Why this matters:** The plan changes every CTA from `app.myatelier.style` (where the app currently lives) to `edit.myatelier.style` (the new subdomain). Without this task, every "Open Studio" / "Sign In" button on the marketing site, AND every magic-link sent by the webhook, will land on a domain that doesn't resolve.

**Files:** Firebase Console + Cloudflare DNS dashboard (external)

- [ ] **Step 1:** Firebase Console → select the existing wardrobe project → Hosting → "Add custom domain" → enter `edit.myatelier.style`. Firebase will give you a TXT record to verify ownership and a CNAME target to point the subdomain at.
- [ ] **Step 2:** In Cloudflare DNS for the `myatelier.style` zone, add the verification TXT record Firebase provided. Wait for verification to succeed in the Firebase Console (usually 1–10 minutes).
- [ ] **Step 3:** Once verified, Firebase will provision an SSL certificate. Once SSL is issued, add the CNAME record:

| Record | Type | Target | Proxy mode |
|---|---|---|---|
| `edit` | CNAME | (the Firebase-provided target, e.g., `<project>.web.app`) | **DNS-only (grey cloud)** |

**Critical:** the `edit.` record MUST be DNS-only (grey cloud), not proxied. Proxying breaks Firebase's automatic SSL re-provisioning.

- [ ] **Step 4:** Wait for DNS to propagate (5–30 min). Visit `https://edit.myatelier.style` in a browser. Expected: the existing wardrobe app loads (the same code currently served at `app.myatelier.style`). If you get a Firebase "site not found" page, wait longer — DNS / SSL provisioning is async.
- [ ] **Step 5:** **DO NOT** remove the existing `app.myatelier.style` record yet. Leave it running in parallel until well after Phase 1 ships, so any old links / bookmarks customers might have don't break. Removing `app.` is a Phase 2+ cleanup task.

### Task M4: Update Lemon Squeezy webhook URL to point at the live endpoint

**Files:** Lemon Squeezy dashboard (external)

- [ ] **Step 1:** LS dashboard → Settings → Webhooks → edit the existing webhook → URL: `https://myatelier.style/api/lemonsqueezy-webhook`
- [ ] **Step 2:** Save.

---

## Section N — End-to-end testing

### Task N1: Trigger a test-mode subscription

**Files:** Browser

- [ ] **Step 1:** Visit `https://myatelier.style/pricing` (live site, but LS is in test mode so no real money moves)
- [ ] **Step 2:** Click "Start 14-day trial" on the monthly tier
- [ ] **Step 3:** Complete checkout using a LS test card (LS provides one in their docs, e.g., `4242 4242 4242 4242` with any future date and any CVC)
- [ ] **Step 4:** Expected: redirected to `https://myatelier.style/welcome` ("Check your inbox for the key to your atelier")

### Task N2: Verify the webhook fired and the flow completed

**Files:** Cloudflare + Firebase + email

- [ ] **Step 1:** Cloudflare dashboard → Workers & Pages → atelier → Functions → Real-time logs. Confirm a `POST /api/lemonsqueezy-webhook` returned 200.
- [ ] **Step 2:** Firebase Console → Authentication → Users. Confirm a new user exists with the email you used at checkout.
- [ ] **Step 3:** Firebase Console → Firestore → `subscriptions` collection. Confirm a doc exists with the LS subscription ID, status `active`, and the right userId.
- [ ] **Step 4:** Check the inbox for the email you used. Confirm the magic-link email arrived (subject line: "Sign in to ...").

### Task N3: Verify magic-link sign-in lands in the app

**Files:** Browser

- [ ] **Step 1:** Click the magic-link in the email. Expected: browser opens to `https://edit.myatelier.style/auth?...` with Firebase Auth params.
- [ ] **Step 2:** **NOTE:** the existing app may not yet have an `/auth` route that handles `signInWithEmailLink()`. If it doesn't, you'll see a 404. This is expected in Phase 1 — the app-side handler is a Phase 2 task (the app must add code to call `signInWithEmailLink()` on this route). For Phase 1 acceptance, having the link arrive at the right URL with valid params is sufficient.
- [ ] **Step 3:** Document this open item in the next section's deferred-to-Phase-2 list.

### Task N4: Switch Lemon Squeezy to live mode

**Files:** Lemon Squeezy dashboard (external)

- [ ] **Step 1:** Once Tasks N1–N3 succeed in test mode, switch the LS store to Live Mode (toggle in dashboard).
- [ ] **Step 2:** In Cloudflare Pages → Environment variables → Production, swap the LS API key and webhook secret to the **live** values (LS generates separate keys for live vs test).
- [ ] **Step 3:** Redeploy (push an empty commit or click "Retry deployment" in Cloudflare).

---

## Section O — Wrap-up

### Task O1: Update README at the repo root

**Files:**
- Modify: `README.md` (the existing file at root, currently with Vite-template content)

- [ ] **Step 1:** Replace with a monorepo-appropriate README

```markdown
# Atelier

Quiet luxury for your wardrobe.

This monorepo houses the Atelier marketing site (`apps/marketing`) and, after Phase 2, the Atelier studio app (`apps/studio`). Shared design tokens and React components live in `packages/`.

## Structure

- `apps/marketing` — Astro 5 marketing site, deployed to Cloudflare Pages at https://myatelier.style
- `apps/studio` — _(populated in Phase 2)_ the wardrobe app, deployed to Firebase Hosting at https://edit.myatelier.style
- `packages/design-tokens` — colors, type, spacing as CSS variables + JS exports
- `packages/ui` — shared React components (AtelierMark, BrassRule, EditorialHeader, FeatureCard, CTAs)

## Development

```bash
pnpm install              # bootstrap all workspaces
pnpm dev:marketing        # marketing site at http://localhost:4321
pnpm test                 # run all tests
pnpm build                # build all apps
```

## Documentation

- Architecture spec: [`docs/superpowers/specs/2026-06-18-atelier-monorepo-architecture-design.md`](docs/superpowers/specs/2026-06-18-atelier-monorepo-architecture-design.md)
- Phase 1 plan: [`docs/superpowers/plans/2026-06-18-atelier-monorepo-phase-1.md`](docs/superpowers/plans/2026-06-18-atelier-monorepo-phase-1.md)
```

- [ ] **Step 2:** Commit

```bash
git add README.md
git commit -m "Update root README for monorepo"
```

### Task O2: Final smoke test of the live site

**Files:** Browser

- [ ] **Step 1:** Visit `https://myatelier.style` — confirm landing page renders correctly with cream background, brass dividers, Playfair display font, all six feature cards, the philosophy section, working footer.
- [ ] **Step 2:** Click through each page (about, pricing, journal, welcome, legal/terms, legal/privacy, an intentional 404).
- [ ] **Step 3:** Confirm all "Open Studio" / "Sign In" buttons link to `https://edit.myatelier.style` (will 404 until the existing app's DNS is moved over, which is Phase 2; for now it should still work since the app already serves there).
- [ ] **Step 4:** On mobile (or browser narrow), confirm responsive behavior: hero stacks, feature cards single-column, nav still functional.

### Task O3: Document Phase 1 → Phase 2 handoff

**Files:**
- Create: `docs/superpowers/specs/phase-2-prerequisites.md`

- [ ] **Step 1:** Write the handoff document

```markdown
# Phase 2 Prerequisites & Known Open Items

After Phase 1 completes, the following are required for Phase 2 (app migration into `apps/studio/`) to be straightforward:

## Required app-side changes (must happen in `billiesherwood/digital-wardrobe` BEFORE Phase 2)

1. **Add an `/auth` route** that handles Firebase Auth magic-link sign-in via `signInWithEmailLink()`. This is what the Phase 1 webhook sends customers to. Without it, paying customers receive a magic link that 404s.
2. **Update the app's Tailwind config** (or `@theme` declarations) to consume `@atelier/design-tokens` once the app moves into the monorepo. The current app uses standard Tailwind stone palette; alignment with the monorepo's brass/cream tokens may need a pass.

## Phase 2 itself (executed when user signals readiness)

1. Subtree-merge `billiesherwood/digital-wardrobe` history into `apps/studio/` via `git subtree add`.
2. Update `apps/studio/package.json` to depend on `@atelier/design-tokens` and `@atelier/ui`.
3. Replace any local copies of AtelierMark with the shared component.
4. Test `firebase deploy` from new location.
5. Archive `billiesherwood/digital-wardrobe`.

Reference: [`2026-06-18-atelier-monorepo-architecture-design.md`](2026-06-18-atelier-monorepo-architecture-design.md) § 8.
```

- [ ] **Step 2:** Commit

```bash
git add docs/superpowers/specs/phase-2-prerequisites.md
git commit -m "Document Phase 2 prerequisites and open items"
```

### Task O4: Push everything and announce

- [ ] **Step 1:** Push the final state to origin

```bash
git push origin main
```

- [ ] **Step 2:** Verify on GitHub: https://github.com/Talastron/atelier — confirm the latest commits are visible, README renders correctly, the file tree matches the structure outlined at the top of this plan.

- [ ] **Step 3:** Phase 1 complete. The marketing site is live at `https://myatelier.style`, commerce is operational, and the monorepo is structurally ready to absorb the app in Phase 2.

---

## Self-review notes (from plan author)

**Spec coverage:** Every section of the spec (Goals, Architecture, Monorepo, Marketing, Commerce, Deployment, Phased Migration, Risks) maps to one or more tasks above. Phase 2 of the spec is deliberately deferred to its own future plan.

**Type consistency:** Subscription record shape is defined once in `firestore.ts` (`SubscriptionRecord` interface) and consumed consistently in webhook handler and tests. Webhook handler uses the `mapStatus` helper to translate LS statuses to the internal enum.

**Known limitations of Phase 1:**

1. The app-side `/auth` handler for magic-link sign-in is documented as a Phase 2 prerequisite. Customers who subscribe during Phase 1 will receive a magic link that doesn't fully sign them in until the app adds the route. This is acceptable for early customers who can be onboarded manually; for general availability, ensure the app-side handler exists first.
2. Firestore security rules require a manual edit to the app repo (the one cross-repo touch in Phase 1). Coordinate with in-flight app work.
3. The journal has one stub post. Real content is a copywriting task, not architectural.
