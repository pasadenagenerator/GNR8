/**
 * Local acceptance through the actual GNR8 React panel, session handlers,
 * private-store SDK transport, patched Studio and fresh-runtime recovery.
 * Args: prepared runtime directory, retained prior replay's restored workspace.
 * Optional --verify-runtime exercises HTTP/session Save/reopen/build, not browser interaction.
 * Only auth identity and Vercel/Supabase I/O boundaries are replaced.
 */
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {createHash} from "node:crypto";
import {StackiAssetPreparation,type StackiAssetPlan} from "./stacki-asset-preparation";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createStackiRuntimeCheckpoint } from "./stacki-runtime-checkpoint";
import { captureStackiRuntimeFiles } from "./stacki-runtime-files";
import { createStackiLocalStorage } from "./stacki-local-storage-transport";
import { SupabaseStackiDraftStore } from "./stacki-draft-store";
import { StackiSessionStore } from "./stacki-session-store";
import { createStackiDraftRouteHandlers } from "./stacki-draft-route-handlers";
import { createStackiSessionRoutes, type StackiSessionProvider } from "./stacki-session-routes";
import { startStackiEditorRuntime } from "./stacki-editor-runtime";
import { parseStackiRecord, stackiSourceSha256, type StackiDraftFile } from "./stacki-draft-contract";

// Optional local-only preparation adapter reuses this same browser/session proof.
const adapterPath = process.argv.find(arg => arg.startsWith('--preparation-adapter='))?.split('=')[1];
const preparation = adapterPath ? await import(pathToFileURL(resolve(adapterPath)).href) : null;
let prepared = !preparation;
const runtimeDir = resolve(process.argv[2]);
const retained = resolve(process.argv[3]);
const root = await mkdtemp(join(tmpdir(), "gnr8-stacki-session-ui-"));
// Optional retained legacy checkpoint seeds only this disposable local store.
const verifyRuntime = process.argv.includes("--verify-runtime");
const legacyPath = process.argv.slice(4).find(arg => !arg.startsWith("--"));
const raw = legacyPath ? JSON.parse(await readFile(resolve(legacyPath), "utf8")) : null;
const legacy = raw ? parseStackiRecord(raw, raw.scope, raw.revision) : null;
const initialRevision = legacy?.revision ?? 1;
const scope = preparation?.targetScope ?? legacy?.scope ?? { agencyId: "11111111-1111-4111-8111-111111111111", clientId: "22222222-2222-4222-8222-222222222222",
  siteId: "33333333-3333-4333-8333-333333333333", siteVersionId: "44444444-4444-4444-8444-444444444444" };
const actor = { userId: preparation?.actor ?? legacy?.actorUserId ?? "55555555-5555-4555-8555-555555555555", agencyId: scope.agencyId };
const transport = createStackiLocalStorage(join(root, "storage"));
function freshDrafts() {
  const fresh = createStackiLocalStorage(join(root, "storage"));
  return new SupabaseStackiDraftStore(fresh.client, fresh.bucket);
}
const drafts = freshDrafts();
if (legacy) {
  const key = `stacki-checkpoints/v1/${Object.values(scope).join("/")}/${String(legacy.revision).padStart(4, "0")}.json`;
  const seeded = await transport.client.storage.from(transport.bucket).upload(key, Buffer.from(JSON.stringify(legacy)),
    { contentType: "application/json", cacheControl: "0", upsert: false });
  assert.equal(seeded.error, null);
}
const sessions = new StackiSessionStore(transport.client, transport.bucket);
const source = legacy?.files ?? await captureStackiRuntimeFiles(retained);
const authorized = async (selected: typeof scope) => { assert.deepEqual(selected, scope); return actor; };
const prepare = createStackiDraftRouteHandlers({ enabled: () => true, authorize: authorized, store: () => drafts, source: async () => source }).PREPARE;
const live = new Map<string, { runtime: Awaited<ReturnType<typeof startStackiEditorRuntime>>; astroPort: number; workspace: string; capture: ReturnType<typeof createStackiRuntimeCheckpoint> }>();
const origins = new Set<string>();
async function freePort() {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert(address && typeof address !== "string");
  await new Promise<void>(resolve => server.close(() => resolve()));
  return address.port;
}
const retainedBodies=new Map<string,Buffer>();
for(const name of await readdir(join(retained,"node_modules/.gnr8-retained-assets")).catch(()=>[])){
  assert(/^[a-f0-9]{64}$/.test(name));retainedBodies.set(name,await readFile(join(retained,"node_modules/.gnr8-retained-assets",name)));
}
const entries=[...retainedBodies].sort(([a],[b])=>a.localeCompare(b)).map(([name,body])=>({path:name,name,sha256:createHash("sha256").update(body).digest("hex"),bytes:body.length}));
const assetPlan:StackiAssetPlan={identity:createHash("sha256").update(JSON.stringify({scope,entries})).digest("hex"),entries,
  read:async selection=>selection.map(entry=>({name:entry.name,body:retainedBodies.get(entry.name)!}))};
const assetCache=new StackiAssetPreparation(transport.client,transport.bucket);
let starts = 0;
const provider: StackiSessionProvider = {
  async start(session, files,assets=[]) {
    assert.deepEqual(assets,entries.map(entry=>({name:entry.name,body:retainedBodies.get(entry.name)!})),"complete cached bytes reach provider");
    starts++;
    assert.deepEqual(files.filter(file => file.path.startsWith("public/")),
      source.filter(file => file.path.startsWith("public/")), "all original asset bytes restored");
    const workspace = join(root, session.id);
    await mkdir(workspace);
    for (const file of files) {
      const path = join(workspace, file.path);
      await mkdir(dirname(path), { recursive: true }); await writeFile(path, Buffer.from(file.base64, "base64"));
    }
    assert.deepEqual(await captureStackiRuntimeFiles(workspace), files, "every file restored before runtime starts");
    await symlink(join(retained, "node_modules"), join(workspace, "node_modules"));
    const astroPort = await freePort(), gatewayPort = await freePort();
    const origin = `http://127.0.0.1:${gatewayPort}`; origins.add(origin);
    const runtime = await startStackiEditorRuntime({
      workspace, studio: join(runtimeDir, "studio"), publicOrigin: origin, astroPort, gatewayPort,
      entryTicket: session.ticket, expiresAt: session.expiresAt - 60_000, allowLocalHttp: true,
      checkpointModule: join(runtimeDir, "capture.mjs"),
      persistence: { platformOrigin: session.platformOrigin, sessionId: session.id, revision: session.baseRevision },
    });
    const checkpoints = join(root, `${session.id}-checkpoints`); await mkdir(checkpoints);
    live.set(session.id, { runtime, astroPort, workspace, capture: createStackiRuntimeCheckpoint(checkpoints, astroPort) });
    assert.equal((await fetch(`${origin}/studio`)).status, 403);
    return { entryUrl: runtime.entryUrl };
  },
  async capture(session, operation) {
    const item = live.get(session.id); assert(item);
    const name = await item.capture(operation);
    return JSON.parse(await readFile(join(root, `${session.id}-checkpoints`, name), "utf8")) as StackiDraftFile[];
  },
  async stop(session) {
    const item = live.get(session.id);
    if (item) {
      await item.runtime.close();
      await writeFile(join(root, `${session.id}.log`), item.runtime.readLog());
      await rm(item.workspace, { recursive: true });
      (evidence.removedWorkspaces as string[]).push(item.workspace);
      live.delete(session.id);
    }
  },
};
const routes = createStackiSessionRoutes({ enabled: () => true, authorize: authorized, prepare,
  drafts: freshDrafts, sessions: () => sessions, provider: () => provider,
  retainedAssets:()=>assetCache.readAll(assetPlan),
  prepareAssets:async(_scope,index,identity,confirm)=>{
    assert(index===0&&identity===null||identity===assetPlan.identity);
    return assetCache.step(assetPlan,index,confirm);
  } });
const require = createRequire(join(runtimeDir, "studio/package.json"));
const { build } = require("esbuild");
const panel = resolve("apps/platform/app/gnr8/agency/clients/[clientId]/sites/[siteId]/StackiEditorPanel.tsx");
if (!verifyRuntime) await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
import Panel from ${JSON.stringify(panel)};createRoot(document.getElementById('root')).render(React.createElement(Panel,${JSON.stringify(preparation ? {...preparation.inputScope,candidatePreparationEnabled:true} : scope)}));`,
  resolveDir: dirname(panel), loader: "tsx" }, bundle: true, format: "esm", platform: "browser",
  jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, outfile: join(root, "panel.js") });
if (preparation) await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
import Panel from ${JSON.stringify(panel)};createRoot(document.getElementById('root')).render(React.createElement(Panel,${JSON.stringify({...scope,candidatePreparationEnabled:true})}));`,
resolveDir:dirname(panel),loader:'tsx'},bundle:true,format:'esm',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},outfile:join(root,'prepared-panel.js')});
const evidence: Record<string, unknown> = { localOnly: true, hostedExecutions: 0, actualPanel: panel, retainedInput: retained,
  legacyInput: legacy ? { revision: legacy.revision, sha256: legacy.sha256 } : null,
  actions: [], starts: 0, removedWorkspaces: [] };
const failResponses = new Set<string>();
const server = createServer(async (req, res) => {
  try {
    const url = `http://${req.headers.host}${req.url}`;
    if (req.url === "/" || (req.url === "/prepared" && prepared)) {
      res.setHeader("content-type", "text/html"); res.end('<!doctype html><html lang="sl"><meta charset="utf-8"><title>GNR8 · Stacki integration proof</title><style>body{font:16px system-ui;max-width:950px;margin:60px auto;color:#172554}button{padding:12px;cursor:pointer}p{line-height:1.6}</style><div id="root"></div>' + (preparation ? '<p><a href="/prepared">Izberi pripravljeno različico Astro 7</a></p>' : '') + '<script type="module" src="' + (req.url === '/prepared' ? '/prepared-panel.js' : '/panel.js') + '"></script>'); return;
    }
    if (req.url === '/prepared-panel.js' && prepared) {res.setHeader('content-type','text/javascript');res.end(await readFile(join(root,'prepared-panel.js')));return;}
    if (req.url === "/panel.js") { res.setHeader("content-type", "text/javascript"); res.end(await readFile(join(root, "panel.js"))); return; }
    if (req.method !== "POST") { res.writeHead(404).end(); return; }
    let body = ""; for await (const bytes of req) { body += bytes; assert(body.length < 4096); }
    if (req.url === '/api/gnr8/site-actions' && preparation) {
      assert.equal(req.headers.origin, origin);
      const request = JSON.parse(body);
      const result = await preparation.prepare(request, async () => drafts.latest(scope));
      if (result.checkpoint) {
        assert.deepEqual(result.checkpoint.scope,scope);
        const existing = await drafts.latest(scope);
        if (!existing) {
          const record = result.checkpoint;
          const key = `stacki-checkpoints/v1/${Object.values(scope).join('/')}/${String(record.revision).padStart(4,'0')}.json`;
          const stored = await transport.client.storage.from(transport.bucket).upload(key,Buffer.from(JSON.stringify(record)),{contentType:'application/json',cacheControl:'0',upsert:false});
          assert.equal(stored.error,null);
        }
        prepared = true;
      }
      evidence.preparation = result.evidence;
      await writeFile(join(root,'evidence.json'),JSON.stringify(evidence,null,2));
      res.setHeader('content-type','application/json');res.end(JSON.stringify({ok:true,result:{action:{resultSummary:'Prepared locally'}}}));return;
    }
    assert(prepared,'prepare through the user action first');
    const response = await routes.POST(new Request(url, { method: "POST", headers: req.headers as Record<string, string>, body }),
      { params: Promise.resolve(scope) });
    const result = await response.json();
    const action = JSON.parse(body);
    const loseResponse = action.action === "save" && result.revision === initialRevision + 1 && !failResponses.has(action.operationId);
    (evidence.actions as unknown[]).push({ action: action.action, operationId: action.operationId, status: response.status,
      browserStatus: loseResponse ? 503 : response.status, completed:result.completed,total:result.total, revision: result.revision, closed: result.closed });
    evidence.starts = starts;
    const latest = await drafts.latest(scope);
    if (latest) evidence.latest = { revision: latest.revision, sha256: latest.sha256, files: latest.files.length,
      assets: latest.files.filter(f => f.path.startsWith("public/")).map(f => ({ path: f.path, base64: f.base64 })).length,
      containsB: latest.files.some(f => f.path === "src/pages/index.astro" && Buffer.from(f.base64,"base64").toString().includes("Celovite rešitve – Save B")) };
    evidence.activeRuntimes = live.size;
    await writeFile(join(root, "evidence.json"), JSON.stringify(evidence, null, 2));
    // One deterministic ambiguous response after durable A. Same click must be retried.
    if (loseResponse) {
      failResponses.add(action.operationId); res.writeHead(503, {"content-type":"application/json"}).end('{"ok":false,"reason":"LOCAL_INJECTED_LOST_RESPONSE"}'); return;
    }
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(JSON.stringify(result));
  } catch { res.writeHead(500).end(); }
});
await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
const address = server.address(); assert(address && typeof address !== "string");
const origin = `http://127.0.0.1:${address.port}`; origins.add(origin);
console.log(JSON.stringify({ origin, root, retained, mode: verifyRuntime ? "HTTP/session runtime proof; local I/O only" : "CUA browser proof; local I/O only" }));
process.on("SIGTERM", () => { void shutdown(); });
process.on("SIGINT", () => { void shutdown(); });
async function shutdown() {
  for (const item of live.values()) await item.runtime.close();
  server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  process.exit(0);
}

// Reuse the same session/storage/runtime path on Linux without claiming a UI test.
// The normal interactive panel above remains available when this flag is absent.
if (verifyRuntime) {
  try {
    const call = async (body: Record<string, unknown>, expectedStatus = 200) => {
      const response = await fetch(`${origin}/session?agencyId=${scope.agencyId}`, {
        method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json();
      assert.equal(response.status, expectedStatus, JSON.stringify(result));
      return result;
    };
    const firstId = "66666666-6666-4666-8666-666666666666";
    const secondId = "77777777-7777-4777-8777-777777777777";
    await call({ action: "prepare-assets", id: firstId, index: 0, identity: null });
    const opened = await call({ action: "open", id: firstId });
    assert.equal(opened.revision, initialRevision);
    assert.equal(opened.sourceSha256, stackiSourceSha256(source));
    const entry = new URL(opened.entryUrl);
    const entryHeaders = { origin: entry.origin, "content-type": "text/plain;charset=UTF-8" };
    const ticket = entry.hash.slice(1);
    entry.hash = "";
    assert.equal((await fetch(new URL("/studio", entry))).status, 403);
    assert.equal((await fetch(entry, { method: "POST", headers: entryHeaders, body: "invalid" })).status, 403);
    const accepted = await fetch(entry, { method: "POST", headers: entryHeaders, body: ticket });
    assert.equal(accepted.status, 200);
    const cookie = accepted.headers.get("set-cookie")?.split(";")[0]; assert(cookie);
    assert.equal((await fetch(new URL("/studio", entry), { headers: { cookie } })).status, 200);
    const persistenceResponse = await fetch(new URL("/studio/api/gnr8-persistence", entry), { headers: { cookie } });
    assert.equal(persistenceResponse.status, 200);
    const persistence = await persistenceResponse.json();
    assert.equal(persistence.sourceSha256, opened.sourceSha256);
    assert.equal(persistence.sourceUnchanged, true);
    assert.equal((await fetch(entry, { method: "POST", headers: entryHeaders, body: ticket })).status, 403);
    const save = { action: "save", id: firstId, operationId: "88888888-8888-4888-8888-888888888888", expectedRevision: initialRevision };
    await call(save, 503); // Deliberately lost response after durable write.
    const saved = await call(save);
    assert.equal(saved.revision, initialRevision + 1);
    const record = await drafts.latest(scope); assert(record);
    assert.equal(saved.sourceSha256, stackiSourceSha256(record.files));
    for (const file of source) assert.deepEqual(record.files.find(savedFile => savedFile.path === file.path), file, `preserved ${file.path}`);
    await call({ action: "discard", id: firstId });
    const reopened = await call({ action: "open", id: secondId });
    assert.equal(reopened.revision, saved.revision);
    assert.equal(reopened.sourceSha256, saved.sourceSha256);
    const restored = live.get(secondId); assert(restored);
    assert.deepEqual(await captureStackiRuntimeFiles(restored.workspace), record.files, "exact saved revision reopened");
    await restored.runtime.close();
    const built = await promisify(execFile)(process.execPath,
      [join(restored.workspace, "node_modules/astro/bin/astro.mjs"), "build", "--config", "./astro.config.mjs"],
      { cwd: restored.workspace, env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" }, timeout: 180_000, maxBuffer: 2_000_000 });
    await writeFile(join(root, "restored-build.log"), built.stdout + built.stderr);
    evidence.runtimeVerification = { passed: true, mode: "HTTP/session API, not browser interaction", platform: process.platform,
      architecture: process.arch, node: process.versions.node, protectedAccess: true, ticketReuseRejected: true,
      lostResponseRetry: true, savedRevision: record.revision, savedSha256: record.sha256,
      sourceSha256: saved.sourceSha256, runtimeSourceReceiptVerified: true,
      baselineFilesPreserved: source.length, exactReopen: true, restoredBuild: true };
    await writeFile(join(root, "evidence.json"), JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence.runtimeVerification));
  } catch (error) {
    console.error(error);
    for (const [id, item] of live) await writeFile(join(root, `${id}.log`), item.runtime.readLog());
    process.exitCode = 1;
  } finally {
    for (const item of live.values()) await item.runtime.close();
    server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  }
}
