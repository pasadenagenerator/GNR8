import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-builder";
import { InMemoryTwinStore, TWIN_STORE_DIAGNOSTICS } from "@/gnr8/runtime/twin/twin-store";

const FIXED_NOW = "2026-05-30T00:00:00.000Z";

function buildTwin(overrides?: Partial<Parameters<typeof buildWebsiteDigitalTwin>[0]>) {
  return buildWebsiteDigitalTwin({
    siteId: "site_123",
    siteVersionId: "sv_456",
    workspaceId: "ws_789",
    environmentScope: "preview",
    sourceImportId: "import_001",
    sourceModels: ["content", "design", "governance"],
    generatedBy: "twin_store_test",
    nowIso: FIXED_NOW,
    ...overrides,
  });
}

test("twin store: save twin", () => {
  const store = new InMemoryTwinStore();
  const twin = buildTwin();

  store.saveTwin(twin);

  assert.equal(store.listTwins().length, 1);
});

test("twin store: retrieve by twinId", () => {
  const store = new InMemoryTwinStore();
  const twin = buildTwin();

  store.saveTwin(twin);

  assert.equal(store.getTwin(twin.identity.twinId), twin);
  assert.equal(store.getTwin("missing_twin"), null);
});

test("twin store: retrieve by siteVersionId", () => {
  const store = new InMemoryTwinStore();
  const twin = buildTwin();

  store.saveTwin(twin);

  assert.equal(store.getTwinBySiteVersion(twin.identity.siteVersionId), twin);
  assert.equal(store.getTwinBySiteVersion("missing_sv"), null);
});

test("twin store: list twins", () => {
  const store = new InMemoryTwinStore();
  const twinA = buildTwin({ siteVersionId: "sv_001", environmentScope: "preview" });
  const twinB = buildTwin({ siteVersionId: "sv_002", environmentScope: "production" });

  store.saveTwin(twinA);
  store.saveTwin(twinB);

  assert.deepEqual(store.listTwins(), [twinA, twinB]);
});

test("twin store: clear store", () => {
  const store = new InMemoryTwinStore();
  const twin = buildTwin();

  store.saveTwin(twin);
  store.clear();

  assert.deepEqual(store.listTwins(), []);
  assert.equal(store.getTwin(twin.identity.twinId), null);
  assert.equal(store.getTwinBySiteVersion(twin.identity.siteVersionId), null);
});

test("twin store: preserves twin immutability", () => {
  const store = new InMemoryTwinStore();
  const twin = buildTwin();
  const before = structuredClone(twin);

  store.saveTwin(twin);
  store.getTwin(twin.identity.twinId);
  store.getTwinBySiteVersion(twin.identity.siteVersionId);
  store.listTwins();

  assert.deepEqual(twin, before);
});

test("twin store: multiple twins supported and latest per siteVersion tracked", () => {
  const store = new InMemoryTwinStore();
  const first = buildTwin({ siteVersionId: "sv_latest", environmentScope: "preview" });
  const second = buildTwin({ siteVersionId: "sv_latest", environmentScope: "production" });

  store.saveTwin(first);
  store.saveTwin(second);

  assert.equal(store.getTwin(first.identity.twinId), first);
  assert.equal(store.getTwin(second.identity.twinId), second);
  assert.equal(store.getTwinBySiteVersion("sv_latest"), second);
  assert.equal(store.listTwins().length, 2);
});

test("twin store: deterministic behavior verified", () => {
  const store = new InMemoryTwinStore();
  const twinA = buildTwin({ siteVersionId: "sv_det_a", environmentScope: "preview" });
  const twinB = buildTwin({ siteVersionId: "sv_det_b", environmentScope: "production" });

  store.saveTwin(twinA);
  store.saveTwin(twinB);

  assert.deepEqual(store.diagnostics, [
    TWIN_STORE_DIAGNOSTICS.SAVE_SUCCEEDED,
    TWIN_STORE_DIAGNOSTICS.GET_SUCCEEDED,
    TWIN_STORE_DIAGNOSTICS.LIST_SUCCEEDED,
  ]);
  assert.deepEqual(store.listTwins(), [twinA, twinB]);
  assert.equal(store.getTwinBySiteVersion("sv_det_a")?.identity.twinId, twinA.identity.twinId);
  assert.equal(store.getTwinBySiteVersion("sv_det_b")?.identity.twinId, twinB.identity.twinId);
});
