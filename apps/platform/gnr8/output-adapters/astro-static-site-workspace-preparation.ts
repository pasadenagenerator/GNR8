import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, mkdtemp, open, readFile, realpath, rm } from "node:fs/promises";
import { devNull, tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep, win32 } from "node:path";
import { promisify } from "node:util";

import type { Gnr8OutputAdapterCommand, Gnr8OutputAdapterFileManifest } from "./output-adapter-contract";
import {
  ASTRO_STATIC_SITE_PREVIEW_PORT,
  astroStaticSiteAdapterDescriptor,
  createAstroStaticSiteProjectManifest,
  type NormalizedStaticBusinessSiteContent,
} from "./astro-static-site-adapter";

const execFileAsync = promisify(execFile);
const SOURCE_SNAPSHOT_VERSION = "gnr8-astro-source-snapshot:v1" as const;
const DEFAULT_WORKSPACE_PREFIX = "gnr8-astro-workspace-";

export type AstroWorkspacePreparationErrorCode =
  | "invalid_manifest_path"
  | "duplicate_manifest_path"
  | "manifest_path_collision"
  | "reserved_git_path"
  | "workspace_already_exists"
  | "workspace_boundary_invalid"
  | "workspace_creation_failed"
  | "source_boundary_invalid"
  | "source_readback_mismatch"
  | "git_operation_failed"
  | "cleanup_failed";

export class AstroWorkspacePreparationError extends Error {
  readonly code: AstroWorkspacePreparationErrorCode;

  constructor(code: AstroWorkspacePreparationErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AstroWorkspacePreparationError";
    this.code = code;
  }
}

export interface PrepareAstroStaticSiteWorkspaceInput {
  content: NormalizedStaticBusinessSiteContent;
  /** Existing, canonical directory under which a fresh workspace is created. */
  workspaceRoot?: string;
  /** Exact new workspace path. Its parent must already exist and contain no symlink redirection. */
  workspacePath?: string;
}

export interface AstroSourceSnapshotFile {
  path: string;
  bytes: number;
  sha256: string;
}

export interface AstroSourceSnapshot {
  version: typeof SOURCE_SNAPSHOT_VERSION;
  files: AstroSourceSnapshotFile[];
  aggregateSha256: string;
}

export interface PreparedAstroStaticSiteWorkspace {
  adapterId: "astro-static-site";
  workspacePath: string;
  baselineCommit: string;
  sourceSnapshot: AstroSourceSnapshot;
  snapshotInclusionRules: readonly string[];
  futureStepMetadata: {
    previewPort: typeof ASTRO_STATIC_SITE_PREVIEW_PORT;
    devCommand: Gnr8OutputAdapterCommand;
    buildCommand: Gnr8OutputAdapterCommand;
  };
  executionBoundaries: {
    proofOnly: true;
    dependenciesInstalled: false;
    devServerExecuted: false;
    buildExecuted: false;
    previewServerExecuted: false;
    airshipExecuted: false;
  };
}

export async function prepareAstroStaticSiteWorkspace(
  input: PrepareAstroStaticSiteWorkspaceInput,
): Promise<PreparedAstroStaticSiteWorkspace> {
  if (input.workspaceRoot && input.workspacePath) {
    throw new AstroWorkspacePreparationError(
      "workspace_boundary_invalid",
      "Specify workspaceRoot or workspacePath, not both.",
    );
  }

  const manifest = createAstroStaticSiteProjectManifest(input.content);
  const sourcePaths = validateAstroStaticSiteManifestPaths(manifest);
  let createdWorkspacePath: string | null = null;

  try {
    createdWorkspacePath = await createFreshWorkspace(input);
    await materializeManifest(createdWorkspacePath, manifest, sourcePaths);
    await initializeGitBaseline(createdWorkspacePath, sourcePaths);

    const sourceSnapshot = await readAstroStaticSiteSourceSnapshot({
      workspacePath: createdWorkspacePath,
      sourcePaths,
    });
    const baselineCommit = await runGit(createdWorkspacePath, ["rev-parse", "--verify", "HEAD"]);
    const status = await runGit(createdWorkspacePath, ["status", "--porcelain=v1", "--untracked-files=all"]);
    if (status.length > 0) {
      throw new AstroWorkspacePreparationError(
        "git_operation_failed",
        "Astro proof workspace baseline is not clean after the baseline commit.",
      );
    }

    const devCommand = astroStaticSiteAdapterDescriptor.devCommand;
    const buildCommand = astroStaticSiteAdapterDescriptor.buildCommand;
    if (!devCommand || !buildCommand) {
      throw new AstroWorkspacePreparationError(
        "source_readback_mismatch",
        "Astro adapter command metadata is incomplete.",
      );
    }

    return {
      adapterId: "astro-static-site",
      workspacePath: createdWorkspacePath,
      baselineCommit,
      sourceSnapshot,
      snapshotInclusionRules: [
        "Only files emitted by createAstroStaticSiteProjectManifest are included.",
        "Files are read back from disk and ordered by their validated manifest paths.",
        "The aggregate hashes framed path bytes and exact file bytes; .git and proof metadata are excluded.",
      ],
      futureStepMetadata: {
        previewPort: ASTRO_STATIC_SITE_PREVIEW_PORT,
        devCommand: { ...devCommand },
        buildCommand: { ...buildCommand },
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
  } catch (error) {
    if (createdWorkspacePath) {
      try {
        await rm(createdWorkspacePath, { recursive: true, force: true });
      } catch (cleanupError) {
        throw new AstroWorkspacePreparationError(
          "cleanup_failed",
          `Astro workspace preparation failed and cleanup also failed for ${createdWorkspacePath}.`,
          { cause: new AggregateError([error, cleanupError]) },
        );
      }
    }
    throw error;
  }
}

export function validateAstroStaticSiteManifestPaths(manifest: Gnr8OutputAdapterFileManifest): string[] {
  const paths: string[] = [];
  const canonicalPaths = new Map<string, string>();

  for (const file of manifest.files) {
    const path = file.path;
    if (
      path.length === 0 ||
      path.includes("\0") ||
      path.includes("\\") ||
      isAbsolute(path) ||
      win32.isAbsolute(path)
    ) {
      throw new AstroWorkspacePreparationError("invalid_manifest_path", `Invalid Astro manifest path: ${JSON.stringify(path)}.`);
    }

    const segments = path.split("/");
    if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
      throw new AstroWorkspacePreparationError("invalid_manifest_path", `Invalid Astro manifest path: ${JSON.stringify(path)}.`);
    }
    if (segments.some((segment) => segment.toLowerCase() === ".git")) {
      throw new AstroWorkspacePreparationError("reserved_git_path", `Reserved .git manifest path: ${JSON.stringify(path)}.`);
    }

    const canonicalPath = path.normalize("NFC").toLowerCase();
    const existing = canonicalPaths.get(canonicalPath);
    if (existing) {
      throw new AstroWorkspacePreparationError(
        "duplicate_manifest_path",
        `Duplicate Astro manifest paths: ${JSON.stringify(existing)} and ${JSON.stringify(path)}.`,
      );
    }
    canonicalPaths.set(canonicalPath, path);
    paths.push(path);
  }

  const ordered = paths.sort();
  for (const path of ordered) {
    const segments = path.normalize("NFC").toLowerCase().split("/");
    for (let length = 1; length < segments.length; length += 1) {
      const prefix = segments.slice(0, length).join("/");
      const collision = canonicalPaths.get(prefix);
      if (collision) {
        throw new AstroWorkspacePreparationError(
          "manifest_path_collision",
          `Astro manifest path is both a file and directory: ${JSON.stringify(collision)}.`,
        );
      }
    }
  }

  return ordered;
}

export async function readAstroStaticSiteSourceSnapshot(input: {
  workspacePath: string;
  sourcePaths: string[];
}): Promise<AstroSourceSnapshot> {
  const sourcePaths = validateAstroStaticSiteManifestPaths({
    files: input.sourcePaths.map((path) => ({ path, role: "source", contents: "" })),
  });
  const workspacePath = resolve(input.workspacePath);
  const workspaceRealPath = await realpath(workspacePath).catch((error: unknown) => {
    throw new AstroWorkspacePreparationError("workspace_boundary_invalid", `Workspace cannot be resolved: ${workspacePath}.`, {
      cause: error,
    });
  });
  if (workspacePath !== workspaceRealPath) {
    throw new AstroWorkspacePreparationError("workspace_boundary_invalid", "Workspace path resolves through a symlink.");
  }

  const files: AstroSourceSnapshotFile[] = [];
  const aggregate = createHash("sha256").update(`${SOURCE_SNAPSHOT_VERSION}\0`, "utf8");
  for (const path of sourcePaths) {
    const filePath = join(workspacePath, ...path.split("/"));
    await assertSafeSourceFile(filePath, workspacePath, path);
    const body = await readFile(filePath);
    const pathBytes = Buffer.from(path, "utf8");
    const pathLength = Buffer.allocUnsafe(4);
    pathLength.writeUInt32BE(pathBytes.byteLength);
    const bodyLength = Buffer.allocUnsafe(8);
    bodyLength.writeBigUInt64BE(BigInt(body.byteLength));
    aggregate.update(pathLength).update(pathBytes).update(bodyLength).update(body);
    files.push({
      path,
      bytes: body.byteLength,
      sha256: createHash("sha256").update(body).digest("hex"),
    });
  }

  return {
    version: SOURCE_SNAPSHOT_VERSION,
    files,
    aggregateSha256: aggregate.digest("hex"),
  };
}

async function createFreshWorkspace(input: PrepareAstroStaticSiteWorkspaceInput): Promise<string> {
  if (input.workspacePath) {
    const workspacePath = resolve(input.workspacePath);
    await assertCanonicalDirectory(dirname(workspacePath));
    const existing = await lstat(workspacePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (existing) {
      throw new AstroWorkspacePreparationError("workspace_already_exists", `Workspace already exists: ${workspacePath}.`);
    }
    try {
      await mkdir(workspacePath, { recursive: false, mode: 0o700 });
      return workspacePath;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new AstroWorkspacePreparationError("workspace_already_exists", `Workspace already exists: ${workspacePath}.`, {
          cause: error,
        });
      }
      throw new AstroWorkspacePreparationError("workspace_creation_failed", `Unable to create workspace: ${workspacePath}.`, {
        cause: error,
      });
    }
  }

  const workspaceRoot = input.workspaceRoot ? resolve(input.workspaceRoot) : await realpath(tmpdir());
  await assertCanonicalDirectory(workspaceRoot);
  try {
    return await mkdtemp(join(workspaceRoot, DEFAULT_WORKSPACE_PREFIX));
  } catch (error) {
    throw new AstroWorkspacePreparationError(
      "workspace_creation_failed",
      `Unable to create a fresh Astro workspace under ${workspaceRoot}.`,
      { cause: error },
    );
  }
}

async function assertCanonicalDirectory(path: string): Promise<void> {
  const resolvedPath = resolve(path);
  const pathStat = await lstat(resolvedPath).catch((error: unknown) => {
    throw new AstroWorkspacePreparationError("workspace_boundary_invalid", `Workspace parent is unavailable: ${resolvedPath}.`, {
      cause: error,
    });
  });
  const realPath = await realpath(resolvedPath).catch((error: unknown) => {
    throw new AstroWorkspacePreparationError("workspace_boundary_invalid", `Workspace parent cannot be resolved: ${resolvedPath}.`, {
      cause: error,
    });
  });
  if (!pathStat.isDirectory() || pathStat.isSymbolicLink() || realPath !== resolvedPath) {
    throw new AstroWorkspacePreparationError(
      "workspace_boundary_invalid",
      `Workspace parent must be a canonical directory without symlink redirection: ${resolvedPath}.`,
    );
  }
}

async function materializeManifest(
  workspacePath: string,
  manifest: Gnr8OutputAdapterFileManifest,
  sourcePaths: string[],
): Promise<void> {
  const byPath = new Map(manifest.files.map((file) => [file.path, file]));
  const directoryPaths = Array.from(
    new Set(
      sourcePaths.flatMap((path) => {
        const segments = path.split("/").slice(0, -1);
        return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
      }),
    ),
  ).sort((left, right) => left.split("/").length - right.split("/").length || left.localeCompare(right));

  for (const directoryPath of directoryPaths) {
    const fullPath = join(workspacePath, ...directoryPath.split("/"));
    await assertPathWithinWorkspace(dirname(fullPath), workspacePath);
    await mkdir(fullPath, { recursive: false, mode: 0o700 });
  }

  for (const path of sourcePaths) {
    const file = byPath.get(path);
    if (!file) {
      throw new AstroWorkspacePreparationError("source_readback_mismatch", `Manifest entry disappeared before writing: ${path}.`);
    }
    const filePath = join(workspacePath, ...path.split("/"));
    await assertPathWithinWorkspace(dirname(filePath), workspacePath);
    const handle = await open(
      filePath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600,
    ).catch((error: unknown) => {
      throw new AstroWorkspacePreparationError("source_boundary_invalid", `Unable to create source file safely: ${path}.`, {
        cause: error,
      });
    });
    try {
      await handle.writeFile(Buffer.from(file.contents, "utf8"));
    } finally {
      await handle.close();
    }
  }

  for (const path of sourcePaths) {
    const expected = Buffer.from(byPath.get(path)?.contents ?? "", "utf8");
    const filePath = join(workspacePath, ...path.split("/"));
    await assertSafeSourceFile(filePath, workspacePath, path);
    const actual = await readFile(filePath);
    if (!actual.equals(expected)) {
      throw new AstroWorkspacePreparationError("source_readback_mismatch", `Source readback differs from manifest: ${path}.`);
    }
  }
}

async function assertSafeSourceFile(filePath: string, workspacePath: string, relativePath: string): Promise<void> {
  await assertPathWithinWorkspace(dirname(filePath), workspacePath);
  const fileStat = await lstat(filePath).catch((error: unknown) => {
    throw new AstroWorkspacePreparationError("source_readback_mismatch", `Source file is unavailable: ${relativePath}.`, {
      cause: error,
    });
  });
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    throw new AstroWorkspacePreparationError("source_boundary_invalid", `Source path is not a regular file: ${relativePath}.`);
  }
  const realFilePath = await realpath(filePath);
  if (!isInsideOrEqual(workspacePath, realFilePath)) {
    throw new AstroWorkspacePreparationError("source_boundary_invalid", `Source file escapes workspace: ${relativePath}.`);
  }
}

async function assertPathWithinWorkspace(path: string, workspacePath: string): Promise<void> {
  const realPath = await realpath(path).catch((error: unknown) => {
    throw new AstroWorkspacePreparationError("source_boundary_invalid", `Source parent cannot be resolved: ${path}.`, {
      cause: error,
    });
  });
  if (!isInsideOrEqual(workspacePath, realPath)) {
    throw new AstroWorkspacePreparationError("source_boundary_invalid", `Source parent escapes workspace: ${path}.`);
  }
}

function isInsideOrEqual(root: string, candidate: string): boolean {
  const relativePath = relative(resolve(root), resolve(candidate));
  return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !isAbsolute(relativePath));
}

async function initializeGitBaseline(workspacePath: string, sourcePaths: string[]): Promise<void> {
  await runGit(workspacePath, ["init", "--initial-branch=main"]);
  await runGit(workspacePath, ["config", "--local", "user.name", "GNR8 Astro Workspace Proof"]);
  await runGit(workspacePath, ["config", "--local", "user.email", "astro-workspace-proof@gnr8.local"]);
  await runGit(workspacePath, ["config", "--local", "core.hooksPath", devNull]);
  await runGit(workspacePath, ["config", "--local", "commit.gpgSign", "false"]);
  await runGit(workspacePath, ["config", "--local", "tag.gpgSign", "false"]);
  await runGit(workspacePath, ["add", "--", ...sourcePaths]);
  await runGit(workspacePath, ["commit", "--no-verify", "--no-gpg-sign", "-m", "GNR8 Astro source baseline"]);
}

async function runGit(workspacePath: string, args: string[]): Promise<string> {
  try {
    const result = await execFileAsync("git", args, {
      cwd: workspacePath,
      env: isolatedGitEnvironment(workspacePath),
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    return result.stdout.trim();
  } catch (error) {
    const detail = gitErrorDetail(error);
    throw new AstroWorkspacePreparationError(
      "git_operation_failed",
      `Git ${args[0] ?? "operation"} failed in the disposable Astro workspace${detail ? `: ${detail}` : "."}`,
      { cause: error },
    );
  }
}

function isolatedGitEnvironment(workspacePath: string): NodeJS.ProcessEnv {
  const environment = { ...process.env };
  for (const key of Object.keys(environment)) {
    if (key.toUpperCase().startsWith("GIT_")) delete environment[key];
  }
  return {
    ...environment,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: devNull,
    GIT_TERMINAL_PROMPT: "0",
    GIT_DISCOVERY_ACROSS_FILESYSTEM: "0",
    GIT_CEILING_DIRECTORIES: dirname(workspacePath),
    GIT_CONFIG_COUNT: "2",
    GIT_CONFIG_KEY_0: "core.hooksPath",
    GIT_CONFIG_VALUE_0: devNull,
    GIT_CONFIG_KEY_1: "commit.gpgSign",
    GIT_CONFIG_VALUE_1: "false",
  };
}

function gitErrorDetail(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr.trim() : "";
  const message = "message" in error && typeof error.message === "string" ? error.message.trim() : "";
  return (stderr || message).split("\n")[0].slice(0, 300);
}
