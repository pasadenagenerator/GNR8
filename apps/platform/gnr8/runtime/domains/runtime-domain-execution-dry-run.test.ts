import assert from "node:assert/strict";
import test from "node:test";

import {
  createRuntimeDomainExecutionDryRun,
  type RuntimeDomainExecutionDryRun,
} from "@/gnr8/runtime/domains/runtime-domain-execution-dry-run";
import type { RuntimeDomainExecutionIntent } from "@/gnr8/runtime/domains/runtime-domain-execution-intent";
import type { DnsProviderAdapterContractReport } from "@/gnr8/runtime/dns/provider-adapter-contract-test";

function buildIntent(input?: Partial<RuntimeDomainExecutionIntent>): RuntimeDomainExecutionIntent {
  return {
    siteId: "site_1",
    providerId: "manual",
    executionMode: "manual",
    executableActions: [],
    blockedActions: [],
    manualActions: [],
    warnings: [],
    blockers: [],
    correlationKey: "intent_key_1",
    ...input,
  };
}

test("runtime domain execution dry-run: manual intent maps to manual_instruction and warnings status", () => {
  const dryRun = createRuntimeDomainExecutionDryRun(
    buildIntent({
      manualActions: [
        { kind: "manual_instruction", reason: "dns_manual_step", manualStep: "add CNAME" },
        { kind: "upsert_dns_record", reason: "dns_planned_record:cname", name: "www", type: "CNAME", value: "target.example.com" },
      ],
      warnings: ["manual_path_warning"],
    }),
  );

  assert.equal(dryRun.dryRunStatus, "ready_with_warnings");
  assert.equal(dryRun.dryRunActions.length, 2);
  assert.equal(dryRun.dryRunActions.every((entry) => entry.actionMode === "manual_instruction"), true);
  assert.deepEqual(dryRun.blockedActions, []);
  assert.deepEqual(dryRun.skippedActions, []);
  assert.equal(dryRun.warnings.includes("manual_execution_required"), true);
});

test("runtime domain execution dry-run: provider future intent maps to provider_api_future and blocks when adapter is unavailable", () => {
  const dryRun = createRuntimeDomainExecutionDryRun(
    buildIntent({
      providerId: "inwx",
      executionMode: "provider_api_future",
      executableActions: [
        { kind: "upsert_dns_record", reason: "dns_planned_record:cname", name: "www", type: "CNAME", value: "target.example.com" },
      ],
    }),
  );

  assert.equal(dryRun.dryRunStatus, "blocked");
  assert.equal(dryRun.dryRunActions.length, 1);
  assert.equal(dryRun.dryRunActions[0]?.actionMode, "provider_api_future");
  assert.equal(dryRun.providerAdapterStatus.contractStatus, "unavailable");
});

test("runtime domain execution dry-run: blocked intent remains blocked", () => {
  const dryRun = createRuntimeDomainExecutionDryRun(
    buildIntent({
      providerId: "inwx",
      executionMode: "provider_api_future",
      blockedActions: [{ kind: "activate_domain_binding", reason: "lifecycle_recommended", domain: "maver.example.com" }],
      blockers: ["missing_custom_domain_for_connect_existing_domain"],
    }),
  );

  assert.equal(dryRun.dryRunStatus, "blocked");
  assert.equal(dryRun.blockers.includes("missing_custom_domain_for_connect_existing_domain"), true);
  assert.equal(dryRun.blockedActions.length, 1);
  assert.equal(dryRun.dryRunActions.length, 0);
});

test("runtime domain execution dry-run: deterministic ordering", () => {
  const a = createRuntimeDomainExecutionDryRun(
    buildIntent({
      providerId: "inwx",
      executionMode: "provider_api_future",
      executableActions: [
        { kind: "upsert_dns_record", reason: "dns_planned_record:apex", name: "@", type: "A", value: "1.1.1.1" },
        { kind: "check_domain_availability", reason: "lifecycle_recommended", domain: "maver.example.com" },
      ],
      manualActions: [{ kind: "manual_instruction", reason: "dns_manual_step", manualStep: "set TXT record" }],
      warnings: ["b_warning", "a_warning"],
    }),
  );

  const b = createRuntimeDomainExecutionDryRun(
    buildIntent({
      providerId: "inwx",
      executionMode: "provider_api_future",
      executableActions: [
        { kind: "check_domain_availability", reason: "lifecycle_recommended", domain: "maver.example.com" },
        { kind: "upsert_dns_record", reason: "dns_planned_record:apex", name: "@", type: "A", value: "1.1.1.1" },
      ],
      manualActions: [{ kind: "manual_instruction", reason: "dns_manual_step", manualStep: "set TXT record" }],
      warnings: ["a_warning", "b_warning"],
    }),
  );

  assert.deepEqual(a.dryRunActions, b.dryRunActions);
  assert.deepEqual(a.warnings, b.warnings);
});

test("runtime domain execution dry-run: stable correlation key", () => {
  const a: RuntimeDomainExecutionDryRun = createRuntimeDomainExecutionDryRun(
    buildIntent({
      providerId: "inwx",
      executionMode: "provider_api_future",
      executableActions: [{ kind: "check_domain_availability", reason: "lifecycle_recommended", domain: "maver.example.com" }],
      warnings: ["a_warning", "b_warning"],
    }),
  );

  const b: RuntimeDomainExecutionDryRun = createRuntimeDomainExecutionDryRun(
    buildIntent({
      providerId: "inwx",
      executionMode: "provider_api_future",
      executableActions: [{ kind: "check_domain_availability", reason: "lifecycle_recommended", domain: "maver.example.com" }],
      warnings: ["b_warning", "a_warning"],
    }),
  );

  assert.equal(a.correlationKey, b.correlationKey);
  assert.equal(a.correlationKey.length, 64);
});

test("runtime domain execution dry-run: manual adapter contract pass is reflected and does not block", () => {
  const report: DnsProviderAdapterContractReport = {
    providerId: "manual",
    contractStatus: "pass",
    checks: [],
    warnings: [],
    blockers: [],
    correlationKey: "contract_manual_pass",
  };
  const dryRun = createRuntimeDomainExecutionDryRun({
    intent: buildIntent({
      providerId: "manual",
      executionMode: "manual",
      manualActions: [{ kind: "manual_instruction", reason: "dns_manual_step", manualStep: "add CNAME" }],
    }),
    providerAdapterContractReport: report,
  });

  assert.equal(dryRun.providerAdapterStatus.providerId, "manual");
  assert.equal(dryRun.providerAdapterStatus.adapterAvailable, true);
  assert.equal(dryRun.providerAdapterStatus.contractStatus, "pass");
  assert.deepEqual(dryRun.providerAdapterStatus.blockers, []);
  assert.equal(dryRun.dryRunStatus, "ready_with_warnings");
});

test("runtime domain execution dry-run: unavailable future provider adds warning", () => {
  const dryRun = createRuntimeDomainExecutionDryRun(
    buildIntent({
      providerId: "inwx",
      executionMode: "manual",
      manualActions: [{ kind: "manual_instruction", reason: "dns_manual_step", manualStep: "add CNAME" }],
    }),
  );

  assert.equal(dryRun.providerAdapterStatus.adapterAvailable, false);
  assert.equal(dryRun.providerAdapterStatus.contractStatus, "unavailable");
  assert.equal(dryRun.providerAdapterStatus.warnings.includes("provider_adapter_unavailable:inwx"), true);
  assert.deepEqual(dryRun.providerAdapterStatus.blockers, []);
});

test("runtime domain execution dry-run: provider_api_future unavailable adapter blocks dry-run", () => {
  const dryRun = createRuntimeDomainExecutionDryRun(
    buildIntent({
      providerId: "inwx",
      executionMode: "provider_api_future",
      executableActions: [
        { kind: "upsert_dns_record", reason: "dns_planned_record:cname", name: "www", type: "CNAME", value: "target.example.com" },
      ],
    }),
  );

  assert.equal(dryRun.providerAdapterStatus.blockers.includes("provider_adapter_unavailable_for_provider_api_future:inwx"), true);
  assert.equal(dryRun.dryRunStatus, "blocked");
});

test("runtime domain execution dry-run: failing contract blocks provider_api_future", () => {
  const report: DnsProviderAdapterContractReport = {
    providerId: "inwx",
    contractStatus: "fail",
    checks: [],
    warnings: ["report_warning"],
    blockers: ["contract_check_failed:required_methods"],
    correlationKey: "contract_inwx_fail",
  };
  const dryRun = createRuntimeDomainExecutionDryRun({
    intent: buildIntent({
      providerId: "inwx",
      executionMode: "provider_api_future",
      executableActions: [
        { kind: "upsert_dns_record", reason: "dns_planned_record:cname", name: "www", type: "CNAME", value: "target.example.com" },
      ],
    }),
    providerAdapterContractReport: report,
  });

  assert.equal(dryRun.providerAdapterStatus.contractStatus, "fail");
  assert.equal(dryRun.providerAdapterStatus.blockers.includes("provider_adapter_contract_failed_for_provider_api_future:inwx"), true);
  assert.equal(dryRun.dryRunStatus, "blocked");
});
