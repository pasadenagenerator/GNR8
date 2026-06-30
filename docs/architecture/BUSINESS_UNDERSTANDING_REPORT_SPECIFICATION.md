# Business Understanding Report Specification

## Phase And Boundary

Phase BR-0 defines the Business Understanding Report as the first
human-facing artifact produced by GNR8.

This phase is documentation and specification only. It adds no implementation,
TypeScript, schema, persistence, API, UI, workers, connectors, AI integration,
provider adapters, prompts, generated output, execution state, or publishing
behavior.

The purpose of the Business Understanding Report is not generation. Its
purpose is validation of understanding. It summarizes what GNR8 currently
understands about the business so humans can inspect, trust, correct, or
reject that understanding before any Design Brief, Generation Package,
external AI task, generated output, validation flow, or publishing flow exists.

## Canonical Definition

A Business Understanding Report is a deterministic, evidence-backed,
provider-neutral, human-readable projection of the current Digital Business
Twin.

The report summarizes what GNR8 currently understands.

It is not:

- a prompt;
- a website;
- a specification;
- generated code;
- a Generation Package;
- a Design Brief.

The Business Understanding Report does not replace the Digital Business Twin.
It is a readable projection of the Twin for human validation. The DBT remains
the canonical governed source of business understanding.

## Primary Audience

The Business Understanding Report is written for humans who need to validate
or operate from GNR8's business understanding.

Primary readers include:

- business owners;
- founders and executives;
- management teams;
- marketing teams;
- agencies;
- brand, sales, support, and operations stakeholders;
- future AI operators who need to understand the business before preparing
  downstream work.

The report should be readable without requiring knowledge of GNR8 internals,
provider APIs, prompts, schema, code, or implementation details.

## Primary Goals

The Business Understanding Report exists to:

- validate understanding before generation;
- expose missing knowledge;
- build trust in GNR8's interpretation of the business;
- explain confidence and uncertainty;
- support human corrections;
- prepare future planning without prescribing implementation;
- serve as durable business documentation;
- make Digital Business Twin state understandable to non-technical readers;
- create a governance checkpoint before any Design Brief or Generation
  Package is prepared.

## Questions The Report Should Answer

The report should answer human validation questions such as:

- What business does GNR8 believe this is?
- What products or services does the business offer?
- Who does the business appear to serve?
- What goals, priorities, and outcomes are currently understood?
- What brand identity, positioning, tone, or trust signals are known?
- What digital presence exists today?
- What strengths, weaknesses, opportunities, and risks are visible from the
  current DBT?
- What does GNR8 know with high confidence?
- What does GNR8 know with low confidence?
- What is missing, contradicted, stale, or unsupported?
- Which evidence supports the current understanding?
- What should a human clarify before downstream planning begins?

## Recommended Report Structure

The recommended report structure is:

1. Executive Summary
2. Business Overview
3. Mission
4. Products & Services
5. Target Audience
6. Business Goals
7. Brand Identity
8. Competitive Advantages
9. Customer Journey
10. Current Digital Presence
11. Strengths
12. Weaknesses
13. Business Opportunities
14. Business Risks
15. Missing Knowledge
16. Confidence Overview
17. Recommendations
18. Limitations
19. Evidence Summary
20. Version & Lineage
21. Diagnostics

The structure may evolve, but every version must remain human-readable,
evidence-backed, provider-neutral, deterministic, and explicitly tied to a DBT
version or lineage boundary.

## Section Responsibilities

### Executive Summary

Summarizes the current business understanding in plain language. It should
make the overall state clear without hiding uncertainty.

### Business Overview

Describes the business identity, operating category, location or service
scope, public identity, and known business context.

### Mission

Summarizes any known mission, purpose, promise, or operating principle. If the
mission is inferred from weak evidence, the report must say so.

### Products & Services

Describes the current understanding of offerings, product families, services,
claims, availability, and limitations.

### Target Audience

Describes the understood buyers, users, stakeholders, segments, customer
needs, objections, and audience gaps.

### Business Goals

Summarizes known goals and likely priorities. Goals should be framed as
business outcomes, not implementation tasks.

### Brand Identity

Describes positioning, tone, voice, values, trust signals, visual identity
signals, and brand constraints where known.

### Competitive Advantages

Identifies differentiators, proof points, expertise, specialization,
geography, speed, quality, credibility, or service advantages supported by the
current DBT.

### Customer Journey

Summarizes how customers appear to discover, evaluate, trust, contact, buy,
use, receive support from, or return to the business.

### Current Digital Presence

Summarizes known websites, public profiles, search presence, social presence,
content channels, documentation, marketplaces, or other digital expressions.

### Strengths

Lists business strengths visible in current understanding, with evidence and
confidence.

### Weaknesses

Lists business weaknesses, gaps, inconsistencies, confusing messages, thin
proof, missing audience information, or unclear offerings.

### Business Opportunities

Identifies business-oriented opportunities that humans may consider. These are
not implementation prescriptions.

### Business Risks

Identifies risks such as unclear positioning, unsupported claims, weak trust
signals, missing compliance information, outdated digital presence, audience
ambiguity, or incomplete offering knowledge.

### Missing Knowledge

Lists unknowns that materially affect confidence or downstream planning.
Missing knowledge is not failure; it is a governance signal.

### Confidence Overview

Explains confidence across major understanding areas and why confidence is
high, medium, low, conflicting, stale, or unknown.

### Recommendations

Provides business-oriented recommendations for human consideration. The
recommendations must never prescribe implementation details.

### Limitations

Explains report limits, source limits, incomplete domains, stale evidence,
conflicting evidence, unsupported inferences, and known blind spots.

### Evidence Summary

Summarizes the evidence families and source lineage that support the report,
without turning the report into a raw evidence dump.

### Version & Lineage

Identifies the DBT version, source evidence boundaries, report version,
generation timestamp or version timestamp, and lineage references needed for
auditability.

### Diagnostics

Records internal quality, completeness, conflict, source, and transformation
diagnostics in human-readable form. Diagnostics explain report quality; they do
not expose provider payloads, prompts, code, or execution state.

## Confidence Visualization

The report should present confidence visibly and consistently.

Confidence should be shown for:

- overall understanding;
- Business Identity;
- Brand;
- Offerings;
- Audience;
- Goals;
- Knowledge;
- Digital Presence.

Every major section should expose confidence and explain uncertainty. The
reader should be able to see not only the confidence level, but also why that
confidence was assigned.

Confidence presentation should include:

- a plain-language confidence label;
- a short explanation;
- evidence basis;
- uncertainty or limitation notes;
- missing knowledge that could improve confidence;
- conflicts or stale signals when present.

Recommended labels are:

- High: supported by strong, recent, consistent evidence or human validation.
- Medium: supported by useful evidence with gaps, ambiguity, or limited
  corroboration.
- Low: supported by weak, inferred, stale, sparse, or conflicting evidence.
- Unknown: insufficient evidence exists to make a responsible statement.
- Conflicting: evidence supports multiple incompatible interpretations.

Low-confidence or unknown material must never be hidden. It should lower the
section confidence, become a limitation, or become a human correction request.

## Business Recommendations Model

Business Understanding Report recommendations are business-oriented. They help
humans improve understanding, clarity, trust, documentation, or future
planning.

Examples include:

- clarify positioning;
- improve messaging;
- consolidate products;
- strengthen trust;
- improve customer journey;
- expand documentation;
- improve SEO;
- modernize website;
- clarify audience segments;
- document proof points;
- resolve conflicting claims;
- confirm priority goals;
- improve digital presence consistency.

Recommendations must not prescribe implementation. They must not specify
React components, layouts, CMS records, prompt structure, provider payloads,
schema, APIs, worker behavior, publishing steps, deployment details, or
generated code.

Recommendations may say what business problem should be considered. They must
not say how to build the solution.

## Relationship Model

The Business Understanding Report establishes the first human-facing checkpoint
before planning and generation:

```text
Reality
-> Business Domains
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Validation
-> Publishing
```

The product roadmap view is:

```text
Business Discovery
-> Digital Business Twin
-> Business Understanding Report
-> Business Alignment
-> Website Design Brief
-> Website Generation Package
-> Provider Adapter
-> External AI
-> Validation
-> Publish
```

This model means GNR8 no longer begins with generation. GNR8 first produces a
Business Understanding Report, humans align business understanding, and only
then may downstream Design Briefs, Generation Packages, provider adapters,
external AI tasks, validations, approvals, or publishing workflows be prepared.

## Differences From A Design Brief

A Business Understanding Report explains what GNR8 currently understands about
the business.

A Design Brief explains what a future designed experience should achieve and
communicate.

| Business Understanding Report | Design Brief |
| --- | --- |
| Validates current business understanding. | Guides future experience planning. |
| Derived from the Digital Business Twin. | Derived from validated understanding, Business Intent, and Experience Domain scope. |
| Written for business validation. | Written for design and planning alignment. |
| Describes knowns, unknowns, confidence, and evidence. | Describes desired direction, audience priorities, messaging emphasis, and creative constraints. |
| Does not prescribe an experience. | May define the intended website or experience direction. |
| Comes before Business Alignment. | Comes after humans align understanding. |

The report is not a Design Brief because it does not decide what to design. It
decides whether GNR8 understands the business well enough for humans to allow
future planning.

## Differences From A Generation Package

A Business Understanding Report is a human-readable understanding artifact.

A Generation Package is a provider-neutral orchestration target for external
AI execution.

| Business Understanding Report | Generation Package |
| --- | --- |
| Human-facing. | Machine-usable orchestration boundary. |
| Validates business understanding. | Prepares one scoped external AI task. |
| Describes the business state. | Describes a specific experience to generate or reconstruct. |
| Explains confidence and missing knowledge. | Carries constraints, acceptance criteria, evidence refs, and generation boundaries. |
| Does not trigger generation. | Exists only when generation may be prepared under governance. |
| Provider-neutral and readable. | Provider-neutral and serializable by future adapters. |

The report is not a Generation Package because it does not contain task
instructions, provider payloads, generation constraints, code targets,
acceptance criteria for generated output, or adapter-ready execution content.

## How The Report Validates The Digital Business Twin

The Business Understanding Report helps validate the Digital Business Twin by
making DBT state visible, readable, and correctable.

It validates the DBT by:

- exposing what the Twin currently believes about the business;
- showing evidence and lineage in human-readable form;
- surfacing confidence per domain and per section;
- naming missing knowledge before it is silently assumed;
- identifying contradictions, stale information, or unsupported inferences;
- letting humans confirm, reject, correct, or request more evidence;
- creating a Business Alignment checkpoint before downstream planning;
- preserving a record of what was understood at a specific DBT version.

Human corrections from Business Alignment may later enrich or revise the DBT
through governed processes. The report itself does not mutate the DBT, create
generation artifacts, call providers, or publish output.

## Relationship To Existing Artifacts

| Existing Artifact | Relationship To Business Understanding Report |
| --- | --- |
| Evidence | Supplies source observations, facts, documents, website signals, human statements, assets, constraints, conflicts, and limitations. The report summarizes relevant evidence; it does not replace the evidence store. |
| Knowledge | Supplies validated interpretation and domain meaning. The report explains knowledge in language humans can inspect. |
| Digital Business Twin | The canonical source. The report is a deterministic projection of the current DBT version and never replaces it. |
| Business Intent | Downstream of validated understanding. Intents should be selected or revised after humans understand and validate the business state. |
| Website Design Brief | A later planning artifact derived from validated understanding, selected Business Intent, and Website Experience Domain scope. |
| Generation Package | A later provider-neutral orchestration artifact derived from validated DBT understanding, Business Intent, Experience Domain scope, and approved planning boundaries. |

## Architectural Rules

The Business Understanding Report never contains:

- prompts;
- provider payloads;
- generated HTML;
- generated React;
- generated components;
- generated pages;
- publishing artifacts;
- execution state.

The report communicates understanding only.

The Business Understanding Report must remain:

- deterministic;
- evidence-backed;
- provider-neutral;
- human-readable;
- versioned or lineage-aware;
- confidence-bearing;
- limitation-bearing;
- downstream of the Digital Business Twin;
- upstream of Design Briefs and Generation Packages.

## BR-0 Outcome

At the end of BR-0, GNR8 no longer begins with generation.

GNR8 first produces a Business Understanding Report.

Humans validate understanding before any Design Brief or Generation Package is
created.

The Business Understanding Report becomes the first human-facing artifact of
the platform.
