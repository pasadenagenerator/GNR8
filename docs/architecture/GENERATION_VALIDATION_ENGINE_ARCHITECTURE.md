# Generation Validation Engine Architecture

## Phase And Boundary

Phase MVP-1K-0 defines the canonical architecture of the Generation
Validation Engine.

This phase is documentation and architecture only. It adds no implementation,
runtime behavior, provider calls, generated website import, compliance
implementation, publishing, UI, API, schema, workers, TypeScript, or generated
website execution.

The Generation Validation Engine determines whether a Generated Website
Proposal fulfills the Website Generation Package by observing the generated
website reality and comparing that reality against the canonical contract.

It never evaluates beauty.

It never evaluates coding style.

It evaluates contractual fulfillment.

## Core Principle

```text
Generation produces a proposal.
Validation observes reality.
Compliance compares reality against the contract.
Business Approval decides.
```

The generated website is an implementation proposal. It is not business truth,
not approval, not publishing state, and not a revision of upstream artifacts.

The Validation Engine exists to make the proposal observable and comparable.
It does not make the proposal trusted by itself.

MVP-1K-1 adds the first runtime import/storage foundation for that proposal
boundary. A manually generated Codex output bundle can now be imported as a
quarantined `GeneratedWebsiteProposalArtifact` under artifact kind
`generated_website_proposal`. This import does not observe the website, does
not run compliance, does not approve, does not publish, and does not execute
generated output.

MVP-1K-2 defines the observation boundary between quarantined proposal import
and future contract comparison. Observation records proposal reality as an
Observed Website Model. Observation does not compare, judge compliance,
approve, publish, mutate upstream artifacts, trust providers, or execute
generated output.

## Canonical Pipeline

```text
Website Generation Package
-> Generated Website Proposal
-> Website Observation
-> Observed Website Model
-> Contract Comparison
-> Compliance Evidence
-> Generation Contract Compliance Report
-> Business Approval
-> Publish
```

This pipeline separates proposal creation, observed reality, contractual
comparison, evidence, report communication, human approval, and publish.

## Canonical Responsibility

The Generation Validation Engine owns:

- observation;
- comparison;
- evidence;
- contractual evaluation;
- compliance evidence;
- compliance report input.

The Generation Validation Engine does not own:

- generation;
- business truth;
- business alignment;
- provider execution;
- publishing.

Generation remains responsible for producing a proposal from a provider
payload. Business truth remains upstream in the governed artifact chain.
Publishing remains downstream and requires Business Approval.

## Responsibility Boundaries

### Observation

Observation records what exists in the generated website proposal. It may
record pages, sections, navigation, visible messages, assets, constraints,
technical signals, evidence, limitations, and lineage.

Observation does not decide whether the website is good. Observation does not
decide whether the business should approve the website. Observation does not
fill missing business facts.

### Comparison

Comparison evaluates the observed website against the Website Generation
Package. The Website Generation Package is the only canonical contract for
this comparison.

Comparison does not compare against prompts, provider payloads, chat history,
generated HTML history, provider notes, operator preference, or implementation
style.

### Evidence

Evidence records the observable basis for each contractual evaluation.
Compliance decisions must be traceable to observations.

If evidence is missing, ambiguous, contradictory, or incomplete, the engine
must preserve that limitation instead of guessing.

### Contractual Evaluation

Contractual evaluation determines whether observed reality satisfies package
requirements, partially satisfies them, fails them, or cannot be determined
from available observations.

Contractual evaluation is not subjective design review.

### Compliance Report Input

The engine prepares evidence-backed comparison results for the Generation
Contract Compliance Report. The report communicates the result to business
reviewers; Business Approval remains a separate decision.

## Future Runtime Concepts

These concepts define future runtime architecture only. They are not schemas,
types, or implementation instructions in this phase.

### ObservedWebsite

ObservedWebsite is the observed representation of one Generated Website
Proposal. It records the generated proposal under review, the observation
scope, observed pages, navigation, messages, assets, constraints, technical
signals, evidence, limitations, confidence, and lineage.

ObservedWebsite is not the generated website source, not provider output, not
published state, and not business truth.

### ObservedPage

ObservedPage records an observable page or route in the generated proposal.
It may include route identity, visible title, visible headings, page purpose,
content areas, calls to action, SEO-relevant observations, accessibility
observations, and evidence references.

ObservedPage only records what can be observed. It does not infer intended
page purpose when evidence is absent.

### ObservedSection

ObservedSection records an observable section within an observed page. It may
include section position, visible heading, visible copy, role, calls to
action, media, forms, trust indicators, and evidence references.

ObservedSection does not convert visual preference into compliance.

### ObservedNavigation

ObservedNavigation records observable navigation structure, labels,
destinations, ordering, missing destinations, duplicate destinations,
external links, and evidence references.

ObservedNavigation is contractual evidence when the Website Generation Package
requires pages, journeys, or navigation destinations.

### ObservedMessage

ObservedMessage records visible business messages, offer statements, proof
points, trust claims, calls to action, audience cues, and other text or media
signals that can be directly observed.

ObservedMessage must not invent missing positioning, missing offers, or
missing facts.

### ObservedAsset

ObservedAsset records assets referenced by or available in the proposal,
including file identity, path or URL, media type, observed usage location,
load availability when observable, missing asset signals, and evidence
references.

ObservedAsset does not decide whether an asset is brand-correct or compliant.

### ObservedConstraint

ObservedConstraint records whether a package constraint appears preserved,
violated, partially preserved, or unobservable in the generated proposal.

Examples include forbidden claims, required exclusions, required channels,
accessibility expectations, SEO expectations, asset use, privacy constraints,
and no-production constraints.

ObservedConstraint records the observable signal only. Future compliance owns
the pass, partial, fail, unknown, or not-applicable result.

### ObservedTechnicalSignal

ObservedTechnicalSignal records technical facts that can be observed without
judgment, such as route availability, render success or failure, static HTML
availability, asset load state, missing files, broken links, metadata
presence, form presence, script dependence, viewport issues, and preview
diagnostics.

ObservedTechnicalSignal is diagnostic evidence. It is not a quality score.

### ObservedEvidence

ObservedEvidence records the observable support for an observation or
future comparison result. Evidence may reference visible text, route
presence, navigation labels, section presence, asset presence, missing
elements, accessibility observations, SEO observations, screenshots, rendered
DOM facts, metadata, or operator-attested input facts.

ObservedEvidence must be specific enough for a reviewer to understand why a
fact was observed and why a future compliance result could cite it.

### ObservedLimitation

ObservedLimitation records what could not be observed, what was ambiguous,
what was out of scope, what was blocked, and what reduces comparison
confidence.

Missing evidence is a limitation, not an invitation to infer.

### ObservedWebsiteLineage

ObservedWebsiteLineage connects the observed website model to the Generated
Website Proposal, source ProviderGenerationPayload, source Website Generation
Package, source Website Design Brief, upstream Business Alignment, Digital
Business Twin, site version, operator attestation, observation timestamp, and
validation engine version.

Lineage proves which proposal and which contract were compared.

## Observation Philosophy

The engine observes what exists.

It never guesses intent.

It never infers business truth.

It only records observable reality.

If a generated proposal contains a visible service claim, the engine may
record that claim. If the proposal omits a required proof point, the engine
may record the omission. If the proposal appears visually polished, the engine
does not treat polish as compliance unless it fulfills a specific contractual
requirement.

Observation must remain conservative:

- record present elements as present;
- record absent required elements as missing when the observation scope is
  sufficient;
- record ambiguous signals as ambiguous;
- record unobservable requirements as limitations;
- record contradictions when observed content conflicts with the package;
- preserve evidence references for review.

## Comparison Philosophy

The engine compares:

```text
Observed Website
against
Website Generation Package
```

It never compares against prompts.

It never compares against provider output as a contract.

It never compares against HTML history.

It never compares against operator taste.

It never compares against provider identity.

Only the Website Generation Package is the canonical contract. Provider
payloads and prompts are transport projections. Generated source files are
proposal material. Historical HTML is not the target unless the package made a
specific preservation requirement explicit.

Comparison must identify:

- fulfilled requirements;
- partially fulfilled requirements;
- missing requirements;
- violated constraints;
- unobservable requirements;
- unexpected observable elements that materially affect contractual intent;
- limitations that reduce confidence;
- evidence supporting each result.

## Evidence Model

Compliance decisions must always reference observable evidence.

MVP-1K-2 separates observation evidence from compliance evidence. Observation
evidence records source-specific observed reality. Compliance evidence later
uses that observed reality to evaluate the Website Generation Package.

Examples of valid evidence include:

- missing navigation;
- missing message;
- missing trust signal;
- accessibility observation;
- SEO observation;
- constraint preserved;
- constraint violated;
- visible required call to action;
- visible page or route;
- absent required page or route;
- visible audience cue;
- visible unsupported business claim;
- required asset present;
- required asset missing.

Evidence is not a subjective opinion. Evidence must not say that a design is
"nice", "ugly", "modern", "premium", or "bad" unless the Website Generation
Package contains an explicit observable requirement that can be checked without
subjective preference.

Every compliance result should be explainable as:

```text
Contract expectation
-> Observed reality
-> Evidence reference
-> Result
-> Limitation, when present
```

## Confidence Model

Validation confidence depends on:

- observable evidence;
- comparison coverage;
- ambiguity;
- missing observations.

Validation confidence does not depend on provider identity.

High confidence means the observation scope and evidence are sufficient to
support the comparison result. Medium confidence means the engine has useful
evidence but some ambiguity, incomplete coverage, or limitations remain. Low
confidence means the result is materially constrained by missing observations,
ambiguous evidence, incomplete proposal material, or blocked inspection.

Confidence must not be inflated because the provider is trusted, popular, or
preferred. Confidence must not be reduced because the provider is unfamiliar.

## Contractual Outcomes

The Validation Engine should support the same contract-oriented outcome family
used by Generation Contract Compliance:

- pass when observed evidence satisfies the contractual expectation;
- partial when observed evidence satisfies part of the expectation but leaves
  meaningful gaps;
- fail when the expectation is missing, contradicted, or violated;
- unknown when the available observations cannot determine the result;
- not applicable when the package expectation does not apply to the observed
  scope.

Unknown is not pass. Unknown preserves uncertainty for the Compliance Report
and Business Approval.

## Architectural Rules

Validation never changes:

- Digital Business Twin;
- Business Understanding Report;
- Business Alignment;
- Website Design Brief;
- Website Generation Package;
- Provider Payload.

Validation only creates:

```text
Compliance Evidence
-> Compliance Report
```

The engine must not revise upstream business truth, fix generated output,
rewrite provider payloads, mutate source contracts, publish output, or approve
output.

## Relationship To Compliance

The Generation Validation Engine supplies the observation and comparison basis
for Generation Contract Compliance.

Compliance is the governed evaluation of contractual fulfillment. The
Validation Engine is the architecture that makes that evaluation evidence
backed by observing the generated proposal, modeling observed reality, and
comparing observed reality against the Website Generation Package.

Compliance may consume the engine output to produce the Generation Contract
Compliance Report. Business Approval may consume the report to decide whether
to approve, reject, request regeneration, request package improvement, or
require human review.

MVP-1K-1 import readiness is not compliance. `compliance_ready` on a Generated
Website Proposal only means the proposal may be submitted to a future
compliance boundary when validation readiness permits it. It is not a pass,
not a Compliance Report, not Business Approval, and not publish
authorization.

MVP-1K-2 observation readiness is also not compliance. `not_observable`,
`partially_observable`, `observable`, and `blocked` only describe whether the
proposal can be observed from available sources. They do not describe whether
the proposal satisfies the Website Generation Package.

## Relationship To Business Approval

Business Approval decides. Validation does not.

The Validation Engine may report that required navigation is missing, a trust
signal is absent, an accessibility observation is unresolved, a required
message is present, or a constraint is violated. It may not approve the
proposal for publication.

Business Approval remains the human governance decision after the Compliance
Report.

## Relationship To Publish

Publish remains blocked until Business Approval authorizes it.

Validation does not deploy, publish, mutate DNS, mutate production, create
hosting state, or promote generated output.

## MVP-1K-0 Completion Definition

MVP-1K-0 is complete when the Generation Validation Engine architecture is
defined as a documentation-only boundary with clear responsibility,
observation, comparison, evidence, confidence, lineage, compliance-input, and
non-ownership rules.

After MVP-1K-0, the next safe phase is a bounded runtime foundation only if it
is explicitly authorized. That later phase may define the first concrete
Generated Website Proposal import or observation runtime boundary, but must
still stop before compliance implementation, Business Approval, publishing,
UI, API, schema, workers, provider calls, and generated website import unless
those boundaries are separately opened.

## MVP-1K-1 Import Foundation

MVP-1K-1 is complete. It implements quarantined Generated Website Proposal
import/storage only:

- contract, validator, import builder, and provenance persistence for
  `generated_website_proposal`;
- deterministic manual-output metadata import from source
  ProviderGenerationPayload and source Website Generation Package lineage;
- operator attestation and output bundle metadata requirements;
- recursive forbidden guard for canonical business artifacts, compliance,
  approval, publishing, deployment, DNS mutation, production mutation, runtime
  mutation, auto-publish, trusted provider result, and canonical truth update;
- persistence through existing site-version `importProvenanceSummary` with
  latest reuse, changed append, latest load, and by-ID load.

MVP-1K-1 still adds no observation runtime, compliance evaluator, Compliance
Report, Business Approval, publishing, UI, API, schema, workers, provider
calls, AI execution, automatic generation, deployment, DNS mutation,
production mutation, runtime mutation, or generated output execution.

## MVP-1K-2 Observation Boundary

MVP-1K-2 is complete. It defines observation only:

- `Generated Website Proposal -> Website Observation -> Observed Website
  Model -> Future Contract Comparison`;
- conceptual ObservedWebsite, ObservedPage, ObservedNavigation,
  ObservedSection, ObservedMessage, ObservedAsset, ObservedConstraint,
  ObservedTechnicalSignal, ObservedEvidence, ObservedLimitation, and
  ObservedWebsiteLineage artifacts;
- observation sources including output bundle metadata, file tree, rendered
  preview, static HTML/content, asset inventory, route/page inventory,
  operator notes, and provider notes;
- readiness values `not_observable`, `partially_observable`, `observable`,
  and `blocked`;
- an evidence model that preserves source proposal, source provider payload,
  source WGP, observed routes, sections, navigation, messages, assets, missing
  observations, limitations, and diagnostics.

MVP-1K-2 adds no implementation, observation runtime, compliance evaluator,
Compliance Report, Business Approval, publishing, UI, API, schema, workers,
provider calls, AI execution, automatic generation, deployment, DNS mutation,
production mutation, runtime mutation, or generated output execution.

After MVP-1K-2, the next safe phase is MVP-1K-3 Observed Website Model
Runtime Foundation, limited to a bounded observation model runtime only if
explicitly authorized. It must still stop before Generation Contract
Compliance, Compliance Report, Business Approval, publishing, provider calls,
AI execution, UI, API, schema, workers, deployment, DNS mutation, production
mutation, or runtime mutation outside the approved observation boundary.
