import assert from "node:assert/strict";
import test from "node:test";

import { buildAirshipSingleSiteEditorReadonlyProjection } from "./airship-single-site-editor-readonly-projection";
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
  import: {
    inputUrl: "https://www.chs.si/",
    captured: true,
    status: "accepted",
  },
  workflow: [],
  sourceEvidence: [],
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

test("airship projection generates the first concrete CHS AI draft and preview read-only", () => {
  const model = buildAirshipSingleSiteEditorReadonlyProjection({
    migrationId: CHS_MIGRATION_ID,
    studioModel: studioProjection,
    generatedAt: "2026-09-01T00:00:00.000Z",
  });

  assert.equal(model.aiImprovementStatus.label, "Editable AI draft generated");
  assert.equal(model.aiImprovementStatus.deterministicEditableChangesGenerated, true);
  assert.equal(model.draftPanel.drafts.length, 3);
  assert.equal(model.draftPanel.drafts.every((draft) => draft.status === "proposed"), true);
  assert.equal(
    model.draftPanel.drafts.map((draft) => draft.targetSectionPage).join("|"),
    "Homepage / hero headline|Homepage / hero subheading|Homepage / contact call-to-action",
  );
  assert.equal(model.draftPanel.drafts.some((draft) => draft.proposedTextContent === "Prevozi vozil po Evropi od leta 1982"), true);
  assert.equal(model.draftPanel.draftPreview?.label, "AI draft preview");
  assert.equal(model.draftPanel.draftPreview?.appliedToLiveSite, false);
  assert.equal(model.draftPanel.draftPreview?.persistence, "generated_read_only");
  assert.equal(model.draftPanel.controlMode, "disabled_read_only_generated_draft");
  assert.equal(model.flags.mutatesProductionData, false);
  assert.equal(model.flags.publishes, false);
  assert.equal(model.flags.activePointerMutation, false);
});
