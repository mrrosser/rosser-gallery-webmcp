# Challenge work record

Collector's Room is a new, standalone WebMCP challenge application built on artwork, brand material, and production capabilities that existed before the OpenAI WebMCP Challenge began on August 25, 2026. This record separates those two bodies of work.

## Pre-challenge baseline

The production Rosser Gallery source baseline is commit `2c81885c572d6e47c112513a634e82110ed37092`, authored and committed on August 24, 2026 at 15:55:14 CDT. RT SOLUTIONS LLC preserved that exact commit after the challenge began as private-repository branch `release/rosser-gallery-prod-20260824` and tag `prod-2026-08-24-6a8cafea`. The preservation refs were created later; the commit timestamp and matching Netlify deploy `6a8cafea90f605cf616ab667` identify the pre-challenge state.

That baseline already contained:

- the Rosser Gallery brand, catalog, artwork stories, and The Braider media;
- the interactive 3D/AR presentation;
- the human-operated Mini configuration and checkout path;
- the custom-scale planner and production Square integration; and
- the OpenAI Realtime “Ask The Braider” guide.

The production repository remains private and is not represented as part of this public source submission. The identifiers above are retained evidence for the entrant and challenge reviewers if requested.

## Work created after August 25, 2026

The public challenge repository was created specifically for this challenge. Its initial implementation commit is `1957352652350deb4a0143a4d1581eb4b02d50e7`, authored and committed on August 30, 2026 at 21:58:54 CDT. The repository's dated Git history records later review corrections.

The challenge work includes:

| Area | New challenge implementation |
|---|---|
| WebMCP | Seven strict `document.modelContext.registerTool()` contracts for discovery, inspection, presentation, configuration, planning review, checkout review, and the final review-only boundary. |
| Shared state | One revisioned service used by both manual controls and site tools, with stale-state rejection, visible activity, correlation IDs, and Undo. |
| Experience | A dedicated Collector's Room journey from intent to reviewed artwork, web 3D, configuration, custom-scale planning, and exact Mini review. |
| Safety boundary | Short-lived reviews and a deterministic public boundary that validates the exact current review, creates no payment, makes no Square request, and performs no external navigation. The tool contract instructs the agent to obtain explicit user confirmation before calling it. |
| Quality | Strict-schema, catalog-policy, service, component, browser-shim, manual-fallback, mobile-overflow, and zero-provider-request checks. |
| Packaging | A reproducible public Vite application, MIT-licensed source, separate limited media license, architecture/deploy documentation, and challenge-specific demo materials. |

## Reuse boundary

The reduced Braider poster, GLB, and USDZ are pre-existing entrant-owned media included so reviewers can run the new challenge experience. They are not presented as newly modeled during the challenge and are licensed separately in `ASSET_LICENSE.md`. No fabrication-source geometry is included.

The production Square adapter is also pre-existing, but it is not copied into or called by this repository. The submitted app stops at `review_only`.

## Release evidence

- Public source: <https://github.com/mrrosser/rosser-gallery-webmcp>
- Initial challenge commit: `1957352652350deb4a0143a4d1581eb4b02d50e7`
- Initial immutable preview deploy: `6a94ee615e010a72a17562ee`
- Initial immutable preview URL: <https://6a94ee615e010a72a17562ee--rosser-gallery-webmcp.netlify.app/>
- Final reviewed commit and deploy: recorded in the submission receipt after the readiness review.

All dates above use America/Chicago local time unless an ISO offset is shown.
