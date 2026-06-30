# Business Alignment Specification

## Phase And Boundary

Phase BA-0 defines Business Alignment as the governed checkpoint between the
Business Understanding Report and all downstream planning artifacts.

This phase is documentation and architecture only. It adds no implementation,
TypeScript, schema, persistence, API, UI, workers, AI integration, prompts,
provider adapters, generation, validation execution, publishing, runtime state,
or deployment behavior.

Business Alignment does not validate websites. Business Alignment validates
business understanding.

## Canonical Definition

"A deterministic, human-governed process that confirms or improves the Digital
Business Twin before downstream planning begins."

Business Alignment is neither generation nor editing.

Business Alignment improves understanding only.

It confirms whether GNR8 understands the business sufficiently well to prepare a
Website Design Brief or Website Generation Package. When understanding is
wrong, incomplete, conflicting, stale, or low confidence, Alignment creates new
governed knowledge that improves the Digital Business Twin.

## Primary Goals

Business Alignment exists to:

- confirm business understanding;
- correct incorrect assumptions;
- resolve conflicting interpretations;
- increase confidence;
- identify missing business knowledge;
- improve trust in the Digital Business Twin;
- prepare Website Design Brief creation;
- prevent downstream generation from incorrect assumptions;
- preserve human authority over business meaning;
- keep generation downstream of aligned understanding.

## Alignment Versus Validation

Alignment is different from Validation.

Alignment answers:

- Does GNR8 understand the business correctly?
- Which assumptions should humans confirm, reject, or correct?
- Which business knowledge is missing before planning begins?
- Which parts of the Digital Business Twin are ready to inform a Website Design
  Brief or Website Generation Package?

Validation answers later questions:

- Does generated output conform to the originating package?
- Does the output respect constraints, evidence, lineage, and approval state?
- Is a generated website or artifact eligible for approval or publishing?

Alignment happens before planning and generation. Validation happens after
planning, package preparation, provider execution, or generated output.

Alignment governs understanding quality. Validation governs output conformance
and publish safety.

## What Becomes Aligned

Business Alignment may improve the Digital Business Twin's understanding of:

- Business Identity;
- Mission;
- Vision;
- Products;
- Services;
- Target Audience;
- Business Goals;
- Brand;
- Tone of Voice;
- Competitive Advantages;
- Business Relationships;
- Knowledge;
- Assets;
- Constraints;
- Compliance;
- Business Priorities;
- Success Metrics;
- Business Intent.

Alignment may confirm an existing DBT interpretation, add a human correction,
record a conflict, identify missing knowledge, or raise confidence for a
business domain.

Business Alignment never edits:

- HTML;
- React;
- components;
- layouts;
- pages;
- Generation Packages;
- provider payloads;
- prompts;
- publishing artifacts;
- deployment artifacts;
- runtime state.

## Participants

Business Alignment is human-governed. Participants may include:

- business owners;
- founders or executives;
- marketing stakeholders;
- sales stakeholders;
- operations stakeholders;
- support stakeholders;
- brand or agency stakeholders;
- compliance or legal stakeholders when regulated claims are involved;
- GNR8 operators who facilitate review without replacing business authority.

The business owns authoritative corrections about itself. GNR8 records,
structures, and governs those corrections as new knowledge with lineage.

## Alignment Levels

Business Alignment uses canonical readiness levels:

| Level | Name | Recommended Meaning |
| --- | --- | --- |
| Level 0 | Unknown | GNR8 has no usable knowledge for the business area, or the current state is too incomplete to support planning. |
| Level 1 | Observed | GNR8 has evidence or source observations, but interpretation has not been reviewed by a human. |
| Level 2 | Reviewed | A human has inspected the interpretation and may have accepted parts, rejected parts, noted uncertainty, or requested more evidence. |
| Level 3 | Aligned | Humans and GNR8 agree on the current business understanding for the area, with known limitations recorded. |
| Level 4 | Confirmed | An authoritative stakeholder has explicitly confirmed the understanding as reliable enough for downstream planning. |

Website Generation Package preparation should only begin after sufficient
alignment. "Sufficient" is a governance threshold derived from business
importance, confidence, missing knowledge, conflicts, limitations, and the
intended Website Design Brief scope.

## Knowledge Evolution

Business knowledge evolves rather than being overwritten:

```text
Observed
-> Inferred
-> Reviewed
-> Aligned
-> Confirmed
```

Observed knowledge comes from evidence. Inferred knowledge comes from
interpretation. Reviewed knowledge has been inspected by humans. Aligned
knowledge reflects shared agreement between humans and GNR8. Confirmed
knowledge has explicit stakeholder authority.

Each state remains part of lineage. The current aligned understanding is the
active view, not the only view that ever existed.

## Corrections

Business Alignment follows these correction principles:

- every correction creates new knowledge;
- nothing rewrites history;
- evidence remains immutable;
- corrections become additional lineage;
- human corrections have authority over interpretations;
- evidence always remains preserved;
- rejected interpretations remain auditable as historical understanding;
- corrected knowledge must explain what changed and why.

If a website says one thing and an owner corrects it, the website evidence still
exists. The correction becomes authoritative business knowledge with lineage
back to the correction source.

## Alignment History

Future Alignment lineage should preserve the evolution of business
understanding, for example:

```text
Observed
-> Marketing correction
-> CEO correction
-> Current aligned understanding
```

Historical business understanding must remain available because downstream
decisions depend on what was known, when it was known, who corrected it, and why
the current understanding changed.

Alignment history supports auditability, trust, conflict resolution,
stakeholder accountability, and future reassessment when new evidence or human
corrections arrive.

## Generation Readiness

Generation Readiness is a projection derived from:

- Business Understanding;
- Alignment completeness;
- Confidence;
- Missing knowledge;
- Conflicts;
- Limitations.

Generation Readiness does not measure website quality.

Generation Readiness measures whether enough business understanding exists to
prepare downstream planning artifacts without relying on unsafe assumptions.

A business area may be ready for one narrow Website Design Brief while another
area remains unknown or blocked. Readiness is therefore scoped, confidence-aware,
and lineage-aware.

## Relationship Model

Business Alignment sits between the Business Understanding Report and all
downstream planning artifacts:

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

The governing distinction is:

```text
Evidence
-> Understanding
-> Alignment
-> Planning
-> Generation
-> Validation
-> Publishing
```

## Architectural Rules

Business Alignment never contains:

- generated HTML;
- generated React;
- generated components;
- generated pages;
- generated content;
- prompts;
- provider payloads;
- execution artifacts;
- publishing artifacts;
- deployment artifacts;
- runtime state.

Alignment governs business understanding only.

Business Alignment may create or improve DBT knowledge, lineage, confidence,
limitations, conflicts, readiness projections, and human decision history. It
must not create downstream planning, provider, generation, validation execution,
or publishing artifacts.

## Website Design Readiness

The Digital Business Twin is considered ready for Website Design when:

- business-critical domains for the intended website scope are Aligned or
  Confirmed;
- unresolved conflicts are either resolved or explicitly bounded;
- missing knowledge is either supplied or recorded as an accepted limitation;
- confidence is high enough for the intended Design Brief scope;
- human stakeholders trust the current understanding;
- Business Intent is known well enough to guide the Website Experience Domain;
- Generation Readiness says the planning boundary can proceed without unsafe
  assumptions.

Readiness does not mean the future website will be good. It means GNR8 has
enough aligned business understanding to begin planning the website responsibly.

## Relationship To Existing Artifacts

| Artifact | Relationship To Business Alignment |
| --- | --- |
| Evidence | Remains immutable source material. Alignment may interpret or correct understanding, but never rewrites evidence. |
| Digital Business Twin | The governed source of business understanding that Alignment confirms or improves. |
| Business Understanding Report | The human-facing projection reviewed during Alignment. |
| Website Design Brief | Downstream planning artifact that may begin only after sufficient Alignment. |
| Website Generation Package | Downstream provider-neutral orchestration target that must originate from an aligned Digital Business Twin. |
| Provider Adapter | Downstream serialization boundary; it does not participate in Alignment. |
| External AI | Downstream execution engine; it does not own business understanding. |
| Validation | Later output conformance and publish-safety process, distinct from Alignment. |
| Publishing | Governed release of approved output, never a source of business truth. |

## Completion Rule

At the end of BA-0, Business Alignment is a first-class architectural concept.
It governs the quality of business understanding rather than website generation.

Generation Packages may only originate from an aligned Digital Business Twin.
