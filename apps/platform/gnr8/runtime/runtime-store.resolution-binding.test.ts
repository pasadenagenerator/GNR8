import assert from "node:assert/strict";
import test from "node:test";

import { __runtimeStoreTestUtils, mapRuntimeSiteResolutionBindingRows } from "@/gnr8/runtime/runtime-store";

function buildBindingRows() {
  return [
    {
      id: "sv_2",
      version_no: 2,
      state: "PUBLISHED" as const,
      created_at: "2026-05-12T10:00:00.000Z",
      artifact_id: "artifact_2",
    },
    {
      id: "sv_3",
      version_no: 3,
      state: "READY" as const,
      created_at: "2026-05-12T11:00:00.000Z",
      artifact_id: "artifact_3",
    },
    {
      id: "sv_1",
      version_no: 1,
      state: "ARCHIVED" as const,
      created_at: "2026-05-12T09:00:00.000Z",
      artifact_id: "artifact_1",
    },
  ];
}

test("runtime-store resolution binding mapper: active pointer present", () => {
  const binding = mapRuntimeSiteResolutionBindingRows({
    siteId: "site_1",
    sourceHost: "source.example.com",
    domain: "maver.app.pasadenagenerator.com",
    activeSiteVersionId: "sv_3",
    versionRows: buildBindingRows(),
  });
  assert.equal(binding.activeSiteVersionId, "sv_3");
});

test("runtime-store page version preflight rejects duplicate normalized routes before db insert", () => {
  const page = {
    pageId: "page_about",
    path: "/about",
    title: "About",
    structureModel: { sections: [] },
    contentModel: { sectionProps: {} },
    styleTokens: {},
    assetGraph: [],
    semanticSignals: [],
    source: "migration" as const,
    actor: "test",
  };

  assert.throws(
    () =>
      __runtimeStoreTestUtils.assertNoDuplicateRuntimePageVersions([
        page,
        { ...page, pageId: "page_about_alias", path: "/about/index.html" },
      ]),
    /MULTIPAGE_PAGE_VERSION_DUPLICATE:routePath=\/about/,
  );
});

test("runtime-store resolution binding mapper: published candidate present", () => {
  const binding = mapRuntimeSiteResolutionBindingRows({
    siteId: "site_1",
    sourceHost: null,
    domain: "maver.app.pasadenagenerator.com",
    activeSiteVersionId: null,
    versionRows: buildBindingRows(),
  });
  assert.equal(binding.publishedSiteVersionId, "sv_2");
});

test("runtime-store resolution binding mapper: preview candidate present", () => {
  const binding = mapRuntimeSiteResolutionBindingRows({
    siteId: "site_1",
    sourceHost: null,
    domain: "maver.app.pasadenagenerator.com",
    activeSiteVersionId: null,
    versionRows: buildBindingRows(),
  });
  assert.equal(binding.previewSiteVersionId, "sv_3");
});

test("runtime-store resolution binding mapper: latest imported fallback", () => {
  const binding = mapRuntimeSiteResolutionBindingRows({
    siteId: "site_1",
    sourceHost: null,
    domain: "maver.app.pasadenagenerator.com",
    activeSiteVersionId: null,
    versionRows: buildBindingRows(),
  });
  assert.equal(binding.latestImportedSiteVersionId, "sv_3");
});

test("runtime-store resolution binding mapper: deterministic sorting by versionNo, createdAt, siteVersionId", () => {
  const binding = mapRuntimeSiteResolutionBindingRows({
    siteId: "site_sort",
    sourceHost: null,
    domain: null,
    activeSiteVersionId: null,
    versionRows: [
      {
        id: "sv_b",
        version_no: 1,
        state: "READY",
        created_at: "2026-01-01T00:00:01.000Z",
        artifact_id: null,
      },
      {
        id: "sv_c",
        version_no: 1,
        state: "READY",
        created_at: "2026-01-01T00:00:01.000Z",
        artifact_id: null,
      },
      {
        id: "sv_a",
        version_no: 1,
        state: "READY",
        created_at: "2026-01-01T00:00:00.000Z",
        artifact_id: null,
      },
      {
        id: "sv_z",
        version_no: 2,
        state: "READY",
        created_at: "2026-01-01T00:00:00.000Z",
        artifact_id: null,
      },
    ],
  });

  assert.deepEqual(
    binding.candidateSiteVersions.map((candidate) => candidate.siteVersionId),
    ["sv_a", "sv_b", "sv_c", "sv_z"],
  );
});

test("runtime-store resolution binding mapper: canonicalSlug inference from host", () => {
  const fromDomain = mapRuntimeSiteResolutionBindingRows({
    siteId: "site_slug_domain",
    sourceHost: "fallback-source.gnr8.test",
    domain: "MAVER.app.pasadenagenerator.com",
    activeSiteVersionId: null,
    versionRows: [],
  });
  assert.equal(fromDomain.canonicalSlug, "maver");

  const fromSourceHost = mapRuntimeSiteResolutionBindingRows({
    siteId: "site_slug_source",
    sourceHost: "roboplast.gnr8.test",
    domain: null,
    activeSiteVersionId: null,
    versionRows: [],
  });
  assert.equal(fromSourceHost.canonicalSlug, "roboplast");
});

test("runtime-store resolution binding mapper: missing/empty rows handled cleanly", () => {
  const binding = mapRuntimeSiteResolutionBindingRows({
    siteId: "site_empty",
    sourceHost: "",
    domain: null,
    activeSiteVersionId: null,
    versionRows: [],
  });

  assert.equal(binding.latestImportedSiteVersionId, null);
  assert.equal(binding.publishedSiteVersionId, undefined);
  assert.equal(binding.previewSiteVersionId, undefined);
  assert.equal(binding.canonicalSlug, undefined);
  assert.deepEqual(binding.candidateSiteVersions, []);
});
