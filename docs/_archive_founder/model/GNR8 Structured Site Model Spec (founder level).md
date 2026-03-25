GNR8 Structured Site Model Spec (founder level)

1. Purpose

This document defines:

The canonical internal representation of every website inside GNR8.

This model is the single source of truth for:
	•	Migration output
	•	AI transformations
	•	Manual edits
	•	Publish pipeline
	•	Runtime generation

This replaces:

❌ Builder JSON
❌ Raw HTML snapshots as authoritative state
❌ Ad-hoc content blobs
❌ Runtime-derived page state

⸻

2. Core Principle

A website in GNR8 is:

A structured, semantic, versioned system — not a collection of pages.

The model must be:
	•	deterministic
	•	evolvable
	•	AI-readable
	•	publishable
	•	auditable
	•	diffable

⸻

3. Model Hierarchy

Canonical hierarchy:

Organization
  → Client
    → Site
      → Site Version
        → Page
          → Layout Tree
            → Nodes (Blocks)
              → Content
              → Assets
              → Styles
              → Semantics


⸻

4. Site Entity

Represents:
	•	brand instance
	•	domain ownership
	•	design system scope
	•	analytics boundary
	•	AI learning boundary

Contains:
	•	org_id
	•	client_id
	•	site_id
	•	primary_domain
	•	staging_domain
	•	design_system_id
	•	current_version_id
	•	runtime_config
	•	ai_profile

⸻

5. Site Version

Immutable snapshot.

Represents:

A publishable or draft state.

Contains:
	•	version_id
	•	parent_version_id
	•	created_by (human/AI/migration)
	•	creation_reason
	•	diff_summary
	•	status:
	•	draft
	•	candidate
	•	published
	•	archived
	•	runtime_artifact_pointer
	•	validation_status

⸻

6. Page Model

Each page is:

A semantic layout graph.

Contains:
	•	page_id
	•	route
	•	page_type
	•	layout_root_node_id
	•	SEO metadata
	•	page_ai_annotations
	•	page_metrics_snapshot

⸻

7. Layout Tree

Layout is:

A hierarchical composition of semantic blocks.

Node properties:
	•	node_id
	•	parent_node_id
	•	node_type
	•	node_variant
	•	layout_constraints
	•	responsive_rules
	•	visibility_rules

This allows:
	•	deterministic render
	•	AI layout reasoning
	•	responsive regeneration

⸻

8. Block Types

Core categories:

8.1 Layout primitives
	•	section
	•	container
	•	grid
	•	column
	•	stack
	•	spacer

8.2 Content blocks
	•	text
	•	heading
	•	list
	•	rich content
	•	testimonial
	•	pricing
	•	faq

8.3 Media blocks
	•	image
	•	gallery
	•	video
	•	background media

8.4 Interaction blocks
	•	button
	•	form
	•	navigation
	•	accordion
	•	modal trigger

8.5 Dynamic modules (V1 limited)
	•	analytics embed
	•	commerce embed
	•	personalization container

⸻

9. Content Model

Content is:
	•	structured
	•	typed
	•	locale-aware

Example:

content:
  title: string
  body: rich_text
  cta_label: string
  cta_url: url

AI must never operate on:

❌ raw HTML blobs
Always on structured content fields.

⸻

10. Asset Model

Assets are:
	•	deduplicated
	•	fingerprinted
	•	scoped per site

Asset properties:
	•	asset_id
	•	asset_type
	•	source_origin (migration/upload/AI)
	•	variants
	•	usage_references
	•	optimization_metadata

⸻

11. Style System Model

Design system is:

Token-based.

Contains:

11.1 Brand tokens
	•	colors
	•	typography
	•	spacing
	•	radius
	•	shadows

11.2 Component tokens
	•	button styles
	•	card styles
	•	section presets

11.3 Layout rhythm
	•	vertical spacing system
	•	grid behavior

Migration extracts baseline.

AI evolves system.

⸻

12. Semantic Layer

This is critical.

Every site stores:
	•	industry classification
	•	business model signals
	•	conversion goals
	•	content tone profile
	•	UX maturity score
	•	growth hypotheses

This powers:
	•	AI optimization
	•	autopilot decisions
	•	benchmarking

⸻

13. AI Metadata

Each node/page/site can store:
	•	ai_confidence
	•	ai_origin
	•	last_ai_change_reason
	•	performance_impact_estimate
	•	experiment_id

This enables:
	•	explainable AI evolution
	•	rollback reasoning
	•	agency trust

⸻

14. Analytics Coupling

Model must accept:
	•	performance signals
	•	conversion signals
	•	engagement signals

These update:
	•	semantic layer
	•	AI decision engine
	•	layout optimization scoring

⸻

15. Migration Output Contract

Migration must output:
	•	structured layout tree
	•	content extraction
	•	asset registry
	•	initial style tokens
	•	semantic guess
	•	confidence score

Migration never outputs:

❌ runtime HTML as final state
❌ builder JSON
❌ static site as canonical model

⸻

16. Publish Contract

Publish consumes:
	•	site version model
	•	asset graph
	•	design tokens
	•	routing map

Outputs:

→ runtime artifact bundle

Model remains authoritative.

⸻

17. Manual Editing Philosophy

Human editing modifies:
	•	structured model

Never:

❌ runtime artifact
❌ raw HTML

⸻

18. Diff Model

System must support:
	•	structural diff
	•	content diff
	•	style diff
	•	semantic diff

This is key for:
	•	approvals
	•	AI trust
	•	audit logs

⸻

19. Multi-site Learning

Future capability:

AI can learn patterns across sites:
	•	anonymized
	•	tokenized
	•	benchmarked

But:

Site model remains isolated.

⸻

20. Definition of Model Completion

Structured model is complete when:
	•	any site can be fully reconstructed
	•	AI can reason without HTML
	•	runtime can be generated deterministically
	•	migration always outputs model
	•	publish always consumes model

⸻

21. Founder Directive

Structured Site Model is:

The foundation of GNR8 intelligence.

Without it:
	•	AI becomes prompt-toy
	•	migration becomes scraper
	•	runtime becomes fragile
	•	platform becomes builder clone

With it:

GNR8 becomes:

Website operating system.