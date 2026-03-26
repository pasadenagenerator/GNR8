# GNR8 Migration Command Center Spec

Status: DRAFT
Owner: GNR8 Core Architecture
Scope: Defines the operational control layer for executing, reviewing, approving, and monitoring site migrations at agency scale

Depends On:
- GNR8 Migration Architecture Blueprint
- GNR8 Migration Execution Engine Spec
- GNR8 Migration Governance Spec
- GNR8 Migration Observability Spec
- GNR8 Runtime Engine Spec
- GNR8 Ownership Architecture Spec
- GNR8 Migration Execution Strategy (Founder Level)

---

## 1. Purpose

The Migration Command Center is the operational cockpit of GNR8 migration.

It exists to let an agency:

- intake migration work
- run migration jobs
- inspect outputs
- review governance
- compare source vs migrated result
- approve activation
- monitor runtime readiness
- handle failures and retries
- manage migration throughput across a client portfolio

It is not the migration engine itself.

It is the human + system control layer above the migration engine.

---

## 2. Core Principle

Migration Factory is the engine.

Migration Command Center is the cockpit.

The factory executes.
The command center coordinates, visualizes, prioritizes, approves, and monitors.

This separation is mandatory.

---

## 3. Intended Users

### 3.1 V1 User Model

Initial scope:
- only the internal / home agency uses it

This means V1 may optimize for:
- operational speed
- migration throughput
- internal review workflows
- low-friction tooling for one expert agency team

### 3.2 Future Scope

Later scope:
- multiple external agencies

Therefore V1 architecture must already allow:
- agency scoping
- agency-isolated queues
- agency-specific dashboards
- agency-specific permissions
- future white-label expansion

V1 UI can be internal-first, but data model and permissions must be agency-ready.

---

## 4. Operating Model

The Command Center is a semi-automated migration operations system.

This means:

- the system runs deterministic migration stages automatically
- the system proposes readiness and next actions
- humans review, approve, or retry at key control points
- the system never silently promotes a site into live state without explicit approval

V1 is not auto-first.

V1 is:
AI-assisted, operator-governed migration operations.

---

## 5. Primary Responsibilities

The Command Center must support:

1. Migration intake
2. Migration queue management
3. Single-site execution monitoring
4. Canonical/governance review
5. Compare and confidence review
6. Activation approval
7. Runtime verification
8. Retry / replay / rollback handling
9. Portfolio-level visibility
10. Future batch / stream orchestration

---

## 6. V1 Execution Model

### 6.1 Default Execution Unit

In V1, the primary execution unit is:

One site at a time

The command center should optimize for:
- correctness
- explainability
- confidence
- operator trust

Not raw throughput.

### 6.2 Future Execution Evolution

Later versions may evolve into:
- parallel site streams
- grouped batch migrations
- prioritized queue execution
- wave-based migration campaigns

But V1 must behave like:
- one controlled migration lane per selected site

---

## 7. Core Screens / Operational Views

### 7.1 Migration Intake View

Purpose:
- register a migration target
- define source type
- attach ownership
- define migration priority
- assign operator
- initialize job

Inputs must support:
- URL import
- future ZIP / package import
- source metadata
- target client assignment
- target site type
- notes / risk classification

---

### 7.2 Migration Queue View

Purpose:
- show all pending / active / failed / completed migrations
- allow sorting and filtering
- allow prioritization by:
  - client
  - site
  - risk
  - complexity
  - operator
  - status

The queue is the operational heartbeat of migration.

Required statuses:
- intake pending
- queued
- running
- review required
- activation ready
- activated
- failed
- blocked
- rolled back

---

### 7.3 Migration Job Detail View

Purpose:
- inspect one migration deeply

This is the primary execution view.

Must show:
- source info
- ownership info
- current stage
- execution history
- diagnostics
- artifacts
- canonical summary
- governance summary
- publish readiness
- activation result

This view must feel like:
mission control for one site.

---

### 7.4 Compare Review View

Purpose:
- compare source vs migrated output

Must show:
- source snapshot preview
- migrated preview
- structural region comparison
- mismatch classes
- weak sections
- confidence summary
- governance reasons
- recommended next step

This is one of the highest-value views for trust.

---

### 7.5 Governance Review View

Purpose:
- display gate / policy / enforcement state clearly

Must show:
- page migration gate
- site migration gate
- rollout policy
- enforcement by stage
- reasons
- blocking reasons
- recommended action

This view must answer:
Why can this site move forward or not?

---

### 7.6 Activation View

Purpose:
- approve or execute publish activation

Must show:
- shadow-ready candidate
- artifact identity
- lineage summary
- governance presence
- pointer safety
- previous active lineage
- idempotency status
- activation result

This is the final operational control point before runtime activation.

---

### 7.7 Portfolio View

Purpose:
- show migration progress across many clients/sites

Must show:
- total sites
- migrated count
- failed count
- review-required count
- shadow-ready count
- activated count
- blocked count
- per-client progress
- per-operator progress

This is the management dashboard for the 200-site migration program.

---

## 8. Required User Roles

### 8.1 Migration Operator

Can:
- create migration jobs
- run migrations
- inspect canonical outputs
- inspect diagnostics
- request retries
- escalate issues

### 8.2 Governance Reviewer

Can:
- review migration gates
- review compare results
- approve activation readiness
- reject or block low-confidence outputs

### 8.3 Runtime Operator

Can:
- execute activation
- inspect runtime diagnostics
- perform rollback actions
- monitor post-activation behavior

### 8.4 Agency Admin

Can:
- manage queue priorities
- assign sites/clients/operators
- review portfolio progress
- later review billing and AI usage implications

V1 may collapse some roles into one internal operator role, but the model must remain explicit.

---

## 9. Command Center Data Model Requirements

The Command Center must be built on top of these operational entities:

- agency
- client
- site
- migration job
- migration stage state
- canonical summary
- governance summary
- artifact build summary
- shadow-ready candidate
- activation execution result
- runtime verification result

It must not invent a parallel truth model.

The Command Center consumes the existing migration/runtime system truth.

---

## 10. Operational Lifecycle

The Command Center lifecycle for one site is:

1. Intake
2. Queue
3. Execute migration
4. Review canonical output
5. Review governance
6. Review compare output
7. Approve activation
8. Execute activation
9. Verify runtime
10. Mark stable / done

This lifecycle must be visible and auditable.

---

## 11. Semi-Automation Rules

The Command Center is semi-automated by design.

The system may automatically:
- run deterministic stages
- compute diagnostics
- generate governance outcomes
- propose next actions
- generate activation candidate

The system must NOT automatically:
- approve weak migrations
- activate production without approval
- downgrade governance
- bypass compare review
- hide failures

AI and automation exist to accelerate operators, not replace control.

---

## 12. Failure Handling Model

The Command Center must make failure operationally useful.

Failure states must include:
- stage failure
- governance denial
- integrity failure
- activation refusal
- runtime verification failure
- rollback event

For every failure, the operator must see:
- where it failed
- why it failed
- what evidence exists
- what next action is available

Examples of next actions:
- retry stage
- replay job
- manual review
- request canonical fix
- block site
- postpone activation
- rollback

---

## 13. Observability Requirements

The Command Center must surface:
- migration timeline
- stage durations
- anomalies
- confidence signals
- compare evidence
- gate/policy states
- activation events
- runtime verification results

It must consume observability, not replace it.

Observability remains system truth.
The Command Center is operator visibility.

---

## 14. Command Center Invariants

Hard rules:

1. No migration may be activated without governance visibility
2. No migration may be hidden from queue state
3. No activation may happen without explicit operational record
4. No failure may be silent
5. No compare evidence may be discarded before operator review
6. No site may disappear from portfolio tracking after intake
7. Command Center must remain agency-scoped
8. Runtime serving truth must remain external to the Command Center
9. The Command Center may coordinate, but not override runtime safety
10. The Command Center must remain compatible with future multi-agency expansion

---

## 15. V1 Constraints

V1 intentionally prioritizes:

- one site at a time
- internal agency usage
- semi-automated flow
- deterministic review
- migration confidence over migration speed

This is correct for the first 200-site migration wave.

V1 is not optimized for:
- mass autopilot
- marketplace workflows
- client self-service migration
- multi-agency concurrency

These come later.

---

## 16. Future Evolution

### Phase 2
- batch queue orchestration
- grouped migrations
- anomaly pattern clustering
- operator productivity tooling

### Phase 3
- parallel migration streams
- agency-level benchmarks
- AI-assisted queue prioritization
- portfolio health scoring

### Phase 4
- external agency command centers
- partner operations model
- white-label command center
- cross-tenant template leverage

---

## 17. Founder Directive

The Migration Command Center is where GNR8 becomes operational reality.

If Migration Factory is the engine,
the Command Center is the agency’s cockpit.

It must make migration:
- understandable
- controllable
- scalable
- trustworthy

GNR8 does not win by having a migration engine alone.

GNR8 wins when an agency can migrate 200 sites through one operational system without chaos.