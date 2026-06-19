# Candidate Review Read-Only Surface Design

## Phase And Scope

Phase 8D-4 designs a read-only admin surface for persisted
`candidate_review_package` artifacts. It is design and documentation only.

This phase does not implement UI, add API routes, create review controls, append
review packages, or change Candidate Discovery, Candidate Review contracts or
persistence, Evidence Capture, Limited Dry Run, reconstruction, AI, publishing,
schema, migrations, or workers.

## Surface Purpose

The surface should:

- show the exact persisted review package and its validation state;
- distinguish reviewed and unreviewed candidates;
- show the latest attributed decision for each reviewed candidate;
- preserve the complete immutable review-event history and supersession chains;
- join candidate type, confidence, limitations, and diagnostics from the exact
  linked Candidate Discovery artifact; and
- prepare a stable inspection boundary for a future review action UI.

The surface is an audit and inspection view. It does not create, change,
supersede, approve, reject, or defer a decision. A displayed approval grants
only the eligibility already represented by the persisted review package; page
load creates no new authority.

The operator title should be **Candidate Review**.

## Recommended UI Location

Recommendation: **A. Dedicated admin Candidate Review page**.

A dedicated page keeps attributed human governance separate from deterministic
Candidate Discovery and from general Site Workspace status. It gives immutable
history, latest decisions, source candidate context, and future review controls
a clear ownership boundary without implying that review is reconstruction.

The future implementation should use a route such as
`/gnr8/admin/candidate-review/[siteVersionId]`, consistent with the dedicated
Candidate Discovery admin surface. The exact route is an implementation choice;
Phase 8D-4 creates no route.

Alternatives not chosen:

- **B. Candidate Discovery page extension:** Discovery is an immutable
  deterministic observation, while Review is attributed human judgment.
  Combining them would blur ownership and would modify an existing Discovery
  UI that is outside this phase.
- **C. Future Review Workspace:** a broader workspace is premature before
  review actions, queues, assignment, or workflow exist. The dedicated page can
  become its read-only detail view later.
- **D. Site Workspace:** appropriate later for a compact status/link summary,
  but too broad for package lineage, decision history, and candidate context.

## Source And Read Boundary

The projection reads one selected `candidate_review_package` artifact and the
exact `candidate_discovery_result` named by its
`candidateDiscoveryArtifactId`. The review artifact is authoritative for
review events, latest decisions, counts, attribution, and package diagnostics.
The linked Discovery artifact is authoritative for candidate type, status,
route, confidence, limitations, and candidate diagnostics.

The default view should select the site's
`latestCandidateReviewPackageArtifact`. An explicit artifact-ID view may inspect
an older immutable snapshot, but it must label that snapshot as historical and
must not move the latest pointer. The projection also reads the site's current
`latestCandidateDiscoveryResultArtifact` only to determine staleness. It must
never transfer decisions between Discovery artifacts, even when candidate IDs
match.

## Surface Sections

### Overview

| Field | Display rule |
|---|---|
| Review package ID | `reviewPackageId` |
| Artifact ref | `artifactId`, kind `candidate_review_package`, and whether it is the latest review snapshot |
| Candidate Discovery artifact ID | Exact `candidateDiscoveryArtifactId` reviewed |
| Site version ID | `siteVersionId` |
| Dry-run ID | `dryRunId` |
| Reviewed candidate count | Persisted count, defensively compared with derived latest decisions |
| Approved/rejected/deferred counts | Persisted counts, defensively compared with derived counts |
| Unreviewed candidate count | Linked Discovery candidate count minus exact latest-decision candidate matches |
| Created at | Review package `createdAt` |
| Persisted at | Artifact `persistedAt` as secondary audit metadata |
| Validation status | Persisted validation plus defensive envelope, package, lineage, count, and linked-Discovery validation |

Secondary metadata may show `artifactVersion` and `contractVersion`. Raw JSON
should not be the default presentation.

### Candidate Decision Summary

The summary should show:

- total linked candidates, reviewed candidates, and unreviewed candidates;
- approved, rejected, and deferred counts;
- decision distribution across all linked candidates;
- candidates whose latest decision is represented in the selected snapshot;
- candidates with no latest decision in the selected snapshot; and
- clear stale, empty, invalid, or superseded-history attention indicators.

Unreviewed is the absence of a latest decision. It is a display group, not a
fourth `CandidateReviewDecision` value.

### Latest Decisions

For each reviewed candidate, show:

- `candidateId`;
- latest `decision`;
- `reviewerRef`;
- `decidedAt`;
- optional `rationale`;
- `reviewEventId` for audit traceability;
- nullable `supersedesReviewEventId`; and
- event diagnostics.

Latest decisions must reproduce
`deriveLatestCandidateReviewDecisions(reviewEvents)`. Display ordering must not
be used to infer latest state.

### Review Event History

Show every immutable event, including superseded events, with event ID,
candidate ID, Discovery artifact/site-version/dry-run lineage, decision,
reviewer attribution, trusted decision timestamp, rationale, diagnostics, and
superseded-event reference.

The default history is chronological by `decidedAt`, with `reviewEventId` as a
deterministic tie-breaker. Within candidate details, events may additionally be
shown as an oldest-to-newest supersession chain. The view must label the chain
head and superseded events, preserve branching/cycle validation errors, and
never rewrite malformed history into a plausible chain.

### Candidate Context

Every latest-decision and unreviewed candidate entry should show context from
the exact linked Discovery artifact:

- candidate type and status;
- route path when present;
- confidence level and reasons;
- limitations, including severity, code, message, and source ref;
- candidate diagnostics; and
- source evidence and dry-run refs where useful for audit context.

Missing candidate context is an invalid lineage condition, not a blank valid
candidate. Review-event rationale and diagnostics remain separate from
Discovery limitations and diagnostics.

### Diagnostics

Keep these diagnostic sources visibly distinct:

- artifact/read diagnostics;
- package validation errors and warnings;
- package diagnostics;
- review-event diagnostics; and
- linked Candidate Discovery validation, result, and candidate diagnostics.

Diagnostics must be display-safe and must not expose secrets, stack traces,
database internals, authorization internals, or raw request payloads.

## Grouping And Ordering

The primary review grouping is exactly:

1. approved;
2. rejected;
3. deferred;
4. unreviewed.

Within every decision group, preserve Candidate Discovery grouping:

1. route candidates;
2. navigation candidates;
3. section candidates grouped by `routePath`;
4. unscoped sections last.

Candidate order within each subgroup follows the linked Discovery artifact's
stable candidate order. Section route groups follow first route appearance.
The projection must not sort by confidence, rewrite candidate arrays, infer
missing routes, or transfer a decision from another Discovery artifact.

The chronological Review Event History is a separate audit view and is not
reordered into the candidate presentation order.

## Empty And Attention States

### No Review Package

- Condition: no persisted review artifact is available for the selected site
  version.
- Display: "No Candidate Review package is available for this site version."
- Show no create, retry, or review action.

### Empty Review Package

- Condition: a valid persisted package has no review events and no latest
  decisions.
- Display valid artifact metadata and "This review package contains no review
  events."
- If linked candidates exist, also display them as unreviewed. If none exist,
  state that the linked Discovery artifact has no candidates.

### Invalid Review Package

- Condition: the envelope, package contract, validation metadata, derived
  latest decisions, counts, lineage, linked Discovery artifact, or candidate
  membership cannot be validated.
- Display safe refs plus errors, warnings, and diagnostics.
- Do not repair, sanitize, select a different package, or present decisions as
  authoritative.

### All Candidates Unreviewed

- Condition: the linked Discovery artifact has candidates but none has a valid
  latest decision in the selected package.
- Display all candidates in the unreviewed group and zero reviewed counts.
- Do not imply pending approval or create a review action.

### Stale Relative To Latest Candidate Discovery

- Condition: the selected review package references a valid Discovery artifact
  that is not the site's current latest Candidate Discovery artifact.
- Display both artifact IDs and a prominent historical/stale notice.
- Keep the selected package readable, but never carry its decisions to the
  newer Discovery artifact and never auto-create a replacement package.

### Review Package With Superseded Events

- Condition: one or more review events are referenced by a later event's
  `supersedesReviewEventId`.
- Display current heads in Latest Decisions and the full chains in Review Event
  History, with superseded events clearly labeled.
- Superseded history is an expected audit state, not invalid by itself.

States may overlap. `invalid` takes display precedence over valid attention
states, while `empty_review_package`, `all_candidates_unreviewed`, `stale`, and
`has_superseded_events` remain independent flags so useful audit context is not
discarded.

## Access And Safety Constraints

The initial implementation must be admin/superadmin-only, use an existing
server-side authorization guard, and fail closed before artifact data is
displayed. Superadmin-only is the safe fallback if no narrower existing admin
role can be reused without authorization changes.

The surface must be read-only. It must expose no:

- approve, reject, or defer buttons;
- edit, rationale, reassignment, supersession, or other mutation controls;
- AI controls;
- reconstruction, Structure Planning, or generated-output controls;
- publishing controls; or
- import, capture, dry-run, discovery, review, retry, worker, queue, or trigger
  controls.

Page load must not append a review event or package, advance a pointer, validate
and rewrite persistence, repair history, mutate Candidate Discovery, dispatch a
worker, invoke AI, reconstruct, generate, or publish.

## Projection Shape

The future implementation should introduce a UI-independent read projection:

```ts
type CandidateReviewSurfaceState = "missing" | "invalid" | "ready";
type CandidateReviewSurfaceAttentionState =
  | "empty_review_package"
  | "all_candidates_unreviewed"
  | "stale"
  | "has_superseded_events";

type CandidateReviewSurfaceCandidateContext = {
  candidateId: string;
  candidateType: "route" | "navigation" | "section";
  candidateStatus: "discovered" | "valid" | "invalid" | "blocked";
  routePath?: string;
  confidence: CandidateConfidence;
  sourceEvidenceRefs: CandidateEvidenceRef[];
  sourceDryRunRefs: CandidateEvidenceRef[];
  limitations: CandidateLimitation[];
  diagnostics: string[];
};

type CandidateReviewSurfaceDecision = {
  reviewEventId: string;
  candidateId: string;
  decision: "approved" | "rejected" | "deferred";
  reviewerRef: string;
  decidedAt: string;
  rationale?: string;
  supersedesReviewEventId: string | null;
  diagnostics: string[];
  candidate: CandidateReviewSurfaceCandidateContext;
};

type CandidateReviewSurfaceEvent = {
  reviewEventId: string;
  candidateDiscoveryArtifactId: string;
  candidateId: string;
  siteVersionId: string;
  dryRunId: string;
  decision: "approved" | "rejected" | "deferred";
  reviewerRef: string;
  decidedAt: string;
  rationale?: string;
  supersedesReviewEventId: string | null;
  superseded: boolean;
  chainHeadReviewEventId: string | null;
  diagnostics: string[];
};

type CandidateReviewSurfaceCandidateGroups<T> = {
  routes: T[];
  navigation: T[];
  sectionsByRoute: Array<{ routePath: string; candidates: T[] }>;
  unscopedSections: T[];
};

type CandidateReviewSurfaceProjection = {
  artifact: {
    kind: "candidate_review_package";
    artifactId: string;
    artifactVersion: 1;
    reviewPackageId: string;
    candidateDiscoveryArtifactId: string;
    siteVersionId: string;
    dryRunId: string;
    contractVersion: string;
    createdAt: string;
    persistedAt: string;
    isLatestReviewArtifact: boolean;
  } | null;
  validation: {
    status: "valid" | "invalid" | "unavailable";
    errors: string[];
    warnings: string[];
  };
  linkedCandidateDiscovery: {
    artifactId: string;
    latestArtifactId: string | null;
    discoveryId: string;
    siteVersionId: string;
    dryRunId: string;
    candidateCount: number;
    candidateTypesPresent: CandidateType[];
    validationStatus: "valid" | "invalid";
    stale: boolean;
  } | null;
  counts: {
    candidates: number;
    reviewed: number;
    unreviewed: number;
    approved: number;
    rejected: number;
    deferred: number;
    reviewEvents: number;
    supersededEvents: number;
  };
  groupedLatestDecisions: {
    approved: CandidateReviewSurfaceCandidateGroups<CandidateReviewSurfaceDecision>;
    rejected: CandidateReviewSurfaceCandidateGroups<CandidateReviewSurfaceDecision>;
    deferred: CandidateReviewSurfaceCandidateGroups<CandidateReviewSurfaceDecision>;
  };
  unreviewedCandidates:
    CandidateReviewSurfaceCandidateGroups<CandidateReviewSurfaceCandidateContext>;
  reviewEventHistory: CandidateReviewSurfaceEvent[];
  state: CandidateReviewSurfaceState;
  attentionStates: CandidateReviewSurfaceAttentionState[];
  diagnostics: {
    artifact: string[];
    package: string[];
    reviewEvents: string[];
    candidateDiscovery: string[];
  };
};
```

The projection must defensively validate the artifact and package, reproduce
latest decisions and counts from immutable events, resolve every reviewed and
unreviewed candidate against the exact Discovery artifact, and preserve source
ordering. Malformed data produces an `invalid` projection rather than throwing
the page or silently appearing as `missing`.

`CandidateReviewSurfaceProjection` is display-only. It is not a new persistence
contract, decision contract, queue, or write model.

## Relationship To Future UI

```text
Read-only Candidate Review surface
        |
        v
Future review action controls
        |
        v
Future Candidate Review package append
        |
        v
Future Reconstruction Package handoff
```

The read-only projection should remain the audit/read foundation when actions
arrive. A later explicit phase may add authenticated approve/reject/defer
commands that create immutable events and append a validated package snapshot.
Those commands must not mutate this projection or prior artifacts.

Only latest `approved` decisions may later be eligible for Reconstruction
Package handoff, and that handoff requires its own contract and implementation.
No action UI, append workflow, reconstruction handoff, AI, or publishing is
part of Phase 8D-4.

## Phase 8D-4 Completion Boundary

At the end of Phase 8D-4, the dedicated admin location, read boundary, surface
sections, decision and Discovery grouping, empty and attention states, safety
constraints, defensive `CandidateReviewSurfaceProjection`, and future action
relationship are defined.

No UI, API route, review control, review event, package append, reconstruction
output, generated React/block/content, publishing artifact, schema, migration,
worker, or runtime behavior has been created or changed.

The recommended next phase is **Phase 8D-5 - Candidate Review Read-Only Surface
Implementation**, limited to the defensive projection and dedicated admin
read-only page using existing artifact reads and authorization boundaries.

## Phase 8D-5 Implementation

Phase 8D-5 implements the design as a dedicated read-only admin route:

`/gnr8/admin/candidate-review/[siteVersionId]`

`CandidateReviewSurfaceProjection` defensively reads the latest persisted
review artifact, validates its envelope and package, resolves the exact linked
Candidate Discovery artifact, reproduces latest decisions from immutable
events, and derives counts and supersession history. It groups approved,
rejected, deferred, and unreviewed candidates in linked Discovery order:
routes, navigation, then sections by route.

The page uses the existing server-side superadmin guard and displays Overview,
Decision Summary, Latest Decisions, Event History, Candidate Context, and
Diagnostics. It represents missing, empty, invalid, all-unreviewed, stale, and
superseded-history states without buttons, forms, inputs, mutation prompts, or
review, edit, AI, reconstruction, publishing, and trigger controls.

Phase 8D-5 changes no Candidate Review or Candidate Discovery contract or
persistence behavior, Evidence Capture, Limited Dry Run, reconstruction, AI,
publishing, schema, migrations, or workers.

The recommended next phase is **Phase 8D-6 - Candidate Review End-to-End Admin
Verification**.

## Phase 8D-6 Verification

Phase 8D-6 completed the read-only production check for ODV site version
`09dce7ea-d860-4f60-a1eb-26c3335b302e` and ViroiDoc site version
`e26b0754-988b-45b9-9e24-8e213179b6cf`. The canonical latest package loader
returns `null` for both targets because neither provenance summary contains a
persisted `candidate_review_package`.

The surface loader correctly returns `validation.status = unavailable`, state
`missing`, zero counts/groups/history, and
`CANDIDATE_REVIEW_PACKAGE_MISSING`. The page source contains Candidate Review,
Overview, Decision Summary, Latest Decisions, Event History, Candidate Context,
and the explicit missing-package message. It contains no form, button, input,
textarea, select, review action, AI, reconstruction, publishing, or trigger
control. No projection/display defect was found, and no application behavior
changed.

Detailed evidence is recorded in
`docs/architecture/CANDIDATE_REVIEW_ADMIN_VERIFICATION.md`. The recommended next
phase is **Phase 8D-6F - Candidate Review Real-Target Package Persistence
Completion**, followed by a separately authorized read-only 8D-6R verification.

## Phase 8D-6R Present-Artifact Verification

Phase 8D-6R loaded the exact persisted ODV and ViroiDoc Candidate Review
artifacts through the canonical latest loader and projected their linked real
Candidate Discovery artifacts. ODV projects `4` candidates and ViroiDoc
projects `5`; every candidate is unreviewed. Both projections are `ready` and
`valid`, with reviewed, approved, rejected, deferred, latest-decision, review
event, and superseded-event counts all zero. Both explicitly expose
`empty_review_package` and `all_candidates_unreviewed`.

The page render contract contains Candidate Review, Overview, Decision Summary,
Latest Decisions, Event History, and Candidate Context, together with the
all-unreviewed and empty-review states. It contains no button, form, input,
textarea, select, review action, AI control, reconstruction control, or
publishing control. No projection/display defect was found and no application
code changed. An unauthenticated production-browser check reached the guarded
Login page; no authenticated superadmin browser session was available, so the
deployed authenticated page was not visually observed.

Detailed evidence is recorded in
`docs/architecture/CANDIDATE_REVIEW_ADMIN_VERIFICATION.md`. The recommended next
phase is **Phase 8D-7 - Candidate Review Next-Boundary Reassessment**, limited
to documentation and read-only analysis.
