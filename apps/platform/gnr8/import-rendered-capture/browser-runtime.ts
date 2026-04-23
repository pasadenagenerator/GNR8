import fs from "node:fs";

import { resolveChromiumLaunchOptions } from "./playwright-launch-probe";

export type BrowserRuntimeMode = "playwright" | "playwright_core_sparticuz";

export type BrowserRuntimeTarget = "vercel" | "standard";

export type BrowserRuntimeSelectionAttempt = {
  mode: BrowserRuntimeMode;
  packageName: string;
  target: BrowserRuntimeTarget;
  success: boolean;
  error: string | null;
};

export type BrowserRuntimeSelection = {
  mode: BrowserRuntimeMode;
  packageName: string;
  target: BrowserRuntimeTarget;
  chromium: any;
  executablePath: string | null;
  executablePathExists: boolean | null;
  executablePathReadable: boolean | null;
  executablePathExecutable: boolean | null;
  executablePathResolution: "resolved" | "not_provided" | "resolution_failed";
  launchOptions: Record<string, unknown>;
  attempts: BrowserRuntimeSelectionAttempt[];
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function toErrorString(error: unknown): string {
  return String((error as Error)?.message ?? error);
}

function uniqueStringArray(values: unknown[]): string[] {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];
}

export function isVercelHostedRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  const vercel = normalizeText(env.VERCEL).toLowerCase();
  if (vercel === "1" || vercel === "true") return true;
  if (normalizeText(env.VERCEL_ENV).length > 0) return true;
  if (normalizeText(env.VERCEL_URL).length > 0) return true;
  return false;
}

async function resolveExecutablePath(chromium: any): Promise<{
  executablePath: string | null;
  executablePathExists: boolean | null;
  executablePathReadable: boolean | null;
  executablePathExecutable: boolean | null;
  executablePathResolution: "resolved" | "not_provided" | "resolution_failed";
}> {
  try {
    if (typeof chromium?.executablePath !== "function") {
      return {
        executablePath: null,
        executablePathExists: null,
        executablePathReadable: null,
        executablePathExecutable: null,
        executablePathResolution: "not_provided",
      };
    }

    const resolvedRaw = await chromium.executablePath();
    const executablePath = normalizeText(resolvedRaw) || null;
    if (!executablePath) {
      return {
        executablePath: null,
        executablePathExists: null,
        executablePathReadable: null,
        executablePathExecutable: null,
        executablePathResolution: "not_provided",
      };
    }

    const executablePathExists = fs.existsSync(executablePath);
    const executablePathReadable = executablePathExists ? canAccess(executablePath, fs.constants.R_OK) : false;
    const executablePathExecutable = executablePathExists ? canAccess(executablePath, fs.constants.X_OK) : false;

    return {
      executablePath,
      executablePathExists,
      executablePathReadable,
      executablePathExecutable,
      executablePathResolution: "resolved",
    };
  } catch {
    return {
      executablePath: null,
      executablePathExists: null,
      executablePathReadable: null,
      executablePathExecutable: null,
      executablePathResolution: "resolution_failed",
    };
  }
}

function buildLaunchOptions(input: {
  timeoutMs: number;
  executablePath: string | null;
  modeArgs: unknown[];
  modeHeadless: unknown;
}): Record<string, unknown> {
  const baseOptions = resolveChromiumLaunchOptions(input.timeoutMs);
  const mergedArgs = uniqueStringArray([...baseOptions.args, ...input.modeArgs]);
  const launchOptions: Record<string, unknown> = {
    ...baseOptions,
    args: mergedArgs,
  };
  if (input.executablePath) launchOptions.executablePath = input.executablePath;
  if (typeof input.modeHeadless === "boolean") launchOptions.headless = input.modeHeadless;
  return launchOptions;
}

function canAccess(filePath: string, mode: number): boolean {
  try {
    fs.accessSync(filePath, mode);
    return true;
  } catch {
    return false;
  }
}

async function tryResolvePlaywrightSelection(input: {
  target: BrowserRuntimeTarget;
  launchTimeoutMs: number;
  importPlaywright: () => Promise<any>;
  attempts: BrowserRuntimeSelectionAttempt[];
}): Promise<BrowserRuntimeSelection | null> {
  try {
    const playwrightModule = await input.importPlaywright();
    const chromium = playwrightModule?.chromium;
    if (!chromium) throw new Error("playwright chromium launcher unavailable");
    const executableResolution = await resolveExecutablePath(chromium);
    const launchOptions = buildLaunchOptions({
      timeoutMs: input.launchTimeoutMs,
      executablePath: executableResolution.executablePath,
      modeArgs: [],
      modeHeadless: true,
    });
    input.attempts.push({
      mode: "playwright",
      packageName: "playwright",
      target: input.target,
      success: true,
      error: null,
    });
    return {
      mode: "playwright",
      packageName: "playwright",
      target: input.target,
      chromium,
      executablePath: executableResolution.executablePath,
      executablePathExists: executableResolution.executablePathExists,
      executablePathReadable: executableResolution.executablePathReadable,
      executablePathExecutable: executableResolution.executablePathExecutable,
      executablePathResolution: executableResolution.executablePathResolution,
      launchOptions,
      attempts: input.attempts,
    };
  } catch (error) {
    input.attempts.push({
      mode: "playwright",
      packageName: "playwright",
      target: input.target,
      success: false,
      error: toErrorString(error),
    });
    return null;
  }
}

async function tryResolveVercelSelection(input: {
  launchTimeoutMs: number;
  importPlaywrightCore: () => Promise<any>;
  importSparticuzChromium: () => Promise<any>;
  attempts: BrowserRuntimeSelectionAttempt[];
}): Promise<BrowserRuntimeSelection | null> {
  try {
    const [playwrightCoreModule, sparticuzModule] = await Promise.all([
      input.importPlaywrightCore(),
      input.importSparticuzChromium(),
    ]);
    const chromium = playwrightCoreModule?.chromium;
    const sparticuzChromium = sparticuzModule?.default ?? sparticuzModule;
    if (!chromium) throw new Error("playwright-core chromium launcher unavailable");
    if (!sparticuzChromium) throw new Error("@sparticuz/chromium runtime unavailable");

    const executableResolution = await resolveExecutablePath(sparticuzChromium);
    const launchOptions = buildLaunchOptions({
      timeoutMs: input.launchTimeoutMs,
      executablePath: executableResolution.executablePath,
      modeArgs: Array.isArray(sparticuzChromium?.args) ? sparticuzChromium.args : [],
      modeHeadless: typeof sparticuzChromium?.headless === "boolean" ? sparticuzChromium.headless : true,
    });

    input.attempts.push({
      mode: "playwright_core_sparticuz",
      packageName: "playwright-core + @sparticuz/chromium",
      target: "vercel",
      success: true,
      error: null,
    });
    return {
      mode: "playwright_core_sparticuz",
      packageName: "playwright-core + @sparticuz/chromium",
      target: "vercel",
      chromium,
      executablePath: executableResolution.executablePath,
      executablePathExists: executableResolution.executablePathExists,
      executablePathReadable: executableResolution.executablePathReadable,
      executablePathExecutable: executableResolution.executablePathExecutable,
      executablePathResolution: executableResolution.executablePathResolution,
      launchOptions,
      attempts: input.attempts,
    };
  } catch (error) {
    input.attempts.push({
      mode: "playwright_core_sparticuz",
      packageName: "playwright-core + @sparticuz/chromium",
      target: "vercel",
      success: false,
      error: toErrorString(error),
    });
    return null;
  }
}

export async function resolveBrowserRuntimeSelection(input?: {
  env?: NodeJS.ProcessEnv;
  launchTimeoutMs?: number;
  importPlaywright?: () => Promise<any>;
  importPlaywrightCore?: () => Promise<any>;
  importSparticuzChromium?: () => Promise<any>;
}): Promise<{ selection: BrowserRuntimeSelection | null; attempts: BrowserRuntimeSelectionAttempt[] }> {
  const _env = input?.env ?? process.env;
  const launchTimeoutMs = Math.max(1_000, Math.floor(input?.launchTimeoutMs ?? 8_000));
  const importPlaywright = input?.importPlaywright ?? (() => import("playwright"));
  const importPlaywrightCore = input?.importPlaywrightCore ?? (() => import("playwright-core"));
  const importSparticuzChromium = input?.importSparticuzChromium ?? (() => import("@sparticuz/chromium"));
  const attempts: BrowserRuntimeSelectionAttempt[] = [];
  const vercelTarget = isVercelHostedRuntime(_env);

  if (vercelTarget) {
    const vercelSelection = await tryResolveVercelSelection({
      launchTimeoutMs,
      importPlaywrightCore,
      importSparticuzChromium,
      attempts,
    });
    if (vercelSelection) {
      return { selection: vercelSelection, attempts };
    }
  }

  const playwrightSelection = await tryResolvePlaywrightSelection({
    target: vercelTarget ? "vercel" : "standard",
    launchTimeoutMs,
    importPlaywright,
    attempts,
  });
  if (playwrightSelection) {
    return { selection: playwrightSelection, attempts };
  }

  return { selection: null, attempts };
}
