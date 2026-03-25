GNR8 Proposal Artifact Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Optimization Engine + Controlled Generator
Dependency: Canonical Model

⸻

1. Purpose

This document defines the structure and lifecycle of Proposal Artifacts in GNR8.

Proposal Artifacts are the primary mechanism through which:
	•	AI proposes changes
	•	humans review changes
	•	GNR8 executes approved mutations

Proposal Artifacts ensure that:
	•	no AI change is opaque
	•	no mutation is untraceable
	•	no optimization bypasses governance
	•	no generation bypasses canonical structure

This spec applies to:
	•	optimization proposals
	•	redesign proposals
	•	structure proposals
	•	layout proposals
	•	controlled generation proposals

⸻

2. Core Principle

AI does not mutate the site.

AI produces Proposal Artifacts.

Proposal Artifacts may then be:
	•	reviewed
	•	approved
	•	rejected
	•	modified
	•	staged
	•	executed

This enforces:

proposal → approval → mutation → artifact rebuild

Never:

AI → live change

⸻

3. Proposal Artifact Lifecycle
	1.	Insight Layer identifies opportunity
	2.	Proposal Engine creates proposal artifact
	3.	Proposal stored in canonical proposal store
	4.	Operator reviews proposal
	5.	Operator chooses action:
	•	approve
	•	reject
	•	request revision
	•	stage shadow
	•	stage canary
	6.	Mutation Engine executes approved proposal
	7.	New canonical version created
	8.	Artifact rebuilt
	9.	Governance applied

⸻

4. Proposal Artifact Types

4.1 Content Proposal
	•	rewrite text
	•	add copy
	•	remove redundancy
	•	improve clarity

4.2 Structural Proposal
	•	reorder sections
	•	split sections
	•	merge sections
	•	introduce new sections

4.3 Layout Proposal
	•	alternate layout composition
	•	hero restructuring
	•	grid redesign
	•	responsive restructuring

4.4 UX Proposal
	•	navigation improvement
	•	CTA optimization
	•	funnel clarity improvement
	•	interaction simplification

4.5 Visual Proposal
	•	style token changes
	•	spacing rhythm change
	•	visual hierarchy improvement

4.6 Redesign Proposal
	•	broader structural redesign
	•	modernized page architecture

4.7 Generation Proposal
	•	new page generation
	•	alternate site generation
	•	expansion using existing content

⸻

5. Proposal Artifact Structure

A Proposal Artifact is a canonical object.

5.1 Top-Level Schema

proposalId
proposalType
targetScope
targetEntityId
createdBy
createdAt
status
confidence
rationale
expectedImpact
mutationPlan
diffPreview
reviewMetadata
safetyMetadata


⸻

6. proposalType

Enum:

CONTENT_UPDATE
SECTION_REORDER
SECTION_INSERT
SECTION_REMOVE
SECTION_SPLIT
SECTION_MERGE
LAYOUT_CHANGE
NAVIGATION_CHANGE
STYLE_TOKEN_CHANGE
PAGE_GENERATION
SITE_GENERATION
REDESIGN
UX_OPTIMIZATION


⸻

7. targetScope

Defines mutation scope.

PAGE
SITE
SECTION
COMPONENT


⸻

8. targetEntityId

References canonical object:
	•	pageId
	•	siteId
	•	sectionId
	•	componentId

⸻

9. Rationale Block

Explains why the proposal exists.

Structure:

rationale:
  insightSource
  detectedIssues[]
  opportunityDescription
  structuralConfidenceImpact
  UXImpactEstimate
  conversionImpactEstimate

Example:

insightSource: LAYOUT_GRAPH_ANALYSIS
detectedIssues:
  - HERO_LOW_CLARITY
  - CTA_MISSING
opportunityDescription:
  Improve hero messaging clarity and introduce primary CTA.


⸻

10. Expected Impact

Non-binding estimate:

expectedImpact:
  visualClarity: HIGH
  UXImprovement: MEDIUM
  conversionPotential: MEDIUM
  structuralStabilityRisk: LOW


⸻

11. Mutation Plan

This is the machine-executable plan.

Key rule:

Mutation Plan must be:
	•	deterministic
	•	canonical
	•	reversible
	•	diffable

Structure:

mutationPlan:
  mutations[]

Each mutation:

type
targetId
operation
payload
orderingContext
constraints

Example:

type: SECTION_REORDER
targetId: section_hero
operation: MOVE_AFTER
payload:
  referenceSectionId: section_nav


⸻

12. Diff Preview

Diff Preview is human-readable.

It must include:

layoutDiff
contentDiff
semanticDiff
styleDiff
navigationDiff


⸻

13. Safety Metadata

Ensures proposal respects governance.

safetyMetadata:
  respectsBrandConstraints
  respectsStructuralIntegrity
  requiresHumanApproval
  allowedAutonomyLevel
  rolloutRiskLevel

Example:

respectsBrandConstraints: true
requiresHumanApproval: true
rolloutRiskLevel: LOW


⸻

14. Review Metadata

Tracks human interaction.

reviewMetadata:
  reviewedBy[]
  reviewStatus
  reviewNotes
  approvalDecision
  stagedRolloutMode

reviewStatus enum:

PENDING
UNDER_REVIEW
APPROVED
REJECTED
REVISION_REQUESTED

stagedRolloutMode:

NONE
SHADOW
CANARY
PRODUCTION_CANDIDATE


⸻

15. Confidence

AI confidence in proposal validity.

confidence:
  structuralConfidence
  semanticConfidence
  visualConfidence
  riskScore

Important:

Confidence does NOT equal permission.

⸻

16. Execution Rules

Mutation Engine may execute proposal only if:
	•	reviewStatus = APPROVED
	•	governance allows rollout stage
	•	safetyMetadata allows execution
	•	canonical integrity checks pass

⸻

17. Proposal Immutability

Proposal artifacts must be immutable after creation.

If AI revises proposal:
	•	new proposalId must be created
	•	linked via:

parentProposalId

This preserves auditability.

⸻

18. Proposal Versioning

Proposal lifecycle:

PROPOSED → REVIEWED → APPROVED → EXECUTED → ARCHIVED

Executed proposal becomes:
	•	mutation audit record
	•	linked to new site/page version

⸻

19. Generator-Specific Extensions

Generation proposals must include:

generationConstraints:
  brandSystemId
  allowedLayoutPatterns[]
  forbiddenPatterns[]
  contentSources[]
  toneProfile

This ensures generator stays:
	•	constrained
	•	brand-safe
	•	canonical

⸻

20. Relationship to Canonical Model

Proposal Artifacts must:
	•	reference canonical nodes
	•	never reference raw HTML
	•	never mutate runtime state directly
	•	always mutate canonical graph state

⸻

21. Operator UX Requirements

Proposal must support:
	•	side-by-side compare
	•	structural mismatch explanation
	•	impact summary
	•	risk summary
	•	rollback preview

⸻

22. Future Extensions

Future capabilities:
	•	batch proposals
	•	proposal dependency graphs
	•	proposal simulations
	•	AI debate mode
	•	performance-informed proposals
	•	analytics-informed proposals

⸻

23. Founder Directive

Proposal Artifacts are the safety membrane between:

AI creativity
and
production reality.

If Proposal Artifacts are weak:

GNR8 becomes unsafe.

If Proposal Artifacts are strong:

GNR8 becomes the safest AI evolution system ever built.