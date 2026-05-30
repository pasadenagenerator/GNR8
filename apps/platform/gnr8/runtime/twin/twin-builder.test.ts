import assert from "node:assert/strict";
import test from "node:test";

import { buildWebsiteDigitalTwin, toTwinViewerPayload } from "@/gnr8/runtime/twin/twin-builder";

const FIXED_NOW = "2026-05-30T00:00:00.000Z";

function buildInput() {
  return {
    siteId: "site_123",
    siteVersionId: "sv_456",
    workspaceId: "ws_789",
    environmentScope: "preview",
    sourceImportId: "import_001",
    sourceModels: ["content", "design", "governance"],
    generatedBy: "twin_test",
    nowIso: FIXED_NOW,
  };
}

test("twin builder: builds ready twin from valid input", () => {
  const twin = buildWebsiteDigitalTwin(buildInput());

  assert.equal(twin.status, "ready");
  assert.equal(twin.identity.status, "ready");
  assert.equal(twin.identity.createdAt, FIXED_NOW);
  assert.equal(twin.identity.updatedAt, FIXED_NOW);
  assert.equal(twin.metadata.generatedAt, FIXED_NOW);
});

test("twin builder: twinId is deterministic", () => {
  const a = buildWebsiteDigitalTwin(buildInput());
  const b = buildWebsiteDigitalTwin(buildInput());

  assert.equal(a.identity.twinId, b.identity.twinId);
  assert.equal(a.identity.twinId.startsWith("twin_"), true);
});

test("twin builder: snapshot has all five state buckets", () => {
  const twin = buildWebsiteDigitalTwin(buildInput());

  assert.equal(!!twin.snapshot.contentState, true);
  assert.equal(!!twin.snapshot.designState, true);
  assert.equal(!!twin.snapshot.experienceState, true);
  assert.equal(!!twin.snapshot.governanceState, true);
  assert.equal(!!twin.snapshot.operationalState, true);
});

test("twin builder: metadata includes source values", () => {
  const twin = buildWebsiteDigitalTwin(buildInput());

  assert.equal(twin.metadata.sourceImportId, "import_001");
  assert.equal(twin.metadata.sourceSiteVersionId, "sv_456");
  assert.deepEqual(twin.metadata.sourceModels, ["content", "design", "governance"]);
  assert.equal(twin.metadata.generatedBy, "twin_test");
});

test("twin builder: diagnostics are deterministic", () => {
  const twin = buildWebsiteDigitalTwin(buildInput());

  assert.deepEqual(twin.diagnostics, [
    "TWIN_BUILD_STARTED",
    "TWIN_IDENTITY_CREATED",
    "TWIN_SNAPSHOT_CREATED",
    "TWIN_BUILD_SUCCEEDED",
  ]);
  assert.deepEqual(twin.metadata.diagnostics, twin.diagnostics);
});

test("twin builder: viewer payload shape is correct", () => {
  const twin = buildWebsiteDigitalTwin(buildInput());
  const payload = toTwinViewerPayload(twin);

  assert.deepEqual(payload.identity, twin.identity);
  assert.equal(payload.status, "ready");
  assert.deepEqual(payload.snapshot, twin.snapshot);
  assert.deepEqual(payload.metadata, twin.metadata);
  assert.deepEqual(payload.diagnostics, twin.diagnostics);
});

test("twin builder: invalid input throws deterministic error", () => {
  assert.throws(
    () =>
      buildWebsiteDigitalTwin({
        ...buildInput(),
        siteId: "",
      }),
    /TWIN_BUILD_INVALID_INPUT: siteId is required/,
  );

  assert.throws(
    () =>
      buildWebsiteDigitalTwin({
        ...buildInput(),
        siteVersionId: "",
      }),
    /TWIN_BUILD_INVALID_INPUT: siteVersionId is required/,
  );
});

test("twin builder: no scoring recommendation or ai fields exist", () => {
  const twin = buildWebsiteDigitalTwin(buildInput());

  assert.equal("scoring" in (twin.snapshot as Record<string, unknown>), false);
  assert.equal("recommendations" in (twin.snapshot as Record<string, unknown>), false);
  assert.equal("optimization" in (twin.snapshot as Record<string, unknown>), false);
  assert.equal("aiOutput" in (twin.snapshot as Record<string, unknown>), false);
});
