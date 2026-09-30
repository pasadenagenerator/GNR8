import "server-only";

import { importHtmlToPage } from "@/gnr8/importer/html-to-page";
import { computeRuntimeArtifactBundleSha256 } from "@/gnr8/runtime/astro-artifact-materialization";
import { buildCanonicalMigrationInput } from "@/gnr8/runtime/migration-factory";
import { evaluatePublishEnforcement } from "@/gnr8/runtime/publish-enforcement";
import {
  bindArtifactToVersion,
  createArtifact,
  createSiteVersionFromMigration,
  getActiveHostBindingForHost,
  getActivePointerForSite,
  getSiteVersion,
  linkRuntimeSiteVersionOwnershipIfAllowed,
  setSiteVersionState,
  switchActivePointer,
} from "@/gnr8/runtime/runtime-store";
import {
  RENDERER_COMPATIBILITY_VERSION,
  type RuntimeImportProvenanceSummary,
  type SiteVersionState,
} from "@/gnr8/runtime/types";
import { getSuperadminPool } from "@/src/superadmin/db";

import { createAstroStaticSiteProjectManifest } from "./astro-static-site-adapter";
import { CHS_ASTRO_EVALUATION } from "./chs-astro-evaluation-contract";
import { CHS_ASTRO_SOURCE_LINEAGE, chsAstroSourceContent } from "./chs-astro-source-content";

export type ChsAstroEvaluationBootstrapResult = {
  actorUserId: string;
  runtimeSiteId: string;
  internalHost: string;
  baselineSiteVersionId: string;
  baselineArtifactId: string;
  sourceSiteVersionId: string;
  sourceArtifactId: string;
  activeSiteVersionId: string;
  activeArtifactId: string;
};

export async function bootstrapChsAstroEvaluationTarget(actorUserId: string): Promise<ChsAstroEvaluationBootstrapResult> {
  const actor = actorUserId.trim();
  if (!actor) throw new Error("CHS_ASTRO_EVALUATION_ACTOR_REQUIRED");
  await ensureAuthoritativeOwnership();

  const manifest = createAstroStaticSiteProjectManifest(chsAstroSourceContent());
  const html = requiredFile(manifest.files, "src/pages/index.astro");
  const css = requiredFile(manifest.files, "public/styles/global.css");
  const page = importHtmlToPage({ slug: "/", title: "Home | CHS", html });
  if (!page.migrationDiagnostics) throw new Error("CHS_ASTRO_EVALUATION_GOVERNANCE_MISSING");
  const canonical = buildCanonicalMigrationInput({ sourceUrl: CHS_ASTRO_EVALUATION.sourceUrl, page, actor });
  const provenance: RuntimeImportProvenanceSummary = {
    kind: "runtime_import_provenance_summary_v1",
    executionIdentity: {
      snapshotId: CHS_ASTRO_SOURCE_LINEAGE.sourceSnapshotId,
      snapshotRunId: CHS_ASTRO_SOURCE_LINEAGE.sourceRunId,
      snapshotStableRootDirAbs: "",
      snapshotRunRootDirAbs: "",
      requestId: null,
    },
    sourceMode: "raw_html_fallback",
    importFidelityStatus: "degraded_import",
    renderedCaptureStatus: "failed",
    renderedDomQuality: "unusable",
    screenshotCount: 0,
    computedStyleSampleCount: 0,
    renderedCapture: {
      used: false,
      status: "failed",
      quality: "unusable",
      domLength: 0,
      nodeCount: 0,
      styleSampleCount: 0,
      styleCoverage: 0,
      screenshots: { viewport: false, fullPage: false },
      execution: {
        runtimeKind: "nodejs",
        environmentSupported: true,
        browserPackageAvailable: false,
        browserBinaryAvailable: false,
        environmentStatus: "supported",
        failureCategory: "none",
        failureCode: null,
        browserLaunch: "not_attempted",
        navigation: "not_attempted",
        dom: "not_attempted",
        screenshot: "none",
        styleSampling: "not_attempted",
      },
    },
    importDiagnosticCodes: [
      "chs_authoritative_source_snapshot",
      "chs_dedicated_astro_evaluation_target",
      "chs_source_backed_static_mapping",
    ],
    captureEvidence: {
      selectedSourceHtmlPath: null,
      responseHtmlPath: null,
      entryHtmlPath: null,
      renderedCaptureManifestPath: null,
      acquisitionEvidencePath: null,
      renderedDomPath: null,
      computedStylesPath: null,
      layoutGeometryPath: null,
      renderedViewportScreenshotPath: null,
      renderedFullpageScreenshotPath: null,
      screenshotPaths: [],
    },
    styleSignals: null,
    semanticImport: null,
    multipageImport: null,
    multiPageDiscovery: null,
    siteTree: null,
    templateFamilies: null,
  };

  for (const siteVersionId of [
    CHS_ASTRO_EVALUATION.baselineSiteVersionId,
    CHS_ASTRO_EVALUATION.sourceSiteVersionId,
  ]) {
    await createSiteVersionFromMigration({
      ...canonical,
      siteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
      siteVersionId,
      sourceUrl: CHS_ASTRO_EVALUATION.sourceUrl,
      actor,
      createSourceHostBinding: siteVersionId === CHS_ASTRO_EVALUATION.baselineSiteVersionId,
      importProvenanceSummary: provenance,
      rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
    });
    await linkRuntimeSiteVersionOwnershipIfAllowed({
      siteVersionId,
      ownershipSiteId: CHS_ASTRO_EVALUATION.ownership.siteId,
    });
  }

  const baselineArtifactId = await ensureBootstrapArtifact({
    siteVersionId: CHS_ASTRO_EVALUATION.baselineSiteVersionId,
    html,
    css,
  });
  const sourceArtifactId = await ensureBootstrapArtifact({
    siteVersionId: CHS_ASTRO_EVALUATION.sourceSiteVersionId,
    html,
    css,
  });
  await advanceBaselineToPublished(actor);
  await switchActivePointer({
    siteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
    siteVersionId: CHS_ASTRO_EVALUATION.baselineSiteVersionId,
    artifactId: baselineArtifactId,
  });

  const [binding, pointer] = await Promise.all([
    getActiveHostBindingForHost(CHS_ASTRO_EVALUATION.internalHost),
    getActivePointerForSite(CHS_ASTRO_EVALUATION.runtimeSiteId),
  ]);
  if (
    !binding ||
    binding.siteId !== CHS_ASTRO_EVALUATION.runtimeSiteId ||
    binding.status !== "ACTIVE" ||
    binding.bindingKind !== "shadow" ||
    !pointer
  ) {
    throw new Error("CHS_ASTRO_EVALUATION_BOOTSTRAP_READBACK_FAILED");
  }
  return {
    actorUserId: actor,
    runtimeSiteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
    internalHost: CHS_ASTRO_EVALUATION.internalHost,
    baselineSiteVersionId: CHS_ASTRO_EVALUATION.baselineSiteVersionId,
    baselineArtifactId,
    sourceSiteVersionId: CHS_ASTRO_EVALUATION.sourceSiteVersionId,
    sourceArtifactId,
    activeSiteVersionId: pointer.siteVersionId,
    activeArtifactId: pointer.artifactId,
  };
}

async function ensureAuthoritativeOwnership(): Promise<void> {
  const client = await getSuperadminPool().connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into public.agencies (id, name, slug, is_home_agency)
       values ($1::uuid, $2::text, $3::text, false)
       on conflict (id) do nothing`,
      [
        CHS_ASTRO_EVALUATION.ownership.agencyId,
        CHS_ASTRO_EVALUATION.ownership.agencyName,
        CHS_ASTRO_EVALUATION.ownership.agencySlug,
      ],
    );
    await client.query(
      `insert into public.organizations (id, name, agency_id, organization_type, slug)
       values ($1::uuid, $2::text, $3::uuid, 'client', $4::text)
       on conflict (id) do nothing`,
      [
        CHS_ASTRO_EVALUATION.ownership.organizationId,
        CHS_ASTRO_EVALUATION.ownership.organizationName,
        CHS_ASTRO_EVALUATION.ownership.agencyId,
        CHS_ASTRO_EVALUATION.ownership.organizationSlug,
      ],
    );
    await client.query(
      `insert into public.sites (id, org_id, agency_id, status, domain, is_template, billing_scope, billing_locked)
       values ($1::uuid, $2::uuid, $3::uuid, 'draft', null, false, 'agency', false)
       on conflict (id) do nothing`,
      [
        CHS_ASTRO_EVALUATION.ownership.siteId,
        CHS_ASTRO_EVALUATION.ownership.organizationId,
        CHS_ASTRO_EVALUATION.ownership.agencyId,
      ],
    );
    const verified = await client.query<{
      agency_name: string;
      agency_slug: string;
      organization_name: string;
      organization_slug: string;
      organization_agency_id: string;
      site_org_id: string;
      site_agency_id: string;
    }>(
      `select a.name::text as agency_name, a.slug::text as agency_slug,
              o.name::text as organization_name, o.slug::text as organization_slug,
              o.agency_id::text as organization_agency_id,
              s.org_id::text as site_org_id, s.agency_id::text as site_agency_id
         from public.sites s
         join public.organizations o on o.id = s.org_id
         join public.agencies a on a.id = s.agency_id
        where s.id = $1::uuid`,
      [CHS_ASTRO_EVALUATION.ownership.siteId],
    );
    const row = verified.rows[0];
    if (
      !row ||
      row.agency_name !== CHS_ASTRO_EVALUATION.ownership.agencyName ||
      row.agency_slug !== CHS_ASTRO_EVALUATION.ownership.agencySlug ||
      row.organization_name !== CHS_ASTRO_EVALUATION.ownership.organizationName ||
      row.organization_slug !== CHS_ASTRO_EVALUATION.ownership.organizationSlug ||
      row.organization_agency_id !== CHS_ASTRO_EVALUATION.ownership.agencyId ||
      row.site_org_id !== CHS_ASTRO_EVALUATION.ownership.organizationId ||
      row.site_agency_id !== CHS_ASTRO_EVALUATION.ownership.agencyId
    ) {
      throw new Error("CHS_ASTRO_EVALUATION_OWNERSHIP_CONFLICT");
    }
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureBootstrapArtifact(input: { siteVersionId: string; html: string; css: string }): Promise<string> {
  const version = await getSiteVersion(input.siteVersionId);
  if (!version) throw new Error("CHS_ASTRO_EVALUATION_SITE_VERSION_MISSING");
  const enforcement = evaluatePublishEnforcement({ siteVersion: version, stage: "shadow" });
  const manifest = {
    siteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
    siteVersionId: input.siteVersionId,
    rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
    renderMode: "PUBLISH",
    paths: ["/"],
    artifactSource: "chs_astro_evaluation_bootstrap",
    authoritativeSource: CHS_ASTRO_SOURCE_LINEAGE,
    publishStage: "shadow",
    shadowRestricted: enforcement.shadowRestricted,
    enforcementDecision: enforcement.adapter.decision,
  };
  const bundleSha256 = computeRuntimeArtifactBundleSha256({
    htmlByPath: { "/": input.html },
    compiledTokenStyles: input.css,
    assetFingerprintMap: {},
    manifest,
  });
  const created = await createArtifact({
    siteId: CHS_ASTRO_EVALUATION.runtimeSiteId,
    siteVersionId: input.siteVersionId,
    rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
    bundleSha256,
    htmlByPath: { "/": input.html },
    compiledTokenStyles: input.css,
    assetFingerprintMap: {},
    manifest,
    publishStage: "shadow",
    shadowRestricted: enforcement.shadowRestricted,
    artifactGovernance: enforcement.artifactGovernance,
  });
  await bindArtifactToVersion({
    siteVersionId: input.siteVersionId,
    artifactId: created.artifactId,
    rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
  });
  return created.artifactId;
}

async function advanceBaselineToPublished(actor: string): Promise<void> {
  const transitions: Array<[SiteVersionState, SiteVersionState]> = [
    ["DRAFT", "READY_FOR_REVIEW"],
    ["READY_FOR_REVIEW", "APPROVED"],
    ["APPROVED", "PUBLISHED"],
  ];
  for (const [expectedCurrentState, nextState] of transitions) {
    const current = await getSiteVersion(CHS_ASTRO_EVALUATION.baselineSiteVersionId);
    if (!current) throw new Error("CHS_ASTRO_EVALUATION_BASELINE_MISSING");
    if (current.state === nextState || current.state === "PUBLISHED") continue;
    await setSiteVersionState({
      siteVersionId: CHS_ASTRO_EVALUATION.baselineSiteVersionId,
      expectedCurrentState,
      nextState,
      actor,
      source: "manual",
      details: { workflow: "chs_astro_evaluation_bootstrap_v1" },
    });
  }
}

function requiredFile(files: Array<{ path: string; contents: string }>, path: string): string {
  const contents = files.find((file) => file.path === path)?.contents;
  if (!contents) throw new Error(`CHS_ASTRO_EVALUATION_FILE_MISSING:${path}`);
  return contents;
}
