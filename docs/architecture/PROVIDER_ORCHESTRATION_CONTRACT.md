# GNR8 Provider Orchestration Contract (Architecture Draft)

## Status
- Draft: canonical architecture direction
- Scope: documentation and contract language only
- Non-goals: no runtime changes, no API changes, no provider execution changes

## Canonical Credential Reference Contract
Credential reference architecture is now canonicalized in:
- `docs/architecture/CREDENTIAL_REFERENCE_CONTRACT.md`

Alignment rules:
- Credential Reference is metadata only and contains no secrets.
- Credential Reference is not credential material, not secret material, and not authorization.
- Credential reference states are canonicalized as:
  - `missing`
  - `configured_reference_only`
  - `resolution_disabled`
  - `resolution_ready`
  - `execution_blocked`
- Provider orchestration must treat credential reference as design-only at this stage:
  - no credential storage
  - no secret resolution
  - no execution enablement

## Canonical Secret Resolution Architecture
Secret resolution architecture is now canonicalized in:
- `docs/architecture/SECRET_RESOLUTION_ARCHITECTURE.md`

## Canonical Authorization Context Contract
Authorization context architecture is now canonicalized in:
- `docs/architecture/AUTHORIZATION_CONTEXT_CONTRACT.md`

## Canonical Execution Approval Contract
Execution approval architecture is now canonicalized in:
- `docs/architecture/EXECUTION_APPROVAL_CONTRACT.md`

Alignment rules:
- authorization context is temporary, scoped, and redacted provider access context
- authorization context != secret
- authorization context != provider execution
- authorization context != mutation approval
- authorization context != permanent credential
- authorization context must carry explicit execution gating (`executionAllowed`, `executionBlocked`)
- authorization context lifecycle is explicit (`requested`, `validated`, `issued`, `expired`, `revoked`, `rejected`)

Alignment rules:
- secret resolution is future architecture only
- credential reference != secret
- secret resolution != provider execution
- authorization context != permission to mutate
- future resolver outputs must include explicit execution gating (`executionAllowed`, `executionBlocked`)
- execution approval is a governed authorization decision, not execution itself
- execution approval != authorization context
- execution approval != secret resolution
- approval must be provider-bound, environment-bound, capability-bound, operation-bound, and time-bound

## Latest Milestone
Provider Contract Registry Extraction is complete.

AI Provider Routing Architecture Draft is complete (docs/read-model only):
- `docs/architecture/AI_PROVIDER_ROUTING_ARCHITECTURE.md`
- AI provider routing metadata scaffolded in:
  - `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts`
  - `apps/platform/gnr8/runtime/providers/provider-contract-registry.test.ts`

Canonical registry artifacts:
- `apps/platform/gnr8/runtime/providers/provider-contract-registry.ts`
- `apps/platform/gnr8/runtime/providers/provider-contract-registry.test.ts`

Current UI consumers:
- `apps/platform/app/gnr8/admin/providers/page.tsx`
- `apps/platform/app/gnr8/admin/providers/provider-fleet-view.tsx`

Provider Credential Boundary Advisor is implemented in Provider Fleet (UI/read-model/docs only):
- visible-by-default governance advisory section:
  - `Provider Credential Boundary Advisor`
- advisory cards:
  - `Current State`
  - `Current Limitations`
  - `Missing Requirements`
  - `Recommended Next Step`
- advisory boundary note:
  - Credential governance is preview-only.
  - No secrets are stored, resolved, or exposed.
- governance guarantees preserved:
  - no credential storage
  - no secret management
  - no secret resolution
  - no provider execution
  - no writes

Provider Execution Governance Chain Preview is implemented in Provider Fleet (UI/read-model/docs only):
- visible-by-default governance sequence section:
  - `Provider Execution Governance Chain Preview`
- stages and states:
  - `Provider Contract` -> `modeled`
  - `Credential Reference` -> `previewed`
  - `Secret Resolution` -> `design_only_disabled`
  - `Authorization Context` -> `design_only_not_issued`
  - `Execution Approval` -> `design_only_not_requested`
  - `Execution` -> `blocked`
- badge mapping:
  - `modeled` / `previewed` -> success
  - `design_only_disabled` / `design_only_not_issued` / `design_only_not_requested` -> warning
  - `blocked` -> critical
- advisory boundary note:
  - This chain is governance preview only.
  - No secrets, approvals, authorization contexts, or executions are created.

Current scope:
- deterministic read-model registry
- no runtime provider execution
- no provider APIs added
- no writes
- no queue/worker execution
- no runtime AI orchestration
- environment-awareness preview metadata in provider contracts (`environmentScope`, `bindingScope`)
- credential boundary preview metadata in provider contracts (`credentialBoundary`)

## Purpose
Define the first canonical contract for how GNR8 should evolve into a multi-provider orchestration and control-plane layer across domain, DNS, availability, and execution provider surfaces.

## Canonical Provider Contract Registry
Provider Fleet must consume canonical provider contracts from a runtime registry, not inline UI objects.

Canonical contract fields:
- `providerId`
- `displayName`
- `providerType`
- `providerCategory`
- `environment`
- `environmentScope`
- `bindingScope`
- `status`
- `capabilities`
- `readiness`
- `boundaries`
- `advisor`
- `credentialBoundary`
- `links`

Credential boundary preview model (control-plane only):
- `credentialBoundary.credentialsRequired`: `boolean`
- `credentialBoundary.credentialStatus`: `not_required` | `missing` | `configured_reference_only`
- `credentialBoundary.secretResolution`: `disabled`
- `credentialBoundary.bindingRequired`: `none` | `global` | `agency` | `project` | `environment`
- current expected mapping:
  - Openprovider: `credentialsRequired:true`, `credentialStatus:configured_reference_only`, `secretResolution:disabled`, `bindingRequired:global`
  - placeholder providers: `credentialsRequired:true`, `credentialStatus:missing`, `secretResolution:disabled`, `bindingRequired:global`
- governance boundary:
  - read-model only preview
  - no secrets stored
  - no secret resolution
  - no provider execution

Environment awareness preview model (control-plane only):
- `environmentScope`: `global` | `sandbox` | `preview` | `staging` | `production`
- `bindingScope`: `global` | `agency` | `project` | `environment`
- current expected mapping:
  - Openprovider: `environmentScope: sandbox`, `bindingScope: global`
  - placeholder providers: `environmentScope: global`, `bindingScope: global`
- governance boundary:
  - no tenant credential management
  - no provider execution

Current providers in registry:
- Registrar / Domain Providers: `Openprovider`, `Realtime Register`, `INWX`, `Netim`
- Deployment Providers: `Vercel`, `Netlify`, `Railway`
- Communication Providers: `Resend`, `Proton Mail`, `Microsoft 365`
- ERP / Accounting Providers: `Pantheon`
- Edge Infrastructure Providers: `Cloudflare`
- Commerce / Billing Providers: `Stripe`, `Paddle`, `Polar`
- Execution Providers: `Inngest`, `Trigger.dev`, `Temporal`
- Source Control Providers: `GitHub`, `GitLab`
- AI Providers: `OpenAI`, `Anthropic`, `Gemini`, `Groq`, `Mistral`
- Storage / Data Providers: `Supabase`, `R2`, `S3`
- Identity Providers: `Clerk`, `Auth0`, `Supabase Auth`

Openprovider links currently modeled:
- `cockpit`
- `domains`
- `dns`

## Provider Capability
Provider capability expresses what a provider can do at the contract level.

Canonical capability vocabulary is now category-aware:
- Registrar: `domains`, `dns`, `availability`, `registration`, `execution`
- Deployment: `deployments`, `previews`, `rollbacks`, `domains`, `environment_variables`
- Communication: `email_delivery`, `transactional_email`, `inbound_email`, `domains`, `webhooks`
- ERP / Accounting: `accounting`, `invoicing`, `bookkeeping`, `tax`, `synchronization`
- Edge Infrastructure: `dns`, `edge_compute`, `object_storage`, `cdn`, `routing`
- Commerce: `billing`, `subscriptions`, `invoices`, `webhooks`, `checkout`
- Execution: `jobs`, `workflows`, `retries`, `schedules`, `events`
- Source Control: `repositories`, `branches`, `pull_requests`, `webhooks`, `commits`
- AI: `model_metadata`, `routing_policy`, `inference`, `embeddings`, `multimodal`
- Storage: `database`, `object_storage`, `backups`, `vector_search`, `file_storage`
- Identity: `auth`, `users`, `sessions`, `oauth`, `sso`

Notes:
- Capability presence does not imply execution permission.
- Capability flags are discovery and routing inputs for orchestration.

## Provider Readiness
Provider readiness expresses operational confidence and lifecycle maturity for a provider/capability pair.

Canonical readiness states:
- `sandbox_verified`
- `production_verified`
- `read_only`
- `execution_enabled`
- `control_plane_only`

Notes:
- Readiness is declarative evidence, not an implicit permission grant.
- `execution_enabled` is future-state only and must remain governed.

## Provider Boundary
Provider boundary expresses what is currently allowed for a provider/capability path.

Canonical boundary states:
- `read_only`
- `mutation_allowed`
- `approval_required`
- `execution_blocked`

Notes:
- Boundaries are enforceable policy constraints.
- Boundary evaluation should fail closed when state is incomplete or contradictory.

## Provider Execution Governance
Future execution governance is approval-driven and evidence-first.

Required governance concepts:
- Approval flow:
  - explicit operator and governance checkpoints before any mutation-capable execution
  - canonical approval contract fields and lifecycle must be satisfied before execution is allowed
- Execution plans:
  - deterministic, inspectable plan artifacts before execution intent
- Dry-run/simulation:
  - simulation-first path that can be inspected without provider mutation
- Rollback expectations:
  - defined compensation/rollback posture per provider capability
- Audit trail:
  - immutable event trail for decisions, intents, and outcomes
- Provider mutation review:
  - pre-mutation review surface with boundary/readiness/governance evidence

## Provider Orchestration
Future orchestration should normalize heterogeneous providers behind canonical contracts.

Required orchestration concepts:
- Provider abstraction:
  - provider-specific behavior behind a canonical orchestration interface
- Capability normalization:
  - common capability semantics across providers
- Provider routing:
  - deterministic provider selection by capability, readiness, policy, and priority
- Failover:
  - controlled fallback when a primary provider is unavailable or degraded
- Provider priority:
  - ordered routing strategy with explicit tie-break rules
- Capability discovery:
  - runtime-discoverable capability/readiness/boundary metadata

## Provider Identity
Canonical provider identity model:

```ts
type ProviderIdentity = {
  providerId: string;
  providerType: "domain" | "dns" | "availability" | "execution" | "multi";
  environment: "sandbox" | "production";
  capabilities: string[];
  readiness: string[];
  boundaries: string[];
};
```

Identity semantics:
- `providerId`: stable unique identifier in GNR8 control plane
- `providerType`: primary functional category
- `environment`: contract context for readiness and boundary interpretation
- `capabilities`: declared contract surface
- `readiness`: verified maturity states
- `boundaries`: enforceable execution/mutation limits

## Current Reality (2026-05-28)
- Openprovider is the current reference implementation.
- Current provider surfaces are read-only.
- Execution remains blocked.
- No mutation orchestration exists yet.
- Multi-provider routing/failover abstraction is not implemented yet.
- Provider Fleet now reads provider contracts from canonical registry data, not inline UI definitions.

## Future Direction
GNR8 should evolve into a provider orchestration and control-plane layer above multiple infrastructure providers.

Direction principles:
- Vendor-neutral capability contracts
- Explicit readiness and boundary policy
- Approval-governed execution
- Deterministic routing and failover behavior
- Auditability by default

Global provider control-plane expansion targets:
- registrar/domain providers
- deployment providers
- communication providers
- ERP/accounting providers
