import assert from "node:assert/strict";
import test from "node:test";

import type { ProviderCredentialBoundaryReport } from "@/gnr8/runtime/dns/provider-credentials-boundary";
import type { ProviderExecutionGateReport } from "@/gnr8/runtime/dns/provider-execution-gate";
import type { DnsProviderImplementationReadinessReport } from "@/gnr8/runtime/dns/provider-implementation-readiness";
import {
  createProviderSandboxAdapterDescriptor,
  type ProviderSandboxAdapterDescriptor,
} from "@/gnr8/runtime/dns/provider-sandbox-adapters";

function buildReadiness(input?: Partial<DnsProviderImplementationReadinessReport>): DnsProviderImplementationReadinessReport {
  return {
    providerId: "inwx",
    readinessStatus: "blocked",
    checklist: [
      { id: "capability_defined", status: "pass", detail: "ok" },
      { id: "adapter_registered", status: "fail", detail: "missing" },
      { id: "contract_passes", status: "fail", detail: "missing" },
      { id: "credentials_not_required_for_contract", status: "pass", detail: "ok" },
      { id: "sandbox_mode_required_before_live", status: "pass", detail: "ok" },
      { id: "no_live_execution_enabled", status: "pass", detail: "ok" },
    ],
    warnings: [],
    blockers: [],
    correlationKey: "readiness_key",
    ...input,
  };
}

function buildBoundary(input?: Partial<ProviderCredentialBoundaryReport>): ProviderCredentialBoundaryReport {
  return {
    providerId: "inwx",
    environment: "sandbox",
    requiredCredentials: [],
    missingCredentials: [],
    forbiddenCredentials: [],
    safetyStatus: "safe",
    warnings: [],
    blockers: [],
    correlationKey: "boundary_key",
    ...input,
  };
}

function buildGate(input?: Partial<ProviderExecutionGateReport>): ProviderExecutionGateReport {
  return {
    providerId: "inwx",
    requestedEnvironment: "sandbox",
    gateStatus: "blocked",
    allowedActionKinds: [],
    blockedActionKinds: [],
    warnings: [],
    blockers: [],
    correlationKey: "gate_key",
    ...input,
  };
}

test("provider sandbox adapters: manual descriptor", () => {
  const descriptor = createProviderSandboxAdapterDescriptor(
    "manual",
    buildReadiness({ providerId: "manual", readinessStatus: "ready_for_mock" }),
    buildBoundary({ providerId: "manual", environment: "contract", safetyStatus: "safe" }),
    buildGate({ providerId: "manual", requestedEnvironment: "contract", gateStatus: "open_for_mock" }),
  );

  assert.equal(descriptor.mode, "manual");
  assert.equal(descriptor.adapterAvailable, true);
  assert.equal(descriptor.sandboxEligible, false);
  assert.equal(descriptor.liveEligible, false);
});

test("provider sandbox adapters: non-manual unavailable descriptor", () => {
  const descriptor = createProviderSandboxAdapterDescriptor(
    "inwx",
    buildReadiness({
      checklist: [
        { id: "capability_defined", status: "pass", detail: "ok" },
        { id: "adapter_registered", status: "fail", detail: "missing" },
        { id: "contract_passes", status: "fail", detail: "missing" },
        { id: "credentials_not_required_for_contract", status: "pass", detail: "ok" },
        { id: "sandbox_mode_required_before_live", status: "pass", detail: "ok" },
        { id: "no_live_execution_enabled", status: "pass", detail: "ok" },
      ],
    }),
    buildBoundary(),
    buildGate(),
  );

  assert.equal(descriptor.mode, "sandbox_disabled");
  assert.equal(descriptor.adapterAvailable, false);
  assert.equal(descriptor.blockers.includes("provider_adapter_unavailable:inwx"), true);
});

test("provider sandbox adapters: sandbox eligible descriptor", () => {
  const descriptor = createProviderSandboxAdapterDescriptor(
    "inwx",
    buildReadiness({
      readinessStatus: "ready_for_sandbox",
      checklist: [
        { id: "capability_defined", status: "pass", detail: "ok" },
        { id: "adapter_registered", status: "pass", detail: "ok" },
        { id: "contract_passes", status: "pass", detail: "ok" },
        { id: "credentials_not_required_for_contract", status: "pass", detail: "ok" },
        { id: "sandbox_mode_required_before_live", status: "pass", detail: "ok" },
        { id: "no_live_execution_enabled", status: "pass", detail: "ok" },
      ],
    }),
    buildBoundary({ safetyStatus: "warning" }),
    buildGate({ gateStatus: "open_for_sandbox_dry_run" }),
  );

  assert.equal(descriptor.mode, "mock");
  assert.equal(descriptor.adapterAvailable, true);
  assert.equal(descriptor.sandboxEligible, true);
});

test("provider sandbox adapters: live blocked descriptor", () => {
  const descriptor = createProviderSandboxAdapterDescriptor(
    "inwx",
    buildReadiness({ readinessStatus: "ready_for_sandbox" }),
    buildBoundary({ safetyStatus: "safe" }),
    buildGate({ requestedEnvironment: "live", gateStatus: "blocked", blockers: ["live_execution_blocked_in_current_phase"] }),
  );

  assert.equal(descriptor.mode, "live_blocked");
  assert.equal(descriptor.liveEligible, false);
});

test("provider sandbox adapters: deterministic ordering", () => {
  const descriptor = createProviderSandboxAdapterDescriptor(
    "inwx",
    buildReadiness({
      warnings: ["z_warn", "a_warn", "a_warn"],
      blockers: ["z_block", "a_block", "a_block"],
    }),
    buildBoundary({
      warnings: ["m_warn", "a_warn"],
      blockers: ["m_block", "a_block"],
    }),
    buildGate({
      warnings: ["b_warn", "z_warn"],
      blockers: ["b_block", "z_block"],
    }),
  );

  assert.deepEqual(descriptor.warnings, ["a_warn", "b_warn", "m_warn", "z_warn"]);
  assert.deepEqual(descriptor.blockers, [
    "a_block",
    "b_block",
    "live_execution_blocked_in_current_phase",
    "m_block",
    "provider_adapter_unavailable:inwx",
    "z_block",
  ]);
});

test("provider sandbox adapters: stable correlation key", () => {
  const args = {
    providerId: "inwx" as const,
    readiness: buildReadiness({
      readinessStatus: "ready_for_sandbox",
      checklist: [
        { id: "capability_defined", status: "pass", detail: "ok" },
        { id: "adapter_registered", status: "pass", detail: "ok" },
        { id: "contract_passes", status: "pass", detail: "ok" },
        { id: "credentials_not_required_for_contract", status: "pass", detail: "ok" },
        { id: "sandbox_mode_required_before_live", status: "pass", detail: "ok" },
        { id: "no_live_execution_enabled", status: "pass", detail: "ok" },
      ],
    }),
    credentialBoundary: buildBoundary({ safetyStatus: "warning" }),
    executionGate: buildGate({ gateStatus: "open_for_sandbox_dry_run" }),
  };

  const a = createProviderSandboxAdapterDescriptor(args);
  const b = createProviderSandboxAdapterDescriptor({
    ...args,
    readiness: { ...args.readiness },
    credentialBoundary: { ...args.credentialBoundary },
    executionGate: { ...args.executionGate },
  });

  assert.equal(a.correlationKey, b.correlationKey);
  assert.equal(a.correlationKey.length, 64);
});

test("provider sandbox adapters: descriptor shape", () => {
  const descriptor = createProviderSandboxAdapterDescriptor(
    "inwx",
    buildReadiness(),
    buildBoundary(),
    buildGate(),
  );

  const keys = Object.keys(descriptor).sort();
  assert.deepEqual(keys, [
    "adapterAvailable",
    "blockers",
    "correlationKey",
    "liveEligible",
    "mode",
    "providerId",
    "sandboxEligible",
    "warnings",
  ]);

  assert.ok((descriptor as ProviderSandboxAdapterDescriptor).providerId);
});
