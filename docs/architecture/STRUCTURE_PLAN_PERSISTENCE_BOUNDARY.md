# Structure Plan Persistence Boundary

## Phase And Scope

Phase 8F-5 defines how a valid `StructurePlan` should be durably stored and
reloaded in a later implementation phase.

This phase is documentation and architecture only. It does not implement
persistence, add provenance fields, add or change a database table, modify the
StructurePlan contract or builder, modify Reconstruction Package behavior,
create AI output, generate content, publish, dispatch workers, change schema,
add APIs, or add UI.

The design answers one question:

> How should a valid StructurePlan be durably stored and reloaded?

## Persistence Purpose

Structure Plan persistence must preserve one deterministic, metadata-only
planning handoff derived from one exact latest `ReconstructionPackage` artifact
and Structure Plan contract version.

Persistence must provide:

- an immutable artifact reference for a validated Structure Plan;
- exact lineage back to the authorizing Reconstruction Package artifact;
- copied lineage back to the Candidate Review Package artifact, Candidate
  Discovery artifact, site version, and dry run carried by the package;
- deterministic retry behavior;
- a latest pointer for the current valid or blocked plan for a site-version
  lineage;
- read helpers for future Content Planning or future Layout/Block Planning
  without creating either phase.

Persistence does not grant generation authority. A persisted Structure Plan
means only that approved candidates from an exact Reconstruction Package have
been organized into route, navigation, section, and assignment metadata.

## Storage Options

| Option | Shape | Benefits | Costs and risks | Decision |
| --- | --- | --- | --- | --- |
| A. Existing site-version provenance artifact boundary | Add Structure Plan artifact history and a latest pointer inside the existing site-version `import_provenance_summary` container. | Reuses the proven First Limited Dry Run, Candidate Discovery, Candidate Review, and Reconstruction Package provenance pattern; keeps lineage local to `siteVersionId`; avoids schema work; supports append-only snapshots and latest selection. | Provenance payload grows with changed plans; concurrent writes must protect append and pointer integrity. | **Recommended.** |
| B. New DB table | Add a normalized persistence table for Structure Plan records and latest lookup. | Stronger indexing, table constraints, and future cross-site query ergonomics. | Adds schema and migration work before volume or query needs justify a separate operational boundary; risks diverging from the existing artifact lineage pattern. | Defer. |
| C. Hybrid | Persist authoritative artifacts in provenance and duplicate selected metadata in a table. | Could later support analytics, operator search, or queue-oriented lookup for downstream planning. | Creates dual-write consistency risk and source-of-truth ambiguity before there is a demonstrated query requirement. | Defer. |

### Recommendation

Use **Option A: the existing site-version provenance artifact boundary**.

The next implementation should add Structure Plan-owned sibling fields to the
existing site-version provenance summary:

```ts
{
  structurePlanArtifacts?: StructurePlanArtifactRecord[];
  latestStructurePlanArtifact?: StructurePlanArtifactReference | null;
}
```

`structurePlanArtifacts` is append-only artifact history.
`latestStructurePlanArtifact` points at the latest successfully persisted valid
or blocked Structure Plan for that site-version lineage.

The provenance container is only the storage mechanism and site-version scope.
Structure Planning owns its artifact kind, validation, idempotency, staleness
policy, read helpers, write helper, and latest-selection semantics.

A future table migration may replace the physical container, but it must retain
artifact IDs, Structure Plan IDs, immutable plan payloads, exact lineage,
timestamps, validation records, status, and latest-pointer semantics. During any
migration, there must be one authoritative write boundary.

## Artifact Kind

The canonical artifact kind is:

```text
structure_plan
```

This kind is distinct from `reconstruction_package`,
`candidate_review_package`, `candidate_discovery_result`,
`first_limited_dry_run_output`, generated artifacts, publishing artifacts, and
execution artifacts.

## Storage Shape

The persisted envelope should separate persistence identity from the immutable
contract plan:

```ts
type StructurePlanArtifactRecord = {
  kind: "structure_plan";
  artifactVersion: 1;
  artifactId: string;
  structurePlanId: string;
  reconstructionPackageArtifactId: string;
  candidateReviewPackageArtifactId: string;
  candidateDiscoveryArtifactId: string;
  siteVersionId: string;
  dryRunId: string;
  status: "valid" | "blocked";
  plannedRouteCount: number;
  plannedNavigationCount: number;
  plannedSectionCount: number;
  assignmentCount: number;
  blockedCandidateCount: number;
  createdAt: string;
  persistedAt: string;
  contractVersion: string;
  plan: StructurePlan;
  validation: StructurePlanValidationResult;
  diagnostics: string[];
};

type StructurePlanArtifactReference = Omit<
  StructurePlanArtifactRecord,
  "plan" | "validation"
>;
```

`artifactVersion` versions the persistence envelope. `contractVersion` versions
the Structure Plan contract. They are independent.

The latest pointer should carry a `StructurePlanArtifactReference` or an
equivalent existing provenance reference shape that includes enough metadata to
verify lineage before resolving the full plan record.

## Metadata Design

| Metadata | Source and rule |
| --- | --- |
| `artifactId` / ref | Durable identity for one immutable persisted Structure Plan artifact. It is not the logical plan ID, Reconstruction Package artifact ID, Review artifact ID, Discovery artifact ID, or runtime artifact ID. |
| `artifactKind` / `kind` | Always `structure_plan`. |
| `structurePlanId` | Must match `plan.structurePlanId`; derived from `reconstructionPackageArtifactId` and Structure Plan contract version. |
| `reconstructionPackageArtifactId` | Exact authorizing Reconstruction Package artifact used by the builder. It must match plan lineage and the latest Reconstruction Package pointer at persist time. |
| `candidateReviewPackageArtifactId` | Exact Candidate Review Package artifact copied from the plan/package lineage. It explains approval source only; it does not independently authorize new candidates. |
| `candidateDiscoveryArtifactId` | Exact Candidate Discovery artifact copied from the plan/package lineage. It explains source candidate identity only; it does not independently authorize new candidates. |
| `siteVersionId` | Required write scope and exact lineage match for the plan, Reconstruction Package artifact, and provenance container. |
| `dryRunId` | Exact Limited Dry Run lineage copied from the plan/package lineage. |
| `status` | Persist only `valid` or `blocked`. `stale` and `invalid` builder outputs are rejected by this boundary. |
| `plannedRouteCount` | Count of `plan.plannedRoutes`; must match validated plan diagnostics and summary. |
| `plannedNavigationCount` | Count of `plan.plannedNavigation`; must match validated plan diagnostics and summary. |
| `plannedSectionCount` | Count of `plan.plannedSections`; must match validated plan diagnostics and summary. |
| `assignmentCount` | Count of `plan.assignments`; valid plans must reconcile assignments to included approved candidate refs. |
| `blockedCandidateCount` | Count of candidates blocked by deterministic planning rules and recorded in limitations/diagnostics. |
| `createdAt` | Original plan creation time from the builder output. It is retained unchanged on readback. |
| `persistedAt` | Server-trusted persistence time assigned at the write boundary. It is excluded from semantic equivalence. |
| `contractVersion` | Explicit Structure Plan contract version used for validation. |

Counts are summaries. The persisted `plan`, exact lineage, and validation
result remain authoritative.

## Idempotency And Append Rules

Idempotency is scoped to:

```text
siteVersionId
+ reconstructionPackageArtifactId
+ structurePlanId
+ contractVersion
```

The required behavior is:

| Input relationship to persisted history | Required behavior |
| --- | --- |
| Equivalent plan for the same Reconstruction Package artifact and contract version | Reuse and return the existing latest artifact reference. Do not append and do not move the pointer. |
| Retry differs only by retry-time plan `createdAt` or persistence-only diagnostics | Reuse the existing artifact; the original plan and artifact metadata remain authoritative. |
| Same Reconstruction Package artifact but changed semantic plan content | Reject unless the Structure Plan contract version changed and the new plan validates under that contract. One Reconstruction Package artifact must not produce divergent plans for the same contract. |
| New latest Reconstruction Package artifact produces a valid or blocked plan | Append one immutable artifact and advance `latestStructurePlanArtifact`. |
| Changed `contractVersion` for the same Reconstruction Package artifact | Append a new validated artifact and make it latest only if it passes latest Reconstruction Package checks and status policy. |
| Supplied plan is already stale relative to the latest Reconstruction Package pointer | Reject. Do not append and do not advance latest. |
| Invalid plan or failed lineage validation | Reject. Do not append and do not advance latest. |

Canonical semantic equivalence includes the logical plan, exact lineage,
planned routes, planned navigation, planned sections, assignments, counts,
limitations, diagnostics relevant to planning semantics, `status`, and
`contractVersion`. It excludes `artifactId`, `persistedAt`, persistence
diagnostics, and retry-only `createdAt` differences.

Equivalent detection must happen before assigning a new artifact ID or
`persistedAt`. Appending the artifact and advancing the latest pointer is one
logical commit. Concurrent implementations must use the strongest available
compare-and-set behavior at the provenance boundary or fail explicitly on
conflict; silent last-writer-wins behavior is forbidden.

## Staleness Policy

The persistence boundary considers three options:

| Option | Behavior | Decision |
| --- | --- | --- |
| A. Persist stale Structure Plans for diagnostics | Store `stale` outputs so historical mismatches can be inspected. | Reject for first boundary; it could make historical plans look newly authoritative. |
| B. Reject stale Structure Plans | Persist only plans that are latest at write time. | Too narrow because blocked plans are useful durable audit outputs when the latest Reconstruction Package has eligible candidates that cannot be organized safely. |
| C. Persist only valid or blocked, reject stale or invalid | Store plan outputs that are current and contract-valid, including blocked planning outputs, while rejecting non-latest and invalid outputs. | **Recommended.** |

Use **Option C**.

`stale` outputs from the builder remain useful in memory and in validation
reports, but they should not become persisted artifacts in the first persistence
boundary. If a plan was `valid` or `blocked` when persisted and later becomes
stale because a newer Reconstruction Package artifact advances, the old artifact
remains loadable as historical audit data. It simply must not be selected as
latest for future Content Planning or Layout/Block Planning.

Any future explicit diagnostic mode that stores stale plans must use a separate
non-latest diagnostic collection or a clearly non-authorizing flag. It must
never advance `latestStructurePlanArtifact`.

## Validation Before Persist

The write boundary must validate before constructing a persistence artifact or
assigning an artifact ID.

Required gates:

1. Run `validateStructurePlan(...)`.
2. Reject any validation error.
3. Run the recursive forbidden-field guard and reject plans containing AI
   outputs, generated content, generated components, generated blocks,
   publishing artifacts, deployment artifacts, execution artifacts, worker jobs,
   or equivalent fields under another label.
4. Check plan lineage against the helper inputs: `siteVersionId`, `dryRunId`,
   `reconstructionPackageArtifactId`, `candidateReviewPackageArtifactId`,
   `candidateDiscoveryArtifactId`, and `structurePlanId`.
5. Resolve or verify the referenced Reconstruction Package artifact enough to
   confirm it belongs to the same site version, dry run, Candidate Review
   artifact, and Candidate Discovery artifact.
6. Compare `reconstructionPackageArtifactId` with the canonical
   `latestReconstructionPackageArtifact` for the site-version lineage.
7. Confirm the plan's copied included approved candidate refs and counts match
   the resolved Reconstruction Package payload.
8. Reject `status = "stale"` and `status = "invalid"` before write.

The boundary must not sanitize, strip, rebase, rebuild, or silently refresh a
plan and then continue. Any mismatch fails closed.

## Read And Write Helpers

Phase 8F-6 should design and implement only these persistence helpers:

```ts
persistStructurePlan({
  siteVersionId,
  dryRunId,
  reconstructionPackageArtifactId,
  candidateReviewPackageArtifactId,
  candidateDiscoveryArtifactId,
  plan,
  contractVersion,
  options?,
}): Promise<StructurePlanArtifactReference>

loadLatestStructurePlan({
  siteVersionId,
  dryRunId?,
  options?,
}): Promise<StructurePlanArtifactRecord | null>

loadStructurePlanById({
  siteVersionId,
  artifactId,
  options?,
}): Promise<StructurePlanArtifactRecord | null>
```

`persistStructurePlan(...)` validates and performs one logical append plus
latest-pointer update for `valid` or `blocked` plans only.

`loadLatestStructurePlan(...)` is read-only. It selects the latest valid or
blocked Structure Plan artifact for the site version, optionally narrowed by
`dryRunId`, and must ignore malformed or invalid records as latest candidates
while surfacing diagnostics through the caller-visible result or error path.

`loadStructurePlanById(...)` requires `siteVersionId` as a scope guard. An
artifact ID alone must not bypass lineage scoping.

All reads return cloned or immutable data. Reads never repair history, rerun the
builder, revalidate into a replacement artifact, resolve a newer Reconstruction
Package artifact, advance latest pointers, create Content Planning artifacts,
create Layout/Block Planning artifacts, generate content, or mutate provenance.

## Safety Boundary

Persistence must not create or mutate:

- AI prompts, AI responses, embeddings, classifications, summaries, or other AI
  outputs;
- generated React, generated components, generated blocks, generated content,
  rewritten content, CMS bindings, design tokens, styles, images, media, or
  assets;
- publishing artifacts, deployment artifacts, build artifacts, hosting changes,
  domain or DNS changes, CMS mutations, or release state;
- execution artifacts, worker jobs, preview jobs, dry-run execution state,
  reconstruction execution state, or runtime state;
- Evidence Capture, Candidate Discovery, Candidate Context, Candidate Review,
  Review Actions, Reconstruction Package, Review API, Review UI, schema,
  importer, capture, worker, generation, or publishing behavior.

The persisted Structure Plan remains metadata-only organization evidence. It is
not generated output, execution authority, publishing approval, deployment
approval, worker input, or runtime artifact.

## Relationship To Future Phases

The intended future sequence is one of these separately authorized branches:

```text
StructurePlan
  -> Future Content Planning
```

or:

```text
StructurePlan
  -> Future Layout/Block Planning
```

Neither branch exists in Phase 8F-5. A future phase may load the latest valid or
blocked `structure_plan` artifact as input, but it must treat that artifact as
immutable planning metadata, not instructions to generate content, blocks,
components, layouts, React, CMS bindings, deployments, or publishing artifacts.

Future Content Planning and future Layout/Block Planning must each be separately
designed before any generated output, execution, dry run, worker behavior,
publishing, API, UI, or schema work is introduced.

## Phase 8F-5 Completion Boundary

At the end of Phase 8F-5, the persistence purpose, storage decision, artifact
kind, storage shape, metadata, idempotency model, staleness policy,
validation-before-persist rules, helper boundaries, safety rules, and future
planning relationship are defined.

No persistence helper, provenance field, artifact record implementation, latest
pointer mutation, database table, schema migration, API, UI, worker, Content
Planning artifact, Layout/Block Planning artifact, AI output, generated content,
execution artifact, publishing artifact, or behavior change has been
implemented.

The recommended next phase is **Phase 8F-6 - Structure Plan Persistence
Implementation**, limited to the existing site-version provenance artifact
boundary, focused persistence tests, and no AI, generation, publishing, schema,
worker, Evidence Capture, Candidate Discovery, Candidate Context, Candidate
Review, Review Actions, Reconstruction Package, StructurePlan contract,
StructurePlan builder, API, UI, or runtime behavior changes.
