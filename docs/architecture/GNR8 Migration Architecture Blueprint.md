GNR8 Migration Architecture Blueprint

Status: DRAFT
Owner: Gregor Žigon
System Scope: GNR8 Migration Engine
Priority: CORE PLATFORM FOUNDATION

⸻

1. Mission

GNR8 must become:

The most deterministic, scalable and reliable website migration engine in the world.

Before becoming an AI site generator, GNR8 must dominate:
	•	migration fidelity
	•	structural reconstruction
	•	runtime determinism
	•	multi-platform ingestion
	•	artifact-first serving

Migration is not a feature.
Migration is the platform foundation.

⸻

2. Migration Philosophy (Architectural Doctrine)

GNR8 migration is built on 5 non-negotiable principles:

2.1 Structure before styling

The goal of migration is:
	•	reconstruct layout structure
	•	reconstruct content semantics
	•	reconstruct navigation logic

NOT:
	•	copy CSS
	•	copy HTML
	•	copy DOM

CSS replay is a fallback layer, never the core.

⸻

2.2 Determinism before intelligence

The system must always prefer:

Deterministic layout reconstruction
over
AI-guessed layout reconstruction.

AI may enhance — but must never replace deterministic guarantees.

⸻

2.3 Canonical representation as migration target

Migration does NOT target:
	•	HTML
	•	React
	•	Builder schema

Migration targets:

GNR8 Canonical Layout Model (CLM)

All source platforms must map into:
	•	canonical layout tree
	•	canonical semantic content blocks
	•	canonical navigation graph
	•	canonical asset graph

⸻

2.4 Artifact-first runtime

Migrated sites must be served as:

immutable runtime artifacts

Runtime must never depend on:
	•	builders
	•	CMS
	•	editor state
	•	live reconstruction

Migration output must be production-servable.

⸻

2.5 Migration is reconstruction, not scraping

GNR8 is NOT a scraper.

It is:

a layout reconstruction engine.

This implies:
	•	layout inference
	•	semantic grouping
	•	navigation rebuilding
	•	content re-modeling

⸻

3. High-Level Migration Pipeline

Canonical migration lifecycle:
	1.	Intake
	2.	Snapshot capture
	3.	Structural analysis
	4.	Semantic reconstruction
	5.	Canonical modeling
	6.	Artifact build
	7.	Runtime activation

3.1 Intake Layer

Supported inputs:
	•	public URL
	•	builder export
	•	CMS API
	•	HTML bundle
	•	design tool export (future)

Responsibilities:
	•	normalize entry point
	•	determine crawl strategy
	•	detect platform fingerprints
	•	seed migration job

⸻

3.2 Snapshot Layer

Purpose:

Create deterministic source snapshot.

Includes:
	•	DOM snapshot
	•	asset map
	•	navigation crawl graph
	•	style capture hints
	•	platform signal extraction

Snapshot must be:
	•	immutable
	•	versioned
	•	reproducible

⸻

3.3 Structural Analysis Layer

Goal:

Reconstruct layout hierarchy.

Outputs:
	•	section segmentation
	•	grid inference
	•	header/footer detection
	•	navigation zone detection
	•	hero block inference
	•	list/gallery detection

This layer is primarily:

deterministic heuristics + rule engines.

AI may assist classification but must not define structure.

⸻

3.4 Semantic Reconstruction Layer

Transforms raw structure into:
	•	canonical content blocks
	•	content roles (hero, about, services, gallery, contact)
	•	navigation graph
	•	call-to-action semantics

Key responsibilities:
	•	detect repeated layout motifs
	•	detect content density patterns
	•	classify informational vs transactional zones
	•	extract business identity signals

⸻

3.5 Canonical Modeling Layer

Produces:

GNR8 Canonical Layout Model (CLM)

CLM components:
	•	layout tree
	•	semantic block graph
	•	asset dependency graph
	•	navigation model
	•	style token set

This is the single source of truth.

⸻

3.6 Artifact Build Layer

Transforms CLM into:
	•	static HTML artifact
	•	runtime metadata manifest
	•	asset bundle
	•	path resolution map

Artifacts must be:
	•	immutable
	•	versioned
	•	cacheable
	•	edge-servable

⸻

3.7 Runtime Activation Layer

Activation includes:
	•	host binding
	•	active pointer update
	•	artifact coverage validation
	•	publish safety check
	•	runtime readiness verification

Serving model:

Artifact-only
or
Artifact-with-fallback (temporary phase)

⸻

4. Layout Reconstruction Systems

GNR8 uses dual reconstruction engines:

4.1 Deterministic Layout Reconstruction Engine (DLRE)

Primary system.

Responsibilities:
	•	DOM segmentation
	•	layout pattern recognition
	•	structural grouping
	•	navigation inference
	•	responsive structure modeling

Guarantees:
	•	reproducibility
	•	testability
	•	explainability

DLRE defines:

migration stability baseline.

⸻

4.2 AI Semantic Reconstruction Engine (ASRE)

Secondary system.

Responsibilities:
	•	semantic refinement
	•	content intent detection
	•	block labeling enhancement
	•	UX pattern inference
	•	hierarchy optimization

ASRE must:
	•	operate on top of deterministic structure
	•	never override deterministic layout integrity

⸻

5. Asset System Architecture

Assets must be:
	•	normalized
	•	deduplicated
	•	versioned
	•	reachable

Migration asset logic includes:
	•	alias resolution (/assets vs /uploads)
	•	canonical asset key generation
	•	asset dependency linking to blocks
	•	fallback source mapping

Asset failures must never break runtime rendering.

⸻

6. Navigation Reconstruction Model

Navigation is reconstructed via:
	•	link graph clustering
	•	anchor role detection
	•	repetition frequency analysis
	•	visual grouping inference

Navigation output must produce:
	•	primary nav
	•	secondary nav
	•	footer nav
	•	contextual nav

⸻

7. Canonical Style Token System

GNR8 does not copy CSS.

It reconstructs:
	•	color tokens
	•	typography signals
	•	spacing rhythm
	•	visual density level
	•	layout width system

Style tokens are:
	•	semantic
	•	portable
	•	editable
	•	generator-ready

⸻

8. Runtime Determinism Guarantees

Migration runtime must guarantee:
	•	artifact existence
	•	root path coverage
	•	known path coverage
	•	active pointer validity
	•	host binding resolution
	•	fallback observability

Runtime must emit:

structured diagnostic logs for:
	•	artifact_hit
	•	artifact_miss
	•	fallback_hit
	•	fallback_miss
	•	artifact_only_404

⸻

9. Migration Quality Levels

GNR8 defines migration fidelity levels:

Level 1 — Content Survival
Level 2 — Structural Fidelity
Level 3 — Navigational Fidelity
Level 4 — Visual Recognizability
Level 5 — Behavioral Parity

Phase 1 goal:

Achieve Level 4 deterministically.

⸻

10. Evolution Path

Migration roadmap:

Phase 1
Deterministic migration dominance

Phase 2
Hybrid deterministic + AI reconstruction

Phase 3
Full AI-assisted layout optimization

Phase 4
AI site generation built on migration engine

Migration engine remains:

core platform primitive.

⸻

11. Architectural Anti-Patterns (Forbidden)

GNR8 must avoid:
	•	raw HTML persistence
	•	builder runtime dependency
	•	CSS replay as primary strategy
	•	AI-only reconstruction
	•	non-artifact runtime serving
	•	implicit fallback serving without observability

⸻

12. Foundational Principle

GNR8 is not:

a builder
a CMS
a scraper

GNR8 is:

the operating system for website reconstruction.