# GNR8 Single-Site Clone Gate Runtime Integration Contract

Date: 2026-07-29
Phase: MVP-10 runtime integration contract design
Scope: Documentation-only contract for a future MVP-11 implementation.

This contract defines how a future single-site clone-start orchestrator must integrate the MVP-9 clone generation gate. It does not implement runtime behavior.

## Recommended Service

Module:

`apps/platform/gnr8/single-site/single-site-clone-start-orchestrator.ts`

Function:

`startSingleSiteCloneGeneration(input: StartSingleSiteCloneGenerationInput): Promise<StartSingleSiteCloneGenerationResult>`

The service must be server-only and must be the only new integration point for single-site clone start.

## Input Fields

Required:

- `migrationId`: canonical single-site migration id. Required and never inferred.
- `clientId`: client scope expected for the migration.
- `siteId`: ownership site id expected for the migration.
- `actor`: actor type, id, role, and optional display label.
- `correlationId`: stable cross-service trace id.
- `idempotencyKey`: stable clone-start idempotency key.
- `requestedMode`: `execute` or `dry_run`.

Optional:

- `sourceEvidenceReviewId`: latest review id if caller already has it.
- `intendedTargetRuntimeSiteId`: clone target runtime site id if known.
- `intendedTargetSiteVersionId`: clone target runtime site version id if known.
- `intendedTargetArtifactId`: clone target runtime artifact id if known.
- `requestId`: request trace.
- `causationId`: upstream event or review id.
- `sourceWatermark`: capture/evidence watermark.
- `sourceEvidencePackageRef`: source evidence package reference.
- `metadataJson`: sanitized operational metadata.

`migrationId` is mandatory. The orchestrator may use `siteId` and `clientId` only as scope checks, not as lookup substitutes.

## Output Fields

Return shape:

- `ok`: boolean.
- `status`: `started`, `completed`, `blocked`, `dry_run_allowed`, `dry_run_blocked`, `failed`, or `idempotent_replay`.
- `migrationId`
- `clientId`
- `siteId`
- `gate`: full MVP-9 gate result.
- `acceptedWithLimitations`: boolean.
- `warnings`: sanitized warning objects.
- `missingRequirements`: gate and transition requirements when blocked.
- `stateTransitions`: state event ids for start, completion, or failure when written.
- `cloneRefs`: runtime site version, runtime artifact, raw template artifact, and related clone refs when completed.
- `recommendedNextAction`: gate or workflow recommendation.
- `correlationId`
- `idempotencyKey`

Blocked and dry-run responses must return enough information for operator workflow projection without exposing provider payloads, raw HTML, credentials, billing data, DNS records, or generated bundle contents.

## Gate Call

Required call:

`evaluateCloneGenerationGate({ migrationId })`

The MVP-9 gate must block clone start unless the latest source evidence review is `accepted` or `accepted_with_limitations`.

The orchestrator must call the gate before:

- clone generation;
- runtime site version creation;
- runtime artifact creation;
- raw clone artifact persistence;
- proposal generation;
- provider/AI execution;
- any clone state transition.

## State Transition Calls

Use `SingleSiteStateTransitionService`.

Start:

- `toState: "clone_generation_started"`
- `sourceEvidenceReviewId`: latest accepted review id
- required refs include `source_evidence_review` or `source_evidence_package`
- metadata includes gate result, warning mode, limitations, requested mode, target refs if preallocated, and boundary version
- idempotency key recommendation: `${input.idempotencyKey}:state:clone_generation_started`

Completion:

- `toState: "clone_generation_completed"`
- refs include `runtime_site_version_clone`, `runtime_artifact_clone`, and `raw_template_artifact` if present
- metadata includes generation primitive name/version, artifact ids, renderer compatibility, output hash/watermark, and warning carry-forward
- idempotency key recommendation: `${input.idempotencyKey}:state:clone_generation_completed`

Failure:

- after a successful start transition, generation failure should transition to `migration_failed`
- metadata includes sanitized error code/message, failure phase, retry classification, and any partial refs marked as diagnostics only
- idempotency key recommendation: `${input.idempotencyKey}:state:migration_failed`

Do not write direct SQL to `gnr8_single_site_*` tables outside the MVP-6 writer repository.

## Idempotency Strategy

The orchestrator must be idempotent around the requested clone start:

- Same `idempotencyKey`, same semantic input, and already-started state should return an idempotent replay result.
- Same key with different `migrationId`, `clientId`, `siteId`, target ids, or requested mode should fail with idempotency conflict before generation.
- If clone generation completed on a previous attempt, retry should return completed refs rather than creating another clone.
- If failure happened after `clone_generation_started`, retry is not automatically allowed under the current MVP-6 state machine; the current terminal failure behavior must be reported.

Idempotency must cover both MVP-6 transitions and clone generation primitive calls. If the generation primitive is not idempotent, the orchestrator must preallocate or pass stable target ids before generation.

## Error Model

Blocked, expected policy failures return structured results, not thrown errors:

- missing or blank `migrationId`;
- identity mismatch;
- read model unavailable;
- migration missing;
- gate blocked by review status;
- dry-run blocked;
- transition precondition blocked.

Unexpected infrastructure or clone primitive failures may throw internally but must be mapped to a sanitized `failed` result for callers. Raw stack traces, provider payloads, credentials, raw HTML, billing data, DNS provider data, and generated bundle contents must not be exposed.

## Warning Model

Warnings are non-blocking only when the gate returns allowed warning mode:

- `mode: "warning"`
- `reason: "source_evidence_accepted_with_limitations"`
- `acceptedWithLimitations: true`

Warnings must be returned to callers and written into transition metadata. Warnings must not be used to bypass missing source evidence review, missing AAF degraded evidence decision refs, clone-blocking evidence items, terminal migration states, or identity mismatches.

## Accepted-With-Limitations Model

Accepted-with-limitations is executable but auditable:

- the gate allows clone start with warning mode;
- the source evidence review id is required;
- limitations are preserved in result and transition metadata;
- MVP-6 requires an AAF degraded evidence approval decision ref when the review status is `accepted_with_limitations`;
- clone output refs must remain linked back to the accepted-limited review.

## Blocking Behavior

Blocking mode is the default for `requestedMode: "execute"`.

When the gate blocks:

- no clone generation primitive call;
- no runtime site version creation;
- no runtime artifact creation;
- no raw template artifact persistence;
- no proposal generation;
- no state transition to clone generation;
- no Command Center or Ops Inbox mutation.

The returned result should include the gate reason and next action, for example `review_source_evidence`, `retry_capture`, `resolve_migration_identity`, or `inspect_read_model`.

## Dry-Run Behavior

`requestedMode: "dry_run"` evaluates identity, read model, and gate readiness only.

Dry-run must not:

- write MVP-6 transitions;
- create runtime site versions;
- create runtime artifacts;
- call providers or AI;
- alter capture/import, proposal, billing, DNS, publish, rollback, Command Center, Ops Inbox, or worker state.

Dry-run returns `dry_run_allowed` or `dry_run_blocked` with the same gate result that execute mode would use.

## Transaction Boundaries

Do not create a broad transaction around both single-site state and runtime artifact generation.

Recommended sequence:

1. Read-only MVP-7/gate transaction.
2. MVP-6 transaction for `clone_generation_started`.
3. Clone/runtime generation primitive transaction(s), owned by existing runtime code.
4. MVP-6 transaction for `clone_generation_completed`.
5. MVP-6 failure transition if step 3 fails after step 2.

This avoids long cross-system locks and keeps existing runtime generation ownership intact.

## Retry Behavior

Source-evidence retry states (`retry_required`, `rejected`, `superseded`, missing review) are gate-blocked and recommend capture/review action.

Clone primitive retry after a start transition depends on idempotent target refs. MVP-11 should either:

- pass preallocated target ids into the clone primitive, or
- prove that the selected clone primitive is idempotent by migration id and target context.

The current MVP-6 transition graph treats `migration_failed` as terminal. Automatic retry from `migration_failed` must not be introduced in MVP-11 unless a later state-machine milestone explicitly changes that contract.

## Refs And Watermarks

Required refs for start:

- source evidence review ref;
- source evidence package ref when available;
- AAF approval decision ref for accepted-with-limitations.

Refs for completion:

- runtime site version clone ref;
- runtime artifact clone ref;
- raw template artifact ref when available;
- source evidence review ref carry-forward;
- source watermark or payload hash.

Watermarks should include capture snapshot id, source evidence package key, generation bundle hash, runtime artifact hash, or equivalent stable identifiers.

## Audit And Evidence Refs

The orchestrator should not create AAF approvals. It should carry existing AAF refs from the accepted source evidence review and include them in MVP-6 transitions when required.

Audit metadata should include:

- gate result reason and mode;
- actor and correlation id;
- source evidence review id;
- source evidence package ref;
- limitations and warning count;
- clone generation primitive identity;
- output refs and watermarks.

## Returned To Callers

Expose:

- decision status;
- gate reason;
- missing requirements;
- recommended next action;
- accepted-with-limitations flag and sanitized limitations;
- state event ids;
- clone runtime refs when completed.

Do not expose:

- raw HTML;
- generated bundle contents;
- provider prompts or payload bodies;
- credentials;
- billing or Stripe details;
- DNS provider records;
- internal stack traces;
- private source evidence bodies.

## Logging

Log structured events:

- clone start requested;
- gate allowed, warning, or blocked;
- transition started/completed/failed;
- clone primitive started/completed/failed;
- idempotent replay;
- sanitized error code and phase.

Logs should include `migrationId`, `clientId`, `siteId`, `correlationId`, `idempotencyKey`, `sourceEvidenceReviewId`, and target refs. Logs must omit raw source content, provider secrets, billing data, DNS provider credentials, and generated file contents.

## Implementation Guardrail

Generic runtime artifact generation must not be modified directly unless a later milestone proves that the selected primitive is clone-only. The default implementation path is a new single-site orchestrator that wraps existing primitives from the outside.
