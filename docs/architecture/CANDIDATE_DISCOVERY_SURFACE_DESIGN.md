# Candidate Discovery Read-Only Surface Design

## Phase And Scope

Phase 8C-8 designs a read-only operator surface for persisted
`candidate_discovery_result` artifacts. It is design and documentation only.

This phase does not implement UI, add API routes, change Candidate Discovery
building or persistence, create Candidate Review packages, execute
reconstruction, call AI, generate React or blocks, bind CMS content, publish,
add migrations, or change importer, Evidence Capture, worker, preview, or
Limited Dry Run behavior.

## Surface Purpose

The surface should:

- show what GNR8 deterministically discovered
- expose the evidence, confidence, diagnostics, and limitations behind each
  candidate
- make blocked or incomplete discovery results legible to an operator
- prepare a stable inspection boundary for future Candidate Review

The surface does not approve or reject candidates. It displays an immutable
discovery artifact; it does not turn that artifact into a review decision,
reconstruction plan, or executable output.

The operator title should be **Candidate Discovery**.

## Recommended UI Location

Recommendation: **B. Dedicated admin Candidate Discovery page**.

Candidate Discovery contains detailed artifact lineage, three candidate types,
evidence refs, limitations, and diagnostics. A dedicated admin page keeps that
diagnostic detail together without crowding the Site Workspace overview or
implying that discovery is already part of Candidate Review. It can later be
linked from a compact Site Workspace status summary and can remain the source
inspection view when a separate review workflow exists.

Alternatives not chosen:

- **A. Site Workspace overview:** appropriate later for a small status and count
  summary, but too broad for the initial detailed evidence view.
- **C. Existing First Limited Dry Run page:** Candidate Discovery is a distinct
  persisted artifact and semantic boundary; combining the pages would blur
  normalized dry-run models with discovered candidates.
- **D. Future Candidate Review page:** no review workflow exists yet, and placing
  discovery there would imply approval/rejection capability that this phase
  explicitly forbids.

## Access And Safety Constraints

The first implementation must be admin/superadmin-only, using an existing
server-side admin authorization pattern and failing closed before artifact data
is displayed. It must have no public, client-user, or unauthenticated access.
The implementation phase should choose the narrowest existing admin role that
can be reused without changing authorization behavior; superadmin-only is the
safe fallback.

The surface must be read-only. It must expose no:

- approve or reject controls
- Candidate Review controls or review-state mutation
- reconstruction, planning, or execution controls
- AI controls
- edit, reorder, override, dismiss, or repair controls
- publish controls
- import, capture, dry-run, discovery, rebuild, retry, worker, or queue triggers
- generated React, block, content, CMS binding, or design-token controls

Page load must not build, validate-and-rewrite, persist, repair, trigger, or
advance any artifact pointer. A trigger may be considered only in a later,
explicitly approved phase and must not be implied by this design.

## Surface Sections

### Overview

The overview identifies exactly which immutable artifact is being inspected:

| Field | Display rule |
|---|---|
| Artifact ref | `artifactId`, with kind `candidate_discovery_result` |
| Discovery ID | `discoveryId` |
| Site version ID | `siteVersionId` |
| Dry-run ID | `dryRunId` |
| Candidate count | persisted `candidateCount`, defensively compared with the projected list length |
| Candidate types present | canonical `route`, `navigation`, `section` values present in the artifact |
| Validation status | persisted status plus defensive projection validity and error/warning counts |
| Limitation count | result-level master-ledger count |
| Blocker count | result-level limitations with `severity = "blocker"` |
| Created at | result `createdAt` |

Secondary metadata may show `persistedAt`, `artifactVersion`, `builderVersion`,
and `contractVersion`. The surface should not show raw JSON by default.

### Candidate Summary

The summary should show:

- route candidate count
- navigation candidate count
- section candidate count
- confidence distribution across `LOW`, `MEDIUM`, and `HIGH`
- result-level limitation totals by `note`, `warning`, and `blocker`
- a compact limitations summary using the result-level master ledger

Counts are projections, not new persisted facts. They must be computed without
mutating or reordering the persisted result.

### Candidate List

Every candidate entry should show:

- `candidateId`
- `candidateType`
- `candidateStatus`
- confidence level and confidence reasons
- `routePath` when present
- `sourceEvidenceRefs`, including source kind, ref ID, and route path when present
- `sourceDryRunRefs`, including source kind, ref ID, and route path when present
- attached limitations
- diagnostics

Evidence refs, dry-run refs, limitations, confidence reasons, and diagnostics
should use read-only details disclosures where compact display is helpful.
Blockers must be prominent, but they must not gain override or retry actions.

## Grouping And Ordering

The surface preserves the builder's stable candidate order; it does not sort by
confidence, status, label, or timestamp.

Presentation order is:

1. route candidates
2. navigation candidates
3. section candidates grouped by `routePath`

Within each type and route group, candidates retain their relative order from
`result.candidates`. Route groups are introduced in first-appearance order from
the builder output. Sections without a usable `routePath` appear after routed
section groups in an **Unscoped sections** diagnostic group, preserving their
relative builder order. Navigation candidates remain in their original order
and display `routePath` when available; they are not inferred into new route
groups.

This grouping is a view projection only. It must not rewrite candidate arrays,
deduplicate refs, infer missing route relationships, or change canonical
builder output.

## Empty And Attention States

### No Candidate Discovery Result

- Condition: no persisted artifact is available for the selected site version
  and optional dry-run scope.
- Display: "No Candidate Discovery result is available for this site version."
- Show no action or trigger.

### Invalid Result

- Condition: a stored value exists but its envelope or result fails defensive
  validation, has inconsistent lineage/counts, or cannot be projected safely.
- Display safe artifact refs when available, `invalid` status, validation
  errors/warnings, and read diagnostics.
- Do not repair, sanitize, rebuild, or fall back to a different interpretation.

### Blocked Result

- Condition: the result has no candidates and its deterministic diagnostics or
  result-level limitations identify a blocked discovery outcome.
- Display blocked status, blocker count, blocker details, limitations, and
  diagnostics.
- Do not override or approve the result.

### No Candidates

- Condition: a contract-valid artifact has `candidateCount = 0` and no blocker
  classification applies.
- Display valid artifact metadata and "No candidates were discovered," plus
  limitations and diagnostics explaining the empty result when present.

### Candidates With Limitations

- Condition: candidates exist and the result-level or candidate-level
  limitation set is non-empty.
- Display the normal grouped list with limitation counts, severity summary, and
  candidate-attached details. This is an attention state, not an error and not
  a review decision.

### Candidates With Blockers

- Condition: candidates exist while result-level or candidate-attached blocker
  limitations are present.
- Display a prominent blocker banner, affected candidate details, the complete
  result-level blocker ledger, and diagnostics.
- Do not hide non-blocked candidates and do not expose force, dismiss, approve,
  retry, reconstruction, or publishing controls.

Attention-state precedence is `invalid`, then `blocked`, then `no_candidates`,
then `candidates_with_blockers`, then `candidates_with_limitations`, then
`ready`. The absence of an artifact is represented separately as `missing`.

## Read Model Projection Design

The future implementation should introduce a UI-independent read model shaped
like this:

```ts
type CandidateDiscoverySurfaceEmptyState =
  | "missing"
  | "invalid"
  | "blocked"
  | "no_candidates"
  | "candidates_with_limitations"
  | "candidates_with_blockers"
  | "ready";

type CandidateDiscoverySurfaceCandidate = {
  candidateId: string;
  candidateType: "route" | "navigation" | "section";
  candidateStatus: "discovered" | "valid" | "invalid" | "blocked";
  confidence: { level: "LOW" | "MEDIUM" | "HIGH"; reasons: string[] };
  routePath?: string;
  sourceEvidenceRefs: CandidateEvidenceRef[];
  sourceDryRunRefs: CandidateEvidenceRef[];
  limitations: CandidateLimitation[];
  diagnostics: string[];
};

type CandidateDiscoverySurfaceProjection = {
  artifact: {
    kind: "candidate_discovery_result";
    artifactId: string;
    artifactVersion: 1;
    discoveryId: string;
    siteVersionId: string;
    dryRunId: string;
    builderVersion: string;
    contractVersion: string;
    createdAt: string;
    persistedAt: string;
  } | null;
  validation: {
    status: "valid" | "invalid" | "unavailable";
    errors: string[];
    warnings: string[];
  };
  counts: {
    total: number;
    byType: { route: number; navigation: number; section: number };
    byConfidence: { LOW: number; MEDIUM: number; HIGH: number };
    limitations: number;
    blockers: number;
  };
  candidateTypesPresent: CandidateType[];
  groups: {
    routes: CandidateDiscoverySurfaceCandidate[];
    navigation: CandidateDiscoverySurfaceCandidate[];
    sectionsByRoute: Array<{
      routePath: string;
      candidates: CandidateDiscoverySurfaceCandidate[];
    }>;
    unscopedSections: CandidateDiscoverySurfaceCandidate[];
  };
  limitations: CandidateLimitation[];
  diagnostics: string[];
  emptyState: CandidateDiscoverySurfaceEmptyState;
};
```

The projection should consume only the persisted artifact or an absent/invalid
read outcome. It should clone data for display, preserve candidate/ref/detail
ordering, calculate counts defensively, and keep result-level limitations as
the authoritative master ledger. Candidate-attached limitations remain visible
context and must not be added again to the result-level count.

Malformed persisted values must produce an `invalid` projection with safe
diagnostics rather than throwing the page, mutating provenance, or silently
appearing as `missing`. Diagnostics must not expose secrets, stack traces,
database internals, authorization internals, or raw request payloads.

## Phase 8C-8 Completion Boundary

At the end of Phase 8C-8, the purpose, dedicated admin location, access and
safety boundary, overview and candidate sections, stable grouping, empty and
attention states, and `CandidateDiscoverySurfaceProjection` are defined.

No UI, API route, trigger, Candidate Review package, reconstruction output,
generated React/block/content, CMS binding, publishing artifact, migration, or
runtime behavior has been created or changed.

The recommended next phase is **Phase 8C-9 - Candidate Discovery Read-Only
Surface Implementation**, limited to the defensive projection and dedicated
admin read-only page using existing artifact read and authorization boundaries.

## Phase 8C-9 Implementation Closure

Phase 8C-9 implements the designed surface at
`/gnr8/admin/candidate-discovery/[siteVersionId]`. The page uses the existing
server-side superadmin page guard and loads the latest stored
`candidate_discovery_result` from the site-version import-provenance summary.

`CandidateDiscoverySurfaceProjection` is implemented in
`apps/platform/gnr8/architecture/candidate-discovery-surface-projection.ts`.
It defensively validates the stored envelope, persisted validation metadata,
result contract, and lineage; projects artifact metadata and validation;
computes candidate-type and confidence counts; keeps the result-level
limitation ledger authoritative; and emits safe missing or invalid models
without mutating persistence.

Routes render first, navigation candidates second, and sections third grouped
by first `routePath` appearance. Candidate order within every group matches the
builder output. Unscoped sections remain in their own final diagnostic group.
The page renders missing, invalid, blocked, no-candidate, limitation, and
blocker states without buttons, forms, inputs, or mutation controls.

The recommended next phase is **Phase 8C-10 - Candidate Discovery End-to-End
Admin Verification**.
