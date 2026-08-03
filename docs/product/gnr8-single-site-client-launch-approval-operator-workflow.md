# GNR8 Single-Site Client And Launch Approval Operator Workflow

Phase: MVP-30
Scope: Documentation and architecture only.

This document describes the future operator workflow for client approval and launch approval. It does not implement UI, routes, APIs, server actions, persistence, AAF contracts, evidence builders, launch checklists, billing, domain/DNS, publish activation, runtime mutation, provider calls, AI calls, commits, or pushes.

## Operator Sequence

1. Confirm exact content approval.
2. Decide whether client approval is required by site/client/account policy.
3. Prepare client approval when required.
4. Record client approval outcome through future AAF-backed workflow.
5. Prepare launch approval after content approval and required client approval pass.
6. Record launch approval outcome through future AAF-backed workflow.
7. Proceed only to separate domain, billing, publish target, rollback, smoke/QA, and publish readiness work.
8. Leave publish activation approval for the separate PASR/AAF flow.

## Content Approval Check

The operator must confirm:

- latest content approval is `approved` or `approved_with_limitations`;
- AAF content approval decision is present and exact-scope validated;
- improved candidate site version and runtime artifact match the current candidate;
- limitations and not-applied/deferred recommendations are available for carry-forward.

If content approval is missing, rejected, changes requested, stale, superseded, cancelled, or invalid, client and launch approval work must not proceed.

## Client Approval Workflow

When client approval is required, the operator prepares:

- client/account-facing summary of the improved candidate;
- rendered snapshot of the candidate;
- content approval decision ref;
- limitations summary;
- unresolved/deferred recommendation summary;
- brand/business/legal/compliance notes where applicable;
- reviewer identity or internal representative identity;
- audit timeline refs.

Possible outcomes:

- `approved`: launch approval may begin.
- `approved_with_limitations`: launch approval may begin with limitations carried forward.
- `changes_requested`: launch approval is blocked until content or candidate work is revised or superseded.
- `rejected`: launch approval is blocked.
- `superseded`: latest approval is required.
- `cancelled`: no launch progression unless policy changes or a new approval is prepared.

## Launch Approval Workflow

The operator prepares launch approval after content approval and required client approval are acceptable.

The launch approval package should include:

- content approval decision;
- client approval decision if required;
- pre-launch checklist snapshot;
- blocker and limitation summary;
- domain readiness placeholder/ref where later available;
- billing/hosting entitlement placeholder/ref where later available;
- rollback readiness placeholder/ref where later available;
- publish target placeholder/ref where later available;
- smoke/QA summary refs where later available;
- operator launch notes;
- audit timeline refs.

Possible outcomes:

- `approved`: domain, billing, publish target, rollback, smoke/QA, and publish readiness work may proceed.
- `approved_with_limitations`: downstream readiness work may proceed with limitations carried forward.
- `blocked`: publish readiness remains blocked.
- `rejected`: publish readiness remains blocked.
- `superseded`: latest launch approval is required.
- `cancelled`: publish readiness remains blocked.

## Operator Surface Guidance

Future UI should make the four approval boundaries visible:

- content approval: content-facing acceptance of candidate content;
- client approval: business/client/account acceptance;
- launch approval: internal operational approval for final launch preparation;
- publish activation approval: separate PASR/AAF approval for pointer-changing publish activation.

Future UI should avoid action buttons that imply publication from client or launch approval. Approve buttons for client/launch approval should record those scoped decisions only.

## Handling Limitations

Limitations must be carried forward explicitly:

- improved version review limitations feed content approval;
- content approval limitations feed client approval and launch approval;
- client approval limitations feed launch approval;
- launch approval limitations feed domain/billing/publish readiness and publish activation evidence later.

The operator must not erase or summarize away limitations that were required to justify `approved_with_limitations`.

## Existing Surface Guidance

- Command Center can show derived readiness and next action.
- Ops Inbox can show derived exceptions.
- Client portal can later host review interactions.
- Runtime preview can provide rendered evidence.
- DDOM, billing, PTT, and PASR can provide readiness/evidence refs.

None of those surfaces owns client or launch approval truth unless future implementation records exact-scope AAF decisions and validated workflow rows.

## Stop Conditions

The operator must stop before downstream readiness work when:

- content approval is not current and approved;
- client approval is required but missing, rejected, changes requested, stale, superseded, cancelled, or invalid;
- launch approval is missing, blocked, rejected, stale, superseded, cancelled, or invalid;
- limitations required by prior stages are absent;
- refs do not match the current candidate;
- AAF validation fails.

The operator must stop before publish activation when:

- publish activation approval is missing or invalid;
- PASR/PTT/DDOM/billing/rollback readiness requirements fail;
- active pointer mutation would be attempted from client or launch approval alone.
