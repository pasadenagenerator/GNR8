import assert from "node:assert/strict";
import test from "node:test";

import { createHostingDomainOperationsReadModel } from "@/gnr8/runtime/hosting-operations/hosting-domain-operations-read-model";
import type { RuntimeDomainHostBinding, RuntimeHostBinding } from "@/gnr8/runtime/runtime-store";

function domain(input?: Partial<RuntimeDomainHostBinding>): RuntimeDomainHostBinding {
  return {
    id: "domain_1",
    siteId: "site_1",
    siteVersionId: "version_1",
    domain: "www.example.com",
    status: "verifying",
    domainType: "subdomain",
    verificationType: "txt",
    verificationValue: "vc-domain-verify=token",
    verificationHost: "_vercel",
    dnsRecordType: "txt",
    dnsRecordHost: "_vercel",
    dnsRecordValue: "vc-domain-verify=token",
    dnsRecordPurpose: "verification",
    dnsInstructions: [
      {
        type: "txt",
        host: "_vercel",
        value: "vc-domain-verify=token",
        purpose: "verification",
        source: "vercel",
      },
      {
        type: "cname",
        host: "www",
        value: "cname.vercel-dns.com",
        purpose: "routing",
        source: "inferred",
      },
    ],
    lastCheckedAt: "2026-06-01T10:05:00.000Z",
    vercelDomainId: "dom_1",
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T10:05:00.000Z",
    ...input,
  };
}

function workingDomain(input?: Partial<RuntimeHostBinding>): RuntimeHostBinding {
  return {
    id: "host_1",
    siteId: "site_1",
    host: "maver.app.pasadenagenerator.com",
    status: "ACTIVE",
    bindingKind: "shadow",
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-06-01T10:05:00.000Z",
    ...input,
  };
}

test("hosting domain operations read model: working domains load separately from custom domains", () => {
  const model = createHostingDomainOperationsReadModel({
    workingDomains: [workingDomain()],
    domains: [],
  });

  assert.equal(model.workingDomains[0]?.hostname, "maver.app.pasadenagenerator.com");
  assert.equal(model.workingDomains[0]?.bindingKind, "shadow");
  assert.equal(model.workingDomains[0]?.status, "ACTIVE");
  assert.equal(model.workingDomains[0]?.active, true);
  assert.equal(model.workingDomains[0]?.source, "runtime_host_binding");
  assert.equal(model.customDomains.length, 0);
  assert.equal(model.domains.length, 0);
});

test("hosting domain operations read model: domain metadata and verification status load", () => {
  const model = createHostingDomainOperationsReadModel({ domains: [domain()] });

  assert.equal(model.domains[0]?.hostname, "www.example.com");
  assert.equal(model.domains[0]?.source, "runtime_domain_host_binding");
  assert.equal(model.customDomains[0]?.hostname, "www.example.com");
  assert.equal(model.domains[0]?.status, "verifying");
  assert.equal(model.domains[0]?.verificationStatus, "verifying");
  assert.equal(model.domains[0]?.active, false);
  assert.equal(model.domains[0]?.lastCheckedAt, "2026-06-01T10:05:00.000Z");
  assert.equal(model.domains[0]?.verificationReason, "verification_record_required");
});

test("hosting domain operations read model: dns instructions load with expected status", () => {
  const model = createHostingDomainOperationsReadModel({ domains: [domain()] });

  assert.deepEqual(model.domains[0]?.dnsInstructions, [
    {
      recordType: "TXT",
      host: "_vercel",
      value: "vc-domain-verify=token",
      expectedStatus: "verification_required",
    },
    {
      recordType: "CNAME",
      host: "www",
      value: "cname.vercel-dns.com",
      expectedStatus: "routing_required",
    },
  ]);
});

test("hosting domain operations read model: failed wildcard exposes existing diagnostic code", () => {
  const model = createHostingDomainOperationsReadModel({
    domains: [
      domain({
        status: "failed",
        domain: "*.example.com",
        domainType: "wildcard_domain",
        dnsInstructions: null,
      }),
    ],
  });

  assert.equal(model.domains[0]?.lastError, "DNS_WILDCARD_UNSUPPORTED");
  assert.equal(model.domains[0]?.verificationReason, "wildcard_domain_unsupported");
  assert.equal(model.domains[0]?.diagnostics.verificationDiagnostics.includes("DNS_WILDCARD_UNSUPPORTED"), true);
});
