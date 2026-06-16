# First Limited Dry Run Surface Design

## Scope

Phase 8B-8 designs the read-only operator surface for persisted `FirstLimitedDryRunOutput` artifacts.

This phase answers:

> What should an operator see after a limited dry-run output has been created?

This phase does not implement UI, add API routes, call LLMs, generate React, generate GNR8 blocks, bind CMS content, dispatch workers, execute reconstruction, execute simulation, approve output, or publish anything.

## Surface Title

The operator section title should be:

> First Limited Dry Run

The surface is an artifact inspection surface for the latest persisted `first_limited_dry_run_output` for the current site version and dry-run package.

## Recommended UI Location

Recommendation:

- C. Dedicated admin dry-run page

Rationale:

A dedicated admin dry-run page is the safest first location because the persisted output is detailed, diagnostic, and not yet a normal Site Workspace workflow. It keeps Route Model, Navigation Model, Section Model, limitations, and diagnostics together without crowding the Site Workspace overview. It also reduces the chance that operators confuse this artifact with a publishable reconstruction preview. The Site Workspace overview can later link to the page with a compact status summary, and Admin diagnostics can later deep-link to the same artifact for troubleshooting.

Alternatives not chosen:

- Site Workspace overview: useful later for a compact status tile, but too broad for first detailed model inspection.
- Admin diagnostics panel: useful for troubleshooting, but too diagnostic-only for the main operator review of route/navigation/section models.

## Access Boundary

Initial access should be:

- superadmin-only for the first implementation, matching the 8B-7 trigger boundary
- admin-only in concept only after an explicit future authorization phase
- no public access
- no client-user access
- no tenant-admin access

The page should fail closed when the operator is not authorized. Authorization should happen before loading or displaying the persisted artifact.

## Read-Only Constraints

The surface must be read-only.

It must not expose:

- publish controls
- approve controls
- reconstruction controls
- AI controls
- edit controls
- trigger controls
- route-scope controls
- force/rebuild controls
- worker controls
- queue controls
- CMS binding controls
- generated React controls
- generated block controls
- generated content controls
- design token controls

The surface must not mutate importer behavior, Evidence Capture behavior, Original Mirror behavior, preview behavior, capture behavior, candidate discovery behavior, candidate review behavior, dry-run worker behavior, simulation behavior, reconstruction behavior, persistence schema, or publishing behavior.

## Artifact Summary Display

The top summary should show:

| Field | Display |
|---|---|
| Artifact status | Present, missing, invalid, or blocked based on latest artifact availability, persisted validation, and output status. |
| Output status | `planned`, `valid`, `invalid`, or `blocked` from `FirstLimitedDryRunOutput.outputStatus`. |
| Validation status | Valid/invalid, plus validation error and warning counts. |
| Idempotency result | Last trigger result when available: `reused` or `created`; otherwise show unknown/not recorded for readback-only contexts. |
| Route model count | `routeModels.length`. |
| Navigation model count | `navigationModels.length`. |
| Section model count | `sectionModels.length`. |
| Limitations count | `limitations.length`. |
| Blocker limitations count | limitations with `severity = "blocker"`. |
| Diagnostics | Persisted artifact diagnostics and validation diagnostics. |

The summary should also show reference metadata when available:

- artifact kind
- artifact id
- output id
- site version id
- dry-run id
- reconstruction package id
- output created time
- artifact persisted time
- evidence ref count

The summary should avoid displaying the full raw JSON by default. A later diagnostics-only expansion may expose raw JSON, but the first surface should prioritize structured inspection.

## Route Model Display

Route Models should be displayed as a route list with one row or section per route.

Each Route Model should show:

- `routePath`
- `sourceUrl`
- section count from `sectionRefs.length`
- navigation refs from `navigationRefs`
- confidence from `confidenceLevel`
- limitations resolved from `limitationRefs`

Recommended presentation:

- route path as the primary label
- source URL as secondary traceability text
- count badges for sections, navigation refs, and limitations
- confidence badge using the existing `LOW`, `MEDIUM`, `HIGH` vocabulary
- limitations collapsed by default unless blocker limitations are present

Route limitation resolution should join `limitationRefs` against the top-level `limitations` array. Unresolved limitation refs should appear as diagnostics, not as hidden failures.

No route row should contain controls to edit route path, alter source URL, approve a route, publish a route, generate a route, or change route scope.

## Navigation Model Display

Navigation Models should be displayed by route and navigation id.

Each Navigation Model should show:

- item count from `items.length`
- labels from `items[].label`
- hrefs from `items[].href`
- confidence from `confidenceLevel`
- evidence refs from `sourceEvidenceRefs`

Each navigation item should show:

- position
- label
- href
- item confidence from `confidenceLevel`
- source evidence refs

Recommended presentation:

- compact table ordered by `position`
- route path and navigation id as the group heading
- aggregate confidence badge at group level
- evidence refs collapsed behind a read-only details disclosure

The surface should preserve the distinction between navigation evidence and route approval. A navigation href should not become an operator action to create or approve a route.

## Section Model Display

Section Models should be displayed as ordered sections grouped by route.

Ordering should follow the route model's `sectionRefs` order when available. If a section exists without a route ref, it should be shown in an "Unreferenced sections" diagnostic group.

Each Section Model should show:

- section order within the route
- `sectionId`
- `regionType`
- `selector`
- `boundingBox` as x, y, width, and height
- confidence from `confidenceLevel`
- evidence refs from `sourceEvidenceRefs`
- limitations resolved from `limitationRefs`

Recommended presentation:

- grouped route sections with compact rows
- region type badge
- selector in monospace text
- bounding box displayed as numeric geometry, not as a visual overlay in the first implementation
- confidence badge
- limitation and evidence refs behind read-only disclosures

The first implementation should not render screenshots, overlays, editable selectors, drag handles, bounding-box editors, section reorder controls, or reconstruction controls.

## Limitations Display

Limitations should appear in two places:

- top-level limitations summary
- resolved limitations within route and section model details

The limitations summary should show:

- total limitation count
- blocker limitation count
- limitation severity
- limitation code or kind when present
- human-readable message when present
- source refs when present
- affected route or model refs when present

Blocker limitations should be visually prioritized but should not expose an approve, override, force, or retry action.

## Validation Diagnostics Display

Validation diagnostics should show:

- validation valid/invalid state
- validation errors
- validation warnings
- persisted artifact diagnostics
- trigger diagnostics when they are available from the latest trigger result

Diagnostics should be read-only strings suitable for operator troubleshooting. They should not include stack traces, secrets, database internals, auth internals, raw request bodies, or generated output payloads.

## Empty States

No dry-run output yet:

- State: no latest `first_limited_dry_run_output` artifact exists.
- Display: "No First Limited Dry Run output has been created for this site version yet."
- Allowed action in this phase: none.
- Forbidden action: do not show a trigger button in the read-only surface.

Latest output invalid:

- State: latest artifact exists but validation is invalid or the output no longer validates against `validateFirstLimitedDryRunOutput(...)`.
- Display: invalid status, validation errors, warnings, artifact refs when safe, and diagnostics.
- Allowed action in this phase: none.
- Forbidden action: no repair, force, rebuild, approve, or publish control.

Latest output blocked:

- State: `outputStatus = "blocked"` or blocker limitation count is greater than zero.
- Display: blocked status, blocker limitation count, blocker limitation details, and diagnostics.
- Allowed action in this phase: none.
- Forbidden action: no override or approve control.

Evidence missing:

- State: no output exists because Evidence Capture baseline was missing during the trigger, or persisted diagnostics indicate evidence was unavailable.
- Display: evidence missing status and deterministic diagnostic codes such as `EVIDENCE_CAPTURE_BASELINE_MISSING` when available.
- Allowed action in this phase: none.
- Forbidden action: no capture trigger, no preview read, no live source-site read, no AI guess.

Output exists but has no route models:

- State: artifact exists and validates, but `routeModels.length = 0`.
- Display: valid artifact metadata plus "No route models were produced."
- Include navigation/section counts and limitations so the operator can see why the output is empty.
- Forbidden action: no route-scope editing or route generation.

Output exists but has limitations:

- State: artifact exists and `limitations.length > 0`.
- Display: normal artifact summary with limitations count, blocker count, and limitation details.
- Blocker limitations should be prominent; non-blocker limitations should remain inspectable.
- Forbidden action: no approve, dismiss, edit, retry, force, or publish control.

## Implementation Notes For 8B-9

The next implementation phase should:

- read persisted `first_limited_dry_run_output` artifacts only
- prefer latest artifact readback for a selected site version and dry-run id
- display artifact metadata, counts, model details, limitations, and diagnostics
- keep the surface read-only
- keep first implementation access aligned with superadmin-only trigger access
- avoid implicit trigger execution from page load
- avoid new API routes unless a separate explicit API-surface phase approves them

The next implementation phase should not:

- implement publishing
- implement approval
- implement reconstruction execution
- implement AI generation
- implement React generation
- implement block generation
- implement content generation
- implement design token generation
- implement CMS binding
- implement worker jobs or queues
- implement public/client-user access
- implement tenant-admin access

## Implemented

- Dedicated read-only admin surface for inspecting the latest persisted `first_limited_dry_run_output`.
- Defensive surface projection for artifact metadata, output/validation status, model counts, limitations, blocker limitations, diagnostics, and Route/Navigation/Section Model details.
- Empty states for no output, invalid latest output, blocked latest output, no route models, and outputs with limitations.
- Superadmin-only page access using existing admin page guard patterns.

## Still Missing

- Trigger UI
- Approval workflow
- Worker execution
- Reconstruction execution
- Publishing

## Recommended Next Phase

Recommended next phase:

- Phase 8B-10 - First Limited Dry Run End-to-End Admin Verification

8B-10 should verify the read-only surface end to end against real persisted artifacts. It should not add publish controls, approve controls, reconstruction controls, AI controls, edit controls, trigger controls, worker jobs, queues, public/client access, tenant-admin access, CMS mutation, generated output, or publishing.
