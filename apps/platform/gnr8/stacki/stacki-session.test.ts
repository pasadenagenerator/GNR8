import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStackiLocalStorage } from "./stacki-local-storage-transport";
import { SupabaseStackiDraftStore, type StackiStorageClient } from "./stacki-draft-store";
import { STACKI_MONTHLY_STARTS, StackiSessionStore } from "./stacki-session-store";
import { createStackiSessionRoutes, type StackiSessionProvider } from "./stacki-session-routes";
import {StackiDraftError, stackiSourceSha256, createStackiRecord} from "./stacki-draft-contract";
import { createStackiDraftRouteHandlers } from "./stacki-draft-route-handlers";

const scope = { agencyId: randomUUID(), clientId: randomUUID(), siteId: randomUUID(), siteVersionId: randomUUID() };
const actor = { userId: randomUUID(), agencyId: scope.agencyId };
const files = ["astro.config.mjs", "package.json", "src/pages/index.astro"].map(path => ({ path, base64: Buffer.from(path).toString("base64") }));
const edited = files.map(file => file.path.endsWith(".astro") ? { ...file, base64: Buffer.from("Edited page").toString("base64") } : file);
const context = { params: Promise.resolve(scope) };
const url = `https://gnr8.invalid/session?agencyId=${scope.agencyId}`;
test("session lookup bounds parallel reads and shares only bucket validation, not mutable receipts", async () => {
  const root = await mkdtemp(join(tmpdir(), "stacki-session-lookup-"));
  try {
    const transport = createStackiLocalStorage(root);
    const from = transport.client.storage.from.bind(transport.client.storage);
    let active = 0, peak = 0;
    const client: StackiStorageClient = { storage: {
      getBucket: name => transport.client.storage.getBucket(name),
      from: (...args) => {
      const bucket = from(...args);
      const download = bucket.download.bind(bucket);
      return { list: bucket.list.bind(bucket), upload: bucket.upload.bind(bucket), download: async (...args) => {
        peak = Math.max(peak, ++active);
        try { await new Promise(resolve => setTimeout(resolve, 1)); return await download(...args); }
        finally { active--; }
      } };
    } } };
    const store = new StackiSessionStore(client, transport.bucket);
    await assert.rejects(store.find(randomUUID(), scope, actor.userId), { code: "STACKI_SESSION_NOT_FOUND" });
    assert.equal(peak, 4);
    assert.equal(transport.calls.filter(call => call.path.includes("/bucket/")).length, 1);
    assert.equal(transport.calls.filter(call => call.path.includes("/object/")).length, STACKI_MONTHLY_STARTS * 2);
    const { session } = await store.claim({ id: randomUUID(), scope, actorUserId: actor.userId, baseRevision: 1, platformOrigin: "https://gnr8.invalid" });
    assert.equal((await store.authorizedAiSession(session.id, session.aiToken!)).id, session.id);
    await assert.rejects(store.authorizedAiSession(session.id, "z".repeat(43)), { code: "STACKI_AI_UNAUTHORIZED" });
    assert.equal(await store.closed(session), null);
    const other = new StackiSessionStore(transport.client, transport.bucket);
    await other.closed(session, true);
    assert.deepEqual(await store.closed(session), { closed: true }, "absent receipt is never cached");
    await assert.rejects(store.authorizedAiSession(session.id, session.aiToken!), { code: "STACKI_AI_UNAUTHORIZED" });
    await assert.rejects(store.find(session.id, scope, randomUUID()), { code: "STACKI_SESSION_NOT_FOUND" });
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("GitHub open uses one verified project and asset read through provider readiness", async () => {
  const root = await mkdtemp(join(tmpdir(), "stacki-github-open-test-"));
  try {
    const transport = createStackiLocalStorage(root);
    const sessions = new StackiSessionStore(transport.client, transport.bucket);
    const draft = createStackiRecord(scope, actor.userId, { expectedRevision: 5, files });
    const retainedAssets = [{ name: 'a'.repeat(64), body: Buffer.from('binary asset') }];
    let reads = 0, starts = 0, signatures = 0;
    const delivery = {commit:'a'.repeat(40),redirects:{}};
    const routes = createStackiSessionRoutes({
      enabled: () => true, authorize: async () => actor, sessions: () => sessions,
      history: async () => [{revision:draft.revision,sha256:draft.sha256,commit:'a'.repeat(40)}],
      loadPrepared: async () => { reads++; return { draft, retainedAssets, delivery:async (expiresAt:number) => {signatures++; assert(expiresAt>Date.now());return delivery;} }; },
      prepare: async () => { throw Error('duplicate preparation'); },
      retainedAssets: async () => { throw Error('duplicate asset read'); },
      drafts: () => ({ latest: async () => { throw Error('duplicate latest read'); },
        revision: async () => { throw Error('duplicate revision read'); },
        save: async () => { throw Error('unexpected save'); } }),
      provider: () => ({ start: async (_session, opened, assets, delivered) => {
        assert.deepEqual(delivered,delivery);
        starts++; assert.deepEqual(opened, draft.files); assert.deepEqual(assets, retainedAssets);
        return { entryUrl: 'https://editor.invalid/test' };
      }, capture: async () => { throw Error('unexpected capture'); }, stop: async () => {} }),
    });
    const id = randomUUID();
    const response = await routes.POST(new Request(url, { method: 'POST',
      headers: { origin: 'https://gnr8.invalid', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'open', id }) }), context);
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.state, 'editing'); assert.equal(result.revision, draft.revision);
    assert.equal(reads, 1); assert.equal(starts, 1); assert.equal(signatures,1);
    const history = await routes.POST(new Request(url,{method:'POST',
      headers:{origin:'https://gnr8.invalid','content-type':'application/json'},
      body:JSON.stringify({action:'history',id})}),context);
    assert.equal(history.status,200);
    assert.deepEqual((await history.json()).history,
      [{revision:draft.revision,sha256:draft.sha256,commit:'a'.repeat(40)}]);
  } finally { await rm(root, { recursive: true, force: true }); }
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "stacki-session-test-"));
  const transport = createStackiLocalStorage(root);
  const drafts = new SupabaseStackiDraftStore(transport.client, transport.bucket);
  const sessions = new StackiSessionStore(transport.client, transport.bucket);
  const calls = { start: 0, capture: 0, stop: 0 };
  const state = { actor, deny: false, failStart: false, failSave: false, failStop: false, revokeDuringCapture: false, files: edited, failAfterSave: false, failAssets:false, failDraftRead:false, assetsPrepared:true, afterAssets: () => {} };
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
    prepareAssets: async (_scope,index,identity,confirm) => {
      if(index!==0 || identity!==null)throw new StackiDraftError(409,'STACKI_ASSET_PLAN_CHANGED');
      await confirm();state.assetsPrepared=true;return {identity:'a'.repeat(64),completed:1,total:1,ready:true};
    },
    retainedAssets: async () => { if(!state.assetsPrepared)throw new StackiDraftError(409,'STACKI_ASSETS_NOT_PREPARED'); if(state.failAssets) throw new Error('Assets unavailable'); state.afterAssets(); return []; },
    enabled: () => true, authorize, prepare, sessions: () => sessions, provider: () => provider,
    drafts: () => ({
      revision: (...args) => drafts.revision(...args),
      latest: scope => { if (state.failDraftRead) throw new Error("Draft read unavailable"); return drafts.latest(scope); },
      save: async (...args) => { if (state.failSave) throw new Error("Storage unavailable"); const result = await drafts.save(...args); if (state.failAfterSave) throw new Error("Lost response"); return result; },
    }),
  });
  async function call(action: string, id: string, origin = "https://gnr8.invalid", operation = { operationId: id, expectedRevision: 1 }) {
    const response = await routes.POST(new Request(url, { method: "POST",
      headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ action, id, ...(["save", "save-and-close"].includes(action) ? operation : {}) }) }), context);
    return { status: response.status, value: await response.json() };
  }
  return { root, drafts, sessions, state, calls, call, transport, routes };
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
    for (let n = 0; n < STACKI_MONTHLY_STARTS; n++) {
      const id = randomUUID();
      assert.equal((await f.call("open", id)).status, 503);
      assert.equal((await f.call("open", id)).value.reason, "STACKI_SESSION_START_PENDING");
    }
    assert.equal((await f.call("open", randomUUID())).status, 429);
    assert.equal(f.calls.start, STACKI_MONTHLY_STARTS);
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
    assert(results.every(result => result.value.sourceSha256 === stackiSourceSha256(f.state.files)));
    assert.equal((await f.call("save", id, undefined, operationA)).value.sourceSha256, stackiSourceSha256(edited), "old receipt is bound to old stored bytes, not the current head");
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

test('retained dependency failure is detected before consuming a runtime start',async()=>{
 const f=await fixture();
 try {
  const id=randomUUID();f.state.failAssets=true;
  assert.equal((await f.call('open',id)).status,503);assert.equal(f.calls.start,0);
  f.state.failAssets=false;
  assert.equal((await f.call('open',id)).status,200);assert.equal(f.calls.start,1);
 } finally {await rm(f.root,{recursive:true,force:true});}
});


test("slow preparation refuses before reserving a start", async t => {
  const f = await fixture();
  const now = Date.now();
  let elapsed = 0;
  t.mock.method(Date, 'now', () => now + elapsed);
  try {
    f.state.afterAssets = () => { elapsed = 60_001; };
    const id = randomUUID();
    const result = await f.call('open', id);
    assert.equal(result.status, 503);
    assert.equal(result.value.reason, 'STACKI_PREPARATION_TIMEOUT');
    assert.equal(f.calls.start, 0);
    await assert.rejects(f.sessions.find(id, scope, actor.userId), /STACKI_SESSION_NOT_FOUND/);
  } finally { await rm(f.root, { recursive: true }); }
});


test("reopen after Save uses owned session receipts without loading retained assets or starting a runtime", async () => {
  const f = await fixture();
  try {
    const id = randomUUID();
    assert.equal((await f.call("open", id)).status, 200);
    assert.equal((await f.call("save", id)).value.revision, 2);
    f.state.failAssets = true;
    f.state.failDraftRead = true;
    const reopened = await f.call("open", id);
    assert.equal(reopened.status, 200);
    assert.equal(reopened.value.state, "editing");
    assert.equal(reopened.value.revision, 2);
    assert.equal(f.calls.start, 1);
    f.state.actor = { ...actor, userId: randomUUID() };
    assert.notEqual((await f.call("open", id)).status, 200);
    assert.equal(f.calls.start, 1);
    f.state.actor = actor;
    const now = Date.now;
    try {
      const session = await f.sessions.find(id, scope, actor.userId);
      Date.now = () => session.expiresAt;
      assert.equal((await f.call("open", id)).value.reason, "STACKI_SESSION_EXPIRED");
    } finally { Date.now = now; }
  } finally { await rm(f.root, { recursive: true }); }
});


test("normal preparation action writes no session reservation; only complete assets allow Open", async()=>{
 const f=await fixture();try{
  f.state.assetsPrepared=false;const id=randomUUID();
  assert.equal((await f.call("open",id)).value.reason,"STACKI_ASSETS_NOT_PREPARED");
  assert.equal(f.calls.start,0);
  const step=await f.routes.POST(new Request(url,{method:"POST",headers:{origin:"https://gnr8.invalid","content-type":"application/json"},body:JSON.stringify({action:"prepare-assets",id,index:0,identity:null})}),context);
  assert.equal(step.status,200);assert.equal((await step.json()).ready,true);
  await assert.rejects(f.sessions.find(id,scope,actor.userId),{code:"STACKI_SESSION_NOT_FOUND"});
  assert.equal(f.calls.start,0);
  assert.equal((await f.call("open",id)).status,200);assert.equal(f.calls.start,1);
  f.state.assetsPrepared=false;
  assert.equal((await f.call("open",id)).status,200);assert.equal(f.calls.start,1,"reopen bypasses cache preparation");
 }finally{await rm(f.root,{recursive:true,force:true});}
});
