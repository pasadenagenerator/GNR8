# Business Journey Specification

## Phase And Boundary

Phase UX-0 defines the Business Journey as the canonical human experience
layer above the existing GNR8 architecture.

This phase is documentation and architecture only. It adds no implementation,
TypeScript, schema, persistence, API, UI, wireframes, visual design, workers,
prompts, provider adapters, AI integration, generation, publishing, runtime
state, or deployment behavior.

The Business Journey is not a UI flow.

It is not a wizard.

It is not a sequence of screens.

It is the governed human experience through which a business owner moves from
the first conversation with GNR8 to approval of a digital experience for
publishing.

## Canonical Definition

"The governed human experience through which a business progressively
transforms its business understanding into approved digital experiences."

The Business Journey is:

- conversation-driven;
- business-centric;
- goal-oriented;
- human-governed;
- provider-neutral;
- technology-independent;
- deterministic in architecture;
- adaptive in interaction.

The Business Journey is NOT:

- wizard;
- page flow;
- screen hierarchy;
- technical pipeline;
- backend workflow;
- implementation sequence.

## What Is The Business Journey?

The Business Journey is the canonical human experience of GNR8. It describes
how a business progressively builds confidence in what GNR8 understands,
decides what the business wants to express, approves the governed intent for a
digital experience, reviews contract compliance after generation, and decides
whether the result is ready for publishing.

The journey exists above application navigation. Navigation may eventually
help a person reach a conversation, artifact, approval checkpoint, report, or
decision surface, but navigation is not the journey. The journey is the
business meaning, confidence progression, decision sequence, and governance
path that make those surfaces useful.

The journey exists above UI. UI may eventually express parts of the journey,
but the Business Journey does not define screens, layouts, components,
wireframes, prompts, forms, routes, or visual states. It defines how humans
experience GNR8 as a guided business transformation system.

## Journey Philosophy

The journey begins with understanding.

Every step increases business confidence.

Humans approve understanding before generation.

Humans approve business decisions, not AI.

The system guides.

The human decides.

GNR8 should feel like working with an experienced digital transformation
consultant rather than operating a traditional website builder. The product
should help a business owner clarify the business, expose missing knowledge,
understand decisions, approve governed artifacts, and continue improving the
digital expression of the business without requiring the owner to operate
software complexity directly.

## Primary Actor

The primary actor is:

- Business Owner

The Business Owner is the canonical journey owner because GNR8 is accountable
to the business's meaning, goals, confidence, and approval decisions.

Future secondary actors may include:

- Marketing;
- Agency;
- Designer;
- Developer;
- Content Editor;
- Operations;
- Support;
- Administrators.

Secondary actors may contribute knowledge, review artifacts, prepare inputs,
inspect reports, or support governance. They do not replace the Business
Owner as the canonical owner of the journey.

## Canonical Journey Stages

The canonical Business Journey stages are:

```text
Welcome
-> Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Generation
-> Compliance Review
-> Business Approval
-> Publishing
-> Continuous Evolution
```

### Welcome

Purpose: establish trust, orient the Business Owner, and begin the first
business conversation. Welcome frames GNR8 as a guided transformation partner,
not a builder, CMS, wizard, or prompt box.

### Business Discovery

Purpose: gather business context through guided conversation and governed
source understanding. Discovery identifies what the business is, what it
offers, who it serves, what it wants to achieve, what is known, what is
uncertain, and what must be clarified.

### Digital Business Twin

Purpose: integrate business knowledge into the canonical operational
understanding of the business and its digital identity. The Digital Business
Twin is the source of truth for business understanding, not a screen, website,
prompt, or generated output.

### Business Understanding Report

Purpose: make GNR8's current understanding readable and reviewable by humans.
The report exposes confidence, missing knowledge, limitations, evidence,
lineage, and diagnostics so the Business Owner can trust, correct, or reject
understanding before downstream planning.

### Business Alignment

Purpose: confirm or improve the Digital Business Twin through human-governed
decisions. Alignment validates business understanding, not websites or AI
outputs.

### Website Design Brief

Purpose: transform aligned business understanding into website experience
intent. The brief defines what the website should express, communicate,
prioritize, and make possible for users without prescribing implementation.

### Website Generation Package

Purpose: convert approved experience intent into the canonical
provider-neutral generation contract. The package defines what external
generation systems must create and what GNR8 will later evaluate.

### Generation

Purpose: execute the approved generation contract through provider-neutral
orchestration and provider-specific adapters. In the Business Journey,
Generation is experienced as requesting a proposal from external AI under a
governed contract, not as surrendering authority to AI.

### Compliance Review

Purpose: review whether the generated result satisfies the originating
Website Generation Package. Compliance Review communicates contractual
fulfillment, deviations, risks, limitations, and readiness for business
approval.

### Business Approval

Purpose: allow the Business Owner to approve, approve with limitations,
request regeneration, return to alignment, or block publication based on
governed business consequences rather than implementation technology.

### Publishing

Purpose: promote only Business Approved output through governed publishing.
Publishing is the consequence of approval, not the act of generation.

### Continuous Evolution

Purpose: keep the business and its digital experiences improving as goals,
offers, audiences, evidence, performance, and constraints evolve. Continuous
Evolution returns the Business Owner to discovery, understanding, alignment,
briefing, generation, compliance, approval, or publishing when the business
changes.

## Human Decision Model

The Business Journey is decision-driven rather than screen-driven.

Canonical human decisions include:

- Continue;
- Correct Understanding;
- Provide Missing Information;
- Approve Alignment;
- Approve Design Intent;
- Generate;
- Review Compliance;
- Approve Publication;
- Continue Improvement.

These decisions are business decisions. They do not require the human to
choose prompts, providers, frameworks, components, schemas, routes, APIs,
deployment mechanics, or implementation details.

GNR8 guides the human toward the next meaningful business decision. It does
not silently automate business authority away from the Business Owner.

## Conversation Principle

GNR8 interacts primarily through guided business conversations.

Conversation replaces traditional software complexity.

Artifacts are outcomes of conversations.

Conversations produce business understanding.

The conversation model does not mean prompts become canonical. Guided
conversation is the human interaction principle. The deterministic
architecture remains the canonical system of record for artifacts, lineage,
decisions, governance, compliance, approval, and publishing.

## Journey Outputs

The Business Journey produces canonical artifacts as governed outcomes of
conversation and decision. Each artifact-producing stage produces exactly one
canonical artifact for its role in the journey:

```text
Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Compliance Report
-> Business Approval
```

Business Discovery exists to produce the initial governed business
understanding that feeds the Digital Business Twin.

Digital Business Twin exists to preserve the canonical operational
understanding of the business and its digital identity.

Business Understanding Report exists to let humans inspect, trust, correct,
or reject GNR8's current business understanding before downstream planning.

Business Alignment exists to confirm or improve the Digital Business Twin
through governed human decisions.

Website Design Brief exists to translate aligned understanding into website
experience intent.

Website Generation Package exists to define the provider-neutral generation
contract.

Compliance Report exists to communicate whether generated output fulfilled
the originating generation contract.

Business Approval exists to record the governed business decision that
authorizes publishing, requests regeneration, returns to alignment, or blocks
publication.

Welcome, Generation, Publishing, and Continuous Evolution are journey stages
that orient, execute, promote, or renew the artifact chain. They do not create
new canonical human-experience artifacts in UX-0.

## Relationship Model

The Business Journey orchestrates the architecture rather than replacing it.

```text
Business Journey
-> Architecture
-> Generation
-> Governance
-> Publishing
```

The Business Journey describes how humans move through confidence, clarity,
intent, review, approval, and evolution.

The architecture defines deterministic artifacts, lineage, constraints,
governance boundaries, provider neutrality, compliance, approval, and
publishing rules.

The generation layer executes only after governed understanding and approved
generation intent exist.

The governance layer ensures that business decisions remain human-owned,
auditable, and separated from provider implementation.

The publishing layer promotes only governed, Business Approved output.

The canonical separation is:

```text
Human Journey
-> Business Understanding
-> Business Governance
-> Website Intent
-> Generation Contract
-> External AI
-> Compliance
-> Business Approval
-> Publishing
```

## Architectural Rules

Business Journey never contains:

- implementation;
- provider logic;
- prompts;
- generation logic;
- React;
- HTML;
- schema;
- API behavior;
- runtime state;
- publishing implementation.

The Business Journey governs only human experience.

It may name canonical artifacts and decisions, but it must not define their
storage model, schema shape, route behavior, UI representation, provider
serialization, prompt strategy, AI integration, validation executor, runtime
state, or publishing implementation.

## Guidance Versus Automation

GNR8 guides rather than automates by:

- asking business questions before preparing generation intent;
- exposing confidence and missing knowledge;
- requiring human validation before downstream planning;
- turning conversations into governed artifacts;
- separating business decisions from technical execution;
- explaining risks and limitations before approval;
- preserving the Business Owner's authority over business meaning;
- keeping AI proposals downstream of approved contracts.

Automation may assist with evidence collection, projection, serialization,
evaluation, or reporting, but it must not own business approval. The Business
Owner remains accountable for deciding whether understanding is correct,
alignment is sufficient, design intent is acceptable, generation should begin,
compliance is acceptable, and publication should proceed.

## Future Vision

Future GNR8 should feel like working with an experienced digital
transformation consultant rather than operating a traditional website builder.

Business conversations should naturally produce governed architectural
artifacts.

The ideal experience is not that a human learns GNR8 internals. The ideal
experience is that GNR8 helps the human understand the business more clearly,
make better digital decisions, approve those decisions with confidence, and
evolve the business's digital experiences over time.
