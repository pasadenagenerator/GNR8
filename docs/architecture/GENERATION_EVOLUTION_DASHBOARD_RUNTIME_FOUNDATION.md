# Generation Evolution Dashboard Runtime Foundation

## Phase Boundary

MVP-3.0-A implements the first real product-facing GNR8 Runtime UX surface:
the Generation Evolution Dashboard for ODV site version
`09dce7ea-d860-4f60-a1eb-26c3335b302e`.

The implementation is read-only. It consumes existing canonical artifacts and
existing site-version provenance. It does not create business truth, edit
artifacts, approve output, publish output, deploy output, mutate DNS, mutate
production, execute providers, execute AI, run workers, change schema, change
persistence, recompute compliance, or perform automatic visual comparison.

## Runtime Route

Dashboard route:

```text
/gnr8/admin/evolution/[siteVersionId]
```

ODV dashboard route:

```text
/gnr8/admin/evolution/09dce7ea-d860-4f60-a1eb-26c3335b302e
```

The page is server-rendered, guarded by `requireSuperadminUserIdForPage`, and
contains no forms, editable inputs, generation controls, approval controls,
publishing controls, deployment controls, provider execution controls, AI
controls, DNS controls, or mutation server actions.

## Projection

Runtime projection:

```text
apps/platform/gnr8/architecture/generation-evolution-dashboard-projection.ts
```

The projection is not a canonical artifact. It is a read model derived from
the existing `siteVersion.importProvenanceSummary` artifact history. It groups
artifacts into Iteration 1 and Iteration 2 by existing lineage, source
references, artifact IDs, diagnostics, source metadata, and the persisted
Generation Evolution Analysis.

The projection exposes:

- `GenerationEvolutionDashboardProjection`
- `GenerationCycleSummaryProjection`
- `GenerationIterationProjection`
- `GenerationArtifactLinkProjection`
- `GenerationPreviewProjection`
- `GenerationComplianceSummaryProjection`
- `GenerationEvolutionSummaryProjection`
- `GenerationDashboardAttentionState`

Lineage ambiguity fails closed into the `lineage_ambiguity` attention state.
Missing upstream records remain visible as missing references.

## ODV Runtime History

Generation Cycle:

```text
ODV Generation Cycle
```

Iteration 1:

```text
Provider Payload: provider_generation_payload_0738b677c762f830c235dae425a8ec1c
Generated Proposal: generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3
Observed Website: observed_website_model_35499a9cb91a15740910532d451a739a
Compliance: generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7
Compliance Report: generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de
Improvement Plan: generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694
Generated source bundle: ODV_GENERATED_PROPOSAL_001/
```

Iteration 2:

```text
Provider Payload: provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7
Generated Proposal: generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e
Observed Website: observed_website_model_0d5e829f546745b1433557978c875626
Compliance: generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b
Evolution Analysis: generation_evolution_analysis_89ab4005fcb11ef4d00682f7a86c1253
Generated source bundle: ODV_GENERATED_PROPOSAL_002/
```

Shared business foundation:

```text
Business Discovery: business_discovery_7b37413651d79de0d109e31690a34b62
Digital Business Twin: digital_business_twin_2614a690e29e87a201658f3de4f72983
Business Understanding Report: business_understanding_report_7e65b85a7a983637ec5a77ed0be936ad
Business Alignment: business_alignment_18c0a6958048bf8985044e4781e788a8
Website Design Brief: website_design_brief_ff19a711c948d28fdd58bdea521c4f59
Website Generation Package: website_generation_package_c2c555025f186178f27c44c7cd272d4d
```

## Preview Boundary

Preview routes:

```text
/gnr8/admin/evolution/[siteVersionId]/iterations/1/preview/
/gnr8/admin/evolution/[siteVersionId]/iterations/2/preview/
```

The preview route is superadmin-only and read-only. As of P0 Durable
Generated Proposal Preview Runtime Foundation, it serves allowlisted persisted
Generated Proposal Bundle artifacts only:

```text
Iteration 1 -> generated_proposal_bundle -> source/index.html
Iteration 2 -> generated_proposal_bundle -> source/index.html
```

Relative CSS, JavaScript, SVG, image, JSON, icon, font, and manifest assets
resolve from persisted bundle bytes through the same route. The server never
executes generated JavaScript. JavaScript, if present, is sent as a static
asset to the browser. The route does not mutate proposal files and does not
mark any proposal approved, compliant, published, or deployed.

Preview security behavior:

- explicit iteration-to-bundle allowlist
- no arbitrary filesystem path from the URL
- path normalization before persisted asset lookup
- rejection of `..`, absolute paths, encoded traversal, slash-containing
  segments, and backslash-containing segments
- explicit content types
- `no-store`, `nosniff`, `no-referrer`, and restrictive CSP headers
- explicit unavailable state when a persisted proposal bundle is not present

Preview availability is artifact-backed. The route no longer checks
`ODV_GENERATED_PROPOSAL_001/` or `ODV_GENERATED_PROPOSAL_002/` during preview.
P0-VERIFY materialized the durable ODV bundle artifacts in the production
runtime database with explicit operator approval:

```text
Iteration 1: generated_proposal_bundle_eb95bc58e327d009f2282cf6908dfdd4
Iteration 2: generated_proposal_bundle_d43921f4457b6f26254bc8bf104c2075
```

Both production preview URLs now render from persisted bundle storage and no
longer return `PREVIEW_UNAVAILABLE`.

GX-2 Knowledge Workspace polish reuses these same preview routes. The
Workspace frames generated proposal previews as quarantined proposal previews,
does not claim they are published websites, and does not add screenshot
generation, image pipelines, storage, API changes, or proposal asset mutation.

Canonical durable preview record:

```text
docs/architecture/GENERATED_PROPOSAL_BUNDLE_RUNTIME.md
```

Canonical production verification record:

```text
docs/architecture/DURABLE_GENERATED_PROPOSAL_PREVIEW_PRODUCTION_VERIFICATION.md
```

## Attention States

The dashboard projects these read-only states:

- `missing_generation_cycle_data`
- `missing_iteration_artifact`
- `missing_proposal_bundle`
- `preview_unavailable`
- `compliance_non_compliant`
- `compliance_partial`
- `improvement_available`
- `evolution_improved`
- `unresolved_knowledge_present`
- `limitations_present`
- `lineage_ambiguity`

These states are operator visibility only. They do not trigger recomputation,
provider execution, approval, publishing, deployment, DNS mutation, or
production mutation.

## MVP-3.0-B Verification Status

MVP-3.0-B performed and completed the first local real-target authenticated
browser verification pass for the ODV dashboard and preview boundary.

Canonical verification record:

```text
docs/architecture/GENERATION_EVOLUTION_DASHBOARD_REAL_TARGET_VERIFICATION.md
```

The local runtime served the app at `http://localhost:3000`. The authenticated
local browser session was authorized through the existing `SUPERADMIN_EMAILS`
allowlist in an ignored local env file. No auth bypass was introduced, no
authorization logic changed, and the private local email value is not
documented.

The real ODV projection verified current iteration `2`, cycle state
`improving`, overall trajectory `improved`, latest compliance
`non_compliant`, latest evolution assessment `meaningful_improvement`, latest
recommendation `create_compliance_report_v2`, and business confidence
`HIGH from persisted artifacts`.

Both allowlisted proposal previews resolved locally through the rendered
dashboard links. Iteration 1 served styled `source/index.html`,
`source/styles.css`, and `source/script.js`. Iteration 2 served the same core
files plus local SVG assets under `source/assets`, all with browser-observed
200 responses and no broken image elements.

The verification pass made narrow rendering fixes only: the dashboard preview
label was narrowed from `Generated Website` to `Generated Proposal Preview`,
artifact lineage keys were made unique, and preview HTML now rewrites local
`./...` asset references through `/preview/source/` so CSS, JavaScript, and
SVG assets resolve in the browser. No authorization logic, artifact grouping,
persistence, schema, provider, AI, worker, approval, publishing, deployment,
DNS, production behavior, canonical artifact, or generated source bundle
changed.

## Runtime UX Pairing After MVP-3.0-C

MVP-3.0-C adds the second read-only Runtime UX surface:

```text
/gnr8/admin/business-foundation/[siteVersionId]
```

Canonical document:

```text
docs/architecture/BUSINESS_FOUNDATION_RUNTIME_UX.md
```

The Business Foundation page answers why GNR8 generated a website the way it
did by visualizing the persisted business-understanding chain from Business
Discovery through Website Generation Package. The Generation Evolution
Dashboard remains the historical view of how generated website iterations
evolved over time.

Together:

```text
Business Foundation
(WHY)
↓
Generation Evolution Dashboard
(HOW)
```

The pairing is read-only. It does not add artifact editing, Business Alignment
editing, generation controls, regeneration controls, approval controls,
publishing, deployment, provider execution, AI execution, DNS controls,
workers, schema changes, persistence changes, or mutation server actions.

MVP-3.0-D added plain read-only cross-links between the pair. Generation
Evolution now links to `Inspect Business Foundation`, and Business Foundation
links back to `Inspect Generation Evolution`. The links clarify that Business
Foundation explains WHY while Generation Evolution explains HOW; they do not
create a broader workspace shell or any mutation behavior.

MVP-3.1-A strengthens the Business Foundation side of this pairing. Business
Foundation now presents Website Versions near the top, including Original
Website, Iteration 1 preview, and Iteration 2 preview, and uses the existing
Generation Evolution Dashboard projection to expose persisted iteration
status, compliance state, improvement state, and preview links. The Evolution
Dashboard and preview routes are not recomputed or mutated by this phase.

The pairing remains:

```text
Business Foundation product story
-> Generation Evolution history
-> Quarantined generated proposal previews
```

The latest generated proposal remains read-only, quarantined, not approved,
not published, and non-compliant overall.

## Validation

Focused tests:

```text
pnpm exec tsx --tsconfig apps/platform/tsconfig.json --test \
  apps/platform/gnr8/architecture/generation-evolution-dashboard-projection.test.ts \
  apps/platform/app/gnr8/admin/generation-evolution-dashboard-page.test.ts
```

Required build:

```text
cd apps/platform && pnpm run vercel-build
```

## GX-1 Knowledge Workspace Relationship

GX-1 adds the Knowledge Workspace as the first-open operator shell:

```text
/gnr8/admin/workspace/[siteVersionId]
```

Generation Evolution remains the supporting page for iteration history,
proposal previews, compliance state, and improvement state. The Workspace
pulls the existing Generation Evolution Dashboard projection into product
sections for Website Versions, Transformation Story, Workspace Health, and
Advanced details.

GX-1 adds a read-only `Open Knowledge Workspace` link from Generation
Evolution. It does not alter evolution analysis, compliance artifacts,
proposal preview route handling, generation lineage, persistence, schema,
API, workers, AI, publishing, deployment, DNS, or runtime architecture.
