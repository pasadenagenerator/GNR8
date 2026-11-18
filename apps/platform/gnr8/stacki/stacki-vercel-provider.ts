import type { StackiAssetDelivery } from './stacki-github-delivery';
import { STACKI_RETAINED_DIRECTORY, type StackiRuntimeAsset } from './stacki-retained-assets';
import { Sandbox, Snapshot } from "@vercel/sandbox";
import { parseStackiSave, STACKI_CHECKPOINT_MAX_BYTES, StackiDraftError, type StackiDraftFile } from "./stacki-draft-contract";
import type { StackiSessionProvider } from "./stacki-session-routes";
import { type StackiSession, type StackiSaveOperation } from "./stacki-session-store";
import { checkpointName } from "./stacki-runtime-checkpoint";
import { resolvedGitHubTarget } from './stacki-github-config';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const root = "/vercel/sandbox/gnr8";
/** Explicitly ephemeral: no auto-resume, snapshots, drives or egress on user launches. */
export class VercelStackiProvider implements StackiSessionProvider {
  constructor(private readonly snapshotId: string, private readonly sdk: Pick<typeof Sandbox, "create" | "get"> = Sandbox,
    private readonly snapshots: Pick<typeof Snapshot, "get"> = Snapshot) {
    if (!/^snap_[A-Za-z0-9]+$/.test(snapshotId)) throw new StackiDraftError(503, "STACKI_RUNTIME_NOT_CONFIGURED");
  }
  async start(session: StackiSession, files: StackiDraftFile[], retainedAssets:StackiRuntimeAsset[] = [], delivery?: StackiAssetDelivery) {
    parseStackiSave({ expectedRevision: session.baseRevision, files });
    const names=new Set<string>();let retainedBytes=0;
    for(const asset of retainedAssets){
      retainedBytes+=asset.body.length;
      if(!/^[a-f0-9]{64}$/.test(asset.name)||names.has(asset.name)||asset.body.length>12*1024*1024||
        retainedAssets.length>2000||retainedBytes>128*1024*1024)throw new StackiDraftError(422,'STACKI_RETAINED_ASSETS_INVALID');
      names.add(asset.name);
    }
    if (delivery && retainedBytes > 12 * 1024 * 1024) throw new StackiDraftError(413, 'STACKI_CHECKPOINT_TOO_LARGE');
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
    const github = Boolean(await resolvedGitHubTarget(session.scope));
    const studioAssets = github ? await Promise.all([
      ['studio-client.bundle.js','50b962be90f0dc8cdcd85fe9ca93abde7f8110d0eb5a7f7d6ea3636144f72291'],
      ['studio-client.bundle.css','e10129bfb34852fc62db3e93652c4bd87a2808670aa06ed70e1054088dff05af'],
    ].map(async ([name, expected]) => {
      const body = await readFile(join(process.cwd(),'gnr8/stacki',name)).catch(() =>
        readFile(join(process.cwd(),'apps/platform/gnr8/stacki',name)));
      if (createHash('sha256').update(body).digest('hex') !== expected)
        throw new StackiDraftError(503,'STACKI_RUNTIME_REFRESH_REQUIRED');
      return {path:`${root}/studio/dist/${name.endsWith('.css')?'studio.css':'studio.js'}`,content:body};
    })) : [];
    const sandbox = await this.sdk.create({
      name: this.name(session), source: { type: "snapshot", snapshotId: this.snapshotId },
      persistent: false, timeout: remaining, resources: { vcpus: 2 },
      ports: [4357], networkPolicy: session.aiToken && process.env.GNR8_AI_EXECUTION_ENABLED === "true"
        ? { allow: { [new URL(session.platformOrigin).hostname]: [
          { match: { method: ["POST"], path: { exact: "/api/gnr8/stacki/native-ai/chat/completions" } },
            transform: [{ headers: { "x-gnr8-stacki-egress": "native-ai" } }] },
          { response: { statusCode: 403 } },
        ] } } : "deny-all", region: "iad1",
    });
    try {
      const manifest = await readBounded(sandbox, `${root}/runtime.json`, 16_384);
      const pinned = manifest ? JSON.parse(manifest.toString()) : null;
      if (pinned?.format !== "gnr8-stacki-runtime:v1" || pinned.platform !== "linux" ||
          pinned.node !== "26.13.0" || pinned.studio !== "0.1.94" || pinned.astro !== "7.4.4" || pinned.checkpointHook !== 2 || pinned.entryReopenVersion !== 1 ||
          pinned.checkpointMaxBytes !== STACKI_CHECKPOINT_MAX_BYTES || pinned.siteDependenciesInstalled !== true || (delivery && pinned.lazyAssetsVersion !== 1) ||
          pinned.upstreamCommit !== "2ed510fbaf19e120c642f96a8e3047f15bcd71ab")
        throw new StackiDraftError(503, "STACKI_RUNTIME_REFRESH_REQUIRED");
      const clean = await sandbox.runCommand({ cmd: "node", args: ["--input-type=module", "-e",
        `import{readdir}from'node:fs/promises';const root=${JSON.stringify(root)};` +
        `const names=await readdir(root);if(names.some(n=>!['runtime.json','studio','entry.mjs','capture.mjs','site'].includes(n)))process.exit(1);` +
        `const site=await readdir(root+'/site');if(site.length!==1||site[0]!=='node_modules')process.exit(1);`] });
      if (clean.exitCode !== 0) throw new Error("STACKI_RUNTIME_IMAGE_NOT_CLEAN");
      if (session.aiToken && process.env.GNR8_AI_EXECUTION_ENABLED === "true") {
        const entry = await readFile(join(process.cwd(), 'gnr8/stacki/stacki-native-ai-entry.mjs')).catch(() =>
          readFile(join(process.cwd(), 'apps/platform/gnr8/stacki/stacki-native-ai-entry.mjs')));
        if (createHash('sha256').update(entry).digest('hex') !== '52f90ba2c8ce891869a4d1713bf28ccfd5038cd1e447c0593dc5c8648b18c5d9')
          throw new StackiDraftError(503, 'STACKI_RUNTIME_REFRESH_REQUIRED');
        const originalEntry = await sandbox.runCommand({ cmd: "node", args: ["--input-type=module", "-e", `
          import {readFile} from 'node:fs/promises';
          import {createHash} from 'node:crypto';
          const file=${JSON.stringify(`${root}/entry.mjs`)};
          if(createHash('sha256').update(await readFile(file)).digest('hex')!==
            '7bb928f1a638d06aa746c0eaed03f6c447b2ef86b3140928d176cfecdb9fcb60')process.exit(2);
        `] });
        if (originalEntry.exitCode !== 0) throw new StackiDraftError(503, 'STACKI_RUNTIME_REFRESH_REQUIRED');
        await sandbox.writeFiles([{ path: `${root}/entry.mjs`, content: entry }]);
      }
      if (github) {
        // Accept the original pinned image or the refreshed image carrying the
        // exact shipped Git panel. Never replace an unrecognized browser bundle.
        const originalCheck = await sandbox.runCommand({ cmd: "node", args: ["--input-type=module", "-e", `
          import {readFile} from 'node:fs/promises';
          import {createHash} from 'node:crypto';
          const path=${JSON.stringify(`${root}/studio/dist/studio.js`)};
          if(!['92442222a57a2dce89a1e84e1c66d97644ee4085acc5e61907a52fcb70a5bb12',
            '50b962be90f0dc8cdcd85fe9ca93abde7f8110d0eb5a7f7d6ea3636144f72291']
            .includes(createHash('sha256').update(await readFile(path)).digest('hex')))process.exit(2);
        `] });
        if (originalCheck.exitCode !== 0) throw new StackiDraftError(503, "STACKI_RUNTIME_REFRESH_REQUIRED");
        await sandbox.writeFiles(studioAssets);
      }
      const origin = sandbox.domain(4357);
      if (new URL(origin).protocol !== "https:") throw new Error("STACKI_PROVIDER_ORIGIN_INVALID");
      // The snapshot contains clean, pinned dependencies; no draft or credentials.
      const projectFiles = files.map(file => ({ path: `${root}/site/${file.path}`, content: Buffer.from(file.base64, "base64") }));
      const localAssets = retainedAssets.map(asset => ({path:`${root}/site/${STACKI_RETAINED_DIRECTORY}/${asset.name}`,content:asset.body}));
      if (delivery) {
        // The SDK streams a single archive. Hundreds of small linked SVG/CSS
        // files need no per-16-file round trips before the first page.
        await sandbox.writeFiles([...projectFiles, ...localAssets]);
      } else {
        await sandbox.writeFiles(projectFiles);
        for (let offset = 0; offset < localAssets.length; offset += 16)
          await sandbox.writeFiles(localAssets.slice(offset, offset + 16));
      }
      await sandbox.writeFiles([{ path: `${root}/session.json`, content: Buffer.from(JSON.stringify({
        publicOrigin: origin, entryTicket: session.ticket, expiresAt: session.expiresAt - 60_000,
        ...(delivery ? {assetDelivery:delivery} : {}),
        persistence: { platformOrigin: session.platformOrigin, sessionId: session.id, revision: session.baseRevision,
          storage: github ? 'github' : 'gnr8' },
        ...(session.aiToken && process.env.GNR8_AI_EXECUTION_ENABLED === "true" ? { nativeAi: {
          token: session.aiToken, endpoint: `${session.platformOrigin}/api/gnr8/stacki/native-ai/chat/completions`,
        } } : {}),
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
