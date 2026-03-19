# Task 40A - Final Persisted Preview Stylesheet Emission + Entry Preview Link Priority

## True source of bug
- Persisted preview publishing had no final-stage HTML normalization safeguard.
- If a root-relative stylesheet href survived earlier rewrites in edge cases, persistent storage would upload and serve that broken href as-is.

## Exact stage fixed
- Persistent publish stage in `temporary-preview-hosting.ts`.
- Added deterministic HTML normalization during upload/copy for `.html`/`.htm` files.

## Stylesheet path rule now reaching persistent preview
- For `<link rel="stylesheet" href="/...">` inside persisted HTML:
  - If the target is a copied local bundle file, href is rewritten to explicit page-relative form (for example `./assets/...` or `../assets/...`).
  - Non-local/non-bundle targets are left unchanged.

## preview.rootUrl handling
- No routing behavior change.
- Operator surfaces now mark:
  - `previewEntryUrl` as primary
  - `previewRootUrl` as secondary/technical

## Remaining limitations
- This patch does not redesign earlier import/materialization rules; it adds a deterministic final guard at publish time.
- Non-stylesheet root-relative refs are not normalized by this publish-stage guard.
- Browser execution/crawling behavior remains out of scope.
