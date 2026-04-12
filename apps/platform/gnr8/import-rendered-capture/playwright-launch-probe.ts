import fs from "node:fs";

export const DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT_MS = 8_000;
export const DEFAULT_PLAYWRIGHT_CONTEXT_TIMEOUT_MS = 4_000;

export const RAILWAY_SAFE_CHROMIUM_LAUNCH_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
] as const;

export type PlaywrightLaunchFailureCode =
  | "PLAYWRIGHT_IMPORT_FAILED"
  | "PLAYWRIGHT_BROWSER_LAUNCH_FAILED"
  | "PLAYWRIGHT_BROWSER_CONTEXT_FAILED"
  | "PLAYWRIGHT_LAUNCH_TIMEOUT"
  | "PLAYWRIGHT_EXECUTABLE_MISSING"
  | "PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function toErrorString(error: unknown): string {
  return String((error as Error)?.message ?? error);
}

export function classifyPlaywrightLaunchFailure(input: {
  error: unknown;
  timedOut: boolean;
  executablePathExists: boolean | null;
}): PlaywrightLaunchFailureCode {
  if (input.timedOut) return "PLAYWRIGHT_LAUNCH_TIMEOUT";
  if (input.executablePathExists === false) return "PLAYWRIGHT_EXECUTABLE_MISSING";

  const message = normalizeText(toErrorString(input.error)).toLowerCase();
  if (message.includes("timed out") || message.includes("timeout")) return "PLAYWRIGHT_LAUNCH_TIMEOUT";
  if (message.includes("sandbox")) return "PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED";
  if (
    (message.includes("executable") && (message.includes("missing") || message.includes("not found"))) ||
    message.includes("failed to launch browser process")
  ) {
    return "PLAYWRIGHT_EXECUTABLE_MISSING";
  }
  return "PLAYWRIGHT_BROWSER_LAUNCH_FAILED";
}

export function resolveChromiumLaunchOptions(timeoutMs: number): {
  headless: true;
  timeout: number;
  args: string[];
} {
  return {
    headless: true,
    timeout: Math.max(1_000, Math.floor(timeoutMs)),
    args: [...RAILWAY_SAFE_CHROMIUM_LAUNCH_ARGS],
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<{ value: T; timedOut: false } | { value: null; timedOut: true }> {
  return new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => {
      if (finished) return;
      finished = true;
      resolve({ value: null, timedOut: true });
    }, timeoutMs);

    promise
      .then((value) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve({ value, timedOut: false });
      })
      .catch((error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        reject(error);
      });
  });
}

export type ChromiumLaunchProbeResult = {
  launchable: boolean;
  browserBinaryAvailable: boolean;
  failureCode: PlaywrightLaunchFailureCode | null;
  executablePath: string | null;
  executablePathExists: boolean | null;
  launchOptions: ReturnType<typeof resolveChromiumLaunchOptions>;
  error: string | null;
};

export async function runChromiumLaunchProbe(input: {
  chromium: any;
  launchTimeoutMs?: number;
  contextTimeoutMs?: number;
}): Promise<ChromiumLaunchProbeResult> {
  const launchTimeoutMs = Math.max(1_000, Math.floor(input.launchTimeoutMs ?? DEFAULT_PLAYWRIGHT_LAUNCH_TIMEOUT_MS));
  const contextTimeoutMs = Math.max(500, Math.floor(input.contextTimeoutMs ?? DEFAULT_PLAYWRIGHT_CONTEXT_TIMEOUT_MS));

  let executablePath: string | null = null;
  try {
    executablePath =
      typeof input.chromium?.executablePath === "function" ? normalizeText(input.chromium.executablePath()) || null : null;
  } catch {
    executablePath = null;
  }
  const executablePathExists = executablePath ? fs.existsSync(executablePath) : null;
  const launchOptions = resolveChromiumLaunchOptions(launchTimeoutMs);

  if (executablePath && executablePathExists === false) {
    return {
      launchable: false,
      browserBinaryAvailable: false,
      failureCode: "PLAYWRIGHT_EXECUTABLE_MISSING",
      executablePath,
      executablePathExists,
      launchOptions,
      error: "Playwright executable path does not exist",
    };
  }

  let browser: any = null;
  let context: any = null;
  let page: any = null;
  let launchTimedOut = false;

  try {
    const launchAttempt = await withTimeout(input.chromium.launch(launchOptions), launchTimeoutMs);
    if (launchAttempt.timedOut) {
      launchTimedOut = true;
      return {
        launchable: false,
        browserBinaryAvailable: false,
        failureCode: "PLAYWRIGHT_LAUNCH_TIMEOUT",
        executablePath,
        executablePathExists,
        launchOptions,
        error: `Launch probe timed out after ${launchTimeoutMs}ms`,
      };
    }
    browser = launchAttempt.value;

    const contextAttempt = await withTimeout(browser.newContext({ viewport: { width: 1280, height: 720 } }), contextTimeoutMs);
    if (contextAttempt.timedOut) {
      return {
        launchable: false,
        browserBinaryAvailable: false,
        failureCode: "PLAYWRIGHT_BROWSER_CONTEXT_FAILED",
        executablePath,
        executablePathExists,
        launchOptions,
        error: `Context probe timed out after ${contextTimeoutMs}ms`,
      };
    }
    context = contextAttempt.value;

    const pageAttempt = await withTimeout(context.newPage(), contextTimeoutMs);
    if (pageAttempt.timedOut) {
      return {
        launchable: false,
        browserBinaryAvailable: false,
        failureCode: "PLAYWRIGHT_BROWSER_CONTEXT_FAILED",
        executablePath,
        executablePathExists,
        launchOptions,
        error: `Page probe timed out after ${contextTimeoutMs}ms`,
      };
    }
    page = pageAttempt.value;

    return {
      launchable: true,
      browserBinaryAvailable: true,
      failureCode: null,
      executablePath,
      executablePathExists,
      launchOptions,
      error: null,
    };
  } catch (error) {
    return {
      launchable: false,
      browserBinaryAvailable: false,
      failureCode: classifyPlaywrightLaunchFailure({
        error,
        timedOut: launchTimedOut,
        executablePathExists,
      }),
      executablePath,
      executablePathExists,
      launchOptions,
      error: toErrorString(error),
    };
  } finally {
    try {
      await page?.close?.();
    } catch {
      // no-op
    }
    try {
      await context?.close?.();
    } catch {
      // no-op
    }
    try {
      await browser?.close?.();
    } catch {
      // no-op
    }
  }
}
