import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath, rm } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { isAbsolute, join, posix, relative, resolve, sep } from "node:path";

import type { NormalizedStaticBusinessSiteContent } from "./astro-static-site-adapter";
import { astroDevServerSmokeProofFixture } from "./astro-static-site-dev-server-smoke-proof";
import {
  prepareAstroStaticSiteWorkspace,
  readAstroStaticSiteSourceSnapshot,
  type AstroSourceSnapshot,
  type PreparedAstroStaticSiteWorkspace,
} from "./astro-static-site-workspace-preparation";

export const ASTRO_BUILD_EXPORT_PROOF_VERSION = "gnr8-astro-build-export-proof:v1" as const;
export const ASTRO_STATIC_EXPORT_MANIFEST_VERSION = "gnr8-astro-static-export:v1" as const;
export const ASTRO_BUILD_EXPORT_HOST = "127.0.0.1" as const;

const DEFAULT_INSTALL_TIMEOUT_MS = 180_000;
const DEFAULT_BUILD_TIMEOUT_MS = 120_000;
const DEFAULT_REQUEST_TIMEOUT_MS = 5_000;
const MAX_COMMAND_OUTPUT_BYTES = 24_000;

export type AstroBuildExportProofErrorCode =
  | "command_failed"
  | "install_failed"
  | "install_timeout"
  | "build_failed"
  | "build_timeout"
  | "dist_missing"
  | "index_missing"
  | "index_empty"
  | "export_boundary_invalid"
  | "export_symlink"
  | "export_file_invalid"
  | "page_verification_failed"
  | "asset_missing"
  | "stylesheet_verification_failed"
  | "source_dependency_detected"
  | "request_failed"
  | "source_changed"
  | "cleanup_failed"
  | "interrupted";

export interface AstroStaticExportFile {
  path: string;
  bytes: number;
  sha256: string;
}

export interface AstroStaticExportManifest {
  version: typeof ASTRO_STATIC_EXPORT_MANIFEST_VERSION;
  files: AstroStaticExportFile[];
  totalBytes: number;
  aggregateSha256: string;
}

export interface AstroStaticExportReference {
  sourcePath: string;
  reference: string;
  resolvedPath: string;
  kind: "stylesheet" | "asset";
}

export interface InspectedAstroStaticExport {
  distPath: string;
  manifest: AstroStaticExportManifest;
  indexHtml: string;
  stylesheetPaths: string[];
  references: AstroStaticExportReference[];
  verifiedContent: string[];
  verifiedThemeToken: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export interface AstroStaticServerHandle {
  host: typeof ASTRO_BUILD_EXPORT_HOST;
  port: number;
  url: string;
  close(): Promise<void>;
}

export interface AstroBuildExportProofEvidence {
  proofVersion: typeof ASTRO_BUILD_EXPORT_PROOF_VERSION;
  proofOnly: true;
  timingsMs: {
    total: number;
    prepare: number;
    install: number;
    build: number;
    exportValidation: number;
    httpVerification: number;
    cleanup: number;
  };
  versions: { node: string; pnpm: string; astro: string };
  workspace: {
    path: string | null;
    baselineCommit: string | null;
    dependencyGeneratedFiles: string[];
    buildGeneratedFiles: string[];
    removed: boolean;
  };
  installation: { completed: boolean; command: string };
  build: { completed: boolean; command: string; stdout: string; stderr: string };
  export: {
    distPath: string | null;
    indexHtmlBytes: number | null;
    fileCount: number;
    totalBytes: number;
    aggregateSha256: string | null;
    files: AstroStaticExportFile[];
    references: AstroStaticExportReference[];
    stylesheetPaths: string[];
    verifiedContent: string[];
    verifiedThemeToken: string | null;
  };
  server: { started: boolean; host: typeof ASTRO_BUILD_EXPORT_HOST; port: number | null; url: string | null; stopped: boolean };
  http: {
    pageStatus: number | null;
    pageContentType: string | null;
    stylesheetUrl: string | null;
    stylesheetStatus: number | null;
    stylesheetContentType: string | null;
    verifiedThemeToken: string | null;
  };
  sourceComparison: {
    baselineAggregateSha256: string | null;
    finalAggregateSha256: string | null;
    unchanged: boolean;
  };
  cleanup: { completed: boolean; errors: string[] };
}

export class AstroStaticExportValidationError extends Error {
  readonly code: AstroBuildExportProofErrorCode;

  constructor(code: AstroBuildExportProofErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AstroStaticExportValidationError";
    this.code = code;
  }
}

export class AstroBuildExportProofError extends Error {
  readonly code: AstroBuildExportProofErrorCode;
  readonly evidence: AstroBuildExportProofEvidence;

  constructor(
    code: AstroBuildExportProofErrorCode,
    message: string,
    evidence: AstroBuildExportProofEvidence,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AstroBuildExportProofError";
    this.code = code;
    this.evidence = evidence;
  }
}

export interface AstroBuildExportProofDependencies {
  prepareWorkspace(input: {
    content: NormalizedStaticBusinessSiteContent;
    workspaceRoot?: string;
  }): Promise<PreparedAstroStaticSiteWorkspace>;
  runCommand(
    executable: string,
    args: string[],
    options: { cwd: string; timeoutMs: number; signal?: AbortSignal; env?: NodeJS.ProcessEnv },
  ): Promise<CommandResult>;
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  inspectExport(workspacePath: string): Promise<InspectedAstroStaticExport>;
  startStaticServer(inspected: InspectedAstroStaticExport): Promise<AstroStaticServerHandle>;
  fetch: typeof fetch;
  readSourceSnapshot(input: { workspacePath: string; sourcePaths: string[] }): Promise<AstroSourceSnapshot>;
  removeWorkspace(path: string): Promise<void>;
  now(): number;
}

export interface RunAstroBuildExportProofInput {
  workspaceRoot?: string;
  signal?: AbortSignal;
  installTimeoutMs?: number;
  buildTimeoutMs?: number;
  dependencies?: Partial<AstroBuildExportProofDependencies>;
}

export async function runAstroBuildExportProof(
  input: RunAstroBuildExportProofInput = {},
): Promise<AstroBuildExportProofEvidence> {
  const dependencies = { ...defaultDependencies(), ...input.dependencies };
  const evidence = createAstroBuildExportProofEvidence();
  const startedAt = dependencies.now();
  let prepared: PreparedAstroStaticSiteWorkspace | null = null;
  let server: AstroStaticServerHandle | null = null;
  let failure: unknown = null;

  try {
    throwIfAborted(input.signal, evidence);
    const prepareStartedAt = dependencies.now();
    prepared = await dependencies.prepareWorkspace({
      content: astroDevServerSmokeProofFixture(),
      workspaceRoot: input.workspaceRoot,
    });
    evidence.timingsMs.prepare = elapsed(dependencies.now(), prepareStartedAt);
    evidence.workspace.path = prepared.workspacePath;
    evidence.workspace.baselineCommit = prepared.baselineCommit;
    evidence.sourceComparison.baselineAggregateSha256 = prepared.sourceSnapshot.aggregateSha256;

    const installStartedAt = dependencies.now();
    try {
      await dependencies.runCommand(
        "pnpm",
        ["install", "--ignore-workspace", "--no-frozen-lockfile", "--store-dir", ".pnpm-store"],
        {
          cwd: prepared.workspacePath,
          timeoutMs: input.installTimeoutMs ?? DEFAULT_INSTALL_TIMEOUT_MS,
          signal: input.signal,
          env: proofEnvironment(),
        },
      );
    } catch (error) {
      if (input.signal?.aborted) {
        throw proofError("interrupted", "Astro build-export proof was interrupted during dependency installation.", evidence, error);
      }
      const code = isTimeoutError(error) ? "install_timeout" : "install_failed";
      throw proofError(code, `Astro dependency installation failed: ${messageFor(error)}`, evidence, error);
    }
    evidence.installation.completed = true;
    evidence.timingsMs.install = elapsed(dependencies.now(), installStartedAt);
    evidence.workspace.dependencyGeneratedFiles = await gitStatusPaths(dependencies, prepared.workspacePath, input.signal);

    const [pnpmVersion, astroPackageJson] = await Promise.all([
      dependencies.runCommand("pnpm", ["--version"], {
        cwd: prepared.workspacePath,
        timeoutMs: 10_000,
        signal: input.signal,
      }),
      dependencies.readFile(join(prepared.workspacePath, "node_modules", "astro", "package.json"), "utf8"),
    ]);
    evidence.versions.pnpm = pnpmVersion.stdout.trim();
    evidence.versions.astro = readPackageVersion(astroPackageJson, "astro");

    throwIfAborted(input.signal, evidence);
    const buildStartedAt = dependencies.now();
    try {
      const result = await dependencies.runCommand("pnpm", ["build"], {
        cwd: prepared.workspacePath,
        timeoutMs: input.buildTimeoutMs ?? DEFAULT_BUILD_TIMEOUT_MS,
        signal: input.signal,
        env: proofEnvironment(),
      });
      evidence.build.stdout = bounded(result.stdout);
      evidence.build.stderr = bounded(result.stderr);
    } catch (error) {
      evidence.build.stdout = bounded(commandOutput(error, "stdout"));
      evidence.build.stderr = bounded(commandOutput(error, "stderr"));
      if (input.signal?.aborted) {
        throw proofError("interrupted", "Astro build-export proof was interrupted during the production build.", evidence, error);
      }
      const code = isTimeoutError(error) ? "build_timeout" : "build_failed";
      throw proofError(code, `Astro production build failed: ${messageFor(error)}`, evidence, error);
    }
    evidence.build.completed = true;
    evidence.timingsMs.build = elapsed(dependencies.now(), buildStartedAt);

    const generatedAfterBuild = await gitStatusPaths(dependencies, prepared.workspacePath, input.signal);
    const dependencyGenerated = new Set(evidence.workspace.dependencyGeneratedFiles);
    evidence.workspace.buildGeneratedFiles = generatedAfterBuild.filter((path) => !dependencyGenerated.has(path));

    throwIfAborted(input.signal, evidence);
    const exportStartedAt = dependencies.now();
    let inspected: InspectedAstroStaticExport;
    try {
      inspected = await dependencies.inspectExport(prepared.workspacePath);
    } catch (error) {
      if (error instanceof AstroStaticExportValidationError) {
        throw proofError(error.code, error.message, evidence, error);
      }
      throw error;
    }
    evidence.timingsMs.exportValidation = elapsed(dependencies.now(), exportStartedAt);
    evidence.export.distPath = inspected.distPath;
    evidence.export.indexHtmlBytes = inspected.manifest.files.find((file) => file.path === "index.html")?.bytes ?? null;
    evidence.export.fileCount = inspected.manifest.files.length;
    evidence.export.totalBytes = inspected.manifest.totalBytes;
    evidence.export.aggregateSha256 = inspected.manifest.aggregateSha256;
    evidence.export.files = inspected.manifest.files;
    evidence.export.references = inspected.references;
    evidence.export.stylesheetPaths = inspected.stylesheetPaths;
    evidence.export.verifiedContent = inspected.verifiedContent;
    evidence.export.verifiedThemeToken = inspected.verifiedThemeToken;

    throwIfAborted(input.signal, evidence);
    server = await dependencies.startStaticServer(inspected);
    evidence.server.started = true;
    evidence.server.port = server.port;
    evidence.server.url = server.url;
    const httpStartedAt = dependencies.now();
    await verifyDistHttp(dependencies.fetch, server.url, inspected, evidence, input.signal);
    evidence.timingsMs.httpVerification = elapsed(dependencies.now(), httpStartedAt);

    const finalSnapshot = await dependencies.readSourceSnapshot({
      workspacePath: prepared.workspacePath,
      sourcePaths: prepared.sourceSnapshot.files.map((file) => file.path),
    });
    evidence.sourceComparison.finalAggregateSha256 = finalSnapshot.aggregateSha256;
    evidence.sourceComparison.unchanged = finalSnapshot.aggregateSha256 === prepared.sourceSnapshot.aggregateSha256;
    if (!evidence.sourceComparison.unchanged) {
      throw proofError("source_changed", "Generated Astro source changed during dependency installation or build.", evidence);
    }
  } catch (error) {
    failure = error;
  } finally {
    const cleanupStartedAt = dependencies.now();
    if (server) {
      try {
        await server.close();
        evidence.server.stopped = true;
      } catch (error) {
        evidence.cleanup.errors.push(`server:${messageFor(error)}`);
      }
    }
    if (prepared) {
      try {
        await dependencies.removeWorkspace(prepared.workspacePath);
        evidence.workspace.removed = true;
      } catch (error) {
        evidence.cleanup.errors.push(`workspace:${messageFor(error)}`);
      }
    }
    evidence.cleanup.completed =
      evidence.cleanup.errors.length === 0 && (!server || evidence.server.stopped) && (!prepared || evidence.workspace.removed);
    evidence.timingsMs.cleanup = elapsed(dependencies.now(), cleanupStartedAt);
    evidence.timingsMs.total = elapsed(dependencies.now(), startedAt);
  }

  if (evidence.cleanup.errors.length > 0) {
    throw proofError("cleanup_failed", `Astro build-export cleanup failed: ${evidence.cleanup.errors.join("; ")}`, evidence, failure);
  }
  if (failure) {
    if (failure instanceof AstroBuildExportProofError) throw failure;
    throw proofError("command_failed", messageFor(failure), evidence, failure);
  }
  return evidence;
}

export async function inspectAstroStaticExport(workspacePath: string): Promise<InspectedAstroStaticExport> {
  const canonicalWorkspace = await realpath(resolve(workspacePath)).catch((error: unknown) => {
    throw new AstroStaticExportValidationError("export_boundary_invalid", "Workspace cannot be resolved for export inspection.", {
      cause: error,
    });
  });
  if (canonicalWorkspace !== resolve(workspacePath)) {
    throw new AstroStaticExportValidationError("export_boundary_invalid", "Workspace resolves through a symlink.");
  }

  const distPath = join(canonicalWorkspace, "dist");
  const distStat = await lstat(distPath).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      throw new AstroStaticExportValidationError("dist_missing", "Astro build did not create dist.", { cause: error });
    }
    throw error;
  });
  if (!distStat.isDirectory() || distStat.isSymbolicLink()) {
    throw new AstroStaticExportValidationError("export_boundary_invalid", "Astro dist is not a regular directory.");
  }
  const canonicalDist = await realpath(distPath);
  if (canonicalDist !== distPath || !isInsideOrEqual(canonicalWorkspace, canonicalDist)) {
    throw new AstroStaticExportValidationError("export_boundary_invalid", "Astro dist escapes the prepared workspace.");
  }

  const files = await enumerateExportFiles(canonicalDist);
  const indexFile = files.find((file) => file.path === "index.html");
  if (!indexFile) {
    throw new AstroStaticExportValidationError("index_missing", "Astro dist does not contain index.html.");
  }
  if (indexFile.bytes === 0) {
    throw new AstroStaticExportValidationError("index_empty", "Astro dist/index.html is empty.");
  }

  const aggregate = createHash("sha256").update(`${ASTRO_STATIC_EXPORT_MANIFEST_VERSION}\0`, "utf8");
  let totalBytes = 0;
  for (const file of files) {
    const body = await readFile(join(canonicalDist, ...file.path.split("/")));
    const pathBytes = Buffer.from(file.path, "utf8");
    const pathLength = Buffer.allocUnsafe(4);
    pathLength.writeUInt32BE(pathBytes.byteLength);
    const bodyLength = Buffer.allocUnsafe(8);
    bodyLength.writeBigUInt64BE(BigInt(body.byteLength));
    aggregate.update(pathLength).update(pathBytes).update(bodyLength).update(body);
    totalBytes += body.byteLength;
  }
  const manifest: AstroStaticExportManifest = {
    version: ASTRO_STATIC_EXPORT_MANIFEST_VERSION,
    files,
    totalBytes,
    aggregateSha256: aggregate.digest("hex"),
  };

  const indexHtml = await readFile(join(canonicalDist, "index.html"), "utf8");
  assertNoSourceOrDevDependency(indexHtml, canonicalWorkspace, "index.html");
  const verifiedContent = verifyFixtureHtml(indexHtml);
  const filePaths = new Set(files.map((file) => file.path));
  const references = verifyHtmlReferences(indexHtml, filePaths);
  const stylesheetPaths = Array.from(
    new Set(references.filter((reference) => reference.kind === "stylesheet").map((reference) => reference.resolvedPath)),
  ).sort();
  if (stylesheetPaths.length === 0) {
    throw new AstroStaticExportValidationError("stylesheet_verification_failed", "Built HTML has no local stylesheet.");
  }

  const expectedThemeToken = "--gnr8-astro-accent: #0f766e;";
  for (const stylesheetPath of stylesheetPaths) {
    const stylesheet = await readFile(join(canonicalDist, ...stylesheetPath.split("/")), "utf8");
    assertNoSourceOrDevDependency(stylesheet, canonicalWorkspace, stylesheetPath);
    if (!themeTokenPattern().test(stylesheet)) {
      throw new AstroStaticExportValidationError(
        "stylesheet_verification_failed",
        `Built stylesheet is missing the expected theme token: ${stylesheetPath}.`,
      );
    }
    references.push(...verifyCssReferences(stylesheet, stylesheetPath, filePaths));
  }

  references.sort((left, right) =>
    left.sourcePath.localeCompare(right.sourcePath) || left.reference.localeCompare(right.reference),
  );
  return {
    distPath: canonicalDist,
    manifest,
    indexHtml,
    stylesheetPaths,
    references,
    verifiedContent,
    verifiedThemeToken: expectedThemeToken,
  };
}

export async function startAstroDistStaticServer(inspected: InspectedAstroStaticExport): Promise<AstroStaticServerHandle> {
  const allowedPaths = new Set(inspected.manifest.files.map((file) => file.path));
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { "content-type": "text/plain; charset=utf-8" }).end("Method not allowed");
        return;
      }
      const url = new URL(request.url ?? "/", "http://gnr8.invalid");
      const requestedPath = decodeURIComponent(url.pathname);
      const relativePath = requestedPath === "/" || requestedPath.endsWith("/")
        ? `${requestedPath.slice(1)}index.html`
        : requestedPath.slice(1);
      if (!isSafeRelativeExportPath(relativePath) || !allowedPaths.has(relativePath)) {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
        return;
      }
      const body = await readFile(join(inspected.distPath, ...relativePath.split("/")));
      response.writeHead(200, {
        "content-type": contentTypeFor(relativePath),
        "content-length": String(body.byteLength),
        "cache-control": "no-store",
      });
      response.end(request.method === "HEAD" ? undefined : body);
    } catch {
      response.writeHead(400, { "content-type": "text/plain; charset=utf-8" }).end("Bad request");
    }
  });

  await listen(server);
  const address = server.address();
  if (!address || typeof address === "string") {
    await closeServer(server);
    throw new Error("loopback_static_server_address_unavailable");
  }
  const url = `http://${ASTRO_BUILD_EXPORT_HOST}:${address.port}/`;
  return {
    host: ASTRO_BUILD_EXPORT_HOST,
    port: address.port,
    url,
    close: () => closeServer(server),
  };
}

export function createAstroBuildExportProofEvidence(): AstroBuildExportProofEvidence {
  return {
    proofVersion: ASTRO_BUILD_EXPORT_PROOF_VERSION,
    proofOnly: true,
    timingsMs: { total: 0, prepare: 0, install: 0, build: 0, exportValidation: 0, httpVerification: 0, cleanup: 0 },
    versions: { node: process.version, pnpm: "", astro: "" },
    workspace: {
      path: null,
      baselineCommit: null,
      dependencyGeneratedFiles: [],
      buildGeneratedFiles: [],
      removed: false,
    },
    installation: {
      completed: false,
      command: "pnpm install --ignore-workspace --no-frozen-lockfile --store-dir .pnpm-store",
    },
    build: { completed: false, command: "pnpm build", stdout: "", stderr: "" },
    export: {
      distPath: null,
      indexHtmlBytes: null,
      fileCount: 0,
      totalBytes: 0,
      aggregateSha256: null,
      files: [],
      references: [],
      stylesheetPaths: [],
      verifiedContent: [],
      verifiedThemeToken: null,
    },
    server: { started: false, host: ASTRO_BUILD_EXPORT_HOST, port: null, url: null, stopped: false },
    http: {
      pageStatus: null,
      pageContentType: null,
      stylesheetUrl: null,
      stylesheetStatus: null,
      stylesheetContentType: null,
      verifiedThemeToken: null,
    },
    sourceComparison: { baselineAggregateSha256: null, finalAggregateSha256: null, unchanged: false },
    cleanup: { completed: false, errors: [] },
  };
}

async function enumerateExportFiles(distPath: string): Promise<AstroStaticExportFile[]> {
  const files: AstroStaticExportFile[] = [];

  async function visit(directoryPath: string, prefix: string): Promise<void> {
    const entries = await readdir(directoryPath, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (!isSafeRelativeExportPath(relativePath)) {
        throw new AstroStaticExportValidationError("export_boundary_invalid", `Unsafe dist path: ${relativePath}.`);
      }
      const fullPath = join(directoryPath, entry.name);
      const stat = await lstat(fullPath);
      if (stat.isSymbolicLink() || entry.isSymbolicLink()) {
        throw new AstroStaticExportValidationError("export_symlink", `Symlink is not allowed in dist: ${relativePath}.`);
      }
      const canonicalPath = await realpath(fullPath);
      if (!isInsideOrEqual(distPath, canonicalPath)) {
        throw new AstroStaticExportValidationError("export_boundary_invalid", `Dist path escapes its root: ${relativePath}.`);
      }
      if (stat.isDirectory() && entry.isDirectory()) {
        await visit(fullPath, relativePath);
        continue;
      }
      if (!stat.isFile() || !entry.isFile()) {
        throw new AstroStaticExportValidationError("export_file_invalid", `Dist contains a non-regular file: ${relativePath}.`);
      }
      const body = await readFile(fullPath);
      files.push({
        path: relativePath,
        bytes: body.byteLength,
        sha256: createHash("sha256").update(body).digest("hex"),
      });
    }
  }

  await visit(distPath, "");
  files.sort((left, right) => left.path.localeCompare(right.path));
  return files;
}

function verifyFixtureHtml(html: string): string[] {
  const expectedContent = [
    "<title>Northline Operations Proof</title>",
    "Work that reads clearly",
    "Services",
    "Contact",
    "Practical operating support",
    "Talk with Northline",
    "hello@northline.example",
  ];
  const verified = expectedContent.filter((value) => html.includes(value));
  if (verified.length !== expectedContent.length) {
    throw new AstroStaticExportValidationError(
      "page_verification_failed",
      `Built index.html matched ${verified.length}/${expectedContent.length} expected fixture values.`,
    );
  }
  return verified;
}

function verifyHtmlReferences(html: string, filePaths: Set<string>): AstroStaticExportReference[] {
  const references: AstroStaticExportReference[] = [];
  const tags = html.match(/<(?:link|script|img|source|video|audio|object|embed|input)\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const isLink = /^<link\b/i.test(tag);
    const isStylesheet = isLink && /\brel=["'][^"']*stylesheet[^"']*["']/i.test(tag);
    const attributes = isLink ? ["href"] : ["src", "poster", "data"];
    for (const attribute of attributes) {
      const value = tag.match(new RegExp(`\\b${attribute}=["']([^"']+)["']`, "i"))?.[1];
      if (!value) continue;
      const resolvedPath = resolveLocalReference(value, "index.html");
      if (!resolvedPath) continue;
      assertExportReferenceExists(resolvedPath, value, filePaths);
      references.push({ sourcePath: "index.html", reference: value, resolvedPath, kind: isStylesheet ? "stylesheet" : "asset" });
    }
    const srcset = tag.match(/\bsrcset=["']([^"']+)["']/i)?.[1];
    if (srcset) {
      for (const candidate of srcset.split(",")) {
        const value = candidate.trim().split(/\s+/)[0];
        if (!value) continue;
        const resolvedPath = resolveLocalReference(value, "index.html");
        if (!resolvedPath) continue;
        assertExportReferenceExists(resolvedPath, value, filePaths);
        references.push({ sourcePath: "index.html", reference: value, resolvedPath, kind: "asset" });
      }
    }
  }
  return references;
}

function verifyCssReferences(css: string, stylesheetPath: string, filePaths: Set<string>): AstroStaticExportReference[] {
  const references: AstroStaticExportReference[] = [];
  const matches = css.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi);
  for (const match of matches) {
    const value = match[2]?.trim();
    if (!value) continue;
    const resolvedPath = resolveLocalReference(value, stylesheetPath);
    if (!resolvedPath) continue;
    assertExportReferenceExists(resolvedPath, value, filePaths);
    references.push({ sourcePath: stylesheetPath, reference: value, resolvedPath, kind: "asset" });
  }
  return references;
}

function resolveLocalReference(reference: string, sourcePath: string): string | null {
  if (reference.startsWith("#") || /^(?:data|mailto|tel|javascript):/i.test(reference)) return null;
  let url: URL;
  try {
    url = new URL(reference, `https://gnr8.invalid/${sourcePath}`);
  } catch (error) {
    throw new AstroStaticExportValidationError("asset_missing", `Invalid exported reference: ${reference}.`, { cause: error });
  }
  if (url.origin !== "https://gnr8.invalid") return null;
  let pathname: string;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (error) {
    throw new AstroStaticExportValidationError("asset_missing", `Invalid encoded exported reference: ${reference}.`, { cause: error });
  }
  const path = pathname.endsWith("/") ? `${pathname.slice(1)}index.html` : pathname.slice(1);
  if (!isSafeRelativeExportPath(path)) {
    throw new AstroStaticExportValidationError("export_boundary_invalid", `Exported reference escapes dist: ${reference}.`);
  }
  return path;
}

function assertExportReferenceExists(resolvedPath: string, reference: string, filePaths: Set<string>): void {
  if (!filePaths.has(resolvedPath)) {
    throw new AstroStaticExportValidationError(
      "asset_missing",
      `Exported reference does not resolve inside dist: ${reference} -> ${resolvedPath}.`,
    );
  }
}

function assertNoSourceOrDevDependency(body: string, workspacePath: string, outputPath: string): void {
  if (
    body.includes(workspacePath) ||
    /(?:^|["'(=])\/?src\/styles\/global\.css|\?direct(?:["')&#]|$)|\/@vite|vite\/client|(?:127\.0\.0\.1|localhost):4321/i.test(
      body,
    )
  ) {
    throw new AstroStaticExportValidationError(
      "source_dependency_detected",
      `Built output retains a source-workspace or Vite development dependency: ${outputPath}.`,
    );
  }
}

async function verifyDistHttp(
  fetchImpl: typeof fetch,
  baseUrl: string,
  inspected: InspectedAstroStaticExport,
  evidence: AstroBuildExportProofEvidence,
  signal?: AbortSignal,
): Promise<void> {
  let pageResponse: Response;
  try {
    pageResponse = await fetchImpl(baseUrl, { cache: "no-store", signal: boundedSignal(signal, DEFAULT_REQUEST_TIMEOUT_MS) });
  } catch (error) {
    throw proofError("request_failed", `Dist page request failed: ${messageFor(error)}`, evidence, error);
  }
  const pageContentType = pageResponse.headers.get("content-type");
  const html = await pageResponse.text();
  evidence.http.pageStatus = pageResponse.status;
  evidence.http.pageContentType = pageContentType;
  if (pageResponse.status !== 200 || !pageContentType?.toLowerCase().includes("text/html") || html !== inspected.indexHtml) {
    throw proofError(
      "page_verification_failed",
      `Dist HTTP page verification failed (status ${pageResponse.status}, content-type ${String(pageContentType)}).`,
      evidence,
    );
  }

  const stylesheetPath = inspected.stylesheetPaths[0];
  if (!stylesheetPath) {
    throw proofError("stylesheet_verification_failed", "No built stylesheet is available for HTTP verification.", evidence);
  }
  const sourceReference = inspected.references.find(
    (reference) => reference.kind === "stylesheet" && reference.resolvedPath === stylesheetPath,
  )?.reference;
  const stylesheetUrl = new URL(sourceReference ?? `/${stylesheetPath}`, baseUrl).toString();
  evidence.http.stylesheetUrl = stylesheetUrl;
  let stylesheetResponse: Response;
  try {
    stylesheetResponse = await fetchImpl(stylesheetUrl, {
      cache: "no-store",
      signal: boundedSignal(signal, DEFAULT_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw proofError("request_failed", `Dist stylesheet request failed: ${messageFor(error)}`, evidence, error);
  }
  const stylesheetContentType = stylesheetResponse.headers.get("content-type");
  const stylesheet = await stylesheetResponse.text();
  evidence.http.stylesheetStatus = stylesheetResponse.status;
  evidence.http.stylesheetContentType = stylesheetContentType;
  if (
    stylesheetResponse.status !== 200 ||
    !stylesheetContentType?.toLowerCase().includes("text/css") ||
    !themeTokenPattern().test(stylesheet)
  ) {
    throw proofError(
      "stylesheet_verification_failed",
      `Dist HTTP stylesheet verification failed (status ${stylesheetResponse.status}, content-type ${String(stylesheetContentType)}).`,
      evidence,
    );
  }
  evidence.http.verifiedThemeToken = inspected.verifiedThemeToken;
}

function defaultDependencies(): AstroBuildExportProofDependencies {
  return {
    prepareWorkspace: prepareAstroStaticSiteWorkspace,
    runCommand,
    readFile,
    inspectExport: inspectAstroStaticExport,
    startStaticServer: startAstroDistStaticServer,
    fetch,
    readSourceSnapshot: readAstroStaticSiteSourceSnapshot,
    removeWorkspace: (path) => rm(path, { recursive: true, force: false }),
    now: () => performance.now(),
  };
}

function runCommand(
  executable: string,
  args: string[],
  options: { cwd: string; timeoutMs: number; signal?: AbortSignal; env?: NodeJS.ProcessEnv },
): Promise<CommandResult> {
  return new Promise((resolveCommand, rejectCommand) => {
    execFile(
      executable,
      args,
      {
        cwd: options.cwd,
        env: options.env ?? process.env,
        encoding: "utf8",
        maxBuffer: 2 * 1024 * 1024,
        timeout: options.timeoutMs,
        signal: options.signal,
      },
      (error, stdout, stderr) => {
        if (error) rejectCommand(error);
        else resolveCommand({ stdout, stderr });
      },
    );
  });
}

async function gitStatusPaths(
  dependencies: AstroBuildExportProofDependencies,
  workspacePath: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const result = await dependencies.runCommand(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=normal"],
    { cwd: workspacePath, timeoutMs: 10_000, signal },
  );
  return result.stdout
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => line.slice(3));
}

function proofEnvironment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    CI: "1",
    NO_COLOR: "1",
    FORCE_COLOR: "0",
    COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
    npm_config_update_notifier: "false",
  };
}

function isSafeRelativeExportPath(path: string): boolean {
  if (!path || path.includes("\0") || path.includes("\\") || isAbsolute(path) || path.startsWith("/")) return false;
  const segments = path.split("/");
  return segments.every((segment) => segment && segment !== "." && segment !== "..") && posix.normalize(path) === path;
}

function isInsideOrEqual(root: string, candidate: string): boolean {
  const relativePath = relative(resolve(root), resolve(candidate));
  return relativePath === "" || (!relativePath.startsWith(`..${sep}`) && relativePath !== ".." && !isAbsolute(relativePath));
}

function contentTypeFor(path: string): string {
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  if (path.endsWith(".js") || path.endsWith(".mjs")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".svg")) return "image/svg+xml";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  if (path.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

function listen(server: Server): Promise<void> {
  return new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen({ host: ASTRO_BUILD_EXPORT_HOST, port: 0, exclusive: true }, resolveListen);
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}

function boundedSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function themeTokenPattern(): RegExp {
  return /--gnr8-astro-accent\s*:\s*#0f766e\s*;/i;
}

function readPackageVersion(body: string, packageName: string): string {
  const parsed = JSON.parse(body) as { version?: unknown };
  if (typeof parsed.version !== "string" || !parsed.version) throw new Error(`${packageName}_resolved_version_missing`);
  return parsed.version;
}

function throwIfAborted(signal: AbortSignal | undefined, evidence: AstroBuildExportProofEvidence): void {
  if (signal?.aborted) throw proofError("interrupted", "Astro build-export proof was interrupted.", evidence, signal.reason);
}

function proofError(
  code: AstroBuildExportProofErrorCode,
  message: string,
  evidence: AstroBuildExportProofEvidence,
  cause?: unknown,
): AstroBuildExportProofError {
  return new AstroBuildExportProofError(code, message, evidence, cause === undefined ? undefined : { cause });
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? error.code : undefined;
  const killed = "killed" in error ? error.killed : undefined;
  const message = "message" in error && typeof error.message === "string" ? error.message : "";
  return code === "ETIMEDOUT" || killed === true || /timed?\s*out/i.test(message);
}

function commandOutput(error: unknown, key: "stdout" | "stderr"): string {
  if (!error || typeof error !== "object") return "";
  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function bounded(value: string): string {
  return value.slice(-MAX_COMMAND_OUTPUT_BYTES);
}

function elapsed(now: number, startedAt: number): number {
  return Math.max(0, Math.round(now - startedAt));
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
