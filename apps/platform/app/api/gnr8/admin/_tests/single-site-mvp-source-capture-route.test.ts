import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createSingleSiteMvpSourceCaptureRouteHandlers,
  SINGLE_SITE_MVP_SOURCE_CAPTURE_CONFIRMATION,
} from "@/app/api/gnr8/admin/single-site-mvp/source-capture/source-capture-route-handlers";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const HANDLER_SOURCE = path.join(
  APP_ROOT,
  "api/gnr8/admin/single-site-mvp/source-capture/source-capture-route-handlers.ts",
);
const ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/single-site-mvp/source-capture/route.ts");

const VALID_REQUEST = {
  clientId: "e61d1982-068f-4d84-bb6f-c3fbfc93f39b",
  agencyId: "6a09c2d9-12c3-4c19-a466-0c29ae2f723e",
  url: "https://www.chs.si/",
  rehearsalPosture: "internal test",
  explicitConfirmation: SINGLE_SITE_MVP_SOURCE_CAPTURE_CONFIRMATION,
  idempotencyKey: "cutline-26-idempotency-key",
  correlationId: "cutline-26-correlation-id",
};

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/single-site-mvp/source-capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function route(input: {
  requireSuperadminUserId?: () => Promise<string>;
  delegateToCanonicalScopedSiteImport?: (
    request: Request,
    ctx: { params: Promise<{ clientId: string }> },
  ) => Promise<Response>;
} = {}) {
  let delegateCalls = 0;
  const seenCanonicalBodies: unknown[] = [];
  const seenCanonicalClientIds: string[] = [];

  const handlers = createSingleSiteMvpSourceCaptureRouteHandlers({
    requireSuperadminUserId: input.requireSuperadminUserId ?? (async () => "superadmin-cutline-26"),
    delegateToCanonicalScopedSiteImport:
      input.delegateToCanonicalScopedSiteImport ??
      (async (canonicalRequest, ctx) => {
        delegateCalls += 1;
        seenCanonicalBodies.push(await canonicalRequest.json());
        seenCanonicalClientIds.push((await ctx.params).clientId);
        return Response.json({
          ok: true,
          importPathClassification: "canonical_scoped",
          canonicalImportPath: "/api/gnr8/agency/clients/[clientId]/sites/import",
          siteId: "ownership-site-1",
          runtimeSiteId: "runtime-site-1",
          siteVersionId: "site-version-1",
          siteVersionNo: 1,
          actor_mode: "admin_view",
          fallbackUsed: false,
          previewMode: "runtime",
          htmlLength: 2048,
          appliedTransformationsCount: 7,
          diagnostics: ["SITE_IMPORT_SITE_CREATE_COMPLETED"],
          siteName: "CHS",
          siteNameSource: "document_title",
          importManifest: { status: "success", fallbackUsed: false },
          previewArtifacts: { rawImportCaptured: true, transformedPreviewGenerated: true },
          pipeline: {
            pipelineMode: "strict",
            executionStatus: "completed",
            consolidationApplied: true,
            renderedCaptureUsed: true,
            artifactGenerated: true,
            sourceMode: "rendered_dom",
            fidelityStatus: "ready",
            fidelityDegraded: false,
            renderedCaptureStatus: "available",
            renderedDomQuality: "usable",
            screenshotCount: 1,
            computedStyleSampleCount: 2,
            importDiagnosticCodes: [],
          },
          rawHtml: "<html>must not leak</html>",
          preview: { html: "<main>must not leak</main>" },
          contentSlotMaterialization: { secret: "must not leak" },
          publishOrchestratorResult: { secret: "must not leak" },
        });
      }),
  });

  return {
    handlers,
    get delegateCalls() {
      return delegateCalls;
    },
    seenCanonicalBodies,
    seenCanonicalClientIds,
  };
}

test("source capture route rejects unauthorized before canonical delegation", async () => {
  const scopedRoute = route({
    requireSuperadminUserId: async () => {
      throw new Error("Unauthorized");
    },
  });

  const response = await scopedRoute.handlers.POST(request(VALID_REQUEST));
  const body = (await response.json()) as { ok: boolean; error: string; diagnostics: string[] };

  assert.equal(response.status, 401);
  assert.equal(body.ok, false);
  assert.equal(body.error, "SUPERADMIN_REQUIRED");
  assert.equal(body.diagnostics.includes("single_site_mvp_source_capture_superadmin_required"), true);
  assert.equal(scopedRoute.delegateCalls, 0);
});

test("source capture route rejects missing exact confirmation", async () => {
  const scopedRoute = route();
  const response = await scopedRoute.handlers.POST(
    request({ ...VALID_REQUEST, explicitConfirmation: "approved" }),
  );
  const body = (await response.json()) as { diagnostics: string[] };

  assert.equal(response.status, 400);
  assert.equal(body.diagnostics.includes("SOURCE_CAPTURE_EXPLICIT_CONFIRMATION_REQUIRED"), true);
  assert.equal(scopedRoute.delegateCalls, 0);
});

test("source capture route rejects unknown fields", async () => {
  const scopedRoute = route();
  const response = await scopedRoute.handlers.POST(request({ ...VALID_REQUEST, rawSql: "select secret" }));
  const body = (await response.json()) as { diagnostics: string[] };

  assert.equal(response.status, 400);
  assert.equal(body.diagnostics.includes("SOURCE_CAPTURE_UNKNOWN_FIELD:rawSql"), true);
  assert.equal(scopedRoute.delegateCalls, 0);
});

test("source capture route rejects actor override fields", async () => {
  const scopedRoute = route();
  const response = await scopedRoute.handlers.POST(
    request({
      ...VALID_REQUEST,
      actor: { actorId: "override" },
      actorRole: "platform_superadmin",
    }),
  );
  const body = (await response.json()) as { diagnostics: string[] };

  assert.equal(response.status, 400);
  assert.equal(body.diagnostics.includes("SOURCE_CAPTURE_ACTOR_OVERRIDE_FORBIDDEN:actor"), true);
  assert.equal(body.diagnostics.includes("SOURCE_CAPTURE_ACTOR_OVERRIDE_FORBIDDEN:actorRole"), true);
  assert.equal(scopedRoute.delegateCalls, 0);
});

test("source capture route rejects invalid rehearsal posture", async () => {
  const scopedRoute = route();
  const response = await scopedRoute.handlers.POST(
    request({ ...VALID_REQUEST, rehearsalPosture: "shadow_publish" }),
  );
  const body = (await response.json()) as { diagnostics: string[] };

  assert.equal(response.status, 400);
  assert.equal(body.diagnostics.includes("SOURCE_CAPTURE_REHEARSAL_POSTURE_INVALID"), true);
  assert.equal(scopedRoute.delegateCalls, 0);
});

test("source capture route delegates valid request exactly once to canonical import path", async () => {
  const scopedRoute = route();

  const response = await scopedRoute.handlers.POST(request(VALID_REQUEST));
  const body = (await response.json()) as {
    ok: boolean;
    canonicalImportPath: string;
    actor_mode: string;
    operatorTrace: { idempotencyKey: string; correlationId: string; rehearsalPosture: string };
  };

  assert.equal(response.status, 200);
  assert.equal(scopedRoute.delegateCalls, 1);
  assert.deepEqual(scopedRoute.seenCanonicalClientIds, [VALID_REQUEST.clientId]);
  assert.deepEqual(scopedRoute.seenCanonicalBodies, [
    {
      url: "https://www.chs.si/",
      agencyId: VALID_REQUEST.agencyId,
      adminView: true,
    },
  ]);
  assert.equal(body.ok, true);
  assert.equal(body.canonicalImportPath, "/api/gnr8/agency/clients/[clientId]/sites/import");
  assert.equal(body.actor_mode, "admin_view");
  assert.deepEqual(body.operatorTrace, {
    idempotencyKey: VALID_REQUEST.idempotencyKey,
    correlationId: VALID_REQUEST.correlationId,
    rehearsalPosture: VALID_REQUEST.rehearsalPosture,
  });
});

test("source capture route response is redacted", async () => {
  const scopedRoute = route();

  const response = await scopedRoute.handlers.POST(request(VALID_REQUEST));
  const body = (await response.json()) as Record<string, unknown>;
  const serialized = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal("rawHtml" in body, false);
  assert.equal("preview" in body, false);
  assert.equal("contentSlotMaterialization" in body, false);
  assert.equal("publishOrchestratorResult" in body, false);
  assert.equal(serialized.includes("must not leak"), false);
  assert.deepEqual(body.mutationFlags, {
    dryRun: false,
    shadowPublish: false,
    publishes: false,
    runtimeMutation: false,
    providerCalls: false,
    billingCalls: false,
    domainDnsCalls: false,
    createsAafRecords: false,
    createsGateAttempt: false,
    evaluatesGate: false,
    launchReadiness: false,
  });
});

test("source capture route adds no dry-run, shadow-publish, runtime publish, provider, AAF, or gate execution behavior", () => {
  const handlerSource = readFileSync(HANDLER_SOURCE, "utf8");
  const routeSource = readFileSync(ROUTE_SOURCE, "utf8");
  const source = `${handlerSource}\n${routeSource}`;

  assert.match(source, /requireSuperadminUserId/);
  assert.match(source, /postCanonicalScopedSiteImport/);
  assert.doesNotMatch(
    source,
    /runSingleSitePublishOperatorDryRun\(|runSingleSiteShadowPublish\(|publishApprovedSiteVersion\(|publishSiteVersion\(|activateSiteVersion\(|setActiveSiteVersion\(|createAaf[A-Za-z]*\(|createGateAttempt\(|evaluate[A-Za-z]*Gate\(|openprovider|stripe|vercel/i,
  );
});
