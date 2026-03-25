GNR8 Structural Reconstruction Engine Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Deterministic transformation from Layout Graph into canonical structural reality
Depends On:
	•	GNR8 Layout Graph Specification
	•	GNR8 Canonical Data Model Spec
	•	GNR8 Migration Architecture Blueprint

⸻

1. Purpose

The Structural Reconstruction Engine is the layer that converts perceived structure into canonical structure.

If the Layout Graph defines how GNR8 sees a page,
the Structural Reconstruction Engine defines how GNR8 rebuilds that page as a stable canonical structure.

Its role is to:
	•	preserve section order
	•	preserve major layout regions
	•	reconstruct grouping
	•	isolate navigation, hero, gallery, form, footer, legal
	•	reduce structural collapse
	•	create deterministic sectionization
	•	prepare safe canonical input for semantic reconstruction

This engine is the core of migration-first safety.

⸻

2. Core Principle

Structural reconstruction must happen before semantic interpretation.

The engine must first answer:
	•	what regions exist
	•	where they start and end
	•	how they are grouped
	•	in what order they appear
	•	which clusters belong together

Only after this may the system answer:
	•	what they mean
	•	how they should be optimized
	•	how they should be rewritten

This layer is structural, not creative.

⸻

3. Engine Position in the Pipeline

Pipeline:
	1.	Snapshot capture
	2.	DOM parse
	3.	Layout Graph construction
	4.	Structural Reconstruction Engine
	5.	Canonical sectionization
	6.	Semantic reconstruction
	7.	Artifact build
	8.	Governance evaluation

This engine is the bridge between:
	•	perception
	•	canonical reality

⸻

4. Engine Responsibilities

The Structural Reconstruction Engine must:
	1.	consume Layout Graph
	2.	identify canonical structural regions
	3.	preserve deterministic ordering
	4.	generate section grouping plans
	5.	assign structural confidence
	6.	attach reconstruction anomalies
	7.	produce reconstruction plans safe for canonicalization

It must NOT:
	•	rewrite content
	•	infer semantic intent beyond structural class
	•	optimize design
	•	generate new sections speculatively
	•	mutate runtime state

⸻

5. Core Outputs

The engine produces a Structural Reconstruction Plan.

StructuralReconstructionPlan {
  pageId
  regionPlans[]
  orderingPlan
  structuralConfidence
  anomalies[]
  reconstructionMetadata
}


⸻

6. Region Plan Model

Each detected region becomes a canonical region plan.

StructuralRegionPlan {
  id
  sourceNodeIds[]
  sourceClusterIds[]
  structuralType
  structuralRole
  order
  domSpan
  groupingMode
  childRegionIds[]
  structuralConfidence
  anomalies[]
}

structuralType examples
	•	HEADER_NAV
	•	HERO
	•	BODY_SECTION
	•	GALLERY_MEDIA
	•	FORM_CONTACT
	•	FOOTER_LEGAL
	•	UNKNOWN_REGION

groupingMode examples
	•	DIRECT
	•	MERGED
	•	SPLIT
	•	CLUSTERED
	•	ISOLATED

⸻

7. Ordering Model

Ordering must be deterministic and preserved from source structure.

Rule

Source section order is sacred unless:
	•	structural corruption exists
	•	explicit anomaly recovery rule applies

The engine must preserve:
	•	top-to-bottom progression
	•	region adjacency
	•	region dominance
	•	structural rhythm

It must not reorder for aesthetics.

⸻

8. Grouping Rules

Grouping is the heart of reconstruction.

8.1 Allowed grouping actions
	•	merge adjacent structurally equivalent nodes
	•	isolate nav-like clusters
	•	isolate hero-like intro cluster
	•	isolate repeated media cluster as gallery
	•	isolate form cluster
	•	isolate footer/legal cluster

8.2 Forbidden grouping actions
	•	merge nav into body
	•	merge footer into hero
	•	merge contact form into gallery
	•	merge legal into services
	•	collapse all unresolved structure into a single mega-section when recoverable boundaries exist

⸻

9. Canonical Structural Types

The engine reconstructs only canonical structural types.

These are:
	•	HEADER_NAV
	•	HERO
	•	BODY_SECTION
	•	GALLERY_MEDIA
	•	FORM_CONTACT
	•	FOOTER_LEGAL
	•	UNKNOWN_REGION

These are structural, not business-semantic.

Example:
HERO means:
dominant intro region

Not:
marketing hero with guaranteed business messaging

⸻

10. Structural Confidence Model

Each region plan must include deterministic structural confidence.

Confidence must reflect:
	•	DOM integrity
	•	cluster coherence
	•	boundary clarity
	•	density consistency
	•	region signature strength

Score:

0.0 → broken
1.0 → highly reliable

Confidence is later consumed by:
	•	quality gates
	•	rollout policy
	•	enforcement
	•	operator UX

⸻

11. Reconstruction Anomalies

The engine must emit anomalies whenever reconstruction confidence is impaired.

Examples:
	•	HERO_AMBIGUOUS
	•	NAV_MERGED_INTO_BODY
	•	FOOTER_UNCERTAIN
	•	GALLERY_FRAGMENTED
	•	FORM_CONTACT_PARTIAL
	•	BODY_SECTION_OVERMERGED
	•	STRUCTURAL_COLLAPSE_RISK
	•	REGION_BOUNDARY_WEAK

Anomalies are:
	•	not failures
	•	but governance-critical signals

⸻

12. Boundary Preservation Rules

Region boundaries must be preserved whenever there is enough deterministic evidence.

Strong boundary evidence includes:
	•	heading transitions
	•	abrupt density shifts
	•	repeated media groups
	•	form isolation
	•	footer utility signature
	•	nav repetition pattern
	•	top-of-page intro dominance

Weak boundary evidence must not cause aggressive collapse.

When uncertain:
prefer UNKNOWN_REGION over destructive merge.

⸻

13. Recovery Rules

When source HTML is weak, the engine may apply deterministic recovery rules.

Allowed recovery patterns:
	•	isolate probable header/nav from top repeated links
	•	isolate probable hero from first dominant intro block
	•	isolate probable gallery from repeated image cluster
	•	isolate probable contact/form region from form controls + contact values
	•	isolate probable footer/legal from utility density near document end

Recovery must remain:
	•	deterministic
	•	explainable
	•	anomaly-annotated

⸻

14. Relationship to Canonical Sectionization

The Structural Reconstruction Engine does not directly build final renderable sections.

It builds:

→ sectionization constraints

Canonical sectionization then consumes:
	•	region plans
	•	ordering plan
	•	confidence
	•	anomalies

This separation is important.

Reconstruction = structure truth
Sectionization = canonical projection

⸻

15. Relationship to Semantic Reconstruction

Semantic reconstruction is downstream.

Semantic layer may classify:
	•	about
	•	services
	•	trust
	•	CTA
	•	legal
	•	gallery intent

But it must operate within structural region boundaries defined here.

Semantic layer must not destroy region boundaries without explicit later mutation.

⸻

16. Relationship to Diff Engine

Structural reconstruction output must be diff-friendly.

Diff Engine must be able to compare:
	•	region order
	•	region presence
	•	region merge/split events
	•	confidence delta
	•	anomaly delta

This is why region plans must preserve source lineage.

⸻

17. Relationship to AI Optimizer

AI Optimizer may later propose:
	•	section reorder
	•	section split/merge
	•	hero restructuring
	•	gallery redesign

But those proposals must reference reconstructed structural regions.

This engine defines the structural baseline AI is allowed to evolve.

⸻

18. Determinism Requirements

Given the same:
	•	snapshot HTML
	•	layout graph
	•	reconstruction ruleset

the engine must always produce the same:
	•	region plans
	•	order
	•	confidence
	•	anomalies

No stochastic scoring.
No AI-dependent reconstruction.

⸻

19. Performance Requirements

Structural reconstruction must be efficient.

Target:
	•	linear or near-linear relative to layout graph size
	•	safe for SMB/agency use at scale
	•	no browser engine dependency
	•	no screenshot dependency

This is infrastructure, not a lab tool.

⸻

20. Explainability Requirements

Every region plan must be explainable.

Minimum explainability fields:
	•	sourceNodeIds
	•	domSpan
	•	structuralType
	•	groupingMode
	•	confidence
	•	anomalies

Operators and downstream systems must be able to answer:
	•	why this became hero
	•	why this became gallery
	•	why this region is weak
	•	why grouping happened

⸻

21. Failure Model

If reconstruction fails strongly:
	•	engine must still emit a plan
	•	but with UNKNOWN_REGION
	•	low confidence
	•	explicit anomalies

It must fail soft, not fail silent.

The engine should degrade gracefully.

⸻

22. Anti-Patterns (Forbidden)

The engine must never become:
	•	semantic summarizer
	•	AI page generator
	•	DOM clone serializer
	•	CSS replay system
	•	visual screenshot parser only

It exists to reconstruct structure, not style or meaning.

⸻

23. Evolution Path

Phase 1:
basic deterministic region reconstruction

Phase 2:
better clustering + stronger boundary recovery

Phase 3:
responsive-aware structural reconstruction

Phase 4:
AI-assisted anomaly resolution on top of deterministic baseline

The deterministic baseline remains mandatory.

⸻

24. Founder Directive

The Structural Reconstruction Engine is the heart of migration fidelity.

If it is weak:
	•	migration becomes summarization
	•	layout parity collapses
	•	trust collapses

If it is strong:
	•	GNR8 can preserve the web before it improves the web

That is the correct order.