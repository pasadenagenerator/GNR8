# TASK #40 — Relative Head Stylesheet Rewrites + Residual Anchor Misclassification Guards

## What changed
- Head stylesheet rewrite emission now uses explicit page-relative hrefs for copied local stylesheets.
- Residual anchor rewrite eligibility is stricter: image-like anchors are rewritten only with deterministic gallery context.

## Deterministic stylesheet emission rule (exported head)
- For copied local stylesheet refs (`<link rel="stylesheet" href>`), rewrite target is still computed from page directory to copied output asset path.
- If the computed target is same-directory relative (for example `assets/styles.css`), emit `./assets/styles.css`.
- Never emit root-relative `/assets/...` for copied local stylesheets in exported HTML.
- Remote/data stylesheet refs remain unchanged and warning-visible.

## Hosted preview path correctness
- Explicit `./...` stylesheet refs resolve correctly under nested preview routes:
  - hosted preview entry URL form: `/validation/previews/by-output/<previewKey>/index.html`
  - static bundle root form: `<bundleRoot>/index.html`
- No pipeline copy/move behavior changed; only emitted href correctness changed.

## Residual safe-anchor eligibility rule
- Rewrite `<a href>` only when all are true:
  - local validated copied image reference,
  - image-like href,
  - anchor contains `img` or `picture`,
  - deterministic gallery context exists:
    - class/id/rel token contains gallery semantics (`gallery`, `lightbox`, `fancybox`, `photoswipe`, `portfolio`, `thumbnail`, `zoom`), or
    - href path contains gallery semantics (`gallery`, `lightbox`, `portfolio`).
- Explicitly do not rewrite anchors in `header`/`nav` context.
- When not eligible, preserve original anchor href and keep warning visibility (`ASSET_REFERENCE_REWRITE_SKIPPED_UNSAFE_ANCHOR`).

## Preserved non-image anchor intent classes
- logo/company links
- navigation links
- `tel:`
- `mailto:`
- `#fragment`
- ordinary internal/external content links
- empty wrapper anchors without deterministic gallery evidence

## Test coverage added/updated
- Static bundle tests now assert head stylesheet rewrites are emitted as explicit `./...` paths.
- Preview route serving test now asserts no root-relative `/assets/...` stylesheet hrefs in hosted preview HTML.
- Safe-anchor test now includes header/logo and generic content-wrapper image anchors that must remain unchanged.
- Existing gallery rewrite behavior remains covered and unchanged.
- Existing deterministic repeat-run coverage remains in place.

## Real URL-import impact (Transporti Maver / GpHribar-style)
- Exported head stylesheet refs no longer rely on root-relative `/assets/...` and resolve correctly under hosted preview nested routes.
- Residual header/logo/content-wrapper anchors are preserved when not deterministically gallery-safe, preventing incorrect image-target href rewrites.

## Remaining limitations
- No browser execution or multi-page crawl expansion.
- No CSS dependency expansion/transform engine redesign.
- Anchor policy intentionally prefers preservation over aggressive rewrites when gallery intent is ambiguous.
