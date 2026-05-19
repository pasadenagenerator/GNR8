import assert from "node:assert/strict";
import test from "node:test";

import { readFileSync } from "node:fs";

import { createDnsZoneIdentity, type DnsRecordSpec } from "@/gnr8/runtime/dns/dns-provider-types";
import { assertDnsProviderAdapterContract, getDnsProviderAdapter } from "@/gnr8/runtime/dns/provider-adapter-registry";
import { evaluateDnsProviderImplementationReadiness } from "@/gnr8/runtime/dns/provider-implementation-readiness";
import { createProviderSandboxAdapterDescriptor } from "@/gnr8/runtime/dns/provider-sandbox-adapters";
import { evaluateProviderCredentialBoundary } from "@/gnr8/runtime/dns/provider-credentials-boundary";
import { evaluateProviderExecutionGate } from "@/gnr8/runtime/dns/provider-execution-gate";
import type { RuntimeDomainExecutionDryRun } from "@/gnr8/runtime/domains/runtime-domain-execution-dry-run";
import {
  createOpenproviderSandboxAdapter,
  createOpenproviderSandboxExpectedVerificationValue,
} from "@/gnr8/runtime/dns/openprovider-sandbox-adapter";

const zone = createDnsZoneIdentity({ providerId: "openprovider", domain: "Example.com" });

const verificationRecord: DnsRecordSpec = {
  intent: "verification_txt",
  type: "txt",
  host: "_acme-challenge",
  name: "_acme-challenge.example.com",
  value: "placeholder",
  ttlSeconds: 60,
};

function buildDryRun(): RuntimeDomainExecutionDryRun {
  return {
    siteId: "site_openprovider_test",
    providerId: "openprovider",
    executionMode: "provider_api_future",
    dryRunActions: [],
    skippedActions: [],
    blockedActions: [],
    warnings: [],
    blockers: [],
    providerAdapterStatus: {
      providerId: "openprovider",
      adapterAvailable: true,
      contractStatus: "pass",
      warnings: [],
      blockers: [],
    },
    dryRunStatus: "ready",
    correlationKey: "dry_run_openprovider_key",
  };
}

test("openprovider sandbox adapter: deterministic behavior", async () => {
  const adapter = createOpenproviderSandboxAdapter();

  const available = await adapter.checkAvailability({ domain: "ready.example.test" });
  const unavailableBySuffix = await adapter.checkAvailability({ domain: "name.unavailable.test" });
  const unavailableByToken = await adapter.checkAvailability({ domain: "my-taken-domain.test" });

  assert.deepEqual(available, { available: true });
  assert.deepEqual(unavailableBySuffix, { available: false, reason: "openprovider_sandbox_unavailable" });
  assert.deepEqual(unavailableByToken, { available: false, reason: "openprovider_sandbox_unavailable" });

  const expectedValue = createOpenproviderSandboxExpectedVerificationValue({ zone, record: verificationRecord });
  const verified = await adapter.verifyRecord({
    zone,
    record: {
      type: verificationRecord.type,
      host: verificationRecord.host,
      name: verificationRecord.name,
      value: expectedValue,
    },
  });
  const unverified = await adapter.verifyRecord({
    zone,
    record: {
      type: verificationRecord.type,
      host: verificationRecord.host,
      name: verificationRecord.name,
      value: "wrong",
    },
  });

  assert.deepEqual(verified, { verified: true, observedValue: expectedValue });
  assert.deepEqual(unverified, { verified: false, observedValue: "wrong" });
});

test("openprovider sandbox adapter: stable references", async () => {
  const adapter = createOpenproviderSandboxAdapter();

  const zoneResultA = await adapter.createZone({ zone });
  const zoneResultB = await adapter.createZone({ zone: { ...zone } });

  const recordResultA = await adapter.upsertRecord({ zone, record: verificationRecord });
  const recordResultB = await adapter.upsertRecord({ zone: { ...zone }, record: { ...verificationRecord } });

  assert.equal(zoneResultA.zoneReference, zoneResultB.zoneReference);
  assert.equal(recordResultA.recordReference, recordResultB.recordReference);
  assert.equal(zoneResultA.zoneReference.startsWith("openprovider_sandbox_zone_"), true);
  assert.equal(recordResultA.recordReference.startsWith("openprovider_sandbox_record_"), true);

  const deleted = await adapter.deleteRecord({
    zone,
    record: {
      type: verificationRecord.type,
      host: verificationRecord.host,
      name: verificationRecord.name,
      value: verificationRecord.value,
    },
  });

  assert.deepEqual(deleted, { deleted: true });
});

test("openprovider sandbox adapter: contract harness passes", async () => {
  const report = await assertDnsProviderAdapterContract("openprovider");
  assert.ok(report);
  assert.equal(report?.contractStatus, "pass");
});

test("openprovider sandbox adapter: registry resolves adapter", () => {
  const adapter = getDnsProviderAdapter("openprovider");
  assert.ok(adapter);
  assert.equal(adapter?.providerId, "openprovider");
});

test("openprovider sandbox adapter: implementation readiness ready_for_sandbox", async () => {
  const adapter = getDnsProviderAdapter("openprovider");
  const contractReport = await assertDnsProviderAdapterContract("openprovider");

  assert.ok(adapter);
  assert.ok(contractReport);

  const readiness = evaluateDnsProviderImplementationReadiness({
    providerId: "openprovider",
    capability: adapter?.capability,
    adapter,
    contractReport,
  });

  assert.equal(readiness.readinessStatus, "ready_for_sandbox");
});

test("openprovider sandbox adapter: sandbox descriptor mode mock and live blocked", async () => {
  const adapter = getDnsProviderAdapter("openprovider");
  const contractReport = await assertDnsProviderAdapterContract("openprovider");

  assert.ok(adapter);
  assert.ok(contractReport);

  const readiness = evaluateDnsProviderImplementationReadiness({
    providerId: "openprovider",
    capability: adapter?.capability,
    adapter,
    contractReport,
  });

  const boundary = evaluateProviderCredentialBoundary({
    providerId: "openprovider",
    environment: "sandbox",
    availableCredentialNames: ["OPENPROVIDER_USERNAME", "OPENPROVIDER_PASSWORD"],
  });

  const sandboxGate = evaluateProviderExecutionGate({
    dryRun: buildDryRun(),
    providerReadiness: readiness,
    credentialBoundary: boundary,
    requestedEnvironment: "sandbox",
  });

  const sandboxDescriptor = createProviderSandboxAdapterDescriptor("openprovider", readiness, boundary, sandboxGate);
  assert.equal(sandboxDescriptor.mode, "mock");

  const liveGate = evaluateProviderExecutionGate({
    dryRun: buildDryRun(),
    providerReadiness: readiness,
    credentialBoundary: boundary,
    requestedEnvironment: "live",
  });
  const liveDescriptor = createProviderSandboxAdapterDescriptor("openprovider", readiness, boundary, liveGate);
  assert.equal(liveDescriptor.liveEligible, false);
  assert.equal(liveDescriptor.mode, "live_blocked");
});

test("openprovider sandbox adapter: no fetch or network usage", async () => {
  const adapter = createOpenproviderSandboxAdapter();
  let networkCalls = 0;
  const previousFetch = globalThis.fetch;

  globalThis.fetch = (async (..._args: Parameters<typeof fetch>) => {
    networkCalls += 1;
    throw new Error("network_not_allowed");
  }) as typeof fetch;

  try {
    await adapter.checkAvailability({ domain: "ready.example.test" });
    await adapter.createZone({ zone });
    await adapter.upsertRecord({ zone, record: verificationRecord });
    await adapter.deleteRecord({
      zone,
      record: {
        type: verificationRecord.type,
        host: verificationRecord.host,
        name: verificationRecord.name,
        value: verificationRecord.value,
      },
    });
    await adapter.verifyRecord({
      zone,
      record: {
        type: verificationRecord.type,
        host: verificationRecord.host,
        name: verificationRecord.name,
        value: verificationRecord.value,
      },
    });
  } finally {
    globalThis.fetch = previousFetch;
  }

  assert.equal(networkCalls, 0);

  const source = readFileSync(new URL("./openprovider-sandbox-adapter.ts", import.meta.url), "utf8");
  assert.equal(/\bfetch\b/.test(source), false);
  assert.equal(/\baxios\b/.test(source), false);
  assert.equal(/\bhttp\b/.test(source), false);
  assert.equal(/\bhttps\b/.test(source), false);
});
