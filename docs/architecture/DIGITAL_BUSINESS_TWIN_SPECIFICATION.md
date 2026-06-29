# Digital Business Twin Specification

## Phase And Boundary

Phase DBT-0 defines the canonical Digital Business Twin as documentation and
specification only.

Phase DBT-1 adds the canonical knowledge and understanding model that governs
what may enter the Digital Business Twin and how future connectors,
validators, projections, Generation Packages, and AI providers must treat
evidence, facts, interpretation, knowledge, understanding, and generated
output.

Phase DBT-2 adds the canonical Business Domain Model that composes the Digital
Business Twin. Business Domains describe the business. Experience Domains
describe manifestations of the business. Generation Packages are projections
of Experience Domains, not the source of truth.

Phase DBT-3 adds Business Intent as the canonical bridge between the Digital
Business Twin and Experience Domains. The Digital Business Twin describes what
the business is. Business Intent describes what the business wants to achieve.
Experience Domains describe where that intent will be expressed.

This phase adds no implementation, TypeScript, schema, API, UI, workers,
persistence, provider adapters, prompts, AI integration, generated output, or
publishing behavior.

## Canonical Definition

The Digital Business Twin is the canonical operational understanding of a
business and its digital identity.

The Digital Business Twin is:

- deterministic;
- versioned;
- evidence-backed;
- provider-neutral;
- model-independent;
- continuously evolving;
- human-governed.

The Digital Business Twin is the primary source of truth inside GNR8.
Everything else is derived from it.

Generation Packages are projections of the Digital Business Twin. Websites,
landing pages, campaigns, chatbots, sales material, training material,
documentation, and future package families are manifestations of the Digital
Business Twin. They are not the source of truth.

The DBT is not a bag of connector records. It is the governed integration of
validated Business Domain knowledge. The canonical hierarchy is:

```text
Reality
-> Business Domains
-> Digital Business Twin
-> Business Intent
-> Experience Domains
-> Generation Packages
-> Provider Adapters
-> External AI
-> Validation
-> Human Approval
-> Publishing
```

The authoritative vocabulary for the DBT-1 knowledge hierarchy is defined in
`docs/architecture/GNR8_KNOWLEDGE_AND_UNDERSTANDING_SPECIFICATION.md`.
The authoritative Business Domain model is defined in
`docs/architecture/BUSINESS_DOMAIN_MODEL_SPECIFICATION.md`.
The authoritative Business Intent model is defined in
`docs/architecture/BUSINESS_INTENT_SPECIFICATION.md`.

## Fundamental Principle

A business exists independently of any website.

A website is only one expression of the business.

The Digital Business Twin represents the business itself.

GNR8 must therefore understand the business before it generates, reconstructs,
validates, approves, or publishes any digital expression of that business.

## What Belongs Inside The DBT

The Digital Business Twin contains provider-neutral business meaning,
evidence, governance, and lineage. It may include known facts, human-approved
interpretations, confidence, unknowns, limitations, constraints, historical
state, and diagnostics.

The DBT can contain references to source artifacts and generated projections,
but it does not contain provider payloads or generated implementation output.

Under DBT-1, the DBT may contain validated facts, validated interpretations
promoted to knowledge, integrated domain understanding, confidence,
uncertainty, lineage, governance state, limitations, conflicts, stale markers,
and references to projections, AI proposals, validations, approvals, and
published manifestations.

## What Does Not Belong Inside The DBT

The Digital Business Twin must not contain:

- prompts;
- provider-specific message formats;
- provider-specific API payloads;
- model settings;
- generated React;
- generated HTML;
- generated CSS;
- generated blocks;
- generated rewritten copy;
- executable code;
- publishing artifacts;
- deployment artifacts;
- transient worker state;
- raw connector payloads as canonical truth;
- unsupported guesses recorded as facts;
- unvalidated interpretations recorded as knowledge;
- generated rewritten copy as canonical knowledge;
- unapproved AI output as canonical truth.

If an external AI system creates a proposal, that proposal is evaluated against
the DBT. It does not become canonical merely because it was generated.

The DBT distinguishes evidence from interpretation, facts from knowledge,
knowledge from generated content, and projections from source truth.

## Inputs And Connectors

Connectors are enrichment mechanisms. They supply evidence, context, and
updates that can improve the same Digital Business Twin over time.

Possible connectors include:

| Connector | DBT Contribution |
| --- | --- |
| Existing Website | Public expression, routes, content, structure, assets, SEO, accessibility, and observed brand signals. |
| Brand Book | Approved positioning, tone, visual identity, logo usage, color, typography, and brand constraints. |
| CRM | Customer segments, lifecycle state, sales context, account relationships, and audience evidence. |
| ERP | Operational, catalog, fulfillment, pricing, location, inventory, and business process evidence. |
| Product Catalog | Product identity, taxonomy, availability, claims, media, specifications, and commercial constraints. |
| Knowledge Base | Approved explanations, support topics, procedures, policies, and domain knowledge. |
| Support Platform | Customer questions, pain points, service limitations, recurring issues, and support language. |
| Social Networks | Public voice, campaigns, audience reactions, recency signals, and community context. |
| Google Business | Location, category, hours, reviews, contact details, and local search identity. |
| Notion | Internal knowledge, planning docs, operating notes, and business process context. |
| PDFs | Brochures, reports, menus, one-pagers, policy docs, presentations, and formal claims. |
| Office documents | Structured business material from Word, Excel, PowerPoint, and related formats. |
| Figma | Visual intent, design components, page concepts, brand applications, and asset sources. |
| Images | Product, place, people, brand, proof, and media assets with provenance. |
| Video | Demonstrations, testimonials, process evidence, events, and spoken messaging. |
| Human interviews | Human-approved clarification, priorities, goals, limitations, and business intent. |
| Questionnaires | Structured business facts, preferences, constraints, and approval-ready inputs. |
| Future connectors | New source systems that enrich the same DBT without changing its identity. |

All connectors enrich the same Digital Business Twin. No connector becomes the
source of truth by itself.

## Outputs And Projections

Projections are bounded views derived from the Digital Business Twin for a
specific use case, channel, provider, or validation flow.

Possible projections include:

| Projection | Purpose |
| --- | --- |
| Website Generation Package | Provider-neutral package for website generation or reconstruction. |
| Landing Page Generation Package | Focused package for a single conversion or announcement page. |
| Campaign Generation Package | Package for coordinated campaign assets, claims, offers, channels, and acceptance criteria. |
| Documentation Package | Package for docs, guides, reference material, and support content. |
| Chatbot Package | Package for assistant behavior, grounding, allowed answers, escalation rules, and safety boundaries. |
| Sales Package | Package for sales enablement, pitch material, objections, ICP, offers, and proof. |
| Marketing Package | Package for positioning, messaging, channels, audience, creative constraints, and approval criteria. |
| Training Package | Package for internal training, onboarding, product education, and process instruction. |
| Future Packages | New projections derived from DBT meaning, evidence, constraints, and lineage. |

A Generation Package is one projection of the Digital Business Twin. It is
never the source of truth.

Under DBT-3, projections must be driven by Business Intent. The DBT determines
what is known about the business; Business Intent determines the governed
outcome the business wants to achieve; Experience Domains determine where that
outcome will be manifested.

## Business Domains

The DBT is composed from long-lived Business Domains. Business Domains are
conceptual knowledge ownership boundaries and do not define schema.

| Domain | Meaning |
| --- | --- |
| Business Identity | The stable identity of the business: name, entities, locations, public identity, operating scope, and identity confidence. |
| Brand | Positioning, voice, values, promise, visual rules, tone, trust, brand constraints, and approved usage. |
| Offerings | Products and services, including scope, specifications, pricing context, claims, availability, eligibility, proof, and limitations. |
| Audience | Customer segments, users, buyers, stakeholders, needs, objections, accessibility needs, and evidence confidence. |
| Goals | Business goals, channel goals, conversion goals, retention goals, support goals, operational goals, acceptance criteria, and priority. |
| Relationships | Connections among business entities, offerings, audiences, channels, assets, claims, campaigns, source systems, validations, approvals, and manifestations. |
| Knowledge | Approved facts, procedures, policies, support answers, domain explanations, training material, and authoritative reference material. |
| Assets | Images, video, documents, logos, icons, downloads, source locations, rights, licenses, and provenance. |
| Compliance | Regulated claims, privacy, security, accessibility, industry requirements, jurisdictional limits, and approval obligations. |
| Sales | Sales process, pipeline stages, buyer journey, objections, offers, account context, and commercial approval boundaries. |
| Marketing | Campaigns, channels, messaging variants, proof points, creative constraints, conversion intent, and channel strategy. |
| Operations | Locations, hours, fulfillment, delivery model, inventory context, staffing, process dependencies, and operational limitations. |
| Analytics | Metrics, events, conversions, funnels, attribution limits, data quality, performance evidence, and confidence adjustments. |
| Support | Support topics, escalation paths, known issues, allowed answers, customer sentiment, and recurring pain points. |
| Digital Presence | Channel inventory, domains, public profiles, reputation signals, channel roles, and cross-channel relationships. |
| Future Domains | Future stable business concerns that enrich DBT understanding without changing its identity. |

Fundamental Business Domains are Business Identity, Brand, Offerings,
Audience, Goals, Relationships, Knowledge, Assets, and Compliance. Optional
Business Domains include Sales, Marketing, Operations, Analytics, Support,
Digital Presence, and Future Domains.

Experience Domains are projection-only boundaries. Examples include Website,
Landing Page, Customer Portal, Mobile App, Marketplace, Documentation,
Campaign, Newsletter, Chatbot, Sales Deck, and Future Experiences.

## Understanding Domains

DBT-1 separates future Understanding Domains from connector families and
storage shape. A connector may feed one or more domains, but connectors are not
domains and databases are not the knowledge model.

Future Understanding Domains include:

| Understanding Domain | Domain Role |
| --- | --- |
| Website Understanding | Produces domain knowledge about routes, structure, content signals, assets, navigation, accessibility, SEO, visual organization, and website expression state. |
| Brand Understanding | Produces domain knowledge about identity, positioning, voice, tone, visual rules, promise, values, and brand constraints. |
| CRM Understanding | Produces domain knowledge about customers, accounts, lifecycle stages, relationships, segments, sales context, and customer-facing obligations. |
| Commerce Understanding | Produces domain knowledge about products, services, pricing context, availability, catalog taxonomy, fulfillment, offers, claims, and commercial constraints. |
| Content Understanding | Produces domain knowledge about approved content, source copy, media, claims, content purpose, channel fit, freshness, and content gaps. |
| Knowledge Understanding | Produces domain knowledge about policies, procedures, support answers, domain explanations, internal operating knowledge, and authoritative reference material. |
| Marketing Understanding | Produces domain knowledge about campaigns, audiences, positioning, channels, conversion goals, proof points, messages, and performance expectations. |
| Support Understanding | Produces domain knowledge about customer questions, service limitations, recurring issues, escalation paths, satisfaction signals, and allowed support answers. |
| Future Domains | Produce future validated domain knowledge without changing the DBT identity. |

Each domain produces domain knowledge. The DBT integrates domain knowledge
into cross-domain understanding. No domain owns the whole truth by itself.

## Relationship Diagram

The canonical DBT-centered architecture is:

```text
Reality
-> Business Domains
-> Digital Business Twin
-> Business Intent
-> Experience Domains
-> Generation Packages
-> Provider Adapters
-> External AI
-> Validation
-> Human Approval
-> Publishing
```

Generation Packages are projections:

```text
Digital Business Twin
-> Business Intent
-> Experience Domain
-> Generation Package
-> Provider Adapter
-> External AI
-> Validation
-> Human Approval
-> Publish
```

## Relationship To Existing Artifacts

The existing website-understanding chain remains valuable, but its role changes
under DBT-3. It contributes to Business Domains or is derived from them through
Business Intent and Experience Domains; it does not replace the DBT.

```text
Evidence
-> Discovery
-> Review
-> Reconstruction Package
-> StructurePlan
-> Business Intent
-> Experience Domain
-> Generation Package
```

| Artifact | DBT Relationship |
| --- | --- |
| Evidence | Source observation that can support facts, confidence, limitations, and lineage for one or more Business Domains. |
| Discovery | Candidate interpretation from evidence. It can propose possible domain knowledge but does not become knowledge until reviewed and validated. |
| Review | Governance step that accepts, rejects, defers, or limits candidate domain knowledge. |
| Reconstruction Package | Website-understanding contributor and bounded projection around approved reconstruction candidates. It may inform Digital Presence, Assets, Brand, Offerings, Knowledge, Relationships, and Website Experience Domain scope, but it is not source business truth. |
| StructurePlan | Experience-domain planning projection for website structure. It can inform Website Experience Domain scope but does not own Business Domains. |
| Business Intent | Governed desired outcome derived from DBT understanding. It can use Business Domain evidence and knowledge, but it does not contain prompts, provider payloads, generated content, publishing artifacts, or execution state. |
| Generation Package | Provider-neutral orchestration target derived from a DBT-backed Experience Domain under one or more Business Intents. It is downstream of Business Domains and never canonical truth. |

The previous chain:

```text
Website
-> Understanding Engine
-> Generation Package
```

is superseded by:

```text
Reality
-> Business Domains
-> Digital Business Twin
-> Business Intent
-> Experience Domains
-> Generation Packages
-> Provider Adapters
-> External AI
-> Validation
-> Human Approval
-> Publish
```

## Differences From Adjacent Concepts

| Concept | Difference From DBT |
| --- | --- |
| Website | A website is one digital expression of the business. The DBT represents the business itself and can produce many website or non-website projections. |
| Business Intent | Business Intent is the governed description of the business outcome the organization wants to achieve. It is derived from DBT understanding and drives Experience Domain projection, but it does not replace the DBT as source truth. |
| CMS | A CMS stores and edits content for channels. The DBT owns meaning, evidence, constraints, lineage, governance, and projection authority. |
| CRM | A CRM manages customer and sales relationships. The DBT may use CRM evidence but also understands brand, products, services, content, constraints, assets, and digital identity. |
| ERP | An ERP manages operational and resource processes. The DBT may use ERP evidence but does not become the ERP or perform ERP execution. |
| Brand Book | A brand book is an authoritative brand input. The DBT reconciles brand input with evidence, governance, business identity, audiences, content, constraints, and projections. |
| Knowledge Base | A knowledge base stores approved answers and support material. The DBT can use it as evidence, but DBT meaning spans the whole business and its digital identity. |
| Generation Package | A Generation Package is a bounded, provider-neutral projection used for external AI execution. It is derived from the DBT and never replaces it. |

## Architectural Rules

- The DBT is always provider-neutral.
- The DBT is model-independent.
- The DBT is deterministic in how it records known state, unknowns, lineage,
  limitations, and version history.
- The DBT is continuously evolving, but each version must be auditable.
- The DBT is evidence-backed; unsupported assertions are limitations or
  hypotheses, not canonical truth.
- Evidence is immutable.
- Facts are evidence-backed.
- Interpretations are derived.
- Knowledge is validated interpretation.
- Understanding is integrated knowledge.
- Generation Packages are projections.
- Business Intent owns desired outcomes.
- AI outputs are proposals.
- Published artifacts are approved manifestations.
- Business Domains own knowledge.
- Experience Domains own manifestations.
- The DBT never stores guesses as facts.
- The DBT distinguishes evidence from interpretation.
- The DBT distinguishes knowledge from generated content.
- AI never changes truth directly.
- The DBT is human-governed; approval and rejection state remain explicit.
- Human governance remains authoritative.
- The DBT never contains prompts.
- The DBT never contains generated React.
- The DBT never contains generated HTML.
- The DBT never contains provider payloads.
- The DBT never makes provider output canonical without validation and human
  approval.
- The DBT owns cross-domain integration.
- Generation Packages own orchestration targets.
- Provider Adapters own serialization.
- AI owns generation.
- Humans own approval.

## Future Evolution

Future connectors can enrich the Digital Business Twin without changing its
identity. A new source system may add evidence, update stale facts, reveal
conflicts, improve confidence, add constraints, or create new relationships,
but it does not replace the DBT.

Future projections can also be added without changing DBT identity. A new
package family should derive from the DBT's meaning, evidence, constraints,
governance state, lineage, and limitations, then pass through provider adapter,
validation, human approval, and publishing boundaries as appropriate.

The long-term GNR8 architecture therefore centers the business, not the
website. Websites remain important expressions, but the primary entity GNR8
understands is the business and its digital identity.
