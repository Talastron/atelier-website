# Atelier

Quiet luxury for your wardrobe.

This monorepo houses the Atelier marketing site (`apps/marketing`) and, after Phase 2, the Atelier studio app (`apps/studio`). Shared design tokens and React components live in `packages/`.

## Structure

- `apps/marketing` — Astro 5 marketing site, deployed to Cloudflare Pages at https://myatelier.style
- `apps/studio` — *(populated in Phase 2)* the wardrobe app, deployed to Firebase Hosting at https://edit.myatelier.style
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
- Phase 2 prerequisites: [`docs/superpowers/specs/phase-2-prerequisites.md`](docs/superpowers/specs/phase-2-prerequisites.md)
