# Reconstruction Package Builder Design

## Phase And Boundary

Phase 8E-2 defines how a deterministic builder creates a
`ReconstructionPackage` from one exact latest `CandidateReviewPackage` and its
linked `CandidateDiscoveryResult`.

This phase is documentation and architecture only. It does not implement a
builder, persist packages, create a Structure Plan, generate content, call AI,
execute reconstruction, dispatch workers, publish, or modify any schema,
review API, review UI, Candidate Discovery, Candidate Context, Candidate
Review, Evidence Capture, generation, or publishing system.

The design answers one question:

> How does the canonical system map reviewed approvals into an 8E
> Reconstruction Package without generating or planning anything?

## Builder Purpose

The builder converts:

```text
CandidateReviewPackage
+ linked CandidateDiscoveryResult
-> ReconstructionPackage
```

The builder is a pure, deterministic mapping layer. It reads one already
selected Review Package artifact and one exact linked Discovery artifact, then
returns a metadata-only Reconstruction Package shaped by the 8E contract.

The builder does not:

- create structure plans;
- infer route hierarchy, navigation composition, section order, component
  choice, layout, or reconstruction technique;
- generate, rewrite, or synthesize content;
- call AI systems;
- execute review actions or reconstruction work;
- persist packages or advance latest pointers;
- publish, deploy, enqueue workers, or mutate external state.

## Inputs

### Required Inputs

The builder requires:

1. **Exact latest `CandidateReviewPackage` artifact**
   - Includes the immutable `CandidateReviewPackage` payload.
   - Includes the exact `candidateReviewPackageArtifactId`.
   - Has already been selected through the canonical latest Review Package
     boundary for the same site-version and dry-run lineage.
   - Must validate as a Candidate Review Package before mapping.

2. **Linked `CandidateDiscoveryResult`**
   - Includes the immutable Discovery payload referenced by the Review Package
     `candidateDiscoveryArtifactId`.
   - Includes the exact Discovery artifact identity used for lineage matching.
   - Must validate as a Candidate Discovery Result before mapping.

The Review Package is the only authorizing input. The Discovery Result defines
candidate metadata and source evidence for the exact candidate instances that
were reviewed; it does not independently authorize inclusion.

### Optional Supporting Lineage

The builder may carry additional refs when they are already known from the
Review or Discovery chain:

- Evidence Capture baseline refs;
- Candidate Context refs;
- FirstLimitedDryRunOutput refs.

These refs are lineage and audit support only. They must not add candidates,
change decisions, improve status, or infer approval.

## Eligibility Mapping

Eligibility is derived from the latest decisions inside the exact selected
Review Package.

Only candidates whose latest decision is `approved` become
`approvedCandidateRefs`.

The builder excludes:

- `rejected` candidates;
- `deferred` candidates;
- unreviewed candidates;
- superseded approvals;
- stale review decisions;
- decisions whose candidate ref cannot be found in the linked Discovery
  artifact.

Rejected, deferred, and unreviewed candidates may contribute only to
eligibility counts and diagnostics. They must not appear in
`approvedCandidateRefs`, optional source refs, hidden buckets, or downstream
planning inputs.

Supersession is handled before mapping. The builder consumes only the
validated `latestDecisions` projection from the Review Package. If
`latestDecisions` does not exactly match the package event history, the Review
Package validation fails and the builder returns `invalid`.

Unreviewed count is discovered from the linked Discovery Result:

```text
unreviewed = discovery.candidates.length - reviewed latest decision count
```

The calculation is scoped to the exact Discovery artifact referenced by the
Review Package. Candidates from other Discovery artifacts do not contribute to
the count.

## Candidate Ref Construction

For every included approved candidate, the builder maps one
`ReconstructionPackageCandidateRef`.

Required mapping:

| Reconstruction candidate ref field | Source |
| --- | --- |
| `candidateId` | Matching `Candidate.candidateId` from the linked Discovery Result |
| `candidateType` | Matching `Candidate.candidateType` |
| `routePath` | Matching `Candidate.routePath`, when present |
| `confidence` | Matching `Candidate.confidence`, when present |
| `decisionReviewEventId` | Authorizing latest approved `reviewEventId` |
| `decision` | Constant `approved` |
| `sourceCandidateRefs` | Deterministic refs to the exact source candidate instance |
| `evidenceRefs` | Deterministic refs copied from candidate evidence and dry-run refs |

The source candidate ref must identify the exact reviewed candidate instance,
not a logical or best-effort match. The canonical source ref format for the
first implementation should be:

```text
candidate-discovery:<candidateDiscoveryArtifactId>:<candidateId>
```

Evidence refs should be copied from:

- `Candidate.sourceEvidenceRefs[].refId`;
- `Candidate.sourceDryRunRefs[].refId`;
- optional already-linked Candidate Context refs when available.

Evidence refs must be de-duplicated in stable order. Missing optional evidence
does not by itself remove an approved candidate unless required lineage is
missing or invalid.

Candidate ordering must be deterministic:

1. Preserve the validated Review Package `latestDecisions` order for approved
   decisions.
2. Use `candidateDiscoveryArtifactId + candidateId + reviewEventId` as a
   stable tie-breaker if an implementation ever needs one.

## Package Identity

The builder derives package identity from:

- `candidateReviewPackageArtifactId`;
- `RECONSTRUCTION_PACKAGE_CONTRACT_VERSION`.

The canonical identity shape is:

```text
reconstruction-package:<candidateReviewPackageArtifactId>:<contractVersion>
```

This guarantees that the same Review Package artifact and the same contract
version derive the same package identity. A newer Review Package artifact
creates a new Reconstruction Package identity. The builder must not accept a
caller-supplied package ID.

## Status Rules

The first deterministic builder uses these terminal statuses:

| Status | Rule |
| --- | --- |
| `valid` | At least one approved candidate is included, required lineage is valid, the Review Package artifact is latest, the linked Discovery artifact matches, and 8E contract validation passes. |
| `blocked` | No approved candidates are eligible, or required lineage is missing. |
| `stale` | The supplied Review Package artifact is not the current latest Review Package artifact for the lineage. |
| `invalid` | Candidate Review validation, Candidate Discovery validation, lineage consistency, mapping invariants, or Reconstruction Package contract validation fails. |

`planned` remains an allowed 8E contract status, but Phase 8E-3 does not need
to emit it. The builder produces a completed metadata package result, not an
intermediate planning lifecycle state.

Status precedence is fail-closed:

1. Invalid input shape or contract validation failure -> `invalid`.
2. Non-latest Review Package artifact -> `stale`.
3. Missing required lineage or zero approved included candidates -> `blocked`.
4. Otherwise -> `valid`.

Blocked and stale packages are metadata-only diagnostics. They do not authorize
Structure Planning, reconstruction, dry-run execution, publishing, or generated
output.

## Limitation Propagation

The builder propagates limitations that already exist in the authorizing and
source inputs:

- Review Package limitations or diagnostics that describe package-level review
  constraints;
- limitations on included source candidates;
- Discovery limitations that apply to included candidates or to their shared
  lineage.

The builder must not invent new limitations except deterministic builder
blockers, such as:

- no approved candidates;
- missing linked Discovery artifact;
- candidate missing from linked Discovery artifact;
- Review Package artifact is not latest;
- Discovery artifact mismatch;
- contract validation failed.

When the 8E contract stores limitations as strings, propagated limitation
entries should preserve the source code, source ref, and message in a stable,
human-readable form. They should not convert warnings into blockers unless the
builder itself detects a deterministic blocker.

Limitations explain the metadata package. They must not remove an approved
candidate unless they correspond to missing required lineage, invalid input, or
a missing exact candidate ref.

## Diagnostics

The builder emits deterministic diagnostics suitable for audit and tests.

Required diagnostic coverage:

- approved candidate count;
- included approved candidate count;
- excluded rejected count;
- excluded deferred count;
- excluded unreviewed count;
- lineage validation result;
- latest Review Package artifact comparison result;
- Discovery artifact match result;
- missing candidate checks;
- supersession/latest-decision verification result;
- Reconstruction Package validation result.

Diagnostics are descriptive metadata. They must not contain AI output,
generated content, planning output, execution instructions, worker state,
deployment state, or publishing state.

## Staleness Detection

The builder detects stale or mismatched inputs before marking a package
`valid`.

### Review Package Artifact Is Not Latest

The canonical latest Review Package artifact is resolved before builder
execution. The builder must compare:

```text
input.candidateReviewPackageArtifactId
==
latestCandidateReviewPackageArtifactIdForLineage
```

If the IDs differ, the result is `stale`. The builder must not silently reload,
rebase, or merge the newer package.

### Discovery Artifact Mismatch

The linked Discovery artifact must match the Review Package lineage:

```text
reviewPackage.candidateDiscoveryArtifactId
==
candidateDiscoveryArtifactId
==
discoveryArtifactId
```

The `siteVersionId` and `dryRunId` must also match between Review and
Discovery payloads. Any mismatch returns `invalid` because the candidate
metadata no longer describes the reviewed artifact instance.

### Candidate Missing

Every approved latest decision must resolve to exactly one candidate in the
linked Discovery Result by:

```text
candidateDiscoveryArtifactId + candidateId
```

If an approved latest decision references a missing candidate, that candidate
is not included and the package is blocked or invalid depending on whether the
missing ref represents absent required lineage or a malformed source package.
The first implementation should treat a missing approved candidate as
`invalid` because the Review Package and linked Discovery artifact disagree.

### Superseded Decision Included

The builder must never include historical approved events directly from
`reviewEvents`. It includes only approvals from the validated `latestDecisions`
projection. If a candidate has a later rejected or deferred decision, the
prior approval is superseded and excluded.

If the package includes an approval that is not present in the exact validated
latest projection, the result is `invalid`.

## Example

Input Discovery Result:

| Candidate | Type | Review state |
| --- | --- | --- |
| `route-home` | route | approved |
| `nav-primary` | navigation | deferred |
| `section-hero` | section | rejected |
| `section-footer` | section | unreviewed |

Input Review Package latest decisions:

| Candidate | Latest decision | Review event |
| --- | --- | --- |
| `route-home` | approved | `review-event-route-approved` |
| `nav-primary` | deferred | `review-event-nav-deferred` |
| `section-hero` | rejected | `review-event-section-rejected` |

Expected Reconstruction Package:

```text
approvedCandidateRefs.length = 1
approvedCandidateRefs[0].candidateId = route-home
approvedCandidateRefs[0].candidateType = route
approvedCandidateRefs[0].decisionReviewEventId = review-event-route-approved
eligibilitySummary.approvedCount = 1
eligibilitySummary.rejectedCount = 1
eligibilitySummary.deferredCount = 1
eligibilitySummary.unreviewedCount = 1
eligibilitySummary.includedCount = 1
eligibilitySummary.excludedCount = 3
reconstructionPackageStatus = valid
```

No navigation, rejected section, or unreviewed section appears in
`approvedCandidateRefs`.

## Phase 8E-3 Implementation Closure

Phase 8E-3 implements
`apps/platform/gnr8/architecture/reconstruction-package-builder.ts` as the
pure deterministic builder described by this design.

The builder accepts:

- one exact `CandidateReviewPackage`;
- the linked `CandidateDiscoveryResult`;
- the exact `candidateReviewPackageArtifactId`;
- the current `latestCandidateReviewPackageArtifactId`;
- the 8E contract version, using `8E-1` by default.

The output is one metadata-only `ReconstructionPackage`. Identity is derived
as:

```text
reconstruction-package:<candidateReviewPackageArtifactId>:<contractVersion>
```

The implementation includes only latest approved decisions that resolve to an
exact candidate in the linked Discovery result. It copies candidate ID,
candidate type, route path when available, confidence when available, the
authorizing `reviewEventId`, deterministic source candidate refs, and stable
deduplicated source evidence/dry-run refs. Rejected, deferred, unreviewed,
superseded, stale, and missing-candidate refs are excluded from
`approvedCandidateRefs`.

The builder produces `valid`, `blocked`, `stale`, or `invalid` according to
the 8E status rules and runs `validateReconstructionPackage(...)` on its own
output. Source limitations are propagated as deterministic strings and new
limitations are limited to builder blockers such as stale input, missing
approved candidates, no approved candidates, lineage mismatch, or contract
validation failure. Diagnostics cover Review validation, Discovery validation,
latest-head comparison, lineage matching, approved/included/excluded counts,
missing candidates, and Reconstruction Package validation.

Focused tests live in
`apps/platform/gnr8/architecture/reconstruction-package-builder.test.ts` and
cover valid output, rejected/deferred/unreviewed/superseded exclusions,
blocked no-approval output, stale detection, missing-candidate diagnostics,
deterministic identity, count validation, forbidden-field absence, and
contract validation of valid output.

Phase 8E-3 adds no:

- persistence;
- latest pointer mutation;
- Review API or Review UI changes;
- Candidate Discovery, Candidate Context, Candidate Review, or Evidence Capture
  behavior changes;
- Structure Planning;
- reconstruction execution;
- AI calls;
- generation;
- publishing;
- schema or worker changes.

It also adds no Structure Plan, generated React, generated blocks, generated
content, AI output, publishing artifact, migration, API, UI, or behavior
outside the pure builder boundary.

## 8E-3 Exit State

At the end of 8E-3, the project has a pure deterministic builder for creating
a metadata-only Reconstruction Package from approved latest review decisions
and the exact linked Discovery artifact. No generation, planning, persistence,
or execution behavior exists.

Recommended next phase at 8E-3 completion:

> **Phase 8E-4 - Reconstruction Package Real-Artifact Validation**

## Phase 8E-5 Persistence Boundary Design Note

Phase 8E-5 defines how packages produced by this pure builder should be stored
later. The persistence design keeps the builder output immutable and
metadata-only, stores `reconstruction_package` artifacts in the existing
site-version provenance boundary, and uses append-only
`reconstructionPackageArtifacts` plus `latestReconstructionPackageArtifact`.

The persistence boundary must run `validateReconstructionPackage(...)`, enforce
the recursive forbidden-field guard, check exact Review/Discovery/site-version
lineage, and reject packages that are already `stale` or `invalid`. It persists
only current `valid` or `blocked` package outputs and never reruns, rebases, or
modifies the builder result while writing.

The persistence design adds no Structure Planning, AI output, generated content,
publishing artifact, execution artifact, schema change, worker, Review API,
Review UI, or behavior change. Detailed design:
`docs/architecture/RECONSTRUCTION_PACKAGE_PERSISTENCE_BOUNDARY.md`.

Recommended next phase after 8E-5:

> **Phase 8E-6 - Reconstruction Package Persistence Implementation**
