import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeDomainReadinessReport } from "@/gnr8/runtime/readiness/runtime-domain-readiness";
import type { RuntimeSiteResolutionBinding } from "@/gnr8/runtime/runtime-store";

function buildBinding(input?: Partial<RuntimeSiteResolutionBinding>): RuntimeSiteResolutionBinding {
  return {
    siteId: "site_1",
    canonicalSlug: "maver",
    activeSiteVersionId: "sv_active_1",
    latestImportedSiteVersionId: "sv_latest_1",
    publishedSiteVersionId: "sv_published_1",
    previewSiteVersionId: "sv_preview_1",
    candidateSiteVersions: [],
    ...input,
  };
}

test("runtime domain readiness: ready with internal host + active binding", () => {
  const report = createRuntimeDomainReadinessReport({
    siteBinding: buildBinding(),
    internalPreviewHost: "maver.preview.gnr8.test",
    domainBindings: [{ domain: "maver.example.com", status: "active" }],
  });

  assert.equal(report.domainReadinessStatus, "ready");
  assert.equal(report.hasInternalHost, true);
  assert.equal(report.hasCustomDomain, true);
  assert.equal(report.hasActiveDomainBinding, true);
  assert.deepEqual(report.blockers, []);
  assert.deepEqual(report.warnings, []);
});

test("runtime domain readiness: ready_with_warnings without custom domain", () => {
  const report = createRuntimeDomainReadinessReport({
    siteBinding: buildBinding(),
    internalPreviewHost: "maver.preview.gnr8.test",
    domainBindings: [],
  });

  assert.equal(report.domainReadinessStatus, "ready_with_warnings");
  assert.deepEqual(report.warnings, ["missing_custom_domain", "missing_active_domain_binding"]);
  assert.deepEqual(report.blockers, []);
});

test("runtime domain readiness: ready_with_warnings without active binding", () => {
  const report = createRuntimeDomainReadinessReport({
    siteBinding: buildBinding(),
    internalPreviewHost: "maver.preview.gnr8.test",
    domainBindings: [{ domain: "maver.example.com", status: "pending" }],
  });

  assert.equal(report.domainReadinessStatus, "ready_with_warnings");
  assert.equal(report.hasCustomDomain, true);
  assert.equal(report.hasActiveDomainBinding, false);
  assert.deepEqual(report.warnings, ["missing_active_domain_binding"]);
});

test("runtime domain readiness: blocked missing identity/domain signals", () => {
  const report = createRuntimeDomainReadinessReport({
    siteBinding: buildBinding({ siteId: "", canonicalSlug: undefined }),
    internalPreviewHost: null,
    primaryHost: null,
    domainBindings: [],
  });

  assert.equal(report.domainReadinessStatus, "blocked");
  assert.deepEqual(report.blockers, ["missing_site_id", "missing_domain_identity_signals"]);
});

test("runtime domain readiness: stable correlation key", () => {
  const a = createRuntimeDomainReadinessReport({
    siteBinding: buildBinding(),
    internalPreviewHost: "maver.preview.gnr8.test",
    domainBindings: [
      { domain: "B.example.com", status: "pending" },
      { domain: "a.example.com", status: "active" },
    ],
  });

  const b = createRuntimeDomainReadinessReport({
    siteBinding: buildBinding(),
    internalPreviewHost: "maver.preview.gnr8.test",
    domainBindings: [
      { domain: "a.example.com", status: "active" },
      { domain: "b.example.com", status: "pending" },
    ],
  });

  assert.equal(a.correlationKey, b.correlationKey);
  assert.equal(a.correlationKey.length, 64);
  assert.deepEqual(a.customDomains, ["a.example.com", "b.example.com"]);
});
