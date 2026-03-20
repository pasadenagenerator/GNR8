GNR8 Canonical Public Runtime Spec (founder level)

1. Purpose

This document defines:

How websites run on GNR8 in production.

It establishes:
	•	canonical runtime architecture
	•	site delivery model
	•	publish lifecycle
	•	runtime ownership boundaries
	•	relationship between migration, AI and runtime

This spec eliminates:
	•	builder-dependent rendering
	•	preview/runtime divergence
	•	undefined publish semantics

⸻

2. Foundational Principle

GNR8 is not a builder runtime.

GNR8 is:

A structured site execution platform.

Sites are:
	•	modeled
	•	generated
	•	versioned
	•	published
	•	operated

But not rendered via external page JSON builders.

⸻

3. Runtime Philosophy

3.1 Static-first, structured-dynamic capable

Default:
	•	sites are statically delivered

Optional:
	•	structured dynamic blocks (forms, personalization, commerce)

This allows:
	•	deterministic performance
	•	CDN edge delivery
	•	predictable AI execution impact
	•	versioned publishing

⸻

3.2 Runtime must be deterministic

Public runtime must:
	•	not depend on AI
	•	not depend on migration engine
	•	not depend on builder editor
	•	not depend on operator UI

It must be:

Pure site execution layer.

⸻

3.3 Runtime must be reconstructible

Given:
	•	site structured model
	•	asset bundle
	•	runtime version

System must reconstruct full public site.

This enables:
	•	rollback
	•	auditability
	•	AI experimentation
	•	safe evolution

⸻

4. Canonical Site Runtime Model

Each site consists of:

4.1 Structured Site Model

Stored in DB.

Contains:
	•	layout tree
	•	content nodes
	•	asset references
	•	style tokens
	•	semantic annotations
	•	AI metadata
	•	publish config

This replaces:

❌ builder JSON
❌ raw HTML snapshots as source-of-truth

⸻

4.2 Runtime Artifact Bundle

Generated at publish.

Contains:
	•	static HTML pages
	•	compiled CSS
	•	optimized images
	•	runtime JS (minimal)
	•	component runtime mapping
	•	metadata manifest

This is:

Immutable versioned output.

⸻

4.3 Runtime Manifest

Defines:
	•	site version
	•	routing map
	•	dynamic capabilities
	•	asset hash mapping
	•	runtime compatibility version

⸻

5. Public Delivery Architecture

5.1 Delivery Topology

Sites are served via:
	•	CDN edge (primary)
	•	platform runtime fallback

Possible strategies:
	1.	Static export → edge CDN
	2.	Static + runtime hydration
	3.	Structured SSR for dynamic modules

Default for V1:

Static export + minimal runtime hydration.

⸻

5.2 Domain Mapping

Each site has:
	•	primary domain
	•	optional staging domain
	•	preview domains per version

Agency mapping:

org → client → site → domain

⸻

5.3 Multi-tenant Isolation

Isolation must exist at:
	•	asset namespace
	•	routing namespace
	•	storage namespace
	•	publish pipeline

No shared runtime state between sites.

⸻

6. Publish Lifecycle

6.1 Publish Steps
	1.	Site model snapshot created
	2.	Runtime artifact generated
	3.	Validation checks run
	4.	Operator approval (if required)
	5.	Artifact deployed
	6.	CDN cache activated
	7.	Runtime version becomes live

⸻

6.2 Versioning

Every publish creates:
	•	immutable runtime version
	•	diff vs previous
	•	rollback capability

AI execution must produce:

draft versions first.

⸻

6.3 Rollback

Rollback must:
	•	be instant
	•	not require rebuild
	•	not require migration rerun

Rollback simply switches:

runtime pointer → previous version.

⸻

7. Relationship to Migration Factory

Migration produces:
	•	initial structured site model
	•	initial runtime bundle candidate

Migration output is:

Draft site state.

Migration does not publish.

Operator decides:
	•	approve migration
	•	improve via AI
	•	manually adjust
	•	then publish

⸻

8. Relationship to AI Platform

AI operates on:
	•	structured site model
	•	analytics signals
	•	content semantics
	•	performance metrics

AI does NOT:
	•	directly manipulate runtime artifacts
	•	bypass publish lifecycle
	•	auto-deploy without policy

AI creates:
	•	proposals
	•	transformations
	•	evolution drafts

⸻

9. Relationship to Preview System

Preview is:

Runtime artifact in staging mode.

Preview must use:
	•	same runtime engine
	•	same artifact format
	•	same routing logic

Preview is not:
	•	separate render pipeline
	•	builder render
	•	migration HTML dump

⸻

10. Runtime Component System

Runtime components must be:
	•	deterministic
	•	versioned
	•	AI-aware
	•	render-portable

Component categories:
	•	layout primitives
	•	content blocks
	•	media blocks
	•	interaction blocks
	•	dynamic modules

⸻

11. Styling Model

Styles must be:
	•	tokenized
	•	compiled
	•	scoped per site

Migration extracts:
	•	fonts
	•	colors
	•	spacing
	•	layout rhythm

AI evolves:
	•	design system
	•	visual hierarchy
	•	UX improvements

⸻

12. Dynamic Capabilities (V1 Scope)

Allowed:
	•	forms
	•	analytics injection
	•	basic personalization
	•	commerce embeds

Not V1:
	•	full dynamic app runtime
	•	serverless workflows per block
	•	custom JS builder runtime

⸻

13. Runtime Observability

Must support:
	•	performance metrics
	•	version metrics
	•	publish logs
	•	AI action correlation

Agency must see:
	•	what changed
	•	when
	•	why
	•	by whom (human/AI)

⸻

14. ChaiBuilder Compatibility Position

ChaiBuilder is:

Deprecated transitional runtime.

GNR8 runtime must:
	•	fully replace builder rendering
	•	not embed builder JSON
	•	not rely on builder components

Builder data may be:
	•	migrated
	•	archived
	•	transformed

But never:
	•	runtime dependency

⸻

15. Definition of Runtime Completion

Public runtime is complete when:
	•	migration output can publish without builder
	•	AI changes can publish deterministically
	•	preview equals production runtime
	•	rollback is instant
	•	sites run fully on GNR8 runtime

⸻

16. Founder Directive

Public runtime is:

The heart of GNR8.

Without runtime convergence:
	•	AI platform cannot stabilize
	•	migration factory cannot scale
	•	agency trust cannot exist

Runtime is priority above:
	•	AI sophistication
	•	builder features
	•	marketing features
	•	growth features