# Business Intent Specification

## Phase And Boundary

Phase DBT-3 defines Business Intent as the canonical bridge between the
Digital Business Twin and Experience Domains.

This phase is documentation and specification only. It adds no implementation,
TypeScript, schema, persistence, API, UI, workers, connectors, AI integration,
provider adapters, prompts, generated output, execution state, or publishing
behavior.

The Digital Business Twin describes what the business is. Business Intent
describes what the business wants to achieve. Experience Domains describe where
that intent will be expressed. Generation Packages describe how a specific
experience should be generated for external AI systems.

## Canonical Definition

Business Intent is the governed description of the business outcome that the
organization wants to achieve.

Business Intent is:

- provider-neutral;
- evidence-backed;
- versioned;
- human-governed;
- independent of implementation.

Business Intent is not:

- website;
- UI;
- prompt;
- code;
- AI output;
- project plan.

Business Intent is not a technology request. It is the governed expression of
desired business outcome, success criteria, priority, constraints, audience
impact, evidence, confidence, and approval state.

## Constitutional Rule

The Digital Business Twin knows what the business is.

Business Intent knows what the business wants.

Experience Domains know where that intent will be expressed.

Generation Packages know how to describe one specific experience for external
AI execution.

No future architecture may collapse these layers into a website-first,
prompt-first, provider-first, or implementation-first model.

## Canonical Relationship Model

The canonical DBT-3 architecture is:

```text
Reality
-> Business Domains
-> Digital Business Twin
-> Business Intent
-> Experience Domain
-> Generation Package
-> Provider Adapter
-> External AI
-> Validation
-> Human Approval
-> Publishing
```

Reality is the actual business. Business Domains organize evidence-backed
knowledge. The Digital Business Twin integrates that knowledge into governed
understanding. Business Intent selects and governs desired outcomes from that
understanding. Experience Domains decide where the intent should be expressed.
Generation Packages become provider-neutral orchestration targets for one
specific Experience Domain under one or more Business Intents. Provider
Adapters serialize packages. External AI generates proposals. Validation checks
the proposals against the DBT, Intent, Experience Domain, and Generation
Package. Humans approve. Publishing promotes approved manifestations.

## Intent Categories

Intent categories are examples, not a fixed taxonomy. A business may introduce
new categories when a governed outcome cannot be represented clearly by the
current examples.

| Intent Category | Outcome It Describes |
| --- | --- |
| Sales | Increase revenue, improve deal velocity, support sales enablement, or move qualified buyers toward purchase. |
| Lead Generation | Capture, qualify, nurture, or route prospective customers. |
| Brand Awareness | Improve recognition, trust, positioning clarity, recall, or market presence. |
| Recruitment | Attract, inform, qualify, and convert potential employees or contributors. |
| Customer Support | Reduce support burden, improve answer quality, guide escalation, and resolve recurring issues. |
| Education | Teach customers, employees, partners, or communities how to understand, use, or trust the business and its offerings. |
| Commerce | Drive product discovery, comparison, cart action, purchase confidence, or repeat buying. |
| Customer Self-Service | Let customers accomplish tasks, answer questions, manage account needs, or complete workflows without direct staff intervention. |
| Partner Enablement | Equip partners with approved positioning, materials, explanations, offers, constraints, and co-selling context. |
| Internal Operations | Improve internal clarity, onboarding, coordination, process execution, or operational consistency. |
| Compliance | Communicate regulated claims, approval requirements, policies, accessibility obligations, privacy rules, or jurisdictional limits. |
| Community | Build participation, belonging, advocacy, engagement, contribution, or shared identity. |
| Future Intents | Future governed outcomes that may be added without changing the DBT identity. |

The category helps classification and discovery. It does not replace the
specific governed outcome.

## Intent Versus Experience

Intent is why the business acts. Experience is where the intent is expressed.

An Intent should be phrased as an outcome, not as a deliverable.

| Business Intent | Possible Experience Domain |
| --- | --- |
| Increase qualified leads | Website |
| Reduce support costs | Knowledge Base |
| Employee onboarding | Training Portal |
| Increase sales conversion | Website, Landing Page, Sales Deck, Email Campaign |

One Business Intent may project into many Experience Domains. For example,
"Increase sales conversion" may require a website, a landing page, a sales
deck, an email campaign, and a partner one-pager. Those experiences share the
same desired outcome but have different audiences, constraints, formats,
validation checks, and generation needs.

One Experience Domain may satisfy multiple Business Intents. A website may
support lead generation, brand awareness, customer support, recruitment,
commerce, and compliance at the same time. The Website Experience Domain owns
the manifestation boundary. It does not own the Intent.

## Intent Composition

A business may have multiple active Business Intents at the same time.

Business Intents can coexist, reinforce each other, compete with each other,
or require human prioritization. For example, "increase qualified leads" may
coexist with "reduce support costs"; both can shape the same website, but they
may require different calls to action, content hierarchy, support affordances,
and validation rules.

Experiences may satisfy multiple intents. A single Experience Domain can
declare the Intents it serves, the relative priority of those Intents, and the
conflicts or limitations that affect expression.

Generation Packages are created for one specific Experience Domain within one
or more Business Intents. A Website Generation Package for a lead-generation
website is not interchangeable with a Sales Deck Generation Package for the
same Intent. The Intent may be shared, but the Experience Domain and package
target differ.

## Intent Lifecycle And Evolution

Business Intents evolve as the business changes, evidence changes, human
priorities change, or validation reveals better outcomes.

An Intent may be:

- proposed from evidence, domain knowledge, human input, performance data, or
  strategic context;
- accepted, rejected, deferred, superseded, or retired through governance;
- versioned when its outcome, scope, priority, audience, constraints, success
  criteria, or validation requirements change;
- linked to one or more Experience Domains;
- validated against evidence, DBT state, constraints, published outcomes, and
  human approval;
- marked stale when the underlying DBT version, source evidence, market
  context, or human priority changes.

Intent evolution never silently mutates published output, generated content,
provider payloads, or Experience Domain state. It creates a new governed
Intent version or a new projection requirement.

## Intent Validation

Business Intent is validated before it can drive Experience Domains or
Generation Packages.

Intent validation checks:

- evidence lineage: the Intent is backed by evidence, knowledge, human input,
  or governed strategy;
- DBT alignment: the desired outcome is consistent with known Business
  Domains, constraints, relationships, and limitations;
- outcome clarity: the Intent describes a business outcome rather than a
  channel, UI request, prompt, or task list;
- audience fit: affected audiences, buyers, users, employees, partners, or
  communities are known or explicitly uncertain;
- success criteria: the organization can judge whether the Intent has been
  satisfied;
- conflict detection: competing Intents, compliance limits, brand risks,
  operational limits, or unsupported claims are recorded;
- confidence: low-confidence inputs become limitations or governance
  requirements;
- version and lineage: the source DBT version, evidence, decisions, and human
  approvals are traceable;
- human governance: the Intent is accepted, rejected, deferred, revised, or
  approved by an authorized human process.

Validation does not mean the business outcome is guaranteed. It means GNR8 is
allowed to treat the Intent as a governed objective for projection,
generation-package preparation, validation, and approval workflows.

## Architectural Rules

Business Intent never contains:

- prompts;
- provider payloads;
- generated HTML;
- generated React;
- generated content;
- publishing artifacts;
- execution state.

Business Intent owns desired outcomes.

Experience Domains own manifestations.

Generation Packages own orchestration targets.

Provider Adapters own serialization.

External AI owns proposal generation.

Validation owns conformance checks.

Human Approval owns authorization.

Publishing owns approved release, not truth creation.

Business Intent must remain provider-neutral, evidence-backed, versioned,
human-governed, and independent of implementation.

## Relationship To Existing Artifacts

Business Intent fits around existing artifacts without replacing them.

| Existing Artifact | Relationship To Business Intent |
| --- | --- |
| Evidence | Supplies source observations, facts, performance signals, human statements, constraints, and limitations that can support or challenge an Intent. |
| Knowledge | Provides validated interpretation that can justify, constrain, prioritize, or revise an Intent. |
| Digital Business Twin | Integrates Business Domain knowledge and provides the governed understanding from which Intents are selected, validated, and versioned. |
| Generation Package | Translates one specific Experience Domain, under one or more Business Intents, into a provider-neutral orchestration target for external AI. |

The existing website-understanding chain can inform Intent, but it does not
own Intent:

```text
Website evidence
-> Discovery
-> Review
-> Reconstruction Package
-> StructurePlan
-> Digital Business Twin contribution
-> Business Intent
-> Website Experience Domain
-> Website Generation Package
```

Evidence can show what exists. Knowledge can explain what it means. The DBT
can integrate it into business understanding. Business Intent decides what
outcome the business wants to pursue. Experience Domains decide where that
outcome appears. Generation Packages prepare one expression for external AI.

## Differences From Adjacent Concepts

| Concept | Difference From Business Intent |
| --- | --- |
| Business Domain | Owns business knowledge such as Brand, Offerings, Audience, Goals, or Compliance. Intent uses that knowledge to define a desired outcome. |
| Digital Business Twin | Represents what the business is. Intent represents what the business wants to achieve. |
| Goal Domain | Supplies goal knowledge and success criteria inside the DBT. Business Intent is the governed selected outcome that can drive projections. |
| Experience Domain | Describes where Intent is manifested, such as Website, Knowledge Base, Training Portal, Sales Deck, or Email Campaign. |
| Generation Package | Describes how one specific Experience Domain should be generated or reconstructed for external AI under governance. |
| Prompt | Provider-specific serialization derived later by an adapter. Intent is provider-neutral and never a prompt. |
| Project Plan | Organizes tasks, dates, owners, or execution work. Intent describes desired business outcome and governance context. |
| AI Output | A generated proposal. Intent remains canonical only through evidence, validation, versioning, and human governance. |

## DBT-3 Outcome

At the end of DBT-3, the Digital Business Twin knows what the business is.

Business Intent knows what the business wants.

Experience Domains know where that intent will be expressed.

Generation Packages know how to describe that experience for external AI.
