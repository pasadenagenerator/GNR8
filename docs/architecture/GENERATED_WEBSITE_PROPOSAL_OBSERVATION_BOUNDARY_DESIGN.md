# Generated Website Proposal Observation Boundary Design

## Phase And Boundary

Phase MVP-1K-2 defines the observation boundary for quarantined Generated
Website Proposals.

This phase is documentation and architecture only. MVP-1K-3 later implements
the first bounded runtime foundation for the Observed Website Model defined
here.

It adds no implementation, observation runtime, compliance evaluator,
Compliance Report, Business Approval, publishing, provider calls, AI
execution, UI, API, schema, workers, deployment, DNS mutation, production
mutation, or runtime mutation.

Observation records what exists.

Observation does not judge compliance.

Observation does not approve.

Observation does not publish.

## Observation Boundary

Generated Website Proposal observation is the future process that inspects a
quarantined proposal and produces an Observed Website Model.

The observation boundary is downstream of quarantined import/storage and
upstream of future contract comparison.

It answers:

```text
What can GNR8 see in this generated proposal?
```

It does not answer:

```text
Does this generated proposal satisfy the Website Generation Package?
```

Only future Generation Contract Compliance may answer the second question.

## Observation Pipeline

```text
Generated Website Proposal
-> Website Observation
-> Observed Website Model
-> Future Contract Comparison
```

### Generated Website Proposal

Generated Website Proposal is the quarantined implementation proposal imported
from external generation output. It provides source lineage, output bundle
metadata, provider notes, implementation assumptions, known limitations,
operator attestation, safety metadata, validation readiness, limitations, and
diagnostics.

It is not trusted business truth.

### Website Observation

Website Observation is the future inspection process. It may inspect available
proposal material, rendered previews, static content, asset inventories, route
inventories, and notes.

Website Observation must preserve uncertainty. If a route, section, message,
asset, or technical signal cannot be observed, the observation records that
limitation instead of guessing.

### Observed Website Model

Observed Website Model is the artifact family that records observed proposal
reality in a structured, evidence-backed form. MVP-1K-3 implements the first
runtime contract, deterministic builder, validator, and provenance
persistence for this family.

It is not compliance, not approval, not publishing state, and not a canonical
business update.

### Future Contract Comparison

Future Contract Comparison may consume the Observed Website Model and compare
observed reality against the Website Generation Package.

MVP-1K-2 does not define or implement that comparison runtime. It only defines
the observation input that future comparison will need.

## Conceptual Future Artifacts

These artifacts are conceptual only. They are not TypeScript types, database
tables, runtime contracts, API payloads, or schema instructions in MVP-1K-2.

### ObservedWebsite

ObservedWebsite represents one observed quarantined Generated Website
Proposal. It records observation scope, readiness, observed pages,
navigation, sections, messages, assets, constraints, technical signals,
evidence, limitations, diagnostics, and lineage.

ObservedWebsite is not the generated source bundle, not provider output as
truth, not compliance, and not approval.

### ObservedPage

ObservedPage records an observed route or page. It may include route identity,
render availability, title, headings, page-level messages, visible calls to
action, page assets, page limitations, and evidence references.

ObservedPage records only observable facts. It does not infer intended page
purpose when evidence is absent.

### ObservedNavigation

ObservedNavigation records observed navigation structure: labels,
destinations, ordering, repeated links, missing or broken destinations when
observable, external links, and evidence references.

ObservedNavigation does not decide whether navigation satisfies the Website
Generation Package.

### ObservedSection

ObservedSection records an observed section within an observed page. It may
include section order, visible heading, visible copy, media, calls to action,
forms, trust indicators, layout-level observations, missing observations, and
evidence references.

ObservedSection does not translate visual preference into compliance.

### ObservedMessage

ObservedMessage records visible message content or media-supported claims. It
may include offer statements, audience cues, proof points, trust claims,
calls to action, pricing statements, process statements, guarantees,
disclaimers, and unsupported or ambiguous claims as observed content.

ObservedMessage must not invent positioning, offers, guarantees, proof, or
business facts.

### ObservedAsset

ObservedAsset records observed assets referenced by the proposal. It may
include asset identity, file path or URL, media type, intended placement when
observable, usage location, accessible metadata when available, missing asset
signals, load failures, and evidence references.

ObservedAsset does not decide whether the asset is brand-correct or compliant.

### ObservedConstraint

ObservedConstraint records observable signals related to constraints in the
source Website Generation Package or proposal boundary, such as forbidden
production mutation, forbidden claims, no-publishing requirements, privacy
limitations, accessibility expectations, asset-use limits, or unresolved
inspection blockers.

ObservedConstraint records the signal only. It does not classify contractual
pass or fail.

### ObservedTechnicalSignal

ObservedTechnicalSignal records technical facts that can be observed without
judgment. Examples include route availability, render success or failure,
static HTML availability, asset load state, missing files, broken links,
metadata presence, form presence, script dependence, viewport issues,
console-level diagnostics when available, and preview accessibility.

ObservedTechnicalSignal is diagnostic evidence. It is not a quality score.

### ObservedEvidence

ObservedEvidence records the source and basis for each observation. It may
reference proposal artifact IDs, provider payload IDs, source WGP IDs,
bundle metadata, file paths, rendered preview facts, route inventories,
section observations, static HTML snippets, asset inventory entries,
operator notes, provider notes, diagnostics, and limitations.

ObservedEvidence must be specific enough for a future reviewer or compliance
boundary to understand where the observation came from.

### ObservedLimitation

ObservedLimitation records missing, blocked, ambiguous, partial, stale, or
out-of-scope observations.

Missing evidence is a limitation, not permission to infer.

### ObservedWebsiteLineage

ObservedWebsiteLineage connects the Observed Website Model to:

- source Generated Website Proposal;
- source ProviderGenerationPayload;
- source Website Generation Package;
- source Website Design Brief when available through WGP lineage;
- source Business Alignment and Digital Business Twin lineage when available
  through upstream artifacts;
- site version;
- dry run;
- operator attestation;
- output bundle metadata;
- observation source set;
- observation boundary version.

Lineage proves which quarantined proposal was observed and which upstream
generation contract remains the future comparison target.

## Observation Sources

Observation may use these sources when available:

- generated output bundle metadata;
- generated file tree;
- rendered preview when available;
- static HTML/content when available;
- asset inventory;
- route/page inventory;
- operator notes;
- provider notes.

Observation sources are not equally complete or equally reliable. The
Observed Website Model must record which sources were available, which were
missing, and which observations depended on each source.

Provider notes and operator notes may explain context or limitations. They are
not trusted substitutes for observed proposal reality.

## Observation Rules

Observation must follow these rules:

- observe only;
- no compliance judgment;
- no business reinterpretation;
- no canonical business updates;
- no Website Generation Package mutation;
- no provider trust;
- no publishing;
- no runtime mutation.

Observation must not:

- change Digital Business Twin, Business Understanding Report, Business
  Alignment, Website Design Brief, Website Generation Package, or
  ProviderGenerationPayload artifacts;
- upgrade a proposal to approved or publishable state;
- mark a proposal compliant;
- create a Compliance Report;
- call a provider;
- execute AI;
- deploy, publish, mutate DNS, mutate production, or mutate runtime state;
- repair generated output;
- fill gaps with business assumptions;
- treat provider claims as observed facts.

## Observation Readiness

Observation readiness describes whether enough proposal material is available
to produce a useful Observed Website Model.

Readiness is not compliance.

### not_observable

Use `not_observable` when no meaningful proposal material can be inspected.

Examples:

- output bundle metadata is present but no file tree, route inventory, static
  content, preview, asset inventory, or usable notes are available;
- source proposal lineage is present but all observation sources are missing;
- bundle references cannot be resolved even conceptually.

### partially_observable

Use `partially_observable` when some proposal material can be inspected but
coverage is incomplete.

Examples:

- route inventory exists but rendered preview is unavailable;
- static HTML exists for some pages only;
- asset inventory is incomplete;
- provider notes describe limitations that cannot be independently observed;
- dynamic routes, scripts, forms, or media cannot be inspected.

### observable

Use `observable` when available proposal material is sufficient to produce a
coherent Observed Website Model for the declared observation scope.

Observable does not mean compliant, approved, publishable, or production
ready. It only means the observation boundary has enough evidence to describe
what exists.

### blocked

Use `blocked` when observation cannot proceed because of a safety, lineage,
access, integrity, or boundary problem.

Examples:

- source Generated Website Proposal lineage is invalid;
- source ProviderGenerationPayload or WGP reference is missing;
- proposal material appears to include publishing, deployment, DNS mutation,
  production mutation, or runtime mutation artifacts;
- operator attestation is missing or contradictory;
- proposal material requires executing untrusted code outside the allowed
  observation boundary.

## Evidence Model

Observation must preserve:

- source proposal artifact;
- source provider payload;
- source Website Generation Package;
- observed routes;
- observed sections;
- observed navigation;
- observed messages;
- observed assets;
- missing observations;
- limitations;
- diagnostics.

Evidence should remain source-specific. A future observation artifact should
be able to say whether a fact came from bundle metadata, file tree inspection,
rendered preview, static HTML, asset inventory, route inventory, operator
notes, provider notes, or diagnostics.

Evidence must distinguish:

- observed present;
- observed absent within the declared scope;
- not inspected;
- not available;
- ambiguous;
- blocked.

The evidence model must support future review without requiring trust in the
provider. Provider claims may be preserved as notes, but observed facts must
be traceable to observation sources.

## Relationship To Compliance

The future relationship is:

```text
Observed Website Model
-> Generation Contract Compliance
```

Generation Contract Compliance compares observed reality against the Website
Generation Package.

Observation does not compare.

Observation may record that a page exists, a message is visible, an asset is
missing, navigation points to a route, a rendered preview failed, or a static
file could not be inspected.

Compliance may later decide whether those observations satisfy, partially
satisfy, fail, or cannot determine the Website Generation Package contract.

Observation therefore creates the evidence-bearing observed reality model.
Compliance creates contractual evaluation.

## Relationship To Import

MVP-1K-1 imports and persists quarantined Generated Website Proposal metadata.

MVP-1K-2 defines how future observation may inspect that quarantined proposal
without trusting it, executing it, evaluating it, approving it, or publishing
it.

MVP-1K-3 implements the first runtime foundation in
`docs/architecture/OBSERVED_WEBSITE_MODEL_RUNTIME_FOUNDATION.md`. The runtime
consumes quarantined `GeneratedWebsiteProposalArtifact` metadata and records
available route/page, file, navigation, section, message, asset, technical,
provider-note, operator-note, evidence, limitation, readiness, diagnostic, and
lineage facts. It records limitations when metadata is absent.

Import readiness and observation readiness are separate:

- import readiness asks whether the proposal can be quarantined and persisted;
- observation readiness asks whether the quarantined proposal can be described
  from available sources;
- compliance readiness asks whether future contract comparison may run.

None of these readiness states is a compliance pass or publish authorization.

## Completion Definition

MVP-1K-2 is complete when GNR8 has a clear documentation-only boundary for
observing quarantined Generated Website Proposals and producing an Observed
Website Model without evaluating compliance, creating a Compliance Report,
approving, publishing, calling providers, executing AI, adding UI/API/schema
or workers, or mutating runtime state.

## Next Boundary After MVP-1K-3

Generation Contract Compliance may later compare a persisted Observed Website
Model against the Website Generation Package.

That future phase must still stop before Compliance Report, Business
Approval, publishing, provider calls, AI execution, UI, API, schema, workers,
deployment, DNS mutation, production mutation, or runtime mutation unless
explicitly authorized.
