import assert from "node:assert/strict";
import test from "node:test";

import { sha256Hex } from "../runtime/deterministic";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  buildGeneratedProposalBundleArtifact,
  type GeneratedProposalBundleAsset,
} from "./generated-proposal-bundle-persistence";
import { buildWebsiteVersionThumbnailArtifact, validateWebsiteVersionThumbnailArtifact } from "./website-version-thumbnail-builder";
import {
  WEBSITE_VERSION_THUMBNAIL_CANONICAL_VIEWPORT,
  WEBSITE_VERSION_THUMBNAIL_ARTIFACT_KIND,
  type WebsiteVersionThumbnailArtifact,
} from "./website-version-thumbnail-contract";
import {
  loadGeneratedWebsiteVersionThumbnail,
  loadOriginalWebsiteVersionThumbnail,
  persistWebsiteVersionThumbnail,
  thumbnailBody,
} from "./website-version-thumbnail-persistence";
import {
  materializeGeneratedWebsiteVersionThumbnail,
  materializeOriginalWebsiteVersionThumbnail,
} from "./website-version-thumbnail-materializer";

const SITE_VERSION_ID = "09dce7ea-d860-4f60-a1eb-26c3335b302e";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSF+FAJLOA/xDk8O2AAAAAElFTkSuQmCC", "base64");

function image(overrides: Partial<{ content: Buffer; width: number; height: number }> = {}) {
  const content = overrides.content ?? PNG;
  return {
    mediaType: "image/png" as const,
    width: overrides.width ?? 2,
    height: overrides.height ?? 2,
    contentBase64: content.toString("base64"),
  };
}

function originalArtifact(overrides: Partial<WebsiteVersionThumbnailArtifact> = {}) {
  return {
    ...buildWebsiteVersionThumbnailArtifact({
      source: {
        siteVersionId: SITE_VERSION_ID,
        sourceSiteId: "odv",
        dryRunId: null,
        versionKind: "original_source",
        iterationNumber: null,
        sourceArtifactId: "raw-artifact-1",
        sourceArtifactKind: "raw_imported_site",
        generatedProposalBundleId: null,
        generatedProposalBundleSha256: null,
        sourceScreenshotArtifactId: "raw-artifact-1:rendered/screenshots/viewport.png",
        sourceScreenshotContentHash: sha256Hex(PNG),
      },
      captureMethod: "reused_evidence_capture_screenshot",
      captureTimestamp: "2026-07-16T10:00:00.000Z",
      viewport: WEBSITE_VERSION_THUMBNAIL_CANONICAL_VIEWPORT,
      image: image(),
    }),
    ...overrides,
  };
}

function asset(relativePath: string, content: string, contentType: string, role: GeneratedProposalBundleAsset["role"]): GeneratedProposalBundleAsset {
  const body = Buffer.from(content, "utf8");
  return { relativePath, contentType, role, byteSize: body.byteLength, sha256: sha256Hex(body), contentBase64: body.toString("base64") };
}

function bundle(iteration: 1 | 2) {
  return buildGeneratedProposalBundleArtifact({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: "dry-run",
    iteration,
    generatedWebsiteProposalId: `proposal-${iteration}`,
    generatedWebsiteProposalArtifactId: iteration === 1
      ? "generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3"
      : "generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e",
    outputBundleId: `ODV_GENERATED_PROPOSAL_00${iteration}`,
    bundleLabel: `ODV_GENERATED_PROPOSAL_00${iteration}`,
    sourceStorageReference: `artifact://generated-proposal-bundle/ODV_GENERATED_PROPOSAL_00${iteration}`,
    importedAt: "2026-07-16T09:00:00.000Z",
    assets: [
      asset("source/index.html", "<!doctype html><html><body>ODV</body></html>", "text/html; charset=utf-8", "entry_html"),
      asset("source/styles.css", "body{color:#111}", "text/css; charset=utf-8", "css"),
    ],
  });
}

function memoryStore(seed: RuntimeImportProvenanceSummary = { kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary) {
  let summary = seed;
  let writes = 0;
  return {
    get summary() { return summary; },
    get writes() { return writes; },
    options: {
      getSiteVersion: async () => ({ importProvenanceSummary: summary }),
      setSiteVersionImportProvenanceSummary: async (input: { importProvenanceSummary: RuntimeImportProvenanceSummary }) => {
        summary = input.importProvenanceSummary;
        writes += 1;
        return { affectedRows: 1 };
      },
    },
  };
}

test("contract validates original and generated thumbnails and deterministic IDs", () => {
  const first = originalArtifact();
  const retry = originalArtifact({ createdAt: "2026-07-16T11:00:00.000Z" });
  assert.equal(first.artifactKind, WEBSITE_VERSION_THUMBNAIL_ARTIFACT_KIND);
  assert.equal(validateWebsiteVersionThumbnailArtifact(first).valid, true);
  assert.equal(first.artifactId, retry.artifactId);

  const changed = buildWebsiteVersionThumbnailArtifact({
    source: first.lineage,
    captureMethod: "reused_evidence_capture_screenshot",
    captureTimestamp: first.captureTimestamp,
    viewport: { ...WEBSITE_VERSION_THUMBNAIL_CANONICAL_VIEWPORT, width: 1024 },
    image: image(),
  });
  assert.notEqual(changed.artifactId, first.artifactId);

  const invalid = originalArtifact({ sourceArtifactKind: "representative_source_asset" });
  assert.equal(validateWebsiteVersionThumbnailArtifact(invalid).valid, false);
});

test("persistence is append-only, idempotent, by-id, and latest-aware", async () => {
  const store = memoryStore();
  const first = await persistWebsiteVersionThumbnail({ siteVersionId: SITE_VERSION_ID, artifact: originalArtifact(), options: store.options });
  const retry = await persistWebsiteVersionThumbnail({ siteVersionId: SITE_VERSION_ID, artifact: originalArtifact(), options: store.options });
  assert.equal(retry.artifactId, first.artifactId);
  assert.equal(store.writes, 1);

  const changed = buildWebsiteVersionThumbnailArtifact({
    source: {
      siteVersionId: SITE_VERSION_ID,
      sourceSiteId: "odv",
      dryRunId: null,
      versionKind: "original_source",
      iterationNumber: null,
      sourceArtifactId: "raw-artifact-1",
      sourceArtifactKind: "raw_imported_site",
      generatedProposalBundleId: null,
      generatedProposalBundleSha256: null,
      sourceScreenshotArtifactId: "raw-artifact-1:rendered/screenshots/fullpage.png",
      sourceScreenshotContentHash: sha256Hex(PNG),
    },
    captureMethod: "reused_evidence_capture_screenshot",
    captureTimestamp: "2026-07-16T11:00:00.000Z",
    viewport: WEBSITE_VERSION_THUMBNAIL_CANONICAL_VIEWPORT,
    image: image(),
  });
  const second = await persistWebsiteVersionThumbnail({ siteVersionId: SITE_VERSION_ID, artifact: changed, options: store.options });
  assert.notEqual(second.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal((store.summary as any).websiteVersionThumbnailArtifacts.length, 2);
  assert.equal((await loadOriginalWebsiteVersionThumbnail({ siteVersionId: SITE_VERSION_ID, options: store.options }))?.artifactId, second.artifactId);
});

test("materializer reuses persisted source screenshot bytes and does not write in dry run", async () => {
  const store = memoryStore({
    kind: "runtime_import_provenance_summary_v1",
    captureEvidence: {
      renderedViewportScreenshotPath: "rendered/screenshots/viewport.png",
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
  } as unknown as RuntimeImportProvenanceSummary);
  const result = await materializeOriginalWebsiteVersionThumbnail({
    siteVersionId: SITE_VERSION_ID,
    mode: "dry_run",
    options: {
      ...store.options,
      getRawImportedSiteArtifact: async () => ({
        id: "raw-artifact-id",
        artifactType: "raw_imported_site",
        siteId: "odv",
        siteVersionId: SITE_VERSION_ID,
        entryHtmlPath: "index.html",
        assetBasePath: "assets",
        fileMap: { "rendered/screenshots/viewport.png": { sha256: sha256Hex(PNG) } },
        metadata: { diagnostics: [] },
        createdAt: "2026-07-16T09:00:00.000Z",
      } as any),
      getRawTemplateSiteAsset: async () => ({ mediaType: "image/png", sizeBytes: PNG.byteLength, sha256: sha256Hex(PNG), bytes: PNG }),
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.wrote : true, false);
  assert.equal(store.writes, 0);
  assert.equal(result.ok ? result.artifact.captureMethod : null, "reused_evidence_capture_screenshot");
});

test("generated materializer uses exact bundle lineage and injected capture without local folders", async () => {
  const summary = {
    kind: "runtime_import_provenance_summary_v1",
    generatedProposalBundleArtifacts: [bundle(1)],
  } as unknown as RuntimeImportProvenanceSummary;
  const store = memoryStore(summary);
  const result = await materializeGeneratedWebsiteVersionThumbnail({
    siteVersionId: SITE_VERSION_ID,
    iteration: 1,
    mode: "dry_run",
    options: {
      ...store.options,
      captureGeneratedPreview: async () => ({ bytes: PNG, mediaType: "image/png", width: 2, height: 2 }),
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.ok ? result.artifact.sourceArtifactKind : null, "generated_proposal_bundle");
  assert.equal(result.ok ? result.artifact.generatedProposalBundleId : null, bundle(1).artifactId);
  assert.equal(result.ok ? result.artifact.diagnostics.includes("NO_LOCAL_PROPOSAL_DIRECTORY") : false, true);
});

test("thumbnail body returns exact persisted bytes", () => {
  const artifact = originalArtifact();
  assert.equal(sha256Hex(thumbnailBody(artifact)), artifact.contentHash);
});

test("generated stale or unavailable thumbnails are not selected as current", async () => {
  const stale = originalArtifact({ availability: { status: "stale", safeServing: true, reason: "superseded" } });
  const store = memoryStore({
    kind: "runtime_import_provenance_summary_v1",
    websiteVersionThumbnailArtifacts: [stale],
  } as unknown as RuntimeImportProvenanceSummary);
  assert.equal(await loadGeneratedWebsiteVersionThumbnail({ siteVersionId: SITE_VERSION_ID, iteration: 1, options: store.options }), null);
  assert.equal(await loadOriginalWebsiteVersionThumbnail({ siteVersionId: SITE_VERSION_ID, options: store.options }), null);
});
