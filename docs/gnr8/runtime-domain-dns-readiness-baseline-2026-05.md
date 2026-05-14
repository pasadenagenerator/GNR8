# GNR8 Runtime/Domain/DNS Readiness Baseline - 2026-05

Date: 2026-05-14  
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

### 7) Smoke integration fields

- Source: `apps/platform/gnr8/runtime/preview-smoke/preview-smoke-validator.ts`
- Smoke summary includes:
  - `runtimeResolutionDiagnostic`
  - `runtimeReadiness`
  - `runtimeDomainReadiness`
  - `runtimeDnsReadinessPlan`
- These fields are informational and do not alter smoke pass/fail semantics.

## Explicit Current Boundaries

- No external DNS API calls.
- No registrar purchase flow.
- No billing/domain pricing integration yet.
- No DB schema changes yet.
- No smoke pass/fail impact yet.

## Validation Summary

- Maver smoke: **PASS**
- Roboplast smoke: **PASS**
- Required preview assets: **PASS**
- Forbidden back-to-top fallback markers: **absent**
- Duplicated preview-assets prefix: **absent**
- DNS readiness plan present in strategy mode: **present**

## Route-Harness Smoke Evidence

Command run (successful):

```bash
cd apps/platform && set -a; source .env.production; set +a; NODE_OPTIONS='--conditions=react-server' pnpm exec tsx gnr8/runtime/preview-smoke/preview-smoke-validator.cli.ts --execution-mode=route_harness --maver-site-version-id=88253466-783e-4484-8b68-df6c83b8a11c --roboplast-site-version-id=30bfe5b1-a441-41ef-92e3-0d6b3ee678e1
```

Result:

- `kind`: `preview_smoke_summary_v1`
- `generatedAt`: `2026-05-14T06:40:35.269Z`
- `executionMode`: `route_harness`
- `pass`: `true`
- Maver: `site_7c77126de646f746b3bd` / `88253466-783e-4484-8b68-df6c83b8a11c` / preview `200` / pass `true`
- Roboplast: `site_aa6b25cd33e9c1384d35` / `30bfe5b1-a441-41ef-92e3-0d6b3ee678e1` / preview `200` / pass `true`

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
