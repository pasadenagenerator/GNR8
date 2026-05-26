import assert from "node:assert/strict";
import test from "node:test";

import { readOpenproviderDomainInventory } from "@/gnr8/runtime/providers/openprovider/openprovider-domain-inventory";

test("openprovider domain inventory: missing credentials fail closed", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
  delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;

  try {
    const result = await readOpenproviderDomainInventory();
    assert.equal(result.readOnly, true);
    assert.equal(result.executionAllowed, false);
    assert.equal(result.executionBlocked, true);
    assert.equal(result.domains.length, 0);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider domain inventory: successful inventory normalizes domains", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  const previousEndpoint = process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";
  process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT = "http://api.sandbox.openprovider.nl:8480/v1beta/domains/search";

  const callOrder: string[] = [];
  let inventoryAuthHeader = "";
  try {
    const result = await readOpenproviderDomainInventory({
      login: async ({ endpoint, username, password }) => {
        callOrder.push("auth");
        assert.equal(endpoint, "http://api.sandbox.openprovider.nl:8480/v1beta/auth/login");
        assert.equal(username, "user");
        assert.equal(password, "pass");
        return {
          status: 200,
          json: { data: { token: "token_abc" } },
        };
      },
      fetchInventoryPage: async ({ token }) => {
        callOrder.push("inventory");
        inventoryAuthHeader = `Bearer ${token}`;
        return {
          status: 200,
          json: {
            data: {
              results: [
                {
                  name: "Example.COM",
                  status: "active",
                  expirationDate: "2030-01-02",
                  nsGroup: { nameServers: ["ns2.example.net", "ns1.example.net"] },
                  id: "op_1",
                },
              ],
            },
          },
        };
      },
      now: () => "2026-05-26T00:00:00.000Z",
    });

    assert.deepEqual(callOrder, ["auth", "inventory"]);
    assert.equal(inventoryAuthHeader, "Bearer token_abc");
    assert.equal(result.provider, "openprovider");
    assert.equal(result.readOnly, true);
    assert.equal(result.executionAllowed, false);
    assert.equal(result.executionBlocked, true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_READ_SUCCEEDED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AUTH_STARTED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AUTH_SUCCEEDED"), true);
    assert.equal(result.domains.length, 1);
    assert.deepEqual(result.domains[0], {
      domain: "example.com",
      provider: "openprovider",
      status: "active",
      expiryDate: "2030-01-02T00:00:00.000Z",
      nameservers: ["ns1.example.net", "ns2.example.net"],
      rawRef: "op_1",
    });
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
    if (previousEndpoint === undefined) delete process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT;
    else process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT = previousEndpoint;
  }
});

test("openprovider domain inventory: no secret leakage in diagnostics", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  try {
    const result = await readOpenproviderDomainInventory({
      login: async () => {
        throw new Error("password bad token leaked");
      },
    });

    const joined = result.diagnostics.join(" ").toLowerCase();
    assert.equal(joined.includes("password"), false);
    assert.equal(joined.includes("token"), false);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider domain inventory: auth 401 fails closed", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";
  try {
    const result = await readOpenproviderDomainInventory({
      login: async () => ({ status: 401, json: { error: "unauthorized" } }),
      fetchInventoryPage: async () => {
        throw new Error("inventory should not be called");
      },
    });
    assert.equal(result.domains.length, 0);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AUTH_FAILED_CLOSED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AUTH_HTTP_STATUS_401"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider domain inventory: token missing fails closed", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";
  try {
    const result = await readOpenproviderDomainInventory({
      login: async () => ({ status: 200, json: { data: {} } }),
      fetchInventoryPage: async () => {
        throw new Error("inventory should not be called");
      },
    });
    assert.equal(result.domains.length, 0);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AUTH_FAILED_CLOSED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AUTH_TOKEN_MISSING"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider domain inventory: no write endpoints called", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";
  const calledEndpoints: string[] = [];
  try {
    await readOpenproviderDomainInventory({
      login: async ({ endpoint }) => {
        calledEndpoints.push(endpoint);
        return { status: 200, json: { token: "t" } };
      },
      fetchInventoryPage: async ({ endpoint }) => {
        calledEndpoints.push(endpoint);
        return { status: 200, json: { data: { results: [] } } };
      },
    });
    const joined = calledEndpoints.join(" ").toLowerCase();
    assert.equal(joined.includes("/v1beta/auth/login"), true);
    assert.equal(joined.includes("/v1beta/domains/search"), true);
    assert.equal(joined.includes("create"), false);
    assert.equal(joined.includes("update"), false);
    assert.equal(joined.includes("delete"), false);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});
