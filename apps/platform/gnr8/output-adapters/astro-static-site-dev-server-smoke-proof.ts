import { execFile, spawn, type ChildProcess } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";

import type { NormalizedStaticBusinessSiteContent } from "./astro-static-site-adapter";
import {
  prepareAstroStaticSiteWorkspace,
  readAstroStaticSiteSourceSnapshot,
  type AstroSourceSnapshot,
  type PreparedAstroStaticSiteWorkspace,
} from "./astro-static-site-workspace-preparation";

export const ASTRO_DEV_SERVER_SMOKE_PROOF_VERSION = "gnr8-astro-dev-server-smoke-proof:v1" as const;
export const ASTRO_DEV_SERVER_SMOKE_HOST = "127.0.0.1" as const;
export const ASTRO_DEV_SERVER_SMOKE_PORT = 4321 as const;
export const ASTRO_DEV_SERVER_SMOKE_URL = `http://${ASTRO_DEV_SERVER_SMOKE_HOST}:${ASTRO_DEV_SERVER_SMOKE_PORT}/` as const;

const DEFAULT_INSTALL_TIMEOUT_MS = 180_000;
const DEFAULT_READINESS_TIMEOUT_MS = 20_000;
const DEFAULT_STOP_TIMEOUT_MS = 3_000;
const DEFAULT_POLL_INTERVAL_MS = 100;
const MAX_PROCESS_OUTPUT_BYTES = 24_000;

export type AstroDevServerSmokeProofErrorCode =
  | "command_failed"
  | "install_failed"
  | "port_conflict"
  | "server_exited_early"
  | "readiness_timeout"
  | "request_failed"
  | "page_verification_failed"
  | "stylesheet_verification_failed"
  | "source_changed"
  | "cleanup_failed"
  | "interrupted";

export type CommandResult = { stdout: string; stderr: string };

export interface AstroDevServerProcessExit {
  code: number | null;
  signal: NodeJS.Signals | null;
}

export interface AstroDevServerHandle {
  pid: number | null;
  getExit(): AstroDevServerProcessExit | null;
  waitForExit(): Promise<AstroDevServerProcessExit>;
  kill(signal: NodeJS.Signals): boolean;
  output(): { stdout: string; stderr: string };
}

export interface AstroDevServerSmokeProofEvidence {
  proofVersion: typeof ASTRO_DEV_SERVER_SMOKE_PROOF_VERSION;
  proofOnly: true;
  url: typeof ASTRO_DEV_SERVER_SMOKE_URL;
  timingsMs: {
    total: number;
    prepare: number;
    install: number;
    readiness: number;
    verification: number;
    cleanup: number;
  };
  versions: {
    node: string;
    pnpm: string;
    astro: string;
  };
  workspace: {
    path: string | null;
    baselineCommit: string | null;
    installGeneratedFiles: string[];
    serverGeneratedFiles: string[];
    removed: boolean;
  };
  installation: {
    completed: boolean;
    command: string;
  };
  server: {
    started: boolean;
    pid: number | null;
    ready: boolean;
    strictPort: true;
    stopped: boolean;
    forcedStop: boolean;
    exit: AstroDevServerProcessExit | null;
    stdout: string;
    stderr: string;
  };
  http: {
    pageStatus: number | null;
    pageContentType: string | null;
    stylesheetUrl: string | null;
    stylesheetStatus: number | null;
    stylesheetContentType: string | null;
    verifiedContent: string[];
    verifiedThemeToken: string | null;
  };
  sourceComparison: {
    baselineAggregateSha256: string | null;
    finalAggregateSha256: string | null;
    unchanged: boolean;
  };
  cleanup: {
    completed: boolean;
    errors: string[];
  };
}

export class AstroDevServerSmokeProofError extends Error {
  readonly code: AstroDevServerSmokeProofErrorCode;
  readonly evidence: AstroDevServerSmokeProofEvidence;

  constructor(
    code: AstroDevServerSmokeProofErrorCode,
    message: string,
    evidence: AstroDevServerSmokeProofEvidence,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AstroDevServerSmokeProofError";
    this.code = code;
    this.evidence = evidence;
  }
}

export interface AstroDevServerSmokeProofDependencies {
  prepareWorkspace(input: {
    content: NormalizedStaticBusinessSiteContent;
    workspaceRoot?: string;
  }): Promise<PreparedAstroStaticSiteWorkspace>;
  runCommand(
    executable: string,
    args: string[],
    options: { cwd: string; timeoutMs: number; signal?: AbortSignal; env?: NodeJS.ProcessEnv },
  ): Promise<CommandResult>;
  assertPortAvailable(port: number): Promise<void>;
  startDevServer(workspacePath: string): AstroDevServerHandle;
  fetch: typeof fetch;
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  readSourceSnapshot(input: { workspacePath: string; sourcePaths: string[] }): Promise<AstroSourceSnapshot>;
  removeWorkspace(path: string): Promise<void>;
  now(): number;
  sleep(ms: number): Promise<void>;
}

export interface RunAstroDevServerSmokeProofInput {
  workspaceRoot?: string;
  signal?: AbortSignal;
  installTimeoutMs?: number;
  readinessTimeoutMs?: number;
  stopTimeoutMs?: number;
  dependencies?: Partial<AstroDevServerSmokeProofDependencies>;
}

export async function runAstroDevServerSmokeProof(
  input: RunAstroDevServerSmokeProofInput = {},
): Promise<AstroDevServerSmokeProofEvidence> {
  const dependencies = { ...defaultDependencies(), ...input.dependencies };
  const evidence = createAstroDevServerSmokeProofEvidence();
  const startedAt = dependencies.now();
  let prepared: PreparedAstroStaticSiteWorkspace | null = null;
  let server: AstroDevServerHandle | null = null;
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
          env: installEnvironment(),
        },
      );
    } catch (error) {
      throw proofError("install_failed", `Astro dependency installation failed: ${messageFor(error)}`, evidence, error);
    }
    evidence.installation.completed = true;
    evidence.timingsMs.install = elapsed(dependencies.now(), installStartedAt);
    evidence.workspace.installGeneratedFiles = await gitStatusPaths(dependencies, prepared.workspacePath, input.signal);

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
    try {
      await dependencies.assertPortAvailable(ASTRO_DEV_SERVER_SMOKE_PORT);
    } catch (error) {
      throw proofError(
        "port_conflict",
        `Astro dev-server port ${ASTRO_DEV_SERVER_SMOKE_HOST}:${ASTRO_DEV_SERVER_SMOKE_PORT} is unavailable; its owner was not stopped.`,
        evidence,
        error,
      );
    }
    server = dependencies.startDevServer(prepared.workspacePath);
    evidence.server.started = true;
    evidence.server.pid = server.pid;

    const readinessStartedAt = dependencies.now();
    await waitForAstroReadiness({
      server,
      fetchImpl: dependencies.fetch,
      now: dependencies.now,
      sleep: dependencies.sleep,
      signal: input.signal,
      timeoutMs: input.readinessTimeoutMs ?? DEFAULT_READINESS_TIMEOUT_MS,
      pollIntervalMs: DEFAULT_POLL_INTERVAL_MS,
      evidence,
    });
    evidence.server.ready = true;
    evidence.timingsMs.readiness = elapsed(dependencies.now(), readinessStartedAt);

    const verificationStartedAt = dependencies.now();
    await verifyServedSite(dependencies.fetch, evidence, input.signal);
    evidence.timingsMs.verification = elapsed(dependencies.now(), verificationStartedAt);

    const sourcePaths = prepared.sourceSnapshot.files.map((file) => file.path);
    const finalSnapshot = await dependencies.readSourceSnapshot({
      workspacePath: prepared.workspacePath,
      sourcePaths,
    });
    evidence.sourceComparison.finalAggregateSha256 = finalSnapshot.aggregateSha256;
    evidence.sourceComparison.unchanged = finalSnapshot.aggregateSha256 === prepared.sourceSnapshot.aggregateSha256;
    if (!evidence.sourceComparison.unchanged) {
      throw proofError("source_changed", "Generated Astro source changed after installation or dev-server execution.", evidence);
    }

    const finalGeneratedFiles = await gitStatusPaths(dependencies, prepared.workspacePath, input.signal);
    const installGenerated = new Set(evidence.workspace.installGeneratedFiles);
    evidence.workspace.serverGeneratedFiles = finalGeneratedFiles.filter((path) => !installGenerated.has(path));
  } catch (error) {
    failure = error;
  } finally {
    const cleanupStartedAt = dependencies.now();
    if (server) {
      try {
        const stopped = await stopAstroDevServer(server, input.stopTimeoutMs ?? DEFAULT_STOP_TIMEOUT_MS);
        evidence.server.stopped = true;
        evidence.server.forcedStop = stopped.forced;
        evidence.server.exit = stopped.exit;
      } catch (error) {
        evidence.cleanup.errors.push(`server:${messageFor(error)}`);
      }
      const output = server.output();
      evidence.server.stdout = output.stdout;
      evidence.server.stderr = output.stderr;
    }
    if (prepared) {
      try {
        await dependencies.removeWorkspace(prepared.workspacePath);
        evidence.workspace.removed = true;
      } catch (error) {
        evidence.cleanup.errors.push(`workspace:${messageFor(error)}`);
      }
    }
    evidence.cleanup.completed = evidence.cleanup.errors.length === 0 && (!server || evidence.server.stopped) && (!prepared || evidence.workspace.removed);
    evidence.timingsMs.cleanup = elapsed(dependencies.now(), cleanupStartedAt);
    evidence.timingsMs.total = elapsed(dependencies.now(), startedAt);
  }

  if (evidence.cleanup.errors.length > 0) {
    throw proofError("cleanup_failed", `Astro smoke-proof cleanup failed: ${evidence.cleanup.errors.join("; ")}`, evidence, failure);
  }
  if (failure) {
    if (failure instanceof AstroDevServerSmokeProofError) throw failure;
    throw proofError("command_failed", messageFor(failure), evidence, failure);
  }
  return evidence;
}

export async function assertLoopbackPortAvailable(port: number): Promise<void> {
  const server = createServer();
  try {
    await new Promise<void>((resolveListen, rejectListen) => {
      server.once("error", rejectListen);
      server.listen({ host: ASTRO_DEV_SERVER_SMOKE_HOST, port, exclusive: true }, resolveListen);
    });
  } catch (error) {
    throw new Error(`port_conflict:${ASTRO_DEV_SERVER_SMOKE_HOST}:${port}:${messageFor(error)}`, { cause: error });
  } finally {
    if (server.listening) {
      await new Promise<void>((resolveClose, rejectClose) => server.close((error) => (error ? rejectClose(error) : resolveClose())));
    }
  }
}

export async function waitForAstroReadiness(input: {
  server: AstroDevServerHandle;
  fetchImpl: typeof fetch;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  signal?: AbortSignal;
  timeoutMs: number;
  pollIntervalMs: number;
  evidence: AstroDevServerSmokeProofEvidence;
}): Promise<void> {
  const deadline = input.now() + input.timeoutMs;
  let lastError = "no response";
  while (input.now() < deadline) {
    throwIfAborted(input.signal, input.evidence);
    const exit = input.server.getExit();
    if (exit) {
      throw proofError(
        "server_exited_early",
        `Astro dev server exited before readiness (code ${String(exit.code)}, signal ${String(exit.signal)}).`,
        input.evidence,
      );
    }
    try {
      const response = await input.fetchImpl(ASTRO_DEV_SERVER_SMOKE_URL, {
        cache: "no-store",
        signal: AbortSignal.timeout(Math.max(1, Math.min(1_000, deadline - input.now()))),
      });
      await response.arrayBuffer();
      if (response.status > 0) return;
    } catch (error) {
      lastError = messageFor(error);
    }
    await input.sleep(Math.min(input.pollIntervalMs, Math.max(0, deadline - input.now())));
  }
  const exit = input.server.getExit();
  if (exit) {
    throw proofError(
      "server_exited_early",
      `Astro dev server exited before readiness (code ${String(exit.code)}, signal ${String(exit.signal)}).`,
      input.evidence,
    );
  }
  throw proofError("readiness_timeout", `Astro readiness timed out after ${input.timeoutMs}ms (${lastError}).`, input.evidence);
}

export async function stopAstroDevServer(
  server: AstroDevServerHandle,
  timeoutMs = DEFAULT_STOP_TIMEOUT_MS,
): Promise<{ forced: boolean; exit: AstroDevServerProcessExit }> {
  const existingExit = server.getExit();
  if (existingExit) return { forced: false, exit: existingExit };

  server.kill("SIGTERM");
  const graceful = await settleWithin(server.waitForExit(), timeoutMs);
  if (graceful) return { forced: false, exit: graceful };

  server.kill("SIGKILL");
  const forced = await settleWithin(server.waitForExit(), timeoutMs);
  if (!forced) throw new Error(`owned_astro_process_did_not_exit:${String(server.pid)}`);
  return { forced: true, exit: forced };
}

export function astroDevServerSmokeProofFixture(): NormalizedStaticBusinessSiteContent {
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

export function createAstroDevServerSmokeProofEvidence(): AstroDevServerSmokeProofEvidence {
  return {
    proofVersion: ASTRO_DEV_SERVER_SMOKE_PROOF_VERSION,
    proofOnly: true,
    url: ASTRO_DEV_SERVER_SMOKE_URL,
    timingsMs: { total: 0, prepare: 0, install: 0, readiness: 0, verification: 0, cleanup: 0 },
    versions: { node: process.version, pnpm: "", astro: "" },
    workspace: {
      path: null,
      baselineCommit: null,
      installGeneratedFiles: [],
      serverGeneratedFiles: [],
      removed: false,
    },
    installation: {
      completed: false,
      command: "pnpm install --ignore-workspace --no-frozen-lockfile --store-dir .pnpm-store",
    },
    server: {
      started: false,
      pid: null,
      ready: false,
      strictPort: true,
      stopped: false,
      forcedStop: false,
      exit: null,
      stdout: "",
      stderr: "",
    },
    http: {
      pageStatus: null,
      pageContentType: null,
      stylesheetUrl: null,
      stylesheetStatus: null,
      stylesheetContentType: null,
      verifiedContent: [],
      verifiedThemeToken: null,
    },
    sourceComparison: {
      baselineAggregateSha256: null,
      finalAggregateSha256: null,
      unchanged: false,
    },
    cleanup: { completed: false, errors: [] },
  };
}

function defaultDependencies(): AstroDevServerSmokeProofDependencies {
  return {
    prepareWorkspace: prepareAstroStaticSiteWorkspace,
    runCommand,
    assertPortAvailable: assertLoopbackPortAvailable,
    startDevServer: startAstroDevServer,
    fetch,
    readFile,
    readSourceSnapshot: readAstroStaticSiteSourceSnapshot,
    removeWorkspace: (path) => rm(path, { recursive: true, force: false }),
    now: () => performance.now(),
    sleep: (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms)),
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

function startAstroDevServer(workspacePath: string): AstroDevServerHandle {
  const child = spawn(
    process.execPath,
    [join(workspacePath, "node_modules", "astro", "astro.js"), "dev", "--host", ASTRO_DEV_SERVER_SMOKE_HOST, "--port", String(ASTRO_DEV_SERVER_SMOKE_PORT), "--strictPort"],
    {
      cwd: workspacePath,
      env: { ...process.env, CI: "1", NO_COLOR: "1", FORCE_COLOR: "0" },
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    },
  );
  return childProcessHandle(child);
}

function childProcessHandle(child: ChildProcess): AstroDevServerHandle {
  let exit: AstroDevServerProcessExit | null = null;
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk) => {
    stdout = appendBounded(stdout, chunk);
  });
  child.stderr?.on("data", (chunk) => {
    stderr = appendBounded(stderr, chunk);
  });
  const waitForExit = new Promise<AstroDevServerProcessExit>((resolveExit) => {
    child.once("exit", (code, signal) => {
      exit = { code, signal };
      resolveExit(exit);
    });
    child.once("error", () => {
      if (!exit) {
        exit = { code: null, signal: null };
        resolveExit(exit);
      }
    });
  });
  return {
    pid: child.pid ?? null,
    getExit: () => exit,
    waitForExit: () => waitForExit,
    kill: (signal) => child.kill(signal),
    output: () => ({ stdout, stderr }),
  };
}

async function verifyServedSite(fetchImpl: typeof fetch, evidence: AstroDevServerSmokeProofEvidence, signal?: AbortSignal): Promise<void> {
  let response: Response;
  try {
    response = await fetchImpl(ASTRO_DEV_SERVER_SMOKE_URL, {
      cache: "no-store",
      signal: boundedSignal(signal, 5_000),
    });
  } catch (error) {
    throw proofError("request_failed", `Astro page request failed: ${messageFor(error)}`, evidence, error);
  }
  const contentType = response.headers.get("content-type");
  const html = await response.text();
  evidence.http.pageStatus = response.status;
  evidence.http.pageContentType = contentType;
  const expectedContent = [
    "<title>Northline Operations Proof</title>",
    "Work that reads clearly",
    "Services",
    "Contact",
    "Practical operating support",
    "Talk with Northline",
    "hello@northline.example",
  ];
  evidence.http.verifiedContent = expectedContent.filter((value) => html.includes(value));
  if (response.status !== 200 || !contentType?.toLowerCase().includes("text/html") || evidence.http.verifiedContent.length !== expectedContent.length) {
    throw proofError(
      "page_verification_failed",
      `Astro page verification failed (status ${response.status}, content-type ${String(contentType)}, matched ${evidence.http.verifiedContent.length}/${expectedContent.length}).`,
      evidence,
    );
  }

  const stylesheetHref = extractStylesheetHref(html);
  if (!stylesheetHref) {
    throw proofError("stylesheet_verification_failed", "Astro page did not reference a generated stylesheet.", evidence);
  }
  const stylesheetUrl = new URL(stylesheetHref, ASTRO_DEV_SERVER_SMOKE_URL).toString();
  evidence.http.stylesheetUrl = stylesheetUrl;
  const stylesheetResponse = await fetchImpl(stylesheetUrl, {
    cache: "no-store",
    signal: boundedSignal(signal, 5_000),
  });
  const stylesheetContentType = stylesheetResponse.headers.get("content-type");
  const stylesheet = await stylesheetResponse.text();
  evidence.http.stylesheetStatus = stylesheetResponse.status;
  evidence.http.stylesheetContentType = stylesheetContentType;
  const expectedThemeToken = "--gnr8-astro-accent: #0f766e;";
  if (
    stylesheetResponse.status !== 200 ||
    !stylesheetContentType?.toLowerCase().includes("text/css") ||
    !stylesheet.includes(expectedThemeToken)
  ) {
    throw proofError(
      "stylesheet_verification_failed",
      `Astro stylesheet verification failed (status ${stylesheetResponse.status}, content-type ${String(stylesheetContentType)}).`,
      evidence,
    );
  }
  evidence.http.verifiedThemeToken = expectedThemeToken;
}

function extractStylesheetHref(html: string): string | null {
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const link of links) {
    if (!/\brel=["']stylesheet["']/i.test(link)) continue;
    const href = link.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (href) return href;
  }
  return null;
}

async function gitStatusPaths(
  dependencies: AstroDevServerSmokeProofDependencies,
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

function installEnvironment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    CI: "1",
    COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
    npm_config_update_notifier: "false",
  };
}

function boundedSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function readPackageVersion(body: string, packageName: string): string {
  const parsed = JSON.parse(body) as { version?: unknown };
  if (typeof parsed.version !== "string" || !parsed.version) throw new Error(`${packageName}_resolved_version_missing`);
  return parsed.version;
}

function throwIfAborted(signal: AbortSignal | undefined, evidence: AstroDevServerSmokeProofEvidence): void {
  if (signal?.aborted) throw proofError("interrupted", "Astro smoke proof was interrupted.", evidence, signal.reason);
}

function proofError(
  code: AstroDevServerSmokeProofErrorCode,
  message: string,
  evidence: AstroDevServerSmokeProofEvidence,
  cause?: unknown,
): AstroDevServerSmokeProofError {
  return new AstroDevServerSmokeProofError(code, message, evidence, cause === undefined ? undefined : { cause });
}

function appendBounded(current: string, chunk: unknown): string {
  return `${current}${String(chunk)}`.slice(-MAX_PROCESS_OUTPUT_BYTES);
}

function elapsed(now: number, startedAt: number): number {
  return Math.max(0, Math.round(now - startedAt));
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function settleWithin<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolveTimeout) => {
        timer = setTimeout(() => resolveTimeout(null), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
