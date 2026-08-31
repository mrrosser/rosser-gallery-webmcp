# ExecPlan: Collector’s Room standalone WebMCP application

**Owner:** RT SOLUTIONS LLC  
**Started:** 2026-08-30  
**Status:** Standalone implementation and local quality gate complete

## Objective

Deliver a self-contained Vite/React/TypeScript challenge application that demonstrates meaningful WebMCP leverage across collection discovery, shared visual state, reviewed 3D, deterministic custom-scale planning, and a guarded commerce review while remaining fully usable without an agent.

## Decisions

- Use the official imperative `document.modelContext.registerTool()` surface only.
- Register exactly seven narrowly scoped tools and use only `readOnlyHint` annotations.
- Keep one in-memory service as the authority for both human and agent actions.
- Require strict schemas, allowlisted identifiers, current state revisions, short-lived review IDs, and redacted logs.
- Include only the approved reduced Braider GLB, poster, and USDZ with a separate display-only asset license.
- Stop the public app at a review-only Square boundary. The live adapter belongs in production, not this repository.
- Load the GLB only after a human or tool asks for web 3D; provide a poster and non-WebGL story fallback.

## Work log

- [x] Scaffold Vite/React/TypeScript, environment template, lint/test/build/smoke commands, and Netlify configuration.
- [x] Implement reviewed catalog, strict tool contracts, versioned result envelope, redacted correlation logging, revisioned shared service, and Undo.
- [x] Implement editorial responsive UI, manual parity, on-demand model-viewer scene, configuration, temporary reviews, visible activity, and accessibility safeguards.
- [x] Copy and hash only the approved reduced Braider assets.
- [x] Document architecture, licensing, local operation, deployment, rollback, and production commerce boundary.
- [x] Complete lint, 14 unit/component tests, TypeScript build, Vite build, and artifact smoke.
- [x] Pass two Playwright browser-shim checks covering singleton seven-tool registration, representative agent flow, visible parity/Undo, zero provider traffic/navigation, and 390-pixel mobile overflow.
- [x] Inspect full-page desktop and 390-pixel mobile renders locally; verify responsive layout and manual journey.
- [ ] Perform supported ChatGPT tool-discovery checks on the deployed preview.

## Acceptance

- Exact tools: `search_collection`, `inspect_artwork`, `present_artwork`, `configure_artwork`, `prepare_custom_quote`, `prepare_checkout`, and `open_square_checkout`.
- Read calls do not change revision. Mutations visibly update the page and reject stale revisions.
- Custom height accepts 6–60 inches in 0.5-inch increments and produces a clearly nonbinding deterministic range.
- Mini review reflects the fixed $80 unit price and never completes a purchase.
- Native AR and final commerce remain human-controlled.
- No secret, provider ID, PII, prompt, or arbitrary URL appears in contracts, results, or logs.
- `npm run check` passes.

## Rollback and recovery

All state is in-memory, so reload restores the initial safe state. Deployment is a static artifact; rollback selects the previous Netlify deploy. WebMCP can be disabled independently without removing the manual experience.
