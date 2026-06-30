# Website Generation Package Specification

## Phase And Boundary

Phase WGP-0 defines the Website Generation Package as the canonical
generation contract between GNR8 and any future external generation system.

This phase is documentation and architecture only. It adds no implementation,
TypeScript, schema, persistence, API, UI, workers, prompts, provider adapters,
AI integration, generation, publishing, validation execution, runtime state,
or deployment behavior.

The Website Generation Package is not a prompt.

It is not HTML.

It is not React.

It is not implementation.

It is the canonical specification describing exactly what must be generated.

## Canonical Definition

"A deterministic, immutable, provider-neutral, versioned, lineage-aware
generation contract describing the intended website that external generation
systems must create."

The Website Generation Package is:

- provider-neutral;
- technology-neutral;
- implementation-neutral;
- deterministic;
- versioned;
- lineage-aware;
- human-readable;
- AI-readable.

The Website Generation Package is NOT:

- prompt;
- provider payload;
- React;
- HTML;
- Vue;
- Next.js;
- component tree;
- published website;
- execution artifact;
- deployment artifact;
- runtime state.

## Purpose

The Website Generation Package exists to:

- create one canonical generation contract;
- remove provider-specific business logic;
- separate business intent from implementation;
- support multiple AI providers;
- enable regeneration;
- enable comparison;
- enable validation;
- enable future providers.

The package gives GNR8 one deterministic description of the intended website
that can be serialized for different providers without changing meaning.

## What Is A Website Generation Package?

A Website Generation Package is the governed, versioned, lineage-aware
generation intent for one website. It describes the website external
generation systems must create, the business meaning they must preserve, the
constraints they must not violate, and the validation expectations GNR8 will
later use to judge generated proposals.

It is produced exclusively from an aligned Website Design Brief. The aligned
Website Design Brief defines the intended website experience. The Website
Generation Package converts that experience intent into a deterministic
generation contract.

The package is the last canonical GNR8-owned meaning layer before
provider-specific serialization begins.

## Difference From Website Design Brief

The Website Design Brief defines experience.

The Website Generation Package defines generation.

The Website Design Brief is the business-to-experience bridge. It explains
what the website should express, communicate, prioritize, and make possible
for users.

The Website Generation Package is the generation contract. It specifies what
must exist, what must be communicated, what users must accomplish, what
business outcomes must be supported, and what constraints must never be
violated by generated output.

The Website Design Brief remains human-facing and experience-oriented. The
Website Generation Package is prepared for downstream provider adapter
serialization and validation-ready generation.

## Difference From Prompts

The Website Generation Package is not a prompt.

Prompts are provider-specific serialization artifacts derived from the
package. A prompt may be optimized for a provider's context window, message
format, task style, tool interface, or request shape. Those details are
adapter concerns.

The package owns meaning. Provider prompts own transport.

The core rule is:

```text
Website Generation Package != Prompt

Provider prompt = disposable adapter projection of the Website Generation Package
```

Prompts may change whenever providers, models, APIs, or adapter strategies
change. The Website Generation Package must not change meaning because a
provider changes.

## Recommended Package Structure

The recommended Website Generation Package structure is:

1. Package Metadata
2. Business Context
3. Business Objectives
4. Website Objectives
5. Audience
6. Business Intent
7. Experience Intent
8. Brand Requirements
9. Messaging
10. Visual Direction
11. Information Architecture
12. Navigation Contract
13. Page Contract
14. Section Contract
15. Content Requirements
16. Media Requirements
17. SEO Requirements
18. Accessibility Requirements
19. Performance Requirements
20. Technical Constraints
21. Acceptance Criteria
22. Validation Contract
23. Limitations
24. Confidence
25. Evidence Summary
26. Lineage
27. Diagnostics

The structure may evolve by version, but every version must remain
deterministic, immutable once issued, provider-neutral, technology-neutral,
implementation-neutral, human-readable, AI-readable, lineage-aware, and
derived from an aligned Website Design Brief.

## Section Responsibilities

### Package Metadata

Identifies the package, package version, originating Website Design Brief,
creation time, status, and contract version.

### Business Context

Summarizes the aligned business context required for generation without
replacing the Digital Business Twin or Website Design Brief.

### Business Objectives

Lists the business outcomes the generated website must support.

### Website Objectives

Defines website-level objectives such as explain the offer, increase trust,
drive qualified leads, support purchases, recruit talent, educate customers,
or clarify positioning.

### Audience

Defines primary and secondary audiences, their needs, decision context,
objections, and required user accomplishments.

### Business Intent

Carries the governed desired outcomes that authorize this website generation
scope.

### Experience Intent

Carries the intended website experience from the aligned Website Design Brief
in generation-ready form.

### Brand Requirements

Defines brand requirements that generated output must preserve, including
personality, tone, trust posture, proof expectations, and forbidden brand
drift.

### Messaging

Defines the required message hierarchy, claims discipline, proof requirements,
calls to action, and content priorities. It does not contain provider prompts.

### Visual Direction

Defines visual intent, mood, hierarchy, density, imagery direction, and design
constraints without prescribing CSS, components, frameworks, or code.

### Information Architecture

Defines required information hierarchy and page relationships without becoming
a route implementation or component tree.

### Navigation Contract

Defines required navigation completeness, priority, labels or label intent,
and user path expectations.

### Page Contract

Defines required pages, page purposes, audience needs, required messages,
success expectations, and constraints.

### Section Contract

Defines required section intents, ordering constraints where meaningful,
content responsibilities, and business purpose.

### Content Requirements

Defines required content themes, proof points, trust signals, offer
descriptions, calls to action, exclusions, and areas that must remain explicit
limitations rather than invented content.

### Media Requirements

Defines media needs, asset expectations, source constraints, licensing or
usage limitations, and required treatment of missing media.

### SEO Requirements

Defines search intent, metadata expectations, content coverage, heading
expectations, URL constraints, and discoverability requirements.

### Accessibility Requirements

Defines accessibility expectations the generated website must satisfy.

### Performance Requirements

Defines performance expectations at the level of outcomes and constraints, not
implementation mechanics.

### Technical Constraints

Defines provider-neutral technical constraints that generated output must
respect without selecting a framework, component library, runtime, or
deployment implementation.

### Acceptance Criteria

Defines deterministic criteria generated proposals must satisfy before human
approval can be considered.

### Validation Contract

Defines explicit success expectations that GNR8 Validation will later evaluate
against generated output.

### Limitations

Captures missing, uncertain, conflicting, stale, unsupported, or intentionally
out-of-scope requirements.

### Confidence

States confidence by major package area and explains uncertainty that affects
generation or validation.

### Evidence Summary

Summarizes evidence and aligned understanding that support the package without
embedding raw source artifacts as implementation instructions.

### Lineage

Binds the package to its aligned Website Design Brief, Business Alignment,
Business Understanding Report, Digital Business Twin, evidence, decisions,
and package version.

### Diagnostics

Records derivation notes, completeness checks, conflicts, unsupported fields,
stale references, and other audit information.

## Generation Contract

The Website Generation Package specifies:

- what must exist;
- what must be communicated;
- what users must accomplish;
- what business outcomes must be supported;
- what constraints must never be violated.

It never specifies implementation.

It does not prescribe React, HTML, Vue, Next.js, component trees, blocks,
provider payloads, CSS, runtime state, deployment artifacts, published URLs,
or execution behavior.

The package owns generation intent only. Generated implementations remain
external proposals until GNR8 Validation and Human Approval accept them.

## Validation Contract

The Website Generation Package contains explicit success expectations for
later GNR8 Validation.

Validation expectations include:

- business positioning remains correct;
- brand consistency is preserved;
- navigation is complete;
- customer journey is complete;
- accessibility is respected;
- SEO requirements are satisfied;
- required content is represented;
- trust signals are present;
- constraints are respected.

The Validation Contract is not validation execution. It is the deterministic
set of expectations that later validation must evaluate against generated
output.

## Provider Neutrality

The provider-neutral flow is:

```text
Website Generation Package
-> Provider Adapter
-> Provider Payload
-> External AI
```

Provider adapters serialize the package. They never redefine meaning.

Adapters may transform the Website Generation Package into provider prompts,
messages, task files, structured payloads, API calls, context packs, or other
provider-specific formats. Those artifacts are disposable projections.

Adapters must not mutate the package, weaken lineage, invent meaning, remove
limitations, rewrite business intent, or make provider output canonical.

## Stability Across Provider Evolution

The Website Generation Package remains stable because it describes business
meaning, website intent, constraints, lineage, acceptance criteria, and
validation expectations in provider-neutral terms.

Providers may change models, APIs, tool formats, capabilities, pricing,
context windows, structured-output formats, or recommended prompting patterns.
Those changes affect provider adapters and provider payloads only.

The same Website Generation Package should produce equivalent websites across
providers. Different providers may produce different implementations, but the
business meaning must remain invariant.

## Regeneration And Comparison

Regeneration starts from the same canonical Website Generation Package or a
newer version with explicit lineage.

Equivalent generation does not mean byte-identical output, identical markup,
or identical component structure. It means generated proposals preserve the
same business positioning, website objectives, audience priorities, messaging
requirements, brand requirements, navigation completeness, content
requirements, constraints, and validation expectations.

Because the package is deterministic and versioned, GNR8 can compare
provider outputs against the same contract and evaluate whether providers
preserved meaning.

## Relationship Model

The canonical lifecycle is:

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
-> Human Approval
-> Publish
```

The Website Generation Package is produced exclusively from an aligned
Website Design Brief. Provider adapters serialize the package. External AI
generates proposals. GNR8 Validation evaluates proposals against the package.
Humans approve. Publish promotes only approved output.

## Responsibilities Owned Here And Nowhere Else

The Website Generation Package owns:

- canonical generation intent;
- generation-ready transformation of the aligned Website Design Brief;
- provider-neutral website requirements;
- required business outcomes for the generated website;
- required user accomplishments;
- generation constraints;
- acceptance criteria;
- validation expectations;
- confidence, limitations, lineage, and diagnostics for generation.

No provider adapter, prompt, provider payload, external model, generated
website, deployment artifact, or runtime state may redefine these
responsibilities.

## Architectural Rules

Website Generation Package never contains:

- provider prompts;
- provider payloads;
- React;
- HTML;
- Vue;
- components;
- blocks;
- CSS;
- runtime artifacts;
- deployment artifacts;
- published URLs;
- execution state;
- generated outputs.

It owns generation intent only.

Any future architecture that makes prompts, provider payloads, generated
components, generated markup, generated code, runtime state, deployment
artifacts, or published URLs part of the Website Generation Package violates
this specification.

## Manifesto Alignment

The Website Generation Package is the canonical generation contract.

Provider prompts are disposable projections.

GNR8 owns meaning.

Providers own implementation.

Business understanding defines intent. Website Design Brief defines
experience. Website Generation Package defines generation. Provider adapters
define serialization. External AI creates proposals. Validation and Human
Approval govern promotion toward publish.
