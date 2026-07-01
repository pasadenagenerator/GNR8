# Canonical Artifact Lineage And Versioning Model

## Phase And Boundary

Phase DA-3 defines the canonical lineage and versioning model shared by every
governed business artifact inside GNR8.

This phase is documentation and architecture only. It adds no implementation,
TypeScript, schema, persistence, API, UI, workers, prompts, provider adapters,
AI integration, generation, publishing, runtime behavior, or deployment
behavior.

Lineage preserves history.

Versioning preserves evolution.

Neither lineage nor versioning may ever overwrite business truth.

The purpose is deterministic governance, traceability, auditability, and
continuous business evolution.

## Canonical Definitions

Lineage is:

"The immutable chain describing how governed business artifacts originate,
evolve, authorize successors, and preserve business history."

Version is:

"A deterministic revision of the same business artifact within the same
lineage."

Lineage describes the historical chain. It explains where an artifact came
from, which evidence and decisions authorized it, which prior artifacts it
depends on, which later artifacts superseded it, and how business history can
be reconstructed.

Versioning describes controlled refinement inside that chain. It explains how
the same business artifact evolves when new evidence, correction, alignment,
approval, or regeneration requires a deterministic revision without erasing
the earlier record.

Lineage answers: "How did this governed business artifact and its successors
come to exist?"

Versioning answers: "Which deterministic revision of this same business
artifact is this?"

## Core Philosophy

History is never rewritten.

Every decision creates traceability.

Superseded artifacts remain valid historical records.

Business evolution is additive.

Lineage preserves truth.

Versioning preserves refinement.

No governed artifact is replaced by mutation. A later artifact may supersede,
correct, refine, reject, archive, or regenerate an earlier artifact, but it
does not erase the earlier artifact's business meaning in history.

GNR8 must always be able to explain what the business believed, accepted,
rejected, approved, generated, reviewed, published, or corrected at any point
in its governed evolution.

## What Is Lineage?

Lineage is the immutable business-history chain for governed artifacts.

It includes:

- originating reality and evidence;
- predecessor artifacts;
- authorizing decisions;
- governance states;
- supersession relationships;
- versions;
- limitations;
- confidence and alignment context;
- business authority;
- downstream consequences.

Lineage is not storage mechanics. It is not a database relationship, runtime
trace, provider payload, prompt chain, UI navigation path, worker log, or
deployment history. Those may later reference lineage, but they do not define
it.

Lineage exists so GNR8 can deterministically answer:

- which evidence supported an artifact;
- which business decision authorized it;
- which artifact version was active at a given time;
- why a later artifact superseded it;
- which historical artifacts remain valid records;
- what business understanding existed before any downstream proposal,
  approval, or publication.

## What Is Versioning?

Versioning is the deterministic revision model for the same business artifact
within the same lineage.

A version is not a copy, draft filename, storage row, provider retry, runtime
attempt, or UI save event. A version exists only when a governed business
reason requires the same artifact to be revised while preserving the same
lineage.

Versioning exists so GNR8 can refine understanding without pretending that
earlier understanding never existed.

## Why Lineage And Versioning Are Different

Lineage is broader than versioning.

Lineage connects artifact families, predecessor artifacts, authorizing
decisions, governance states, supersession, and downstream consequences across
the full business history.

Versioning is narrower. It describes deterministic revisions of the same
business artifact within that lineage.

Example:

```text
Business Discovery
-> Digital Business Twin v1
-> Digital Business Twin v2
-> Business Understanding Report v3
-> Business Alignment v2
-> Website Design Brief v4
-> Website Generation Package v7
```

This is lineage continuity. The chain preserves how governed business
understanding moved from discovery into the Twin, from the Twin into the
human-facing report, from the report into alignment, from alignment into
website intent, and from website intent into a generation contract.

The `v1`, `v2`, `v3`, `v4`, and `v7` markers are versions. They refine the
artifact at a specific point in the chain. They do not replace the chain.

## Canonical Lineage Model

The canonical lineage model is:

```text
Reality
-> Evidence
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Generated Website Proposal
-> Generation Contract Compliance Report
-> Business Approval
-> Published Experience
-> Continuous Evolution
```

Each artifact in the chain preserves its predecessor context and its
authorizing decision context.

Lineage continuity means that a downstream artifact never floats free from
the business truth that authorized it. A Website Generation Package remains
connected to the Website Design Brief, Business Alignment, Business
Understanding Report, Digital Business Twin, Business Discovery, Evidence, and
Reality that made it valid. A Published Experience remains connected to the
Business Approval, Compliance Report, proposal, package, design brief,
alignment, understanding, Twin, discovery, evidence, and reality that made it
publishable.

Lineage is cumulative. Later artifacts may add knowledge, correction,
alignment, approval, rejection, regeneration, compliance findings, or
publishing consequences. They may not delete the historical business record
that came before them.

## Versioning Rules

A new version is required when the same business artifact changes in a way
that affects governed meaning, readiness, authority, confidence, alignment, or
downstream eligibility.

Canonical versioning causes include:

- Minor refinement
- Major refinement
- Business correction
- New evidence
- New alignment
- New approval
- Regeneration

### Minor Refinement

A minor refinement improves clarity, wording, categorization, ordering,
diagnostics, or presentation of the same governed meaning.

Minor refinement requires a new version when the artifact's governed record
must remain auditable. It does not create new lineage unless it changes the
artifact's relationship to predecessor or successor artifacts.

### Major Refinement

A major refinement changes material business meaning, scope, intent,
structure, readiness, confidence, or downstream eligibility while remaining
the same artifact in the same lineage.

Major refinement requires a new version and may supersede the prior active
version.

### Business Correction

A business correction fixes incorrect, incomplete, contradicted, unsupported,
or stale business understanding.

Business correction requires a new version because the previous artifact
remains a historical record of what was understood before correction.

### New Evidence

New evidence requires a new version when it changes facts, interpretations,
knowledge, understanding, confidence, limitations, alignment, or downstream
readiness.

New evidence does not automatically create a version by existing. A governed
decision determines whether the evidence changes the artifact.

### New Alignment

New alignment requires a new version when human review confirms, changes,
rejects, narrows, expands, or qualifies the business understanding behind an
artifact.

Alignment may refine the Digital Business Twin, Business Understanding Report,
Business Alignment Artifact, Website Design Brief, Website Generation
Package, Business Approval, or later evolution artifacts.

### New Approval

New approval requires a new version when the business authority accepts a
revised artifact, approves with limitations, approves a corrected record, or
approves a later successor for downstream use.

Approval does not overwrite prior approval. It creates traceability between
the earlier approved record, the changed conditions, and the new approved
version.

### Regeneration

Regeneration requires a new version when an existing generation contract,
proposal, compliance result, approval outcome, or published manifestation must
be revised because business intent, evidence, compliance, or approval changed.

Regeneration never erases the prior generation attempt, proposal, compliance
report, Business Approval result, or Published Experience.

## What Creates New Lineage?

New lineage is created when the governed business chain branches, restarts,
or produces a successor artifact that is not merely a revision of the same
artifact.

Canonical new-lineage causes include:

- a new Business Discovery origin;
- a new business scope;
- a new Experience Domain manifestation;
- a new Business Intent;
- a return to discovery that changes the source understanding;
- a corrective decision that forks from a rejected or blocked path;
- a new Published Experience family;
- a major continuous-evolution cycle that creates a successor chain.

New lineage may carry historical references from prior lineage. Carrying
references does not mean history was overwritten. It means a new governed
chain acknowledges the business history that informed it.

## Superseded Artifacts

Superseded artifacts are preserved as immutable historical records.

Superseded means a later authorized artifact version or successor artifact has
replaced the earlier artifact for future governance progression. It does not
mean the earlier artifact was deleted, invalidated as history, or rewritten.

Every supersession must preserve:

- the superseded artifact;
- the successor artifact;
- the authorizing decision;
- the reason for supersession;
- the governance state before and after supersession;
- the predecessor lineage carried forward;
- the changed evidence, understanding, alignment, approval, compliance, or
  publishing context.

Superseded artifacts remain useful for audit, explanation, rollback analysis,
compliance review, Business Owner trust, and reconstruction of historical
business understanding.

## Historical Reconstruction

Historical business understanding can always be reconstructed by walking the
governed chain:

```text
Reality
-> Evidence
-> Knowledge
-> Decision
-> Authorization
-> Governance State
-> Lineage
-> Version
-> Artifact
-> Business Journey
```

For any point in history, GNR8 should be able to determine:

- the evidence available at that time;
- the knowledge and understanding derived from that evidence;
- the decision that authorized the artifact;
- whether authorization prerequisites were satisfied;
- the governance state of the artifact version;
- the active lineage and version;
- the superseded, rejected, archived, or blocked records around it;
- the artifact that was valid for the Business Journey at that moment.

This reconstruction is historical and business-governed. It is not a replay
of runtime state, provider responses, prompt text, generated code, or
deployment artifacts.

## Lineage Events

Canonical lineage events include:

- Created
- Updated
- Reviewed
- Aligned
- Approved
- Superseded
- Archived
- Rejected
- Regenerated
- Published

### Created

Created means a governed artifact or lineage begins through an authorized
business decision.

### Updated

Updated means an existing artifact receives a governed revision within the
same lineage.

### Reviewed

Reviewed means the artifact has been inspected by the appropriate business
authority or delegated reviewer and is eligible for the next governance
decision.

### Aligned

Aligned means the artifact is consistent with current governed business
understanding, intent, lineage, confidence, and limitations.

### Approved

Approved means the artifact has been accepted by the authorized business
decision maker for its intended governance purpose.

### Superseded

Superseded means a later authorized artifact version or successor artifact has
replaced this artifact for future progression while preserving it as history.

### Archived

Archived means the artifact is retained for history, audit, lineage, or
reference and is no longer active in the current governance path.

### Rejected

Rejected means the artifact was explicitly not accepted for its intended
business purpose while remaining part of the lineage.

### Regenerated

Regenerated means a later generation-related artifact was authorized because
the prior contract, proposal, compliance result, approval outcome, or
published manifestation required governed revision.

### Published

Published means an approved business manifestation was promoted through a
governed Publishing Decision. Publishing is a lineage event, not proof that
the published experience became business truth.

## Relationship Model

The canonical DA-3 relationship model is:

```text
Reality
-> Evidence
-> Knowledge
-> Decision
-> Authorization
-> Governance State
-> Lineage
-> Version
-> Artifact
-> Business Journey
```

Reality is the business and world state that exists independently of GNR8.

Evidence is observed, captured, imported, supplied, or otherwise recognized
support for business understanding.

Knowledge is validated interpretation derived from evidence.

Decision is the governed business choice made by the authorized business
authority.

Authorization determines whether the decision may create, revise, supersede,
reject, archive, regenerate, publish, or progress an artifact.

Governance State records the artifact's maturity and approval status after
authorization.

Lineage preserves the immutable business-history chain across predecessor
artifacts, decisions, states, versions, successors, and consequences.

Version identifies the deterministic revision of the same business artifact
within the same lineage.

Artifact preserves the governed business meaning, evidence, limitations,
decision consequence, lineage, version, and readiness for later decisions.

Business Journey makes the governed artifact path understandable to humans
and keeps the Business Owner oriented through discovery, understanding,
alignment, generation contracts, compliance, approval, publishing, and
continuous evolution.

## Architectural Rules

Lineage never stores:

- implementation;
- provider payloads;
- prompts;
- runtime state;
- React;
- HTML;
- generated code;
- deployment artifacts.

Lineage preserves business evolution only.

Lineage may name business evidence, knowledge, decisions, authorizations,
governance states, versions, artifacts, supersession, rejection, archival,
regeneration, publishing events, limitations, confidence, alignment, and
business authority. It must not define how any implementation surface stores,
renders, executes, serializes, generates, validates, deploys, or publishes
those records.

Versioning may define deterministic revision meaning. It must not define file
formats, database models, API routes, UI behavior, worker execution, provider
serialization, prompt syntax, generated output structure, or deployment
mechanics.

## Manifesto Alignment

Business history is immutable.

Every governed artifact preserves lineage.

Versioning refines understanding; lineage preserves evolution.

Lineage preserves business truth across time. Versioning preserves controlled
refinement inside that truth. Supersession changes the active governed record
without deleting the historical record.

## Future Vision

Future GNR8 should allow any historical digital experience to be reconstructed
from governed lineage without ambiguity.

That reconstruction should be possible because business evidence, knowledge,
decisions, authorizations, governance states, lineage, versions, artifacts,
approval, compliance, publishing events, supersession, rejection, and archival
remain deterministic and historically preserved.

This future vision does not require DA-3 to define implementation, schema,
persistence, API, UI, workers, prompts, provider adapters, AI integration,
generation, or publishing. DA-3 defines only the canonical governance model
that makes such reconstruction architecturally unambiguous later.

## Completion Statement

DA-3 completes Decision Architecture as the canonical governance architecture
for business decisions, authorization, governance state, lineage, versioning,
canonical artifacts, the Business Journey, External AI, Compliance, Business
Approval, and Publishing.

The completed governance architecture is:

```text
Decision Model
-> Authorization
-> Governance State
-> Lineage
-> Versioning
-> Canonical Artifacts
-> Business Journey
-> External AI
-> Compliance
-> Business Approval
-> Publishing
```

## Recommended Next Phase

Phase ARCH-1 - Canonical Architecture Index Reconciliation, documentation
only.
