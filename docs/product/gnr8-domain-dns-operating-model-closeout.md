# GNR8 Domain DNS Operating Model Closeout

DDOM-1 closeout for the Domain and DNS Operating Model Decision.

This was a documentation and architecture phase only. No runtime behavior, APIs, route handlers, schemas, migrations, database code, worker code, queue code, provider execution, billing code, DNS/domain code, publish/rollback implementation, asset storage implementation, thumbnail code, Generated Proposal Bundle runtime, Workspace runtime, Evolution runtime, AI execution code, or deployment configuration was intentionally changed.

## Documents Created Or Updated

Created:

- `docs/architecture/gnr8-domain-dns-operating-model-decision.md`
- `docs/architecture/gnr8-domain-dns-mvp-boundary.md`
- `docs/architecture/gnr8-domain-dns-readiness-and-evidence-model.md`
- `docs/product/gnr8-domain-dns-operator-workflow.md`
- `docs/product/gnr8-domain-dns-operating-model-closeout.md`

Updated:

- `docs/ai/GNR8_CANONICAL_DOC_INDEX.md` with DDOM-1 references only.

## Baseline Verification Status

MVP-1 files were present and readable. Targeted git status showed the MVP-1 files are tracked and already modified in the working tree.

BMF-1 files were present and readable. Targeted git status showed the BMF-1 files are tracked and already modified in the working tree.

CCO-1 files were present and readable. Targeted git status showed the CCO-1 files are present but untracked in the working tree.

AAF-1 files were present and readable. Targeted git status showed the AAF-1 files are present but untracked in the working tree.

DDOM-1 treated all pre-existing modified/untracked baseline docs as user-side baseline state and did not rewrite them.

## Current Domain/DNS Implementation Evidence Reviewed

Read-only evidence reviewed:

- domain attach/check route: `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/domain/route.ts`;
- domain verification worker: `apps/worker/gnr8/domain/inngest/domain-verification-job.ts`;
- Vercel helpers: `apps/platform/src/lib/vercel/vercel-domain-client.ts`, `apps/platform/src/lib/vercel/domain-dns-instructions.ts`;
- runtime domain/host bindings and host resolution: `apps/platform/gnr8/runtime/runtime-store.ts`, `apps/platform/app/(public)/[[...slug]]/route.ts`, `apps/platform/src/public-site/public-runtime-render.tsx`;
- domain/readiness models: `apps/platform/gnr8/runtime/readiness/runtime-domain-readiness.ts`, `apps/platform/gnr8/runtime/dns/**`, `apps/platform/gnr8/runtime/domains/**`;
- hosting operations and Command Center hosting surfaces: `apps/platform/gnr8/runtime/hosting-operations/**`, `apps/platform/app/gnr8/command-center/hosting/**`;
- publish and rollback primitives: `apps/platform/gnr8/runtime/publish-activation-orchestrator.ts`, `apps/platform/gnr8/runtime/publish-activation-guard.ts`, `apps/platform/gnr8/runtime/publish-safety-check.ts`, `apps/platform/gnr8/runtime/rollback-switch.ts`;
- Openprovider inventory/read-only modules: `apps/platform/gnr8/runtime/providers/openprovider/**`;
- provider approval/handoff/governance artifacts: `apps/platform/gnr8/runtime/providers/**`;
- tests for domain/readiness/DNS/provider gates;
- Supabase migrations for runtime domain bindings, DNS instructions, provider jobs/approvals/handoffs/governance, runtime sites, publish events, cost events, and ownership;
- docs mentioning Vercel, Openprovider, DNS, domains, registrar, nameservers, verification, SSL, custom domains, and manual DNS.

## Final Domain/DNS Operating Model Decision

For MVP, GNR8 manages operating records, intended launch domains, domain owner notes, internal working hosts, GNR8 host/domain bindings, manual DNS instruction snapshots, DNS-owner evidence, Vercel attachment/check/readiness snapshots where existing foundations support them, Command Center visibility, and derived Ops Inbox items.

For MVP, GNR8 does not manage external registrar/DNS truth, live DNS-zone mutation, live registrar mutation, Openprovider live mutation, autonomous DNS repair, autonomous domain cutover, domain purchase, domain transfer, nameserver mutation, AI-driven DNS mutation, or external provider source-of-truth ownership.

## MVP Boundary Summary

In scope: record intent/owner, distinguish internal/custom hosts, generate and display manual DNS instructions with freshness, request/re-run supported Vercel checks with later approval/audit gates, record DNS action evidence, record domain exceptions, block publish when domain readiness is stale/failed, show blockers in Command Center, derive Ops Inbox work, and preserve external/Openprovider snapshots as read-only evidence.

## Out-Of-Scope Summary

Forbidden: live DNS mutation, live registrar mutation, purchase, transfer, nameserver mutation, Openprovider live writes, automatic DNS repair, autonomous domain cutover, AI-driven domain/DNS changes, treating instructions as completion, treating Vercel checks as registrar/DNS truth, and publishing from domain readiness without publish approval.

## Readiness/Evidence Model Summary

Domain readiness states are defined from `no_domain_intent` through `domain_archived`, including DNS owner, instruction, client action, Vercel check, SSL, ready, exception, stale, failed, and deferred states. Evidence objects define what each artifact proves, what it does not prove, freshness/staleness rules, source-of-truth relationship, refs, redaction concerns, and recheck behavior.

## Operator Workflow Summary

The operator workflow covers recording intended domains, identifying DNS owner, choosing internal/staging vs custom domain, generating/sharing instructions, recording DNS action evidence, requesting/re-running and interpreting Vercel checks, handling stale/failed verification, requesting domain approvals/exceptions, preparing publish readiness, handling domain publish blockers, post-publish incidents, rollback/cutover issues, external registrar/provider refs, Openprovider inventory, escalation, and future AI advisory checklist review only.

## Source-Of-Truth Conclusions

External registrars/DNS providers remain authoritative for registrar and DNS truth. Vercel remains authoritative for Vercel project/domain state. GNR8 stores operating associations, snapshots, instructions, evidence, approvals, audit refs, and readiness projections.

## Boundary Conclusions

Vercel snapshots can satisfy only the Vercel readiness dependency while fresh. Openprovider is read-only inventory/diagnostic evidence for MVP. Manual DNS is the operating path. DNS instructions are not completion. Domain readiness is a publish prerequisite, not publish approval. Domain action approval does not equal publish activation approval. Domain exception approval does not equal DNS mutation approval.

## Approval, Audit, Evidence Conclusions

DDOM-1 adopts AAF-1 `domain_action`, `domain_exception`, `launch_signoff`, `publish_activation`, `rollback`, external reference acceptance, and AI advisory acceptance boundaries. Future implementation must record scoped approvals, append-only audit events, evidence package refs, source watermarks, freshness labels, limitations, and redaction classes.

## Publish/Rollback Conclusions

Custom-domain publish requires fresh domain readiness or explicit domain exception, then separate publish activation approval. Runtime rollback switches GNR8 active pointer/content state; it does not change external DNS. DNS/cutover incidents may require external DNS owner rollback recorded as evidence/follow-up.

## Command Center/Ops Inbox Conclusions

Command Center displays derived domain state, freshness, blockers, evidence, and allowed/prohibited actions. Ops Inbox derives domain work items such as `domain_action_needed`, `dns_verification_failed`, `approval_needed`, `publish_readiness_failed`, `external_workflow_update`, and `incident_open`. Neither surface is source of truth.

## Cost/External Workflow/AI Advisory Conclusions

Domain checks and provider reads may later produce internal operating cost or rate-limit signals, not customer billing truth. External workflow refs are evidence only after GNR8 acceptance and never approval truth. AI advisory is future checklist review only and cannot mutate or approve domain/DNS actions.

## Explicit Deferrals

- Domain/DNS implementation.
- Approval/audit/evidence persistence implementation.
- Live DNS mutation.
- Live registrar mutation.
- Domain purchase, transfer, renewal, and nameserver changes.
- Openprovider live mutation.
- Provider live credential/write model.
- Automatic DNS repair and autonomous cutover.
- AI-driven DNS/domain operations.
- Command Center/Ops Inbox implementation.
- Publish/rollback implementation changes.
- Billing, storage, thumbnail, Workspace, Evolution, Generated Proposal Bundle, or AI execution work.

## Architecture Warnings

- Existing code can call Vercel add/check helpers and update domain bindings, but the final MVP workflow still needs AAF-1 approval/audit/evidence gates before expansion.
- Existing domain lifecycle vocabulary includes future purchase/transfer/provider actions; these are not MVP live actions.
- Vercel readiness can be overread as DNS truth.
- DNS instructions can be overread as completion.
- Openprovider read-only inventory can be overread as write readiness.
- Runtime rollback cannot undo DNS cutover at an external provider.

## Recommended Next Milestone

Recommended next milestone: Audit/Approval implementation design.

Reason: Domain/DNS implementation should not proceed until the AAF-1 approval, audit, and evidence contracts have an implementation design that can gate existing Vercel/domain actions, domain exceptions, publish activation, rollback, and external evidence acceptance. Command Center implementation design should follow or run after the gating contract is clear. Domain/DNS implementation design should come after approval/audit implementation design.

## Validation Performed

DDOM-1 validation confirmed:

- all required DDOM-1 files exist and are readable;
- only Markdown documentation and the canonical index were changed by DDOM-1;
- no runtime code, APIs, schemas, migrations, database code, workers, queues, provider execution, billing code, DNS/domain code, publish/rollback code, asset storage, thumbnails, Generated Proposal Bundles, Workspace runtime, Evolution runtime, AI execution code, or deployment configuration were modified by DDOM-1;
- DDOM-1 does not claim implementation;
- the main decision states the MVP boundary;
- the out-of-scope table forbids live DNS mutation, registrar mutation, Openprovider live mutation, autonomous DNS repair, AI-driven DNS mutation, domain purchase, and domain transfer;
- the readiness model includes all required states;
- the evidence model includes all required evidence objects;
- the operator workflow includes all required workflows;
- MVP-1 source-of-truth boundaries remain aligned;
- BMF-1 workflow and failure semantics are preserved;
- CCO-1 Command Center/Ops Inbox derived-only semantics are preserved;
- AAF-1 approval/audit/evidence package semantics are preserved;
- no autonomous migration, live DNS/registrar mutation, full Stripe billing, autonomous AI execution, autonomous regeneration, or storage migration is claimed as MVP behavior;
- `git diff --check` passed for the canonical index update;
- no-index whitespace checks produced no errors for the new untracked DDOM-1 Markdown files;
- no configured Markdown linter/readability command was found, so no new tooling was introduced.

## Commands Run

DDOM-1 used read-only/documentation validation commands only, including:

- `rg --files ...`
- `rg -n ...`
- `rg -ni ...`
- `sed -n ...`
- `test -r ...`
- `git status --short`
- `git ls-files ...`
- `git diff --check -- <DDOM-1 docs and index>`
- `git diff --check --no-index /dev/null <DDOM-1 doc>`

## Confirmation

DDOM-1 is documentation and architecture only. No runtime behavior was changed.
