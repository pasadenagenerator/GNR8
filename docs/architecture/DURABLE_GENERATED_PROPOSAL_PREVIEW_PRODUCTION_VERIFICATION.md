# Durable Generated Proposal Preview Production Verification

## Phase

P0-VERIFY - Durable Generated Proposal Bundle Production Materialization and
Preview Verification

## Date

2026-07-15

## Scope

This phase materialized only the two approved ODV
`generated_proposal_bundle` artifacts for:

```text
siteVersionId: 09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Approved production mutation:

```text
persist immutable generated_proposal_bundle artifacts for ODV Iteration 1 and
ODV Iteration 2 in the existing production runtime database
```

No publishing, deployment, hosting, Business Approval, provider execution, AI
execution, regeneration, Iteration 3, schema change, worker change, DNS
mutation, domain binding, compliance recomputation, upstream artifact rewrite,
or production website mutation was performed.

## Source Preflight

Preflight passed before any write.

| Check | Iteration 1 | Iteration 2 |
| --- | --- | --- |
| Source directory | `ODV_GENERATED_PROPOSAL_001/` exists | `ODV_GENERATED_PROPOSAL_002/` exists |
| Manifest parse | pass | pass |
| Entry file | `source/index.html` exists | `source/index.html` exists |
| Manifest-listed files | 3/3 exist | 8/8 exist |
| Local references | 2/2 resolve | 8/8 resolve |
| Symlinks | 0 | 0 |
| Proposal source ID | `ODV_GENERATED_PROPOSAL_001` | `ODV_GENERATED_PROPOSAL_002` |
| GeneratedWebsiteProposal artifact | `generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3` | `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e` |
| ProviderGenerationPayload artifact | `provider_generation_payload_0738b677c762f830c235dae425a8ec1c` | `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7` |
| WebsiteGenerationPackage artifact | `website_generation_package_c2c555025f186178f27c44c7cd272d4d` | `website_generation_package_c2c555025f186178f27c44c7cd272d4d` |
| GenerationImprovementPlan artifact | n/a | `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694` |

The existing materialization CLI was present:

```text
apps/platform/gnr8/architecture/generated-proposal-bundle-odv.cli.ts
```

The existing persistence boundary was the only write path used:

```text
persistGeneratedProposalBundle -> setSiteVersionImportProvenanceSummary
```

## Previous Bundle State

Production state before materialization:

```text
bundle count: 0
Iteration 1 by-iteration availability: false
Iteration 2 by-iteration availability: false
pre-existing bundle IDs: none
preview result before materialization: PREVIEW_UNAVAILABLE for both iterations
non-bundle provenance hash: 839a89dba37fd545772e25ba740dd1a95cb5b0cea81301ffc87009b9c7b46010
```

## Materialization

Command:

```text
set -a
source apps/platform/.env.production
set +a
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json apps/platform/gnr8/architecture/generated-proposal-bundle-odv.cli.ts
```

Result:

| Iteration | Bundle artifact ID | Bundle SHA-256 | Files | Bytes |
| --- | --- | --- | ---: | ---: |
| 1 | `generated_proposal_bundle_eb95bc58e327d009f2282cf6908dfdd4` | `c486d84b30f284042454b11ed0306981c8041b25f7b19cdcab43cbe02c06f4aa` | 11 | 28574 |
| 2 | `generated_proposal_bundle_d43921f4457b6f26254bc8bf104c2075` | `39307d8d5017ec28fba3cf41531bf381370cd8f065d645026bfd93172203ed03` | 17 | 39875 |

The CLI was given a narrow cleanup fix after the first run because it printed
successful materialization output but did not exit while the production DB pool
remained open. The fix closes the existing superadmin pool in the CLI process
only. It does not change bundle contract, persistence behavior, preview route,
schema, UI, worker behavior, or runtime serving.

## Bundle Integrity

Iteration 1:

```text
entry: source/index.html
css: source/styles.css
js: source/script.js
asset roles: metadata 7, manifest 1, entry_html 1, js 1, css 1
hash mismatches: 0
unsafe paths: 0
duplicate paths: 0
absolute filesystem paths: 0
validation: valid
warnings: no image/icon asset; no font asset
```

Iteration 2:

```text
entry: source/index.html
css: source/styles.css
js: source/script.js
representative image: source/assets/asset-inventory.svg
asset roles: metadata 8, manifest 1, image 5, entry_html 1, js 1, css 1
hash mismatches: 0
unsafe paths: 0
duplicate paths: 0
absolute filesystem paths: 0
validation: valid
warnings: no font asset
```

Fonts were not present in either source bundle, so font retrieval was not
applicable.

## Retrieval Verification

Both bundles loaded by artifact ID and by `siteVersionId + iteration`.

Representative persisted asset retrieval:

| Iteration | Entry | CSS | JS | Image | Font |
| --- | --- | --- | --- | --- | --- |
| 1 | `source/index.html`, 8796 bytes | `source/styles.css`, 6196 bytes | `source/script.js`, 577 bytes | n/a | n/a |
| 2 | `source/index.html`, 12357 bytes | `source/styles.css`, 7049 bytes | `source/script.js`, 1005 bytes | `source/assets/asset-inventory.svg`, 1043 bytes | n/a |

Missing asset returned safe `ASSET_NOT_FOUND`.

Unknown iteration returned safe `UNKNOWN_ITERATION`.

Traversal, encoded traversal, absolute path, and outside-bundle probes were
rejected by persisted asset resolution with `PATH_TRAVERSAL_REJECTED`.

## Idempotency

The exact materialization command was run a second time.

Result:

```text
Iteration 1 reused generated_proposal_bundle_eb95bc58e327d009f2282cf6908dfdd4
Iteration 2 reused generated_proposal_bundle_d43921f4457b6f26254bc8bf104c2075
bundle count before: 0
bundle count after materialization: 2
bundle count after retry: 2
latest bundle pointer after retry: generated_proposal_bundle_d43921f4457b6f26254bc8bf104c2075
non-bundle provenance hash after retry: 839a89dba37fd545772e25ba740dd1a95cb5b0cea81301ffc87009b9c7b46010
```

No duplicate immutable records were appended.

## Lineage Verification

Iteration 1 lineage:

```text
WebsiteGenerationPackage
-> ProviderGenerationPayload v1
-> GeneratedWebsiteProposal v1
-> GeneratedProposalBundle v1

website_generation_package_c2c555025f186178f27c44c7cd272d4d
-> provider_generation_payload_0738b677c762f830c235dae425a8ec1c
-> generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3
-> generated_proposal_bundle_eb95bc58e327d009f2282cf6908dfdd4
```

Iteration 2 lineage:

```text
WebsiteGenerationPackage
-> GenerationImprovementPlan
-> ProviderGenerationPayload v2
-> GeneratedWebsiteProposal v2
-> GeneratedProposalBundle v2

website_generation_package_c2c555025f186178f27c44c7cd272d4d
-> generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694
-> provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7
-> generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e
-> generated_proposal_bundle_d43921f4457b6f26254bc8bf104c2075
```

The Provider Payload, WGP, and Improvement Plan lineage is preserved in the
embedded source proposal manifest inside each bundle. The bundle contract was
not changed to add new top-level lineage fields.

Both bundles remain independently loadable, neither overwrites the other, and
both belong to the ODV Generation Cycle context.

## Filesystem Independence

The local source folders were temporarily renamed:

```text
ODV_GENERATED_PROPOSAL_001 -> ODV_GENERATED_PROPOSAL_001.__p0_verify_tmp
ODV_GENERATED_PROPOSAL_002 -> ODV_GENERATED_PROPOSAL_002.__p0_verify_tmp
```

While the folders were unavailable, production durable retrieval still passed:

```text
bundle count: 2
Iteration 1 by-iteration availability: true
Iteration 2 by-iteration availability: true
entry/CSS/JS retrieval: pass
Iteration 2 image retrieval: pass
preview resolution: 200 for both entries
```

The folders were restored immediately after verification. No production
filesystem packaging was altered.

## Production Browser Verification

Authenticated browser verification used a normal superadmin session.

Iteration 1 URL:

```text
https://app.pasadenagenerator.com/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e/iterations/1/preview/
```

Result:

```text
title: ODV Generated Website Proposal 001
PREVIEW_UNAVAILABLE: absent
quarantined wording: present
published/approved state: negated in page copy, not an approval state
stylesheet route: /iterations/1/preview/source/styles.css
stylesheet rules loaded: 62
script route: /iterations/1/preview/source/script.js
images: none in source bundle
fonts: none in source bundle
```

Iteration 2 URL:

```text
https://app.pasadenagenerator.com/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e/iterations/2/preview/
```

Result:

```text
title: ODV Generated Website Proposal 002
PREVIEW_UNAVAILABLE: absent
quarantined wording: present
published/approved state: negated in page copy, not an approval state
stylesheet route: /iterations/2/preview/source/styles.css
stylesheet rules loaded: 66
script route: /iterations/2/preview/source/script.js
image routes: /iterations/2/preview/source/assets/*.svg
representative direct SVG route: source/assets/asset-inventory.svg rendered
fonts: none in source bundle
```

The in-app browser blocked direct top-level navigation to CSS and JS asset
URLs with `ERR_BLOCKED_BY_CLIENT`, but the preview pages themselves loaded the
stylesheet route into `document.styleSheets`, exposed the script tag route, and
server-side persisted asset retrieval verified the stored CSS/JS bytes.

## Workspace Verification

Production Workspace URL:

```text
https://app.pasadenagenerator.com/gnr8/admin/workspace/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Result:

```text
route loaded: yes
PREVIEW_UNAVAILABLE: absent
quarantined wording: present
Iteration 1 preview link: present
Iteration 2 preview link: present
Iteration 1 preview iframe src: present
Iteration 2 preview iframe src: present
published/approved implication: absent
UX redesign: none
```

## Evolution Dashboard Verification

Production Evolution URL:

```text
https://app.pasadenagenerator.com/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

Result:

```text
route loaded: yes
PREVIEW_UNAVAILABLE: absent
Iteration 1 preview link: present
Iteration 2 preview link: present
historical iteration access: preserved
preview label context: Read-only quarantined proposal bundle, not a published website.
compliance/evolution recomputation: none
UX redesign: none
```

## Preview Security

Verified behavior:

- unauthenticated production request returns `401 UNAUTHORIZED`
- superadmin browser session can access both previews
- unknown iteration returns safe `UNKNOWN_ITERATION`
- missing file returns safe `ASSET_NOT_FOUND`
- `..` traversal rejected
- encoded traversal rejected
- absolute path rejected
- outside-bundle access rejected
- arbitrary filesystem path cannot be supplied through persisted asset lookup
- content types are explicit
- `cache-control: no-store`
- `x-content-type-options: nosniff`
- `referrer-policy: no-referrer`
- restrictive CSP includes `default-src 'none'`, `connect-src 'none'`,
  `form-action 'none'`, and sandboxing
- generated JavaScript is served as static bytes only; it is not executed
  server-side
- no write or mutation endpoint was added
- persisted bytes are served from the stored bundle artifact

## No-Write-Beyond-Scope

The pre-write, post-write, and post-retry non-bundle provenance hash remained:

```text
839a89dba37fd545772e25ba740dd1a95cb5b0cea81301ffc87009b9c7b46010
```

Only these top-level bundle fields were added to the existing
`importProvenanceSummary`:

```text
generatedProposalBundleArtifacts
latestGeneratedProposalBundleArtifact
```

No changes were detected to canonical upstream artifact families, including:

- GeneratedWebsiteProposal artifacts
- ProviderGenerationPayload artifacts
- WebsiteGenerationPackage artifacts
- GenerationImprovementPlan artifacts
- ObservedWebsiteModel artifacts
- Compliance artifacts
- Compliance Reports
- Evolution Analysis
- Business Discovery
- DBT
- WDB
- publishing state
- domains
- DNS
- schema
- workers
- UI state

## Validation Commands

Focused tests:

```text
NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test apps/platform/gnr8/architecture/generated-proposal-bundle-persistence.test.ts apps/platform/gnr8/architecture/generation-evolution-dashboard-projection.test.ts apps/platform/gnr8/architecture/generation-business-foundation-projection.test.ts apps/platform/app/gnr8/admin/generation-evolution-dashboard-page.test.ts
```

Vercel build:

```text
cd apps/platform && pnpm run vercel-build
```

Diff validation:

```text
git diff --check
```

## Remaining Limitations

- Neither source bundle contains font assets, so font retrieval was recorded
  as not applicable.
- Iteration 1 contains no image/icon asset; this matches the source bundle.
- The browser client blocks direct top-level navigation to CSS/JS asset URLs,
  but page-level stylesheet loading and server-side persisted asset retrieval
  both passed.
- The bundle contract preserves Provider Payload, WGP, and Improvement Plan
  lineage through the embedded manifest rather than new top-level bundle
  fields; the contract was intentionally not changed in P0-VERIFY.

## Result

P0-VERIFY succeeded.

ODV Iteration 1 and Iteration 2 now have immutable durable Generated Proposal
Bundle artifacts. Both existing production preview URLs render from durable
persisted bundle storage and no longer return `PREVIEW_UNAVAILABLE`.

Recommended next phase:

```text
P0-CLOSEOUT - Canonically close the milestone and return the next track to
product UX review.
```

P0-CLOSEOUT was later completed in:

```text
docs/architecture/DURABLE_GENERATED_PROPOSAL_PREVIEW_CLOSEOUT.md
```
