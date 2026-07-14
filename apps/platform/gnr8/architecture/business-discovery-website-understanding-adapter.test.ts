import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBusinessDiscoveryInputFromWebsiteUnderstanding,
  buildShadowBusinessDiscoveryFromWebsiteUnderstanding,
} from "./business-discovery-website-understanding-adapter";
import type { SourceWebsiteUnderstandingProjection } from "./source-website-understanding-projection-contract";

const GENERATED_AT = "2026-07-14T00:00:00.000Z";

function confidence(level: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM") {
  return { level, reasons: [`${level.toLowerCase()}_fixture`] };
}

function projection(input: { sourceSiteId?: string | null } = {}): SourceWebsiteUnderstandingProjection {
  const sourceSiteId = input.sourceSiteId === undefined ? "source-site-shadow" : input.sourceSiteId;
  const siteVersionId = "site-version-shadow";
  const dryRunId = "dry-run-shadow";
  const sourceUrl = "https://shadow.example/";
  const sourceArtifactRefs = [{ kind: "raw_imported_site", artifactId: "raw-shadow", canonicalId: "raw-shadow", source: "raw_artifact" as const }];
  const evidenceArtifactRefs = [{ kind: "evidence_capture_baseline", artifactId: "capture-shadow", canonicalId: "raw-shadow", source: "evidence_capture" as const }];
  const candidateArtifactRefs = [{ kind: "candidate_discovery_result", artifactId: "candidate-shadow", canonicalId: "candidate-shadow-result", source: "candidate_discovery" as const }];
  return {
    projectionId: "source_website_understanding_shadow_fixture",
    contractVersion: "WU-2",
    generatedAt: GENERATED_AT,
    siteVersionId,
    sourceSiteId,
    dryRunId,
    connectorType: "rendered_browser",
    sourceIdentity: {
      siteVersionId,
      sourceSiteId,
      dryRunId,
      sourceUrl,
      finalUrl: sourceUrl,
      hostname: "shadow.example",
      connectorType: "rendered_browser",
      importIdentity: "raw-shadow",
      importedAt: GENERATED_AT,
      captureCompletedAt: GENERATED_AT,
      sourceAvailability: "available",
      languageSignals: [],
      evidenceRefs: ["raw-imported-site:source-url"],
    },
    sourceArtifactRefs,
    evidenceArtifactRefs,
    candidateArtifactRefs,
    reviewArtifactRefs: [],
    reconstructionArtifactRefs: [],
    planningContextArtifactRefs: [],
    pages: [],
    routes: [{
      routeId: "route:/",
      routePath: "/",
      sourceUrl,
      title: "Shadow",
      purposeCandidate: null,
      state: "structured",
      reviewState: "not_applicable",
      confidence: confidence("HIGH"),
      evidenceRefs: ["route:/"],
      limitations: [],
    }],
    navigation: [{
      navigationId: "nav:contact",
      routePath: "/",
      label: "Contact",
      href: "/contact",
      navigationKind: "contact",
      state: "structured",
      reviewState: "not_applicable",
      confidence: confidence("HIGH"),
      evidenceRefs: ["nav:contact"],
      sourceCandidateId: null,
    }],
    sections: [{
      sectionId: "section:hero",
      routePath: "/",
      order: 0,
      heading: "Hero",
      semanticType: "hero",
      observedBoundary: true,
      plannedOnly: false,
      state: "structured",
      reviewState: "not_applicable",
      confidence: confidence("HIGH"),
      evidenceRefs: ["section:hero"],
      sourceCandidateId: null,
      limitations: [],
    }],
    content: [],
    assets: [{
      assetId: "asset:logo",
      path: "assets/logo.png",
      filename: "logo.png",
      mediaType: "image/png",
      sizeBytes: 100,
      sha256: "logo",
      assetKind: "image",
      dimensions: null,
      usages: [],
      altText: "Logo",
      repeatedUsageCount: 1,
      inventoryState: "observed",
      evidenceState: "structured",
      candidateMeaningState: "candidate",
      candidateMeaning: "logo_candidate",
      reviewState: "not_applicable",
      previewHref: null,
      confidence: confidence("MEDIUM"),
      evidenceRefs: ["asset:logo"],
      limitations: [],
    }],
    visualIdentitySignals: { logoCandidates: [], colorSignals: [], typographySignals: [], iconStyleSignals: [], imageStyleSignals: [], unresolvedSignals: [], limitations: [] },
    businessSignalCandidates: { offerings: [], audiences: [], trust: [], goals: [], identity: [], differentiators: [], geography: [], languages: [], unresolvedEvidence: [], limitations: [] },
    technicalSignals: { title: "Shadow", meta: {}, canonicalUrl: sourceUrl, headingStructure: [], structuredDataAvailable: false, robotsEvidence: [], sitemapEvidence: [], languageMetadata: [], accessibilityObservations: [], externalScripts: [], technologyHints: [], widgets: [], socialMetadata: [], confidence: confidence(), evidenceRefs: [] },
    readiness: { status: sourceSiteId ? "ready_for_business_discovery" : "blocked", conservativeBusinessDiscoveryCanProceed: Boolean(sourceSiteId), summary: "Fixture.", dimensions: [], blockers: [] },
    confidence: confidence(),
    limitations: [
      { limitationId: "limitation:baseline", severity: "warning", code: "UPSTREAM_EVIDENCE_LIMITATION", message: "missing_computed_styles", sourceRefs: ["evidence:capture-baseline:/"], originalCode: "baseline_limitation", state: "observed", diagnostics: ["baseline_index:0"] },
      { limitationId: "limitation:fidelity", severity: "warning", code: "UPSTREAM_FIDELITY_LIMITATION", message: "Rendered DOM fidelity is partial.", sourceRefs: ["rendered-dom"], originalCode: "rendered_dom_partial", state: "observed", diagnostics: ["rendered_dom_partial", "evidence_capture", "manual_review", "fidelity_index:0"] },
    ],
    diagnostics: [{ code: "IMPORT_DIAGNOSTIC_FIXTURE", message: "Fixture diagnostic.", sourceRefs: ["runtime-import-provenance"] }],
    lineage: {
      siteVersionId,
      sourceSiteId,
      dryRunId,
      contractVersion: "WU-2",
      sourceArtifactRefs,
      evidenceArtifactRefs,
      candidateArtifactRefs,
      reviewArtifactRefs: [],
      reconstructionArtifactRefs: [],
      planningContextArtifactRefs: [],
      deterministicInputs: { siteVersionId, sourceSiteId, dryRunId, contractVersion: "WU-2", artifactIds: ["candidate-shadow", "capture-shadow", "raw-shadow"] },
    },
  };
}

test("adapter maps Website Understanding into current Business Discovery input shape", () => {
  const result = buildBusinessDiscoveryInputFromWebsiteUnderstanding(projection());

  assert.equal(result.status, "ready");
  assert.equal(result.status === "ready" && result.input.sourceSiteId, "source-site-shadow");
  assert.equal(result.status === "ready" && result.input.evidenceCaptureBaseline?.limitations?.[0], "missing_computed_styles");
  assert.equal(result.status === "ready" && result.input.evidenceCaptureBaseline?.fidelityLimitations?.[0]?.explanation, "Rendered DOM fidelity is partial.");
  assert.equal(result.status === "ready" && result.input.navigationEvidence, undefined);
});

test("adapter fails closed when sourceSiteId is unavailable", () => {
  const result = buildBusinessDiscoveryInputFromWebsiteUnderstanding(projection({ sourceSiteId: null }));

  assert.equal(result.status, "blocked");
  assert.equal(result.status === "blocked" && result.blockers.some((item) => item.code === "SOURCE_SITE_ID_MISSING"), true);
});

test("shadow Business Discovery rebuild is deterministic and in memory only", () => {
  const first = buildShadowBusinessDiscoveryFromWebsiteUnderstanding(projection());
  const second = buildShadowBusinessDiscoveryFromWebsiteUnderstanding(projection());

  assert.equal(first.status, "built");
  assert.equal(second.status, "built");
  assert.equal(first.status === "built" && second.status === "built" && first.shadowArtifactId, second.status === "built" ? second.shadowArtifactId : "");
  assert.equal(first.status === "built" && first.artifact.sourceSiteId, "source-site-shadow");
  assert.equal(first.status === "built" && first.artifact.limitations.some((item) => item.message === "missing_computed_styles"), true);
});

test("adapter source has no persistence, raw artifact loader, or downstream contamination imports", () => {
  const source = readFileSync(new URL("./business-discovery-website-understanding-adapter.ts", import.meta.url), "utf8");

  assert.equal(source.includes("business-discovery-persistence"), false);
  assert.equal(source.includes("runtime-store"), false);
  assert.equal(source.includes("digital-business-twin"), false);
  assert.equal(source.includes("website-generation-package"), false);
});
