import assert from "node:assert/strict";
import test from "node:test";

import { readOpenproviderDnsRecordInventory } from "@/gnr8/runtime/providers/openprovider/openprovider-dns-record-inventory";

test("openprovider dns record inventory: read only preserved", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  try {
    const result = await readOpenproviderDnsRecordInventory({
      login: async () => ({ status: 200, json: { data: { token: "token_1" } } }),
      readOpenproviderDomainInventory: async () => ({
        provider: "openprovider",
        readOnly: true,
        executionAllowed: false,
        executionBlocked: true,
        fetchedAt: "2026-05-26T00:00:00.000Z",
        domains: [{ domain: "example.com", provider: "openprovider", status: "active", expiryDate: "unknown", nameservers: [] }],
        diagnostics: [],
      }),
      fetchDnsRecords: async () => ({
        status: 200,
        json: {
          data: {
            records: [{ name: "@", type: "a", value: "1.2.3.4", ttl: "3600" }],
          },
        },
      }),
    });

    assert.equal(result.readOnly, true);
    assert.equal(result.executionAllowed, false);
    assert.equal(result.executionBlocked, true);
    assert.equal(result.provider, "openprovider");
    assert.equal(result.domains.length, 1);
    assert.deepEqual(result.domains[0], {
      domain: "example.com",
      records: [{ name: "@", type: "A", value: "1.2.3.4", ttl: 3600 }],
    });
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DNS_READ_SUCCEEDED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider dns record inventory: auth reused before domain reads", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  const callOrder: string[] = [];

  try {
    await readOpenproviderDnsRecordInventory({
      login: async () => {
        callOrder.push("login");
        return { status: 200, json: { token: "token_2" } };
      },
      readOpenproviderDomainInventory: async () => {
        callOrder.push("domains");
        return {
          provider: "openprovider",
          readOnly: true,
          executionAllowed: false,
          executionBlocked: true,
          fetchedAt: "2026-05-26T00:00:00.000Z",
          domains: [],
          diagnostics: [],
        };
      },
      fetchDnsRecords: async () => {
        callOrder.push("records");
        return { status: 200, json: { records: [] } };
      },
    });

    assert.deepEqual(callOrder, ["login", "domains"]);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider dns record inventory: unsupported shape fails closed", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  try {
    const result = await readOpenproviderDnsRecordInventory({
      login: async () => ({ status: 200, json: { token: "token_3" } }),
      readOpenproviderDomainInventory: async () => ({
        provider: "openprovider",
        readOnly: true,
        executionAllowed: false,
        executionBlocked: true,
        fetchedAt: "2026-05-26T00:00:00.000Z",
        domains: [{ domain: "example.com", provider: "openprovider", status: "active", expiryDate: "unknown", nameservers: [] }],
        diagnostics: [],
      }),
      fetchDnsRecords: async () => ({ status: 200, json: { weird: { payload: true } } }),
    });

    assert.deepEqual(result.domains, []);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DNS_READ_FAILED_CLOSED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DNS_RESPONSE_UNSUPPORTED_SHAPE"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider dns record inventory: secret redaction", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  try {
    const result = await readOpenproviderDnsRecordInventory({
      login: async () => ({ status: 200, json: { token: "token_4" } }),
      readOpenproviderDomainInventory: async () => {
        throw new Error("token leaked");
      },
    });

    assert.equal(result.diagnostics.some((entry) => entry.includes("token leaked")), false);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DNS_READ_ERROR:credential_redacted"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});
