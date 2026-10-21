import { Sandbox, Snapshot } from "@vercel/sandbox";
import { parseStackiSave, STACKI_CHECKPOINT_MAX_BYTES, StackiDraftError, type StackiDraftFile } from "./stacki-draft-contract";
import type { StackiSessionProvider } from "./stacki-session-routes";
import { type StackiSession, type StackiSaveOperation } from "./stacki-session-store";
import { checkpointName } from "./stacki-runtime-checkpoint";

const root = "/vercel/sandbox/gnr8";
/** Explicitly ephemeral: no auto-resume, snapshots, drives or egress on user launches. */
export class VercelStackiProvider implements StackiSessionProvider {
  constructor(private readonly snapshotId: string, private readonly sdk: Pick<typeof Sandbox, "create" | "get"> = Sandbox,
    private readonly snapshots: Pick<typeof Snapshot, "get"> = Snapshot) {
    if (!/^snap_[A-Za-z0-9]+$/.test(snapshotId)) throw new StackiDraftError(503, "STACKI_RUNTIME_NOT_CONFIGURED");
  }
  async start(session: StackiSession, files: StackiDraftFile[]) {
    parseStackiSave({ expectedRevision: session.baseRevision, files });
    const remaining = session.expiresAt - Date.now();
    if (remaining < 120_000) throw new StackiDraftError(410, "STACKI_SESSION_EXPIRED");
    try {
      const snapshot = await this.snapshots.get({ snapshotId: this.snapshotId });
      if (snapshot.status !== "created" || (snapshot.expiresAt && snapshot.expiresAt.getTime() <= Date.now() + remaining))
        throw new StackiDraftError(503, "STACKI_RUNTIME_REFRESH_REQUIRED");
    } catch (error) {
      if ((error as { response?: Response }).response?.status === 404)
        throw new StackiDraftError(503, "STACKI_RUNTIME_REFRESH_REQUIRED");
      throw error;
    }
    const sandbox = await this.sdk.create({
      name: this.name(session), source: { type: "snapshot", snapshotId: this.snapshotId },
      persistent: false, timeout: remaining, resources: { vcpus: 2 },
      ports: [4357], networkPolicy: "deny-all", region: "iad1",
    });
    try {
      const manifest = await readBounded(sandbox, `${root}/runtime.json`, 16_384);
      const pinned = manifest ? JSON.parse(manifest.toString()) : null;
      if (pinned?.format !== "gnr8-stacki-runtime:v1" || pinned.platform !== "linux" ||
          pinned.studio !== "0.1.59" || pinned.astro !== "5.18.2" || pinned.checkpointHook !== 2 ||
          pinned.checkpointMaxBytes !== STACKI_CHECKPOINT_MAX_BYTES || pinned.siteDependenciesInstalled !== true ||
          pinned.upstreamCommit !== "36bab90a9ba5fb19134a13f6f1a9e71b2ea7ce24")
        throw new StackiDraftError(503, "STACKI_RUNTIME_REFRESH_REQUIRED");
      const clean = await sandbox.runCommand({ cmd: "node", args: ["--input-type=module", "-e",
        `import{readdir}from'node:fs/promises';const root=${JSON.stringify(root)};` +
        `const names=await readdir(root);if(names.some(n=>!['runtime.json','studio','entry.mjs','capture.mjs','site'].includes(n)))process.exit(1);` +
        `const site=await readdir(root+'/site');if(site.length!==1||site[0]!=='node_modules')process.exit(1);`] });
      if (clean.exitCode !== 0) throw new Error("STACKI_RUNTIME_IMAGE_NOT_CLEAN");
      const origin = sandbox.domain(4357);
      if (new URL(origin).protocol !== "https:") throw new Error("STACKI_PROVIDER_ORIGIN_INVALID");
      // The snapshot contains clean, pinned dependencies; no draft or credentials.
      await sandbox.writeFiles(files.map(file => ({ path: `${root}/site/${file.path}`, content: Buffer.from(file.base64, "base64") })));
      await sandbox.writeFiles([{ path: `${root}/session.json`, content: Buffer.from(JSON.stringify({
        publicOrigin: origin, entryTicket: session.ticket, expiresAt: session.expiresAt - 60_000,
        persistence: { platformOrigin: session.platformOrigin, sessionId: session.id, revision: session.baseRevision },
      })) }]);
      await sandbox.runCommand({ cmd: "node", args: [`${root}/entry.mjs`], detached: true });
      for (let n = 0; n < 60; n++) {
        const ready = await readBounded(sandbox, `${root}/ready.json`, 16_384);
        if (ready) {
          const value = JSON.parse(ready.toString());
          const expected = `${origin}/__gnr8/enter#${session.ticket}`;
          if (value.entryUrl !== expected) throw new Error("STACKI_RUNTIME_READY_INVALID");
          return { entryUrl: expected };
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      throw new Error("STACKI_RUNTIME_START_TIMEOUT");
    } catch (error) { await sandbox.stop().catch(() => {}); throw error; }
  }
  private async running(session: StackiSession) {
    const sandbox = await this.sdk.get({ name: this.name(session), resume: false });
    if (sandbox.persistent || sandbox.status !== "running" || Date.now() >= session.expiresAt)
      throw new StackiDraftError(410, "STACKI_SESSION_EXPIRED");
    return sandbox;
  }
  async capture(session: StackiSession, operation: StackiSaveOperation) {
    const name = checkpointName(operation);
    const sandbox = await this.running(session);
    const command = await sandbox.runCommand({
      cmd: "node", args: ["--input-type=module", "-e",
        `const r=await fetch('http://127.0.0.1:4358/checkpoint',{method:'POST',body:${JSON.stringify(JSON.stringify(operation))},signal:AbortSignal.timeout(35000)});if(!r.ok)process.exit(1);`],
    });
    if (command.exitCode !== 0) throw new StackiDraftError(503, "STACKI_CAPTURE_FAILED");
    const bytes = await readBounded(sandbox, `${root}/${name}`, STACKI_CHECKPOINT_MAX_BYTES);
    if (!bytes) throw new StackiDraftError(503, "STACKI_CAPTURE_FAILED");
    return parseStackiSave({ expectedRevision: operation.expectedRevision, files: JSON.parse(bytes.toString()) }).files;
  }
  async stop(session: StackiSession) {
    try {
      const sandbox = await this.sdk.get({ name: this.name(session), resume: false });
      if (sandbox.status === "running" || sandbox.status === "pending") await sandbox.stop();
    } catch (error) {
      // A missing ephemeral sandbox is already stopped; all other failures surface.
      if ((error as { response?: Response }).response?.status !== 404) throw error;
    }
  }
  private name(session: StackiSession) { return `gnr8-stacki-${session.id}`; }
}

/** Editable code is untrusted; never buffer an unbounded Sandbox file in Next. */
async function readBounded(sandbox: Sandbox, path: string, limit: number) {
  const controller = new AbortController();
  try {
    const stream = await sandbox.readFile({ path }, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
    if (!stream) return null;
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of stream) {
      const buffer = Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > limit) throw new StackiDraftError(413, "STACKI_CHECKPOINT_TOO_LARGE");
      chunks.push(buffer);
    }
    return Buffer.concat(chunks);
  } finally { controller.abort(); }
}
