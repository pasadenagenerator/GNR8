import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type {
  AstroProductionCandidateListReadModel,
} from "@/gnr8/output-adapters/astro-production-candidate-list-read-model";

import { AstroCandidateListPageView } from "./astro-candidates/[siteVersionId]/astro-candidate-list-components";
import { SupportingInspectionLinks } from "./workspace/[siteVersionId]/knowledge-workspace-components";

const SITE_VERSION_ID = "11111111-1111-4111-8111-111111111111";
const CANDIDATE_ID = "astro_candidate_33333333333343338333333333333333";

test("candidate list view renders exact top-level preview links only for eligible rows", () => {
  const html = renderToStaticMarkup(<AstroCandidateListPageView model={readyModel()} />);

  assert.match(html, new RegExp(`/api/gnr8/admin/astro-candidates/${SITE_VERSION_ID}/${CANDIDATE_ID}/preview\\?path=%2F`));
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.equal((html.match(/Open Astro candidate/g) ?? []).length, 1);
  assert.match(html, /Preview access is disabled for this candidate/);
  assert.match(html, /unsupported compatibility metadata/);
  assert.match(html, /revalidates the complete record/);
  assert.equal((html.match(/Materialize for governed workflow/g) ?? []).length, 1);
  assert.match(html, /does not publish, activate a pointer, or change a preview binding/i);
  assert.doesNotMatch(html, /iframe|Create candidate|Register candidate|Publish now/);
});

test("feature-disabled, empty, unavailable, access-denied, and invalid states are explicit", () => {
  const states: Array<[AstroProductionCandidateListReadModel, RegExp]> = [
    [{ state: "feature_disabled" }, /Astro candidate preview is disabled/],
    [{ state: "empty", siteVersionId: SITE_VERSION_ID, items: [], nextCursor: null }, /No Astro candidates/],
    [{ state: "unavailable", siteVersionId: SITE_VERSION_ID, message: "Candidate metadata is temporarily unavailable." }, /Candidate list unavailable/],
    [{ state: "access_denied", siteVersionId: SITE_VERSION_ID, message: "Candidate metadata is not available for this site version." }, /Candidate access denied/],
    [{ state: "invalid_request", siteVersionId: SITE_VERSION_ID, message: "The candidate list link is invalid." }, /Invalid candidate list link/],
  ];
  for (const [model, expected] of states) {
    assert.match(renderToStaticMarkup(<AstroCandidateListPageView model={model} />), expected);
  }
});

test("responsive metadata cards wrap long identifiers without a fixed-width table or page overflow", () => {
  const sourcePromise = readFile(new URL("./astro-candidates/[siteVersionId]/astro-candidate-list-components.tsx", import.meta.url), "utf8");
  const html = renderToStaticMarkup(<AstroCandidateListPageView model={readyModel()} />);
  assert.match(html, /overflow-wrap:anywhere/);
  assert.match(html, /min\(100%, 220px\)/);
  assert.doesNotMatch(html, /<table/);
  return sourcePromise.then((source) => {
    assert.doesNotMatch(source, /minWidth:\s*["']?[1-9][0-9]{3}/);
    assert.doesNotMatch(source, /overflowX:\s*["']scroll/);
  });
});

test("mounted page is force-dynamic, private, and redirects auth failures using existing conventions", async () => {
  const source = await readFile(new URL("./astro-candidates/[siteVersionId]/page.tsx", import.meta.url), "utf8");
  assert.match(source, /runtime = "nodejs"/);
  assert.match(source, /dynamic = "force-dynamic"/);
  assert.match(source, /revalidate = 0/);
  assert.match(source, /fetchCache = "force-no-store"/);
  assert.match(source, /createAstroProductionCandidateListPageLoader/);
  assert.match(source, /redirect\("\/login"\)/);
  assert.match(source, /redirect\("\/superadmin"\)/);
  assert.doesNotMatch(source, /generateStaticParams|unstable_cache|revalidateTag/);
});

test("Workspace shows exactly one Astro supporting link only when the shared gate is enabled", () => {
  const steps = [{
    label: "Existing inspection",
    summary: "Existing supporting page.",
    href: `/gnr8/admin/existing/${SITE_VERSION_ID}`,
  }];
  const disabled = renderToStaticMarkup(
    <SupportingInspectionLinks
      steps={steps}
      siteVersionId={SITE_VERSION_ID}
      astroCandidatePreviewEnabled={false}
    />,
  );
  const enabled = renderToStaticMarkup(
    <SupportingInspectionLinks
      steps={steps}
      siteVersionId={SITE_VERSION_ID}
      astroCandidatePreviewEnabled
    />,
  );

  assert.doesNotMatch(disabled, /Astro Candidates|\/gnr8\/admin\/astro-candidates\//);
  assert.equal((enabled.match(/Astro Candidates/g) ?? []).length, 1);
  assert.match(enabled, new RegExp(`/gnr8/admin/astro-candidates/${SITE_VERSION_ID}`));
});

function readyModel(): AstroProductionCandidateListReadModel {
  const base = {
    siteVersionId: SITE_VERSION_ID,
    candidateCreatedAt: "2026-09-28T12:00:00.000Z",
    storedAt: "2026-09-28T12:01:00.000Z",
    producerKind: "internal_synthetic_astro_build_export_bridge",
    producerVersion: "v1",
    producerRef: "synthetic:long-operational-reference-that-must-wrap-cleanly-on-mobile",
    schemaVersion: "gnr8-astro-persisted-preview-candidate:v2",
    recordKind: "astro_internal_preview_candidate_record",
    adapterId: "astro-static-site",
    conversionVersion: "gnr8-astro-internal-preview-conversion:v1",
    exportManifestVersion: "gnr8-astro-static-export:v1",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    contentSha256: "a".repeat(64),
    storageSha256: "b".repeat(64),
    contentSha256Prefix: "aaaaaaaaaaaa…",
    storageSha256Prefix: "bbbbbbbbbbbb…",
    payloadSizeBytes: 12345,
    accessReasonCode: "candidate_registered",
  } as const;
  return {
    state: "ready",
    siteVersionId: SITE_VERSION_ID,
    items: [
      {
        ...base,
        candidateId: CANDIDATE_ID,
        accessState: "enabled",
        compatibilityState: "supported",
        previewHref: `/api/gnr8/admin/astro-candidates/${SITE_VERSION_ID}/${CANDIDATE_ID}/preview?path=%2F`,
      },
      {
        ...base,
        candidateId: "astro_candidate_44444444444444448444444444444444",
        accessState: "disabled",
        accessReasonCode: "operator_disabled",
        compatibilityState: "supported",
        previewHref: null,
      },
      {
        ...base,
        candidateId: "astro_candidate_55555555555545558555555555555555",
        accessState: "enabled",
        compatibilityState: "unsupported",
        schemaVersion: "future-version",
        previewHref: null,
      },
    ],
    nextCursor: "safe-next-cursor",
  };
}
