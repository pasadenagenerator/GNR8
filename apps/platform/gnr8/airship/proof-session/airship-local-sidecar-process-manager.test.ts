import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer, type Server } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  AirshipLocalSidecarProcessManager,
  buildAirshipLocalSidecarManualRecord,
  type AirshipLocalSidecarCommandDescriptor,
} from "./airship-local-sidecar-process-manager";

const execFileAsync = promisify(execFile);

async function makeWorkspace(options: { git?: boolean; commit?: boolean; dirty?: boolean } = {}): Promise<string> {
  const workspaceDir = await mkdtemp(join(tmpdir(), "gnr8-airship-local-sidecar-manager-test-"));
  await writeFile(
    join(workspaceDir, "index.html"),
    "<!doctype html><html><body><h1 data-airship-element=\"hero-headline\">Original headline</h1></body></html>\n",
    "utf8",
  );
  await writeFile(
    join(workspaceDir, "package.json"),
    `${JSON.stringify({ private: true, name: "gnr8-airship-local-sidecar-manager-test", version: "0.0.0" }, null, 2)}\n`,
    "utf8",
  );
  if (options.git !== false) {
    await execFileAsync("git", ["init", "-b", "main"], { cwd: workspaceDir });
    await execFileAsync("git", ["config", "user.email", "proof-session@gnr8.local"], { cwd: workspaceDir });
    await execFileAsync("git", ["config", "user.name", "GNR8 Airship Proof"], { cwd: workspaceDir });
    await execFileAsync("git", ["add", "index.html", "package.json"], { cwd: workspaceDir });
    if (options.commit !== false) await execFileAsync("git", ["commit", "-m", "baseline"], { cwd: workspaceDir });
  }
  if (options.dirty) await writeFile(join(workspaceDir, "untracked.txt"), "dirty\n", "utf8");
  return workspaceDir;
}

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  await new Promise<void>((resolveClose, rejectClose) => server.close((error) => (error ? rejectClose(error) : resolveClose())));
  if (!address || typeof address === "string") throw new Error("free_port_unavailable");
  return address.port;
}

function airshipFixtureCommand(input: { port: number; cwd: string; exitAfterMs?: number }): AirshipLocalSidecarCommandDescriptor {
  const script = [
    "const http = require('node:http');",
    "const port = Number(process.argv[1]);",
    "const exitAfterMs = Number(process.argv[2] || 0);",
    "const server = http.createServer((request, response) => {",
    "response.writeHead(200, {'content-type': 'text/plain', 'cache-control': 'no-store'});",
    "response.end(request.url === '/' ? 'airship fixture ok' : 'airship fixture path ok');",
    "});",
    "server.listen(port, '127.0.0.1', () => { if (exitAfterMs > 0) setTimeout(() => process.exit(7), exitAfterMs); });",
    "process.on('SIGTERM', () => server.close(() => process.exit(0)));",
  ].join("");
  const args = ["-e", script, String(input.port), String(input.exitAfterMs ?? 0)];
  return {
    executable: process.execPath,
    args,
    cwd: input.cwd,
    commandLine: [process.execPath, ...args].join(" "),
    description: "Airship-like local HTTP fixture for process ownership tests.",
  };
}

async function urlReachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(750), cache: "no-store" });
    await response.arrayBuffer();
    return response.ok;
  } catch {
    return false;
  }
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, rejectClose) => server.close((error) => (error ? rejectClose(error) : resolveClose())));
}

test("owned static target and Airship-like fixture start, health-check, and stop cleanly", async () => {
  const workspaceDir = await makeWorkspace();
  const manager = new AirshipLocalSidecarProcessManager();
  const targetPort = await freePort();
  const airshipPort = await freePort();
  let session: Awaited<ReturnType<AirshipLocalSidecarProcessManager["startSession"]>> | null = null;

  try {
    session = await manager.startSession({
      sessionId: "owned-start-health-stop",
      workspacePath: workspaceDir,
      targetPort,
      airshipPort,
      airshipCommand: airshipFixtureCommand({ port: airshipPort, cwd: workspaceDir }),
      healthTimeoutMs: 4_000,
    });

    assert.equal(session.status, "running");
    assert.equal(session.ownedByManager, true);
    assert.equal(session.realAirshipCliLaunched, false);
    assert.ok(session.processIds.staticTargetPid);
    assert.ok(session.processIds.airshipSidecarPid);
    assert.equal(session.staticTargetUrl, `http://127.0.0.1:${targetPort}/`);
    assert.equal(session.airshipSessionUrl, `http://127.0.0.1:${airshipPort}/`);
    assert.equal(session.health.status, "healthy");
    assert.equal(session.health.staticTarget.ok, true);
    assert.equal(session.health.airshipSession.ok, true);

    const stopped = await manager.stopSession(session);
    session = null;
    assert.equal(stopped.status, "clean");
    assert.equal(stopped.cleanup.status, "clean");
    assert.equal(stopped.health.status, "stopped");
    assert.equal(stopped.cleanup.stoppedPids.length, 2);
    assert.equal(await urlReachable(`http://127.0.0.1:${targetPort}/`), false);
    assert.equal(await urlReachable(`http://127.0.0.1:${airshipPort}/`), false);
  } finally {
    if (session) await manager.stopSession(session);
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test("stop refuses a not-owned manual process record and leaves external listener running", async () => {
  const workspaceDir = await makeWorkspace();
  const manager = new AirshipLocalSidecarProcessManager();
  const targetPort = await freePort();
  const airshipPort = await freePort();
  const external = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("external manual listener");
  });
  await new Promise<void>((resolveListen) => external.listen(airshipPort, "127.0.0.1", resolveListen));

  try {
    const manual = buildAirshipLocalSidecarManualRecord({
      sessionId: "manual-not-owned",
      workspacePath: workspaceDir,
      targetPort,
      airshipPort,
    });
    const stopped = await manager.stopSession(manual);

    assert.equal(stopped.status, "not-owned");
    assert.equal(stopped.cleanup.status, "not-owned");
    assert.match(stopped.cleanup.manualCleanupInstructions.join("\n"), /not owned by this manager/i);
    assert.equal(await urlReachable(`http://127.0.0.1:${airshipPort}/`), true);
  } finally {
    await closeServer(external);
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test("manager reports stopped or failed status after an owned sidecar process exits", async () => {
  const workspaceDir = await makeWorkspace();
  const manager = new AirshipLocalSidecarProcessManager();
  const targetPort = await freePort();
  const airshipPort = await freePort();
  let session: Awaited<ReturnType<AirshipLocalSidecarProcessManager["startSession"]>> | null = null;

  try {
    session = await manager.startSession({
      sessionId: "sidecar-exits",
      workspacePath: workspaceDir,
      targetPort,
      airshipPort,
      airshipCommand: airshipFixtureCommand({ port: airshipPort, cwd: workspaceDir, exitAfterMs: 200 }),
      healthTimeoutMs: 4_000,
    });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));

    const status = await manager.status(session);
    assert.equal(status.airshipSidecar.status, "failed");
    assert.equal(status.airshipSidecar.exitCode, 7);
    assert.equal(status.status, "failed");
    assert.equal(status.health.status, "stopped");
  } finally {
    if (session) await manager.stopSession(session);
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test("startup failure on an occupied port does not kill the external process on that port", async () => {
  const workspaceDir = await makeWorkspace();
  const manager = new AirshipLocalSidecarProcessManager();
  const targetPort = await freePort();
  const airshipPort = await freePort();
  const external = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("external target listener");
  });
  await new Promise<void>((resolveListen) => external.listen(targetPort, "127.0.0.1", resolveListen));

  try {
    await assert.rejects(
      () => manager.startSession({
        sessionId: "occupied-static-port",
        workspacePath: workspaceDir,
        targetPort,
        airshipPort,
        airshipCommand: airshipFixtureCommand({ port: airshipPort, cwd: workspaceDir }),
        healthTimeoutMs: 500,
      }),
      /airship_local_sidecar_static_target_unhealthy|airship_local_sidecar_airship_session_unhealthy/,
    );
    assert.equal(await urlReachable(`http://127.0.0.1:${targetPort}/`), true);
  } finally {
    await closeServer(external);
    await rm(workspaceDir, { recursive: true, force: true });
  }
});

test("workspace contract validation blocks missing .git, missing baseline, and dirty initial status", async () => {
  const manager = new AirshipLocalSidecarProcessManager();
  const missingGit = await makeWorkspace({ git: false });
  const missingBaseline = await makeWorkspace({ commit: false });
  const dirty = await makeWorkspace({ dirty: true });

  try {
    await assert.rejects(() => manager.validateWorkspaceContract(missingGit), /airship_local_sidecar_workspace_missing_git/);
    await assert.rejects(() => manager.validateWorkspaceContract(missingBaseline), /airship_local_sidecar_workspace_baseline_commit_missing/);
    await assert.rejects(() => manager.validateWorkspaceContract(dirty), /airship_local_sidecar_workspace_initial_git_status_not_clean/);
  } finally {
    await rm(missingGit, { recursive: true, force: true });
    await rm(missingBaseline, { recursive: true, force: true });
    await rm(dirty, { recursive: true, force: true });
  }
});

test("real Airship CLI launch is explicit and fixture tests do not invoke pnpm dlx", async () => {
  const workspaceDir = await makeWorkspace();
  const manager = new AirshipLocalSidecarProcessManager();

  try {
    await assert.rejects(
      () => manager.startSession({
        sessionId: "real-cli-not-implicit",
        workspacePath: workspaceDir,
        targetPort: 45101,
        airshipPort: 45102,
      }),
      /airship_local_sidecar_real_cli_requires_explicit_start/,
    );
  } finally {
    await rm(workspaceDir, { recursive: true, force: true });
  }
});
