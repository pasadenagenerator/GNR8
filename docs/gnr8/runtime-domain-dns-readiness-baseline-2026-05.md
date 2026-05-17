# GNR8 Runtime/Domain/DNS Readiness Baseline - 2026-05

Date: 2026-05-17  
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
  - `manual`
  - `openprovider`
  - `realtime_register`
  - `netim`
  - `inwx`
- Provider contract/capability registry is present, deterministic, and currently placeholder-oriented.

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
- Future provider baseline:
  - `openprovider`, `realtime_register`, `netim`, `inwx` remain `blocked`
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
- Provider sandbox adapter tests: **PASS**
- Provider execution gate tests: **PASS**
- Provider credentials boundary tests: **PASS**
- Provider implementation readiness tests: **PASS**
- Provider adapter registry + contract tests: **PASS**
- DNS/provider-selection/readiness tests: **PASS**
- Domain lifecycle/execution-intent/dry-run tests: **PASS**
- Runtime readiness/resolution/store tests: **PASS**
- Fallback diagnostic used with real bindings: **absent**
- Preview-smoke-validator + CLI tests: **PASS**
- Preview route/assets/unified preview tests: **PASS**
- Full deterministic stack: **PASS**
- Route-harness smoke (`.env.production` + explicit strategy flags): **PASS**
- Platform build: **PASS**
- Worker build: **PASS**

## Route-Harness Smoke Evidence

Command run (successful):

```bash
cd apps/platform && set -a; source .env.production; set +a; NODE_OPTIONS='--conditions=react-server' pnpm exec tsx gnr8/runtime/preview-smoke/preview-smoke-validator.cli.ts --execution-mode=route_harness --maver-strategy=active --roboplast-strategy=active
```

Result:

- `kind`: `preview_smoke_summary_v1`
- `generatedAt`: `2026-05-17T08:30:58Z` (latest run window)
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
