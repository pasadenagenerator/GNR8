import assert from "node:assert/strict";
import test from "node:test";

import { recheckHostingDomain } from "@/gnr8/runtime/hosting-operations/hosting-domain-recheck-workflow";
import type { RuntimeDomainHostBinding } from "@/gnr8/runtime/runtime-store";

function binding(input?: Partial<RuntimeDomainHostBinding>): RuntimeDomainHostBinding {
  return {
    id: "domain_1",
    siteId: "site_1",
    siteVersionId: "version_1",
    domain: "www.example.com",
    status: "pending",
    domainType: "subdomain",
    verificationType: null,
    verificationValue: null,
    verificationHost: null,
    dnsRecordType: null,
    dnsRecordHost: null,
    dnsRecordValue: null,
    dnsRecordPurpose: null,
    dnsInstructions: null,
    lastCheckedAt: null,
    vercelDomainId: null,
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T09:00:00.000Z",
    ...input,
  };
}

test("hosting domain recheck workflow: recheck refreshes status and dns snapshot", async () => {
  let updateInput: unknown = null;
  const result = await recheckHostingDomain({
    siteId: "site_1",
    domainId: "domain_1",
    deps: {
      listDomainHostBindingsForSite: async () => [binding()],
      checkDomainStatus: async () => ({
        domain: "www.example.com",
        domainId: "dom_1",
        verified: false,
        status: "verifying",
        verification: {
          type: "txt",
          host: "_vercel",
          value: "vc-domain-verify=token",
        },
        routing: {
          type: "cname",
          host: "www",
          value: "cname.vercel-dns.com",
        },
        lastCheckedAt: "2026-06-01T10:00:00.000Z",
      }),
      updateDomainHostBindingById: async (input) => {
        updateInput = input;
        return binding({
          status: input.status,
          domainType: input.domainType ?? null,
          verificationType: input.verificationType ?? null,
          verificationHost: input.verificationHost ?? null,
          verificationValue: input.verificationValue ?? null,
          dnsInstructions: input.dnsInstructions ?? null,
          lastCheckedAt: input.lastCheckedAt ?? null,
        });
      },
      now: () => new Date("2026-06-01T09:59:00.000Z"),
    },
  });

  assert.equal(result?.previousStatus, "pending");
  assert.equal(result?.newStatus, "verifying");
  assert.equal(result?.timestamp, "2026-06-01T10:00:00.000Z");
  assert.equal((updateInput as { status: string }).status, "verifying");
  assert.equal((updateInput as { dnsInstructions: unknown[] }).dnsInstructions.length, 2);
  assert.equal(result?.diagnostics.includes("DNS_INSTRUCTIONS_COMPUTED"), true);
});

test("hosting domain recheck workflow: idempotent active result stays active", async () => {
  let updateCount = 0;
  const result = await recheckHostingDomain({
    siteId: "site_1",
    domainId: "domain_1",
    deps: {
      listDomainHostBindingsForSite: async () => [binding({ status: "active" })],
      checkDomainStatus: async () => ({
        domain: "www.example.com",
        domainId: "dom_1",
        verified: true,
        status: "active",
        verification: null,
        routing: {
          type: "cname",
          host: "www",
          value: "cname.vercel-dns.com",
        },
        lastCheckedAt: "2026-06-01T10:00:00.000Z",
      }),
      updateDomainHostBindingById: async (input) => {
        updateCount += 1;
        return binding({ status: input.status, lastCheckedAt: input.lastCheckedAt ?? null });
      },
      now: () => new Date("2026-06-01T09:59:00.000Z"),
    },
  });

  assert.equal(updateCount, 1);
  assert.equal(result?.previousStatus, "active");
  assert.equal(result?.newStatus, "active");
});

test("hosting domain recheck workflow: fail closed when binding is absent", async () => {
  let statusCalls = 0;
  let updateCalls = 0;
  const result = await recheckHostingDomain({
    siteId: "site_1",
    domainId: "missing",
    deps: {
      listDomainHostBindingsForSite: async () => [binding()],
      checkDomainStatus: async () => {
        statusCalls += 1;
        throw new Error("should not call status");
      },
      updateDomainHostBindingById: async () => {
        updateCalls += 1;
        return null;
      },
      now: () => new Date("2026-06-01T09:59:00.000Z"),
    },
  });

  assert.equal(result, null);
  assert.equal(statusCalls, 0);
  assert.equal(updateCalls, 0);
});
