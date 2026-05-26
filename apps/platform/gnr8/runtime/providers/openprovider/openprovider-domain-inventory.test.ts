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
  const previousMethod = process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";
  process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT = "http://api.sandbox.openprovider.nl:8480/v1beta/domains/search";
  delete process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD;

  const callOrder: string[] = [];
  let inventoryAuthHeader = "";
  let inventoryMethod = "";
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
      fetchInventoryPage: async ({ token, method }) => {
        callOrder.push("inventory");
        inventoryAuthHeader = `Bearer ${token}`;
        inventoryMethod = method;
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
    assert.equal(inventoryMethod, "POST");
    assert.equal(result.provider, "openprovider");
    assert.equal(result.readOnly, true);
    assert.equal(result.executionAllowed, false);
    assert.equal(result.executionBlocked, true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_READ_SUCCEEDED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AUTH_STARTED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_AUTH_SUCCEEDED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_REQUEST_SHAPED"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_METHOD_POST"), true);
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
    if (previousMethod === undefined) delete process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD;
    else process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD = previousMethod;
  }
});

test("openprovider domain inventory: GET override uses bearer token and no body shape", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  const previousMethod = process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";
  process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD = "GET";

  let seenMethod = "";
  let seenToken = "";
  try {
    const result = await readOpenproviderDomainInventory({
      login: async () => ({ status: 200, json: { data: { token: "token_get" } } }),
      fetchInventoryPage: async ({ method, token }) => {
        seenMethod = method;
        seenToken = token;
        return { status: 200, json: { data: { results: [] } } };
      },
    });

    assert.equal(seenMethod, "GET");
    assert.equal(seenToken, "token_get");
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_METHOD_GET"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_REQUEST_SHAPED"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
    if (previousMethod === undefined) delete process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD;
    else process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD = previousMethod;
  }
});

test("openprovider domain inventory: default POST request sends bearer token and JSON body", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  const previousEndpoint = process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT;
  const previousMethod = process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD;
  const previousFetch = globalThis.fetch;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";
  process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT = "https://api.openprovider.eu/v1beta/domains/search";
  delete process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD;

  let calledMethod = "";
  let calledAuth = "";
  let calledContentType = "";
  let calledBody = "";
  try {
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) =>
      ({
        status: 200,
        json: async () => ({ data: { results: [] } }),
      }) as Response) as typeof fetch;

    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calledMethod = String(init?.method ?? "");
      calledAuth = String((init?.headers as Record<string, string> | undefined)?.authorization ?? "");
      calledContentType = String((init?.headers as Record<string, string> | undefined)?.["content-type"] ?? "");
      calledBody = String(init?.body ?? "");
      return {
        status: 200,
        json: async () => ({ data: { results: [] } }),
      } as Response;
    }) as typeof fetch;

    const result = await readOpenproviderDomainInventory({
      login: async () => ({ status: 200, json: { token: "token_post" } }),
    });
    assert.equal(calledMethod, "POST");
    assert.equal(calledAuth, "Bearer token_post");
    assert.equal(calledContentType, "application/json");
    assert.equal(calledBody, JSON.stringify({ limit: 1000, offset: 0 }));
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_METHOD_POST"), true);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
    if (previousEndpoint === undefined) delete process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT;
    else process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT = previousEndpoint;
    if (previousMethod === undefined) delete process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD;
    else process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD = previousMethod;
  }
});

test("openprovider domain inventory: GET override sends bearer token and no body", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  const previousEndpoint = process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT;
  const previousMethod = process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD;
  const previousFetch = globalThis.fetch;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";
  process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT = "https://api.openprovider.eu/v1beta/domains/search";
  process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD = "GET";

  let calledMethod = "";
  let calledAuth = "";
  let bodyWasUndefined = false;
  try {
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calledMethod = String(init?.method ?? "");
      calledAuth = String((init?.headers as Record<string, string> | undefined)?.authorization ?? "");
      bodyWasUndefined = init?.body === undefined;
      return {
        status: 200,
        json: async () => ({ data: { results: [] } }),
      } as Response;
    }) as typeof fetch;

    const result = await readOpenproviderDomainInventory({
      login: async () => ({ status: 200, json: { token: "token_get_default" } }),
    });
    assert.equal(calledMethod, "GET");
    assert.equal(calledAuth, "Bearer token_get_default");
    assert.equal(bodyWasUndefined, true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_METHOD_GET"), true);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
    if (previousEndpoint === undefined) delete process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT;
    else process.env.OPENPROVIDER_DOMAIN_INVENTORY_ENDPOINT = previousEndpoint;
    if (previousMethod === undefined) delete process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD;
    else process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD = previousMethod;
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

test("openprovider domain inventory: unsupported response shape fails closed", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";
  try {
    const result = await readOpenproviderDomainInventory({
      login: async () => ({ status: 200, json: { token: "t" } }),
      fetchInventoryPage: async () => ({ status: 200, json: { data: { unexpected: true } } }),
    });
    assert.equal(result.domains.length, 0);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_RESPONSE_UNSUPPORTED_SHAPE"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
  }
});

test("openprovider domain inventory: 501 includes inventory-specific status and method", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  const previousMethod = process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";
  process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD = "POST";
  try {
    const result = await readOpenproviderDomainInventory({
      login: async () => ({ status: 200, json: { token: "t" } }),
      fetchInventoryPage: async () => ({ status: 501, json: {} }),
    });
    assert.equal(result.domains.length, 0);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_HTTP_STATUS_501"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_METHOD_POST"), true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED"), true);
  } finally {
    if (previousUsername === undefined) delete process.env.OPENPROVIDER_SANDBOX_USERNAME;
    else process.env.OPENPROVIDER_SANDBOX_USERNAME = previousUsername;
    if (previousPassword === undefined) delete process.env.OPENPROVIDER_SANDBOX_PASSWORD;
    else process.env.OPENPROVIDER_SANDBOX_PASSWORD = previousPassword;
    if (previousMethod === undefined) delete process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD;
    else process.env.OPENPROVIDER_DOMAIN_INVENTORY_METHOD = previousMethod;
  }
});
