# Reconstruction Package Persistence Boundary

## Phase And Scope

Phase 8E-5 defines how a valid `ReconstructionPackage` should be durably
stored and reloaded in a later implementation phase.

This phase is documentation and architecture only. It does not implement
persistence, add provenance fields, add or change a database table, modify the
Reconstruction Package contract or builder, create Structure Planning, call AI,
generate content, publish, dispatch workers, change schema, add APIs, or add UI.

The design answers one question:

> How should a valid Reconstruction Package be durably stored and reloaded?

## Persistence Purpose

Reconstruction Package persistence must preserve one deterministic,
metadata-only eligibility handoff derived from one exact Candidate Review
Package artifact and contract version.

Persistence must provide:

- an immutable artifact reference for a validated package;
- exact lineage back to the authorizing Candidate Review Package artifact;
- exact lineage back to the linked Candidate Discovery artifact, site version,
  and dry run;
- deterministic retry behavior;
- a latest pointer for the current valid package for a site-version lineage;
- read helpers for future Structure Planning without creating Structure
  Planning.

Persistence does not grant execution authority. A persisted package means only
that the approved candidates in that package are eligible for a later, separately
designed Structure Planning boundary.

## Storage Options

| Option | Shape | Benefits | Costs and risks | Decision |
| --- | --- | --- | --- | --- |
| A. Existing site-version provenance artifact boundary | Add Reconstruction Package artifact history and a latest pointer inside the existing site-version `import_provenance_summary` container. | Reuses the proven Candidate Discovery, Candidate Review, and First Limited Dry Run provenance pattern; keeps lineage local to `siteVersionId`; avoids schema work; supports append-only snapshots and latest selection. | Provenance payload grows with changed packages; concurrent writes must protect append and pointer integrity. | **Recommended.** |
| B. New DB table | Add a normalized persistence table for Reconstruction Package records and latest lookup. | Stronger indexing, table constraints, and future cross-site query ergonomics. | Adds schema and migration work before volume or query needs justify a separate operational boundary; risks diverging from the existing artifact lineage pattern. | Defer. |
| C. Hybrid | Persist authoritative artifacts in provenance and duplicate selected metadata in a table. | Could later support analytics or queue-oriented Structure Planning lookup. | Creates dual-write consistency risk and source-of-truth ambiguity before there is a demonstrated query requirement. | Defer. |

### Recommendation

Use **Option A: the existing site-version provenance artifact boundary**.

The next implementation should add Reconstruction Package-owned sibling fields
to the existing site-version provenance summary:

```ts
{
  reconstructionPackageArtifacts?: ReconstructionPackageArtifactRecord[];
  latestReconstructionPackageArtifact?: ReconstructionPackageArtifactReference | null;
}
```

`reconstructionPackageArtifacts` is append-only artifact history.
`latestReconstructionPackageArtifact` points at the latest successfully
persisted valid or blocked Reconstruction Package for that site-version lineage.

The provenance container is only the storage mechanism and site-version scope.
Reconstruction Package owns its artifact kind, validation, idempotency,
staleness policy, read helpers, write helper, and latest-selection semantics.

A future table migration may replace the physical container, but it must retain
artifact IDs, package IDs, immutable package payloads, exact lineage,
timestamps, validation records, status, and latest-pointer semantics. During any
migration, there must be one authoritative write boundary.

## Artifact Kind

The canonical artifact kind is:

```text
reconstruction_package
```

This kind is distinct from `candidate_review_package`,
`candidate_discovery_result`, `first_limited_dry_run_output`, Structure Planning
packages, generated artifacts, publishing artifacts, and execution artifacts.

## Storage Shape

The persisted envelope should separate persistence identity from the immutable
contract package:

```ts
type ReconstructionPackageArtifactRecord = {
  kind: "reconstruction_package";
  artifactVersion: 1;
  artifactId: string;
  reconstructionPackageId: string;
  candidateReviewPackageArtifactId: string;
  candidateDiscoveryArtifactId: string;
  siteVersionId: string;
  dryRunId: string;
  status: "valid" | "blocked";
  includedCount: number;
  excludedCount: number;
  approvedCount: number;
  createdAt: string;
  persistedAt: string;
  contractVersion: string;
  package: ReconstructionPackage;
  validation: ReconstructionPackageValidationResult;
  diagnostics: string[];
};

type ReconstructionPackageArtifactReference = Omit<
  ReconstructionPackageArtifactRecord,
  "package" | "validation"
>;
```

`artifactVersion` versions the persistence envelope. `contractVersion` versions
the Reconstruction Package contract. They are independent.

The latest pointer should carry a `ReconstructionPackageArtifactReference` or an
equivalent existing provenance reference shape that includes enough metadata to
verify lineage before resolving the full package record.

## Metadata Design

| Metadata | Source and rule |
| --- | --- |
| `artifactId` / ref | Durable identity for one immutable persisted Reconstruction Package artifact. It is not the logical package ID, Review artifact ID, Discovery artifact ID, Structure Planning ID, or runtime artifact ID. |
| `artifactKind` / `kind` | Always `reconstruction_package`. |
| `reconstructionPackageId` | Must match `package.reconstructionPackageId`; derived from `candidateReviewPackageArtifactId` and `contractVersion`. |
| `candidateReviewPackageArtifactId` | Exact authorizing Candidate Review Package artifact used by the builder. It must match package lineage and the latest Review Package pointer when latest-only enforcement is enabled. |
| `candidateDiscoveryArtifactId` | Exact linked Discovery artifact from Review/Discovery lineage. |
| `siteVersionId` | Required write scope and exact lineage match for the package, Review artifact, Discovery artifact, and provenance container. |
| `dryRunId` | Exact Limited Dry Run lineage copied from the package lineage. |
| `status` | Persist only `valid` or `blocked`. `stale` and `invalid` builder outputs are rejected by this boundary. |
| `includedCount` | Copied from the validated package eligibility summary; must equal included approved candidate refs. |
| `excludedCount` | Copied from the validated package eligibility summary; rejected, deferred, unreviewed, stale, and invalid candidates remain excluded. |
| `approvedCount` | Copied from validated eligibility summary and source Review decisions. It is not independent authority. |
| `createdAt` | Original package creation time. It is retained unchanged on readback. |
| `persistedAt` | Server-trusted persistence time assigned at the write boundary. It is excluded from semantic equivalence. |
| `contractVersion` | Explicit Reconstruction Package contract version used for validation. |

Counts are summaries. The persisted `package`, exact lineage, and validation
result remain authoritative.

## Idempotency And Append Rules

Idempotency is scoped to:

```text
siteVersionId
+ candidateReviewPackageArtifactId
+ reconstructionPackageId
+ contractVersion
```

The required behavior is:

| Input relationship to persisted history | Required behavior |
| --- | --- |
| Equivalent package for the same Review artifact and contract version | Reuse and return the existing latest artifact reference. Do not append and do not move the pointer. |
| Retry differs only by retry-time package `createdAt` or persistence-only diagnostics | Reuse the existing artifact; the original package and artifact metadata remain authoritative. |
| Same Review artifact but changed semantic package content | Reject unless the contract version changed and the new package validates under that contract. One Review artifact must not produce divergent packages for the same contract. |
| New latest Review artifact produces a valid or blocked package | Append one immutable artifact and advance `latestReconstructionPackageArtifact`. |
| Changed `contractVersion` for the same Review artifact | Append a new validated artifact and make it latest only if it passes latest Review Package checks and status policy. |
| Supplied package is already stale relative to the latest Review Package pointer | Reject. Do not append and do not advance latest. |
| Invalid package or failed lineage validation | Reject. Do not append and do not advance latest. |

Canonical semantic equivalence includes the logical package, exact lineage,
approved candidate refs, eligibility counts, limitations, diagnostics relevant
to package semantics, `status`, and `contractVersion`. It excludes `artifactId`,
`persistedAt`, persistence diagnostics, and retry-only `createdAt` differences.

Equivalent detection must happen before assigning a new artifact ID or
`persistedAt`. Appending the artifact and advancing the latest pointer is one
logical commit. Concurrent implementations must use the strongest available
compare-and-set behavior at the provenance boundary or fail explicitly on
conflict; silent last-writer-wins behavior is forbidden.

## Staleness Policy

The persistence boundary considers three options:

| Option | Behavior | Decision |
| --- | --- | --- |
| A. Persist stale packages for diagnostics | Store `stale` outputs so historical mismatches can be inspected. | Reject for first boundary; it could make historical packages look newly authoritative. |
| B. Reject stale packages | Persist only packages that are latest at write time. | Too narrow because blocked packages are useful durable audit outputs when there are no approved candidates. |
| C. Persist only valid or blocked, reject stale or invalid | Store package outputs that are current and contract-valid, including blocked no-approval packages, while rejecting non-latest and invalid outputs. | **Recommended.** |

Use **Option C**.

`stale` outputs from the builder remain useful in memory and in validation
reports, but they should not become persisted artifacts in the first persistence
boundary. If a package was `valid` or `blocked` when persisted and later becomes
stale because a newer Review Package artifact advances, the old artifact remains
loadable as historical audit data. It simply must not be selected as latest for
new Structure Planning.

Any future explicit diagnostic mode that stores stale packages must use a
separate non-latest diagnostic collection or a clearly non-authorizing flag. It
must never advance `latestReconstructionPackageArtifact`.

## Validation Before Persist

The write boundary must validate before constructing a persistence artifact or
assigning an artifact ID.

Required gates:

1. Run `validateReconstructionPackage(...)`.
2. Reject any validation error.
3. Run the recursive forbidden-field guard and reject packages containing
   structure plans, AI outputs, generated content, publishing artifacts,
   execution artifacts, or equivalent fields under another label.
4. Check package lineage against the helper inputs: `siteVersionId`,
   `dryRunId`, `candidateReviewPackageArtifactId`,
   `candidateDiscoveryArtifactId`, and `reconstructionPackageId`.
5. Resolve or verify the referenced Candidate Review Package artifact enough to
   confirm it belongs to the same site version, dry run, and Discovery artifact.
6. Resolve or verify the linked Candidate Discovery artifact enough to confirm
   the package lineage matches the reviewed candidate source.
7. If latest-only enforcement is enabled, compare
   `candidateReviewPackageArtifactId` with the canonical
   `latestCandidateReviewPackageArtifact` for that lineage.
8. Reject `status = "stale"` and `status = "invalid"` before write.

The boundary must not sanitize, strip, rebase, rebuild, or silently refresh a
package and then continue. Any mismatch fails closed.

## Read And Write Helpers

Phase 8E-6 should design and implement only these persistence helpers:

```ts
persistReconstructionPackage({
  siteVersionId,
  dryRunId,
  candidateReviewPackageArtifactId,
  candidateDiscoveryArtifactId,
  package,
  contractVersion,
  options?,
}): Promise<ReconstructionPackageArtifactReference>

loadLatestReconstructionPackage({
  siteVersionId,
  dryRunId?,
  options?,
}): Promise<ReconstructionPackageArtifactRecord | null>

loadReconstructionPackageById({
  siteVersionId,
  artifactId,
  options?,
}): Promise<ReconstructionPackageArtifactRecord | null>
```

`persistReconstructionPackage(...)` validates and performs one logical append
plus latest-pointer update for `valid` or `blocked` packages only.

`loadLatestReconstructionPackage(...)` is read-only. It selects the latest valid
or blocked Reconstruction Package artifact for the site version, optionally
narrowed by `dryRunId`, and must ignore malformed or invalid records as latest
candidates while surfacing diagnostics through the caller-visible result or
error path.

`loadReconstructionPackageById(...)` requires `siteVersionId` as a scope guard.
An artifact ID alone must not bypass lineage scoping.

All reads return cloned or immutable data. Reads never repair history, rerun the
builder, revalidate into a replacement artifact, resolve a newer Review package,
advance latest pointers, create Structure Plans, or mutate provenance.

## Safety Boundary

Persistence must not create or mutate:

- Structure Planning packages or plans;
- route hierarchy, navigation composition, section ordering, layout decisions,
  component selections, or reconstruction techniques;
- AI prompts, AI responses, embeddings, classifications, or other AI outputs;
- generated React, generated blocks, generated content, rewritten content, CMS
  bindings, design tokens, styles, or assets;
- publishing artifacts, deployment artifacts, build artifacts, hosting changes,
  domain or DNS changes, or CMS mutations;
- execution artifacts, worker jobs, preview jobs, dry-run execution state, or
  reconstruction execution state;
- Candidate Discovery, Candidate Context, Candidate Review, Review Actions,
  Evidence Capture, Review API, or Review UI state.

The persisted Reconstruction Package remains metadata-only eligibility evidence.
It is not a Structure Plan, execution token, dry-run approval, generated output,
publishing approval, or runtime artifact.

## Relationship To Future Structure Planning

The intended future sequence is:

```text
ReconstructionPackage
  -> StructurePlanningPackage
```

A future Structure Planning boundary may load the latest valid
`reconstruction_package` artifact as input. It must treat that artifact as an
immutable list of approved candidate refs and lineage, not as instructions for
how to build the target site.

Structure Planning must be separately designed before any plan shape, planning
status, generated output, execution, dry run, worker behavior, publishing, API,
or UI is introduced.

## Phase 8E-5 Completion Boundary

At the end of Phase 8E-5, the persistence purpose, storage decision, artifact
kind, storage shape, metadata, idempotency model, staleness policy,
validation-before-persist rules, helper boundaries, safety rules, and future
Structure Planning relationship are defined.

No persistence helper, provenance field, artifact record implementation, latest
pointer mutation, database table, schema migration, API, UI, worker, Structure
Planning package, AI output, generated content, execution artifact, publishing
artifact, or behavior change has been implemented.

The recommended next phase is **Phase 8E-6 - Reconstruction Package Persistence
Implementation**, limited to the existing site-version provenance artifact
boundary, focused persistence tests, and no Structure Planning, AI, generation,
publishing, Review API, Review UI, schema, or worker changes.

## Phase 8E-6 Implementation Closure

Phase 8E-6 implements the designed Reconstruction Package persistence boundary
in `apps/platform/gnr8/architecture/reconstruction-package-persistence.ts`.

The implementation persists metadata-only `reconstruction_package` artifacts in
the existing site-version `import_provenance_summary` container, using
append-only `reconstructionPackageArtifacts` and
`latestReconstructionPackageArtifact` as the latest pointer. It adds no schema,
table, migration, API, UI, worker, Structure Planning, AI, generation,
execution, or publishing behavior.

The persistence helpers are:

```ts
persistReconstructionPackage(...)
loadLatestReconstructionPackage(...)
loadReconstructionPackageById(...)
```

Persisted artifact metadata includes `reconstructionPackageId`,
`candidateReviewPackageArtifactId`, `candidateDiscoveryArtifactId`,
`siteVersionId`, `dryRunId`, `status`, `includedCount`, `excludedCount`,
`approvedCount`, `contractVersion`, `createdAt`, and `persistedAt`.

`persistReconstructionPackage(...)` runs `validateReconstructionPackage(...)`
before write, verifies exact package/input lineage, verifies the referenced
Candidate Review artifact and linked Candidate Discovery artifact from the same
site-version provenance summary, rejects packages whose Review artifact is not
the current latest head, and persists only `valid` or `blocked` packages.
`stale`, `invalid`, forbidden-field, missing-artifact, and lineage-mismatch
packages fail closed before any provenance mutation.

Equivalent retries for the same Review artifact, package ID, and contract
version reuse the latest artifact and do not rewrite history. Changed current
packages append a new immutable artifact and advance
`latestReconstructionPackageArtifact`. Read helpers are read-only, scoped by
`siteVersionId`, return cloned records, and never repair, rebuild, plan,
generate, or mutate provenance.

Focused tests in
`apps/platform/gnr8/architecture/reconstruction-package-persistence.test.ts`
cover valid persistence, blocked persistence, latest and by-ID readback,
idempotent reuse, append-on-change, stale rejection, invalid rejection,
metadata preservation, lineage rejection, and forbidden-field rejection.

The recommended next phase is **Phase 8E-7 - Reconstruction Package Persistence
Real-Artifact Validation**, limited to exercising these helpers against real
valid/current and blocked Reconstruction Package inputs on existing persisted
Review/Discovery artifacts, with no Structure Planning, AI, generation,
publishing, schema, worker, Review API, or Review UI changes.

## Phase 8E-7 Real-Artifact Validation Closure

Phase 8E-7 validates the implemented persistence helpers against the real latest
approved ODV and ViroiDoc Candidate Review Package artifacts. The validation
loaded each latest Review Package, loaded its linked Candidate Discovery Result,
built a `ReconstructionPackage`, persisted it with
`persistReconstructionPackage(...)`, reloaded it with
`loadLatestReconstructionPackage(...)`, reloaded it by exact artifact ID with
`loadReconstructionPackageById(...)`, and retried persistence to verify
idempotent reuse.

Real persisted artifacts:

| Target | Review artifact | Reconstruction artifact | Status | Included | Excluded | Approved |
| --- | --- | --- | --- | --- | --- | --- |
| ODV | `candidate_review_package_9c9d65c293abf149d20c2301fd4e6b5b` | `reconstruction_package_d91aa763f2285cd7ccf075e82dcd3296` | `valid` | `3` | `1` | `3` |
| ViroiDoc | `candidate_review_package_ecb5f777160a45e15b958948348bca08` | `reconstruction_package_0e143f5fc174668e2225f73ebe464ffb` | `valid` | `1` | `4` | `1` |

Both latest reload and exact by-ID reload returned the persisted artifact and
exact package payload. Both retries returned the same artifact ID and did not
append another artifact. Lineage and metadata checks passed for Review artifact,
Review package ID, Discovery artifact, site version, dry run, counts, contract
version, validation, and timestamps.

Recursive forbidden-field scans found no Structure Plan, AI output, generated
content, publishing artifact, deployment artifact, execution artifact,
`reactOutput`, `generatedOutputs`, `generatedBlocks`, `designTokens`, or
`reconstructionPlan`.

Canonical evidence:
`docs/architecture/RECONSTRUCTION_PACKAGE_PERSISTENCE_REAL_ARTIFACT_VALIDATION.md`.

No Structure Planning, AI, generated output, execution, publishing, schema,
worker, API, UI, Review API, Review UI, Candidate Discovery behavior, Candidate
Review behavior, or runtime behavior was changed in Phase 8E-7.

The recommended next phase is **Phase 8F-0 - Structure Planning Foundation
Design**, documentation and contract design only, with no AI, generation,
execution, publishing, worker, API, UI, or schema changes.
