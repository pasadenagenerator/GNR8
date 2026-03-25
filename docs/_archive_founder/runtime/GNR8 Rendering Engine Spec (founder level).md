GNR8 Rendering Engine Spec (founder level)

1. Purpose

This document defines the Rendering Engine as GNR8 V1 execution layer only.

It defines:
- how canonical, versioned model state is executed into deterministic runtime/artifact output
- the render input/output contract
- what the renderer must do and must never do
- execution guarantees required for preview, publish, and validation parity

It does not define:
- system ontology (Site, SiteVersion, Page, PageVersion fundamentals)
- canonical source-of-truth rules
- publish lifecycle, activation semantics, rollback semantics
- public runtime strategy debates

2. Upstream Authority (Mandatory)

This spec is subordinate to and must be interpreted through:
- GNR8 Canonical Page Model Spec (founder level)
- GNR8 Public Runtime & Publish Model Spec (founder level)

When conflicts appear:
- ontology/source-of-truth questions resolve to Canonical Page Model Spec
- publish/activation/public-serving questions resolve to Public Runtime & Publish Model Spec
- this document resolves execution mechanics only

3. Rendering Engine Position in V1 Architecture

Renderer is:
- deterministic execution layer
- artifact-producing compiler/executor from canonical model state
- non-authoritative over model state

Renderer is not:
- builder runtime
- model-authoring system
- publish-orchestration system
- request-time AI system

Core identity:
- boring
- fast
- inspectable
- version-disciplined

3.1 Renderer as Model Compiler (Clarification)

In GNR8 V1 the Rendering Engine must be understood not as a traditional runtime templating system, but as a deterministic compiler from canonical model state to deployable site artifacts.

This means:
- renderer transforms structured model intent into execution-ready outputs
- renderer does not interpret builder schemas or raw markup at runtime
- renderer establishes a stable compilation boundary between model intelligence and public delivery

Strategic implication:
GNR8 evolves intelligence at the model layer, while keeping public execution simple, predictable, and compiler-like.

If renderer degenerates into a request-time interpreter of mutable state, version discipline and system trust collapse.

4. Non-Negotiable Execution Principles

4.1 Determinism
For same canonical version inputs + same runtime flags, renderer must produce equivalent effective output.

4.2 No Runtime Intelligence Drift
No AI generation/inference at public request-time render path.

4.3 Version Boundary Respect
Renderer must execute only explicit version-scoped inputs; no cross-version blending.

4.4 Builder Independence
Builder/editor state is never runtime truth input.

4.5 Fail-Loud Observability
Critical failures must surface with explicit diagnostics; no silent loss of critical content.

5. Render Input Contract (Execution Boundary In)

Minimum required execution input:
- SiteID
- Render target reference:
  - SiteVersionID + page resolution
  - or PageVersionID for scoped preview/validation execution
- RenderMode: preview | publish | validation
- RuntimeFlags (explicit, bounded)

ExecutionMode values are normatively defined in GNR8 Minimal Runtime Protocol Appendix.

Renderer resolves only canonical layers already defined upstream:
- Structure Model
- Content Model
- Style Tokens
- Asset Graph
- Runtime Directives

Explicitly forbidden inputs as runtime truth:
- raw HTML as authoritative state
- builder JSON/state as authoritative state
- mutable editor/session blobs
- ad-hoc request-time content injections outside declared directives/flags

6. Render Output Contract (Execution Boundary Out)

Renderer outputs:
- deterministic page/site render output suitable for static-first serving
- artifact components required by runtime/publish layer, including:
  - markup output
  - compiled style output from tokens
  - resolved fingerprinted asset references/map
  - manifest/runtime metadata required for deterministic serving

Renderer may additionally output:
- validation diagnostics
- render warnings and downgrade notes
- execution telemetry records

Renderer does not output:
- canonical state mutations
- publish state transitions
- active-domain pointer changes

7. Deterministic Execution Pipeline (Normative)

7.1 Load and Freeze Inputs
- Resolve version-scoped canonical inputs
- Materialize immutable execution context for the run

7.2 Structure Resolution
- Transform Structure Model into normalized render tree
- Preserve semantic hierarchy and responsive intent

7.3 Content Binding
- Bind typed content fields to render tree nodes
- Do not invent, paraphrase, or synthesize missing content

7.4 Style Compilation
- Compile Style Tokens to deterministic style artifacts/contracts
- Enforce token-driven output; avoid legacy CSS replay behavior

7.5 Asset Resolution
- Resolve Asset Graph references to fingerprinted, cache-safe runtime references
- Enforce fallback behavior when non-critical assets are unavailable

7.6 Runtime Directive Application
- Apply explicit execution directives (for example hydration/animation/personalization hooks) within bounded policy
- Directives may alter execution behavior, never source content truth

7.7 Output Emission
- Emit render/artifact outputs and execution diagnostics
- Stamp output with execution metadata needed for traceability

8. Preview, Publish, and Validation Parity at Engine Level

Engine parity rule:
- preview, publish, and validation use the same renderer and same core pipeline

Allowed differences between modes:
- overlays, auth/noindex guards, instrumentation, diagnostics, environment flags

Disallowed differences:
- semantic layout/content truth changes
- alternate rendering semantics
- mode-specific hidden transformations

Engine interpretation:
- preview must be publish-equivalent execution under safe non-authoritative flags

9. Runtime Behavior Boundaries (What Renderer Must Never Do)

Renderer must never:
- mutate canonical model state
- infer new content during public render
- execute builder state as runtime truth
- bypass or blur version boundaries
- silently drop critical content
- self-activate publish/rollback/domain pointer changes

10. Fallback and Error Handling

10.1 Critical Failures
For integrity-breaking issues (for example non-renderable critical structure), execution must fail closed for publish path and emit explicit error reasons.

10.2 Non-Critical Degradation
For degradable issues (for example optional asset variant missing), renderer may fail soft with:
- explicit warning record
- deterministic fallback choice
- preserved primary content/structure whenever possible

10.3 No Silent Corruption
Any fallback that changes user-visible semantics must be observable in diagnostics.

11. Performance and Serving Responsibilities

Renderer must produce outputs optimized for V1 static-first delivery:
- cache-friendly artifact composition
- predictable execution time
- minimal runtime client overhead within declared bridge needs
- stable layout behavior from deterministic structure/style resolution

Renderer responsibility is execution efficiency, not redefining public runtime strategy.

12. Observability and Diagnostics Contract

Minimum engine telemetry/diagnostic surfaces:
- render success/failure with reason codes
- fallback and downgrade counters
- missing/invalid asset resolution events
- deterministic parity-check signals (preview vs publish semantics)
- execution duration and stage timing

Diagnostics must support:
- operator trust
- migration quality validation
- runtime incident triage

13. Compatibility and Version Discipline

Renderer must enforce explicit compatibility checks across:
- canonical model schema/version expectations
- component registry/runtime compatibility version
- directive compatibility constraints

On incompatible inputs:
- fail with explicit compatibility diagnostics
- never auto-mutate canonical state to “fix” incompatibility at render time

14. Component Execution Contract

Renderer executes through a GNR8-native, versioned component registry that is:
- deterministic
- schema-bound
- token-aware

Registry scope is bounded:
- no open-ended builder plugin runtime
- no arbitrary ungoverned component scripting in V1 public runtime path

15. V1 Required Responsibilities vs Future Optional Evolution

15.1 Required in V1
- canonical-input deterministic execution
- static-first artifact output support
- preview/publish/validation pipeline parity
- explicit fallback/error diagnostics
- compatibility checks and observability baseline
- support for controlled dynamic bridges already defined upstream (including forms boundary)

15.2 Optional Future Evolution (Non-V1 Commitments)
- deeper personalization execution models under explicit directives
- expanded optimization passes that preserve deterministic equivalence
- broader component capability, only if compatibility and bounded execution guarantees remain intact

Future evolution must not violate Sections 2-4 and 9.

16. Relationship to Migration, AI, and Builder Systems

Migration:
- produces canonical model versions
- renderer executes them; renderer does not redefine migration ontology

AI:
- evolves canonical versions pre-render
- renderer executes approved versioned state; no render-time AI authorship

Builder/editor:
- may be authoring context
- never runtime execution truth

17. Founder Directive

Rendering Engine is the execution substrate, not architecture center.

If renderer stays narrow and deterministic:
- canonical truth remains stable
- publish/runtime operations remain trustworthy
- preview approval remains meaningful

If renderer expands into ontology or publish ownership:
- trust boundaries collapse
- version discipline degrades
- runtime risk increases
