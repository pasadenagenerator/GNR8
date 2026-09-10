import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import ReactDomServer from "react-dom/server";

import type { AirshipImportedSiteOnboardingProjection } from "@/gnr8/single-site/airship-imported-site-onboarding-projection";

import { AirshipImportedSiteOnboarding } from "./airship-imported-site-onboarding";

const { renderToStaticMarkup } = ReactDomServer;

const CHS_MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const PAGE_FILE = new URL("./page.tsx", import.meta.url);
const COMPONENT_FILE = new URL("./airship-imported-site-onboarding.tsx", import.meta.url);
const PROJECTION_FILE = new URL("../../../gnr8/single-site/airship-imported-site-onboarding-projection.ts", import.meta.url);
const COMMAND_CENTER_LAYOUT_FILE = new URL("../command-center/CommandCenterLayout.tsx", import.meta.url);
const COMMAND_CENTER_PAGE_FILE = new URL("../command-center/page.tsx", import.meta.url);

function onboardingModel(overrides: Partial<AirshipImportedSiteOnboardingProjection> = {}): AirshipImportedSiteOnboardingProjection {
  return {
    version: "airship-15-imported-site-onboarding:v1",
    generatedAt: "2026-09-10T00:00:00.000Z",
    state: "visible",
    items: [
      {
        migrationId: CHS_MIGRATION_ID,
        siteLabel: "chs.si",
        sourceUrl: "https://www.chs.si/",
        liveUrl: "https://www.chs.si/",
        importSourceEvidenceStatus: {
          label: "source supported",
          detail: "Internal single-site MVP accepted. 3 source evidence item(s) available for chs.si.",
          tone: "good",
        },
        latestAirshipDraftStatus: {
          label: "Saved draft draft",
          detail: "Draft draft-chs v2 last saved 2026-09-10T00:05:00.000Z. Not live. Not published.",
          tone: "good",
        },
        latestInternalPreviewCandidate: {
          label: "Not live, internal preview only",
          detail: "Draft candidate candidate-chs; artifact artifact-chs; draft draft-chs v2.",
          tone: "good",
          href: "/api/gnr8/admin/single-site-studio/versions/candidate-chs/preview?mode=transformed",
        },
        publishedLivePointerStatus: {
          label: "Live pointer present",
          detail: "Published/current candidate PUBLISHED; site version improved-chs; artifact artifact-improved-chs.",
          tone: "good",
          href: "https://www.chs.si/",
        },
        links: {
          overviewHref: `/gnr8/airship/single-site?migrationId=${CHS_MIGRATION_ID}`,
          editorHref: `/gnr8/airship/single-site/editor?migrationId=${CHS_MIGRATION_ID}`,
        },
      },
    ],
    emptyState: {
      title: "No imported sites available for Airship yet",
      detail: "Airship opens existing imported single-site migrations only.",
    },
    instrumentation: {
      repositoryReadStatus: "ok",
      discoveredMigrationIdCount: 1,
    },
    flags: {
      readOnly: true,
      mutatesProductionData: false,
      mutatesDraftData: false,
      imports: false,
      publishes: false,
      dryRuns: false,
      shadowPublishes: false,
      sourceCapture: false,
      activePointerMutation: false,
      providerCalls: false,
      liveSiteMutation: false,
    },
    ...overrides,
  };
}

test("Airship onboarding renders imported-site fields and overview/editor links", () => {
  const html = renderToStaticMarkup(<AirshipImportedSiteOnboarding model={onboardingModel()} />);

  assert.equal(html.includes("Imported site onboarding"), true);
  assert.equal(html.includes("chs.si"), true);
  assert.equal(html.includes("https://www.chs.si/"), true);
  assert.equal(html.includes(CHS_MIGRATION_ID), true);
  assert.equal(html.includes("source supported"), true);
  assert.equal(html.includes("Saved draft draft"), true);
  assert.equal(html.includes("Not live, internal preview only"), true);
  assert.equal(html.includes("Live pointer present"), true);
  assert.equal(html.includes(`/gnr8/airship/single-site?migrationId=${CHS_MIGRATION_ID}`), true);
  assert.equal(html.includes(`/gnr8/airship/single-site/editor?migrationId=${CHS_MIGRATION_ID}`), true);
});

test("Airship onboarding renders unavailable values for partial imported-site data", () => {
  const model = onboardingModel({
    items: [
      {
        ...onboardingModel().items[0]!,
        migrationId: "22222222-3333-4444-8555-666666666666",
        siteLabel: "partial.example",
        sourceUrl: null,
        liveUrl: null,
        importSourceEvidenceStatus: {
          label: "partial evidence",
          detail: "Only migration metadata is available.",
          tone: "warn",
        },
        latestAirshipDraftStatus: {
          label: "No saved Airship draft",
          detail: "No source-derived draft fields or saved Airship draft are available yet.",
          tone: "warn",
        },
        latestInternalPreviewCandidate: {
          label: "No Airship draft candidate",
          detail: "No Airship draft candidate preview or current improved internal preview is present.",
          tone: "warn",
          href: null,
        },
        publishedLivePointerStatus: {
          label: "Live pointer unknown",
          detail: "Published/current candidate unknown; site version unavailable.",
          tone: "warn",
          href: null,
        },
      },
    ],
  });
  const html = renderToStaticMarkup(<AirshipImportedSiteOnboarding model={model} />);

  assert.equal(html.includes("partial.example"), true);
  assert.equal(html.includes("partial evidence"), true);
  assert.equal(html.includes("No saved Airship draft"), true);
  assert.equal(html.includes("No Airship draft candidate"), true);
  assert.equal(html.match(/Unavailable/g)?.length, 2);
});

test("Airship onboarding renders an honest empty state", () => {
  const html = renderToStaticMarkup(<AirshipImportedSiteOnboarding model={onboardingModel({ state: "empty", items: [] })} />);

  assert.equal(html.includes("No imported sites available for Airship yet"), true);
  assert.equal(html.includes("Airship opens existing imported single-site migrations only"), true);
  assert.equal(html.includes("Open Airship editor"), false);
});

test("Airship onboarding route is superadmin-gated", async () => {
  const pageSource = await readFile(PAGE_FILE, "utf8");

  assert.equal(pageSource.includes("requireSuperadminUserIdForPage()"), true);
  assert.equal(pageSource.includes("getAirshipImportedSiteOnboardingProjection()"), true);
});

test("Airship onboarding is linked from Command Center", async () => {
  const [layoutSource, pageSource] = await Promise.all([
    readFile(COMMAND_CENTER_LAYOUT_FILE, "utf8"),
    readFile(COMMAND_CENTER_PAGE_FILE, "utf8"),
  ]);

  assert.equal(layoutSource.includes("/gnr8/airship"), true);
  assert.equal(layoutSource.includes("Airship Imported Sites"), true);
  assert.equal(pageSource.includes("Open Airship"), true);
  assert.equal(pageSource.includes("/gnr8/airship"), true);
});

test("Airship onboarding adds no publish, dry-run, shadow, rollback, source-capture, provider, or live-site control", async () => {
  const [pageSource, componentSource, projectionSource] = await Promise.all([
    readFile(PAGE_FILE, "utf8"),
    readFile(COMPONENT_FILE, "utf8"),
    readFile(PROJECTION_FILE, "utf8"),
  ]);
  const source = `${pageSource}\n${componentSource}\n${projectionSource}`;

  assert.equal(source.includes("fetch("), false);
  assert.equal(source.includes('method="post"'), false);
  assert.equal(source.includes("Publish candidate"), false);
  assert.equal(source.includes("Rollback"), false);
  assert.equal(source.includes("shadow-publish"), false);
  assert.equal(source.includes("dry-run\""), false);
  assert.equal(source.includes("source-capture"), false);
  assert.equal(source.includes("runBulkMigrationActions"), false);
  assert.equal(source.includes("providerCalls: false"), true);
  assert.equal(source.includes("liveSiteMutation: false"), true);
  assert.equal(source.includes("activePointerMutation: false"), true);
});
