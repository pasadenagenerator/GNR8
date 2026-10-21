/** Local-only replay of the retained baseline/A/B/retry workload, no provider I/O. */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { parseStackiRecord, type StackiDraftFile } from "./stacki-draft-contract";
import { SupabaseStackiDraftStore } from "./stacki-draft-store";
import { LegacyStackiDraftStore } from "./stacki-legacy-store.fixture";
import { createStackiLocalStorage } from "./stacki-local-storage-transport";
import { captureStackiRuntimeFiles } from "./stacki-runtime-files";
import { startStackiEditorRuntime } from "./stacki-editor-runtime";

const retained = resolve(".gnr8/stacki-github-proof");
await mkdir(resolve(".gnr8/stacki-deduplicated-storage"), { recursive: true });
const root = await mkdtemp(resolve(".gnr8/stacki-deduplicated-storage/run-"));
const raw = JSON.parse(await readFile(join(retained, "input.json"), "utf8"));
const input = parseStackiRecord(raw, raw.scope, raw.revision);
const provenance = JSON.parse(await readFile(join(retained, "provenance.json"), "utf8"));
assert.equal(input.revision, 5);
assert.equal(input.sha256, "4957be4767153e0f0099d7668516929fe852fb930a4ac1f83d5d6323ddc95c88");
assert.equal(input.sha256, provenance.sha256);
const hostedEvidence = await readFile(resolve("docs/product/evidence/stacki-save-hosted/evidence.json"), "utf8");
assert(hostedEvidence.includes(input.sha256));
const originalInputHash = hash(await readFile(join(retained, "input.json")));
const captures: StackiDraftFile[][] = [];
for (const name of ["initial", "A", "B"]) captures.push(JSON.parse(await readFile(join(retained, `capture-${name}.json`), "utf8")));
assert.deepEqual(captures[0], input.files);
const runtime = resolve("/private/tmp/gnr8-stacki-save-runtime-verified");
const require = createRequire(join(runtime, "studio/package.json"));
const Y = require("yjs");
const page = "src/pages/index.astro";
const state = ".studio-state/" + Buffer.from(page).toString("base64").replace(/=+$/g, "") + ".bin";
for (const files of captures) {
  const source = Buffer.from(files.find(f => f.path === page)!.base64, "base64").toString();
  const doc = new Y.Doc(); Y.applyUpdate(doc, Buffer.from(files.find(f => f.path === state)!.base64, "base64"));
  assert.equal(doc.getText("source").toString(), source); doc.destroy();
  for (const f of input.files.filter(f => f.path.startsWith("public/") || f.path.startsWith("src/pages/") && f.path !== page))
    assert.equal(files.find(candidate => candidate.path === f.path)?.base64, f.base64);
}
const measurements = [];
for (const kind of ["legacy", "deduplicated", "mixed"] as const) {
  const storage = join(root, kind);
  const transport = createStackiLocalStorage(storage);
  const store = kind === "legacy" ? new LegacyStackiDraftStore(transport.client, transport.bucket) :
    new SupabaseStackiDraftStore(transport.client, transport.bucket);
  const saves = [];
  const records = [];
  for (const [index, label] of ["initial", "A", "B", "retry-B"].entries()) {
    const revision = Math.min(index, 2);
    const start = performance.now(), offset = transport.calls.length;
    const writer = kind === "mixed" && index === 0 ? new LegacyStackiDraftStore(transport.client, transport.bucket) : store;
    const record = await writer.save(input.scope, input.actorUserId, { expectedRevision: revision, files: captures[revision] });
    saves.push({ label, ms: performance.now() - start, ...metrics(transport.calls.slice(offset)) });
    records.push(record);
  }
  assert.deepEqual(records[2], records[3]);
  const storedBytes = await sizeTree(storage);
  const save = metrics(transport.calls);
  const disposable = join(root, `${kind}-editing`);
  await materialize(disposable, captures[2]);
  await rm(disposable, { recursive: true });
  const fresh = createStackiLocalStorage(storage);
  const restoredStore = kind === "legacy" ? new LegacyStackiDraftStore(fresh.client, fresh.bucket) :
    new SupabaseStackiDraftStore(fresh.client, fresh.bucket);
  const start = performance.now();
  const latest = await restoredStore.latest(input.scope);
  const recovery = { ms: performance.now() - start, ...metrics(fresh.calls) };
  assert.deepEqual(latest, records[2]);
  const restored = join(root, `${kind}-restored`);
  await materialize(restored, latest!.files);
  assert.deepEqual(await captureStackiRuntimeFiles(restored), captures[2]);
  let assetCase;
  if (restoredStore instanceof SupabaseStackiDraftStore) {
    assert.deepEqual(await restoredStore.revision(input.scope, 1), records[0]);
    assert.deepEqual(await restoredStore.revision(input.scope, 2), records[1]);
  }
  if (kind === "deduplicated" && restoredStore instanceof SupabaseStackiDraftStore) {
    const asset = captures[2].find(f => f.path.endsWith("logatcan-slide5.jpg"))!;
    const replacement = captures[2].find(f => f.path.endsWith("logatcan-slide7.jpg"))!;
    assert(asset && replacement);
    // New valid JPEG bytes (COM segment), not merely a reference to an existing object.
    const jpeg = Buffer.from(replacement.base64, "base64");
    assert.equal(jpeg.subarray(0, 2).toString("hex"), "ffd8");
    const comment = Buffer.from("GNR8 local asset replacement proof");
    const marker = Buffer.from([0xff, 0xfe, 0, comment.length + 2]);
    const newBytes = Buffer.concat([jpeg.subarray(0, 2), marker, comment, jpeg.subarray(2)]);
    const files = captures[2].map(f => f.path === asset.path ? { ...f, base64: newBytes.toString("base64") } : f);
    const offset = fresh.calls.length, assetStart = performance.now();
    const assetRecord = await restoredStore.save(input.scope, input.actorUserId, { expectedRevision: 3, files });
    assetCase = { ms: performance.now() - assetStart, ...metrics(fresh.calls.slice(offset)),
      additionalStoredBytes: (await sizeTree(storage)) - storedBytes, bytes: newBytes.length, sha256: hash(newBytes) };
    assert.deepEqual(await restoredStore.revision(input.scope, 3), records[2]);
    assert.deepEqual(await restoredStore.revision(input.scope, 4), assetRecord);
    assert.equal(assetCase.uploads, 2, "one binary object plus one manifest");
    assert.equal(saves[2].uploads, 3, "only changed Astro and coherent Yjs state, plus manifest");
  }
  measurements.push({ kind, storedBytes, save, saves, recovery, assetCase });
}
assert.equal(measurements[0].storedBytes, 30_657_707, "same original workload, no omitted payloads");
const reduction = 1 - measurements[1].storedBytes / measurements[0].storedBytes;
assert(reduction >= 0.6);
assert.equal(hash(await readFile(join(retained, "input.json"))), originalInputHash);
const evidence = { checkedAt: new Date().toISOString(), localOnly: true, hostedCalls: 0,
  retainedInput: { revision: input.revision, sha256: input.sha256, files: input.files.length, originalInputHash,
    logicalBytes: input.files.reduce((n, f) => n + Buffer.from(f.base64, "base64").length, 0) },
  root, measurements, reduction, assertions: { exactAllFileRecovery: true, earlierRevisionRecovery: true,
    sourceAndYjsCoherent: true, all102AssetsUnchangedInComparison: true, untouchedRoutesAndContactUnchanged: true,
    disposableWorkspacesDeleted: true, freshClients: true, originalInputUnchanged: true },
  limits: ["Local transport and OS cache; not hosted latency.", "Payload and metadata bytes exclude HTTP/TLS overhead.",
    "Comparison uses the exact retained initial/A/B captures (B also switches an image reference, without changing asset bytes).",
    "Fresh new-format history comparison; a retained full legacy revision adds its full bytes and is never deleted.",
    "Runtime capture remains complete and is excluded from persistence timings."] };
await writeFile(join(root, "evidence.json"), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
if (process.argv.includes("--editor")) {
  const transport = createStackiLocalStorage(join(root, "deduplicated"));
  const earlier = await new SupabaseStackiDraftStore(transport.client, transport.bucket).revision(input.scope, 2);
  const workspace = join(root, "earlier-fresh-runtime");
  await materialize(workspace, earlier.files);
  assert.deepEqual(await captureStackiRuntimeFiles(workspace), captures[1]);
  await symlink(resolve(".gnr8/stacki-pilot/logatcan-replay-lbrnrd/site/node_modules"), join(workspace, "node_modules"));
  const astroPort = await freePort(), gatewayPort = await freePort();
  const editor = await startStackiEditorRuntime({ workspace, studio: join(runtime, "studio"),
    publicOrigin: `http://127.0.0.1:${gatewayPort}`, astroPort, gatewayPort,
    entryTicket: randomBytes(32).toString("base64url"), expiresAt: Date.now() + 20 * 60_000,
    allowLocalHttp: true, checkpointModule: join(runtime, "capture.mjs") });
  await writeFile(join(root, "earlier-editor.json"), JSON.stringify({ entryUrl: editor.entryUrl, revision: earlier.revision, sha256: earlier.sha256 }));
  const stop = async () => { await editor.close(); await rm(workspace, { recursive: true });
    await writeFile(join(root, "earlier-editor-stopped.json"), JSON.stringify({ stopped: true, workspaceDeleted: true })); process.exit(0); };
  process.on("SIGTERM", () => void stop()); process.on("SIGINT", () => void stop());
}
function metrics(calls: ReturnType<typeof createStackiLocalStorage>["calls"]) {
  const uploads = calls.filter(c => c.method === "POST" && c.path.includes("/object/") && !c.path.includes("/object/list/"));
  const downloads = calls.filter(c => c.method === "GET" && c.path.includes("/object/"));
  const metadata = calls.filter(c => !uploads.includes(c) && !downloads.includes(c));
  return { calls: calls.length, uploads: uploads.length, downloads: downloads.length, metadataCalls: metadata.length,
    uploadBytes: uploads.reduce((n, c) => n + c.requestBytes, 0), downloadBytes: downloads.reduce((n, c) => n + c.responseBytes, 0),
    metadataRequestBytes: metadata.reduce((n, c) => n + c.requestBytes, 0), metadataResponseBytes: metadata.reduce((n, c) => n + c.responseBytes, 0) };
}
async function materialize(root: string, files: StackiDraftFile[]) {
  await mkdir(root); for (const file of files) { const path = join(root, file.path); await mkdir(dirname(path), { recursive: true });
    await writeFile(path, Buffer.from(file.base64, "base64"), { flag: "wx" }); }
}
async function sizeTree(root: string): Promise<number> { let total = 0; for (const name of await readdir(root)) {
  const p = join(root, name), s = await stat(p); total += s.isDirectory() ? await sizeTree(p) : s.size; } return total; }
function hash(bytes: Uint8Array) { return createHash("sha256").update(bytes).digest("hex"); }
async function freePort() {
  const server = createServer(); await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
  const address = server.address(); assert(address && typeof address !== "string");
  await new Promise<void>(r => server.close(() => r())); return address.port;
}
