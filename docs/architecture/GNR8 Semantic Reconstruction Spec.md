GNR8 Semantic Reconstruction Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Deterministic semantic interpretation of canonical sections
Depends On:
	•	GNR8 Layout Graph Spec
	•	GNR8 Structural Reconstruction Engine Spec
	•	GNR8 Canonical Sectionization Spec
	•	GNR8 Canonical Data Model Spec

⸻

1. Purpose

Semantic Reconstruction transforms structurally valid canonical sections into meaning-aware content structures.

If Structural Reconstruction defines:
→ where content lives

Semantic Reconstruction defines:
→ what that content represents

This layer enables:
	•	meaningful section labeling
	•	UX intent inference
	•	content grouping
	•	future AI optimization
	•	human review clarity
	•	mutation safety

This is NOT design generation.
This is NOT marketing interpretation.
This is controlled meaning extraction.

⸻

2. Position in Migration Pipeline

Pipeline:
	1.	Snapshot
	2.	Layout Graph
	3.	Structural Reconstruction
	4.	Canonical Sectionization
	5.	Semantic Reconstruction ← THIS SPEC
	6.	Artifact Build
	7.	Governance
	8.	Runtime

Semantic Reconstruction operates on stable canonical sections.

It must never modify structure.

⸻

3. Core Principle

Semantics must be inferred, never imposed.

Rules:
	•	structure is truth
	•	semantics is interpretation
	•	interpretation must be reversible
	•	interpretation must be explainable
	•	interpretation must be confidence-scored

⸻

4. Semantic Layer Responsibilities

Semantic Reconstruction is responsible for:
	•	section semantic role inference
	•	content intent detection
	•	content clustering
	•	hierarchy reconstruction
	•	UX flow inference
	•	content normalization
	•	semantic anomaly detection

It is NOT responsible for:
	•	layout redesign
	•	visual styling
	•	content rewriting
	•	business optimization
	•	marketing improvements

⸻

5. Semantic Section Roles

Canonical sections gain semantic roles:

SemanticRole =
  PRIMARY_HERO
  SECONDARY_HERO
  ABOUT_SECTION
  SERVICES_SECTION
  PRODUCT_SECTION
  GALLERY_SECTION
  TESTIMONIAL_SECTION
  CONTACT_SECTION
  FORM_SECTION
  NAVIGATION_SECTION
  FOOTER_SECTION
  LEGAL_SECTION
  UNKNOWN_ROLE

These roles are inferred from signals, not fixed.

⸻

6. Semantic Signals

Signals used for semantic inference:

Textual Signals
	•	heading patterns
	•	keyword clusters
	•	sentence intent
	•	CTA language
	•	descriptive density

Structural Signals
	•	section position
	•	section size
	•	block density
	•	media clustering
	•	form presence

Link Signals
	•	tel/mailto/maps
	•	navigation anchors
	•	CTA links
	•	external authority links

Media Signals
	•	hero-scale imagery
	•	gallery repetition
	•	icon clusters
	•	logo presence

Behavioral Signals (future)
	•	analytics patterns
	•	conversion signals
	•	heatmap signals

⸻

7. Semantic Confidence Model

Each section receives:

semanticConfidence = f(signalAgreement, signalStrength, structuralCompatibility)

Confidence ranges:
	•	STRONG
	•	ACCEPTABLE
	•	WEAK
	•	AMBIGUOUS

Weak semantics must NOT rewrite structure.

⸻

8. Hierarchy Reconstruction

Semantic Reconstruction may infer:
	•	headline hierarchy
	•	content grouping
	•	narrative sequence
	•	conversion flow

But must preserve:
	•	canonical section boundaries
	•	original ordering

Hierarchy is metadata, not structure.

⸻

9. Content Clustering

Content may be clustered into semantic blocks:

Example:
	•	services list cluster
	•	feature comparison cluster
	•	testimonial group
	•	FAQ cluster

Clustering rules:
	•	deterministic grouping
	•	explainable grouping
	•	reversible grouping

No probabilistic content merging.

⸻

10. Hero Interpretation

Hero detection is high-impact.

Hero signals:
	•	first major heading
	•	high visual density
	•	intro narrative language
	•	CTA proximity
	•	layout prominence

Hero errors must be flagged.

Misinterpreting hero damages migration trust.

⸻

11. Contact Interpretation

Contact sections are detected via:
	•	phone/email/address clusters
	•	map/directions signals
	•	form fields
	•	utility language

Contact must not absorb:
	•	legal
	•	nav
	•	services
	•	gallery

Contact contamination is a common migration failure.

⸻

12. Services / Product Detection

Service detection uses:
	•	repeated benefit patterns
	•	capability language
	•	bullet lists
	•	grid-like structures

Product detection uses:
	•	price signals
	•	SKU-like text
	•	specification density
	•	comparison patterns

Misclassification must lower confidence.

⸻

13. Legal Interpretation

Legal sections include:
	•	privacy
	•	terms
	•	disclaimers
	•	policy language
	•	copyright

Legal must not be treated as content.

Legal misclassification causes UX corruption.

⸻

14. Semantic Anomalies

Examples:
	•	nav interpreted as hero
	•	footer interpreted as body
	•	gallery interpreted as services
	•	CTA interpreted as legal
	•	multilingual blending confusion

All anomalies must be recorded.

⸻

15. Relationship to AI Optimizer

Semantic Reconstruction provides:
	•	baseline understanding
	•	safe mutation context
	•	redesign candidate signals

AI Optimizer must:
	•	consume semantic layer
	•	not bypass it
	•	propose diffs, not rewrites

⸻

16. Relationship to Diff Engine

Semantic diffs include:
	•	role change
	•	hierarchy change
	•	clustering change
	•	content intent change

Semantic diff must be explainable.

⸻

17. Relationship to Governance

Governance uses semantic signals to:
	•	detect risky migrations
	•	prioritize operator review
	•	flag structural-semantic conflicts

Example:

High structural confidence + low semantic confidence → REVIEW_REQUIRED.

⸻

18. Determinism Requirement

Given same:
	•	canonical sections
	•	content snapshot

Semantic Reconstruction must output identical:
	•	roles
	•	clusters
	•	confidence
	•	anomalies

No LLM stochasticity allowed in migration phase.

⸻

19. Performance Constraints

Semantic reconstruction must be:
	•	fast (batch migration safe)
	•	explainable
	•	incremental
	•	stateless
	•	deterministic

⸻

20. Failure Model

If semantic inference fails:
	•	assign UNKNOWN_ROLE
	•	attach anomaly
	•	preserve structure
	•	continue pipeline

Never:
	•	rewrite structure
	•	drop content
	•	invent roles blindly

⸻

21. Founder Directive

Semantic Reconstruction is where GNR8 starts to understand a website.

But understanding must never destroy truth.

Migration trust is built on:

structure first
meaning second
optimization last

GNR8 must respect that order.