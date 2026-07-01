# Decision Artifact Authorization Matrix

## Phase And Boundary

Phase DA-1 defines the canonical authorization model that determines which
business decision authorizes the creation, revision, supersession, or
progression of each canonical artifact.

This phase is documentation and architecture only. It adds no implementation,
TypeScript, schema, persistence, API, UI, workers, prompts, provider adapters,
AI integration, generation, publishing, runtime behavior, or deployment
behavior.

Artifacts never appear automatically.

Every artifact exists because an explicit governed business decision
authorized it.

## Canonical Definition

"A deterministic governance model defining which business decisions authorize
each canonical artifact and under which prerequisites."

The Decision Artifact Authorization Matrix is the authorization layer inside
Decision Architecture. Decision Architecture defines the governed decision
model. The Authorization Matrix defines how those decisions permit canonical
artifacts to exist, be revised, be superseded, or become prerequisites for the
next governed decision.

## Canonical Authorization Chain

The canonical authorization chain is:

```text
Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment Decision
-> Business Alignment Artifact
-> Website Design Decision
-> Website Design Brief
-> Generation Decision
-> Website Generation Package
-> Generation Execution Decision
-> Generated Website Proposal
-> Compliance Review Decision
-> Generation Contract Compliance Report
-> Business Approval Decision
-> Business Approval
-> Publishing Decision
-> Published Experience
```

Business Discovery authorizes the first governed business evidence and
knowledge capture. It must be explicitly initiated or continued by a business
decision; discovery is not passive scraping, background automation, or
ungoverned ingestion.

Digital Business Twin is authorized when discovery evidence is sufficient to
form governed operational understanding of the business and its digital
identity. The Twin may be created, revised, or superseded only through an
explicit decision that accepts the required evidence, lineage, confidence, and
known limitations.

Business Understanding Report is authorized when the current Digital Business
Twin is ready to be presented for human review. The report does not authorize
itself; it is a governed projection of the Twin created so the business can
inspect understanding before downstream planning.

Business Alignment Decision is authorized by the Business Understanding Report
and its supporting lineage. The decision confirms, corrects, rejects, or sends
understanding back to discovery.

Business Alignment Artifact is authorized by the Business Alignment Decision.
It records the governed outcome of alignment, including accepted
understanding, required corrections, rejected assumptions, limitations,
confidence, and lineage.

Website Design Decision is authorized only after Business Alignment exists.
It decides whether aligned business understanding may become website
experience intent.

Website Design Brief is authorized by the Website Design Decision. It is the
canonical artifact defining what the website experience should express,
prioritize, and make possible, without defining implementation.

Generation Decision is authorized by an approved Website Design Brief and its
alignment lineage. It decides whether the website intent may be converted into
a provider-neutral generation contract.

Website Generation Package is authorized by the Generation Decision. It is the
canonical generation contract and must preserve the lineage from Business
Discovery, Digital Business Twin, Business Understanding Report, Business
Alignment, and Website Design Brief.

Generation Execution Decision is authorized by the Website Generation Package.
It decides whether the approved contract may be sent outward for proposal
creation. This decision authorizes proposal creation only; it does not
authorize business acceptance or publishing.

Generated Website Proposal is authorized by the Generation Execution Decision.
It is an external AI proposal downstream of the Website Generation Package.
The proposal never becomes canonical truth by existing.

Compliance Review Decision is authorized by the Generated Website Proposal and
the originating Website Generation Package. It decides whether the proposal
may be evaluated against the generation contract.

Generation Contract Compliance Report is authorized by the Compliance Review
Decision. It communicates contractual fulfillment, deviations, limitations,
risks, and readiness for Business Approval.

Business Approval Decision is authorized by the Generation Contract Compliance
Report and all required lineage. It decides whether the business accepts the
contractual consequence of the generated proposal.

Business Approval is authorized by the Business Approval Decision. It records
approval, approval with limitations, regeneration, return to alignment,
rejection, or blocking of publishing readiness.

Publishing Decision is authorized only by Business Approval. It decides
whether the approved experience may be promoted as a published business
manifestation.

Published Experience is authorized by the Publishing Decision. It is the
published manifestation of a Business Approved experience, not the source of
truth for the business.

## Canonical Matrix

| Canonical artifact | Authorizing decision | Required predecessor artifacts | Required predecessor decisions | Next authorized decision |
| --- | --- | --- | --- | --- |
| Business Discovery | Business Discovery Decision | Reality, source evidence, business conversation, connector evidence where available | Continue, Provide Information, or Continue Evolution | Digital Business Twin Formation Decision |
| Digital Business Twin | Digital Business Twin Formation Decision | Business Discovery, accepted evidence, facts, interpretations, knowledge | Business Discovery Decision, Provide Information, Correct Understanding where applicable | Understanding Presentation Decision |
| Business Understanding Report | Understanding Presentation Decision | Digital Business Twin, evidence lineage, confidence, limitations | Digital Business Twin Formation Decision | Business Alignment Decision |
| Business Alignment Artifact | Business Alignment Decision | Business Understanding Report, Digital Business Twin, discovery lineage | Approve Understanding, Correct Understanding, Reject Understanding, or Return To Discovery as applicable | Website Design Decision |
| Website Design Brief | Website Design Decision | Business Alignment Artifact, aligned Digital Business Twin, Business Understanding Report | Business Alignment Decision | Generation Decision |
| Website Generation Package | Generation Decision | Website Design Brief, Business Alignment Artifact, Digital Business Twin lineage | Website Design Decision | Generation Execution Decision |
| Generated Website Proposal | Generation Execution Decision | Website Generation Package, generation constraints, lineage, approved package scope | Generation Decision | Compliance Review Decision |
| Generation Contract Compliance Report | Compliance Review Decision | Generated Website Proposal, Website Generation Package, Business Alignment lineage | Generation Execution Decision | Business Approval Decision |
| Business Approval | Business Approval Decision | Generation Contract Compliance Report, Website Generation Package, Website Design Brief, Business Alignment lineage | Compliance Review Decision | Publishing Decision or earlier corrective decision |
| Published Experience | Publishing Decision | Business Approval, approved generated proposal, compliance report, publishing readiness lineage | Business Approval Decision | Continue Evolution |

This matrix defines authorization only. It does not define storage, schema,
routes, rendering, provider behavior, prompt content, worker execution,
generation logic, compliance execution, or publishing implementation.

## Authorization Rules

Every artifact requires an explicit authorizing decision.

No downstream artifact may bypass upstream authorization.

No artifact may authorize itself.

Authorization preserves lineage.

Supersession creates new lineage.

Nothing overwrites previous artifacts.

An artifact can provide evidence for a decision, but it cannot replace the
decision. A system may prepare candidate information, projections, summaries,
or diagnostics, but the canonical artifact exists only when the required
business decision authorizes it.

Authorization is deterministic. If the required predecessor artifacts,
decisions, governance state, lineage, confidence, or alignment state are
missing, the artifact is blocked until the missing prerequisite is resolved.

## Prerequisite Model

Every authorization defines:

- required predecessor artifacts;
- required predecessor decisions;
- required governance state;
- required lineage;
- required confidence;
- required alignment state.

Required predecessor artifacts are the canonical artifacts that must already
exist before a decision may authorize a new artifact.

Required predecessor decisions are the governed business decisions that must
already have occurred, including approvals, corrections, returns to discovery,
or rejection states where relevant.

Required governance state defines whether the preceding artifact is accepted,
blocked, rejected, corrected, approved with limitations, or ready for the next
decision.

Required lineage defines the evidence, artifacts, decisions, limitations, and
authority path that the new artifact must preserve.

Required confidence defines whether the known evidence and understanding are
sufficient for the authorization being requested. Low confidence may block the
artifact, require more information, authorize a limited artifact, or return the
journey to discovery.

Required alignment state defines whether business understanding has been
accepted for the next stage. Downstream experience, generation, compliance,
approval, and publishing artifacts may not bypass unresolved alignment.

## Supersession Model

Superseded artifacts remain immutable.

New decisions create new artifacts.

Lineage records the transition.

No history is deleted.

Supersession is not overwrite. A corrected Business Understanding Report does
not erase the earlier report. A revised Website Design Brief does not erase
the previously approved brief. A regenerated website proposal does not erase
the proposal that failed compliance or Business Approval. A new Published
Experience does not erase the Business Approval and Publishing Decision that
authorized the previous published manifestation.

Supersession requires an explicit decision explaining why a new artifact is
needed, which prior artifact is superseded, what predecessor artifacts and
decisions remain valid, what changed, what confidence or alignment changed,
and which lineage is carried forward.

## Decision-To-Artifact Relationships

### One Decision To One Artifact

One decision authorizes one artifact when the governed outcome is singular and
bounded.

Appropriate examples:

- Business Alignment Decision authorizes one Business Alignment Artifact.
- Website Design Decision authorizes one Website Design Brief.
- Publishing Decision authorizes one Published Experience.

This pattern is appropriate when a decision produces a single canonical record
that becomes the prerequisite for the next business decision.

### One Decision To Multiple Artifacts

One decision may authorize multiple artifacts when a single governed business
decision explicitly permits several related outputs that share the same
authority, lineage, and prerequisites.

Appropriate examples:

- Continue Evolution may authorize new Business Discovery evidence, a revised
  Digital Business Twin, and a new Business Understanding Report.
- A corrective alignment decision may authorize both a superseded Business
  Alignment Artifact and a revised Website Design Brief.
- A regeneration decision may authorize a revised Website Generation Package
  and a new Generated Website Proposal.

This pattern is appropriate only when the decision explicitly names the
artifact set and each artifact records the shared decision lineage.

### Multiple Decisions To One Artifact

One artifact may require multiple prior decisions when its creation depends on
more than its immediate authorizing decision.

Appropriate examples:

- Website Generation Package requires the Generation Decision, but also
  depends on the prior Business Alignment Decision and Website Design Decision.
- Generation Contract Compliance Report requires the Compliance Review
  Decision, but also depends on the Generation Execution Decision and the
  earlier Generation Decision.
- Published Experience requires the Publishing Decision, but also depends on
  Business Approval Decision, Compliance Review Decision, Generation Execution
  Decision, Generation Decision, Website Design Decision, and Business
  Alignment Decision.

This pattern is appropriate when an artifact is downstream of an accumulated
governance chain and must preserve all prior authority, not only the immediate
decision that created it.

## Relationship Model

The canonical DA-1 relationship model is:

```text
Decision Architecture
-> Authorization Matrix
-> Canonical Artifacts
-> Business Journey
-> External AI
-> Compliance
-> Business Approval
-> Publishing
```

Decision Architecture defines the governed decision model.

Authorization Matrix governs artifact creation, revision, supersession, and
progression.

Canonical Artifacts preserve the consequences of decisions and provide
evidence for later decisions.

Business Journey governs the human experience of moving through understanding,
alignment, design intent, generation, compliance, approval, publishing, and
evolution.

External AI receives authorized generation contracts and returns proposals
only after the correct decision path exists.

Compliance evaluates proposals against the originating Website Generation
Package and its lineage.

Business Approval accepts or rejects the business consequence of compliance
evidence.

Publishing promotes only Business Approved experiences.

Authorization governs artifact creation while the journey governs human
experience. The journey may make decisions understandable and navigable for
humans, but it does not bypass the Authorization Matrix.

## Architectural Rules

The Authorization Matrix never contains:

- implementation;
- provider logic;
- prompts;
- React;
- HTML;
- runtime behavior;
- schema;
- API behavior;
- publishing implementation.

It governs authorization only.

The matrix may name decisions, artifacts, prerequisites, lineage,
supersession, confidence, alignment, governance state, and relationship
patterns. It must not define storage models, route behavior, component
behavior, prompt content, provider serialization, AI integration, validation
execution, runtime state, deployment mechanics, or publishing implementation.

## Manifesto Alignment

No artifact exists without an authorizing business decision.

Authorization preserves trust, lineage, and governance.

Artifacts are authorized, never assumed.

GNR8 is governed by decisions rather than workflows. The Decision Artifact
Authorization Matrix ensures every canonical artifact is tied to explicit
business authority, predecessor evidence, immutable lineage, and the next
governed decision.

## Future Vision

Future GNR8 should make artifact authorization feel natural to the Business
Owner without hiding the governance rule underneath: every meaningful artifact
exists because a business decision authorized it.

As Business Domains, Experience Domains, provider adapters, external AI
systems, compliance methods, publishing targets, and future artifact families
evolve, the Authorization Matrix must remain deterministic, provider-neutral,
implementation-independent, lineage-preserving, and business-governed.
