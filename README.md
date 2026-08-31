# Collector’s Room — Rosser Gallery WebMCP

Collector’s Room is a standalone, public challenge implementation of **Story → Sculpture → Space → Review**. A visitor can describe the meaning and budget of a gift, let an agent curate reviewed Marcus Rosser works, see the same selection and configuration update in the page, inspect The Braider in web 3D or human-launched AR, and prepare a guarded quote or checkout review.

The experience is deliberately useful without an agent. Every tool-backed action has a manual control, every mutation is visible and reversible, and the standalone checkout adapter stops before external commerce.

## What WebMCP adds

The application feature-detects the experimental top-level API and registers seven imperative site tools with `document.modelContext.registerTool()`:

| Tool | Read-only | Visible or external effect |
|---|---:|---|
| `search_collection` | yes | Returns up to three reviewed matches; does not retain the visitor’s intent. |
| `inspect_artwork` | yes | Returns reviewed story, availability, price status, finish options, and capabilities. |
| `present_artwork` | no | Focuses an allowlisted work and optionally loads reviewed web 3D. Never launches native AR. |
| `configure_artwork` | no | Configures a Mini or eligible 6–60 inch custom-scale planning study. |
| `prepare_custom_quote` | no | Opens a 15-minute, non-PII, non-submitted planning review. |
| `prepare_checkout` | no | Opens a 10-minute exact Mini review that still requires confirmation. |
| `open_square_checkout` | no | Validates the exact review and stops at the standalone review-only boundary. |

Every input schema is strict, mutations require `expected_revision`, and results use this verification envelope:

```json
{
  "toolset_version": "1.0.0",
  "correlation_id": "opaque UUID",
  "status": "ok",
  "code": "artwork_presented",
  "effect": "The visible Collector’s Room presentation changed.",
  "state_revision": 2,
  "data": {},
  "next_action": "Review the visible presentation or configure the artwork."
}
```

Only the standard `readOnlyHint` annotation is used. Unsupported browsers keep the complete manual experience.

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
cp .env.example .env
npm install
npm run dev
```

Open the local URL printed by Vite. The safe default is `VITE_CHECKOUT_MODE=review_only`; this repository contains no Square secret, catalog identifier, customer data, or live provider function.

Run the full quality gate:

```bash
npm run check
```

Individual commands are `npm run lint`, `npm test`, `npm run build`, `npm run smoke`, and `npm run test:e2e`. The Playwright suite uses an already installed Google Chrome channel; it does not download a browser. It injects a `document.modelContext` shim before page load and verifies the exact seven-tool journey, visible state parity and Undo, review-only commerce, zero provider requests/navigation, and 390-pixel mobile overflow.

## Demo prompt

> I need a meaningful gift about trust for my sister. Keep it under $100, make it black, and I can pick it up in New Orleans. Show it to me before preparing checkout.

The expected path is The Braider → reviewed web 3D → Black Mini → signed-base preference → New Orleans pickup → exact review. A second prompt can temporarily configure an 18-inch Iron Gray custom-scale study and prepare its nonbinding range before returning to the Mini.

## Deploy

The included `netlify.toml` builds `dist/`, applies restrictive headers, caches versioned media, and supplies the SPA fallback. See [`docs/DEPLOY.md`](docs/DEPLOY.md) for preview, production, smoke, and rollback steps. The public demo remains review-only. A production site must provide a separate server-authoritative commerce adapter with CSRF, catalog validation, idempotency, rate limiting, and an allowlisted hosted Square destination.

## Security and privacy

- Tools accept only allowlisted work and finish identifiers—never arbitrary URLs, provider IDs, prices, or contact fields.
- Read tools do not mutate state. Mutations reject stale revisions.
- Logs contain event names, outcome codes, correlation IDs, and revision numbers only. Prompts and tool arguments are not logged.
- Quote and checkout reviews are in-memory, short-lived, and contain no PII.
- Native AR requires a human click. The tool surface cannot submit an inquiry, enter payment information, or complete a purchase.
- The standalone Square boundary makes no fetch and performs no external navigation.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the data flow and [`docs/execplans/collectors-room-webmcp.md`](docs/execplans/collectors-room-webmcp.md) for the implementation record.

## Licensing

Source code and documentation are MIT licensed. The Braider model, poster, and AR derivative are **not** MIT licensed; see [`ASSET_LICENSE.md`](ASSET_LICENSE.md) and [`MEDIA_MANIFEST.md`](MEDIA_MANIFEST.md). No high-resolution fabrication file is included.

Built by RT SOLUTIONS LLC for Rosser Gallery. “The Braider” by Marcus Rosser; included challenge media © RT SOLUTIONS LLC.
