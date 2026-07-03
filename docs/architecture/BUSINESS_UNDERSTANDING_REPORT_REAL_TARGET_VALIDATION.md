# Business Understanding Report Real-Target Validation

## Phase And Boundary

Phase MVP-1C-R validates the MVP-1C Business Understanding Report contract,
builder, and persistence helpers against real ODV and ViroiDoc Digital Business
Twin artifacts.

This retry consumes the newly persisted MVP-1B-R DBT artifacts. It is
validation plus documentation. It does not add Business Alignment, Website
Design Brief, Website Generation Package, provider adapters, external AI,
generation, compliance, Business Approval, publishing changes, UI, API,
schema, or workers.

## Method

For each target, validation loaded the exact supplied DBT artifact by ID and
confirmed it was also the latest DBT artifact for the same site version and
dry run.

The validation path then executed:

```text
loadDigitalBusinessTwinArtifactById(...)
loadLatestDigitalBusinessTwinArtifact(...)
buildBusinessUnderstandingReportFromDigitalBusinessTwin(...)
persistBusinessUnderstandingReportArtifact(...)
loadLatestBusinessUnderstandingReportArtifact(...)
loadBusinessUnderstandingReportArtifactById(...)
persistBusinessUnderstandingReportArtifact(...) // idempotent retry
```

The retry used only the existing site-version `importProvenanceSummary`
artifact boundary. No fallback DBT was synthesized from Business Discovery.

## Target Results

| Target | siteVersionId | source DBT artifact | source DBT latest | BUR artifact | BUR status |
| --- | --- | --- | --- | --- | --- |
| ODV | `09dce7ea-d860-4f60-a1eb-26c3335b302e` | `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f` | yes | `business_understanding_report_7e65b85a7a983637ec5a77ed0be936ad` | `partial` |
| ViroiDoc | `e26b0754-988b-45b9-9e24-8e213179b6cf` | `digital_business_twin_4eb9e9260ba45b9efee236ec18769e92` | yes | `business_understanding_report_007e94c64a3fd1d637c7c6e3d64ded10` | `partial` |

## ODV Result

ODV source DBT:

- DBT artifact ID:
  `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f`
- DBT status: `partial`
- DBT dry run ID: `09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l`
- DBT knowledge items: `12`
- DBT missing knowledge records: `2`
- DBT limitations: `104`
- DBT confidence: `LOW`
- DBT confidence reasons: `missing_business_knowledge`,
  `website_only_business_discovery`
- Source DBT latest equality: yes

Persisted ODV BUR:

- BUR artifact ID:
  `business_understanding_report_7e65b85a7a983637ec5a77ed0be936ad`
- BUR ID:
  `business-understanding-report:09dce7ea-d860-4f60-a1eb-26c3335b302e:09dce7ea-d860-4f60-a1eb-26c3335b302e-8b-12l:digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f`
- Status: `partial`
- Sections: `14`
- Recommendations: `2`
- Limitations: `104`
- Confidence: `LOW`
- Diagnostics:
  `BUSINESS_UNDERSTANDING_REPORT_BUILDER_VERSION:MVP-1C`,
  `BUSINESS_UNDERSTANDING_REPORT_STATUS:partial`,
  `BUR_SOURCE_DBT_STATUS:partial`, `BUR_SECTION_COUNT:14`,
  `BUR_RECOMMENDATION_COUNT:2`, `BUR_MISSING_KNOWLEDGE_COUNT:2`,
  `BUSINESS_UNDERSTANDING_REPORT_ARTIFACT_VALID`

ODV Missing Knowledge section:

- Status: `partial`
- Content:
  - `audience: Business Discovery did not provide deterministic knowledge for audience.`
  - `offerings: Business Discovery did not provide deterministic knowledge for offerings.`
- Missing knowledge IDs: `dbt-missing:audience`,
  `dbt-missing:offerings`

ODV lineage:

- Site version:
  `09dce7ea-d860-4f60-a1eb-26c3335b302e`
- Source DBT artifact:
  `digital_business_twin_b4c2bc94df6c0c0f462c9fcce3f16b2f`
- Source DBT status: `partial`
- Source Business Discovery artifact:
  `business_discovery_7b37413651d79de0d109e31690a34b62`
- Upstream artifact refs include the source DBT, source Business Discovery,
  and `candidate_discovery_result_dbf786254717f980469b9b99853c14b8`.

## ViroiDoc Result

ViroiDoc source DBT:

- DBT artifact ID:
  `digital_business_twin_4eb9e9260ba45b9efee236ec18769e92`
- DBT status: `partial`
- DBT dry run ID: `e26b0754-988b-45b9-9e24-8e213179b6cf:8b-12n`
- DBT knowledge items: `17`
- DBT missing knowledge records: `1`
- DBT limitations: `105`
- DBT confidence: `LOW`
- DBT confidence reasons: `missing_business_knowledge`,
  `website_only_business_discovery`
- Source DBT latest equality: yes

Persisted ViroiDoc BUR:

- BUR artifact ID:
  `business_understanding_report_007e94c64a3fd1d637c7c6e3d64ded10`
- BUR ID:
  `business-understanding-report:e26b0754-988b-45b9-9e24-8e213179b6cf:e26b0754-988b-45b9-9e24-8e213179b6cf-8b-12n:digital_business_twin_4eb9e9260ba45b9efee236ec18769e92`
- Status: `partial`
- Sections: `14`
- Recommendations: `1`
- Limitations: `105`
- Confidence: `LOW`
- Diagnostics:
  `BUSINESS_UNDERSTANDING_REPORT_BUILDER_VERSION:MVP-1C`,
  `BUSINESS_UNDERSTANDING_REPORT_STATUS:partial`,
  `BUR_SOURCE_DBT_STATUS:partial`, `BUR_SECTION_COUNT:14`,
  `BUR_RECOMMENDATION_COUNT:1`, `BUR_MISSING_KNOWLEDGE_COUNT:1`,
  `BUSINESS_UNDERSTANDING_REPORT_ARTIFACT_VALID`

ViroiDoc Missing Knowledge section:

- Status: `partial`
- Content:
  - `audience: Business Discovery did not provide deterministic knowledge for audience.`
- Missing knowledge ID: `dbt-missing:audience`

ViroiDoc lineage:

- Site version:
  `e26b0754-988b-45b9-9e24-8e213179b6cf`
- Source DBT artifact:
  `digital_business_twin_4eb9e9260ba45b9efee236ec18769e92`
- Source DBT status: `partial`
- Source Business Discovery artifact:
  `business_discovery_360fa099cbcede288c2d0e04f2ec7986`
- Upstream artifact refs include the source DBT, source Business Discovery,
  and `candidate_discovery_result_3fb206dfc3324144ee0ab94b7f75ee64`.

## Reload And Idempotency

| Target | latest BUR reload equality | by-ID BUR reload equality | idempotent retry reused same artifact |
| --- | --- | --- | --- |
| ODV | yes | yes | yes |
| ViroiDoc | yes | yes | yes |

Both targets persisted reloadable BUR artifacts. A second call to
`persistBusinessUnderstandingReportArtifact(...)` with an equivalent rebuilt
artifact reused the same latest artifact for each target.

## Section And Recommendation Summary

ODV section summary:

| Section | Status | Content count | Knowledge items | Missing knowledge | Confidence |
| --- | --- | ---: | ---: | ---: | --- |
| `executive_summary` | `partial` | 3 | 12 | 2 | `LOW` |
| `business_overview` | `valid` | 2 | 2 | 0 | `MEDIUM` |
| `products_and_services` | `partial` | 1 | 0 | 1 | `LOW` |
| `target_audience` | `partial` | 1 | 0 | 1 | `LOW` |
| `business_goals` | `valid` | 2 | 2 | 0 | `MEDIUM` |
| `brand_identity` | `valid` | 1 | 1 | 0 | `LOW` |
| `current_digital_presence` | `valid` | 6 | 6 | 0 | `HIGH` |
| `trust_signals` | `valid` | 1 | 1 | 0 | `LOW` |
| `missing_knowledge` | `partial` | 2 | 0 | 2 | `LOW` |
| `confidence_overview` | `partial` | 15 | 12 | 2 | `LOW` |
| `recommendations` | `valid` | 2 | 0 | 2 | `LOW` |
| `limitations` | `partial` | 104 | 0 | 0 | `LOW` |
| `evidence_summary` | `valid` | 116 | 12 | 0 | `LOW` |
| `diagnostics` | `valid` | 6 | 0 | 0 | `LOW` |

ODV recommendations:

- `resolve_missing_audience`: Clarify who the business primarily serves before
  downstream planning begins.
- `resolve_missing_offerings`: Clarify the products or services before
  downstream planning begins.

ViroiDoc section summary:

| Section | Status | Content count | Knowledge items | Missing knowledge | Confidence |
| --- | --- | ---: | ---: | ---: | --- |
| `executive_summary` | `partial` | 3 | 17 | 1 | `LOW` |
| `business_overview` | `valid` | 2 | 2 | 0 | `MEDIUM` |
| `products_and_services` | `valid` | 1 | 1 | 0 | `LOW` |
| `target_audience` | `partial` | 1 | 0 | 1 | `LOW` |
| `business_goals` | `valid` | 3 | 3 | 0 | `MEDIUM` |
| `brand_identity` | `valid` | 1 | 1 | 0 | `LOW` |
| `current_digital_presence` | `valid` | 6 | 6 | 0 | `HIGH` |
| `trust_signals` | `valid` | 4 | 4 | 0 | `LOW` |
| `missing_knowledge` | `partial` | 1 | 0 | 1 | `LOW` |
| `confidence_overview` | `partial` | 20 | 17 | 1 | `LOW` |
| `recommendations` | `valid` | 1 | 0 | 1 | `LOW` |
| `limitations` | `partial` | 105 | 0 | 0 | `LOW` |
| `evidence_summary` | `valid` | 143 | 17 | 0 | `LOW` |
| `diagnostics` | `valid` | 6 | 0 | 0 | `LOW` |

ViroiDoc recommendation:

- `resolve_missing_audience`: Clarify who the business primarily serves before
  downstream planning begins.

## Human-Readability Result

ODV report readability:

- What the business appears to be: the report identifies imported host
  `odv-cvijanovic.si` and notes about/company wording `O nas`.
- Products/services understood: offerings remain unknown, and the report says
  Business Discovery did not provide deterministic offerings knowledge.
- Audience missing or known: audience remains unknown, and the report says
  Business Discovery did not provide deterministic audience knowledge.
- Brand/digital presence understood: the report describes imported assets,
  candidate discovery context, upstream evidence limitations, navigation
  section evidence, navigation labels, source URL, and the observed route.
- Knowledge missing: audience and offerings.
- Recommendations: the recommendations are business-oriented clarification
  requests for audience and offerings.

ViroiDoc report readability:

- What the business appears to be: the report identifies imported host
  `viroidoc.eu` and about/company wording from the observed site structure.
- Products/services understood: the report records an offering-area signal from
  website wording, `Terms of Service`.
- Audience missing or known: audience remains unknown, and the report says
  Business Discovery did not provide deterministic audience knowledge.
- Brand/digital presence understood: the report describes imported assets,
  candidate discovery context, upstream evidence limitations, footer and
  navigation section evidence, source URL, navigation labels, and the observed
  route.
- Knowledge missing: audience.
- Recommendations: the recommendation is a business-oriented clarification
  request for audience.

Both reports are human-readable enough for MVP-1C-R because they explain what
is known, what is missing, confidence, limitations, lineage, and recommended
business clarification without inventing missing knowledge.

## Limitations And Diagnostics

ODV limitations and diagnostics:

- Limitation count: `104`
- Missing source domains: `audience`, `offerings`
- Limitation samples include missing deterministic audience and offerings
  signals plus upstream import diagnostics such as
  `ASSET_FETCH_NON_OK`, `ASSET_FETCH_UNSUPPORTED_SCHEME`,
  `ASSET_REFERENCE_UNSUPPORTED`, and browser/capture diagnostics.
- BUR diagnostics record builder version `MVP-1C`, status `partial`, source
  DBT status `partial`, section count `14`, recommendation count `2`, missing
  knowledge count `2`, and artifact validity.

ViroiDoc limitations and diagnostics:

- Limitation count: `105`
- Missing source domain: `audience`
- Limitation samples include missing deterministic audience signal plus
  upstream import diagnostics such as `ASSET_FETCH_UNSUPPORTED_SCHEME`,
  `ASSET_REFERENCE_UNSUPPORTED`, and browser/capture diagnostics.
- BUR diagnostics record builder version `MVP-1C`, status `partial`, source
  DBT status `partial`, section count `14`, recommendation count `1`, missing
  knowledge count `1`, and artifact validity.

## Safety Result

The persisted BUR artifacts contain no forbidden downstream fields:

- no `businessAlignment`;
- no `websiteDesignBrief`;
- no `websiteGenerationPackage`;
- no `providerPayload`;
- no `prompt`;
- no `aiOutput`;
- no `generatedContent`;
- no `generatedHtml`;
- no `generatedReact`;
- no `generatedComponents`;
- no `generatedBlocks`;
- no `publishingArtifact`;
- no `deploymentArtifact`;
- no `executionArtifact`.

MVP-1C-R did not modify runtime behavior, UI, API, schema, workers, provider
adapters, generation, compliance, Business Approval, or publishing.

## Validation Result

MVP-1C-R retry succeeded for both ODV and ViroiDoc.

Command validation:

- Focused Business Understanding Report tests passed `19 / 19`:
  `NODE_OPTIONS='--conditions=react-server' pnpm exec tsx --test apps/platform/gnr8/architecture/business-understanding-report-contract.test.ts apps/platform/gnr8/architecture/business-understanding-report-builder.test.ts apps/platform/gnr8/architecture/business-understanding-report-persistence.test.ts`
- Initial sandbox execution of the `tsx` command hit the known local
  `listen EPERM ... tsx-501/*.pipe` issue; rerunning outside the sandbox
  reached the tests and passed.
- `cd apps/platform && pnpm run vercel-build` passed. The build emitted
  existing unrelated frontend lint warnings for hook dependency and `<img>`
  usage.
- `git diff --check` passed.

## Recommended Next Phase

Recommended next phase:

```text
MVP-1D Business Alignment Runtime Foundation
```

That phase should consume persisted Business Understanding Report artifacts and
stop before Website Design Brief, Website Generation Package, provider
adapters, external AI, generation, compliance, Business Approval, or
publishing.
