import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  AstroCandidateOwnershipResolutionError,
} from "@/gnr8/output-adapters/astro-production-candidate-ownership-resolver";
import {
  AstroProductionCandidateRepositoryError,
} from "@/gnr8/output-adapters/astro-production-candidate-repository";
import {
  createAstroProductionCandidateId,
  createAstroProductionCandidateRecord,
  type AstroProductionCandidateOwnership,
  type AstroProductionCandidateRecord,
} from "@/gnr8/output-adapters/astro-production-candidate-record";
import {
  ASTRO_PRODUCTION_CANDIDATE_PREVIEW_ENABLED_VALUE,
  ASTRO_PRODUCTION_CANDIDATE_PREVIEW_FEATURE_GATE,
  AstroProductionCandidatePreviewConfigurationError,
  parseAstroProductionCandidatePreviewFeatureGate,
} from "@/gnr8/output-adapters/astro-production-candidate-preview-feature-gate";
import {
  renderAstroProductionCandidatePreview,
  type AstroProductionCandidatePreviewDependencies,
} from "@/gnr8/output-adapters/astro-production-candidate-preview-composition";
import { createSyntheticAstroInternalPreviewCandidate } from "@/gnr8/output-adapters/astro-internal-preview-candidate-test-fixture";
import { renderSiteVersionPreview } from "@/gnr8/runtime/unified-render-preview";

import {
  ASTRO_PRODUCTION_CANDIDATE_PREVIEW_HTML_CSP,
  createAstroProductionCandidatePreviewRouteHandlers,
} from "./astro-candidate-preview-route-handlers";

const SITE_VERSION_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_SITE_VERSION_ID = "22222222-2222-4222-8222-222222222222";
const CANDIDATE_ID = createAstroProductionCandidateId("33333333-3333-4333-8333-333333333333");
const SECOND_CANDIDATE_ID = createAstroProductionCandidateId("44444444-4444-4444-8444-444444444444");

const OWNERSHIP: AstroProductionCandidateOwnership = {
  runtimeSiteId: "runtime-site-mvp16-one",
  siteVersionId: SITE_VERSION_ID,
  ownershipSiteId: "55555555-5555-4555-8555-555555555555",
  organizationId: "66666666-6666-4666-8666-666666666666",
  agencyId: "77777777-7777-4777-8777-777777777777",
};

test("feature gate is server-only, exact-value, and disabled for absent or invalid values", () => {
  assert.equal(ASTRO_PRODUCTION_CANDIDATE_PREVIEW_FEATURE_GATE, "GNR8_ADMIN_ASTRO_CANDIDATE_PREVIEW_ENABLED");
  assert.equal(ASTRO_PRODUCTION_CANDIDATE_PREVIEW_ENABLED_VALUE, "1");
  assert.equal(parseAstroProductionCandidatePreviewFeatureGate("1"), true);
  for (const value of [undefined, null, "", "0", "true", "enabled", " 1 ", 1]) {
    assert.equal(parseAstroProductionCandidatePreviewFeatureGate(value), false);
  }
});

test("authentication is first and denial prevents feature, ownership, repository, and renderer access", async (t) => {
  for (const scenario of [
    { error: new Error("Unauthorized"), status: 401 },
    { error: new Error("Forbidden: superadmin only"), status: 403 },
  ]) {
    await t.test(String(scenario.status), async () => {
      const calls: string[] = [];
      const response = await createAstroProductionCandidatePreviewRouteHandlers({
        requireSuperadminUserId: async () => {
          calls.push("authenticate");
          throw scenario.error;
        },
        isFeatureEnabled: () => {
          calls.push("feature");
          return true;
        },
        loadPreviewDependencies: async () => {
          calls.push("dependencies");
          return previewDependencies(productionRecord());
        },
      }).GET(request(), context());

      assert.equal(response.status, scenario.status);
      assert.deepEqual(calls, ["authenticate"]);
      assertErrorHeaders(response);
    });
  }
});

test("disabled gate returns sanitized 503 after authentication with zero downstream reads", async () => {
  const calls: string[] = [];
  const response = await createAstroProductionCandidatePreviewRouteHandlers({
    requireSuperadminUserId: async () => {
      calls.push("authenticate");
      return "superadmin_mvp16";
    },
    isFeatureEnabled: () => {
      calls.push("feature");
      return false;
    },
    loadPreviewDependencies: async () => {
      calls.push("dependencies");
      return previewDependencies(productionRecord());
    },
  }).GET(request("http://gnr8.invalid/not-the-real-selection?path=/other"), context("bad", "bad"));

  assert.equal(response.status, 503);
  assert.deepEqual(calls, ["authenticate", "feature"]);
  assert.deepEqual(await response.json(), { ok: false, error: "Candidate preview unavailable." });
  assertErrorHeaders(response);
});

test("enabled route renders a validated synthetic v2 record through the actual unified preview pipeline", async () => {
  const calls: string[] = [];
  const record = productionRecord({ htmlText: "MVP 16 production candidate" });
  const response = await enabledHandlers(previewDependencies(record, calls)).GET(request(), context());
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /MVP 16 production candidate/);
  assert.deepEqual(calls, ["ownership", "read", "render"]);
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("content-security-policy"), ASTRO_PRODUCTION_CANDIDATE_PREVIEW_HTML_CSP);
  assert.match(ASTRO_PRODUCTION_CANDIDATE_PREVIEW_HTML_CSP, /sandbox/);
  assert.match(ASTRO_PRODUCTION_CANDIDATE_PREVIEW_HTML_CSP, /script-src 'none'/);
  assert.match(ASTRO_PRODUCTION_CANDIDATE_PREVIEW_HTML_CSP, /connect-src 'none'/);
  assert.match(ASTRO_PRODUCTION_CANDIDATE_PREVIEW_HTML_CSP, /form-action 'none'/);
  assert.match(ASTRO_PRODUCTION_CANDIDATE_PREVIEW_HTML_CSP, /frame-ancestors 'none'/);
  assertCommonHeaders(response);
});

test("unified preview keeps proof-v1 default distinct from explicit production-v2 validation", async () => {
  const record = productionRecord();
  await assert.rejects(
    () => renderSiteVersionPreview({
      siteVersionId: SITE_VERSION_ID,
      path: "/",
      mode: "transformed",
      astroCandidateSelection: { candidateId: CANDIDATE_ID, siteId: OWNERSHIP.runtimeSiteId },
      astroCandidateLoader: async () => record.candidate,
      previewPoolStatus: () => ({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
    }),
    /missing or invalid/,
  );
});

test("malformed identities, unsupported paths, duplicate path, and extra query selectors return the same 404", async (t) => {
  const scenarios = [
    { name: "site version", url: request().url, params: context("not-a-uuid", CANDIDATE_ID) },
    { name: "candidate", url: request().url, params: context(SITE_VERSION_ID, "candidate-free-form") },
    { name: "unsupported path", url: `${request().url}?path=/about`, params: context() },
    { name: "empty path", url: `${request().url}?path=`, params: context() },
    { name: "ambiguous path", url: `${request().url}?path=/&path=/`, params: context() },
    { name: "caller ownership", url: `${request().url}?organizationId=secret`, params: context() },
  ];
  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      let dependencyLoads = 0;
      const response = await createAstroProductionCandidatePreviewRouteHandlers({
        requireSuperadminUserId: async () => "superadmin_mvp16",
        isFeatureEnabled: () => true,
        loadPreviewDependencies: async () => {
          dependencyLoads += 1;
          return previewDependencies(productionRecord());
        },
      }).GET(request(scenario.url), scenario.params);
      assert.equal(response.status, 404);
      assert.equal(dependencyLoads, 0);
      assert.deepEqual(await response.json(), { ok: false, error: "Preview not found." });
      assertErrorHeaders(response);
    });
  }
});

test("missing or mismatched authoritative ownership is non-enumerating and prevents repository reads", async (t) => {
  for (const scenario of [
    new AstroCandidateOwnershipResolutionError("not_found", "secret version missing"),
    new AstroCandidateOwnershipResolutionError("ownership_incomplete", "secret ownership missing"),
    new AstroCandidateOwnershipResolutionError("ownership_mismatch", "secret other organization"),
  ]) {
    await t.test(scenario.code, async () => {
      let reads = 0;
      const deps = previewDependencies(productionRecord());
      deps.resolveOwnership = async () => { throw scenario; };
      deps.readCandidate = async () => {
        reads += 1;
        throw new Error("must not read");
      };
      const response = await enabledHandlers(deps).GET(request(), context());
      assert.equal(response.status, 404);
      assert.equal(reads, 0);
      assert.equal((await response.text()).includes("secret"), false);
    });
  }

  let reads = 0;
  const deps = previewDependencies(productionRecord());
  deps.resolveOwnership = async () => ({ ...OWNERSHIP, siteVersionId: SECOND_SITE_VERSION_ID });
  deps.readCandidate = async () => {
    reads += 1;
    throw new Error("must not read");
  };
  const response = await enabledHandlers(deps).GET(request(), context());
  assert.equal(response.status, 404);
  assert.equal(reads, 0);
});

test("disabled, missing, wrong-owner, corrupt, unsupported, oversized, and unavailable reads are sanitized", async (t) => {
  const scenarios: Array<{ code: AstroProductionCandidateRepositoryError["code"]; status: number }> = [
    { code: "disabled", status: 404 },
    { code: "missing", status: 404 },
    { code: "ownership_mismatch", status: 404 },
    { code: "corrupt", status: 500 },
    { code: "unsupported_version", status: 500 },
    { code: "record_too_large", status: 500 },
    { code: "unavailable", status: 500 },
  ];
  for (const scenario of scenarios) {
    await t.test(scenario.code, async () => {
      const deps = previewDependencies(productionRecord());
      deps.readCandidate = async () => {
        throw new AstroProductionCandidateRepositoryError(
          scenario.code,
          "SQL /private/path owner=secret-org payload=<html>secret</html>",
        );
      };
      const response = await enabledHandlers(deps).GET(request(), context());
      const body = await response.text();
      assert.equal(response.status, scenario.status);
      assert.equal(body.includes("SQL"), false);
      assert.equal(body.includes("secret-org"), false);
      assert.equal(body.includes("<html>"), false);
      assertErrorHeaders(response);
    });
  }
});

test("unavailable composition returns 503 while ownership transport and renderer failures return 500", async () => {
  const unconfigured = await createAstroProductionCandidatePreviewRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_mvp16",
    isFeatureEnabled: () => true,
    loadPreviewDependencies: async () => { throw new AstroProductionCandidatePreviewConfigurationError(); },
  }).GET(request(), context());
  assert.equal(unconfigured.status, 503);

  const ownershipDeps = previewDependencies(productionRecord());
  ownershipDeps.resolveOwnership = async () => {
    throw new AstroCandidateOwnershipResolutionError("unavailable", "credential or SQL detail");
  };
  const ownershipFailure = await enabledHandlers(ownershipDeps).GET(request(), context());
  assert.equal(ownershipFailure.status, 500);
  assert.equal((await ownershipFailure.text()).includes("credential"), false);

  const renderDeps = previewDependencies(productionRecord());
  renderDeps.renderCandidate = async () => { throw new Error("fallback /private/default.html"); };
  const renderFailure = await enabledHandlers(renderDeps).GET(request(), context());
  assert.equal(renderFailure.status, 500);
  assert.equal((await renderFailure.text()).includes("fallback"), false);
});

test("renderer selection mismatch and unknown production lifecycle fail without fallback", async () => {
  const mismatchDeps = previewDependencies(productionRecord());
  mismatchDeps.renderCandidate = async ({ record }) => ({
    html: "default fallback must not escape",
    source: "astro_internal_preview_candidate",
    candidateId: record.identity.candidateId,
    runtimeSiteId: record.identity.runtimeSiteId,
    siteVersionId: record.identity.siteVersionId,
    path: "/",
    fallbackUsed: true,
  } as never);
  const mismatch = await enabledHandlers(mismatchDeps).GET(request(), context());
  assert.equal(mismatch.status, 500);
  assert.equal((await mismatch.text()).includes("default fallback"), false);

  const unknownLifecycle = structuredClone(productionRecord()) as unknown as AstroProductionCandidateRecord;
  (unknownLifecycle.candidate.manifest.lifecycle as { storage: string }).storage = "future_storage";
  const lifecycleDeps = previewDependencies(unknownLifecycle);
  const lifecycle = await enabledHandlers(lifecycleDeps).GET(request(), context());
  assert.equal(lifecycle.status, 500);
  assert.deepEqual(await lifecycle.json(), { ok: false, error: "Candidate preview unavailable." });
});

test("concurrent distinct-candidate requests keep request-scoped renderer state isolated", async () => {
  const secondOwnership: AstroProductionCandidateOwnership = {
    ...OWNERSHIP,
    runtimeSiteId: "runtime-site-mvp16-two",
    siteVersionId: SECOND_SITE_VERSION_ID,
    ownershipSiteId: "88888888-8888-4888-8888-888888888888",
  };
  const records = new Map([
    [CANDIDATE_ID, productionRecord({ htmlText: "Isolated candidate A" })],
    [SECOND_CANDIDATE_ID, productionRecord({
      candidateId: SECOND_CANDIDATE_ID,
      ownership: secondOwnership,
      htmlText: "Isolated candidate B",
    })],
  ]);
  const handlers = enabledHandlers({
    resolveOwnership: async ({ siteVersionId }) => {
      await delay(siteVersionId === SITE_VERSION_ID ? 8 : 1);
      return siteVersionId === SITE_VERSION_ID ? OWNERSHIP : secondOwnership;
    },
    readCandidate: async ({ candidateId }) => {
      await delay(candidateId === CANDIDATE_ID ? 1 : 8);
      const record = records.get(candidateId);
      if (!record) throw new Error("missing");
      return record;
    },
    renderCandidate: renderAstroProductionCandidatePreview,
  });

  const [responseA, responseB] = await Promise.all([
    handlers.GET(request(), context()),
    handlers.GET(request(), context(SECOND_SITE_VERSION_ID, SECOND_CANDIDATE_ID)),
  ]);
  const [htmlA, htmlB] = await Promise.all([responseA.text(), responseB.text()]);
  assert.equal(responseA.status, 200);
  assert.equal(responseB.status, 200);
  assert.match(htmlA, /Isolated candidate A/);
  assert.doesNotMatch(htmlA, /Isolated candidate B/);
  assert.match(htmlB, /Isolated candidate B/);
  assert.doesNotMatch(htmlB, /Isolated candidate A/);
});

test("mounted route and composition expose only GET/read behavior with no registration or access mutation call", async () => {
  const importedRoute = await import("./route");
  const routeSource = await readFile(new URL("./route.ts", import.meta.url), "utf8");
  const compositionSource = await readFile(
    new URL("../../../../../../../../gnr8/output-adapters/astro-production-candidate-preview-composition.ts", import.meta.url),
    "utf8",
  );
  assert.match(routeSource, /runtime = "nodejs"/);
  assert.match(routeSource, /dynamic = "force-dynamic"/);
  assert.match(routeSource, /export const GET/);
  assert.equal(importedRoute.runtime, "nodejs");
  assert.equal(importedRoute.dynamic, "force-dynamic");
  assert.equal(typeof importedRoute.GET, "function");
  assert.doesNotMatch(routeSource, /POST|PUT|PATCH|DELETE/);
  assert.match(compositionSource, /repository\.read\(input\)/);
  assert.doesNotMatch(compositionSource, /repository\.(create|setAccess)\(/);
  assert.doesNotMatch(compositionSource, /registerAstro|producer/i);
});

function enabledHandlers(previewDependenciesValue: AstroProductionCandidatePreviewDependencies) {
  return createAstroProductionCandidatePreviewRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_mvp16",
    isFeatureEnabled: () => true,
    loadPreviewDependencies: async () => previewDependenciesValue,
  });
}

function previewDependencies(
  record: AstroProductionCandidateRecord,
  calls: string[] = [],
): AstroProductionCandidatePreviewDependencies {
  return {
    resolveOwnership: async () => {
      calls.push("ownership");
      return ownershipFromRecord(record);
    },
    readCandidate: async () => {
      calls.push("read");
      return record;
    },
    renderCandidate: async (input) => {
      calls.push("render");
      return renderAstroProductionCandidatePreview(input);
    },
  };
}

function productionRecord(input: {
  candidateId?: string;
  ownership?: AstroProductionCandidateOwnership;
  htmlText?: string;
} = {}): AstroProductionCandidateRecord {
  const ownership = input.ownership ?? OWNERSHIP;
  const candidateId = input.candidateId ?? CANDIDATE_ID;
  const candidate = createSyntheticAstroInternalPreviewCandidate({
    candidateId,
    siteId: ownership.runtimeSiteId,
    siteVersionId: ownership.siteVersionId,
    html: `<!doctype html><html><head><style>:root{--mvp16:#0f766e}</style></head><body><h1>${input.htmlText ?? "MVP 16"}</h1></body></html>`,
    createdAt: "2026-09-28T12:00:00.000Z",
  });
  return createAstroProductionCandidateRecord({
    candidate,
    ownership,
    registration: {
      registeredByActorId: "superadmin_mvp16",
      producerKind: "internal_synthetic_astro_build_export_bridge",
      producerVersion: "v1",
      producerRef: `synthetic:${candidateId}`,
      idempotencyKey: `mvp16:${candidateId}`,
      correlationId: `mvp16:${candidateId}`,
    },
    storedAt: "2026-09-28T12:01:00.000Z",
  });
}

function ownershipFromRecord(record: AstroProductionCandidateRecord): AstroProductionCandidateOwnership {
  return {
    runtimeSiteId: record.identity.runtimeSiteId,
    siteVersionId: record.identity.siteVersionId,
    ownershipSiteId: record.identity.ownershipSiteId,
    organizationId: record.identity.organizationId,
    agencyId: record.identity.agencyId,
  };
}

function request(url = "http://gnr8.invalid/api/gnr8/admin/astro-candidates/selection/preview"): Request {
  return new Request(url);
}

function context(siteVersionId = SITE_VERSION_ID, candidateId = CANDIDATE_ID) {
  return { params: Promise.resolve({ siteVersionId, candidateId }) };
}

function assertCommonHeaders(response: Response): void {
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.match(response.headers.get("permissions-policy") ?? "", /camera=\(\)/);
  assert.equal(response.headers.has("set-cookie"), false);
}

function assertErrorHeaders(response: Response): void {
  assertCommonHeaders(response);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json/);
  assert.equal(response.headers.get("content-security-policy"), "default-src 'none'; frame-ancestors 'none'");
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
