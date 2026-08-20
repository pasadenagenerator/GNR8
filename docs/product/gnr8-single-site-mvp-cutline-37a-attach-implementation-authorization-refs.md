# GNR8 Single-Site MVP-CUTLINE-37A Attach Implementation Authorization Refs

Date: 2026-08-20
Site: `chs.si`
Scope: attach granted implementation authorization refs to the approved proposal plan only

## Result

The granted implementation authorization refs were attached to the approved chs.si proposal plan through the existing proposal-planning attachment service, then the workflow stopped before improvement execution.

- Exact attachment approval sentence: present.
- Workflow path: direct read-only AAF validity readback, then `ImprovementProposalPlanningService.attachImplementationAuthorizationRef(...)`.
- Deterministic idempotency/correlation base: `gnr8-cutline-37a-chs-si-attach-implementation-authorization-20260820`.
- Proposal plan id: `f541075c-4641-4f70-b5ff-64a8af071571`.
- Proposal status before/after: `approved` / `approved`.
- `implementation_authorization_attached` before/after: `false` / `true`.
- Plan version before/after: `3` / `4`.
- Proposal implementation authorization ref id: `94ee9cf8-2efd-49a0-b821-28a2d5ca7348`.
- Proposal event id: `5e7dc7ef-0ad5-4fb5-a763-c5a5c830d2ce`.
- State event id: `null`; the migration was already in `improvement_proposal_approved`, so no coarse state transition was needed.
- Online verification status: `implementation_authorization_attached_pending_improvement_execution`.

## Attached Authorization Refs

- AAF request id/ref: `c27957ac-2fdd-4e5f-809f-e5a16e9a8f83` / `aaf:approval_request:c27957ac-2fdd-4e5f-809f-e5a16e9a8f83`.
- AAF decision id/ref: `12adb404-b9f6-4961-aa7a-63e24e023b12` / `aaf:approval_decision:12adb404-b9f6-4961-aa7a-63e24e023b12`.
- AAF evidence package id/ref: `042a8233-5f36-4b9d-a9ee-6ca218b7c9e3` / `aaf:evidence_package:042a8233-5f36-4b9d-a9ee-6ca218b7c9e3`.
- Scope: `single_site_improvement_implementation_authorization`.
- Subject type/id: `single_site_improvement_proposal_plan` / `f541075c-4641-4f70-b5ff-64a8af071571`.
- Decision status: `granted`.
- Limitations: `[]`.
- Semantic watermark: `single-site-implementation-authorization:d5339d4f0df08b75858506161f5584be83da934a1147865423a243f6b40fe321`.

The proposal plan `implementation_authorization_refs_json` now records the request, decision, evidence package, latest proposal ref id, validation status, scope, and semantic watermark.

## Validation Notes

Direct read-only AAF validity readback confirmed the request/evidence/decision are exact-scope, match tenant/client/site/migration/proposal identity, are fresh, have no expiry, and are not revoked or superseded.

MVP-20 semantic replay validation was not run after attachment because the original bridge input includes semantic fields, including operator notes, that are not fully echoed in persisted AAF rows. The prior `implementation authorization ref` blocker is resolved by the proposal attachment; any future improvement execution should rerun execution-time AAF validation with an execution request that carries the exact authorization input shape.

## Forbidden Downstream Counts

Forbidden downstream counts remained clean after attachment:

| Scope | Before | After |
| --- | ---: | ---: |
| Improvement execution attempts | 0 | 0 |
| Improved version reviews | 0 | 0 |
| Content approvals | 0 | 0 |
| Client approvals | 0 | 0 |
| Launch approvals | 0 | 0 |
| Launch readiness records | 0 | 0 |
| Publish operator actions | 0 | 0 |
| AAF gate attempts for proposal | 0 | 0 |
| Runtime active pointers total | 6 | 6 |
| Selected runtime active pointers | 0 | 0 |

## Boundary

No improvement execution attempt, improved candidate site version, runtime artifact, improved review, content approval, client approval, launch approval, launch readiness, publish operator action workflow, publish dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy/redeploy, migration, env mutation, commit, or push occurred.

## Validation

Validation completed:

- Exact attachment approval sentence: present.
- Existing safe workflow identified and used: `ImprovementProposalPlanningService.attachImplementationAuthorizationRef(...)`.
- Direct AAF readback validation: passed.
- Attachment readback: `implementation_authorization_attached=true`; refs populated.
- Forbidden downstream count summary remained clean.
- Active pointer readback: total `6`, selected site `0`.
- Online verification status set in docs/readback to `implementation_authorization_attached_pending_improvement_execution`.
- `git diff --check`: passed.
- Trailing whitespace scan on changed docs/index files: passed.

## Recommended Next Milestone

MVP-CUTLINE-38 should request a fresh, exact authorization to run improvement execution using the attached implementation authorization refs, and should stop after execution attempt/improved candidate readback unless a later prompt explicitly authorizes further review or approval stages.
