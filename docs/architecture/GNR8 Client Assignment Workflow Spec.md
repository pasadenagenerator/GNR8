# GNR8 Client Assignment Workflow Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Defines how agencies assign sites to clients, review ownership state, resolve ambiguous ownership, and prepare sites for billing and operational control

Depends On:
- GNR8 Ownership Architecture Spec
- GNR8 Ownership Runtime Binding Spec
- GNR8 Ownership & Billing Data Contract Spec
- GNR8 Migration Command Center Spec
- GNR8 Billing Cost Attribution Model Spec

---

## 1. Purpose

This spec defines the workflow for assigning sites to clients inside GNR8.

It answers:

- how a site gets attached to a client
- how ambiguous ownership is resolved
- how agencies review and correct assignments
- how client assignment affects runtime and billing attribution
- how assignment fits into migration operations

This is not only a UI workflow.

It is the operational mechanism that turns ownership data into usable platform truth.

---

## 2. Core Principle

A migrated site is not operationally complete until client ownership is explicitly resolved.

Canonical rule:

Migration creates runtime lineage.
Client assignment makes that lineage economically and operationally meaningful.

Site ownership must never remain ambiguous once a site is treated as production-ready.

---

## 3. Workflow Philosophy

Client assignment is:

- agency-controlled
- reviewable
- correctable
- auditable
- safe-by-default

It must not be:
- auto-magical when confidence is low
- hidden inside migration logic
- silently mutated after production activation

V1 should optimize for:
- correctness
- operator trust
- low ambiguity
- fast manual resolution

---

## 4. Assignment Targets

Client assignment applies to:

### 4.1 Production Sites
These must always be assigned to exactly one client.

### 4.2 Shadow Sites with known destination
These may be pre-assigned to a target client while remaining operationally agency-owned.

### 4.3 Migration-in-progress sites
These may remain agency-owned until assignment is explicit.

### 4.4 Templates / experimental sites
These must not be client-assigned by default.

---

## 5. Assignment States

Each site must be understood as being in one of these assignment states:

### 5.1 Unassigned
- site exists
- client owner not resolved
- agency remains sole operational owner

### 5.2 Candidate Assigned
- likely client match exists
- assignment confidence exists
- operator review still required

### 5.3 Confirmed Assigned
- site is explicitly assigned to client
- billing attribution can resolve through client
- command center can group by client

### 5.4 Production Locked
- site is live
- client assignment is now authoritative
- changes require explicit transfer workflow

---

## 6. V1 Assignment Workflow

### Step 1 — Site appears in migration/control system
Site is created or backfilled.

### Step 2 — System attempts safe inference
Possible signals:
- known target client from intake
- domain/client match
- one-client-only agency case
- existing project/customer linkage

### Step 3 — Assignment confidence produced
Possible outcomes:
- high confidence
- low confidence
- unresolved

### Step 4 — Operator review
Agency operator confirms:
- client
- site type
- lifecycle state
- billing scope

### Step 5 — Assignment recorded
System stores:
- org_id
- agency_id
- site state
- billing scope
- assignment metadata

### Step 6 — Production lock (when live)
Once site is live, assignment becomes protected and can only change via transfer workflow.

---

## 7. Assignment Inputs / Signals

The workflow may use the following signals:

- migration intake target client
- domain ownership signal
- known customer name / slug match
- existing organization record
- previous runtime lineage
- operator-selected client
- future billing/account relationship

Signals are advisory.
They are not sufficient alone unless confidence is high and ambiguity is low.

---

## 8. Assignment Confidence Model

V1 should classify assignment confidence as:

### HIGH
Examples:
- exactly one matching client
- explicit client selected during intake
- existing site already known to belong to one client

### MEDIUM
Examples:
- name/domain similarity suggests one client
- legacy metadata partially matches

### LOW
Examples:
- multiple plausible clients
- weak naming
- no clear production context

### NONE
No assignment evidence.

V1 rule:
Only HIGH confidence may be auto-suggested strongly.
Everything else should require explicit operator confirmation.

---

## 9. Operator Actions

The workflow must support these operator actions:

- assign client
- change assignment before production lock
- confirm suggested assignment
- reject suggested assignment
- mark as template
- mark as experimental
- mark as agency-owned only
- defer decision
- escalate for review

These actions must be auditable.

---

## 10. Required Data Written by Assignment

When client assignment is confirmed, the system must write or confirm:

- site.org_id
- site.agency_id
- site.status
- site.billing_scope
- assignment timestamp
- assignment actor
- assignment confidence
- assignment source

This does not yet require a separate assignment table, but the event must be traceable.

Future extension may add:
- site_assignment_history

---

## 11. Billing Implications

Client assignment determines:

- client attribution for runtime cost
- client attribution for production AI usage
- cost center resolution
- future invoice/report grouping
- future rebilling logic for agency

Without confirmed assignment:
- production cost attribution is incomplete
- site-level client reporting is unreliable

Therefore:
No production billing truth without client assignment truth.

---

## 12. Runtime Implications

Assignment must not change runtime serving behavior directly.

Runtime still resolves through:
artifact → site version → site

But once a site is client-assigned:
- ownership resolution becomes client-aware
- reporting becomes client-aware
- future policy decisions may become client-aware

Assignment is a data truth enrichment, not a serving mutation.

---

## 13. Command Center Implications

The Migration Command Center must show:

- site assignment state
- suggested client if any
- confidence level
- unresolved ownership flags
- operator action options

Queue filtering must support:
- unassigned sites
- client-assigned sites
- ambiguous ownership cases

This is essential for migrating 200 sites safely.

---

## 14. Production Lock Rule

Once a site is:
- live
- domain-bound
- client-assigned

the assignment becomes production-locked.

Production lock means:
- no casual reassignment
- no silent overwrite
- no automatic reassignment by inference

Any later change must go through:
- ownership transfer workflow
or
- explicit admin override

---

## 15. Edge Cases

### 15.1 No Client Exists Yet
Result:
- site remains agency-owned
- unresolved assignment state
- operator must create/select client later

### 15.2 Multiple Matching Clients
Result:
- no auto-assignment
- explicit operator decision required

### 15.3 Shadow Site for Known Client
Result:
- client may be attached
- site still operationally agency-owned until production activation

### 15.4 Template Accidentally Treated as Production Candidate
Result:
- operator must be able to reclassify to template
- client assignment must be removed/prevented

### 15.5 Client Leaves Agency
Assignment does not simply disappear.
This requires:
- ownership transfer workflow

---

## 16. Required Read Models

The system must support:

### getUnassignedSites()
Returns:
- sites lacking client assignment
- status
- domain
- likely target client if any

### getClientAssignmentCandidates(site_id)
Returns:
- candidate clients
- confidence metadata
- matching reasons

### getSiteAssignmentState(site_id)
Returns:
- current client
- assignment state
- confidence
- production lock status

These may be repositories or service-level read models later.

---

## 17. Invariants

Hard rules:

1. Every live site must belong to exactly one client
2. Templates must not be client-assigned by default
3. Experimental sites default to agency ownership
4. Client assignment must be auditable
5. Production-locked assignments must not be silently changed
6. Ambiguous matches must not auto-assign
7. Assignment must not break runtime lineage
8. Billing attribution must rely on confirmed assignment, not guesses
9. Shadow assignment does not equal production ownership transfer
10. Agency remains operational root throughout assignment workflow

---

## 18. V1 Scope

V1 must support:
- manual assignment
- safe suggestions
- one agency internal usage
- clear unresolved state
- production lock
- command center visibility

V1 does not need yet:
- self-service client assignment
- bulk assignment wizard
- cross-agency transfer UX
- marketplace-linked assignment logic

---

## 19. Future Extensions

Later this workflow may support:
- bulk assignment for migration batches
- AI-assisted ownership suggestion
- CRM/customer import matching
- agency-to-agency transfer
- billing account linking during assignment
- client self-managed provisioning

---

## 20. Founder Directive

A migrated site without client assignment is not operationally complete.

Migration gives the site technical life.
Client assignment gives it business identity.

If GNR8 cannot reliably answer:
“Which client owns this production site?”
then billing, reporting, governance context, and agency operations will remain incomplete.

This workflow makes ownership actionable.