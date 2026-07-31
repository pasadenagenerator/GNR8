# GNR8 Single-Site Improvement Execution Transition Contract

Phase: MVP-19
Scope: Design-only future state transition contract

This document does not implement transitions, services, repositories, SQL, routes, UI, workers, runtime mutation, AI/provider calls, content approval, client approval, launch approval, publish, rollback, billing, domain, DNS, commit, or push behavior.

## Transition Principles

- The single-site migration spine owns coarse operational state.
- Future improvement execution persistence owns execution attempts, items, refs, and result evidence.
- Runtime site versions/artifacts own candidate runtime truth.
- AAF owns approval/evidence/audit truth.
- Command Center and Ops Inbox are derived projections only.

Every transition must include actor, role, correlation id, idempotency key, before/after refs, required evidence refs, AAF refs where required, limitations, and audit refs.

## Future Transition Table

| From | To | Required source refs | Required AAF/evidence | Meaning |
| --- | --- | --- | --- | --- |
| `improvement_proposal_approved` | `implementation_authorization_required` | approved proposal plan, selected recommendation refs, accepted clone review refs | proposal approval refs | Proposal is approved, but no implementation may run yet. |
| `implementation_authorization_required` | `implementation_authorization_granted` | approved proposal plan and current clone/source refs | exact AAF decision/evidence for `single_site_improvement_implementation_authorization` | Authorization exists as source truth, but execution still must revalidate at runtime. |
| `implementation_authorization_granted` | `improvement_implementation_started` | proposal, selected recommendations, clone source version/artifact, source evidence | fresh execution-time AAF validation result | Candidate generation may start. No publish/content/client approval implied. |
| `improvement_implementation_started` | `improved_candidate_generation_in_progress` | execution attempt id, idempotency key | AAF validation result refs | Runtime candidate creation is in progress. |
| `improved_candidate_generation_in_progress` | `improvement_implementation_completed` | improved candidate site version, runtime artifact, execution result refs | execution evidence package/result refs | Candidate exists for review. This is not content approval. |
| `improved_candidate_generation_in_progress` | `improvement_implementation_failed` | attempt id, failure diagnostics | failure evidence/audit refs | No candidate or only failed partial refs. Retry requires revalidation. |
| `improvement_implementation_failed` | `implementation_authorization_granted` | failed attempt refs, retry plan | fresh/reused AAF grant if still valid | Retry may be prepared, but execution-time validation still required. |
| `improvement_implementation_failed` | `improvement_blocked` | failure refs, unsupported/scope drift refs | blocker evidence | Operator must resolve before retry. |
| `improvement_implementation_completed` | `improved_version_review_required` | improved candidate version/artifact, implementation diff | review evidence refs | Operator review of candidate output begins. |
| `improved_version_review_required` | `improved_version_review_accepted` | review decision, candidate refs, limitations | review evidence/audit refs | Candidate accepted for later content approval stage only. |
| `improved_version_review_required` | `improved_version_review_rejected` | review decision and reasons | review evidence/audit refs | Candidate not accepted; content approval is blocked. |
| `improved_version_review_required` | `improved_version_retry_required` | review findings and candidate refs | retry evidence/audit refs | Revision required before content approval. |
| `improved_version_review_accepted` | `content_approval_required` | accepted improved candidate review refs | content evidence package to be created later | Content approval is the next distinct stage. |

## Explicit Separations

- Implementation authorization does not mean content approved.
- Implementation started does not mean content approved.
- Implementation completed does not mean content approved.
- Improved version review accepted does not mean content approved.
- Content approval does not mean client approval unless explicitly scoped that way.
- Content approval does not mean launch approval.
- Launch approval does not mean publish approval.
- Publish activation approval is separate and required before active pointer mutation.
- Domain readiness is a prerequisite, not an approval.
- Subscription/hosting readiness is a prerequisite, not an approval.

## Forbidden Shortcuts

- No direct transition from proposal approval to implementation started without exact AAF authorization.
- No transition from implementation authorization attachment to mutation without execution-time revalidation.
- No transition from improved candidate completion to content approved.
- No transition from improved version review accepted to published.
- No active pointer mutation in any improvement execution transition.
- No content override publish in any improvement execution transition.
- No Command Center/Ops Inbox local state resolving canonical blockers.
- No AI/provider output directly creating canonical transitions.

## Retry And Supersession

Retry requires:

- previous attempt refs;
- root cause/failure evidence;
- same or new idempotency key according to retry semantics;
- revalidation of AAF;
- confirmation that proposal, selected recommendations, source evidence, clone review, and clone runtime artifact have not drifted.

Supersession is required when:

- proposal plan changes materially;
- selected recommendations change;
- clone review is superseded;
- source evidence review is superseded;
- clone runtime artifact/version changes;
- AAF authorization is revoked, expired, superseded, or scope-mismatched;
- implementation scope changes;
- policy version requires a new decision.
