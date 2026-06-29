# Business Domain Model Specification

## Phase And Boundary

Phase DBT-2 defines the canonical Business Domain Model that composes the
Digital Business Twin.

This phase is documentation and specification only. It adds no implementation,
TypeScript, schema, persistence, API, UI, workers, connectors, AI integration,
provider adapters, prompts, generated output, or publishing behavior.

The goal of DBT-2 is not to describe websites. The goal is to describe
businesses. Every future connector enriches one or more Business Domains. The
Digital Business Twin integrates all Business Domains into one coherent
business understanding.

Phase DBT-3 adds Business Intent as the governed outcome layer downstream of
the Digital Business Twin. Business Domains still describe the business;
Business Intent describes what the business wants to achieve; Experience
Domains describe where that intent will be expressed.

## Constitutional Rule

The Digital Business Twin is not "website knowledge."

The Digital Business Twin is the governed integration of multiple independent
Business Domains. Websites, landing pages, portals, apps, campaigns, decks,
documentation, newsletters, chatbots, marketplaces, and future channel outputs
are Experience Domains derived from the DBT.

Business Domains are sources of business meaning.

Business Intent is the governed outcome selected from business meaning.

Experience Domains are manifestations of business meaning.

Generation Packages are projections prepared from Experience Domains for
provider-neutral orchestration.

## Canonical Relationship Model

The canonical DBT-centered architecture after DBT-3 is:

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

This relationship supersedes any interpretation that treats a website or a
Generation Package as the source of truth.

Reality is the actual business. Business Domains are governed knowledge
boundaries about that business. The Digital Business Twin integrates those
domains into coherent understanding. Business Intent governs the desired
business outcome. Experience Domains are bounded manifestations derived from
the DBT through Business Intent. Generation Packages are orchestration targets
for external AI execution. Provider Adapters serialize those targets. External
AI generates proposals. Validation checks proposals against the DBT, Business
Intent, the Experience Domain, and the Generation Package. Humans approve.
Publishing promotes approved manifestations.

## Canonical Business Domains

Canonical Business Domains are long-lived knowledge ownership boundaries
inside the Digital Business Twin. They are not database tables, connector
families, prompts, provider payloads, or UI sections.

The following domains are canonical for DBT-2. The list is intentionally not
final; future domains may be added when a new stable business concern cannot
be represented cleanly by the existing domains.

| Business Domain | Classification | Why It Exists |
| --- | --- | --- |
| Business Identity | Fundamental | A business needs stable identity before any other knowledge can be trusted, reconciled, or projected. |
| Brand | Fundamental | Brand governs how the business should be recognized, described, trusted, and constrained across experiences. |
| Offerings | Fundamental | Products and services define what the business provides, what claims can be made, and what customers can act on. |
| Audience | Fundamental | The DBT must know who the business serves, influences, sells to, supports, and must not mislead. |
| Goals | Fundamental | Business intent, priorities, and success criteria guide projection, validation, and approval. |
| Relationships | Fundamental | Business meaning depends on connections among entities, offerings, audiences, channels, assets, claims, and systems. |
| Knowledge | Fundamental | Approved explanations, policies, procedures, facts, and domain expertise ground safe action. |
| Assets | Fundamental | Media, documents, logos, downloads, and source material must be known, governed, licensed, and traceable. |
| Compliance | Fundamental | Legal, regulatory, privacy, accessibility, security, and claim boundaries constrain every projection. |
| Sales | Optional | Some businesses expose sales process, pipeline, objections, buyer stages, and commercial context to the DBT. |
| Marketing | Optional | Campaigns, positioning variants, channel strategy, proof, and creative constraints may enrich projection quality. |
| Operations | Optional | Locations, fulfillment, staffing, inventory, delivery, process, and capacity may materially affect what can be promised. |
| Analytics | Optional | Performance evidence can inform priorities, risks, confidence, and validation but is not required for initial identity. |
| Support | Optional | Support knowledge, recurring issues, escalation, satisfaction, and allowed answers enrich customer-facing experiences. |
| Digital Presence | Optional | Channel-level public presence summarizes where the business appears, but individual experiences remain projections. |
| Future Domains | Optional / extensible | Future stable business concerns may become domains without changing the DBT identity. |

No canonical Business Domain is projection-only. Projection-only boundaries are
Experience Domains. Digital Presence is a business domain only when it records
channel facts, ownership, public presence, reputation, constraints, and
cross-channel relationships; a specific website, portal, campaign, or chatbot
is an Experience Domain projection.

## Fundamental Domains

Fundamental domains are required for a coherent Digital Business Twin:

- Business Identity
- Brand
- Offerings
- Audience
- Goals
- Relationships
- Knowledge
- Assets
- Compliance

These domains can begin incomplete, low-confidence, or explicitly unknown, but
the DBT must represent their state. Missing fundamental knowledge becomes a
limitation, blocker, confidence reduction, or human-governance requirement.

## Optional Domains

Optional domains enrich the DBT when evidence exists or when the business
context requires them:

- Sales
- Marketing
- Operations
- Analytics
- Support
- Digital Presence
- Future Domains

Optional does not mean unimportant. It means the DBT may remain coherent
without that domain for some businesses or early versions, as long as the
missing domain is not silently assumed.

## Projection-Only Domains

Projection-only domains are Experience Domains, not Business Domains.

Examples include:

- Website
- Landing Page
- Customer Portal
- Mobile App
- Marketplace
- Documentation
- Campaign
- Newsletter
- Chatbot
- Sales Deck
- Future Experiences

Experience Domains describe manifestations of the business. They may consume
many Business Domains, produce validation feedback, and later become published
manifestations. They do not own canonical business truth.

## Domain Responsibilities

### Business Identity

Purpose: define the stable identity, existence, scope, and operating context
of the business.

Owns: business name, legal or operating identity, locations, categories,
contact identity, public identity, ownership context, operating scope, and
identity limitations.

Consumes: evidence from websites, business registries, Google Business,
documents, human interviews, CRM, ERP, and approved governance decisions.

Produces: identity facts, identity confidence, canonical naming guidance,
location context, public identity constraints, and identity conflicts.

Relationships: anchors Brand, Offerings, Audience, Compliance, Digital
Presence, Operations, Sales, Support, Assets, and every Experience Domain.

Typical evidence sources: website footer and contact pages, business profiles,
registration records, invoices, proposals, brand decks, legal docs, and human
confirmation.

Future connectors: Google Business, business registries, CRM, ERP, accounting
systems, location management platforms, directory platforms, and interview
capture.

### Brand

Purpose: define how the business should be recognized, positioned, expressed,
and constrained.

Owns: positioning, promise, values, voice, tone, visual identity rules, logo
usage, naming preferences, prohibited usage, proof expectations, and brand
confidence.

Consumes: Business Identity, Offerings, Audience, Marketing, Assets, Digital
Presence, human approvals, brand books, design files, and observed public
expressions.

Produces: brand knowledge, messaging constraints, voice and tone guidance,
visual constraints, approval requirements, and brand limitations.

Relationships: constrains Experience Domains, Generation Packages, Marketing,
Sales, Support, Assets, and Compliance.

Typical evidence sources: brand books, Figma files, existing website, social
profiles, presentations, campaigns, logos, image libraries, and interviews.

Future connectors: Figma, DAM, social platforms, presentation imports, brand
management systems, document importers, and human brand review.

### Offerings

Purpose: define the products and services the business provides.

Owns: product families, products, services, packages, pricing context,
availability, eligibility, specifications, service scope, guarantees,
limitations, claims, proof, and lifecycle state.

Consumes: Business Identity, Brand, Audience, Sales, Operations, Compliance,
Assets, Knowledge, and source catalogs.

Produces: offering facts, claim boundaries, customer-action options,
commercial constraints, offering relationships, and missing-offering
limitations.

Relationships: informs Audience, Sales, Marketing, Support, Operations,
Digital Presence, Compliance, and every customer-facing Experience Domain.

Typical evidence sources: product catalogs, ecommerce data, service pages,
menus, brochures, proposals, ERP records, price sheets, PDFs, and interviews.

Future connectors: ecommerce platforms, product information management,
inventory systems, ERP, POS, proposal tools, PDF import, spreadsheet import,
and human catalog review.

### Audience

Purpose: define who the business serves, influences, sells to, supports, or
must communicate with.

Owns: audience segments, buyer roles, users, stakeholders, jobs-to-be-done,
needs, objections, decision criteria, accessibility needs, language needs,
confidence, and exclusions.

Consumes: Business Identity, Offerings, Sales, Marketing, Analytics, Support,
CRM evidence, campaign evidence, and human research.

Produces: audience knowledge, segment relationships, channel fit, messaging
constraints, accessibility needs, and audience limitations.

Relationships: shapes Brand, Offerings, Sales, Marketing, Support, Goals,
Digital Presence, and Experience Domains.

Typical evidence sources: CRM records, analytics, support tickets, surveys,
reviews, testimonials, campaign data, sales notes, website copy, and
interviews.

Future connectors: CRM, customer data platforms, analytics platforms, support
systems, survey tools, review platforms, email marketing systems, and call
transcripts.

### Sales

Purpose: describe how the business converts qualified interest into revenue
or commitments.

Owns: sales process, pipeline stages, buyer journey, objections, qualifying
criteria, offers, discounts, sales collateral needs, account context, and
commercial approval boundaries.

Consumes: Offerings, Audience, Goals, Marketing, Analytics, Relationships,
CRM, proposals, and human sales input.

Produces: sales knowledge, sales-stage context, sales enablement constraints,
objection handling, sales deck requirements, and conversion limitations.

Relationships: depends on Offerings and Audience; informs Marketing, Support,
Goals, Relationships, Experience Domains, and Sales Deck projections.

Typical evidence sources: CRM, proposals, sales decks, pricing sheets, call
notes, email templates, won/lost notes, and account plans.

Future connectors: CRM, proposal software, CPQ, calendar/call systems,
spreadsheets, email platforms, and sales enablement platforms.

### Marketing

Purpose: describe how the business communicates, campaigns, positions, and
creates demand.

Owns: campaign concepts, channels, messaging variants, creative constraints,
proof points, conversion intent, content themes, launch timing, and marketing
limitations.

Consumes: Brand, Offerings, Audience, Goals, Analytics, Digital Presence,
Assets, and campaign evidence.

Produces: marketing knowledge, campaign constraints, channel strategy,
message-to-audience relationships, proof requirements, and campaign projection
inputs.

Relationships: translates Brand and Offerings for Audience and Goals; informs
Website, Landing Page, Campaign, Newsletter, Marketplace, and Sales Deck
Experience Domains.

Typical evidence sources: campaign briefs, ads, social posts, email
campaigns, analytics, landing pages, SEO reports, content calendars, and
interviews.

Future connectors: ad platforms, email platforms, marketing automation, SEO
tools, social platforms, analytics, content calendars, and planning docs.

### Operations

Purpose: describe what the business can actually deliver, where, when, how,
and under which constraints.

Owns: operating locations, hours, fulfillment, delivery model, service
capacity, inventory context, staffing constraints, process dependencies,
service areas, and operational limitations.

Consumes: Business Identity, Offerings, Sales, Support, Compliance, ERP,
inventory, scheduling, and human operations input.

Produces: operational facts, deliverability constraints, availability context,
service-area rules, fulfillment limitations, and operational confidence.

Relationships: constrains Offerings, Sales, Marketing, Support, Compliance,
Digital Presence, and customer-facing Experience Domains.

Typical evidence sources: ERP, inventory systems, scheduling systems,
spreadsheets, SOPs, location profiles, service area docs, and interviews.

Future connectors: ERP, inventory, scheduling, POS, logistics, booking
platforms, spreadsheets, knowledge bases, and operations interviews.

### Knowledge

Purpose: preserve approved business knowledge that can be safely acted on,
explained, taught, or used to answer questions.

Owns: policies, procedures, FAQs, support answers, product explanations,
domain expertise, internal reference material, authoritative definitions, and
knowledge limitations.

Consumes: Offerings, Support, Operations, Compliance, documents, knowledge
bases, human approvals, and published manifestations.

Produces: approved answers, explanatory knowledge, procedure context,
training inputs, support grounding, and gaps requiring human review.

Relationships: informs Support, Documentation, Chatbot, Customer Portal,
Sales, Operations, Compliance, and validation.

Typical evidence sources: knowledge bases, docs, PDFs, manuals, SOPs, help
center articles, policy docs, training material, and interviews.

Future connectors: knowledge bases, document repositories, Notion, Google
Drive, SharePoint, support systems, LMS, and transcript import.

### Assets

Purpose: govern the business's reusable media, documents, downloads, visual
materials, and source files.

Owns: images, video, logos, icons, documents, downloads, source locations,
licenses, usage rights, asset quality, metadata, provenance, and stale asset
markers.

Consumes: Brand, Offerings, Marketing, Digital Presence, Compliance, human
approval, DAM sources, documents, and websites.

Produces: asset inventory, approved asset refs, licensing constraints, asset
relationships, missing-asset limitations, and projection-ready asset
constraints.

Relationships: supports Brand, Offerings, Marketing, Sales, Knowledge,
Digital Presence, Experience Domains, and Generation Packages.

Typical evidence sources: DAM, website assets, brand folders, Figma exports,
PDFs, presentations, image libraries, video platforms, and documents.

Future connectors: DAM, Figma, cloud drives, image/video platforms, document
importers, CMS exports, and licensing systems.

### Compliance

Purpose: define obligations, risks, and restrictions that govern what the
business may claim, store, generate, approve, publish, or expose.

Owns: legal requirements, regulated claims, privacy boundaries, security
requirements, accessibility obligations, industry rules, jurisdictional
limits, approval obligations, and compliance limitations.

Consumes: Business Identity, Offerings, Audience, Operations, Knowledge,
Support, Assets, Digital Presence, documents, legal review, and governance.

Produces: compliance constraints, forbidden claims, approval requirements,
validation criteria, risk markers, and publication blockers.

Relationships: constrains every Business Domain and every Experience Domain.

Typical evidence sources: policies, legal docs, privacy notices, terms,
accessibility audits, regulated product docs, contracts, approvals, and human
legal review.

Future connectors: policy repositories, GRC tools, accessibility scanners,
legal document import, consent platforms, security systems, and governance
review.

### Goals

Purpose: define what the business is trying to achieve and how DBT-derived
work should be judged.

Owns: business goals, channel goals, conversion goals, retention goals,
support goals, operational goals, quality bars, acceptance criteria, priority,
and goal conflicts.

Consumes: Business Identity, Audience, Offerings, Sales, Marketing,
Operations, Analytics, human strategy input, and governance decisions.

Produces: goal knowledge, prioritization, acceptance criteria, success
metrics, projection intent, validation expectations, and goal limitations.

Relationships: guides Experience Domains, Generation Packages, validation,
human approval, Marketing, Sales, Support, Operations, and Analytics.

Typical evidence sources: strategy docs, briefs, OKRs, analytics reports,
stakeholder interviews, campaign plans, sales targets, and support goals.

Future connectors: planning tools, analytics, CRM, project management,
spreadsheets, BI tools, and interview capture.

### Relationships

Purpose: preserve the connections that make isolated domain facts meaningful
as a coherent business model.

Owns: relationships among entities, offerings, audiences, claims, assets,
channels, locations, campaigns, support topics, goals, source systems,
projections, validations, approvals, and published manifestations.

Consumes: every Business Domain, evidence lineage, governance decisions,
connector identity, and projection lineage.

Produces: relationship graph knowledge, dependency context, conflict markers,
traceability, cross-domain explanations, and impact surfaces for change.

Relationships: binds all Business Domains together and connects the DBT to
Experience Domains, Generation Packages, validation, approval, and publishing.

Typical evidence sources: source refs, link graphs, CRM account relations,
catalog taxonomy, campaign mappings, navigation structure, docs, approvals,
and human review.

Future connectors: graph-capable CRM, PIM, ERP, CMS, analytics, knowledge
bases, project management, and governance systems.

### Digital Presence

Purpose: describe where and how the business is publicly or privately present
across digital channels without making any single channel the source of truth.

Owns: channel inventory, domain ownership, public profiles, presence status,
channel roles, reputation signals, channel constraints, cross-channel
relationships, and presence limitations.

Consumes: Business Identity, Brand, Audience, Marketing, Analytics, Support,
Assets, Compliance, and observed channel evidence.

Produces: digital-presence knowledge, channel map, channel confidence,
presence gaps, channel-specific constraints, and Experience Domain inputs.

Relationships: informs Website, Landing Page, Marketplace, Newsletter,
Chatbot, Customer Portal, Documentation, Campaign, and Future Experience
Domains.

Typical evidence sources: websites, social profiles, Google Business,
marketplaces, app stores, newsletters, documentation sites, review sites, and
analytics.

Future connectors: website import, social platforms, Google Business, app
stores, marketplaces, email platforms, documentation systems, analytics, and
review platforms.

### Analytics

Purpose: describe observed performance, behavior, outcomes, and measurement
confidence.

Owns: metrics, events, traffic, conversions, funnels, engagement, retention,
campaign performance, source attribution limits, data quality, and analytic
confidence.

Consumes: Goals, Marketing, Sales, Support, Digital Presence, Experience
Domains, published manifestations, and measurement systems.

Produces: performance knowledge, validation signals, confidence adjustments,
stale markers, optimization opportunities, and measurement limitations.

Relationships: informs Goals, Marketing, Sales, Audience, Digital Presence,
Support, validation, and future optimization projections.

Typical evidence sources: web analytics, product analytics, ad platforms,
CRM reports, email metrics, support metrics, BI dashboards, and experiment
reports.

Future connectors: Google Analytics, Search Console, ad platforms, BI tools,
CRM analytics, product analytics, email platforms, and experimentation tools.

### Support

Purpose: describe how the business helps customers, handles questions, and
resolves issues.

Owns: support topics, support policies, escalation paths, known issues,
service limitations, allowed answers, customer sentiment, satisfaction
signals, and support gaps.

Consumes: Offerings, Knowledge, Operations, Compliance, Audience, Analytics,
support tickets, reviews, chat transcripts, and human support input.

Produces: support knowledge, FAQ candidates, escalation constraints, chatbot
grounding, documentation needs, recurring pain points, and support
limitations.

Relationships: informs Knowledge, Offerings, Operations, Audience,
Compliance, Chatbot, Documentation, Customer Portal, and validation.

Typical evidence sources: help desk tickets, chat logs, call transcripts,
reviews, FAQs, policies, knowledge base articles, surveys, and interviews.

Future connectors: Zendesk, Intercom, Freshdesk, Help Scout, call systems,
review platforms, survey tools, knowledge bases, and chatbot logs.

### Future Domains

Purpose: provide a governed expansion path for stable business concerns not
yet covered by the canonical DBT-2 domain set.

Owns: only the future domain's specific business knowledge after it is
accepted as a stable domain boundary.

Consumes: relevant existing Business Domains, evidence, governance decisions,
human review, and future connector evidence.

Produces: future domain knowledge, confidence, limitations, relationships,
projection inputs, and governance requirements.

Relationships: must declare relationships to existing Business Domains,
Experience Domains, Generation Packages, validation, approval, and publishing
before becoming canonical.

Typical evidence sources: future source systems, future documents, future
human inputs, future public channels, and future operational systems.

Future connectors: any connector that can enrich business understanding while
preserving evidence, lineage, confidence, validation, and governance.

## Business Domains Versus Experience Domains

Business Domains describe the business.

Experience Domains describe manifestations of the business.

A Business Domain owns source knowledge such as business identity, brand,
offerings, audience, goals, operations, assets, compliance, relationships, and
approved knowledge. It evolves as the business changes and as new evidence is
validated.

An Experience Domain owns the bounded expression of that knowledge in a
channel, surface, package family, document, assistant, campaign, or future
manifestation. It is downstream of the DBT and may consume many Business
Domains at once.

Examples:

| Experience Domain | Consumes Business Domains | Projection Role |
| --- | --- | --- |
| Website | Business Identity, Brand, Offerings, Audience, Goals, Assets, Digital Presence, Compliance, Knowledge | Public web manifestation. |
| Landing Page | Offerings, Audience, Brand, Marketing, Goals, Assets, Compliance, Analytics | Focused conversion or announcement manifestation. |
| Customer Portal | Business Identity, Offerings, Support, Knowledge, Operations, Compliance, Relationships | Authenticated customer-service manifestation. |
| Mobile App | Brand, Offerings, Audience, Operations, Support, Compliance, Assets, Goals | Native or app-store manifestation. |
| Marketplace | Offerings, Brand, Operations, Compliance, Assets, Sales, Analytics | Third-party commercial-channel manifestation. |
| Documentation | Knowledge, Offerings, Support, Compliance, Brand, Audience | Educational or reference manifestation. |
| Campaign | Marketing, Brand, Audience, Offerings, Goals, Assets, Analytics, Compliance | Time-bound communication manifestation. |
| Newsletter | Marketing, Audience, Brand, Knowledge, Goals, Compliance, Analytics | Recurring communication manifestation. |
| Chatbot | Knowledge, Support, Offerings, Compliance, Audience, Brand, Relationships | Conversational support or guidance manifestation. |
| Sales Deck | Sales, Brand, Offerings, Audience, Goals, Assets, Compliance, Analytics | Sales enablement manifestation. |
| Future Experiences | Relevant Business Domains | Future manifestations derived from the DBT. |

Experience Domains may produce feedback after validation, approval, publishing,
or observation. That feedback can become evidence for Business Domains, but the
published experience does not replace the Business Domains as source truth.

## Relationship To Business Intent

Business Intent sits between the Digital Business Twin and Experience Domains.
It does not own Business Domain knowledge and does not own the manifestation.
It owns the governed outcome the business wants to achieve.

Examples:

| Business Intent | Experience Domain |
| --- | --- |
| Increase qualified leads | Website |
| Reduce support costs | Knowledge Base |
| Employee onboarding | Training Portal |
| Increase sales conversion | Website, Landing Page, Sales Deck, Email Campaign |

One Business Intent may produce multiple Experience Domains. Multiple Business
Intents may contribute to one Experience Domain. The Business Domains supply
knowledge, constraints, evidence, and confidence; the Intent selects and
governs desired outcome; the Experience Domain expresses that outcome in a
specific channel or artifact family.

## Domain Relationship Rules

- Business Identity anchors every domain.
- Brand constrains communication, visual expression, and trust.
- Offerings define what the business provides and what can be promised.
- Audience defines who the business serves and how claims must be adapted.
- Goals define why a projection exists and how success is judged.
- Knowledge defines what can be safely explained or answered.
- Assets provide governed materials for projections.
- Compliance constrains all claims, data, channels, and publications.
- Relationships connect all domains into coherent DBT understanding.
- Optional domains enrich the DBT only where supported by evidence.
- Business Intent owns desired outcomes, not knowledge ownership and not
  manifestation.
- Experience Domains consume Business Domains; they do not own canonical
  business truth.
- Generation Packages consume Experience Domain scope plus DBT knowledge; they
  do not own canonical business truth.

## Domain Evolution

Each Business Domain evolves independently.

A connector can enrich one or more Business Domains without changing the
identity of the DBT. For example, a CRM connector can enrich Audience, Sales,
Relationships, Goals, and Analytics; a brand book can enrich Brand, Assets,
Compliance, and Knowledge; a website connector can enrich Digital Presence,
Brand, Offerings, Audience, Assets, Knowledge, Marketing, Analytics, Support,
and Compliance.

Domains never become provider-specific. A Business Domain may reference
evidence from OpenAI-generated proposals, published websites, CRM records, or
human-approved documents, but it must not store provider payloads, prompts,
model settings, or generated code as canonical domain knowledge.

The DBT continuously integrates updated domain knowledge. When one domain
changes, the DBT records lineage, confidence, conflicts, stale projections,
validation requirements, and human-governance requirements rather than
silently overwriting cross-domain understanding.

## Architectural Rules

- Business Domains never contain prompts.
- Business Domains never contain generated code.
- Business Domains never contain generated React.
- Business Domains never contain generated HTML.
- Business Domains never contain provider payloads.
- Business Domains never contain raw connector payloads as canonical truth.
- Business Domains own knowledge.
- Experience Domains own manifestations.
- Generation Packages own orchestration targets.
- Provider Adapters own serialization.
- AI owns generation.
- Humans own approval.
- The DBT owns cross-domain integration.
- Validation owns promotion checks between layers.
- Publishing owns approved release, not truth creation.
- Connector evidence may enrich domains only through lineage, confidence,
  validation, and governance.
- No domain may bypass the knowledge hierarchy.
- No domain may make provider-specific output canonical.

## Relationship To Existing Artifacts

Existing artifacts either contribute to Business Domains or are derived from
Business Domains through the DBT.

| Existing Artifact | DBT Relationship |
| --- | --- |
| Evidence | Source observation that can support facts, confidence, limitations, and lineage for one or more Business Domains. |
| Discovery | Candidate interpretation from evidence. It can propose possible domain knowledge but does not become knowledge until reviewed and validated. |
| Review | Governance step that accepts, rejects, defers, or limits candidate domain knowledge. |
| Reconstruction Package | Website-understanding contributor and bounded projection around approved reconstruction candidates. It may inform Digital Presence, Assets, Brand, Offerings, Knowledge, Relationships, and Experience Domain scope, but it is not source business truth. |
| StructurePlan | Experience-domain planning projection for website structure. It can inform Website Experience Domain scope but does not own Business Domains. |
| Business Intent | Governed desired outcome derived from DBT understanding. It can use Business Domain evidence and knowledge, but it does not contain prompts, provider payloads, generated content, publishing artifacts, or execution state. |
| Generation Package | Provider-neutral orchestration target derived from a DBT-backed Experience Domain under one or more Business Intents. It is downstream of Business Domains and never canonical truth. |

The existing website-understanding chain is therefore reclassified as a
connector and experience-projection path:

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

It contributes to the DBT, but it does not define the DBT.

## Future Domain Admission Criteria

A future Business Domain may become canonical only when it:

- describes a stable business concern rather than one output channel;
- owns knowledge, not manifestation;
- can evolve independently;
- can be enriched by one or more connectors;
- can declare relationships to existing Business Domains;
- can preserve evidence, confidence, lineage, limitations, and governance;
- remains provider-neutral;
- does not contain prompts, generated code, provider payloads, or published
  artifacts as source truth.

If a proposed domain primarily describes a website, campaign, portal, app,
document, assistant, deck, or channel output, it is an Experience Domain, not a
Business Domain.

## DBT-2 Outcome

At the end of DBT-2, the Digital Business Twin is understood as the governed
integration of independent Business Domains. It is not website knowledge.

Generation Packages are projections of Experience Domains, and Experience
Domains are manifestations derived from Business Domains through the Digital
Business Twin.

Under DBT-3, Business Intent becomes the governed bridge between the DBT and
Experience Domains. Business Domains continue to own knowledge; Business Intent
owns desired outcomes; Experience Domains own manifestations.
