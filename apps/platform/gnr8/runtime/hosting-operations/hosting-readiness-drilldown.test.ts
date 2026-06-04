import assert from "node:assert/strict";
import test from "node:test";

import { createHostingReadinessDrilldown } from "@/gnr8/runtime/hosting-operations/hosting-readiness-drilldown";
import { createRuntimeDomainReadinessReport } from "@/gnr8/runtime/readiness/runtime-domain-readiness";
import { createRuntimeSiteReadinessReport } from "@/gnr8/runtime/readiness/runtime-site-readiness";
import type { RuntimeSiteResolutionBinding } from "@/gnr8/runtime/runtime-store";

function binding(input?: Partial<RuntimeSiteResolutionBinding>): RuntimeSiteResolutionBinding {
  return {
    siteId: "site_1",
    canonicalSlug: "maver",
    activeSiteVersionId: null,
    latestImportedSiteVersionId: null,
    publishedSiteVersionId: undefined,
    previewSiteVersionId: undefined,
    candidateSiteVersions: [],
    ...input,
  };
}

test("hosting readiness drilldown: blockers surfaced with stable remediation", () => {
  const siteReadiness = createRuntimeSiteReadinessReport(binding());
  const drilldown = createHostingReadinessDrilldown({
    siteReadiness,
    domainReadiness: null,
  });

  assert.deepEqual(
    drilldown.site.blockers.map((finding) => finding.code),
    ["no_site_version_candidates", "missing_latest_imported_site_version"],
  );
  assert.equal(drilldown.site.blockers[0]?.suggestedRemediation, "Import or create a runtime site version.");
  assert.equal(drilldown.site.blockers[1]?.affectedObject, "latest_imported_site_version");
});

test("hosting readiness drilldown: warnings surfaced with deterministic domain remediation", () => {
  const siteBinding = binding({
    activeSiteVersionId: "version_1",
    latestImportedSiteVersionId: "version_1",
    publishedSiteVersionId: "version_1",
    previewSiteVersionId: "version_1",
    candidateSiteVersions: [
      {
        siteVersionId: "version_1",
        versionNo: 1,
        state: "PUBLISHED",
        artifactId: "artifact_1",
        createdAt: "2026-06-01T10:00:00.000Z",
      },
    ],
  });
  const domainReadiness = createRuntimeDomainReadinessReport({
    siteBinding,
    primaryHost: null,
    internalPreviewHost: null,
    domainBindings: [],
  });
  const drilldown = createHostingReadinessDrilldown({
    siteReadiness: null,
    domainReadiness,
  });

  assert.deepEqual(
    drilldown.domains.warnings.map((finding) => finding.code),
    ["missing_custom_domain", "missing_active_domain_binding", "missing_internal_host"],
  );
  assert.equal(
    drilldown.domains.warnings[0]?.suggestedRemediation,
    "The site is reachable through its internal working domain, but no external customer domain is attached.",
  );
  assert.equal(drilldown.domains.warnings[1]?.suggestedRemediation, "Verify domain binding activation.");
});
