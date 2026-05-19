import assert from "node:assert/strict";
import test from "node:test";

import { createAgencyProviderSettings, type AgencyProviderSettings } from "@/gnr8/runtime/providers/agency-provider-settings";
import {
  createProviderCredentialReference,
  type ProviderCredentialReference,
} from "@/gnr8/runtime/providers/provider-credential-reference";
import { resolveProviderCredentialReference } from "@/gnr8/runtime/providers/provider-credential-resolution";

function settings(overrides?: Partial<AgencyProviderSettings>): AgencyProviderSettings {
  return createAgencyProviderSettings({
    id: overrides?.id ?? "aps_1",
    agencyId: overrides?.agencyId ?? "agency_1",
    providerId: overrides?.providerId ?? "openprovider",
    environment: overrides?.environment ?? "sandbox",
    credentialReference: overrides?.credentialReference,
    enabled: overrides?.enabled ?? true,
    capabilities: overrides?.capabilities ?? ["dns"],
    createdAt: overrides?.createdAt ?? "2026-05-19T10:00:00.000Z",
    updatedAt: overrides?.updatedAt ?? "2026-05-19T10:00:00.000Z",
  });
}

function reference(overrides?: Partial<ProviderCredentialReference>): ProviderCredentialReference {
  return createProviderCredentialReference({
    id: overrides?.id ?? "pcr_1",
    agencyId: overrides?.agencyId ?? "agency_1",
    providerId: overrides?.providerId ?? "openprovider",
    referenceKey: overrides?.referenceKey ?? "vault:gnr8/openprovider/default",
    environment: overrides?.environment ?? "sandbox",
    credentialNames: overrides?.credentialNames ?? ["OPENPROVIDER_SANDBOX_USERNAME", "OPENPROVIDER_SANDBOX_PASSWORD"],
    enabled: overrides?.enabled ?? true,
    createdAt: overrides?.createdAt ?? "2026-05-19T10:00:00.000Z",
    updatedAt: overrides?.updatedAt ?? "2026-05-19T10:00:00.000Z",
  });
}

test("provider credential resolution: manual provider always resolves with no required names", () => {
  const report = resolveProviderCredentialReference({
    settings: settings({ providerId: "manual", environment: "live", credentialReference: undefined }),
  });

  assert.equal(report.resolutionStatus, "resolved");
  assert.deepEqual(report.requiredCredentialNames, []);
  assert.deepEqual(report.missingCredentialNames, []);
});

test("provider credential resolution: contract environment resolves with no required names", () => {
  const report = resolveProviderCredentialReference({
    settings: settings({ providerId: "openprovider", environment: "contract", credentialReference: undefined }),
  });

  assert.equal(report.resolutionStatus, "resolved");
  assert.deepEqual(report.requiredCredentialNames, []);
  assert.deepEqual(report.missingCredentialNames, []);
});

test("provider credential resolution: openprovider sandbox missing reference", () => {
  const report = resolveProviderCredentialReference({
    settings: settings({ providerId: "openprovider", environment: "sandbox", credentialReference: undefined }),
  });

  assert.equal(report.resolutionStatus, "missing_reference");
  assert.deepEqual(report.requiredCredentialNames, ["OPENPROVIDER_SANDBOX_PASSWORD", "OPENPROVIDER_SANDBOX_USERNAME"]);
  assert.deepEqual(report.availableCredentialNames, []);
  assert.deepEqual(report.missingCredentialNames, ["OPENPROVIDER_SANDBOX_PASSWORD", "OPENPROVIDER_SANDBOX_USERNAME"]);
});

test("provider credential resolution: openprovider sandbox partial names", () => {
  const report = resolveProviderCredentialReference({
    settings: settings({ providerId: "openprovider", environment: "sandbox", credentialReference: "vault:gnr8/op/sandbox" }),
    credentialReference: reference({ credentialNames: ["openprovider_sandbox_username"] }),
  });

  assert.equal(report.resolutionStatus, "incomplete");
  assert.deepEqual(report.availableCredentialNames, ["OPENPROVIDER_SANDBOX_USERNAME"]);
  assert.deepEqual(report.missingCredentialNames, ["OPENPROVIDER_SANDBOX_PASSWORD"]);
});

test("provider credential resolution: openprovider sandbox complete names", () => {
  const report = resolveProviderCredentialReference({
    settings: settings({ providerId: "openprovider", environment: "sandbox", credentialReference: "vault:gnr8/op/sandbox" }),
    credentialReference: reference({
      credentialNames: ["OPENPROVIDER_SANDBOX_PASSWORD", "OPENPROVIDER_SANDBOX_USERNAME"],
    }),
  });

  assert.equal(report.resolutionStatus, "resolved");
  assert.deepEqual(report.missingCredentialNames, []);
});

test("provider credential resolution: openprovider live remains blocked", () => {
  const report = resolveProviderCredentialReference({
    settings: settings({ providerId: "openprovider", environment: "live", credentialReference: "vault:gnr8/op/live" }),
    credentialReference: reference({
      environment: "live",
      credentialNames: ["OPENPROVIDER_LIVE_USERNAME", "OPENPROVIDER_LIVE_PASSWORD"],
    }),
  });

  assert.equal(report.resolutionStatus, "blocked");
  assert.equal(report.blockers.includes("openprovider_live_credentials_blocked_in_current_phase"), true);
});

test("provider credential resolution: deterministic ordering and dedupe", () => {
  const report = resolveProviderCredentialReference({
    settings: settings({ providerId: "openprovider", environment: "sandbox", credentialReference: "vault:gnr8/op/sandbox" }),
    credentialReference: reference({
      credentialNames: [
        "openprovider_sandbox_username",
        "OPENPROVIDER_SANDBOX_PASSWORD",
        "OPENPROVIDER_SANDBOX_PASSWORD",
        "OPENPROVIDER_SANDBOX_USERNAME",
      ],
    }),
  });

  assert.deepEqual(report.availableCredentialNames, ["OPENPROVIDER_SANDBOX_PASSWORD", "OPENPROVIDER_SANDBOX_USERNAME"]);
  assert.deepEqual(report.requiredCredentialNames, ["OPENPROVIDER_SANDBOX_PASSWORD", "OPENPROVIDER_SANDBOX_USERNAME"]);
});

test("provider credential resolution: stable correlation key across equivalent inputs", () => {
  const commonSettings = settings({
    providerId: "openprovider",
    environment: "sandbox",
    credentialReference: "vault:gnr8/op/sandbox",
  });

  const left = resolveProviderCredentialReference({
    settings: commonSettings,
    credentialReference: reference({ credentialNames: ["openprovider_sandbox_username", "openprovider_sandbox_password"] }),
  });

  const right = resolveProviderCredentialReference({
    settings: commonSettings,
    credentialReference: reference({ credentialNames: ["OPENPROVIDER_SANDBOX_PASSWORD", "OPENPROVIDER_SANDBOX_USERNAME"] }),
  });

  assert.equal(left.correlationKey, right.correlationKey);
});

test("provider credential resolution: no secret leakage in report", () => {
  const report = resolveProviderCredentialReference({
    settings: settings({ providerId: "openprovider", environment: "sandbox", credentialReference: "vault:gnr8/op/sandbox" }),
    credentialReference: reference({ credentialNames: ["OPENPROVIDER_SANDBOX_PASSWORD", "OPENPROVIDER_SANDBOX_USERNAME"] }),
  });

  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes("super-secret"), false);
  assert.equal(serialized.includes("password123"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(report as object, "credentialValues"), false);
});

test("provider credential resolution: does not read env credentials", () => {
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "ENV_USERNAME_SHOULD_NOT_BE_READ";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "ENV_PASSWORD_SHOULD_NOT_BE_READ";

  const report = resolveProviderCredentialReference({
    settings: settings({ providerId: "openprovider", environment: "sandbox", credentialReference: "vault:gnr8/op/sandbox" }),
    credentialReference: reference({ credentialNames: [] }),
  });

  assert.equal(report.resolutionStatus, "incomplete");
  assert.deepEqual(report.availableCredentialNames, []);
  assert.deepEqual(report.missingCredentialNames, ["OPENPROVIDER_SANDBOX_PASSWORD", "OPENPROVIDER_SANDBOX_USERNAME"]);
});
