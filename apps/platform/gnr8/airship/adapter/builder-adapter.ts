import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";

export type BuilderAdapterCapabilities = {
  supportsSidecarSession: boolean;
  supportsStaticHtmlTarget: boolean;
  supportsFileDiffCapture: boolean;
  supportsDirectReactEmbed: boolean;
  requiresLocalProcess: boolean;
  requiresSourceBackedWorkspace: boolean;
  productionReady: boolean;
};

export type BuilderSessionTarget = {
  type: "static-html-localhost";
  host?: string;
  targetPort: number;
  sessionPort?: number;
  mode?: "canvas";
};

export type BuilderSessionInput = {
  sessionId: string;
  workspaceDir: string;
  target: BuilderSessionTarget;
  baselinePaths?: string[];
  writeProofMetadata?: boolean;
};

export type BuilderCommandDescriptor = {
  executable: "pnpm";
  args: string[];
  cwd: string;
  expectedSessionUrl: string;
  manualOnly: true;
  launchesProcess: false;
  description: string;
};

export type BuilderWorkspaceContract = {
  requiredFiles: string[];
  requiresGitRepository: boolean;
  targetCanBeServedLocally: boolean;
  expectedMutationModel: "local-source-files";
  primaryCaptureFiles: string[];
  futureMapping: string;
};

export type BuilderFileHash = {
  path: string;
  sha256: string;
  bytes: number;
  snapshot: string | null;
};

export type BuilderSession = {
  adapterId: string;
  sessionId: string;
  workspaceDir: string;
  target: Required<Pick<BuilderSessionTarget, "host" | "sessionPort" | "mode">> & BuilderSessionTarget;
  command: BuilderCommandDescriptor;
  baselineHashes: BuilderFileHash[];
  metadataPath: string | null;
  workspaceContract: BuilderWorkspaceContract;
};

export type BuilderSessionStartResult = {
  status: "descriptor_ready";
  session: BuilderSession;
  command: BuilderCommandDescriptor;
  launched: false;
  notes: string[];
};

export type BuilderCapturedFile = {
  path: string;
  status: "added" | "modified" | "deleted";
  beforeSha256: string | null;
  afterSha256: string | null;
  beforeBytes: number | null;
  afterBytes: number | null;
  snapshot: string | null;
  unifiedDiff: string | null;
};

export type BuilderSessionCaptureResult = {
  status: "captured";
  sessionId: string;
  workspaceDir: string;
  changedFiles: BuilderCapturedFile[];
  currentHashes: BuilderFileHash[];
  indexHtmlChanged: boolean;
  notes: string[];
};

export type BuilderSessionCleanupResult = {
  status: "cleaned" | "skipped";
  sessionId: string;
  removedMetadataPath: string | null;
  notes: string[];
};

export interface BuilderAdapter {
  readonly id: string;
  readonly name: string;
  getCapabilities(): BuilderAdapterCapabilities;
  prepareSession(input: BuilderSessionInput): Promise<BuilderSessionStartResult>;
  startSession(input: BuilderSessionInput): Promise<BuilderSessionStartResult>;
  captureSession(session: BuilderSession): Promise<BuilderSessionCaptureResult>;
  cleanupSession(session: BuilderSession): Promise<BuilderSessionCleanupResult>;
}

const ADAPTER_ID = "airship-sidecar-builder-adapter";
const METADATA_FILENAME = ".gnr8-airship-builder-session.json";
const TEXT_SNAPSHOT_LIMIT_BYTES = 256 * 1024;

export const AIRSHIP_SIDECAR_BUILDER_CAPABILITIES: BuilderAdapterCapabilities = {
  supportsSidecarSession: true,
  supportsStaticHtmlTarget: true,
  supportsFileDiffCapture: true,
  supportsDirectReactEmbed: false,
  requiresLocalProcess: true,
  requiresSourceBackedWorkspace: true,
  productionReady: false,
};

export const AIRSHIP_SOURCE_BACKED_WORKSPACE_CONTRACT: BuilderWorkspaceContract = {
  requiredFiles: ["index.html", "package.json"],
  requiresGitRepository: true,
  targetCanBeServedLocally: true,
  expectedMutationModel: "local-source-files",
  primaryCaptureFiles: ["index.html"],
  futureMapping: "HTML diffs can later be normalized into GNR8 draft edits or candidate artifacts after review.",
};

export class AirshipSidecarBuilderAdapter implements BuilderAdapter {
  readonly id = ADAPTER_ID;
  readonly name = "Airship sidecar builder adapter";

  getCapabilities(): BuilderAdapterCapabilities {
    return { ...AIRSHIP_SIDECAR_BUILDER_CAPABILITIES };
  }

  async prepareSession(input: BuilderSessionInput): Promise<BuilderSessionStartResult> {
    const workspaceDir = resolve(input.workspaceDir);
    await assertSourceBackedWorkspace(workspaceDir);

    const target = normalizeTarget(input.target);
    const baselineHashes = await computeWorkspaceFileHashes(workspaceDir, input.baselinePaths);
    const command = buildAirshipCommandDescriptor({ workspaceDir, target });
    const metadataPath = input.writeProofMetadata === false ? null : join(workspaceDir, METADATA_FILENAME);

    const session: BuilderSession = {
      adapterId: this.id,
      sessionId: input.sessionId,
      workspaceDir,
      target,
      command,
      baselineHashes,
      metadataPath,
      workspaceContract: AIRSHIP_SOURCE_BACKED_WORKSPACE_CONTRACT,
    };

    if (metadataPath) {
      await mkdir(dirname(metadataPath), { recursive: true });
      await writeFile(
        metadataPath,
        `${JSON.stringify(
          {
            adapterId: this.id,
            sessionId: input.sessionId,
            proofOnly: true,
            productionReady: false,
            command,
            workspaceContract: AIRSHIP_SOURCE_BACKED_WORKSPACE_CONTRACT,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
    }

    return {
      status: "descriptor_ready",
      session,
      command,
      launched: false,
      notes: [
        "Prepared an Airship sidecar descriptor only; this adapter skeleton never launches the CLI.",
        "Workspace contract requires source-backed index.html and package.json files.",
      ],
    };
  }

  async startSession(input: BuilderSessionInput): Promise<BuilderSessionStartResult> {
    return this.prepareSession(input);
  }

  async captureSession(session: BuilderSession): Promise<BuilderSessionCaptureResult> {
    const currentHashes = await computeWorkspaceFileHashes(session.workspaceDir);
    const changedFiles = await compareWorkspaceHashes({
      workspaceDir: session.workspaceDir,
      before: session.baselineHashes,
      after: currentHashes,
    });

    return {
      status: "captured",
      sessionId: session.sessionId,
      workspaceDir: session.workspaceDir,
      changedFiles,
      currentHashes,
      indexHtmlChanged: changedFiles.some((file) => file.path === "index.html"),
      notes: [
        "Capture compares local workspace files only.",
        "Future production mapping should review HTML diffs before mutating GNR8 drafts or artifacts.",
      ],
    };
  }

  async cleanupSession(session: BuilderSession): Promise<BuilderSessionCleanupResult> {
    if (!session.metadataPath) {
      return {
        status: "skipped",
        sessionId: session.sessionId,
        removedMetadataPath: null,
        notes: ["No proof metadata path was recorded for this session."],
      };
    }

    const metadataPath = resolve(session.metadataPath);
    const workspaceDir = resolve(session.workspaceDir);
    if (!isPathInsideWorkspace(metadataPath, workspaceDir) || basename(metadataPath) !== METADATA_FILENAME) {
      return {
        status: "skipped",
        sessionId: session.sessionId,
        removedMetadataPath: null,
        notes: ["Metadata cleanup skipped because the path is outside the expected proof metadata boundary."],
      };
    }

    await rm(metadataPath, { force: true });
    return {
      status: "cleaned",
      sessionId: session.sessionId,
      removedMetadataPath: metadataPath,
      notes: ["Removed local proof metadata only; workspace source files were left intact."],
    };
  }
}

export function buildAirshipCommandDescriptor(input: {
  workspaceDir: string;
  target: BuilderSession["target"];
}): BuilderCommandDescriptor {
  const host = input.target.host;
  const targetPort = String(input.target.targetPort);
  const sessionPort = String(input.target.sessionPort);
  return {
    executable: "pnpm",
    args: [
      "dlx",
      "@airshiplabs/cli",
      "--target",
      targetPort,
      "--port",
      sessionPort,
      "--host",
      host,
      "--agent",
      "codex",
      "--safe",
      "--cwd",
      input.workspaceDir,
      "--mode",
      input.target.mode,
    ],
    cwd: input.workspaceDir,
    expectedSessionUrl: `http://${host}:${sessionPort}/`,
    manualOnly: true,
    launchesProcess: false,
    description: "Manual Airship CLI sidecar command descriptor for a source-backed static HTML workspace.",
  };
}

export async function computeWorkspaceFileHashes(workspaceDir: string, relativePaths?: string[]): Promise<BuilderFileHash[]> {
  const resolvedWorkspace = resolve(workspaceDir);
  const paths = relativePaths ? sanitizeRelativePaths(relativePaths) : await listWorkspaceFiles(resolvedWorkspace);
  const hashes: BuilderFileHash[] = [];

  for (const path of paths) {
    const filePath = join(resolvedWorkspace, path);
    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat?.isFile()) continue;
    const body = await readFile(filePath);
    hashes.push({
      path,
      sha256: createHash("sha256").update(body).digest("hex"),
      bytes: body.byteLength,
      snapshot: toTextSnapshot(body),
    });
  }

  return hashes.sort((left, right) => left.path.localeCompare(right.path));
}

async function assertSourceBackedWorkspace(workspaceDir: string): Promise<void> {
  for (const requiredFile of AIRSHIP_SOURCE_BACKED_WORKSPACE_CONTRACT.requiredFiles) {
    const fileStat = await stat(join(workspaceDir, requiredFile)).catch(() => null);
    if (!fileStat?.isFile()) {
      throw new Error(`Airship source-backed workspace is missing ${requiredFile}`);
    }
  }
  if (AIRSHIP_SOURCE_BACKED_WORKSPACE_CONTRACT.requiresGitRepository) {
    const gitStat = await stat(join(workspaceDir, ".git")).catch(() => null);
    if (!gitStat?.isDirectory()) {
      throw new Error("Airship source-backed workspace is missing .git");
    }
  }
}

function normalizeTarget(target: BuilderSessionTarget): BuilderSession["target"] {
  assertPort(target.targetPort, "targetPort");
  const sessionPort = target.sessionPort ?? deriveSessionPort(target.targetPort);
  assertPort(sessionPort, "sessionPort");
  return {
    ...target,
    host: target.host ?? "127.0.0.1",
    sessionPort,
    mode: target.mode ?? "canvas",
  };
}

function deriveSessionPort(targetPort: number): number {
  return targetPort < 65535 ? targetPort + 1 : targetPort - 1;
}

function assertPort(port: number, label: string): void {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${label} must be an integer from 1 to 65535`);
  }
}

async function compareWorkspaceHashes(input: {
  workspaceDir: string;
  before: BuilderFileHash[];
  after: BuilderFileHash[];
}): Promise<BuilderCapturedFile[]> {
  const beforeByPath = new Map(input.before.map((file) => [file.path, file]));
  const afterByPath = new Map(input.after.map((file) => [file.path, file]));
  const allPaths = Array.from(new Set([...beforeByPath.keys(), ...afterByPath.keys()])).sort();
  const changedFiles: BuilderCapturedFile[] = [];

  for (const path of allPaths) {
    const before = beforeByPath.get(path) ?? null;
    const after = afterByPath.get(path) ?? null;
    if (before?.sha256 === after?.sha256) continue;

    const status = before && after ? "modified" : before ? "deleted" : "added";
    const beforeText = before?.snapshot ?? null;
    const afterText = after?.snapshot ?? null;

    changedFiles.push({
      path,
      status,
      beforeSha256: before?.sha256 ?? null,
      afterSha256: after?.sha256 ?? null,
      beforeBytes: before?.bytes ?? null,
      afterBytes: after?.bytes ?? null,
      snapshot: afterText,
      unifiedDiff: beforeText !== null || afterText !== null ? buildUnifiedTextDiff(path, beforeText, afterText) : null,
    });
  }

  return changedFiles;
}

function buildUnifiedTextDiff(path: string, before: string | null, after: string | null): string {
  const beforeLines = before?.split("\n") ?? [];
  const afterLines = after?.split("\n") ?? [];
  if (before === null) {
    return [`--- /dev/null`, `+++ b/${path}`, ...afterLines.map((line) => `+${line}`)].join("\n");
  }
  if (after === null) {
    return [`--- a/${path}`, `+++ /dev/null`, ...beforeLines.map((line) => `-${line}`)].join("\n");
  }
  return [`--- a/${path}`, `+++ b/${path}`, ...buildChangedLinePreview(beforeLines, afterLines)].join("\n");
}

function toTextSnapshot(buffer: Buffer): string | null {
  if (buffer.byteLength > TEXT_SNAPSHOT_LIMIT_BYTES || buffer.includes(0)) return null;
  return buffer.toString("utf8");
}

function buildChangedLinePreview(beforeLines: string[], afterLines: string[]): string[] {
  const maxLength = Math.max(beforeLines.length, afterLines.length);
  const lines: string[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const beforeLine = beforeLines[index];
    const afterLine = afterLines[index];
    if (beforeLine === afterLine) continue;
    if (beforeLine !== undefined) lines.push(`-${beforeLine}`);
    if (afterLine !== undefined) lines.push(`+${afterLine}`);
  }

  return lines;
}

async function listWorkspaceFiles(workspaceDir: string): Promise<string[]> {
  const files: string[] = [];

  async function visit(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (shouldSkipEntry(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
        continue;
      }
      if (entry.isFile()) {
        files.push(relative(workspaceDir, fullPath).split(sep).join("/"));
      }
    }
  }

  await visit(workspaceDir);
  return files.sort();
}

function shouldSkipEntry(name: string): boolean {
  return name === ".git" || name === "node_modules" || name === ".next" || name === METADATA_FILENAME;
}

function sanitizeRelativePaths(paths: string[]): string[] {
  return paths.map((path) => path.split("\\").join("/")).filter((path) => path.length > 0 && !path.startsWith("/") && !path.includes(".."));
}

function isPathInsideWorkspace(path: string, workspaceDir: string): boolean {
  const relativePath = relative(workspaceDir, path);
  return relativePath.length > 0 && !relativePath.startsWith("..") && !relativePath.startsWith(sep);
}
