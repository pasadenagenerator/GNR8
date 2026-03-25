GNR8 V1 Runtime Architecture Spec
Founder-Level Core Specification

Status
Authoritative V1 direction

Purpose
This document defines the canonical runtime architecture, product boundary, publishing model, migration role, AI role, approval model, and legacy cutline for GNR8 V1.

It exists to remove ambiguity.
If any code path, legacy subsystem, or product idea conflicts with this spec, this spec wins.

--------------------------------------------------
1. CANONICAL V1 DEFINITION
--------------------------------------------------

GNR8 V1 is an AI-assisted migration and website evolution platform for agencies.

It is NOT:
- a visual builder-first platform
- a pixel-perfect site cloning tool
- a Webflow-style editor
- a broad multi-product suite in V1

It IS:
- a migration factory for existing websites
- an agency operating layer for managing sites/clients/projects
- an AI-assisted system for understanding websites, proposing improvements, and publishing approved updates
- a platform where editing is primarily chat-driven and approval-driven

Canonical one-line definition:

GNR8 V1 is an agency-first AI migration and continuous website improvement platform built around deterministic intake, structured site understanding, approval-gated AI actions, and publishable web outputs.

--------------------------------------------------
2. V1 PRODUCT BOUNDARY
--------------------------------------------------

Included in V1:
1. Agency/org/client/project multi-tenant core
2. Website intake from existing public URLs
3. Deterministic migration/validation pipeline
4. Structured site extraction and normalization
5. Operator-facing preview, diagnostics, approval, and execution tools
6. AI-assisted understanding and recommendation layer
7. Approval-gated content/layout/site improvement actions
8. Publishable website output/runtime

Explicitly NOT included as core V1 identity:
1. Full visual builder/editor
2. Pixel-perfect cloning
3. Broad no-code page composition system
4. General autonomous AI agent platform
5. Open-ended multi-product operating system expansion

--------------------------------------------------
3. CANONICAL PUBLIC RUNTIME
--------------------------------------------------

The canonical public runtime for GNR8 V1 is:

Static-first published website output with controlled progressive enhancement.

This means:
- websites are published as deterministic output artifacts
- the public runtime is not ChaiBuilder-based
- the public runtime is not dependent on a builder-rendered page model at request time
- the public runtime should be lightweight, cacheable, and deployment-friendly

V1 public delivery model:
1. Intake and normalization happen inside GNR8
2. AI and operator workflows produce approved page/site changes
3. Approved output is materialized into publishable site artifacts
4. Published sites are served as deployable runtime output, not builder-session output

Implications:
- ChaiBuilder is legacy and must not remain the canonical public runtime
- preview runtime and publish runtime must converge toward the same output model
- public delivery must depend on the approved publish artifact, not on builder tables or builder rendering

--------------------------------------------------
4. MIGRATION ROLE IN V1
--------------------------------------------------

Migration is a first-class V1 product line.

Migration is not just onboarding.
Migration is a core acquisition and activation engine for agencies.

Canonical role of migration:
- ingest existing customer sites
- extract content, assets, structure, branding signals, and business identity
- produce a best-effort structured site model
- generate previewable, diagnosable outputs
- provide a path to rebuild, improve, and publish inside GNR8

Migration goal is NOT perfect visual cloning.
Migration goal IS:
- high-confidence content intake
- usable structural understanding
- strong asset recovery where practical
- enough fidelity to support rebuild and approval
- safe agency operations at scale

Migration acceptance standard in V1:
- best effort, not pixel perfect
- deterministic and diagnosable
- operator-reviewable
- publishable after manual polish where needed

--------------------------------------------------
5. CANONICAL V1 PIPELINE
--------------------------------------------------

Canonical V1 flow:

URL / source
→ intake
→ snapshot / import manifest
→ normalized prepared model
→ layout / render preparation
→ preview artifact generation
→ site understanding layer
→ AI recommendation / transformation proposal
→ human approval gate
→ execution / materialization
→ publishable runtime output
→ publish / deploy
→ future improvement loop

This is the single authoritative loop.

Any subsystem that does not feed this loop is secondary, transitional, or legacy.

--------------------------------------------------
6. STRUCTURED SITE MODEL
--------------------------------------------------

The canonical internal product asset in GNR8 V1 is not raw HTML.
It is the structured site model derived from intake.

The structured site model should contain, at minimum:
1. Site identity
   - domain
   - company/client name
   - language
   - business/contact/legal signals

2. Branding signals
   - logo
   - colors
   - fonts where available
   - key visual cues

3. Content inventory
   - headings
   - body copy
   - CTAs
   - testimonials
   - FAQ-style content
   - legal/contact information

4. Section inventory
   - hero
   - about
   - services
   - gallery
   - contact
   - trust signals
   - footer
   - other detected sections

5. Asset inventory
   - images
   - logos
   - icons
   - stylesheet signals
   - media assets

6. Structural signals
   - navigation
   - hierarchy
   - page purpose
   - conversion path hints

This structured site model is the primary input to AI.
Not raw builder state.
Not raw HTML alone.

--------------------------------------------------
7. AI ROLE IN V1
--------------------------------------------------

AI in GNR8 V1 is an analysis, recommendation, and approved-transformation layer.

AI is not the canonical renderer.
AI is not an unrestricted autonomous system.

Canonical V1 AI responsibilities:
1. Understand the imported site
   - technical
   - structural
   - semantic
   - branding
   - marketing/conversion

2. Detect opportunities
   - copy improvements
   - section restructuring
   - CTA improvements
   - trust-building improvements
   - UX clarity
   - modern best-practice alignment

3. Propose changes
   - explainable
   - scoped
   - reviewable
   - attached to concrete site structures

4. Execute approved changes
   - only within approved scope
   - with logs, traceability, and clear artifact outcomes

V1 AI should be:
- helpful
- opinionated
- measurable
- approval-aware
- non-magical

--------------------------------------------------
8. APPROVAL AND AUTOPILOT MODEL
--------------------------------------------------

GNR8 V1 is approval-gated by default.

Canonical policy:
- low-risk actions may be auto-executable later
- medium/high-risk actions require explicit approval
- destructive or business-sensitive actions are never silent

Risk classes:

LOW RISK
- copy refinement suggestions
- metadata suggestions
- non-destructive SEO suggestions
- non-published draft creation

MEDIUM RISK
- layout restructuring
- replacing assets
- modifying live site content
- publish candidate generation

HIGH RISK
- publishing changes to production
- destructive content removal
- domain/runtime changes
- billing-sensitive or tenant-sensitive actions

V1 default:
- AI proposes
- operator approves
- system executes
- audit trail is preserved

Autopilot in V1 is limited and scoped.
Autopilot is not the default system identity.

--------------------------------------------------
9. AGENCY / CLIENT / PROJECT CONTRACT
--------------------------------------------------

The multi-tenant model is core and remains valid.

Canonical hierarchy:
Org
→ Clients
→ Projects / Sites
→ Site versions / outputs / runs

Definitions:
- Org = agency or operating entity
- Client = end customer under org
- Project/Site = specific website engagement/runtime entity

Key V1 requirements:
1. Every imported site must be attachable to a client
2. If identity can be inferred from source site, system should help map or suggest the correct client
3. Projects must own:
   - intake runs
   - previews
   - approvals
   - publishes
   - AI recommendations
   - site versions
4. Permissions must remain org/member/RBAC based

--------------------------------------------------
10. PUBLISH MODEL
--------------------------------------------------

Canonical V1 publish model:
Approved site output becomes the deployable truth.

Publish requirements:
1. deterministic build/output artifact
2. versioned output
3. rollbackable
4. preview before publish
5. publish independent from builder runtime

This means:
- preview and publish should converge on the same artifact model
- operator approval must happen before publish
- publish logs must be part of the system record

--------------------------------------------------
11. OPERATOR SYSTEM ROLE
--------------------------------------------------

Operator tooling is not temporary fluff.
It is part of the V1 product backbone.

Canonical operator responsibilities:
- inspect imports
- inspect diagnostics
- inspect previews
- review AI proposals
- approve or reject execution
- publish approved outputs
- monitor migration quality

Control tower / validation shell / operators are V1 infrastructure, not accidental tooling.

--------------------------------------------------
12. LEGACY CUTLINE
--------------------------------------------------

The following is legacy relative to the GNR8 V1 direction:

1. ChaiBuilder as canonical public runtime
2. builder-first editing model
3. builder tables as the authoritative public page source
4. visual-builder-centric system identity

ChaiBuilder may exist temporarily during transition, but it is not part of the intended V1 architecture.

Canonical replacement direction:
- chat-driven AI editing
- structured site model transformations
- approval-gated execution
- publish artifact runtime

Any ChaiBuilder-related code, DB objects, routes, domains, envs, or infra should be treated as transitional and scheduled for decommission once public runtime cutover is defined and implemented.

--------------------------------------------------
13. V1 NON-GOALS
--------------------------------------------------

GNR8 V1 will NOT optimize for:
- pixel-perfect migration fidelity
- full visual builder experience
- arbitrary no-code authoring
- unconstrained autopilot
- broad multi-product platform sprawl
- premature event-bus-heavy architecture
- microservices

--------------------------------------------------
14. ARCHITECTURAL PRINCIPLES FOR V1
--------------------------------------------------

1. Convergence over expansion
There must be one canonical path, not parallel product universes.

2. Structured model over raw markup
AI and system logic should operate on normalized site understanding.

3. Publish artifact over builder runtime
Public delivery must converge on approved output artifacts.

4. Approval over blind autonomy
Trust and auditability matter more than maximal automation.

5. Agency-first operating model
The system is designed for agencies managing many customer sites.

6. Deterministic backbone, adaptive intelligence
Pipeline deterministic where possible; AI layered on top, not replacing foundations.

--------------------------------------------------
15. IMMEDIATE STRATEGIC CONSEQUENCES
--------------------------------------------------

Based on this spec, the next system-level priorities are:

1. Define and implement canonical public publish/runtime path
2. Plan and execute ChaiBuilder decommission after runtime cutover path exists
3. Strengthen structured site model and client mapping
4. Wire AI semantic layer directly to structured model and approval flow
5. Keep migration fidelity work only insofar as it improves intake quality, not clone perfection

--------------------------------------------------
16. FINAL V1 POSITION
--------------------------------------------------

GNR8 V1 is an AI-assisted migration and website evolution platform for agencies.

Its core loop is:
ingest
→ understand
→ recommend
→ approve
→ publish
→ improve again

That is the product.
That is the runtime destiny.
Anything outside that loop is secondary.