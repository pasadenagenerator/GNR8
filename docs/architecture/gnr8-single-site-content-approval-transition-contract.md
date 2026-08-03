# GNR8 Single-Site Content Approval Transition Contract

Phase: MVP-26
Scope: Documentation and architecture only.

## Purpose

This contract defines how content approval fits after MVP-25 improved version review and before future client, launch, domain, billing, hosting, publish activation, and rollback work.

## State Contract

Current single-site states already include:

- `improved_version_review_required`
- `improved_preview_ready`
- `content_review_required`
- `content_approved`
- later domain/commercial and launch/publish states

MVP-26 does not change these states. It defines how future content approval implementation should use them.

## Entry Conditions

Improved version review not accepted:

- content approval status: `not_required_yet` or blocked;
- migration must not move to content approval;
- required next action is improved version review, retry, rejection resolution, or supersession review.

Improved version review `accepted`:

- content approval status becomes `required`;
- content approval workflow may be created for the reviewed improved candidate refs;
- limitations may be empty but source refs remain required.

Improved version review `accepted_with_limitations`:

- content approval status becomes `required`;
- limitations must be carried into the content approval workflow and AAF evidence;
- approval can later be `approved_with_limitations` only if limitations remain visible and accepted.

## Workflow Transitions

| From | To | Meaning |
| --- | --- | --- |
| `not_required_yet` | `required` | Latest improved version review was accepted or accepted with limitations. |
| `required` | `draft` | Operator starts assembling reviewed refs, snapshots, findings, and AAF evidence. |
| `draft` | `ready_for_review` | Evidence and required refs are complete enough for approval review. |
| `ready_for_review` | `in_review` | Authorized reviewer begins review. |
| `in_review` | `changes_requested` | Content changes are required before approval. |
| `changes_requested` | `draft` | Revised candidate or evidence is being prepared. |
| `in_review` | `approved` | Content acceptable with no blocking limitations beyond recorded scope. |
| `in_review` | `approved_with_limitations` | Content acceptable only with explicit limitations carried forward. |
| `in_review` | `rejected` | Content is not acceptable; revision required. |
| any non-terminal current status | `superseded` | Candidate refs, improved version review, evidence, or policy changed. |
| any non-terminal current status | `cancelled` | Workflow ended without approval. |

## Single-Site State Transitions

`improved_version_review_required` or `improved_preview_ready` to `content_review_required`:

- allowed only when latest improved version review is `accepted` or `accepted_with_limitations`;
- requires an improved version review migration ref;
- does not imply content approval.

`content_review_required` to `content_approved`:

- allowed only when latest content approval workflow is `approved` or `approved_with_limitations`;
- requires a content approval migration ref;
- requires fresh AAF content approval decision refs unless policy explicitly records `not_required_by_policy`;
- must carry limitations if approved with limitations;
- does not publish.

`content_approved` to later client/launch/domain/commercial states:

- may begin only in future milestones;
- content approval is a prerequisite signal, not a substitute for those approvals.

## Decision Effects

`changes_requested`:

- content revision is required;
- if revision mutates runtime candidate content or creates a new candidate, current content approval is superseded;
- no client/launch/publish work should proceed on that candidate.

`approved`:

- later client/launch approval work may begin;
- no runtime mutation, active pointer change, publish activation, or content publish is authorized.

`approved_with_limitations`:

- later client/launch approval work may begin only with limitations carried forward;
- limitations must be visible to later evidence packages and read models;
- unresolved accepted limitations must not be silently dropped.

`rejected`:

- content revision is required;
- future workflow must reopen or supersede after a revised candidate/evidence set exists.

`superseded`:

- latest content approval is required for the current accepted improved candidate;
- historical decisions remain audit/evidence history only.

## Explicit Non-Effects

Content approval does not:

- approve the client-facing site;
- approve launch;
- approve domain, DNS, SSL, billing, subscription, or hosting activation;
- approve publish activation;
- publish content overrides;
- switch active pointer;
- mutate runtime artifacts;
- mutate site versions;
- expose public runtime output;
- remove rollback readiness requirements;
- complete Command Center or Ops Inbox work items as source truth.

## Staleness And Supersession

Future implementation must mark content approval stale or superseded when:

- improved version review is superseded;
- improved candidate site version or runtime artifact ref changes;
- runtime artifact/content watermark changes;
- proposal plan, proposal approval, selected recommendations, implementation authorization, execution attempt, clone review, source evidence review, or limitations change materially;
- AAF evidence becomes stale, partial, revoked, expired, or superseded;
- AAF decision is revoked, expired, cancelled, superseded, wrong-scope, or wrong-subject.

## Blocking Rules

Content approval must fail closed when:

- no accepted improved version review exists;
- required subject refs are missing;
- required evidence refs are missing or stale;
- unresolved `p0_blocker` findings exist;
- required proposal recommendations are not reflected and no explicit limitation/deferral exists;
- legal/compliance caveats are missing for known legal/compliance recommendations;
- AAF scope, subject, evidence type, policy, actor role, or decision status is invalid.
