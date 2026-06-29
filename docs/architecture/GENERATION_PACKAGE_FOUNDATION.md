# Generation Package Foundation

## Phase And Boundary

Phase GP-0 defines the Generation Package boundary as documentation and
architecture only.

This phase answers one question:

> What is the canonical website description that GNR8 hands to any present or
> future AI system without making a prompt, provider, or implementation
> artifact canonical?

No implementation is added in this phase. It does not modify Evidence Capture,
Candidate Discovery, Candidate Context, Candidate Review, Reconstruction
Package, StructurePlan, Publishing, AI integrations, Workers, Schema, API, or
UI.

## Purpose

A `GenerationPackage` is the canonical, deterministic description of a website
that is sufficiently complete for an external AI system to generate or
reconstruct that website under GNR8 governance.

The package is:

- deterministic;
- immutable;
- provider-neutral;
- versioned;
- lineage-aware;
- review-backed.

The package is not:

- a prompt;
- React;
- HTML;
- an implementation;
- a publishing artifact.

The core rule is:

```text
Generation Package != Prompt

Prompt = provider-specific serialization of a Generation Package
```

The Generation Package owns meaning. Prompts own transport formatting for a
specific provider interaction.

## Canonical Chain

The canonical AI orchestration chain is:

```text
Import
  -> Evidence
  -> Discovery
  -> Context
  -> Review
  -> Reconstruction Package
  -> StructurePlan
  -> Generation Package
  -> Provider Adapter
  -> External AI
  -> Validation
  -> Human Approval
  -> Publish
```

Generation Packages are the primary output of GNR8's understanding and
orchestration pipeline. They are the interface between the governed Digital
Twin and external AI execution. Provider prompts, task briefs, or API payloads
are derived representations only.

## Canonical Inputs

The authorizing input to a Generation Package is the latest persisted
`StructurePlan` artifact.

The future contract should bind to one exact latest persisted StructurePlan
artifact before derivation begins. It must not follow a floating latest pointer
again during package construction, silently merge multiple StructurePlan heads,
or accept a historical StructurePlan while describing it as current.

Supporting lineage may be carried from the source chain:

| Lineage | Treatment | Authority |
| --- | --- | --- |
| StructurePlan artifact | Required exact authorizing input. | Defines the organized route, navigation, section, and assignment envelope. |
| ReconstructionPackage artifact | Supporting lineage from the StructurePlan. | Explains approved candidate eligibility; cannot add unplanned candidates. |
| CandidateReviewPackage artifact | Supporting lineage. | Explains human review backing; cannot change package meaning. |
| CandidateDiscoveryResult artifact | Supporting lineage. | Explains source candidate identity; cannot add new discovery output. |
| CandidateContext refs | Supporting lineage when present. | Explains visual/contextual review backing; cannot create new context. |
| Evidence refs | Supporting lineage. | Grounds source observations; cannot bypass StructurePlan. |
| `siteVersionId` | Required lineage. | Binds the package to the imported site version. |
| `dryRunId` | Supporting lineage when present. | Binds the package to the bounded dry-run chain that produced upstream evidence. |

Only material already authorized by the exact StructurePlan and its carried
lineage may participate. The Generation Package must not query upstream systems
to expand eligibility while it is being derived.

## Canonical Sections

A Generation Package should be evaluated as a versioned website description,
not as a provider prompt. At minimum, the future contract should evaluate these
sections.

| Section | Meaning |
| --- | --- |
| Site Identity | Canonical site name, source URL/domain refs, site version, and stable package identity. |
| Business Purpose | Source-grounded description of what the site exists to communicate or enable. |
| Audience | Intended users or visitor groups, with confidence and source refs. |
| Brand | Brand identity observations that are grounded in evidence or review. |
| Design System | Source-grounded design vocabulary; not generated CSS or component code. |
| Logo | Logo asset refs, observed usage, source locations, and limitations. |
| Colors | Observed palette refs and semantic usage, not provider-specific token syntax. |
| Typography | Observed font families, scale notes, and source refs, not implementation CSS. |
| Assets | Referenced images, media, icons, documents, and asset provenance. |
| Navigation | Planned navigation intent from StructurePlan and lineage refs. |
| Routes | Planned route descriptions and route-level constraints from StructurePlan. |
| Sections | Planned section descriptions, ordering, source refs, and limitations. |
| Content References | Stable references to observed or approved content; not rewritten copy. |
| Evidence References | Traceability to evidence, context, discovery, review, package, and StructurePlan refs. |
| Constraints | Required fidelity, business, technical, legal, brand, and governance constraints. |
| Accessibility | Source-grounded accessibility requirements and known gaps. |
| SEO | Source-grounded metadata, URL, title, heading, and search constraints. |
| Runtime Target | Intended runtime characteristics for generated output, described provider-neutrally. |
| Hosting Target | Desired hosting/deployment environment constraints, without publishing execution. |
| Publishing Constraints | Conditions that must be satisfied before promotion; not a publish artifact. |
| Acceptance Criteria | Deterministic requirements validation must check against generated output. |
| Limitations | Known missing, ambiguous, stale, unsupported, or low-confidence areas. |
| Diagnostics | Counts, lineage checks, stale/latest status, unsupported fields, and derivation notes. |
| Version Metadata | Package ID, package contract version, created timestamp, source contract versions. |
| Lineage | Exact StructurePlan and upstream artifact refs required for audit and replay. |

The package may include unknown or limitation-bearing sections. Missing
information should be represented as limitations and diagnostics, not filled by
provider-specific prompt prose or AI inference.

## Explicit Exclusions

A Generation Package must never contain:

- OpenAI prompts;
- Claude prompts;
- Gemini prompts;
- Codex tasks;
- v0 prompts;
- Stitch prompts;
- provider-specific formatting;
- provider-specific message roles;
- provider-specific API payloads;
- provider-specific temperature, model, tool, or routing configuration;
- generated React;
- generated components;
- generated blocks;
- generated HTML;
- generated CSS;
- generated rewritten copy;
- AI responses;
- publishing artifacts;
- deployment artifacts;
- worker jobs;
- runtime execution state;
- database mutations;
- approval decisions created by the package itself.

Validation in a future contract phase should reject provider-specific prompt or
payload fields recursively instead of ignoring or sanitizing them. Field names
such as `openAiPrompt`, `claudePrompt`, `geminiPrompt`, `codexTask`,
`v0Prompt`, `stitchPrompt`, `messages`, `model`, `temperature`,
`providerPayload`, `reactOutput`, `htmlOutput`, `generatedBlocks`,
`generatedContent`, `publishingArtifact`, and `deploymentArtifact` should be
treated as forbidden unless a future contract explicitly reserves a
provider-neutral diagnostic field with different semantics.

## Provider Independence

Provider independence means the Generation Package is meaningful without
knowing which AI system will execute it.

The package may describe:

- what website must be reconstructed or generated;
- what evidence supports that description;
- what lineage authorizes it;
- what constraints must be respected;
- what generated result must be validated;
- what acceptance criteria must pass before human approval.

The package may not describe:

- how OpenAI, Claude, Gemini, Codex, v0, Stitch, or any future provider should
  format its messages;
- which provider-specific prompt style should be used;
- which model-specific syntax should be emitted;
- how to pack the task into a provider API request.

This preserves model agnosticism. A provider can be added, removed, upgraded,
or replaced without changing the canonical meaning of the website description.

## Provider Adapters

Provider adapters are future serialization boundaries:

```text
Generation Package
  -> OpenAI Adapter -> OpenAI
  -> Claude Adapter -> Claude
  -> Gemini Adapter -> Gemini
  -> Codex Adapter -> Codex
  -> Stitch Adapter -> Stitch
  -> Future Adapter -> Future provider
```

Adapters own serialization. The Generation Package owns meaning.

A future adapter may transform a package into a provider-specific prompt,
message list, structured payload, task file, or API call shape. That adapter is
responsible for provider-specific wording, formatting, context packing,
message roles, token budgeting, model capability mapping, and request
constraints.

Adapters must not mutate the Generation Package, weaken its lineage, invent
missing package sections, bypass limitations, or make provider output
canonical. Adapter output is disposable and reproducible from the canonical
package plus adapter version.

## Digital Twin Relationship

The preferred flow is:

```text
Digital Twin
  -> Generation Package
  -> External AI
```

This is preferred over:

```text
HTML
  -> Prompt
  -> AI
```

HTML is an observed or generated surface. It is not the full operational truth
of the website. A prompt is a provider-specific serialization. It is not a
governed canonical artifact.

The Digital Twin carries source-grounded understanding: evidence, structure,
review decisions, lineage, constraints, diagnostics, validation expectations,
and publish readiness. The Generation Package is the provider-neutral slice of
that Twin that can be handed to external AI for generation or reconstruction.

This keeps GNR8's source of truth inside the governed Twin and package chain,
not inside copied HTML, prose prompts, generated code, or one provider's task
format.

## Future Architecture

Generation Package Foundation prepares later phases without implementing them:

```text
Generation Package
  -> Generation Validation Package
  -> Generated Website Validation
  -> Approval
  -> Publishing
```

The Generation Validation Package should be a future deterministic validation
contract derived from the Generation Package and generated output. Generated
Website Validation should compare actual provider output against package
lineage, evidence refs, constraints, acceptance criteria, limitations, and
forbidden-field rules. Approval should remain a human governance boundary.
Publishing should remain a governed promotion of approved output.

GP-0 does not create prompts, adapters, AI calls, validation packages,
generated websites, approval flows, publishing artifacts, runtime behavior, or
implementation code.

## Recommended Next Phase

Proceed next with **GP-1 Generation Package Contract**.

Limit GP-1 to formal provider-neutral contract shapes, validation rules,
forbidden-field checks, status vocabulary, identity/versioning, lineage
requirements, and focused tests if authorized. Do not implement provider
adapters, prompts, AI integration, generated website validation, approval, or
publishing in GP-1 unless a later phase explicitly authorizes that boundary.
