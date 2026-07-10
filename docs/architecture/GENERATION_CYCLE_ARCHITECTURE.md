# Generation Cycle Architecture

## Phase And Boundary

Phase MVP-2.0-ARCH introduces the canonical Generation Cycle Architecture.

This document is architecture and documentation only. It adds no runtime
behavior, persistence behavior, schema, API, UI, worker, provider execution,
AI execution, regeneration, publishing, deployment, or canonical business
artifact mutation.

Generation Cycles become the primary organizational model for iterative
website evolution while preserving the existing canonical artifact lineage.

## Canonical Definitions

Generation Cycle:

> A deterministic governance model describing the complete evolutionary
> history of a website across multiple generation iterations.

Iteration:

> A governed generation attempt belonging to exactly one Generation Cycle.

## Core Philosophy

Artifacts preserve truth.

Lineage preserves causality.

Generation Cycles preserve evolution.

Iterations preserve improvement.

Business intent remains canonical.

Providers remain replaceable.

Generation Cycle is not a new source of business truth. It does not replace
Business Discovery, Digital Business Twin, Business Understanding Report,
Business Alignment, Website Design Brief, Website Generation Package,
Observed Website Model, Generation Contract Compliance, or Generation Contract
Compliance Report. It organizes how those governed artifacts participate in
one website's iterative evolution.

## Canonical Relationship

```text
Reality
        ↓
Business Understanding
        ↓
Website Generation Package
        ↓
Generation Cycle
        ↓
Iteration 1
        ↓
Iteration 2
        ↓
Iteration 3
        ↓
...
        ↓
Approved Website
```

The Website Generation Package remains the canonical generation contract.
Generation Cycle starts from that governed contract and records the ordered
evolution of generated proposals, observations, compliance outcomes, reports,
improvement plans, and later payloads.

## Generation Cycle Responsibilities

Generation Cycle owns:

- iteration ordering
- evolution history
- regeneration history
- improvement history
- compliance history
- proposal history

Generation Cycle does not own:

- business truth
- business alignment
- Website Generation Package
- provider execution
- publishing

Generation Cycle is therefore an organizational governance model, not an
execution engine. It can describe that a regeneration should be attempted, but
it does not execute providers, call AI, import proposals, validate compliance,
approve business outcomes, or publish.

## Iteration Model

Each iteration conceptually contains this canonical loop:

```text
Provider Payload
        ↓
Generated Proposal
        ↓
Observed Website
        ↓
Compliance
        ↓
Compliance Report
        ↓
Improvement Plan
        ↓
Next Provider Payload
```

The first iteration begins from the source Website Generation Package and its
provider payload. Later iterations may be informed by prior compliance,
compliance reports, and improvement plans, but they do not rewrite the
canonical business artifacts that authorized generation.

## Generation Cycle States

`created`

The cycle exists conceptually or administratively, but no iteration has yet
produced a generated proposal.

`active`

At least one iteration is in progress or available for governed evaluation.
The cycle is open and may continue producing iteration history.

`improving`

The latest evaluated result requires improvement, regeneration, or another
governed iteration before Business Approval.

`ready_for_approval`

The latest iteration has sufficient compliance/reporting evidence to proceed
to Business Approval review.

`approved`

The Business Owner or authorized governance decision has accepted the latest
iteration for the website outcome.

`published`

An approved iteration has passed the publishing boundary and is represented as
a published website experience.

`archived`

The cycle is no longer active for evolution. Its history remains available for
audit, lineage, and comparison.

## Iteration States

`planned`

The iteration is intended or prepared, but no generated proposal has been
produced for that iteration.

`generated`

A provider payload has resulted in a generated proposal. The proposal remains
implementation material, not business truth.

`observed`

The generated proposal has been observed into an Observed Website model or an
equivalent future observation artifact.

`evaluated`

The observed website has been compared against the Website Generation Package
through compliance and reporting.

`improved`

The iteration has produced or informed an Improvement Plan or next provider
payload for a later iteration.

`superseded`

A later iteration has replaced this iteration as the current candidate for
approval or publishing. The superseded iteration remains part of the cycle
history.

`approved`

This iteration is the accepted website outcome for Business Approval and may
become the source for publishing authorization.

## Relationship Model

Business Artifact Lineage and Generation Cycle are orthogonal.

Artifacts answer:

```text
What?
```

Generation Cycle answers:

```text
When?
```

Iteration answers:

```text
Which evolution step?
```

Business Artifact Lineage preserves the causal chain between governed
artifacts: what evidence authorized what understanding, what understanding
authorized what design, what design authorized what generation package, and
what observed proposal authorized what compliance report.

Generation Cycle preserves the ordered evolutionary history of the website:
which attempts happened, in what order, what each attempt produced, what was
observed, how compliance changed, and which iteration became ready for
approval.

The same canonical artifact lineage can participate in a Generation Cycle
without being owned by the cycle. The cycle references and orders artifacts;
it does not redefine their meaning.

## Current ODV Generation Cycle Snapshot

MVP-2.0-J provides the first concrete ODV Iteration 2 import that can be
described by the Generation Cycle model without changing canonical artifact
contracts.

ODV Generation Cycle:

```text
odv-generation-cycle-002
```

Iteration 1:

- generated proposal artifact:
  `generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3`;
- source bundle: `ODV_GENERATED_PROPOSAL_001/`;
- source Provider Payload:
  `provider_generation_payload_0738b677c762f830c235dae425a8ec1c`;
- downstream observed model:
  `observed_website_model_35499a9cb91a15740910532d451a739a`;
- downstream compliance:
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`;
- downstream report:
  `generation_contract_compliance_report_9b54b0b6ecab46ee187bc0f4918871de`;
- outcome: report status `blocked`, recommendation `regenerate`, readiness
  `requires_regeneration`.

Iteration 2:

- generated proposal artifact:
  `generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e`;
- source bundle: `ODV_GENERATED_PROPOSAL_002/`;
- source Provider Payload v2:
  `provider_generation_payload_914e79c7dba05881c1ff7548a0e8f8b7`;
- observed model:
  `observed_website_model_0d5e829f546745b1433557978c875626`;
- downstream compliance:
  `generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b`;
- source Generation Improvement Plan:
  `generation_improvement_plan_5401cbae3566e77aa4014e35ae73e694`;
- source WGP:
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`;
- status: latest quarantined Generated Website Proposal, latest `observable`
  Observed Website Model, and latest `non_compliant` Generation Contract
  Compliance artifact.

Generation Evolution Analysis:

- artifact:
  `generation_evolution_analysis_89ab4005fcb11ef4d00682f7a86c1253`;
- compared Iteration 1 compliance
  `generation_contract_compliance_5128ad2d31c97a40e9a47f295fa18fa7`
  against Iteration 2 compliance
  `generation_contract_compliance_dfda0565997bd01266ec7464fcdeda0b`;
- both compliance artifacts reference the same Website Generation Package
  `website_generation_package_c2c555025f186178f27c44c7cd272d4d`;
- status / overall assessment:
  `improved` / `meaningful_improvement`;
- recommendation:
  `create_compliance_report_v2`.

Iteration 2 does not retroactively change Iteration 1's canonical artifact
identity. The previous proposal, previous OWM, and previous compliance remain
reloadable by ID. MVP-2.0-M performed the first deterministic comparison
between Iteration 1 and Iteration 2 without recomputing either compliance
result.
Iteration/cycle metadata is preserved in source metadata, diagnostics,
lineage, and operator attestation because the current runtime contract does
not yet include canonical cycle fields.

## Future Runtime Mapping

This section is documentation only. These fields are future concepts and are
not implemented by MVP-2.0-ARCH.

Future runtime mapping may introduce fields such as:

- `generationCycleId`
- `iterationNumber`
- `parentIteration`
- `previousPayload`
- `previousProposal`
- `previousCompliance`

These fields would only map the organizational relationship between iteration
attempts. They must not make Generation Cycle the source of business truth,
modify canonical artifact lineage, replace Website Generation Package
lineage, or authorize provider execution or publishing by themselves.

## Diagram A: Artifact Lineage

```text
Reality
  ↓
Evidence
  ↓
Business Discovery
  ↓
Digital Business Twin
  ↓
Business Understanding Report
  ↓
Business Alignment
  ↓
Website Design Brief
  ↓
Website Generation Package
  ↓
Provider Payload
  ↓
Generated Website Proposal
  ↓
Observed Website Model
  ↓
Generation Contract Compliance
  ↓
Generation Contract Compliance Report
  ↓
Business Approval
  ↓
Published Experience
```

Artifact lineage preserves truth and causality.

## Diagram B: Generation Cycle

```text
Generation Cycle
  ├─ Iteration 1
  │   ├─ Proposal history
  │   ├─ Observation history
  │   ├─ Compliance history
  │   └─ Improvement history
  ├─ Iteration 2
  │   ├─ Proposal history
  │   ├─ Observation history
  │   ├─ Compliance history
  │   └─ Improvement history
  └─ Iteration N
      ├─ Proposal history
      ├─ Observation history
      ├─ Compliance history
      └─ Approval readiness
```

Generation Cycle preserves evolution.

## Diagram C: Iteration Loop

```text
Provider Payload
  ↓
Generated Proposal
  ↓
Observed Website
  ↓
Compliance
  ↓
Compliance Report
  ↓
Improvement Plan
  ↓
Next Provider Payload
```

Iteration preserves improvement.

## Diagram D: Relationship Between Both Models

```text
Business Artifact Lineage                         Generation Cycle
-------------------------                         ----------------
Reality                                           Cycle
  ↓                                                 ↓
Business Understanding                            Iteration 1
  ↓                                                 ├─ Provider Payload
Website Generation Package                         ├─ Generated Proposal
  ↓                                                 ├─ Observed Website
Provider Payload 1  -----------------------------> ├─ Compliance
Generated Proposal 1 ----------------------------> ├─ Compliance Report
Observed Website 1 ------------------------------> └─ Improvement Plan
Compliance 1     --------------------------------
Compliance Report 1 ----------------------------
Improvement Plan 1 ----------------------------->
                                                    ↓
Provider Payload 2  -----------------------------> Iteration 2
Generated Proposal 2 ----------------------------> ├─ Provider Payload
Observed Website 2 ------------------------------> ├─ Generated Proposal
Compliance 2     --------------------------------> ├─ Observed Website
Compliance Report 2 ----------------------------> ├─ Compliance
                                                    └─ Compliance Report
```

The artifact lineage remains the canonical source of truth and causality. The
Generation Cycle groups lineage events into ordered website-evolution
iterations.

## Boundary Rules

- Generation Cycle does not replace artifact lineage.
- Generation Cycle does not create business truth.
- Generation Cycle does not modify Business Discovery, Digital Business Twin,
  Business Understanding Report, Business Alignment, Website Design Brief, or
  Website Generation Package.
- Generation Cycle does not execute providers or AI.
- Generation Cycle does not import Generated Website Proposals by itself.
- Generation Cycle does not perform compliance by itself.
- Generation Cycle does not approve, publish, deploy, mutate DNS, or mutate
  production.
- Generation Cycle is compatible with provider replacement because providers
  remain serialization and execution boundaries, not canonical meaning.

## MVP-2.0-ARCH Result

At the end of MVP-2.0-ARCH, GNR8 possesses a canonical Generation Cycle
Architecture that organizes multiple generations into one governed
evolutionary history while remaining completely compatible with the existing
artifact lineage.
