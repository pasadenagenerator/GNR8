# Business Approval Specification

Phase WGP-3 defines Business Approval as the governed business decision that
determines whether a generated website may proceed toward publishing after
successful Generation Contract Compliance.

Business Approval approves business intent.

It never approves implementation technology.

It never approves prompts.

It never approves providers.

Business Approval is the final business governance checkpoint before Publish.

## Canonical Definition

"A deterministic, governed business decision confirming that contractual
expectations have been sufficiently satisfied for publishing."

Business Approval governs business acceptance.

It does not govern implementation.

## What Is Business Approval?

Business Approval is the deterministic, governed decision that accepts or
rejects the business result of a generated website after the Generation
Contract Compliance Report has communicated contractual fulfillment,
limitations, risks, readiness, and recommendations.

Business Approval answers:

Did this generated website sufficiently satisfy the approved business intent
and contractual expectations to proceed toward publishing?

It is not a technical review of HTML, React, framework selection, provider
behavior, prompt construction, implementation style, or code quality.

Business Approval belongs after:

- Business Alignment;
- Website Design Brief;
- Website Generation Package;
- Provider Adapter serialization;
- External AI generation;
- Generation Contract Compliance;
- Generation Contract Compliance Report.

Business Approval belongs before:

- Publish;
- any public promotion of generated output;
- any operational acceptance of the generated website as an approved
  manifestation.

## Purpose

Business Approval exists to:

- approve contractual fulfillment;
- accept business risk;
- authorize publishing;
- authorize regeneration;
- require further alignment;
- protect business integrity;
- maintain governance.

Business Approval gives the business an explicit decision boundary after
contract compliance has been evaluated and before publishing occurs.

## Difference From Compliance

Generation Contract Compliance is the governed evaluation process.

Generation Contract Compliance Report is the human-readable result of that
evaluation.

Business Approval is the governed business decision made from that report and
the upstream business artifacts.

Compliance evaluates contractual fulfillment.

Business Approval accepts or rejects the business consequence of that
fulfillment.

Compliance can determine that a generated website passes, partially passes,
fails, or has unknown requirements. Business Approval decides whether the
business can proceed, proceed with limitations, regenerate, return to
alignment, or block publishing.

Compliance is evidence-backed evaluation.

Business Approval is accountable business acceptance.

## Difference From Publishing

Publishing is the governed promotion of an approved generated website toward a
public or operational environment.

Business Approval is the decision that authorizes that promotion.

Business Approval does not deploy, host, route traffic, modify domains, create
runtime state, or publish artifacts.

Publish may only act after Business Approval authorizes it.

Business Approval decides whether publishing is allowed.

Publishing executes the approved promotion path.

## Approval Scope

Business Approval evaluates:

- Business Alignment;
- Website Design Brief;
- Website Generation Package;
- Compliance Report;
- Business Risks;
- Generation Readiness;
- Limitations;
- Recommendations.

Business Approval never evaluates:

- HTML;
- React;
- Framework;
- Provider;
- Prompt;
- Coding style.

Business Approval considers implementation only through business-facing
contractual consequences already reported by Generation Contract Compliance.

## What Exactly Is Being Approved?

Business Approval approves the business acceptability of the generated website
as an implementation proposal against the approved contractual expectations.

It approves:

- sufficient fulfillment of the Website Generation Package;
- acceptable expression of the aligned business intent;
- acceptable business risk;
- acceptable limitations;
- readiness to proceed toward publishing, regeneration, or renewed alignment;
- the governed decision outcome and its lineage.

It does not approve:

- provider implementation strategy;
- generated code as canonical source truth;
- prompt quality;
- framework choice;
- provider preference;
- deployment mechanics;
- runtime state.

## Participants

Business Approval may involve:

- business owner;
- brand or marketing owner;
- compliance or legal reviewer when required;
- GNR8 operator;
- account or delivery owner;
- stakeholder accountable for publishing risk.

The participants approve business acceptance, not implementation technology.

## Approval Outcomes

Business Approval has five canonical outcomes.

### APPROVED

Use when contractual expectations have been sufficiently satisfied, business
risk is acceptable, limitations are understood, and publishing may proceed.

### APPROVED_WITH_LIMITATIONS

Use when publishing may proceed with explicitly accepted limitations,
constraints, known risks, or follow-up requirements.

This outcome still authorizes publishing, but it preserves the limitations as
part of the governed approval record.

### REGENERATE

Use when the Website Generation Package remains valid but the generated
website does not sufficiently satisfy contractual expectations or business
acceptance requirements.

Regeneration starts from the current approved Website Generation Package
unless Business Approval explicitly requires upstream revision.

### RETURN_TO_ALIGNMENT

Use when the approval decision reveals that upstream business understanding,
Business Alignment, Website Design Brief, or Website Generation Package intent
needs correction before another generation attempt.

This outcome sends the work back to business alignment rather than treating
the issue as a provider execution problem.

### BLOCKED

Use when publishing, regeneration, or return to alignment cannot proceed
because required evidence, authority, risk acceptance, legal review, business
decisioning, or governance conditions are missing.

Blocked work must not proceed to publishing.

## Decision Responsibilities

The responsibility chain is:

```text
Compliance
-> Business Approval
-> Publishing
```

### Compliance

Compliance evaluates whether the generated website satisfies the Website
Generation Package and communicates fulfillment, deviations, risks,
limitations, readiness, and recommendations through the Generation Contract
Compliance Report.

Compliance does not approve publishing.

### Business Approval

Business Approval decides whether the business accepts the compliance result
and whether the generated website may proceed toward publishing, regeneration,
alignment, or blocking.

Business Approval governs business acceptance, not implementation.

### Publishing

Publishing promotes only generated output that has received Business Approval.

Publishing does not decide business acceptance.

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
-> Business Approval
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

### Business Approval

Business Approval decides whether contractual expectations have been
sufficiently satisfied for publishing.

### Publish

Publish promotes only Business Approved output.

## Architectural Rules

Business Approval never contains:

- generated HTML;
- provider payloads;
- prompts;
- deployment artifacts;
- runtime state;
- implementation artifacts.

Business Approval governs business decisions only.

Business Approval must remain:

- deterministic;
- governed;
- auditable;
- lineage-aware;
- downstream of the Generation Contract Compliance Report;
- upstream of Publish;
- independent of provider-specific implementation details.

## Manifesto Alignment

GNR8 publishes only after governed business approval.

Business approval accepts contractual fulfillment, not implementation
technology.

Business Approval preserves the separation between business truth,
contractual evaluation, and publishing execution.

## Separation Summary

The governing architecture is:

```text
Business Truth
-> Business Alignment
-> Website Intent
-> Generation Contract
-> Implementation Proposal
-> Compliance
-> Business Approval
-> Publishing
```

Business Truth is represented by the Digital Business Twin.

Business Alignment confirms or improves that truth.

Website Intent is expressed by the Website Design Brief.

Generation Contract is expressed by the Website Generation Package.

Implementation Proposal is produced by External AI.

Compliance is Generation Contract Compliance and its report.

Business Approval is the final business governance checkpoint.

Publishing is the governed promotion of Business Approved output.

## Recommended Next Phase

WGP-4 Publishing Boundary Specification, documentation and architecture only.
