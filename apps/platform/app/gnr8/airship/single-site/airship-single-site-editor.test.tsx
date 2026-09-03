import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import ReactDomServer from "react-dom/server";

import type { AirshipSingleSiteEditorReadonlyProjection } from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";

import { AirshipSingleSiteEditor } from "./airship-single-site-editor";
import {
  applyAirshipSingleSiteLocalDraftEdit,
  initialAirshipSingleSiteLocalDraftFields,
} from "./airship-single-site-local-draft-editor";
import {
  AirshipSingleSiteVisualEditorWorkspace,
  applyAirshipHeroCommand,
  applyAirshipHeroTextFieldEdit,
  initialAirshipHeroEditorFields,
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

function airshipModel(): AirshipSingleSiteEditorReadonlyProjection {
  return {
    version: "airship-1-single-site-editor-readonly:v1",
    generatedAt: "2026-09-01T00:00:00.000Z",
    routeHref: `/gnr8/airship/single-site?migrationId=${CHS_MIGRATION_ID}`,
    state: "visible",
    migrationId: CHS_MIGRATION_ID,
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
      detail: "3 proposed Airship draft edit(s) generated for the imported CHS homepage. Browser edits are local-only and are not applied to the live site.",
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
          targetSectionPage: "Homepage / hero headline",
          currentTextContentSummary: "Captured CHS homepage evidence includes the hero line `Less risk. More control. Better IT.` and the CHS identity in the page title and footer.",
          proposedTextContent: "Less risk. More control. Better IT.",
          reasonForChange: "Keep the first-viewport headline anchored to CHS source copy and make the CHS identity explicit without introducing outside claims.",
          status: "proposed",
          previewImpact: "AI draft preview opens with the CHS homepage headline instead of unrelated company or transport copy.",
        },
        {
          id: "airship-chs-home-hero-value-proposition",
          targetSectionPage: "Homepage / hero subheading",
          currentTextContentSummary: "Captured CHS source evidence says CHS delivers advanced solutions in cybersecurity, data systems, and hybrid infrastructure across the Adriatic region.",
          proposedTextContent: "Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region.",
          reasonForChange: "Condense the source-supported service description into a clearer first-viewport value proposition.",
          status: "proposed",
          previewImpact: "AI draft preview explains CHS's IT focus in one scannable line under the headline.",
        },
        {
          id: "airship-chs-home-contact-cta",
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
  assert.equal(pageSource.includes("AIRSHIP_CHS_MIGRATION_ID"), true);
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
      draftCandidate={{
        siteVersionId: model.previews.airshipDraftCandidate?.siteVersionId ?? null,
        runtimeArtifactId: model.previews.airshipDraftCandidate?.runtimeArtifactId ?? null,
        route: model.previews.airshipDraftCandidate?.route ?? null,
        draftId: model.previews.airshipDraftCandidate?.draftId ?? null,
        draftVersion: model.previews.airshipDraftCandidate?.draftVersion ?? null,
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
        updatedAt: null,
        canUseAiCommands: false,
      }}
    />,
  );

  assert.equal(html.includes("Draft editor"), true);
  assert.equal(html.includes("Internal preview only"), true);
  assert.equal(html.includes("Not live"), true);
  assert.equal(html.includes("Not published"), true);
  assert.equal(html.includes("Changes are saved to Airship draft only"), true);
  assert.equal(html.includes("Style changes are local preview only"), true);
  assert.equal(html.includes("Homepage hero/intro"), true);
  assert.equal(html.includes("H1/headline text"), true);
  assert.equal(html.includes("Subheading/body text"), true);
  assert.equal(html.includes("CTA label"), true);
  assert.equal(html.includes("Hero top padding"), true);
  assert.equal(html.includes("Hero bottom padding"), true);
  assert.equal(html.includes("Background tint"), true);
  assert.equal(html.includes("CTA color"), true);
  assert.equal(html.includes("AI command"), true);
  assert.equal(html.includes("Connect OpenAI to use AI commands"), true);
  assert.equal(html.includes("OpenAI provider"), true);
  assert.equal(html.includes("Save key"), true);
  assert.equal(html.includes("Test connection"), true);
  assert.equal(html.includes("Revoke key"), true);
  assert.equal(html.includes("Apply command"), true);
  assert.equal(html.includes("Save text edits"), true);
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
  assert.equal(spacing.message.includes("Style changes are local preview only"), true);

  const prominent = applyAirshipHeroCommand(fields, "make CTA more prominent");
  assert.equal(prominent.supported, true);
  assert.equal(prominent.fields.ctaColor, "#1d4ed8");
  assert.equal(prominent.changedStyleFields.includes("ctaColor"), true);
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

test("airship single-site route is superadmin-gated and defaults to the CHS migration", async () => {
  const pageSource = await readFile(PAGE_FILE, "utf8");

  assert.equal(pageSource.includes("requireSuperadminUserIdForPage()"), true);
  assert.equal(pageSource.includes("AIRSHIP_CHS_MIGRATION_ID"), true);
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

test("airship preview route gives EMAXCONNSESSION a compact retry surface", async () => {
  const routeSource = await readFile(PREVIEW_ROUTE_FILE, "utf8");

  assert.equal(routeSource.includes("EMAXCONNSESSION"), true);
  assert.equal(routeSource.includes("Preview temporarily unavailable"), true);
  assert.equal(routeSource.includes("The internal preview could not get a database session."), true);
  assert.equal(routeSource.includes("local draft editing is still available"), true);
  assert.equal(routeSource.includes("status: 503"), true);
});
