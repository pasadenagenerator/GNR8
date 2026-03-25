# GNR8 Migration Observability Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Full-system visibility for migration, governance, runtime, and post-migration evolution
Depends On:
- GNR8 Migration Architecture Blueprint
- GNR8 Migration Runtime Orchestration Spec
- GNR8 Migration Governance Spec
- GNR8 Migration Diff Engine Deep Spec
- GNR8 Runtime Engine Spec
- GNR8 Proposal Artifact Spec
- GNR8 Mutation Engine Spec

---

## 1. Purpose

The Migration Observability layer defines how GNR8 sees, records, explains, and audits its own behavior.

Its role is to make the migration engine:

- debuggable
- explainable
- auditable
- replayable
- enterprise-trustworthy
- optimizer-ready

Observability is not just logging.

It is the system of truth for:

- what happened
- when it happened
- why it happened
- what decision was made
- what evidence supported it
- what changed afterward

Without observability:
- migration is opaque
- governance is weak
- debugging is slow
- AI optimization is unsafe
- enterprise trust collapses

---

## 2. Core Principle

Everything important in GNR8 migration must leave a trace.

If a migration system cannot explain itself, it cannot be trusted.

Observability must cover:

- inputs
- transformations
- decisions
- outputs
- anomalies
- overrides
- rollbacks

Observability must be:

- deterministic
- structured
- queryable
- correlated across layers
- low-ambiguity

---

## 3. Scope

This spec covers observability for:

- migration intake
- snapshot capture
- layout graph construction
- structural reconstruction
- canonical sectionization
- semantic reconstruction
- diff generation
- governance decisions
- rollout policy
- enforcement decisions
- artifact build
- runtime serving
- proposal generation
- mutation execution
- rollback

This spec does NOT define:
- UI design
- analytics dashboards
- BI tooling
- customer-facing reporting

It defines the canonical telemetry model.

---

## 4. Observability Philosophy

Observability in GNR8 is built around five pillars:

1. Event Trace
2. State Trace
3. Decision Trace
4. Confidence Trace
5. Evidence Trace

Together they answer:

- What happened?
- What state did the system move into?
- Why did it choose that path?
- How certain was it?
- What evidence supported the choice?

---

## 5. Observability Object Model

The core observability objects are:

- Trace
- Event
- State Snapshot
- Decision Record
- Confidence Record
- Evidence Reference
- Anomaly Record
- Correlation Context

These are independent from UI and storage implementation.

---

## 6. Trace Model

A Trace is the top-level correlation object for one migration or evolution flow.

```md
MigrationTrace {
  traceId
  traceType
  rootEntityType
  rootEntityId
  startedAt
  endedAt
  status
  correlationIds[]
  stageSummaries[]
}

traceType enum
	•	MIGRATION
	•	SHADOW_VALIDATION
	•	CANARY_ROLLOUT
	•	PRODUCTION_CUTOVER
	•	PROPOSAL_GENERATION
	•	MUTATION_EXECUTION
	•	ROLLBACK
	•	OPTIMIZATION_CYCLE

Each meaningful workflow must have one trace root.

⸻

7. Correlation Context

Every event and decision must carry correlation context.

CorrelationContext {
  traceId
  siteId
  siteVersionId
  pageId
  pageVersionId
  artifactId
  proposalId
  mutationExecutionId
  governanceDecisionId
  requestId
}

Not every field is required on every record, but traceId is mandatory.

This enables end-to-end reasoning across system layers.

⸻

8. Event Model

An Event is a timestamped fact that something happened.

MigrationEvent {
  eventId
  traceId
  eventType
  timestamp
  actorType
  actorId
  stage
  severity
  payload
  correlationContext
}

actorType examples
	•	SYSTEM
	•	WORKER
	•	OPERATOR
	•	ADMIN
	•	GOVERNANCE_ENGINE
	•	DIFF_ENGINE
	•	RUNTIME_ENGINE
	•	OPTIMIZER

severity examples
	•	DEBUG
	•	INFO
	•	WARNING
	•	ERROR
	•	CRITICAL

⸻

9. Stage Model

Every event belongs to a stage.

MigrationStage =
  INTAKE
  SNAPSHOT
  LAYOUT_GRAPH
  STRUCTURAL_RECONSTRUCTION
  CANONICAL_SECTIONIZATION
  SEMANTIC_RECONSTRUCTION
  DIFF
  GOVERNANCE
  POLICY
  ENFORCEMENT
  ARTIFACT_BUILD
  SHADOW_DEPLOY
  SHADOW_VALIDATE
  CANARY_DEPLOY
  PRODUCTION_DEPLOY
  PROPOSAL
  MUTATION
  ROLLBACK

This stage taxonomy must remain stable.

⸻

10. State Trace Model

A State Trace records stable lifecycle states, not transient events.

StateSnapshot {
  snapshotId
  traceId
  entityType
  entityId
  stateType
  stateValue
  timestamp
  metadata
  correlationContext
}

Examples:
	•	migration lifecycle state
	•	rollout stage
	•	artifact status
	•	governance execution state
	•	proposal review state
	•	mutation execution state

Events say something happened.
State snapshots say what state the system entered.

⸻

11. Decision Trace Model

Decision Trace records any meaningful system decision.

DecisionRecord {
  decisionId
  traceId
  decisionType
  timestamp
  engine
  inputRefs[]
  outputState
  reasons[]
  blockingReasons[]
  recommendedNextStep
  confidence
  correlationContext
}

decisionType examples
	•	LAYOUT_REGION_CLASSIFICATION
	•	SECTIONIZATION_DECISION
	•	MIGRATION_GATE_DECISION
	•	ROLLOUT_POLICY_DECISION
	•	ENFORCEMENT_DECISION
	•	GOVERNANCE_DECISION
	•	PROPOSAL_APPROVAL_DECISION
	•	RUNTIME_SERVE_DECISION
	•	ROLLBACK_DECISION

This is one of the most important observability objects in GNR8.

⸻

12. Confidence Trace Model

Confidence must be observable everywhere it matters.

ConfidenceRecord {
  confidenceId
  traceId
  confidenceType
  targetEntityType
  targetEntityId
  score
  scoreBand
  components
  timestamp
  anomalies[]
  correlationContext
}

confidenceType examples
	•	LAYOUT_CONFIDENCE
	•	STRUCTURAL_CONFIDENCE
	•	SECTION_CONFIDENCE
	•	PAGE_STRUCTURAL_CONFIDENCE
	•	SEMANTIC_CONFIDENCE
	•	DIFF_CONFIDENCE
	•	PROPOSAL_CONFIDENCE
	•	RISK_CONFIDENCE

This allows:
	•	operator review
	•	threshold tuning
	•	AI training
	•	governance quality control

⸻

13. Evidence Trace Model

Every meaningful classification should link back to evidence.

EvidenceReference {
  evidenceId
  traceId
  evidenceType
  sourceRef
  targetRef
  excerpt
  confidence
  correlationContext
}

evidenceType examples
	•	DOM_SPAN
	•	LAYOUT_NODE
	•	REGION_CLUSTER
	•	TEXT_CLUSTER
	•	HEADING_PATTERN
	•	IMAGE_CLUSTER
	•	LINK_CLUSTER
	•	DIFF_FRAGMENT
	•	ASSET_ALIAS_GROUP
	•	GOVERNANCE_INPUT

This is critical for explainability.

⸻

14. Anomaly Trace Model

Anomalies are first-class observability objects.

AnomalyRecord {
  anomalyId
  traceId
  anomalyType
  severity
  stage
  targetEntityType
  targetEntityId
  message
  evidenceRefs[]
  timestamp
  correlationContext
}

anomalyType examples
	•	NAV_MERGED_INTO_BODY
	•	HERO_AMBIGUOUS
	•	FOOTER_MISSING
	•	GALLERY_FRAGMENTED
	•	FORM_CONTACT_PARTIAL
	•	STRUCTURAL_COLLAPSE_RISK
	•	ASSET_ALIAS_CONFLICT
	•	GOVERNANCE_SIGNAL_MISSING
	•	ARTIFACT_PATH_UNRESOLVED
	•	RUNTIME_ENFORCEMENT_INCONSISTENT

Anomalies are not just errors.
They are risk signals.

⸻

15. Migration Intake Observability

Intake must record:
	•	source URL
	•	crawl scope
	•	platform hints
	•	operator inputs
	•	migration mode
	•	job identity
	•	initial policy context

Key events:
	•	INTAKE_RECEIVED
	•	INTAKE_VALIDATED
	•	INTAKE_REJECTED
	•	SOURCE_FINGERPRINT_DETECTED

This is the beginning of trace lineage.

⸻

16. Snapshot Observability

Snapshot stage must record:
	•	fetched URLs
	•	asset inventory
	•	crawl map
	•	failed fetches
	•	normalized resource map
	•	snapshot identity
	•	snapshot size
	•	snapshot reproducibility hash

Key events:
	•	SNAPSHOT_STARTED
	•	SNAPSHOT_CAPTURED
	•	SNAPSHOT_FETCH_FAILED
	•	SNAPSHOT_NORMALIZED
	•	SNAPSHOT_FINALIZED

Snapshot observability is required for reproducibility.

⸻

17. Layout Graph Observability

Layout Graph construction must emit:
	•	region counts
	•	node counts
	•	node type distribution
	•	cluster confidence stats
	•	region ordering summary
	•	structural anomalies

Key records:
	•	LayoutGraph build result
	•	layout node classification decisions
	•	anomaly records
	•	region cluster summaries

This is how GNR8 explains what it thinks it saw.

⸻

18. Structural Reconstruction Observability

Must record:
	•	reconstructed region plans
	•	grouping decisions
	•	split/merge decisions
	•	structural confidence per region
	•	ordering plan
	•	reconstruction anomalies

Key decisions:
	•	why this became HERO
	•	why this became GALLERY_MEDIA
	•	why UNKNOWN_REGION was emitted
	•	why regions were merged or not merged

This is migration-core explainability.

⸻

19. Canonical Sectionization Observability

Must record:
	•	canonical section list
	•	section ordering
	•	section structural types
	•	source lineage
	•	section confidence
	•	collapse prevention events
	•	unknown section emissions

Important for:
	•	diff stability
	•	review UX
	•	later mutations

⸻

20. Semantic Reconstruction Observability

Must record:
	•	semantic role assignments
	•	semantic confidence
	•	semantic anomalies
	•	clustering decisions
	•	role ambiguity
	•	role-vs-structure mismatches

Example:
	•	section structurally HERO but semantically contaminated by legal text

This is where meaning becomes inspectable.

⸻

21. Diff Observability

Diff stage must emit:
	•	diff report identity
	•	mismatch classes
	•	risk score
	•	confidence score
	•	changed regions
	•	structural drift markers
	•	interaction degradation markers
	•	semantic continuity summary

Key events:
	•	DIFF_STARTED
	•	DIFF_COMPLETED
	•	DIFF_FAILED
	•	DIFF_RISK_HIGH
	•	DIFF_CONFIDENCE_LOW

Diff observability is the proof layer.

⸻

22. Governance Observability

Governance must emit:
	•	migration gate decisions
	•	rollout policy decisions
	•	enforcement decisions
	•	decision reasons
	•	blocking pages
	•	required next step
	•	operator override events

Key rule:
Governance must always be observable as explicit decision records.

No hidden logic.

⸻

23. Artifact Build Observability

Artifact build must record:
	•	artifactId
	•	siteVersionId
	•	page list
	•	path coverage
	•	asset map summary
	•	integrity check result
	•	builder warnings
	•	builder failures

Key events:
	•	ARTIFACT_BUILD_STARTED
	•	ARTIFACT_BUILD_COMPLETED
	•	ARTIFACT_INTEGRITY_FAILED
	•	ARTIFACT_PATH_COVERAGE_FAILED

Artifact build observability is required before serving.

⸻

24. Runtime Serving Observability

Runtime serving must record:
	•	host binding resolution
	•	site pointer resolution
	•	artifact resolution
	•	path resolution
	•	fallback usage
	•	enforcement decision
	•	response outcome
	•	content type correctness
	•	asset proxy mapping

Key events:
	•	RUNTIME_REQUEST_RECEIVED
	•	RUNTIME_ARTIFACT_HIT
	•	RUNTIME_ARTIFACT_MISS
	•	RUNTIME_ENFORCEMENT_DENY
	•	RUNTIME_FALLBACK_USED
	•	RUNTIME_RESPONSE_SERVED

This is critical for proving runtime truth.

⸻

25. Proposal Observability

Proposal generation must record:
	•	proposal type
	•	target scope
	•	rationale summary
	•	impact prediction
	•	proposal confidence
	•	proposal risk
	•	source insights
	•	approval state transitions

Key events:
	•	PROPOSAL_GENERATED
	•	PROPOSAL_REVIEW_REQUESTED
	•	PROPOSAL_APPROVED
	•	PROPOSAL_REJECTED
	•	PROPOSAL_REVISED

This is the bridge to optimization trust.

⸻

26. Mutation Observability

Mutation execution must record:
	•	mutation plan id
	•	targeted canonical nodes
	•	pre-mutation version refs
	•	post-mutation version refs
	•	graph integrity checks
	•	mutation warnings
	•	mutation audit link
	•	diff link

Key events:
	•	MUTATION_VALIDATED
	•	MUTATION_EXECUTED
	•	MUTATION_FAILED
	•	MUTATION_ROLLED_BACK

Mutation observability is required for safe AI execution.

⸻

27. Rollback Observability

Rollback must always emit:
	•	reason
	•	trigger
	•	target rollback version
	•	before/after version refs
	•	operator approval if required
	•	runtime effect

Key events:
	•	ROLLBACK_REQUESTED
	•	ROLLBACK_APPROVED
	•	ROLLBACK_EXECUTED
	•	ROLLBACK_FAILED

Rollback without trace is unacceptable.

⸻

28. Observability Severity Policy

Severity must be standardized.

DEBUG

Fine-grained engine details

INFO

Normal lifecycle progression

WARNING

Recoverable anomaly or degraded quality

ERROR

Stage failure or invalid state

CRITICAL

Safety, integrity, or governance violation

This enables deterministic alerting.

⸻

29. Observability Storage Requirements

Observability records must be:
	•	append-only
	•	immutable where appropriate
	•	correlated
	•	queryable by traceId, siteId, artifactId, proposalId
	•	partitionable by stage and time
	•	retention-managed

Do not rely only on plain text logs.

Structured records are mandatory.

⸻

30. Minimal Queryability Requirements

System must support querying:
	•	full migration timeline by traceId
	•	all anomalies for one siteVersion
	•	all governance decisions for one rollout
	•	all artifact failures for one migration wave
	•	all proposal/mutation history for one page
	•	all runtime serve decisions for one host/path

This is a hard requirement.

⸻

31. Explainability Bundle

Every high-value system action should be able to emit an Explainability Bundle.

ExplainabilityBundle {
  traceId
  summary
  primaryReasons[]
  evidenceRefs[]
  riskFactors[]
  recommendedAction
}

This should be available for:
	•	migration gate
	•	rollout policy
	•	enforcement
	•	proposal generation
	•	mutation execution
	•	rollback

This powers operator UX.

⸻

32. Determinism & Reproducibility Support

Observability must support deterministic replay.

This means:
	•	capture enough data to understand state transitions
	•	record version references, not only summaries
	•	preserve key hashes/signatures for snapshot/canonical/artifact stages

Observability is part of reproducibility infrastructure.

⸻

33. Operator-Facing Observability

Operator UI does not define observability, but consumes it.

Operator surfaces should be able to render:
	•	migration timeline
	•	weak sections
	•	anomaly list
	•	diff results
	•	governance decisions
	•	rollout eligibility
	•	enforcement reasons
	•	compare evidence

Backend observability must support this directly.

⸻

34. AI Optimizer Observability

Later AI layers must consume observability signals such as:
	•	structural drift patterns
	•	successful rollout patterns
	•	recurring anomalies
	•	safe mutation classes
	•	rejected proposal classes

Observability becomes the training and feedback substrate.

⸻

35. Security & Privacy Constraints

Observability must not leak:
	•	cross-tenant data
	•	secrets
	•	protected credentials
	•	raw sensitive content beyond allowed scope

Observability must still preserve:
	•	traceability
	•	explainability
	•	audit value

Sensitive payloads must be redacted or referenced safely.

⸻

36. Anti-Patterns (Forbidden)

Observability must never degrade into:
	•	plain unstructured logs only
	•	screenshot-only history
	•	UI-only explainability
	•	hidden governance logic
	•	non-correlated engine events
	•	lossy trace summaries
	•	mutable audit records

These destroy trust.

⸻

37. Founder Directive

Observability is how GNR8 proves that it is not guessing.

If migration cannot be observed, it cannot be trusted.
If governance cannot be observed, it cannot be enforced.
If AI cannot be observed, it cannot be allowed.

Observability is the nervous system of the platform.