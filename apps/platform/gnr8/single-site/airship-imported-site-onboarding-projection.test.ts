import assert from "node:assert/strict";
import test from "node:test";

import {
  AIRSHIP_CHS_MIGRATION_ID,
  type AirshipSingleSiteEditorReadonlyProjection,
} from "./airship-single-site-editor-readonly-projection";
import {
  buildAirshipImportedSiteOnboardingProjection,
  getAirshipImportedSiteOnboardingProjection,
} from "./airship-imported-site-onboarding-projection";

const CHS_MIGRATION_ID = AIRSHIP_CHS_MIGRATION_ID;
const LUNA_MIGRATION_ID = "11111111-2222-4333-8444-555555555555";
const PARTIAL_MIGRATION_ID = "22222222-3333-4444-8555-666666666666";

function editorModel(overrides: {
  migrationId?: string | null;
  siteLabel?: string;
  sourceUrl?: string;
  liveUrl?: string | null;
  sourceEvidenceStatus?: "source_supported" | "partial_evidence" | "missing_evidence";
  sourceEvidenceDetail?: string;
  draftId?: string | null;
  draftStatus?: string | null;
  draftVersion?: number | null;
  draftCount?: number;
  draftCandidate?: AirshipSingleSiteEditorReadonlyProjection["importedSiteModel"]["latestInternalPreviewCandidate"];
  activePointer?: "live" | "not_live" | "unknown";
  publishedCandidate?: string;
  improvedPreviewAvailable?: boolean;
} = {}): AirshipSingleSiteEditorReadonlyProjection {
  const migrationId = overrides.migrationId ?? CHS_MIGRATION_ID;
  const siteLabel = overrides.siteLabel ?? "chs.si";
  const sourceUrl = overrides.sourceUrl ?? "https://www.chs.si/";
  const liveUrl = overrides.liveUrl === undefined ? sourceUrl : overrides.liveUrl;
  const draftCount = overrides.draftCount ?? 3;
  const activePointer = overrides.activePointer ?? "live";
  const publishedCandidate = overrides.publishedCandidate ?? "PUBLISHED";
  const improvedPreviewAvailable = overrides.improvedPreviewAvailable ?? true;

  return {
    version: "airship-1-single-site-editor-readonly:v1",
    generatedAt: "2026-09-10T00:00:00.000Z",
    routeHref: `/gnr8/airship/single-site?migrationId=${migrationId}`,
    state: "visible",
    migrationId,
    importedSite: siteLabel,
    sourceUrl,
    importedSiteModel: {
      siteLabel,
      sourceUrl,
      liveUrl,
      sourceEvidenceSummary: {
        status: overrides.sourceEvidenceStatus ?? "source_supported",
        detail: overrides.sourceEvidenceDetail ?? `3 source evidence item(s) available for ${siteLabel}.`,
        evidenceItems: [],
      },
      editableSections: [],
      draftFields: [],
      latestDraft: {
        draftId: overrides.draftId ?? null,
        draftStatus: overrides.draftStatus ?? null,
        version: overrides.draftVersion ?? null,
        lastSavedAt: overrides.draftId ? "2026-09-10T00:05:00.000Z" : null,
      },
      latestInternalPreviewCandidate: overrides.draftCandidate ?? null,
      latestInternalPreviewReview: null,
      publishedVersionRefs: {
        siteVersionId: improvedPreviewAvailable ? `version-${siteLabel}` : null,
        runtimeArtifactId: improvedPreviewAvailable ? `artifact-${siteLabel}` : null,
        liveUrl,
        activePointer,
        publishedCandidate,
      },
    },
    studioSourceTruth: null,
    liveSiteUrl: liveUrl ?? sourceUrl,
    liveSiteLabel: "Live site",
    mvpStatus: "Internal single-site MVP accepted",
    aiImprovementStatus: {
      label: draftCount > 0 ? "Editable AI draft generated" : "No concrete editable AI changes generated",
      detail: `${draftCount} draft fields available.`,
      deterministicEditableChangesGenerated: draftCount > 0,
    },
    previews: {
      originalClone: {
        label: "Original clone preview",
        siteVersionId: `original-${siteLabel}`,
        runtimeArtifactId: `artifact-original-${siteLabel}`,
        route: `/api/gnr8/admin/single-site-studio/versions/original-${siteLabel}/preview?mode=transformed`,
        mode: "transformed",
        available: true,
        unavailableReason: null,
        authNote: "Superadmin-only internal GNR8 preview.",
      },
      currentImprovedPublished: {
        label: "Improved candidate preview",
        siteVersionId: improvedPreviewAvailable ? `version-${siteLabel}` : null,
        runtimeArtifactId: improvedPreviewAvailable ? `artifact-${siteLabel}` : null,
        route: improvedPreviewAvailable ? `/api/gnr8/admin/single-site-studio/versions/version-${siteLabel}/preview?mode=transformed` : null,
        mode: "transformed",
        available: improvedPreviewAvailable,
        unavailableReason: improvedPreviewAvailable ? null : "Internal preview unavailable.",
        authNote: "Superadmin-only internal GNR8 preview.",
      },
      currentLivePublished: {
        label: "Improved candidate preview",
        siteVersionId: improvedPreviewAvailable ? `version-${siteLabel}` : null,
        runtimeArtifactId: improvedPreviewAvailable ? `artifact-${siteLabel}` : null,
        route: improvedPreviewAvailable ? `/api/gnr8/admin/single-site-studio/versions/version-${siteLabel}/preview?mode=transformed` : null,
        mode: "transformed",
        available: improvedPreviewAvailable,
        unavailableReason: improvedPreviewAvailable ? null : "Internal preview unavailable.",
        authNote: "Superadmin-only internal GNR8 preview.",
      },
      airshipDraftCandidate: overrides.draftCandidate ?? null,
      airshipDraftCandidateReview: null,
    },
    links: {
      liveSite: liveUrl ?? sourceUrl,
      airshipEditor: `/gnr8/airship/single-site/editor?migrationId=${migrationId}`,
      singleSiteStudio: `/gnr8/command-center/single-site-studio?migrationId=${migrationId}`,
      diagnostics: `/gnr8/command-center/single-site-publish?migrationId=${migrationId}`,
    },
    draftPanel: {
      title: "AI improvement draft",
      emptyMessage: "No concrete editable AI changes have been generated yet.",
      drafts: Array.from({ length: draftCount }, (_, index) => ({
        id: `draft-${siteLabel}-${index}`,
        fieldKey: index === 2 ? "ctaLabel" : index === 1 ? "subheading" : "headline",
        targetSectionPage: "Homepage / hero",
        currentTextContentSummary: "Source-supported field.",
        proposedTextContent: "Source-supported text.",
        reasonForChange: "Source evidence.",
        status: "proposed",
        previewImpact: "Internal draft preview only.",
      })),
      draftPreview: null,
      controlMode: "persistent_airship_draft",
      controlNote: "Saved Airship draft only.",
      persistence: {
        label: overrides.draftId ? "Saved Airship draft" : "Unsaved Airship draft",
        draftId: overrides.draftId ?? null,
        draftStatus: overrides.draftStatus ?? null,
        version: overrides.draftVersion ?? null,
        lastSavedAt: overrides.draftId ? "2026-09-10T00:05:00.000Z" : null,
        styleSettings: {
          heroTopPadding: 72,
          heroBottomPadding: 72,
          backgroundTint: "#ecfeff",
          ctaColor: "#0f766e",
        },
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

test("CHS appears in Airship onboarding through the imported-site editor model", () => {
  const model = buildAirshipImportedSiteOnboardingProjection({
    models: [editorModel()],
    generatedAt: "2026-09-10T00:00:00.000Z",
  });

  assert.equal(model.state, "visible");
  assert.equal(model.items.length, 1);
  assert.equal(model.items[0]?.siteLabel, "chs.si");
  assert.equal(model.items[0]?.migrationId, CHS_MIGRATION_ID);
  assert.equal(model.items[0]?.importSourceEvidenceStatus.label, "source supported");
  assert.equal(model.flags.imports, false);
  assert.equal(model.flags.publishes, false);
  assert.equal(model.flags.providerCalls, false);
});

test("a second imported-site fixture appears without CHS or Maver leakage", () => {
  const model = buildAirshipImportedSiteOnboardingProjection({
    models: [
      editorModel(),
      editorModel({
        migrationId: LUNA_MIGRATION_ID,
        siteLabel: "luna.example",
        sourceUrl: "https://luna.example/",
        liveUrl: "https://luna.example/",
        activePointer: "not_live",
        publishedCandidate: "DRAFT",
      }),
    ],
  });

  const luna = model.items.find((item) => item.migrationId === LUNA_MIGRATION_ID);
  assert.equal(luna?.siteLabel, "luna.example");
  assert.equal(luna?.sourceUrl, "https://luna.example/");
  assert.equal(luna?.publishedLivePointerStatus.label, "Live pointer not live");
  assert.equal(JSON.stringify(luna).includes("chs.si"), false);
  assert.equal(JSON.stringify(luna).includes("CHS"), false);
  assert.equal(JSON.stringify(luna).includes("Maver"), false);
});

test("missing or partial imported-site data renders unavailable and partial states", () => {
  const model = buildAirshipImportedSiteOnboardingProjection({
    models: [
      editorModel({
        migrationId: PARTIAL_MIGRATION_ID,
        siteLabel: "partial.example",
        sourceUrl: "Source URL unavailable",
        liveUrl: null,
        sourceEvidenceStatus: "partial_evidence",
        sourceEvidenceDetail: "Only migration metadata is available.",
        draftCount: 0,
        activePointer: "unknown",
        publishedCandidate: "unknown",
        improvedPreviewAvailable: false,
      }),
    ],
  });

  const item = model.items[0];
  assert.equal(item?.sourceUrl, null);
  assert.equal(item?.liveUrl, null);
  assert.equal(item?.importSourceEvidenceStatus.label, "partial evidence");
  assert.equal(item?.latestAirshipDraftStatus.label, "No saved Airship draft");
  assert.equal(item?.latestAirshipDraftStatus.tone, "warn");
  assert.equal(item?.latestInternalPreviewCandidate.label, "No Airship draft candidate");
  assert.equal(item?.latestInternalPreviewCandidate.href, null);
  assert.equal(item?.publishedLivePointerStatus.label, "Live pointer unknown");
});

test("onboarding links route to overview and editor with the correct migration id", () => {
  const model = buildAirshipImportedSiteOnboardingProjection({
    models: [editorModel({ migrationId: LUNA_MIGRATION_ID, siteLabel: "luna.example" })],
  });

  assert.equal(model.items[0]?.links.overviewHref, `/gnr8/airship/single-site?migrationId=${LUNA_MIGRATION_ID}`);
  assert.equal(model.items[0]?.links.editorHref, `/gnr8/airship/single-site/editor?migrationId=${LUNA_MIGRATION_ID}`);
});

test("onboarding discovery includes CHS seed and repository-discovered imported sites", async () => {
  const model = await getAirshipImportedSiteOnboardingProjection({
    seedMigrationIds: [CHS_MIGRATION_ID],
    listMigrationIds: async () => [LUNA_MIGRATION_ID],
    getEditorProjection: async ({ migrationId }) =>
      migrationId === LUNA_MIGRATION_ID
        ? editorModel({ migrationId, siteLabel: "luna.example", sourceUrl: "https://luna.example/" })
        : editorModel({ migrationId }),
  });

  assert.deepEqual(model.items.map((item) => item.migrationId).sort(), [CHS_MIGRATION_ID, LUNA_MIGRATION_ID].sort());
  assert.equal(model.instrumentation.repositoryReadStatus, "ok");
  assert.equal(model.instrumentation.discoveredMigrationIdCount, 1);
});

test("onboarding empty state is useful and read-only", () => {
  const model = buildAirshipImportedSiteOnboardingProjection({ models: [] });

  assert.equal(model.state, "empty");
  assert.equal(model.emptyState.title, "No imported sites available for Airship yet");
  assert.match(model.emptyState.detail, /existing imported single-site migrations only/i);
  assert.equal(model.flags.readOnly, true);
  assert.equal(model.flags.sourceCapture, false);
  assert.equal(model.flags.liveSiteMutation, false);
});
