GNR8 V1 Execution Convergence Plan (founder level)

1. Purpose of This Document

This document defines how GNR8 transitions from its current hybrid experimental architecture into a converged, production-ready V1 runtime.

It translates the GNR8 V1 Runtime Architecture Spec into:
	•	concrete execution phases
	•	architectural convergence rules
	•	system cleanup strategy
	•	delivery definition of done

This is a direction-locking document.
From this point forward:

GNR8 development prioritizes convergence over expansion.

⸻

2. Canonical Definition of GNR8 V1

GNR8 V1 is:

An AI-assisted website migration and operating platform for agencies.

It combines:

A) Migration Factory

Systematically ingests existing websites and reconstructs them into a structured, editable runtime.

B) AI Website Platform

Understands, improves, evolves and operates websites through AI-assisted workflows.

This is NOT:
	•	a general website builder
	•	a no-code page editor
	•	a design tool competitor
	•	a multi-product SaaS suite (yet)

It is:

A focused agency operating system centered on websites.

⸻

3. Strategic Convergence Principles

3.1 Convergence Over Innovation

Until V1 is live:
	•	no new experimental subsystems
	•	no parallel runtime paths
	•	no new architectural paradigms

Allowed:
	•	convergence
	•	simplification
	•	hardening
	•	integration

⸻

3.2 Deterministic Spine Is Sacred

The deterministic migration pipeline is:

The backbone of GNR8 V1.

AI layers must wrap around it, not replace it.

⸻

3.3 AI Is a Layer, Not the Foundation

GNR8 is not:

“AI first”.

It is:

deterministic system + AI augmentation.

⸻

3.4 One Canonical Runtime

By V1:

There must exist:
	•	one public site runtime
	•	one site source-of-truth model
	•	one publish path
	•	one preview contract

No dual builder / migration / runtime worlds.

⸻

4. Current State Diagnosis (Reality Snapshot)

GNR8 currently has:

Strong
	•	migration pipeline contracts
	•	preview artifact flow
	•	validation/operator shell
	•	multi-tenant platform substrate
	•	semantic AI modules

Weak / Fragmented
	•	public site runtime definition
	•	site model ownership
	•	publish lifecycle convergence
	•	AI operational loop integration

Legacy Risk
	•	ChaiBuilder runtime dependency
	•	builder_pages as public data source
	•	builder API surface
	•	builder renderer package

⸻

5. Execution Phases

Phase 1 — Convergence Preparation

Goal:

Establish clarity before destructive changes.

Actions
	1.	Define canonical public runtime architecture.
	2.	Define canonical site structured model.
	3.	Define publish artifact contract.
	4.	Audit ChaiBuilder runtime dependencies.
	5.	Freeze fidelity rabbit-hole tasks.
	6.	Freeze new AI module expansion.

Deliverables
	•	Public Runtime Spec
	•	Site Model Spec
	•	Publish Lifecycle Spec
	•	Chai Removal Audit (already underway)

⸻

Phase 2 — Canonical Publish Path

Goal:

Make preview → publish → runtime deterministic and unified.

Must Achieve
	•	Preview artifact = publish artifact base
	•	Publish output independent of builder
	•	Public runtime consumes deterministic output

Build
	•	canonical static/dynamic runtime contract
	•	versioned site runtime bundles
	•	site deployment topology
	•	runtime tenancy isolation model

⸻

Phase 3 — ChaiBuilder Cutover

Goal:

Remove builder as runtime dependency.

Sequence
	1.	Replace public rendering routes.
	2.	Replace builder data source.
	3.	Remove builder APIs.
	4.	Remove builder renderer package.
	5.	Remove builder deps.
	6.	Remove builder env.
	7.	Archive builder DB tables.
	8.	Remove builder domains/projects.

Rule

Builder removal happens only after runtime replacement exists.

⸻

Phase 4 — AI Operational Loop Integration

Goal:

Make AI actionable and safe.

Introduce:

AI lifecycle
	1.	Site semantic analysis
	2.	Proposal generation
	3.	Risk scoring
	4.	Human approval
	5.	Execution
	6.	Measurement

Must exist
	•	proposal audit trail
	•	execution diff visibility
	•	rollback support
	•	deterministic re-runs

AI must operate:

on structured site model, not raw HTML.

⸻

Phase 5 — Agency-Grade Operations

Goal:

Turn system into agency production infrastructure.

Must include
	•	client → site ownership mapping
	•	migration tracking
	•	publish governance
	•	rollback system
	•	audit logs
	•	usage visibility
	•	AI action history
	•	site performance insights

⸻

6. ChaiBuilder Decommission Strategy (Canonical)

ChaiBuilder is classified as:

Legacy transitional runtime.

It is not part of GNR8 V1.

Removal pillars
	1.	Runtime replacement first
	2.	Data migration second
	3.	API removal third
	4.	Infra removal last

Never reverse.

⸻

7. Canonical V1 Runtime Stack Direction

Target runtime model:
	•	Structured site model storage
	•	Deterministic render runtime
	•	Static-first publish strategy
	•	AI transformation layer
	•	Agency control surface
	•	Versioned site evolution

Not:
	•	embedded visual builder runtime
	•	external page JSON renderer dependency

⸻

8. Definition of Done for GNR8 V1

GNR8 V1 is complete when:

Migration
	•	agency can migrate real customer sites safely
	•	migration runs reproducible
	•	preview fidelity acceptable
	•	publish deterministic

AI
	•	system understands site structure
	•	generates useful improvement proposals
	•	executes approved changes safely

Platform
	•	agency can manage multiple clients/sites
	•	publish lifecycle exists
	•	rollback exists
	•	auditability exists

Runtime
	•	public sites run on GNR8 runtime
	•	no builder runtime dependency
	•	no legacy parallel flows

⸻

9. What Is Explicitly NOT in V1
	•	full autopilot AI
	•	design-tool-grade editor
	•	marketplace ecosystem
	•	plugin SDK
	•	multi-product SaaS expansion
	•	internal event bus
	•	advanced workflow engines
	•	visual drag-drop builder replacement

⸻

10. Founder Directive

Until V1 ships:

Every architectural decision must answer:

“Does this increase convergence or fragmentation?”

If fragmentation:

Do not build.