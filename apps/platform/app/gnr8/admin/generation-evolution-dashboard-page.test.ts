import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { createGenerationEvolutionPreviewRouteHandlers } from "./evolution/[siteVersionId]/iterations/[iteration]/preview/[[...assetPath]]/generation-evolution-preview-route-handlers";

const PAGE_FILE = new URL("./evolution/[siteVersionId]/page.tsx", import.meta.url);
const ROUTE_FILE = new URL("./evolution/[siteVersionId]/iterations/[iteration]/preview/[[...assetPath]]/route.ts", import.meta.url);

function request(): Request {
  return new Request("https://app.test/gnr8/admin/evolution/site/iterations/1/preview/");
}

function route(input: {
  requireSuperadminUserId?: () => Promise<string>;
  resolvePreviewFile?: Parameters<typeof createGenerationEvolutionPreviewRouteHandlers>[0]["resolvePreviewFile"];
} = {}) {
  return createGenerationEvolutionPreviewRouteHandlers({
    requireSuperadminUserId: input.requireSuperadminUserId ?? (async () => "superadmin_1"),
    ...(input.resolvePreviewFile ? { resolvePreviewFile: input.resolvePreviewFile } : {}),
  });
}

test("generation evolution dashboard page contains required read-only sections", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const label of [
    "Generation Evolution Dashboard",
    "Generation Cycle Summary",
    "Business Foundation",
    "Evolution Timeline",
    "Iteration Cards",
    "Evolution Result",
    "Evolution Analysis",
    "Attention States",
    "Artifact Lineage",
    "Generated Proposal Preview",
    "Read-only quarantined proposal bundle, not a published website.",
    "Open Website Preview",
    "Open Source Proposal reference",
    "requireSuperadminUserIdForPage",
    "loadGenerationEvolutionDashboardProjection",
  ]) {
    assert.equal(source.includes(label), true, `missing ${label}`);
  }
});

test("generation evolution dashboard page excludes forbidden controls", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const tag of ["<button", "<form", "<input", "<textarea", "<select"]) {
    assert.equal(source.includes(tag), false, `unexpected control tag ${tag}`);
  }

  for (const phrase of [
    "generate button",
    "regenerate button",
    "approve button",
    "publish button",
    "deploy button",
    "provider execution controls",
    "AI controls",
    "DNS controls",
    "server action",
  ]) {
    assert.equal(source.includes(phrase), false, `unexpected phrase ${phrase}`);
  }
});

test("preview route is superadmin-only and dynamic node runtime", async () => {
  const source = await readFile(ROUTE_FILE, "utf8");

  assert.equal(source.includes('runtime = "nodejs"'), true);
  assert.equal(source.includes('dynamic = "force-dynamic"'), true);

  const handlers = route({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
  });
  const response = await handlers.GET(request(), { params: { iteration: "1" } });
  const body = await response.json() as { code: string };

  assert.equal(response.status, 403);
  assert.equal(body.code, "SUPERADMIN_REQUIRED");
});

test("preview route serves Iteration 1 entry HTML and local asset", async () => {
  const handlers = route();

  const entry = await handlers.GET(request(), { params: { iteration: "1" } });
  const html = await entry.text();
  assert.equal(entry.status, 200);
  assert.equal(entry.headers.get("content-type")?.startsWith("text/html"), true);
  assert.match(html, /ODV|html|DOCTYPE/i);

  const asset = await handlers.GET(request(), { params: { iteration: "1", assetPath: ["source", "styles.css"] } });
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get("content-type")?.startsWith("text/css"), true);
});

test("preview route serves Iteration 2 entry HTML and local asset", async () => {
  const handlers = route();

  const entry = await handlers.GET(request(), { params: { iteration: "2" } });
  assert.equal(entry.status, 200);
  assert.equal(entry.headers.get("content-security-policy")?.includes("default-src 'none'"), true);

  const asset = await handlers.GET(request(), { params: { iteration: "2", assetPath: ["source", "assets", "asset-inventory.svg"] } });
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get("content-type"), "image/svg+xml");
});

test("preview route handles missing asset and unknown iteration", async () => {
  const handlers = route();

  const missing = await handlers.GET(request(), { params: { iteration: "1", assetPath: ["source", "missing.css"] } });
  const missingBody = await missing.json() as { code: string };
  assert.equal(missing.status, 404);
  assert.equal(missingBody.code, "ASSET_NOT_FOUND");

  const unknown = await handlers.GET(request(), { params: { iteration: "3" } });
  const unknownBody = await unknown.json() as { code: string };
  assert.equal(unknown.status, 404);
  assert.equal(unknownBody.code, "UNKNOWN_ITERATION");
});

test("preview route rejects traversal and encoded traversal", async () => {
  const handlers = route();

  const traversal = await handlers.GET(request(), { params: { iteration: "1", assetPath: ["source", "..", "package.json"] } });
  const traversalBody = await traversal.json() as { code: string };
  assert.equal(traversal.status, 400);
  assert.equal(traversalBody.code, "PATH_TRAVERSAL_REJECTED");

  const encoded = await handlers.GET(request(), { params: { iteration: "1", assetPath: ["source", "%2e%2e", "package.json"] } });
  const encodedBody = await encoded.json() as { code: string };
  assert.equal(encoded.status, 400);
  assert.equal(encodedBody.code, "PATH_TRAVERSAL_REJECTED");
});

test("preview route reports outside-bundle rejection and unavailable state", async () => {
  const outside = route({
    resolvePreviewFile: async () => ({
      ok: false,
      status: 403,
      code: "ASSET_OUTSIDE_BUNDLE_REJECTED",
      message: "outside",
    }),
  });
  const outsideResponse = await outside.GET(request(), { params: { iteration: "1" } });
  const outsideBody = await outsideResponse.json() as { code: string };
  assert.equal(outsideResponse.status, 403);
  assert.equal(outsideBody.code, "ASSET_OUTSIDE_BUNDLE_REJECTED");

  const unavailable = route({
    resolvePreviewFile: async () => ({
      ok: false,
      status: 410,
      code: "PREVIEW_UNAVAILABLE",
      message: "missing bundle",
    }),
  });
  const unavailableResponse = await unavailable.GET(request(), { params: { iteration: "2" } });
  const unavailableBody = await unavailableResponse.json() as { code: string };
  assert.equal(unavailableResponse.status, 410);
  assert.equal(unavailableBody.code, "PREVIEW_UNAVAILABLE");
});
