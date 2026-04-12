import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runChromiumLaunchProbe } from "@/gnr8/import-rendered-capture/playwright-launch-probe";

test("launch probe marks chromium available when launch + context + page succeed", async () => {
  const chromium = {
    executablePath: () => null,
    async launch() {
      return {
        async newContext() {
          return {
            async newPage() {
              return {
                async close() {},
              };
            },
            async close() {},
          };
        },
        async close() {},
      };
    },
  };

  const result = await runChromiumLaunchProbe({
    chromium,
    launchTimeoutMs: 500,
    contextTimeoutMs: 500,
  });

  assert.equal(result.launchable, true);
  assert.equal(result.browserBinaryAvailable, true);
  assert.equal(result.failureCode, null);
  assert.deepEqual(result.launchOptions.args, [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
  ]);
});

test("launch probe maps sandbox failure to explicit runtime-sandbox code", async () => {
  const chromium = {
    executablePath: () => null,
    async launch() {
      throw new Error("No usable sandbox! setuid sandbox not available");
    },
  };

  const result = await runChromiumLaunchProbe({
    chromium,
    launchTimeoutMs: 500,
    contextTimeoutMs: 500,
  });

  assert.equal(result.launchable, false);
  assert.equal(result.browserBinaryAvailable, false);
  assert.equal(result.failureCode, "PLAYWRIGHT_RUNTIME_SANDBOX_BLOCKED");
});

test("launch probe maps missing executable path to explicit executable-missing code", async () => {
  const missingPath = path.resolve(os.tmpdir(), `missing-browser-${Date.now()}-${Math.random()}`);
  let launchCalls = 0;
  const chromium = {
    executablePath: () => missingPath,
    async launch() {
      launchCalls += 1;
      throw new Error("should not launch when executable path is missing");
    },
  };

  const result = await runChromiumLaunchProbe({
    chromium,
    launchTimeoutMs: 500,
    contextTimeoutMs: 500,
  });

  assert.equal(result.launchable, false);
  assert.equal(result.failureCode, "PLAYWRIGHT_EXECUTABLE_MISSING");
  assert.equal(launchCalls, 0);
});

test("launch probe maps launch timeout deterministically", async () => {
  const chromium = {
    executablePath: () => null,
    async launch() {
      await new Promise((resolve) => setTimeout(resolve, 1_200));
      return {
        async newContext() {
          return {
            async newPage() {
              return {
                async close() {},
              };
            },
            async close() {},
          };
        },
        async close() {},
      };
    },
  };

  const result = await runChromiumLaunchProbe({
    chromium,
    launchTimeoutMs: 1_000,
    contextTimeoutMs: 100,
  });

  assert.equal(result.launchable, false);
  assert.equal(result.failureCode, "PLAYWRIGHT_LAUNCH_TIMEOUT");
});
