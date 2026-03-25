# GNR8 Artifact Lifecycle & Storage Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Defines how migration artifacts are created, versioned, stored, promoted, mutated, served, and retired

Depends On:
- GNR8 Migration Architecture Blueprint
- GNR8 Canonical Data Model Spec
- GNR8 Runtime Engine Spec
- GNR8 Diff Engine Spec
- GNR8 Mutation Engine Spec
- GNR8 Migration Governance Spec
- GNR8 Migration Observability Spec

---

## 1. Purpose

Artifacts are the deployable truth of GNR8.

They represent:

- a migrated site state
- a canonical reconstruction snapshot
- a proposal-derived variant
- a mutation-applied version
- a runtime-serving payload

This spec defines:

- artifact lifecycle
- artifact identity
- artifact promotion
- artifact immutability
- artifact storage model
- artifact safety guarantees

Without this layer:

- runtime becomes unstable
- rollback becomes unsafe
- governance cannot enforce truth
- migration history becomes unreliable

Artifacts are the core atomic unit of deployment trust.

---

## 2. Artifact Philosophy

Artifacts must be:

- deterministic
- immutable once promoted
- traceable to canonical data
- environment-aware
- promotion-gated
- rollback-safe
- runtime-resolvable

GNR8 never serves "live mutable content".

It serves artifact snapshots.

---

## 3. Artifact Types

Primary artifact classes:

### Migration Artifact
Output of migration engine

### Shadow Artifact
Migration artifact bound to shadow domain

### Canary Artifact
Shadow-validated artifact promoted to staged rollout

### Production Artifact
Approved artifact serving real traffic

### Proposal Artifact
AI-suggested variant artifact (not serving by default)

### Mutation Artifact
Post-proposal approved mutation result

### Rollback Artifact
Re-activated historical artifact

---

## 4. Artifact Identity Model

Artifacts must have stable, immutable identity.

```md
ArtifactId {
  artifactId
  siteId
  siteVersionId
  artifactType
  artifactHash
  createdAt
}

artifactHash must reflect:
	•	canonical content structure
	•	layout graph influence
	•	mutation lineage
	•	asset mapping state

Hash changes = new artifact.

No in-place mutation.

⸻

5. Artifact Version Hierarchy

Artifacts are not flat.

They belong to version lineage.

Hierarchy:

Site
→ Site Version
→ Artifact Versions

Example:

Site: transportimaver.si
Version: v1-migrated
Artifacts:
	•	A1 shadow
	•	A2 canary
	•	A3 production

Later:

Version: v2-optimized
Artifacts:
	•	A4 proposal
	•	A5 mutation
	•	A6 production

This allows:
	•	historical reasoning
	•	safe experimentation
	•	auditability

⸻

6. Artifact Lifecycle Stages

Artifacts move through deterministic stages.

1. Built

Artifact created but not validated

2. Verified

Integrity checks passed

3. Shadow Bound

Attached to shadow host

4. Shadow Validated

Passed shadow diff + runtime checks

5. Canary Promoted

Eligible for limited traffic

6. Production Promoted

Serving primary domain

7. Deprecated

Replaced but still stored

8. Archived

Cold storage eligible

Lifecycle is strictly forward-moving except rollback activation.

⸻

7. Artifact Immutability Rules

Once artifact reaches:
	•	Canary
	•	Production

It must be immutable.

No patching.

Any change requires:
	•	new artifact build
	•	new identity
	•	new governance evaluation

Immutability ensures:
	•	reproducibility
	•	trust
	•	deterministic runtime

⸻

8. Artifact Build Inputs

Artifact must reference:
	•	canonical page graph
	•	layout graph snapshot reference
	•	semantic reconstruction output
	•	asset resolution map
	•	governance policy snapshot
	•	runtime compatibility schema

Artifact build must not depend on:
	•	live source
	•	mutable external state
	•	non-versioned config

⸻

9. Artifact Structure (Conceptual)

Artifact payload must contain:

ArtifactBundle {
  manifest
  pages[]
  assets[]
  routingMap
  layoutMeta
  canonicalMeta
  buildDiagnostics
}

Manifest must include:
	•	artifactHash
	•	canonicalModelVersion
	•	runtimeCompatibilityVersion
	•	buildTimestamp
	•	governanceStateAtBuild

⸻

10. Routing & Path Coverage

Artifact must declare:
	•	path coverage map
	•	fallback behavior policy
	•	unresolved path warnings
	•	dynamic endpoint compatibility

Artifact cannot be promoted if:
	•	core paths missing
	•	routing ambiguous
	•	canonical mapping inconsistent

⸻

11. Asset Storage Strategy

Assets must be:
	•	deduplicated
	•	content-hashed
	•	environment-independent
	•	proxy-safe
	•	fallback-mappable

Storage layers:

Raw Snapshot Asset Store

Captured from source

Canonical Asset Store

Normalized + deduped

Artifact Asset Bundle

Runtime-resolvable mapping layer

This enables:
	•	stable serving
	•	alias resolution
	•	safe CDN integration

⸻

12. Artifact Storage Layers

GNR8 artifact storage must be multi-tier.

Hot Layer

Active shadow/canary/production artifacts

Warm Layer

Recently deprecated artifacts

Cold Layer

Archived artifacts

Immutable Archive

Legal/compliance retention

Storage must support:
	•	fast lookup by host + path
	•	rollback retrieval
	•	version diff introspection

⸻

13. Artifact Promotion Rules

Promotion must be governed.

Shadow Promotion Requires:
	•	migration gate ≥ SHADOW_READY
	•	enforcement allows shadow
	•	artifact integrity OK

Canary Promotion Requires:
	•	shadow validation success
	•	diff risk acceptable
	•	governance allows canary

Production Promotion Requires:
	•	canary validation success
	•	production candidate gate
	•	no critical anomalies
	•	operator approval (configurable)

Promotion must produce:
	•	promotion event
	•	governance decision record
	•	observability trace

⸻

14. Artifact Rollback Model

Rollback is artifact pointer change.

Never rebuild historical artifact.

Rollback requires:
	•	governance decision
	•	rollback artifact exists
	•	runtime pointer switch
	•	audit record

Rollback must be:
	•	instant
	•	deterministic
	•	reversible

⸻

15. Proposal Artifact Handling

Proposal artifacts are:
	•	fully built artifacts
	•	not bound to runtime host
	•	used for preview + diff
	•	mutation-ready

Proposal artifact lifecycle:

Built → Reviewed → Approved → Mutation → New Artifact

Proposal artifacts must be isolated.

⸻

16. Mutation Artifact Handling

Mutation produces:
	•	new canonical state
	•	new artifact
	•	diff vs previous production artifact

Mutation artifact must:
	•	inherit lineage
	•	record mutation plan reference
	•	store pre/post diff

Mutation never mutates existing artifact.

⸻

17. Artifact Integrity Guarantees

Integrity checks must validate:
	•	canonical graph completeness
	•	routing map correctness
	•	asset resolution
	•	layout meta presence
	•	schema compatibility

Failure results:

Artifact state = INVALID

Cannot be promoted.

⸻

18. Runtime Artifact Resolution Model

Runtime must resolve:

Host → Site → Active Artifact → Path → Page → Content

Artifact resolution must be:
	•	O(1) lookup class
	•	deterministic
	•	environment aware

Runtime must never infer structure.

Artifact contains full truth.

⸻

19. Artifact Observability Hooks

Each artifact stage must emit:
	•	build event
	•	integrity event
	•	promotion event
	•	deprecation event
	•	rollback event

Artifacts must be traceable via:

traceId
artifactId
siteVersionId

⸻

20. Artifact Garbage Collection

Artifacts may be archived when:
	•	deprecated > retention window
	•	no rollback dependency
	•	not referenced by proposal lineage
	•	not part of legal retention

GC must never remove:
	•	production lineage artifacts within retention SLA
	•	artifacts referenced by audit logs

⸻

21. Multi-Environment Strategy

Artifact identity must be environment-agnostic.

Binding must be environment-specific.

Example:

Artifact A1 usable in:
	•	staging
	•	shadow
	•	production

But binding differs:
	•	shadow host
	•	canary domain
	•	production domain

Artifact payload must not encode environment URLs.

⸻

22. Artifact Safety Anti-Patterns (Forbidden)

Do not allow:
	•	in-place artifact edits
	•	environment-specific builds
	•	partial artifact promotion
	•	mutable routing maps
	•	runtime fallback that bypasses artifact
	•	artifact rebuild during rollback

These break migration trust guarantees.

⸻

23. Founder Directive

Artifacts are the legal truth of the migrated site.

Everything else is interpretation.

Migration builds artifacts.
Governance approves artifacts.
Runtime serves artifacts.
AI proposes new artifacts.

The integrity of GNR8 depends on artifact purity.