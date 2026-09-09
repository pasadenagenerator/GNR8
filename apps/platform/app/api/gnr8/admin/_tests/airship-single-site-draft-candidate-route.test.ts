import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createAirshipSingleSiteDraftCandidateRouteHandlers } from "@/app/api/gnr8/admin/airship/single-site/draft-candidate/airship-single-site-draft-candidate-route-handlers";
import type { AirshipDraftCandidateCreationOutput } from "@/gnr8/single-site/airship-single-site-draft-candidate-service";
import type { AirshipSingleSiteDraftRecord } from "@/gnr8/single-site/airship-single-site-draft-service";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const ROUTE_HANDLER_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/draft-candidate/airship-single-site-draft-candidate-route-handlers.ts");
const ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/draft-candidate/route.ts");
const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";

function request(body: unknown): Request {
  return new Request("https://app.test/api/gnr8/admin/airship/single-site/draft-candidate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function draftRecord(): AirshipSingleSiteDraftRecord {
  return {
    id: "f9b31666-b3b0-4455-8650-4a8c7304a559",
    migrationId: MIGRATION_ID,
    tenantId: "tenant-chs",
    clientId: "client-chs",
    siteId: "site-chs",
    agencyId: null,
    sourceUrl: "https://www.chs.si/",
    targetSiteVersionRefs: {
      originalCloneSiteVersionId: "6b172a5b-200e-471c-9599-5dc70f04ea53",
      originalCloneRuntimeArtifactId: "929106cd-fa19-47eb-9582-ce6931d0e370",
      improvedCandidateSiteVersionId: "a3f9493e-9da4-4ef8-8608-154fe6d25a0f",
      improvedCandidateRuntimeArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
    },
    draftEdits: [
      {
        id: "airship-chs-home-hero-headline",
        targetSectionPage: "Homepage / hero headline",
        currentTextContentSummary: "Existing CHS headline.",
        proposedTextContent: "CHS helps modernize secure enterprise IT",
        reasonForChange: "Accepted operator edit.",
        status: "accepted",
        previewImpact: "Headline appears in internal preview only.",
      },
      {
        id: "airship-chs-home-hero-value-proposition",
        targetSectionPage: "Homepage / hero subheading",
        currentTextContentSummary: "Existing CHS subheading.",
        proposedTextContent: "Cybersecurity, data systems, and hybrid infrastructure support for teams across the Adriatic region.",
        reasonForChange: "Saved operator edit.",
        status: "edited",
        previewImpact: "Subheading appears in internal preview only.",
      },
      {
        id: "airship-chs-home-contact-cta",
        targetSectionPage: "Homepage / contact call-to-action",
        currentTextContentSummary: "Existing CHS contact action.",
        proposedTextContent: "Contact CHS at sales@chs.si",
        reasonForChange: "Rejected operator edit.",
        status: "rejected",
        previewImpact: "CTA remains unapplied.",
      },
    ],
    draftStatus: "mixed",
    version: 5,
    semanticWatermark: "airship-single-site-editor-draft:route-candidate",
    metadata: {
      liveBoundary: "not_applied_to_live_site",
      styleSettings: {
        heroTopPadding: 96,
        heroBottomPadding: 104,
        backgroundTint: "#eef6ff",
        ctaColor: "#1d4ed8",
      },
    },
    createdByActorId: "superadmin-route",
    updatedByActorId: "superadmin-route",
    acceptedAt: null,
    rejectedAt: null,
    createdAt: "2026-09-02T00:00:00.000Z",
    updatedAt: "2026-09-02T00:01:00.000Z",
  };
}

function candidateOutput(status: "created" | "reused" = "created"): AirshipDraftCandidateCreationOutput {
  return {
    status,
    serviceVersion: "airship-4-draft-candidate-service:v1",
    migrationId: MIGRATION_ID,
    draftId: "f9b31666-b3b0-4455-8650-4a8c7304a559",
    draftVersion: 5,
    sourceLiveSiteVersionId: "a3f9493e-9da4-4ef8-8608-154fe6d25a0f",
    sourceLiveRuntimeArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
    candidateSiteVersionId: "2d33f386-7cd3-4bbf-a9d4-f1c134c5dce7",
    candidateRuntimeArtifactId: "4ec7588a-b7cb-46dc-a735-88e4ec466a72",
    previewRoute: "/api/gnr8/admin/single-site-studio/versions/2d33f386-7cd3-4bbf-a9d4-f1c134c5dce7/preview?mode=transformed",
    styleSettings: {
      heroTopPadding: 96,
      heroBottomPadding: 104,
      backgroundTint: "#eef6ff",
      ctaColor: "#1d4ed8",
    },
    appliedEdits: [
      {
        draftEditId: "airship-chs-home-hero-headline",
        targetSectionPage: "Homepage / hero headline",
        appliedTextContent: "CHS helps modernize secure enterprise IT",
      },
    ],
    skippedEdits: [
      {
        draftEditId: "airship-chs-home-contact-cta",
        targetSectionPage: "Homepage / contact call-to-action",
        skippedTextContent: "Contact CHS at sales@chs.si",
        reason: "rejected",
      },
    ],
    activePointerBefore: {
      siteVersionId: "a3f9493e-9da4-4ef8-8608-154fe6d25a0f",
      artifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
    },
    activePointerAfter: {
      siteVersionId: "a3f9493e-9da4-4ef8-8608-154fe6d25a0f",
      artifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
    },
    activePointerChanged: false,
    published: false,
  };
}

test("airship draft candidate POST requires superadmin before reading the saved draft", async () => {
  let readCalls = 0;
  let createCalls = 0;
  const handlers = createAirshipSingleSiteDraftCandidateRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    service: {
      async readCurrentDraft() {
        readCalls += 1;
        return draftRecord();
      },
    },
    async createAirshipSingleSiteDraftCandidate() {
      createCalls += 1;
      return candidateOutput();
    },
  });

  const response = await handlers.POST(request({
    actionMode: "create_internal_preview_candidate",
    migrationId: MIGRATION_ID,
  }));
  const body = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 403);
  assert.equal(readCalls, 0);
  assert.equal(createCalls, 0);
  assert.equal(body.diagnostics.includes("airship_draft_candidate_superadmin_required"), true);
  assert.equal(body.mutationFlags.activePointerMutation, false);
});

test("airship draft candidate POST requires an explicit migration id", async () => {
  let readCalls = 0;
  let createCalls = 0;
  const handlers = createAirshipSingleSiteDraftCandidateRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    service: {
      async readCurrentDraft() {
        readCalls += 1;
        return draftRecord();
      },
    },
    async createAirshipSingleSiteDraftCandidate() {
      createCalls += 1;
      return candidateOutput();
    },
  });

  const response = await handlers.POST(request({
    actionMode: "create_internal_preview_candidate",
  }));
  const body = await response.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(response.status, 400);
  assert.equal(readCalls, 0);
  assert.equal(createCalls, 0);
  assert.equal(body.diagnostics.includes("airship_draft_candidate_migration_id_required"), true);
  assert.equal(body.mutationFlags.runtimeVersionMutation, false);
});

test("airship draft candidate POST creates internal preview from server-read saved draft only", async () => {
  let observedActor = "";
  let observedDraftId = "";
  const handlers = createAirshipSingleSiteDraftCandidateRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    service: {
      async readCurrentDraft(migrationId) {
        assert.equal(migrationId, MIGRATION_ID);
        return draftRecord();
      },
    },
    async createAirshipSingleSiteDraftCandidate(input) {
      observedActor = input.actor;
      observedDraftId = input.draft.id;
      return candidateOutput("created");
    },
  });

  const response = await handlers.POST(request({
    actionMode: "create_internal_preview_candidate",
    migrationId: MIGRATION_ID,
    idempotencyKey: "double-click-safe",
  }));
  const bodyText = await response.text();
  const body = JSON.parse(bodyText) as { ok: boolean; candidate: { route: string; statusLabel: string; draftVersion: number; styleSettings: Record<string, unknown> }; mutationFlags: Record<string, boolean>; idempotency: { activePointerChanged: boolean } };

  assert.equal(response.status, 201);
  assert.equal(body.ok, true);
  assert.equal(observedActor, "superadmin-airship");
  assert.equal(observedDraftId, "f9b31666-b3b0-4455-8650-4a8c7304a559");
  assert.equal(body.candidate.route, "/api/gnr8/admin/single-site-studio/versions/2d33f386-7cd3-4bbf-a9d4-f1c134c5dce7/preview?mode=transformed");
  assert.equal(body.candidate.statusLabel, "Not live, internal preview only");
  assert.equal(body.candidate.draftVersion, 5);
  assert.equal(body.candidate.styleSettings.ctaColor, "#1d4ed8");
  assert.equal(body.mutationFlags.runtimeVersionMutation, true);
  assert.equal(body.mutationFlags.liveSiteMutation, false);
  assert.equal(body.mutationFlags.activePointerMutation, false);
  assert.equal(body.mutationFlags.publishes, false);
  assert.equal(body.mutationFlags.providerCall, false);
  assert.equal(body.idempotency.activePointerChanged, false);
  assert.equal(bodyText.includes("sk-"), false);
});

test("airship draft candidate POST reuses idempotent candidate on double submit", async () => {
  let createCalls = 0;
  const handlers = createAirshipSingleSiteDraftCandidateRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    service: {
      async readCurrentDraft() {
        return draftRecord();
      },
    },
    async createAirshipSingleSiteDraftCandidate() {
      createCalls += 1;
      return candidateOutput(createCalls === 1 ? "created" : "reused");
    },
  });

  const first = await handlers.POST(request({ actionMode: "create_internal_preview_candidate", migrationId: MIGRATION_ID }));
  const second = await handlers.POST(request({ actionMode: "create_internal_preview_candidate", migrationId: MIGRATION_ID }));
  const secondBody = await second.json() as { candidate: { siteVersionId: string }; idempotency: { reused: boolean }; mutationFlags: Record<string, boolean> };

  assert.equal(first.status, 201);
  assert.equal(second.status, 200);
  assert.equal(secondBody.candidate.siteVersionId, "2d33f386-7cd3-4bbf-a9d4-f1c134c5dce7");
  assert.equal(secondBody.idempotency.reused, true);
  assert.equal(secondBody.mutationFlags.runtimeVersionMutation, false);
  assert.equal(secondBody.mutationFlags.previewArtifactMutation, false);
  assert.equal(secondBody.mutationFlags.activePointerMutation, false);
});

test("airship draft candidate route refuses actor overrides and missing saved drafts", async () => {
  let createCalls = 0;
  const handlers = createAirshipSingleSiteDraftCandidateRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-airship",
    service: {
      async readCurrentDraft() {
        return null;
      },
    },
    async createAirshipSingleSiteDraftCandidate() {
      createCalls += 1;
      return candidateOutput();
    },
  });

  const overrideResponse = await handlers.POST(request({
    actionMode: "create_internal_preview_candidate",
    migrationId: MIGRATION_ID,
    actor: "not-allowed",
  }));
  const overrideBody = await overrideResponse.json() as { diagnostics: string[] };
  const missingDraftResponse = await handlers.POST(request({
    actionMode: "create_internal_preview_candidate",
    migrationId: MIGRATION_ID,
  }));
  const missingDraftBody = await missingDraftResponse.json() as { diagnostics: string[]; mutationFlags: Record<string, boolean> };

  assert.equal(overrideResponse.status, 400);
  assert.equal(overrideBody.diagnostics.includes("airship_draft_candidate_forbidden_field:actor"), true);
  assert.equal(missingDraftResponse.status, 409);
  assert.equal(missingDraftBody.diagnostics.includes("airship_saved_draft_required"), true);
  assert.equal(missingDraftBody.mutationFlags.runtimeVersionMutation, false);
  assert.equal(createCalls, 0);
});

test("airship draft candidate route source stays internal-preview only", () => {
  const source = [
    readFileSync(ROUTE_HANDLER_SOURCE, "utf8"),
    readFileSync(ROUTE_SOURCE, "utf8"),
  ].join("\n");

  assert.equal(source.includes("requireSuperadminUserId"), true);
  assert.equal(source.includes("create_internal_preview_candidate"), true);
  assert.equal(source.includes("providerCall: false"), true);
  assert.equal(source.includes("activePointerMutation: false"), true);
  assert.equal(source.includes("publishes: false"), true);
  assert.equal(source.includes("sourceCapture: false"), true);
  assert.doesNotMatch(source, /publishApprovedSiteVersion|switchActivePointer|gnr8_runtime_active_pointers|source-capture|provider\/domains|openai/i);
});
