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
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  let methodUsed = "";
  try {
    const result = await readOpenproviderDomainInventory({
      fetchInventoryPage: async () => {
        methodUsed = "POST";
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

    assert.equal(methodUsed, "POST");
    assert.equal(result.provider, "openprovider");
    assert.equal(result.readOnly, true);
    assert.equal(result.executionAllowed, false);
    assert.equal(result.executionBlocked, true);
    assert.equal(result.diagnostics.includes("OPENPROVIDER_DOMAIN_INVENTORY_READ_SUCCEEDED"), true);
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
  }
});

test("openprovider domain inventory: no secret leakage in diagnostics", async () => {
  const previousUsername = process.env.OPENPROVIDER_SANDBOX_USERNAME;
  const previousPassword = process.env.OPENPROVIDER_SANDBOX_PASSWORD;
  process.env.OPENPROVIDER_SANDBOX_USERNAME = "user";
  process.env.OPENPROVIDER_SANDBOX_PASSWORD = "pass";

  try {
    const result = await readOpenproviderDomainInventory({
      fetchInventoryPage: async () => {
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

