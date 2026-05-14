import assert from "node:assert/strict";
import test from "node:test";

import { mapRuntimeSiteDomainReadinessBindingRows } from "@/gnr8/runtime/runtime-store";

test("runtime-store domain readiness binding mapper: active binding present", () => {
  const binding = mapRuntimeSiteDomainReadinessBindingRows({
    siteId: "site_1",
    sourceHost: "source.example.com",
    hostBindingRows: [{ host: "maver.preview.gnr8.test", status: "ACTIVE" }],
    domainBindingRows: [
      { domain: "maver.example.com", status: "active" },
      { domain: "staging.maver.example.com", status: "pending" },
    ],
  });

  assert.equal(binding.siteId, "site_1");
  assert.equal(binding.activeDomainBindingHost, "maver.example.com");
  assert.equal(binding.internalPreviewHost, "maver.preview.gnr8.test");
});

test("runtime-store domain readiness binding mapper: multiple custom domains deterministic sort", () => {
  const binding = mapRuntimeSiteDomainReadinessBindingRows({
    siteId: "site_sort",
    sourceHost: null,
    hostBindingRows: [],
    domainBindingRows: [
      { domain: "B.example.com", status: "pending" },
      { domain: "a.example.com", status: "active" },
      { domain: "c.example.com", status: "failed" },
      { domain: "A.example.com", status: "active" },
    ],
  });

  assert.deepEqual(binding.customDomains, ["a.example.com", "b.example.com", "c.example.com"]);
  assert.deepEqual(
    binding.domainBindingCandidates.filter((candidate) => candidate.source === "runtime_domain_binding").map((candidate) => candidate.host),
    ["a.example.com", "a.example.com", "b.example.com", "c.example.com"],
  );
});

test("runtime-store domain readiness binding mapper: internal preview host derivation", () => {
  const binding = mapRuntimeSiteDomainReadinessBindingRows({
    siteId: "site_internal",
    sourceHost: "source.example.com",
    hostBindingRows: [
      { host: "inactive.preview.gnr8.test", status: "INACTIVE" },
      { host: "active.preview.gnr8.test", status: "ACTIVE" },
    ],
    domainBindingRows: [],
  });

  assert.equal(binding.internalPreviewHost, "active.preview.gnr8.test");
});

test("runtime-store domain readiness binding mapper: missing rows clean result", () => {
  const binding = mapRuntimeSiteDomainReadinessBindingRows({
    siteId: "site_empty",
    sourceHost: null,
    hostBindingRows: [],
    domainBindingRows: [],
  });

  assert.equal(binding.primaryHost, null);
  assert.equal(binding.internalPreviewHost, null);
  assert.equal(binding.activeDomainBindingHost, null);
  assert.equal(binding.canonicalSlug, undefined);
  assert.deepEqual(binding.customDomains, []);
  assert.deepEqual(binding.domainBindingCandidates, []);
});
