# First Operational Twin Roadmap

## Status
- Milestone update: Persisted Migration OS Evidence -> Website OS Workspace Overview completed (2026-06-01)
- Milestone update: Workspace Navigation Wiring v1 completed (2026-05-31)
- Milestone update: Workspace Overview Bundled Stable Import Snapshot completed (2026-05-31)
- Milestone update: Twin Runtime Types and Deterministic Builder completed (2026-05-30)
- Milestone update: Twin In-Memory Store and Read-Model Repository completed (2026-05-30)
- Milestone update: Twin Viewer Read-Model Helper completed (2026-05-30)
- Milestone update: Workspace Overview Twin Preview UI completed (2026-05-30)
- Scope: roadmap + completion checkpoint
- Non-goals unchanged: no APIs, no database changes, no UI editing/actions/forms/publish/AI/scoring/recommendations

Completed in runtime:
- `apps/platform/gnr8/runtime/twin/twin-types.ts`
- `apps/platform/gnr8/runtime/twin/twin-builder.ts`
- `apps/platform/gnr8/runtime/twin/twin-builder.test.ts`
- `apps/platform/gnr8/runtime/twin/twin-store.ts`
- `apps/platform/gnr8/runtime/twin/twin-store.test.ts`
- `apps/platform/gnr8/runtime/twin/twin-viewer.ts`
- `apps/platform/gnr8/runtime/twin/twin-viewer.test.ts`

## Purpose
Define the shortest path from architecture to the first visible Website Digital Twin inside GNR8.

Canonical runtime source for implementation:
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`

## Target Outcome
A website can be imported and represented as a Twin.

The Twin is visible in Workspace Overview.

## Required Runtime Components
1. Twin Identity
2. Twin Status
3. Twin Snapshot
4. Twin Metadata
5. Twin Builder
6. Twin Store
7. Twin Viewer
8. Workspace Overview Integration

## Contract Baseline
First operational contract baseline is defined in:
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`

Baseline guarantees:
- per-site-version twin identity
- deterministic twin status lifecycle (`building`, `ready`, `stale`, `failed`)
- summary/read-model snapshot domains (`contentState`, `designState`, `experienceState`, `governanceState`, `operationalState`)
- metadata + diagnostics for generation provenance and failure reporting
- immutable v1 twin storage by site version
- viewer payload for Workspace Overview (`identity`, `status`, `snapshot`, `metadata`, `diagnostics`)

## Inputs
Canonical first-operational inputs:
- Import Pipeline
- Canonical Models
- Site Version
- Provider State

## Outputs
Canonical first-operational outputs:
- Twin Identity
- Twin Status
- Twin Snapshot
- Twin Metadata
- Twin Diagnostics

## Out of Scope
- Website Health scoring
- Content/Design/Experience scoring
- AI recommendations
- Optimization opportunities
- Proposal generation
- Runtime observation engine
- Runtime optimization engine
- AI Editing
- Publish execution
- Publish automation

## Success Criteria
- website imported
- twin generated
- twin stored
- twin displayed

Completed UI runtime route:
- `/gnr8/admin/twin-preview`
- `/gnr8/admin/twin-preview-real`

Completed real-site source:
- `fixtureId`: `real-site-01`

Completed runtime chain:
- `buildWebsiteDigitalTwin()`
- `InMemoryTwinStore`
- `getTwinBySiteVersion()`
- `createTwinOverview()`
- browser-rendered read-only preview

Verified deployed values:
- `title`: `Website Digital Twin Runtime Preview`
- `subtitle`: `Read-only validation surface`
- `status`: `ready`
- `environmentScope`: `preview`
- `contentSummary`: `pages=1; sections=8; detectedTitle=Northstar Widgets — Simple Marketing Site; homepagePath=index.html`
- `designSummary`: `assets=5; layoutEvidence=available`
- `experienceSummary`: `navigationEvidence=available; homepageDetected=true`
- `governanceSummary`: `sourceImportId=import_real-site-01_c167859409d8; sourceSiteVersionId=site_version_real-site-01_072929becae7; readOnly=true`
- `operationalSummary`: `environmentScope=preview; providerState=preview/runtime-only`

Verified real-site preview values:
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

Implemented evidence fields:
- `pageCount`
- `sectionCount`
- `assetCount`
- `detectedTitle`
- `detectedHomepagePath`
- `providerStateSummary`

Verified diagnostics:
- `TWIN_BUILD_STARTED`
- `TWIN_IDENTITY_CREATED`
- `TWIN_SNAPSHOT_CREATED`
- `TWIN_BUILD_SUCCEEDED`
- `TWIN_STORE_SAVE_SUCCEEDED`
- `TWIN_STORE_GET_SUCCEEDED`
- `TWIN_STORE_LIST_SUCCEEDED`
- `TWIN_OVERVIEW_CREATED`

Preview boundaries:
- read-only validation surface
- no editing
- no actions
- no forms
- no publish
- no AI
- no scoring
- no recommendations

Milestone validation:
- twin-builder tests passed
- twin-store tests passed
- twin-viewer tests passed
- next build passed

Implementation readiness checkpoint from this roadmap + contract:
- TypeScript twin runtime types can be implemented without architectural invention
- deterministic builder/store/viewer can be implemented against the contract
- tests can be authored against existing site/version fixtures

## Dependencies
- Phase A: Website Workspace Foundation
- Phase B: Canonical Model Runtime
- Phase C: Digital Twin Runtime

## Risks
- model incompleteness
- state synchronization
- version drift

## Recommended Sequence
1. Twin runtime types (contract-exact)
2. Deterministic Twin Builder (contract-exact)
3. Twin Store (immutable per site version)
4. Twin Viewer payload projection
5. Workspace Overview integration
6. Fixture-based runtime tests

## Success
GNR8 gains the first operational runtime representation of a website.

Current completion checkpoint:
- first runtime Website Digital Twin object implemented
- deterministic builder implemented
- first runtime TwinStore repository implemented (`TwinStore`, `InMemoryTwinStore`)
- first Workspace-ready Twin Overview read-model helper implemented (`TwinOverview`, `createTwinOverview(twin)`)
- store methods implemented: `saveTwin(twin)`, `getTwin(twinId)`, `getTwinBySiteVersion(siteVersionId)`, `listTwins()`, `clear()`
- store behavior verified: map-based storage, latest per-siteVersion tracking, multiple twins supported, payloads not mutated, runtime-memory only
- store diagnostics implemented: `TWIN_STORE_SAVE_SUCCEEDED`, `TWIN_STORE_GET_SUCCEEDED`, `TWIN_STORE_LIST_SUCCEEDED`
- TwinOverview mapped fields: `twinId`, `siteId`, `siteVersionId`, `workspaceId`, `environmentScope`, `status`, `contentSummary`, `designSummary`, `experienceSummary`, `governanceSummary`, `operationalSummary`, `lastUpdated`, `diagnostics`
- twin-viewer diagnostic implemented: `TWIN_OVERVIEW_CREATED`
- persistence/API/UI still intentionally not implemented
- Twin Snapshot Hydration from Imported Site Model completed and verified as read-only runtime validation from imported fixture `real-site-01`

Workspace Navigation Wiring v1 completion checkpoint:
- connected surfaces:
  - `/gnr8/admin/providers`
  - `/gnr8/admin/workspace-overview`
  - `/gnr8/admin/twin-preview`
  - `/gnr8/admin/twin-preview-real`
- navigation sections:
  - `Website OS`
  - `Validation Surfaces`
  - `Website OS Navigation`
- preserved boundaries:
  - UI/navigation only
  - read-only links only
  - no runtime changes
  - no API changes
  - no database changes
  - no provider changes
  - no Twin changes
  - no forms/actions/editing/publish/AI controls
- validation:
  - admin test suite passed (`148/148`)
  - next build passed

Workspace Overview Bundled Stable Import Snapshot completion checkpoint:
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
  - `environmentScope`: `preview`
  - `providerState`: `preview/runtime-only`
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

Persisted Migration OS Evidence -> Website OS Workspace Overview completion checkpoint:
- completion date:
  - `2026-06-01`
- verified runtime chain:
  - Persisted Migration OS runtime evidence
  - Workspace Overview resolver
  - Runtime Evidence Adapter
  - `buildWebsiteDigitalTwin()`
  - `InMemoryTwinStore`
  - `createTwinOverview()`
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
- conclusion:
  - future bootstrap resumes from `Persisted Migration OS Evidence -> Website OS Workspace Overview` as a completed canonical runtime milestone.

Conclusion:
- Website OS runtime surfaces are now discoverable through navigation instead of requiring direct URL knowledge.
- Workspace Overview is now useful in deployed environments even without local validation snapshot files.

Recommended next milestone:
- Workspace Overview Operator UX Cleanup
- followed by: Twin Observation Runtime v1

## Related Canonical Documents
- `docs/architecture/TWIN_RUNTIME_CONTRACT.md`
- `docs/architecture/WEBSITE_OS_IMPLEMENTATION_ROADMAP.md`
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_UI_CONCEPT_ARCHITECTURE.md`
- `docs/architecture/WORKSPACE_INFORMATION_ARCHITECTURE.md`
