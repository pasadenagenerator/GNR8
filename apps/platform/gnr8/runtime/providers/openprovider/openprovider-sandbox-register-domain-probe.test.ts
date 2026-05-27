import assert from "node:assert/strict";
import test from "node:test";

import { runOpenproviderSandboxRegisterDomainProbe } from "@/gnr8/runtime/providers/openprovider/openprovider-sandbox-register-domain-probe";

test("sandbox register probe: requires enable flag", async () => {
  const previousFlag = process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED;
  const previousEndpoint = process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT;
  delete process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED;
  process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT = "http://api.sandbox.openprovider.nl:8480/v1beta/domains";

  try {
    const result = await runOpenproviderSandboxRegisterDomainProbe({ domain: "levi-testis.com" });
    assert.equal(result.success, false);
    assert.equal(result.status, 403);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_SANDBOX_REGISTER_PROBE_FAILED_CLOSED"), true);
  } finally {
    if (previousFlag === undefined) delete process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED;
    else process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED = previousFlag;
    if (previousEndpoint === undefined) delete process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT;
    else process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT = previousEndpoint;
  }
});

test("sandbox register probe: blocks live endpoint", async () => {
  const previousFlag = process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED;
  const previousEndpoint = process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT;
  process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED = "1";
  process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT = "https://api.openprovider.eu/v1beta/domains";

  try {
    const result = await runOpenproviderSandboxRegisterDomainProbe({ domain: "levi-testis.com" });
    assert.equal(result.success, false);
    assert.equal(result.status, 403);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_SANDBOX_REGISTER_PROBE_LIVE_ENDPOINT_BLOCKED"), true);
  } finally {
    if (previousFlag === undefined) delete process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED;
    else process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED = previousFlag;
    if (previousEndpoint === undefined) delete process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT;
    else process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT = previousEndpoint;
  }
});

test("sandbox register probe: uses sandbox auth and sanitized summary", async () => {
  const previousFlag = process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED;
  const previousEndpoint = process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT;
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;

  process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED = "1";
  process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT = "http://api.sandbox.openprovider.nl:8480/v1beta/domains";
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  try {
    const result = await runOpenproviderSandboxRegisterDomainProbe(
      { domain: "levi-testis.com" },
      {
        login: async () => ({ status: 200, json: { data: { token: "token_1" } } }),
        registerDomain: async (input) => {
          assert.equal(input.endpoint, "http://api.sandbox.openprovider.nl:8480/v1beta/domains");
          assert.equal(typeof input.token, "string");
          assert.deepEqual(input.payload, { domain: { name: "levi-testis", extension: "com" }, period: 1 });
          return {
            status: 200,
            json: {
              code: 0,
              desc: "Command completed successfully",
              data: { id: "abc" },
            },
          };
        },
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.status, 200);
    assert.equal(result.summary.responseCode, "0");
    assert.equal(result.summary.responseDesc, "Command completed successfully");
    assert.equal(result.diagnostics.includes("OPENPROVIDER_SANDBOX_REGISTER_PROBE_AUTH_SUCCEEDED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_SANDBOX_REGISTER_PROBE_PERIOD_APPLIED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_SANDBOX_REGISTER_PROBE_REQUEST_SENT"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_SANDBOX_REGISTER_PROBE_SUCCEEDED"), true);
  } finally {
    if (previousFlag === undefined) delete process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED;
    else process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED = previousFlag;
    if (previousEndpoint === undefined) delete process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT;
    else process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT = previousEndpoint;
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("sandbox register probe: accepts explicit period", async () => {
  const previousFlag = process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED;
  const previousEndpoint = process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT;
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;

  process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED = "1";
  process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT = "http://api.sandbox.openprovider.nl:8480/v1beta/domains";
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  try {
    const result = await runOpenproviderSandboxRegisterDomainProbe(
      { domain: "levi-testis.com", period: 3 },
      {
        login: async () => ({ status: 200, json: { data: { token: "token_1" } } }),
        registerDomain: async (input) => {
          assert.deepEqual(input.payload, { domain: { name: "levi-testis", extension: "com" }, period: 3 });
          return { status: 200, json: { code: 0, desc: "Command completed successfully" } };
        },
      },
    );

    assert.equal(result.success, true);
  } finally {
    if (previousFlag === undefined) delete process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED;
    else process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED = previousFlag;
    if (previousEndpoint === undefined) delete process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT;
    else process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT = previousEndpoint;
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("sandbox register probe: rejects invalid period", async () => {
  const previousFlag = process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED;
  const previousEndpoint = process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT;

  process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED = "1";
  process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT = "http://api.sandbox.openprovider.nl:8480/v1beta/domains";

  try {
    const result = await runOpenproviderSandboxRegisterDomainProbe({ domain: "levi-testis.com", period: 0 });
    assert.equal(result.success, false);
    assert.equal(result.status, 400);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_SANDBOX_REGISTER_PROBE_INVALID_PERIOD"), true);
  } finally {
    if (previousFlag === undefined) delete process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED;
    else process.env.OPENPROVIDER_SANDBOX_REGISTRATION_PROBE_ENABLED = previousFlag;
    if (previousEndpoint === undefined) delete process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT;
    else process.env.OPENPROVIDER_SANDBOX_REGISTRATION_ENDPOINT = previousEndpoint;
  }
});
