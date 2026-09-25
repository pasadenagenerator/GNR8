import assert from "node:assert/strict";
import { createServer, type Server } from "node:net";
import test from "node:test";

import {
  ASTRO_DEV_SERVER_SMOKE_URL,
  AstroDevServerSmokeProofError,
  assertLoopbackPortAvailable,
  createAstroDevServerSmokeProofEvidence,
  runAstroDevServerSmokeProof,
  waitForAstroReadiness,
  type AstroDevServerHandle,
  type AstroDevServerProcessExit,
} from "./astro-static-site-dev-server-smoke-proof";

test("command entrypoint remains inert when imported", async () => {
  const entrypoint = await import("./run-astro-static-site-dev-server-smoke-proof");
  assert.equal(typeof entrypoint.main, "function");
});

test("readiness succeeds only after the exact Astro URL responds", async () => {
  const server = fakeServerHandle();
  let attempts = 0;
  let now = 0;

  await waitForAstroReadiness({
    server,
    fetchImpl: async (input) => {
      assert.equal(input, ASTRO_DEV_SERVER_SMOKE_URL);
      attempts += 1;
      if (attempts < 2) throw new Error("not ready");
      return new Response("ready", { status: 200 });
    },
    now: () => now,
    sleep: async (ms) => {
      now += ms;
    },
    timeoutMs: 1_000,
    pollIntervalMs: 50,
    evidence: createAstroDevServerSmokeProofEvidence(),
  });

  assert.equal(attempts, 2);
  assert.deepEqual(server.getExit(), null);
});

test("readiness distinguishes timeout from an early process exit", async () => {
  let now = 0;
  await assert.rejects(
    () => waitForAstroReadiness({
      server: fakeServerHandle(),
      fetchImpl: async () => {
        throw new Error("connection refused");
      },
      now: () => now,
      sleep: async (ms) => {
        now += ms;
      },
      timeoutMs: 100,
      pollIntervalMs: 25,
      evidence: createAstroDevServerSmokeProofEvidence(),
    }),
    (error: unknown) => error instanceof AstroDevServerSmokeProofError && error.code === "readiness_timeout",
  );

  const exited = fakeServerHandle({ code: 7, signal: null });
  await assert.rejects(
    () => waitForAstroReadiness({
      server: exited,
      fetchImpl: async () => new Response("unexpected"),
      now: () => 0,
      sleep: async () => undefined,
      timeoutMs: 100,
      pollIntervalMs: 25,
      evidence: createAstroDevServerSmokeProofEvidence(),
    }),
    (error: unknown) => error instanceof AstroDevServerSmokeProofError && error.code === "server_exited_early",
  );
});

test("occupied loopback port is reported without stopping its owner", async () => {
  const external = createServer();
  await listen(external, 0);
  const address = external.address();
  assert.ok(address && typeof address !== "string");

  try {
    await assert.rejects(() => assertLoopbackPortAvailable(address.port), /port_conflict/);
    assert.equal(external.listening, true);
  } finally {
    await close(external);
  }
});

test("runner stops its owned process and removes only its prepared workspace after failure", async () => {
  const removed: string[] = [];
  const server = fakeServerHandle();
  const snapshot = {
    version: "gnr8-astro-source-snapshot:v1" as const,
    files: [{ path: "package.json", bytes: 2, sha256: "a" }],
    aggregateSha256: "baseline",
  };

  await assert.rejects(
    () => runAstroDevServerSmokeProof({
      readinessTimeoutMs: 1,
      dependencies: {
        prepareWorkspace: async () => ({
          adapterId: "astro-static-site",
          workspacePath: "/tmp/owned-astro-proof-test",
          baselineCommit: "0123456789012345678901234567890123456789",
          sourceSnapshot: snapshot,
          snapshotInclusionRules: [],
          futureStepMetadata: {
            previewPort: 4321,
            devCommand: { command: "pnpm dev", cwdHint: "workspace-root" },
            buildCommand: { command: "pnpm build", cwdHint: "workspace-root" },
          },
          executionBoundaries: {
            proofOnly: true,
            dependenciesInstalled: false,
            devServerExecuted: false,
            buildExecuted: false,
            previewServerExecuted: false,
            airshipExecuted: false,
          },
        }),
        runCommand: async (_executable, args) => {
          if (args[0] === "--version") return { stdout: "10.28.2\n", stderr: "" };
          return { stdout: "", stderr: "" };
        },
        assertPortAvailable: async () => undefined,
        startDevServer: () => server,
        fetch: async () => {
          throw new Error("connection refused");
        },
        readFile: async () => JSON.stringify({ version: "5.16.5" }),
        removeWorkspace: async (path) => {
          removed.push(path);
        },
      },
    }),
    (error: unknown) => {
      assert.ok(error instanceof AstroDevServerSmokeProofError);
      assert.equal(error.code, "readiness_timeout");
      assert.equal(error.evidence.server.stopped, true);
      assert.equal(error.evidence.workspace.removed, true);
      assert.equal(error.evidence.cleanup.completed, true);
      return true;
    },
  );

  assert.deepEqual(server.getExit(), { code: null, signal: "SIGTERM" });
  assert.deepEqual(removed, ["/tmp/owned-astro-proof-test"]);
});

function fakeServerHandle(initialExit: AstroDevServerProcessExit | null = null): AstroDevServerHandle {
  let exit = initialExit;
  let resolveExit: (value: AstroDevServerProcessExit) => void = () => undefined;
  const exitPromise = new Promise<AstroDevServerProcessExit>((resolve) => {
    resolveExit = resolve;
  });
  if (initialExit) resolveExit(initialExit);
  return {
    pid: 12345,
    getExit: () => exit,
    waitForExit: () => exitPromise,
    kill: (signal) => {
      exit = { code: null, signal };
      resolveExit(exit);
      return true;
    },
    output: () => ({ stdout: "fixture stdout", stderr: "" }),
  };
}

async function listen(server: Server, port: number): Promise<void> {
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, "127.0.0.1", resolveListen);
  });
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, rejectClose) => server.close((error) => (error ? rejectClose(error) : resolveClose())));
}
