import assert from "node:assert/strict";
import test from "node:test";

import { MVP28_PACKAGE_MAX_BYTES } from "@/gnr8/output-adapters/mvp28-chs-package-contract";

import { createMvp28ChsPackageRouteHandlers } from "./mvp28-chs-package-route-handlers";

test("MVP 28 preparation authenticates before reading or invoking ingestion", async () => {
  let loaded = false;
  const handlers = createMvp28ChsPackageRouteHandlers({
    requireSuperadminUserId: async () => { throw new Error("Unauthorized"); },
    isFeatureEnabled: () => true,
    isPreviewEnvironment: () => true,
    loadIngestOperation: async () => { loaded = true; throw new Error("unexpected"); },
  });
  const response = await handlers.POST(request("{}"));
  assert.equal(response.status, 401);
  assert.equal(loaded, false);
});

test("MVP 28 preparation requires same-origin Preview JSON", async (t) => {
  const handlers = createMvp28ChsPackageRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-mvp28",
    isFeatureEnabled: () => true,
    isPreviewEnvironment: () => true,
    loadIngestOperation: async () => { throw new Error("unexpected"); },
  });
  await t.test("cross origin", async () => {
    const response = await handlers.POST(request("{}", { origin: "https://attacker.example" }));
    assert.equal(response.status, 403);
  });
  await t.test("non JSON", async () => {
    const response = await handlers.POST(request("{}", { contentType: "text/plain" }));
    assert.equal(response.status, 415);
  });
  await t.test("non Preview", async () => {
    const disabled = createMvp28ChsPackageRouteHandlers({
      requireSuperadminUserId: async () => "superadmin-mvp28",
      isFeatureEnabled: () => true,
      isPreviewEnvironment: () => false,
      loadIngestOperation: async () => { throw new Error("unexpected"); },
    });
    const response = await disabled.POST(request("{}"));
    assert.equal(response.status, 503);
  });
});

test("MVP 28 preparation bounds the body before loading ingestion", async () => {
  let loaded = false;
  const handlers = createMvp28ChsPackageRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-mvp28",
    isFeatureEnabled: () => true,
    isPreviewEnvironment: () => true,
    loadIngestOperation: async () => { loaded = true; throw new Error("unexpected"); },
  });
  const response = await handlers.POST(request("x".repeat(MVP28_PACKAGE_MAX_BYTES + 1)));
  assert.equal(response.status, 413);
  assert.equal(loaded, false);
});

test("MVP 28 preparation passes only authenticated actor and parsed package to ingestion", async () => {
  let received: unknown;
  const handlers = createMvp28ChsPackageRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-mvp28",
    isFeatureEnabled: () => true,
    isPreviewEnvironment: () => true,
    loadIngestOperation: async () => async (input) => {
      received = input;
      return {
        status: "ready_for_review",
        operationId: "01c10f4b-ee63-4359-9a0d-039132cf7e35",
        packageSha256: "a".repeat(64),
        capture: {
          snapshotId: "snapshot", snapshotRunId: "run", capturedAt: "2026-10-01T12:00:00.000Z",
          siteVersionId: "capture-version", artifactId: "capture-artifact", artifactBundleSha256: "b".repeat(64),
        },
        build: {
          candidateId: "candidate", candidateContentSha256: "c".repeat(64),
          candidateStorageSha256: "d".repeat(64), evidenceSha256: "e".repeat(64),
        },
        review: {
          siteVersionId: "review-version", artifactId: "review-artifact", artifactBundleSha256: "f".repeat(64),
          candidateId: "review-candidate", relativeUrl: "/review",
        },
        activePointerUnchanged: true,
      };
    },
  });
  const response = await handlers.POST(request(JSON.stringify({ fixed: "package" })));
  assert.equal(response.status, 201);
  assert.deepEqual(received, { actorUserId: "superadmin-mvp28", packageValue: { fixed: "package" } });
});

function request(body: string, overrides: { origin?: string; contentType?: string } = {}): Request {
  return new Request("https://preview.example.test/api/gnr8/admin/chs-astro-evaluation/mvp28/prepare", {
    method: "POST",
    headers: {
      origin: overrides.origin ?? "https://preview.example.test",
      host: "preview.example.test",
      "content-type": overrides.contentType ?? "application/json",
    },
    body,
  });
}
