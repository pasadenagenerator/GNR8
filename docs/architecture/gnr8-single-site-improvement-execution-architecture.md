# GNR8 Single-Site Improvement Execution Architecture

Phase: MVP-19
Scope: Design-only architecture for future single-site improvement execution

This document does not implement TypeScript, SQL, services, routes, workers, UI, runtime mutation, site-version mutation, content overrides, AI generation, AI execution, provider calls, publish, rollback, billing, domain, DNS, Command Center, Ops Inbox, client portal, commit, or push behavior.

## Current MVP Flow

The current single-site MVP path is:

1. Capture/source import: the canonical client-scoped import route captures source URL, raw HTML, rendered capture evidence, screenshots, assets, styles, diagnostics, runtime identity, and pipeline output. MVP-8 integrated completion/failure into the single-site state spine.
2. Source evidence review: capture output is represented through source evidence review categories and must be accepted or accepted with limitations before clone generation.
3. Real clone generation: MVP-9 gates clone generation; MVP-11 orchestrates start/completion; MVP-12 creates a real draft/shadow runtime clone candidate using runtime-store primitives and verifies runtime-store integration.
4. Clone review/fidelity acceptance: MVP-13 persists clone review truth and gates proposal planning on accepted or accepted-with-limitations clone review.
5. Improvement proposal planning: MVP-14 designed proposal source truth; MVP-15 implemented canonical proposal planning persistence and service core.
6. Implementation authorization: MVP-16 defined the boundary; MVP-17 added AAF contracts/scope; MVP-18 created the non-executing bridge from approved proposal planning to AAF request/evidence/validation.
7. Missing step: no governed improvement execution exists yet.

Current state confirmed:

- source capture is already integrated into the single-site spine;
- source evidence review gates clone generation;
- clone generation is real and runtime-store verified;
- clone review/fidelity acceptance gates proposal planning;
- proposal planning is canonical;
- implementation authorization is AAF-governed;
- no governed improvement execution exists yet.

## MVP Improvement Execution Definition

For the single-site MVP, improvement execution means:

- create one improved candidate runtime version from the accepted clone version and approved proposal recommendation refs;
- create/bind a review-stage runtime artifact for that candidate;
- record execution attempt refs, selected recommendations, evidence, semantic input watermark, semantic output watermark, limitations, diagnostics, actor, correlation, and idempotency;
- preserve proposal limitations and implementation authorization limitations;
- require improved version review after candidate creation.

MVP improvement execution does not mean:

- publish;
- switch active pointer;
- mutate production version;
- modify accepted clone version;
- modify domain, DNS, billing, subscription, hosting entitlement, Vercel, Openprovider, Stripe, or provider state;
- imply content approval;
- imply client approval;
- imply launch approval;
- imply publish activation approval;
- call AI providers;
- call external providers.

## Out Of Scope

- Autonomous AI execution.
- Full redesign engine.
- Multi-variant generation.
- A/B testing.
- Campaign generation.
- Direct production mutation.
- Publish activation.
- Client portal review.
- Billing/domain coupling.
- Broad visual builder/editor work.
- Content approval implementation.
- Client approval implementation.
- Launch approval implementation.
- Publish/rollback implementation.
- UI/API/Command Center/Ops Inbox integration.

## Architecture Shape

The future executor should be server-only and narrow:

`approved proposal + selected recommendations + accepted clone + execution-time AAF validation -> new improved candidate version/artifact + execution refs/evidence -> improved version review required`

Recommended internal boundaries:

| Boundary | Owns | Does not own |
| --- | --- | --- |
| Execution-time AAF validator | Exact authorization validation before mutation | Approval decisions or runtime writes |
| Improvement execution service | Attempt lifecycle, selected items, result refs, idempotency | Approval truth, content approval, publish |
| Runtime candidate adapter | New candidate site version/artifact creation | Active pointer, publish, content approval |
| Evidence/result builder | Execution result evidence package and audit refs | Source/proposal/AAF truth |
| Improved version review service | Review of candidate against proposal/limitations | Content/client/launch/publish approval |

## Existing Primitive Recommendation

The safest future primitive is a new improved candidate site version/artifact using existing runtime primitives, similar in discipline to MVP-12:

- `createSiteVersionFromMigration`;
- `buildDeterministicArtifactBundle`;
- `createArtifact`;
- `bindArtifactToVersion`;
- runtime-store refs and artifact hashes.

The executor should reuse capture, WU, VCU, CGP/brand, proposal, and Generated Proposal Bundle outputs as evidence or advisory inputs only. It should not call broad AI transformation execution directly. It should not use Generated Proposal Bundle output as production truth. It should not mutate active pointers.

## Future Persistence Recommendation

Add a future persistence family rather than overloading proposal rows:

- `gnr8_single_site_improvement_execution_attempts`;
- `gnr8_single_site_improvement_execution_refs`;
- `gnr8_single_site_improvement_execution_events`;
- `gnr8_single_site_improvement_execution_items`.

Records should include:

- migration/client/site;
- proposal plan ref;
- implementation authorization request/decision/evidence refs;
- clone source version ref;
- clone runtime artifact ref;
- improved candidate version ref;
- improved runtime artifact ref;
- selected recommendations;
- limitations carried forward;
- execution mode;
- executor identity/version;
- actor/correlation/idempotency;
- semantic input watermark;
- semantic output watermark;
- error/failure details;
- audit/evidence refs.

Reason: proposal planning should not own execution attempts, and runtime artifacts should not carry all governance state in provenance JSON alone.

## Improved Version Review Boundary

Improved candidate review is a separate review step over the generated candidate. It answers:

- Did the candidate implement the approved recommendations?
- Were limitations preserved?
- Did it avoid out-of-scope changes?
- Is it ready to proceed to a later content approval stage?

It does not answer:

- Is content approved?
- Has the client approved?
- Is launch approved?
- Is publish approved?
- Is domain/DNS/billing ready?

## Required Evidence Written

Future execution should write or cite:

- execution attempt ref;
- exact AAF validation result ref;
- proposal plan and selected recommendation refs;
- accepted clone review and clone source version/artifact refs;
- source evidence review refs;
- WU/VCU/CGP refs used as advisory inputs;
- improved candidate runtime version and artifact refs;
- implementation diff/summary;
- carried limitations;
- diagnostics and failure details;
- semantic input/output watermarks;
- audit refs;
- idempotency and correlation refs.

## Architecture Warnings

- Do not rebuild import/WU/VCU/CGP when existing evidence/projections can be reused.
- Do not assume projections are canonical truth.
- Do not execute from stale proposal or authorization refs.
- Do not use AI routes as uncontrolled mutation surfaces.
- Do not treat Generated Proposal Bundles as runtime truth.
- Do not mutate production version or switch active pointer.
- Do not skip content/client/launch/publish approvals.
- Do not lose limitation carry-forward.
- Do not allow idempotency drift to create duplicate improved versions.
- Do not allow direct routes to bypass AAF validation.
- Do not let Command Center or Ops Inbox become source truth.

## Recommended Next Milestone

Recommended: MVP-20 execution-time AAF validator core.

Justification: the reuse map shows runtime candidate primitives are promising, but the dangerous first missing piece is not version creation. It is fail-closed, execution-time validation of the exact AAF implementation authorization scope against current proposal, clone, runtime, and source evidence refs. Implementing this validator first keeps the next mutation milestone narrow and prevents a future executor from treating MVP-18 attach-time validation as sufficient.
