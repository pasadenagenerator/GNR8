import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { readAirshipBuilderWorkerConfig } from "../src/config.js";
import { createAirshipBuilderWorkerServer } from "../src/server.js";

async function withServer(
  workspaceRoot: string,
  fn: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createAirshipBuilderWorkerServer({
    configReadback: readAirshipBuilderWorkerConfig({
      GNR8_AIRSHIP_BUILDER_WORKER_ID: "test-worker",
      GNR8_AIRSHIP_BUILDER_PUBLIC_BASE_URL: "https://worker.example.test",
      GNR8_AIRSHIP_CONTROL_PLANE_BASE_URL: "https://app.example.test",
      GNR8_AIRSHIP_BUILDER_WORKSPACE_ROOT: workspaceRoot,
      GNR8_AIRSHIP_CLI_VERSION: "1.2.3",
    }),
    logger: () => undefined,
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    await fn(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("health endpoint reports scaffold readiness without session execution", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "gnr8-airship-builder-worker-"));
  try {
    await withServer(workspaceRoot, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/v1/health`);
      const body = await response.json() as { ok: boolean; runtimeExecution: string; workerId: string };

      assert.equal(response.status, 200);
      assert.equal(body.ok, true);
      assert.equal(body.workerId, "test-worker");
      assert.equal(body.runtimeExecution, "disabled");
    });
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("session routes are explicit no-op scaffold endpoints", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "gnr8-airship-builder-worker-"));
  try {
    await withServer(workspaceRoot, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/v1/airship/sessions`, { method: "POST" });
      const body = await response.json() as { ok: boolean; failureReason: string; boundaries: { noPublishMutation: boolean } };

      assert.equal(response.status, 501);
      assert.equal(body.ok, false);
      assert.equal(body.failureReason, "not_implemented");
      assert.equal(body.boundaries.noPublishMutation, true);
    });
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
