import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  renderSiteVersionPreview,
  setUnifiedRenderPreviewDependenciesForTest,
  SiteVersionPreviewUnavailableError,
} from "../runtime/unified-render-preview";
import {
  AstroInternalPreviewBridgeError,
  convertAstroExportToInternalPreviewCandidate,
  type AstroInternalPreviewCandidate,
} from "./astro-static-site-internal-preview-bridge";
import {
  AstroStaticExportValidationError,
  inspectAstroStaticExport,
} from "./astro-static-site-build-export-proof";

const SOURCE_SNAPSHOT_SHA256 = "a".repeat(64);
const SYNTHETIC_SITE_ID = "site-astro-mvp06-proof";
const SYNTHETIC_SITE_VERSION_ID = "sv-astro-mvp06-proof";
const SYNTHETIC_CANDIDATE_ID = "candidate-astro-mvp06-proof";

test("bridge proof command remains inert when imported", async () => {
  const entrypoint = await import("./run-astro-static-site-internal-preview-proof");
  assert.equal(typeof entrypoint.main, "function");
});

test("bridge converts deterministic single-page output and the unified preview selects it without database reads", async () => {
  await withWorkspace(async (workspacePath) => {
    await writeFixtureDist(workspacePath);
    const inspected = await inspectAstroStaticExport(workspacePath);
    const first = await convertFixture(inspected);
    const second = await convertFixture(inspected);

    assert.equal(first.contentSha256, second.contentSha256);
    assert.notEqual(first.contentSha256, inspected.manifest.aggregateSha256);
    assert.equal(first.manifest.provenance.exportSha256, inspected.manifest.aggregateSha256);
    assert.equal(first.manifest.provenance.convertedArtifactSha256, first.contentSha256);
    assert.deepEqual(first.manifest.ownership, {
      siteId: SYNTHETIC_SITE_ID,
      siteVersionId: SYNTHETIC_SITE_VERSION_ID,
    });
    assert.deepEqual(first.manifest.assetHandling.inlinedStylesheetPaths, ["styles/global.css"]);
    assert.equal(first.compiledTokenStyles.includes("--gnr8-astro-accent: #0f766e;"), true);
    assert.equal(first.htmlByPath["/"].includes("<link"), false);
    assert.equal(first.htmlByPath["/"].includes("<style data-gnr8-astro-source-href=\"/styles/global.css?v=proof#theme\">"), true);
    assert.equal(first.htmlByPath["/"].includes('href="/contact?plan=ops#form"'), true);

    const restore = setUnifiedRenderPreviewDependenciesForTest({
      getPoolStatus: () => ({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
      getAstroInternalPreviewCandidate: async (candidateId) => {
        assert.equal(candidateId, SYNTHETIC_CANDIDATE_ID);
        return first;
      },
      getSiteVersion: async () => {
        throw new Error("Astro proof selection must not read a site version.");
      },
      getSiteVersionArtifactBinding: async () => {
        throw new Error("Astro proof selection must not read a persisted artifact binding.");
      },
      getArtifactById: async () => {
        throw new Error("Astro proof selection must not read a persisted runtime artifact.");
      },
    });
    try {
      const preview = await renderSiteVersionPreview({
        siteVersionId: SYNTHETIC_SITE_VERSION_ID,
        path: "/",
        mode: "transformed",
        astroCandidateSelection: {
          candidateId: SYNTHETIC_CANDIDATE_ID,
          siteId: SYNTHETIC_SITE_ID,
        },
        requestCorrelationKey: "req-astro-mvp06-proof",
      });
      assert.equal(preview.source, "astro_internal_preview_candidate");
      assert.equal(preview.artifactId, SYNTHETIC_CANDIDATE_ID);
      assert.equal(preview.siteId, SYNTHETIC_SITE_ID);
      assert.equal(preview.siteVersionId, SYNTHETIC_SITE_VERSION_ID);
      assert.equal(preview.fallbackUsed, false);
      assert.equal(preview.html.includes("Work that reads clearly"), true);
      assert.equal(preview.html.includes("--gnr8-astro-accent: #0f766e;"), true);
      assert.equal(preview.html.includes('href="/contact?plan=ops#form"'), true);
    } finally {
      restore();
    }
  });
});

test("bridge revalidates corrupt, missing, and symlinked export bytes", async (t) => {
  await t.test("corrupt bytes", async () => {
    await withWorkspace(async (workspacePath) => {
      await writeFixtureDist(workspacePath);
      const inspected = await inspectAstroStaticExport(workspacePath);
      await writeFile(
        join(workspacePath, "dist", "styles", "global.css"),
        ":root{--gnr8-astro-accent: #0f766e;}body{color:#456}",
      );
      await assert.rejects(
        () => convertFixture(inspected),
        (error: unknown) => error instanceof AstroInternalPreviewBridgeError && error.code === "export_manifest_mismatch",
      );
    });
  });

  await t.test("missing stylesheet", async () => {
    await withWorkspace(async (workspacePath) => {
      await writeFixtureDist(workspacePath);
      const inspected = await inspectAstroStaticExport(workspacePath);
      await unlink(join(workspacePath, "dist", "styles", "global.css"));
      await assert.rejects(
        () => convertFixture(inspected),
        (error: unknown) => error instanceof AstroStaticExportValidationError && error.code === "asset_missing",
      );
    });
  });

  await t.test("symlink substitution", async () => {
    await withWorkspace(async (workspacePath) => {
      await writeFixtureDist(workspacePath);
      const inspected = await inspectAstroStaticExport(workspacePath);
      const stylesheetPath = join(workspacePath, "dist", "styles", "global.css");
      const outsidePath = join(workspacePath, "outside.css");
      await writeFile(outsidePath, await readFile(stylesheetPath));
      await unlink(stylesheetPath);
      await symlink(outsidePath, stylesheetPath);
      await assert.rejects(
        () => convertFixture(inspected),
        (error: unknown) => error instanceof AstroStaticExportValidationError && error.code === "export_symlink",
      );
    });
  });
});

test("bridge fails explicitly for unsupported routes, file kinds, and CSS asset dependencies", async (t) => {
  await t.test("second HTML route", async () => {
    await withWorkspace(async (workspacePath) => {
      await writeFixtureDist(workspacePath);
      await writeFile(join(workspacePath, "dist", "about.html"), "<!doctype html><html><body>About</body></html>");
      const inspected = await inspectAstroStaticExport(workspacePath);
      await assertBridgeError(convertFixture(inspected), "unsupported_route");
    });
  });

  await t.test("non-CSS emitted file", async () => {
    await withWorkspace(async (workspacePath) => {
      await writeFixtureDist(workspacePath);
      await writeFile(join(workspacePath, "dist", "notes.txt"), "unsupported");
      const inspected = await inspectAstroStaticExport(workspacePath);
      await assertBridgeError(convertFixture(inspected), "unsupported_file_kind");
    });
  });

  await t.test("CSS url dependency", async () => {
    await withWorkspace(async (workspacePath) => {
      await writeFixtureDist(workspacePath, ":root{--gnr8-astro-accent: #0f766e;}body{background:url(data:image/svg+xml;base64,PHN2Zy8+)}");
      const inspected = await inspectAstroStaticExport(workspacePath);
      const supportedDataUrl = await convertFixture(inspected);
      assert.match(supportedDataUrl.compiledTokenStyles, /data:image\/svg\+xml/);

      await writeFile(
        join(workspacePath, "dist", "styles", "global.css"),
        ":root{--gnr8-astro-accent: #0f766e;}body{background:url('/images/grid.svg')}",
      );
      await mkdir(join(workspacePath, "dist", "images"));
      await writeFile(join(workspacePath, "dist", "images", "grid.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>");
      const withAsset = await inspectAstroStaticExport(workspacePath);
      await assertBridgeError(convertFixture(withAsset), "unsupported_file_kind");
    });
  });
});

test("explicit Astro selection rejects ownership and candidate-kind mismatches without fallback", async () => {
  await withWorkspace(async (workspacePath) => {
    await writeFixtureDist(workspacePath);
    const candidate = await convertFixture(await inspectAstroStaticExport(workspacePath));
    let selectedCandidate: AstroInternalPreviewCandidate = candidate;
    let bindingReads = 0;
    const restore = setUnifiedRenderPreviewDependenciesForTest({
      getPoolStatus: () => ({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
      getAstroInternalPreviewCandidate: async () => selectedCandidate,
      getSiteVersionArtifactBinding: async () => {
        bindingReads += 1;
        return null;
      },
    });
    try {
      await assert.rejects(
        () =>
          renderSiteVersionPreview({
            siteVersionId: SYNTHETIC_SITE_VERSION_ID,
            mode: "transformed",
            astroCandidateSelection: { candidateId: SYNTHETIC_CANDIDATE_ID, siteId: "site-wrong-owner" },
          }),
        isOwnershipSelectionError,
      );
      await assert.rejects(
        () =>
          renderSiteVersionPreview({
            siteVersionId: "sv-wrong-owner",
            mode: "transformed",
            astroCandidateSelection: { candidateId: SYNTHETIC_CANDIDATE_ID, siteId: SYNTHETIC_SITE_ID },
          }),
        isOwnershipSelectionError,
      );
      selectedCandidate = { ...candidate, kind: "invalid_candidate_kind" as AstroInternalPreviewCandidate["kind"] };
      await assert.rejects(
        () =>
          renderSiteVersionPreview({
            siteVersionId: SYNTHETIC_SITE_VERSION_ID,
            mode: "transformed",
            astroCandidateSelection: { candidateId: SYNTHETIC_CANDIDATE_ID, siteId: SYNTHETIC_SITE_ID },
          }),
        (error: unknown) =>
          error instanceof SiteVersionPreviewUnavailableError &&
          error.code === "TRANSFORMED_ARTIFACT_NOT_AVAILABLE" &&
          /missing or invalid/.test(error.message),
      );
      assert.equal(bindingReads, 0);
    } finally {
      restore();
    }
  });
});

async function writeFixtureDist(workspacePath: string, stylesheet = ":root{--gnr8-astro-accent: #0f766e;}body{color:#123}"): Promise<void> {
  const distPath = join(workspacePath, "dist");
  await mkdir(join(distPath, "styles"), { recursive: true });
  await writeFile(
    join(distPath, "index.html"),
    '<!doctype html><html><head><title>Northline Operations Proof</title><link rel="stylesheet" href="/styles/global.css?v=proof#theme"></head><body><nav>Services Contact</nav><h1>Work that reads clearly</h1><section>Practical operating support</section><section>Talk with Northline hello@northline.example</section><a href="/contact?plan=ops#form">Contact us</a></body></html>',
  );
  await writeFile(join(distPath, "styles", "global.css"), stylesheet);
}

function convertFixture(inspectedExport: Awaited<ReturnType<typeof inspectAstroStaticExport>>): Promise<AstroInternalPreviewCandidate> {
  return convertAstroExportToInternalPreviewCandidate({
    inspectedExport,
    candidateId: SYNTHETIC_CANDIDATE_ID,
    siteId: SYNTHETIC_SITE_ID,
    siteVersionId: SYNTHETIC_SITE_VERSION_ID,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    sourceSnapshotSha256: SOURCE_SNAPSHOT_SHA256,
    createdAt: "2026-09-25T00:00:00.000Z",
  });
}

async function assertBridgeError(
  promise: Promise<unknown>,
  code: AstroInternalPreviewBridgeError["code"],
): Promise<void> {
  await assert.rejects(
    promise,
    (error: unknown) => error instanceof AstroInternalPreviewBridgeError && error.code === code,
  );
}

function isOwnershipSelectionError(error: unknown): boolean {
  return (
    error instanceof SiteVersionPreviewUnavailableError &&
    error.code === "TRANSFORMED_ARTIFACT_NOT_AVAILABLE" &&
    /ownership selection/.test(error.message)
  );
}

async function withWorkspace(run: (workspacePath: string) => Promise<void>): Promise<void> {
  const workspacePath = await mkdtemp(join(tmpdir(), "gnr8-astro-preview-bridge-test-"));
  try {
    await run(await realpath(workspacePath));
  } finally {
    await rm(workspacePath, { recursive: true, force: true });
  }
}
