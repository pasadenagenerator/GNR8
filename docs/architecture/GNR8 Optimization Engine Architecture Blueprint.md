# GNR8 Optimization Engine Architecture Blueprint

Status: DRAFT  
Owner: Gregor Žigon  
System Scope: Post-Migration Evolution Layer  
Priority: CORE FUTURE PLATFORM LAYER  

---

## 1. Purpose

This document defines the architecture of the GNR8 Optimization Engine.

The Optimization Engine is the layer that becomes active only after:

1. a website has been migrated into GNR8
2. migration fidelity has been reviewed
3. human stakeholders have approved the migrated baseline

Only then may GNR8 begin proposing and executing controlled improvements.

This document also defines the future relationship between:

- optimization
- controlled redesign
- controlled generation

inside the same canonical system.

---

## 2. Core Principle

GNR8 does not begin as an autonomous website generator.

GNR8 begins as:

> a migration-first safety system.

Only after a migrated site becomes trusted may GNR8 evolve it.

This means:

- migration creates the trusted baseline
- humans approve the trusted baseline
- optimization begins only after trust exists

This is the core architecture doctrine.

---

## 3. Lifecycle Position

The Optimization Engine sits after the Migration Engine.

Lifecycle:

1. Source website exists
2. GNR8 migrates source website
3. GNR8 produces trusted canonical baseline
4. Human review validates baseline
5. Site receives trusted status
6. Optimization Engine may propose changes
7. Human approves selected changes
8. GNR8 executes approved mutation
9. Updated artifact is built and published

This is not autonomous mutation.
This is controlled evolution.

---

## 4. Trusted Baseline Doctrine

Optimization must never operate directly on:

- raw HTML
- source CMS state
- builder schema
- unapproved migration output

Optimization may operate only on:

> trusted canonical site versions

A site becomes optimization-eligible only after:

- migration passes required quality gates
- rollout policy allows trusted baseline
- human operator/admin approves baseline

This state is conceptually:

`MIGRATION_TRUSTED`

---

## 5. Core Architectural Modes

The Optimization Engine must support three modes:

### 5.1 Proposal Mode
AI analyzes the trusted baseline and proposes improvements.

AI may propose:
- layout improvements
- structural changes
- UX improvements
- content restructuring
- visual modernization
- additional sections
- CTA optimization
- information architecture refinement

No change is applied automatically.

### 5.2 Execution Mode
Only approved proposals are transformed into canonical mutations.

Execution produces:
- new canonical page/site version
- diff
- new artifact
- new review candidate

### 5.3 Controlled Generation Mode
GNR8 may generate a new page or a new site version from:

- existing content
- enriched content
- structured business information
- approved design/brand constraints
- existing CGP

But this must still remain:
- canonical
- explainable
- reviewable
- non-autonomous by default

---

## 6. Proposal-Execution Split

This is the central safety pattern.

### Proposal Layer
AI creates:
- recommendation sets
- mutation plans
- redesign candidates
- generated section options
- alternate layouts

These are stored as:

> Optimization Proposal Artifacts

Proposal artifacts are not live state.

### Execution Layer
Approved proposal artifacts are transformed into:

- canonical mutations
- new page versions
- new site versions
- publishable artifacts

This preserves:
- auditability
- rollback safety
- human control
- runtime determinism

---

## 7. Optimization Engine Subsystems

The minimum architecture consists of:

1. Baseline Eligibility Layer
2. Insight Layer
3. Proposal Engine
4. Mutation Engine
5. Diff Engine
6. Review & Approval Layer
7. Artifact Rebuild Layer
8. Rollout Governance Reuse Layer

---

## 8. Baseline Eligibility Layer

### Purpose
Determines whether a site/page is eligible for optimization.

### Inputs
- migration gates
- rollout policy
- enforcement outputs
- trusted baseline status
- operator approval status

### Outputs
- eligible_for_optimization
- eligible_for_generation
- review_required_before_optimization

### Rule
No optimization without trusted baseline.

---

## 9. Insight Layer

### Purpose
Analyzes canonical site data and identifies opportunities.

### Inputs
- canonical layout graph
- semantic graph
- content graph
- asset graph
- style tokens
- navigation graph
- future analytics/performance signals

### Outputs
- insight records
- weakness/opportunity clusters
- optimization candidates

### Example insights
- weak hero clarity
- contact block buried too low
- duplicated navigation
- missing CTA
- weak visual hierarchy
- missing trust signals
- weak mobile density

This layer is observational only.

---

## 10. Proposal Engine

### Purpose
Transforms insights into proposed changes.

### Proposal types
- content proposal
- section proposal
- layout proposal
- navigation proposal
- visual proposal
- CTA proposal
- new-page proposal
- redesign proposal

### Key rule
The Proposal Engine proposes.
It does not mutate live state.

### Proposal artifact must include
- proposalId
- proposalType
- target page/site
- rationale
- expected impact
- canonical diff preview
- human-readable summary
- machine-readable mutation plan
- confidence / safety metadata

---

## 11. Mutation Engine

### Purpose
Apply approved proposal artifacts to canonical site state.

### Mutation types
- update section content
- reorder sections
- insert section
- remove section
- split section
- merge sections
- change style tokens
- update navigation
- generate new page
- generate alternate layout within constraints

### Critical rule
Mutation Engine never edits HTML directly.

It edits:

> canonical graph state only

### Outputs
- new page version
- new site version
- mutation audit record

---

## 12. Diff Engine

### Purpose
Make all optimization proposals and executions explainable.

### Diff categories
- layout diff
- semantic diff
- content diff
- style token diff
- asset diff
- navigation diff
- artifact diff
- future performance diff

### Required outputs
- machine-readable diff
- operator-readable summary
- before/after compare view

This is essential for human approval.

---

## 13. Review & Approval Layer

### Purpose
Ensure humans remain in control.

### Approval actors
- admin
- operator
- agency user
- future client approver

### Approval actions
- approve proposal
- reject proposal
- request alternate proposal
- stage for shadow only
- stage for canary only
- hold for review

### Rule
Nothing from Proposal Mode reaches live runtime without explicit approval.

---

## 14. Artifact Rebuild Layer

### Purpose
Turn approved mutations into publishable output.

### Responsibilities
- rebuild page/site artifact
- rerun migration-quality-like validation where relevant
- regenerate compare evidence
- preserve rollback path
- produce publish candidate

The Optimization Engine must reuse artifact infrastructure already built for migration.

---

## 15. Rollout Governance Reuse Layer

Optimization must not invent its own rollout logic.

It must reuse:

- quality gates
- rollout policy
- staged enforcement
- compare evidence
- operator review UX

This is critical.

Migration governance becomes:
> optimization governance infrastructure

This is one of GNR8’s strongest architecture advantages.

---

## 16. Controlled Generation Mode

GNR8 must eventually be able to generate a new site or page.

But generation must be constrained.

### Controlled generation inputs
- existing migrated content
- enriched content
- business metadata
- approved CGP / brand constraints
- canonical structure constraints
- operator-selected goals

### Controlled generation outputs
- proposal artifact
- generated canonical page/site version
- diffable output
- review candidate

### Generator constraints
The generator must:
- respect brand rules
- respect design system / CGP
- respect business content truth
- stay inside canonical model
- stay reviewable
- never bypass approval by default

### Key distinction
This is not:
- unconstrained AI website generation

This is:
> controlled canonical generation inside governance boundaries

---

## 17. CGP / Brand Constraint Layer

The Optimization Engine and Generator must respect:

- typography constraints
- color system
- logo usage rules
- spacing/density rules
- imagery style rules
- tone/voice rules
- forbidden layout patterns if defined

This becomes a dedicated constraint layer.

AI may propose within those boundaries.

AI may not ignore them.

---

## 18. New Site From Existing Content

One important future mode is:

> generate a new site using existing or expanded content inside current brand system

This means GNR8 can:
- redesign site structure
- create a modern alternative
- propose new content architecture
- improve UX and conversion flow

But it must still use:
- trusted content sources
- approved brand constraints
- proposal/approval flow
- canonical mutation path

This is how GNR8 eventually becomes a safe generator.

---

## 19. Safety Constraints

Non-negotiable rules:

1. No autonomous live mutation by default  
2. No direct HTML mutation  
3. No bypass of canonical model  
4. No bypass of human approval for meaningful changes  
5. No proposal without diff  
6. No execution without audit trail  
7. No generation outside CGP/brand constraints  
8. No runtime serving without artifact rebuild  

---

## 20. Relationship to Migration Engine

Migration Engine and Optimization Engine are separate but connected.

### Migration Engine
- reconstructs the existing site faithfully
- creates trusted baseline

### Optimization Engine
- improves trusted baseline
- proposes better versions
- generates constrained alternatives

Without Migration Engine:
Optimization has no trustworthy starting point.

Without Optimization Engine:
Migration remains only preservation.

Together they create:
> website evolution infrastructure

---

## 21. Evolution Path

### Phase A
Migration-First Safety System

### Phase B
Human Validation Layer

### Phase C
Semi-Autonomous Optimizer
- AI proposes
- humans approve
- GNR8 executes

### Phase D
Controlled Generator
- generate new pages/sites from trusted content and brand constraints
- still human-approved

### Phase E
Future selective autonomy
Only if governance, auditability, and trust are strong enough

---

## 22. Product Identity Implication

This architecture means GNR8 is not:

- just a migration tool
- just an AI builder
- just a redesign assistant

GNR8 becomes:

> a controlled website evolution platform

This is the correct long-term identity.

---

## 23. Founder Directive

The Optimization Engine must never weaken the trust created by the Migration Engine.

Migration creates trust.
Optimization must preserve trust.
Generation must inherit trust.

If this order is broken:
- GNR8 becomes another AI toy

If this order is preserved:
- GNR8 becomes a category-defining platform