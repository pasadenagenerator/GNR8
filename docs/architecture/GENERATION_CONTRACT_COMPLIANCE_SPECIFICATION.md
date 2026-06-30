# Generation Contract Compliance Specification

## Phase And Boundary

Phase WGP-1 defines Generation Contract Compliance as the governed process
through which GNR8 evaluates whether an externally generated website satisfies
the canonical Website Generation Package.

This phase is documentation and architecture only. It adds no implementation,
TypeScript, schema, persistence, API, UI, workers, prompts, provider adapters,
AI integration, generation, publishing, compliance execution, validation
execution, runtime state, or deployment behavior.

Generation Contract Compliance evaluates contractual fulfillment.

It does not evaluate implementation technology.

It does not evaluate provider quality.

It evaluates alignment between the intended website and the generated website.

## Canonical Definition

"A deterministic, provider-neutral, evidence-backed evaluation comparing a
generated website against the canonical Website Generation Package."

Generation Contract Compliance determines whether contractual intent has been
satisfied.

It never evaluates implementation style.

## Purpose

Generation Contract Compliance exists to:

- verify contractual fulfillment;
- measure generation completeness;
- detect missing requirements;
- detect violated constraints;
- support human approval;
- support provider comparison;
- support regeneration;
- support governance.

Compliance gives GNR8 a deterministic way to decide whether a generated website
fulfilled the Website Generation Package without making any provider,
framework, prompt, payload, or implementation technique canonical.

## What Is Generation Contract Compliance?

Generation Contract Compliance is the governed outcome-evaluation layer after
External AI. It compares the intended website described by the Website
Generation Package with the observable generated website and produces a
Compliance Report.

Compliance answers one canonical question:

```text
Did this generated website satisfy the Website Generation Package?
```

It does not answer:

- Which provider is best in general?
- Which framework should have been used?
- Whether the HTML is elegant?
- Whether the React architecture is idiomatic?
- Whether the provider's internal reasoning was good?
- Whether an operator personally prefers the design?

Those questions belong outside Generation Contract Compliance.

## Difference From Validation

Validation determines whether an artifact, process, or runtime state satisfies
the rules for its own layer. It can apply to inputs, intermediate contracts,
lineage, readiness, persistence, route behavior, or execution safety.

Compliance is narrower. It applies after an external provider has generated a
website and compares that generated outcome against the canonical Website
Generation Package.

Validation asks whether something is valid.

Compliance asks whether a generated website fulfilled the contract.

Validation may protect many GNR8 layers. Compliance belongs specifically to
the generated-website outcome boundary.

## Difference From QA

Quality assurance can include manual review, subjective design judgment,
browser testing, defect triage, editorial polish, device testing, production
readiness, accessibility audits, and implementation-specific investigation.

Generation Contract Compliance is not general QA. It does not inspect code
style, provider craft, component architecture, framework decisions, or
subjective aesthetics.

Compliance produces a contract-focused answer: which requirements were met,
which requirements are missing, which constraints were violated, and which
business risks follow from those deltas.

QA may use Compliance Reports as input. QA does not define Compliance.

## Provider Neutrality

Generation Contract Compliance is provider-neutral because the Website
Generation Package is provider-neutral.

The canonical flow is:

```text
Website Generation Package
-> Provider Adapter
-> External AI
-> Generated Website
-> Compliance
```

The same package should be measurable regardless of provider. OpenAI, Claude,
Gemini, Codex, Stitch, v0, or any future provider may produce different
implementation proposals, but Compliance measures the generated website
against the same contractual reference.

Provider adapters may transform the package into provider-specific payloads.
Those payloads do not redefine meaning. Compliance does not grade the payload,
prompt, model, provider API, framework, code structure, or generation method.
It evaluates only the observable generated outcome against the Website
Generation Package.

## Compliance Model

The canonical comparison model is:

```text
Website Generation Package
-> Expected Website Intent
-> Generated Website
-> Observed Website Reality
-> Contract Delta
-> Compliance Report
```

### Website Generation Package

The Website Generation Package is the canonical reference. It defines the
website that external generation systems must create, including business
goals, audience, messaging, brand requirements, information architecture,
navigation, pages, sections, content requirements, assets, constraints,
acceptance criteria, limitations, evidence, lineage, and diagnostics.

### Expected Website Intent

Expected Website Intent is the compliance-ready interpretation of the package.
It describes what should be observable in the generated website if the package
has been fulfilled. It remains provider-neutral and implementation-neutral.

### Generated Website

The Generated Website is the external AI output under review. It is an
implementation proposal, not the source of truth. It may be HTML, React,
static output, a hosted preview, a provider artifact, or another generated
form, but Compliance does not make that form canonical.

### Observed Website Reality

Observed Website Reality is what GNR8 can inspect from the generated website.
It includes observable pages, navigation, content, messages, assets, user
journeys, constraints, limitations, and evidence of fulfillment or deviation.

### Contract Delta

The Contract Delta is the deterministic difference between expected intent and
observed reality. It identifies satisfied expectations, partial fulfillment,
missing requirements, unexpected elements, constraint violations, unknowns,
and business risks.

### Compliance Report

The Compliance Report is the human-facing and governance-facing result. It
summarizes contract fulfillment, category results, deviations, missing
requirements, risks, recommended actions, limitations, evidence, version,
lineage, and diagnostics.

## Compliance Categories

Generation Contract Compliance should evaluate contractual expectations in
categories such as:

1. Business Goals
2. Audience Representation
3. Messaging
4. Brand Consistency
5. Navigation
6. Information Architecture
7. Customer Journey
8. Content Coverage
9. Trust Signals
10. Accessibility
11. SEO
12. Performance Expectations
13. Technical Constraints
14. Required Assets
15. Limitations

Categories may evolve by version, but every category must remain tied to the
Website Generation Package. Compliance must not introduce new requirements
that were not part of the package, its lineage, or its approved limitations.

## Contractual Expectations To Verify

Generation Contract Compliance verifies whether the generated website:

- supports the required business goals;
- represents the intended audience and their needs;
- communicates the required message hierarchy;
- preserves brand personality, tone, trust posture, and constraints;
- includes required navigation and user paths;
- reflects the required information architecture;
- supports the intended customer journey;
- covers required content themes, offers, proof points, and calls to action;
- includes required trust signals;
- satisfies accessibility expectations stated in the package;
- satisfies SEO expectations stated in the package;
- satisfies performance expectations stated in the package;
- respects technical constraints stated in the package;
- uses or acknowledges required assets correctly;
- preserves explicit limitations instead of inventing unsupported claims;
- avoids forbidden content, forbidden claims, and forbidden behavior;
- remains traceable to package version, lineage, and evidence.

## Compliance Results

Canonical category and requirement results should be:

### PASS

The generated website satisfies the contractual expectation with sufficient
observable evidence.

### PARTIAL

The generated website satisfies part of the contractual expectation, but the
fulfillment is incomplete, ambiguous, weak, or limited.

### FAIL

The generated website does not satisfy the contractual expectation, omits a
required element, violates a required constraint, or contradicts the package.

### NOT_APPLICABLE

The contractual expectation does not apply to this generation scope, package
version, page, audience, or limitation.

### UNKNOWN

Compliance cannot determine the result from available evidence. UNKNOWN is not
a PASS. It must preserve uncertainty for human review or regeneration.

## Compliance Report Structure

A canonical Compliance Report should contain:

1. Executive Summary
2. Overall Compliance Score
3. Category Results
4. Detected Deviations
5. Missing Requirements
6. Unexpected Elements
7. Constraint Violations
8. Business Risks
9. Recommended Actions
10. Limitations
11. Evidence
12. Version
13. Lineage
14. Diagnostics

The report should be deterministic, provider-neutral, evidence-backed,
versioned, lineage-aware, human-readable, and suitable for governance review.

## Compliance Responsibilities

Generation Contract Compliance owns responsibilities that belong nowhere else:

- compare the generated website against the canonical Website Generation
  Package;
- preserve the Website Generation Package as the reference;
- identify contractual fulfillment, partial fulfillment, failure, unknowns,
  and non-applicable requirements;
- produce category-level and overall compliance results;
- identify missing contractual requirements;
- identify unexpected elements that materially affect intent;
- identify constraint violations;
- identify business risks caused by contract deltas;
- recommend approval, revision, regeneration, or human review actions;
- preserve evidence, version, lineage, diagnostics, and limitations for the
  compliance decision;
- enable deterministic comparison between multiple provider outputs generated
  from the same Website Generation Package.

Compliance does not own business discovery, Digital Business Twin truth,
Business Alignment, Website Design Brief authorship, Website Generation Package
authorship, provider serialization, prompt creation, provider execution,
implementation, publishing, deployment, or human approval.

## Compliance Philosophy

Generation Contract Compliance evaluates:

- business intent;
- experience intent;
- contract fulfillment.

It does not evaluate:

- HTML quality;
- framework quality;
- coding style;
- provider implementation;
- design preference;
- subjective aesthetics.

Generated websites are implementation proposals. Compliance determines whether
those proposals fulfill the contract. It does not reward or punish providers
for choosing a particular implementation technology.

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
-> Generation Contract Compliance
-> Human Approval
-> Publish
```

### Reality

Reality is the business and its observable context independent of any GNR8
artifact.

### Business Discovery

Business Discovery gathers and structures business evidence.

### Digital Business Twin

The Digital Business Twin is the canonical operational understanding of the
business and its digital identity.

### Business Understanding Report

The Business Understanding Report is the first human-facing projection of the
Digital Business Twin and validates understanding before downstream planning.

### Business Alignment

Business Alignment confirms or improves the Digital Business Twin before
website planning begins.

### Website Design Brief

The Website Design Brief defines the intended business expression and website
experience.

### Website Generation Package

The Website Generation Package defines the canonical generation contract.

### Provider Adapter

The Provider Adapter serializes the package for a provider without redefining
meaning.

### External AI

External AI produces an implementation proposal from the serialized task.

### Generation Contract Compliance

Generation Contract Compliance compares the generated website against the
Website Generation Package and determines contractual fulfillment.

### Human Approval

Human Approval accepts, rejects, requests changes, or authorizes next action
based on the Compliance Report and governance context.

### Publish

Publish promotes approved output. Publishing is never the act of generation or
compliance evaluation.

## Architectural Rules

Generation Contract Compliance never contains:

- provider prompts;
- provider payloads;
- HTML generation;
- React generation;
- component generation;
- layout generation;
- publishing artifacts;
- deployment artifacts;
- execution artifacts;
- runtime state.

It evaluates outcomes only.

Compliance reports may reference observed generated output and package
evidence, but they must not become the generated website, provider payload,
prompt, deployment package, publishing state, or implementation source of
truth.

## Future Direction

Future Compliance Reports should enable deterministic comparison between
multiple provider outputs generated from the same Website Generation Package.

The Website Generation Package remains the canonical reference.

Provider prompts remain disposable projections.

Generation quality is measured by contract compliance, not by implementation
technology.
