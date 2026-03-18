# Task 21 Implementation Note: `real-site-03`

## Edge cases included
- Deeper uneven wrappers with body-level single-child wrapper promotion.
- A direct-text wrapper (`.shell`) that forces block extraction to stop.
- Empty structural wrappers (`.structural-empty`, `.structural-empty-2`).
- Mixed local asset forms (`./assets/...`, `assets/...`, `/assets/...`).
- Missing local asset reference in an extractor-supported tag (`<img src="/assets/missing-chart.svg">`).
- Unsupported remote asset reference (`<script src="https://cdn.example.invalid/...">`).
- Unsupported data URL asset reference (`<img src="data:image/svg+xml;base64,...">`).
- Div-based section markup (`<div class="band" data-layout="div-section">`) instead of semantic `<section>`.

## Structured warnings/errors produced
- `unsupported_remote_asset` (warning).
- `unsupported_data_url_asset` (warning).
- `missing_local_asset` (error; deterministic and inspectable).

## Block extraction behavior
- Rule remains `body_child_elements_with_single_child_wrapper_promotion_v2`.
- Promotion depth is `1` (`html>body > .page-root` is promoted).
- Extraction stops at `.shell` because direct non-whitespace text is present.
- Import manifest is `success_with_warnings` under degraded-asset policy, so page eligibility remains `eligible` and blocks are materialized.

## Preview behavior
- Preview generation remains deterministic with a `previewable` page.
- Warnings remain visible through diagnostics, approval, execution, and run report surfaces.

## Shell/API exposure
- Shell page route: `/validation/real-site-03`
- API route: `/api/validation/real-site-03`
- Shared runner path remains `runRealSiteValidation({ fixtureId: "real-site-03", ... })`.
