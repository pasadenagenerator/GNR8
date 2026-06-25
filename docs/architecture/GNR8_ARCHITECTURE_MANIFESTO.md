# GNR8 Architecture Manifesto

## Canonical Identity

GNR8 is an AI Orchestrator with a governed Website Understanding Engine.

GNR8 is not a traditional website builder.

GNR8 is not a CMS.

GNR8 is not a generic page editor.

GNR8 exists to understand websites deeply enough to prepare governed,
source-grounded tasks for external AI systems, validate the results, route the
results through human approval, and publish only approved outputs. It is an
orchestration and governance platform, not a drag-and-drop construction surface
or an internal page-generation engine.

## Required Manifesto Statements

- GNR8 is an AI Orchestrator with a governed Website Understanding Engine.
- GNR8 is not a traditional website builder.
- GNR8 is not a CMS.
- GNR8 is not a generic page editor.
- The Digital Twin is the canonical operational representation of a website.
- Generated websites are outputs, not the long-term source of truth.
- Generation without understanding is prohibited.
- AI proposes; humans approve.
- The orchestrator owns the task; the model executes it.
- GNR8 must remain model-agnostic.

## Core Philosophy

The product center is website understanding before website change. Import,
evidence, lineage, candidate discovery, context, review, reconstruction
packaging, and structure planning are not setup chores. They are the core
system.

Generation without understanding is prohibited. Any generated website,
component draft, layout proposal, or code artifact must be downstream of
verified understanding, explicit lineage, validation, and human governance.

Generated websites are outputs, not the long-term source of truth. The source
of truth is the governed operational representation of the website and its
approved lineage.

## AI Orchestration Principle

The orchestrator owns the task; the model executes it.

GNR8 prepares bounded generation tasks from evidence and approved structure. It
selects, routes, and validates work across external AI systems without making a
single model, provider, or generated artifact canonical. GNR8 must remain
model-agnostic.

External AI systems may generate creative proposals, redesign options, layout
or code drafts, and implementation candidates. Those outputs are never accepted
because they exist. They are accepted only after GNR8 can validate them against
the originating evidence, task contract, constraints, and human approval state.

## Website Understanding Engine

The Website Understanding Engine is the governed chain that turns an imported
website into structured operational knowledge:

```text
Import
-> Evidence
-> Discovery
-> Context
-> Review
-> Reconstruction Package
-> Structure Plan
```

This chain is evidence-first and lineage-preserving. It decides what is known,
what is approved, what is blocked, what is stale, and what may safely become an
input to future generation tasks.

The engine does not exist to imitate a builder schema. It exists to make
website state inspectable, reviewable, explainable, and safe to act on.

## Digital Twin Role

The Digital Twin is the canonical operational representation of a website.

The Digital Twin is not simply rendered HTML, React output, block JSON, CMS
content, or a page editor state. It is the governed representation of observed
website structure, evidence, lineage, decisions, constraints, validation
results, approvals, and publish readiness.

Generated websites are outputs of the Digital Twin and orchestration process.
They do not replace the Twin as the long-term source of truth.

## GNR8 And External AI Systems

GNR8 owns:

- import
- evidence capture
- candidate discovery
- candidate context
- review/governance
- reconstruction package
- structure planning
- generation task preparation
- AI provider orchestration
- generated output validation
- human approval
- publish flow

External AI owns:

- creative generation
- visual redesign proposals
- layout/code drafts
- component/code implementation drafts

GNR8 should express precise tasks, constraints, evidence refs, acceptance
criteria, validation requirements, and approval gates. External systems may
execute those tasks, but they do not own GNR8's product identity, source of
truth, governance state, or publish authority.

## Human Governance

AI proposes; humans approve.

Human governance is not optional ceremony. It is a product boundary. Operators
must be able to inspect the evidence, understand what an AI system was asked to
do, compare generated output against approved inputs, review validation results,
and explicitly approve before publish.

Approval state must be durable, auditable, and separate from generation state.
No model output may silently mutate canonical website state.

## Validation Before Publish

Validation before publish is mandatory.

Generated output must be checked against the source task, accepted evidence,
lineage, structural constraints, missing-data limitations, forbidden-field
rules, and operator approval state before it can be promoted to any public
environment.

Publish is a governed promotion of approved output. It is not direct model
execution, not direct editor mutation, and not the act of generating code.

## Anti-Builder And Anti-CMS Positioning

GNR8 must not drift into Webflow, WordPress, Sanity, Payload, or a generic
CMS/builder shape.

GNR8 must not make editable page state, component palettes, drag-and-drop block
trees, or CMS content fields the core product truth. Those concepts may appear
only as downstream projections, generated drafts, integration targets, or
reviewable outputs when a governed task requires them.

The long-term architecture rule is:

```text
understanding before generation
evidence before proposal
lineage before mutation
validation before approval
approval before publish
orchestration before model execution
```

## Canonical Lifecycle

The canonical future lifecycle is:

```text
Import
-> Evidence
-> Discovery
-> Context
-> Review
-> Reconstruction Package
-> Structure Plan
-> Generation Task
-> External AI
-> Validation
-> Human Approval
-> Publish
```

The explicitly rejected lifecycle is:

```text
Import
-> Generate React
```

That rejected path bypasses the core product identity. It treats generation as
the product instead of treating governed understanding, orchestration,
validation, approval, and publishing as the product.

## Roadmap Alignment Notes

The deterministic chain is proven through persisted and inspected
`StructurePlan` artifacts. The current chain is:

```text
Import
-> Evidence
-> Candidate Discovery
-> Candidate Context
-> Candidate Review
-> Reconstruction Package
-> StructurePlan
```

Existing architecture/state documents generally protect this chain from direct
generation. They repeatedly forbid generated React, blocks, content, CMS
bindings, AI output, publishing artifacts, execution artifacts, schema changes,
workers, API expansion, and UI mutation in the 8A through 8F phases.

The active roadmap assumption requiring reset is the post-StructurePlan
recommendation to proceed directly into `LayoutPlan` as the next internal
artifact. That recommendation was safe only under the previous assumption that
the next step was another metadata-only internal planning layer. Under this
manifesto, `LayoutPlan`, `BlockPlan`, and `ContentPlan` must not be treated as
inevitable internal generation engines or as steps toward a traditional website
builder. They require reassessment as possible generation-task inputs,
validation artifacts, Digital Twin projections, or external-AI task constraints.

No current canonical phase should proceed into `LayoutPlan`, `BlockPlan`, or
`ContentPlan` as if GNR8 is building a traditional internal website builder,
CMS, page editor, block schema, or direct React generator.

## Future Revision Areas

The following areas need future reassessment under this manifesto:

- LayoutPlan
- BlockPlan
- ContentPlan
- AI Editor architecture
- publishing flow
- generated output validation
- provider orchestration
- external AI task format

## Long-Term Architecture Rule

GNR8 remains an AI orchestration platform with a governed Website Understanding
Engine. It understands websites, prepares governed generation tasks for
external AI systems, validates results, preserves lineage and approvals, and
publishes only approved outputs.

Any future architecture that makes generated React, CMS records, editable page
blocks, or provider-specific AI output the long-term source of truth violates
this manifesto.
