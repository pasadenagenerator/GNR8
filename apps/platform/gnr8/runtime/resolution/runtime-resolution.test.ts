import assert from "node:assert/strict";
import test from "node:test";

import {
  createRuntimeResolutionKey,
  resolveActiveRuntimeVersion,
  resolvePublishedRuntimeVersion,
  resolveRuntimeSiteVersion,
} from "@/gnr8/runtime/resolution/runtime-resolution";

const binding = {
  siteId: "site_1",
  canonicalSlug: "maver",
  activeSiteVersionId: "sv_active_2",
  latestImportedSiteVersionId: "sv_imported_3",
  publishedSiteVersionId: null,
  previewSiteVersionId: null,
} as const;

test("runtime resolution: active strategy prefers active version", () => {
  const resolved = resolveRuntimeSiteVersion({
    strategy: "active",
    binding,
    candidateSiteVersionIds: ["sv_imported_1", "sv_imported_2"],
  });
  assert.equal(resolved.siteVersionId, "sv_active_2");
  assert.equal(resolved.fallbackUsed, false);
  assert.equal(resolved.diagnostics.code, "PREVIEW_RUNTIME_RESOLUTION_APPLIED");
});

test("runtime resolution: published strategy falls back active then latest imported", () => {
  const withActiveFallback = resolvePublishedRuntimeVersion({
    binding: {
      ...binding,
      publishedSiteVersionId: null,
      activeSiteVersionId: "sv_active_7",
      latestImportedSiteVersionId: "sv_imported_8",
    },
  });
  assert.equal(withActiveFallback.siteVersionId, "sv_active_7");
  assert.equal(withActiveFallback.fallbackUsed, true);

  const withLatestFallback = resolvePublishedRuntimeVersion({
    binding: {
      ...binding,
      publishedSiteVersionId: null,
      activeSiteVersionId: null,
      latestImportedSiteVersionId: null,
    },
    candidateSiteVersionIds: ["sv_001", "sv_003", "sv_002"],
  });
  assert.equal(withLatestFallback.siteVersionId, "sv_003");
  assert.equal(withLatestFallback.fallbackUsed, true);
});

test("runtime resolution: preview strategy fallback chain is preview -> active -> latest imported", () => {
  const directPreview = resolveRuntimeSiteVersion({
    strategy: "preview",
    binding: {
      ...binding,
      previewSiteVersionId: "sv_preview_9",
    },
  });
  assert.equal(directPreview.siteVersionId, "sv_preview_9");
  assert.equal(directPreview.fallbackUsed, false);

  const fallbackActive = resolveRuntimeSiteVersion({
    strategy: "preview",
    binding: {
      ...binding,
      previewSiteVersionId: null,
      activeSiteVersionId: "sv_active_4",
    },
  });
  assert.equal(fallbackActive.siteVersionId, "sv_active_4");
  assert.equal(fallbackActive.fallbackUsed, true);

  const fallbackLatest = resolveRuntimeSiteVersion({
    strategy: "preview",
    binding: {
      ...binding,
      previewSiteVersionId: null,
      activeSiteVersionId: null,
      latestImportedSiteVersionId: null,
    },
    candidateSiteVersionIds: ["sv_20", "sv_03", "sv_11"],
  });
  assert.equal(fallbackLatest.siteVersionId, "sv_20");
  assert.equal(fallbackLatest.fallbackUsed, true);
});

test("runtime resolution: deterministic candidate ordering and stable keys", () => {
  const first = resolveRuntimeSiteVersion({
    strategy: "latest_imported",
    binding: {
      ...binding,
      latestImportedSiteVersionId: null,
    },
    candidateSiteVersionIds: ["sv_b", "sv_a", "sv_c", "sv_a"],
  });
  const second = resolveRuntimeSiteVersion({
    strategy: "latest_imported",
    binding: {
      ...binding,
      latestImportedSiteVersionId: null,
    },
    candidateSiteVersionIds: ["sv_c", "sv_b", "sv_a"],
  });

  assert.equal(first.siteVersionId, "sv_c");
  assert.equal(second.siteVersionId, "sv_c");
  assert.equal(first.resolutionKey, second.resolutionKey);
  assert.equal(first.resolutionKey.length, 64);

  const keyA = createRuntimeResolutionKey({
    strategy: "active",
    binding,
    resolvedSiteVersionId: "sv_active_2",
    fallbackUsed: false,
    candidateSiteVersionIds: ["sv_z", "sv_x", "sv_y"],
  });
  const keyB = createRuntimeResolutionKey({
    strategy: "active",
    binding,
    resolvedSiteVersionId: "sv_active_2",
    fallbackUsed: false,
    candidateSiteVersionIds: ["sv_y", "sv_z", "sv_x"],
  });
  assert.equal(keyA, keyB);
});

test("runtime resolution: identical inputs produce identical outputs without time/random dependencies", () => {
  const input = {
    strategy: "active" as const,
    binding: {
      ...binding,
      activeSiteVersionId: null,
      latestImportedSiteVersionId: "sv_imported_99",
    },
    candidateSiteVersionIds: ["sv_imported_90", "sv_imported_99"],
  };

  const one = resolveRuntimeSiteVersion(input);
  const two = resolveRuntimeSiteVersion(input);

  assert.deepEqual(one, two);
  const activeResolved = resolveActiveRuntimeVersion({
    binding: input.binding,
    candidateSiteVersionIds: input.candidateSiteVersionIds,
  });
  assert.equal(activeResolved.siteVersionId, "sv_imported_99");
  assert.equal(activeResolved.fallbackUsed, true);
});
