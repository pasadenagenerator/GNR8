import assert from "node:assert/strict";
import test from "node:test";

import { evaluateProviderExecutionGate } from "@/gnr8/runtime/dns/provider-execution-gate";
import type { ProviderCredentialBoundaryReport } from "@/gnr8/runtime/dns/provider-credentials-boundary";
import type { DnsProviderImplementationReadinessReport } from "@/gnr8/runtime/dns/provider-implementation-readiness";
import type {
  RuntimeDomainExecutionDryRun,
  RuntimeDomainExecutionDryRunAction,
} from "@/gnr8/runtime/domains/runtime-domain-execution-dry-run";
import type { RuntimeDomainExecutionAction } from "@/gnr8/runtime/domains/runtime-domain-execution-intent";

function buildDryRunAction(input?: Partial<RuntimeDomainExecutionDryRunAction>): RuntimeDomainExecutionDryRunAction {
  return {
    kind: "manual_instruction",
    reason: "dns_manual_step",
    actionMode: "manual_instruction",
    ...input,
  };
}

function buildRuntimeAction(input?: Partial<RuntimeDomainExecutionAction>): RuntimeDomainExecutionAction {
  return {
    kind: "manual_instruction",
    reason: "dns_manual_step",
    ...input,
  };
}

function buildDryRun(input?: Partial<RuntimeDomainExecutionDryRun>): RuntimeDomainExecutionDryRun {
  return {
    siteId: "site_1",
    providerId: "manual",
    executionMode: "manual",
    dryRunActions: [],
    skippedActions: [],
    blockedActions: [],
    warnings: [],
    blockers: [],
    providerAdapterStatus: {
      providerId: "manual",
      adapterAvailable: true,
      contractStatus: "pass",
      warnings: [],
      blockers: [],
    },
    dryRunStatus: "ready_with_warnings",
    correlationKey: "dry_run_key",
    ...input,
  };
}

function buildCredentialBoundary(input?: Partial<ProviderCredentialBoundaryReport>): ProviderCredentialBoundaryReport {
  return {
    providerId: "manual",
    environment: "contract",
    requiredCredentials: [],
    missingCredentials: [],
    forbiddenCredentials: [],
    safetyStatus: "safe",
    warnings: [],
    blockers: [],
    correlationKey: "credential_key",
    ...input,
  };
}

function buildReadiness(input?: Partial<DnsProviderImplementationReadinessReport>): DnsProviderImplementationReadinessReport {
  return {
    providerId: "manual",
    readinessStatus: "ready_for_mock",
    checklist: [],
    warnings: [],
    blockers: [],
    correlationKey: "readiness_key",
    ...input,
  };
}

test("provider execution gate: manual contract opens for mock", () => {
  const report = evaluateProviderExecutionGate({
    dryRun: buildDryRun({
      dryRunActions: [
        buildDryRunAction({ kind: "upsert_dns_record" }),
        buildDryRunAction({ kind: "manual_instruction" }),
      ],
    }),
    credentialBoundary: buildCredentialBoundary({ environment: "contract" }),
    providerReadiness: buildReadiness({ readinessStatus: "ready_for_mock" }),
    requestedEnvironment: "contract",
  });

  assert.equal(report.gateStatus, "open_for_mock");
  assert.deepEqual(report.allowedActionKinds, ["manual_instruction", "upsert_dns_record"]);
  assert.deepEqual(report.blockedActionKinds, []);
});

test("provider execution gate: sandbox without provider readiness is blocked", () => {
  const report = evaluateProviderExecutionGate({
    dryRun: buildDryRun({
      providerId: "inwx",
      executionMode: "provider_api_future",
      dryRunStatus: "ready",
      dryRunActions: [buildDryRunAction({ kind: "upsert_dns_record", actionMode: "provider_api_future" })],
    }),
    credentialBoundary: buildCredentialBoundary({
      providerId: "inwx",
      environment: "sandbox",
      safetyStatus: "safe",
    }),
    providerReadiness: buildReadiness({
      providerId: "inwx",
      readinessStatus: "blocked",
      blockers: ["contract_not_passing"],
    }),
    requestedEnvironment: "sandbox",
  });

  assert.equal(report.gateStatus, "blocked");
  assert.equal(report.blockers.includes("sandbox_execution_gate_not_ready"), true);
});

test("provider execution gate: sandbox credential boundary blocked vs warning", () => {
  const blockedByCredentials = evaluateProviderExecutionGate({
    dryRun: buildDryRun({
      providerId: "openprovider",
      executionMode: "provider_api_future",
      dryRunStatus: "ready",
      dryRunActions: [buildDryRunAction({ kind: "upsert_dns_record", actionMode: "provider_api_future" })],
    }),
    credentialBoundary: buildCredentialBoundary({
      providerId: "openprovider",
      environment: "sandbox",
      safetyStatus: "blocked",
      warnings: ["sandbox_required_credentials_missing:openprovider"],
      blockers: ["sandbox_credentials_unavailable_for_phase:openprovider"],
    }),
    providerReadiness: buildReadiness({
      providerId: "openprovider",
      readinessStatus: "ready_for_sandbox",
    }),
    requestedEnvironment: "sandbox",
  });

  assert.equal(blockedByCredentials.gateStatus, "blocked");
  assert.equal(blockedByCredentials.blockers.includes("sandbox_credentials_unavailable_for_phase:openprovider"), true);

  const warningCredentials = evaluateProviderExecutionGate({
    dryRun: buildDryRun({
      providerId: "openprovider",
      executionMode: "provider_api_future",
      dryRunStatus: "ready_with_warnings",
      dryRunActions: [buildDryRunAction({ kind: "upsert_dns_record", actionMode: "provider_api_future" })],
    }),
    credentialBoundary: buildCredentialBoundary({
      providerId: "openprovider",
      environment: "sandbox",
      safetyStatus: "warning",
      warnings: ["sandbox_credentials_partially_available:openprovider"],
      blockers: [],
    }),
    providerReadiness: buildReadiness({
      providerId: "openprovider",
      readinessStatus: "ready_for_sandbox",
    }),
    requestedEnvironment: "sandbox",
  });

  assert.equal(warningCredentials.gateStatus, "open_for_sandbox_dry_run");
});

test("provider execution gate: live always blocked", () => {
  const report = evaluateProviderExecutionGate({
    dryRun: buildDryRun({
      providerId: "inwx",
      executionMode: "provider_api_future",
      dryRunStatus: "ready",
      dryRunActions: [buildDryRunAction({ kind: "upsert_dns_record", actionMode: "provider_api_future" })],
    }),
    credentialBoundary: buildCredentialBoundary({
      providerId: "inwx",
      environment: "live",
      safetyStatus: "blocked",
      blockers: ["live_credentials_blocked_in_current_phase:inwx"],
    }),
    providerReadiness: buildReadiness({
      providerId: "inwx",
      readinessStatus: "ready_for_sandbox",
    }),
    requestedEnvironment: "live",
  });

  assert.equal(report.gateStatus, "blocked");
  assert.equal(report.blockers.includes("live_execution_blocked_in_current_phase"), true);
});

test("provider execution gate: provider future actions blocked without sandbox readiness", () => {
  const report = evaluateProviderExecutionGate({
    dryRun: buildDryRun({
      providerId: "inwx",
      executionMode: "provider_api_future",
      dryRunStatus: "ready",
      dryRunActions: [buildDryRunAction({ kind: "activate_domain_binding", actionMode: "provider_api_future" })],
    }),
    credentialBoundary: buildCredentialBoundary({
      providerId: "inwx",
      environment: "sandbox",
      safetyStatus: "safe",
    }),
    providerReadiness: buildReadiness({
      providerId: "inwx",
      readinessStatus: "blocked",
    }),
    requestedEnvironment: "sandbox",
  });

  assert.equal(report.gateStatus, "blocked");
  assert.equal(report.blockers.includes("provider_api_future_actions_require_sandbox_readiness"), true);
});

test("provider execution gate: deterministic ordering", () => {
  const a = evaluateProviderExecutionGate({
    dryRun: buildDryRun({
      providerId: "openprovider",
      executionMode: "provider_api_future",
      dryRunStatus: "ready",
      dryRunActions: [
        buildDryRunAction({ kind: "upsert_dns_record", actionMode: "provider_api_future" }),
        buildDryRunAction({ kind: "check_domain_availability", actionMode: "provider_api_future" }),
      ],
      blockedActions: [buildRuntimeAction({ kind: "activate_domain_binding" })],
      warnings: ["z_warning", "a_warning"],
    }),
    credentialBoundary: buildCredentialBoundary({
      providerId: "openprovider",
      environment: "sandbox",
      safetyStatus: "warning",
      warnings: ["b_warning"],
    }),
    providerReadiness: buildReadiness({
      providerId: "openprovider",
      readinessStatus: "ready_for_sandbox",
      warnings: ["c_warning"],
    }),
    requestedEnvironment: "sandbox",
  });

  const b = evaluateProviderExecutionGate({
    dryRun: buildDryRun({
      providerId: "openprovider",
      executionMode: "provider_api_future",
      dryRunStatus: "ready",
      dryRunActions: [
        buildDryRunAction({ kind: "check_domain_availability", actionMode: "provider_api_future" }),
        buildDryRunAction({ kind: "upsert_dns_record", actionMode: "provider_api_future" }),
      ],
      blockedActions: [buildRuntimeAction({ kind: "activate_domain_binding" })],
      warnings: ["a_warning", "z_warning"],
    }),
    credentialBoundary: buildCredentialBoundary({
      providerId: "openprovider",
      environment: "sandbox",
      safetyStatus: "warning",
      warnings: ["b_warning"],
    }),
    providerReadiness: buildReadiness({
      providerId: "openprovider",
      readinessStatus: "ready_for_sandbox",
      warnings: ["c_warning"],
    }),
    requestedEnvironment: "sandbox",
  });

  assert.deepEqual(a.allowedActionKinds, b.allowedActionKinds);
  assert.deepEqual(a.blockedActionKinds, b.blockedActionKinds);
  assert.deepEqual(a.warnings, b.warnings);
});

test("provider execution gate: stable correlation key", () => {
  const a = evaluateProviderExecutionGate({
    dryRun: buildDryRun({
      providerId: "openprovider",
      executionMode: "provider_api_future",
      dryRunStatus: "ready",
      dryRunActions: [
        buildDryRunAction({ kind: "check_domain_availability", actionMode: "provider_api_future" }),
        buildDryRunAction({ kind: "upsert_dns_record", actionMode: "provider_api_future" }),
      ],
      warnings: ["z_warning", "a_warning"],
    }),
    credentialBoundary: buildCredentialBoundary({
      providerId: "openprovider",
      environment: "sandbox",
      safetyStatus: "warning",
      warnings: ["b_warning"],
    }),
    providerReadiness: buildReadiness({
      providerId: "openprovider",
      readinessStatus: "ready_for_sandbox",
      warnings: ["c_warning"],
    }),
    requestedEnvironment: "sandbox",
  });

  const b = evaluateProviderExecutionGate({
    dryRun: buildDryRun({
      providerId: "openprovider",
      executionMode: "provider_api_future",
      dryRunStatus: "ready",
      dryRunActions: [
        buildDryRunAction({ kind: "upsert_dns_record", actionMode: "provider_api_future" }),
        buildDryRunAction({ kind: "check_domain_availability", actionMode: "provider_api_future" }),
      ],
      warnings: ["a_warning", "z_warning"],
    }),
    credentialBoundary: buildCredentialBoundary({
      providerId: "openprovider",
      environment: "sandbox",
      safetyStatus: "warning",
      warnings: ["b_warning"],
    }),
    providerReadiness: buildReadiness({
      providerId: "openprovider",
      readinessStatus: "ready_for_sandbox",
      warnings: ["c_warning"],
    }),
    requestedEnvironment: "sandbox",
  });

  assert.equal(a.correlationKey, b.correlationKey);
  assert.equal(a.correlationKey.length, 64);
});
