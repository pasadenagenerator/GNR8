import assert from "node:assert/strict";
import test from "node:test";

import { createAirshipPreviewHostBindingRouteHandlers } from "@/app/api/gnr8/admin/airship/single-site/preview-host-binding/airship-preview-host-binding-route-handlers";
import type { AirshipSingleSiteEditorReadonlyProjection } from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";
import type { AirshipPreviewHostBindingOutput } from "@/gnr8/single-site/airship-preview-host-binding-service";

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const CANDIDATE_VERSION_ID = "6d712ab9-f48e-49a3-9c26-03915365d746";
const ARTIFACT_ID = "8073651e-510b-47e7-8363-8a742b7967db";
const HOST = "aris-airship.app.pasadenagenerator.com";

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/airship/single-site/preview-host-binding", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function model(): AirshipSingleSiteEditorReadonlyProjection {
  return {
    version: "airship-1-single-site-editor-readonly:v1",
    generatedAt: "2026-09-16T00:00:00.000Z",
    routeHref: `/gnr8/airship/single-site?migrationId=${MIGRATION_ID}`,
    state: "visible",
    migrationId: MIGRATION_ID,
    importedSite: "aris.si",
    sourceUrl: "https://www.aris.si/",
    importedSiteModel: {
      siteLabel: "aris.si",
      sourceUrl: "https://www.aris.si/",
      liveUrl: "https://www.aris.si/",
      sourceEvidenceSummary: { status: "source_supported", detail: "ARIS source evidence available.", evidenceItems: [] },
      editableSections: [],
      draftFields: [],
      latestDraft: { draftId: "draft-aris", draftStatus: "draft", version: 3, lastSavedAt: "2026-09-16T00:00:00.000Z" },
      latestInternalPreviewCandidate: {
        label: "New Airship draft candidate preview",
        siteVersionId: CANDIDATE_VERSION_ID,
        runtimeArtifactId: ARTIFACT_ID,
        route: `/api/gnr8/admin/single-site-studio/versions/${CANDIDATE_VERSION_ID}/preview?mode=transformed`,
        mode: "transformed",
        available: true,
        unavailableReason: null,
        authNote: "Superadmin-only internal GNR8 preview. Not live, internal preview only.",
        statusLabel: "Not live, internal preview only",
        sourceLiveSiteVersionId: "source-version",
        sourceLiveRuntimeArtifactId: "source-artifact",
        draftId: "draft-aris",
        draftVersion: 3,
        styleSettings: { heroTopPadding: 72, heroBottomPadding: 72, backgroundTint: "#ffffff", ctaColor: "#0f766e" },
        appliedEdits: [],
        skippedEdits: [],
      },
      latestInternalPreviewHost: null,
      latestInternalPreviewReview: null,
      latestInternalPreviewPublishReadiness: null,
      latestInternalPreviewGovernedDryRun: null,
      publishedVersionRefs: {
        siteVersionId: "source-version",
        runtimeArtifactId: "source-artifact",
        liveUrl: "https://www.aris.si/",
        activePointer: "none",
        publishedCandidate: "DRAFT",
      },
    },
    studioSourceTruth: null,
    liveSiteUrl: "https://www.aris.si/",
    liveSiteLabel: "Live site",
    mvpStatus: "Internal single-site MVP accepted",
    aiImprovementStatus: { label: "Editable AI draft generated", detail: "ready", deterministicEditableChangesGenerated: true },
    demoReadiness: null,
    previews: {
      originalClone: { label: "Original", siteVersionId: "original", runtimeArtifactId: "original-artifact", route: "/preview/original", mode: "transformed", available: true, unavailableReason: null, authNote: "internal" },
      currentImprovedPublished: { label: "Current", siteVersionId: "source-version", runtimeArtifactId: "source-artifact", route: "/preview/source", mode: "transformed", available: true, unavailableReason: null, authNote: "internal" },
      currentLivePublished: { label: "Current", siteVersionId: "source-version", runtimeArtifactId: "source-artifact", route: "/preview/source", mode: "transformed", available: true, unavailableReason: null, authNote: "internal" },
      airshipDraftCandidate: null,
      airshipDraftCandidateReview: null,
      airshipDraftCandidatePublishReadiness: null,
      airshipDraftCandidateGovernedDryRun: null,
    },
    links: { liveSite: "https://www.aris.si/", airshipEditor: "/editor", singleSiteStudio: "/studio", diagnostics: null },
    draftPanel: {
      title: "AI improvement draft",
      emptyMessage: "No concrete editable AI changes have been generated yet.",
      drafts: [],
      draftPreview: null,
      controlMode: "persistent_airship_draft",
      controlNote: "not live",
      persistence: {
        label: "Saved Airship draft",
        draftId: "draft-aris",
        draftStatus: "draft",
        version: 3,
        lastSavedAt: "2026-09-16T00:00:00.000Z",
        styleSettings: { heroTopPadding: 72, heroBottomPadding: 72, backgroundTint: "#ffffff", ctaColor: "#0f766e" },
        notAppliedToLiveSite: true,
        notPublished: true,
      },
      recommendationMaterial: [],
    },
    flags: {
      readOnly: false,
      mutatesProductionData: false,
      mutatesDraftData: true,
      imports: false,
      publishes: false,
      dryRuns: false,
      shadowPublishes: false,
      activePointerMutation: false,
    },
  };
}

function output(status: "created" | "reused" = "created"): AirshipPreviewHostBindingOutput {
  return {
    serviceVersion: "airship-21-preview-host-binding:v1",
    status,
    binding: {
      id: "e73e5d73-cbbe-4ff7-9cdb-75c0ee6aa2ae",
      siteId: "site_6b859cc1599a5b6642dc",
      host: HOST,
      candidateSiteVersionId: CANDIDATE_VERSION_ID,
      candidateArtifactId: ARTIFACT_ID,
      status: "ACTIVE",
      bindingKind: "candidate_preview",
      createdAt: "2026-09-16T00:00:00.000Z",
      updatedAt: "2026-09-16T00:00:00.000Z",
    },
    previewUrl: `https://${HOST}/`,
    activationNotice: "Preview host binding created. Vercel/domain activation required.",
    mutationFlags: {
      previewHostBindingMutation: status === "created",
      activePointerMutation: false,
      publishes: false,
      customerDomainMutation: false,
      providerCall: false,
    },
  };
}

test("airship preview host POST requires superadmin before reading projection", async () => {
  let projectionCalls = 0;
  let createCalls = 0;
  const handlers = createAirshipPreviewHostBindingRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    async getAirshipSingleSiteEditorReadonlyProjection() {
      projectionCalls += 1;
      return model();
    },
    async createAirshipPreviewHostBinding() {
      createCalls += 1;
      return output();
    },
  });

  const response = await handlers.POST(request({ actionMode: "create_gnr8_demo_preview_host", migrationId: MIGRATION_ID }));
  const body = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 403);
  assert.equal(projectionCalls, 0);
  assert.equal(createCalls, 0);
  assert.equal(body.diagnostics.includes("airship_preview_host_superadmin_required"), true);
  assert.equal(body.mutationFlags.activePointerMutation, false);
});

test("airship preview host POST validates selected latest candidate before creating binding", async () => {
  let createCalls = 0;
  const handlers = createAirshipPreviewHostBindingRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    async getAirshipSingleSiteEditorReadonlyProjection() {
      return model();
    },
    async createAirshipPreviewHostBinding() {
      createCalls += 1;
      return output();
    },
  });

  const response = await handlers.POST(request({
    actionMode: "create_gnr8_demo_preview_host",
    migrationId: MIGRATION_ID,
    candidateSiteVersionId: "wrong-candidate",
    candidateArtifactId: ARTIFACT_ID,
    hostname: HOST,
  }));
  const body = await response.json() as { diagnostics: string[] };

  assert.equal(response.status, 409);
  assert.equal(createCalls, 0);
  assert.equal(body.diagnostics.includes("airship_preview_host_candidate_mismatch"), true);
});

test("airship preview host POST creates a guarded GNR8 demo preview binding only", async () => {
  let observedHostname = "";
  const handlers = createAirshipPreviewHostBindingRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    async getAirshipSingleSiteEditorReadonlyProjection() {
      return model();
    },
    async createAirshipPreviewHostBinding(input) {
      observedHostname = input.hostname ?? "";
      return output("created");
    },
  });

  const response = await handlers.POST(request({
    actionMode: "create_gnr8_demo_preview_host",
    migrationId: MIGRATION_ID,
    candidateSiteVersionId: CANDIDATE_VERSION_ID,
    candidateArtifactId: ARTIFACT_ID,
    hostname: HOST,
    idempotencyKey: "double-click-safe",
  }));
  const body = await response.json() as { ok: boolean; previewHost: Record<string, unknown>; mutationFlags: Record<string, boolean>; idempotency: { activePointerChanged: boolean } };

  assert.equal(response.status, 201);
  assert.equal(body.ok, true);
  assert.equal(observedHostname, HOST);
  assert.equal(body.previewHost.previewUrl, `https://${HOST}/`);
  assert.equal(body.previewHost.label, "GNR8 demo preview, not live");
  assert.equal(body.previewHost.activationNotice, "Preview host binding created. Vercel/domain activation required.");
  assert.equal(body.mutationFlags.previewHostBindingMutation, true);
  assert.equal(body.mutationFlags.activePointerMutation, false);
  assert.equal(body.mutationFlags.customerDomainMutation, false);
  assert.equal(body.mutationFlags.publishes, false);
  assert.equal(body.idempotency.activePointerChanged, false);
});

test("airship preview host POST maps customer-domain rejection to a guarded 400", async () => {
  const handlers = createAirshipPreviewHostBindingRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    async getAirshipSingleSiteEditorReadonlyProjection() {
      return model();
    },
    async createAirshipPreviewHostBinding() {
      throw new Error("airship_preview_host_customer_domain_rejected");
    },
  });

  const response = await handlers.POST(request({
    actionMode: "create_gnr8_demo_preview_host",
    migrationId: MIGRATION_ID,
    candidateSiteVersionId: CANDIDATE_VERSION_ID,
    candidateArtifactId: ARTIFACT_ID,
    hostname: "www.aris.si",
  }));
  const body = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 400);
  assert.equal(body.diagnostics.includes("airship_preview_host_customer_domain_rejected"), true);
  assert.equal(body.mutationFlags.customerDomainMutation, false);
  assert.equal(body.mutationFlags.activePointerMutation, false);
});
