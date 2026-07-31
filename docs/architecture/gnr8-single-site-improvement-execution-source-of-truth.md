# GNR8 Single-Site Improvement Execution Source Of Truth

Phase: MVP-19
Scope: Design-only source-of-truth decision for future single-site improvement execution

This document does not implement runtime mutation, execution persistence, validators, SQL, routes, UI, AI/provider calls, content edits, publish, rollback, billing, domain, DNS, Command Center, Ops Inbox, client portal, commit, or push behavior.

## Decision

Future MVP improvement execution truth must be owned by a new single-site improvement execution boundary, backed by append-only/bounded persistence and exact refs to upstream truth.

It must not be owned by proposal planning, Generated Proposal Bundles, AI transformation routes, content override routes, Command Center, Ops Inbox, previews, or public runtime rendering.

## Truth Layers

| Object | Canonical source truth | MVP-19 rule |
| --- | --- | --- |
| Source capture | Source evidence review records, capture refs, rendered DOM/screenshot/raw HTML/text/asset/font/style/metadata refs and watermarks | Evidence only after source evidence review acceptance. |
| Clone baseline | Accepted clone review plus clone runtime site version/artifact refs | Baseline for future improved candidate. Must not be mutated. |
| Proposal plan | `gnr8_single_site_improvement_proposal_*` records and selected approved recommendation refs | Scope input only. Proposal approval does not authorize execution. |
| Implementation authorization | AAF exact scope `single_site_improvement_implementation_authorization` request/decision/evidence/audit records | Mandatory execution-time gate. Attached refs are not enough. |
| Improvement execution attempt | Future execution attempt persistence | Owns attempt identity, selected items executed, inputs, outputs, failures, limitations, and evidence refs. |
| Improved candidate version | New runtime site version and runtime artifact refs created by future executor | Candidate review truth only. Not published, not active. |
| Improved version review | Future review records over improved candidate version | Accepts candidate for later content approval stage only. |
| Content approval | Future AAF/content approval records | Separate from implementation authorization and candidate review. |
| Client approval | Future client approval records | Separate from content approval and publish. |
| Launch approval | Future launch signoff records | Separate from publish activation. |
| Publish activation | Publish activation approval plus runtime active pointer mutation | Out of scope for improvement execution. |
| Command Center/Ops Inbox | Derived read models | Display/navigation only. |
| AI/provider output | Immutable advisory refs after human review | Never source truth. |

## Canonical Improved Candidate

For MVP, an improved candidate is canonical only when all are true:

- a new runtime site version exists for the same tenant/client/site/migration lineage;
- it cites the accepted clone source version;
- it cites the approved proposal plan and selected recommendation refs;
- it cites the exact AAF implementation authorization decision and evidence package validated at execution time;
- it has a bound runtime artifact created for review/shadow use;
- it has semantic input and output watermarks;
- it records limitations carried forward from source evidence, clone review, proposal approval, and AAF authorization;
- it is not active, not published, not content-approved, not client-approved, not launch-approved, and not publish-approved.

## Non-Truth Boundaries

These must never be treated as execution truth:

- implementation authorization attachment without execution-time validation;
- proposal approval alone;
- Generated Proposal Bundle output;
- AI transformation plan or execution output;
- preview HTML;
- public runtime output;
- thumbnail;
- WU/VCU/CGP projection;
- Command Center status;
- Ops Inbox item;
- operator note not promoted through canonical service;
- external chat/email/ticket text unless accepted as evidence ref;
- DDOM readiness;
- PTT publish target;
- billing/subscription/hosting readiness.

## Source Ref Requirements

Future execution must record refs for:

- tenant/client/site;
- single-site migration;
- accepted source evidence review and source evidence package;
- accepted clone review;
- clone source runtime site version;
- clone source runtime artifact;
- approved proposal plan;
- selected approved recommendation ids and watermarks;
- proposal approval request/decision/evidence refs;
- exact implementation authorization request/decision/evidence/audit refs;
- future improved candidate runtime site version;
- future improved runtime artifact;
- execution attempt and event refs;
- preview/review evidence refs after candidate creation;
- carried limitations and non-goals.

## Mutation Boundaries

Future improvement execution may create only candidate-version state inside its approved scope. It must not:

- mutate the accepted clone version;
- mutate the active production version;
- switch active pointers;
- call publish or rollback;
- activate domain bindings;
- create DDOM or PTT truth;
- write content approvals, client approvals, launch approvals, or publish approvals;
- call AI providers or external providers unless a later separately governed adapter is approved;
- write Command Center/Ops Inbox truth.
