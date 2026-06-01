# Twin Runtime Contract

## Status
- Canonical: first operational runtime contract and implemented v1 runtime slice
- Scope: documentation + implemented runtime types/builder/store/viewer/preview UI surface
- Non-goals: no DB persistence, no APIs beyond preview surface, no editing/actions/forms/publish UI, no scoring/recommendations/AI/optimization/publish execution

Implemented milestone (2026-05-30):
- Workspace Overview Twin Preview UI
- route:
  - `/gnr8/admin/twin-preview`

Implemented milestone (2026-05-31):
- Twin Snapshot Hydration from Imported Site Model
- route:
  - `/gnr8/admin/twin-preview-real`
- source:
  - `fixtureId`: `real-site-01`

Implemented milestone (2026-05-31):
- Workspace Overview Bundled Stable Import Snapshot
- fixture:
  - `apps/platform/gnr8/runtime/twin/fixtures/stable-import-snapshot.ts`

Implemented milestone (2026-06-01):
- Persisted Migration OS Evidence -> Website OS Workspace Overview

Implemented milestone (2026-05-30):
- Twin Runtime Types and Deterministic Builder
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-types.ts`
  - `apps/platform/gnr8/runtime/twin/twin-builder.ts`
  - `apps/platform/gnr8/runtime/twin/twin-builder.test.ts`

Implemented milestone (2026-05-30):
- Twin In-Memory Store and Read-Model Repository
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-store.ts`
  - `apps/platform/gnr8/runtime/twin/twin-store.test.ts`

Implemented milestone (2026-05-30):
- Twin Viewer Read-Model Helper
- runtime files:
  - `apps/platform/gnr8/runtime/twin/twin-viewer.ts`
  - `apps/platform/gnr8/runtime/twin/twin-viewer.test.ts`

## Purpose
Define the smallest runtime contract required for the first operational Website Digital Twin.

This contract is the implementation source for:
- Twin Identity
- Twin Snapshot
- Twin Metadata
- Twin Status
- Twin Store
- Twin Viewer
- Workspace Overview integration

This contract must be specific enough that Codex can implement TypeScript types, builder, store, and viewer without inventing new architecture.

## Twin Identity
Canonical identity fields:
- `twinId`
- `siteId`
- `siteVersionId`
- `workspaceId`
- `environmentScope`
- `status`
- `createdAt`
- `updatedAt`

## Twin Status
Supported status states:
- `building`
- `ready`
- `stale`
- `failed`

## Twin Snapshot
Canonical v1 snapshot fields:
- `contentState`
- `designState`
- `experienceState`
- `governanceState`
- `operationalState`

v1 constraints:
- snapshot fields may be summary/read-model structures only
- no scoring
- no recommendations
- no optimization
- no AI output

## Twin Metadata
Canonical metadata fields:
- `sourceImportId`
- `sourceSiteVersionId`
- `sourceModels`
- `generatedAt`
- `generatedBy`
- `diagnostics`

## Twin Storage Rules
v1 storage rules:
- Twin exists per site version.
- Twin v1 is immutable once generated.
- New site version creates a new twin.
- Twin may be marked stale but not destructively overwritten.
- Failed twin generation returns diagnostics.

## Twin Viewer Contract
Workspace Overview receives:
- `identity`
- `status`
- `snapshot`
- `metadata`
- `diagnostics`

Viewer v1 must not require:
- scoring engine
- recommendation engine
- optimization engine
- AI editor
- publish runtime

## Implemented Runtime Types
Implemented in `apps/platform/gnr8/runtime/twin/twin-types.ts`:
- `TwinIdentity`
- `TwinStatus`
- `TwinSnapshot`
- `TwinMetadata`
- `WebsiteDigitalTwin`
- `TwinViewerPayload`

## Implemented Runtime Functions
Implemented in `apps/platform/gnr8/runtime/twin/twin-builder.ts`:
- `buildWebsiteDigitalTwin(input)`
- `toTwinViewerPayload(twin)`

Implemented in `apps/platform/gnr8/runtime/twin/twin-viewer.ts`:
- `createTwinOverview(twin)`

Runtime chain to browser-visible preview:
- `buildWebsiteDigitalTwin()`
- `InMemoryTwinStore`
- `getTwinBySiteVersion()`
- `createTwinOverview()`
- browser-rendered read-only preview

## Implemented Twin Viewer Read-Model
Implemented in `apps/platform/gnr8/runtime/twin/twin-viewer.ts`:
- `TwinOverview`

Mapped fields:
- `twinId`
- `siteId`
- `siteVersionId`
- `workspaceId`
- `environmentScope`
- `status`
- `contentSummary`
- `designSummary`
- `experienceSummary`
- `governanceSummary`
- `operationalSummary`
- `lastUpdated`
- `diagnostics`

Viewer diagnostics:
- `TWIN_OVERVIEW_CREATED`

## Implemented Twin Store Interface
Implemented in `apps/platform/gnr8/runtime/twin/twin-store.ts`:
- `TwinStore`

Methods:
- `saveTwin(twin)`
- `getTwin(twinId)`
- `getTwinBySiteVersion(siteVersionId)`
- `listTwins()`
- `clear()`

## Implemented Twin Store Implementation
Implemented in `apps/platform/gnr8/runtime/twin/twin-store.ts`:
- `InMemoryTwinStore`

Implemented behavior:
- map-based storage
- latest twin per `siteVersionId` tracking
- multiple twins supported
- twin payloads are not mutated
- runtime-memory only

Store diagnostics:
- `TWIN_STORE_SAVE_SUCCEEDED`
- `TWIN_STORE_GET_SUCCEEDED`
- `TWIN_STORE_LIST_SUCCEEDED`

## Deterministic Builder Behavior
Implemented deterministic behavior:
- `twinId` is derived from `siteId + siteVersionId + environmentScope`
- controlled timestamps via `nowIso` or `clock`
- `ready` status returned for valid input
- deterministic throw for missing `siteId`/`siteVersionId`

## Diagnostics
Builder diagnostics sequence:
- `TWIN_BUILD_STARTED`
- `TWIN_IDENTITY_CREATED`
- `TWIN_SNAPSHOT_CREATED`
- `TWIN_BUILD_SUCCEEDED`

Preview/runtime diagnostics sequence includes:
- `TWIN_BUILD_STARTED`
- `TWIN_IDENTITY_CREATED`
- `TWIN_SNAPSHOT_CREATED`
- `TWIN_BUILD_SUCCEEDED`
- `TWIN_STORE_SAVE_SUCCEEDED`
- `TWIN_STORE_GET_SUCCEEDED`
- `TWIN_STORE_LIST_SUCCEEDED`
- `TWIN_OVERVIEW_CREATED`

Verified deployed preview values:
- `title`: `Website Digital Twin Runtime Preview`
- `subtitle`: `Read-only validation surface`
- `status`: `ready`
- `environmentScope`: `preview`
- `contentSummary`: `pages=1; sections=8; detectedTitle=Northstar Widgets — Simple Marketing Site; homepagePath=index.html`
- `designSummary`: `assets=5; layoutEvidence=available`
- `experienceSummary`: `navigationEvidence=available; homepageDetected=true`
- `governanceSummary`: `sourceImportId=import_real-site-01_c167859409d8; sourceSiteVersionId=site_version_real-site-01_072929becae7; readOnly=true`
- `operationalSummary`: `environmentScope=preview; providerState=preview/runtime-only`

Verified real-site preview values (hydrated from imported model evidence when provided to builder):
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

Verified deployed Workspace Overview fallback snapshot values (bundled stable import snapshot path):
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

Workspace Overview source resolution order:
1. stable artifact on filesystem
2. imported-url snapshot directory
3. bundled stable import snapshot fixture
4. fallback `No imported site available.`

Verified deployed Workspace Overview persisted runtime evidence values:
- `selectedSource`: `persisted_runtime_import_evidence`
- `persistedEvidenceSelected`: `true`
- `persistedEvidenceReason`: `persisted_runtime_evidence_selected`
- `persistedEvidenceShapeStatus`: `valid`
- `providerState`: `persisted/runtime-import-evidence`
- imported site:
  - `title`: `Transporti Maver d.o.o.`
  - `siteVersionId`: `88253466-783e-4484-8b68-df6c83b8a11c`
  - `importId`: `maver-reimport-1778654629704-63c7fcad`
  - evidence-derived summaries: `pages=2`, `sections=1`, `homepagePath=index.html`

Verified runtime chain for persisted evidence hydration:
- Persisted Migration OS runtime evidence
- Workspace Overview resolver
- Runtime Evidence Adapter
- `buildWebsiteDigitalTwin()`
- `InMemoryTwinStore`
- `createTwinOverview()`
- Workspace Overview UI

Verified diagnostics for persisted evidence path:
- `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_ADAPTER_SUCCEEDED`
- `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SHAPE_VALID`
- `WORKSPACE_OVERVIEW_PERSISTED_RUNTIME_EVIDENCE_SELECTED`

Verified diagnostics for bundled stable import snapshot selection:
- `WORKSPACE_OVERVIEW_IMPORT_SOURCE_SEARCH_STARTED`
- `WORKSPACE_OVERVIEW_STABLE_ARTIFACT_CHECKED`
- `WORKSPACE_OVERVIEW_STABLE_ARTIFACT_MISSING`
- `WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_DIRECTORY_CHECKED`
- `WORKSPACE_OVERVIEW_IMPORTED_URL_SNAPSHOT_COUNT_0`
- `WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_CHECKED`
- `WORKSPACE_OVERVIEW_BUNDLED_STABLE_SNAPSHOT_SELECTED`

Builder input supports optional read-model evidence summary:
- `sourceEvidenceSummary.pageCount`
- `sourceEvidenceSummary.sectionCount`
- `sourceEvidenceSummary.assetCount`
- `sourceEvidenceSummary.detectedTitle`
- `sourceEvidenceSummary.detectedHomepagePath`
- `sourceEvidenceSummary.providerStateSummary` (optional)

Implemented evidence fields:
- `pageCount`
- `sectionCount`
- `assetCount`
- `detectedTitle`
- `detectedHomepagePath`
- `providerStateSummary`

Fallback rule:
- if `sourceEvidenceSummary` is omitted, deterministic placeholder summaries remain unchanged

## Runtime Boundaries (Still Explicit)
- no DB persistence yet
- no Supabase
- no API yet
- no editing
- no actions
- no forms
- no publish
- no scoring
- no recommendations
- no AI
- no optimization
- no publish execution

## Validation
- `twin-builder` tests passed (`apps/platform/gnr8/runtime/twin/twin-builder.test.ts`)
- `twin-store` tests passed (`apps/platform/gnr8/runtime/twin/twin-store.test.ts`)
- `twin-viewer` tests passed (`apps/platform/gnr8/runtime/twin/twin-viewer.test.ts`)
- `next build` passed (`apps/platform`)

## Out of Scope
Explicitly out of scope for this contract:
- Website Health scoring
- Content/Design/Experience scoring
- AI recommendations
- Optimization opportunities
- Proposal generation
- Publish execution
- Runtime observation engine
- Runtime optimization engine

## Integration Points
Future implementation targets anchored by this contract:
- Twin Builder
- Twin Store
- Twin Viewer
- Workspace Overview
- Import Pipeline

Current milestone conclusion:
- GNR8 now has the first browser-visible Website Digital Twin runtime surface.
- Digital Twin snapshots now contain imported-site evidence instead of placeholder-only summaries.
- Workspace Overview is now useful in deployed environments even without local validation snapshot files.

Recommended next milestone:
- Workspace Overview Operator UX Cleanup
- followed by: Twin Observation Runtime v1

## Success Criteria
Future bootstrap resumes from the implemented twin runtime types and deterministic builder, then proceeds to:
- Twin Builder + InMemoryTwinStore + TwinOverview read-model
- Workspace Overview Twin Preview UI
- tests proving twin generation from existing site/version fixtures

## Success
GNR8 now has a Workspace-ready Twin Overview read-model capable of presenting Website Digital Twin state before UI implementation, while remaining persistence/API/UI-free.

## Related Canonical Documents
- `docs/architecture/FIRST_OPERATIONAL_TWIN_ROADMAP.md`
- `docs/architecture/DIGITAL_TWIN_ARCHITECTURE.md`
- `docs/architecture/TWIN_GENERATION_ARCHITECTURE.md`
- `docs/ai/GNR8_CURRENT_STATE.md`
- `docs/ai/GNR8_THREAD_HANDOFF.md`
