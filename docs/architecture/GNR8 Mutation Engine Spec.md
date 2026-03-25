# GNR8 Mutation Engine Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Optimization Engine + Controlled Generator
Depends On:
- GNR8 Canonical Layout Model Spec
- GNR8 Proposal Artifact Spec
- GNR8 Optimization Engine Architecture Blueprint

---

## 1. Purpose

This document defines the Mutation Engine in GNR8.

The Mutation Engine is responsible for transforming an approved Proposal Artifact into:

- canonical graph mutations
- new page/site versions
- diffable state transitions
- artifact rebuild candidates

The Mutation Engine exists to ensure that:

- AI proposals never mutate live state directly
- all approved changes are deterministic
- all mutations are auditable
- all mutations are reversible
- all runtime output continues to flow from canonical state only

---

## 2. Core Principle

The Mutation Engine does not generate ideas.

The Mutation Engine executes approved intent.

It sits between:

- Proposal Artifacts
and
- Canonical Site/Page Versions

Its role is:

> apply approved, deterministic canonical mutations safely

Never:

- mutate HTML directly
- mutate runtime artifacts directly
- mutate builder state
- mutate live production state in-place

---

## 3. Position in the System

System flow:

1. Migration Engine creates trusted baseline
2. Optimization Engine produces Proposal Artifact
3. Human approves Proposal Artifact
4. Mutation Engine applies canonical mutations
5. New PageVersion / SiteVersion is created
6. Diff Engine compares before/after
7. Artifact Build Layer rebuilds publishable output
8. Rollout Governance evaluates rollout stage

The Mutation Engine is the bridge between:
- proposal
- execution

---

## 4. Mutation Engine Responsibilities

The Mutation Engine must:

1. validate proposal executability
2. validate target canonical references
3. apply graph-safe mutations
4. preserve canonical invariants
5. create new immutable versions
6. record mutation audit trail
7. emit execution result for artifact rebuild

The Mutation Engine must NOT:

- interpret vague intent at execution time
- invent missing proposal details
- bypass governance
- modify live artifact state directly
- write raw HTML into canonical graph state

---

## 5. Mutation Engine Inputs

The Mutation Engine requires:

- approved Proposal Artifact
- target SiteVersion / PageVersion
- canonical graph payload
- governance status
- execution context metadata

### 5.1 Required Input Object

```md
MutationExecutionInput:
  proposalId
  proposalArtifact
  targetSiteId
  targetSiteVersionId
  targetPageIds[]
  canonicalGraphSet
  executionActor
  executionTimestamp
  governanceContext

5.2 governanceContext

governanceContext:
  proposalApproved: boolean
  approvalActorIds[]
  rolloutStage
  baselineTrusted: boolean
  brandConstraintsSatisfied: boolean


⸻

6. Mutation Engine Outputs

The Mutation Engine produces:
	•	mutation execution result
	•	new immutable page/site versions
	•	audit metadata
	•	rebuild candidate reference

6.1 Required Output Object

MutationExecutionResult:
  executionId
  proposalId
  status
  createdPageVersionIds[]
  createdSiteVersionId
  mutationAuditRecordIds[]
  beforeAfterDiffRef
  artifactRebuildRequired
  warnings[]
  errors[]

6.2 status enum

PENDING
VALIDATED
EXECUTED
FAILED
ROLLED_BACK


⸻

7. Canonical Mutation Rule

All mutations must operate on canonical graph state only.

Allowed mutation targets:
	•	Layout Graph
	•	Semantic Graph
	•	Content Graph
	•	Asset Graph
	•	Navigation Graph
	•	Style Token Graph
	•	Interaction Graph

Not allowed mutation targets:
	•	raw HTML blobs
	•	runtime HTML
	•	source snapshot HTML
	•	builder schema
	•	direct live artifact data

This is non-negotiable.

⸻

8. Mutation Types

The Mutation Engine must support the following mutation families.

8.1 Content Mutations
	•	update text node
	•	replace heading
	•	rewrite paragraph
	•	insert CTA text
	•	remove duplicate content
	•	add new content block

8.2 Structural Mutations
	•	reorder section
	•	insert section
	•	remove section
	•	split section
	•	merge sections
	•	wrap nodes into container
	•	unwrap container

8.3 Layout Mutations
	•	change block grouping
	•	change section composition
	•	change hero composition
	•	change gallery composition
	•	move contact block
	•	move CTA block

8.4 Navigation Mutations
	•	add nav item
	•	remove nav item
	•	reorder nav items
	•	update anchor target
	•	promote footer link to primary nav

8.5 Style Token Mutations
	•	update color token
	•	update typography token
	•	update spacing rhythm
	•	update card radius/shadow
	•	update image presentation token

8.6 Asset Mutations
	•	swap preferred asset variant
	•	replace image
	•	remove duplicate asset usage
	•	change hero image selection
	•	update logo usage

8.7 Generation Mutations
	•	create new page from canonical content sources
	•	generate new section graph
	•	generate alternate layout branch within constraints

⸻

9. Mutation Operations

Each mutation must be represented as an explicit operation.

9.1 Canonical Mutation Operation Shape

CanonicalMutationOperation:
  mutationId
  mutationType
  targetGraph
  targetNodeId
  operation
  payload
  orderingContext
  constraints
  safetyChecks

9.2 operation enum examples

INSERT_BEFORE
INSERT_AFTER
REPLACE
REMOVE
MOVE_BEFORE
MOVE_AFTER
MERGE_INTO
SPLIT_AT
WRAP
UNWRAP
UPDATE_FIELD
APPEND_CHILD
REMOVE_CHILD
SET_PREFERRED_VARIANT


⸻

10. Determinism Rule

Mutation execution must be deterministic.

For the same:
	•	proposal artifact
	•	canonical baseline
	•	execution inputs

the Mutation Engine must always produce the same:
	•	graph result
	•	version result
	•	audit result

No random generation is allowed during execution.

If proposal generation required AI, that uncertainty must already be captured in the Proposal Artifact.

Execution itself must be deterministic.

⸻

11. Validation Phase

Before any mutation runs, the Mutation Engine must validate:
	1.	proposal exists
	2.	proposal is approved
	3.	proposal targets valid canonical nodes
	4.	target versions exist
	5.	target graph types match requested mutation types
	6.	mutation payloads are complete
	7.	constraints are satisfied
	8.	brand / CGP constraints are not violated
	9.	safety checks pass

If validation fails:
	•	no mutation may be applied
	•	execution must fail closed

⸻

12. Versioning Model

Mutations must never overwrite canonical versions in-place.

Instead:
	•	old PageVersion remains immutable
	•	new PageVersion is created
	•	old SiteVersion remains immutable
	•	new SiteVersion is created if site-wide impact exists

12.1 Page-scoped mutation
	•	creates new PageVersion
	•	may or may not create new SiteVersion depending on publish model

12.2 Site-scoped mutation
	•	creates new SiteVersion
	•	may include multiple new PageVersions

Mutation Engine must preserve immutable version history.

⸻

13. Audit Trail Model

Every mutation execution must create audit records.

13.1 Audit record minimum fields

MutationAuditRecord:
  auditId
  executionId
  proposalId
  targetSiteId
  targetPageId
  targetVersionBefore
  targetVersionAfter
  mutationType
  operationSummary
  actor
  timestamp
  success
  warnings[]

13.2 Audit rule

Audit records must be:
	•	immutable
	•	queryable
	•	diff-linked
	•	rollback-linked

⸻

14. Diff Integration

Every successful mutation execution must emit or link to a diff.

Minimum diff surfaces:
	•	layout diff
	•	content diff
	•	semantic diff
	•	style token diff
	•	asset diff
	•	navigation diff

The Mutation Engine does not need to render the final UI diff itself, but it must emit enough structured data for the Diff Engine to do so.

⸻

15. Rollback Compatibility

Mutation execution must preserve rollback safety.

This means:
	•	old versions remain intact
	•	mutation does not destroy prior canonical state
	•	artifact rebuild is version-scoped
	•	rollback can re-point to older SiteVersion / PageVersion

Mutation Engine is not itself the rollback engine, but must remain rollback-compatible by design.

⸻

16. Safety Constraints

All mutations must respect:
	•	canonical invariants
	•	structural integrity
	•	graph consistency
	•	brand / CGP constraints
	•	governance approval rules

Forbidden execution behaviors
	•	mutating unapproved proposal
	•	mutating non-trusted baseline
	•	mutating production directly without versioning
	•	mutating outside canonical graph
	•	mutating through raw HTML injection
	•	mutating without audit record
	•	mutating without rebuild candidate generation

⸻

17. Brand / CGP Constraint Enforcement

The Mutation Engine must be able to reject mutations that violate approved brand constraints.

Examples:
	•	forbidden color change
	•	disallowed typography system
	•	disallowed logo placement
	•	disallowed layout pattern
	•	disallowed section type for a given brand/site class

These rules must be evaluated before execution, not after.

⸻

18. Mutation Scope Rules

18.1 Single-page mutation

Allowed when proposal affects only one page.

18.2 Multi-page mutation

Allowed when proposal explicitly targets multiple pages.

18.3 Site-wide mutation

Allowed when proposal affects:
	•	shared nav
	•	shared footer
	•	global style tokens
	•	shared section templates
	•	global CGP layer

Mutation scope must be explicit in proposal metadata.

⸻

19. Controlled Generation Support

The Mutation Engine must also support controlled generation outputs.

This means it must be able to accept proposal artifacts that generate:
	•	a new page
	•	a new page variant
	•	a new site version with alternate structure

But even in generation mode:
	•	output must become canonical graph state
	•	output must remain diffable
	•	output must remain reviewable
	•	output must remain versioned

The Mutation Engine is what turns generation into safe platform behavior.

⸻

20. Partial Execution Policy

The Mutation Engine must not silently partially apply multi-step mutations unless proposal explicitly allows staged execution.

Default rule:
	•	validate all operations
	•	apply atomically where possible
	•	fail closed on invalid step

If partial execution is supported later, it must be explicit and auditable.

⸻

21. Execution Stages

Mutation execution should conceptually follow:
	1.	Resolve targets
	2.	Validate proposal + constraints
	3.	Normalize mutation operations
	4.	Apply graph mutations
	5.	Validate graph integrity post-mutation
	6.	Create new versions
	7.	Emit diff references
	8.	Emit artifact rebuild candidate
	9.	Record audit metadata

⸻

22. Graph Integrity Checks

After mutation, the engine must verify:
	•	no orphaned layout nodes
	•	no broken graph edges
	•	no duplicate primary nav entries
	•	no broken asset references
	•	no impossible ordering references
	•	no invalid section hierarchy
	•	no illegal token references

If post-mutation graph integrity fails:
	•	mutation execution fails
	•	no publish candidate may be emitted

⸻

23. Mutation Engine and Runtime

The Mutation Engine must not talk directly to runtime serving paths.

Its contract ends at:
	•	canonical version creation
	•	artifact rebuild candidate generation
	•	audit record emission

Runtime serving remains downstream.

This separation is mandatory for safety.

⸻

24. Proposal Relationship

Proposal Artifact and Mutation Engine relationship:
	•	Proposal Artifact defines intent
	•	Mutation Engine validates intent
	•	Mutation Engine executes intent deterministically
	•	Mutation Engine never invents missing intent

If proposal is underspecified:
	•	execution must fail
	•	proposal revision is required

⸻

25. Human Override Model

Humans may:
	•	approve proposal
	•	reject proposal
	•	request revision
	•	force execution in limited governance contexts

But even forced execution must still:
	•	go through Mutation Engine
	•	create audit trail
	•	create versions
	•	remain rollback-compatible

No direct manual bypass of the Mutation Engine should exist in normal architecture.

⸻

26. Future Extensions

Future capabilities may include:
	•	batch mutation planning
	•	dependent mutation graphs
	•	proposal chaining
	•	simulation mode
	•	dry-run execution
	•	multi-proposal comparison execution
	•	performance-aware mutation checks
	•	accessibility-aware mutation checks

But all future extensions must preserve deterministic canonical execution.

⸻

27. Anti-Patterns (Forbidden)

The Mutation Engine must never become:
	•	a DOM patch system
	•	an HTML rewrite engine
	•	a builder action proxy
	•	a runtime hotfix system
	•	an AI freeform executor

If it becomes any of the above, trust collapses.

⸻

28. Founder Directive

The Mutation Engine is the part of GNR8 that turns AI from suggestion into safe action.

If Proposal Artifacts are the safety membrane,
the Mutation Engine is the controlled surgical tool.

If the Mutation Engine is weak:
	•	optimization becomes unsafe
	•	generation becomes dangerous
	•	canonical truth collapses

If the Mutation Engine is strong:
	•	GNR8 becomes the safest AI-driven website evolution platform in the world