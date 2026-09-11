import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import ReactDomServer from "react-dom/server";

import type { AirshipSingleSiteEditorReadonlyProjection } from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";
import type { AirshipAgentProfileSelection } from "@/gnr8/single-site/airship-agent-profile-types";

import { AirshipSingleSiteEditor } from "./airship-single-site-editor";
import {
  applyAirshipSingleSiteLocalDraftEdit,
  initialAirshipSingleSiteLocalDraftFields,
} from "./airship-single-site-local-draft-editor";
import {
  AirshipSingleSiteVisualEditorWorkspace,
  airshipCanApplySavedDraftToPreview,
  airshipCanvasSelectorForSection,
  applyAirshipHeroCommand,
  applyAirshipHeroTextFieldEdit,
  deriveAirshipSelectedElementMetadata,
  deriveAirshipDraftSaveState,
  deriveAirshipStyleValueRows,
  initialAirshipHeroEditorFields,
  mappedAirshipDraftFieldIdsForSection,
  resetAirshipSectionStyleToSavedValues,
  resetAirshipSectionTextToSavedValues,
  sectionStyleFields,
  sectionTextFields,
  undoAirshipEditorLastLocalChange,
} from "./editor/airship-single-site-visual-editor-workspace";

const { renderToStaticMarkup } = ReactDomServer;

const CHS_MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const ORIGINAL_CLONE_VERSION_ID = "6b172a5b-200e-471c-9599-5dc70f04ea53";
const IMPROVED_CANDIDATE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const INTERNAL_PREVIEW_ROUTE_PREFIX = "/api/gnr8/admin/single-site-studio/versions";
const PAGE_FILE = new URL("./page.tsx", import.meta.url);
const COMPONENT_FILE = new URL("./airship-single-site-editor.tsx", import.meta.url);
const LOCAL_EDITOR_FILE = new URL("./airship-single-site-local-draft-editor.tsx", import.meta.url);
const VISUAL_EDITOR_PAGE_FILE = new URL("./editor/page.tsx", import.meta.url);
const VISUAL_EDITOR_FILE = new URL("./editor/airship-single-site-visual-editor-workspace.tsx", import.meta.url);
const PROJECTION_FILE = new URL("../../../../gnr8/single-site/airship-single-site-editor-readonly-projection.ts", import.meta.url);
const PREVIEW_ROUTE_FILE = new URL("../../../api/gnr8/admin/single-site-studio/versions/[siteVersionId]/preview/route.ts", import.meta.url);

function selectedAirshipProfile(overrides: Partial<AirshipAgentProfileSelection> = {}): AirshipAgentProfileSelection {
  return {
    status: "selected" as const,
    activeProfile: {
      profileId: "airship-editor-default",
      profileName: "Airship Editor Default",
      provider: "openai" as const,
      model: "gpt-5",
      purpose: "airship_editor" as const,
      costPosture: "balanced" as const,
      enabled: true,
      defaultProfile: true,
      providerConnectionStatus: "connected" as const,
      canUseAiCommands: true,
      source: "derived_from_openai_byok_status" as const,
    },
    diagnostics: ["airship_agent_default_profile_selected"],
    ...overrides,
  };
}

function airshipModel(): AirshipSingleSiteEditorReadonlyProjection {
  return {
    version: "airship-1-single-site-editor-readonly:v1",
    generatedAt: "2026-09-01T00:00:00.000Z",
    routeHref: `/gnr8/airship/single-site?migrationId=${CHS_MIGRATION_ID}`,
    state: "visible",
    migrationId: CHS_MIGRATION_ID,
    importedSite: "chs.si",
    sourceUrl: "https://www.chs.si/",
    importedSiteModel: {
      siteLabel: "chs.si",
      sourceUrl: "https://www.chs.si/",
      liveUrl: "https://www.chs.si/",
      sourceEvidenceSummary: {
        status: "source_supported",
        detail: "3 source evidence item(s) available for chs.si.",
        evidenceItems: [
          { label: "Hero headline", status: "present", detail: "Captured CHS homepage evidence includes hero headline `Less risk. More control. Better IT.`." },
          { label: "Service positioning", status: "present", detail: "Captured CHS source evidence includes value proposition `Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region.`." },
          { label: "Contact action", status: "present", detail: "Captured CHS contact evidence includes `Contact CHS at sales@chs.si`, `sales@chs.si`, and a homepage contact form." },
        ],
      },
      editableSections: [
        {
          key: "hero",
          label: "Hero / intro",
          detail: "Headline, subheading, spacing, tint",
          mappedDraftFieldIds: ["airship-chs-home-hero-headline", "airship-chs-home-hero-value-proposition"],
          sourceStatus: "source-supported hero draft fields",
        },
        {
          key: "cta",
          label: "CTA",
          detail: "Primary action label and color",
          mappedDraftFieldIds: ["airship-chs-home-contact-cta"],
          sourceStatus: "source-supported CTA draft field",
        },
        {
          key: "source",
          label: "Source material",
          detail: "Imported-site evidence and internal draft refs",
          mappedDraftFieldIds: ["airship-chs-home-hero-headline", "airship-chs-home-hero-value-proposition", "airship-chs-home-contact-cta"],
          sourceStatus: "source material readback only",
        },
      ],
      draftFields: [
        { fieldKey: "headline", draftId: "airship-chs-home-hero-headline", label: "Homepage / hero headline", sectionKey: "hero", sourceStatus: "source-supported" },
        { fieldKey: "subheading", draftId: "airship-chs-home-hero-value-proposition", label: "Homepage / hero subheading", sectionKey: "hero", sourceStatus: "source-supported" },
        { fieldKey: "ctaLabel", draftId: "airship-chs-home-contact-cta", label: "Homepage / contact call-to-action", sectionKey: "cta", sourceStatus: "source-supported" },
      ],
      latestDraft: {
        draftId: null,
        draftStatus: null,
        version: null,
        lastSavedAt: null,
      },
      latestInternalPreviewCandidate: null,
      latestInternalPreviewReview: null,
      latestInternalPreviewPublishReadiness: null,
      latestInternalPreviewGovernedDryRun: null,
      publishedVersionRefs: {
        siteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
        runtimeArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
        liveUrl: "https://www.chs.si/",
        activePointer: "live",
        publishedCandidate: "PUBLISHED",
      },
    },
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
      detail: "3 proposed Airship draft edit(s) generated for the imported chs.si homepage from source evidence. Browser edits are local-only and are not applied to the live site.",
      deterministicEditableChangesGenerated: true,
    },
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
      currentImprovedPublished: {
        label: "Improved candidate preview",
        siteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
        runtimeArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
        route: `${INTERNAL_PREVIEW_ROUTE_PREFIX}/${IMPROVED_CANDIDATE_VERSION_ID}/preview?mode=transformed`,
        mode: "transformed",
        available: true,
        unavailableReason: null,
        authNote: "Authenticated runtime preview route exists.",
      },
      currentLivePublished: {
        label: "Improved candidate preview",
        siteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
        runtimeArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
        route: `${INTERNAL_PREVIEW_ROUTE_PREFIX}/${IMPROVED_CANDIDATE_VERSION_ID}/preview?mode=transformed`,
        mode: "transformed",
        available: true,
        unavailableReason: null,
        authNote: "Authenticated runtime preview route exists.",
      },
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
            draftEditId: "airship-chs-home-hero-headline",
            targetSectionPage: "Homepage / hero headline",
            appliedTextContent: "CHS helps modernize secure enterprise IT",
          },
          {
            draftEditId: "airship-chs-home-hero-value-proposition",
            targetSectionPage: "Homepage / hero subheading",
            appliedTextContent: "Cybersecurity, data systems, and hybrid infrastructure support for teams across the Adriatic region.",
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
      },
      airshipDraftCandidateReview: null,
      airshipDraftCandidatePublishReadiness: null,
      airshipDraftCandidateGovernedDryRun: null,
    },
    links: {
      liveSite: "https://www.chs.si/",
      airshipEditor: `/gnr8/airship/single-site/editor?migrationId=${CHS_MIGRATION_ID}`,
      singleSiteStudio: `/gnr8/command-center/single-site-studio?migrationId=${CHS_MIGRATION_ID}`,
      diagnostics: `/gnr8/command-center/single-site-publish?migrationId=${CHS_MIGRATION_ID}`,
    },
    draftPanel: {
      title: "AI improvement draft",
      emptyMessage: "No concrete editable AI changes have been generated yet.",
      drafts: [
        {
          id: "airship-chs-home-hero-headline",
          fieldKey: "headline",
          targetSectionPage: "Homepage / hero headline",
          currentTextContentSummary: "Captured CHS homepage evidence includes the hero line `Less risk. More control. Better IT.` and the CHS identity in the page title and footer.",
          proposedTextContent: "Less risk. More control. Better IT.",
          reasonForChange: "Keep the first-viewport headline anchored to CHS source copy and make the CHS identity explicit without introducing outside claims.",
          status: "proposed",
          previewImpact: "AI draft preview opens with the CHS homepage headline instead of unrelated company or transport copy.",
        },
        {
          id: "airship-chs-home-hero-value-proposition",
          fieldKey: "subheading",
          targetSectionPage: "Homepage / hero subheading",
          currentTextContentSummary: "Captured CHS source evidence says CHS delivers advanced solutions in cybersecurity, data systems, and hybrid infrastructure across the Adriatic region.",
          proposedTextContent: "Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region.",
          reasonForChange: "Condense the source-supported service description into a clearer first-viewport value proposition.",
          status: "proposed",
          previewImpact: "AI draft preview explains CHS's IT focus in one scannable line under the headline.",
        },
        {
          id: "airship-chs-home-contact-cta",
          fieldKey: "ctaLabel",
          targetSectionPage: "Homepage / contact call-to-action",
          currentTextContentSummary: "Captured CHS source evidence includes `Contact us`, `sales@chs.si`, and a homepage contact form.",
          proposedTextContent: "Contact CHS at sales@chs.si",
          reasonForChange: "Make the contact action outcome-specific while keeping it tied to the existing contact section and source contact channels.",
          status: "proposed",
          previewImpact: "AI draft preview shows a clearer CHS contact CTA; it is not wired to mutate or publish production content.",
        },
      ],
      draftPreview: {
        label: "AI draft preview",
        appliedToLiveSite: false,
        persistence: "browser_local_only",
        note: "Local Airship draft preview only. Browser edits are not live, not published, and not persisted as production content.",
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
        styleSettings: {
          heroTopPadding: 72,
          heroBottomPadding: 72,
          backgroundTint: "#ecfeff",
          ctaColor: "#0f766e",
        },
        notAppliedToLiveSite: true,
        notPublished: true,
      },
      recommendationMaterial: [
        {
          id: "0be61bde-6568-4f33-8499-4d5eade70837",
          key: "make-contact-actions-more-prominent",
          title: "Make contact actions more prominent",
          targetSectionPage: "Global header and contact call-to-action areas",
          currentTextContentSummary: "The accepted MVP clone preserves CHS contact access, but no deterministic edit exists to promote contact actions.",
          proposedTextContent: "Recommendation source material only: Make contact actions more prominent. No exact replacement text or content block has been generated.",
          reasonForChange: "Make contact actions more prominent",
          sourceStatus: "accepted_limitation",
          limitationReason: "unsupported_in_mvp",
          previewImpact: "Accepted limitation: unsupported in mvp. No preview-changing edit is available from this recommendation yet.",
        },
        {
          id: "86342f67-7cce-43de-823f-ea0f4adc1a41",
          key: "clarify-service-positioning-copy",
          title: "Clarify service positioning copy",
          targetSectionPage: "Homepage service positioning copy",
          currentTextContentSummary: "The accepted MVP clone keeps source positioning, but no exact replacement copy has been generated for service clarity.",
          proposedTextContent: "Recommendation source material only: Clarify service positioning copy. No exact replacement text or content block has been generated.",
          reasonForChange: "Clarify service positioning copy",
          sourceStatus: "accepted_limitation",
          limitationReason: "requires_operator_input",
          previewImpact: "Accepted limitation: requires operator input. No preview-changing edit is available from this recommendation yet.",
        },
      ],
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

test("airship single-site editor renders CHS summary, live link, and AI improvement status", () => {
  const html = renderToStaticMarkup(<AirshipSingleSiteEditor model={airshipModel()} />);

  assert.equal(html.includes("Airship"), true);
  assert.equal(html.includes("chs.si single-site editor"), true);
  assert.equal(html.includes("Imported site"), true);
  assert.equal(html.includes("chs.si"), true);
  assert.equal(html.includes("https://www.chs.si/"), true);
  assert.equal(html.includes("Internal single-site MVP accepted"), true);
  assert.equal(html.includes("AI improvement status"), true);
  assert.equal(html.includes("Editable AI draft generated"), true);
  assert.equal(html.includes("Open Airship Editor"), true);
  assert.equal(html.includes(`/gnr8/airship/single-site/editor?migrationId=${CHS_MIGRATION_ID}`), true);
  assert.equal(html.includes("Open live site"), true);
});

test("airship single-site editor renders live published and Airship draft candidate previews with internal routes", () => {
  const html = renderToStaticMarkup(<AirshipSingleSiteEditor model={airshipModel()} />);

  assert.equal(html.includes("Current live/published preview"), true);
  assert.equal(html.includes("New Airship draft candidate preview"), true);
  assert.equal(html.includes("Not live, internal preview only"), true);
  assert.equal(html.includes("Saved draft to internal preview"), true);
  assert.equal(html.includes("Apply saved draft to preview"), true);
  assert.equal(html.includes("Internal preview review readiness"), true);
  assert.equal(html.includes("Approve internal preview for publish readiness"), true);
  assert.equal(html.includes("Publish-readiness evidence handoff"), true);
  assert.equal(html.includes("Prepare publish readiness"), true);
  assert.equal(html.includes("readiness/evidence only"), true);
  assert.equal(html.includes("next step: governed dry-run"), true);
  assert.equal(html.includes("active pointer unchanged"), true);
  assert.equal(html.includes("records review readiness only"), true);
  assert.equal(html.includes("Open latest internal preview candidate"), true);
  assert.equal(html.includes("accepted/saved edits applied"), true);
  assert.equal(html.includes("rejected CTA not applied"), true);
  assert.equal(html.includes("CHS helps modernize secure enterprise IT"), true);
  assert.equal(html.includes("Cybersecurity, data systems, and hybrid infrastructure support for teams across the Adriatic region."), true);
  assert.equal(html.includes("AI draft preview"), true);
  assert.equal(html.includes("Saved Airship draft"), true);
  assert.equal(html.includes(`${INTERNAL_PREVIEW_ROUTE_PREFIX}/${IMPROVED_CANDIDATE_VERSION_ID}/preview?mode=transformed`), true);
  assert.equal(html.includes(`${INTERNAL_PREVIEW_ROUTE_PREFIX}/2d33f386-7cd3-4bbf-a9d4-f1c134c5dce7/preview?mode=transformed`), true);
  assert.equal(html.includes('src="https://www.chs.si/"'), false);
  assert.equal(html.includes("If this frame shows a connection-session error"), true);
  assert.equal(html.includes("The draft editor below remains usable."), true);
});

test("airship single-site editor shows approved internal preview review status and next step", () => {
  const model = airshipModel();
  model.previews.airshipDraftCandidateReview = {
    id: "33333333-3333-4333-8333-333333333333",
    migrationId: CHS_MIGRATION_ID,
    draftId: "f9b31666-b3b0-4455-8650-4a8c7304a559",
    draftVersion: 5,
    candidateSiteVersionId: "2d33f386-7cd3-4bbf-a9d4-f1c134c5dce7",
    candidateRuntimeArtifactId: "4ec7588a-b7cb-46dc-a735-88e4ec466a72",
    reviewDecision: "approved_for_publish_readiness",
    reviewStatus: "approved",
    publishReadinessReady: true,
    reviewerActorId: "superadmin-reviewer",
    reviewerActorType: "human",
    reviewerActorRole: "platform_superadmin",
    reviewedAt: "2026-09-10T00:08:00.000Z",
    limitationsNotes: "Internal preview only; not live, not published; active pointer unchanged.",
    nextStep: "publish-readiness evaluation, not publish",
    activePointerSiteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
    activePointerArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
    activePointerChanged: false,
    runtimeVersionStateMutated: false,
    liveSiteMutated: false,
    published: false,
    serviceVersion: "airship-5-internal-preview-candidate-review:v1",
    idempotencyKey: "review-key",
    correlationId: "review-correlation",
    metadata: { internalPreviewOnly: true },
    createdAt: "2026-09-10T00:08:00.000Z",
    updatedAt: "2026-09-10T00:08:00.000Z",
  };
  const html = renderToStaticMarkup(<AirshipSingleSiteEditor model={model} />);

  assert.equal(html.includes("Approved for publish readiness"), true);
  assert.equal(html.includes("approved / reviewed"), true);
  assert.equal(html.includes("Reviewed candidate"), true);
  assert.equal(html.includes("Preview artifact"), true);
  assert.equal(html.includes("platform_superadmin: superadmin-reviewer"), true);
  assert.equal(html.includes("publish-readiness evaluation, not publish"), true);
  assert.equal(html.includes("not live"), true);
  assert.equal(html.includes("not published"), true);
  assert.equal(html.includes("active pointer unchanged"), true);
});

test("airship single-site editor shows publish-readiness package status and governed dry-run next step", () => {
  const model = airshipModel();
  const candidate = model.previews.airshipDraftCandidate;
  assert.ok(candidate);
  model.draftPanel.persistence.draftId = candidate.draftId;
  model.draftPanel.persistence.version = candidate.draftVersion;
  model.previews.airshipDraftCandidateReview = {
    id: "33333333-3333-4333-8333-333333333333",
    migrationId: CHS_MIGRATION_ID,
    draftId: candidate.draftId,
    draftVersion: candidate.draftVersion,
    candidateSiteVersionId: candidate.siteVersionId,
    candidateRuntimeArtifactId: candidate.runtimeArtifactId,
    reviewDecision: "approved_for_publish_readiness",
    reviewStatus: "approved",
    publishReadinessReady: true,
    reviewerActorId: "superadmin-reviewer",
    reviewerActorType: "human",
    reviewerActorRole: "platform_superadmin",
    reviewedAt: "2026-09-10T12:18:00.750Z",
    limitationsNotes: "Internal preview only; not live, not published; active pointer unchanged.",
    nextStep: "publish-readiness evaluation, not publish",
    activePointerSiteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
    activePointerArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
    activePointerChanged: false,
    runtimeVersionStateMutated: false,
    liveSiteMutated: false,
    published: false,
    serviceVersion: "airship-5-internal-preview-candidate-review:v1",
    idempotencyKey: "review-key",
    correlationId: "review-correlation",
    metadata: { internalPreviewOnly: true },
    createdAt: "2026-09-10T12:18:00.750Z",
    updatedAt: "2026-09-10T12:18:00.750Z",
  };
  model.previews.airshipDraftCandidatePublishReadiness = {
    id: "44444444-4444-4444-8444-444444444444",
    migrationId: CHS_MIGRATION_ID,
    reviewRecordId: "33333333-3333-4333-8333-333333333333",
    readinessStatus: "complete",
    nextStep: "governed dry-run later, not publish",
    siteClientSourceLabels: {
      tenantId: "tenant-chs",
      clientId: "client-chs",
      siteId: "site-chs",
      sourceUrl: "https://www.chs.si/",
      liveUrl: "https://www.chs.si/",
      importedSiteLabel: "chs.si",
    },
    reviewedCandidateSiteVersionId: candidate.siteVersionId,
    reviewedArtifactId: candidate.runtimeArtifactId,
    draftId: candidate.draftId,
    draftVersion: candidate.draftVersion,
    reviewStatus: "approved",
    reviewDecision: "approved_for_publish_readiness",
    reviewedAt: "2026-09-10T12:18:00.750Z",
    currentLiveActivePointerBefore: {
      siteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
      artifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
    },
    currentLiveActivePointerAfter: {
      siteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
      artifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
    },
    sourceEvidenceSummary: {
      status: "source_supported",
      detail: "3 source evidence item(s) available for chs.si.",
      evidenceItems: [
        { label: "Hero headline", status: "present", detail: "Captured CHS homepage evidence includes hero headline." },
      ],
    },
    savedDraftFieldSummary: [
      {
        id: "airship-chs-home-hero-headline",
        fieldKey: "headline",
        targetSectionPage: "Homepage / hero headline",
        status: "accepted",
        currentTextContentSummary: "Existing CHS headline.",
        proposedTextContent: "CHS helps modernize secure enterprise IT",
      },
    ],
    internalPreviewUrl: candidate.route,
    limitationsWarnings: ["Internal preview only; not live; not published; active pointer unchanged."],
    noPublishConfirmation: {
      internalPreviewOnly: true,
      notLive: true,
      notPublished: true,
      candidateRuntimeState: "DRAFT",
      activePointerChanged: false,
      runtimeVersionStateMutated: false,
      liveSiteMutated: false,
      publishes: false,
      dryRun: false,
      shadowPublish: false,
      rollback: false,
      sourceCapture: false,
      providerCall: false,
    },
    serviceVersion: "airship-6-publish-readiness-package:v1",
    idempotencyKey: "readiness-key",
    correlationId: "readiness-correlation",
    metadata: { internalPreviewOnly: true },
    createdAt: "2026-09-10T12:20:00.000Z",
    updatedAt: "2026-09-10T12:20:00.000Z",
  };
  const html = renderToStaticMarkup(<AirshipSingleSiteEditor model={model} />);

  assert.equal(html.includes("Publish-readiness evidence handoff"), true);
  assert.equal(html.includes("Publish readiness prepared"), true);
  assert.equal(html.includes("complete / evidence prepared"), true);
  assert.equal(html.includes("Reviewed candidate"), true);
  assert.equal(html.includes(candidate.siteVersionId), true);
  assert.equal(html.includes(candidate.runtimeArtifactId), true);
  assert.equal(html.includes(`${candidate.draftId} v${candidate.draftVersion}`), true);
  assert.equal(html.includes("33333333-3333-4333-8333-333333333333 / approved / 2026-09-10T12:18:00.750Z"), true);
  assert.equal(html.includes("Pointer before"), true);
  assert.equal(html.includes("Pointer after"), true);
  assert.equal(html.includes(`${IMPROVED_CANDIDATE_VERSION_ID} / 1f80138a-39c2-4210-ac61-16200e5a2254`), true);
  assert.equal(html.includes("3 source evidence item(s) available for chs.si."), true);
  assert.equal(html.includes("Homepage / hero headline (accepted)"), true);
  assert.equal(html.includes("governed dry-run later, not publish"), true);
  assert.equal(html.includes("candidate runtime state DRAFT"), true);
  assert.equal(html.includes("no dry-run, shadow-publish, rollback, source capture, provider call, or live-site mutation"), true);
});

test("airship single-site editor shows governed dry-run action and readback without publish controls", () => {
  const model = airshipModel();
  const candidate = {
    label: "New Airship draft candidate preview",
    siteVersionId: "92e476b9-67fc-408a-be3d-5c744aa0f3f6",
    runtimeArtifactId: "5ac3716a-f29d-4648-bc86-a6942638ed53",
    route: `${INTERNAL_PREVIEW_ROUTE_PREFIX}/92e476b9-67fc-408a-be3d-5c744aa0f3f6/preview?mode=transformed`,
    mode: "transformed" as const,
    available: true,
    unavailableReason: null,
    authNote: "Superadmin-only internal GNR8 preview. Not live, internal preview only.",
    statusLabel: "Not live, internal preview only",
    sourceLiveSiteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
    sourceLiveRuntimeArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
    draftId: "f9b31666-b3b0-4455-8650-4a8c7304a559",
    draftVersion: 44,
    styleSettings: {
      heroTopPadding: 96,
      heroBottomPadding: 104,
      backgroundTint: "#eef6ff",
      ctaColor: "#1d4ed8",
    },
    appliedEdits: [],
    skippedEdits: [],
  };
  model.draftPanel.persistence.draftId = candidate.draftId;
  model.draftPanel.persistence.version = candidate.draftVersion;
  model.previews.airshipDraftCandidate = candidate;
  model.previews.airshipDraftCandidateReview = {
    id: "4bcca499-468b-40ff-b124-9cee88061263",
    migrationId: CHS_MIGRATION_ID,
    draftId: candidate.draftId,
    draftVersion: candidate.draftVersion,
    candidateSiteVersionId: candidate.siteVersionId,
    candidateRuntimeArtifactId: candidate.runtimeArtifactId,
    reviewDecision: "approved_for_publish_readiness",
    reviewStatus: "approved",
    publishReadinessReady: true,
    reviewerActorId: "superadmin-reviewer",
    reviewerActorType: "human",
    reviewerActorRole: "platform_superadmin",
    reviewedAt: "2026-09-10T12:18:00.750Z",
    limitationsNotes: "Internal preview only; not live, not published; active pointer unchanged.",
    nextStep: "publish-readiness evaluation, not publish",
    activePointerSiteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
    activePointerArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
    activePointerChanged: false,
    runtimeVersionStateMutated: false,
    liveSiteMutated: false,
    published: false,
    serviceVersion: "airship-5-internal-preview-candidate-review:v1",
    idempotencyKey: "review-key",
    correlationId: "review-correlation",
    metadata: { internalPreviewOnly: true },
    createdAt: "2026-09-10T12:18:00.750Z",
    updatedAt: "2026-09-10T12:18:00.750Z",
  };
  model.previews.airshipDraftCandidatePublishReadiness = {
    id: "3fdcde40-e178-40b5-83e1-217d600315ef",
    migrationId: CHS_MIGRATION_ID,
    reviewRecordId: "4bcca499-468b-40ff-b124-9cee88061263",
    readinessStatus: "complete",
    nextStep: "governed dry-run later, not publish",
    siteClientSourceLabels: {
      tenantId: "tenant-chs",
      clientId: "client-chs",
      siteId: "site-chs",
      sourceUrl: "https://www.chs.si/",
      liveUrl: "https://www.chs.si/",
      importedSiteLabel: "chs.si",
    },
    reviewedCandidateSiteVersionId: candidate.siteVersionId,
    reviewedArtifactId: candidate.runtimeArtifactId,
    draftId: candidate.draftId,
    draftVersion: candidate.draftVersion,
    reviewStatus: "approved",
    reviewDecision: "approved_for_publish_readiness",
    reviewedAt: "2026-09-10T12:18:00.750Z",
    currentLiveActivePointerBefore: { siteVersionId: IMPROVED_CANDIDATE_VERSION_ID, artifactId: "1f80138a-39c2-4210-ac61-16200e5a2254" },
    currentLiveActivePointerAfter: { siteVersionId: IMPROVED_CANDIDATE_VERSION_ID, artifactId: "1f80138a-39c2-4210-ac61-16200e5a2254" },
    sourceEvidenceSummary: {
      status: "source_supported",
      detail: "3 source evidence item(s) available for chs.si.",
      evidenceItems: [],
    },
    savedDraftFieldSummary: [],
    internalPreviewUrl: candidate.route,
    limitationsWarnings: ["Internal preview only; not live; not published; active pointer unchanged."],
    noPublishConfirmation: {
      internalPreviewOnly: true,
      notLive: true,
      notPublished: true,
      candidateRuntimeState: "DRAFT",
      activePointerChanged: false,
      runtimeVersionStateMutated: false,
      liveSiteMutated: false,
      publishes: false,
      dryRun: false,
      shadowPublish: false,
      rollback: false,
      sourceCapture: false,
      providerCall: false,
    },
    serviceVersion: "airship-6-publish-readiness-package:v1",
    idempotencyKey: "readiness-key",
    correlationId: "readiness-correlation",
    metadata: { internalPreviewOnly: true },
    createdAt: "2026-09-10T12:20:00.000Z",
    updatedAt: "2026-09-10T12:20:00.000Z",
  };
  model.previews.airshipDraftCandidateGovernedDryRun = {
    ok: false,
    actionId: "77777777-7777-4777-8777-777777777777",
    actionStatus: "dry_run_completed",
    preflightStatus: "wrapper_blocked",
    resolverStatus: "incomplete",
    wrapperDryRunStatus: "preflight_blocked",
    blockerCodes: ["publish_activation_gate_missing"],
    warnings: ["limitations_carried_forward"],
    limitationCodes: ["airship_internal_preview_only"],
    safeRefs: null,
    idempotencyKey: "airship-governed-dry-run:key",
    correlationId: "airship-governed-dry-run:corr",
    createdAt: "2026-09-10T12:21:00.000Z",
    completedAt: "2026-09-10T12:21:01.000Z",
  };
  const html = renderToStaticMarkup(<AirshipSingleSiteEditor model={model} />);

  assert.equal(html.includes("Governed dry-run check"), true);
  assert.equal(html.includes("Governed dry-run recorded"), true);
  assert.equal(html.includes("Dry-run only; no publish; no shadow-publish; active pointer unchanged; live CHS unchanged."), true);
  assert.equal(html.includes("publish_activation_gate_missing"), true);
  assert.equal(html.includes("resolve listed blockers"), true);
  assert.equal(html.includes("Shadow publish"), false);
});

test("airship single-site editor shows concrete proposed draft rows", () => {
  const html = renderToStaticMarkup(<AirshipSingleSiteEditor model={airshipModel()} />);

  assert.equal(html.includes("AI improvement draft"), true);
  assert.equal(html.includes("No concrete editable AI changes have been generated yet."), false);
  assert.equal(html.includes("Target section/page"), true);
  assert.equal(html.includes("Current text/content summary"), true);
  assert.equal(html.includes("Proposed text/content"), true);
  assert.equal(html.includes("Reason for change"), true);
  assert.equal(html.includes("Status"), true);
  assert.equal(html.includes("Preview impact"), true);
  assert.equal(html.includes("Homepage / hero headline"), true);
  assert.equal(html.includes("Less risk. More control. Better IT."), true);
  assert.equal(html.includes("Homepage / hero subheading"), true);
  assert.equal(html.includes("Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region."), true);
  assert.equal(html.includes("Homepage / contact call-to-action"), true);
  assert.equal(html.includes("Contact CHS at sales@chs.si"), true);
  assert.equal(html.includes("proposed"), true);
});

test("airship single-site editor renders persistent draft controls as not live and not published", () => {
  const html = renderToStaticMarkup(<AirshipSingleSiteEditor model={airshipModel()} />);

  assert.equal(html.includes("Saved Airship draft"), true);
  assert.equal(html.includes("Save edit"), true);
  assert.equal(html.includes("Accept draft edit"), true);
  assert.equal(html.includes("Reject draft edit"), true);
  assert.equal(html.includes("Not applied to live site"), true);
  assert.equal(html.includes("Not published"), true);
  assert.equal(html.includes("browser local only"), true);
  assert.equal(html.includes("CHS d.o.o."), true);
});

test("airship single-site editor labels draft persistence honestly", () => {
  const html = renderToStaticMarkup(<AirshipSingleSiteEditor model={airshipModel()} />);

  assert.equal(html.includes("Unsaved Airship draft"), true);
  assert.equal(html.includes("Save, accept, and reject update only the saved Airship draft workspace"), true);
  assert.equal(html.includes("Not applied to live site"), true);
  assert.equal(html.includes("Not published"), true);
});

test("airship local draft field edits update the draft preview model immediately", () => {
  const model = airshipModel();
  const draftPreview = model.draftPanel.draftPreview;
  assert.ok(draftPreview);
  const initialFields = initialAirshipSingleSiteLocalDraftFields(draftPreview);

  assert.deepEqual(initialFields, {
    headline: "Less risk. More control. Better IT.",
    subheading: "Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region.",
    primaryCtaLabel: "Contact CHS at sales@chs.si",
  });

  const edited = applyAirshipSingleSiteLocalDraftEdit({
    drafts: model.draftPanel.drafts,
    draftPreview,
    fields: {
      headline: "CHS helps modernize enterprise IT",
      subheading: "Cybersecurity, data systems, and hybrid infrastructure expertise for regional teams.",
      primaryCtaLabel: "Email sales@chs.si",
    },
  });

  assert.equal(edited.draftPreview.hero.headline, "CHS helps modernize enterprise IT");
  assert.equal(edited.draftPreview.hero.subheading, "Cybersecurity, data systems, and hybrid infrastructure expertise for regional teams.");
  assert.equal(edited.draftPreview.hero.primaryCtaLabel, "Email sales@chs.si");
  assert.equal(edited.drafts.find((draft) => draft.id === "airship-chs-home-hero-headline")?.status, "edited");
  assert.equal(edited.drafts.find((draft) => draft.id === "airship-chs-home-contact-cta")?.proposedTextContent, "Email sales@chs.si");
});

test("airship visual editor route is superadmin-gated and renders the workspace", async () => {
  const pageSource = await readFile(VISUAL_EDITOR_PAGE_FILE, "utf8");

  assert.equal(pageSource.includes("requireSuperadminUserIdForPage()"), true);
  assert.equal(pageSource.includes("getAirshipSingleSiteEditorReadonlyProjection"), true);
  assert.equal(pageSource.includes("AirshipSingleSiteVisualEditorWorkspace"), true);
  assert.equal(pageSource.includes("AIRSHIP_CHS_MIGRATION_ID"), false);
  assert.equal(pageSource.includes("readAirshipAgencyAISettings"), true);
  assert.equal(pageSource.includes("agentProfileSelection={aiSettings.selectedAirshipProfile}"), true);
});

test("airship visual editor renders draft canvas, sidebar controls, labels, and AI command box", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const html = renderToStaticMarkup(
    <AirshipSingleSiteVisualEditorWorkspace
      migrationId={model.migrationId}
      importedSite={model.importedSite}
      sourceUrl={model.sourceUrl}
      liveSiteUrl={model.liveSiteUrl}
      importedSiteModel={model.importedSiteModel}
      draftCandidate={{
        siteVersionId: model.previews.airshipDraftCandidate?.siteVersionId ?? null,
        runtimeArtifactId: model.previews.airshipDraftCandidate?.runtimeArtifactId ?? null,
        route: model.previews.airshipDraftCandidate?.route ?? null,
        draftId: model.previews.airshipDraftCandidate?.draftId ?? null,
        draftVersion: model.previews.airshipDraftCandidate?.draftVersion ?? null,
        statusLabel: model.previews.airshipDraftCandidate?.statusLabel ?? null,
      }}
      draftPreview={model.draftPanel.draftPreview}
      drafts={model.draftPanel.drafts}
      persistence={model.draftPanel.persistence}
      aiProviderStatus={{
        provider: "openai",
        scope: "airship_editor",
        ownerScope: "internal_superadmin",
        connected: false,
        status: "missing",
        maskedKey: null,
        model: "gpt-5",
        lastTestedAt: null,
        lastTestStatus: null,
        createdAt: null,
        updatedAt: null,
        canUseAiCommands: false,
      }}
      agentProfileSelection={selectedAirshipProfile({
        status: "unavailable",
        activeProfile: null,
        diagnostics: ["airship_agent_default_profile_unavailable"],
      })}
    />,
  );

  assert.equal(html.includes("Draft editor"), true);
  assert.equal(html.includes("Section navigator"), true);
  assert.equal(html.includes("Floating inspector panel"), true);
  assert.equal(html.includes("Inspector tabs"), true);
  assert.equal(html.includes("Agent"), true);
  assert.equal(html.includes("Edit"), true);
  assert.equal(html.includes("CSS"), true);
  assert.equal(html.includes("DOM"), true);
  assert.equal(html.includes("Hero / intro"), true);
  assert.equal(html.includes("CTA"), true);
  assert.equal(html.includes("Source material"), true);
  assert.equal(html.includes("Canvas editor controls"), true);
  assert.equal(html.includes("Select"), true);
  assert.equal(html.includes("Desktop"), true);
  assert.equal(html.includes("Tablet"), true);
  assert.equal(html.includes("Mobile"), true);
  assert.equal(html.includes("Draft only"), true);
  assert.equal(html.includes("Draft state"), true);
  assert.equal(html.includes("Unsaved changes"), true);
  assert.equal(html.includes("Internal preview only"), true);
  assert.equal(html.includes("Not live"), true);
  assert.equal(html.includes("Not published"), true);
  assert.equal(html.includes("Live site unchanged"), true);
  assert.equal(html.includes("Airship draft"), true);
  assert.equal(html.includes("Published candidate"), true);
  assert.equal(html.includes("Live chs.si site"), true);
  assert.equal(html.includes("Text and style saves persist here"), true);
  assert.equal(html.includes("Open internal preview"), true);
  assert.equal(html.includes("Apply saved draft to preview"), true);
  assert.equal(html.includes("Latest preview draft v5"), true);
  assert.equal(html.includes("Open live site"), true);
  assert.equal(html.includes("Save draft"), true);
  assert.equal(html.includes('data-airship-editor-viewport="desktop"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="hero"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="cta"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="source"'), true);
  assert.equal(html.includes("Selected canvas element"), true);
  assert.equal(html.includes("region / homepage hero intro"), true);
  assert.equal(html.includes("Selected element metadata"), true);
  assert.equal(html.includes("Mapped draft field ids"), true);
  assert.equal(html.includes("Internal refs"), true);
  assert.equal(html.includes("canvas selector"), true);
  assert.equal(html.includes('[data-airship-editor-canvas=&quot;hero&quot;]'), true);
  assert.equal(html.includes("Changes are saved to Airship draft only"), true);
  assert.equal(html.includes("Style changes are saved to Airship draft only"), true);
  assert.equal(html.includes("Homepage hero/intro"), true);
  assert.equal(html.includes("H1/headline text"), true);
  assert.equal(html.includes("Subheading/body text"), true);
  assert.equal(html.includes("CTA label"), false);
  assert.equal(html.includes("Current CSS values"), true);
  assert.equal(html.includes("padding-top"), true);
  assert.equal(html.includes("background-tint"), true);
  assert.equal(html.includes("Hero top padding"), true);
  assert.equal(html.includes("Hero bottom padding"), true);
  assert.equal(html.includes("Background tint"), true);
  assert.equal(html.includes("CTA color"), false);
  assert.equal(html.includes("Persists to Airship draft on save"), true);
  assert.equal(html.includes("Style autosaves to Airship draft"), true);
  assert.equal(html.includes("Selected style controls are safe draft style controls only"), true);
  assert.equal(html.includes("Undo last local change"), true);
  assert.equal(html.includes("Reset selected section style"), true);
  assert.equal(html.includes("Reset selected section text"), true);
  assert.equal(html.includes("Recent changes"), true);
  assert.equal(html.includes("AI command"), true);
  assert.equal(html.includes("Connect OpenAI to use AI commands"), true);
  assert.equal(html.includes("No OpenAI command request is sent"), true);
  assert.equal(html.includes("Active Airship profile"), true);
  assert.equal(html.includes("Airship agent profile unavailable"), true);
  assert.equal(html.includes("OpenAI provider"), true);
  assert.equal(html.includes("Apply command"), true);
  assert.equal(html.includes("Save text edits to Airship draft"), true);
  assert.equal(html.includes("Save key"), false);
  assert.equal(html.includes("Test connection"), false);
  assert.equal(html.includes("Revoke key"), false);
});

test("airship visual editor keeps apply-saved-draft enabled when saved draft data exists", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const savedModel = {
    ...model,
    previews: {
      ...model.previews,
      airshipDraftCandidate: null,
    },
    draftPanel: {
      ...model.draftPanel,
      persistence: {
        ...model.draftPanel.persistence,
        label: "Saved Airship draft" as const,
        draftId: "draft-saved-headline",
        draftStatus: "draft",
        version: 8,
        lastSavedAt: "2026-09-02T00:08:00.000Z",
      },
      draftPreview: {
        ...model.draftPanel.draftPreview,
        persistence: "saved_airship_draft" as const,
        hero: {
          ...model.draftPanel.draftPreview.hero,
          headline: "CHS saved headline persists",
        },
      },
    },
  };
  const html = renderToStaticMarkup(
    <AirshipSingleSiteVisualEditorWorkspace
      migrationId={savedModel.migrationId}
      importedSite={savedModel.importedSite}
      sourceUrl={savedModel.sourceUrl}
      liveSiteUrl={savedModel.liveSiteUrl}
      importedSiteModel={savedModel.importedSiteModel}
      draftCandidate={null}
      draftPreview={savedModel.draftPanel.draftPreview}
      drafts={savedModel.draftPanel.drafts}
      persistence={savedModel.draftPanel.persistence}
      aiProviderStatus={{
        provider: "openai",
        scope: "airship_editor",
        ownerScope: "internal_superadmin",
        connected: false,
        status: "missing",
        maskedKey: null,
        model: "gpt-5",
        lastTestedAt: null,
        lastTestStatus: null,
        createdAt: null,
        updatedAt: null,
        canUseAiCommands: false,
      }}
      agentProfileSelection={selectedAirshipProfile({
        status: "unavailable",
        activeProfile: null,
        diagnostics: ["airship_agent_default_profile_unavailable"],
      })}
    />,
  );
  const applyButton = html.match(/<button[^>]*aria-label="Apply saved draft to preview"[^>]*>/)?.[0] ?? "";

  assert.notEqual(applyButton, "");
  assert.equal(applyButton.includes("disabled"), false);
  assert.equal(html.includes("CHS saved headline persists"), true);
  assert.equal(html.includes("Draft only. Not live. Not published."), true);
});

test("airship visual editor applies saved drafts to preview only after local text and style changes are saved", () => {
  const base = {
    migrationId: CHS_MIGRATION_ID,
    draftId: "draft-saved-headline",
    busy: false,
    candidateApplyState: "idle" as const,
  };

  assert.equal(airshipCanApplySavedDraftToPreview({ ...base, saveState: "saved" }), true);
  assert.equal(airshipCanApplySavedDraftToPreview({ ...base, saveState: "unsaved" }), false);
  assert.equal(airshipCanApplySavedDraftToPreview({ ...base, saveState: "saving" }), false);
  assert.equal(airshipCanApplySavedDraftToPreview({ ...base, saveState: "failed" }), false);
  assert.equal(airshipCanApplySavedDraftToPreview({ ...base, saveState: "saved", busy: true }), false);
  assert.equal(airshipCanApplySavedDraftToPreview({ ...base, saveState: "saved", candidateApplyState: "creating" }), false);
  assert.equal(airshipCanApplySavedDraftToPreview({ ...base, saveState: "saved", migrationId: null }), false);
  assert.equal(airshipCanApplySavedDraftToPreview({ ...base, saveState: "saved", draftId: null }), false);
});

test("airship visual editor exposes focused canvas click targets for hero, CTA, and source selection", async () => {
  const visualEditorSource = await readFile(VISUAL_EDITOR_FILE, "utf8");

  assert.equal(airshipCanvasSelectorForSection("hero"), '[data-airship-editor-canvas="hero"]');
  assert.equal(airshipCanvasSelectorForSection("cta"), '[data-airship-editor-canvas="cta"]');
  assert.equal(airshipCanvasSelectorForSection("source"), '[data-airship-editor-canvas="source"]');
  assert.equal(visualEditorSource.includes('data-airship-editor-canvas="hero"'), true);
  assert.equal(visualEditorSource.includes('data-airship-editor-canvas="cta"'), true);
  assert.equal(visualEditorSource.includes('data-airship-editor-canvas="source"'), true);
  assert.equal(visualEditorSource.includes('onClick={() => selectSection("hero")}'), true);
  assert.equal(visualEditorSource.includes('selectSection("cta");'), true);
  assert.equal(visualEditorSource.includes('onClick={() => selectSection("source")}'), true);
  assert.equal(visualEditorSource.includes("event.stopPropagation();"), true);
});

test("airship visual editor keeps left rail and canvas selection wired to the same section keys", async () => {
  const visualEditorSource = await readFile(VISUAL_EDITOR_FILE, "utf8");

  assert.equal(visualEditorSource.includes("data-airship-editor-rail-target"), true);
  assert.equal(visualEditorSource.includes("data-selected={selectedSection === section.key}"), true);
  assert.equal(visualEditorSource.includes("data-selected={selectedSection === \"hero\"}"), true);
  assert.equal(visualEditorSource.includes("data-selected={selectedSection === \"cta\"}"), true);
  assert.equal(visualEditorSource.includes("data-selected={selectedSection === \"source\"}"), true);
  assert.equal(visualEditorSource.includes("aria-controls={deriveAirshipSelectedElementMetadata"), true);
});

test("airship visual editor derives selected element DOM metadata per section", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const base = {
    migrationId: model.migrationId,
    importedSite: model.importedSite,
    sourceUrl: model.sourceUrl,
    liveSiteUrl: model.liveSiteUrl,
    viewportLabel: "Desktop",
    viewportWidth: 1100,
    draftMeta: model.draftPanel.persistence,
    editableSections: model.importedSiteModel.editableSections,
    draftCandidate: {
      siteVersionId: model.previews.airshipDraftCandidate?.siteVersionId ?? null,
      runtimeArtifactId: model.previews.airshipDraftCandidate?.runtimeArtifactId ?? null,
      route: model.previews.airshipDraftCandidate?.route ?? null,
      draftId: model.previews.airshipDraftCandidate?.draftId ?? null,
      draftVersion: model.previews.airshipDraftCandidate?.draftVersion ?? null,
    },
  };

  const hero = deriveAirshipSelectedElementMetadata({ ...base, section: "hero" });
  assert.equal(hero.domSectionId, "airship-preview-hero-intro");
  assert.equal(hero.role, "region / homepage hero intro");
  assert.deepEqual(hero.mappedDraftFieldIds, [
    "airship-chs-home-hero-headline",
    "airship-chs-home-hero-value-proposition",
  ]);
  assert.equal(hero.sourceStatus, "source-supported hero draft fields");
  assert.equal(hero.internalRefs.some((ref) => ref.label === "live url" && ref.value === "https://www.chs.si/"), true);

  const cta = deriveAirshipSelectedElementMetadata({ ...base, section: "cta" });
  assert.equal(cta.domSectionId, "airship-preview-primary-cta");
  assert.equal(cta.role, "button / primary action");
  assert.deepEqual(cta.mappedDraftFieldIds, ["airship-chs-home-contact-cta"]);

  const source = deriveAirshipSelectedElementMetadata({ ...base, section: "source" });
  assert.equal(source.domSectionId, "airship-preview-source-material");
  assert.equal(source.role, "source evidence strip");
  assert.equal(source.sourceStatus, "source material readback only");
  assert.deepEqual(source.mappedDraftFieldIds, [
    "airship-chs-home-hero-headline",
    "airship-chs-home-hero-value-proposition",
    "airship-chs-home-contact-cta",
  ]);
});

test("airship visual editor inspector scopes Edit and CSS fields to the selected section", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const fields = initialAirshipHeroEditorFields(model.draftPanel.draftPreview);

  assert.deepEqual(sectionTextFields("hero"), ["headline", "subheading"]);
  assert.deepEqual(sectionTextFields("cta"), ["ctaLabel"]);
  assert.deepEqual(sectionTextFields("source"), []);
  assert.deepEqual(sectionStyleFields("hero"), ["topPadding", "bottomPadding", "backgroundTint"]);
  assert.deepEqual(sectionStyleFields("cta"), ["ctaColor"]);
  assert.deepEqual(sectionStyleFields("source"), []);
  assert.deepEqual(mappedAirshipDraftFieldIdsForSection("cta", model.draftPanel.drafts), ["airship-chs-home-contact-cta"]);

  assert.deepEqual(deriveAirshipStyleValueRows("hero", fields), [
    { label: "padding-top", value: "72px" },
    { label: "padding-bottom", value: "72px" },
    { label: "background-tint", value: "#ecfeff" },
  ]);
  assert.deepEqual(deriveAirshipStyleValueRows("cta", fields), [
    { label: "background-color", value: "#0f766e" },
    { label: "border-color", value: "#0f766e" },
    { label: "border-radius", value: "8px" },
  ]);
});

test("airship visual editor renders safe provider read error state without exposing keys", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const html = renderToStaticMarkup(
    <AirshipSingleSiteVisualEditorWorkspace
      migrationId={model.migrationId}
      importedSite={model.importedSite}
      sourceUrl={model.sourceUrl}
      liveSiteUrl={model.liveSiteUrl}
      importedSiteModel={model.importedSiteModel}
      draftCandidate={null}
      draftPreview={model.draftPanel.draftPreview}
      drafts={model.draftPanel.drafts}
      persistence={model.draftPanel.persistence}
      aiProviderStatus={{
        provider: "openai",
        scope: "airship_editor",
        ownerScope: "internal_superadmin",
        connected: false,
        status: "read_error",
        maskedKey: null,
        model: "gpt-5",
        lastTestedAt: null,
        lastTestStatus: null,
        createdAt: null,
        updatedAt: null,
        canUseAiCommands: false,
      }}
      agentProfileSelection={selectedAirshipProfile({
        status: "unavailable",
        activeProfile: null,
        diagnostics: ["airship_agent_profile_read_failed"],
      })}
    />,
  );

  assert.equal(html.includes("Status read failed"), true);
  assert.equal(html.includes("OpenAI provider status could not be read"), true);
  assert.equal(html.includes("Provider status read failed. The editor remains available"), true);
  assert.equal(html.includes("AI commands stay disabled"), true);
  assert.equal(html.includes("Airship agent profile unavailable"), true);
  assert.equal(html.includes("Airship visual editor workspace"), true);
  assert.equal(html.includes("sk-test"), false);
  assert.equal(html.includes("ORDER BY"), false);
  assert.equal(html.includes("encrypted"), false);
});

test("airship visual editor shell bounds the floating inspector and page overflow", async () => {
  const visualEditorSource = await readFile(VISUAL_EDITOR_FILE, "utf8");

  assert.equal(visualEditorSource.includes("max-width: 100vw"), true);
  assert.equal(visualEditorSource.includes("height: calc(100vh - 76px)"), true);
  assert.equal(visualEditorSource.includes("min-height: 0"), true);
  assert.equal(visualEditorSource.includes("overflow: hidden"), true);
  assert.equal(visualEditorSource.includes(".airship-inspector {"), true);
  assert.equal(visualEditorSource.includes("right: 20px"), true);
  assert.equal(visualEditorSource.includes("max-width: calc(100vw - 132px)"), true);
  assert.equal(visualEditorSource.includes("max-height: calc(100% - 112px)"), true);
  assert.equal(visualEditorSource.includes(".airship-inspector-body"), true);
  assert.equal(visualEditorSource.includes("overflow: auto"), true);
  assert.equal(visualEditorSource.includes(".airship-bottom-toolbar"), true);
  assert.equal(visualEditorSource.includes("max-width: calc(100% - 40px)"), true);
  assert.equal(visualEditorSource.includes("padding: 20px 408px 112px 28px"), true);
});

test("airship visual editor renders connected provider status from backend readback", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const html = renderToStaticMarkup(
    <AirshipSingleSiteVisualEditorWorkspace
      migrationId={model.migrationId}
      importedSite={model.importedSite}
      sourceUrl={model.sourceUrl}
      liveSiteUrl={model.liveSiteUrl}
      importedSiteModel={model.importedSiteModel}
      draftCandidate={null}
      draftPreview={model.draftPanel.draftPreview}
      drafts={model.draftPanel.drafts}
      persistence={model.draftPanel.persistence}
      aiProviderStatus={{
        provider: "openai",
        scope: "airship_editor",
        ownerScope: "internal_superadmin",
        connected: true,
        status: "connected",
        maskedKey: "sk-...safe",
        model: "gpt-5",
        lastTestedAt: null,
        lastTestStatus: "passed",
        createdAt: "2026-09-03T00:00:00.000Z",
        updatedAt: "2026-09-04T00:00:00.000Z",
        canUseAiCommands: true,
      }}
      agentProfileSelection={selectedAirshipProfile()}
    />,
  );

  assert.equal(html.includes("Connected"), true);
  assert.equal(html.includes("OpenAI connected (sk-...safe, gpt-5)."), true);
  assert.equal(html.includes("Test passed"), true);
  assert.equal(html.includes("Active Airship profile"), true);
  assert.equal(html.includes("Airship Editor Default"), true);
  assert.equal(html.includes("Selected agency/default Airship profile"), true);
  assert.equal(html.includes("airship_editor"), true);
  assert.equal(html.includes("sk-test"), false);
  assert.equal(html.includes("safe-secret"), false);
  assert.equal(html.includes("Status read failed"), false);
  assert.equal(html.includes("Connect OpenAI to use AI commands"), false);
});

test("airship visual editor provider status stays read-only and commands never call OpenAI", async () => {
  const visualEditorSource = await readFile(VISUAL_EDITOR_FILE, "utf8");

  assert.equal(visualEditorSource.includes("isAirshipOpenAIProviderConnected"), true);
  assert.equal(visualEditorSource.includes("Provider readback is shown from backend status only"), true);
  assert.equal(visualEditorSource.includes("No OpenAI command request is sent"), true);
  assert.equal(visualEditorSource.includes("/api/gnr8/admin/airship/single-site/ai-command"), false);
  assert.equal(visualEditorSource.includes("runProviderCommand"), false);
  assert.equal(visualEditorSource.includes("submitProviderAction"), false);
  assert.equal(visualEditorSource.includes("Save key"), false);
  assert.equal(visualEditorSource.includes("OpenAI provider status updated. AI commands remain Airship draft only."), false);
});

test("airship visual editor headline edit updates preview fields", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const fields = initialAirshipHeroEditorFields(model.draftPanel.draftPreview);
  const edited = applyAirshipHeroTextFieldEdit({
    fields,
    drafts: model.draftPanel.drafts,
    field: "headline",
    value: "CHS secures enterprise IT",
  });

  assert.equal(edited.fields.headline, "CHS secures enterprise IT");
  assert.equal(edited.drafts.find((draft) => draft.id === "airship-chs-home-hero-headline")?.proposedTextContent, "CHS secures enterprise IT");
  assert.equal(edited.drafts.find((draft) => draft.id === "airship-chs-home-hero-headline")?.status, "edited");
  assert.equal(fields.subheading, "Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region.");
});

test("airship visual editor derives saved, unsaved, saving, and failed draft states", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const savedFields = initialAirshipHeroEditorFields(model.draftPanel.draftPreview, {
    heroTopPadding: 92,
    heroBottomPadding: 108,
    backgroundTint: "#eef6ff",
    ctaColor: "#1d4ed8",
  });

  assert.equal(deriveAirshipDraftSaveState({ fields: savedFields, savedFields }), "saved");
  assert.equal(deriveAirshipDraftSaveState({ fields: { ...savedFields, headline: "CHS secures enterprise IT" }, savedFields }), "unsaved");
  assert.equal(deriveAirshipDraftSaveState({ fields: { ...savedFields, ctaColor: "#111827" }, savedFields }), "unsaved");
  assert.equal(deriveAirshipDraftSaveState({ fields: savedFields, savedFields, saving: true }), "saving");
  assert.equal(deriveAirshipDraftSaveState({ fields: savedFields, savedFields, saveFailed: true }), "failed");
});

test("airship visual editor undo restores the previous local snapshot without draft or live actions", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const fields = initialAirshipHeroEditorFields(model.draftPanel.draftPreview);
  const edited = applyAirshipHeroTextFieldEdit({
    fields,
    drafts: model.draftPanel.drafts,
    field: "headline",
    value: "CHS secures enterprise IT",
  });

  const undone = undoAirshipEditorLastLocalChange({
    undoStack: [{ fields, drafts: model.draftPanel.drafts }],
    fallback: edited,
  });

  assert.equal(undone.undone, true);
  assert.equal(undone.fields.headline, "Less risk. More control. Better IT.");
  assert.equal(undone.drafts.find((draft) => draft.id === "airship-chs-home-hero-headline")?.proposedTextContent, "Less risk. More control. Better IT.");
  assert.equal(undone.undoStack.length, 0);
});

test("airship visual editor resets selected section text and style to saved values", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const savedFields = initialAirshipHeroEditorFields(model.draftPanel.draftPreview, {
    heroTopPadding: 92,
    heroBottomPadding: 108,
    backgroundTint: "#eef6ff",
    ctaColor: "#1d4ed8",
  });
  const changedFields = {
    ...savedFields,
    headline: "Local headline",
    subheading: "Local subheading",
    ctaLabel: "Local CTA",
    topPadding: 64,
    bottomPadding: 66,
    backgroundTint: "#ffffff",
    ctaColor: "#111827",
  };
  const changedText = applyAirshipHeroTextFieldEdit({
    fields: changedFields,
    drafts: model.draftPanel.drafts,
    field: "headline",
    value: "Local headline",
  });

  const resetText = resetAirshipSectionTextToSavedValues({
    section: "cta",
    fields: changedText.fields,
    drafts: changedText.drafts,
    savedFields,
  });
  assert.deepEqual(resetText.changedFields, ["ctaLabel"]);
  assert.equal(resetText.fields.ctaLabel, savedFields.ctaLabel);
  assert.equal(resetText.fields.headline, "Local headline");

  const resetStyle = resetAirshipSectionStyleToSavedValues({
    section: "hero",
    fields: changedFields,
    drafts: model.draftPanel.drafts,
    savedFields,
  });
  assert.deepEqual(resetStyle.changedFields, ["topPadding", "bottomPadding", "backgroundTint"]);
  assert.equal(resetStyle.fields.topPadding, 92);
  assert.equal(resetStyle.fields.bottomPadding, 108);
  assert.equal(resetStyle.fields.backgroundTint, "#eef6ff");
  assert.equal(resetStyle.fields.ctaColor, "#111827");
  assert.equal(resetStyle.drafts, model.draftPanel.drafts);
});

test("airship visual editor AI command updates supported text and style fields", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const fields = initialAirshipHeroEditorFields(model.draftPanel.draftPreview);

  const cta = applyAirshipHeroCommand(fields, "spremeni CTA v Kontaktirajte CHS");
  assert.equal(cta.supported, true);
  assert.equal(cta.fields.ctaLabel, "Kontaktirajte CHS");
  assert.deepEqual(cta.changedTextFields, ["ctaLabel"]);
  assert.equal(cta.message.includes("Text changes are saved to Airship draft only"), true);

  const spacing = applyAirshipHeroCommand(fields, "povečaj spodnji odmik pri H1");
  assert.equal(spacing.supported, true);
  assert.equal(spacing.fields.bottomPadding, fields.bottomPadding + 12);
  assert.deepEqual(spacing.changedStyleFields, ["bottomPadding"]);
  assert.equal(spacing.message.includes("Style changes are saved to Airship draft only"), true);

  const prominent = applyAirshipHeroCommand(fields, "make CTA more prominent");
  assert.equal(prominent.supported, true);
  assert.equal(prominent.fields.ctaColor, "#1d4ed8");
  assert.equal(prominent.changedStyleFields.includes("ctaColor"), true);
});

test("airship visual editor hydrates persisted style settings for reload readback", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const fields = initialAirshipHeroEditorFields(model.draftPanel.draftPreview, {
    heroTopPadding: 92,
    heroBottomPadding: 108,
    backgroundTint: "#eef6ff",
    ctaColor: "#1d4ed8",
  });

  assert.equal(fields.topPadding, 92);
  assert.equal(fields.bottomPadding, 108);
  assert.equal(fields.backgroundTint, "#eef6ff");
  assert.equal(fields.ctaColor, "#1d4ed8");
  assert.equal(fields.headline, "Less risk. More control. Better IT.");
});

test("airship visual editor reload starts from saved draft text and style values", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const reloadedFields = initialAirshipHeroEditorFields({
    ...model.draftPanel.draftPreview,
    hero: {
      ...model.draftPanel.draftPreview.hero,
      headline: "Saved CHS headline",
      subheading: "Saved CHS subheading.",
      primaryCtaLabel: "Saved CTA",
    },
  }, {
    heroTopPadding: 84,
    heroBottomPadding: 96,
    backgroundTint: "#fefce8",
    ctaColor: "#047857",
  });

  assert.deepEqual(reloadedFields, {
    headline: "Saved CHS headline",
    subheading: "Saved CHS subheading.",
    ctaLabel: "Saved CTA",
    topPadding: 84,
    bottomPadding: 96,
    backgroundTint: "#fefce8",
    ctaColor: "#047857",
  });
  assert.equal(deriveAirshipDraftSaveState({ fields: reloadedFields, savedFields: reloadedFields }), "saved");
});

test("airship visual editor AI command rejects unsupported commands helpfully", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const fields = initialAirshipHeroEditorFields(model.draftPanel.draftPreview);
  const result = applyAirshipHeroCommand(fields, "publish this to chs.si");

  assert.equal(result.supported, false);
  assert.equal(result.fields, fields);
  assert.equal(result.message.includes("Command not supported yet"), true);
});

test("airship visual editor keeps live CHS separate from internal draft preview", async () => {
  const [pageSource, componentSource] = await Promise.all([
    readFile(VISUAL_EDITOR_PAGE_FILE, "utf8"),
    readFile(VISUAL_EDITOR_FILE, "utf8"),
  ]);
  const source = `${pageSource}\n${componentSource}`;

  assert.equal(source.includes("liveSiteUrl"), true);
  assert.equal(source.includes("Live remains separate"), true);
  assert.equal(source.includes("Not live"), true);
  assert.equal(source.includes("Not published"), true);
  assert.doesNotMatch(source, /publishApprovedSiteVersion|active_site_version_id|gnr8_runtime_active_pointers|shadow-publish|dry-run|rollback/i);
});

test("airship single-site editor CHS draft contains no Maver transport copy", () => {
  const html = renderToStaticMarkup(<AirshipSingleSiteEditor model={airshipModel()} />);

  assert.doesNotMatch(html, /TRANSPORTI MAVER|Transporti Maver|transporti\.maver|transportimaver/i);
  assert.doesNotMatch(html, /Prevozi vozil|prevoz vozil|avtotransporter|vehicle transport/i);
});

test("airship single-site route is superadmin-gated and does not default to CHS", async () => {
  const pageSource = await readFile(PAGE_FILE, "utf8");

  assert.equal(pageSource.includes("requireSuperadminUserIdForPage()"), true);
  assert.equal(pageSource.includes("AIRSHIP_CHS_MIGRATION_ID"), false);
  assert.equal(pageSource.includes("getAirshipSingleSiteEditorReadonlyProjection"), true);
});

test("airship single-site foundation adds no production mutation action surface", async () => {
  const [pageSource, componentSource, localEditorSource, visualEditorSource, projectionSource] = await Promise.all([
    readFile(PAGE_FILE, "utf8"),
    readFile(COMPONENT_FILE, "utf8"),
    readFile(LOCAL_EDITOR_FILE, "utf8"),
    readFile(VISUAL_EDITOR_FILE, "utf8"),
    readFile(PROJECTION_FILE, "utf8"),
  ]);
  const source = `${pageSource}\n${componentSource}\n${localEditorSource}\n${visualEditorSource}\n${projectionSource}`;

  assert.equal(source.includes("mutatesProductionData: false"), true);
  assert.equal(source.includes("mutatesDraftData: true"), true);
  assert.equal(source.includes("activePointerMutation: false"), true);
  assert.equal(source.includes('method="post"'), false);
  assert.equal(source.includes("runtimePreviewGET"), false);
  assert.equal(source.includes("Run provider"), false);
  assert.equal(source.includes("Rollback"), false);
  assert.equal(source.includes("Publish candidate"), false);
});

test("airship visual editor adds no publish, dry-run, shadow, rollback, source capture, or active-pointer action control", async () => {
  const visualEditorSource = await readFile(VISUAL_EDITOR_FILE, "utf8");

  assert.doesNotMatch(visualEditorSource, /publishApprovedSiteVersion|Publish candidate|shadow-publish|dry-run|Rollback|source capture/i);
  assert.doesNotMatch(visualEditorSource, /active_site_version_id|gnr8_runtime_active_pointers|switchActivePointer|active pointer mutation/i);
  assert.equal(visualEditorSource.includes("Undo last local change"), true);
  assert.equal(visualEditorSource.includes("Reset selected section style"), true);
  assert.equal(visualEditorSource.includes("Reset selected section text"), true);
});

test("airship preview route gives EMAXCONNSESSION a compact retry surface", async () => {
  const routeSource = await readFile(PREVIEW_ROUTE_FILE, "utf8");

  assert.equal(routeSource.includes("EMAXCONNSESSION"), true);
  assert.equal(routeSource.includes("Preview temporarily unavailable"), true);
  assert.equal(routeSource.includes("The internal preview could not get a database session."), true);
  assert.equal(routeSource.includes("local draft editing is still available"), true);
  assert.equal(routeSource.includes("status: 503"), true);
});
