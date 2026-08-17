# GNR8 Single-Site MVP CUTLINE-22 Rehearsal Candidate Source-Truth Plan

Date: 2026-08-17
Scope: production-safe source-truth plan for creating or identifying the first single-site rehearsal candidate.
Boundary: documentation, local code inspection, and read-only planning only. No production data write, workflow mutation, approval, AAF decision, gate attempt, dry-run, shadow-publish, runtime publish, provider call, env change, deploy, migration, commit, or push occurred.

## Decision

Recommended candidate path: use a real selected production site through the canonical client-scoped import and capture-spine path, after a human supplies the exact client/site/source details and explicitly authorizes that future mutation.

The first candidate should not be a seeded internal test site, legacy import artifact, inferred existing runtime site, or MVP exception fixture by default. Those paths can rehearse route mechanics, but they weaken source-truth confidence and must not count toward MVP validation unless separately approved as an exception. A real selected production site best exercises the intended source-owned chain while still allowing operators to stop before dry-run, shadow-publish, or active-pointer mutation.

Online verification remains blocked until that candidate exists and the minimum refs listed below are known.

## Current Production Blocker

CUTLINE-21 found production healthy enough for read-only preflight, but not ready for governed dry-run:

- `gnr8_single_site_migrations = 0`
- `migrations_with_site = 0`
- `gnr8_single_site_launch_readiness_records = 0`
- `gnr8_single_site_publish_operator_actions = 0`
- dry-run decision: `dry_run_blocked_missing_site_data`

No selected `tenantId`, `clientId`, `siteId`, `migrationId`, candidate site version ref, runtime artifact ref, launch readiness evidence ref, publish activation request/decision/gate refs, handoff watermark, or gate input watermark exists in production.

## Existing Callable Workflow Later

These paths exist in source and can be used only after a separate approved mutation milestone:

| Area | Existing path | What it can create later | CUTLINE-22 status |
| --- | --- | --- | --- |
| Canonical source capture and identity | `POST /api/gnr8/agency/clients/[clientId]/sites/import` | Client-scoped import, ownership site linkage/creation, runtime site version identity, runtime artifact/pipeline output, and best-effort `recordSingleSiteCaptureSpine(...)` rows. | Recommended first mutation path later. Not run now. |
| Capture spine writer | `apps/platform/gnr8/single-site/single-site-capture-spine-adapter.ts` | `gnr8_single_site_migrations`, capture/source refs, source evidence review, evidence items, and transition to `source_evidence_review_required` when minimum evidence exists. | Implemented service core. Not run now. |
| Source evidence review | `SourceEvidenceReviewService` via state writer services | Review decision rows/refs after human evidence review. | Implemented service core; operator route/UI not complete for this cutline. |
| Clone start/generation | `single-site-clone-start-orchestrator.ts`, `single-site-real-clone-executor.ts`, clone review service | Clone generation state and clone review rows/refs after accepted source evidence. | Implemented service cores; future operator execution required. |
| Proposal planning | `improvement-proposal-planning-service.ts` | Proposal plan, findings, recommendations, approval status, implementation authorization refs. | Implemented service core; proposal content remains human/operator-authored for MVP. |
| Implementation authorization | `implementation-authorization-bridge.ts` | Exact-scope AAF implementation authorization request/validation from approved proposal. | Implemented non-executing bridge; future AAF decision required. |
| Improved candidate | `improvement-execution-service.ts`, `improved-candidate-creation-adapter.ts`, `improved-version-review-service.ts` | Execution attempt, improved runtime candidate refs, dry-run result refs, improved candidate review/acceptance. | Implemented service/adapter cores; future execution authorization required. |
| Content/client/launch approvals | `content-approval-*`, `client-approval-*`, `launch-approval-*` services and AAF bridges | Scoped approval workflow rows plus exact-scope AAF request/evidence/decision refs. | Implemented service/bridge cores; future human decisions required. |
| Launch readiness | `launch-readiness-source-reader.ts`, `launch-readiness-service.ts`, `launch-readiness-evidence-builder.ts` | Readiness source package, persisted readiness record/dimensions/refs/blockers/events, and `single_site_launch_readiness_evidence`. | Implemented service cores. |
| Publish activation request | `publish-activation-request-bridge.ts` | Exact-scope AAF `publish_activation` request linked to launch readiness evidence. | Implemented bridge. |
| Publish activation decision | `publish-activation-decision-service.ts` | Exact-scope AAF approval decision for publish activation. | Implemented human decision service core. |
| Publish activation gate | `publish-activation-gate-evaluator.ts` | Persisted AAF gate attempt/result from the decision handoff. | Implemented evaluator. Not called by publish wrapper/dry-run. |
| Operator dry-run | `/api/gnr8/admin/single-site-publish/dry-run` and `/api/gnr8/admin/single-site-mvp/action` | Redacted dry-run/audit attempt using existing strict refs. | Implemented, but blocked until source truth exists. |
| Operator audit rows | `single-site-publish-operator-action-audit.ts` | Audit rows for dry-run/shadow-publish attempts. | Implemented as part of operator route attempts, not pre-created. |

## Manual Or Operator Required Workflow

These steps require human selection or review before any future mutation:

- select the production source site/domain and confirm it is safe to import;
- select or create the owning tenant/agency and client;
- confirm whether the candidate is real production rehearsal or explicitly internal/test;
- confirm site name, intended launch domain, and whether launch domain equals source host;
- review source evidence and decide accepted, accepted with limitations, retry required, or rejected;
- review clone fidelity and decide accepted, accepted with limitations, retry required, or rejected;
- author the MVP proposal findings/recommendations;
- approve proposal scope and separately authorize implementation;
- review improved candidate and content;
- decide whether client approval is required, then record client approval if required;
- grant launch approval only after content/client prerequisites are current;
- accept or block launch readiness limitations;
- grant publish activation only after launch readiness evidence is current;
- evaluate the gate only for the exact candidate/handoff;
- request governed dry-run only with exact refs and the required dry-run confirmation sentence.

## Missing Implementation

No single current Command Center button or route can create the full candidate chain from zero production source truth to dry-run-ready state.

Missing or incomplete for a fully productized operator path:

- a single supervised production operator workflow that chains canonical scoped import, evidence review, clone generation/review, proposal planning, authorization, improved candidate creation, approvals, launch readiness, activation request/decision, and gate evaluation;
- complete operator UI/routes for every source-owned manual decision in the chain;
- a safe authenticated API client path for browser-session JSON calls observed in CUTLINE-21;
- a production-safe fixture/exception creator that is explicitly non-validation-counting;
- source-owned reconciliation for existing runtime sites that lack `gnr8_single_site_migrations` rows.

## Unsafe Or Not Allowed For MVP Rehearsal

Do not use these paths as the first production candidate source truth:

- legacy URL import routes labelled `legacy_non_canonical`;
- generic runtime publish or client content publish routes;
- direct SQL inserts/updates/deletes into production;
- provider, DNS/domain, billing, Stripe, Vercel, Openprovider, or env mutation;
- dry-run, shadow-publish, publish, or runtime active-pointer mutation before the source-truth chain exists;
- AAF request/decision/gate fixture creation without human approval;
- inferred candidate identity from a domain, runtime preview, page title, Command Center card, Ops Inbox item, or publish target row alone.

## Candidate Path Decision Matrix

| Option | Decision | Reason |
| --- | --- | --- |
| Real selected production site | Recommended | Exercises the intended source-owned workflow and can count toward validation after full closeout, assuming no unsafe exceptions are used. |
| Seeded internal test site | Not recommended for first production rehearsal | Useful only for route mechanics; must be labelled non-validation-counting and still requires explicit exception posture. |
| Imported existing site | Allowed only through canonical scoped import/capture spine | Existing runtime/import artifacts without single-site migration rows are insufficient. |
| Explicit MVP exception fixture | Last resort | Can unblock a rehearsal of route contracts only, but must be approved, labelled, and excluded from MVP validation. |

## Minimum Required Records And Refs Before Governed Dry-Run

The minimum dry-run-ready source truth must include:

- tenant/agency id, client id, ownership site id, runtime site id, and single-site migration id;
- `gnr8_single_site_migrations` row linked to the selected site and source URL;
- capture/source evidence refs and source watermark;
- latest source evidence review decision accepted or accepted with limitations;
- clone runtime site version ref and clone runtime artifact ref;
- latest clone review accepted or accepted with limitations;
- proposal plan id/ref and proposal approval refs;
- implementation authorization AAF request/decision/evidence refs;
- improvement execution attempt ref, improved candidate site version ref, improved runtime artifact ref, and improved candidate review acceptance;
- content approval workflow row plus exact-scope AAF request/evidence/decision refs;
- client approval workflow row and AAF decision refs when required, or a source-owned policy ref proving client approval is not required;
- launch approval workflow row plus exact-scope AAF request/evidence/decision refs;
- launch readiness record in `ready` or `ready_with_limitations`, with dimensions/refs/blockers/events and accepted limitations;
- `single_site_launch_readiness_evidence` package ref and semantic watermark;
- active production publish target ref, currently expected as `ptt-1` for `production / production / active`;
- publish activation request ref;
- publish activation decision ref with granted or granted with limitations status;
- publish activation gate attempt/result ref for the exact candidate, artifact, target, request, decision, handoff, and gate input;
- handoff watermark and gate input watermark;
- operator dry-run idempotency key, correlation id, platform-superadmin actor, and dry-run-only confirmation.

The MVP-54 dry-run request cannot be assembled safely until the following concrete fields are known:

- `tenantId`
- `clientId`
- `siteId`
- `migrationId`
- `candidateSiteVersionRef`
- `runtimeArtifactRef`
- `expectedPublishTargetRef`
- `publishStage`
- `publishEnvironment`
- `expectedLaunchReadinessEvidenceRef`
- `expectedPublishActivationRequestRef`
- `expectedPublishActivationDecisionRef`
- `expectedGateAttemptResultRef`
- `expectedHandoffWatermark`
- `expectedGateInputWatermark`
- `idempotencyKey`
- `correlationId`

## Exact Human Input Needed

Before creating the future candidate, a human must provide:

- selected production source URL and canonical domain;
- selected tenant/agency id and client id, or approval to create/link the client through existing ownership workflow;
- intended ownership site name and intended launch domain;
- statement that the candidate is a real production rehearsal, internal test, imported existing site, or explicit exception fixture;
- approval posture: no exception, accepted degraded source evidence exception allowed, internal fixture exception, or other named MVP exception;
- named platform-superadmin operator;
- whether client approval is required for this candidate;
- whether custom-domain, billing/hosting, rollback, and smoke/QA readiness are required for dry-run readiness or explicitly excepted;
- approval to run the future source capture/import mutation when ready;
- later, separate approval for each AAF decision, gate evaluation, governed dry-run, and any shadow-publish.

## No-Mutation Rehearsal Candidate Checklist

- [ ] Choose real selected production site as default candidate path.
- [ ] Record source URL/domain, tenant/client/site intent, and operator owner in a planning artifact.
- [ ] Confirm no production source-truth mutation has been run yet.
- [ ] Confirm scoped import/capture spine is the intended future source capture path.
- [ ] Confirm legacy import, generic publish, client publish, provider, DNS/domain, billing, Stripe, Vercel/Openprovider, and direct SQL paths are excluded.
- [ ] Confirm all manual decision points and AAF scopes are listed before any operator work.
- [ ] Confirm minimum dry-run request refs are unavailable today.
- [ ] Keep online verification and dry-run blocked until the candidate chain exists.
- [ ] Require fresh read-only production source-truth counts after the future candidate mutation.
- [ ] Require the exact dry-run approval sentence only after refs are complete.

## Online Verification Status

Blocked. Online verification may resume only after a selected candidate exists with the minimum records/refs above. CUTLINE-22 does not authorize dry-run, shadow-publish, runtime publish, source capture, clone, proposal, approval, launch readiness, AAF, gate, provider, env, deploy, or migration mutation.

## Recommended Next Milestone

MVP-CUTLINE-23 should be a human-approved production candidate selection and source-capture authorization milestone. It should capture the exact human inputs, then, if approved, run only the canonical scoped import/capture-spine path for one selected site and stop for read-only source-truth verification before any clone, approval, launch readiness, gate, dry-run, or publish action.
