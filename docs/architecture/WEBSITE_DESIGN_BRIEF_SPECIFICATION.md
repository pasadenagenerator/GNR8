# Website Design Brief Specification

## Phase And Boundary

Phase WDB-0 defines the Website Design Brief as the canonical transformation
of an aligned Digital Business Twin into website experience intent.

This phase is documentation and architecture only. It adds no implementation,
TypeScript, schema, persistence, API, UI, workers, AI integration, prompts,
provider adapters, generation, publishing, validation execution, runtime
state, or deployment behavior.

The Website Design Brief is not a website.

It is not HTML.

It is not React.

It is not a prompt.

It is not a Generation Package.

It is the canonical business-to-experience bridge.

## Canonical Definition

"A deterministic, provider-neutral, human-readable, experience-oriented
projection of an aligned Digital Business Twin that defines the intended
business expression of a website."

The Website Design Brief is:

- business-aware;
- experience-oriented;
- technology-independent;
- provider-neutral;
- human-readable;
- AI-readable;
- versioned;
- lineage-aware.

The Website Design Brief is NOT:

- React;
- HTML;
- Components;
- Blocks;
- Layouts;
- Provider payloads;
- Prompts;
- Publishing artifacts;
- Execution artifacts;
- Generated output.

## Purpose

The Website Design Brief exists to:

- transform business understanding into website intent;
- guide human review;
- guide creative direction;
- guide AI generation;
- create one canonical source of website intent;
- reduce provider-specific prompting;
- support future regeneration.

It converts aligned business truth into a governed description of what the
website should express, communicate, prioritize, and make possible for users.
It does not prescribe the implementation that will express those decisions.

## Why It Exists

The Digital Business Twin knows the business. Business Alignment confirms or
improves that understanding. The Website Design Brief turns the aligned
understanding into website experience intent.

Without a Website Design Brief, GNR8 would have to jump directly from business
understanding into Generation Package preparation or provider-specific
prompting. That would blur business meaning, creative direction, experience
goals, and provider execution into one unstable boundary.

The Website Design Brief gives humans and downstream systems a shared,
provider-neutral checkpoint for the intended website experience before any
Generation Package, provider adapter, external AI task, generated output, or
publishing artifact exists.

## Difference From Business Understanding Report

The Business Understanding Report explains what GNR8 understands about the
business.

The Website Design Brief defines how that aligned understanding should become
website experience intent.

The Business Understanding Report is a validation artifact. It helps humans
inspect, trust, correct, or reject business understanding before downstream
planning.

The Website Design Brief is an experience-intent artifact. It translates
aligned understanding into website objectives, audience priorities, messaging
principles, creative direction, information architecture intent, constraints,
and success criteria.

The Business Understanding Report asks:

- What does GNR8 understand?
- What is missing, uncertain, conflicting, stale, or low confidence?
- What should humans correct before planning?

The Website Design Brief asks:

- What should users experience?
- What should users understand?
- What should users accomplish?
- What should the website communicate?

## Difference From Generation Package

The Website Design Brief defines website intent.

The Website Generation Package defines generation.

The Website Design Brief is human-readable, provider-neutral, and
experience-oriented. It describes the intended business expression of a
website without choosing implementation structures or provider payloads.

The Website Generation Package is a downstream provider-neutral orchestration
target. It packages generation tasks, constraints, acceptance criteria,
lineage, and validation requirements so provider adapters can serialize work
for external AI systems.

The Website Design Brief is reviewed before generation planning. The Website
Generation Package is prepared for generation execution.

## Recommended Structure

The recommended Website Design Brief structure is:

1. Executive Summary
2. Business Context
3. Business Goals
4. Website Objectives
5. Primary Audience
6. Secondary Audience
7. Customer Problems
8. Business Value Proposition
9. Competitive Advantages
10. Brand Personality
11. Tone of Voice
12. Messaging Principles
13. Trust Signals
14. Products & Services Overview
15. Desired Customer Journey
16. Website Information Architecture
17. Required Website Pages
18. Required Navigation
19. Required Content Themes
20. Accessibility Expectations
21. SEO Direction
22. Performance Expectations
23. Visual Direction
24. Constraints
25. Success Criteria
26. Limitations
27. Confidence Summary
28. Evidence Summary
29. Lineage
30. Diagnostics

The structure may evolve, but every version must remain deterministic,
provider-neutral, human-readable, AI-readable, experience-oriented,
lineage-aware, and tied to an aligned Digital Business Twin.

## Section Responsibilities

### Executive Summary

Summarizes the intended website experience in plain business language.

### Business Context

Identifies the aligned business understanding that informs the website brief.
This section references the DBT and Alignment lineage instead of restating raw
evidence.

### Business Goals

Lists the business outcomes the website should support.

### Website Objectives

Transforms business goals into website-level objectives such as explaining the
offer, increasing trust, supporting lead generation, guiding purchase
decisions, recruiting talent, educating customers, or clarifying positioning.

### Primary Audience

Defines the main audience the website must serve, including audience needs,
motivations, objections, and decision context where known.

### Secondary Audience

Defines additional audiences without allowing them to override primary website
priorities unless the aligned business intent says so.

### Customer Problems

Describes the audience problems, anxieties, jobs, or decision barriers the
website should address.

### Business Value Proposition

Defines the clearest business value the website should communicate.

### Competitive Advantages

Identifies differentiators, expertise, proof, service advantages, market
position, or other competitive strengths the website should express.

### Brand Personality

Describes the personality the website should convey.

### Tone of Voice

Defines communication style without writing provider prompts or generated
copy.

### Messaging Principles

States the message hierarchy, claims discipline, proof requirements, and
communication priorities that should guide downstream content generation.

### Trust Signals

Identifies evidence-backed trust elements such as testimonials, credentials,
case studies, guarantees, certifications, years of experience, press, clients,
security commitments, compliance signals, or operational proof.

### Products & Services Overview

Summarizes offerings as website-facing content priorities rather than
implementation entities.

### Desired Customer Journey

Defines how users should move from arrival to understanding, trust, decision,
and action.

### Website Information Architecture

Defines the intended information hierarchy and page relationships at a
conceptual level. It is not a layout, component tree, route implementation, or
block model.

### Required Website Pages

Lists required pages or page types as experience requirements. It does not
define generated pages or implementation files.

### Required Navigation

Defines navigation priorities and user wayfinding intent. It does not define
HTML, React, menus, components, or CSS.

### Required Content Themes

Defines themes the website should cover, such as proof, education, offerings,
process, pricing expectations, support, expertise, locations, or customer
outcomes.

### Accessibility Expectations

States business and user-experience expectations for accessibility without
choosing implementation techniques.

### SEO Direction

Defines search intent, topic direction, local or market emphasis, and
discoverability goals without writing metadata implementation or provider
payloads.

### Performance Expectations

Defines business expectations such as fast perceived loading, mobile
usability, reduced friction, and trustworthy interactions without prescribing
frameworks or implementation metrics.

### Visual Direction

Defines intended visual impression, brand expression, and creative tone
without prescribing layouts, CSS, component libraries, or generated assets.

### Constraints

Lists business, brand, legal, compliance, content, audience, claims,
accessibility, SEO, or market constraints that downstream planning must
respect.

### Success Criteria

Defines business-oriented success for the intended website experience.

### Limitations

Records missing, uncertain, conflicting, stale, or intentionally excluded
knowledge that affects website intent.

### Confidence Summary

Explains confidence in the brief and in major intent areas.

### Evidence Summary

Summarizes evidence families and aligned knowledge used to prepare the brief
without turning it into a raw evidence dump.

### Lineage

Identifies the aligned Digital Business Twin boundary, Business Understanding
Report, Business Alignment decisions, human corrections, and version lineage
that support the brief.

### Diagnostics

Records quality, completeness, conflict, source, and transformation
diagnostics in human-readable form. Diagnostics do not expose prompts,
provider payloads, code, execution artifacts, or runtime state.

## Business To Website Mapping

The Website Design Brief performs deterministic transformations of aligned
business understanding into website intent.

Examples:

| Business Knowledge | Website Intent |
| --- | --- |
| Business Goals | Website Objectives |
| Audience | Navigation priorities |
| Offerings | Content hierarchy |
| Brand | Visual direction |
| Business Intent | Customer journey |
| Knowledge | Trust content |

These mappings are transformations of understanding, not implementation.

Business Goals become Website Objectives. If the business wants qualified
leads, the website objective may be to help the right audience understand the
offer and know the next action.

Audience becomes Navigation priorities. If one audience is primary, navigation
should make that audience's path easier to understand without burying
secondary audiences.

Offerings become Content hierarchy. The website should emphasize the products
or services most relevant to the aligned business goals and audience needs.

Brand becomes Visual direction. Brand personality, tone, credibility, and
market position shape the intended visual impression without dictating CSS,
components, or layouts.

Business Intent becomes Customer journey. The desired outcome governs what the
user should understand, trust, compare, decide, and do.

Knowledge becomes Trust content. Evidence-backed expertise, proof,
credentials, relationships, or operational strengths become website trust
signals.

## Experience Principles

The Website Design Brief defines:

- what users should experience;
- what users should understand;
- what users should accomplish;
- what the website should communicate.

It never defines:

- HTML;
- React;
- CSS;
- Frameworks;
- Component libraries;
- Providers;
- Prompt wording.

The brief owns website intent only. It should be specific enough to guide
review, creative direction, and generation preparation, but abstract enough to
remain independent of implementation and provider serialization.

## Creative Direction

Creative direction describes the intended business impression of the website.
It may use descriptors such as:

- Professional;
- Premium;
- Friendly;
- Technical;
- Luxury;
- Minimal;
- Bold;
- Conservative;
- Modern;
- Traditional.

These descriptors guide the intended experience. They do not prescribe
implementation, layouts, color systems, typography systems, component
libraries, generated assets, or provider prompts.

## Success Criteria

Website Design Brief success criteria are business-oriented.

Examples:

- users understand the offer;
- users trust the business;
- users know next actions;
- business positioning is clear;
- customer journey is intuitive;
- brand perception is consistent.

The Website Design Brief never defines implementation metrics as success
criteria. It does not own bundle size, framework performance, API latency,
database behavior, deployment status, provider execution status, or publishing
state.

## Relationship Model

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
-> Validation
-> Publish
```

Layer responsibilities:

| Layer | Responsibility |
| --- | --- |
| Reality | The actual business, customers, market, operations, evidence, constraints, and outcomes. |
| Business Discovery | Collects and interprets business evidence. |
| Digital Business Twin | Governs the canonical operational understanding of the business. |
| Business Understanding Report | Presents current DBT understanding for human validation. |
| Business Alignment | Confirms or improves the Digital Business Twin before downstream planning begins. |
| Website Design Brief | Defines website experience intent from aligned business understanding. |
| Website Generation Package | Defines generation-ready orchestration for the intended website experience. |
| Provider Adapter | Serializes provider-neutral generation work into provider-specific formats. |
| External AI | Produces generated proposals or outputs from serialized work. |
| Validation | Checks generated output against originating intent, package, constraints, lineage, and approval requirements. |
| Publish | Releases approved output only after governance and validation. |

## Architectural Rules

The Website Design Brief never contains:

- generated HTML;
- generated React;
- generated pages;
- generated components;
- generated blocks;
- provider payloads;
- prompts;
- execution artifacts;
- publishing artifacts;
- deployment artifacts;
- runtime state.

It owns website intent only.

The Website Design Brief may contain business context, goals, website
objectives, audience priorities, messaging principles, trust signals, customer
journey intent, conceptual information architecture, page requirements,
navigation priorities, content themes, accessibility expectations, SEO
direction, performance expectations, visual direction, constraints, success
criteria, limitations, confidence, evidence summary, lineage, and diagnostics.

## Information That Belongs Here And Nowhere Else

The Website Design Brief owns the canonical website-intent decisions that sit
between aligned business understanding and generation planning:

- website objectives derived from business goals;
- audience priority for the intended website;
- customer journey intent;
- website-facing value proposition;
- message hierarchy and messaging principles;
- intended trust signals;
- conceptual information architecture;
- required page and navigation intent;
- content themes for the website experience;
- visual direction as business impression;
- accessibility, SEO, and performance expectations as experience intent;
- business-oriented success criteria for the website;
- constraints that shape website experience;
- limitations and confidence specific to website intent;
- lineage from aligned DBT knowledge into website intent.

These decisions should not be hidden in prompts, provider payloads, generated
pages, generated components, publishing artifacts, runtime state, or
implementation code.

## Completion Rule

At the end of WDB-0, the Website Design Brief is the canonical bridge between
business understanding and website generation.

The architecture clearly separates:

```text
Business Truth
-> Business Alignment
-> Website Intent
-> Generation
-> Implementation
```
