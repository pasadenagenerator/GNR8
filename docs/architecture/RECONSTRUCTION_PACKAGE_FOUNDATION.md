# Reconstruction Package Foundation

## Phase And Boundary

Phase 8E-0 defined the canonical Reconstruction Package boundary as
documentation and architecture only. Phase 8E-1 now formalizes that boundary
as pure contract types, validation helpers, and a blocked-package helper. It
does not implement a builder, persistence path, API, UI, worker, planning
system, reconstruction, AI operation, generation, deployment, or publishing
behavior.

The boundary answers one question:

> How do approved review decisions become a deterministic, immutable handoff
> for future reconstruction planning without performing reconstruction?

## Purpose

The two package boundaries have different ownership:

```text
Candidate Review Package = what was approved
Reconstruction Package   = what is eligible for future reconstruction
```

A Candidate Review Package is the immutable human-decision snapshot. A
Reconstruction Package is a non-executing projection of that snapshot: it
identifies the exact approved candidate instances that a later Structure
Planning phase may consider.

The Reconstruction Package does not decide how to reconstruct a candidate. It
does not create target structure, assign component or block types, generate
content, or authorize execution. Eligibility for future planning is not
execution approval.

## Canonical Input

### Required Inputs

The exact required input is:

1. **One exact immutable latest `CandidateReviewPackage` artifact**, including
   its artifact identity and validated package payload.
2. **Only the latest `approved` decisions derived inside that exact package**.
   These are a deterministic projection of the required package, not a second
   caller-selected source.

"Latest" is resolved once, before derivation, through the canonical Candidate
Review latest-artifact boundary. Package construction must bind to that exact
artifact ID. It must not follow a latest pointer again during derivation,
silently rebase, merge package heads, or accept an arbitrary historical
package while describing it as current.

The input package must be valid. Its `latestDecisions` must exactly reproduce
the decisions derived from its immutable event history. Each included approval
must identify an exact candidate instance by
`candidateDiscoveryArtifactId + candidateId` and retain its authorizing
`reviewEventId`.

### Supporting Lineage

Candidate Discovery, Candidate Context, and Evidence lineage are supporting,
non-authorizing dependencies:

| Lineage | Treatment | Authority |
| --- | --- | --- |
| Candidate Discovery | Retain the exact artifact reference. It may be resolved to copy a bounded candidate summary or validate that an approved candidate exists. | Defines the candidate instance; cannot approve it. |
| Candidate Context | Retain exact context/projection refs when already available and useful for audit. Do not require a new context artifact. | Explains what the reviewer saw; cannot approve or add eligibility. |
| Limited Dry Run and Evidence Capture | Retain exact upstream refs already reachable through Discovery. Do not reread evidence to infer eligibility. | Supplies provenance and future planning evidence; cannot authorize inclusion. |

Therefore the only authorizing input is the exact Review Package artifact.
Upstream lineage is optional as copied detail but its exact references are
preserved where the Review/Discovery chain already provides them. Resolving
the exact linked Discovery artifact is required only when a contract chooses
to materialize candidate summaries; failure to resolve it must fail closed,
not produce an inferred summary.

Explicitly forbidden input behavior:

- consuming a floating latest Candidate Discovery result;
- recomputing candidates from Context or Evidence;
- treating confidence, evidence quality, readiness, or limitations as approval;
- merging decisions from multiple Review Package artifacts;
- accepting AI output, generated output, a Structure Plan, or publishing state
  as package input.

## Canonical Output

Phase 8E-1 should formalize a metadata-only `ReconstructionPackage` with these
conceptual contents:

| Area | Required contents |
| --- | --- |
| Package identity | `reconstructionPackageId`, contract version, deterministic derivation metadata, and creation timestamp. |
| Authorizing lineage | Exact source Review Package artifact ID and package ID; exact source-head identity; source site version and dry-run identity. |
| Approved candidate refs | Stable ordered entries containing exact Discovery artifact ID, candidate ID, and authorizing Review Event ID. |
| Candidate summaries | Bounded descriptive metadata copied from the exact linked candidate when resolved, such as candidate type, route scope, label/summary, confidence, evidence refs, and source limitations. Summaries are audit/planning context, not new authority. |
| Limitations | Preserved source limitations plus package-level limitations about incomplete or unavailable supporting context. Limitations do not silently remove an approved candidate or assign a reconstruction strategy. |
| Diagnostics | Deterministic validation, lineage, exclusion-count, and staleness diagnostics suitable for fail-closed inspection. |
| Intent metadata | A narrow declaration that included candidates are eligible for future Structure Planning, together with `intentKind = structure_planning_eligibility`. It contains no reconstruction method, target structure, generated output, or execution readiness. |

The package may also report non-authorizing counts for rejected, deferred, and
unreviewed candidates so an operator can understand the source snapshot.
Those candidates must not appear in the eligible candidate list and their full
records need not be copied.

Candidate ordering must be deterministic. Phase 8E-1 should use the canonical
order of approved latest decisions from the validated Review Package, with an
explicit stable identity tie-breaker if the contract cannot guarantee that
order. Caller insertion order must not change package identity or meaning.

### No Generated Outputs

`ReconstructionPackage` contains metadata and references only. It produces no:

- React or component source;
- GNR8 blocks or block instances;
- generated or rewritten content;
- routes, navigation composition, section ordering, or layout plans;
- editable content models, design tokens, styles, or assets;
- executable instructions, jobs, previews, builds, or publishing payloads.

## Eligibility Rules

Eligibility is derived only from the latest decision for each exact candidate
instance in the selected Review Package:

| Latest state | Reconstruction Package treatment |
| --- | --- |
| `approved` | Eligible. Include the exact candidate reference and authorizing Review Event lineage. |
| `rejected` | Not eligible. Exclude from eligible candidates. May contribute only to a non-authorizing count/diagnostic. |
| `deferred` | Not eligible. Exclude from eligible candidates. May contribute only to a non-authorizing count/diagnostic. |
| Unreviewed | Not eligible. Absence of a review event creates no authority. May contribute only to a non-authorizing count if the exact Discovery artifact is resolved. |

A prior approval that has been superseded by a later rejected or deferred
decision is not eligible. An approval from a different Review Package head,
Discovery artifact, candidate instance, site version, or dry run cannot be
substituted.

A valid Review Package with zero approved latest decisions deterministically
produces no operational Reconstruction Package. Phase 8E-1 should return an
explicit ineligible/empty validation result rather than create a package that
could be mistaken for an authorizing handoff.

## Identity Recommendation

Choose **A - package identity tied to the Review Package**.

One exact Review Package artifact has at most one canonical Reconstruction
Package meaning for a given Reconstruction Package contract version. The
future contract should derive `reconstructionPackageId` deterministically from:

- the exact source Candidate Review Package artifact ID; and
- the Reconstruction Package contract version.

The artifact ID, not only `reviewPackageId`, is required because Review Package
snapshots retain a stable logical package ID while their immutable artifact
heads advance. The contract version prevents a later semantic contract change
from silently reusing an older package identity.

An independent caller-assigned identity is rejected. It would allow duplicate
or divergent packages from the same approval snapshot and weaken deterministic
replay, deduplication, audit, and staleness checks.

## Immutability And Versioning

Every Reconstruction Package is immutable and append-only once materialized in
a future persistence phase. Phase 8E-0 creates no persistence.

Versioning expectations:

- the package records its contract version;
- semantic changes require a new contract version;
- the same exact Review artifact plus the same contract version must derive
  the same semantic package and identity;
- retrying the same derivation must not create a divergent package;
- a new Review Package artifact derives a new Reconstruction Package identity;
- an older Reconstruction Package remains loadable for audit and is never
  edited to match later review decisions;
- future persistence may maintain a latest pointer, but the pointer is a
  convenience and never changes an immutable package's meaning.

Review changes therefore supersede; they do not mutate. A later approved,
rejected, or deferred decision creates a new immutable Review Package head. A
fresh Reconstruction Package must be derived explicitly from that new head.

## Staleness Model

A Reconstruction Package is stale when its exact authorizing snapshot is no
longer the canonical latest Review Package artifact for its lineage.

Staleness occurs when:

- a new Candidate Review Package artifact advances the latest pointer;
- a later decision supersedes any approval represented in the package;
- a candidate's governing Discovery artifact or exact candidate instance is
  replaced by a newly reviewed lineage;
- the package's contract version is superseded for a consumer that requires the
  newer version;
- required exact lineage can no longer be resolved or fails validation.

Candidate source changes alone do not rewrite the package. They create a new
Discovery lineage that must be reviewed and packaged independently. Logical
similarity between old and new candidates does not transfer approval.

Stale means **not eligible for new Structure Planning or reconstruction work**.
It does not mean deleted or historically invalid. Existing packages remain
immutable audit records. Consumers must compare the package's exact source
Review artifact ID with the canonical latest Review head at use time and fail
closed on mismatch; they must never silently refresh or rebase it.

## Safety Boundary

The Reconstruction Package is an eligibility handoff, not an execution token.
This phase and the canonical package explicitly forbid:

- generated React;
- generated components or blocks;
- generated, extracted, rewritten, or synthetic content;
- AI prompts, responses, embeddings, classifications, or other AI outputs;
- publishing artifacts or CMS mutations;
- deployment artifacts, builds, releases, or hosting changes;
- execution artifacts, worker jobs, dry-run results, previews, or runtime state;
- Structure Plans, route hierarchy, navigation composition, section ordering,
  layout decisions, component selection, or reconstruction technique;
- automatic intent assignment from candidate type, confidence, or approval;
- any claim of dry-run, reconstruction, deployment, or publishing readiness.

Validation must reject forbidden fields recursively rather than ignore or
sanitize them. No package field may encode executable instructions under a
different label.

## Relationship To Future Structure Planning

The canonical sequence is:

```text
Candidate Review
  -> Reconstruction Package
  -> Structure Planning
  -> Future Reconstruction
```

Review decides which exact observed candidates are approved. The
Reconstruction Package freezes which approvals are eligible for planning.
Structure Planning will decide how those eligible candidates relate, compose,
order, map to target structure, and handle conflicts. Future Reconstruction
may consume an approved plan only through separately designed governance and
execution boundaries.

Structure Planning must consume the Reconstruction Package. It must not query
Review, Discovery, Context, or Evidence independently to add candidates or
recover excluded decisions.

## Provider And Industry Artifact Comparison

The boundary reuses principles, not provider-specific schemas or workflows:

| Comparable artifact | Principle worth reusing | Principle not imported |
| --- | --- | --- |
| Approval package | Freeze the exact approved scope, actor/event lineage, and source version; make later changes explicit. | Approval does not become a generic execution authorization or hide rejected/deferred scope. |
| Provider handoff | Use a self-describing manifest, stable references, versioned contract, declared limitations, and deterministic validation. | Do not embed provider commands, generated payloads, or mutable external latest references. |
| Migration job artifact | Preserve source identity, idempotency inputs, immutable history, and stale-input detection. | Do not include job state, retries, execution plans, generated results, deployment state, or rollback operations. |

The canonical GNR8 package remains provider-neutral. Future adapters may read
it, but no provider owns its identity, authority, or lifecycle.

## Reconciliation With Phase 7F Scaffolding

The Phase 7F `ReconstructionPackage` is conceptual scaffolding, not the
canonical 8E contract. Phase 8E-1 must reconcile or replace it rather than
create a parallel source of truth.

Reusable principles from 7F are metadata-only packaging, explicit lineage,
limitations, deterministic summaries, and a hard prohibition on generation.
The following 7F concepts are not canonical for 8E:

- `ReconstructionCandidateReviewPackage` as the source instead of the exact
  persisted 8D Candidate Review Package artifact;
- default reconstruction intents inferred from review metadata;
- deferred or unsupported candidate payload buckets inside the handoff;
- `ready_for_reconstruction`, `ready_for_dry_run`, or future-execution status;
- reconstruction instructions;
- planning-package lineage that predates canonical 8C/8D artifacts.

Those concepts either belong to later Structure Planning/execution gates or
must be removed. The 8E package states eligibility only.

## Phase 8E-1 Contract Closure

Phase 8E-1 creates
`apps/platform/gnr8/architecture/reconstruction-package-contract.ts` as the
canonical contract module. The contract version is `8E-1`.

The canonical package contains:

- deterministic package identity tied to the exact Candidate Review Package
  artifact and contract version;
- `planned`, `valid`, `invalid`, `blocked`, or `stale` status;
- exact Review Package, Candidate Discovery, site-version, and dry-run
  lineage;
- approved-only candidate refs with the authorizing Review Event ID and
  optional route, confidence, source-candidate, and evidence refs;
- approved, rejected, deferred, unreviewed, included, and excluded counts;
- metadata-only limitations and diagnostics.

`validateReconstructionPackage(...)` checks the allowed status, contract
version, timestamp, required and matching lineage, approved-only inclusion,
unique candidate identities, count arithmetic, and recursive forbidden fields.
A stale package may remain structurally valid for historical inspection, but
the validation result warns that it is not eligible for new work.

`createBlockedReconstructionPackage(...)` represents a valid metadata-only
blocked result when no approvals exist or invalid/stale input prevents an
authorizing handoff. It includes no approved candidate refs and no execution
meaning.

Validation recursively rejects `reactOutput`, `generatedOutputs`,
`generatedBlocks`, `generatedContent`, `designTokens`, `aiOutputs`,
`structurePlan`, `reconstructionPlan`, `publishingArtifacts`,
`deploymentArtifacts`, and `executionArtifacts` wherever they occur.

Phase 8E-1 adds no builder, persistence, Structure Plan, reconstruction,
generated React, generated blocks, generated content, AI output, execution,
publishing artifact, migration, schema change, worker, API, or UI behavior.

## Phase 8E-2 Builder Design Closure

Phase 8E-2 adds
`docs/architecture/RECONSTRUCTION_PACKAGE_BUILDER_DESIGN.md` as the canonical
design for the pure deterministic builder. The builder converts one exact
latest `CandidateReviewPackage` artifact plus its linked
`CandidateDiscoveryResult` into a metadata-only `ReconstructionPackage`.

The design keeps the Review Package as the only authorizing input. Only latest
approved decisions become `approvedCandidateRefs`; rejected, deferred,
unreviewed, superseded, stale, and missing-candidate decisions are excluded.
Candidate refs are constructed from exact candidate identity, type, route,
confidence, authorizing `reviewEventId`, source candidate refs, and evidence
refs copied from the linked Discovery artifact.

Package identity remains deterministic:

```text
reconstruction-package:<candidateReviewPackageArtifactId>:<contractVersion>
```

The first builder implementation should produce `valid`, `blocked`, `stale`,
or `invalid` terminal results, propagate existing limitations, add only
deterministic builder blockers, and emit diagnostics for counts, lineage,
staleness, missing candidates, supersession, and contract validation.

Phase 8E-2 remains documentation and architecture only. It adds no builder
implementation, persistence, API, UI, Structure Plan, reconstruction, AI,
generation, workers, deployment, publishing, schema, or behavior change.

## Phase 8E-3 Builder Implementation Closure

Phase 8E-3 creates
`apps/platform/gnr8/architecture/reconstruction-package-builder.ts` as the
canonical pure builder from one exact Candidate Review Package artifact plus
its linked Candidate Discovery Result into a metadata-only
`ReconstructionPackage`.

The implementation keeps the Review Package as the only authorizing input.
Only latest approved decisions that resolve to exact Discovery candidates are
included. Rejected, deferred, unreviewed, superseded, stale, and
missing-candidate decisions are excluded from `approvedCandidateRefs`.
Included candidate refs copy candidate ID, candidate type, route path,
confidence, authorizing Review Event ID, deterministic source candidate refs,
and stable evidence/dry-run refs.

The builder derives package identity as:

```text
reconstruction-package:<candidateReviewPackageArtifactId>:<contractVersion>
```

It records deterministic eligibility counts, source limitations, builder
blockers, and diagnostics for validation, latest-head comparison, lineage,
missing candidates, and Reconstruction Package contract validation. The
builder validates its output through `validateReconstructionPackage(...)`.

Focused tests in
`apps/platform/gnr8/architecture/reconstruction-package-builder.test.ts`
cover valid output, exclusion behavior, blocked no-approval output, stale
status, missing-candidate diagnostics, deterministic identity, count
validation, forbidden-field absence, and valid contract validation.

Phase 8E-3 adds no persistence, latest-pointer mutation, API, UI, Structure
Planning, reconstruction, AI, generated React, generated blocks, generated
content, execution, publishing, migration, schema, worker, or behavior change
outside the pure builder.

## Recommendation

Recommend exactly one next phase:

> **Phase 8E-4 - Reconstruction Package Real-Artifact Validation**

8E-4 should validate the pure builder against real Candidate Review and linked
Candidate Discovery artifacts without adding persistence, Structure Planning,
AI, generation, publishing, schema, workers, API, or UI behavior.

## 8E-0 Exit State

At the end of 8E-0, a Reconstruction Package is precisely defined as an
immutable, deterministic, metadata-only eligibility handoff derived from one
exact latest Candidate Review Package artifact. Only approved latest decisions
are eligible. Exact lineage, authorizing Review Events, limitations,
diagnostics, and planning-eligibility intent are retained without generating
or executing anything.

Phase 8E-0 changed documentation only. Phase 8E-1 adds only the canonical
contract, validation and blocked helpers, focused tests, and phase-state
documentation.
