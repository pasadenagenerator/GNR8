# GNR8 Single-Site MVP CUTLINE-48 Client Approval

Date: 2026-08-21
Site: `chs.si`
Scope: client approval request, evidence, AAF decision, service decision, and readback only. Stopped before launch approval, launch readiness, publish activation, dry-run, shadow-publish, runtime publish, rollback, and active pointer mutation.

## Result

CUTLINE-48 succeeded. Fresh human approval was present, and client approval was granted with limitations for the CUTLINE-47 content-approved improved candidate.

- Exact approval sentence present: yes.
- Workflow path used: `ClientApprovalService.createOrReuseClientApproval(...)` -> `SingleSiteClientApprovalAafBridge.prepareClientApprovalRequest(...)` -> `AafWriterRepository.createApprovalDecisionTransaction(...)` -> `SingleSiteClientApprovalAafBridge.validateClientApprovalDecisionRef(...)` -> `ClientApprovalService.attachAafRequestRef(...)` -> `ClientApprovalService.attachAafDecisionRef(...)` -> `ClientApprovalService.markReadyForReview(...)` -> `ClientApprovalService.startReview(...)` -> `ClientApprovalService.approveWithLimitations(...)`.
- Client approval id: `f764ee08-b912-458f-a25e-a26d2921ef7c`.
- Client approval status/decision: `approved_with_limitations` / `approve_with_limitations`.
- AAF client approval request id: `9c4597b0-9706-478c-b4da-5a02a82da0dd`.
- AAF client approval decision id: `b8001dfa-0d8e-40be-bdc3-18544530a0e9`.
- AAF evidence package id: `2d41f7ea-2f76-4982-bcf6-65310e9d9589`.
- Decision evidence link id: `a8b019b5-59f6-42c0-9dff-d517b2693589`.
- Request audit event id: `25506ccf-933e-4c7b-8ce9-ebbf1d57a957`.
- Decision audit event id: `adb2decb-23af-4dc0-aa5b-97063be03d9e`.
- Client approval service decision event id: `e9d4ba66-041f-40de-877b-3a72b9cee60e`.
- Online verification status after this task: `client_approval_granted_with_limitations_pending_launch_approval_no_publish`.

## Preflight

Initial read-only production preflight confirmed:

- Content approval `319c360a-d7d4-4a3e-9c3b-6daecd930e02` existed and was `approved_with_limitations` / `approve_with_limitations`.
- Content approval AAF decision `67ec5313-a122-456c-8476-7abd9fb772e5` was `granted_with_limitations`, linked to request `437e05f9-df87-4bb7-8478-466495c06fd1` and evidence package `dca2c91e-3449-4ec9-aba9-833f22ccccf8`.
- Improved candidate chain matched migration `682a09fd-8fd5-4f73-93b8-54f5d4067c63`, client `e61d1982-068f-4d84-bb6f-c3fbfc93f39b`, site `a03fcb5b-6ad9-4b19-a682-4c06f998881a`, proposal `f541075c-4641-4f70-b5ff-64a8af071571`, execution attempt `6dc259c1-b659-4d64-95f2-3858803eb470`, review `bc642626-1242-427a-96ed-8003b881e71c`, site version `a3f9493e-9da4-4ef8-8608-154fe6d25a0f`, and artifact `1f80138a-39c2-4210-ac61-16200e5a2254`.
- No client approval request/decision already existed for the candidate.
- No launch approval, launch readiness, publish activation, publish operator action, AAF gate attempt, or runtime active pointer existed for this candidate.
- Active pointers before: total `6`, selected runtime site `0`, selected site `0`, candidate refs `0`.

## Limitations Carried Forward

Unique accepted limitation set carried forward:

- `0be61bde-6568-4f33-8499-4d5eade70837`: `unsupported_in_mvp`; make contact actions more prominent.
- `73de9484-1461-4476-b677-f41d7a839df7`: `requires_operator_input`; add trust signals and SEO structure.
- `86342f67-7cce-43de-823f-ea0f4adc1a41`: `requires_operator_input`; clarify service positioning copy.
- `a61e857e-89c1-4ab1-bdc1-581a24e824c1`: `unsupported_in_mvp`; tighten mobile layout hierarchy.

No client-facing endorsement beyond the internal MVP rehearsal scope was created. No applied content changes were invented.

Readback warning: the final persisted client approval `limitations_json` contains `32` rows because the earlier CUTLINE-47 repeated limitation JSON was carried through MVP-33 bridge validation and service merge behavior. The unique set remains the four accepted limitations above.

## Readback

Final read-only production readback confirmed:

- AAF request scope/subject/status/policy: `single_site_client_approval` / `single_site_improved_candidate_client_acceptance` / `requested` / `MVP-33`.
- AAF decision status/policy: `granted_with_limitations` / `MVP-33`.
- AAF evidence package type/status/freshness: `single_site_client_approval_evidence` / `created` / `fresh`.
- AAF validation: `valid=true`, status `granted_with_limitations`, blocker codes `[]`.
- AAF evidence semantic watermark: `single-site-client-approval:7ac1d34a501d7168963902ba789a72f9329824eee69ef8a51c5a7e22d4e1c45b`.
- Client approval semantic watermark: `single-site-client-approval:45ac074559fc338eeb56cbc283e2e8feac93756aec2794a9cd2ac8774af1e327`.
- Client approval refs include the AAF request, AAF decision, AAF evidence package, content approval, content AAF decision, improved version review, improved candidate site version/artifact, proposal plan, proposal approval, implementation authorization, execution attempt, reviewer identity/role, and four selected recommendations.
- Client approval findings: four `accepted_limitation` findings, one per carried-forward recommendation.
- Migration state after approval: `client_approval_required`; stage `improvement_content`.
- Launch approval eligibility next: `ready=true`, missing requirements `[]`, client approval id `f764ee08-b912-458f-a25e-a26d2921ef7c`.

## Forbidden Downstream Readback

Final read-only production counts:

| Scope | Count |
| --- | ---: |
| Launch approvals | 0 |
| Launch readiness records | 0 |
| Publish activation requests | 0 |
| Publish activation decisions | 0 |
| Launch approval AAF requests | 0 |
| Launch approval AAF decisions | 0 |
| Downstream AAF gate attempts | 0 |
| Forbidden migration refs | 0 |
| Runtime active pointers total | 6 |
| Selected runtime site active pointers | 0 |
| Selected site active pointers | 0 |
| Candidate version/artifact active pointer refs | 0 |

## Boundary

No launch approval request/decision, launch readiness record, publish activation request/decision/gate, dry-run, shadow-publish, runtime publish, rollback, active pointer switch, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy, migration, env mutation, commit, or push occurred.

Temporary runners were kept outside the repo under `/private/tmp`; no temp runner was left in the repository.

## Validation

- Production preflight: read-only transaction.
- Client approval mutation: existing client approval service, AAF bridge, and AAF writer only.
- Final production DB readback: read-only transaction.
- Blockers: none.
- Warnings: `MVP_CONTINUATION_WITH_UNAPPLIED_RECOMMENDATIONS`; repeated persisted limitation entries as noted above.
- Commit/push/deploy: none.
