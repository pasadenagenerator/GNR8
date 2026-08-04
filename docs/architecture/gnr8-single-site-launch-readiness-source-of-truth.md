# GNR8 Single-Site Launch Readiness Source Of Truth

Phase: MVP-36
Scope: Documentation and architecture only.

This document defines canonical source-of-truth ownership for single-site launch readiness after validated launch approval and before publish activation review. It does not implement SQL, TypeScript, JavaScript, routes, services, UI, API, workers, providers, billing, domain mutation, publish activation, publish execution, rollback, Command Center, Ops Inbox, client portal, commits, or pushes.

## Definition

Launch readiness means that after validated `single_site_launch_approval`, GNR8 has enough current evidence that the improved candidate is operationally ready to proceed toward publish activation review.

Launch readiness authorizes preparation of a publish activation approval package. It does not authorize active pointer mutation, public publish execution, provider mutation, billing/payment collection, rollback execution, or client/content/launch approval.

Launch readiness does not mean:

- publish activation approval;
- active pointer mutation;
- public publish execution;
- DNS/provider ownership truth;
- billing payment truth;
- client approval;
- content approval;
- launch approval itself;
- rollback execution;
- Command Center or Ops Inbox task truth.

## Source Ownership Matrix

| Readiness dimension | Canonical owner | What GNR8 may store | What GNR8 may derive | Non-truth and prohibited substitution |
| --- | --- | --- | --- | --- |
| Launch approval truth | AAF `single_site_launch_approval` request/evidence/decision plus single-site launch approval workflow rows. | Validated decision refs, launch approval id, evidence package refs, limitations, semantic watermark. | `readiness_work_ready` and carried limitation labels. | DDOM/PASR/PTT/Command Center/Ops Inbox cannot satisfy launch approval. |
| Content approval truth | AAF `single_site_content_approval` plus content approval service rows. | Decision refs, content approval id, improved candidate refs, limitations, watermarks. | Whether readiness must fail stale because content/candidate changed. | Launch readiness cannot infer content approval from preview rendering or launch approval. |
| Client approval truth where required | AAF `single_site_client_approval` plus client approval service rows and policy. | Required/not-required policy ref, decision refs, limitations. | Whether client approval is required and current. | Account notes, client portal labels, email, or launch approval alone. |
| Improved candidate runtime version/artifact truth | Runtime `gnr8_runtime_site_versions` and `gnr8_runtime_artifacts`. | Candidate version/artifact refs, bundle hash, renderer compatibility, publish stage/governance, preview refs. | Candidate readiness diagnostic and stale reason when version/artifact differs from approval refs. | Proposal approval, generated summary, preview URL alone. |
| Publish target truth | PTT `gnr8_publish_targets`. | Target id, environment, stage, target kind, policy version, source watermark. | Target ready/missing/disabled/retired/mismatched diagnostics. | Route body stage, UI label, domain intent, launch approval alone. |
| Domain/DDOM readiness truth | DDOM `gnr8_ddom_readiness_snapshots` and refs, produced outside PASR from stored GNR8 state. | Snapshot refs, freshness, blockers, warnings, source watermarks, limitations. | Domain readiness prerequisite status for the named launch path. | External DNS truth, registrar truth, publish approval, or PASR-created snapshots. |
| DNS instruction/operator evidence | GNR8 domain instruction snapshots, external refs, AAF evidence/audit refs, operator notes where accepted. | Instruction refs, owner evidence refs, completion evidence refs, captured time, redaction labels. | Whether domain evidence is missing/stale/limited and what owner workflow is needed. | DNS completion proof unless verified or excepted; external notes as approval truth. |
| Vercel/custom-domain/SSL observed or stored state | Vercel owns its own project/domain state; GNR8 stores snapshots on domain bindings/DDOM refs. SSL truth remains provider/runtime observed state. | Stored Vercel-shaped status, verification/routing records, SSL/readiness snapshots, last checked time. | Vercel/custom-domain/SSL prerequisite status with TTL. | Registrar/DNS ownership truth or publish activation approval. |
| Billing/subscription/hosting entitlement truth | Stripe owns customer/payment/subscription truth where applicable. GNR8 owns local hosting entitlement, subscription projection, cost center, operating status. | Stripe ids/refs, subscription projection refs, entitlement refs, cost/margin refs, audit refs. | Billing/hosting readiness and missing/stale/blocker diagnostics. | Cost center alone, Stripe webhook alone, entitlement alone, or Command Center billing badge. |
| Stripe/payment truth where applicable | Stripe. | Stripe customer, subscription, invoice/payment refs and webhook reconciliation evidence. | Whether Stripe evidence required by policy is present and current. | Manual invoice copy without accepted source ref, GNR8 entitlement as payment truth. |
| Rollback readiness evidence | Runtime active pointer/version/artifact history, content history, future rollback readiness record/evidence. | Previous known-good target refs, recovery plan refs, rollback limitation refs. | Whether rollback readiness is present, missing, stale, or plan-only. | Rollback execution, publish approval, or runtime existence alone. |
| Preview/smoke QA evidence | Preview/smoke validator runs, preview route responses, asset checks, operator QA refs. | Smoke run refs, preview target refs, required asset checks, blocker/limitation refs, captured time. | Smoke readiness status and stale/missing QA diagnostics. | Preview route status alone, screenshots without refs, public runtime success. |
| Publish activation approval truth | AAF `publish_activation` request/evidence/decision timeline. | Approval request/decision refs when prepared later, revocation/supersession/expiry refs. | Whether launch readiness may hand off to publish activation approval required. | Launch approval, DDOM readiness, PASR shadow readiness, Command Center/Ops Inbox labels. |
| PASR shadow observations | PASR/AAF publish activation source reader, evidence builder, dry-run gate, shadow read model. | Shadow evidence/gate/audit refs and redacted derived diagnostics. | Non-enforcing diagnostic evidence about future publish activation readiness. | Enforcement, publish approval, launch readiness source truth, DDOM snapshot creation. |
| Command Center projection | Derived read models and redacted view-models. | Display-only summaries, links to source-owned workflows. | Operator next-action guidance. | Source truth, approval, task completion, readiness mutation. |
| Ops Inbox projection | Derived work items over canonical blockers and redacted PASR diagnostics. | Display-only derived work item keys and owner suggestions. | Triage priorities and owner workflow routing. | Task truth, blocker resolution, approval, DDOM trigger, publish or rollback action. |
| External provider truth | External DNS provider, registrar, Vercel, Stripe, SSL/provider systems, client-owned systems. | Captured refs/snapshots, accepted evidence refs, limitations, timestamps. | Freshness and confidence labels over stored refs. | GNR8 ownership of external state unless explicitly stored as GNR8 operating truth. |

## Readiness Outcome Vocabulary

Future readiness records and readers should use:

- `not_started`
- `pending`
- `ready`
- `ready_with_limitations`
- `blocked`
- `stale`
- `missing`
- `not_applicable`
- `failed`

`ready_with_limitations` means readiness can proceed only if the limitation is carried into publish activation review. It is not approval.

## Required MVP Dimensions

For MVP launch readiness, these dimensions are required unless a source-owned policy explicitly marks them not applicable:

- validated launch approval;
- current content approval;
- current required client approval;
- improved candidate runtime version/artifact;
- publish target truth;
- DDOM/domain readiness;
- DNS instruction/operator evidence for custom-domain paths;
- Vercel/custom-domain/SSL stored-state evidence where applicable;
- billing/subscription/hosting entitlement readiness;
- Stripe/payment refs where policy requires Stripe truth;
- rollback readiness evidence;
- preview/smoke QA evidence;
- limitation/blocker/audit timeline refs.

PASR shadow observations are optional diagnostic evidence for MVP launch readiness. They must not block or pass launch readiness by themselves.

## Source Conflict Rules

- If a derived projection disagrees with canonical source truth, the source-owned truth wins.
- If external provider state disagrees with stored GNR8 snapshots, the latest accepted provider-sourced ref is evidence, but the provider remains authoritative for its own system.
- If launch approval is current but any readiness dimension is missing/stale/blocked, launch readiness is not ready.
- If publish activation approval is already present, launch readiness still does not publish; it can cite that approval only as handoff evidence.
- If readiness depends on a stale source, a new source-owned refresh or accepted exception is required.

## Boundary Confirmation

MVP-36 defines the architecture only. It does not create launch readiness persistence, a launch readiness service, a source reader, billing activation, DDOM snapshots, provider calls, publish activation approval, publish execution, rollback execution, Command Center actions, Ops Inbox actions, client portal exposure, or runtime behavior changes.
