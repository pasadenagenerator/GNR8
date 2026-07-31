# GNR8 Single-Site Improvement Execution AAF Revalidation Contract

Phase: MVP-19
Scope: Design-only execution-time AAF revalidation contract

This document does not implement a validator, execution service, SQL, route, UI, worker, runtime mutation, content edit, AI/provider call, publish, rollback, billing, domain, DNS, commit, or push behavior.

## Contract Purpose

MVP-18 validates and attaches implementation authorization refs before execution exists. That validation is not sufficient for future mutation. A future improvement executor must revalidate AAF immediately before any candidate runtime version, artifact, content, or execution record is created.

Validation failure blocks execution.

## Mandatory Inputs

A future execution-time validator must receive:

- tenant id;
- client id;
- site id;
- migration id;
- approved proposal plan id/version/watermark;
- selected recommendation ids/watermarks;
- proposal approval refs;
- clone review id/status/watermark;
- clone runtime site version ref;
- clone runtime artifact ref/hash or watermark;
- source evidence review id/status/watermark;
- implementation authorization request id;
- implementation authorization decision id;
- implementation authorization evidence package id;
- actor id/type/role and permission context;
- execution attempt id or deterministic attempt descriptor;
- correlation id;
- idempotency key;
- policy version expectation when known.

## Required Checks

The validator must fail closed unless every required check passes:

- request exists;
- decision exists;
- evidence package exists;
- scope is exactly `single_site_improvement_implementation_authorization`;
- action is exactly `start_single_site_improvement_implementation`;
- subject type is `single_site_improvement_proposal_plan`;
- subject id equals the proposal plan id;
- tenant/client/site scope matches the execution input;
- migration/proposal/clone/runtime/source subject refs match the current source refs;
- decision status is `granted` or `granted_with_limitations`;
- rejected, revoked, expired, superseded, cancelled, missing, malformed, wrong-scope, wrong-subject, and wrong-evidence decisions fail closed;
- request, decision, and evidence package point to the same evidence package where the schema supports linkage;
- evidence package type is `single_site_improvement_implementation_authorization_evidence`;
- evidence package semantic watermark matches the current proposal, clone, runtime artifact, source evidence, and selected recommendation state;
- evidence package is not invalid, stale, superseded, cancelled, or expired;
- proposal plan remains `approved` or `approved_with_limitations`;
- proposal approval decision remains current and separate from implementation authorization;
- clone review remains accepted or accepted with limitations;
- source evidence review remains accepted or accepted with limitations;
- selected recommendations are still approved and not superseded/deferred/rejected;
- implementation scope has not drifted from the authorization evidence;
- limitations from source evidence, clone review, proposal approval, and AAF decision are present and carried into the execution result;
- actor has permission to execute this exact scope for this tenant/client/site;
- correlation id and idempotency key are present and well formed;
- required audit timeline refs are present or an explicit fail-closed audit-unavailable result is returned.

## Policy-Not-Required Rule

`not_required_by_policy` must not bypass this scope by default. It may be accepted only if a future approved AAF policy explicitly names this exact scope and action, records the policy evaluation, still writes audit/evidence refs, and still performs subject/ref/freshness checks.

Absence of an AAF row never means approval is not required.

## Revalidation Timing

Revalidation must happen:

- after the executor has resolved current proposal, clone, source evidence, and runtime baseline refs;
- before any future execution attempt row is marked started if that row implies mutation eligibility;
- before any runtime site version, runtime artifact, content override, or artifact binding is created;
- again before retry if the retry occurs after a freshness window, source ref change, proposal change, clone change, selected recommendation change, or policy change.

## Outputs

The validator should return:

- `allowed` boolean;
- effective AAF status;
- blocking reason codes;
- carried limitations;
- verified subject refs;
- verified evidence refs;
- semantic input watermark;
- policy version;
- freshness summary;
- audit/evidence refs;
- validation timestamp;
- actor permission summary;
- correlation/idempotency echo.

Allowed results may proceed only to candidate creation. They do not approve content, client acceptance, launch, publish, billing, domain, DNS, rollback, or provider execution.

## Blocking Results

Blocking reasons include:

- `approval_required`;
- `evidence_missing`;
- `evidence_stale`;
- `approval_stale`;
- `approval_superseded`;
- `approval_revoked`;
- `approval_expired`;
- `approval_rejected`;
- `approval_cancelled`;
- `wrong_scope`;
- `wrong_subject`;
- `wrong_action`;
- `wrong_evidence_package_type`;
- `subject_ref_mismatch`;
- `source_watermark_mismatch`;
- `proposal_scope_drift`;
- `selected_recommendation_drift`;
- `actor_permission_denied`;
- `idempotency_missing`;
- `correlation_missing`;
- `audit_unavailable`;
- `policy_error`;
- `fail_closed`.

## Boundary Warnings

- Attach-time validation is a convenience, not mutation authority.
- Implementation authorization is not proposal approval, content approval, client approval, launch approval, or publish activation approval.
- AI/provider output cannot satisfy AAF.
- Command Center and Ops Inbox cannot satisfy AAF.
- DDOM readiness and PTT truth cannot satisfy implementation authorization.
- Direct routes must not bypass this validator.
