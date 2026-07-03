# Provider Adapter Boundary Design

## Phase And Boundary

Phase MVP-1G defines the first provider adapter boundary between the Website
Generation Package and one provider-specific generation payload.

This phase is documentation and contract design only. It adds no
implementation, TypeScript, schema, persistence, API, UI, workers, provider
calls, prompts sent, AI integration, generation, compliance execution,
Business Approval, publishing behavior, runtime state, or deployment behavior.

The Provider Adapter responsibility is:

```text
Website Generation Package
-> Provider Payload
```

The adapter serializes. It never redefines business intent.

## Canonical Definition

"A deterministic serialization boundary that converts a
WebsiteGenerationPackageArtifact into one provider-specific
ProviderGenerationPayload while preserving package meaning, constraints,
lineage, limitations, confidence, and diagnostics."

Provider adapters are not business reasoning layers.

Provider adapters are not generation layers.

Provider adapters are not compliance layers.

Provider adapters are formatting and transport boundaries.

## Source And Output

### Provider-Neutral Source

The provider-neutral source is:

```text
WebsiteGenerationPackageArtifact
```

The Website Generation Package is the canonical generation contract. It owns
the meaning of the intended website and contains the business context,
generation objectives, audience requirements, required messaging, navigation
contract, page contracts, section contracts, content requirements,
constraints, validation contract, confidence, limitations, lineage, and
diagnostics.

The provider adapter must treat the Website Generation Package as immutable
input.

### Provider-Specific Output

The provider-specific output is:

```text
ProviderGenerationPayload
```

The ProviderGenerationPayload is a provider-shaped serialization of the
Website Generation Package. It may include provider-specific structure,
section ordering, task framing, request metadata, envelope fields, formatting
rules, and transport constraints.

The ProviderGenerationPayload does not become the canonical generation
contract. It is downstream of the Website Generation Package and disposable
when provider strategy changes.

## First MVP Provider Recommendation

Recommended first provider path:

```text
Codex task payload
```

This is the shortest safe path to the first generated website because it can
express the Website Generation Package as an operator-auditable task payload
without first building OpenAI API integration, Claude integration, provider
credential routing, model execution plumbing, or automated generation
storage.

The first provider adapter should target a Codex task payload because:

- Codex can generate a concrete website implementation from a structured task;
- the payload can be inspected before any generation is attempted;
- the payload can preserve the full WGP lineage and constraints in human and
  AI-readable form;
- no provider API request shape needs to become canonical;
- provider execution can remain a later authorized phase;
- generated output can remain a future artifact after an explicit generation
  boundary.

OpenAI API payload, Claude payload, and manual export payload are deferred.
They may become future adapters, but MVP-1G recommends exactly one first path:
Codex task payload.

## Adapter Identity

Every future provider adapter should have an explicit identity that can be
recorded in diagnostics and lineage without implying execution.

Conceptual adapter identity fields:

- adapter ID;
- adapter name;
- adapter version;
- adapter contract version;
- provider type;
- provider payload kind;
- source package kind;
- source package ID;
- source package version or contract version;
- creation timestamp;
- serialization mode;
- diagnostics.

For the first MVP path:

```text
provider type: codex_task
provider payload kind: codex_task_payload
adapter contract version: MVP-1G
```

## Provider Type

Provider type identifies the provider-specific serialization target.

Allowed conceptual first provider type:

```text
codex_task
```

Deferred provider types:

- `openai_api`
- `claude`
- `manual_export`
- any future provider-specific execution target

Only `codex_task` is recommended for the first MVP provider path.

## Payload Model

ProviderGenerationPayload should conceptually contain:

- payload identity;
- adapter identity;
- provider type;
- provider payload kind;
- source Website Generation Package reference;
- source Website Generation Package contract version;
- source Website Generation Package status;
- serialized package content;
- provider-specific task envelope;
- preserved constraints;
- preserved validation expectations;
- preserved limitations;
- preserved confidence;
- preserved lineage;
- diagnostics;
- safety classification.

For the Codex task payload, the provider-specific task envelope may contain:

- task title;
- task objective;
- source package summary;
- structured package sections;
- required constraints;
- forbidden mutations;
- acceptance checklist derived from the WGP validation contract;
- lineage block;
- diagnostics block;
- stop boundary for the generation task.

The envelope may organize content for Codex readability, but it must not add,
remove, reinterpret, or prioritize business meaning beyond the source Website
Generation Package.

## Serialization Rules

Provider adapter serialization must:

- preserve all WGP business objectives;
- preserve all audience requirements, including missing knowledge;
- preserve required messaging and proof expectations;
- preserve navigation, page, and section contracts;
- preserve content requirements;
- preserve constraints;
- preserve validation expectations;
- preserve confidence and limitations;
- preserve lineage and upstream artifact references;
- preserve diagnostics;
- keep provider-specific formatting separate from canonical meaning;
- make any lossy serialization explicit as a diagnostic;
- fail closed when required WGP meaning cannot be represented safely.

Provider-specific formatting may change:

- section order;
- grouping;
- field labels;
- request envelope shape;
- task framing;
- checklist presentation;
- model-facing formatting;
- transport metadata.

Provider-specific formatting must not change what the WGP requires.

## Forbidden Mutation Rules

A provider adapter must not:

- reinterpret business intent;
- add new business facts;
- infer missing audience, offering, brand, trust, compliance, or business
  knowledge;
- remove WGP constraints;
- weaken WGP constraints;
- hide WGP limitations;
- hide low confidence;
- convert limitations into facts;
- introduce prompt-only business logic;
- introduce hidden provider-only requirements;
- remove validation expectations;
- replace lineage with provider metadata;
- transform the WGP into implementation instructions beyond what the provider
  must know to generate the requested website;
- choose a framework, library, hosting target, deployment method, or
  publishing behavior unless the WGP explicitly requires it;
- persist provider output in this phase;
- persist generated output in this phase;
- execute generation in this phase.

The adapter may serialize for provider comprehension. It may not improve,
complete, or correct the business contract.

## Lineage Requirements

Every ProviderGenerationPayload must preserve lineage back to the source
WebsiteGenerationPackageArtifact.

Required conceptual lineage:

- provider payload ID;
- source Website Generation Package ID;
- source Website Generation Package artifact kind;
- source Website Generation Package contract version;
- source Website Design Brief reference;
- upstream Business Alignment reference;
- upstream Digital Business Twin reference;
- upstream Business Discovery and evidence references where present in WGP
  lineage;
- adapter ID and adapter version;
- provider type;
- serialization timestamp;
- diagnostics describing preservation, omissions, or fail-closed conditions.

Lineage must make it clear that the ProviderGenerationPayload is derived from
the WGP and does not authorize new meaning.

## Diagnostics

Provider adapter diagnostics should record:

- adapter contract version;
- source package status;
- provider type;
- payload kind;
- serialization completeness;
- preserved section counts;
- preserved validation expectation counts;
- preserved constraint counts;
- preserved limitation counts;
- missing or unsupported provider representation;
- lossy formatting warnings;
- fail-closed reasons;
- forbidden mutation scan result;
- no-execution confirmation for design and serialization-only phases.

Diagnostics must be human-readable and suitable for future compliance and
lineage review.

## Safety Rules

Provider payload may contain provider-specific formatting, but must preserve
WGP meaning and lineage.

The safety rules are:

- WGP meaning is canonical.
- Provider payload is a derived serialization.
- Provider payload does not become a generated website.
- Provider payload does not become a compliance result.
- Provider payload does not become a Business Approval artifact.
- Provider payload does not authorize publishing.
- Provider payload must carry limitations and low-confidence signals forward.
- Provider payload must not hide uncertainty.
- Provider payload must fail closed when it cannot safely preserve WGP meaning.
- Provider output persistence is out of scope for MVP-1G.
- Generated output remains a future artifact.

## Future Adapter Interface Concept

Future implementation may introduce conceptual functions with these
responsibilities:

```text
buildProviderGenerationPayload(...)
```

Builds one ProviderGenerationPayload from one WebsiteGenerationPackageArtifact
and one explicit provider adapter identity. It performs deterministic
serialization only.

```text
validateProviderGenerationPayload(...)
```

Validates adapter identity, provider type, source WGP reference, lineage,
required sections, preserved constraints, preserved validation expectations,
diagnostics, and forbidden mutation rules.

```text
serializeWebsiteGenerationPackageForProvider(...)
```

Converts WGP sections into provider-specific formatting while preserving the
same business meaning, limitations, constraints, confidence, diagnostics, and
lineage.

No TypeScript is introduced in MVP-1G.

## Boundary Confirmation

MVP-1G defines the provider adapter boundary only. It does not create a
runtime adapter, provider payload artifact, provider call, prompt execution,
generated website, compliance evaluator, Compliance Report, Business Approval
artifact, publishing behavior, UI route, API route, worker behavior, schema
migration, or generated output persistence.

Recommended next phase:

- MVP-1H Codex Task Provider Payload Runtime Builder, limited to implementing
  and validating the first `codex_task` ProviderGenerationPayload builder from
  a persisted Website Generation Package. Stop before provider calls, prompts
  sent, external AI execution, generated websites, compliance execution,
  Business Approval, publishing, UI, API, schema, or workers unless explicitly
  authorized.
