import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  AIRSHIP_PROOF_SESSION_ENTRY_VERSION,
  captureAirshipProofSessionChanges,
  mapAirshipProofSessionCapturedDiffToDraft,
  prepareAirshipProofSessionEntry,
} from "./airship-proof-session-entry";

const CHS_MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const execFileAsync = promisify(execFile);

async function withWorkspaceRoot<T>(fn: (workspaceRoot: string) => Promise<T>): Promise<T> {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "gnr8-airship-proof-session-entry-test-"));
  try {
    return await fn(workspaceRoot);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
}

test("prepareAirshipProofSessionEntry prepares CHS source-backed proof workspace", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    const prepared = await prepareAirshipProofSessionEntry({
      migrationId: CHS_MIGRATION_ID,
      workspaceRoot,
      sessionId: "prepare-chs",
      targetPort: 4210,
      sessionPort: 4211,
    });

    assert.equal(prepared.proofOnly, true);
    assert.equal(prepared.localManualOnly, true);
    assert.equal(prepared.selectedArtifact.key, "chs-polished-demo");
    assert.equal(prepared.selectedArtifact.migrationId, CHS_MIGRATION_ID);
    assert.equal(prepared.selectedArtifact.importedSite, "chs.si");
    assert.equal(prepared.targetUrl, "http://127.0.0.1:4210/");
    assert.equal(prepared.expectedAirshipSessionUrl, "http://127.0.0.1:4211/");
    assert.equal(prepared.healthReadbackUrl, null);

    const html = await readFile(join(prepared.workspacePath, "index.html"), "utf8");
    const packageJson = JSON.parse(await readFile(join(prepared.workspacePath, "package.json"), "utf8"));
    const metadata = JSON.parse(await readFile(join(prepared.workspacePath, "gnr8-airship-proof-session.json"), "utf8"));

    assert.match(html, /data-airship-section="hero"/);
    assert.match(html, /data-airship-element="hero-headline"/);
    assert.match(html, /The CHS team helps your IT change/);
    assert.equal(packageJson.private, true);
    assert.equal(packageJson.name, "gnr8-airship-proof-session");
    assert.equal(packageJson.version, "0.0.0");
    assert.equal(packageJson.scripts.serve, "python3 -m http.server 4210 --bind 127.0.0.1 --directory .");
    assert.equal(metadata.serviceVersion, AIRSHIP_PROOF_SESSION_ENTRY_VERSION);
    assert.equal(metadata.proofOnly, true);
    assert.equal(metadata.boundaries.noPublishMutation, true);

    const gitStatus = await execFileAsync("git", ["status", "--short"], { cwd: prepared.workspacePath });
    const gitHead = await execFileAsync("git", ["log", "--oneline", "-1"], { cwd: prepared.workspacePath });
    assert.equal(gitStatus.stdout, "");
    assert.match(gitHead.stdout, /baseline/);
    assert.equal(prepared.adapterSession.workspaceContract.requiresGitRepository, true);
  });
});

test("proof session command descriptors include target, cwd, and manual ports", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    const prepared = await prepareAirshipProofSessionEntry({
      migrationId: CHS_MIGRATION_ID,
      workspaceRoot,
      sessionId: "command-readback",
      targetPort: 4220,
      sessionPort: 4225,
    });

    assert.equal(prepared.localRunnerCommand.executable, "python3");
    assert.deepEqual(prepared.localRunnerCommand.args, [
      "-m",
      "http.server",
      "4220",
      "--bind",
      "127.0.0.1",
      "--directory",
      prepared.workspacePath,
    ]);
    assert.equal(prepared.localRunnerCommand.cwd, prepared.workspacePath);
    assert.equal(prepared.localRunnerCommand.manualOnly, true);
    assert.equal(prepared.localRunnerCommand.launchesProcess, false);

    assert.equal(prepared.manualAirshipCommand.executable, "pnpm");
    assert.deepEqual(prepared.manualAirshipCommand.args, [
      "dlx",
      "@airshiplabs/cli",
      "--target",
      "4220",
      "--port",
      "4225",
      "--host",
      "127.0.0.1",
      "--agent",
      "codex",
      "--safe",
      "--cwd",
      prepared.workspacePath,
      "--mode",
      "canvas",
    ]);
    assert.equal(prepared.manualAirshipCommand.cwd, prepared.workspacePath);
    assert.equal(prepared.manualAirshipCommand.manualOnly, true);
    assert.equal(prepared.manualAirshipCommand.launchesProcess, false);
    assert.match(prepared.manualAirshipCommand.commandLine, /@airshiplabs\/cli/);
  });
});

test("prepareAirshipProofSessionEntry captures initial hashes and proof-only safety readback", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    const prepared = await prepareAirshipProofSessionEntry({
      migrationId: CHS_MIGRATION_ID,
      workspaceRoot,
      sessionId: "initial-hashes",
      targetPort: 4230,
    });

    const hashesByPath = new Map(prepared.initialHashes.map((hash) => [hash.path, hash]));
    assert.ok(hashesByPath.get("index.html")?.sha256);
    assert.ok(hashesByPath.get("package.json")?.sha256);
    assert.ok(hashesByPath.get("gnr8-airship-proof-session.json")?.sha256);
    assert.equal(hashesByPath.get("index.html")?.snapshot?.includes("CHS Airship MVP demo"), true);

    assert.equal(prepared.adapterSession.command.launchesProcess, false);
    assert.equal(prepared.adapterSession.command.manualOnly, true);
    assert.deepEqual(prepared.safety, {
      proofOnlyGuard: true,
      noAutoLaunch: true,
      noLivePointerMutation: true,
      noPublishMutation: true,
      noDnsMutation: true,
      noProviderMutation: true,
      noSourceCaptureImport: true,
      noDraftPersistence: true,
    });
    assert.match(prepared.warnings.join("\n"), /Proof-only and local\/manual/);
  });
});

test("captureAirshipProofSessionChanges detects changed index.html and sample edited string", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    const prepared = await prepareAirshipProofSessionEntry({
      migrationId: CHS_MIGRATION_ID,
      workspaceRoot,
      sessionId: "capture-changed-index",
      targetPort: 4240,
    });
    const htmlPath = join(prepared.workspacePath, "index.html");
    const originalHtml = await readFile(htmlPath, "utf8");
    await writeFile(htmlPath, originalHtml.replace("The CHS team helps your IT change with every technology wave.", "Airship Adapter 06 manual edit proof."), "utf8");

    const capture = await captureAirshipProofSessionChanges({
      preparedSession: prepared,
      sampleEditedString: "Airship Adapter 06 manual edit proof.",
    });

    assert.equal(capture.proofOnly, true);
    assert.equal(capture.status, "captured");
    assert.equal(capture.indexHtmlChanged, true);
    assert.equal(capture.sampleEditedStringFound, true);
    assert.equal(capture.changedFiles.some((file) => file.path === "index.html" && file.status === "modified"), true);
    assert.match(capture.changedFiles.find((file) => file.path === "index.html")?.unifiedDiff ?? "", /Airship Adapter 06 manual edit proof/);
    assert.equal(capture.warnings.join("\n").includes("not mapped into GNR8 drafts"), true);
  });
});

test("mapAirshipProofSessionCapturedDiffToDraft returns dry-run mapping without persistence writes", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    const prepared = await prepareAirshipProofSessionEntry({
      migrationId: CHS_MIGRATION_ID,
      workspaceRoot,
      sessionId: "dry-run-mapping",
      targetPort: 4245,
    });
    const htmlPath = join(prepared.workspacePath, "index.html");
    const originalHtml = await readFile(htmlPath, "utf8");
    const editedHtml = originalHtml.replace("The CHS team helps your IT change with every technology wave.", "Airship real capture test");
    await writeFile(htmlPath, editedHtml, "utf8");

    const mapping = await mapAirshipProofSessionCapturedDiffToDraft({ preparedSession: prepared });
    const htmlAfterMapping = await readFile(htmlPath, "utf8");

    assert.equal(mapping.proofOnly, true);
    assert.equal(mapping.localManualOnly, true);
    assert.equal(mapping.indexHtmlChanged, true);
    assert.equal(mapping.mapping.entries.length, 1);
    assert.equal(mapping.mapping.entries[0]?.changedElementMarker, "hero-headline");
    assert.equal(mapping.mapping.entries[0]?.draftFieldKey, "headline");
    assert.equal(mapping.mapping.entries[0]?.confidence, "exact");
    assert.equal(mapping.mapping.entries[0]?.nextText, "Airship real capture test");
    assert.equal(mapping.safety.noDraftPersistence, true);
    assert.equal(mapping.mapping.safety.noDraftPersistence, true);
    assert.equal(htmlAfterMapping, editedHtml);
    assert.match(mapping.warnings.join("\n"), /No GNR8 draft storage/);
  });
});

test("proof session refuses unknown artifacts and exposes no production side-effect affordances", async () => {
  await withWorkspaceRoot(async (workspaceRoot) => {
    await assert.rejects(
      () => prepareAirshipProofSessionEntry({
        migrationId: "ebf62324-1e51-4435-abd7-004722fb48d6",
        workspaceRoot,
        sessionId: "unknown-artifact",
      }),
      /airship_proof_session_known_good_artifact_missing/,
    );

    const prepared = await prepareAirshipProofSessionEntry({
      migrationId: CHS_MIGRATION_ID,
      workspaceRoot,
      sessionId: "side-effect-guard",
      targetPort: 4250,
    });

    assert.equal(prepared.adapterSession.command.launchesProcess, false);
    assert.equal(prepared.localRunnerCommand.launchesProcess, false);
    assert.equal(prepared.manualAirshipCommand.launchesProcess, false);
    assert.equal(prepared.safety.noPublishMutation, true);
    assert.equal(prepared.safety.noLivePointerMutation, true);
    assert.equal(prepared.safety.noDnsMutation, true);
    assert.equal(prepared.safety.noProviderMutation, true);
    assert.equal(prepared.safety.noSourceCaptureImport, true);
    assert.equal(prepared.safety.noDraftPersistence, true);
  });
});
