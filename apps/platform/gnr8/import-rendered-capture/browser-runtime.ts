import fs from "node:fs";

import { resolveChromiumLaunchOptions } from "./playwright-launch-probe";

export type BrowserRuntimeMode = "playwright";

export type BrowserRuntimeSelectionAttempt = {
  mode: BrowserRuntimeMode;
  packageName: string;
  success: boolean;
  error: string | null;
};

export type BrowserRuntimeSelection = {
  mode: BrowserRuntimeMode;
  packageName: string;
  chromium: any;
  executablePath: string | null;
  executablePathExists: boolean | null;
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
  executablePathResolution: "resolved" | "not_provided" | "resolution_failed";
}> {
  try {
    if (typeof chromium?.executablePath !== "function") {
      return {
        executablePath: null,
        executablePathExists: null,
        executablePathResolution: "not_provided",
      };
    }

    const resolvedRaw = await chromium.executablePath();
    const executablePath = normalizeText(resolvedRaw) || null;
    if (!executablePath) {
      return {
        executablePath: null,
        executablePathExists: null,
        executablePathResolution: "not_provided",
      };
    }
    return {
      executablePath,
      executablePathExists: fs.existsSync(executablePath),
      executablePathResolution: "resolved",
    };
  } catch {
    return {
      executablePath: null,
      executablePathExists: null,
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

export async function resolveBrowserRuntimeSelection(input?: {
  env?: NodeJS.ProcessEnv;
  launchTimeoutMs?: number;
  importPlaywright?: () => Promise<any>;
}): Promise<{ selection: BrowserRuntimeSelection | null; attempts: BrowserRuntimeSelectionAttempt[] }> {
  const _env = input?.env ?? process.env;
  const launchTimeoutMs = Math.max(1_000, Math.floor(input?.launchTimeoutMs ?? 8_000));
  const importPlaywright = input?.importPlaywright ?? (() => import("playwright"));
  const attempts: BrowserRuntimeSelectionAttempt[] = [];
  void _env;

  try {
    const playwrightModule = await importPlaywright();
    const chromium = playwrightModule?.chromium;
    if (!chromium) throw new Error("playwright chromium launcher unavailable");
    const executableResolution = await resolveExecutablePath(chromium);
    const launchOptions = buildLaunchOptions({
      timeoutMs: launchTimeoutMs,
      executablePath: executableResolution.executablePath,
      modeArgs: [],
      modeHeadless: true,
    });

    attempts.push({
      mode: "playwright",
      packageName: "playwright",
      success: true,
      error: null,
    });
    return {
      selection: {
        mode: "playwright",
        packageName: "playwright",
        chromium,
        executablePath: executableResolution.executablePath,
        executablePathExists: executableResolution.executablePathExists,
        executablePathResolution: executableResolution.executablePathResolution,
        launchOptions,
        attempts,
      },
      attempts,
    };
  } catch (error) {
    attempts.push({
      mode: "playwright",
      packageName: "playwright",
      success: false,
      error: toErrorString(error),
    });
  }

  return {
    selection: null,
    attempts,
  };
}
