# GNR8 Single-Site Improved Candidate Evidence And Watermark Contract

Phase: MVP-22
Scope: Design-only evidence and semantic watermark contract for future improved candidate dry-run and execute adapters.

This document does not implement code, persistence, runtime mutation, evidence builders, AAF writers, routes, UI, providers, commit, or push behavior.

## Evidence Rule

The improved candidate adapter must cite upstream truth rather than recreate it. Evidence refs prove where the adapter got authority and context; they do not grant content, client, launch, or publish approval.

## Required Evidence Refs

Authority evidence:

- proposal plan ref;
- proposal approval request ref;
- proposal approval decision ref;
- proposal approval evidence package ref;
- implementation authorization request ref;
- implementation authorization decision ref;
- implementation authorization evidence package ref;
- MVP-20 execution-time validation result/evidence ref.

Baseline evidence:

- clone review ref;
- clone runtime site version ref;
- clone runtime artifact ref;
- source evidence review ref;
- source capture refs for rendered DOM, raw HTML, screenshots, text, assets, fonts, styles, metadata, and diagnostics where available.

Advisory/context evidence where available:

- WU projection ref;
- VCU projection ref;
- CGP/style/brand candidate refs;
- Generated Proposal Bundle refs as advisory only;
- AI/provider advisory refs as advisory only;
- operator notes and external refs only when accepted as evidence through an approved boundary.

Output evidence:

- dry-run planned change set ref or placeholder;
- future improved candidate site version ref;
- future improved runtime artifact ref;
- applied recommendation refs;
- not-applied recommendation refs and reasons;
- warnings and limitations;
- no-write proof for dry-run;
- read-back verification refs for future execute.

## Required Watermarks

| Watermark | Required contents |
| --- | --- |
| Proposal plan watermark | Proposal plan id, version, status, plan semantic watermark, proposal approval refs, limitations. |
| Selected recommendations watermark | Sorted selected recommendation ids, categories, statuses, source watermarks, semantic watermarks, target mappings where available. |
| Implementation authorization evidence watermark | AAF request/decision/evidence refs, scope, subject, evidence package source watermark, freshness, limitations. |
| Execution-time validation watermark | MVP-20 expected semantic watermark, validation reason, matched subject/evidence refs, freshness result, drift result. |
| Clone site version watermark | Clone site version id, site id, version no, state, renderer compatibility, provenance hash, page content/structure/style/asset hashes. |
| Clone runtime artifact watermark | Artifact id, site version id, bundle SHA-256, publish stage, governance hash, manifest hash. |
| WU evidence watermark | WU projection id, contract version, deterministic inputs, readiness, source artifact refs. |
| VCU evidence watermark | VCU projection id, contract version, source WU projection id, deterministic inputs, readiness, source artifact refs. |
| CGP evidence watermark | Style/brand evidence refs, candidate state, confidence, source refs, limitations; absent if no governed CGP evidence exists. |
| Planned change set watermark | Stable planned changes, target mappings, current hashes, planned hashes/placeholders, applied/not-applied recommendation refs. |
| Output bundle watermark | Future artifact bundle hash or dry-run expected artifact bundle hash, renderer compatibility, manifest hash, route/path set. |
| Limitations watermark | Sorted limitations from proposal, proposal approval, implementation authorization, validation, clone review, source evidence, WU/VCU/CGP, and dry-run mapping. |

## Semantic Input Watermark

The semantic input watermark must cover every field that would affect planned or executed output:

- tenant/client/site/migration identity;
- execution attempt id;
- adapter id/version/mode;
- proposal plan and approval refs;
- selected recommendation refs;
- implementation authorization refs;
- MVP-20 validation result;
- clone review/source evidence refs;
- clone site version/artifact refs and hashes;
- WU/VCU/CGP refs where used;
- implementation scope summary;
- non-goals;
- carried limitations;
- idempotency key namespace.

Any change to a selected recommendation, source ref, limitation, scope, target mapping, clone artifact, or validation evidence must produce a new semantic input watermark or fail idempotency drift.

## Semantic Output Watermark

Dry-run semantic output watermark must cover:

- semantic input watermark;
- deterministic planned change set;
- expected candidate site version placeholder;
- expected artifact placeholder;
- expected artifact bundle hash;
- applied and not-applied recommendations;
- warnings;
- limitations;
- no-write proof.

Execute semantic output watermark must cover:

- semantic input watermark;
- actual improved candidate site version id;
- actual improved runtime artifact id;
- artifact bundle SHA-256;
- applied and not-applied recommendations;
- warnings;
- limitations;
- read-back verification;
- non-approval and no-active-pointer proof.

## Evidence Carry-Forward

Limitations must be carried forward from:

- source evidence review;
- clone review;
- proposal plan;
- proposal approval;
- implementation authorization;
- MVP-20 validation;
- WU/VCU/CGP advisory refs;
- unsupported recommendations;
- dry-run no-write proof or execute read-back proof.

The adapter must not drop limitations merely because a deterministic change was applied.

## Non-Approval Evidence

Every dry-run and future execute result must carry explicit false flags:

- `contentApproved: false`;
- `clientApproved: false`;
- `launchApproved: false`;
- `publishApproved: false`;
- `published: false`;
- `activePointerChanged: false`.

These flags are evidence boundaries, not optional metadata.

## Staleness And Drift

Future execute must re-read current proposal, clone, source evidence, runtime baseline, and AAF refs immediately before mutation. If the current watermarks do not match dry-run or validation watermarks, execute must fail with drift details. A successful dry-run is reusable only while semantic input watermark and required freshness windows remain valid.
