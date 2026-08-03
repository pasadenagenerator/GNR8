# GNR8 Single-Site Content Approval AAF Scope Design

Phase: MVP-26
Scope: Documentation and architecture only.

## Recommendation

Add a dedicated AAF scope:

`single_site_content_approval`

Recommended evidence package type:

`single_site_content_approval_evidence`

Recommended subject type:

`single_site_improved_version_review`

Recommended allowed action:

`approve_single_site_content`

Recommended replay class:

`not_replayable`

This scope must be separate from existing `content_publish`, `client_review`, `launch_signoff`, and `publish_activation` scopes. Content approval is a content-readiness decision for an accepted improved candidate, not a content publish action, client decision, launch signoff, or active pointer/publish activation gate.

## Required Subject Refs

AAF request, evidence, decision, and gate validation must bind to these refs:

| Ref | Required | Purpose |
| --- | --- | --- |
| tenant id | Yes | Tenant boundary and policy scope. |
| client id | Yes | Client/account boundary. |
| site id | Yes | Site boundary. |
| single-site migration id | Yes | Migration state spine. |
| improved version review id | Yes | Prerequisite accepted review. |
| improved version review status | Yes | Must be `accepted` or `accepted_with_limitations`. |
| improved version review watermark | Yes | Blocks stale approval after review changes. |
| improved candidate site version ref | Yes | Candidate being reviewed. |
| improved candidate site version watermark | Yes when available | Blocks stale approval after candidate version changes. |
| improved runtime artifact ref | Yes | Candidate artifact being reviewed. |
| improved runtime artifact hash/watermark | Yes when available | Blocks stale approval after artifact/content changes. |
| proposal plan id | Yes | Approved proposal source. |
| proposal approval decision id | Yes | Shows proposal approval is separate and prior. |
| implementation authorization decision id | Yes | Shows implementation authorization is separate and prior. |
| execution attempt id | Yes | Binds content approval to produced output. |
| selected recommendation refs | Yes | Defines expected content changes. |
| selected recommendation watermarks | Yes | Blocks stale approval after recommendation drift. |
| source evidence review id | Yes | Binds content to accepted source evidence. |
| clone review id | Yes | Carries baseline fidelity and limitations. |
| clone site version ref | Yes | Baseline clone candidate. |
| clone runtime artifact ref | Yes | Baseline clone artifact. |
| limitations refs | Yes when present | Carries accepted caveats and exceptions. |

## Required Evidence Refs

The evidence package must include refs or immutable snapshots for:

- improved candidate rendered snapshot;
- improved candidate content snapshot;
- improved candidate metadata snapshot;
- recommendation coverage summary;
- selected recommendation ids and application status;
- unsupported/not-applied recommendation list;
- SEO/AEO metadata summary;
- headings/body copy/CTA/internal link review summary;
- alt text and accessibility/content caveats;
- structured data summary where applicable;
- legal/compliance notes;
- brand voice/manual copy notes;
- known limitations from source evidence review, clone review, proposal planning, implementation authorization, execution, and improved version review;
- operator review notes;
- audit timeline refs.

Heavy artifacts should be stored by object ref, hash, source system, source version, and watermark rather than embedded in AAF rows.

## Allowed Decisions

Recommended AAF decision statuses for this scope:

- `granted`
- `granted_with_limitations`
- `rejected`
- `revoked`
- `expired`
- `superseded`
- `cancelled`
- `not_required_by_policy` only if a future policy explicitly permits it for an exact low-risk case

Product mapping:

- `granted` maps to content approval `approved`;
- `granted_with_limitations` maps to content approval `approved_with_limitations`;
- `rejected` maps to content approval `rejected`;
- revoked/expired/superseded/cancelled block readiness and require a new workflow or decision.

## Prohibited Actions

This scope must prohibit:

- content publish;
- client approval;
- launch signoff;
- publish activation;
- active pointer mutation;
- public runtime publication;
- runtime artifact mutation;
- site version mutation;
- domain/DNS/SSL readiness or mutation;
- billing/subscription/hosting activation;
- rollback or recovery approval;
- provider execution;
- AI approval or AI execution;
- Command Center or Ops Inbox canonical resolution.

## Freshness Rules

The content approval decision is valid only while:

- the improved version review remains latest and accepted or accepted with limitations;
- reviewed candidate site version and runtime artifact refs match current single-site workflow refs;
- reviewed artifact/content watermarks match the evidence package;
- selected recommendations still belong to the approved proposal plan;
- recommendation application coverage has not changed;
- limitations have not changed materially;
- AAF evidence package is fresh and not superseded;
- AAF decision is not expired, revoked, cancelled, or superseded;
- policy version is effective or explicitly accepted by policy evaluation;
- audit write path remains available.

Recommended maximum validity window:

- 24 hours for normal content/copy/metadata review;
- 8 hours for legal/compliance, forms/leads, regulated claims, translation/locale, or high-risk SEO/AEO changes;
- immediate supersession on candidate/artifact/ref/watermark drift.

## Gate Behavior

Future content approval service should ask AAF for a non-executing gate evaluation before projecting approval readiness.

Allowed:

- exact scope `single_site_content_approval`;
- exact subject refs;
- required evidence type `single_site_content_approval_evidence`;
- effective `granted` or `granted_with_limitations` decision;
- explicit `not_required_by_policy` only with exact policy support.

Blocking:

- approval required;
- wrong scope;
- wrong subject;
- wrong evidence type;
- evidence missing/stale/superseded;
- approval stale/superseded/revoked/expired/cancelled;
- missing limitations for limited grant;
- policy error;
- audit unavailable;
- fail closed.

## MVP-27 Scope Work

MVP-27 should update AAF contracts and SQL check constraints for:

- approval scope `single_site_content_approval`;
- evidence package type `single_site_content_approval_evidence`;
- prohibited action mapping;
- replay class;
- contract tests proving this scope does not satisfy content publish, client review, launch signoff, or publish activation.

MVP-27 must not create approval records or single-site content approval persistence.
