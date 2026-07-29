# GNR8 Single-Site Migration MVP Source Of Truth

MVP-2 source-of-truth model for one-site-at-a-time migration, improvement, hosting/subscription activation, and launch.

This is documentation and architecture only. It does not implement schema, code, API, worker, provider, publish, rollback, billing, domain, Command Center, Ops Inbox, AI, auth, storage, or runtime changes.

## Core Assertions

- Command Center is not source truth.
- Ops Inbox is not source truth.
- AI output is not source truth.
- Proposal is not publish approval.
- DDOM readiness is not publish approval.
- Subscription creation is not publish approval.
- Launch signoff is not publish activation unless explicitly scoped as publish activation approval by the canonical approval policy.
- Domain readiness is a publish prerequisite, not an approval.
- Stripe is billing/customer-payment truth where applicable.
- GNR8 owns internal hosting entitlement, operating status, source refs, runtime state, cost/margin visibility, and audit evidence.
- External systems remain authoritative for their own records unless a later approved architecture decision says otherwise.

## Truth Matrix

| Workflow object | Canonical source truth | Derived/supporting surfaces | Explicit non-truth |
| --- | --- | --- | --- |
| Source website capture truth | Immutable capture run records, rendered capture outputs, raw HTML snapshots, route maps, asset manifests, diagnostics, source URL, capture timestamps, and evidence refs. The external website remains external truth until cutover. | Website Understanding, Source Content and Visual Continuity, preview forensics, workspace evidence panels. | Operator memory, screenshots without refs, AI summaries, Command Center badges. |
| Source evidence truth | AAF/evidence package records or approved future equivalent, capture artifact refs, source refs, freshness labels, limitations, hashes, and audit events. | Evidence review pages, Command Center links, Ops Inbox blockers. | Proposal text alone, email notes without accepted external ref, UI badges. |
| Cloned site version truth | Runtime site version, runtime/raw-template artifacts, asset file map, content slot materialization, clone review records, and immutable artifact refs. | Preview URL, visual comparison report, clone fidelity score, thumbnail. | Generated proposal bundle, AI suggestion, Command Center status. |
| Improved version truth | New improved runtime site version/artifact, published/draft content overrides as applicable, implementation diff, approved proposal refs, and review evidence. | Improved preview, content workspace, visual QA report. | Proposal approval alone, local design notes, AI output. |
| Runtime artifact truth | `gnr8_runtime_artifacts` and related immutable artifact metadata/file refs, hashes, sizes, media types, provenance, and site-version binding. | Preview asset routes, hosting diagnostics, workspace artifact panels. | Rendered page output alone, browser cache, thumbnail. |
| Active pointer truth | Runtime active pointer and append-only publish/rollback events with before/after refs. | Public runtime response, Command Center live badge, hosting detail. | Preview URL, launch signoff, domain readiness, subscription creation. |
| Content override truth | Draft and published content override records, slot keys, content history, published override state applied by public runtime. | Content editor, client review preview, content diff display. | Client comment outside approved record, proposal copy, AI rewrite. |
| Proposal truth | Immutable proposal artifact with source evidence refs, improvement rationale, expected scope, risks, and approval/rejection state. | Proposal preview, operator summary, client presentation. | Publish approval, content approval, active runtime state. |
| Approval truth | AAF append-only approval request/decision/revocation/supersession records or approved future equivalent scoped to exact action: client review, content approval, launch signoff, domain action, domain exception, publish activation, rollback, cost exception. | Command Center approval lane, Ops Inbox `approval_needed`, email/external refs accepted as evidence. | UI badge, proposal, DDOM readiness, subscription creation, AI recommendation. |
| DDOM readiness truth | DDOM readiness snapshots/refs, domain binding/readiness state, DNS instruction snapshots, Vercel/custom-domain snapshots where applicable, freshness, blockers, warnings, and accepted exceptions. External DNS/registrar remains external truth. | Domain readiness view, Command Center domain lane, Ops Inbox domain item. | Publish approval, registrar truth, DNS completion without check/evidence. |
| Publish target truth | GNR8 publish target record, intended domain/environment/stage/policy/version, target watermarks, and target enabled/retired status. | Publish readiness checklist, Command Center publish lane, PASR shadow read model. | Domain intent alone, preview URL, launch approval alone. |
| Billing/subscription truth | Stripe customer/payment/subscription state where applicable; GNR8 billing/subscription projection, subscription record, webhook/admin reconciliation, cost center, cost/margin events. | Billing dashboard, Command Center cost/margin signals. | Entitlement alone, invoice copy without Stripe/source ref, manual note without audit. |
| Hosting entitlement truth | GNR8 hosting entitlement record, site/client entitlement linkage, status, plan/scope, effective dates, provisioning/audit refs, and internal operating state. | Command Center hosting status, client/account summaries. | Stripe alone for GNR8 operating entitlement, Command Center badge. |
| Audit/evidence truth | Append-only audit events, evidence package refs, correlation/idempotency keys, actor/scope, before/after refs, source watermarks, and retention/privacy labels. | Audit timeline, evidence viewer, closeout summary. | Slack/email notes unless linked and accepted, local operator memory. |
| Command Center projection | Derived read model over source-owned truth for portfolio/site/operator work. | It can navigate, summarize, and show allowed/prohibited actions. | It is not source truth and cannot approve, publish, create entitlement, resolve Ops work, or mutate canonical state by itself. |
| Ops Inbox projection | Derived work items from canonical blockers/exceptions with stable keys, redaction, freshness, owner suggestion, and no independent closure. | It can route attention to source-owned workflows. | It is not task truth, not enforcement, not approval, and not mutation authority. |

## Source Ownership Boundaries

| Boundary | Owner | MVP rule |
| --- | --- | --- |
| Source capture and evidence | Migration/capture services plus operator evidence review | New capture runs create new evidence; degraded capture requires review or exception. |
| Clone and improved runtime candidates | Runtime artifact/version services plus operator/client review | Clone and improved outputs must be distinct enough to audit what changed. |
| Proposal | Proposal builder/workflow plus human approver | Proposal may justify improvements but cannot authorize publication. |
| Approval | AAF or approved future approval service | Every action uses exact scoped approval; scopes do not bleed into each other. |
| Domain/DDOM | Domain readiness workflow and DDOM snapshots | Readiness can satisfy a prerequisite but cannot approve launch or publish. |
| Publish | Publish activation workflow | Publish-to-domain is governed and not autonomous. |
| Rollback | Rollback/incident workflow | Rollback is recovery, not deterministic replay. |
| Billing/payment | Stripe where applicable plus GNR8 billing projection | Stripe owns customer-payment truth; GNR8 owns local operating projection. |
| Hosting entitlement | GNR8 hosting/subscription control plane | Entitlement activates GNR8 service rights; it is not publish approval. |
| Command Center/Ops Inbox | Derived read model helpers | Display and triage only; no independent truth. |

## Approval Separation

| Approval/readiness item | What it authorizes | What it does not authorize |
| --- | --- | --- |
| Client approval | Client-visible acceptance of clone, content, or improvement result within its stated scope. | Publish activation, DNS mutation, billing charge, rollback. |
| Content approval | Publishing or accepting specific content/visual changes. | Launch signoff, publish activation, subscription activation. |
| Launch approval | Business decision that a site is ready to launch subject to technical gates. | Active pointer mutation unless also scoped as publish activation. |
| Publish activation approval | The actual governed public activation action for a target/version/domain. | DNS mutation, rollback, provider mutation, future batch publish. |
| DDOM readiness | Domain/DNS prerequisite evidence for publish readiness. | Any approval. |
| Subscription/hosting readiness | Commercial/entitlement prerequisite for launch. | Publish activation approval, client content acceptance. |

## Failure And Drift Rules

- If source evidence is missing, stale, or degraded, clone review must stop at source evidence review or record an exception.
- If clone fidelity is insufficient, the site returns to clone revision, not improvement proposal.
- If proposal is rejected, improvement implementation must not proceed from that proposal.
- If domain readiness is stale, publish readiness must fail closed or require a scoped domain exception plus publish activation approval.
- If subscription/hosting entitlement is missing, launch must stop at `subscription_required` or `hosting_entitlement_ready` not reached.
- If Command Center and source records disagree, source records win.
- If Ops Inbox item status disagrees with source records, source records win and the item must be regenerated or superseded.
- If AI output disagrees with captured source evidence, captured source evidence wins until a human-approved revision changes the target.
