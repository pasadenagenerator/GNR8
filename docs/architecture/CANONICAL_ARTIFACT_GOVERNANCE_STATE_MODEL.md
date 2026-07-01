# Canonical Artifact Governance State Model

## Phase And Boundary

Phase DA-2 defines the canonical governance lifecycle shared by all business
artifacts in GNR8.

This phase is documentation and architecture only. It adds no implementation,
TypeScript, schema, persistence, API, UI, workers, prompts, provider adapters,
AI integration, generation, publishing, runtime behavior, or deployment
behavior.

Every canonical artifact has a governance state.

The governance state is independent of implementation.

It represents business maturity and governance readiness.

## Canonical Definition

"A deterministic business governance lifecycle describing the maturity and
approval status of a canonical artifact."

Governance State is the canonical business state of a canonical artifact
version. It records whether that artifact has merely been observed, drafted,
reviewed, aligned, approved, superseded, archived, rejected, or blocked for
business governance purposes.

Governance State belongs to the artifact as a business object. It does not
belong to a provider, UI, workflow runner, generation job, publishing system,
schema, API route, prompt, adapter, worker, or runtime implementation.

## What Is A Governance State?

A Governance State is the deterministic maturity marker for a canonical
artifact.

It answers:

- how mature the artifact is;
- whether the artifact has been reviewed;
- whether the artifact is aligned with business understanding;
- whether the artifact is approved for the next governed decision;
- whether the artifact has been superseded by a later artifact;
- whether the artifact is archived;
- whether the artifact was rejected;
- whether the artifact is blocked from progression.

Governance State is business-facing. It describes governance readiness, not
technical execution.

## Difference From Workflow

Governance State is not a workflow.

A workflow describes task execution, operational routing, queue mechanics,
automation steps, or process movement. A workflow may be linear, timed,
assigned, retried, paused, resumed, or executed by software.

Governance State describes the business maturity of an artifact. It can be
updated only through a governed decision and the required authorization path.
It does not execute tasks, run jobs, move queues, route UI screens, call
providers, generate artifacts, validate code, or publish outputs.

The important question is not "what task runs next?" The important question is
"what is the governed maturity and approval status of this artifact?"

## Difference From Authorization

Governance State is not authorization.

Authorization decides whether a business decision may create, revise,
supersede, or progress a canonical artifact.

Governance State records the artifact's maturity after the authorized business
decision has affected it.

Authorization is the permission and prerequisite layer. Governance State is
the artifact maturity layer. A decision authorizes a transition. The
Governance State records the result of that transition.

## Difference From Access Control

Governance State is not authorization in the access-control sense.

Access control answers whether a user, role, system, token, route, session, or
credential is allowed to perform an operation.

Governance State answers whether a canonical artifact is observed, drafted,
reviewed, aligned, approved, superseded, archived, rejected, or blocked as a
business artifact.

Access control may protect the action surface. It does not define business
maturity. A technically authorized user still may not move an artifact through
an illegal governance transition.

## Canonical States

The canonical Governance States are:

- Observed
- Draft
- Reviewed
- Aligned
- Approved
- Superseded
- Archived
- Rejected
- Blocked

### Observed

Observed means the artifact or artifact-relevant business evidence has been
identified, captured, imported, discovered, or otherwise recognized as
potentially relevant.

Observed does not mean the artifact is accepted, reviewed, aligned, approved,
or ready for downstream decisions. It is the earliest governance state for
evidence-backed awareness.

### Draft

Draft means the artifact is being formed as a business artifact but has not
yet passed formal review.

Draft artifacts may be incomplete, proposed, provisional, or awaiting human
clarification. Draft is not approval and does not authorize downstream
progression by itself.

### Reviewed

Reviewed means the artifact has been inspected by the appropriate business
authority or delegated reviewer and is ready for an alignment decision.

Reviewed does not mean the artifact is approved. It means the artifact has
been seen, assessed, and made eligible for the next governance decision.

### Aligned

Aligned means the artifact is consistent with the current governed business
understanding, intent, lineage, confidence, and known limitations.

Aligned artifacts may become prerequisites for approval, generation readiness,
compliance review, or later governed decisions depending on the artifact
family.

### Approved

Approved means the artifact has been accepted by the authorized business
decision maker for its intended governance purpose.

Approved artifacts may support downstream governed decisions. Approval accepts
the business meaning and readiness of the artifact, not implementation
technology.

### Superseded

Superseded means a later authorized artifact version has replaced this artifact
for future governance progression.

Superseded artifacts remain immutable and historically valid as lineage. They
are no longer the active artifact for the next decision path.

### Archived

Archived means the artifact is retained for history, audit, lineage, or
reference and is no longer active in the current governance path.

Archived artifacts do not authorize new downstream progression. A later
business decision may reference them as history, but not as active approval.

### Rejected

Rejected means the artifact was explicitly not accepted for its intended
business purpose.

Rejected artifacts remain part of lineage. Rejection does not delete the
artifact. Further progress requires a new authorized artifact version,
correction, renewed discovery, or another legal return path.

### Blocked

Blocked means the artifact cannot legally progress because required evidence,
lineage, confidence, alignment, authority, prerequisite artifacts, or
predecessor decisions are missing or unresolved.

Blocked is a governance readiness state. It does not imply runtime failure,
provider failure, UI failure, job failure, or implementation error.

## State Transition Rules

Governance transitions are legal only when an explicit governed business
decision authorizes the transition and all required prerequisites are present.

The canonical forward progression is:

```text
Observed
-> Reviewed
-> Aligned
-> Approved
-> Superseded
-> Archived
```

The canonical draft progression is:

```text
Observed
-> Draft
-> Reviewed
-> Aligned
-> Approved
-> Superseded
-> Archived
```

The canonical rejection progression is:

```text
Observed
-> Draft
-> Reviewed
-> Rejected
-> Archived
```

The canonical blocked progression is:

```text
Observed
-> Blocked
-> Reviewed
```

or:

```text
Draft
-> Blocked
-> Draft
-> Reviewed
```

Blocked may also return to the last valid pre-block state when the missing
prerequisite is resolved by an authorized decision.

## Legal Transitions

Legal transitions are:

- Observed -> Draft
- Observed -> Reviewed
- Observed -> Blocked
- Observed -> Rejected
- Draft -> Reviewed
- Draft -> Blocked
- Draft -> Rejected
- Reviewed -> Aligned
- Reviewed -> Draft
- Reviewed -> Blocked
- Reviewed -> Rejected
- Aligned -> Approved
- Aligned -> Reviewed
- Aligned -> Blocked
- Aligned -> Rejected
- Approved -> Superseded
- Approved -> Archived
- Approved -> Reviewed
- Superseded -> Archived
- Rejected -> Archived
- Blocked -> Observed
- Blocked -> Draft
- Blocked -> Reviewed

Any transition not listed here is illegal unless a later canonical
architecture phase explicitly adds it.

## Return To Review

Return To Review is a legal transition pattern, not a canonical state.

Return To Review sends an artifact back from Aligned or Approved to Reviewed
when a governed decision determines that new evidence, changed business
understanding, unresolved limitation, confidence issue, compliance finding, or
business objection requires review before the artifact can continue.

Return To Review does not erase prior approval or lineage. If an approved
artifact requires substantive change, the preferred path is to create a new
authorized artifact version and supersede the prior artifact after review,
alignment, and approval.

## No Illegal Transitions

Governance State must never skip required business maturity.

Examples of illegal transitions include:

- Observed -> Approved
- Draft -> Approved
- Reviewed -> Superseded
- Aligned -> Superseded
- Rejected -> Approved
- Archived -> Approved
- Archived -> Superseded
- Superseded -> Approved
- Blocked -> Approved

Illegal transitions are prohibited because they bypass review, alignment,
approval, supersession, or lineage. A downstream artifact may not treat an
illegal transition as valid evidence.

## State Ownership

Governance State transitions are business-authorized.

### Business Owner

The Business Owner is the canonical owner of artifact governance decisions.
The Business Owner may approve, reject, return to review, or authorize
supersession when the artifact affects business meaning, business intent,
Business Approval, publishing readiness, or continuous evolution.

### Marketing

Marketing may review, recommend, correct, or align artifacts related to brand,
audience, messaging, campaigns, conversion goals, and market positioning.
Marketing may authorize transitions only when delegated business authority
allows it.

### Agency

Agency participants may contribute expertise, review experience intent,
recommend corrections, prepare draft artifacts, and help resolve blocked
states. Agency participation does not replace Business Owner authority unless
explicitly delegated.

### Administrator

Administrators may operate governance support, ensure auditability, maintain
role assignment, preserve lineage, and manage administrative correction paths.
Administrators do not own business meaning by default.

### Future Roles

Future roles may include Designer, Developer, Content Editor, Compliance,
Legal, Operations, Support, Sales, Analytics, and additional business
specialists.

Future Roles may participate only within the authority granted by the business
governance model. New roles must not redefine the canonical states or bypass
legal transitions.

## State Independence

Governance State is independent from:

- provider;
- implementation;
- runtime;
- UI;
- generation;
- publishing;
- prompts;
- provider adapters;
- workers;
- APIs;
- schemas;
- persistence;
- deployment.

A Governance State may be displayed by a UI, stored by future persistence,
protected by access control, referenced by runtime code, or used by publishing
readiness in a later implementation phase. None of those implementation
surfaces define the canonical meaning of the state.

## Relationship Model

The canonical DA-2 relationship model is:

```text
Decision
-> Authorization
-> Governance State
-> Artifact
-> Business Journey
```

Decision determines what business choice has been made.

Authorization determines whether that decision is allowed to affect a
canonical artifact.

Governance State records the artifact's resulting maturity and approval
status.

Artifact preserves the governed business meaning, lineage, evidence,
limitations, and decision consequence.

Business Journey makes the governed artifact path understandable to humans and
keeps the Business Owner oriented through discovery, understanding, alignment,
generation contracts, compliance, approval, publishing, and evolution.

## Architectural Rules

Governance State never contains:

- implementation;
- runtime behavior;
- schema;
- provider logic;
- generation logic;
- publishing implementation;
- prompts;
- provider adapter serialization;
- UI navigation;
- worker execution;
- API behavior;
- database mechanics.

Governance State may name business maturity, approval status, transition
eligibility, lineage expectations, and decision authority. It must not define
how any implementation surface stores, renders, executes, serializes,
generates, validates, or publishes that state.

## Manifesto Alignment

Every canonical artifact has a governance state.

Governance State is the deterministic business governance lifecycle describing
the maturity and approval status of a canonical artifact.

Governance State is independent of provider, implementation, runtime, UI,
generation, and publishing.

Authorization determines whether a decision may affect an artifact.
Governance State records the artifact's governed maturity after that
authorization.

## Future Vision

Future GNR8 should let Business Owners understand artifact maturity without
requiring them to understand implementation mechanics. The product may expose
states conversationally, visually, or operationally in later phases, but the
canonical states and legal transitions must remain deterministic,
business-governed, implementation-independent, and lineage-preserving.
