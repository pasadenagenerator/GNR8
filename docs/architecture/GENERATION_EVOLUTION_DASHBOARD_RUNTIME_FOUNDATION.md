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

The preview route is superadmin-only and read-only. It serves allowlisted
static proposal files only:

```text
Iteration 1 -> ODV_GENERATED_PROPOSAL_001/source/index.html
Iteration 2 -> ODV_GENERATED_PROPOSAL_002/source/index.html
```

Local relative CSS, JavaScript, SVG, image, JSON, and text assets under the
same `source/` tree resolve through the same route. The server never executes
generated JavaScript. JavaScript, if present, is sent as a static asset to the
browser. The route does not mutate proposal files and does not mark any
proposal approved, compliant, published, or deployed.

Preview security behavior:

- explicit iteration-to-bundle allowlist
- no arbitrary filesystem path from the URL
- path normalization before filesystem access
- rejection of `..`, absolute paths, encoded traversal, slash-containing
  segments, and backslash-containing segments
- realpath checks for symlink and outside-bundle escapes
- explicit content types
- `no-store`, `nosniff`, `no-referrer`, and restrictive CSP headers
- explicit unavailable state when a proposal source bundle is not present

Preview availability is filesystem-backed. It is available in local runtime
when the `ODV_GENERATED_PROPOSAL_001/` and `ODV_GENERATED_PROPOSAL_002/`
directories are packaged with the app runtime. A deployment that excludes
those folders must show preview unavailable rather than implying permanent
website availability.

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
