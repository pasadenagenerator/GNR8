# GNR8 Domain And DNS Operating Model Decision

DDOM-1 canonical architecture decision for the GNR8 MVP domain and DNS operating model.

This is documentation and architecture only. It does not implement runtime behavior, APIs, schemas, migrations, database code, worker code, provider execution, billing behavior, DNS/domain behavior, publish/rollback behavior, asset storage, thumbnails, Generated Proposal Bundles, Workspace runtime, Evolution runtime, AI execution, or deployment configuration.

## Status

Accepted for MVP architecture review.

## Context

GNR8 MVP is an operator-assisted migration factory and website operations backbone for approximately 200 static or mostly static public websites. MVP-1 allows controlled Vercel domain attachment/checking and manual DNS instructions where existing foundations support them, but forbids full registrar/DNS automation, live DNS mutation, Openprovider live mutation, autonomous DNS changes, and AI-driven domain operations.

BMF-1 requires domain readiness to block only the affected custom-domain launch path while import/review work can continue. CCO-1 requires Command Center and Ops Inbox to remain derived read/work surfaces. AAF-1 defines `domain_action` and `domain_exception` approval scopes, domain/DNS audit events, and `domain_action_evidence` / `domain_exception_evidence` packages.

DDOM-1 decides the exact operating boundary for domain intent, internal working hosts, custom domains, manual DNS instructions, Vercel snapshots, external registrar/DNS ownership, stale evidence, launch gating, rollback implications, Openprovider boundaries, and future automation.

## Current Repository Evidence

| Area | Evidence reviewed | DDOM-1 reading |
| --- | --- | --- |
| Domain attach/check route | `apps/platform/app/api/gnr8/agency/clients/[clientId]/sites/[siteId]/domain/route.ts` | Route can normalize a domain, call Vercel add/check helpers, compute DNS instructions, update runtime domain host binding state, and update the ownership `sites.domain` field. DDOM-1 treats this as existing foundation, not a final approval/audit-gated MVP workflow. |
| Vercel client | `apps/platform/src/lib/vercel/vercel-domain-client.ts` | Vercel API calls attach a project domain and read Vercel domain status. Vercel remains authoritative only for Vercel project/domain state. |
| DNS instruction generation | `apps/platform/src/lib/vercel/domain-dns-instructions.ts`, `apps/platform/gnr8/runtime/dns/runtime-dns-readiness-plan.ts` | GNR8 can compute inferred/Vercel-derived DNS instruction snapshots. Instructions are not proof that DNS was changed. |
| Domain verification worker | `apps/worker/gnr8/domain/inngest/domain-verification-job.ts` | Scheduled/manual/publish-triggered checks update pending/verifying bindings from Vercel checks. These are external snapshots with environmental variance. |
| Hosting/domain read models | `apps/platform/gnr8/runtime/hosting-operations/**`, `apps/platform/app/gnr8/command-center/hosting/**` | Hosting views show readiness, internal working domains, custom domains, DNS instructions, recheck controls, diagnostics, assets, and rollback candidates as operator visibility. |
| Internal working host binding | `gnr8_runtime_host_bindings`, `runtime-store.ts`, hosting operations read models | Internal/working hosts are GNR8 runtime reachability bindings. They are separate from customer-owned custom domains. |
| Custom domain binding | `gnr8_runtime_domain_host_bindings`, domain migrations, `runtime-store.ts` | GNR8 stores domain/site/version associations, status, verification fields, Vercel id, last check timestamp, and DNS instruction JSON. |
| Public host resolution | `apps/platform/app/(public)/[[...slug]]/route.ts`, `apps/platform/src/public-site/public-runtime-render.tsx`, `runtime-store.ts` | Public serving resolves host/domain bindings to active runtime artifacts. Serving does not make GNR8 registrar/DNS authority. |
| Publish safety and activation | `publish-activation-orchestrator.ts`, `publish-activation-guard.ts`, `publish-safety-check.ts` | Publish switches runtime active pointer after candidate/artifact safety checks. Domain readiness must be a prerequisite, not publish approval. |
| Rollback | `rollback-switch.ts`, runtime active pointer tests | Rollback switches runtime pointer/content state. It does not change external DNS or registrar state. Domain incidents may require external DNS rollback outside GNR8. |
| Provider control plane | `apps/platform/gnr8/runtime/providers/**`, provider approval/handoff/governance migrations | Provider artifacts are useful governance/readiness foundations but not a universal approval model and not live DNS authority. |
| Openprovider | `apps/platform/gnr8/runtime/providers/openprovider/**` | Domain and DNS inventory helpers are read-only. Sandbox registration probe is admin-only diagnostic and returns `executionAllowed: false`. Openprovider live mutation is forbidden for MVP. |
| DNS provider tests | `apps/platform/gnr8/runtime/dns/*.test.ts` | Mock/sandbox/provider gate tests demonstrate contracts and execution gates, including live execution blocking. They do not authorize live provider mutation. |
| Supabase migrations | Domain host binding, DNS instruction, provider jobs/approvals/handoffs/governance, runtime sites, publish events, audit/cost foundations | Existing tables support partial associations, snapshots, and events. DDOM-1 creates no migrations and claims no new persistence behavior. |
| Documentation | MVP-1, BMF-1, CCO-1, AAF-1, `docs/ai/GNR8_CURRENT_STATE.md`, `docs/ai/MIGRATION_RUNTIME_PROGRESS.md` | Existing docs repeatedly forbid DNS execution/provider execution and require manual DNS/Vercel boundaries, derived Command Center/Ops Inbox semantics, and separate approvals. |

## MVP Decision

For MVP, GNR8 may manage domain operating records, intended launch domains, domain owner notes, internal working hosts, GNR8 runtime host/domain bindings, manual DNS instruction snapshots, DNS-owner evidence, Vercel attachment/check/readiness snapshots where existing foundations support them, Command Center visibility, and derived Ops Inbox domain work items.

For MVP, GNR8 must not claim full registrar/DNS automation, live DNS-zone mutation, live registrar mutation, Openprovider live mutation, autonomous DNS repair, autonomous domain cutover, domain purchase, domain transfer, nameserver mutation, AI-driven DNS/domain mutation, or external DNS source-of-truth ownership.

This decision explicitly allows operator-assisted domain preparation and visibility. It does not authorize implementation work or live provider mutation.

## Non-Goals

- Implementing domain/DNS behavior, APIs, schemas, workers, or provider execution.
- Mutating DNS records at any registrar or DNS provider.
- Purchasing, transferring, renewing, or changing nameservers for domains.
- Treating Vercel checks as registrar/DNS source of truth.
- Treating DNS instruction display as DNS completion.
- Treating Openprovider inventory or provider payloads as write authority.
- Letting AI approve, execute, or repair DNS/domain operations.
- Allowing publish because a domain appears ready without publish activation approval.

## Source-Of-Truth Boundaries

| Subject | Authoritative source | GNR8 MVP role | Non-authoritative surfaces |
| --- | --- | --- | --- |
| Registrar ownership, nameservers, zone truth | External registrar/DNS provider | Store references, owner notes, snapshots, evidence, and follow-up state | GNR8 UI, screenshots, stale external refs, provider payloads |
| Vercel project/domain state | Vercel | Store latest Vercel check/attachment snapshot and required DNS record hints | GNR8 domain readiness badge after stale window |
| GNR8 runtime serving | Active pointer, site version, runtime artifact, published overrides, active host/domain binding | Serve traffic through current runtime state | Preview, Command Center, Ops Inbox, DNS instructions |
| Domain operating association | GNR8 site/domain binding records | Track intended/attached host associations and readiness projection | External registrar page, Vercel UI alone |
| DNS instruction snapshot | GNR8 computed snapshot from current policy/Vercel/inferred values | Show manual work requested of owner | DNS completion proof |
| Approval | Future AAF-1 approval records | Request/cite scoped human decisions | UI badges, external tickets, AI outputs |
| Audit | Future append-only/federated audit events | Cite domain action/check/evidence timeline refs | Logs without actor/scope/evidence |

## Domain/DNS Authority Model

External registrars and DNS providers remain authoritative for registrar and DNS truth. Vercel remains authoritative for Vercel project/domain state. GNR8 stores operating associations, snapshots, instructions, evidence, approvals, audit refs, and readiness projections.

DNS instructions are snapshots, not proof of completion. Vercel checks are snapshots, not registrar/DNS truth. External registrar snapshots are evidence only when freshly captured or manually confirmed, and they still do not become GNR8 truth.

## Vercel Role

Vercel is the hosting/domain attachment authority for the Vercel project. GNR8 may call Vercel add/check helpers where existing implementation supports it, then persist the resulting snapshot and DNS record requirements. A Vercel `active` or `verified` status can satisfy the Vercel readiness dependency while fresh, but it does not prove the registrar owner, nameserver chain, full DNS zone state, SSL state outside Vercel, or publish approval.

Vercel check failures create domain work, not automatic DNS repair.

## GNR8 Role

GNR8 is the operating coordinator. It may:

- record intended launch domain and owner notes;
- distinguish internal/working hosts from external/custom domains;
- bind runtime hosts/domains inside GNR8 records;
- generate and display manual DNS instruction snapshots;
- record client/operator DNS action evidence;
- request/re-run Vercel checks if existing route/workflow support is present;
- store Vercel and provider snapshots with freshness labels;
- project domain readiness and blockers;
- expose Command Center and Ops Inbox visibility;
- cite approvals, audit refs, and evidence packages once implemented.

GNR8 must not be presented as registrar/DNS truth or autonomous DNS operator in MVP.

## External Registrar/DNS Provider Role

The registrar/DNS provider or the client/account owner controlling it owns DNS record mutation, nameserver changes, domain transfer, purchase, renewal, and legal/registrant truth. GNR8 may preserve references and evidence, but any external console screenshot, ticket, or provider inventory is a snapshot and must be labeled with freshness and source.

## Openprovider MVP Boundary

Openprovider is read-only/provider-inventory evidence for MVP. Existing Openprovider inventory helpers explicitly return read-only and execution-blocked results. Sandbox registration probes are admin-only diagnostics and not production mutation.

Openprovider live mutation is forbidden until a later ADR explicitly approves it with provider-specific capability proof, credentials model, approval/audit/evidence gates, rollback/fail-closed semantics, and production readiness. Provider-operation approvals/handoffs do not authorize Openprovider live mutation for MVP.

## Manual DNS Boundary

Manual DNS is the MVP operating path. GNR8 may generate and show record instructions, identify the responsible owner, share instructions, record that an external owner says they acted, and recheck Vercel/domain readiness. GNR8 must not say DNS is complete unless acceptable evidence or a fresh check result supports that label.

Manual DNS action belongs to the DNS owner: client, account manager, technical operator with delegated console access outside GNR8, registrar, or external provider. The UI must show who owns the action.

## Internal/Staging Domain Boundary

Internal/working hosts are GNR8 runtime reachability surfaces. They can support preview, staging, operator review, and exception-based launches when policy allows. They are not customer-owned custom domains and do not prove customer-domain readiness.

Internal-host readiness may satisfy an internal/staging launch path or a domain exception, but it does not authorize custom-domain publish.

## Custom Domain Boundary

Custom domains are customer or external-provider controlled unless a later ADR says otherwise. Custom-domain MVP handling consists of recording intent, generating instructions, Vercel attachment/check snapshots, manual DNS evidence, and readiness projection. Custom-domain publish requires fresh domain readiness or explicit exception plus separate publish activation approval.

## Readiness Model

Domain readiness is a derived projection from intended domain, owner evidence, internal host availability, GNR8 bindings, DNS instruction freshness, DNS action evidence, Vercel check snapshot, SSL/readiness snapshot where available, exceptions, and stale/failure policy.

Domain readiness is a publish prerequisite, not publish approval. Domain action approval does not equal publish activation approval. Domain exception approval does not equal DNS mutation approval.

## Stale-Status Model

- DNS instructions are stale when provider, Vercel state, intended domain, binding, policy, or timestamp changes.
- Vercel checks are stale when TTL expires or binding/domain changes.
- External registrar snapshots are stale unless freshly captured or manually confirmed.
- Domain readiness is stale when any dependency changes.
- Stale domain evidence must not enable publish without explicit domain exception and separate publish activation approval.

## Approval Model

DDOM-1 adopts AAF-1 scopes:

| Approval | Allows | Does not allow |
| --- | --- | --- |
| `domain_action` | Named GNR8 domain binding, instruction, check, owner-evidence, or Vercel action inside MVP boundary | DNS/registrar mutation, publish activation, Openprovider live mutation |
| `domain_exception` | Proceeding despite a domain blocker under a stated exception, such as internal-host launch or accepted stale external evidence | DNS mutation, registrar truth, publish activation |
| `launch_signoff` | Client/agency acceptance of launch context | Publish activation or DNS mutation |
| `publish_activation` | One active pointer activation attempt after all gates | Future publishes, DNS mutation, rollback |
| `rollback` | Named incident/recovery rollback | DNS rollback at registrar/provider |

## Audit Model

Future implementation must audit domain/DNS events with actor, role, scope, domain binding refs, instruction/check refs, source watermarks, freshness labels, approval refs, evidence package refs, correlation id, outcome, and redaction label.

Minimum event names should align with AAF-1, including `domain.binding_requested`, `domain.binding_created`, `dns.instructions_generated`, `dns.check_requested`, `dns.check_completed`, `domain.verified`, `domain.exception_approved`, and `provider.live_blocked`.

## Evidence Package Model

Domain approvals use `domain_action_evidence` and `domain_exception_evidence`. Publish approvals may cite domain evidence through `publish_activation_evidence`, but the publish evidence package must remain separate and very short-lived.

Evidence packages must show what the domain evidence proves and does not prove, freshness labels, source refs, external ownership, privacy/redaction limits, and replay/recheck behavior.

## Publish Gate Relationship

Domain readiness is required before custom-domain publish unless an explicit exception is approved. It is not publish approval. Publish readiness must also require approved version/artifact/content, preview/readiness evidence, launch approval, rollback target or recovery plan, no critical incident, cost status, and publish activation approval.

Publishing because a domain appears ready without publish approval is forbidden.

## Rollback/Recovery Relationship

GNR8 rollback changes runtime active pointer and/or content state. It does not mutate DNS, registrar state, Vercel project membership, nameservers, or Openprovider records. If a launch issue is caused by external DNS cutover, recovery may require an external DNS owner to revert records or route traffic back outside GNR8. GNR8 may record that plan, evidence, and incident state, but must not claim it performed external DNS rollback.

## Command Center Relationship

Command Center shows domain intent, owner, internal working host, custom domain binding, DNS instructions, freshness, Vercel check snapshot, readiness blockers, exceptions, evidence refs, allowed/prohibited actions, and drilldowns. It is a derived operator surface and not source of truth.

## Ops Inbox Relationship

Ops Inbox derives domain items such as `domain_action_needed`, `dns_verification_failed`, `approval_needed`, `publish_readiness_failed`, `external_workflow_update`, and `incident_open`. An item resolves only when underlying GNR8 state changes or an audited decision says the work is no longer required.

## Cost Relationship

Domain checks and provider inventory reads may contribute operational cost or rate-limit risk if later logged. Existing cost foundations are internal visibility, not customer billing truth. Cost exceptions never authorize DNS mutation, publish, or provider execution unless separately scoped.

## External Workflow Relationship

External tickets, emails, spreadsheets, registrar screenshots, support conversations, and CRM notes may be linked as references or accepted as evidence. They do not become GNR8 approval truth or DNS source of truth. Stale external references cannot unblock publish without explicit GNR8 exception and publish approval.

## Future AI Advisory Relationship

AI may later review a domain checklist, summarize evidence gaps, or suggest a human follow-up plan. AI must not approve, mutate, repair, attach, purchase, transfer, publish, roll back, close Ops Inbox items, or claim DNS completion. Future AI advisory requires immutable input/output bundles and human acceptance as advisory evidence only.

## Future Automation Path

Future registrar/DNS automation requires a new ADR before implementation. That ADR must define provider-specific live capabilities, credential custody, write scopes, dry-run-to-live promotion, idempotency, failure compensation, audit events, approval scopes, evidence packages, Command Center/Ops Inbox semantics, rollback/recovery, rate limits, cost, privacy, and a production launch plan.

## Implementation Prerequisites

Before any expansion of domain workflows, GNR8 must implement or verify:

1. canonical approval request/decision persistence for domain scopes;
2. append-only audit write path for domain/DNS events;
3. evidence package creation and freshness/staleness checks;
4. role/scope policy for technical operator, superadmin, account manager, client DNS owner, and agency admin;
5. clear TTL policy for Vercel checks and DNS instructions;
6. domain owner evidence model and external reference redaction;
7. publish gate integration that treats domain readiness as prerequisite only;
8. incident/recovery model for DNS/cutover failures;
9. fail-closed behavior when audit, approval, Vercel, or source state is unavailable;
10. provider-live mutation ADR before Openprovider or any DNS provider write action.

## Architecture Risks

- Existing route code can call Vercel and update domain records before the future unified approval/audit model exists.
- Lifecycle vocabulary includes purchase/transfer/provider API concepts that must remain future/planning labels for MVP.
- Vercel `active` status can be misunderstood as registrar/DNS truth.
- DNS instructions can be misunderstood as DNS completion.
- External screenshots and tickets can drift quickly.
- Domain readiness badges can be mistaken for launch or publish approval.
- Rollback can restore runtime content but cannot undo external DNS cutover.
- Openprovider inventory can be overread as write readiness.

## Explicit Deferrals

- Live DNS record mutation.
- Live registrar mutation.
- Domain purchase, renewal, or transfer.
- Nameserver mutation.
- Openprovider live write execution.
- Automatic DNS repair.
- Autonomous domain cutover.
- AI-driven DNS/domain actions.
- Provider credential custody for live writes.
- Domain-specific cost automation.
- Implementation of new domain approvals, audits, schemas, queues, or UI behavior.

## Required Conclusion

DDOM-1 makes domain and DNS operations safe for an operator-assisted 200-site migration MVP by separating external DNS/registrar truth, Vercel project/domain snapshots, GNR8 operating records, manual DNS instructions, evidence, approval, audit, readiness, publish gates, rollback recovery, Command Center visibility, Ops Inbox work, and future automation.

The MVP boundary is manual/operator-assisted domain coordination plus Vercel snapshots where existing foundations support them. Full DNS/registrar automation, Openprovider live mutation, autonomous DNS repair, AI-driven DNS actions, and domain purchase/transfer are outside MVP and forbidden until a later ADR explicitly authorizes them.
