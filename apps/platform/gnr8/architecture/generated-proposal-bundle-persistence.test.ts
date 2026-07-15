import assert from "node:assert/strict";
import test from "node:test";

import { sha256Hex } from "../runtime/deterministic";
import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  GENERATED_PROPOSAL_BUNDLE_ARTIFACT_KIND,
  GeneratedProposalBundlePersistenceValidationError,
  GeneratedProposalBundleResolutionError,
  buildGeneratedProposalBundleArtifact,
  buildGeneratedProposalBundleArtifactFromDirectory,
  loadGeneratedProposalBundleById,
  loadGeneratedProposalBundleByIteration,
  persistGeneratedProposalBundle,
  resolveGeneratedProposalBundleAsset,
  type GeneratedProposalBundleAsset,
  type GeneratedProposalBundleArtifactRecord,
  type GeneratedProposalBundleProvenanceSummary,
} from "./generated-proposal-bundle-persistence";
import {
  getGenerationPreviewBundleAvailability,
  resolveGenerationPreviewFile,
} from "./generation-evolution-preview-boundary";

const SITE_VERSION_ID = "09dce7ea-d860-4f60-a1eb-26c3335b302e";
const DRY_RUN_ID = "09dce7ea-d860-4f60-a1eb-26c3335b302e:8b-12l";
const PROPOSAL_ID = "proposal-1";
const PROPOSAL_ARTIFACT_ID = "generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3";
const OUTPUT_BUNDLE_ID = "ODV_GENERATED_PROPOSAL_001";

function asset(input: {
  relativePath: string;
  content: string | Uint8Array;
  contentType: string;
  role: GeneratedProposalBundleAsset["role"];
}): GeneratedProposalBundleAsset {
  const body = typeof input.content === "string" ? Buffer.from(input.content, "utf8") : Buffer.from(input.content);
  return {
    relativePath: input.relativePath,
    contentType: input.contentType,
    role: input.role,
    byteSize: body.byteLength,
    sha256: sha256Hex(body),
    contentBase64: body.toString("base64"),
  };
}

function bundle(input: Partial<GeneratedProposalBundleArtifactRecord> = {}): GeneratedProposalBundleArtifactRecord {
  const value = buildGeneratedProposalBundleArtifact({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    iteration: 1,
    generatedWebsiteProposalId: PROPOSAL_ID,
    generatedWebsiteProposalArtifactId: PROPOSAL_ARTIFACT_ID,
    outputBundleId: OUTPUT_BUNDLE_ID,
    bundleLabel: OUTPUT_BUNDLE_ID,
    sourceStorageReference: `artifact://generated-proposal-bundle/${OUTPUT_BUNDLE_ID}`,
    importedAt: "2026-07-15T10:00:00.000Z",
    persistedAt: "2026-07-15T10:00:00.000Z",
    manifest: {
      proposalId: OUTPUT_BUNDLE_ID,
      proposalKind: "GeneratedWebsiteProposal",
      files: ["source/index.html", "source/styles.css", "source/script.js"],
    },
    assets: [
      asset({
        relativePath: "source/index.html",
        content: '<!doctype html><html><head><link href="./styles.css" rel="stylesheet"><link rel="manifest" href="./manifest.webmanifest"></head><body><img src="./images/logo.png"><script src="./script.js"></script></body></html>',
        contentType: "text/html; charset=utf-8",
        role: "entry_html",
      }),
      asset({
        relativePath: "source/styles.css",
        content: '@font-face { font-family: ODV; src: url("./fonts/odv.woff2"); } body { font-family: ODV, sans-serif; }',
        contentType: "text/css; charset=utf-8",
        role: "css",
      }),
      asset({
        relativePath: "source/script.js",
        content: "document.documentElement.dataset.preview = 'durable';",
        contentType: "text/javascript; charset=utf-8",
        role: "js",
      }),
      asset({
        relativePath: "source/images/logo.png",
        content: Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
        contentType: "image/png",
        role: "image",
      }),
      asset({
        relativePath: "source/fonts/odv.woff2",
        content: Uint8Array.from([119, 79, 70, 50, 0, 1]),
        contentType: "font/woff2",
        role: "font",
      }),
      asset({
        relativePath: "source/favicon.ico",
        content: Uint8Array.from([0, 0, 1, 0]),
        contentType: "image/x-icon",
        role: "icon",
      }),
      asset({
        relativePath: "source/manifest.webmanifest",
        content: '{"name":"ODV proposal","icons":[]}',
        contentType: "application/json; charset=utf-8",
        role: "manifest",
      }),
      asset({
        relativePath: "proposal-manifest.json",
        content: '{"proposalId":"ODV_GENERATED_PROPOSAL_001"}',
        contentType: "application/json; charset=utf-8",
        role: "manifest",
      }),
    ],
  });
  return { ...value, ...input };
}

function memoryStore() {
  let summary = { kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary;
  let writes = 0;
  return {
    get summary() { return summary as GeneratedProposalBundleProvenanceSummary; },
    get writes() { return writes; },
    options: {
      persistedAt: "2026-07-15T10:00:00.000Z",
      getSiteVersion: async (siteVersionId: string) =>
        siteVersionId === SITE_VERSION_ID ? { importProvenanceSummary: summary } : null,
      setSiteVersionImportProvenanceSummary: async (input: {
        siteVersionId: string;
        importProvenanceSummary: RuntimeImportProvenanceSummary;
      }) => {
        assert.equal(input.siteVersionId, SITE_VERSION_ID);
        summary = input.importProvenanceSummary;
        writes += 1;
        return { affectedRows: 1 };
      },
    },
  };
}

async function persist(store: ReturnType<typeof memoryStore>, value = bundle()) {
  return persistGeneratedProposalBundle({
    siteVersionId: SITE_VERSION_ID,
    artifact: value,
    options: store.options,
  });
}

test("persists immutable Generated Proposal Bundle metadata and bytes", async () => {
  const store = memoryStore();
  const value = bundle();
  const ref = await persist(store, value);

  assert.equal(ref.kind, GENERATED_PROPOSAL_BUNDLE_ARTIFACT_KIND);
  assert.equal(ref.artifactKind, GENERATED_PROPOSAL_BUNDLE_ARTIFACT_KIND);
  assert.equal(ref.siteVersionId, SITE_VERSION_ID);
  assert.equal(ref.dryRunId, DRY_RUN_ID);
  assert.equal(ref.iteration, 1);
  assert.equal(ref.generatedWebsiteProposalArtifactId, PROPOSAL_ARTIFACT_ID);
  assert.equal(ref.outputBundleId, OUTPUT_BUNDLE_ID);
  assert.equal(ref.immutable, true);
  assert.equal(ref.preview.reconstructsFromPersistedBundleOnly, true);
  assert.equal(ref.entryFile, "source/index.html");
  assert.equal(ref.assetCount, 8);
  assert.equal(ref.contentTypes["source/styles.css"], "text/css; charset=utf-8");
  assert.equal(ref.contentTypes["source/script.js"], "text/javascript; charset=utf-8");
  assert.equal(ref.contentTypes["source/images/logo.png"], "image/png");
  assert.equal(ref.contentTypes["source/fonts/odv.woff2"], "font/woff2");
  assert.equal(ref.relativePathMap["source/index.html"], value.relativePathMap["source/index.html"]);
  assert.deepEqual(store.summary.generatedProposalBundleArtifacts?.[0], value);
});

test("loads cloned latest/by-id bundle records and resolves relative CSS JS image font icon manifest assets", async () => {
  const store = memoryStore();
  const ref = await persist(store);
  const latest = await loadGeneratedProposalBundleByIteration({
    siteVersionId: SITE_VERSION_ID,
    iteration: 1,
    options: store.options,
  });
  const byId = await loadGeneratedProposalBundleById({
    siteVersionId: SITE_VERSION_ID,
    artifactId: ref.artifactId,
    options: store.options,
  });

  assert.equal(latest?.artifactId, ref.artifactId);
  assert.deepEqual(byId, latest);
  assert.equal(resolveGeneratedProposalBundleAsset({ artifact: latest!, assetPathSegments: undefined }).relativePath, "source/index.html");
  assert.equal(resolveGeneratedProposalBundleAsset({ artifact: latest!, assetPathSegments: ["source", "styles.css"] }).contentType, "text/css; charset=utf-8");
  assert.equal(resolveGeneratedProposalBundleAsset({ artifact: latest!, assetPathSegments: ["source", "script.js"] }).contentType, "text/javascript; charset=utf-8");
  assert.equal(resolveGeneratedProposalBundleAsset({ artifact: latest!, assetPathSegments: ["source", "images", "logo.png"] }).contentType, "image/png");
  assert.equal(resolveGeneratedProposalBundleAsset({ artifact: latest!, assetPathSegments: ["source", "fonts", "odv.woff2"] }).contentType, "font/woff2");
  assert.equal(resolveGeneratedProposalBundleAsset({ artifact: latest!, assetPathSegments: ["source", "favicon.ico"] }).contentType, "image/x-icon");
  assert.equal(resolveGeneratedProposalBundleAsset({ artifact: latest!, assetPathSegments: ["source", "manifest.webmanifest"] }).contentType, "application/json; charset=utf-8");

  latest!.assets[0]!.contentBase64 = "mutated";
  const reloaded = await loadGeneratedProposalBundleByIteration({
    siteVersionId: SITE_VERSION_ID,
    iteration: 1,
    options: store.options,
  });
  assert.notEqual(reloaded?.assets[0]?.contentBase64, "mutated");
});

test("rejects traversal and reports missing assets without reading a filesystem path", async () => {
  const value = bundle({
    lineage: {
      ...bundle().lineage,
      sourceStorageReference: "artifact://durable-only/nonexistent-local-folder",
    },
  });

  assert.throws(
    () => resolveGeneratedProposalBundleAsset({ artifact: value, assetPathSegments: ["source", "..", "package.json"] }),
    (error: unknown) => {
      assert.ok(error instanceof GeneratedProposalBundleResolutionError);
      assert.equal(error.code, "PATH_TRAVERSAL_REJECTED");
      assert.equal(error.status, 400);
      return true;
    },
  );
  assert.throws(
    () => resolveGeneratedProposalBundleAsset({ artifact: value, assetPathSegments: ["source", "%2e%2e", "package.json"] }),
    (error: unknown) => {
      assert.ok(error instanceof GeneratedProposalBundleResolutionError);
      assert.equal(error.code, "PATH_TRAVERSAL_REJECTED");
      return true;
    },
  );
  assert.throws(
    () => resolveGeneratedProposalBundleAsset({ artifact: value, assetPathSegments: ["source", "missing.png"] }),
    (error: unknown) => {
      assert.ok(error instanceof GeneratedProposalBundleResolutionError);
      assert.equal(error.code, "ASSET_NOT_FOUND");
      assert.equal(error.status, 404);
      return true;
    },
  );

  const html = new TextDecoder().decode(resolveGeneratedProposalBundleAsset({ artifact: value }).body);
  assert.match(html, /durable|stylesheet|script|img/);
});

test("idempotent persistence reuses equivalent latest bundle and appends changed immutable history", async () => {
  const store = memoryStore();
  const first = await persist(store);
  const equivalent = bundle({ persistedAt: "2026-07-15T11:00:00.000Z" });
  const second = await persist(store, equivalent);
  assert.equal(second.artifactId, first.artifactId);
  assert.equal(store.writes, 1);

  const changed = bundle({
    assets: [
      ...bundle().assets.filter((item) => item.relativePath !== "source/script.js"),
      asset({
        relativePath: "source/script.js",
        content: "document.documentElement.dataset.preview = 'durable-v2';",
        contentType: "text/javascript; charset=utf-8",
        role: "js",
      }),
    ],
  });
  const changedRef = await persist(store, buildGeneratedProposalBundleArtifact({
    siteVersionId: changed.siteVersionId,
    dryRunId: changed.dryRunId,
    iteration: changed.iteration,
    generatedWebsiteProposalId: changed.generatedWebsiteProposalId,
    generatedWebsiteProposalArtifactId: changed.generatedWebsiteProposalArtifactId,
    outputBundleId: changed.outputBundleId,
    bundleLabel: changed.bundleLabel,
    sourceStorageReference: changed.lineage.sourceStorageReference,
    importedAt: "2026-07-15T12:00:00.000Z",
    assets: changed.assets,
    manifest: changed.manifest,
  }));

  assert.notEqual(changedRef.artifactId, first.artifactId);
  assert.equal(store.writes, 2);
  assert.equal(store.summary.generatedProposalBundleArtifacts?.length, 2);
  assert.equal(store.summary.latestGeneratedProposalBundleArtifact?.artifactId, changedRef.artifactId);
});

test("invalid bundle integrity is rejected before persistence", async () => {
  const store = memoryStore();
  const invalid = bundle();
  invalid.assets[0] = { ...invalid.assets[0]!, sha256: "bad-hash" };

  await assert.rejects(() => persist(store, invalid), (error: unknown) => {
    assert.ok(error instanceof GeneratedProposalBundlePersistenceValidationError);
    assert.ok(error.validation.errors.some((message) => message.includes("sha256 does not match content")));
    return true;
  });
});

test("directory builder captures proposal manifests and source files as persisted assets", async () => {
  const value = await buildGeneratedProposalBundleArtifactFromDirectory({
    rootDirectory: "ODV_GENERATED_PROPOSAL_001",
    siteVersionId: SITE_VERSION_ID,
    dryRunId: DRY_RUN_ID,
    iteration: 1,
    generatedWebsiteProposalId: PROPOSAL_ID,
    generatedWebsiteProposalArtifactId: PROPOSAL_ARTIFACT_ID,
    outputBundleId: OUTPUT_BUNDLE_ID,
    bundleLabel: OUTPUT_BUNDLE_ID,
    sourceStorageReference: "repo://ODV_GENERATED_PROPOSAL_001",
    importedAt: "2026-07-15T10:00:00.000Z",
  });

  assert.equal(value.validation.valid, true);
  assert.equal(value.manifest?.proposalId, OUTPUT_BUNDLE_ID);
  assert.equal(value.assets.some((item) => item.relativePath === "source/index.html"), true);
  assert.equal(value.assets.some((item) => item.relativePath === "source/styles.css"), true);
  assert.equal(value.assets.some((item) => item.relativePath === "source/script.js"), true);
});

test("preview boundary reconstructs from persisted bundle storage with allowlisted lineage", async () => {
  const store = memoryStore();
  await persist(store);

  const availability = await getGenerationPreviewBundleAvailability({
    siteVersionId: SITE_VERSION_ID,
    iteration: 1,
    options: store.options,
  });
  assert.equal(availability?.available, true);
  assert.equal(availability?.proposalArtifactId, PROPOSAL_ARTIFACT_ID);
  assert.equal(availability?.outputBundleId, OUTPUT_BUNDLE_ID);
  assert.equal(availability?.bundleArtifactId?.startsWith("generated_proposal_bundle_"), true);

  const html = await resolveGenerationPreviewFile({
    siteVersionId: SITE_VERSION_ID,
    iteration: "1",
    options: store.options,
  });
  assert.equal(html.ok, true);
  assert.equal(html.ok ? html.relativePath : null, "source/index.html");
  assert.equal(html.ok ? html.contentType : null, "text/html; charset=utf-8");

  const css = await resolveGenerationPreviewFile({
    siteVersionId: SITE_VERSION_ID,
    iteration: "1",
    assetPathSegments: ["source", "styles.css"],
    options: store.options,
  });
  assert.equal(css.ok, true);
  assert.equal(css.ok ? css.contentType : null, "text/css; charset=utf-8");

  const missingSite = await resolveGenerationPreviewFile({
    siteVersionId: "missing-site-version",
    iteration: "1",
    options: store.options,
  });
  assert.equal(missingSite.ok, false);
  assert.equal(missingSite.ok ? null : missingSite.code, "PREVIEW_UNAVAILABLE");

  const unknown = await resolveGenerationPreviewFile({
    siteVersionId: SITE_VERSION_ID,
    iteration: "3",
    options: store.options,
  });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.ok ? null : unknown.code, "UNKNOWN_ITERATION");
});
