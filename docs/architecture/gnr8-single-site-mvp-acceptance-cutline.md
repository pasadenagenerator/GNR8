# GNR8 Single-Site MVP Acceptance Cutline

Date: 2026-08-13
Phase: MVP-CUTLINE-1
Scope: Documentation and audit only.

This cutline defines the shortest safe acceptance boundary for a real one-site-at-a-time internal MVP. It intentionally stops further diagnostic/governance expansion until the current foundations are driven through one complete operator path and then through a 20-site validation set.

## Decision

The single-site MVP is not another readiness snapshot, panel refinement, approval subdivision, AAF scope expansion, or diagnostic persistence layer.

The MVP is accepted only when an internal operator can run one real site through:

1. import/capture,
2. source evidence review,
3. near-1:1 clone generation,
4. clone review and acceptance,
5. improvement proposal definition and approval,
6. improved candidate generation,
7. improved version/content/client/launch approval as applicable,
8. launch readiness review for domain, billing, hosting, publish target, smoke QA, and rollback,
9. governed dry-run and shadow-publish,
10. online verification of the published improved site,
11. repeatable one-site-at-a-time validation across 20 sites.

The MVP can use explicit, logged internal bypasses where source truth is not yet automated, but the bypass must be visible, scoped to one site, and recorded as validation debt. Silent missing truth is not acceptable.

## MVP Must-Have

| Area | Acceptance criteria |
| --- | --- |
| Single-site import | A real public source URL can be captured under a selected tenant/client/site; the operator can identify the source URL, capture result, runtime site/version refs, rendered DOM/screenshot/raw asset refs when available, diagnostics, limitations, and the migration id. |
| Source evidence review | Source evidence completeness is accepted, accepted with limitations, rejected, or retry-required before clone generation. The operator can see source-owned refs and missing/degraded evidence without reading raw tables. |
| Clone fidelity | A non-published clone candidate is generated from accepted source evidence, previewable, lineage-linked to source refs, and reviewed with a clear accept/accept-with-limitations/retry/reject decision. |
| Improvement candidate creation | Approved improvement recommendations can produce a non-published improved runtime candidate from the accepted clone. The output must list applied and not-applied recommendations, limitations, watermarks, and clone/proposal/execution refs. |
| Approval boundaries | Proposal approval, implementation authorization, improved version acceptance, content approval, client approval when required, launch approval, and publish activation approval remain distinct. No approval can silently satisfy another approval scope. |
| Publish readiness | Launch readiness reads or records content approval, client approval policy, improved candidate, publish target truth, domain/DDOM evidence or explicit exception, billing subscription truth or explicit MVP bypass, hosting entitlement truth or explicit MVP bypass, rollback readiness, preview smoke QA, limitations, and audit refs. |
| Publish/shadow-publish path | A platform superadmin can run the internal dry-run and, when explicitly enabled, shadow-publish for the exact tenant/client/site/migration/candidate/artifact/target/request/decision/gate refs. Shadow-publish may use existing publish orchestration, but it must be explicit, auditable, and non-autonomous. |
| Online verification | After deploy and migrations, one seeded real site must be verified online through the operator route and the public/intended target. Verification must check preview, dry-run result, shadow-publish result, active pointer/public render, SSL/domain behavior where applicable, key routes, forms/widgets/external links, metadata, and rollback target evidence. |
| 20-site validation | A 20-site runbook or harness records per-site inputs, steps, decisions, metrics, blockers, exception approvals, outcomes, published verification, rollback readiness, and closeout. At least 18 of 20 should complete or have categorized no-go evidence before broader claims. |
| Operator visibility | The operator needs one minimal action-oriented surface or runbook-backed internal route sequence from import to publish. Read-only diagnostics alone are insufficient; the surface must tell the operator the next allowed action and expose the exact refs required to invoke it. |

## MVP Should-Have

| Area | Criteria |
| --- | --- |
| Better operator ergonomics | A compact Command Center workflow is preferable to raw API calls, but raw internal routes plus a precise runbook are acceptable for the first internal MVP if they are visible and repeatable. |
| Billing/hosting automation | Automated Stripe or checkout handling is useful, but an internal manual attestation/bypass policy is acceptable for MVP if it is explicit and not represented as real external billing truth. |
| Domain automation | Automated DNS/registrar/provider mutation is not required. Manual DNS instructions plus DDOM/current evidence or explicit exception are acceptable. |
| Blocking enforcement | Full production publish blocking is useful later. For MVP, shadow-publish with explicit human confirmation and post-publish verification is acceptable if no autonomous publish is allowed. |
| Rollback rehearsal | An actual rollback rehearsal is better than static readiness, but a documented recovery target/plan is acceptable for the first validation pass if the site is internally controlled. |
| Aggregate dashboard | A dashboard is useful, but a structured validation log/checklist can be sufficient until 20-site results show what to automate. |

## Explicitly Deferred

| Deferred work | Reason |
| --- | --- |
| More diagnostic snapshot persistence, snapshot history, and diff baselines | This observes readiness but does not move a site through the workflow. Return after first online shadow-publish and before polished demo/operations hardening. |
| More read-only Command Center polish | Existing read-only panel/runbook/snapshot/diff is enough for diagnosis. The next need is action flow. |
| Additional AAF scopes or approval subdivisions | Current scopes are already numerous. More scopes risk hiding the real missing orchestration path. |
| Ops Inbox actions | Ops Inbox should remain derived/read-only until the direct operator workflow proves itself. |
| Client portal actions | Client-facing approvals can wait until internal operator-led validation shows the boundaries are stable. |
| Autonomous AI proposal generation | MVP can use operator-authored or deterministic recommendations first. Autonomous generation should wait for 20-site evidence quality data. |
| Autonomous AI implementation | MVP should not let AI mutate improved candidates without explicit approved recommendation refs and human review. |
| Advanced billing automation | Use site-scoped truth or explicit internal bypass first; automate Stripe lifecycle only after the workflow is validated. |
| Full publish blocking enforcement | Shadow-publish is enough for first MVP acceptance if explicit human confirmation, audit, and online verification exist. |
| Batch migration | Must remain deferred until 20 one-site-at-a-time runs reveal bottlenecks and failure classes. |

## Dangerous Before 20-Site Validation

| Work | Why it is dangerous now |
| --- | --- |
| Batch migration | It will multiply unknown clone, billing, domain, and approval failures before single-site quality is proven. |
| Autonomous proposal and implementation | It can create plausible but unvalidated changes, making clone fidelity and improvement usefulness harder to measure. |
| Full enforcement against incomplete source truths | It can block every publish for missing billing/domain/rollback truth that has not yet been made operational. |
| Client-facing approval or publish controls | It exposes unstable internal boundaries and can imply commitments the platform cannot yet satisfy. |
| Live DNS/registrar/Openprovider mutation | It adds irreversible provider risk before manual readiness exceptions and verification loops are proven. |
| Advanced diagnostic persistence as the next task | It consumes effort in observability while the end-to-end path remains unproven. |

## Cutline Acceptance Definition

GNR8 reaches internal single-site MVP when:

- one real site is imported, source-reviewed, cloned, clone-reviewed, improved, approved, launch-readiness-reviewed, dry-run, shadow-published, and verified online;
- every manual exception or bypass is recorded as explicit MVP validation debt;
- the operator can repeat the same path from a runbook or minimal internal action surface without reading implementation code;
- production deployment and required Supabase migrations have been applied and verified;
- the 20-site validation harness/checklist exists before starting the 20-site set;
- after the 20-site set, the results show either at least 18 successful or categorized end-to-end attempts, or a no-go list with prioritized remediation.

## MVP-65 Decision

MVP-65 diagnostic snapshot persistence should not proceed now.

It should return after:

- one real site completes online shadow-publish verification;
- the minimal operator action surface has proven the exact source refs and missing state operators need;
- the 20-site harness identifies which diagnostic history is actually useful.

It should be replaced now by MVP-CUTLINE-2 and MVP-CUTLINE-3: a thin end-to-end orchestration design/service boundary and a minimal operator action surface for the existing workflow.

## Online Verification Trigger

The human should verify online GNR8 only after all of the following are true:

1. The implementation task for the operator action path has been committed and pushed.
2. The deployment containing that commit is live.
3. Required Supabase migrations for the involved single-site, AAF, launch readiness, publish target, DDOM, and operator audit tables have been applied to the target environment.
4. A real site flow has been seeded with tenant/client/site/migration/candidate/artifact/request/decision/gate refs.
5. The internal route or panel for the run is available, expected to be `/gnr8/command-center/single-site-publish` or the specific successor route chosen by MVP-CUTLINE-3.

Human checklist:

- open the internal operator route as a platform superadmin;
- confirm the intended tenant, client, site, migration, candidate site version, runtime artifact, and publish target;
- confirm source evidence, clone review, improved version review, content approval, client approval policy, launch approval, launch readiness, publish activation request, publish activation decision, and gate refs;
- run or inspect dry-run for the exact refs;
- run shadow-publish only when the explicit feature flag and confirmation are set;
- open the public/intended site URL and verify content, layout, key pages, metadata, SSL/domain behavior, forms/widgets/external links, and runtime health;
- confirm the active pointer/new artifact shown by GNR8 matches the intended improved candidate;
- confirm rollback target or recovery plan evidence exists;
- record defects, limitations, screenshots, timing, cost notes, and closeout.
