GNR8 Canonical Sectionization Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Deterministic projection of structural reconstruction into canonical page sections
Depends On:
	•	GNR8 Layout Graph Spec
	•	GNR8 Structural Reconstruction Engine Spec
	•	GNR8 Canonical Data Model Spec
	•	GNR8 Migration Architecture Blueprint

⸻

1. Purpose

Canonical Sectionization is the process that converts structural region plans into stable canonical sections.

If Structural Reconstruction defines:
→ how the page is structured

Canonical Sectionization defines:
→ how the page is represented in the GNR8 canonical model

This layer ensures:
	•	deterministic section boundaries
	•	stable section ordering
	•	predictable content grouping
	•	safe downstream semantic reconstruction
	•	diffable page representation
	•	runtime-safe renderability

It is the first point where the page becomes an editable entity.

⸻

2. Position in Migration Pipeline

Pipeline:
	1.	Snapshot capture
	2.	DOM parse
	3.	Layout Graph
	4.	Structural Reconstruction
	5.	Canonical Sectionization ← THIS SPEC
	6.	Semantic Reconstruction
	7.	Artifact Build
	8.	Governance Evaluation
	9.	Runtime Projection

Canonical Sectionization is the bridge from:

structural truth → canonical page reality

⸻

3. Core Principle

Canonical sections must reflect structure, not interpretation.

This layer must:
	•	preserve structural boundaries
	•	avoid semantic collapse
	•	avoid speculative grouping
	•	create deterministic section entities

It must not:
	•	optimize content
	•	rewrite layout
	•	infer business meaning
	•	reorder for design quality

⸻

4. Canonical Section Model

Canonical Section is the primary unit of page composition in GNR8.

CanonicalSection {
  id
  type
  structuralIntent
  order
  contentBlocks[]
  layoutStructural
  semanticHints
  sectionConfidence
  anomalies[]
}


⸻

5. Canonical Section Types

Section types are structural, not business-semantic.

Allowed types:
	•	HEADER_NAV
	•	HERO
	•	BODY_SECTION
	•	GALLERY_MEDIA
	•	FORM_CONTACT
	•	FOOTER_LEGAL
	•	UNKNOWN_SECTION

These types represent layout roles.

They do NOT encode:
	•	marketing purpose
	•	content semantics
	•	conversion intent

Those belong to semantic reconstruction.

⸻

6. Section Ordering Rules

Section order must be derived strictly from structural reconstruction.

Rules:
	1.	preserve original top-to-bottom order
	2.	preserve region adjacency
	3.	preserve region hierarchy flattening deterministically
	4.	never reorder based on semantic assumptions

Exception:

If structural anomaly indicates:
	•	mislocated footer
	•	nav embedded mid-page

Then:
	•	emit anomaly
	•	preserve order
	•	do NOT auto-correct

Correction is a later mutation stage.

⸻

7. Section Boundary Rules

Boundaries must be respected whenever structural engine provided clear region plans.

Allowed boundary transformations:
	•	merge identical adjacent structural regions
	•	split region if reconstruction flagged multiple logical spans

Forbidden:
	•	collapse all body into single mega-section
	•	merge nav with hero
	•	merge gallery with contact
	•	merge footer with content
	•	remove region due to low confidence

Low confidence → UNKNOWN_SECTION, not deletion.

⸻

8. Content Block Projection

Each structural region produces content blocks.

ContentBlock {
  id
  blockType
  sourceNodeIds[]
  contentPayload
  layoutSignals
  blockConfidence
}

blockType examples:
	•	TEXT
	•	IMAGE
	•	IMAGE_CLUSTER
	•	LINK_CLUSTER
	•	FORM_FIELD_GROUP
	•	EMBED
	•	UNKNOWN_BLOCK

Sectionization must preserve:
	•	block ordering
	•	block adjacency
	•	block grouping

⸻

9. Structural Metadata Preservation

Each canonical section must carry structural lineage.

layoutStructural {
  intent
  structuralConfidence
  domSpan
  sourceClusterIds
  sourceNodeIds
  groupingMode
}

This is required for:
	•	diff engine
	•	migration diagnostics
	•	governance
	•	operator UX
	•	future AI mutation safety

⸻

10. Confidence Model

Section confidence is derived from structural confidence.

sectionConfidence = f(regionStructuralConfidence, blockIntegrity)

Confidence must be:
	•	deterministic
	•	explainable
	•	stable across runs

Confidence does NOT represent:
	•	business quality
	•	UX quality
	•	design quality

Only structural reliability.

⸻

11. Unknown Section Strategy

When structure is unclear:

→ emit UNKNOWN_SECTION

Never:
	•	drop content
	•	merge into arbitrary neighbor
	•	rewrite as semantic fallback
	•	create legacy mega-section without cause

Unknown sections preserve migration safety.

⸻

12. Collapse Prevention Rules

Canonical Sectionization must explicitly prevent:

Collapse Patterns
	•	full-page collapse into single legacy block
	•	gallery absorption into body
	•	form absorption into text cluster
	•	nav/footer contamination
	•	hero erosion

Detection signals:
	•	density breakpoints
	•	repeated media clusters
	•	form control signatures
	•	utility link signatures
	•	intro dominance patterns

⸻

13. Multi-Region Page Handling

Modern sites often contain:
	•	nested sections
	•	grid regions
	•	interleaved media
	•	layout wrappers

Canonical Sectionization must:
	•	flatten layout hierarchy deterministically
	•	preserve region ordering
	•	preserve grouping signals

It must not attempt:
	•	visual layout reproduction
	•	CSS-driven hierarchy simulation

That is runtime’s responsibility.

⸻

14. Gallery Sectionization Rules

A gallery section is created when:
	•	image density exceeds threshold
	•	images are clustered structurally
	•	repetition pattern exists
	•	layout graph signals visual grouping

Gallery must NOT be created from:
	•	isolated decorative images
	•	logo clusters
	•	icon sets
	•	background fragments

⸻

15. Contact/Form Sectionization Rules

Contact section is created when:
	•	form controls present
	•	contact values detected (phone/email/address)
	•	map/direction links present
	•	utility cluster near page end

Contact must NOT absorb:
	•	legal notices
	•	gallery
	•	services list
	•	hero content

⸻

16. Header/Nav Sectionization Rules

Header/Nav is created when:
	•	repeated navigation links
	•	top-of-page clustering
	•	logo presence
	•	link density dominance

Nav must remain separate even if:
	•	visually embedded in hero
	•	HTML structure is weak

Nav merging is a structural anomaly.

⸻

17. Footer/Legal Sectionization Rules

Footer section is created when:
	•	utility links cluster near document end
	•	legal text density increases
	•	repeated navigation echoes
	•	copyright signals detected

Footer must remain separate from:
	•	contact content
	•	services
	•	hero

⸻

18. Relationship to Semantic Reconstruction

Canonical Sectionization defines:

structural containers

Semantic Reconstruction defines:

meaning within containers

Semantic layer must:
	•	operate inside section boundaries
	•	not destroy canonical structure
	•	propose mutation rather than rewrite

⸻

19. Relationship to Diff Engine

Canonical sections are diff primitives.

Diff Engine compares:
	•	section presence
	•	section order
	•	section type
	•	section confidence
	•	block mutations

Stable sectionization is required for stable diffing.

⸻

20. Relationship to Runtime Engine

Runtime consumes canonical sections to:
	•	project layout
	•	hydrate components
	•	bind assets
	•	apply design tokens
	•	render safely

Runtime must not re-sectionize.

Sectionization is a migration concern, not runtime concern.

⸻

21. Relationship to AI Optimizer

AI Optimizer operates AFTER canonical sectionization.

Optimizer may propose:
	•	split hero
	•	merge sections
	•	reorder sections
	•	add new sections

But must:
	•	reference canonical section IDs
	•	produce diff proposals
	•	respect governance gates

⸻

22. Determinism Requirements

Given:
	•	same snapshot
	•	same layout graph
	•	same structural plan

Canonical Sectionization must produce:
	•	identical sections
	•	identical ordering
	•	identical confidence
	•	identical anomalies

No stochastic grouping allowed.

⸻

23. Performance Requirements

Sectionization must be:
	•	linear or near-linear in DOM size
	•	safe for agency batch migration
	•	independent of browser rendering
	•	safe for edge execution

⸻

24. Failure Model

If sectionization cannot confidently classify regions:
	•	emit UNKNOWN_SECTION
	•	preserve ordering
	•	attach anomaly
	•	continue pipeline

Never:
	•	throw hard failure
	•	drop content
	•	rewrite structure blindly

⸻

25. Founder Directive

Canonical Sectionization is the moment where a page becomes editable reality.

If it is unstable:
	•	migration becomes lossy
	•	diff becomes noisy
	•	AI becomes dangerous

If it is stable:
	•	GNR8 can safely evolve any website

Migration safety depends on this layer.
:::

Naslednji logični dokument (linearno):

GNR8 Semantic Reconstruction Spec

ker zdaj imamo:
	•	Layout Graph
	•	Structural Reconstruction
	•	Canonical Sectionization