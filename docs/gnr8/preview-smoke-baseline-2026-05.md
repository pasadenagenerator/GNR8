# GNR8 Preview Smoke Baseline - 2026-05

Date: 2026-05-13  
Scope: Documentation/test evidence only. No runtime behavior changes, importer changes, or preview shim changes.

## Baseline Summary

| Site | siteVersionId | executionMode | smoke result | preview route status | required assets | forbidden fallback markers | duplicated preview-assets prefix | native scrollIcon | map | gallery |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Maver | `88253466-783e-4484-8b68-df6c83b8a11c` | `route_harness` | PASS | 200 | PASS | absent | absent | native-only, no fallback, no glyph injection, no visual shim | present | present |
| Roboplast | `30bfe5b1-a441-41ef-92e3-0d6b3ee678e1` | `route_harness` | PASS | 200 | PASS | absent | absent | native-only, no fallback, no glyph injection, no visual shim | present | present |

Smoke aggregate: `PASS/PASS`

## Known Non-Blocking Noise

- Permissions-Policy `browsing-topics` warning.
- Analytics blocked by client.
- Optional Roboplast PDF prefetch 404 classified as non-blocking (`optional_document_asset`).
- quicklink/prefetch noise classified/suppressed where interceptable (`prefetch_noise`).

## Exact Validation Commands

- Route harness smoke command:

```bash
cd apps/platform && set -a; source .env.production; set +a; NODE_OPTIONS='--conditions=react-server' pnpm exec tsx gnr8/runtime/preview-smoke/preview-smoke-validator.cli.ts --execution-mode=route_harness --maver-site-version-id=88253466-783e-4484-8b68-df6c83b8a11c --roboplast-site-version-id=30bfe5b1-a441-41ef-92e3-0d6b3ee678e1
```

- preview-smoke-validator tests:

```bash
cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/preview-smoke/preview-smoke-validator.test.ts
```

- preview-route tests:

```bash
cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test app/api/gnr8/runtime/_tests/preview-route-content-debug-access.test.ts
```

- preview-assets tests:

```bash
cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test app/api/gnr8/runtime/_tests/preview-assets-route-handlers.test.ts
```

- unified-render-preview tests:

```bash
cd apps/platform && NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test gnr8/runtime/unified-render-preview.test.ts
```

- build:

```bash
cd apps/platform && pnpm exec next build
```

## Do Not Regress

- Never reintroduce GNR8 back-to-top fallback.
- Never visually restyle native `scrollIcon` in preview shim.
- Never hardcode non-existent unhashed stylesheet paths as required assets.
- Preserve Maver CSS background asset rewrite.
- Preserve Roboplast hashed local stylesheet behavior.
