# Local and Netlify deployment runbook

## Local verification

```bash
npm ci
cp .env.example .env
npm run check
npm run dev
```

Verify at mobile and desktop widths:

- manual curation works when `document.modelContext` is absent;
- The Braider poster loads before the user requests 3D;
- keyboard focus remains visible and every control is reachable;
- configuration, quote/checkout review, activity history, and Undo share one state revision;
- the review-only checkout button causes no network request or external navigation.

`npm run test:e2e` launches the site locally and uses the installed Google Chrome channel. It must report two passing browser checks before promotion; no Playwright browser download is needed.

## Netlify preview

1. Create a new Netlify site from the public repository.
2. Use the repository root, build command `npm run build`, and publish directory `dist`.
3. Set Node to 22. No secrets are required.
4. Keep `VITE_PUBLIC_WEBMCP_ENABLED=true`. This repository is unconditionally review-only; no checkout-mode setting is used.
5. Deploy a preview after `npm run check` passes locally, including the browser-shim E2E suite.
6. Inspect response headers, direct-route reload, GLB/USDZ MIME types, and the browser console.
7. Validate tool discovery in a supported ChatGPT desktop browser and confirm all seven names.

## Production promotion

Promote the exact tested commit and record the commit SHA, Netlify deploy ID, public URL, tool count, test receipt, and timestamp. Do not enable live commerce in this repository.

## Rollback

Use Netlify’s previous immutable production deploy. Re-run the manual curation and asset smoke checks after rollback. A WebMCP-only failure can also be mitigated by setting `VITE_PUBLIC_WEBMCP_ENABLED=false` and redeploying the same UI; manual behavior remains available.

## Provider integration

The public challenge app has no Netlify Function and no Square credentials. Integrate live checkout only in the production Gallery repository through its existing server-validated Square boundary. Never add access tokens or catalog identifiers to a `VITE_` variable.
