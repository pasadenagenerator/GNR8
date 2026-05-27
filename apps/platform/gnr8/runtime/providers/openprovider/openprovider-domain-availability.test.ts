import assert from "node:assert/strict";
import test from "node:test";

import { readOpenproviderDomainAvailability } from "@/gnr8/runtime/providers/openprovider/openprovider-domain-availability";

test("openprovider availability: missing credentials fails closed", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
  delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;

  try {
    const result = await readOpenproviderDomainAvailability("gnr8-test.com");
    assert.equal(result.provider, "openprovider");
    assert.equal(result.readOnly, true);
    assert.equal(result.executionAllowed, false);
    assert.equal(result.executionBlocked, true);
    assert.equal(result.domain, "gnr8-test.com");
    assert.equal(result.available, "unknown");
    assert.equal(result.status, "failed_closed");
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AVAILABILITY_FAILED_CLOSED"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider availability: available domain normalizes to available=true", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  const previousEndpoint = process.env.OPENPROVIDER_DOMAIN_AVAILABILITY_ENDPOINT;
  const previousInventoryEndpoint = process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";
  process.env.OPENPROVIDER_DOMAIN_AVAILABILITY_ENDPOINT = "https://api.openprovider.eu/v1beta/domains/check";
  process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT = "http://api.sandbox.openprovider.nl:8480/v1beta/domains/search";

  try {
    const callOrder: string[] = [];
    const result = await readOpenproviderDomainAvailability("GnR8-TeSt.Com", {
      login: async ({ endpoint, username, password }) => {
        callOrder.push("auth");
        assert.equal(endpoint, "http://api.sandbox.openprovider.nl:8480/v1beta/auth/login");
        assert.equal(username, "user");
        assert.equal(password, "pass");
        return { status: 200, json: { data: { token: "token_abc" } } };
      },
      checkAvailability: async ({ endpoint, token, domain }) => {
        callOrder.push("availability");
        assert.equal(endpoint, "https://api.openprovider.eu/v1beta/domains/check");
        assert.equal(token, "token_abc");
        assert.equal(domain, "gnr8-test.com");
        return {
          status: 200,
          json: {
            data: {
              results: [{ domain: "gnr8-test.com", status: "free" }],
            },
          },
        };
      },
      now: () => "2026-05-26T00:00:00.000Z",
    });

    assert.deepEqual(callOrder, ["auth", "availability"]);
    assert.equal(result.domain, "gnr8-test.com");
    assert.equal(result.available, true);
    assert.equal(result.status, "available");
    assert.equal(result.checkedAt, "2026-05-26T00:00:00.000Z");
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AVAILABILITY_REQUEST_SHAPED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AVAILABILITY_SUCCEEDED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AVAILABILITY_BOUNDARY_CONFIRMED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AUTH_STARTED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AUTH_SUCCEEDED"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
    if (previousEndpoint === undefined) delete process.env.OPENPROVIDER_DOMAIN_AVAILABILITY_ENDPOINT;
    else process.env.OPENPROVIDER_DOMAIN_AVAILABILITY_ENDPOINT = previousEndpoint;
    if (previousInventoryEndpoint === undefined) delete process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT;
    else process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT = previousInventoryEndpoint;
  }
});

test("openprovider availability: unavailable domain normalizes to available=false", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  try {
    const result = await readOpenproviderDomainAvailability("taken.com", {
      login: async () => ({ status: 200, json: { token: "token_xyz" } }),
      checkAvailability: async () => ({ status: 200, json: { data: [{ available: false }] } }),
    });

    assert.equal(result.available, false);
    assert.equal(result.status, "unavailable");
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider availability: unsupported response shape returns unknown+unsupported", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  try {
    const result = await readOpenproviderDomainAvailability("mystery.com", {
      login: async () => ({ status: 200, json: { token: "token_xyz" } }),
      checkAvailability: async () => ({ status: 200, json: { data: { weird: "shape" } } }),
    });

    assert.equal(result.available, "unknown");
    assert.equal(result.status, "unsupported");
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AVAILABILITY_RESPONSE_UNSUPPORTED_SHAPE"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider availability: no secret leakage in diagnostics", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  try {
    const result = await readOpenproviderDomainAvailability("secret-test.com", {
      login: async () => {
        throw new Error("password token secret bearer leaked");
      },
    });

    const joined = result.diagnostics.join(" ").toLowerCase();
    assert.equal(joined.includes("password"), false);
    assert.equal(joined.includes("token"), false);
    assert.equal(joined.includes("secret"), false);
    assert.equal(joined.includes("bearer"), false);
    assert.equal(result.status, "failed_closed");
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider availability: auth failure fails closed before availability request", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  try {
    const result = await readOpenproviderDomainAvailability("blocked.com", {
      login: async () => ({ status: 500, json: { error: "server" } }),
      checkAvailability: async () => {
        throw new Error("availability should not be called");
      },
    });

    assert.equal(result.readOnly, true);
    assert.equal(result.executionAllowed, false);
    assert.equal(result.executionBlocked, true);
    assert.equal(result.status, "failed_closed");
    assert.equal(result.available, "unknown");
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AUTH_STARTED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AUTH_SUCCEEDED"), false);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AUTH_FAILED_CLOSED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AUTH_HTTP_STATUS_500"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AVAILABILITY_FAILED_CLOSED"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider availability: non-2xx includes sanitized provider summary and provider code diagnostic", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  try {
    const result = await readOpenproviderDomainAvailability("registry-down.com", {
      login: async () => ({ status: 200, json: { token: "token_xyz" } }),
      checkAvailability: async () => ({
        status: 500,
        json: { code: "10", desc: "Registry currently not reachable", meta: { trace: "x" } },
      }),
    });

    assert.equal(result.status, "failed_closed");
    assert.equal(result.available, "unknown");
    assert.equal(result.readOnly, true);
    assert.equal(result.executionAllowed, false);
    assert.equal(result.executionBlocked, true);
    assert.deepEqual(result.providerSummary, {
      topLevelKeys: ["code", "desc", "meta"],
      responseCode: "10",
      responseDesc: "Registry currently not reachable",
    });
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AVAILABILITY_PROVIDER_CODE_10"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AVAILABILITY_PROVIDER_DESC_PRESENT"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider availability: secret-like provider desc is redacted", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  try {
    const result = await readOpenproviderDomainAvailability("redact-desc.com", {
      login: async () => ({ status: 200, json: { token: "token_xyz" } }),
      checkAvailability: async () => ({
        status: 500,
        json: { code: "11", desc: "token bearer password secret leaked", token: "abc" },
      }),
    });

    assert.equal(result.status, "failed_closed");
    assert.equal(result.providerSummary?.responseDesc, "credential_redacted");
    assert.deepEqual(result.providerSummary?.topLevelKeys, ["code", "desc"]);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AVAILABILITY_PROVIDER_CODE_11"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AVAILABILITY_PROVIDER_DESC_PRESENT"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider availability: malformed json string remains fail-closed and safe", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  try {
    const result = await readOpenproviderDomainAvailability("bad-json.com", {
      login: async () => ({ status: 200, json: { token: "token_xyz" } }),
      checkAvailability: async () => ({
        status: 500,
        json: "{bad json",
      }),
    });

    assert.equal(result.status, "failed_closed");
    assert.equal(result.available, "unknown");
    assert.equal(result.readOnly, true);
    assert.equal(result.executionAllowed, false);
    assert.equal(result.executionBlocked, true);
    assert.deepEqual(result.providerSummary, {
      topLevelKeys: [],
      responseCode: undefined,
      responseDesc: undefined,
    });
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AVAILABILITY_PROVIDER_DESC_PRESENT"), false);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});
