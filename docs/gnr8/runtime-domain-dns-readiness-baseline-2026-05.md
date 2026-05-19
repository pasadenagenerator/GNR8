# GNR8 Runtime/Domain/DNS Readiness Baseline - 2026-05

Date: 2026-05-18  
Scope: `apps/platform` + `docs` evidence only. No runtime behavior mutation.

## Purpose

Freeze the deterministic baseline for runtime identity, runtime/domain readiness, DNS provider abstraction, and DNS readiness planning before moving toward real domain/provider integrations.

## Baseline Areas

### 1) Runtime identity helpers

- Source: `apps/platform/gnr8/runtime/identity/runtime-identity.ts`
- Deterministic normalization is in place for host/domain/path and identity tokens.
- Correlation keys are stable and hash-based for equivalent inputs.
- Preview/domain identity surfaces are strategy-safe and side-effect free.

### 2) Runtime resolution strategies

- Source: `apps/platform/gnr8/runtime/resolution/runtime-resolution.ts`
- Active strategies: `latest_imported`, `active`, `published`, `preview`.
- Deterministic fallback chains remain unchanged:
  - `published -> active -> latest_imported`
  - `preview -> active -> latest_imported`

### 3) Runtime site readiness

- Source: `apps/platform/gnr8/runtime/readiness/runtime-site-readiness.ts`
- Status model remains: `ready | ready_with_warnings | blocked`.
- Candidate/version-pointer signals determine readiness deterministically.

### 4) Runtime domain readiness

- Source: `apps/platform/gnr8/runtime/readiness/runtime-domain-readiness.ts`
- Status model remains: `ready | ready_with_warnings | blocked`.
- Domain readiness depends on domain identity signals + binding activity; no external provider coupling.

### 5) DNS provider abstraction

- Source: `apps/platform/gnr8/runtime/dns/dns-provider-types.ts`
- Provider IDs baseline:
  - `mock_provider`
  - `manual`
  - `openprovider`
  - `realtime_register`
  - `netim`
  - `inwx`
- Provider contract/capability registry is present and deterministic:
  - active adapters: `mock_provider`, `manual`, `openprovider`
  - placeholders only: `realtime_register`, `netim`, `inwx`

### 6) DNS readiness planning

- Source: `apps/platform/gnr8/runtime/dns/runtime-dns-readiness-plan.ts`
- Planning operates in strategy-only mode from readiness reports.
- Manual provider emits manual step guidance when records are planned.
- Supported plan intents include internal preview host, custom apex/www, and verification TXT.

### 6a) Provider adapter contract harness

- Source: `apps/platform/gnr8/runtime/dns/provider-adapter-contract-test.ts`
- Harness validates adapter contract behavior deterministically against fixture input.
- Manual adapter fixture behavior baseline:
  - fixture provider: `manual`
  - deterministic fixture zone/domain + TXT verification record
  - repeated invocations produce stable check ordering/correlation behavior
- Mock provider adapter behavior baseline:
  - fixture provider: `mock_provider`
  - deterministic availability rules:
    - unavailable: domains ending `.unavailable.test` or containing `taken`
    - reserved: domains ending `.reserved.test` or starting `reserved.`
  - deterministic zone ref: `mock_zone_<hash20>`
  - deterministic record ref: `mock_record_<hash20>`
  - deterministic verification:
    - expected value format: `verify_<hash20>`
    - `verified: true` only when record value equals expected deterministic verification value
  - delete behavior is deterministic and side-effect free (`deleted: true`)
- Openprovider sandbox adapter behavior baseline:
  - fixture provider: `openprovider`
  - deterministic availability rules:
    - unavailable: domains ending `.unavailable.test`
    - unavailable: domains containing `reserved`, `taken`, or `blocked`
    - available: all other domains
  - deterministic zone ref: `openprovider_sandbox_zone_<hash>`
  - deterministic record ref: `openprovider_sandbox_record_<hash>`
  - deterministic verification:
    - expected value is deterministic for zone + record input
    - `verified: true` only when record value equals expected deterministic verification value
  - implementation readiness:
    - `ready_for_sandbox`
    - not live-ready
  - sandbox descriptor baseline:
    - `mode: mock`
    - `liveEligible: false`
  - no external execution boundary:
    - no `fetch`
    - no `axios`
    - no SDK
    - no env/credential reads
    - no DNS writes
- Contract status output is explicit: `contractStatus: pass | fail`.
- No-network-call boundary:
  - harness enforces adapter contract checks without external DNS/registrar calls
  - network behavior is treated as disallowed in this baseline harness

### 6b) Provider implementation readiness baseline

- Source: `apps/platform/gnr8/runtime/dns/provider-implementation-readiness.ts`
- Readiness model baseline:
  - `readinessStatus: ready_for_mock | ready_for_sandbox | blocked`
  - checklist keys:
    - `capability_defined`
    - `adapter_registered`
    - `contract_passes`
    - `credentials_not_required_for_contract`
    - `sandbox_mode_required_before_live`
    - `no_live_execution_enabled`
- Manual provider baseline:
  - `providerId: manual`
  - `readinessStatus: ready_for_mock`
  - all checklist keys satisfied
- Mock provider baseline:
  - `providerId: mock_provider`
  - `readinessStatus: ready_for_sandbox`
  - checklist keys satisfied for capability/adapter/contract; still bounded by no-live-execution gate
- Future provider baseline:
  - `openprovider` baseline is `ready_for_sandbox` and not live-ready
  - `realtime_register`, `netim`, `inwx` remain `blocked`
  - baseline reason: adapters are not registered yet
- Control-plane boundary:
  - readiness validation remains no-network and no-live-execution
  - sandbox readiness is required before any future live-provider path

### 6c) Provider credentials boundary baseline

- Source: `apps/platform/gnr8/runtime/dns/provider-credentials-boundary.ts`
- Credentials boundary environments:
  - `contract`
  - `sandbox`
  - `live`
- Safety statuses:
  - `safe`
  - `warning`
  - `blocked`
- Manual provider boundary:
  - no credentials are required in this phase
  - `contract` environment remains `safe`
- Non-manual provider boundary:
  - `contract`: `safe` without credentials
  - `sandbox`: required credential names are enforced, missing names are reported; credential values are not required
  - `live`: blocked in this phase even if credential names are present
- Openprovider credential contract baseline:
  - sandbox credential names:
    - `OPENPROVIDER_SANDBOX_USERNAME`
    - `OPENPROVIDER_SANDBOX_PASSWORD`
  - live credential names:
    - `OPENPROVIDER_LIVE_USERNAME`
    - `OPENPROVIDER_LIVE_PASSWORD`
  - `contract` environment requires no credentials
  - `sandbox` reports missing credential names without requiring values
  - `live` remains blocked regardless of credential presence
  - secret-like credential values are forbidden
  - output never leaks credential values
- Secret boundary:
  - secret-like credential values are forbidden and produce blocked status
  - boundary validates names/shape only; no secret values are persisted
- Control-plane boundary:
  - no secret storage
  - no external API/DNS/registrar calls during credential-boundary evaluation

### 6d) Provider sandbox adapter descriptor baseline

- Source: `apps/platform/gnr8/runtime/dns/provider-sandbox-adapters.ts`
- Descriptor model baseline:
  - `providerSandboxAdapterDescriptor.mode: manual | mock | sandbox_disabled | live_blocked`
  - `providerSandboxAdapterDescriptor.adapterAvailable`
  - `providerSandboxAdapterDescriptor.sandboxEligible`
  - `providerSandboxAdapterDescriptor.liveEligible`
- Manual provider descriptor baseline:
  - `providerId: manual`
  - `mode: manual`
  - `adapterAvailable: true`
  - `sandboxEligible: false`
  - `liveEligible: false`
- Mock provider descriptor baseline:
  - `providerId: mock_provider`
  - `mode: mock`
  - `adapterAvailable: true`
  - `sandboxEligible`: environment-dependent and deterministic from readiness + credential boundary + gate
  - `liveEligible: false`
- Openprovider sandbox descriptor baseline:
  - `providerId: openprovider`
  - `mode: mock`
  - `adapterAvailable: true`
  - `sandboxEligible`: environment-dependent and deterministic from readiness + credential boundary + gate
  - `liveEligible: false`
- Future provider sandbox-disabled baseline:
  - non-manual providers without registered adapters are `mode: sandbox_disabled`
  - `adapterAvailable: false`
  - `sandboxEligible: false`
  - `liveEligible: false`
- Live blocked boundary:
  - live-intent requests are represented as `mode: live_blocked`
  - `liveEligible` remains `false` in this phase for all providers
- No-network/no-external-execution boundary:
  - descriptor derivation is control-plane only and deterministic
  - no external DNS/provider/registrar execution is performed

### 7) Smoke integration fields

- Source: `apps/platform/gnr8/runtime/preview-smoke/preview-smoke-validator.ts`
- Smoke summary includes:
  - `runtimeResolutionDiagnostic`
  - `runtimeReadiness`
  - `runtimeDomainReadiness`
  - `runtimeDnsReadinessPlan`
  - `runtimeDomainLifecyclePlan`
  - `runtimeDomainProviderSelection`
  - `runtimeDomainExecutionIntent`
  - `runtimeDomainExecutionDryRun`
- These fields are informational and do not alter smoke pass/fail semantics.

### 8) Explicit strategy route-harness execution mode

- Runtime smoke is executed with `--execution-mode=route_harness` for deterministic control-plane validation without changing pass/fail logic.
- Explicit strategy flags are now part of the baseline command:
  - `--maver-strategy=active`
  - `--roboplast-strategy=active`
- Route harness validates preview and preview-assets using real runtime bindings when available.

### 9) Seeded known-site baseline siteId resolution

- Source: `apps/platform/gnr8/runtime/preview-smoke/preview-smoke-validator.cli.ts`
- Deterministic fallback targets exist for Maver and Roboplast only when route-harness strategy mode lacks a runtime resolution binding.
- Fallback reason code: `runtime_resolution_binding_missing`.
- Explicit strategy route-harness invocations seed deterministic known-site baseline site/version resolution for Maver and Roboplast.

### 10) Provider selection status baseline (Maver/Roboplast)

- Source: `apps/platform/gnr8/runtime/preview-smoke/preview-smoke-validator.ts`
- Maver route-harness summary now carries `runtimeDomainProviderSelection` (present, selected status).
- Roboplast route-harness summary now carries `runtimeDomainProviderSelection` (present, selected status).

### 11) Domain execution intent baseline (Maver/Roboplast)

- Source: `apps/platform/gnr8/runtime/domains/runtime-domain-execution-intent.ts`
- Maver route-harness summary now carries `runtimeDomainExecutionIntent` with:
  - `executionMode: manual`
  - `manualActions` populated
  - `executableActions` empty
  - `blockedActions` empty
- Roboplast route-harness summary now carries `runtimeDomainExecutionIntent` with:
  - `executionMode: manual`
  - `manualActions` populated
  - `executableActions` empty
  - `blockedActions` empty
- Current boundary is execution intent only; no external provider execution is performed.

### 12) Diagnostics baseline (fallback behavior)

- `RUNTIME_RESOLUTION_BINDING_MISSING`
  - Emitted only when a strategy-mode route-harness run cannot load a runtime resolution binding for a target site.
- `RUNTIME_SMOKE_BASELINE_TARGET_FALLBACK_USED`
  - Emitted only when deterministic baseline fallback is actually used.
- Current smoke evidence with real bindings did not emit fallback usage diagnostics.

### 13) Domain execution dry-run baseline (Maver/Roboplast)

- Source: `apps/platform/gnr8/runtime/domains/runtime-domain-execution-dry-run.ts`
- Maver route-harness summary now carries `runtimeDomainExecutionDryRun` with:
  - `providerId: manual`
  - `providerAdapterStatus.providerId: manual`
  - `providerAdapterStatus.adapterAvailable: true`
  - `providerAdapterStatus.contractStatus: pass`
  - `dryRunStatus: ready_with_warnings`
  - `dryRunActions` populated
  - `skippedActions` empty
  - `blockedActions` empty
- Roboplast route-harness summary now carries `runtimeDomainExecutionDryRun` with:
  - `providerId: manual`
  - `providerAdapterStatus.providerId: manual`
  - `providerAdapterStatus.adapterAvailable: true`
  - `providerAdapterStatus.contractStatus: pass`
  - `dryRunStatus: ready_with_warnings`
  - `dryRunActions` populated
  - `skippedActions` empty
  - `blockedActions` empty
- Current boundary is dry-run only; no external DNS/provider execution is performed.

### 13a) Provider adapter status baseline (manual contract pass)

- Source: `apps/platform/gnr8/runtime/domains/runtime-domain-execution-dry-run.ts`
- `runtimeDomainExecutionDryRun.providerAdapterStatus` baseline:
  - `providerId: manual`
  - `adapterAvailable: true`
  - `contractStatus: pass`
  - `warnings: []`
  - `blockers: []`
- Manual adapter contract pass is baseline-gated evidence for both Maver and Roboplast route-harness results.
- No-network-call boundary remains explicit:
  - provider adapter contract and dry-run validation do not perform external DNS/registrar calls
  - route-harness remains a local control-plane verification path
- no live provider execution is enabled in this baseline

### 13b) Provider execution gate baseline

- Source: `apps/platform/gnr8/runtime/dns/provider-execution-gate.ts`
- Gate model baseline:
  - `requestedEnvironment: contract | sandbox | live`
  - `gateStatus: open_for_mock | open_for_sandbox_dry_run | blocked`
  - `allowedActionKinds`
  - `blockedActionKinds`
- Manual contract mock gate baseline:
  - manual + contract opens gate as `open_for_mock`
  - allowed action kinds are deterministic manual/dry-run action kinds
  - blocked action kinds are empty when no pre-blocked actions exist
- Sandbox dry-run only boundary:
  - only `ready_for_sandbox` + credential boundary `safe|warning` + dry-run `ready|ready_with_warnings` may open gate as `open_for_sandbox_dry_run`
  - otherwise gate remains `blocked`
  - provider future action kinds remain blocked unless sandbox readiness is satisfied
- Live always blocked boundary:
  - `requestedEnvironment: live` is always `blocked` in this phase
- No external execution boundary:
  - execution-gate evaluation is control-plane only
  - no external DNS/provider/registrar execution occurs

### 13c) Runtime provider job planner baseline

- Source:
  - `apps/platform/gnr8/runtime/provider-jobs/runtime-provider-job-types.ts`
  - `apps/platform/gnr8/runtime/provider-jobs/runtime-provider-job-planner.ts`
- RuntimeProviderJob model baseline:
  - statuses: `queued | running | completed | failed | blocked`
  - environments: `contract | sandbox | live`
  - operation kinds:
    - `check_domain_availability`
    - `purchase_domain`
    - `create_dns_zone`
    - `upsert_dns_record`
    - `verify_dns_record`
    - `activate_domain_binding`
    - `manual_instruction`
- Planner rules baseline:
  - deterministic provider job IDs: `provider_job_<correlationKey[0..24]>`
  - deterministic correlation keys are derived from dry-run key + execution-gate key + environment + deterministic order index
  - manual dry-run actions always map to `queued` `manual_instruction` jobs
  - `mock_provider` + `provider_api_future` dry-run actions map to queued `sandbox` jobs only when gate is `open_for_sandbox_dry_run`
  - live-environment `provider_api_future` actions map to `blocked` jobs
  - blocked dry-run actions map to `blocked` jobs
  - planner performs no external provider calls
- Current boundary:
  - provider jobs are planned only
  - no DB persistence yet
  - no worker execution yet
- no external provider calls yet

### 13d) Runtime provider communicator baseline

- Source: `apps/platform/gnr8/runtime/providers/runtime-provider-communicator.ts`
- Request model baseline:
  - `providerId`
  - `environment`
  - `operationKind`
  - `capability`
- Result model baseline:
  - `providerId`
  - `environment`
  - `capability`
  - `operationKind`
  - `adapterAvailable`
  - `routeStatus`
  - `warnings`
  - `blockers`
  - `correlationKey`
- Route status baseline:
  - `resolved`: mock provider + adapter available + non-live environment
  - `manual`: manual provider selected
  - `unavailable`: adapter missing
  - `blocked`: live environment execution
- Route-status fixture evidence:
  - manual route baseline: `providerId: manual` -> `routeStatus: manual`
  - mock provider resolved baseline: `providerId: mock_provider` + adapter available -> `routeStatus: resolved`
  - future providers unavailable baseline: `openprovider | realtime_register | netim | inwx` (without adapters) -> `routeStatus: unavailable`
  - live blocked baseline: any adapter-available non-manual provider in `environment: live` -> `routeStatus: blocked`
- No external call boundary:
  - communicator performs deterministic control-plane routing only
  - no external DNS/provider/registrar calls

### 13e) Runtime provider operation orchestrator baseline

- Source: `apps/platform/gnr8/runtime/providers/runtime-provider-operation-orchestrator.ts`
- Orchestration flow baseline (deterministic control-plane composition):
  1. agency provider selection
  2. provider communicator
  3. execution intent
  4. execution dry-run
  5. execution gate
  6. provider job planning
  7. operation bundle
- Path status baseline:
  - manual path: provider selection `manual` + communicator `manual` + bundle `ready_for_manual`
  - mock provider path: provider selection `mock_provider` + communicator `resolved` + bundle `ready_for_mock`
  - unavailable path: communicator `unavailable` + bundle `blocked`
  - blocked path: communicator `blocked` + bundle `blocked`
- Deterministic baseline evidence:
  - repeated equivalent inputs produce stable orchestrator correlation keys and stable operation bundle output.
- Explicit control-plane boundaries:
  - no DB writes
  - no worker execution
  - no provider execution
  - no external DNS/registrar calls

### 13f) Provider control-plane DB readiness baseline

- Source:
  - `apps/platform/gnr8/runtime/dns/provider-control-plane-db-readiness.ts`
  - `apps/platform/gnr8/runtime/dns/provider-control-plane-db-readiness.cli.ts`
- Table readiness baseline:
  - `gnr8_runtime_provider_jobs`: present
  - `gnr8_agency_provider_settings`: present
  - `gnr8_provider_credential_references`: missing
- Missing-table reason baseline:
  - migration for provider credential references exists
  - `psql` is unavailable in the local environment
  - migration was not applied
- Impact baseline:
  - route-harness is unaffected
  - provider credential reference pure tests pass
  - Openprovider credential flow is blocked until migration is applied

## Explicit Current Boundaries

- No external DNS API calls.
- No registrar purchase flow.
- No billing/domain pricing integration yet.
- No DB schema changes yet.
- No smoke pass/fail impact yet.
- Execution intent only: no external execution of DNS/provider actions yet.
- Dry-run only: no external execution of DNS/provider actions.
- Sandbox dry-run only boundary: provider execution gate may open only for sandbox dry-run readiness state.
- Live always blocked boundary: provider execution gate blocks all live execution paths in current phase.
- No secret-like credential values accepted in boundary inputs.
- No secret storage in control-plane evidence path.
- Provider jobs are planned-only control-plane artifacts.
- No provider job DB persistence yet.
- No provider job worker execution yet.
- No external provider calls from provider job planner.
- Runtime provider operation orchestrator remains pure control-plane composition with:
  - no DB writes
  - no worker execution
  - no provider execution
  - no external DNS/registrar calls
- Provider control-plane DB readiness currently has a missing table gate:
  - `gnr8_provider_credential_references` is missing
  - migration exists but is not yet applied because `psql` is unavailable locally
  - Openprovider credential flow remains blocked until migration apply

## Validation Summary

- Maver smoke: **PASS**
- Roboplast smoke: **PASS**
- Required preview assets: **PASS**
- Forbidden back-to-top fallback markers: **absent**
- Duplicated preview-assets prefix: **absent**
- DNS readiness plan present in strategy mode: **present**
- Domain lifecycle plan present in strategy mode: **present**
- Runtime domain readiness present in strategy mode: **present**
- Runtime domain provider selection present in strategy mode: **present**
- Runtime domain execution intent present in strategy mode: **present**
- Runtime domain execution dry-run present in strategy mode: **present**
- Provider adapter contract harness status: **PASS**
- Provider job planner tests: **PASS**
- Runtime provider communicator tests: **PASS**
- Runtime provider operation orchestrator tests: **PASS**
- Mock provider adapter tests: **PASS**
- Provider sandbox adapter tests: **PASS**
- Provider execution gate tests: **PASS**
- Provider credentials boundary tests: **PASS**
- Provider implementation readiness tests: **PASS**
- Provider adapter registry + contract tests: **PASS**
- DNS/provider-selection/readiness tests: **PASS**
- Domain lifecycle/execution-intent/dry-run tests: **PASS**
- Runtime readiness/resolution/store tests: **PASS**
- Full provider stack (settings + communicator + intent + dry-run + gate + jobs + bundle + orchestrator): **PASS**
- Fallback diagnostic used with real bindings: **absent**
- Preview-smoke-validator + CLI tests: **PASS**
- Preview route/assets/unified preview tests: **PASS**
- Full deterministic stack: **PASS**
- Route-harness smoke (`.env.production` + explicit strategy flags): **PASS**
- Platform build: **PASS**
- Worker build: **PASS**
- DB-backed repository tests requiring `DATABASE_URL`: **skipped when `DATABASE_URL` missing** (expected baseline guard)

## Route-Harness Smoke Evidence

Command run (successful):

```bash
cd apps/platform && set -a; source .env.production; set +a; NODE_OPTIONS='--conditions=react-server' pnpm exec tsx gnr8/runtime/preview-smoke/preview-smoke-validator.cli.ts --execution-mode=route_harness --maver-strategy=active --roboplast-strategy=active
```

Result:

- `kind`: `preview_smoke_summary_v1`
- `generatedAt`: `2026-05-18T17:13:17.849Z` (latest run window)
- `executionMode`: `route_harness`
- `pass`: `true`
- Maver: `site_7c77126de646f746b3bd` / `88253466-783e-4484-8b68-df6c83b8a11c` / preview `200` / pass `true`
- Roboplast: `site_aa6b25cd33e9c1384d35` / `30bfe5b1-a441-41ef-92e3-0d6b3ee678e1` / preview `200` / pass `true`
- Maver runtime fields: `runtimeDomainReadiness` present, `runtimeDnsReadinessPlan` present, `runtimeDomainLifecyclePlan` present, `runtimeDomainProviderSelection` present, `runtimeDomainExecutionIntent` present (`executionMode: manual`), `runtimeDomainExecutionDryRun` present (`providerId: manual`, `providerAdapterStatus.adapterAvailable: true`, `providerAdapterStatus.contractStatus: pass`, `dryRunStatus: ready_with_warnings`)
- Roboplast runtime fields: `runtimeDomainReadiness` present, `runtimeDnsReadinessPlan` present, `runtimeDomainLifecyclePlan` present, `runtimeDomainProviderSelection` present, `runtimeDomainExecutionIntent` present (`executionMode: manual`), `runtimeDomainExecutionDryRun` present (`providerId: manual`, `providerAdapterStatus.adapterAvailable: true`, `providerAdapterStatus.contractStatus: pass`, `dryRunStatus: ready_with_warnings`)
- Route-harness fallback behavior: no `RUNTIME_SMOKE_BASELINE_TARGET_FALLBACK_USED` when real bindings are available

## Linked Baseline JSON

- `apps/platform/gnr8/runtime/dns/baselines/domain-dns-readiness-current.json`

## Unchanged Behavior Confirmation

This evidence update does not change:

- rendering
- importer
- preview runtime behavior
- map/gallery/back-to-top behavior
- billing
- DB schema
- external DNS/registrar calls
- smoke pass/fail logic
