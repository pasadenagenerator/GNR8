# GNR8 Single-Site MVP CUTLINE-42 Attach Fresh Implementation Authorization Refs

Date: 2026-08-20
Site: `chs.si`
Scope: attach/reconcile fresh granted implementation authorization refs with semantic replay data to the approved proposal plan only

## Result

The fresh granted implementation authorization refs with replay data were attached to the approved chs.si proposal plan through the existing proposal-planning attachment service, then the workflow stopped before improvement execution.

- Exact fresh attachment approval sentence: present.
- Workflow path: direct read-only AAF/replay validity readback, `SingleSiteImplementationAuthorizationBridge.validateImplementationAuthorizationRef(...)`, then `ImprovementProposalPlanningService.attachImplementationAuthorizationRef(...)`.
- Deterministic idempotency/correlation base: `gnr8-cutline-42-chs-si-attach-fresh-implementation-authorization-replay-v2-20260820`.
- Proposal plan id: `f541075c-4641-4f70-b5ff-64a8af071571`.
- Proposal status before/after: `approved` / `approved`.
- `implementation_authorization_attached` before/after: `true` / `true`.
- Proposal plan version before/after initial attachment: `4` / `5`.
- Idempotent readback rerun version before/after: `5` / `5`.
- Proposal implementation authorization ref id: `21fd1ce8-0531-4f40-a944-1f46d481f395`.
- Proposal event id: `635188b5-5720-4be0-bf38-0478f573f23a`.
- State event id: `null`; the migration was already in the proposal-approved state.
- Online verification status: `fresh_implementation_authorization_attached_pending_improvement_execution`.

## Old Attached Refs Before

The proposal previously had CUTLINE-37A refs attached:

- Old AAF request id/ref: `c27957ac-2fdd-4e5f-809f-e5a16e9a8f83` / `aaf:approval_request:c27957ac-2fdd-4e5f-809f-e5a16e9a8f83`.
- Old AAF decision id/ref: `12adb404-b9f6-4961-aa7a-63e24e023b12` / `aaf:approval_decision:12adb404-b9f6-4961-aa7a-63e24e023b12`.
- Old AAF evidence package id/ref: `042a8233-5f36-4b9d-a9ee-6ca218b7c9e3` / `aaf:evidence_package:042a8233-5f36-4b9d-a9ee-6ca218b7c9e3`.
- Old semantic watermark: `single-site-implementation-authorization:d5339d4f0df08b75858506161f5584be83da934a1147865423a243f6b40fe321`.
- Old proposal auth ref id: `94ee9cf8-2efd-49a0-b821-28a2d5ca7348`.

These old refs remain non-reusable for execution because their evidence package lacks the stored semantic replay object.

## Fresh Attached Refs After

- Fresh AAF request id/ref: `0b3a888e-cc6a-4cc1-bc53-476d70a20144` / `aaf:approval_request:0b3a888e-cc6a-4cc1-bc53-476d70a20144`.
- Fresh AAF decision id/ref: `5b4a4f19-a3dc-472e-8d2f-c65a126fadb0` / `aaf:approval_decision:5b4a4f19-a3dc-472e-8d2f-c65a126fadb0`.
- Fresh AAF evidence package id/ref: `b4ddb218-ce37-42ab-b2f3-433138df6489` / `aaf:evidence_package:b4ddb218-ce37-42ab-b2f3-433138df6489`.
- Scope/action: `single_site_improvement_implementation_authorization` / `start_single_site_improvement_implementation`.
- Subject type/id: `single_site_improvement_proposal_plan` / `f541075c-4641-4f70-b5ff-64a8af071571`.
- Decision status: `granted`.
- Replay contract/version: `single_site_implementation_authorization_semantic_replay` / `1`.
- Attached replay semantic watermark: `single-site-implementation-authorization:c90369e375923aee86e6b5f0f637901bd3cc9e24e071aaa41e605a674971aeb7`.
- Limitations: `[]`.

Readback confirmed the request, evidence, decision, policy evaluation, freshness check, request evidence link, and decision evidence link are present; request, decision, evidence, and freshness expiry are all `null`; request supersessions, decision supersessions, evidence supersessions, and revocations are all `0`.

## MVP-20 Validation

Read-only MVP-20 validation was run after attachment using `ImprovementExecutionAafValidator.validateImprovementExecutionAuthorization(...)`.

- Allowed: `true`.
- Mode: `allowed`.
- Reason code: `authorization_valid`.
- Blocker codes: `[]`.
- Freshness status: `fresh`.
- Proposal watermark matched: `true`.
- Selected recommendation watermark matched: `true`.
- Implementation scope watermark matched: `true`.
- Semantic watermark matched: `true`.
- Drifted roles: `[]`.
- `mutatesSourceTruth=false`.
- `nonExecuting=true`.

## Forbidden Downstream Counts

Forbidden downstream counts remained clean after attachment and readback:

| Scope | Before | After |
| --- | ---: | ---: |
| Improvement execution attempts | 0 | 0 |
| Improved candidate artifacts created by this step | 0 | 0 |
| Improved version reviews | 0 | 0 |
| Content approvals | 0 | 0 |
| Client approvals | 0 | 0 |
| Launch approvals | 0 | 0 |
| Launch readiness records | 0 | 0 |
| Publish operator actions | 0 | 0 |
| AAF gate attempts for proposal | 0 | 0 |
| Downstream AAF content/client/launch approval decisions | 0 | 0 |
| Runtime active pointers total | 6 | 6 |
| Selected runtime active pointers | 0 | 0 |
| Runtime active pointer fingerprint | `c4249459ce11b7737744aa3fc598a064` | `c4249459ce11b7737744aa3fc598a064` |

## Boundary

No improvement execution attempt, improved candidate site version, runtime artifact, improved review, content approval, client approval, launch approval, launch readiness, publish operator action workflow, publish dry-run, shadow-publish, runtime publish, rollback, active pointer mutation, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy/redeploy, migration, env mutation, commit, or push occurred.

## Validation

Validation completed:

- Exact fresh attachment approval sentence: present.
- Current proposal attached refs read back as old CUTLINE-37A refs before initial attachment.
- Fresh AAF request/evidence/decision replay readback: passed.
- Bridge validation for the fresh decision: `valid=true`, status `granted`.
- Existing safe workflow used: `ImprovementProposalPlanningService.attachImplementationAuthorizationRef(...)`.
- Attachment readback: `implementation_authorization_attached=true`; fresh request/decision/evidence refs populated.
- MVP-20 read-only validation: allowed with no blockers.
- Forbidden downstream count summary remained clean.
- Active pointer fingerprint unchanged.
- Online verification status set in docs/readback to `fresh_implementation_authorization_attached_pending_improvement_execution`.
- Initial sandbox run failed before database access because `tsx` IPC was blocked; the escalated runner first attached the refs, then a validation-wrapper fix supplied the required validator `tenantId` and the idempotent rerun confirmed the final state.
- `git diff --check`: passed.
- Trailing whitespace scan on changed docs/index files: passed.
- Changed-file scope: docs/index plus this CUTLINE-42 closeout; production mutation was limited to approved proposal ref/event attachment rows through the existing service.

## Recommended Next Milestone

MVP-CUTLINE-43 should request fresh explicit authorization for improvement execution using the fresh attached replay-backed implementation authorization refs, then stop after execution attempt/improved candidate readback unless a later prompt explicitly authorizes review, approval, launch readiness, dry-run, shadow-publish, runtime publish, provider mutation, deploy, migration, env, rollback, or active pointer changes.
