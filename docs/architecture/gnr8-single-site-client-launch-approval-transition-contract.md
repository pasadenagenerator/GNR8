# GNR8 Single-Site Client And Launch Approval Transition Contract

Phase: MVP-30
Scope: Documentation and architecture only.

This contract defines future state transitions after content approval and before domain/billing/publish readiness. It does not implement transition code, SQL, services, AAF scopes, routes, UI, runtime mutation, publish activation, domain/DNS, billing, rollback, commits, or pushes.

## Approval Boundary Order

The intended logical order is:

1. Improved candidate creation.
2. Improved version review acceptance.
3. Content approval.
4. Client approval when policy requires it.
5. Launch approval.
6. Domain, billing, publish target, rollback, smoke/QA, and publish readiness checks.
7. Publish activation approval.
8. Publish activation attempt.

Each stage must cite exact refs from prior stages. No stage may silently substitute for another approval scope.

## Required Transitions

| Source State Or Decision | Future Transition | Required Behavior |
| --- | --- | --- |
| Content approval missing | Client approval `not_required_yet` or blocked | Client approval cannot begin without content approval policy determining requirement. |
| Content approval `changes_requested`, `rejected`, `cancelled`, `superseded`, stale, or invalid | Client approval blocked | Latest approved content approval required. |
| Content approval `approved` | Client approval `required` when policy requires client acceptance | Client approval can be drafted/requested for exact candidate refs. |
| Content approval `approved` and client approval not required | Launch approval `required` | Launch approval can begin, citing policy reason for skipped client approval. |
| Content approval `approved_with_limitations` | Client/launch approval required with limitations | Limitations must be preserved as subject/evidence refs. |
| Client approval `changes_requested` | Launch approval blocked | Candidate/client-facing issues must be resolved or superseded. |
| Client approval `rejected` | Launch approval blocked | Launch approval cannot proceed. |
| Client approval `cancelled` | Launch approval blocked when client approval required | New approval or policy not-required decision needed. |
| Client approval `superseded` | Latest client approval required | Prior approval cannot authorize launch. |
| Client approval `approved` | Launch approval may begin | Launch approval cites client approval decision. |
| Client approval `approved_with_limitations` | Launch approval may begin with limitations | Launch approval evidence must include limitation carry-forward. |
| Launch approval missing | Publish readiness blocked | Future `publish_ready` cannot be reached without launch approval ref where policy requires it. |
| Launch approval `blocked` | Publish readiness blocked | Blockers must be resolved or accepted under policy. |
| Launch approval `rejected` | Publish readiness blocked | New approval or remediation required. |
| Launch approval `cancelled` | Publish readiness blocked | Latest approval required. |
| Launch approval `superseded` | Latest launch approval required | Prior approval cannot support readiness. |
| Launch approval `approved` | Domain/billing/publish readiness work may proceed | No publish, active pointer, or runtime mutation occurs. |
| Launch approval `approved_with_limitations` | Domain/billing/publish readiness may proceed with limitations | Limitations must carry into downstream readiness and publish activation evidence. |

## Explicit Non-Transitions

- Client approval does not publish.
- Client approval does not mutate active pointer.
- Client approval does not mutate runtime artifact or site version.
- Client approval does not equal content approval.
- Client approval does not equal launch approval.
- Client approval does not equal publish activation approval.
- Launch approval does not publish.
- Launch approval does not mutate active pointer.
- Launch approval does not mutate runtime artifact or site version.
- Launch approval does not equal domain readiness.
- Launch approval does not equal billing readiness.
- Launch approval does not equal publish target readiness.
- Launch approval does not equal rollback readiness.
- Launch approval does not equal publish activation approval.
- Domain readiness does not equal launch approval.
- Billing readiness does not equal launch approval.
- Publish activation approval remains separate.

## Policy Branches

Client approval required:

- content approval approved -> client approval required;
- client approval approved -> launch approval required;
- launch approval approved -> downstream readiness work may proceed.

Client approval not required:

- content approval approved -> launch approval required with policy evidence explaining why client approval is not required;
- launch approval approved -> downstream readiness work may proceed.

Content approval with limitations:

- limitations must be shown in client approval evidence if client approval is required;
- limitations must be shown in launch approval evidence whether or not client approval is required;
- downstream publish activation evidence must cite accepted limitations.

## Supersession Triggers

Client and launch approval should be superseded when any material subject ref or policy changes:

- improved candidate site version or runtime artifact changes;
- content approval is superseded or revoked;
- selected recommendation set changes;
- proposal approval, implementation authorization, or execution attempt refs change;
- limitations are added, removed, or materially changed;
- client requirement policy changes;
- reviewer/representative scope changes;
- launch checklist policy changes;
- publish target, domain readiness, billing readiness, or rollback readiness policy changes that were cited as approval evidence;
- AAF policy version, evidence package, or approval request changes.

## Read Model Expectations

Read models may expose:

- next action such as `prepare_client_approval`, `prepare_launch_approval`, `resolve_client_changes`, `resolve_launch_blockers`, or `prepare_domain_billing_publish_readiness`;
- readiness blockers and limitation carry-forward;
- AAF request/decision refs when visible to the actor;
- derived labels only.

Read models may not create approvals, imply approval from labels, trigger domain/billing/publish work, or mutate runtime state.
