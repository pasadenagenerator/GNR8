# GNR8 Ownership Runtime Binding Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Defines how ownership entities (agency, client, site) bind to runtime lineage (site versions, artifacts, host bindings, migration jobs, publish activation)

Depends On:
- GNR8 Ownership Architecture Spec
- GNR8 Runtime Engine Spec
- GNR8 Migration Execution Engine Spec
- GNR8 Migration Governance Spec
- GNR8 Hybrid Billing & AI Metering Spec
- 20260326_ownership_foundation.sql

---

## 1. Purpose

This spec defines how ownership becomes runtime reality inside GNR8.

It answers:

- how agency / client / site ownership attaches to runtime objects
- how migration jobs know who they belong to
- how site versions inherit ownership
- how artifacts inherit ownership
- how host bindings resolve ownership
- how publish activation preserves ownership lineage
- how billing attribution later attaches to real runtime objects

This is the bridge between:
business ownership model
and
runtime execution model.

---

## 2. Core Principle

Ownership must bind to runtime through Site.

Canonical rule:

Agency
→ Client
→ Site
→ Site Version
→ Artifact
→ Host Binding

Site is the ownership anchor.

Site Version, Artifact, and Host Binding never invent independent ownership.
They inherit.

---

## 3. Runtime Ownership Anchor

### 3.1 Site is the Primary Runtime Ownership Unit

The Site entity is the single ownership anchor for runtime.

All runtime lineage must eventually resolve back to:

- agency_id
- client owner (org_id for production sites)
- site status
- site type
- billing scope

### 3.2 Why Site is the Anchor

This prevents:
- artifact-level ownership drift
- host-binding ambiguity
- billing misattribution
- migration/runtime separation bugs

Every runtime object must be traceable back to exactly one Site.

---

## 4. Ownership Binding by Lifecycle

### 4.1 Experimental Site

Ownership:
- agency-owned
- not client-owned
- not domain-authoritative

Runtime implications:
- may produce site versions
- may produce artifacts
- may be previewable
- must never be mistaken for client production

### 4.2 Migration / Shadow Site

Ownership:
- agency-owned operationally
- client-associated logically if target client exists
- still not client production

Runtime implications:
- may produce shadow artifact
- may bind to shadow host
- publish stage = shadow
- ownership must remain agency-scoped until production activation policy says otherwise

### 4.3 Production Site

Ownership:
- client-owned
- domain-authoritative
- billing-attributed to client/site, payer agency by default

Runtime implications:
- active production host binding
- production runtime identity
- artifact serves as client asset
- ownership immutable unless transfer workflow executes

---

## 5. Site Version Ownership Binding

### 5.1 Rule

Every Site Version must bind to exactly one Site.

This binding must be explicit.

Recommended field:
- ownership_site_id

This is the runtime-safe ownership linkage.

### 5.2 Inheritance

Site Version inherits from Site:
- agency_id
- client ownership context
- billing scope
- site lifecycle state

Site Version must not override ownership independently.

### 5.3 Lifecycle Interpretation

If Site Version belongs to:
- experimental site → agency-owned runtime candidate
- shadow site → agency-owned activation candidate
- production site → client-owned production lineage

---

## 6. Artifact Ownership Binding

### 6.1 Rule

Every Artifact must inherit ownership from Site Version.

Artifact must never be an ownership root.

### 6.2 Required Resolved Ownership Context

Artifact resolution must always be able to infer:
- site_id
- site_version_id
- agency_id
- client org context if production
- publish stage
- governance metadata

### 6.3 Governance Interaction

Ownership does not replace governance.

An Artifact can be:
- correctly owned
- but still denied by governance

Ownership and governance are orthogonal but both required.

---

## 7. Host Binding Ownership Resolution

### 7.1 Rule

Host binding must resolve through:

Host
→ Active Pointer
→ Artifact
→ Site Version
→ Site
→ Ownership Context

Host binding must not be used as ownership source of truth.

### 7.2 Shadow Hosts

Shadow hosts resolve to:
- agency operational ownership
- target client association if known
- non-production commercial state

### 7.3 Production Hosts

Production hosts resolve to:
- client-owned production site
- agency payer/operator context
- production runtime contract

---

## 8. Migration Job Ownership Binding

### 8.1 Rule

Every Migration Job must bind to:
- agency_id (required)
- site_id (nullable initially, required after assignment)
- migration_owner_type

### 8.2 Early Intake Case

At intake time:
- site may not exist yet
- client may not yet be assigned
- migration still belongs to agency

This is valid.

### 8.3 Post-Assignment Case

Once migration target is established:
- migration job must attach to Site
- all downstream outputs should inherit ownership context

### 8.4 Why This Matters

Without this binding:
- migration cost attribution breaks
- queue ownership breaks
- command center scoping breaks
- publish responsibility becomes ambiguous

---

## 9. Publish Activation Ownership Rules

### 9.1 Activation Does Not Create Ownership

Activation promotes runtime lineage.
It does not invent new ownership.

Ownership must already be correctly bound through:
Site → Site Version → Artifact

### 9.2 Shadow Activation

Shadow activation is still:
- agency-owned operational state
- not final production ownership transfer

### 9.3 Production Activation

Production activation means:
- runtime now represents client-owned production site
- host binding is client-facing
- billing attribution may now attach to client/site
- agency remains payer/operator by default

### 9.4 Safe No-Op

If activation is re-run and candidate is already active:
- ownership must remain stable
- no ownership mutation occurs
- SAFE_NOOP semantics apply

---

## 10. Ownership Transfer Semantics

### 10.1 Transfer Scope

Ownership transfer must always be a Site-level event.

Never:
- artifact-only transfer
- host-only transfer
- site-version-only transfer

### 10.2 Transfer Propagation

When Site ownership transfers:
- future site versions inherit new ownership
- future artifacts inherit new ownership
- active host bindings resolve through new ownership
- history must preserve prior lineage for audit

### 10.3 Agency Transfer

Agency transfer of a client/site must not rewrite historical runtime identity destructively.
It must preserve lineage and billing auditability.

---

## 11. Billing Attribution Binding

### 11.1 Ownership as Billing Anchor

Billing later attaches to runtime through Site ownership.

Billing attribution path:

AI / runtime / migration event
→ artifact or operation
→ site version
→ site
→ client
→ agency payer

### 11.2 Why Runtime Binding Must Exist First

Without runtime ownership binding:
- site cost attribution is unreliable
- client billing reports are unreliable
- agency margin analytics are unreliable
- usage metering cannot be trusted

This is why ownership runtime binding precedes billing implementation.

---

## 12. Command Center Implications

The Migration Command Center must display ownership context on every migration object:

- agency
- client (if assigned)
- site
- lifecycle type
- shadow vs production context
- payer context later

This enables:
- operator clarity
- queue filtering
- portfolio scoping
- migration accountability

---

## 13. Required Runtime Queries / Read Models

The system needs read models that can resolve:

### 13.1 Site Runtime Ownership View
Given site_id:
- agency
- client
- lifecycle
- billing scope

### 13.2 Site Version Ownership View
Given site_version_id:
- site
- agency
- client
- publish stage

### 13.3 Artifact Ownership View
Given artifact_id:
- site_version
- site
- agency
- client
- host bindings if any

### 13.4 Migration Job Ownership View
Given migration_job_id:
- agency
- site if assigned
- target client if assigned
- lifecycle phase

These may be repositories, SQL views, or application read models later.

---

## 14. Invariants

Hard rules:

1. Site is the ownership anchor for runtime
2. Site Version must bind to exactly one Site
3. Artifact must inherit ownership from Site Version
4. Host binding must resolve ownership through runtime lineage, not directly
5. Migration Job must always belong to an Agency
6. Shadow activation never implies production ownership
7. Production activation never invents ownership
8. Ownership transfer is always Site-level
9. Billing attribution must follow ownership lineage
10. No runtime object may exist in ownership ambiguity once activated

---

## 15. V1 Scope

V1 must support:
- single agency internal operation
- client assignment
- site ownership binding
- shadow vs production ownership distinction
- migration job agency binding
- future-ready billing attachment

V1 does not need yet:
- cross-agency transfer UX
- client self-management UX
- complex ownership delegation graphs
- marketplace ownership settlement

---

## 16. Future Extensions

Later this model may support:
- agency-to-agency site transfer workflows
- client self-managed production tenancy
- marketplace-owned templates
- shared co-managed sites
- direct client billing mode
- ownership-aware AI autonomy policies

But these are extensions, not V1 requirements.

---

## 17. Founder Directive

Ownership must not remain conceptual.

Ownership must become runtime truth.

If runtime cannot answer:
“Which agency and which client does this site belong to?”
then billing, governance, migration operations, and platform trust will fail.

This spec makes ownership executable.