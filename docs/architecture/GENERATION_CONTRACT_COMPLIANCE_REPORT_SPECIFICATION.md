# Generation Contract Compliance Report Specification

## Phase And Boundary

Phase WGP-2 defines the Generation Contract Compliance Report as the
business-facing report produced after Generation Contract Compliance evaluates
an externally generated website against the Website Generation Package.

This phase is documentation and architecture only. It adds no implementation,
TypeScript, schema, persistence, API, UI, workers, provider adapters, prompts,
AI integration, generation, publishing, compliance execution, validation
execution, runtime state, or deployment behavior.

The Generation Contract Compliance Report is not generated content.

It is not implementation.

It is not a prompt.

It is not a website.

It is the governed business evaluation delivered after generation.

## Canonical Definition

"A deterministic, provider-neutral, human-readable, lineage-aware report
describing contractual compliance between the Website Generation Package and a
generated website."

The Generation Contract Compliance Report is:

- human-readable;
- business-oriented;
- provider-neutral;
- versioned;
- deterministic;
- lineage-aware.

The Generation Contract Compliance Report is not:

- HTML;
- React;
- prompt;
- provider payload;
- generation request;
- implementation artifact;
- publishing artifact;
- execution artifact.

## What Is A Generation Contract Compliance Report?

A Generation Contract Compliance Report is the canonical human-readable
business report that explains whether a generated website satisfies the
Website Generation Package.

It translates the deterministic compliance evaluation into a governed report
that business stakeholders can read, compare, approve, reject, or use to
request regeneration. It describes contractual fulfillment, contractual
deviations, missing requirements, unexpected elements, constraint violations,
business risks, readiness for approval, evidence, lineage, limitations, and
diagnostics.

The report belongs after generation and after Generation Contract Compliance.
It is the business-facing report that makes the compliance result reviewable
before Human Approval.

## Difference From Generation Contract Compliance

Generation Contract Compliance is the governed evaluation process.

The Generation Contract Compliance Report is the human-readable result of that
evaluation.

Generation Contract Compliance compares the generated website against the
Website Generation Package. It determines pass, partial, fail, unknown, and
non-applicable outcomes at the contract, category, and requirement boundaries.

The Generation Contract Compliance Report communicates those outcomes in a
business-oriented way. It explains what happened, what matters, what risks
exist, what evidence supports the conclusion, and which approval or
regeneration decision is recommended.

Compliance evaluates.

The report explains.

Compliance is not the approval decision.

The report supports the approval decision.

## Primary Audience

The primary audience is the human business reviewer responsible for deciding
whether a generated website should proceed toward approval, regeneration,
alignment, package improvement, or further review.

Secondary audiences include:

- business owners;
- operators;
- implementation reviewers;
- provider-comparison reviewers;
- governance reviewers;
- audit reviewers;
- future regeneration planners.

The report must remain readable by non-engineering stakeholders. Diagnostics
may exist, but they must support business evaluation rather than turn the
report into a technical trace dump.

## Business Decisions Supported

The Generation Contract Compliance Report supports decisions such as:

- whether the generated website can proceed to Human Approval;
- whether the generated website should be regenerated;
- whether the Website Generation Package needs improvement;
- whether Business Alignment must be repeated;
- whether evidence is insufficient for approval;
- whether a human must inspect a specific deviation before deciding;
- which provider output best satisfies the same Website Generation Package;
- which business risks must be accepted, mitigated, or rejected;
- whether contractual deviations are acceptable limitations or approval
  blockers.

The report does not publish, deploy, regenerate, mutate source truth, revise
the package, or approve on behalf of the human reviewer.

## Purpose

The Generation Contract Compliance Report exists to:

- explain generation results;
- support business review;
- support approval;
- explain contractual deviations;
- summarize business risks;
- support provider comparison;
- support regeneration decisions;
- provide auditability.

It gives GNR8 a canonical business-facing checkpoint between generated output
and Human Approval. The report turns compliance into a reviewable business
artifact without making provider prompts, provider payloads, generated code, or
deployment state canonical.

## Information That Belongs Here And Nowhere Else

The Generation Contract Compliance Report owns information that is specific to
business-facing compliance communication:

- the business-readable summary of contractual fulfillment;
- the approval-facing recommendation;
- the readiness state for human approval;
- the business interpretation of compliance category outcomes;
- the business impact of missing requirements;
- the business impact of unexpected generated elements;
- the business impact of violated constraints;
- the business risk summary caused by generation deltas;
- the explanation of why regeneration, package improvement, or repeated
  alignment is recommended;
- the lineage-aware connection between one Website Generation Package version,
  one generated website, and one compliance evaluation;
- the evidence summary needed for a human to understand the compliance result.

The report does not own source business truth, Business Alignment decisions,
Website Design Brief authorship, Website Generation Package authorship,
provider serialization, generated implementation content, publishing state, or
human approval state.

## Recommended Report Structure

A canonical Generation Contract Compliance Report should contain:

1. Executive Summary
2. Generation Overview
3. Overall Compliance
4. Business Compliance
5. Experience Compliance
6. Implementation Compliance
7. Category Results
8. Detected Deviations
9. Missing Requirements
10. Unexpected Elements
11. Constraint Violations
12. Business Risks
13. Generation Readiness
14. Recommendation
15. Limitations
16. Evidence Summary
17. Lineage
18. Diagnostics

### Executive Summary

Summarizes the compliance outcome in business language, including whether the
generated website appears ready for approval, requires regeneration, requires
package improvement, requires repeated alignment, or needs human review.

### Generation Overview

Identifies the generated website under review, the Website Generation Package
version it was generated from, the provider-neutral generation context, and
the compliance evaluation version.

### Overall Compliance

Summarizes the aggregate compliance position without turning readiness into a
pure technical score. The section should identify major pass, partial, fail,
unknown, and not-applicable outcomes.

### Business Compliance

Explains whether the generated website satisfies required business goals,
audience, positioning, offerings, trust posture, messaging, and business
constraints.

### Experience Compliance

Explains whether the generated website satisfies required information
architecture, navigation, page/section coverage, customer journey,
accessibility expectations, SEO expectations, brand expression, and content
experience.

### Implementation Compliance

Explains whether observable implementation outcomes satisfy contractual
constraints, required assets, forbidden behaviors, runtime expectations,
performance expectations, deployment constraints, or other package-defined
implementation obligations. It must not evaluate provider craft, code style,
framework preference, or subjective aesthetics.

### Category Results

Lists deterministic category outcomes from compliance evaluation and explains
their business meaning.

### Detected Deviations

Identifies generated results that diverge from the Website Generation Package,
including whether each deviation is acceptable, risky, blocking, or unknown.

### Missing Requirements

Identifies package requirements that are absent, incomplete, ambiguous, or not
observable in the generated website.

### Unexpected Elements

Identifies generated elements that were not required or expected and that may
change business meaning, user experience, claims, risk, or approval posture.

### Constraint Violations

Identifies contractual constraints the generated website appears to violate.
Constraint violations must preserve their source package refs and business
impact.

### Business Risks

Summarizes risks created by compliance deltas, such as incorrect positioning,
missing trust signals, unsupported claims, incomplete customer paths,
misleading offers, brand inconsistency, or approval uncertainty.

### Generation Readiness

States whether the generated website is ready for approval, ready with
limitations, requires regeneration, requires alignment, or is blocked.

### Recommendation

Provides one canonical recommendation from the recommendation model and
explains why it follows from the compliance evidence.

### Limitations

Preserves uncertainty, missing evidence, scope boundaries, evaluation limits,
and known issues that affect confidence in the report.

### Evidence Summary

Summarizes the evidence used to support report conclusions without embedding
provider payloads, generated code, raw prompts, runtime state, or publishing
artifacts.

### Lineage

Identifies the Website Generation Package, generated website reference,
compliance evaluation reference, report version, and upstream business lineage
needed to audit the report.

### Diagnostics

Provides deterministic diagnostics useful for governance, comparison, and
audit. Diagnostics must remain subordinate to business evaluation.

## Recommendation Model

Canonical recommendations are:

### Proceed To Approval

Use when the generated website satisfies the Website Generation Package well
enough for human approval review and no known compliance blocker remains.

This does not approve or publish the website. It means the compliance report
supports moving to the Human Approval checkpoint.

### Regenerate

Use when the generated website materially fails contractual expectations, has
blocking deviations, omits required business or experience elements, violates
important constraints, or creates unacceptable business risk.

Regeneration uses the Website Generation Package as the reference unless the
report also identifies package or alignment defects.

### Improve Website Generation Package

Use when the generated website exposes ambiguity, incompleteness, conflicting
requirements, weak acceptance criteria, missing constraints, or insufficiently
specific instructions in the Website Generation Package.

This recommendation targets the contract, not the provider output.

### Repeat Business Alignment

Use when compliance defects reveal that the Website Generation Package may
reflect unresolved or incorrect business understanding, conflicting stakeholder
intent, missing business priorities, or outdated Digital Business Twin
assumptions.

This recommendation routes the work back to governed business understanding
rather than treating the problem as a generation defect.

### Insufficient Evidence

Use when the generated website, compliance evaluation, lineage, or available
observations do not provide enough evidence to make a confident readiness
decision.

Insufficient Evidence is not approval. It preserves uncertainty.

### Human Review Required

Use when deterministic compliance can identify the issue but cannot decide its
business acceptability. Examples include subjective brand judgment,
stakeholder preference, acceptable tradeoffs, or risk acceptance decisions.

Human Review Required routes the decision to the appropriate reviewer without
silently approving or rejecting the generated website.

## Compliance Classification

The report must communicate three independent compliance dimensions:

1. Business Compliance
2. Experience Compliance
3. Implementation Compliance

These dimensions are independent. A generated website may satisfy one
dimension while failing another.

### Business Compliance

Business Compliance evaluates whether the generated website preserves and
expresses approved business meaning.

It owns questions about business goals, audience, positioning, offerings,
claims, trust posture, brand voice, business constraints, compliance-sensitive
messaging, and risk to business truth.

Business Compliance does not define website structure, component
implementation, provider prompts, or deployment behavior.

### Experience Compliance

Experience Compliance evaluates whether the generated website expresses the
approved business intent through the required website experience.

It owns questions about information architecture, navigation, page and section
coverage, customer journey, content hierarchy, calls to action, accessibility
expectations, SEO expectations, visual direction, and user-facing experience
requirements.

Experience Compliance does not author the Website Design Brief or create new
requirements after generation.

### Implementation Compliance

Implementation Compliance evaluates whether observable implementation outcomes
satisfy package-defined constraints and acceptance expectations.

It owns questions about required assets, forbidden elements, technical
constraints, performance expectations, deployment constraints, generated
artifact acceptability, and observable implementation obligations stated in the
Website Generation Package.

Implementation Compliance does not grade provider craft, code elegance,
framework choice, internal component architecture, subjective design taste, or
provider-specific implementation style.

## Generation Readiness

Generation Readiness is the report's business decision state for the generated
website. It is not a technical score.

Canonical readiness states are:

### READY

The generated website satisfies the Website Generation Package well enough for
Human Approval review. No known compliance blocker remains.

### READY_WITH_LIMITATIONS

The generated website may proceed to Human Approval review, but the report
identifies limitations, partial results, unknowns, minor deviations, or risks
that the human reviewer must see before deciding.

### REQUIRES_REGENERATION

The generated website fails important contractual expectations and should be
regenerated before approval review.

### REQUIRES_ALIGNMENT

The generated website's defects indicate upstream business understanding,
Business Alignment, Website Design Brief, or Website Generation Package intent
may be wrong, incomplete, ambiguous, stale, or contradictory.

### BLOCKED

The report cannot support approval, regeneration, or alignment decisions
because required evidence, lineage, generated website access, compliance
evaluation, or report prerequisites are missing or invalid.

Readiness expresses business actionability. It may consider compliance results,
business risk, evidence quality, lineage, limitations, and recommendation, but
it must not be reduced to a provider score, code score, aesthetic score, or
technical pass/fail metric.

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
-> Generation Contract Compliance Report
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

Provider Adapter serializes the package for an external provider without
redefining meaning.

### External AI

External AI generates an implementation proposal.

### Generation Contract Compliance

Generation Contract Compliance evaluates whether the generated website
satisfies the Website Generation Package.

### Generation Contract Compliance Report

Generation Contract Compliance Report communicates the compliance evaluation
as a governed, human-readable, business-facing report.

### Human Approval

Human Approval decides whether the generated website may proceed toward
publishing.

### Publish

Publish promotes only approved output.

## Architectural Rules

The Generation Contract Compliance Report never contains:

- provider prompts;
- provider payloads;
- generated HTML;
- generated React;
- generated components;
- generated blocks;
- deployment artifacts;
- execution artifacts;
- runtime state;
- publishing state.

It communicates business evaluation only.

The report must remain deterministic, provider-neutral, versioned, and
lineage-aware. It may reference generated website observations and compliance
evidence, but it must not embed generated implementation artifacts or make them
canonical.

## Business Truth To Publish Boundary

The WGP-2 boundary preserves this architectural sequence:

```text
Business Truth
-> Business Alignment
-> Website Intent
-> Generation Contract
-> Implementation Proposal
-> Compliance Evaluation
-> Business Compliance Report
-> Human Approval
-> Publish
```

Business Truth is governed through the Digital Business Twin.

Business Alignment confirms or improves that truth before website planning.

Website Intent is expressed by the Website Design Brief.

Generation Contract is expressed by the Website Generation Package.

Implementation Proposal is produced by External AI.

Compliance Evaluation is Generation Contract Compliance.

Business Compliance Report is the Generation Contract Compliance Report.

Human Approval is the explicit governance decision before Publish.

## Provider Comparison

When multiple providers generate from the same Website Generation Package, each
generated website may receive its own Generation Contract Compliance Report.

Reports should make provider comparison possible without turning provider
identity, prompt wording, payload format, framework choice, or implementation
style into the source of truth.

Provider comparison belongs to business and contract fulfillment:

- which output satisfied the package best;
- which output created the fewest material deviations;
- which output preserved business meaning most clearly;
- which output requires the least regeneration or alignment work;
- which output carries the lowest business risk.

## Determinism And Auditability

The same Website Generation Package, generated website observation, compliance
evaluation inputs, report version, and lineage should produce the same
Generation Contract Compliance Report.

The report must preserve enough lineage for audit:

- Digital Business Twin lineage;
- Business Understanding Report lineage;
- Business Alignment decision lineage;
- Website Design Brief lineage;
- Website Generation Package version;
- generated website reference;
- Generation Contract Compliance evaluation reference;
- report version;
- evidence refs;
- limitations;
- diagnostics.

Auditability does not require embedding raw prompts, provider payloads,
generated code, deployment artifacts, runtime state, or publishing state.

## Future Work

Future implementation may define formal report contracts, persistence,
surfaces, provider comparison workflows, and approval integrations. Those
future phases must preserve the boundary defined here: the Generation Contract
Compliance Report is a governed business evaluation report, not generated
content, not a prompt, not implementation, and not publishing state.
