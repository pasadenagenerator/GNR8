import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import ReactDomServer from "react-dom/server";

import type { AirshipSingleSiteEditorReadonlyProjection } from "@/gnr8/single-site/airship-single-site-editor-readonly-projection";

import { AirshipSingleSiteEditor } from "./airship-single-site-editor";

const { renderToStaticMarkup } = ReactDomServer;

const CHS_MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const ORIGINAL_CLONE_VERSION_ID = "6b172a5b-200e-471c-9599-5dc70f04ea53";
const IMPROVED_CANDIDATE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const INTERNAL_PREVIEW_ROUTE_PREFIX = "/api/gnr8/admin/single-site-studio/versions";
const PAGE_FILE = new URL("./page.tsx", import.meta.url);
const COMPONENT_FILE = new URL("./airship-single-site-editor.tsx", import.meta.url);
const PROJECTION_FILE = new URL("../../../../gnr8/single-site/airship-single-site-editor-readonly-projection.ts", import.meta.url);

function airshipModel(): AirshipSingleSiteEditorReadonlyProjection {
  return {
    version: "airship-1-single-site-editor-readonly:v1",
    generatedAt: "2026-09-01T00:00:00.000Z",
    routeHref: `/gnr8/airship/single-site?migrationId=${CHS_MIGRATION_ID}`,
    state: "visible",
    migrationId: CHS_MIGRATION_ID,
    importedSite: "chs.si",
    sourceUrl: "https://www.chs.si/",
    liveSiteUrl: "https://www.chs.si/",
    liveSiteLabel: "Live site",
    mvpStatus: "Internal single-site MVP accepted",
    aiImprovementStatus: {
      label: "Editable AI draft generated",
      detail: "3 proposed Airship draft edit(s) generated for the imported homepage. Draft edits are read-only in this phase and are not applied to the live site.",
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
    },
    links: {
      liveSite: "https://www.chs.si/",
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
          currentTextContentSummary: "The imported homepage hero/title is source-derived and reads as the company name, `TRANSPORTI MAVER D.O.O.`, before the service value is clear.",
          proposedTextContent: "Prevozi vozil po Evropi od leta 1982",
          reasonForChange: "Lead with the concrete service and longevity so visitors understand the offer before reading supporting company details.",
          status: "proposed",
          previewImpact: "AI draft preview headline changes from a company-name-only first impression to a service-led transport promise.",
        },
        {
          id: "airship-chs-home-hero-value-proposition",
          targetSectionPage: "Homepage / hero subheading",
          currentTextContentSummary: "The source text explains the fleet and European coverage later in the page: 15 auto transporters, EU destinations, EU 6 trucks, direct delivery, guarded parking, and workshop support.",
          proposedTextContent: "S 15 avtotransporterji za Nemcijo, Italijo, Spanijo, Svico in Francijo poskrbimo za zanesljiv prevzem, zbirnik in dostavo vozil do stranke ali varovanega parkirisca.",
          reasonForChange: "Condense the strongest source facts into one first-viewport value proposition without adding new claims outside the imported content.",
          status: "proposed",
          previewImpact: "AI draft preview adds a scannable service summary under the hero headline.",
        },
        {
          id: "airship-chs-home-contact-cta",
          targetSectionPage: "Homepage / contact call-to-action",
          currentTextContentSummary: "A safe contact target exists in the source material: the homepage includes `Kontakt`, phone links, and email links for Transporti Maver.",
          proposedTextContent: "Posljite povprasevanje za prevoz vozila",
          reasonForChange: "Make the contact action outcome-specific while keeping it tied to the existing contact section and source contact channels.",
          status: "proposed",
          previewImpact: "AI draft preview shows a clearer primary contact CTA; it is not wired to mutate or publish production content.",
        },
      ],
      draftPreview: {
        label: "AI draft preview",
        appliedToLiveSite: false,
        persistence: "generated_read_only",
        note: "Generated Airship draft preview only. These proposed edits are not live, not published, and not persisted as production content.",
        hero: {
          eyebrow: "TRANSPORTI MAVER D.O.O.",
          headline: "Prevozi vozil po Evropi od leta 1982",
          subheading: "S 15 avtotransporterji za Nemcijo, Italijo, Spanijo, Svico in Francijo poskrbimo za zanesljiv prevzem, zbirnik in dostavo vozil do stranke ali varovanega parkirisca.",
          primaryCtaLabel: "Posljite povprasevanje za prevoz vozila",
          secondaryContactText: "+386 (0)1 366 38 36 - transporti.maver@siol.net",
        },
      },
      controlMode: "disabled_read_only_generated_draft",
      controlNote: "Accept, reject, and save are disabled because this Airship phase generates a read-only draft preview without production persistence.",
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
      readOnly: true,
      mutatesProductionData: false,
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
  assert.equal(html.includes("Open live site"), true);
});

test("airship single-site editor renders original and current improved previews with internal routes", () => {
  const html = renderToStaticMarkup(<AirshipSingleSiteEditor model={airshipModel()} />);

  assert.equal(html.includes("Original clone preview"), true);
  assert.equal(html.includes("Current improved/published preview"), true);
  assert.equal(html.includes("AI draft preview"), true);
  assert.equal(html.includes("Proposed changes only"), true);
  assert.equal(html.includes(`${INTERNAL_PREVIEW_ROUTE_PREFIX}/${ORIGINAL_CLONE_VERSION_ID}/preview?mode=transformed`), true);
  assert.equal(html.includes(`${INTERNAL_PREVIEW_ROUTE_PREFIX}/${IMPROVED_CANDIDATE_VERSION_ID}/preview?mode=transformed`), true);
  assert.equal(html.includes('src="https://www.chs.si/"'), false);
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
  assert.equal(html.includes("Prevozi vozil po Evropi od leta 1982"), true);
  assert.equal(html.includes("Homepage / hero subheading"), true);
  assert.equal(html.includes("S 15 avtotransporterji za Nemcijo"), true);
  assert.equal(html.includes("Homepage / contact call-to-action"), true);
  assert.equal(html.includes("Posljite povprasevanje za prevoz vozila"), true);
  assert.equal(html.includes("proposed"), true);
});

test("airship single-site editor renders the generated draft preview as not live and not persisted", () => {
  const html = renderToStaticMarkup(<AirshipSingleSiteEditor model={airshipModel()} />);

  assert.equal(html.includes("Generated Airship draft preview only"), true);
  assert.equal(html.includes("not live, not published, and not persisted as production content"), true);
  assert.equal(html.includes("generated read-only draft"), true);
  assert.equal(html.includes("generated read only"), true);
  assert.equal(html.includes("TRANSPORTI MAVER D.O.O."), true);
});

test("airship single-site editor labels non-persisted draft controls honestly", () => {
  const html = renderToStaticMarkup(<AirshipSingleSiteEditor model={airshipModel()} />);

  assert.equal(html.includes("Accept draft disabled"), true);
  assert.equal(html.includes("Reject draft disabled"), true);
  assert.equal(html.includes("Save edit disabled"), true);
  assert.equal(html.includes("read-only draft preview without production persistence"), true);
});

test("airship single-site route is superadmin-gated and defaults to the CHS migration", async () => {
  const pageSource = await readFile(PAGE_FILE, "utf8");

  assert.equal(pageSource.includes("requireSuperadminUserIdForPage()"), true);
  assert.equal(pageSource.includes("AIRSHIP_CHS_MIGRATION_ID"), true);
  assert.equal(pageSource.includes("getAirshipSingleSiteEditorReadonlyProjection"), true);
});

test("airship single-site foundation adds no production mutation action surface", async () => {
  const [pageSource, componentSource, projectionSource] = await Promise.all([
    readFile(PAGE_FILE, "utf8"),
    readFile(COMPONENT_FILE, "utf8"),
    readFile(PROJECTION_FILE, "utf8"),
  ]);
  const source = `${pageSource}\n${componentSource}\n${projectionSource}`;

  assert.equal(source.includes("mutatesProductionData: false"), true);
  assert.equal(source.includes("activePointerMutation: false"), true);
  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes('method="post"'), false);
  assert.equal(source.includes("runtimePreviewGET"), false);
  assert.equal(source.includes("Run provider"), false);
  assert.equal(source.includes("Rollback"), false);
  assert.equal(source.includes("Publish candidate"), false);
});
