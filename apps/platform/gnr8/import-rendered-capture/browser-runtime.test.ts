import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { isVercelHostedRuntime, resolveBrowserRuntimeSelection } from "@/gnr8/import-rendered-capture/browser-runtime";

test("isVercelHostedRuntime detects hosted vercel env markers", () => {
  assert.equal(isVercelHostedRuntime({} as NodeJS.ProcessEnv), false);
  assert.equal(isVercelHostedRuntime({ VERCEL: "1" } as NodeJS.ProcessEnv), true);
  assert.equal(isVercelHostedRuntime({ VERCEL_ENV: "production" } as NodeJS.ProcessEnv), true);
});

test("resolveBrowserRuntimeSelection resolves playwright runtime and launch options", async () => {
  const result = await resolveBrowserRuntimeSelection({
    env: {} as NodeJS.ProcessEnv,
    launchTimeoutMs: 3_000,
    importPlaywright: async () => ({
      chromium: {
        executablePath() {
          return null;
        },
        async launch() {
          return null;
        },
      },
    }),
  });

  assert.ok(result.selection);
  assert.equal(result.selection?.mode, "playwright");
  assert.equal(result.selection?.target, "standard");
  assert.equal(result.selection?.packageName, "playwright");
  assert.equal(result.selection?.executablePathResolution, "not_provided");
  assert.ok(Array.isArray(result.selection?.launchOptions.args));
  assert.ok((result.selection?.launchOptions.args as string[]).includes("--no-sandbox"));
});

test("resolveBrowserRuntimeSelection prefers playwright-core + sparticuz on vercel", async () => {
  const executablePath = path.resolve(os.tmpdir(), `chromium-${Date.now()}-${Math.random()}`);
  const result = await resolveBrowserRuntimeSelection({
    env: { VERCEL: "1" } as NodeJS.ProcessEnv,
    launchTimeoutMs: 3_000,
    importPlaywright: async () => {
      throw new Error("fallback should not be needed");
    },
    importPlaywrightCore: async () => ({
      chromium: {
        async launch() {
          return null;
        },
      },
    }),
    importSparticuzChromium: async () => ({
      args: ["--vercel-arg"],
      headless: true,
      executablePath: async () => executablePath,
    }),
  });

  assert.ok(result.selection);
  assert.equal(result.selection?.mode, "playwright_core_sparticuz");
  assert.equal(result.selection?.target, "vercel");
  assert.equal(result.selection?.packageName, "playwright-core + @sparticuz/chromium");
  assert.equal(result.selection?.executablePath, executablePath);
  assert.equal(result.selection?.executablePathExists, false);
  assert.equal(result.selection?.executablePathReadable, false);
  assert.equal(result.selection?.executablePathExecutable, false);
  assert.ok((result.selection?.launchOptions.args as string[]).includes("--vercel-arg"));
});

test("resolveBrowserRuntimeSelection reports null selection when playwright import fails", async () => {
  const result = await resolveBrowserRuntimeSelection({
    env: { VERCEL: "1" } as NodeJS.ProcessEnv,
    launchTimeoutMs: 3_000,
    importPlaywrightCore: async () => {
      throw new Error("playwright-core import failed");
    },
    importSparticuzChromium: async () => {
      throw new Error("sparticuz import failed");
    },
    importPlaywright: async () => {
      throw new Error("playwright import failed");
    },
  });

  assert.equal(result.selection, null);
  assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts[0]?.mode, "playwright_core_sparticuz");
  assert.equal(result.attempts[0]?.success, false);
  assert.equal(result.attempts[1]?.mode, "playwright");
  assert.equal(result.attempts[1]?.success, false);
});
