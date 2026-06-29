# GNR8 Knowledge And Understanding Specification

## Phase And Boundary

Phase DBT-1 defines the canonical knowledge model for the Digital Business
Twin.

This phase is documentation and specification only. It adds no implementation,
TypeScript, schema, persistence, API, UI, workers, AI integration, connectors,
provider adapters, prompts, generated output, or publishing behavior.

The goal of DBT-1 is not to define connectors or databases. The goal is to
define the knowledge model every future connector, validator, AI provider,
Generation Package, projection, and Digital Business Twin version must obey.

Phase DBT-2 adds the Business Domain Model that composes the Digital Business
Twin. Business Domains own business knowledge. Experience Domains own
manifestations. Generation Packages own orchestration targets derived from
DBT-backed Experience Domains.

Phase DBT-3 adds Business Intent as the governed outcome layer between the
Digital Business Twin and Experience Domains. Business Intent describes what
the business wants to achieve before any specific manifestation or Generation
Package is selected.

## Constitutional Rule

GNR8 must never confuse observation, truth, interpretation, knowledge,
understanding, projection, generated content, and publication.

The Digital Business Twin is the governed integration of validated knowledge.
It is not raw evidence, not a connector payload, not a prompt, not generated
content, and not a published artifact.

## Knowledge Hierarchy

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

Each layer may only derive from the layer above it through explicit lineage,
validation, confidence propagation, and governance.

## Layer Definitions

### Reality

Reality is the actual business, its operations, identity, constraints,
audiences, channels, products, services, content, relationships, and public or
private expressions.

Reality exists outside GNR8. GNR8 can observe it, model it, validate claims
about it, and project from it, but GNR8 does not create reality by storing a
record or generating output.

### Evidence

Evidence is an immutable captured observation or source record with provenance.

Evidence may come from a website, brand book, CRM, commerce system, knowledge
base, support platform, human interview, document, image, video, or future
source. Evidence records what was observed, where it came from, when it was
captured, how it was captured, and what limitations or quality issues apply.

Evidence is not a fact by itself. Evidence can be incomplete, stale,
conflicting, noisy, misleading, or low quality. Evidence becomes useful to the
DBT only through classification, validation, lineage, and governance.

Evidence is immutable. If reality changes or a source is recaptured, GNR8
records new evidence rather than rewriting old evidence.

### Fact

A Fact is a specific claim about the business that is directly backed by one
or more evidence records.

A Fact must include evidence lineage, freshness context, validation status,
confidence, and any known uncertainty. Facts can be current, historical,
superseded, contradicted, or disputed, but they must not be unsupported
guesses.

The DBT never stores guesses as facts.

### Inference

An Inference is a deterministic or governed derivation from evidence and
facts.

An Inference may identify a likely relationship, category, purpose, audience,
constraint, or meaning that is not stated directly in a single evidence item.
Inference must remain traceable to its source facts and evidence, carry
confidence, and remain distinguishable from direct fact.

### Interpretation

An Interpretation is a meaning-bearing explanation derived from facts,
evidence, and inferences.

Interpretations may explain why something matters, how source signals relate,
what a page section appears to communicate, what a brand voice suggests, or
what customer behavior may imply. Interpretations are derived and therefore
must remain separate from evidence and facts.

An Interpretation can be accepted, rejected, revised, superseded, or marked as
limited through governance.

### Knowledge

Knowledge is validated interpretation.

Knowledge is interpretation that has passed validation against evidence,
facts, constraints, confidence thresholds, domain rules, and governance
requirements. Knowledge may still carry uncertainty, but its uncertainty is
explicit and bounded.

Knowledge is the first layer that GNR8 can use as reliable business meaning
for planning, validation, and projection.

### Understanding

Understanding is integrated knowledge.

Understanding combines validated knowledge across domains, resolves
relationships, records conflicts and limitations, and exposes what GNR8 can
safely act on. Understanding is broader than a single fact or domain insight:
it is the coherent, governed picture of the business and its digital identity.

Understanding includes what is known, why it is known, where it came from, how
confident GNR8 is, what remains unknown, what is blocked, and what requires
human approval.

### Digital Business Twin

The Digital Business Twin is the versioned, governed, provider-neutral
integration of domain understanding.

The DBT contains validated domain knowledge, integrated understanding,
lineage, confidence, uncertainty, limitations, governance state, and approved
relationships. It may reference evidence, facts, interpretations, projections,
and published manifestations, but it does not collapse them into one undivided
blob.

The DBT is the canonical operational understanding of the business and its
digital identity.

### Projection

A Projection is a bounded, purpose-specific view derived from the DBT.

Generation Packages are projections. Read models, validation packages, channel
packages, support packages, sales packages, campaign packages, and future
package families are projections. A projection must declare its source DBT
version, governing Business Intent, intended use, scope, included knowledge,
excluded knowledge, confidence, limitations, validation requirements, and
governance requirements.

Projections are not the source of truth.

### Business Intent

Business Intent is the governed description of the business outcome that the
organization wants to achieve.

Business Intent is derived from DBT understanding and validated before it can
drive Experience Domains or Generation Packages. It records desired outcome,
success criteria, priority, audience impact, constraints, evidence lineage,
confidence, version, and human governance state. It is not a website, UI,
prompt, code, AI output, or project plan.

### External AI

External AI systems receive projections or provider-specific serializations of
projections. They may generate proposals, drafts, variants, explanations,
layouts, copy, code, or other outputs.

External AI never changes truth directly. AI output does not become evidence,
fact, knowledge, DBT state, or published artifact merely because a model
created it.

## Canonical Concepts

| Concept | Canonical Definition |
| --- | --- |
| Evidence | Immutable observed source material with provenance, capture context, quality, limitations, and lineage. |
| Fact | Evidence-backed claim about the business, source, channel, asset, relationship, or constraint. |
| Inference | Traceable derivation from evidence and facts that remains distinct from direct fact. |
| Interpretation | Meaning-bearing explanation derived from facts, evidence, and inferences. |
| Knowledge | Validated interpretation that can be used as governed business meaning. |
| Understanding | Integrated knowledge across domains, including relationships, conflicts, limitations, and safe action boundaries. |
| Business Intent | Governed description of the business outcome that the organization wants to achieve. |
| Projection | Bounded purpose-specific view derived from the DBT for validation, generation, review, execution, or publication workflows. |
| Suggestion | A non-authoritative proposal for possible interpretation, enrichment, correction, or action. |
| Generated Output | Content, code, design, layout, copy, media, or structured material produced by an AI model or generation system. |
| Validation | The process of checking evidence, facts, interpretations, knowledge, projections, or generated outputs against lineage, rules, constraints, confidence, and governance. |
| Truth | Governed state GNR8 is allowed to treat as authoritative for a versioned context, always backed by lineage and validation. |
| Uncertainty | Explicit record of ambiguity, conflict, incompleteness, staleness, insufficient confidence, or unresolved governance. |
| Confidence | A bounded assessment of reliability derived from source quality, evidence agreement, validation, recency, domain rules, and governance. |
| Lineage | The complete trace from reality observation through evidence, facts, interpretations, knowledge, understanding, DBT version, projection, AI output, validation, approval, and publication. |
| Governance | Human and system authority model that decides what is accepted, rejected, deferred, superseded, approved, or publishable. |

## Business Domain Model

Under DBT-2, Understanding is organized into Business Domains. These are
stable business knowledge boundaries, not connector families, storage shape,
prompts, provider payloads, generated code, or websites.

| Business Domain | Domain Knowledge Produced |
| --- | --- |
| Business Identity | Stable identity, locations, operating scope, public identity, identity confidence, and identity conflicts. |
| Brand | Positioning, promise, voice, tone, visual rules, trust constraints, prohibited usage, and approved brand knowledge. |
| Offerings | Products, services, scope, specifications, pricing context, availability, claims, proof, and offering limitations. |
| Audience | Segments, buyers, users, stakeholders, jobs-to-be-done, needs, objections, accessibility needs, and audience confidence. |
| Goals | Business goals, channel goals, conversion goals, support goals, quality bars, acceptance criteria, and priority. |
| Relationships | Cross-domain connections among entities, offerings, audiences, assets, channels, claims, source systems, validations, approvals, and manifestations. |
| Knowledge | Approved policies, procedures, answers, explanations, reference material, internal expertise, and knowledge gaps. |
| Assets | Media, documents, logos, downloads, source locations, usage rights, licenses, provenance, and asset limitations. |
| Compliance | Legal, privacy, security, accessibility, regulated claims, jurisdictional limits, approval obligations, and publication blockers. |
| Sales | Sales process, pipeline, buyer journey, objections, account context, commercial constraints, and sales enablement needs. |
| Marketing | Campaigns, channels, messaging variants, proof points, creative constraints, conversion intent, and channel strategy. |
| Operations | Locations, hours, fulfillment, delivery model, capacity, inventory context, process dependencies, and operational limitations. |
| Analytics | Metrics, events, conversions, funnels, attribution limits, data quality, performance signals, and confidence adjustments. |
| Support | Support topics, escalation paths, known issues, allowed answers, sentiment, recurring pain points, and support limitations. |
| Digital Presence | Channel inventory, public profiles, domain ownership, reputation signals, channel roles, and cross-channel relationships. |
| Future Domains | Future stable business concerns that produce validated domain knowledge without changing the DBT identity. |

Fundamental Business Domains are Business Identity, Brand, Offerings,
Audience, Goals, Relationships, Knowledge, Assets, and Compliance. Optional
Business Domains include Sales, Marketing, Operations, Analytics, Support,
Digital Presence, and Future Domains.

Each Business Domain produces domain knowledge. The DBT integrates domain
knowledge into cross-domain understanding. No domain owns the whole truth by
itself.

Connectors may feed one or more Business Domains, but connectors are not
domains. Databases may store evidence or derived state in future phases, but
storage shape is not the knowledge model.

Experience Domains are projection-only boundaries. Website, Landing Page,
Customer Portal, Mobile App, Marketplace, Documentation, Campaign,
Newsletter, Chatbot, Sales Deck, and Future Experiences describe
manifestations of business knowledge. They consume Business Domains through
the DBT and may produce feedback evidence, but they do not own canonical
business truth.

Business Intent is the governed bridge between DBT understanding and
Experience Domain projection. It owns desired outcomes, not knowledge
ownership, manifestation, provider serialization, generated output, execution
state, or publishing state.

## Truth Model

The canonical truth model is:

- Evidence is immutable.
- Facts are evidence-backed.
- Interpretations are derived.
- Knowledge is validated interpretation.
- Understanding is integrated knowledge.
- The DBT is governed, versioned understanding.
- Business Intent owns desired outcomes.
- Generation Packages are projections.
- AI outputs are proposals.
- Published artifacts are approved manifestations.

Truth in GNR8 is not "whatever the latest source said" and not "whatever the
model generated." Truth is governed, lineage-preserving, validation-backed,
and version-aware.

When evidence conflicts, GNR8 records the conflict. When confidence is too
low, GNR8 records uncertainty. When a human decision is required, GNR8 records
the governance requirement. When a generated output is useful, GNR8 records it
as a proposal until validation and approval promote it to a manifestation.

## Confidence Model

Confidence propagates down the hierarchy and can never legitimately improve
without a reason.

```text
Evidence
-> Fact
-> Knowledge
-> Twin
-> Business Intent
-> Experience Domain
-> Generation Package
```

Evidence confidence is based on source authority, capture quality, recency,
completeness, provenance, and observed limitations.

Fact confidence is based on evidence confidence, evidence agreement,
specificity, freshness, and validation against source rules.

Knowledge confidence is based on fact confidence, inference quality,
interpretation validation, domain rules, conflict resolution, and governance.

Twin confidence is based on integrated knowledge confidence across domains,
relationship consistency, unresolved uncertainty, stale areas, limitations,
and approval state.

Business Intent confidence is based on source DBT confidence, outcome clarity,
evidence support, success criteria, conflict resolution, constraints,
limitations, and approval state.

Experience Domain confidence is based on source DBT confidence, Business
Intent confidence, manifestation scope, audience fit, channel constraints,
excluded knowledge, limitations, and approval requirements.

Generation Package confidence is based on source DBT confidence, Business
Intent confidence, Experience Domain confidence, projection scope, excluded
knowledge, required assumptions, validation criteria, and approval
requirements.

Low-confidence upstream material must lower downstream confidence or become an
explicit limitation. A projection may narrow scope to preserve confidence, but
it must not hide uncertainty.

## Digital Business Twin Inclusion Rules

The Digital Business Twin may contain:

- validated facts and their evidence lineage;
- validated interpretations promoted to knowledge;
- integrated domain understanding;
- confidence and uncertainty;
- relationships among business entities, audiences, assets, channels,
  constraints, goals, and source systems;
- versioned historical state;
- approved governance decisions;
- limitations, blockers, conflicts, and stale markers;
- references to evidence, projections, AI proposals, validations, approvals,
  and published manifestations.

The Digital Business Twin must never contain:

- unsupported guesses recorded as facts;
- raw connector payloads as canonical truth;
- provider-specific prompts;
- provider-specific API payloads;
- model settings;
- generated React;
- generated HTML;
- generated CSS;
- generated blocks;
- generated rewritten copy as canonical knowledge;
- executable code;
- deployment artifacts;
- publishing artifacts as source truth;
- transient worker state;
- unvalidated AI output as fact, knowledge, or understanding;
- private or regulated data without a future explicit governance and
  compliance boundary.

## AI-Generated Content

AI-generated content is any material produced by an AI model, provider,
generation system, or AI-assisted execution path.

AI-generated content includes generated copy, code, layout, components, HTML,
CSS, images, summaries, claims, plans, variants, recommendations, and
structured output.

AI-generated content is not evidence of reality unless it is later observed as
an approved published manifestation or explicitly entered through a governed
source. Even then, the evidence is the approved manifestation or governed
source record, not the model's private act of generation.

AI outputs are proposals. They must be validated against DBT knowledge,
projection scope, source evidence, constraints, acceptance criteria,
confidence, and human approval before they can influence publication.

## Published Artifacts

A published artifact is an approved manifestation of DBT-derived work in a
channel, product surface, document, website, campaign, assistant, or future
external expression.

Published artifacts can become new evidence about what GNR8 approved and
released. They do not replace the DBT as the source of truth.

## Validation Requirements

Validation must preserve layer boundaries:

- evidence validation checks provenance, capture quality, source identity,
  completeness, freshness, and limitations;
- fact validation checks that claims are supported by evidence;
- interpretation validation checks derivation quality, source agreement,
  domain rules, uncertainty, and conflicts;
- knowledge validation checks whether interpretation is reliable enough to
  guide action;
- understanding validation checks cross-domain consistency and safe action
  boundaries;
- projection validation checks scope, lineage, excluded areas, confidence,
  limitations, and acceptance criteria;
- generated output validation checks the output against the originating
  projection, DBT knowledge, evidence, constraints, and governance state;
- publication validation checks approval, auditability, channel rules, and
  release eligibility.

## Architectural Rules

- The DBT never stores guesses as facts.
- The DBT distinguishes evidence from interpretation.
- The DBT distinguishes facts from knowledge.
- The DBT distinguishes knowledge from generated content.
- The DBT distinguishes projections from source truth.
- The DBT records uncertainty instead of hiding it.
- The DBT records conflicts instead of flattening them.
- The DBT preserves lineage across every layer.
- The DBT is versioned and auditable.
- AI never changes truth directly.
- AI outputs remain proposals until validated and approved.
- Human governance remains authoritative.
- Published artifacts are approved manifestations, not the canonical source of
  business truth.

## Future Connector Obligation

Every future connector must declare what evidence it can provide, which
understanding domains it can inform, how source identity and capture context
are preserved, what quality and freshness limitations apply, and how conflicts
or uncertainty are surfaced.

No connector may bypass the knowledge hierarchy. A connector may supply
evidence. It may help derive facts or interpretations through future governed
logic. It may not directly write canonical DBT truth without validation,
lineage, confidence, and governance.

## Future Projection Obligation

Every future projection must declare the DBT version it derives from, the
knowledge included, the knowledge excluded, confidence boundaries, lineage,
limitations, validation requirements, and governance requirements.

Generation Packages are projections. They prepare work for external AI but do
not become truth, implementation, publication, or approval by themselves.
