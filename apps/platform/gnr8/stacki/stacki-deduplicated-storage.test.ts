import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStackiLocalStorage } from "./stacki-local-storage-transport";
import { SupabaseStackiDraftStore, type StackiStorageClient } from "./stacki-draft-store";
import { LegacyStackiDraftStore } from "./stacki-legacy-store.fixture";
import { STACKI_DRAFT_MAX_REVISIONS } from "./stacki-draft-contract";
import { createStackiDraftRouteHandlers } from "./stacki-draft-route-handlers";
const scope = { agencyId: "11111111-1111-4111-8111-111111111111", clientId: "22222222-2222-4222-8222-222222222222",
  siteId: "33333333-3333-4333-8333-333333333333", siteVersionId: "44444444-4444-4444-8444-444444444444" };
const actor = "55555555-5555-4555-8555-555555555555";
const files = ["package.json", "astro.config.mjs", "src/pages/index.astro", "public/asset.png", ".studio-state/project.json"]
  .map(path => ({ path, base64: Buffer.from(path).toString("base64") }));
const changed = (suffix: string, path = "src/pages/index.astro") => files.map(f => f.path === path ?
  { ...f, base64: Buffer.from(f.path + suffix).toString("base64") } : f);
const identity = Object.values(scope).join("/");
async function fixture(t: { after(fn: () => Promise<void>): void }) {
  const root = await mkdtemp(join(tmpdir(), "stacki-dedup-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const transport = createStackiLocalStorage(root);
  return { root, transport, store: new SupabaseStackiDraftStore(transport.client, transport.bucket),
    legacy: new LegacyStackiDraftStore(transport.client, transport.bucket) };
}
test("legacy-only, mixed and new-only histories share exact revision CAS and retain every historical byte", async t => {
  const f = await fixture(t);
  const old = await f.legacy.save(scope, actor, { expectedRevision: 0, files });
  assert.deepEqual(await f.store.latest(scope), old);
  const legacyPath = join(f.root, "stacki-checkpoints/v1", identity, "0001.json");
  const legacyBytes = await readFile(legacyPath);
  const a = await f.store.save(scope, actor, { expectedRevision: 1, files: changed("A") });
  const b = await f.store.save(scope, actor, { expectedRevision: 2, files: changed("B") });
  assert.deepEqual(await f.store.revision(scope, 1), old);
  assert.deepEqual(await f.store.revision(scope, 2), a);
  assert.deepEqual(await f.store.latest(scope), b);
  assert.deepEqual(await readFile(legacyPath), legacyBytes);
  await assert.rejects(f.legacy.save(scope, actor, { expectedRevision: 3, files }), /INTEGRITY_FAILED/);
  assert.equal((await readdir(join(f.root, "stacki-checkpoints/v1", identity))).length, 3);
  assert.equal((await f.store.save(scope, actor, { expectedRevision: 1, files: changed("A") })).revision, 2);
  assert.equal((await f.store.latest(scope))?.revision, 3);
});
test("racing legacy/new deployments cannot create different authoritative revision sequences", async t => {
  const f = await fixture(t);
  const results = await Promise.allSettled([
    f.legacy.save(scope, actor, { expectedRevision: 0, files }),
    f.store.save(scope, actor, { expectedRevision: 0, files: changed("A") }),
  ]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal((await f.store.latest(scope))?.revision, 1);
  const next = await f.store.save(scope, actor, { expectedRevision: 1, files: changed("B") });
  assert.equal(next.revision, 2);
  await assert.rejects(f.legacy.save(scope, actor, { expectedRevision: 2, files }), /INTEGRITY_FAILED/);
});
test("text saves reuse assets without downloading them, asset replacement retains the older object", async t => {
  const f = await fixture(t);
  const a = await f.store.save(scope, actor, { expectedRevision: 0, files });
  f.transport.calls.length = 0;
  await f.store.save(scope, actor, { expectedRevision: 1, files: changed("A") });
  const objects = f.transport.calls.filter(c => c.path.includes("/object/") && c.path.includes("stacki-file-objects"));
  assert.equal(objects.filter(c => c.method === "POST").length, 1);
  assert.equal(objects.filter(c => c.method === "GET").length, 1);
  const b = await f.store.save(scope, actor, { expectedRevision: 2, files: changed("replacement", "public/asset.png") });
  assert.deepEqual(await f.store.revision(scope, 1), a);
  assert.deepEqual(await f.store.revision(scope, 3), b);
  const before = (await readdir(join(f.root, "stacki-file-objects/v1", identity))).length;
  await f.store.save({ ...scope, siteId: scope.clientId }, actor, { expectedRevision: 0, files });
  assert.equal((await readdir(join(f.root, "stacki-file-objects/v1", identity))).length, before);
  const other = Object.values({ ...scope, siteId: scope.clientId }).join("/");
  assert.equal((await readdir(join(f.root, "stacki-file-objects/v1", other))).length, files.length);
});
test("missing, same-size corrupt and unsupported metadata objects never confirm a save or restore", async t => {
  for (const corruption of ["missing", "corrupt", "metadata"]) {
    const f = await fixture(t);
    await f.store.save(scope, actor, { expectedRevision: 0, files });
    const objectDir = join(f.root, "stacki-file-objects/v1", identity);
    const path = join(objectDir, (await readdir(objectDir))[0]);
    if (corruption === "missing") await rm(path);
    if (corruption === "corrupt") await writeFile(path, Buffer.alloc((await readFile(path)).length, 42));
    let store = f.store;
    if (corruption === "metadata") {
      const b = f.transport.client.storage.from(f.transport.bucket);
      const client: StackiStorageClient = { storage: { getBucket: n => f.transport.client.storage.getBucket(n),
        from: () => ({ download: key => b.download(key), upload: (key, body, opts) => b.upload(key, body, opts),
          list: async (key, opts) => { const r = await b.list(key, opts); return { ...r, data: r.data?.map(e => ({ ...e, metadata: null })) ?? null }; } }) } };
      store = new SupabaseStackiDraftStore(client, f.transport.bucket);
    } else await assert.rejects(store.latest(scope), /INTEGRITY_FAILED/);
    await assert.rejects(store.save(scope, actor, { expectedRevision: 1, files }), /INTEGRITY_FAILED/);
    await assert.rejects(store.save(scope, actor, { expectedRevision: 0, files }), /INTEGRITY_FAILED/);
    assert.equal((await readdir(join(f.root, "stacki-checkpoints/v1", identity))).length, 1);
  }
});
test("interrupted object upload leaves no manifest; retry verifies orphans; ambiguous manifest reconciles", async t => {
  const f = await fixture(t);
  const b = f.transport.client.storage.from(f.transport.bucket);
  let interrupt = true, uploads = 0;
  const client: StackiStorageClient = { storage: { getBucket: n => f.transport.client.storage.getBucket(n),
    from: () => ({ list: (p, o) => b.list(p, o), download: p => b.download(p), upload: async (p, body, o) => {
      if (interrupt && ++uploads > 2) return { data: null, error: new Error("interrupted") };
      const r = await b.upload(p, body, o);
      return p.includes("stacki-checkpoints") ? { data: null, error: new Error("lost response") } : r;
    } }) } };
  const store = new SupabaseStackiDraftStore(client, f.transport.bucket);
  await assert.rejects(store.save(scope, actor, { expectedRevision: 0, files }), /SAVE_UNCONFIRMED/);
  assert.equal(await store.latest(scope), null);
  interrupt = false;
  assert.equal((await store.save(scope, actor, { expectedRevision: 0, files })).revision, 1);
  assert.equal((await store.save(scope, actor, { expectedRevision: 0, files })).revision, 1);
});
test("pagination and revision cap preserve bounded history without deleting objects", async t => {
  const f = await fixture(t);
  // Actual SDK pagination, without materializing a second benchmark framework.
  const b = f.transport.client.storage.from(f.transport.bucket);
  let pages = 0;
  const client: StackiStorageClient = { storage: { getBucket: n => f.transport.client.storage.getBucket(n),
    from: () => ({ download: p => b.download(p), upload: (p, v, o) => b.upload(p, v, o), list: async (p, o) => {
      if (p.includes("stacki-file-objects")) {
        pages++;
        if (!o.offset) return { error: null, data: Array.from({ length: 1000 }, (_, i) => ({ name: i.toString(16).padStart(64, "0") })) };
        return b.list(p, { ...o, offset: 0 });
      }
      return b.list(p, o);
    } }) } };
  await new SupabaseStackiDraftStore(client, f.transport.bucket).save(scope, actor, { expectedRevision: 0, files });
  assert.equal(pages, 4, "two paginated inventories: before objects and before commit");
  await assert.rejects(f.store.save(scope, actor, { expectedRevision: STACKI_DRAFT_MAX_REVISIONS, files }), /CHECKPOINT_INVALID/);
});
test("authorization revoked during object transfer prevents manifest commit through the actual route", async t => {
  const f = await fixture(t), b = f.transport.client.storage.from(f.transport.bucket);
  let denied = false, revoke = true;
  const client: StackiStorageClient = { storage: { getBucket: n => f.transport.client.storage.getBucket(n),
    from: () => ({ list: (p, o) => b.list(p, o), download: p => b.download(p), upload: async (p, body, o) => {
      const result = await b.upload(p, body, o);
      if (revoke && p.includes("stacki-file-objects")) denied = true;
      return result;
    } }) } };
  const store = new SupabaseStackiDraftStore(client, f.transport.bucket);
  const routes = createStackiDraftRouteHandlers({ enabled: () => true,
    authorize: async () => { if (denied) throw new Error("403|Revoked"); return { userId: actor, agencyId: scope.agencyId }; },
    store: () => store });
  const call = () => routes.POST(new Request(`https://gnr8.invalid/save?agencyId=${scope.agencyId}`, {
    method: "POST", headers: { origin: "https://gnr8.invalid", "content-type": "application/json" },
    body: JSON.stringify({ expectedRevision: 0, files }),
  }), { params: Promise.resolve(scope) });
  assert.equal((await call()).status, 403);
  assert.equal(await store.latest(scope), null);
  denied = false; revoke = false;
  assert.equal((await call()).status, 200);
  denied = true;
  assert.equal((await call()).status, 403, "duplicate retry still requires current ownership");
});
