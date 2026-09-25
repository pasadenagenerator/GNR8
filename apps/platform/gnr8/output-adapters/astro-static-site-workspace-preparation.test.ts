import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { createAstroStaticSiteProjectManifest, type NormalizedStaticBusinessSiteContent } from "./astro-static-site-adapter";
import {
  AstroWorkspacePreparationError,
  prepareAstroStaticSiteWorkspace,
  readAstroStaticSiteSourceSnapshot,
  validateAstroStaticSiteManifestPaths,
} from "./astro-static-site-workspace-preparation";
import type { Gnr8OutputAdapterFileManifest } from "./output-adapter-contract";

const execFileAsync = promisify(execFile);

test("prepares exact Astro source, a clean Git baseline, and proof-only future descriptors", async () => {
  await withTemporaryRoot(async (root) => {
    const content = businessSiteFixture();
    const manifest = createAstroStaticSiteProjectManifest(content);
    const prepared = await prepareAstroStaticSiteWorkspace({ content, workspaceRoot: root });

    assert.equal(prepared.adapterId, "astro-static-site");
    assert.match(prepared.baselineCommit, /^[0-9a-f]{40,64}$/);
    assert.deepEqual(
      prepared.sourceSnapshot.files.map((file) => file.path),
      ["astro.config.mjs", "package.json", "public/styles/global.css", "src/pages/index.astro"],
    );
    assert.equal(prepared.futureStepMetadata.previewPort, 4321);
    assert.equal(prepared.futureStepMetadata.devCommand.command, "pnpm dev --host 127.0.0.1 --port 4321");
    assert.equal(prepared.futureStepMetadata.buildCommand.command, "pnpm build");
    assert.deepEqual(prepared.executionBoundaries, {
      proofOnly: true,
      dependenciesInstalled: false,
      devServerExecuted: false,
      buildExecuted: false,
      previewServerExecuted: false,
      airshipExecuted: false,
    });

    for (const file of manifest.files) {
      assert.equal(await readFile(join(prepared.workspacePath, ...file.path.split("/")), "utf8"), file.contents);
      const snapshotFile = prepared.sourceSnapshot.files.find((entry) => entry.path === file.path);
      assert.equal(snapshotFile?.bytes, Buffer.byteLength(file.contents, "utf8"));
      assert.match(snapshotFile?.sha256 ?? "", /^[0-9a-f]{64}$/);
    }

    const status = await git(prepared.workspacePath, ["status", "--porcelain=v1", "--untracked-files=all"]);
    const committedFiles = await git(prepared.workspacePath, ["ls-tree", "-r", "--name-only", "HEAD"]);
    assert.equal(status, "");
    assert.deepEqual(committedFiles.split("\n"), prepared.sourceSnapshot.files.map((file) => file.path));
  });
});

test("source snapshot hashes match across fresh workspaces and change after a controlled edit", async () => {
  await withTemporaryRoot(async (root) => {
    const content = businessSiteFixture();
    const first = await prepareAstroStaticSiteWorkspace({ content, workspaceRoot: root });
    const second = await prepareAstroStaticSiteWorkspace({ content, workspaceRoot: root });

    assert.notEqual(first.workspacePath, second.workspacePath);
    assert.deepEqual(first.sourceSnapshot, second.sourceSnapshot);

    const pagePath = join(first.workspacePath, "src/pages/index.astro");
    const before = await readFile(pagePath, "utf8");
    await writeFile(pagePath, before.replace("Work that reads clearly", "Work that reads clearly today"), "utf8");
    const editedSnapshot = await readAstroStaticSiteSourceSnapshot({
      workspacePath: first.workspacePath,
      sourcePaths: first.sourceSnapshot.files.map((file) => file.path),
    });
    const diff = await git(first.workspacePath, ["diff", "--", "src/pages/index.astro"]);

    assert.notEqual(editedSnapshot.aggregateSha256, first.sourceSnapshot.aggregateSha256);
    assert.match(diff, /Work that reads clearly today/);
    assert.match(await git(first.workspacePath, ["status", "--short"]), /src\/pages\/index\.astro/);
  });
});

test("manifest validation rejects absolute, traversal, duplicate, collision, and reserved Git paths", () => {
  for (const path of ["/absolute.txt", "C:\\absolute.txt", "../escape.txt", "src/../escape.txt", "./file.txt", "src\\file.txt"]) {
    assertPreparationError(() => validateAstroStaticSiteManifestPaths(manifestWithPaths(path)), "invalid_manifest_path");
  }

  assertPreparationError(
    () => validateAstroStaticSiteManifestPaths(manifestWithPaths("src/page.astro", "src/page.astro")),
    "duplicate_manifest_path",
  );
  assertPreparationError(
    () => validateAstroStaticSiteManifestPaths(manifestWithPaths("SRC/page.astro", "src/PAGE.astro")),
    "duplicate_manifest_path",
  );
  assertPreparationError(
    () => validateAstroStaticSiteManifestPaths(manifestWithPaths("src", "src/pages/index.astro")),
    "manifest_path_collision",
  );
  assertPreparationError(
    () => validateAstroStaticSiteManifestPaths(manifestWithPaths(".git/config")),
    "reserved_git_path",
  );
  assertPreparationError(
    () => validateAstroStaticSiteManifestPaths(manifestWithPaths("source/.GIT/hooks/pre-commit")),
    "reserved_git_path",
  );
});

test("existing destinations fail without modification", async () => {
  await withTemporaryRoot(async (root) => {
    const destination = join(root, "existing-workspace");
    const markerPath = join(destination, "external-marker.txt");
    await mkdir(destination);
    await writeFile(markerPath, "leave me alone", "utf8");

    await assert.rejects(
      prepareAstroStaticSiteWorkspace({ content: businessSiteFixture(), workspacePath: destination }),
      (error: unknown) => error instanceof AstroWorkspacePreparationError && error.code === "workspace_already_exists",
    );
    assert.equal(await readFile(markerPath, "utf8"), "leave me alone");
  });
});

test("workspace creation and source readback reject symlink escapes", async () => {
  await withTemporaryRoot(async (root) => {
    const externalRoot = await mkdtemp(join(tmpdir(), "gnr8-astro-external-"));
    try {
      const markerPath = join(externalRoot, "external-marker.txt");
      await writeFile(markerPath, "external", "utf8");
      const redirectedParent = join(root, "redirected-parent");
      await symlink(externalRoot, redirectedParent, "dir");

      await assert.rejects(
        prepareAstroStaticSiteWorkspace({
          content: businessSiteFixture(),
          workspacePath: join(redirectedParent, "escaped-workspace"),
        }),
        (error: unknown) => error instanceof AstroWorkspacePreparationError && error.code === "workspace_boundary_invalid",
      );
      assert.equal(await readFile(markerPath, "utf8"), "external");

      const prepared = await prepareAstroStaticSiteWorkspace({ content: businessSiteFixture(), workspaceRoot: root });
      const sourcePath = join(prepared.workspacePath, "source-link.txt");
      await symlink(markerPath, sourcePath);
      await assert.rejects(
        readAstroStaticSiteSourceSnapshot({ workspacePath: prepared.workspacePath, sourcePaths: ["source-link.txt"] }),
        (error: unknown) => error instanceof AstroWorkspacePreparationError && error.code === "source_boundary_invalid",
      );
    } finally {
      await rm(externalRoot, { recursive: true, force: true });
    }
  });
});

test("Git initialization ignores inherited repository redirects and uses local proof identity", async () => {
  await withTemporaryRoot(async (root) => {
    const redirectedGitDir = join(root, "redirected.git");
    const redirectedWorkTree = join(root, "redirected-work-tree");
    const redirectedIndex = join(root, "redirected.index");
    const prior = {
      GIT_DIR: process.env.GIT_DIR,
      GIT_WORK_TREE: process.env.GIT_WORK_TREE,
      GIT_INDEX_FILE: process.env.GIT_INDEX_FILE,
    };
    process.env.GIT_DIR = redirectedGitDir;
    process.env.GIT_WORK_TREE = redirectedWorkTree;
    process.env.GIT_INDEX_FILE = redirectedIndex;

    let prepared: Awaited<ReturnType<typeof prepareAstroStaticSiteWorkspace>>;
    try {
      prepared = await prepareAstroStaticSiteWorkspace({ content: businessSiteFixture(), workspaceRoot: root });
    } finally {
      restoreEnvironment("GIT_DIR", prior.GIT_DIR);
      restoreEnvironment("GIT_WORK_TREE", prior.GIT_WORK_TREE);
      restoreEnvironment("GIT_INDEX_FILE", prior.GIT_INDEX_FILE);
    }

    assert.equal(await readFile(join(prepared.workspacePath, ".git/config"), "utf8").then((body) => body.includes(redirectedGitDir)), false);
    await assert.rejects(readFile(redirectedIndex));
    await assert.rejects(readFile(join(redirectedGitDir, "HEAD")));
    assert.equal(await git(prepared.workspacePath, ["config", "--local", "user.name"]), "GNR8 Astro Workspace Proof");
    assert.equal(await git(prepared.workspacePath, ["config", "--local", "user.email"]), "astro-workspace-proof@gnr8.local");
    assert.equal(await git(prepared.workspacePath, ["config", "--local", "commit.gpgSign"]), "false");
  });
});

test("a post-creation failure removes only the workspace created by that invocation", async () => {
  await withTemporaryRoot(async (root) => {
    const destination = join(root, "failed-workspace");
    const parentMarker = join(root, "parent-marker.txt");
    const emptyPath = join(root, "empty-path");
    await mkdir(emptyPath);
    await writeFile(parentMarker, "preserve parent", "utf8");
    const priorPath = process.env.PATH;
    process.env.PATH = emptyPath;

    try {
      await assert.rejects(
        prepareAstroStaticSiteWorkspace({ content: businessSiteFixture(), workspacePath: destination }),
        (error: unknown) => error instanceof AstroWorkspacePreparationError && error.code === "git_operation_failed",
      );
    } finally {
      restoreEnvironment("PATH", priorPath);
    }

    await assert.rejects(readFile(join(destination, "package.json")));
    assert.equal(await readFile(parentMarker, "utf8"), "preserve parent");
  });
});

async function withTemporaryRoot<T>(run: (root: string) => Promise<T>): Promise<T> {
  const createdRoot = await mkdtemp(join(tmpdir(), "gnr8-astro-workspace-test-"));
  const root = await realpath(createdRoot);
  try {
    return await run(root);
  } finally {
    await rm(createdRoot, { recursive: true, force: true });
  }
}

async function git(cwd: string, args: string[]): Promise<string> {
  const result = await execFileAsync("git", args, { cwd, encoding: "utf8" });
  return result.stdout.trim();
}

function manifestWithPaths(...paths: string[]): Gnr8OutputAdapterFileManifest {
  return { files: paths.map((path) => ({ path, role: "source", contents: path })) };
}

function assertPreparationError(run: () => unknown, code: AstroWorkspacePreparationError["code"]): void {
  assert.throws(run, (error: unknown) => error instanceof AstroWorkspacePreparationError && error.code === code);
}

function restoreEnvironment(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function businessSiteFixture(): NormalizedStaticBusinessSiteContent {
  return {
    siteName: "Northline Operations Proof",
    brandName: "Northline Operations",
    navItems: [
      { label: "Services", href: "#services" },
      { label: "Contact", href: "#contact" },
    ],
    hero: {
      headline: "Work that reads clearly",
      body: "A synthetic business-site fixture for isolated Astro workspace preparation.",
      ctaLabel: "Start a conversation",
      ctaHref: "#contact",
    },
    sections: [
      {
        id: "services",
        eyebrow: "Services",
        title: "Practical operating support",
        body: "Planning, documentation, and delivery systems for growing service teams.",
        cards: [
          { title: "Planning", body: "Simple plans with accountable owners." },
          { title: "Delivery", body: "Clear handoffs and visible progress." },
        ],
      },
    ],
    contact: {
      heading: "Talk with Northline",
      body: "Share the operating challenge and the team will map a useful first step.",
      email: "hello@northline.example",
    },
    footer: { text: "Northline Operations synthetic GNR8 proof." },
    theme: {
      accentHex: "#0f766e",
      backgroundHex: "#f0fdfa",
      textHex: "#0f172a",
      mutedHex: "#475569",
      surfaceHex: "#ffffff",
      tone: "technical",
    },
  };
}
