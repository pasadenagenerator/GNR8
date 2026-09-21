import assert from "node:assert/strict";
import test from "node:test";

import type { CanonicalPageVersionInput, CanonicalSiteVersionSnapshot, RenderMode, RuntimeArtifact, RuntimeImportProvenanceSummary } from "../runtime/types";
import {
  AIRSHIP_SINGLE_SITE_DRAFT_CANDIDATE_SERVICE_VERSION,
  createAirshipSingleSiteDraftCandidate,
} from "./airship-single-site-draft-candidate-service";
import type { AirshipSingleSiteDraftRecord } from "./airship-single-site-draft-service";
import {
  AIRSHIP_ARIS_INITIAL_RUNTIME_SITE_VERSION_ID,
  AIRSHIP_ARIS_MIGRATION_ID,
  AIRSHIP_ARIS_RUNTIME_ARTIFACT_ID,
  AIRSHIP_ARIS_RUNTIME_SITE_ID,
  buildArisAirshipMvpDraftSeed,
} from "./airship-aris-mvp-draft";

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
    metadata: {
      liveBoundary: "not_applied_to_live_site",
      styleSettings: {
        heroTopPadding: 96,
        heroBottomPadding: 104,
        backgroundTint: "#eef6ff",
        ctaColor: "#1d4ed8",
      },
    },
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
  const createSiteVersionInputs: Array<{
    sourceUrl: string;
    createSourceHostBinding?: boolean;
    pages: CanonicalPageVersionInput[];
  }> = [];

  return {
    calls,
    versions,
    artifacts,
    createSiteVersionInputs,
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
      createSourceHostBinding?: boolean;
    }) => {
      calls.push("createSiteVersionFromMigration");
      createSiteVersionInputs.push({
        sourceUrl: input.sourceUrl,
        createSourceHostBinding: input.createSourceHostBinding,
        pages: input.pages,
      });
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
      const sectionProps = input.siteVersion.pages[0]?.contentModel.sectionProps ?? {};
      const firstSectionId = Object.keys(sectionProps)[0] ?? "hero";
      const props = (sectionProps.hero ?? sectionProps[firstSectionId] ?? {}) as Record<string, unknown>;
      const style = props.airshipDraftStyleOverride as Record<string, unknown> | undefined;
      const draftSections = Array.isArray(props.airshipDraftSections) ? props.airshipDraftSections as Array<Record<string, unknown>> : [];
      const sectionHtml = draftSections.map((section) => {
        const key = String(section.key ?? "");
        const element =
          key === "offers" ? "offer-card" :
          key === "proof" ? "proof-card" :
          key === "approach" ? "approach-card" :
          "";
        const cta = key === "cta" && section.ctaLabel
          ? `<a href="#contact" data-airship-element="contact-cta">${String(section.ctaLabel)}</a>`
          : "";
        const body = key === "cta"
          ? `<div data-airship-element="contact-card"><p>${String(section.body ?? "")}</p></div>`
          : `<p>${String(section.body ?? "")}</p>`;
        return `<section data-airship-section="${key}"><h2>${String(section.heading ?? "")}</h2>${body}${element ? `<div data-airship-element="${element}">${String(section.body ?? "")}</div>` : ""}${cta}</section>`;
      }).join("");
      const html = `<html><body style="background:${String(style?.backgroundTint ?? "")}"><section data-airship-section="hero"><h1 data-airship-element="hero-headline">${String(props.headline ?? "")}</h1><p>${String(props.subheading ?? "")}</p><a href="#contact" data-airship-element="hero-cta" style="background:${String(style?.ctaColor ?? "")}">${String(props.cta ?? props.ctaLabel ?? "")}</a></section>${sectionHtml}<script type="application/json">${JSON.stringify(props)}</script></body></html>`;
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
    refreshArtifactForVersionPublishCandidate: async (input: {
      siteId: string;
      siteVersionId: string;
      artifactId: string;
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
      calls.push("refreshArtifactForVersionPublishCandidate");
      const current = artifacts.get(input.artifactId);
      assert.ok(current);
      assert.equal(current.siteId, input.siteId);
      assert.equal(current.siteVersionId, input.siteVersionId);
      artifacts.set(input.artifactId, {
        ...current,
        rendererCompatibilityVersion: input.rendererCompatibilityVersion,
        bundleSha256: input.bundleSha256,
        htmlByPath: input.htmlByPath,
        compiledTokenStyles: input.compiledTokenStyles,
        assetFingerprintMap: input.assetFingerprintMap,
        manifest: input.manifest,
        publishStage: input.publishStage,
        shadowRestricted: input.shadowRestricted,
        artifactGovernance: input.artifactGovernance,
      });
      return { affectedRows: 1 };
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
  assert.deepEqual(candidate?.pages[0]?.contentModel.sectionProps.hero?.airshipDraftStyleOverride, {
    heroTopPadding: 96,
    heroBottomPadding: 104,
    backgroundTint: "#eef6ff",
    ctaColor: "#1d4ed8",
  });
  assert.equal(candidate?.pages[0]?.styleTokens["airship.hero.paddingTop"], "96px");
  assert.equal(candidate?.pages[0]?.styleTokens["airship.hero.paddingBottom"], "104px");
  assert.equal(candidate?.pages[0]?.styleTokens["airship.hero.backgroundTint"], "#eef6ff");
  assert.equal(candidate?.pages[0]?.styleTokens["airship.cta.color"], "#1d4ed8");
  assert.equal(candidate?.pages[0]?.contentModel.sectionProps.hero?.cta, "Contact us");
  assert.equal(deps.versions.get(LIVE_VERSION_ID)?.pages[0]?.contentModel.sectionProps.hero?.headline, "Less risk. More control. Better IT.");

  const artifact = deps.artifacts.get(TARGET_ARTIFACT_ID);
  assert.equal(artifact?.publishStage, "shadow");
  assert.equal(artifact?.artifactGovernance.siteGateState, "AIRSHIP_DRAFT_CANDIDATE_INTERNAL_PREVIEW_ONLY");
  assert.match(artifact?.htmlByPath["/"] ?? "", /CHS helps modernize secure enterprise IT/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /Cybersecurity, data systems, and hybrid infrastructure support for teams across the Adriatic region\./);
  assert.match(artifact?.htmlByPath["/"] ?? "", /background:#eef6ff/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /background:#1d4ed8/);
  assert.doesNotMatch(artifact?.htmlByPath["/"] ?? "", /Contact CHS at sales@chs\.si/);
  assert.equal((artifact?.manifest.airshipSingleSiteDraftCandidate as { published?: boolean } | undefined)?.published, false);
  assert.deepEqual(output.styleSettings, {
    heroTopPadding: 96,
    heroBottomPadding: 104,
    backgroundTint: "#eef6ff",
    ctaColor: "#1d4ed8",
  });
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

test("fails closed when generated Airship candidate artifact HTML is diagnostic fallback", async () => {
  const deps = fakeDeps();
  deps.buildDeterministicArtifactBundle = (input: { siteVersion: CanonicalSiteVersionSnapshot; renderMode: RenderMode }) => {
    deps.calls.push("buildDeterministicArtifactBundle");
    return {
      siteId: input.siteVersion.siteId,
      siteVersionId: input.siteVersion.id,
      rendererCompatibilityVersion: input.siteVersion.rendererCompatibilityVersion,
      bundleSha256: "diagnostic-fallback-bundle",
      htmlByPath: {
        "/": "<!doctype html><html><body><h1>FALLBACK PREVIEW: HERO</h1><div>raw-block: html&gt;body Diagnostics: keys=script No CTA action link extracted</div></body></html>",
      },
      compiledTokenStyles: "",
      assetFingerprintMap: {},
      manifest: { renderMode: input.renderMode },
    };
  };

  await assert.rejects(
    () => createAirshipSingleSiteDraftCandidate(
      {
        draft: savedDraft(),
        actor: "superadmin",
        targetCandidateSiteVersionId: TARGET_VERSION_ID,
      },
      deps,
    ),
    /airship_draft_candidate_artifact_html_diagnostic_fallback/,
  );

  assert.equal(deps.calls.includes("createArtifact"), false);
  assert.equal(deps.calls.includes("refreshArtifactForVersionPublishCandidate"), false);
  assert.equal(deps.calls.includes("bindArtifactToVersion"), false);
  assert.equal(deps.artifacts.has(TARGET_ARTIFACT_ID), false);
  assert.equal(deps.versions.get(TARGET_VERSION_ID)?.artifactId, null);
  assert.equal(deps.calls.filter((call) => call === "getActivePointerForSite:runtime-chs").length, 1);
  assert.equal(deps.createSiteVersionInputs[0]?.createSourceHostBinding, false);
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
  assert.equal(deps.calls.filter((call) => call === "refreshArtifactForVersionPublishCandidate").length, 1);
});

test("applies saved CTA text when the CTA draft edit is accepted", async () => {
  const deps = fakeDeps();
  const draft = savedDraft();
  draft.draftEdits = draft.draftEdits.map((edit) =>
    edit.id === "airship-chs-home-contact-cta" ? { ...edit, status: "accepted", proposedTextContent: "Email CHS sales" } : edit,
  );
  draft.draftStatus = "accepted";
  draft.version = 6;

  const output = await createAirshipSingleSiteDraftCandidate(
    {
      draft,
      actor: "superadmin",
      targetCandidateSiteVersionId: TARGET_VERSION_ID,
    },
    deps,
  );

  const candidate = deps.versions.get(TARGET_VERSION_ID);
  const artifact = deps.artifacts.get(TARGET_ARTIFACT_ID);
  assert.deepEqual(output.appliedEdits.map((edit) => edit.draftEditId), [
    "airship-chs-home-hero-headline",
    "airship-chs-home-hero-value-proposition",
    "airship-chs-home-contact-cta",
  ]);
  assert.deepEqual(output.skippedEdits, []);
  assert.equal(candidate?.pages[0]?.contentModel.sectionProps.hero?.cta, "Email CHS sales");
  assert.equal((candidate?.pages[0]?.contentModel.sectionProps.hero?.airshipDraftCtaOverride as { label?: string } | undefined)?.label, "Email CHS sales");
  assert.match(artifact?.htmlByPath["/"] ?? "", /Email CHS sales/);
  assert.doesNotMatch(artifact?.htmlByPath["/"] ?? "", /Contact us/);
});

test("creates an internal draft candidate from generic imported-site draft fields", async () => {
  const deps = fakeDeps();
  const draft = savedDraft();
  draft.id = "draft-luna-generic";
  draft.migrationId = "11111111-2222-4333-8444-555555555555";
  draft.tenantId = "tenant-luna";
  draft.clientId = "client-luna";
  draft.siteId = "site-luna";
  draft.sourceUrl = "https://luna.example/";
  draft.version = 1;
  draft.draftEdits = [
    {
      id: "airship-luna-example-home-headline",
      targetSectionPage: "Homepage / hero headline",
      currentTextContentSummary: "Captured source headline.",
      proposedTextContent: "Luna Books for curious teams",
      reasonForChange: "Accepted operator edit.",
      status: "accepted",
      previewImpact: "Headline appears in internal preview only.",
    },
    {
      id: "airship-luna-example-home-subheading",
      targetSectionPage: "Homepage / hero subheading",
      currentTextContentSummary: "Captured source subheading.",
      proposedTextContent: "Editorial research, launch notes, and reading operations for product teams.",
      reasonForChange: "Saved operator edit.",
      status: "edited",
      previewImpact: "Subheading appears in internal preview only.",
    },
    {
      id: "airship-luna-example-home-ctaLabel",
      targetSectionPage: "Homepage / contact call-to-action",
      currentTextContentSummary: "Captured contact action.",
      proposedTextContent: "Contact Luna at hello@luna.example",
      reasonForChange: "Accepted operator edit.",
      status: "accepted",
      previewImpact: "CTA appears in internal preview only.",
    },
  ];

  const output = await createAirshipSingleSiteDraftCandidate(
    {
      draft,
      actor: "superadmin",
      targetCandidateSiteVersionId: TARGET_VERSION_ID,
    },
    deps,
  );

  const candidate = deps.versions.get(TARGET_VERSION_ID);
  const artifact = deps.artifacts.get(TARGET_ARTIFACT_ID);
  assert.equal(output.status, "created");
  assert.deepEqual(output.appliedEdits.map((edit) => edit.draftEditId), [
    "airship-luna-example-home-headline",
    "airship-luna-example-home-subheading",
    "airship-luna-example-home-ctaLabel",
  ]);
  assert.equal(candidate?.state, "DRAFT");
  assert.equal(candidate?.pages[0]?.contentModel.sectionProps.hero?.headline, "Luna Books for curious teams");
  assert.equal(
    candidate?.pages[0]?.contentModel.sectionProps.hero?.subheading,
    "Editorial research, launch notes, and reading operations for product teams.",
  );
  assert.equal(candidate?.pages[0]?.contentModel.sectionProps.hero?.cta, "Contact Luna at hello@luna.example");
  assert.match(artifact?.htmlByPath["/"] ?? "", /Luna Books for curious teams/);
  assert.doesNotMatch(JSON.stringify(output), /airship-chs|CHS|chs\.si/);
  assert.equal(output.published, false);
  assert.equal(output.activePointerChanged, false);
});

test("materializes saved multi-section Airship draft edits into internal candidate content", async () => {
  const deps = fakeDeps();
  const draft = savedDraft();
  draft.version = 12;
  draft.draftEdits = [
    ...draft.draftEdits.filter((edit) => edit.id !== "airship-chs-home-contact-cta"),
    {
      id: "airship-chs-home-services",
      sectionKey: "offers",
      targetSectionPage: "Homepage / offers or services",
      currentTextContentSummary: "CHS service evidence.",
      proposedTextContent: "Cybersecurity, data systems, hybrid infrastructure, and managed support.",
      reasonForChange: "Saved services section.",
      status: "edited",
      previewImpact: "Services section appears in internal preview only.",
    },
    {
      id: "airship-chs-home-offer-card-1-title",
      sectionKey: "offers",
      targetSectionPage: "Homepage / offers card 1 title",
      currentTextContentSummary: "CHS offer title evidence.",
      proposedTextContent: "Resilient managed infrastructure",
      reasonForChange: "Saved offer card title element edit.",
      status: "edited",
      previewImpact: "Offer card title appears in internal preview only.",
    },
    {
      id: "airship-chs-home-offer-card-1-body",
      sectionKey: "offers",
      targetSectionPage: "Homepage / offers card 1 body",
      currentTextContentSummary: "CHS offer body evidence.",
      proposedTextContent: "Element-level support copy saved through the Airship draft.",
      reasonForChange: "Saved offer card body element edit.",
      status: "edited",
      previewImpact: "Offer card body appears in internal preview only.",
    },
    {
      id: "airship-chs-home-benefits",
      sectionKey: "proof",
      targetSectionPage: "Homepage / proof and benefits",
      currentTextContentSummary: "CHS proof evidence.",
      proposedTextContent: "Regional expertise, practical support, and source-supported IT specialization.",
      reasonForChange: "Saved proof section.",
      status: "accepted",
      previewImpact: "Proof section appears in internal preview only.",
    },
    {
      id: "airship-chs-home-process",
      sectionKey: "approach",
      targetSectionPage: "Homepage / approach and process",
      currentTextContentSummary: "CHS process evidence.",
      proposedTextContent: "Assess risk, plan implementation, and support operations after launch.",
      reasonForChange: "Saved approach section.",
      status: "edited",
      previewImpact: "Approach section appears in internal preview only.",
    },
    {
      id: "airship-chs-home-contact-cta",
      fieldKey: "ctaLabel",
      sectionKey: "cta",
      targetSectionPage: "Homepage / contact call-to-action",
      currentTextContentSummary: "Existing CHS contact action.",
      proposedTextContent: "Contact CHS at sales@chs.si",
      reasonForChange: "Accepted contact CTA.",
      status: "accepted",
      previewImpact: "CTA appears in internal preview only.",
    },
    {
      id: "airship-chs-home-demo-note",
      sectionKey: "footer",
      targetSectionPage: "Homepage / footer demo note",
      currentTextContentSummary: "Preview boundary.",
      proposedTextContent: "Internal GNR8 demo preview for CHS. https://www.chs.si/ remains external and unchanged.",
      reasonForChange: "Keep demo boundary visible.",
      status: "edited",
      previewImpact: "Footer note appears in internal preview only.",
    },
  ];

  const output = await createAirshipSingleSiteDraftCandidate(
    {
      draft,
      actor: "superadmin",
      targetCandidateSiteVersionId: TARGET_VERSION_ID,
    },
    deps,
  );

  const candidate = deps.versions.get(TARGET_VERSION_ID);
  const artifact = deps.artifacts.get(TARGET_ARTIFACT_ID);
  const home = candidate?.pages[0];
  const serialized = JSON.stringify({ output, candidate, artifact });

  assert.equal(output.status, "created");
  assert.equal(output.appliedEdits.length, 9);
  assert.equal(home?.structureModel.sections.some((section) => section.id === "airship-draft-offers"), true);
  assert.equal(home?.structureModel.sections.some((section) => section.id === "airship-draft-proof"), true);
  assert.equal(home?.structureModel.sections.some((section) => section.id === "airship-draft-approach"), true);
  assert.equal(home?.structureModel.sections.some((section) => section.id === "airship-draft-footer"), true);
  assert.equal(home?.contentModel.sectionProps["airship-draft-offers"]?.body, "Cybersecurity, data systems, hybrid infrastructure, and managed support. Resilient managed infrastructure Element-level support copy saved through the Airship draft.");
  assert.equal(home?.contentModel.sectionProps["airship-draft-proof"]?.body, "Regional expertise, practical support, and source-supported IT specialization.");
  assert.equal(home?.contentModel.sectionProps["airship-draft-footer"]?.body, "Internal GNR8 demo preview for CHS. https://www.chs.si/ remains external and unchanged.");
  assert.match(artifact?.htmlByPath["/"] ?? "", /Cybersecurity, data systems, hybrid infrastructure, and managed support/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /Resilient managed infrastructure/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /Element-level support copy saved through the Airship draft/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /Regional expertise, practical support, and source-supported IT specialization/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /Internal GNR8 demo preview for CHS/);
  for (const section of ["hero", "offers", "proof", "approach", "cta", "footer"]) {
    assert.match(artifact?.htmlByPath["/"] ?? "", new RegExp(`data-airship-section="${section}"`));
  }
  assert.match(artifact?.htmlByPath["/"] ?? "", /<section[^>]*data-airship-section="offers"/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /<section[^>]*data-airship-section="cta"/);
  assert.doesNotMatch(artifact?.htmlByPath["/"] ?? "", /<section[^>]*data-airship-section="cta"[^>]*data-airship-element="contact-card"/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /data-airship-element="hero-headline"/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /data-airship-element="offer-card"/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /data-airship-element="contact-card"/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /data-airship-element="contact-cta"/);
  assert.doesNotMatch(serialized, /Recovered from:|\/tmp\/|Recovered Section|FALLBACK PREVIEW|raw-block|CAPTURE_DRIVEN|Diagnostics:/);
  assert.equal(output.published, false);
  assert.equal(output.activePointerChanged, false);
});

test("creates ARIS internal draft candidate from source-evidence page without degraded artifact content or host binding", async () => {
  const deps = fakeDeps();
  deps.versions.set(AIRSHIP_ARIS_INITIAL_RUNTIME_SITE_VERSION_ID, {
    ...liveVersion(),
    id: AIRSHIP_ARIS_INITIAL_RUNTIME_SITE_VERSION_ID,
    siteId: AIRSHIP_ARIS_RUNTIME_SITE_ID,
    artifactId: AIRSHIP_ARIS_RUNTIME_ARTIFACT_ID,
    pages: [
      {
        ...liveVersion().pages[0]!,
        id: "aris-degraded-page-version",
        siteVersionId: AIRSHIP_ARIS_INITIAL_RUNTIME_SITE_VERSION_ID,
        pageId: "aris-degraded-home",
        title: "FALLBACK PREVIEW",
        contentModel: {
          sectionProps: {
            "raw-block": {
              headline: "FALLBACK PREVIEW",
              subheading: "CAPTURE_DRIVEN Diagnostics:",
            },
          },
        },
      },
    ],
  });
  deps.artifacts.set(AIRSHIP_ARIS_RUNTIME_ARTIFACT_ID, {
    ...liveArtifact(),
    id: AIRSHIP_ARIS_RUNTIME_ARTIFACT_ID,
    siteId: AIRSHIP_ARIS_RUNTIME_SITE_ID,
    siteVersionId: AIRSHIP_ARIS_INITIAL_RUNTIME_SITE_VERSION_ID,
    htmlByPath: { "/": "<html><body>FALLBACK PREVIEW raw-block CAPTURE_DRIVEN Diagnostics:</body></html>" },
  });
  const seed = buildArisAirshipMvpDraftSeed({ tenantId: "tenant-aris" });
  const draft: AirshipSingleSiteDraftRecord = {
    id: "11111111-2222-4333-8444-999999999999",
    migrationId: AIRSHIP_ARIS_MIGRATION_ID,
    tenantId: seed.tenantId,
    clientId: seed.clientId,
    siteId: seed.siteId,
    agencyId: seed.agencyId,
    sourceUrl: seed.sourceUrl,
    targetSiteVersionRefs: seed.targetSiteVersionRefs,
    draftEdits: seed.draftEdits,
    draftStatus: "draft",
    version: 1,
    semanticWatermark: "airship-single-site-editor-draft:aris-test",
    metadata: seed.metadata,
    createdByActorId: "superadmin",
    updatedByActorId: "superadmin",
    acceptedAt: null,
    rejectedAt: null,
    createdAt: "2026-09-15T00:00:00.000Z",
    updatedAt: "2026-09-15T00:00:00.000Z",
  };

  const output = await createAirshipSingleSiteDraftCandidate(
    {
      draft,
      actor: "superadmin",
      sourceLiveSiteVersionId: AIRSHIP_ARIS_INITIAL_RUNTIME_SITE_VERSION_ID,
      sourceLiveRuntimeArtifactId: AIRSHIP_ARIS_RUNTIME_ARTIFACT_ID,
      targetCandidateSiteVersionId: TARGET_VERSION_ID,
    },
    deps,
  );
  const candidate = deps.versions.get(TARGET_VERSION_ID);
  const artifact = deps.artifacts.get(TARGET_ARTIFACT_ID);
  const serialized = JSON.stringify({ output, candidate, artifact });

  assert.equal(output.status, "created");
  assert.equal(output.activePointerChanged, false);
  assert.equal(output.published, false);
  assert.equal(deps.createSiteVersionInputs[0]?.sourceUrl, "https://www.aris.si/");
  assert.equal(deps.createSiteVersionInputs[0]?.createSourceHostBinding, false);
  assert.equal(candidate?.siteId, AIRSHIP_ARIS_RUNTIME_SITE_ID);
  assert.equal(candidate?.pages[0]?.title, "ARIS - Apple in Canton ponudba");
  assert.equal(candidate?.pages[0]?.contentModel.sectionProps["aris-airship-mvp"]?.headline, "ARIS - Apple in Canton ponudba");
  assert.equal(candidate?.pages[0]?.contentModel.sectionProps["aris-airship-mvp"]?.ctaLabel, "Želim ponudbo");
  assert.match(artifact?.htmlByPath["/"] ?? "", /MacBook Air, Mac Studio in Canton Smart/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /Blackmagic Design/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /prodaja@aris\.si/);
  for (const section of ["hero", "offers", "proof", "approach", "cta", "footer"]) {
    assert.match(artifact?.htmlByPath["/"] ?? "", new RegExp(`data-airship-section="${section}"`));
  }
  assert.match(artifact?.htmlByPath["/"] ?? "", /<section[^>]*data-airship-section="offers"/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /<section[^>]*data-airship-section="cta"/);
  assert.doesNotMatch(artifact?.htmlByPath["/"] ?? "", /<section[^>]*data-airship-section="cta"[^>]*data-airship-element="contact-card"/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /data-airship-element="hero-headline"/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /data-airship-element="hero-cta"/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /data-airship-element="offer-card"/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /data-airship-element="contact-card"/);
  assert.match(artifact?.htmlByPath["/"] ?? "", /data-airship-element="contact-cta"/);
  assert.doesNotMatch(serialized, /CHS|chs\.si|FALLBACK PREVIEW|raw-block|CAPTURE_DRIVEN|Diagnostics:/);
});
