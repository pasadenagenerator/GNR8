import assert from "node:assert/strict";
import test from "node:test";

import type { CanonicalPageVersionInput, CanonicalSiteVersionSnapshot, RenderMode, RuntimeArtifact, RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  AIRSHIP_SINGLE_SITE_DRAFT_CANDIDATE_SERVICE_VERSION,
  createAirshipSingleSiteDraftCandidate,
} from "./airship-single-site-draft-candidate-service";
import type { AirshipSingleSiteDraftRecord } from "./airship-single-site-draft-service";

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const DRAFT_ID = "f9b31666-b3b0-4455-8650-4a8c7304a559";
const LIVE_VERSION_ID = "a3f9493e-9da4-4ef8-8608-154fe6d25a0f";
const LIVE_ARTIFACT_ID = "1f80138a-39c2-4210-ac61-16200e5a2254";
const TARGET_VERSION_ID = "2d33f386-7cd3-4bbf-a9d4-f1c134c5dce7";
const TARGET_ARTIFACT_ID = "4ec7588a-b7cb-46dc-a735-88e4ec466a72";

function savedDraft(): AirshipSingleSiteDraftRecord {
  return {
    id: DRAFT_ID,
    migrationId: MIGRATION_ID,
    tenantId: "tenant-chs",
    clientId: "client-chs",
    siteId: "site-chs",
    agencyId: null,
    sourceUrl: "https://www.chs.si/",
    targetSiteVersionRefs: {
      originalCloneSiteVersionId: "6b172a5b-200e-471c-9599-5dc70f04ea53",
      originalCloneRuntimeArtifactId: "929106cd-fa19-47eb-9582-ce6931d0e370",
      improvedCandidateSiteVersionId: LIVE_VERSION_ID,
      improvedCandidateRuntimeArtifactId: LIVE_ARTIFACT_ID,
    },
    draftEdits: [
      {
        id: "airship-chs-home-hero-headline",
        targetSectionPage: "Homepage / hero headline",
        currentTextContentSummary: "Existing CHS headline.",
        proposedTextContent: "CHS helps modernize secure enterprise IT",
        reasonForChange: "Accepted operator edit.",
        status: "accepted",
        previewImpact: "Headline appears in internal preview only.",
      },
      {
        id: "airship-chs-home-hero-value-proposition",
        targetSectionPage: "Homepage / hero subheading",
        currentTextContentSummary: "Existing CHS subheading.",
        proposedTextContent: "Cybersecurity, data systems, and hybrid infrastructure support for teams across the Adriatic region.",
        reasonForChange: "Saved operator edit.",
        status: "edited",
        previewImpact: "Subheading appears in internal preview only.",
      },
      {
        id: "airship-chs-home-contact-cta",
        targetSectionPage: "Homepage / contact call-to-action",
        currentTextContentSummary: "Existing CHS contact action.",
        proposedTextContent: "Contact CHS at sales@chs.si",
        reasonForChange: "Rejected operator edit.",
        status: "rejected",
        previewImpact: "CTA remains unapplied.",
      },
    ],
    draftStatus: "mixed",
    version: 5,
    semanticWatermark: "airship-single-site-editor-draft:test",
    metadata: { liveBoundary: "not_applied_to_live_site" },
    createdByActorId: "superadmin",
    updatedByActorId: "superadmin",
    acceptedAt: null,
    rejectedAt: null,
    createdAt: "2026-09-02T00:00:00.000Z",
    updatedAt: "2026-09-02T00:05:00.000Z",
  };
}

function liveVersion(): CanonicalSiteVersionSnapshot {
  return {
    id: LIVE_VERSION_ID,
    siteId: "runtime-chs",
    versionNo: 9,
    state: "PUBLISHED",
    source: "manual",
    actor: "publish-operator",
    createdAt: "2026-09-01T00:00:00.000Z",
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    artifactId: LIVE_ARTIFACT_ID,
    importProvenanceSummary: {
      kind: "runtime_import_provenance_summary_v1",
      sourceMode: "rendered_dom",
      importFidelityStatus: "high_fidelity_import",
      renderedCaptureStatus: "available",
      renderedDomQuality: "strong",
      screenshotCount: 1,
      computedStyleSampleCount: 1,
      renderedCapture: { used: true, status: "available", quality: "strong", domLength: 100, nodeCount: 10, styleSampleCount: 1, styleCoverage: 1 },
    } as RuntimeImportProvenanceSummary,
    pages: [
      {
        id: "page-version-live",
        siteVersionId: LIVE_VERSION_ID,
        pageId: "page-home",
        path: "/",
        title: "CHS Home",
        structureModel: { sections: [{ id: "hero", type: "hero.basic", order: 0 }] },
        contentModel: {
          sectionProps: {
            hero: {
              headline: "Less risk. More control. Better IT.",
              subheading: "Advanced cybersecurity, data systems, and hybrid infrastructure solutions across the Adriatic region.",
              cta: "Contact us",
            },
          },
        },
        styleTokens: { "color.background": "#ffffff", "color.text": "#111111" },
        assetGraph: [],
        semanticSignals: [{ label: "live.published", confidence: 1, source: "manual" }],
        migrationGovernance: null,
        source: "manual",
        actor: "publish-operator",
        createdAt: "2026-09-01T00:00:00.000Z",
      },
    ],
  };
}

function liveArtifact(): RuntimeArtifact {
  return {
    id: LIVE_ARTIFACT_ID,
    siteId: "runtime-chs",
    siteVersionId: LIVE_VERSION_ID,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    bundleSha256: "live-bundle",
    htmlByPath: { "/": "<html><body>live CHS</body></html>" },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: { sourceKind: "published_chs" },
    publishStage: "production",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: ["PUBLISHED"],
      pageRolloutPolicyState: ["PUBLISHED"],
      pageEnforcementState: { shadow: ["ALLOW"], canary: ["ALLOW"], production: ["ALLOW"] },
      siteGateState: "PUBLISHED",
      siteRolloutPolicyState: "PUBLISHED",
      siteEnforcementState: { shadow: "ALLOW", canary: "ALLOW", production: "ALLOW" },
      publishStage: "production",
    },
    createdAt: "2026-09-01T00:00:00.000Z",
  };
}

function fakeDeps() {
  const calls: string[] = [];
  const activePointer = { siteVersionId: LIVE_VERSION_ID, artifactId: LIVE_ARTIFACT_ID };
  const versions = new Map<string, CanonicalSiteVersionSnapshot>([[LIVE_VERSION_ID, liveVersion()]]);
  const artifacts = new Map<string, RuntimeArtifact>([[LIVE_ARTIFACT_ID, liveArtifact()]]);
  const artifactBySiteVersion = new Map<string, string>([[LIVE_VERSION_ID, LIVE_ARTIFACT_ID]]);

  return {
    calls,
    versions,
    artifacts,
    getSiteVersion: async (siteVersionId: string) => {
      calls.push(`getSiteVersion:${siteVersionId}`);
      return versions.get(siteVersionId) ?? null;
    },
    getArtifactById: async (artifactId: string) => {
      calls.push(`getArtifactById:${artifactId}`);
      return artifacts.get(artifactId) ?? null;
    },
    getActivePointerForSite: async (siteId: string) => {
      calls.push(`getActivePointerForSite:${siteId}`);
      return activePointer;
    },
    createSiteVersionFromMigration: async (input: {
      siteId: string;
      sourceUrl: string;
      actor: string;
      rendererCompatibilityVersion: string;
      importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
      pages: CanonicalPageVersionInput[];
      siteVersionId?: string;
    }) => {
      calls.push("createSiteVersionFromMigration");
      const id = input.siteVersionId ?? TARGET_VERSION_ID;
      versions.set(id, {
        ...liveVersion(),
        id,
        siteId: input.siteId,
        versionNo: 10,
        state: "DRAFT",
        source: "manual",
        actor: input.actor,
        rendererCompatibilityVersion: input.rendererCompatibilityVersion,
        artifactId: null,
        importProvenanceSummary: input.importProvenanceSummary,
        pages: input.pages.map((page, index) => ({
          ...page,
          id: `candidate-page-version-${index}`,
          siteVersionId: id,
          createdAt: "2026-09-02T00:06:00.000Z",
        })),
      });
      return { siteId: input.siteId, siteVersionId: id, versionNo: 10 };
    },
    buildDeterministicArtifactBundle: (input: { siteVersion: CanonicalSiteVersionSnapshot; renderMode: RenderMode }) => {
      calls.push("buildDeterministicArtifactBundle");
      const props = input.siteVersion.pages[0]?.contentModel.sectionProps.hero as Record<string, unknown>;
      const html = `<html><body><h1>${String(props.headline ?? "")}</h1><p>${String(props.subheading ?? "")}</p><span>${String(props.cta ?? "")}</span></body></html>`;
      return {
        siteId: input.siteVersion.siteId,
        siteVersionId: input.siteVersion.id,
        rendererCompatibilityVersion: input.siteVersion.rendererCompatibilityVersion,
        bundleSha256: `bundle-${input.siteVersion.id}`,
        htmlByPath: { "/": html },
        compiledTokenStyles: "",
        assetFingerprintMap: {},
        manifest: { renderMode: input.renderMode, html },
      };
    },
    createArtifact: async (input: {
      siteId: string;
      siteVersionId: string;
      rendererCompatibilityVersion: string;
      bundleSha256: string;
      htmlByPath: Record<string, string>;
      compiledTokenStyles: string;
      assetFingerprintMap: Record<string, string>;
      manifest: Record<string, unknown>;
      publishStage: RuntimeArtifact["publishStage"];
      shadowRestricted: boolean;
      artifactGovernance: RuntimeArtifact["artifactGovernance"];
    }) => {
      calls.push("createArtifact");
      const existingId = artifactBySiteVersion.get(input.siteVersionId);
      if (existingId) return { artifactId: existingId };
      artifacts.set(TARGET_ARTIFACT_ID, {
        id: TARGET_ARTIFACT_ID,
        siteId: input.siteId,
        siteVersionId: input.siteVersionId,
        rendererCompatibilityVersion: input.rendererCompatibilityVersion,
        bundleSha256: input.bundleSha256,
        htmlByPath: input.htmlByPath,
        compiledTokenStyles: input.compiledTokenStyles,
        assetFingerprintMap: input.assetFingerprintMap,
        manifest: input.manifest,
        publishStage: input.publishStage,
        shadowRestricted: input.shadowRestricted,
        artifactGovernance: input.artifactGovernance,
        createdAt: "2026-09-02T00:07:00.000Z",
      });
      artifactBySiteVersion.set(input.siteVersionId, TARGET_ARTIFACT_ID);
      return { artifactId: TARGET_ARTIFACT_ID };
    },
    bindArtifactToVersion: async (input: { siteVersionId: string; artifactId: string }) => {
      calls.push("bindArtifactToVersion");
      const version = versions.get(input.siteVersionId);
      assert.ok(version);
      versions.set(input.siteVersionId, { ...version, artifactId: input.artifactId });
      return { affectedRows: 1 };
    },
  };
}

test("creates an internal Airship draft candidate from live/published version and saved edits", async () => {
  const deps = fakeDeps();
  const output = await createAirshipSingleSiteDraftCandidate(
    {
      draft: savedDraft(),
      actor: "superadmin",
      targetCandidateSiteVersionId: TARGET_VERSION_ID,
    },
    deps,
  );

  assert.equal(output.status, "created");
  assert.equal(output.serviceVersion, AIRSHIP_SINGLE_SITE_DRAFT_CANDIDATE_SERVICE_VERSION);
  assert.equal(output.sourceLiveSiteVersionId, LIVE_VERSION_ID);
  assert.equal(output.sourceLiveRuntimeArtifactId, LIVE_ARTIFACT_ID);
  assert.equal(output.candidateSiteVersionId, TARGET_VERSION_ID);
  assert.equal(output.candidateRuntimeArtifactId, TARGET_ARTIFACT_ID);
  assert.equal(output.previewRoute, `/api/gnr8/admin/single-site-studio/versions/${TARGET_VERSION_ID}/preview?mode=transformed`);
  assert.deepEqual(output.activePointerBefore, { siteVersionId: LIVE_VERSION_ID, artifactId: LIVE_ARTIFACT_ID });
  assert.deepEqual(output.activePointerAfter, { siteVersionId: LIVE_VERSION_ID, artifactId: LIVE_ARTIFACT_ID });
  assert.equal(output.activePointerChanged, false);
  assert.equal(output.published, false);

  const candidate = deps.versions.get(TARGET_VERSION_ID);
  assert.equal(candidate?.state, "DRAFT");
  assert.equal(candidate?.artifactId, TARGET_ARTIFACT_ID);
  assert.equal(candidate?.pages[0]?.contentModel.sectionProps.hero?.headline, "CHS helps modernize secure enterprise IT");
  assert.equal(
    candidate?.pages[0]?.contentModel.sectionProps.hero?.subheading,
    "Cybersecurity, data systems, and hybrid infrastructure support for teams across the Adriatic region.",
  );
  assert.equal(candidate?.pages[0]?.contentModel.sectionProps.hero?.cta, "Contact us");
  assert.equal(deps.versions.get(LIVE_VERSION_ID)?.pages[0]?.contentModel.sectionProps.hero?.headline, "Less risk. More control. Better IT.");

  const artifact = deps.artifacts.get(TARGET_ARTIFACT_ID);
  assert.equal(artifact?.publishStage, "shadow");
  assert.equal(artifact?.artifactGovernance.siteGateState, "AIRSHIP_DRAFT_CANDIDATE_INTERNAL_PREVIEW_ONLY");
  assert.match(artifact?.htmlByPath["/"] ?? "", /CHS helps modernize secure enterprise IT/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /Cybersecurity, data systems, and hybrid infrastructure support for teams across the Adriatic region\./);
  assert.doesNotMatch(artifact?.htmlByPath["/"] ?? "", /Contact CHS at sales@chs\.si/);
  assert.equal((artifact?.manifest.airshipSingleSiteDraftCandidate as { published?: boolean } | undefined)?.published, false);
  assert.deepEqual([...new Set(deps.calls.map((call) => call.split(":")[0]))].sort(), [
    "bindArtifactToVersion",
    "buildDeterministicArtifactBundle",
    "createArtifact",
    "createSiteVersionFromMigration",
    "getActivePointerForSite",
    "getArtifactById",
    "getSiteVersion",
  ]);
});

test("reuses an existing matching Airship draft candidate and keeps active pointer unchanged", async () => {
  const deps = fakeDeps();
  const first = await createAirshipSingleSiteDraftCandidate(
    { draft: savedDraft(), actor: "superadmin", targetCandidateSiteVersionId: TARGET_VERSION_ID },
    deps,
  );
  const second = await createAirshipSingleSiteDraftCandidate(
    { draft: savedDraft(), actor: "superadmin", targetCandidateSiteVersionId: TARGET_VERSION_ID },
    deps,
  );

  assert.equal(second.status, "reused");
  assert.equal(second.candidateSiteVersionId, first.candidateSiteVersionId);
  assert.equal(second.candidateRuntimeArtifactId, first.candidateRuntimeArtifactId);
  assert.equal(second.activePointerChanged, false);
  assert.equal(deps.calls.filter((call) => call === "createSiteVersionFromMigration").length, 1);
});
