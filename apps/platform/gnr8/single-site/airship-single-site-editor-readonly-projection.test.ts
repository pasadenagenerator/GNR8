import assert from "node:assert/strict";
import test from "node:test";

import {
  airshipChsDraftContainsForbiddenMaverCopy,
  airshipDraftIdForImportedSiteField,
  buildAirshipSingleSiteEditorReadonlyProjection,
} from "./airship-single-site-editor-readonly-projection";
import type { AirshipSingleSiteDraftRecord } from "./airship-single-site-draft-service";
import type { SingleSiteStudioReadonlyProjection } from "./single-site-studio-readonly-projection";

const CHS_MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const ORIGINAL_CLONE_VERSION_ID = "6b172a5b-200e-471c-9599-5dc70f04ea53";
const IMPROVED_CANDIDATE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const INTERNAL_PREVIEW_ROUTE_PREFIX = "/api/gnr8/admin/single-site-studio/versions";

const studioProjection: SingleSiteStudioReadonlyProjection = {
  version: "mvp-ui-1-single-site-studio-readonly:v1",
  generatedAt: "2026-09-01T00:00:00.000Z",
  state: "visible",
  migrationId: CHS_MIGRATION_ID,
  diagnosticsHref: `/gnr8/command-center/single-site-publish?migrationId=${CHS_MIGRATION_ID}`,
  summary: {
    site: "chs.si",
    sourceUrl: "https://www.chs.si/",
    mvpStatus: "Internal single-site MVP accepted",
    liveSiteUrl: "https://www.chs.si/",
    activePointer: "live",
    publishedCandidate: "PUBLISHED",
  },
  sourceTruth: {
    tenantId: "tenant-chs",
    clientId: "client-chs",
    siteId: "site-chs",
    ownershipSiteId: null,
    runtimeSiteId: "runtime-chs",
  },
  import: {
    inputUrl: "https://www.chs.si/",
    captured: true,
    status: "accepted",
  },
  workflow: [],
  sourceEvidence: [
    {
      label: "Hero headline",
      status: "present",
      detail: "Captured CHS homepage evidence includes hero headline `Less risk. More control. Better IT.`.",
    },
    {
      label: "Service positioning",
      status: "present",
      detail: "Captured CHS source evidence includes value proposition `Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region.`.",
    },
    {
      label: "Contact action",
      status: "present",
      detail: "Captured CHS contact evidence includes `Contact CHS at sales@chs.si`, `sales@chs.si`, and a homepage contact form.",
    },
  ],
  previews: {
    originalClone: {
      label: "Original clone preview",
      siteVersionId: ORIGINAL_CLONE_VERSION_ID,
      runtimeArtifactId: "929106cd-fa19-47eb-9582-ce6931d0e370",
      route: `${INTERNAL_PREVIEW_ROUTE_PREFIX}/${ORIGINAL_CLONE_VERSION_ID}/preview?mode=transformed`,
      mode: "transformed",
      available: true,
      unavailableReason: null,
      authNote: "Authenticated runtime preview route exists.",
    },
    improvedCandidate: {
      label: "Improved candidate preview",
      siteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
      runtimeArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
      route: `${INTERNAL_PREVIEW_ROUTE_PREFIX}/${IMPROVED_CANDIDATE_VERSION_ID}/preview?mode=transformed`,
      mode: "transformed",
      available: true,
      unavailableReason: null,
      authNote: "Authenticated runtime preview route exists.",
    },
  },
  comparison: [],
  improvementSummary: {
    headline: "Accepted with limitations; no deterministic content changes were applied in this MVP rehearsal.",
    appliedCount: 0,
    limitationCount: 2,
    noDeterministicContentChanges: true,
    recommendations: [],
  },
  flags: {
    readOnly: true,
    mutatesProductionData: false,
    imports: false,
    publishes: false,
  },
};

const CHS_HEADLINE_DRAFT_ID = airshipDraftIdForImportedSiteField({
  migrationId: CHS_MIGRATION_ID,
  siteLabel: "chs.si",
  fieldKey: "headline",
});
const CHS_SUBHEADING_DRAFT_ID = airshipDraftIdForImportedSiteField({
  migrationId: CHS_MIGRATION_ID,
  siteLabel: "chs.si",
  fieldKey: "subheading",
});
const CHS_CTA_DRAFT_ID = airshipDraftIdForImportedSiteField({
  migrationId: CHS_MIGRATION_ID,
  siteLabel: "chs.si",
  fieldKey: "ctaLabel",
});

test("airship projection generates the first concrete CHS AI draft and local-only preview", () => {
  const model = buildAirshipSingleSiteEditorReadonlyProjection({
    migrationId: CHS_MIGRATION_ID,
    studioModel: studioProjection,
    generatedAt: "2026-09-01T00:00:00.000Z",
  });

  assert.equal(model.aiImprovementStatus.label, "Editable AI draft generated");
  assert.equal(model.aiImprovementStatus.deterministicEditableChangesGenerated, true);
  assert.equal(model.draftPanel.drafts.length, 3);
  assert.equal(model.draftPanel.drafts.every((draft) => draft.status === "proposed"), true);
  assert.equal(airshipChsDraftContainsForbiddenMaverCopy(model.draftPanel.drafts), false);
  assert.equal(airshipChsDraftContainsForbiddenMaverCopy(model.draftPanel.draftPreview), false);
  assert.equal(
    model.draftPanel.drafts.map((draft) => draft.targetSectionPage).join("|"),
    "Homepage / hero headline|Homepage / hero subheading|Homepage / contact call-to-action",
  );
  assert.deepEqual(
    model.importedSiteModel.editableSections.find((section) => section.key === "hero")?.mappedDraftFieldIds,
    [CHS_HEADLINE_DRAFT_ID, CHS_SUBHEADING_DRAFT_ID],
  );
  assert.equal(model.importedSiteModel.sourceEvidenceSummary.status, "source_supported");
  assert.equal(model.draftPanel.drafts.some((draft) => draft.proposedTextContent === "Less risk. More control. Better IT."), true);
  assert.equal(
    model.draftPanel.drafts.some((draft) =>
      draft.proposedTextContent === "Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region."
    ),
    true,
  );
  assert.equal(model.draftPanel.drafts.some((draft) => draft.proposedTextContent === "Contact CHS at sales@chs.si"), true);
  assert.equal(model.draftPanel.draftPreview?.label, "AI draft preview");
  assert.equal(model.draftPanel.draftPreview?.appliedToLiveSite, false);
  assert.equal(model.draftPanel.draftPreview?.persistence, "browser_local_only");
  assert.equal(model.draftPanel.controlMode, "persistent_airship_draft");
  assert.equal(model.draftPanel.persistence.label, "Unsaved Airship draft");
  assert.deepEqual(model.draftPanel.persistence.styleSettings, {
    heroTopPadding: 72,
    heroBottomPadding: 72,
    backgroundTint: "#ecfeff",
    ctaColor: "#0f766e",
  });
  assert.equal(model.flags.mutatesProductionData, false);
  assert.equal(model.flags.mutatesDraftData, true);
  assert.equal(model.flags.publishes, false);
  assert.equal(model.flags.activePointerMutation, false);
});

test("airship projection reloads saved draft edits from persistent storage", () => {
  const persistedDraft: AirshipSingleSiteDraftRecord = {
    id: "draft-chs-projection",
    migrationId: CHS_MIGRATION_ID,
    tenantId: "tenant-chs",
    clientId: "client-chs",
    siteId: "site-chs",
    agencyId: null,
    sourceUrl: "https://www.chs.si/",
    targetSiteVersionRefs: {
      originalCloneSiteVersionId: ORIGINAL_CLONE_VERSION_ID,
      originalCloneRuntimeArtifactId: "929106cd-fa19-47eb-9582-ce6931d0e370",
      improvedCandidateSiteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
      improvedCandidateRuntimeArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
    },
    draftEdits: [
      {
        id: "airship-chs-home-hero-headline",
        targetSectionPage: "Homepage / hero headline",
        currentTextContentSummary: "Captured CHS homepage evidence includes the hero line.",
        proposedTextContent: "CHS helps modernize enterprise IT",
        reasonForChange: "Operator saved draft copy.",
        status: "edited",
        previewImpact: "Saved headline appears in Airship draft preview only.",
      },
    ],
    draftStatus: "draft",
    version: 3,
    semanticWatermark: "airship-single-site-editor-draft:projection",
    metadata: {
      liveBoundary: "not_applied_to_live_site",
      styleSettings: {
        heroTopPadding: 96,
        heroBottomPadding: 104,
        backgroundTint: "#eef6ff",
        ctaColor: "#1d4ed8",
      },
    },
    createdByActorId: "superadmin-projection",
    updatedByActorId: "superadmin-projection",
    acceptedAt: null,
    rejectedAt: null,
    createdAt: "2026-09-02T00:00:00.000Z",
    updatedAt: "2026-09-02T00:03:00.000Z",
  };
  const model = buildAirshipSingleSiteEditorReadonlyProjection({
    migrationId: CHS_MIGRATION_ID,
    studioModel: studioProjection,
    persistedDraft,
    generatedAt: "2026-09-02T00:03:00.000Z",
  });

  assert.equal(model.draftPanel.persistence.label, "Saved Airship draft");
  assert.equal(model.draftPanel.persistence.draftId, "draft-chs-projection");
  assert.deepEqual(model.draftPanel.persistence.styleSettings, {
    heroTopPadding: 96,
    heroBottomPadding: 104,
    backgroundTint: "#eef6ff",
    ctaColor: "#1d4ed8",
  });
  assert.equal(model.draftPanel.drafts.find((draft) => draft.id === CHS_HEADLINE_DRAFT_ID)?.proposedTextContent, "CHS helps modernize enterprise IT");
  assert.equal(model.draftPanel.draftPreview?.persistence, "saved_airship_draft");
  assert.equal(model.draftPanel.draftPreview?.hero.headline, "CHS helps modernize enterprise IT");
  assert.equal(model.draftPanel.draftPreview?.appliedToLiveSite, false);
  assert.equal(model.flags.mutatesProductionData, false);
});

test("airship projection exposes a saved draft candidate as internal preview only", () => {
  const model = buildAirshipSingleSiteEditorReadonlyProjection({
    migrationId: CHS_MIGRATION_ID,
    studioModel: studioProjection,
    airshipDraftCandidate: {
      label: "New Airship draft candidate preview",
      siteVersionId: "2d33f386-7cd3-4bbf-a9d4-f1c134c5dce7",
      runtimeArtifactId: "4ec7588a-b7cb-46dc-a735-88e4ec466a72",
      route: `${INTERNAL_PREVIEW_ROUTE_PREFIX}/2d33f386-7cd3-4bbf-a9d4-f1c134c5dce7/preview?mode=transformed`,
      mode: "transformed",
      available: true,
      unavailableReason: null,
      authNote: "Superadmin-only internal GNR8 preview. Not live, internal preview only.",
      statusLabel: "Not live, internal preview only",
      sourceLiveSiteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
      sourceLiveRuntimeArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
      draftId: "f9b31666-b3b0-4455-8650-4a8c7304a559",
      draftVersion: 5,
      styleSettings: {
        heroTopPadding: 96,
        heroBottomPadding: 104,
        backgroundTint: "#eef6ff",
        ctaColor: "#1d4ed8",
      },
      appliedEdits: [
        {
            draftEditId: CHS_HEADLINE_DRAFT_ID,
          targetSectionPage: "Homepage / hero headline",
          appliedTextContent: "CHS helps modernize secure enterprise IT",
        },
        {
            draftEditId: CHS_SUBHEADING_DRAFT_ID,
          targetSectionPage: "Homepage / hero subheading",
          appliedTextContent: "Cybersecurity, data systems, and hybrid infrastructure support for teams across the Adriatic region.",
        },
      ],
      skippedEdits: [
        {
            draftEditId: CHS_CTA_DRAFT_ID,
          targetSectionPage: "Homepage / contact call-to-action",
          skippedTextContent: "Contact CHS at sales@chs.si",
          reason: "rejected",
        },
      ],
    },
    generatedAt: "2026-09-02T00:04:00.000Z",
  });

  assert.equal(model.previews.currentLivePublished.siteVersionId, IMPROVED_CANDIDATE_VERSION_ID);
  assert.equal(model.previews.airshipDraftCandidate?.statusLabel, "Not live, internal preview only");
  assert.equal(model.previews.airshipDraftCandidate?.appliedEdits[0]?.appliedTextContent, "CHS helps modernize secure enterprise IT");
  assert.equal(
    model.previews.airshipDraftCandidate?.appliedEdits[1]?.appliedTextContent,
    "Cybersecurity, data systems, and hybrid infrastructure support for teams across the Adriatic region.",
  );
  assert.equal(model.previews.airshipDraftCandidate?.skippedEdits[0]?.skippedTextContent, "Contact CHS at sales@chs.si");
  assert.equal(model.previews.airshipDraftCandidate?.styleSettings.ctaColor, "#1d4ed8");
  assert.equal(model.flags.publishes, false);
  assert.equal(model.flags.activePointerMutation, false);
});

test("airship CHS draft guard detects Maver transport identity leaks", () => {
  assert.equal(airshipChsDraftContainsForbiddenMaverCopy("TRANSPORTI MAVER D.O.O."), true);
  assert.equal(airshipChsDraftContainsForbiddenMaverCopy("Prevozi vozil po Evropi od leta 1982"), true);
  assert.equal(airshipChsDraftContainsForbiddenMaverCopy("15 avtotransporterjev"), true);
  assert.equal(airshipChsDraftContainsForbiddenMaverCopy("CHS d.o.o. enterprise IT"), false);
});

test("airship projection builds a second imported-site model without CHS copy", () => {
  const migrationId = "11111111-2222-4333-8444-555555555555";
  const studioModel: SingleSiteStudioReadonlyProjection = {
    ...studioProjection,
    migrationId,
    diagnosticsHref: `/gnr8/command-center/single-site-publish?migrationId=${migrationId}`,
    summary: {
      site: "luna.example",
      sourceUrl: "https://luna.example/",
      mvpStatus: "Internal single-site MVP accepted",
      liveSiteUrl: "https://luna.example/",
      activePointer: "not_live",
      publishedCandidate: "DRAFT",
    },
    sourceTruth: {
      tenantId: "tenant-luna",
      clientId: "client-luna",
      siteId: "site-luna",
      ownershipSiteId: null,
      runtimeSiteId: "runtime-luna",
    },
    sourceEvidence: [
      { label: "Hero headline", status: "present", detail: "Captured source headline `Luna Books for curious teams`." },
      { label: "Service positioning", status: "present", detail: "Captured value proposition `Editorial research, launch notes, and reading operations for product teams.`." },
      { label: "Contact action", status: "present", detail: "Captured contact evidence includes `Contact Luna at hello@luna.example`." },
    ],
  };

  const model = buildAirshipSingleSiteEditorReadonlyProjection({
    migrationId,
    studioModel,
    generatedAt: "2026-09-02T00:10:00.000Z",
  });

  assert.equal(model.importedSite, "luna.example");
  assert.equal(model.draftPanel.drafts.length, 3);
  assert.equal(model.draftPanel.draftPreview?.hero.eyebrow, "LUNA");
  assert.equal(model.draftPanel.draftPreview?.hero.headline, "Luna Books for curious teams");
  assert.equal(model.draftPanel.draftPreview?.hero.subheading, "Editorial research, launch notes, and reading operations for product teams.");
  assert.equal(model.draftPanel.draftPreview?.hero.primaryCtaLabel, "Contact Luna at hello@luna.example");
  assert.equal(JSON.stringify(model).includes("chs.si"), false);
  assert.equal(JSON.stringify(model).includes("CHS"), false);
  assert.equal(JSON.stringify(model).includes("Maver"), false);
});

test("airship projection keeps CHS free of Maver copy unless CHS source evidence contains it", () => {
  const contaminatedDraft: AirshipSingleSiteDraftRecord = {
    id: "draft-chs-contaminated",
    migrationId: CHS_MIGRATION_ID,
    tenantId: "tenant-chs",
    clientId: "client-chs",
    siteId: "site-chs",
    agencyId: null,
    sourceUrl: "https://www.chs.si/",
    targetSiteVersionRefs: {
      originalCloneSiteVersionId: ORIGINAL_CLONE_VERSION_ID,
      originalCloneRuntimeArtifactId: "929106cd-fa19-47eb-9582-ce6931d0e370",
      improvedCandidateSiteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
      improvedCandidateRuntimeArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
    },
    draftEdits: [{
      id: CHS_HEADLINE_DRAFT_ID,
      targetSectionPage: "Homepage / hero headline",
      currentTextContentSummary: "Wrong imported-site copy.",
      proposedTextContent: "Transporti Maver vehicle transport across Europe",
      reasonForChange: "Wrong source.",
      status: "edited",
      previewImpact: "Should be ignored for CHS.",
    }],
    draftStatus: "draft",
    version: 9,
    semanticWatermark: "airship-single-site-editor-draft:contaminated",
    metadata: { liveBoundary: "not_applied_to_live_site" },
    createdByActorId: "superadmin",
    updatedByActorId: "superadmin",
    acceptedAt: null,
    rejectedAt: null,
    createdAt: "2026-09-02T00:00:00.000Z",
    updatedAt: "2026-09-02T00:09:00.000Z",
  };

  const model = buildAirshipSingleSiteEditorReadonlyProjection({
    migrationId: CHS_MIGRATION_ID,
    studioModel: studioProjection,
    persistedDraft: contaminatedDraft,
  });

  assert.equal(model.draftPanel.persistence.draftId, null);
  assert.equal(model.draftPanel.draftPreview?.hero.headline, "Less risk. More control. Better IT.");
  assert.equal(airshipChsDraftContainsForbiddenMaverCopy(model), false);
});

test("airship projection handles missing or partial source evidence without CHS fallback copy", () => {
  const migrationId = "22222222-3333-4444-8555-666666666666";
  const studioModel: SingleSiteStudioReadonlyProjection = {
    ...studioProjection,
    migrationId,
    summary: {
      site: "partial.example",
      sourceUrl: "https://partial.example/",
      mvpStatus: "Internal single-site MVP status unavailable",
      liveSiteUrl: "https://partial.example/",
      activePointer: "unknown",
      publishedCandidate: "unknown",
    },
    sourceTruth: null,
    sourceEvidence: [
      { label: "Source evidence", status: "missing", detail: "No source evidence review was available for this migration lookup." },
    ],
  };

  const model = buildAirshipSingleSiteEditorReadonlyProjection({
    migrationId,
    studioModel,
  });

  assert.equal(model.draftPanel.drafts.length, 0);
  assert.equal(model.draftPanel.draftPreview, null);
  assert.equal(model.importedSiteModel.sourceEvidenceSummary.status, "partial_evidence");
  assert.equal(model.aiImprovementStatus.deterministicEditableChangesGenerated, false);
  assert.equal(JSON.stringify(model).includes("Less risk. More control. Better IT."), false);
  assert.equal(JSON.stringify(model).includes("Contact CHS"), false);
});

test("airship projection with missing migration id stays unavailable and does not fall back to CHS", () => {
  const studioModel: SingleSiteStudioReadonlyProjection = {
    ...studioProjection,
    migrationId: null,
    diagnosticsHref: "/gnr8/command-center/single-site-publish",
    summary: {
      site: "Imported single-site",
      sourceUrl: "Source URL unavailable",
      mvpStatus: "Internal single-site MVP status unavailable",
      liveSiteUrl: "Source URL unavailable",
      activePointer: "unknown",
      publishedCandidate: "unknown",
    },
    sourceTruth: null,
    import: {
      inputUrl: "Source URL unavailable",
      captured: false,
      status: "unavailable",
    },
    sourceEvidence: [],
    previews: {
      originalClone: {
        label: "Original clone preview",
        siteVersionId: null,
        runtimeArtifactId: null,
        route: null,
        mode: "transformed",
        available: false,
        unavailableReason: "Internal preview unavailable: missing runtime site version ref for this stage.",
        authNote: "No internal GNR8 preview route can be constructed without a site version id.",
      },
      improvedCandidate: {
        label: "Improved candidate preview",
        siteVersionId: null,
        runtimeArtifactId: null,
        route: null,
        mode: "transformed",
        available: false,
        unavailableReason: "Internal preview unavailable: missing runtime site version ref for this stage.",
        authNote: "No internal GNR8 preview route can be constructed without a site version id.",
      },
    },
    improvementSummary: {
      headline: "Internal single-site improvement status unavailable",
      appliedCount: 0,
      limitationCount: 0,
      noDeterministicContentChanges: true,
      recommendations: [],
    },
  };

  const model = buildAirshipSingleSiteEditorReadonlyProjection({
    migrationId: null,
    studioModel,
  });

  assert.equal(model.migrationId, null);
  assert.equal(model.routeHref, "/gnr8/airship/single-site");
  assert.equal(model.links.airshipEditor, "/gnr8/airship/single-site/editor");
  assert.equal(model.importedSite, "Imported single-site");
  assert.equal(model.importedSiteModel.sourceEvidenceSummary.status, "missing_evidence");
  assert.equal(model.importedSiteModel.latestDraft.draftId, null);
  assert.equal(model.importedSiteModel.latestInternalPreviewCandidate, null);
  assert.equal(model.draftPanel.drafts.length, 0);
  assert.equal(model.draftPanel.draftPreview, null);
  assert.equal(JSON.stringify(model).includes(CHS_MIGRATION_ID), false);
  assert.equal(JSON.stringify(model).includes("Less risk. More control. Better IT."), false);
  assert.equal(JSON.stringify(model).includes("Contact CHS"), false);
});
