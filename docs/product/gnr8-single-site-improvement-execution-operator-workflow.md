# GNR8 Single-Site Improvement Execution Operator Workflow

Phase: MVP-19
Scope: Design-only future operator workflow

This document does not implement UI, routes, server actions, Command Center actions, Ops Inbox actions, client portal routes, runtime mutation, content edits, AI/provider calls, publish, rollback, billing, domain, DNS, commit, or push behavior.

## Future Operator Flow

1. Review the approved proposal plan.
2. Confirm selected recommendation ids, target scope, exclusions, risks, and limitations.
3. Review accepted clone review and source evidence limitations.
4. Verify an AAF implementation authorization request/decision/evidence package exists for the exact proposal plan.
5. Run future execution-time AAF validation before any implementation action.
6. Start future implementation execution only if validation returns allowed.
7. Review the generated improved candidate runtime version and artifact.
8. Compare the candidate against approved recommendations and non-goals.
9. Review carried limitations from source evidence, clone review, proposal approval, and implementation authorization.
10. Request revisions if candidate output misses scope, violates limitations, or introduces unapproved changes.
11. Accept improved version for later content approval only when candidate review passes.
12. Preserve evidence and audit refs for every decision.

## Operator Checklist

Before execution:

- proposal status is `approved` or `approved_with_limitations`;
- selected recommendations are explicit;
- source evidence review is accepted or accepted with limitations;
- clone review is accepted or accepted with limitations;
- clone source version and runtime artifact refs are present;
- AAF implementation authorization scope is exact;
- AAF decision is granted or granted with limitations;
- AAF evidence package is fresh and watermark-matched;
- actor permission, correlation id, and idempotency key are present.

After candidate creation:

- candidate version is new and non-production;
- active pointer did not change;
- publish did not run;
- content approval was not inferred;
- client approval was not inferred;
- launch approval was not inferred;
- publish approval was not inferred;
- limitations are visible;
- implementation diff/evidence refs are present.

## Review Outcomes

| Outcome | Meaning | Next stage |
| --- | --- | --- |
| Accept improved version | Candidate appears to satisfy approved implementation scope with limitations preserved | Content approval required later |
| Retry required | Candidate needs revision within the same approved scope | Retry after AAF freshness revalidation |
| Reject candidate | Candidate is unsuitable or out of scope | Proposal revision or implementation blocker |
| Blocked | Source/proposal/authorization/runtime refs are stale or invalid | Resolve source-owned blocker |

## Boundary Reminders

- Implementation authorization is permission to attempt implementation only.
- Improved version review is not content approval.
- Content approval is not client approval unless separately scoped.
- Content approval is not launch approval.
- Launch approval is not publish activation approval.
- Publish activation is never part of improvement execution.
- Command Center and Ops Inbox may show derived status only.
- AI/provider output is advisory evidence only.
