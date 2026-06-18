# Candidate Discovery Persistence Boundary

## Phase And Scope

Phase 8C-6 defines how a validated `CandidateDiscoveryResult` should be
persisted in a later implementation phase. This phase is design and
documentation only.

It does not implement persistence, add or change a database table, modify the
runtime artifact store, execute Candidate Discovery, add Candidate Review, or
change importer, Evidence Capture, Limited Dry Run, reconstruction, AI,
publishing, worker, or runtime behavior.

## Persistence Purpose

A persisted Candidate Discovery result should be a durable, immutable,
read-only control-plane record. Its purposes are:

- provide stable review input after the in-memory builder invocation ends
- preserve an audit trail from the source site version and Limited Dry Run to
  the exact candidates, evidence refs, limitations, and validation result
- allow deterministic comparison of Candidate Discovery results across runs
- provide the future Candidate Review boundary with an explicit persisted input

Persistence does not approve a candidate or make it executable. It records what
the deterministic builder discovered at a particular contract and builder
version.

## Storage Strategy Assessment

| Option | Shape | Benefits | Costs and risks | Decision |
|---|---|---|---|---|
| A. Existing import provenance artifact boundary | Extend the existing `siteVersion` import-provenance summary with an immutable artifact list and latest pointer. | Reuses the proven First Limited Dry Run persistence shape, keeps lineage local to `siteVersionId`, requires no schema, and supports append-only audit history. | Provenance payload size grows with repeated changed results; concurrent writes must preserve append and pointer integrity. | **Recommended first boundary.** |
| B. New runtime artifact kind | Store Candidate Discovery beside deployable/serving runtime artifacts. | Gives artifacts a dedicated runtime-store identity. | Conflates read-only control-plane review input with serving artifacts and expands runtime behavior unnecessarily. | Do not use now. |
| C. New database table | Add normalized result, metadata, and lookup records. | Strong indexing, retention, and query options at larger scale. | Requires schema and migration work before access patterns or volume justify it. | Defer. |
| D. Hybrid | Write provenance first and duplicate/index selected metadata in a table or runtime artifact store. | Could support future cross-site analytics and retention. | Introduces dual-write consistency, two sources of truth, and premature operational complexity. | Defer; reassess only with measured provenance-size or query pressure. |

### Recommendation

Phase 8C-7 should use **Option A: the existing import provenance artifact
boundary first, with no new table**. The provenance summary should gain a
Candidate Discovery artifact collection and a latest pointer, analogous to the
existing First Limited Dry Run boundary:

```ts
{
  candidateDiscoveryResultArtifacts?: CandidateDiscoveryResultArtifactRecord[];
  latestCandidateDiscoveryResultArtifact?: CandidateDiscoveryResultArtifactRecord | null;
}
```

These names are design targets, not implemented fields. A later move to a table
must preserve artifact IDs, immutable payloads, lineage, ordering, and latest
selection semantics so the provenance history remains authoritative during any
migration.

## Artifact Kind And Envelope

The canonical artifact kind is:

```text
candidate_discovery_result
```

The future persisted envelope should separate the immutable full record from
the lightweight reference returned by write and read helpers.

```ts
type CandidateDiscoveryResultArtifactRecord = {
  kind: "candidate_discovery_result";
  artifactVersion: 1;
  artifactId: string;
  siteVersionId: string;
  dryRunId: string;
  discoveryId: string;
  candidateCount: number;
  candidateTypesPresent: CandidateType[];
  validationStatus: "valid";
  limitationCount: number;
  blockerCount: number;
  createdAt: string;
  persistedAt: string;
  builderVersion: string;
  contractVersion: string;
  result: CandidateDiscoveryResult;
  validation: CandidateDiscoveryValidationResult;
  diagnostics: string[];
};

type CandidateDiscoveryResultArtifactReference = Omit<
  CandidateDiscoveryResultArtifactRecord,
  "result"
>;
```

`artifactId` is the durable artifact reference. The reference shape may be
returned directly or embedded as a typed ref, but it must always retain
`kind`, `artifactId`, `siteVersionId`, `dryRunId`, and `discoveryId` so callers
cannot detach the artifact from its lineage.

## Metadata Design

| Metadata | Source and rule |
|---|---|
| `artifactId` / ref | Deterministic artifact identifier for one immutable persisted record. It must not be a Candidate Review or runtime-serving ID. |
| `siteVersionId` | Required write input and exact match for `result.siteVersionId`. |
| `dryRunId` | Required write input and exact match for `result.dryRunId`. |
| `discoveryId` | Copied from `result.discoveryId`. |
| `candidateCount` | Copied from the already validated result; must equal `result.candidates.length`. |
| `candidateTypesPresent` | Copied in canonical `route`, `navigation`, `section` order from the validated result. |
| `validationStatus` | `valid` only. Invalid results are never artifacts. The full validation object remains attached for audit. |
| `limitationCount` | `result.limitations.length`; the result-level lossless master ledger is authoritative and candidate-attached subsets are not double-counted. |
| `blockerCount` | Count of result-level limitations whose severity is `blocker`. |
| `createdAt` | Original `result.createdAt`; it records result assembly audit time. |
| `persistedAt` | Persistence boundary time; it is not part of semantic result equivalence. |
| `builderVersion` | Explicit version of the deterministic mapping that produced the result. Required; never inferred from wall-clock time. |
| `contractVersion` | Explicit version of the `CandidateDiscoveryResult` contract used for validation. Required independently of `artifactVersion`. |

`artifactVersion` versions the persistence envelope. `contractVersion` versions
the result shape and invariants. `builderVersion` versions result-producing
semantics. These three concerns must remain separate.

## Future Write And Read Helpers

Phase 8C-7 should design and implement only these persistence helpers:

```ts
persistCandidateDiscoveryResult({
  siteVersionId,
  dryRunId,
  result,
  builderVersion,
  contractVersion,
  options?,
}): Promise<CandidateDiscoveryResultArtifactReference>

loadLatestCandidateDiscoveryResult({
  siteVersionId,
  dryRunId?,
  options?,
}): Promise<CandidateDiscoveryResultArtifactRecord | null>

loadCandidateDiscoveryResultById({
  siteVersionId,
  artifactId,
  options?,
}): Promise<CandidateDiscoveryResultArtifactRecord | null>
```

The write helper validates the result and lineage before any write. The latest
helper selects deterministically by `persistedAt`, then `artifactId` as a tie
breaker, and may be narrowed to a `dryRunId`. The by-ID helper must also require
`siteVersionId`; an artifact ID alone must not bypass lineage scoping.

All reads are read-only. They return cloned/immutable data and never rebuild,
repair, revalidate into a replacement artifact, or advance a pointer.

## Idempotency And Version History

Idempotency is scoped to `siteVersionId + dryRunId`:

1. Validate the input result and exact lineage.
2. Load the latest valid artifact for the same `siteVersionId + dryRunId`.
3. Compare canonical semantic content.
4. If equivalent, reuse and return the latest artifact reference without a
   write and without changing the latest pointer.
5. If changed, append one new immutable artifact and update the latest pointer
   to that artifact.

Canonical semantic equivalence includes `discoveryId`, lineage, candidate count
and type summary, the ordered candidates, confidence, evidence and dry-run refs,
limitations, and diagnostics. It excludes `artifactId`, `persistedAt`, and
`result.createdAt`, so a retry with a new audit timestamp but identical
discovery semantics does not create a duplicate. `builderVersion` and
`contractVersion` are included: a version change appends a new artifact even
when the candidate payload is otherwise equal.

Artifact identity should be derived from stable canonical content plus lineage
and persistence identity in the same deterministic style as the existing
provenance boundary. Equivalent-result detection must happen before assigning a
new persistence timestamp or artifact ID.

Concurrent implementations must avoid lost append history and stale latest
pointers. Phase 8C-7 must use the strongest atomicity available at the existing
provenance update boundary or explicitly fail on a conflicting write; silent
last-writer-wins loss is not acceptable.

## Safety Boundaries

The persisted artifact is read-only review input. Persistence must not:

- call AI or add inferred/generated fields
- reconstruct routes, sections, content, or behavior
- create React, JSX, GNR8 blocks, CMS bindings, or design tokens
- approve, reject, rank, or otherwise review candidates
- create runtime-serving or publishing artifacts
- dispatch workers or trigger importer, Evidence Capture, or Limited Dry Run
- mutate the `CandidateDiscoveryResult` while storing or loading it

The existing recursive forbidden-field validation remains a mandatory pre-write
gate. Persistence cannot sanitize or strip forbidden content and then continue;
it must reject the entire write.

Future Candidate Review may load a valid artifact by ID or through the latest
read helper. It must treat the loaded result as immutable source evidence and
store its own decisions outside this artifact.

## Failure Cases

| Failure | Required behavior |
|---|---|
| Invalid result | Reject before write with the complete validation diagnostics; do not append or move the latest pointer. |
| Forbidden generated fields | Reject through recursive contract validation; do not strip, transform, or persist them. |
| Missing or mismatched `dryRunId` / `siteVersionId` | Reject before artifact construction, including mismatches between helper input and result lineage. |
| Builder validation failed | Do not persist. A blocked but contract-valid result may be persisted for audit; a result that fails `validateCandidateDiscoveryResult(...)` may not. |
| Persistence failure | Return/throw a persistence error, never report an artifact reference as successful, and leave the prior valid latest pointer authoritative. No partial artifact/pointer state is acceptable. |

Malformed or invalid records encountered during reads must be ignored as latest
candidates and surfaced through diagnostics or an explicit error path. A read
must never repair malformed provenance in place.

## Phase 8C-6 Completion Boundary

At the end of Phase 8C-6, the persistence purpose, storage decision, artifact
kind, metadata, helper boundaries, idempotency, safety rules, and failure
behavior are defined. No persistence helper, artifact record, provenance field,
database table, schema migration, trigger, API, surface, or runtime behavior has
been implemented.

The recommended next phase is **Phase 8C-7 - Candidate Discovery Persistence
Implementation**, limited to the provenance artifact boundary, focused tests,
and no Candidate Review, reconstruction, AI, generation, or publishing.

## Phase 8C-7 Completion Boundary

Phase 8C-7 implements the designed boundary in
`apps/platform/gnr8/architecture/candidate-discovery-persistence.ts`.
Validated results are stored as `candidate_discovery_result` records in
`candidateDiscoveryResultArtifacts`, with
`latestCandidateDiscoveryResultArtifact` pointing to the newest appended
record. No table or migration is added.

`persistCandidateDiscoveryResult(...)` validates the complete result, recursive
forbidden-field guard, exact site-version and dry-run lineage, and explicit
builder/contract versions before constructing an artifact. Persisted metadata
includes artifact identity and kind, lineage, discovery identity, candidate
counts and types, validation status and diagnostics, limitation/blocker counts,
versions, result creation time, and persistence time.

`loadLatestCandidateDiscoveryResult(...)` supports site-version reads with an
optional dry-run scope. `loadCandidateDiscoveryResultById(...)` requires both
site-version and artifact identity. Both return cloned full records and do not
repair, rebuild, mutate, or advance provenance.

Equivalent latest results for the same `siteVersionId + dryRunId`, builder
version, and contract version reuse the existing artifact without a write;
`result.createdAt` is excluded from semantic comparison. Changed results append
one immutable record and advance the latest pointer.

Focused contract, builder, and persistence tests pass `20 / 20`. Phase 8C-7
adds no Candidate Review, UI, reconstruction, AI, generated React/block output,
CMS binding, publishing artifact, database schema, migration, worker job, or
importer/Evidence Capture/preview/Limited Dry Run behavior change.

The recommended next phase is **Phase 8C-8 - Candidate Discovery Read-Only
Surface Design**.

## Phase 8C-8 Surface Boundary

Phase 8C-8 is defined in `CANDIDATE_DISCOVERY_SURFACE_DESIGN.md`. It recommends
a dedicated admin Candidate Discovery page that reads persisted
`candidate_discovery_result` artifacts only and projects artifact metadata,
validation, counts, confidence distribution, limitations, diagnostics, and
stable route/navigation/section candidate groups.

The designed surface is admin/superadmin-only and strictly read-only. It adds
no approval/rejection, Candidate Review, reconstruction, AI, edit, publish, or
trigger controls. Phase 8C-8 changes documentation only and does not alter the
persistence helpers or artifact format.

The recommended next phase is **Phase 8C-9 - Candidate Discovery Read-Only
Surface Implementation**.
