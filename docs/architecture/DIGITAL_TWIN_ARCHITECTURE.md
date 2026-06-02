# Website Digital Twin Architecture

## Status
- Draft: canonical architecture direction
- Scope: architecture + first implemented runtime twin baseline + first browser-visible runtime surface
- Non-goals: no runtime changes outside twin types/builder/store/viewer/preview surface baseline, no APIs, no database changes

## Purpose
The Website Digital Twin is the continuously updated operational representation of a website inside GNR8.

The twin is not HTML.

The twin is not the deployed frontend.

The twin is the operational understanding of the website.

First operational runtime contract reference:
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`

Twin generation canonical reference:
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`

Twin observation canonical reference:
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`

Twin optimization canonical reference:
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`

First operational implementation slice reference:
- `docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md`

## Core Twin Domains
Canonical Digital Twin runtime domains for first operational twin:
- Content State
- Design State
- Experience State
- Governance State
- Operational State

Future architecture domain (out of first operational runtime contract):
- Intelligence State

## Twin Identity
Canonical first operational identity fields:
- `twinId`
- `siteId`
- `siteVersionId`
- `workspaceId`
- `environmentScope`
- `status`
- `createdAt`
- `updatedAt`

## Twin Status
Canonical first operational states:
- `building`
- `ready`
- `stale`
- `failed`

## Twin Relationships
Canonical Digital Twin relationship graph:

```text
Import Pipeline Output
  -> Twin Generation Architecture

Twin Generation Architecture
  -> Twin Runtime Contract

Twin Runtime Contract
  -> Digital Twin Runtime Object

Digital Twin Runtime Object
  -> Content Model

Digital Twin Runtime Object
  -> Design Model

Digital Twin Runtime Object
  -> Experience Model

Digital Twin Runtime Object
  -> Workspace Overview
```

## Twin Observations and Scoring Boundary
Observation, scoring, and recommendation layers remain outside the first operational runtime contract.

These stay architecture-layer integrations until later runtime phases:
- Twin Observation Architecture
- Twin Optimization Architecture
- Website Intelligence Architecture

## AI Relationship
AI boundaries for the first operational runtime contract:
- AI does not directly mutate the Twin.
- AI output is not required in Twin Snapshot v1.
- AI recommendations are out of scope.
- AI cannot bypass governance.
- AI cannot publish directly.

## Workspace Relationship
The Website Overview screen represents the Website Digital Twin.

The Overview is the primary first-operational visualization of the Twin.

First operational visibility target:
- `identity`
- `status`
- `snapshot`
- `metadata`
- `diagnostics`

Viewer dependency boundary:
- no scoring engine required
- no recommendation engine required
- no optimization engine required
- no AI editor required
- no publish runtime required

## Governance Principles
The Digital Twin architecture follows these principles:
- evidence before observation
- observation before recommendation
- recommendation before proposal
- proposal before mutation
- approval before publish
- audit before execution

## Current State
Architecture baseline with first implemented runtime twin slice.

Explicitly:
- twin runtime types implemented (`apps/platform/gnr8/runtime/twin/twin-types.ts`)
- deterministic twin builder implemented (`apps/platform/gnr8/runtime/twin/twin-builder.ts`)
- twin-builder tests implemented and passing (`apps/platform/gnr8/runtime/twin/twin-builder.test.ts`)
- twin in-memory store implemented (`apps/platform/gnr8/runtime/twin/twin-store.ts`)
- twin-store tests implemented and passing (`apps/platform/gnr8/runtime/twin/twin-store.test.ts`)
- no scoring engine implemented
- no observation engine implemented
- no recommendation engine implemented
- no recommendation runtime implemented
- no optimization engine implemented
- no prioritization engine implemented

Deterministic builder baseline confirmed:
- `twinId` derived from `siteId + siteVersionId + environmentScope`
- controlled timestamps via `nowIso` or `clock`
- `ready` status for valid input
- deterministic throw for missing `siteId`/`siteVersionId`
- diagnostics: `TWIN_BUILD_STARTED`, `TWIN_IDENTITY_CREATED`, `TWIN_SNAPSHOT_CREATED`, `TWIN_BUILD_SUCCEEDED`

Twin store baseline confirmed:
- interface: `TwinStore`
- implementation: `InMemoryTwinStore`
- methods: `saveTwin(twin)`, `getTwin(twinId)`, `getTwinBySiteVersion(siteVersionId)`, `listTwins()`, `clear()`
- diagnostics: `TWIN_STORE_SAVE_SUCCEEDED`, `TWIN_STORE_GET_SUCCEEDED`, `TWIN_STORE_LIST_SUCCEEDED`
- behavior: map-based storage, latest twin per `siteVersionId` tracking, multiple twins supported, twin payloads are not mutated, runtime-memory only
- boundaries: no database, no Supabase, no persistence, no API routes, no Workspace UI, no scoring, no recommendations, no AI

Twin viewer read-model helper baseline confirmed:
- runtime files: `apps/platform/gnr8/runtime/twin/twin-viewer.ts`, `apps/platform/gnr8/runtime/twin/twin-viewer.test.ts`
- implemented type: `TwinOverview`
- implemented function: `createTwinOverview(twin)`
- mapped fields: `twinId`, `siteId`, `siteVersionId`, `workspaceId`, `environmentScope`, `status`, `contentSummary`, `designSummary`, `experienceSummary`, `governanceSummary`, `operationalSummary`, `lastUpdated`, `diagnostics`
- diagnostics: `TWIN_OVERVIEW_CREATED`
- validation: twin-viewer tests passed, next build passed
- boundaries unchanged: no Workspace UI yet, no React, no database, no API, no AI, no optimization, no scoring, no recommendations

Workspace Overview Twin Preview UI milestone confirmed:
- route: `/gnr8/admin/twin-preview`
- runtime chain: `buildWebsiteDigitalTwin()` -> `InMemoryTwinStore` -> `getTwinBySiteVersion()` -> `createTwinOverview()` -> browser-rendered read-only preview
- verified deployed values:
  - `title`: `Website Digital Twin Runtime Preview`
  - `subtitle`: `Read-only validation surface`
  - `status`: `ready`
  - `environmentScope`: `preview`
  - `contentSummary`: `pages=1; sections=8; detectedTitle=Northstar Widgets — Simple Marketing Site; homepagePath=index.html`
  - `designSummary`: `assets=5; layoutEvidence=available`
  - `experienceSummary`: `navigationEvidence=available; homepageDetected=true`
  - `governanceSummary`: `sourceImportId=import_real-site-01_c167859409d8; sourceSiteVersionId=site_version_real-site-01_072929becae7; readOnly=true`
  - `operationalSummary`: `environmentScope=preview; providerState=preview/runtime-only`
- diagnostics:
  - `TWIN_BUILD_STARTED`
  - `TWIN_IDENTITY_CREATED`
  - `TWIN_SNAPSHOT_CREATED`
  - `TWIN_BUILD_SUCCEEDED`
  - `TWIN_STORE_SAVE_SUCCEEDED`
  - `TWIN_STORE_GET_SUCCEEDED`
  - `TWIN_STORE_LIST_SUCCEEDED`
  - `TWIN_OVERVIEW_CREATED`
- boundaries:
  - read-only validation surface
  - no editing
  - no actions
  - no forms
  - no publish
  - no AI
  - no scoring
  - no recommendations

Twin Snapshot Hydration from Imported Site Model milestone confirmed:
- route: `/gnr8/admin/twin-preview-real`
- source:
  - `fixtureId`: `real-site-01`
- runtime chain: `buildWebsiteDigitalTwin()` -> `InMemoryTwinStore` -> `getTwinBySiteVersion()` -> `createTwinOverview()` -> browser-rendered read-only preview
- verified values:
  - `title`: `Website Digital Twin Runtime Preview (Real Site)`
  - `sourceSiteVersionId`: `site_version_real-site-01_072929becae7`
  - `sourceImportId`: `import_real-site-01_c167859409d8`
  - `status`: `ready`
  - `environmentScope`: `preview`
  - `contentSummary`: `pages=1; sections=8; detectedTitle=Northstar Widgets — Simple Marketing Site; homepagePath=index.html`
  - `designSummary`: `assets=5; layoutEvidence=available`
  - `experienceSummary`: `navigationEvidence=available; homepageDetected=true`
  - `governanceSummary`: `sourceImportId=import_real-site-01_c167859409d8; sourceSiteVersionId=site_version_real-site-01_072929becae7; readOnly=true`
  - `operationalSummary`: `environmentScope=preview; providerState=preview/runtime-only`
- implemented evidence fields:
  - `pageCount`
  - `sectionCount`
  - `assetCount`
  - `detectedTitle`
  - `detectedHomepagePath`
  - `providerStateSummary`
- diagnostics:
  - `TWIN_BUILD_STARTED`
  - `TWIN_IDENTITY_CREATED`
  - `TWIN_SNAPSHOT_CREATED`
  - `TWIN_BUILD_SUCCEEDED`
  - `TWIN_STORE_SAVE_SUCCEEDED`
  - `TWIN_STORE_GET_SUCCEEDED`
  - `TWIN_STORE_LIST_SUCCEEDED`
  - `TWIN_OVERVIEW_CREATED`
- boundaries:
  - read-only validation surface
  - no editing
  - no publish
  - no AI
  - no scoring
  - no recommendations

Workspace Overview Bundled Stable Import Snapshot milestone confirmed:
- fixture:
  - `apps/platform/gnr8/runtime/twin/fixtures/stable-import-snapshot.ts`
- source resolution order:
  1. stable artifact on filesystem
  2. imported-url snapshot directory
  3. bundled stable import snapshot fixture
  4. fallback `No imported site available.`
- verified deployed values:
  - `selectedSource`: `bundled_stable_import_snapshot`
  - `fallbackReason`: `none`
  - `pages`: `18`
  - `sections`: `74`
  - `detectedTitle`: `GNR8 Validation Site`
  - `homepagePath`: `index.html`
  - `assets`: `133`
  - `navigationEvidence`: `available`
  - `homepageDetected`: `true`

Website OS Proposal Candidate Runtime v1 milestone confirmed (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.ts`
  - `apps/platform/gnr8/runtime/twin/twin-proposal-candidates.test.ts`
- implemented function:
  - `generateTwinProposalCandidates(input)`
- verified deployed Proposal Candidates for `Transporti Maver`:
  - `#1 Improve Homepage Conversion Flow status=proposal_candidate executionState=blocked rank=1 score=390`
  - `#2 Improve Homepage Quality and Messaging status=proposal_candidate executionState=blocked rank=2 score=340`
  - `#3 Maintain Read-Only Validation Mode status=proposal_candidate executionState=blocked rank=3 score=320`
- top-rank selection behavior:
  - generated from top-ranked optimization opportunities
  - default limit: `3`
  - ranked optimization `#4 Design Evidence Collection` remains an optimization opportunity and is not promoted in Runtime v1
- preserved boundaries:
  - read-only
  - non-executable
  - no content mutation
  - no design mutation
  - no publishing
  - no provider execution
  - no approval workflow yet
  - no AI model calls
- architecture chain now confirmed:
  - `Persisted Migration OS Evidence -> Digital Twin -> Observation Runtime -> Insight Runtime -> Recommendation Runtime -> Optimization Runtime -> Optimization Scoring Runtime -> Proposal Candidate Runtime -> Workspace Overview`
- diagnostics:
  - `WORKSPACE_OVERVIEW_IMPORT_SOURCE_SEARCH_STARTED`
  - `WORKSPACE_OVERVIEW_STABLE_ARTIFACT_CHECKED`
  - `WORKSPACE_OVERVIEW_STABLE_ARTIFACT_MISSING`
  - `WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_DIRECTORY_CHECKED`
  - `WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_COUNT_0`
  - `WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_CHECKED`
  - `WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_SELECTED`
- preserved boundaries:
  - read-only
  - no DB/schema changes
  - no API
  - no AI
  - no scoring
  - no recommendations
  - no editing
  - no publishing

Twin Recommendation Runtime v1 milestone confirmed (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-recommendations.ts`
  - `apps/platform/gnr8/runtime/twin/twin-recommendations.test.ts`
- implemented function:
  - `generateTwinRecommendations(insights)`
- implemented deterministic recommendation rules:
  - `Prioritize Core Page Quality`
  - `Evaluate Homepage Conversion Flow`
  - `Collect Additional Design Evidence`
  - `Maintain Read-Only Validation Mode`
- verified deployed recommendations for `Transporti Maver`:
  - `Prioritize Core Page Quality`
  - `Evaluate Homepage Conversion Flow`
  - `Collect Additional Design Evidence`
  - `Maintain Read-Only Validation Mode`
- insight-to-recommendation relationships:
  - `Focused Website Footprint` -> `Prioritize Core Page Quality`
  - `Primary Entry Experience Detected` -> `Evaluate Homepage Conversion Flow`
  - `Limited Design Evidence Available` -> `Collect Additional Design Evidence`
  - `Governance Boundary Enforced` -> `Maintain Read-Only Validation Mode`
- diagnostics:
  - `TWIN_RECOMMENDATIONS_STARTED`
  - `TWIN_RECOMMENDATIONS_COMPLETED`
- preserved boundaries:
  - no AI model calls
  - no optimization engine
  - no proposal generation
  - no editing
  - no publishing
  - deterministic read-only recommendations only

Twin Optimization Runtime v1 milestone confirmed (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-optimizations.ts`
  - `apps/platform/gnr8/runtime/twin/twin-optimizations.test.ts`
- implemented function:
  - `generateTwinOptimizationOpportunities(recommendations)`
- implemented deterministic optimization opportunities:
  - `Homepage Quality Improvement`
  - `Homepage Conversion Review`
  - `Design Evidence Collection`
  - `Validation Stability Preservation`
- verified deployed optimization opportunities for `Transporti Maver`:
  - `HIGH`: `Homepage Quality Improvement`
  - `HIGH`: `Homepage Conversion Review`
  - `MEDIUM`: `Design Evidence Collection`
  - `LOW`: `Validation Stability Preservation`
- recommendation-to-optimization mapping:
  - `Prioritize Core Page Quality` -> `Homepage Quality Improvement`
  - `Evaluate Homepage Conversion Flow` -> `Homepage Conversion Review`
  - `Collect Additional Design Evidence` -> `Design Evidence Collection`
  - `Maintain Read-Only Validation Mode` -> `Validation Stability Preservation`
- diagnostics:
  - `TWIN_OPTIMIZATIONS_STARTED`
  - `TWIN_OPTIMIZATIONS_COMPLETED`
- optimization fields:
  - `impact`
  - `effort`
  - `priority`
  - `supportingRecommendations`
- preserved boundaries:
  - no AI model calls
  - no optimization engine
  - no mutation execution
  - no editing
  - no publishing
  - deterministic read-only optimization opportunities only

Optimization Scoring Runtime v1 milestone confirmed (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-optimization-scoring.ts`
  - `apps/platform/gnr8/runtime/twin/twin-optimization-scoring.test.ts`
- implemented function:
  - `scoreOptimizationOpportunities(opportunities)`
- scoring fields:
  - `impactScore`
  - `effortScore`
  - `confidenceScore`
  - `evidenceQualityScore`
  - `totalScore`
  - `rank`
- scoring mappings:
  - impact: `high=100`, `medium=60`, `low=20`
  - effort: `low=100`, `medium=60`, `high=20`
  - confidence: `default=100`
  - evidence quality: `Homepage Conversion Review=90`, `Homepage Quality Improvement=80`, `Design Evidence Collection=50`, `Validation Stability Preservation=100`
- verified deployed ranking for `Transporti Maver`:
  - `#1 Homepage Conversion Review totalScore=390`
  - `#2 Homepage Quality Improvement totalScore=340`
  - `#3 Validation Stability Preservation totalScore=320`
  - `#4 Design Evidence Collection totalScore=270`
- diagnostics:
  - `TWIN_OPTIMIZATION_SCORING_STARTED`
  - `TWIN_OPTIMIZATION_SCORING_COMPLETED`
- preserved boundaries:
  - no AI model calls
  - no proposal generation
  - no optimization execution
  - no editing
  - no publishing
  - deterministic scoring only

Execution Artifact Preview Runtime v1 milestone confirmed (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-execution-artifact-preview.ts`
  - `apps/platform/gnr8/runtime/twin/twin-execution-artifact-preview.test.ts`
- implemented function:
  - `generateTwinExecutionArtifactPreviews(executionPlanPreviews)`
- verified deployed Execution Artifact Preview artifacts for `Transporti Maver`:
  1. `Improve Homepage Conversion Flow`
     - `artifactType`: `conversion_improvement_plan`
     - affected areas:
       - `homepage`
       - `primary_conversion_path`
     - planned outputs:
       - `conversion_review_document`
       - `conversion_improvement_plan`
  2. `Improve Homepage Quality and Messaging`
     - `artifactType`: `content_improvement_plan`
     - affected areas:
       - `homepage_hero`
       - `homepage_messaging`
     - planned outputs:
       - `messaging_review_document`
       - `content_improvement_plan`
  3. `Maintain Read-Only Validation Mode`
     - `artifactType`: `validation_continuation_plan`
     - affected areas:
       - `runtime_governance`
     - planned outputs:
       - `validation_status_report`
- governance values:
  - `executionState`: `preview_only`
  - `mutationBlocked`: `true`
  - `governanceState`: `preview_non_executable`
- diagnostics:
  - `TWIN_EXECUTION_ARTIFACT_PREVIEW_STARTED`
  - `TWIN_EXECUTION_ARTIFACT_PREVIEW_COMPLETED`
- preserved boundaries:
  - no execution
  - no artifact generation
  - no approval workflow
  - no provider execution
  - no publishing
  - no mutation execution
  - no AI model calls

Persisted Migration OS Evidence -> Website OS Workspace Overview milestone confirmed:
- completion date:
  - `2026-06-01`
- verified runtime chain:
  - Persisted Migration OS runtime evidence
  - `buildWebsiteDigitalTwin()`
  - `generateTwinObservations(twin)`
  - `generateTwinInsights(observations)`
  - `generateTwinRecommendations(insights)`
  - `generateTwinOptimizationOpportunities(recommendations)`
  - `scoreOptimizationOpportunities(opportunities)`
  - `generateTwinProposalCandidates(input)`
  - `generateTwinProposalApprovalPreviews(candidates)`
  - `generateTwinExecutionPlanPreviews(approvalPreviews)`
  - Workspace Overview UI
- verified deployed runtime values:
  - `selectedSource`: `persisted_runtime_import_evidence`
  - `persistedEvidenceSelected`: `true`
  - `persistedEvidenceReason`: `persisted_runtime_evidence_selected`
  - `persistedEvidenceShapeStatus`: `valid`
  - `providerState`: `persisted/runtime-import-evidence`
- verified imported site:
  - `title`: `Transporti Maver d.o.o.`
  - `siteVersionId`: `88253466-783e-4484-8b68-df6c83b8a11c`
  - `importId`: `maver-reimport-1778654629704-63c7fcad`
  - evidence-derived summaries: `pages=2`, `sections=1`, `homepagePath=index.html`
- successful diagnostics:
  - `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_SUCCEEDED`
  - `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_VALID`
  - `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SELECTED`

Website OS Approval State Runtime v1 milestone confirmed (`2026-06-01`):
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-approval-state.ts`
  - `apps/platform/gnr8/runtime/twin/twin-approval-state.test.ts`
- implemented function:
  - `generateTwinApprovalStateRecords(approvalRecords)`
- approval state model:
  - `TwinApprovalState`
  - `approval_required`
  - `pending_review`
  - `ready_for_future_approval`
- current runtime emission:
  - `pending_review` only
  - future state support exists through typing/contracts only
- approval state record fields:
  - `approvalId`
  - `proposalId`
  - `proposalTitle`
  - `approvalState`
  - `requiredApprovals`
  - `receivedApprovals`
  - `approvalComplete`
  - `executionAllowed`
  - `mutationAllowed`
  - `publishingAllowed`
  - `providerExecutionAllowed`
  - `governanceState`
  - `summary`
- verified deployed approval state records for `Transporti Maver`:
  - `proposalTitle`: `Improve Homepage Conversion Flow`
  - `approvalState`: `pending_review`
  - `requiredApprovals`: `1`
  - `receivedApprovals`: `0`
  - `approvalComplete`: `false`
  - `governanceState`: `approval_state_preview_only`
  - all deployed approval state records currently share identical `governanceState`
- diagnostics:
  - `TWIN_APPROVAL_STATE_STARTED`
  - `TWIN_APPROVAL_STATE_COMPLETED`
- preserved boundaries:
  - no approval workflow
  - no approve action
  - no reject action
  - no request-review action
  - no execution
  - no provider execution
  - no publishing
  - no mutation execution
  - no AI model calls
  - read-only deterministic state modeling only
- architecture chain now confirmed:
  - `Persisted Migration OS Evidence -> Digital Twin -> Observation Runtime -> Insight Runtime -> Recommendation Runtime -> Optimization Runtime -> Optimization Scoring Runtime -> Proposal Candidate Runtime -> Proposal Approval Preview Runtime -> Proposal Approval Runtime -> Approval State Runtime -> Execution Plan Preview Runtime -> Execution Artifact Preview Runtime -> Workspace Planning Console`

## Future Integration Points
This architecture anchors future integration with:
- Twin Runtime Contract
- Twin Generation Architecture
- Twin Observation Architecture
- Twin Optimization Architecture
- Website Intelligence Architecture
- Workspace UI Concept
- Workspace Wireframes
- Content Model
- Design Model
- Experience Model
- Provider Governance
- Website Evolution Lifecycle

## Success Condition
GNR8 gains the canonical Website Digital Twin architecture that becomes the central object of the Website Operating System.

First operational success checkpoint:
- GNR8 now has the first runtime Twin Repository layer capable of storing and retrieving Website Digital Twins in memory while remaining persistence/API/UI-free.
- GNR8 now has a Workspace-ready Twin Overview read-model capable of presenting Website Digital Twin state before UI implementation.
- GNR8 now has the first browser-visible Website Digital Twin runtime surface.
- Digital Twin snapshots now contain imported-site evidence instead of placeholder-only summaries.
- Workspace Overview is now useful in deployed environments even without local validation snapshot files.
- Workspace Planning Console now displays deterministic Approval State records derived from Proposal Approval Records.
- Approval governance modeling now exists independently from approval workflow execution.

Recommended next milestone:
- Approval Queue Preview Runtime v1

## Related Canonical Documents
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_INTELLIGENCE_ARCHITECTURE.md`
- `docs/architecture/TWIN_OBSERVATION_ARCHITECTURE.md`
- `docs/architecture/TWIN_OPTIMIZATION_ARCHITECTURE.md`
- `docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md`
- `docs/architecture/EXPERIENCE_WORKSPACE_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/architecture/WEBSITE_EVOLUTION_LIFECYCLE_ARCHITECTURE.md`
- `docs/architecture/CANONICAL_CONTENT_MODEL.md`
- `docs/architecture/CANONICAL_DESIGN_MODEL.md`
- `docs/architecture/CANONICAL_EXPERIENCE_MODEL.md`
- `docs/architecture/PROVIDER_ORCHESTRATION_CONTRACT.md`
- `docs/product/WORKSPACE_WIREFRAMES_V1.md`
