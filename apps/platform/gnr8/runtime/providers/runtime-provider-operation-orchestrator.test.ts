import assert from "node:assert/strict";
import test from "node:test";

import { createAgencyProviderSettings, type AgencyProviderSettings } from "@/gnr8/runtime/providers/agency-provider-settings";
import { createProviderCredentialReference } from "@/gnr8/runtime/providers/provider-credential-reference";
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
  const { bundle, approvalRequirement, approvalArtifact } = await createRuntimeProviderOperationBundleFromRequest({
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
  assert.equal(bundle.credentialResolution?.resolutionStatus, "resolved");
  assert.equal(approvalRequirement.approvalStatus, "required");
  assert.equal(approvalRequirement.requiredApprovals.includes("manual_provider_action"), true);
  assert.equal(approvalArtifact.approvalStatus, "required");
  assert.equal(approvalArtifact.requiredApprovals.includes("manual_provider_action"), true);
});

test("runtime provider operation orchestrator: mock provider path", async () => {
  const { bundle, approvalRequirement, approvalArtifact } = await createRuntimeProviderOperationBundleFromRequest({
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
  assert.equal(approvalRequirement.approvalStatus, "required");
  assert.equal(approvalRequirement.requiredApprovals.includes("sandbox_provider_action"), true);
  assert.equal(approvalArtifact.approvalStatus, "required");
  assert.equal(approvalArtifact.requiredApprovals.includes("sandbox_provider_action"), true);
});

test("runtime provider operation orchestrator: openprovider sandbox path", async () => {
  const { bundle, approvalRequirement, approvalArtifact } = await createRuntimeProviderOperationBundleFromRequest({
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
  assert.equal(bundle.credentialResolution?.resolutionStatus, "missing_reference");
  assert.equal(bundle.blockers.includes("provider_adapter_missing"), false);
  assert.equal(bundle.blockers.includes("sandbox_credentials_unavailable_for_phase:openprovider"), true);
  assert.equal(approvalRequirement.approvalStatus, "blocked");
  assert.equal(approvalArtifact.riskLevel, "blocked");
});

test("runtime provider operation orchestrator: openprovider sandbox path builds non-live bundle", async () => {
  const { bundle, approvalRequirement, approvalArtifact, handoffArtifact, workerPickupEvidence } = await createRuntimeProviderOperationBundleFromRequest({
    siteId: "site_openprovider_sandbox",
    siteVersionId: "version_openprovider_sandbox",
    providerCapability: "dns",
    operationKind: "upsert_dns_record",
    agencyProviderSettings: [
      providerSettings({
        id: "openprovider_sandbox_setting",
        providerId: "openprovider",
        environment: "sandbox",
        capabilities: ["dns", "domains"],
        credentialReference: "openprovider-sandbox",
        enabled: true,
      }),
    ],
    executionEnvironment: "sandbox",
    credentialReferences: [
      createProviderCredentialReference({
        id: "openprovider_ref_partial",
        agencyId: "agency_1",
        providerId: "openprovider",
        referenceKey: "openprovider-sandbox",
        environment: "sandbox",
        credentialNames: ["openprovider_sandbox_username"],
      }),
    ],
  });

  assert.equal(bundle.providerSelection.selectedProviderId, "openprovider");
  assert.equal(bundle.providerSelection.environment, "sandbox");
  assert.equal(bundle.credentialResolution?.resolutionStatus, "incomplete");
  assert.deepEqual(bundle.credentialResolution?.missingCredentialNames, ["OPENPROVIDER_SANDBOX_PASSWORD"]);
  assert.equal(bundle.communicatorResult.routeStatus, "resolved");
  assert.equal(bundle.executionIntent.executionMode, "provider_api_future");
  assert.equal(bundle.executionDryRun.providerAdapterStatus.providerId, "openprovider");
  assert.equal(bundle.executionDryRun.providerAdapterStatus.contractStatus, "pass");
  assert.notEqual(bundle.executionGate.gateStatus, "open_for_live");
  assert.notEqual(bundle.executionGate.gateStatus, "live");

  const hasMissingSandboxCredentialBlocker = bundle.blockers.some((blocker) =>
    blocker.startsWith("sandbox_credentials_unavailable_for_phase:"),
  );

  if (hasMissingSandboxCredentialBlocker) {
    assert.equal(bundle.bundleStatus, "blocked");
    assert.equal(bundle.blockers.includes("sandbox_credentials_unavailable_for_phase:openprovider"), true);
  } else {
    assert.equal(bundle.bundleStatus, "ready_for_mock");
  }

  assert.equal(bundle.plannedJobs.some((job) => job.status === "running"), false);
  assert.equal(bundle.plannedJobs.some((job) => job.status === "completed"), false);
  assert.equal(bundle.plannedJobs.every((job) => job.environment !== "live"), true);
  assert.equal(approvalArtifact.artifactId.length > 0, true);
  assert.equal(handoffArtifact.artifactId, approvalArtifact.artifactId);
  assert.equal(workerPickupEvidence.handoffRef, handoffArtifact.handoffId);
  assert.equal(workerPickupEvidence.approvalRef, approvalArtifact.artifactId);
  assert.equal(workerPickupEvidence.executionBlocked, true);
  assert.equal(
    workerPickupEvidence.nextAllowedAction,
    "control_plane_review_and_dry_run_artifact_inspection_only",
  );
});

test("runtime provider operation orchestrator: openprovider sandbox complete credential names resolves metadata only", async () => {
  const { bundle, approvalRequirement, approvalArtifact } = await createRuntimeProviderOperationBundleFromRequest({
    siteId: "site_openprovider_sandbox_complete",
    siteVersionId: "version_openprovider_sandbox_complete",
    providerCapability: "dns",
    operationKind: "upsert_dns_record",
    agencyProviderSettings: [
      providerSettings({
        id: "openprovider_sandbox_setting_complete",
        providerId: "openprovider",
        environment: "sandbox",
        capabilities: ["dns", "domains"],
        credentialReference: "openprovider-sandbox-complete",
        enabled: true,
      }),
    ],
    executionEnvironment: "sandbox",
    credentialReferences: [
      createProviderCredentialReference({
        id: "openprovider_ref_complete",
        agencyId: "agency_1",
        providerId: "openprovider",
        referenceKey: "openprovider-sandbox-complete",
        environment: "sandbox",
        credentialNames: ["openprovider_sandbox_username", "openprovider_sandbox_password"],
      }),
    ],
  });

  assert.equal(bundle.providerId, "openprovider");
  assert.equal(bundle.credentialResolution?.resolutionStatus, "resolved");
  assert.deepEqual(bundle.credentialResolution?.missingCredentialNames, []);
  assert.equal(bundle.communicatorResult.routeStatus, "resolved");
  assert.equal(bundle.plannedJobs.some((job) => job.status === "running"), false);
  assert.equal(bundle.plannedJobs.some((job) => job.status === "completed"), false);
  assert.equal(approvalArtifact.approvalStatus === "blocked", bundle.bundleStatus === "blocked");
});

test("runtime provider operation orchestrator: credential resolution report does not leak secret values", async () => {
  const { bundle, approvalRequirement, approvalArtifact } = await createRuntimeProviderOperationBundleFromRequest({
    siteId: "site_openprovider_no_leak",
    siteVersionId: "version_openprovider_no_leak",
    providerCapability: "dns",
    operationKind: "upsert_dns_record",
    agencyProviderSettings: [
      providerSettings({
        id: "openprovider_sandbox_setting_no_leak",
        providerId: "openprovider",
        environment: "sandbox",
        capabilities: ["dns"],
        credentialReference: "openprovider-sandbox-no-leak",
      }),
    ],
    executionEnvironment: "sandbox",
    credentialReferences: [
      createProviderCredentialReference({
        id: "openprovider_ref_no_leak",
        agencyId: "agency_1",
        providerId: "openprovider",
        referenceKey: "openprovider-sandbox-no-leak",
        environment: "sandbox",
        credentialNames: ["openprovider_sandbox_username", "openprovider_sandbox_password"],
      }),
    ],
  });

  assert.deepEqual(Object.keys(bundle.credentialResolution ?? {}).sort(), [
    "availableCredentialNames",
    "blockers",
    "correlationKey",
    "credentialReference",
    "environment",
    "missingCredentialNames",
    "providerId",
    "requiredCredentialNames",
    "resolutionStatus",
    "warnings",
  ]);
  assert.equal(approvalArtifact.summary.includes("risk="), true);
});

test("runtime provider operation orchestrator: blocked path", async () => {
  const { bundle, approvalRequirement, approvalArtifact } = await createRuntimeProviderOperationBundleFromRequest({
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
  assert.equal(approvalRequirement.approvalStatus, "blocked");
  assert.equal(approvalArtifact.riskLevel, "blocked");
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
  assert.equal(left.bundle.correlationKey, right.bundle.correlationKey);
  assert.equal(left.approvalArtifact.artifactId, right.approvalArtifact.artifactId);
  assert.deepEqual(
    left.bundle.plannedJobs.map((job) => [job.id, job.operationKind, job.status]),
    right.bundle.plannedJobs.map((job) => [job.id, job.operationKind, job.status]),
  );
  assert.deepEqual(left.bundle.warnings, right.bundle.warnings);
  assert.deepEqual(left.bundle.blockers, right.bundle.blockers);
});
