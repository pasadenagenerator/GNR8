import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createAirshipSingleSiteDraftsRouteHandlers } from "@/app/api/gnr8/admin/airship/single-site/drafts/airship-single-site-drafts-route-handlers";
import type { AirshipSingleSiteDraftRecord } from "@/gnr8/single-site/airship-single-site-draft-service";
import type { AirshipSingleSiteEditorReadonlyProjection } from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(TEST_DIR, "../../../..");
const ROUTE_HANDLER_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/drafts/airship-single-site-drafts-route-handlers.ts");
const ROUTE_SOURCE = path.join(APP_ROOT, "api/gnr8/admin/airship/single-site/drafts/route.ts");
const COMPONENT_SOURCE = path.join(APP_ROOT, "gnr8/airship/single-site/airship-single-site-local-draft-editor.tsx");
const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";

function request(url: string, body?: unknown): Request {
  return new Request(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function draftRecord(overrides: Partial<AirshipSingleSiteDraftRecord> = {}): AirshipSingleSiteDraftRecord {
  return {
    id: "draft-chs-route",
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
        currentTextContentSummary: "Captured CHS source headline.",
        proposedTextContent: "CHS helps modernize enterprise IT",
        reasonForChange: "Stay source-supported.",
        status: "edited",
        previewImpact: "Hero headline changes in the Airship draft preview only.",
      },
    ],
    draftStatus: "draft",
    version: 2,
    semanticWatermark: "airship-single-site-editor-draft:route",
    metadata: {
      liveBoundary: "not_applied_to_live_site",
    },
    createdByActorId: "superadmin-route",
    updatedByActorId: "superadmin-route",
    acceptedAt: null,
    rejectedAt: null,
    createdAt: "2026-09-02T00:00:00.000Z",
    updatedAt: "2026-09-02T00:01:00.000Z",
    ...overrides,
  };
}

function model(): AirshipSingleSiteEditorReadonlyProjection {
  return {
    version: "airship-1-single-site-editor-readonly:v1",
    generatedAt: "2026-09-02T00:00:00.000Z",
    routeHref: `/gnr8/airship/single-site?migrationId=${MIGRATION_ID}`,
    state: "visible",
    migrationId: MIGRATION_ID,
    importedSite: "chs.si",
    sourceUrl: "https://www.chs.si/",
    studioSourceTruth: {
      tenantId: "tenant-chs",
      clientId: "client-chs",
      siteId: "site-chs",
      ownershipSiteId: null,
      runtimeSiteId: "runtime-chs",
    },
    liveSiteUrl: "https://www.chs.si/",
    liveSiteLabel: "Live site",
    mvpStatus: "Internal single-site MVP accepted",
    aiImprovementStatus: {
      label: "Editable AI draft generated",
      detail: "Unsaved generated draft.",
      deterministicEditableChangesGenerated: true,
    },
    previews: {
      originalClone: {
        label: "Original clone preview",
        siteVersionId: "6b172a5b-200e-471c-9599-5dc70f04ea53",
        runtimeArtifactId: "929106cd-fa19-47eb-9582-ce6931d0e370",
        route: "/preview/original",
        mode: "transformed",
        available: true,
        unavailableReason: null,
        authNote: "Superadmin-only internal GNR8 preview.",
      },
      currentImprovedPublished: {
        label: "Improved candidate preview",
        siteVersionId: "a3f9493e-9da4-4ef8-8608-154fe6d25a0f",
        runtimeArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
        route: "/preview/improved",
        mode: "transformed",
        available: true,
        unavailableReason: null,
        authNote: "Superadmin-only internal GNR8 preview.",
      },
    },
    links: {
      liveSite: "https://www.chs.si/",
      singleSiteStudio: `/gnr8/command-center/single-site-studio?migrationId=${MIGRATION_ID}`,
      diagnostics: `/gnr8/command-center/single-site-publish?migrationId=${MIGRATION_ID}`,
    },
    draftPanel: {
      title: "AI improvement draft",
      emptyMessage: "No concrete editable AI changes have been generated yet.",
      drafts: draftRecord().draftEdits.map((draft) => ({
        ...draft,
        status: draft.status,
      })),
      draftPreview: {
        label: "AI draft preview",
        appliedToLiveSite: false,
        persistence: "browser_local_only",
        note: "Unsaved Airship draft preview only. Not applied to live site. Not published.",
        hero: {
          eyebrow: "CHS d.o.o.",
          headline: "Less risk. More control. Better IT.",
          subheading: "Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region.",
          primaryCtaLabel: "Contact CHS at sales@chs.si",
          secondaryContactText: "Parmova ulica 51, Ljubljana",
        },
      },
      controlMode: "persistent_airship_draft",
      controlNote: "Save, accept, and reject update only the saved Airship draft workspace. Not applied to live site. Not published.",
      persistence: {
        label: "Unsaved Airship draft",
        draftId: null,
        draftStatus: null,
        version: null,
        lastSavedAt: null,
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

test("airship draft GET requires superadmin before draft read", async () => {
  let readCalls = 0;
  const handlers = createAirshipSingleSiteDraftsRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
    service: {
      async readCurrentDraft() {
        readCalls += 1;
        return draftRecord();
      },
      async createOrReuseDraft() {
        return draftRecord();
      },
      async updateDraftEditText() {
        return draftRecord();
      },
      async markDraftEditAccepted() {
        return draftRecord();
      },
      async markDraftEditRejected() {
        return draftRecord();
      },
    },
  });

  const response = await handlers.GET(request(`https://app.test/api/gnr8/admin/airship/single-site/drafts?migrationId=${MIGRATION_ID}`));
  const body = await response.json() as { diagnostics: string[] };

  assert.equal(response.status, 403);
  assert.equal(readCalls, 0);
  assert.equal(body.diagnostics.includes("airship_single_site_draft_superadmin_required"), true);
});

test("airship draft POST rejects actor overrides and does not execute service", async () => {
  let actionCalls = 0;
  const handlers = createAirshipSingleSiteDraftsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-route",
    service: {
      async readCurrentDraft() {
        return draftRecord();
      },
      async createOrReuseDraft() {
        actionCalls += 1;
        return draftRecord();
      },
      async updateDraftEditText() {
        actionCalls += 1;
        return draftRecord();
      },
      async markDraftEditAccepted() {
        actionCalls += 1;
        return draftRecord();
      },
      async markDraftEditRejected() {
        actionCalls += 1;
        return draftRecord();
      },
    },
  });

  const response = await handlers.POST(request("https://app.test/api/gnr8/admin/airship/single-site/drafts", {
    actionMode: "update_edit",
    migrationId: MIGRATION_ID,
    draftEditId: "airship-chs-home-hero-headline",
    proposedTextContent: "CHS helps modernize enterprise IT",
    actor: { actorId: "override" },
  }));
  const body = await response.json() as { diagnostics: string[]; mutationFlags: { activePointerMutation: boolean } };

  assert.equal(response.status, 400);
  assert.equal(actionCalls, 0);
  assert.equal(body.diagnostics.includes("airship_single_site_draft_actor_override_forbidden:actor"), true);
  assert.equal(body.mutationFlags.activePointerMutation, false);
});

test("airship draft POST saves edit text through superadmin-only draft service", async () => {
  let observedActorId = "";
  let observedProposedText = "";
  const handlers = createAirshipSingleSiteDraftsRouteHandlers({
    requireSuperadminUserId: async () => "superadmin-route",
    getAirshipSingleSiteEditorReadonlyProjection: async () => model(),
    service: {
      async readCurrentDraft() {
        return draftRecord();
      },
      async createOrReuseDraft() {
        return draftRecord();
      },
      async updateDraftEditText(input) {
        observedActorId = input.actor.actorId;
        observedProposedText = input.proposedTextContent;
        return draftRecord({
          draftEdits: draftRecord().draftEdits.map((draft) => ({
            ...draft,
            proposedTextContent: input.proposedTextContent,
            status: "edited",
          })),
        });
      },
      async markDraftEditAccepted() {
        return draftRecord();
      },
      async markDraftEditRejected() {
        return draftRecord();
      },
    },
  });

  const response = await handlers.POST(request("https://app.test/api/gnr8/admin/airship/single-site/drafts", {
    actionMode: "update_edit",
    migrationId: MIGRATION_ID,
    draftEditId: "airship-chs-home-hero-headline",
    proposedTextContent: "CHS helps modernize enterprise IT",
  }));
  const body = await response.json() as { ok: boolean; draft: AirshipSingleSiteDraftRecord; mutationFlags: Record<string, boolean>; labels: string[] };

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.equal(observedActorId, "superadmin-route");
  assert.equal(observedProposedText, "CHS helps modernize enterprise IT");
  assert.equal(body.draft.draftEdits[0]?.proposedTextContent, "CHS helps modernize enterprise IT");
  assert.equal(body.mutationFlags.liveSiteMutation, false);
  assert.equal(body.mutationFlags.runtimeVersionMutation, false);
  assert.equal(body.mutationFlags.activePointerMutation, false);
  assert.equal(body.mutationFlags.publishes, false);
  assert.equal(body.labels.includes("Saved Airship draft"), true);
  assert.equal(body.labels.includes("Not applied to live site"), true);
  assert.equal(body.labels.includes("Not published"), true);
});

test("airship draft route and editor do not expose publish, dry-run, rollback, or active-pointer actions", () => {
  const source = [
    readFileSync(ROUTE_HANDLER_SOURCE, "utf8"),
    readFileSync(ROUTE_SOURCE, "utf8"),
    readFileSync(COMPONENT_SOURCE, "utf8"),
  ].join("\n");

  assert.equal(source.includes("publishApprovedSiteVersion"), false);
  assert.equal(source.includes("shadow-publish"), false);
  assert.equal(source.includes("dry-run"), false);
  assert.equal(source.includes("Rollback"), false);
  assert.equal(source.includes("active_site_version_id"), false);
  assert.equal(source.includes("gnr8_runtime_active_pointers"), false);
});
