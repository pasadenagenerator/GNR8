# Decision Architecture Specification

## Phase And Boundary

Phase DA-0 defines Decision Architecture as the canonical governance model
that controls how businesses progress through GNR8.

This phase is documentation and architecture only. It adds no implementation,
TypeScript, schema, persistence, API, UI, wireframes, workers, prompts,
provider adapters, AI integration, generation, publishing, runtime behavior,
or deployment behavior.

Decision Architecture governs business decisions.

It never governs implementation.

Artifacts provide evidence.

Humans make decisions.

The architecture determines which decisions are allowed, when they are allowed,
and what new artifacts they authorize.

## Canonical Definition

"A deterministic governance model describing how business decisions progress
through canonical artifacts while preserving lineage and human authority."

Decision Architecture is the operational backbone of GNR8. It governs how
human business decisions move through the Business Journey and canonical
artifact chain without becoming a workflow engine, user interface, navigation
model, implementation plan, or provider integration.

## What Is Decision Architecture?

Decision Architecture is the canonical authority model for business decisions
inside GNR8.

It answers:

- which business decisions exist;
- who may own or contribute to those decisions;
- which artifacts provide evidence for each decision;
- which prerequisites must be satisfied before a decision is allowed;
- which new artifacts a decision may authorize;
- how repeated decisions preserve lineage;
- how human authority remains separate from AI proposals.

Decision Architecture does not ask whether an API route exists, which provider
should be called, which UI should be shown, which prompt should be written, or
which component should render. It asks whether the business has enough
governed evidence and authority to make the next business decision.

## Difference From Workflow

Decision Architecture is not a workflow.

A workflow is usually an ordered process for executing tasks. It can imply a
linear sequence, automation ownership, implementation steps, queue mechanics,
state transitions, or operational routing.

Decision Architecture is a deterministic governance graph. It defines allowed
business decisions and their prerequisites. Decisions may repeat, branch, return
to earlier understanding, or authorize a new artifact version. The important
question is not "what task runs next?" but "what business decision is allowed
now, and what lineage does it create?"

## Difference From UX

Decision Architecture is not UX.

UX determines how humans experience GNR8 through conversation, confidence,
clarity, explanation, and interaction. Decision Architecture determines the
governance rules underneath that experience.

The Business Journey describes the human experience.

Decision Architecture describes the deterministic decision authority.

UX may eventually express a decision clearly. It does not create the decision
rules.

## Difference From Application Navigation

Decision Architecture is not application navigation.

Navigation helps a person move between surfaces, reports, conversations, and
inspection areas. Decision Architecture determines whether the person has the
authority, evidence, and prerequisites to make a governed business decision.

A navigation path may expose a decision. It never authorizes that decision by
itself.

## Core Philosophy

Artifacts exist to support decisions.

Humans remain decision makers.

AI produces proposals.

No artifact exists without a business decision.

Every decision produces new lineage.

Understanding precedes generation.

Generation precedes approval.

Approval precedes publishing.

Business decisions always remain business-governed.

Decision Architecture exists so GNR8 can guide businesses with strategic
clarity while preserving deterministic rules, immutable history, and human
authority.

## Canonical Decision Lifecycle

The canonical decision lifecycle is:

```text
Evidence
-> Understanding
-> Decision
-> Artifact
-> Next Decision
```

Evidence supports understanding.

Understanding frames a decision.

A decision authorizes an artifact.

An artifact preserves the consequence of that decision.

The artifact then becomes evidence for the next decision.

Artifacts are consequences of decisions. They are not passive files created by
automation. They are lineage-bearing records that exist because a governed
business decision made them valid or necessary.

## Decision Types

Canonical decision types include:

- Continue
- Provide Information
- Correct Understanding
- Approve Understanding
- Reject Understanding
- Approve Alignment
- Return To Discovery
- Approve Website Intent
- Generate
- Review Compliance
- Approve Business
- Reject Business
- Publish
- Continue Evolution

### Continue

Intent: allow the Business Journey to proceed when current evidence and
understanding are sufficient for the next governed checkpoint.

### Provide Information

Intent: add missing business knowledge, clarify uncertainty, or supply
evidence required before a later decision can be made.

### Correct Understanding

Intent: mark current understanding as inaccurate or incomplete and authorize
new or revised understanding artifacts.

### Approve Understanding

Intent: confirm that the Business Understanding Report sufficiently represents
the business for downstream alignment.

### Reject Understanding

Intent: block downstream planning because the current understanding is not
trusted, incomplete, contradictory, or unsupported by enough evidence.

### Approve Alignment

Intent: confirm that the Digital Business Twin has been sufficiently aligned
for experience planning and website intent.

### Return To Discovery

Intent: send the business back to discovery when alignment, compliance,
approval, or evolution reveals that more evidence or understanding is needed.

### Approve Website Intent

Intent: approve the Website Design Brief as the intended website expression
before a Website Generation Package can be prepared.

### Generate

Intent: authorize external AI generation from an approved Website Generation
Package. Generate authorizes proposals, not business acceptance.

### Review Compliance

Intent: evaluate generated output against the originating Website Generation
Package and produce contractual evidence for Business Approval.

### Approve Business

Intent: accept the business consequence of generated output based on governed
compliance evidence and authorize publishing readiness.

### Reject Business

Intent: block publishing when the generated output, compliance result, risk,
or underlying intent is not acceptable to the business.

### Publish

Intent: authorize governed promotion of Business Approved output.

### Continue Evolution

Intent: reopen discovery, understanding, alignment, website intent,
generation, compliance, approval, or publishing as the business changes over
time.

## Decision Ownership

The canonical owner of business decisions is the Business Owner.

Other roles may contribute evidence, review artifacts, recommend decisions, or
operate supporting governance, but business decisions remain business-governed.

Canonical and future decision participants include:

- Business Owner
- Marketing
- Agency
- Designer
- Developer
- Administrator
- Future Roles

### Business Owner

Owns business authority. The Business Owner approves understanding, alignment,
website intent, business acceptance, publishing, and continuing evolution.

### Marketing

May contribute brand, audience, messaging, campaign, and positioning evidence.
Marketing can recommend corrections or intent changes, but does not replace
business ownership.

### Agency

May support strategy, interpretation, design direction, and governance review.
Agency participation is advisory unless explicitly delegated by the business.

### Designer

May contribute experience interpretation and website intent recommendations.
Designer participation supports Website Design Brief quality, not canonical
business authority.

### Developer

May contribute implementation feasibility, integration constraints, and
technical risk evidence. Developer participation does not convert business
decisions into implementation decisions.

### Administrator

May manage access, operational readiness, and governance support. An
Administrator does not own business meaning unless also acting with explicit
business authority.

### Future Roles

Future roles may contribute specialized knowledge, review, operations, or
approval support. They must not remove the rule that business decisions remain
business-governed.

## Artifact Authorization

Canonical artifacts authorize decisions by providing governed evidence,
lineage, constraints, and readiness.

```text
Reality
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Generation Contract Compliance
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

Business Discovery provides evidence for Digital Business Twin understanding
and decisions to provide information, correct understanding, or continue.

Digital Business Twin provides integrated understanding for Business
Understanding Report creation and decisions about whether understanding can be
presented to humans.

Business Understanding Report provides evidence for approve understanding,
reject understanding, correct understanding, provide information, continue, or
return to discovery.

Business Alignment provides evidence for approve alignment, return to
discovery, correct understanding, or authorize Website Design Brief
preparation.

Website Design Brief provides evidence for approve website intent, return to
alignment, correct intent, or authorize Website Generation Package
preparation.

Website Generation Package provides evidence for generate, return to website
intent, or revise generation intent before external AI receives a task.

External AI output provides proposal evidence for Generation Contract
Compliance. It never authorizes itself.

Generation Contract Compliance provides evaluation evidence for the
Generation Contract Compliance Report.

Generation Contract Compliance Report provides business-facing evidence for
approve business, reject business, request regeneration, improve Website
Generation Package, repeat alignment, or return to discovery.

Business Approval provides evidence for publish, reject publishing, request
regeneration, or continue evolution.

Published output provides evidence for continue evolution as business goals,
audiences, offers, evidence, performance, and constraints change.

## Decisions That Create Artifacts

Canonical decisions create or authorize artifacts:

- Provide Information may create new discovery evidence or revised Digital
  Business Twin understanding.
- Correct Understanding may create a new Business Understanding Report or
  revised Digital Business Twin lineage.
- Approve Understanding may authorize Business Alignment.
- Approve Alignment may authorize a Website Design Brief.
- Approve Website Intent may authorize a Website Generation Package.
- Generate may authorize external AI output proposals from the approved
  Website Generation Package.
- Review Compliance may authorize a Generation Contract Compliance Report.
- Approve Business may authorize Business Approval lineage and publishing
  readiness.
- Publish may authorize a published manifestation.
- Continue Evolution may authorize new discovery, understanding, alignment,
  website intent, generation, compliance, approval, or publishing artifacts.

No artifact exists without a business decision. Even when a system prepares or
projects an artifact, Decision Architecture determines which human-governed
decision made that artifact meaningful, allowed, and lineage-bearing.

## Decision Preconditions

Every decision has explicit prerequisites.

Business Alignment cannot occur before Business Understanding.

Website Design Brief cannot exist before Alignment.

Website Generation Package cannot exist before an approved Website Design
Brief.

Generation cannot occur before Website Generation Package.

Compliance review cannot occur before generation.

Business Approval cannot occur before the Generation Contract Compliance
Report.

Publishing cannot occur before Business Approval.

These gates are deterministic. A decision is either allowed by its
prerequisites or blocked until the required evidence, understanding, artifact,
or authority exists.

## Decision Graph

Decision Architecture replaces linear workflow thinking with a canonical
decision graph.

The graph is deterministic, but it is not a straight line:

- decisions may repeat;
- understanding may be corrected;
- alignment may return to discovery;
- website intent may return to alignment;
- generation may repeat;
- compliance may return to Website Generation Package;
- Business Approval may reject, approve with limitations, request
  regeneration, or return to alignment;
- publishing may be delayed until business approval is satisfied;
- business evolution may return to discovery, understanding, alignment,
  website intent, generation, compliance, approval, or publishing.

The canonical graph preserves the current architecture while allowing governed
loops:

```text
Human Journey
-> Decision Architecture
-> Business Understanding
-> Business Governance
-> Website Intent
-> Generation Contract
-> External AI
-> Compliance
-> Business Approval
-> Publishing
-> Continuous Evolution
-> Decision Architecture
```

Decision Architecture is graph-based because real business governance is
iterative. It must preserve repeat decisions, returned decisions, rejected
decisions, and changed decisions without overwriting history.

## Lineage

Every decision creates lineage.

Nothing overwrites history.

History is immutable.

New understanding creates new artifacts.

Corrected understanding does not erase prior understanding. Rejected
understanding does not disappear. Regenerated output does not replace the
fact that earlier generation occurred. Published output does not erase the
Business Approval that authorized it.

Decision lineage records what was known, which artifact supported the
decision, who held authority, what was decided, what was blocked or
authorized, and which new artifact or next decision became possible.

## Relationship Model

Decision Architecture sits between the Business Journey and canonical
artifacts.

```text
Business Journey
-> Decision Architecture
-> Canonical Artifacts
-> External AI
-> Compliance
-> Business Approval
-> Publishing
```

Decision Architecture orchestrates movement.

Artifacts preserve truth.

External AI produces proposals only after governed decisions authorize
generation.

Compliance evaluates generated proposals against the originating contract.

Business Approval accepts or rejects the business consequence.

Publishing is authorized only after Business Approval.

## Architectural Rules

Decision Architecture never contains:

- implementation;
- provider logic;
- prompts;
- generation code;
- React;
- HTML;
- runtime;
- publishing implementation;
- schema;
- API behavior;
- UI behavior.

Decision Architecture governs business decisions only.

It may name roles, artifacts, decisions, prerequisites, lineage, authority,
and governance boundaries. It must not define storage models, route behavior,
component behavior, prompt content, provider serialization, AI integration,
validation execution, runtime state, deployment mechanics, or publishing
implementation.

## Manifesto Alignment

GNR8 is governed by decisions rather than workflows.

Artifacts exist to support business decisions.

Human authority is preserved through deterministic decision architecture.

Decision Architecture is the operational backbone of GNR8.

## Future Vision

Future GNR8 should behave like an experienced strategic advisor.

Every recommendation should ultimately support a business decision.

Decision Architecture should remain stable even if AI providers change.

As providers, interfaces, artifacts, and implementation techniques evolve,
Decision Architecture must continue to preserve the same core rule: governed
business decisions authorize movement through GNR8, artifacts preserve
truth, AI proposes, and humans decide.
