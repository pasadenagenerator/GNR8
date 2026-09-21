import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  AIRSHIP_SIDECAR_BUILDER_CAPABILITIES,
  AirshipSidecarBuilderAdapter,
  buildAirshipCommandDescriptor,
} from "./builder-adapter";

async function makeWorkspace(): Promise<string> {
  const workspaceDir = await mkdtemp(join(tmpdir(), "gnr8-airship-builder-adapter-test-"));
  await writeFile(
    join(workspaceDir, "index.html"),
    "<!doctype html><html><body><h1 data-airship-element=\"hero-headline\">Original headline</h1></body></html>\n",
    "utf8",
  );
  await writeFile(join(workspaceDir, "package.json"), `${JSON.stringify({ private: true }, null, 2)}\n`, "utf8");
  return workspaceDir;
}

test("Airship adapter reports proof-only sidecar capabilities", () => {
  const adapter = new AirshipSidecarBuilderAdapter();

  assert.deepEqual(adapter.getCapabilities(), AIRSHIP_SIDECAR_BUILDER_CAPABILITIES);
  assert.equal(adapter.getCapabilities().supportsSidecarSession, true);
  assert.equal(adapter.getCapabilities().supportsStaticHtmlTarget, true);
  assert.equal(adapter.getCapabilities().supportsFileDiffCapture, true);
  assert.equal(adapter.getCapabilities().supportsDirectReactEmbed, false);
  assert.equal(adapter.getCapabilities().requiresLocalProcess, true);
  assert.equal(adapter.getCapabilities().requiresSourceBackedWorkspace, true);
  assert.equal(adapter.getCapabilities().productionReady, false);
});

test("buildAirshipCommandDescriptor creates a manual command descriptor", () => {
  const command = buildAirshipCommandDescriptor({
    workspaceDir: "/tmp/gnr8-airship-proof",
    target: {
      type: "static-html-localhost",
      host: "127.0.0.1",
      targetPort: 4178,
      sessionPort: 4179,
      mode: "canvas",
    },
  });

  assert.equal(command.executable, "pnpm");
  assert.deepEqual(command.args, [
    "dlx",
    "@airshiplabs/cli",
    "--target",
    "4178",
    "--port",
    "4179",
    "--host",
    "127.0.0.1",
    "--agent",
    "codex",
    "--safe",
    "--cwd",
    "/tmp/gnr8-airship-proof",
    "--mode",
    "canvas",
  ]);
  assert.equal(command.cwd, "/tmp/gnr8-airship-proof");
  assert.equal(command.expectedSessionUrl, "http://127.0.0.1:4179/");
  assert.equal(command.manualOnly, true);
  assert.equal(command.launchesProcess, false);
});

test("prepareSession records a descriptor and does not launch Airship", async () => {
  const workspaceDir = await makeWorkspace();
  const adapter = new AirshipSidecarBuilderAdapter();

  try {
    const result = await adapter.prepareSession({
      sessionId: "session-no-launch",
      workspaceDir,
      target: { type: "static-html-localhost", targetPort: 4178 },
    });

    assert.equal(result.status, "descriptor_ready");
    assert.equal(result.launched, false);
    assert.equal(result.command.launchesProcess, false);
    assert.equal(result.command.manualOnly, true);
    assert.equal(result.command.expectedSessionUrl, "http://127.0.0.1:4179/");
    assert.equal(result.session.baselineHashes.some((file) => file.path === "index.html"), true);
    assert.equal(result.session.baselineHashes.some((file) => file.path === "package.json"), true);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test("captureSession reports local workspace hash and text diffs", async () => {
  const workspaceDir = await makeWorkspace();
  const adapter = new AirshipSidecarBuilderAdapter();

  try {
    const { session } = await adapter.prepareSession({
      sessionId: "session-capture",
      workspaceDir,
      target: { type: "static-html-localhost", targetPort: 4178, sessionPort: 4179 },
    });

    await writeFile(
      join(workspaceDir, "index.html"),
      "<!doctype html><html><body><h1 data-airship-element=\"hero-headline\">Airship real capture test</h1></body></html>\n",
      "utf8",
    );

    const capture = await adapter.captureSession(session);
    assert.equal(capture.status, "captured");
    assert.equal(capture.indexHtmlChanged, true);
    assert.equal(capture.changedFiles.length, 1);

    const [changedFile] = capture.changedFiles;
    assert.equal(changedFile.path, "index.html");
    assert.equal(changedFile.status, "modified");
    assert.match(changedFile.unifiedDiff ?? "", /-<!doctype html>.*Original headline/);
    assert.match(changedFile.unifiedDiff ?? "", /\+<!doctype html>.*Airship real capture test/);
    assert.match(changedFile.snapshot ?? "", /Airship real capture test/);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test("cleanupSession removes only safe proof metadata", async () => {
  const workspaceDir = await makeWorkspace();
  const adapter = new AirshipSidecarBuilderAdapter();

  try {
    const { session } = await adapter.prepareSession({
      sessionId: "session-cleanup",
      workspaceDir,
      target: { type: "static-html-localhost", targetPort: 4178 },
    });

    assert.ok(session.metadataPath);
    assert.match(await readFile(session.metadataPath, "utf8"), /airship-sidecar-builder-adapter/);

    const cleanup = await adapter.cleanupSession(session);
    assert.equal(cleanup.status, "cleaned");
    assert.equal(cleanup.removedMetadataPath, session.metadataPath);

    const capture = await adapter.captureSession(session);
    assert.deepEqual(capture.changedFiles, []);
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});
