# TASK #40C - Copied Local Stylesheet Target Matching Fix for Final Persisted Preview Rewrite

## True root cause
- Final persisted-preview normalization matched stylesheet targets using direct raw path membership (`/x` -> `x`) against bundle file paths only.
- Equivalent local path forms (for example `./`, duplicate slashes, encoded segments, or output-path shape differences) could miss copied stylesheet targets, leaving root-relative `/assets/...` hrefs in persisted preview HTML.

## Exact stage fixed
- `apps/platform/gnr8/migration/temporary-preview-hosting.ts`
- Fixed in the persistent publish normalization stage (`maybeNormalizePersistedHtml`) used when writing uploaded/copied `.html` files.

## Canonical normalization rule used
- Canonical stylesheet target key is built deterministically by:
  - trimming,
  - decoding URL-encoded path segments,
  - converting `\` to `/`,
  - collapsing duplicate `/`,
  - POSIX-normalizing (`.`/`..`),
  - removing leading `./` and leading `/`,
  - rejecting empty/traversal outputs.
- Matching is then done against copied stylesheet output targets from the final bundle model, not source-only href assumptions.

## How matching works now
- Build a stylesheet matcher from copied `.css` bundle outputs (materialization `assetFiles` with `writeStatus: "copied"` plus bundle fallback scan).
- Exact canonical copied-output match is always preferred.
- Alias fallback (single interior-segment collapse) handles equivalent source/output path-shape differences.
- Ambiguous alias matches are detected and skipped deterministically.
- Eligible stylesheet links are rewritten to explicit page-relative hrefs (`./...` / `../...`) while preserving query/hash suffixes.
- Non-stylesheet links are not touched.

## Explicit diagnostics added
- If a root-relative stylesheet cannot be matched, emit:
  - `[preview.persisted_stylesheet_rewrite] unmatched stylesheet target ...`
- If alias fallback is ambiguous, emit:
  - `[preview.persisted_stylesheet_rewrite] skipped ambiguous stylesheet target ...`
- This prevents silent failure and makes residual issues diagnosable.
