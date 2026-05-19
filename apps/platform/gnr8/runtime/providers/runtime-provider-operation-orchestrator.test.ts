import assert from "node:assert/strict";
import test from "node:test";

import { createAgencyProviderSettings, type AgencyProviderSettings } from "@/gnr8/runtime/providers/agency-provider-settings";
import { createRuntimeProviderOperationBundleFromRequest } from "@/gnr8/runtime/providers/runtime-provider-operation-orchestrator";

function providerSettings(overrides: Partial<AgencyProviderSettings>): AgencyProviderSettings {
  return createAgencyProviderSettings({
    id: overrides.id ?? "settings_1",
    agencyId: overrides.agencyId ?? "agency_1",
    providerId: overrides.providerId ?? "manual",
    environment: overrides.environment ?? "sandbox",
    credentialReference: overrides.credentialReference,
    enabled: overrides.enabled ?? true,
    capabilities: overrides.capabilities ?? ["dns"],
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-01T00:00:00.000Z",
  });
}

test("runtime provider operation orchestrator: manual path", async () => {
  const bundle = await createRuntimeProviderOperationBundleFromRequest({
    siteId: "site_manual",
    siteVersionId: "version_manual",
    providerCapability: "dns",
    operationKind: "manual_instruction",
    agencyProviderSettings: [
      providerSettings({
        id: "manual_disabled",
        providerId: "manual",
        enabled: false,
      }),
    ],
    executionEnvironment: "contract",
  });

  assert.equal(bundle.providerId, "manual");
  assert.equal(bundle.bundleStatus, "ready_for_manual");
  assert.equal(bundle.communicatorResult.routeStatus, "manual");
});

test("runtime provider operation orchestrator: mock provider path", async () => {
  const bundle = await createRuntimeProviderOperationBundleFromRequest({
    siteId: "site_mock",
    siteVersionId: "version_mock",
    providerCapability: "dns",
    operationKind: "upsert_dns_record",
    agencyProviderSettings: [
      providerSettings({
        id: "mock_setting",
        providerId: "mock_provider",
        environment: "sandbox",
      }),
    ],
    executionEnvironment: "sandbox",
  });

  assert.equal(bundle.providerId, "mock_provider");
  assert.equal(bundle.bundleStatus, "ready_for_mock");
  assert.equal(bundle.communicatorResult.routeStatus, "resolved");
});

test("runtime provider operation orchestrator: openprovider sandbox path", async () => {
  const bundle = await createRuntimeProviderOperationBundleFromRequest({
    siteId: "site_unavailable",
    siteVersionId: "version_unavailable",
    providerCapability: "dns",
    operationKind: "upsert_dns_record",
    agencyProviderSettings: [
      providerSettings({
        id: "openprovider_setting",
        providerId: "openprovider",
        environment: "sandbox",
      }),
    ],
    executionEnvironment: "sandbox",
  });

  assert.equal(bundle.providerId, "openprovider");
  assert.equal(bundle.communicatorResult.routeStatus, "resolved");
  assert.equal(bundle.bundleStatus, "blocked");
  assert.equal(bundle.blockers.includes("provider_adapter_missing"), false);
  assert.equal(bundle.blockers.includes("sandbox_credentials_unavailable_for_phase:openprovider"), true);
});

test("runtime provider operation orchestrator: blocked path", async () => {
  const bundle = await createRuntimeProviderOperationBundleFromRequest({
    siteId: "site_blocked",
    siteVersionId: "version_blocked",
    providerCapability: "dns",
    operationKind: "upsert_dns_record",
    agencyProviderSettings: [
      providerSettings({
        id: "mock_live_setting",
        providerId: "mock_provider",
        environment: "live",
      }),
    ],
    executionEnvironment: "live",
  });

  assert.equal(bundle.providerId, "mock_provider");
  assert.equal(bundle.communicatorResult.routeStatus, "blocked");
  assert.equal(bundle.bundleStatus, "blocked");
  assert.equal(bundle.blockers.includes("live_environment_provider_execution_blocked"), true);
});

test("runtime provider operation orchestrator: deterministic output and stable key", async () => {
  const commonInput = {
    siteId: "site_stable",
    siteVersionId: "version_stable",
    providerCapability: "dns" as const,
    operationKind: "upsert_dns_record" as const,
    executionEnvironment: "sandbox" as const,
  };

  const left = await createRuntimeProviderOperationBundleFromRequest({
    ...commonInput,
    agencyProviderSettings: [
      providerSettings({ id: "2", providerId: "mock_provider", environment: "sandbox" }),
      providerSettings({ id: "1", providerId: "manual", environment: "sandbox" }),
    ],
  });

  const right = await createRuntimeProviderOperationBundleFromRequest({
    ...commonInput,
    agencyProviderSettings: [
      providerSettings({ id: "1", providerId: "manual", environment: "sandbox" }),
      providerSettings({ id: "2", providerId: "mock_provider", environment: "sandbox" }),
    ],
  });

  assert.equal(left.correlationKey, right.correlationKey);
  assert.deepEqual(
    left.plannedJobs.map((job) => [job.id, job.operationKind, job.status]),
    right.plannedJobs.map((job) => [job.id, job.operationKind, job.status]),
  );
  assert.deepEqual(left.warnings, right.warnings);
  assert.deepEqual(left.blockers, right.blockers);
});
