import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  AstroBuildExportProofError,
  AstroStaticExportValidationError,
  inspectAstroStaticExport,
  runAstroBuildExportProof,
  startAstroDistStaticServer,
  type AstroBuildExportProofDependencies,
} from "./astro-static-site-build-export-proof";
import type { PreparedAstroStaticSiteWorkspace } from "./astro-static-site-workspace-preparation";

test("command entrypoint remains inert when imported", async () => {
  const entrypoint = await import("./run-astro-static-site-build-export-proof");
  assert.equal(typeof entrypoint.main, "function");
});

test("valid dist exports a sorted hashed manifest and serves only emitted HTML and CSS", async () => {
  await withWorkspace(async (workspacePath) => {
    await writeValidDist(workspacePath, {
      stylesheetHref: "/_astro/site.css?v=proof#theme",
      stylesheetBody: ":root{--gnr8-astro-accent:#0f766e;}body{background:url('/images/grid.svg?rev=1#tile')}",
    });
    await mkdir(join(workspacePath, "dist", "images"));
    await writeFile(join(workspacePath, "dist", "images", "grid.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>");

    const first = await inspectAstroStaticExport(workspacePath);
    const second = await inspectAstroStaticExport(workspacePath);
    assert.deepEqual(first.manifest.files.map((file) => file.path), ["_astro/site.css", "images/grid.svg", "index.html"]);
    assert.equal(first.manifest.aggregateSha256, second.manifest.aggregateSha256);
    assert.equal(first.manifest.totalBytes, first.manifest.files.reduce((total, file) => total + file.bytes, 0));
    assert.ok(first.manifest.files.every((file) => /^[0-9a-f]{64}$/.test(file.sha256)));
    assert.deepEqual(first.stylesheetPaths, ["_astro/site.css"]);
    assert.ok(first.references.some((reference) => reference.reference.includes("?v=proof#theme")));
    assert.ok(first.references.some((reference) => reference.resolvedPath === "images/grid.svg"));

    const server = await startAstroDistStaticServer(first);
    try {
      const page = await fetch(server.url);
      const stylesheet = await fetch(new URL("/_astro/site.css?v=proof#theme", server.url));
      const missing = await fetch(new URL("/package.json", server.url));
      assert.equal(page.status, 200);
      assert.match(page.headers.get("content-type") ?? "", /text\/html/);
      assert.equal(stylesheet.status, 200);
      assert.match(stylesheet.headers.get("content-type") ?? "", /text\/css/);
      assert.match(await stylesheet.text(), /--gnr8-astro-accent:#0f766e/);
      assert.equal(missing.status, 404);
    } finally {
      await server.close();
    }
  });
});

test("export validation rejects missing or empty HTML and missing referenced assets", async () => {
  await withWorkspace(async (workspacePath) => {
    await mkdir(join(workspacePath, "dist"));
    await assertValidationError(inspectAstroStaticExport(workspacePath), "index_missing");

    await writeFile(join(workspacePath, "dist", "index.html"), "");
    await assertValidationError(inspectAstroStaticExport(workspacePath), "index_empty");

    await writeValidDist(workspacePath, { stylesheetHref: "/_astro/missing.css?x=1#y" });
    await assertValidationError(inspectAstroStaticExport(workspacePath), "asset_missing");
  });
});

test("export validation rejects source-workspace and Vite development stylesheet references", async () => {
  await withWorkspace(async (workspacePath) => {
    await writeValidDist(workspacePath, { stylesheetHref: "/src/styles/global.css?direct" });
    await assertValidationError(inspectAstroStaticExport(workspacePath), "source_dependency_detected");
  });
});

test("export validation rejects symlinks that escape dist", async () => {
  await withWorkspace(async (workspacePath) => {
    await writeValidDist(workspacePath);
    const externalPath = join(workspacePath, "outside.txt");
    await writeFile(externalPath, "outside");
    await symlink(externalPath, join(workspacePath, "dist", "escaped.txt"));
    await assertValidationError(inspectAstroStaticExport(workspacePath), "export_symlink");
    assert.equal(await readFile(externalPath, "utf8"), "outside");
  });
});

test("failed and timed-out builds remove only the prepared workspace", async (t) => {
  for (const scenario of [
    { name: "failed", code: "build_failed" as const, error: new Error("build exited 7") },
    { name: "timed out", code: "build_timeout" as const, error: timeoutError() },
  ]) {
    await t.test(scenario.name, async () => {
      const removed: string[] = [];
      const workspacePath = `/tmp/owned-astro-build-export-${scenario.name.replaceAll(" ", "-")}`;
      const dependencies = mockedBuildDependencies(workspacePath, scenario.error, removed);

      await assert.rejects(
        () => runAstroBuildExportProof({ dependencies, buildTimeoutMs: 1 }),
        (error: unknown) => {
          assert.ok(error instanceof AstroBuildExportProofError);
          assert.equal(error.code, scenario.code);
          assert.equal(error.evidence.workspace.removed, true);
          assert.equal(error.evidence.cleanup.completed, true);
          assert.equal(error.evidence.server.started, false);
          return true;
        },
      );
      assert.deepEqual(removed, [workspacePath]);
    });
  }
});

async function writeValidDist(
  workspacePath: string,
  options: { stylesheetHref?: string; stylesheetBody?: string } = {},
): Promise<void> {
  const distPath = join(workspacePath, "dist");
  await mkdir(join(distPath, "_astro"), { recursive: true });
  const stylesheetHref = options.stylesheetHref ?? "/_astro/site.css";
  const html = `<!doctype html><html><head><title>Northline Operations Proof</title><link rel="stylesheet" href="${stylesheetHref}"></head><body><nav>Services Contact</nav><h1>Work that reads clearly</h1><section>Practical operating support</section><section>Talk with Northline hello@northline.example</section></body></html>`;
  await writeFile(join(distPath, "index.html"), html);
  if (!stylesheetHref.includes("missing")) {
    await writeFile(join(distPath, "_astro", "site.css"), options.stylesheetBody ?? ":root{--gnr8-astro-accent:#0f766e;}");
  }
}

function mockedBuildDependencies(
  workspacePath: string,
  buildError: Error,
  removed: string[],
): Partial<AstroBuildExportProofDependencies> {
  return {
    prepareWorkspace: async () => preparedWorkspace(workspacePath),
    runCommand: async (executable, args) => {
      if (executable === "git") return { stdout: "?? .pnpm-store/\n?? node_modules/\n?? pnpm-lock.yaml\n", stderr: "" };
      if (args[0] === "install") return { stdout: "installed", stderr: "" };
      if (args[0] === "--version") return { stdout: "10.28.2\n", stderr: "" };
      if (args[0] === "build") throw buildError;
      throw new Error(`unexpected command: ${executable} ${args.join(" ")}`);
    },
    readFile: async () => JSON.stringify({ version: "5.18.2" }),
    removeWorkspace: async (path) => {
      removed.push(path);
    },
  };
}

function preparedWorkspace(workspacePath: string): PreparedAstroStaticSiteWorkspace {
  return {
    adapterId: "astro-static-site",
    workspacePath,
    baselineCommit: "0123456789012345678901234567890123456789",
    sourceSnapshot: {
      version: "gnr8-astro-source-snapshot:v1",
      files: [{ path: "package.json", bytes: 2, sha256: "a".repeat(64) }],
      aggregateSha256: "b".repeat(64),
    },
    snapshotInclusionRules: [],
    futureStepMetadata: {
      previewPort: 4321,
      devCommand: { command: "pnpm dev", cwdHint: "workspace-root" },
      buildCommand: { command: "pnpm build", cwdHint: "workspace-root" },
    },
    executionBoundaries: {
      proofOnly: true,
      dependenciesInstalled: false,
      devServerExecuted: false,
      buildExecuted: false,
      previewServerExecuted: false,
      airshipExecuted: false,
    },
  };
}

function timeoutError(): Error {
  return Object.assign(new Error("command timed out"), { code: "ETIMEDOUT", killed: true });
}

async function assertValidationError(
  promise: Promise<unknown>,
  code: AstroStaticExportValidationError["code"],
): Promise<void> {
  await assert.rejects(
    promise,
    (error: unknown) => error instanceof AstroStaticExportValidationError && error.code === code,
  );
}

async function withWorkspace(run: (workspacePath: string) => Promise<void>): Promise<void> {
  const workspacePath = await mkdtemp(join(tmpdir(), "gnr8-astro-build-export-test-"));
  try {
    await run(await realpath(workspacePath));
  } finally {
    await rm(workspacePath, { recursive: true, force: true });
  }
}
