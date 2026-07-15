import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { createGenerationEvolutionPreviewRouteHandlers } from "./evolution/[siteVersionId]/iterations/[iteration]/preview/[[...assetPath]]/generation-evolution-preview-route-handlers";
import { sha256Hex } from "@/gnr8/runtime/deterministic";
import {
  GeneratedProposalBundleResolutionError,
  buildGeneratedProposalBundleArtifact,
  resolveGeneratedProposalBundleAsset,
  type GeneratedProposalBundleAsset,
  type GeneratedProposalBundleArtifactRecord,
} from "@/gnr8/architecture/generated-proposal-bundle-persistence";
import type { GenerationPreviewResolvedFile } from "@/gnr8/architecture/generation-evolution-preview-boundary";

const PAGE_FILE = new URL("./evolution/[siteVersionId]/page.tsx", import.meta.url);
const ROUTE_FILE = new URL("./evolution/[siteVersionId]/iterations/[iteration]/preview/[[...assetPath]]/route.ts", import.meta.url);
const SITE_VERSION_ID = "site";

function request(iteration = "1"): Request {
  return new Request(`https://app.test/gnr8/admin/evolution/${SITE_VERSION_ID}/iterations/${iteration}/preview/`);
}

function routeParams(iteration: string, assetPath?: string[]) {
  return { siteVersionId: SITE_VERSION_ID, iteration, ...(assetPath ? { assetPath } : {}) };
}

function asset(input: {
  relativePath: string;
  content: string;
  contentType: string;
  role: GeneratedProposalBundleAsset["role"];
}): GeneratedProposalBundleAsset {
  const body = Buffer.from(input.content, "utf8");
  return {
    relativePath: input.relativePath,
    contentType: input.contentType,
    role: input.role,
    byteSize: body.byteLength,
    sha256: sha256Hex(body),
    contentBase64: body.toString("base64"),
  };
}

function bundle(iteration: 1 | 2): GeneratedProposalBundleArtifactRecord {
  const first = iteration === 1;
  return buildGeneratedProposalBundleArtifact({
    siteVersionId: SITE_VERSION_ID,
    dryRunId: "odv-generation-cycle",
    iteration,
    generatedWebsiteProposalId: first ? "proposal-1" : "proposal-2",
    generatedWebsiteProposalArtifactId: first
      ? "generated_website_proposal_3f5cf8e9a4cd0cd91a3c7521edf8ddc3"
      : "generated_website_proposal_acbb2df2349e2973dbc7d26a696a378e",
    outputBundleId: `ODV_GENERATED_PROPOSAL_00${iteration}`,
    bundleLabel: `ODV_GENERATED_PROPOSAL_00${iteration}`,
    sourceStorageReference: `artifact://generated-proposal-bundle/ODV_GENERATED_PROPOSAL_00${iteration}`,
    importedAt: "2026-07-15T10:00:00.000Z",
    manifest: { proposalId: `ODV_GENERATED_PROPOSAL_00${iteration}` },
    assets: [
      asset({
        relativePath: "source/index.html",
        content: first
          ? '<!doctype html><html><head><link href="./styles.css" rel="stylesheet"></head><body><h1>ODV Iteration 1</h1><script src="./script.js"></script></body></html>'
          : '<!doctype html><html><head><link href="./styles.css" rel="stylesheet"></head><body><h1>ODV Iteration 2</h1><img src="./assets/identity-signal.svg"><script src="./script.js"></script></body></html>',
        contentType: "text/html; charset=utf-8",
        role: "entry_html",
      }),
      asset({
        relativePath: "source/styles.css",
        content: "body { color: #111827; }",
        contentType: "text/css; charset=utf-8",
        role: "css",
      }),
      asset({
        relativePath: "source/script.js",
        content: `document.documentElement.dataset.generatedProposal = "ODV_GENERATED_PROPOSAL_00${iteration}";`,
        contentType: "text/javascript; charset=utf-8",
        role: "js",
      }),
      ...(first ? [] : [
        asset({
          relativePath: "source/assets/identity-signal.svg",
          content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>',
          contentType: "image/svg+xml",
          role: "image",
        }),
        asset({
          relativePath: "source/assets/asset-inventory.svg",
          content: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"></svg>',
          contentType: "image/svg+xml",
          role: "image",
        }),
      ]),
    ],
  });
}

const bundles = new Map<string, GeneratedProposalBundleArtifactRecord>([
  ["1", bundle(1)],
  ["2", bundle(2)],
]);

async function resolvePreviewFile(input: {
  siteVersionId: string;
  iteration: unknown;
  assetPathSegments?: readonly string[];
}): Promise<GenerationPreviewResolvedFile> {
  if (input.siteVersionId !== SITE_VERSION_ID) {
    return { ok: false, status: 410, code: "PREVIEW_UNAVAILABLE", message: "site missing" };
  }
  const artifact = bundles.get(String(input.iteration));
  if (!artifact) {
    return { ok: false, status: 404, code: "UNKNOWN_ITERATION", message: "Unknown generation iteration preview." };
  }
  try {
    const file = resolveGeneratedProposalBundleAsset({ artifact, assetPathSegments: input.assetPathSegments });
    return {
      ok: true,
      status: 200,
      iteration: artifact.iteration,
      bundleArtifactId: artifact.artifactId,
      relativePath: file.relativePath,
      contentType: file.contentType,
      body: file.body,
    };
  } catch (error) {
    if (error instanceof GeneratedProposalBundleResolutionError) {
      return { ok: false, status: error.status, code: error.code, message: error.message };
    }
    throw error;
  }
}

function route(input: {
  requireSuperadminUserId?: () => Promise<string>;
  resolvePreviewFile?: NonNullable<Parameters<typeof createGenerationEvolutionPreviewRouteHandlers>[0]>["resolvePreviewFile"];
} = {}) {
  return createGenerationEvolutionPreviewRouteHandlers({
    requireSuperadminUserId: input.requireSuperadminUserId ?? (async () => "superadmin_1"),
    resolvePreviewFile: input.resolvePreviewFile ?? resolvePreviewFile,
  });
}

test("generation evolution dashboard page contains required read-only sections", async () => {
  const source = await readFile(PAGE_FILE, "utf8");

  for (const label of [
    "Generation Evolution Dashboard",
    "Generation Cycle Summary",
    "Business Foundation",
    "Related Read-Only Surfaces",
    "Open Knowledge Workspace",
    "Inspect Business Foundation",
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
    "/gnr8/admin/workspace/",
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
  const response = await handlers.GET(request(), { params: Promise.resolve(routeParams("1")) });
  const body = await response.json() as { code: string };

  assert.equal(response.status, 403);
  assert.equal(body.code, "SUPERADMIN_REQUIRED");
});

test("preview route serves Iteration 1 entry HTML and local asset", async () => {
  const handlers = route();

  const entry = await handlers.GET(request(), { params: Promise.resolve(routeParams("1")) });
  const html = await entry.text();
  assert.equal(entry.status, 200);
  assert.equal(entry.headers.get("content-type")?.startsWith("text/html"), true);
  assert.match(html, /ODV|html|DOCTYPE/i);
  assert.match(html, /href="\/gnr8\/admin\/evolution\/site\/iterations\/1\/preview\/source\/styles\.css"/);
  assert.match(html, /src="\/gnr8\/admin\/evolution\/site\/iterations\/1\/preview\/source\/script\.js"/);

  const asset = await handlers.GET(request(), { params: Promise.resolve(routeParams("1", ["source", "styles.css"])) });
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get("content-type")?.startsWith("text/css"), true);
});

test("preview route serves Iteration 2 entry HTML and local asset", async () => {
  const handlers = route();

  const entry = await handlers.GET(request("2"), { params: Promise.resolve(routeParams("2")) });
  const html = await entry.text();
  assert.equal(entry.status, 200);
  assert.equal(entry.headers.get("content-security-policy")?.includes("default-src 'none'"), true);
  assert.match(html, /src="\/gnr8\/admin\/evolution\/site\/iterations\/2\/preview\/source\/assets\/identity-signal\.svg"/);

  const asset = await handlers.GET(request(), { params: Promise.resolve(routeParams("2", ["source", "assets", "asset-inventory.svg"])) });
  assert.equal(asset.status, 200);
  assert.equal(asset.headers.get("content-type"), "image/svg+xml");
});

test("preview route handles missing asset and unknown iteration", async () => {
  const handlers = route();

  const missing = await handlers.GET(request(), { params: Promise.resolve(routeParams("1", ["source", "missing.css"])) });
  const missingBody = await missing.json() as { code: string };
  assert.equal(missing.status, 404);
  assert.equal(missingBody.code, "ASSET_NOT_FOUND");

  const unknown = await handlers.GET(request(), { params: Promise.resolve(routeParams("3")) });
  const unknownBody = await unknown.json() as { code: string };
  assert.equal(unknown.status, 404);
  assert.equal(unknownBody.code, "UNKNOWN_ITERATION");
});

test("preview route rejects traversal and encoded traversal", async () => {
  const handlers = route();

  const traversal = await handlers.GET(request(), { params: Promise.resolve(routeParams("1", ["source", "..", "package.json"])) });
  const traversalBody = await traversal.json() as { code: string };
  assert.equal(traversal.status, 400);
  assert.equal(traversalBody.code, "PATH_TRAVERSAL_REJECTED");

  const encoded = await handlers.GET(request(), { params: Promise.resolve(routeParams("1", ["source", "%2e%2e", "package.json"])) });
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
  const outsideResponse = await outside.GET(request(), { params: Promise.resolve(routeParams("1")) });
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
  const unavailableResponse = await unavailable.GET(request(), { params: Promise.resolve(routeParams("2")) });
  const unavailableBody = await unavailableResponse.json() as { code: string };
  assert.equal(unavailableResponse.status, 410);
  assert.equal(unavailableBody.code, "PREVIEW_UNAVAILABLE");
});
