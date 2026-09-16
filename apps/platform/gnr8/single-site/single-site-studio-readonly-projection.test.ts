import assert from "node:assert/strict";
import test from "node:test";

import { buildSingleSiteStudioReadonlyProjection } from "./single-site-studio-readonly-projection";
import { AIRSHIP_ARIS_CANDIDATE_SITE_VERSION_ID, AIRSHIP_ARIS_MIGRATION_ID } from "./airship-aris-mvp-draft";
import type { SingleSitePublishOperatorReadonlyProjection } from "./single-site-publish-operator-readonly-projection";

const CHS_MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const ORIGINAL_CLONE_VERSION_ID = "6b172a5b-200e-471c-9599-5dc70f04ea53";
const IMPROVED_CANDIDATE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const INTERNAL_PREVIEW_ROUTE_PREFIX = "/api/gnr8/admin/single-site-studio/versions";

function invisibleChsPublishModel(): SingleSitePublishOperatorReadonlyProjection {
  return {
    lookup: { migrationId: AIRSHIP_ARIS_MIGRATION_ID, siteId: null, candidateSiteVersionRef: null, limit: 8 },
    internalMvpAcceptance: {
      visible: false,
      siteHost: "chs.si",
      publicUrl: "https://www.chs.si/",
      status: "Internal MVP evidence incomplete",
      activePointer: "unknown",
      candidateStatus: "unknown",
    },
    publishContext: {
      candidateSiteVersionRef: null,
      runtimeArtifactRef: null,
    },
    publishActivationDecision: {
      granted: false,
      grantedWithLimitations: false,
    },
  } as SingleSitePublishOperatorReadonlyProjection;
}

test("single-site studio projection uses internal preview routes for CHS clone and improved candidate", () => {
  const model = buildSingleSiteStudioReadonlyProjection({
    migrationId: CHS_MIGRATION_ID,
    generatedAt: "2026-08-31T00:00:00.000Z",
  });

  assert.equal(
    model.previews.originalClone.route,
    `${INTERNAL_PREVIEW_ROUTE_PREFIX}/${ORIGINAL_CLONE_VERSION_ID}/preview?mode=transformed`,
  );
  assert.equal(
    model.previews.improvedCandidate.route,
    `${INTERNAL_PREVIEW_ROUTE_PREFIX}/${IMPROVED_CANDIDATE_VERSION_ID}/preview?mode=transformed`,
  );
  assert.equal(model.previews.originalClone.authNote.includes("not the live production domain"), true);
  assert.equal(model.previews.improvedCandidate.authNote.includes("not the live production domain"), true);
  assert.equal(model.summary.liveSiteUrl, "https://www.chs.si/");
  assert.equal(model.comparison.find((item) => item.label === "Live published version")?.href, "https://www.chs.si/");
});

test("single-site studio projection does not give unknown migrations CHS fallback identity", () => {
  const model = buildSingleSiteStudioReadonlyProjection({
    migrationId: "11111111-2222-4333-8444-555555555555",
    generatedAt: "2026-08-31T00:00:00.000Z",
  });
  const serialized = JSON.stringify(model);

  assert.equal(model.summary.site, "Imported single-site");
  assert.equal(model.summary.sourceUrl, "Source URL unavailable");
  assert.equal(model.summary.liveSiteUrl, "Source URL unavailable");
  assert.equal(model.summary.activePointer, "unknown");
  assert.equal(model.summary.publishedCandidate, "unknown");
  assert.equal(serialized.includes("chs.si"), false);
  assert.equal(serialized.includes("CHS"), false);
});

test("single-site studio projection uses ARIS identity and ignores invisible CHS acceptance readback", () => {
  const model = buildSingleSiteStudioReadonlyProjection({
    migrationId: AIRSHIP_ARIS_MIGRATION_ID,
    publishModel: invisibleChsPublishModel(),
    generatedAt: "2026-09-16T00:00:00.000Z",
  });
  const serialized = JSON.stringify(model);

  assert.equal(model.summary.site, "aris.si");
  assert.equal(model.summary.sourceUrl, "https://www.aris.si/");
  assert.equal(model.summary.liveSiteUrl, "https://www.aris.si/");
  assert.equal(model.summary.activePointer, "unknown");
  assert.equal(model.sourceTruth?.runtimeSiteId, "site_6b859cc1599a5b6642dc");
  assert.equal(
    model.previews.improvedCandidate.route,
    `${INTERNAL_PREVIEW_ROUTE_PREFIX}/${AIRSHIP_ARIS_CANDIDATE_SITE_VERSION_ID}/preview?mode=transformed`,
  );
  assert.equal(serialized.includes("chs.si"), false);
  assert.equal(serialized.includes("https://www.chs.si/"), false);
});
