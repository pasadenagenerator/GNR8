/**
 * Local acceptance through the actual GNR8 React panel, session handlers,
 * private-store SDK transport, patched Studio and fresh-runtime recovery.
 * Args: prepared runtime directory, retained prior replay's restored workspace.
 * Only auth identity and Vercel/Supabase I/O boundaries are replaced.
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from "node:fs/promises";
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
import { parseStackiRecord, type StackiDraftFile } from "./stacki-draft-contract";

const runtimeDir = resolve(process.argv[2]);
const retained = resolve(process.argv[3]);
const root = await mkdtemp(join(tmpdir(), "gnr8-stacki-session-ui-"));
// Optional retained legacy checkpoint seeds only this disposable local store.
const raw = process.argv[4] ? JSON.parse(await readFile(resolve(process.argv[4]), "utf8")) : null;
const legacy = raw ? parseStackiRecord(raw, raw.scope, raw.revision) : null;
const initialRevision = legacy?.revision ?? 1;
const scope = legacy?.scope ?? { agencyId: "11111111-1111-4111-8111-111111111111", clientId: "22222222-2222-4222-8222-222222222222",
  siteId: "33333333-3333-4333-8333-333333333333", siteVersionId: "44444444-4444-4444-8444-444444444444" };
const actor = { userId: legacy?.actorUserId ?? "55555555-5555-4555-8555-555555555555", agencyId: scope.agencyId };
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
let starts = 0;
const provider: StackiSessionProvider = {
  async start(session, files) {
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
  drafts: freshDrafts, sessions: () => sessions, provider: () => provider });
const require = createRequire(join(runtimeDir, "studio/package.json"));
const { build } = require("esbuild");
const panel = resolve("apps/platform/app/gnr8/agency/clients/[clientId]/sites/[siteId]/StackiEditorPanel.tsx");
await build({ stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
import Panel from ${JSON.stringify(panel)};createRoot(document.getElementById('root')).render(React.createElement(Panel,${JSON.stringify(scope)}));`,
  resolveDir: dirname(panel), loader: "tsx" }, bundle: true, format: "esm", platform: "browser",
  jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, outfile: join(root, "panel.js") });
const evidence: Record<string, unknown> = { localOnly: true, hostedExecutions: 0, actualPanel: panel, retainedInput: retained,
  legacyInput: legacy ? { revision: legacy.revision, sha256: legacy.sha256 } : null,
  actions: [], starts: 0, removedWorkspaces: [] };
const failResponses = new Set<string>();
const server = createServer(async (req, res) => {
  try {
    const url = `http://${req.headers.host}${req.url}`;
    if (req.url === "/") {
      res.setHeader("content-type", "text/html"); res.end('<!doctype html><html lang="sl"><meta charset="utf-8"><title>GNR8 · Stacki integration proof</title><style>body{font:16px system-ui;max-width:950px;margin:60px auto;color:#172554}button{padding:12px;cursor:pointer}p{line-height:1.6}</style><div id="root"></div><script type="module" src="/panel.js"></script>'); return;
    }
    if (req.url === "/panel.js") { res.setHeader("content-type", "text/javascript"); res.end(await readFile(join(root, "panel.js"))); return; }
    if (req.method !== "POST") { res.writeHead(404).end(); return; }
    let body = ""; for await (const bytes of req) { body += bytes; assert(body.length < 4096); }
    const response = await routes.POST(new Request(url, { method: "POST", headers: req.headers as Record<string, string>, body }),
      { params: Promise.resolve(scope) });
    const result = await response.json();
    const action = JSON.parse(body);
    const loseResponse = action.action === "save" && result.revision === initialRevision + 1 && !failResponses.has(action.operationId);
    (evidence.actions as unknown[]).push({ action: action.action, operationId: action.operationId, status: response.status,
      browserStatus: loseResponse ? 503 : response.status, revision: result.revision, closed: result.closed });
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
console.log(JSON.stringify({ origin, root, retained, mode: "CUA browser proof; local I/O only" }));
process.on("SIGTERM", () => { void shutdown(); });
process.on("SIGINT", () => { void shutdown(); });
async function shutdown() {
  for (const item of live.values()) await item.runtime.close();
  server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
  process.exit(0);
}
