import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import type { JsonValue } from "../../import/import-contract";
import { stableStringify } from "../../migration/runtime/diagnostics";
import {
  FIRST_REAL_BETA_ARTIFACT_FILES,
  classifyProtocolDegradation,
  decideProtocolAction,
  runFirstRealBetaMigrationExecution,
} from "./run-first-real-beta-migration";

type TestServer = {
  baseUrl: string;
  close: () => Promise<void>;
};

async function createLandingServer(): Promise<TestServer> {
  const server = http.createServer((req, res) => {
    const reqUrl = req.url ?? "/";

    if (reqUrl === "/" || reqUrl.startsWith("/?")) {
      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Beta Landing</title>
    <link rel="stylesheet" href="/assets/styles.css" />
    <link rel="icon" href="/assets/favicon.ico" />
  </head>
  <body>
    <header>
      <h1>Deterministic migration beta run</h1>
      <p>Single-page landing used for first real beta runtime validation.</p>
      <a href="/signup">Get started</a>
    </header>
    <main>
      <section>
        <img src="/assets/hero.svg" alt="Hero" />
      </section>
    </main>
  </body>
</html>`);
      return;
    }

    if (reqUrl === "/assets/styles.css") {
      res.statusCode = 200;
      res.setHeader("content-type", "text/css; charset=utf-8");
      res.end("body{font-family:Georgia,serif;color:#111}main{padding:16px}a{display:inline-block}");
      return;
    }

    if (reqUrl === "/assets/hero.svg") {
      res.statusCode = 200;
      res.setHeader("content-type", "image/svg+xml");
      res.end("<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><rect width='16' height='16' fill='#0a7'/></svg>");
      return;
    }

    if (reqUrl === "/assets/favicon.ico") {
      res.statusCode = 200;
      res.setHeader("content-type", "image/x-icon");
      res.end(Buffer.from([0, 0, 1, 0]));
      return;
    }

    if (reqUrl === "/signup") {
      res.statusCode = 200;
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.end("<html><body>signup</body></html>");
      return;
    }

    res.statusCode = 404;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("not found");
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind local beta test server.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

function artifactFileNamesSorted(): string[] {
  return Object.values(FIRST_REAL_BETA_ARTIFACT_FILES).sort((a, b) => a.localeCompare(b));
}

test("first-real-beta dry-run report is deterministic across repeated real URL executions", async () => {
  const server = await createLandingServer();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-first-beta-determinism-"));

  try {
    const a = await runFirstRealBetaMigrationExecution(
      { url: `${server.baseUrl}/`, betaClientId: "beta-client-a" },
      {
        artifactsRootDirAbs: path.resolve(tmp, "artifacts"),
        snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
        requestId: "beta-determinism",
      },
    );

    const b = await runFirstRealBetaMigrationExecution(
      { url: `${server.baseUrl}/`, betaClientId: "beta-client-a" },
      {
        artifactsRootDirAbs: path.resolve(tmp, "artifacts"),
        snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
        requestId: "beta-determinism",
      },
    );

    assert.equal(stableStringify(a.dryRunReport as unknown as JsonValue), stableStringify(b.dryRunReport as unknown as JsonValue));
    assert.equal(stableStringify(a.decision as unknown as JsonValue), stableStringify(b.decision as unknown as JsonValue));
  } finally {
    await server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("first-real-beta artifacts are complete and deterministic filenames are used", async () => {
  const server = await createLandingServer();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-first-beta-artifacts-"));

  try {
    const result = await runFirstRealBetaMigrationExecution(
      { url: `${server.baseUrl}/` },
      {
        artifactsRootDirAbs: path.resolve(tmp, "artifacts"),
        snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
        requestId: "beta-artifacts",
      },
    );

    const files = fs.readdirSync(result.artifactsRootDirAbs).sort((a, b) => a.localeCompare(b));
    assert.deepEqual(files, artifactFileNamesSorted());

    for (const fileName of files) {
      const raw = fs.readFileSync(path.resolve(result.artifactsRootDirAbs, fileName), "utf8").trim();
      const parsed = JSON.parse(raw) as unknown;
      assert.ok(parsed && typeof parsed === "object");
    }
  } finally {
    await server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("first-real-beta materialize run exposes preview hosting and materialized output", async () => {
  const server = await createLandingServer();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gnr8-first-beta-preview-"));

  try {
    const result = await runFirstRealBetaMigrationExecution(
      { url: `${server.baseUrl}/` },
      {
        artifactsRootDirAbs: path.resolve(tmp, "artifacts"),
        snapshotRootDirAbs: path.resolve(tmp, "snapshots"),
        requestId: "beta-preview",
      },
    );

    assert.equal(result.materialize.ok, true);
    if (!result.materialize.ok) return;

    const preview = result.materialize.result.executionResult.previewHosting;
    assert.equal(preview.available, true);
    assert.equal(typeof preview.previewEntryUrl, "string");

    const outputRootPath = result.materialize.result.executionResult.materialization.outputRootPath;
    assert.ok(outputRootPath);
    assert.equal(fs.existsSync(path.resolve(outputRootPath!, "index.html")), true);
  } finally {
    await server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("decision classification mapping is deterministic and follows protocol categories", () => {
  const hard = classifyProtocolDegradation({
    hardBlockers: ["MATERIALIZATION_FAILURE"],
    previewFindings: [],
  });
  assert.equal(hard, "HARD_BLOCKER");

  const unacceptable = classifyProtocolDegradation({
    hardBlockers: [],
    previewFindings: [{ code: "MAJOR_LAYOUT_BREAK", detail: "layout" }],
  });
  assert.equal(unacceptable, "DEGRADED_UNACCEPTABLE");

  const acceptable = classifyProtocolDegradation({
    hardBlockers: [],
    previewFindings: [{ code: "MINOR_ASSET_MISMATCH", detail: "asset mismatch" }],
  });
  assert.equal(acceptable, "DEGRADED_ACCEPTABLE");

  const cosmetic = classifyProtocolDegradation({
    hardBlockers: [],
    previewFindings: [{ code: "SMALL_ICON_MISMATCH", detail: "icon" }],
  });
  assert.equal(cosmetic, "COSMETIC_ONLY");

  const decisionA = decideProtocolAction({ classification: "DEGRADED_ACCEPTABLE", score: 3.5 });
  const decisionB = decideProtocolAction({ classification: "DEGRADED_ACCEPTABLE", score: 3.5 });
  assert.equal(decisionA, "PROCEED_WITH_MANUAL_POLISH");
  assert.equal(decisionA, decisionB);
});
