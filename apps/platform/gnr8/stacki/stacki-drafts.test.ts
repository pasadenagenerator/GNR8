import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStackiDraftRouteHandlers } from "./stacki-draft-route-handlers";
import { createStackiLocalStorage } from "./stacki-local-storage-transport";
import { SupabaseStackiDraftStore } from "./stacki-draft-store";
import { STACKI_REQUEST_MAX_BYTES, parseStackiSave, type StackiDraftScope } from "./stacki-draft-contract";

const scope: StackiDraftScope = {
  agencyId: "11111111-1111-4111-8111-111111111111", clientId: "22222222-2222-4222-8222-222222222222",
  siteId: "33333333-3333-4333-8333-333333333333", siteVersionId: "44444444-4444-4444-8444-444444444444",
};
const actor = { userId: "55555555-5555-4555-8555-555555555555", agencyId: scope.agencyId };
const context = { params: Promise.resolve({ clientId: scope.clientId, siteId: scope.siteId, siteVersionId: scope.siteVersionId }) };
const url = `https://gnr8.test/checkpoint?agencyId=${scope.agencyId}`;
const files = ["package.json", "astro.config.mjs", "src/pages/index.astro"].map(path => ({ path, base64: Buffer.from(path).toString("base64") }));
const payload = (text = "first", expectedRevision = 0) => ({
  expectedRevision, files: files.map(file => file.path.endsWith(".astro") ? { ...file, base64: Buffer.from(text).toString("base64") } : file),
});
const request = (body: unknown, origin = "https://gnr8.test") => new Request(url, {
  method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
});
async function fixture(t: { after(fn: () => Promise<void>): void }, options = {}) {
  const root = await mkdtemp(join(tmpdir(), "gnr8-stacki-store-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const transport = createStackiLocalStorage(root, options);
  const store = new SupabaseStackiDraftStore(transport.client, transport.bucket);
  return { root, transport, store };
}

test("real SDK saves, reads through a fresh store, retries identically, and rejects stale overwrites", async t => {
  const { root, store } = await fixture(t);
  const record = await store.save(scope, actor.userId, payload());
  const nextTransport = createStackiLocalStorage(root);
  const recreated = new SupabaseStackiDraftStore(nextTransport.client, nextTransport.bucket);
  assert.deepEqual(await recreated.latest(scope), record);
  assert.deepEqual(await recreated.save(scope, actor.userId, payload()), record);
  await assert.rejects(recreated.save(scope, actor.userId, payload("different")), /STACKI_DRAFT_CONFLICT/);
  const second = await recreated.save(scope, actor.userId, payload("second", 1));
  assert.equal(second.revision, 2);
  assert.equal((await recreated.latest(scope))?.sha256, second.sha256);
  assert.equal(await recreated.latest({ ...scope, siteId: scope.clientId }), null);
});

test("concurrent writers cannot overwrite the same revision", async t => {
  const { store } = await fixture(t);
  const results = await Promise.allSettled([
    store.save(scope, actor.userId, payload("writer A")),
    store.save(scope, actor.userId, payload("writer B")),
  ]);
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const rejected = results.find(result => result.status === "rejected");
  assert(rejected?.status === "rejected");
  assert.match(String(rejected.reason), /STACKI_DRAFT_CONFLICT/);
  assert.equal((await store.latest(scope))?.revision, 1);
});

test("lost write response is reconciled; failed/unconfirmed writes never report Saved", async t => {
  const ambiguous = await fixture(t, { loseUploadResponse: true });
  assert.equal((await ambiguous.store.save(scope, actor.userId, payload())).revision, 1);
  const failed = await fixture(t, { failUpload: true });
  await assert.rejects(failed.store.save(scope, actor.userId, payload()), /SAVE_UNCONFIRMED/);
  const unreadable = await fixture(t, { failDownload: true });
  await assert.rejects(unreadable.store.save(scope, actor.userId, payload()), /SAVE_UNCONFIRMED/);
});

test("public buckets and corrupted checkpoints fail closed", async t => {
  const publicStore = await fixture(t, { publicBucket: true });
  await assert.rejects(publicStore.store.save(scope, actor.userId, payload()), /STORAGE_UNAVAILABLE/);
  assert.equal(publicStore.transport.calls.length, 1);
  const { store, root } = await fixture(t);
  await store.save(scope, actor.userId, payload());
  const path = join(root, `stacki-checkpoints/v1/${scope.agencyId}/${scope.clientId}/${scope.siteId}/${scope.siteVersionId}/0001.json`);
  const record = JSON.parse(await readFile(path, "utf8"));
  record.files[0].base64 = Buffer.from("tampered").toString("base64");
  await writeFile(path, JSON.stringify(record));
  await assert.rejects(store.latest(scope), /INTEGRITY_FAILED/);
});

test("routes authorize every read/write before storage; revoked access and agency mismatch cannot read", async t => {
  const { store, transport } = await fixture(t);
  let permitted = true, enabled = true, agencyId = actor.agencyId, authorizations = 0;
  const handlers = createStackiDraftRouteHandlers({
    enabled: () => enabled,
    authorize: async seen => {
      authorizations++;
      assert.deepEqual(seen, scope);
      if (!permitted) throw new Error("403|Membership revoked");
      return { ...actor, agencyId };
    },
    store: () => store,
  });
  assert.equal((await handlers.POST(request(payload()), context)).status, 200);
  const read = await handlers.GET(new Request(url), context);
  assert.equal(read.status, 200);
  assert.equal((await read.json()).checkpoint.actorUserId, actor.userId);
  const calls = transport.calls.length;
  permitted = false;
  assert.equal((await handlers.GET(new Request(url), context)).status, 403);
  assert.equal((await handlers.POST(request(payload()), context)).status, 403);
  permitted = true; agencyId = scope.clientId;
  assert.equal((await handlers.GET(new Request(url), context)).status, 404);
  enabled = false;
  assert.equal((await handlers.GET(new Request(url), context)).status, 404);
  assert.equal(transport.calls.length, calls);
  assert.equal(authorizations, 7, "also reauthorize immediately before commit and acknowledgement");
});

test("prepare uses server source once and never overwrites a subsequently edited draft", async t => {
  const { store } = await fixture(t);
  let reads = 0;
  const handlers = createStackiDraftRouteHandlers({
    enabled: () => true, authorize: async () => actor, store: () => store,
    source: async selected => { assert.deepEqual(selected, scope); reads++; return payload("original source").files; },
  });
  assert.equal((await handlers.PREPARE(request({ files: [] }), context)).status, 422);
  assert.equal((await handlers.PREPARE(request({}, "https://other.test"), context)).status, 403);
  assert.equal(reads, 0);
  const first = await handlers.PREPARE(request({}), context);
  assert.equal(first.status, 201);
  assert.equal((await first.json()).revision, 1);
  await store.save(scope, actor.userId, payload("user edit", 1));
  const again = await handlers.PREPARE(request({}), context);
  assert.equal(again.status, 200);
  assert.equal((await again.json()).reused, true);
  assert.equal(reads, 1);
  assert.equal((await store.latest(scope))?.revision, 2);
  assert.equal(Buffer.from((await store.latest(scope))!.files.find(file => file.path.endsWith(".astro"))!.base64, "base64").toString(), "user edit");
});

test("prepare rechecks authorization after loading and preserves a concurrent writer", async t => {
  const { store } = await fixture(t);
  let authorized = true;
  const revoked = createStackiDraftRouteHandlers({
    enabled: () => true, authorize: async () => { if (!authorized) throw new Error("403|revoked"); return actor; },
    store: () => store, source: async () => { authorized = false; return files; },
  });
  assert.equal((await revoked.PREPARE(request({}), context)).status, 403);
  assert.equal(await store.latest(scope), null);
  const concurrent = createStackiDraftRouteHandlers({
    enabled: () => true, authorize: async () => actor, store: () => store,
    source: async () => {
      await store.save(scope, actor.userId, payload("concurrent edit"));
      return payload("original source").files;
    },
  });
  const result = await concurrent.PREPARE(request({}), context);
  assert.equal(result.status, 200);
  assert.equal((await result.json()).reused, true);
  assert.equal(Buffer.from((await store.latest(scope))!.files.find(file => file.path.endsWith(".astro"))!.base64, "base64").toString(), "concurrent edit");
});

test("origin, payload bounds, path traversal, duplicate paths, and client actor injection are rejected", async t => {
  const { store, transport } = await fixture(t);
  const handlers = createStackiDraftRouteHandlers({ enabled: () => true, authorize: async () => actor, store: () => store });
  assert.equal((await handlers.POST(request(payload(), "https://attacker.test"), context)).status, 403);
  const oversized = new Request(url, { method: "POST", headers: { origin: "https://gnr8.test", "content-type": "application/json" },
    body: " ".repeat(STACKI_REQUEST_MAX_BYTES + 1) });
  assert.equal((await handlers.POST(oversized, context)).status, 413);
  for (const path of ["../escape", "public/../escape", "public/.env", "/absolute", "src/node_modules/x", "src/a\\b"]) {
    assert.throws(() => parseStackiSave({ ...payload(), files: [...files, { path, base64: "" }] }));
  }
  for (const body of [
    { ...payload(), actorUserId: actor.userId }, { ...payload(), files: [...files, files[0]] },
    { ...payload(), expectedRevision: 64 }, { ...payload(), expectedRevision: -1 },
    { ...payload(), files: [...files, { path: "public/bad.svg", base64: "**invalid**" }] },
  ]) assert.equal((await handlers.POST(request(body), context)).status, 422);
  assert.equal(transport.calls.length, 0);
});

test("server-prepared image-rich drafts survive storage readback while HTTP and total bounds remain enforced", async t => {
  const { store } = await fixture(t);
  const image = Buffer.alloc(1024 * 1024, 7).toString("base64");
  const large = [...files, ...Array.from({ length: 7 }, (_, n) => ({ path: `public/image-${n}.png`, base64: image }))];
  const record = await store.save(scope, actor.userId, { expectedRevision: 0, files: large });
  assert.deepEqual((await store.latest(scope))?.files, record.files);
  assert.throws(() => parseStackiSave({ expectedRevision: 1, files: [...large, { path: "public/over.png", base64: image }] }), /STACKI_CHECKPOINT_TOO_LARGE/);
  const handlers = createStackiDraftRouteHandlers({ enabled: () => true, authorize: async () => actor, store: () => store });
  assert.equal((await handlers.POST(request({ expectedRevision: 1, files: large }), context)).status, 413);
});

test("authorized recovery verifies legacy and v2 bytes without changing the head", async t => {
  const { store, transport } = await fixture(t);
  const { LegacyStackiDraftStore } = await import("./stacki-legacy-store.fixture");
  const legacy = new LegacyStackiDraftStore(transport.client, transport.bucket);
  const first = await legacy.save(scope, actor.userId, payload());
  const second = await store.save(scope, actor.userId, payload("second", 1));
  const handlers = createStackiDraftRouteHandlers({ enabled: () => true, authorize: async () => actor, store: () => store });
  for (const record of [first, second]) {
    const response = await handlers.GET(new Request(`${url}&revision=${record.revision}&verify=1`), context);
    assert.equal(response.status, 200);
    const { verification } = await response.json();
    assert.equal(verification.checkpointSha256, record.sha256);
    assert.equal(verification.files.length, record.files.length);
    assert(!JSON.stringify(verification).includes("base64"));
  }
  assert.equal((await store.latest(scope))?.sha256, second.sha256);
  for (const revision of ["0", "65", "1.5", "../1", "01"])
    assert.equal((await handlers.GET(new Request(`${url}&revision=${revision}`), context)).status, 422);
});

test("the common pilot boundary rejects nonpilot and revoked users before draft storage", async t => {
  const { createStackiPilotAuthorizer } = await import("./stacki-pilot-access");
  const { store, transport } = await fixture(t);
  let pilot: string | undefined = actor.userId;
  let user = actor.userId;
  let allowed = true;
  const authorize = createStackiPilotAuthorizer(async () => {
    if (!allowed) throw new Error("403|Ownership revoked");
    return { ...actor, userId: user };
  }, () => pilot);
  const handlers = createStackiDraftRouteHandlers({ enabled: () => true, authorize, store: () => store });
  user = scope.clientId;
  for (const handler of [handlers.GET, handlers.POST, handlers.PREPARE])
    assert.equal((await handler(request(payload()), context)).status, 403);
  user = actor.userId; pilot = undefined;
  assert.equal((await handlers.GET(new Request(url), context)).status, 403);
  pilot = actor.userId; allowed = false;
  assert.equal((await handlers.GET(new Request(url), context)).status, 403);
  assert.equal(transport.calls.length, 0);
  allowed = true;
  assert.equal((await handlers.POST(request(payload()), context)).status, 200);
});
