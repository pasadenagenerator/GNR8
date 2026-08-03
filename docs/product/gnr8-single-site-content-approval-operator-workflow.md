# GNR8 Single-Site Content Approval Operator Workflow

Phase: MVP-26
Scope: Documentation and architecture only.

## Purpose

This workflow describes how an operator should review content readiness for an accepted improved single-site candidate in a future implementation. It does not expose UI, actions, API routes, services, or persistence in MVP-26.

## Preconditions

The operator starts only when:

- latest improved version review is `accepted` or `accepted_with_limitations`;
- improved candidate site version ref is present;
- improved runtime artifact ref is present;
- proposal plan and proposal approval refs are present;
- implementation authorization and execution attempt refs are present;
- selected recommendation refs are present;
- clone review and source evidence review refs are present;
- limitations from prior stages are available.

If these are absent, content approval is not ready to review.

## Workflow

1. Inspect the accepted improved version review.

   Confirm the review status, reviewed candidate site version ref, reviewed runtime artifact ref, accepted limitations, findings, and recommendation application summary.

2. Inspect improved candidate rendering and content.

   Use preview/rendered snapshots as evidence, not as approval truth. Review visible page content, headings, body copy, calls to action, metadata title/description, alt text, internal links, and structured data where applicable.

3. Check recommendation coverage.

   Compare selected approved proposal recommendations against the improved candidate. Mark each recommendation reflected, partially reflected, not reflected, unsupported, deferred, or requiring manual limitation.

4. Check SEO/AEO and metadata.

   Review title, description, headings, content answerability, structured data, internal link labels, and metadata changes for acceptability within MVP scope.

5. Check accessibility, legal, compliance, brand, and locale caveats.

   Record alt text gaps, copy claims, legal/compliance notes, brand voice concerns, translation/locale issues, regulated language, and manual caveats.

6. Record findings.

   Findings use severity `p0_blocker`, `p1_major`, `p2_minor`, or `p3_note` and the MVP-26 category vocabulary. `p0_blocker` findings block approval unless resolved by a revised candidate.

7. Prepare AAF evidence.

   Evidence should include rendered/content snapshots, recommendation coverage, metadata summary, limitations, unsupported/not-applied recommendations, legal/compliance notes, operator notes, and audit timeline refs.

8. Request content approval.

   Request AAF approval under `single_site_content_approval` only. Do not request `content_publish`, `client_review`, `launch_signoff`, or `publish_activation` for this workflow.

9. Decide.

   Authorized reviewer grants, grants with limitations, rejects, requests changes, cancels, or records supersession according to policy and evidence freshness.

10. Carry limitations forward.

   If approved with limitations, limitations must be visible to later client/launch approval and publish-readiness work. They must not be collapsed into a generic approved flag.

11. Prepare later stage.

   Approved content can feed later client/launch approval work. It does not launch, publish, mutate runtime, or switch active pointer.

## Decision Outcomes

`approved`:

- visible content is acceptable;
- approved recommendations are reflected sufficiently or explicitly limited;
- content can move toward later client/launch approval;
- no runtime mutation or publish is authorized.

`approved_with_limitations`:

- content is acceptable only with recorded limitations;
- limitations must be carried forward to future evidence packages and read models;
- later approvals must see the limitations.

`changes_requested`:

- operator must revise content or candidate evidence;
- current workflow remains unapproved;
- runtime mutation is not implied.

`rejected`:

- content is not acceptable;
- revision or new candidate/review is required.

`superseded`:

- source refs changed or a newer candidate/review exists;
- latest candidate requires a new content approval.

## Existing Content Route Handling

Operators may use existing content reads and history as evidence input after future adapter work. They must not use existing content publish, rollback, override draft, runtime approve, runtime publish, or runtime rollback routes to express content approval.

Any future reuse of content editing routes requires a separate content revision milestone and explicit AAF/single-site gating.

## Do Not Do

- Do not call AI providers to rewrite content.
- Do not edit content as part of approval.
- Do not publish draft overrides.
- Do not activate runtime publish.
- Do not switch active pointer.
- Do not treat client feedback as GNR8 content approval unless a future bridge records it through the exact scope.
- Do not close Command Center/Ops Inbox work as source truth.

## Operator Checklist

- improved version review accepted or accepted with limitations;
- candidate site version and artifact refs match the reviewed evidence;
- rendered snapshot reviewed;
- content snapshot reviewed;
- recommendation coverage reviewed;
- metadata/SEO/AEO reviewed;
- accessibility and alt text caveats recorded;
- legal/compliance/manual notes recorded;
- limitations carried forward;
- unsupported/not-applied recommendations recorded;
- AAF request/evidence/decision refs present for final approval;
- no client/launch/publish/domain/billing/runtime approval inferred.
