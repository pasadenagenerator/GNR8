import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import ReactDomServer from "react-dom/server";

import type { SingleSiteStudioReadonlyProjection } from "@/gnr8/single-site/single-site-studio-readonly-projection";

import { SingleSiteStudio } from "./single-site-studio";

const { renderToStaticMarkup } = ReactDomServer;

const CHS_MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const ORIGINAL_CLONE_VERSION_ID = "6b172a5b-200e-471c-9599-5dc70f04ea53";
const IMPROVED_CANDIDATE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const PAGE_FILE = new URL("./page.tsx", import.meta.url);
const COMPONENT_FILE = new URL("./single-site-studio.tsx", import.meta.url);
const LAYOUT_FILE = new URL("../layout.tsx", import.meta.url);
const COMMAND_CENTER_LAYOUT_FILE = new URL("../CommandCenterLayout.tsx", import.meta.url);
const PROJECTION_FILE = new URL("../../../../gnr8/single-site/single-site-studio-readonly-projection.ts", import.meta.url);

function studioModel(): SingleSiteStudioReadonlyProjection {
  return {
    version: "mvp-ui-1-single-site-studio-readonly:v1",
    generatedAt: "2026-08-31T00:00:00.000Z",
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
    workflow: [
      { key: "import", label: "Import", status: "done" },
      { key: "source_evidence", label: "Source evidence", status: "done" },
      { key: "original_clone", label: "Original clone", status: "done" },
      { key: "ai_improved_version", label: "AI improved version", status: "done" },
      { key: "approvals", label: "Approvals", status: "done" },
      { key: "published", label: "Published", status: "done" },
    ],
    sourceEvidence: [
      { label: "Source URL", status: "accepted", detail: "https://www.chs.si/" },
      { label: "Visual identity", status: "accepted", detail: "Brand evidence captured from source site." },
      { label: "Metadata", status: "accepted", detail: "Source metadata captured." },
    ],
    previews: {
      originalClone: {
        label: "Original clone preview",
        siteVersionId: ORIGINAL_CLONE_VERSION_ID,
        runtimeArtifactId: "929106cd-fa19-47eb-9582-ce6931d0e370",
        route: `/api/gnr8/runtime/versions/${ORIGINAL_CLONE_VERSION_ID}/preview?mode=transformed`,
        mode: "transformed",
        available: true,
        unavailableReason: null,
        authNote: "Authenticated runtime preview route exists.",
      },
      improvedCandidate: {
        label: "Improved candidate preview",
        siteVersionId: IMPROVED_CANDIDATE_VERSION_ID,
        runtimeArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
        route: `/api/gnr8/runtime/versions/${IMPROVED_CANDIDATE_VERSION_ID}/preview?mode=transformed`,
        mode: "transformed",
        available: true,
        unavailableReason: null,
        authNote: "Authenticated runtime preview route exists.",
      },
    },
    comparison: [
      { label: "Original imported site", status: "source captured", detail: "https://www.chs.si/", href: "https://www.chs.si/" },
      {
        label: "Generated clone",
        status: "accepted",
        detail: `Runtime site version ${ORIGINAL_CLONE_VERSION_ID}`,
        href: `/api/gnr8/runtime/versions/${ORIGINAL_CLONE_VERSION_ID}/preview?mode=transformed`,
      },
      {
        label: "Improved candidate",
        status: "PUBLISHED",
        detail: `Runtime site version ${IMPROVED_CANDIDATE_VERSION_ID}`,
        href: `/api/gnr8/runtime/versions/${IMPROVED_CANDIDATE_VERSION_ID}/preview?mode=transformed`,
      },
      { label: "Live published version", status: "live", detail: "https://www.chs.si/", href: "https://www.chs.si/" },
    ],
    improvementSummary: {
      headline: "Accepted with limitations; no deterministic content changes were applied in this MVP rehearsal.",
      appliedCount: 0,
      limitationCount: 4,
      noDeterministicContentChanges: true,
      recommendations: [
        {
          id: "0be61bde-6568-4f33-8499-4d5eade70837",
          key: "make-contact-actions-more-prominent",
          title: "Make contact actions more prominent",
          category: "conversion",
          priority: "p1",
          status: "accepted_limitation",
          reason: "unsupported_in_mvp",
        },
        {
          id: "73de9484-1461-4476-b677-f41d7a839df7",
          key: "add-trust-signals-and-seo-structure",
          title: "Add trust signals and SEO structure",
          category: "trust_credibility",
          priority: "p2",
          status: "accepted_limitation",
          reason: "requires_operator_input",
        },
        {
          id: "86342f67-7cce-43de-823f-ea0f4adc1a41",
          key: "clarify-service-positioning-copy",
          title: "Clarify service positioning copy",
          category: "content_clarity",
          priority: "p1",
          status: "accepted_limitation",
          reason: "requires_operator_input",
        },
        {
          id: "a61e857e-89c1-4ab1-bdc1-581a24e824c1",
          key: "tighten-mobile-layout-hierarchy",
          title: "Tighten mobile layout hierarchy",
          category: "mobile_responsive",
          priority: "p2",
          status: "accepted_limitation",
          reason: "unsupported_in_mvp",
        },
      ],
    },
    flags: {
      readOnly: true,
      mutatesProductionData: false,
      imports: false,
      publishes: false,
    },
  };
}

test("single-site studio renders the CHS MVP first-viewport summary and preview routes", () => {
  const html = renderToStaticMarkup(<SingleSiteStudio model={studioModel()} />);

  assert.equal(html.includes("Single-Site Studio"), true);
  assert.equal(html.includes("chs.si MVP Studio"), true);
  assert.equal(html.includes("https://www.chs.si/"), true);
  assert.equal(html.includes("Internal single-site MVP accepted"), true);
  assert.equal(html.includes("live"), true);
  assert.equal(html.includes("PUBLISHED"), true);
  assert.equal(html.includes("Open live site"), true);
  assert.equal(html.includes("Open diagnostics"), true);
  assert.equal(html.includes(`/gnr8/command-center/single-site-publish?migrationId=${CHS_MIGRATION_ID}`), true);
});

test("single-site studio renders the required workflow, comparison, and AI recommendation summary", () => {
  const html = renderToStaticMarkup(<SingleSiteStudio model={studioModel()} />);

  for (const label of ["Import", "Source evidence", "Original clone", "AI improved version", "Approvals", "Published"]) {
    assert.equal(html.includes(label), true);
  }

  for (const label of ["Original imported site", "Generated clone", "Improved candidate", "Live published version"]) {
    assert.equal(html.includes(label), true);
  }

  for (const title of [
    "Make contact actions more prominent",
    "Add trust signals and SEO structure",
    "Clarify service positioning copy",
    "Tighten mobile layout hierarchy",
  ]) {
    assert.equal(html.includes(title), true);
  }

  assert.equal(html.includes("Accepted with limitations; no deterministic content changes were applied in this MVP rehearsal."), true);
  assert.equal(html.includes("accepted limitation"), true);
});

test("single-site studio embeds authenticated runtime preview endpoints when refs exist", () => {
  const html = renderToStaticMarkup(<SingleSiteStudio model={studioModel()} />);

  assert.equal(html.includes("Original clone preview"), true);
  assert.equal(html.includes(`/api/gnr8/runtime/versions/${ORIGINAL_CLONE_VERSION_ID}/preview?mode=transformed`), true);
  assert.equal(html.includes("Improved candidate preview"), true);
  assert.equal(html.includes(`/api/gnr8/runtime/versions/${IMPROVED_CANDIDATE_VERSION_ID}/preview?mode=transformed`), true);
});

test("single-site studio keeps diagnostics out of the product surface", () => {
  const html = renderToStaticMarkup(<SingleSiteStudio model={studioModel()} />);

  assert.equal(html.includes("Export-safe JSON"), false);
  assert.equal(html.includes("runbookEntries"), false);
  assert.equal(html.includes("MVP Acceptance Evidence"), false);
  assert.equal(html.includes("diagnosticSnapshot"), false);
  assert.equal(html.includes("audit timeline"), false);
});

test("single-site studio route and layout are superadmin-gated", async () => {
  const [pageSource, routeLayoutSource] = await Promise.all([readFile(PAGE_FILE, "utf8"), readFile(LAYOUT_FILE, "utf8")]);

  assert.equal(pageSource.includes("requireSuperadminUserIdForPage()"), true);
  assert.equal(routeLayoutSource.includes("requireSuperadminUserIdForPage()"), true);
  assert.equal(routeLayoutSource.includes('redirect("/login")'), true);
  assert.equal(routeLayoutSource.includes('redirect("/superadmin")'), true);
});

test("single-site studio is read-only and introduces no mutation action surface", async () => {
  const [pageSource, componentSource, projectionSource] = await Promise.all([
    readFile(PAGE_FILE, "utf8"),
    readFile(COMPONENT_FILE, "utf8"),
    readFile(PROJECTION_FILE, "utf8"),
  ]);
  const newSurface = `${pageSource}\n${componentSource}\n${projectionSource}`;

  assert.equal(newSurface.includes("withReadOnlyTransaction"), true);
  assert.equal(newSurface.includes("mutatesProductionData: false"), true);
  assert.equal(newSurface.includes("imports: false"), true);
  assert.equal(newSurface.includes("publishes: false"), true);
  assert.equal(newSurface.includes("fetch("), false);
  assert.equal(newSurface.includes('method="post"'), false);
  assert.equal(newSurface.includes("runBulkMigrationActions"), false);
  assert.equal(newSurface.includes("shadowPublish"), false);
  assert.equal(newSurface.includes("dry-run"), false);
  assert.equal(newSurface.includes("rollback"), false);
});

test("single-site studio is wired as the primary single-site Command Center route", async () => {
  const source = await readFile(COMMAND_CENTER_LAYOUT_FILE, "utf8");

  assert.equal(source.includes('"single-site-studio"'), true);
  assert.equal(source.includes("/gnr8/command-center/single-site-studio?migrationId=682a09fd-8fd5-4f73-93b8-54f5d4067c63"), true);
  assert.equal(source.includes("/gnr8/command-center/single-site-publish"), true);
  assert.equal(source.indexOf('"single-site-studio"') < source.indexOf('"single-site-publish"'), true);
});
