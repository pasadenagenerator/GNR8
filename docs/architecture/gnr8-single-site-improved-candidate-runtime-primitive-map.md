# GNR8 Single-Site Improved Candidate Runtime Primitive Map

Phase: MVP-22
Scope: Design-only classification of candidate runtime primitives for future improved candidate creation and dry-run validation.

Classifications:

- `safe behind adapter`: usable later only through the governed improved candidate adapter.
- `safe for dry-run only`: useful to inspect or plan without writes.
- `evidence/advisory only`: useful as context, never runtime truth.
- `unsafe direct mutation`: writes too broadly or bypasses MVP-20/MVP-21 boundaries.
- `future only`: relevant later but not for MVP-23 dry-run.
- `legacy/historical`: old or non-canonical path.
- `not needed`: outside improved candidate creation.

## Primitive Classification

| Primitive | Evidence reviewed | What it does | Mutates runtime | Active pointer | AI/provider | Proposal artifacts | Local testability | Idempotency/stable refs | Risk | MVP recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MVP-12 real clone executor | `apps/platform/gnr8/single-site/single-site-real-clone-executor.ts`, MVP-12 closeouts/tests | Creates draft clone version, shadow artifact, and binding from accepted source version | Yes | No | No | No | Yes, disposable DB verified | Deterministic target id, watermarks, refs | Low | Pattern for improved candidate adapter |
| `getSiteVersion` | `apps/platform/gnr8/runtime/runtime-store.ts` | Reads version and page snapshot | No | No | No | No | Yes | Stable version id | Low | Safe for dry-run and execute inspection |
| `getArtifactById` | `runtime-store.ts` | Reads runtime artifact by id | No | No | No | No | Yes | Stable artifact id/hash | Low | Safe for dry-run and execute inspection |
| `createSiteVersionFromMigration` | `runtime-store.ts`, MVP-12 | Creates DRAFT runtime site version and page versions | Yes | No | No | No | Yes | Supports preallocated id; provenance required | Medium | Safe behind adapter only |
| `buildDeterministicArtifactBundle` | `apps/platform/gnr8/runtime/artifact-builder.ts` | Builds deterministic preview/publish artifact payload from site version | No | No | No | No | Yes | Bundle SHA-256 | Low | Safe behind adapter; safe dry-run planning if not persisted |
| `createArtifact` | `runtime-store.ts` | Inserts one artifact per site version | Yes | No | No | No | Yes | Reuses existing artifact for site version | Medium | Safe behind adapter only with shadow stage |
| `bindArtifactToVersion` | `runtime-store.ts` | Sets artifact id on site version | Yes | No | No | No | Yes | Stable bound ref | Medium | Safe behind adapter only |
| `refreshArtifactForVersionPublishCandidate` | `runtime-store.ts` | Updates artifact content/governance for publish candidate | Yes | No | No | No | Yes | Lineage checked | High | Future only; not MVP-23/24 candidate creation |
| `setSiteVersionState` / transition helpers | `runtime-store.ts` | Changes runtime site version state | Yes | No | No | No | Yes | State/audit refs | Medium | Future only after improved review design |
| `switchActivePointer` | `runtime-store.ts` | Writes `gnr8_runtime_active_pointers` | Yes | Yes | No | No | Yes | Returns previous pointer | Critical | Unsafe direct mutation; forbidden |
| `publishApprovedSiteVersion` | `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts` | Builds/refreshes publish artifact, runs gates, switches pointer, marks published | Yes | Yes | No direct AI | No | Yes | Publish result refs | Critical | Not needed; forbidden |
| `rollbackToSiteVersionArtifact` | `apps/platform/gnr8/runtime/rollback-switch.ts`, rollback route | Switches active pointer to target version artifact | Yes | Yes | No | No | Yes | Previous pointer returned | Critical | Not needed; forbidden |
| Public runtime rendering | `apps/platform/app/(public)/[[...slug]]/route.ts`, `apps/platform/src/public-site/public-runtime-render.tsx`, active artifact resolution | Serves active pointer/domain artifact output | No write | Reads active pointer | No | No | Yes | Active pointer refs | High | Evidence/advisory only; never mutation truth |
| Preview/runtime artifact rendering | `artifact-builder.ts`, runtime preview routes | Produces reviewable HTML from version/artifact | No or read-only route | No | No | No | Yes | Artifact refs | Medium | Safe for review after candidate exists, not dry-run mutation |
| Content override draft API | content override routes and `upsertContentOverrideDraft` | Writes draft content overrides and history | Yes | No | No | No | Yes | Slot/version keys | Critical | Unsafe direct mutation for MVP adapter |
| Content override batch API | batch override route and `upsertContentOverrideDraftBatch` | Writes many draft overrides | Yes | No | No | No | Yes | Slot/version keys | Critical | Unsafe direct mutation |
| Content override publish/rollback | `publishDraftContentOverrides`, `rollbackContentOverride` | Publishes or rolls back content overrides | Yes | No pointer | No | No | Yes | History refs | Critical | Forbidden; separate content approval boundary |
| AI transformation plan route | `apps/platform/app/api/gnr8/ai/transformation-plan/route.ts` | Builds advisory plan over page storage | No write | No | No provider in inspected route | No | Yes | Route response only | High | Evidence/advisory only; do not call from adapter |
| AI transformation execute route | `apps/platform/app/api/gnr8/ai/transformation-execute/route.ts`, `transformation-executor.ts` | Applies selected/safe steps, saves page, publishes page storage | Yes | Legacy/page publish | No provider in inspected executor | No | Yes | No MVP-21 attempt refs | Critical | Unsafe direct mutation; forbidden |
| Generated Website Proposal import builder | `generated-website-proposal-import.ts`, import boundary docs | Builds quarantined proposal-only artifact from manual output metadata | No runtime mutation in builder | No | No | Yes, proposal material | Yes | Deterministic proposal id | High | Evidence/advisory only |
| Generated Proposal Bundle persistence | `generated-proposal-bundle-persistence.ts`, runtime docs | Persists immutable preview bundle in provenance for read-only reconstruction | Writes provenance when invoked | No | No | Yes | Yes | Bundle hash/id | High | Evidence/advisory only; do not create in adapter |
| WU projection | WU runtime docs and `source-website-understanding-projection-*` | Read-only deterministic source understanding projection | No | No | No | No | Yes | Projection id | Medium | Evidence/advisory only |
| VCU projection | VCU runtime docs and `source-content-visual-continuity-projection-*` | Read-only deterministic continuity projection | No | No | No | No | Yes | Projection id | Medium | Evidence/advisory only |
| CGP/style signals | WU/VCU/style evidence docs and current capability map | Candidate brand/style evidence, not confirmed brand truth | No | No | No | No | Partial | Evidence refs/watermarks | High | Evidence/advisory only unless separately governed |
| Source evidence review refs | source evidence spine and MVP-12/19 docs | Accepted source capture/evidence truth | No in adapter | No | No | No | Yes | Review refs/watermarks | Low | Required input evidence |
| Clone review refs | clone review/fidelity docs and MVP-19 | Accepted clone baseline review truth | No in adapter | No | No | No | Yes | Review refs/watermarks | Low | Required input evidence |
| Proposal planning refs | MVP-15/MVP-19/MVP-21 docs and service | Approved plan and selected recommendations | No in adapter | No | No | No | Yes | Plan/recommendation refs/watermarks | Low | Required input truth |
| AAF validation refs | MVP-20 validator, AAF contracts | Execution-time exact authorization validation | No mutation by validator | No | No | No | Yes | Decision/evidence refs | Low | Mandatory precondition |
| Publish shadow/PTT/DDOM | publish/DDOM/PTT docs/code | Publish/domain readiness and source truth | Some primitives write | Potential later | No | No | Yes | Separate refs | High | Not needed for candidate creation |

## Selected Future Use

MVP-24 should use only the safe adapter primitive set: read clone version/artifact, compute deterministic candidate pages, create a distinct DRAFT runtime site version, build a PREVIEW bundle, create a shadow artifact, bind the artifact to the candidate version, verify read-back, and record refs through MVP-21.

MVP-23 should use only read paths and deterministic placeholder computation. It should not call any write primitive.

## Required Guardrails

- Candidate target id must be distinct from clone source id.
- Existing target id with missing or mismatched improved-candidate provenance must fail idempotency.
- Existing target id with matching provenance may be reused only if semantic output watermark matches.
- Artifact must be shadow/review-stage and not production.
- Active pointer must be read only for no-mutation proof, never written.
- Generated Proposal Bundle and AI/provider outputs must never substitute for proposal plan, implementation authorization, clone review, or source evidence truth.
