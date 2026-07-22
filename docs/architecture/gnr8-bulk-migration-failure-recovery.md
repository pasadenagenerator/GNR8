# GNR8 Bulk Migration Failure Recovery

BMF-1 retry, replay, failure taxonomy, recovery evidence, and stop/continue policy for the Bulk Migration Factory.

This is documentation-only. It does not modify runtime behavior, APIs, schemas, migrations, workers, import behavior, publish behavior, rollback behavior, DNS behavior, billing, providers, thumbnails, Generated Proposal Bundles, Workspace runtime, or Evolution runtime.

## Recovery Principles

1. Recovery is evidence-driven. A failure is not recovered because an Ops Inbox item is dismissed; it is recovered when canonical state and evidence prove recovery.
2. Retry and replay are different. Retry repeats an operator-approved action. Replay resets deterministic stage outputs from an immutable input boundary.
3. Non-deterministic and externally mutating side effects are not replayed blindly.
4. Rendered capture is replayable with external variance, not guaranteed deterministic.
5. Publish, rollback, approvals, domain verification, provider execution, billing mutation, and AI/provider outputs require explicit classification and human approval.
6. Site-level failures do not automatically stop the whole batch unless severity and policy require it.

## Retry And Replay Classes

| Class | Meaning | Default BMF handling |
| --- | --- | --- |
| Replayable in MVP | Deterministic stage can be rerun from immutable inputs and expected outputs can be compared. | Allowed after operator request and audit. |
| Replayable with external variance | Stage can be repeated but output may differ because source/network/browser/provider state changed. | Allowed with variance warning, new evidence refs, and review. |
| Manually repeatable only | Human/external check can be repeated but not deterministically replayed. | Allowed as new check/action with audit. |
| Not replayable | Historical decision/side effect cannot be replayed safely. | New decision/action required; preserve event history. |
| Future replay candidate | Could become replayable once immutable input/output bundles and guards exist. | Design only; do not implement as replay in MVP. |
| Forbidden | Must not run in BMF MVP. | Blocked unless future ADR explicitly approves. |

## Stage Replay Matrix

| Stage/action | Replay class | Required immutable input | Required output | Audit event | Operator role | Max retry guidance | Stop/continue effect | Recovery evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Intake validation | Replayable in MVP | Intake row original values, validation rules version | Validation result, invalid/duplicate report | `bulk_intake_validated` or `bulk_intake_failed` | Migration/account | Unlimited until start approval | Invalid rows block affected sites; batch can continue planning without them | Validated row set and audit note. |
| Source URL normalization | Replayable in MVP | Original source URL, normalizer version | Normalized URL, parse diagnostics | `bulk_intake_validated` | Migration | Unlimited before job creation | Blocks row if invalid | Normalized URL accepted. |
| Source reachability check | Replayable with external variance | Normalized URL, request policy, timestamp | HTTP result, final URL, diagnostics | `source_reachability_checked` if implemented | Migration/technical | 2-3 attempts before triage | Medium/high failures block site import, not whole batch unless repeated/systemic | Successful reachability or accepted source-unavailable defer. |
| Rendered capture | Replayable with external variance | Source/captured HTML refs, capture policy, viewport, worker config | Rendered DOM, screenshots, style samples, diagnostics | `site_capture_degraded`, `site_import_completed` | Technical | 1 immediate replay, 1 later replay; more requires reason | Degraded site can continue to review; repeated capture/system failures may pause batch | New capture evidence or accepted degraded fallback. |
| Raw HTML fetch | Replayable with external variance | Source URL/request policy | Response HTML, status, final URL, diagnostics | `site_import_started`/failure | Migration/technical | 2-3 attempts | Source failures block site; repeated cross-site source/system failures pause | Usable HTML or defer record. |
| Static import | Replayable in MVP | Captured/raw HTML artifact, import manifest, importer version | Import output, diagnostics, raw artifact refs | `site_import_started`, `site_import_completed`, `site_import_failed` | Migration/technical | 2 attempts after root cause | Site failure can continue batch unless high/critical systemic | Completed import with artifact refs. |
| Multi-page discovery | Replayable with external variance | Seed URL, captured seed HTML, discovery limits, robots/sitemap policy | Route map, discovery evidence, diagnostics | `route_review_requested` if implemented | Migration/SEO | 1-2 replays; more needs route policy change | Too many/ambiguous routes may block site and possibly pause if widespread | Operator-approved route map/coverage. |
| Route map assembly | Replayable in MVP if from persisted acquisition | Discovered route set, fetched page refs, assembly rules | Route map, raw assembly manifest | `site_import_completed` | Migration/technical | 2 attempts | Blocks route review/preview for site | Valid preview route coverage. |
| Runtime artifact creation | Replayable in MVP | Runtime site version, canonical input, raw/template artifacts, builder version | Immutable runtime artifact, bundle hash | `site_import_completed` or `runtime_artifact_failed` | Technical | 2 attempts after cause | Artifact failure blocks site; systemic artifact failures pause | Artifact exists, bound to version, integrity checks pass. |
| Content slot inference | Replayable in MVP | Imported HTML/semantic import, inference version | Slot list, diagnostics | `content_slots_inferred` if implemented | Content/technical | 2 attempts | Failure does not block preview; may block content review | Slots persisted or explicit no-slot/review note. |
| WU projection | Replayable in MVP | Persisted evidence/artifacts | Projection artifact/read model | `projection_generated` if used operationally | Migration/content | 1-2 attempts | Does not block import; may block enriched review | Projection available or waived. |
| VCU projection | Replayable in MVP | Persisted evidence/artifacts | Projection artifact/read model | `projection_generated` if used operationally | Content/design | 1-2 attempts | Does not block launch unless used in approval policy | Projection available or waived. |
| Preview generation | Replayable in MVP | Site version, artifact, content overrides | Preview URL/render result/diagnostics | `preview_generated` | Content/technical | 2 attempts | Blocks review/approval for site | Preview loads and evidence recorded. |
| Domain verification | Manually repeatable only | Domain binding, DNS instruction snapshot, external provider state | Verification status, DNS/SSL evidence | `domain_action_required`, `domain_verified` | Technical/account/client | Repeat after DNS TTL/change; no blind loop | Blocks custom-domain publish; batch may continue other sites | Verified status or approved domain exception. |
| Publish activation | Not replayable | Approved site version, readiness snapshot, active pointer before state | Publish event, active pointer after state | `publish_readiness_passed`, `publish_completed`, `publish_failed` | Technical/superadmin | No blind retry; retry only after cause and approval | Critical failure stops publish wave | Successful publish event or incident/rollback record. |
| Rollback | Not replayable | Incident, target known-good version/content history | Rollback event, active pointer/content state after | `rollback_requested`, `rollback_completed` | Technical/superadmin | No blind retry | Stops launch actions for affected site; may pause batch | Recovery verification and incident resolution. |
| AI plan generation | Future replay candidate | Immutable AI input bundle, model/version/prompt/tool refs | Immutable output bundle | `ai_plan_generated` if used | Operator reviewer | Advisory only | No execution effect | Human accepted/rejected advisory output. |
| Provider execution | Forbidden | None approved for MVP | None | Must not occur | None | 0 | Blocked | N/A |

## Failure Severity

| Severity | Meaning | Default batch behavior | Default site behavior |
| --- | --- | --- | --- |
| Low | Non-blocking issue with clear workaround or review note. | Continue batch. | Continue site; record warning. |
| Medium | Site-level blocker or manual review need with low systemic risk. | Continue other sites if policy allows. | Block affected milestone until resolved. |
| High | Serious site blocker, repeated stage failure, domain/approval blocker, or risk of client-visible issue. | Pause affected site; batch may continue only under `continue_on_failure` and no systemic signal. | Requires owner and recovery/exception evidence. |
| Critical | External/client-visible risk, publish/rollback incident, duplicate domain ownership conflict, cost anomaly threshold, unsupported launch risk, or systemic worker/import failure. | Pause batch or launch wave by default. | Stop launch/publish actions; incident/escalation required. |

## Failure Taxonomy

| Failure type | Description | Severity | Source of truth | Detection point | Owner | Retry | Replay | Auto-pause | Batch policy | Ops Inbox | Recovery evidence | Escalation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Invalid intake | Required fields missing/invalid. | Medium | Intake validation result | Intake validation | Account/migration | After correction | Validation replayable | No unless many rows | Exclude rows; continue planning | `intake_blocked` | Corrected valid row | Account owner if client data needed |
| Duplicate source URL | Same normalized source appears more than once. | Medium/high | Duplicate report/site records | Intake/dry-run | Migration/account | After resolution | Validation replayable | High if cross-client | Block affected rows | `duplicate_detected` | Duplicate decision/merge/defer record | Superadmin if cross-client |
| Duplicate target domain | Same launch domain conflicts. | Critical | Domain/site/binding records | Intake/dry-run/domain readiness | Technical/account | After ownership resolution | Validation/check repeatable | Yes | Block affected rows; pause start if unresolved | `duplicate_detected`, `domain_action_needed` | Ownership/domain decision | Superadmin/client DNS owner |
| Unsupported site class | Commerce/auth/payment/backend/etc. | High/critical | Site class assessment | Classification/dry-run/review | Superadmin/migration | No automatic retry | Classification reassessment only | Critical if launch path | Block launch; maybe import-only | `unsupported_site_class` | Out-of-scope/defer/exception record | Superadmin/client |
| Source unavailable | URL unreachable or empty. | Medium/high | Reachability/import diagnostics | Dry-run/SNAPSHOT/import | Technical/migration | Yes | External variance | Pause if repeated/systemic | Continue other sites | `import_failed` | Successful fetch or defer | Technical |
| Source blocked | CORS/network/bot/TLS/blocking prevents capture/fetch. | High | Import diagnostics | Capture/import | Technical | Limited | External variance | Pause if repeated/systemic | Continue only if isolated | `import_failed` | Alternate access/fallback/defer evidence | Technical/account |
| TLS/SSL fetch error | HTTPS validation or certificate issue. | Medium/high | Fetch diagnostics | Dry-run/import | Technical | Limited | External variance | No unless systemic | Site blocked; others continue | `import_failed` | Successful fetch or accepted raw/http exception | Technical |
| Rendered capture failed | Browser/capture produced no usable evidence. | Medium/high | Rendered capture diagnostics | Capture | Technical | Yes | External variance | Pause if repeated | Continue with raw fallback only if allowed | `capture_degraded` | New capture or degraded exception | Technical |
| Capture degraded to raw fallback | Rendered evidence partial/unavailable, raw usable. | Medium | Provenance/capture status | Capture/import reporting | Technical/content | Optional | External variance | No | Continue to review; launch gated | `capture_degraded` | Review/exception noting missing evidence | Technical/content |
| Too many routes | Discovery exceeds MVP route limit. | High | Multi-page discovery summary | Dry-run/discovery | Migration/SEO | With adjusted limits | External variance | No unless widespread | Site route review/defer | `route_review_needed` | Approved trimmed route map | SEO/client |
| Route discovery ambiguous | Canonical/alias/redirect/hreflang conflict. | Medium/high | Discovery evidence | Discovery/route review | Migration/SEO | Yes after policy | External variance | No | Block route approval | `route_review_needed` | Operator-approved route map | SEO |
| Asset fetch failure | Assets missing/unsupported/external fallback. | Low/medium | Import diagnostics/raw artifact metadata | Import/artifact | Technical/content | Limited | Static import replay | No | Continue if non-structural; review visual impact | `review_needed` if visible | Asset accepted/replaced/reimported | Content/technical |
| Form behavior unsupported | Form endpoint/functionality not verified. | High | Site class/review checklist | Classification/review | Technical/content/client | No automatic | Manual repeat only | No | Block launch until verified/replaced | `review_needed`, `approval_needed` | End-to-end form evidence or approved replacement | Client/technical |
| External widget unsupported | Map/chat/booking/widget broken or risky. | Medium/high | Review/capture evidence | Review/preview | Technical/content | Maybe after embed fix | Manual repeat | No | Block launch if critical | `review_needed` | Widget works/replaced/accepted limitation | Client/technical |
| Heavy JavaScript mismatch | Preview cannot reproduce source UX. | High/critical | Capture/review evidence | Capture/preview review | Technical | Limited | External variance | Critical if app-like | Import-only/defer | `unsupported_site_class` | Defer or accepted static snapshot | Superadmin/client |
| Import pipeline failure | Scoped pipeline/stage error. | High | Job/stage diagnostics | Import stage | Technical/migration | Yes after cause | Stage policy | Pause if repeated | Continue isolated failures | `import_failed` | Completed retry or defer | Technical |
| Runtime artifact failure | Artifact creation/bind/integrity fails. | High/critical if systemic | Runtime store/artifact diagnostics | Artifact build | Technical | Yes after cause | Replayable | Pause if repeated/systemic | Block affected sites | `preview_failed` | Artifact bound and integrity passes | Technical |
| Preview generation failure | Preview unavailable/broken. | High | Preview/readiness diagnostics | Preview | Technical/content | Yes | Replayable from artifacts | Pause if systemic | Block review/approval | `preview_failed` | Preview loads/evidence | Technical |
| Content slot inference failure | Slots missing or inference failed. | Low/medium | Content slot diagnostics | Import/content | Content/technical | Yes | Replayable | No | Continue preview; may block content review | `review_needed` | Slots persisted or no-slot note | Content |
| Review rejected | Human rejects fidelity/content/route coverage. | Medium/high | Review record | Review | Content/account/client | After correction | Manual repeat only | No | Block approval | `review_needed` | New review accepted | Account/client |
| Approval missing | Required approver not assigned or has not approved. | Medium/high | Approval records | Approval gate | Account/approver | N/A | Not replayable | No | Block launch/publish | `approval_needed` | Approval granted or waiver | Account/client |
| Domain ownership unclear | DNS owner/registrar authority unknown. | High | Intake/domain notes | Intake/domain readiness | Account/technical | After info gathered | Manual repeat | No | Block custom-domain publish | `domain_action_needed` | Ownership evidence | Client/account |
| DNS instructions incomplete | Instructions missing or stale. | Medium/high | Domain binding/instructions | Domain readiness | Technical | Recompute/check | Manual repeat | No | Block domain readiness | `domain_action_needed` | Instruction snapshot accepted | Technical |
| DNS verification failed | Provider/Vercel check failed. | High | Domain host binding/verifier | Domain verification | Technical/client | After DNS changes/TTL | Manual repeat | No | Block custom-domain publish; continue other sites | `dns_verification_failed` | Verified status or approved exception | Technical/client |
| Publish readiness failed | Required readiness gate failed. | High | Readiness snapshot | Publish readiness | Technical | After correction | Replay deterministic checks only | No unless systemic | Block publish | `publish_readiness_failed` | Passing readiness snapshot | Technical |
| Publish failed | Publish activation failed or unsafe. | Critical | Publish event/active pointer | Publish | Technical/superadmin | No blind retry | Not replayable | Yes | Stop publish wave | `publish_failed`, `incident_open` | Incident/recovery/publish success | Superadmin |
| Rollback required | Incident requires rollback decision. | Critical | Incident/version history | Incident/publish/content | Technical/superadmin | No blind retry | Not replayable | Yes | Stop affected launch actions | `rollback_needed` | Rollback completed or incident resolved | Superadmin/account |
| Cost anomaly | Estimated/actual cost exceeds threshold. | High/critical | Cost events/projections | Dry-run/execution | Superadmin/agency owner | After approval | Not replayable | Yes at threshold | Pause batch/site class | `cost_anomaly` | Cost review/approval | Superadmin/agency |
| Worker/system failure | Infrastructure job failure or missing durable store. | High/critical | System diagnostics/route errors | Dry-run/import/capture/domain | Technical | After system fix | Depends stage | Pause if systemic | Stop unsafe execution | `incident_open` | System healthy and replay evidence | Technical |
| Ambiguous unknown failure | Unclassified error. | Medium/high until classified | Failure record/job diagnostics | Any stage | Technical/migration | Case-by-case | Case-by-case | High if repeated | Pause if severity unknown and repeated | `recovery_evidence_needed` | Classified failure and resolution | Technical |

## Stop/Continue Policy

### Default Rules

1. A site-level low or medium failure does not automatically stop the entire batch.
2. A high failure blocks the affected site and may allow the batch to continue only if isolated and policy permits.
3. A critical failure pauses the batch or launch wave by default.
4. Unsupported site class blocks launch, but may allow import-only review if explicitly approved.
5. Domain failures block publish for custom-domain sites but may allow preview and other sites to continue.
6. Publish failure stops any publish wave.
7. Rollback-required incident stops further launch actions for affected site and may pause related batch.
8. Cost anomalies pause batch execution when threshold policy says high/critical.
9. Repeated capture/system/import failures pause the batch until technical triage.

### Severity Behavior

| Severity | Batch default | Site default | Operator override |
| --- | --- | --- | --- |
| Low | Continue | Continue with warning | Operator may defer if review burden accumulates. |
| Medium | Continue other sites under approved policy | Block affected milestone | Operator may pause site or batch if pattern emerges. |
| High | Continue only when isolated and `continue_on_failure`/cohort policy allows | Block affected site; owner required | Superadmin/technical may pause/resume with reason. |
| Critical | Pause batch, publish wave, or affected cohort | Stop launch/publish/rollback-sensitive actions | Override requires superadmin approval and explicit evidence. |

### Auto-Pause Triggers

- Duplicate target domain across clients or ownership conflict.
- Publish failure.
- Rollback-required incident.
- Cost anomaly above critical threshold.
- Repeated rendered capture failures across a batch/cohort.
- Repeated import/artifact failures that indicate system issue.
- Provider execution, live DNS mutation, autonomous publish, autonomous rollback, or autonomous AI execution attempt detected.
- Unsupported site class attempts to enter launch/publish readiness.

## Recovery Evidence Requirements

Every recovered failure must record:

- Failure id/type/severity.
- Actor or system actor.
- Subject id: intake row, batch, site, job, stage, version, domain, publish event, incident, or cost event.
- Prior blocker state.
- Recovery action taken.
- Immutable input refs where replay occurred.
- Output refs or external check snapshot.
- Human approval/exception refs when needed.
- Verification result.
- Remaining limitations.
- Timestamp and correlation id.

## Future Tests

Implementation must include:

- One test per failure taxonomy entry.
- One test per severity class and stop/continue default.
- Retry/replay tests for every stage in the matrix.
- Tests proving publish, rollback, approvals, provider execution, and live DNS mutation are not replayable BMF stages.
- Tests proving Ops Inbox item completion requires canonical state/evidence change.
- Tests proving dry-run failures cannot start a batch without waiver.
- Tests proving unsupported site classes cannot become launch-ready without exception.
