# GNR8 Single-Site Improved Candidate Operator Workflow

Phase: MVP-22
Scope: Operator workflow for future improved candidate dry-run and execution review.

This is a product workflow document only. It does not expose UI, routes, server actions, Command Center actions, Ops Inbox actions, client portal routes, runtime mutation, content editing, AI generation, publish, rollback, commit, or push behavior.

## Workflow

1. Confirm proposal approval.
   The operator verifies that the proposal plan is approved or approved with limitations and that selected recommendation refs are explicit.

2. Confirm implementation authorization.
   The operator verifies that AAF implementation authorization exists for `single_site_improvement_implementation_authorization` and that limitations are understood.

3. Run execution-time validation.
   MVP-20 validation must run against current proposal, clone, source evidence, selected recommendation, and authorization refs.

4. Run dry-run.
   MVP-23 dry-run should inspect the accepted clone version/artifact, selected recommendations, WU/VCU/CGP/source evidence refs, and compute the planned change set without writes.

5. Review planned changes.
   The operator reviews applied recommendations, unsupported recommendations, warnings, limitations, expected output refs, and no-write proof.

6. Resolve unsupported recommendations.
   The operator either adds deterministic/manual mappings, defers recommendations, narrows scope, refreshes authorization, or records limitations.

7. Approve future execution attempt.
   A later milestone may allow an operator to approve execution after dry-run review. This is not content approval, client approval, launch approval, or publish approval.

8. Run execute in a future milestone.
   MVP-24 may create a new non-published improved candidate site version/artifact only after immediate revalidation.

9. Review improved candidate.
   The candidate goes to improved version review. The operator checks whether selected recommendations were implemented, unsupported items were preserved, and limitations remain visible.

10. Preserve evidence and limitations.
   All proposal, authorization, clone, source evidence, WU/VCU/CGP, planned change, output, warning, and limitation refs remain attached to the execution attempt.

## Operator Decisions

The operator may:

- choose selected recommendation refs from an approved proposal;
- provide exact deterministic replacement copy or metadata values;
- provide approved replacement asset refs when source/licensing evidence exists;
- mark recommendations as deferred/manual;
- request refreshed AAF validation;
- stop execution when dry-run exposes drift or unsupported scope.

The operator may not:

- treat dry-run as approval to mutate runtime;
- treat implementation authorization as content approval;
- treat improved candidate creation as client, launch, or publish approval;
- use Generated Proposal Bundle output as runtime truth;
- bypass MVP-20 validation;
- call AI/provider execution as a shortcut;
- mutate active pointer or publish.

## Review Checklist

- Proposal approval refs present.
- Implementation authorization refs present.
- MVP-20 validation allowed and fresh.
- Clone review accepted or accepted with limitations.
- Source evidence review accepted or accepted with limitations.
- Clone site version and clone artifact refs match expected watermarks.
- Selected recommendations have stable refs and statuses.
- Recommendation-to-change mapping is deterministic or explicitly not applied.
- WU/VCU/CGP/source evidence refs are preserved where used.
- Generated Proposal Bundle refs are advisory only.
- No-write proof is present for dry-run.
- Non-approval flags are all false.
- Limitations are carried forward.

## Escalation And Repair

Repair paths:

- refresh stale AAF validation;
- refresh selected recommendation refs;
- resolve clone/source evidence drift;
- add operator-authored deterministic mappings;
- add asset source/licensing evidence;
- defer unsupported recommendations;
- create a new execution attempt if semantic input changes.

Blocking paths:

- authorization missing, stale, wrong-scope, or substituted;
- clone/source evidence rejected or drifted;
- active pointer mutation requested;
- publish, rollback, domain, billing, provider, AI, or Generated Proposal Bundle creation requested;
- content/client/launch/publish approval substitution attempted.

## Next Milestone

The next safe milestone is MVP-23 improved candidate dry-run adapter core. It should give operators a concrete no-write plan before any real improved runtime version/artifact mutation exists.
