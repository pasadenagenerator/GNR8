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
  airshipArtifactOverlayRectFromDomRect,
  airshipArtifactSectionSelector,
  airshipCanApplySavedDraftToPreview,
  airshipCanvasSelectorForSection,
  airshipElementSelectorsForSection,
  applyAirshipHeroCommand,
  applyAirshipHeroTextFieldEdit,
  deriveAirshipSelectedElementMetadata,
  deriveAirshipDraftSaveState,
  deriveAirshipStyleValueRows,
  initialAirshipHeroEditorFields,
  mappedAirshipDraftFieldIdsForSection,
  measuredAirshipArtifactCanvasHeight,
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
const AIRSHIP_DEMO_VERSION_ID = "92e476b9-67fc-408a-be3d-5c744aa0f3f6";
const AIRSHIP_DEMO_ARTIFACT_ID = "5ac3716a-f29d-4648-bc86-a6942638ed53";
const INTERNAL_PREVIEW_ROUTE_PREFIX = "/api/gnr8/admin/single-site-studio/versions";
const PAGE_FILE = new URL("./page.tsx", import.meta.url);
const COMPONENT_FILE = new URL("./airship-single-site-editor.tsx", import.meta.url);
const LOCAL_EDITOR_FILE = new URL("./airship-single-site-local-draft-editor.tsx", import.meta.url);
const ROLLBACK_ACTION_FILE = new URL("./airship-simple-promote-rollback-action.tsx", import.meta.url);
const VISUAL_EDITOR_PAGE_FILE = new URL("./editor/page.tsx", import.meta.url);
const VISUAL_EDITOR_FILE = new URL("./editor/airship-single-site-visual-editor-workspace.tsx", import.meta.url);
const PROJECTION_FILE = new URL("../../../../gnr8/single-site/airship-single-site-editor-readonly-projection.ts", import.meta.url);
const PREVIEW_ROUTE_FILE = new URL("../../../api/gnr8/admin/single-site-studio/versions/[siteVersionId]/preview/route.ts", import.meta.url);

function chsDemoReadiness(): NonNullable<AirshipSingleSiteEditorReadonlyProjection["demoReadiness"]> {
  return {
    status: "mvp_recovery_chs_airship_demo_ready",
    demoUrl: "https://chs-airship.app.pasadenagenerator.com/",
    demoUrlStatus: "https_200_tls_verified_gnr8_preview",
    expectedBodyText: "The CHS team helps your IT change with every technology wave.",
    activePointerTarget: {
      siteVersionId: AIRSHIP_DEMO_VERSION_ID,
      runtimeArtifactId: AIRSHIP_DEMO_ARTIFACT_ID,
    },
    externalProductionSite: {
      url: "https://www.chs.si/",
      status: "external_not_cut_over",
    },
    hostBinding: {
      id: "89b2cafa-651a-4402-a947-0c3d45378a3d",
      status: "ACTIVE",
      mode: "shadow",
      runtimeSiteId: "site_57d9665a3a5867edf6ef",
    },
    rollbackRefs: {
      previousSiteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
      previousRuntimeArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
      currentSiteVersionId: AIRSHIP_DEMO_VERSION_ID,
      currentRuntimeArtifactId: AIRSHIP_DEMO_ARTIFACT_ID,
      promoteAuditRows: [
        "d873b627-bab9-4868-9def-e4772fb71f37",
        "7b667851-5132-43b3-8202-d56fc30ee193",
      ],
    },
    adminOnly: true,
    boundary: {
      pointerMutatedByThisReadback: false,
      promoteToLiveRunByThisReadback: false,
      rollbackRunByThisReadback: false,
    },
  };
}

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
          label: "CTA / Contact",
          detail: "Primary action label and color",
          mappedDraftFieldIds: ["airship-chs-home-contact-cta"],
          sourceStatus: "source-supported CTA draft field",
        },
        {
          key: "offers",
          label: "Offers / Services",
          detail: "Offer/service copy and cards",
          mappedDraftFieldIds: ["airship-chs-home-services"],
          sourceStatus: "draft services section available",
        },
        {
          key: "proof",
          label: "Proof / Benefits",
          detail: "Proof points and benefits",
          mappedDraftFieldIds: ["airship-chs-home-benefits"],
          sourceStatus: "draft proof section available",
        },
        {
          key: "approach",
          label: "Approach / Process",
          detail: "Process or approach copy",
          mappedDraftFieldIds: ["airship-chs-home-process"],
          sourceStatus: "draft approach section available",
        },
        {
          key: "footer",
          label: "Footer / Demo note",
          detail: "Preview boundary and footer note",
          mappedDraftFieldIds: ["airship-chs-home-demo-note"],
          sourceStatus: "internal demo boundary note available",
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
      latestInternalPreviewHost: {
        serviceVersion: "airship-21-preview-host-binding:v1",
        label: "GNR8 demo preview, not live",
        candidateSiteVersionId: "2d33f386-7cd3-4bbf-a9d4-f1c134c5dce7",
        candidateArtifactId: "4ec7588a-b7cb-46dc-a735-88e4ec466a72",
        suggestedHostname: "chs-airship.app.pasadenagenerator.com",
        previewUrl: "https://chs-airship.app.pasadenagenerator.com/",
        binding: {
          id: "preview-binding-chs",
          siteId: "runtime-chs",
          host: "chs-airship.app.pasadenagenerator.com",
          candidateSiteVersionId: "2d33f386-7cd3-4bbf-a9d4-f1c134c5dce7",
          candidateArtifactId: "4ec7588a-b7cb-46dc-a735-88e4ec466a72",
          status: "ACTIVE",
          bindingKind: "candidate_preview",
          createdAt: "2026-09-16T00:00:00.000Z",
          updatedAt: "2026-09-16T00:00:00.000Z",
        },
        bindingStatus: {
          label: "Preview host binding active",
          detail: "Binding preview-binding-chs points chs-airship.app.pasadenagenerator.com to candidate 2d33f386-7cd3-4bbf-a9d4-f1c134c5dce7 / artifact 4ec7588a-b7cb-46dc-a735-88e4ec466a72.",
          tone: "good",
        },
        activePointerStatus: {
          siteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
          artifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
          label: "Active pointer present",
          detail: `Live pointer remains separate: ${IMPROVED_CANDIDATE_VERSION_ID} / 1f80138a-39c2-4210-ac61-16200e5a2254.`,
          tone: "neutral",
        },
        externalSourceDomainStatus: {
          url: "https://www.chs.si/",
          host: "www.chs.si",
          label: "External customer domain separate",
          detail: "www.chs.si is the customer/source domain and is not mutated by this workflow.",
          tone: "neutral",
        },
        action: {
          enabled: false,
          endpoint: "/api/gnr8/admin/airship/single-site/preview-host-binding",
          actionMode: "create_gnr8_demo_preview_host",
          disabledReason: "Preview host binding already exists or conflicts; service will not overwrite from the UI.",
        },
      },
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
    demoReadiness: chsDemoReadiness(),
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
      airshipEditorArtifactCanvas: null,
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
          sectionKey: "hero",
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
          sectionKey: "hero",
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
          sectionKey: "cta",
          targetSectionPage: "Homepage / contact call-to-action",
          currentTextContentSummary: "Captured CHS source evidence includes `Contact us`, `sales@chs.si`, and a homepage contact form.",
          proposedTextContent: "Contact CHS at sales@chs.si",
          reasonForChange: "Make the contact action outcome-specific while keeping it tied to the existing contact section and source contact channels.",
          status: "proposed",
          previewImpact: "AI draft preview shows a clearer CHS contact CTA; it is not wired to mutate or publish production content.",
        },
        {
          id: "airship-chs-home-services",
          sectionKey: "offers",
          targetSectionPage: "Homepage / offers or services",
          currentTextContentSummary: "Captured CHS source evidence describes cybersecurity, data systems, and hybrid infrastructure.",
          proposedTextContent: "Cybersecurity, data systems, hybrid infrastructure, and managed support for organizations across the Adriatic region.",
          reasonForChange: "Expose CHS services as a real editable section in the draft canvas.",
          status: "proposed",
          previewImpact: "Services section appears in the internal draft preview only.",
        },
        {
          id: "airship-chs-home-benefits",
          sectionKey: "proof",
          targetSectionPage: "Homepage / proof and benefits",
          currentTextContentSummary: "Captured CHS evidence supports advanced IT specialization and regional delivery.",
          proposedTextContent: "Advanced IT specialization, practical contact paths, and regional delivery focus help visitors understand why CHS is credible.",
          reasonForChange: "Expose proof/benefits as a real editable section in the draft canvas.",
          status: "proposed",
          previewImpact: "Proof section appears in the internal draft preview only.",
        },
        {
          id: "airship-chs-home-process",
          sectionKey: "approach",
          targetSectionPage: "Homepage / approach and process",
          currentTextContentSummary: "CHS draft needs a process section for a fuller demo preview.",
          proposedTextContent: "Assess the environment, prioritize risk, implement resilient systems, and keep teams supported as needs change.",
          reasonForChange: "Expose approach/process as a real editable section in the draft canvas.",
          status: "proposed",
          previewImpact: "Approach section appears in the internal draft preview only.",
        },
        {
          id: "airship-chs-home-demo-note",
          sectionKey: "footer",
          targetSectionPage: "Homepage / footer demo note",
          currentTextContentSummary: "Internal preview/customer-domain boundary needs to remain visible.",
          proposedTextContent: "Internal GNR8 demo preview for CHS. https://www.chs.si/ remains external and unchanged.",
          reasonForChange: "Keep demo preview host readback separate from the live/customer domain.",
          status: "proposed",
          previewImpact: "Footer demo note appears in the internal draft preview only.",
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
        sections: [
          {
            key: "hero",
            label: "Hero",
            eyebrow: "First viewport",
            heading: "CHS d.o.o.",
            body: "Less risk. More control. Better IT. Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region.",
            items: [],
            ctaLabel: null,
          },
          {
            key: "offers",
            label: "Offers / Services",
            eyebrow: "Offers / Services",
            heading: "What changes in the improved draft",
            body: "Cybersecurity, data systems, hybrid infrastructure, and managed support for organizations across the Adriatic region.",
            items: ["Cybersecurity", "data systems", "hybrid infrastructure", "managed support"],
            ctaLabel: null,
          },
          {
            key: "proof",
            label: "Proof / Benefits",
            eyebrow: "Proof / Benefits",
            heading: "Why this version is clearer",
            body: "Advanced IT specialization, practical contact paths, and regional delivery focus help visitors understand why CHS is credible.",
            items: ["Advanced IT specialization", "practical contact paths", "regional delivery focus"],
            ctaLabel: null,
          },
          {
            key: "approach",
            label: "Approach / Process",
            eyebrow: "Approach / Process",
            heading: "How the page now guides the visitor",
            body: "Assess the environment, prioritize risk, implement resilient systems, and keep teams supported as needs change.",
            items: ["Assess the environment", "prioritize risk", "implement resilient systems", "keep teams supported as needs change"],
            ctaLabel: null,
          },
          {
            key: "cta",
            label: "CTA / Contact",
            eyebrow: "CTA / Contact",
            heading: "Contact CHS at sales@chs.si",
            body: "Contact CHS at sales@chs.si",
            items: [],
            ctaLabel: "Contact CHS at sales@chs.si",
          },
          {
            key: "footer",
            label: "Footer / Demo note",
            eyebrow: "Footer / Demo note",
            heading: "Internal demo boundary",
            body: "Internal GNR8 demo preview for CHS. https://www.chs.si/ remains external and unchanged.",
            items: [],
            ctaLabel: null,
          },
        ],
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
  assert.equal(html.includes("MVP Demo Readiness"), true);
  assert.equal(html.includes("https://chs-airship.app.pasadenagenerator.com/"), true);
  assert.equal(html.includes("mvp recovery chs airship demo ready"), true);
  assert.equal(html.includes("Current active pointer"), true);
  assert.equal(html.includes(`${AIRSHIP_DEMO_VERSION_ID} / ${AIRSHIP_DEMO_ARTIFACT_ID}`), true);
  assert.equal(html.includes("external not cut over"), true);
  assert.equal(html.includes("89b2cafa-651a-4402-a947-0c3d45378a3d / ACTIVE / shadow / site_57d9665a3a5867edf6ef"), true);
  assert.equal(html.includes("Rollback target pointer"), true);
  assert.equal(html.includes(`${IMPROVED_CANDIDATE_VERSION_ID} / 1f80138a-39c2-4210-ac61-16200e5a2254`), true);
  assert.equal(html.includes("no pointer mutation, no promote-to-live, no rollback"), true);
  assert.equal(html.includes("Admin-only destructive rollback"), true);
  assert.equal(html.includes("Rollback active pointer"), true);
  assert.equal(html.includes("Ready for superadmin rollback review"), true);
  assert.equal(html.includes("I understand this is a superadmin-only active-pointer restore"), true);
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
  assert.equal(html.includes("GNR8 demo preview, not live"), true);
  assert.equal(html.includes("Preview host binding active"), true);
  assert.equal(html.includes("https://chs-airship.app.pasadenagenerator.com/"), true);
  assert.equal(html.includes("External customer domain"), true);
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

test("airship visual editor matches Airship reference shell without primary admin clutter", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const html = renderToStaticMarkup(
    <AirshipSingleSiteVisualEditorWorkspace
      migrationId={model.migrationId}
      importedSite={model.importedSite}
      sourceUrl={model.sourceUrl}
      liveSiteUrl={model.liveSiteUrl}
      importedSiteModel={model.importedSiteModel}
      demoReadiness={model.demoReadiness}
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

  assert.equal(html.includes("airship"), true);
  assert.equal(html.includes("Section navigator"), false);
  assert.equal(html.includes("Floating inspector panel"), true);
  assert.equal(html.includes("Inspector tabs"), true);
  assert.equal(html.includes("Agent"), true);
  assert.equal(html.includes("Edit"), true);
  assert.equal(html.includes("CSS"), true);
  assert.equal(html.includes("DOM"), true);
  assert.equal(html.includes("Canvas editor controls"), true);
  assert.equal(html.includes("Select pointer tool"), true);
  assert.equal(html.includes("Pan tool"), true);
  assert.equal(html.includes("Text tool"), true);
  assert.equal(html.includes("Zoom out"), true);
  assert.equal(html.includes("Fit width canvas"), true);
  assert.equal(html.includes("Zoom in"), true);
  assert.equal(html.includes("Viewport size"), true);
  assert.equal(html.includes("Desktop viewport"), true);
  assert.equal(html.includes("Tablet viewport"), true);
  assert.equal(html.includes("Mobile viewport"), true);
  assert.equal(html.includes("Save draft"), true);
  assert.equal(html.includes("Apply / generate preview"), true);
  assert.equal(html.includes("Open internal preview"), true);
  assert.equal(html.includes("Open GNR8 demo preview"), true);
  assert.equal(html.includes("Open live external preview"), true);
  assert.equal(html.includes("Draft publication boundary"), false);
  assert.equal(html.includes("Active Airship profile"), false);
  assert.equal(html.includes("OpenAI provider readback"), false);
  assert.equal(html.includes("Published candidate"), false);
  assert.equal(html.includes("Live site"), false);
  assert.equal(html.includes('data-airship-editor-viewport="desktop"'), true);
  assert.equal(html.includes('data-airship-full-page-canvas="true"'), true);
  assert.equal(html.includes('data-airship-canvas-zoom="0.86"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="hero"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="offers"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="proof"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="approach"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="cta"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="footer"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="source"'), true);
  assert.equal(html.includes("Cybersecurity, data systems, hybrid infrastructure, and managed support"), true);
  assert.equal(html.includes("Advanced IT specialization, practical contact paths"), true);
  assert.equal(html.includes("Internal GNR8 demo preview for CHS"), true);
  assert.equal(html.includes("Selected canvas element"), true);
  assert.equal(html.includes("region / homepage hero intro"), true);
  assert.equal(html.includes("SELECTED NODE"), true);
  assert.equal(html.includes("level:"), true);
  assert.equal(html.includes("section-level"), true);
  assert.equal(html.includes("FIELDS"), true);
  assert.equal(html.includes("MARKERS"), true);
  assert.equal(html.includes('[data-airship-element=&quot;hero-headline&quot;]'), true);
  assert.equal(html.includes("canvas:"), true);
  assert.equal(html.includes('[data-airship-editor-canvas=&quot;hero&quot;]'), true);
  assert.equal(html.includes('[data-airship-section=&quot;hero&quot;]'), true);
  assert.equal(html.includes("Homepage hero/intro"), true);
  assert.equal(html.includes("SELECTED"), true);
  assert.equal(html.includes("DRAFT FIELDS"), true);
  assert.equal(html.includes("SIZE"), true);
  assert.equal(html.includes("APPEARANCE"), true);
  assert.equal(html.includes("FILL"), true);
  assert.equal(html.includes("H1/headline text"), true);
  assert.equal(html.includes("Subheading/body text"), true);
  assert.equal(html.includes("Edit selected hero headline"), true);
  assert.equal(html.includes("STYLE"), true);
  assert.equal(html.includes("CONTROLS"), true);
  assert.equal(html.includes("DRAFT TOKENS"), true);
  assert.equal(html.includes("padding-top"), true);
  assert.equal(html.includes("background-tint"), true);
  assert.equal(html.includes("Hero top padding"), true);
  assert.equal(html.includes("Hero bottom padding"), true);
  assert.equal(html.includes("Background tint"), true);
  assert.equal(html.includes("Undo last local change"), true);
  assert.equal(html.includes("Reset selected section style"), true);
  assert.equal(html.includes("Reset selected section text"), true);
  assert.equal(html.includes("Local deterministic transcript"), true);
  assert.equal(html.includes("local deterministic Airship draft command"), true);
  assert.equal(html.includes("external customer domain unchanged"), true);
  assert.equal(html.includes("Make this warmer."), false);
  assert.equal(html.includes("shell.css +1 -1"), false);
  assert.equal(html.includes("Describe the change..."), true);
  assert.equal(html.includes("Apply command"), false);
  assert.equal(html.includes("Save text edits to Airship draft"), true);
  assert.equal(html.includes("Save key"), false);
  assert.equal(html.includes("Test connection"), false);
  assert.equal(html.includes("Revoke key"), false);
});

test("airship visual editor reference shell controls are wired to real editor state", async () => {
  const visualEditorSource = await readFile(VISUAL_EDITOR_FILE, "utf8");

  assert.equal(visualEditorSource.includes("type EditorToolKey = \"select\" | \"pan\" | \"text\""), true);
  assert.equal(visualEditorSource.includes("const [selectedTool, setSelectedTool]"), true);
  assert.equal(visualEditorSource.includes("onClick={() => selectTool(tool.key)}"), true);
  assert.equal(visualEditorSource.includes("onClick={() => zoomCanvas(-CANVAS_ZOOM_STEP)}"), true);
  assert.equal(visualEditorSource.includes("onClick={fitCanvasWidth}"), true);
  assert.equal(visualEditorSource.includes("onClick={() => zoomCanvas(CANVAS_ZOOM_STEP)}"), true);
  assert.equal(visualEditorSource.includes("onClick={() => setViewport(option.key)}"), true);
  assert.equal(visualEditorSource.includes("onClick={() => void saveAllTextEdits()}"), true);
  assert.equal(visualEditorSource.includes("onClick={() => void createInternalPreviewCandidate()}"), true);
  assert.equal(visualEditorSource.includes("href={previewCandidate.route}"), true);
  assert.equal(visualEditorSource.includes("href={previewHostUrl}"), true);
  assert.equal(visualEditorSource.includes("href={props.liveSiteUrl}"), true);
  assert.equal(visualEditorSource.includes("onChange={(event) => updateTextField(\"headline\", event.target.value)}"), true);
  assert.equal(visualEditorSource.includes("onChange={(event) => updateTextField(\"subheading\", event.target.value)}"), true);
  assert.equal(visualEditorSource.includes("onChange={(event) => updateTextField(\"ctaLabel\", event.target.value)}"), true);
  assert.equal(visualEditorSource.includes("onChange={(event) => updateMappedDraftText(draft.id, event.target.value)}"), true);
  assert.equal(visualEditorSource.includes("onChange={(event) => updateStyleField(\"topPadding\", event.target.value)}"), true);
  assert.equal(visualEditorSource.includes("onChange={(event) => updateStyleField(\"bottomPadding\", event.target.value)}"), true);
  assert.equal(visualEditorSource.includes("onChange={(event) => updateStyleField(\"backgroundTint\", event.target.value)}"), true);
  assert.equal(visualEditorSource.includes("onChange={(event) => updateStyleField(\"ctaColor\", event.target.value)}"), true);
  assert.equal(visualEditorSource.includes("applyAirshipHeroCommand(fields, command)"), true);
  assert.equal(visualEditorSource.includes("selectedElementMetadata.internalRefs.map"), true);
});

test("airship visual editor uses CHS demo artifact renderer when available", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  const html = renderToStaticMarkup(
    <AirshipSingleSiteVisualEditorWorkspace
      migrationId={model.migrationId}
      importedSite={model.importedSite}
      sourceUrl={model.sourceUrl}
      liveSiteUrl={model.liveSiteUrl}
      importedSiteModel={model.importedSiteModel}
      demoReadiness={model.demoReadiness}
      artifactCanvasRender={{
        source: "demo_artifact",
        label: "GNR8 demo artifact render",
        siteVersionId: AIRSHIP_DEMO_VERSION_ID,
        runtimeArtifactId: AIRSHIP_DEMO_ARTIFACT_ID,
        path: "/",
        previewUrl: "https://chs-airship.app.pasadenagenerator.com/",
        sanitizedHtml: "<!doctype html><html><body><main><section><h1>The CHS team helps your IT change with every technology wave.</h1><p>Cybersecurity, data systems, hybrid infrastructure, and support.</p><footer>Internal GNR8 demo preview for CHS.</footer></section></main></body></html>",
        originalHtmlByteLength: 244,
        sanitizedHtmlByteLength: 244,
        safety: {
          sandbox: "iframe-sandbox-without-scripts",
          scriptsRemoved: 0,
          inlineEventHandlersRemoved: 0,
          javascriptUrlsRemoved: 0,
          rawScriptsExecute: false,
        },
      }}
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
      aiProviderStatus={{ provider: "openai", scope: "airship_editor", ownerScope: "internal_superadmin", connected: false, status: "missing", maskedKey: null, model: "gpt-5", lastTestedAt: null, lastTestStatus: null, createdAt: null, updatedAt: null, canUseAiCommands: false }}
      agentProfileSelection={selectedAirshipProfile({ status: "unavailable", activeProfile: null, diagnostics: ["airship_agent_default_profile_unavailable"] })}
    />,
  );

  assert.equal(html.includes('data-airship-artifact-canvas-render="true"'), true);
  assert.equal(html.includes('data-airship-artifact-render-source="demo_artifact"'), true);
  assert.equal(html.includes(`data-airship-artifact-runtime-artifact-id="${AIRSHIP_DEMO_ARTIFACT_ID}"`), true);
  assert.equal(html.includes('sandbox="allow-same-origin"'), true);
  assert.equal(html.includes('data-airship-artifact-canvas-height="1180"'), true);
  assert.equal(html.includes('data-airship-artifact-canvas-height-source="fallback-min-height"'), true);
  assert.equal(html.includes('data-airship-artifact-raw-scripts-execute="false"'), true);
  assert.equal(html.includes("The CHS team helps your IT change with every technology wave."), true);
  assert.equal(html.includes("Internal GNR8 demo preview for CHS."), true);
  assert.equal(html.includes('data-airship-editor-canvas="hero"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="offers"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="proof"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="approach"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="cta"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="footer"'), true);
  assert.equal(html.includes('data-airship-artifact-section-selector="[data-airship-section=&quot;hero&quot;]"'), true);
  assert.equal(html.includes('data-airship-artifact-geometry-source="fallback-band"'), true);
  assert.equal(html.includes("What changes in the improved draft"), false);
});

test("airship visual editor uses ARIS candidate artifact renderer when available", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  model.importedSite = "aris.si";
  model.sourceUrl = "https://www.aris.si/";
  model.liveSiteUrl = "https://www.aris.si/";
  model.demoReadiness = null;
  model.importedSiteModel = {
    ...model.importedSiteModel,
    siteLabel: "aris.si",
    sourceUrl: "https://www.aris.si/",
    liveUrl: "https://www.aris.si/",
    latestInternalPreviewHost: {
      ...model.importedSiteModel.latestInternalPreviewHost!,
      previewUrl: "https://aris-airship.app.pasadenagenerator.com/",
    },
  };
  model.previews.airshipDraftCandidate = {
    label: "New Airship draft candidate preview",
    siteVersionId: "6d712ab9-f48e-49a3-9c26-03915365d746",
    runtimeArtifactId: "8073651e-510b-47e7-8363-8a742b7967db",
    route: `${INTERNAL_PREVIEW_ROUTE_PREFIX}/6d712ab9-f48e-49a3-9c26-03915365d746/preview?mode=transformed`,
    mode: "transformed",
    available: true,
    unavailableReason: null,
    authNote: "Superadmin-only internal GNR8 preview. Not live, internal preview only.",
    statusLabel: "Not live, internal preview only",
    sourceLiveSiteVersionId: "ae35c6ad-5a26-4413-a3c8-64362b042810",
    sourceLiveRuntimeArtifactId: "f024459a-8bc9-41b9-b2a7-137ee85eaf83",
    draftId: "5ed1b4da-eb06-4eee-bdc0-5b5cdec99707",
    draftVersion: 1,
    styleSettings: model.draftPanel.persistence.styleSettings,
    appliedEdits: [],
    skippedEdits: [],
  };
  const html = renderToStaticMarkup(
    <AirshipSingleSiteVisualEditorWorkspace
      migrationId={model.migrationId}
      importedSite={model.importedSite}
      sourceUrl={model.sourceUrl}
      liveSiteUrl={model.liveSiteUrl}
      importedSiteModel={model.importedSiteModel}
      demoReadiness={model.demoReadiness}
      artifactCanvasRender={{
        source: "candidate_artifact",
        label: "Airship candidate artifact render",
        siteVersionId: "6d712ab9-f48e-49a3-9c26-03915365d746",
        runtimeArtifactId: "8073651e-510b-47e7-8363-8a742b7967db",
        path: "/",
        previewUrl: "https://aris-airship.app.pasadenagenerator.com/",
        sanitizedHtml: "<!doctype html><html><body><main><h1>ARIS - Apple in Canton ponudba</h1><p>MacBook Air, Mac Studio in Canton Smart izdelki.</p><p>Blackmagic Design, Eizo, Just Normlicht.</p><p>prodaja@aris.si</p></main></body></html>",
        originalHtmlByteLength: 221,
        sanitizedHtmlByteLength: 221,
        safety: {
          sandbox: "iframe-sandbox-without-scripts",
          scriptsRemoved: 0,
          inlineEventHandlersRemoved: 0,
          javascriptUrlsRemoved: 0,
          rawScriptsExecute: false,
        },
      }}
      draftCandidate={{
        siteVersionId: model.previews.airshipDraftCandidate.siteVersionId,
        runtimeArtifactId: model.previews.airshipDraftCandidate.runtimeArtifactId,
        route: model.previews.airshipDraftCandidate.route,
        draftId: model.previews.airshipDraftCandidate.draftId,
        draftVersion: model.previews.airshipDraftCandidate.draftVersion,
        statusLabel: model.previews.airshipDraftCandidate.statusLabel,
      }}
      draftPreview={model.draftPanel.draftPreview}
      drafts={model.draftPanel.drafts}
      persistence={model.draftPanel.persistence}
      aiProviderStatus={{ provider: "openai", scope: "airship_editor", ownerScope: "internal_superadmin", connected: false, status: "missing", maskedKey: null, model: "gpt-5", lastTestedAt: null, lastTestStatus: null, createdAt: null, updatedAt: null, canUseAiCommands: false }}
      agentProfileSelection={selectedAirshipProfile({ status: "unavailable", activeProfile: null, diagnostics: ["airship_agent_default_profile_unavailable"] })}
    />,
  );

  assert.equal(html.includes('data-airship-artifact-render-source="candidate_artifact"'), true);
  assert.equal(html.includes("ARIS - Apple in Canton ponudba"), true);
  assert.equal(html.includes("MacBook Air"), true);
  assert.equal(html.includes("Blackmagic Design"), true);
  assert.equal(html.includes("prodaja@aris.si"), true);
  assert.equal(html.includes("https://aris-airship.app.pasadenagenerator.com/"), true);
  assert.equal(html.includes("What changes in the improved draft"), false);
  assert.equal(html.includes("CHS helps modernize secure enterprise IT"), false);
});

test("airship visual editor renders ARIS multi-section canvas without CHS identity leakage", () => {
  const model = airshipModel();
  assert.ok(model.draftPanel.draftPreview);
  model.importedSite = "aris.si";
  model.sourceUrl = "https://www.aris.si/";
  model.liveSiteUrl = "https://www.aris.si/";
  model.demoReadiness = null;
  model.importedSiteModel = {
    ...model.importedSiteModel,
    siteLabel: "aris.si",
    sourceUrl: "https://www.aris.si/",
    liveUrl: "https://www.aris.si/",
    editableSections: [
      { key: "hero", label: "Hero / intro", detail: "Headline, subheading, spacing, tint", mappedDraftFieldIds: ["airship-aris-home-headline", "airship-aris-home-subheading"], sourceStatus: "source-supported hero draft fields" },
      { key: "offers", label: "Offers / Services", detail: "Offer/service copy and cards", mappedDraftFieldIds: ["airship-aris-home-product-offers"], sourceStatus: "draft services section available" },
      { key: "proof", label: "Proof / Benefits", detail: "Proof points and benefits", mappedDraftFieldIds: ["airship-aris-home-brand-category-proof"], sourceStatus: "draft proof section available" },
      { key: "cta", label: "CTA / Contact", detail: "Primary action label and contact copy", mappedDraftFieldIds: ["airship-aris-home-ctaLabel"], sourceStatus: "source-supported CTA draft field" },
      { key: "source", label: "Source material", detail: "Imported-site evidence and internal draft refs", mappedDraftFieldIds: ["airship-aris-home-headline", "airship-aris-home-subheading", "airship-aris-home-product-offers", "airship-aris-home-brand-category-proof", "airship-aris-home-ctaLabel"], sourceStatus: "source material readback only" },
    ],
  };
  model.draftPanel.drafts = [
    { id: "airship-aris-home-headline", fieldKey: "headline", sectionKey: "hero", targetSectionPage: "Homepage / hero headline", currentTextContentSummary: "ARIS source evidence.", proposedTextContent: "ARIS - Apple in Canton ponudba", reasonForChange: "ARIS hero.", status: "edited", previewImpact: "Hero headline appears in internal preview only." },
    { id: "airship-aris-home-subheading", fieldKey: "subheading", sectionKey: "hero", targetSectionPage: "Homepage / hero subheading", currentTextContentSummary: "ARIS source evidence.", proposedTextContent: "MacBook Air, Mac Studio in Canton Smart izdelki z osebnim svetovanjem.", reasonForChange: "ARIS subheading.", status: "edited", previewImpact: "Hero subheading appears in internal preview only." },
    { id: "airship-aris-home-product-offers", sectionKey: "offers", targetSectionPage: "Homepage / product offer section", currentTextContentSummary: "ARIS product evidence.", proposedTextContent: "MacBook Air, Mac Studio, Canton Smart in posebne ponudbe.", reasonForChange: "ARIS offers.", status: "edited", previewImpact: "Offers section appears in internal preview only." },
    { id: "airship-aris-home-brand-category-proof", sectionKey: "proof", targetSectionPage: "Homepage / brand and category proof", currentTextContentSummary: "ARIS brand evidence.", proposedTextContent: "Apple, Canton, Blackmagic Design, Eizo in druge znamke podpirajo ARIS ponudbo.", reasonForChange: "ARIS proof.", status: "edited", previewImpact: "Proof section appears in internal preview only." },
    { id: "airship-aris-home-ctaLabel", fieldKey: "ctaLabel", sectionKey: "cta", targetSectionPage: "Homepage / contact inquiry call-to-action", currentTextContentSummary: "ARIS contact evidence.", proposedTextContent: "Želim ponudbo", reasonForChange: "ARIS CTA.", status: "edited", previewImpact: "CTA appears in internal preview only." },
  ];
  model.draftPanel.draftPreview = {
    ...model.draftPanel.draftPreview,
    hero: {
      eyebrow: "ARIS",
      headline: "ARIS - Apple in Canton ponudba",
      subheading: "MacBook Air, Mac Studio in Canton Smart izdelki z osebnim svetovanjem.",
      primaryCtaLabel: "Želim ponudbo",
      secondaryContactText: "prodaja@aris.si",
    },
    sections: [
      { key: "hero", label: "Hero", eyebrow: "First viewport", heading: "ARIS", body: "ARIS - Apple in Canton ponudba", items: [], ctaLabel: null },
      { key: "offers", label: "Offers / Services", eyebrow: "Offers / Services", heading: "Product offers", body: "MacBook Air, Mac Studio, Canton Smart in posebne ponudbe.", items: ["MacBook Air", "Mac Studio", "Canton Smart"], ctaLabel: null },
      { key: "proof", label: "Proof / Benefits", eyebrow: "Proof / Benefits", heading: "Brand proof", body: "Apple, Canton, Blackmagic Design, Eizo in druge znamke podpirajo ARIS ponudbo.", items: ["Apple", "Canton", "Blackmagic Design"], ctaLabel: null },
      { key: "cta", label: "CTA / Contact", eyebrow: "CTA / Contact", heading: "Želim ponudbo", body: "prodaja@aris.si", items: [], ctaLabel: "Želim ponudbo" },
    ],
  };
  const html = renderToStaticMarkup(
    <AirshipSingleSiteVisualEditorWorkspace
      migrationId={model.migrationId}
      importedSite={model.importedSite}
      sourceUrl={model.sourceUrl}
      liveSiteUrl={model.liveSiteUrl}
      importedSiteModel={model.importedSiteModel}
      demoReadiness={model.demoReadiness}
      draftCandidate={null}
      draftPreview={model.draftPanel.draftPreview}
      drafts={model.draftPanel.drafts}
      persistence={model.draftPanel.persistence}
      aiProviderStatus={{ provider: "openai", scope: "airship_editor", ownerScope: "internal_superadmin", connected: false, status: "missing", maskedKey: null, model: "gpt-5", lastTestedAt: null, lastTestStatus: null, createdAt: null, updatedAt: null, canUseAiCommands: false }}
      agentProfileSelection={selectedAirshipProfile({ status: "unavailable", activeProfile: null, diagnostics: ["airship_agent_default_profile_unavailable"] })}
    />,
  );

  assert.equal(html.includes("aris.si"), true);
  assert.equal(html.includes("ARIS - Apple in Canton ponudba"), true);
  assert.equal(html.includes("MacBook Air"), true);
  assert.equal(html.includes("Blackmagic Design"), true);
  assert.equal(html.includes('data-airship-editor-canvas="offers"'), true);
  assert.equal(html.includes('data-airship-editor-canvas="proof"'), true);
  assert.equal(html.includes("CHS"), false);
  assert.equal(html.includes("chs.si"), false);
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
  assert.equal(html.includes("Draft only"), true);
  assert.equal(html.includes("Not live"), true);
  assert.equal(html.includes("Not published"), true);
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

test("airship visual editor uses direct canvas selection without requiring the old left rail", async () => {
  const visualEditorSource = await readFile(VISUAL_EDITOR_FILE, "utf8");

  assert.equal(visualEditorSource.includes("data-airship-editor-rail-target"), false);
  assert.equal(visualEditorSource.includes("aria-label=\"Section navigator\""), false);
  assert.equal(visualEditorSource.includes("data-selected={selectedSection === \"hero\"}"), true);
  assert.equal(visualEditorSource.includes("data-selected={selectedSection === section.key}"), true);
  assert.equal(visualEditorSource.includes("data-selected={selectedSection === \"cta\"}"), true);
  assert.equal(visualEditorSource.includes("data-selected={selectedSection === \"source\"}"), true);
  assert.equal(visualEditorSource.includes("onClick={() => selectSection(section.key)}"), true);
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
  assert.equal(hero.selectionLevel, "section-level");
  assert.equal(hero.role, "region / homepage hero intro");
  assert.deepEqual(hero.mappedDraftFieldIds, [
    "airship-chs-home-hero-headline",
    "airship-chs-home-hero-value-proposition",
  ]);
  assert.equal(hero.sourceStatus, "source-supported hero draft fields");
  assert.equal(hero.internalRefs.some((ref) => ref.label === "live url" && ref.value === "https://www.chs.si/"), true);

  const cta = deriveAirshipSelectedElementMetadata({ ...base, section: "cta" });
  assert.equal(cta.selectionLevel, "section-level");
  assert.equal(cta.domSectionId, "airship-preview-cta");
  assert.equal(cta.role, "section / CTA and contact action");
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

test("airship visual editor derives artifact DOM geometry and fallback canvas height", () => {
  assert.equal(
    measuredAirshipArtifactCanvasHeight({
      documentElementScrollHeight: 2140,
      bodyScrollHeight: 2060,
      bodyOffsetHeight: 1980,
      fallbackHeight: 1180,
    }),
    2140,
  );
  assert.equal(
    measuredAirshipArtifactCanvasHeight({
      documentElementScrollHeight: null,
      bodyScrollHeight: null,
      bodyOffsetHeight: null,
      fallbackHeight: 1180,
    }),
    1180,
  );
  assert.deepEqual(
    airshipArtifactOverlayRectFromDomRect({
      iframeElementRect: { top: 100, left: 80, width: 1100, height: 1400 },
      overlayHostElementRect: { top: 100, left: 80, width: 1100, height: 1400 },
      targetElementRect: { top: 12.4, left: 8.6, width: 320.2, height: 144.8 },
      zoomScale: 1,
      iframeScrollY: 40,
    }),
    { top: 52, left: 9, width: 320, height: 145, source: "dom-marker" },
  );
  assert.deepEqual(
    airshipArtifactOverlayRectFromDomRect({
      iframeElementRect: { top: 71, left: 35.5, width: 781, height: 994 },
      overlayHostElementRect: { top: 0, left: 0, width: 781, height: 994 },
      targetElementRect: { top: 120, left: 48, width: 640, height: 220 },
      zoomScale: 0.71,
    }),
    { top: 220, left: 98, width: 640, height: 220, source: "dom-marker" },
  );
  assert.deepEqual(
    airshipArtifactOverlayRectFromDomRect({
      iframeElementRect: { top: 122, left: 54, width: 1100, height: 1400 },
      overlayHostElementRect: { top: 90, left: 40, width: 1100, height: 1432 },
      targetElementRect: { top: 200, left: 0, width: 1100, height: 360 },
      zoomScale: 1,
    }),
    { top: 232, left: 14, width: 1100, height: 360, source: "dom-marker" },
  );
  assert.deepEqual(
    airshipArtifactOverlayRectFromDomRect({
      iframeElementRect: { top: -178, left: 54, width: 1100, height: 1400 },
      overlayHostElementRect: { top: -210, left: 40, width: 1100, height: 1432 },
      targetElementRect: { top: 200, left: 0, width: 1100, height: 360 },
      zoomScale: 1,
    }),
    { top: 232, left: 14, width: 1100, height: 360, source: "dom-marker" },
  );
  assert.equal(
    airshipArtifactOverlayRectFromDomRect({
      iframeElementRect: { top: 0, left: 0, width: 100, height: 100 },
      targetElementRect: null,
      zoomScale: 1,
    }),
    null,
  );
  assert.equal(airshipArtifactSectionSelector("cta"), '[data-airship-section="cta"]');
  assert.deepEqual(airshipElementSelectorsForSection("hero"), [
    '[data-airship-element="hero-headline"]',
    '[data-airship-element="hero-cta"]',
  ]);
  assert.deepEqual(airshipElementSelectorsForSection("cta"), [
    '[data-airship-element="contact-card"]',
    '[data-airship-element="contact-cta"]',
  ]);
});

test("airship artifact selection falls back to approximate bands when DOM markers are absent", async () => {
  const visualEditorSource = await readFile(VISUAL_EDITOR_FILE, "utf8");

  assert.equal(visualEditorSource.includes('data-airship-artifact-geometry-source={artifactOverlayRects[section] ? "dom-marker" : "fallback-band"}'), true);
  assert.equal(visualEditorSource.includes("if (!element) continue;"), true);
  assert.equal(visualEditorSource.includes("return artifactSectionBandStyle(section);"), true);
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

test("airship visual editor hides provider read error cards from the reference shell", () => {
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

  assert.equal(html.includes("OpenAI provider readback"), false);
  assert.equal(html.includes("Status read failed"), false);
  assert.equal(html.includes("OpenAI provider status could not be read"), false);
  assert.equal(html.includes("Provider status read failed. The editor remains available"), false);
  assert.equal(html.includes("AI commands stay disabled"), false);
  assert.equal(html.includes("Airship agent profile unavailable"), false);
  assert.equal(html.includes("Airship</span>"), true);
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
  assert.equal(visualEditorSource.includes("right: 34px"), true);
  assert.equal(visualEditorSource.includes("max-width: calc(100vw - 132px)"), true);
  assert.equal(visualEditorSource.includes("max-height: calc(100% - 32px)"), true);
  assert.equal(visualEditorSource.includes("background: #292929"), true);
  assert.equal(visualEditorSource.includes("width: 546px"), true);
  assert.equal(visualEditorSource.includes(".airship-agent-transcript-shell"), true);
  assert.equal(visualEditorSource.includes(".airship-inspector-body"), true);
  assert.equal(visualEditorSource.includes("overflow: auto"), true);
  assert.equal(visualEditorSource.includes(".airship-bottom-toolbar"), true);
  assert.equal(visualEditorSource.includes("max-width: calc(100% - 40px)"), true);
  assert.equal(visualEditorSource.includes("bottom: 28px"), true);
  assert.equal(visualEditorSource.includes("padding: 46px 620px 122px 98px"), true);
  assert.equal(visualEditorSource.includes("data-airship-full-page-canvas=\"true\""), true);
  assert.equal(visualEditorSource.includes("data-airship-canvas-zoom"), true);
  assert.equal(visualEditorSource.includes("fitCanvasWidth"), true);
  assert.equal(visualEditorSource.includes("overflow-x: auto"), true);
});

test("airship visual editor hides connected provider status from primary shell", () => {
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

  assert.equal(html.includes("OpenAI provider readback"), false);
  assert.equal(html.includes("Connected"), false);
  assert.equal(html.includes("OpenAI connected (sk-...safe, gpt-5)."), false);
  assert.equal(html.includes("Test passed"), false);
  assert.equal(html.includes("Active Airship profile"), false);
  assert.equal(html.includes("Airship Editor Default"), false);
  assert.equal(html.includes("Selected agency/default Airship profile"), false);
  assert.equal(html.includes("airship_editor"), false);
  assert.equal(html.includes("sk-test"), false);
  assert.equal(html.includes("safe-secret"), false);
  assert.equal(html.includes("Status read failed"), false);
  assert.equal(html.includes("Connect OpenAI to use AI commands"), false);
});

test("airship visual editor shell has no provider cards and commands never call OpenAI", async () => {
  const visualEditorSource = await readFile(VISUAL_EDITOR_FILE, "utf8");

  assert.equal(visualEditorSource.includes("isAirshipOpenAIProviderConnected"), true);
  assert.equal(visualEditorSource.includes("OpenAI provider readback"), false);
  assert.equal(visualEditorSource.includes("Provider readback is shown from backend status only"), false);
  assert.equal(visualEditorSource.includes("No OpenAI command request is sent"), false);
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

test("airship single-site readback keeps rollback explicit without adding unrelated mutation surfaces", async () => {
  const [pageSource, componentSource, localEditorSource, rollbackActionSource, visualEditorSource, projectionSource] = await Promise.all([
    readFile(PAGE_FILE, "utf8"),
    readFile(COMPONENT_FILE, "utf8"),
    readFile(LOCAL_EDITOR_FILE, "utf8"),
    readFile(ROLLBACK_ACTION_FILE, "utf8"),
    readFile(VISUAL_EDITOR_FILE, "utf8"),
    readFile(PROJECTION_FILE, "utf8"),
  ]);
  const source = `${pageSource}\n${componentSource}\n${localEditorSource}\n${rollbackActionSource}\n${visualEditorSource}\n${projectionSource}`;
  const rollbackFetchUrls = Array.from(rollbackActionSource.matchAll(/fetch\(["']([^"']+)["']/g), (match) => match[1]);

  assert.equal(source.includes("mutatesProductionData: false"), true);
  assert.equal(source.includes("mutatesDraftData: true"), true);
  assert.equal(source.includes("activePointerMutation: false"), true);
  assert.equal(source.includes('method="post"'), false);
  assert.equal(source.includes("runtimePreviewGET"), false);
  assert.equal(source.includes("Run provider"), false);
  assert.deepEqual(rollbackFetchUrls, ["/api/gnr8/admin/airship/single-site/rollback-simple-promote"]);
  assert.equal(rollbackActionSource.includes("Admin-only destructive rollback"), true);
  assert.equal(source.includes("Publish candidate"), false);
  assert.doesNotMatch(rollbackActionSource, /publish-readiness|governed-dry-run|shadow-publish|source-capture|provider\/openai/i);
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
