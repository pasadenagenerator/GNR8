# The GNR8 Blueprint

## Introduction

The GNR8 Blueprint is the canonical architecture narrative for GNR8.

It is the preferred onboarding document before reading the detailed
specifications. It explains what GNR8 is, why it exists, how its layers work
together, and how the platform transforms business understanding into
governed digital experiences.

This document is not another specification. It introduces no new architecture
concepts, schemas, implementation plans, runtime behavior, prompts, provider
adapters, AI integrations, generation systems, publishing systems, or UI
surfaces. It reconciles the completed architecture families into one coherent
system narrative.

Canonical detailed references include:

- `docs/architecture/GNR8_ARCHITECTURE_MANIFESTO.md`
- `docs/architecture/DIGITAL_BUSINESS_TWIN_SPECIFICATION.md`
- `docs/architecture/GNR8_KNOWLEDGE_AND_UNDERSTANDING_SPECIFICATION.md`
- `docs/architecture/BUSINESS_DOMAIN_MODEL_SPECIFICATION.md`
- `docs/architecture/BUSINESS_INTENT_SPECIFICATION.md`
- `docs/architecture/BUSINESS_UNDERSTANDING_REPORT_SPECIFICATION.md`
- `docs/architecture/BUSINESS_ALIGNMENT_SPECIFICATION.md`
- `docs/architecture/BUSINESS_JOURNEY_SPECIFICATION.md`
- `docs/architecture/DECISION_ARCHITECTURE_SPECIFICATION.md`
- `docs/architecture/DECISION_ARTIFACT_AUTHORIZATION_MATRIX.md`
- `docs/architecture/CANONICAL_ARTIFACT_GOVERNANCE_STATE_MODEL.md`
- `docs/architecture/CANONICAL_ARTIFACT_LINEAGE_AND_VERSIONING_MODEL.md`
- `docs/architecture/WEBSITE_DESIGN_BRIEF_SPECIFICATION.md`
- `docs/architecture/WEBSITE_GENERATION_PACKAGE_SPECIFICATION.md`
- `docs/architecture/GENERATION_CONTRACT_COMPLIANCE_SPECIFICATION.md`
- `docs/architecture/GENERATION_CONTRACT_COMPLIANCE_REPORT_SPECIFICATION.md`
- `docs/architecture/BUSINESS_APPROVAL_SPECIFICATION.md`
- `docs/architecture/PUBLISH_GOVERNANCE_ARCHITECTURE.md`

## Vision

GNR8 is an AI Orchestrator with a governed Digital Business Twin at its core.

GNR8 exists to understand businesses and their digital identities deeply
enough to prepare governed, source-grounded projections for external AI
systems, validate the results, route the results through Business Approval,
and publish only Business Approved outputs.

GNR8 is not a traditional website builder.

GNR8 is not a CMS.

GNR8 is not a generic page editor.

A business exists independently of any website. A website is only one
expression of the business. The Digital Business Twin represents the business
itself.

The long-term purpose of GNR8 is not to generate a website once. The purpose
is to preserve and improve governed business understanding over time, then use
that understanding to produce, evaluate, approve, publish, and evolve digital
experiences.

## The Core Problem

Most digital tooling begins too late.

Traditional CMSs assume the business already knows what to say, how to
structure it, which experiences matter, which audiences should be served, and
which business outcomes should guide change. They store and publish content,
but they do not become the governed operational understanding of the business.

Traditional website builders make website construction easier, but they still
center pages, blocks, templates, styling, and manual editing. They may help a
person create an expression of a business, but they do not preserve the
business itself as the source of truth.

Generic AI builders can generate quickly, but speed is not understanding.
Prompt-first generation can collapse evidence, business truth, desired
outcomes, experience intent, provider behavior, and generated output into one
unstable boundary. That creates impressive drafts without a durable answer to
what was known, why it was believed, who approved it, what contract the output
was meant to satisfy, and whether the final result is acceptable to the
business.

GNR8 solves this problem by making understanding the product center.

Generation without understanding is prohibited.

Generated websites are outputs, not the long-term source of truth.

## Core Philosophy

GNR8 separates Business, Experience, Generation, and Implementation.

Business understanding defines intent.

Website Design Brief defines experience.

Website Generation Package defines generation.

GNR8 owns contractual meaning.

External AI owns implementation proposals.

Compliance determines contractual fulfillment.

Generation Contract Compliance Report communicates contractual fulfillment for
Business Approval.

GNR8 communicates contractual truth before publishing.

GNR8 publishes only after governed business approval.

AI proposes; humans approve.

The orchestrator owns the task; the model executes it.

GNR8 must remain model-agnostic.

Every artifact exists to support a human business decision. No artifact exists
without an authorizing business decision. Artifacts are authorized, never
assumed.

## The Five Architectural Layers

The canonical layered architecture is:

```text
Reality
-> Knowledge
-> Decision
-> Experience
-> Execution
```

These five layers are an onboarding view of the existing canon. They do not
replace the detailed specifications, artifact names, governance models, or
lifecycle steps.

### Reality Layer

Responsibility: preserve the distinction between the actual business and any
record, model, website, generated output, or publication.

Reality is the actual business: its operations, identity, constraints,
audiences, channels, products, services, content, relationships, and public or
private expressions.

GNR8 can observe reality, model it, validate claims about it, and project from
it. GNR8 does not create reality by storing a record or generating output.

In this layer:

- a business exists independently of any website;
- evidence is captured from source material and human input;
- evidence is immutable;
- source observations preserve provenance, quality, limitations, and capture
  context;
- old evidence is not rewritten when reality changes.

### Knowledge Layer

Responsibility: transform observed evidence into governed understanding.

The canonical knowledge hierarchy is:

```text
Reality
-> Evidence
-> Facts
-> Interpretations
-> Knowledge
-> Understanding
-> Digital Business Twin
-> Projections
-> External AI
```

Evidence is immutable. Facts are evidence-backed. Interpretations are derived.
Knowledge is validated interpretation. Understanding is integrated knowledge.

The Digital Business Twin is the canonical operational understanding of a
business and its digital identity. It is deterministic, versioned,
evidence-backed, provider-neutral, model-independent, continuously evolving,
and human-governed.

Business Domains own knowledge. Business Intent owns desired outcomes.
Experience Domains own manifestations.

The Knowledge Layer does not store generated code, prompts, provider payloads,
published artifacts, transient worker state, or unsupported guesses as
canonical truth.

### Decision Layer

Responsibility: govern which business decisions are allowed, when they are
allowed, which artifacts authorize them, and what new artifacts they
authorize.

Decision Architecture governs business decisions.

It never governs implementation.

Decision Architecture is the operational backbone of GNR8. It is a
deterministic governance model describing how business decisions progress
through canonical artifacts while preserving lineage and human authority.

The compact decision lifecycle is:

```text
Evidence
-> Understanding
-> Decision
-> Artifact
-> Next Decision
```

The Decision Layer includes:

- Decision Architecture;
- Decision Artifact Authorization Matrix;
- Canonical Artifact Governance State Model;
- Canonical Artifact Lineage and Versioning Model;
- Business Approval as the final business governance checkpoint before
  Publish.

Authorization preserves trust, lineage, and governance. Governance State
describes artifact maturity and approval status. Lineage preserves history.
Versioning preserves evolution.

### Experience Layer

Responsibility: translate governed business understanding into human-readable
experience intent without collapsing into implementation.

The Business Journey is the canonical human experience of GNR8.

The Business Journey is not a UI flow.

It is not a wizard.

It is not a sequence of screens.

It is the governed human experience through which a business progressively
transforms its business understanding into approved digital experiences.

The Experience Layer includes the human-facing and experience-intent
transformation from Business Understanding Report through Business Alignment
and Website Design Brief.

The Business Understanding Report is the first human-facing projection of the
Digital Business Twin. It makes GNR8's current understanding readable and
reviewable by humans before downstream planning.

Business Alignment confirms or improves the Digital Business Twin before
downstream planning begins.

The Website Design Brief is the canonical business-to-experience bridge. It
defines the intended business expression of a website without prescribing
implementation.

### Execution Layer

Responsibility: convert approved experience intent into provider-neutral
generation contracts, external AI proposals, compliance evidence, business
approval, and governed publishing.

The Website Generation Package is the canonical generation contract. It is
not a prompt, provider payload, React, HTML, implementation, published
website, execution artifact, deployment artifact, or runtime state.

Provider adapters serialize the Website Generation Package for external AI.
They never redefine meaning.

External AI systems are execution engines. They may generate proposals,
drafts, variants, explanations, layouts, copy, code, or other outputs. They
are not sources of business truth.

Generation Contract Compliance evaluates whether the generated website
satisfies the Website Generation Package. It evaluates contractual
fulfillment, not implementation technology, provider quality, prompt quality,
or subjective preference.

Business Approval accepts or rejects the business consequence of contractual
fulfillment. It approves business intent. It never approves implementation
technology, prompts, or providers.

Publish is governed promotion of approved versions into an environment.
Publishing is the consequence of Business Approval, not the act of generation.

## Digital Business Twin

The Digital Business Twin is the center of GNR8 because it preserves what the
business is, what is known, why it is known, where knowledge came from, how
confident GNR8 is, what remains uncertain, and which decisions have governed
the business's digital evolution.

The DBT is not a bag of connector records. It is the governed integration of
validated Business Domain knowledge.

The DBT is not a prompt.

The DBT is not generated content.

The DBT is not a published artifact.

The DBT is not a website model.

The DBT allows GNR8 to treat every digital experience as a manifestation of
business understanding rather than as the source of truth. That is why future
websites, landing pages, campaigns, portals, documentation, chatbots, sales
materials, training materials, and future package families can all be
projections of the same business understanding.

When reality changes, the DBT evolves through new evidence, revised facts,
validated interpretations, updated knowledge, improved understanding, human
governance, and preserved lineage. It does not mutate history silently.

## Business Journey

The Business Journey guides the Business Owner from first conversation to
approved digital experience.

The canonical journey stages are:

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

The Business Journey exists above UI and application navigation. It describes
business confidence, clarity, decision sequence, and governance path.

The system guides.

The human decides.

This lets GNR8 feel less like operating software and more like working through
a governed digital transformation process. The Business Owner does not need to
think in terms of screens, forms, prompts, providers, frameworks, or
implementation mechanics. The Business Owner reviews understanding, corrects
what is wrong, approves what is aligned, and decides whether the business
consequence of a generated proposal is acceptable.

## Decision Architecture

Decision Architecture governs evolution by making every business progression
explicit, authorized, lineage-aware, and reversible through governance rather
than mutation.

It answers:

- which business decisions exist;
- who may own or contribute to those decisions;
- which artifacts provide evidence for each decision;
- which prerequisites must be satisfied before a decision is allowed;
- which new artifacts a decision may authorize;
- how repeated decisions preserve lineage;
- how human authority remains separate from AI proposals.

Decision Architecture is graph-based rather than linear. Decisions may repeat,
branch, return to earlier understanding, authorize revised artifact versions,
or block downstream progression.

This is how GNR8 avoids becoming a blind pipeline. The important question is
not "what task runs next?" but "what business decision is allowed now, and
what lineage does it create?"

The governance architecture after Decision Architecture is:

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

## Generation Architecture

Generation in GNR8 is bounded by business understanding, experience intent,
and contract compliance.

The transformation from understanding to generation is:

```text
Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
```

The Website Design Brief transforms aligned business understanding into
website experience intent. It explains what the website should express,
communicate, prioritize, and make possible for users.

The Website Generation Package transforms approved experience intent into a
deterministic, immutable, provider-neutral, versioned, lineage-aware
generation contract. It describes exactly what external generation systems
must create, what business meaning they must preserve, which constraints they
must not violate, and how GNR8 will evaluate the result.

Provider adapters transform the package into provider-specific serialization
formats. Those serializations are disposable adapter projections. They do not
own meaning.

External AI generates proposals. Those proposals are evaluated. They do not
become canonical merely because they were generated.

## Governance

Governance makes GNR8 trustworthy.

The governing principles are:

- Every artifact exists to support a human business decision.
- No artifact exists without an authorizing business decision.
- Artifacts are authorized, never assumed.
- Every canonical artifact has a governance state.
- Governance State is independent of provider, implementation, runtime, UI,
  generation, and publishing.
- Business history is immutable.
- Every governed artifact preserves lineage.
- Versioning refines understanding; lineage preserves evolution.
- AI proposes; humans approve.
- Approval precedes publishing.

Governance applies across the complete chain from evidence to publication.
This means a generated website cannot bypass the DBT, Business Understanding
Report, Business Alignment, Website Design Brief, Website Generation Package,
Compliance Report, or Business Approval.

## External AI

External AI providers are execution engines rather than sources of business
truth.

GNR8 may route work to OpenAI, Claude, Gemini, Codex, Stitch, v0, or future
providers, but no provider becomes canonical. No prompt becomes canonical. No
model output becomes truth because a model created it.

The orchestrator owns the task; the model executes it.

External AI may generate implementation proposals. GNR8 owns the meaning those
proposals must satisfy, the lineage that explains why the work was requested,
the compliance process that evaluates whether the proposal fulfilled the
contract, and the Business Approval boundary that decides whether publishing
may proceed.

This is why GNR8 must remain model-agnostic. Provider capabilities can evolve
without changing the business truth, artifact chain, governance model, or
approval requirements.

## Publishing

Publishing is governed promotion of approved versions into an environment.

Publish is not direct mutation.

Publish may only act after Business Approval authorizes it.

Business Approval decides whether publishing is allowed. Publishing executes
the approved promotion path.

Canonical publish governance follows the principles:

- understand before change;
- proposal before mutation;
- approval before publish;
- version before overwrite;
- rollback before risk;
- observe before optimize.

Publishing does not make generated output canonical truth. Publishing makes
an approved manifestation available through a governed environment while
preserving its upstream lineage, approval, compliance evidence, generation
contract, experience intent, business alignment, and Digital Business Twin
context.

## Canonical Lifecycle

The complete canonical lifecycle is:

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
-> Continuous Evolution
```

### Reality

The actual business exists before GNR8 models it and before any website
expresses it.

### Business Discovery

GNR8 gathers business context through guided conversation and governed source
understanding. Discovery identifies what the business is, what it offers, who
it serves, what it wants to achieve, what is known, what is uncertain, and
what must be clarified.

### Digital Business Twin

GNR8 integrates validated knowledge into the canonical operational
understanding of the business and its digital identity.

### Business Understanding Report

GNR8 presents its current understanding in a human-readable, evidence-backed,
provider-neutral projection so humans can inspect, trust, correct, or reject
understanding before planning.

### Business Alignment

Humans confirm or improve the Digital Business Twin. Alignment validates
business understanding, not websites or AI outputs.

### Website Design Brief

GNR8 transforms aligned business understanding into website experience intent.
The brief defines what the website should express, communicate, prioritize,
and make possible for users.

### Website Generation Package

GNR8 converts approved experience intent into the canonical provider-neutral
generation contract.

### Provider Adapter

The provider adapter serializes the Website Generation Package for a specific
external AI provider without redefining meaning.

### External AI

External AI executes the package serialization and returns an implementation
proposal.

### Generation Contract Compliance

GNR8 evaluates the generated proposal against the originating Website
Generation Package.

### Generation Contract Compliance Report

GNR8 communicates contractual fulfillment, deviations, risks, limitations,
recommendations, lineage, and readiness for Business Approval.

### Business Approval

The business accepts, accepts with limitations, rejects, regenerates, returns
to alignment, or blocks publication based on governed business consequences.

### Publish

GNR8 promotes only Business Approved output through governed publishing.

### Continuous Evolution

The business continues to change. New evidence, goals, constraints,
performance signals, market conditions, offers, audiences, and human
priorities can return the system to discovery, understanding, alignment,
briefing, generation, compliance, approval, publishing, or future evolution.

## Continuous Evolution

GNR8 continuously evolves businesses rather than websites because the Digital
Business Twin remains the long-term source of truth.

A website may be published, replaced, regenerated, revised, or superseded. The
business history remains. The DBT preserves what was known, what changed, who
approved it, which artifacts were superseded, which generated proposals were
accepted or rejected, and why a later experience exists.

Continuous evolution means:

- reality can be re-observed;
- evidence can be added without rewriting history;
- facts can be confirmed, contradicted, or superseded;
- interpretations can be accepted, rejected, or revised;
- knowledge can improve;
- understanding can deepen;
- Business Intent can change;
- Experience Domains can shift;
- Website Design Briefs can be revised;
- Website Generation Packages can be regenerated;
- external AI proposals can be compared;
- compliance can reveal gaps;
- Business Approval can authorize publication, regeneration, or return to
  alignment;
- published experiences can be superseded without erasing their history.

The product outcome is not a static website. The product outcome is governed
business evolution expressed through digital experiences.

## Future Vision

The future GNR8 platform should allow any historical digital experience to be
reconstructed from governed lineage without ambiguity.

That future depends on the architecture described here:

- Reality remains distinct from models and outputs.
- Knowledge remains evidence-backed and governed.
- Decisions remain human-authorized and lineage-aware.
- Experiences remain projections of aligned business understanding.
- Execution remains provider-neutral, contract-governed, and model-agnostic.

As new providers, channels, connectors, artifacts, and digital experience
families emerge, they should enrich or project from the same architecture
instead of replacing it.

## Long-Term Principles

The long-term principles of GNR8 are:

- GNR8 is an AI Orchestrator with a governed Digital Business Twin at its
  core.
- The Digital Business Twin is the canonical operational understanding of a
  business and its digital identity.
- A business exists independently of any website.
- A website is only one expression of the business.
- The Digital Business Twin represents the business itself.
- Business Domains own knowledge.
- Business Intent owns desired outcomes.
- Experience Domains own manifestations.
- GNR8 guides businesses through understanding before generation.
- Conversation replaces unnecessary software complexity.
- The Business Journey is the canonical human experience of GNR8.
- The Business Journey is not a UI flow.
- GNR8 is governed by decisions rather than workflows.
- Decision Architecture governs business decisions.
- Decision Architecture never governs implementation.
- Artifacts exist to support business decisions.
- No artifact exists without an authorizing business decision.
- Every canonical artifact has a governance state.
- Business history is immutable.
- Every governed artifact preserves lineage.
- Versioning refines understanding; lineage preserves evolution.
- Generated websites are outputs, not the long-term source of truth.
- Generation without understanding is prohibited.
- GNR8 always validates understanding before generation.
- GNR8 never optimizes for generation speed.
- GNR8 optimizes for business understanding quality.
- Business understanding defines intent.
- Website Design Brief defines experience.
- Website Generation Package defines generation.
- The Website Generation Package is the canonical generation contract.
- Provider prompts are disposable projections.
- GNR8 owns meaning.
- Providers own implementation.
- GNR8 owns contractual meaning.
- External AI owns implementation proposals.
- Compliance determines contractual fulfillment.
- Generation Contract Compliance Report communicates contractual fulfillment
  for Business Approval.
- GNR8 publishes only after governed business approval.
- Business approval accepts contractual fulfillment, not implementation
  technology.
- Generation quality is measured by contract compliance, not by
  implementation technology.
- AI proposes; humans approve.
- The orchestrator owns the task; the model executes it.
- GNR8 must remain model-agnostic.
- AI outputs are proposals.
- Published artifacts are approved manifestations.

