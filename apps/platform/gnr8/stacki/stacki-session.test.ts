import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStackiLocalStorage } from "./stacki-local-storage-transport";
import { SupabaseStackiDraftStore } from "./stacki-draft-store";
import { StackiSessionStore } from "./stacki-session-store";
import { createStackiSessionRoutes, type StackiSessionProvider } from "./stacki-session-routes";
import { createStackiDraftRouteHandlers } from "./stacki-draft-route-handlers";

const scope = { agencyId: randomUUID(), clientId: randomUUID(), siteId: randomUUID(), siteVersionId: randomUUID() };
const actor = { userId: randomUUID(), agencyId: scope.agencyId };
const files = ["astro.config.mjs", "package.json", "src/pages/index.astro"].map(path => ({ path, base64: Buffer.from(path).toString("base64") }));
const edited = files.map(file => file.path.endsWith(".astro") ? { ...file, base64: Buffer.from("Edited page").toString("base64") } : file);
const context = { params: Promise.resolve(scope) };
const url = `https://gnr8.invalid/session?agencyId=${scope.agencyId}`;
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "stacki-session-test-"));
  const transport = createStackiLocalStorage(root);
  const drafts = new SupabaseStackiDraftStore(transport.client, transport.bucket);
  const sessions = new StackiSessionStore(transport.client, transport.bucket);
  const calls = { start: 0, capture: 0, stop: 0 };
  const state = { actor, deny: false, failStart: false, failSave: false, failStop: false, revokeDuringCapture: false, files: edited, failAfterSave: false };
  const authorize = async () => {
    if (state.deny) throw new Error("403|Forbidden");
    return state.actor;
  };
  const captures = new Map<string, typeof files>();
  const provider: StackiSessionProvider = {
    start: async session => { calls.start++; if (state.failStart) throw new Error("Provider failed"); return { entryUrl: `https://editor.invalid/#${session.ticket}` }; },
    capture: async (_session, operation) => { calls.capture++; if (state.revokeDuringCapture) state.deny = true;
      if (!captures.has(operation.operationId)) captures.set(operation.operationId, state.files);
      return captures.get(operation.operationId)!; },
    stop: async () => { calls.stop++; if (state.failStop) throw new Error("Stop failed"); },
  };
  const prepare = createStackiDraftRouteHandlers({ enabled: () => true, authorize, store: () => drafts, source: async () => files }).PREPARE;
  const routes = createStackiSessionRoutes({
    enabled: () => true, authorize, prepare, sessions: () => sessions, provider: () => provider,
    drafts: () => ({
      latest: scope => drafts.latest(scope),
      save: async (...args) => { if (state.failSave) throw new Error("Storage unavailable"); const result = await drafts.save(...args); if (state.failAfterSave) throw new Error("Lost response"); return result; },
    }),
  });
  async function call(action: string, id: string, origin = "https://gnr8.invalid", operation = { operationId: id, expectedRevision: 1 }) {
    const response = await routes.POST(new Request(url, { method: "POST",
      headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ action, id, ...(["save", "save-and-close"].includes(action) ? operation : {}) }) }), context);
    return { status: response.status, value: await response.json() };
  }
  return { root, drafts, sessions, state, calls, call, transport };
}

test("concurrent open creates one runtime; save retries reuse verified revision and reopen restores it", async () => {
  const f = await fixture();
  try {
    const id = randomUUID();
    const results = await Promise.all([f.call("open", id), f.call("open", id)]);
    assert(results.some(result => result.status === 200));
    assert.equal(f.calls.start, 1);
    assert.equal((await f.call("open", id)).status, 200);
    f.state.failSave = true;
    assert.equal((await f.call("save-and-close", id)).status, 503);
    assert.equal(f.calls.stop, 0, "keep captured files available for retry");
    f.state.failSave = false;
    f.state.failStop = true;
    assert.equal((await f.call("save-and-close", id)).status, 503);
    assert.equal((await f.drafts.latest(scope))?.revision, 2);
    f.state.failStop = false;
    assert.equal((await f.call("save-and-close", id)).value.revision, 2);
    assert.equal(f.calls.capture, 2, "receipt retry must not read or restart runtime");
    assert.equal((await f.call("open", id)).value.state, "saved");
    const next = randomUUID();
    assert.equal((await f.call("open", next)).status, 200);
    const record = await f.sessions.find(next, scope, actor.userId);
    assert.equal(record.baseRevision, 2);
    assert.deepEqual((await f.drafts.latest(scope))?.files, edited);
  } finally { await rm(f.root, { recursive: true }); }
});

test("ownership, origin and reauthorization block provider use and checkpoint writes", async () => {
  const f = await fixture();
  try {
    const id = randomUUID();
    assert.equal((await f.call("open", id, "https://other.invalid")).status, 403);
    assert.equal(f.calls.start, 0);
    assert.equal((await f.call("open", id)).status, 200);
    f.state.actor = { ...actor, userId: randomUUID() };
    assert.equal((await f.call("save-and-close", id)).status, 404);
    assert.equal(f.calls.capture, 0);
    f.state.actor = actor;
    f.state.revokeDuringCapture = true;
    assert.equal((await f.call("save", id)).status, 403);
    assert.equal((await f.drafts.latest(scope))?.revision, 1);
  } finally { await rm(f.root, { recursive: true }); }
});

test("immutable global allowance counts failed launches; ambiguous reservation never creates", async () => {
  const f = await fixture();
  try {
    f.state.failStart = true;
    for (let n = 0; n < 10; n++) {
      const id = randomUUID();
      assert.equal((await f.call("open", id)).status, 503);
      assert.equal((await f.call("open", id)).value.reason, "STACKI_SESSION_START_PENDING");
    }
    assert.equal((await f.call("open", randomUUID())).status, 429);
    assert.equal(f.calls.start, 10);
    const other = await mkdtemp(join(tmpdir(), "stacki-ambiguous-test-"));
    try {
      const transport = createStackiLocalStorage(other, { loseUploadResponse: true });
      const store = new StackiSessionStore(transport.client, transport.bucket);
      const result = await store.claim({ id: randomUUID(), scope, actorUserId: actor.userId, baseRevision: 1, platformOrigin: "https://gnr8.invalid" });
      assert.equal(result.claimed, false);
    } finally { await rm(other, { recursive: true }); }
  } finally { await rm(f.root, { recursive: true }); }
});

test("another editor's newer checkpoint is not overwritten; discarded sessions cannot reopen", async () => {
  const f = await fixture();
  try {
    const id = randomUUID();
    await f.call("open", id);
    await f.drafts.save(scope, actor.userId, { expectedRevision: 1, files });
    assert.equal((await f.call("save", id)).status, 409);
    assert.equal((await f.call("discard", id)).value.state, "closed");
    assert.equal((await f.call("open", id)).value.state, "closed");
    assert.equal(f.calls.start, 1);
  } finally { await rm(f.root, { recursive: true }); }
});

test("A/save, ambiguous retry, B/save keep session open; closing retains confirmed revisions", async () => {
  const f = await fixture();
  try {
    const id = randomUUID(), operationA = { operationId: randomUUID(), expectedRevision: 1 };
    await f.call("open", id);
    f.state.failAfterSave = true;
    assert.equal((await f.call("save", id, undefined, operationA)).status, 503);
    assert.equal((await f.drafts.latest(scope))?.revision, 2);
    f.state.files = files.map(file => file.path.endsWith(".astro") ?
      { ...file, base64: Buffer.from("Change B").toString("base64") } : file);
    f.state.failAfterSave = false;
    assert.equal((await f.call("save", id, undefined, operationA)).value.revision, 2);
    assert.deepEqual((await f.drafts.latest(scope))?.files, edited, "retry captures A, never B");
    const operationB = { operationId: randomUUID(), expectedRevision: 2 };
    const results = await Promise.all([f.call("save", id, undefined, operationB), f.call("save", id, undefined, operationB)]);
    assert(results.every(result => result.value.revision === 3));
    assert.equal(f.calls.stop, 0);
    assert.equal((await f.call("open", id)).value.revision, 3);
    assert.equal((await f.call("save", id, undefined, { operationId: randomUUID(), expectedRevision: 2 })).status, 409);
    const checkpoint = await f.drafts.latest(scope);
    assert.deepEqual(checkpoint?.files, f.state.files);
    await f.call("discard", id);
    assert.deepEqual(await f.drafts.latest(scope), checkpoint, "discard preserves confirmed saves");
    const next = randomUUID();
    assert.equal((await f.call("open", next)).value.revision, 3);
    assert.equal(f.calls.start, 2);
    assert.equal((await f.call("save", next, undefined, { operationId: randomUUID(), expectedRevision: 64 })).status, 422);
  } finally { await rm(f.root, { recursive: true }); }
});

test("lost receipt reconciles; stale session and revoked actor cannot persist or acknowledge saves", async () => {
  const f = await fixture();
  try {
    const id = randomUUID(), stale = randomUUID();
    await f.call("open", id); await f.call("open", stale);
    const original = f.sessions.operationSaved.bind(f.sessions);
    let loseReceipt = true;
    f.sessions.operationSaved = async (...args) => {
      const result = await original(...args);
      if (args[2] && loseReceipt) { loseReceipt = false; throw new Error("Lost receipt response"); }
      return result;
    };
    assert.equal((await f.call("save", id)).status, 503);
    const captures = f.calls.capture;
    assert.equal((await f.call("save", id)).value.revision, 2);
    assert.equal(f.calls.capture, captures);
    f.state.files = files;
    assert.equal((await f.call("save", stale)).status, 409);
    f.state.deny = true;
    assert.equal((await f.call("save", id)).status, 403, "receipt retry still needs authorization");
    f.state.deny = false;
    f.state.revokeDuringCapture = true;
    assert.equal((await f.call("save", id, undefined, { operationId: randomUUID(), expectedRevision: 2 })).status, 403);
    assert.equal((await f.drafts.latest(scope))?.revision, 2);
  } finally { await rm(f.root, { recursive: true }); }
});
