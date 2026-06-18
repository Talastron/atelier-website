# Phase 2 Prerequisites & Known Open Items

After Phase 1 completes, the following are required for Phase 2 (app migration into `apps/studio/`) to be straightforward.

## Required app-side changes (must happen in `billiesherwood/digital-wardrobe` BEFORE Phase 2)

1. **Add an `/auth` route** that handles Firebase Auth magic-link sign-in via `signInWithEmailLink()`. This is what the Phase 1 webhook sends customers to. Without it, paying customers receive a magic link that 404s.
2. **Update the app's Tailwind config** (or `@theme` declarations) to consume `@atelier/design-tokens` once the app moves into the monorepo. The current app uses standard Tailwind stone palette; alignment with the monorepo's brass/cream tokens may need a pass.
3. **Add Firestore security rules** for the new `subscriptions` and `processed_webhook_events` collections. Rules to deploy from the app repo:

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

Deploy with `firebase deploy --only firestore:rules` from the app repo. This is the ONE place Phase 1 requires touching the app repo — coordinate with in-flight app work.

## Phase 2 itself (executed when user signals readiness)

1. Subtree-merge `billiesherwood/digital-wardrobe` history into `apps/studio/` via `git subtree add`.
2. Update `apps/studio/package.json` to depend on `@atelier/design-tokens` and `@atelier/ui`.
3. Replace any local copies of `AtelierMark` with the shared `@atelier/ui` component.
4. Test `firebase deploy` from new location.
5. Archive `billiesherwood/digital-wardrobe` (add README pointing to `Talastron/atelier`).

Reference: [`2026-06-18-atelier-monorepo-architecture-design.md`](2026-06-18-atelier-monorepo-architecture-design.md) § 8.
