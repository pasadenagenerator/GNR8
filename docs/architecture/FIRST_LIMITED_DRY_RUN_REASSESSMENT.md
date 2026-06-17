# First Limited Dry Run Re-Assessment

## Scope

Phase 8B-11 reassesses the completed First Limited Dry Run diagnostic flow and chooses the next safe boundary.

This phase answers:

> What should be the next safe step after the verified admin-only limited dry-run flow?

This is audit, decision-making, and documentation only. It does not modify importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, builder behavior, persistence behavior, API trigger behavior, UI behavior, dry-run execution logic, simulation execution, reconstruction execution, AI generation, React generation, block generation, content generation, design token generation, persistence schema, worker execution, or publishing behavior.

This phase does not add a UI trigger button, API route, approval control, publish control, edit control, LLM call, generated React, GNR8 block, CMS binding, worker job, queue, client-user access, or tenant-admin access.

## Implemented State

Implemented before this reassessment:

- formal `FirstLimitedDryRunOutput` contract for Route Model, Navigation Model, and Section Model only
- deterministic `buildFirstLimitedDryRunOutput(...)`
- validation that rejects forbidden generated-output families
- durable `first_limited_dry_run_output` artifact persistence in existing runtime site-version provenance
- latest artifact loader through `loadLatestFirstLimitedDryRunOutput(...)`
- superadmin-only API trigger for `siteVersionId` plus `dryRunId`
- metadata-only trigger response with artifact ref, validation status, model counts, limitation counts, diagnostics, and idempotency result
- idempotent latest-artifact reuse when rebuilt output is equivalent
- dedicated read-only superadmin admin page for latest persisted output inspection
- defensive read-model projection for missing, invalid, blocked, and valid output states

The implemented output remains diagnostic-only. It contains only route, navigation, section, limitation, validation, evidence-ref, and metadata fields needed for operator inspection.

## Verified State

Phase 8B-10 verified the complete admin-only diagnostic chain:

- a superadmin API trigger creates a persisted `first_limited_dry_run_output` artifact from Evidence Capture baseline data and a matching `ReconstructionDryRunPackage`
- the persisted artifact can be loaded as the latest output
- the read-only admin surface projection can display route, navigation, and section model counts and labels
- equivalent trigger calls reuse the latest artifact
- changed Evidence Capture input appends a new latest artifact
- unauthorized requests are rejected
- forbidden request fields are rejected
- trigger responses return metadata only, not full model arrays
- persisted output excludes forbidden generated-output fields
- the read-only page source contains no trigger, rebuild, approve, publish, edit, AI, form, button, input, textarea, or select controls
- platform build was green after the verified chain

The verification used deterministic test provenance. It did not prove behavior against a real imported production site-version artifact.

## Still Forbidden

The following remain forbidden until a separate explicit phase changes the boundary:

- UI trigger button
- approval or readiness marker that authorizes execution
- publish controls
- edit controls
- tenant-admin access
- client-user access
- public access
- worker jobs or queues
- dry-run worker execution
- simulation execution
- reconstruction execution
- AI or LLM generation
- React generation
- GNR8 block generation
- content generation or rewriting
- design token generation
- CMS bindings
- persistence schema changes
- importer, capture, Original Mirror, preview, builder, trigger, or surface behavior changes
- publishing behavior

## Still Missing

Missing capabilities after 8B-10:

- real-site operational validation of the existing admin API, persisted artifact, latest loader, and read-only surface
- operator-friendly trigger UX
- approval/readiness marker semantics
- runtime mutation evidence
- candidate discovery implementation
- candidate review implementation
- broader dry-run execution or simulation execution
- reconstruction execution
- publishable output generation
- tenant-admin authorization model for this surface
- client-safe disclosure model

These gaps are not all equally urgent. The immediate missing proof is whether the already implemented admin-only diagnostic chain works cleanly against one real imported site.

## Current Safety Posture

Current posture: controlled diagnostic chain, low mutation risk, real-world confidence still limited.

Safety strengths:

- access is superadmin-only
- trigger response is metadata-only
- persisted output is validated before write
- output is limited to Route, Navigation, and Section Models
- latest-artifact idempotency reduces duplicate writes
- read-only surface exposes no controls
- forbidden generated-output shapes are rejected
- no publish, reconstruction, worker, AI, React, block, CMS, or edit path exists

Current residual risk:

- real imported site artifacts may have incomplete or differently shaped evidence than the deterministic test fixture
- real route scopes may expose missing baseline, missing geometry, missing section evidence, or missing navigation evidence
- operational diagnostics may be insufficient until exercised on a real imported site
- limitations may be present but not yet obvious enough for an operator to understand without real-site validation

Conclusion: the safest next step is not to expand capabilities. It is to exercise the existing chain against one carefully constrained real imported site.

## Next Boundary Options

### A. UI Trigger Button

Value:

- makes the existing API trigger easier for an operator to invoke
- reduces reliance on manual API calls
- could later support a normal admin workflow

Risk:

- introduces a visible action in the UI before the diagnostic chain has been proven against a real imported site
- may imply readiness, approval, or execution authority even if labeled carefully
- expands UI behavior and operator action surface

Dependency:

- stronger confidence that real imported site evidence produces useful persisted output and limitations
- explicit UX copy and authorization review
- decision about whether trigger action belongs on the read-only page or a separate admin diagnostics workflow

Why now:

- the API trigger already exists and is verified with deterministic fixtures

Why not now:

- a UI trigger is a convenience layer, not the next missing proof
- adding it before a real-site operational test increases action surface without reducing uncertainty

### B. Limited Approval/Readiness Marker

Value:

- could mark an artifact as reviewed or ready for a later phase
- begins the governance path toward future execution readiness
- helps separate "artifact exists" from "operator has inspected artifact"

Risk:

- approval vocabulary can be confused with authorization for reconstruction, simulation, publishing, or mutation
- adds governance semantics before real-site diagnostic usefulness is proven
- may require persistence and UI behavior decisions outside the current diagnostic boundary

Dependency:

- a clear approval contract that is intent-only and non-executing
- audit semantics for who marked what, when, and why
- real-site evidence that the artifact is worth marking

Why now:

- there is already a read-only artifact that an operator can inspect

Why not now:

- approval should follow evidence that the artifact is operationally useful on at least one real imported site
- the next phase should avoid introducing new state or operator authority

### C. Runtime Mutation Capture

Value:

- addresses a known Evidence Capture gap for dynamic sites
- improves future meaningful Dry Run and reconstruction confidence
- helps identify client-side rendering, post-load mutations, widgets, and late content changes

Risk:

- changes capture behavior and browser instrumentation scope
- may increase capture cost, timing variability, and evidence volume
- could complicate baseline comparability before the limited diagnostic chain is real-site tested

Dependency:

- capture design for mutation windows, limits, normalization, and privacy-safe evidence
- readiness scoring updates
- persistence and read-model expansion

Why now:

- runtime mutation evidence remains one of the highest-value missing evidence families

Why not now:

- it changes capture behavior, which is explicitly outside this reassessment boundary
- the current limited dry-run flow intentionally avoids requiring runtime mutation evidence
- first proving the static diagnostic chain on a real imported site is safer

### D. First Real-Site Operational Test

Value:

- verifies the existing admin API, persisted artifact, latest loader, and read-only surface against one real imported site
- tests the current diagnostic chain without adding new behavior
- reveals real evidence gaps, limitation visibility, and operator comprehension issues
- informs whether the next expansion should be UI trigger, approval marker, candidate discovery, or capture evidence

Risk:

- a real imported site may fail because evidence is missing, stale, or not compatible with the current `ReconstructionDryRunPackage`
- requires careful site selection and strict no-publish/no-reconstruction constraints
- may need seeded or existing dry-run package metadata through already available test/admin flow

Dependency:

- an existing imported site with an Evidence Capture baseline
- layout geometry evidence
- section boundary evidence
- navigation evidence
- a valid `ReconstructionDryRunPackage`, or the ability to seed one using an existing test/admin flow without adding new product behavior
- superadmin access to the existing API trigger and read-only admin page

Why now:

- it answers the biggest remaining uncertainty while preserving the current boundary
- it does not require a UI trigger, approval system, worker, AI, reconstruction, or publish path
- it is the least expansive step after the verified deterministic fixture test

Why not now:

- if no suitable imported site exists, the phase must stop at setup findings rather than expanding implementation
- if evidence is missing, the result may be a controlled fail rather than a successful artifact

### E. Candidate Discovery Implementation

Value:

- moves the reconstruction control plane toward actual candidate inventory
- could make later review and reconstruction planning more concrete
- uses route, navigation, and section evidence as an input foundation

Risk:

- introduces new implementation beyond the limited diagnostic output
- could be mistaken for reconstruction planning or semantic generation
- may require persistence, ranking, confidence scoring, and review semantics

Dependency:

- discovery implementation design
- candidate persistence or artifact strategy
- review and readiness flow decisions
- stronger confidence in real-site evidence quality

Why now:

- Route, Navigation, and Section Models are now feasible and could inform candidate discovery

Why not now:

- implementing discovery before real-site validation may build on untested operational assumptions
- it expands the reconstruction control plane before proving the dry-run diagnostic chain on a real artifact

## Recommendation

Choose exactly one next phase:

> Phase 8B-12 - First Real-Site Limited Dry Run Operational Test

Recommended option: D. first real-site operational test.

Rationale:

Before adding a UI trigger, approval/readiness marker, runtime mutation capture, or candidate discovery implementation, verify that the existing superadmin API trigger, persisted `first_limited_dry_run_output`, latest artifact loader, and read-only admin page work against one real imported site.

This preserves the diagnostic-only boundary and uses the existing flow as-is. The next phase should not add product capability. It should gather operational evidence.

## Real-Site Operational Test Design

Design only for 8B-11. Do not execute this test in 8B-11.

Safest test constraints for 8B-12:

- superadmin only
- existing imported site only
- small/static marketing-style site preferred
- no ecommerce
- no login-gated or cookie-gated content
- no publishing
- no AI or LLM calls
- no reconstruction execution
- no simulation execution
- no worker execution
- no UI trigger
- no capture behavior changes
- no preview behavior changes
- no importer behavior changes
- no persistence schema changes
- use existing admin API trigger only
- inspect existing read-only admin page only

Preferred site shape:

- one public homepage plus a small number of static internal pages
- conventional header navigation
- conventional hero/content/footer sections
- low widget complexity
- no checkout, account area, booking engine, or private content
- already imported through the current GNR8 importer

What 8B-12 should verify:

- Evidence Capture baseline exists for the selected site version
- layout geometry evidence exists
- section evidence exists
- navigation evidence exists
- `ReconstructionDryRunPackage` exists or can be seeded by an existing test/admin flow without new product behavior
- superadmin API trigger accepts only `siteVersionId` and `dryRunId`
- API trigger returns metadata only
- `first_limited_dry_run_output` artifact persists or is reused idempotently
- latest artifact loader resolves the persisted output
- read-only admin page displays route model count
- read-only admin page displays navigation model count
- read-only admin page displays section model count
- read-only admin page displays route, navigation, and section model details
- limitations are visible when evidence is incomplete or low confidence
- output contains no forbidden fields
- no publish, reconstruction, approval, edit, trigger UI, worker, AI, form, or generated-output controls are exposed

Out of scope for 8B-12:

- adding a UI trigger
- adding approval controls
- adding publish controls
- adding edit controls
- adding new API routes
- changing the existing trigger contract
- changing persistence schema
- changing capture, preview, importer, builder, or surface behavior
- running reconstruction, simulation, worker jobs, AI, React generation, block generation, content generation, or design token generation

## Operational Test Success Criteria

PASS:

- trigger creates or reuses a `first_limited_dry_run_output` artifact
- API response contains artifact metadata, validation status, model counts, limitation counts, diagnostics, and idempotency result only
- latest artifact loader returns the persisted output
- read-only surface displays expected Route Model, Navigation Model, and Section Model counts
- route, navigation, and section model details are visible enough for inspection
- limitations are visible when present
- output contains no forbidden generated-output fields
- no publish, reconstruction, simulation, approval, edit, worker, AI, CMS binding, generated React, generated block, or UI trigger paths are exposed

FAIL:

- missing Evidence Capture baseline
- missing layout geometry evidence
- missing section evidence
- missing navigation evidence
- missing or incompatible `ReconstructionDryRunPackage`
- API trigger returns invalid output
- no persisted artifact is created or reused
- latest artifact loader cannot read the artifact
- persisted output contains unsafe or forbidden fields
- trigger response exposes full model arrays or generated-output payloads
- read-only page shows forbidden controls
- read-only page hides limitations needed to understand a blocked or partial result

Controlled fail behavior:

- a fail result should stop the operational test and document the missing prerequisite or unsafe output
- it must not add a fallback path, AI guess, preview scrape, Original Mirror product-truth read, force override, reconstruction execution, worker execution, or publish action

## 8B-12 Boundary

Recommended next phase:

> Phase 8B-12 - First Real-Site Limited Dry Run Operational Test

8B-12 should be validation-only against one carefully selected real imported site. It should use the existing superadmin API trigger and existing read-only admin page. It should not implement new behavior.

If 8B-12 passes, the next decision can compare UI trigger, approval/readiness marker, candidate discovery, and runtime mutation capture using real operational evidence.

If 8B-12 fails, the next decision should address the specific missing prerequisite, not skip ahead to UI trigger, approval, reconstruction, AI, workers, or publishing.
