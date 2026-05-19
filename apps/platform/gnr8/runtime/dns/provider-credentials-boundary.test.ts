import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateProviderCredentialBoundary,
  listProviderCredentialRequirements,
} from "@/gnr8/runtime/dns/provider-credentials-boundary";

test("provider credentials boundary: manual contract safe", () => {
  const report = evaluateProviderCredentialBoundary({
    providerId: "manual",
    environment: "contract",
  });

  assert.equal(report.safetyStatus, "safe");
  assert.deepEqual(report.requiredCredentials, []);
  assert.deepEqual(report.missingCredentials, []);
  assert.deepEqual(report.blockers, []);
});

test("provider credentials boundary: openprovider contract safe without secrets", () => {
  const report = evaluateProviderCredentialBoundary({
    providerId: "openprovider",
    environment: "contract",
  });

  assert.equal(report.safetyStatus, "safe");
  assert.deepEqual(report.requiredCredentials, []);
  assert.deepEqual(report.missingCredentials, []);
  assert.deepEqual(report.forbiddenCredentials, []);
});

test("provider credentials boundary: openprovider sandbox missing credential names reported", () => {
  const report = evaluateProviderCredentialBoundary({
    providerId: "openprovider",
    environment: "sandbox",
    availableCredentialNames: ["OPENPROVIDER_SANDBOX_USERNAME"],
  });

  assert.equal(report.safetyStatus, "blocked");
  assert.deepEqual(report.requiredCredentials, ["OPENPROVIDER_SANDBOX_PASSWORD", "OPENPROVIDER_SANDBOX_USERNAME"]);
  assert.deepEqual(report.missingCredentials, ["OPENPROVIDER_SANDBOX_PASSWORD"]);
  assert.equal(report.warnings.includes("sandbox_required_credentials_missing:openprovider"), true);
  assert.equal(report.blockers.includes("sandbox_credentials_unavailable_for_phase:openprovider"), true);
});

test("provider credentials boundary: openprovider sandbox names present remain warning/safe according to model", () => {
  const report = evaluateProviderCredentialBoundary({
    providerId: "openprovider",
    environment: "sandbox",
    availableCredentialNames: ["OPENPROVIDER_SANDBOX_USERNAME", "OPENPROVIDER_SANDBOX_PASSWORD"],
  });

  assert.deepEqual(report.missingCredentials, []);
  assert.equal(report.safetyStatus === "warning" || report.safetyStatus === "safe", true);
});

test("provider credentials boundary: openprovider live blocked even if names exist", () => {
  const report = evaluateProviderCredentialBoundary({
    providerId: "openprovider",
    environment: "live",
    availableCredentialNames: ["OPENPROVIDER_LIVE_USERNAME", "OPENPROVIDER_LIVE_PASSWORD"],
  });

  assert.equal(report.safetyStatus, "blocked");
  assert.equal(report.blockers.includes("live_credentials_blocked_in_current_phase:openprovider"), true);
});

test("provider credentials boundary: live blocked", () => {
  const report = evaluateProviderCredentialBoundary({
    providerId: "inwx",
    environment: "live",
    availableCredentialNames: ["INWX_USERNAME", "INWX_PASSWORD"],
  });

  assert.equal(report.safetyStatus, "blocked");
  assert.equal(report.blockers.includes("live_credentials_blocked_in_current_phase:inwx"), true);
});

test("provider credentials boundary: secret-like values forbidden", () => {
  const report = evaluateProviderCredentialBoundary({
    providerId: "netim",
    environment: "contract",
    credentialValuesByName: {
      NETIM_PASSWORD: "sk_live_ABCDEF1234567890SECRET",
    },
  });

  assert.equal(report.safetyStatus, "blocked");
  assert.deepEqual(report.forbiddenCredentials, ["NETIM_PASSWORD"]);
  assert.equal(report.blockers.includes("forbidden_secret_like_values_passed:netim"), true);
});

test("provider credentials boundary: deterministic ordering", () => {
  const report = evaluateProviderCredentialBoundary({
    providerId: "realtime_register",
    environment: "sandbox",
    availableCredentialNames: ["REALTIME_REGISTER_USERNAME"],
    credentialValuesByName: {
      REALTIME_REGISTER_API_KEY: "sk_abcdefghijklmnopqrstuvwxyz123456",
      REALTIME_REGISTER_TOKEN: "aaaa.bbbb.cccc",
    },
  });

  assert.deepEqual(report.requiredCredentials, ["REALTIME_REGISTER_PASSWORD", "REALTIME_REGISTER_USERNAME"]);
  assert.deepEqual(report.missingCredentials, ["REALTIME_REGISTER_PASSWORD"]);
  assert.deepEqual(report.forbiddenCredentials, ["REALTIME_REGISTER_API_KEY"]);
});

test("provider credentials boundary: stable correlation key", () => {
  const a = evaluateProviderCredentialBoundary({
    providerId: "openprovider",
    environment: "sandbox",
    availableCredentialNames: ["OPENPROVIDER_SANDBOX_USERNAME"],
  });

  const b = evaluateProviderCredentialBoundary({
    providerId: "openprovider",
    environment: "sandbox",
    availableCredentialNames: ["OPENPROVIDER_SANDBOX_USERNAME"],
  });

  assert.equal(a.correlationKey, b.correlationKey);
  assert.equal(a.correlationKey.length, 64);
});

test("provider credentials boundary: requirement list contract has no required credentials", () => {
  const requirements = listProviderCredentialRequirements({
    providerId: "openprovider",
    environment: "contract",
  });

  assert.deepEqual(requirements, []);
});

test("provider credentials boundary: output never leaks credential values", () => {
  const secretValue = "sk_live_ABCDEF1234567890SECRET";
  const report = evaluateProviderCredentialBoundary({
    providerId: "openprovider",
    environment: "sandbox",
    credentialValuesByName: {
      OPENPROVIDER_SANDBOX_PASSWORD: secretValue,
    },
  });

  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes(secretValue), false);
});
