# GNR8 Single-Site MVP CUTLINE-47 Content Approval

Date: 2026-08-21
Site: `chs.si`
Scope: content approval request, evidence, AAF decision, service decision, and readback only. Stopped before client approval, launch approval, launch readiness, dry-run, shadow-publish, runtime publish, rollback, and active pointer mutation.

## Result

CUTLINE-47 succeeded. Fresh human approval was present, and content approval was granted with limitations for the CUTLINE-45A/CUTLINE-46 accepted improved candidate.

- Exact approval sentence present: yes.
- Workflow path used: `ContentApprovalService.createOrReuseContentApproval(...)` -> `SingleSiteContentApprovalAafBridge.prepareContentApprovalRequest(...)` -> `AafWriterRepository.createApprovalDecisionTransaction(...)` -> `SingleSiteContentApprovalAafBridge.validateContentApprovalDecisionRef(...)` -> `ContentApprovalService.attachAafRequestRef(...)` -> `ContentApprovalService.attachAafDecisionRef(...)` -> `ContentApprovalService.approveWithLimitations(...)`.
- Content approval id: `319c360a-d7d4-4a3e-9c3b-6daecd930e02`.
- Content approval status/decision: `approved_with_limitations` / `approve_with_limitations`.
- AAF content approval request id: `437e05f9-df87-4bb7-8478-466495c06fd1`.
- AAF content approval decision id: `67ec5313-a122-456c-8476-7abd9fb772e5`.
- AAF evidence package id: `dca2c91e-3449-4ec9-aba9-833f22ccccf8`.
- Decision evidence link id: `2594e39f-29bb-4469-8655-47fe2b38f7b1`.
- Request audit event id: `5d1a40bd-20fc-4df0-9979-5c770021efb9`.
- Decision audit event id: `fd6445aa-69aa-4fae-a269-0b091d9f3134`.
- Content approval service decision event id: `1b54da3c-5cd5-430b-91fb-61177f92a506`.
- Online verification status after this task: `content_approval_granted_with_limitations_pending_client_approval_no_publish`.

## Preflight

Initial read-only production preflight confirmed:

- Improved version review `bc642626-1242-427a-96ed-8003b881e71c` existed for migration `682a09fd-8fd5-4f73-93b8-54f5d4067c63`, client `e61d1982-068f-4d84-bb6f-c3fbfc93f39b`, and site `a03fcb5b-6ad9-4b19-a682-4c06f998881a`.
- Review decision/status was `accept_with_limitations` / `accepted_with_limitations`.
- Execution attempt `6dc259c1-b659-4d64-95f2-3858803eb470` existed and was `completed_with_limitations`.
- Improved candidate site version `a3f9493e-9da4-4ef8-8608-154fe6d25a0f` existed as `DRAFT`.
- Improved runtime artifact `1f80138a-39c2-4210-ac61-16200e5a2254` existed, belonged to the candidate site version, and had `publish_stage=shadow`.
- Runtime site id was `site_57d9665a3a5867edf6ef`.
- The four CUTLINE-46 accepted limitations were present on the improved review.
- No non-idempotent content approval existed for the improved review before the first write.
- Active pointers before: total `6`, selected runtime site `0`, candidate refs `0`.
- Forbidden downstream counts before: client approvals `0`, launch approvals `0`, launch readiness records `0`, publish operator actions `0`, downstream AAF requests/decisions/gates `0`, publish activation requests/decisions `0`.

## Limitations Carried Forward

Unique accepted limitation set carried forward:

- `0be61bde-6568-4f33-8499-4d5eade70837`: `unsupported_in_mvp`; make contact actions more prominent.
- `73de9484-1461-4476-b677-f41d7a839df7`: `requires_operator_input`; add trust signals and SEO structure.
- `86342f67-7cce-43de-823f-ea0f4adc1a41`: `requires_operator_input`; clarify service positioning copy.
- `a61e857e-89c1-4ab1-bdc1-581a24e824c1`: `unsupported_in_mvp`; tighten mobile layout hierarchy.

No applied content changes were invented. The approval records that these recommendations remain not applied and are accepted limitations for MVP continuation.

Readback warning: the persisted `limitations_json` currently repeats the same four unique limitations because the MVP-29 bridge validation carried prior limitations and the service approval merge also preserved the supplied limitation list. The unique set matches CUTLINE-46; no additional recommendation or applied-change claim was introduced.

## Readback

Final read-only production readback confirmed:

- AAF request scope/subject/status/policy: `single_site_content_approval` / `single_site_improved_version_review` / `requested` / `MVP-29`.
- AAF decision status/policy: `granted_with_limitations` / `MVP-29`.
- AAF evidence package type/status/freshness: `single_site_content_approval_evidence` / `created` / `fresh`.
- AAF validation: `valid=true`, status `granted_with_limitations`, blocker codes `[]`.
- Content approval semantic watermark: `single-site-content-approval:b495dd85ec01335ab24ed2fa710f7c04f338724f1acb8ea5f18e810123414519`.
- AAF evidence semantic watermark: `single-site-content-approval:5507cbc4cff4acbd2c3cc8c161fc1668df640465e1e2006f5663b2e1b3c756fb`.
- Content approval refs include the AAF request, AAF decision, AAF evidence package, improved version review, improved candidate site version/artifact, proposal plan, proposal approval, implementation authorization, execution attempt, source evidence review, clone review, clone version/artifact, and four selected recommendations.
- Content approval findings: four `accepted_limitation` findings, one per carried-forward recommendation.
- Migration state after approval: `content_approved`; stage `improvement_content`.
- Client approval eligibility next: `ready=true`, missing requirements `[]`, content approval id `319c360a-d7d4-4a3e-9c3b-6daecd930e02`.

## Forbidden Downstream Readback

Final read-only production counts:

| Scope | Count |
| --- | ---: |
| Client approvals | 0 |
| Launch approvals | 0 |
| Launch readiness records | 0 |
| Publish operator actions | 0 |
| Downstream AAF approval requests | 0 |
| Downstream AAF approval decisions | 0 |
| Downstream AAF gate attempts | 0 |
| Publish activation requests | 0 |
| Publish activation decisions | 0 |
| Runtime active pointers total | 6 |
| Selected runtime site active pointers | 0 |
| Candidate version/artifact active pointer refs | 0 |

## Boundary

No client approval request/decision, launch approval request/decision, launch readiness record, publish activation request/decision/gate, dry-run, shadow-publish, runtime publish, rollback, active pointer switch, provider/DNS/domain/billing/Stripe/Openprovider mutation, deploy, migration, env mutation, commit, or push occurred.

Temporary runners were kept outside the repo under `/private/tmp`; no temp runner was left in the repository.

## Validation

- Production preflight: read-only transaction.
- Content approval mutation: existing content approval service, AAF bridge, and AAF writer only.
- Final production DB readback: read-only transaction.
- Blockers: none.
- Warnings: `MVP_CONTINUATION_WITH_UNAPPLIED_RECOMMENDATIONS`; repeated persisted limitation entries as noted above.
- Commit/push/deploy: none.
