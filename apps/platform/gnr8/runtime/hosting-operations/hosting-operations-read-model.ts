import "server-only";

import {
  createRuntimeDomainReadinessReport,
  type RuntimeDomainReadinessReport,
} from "@/gnr8/runtime/readiness/runtime-domain-readiness";
import {
  createRuntimeSiteReadinessReport,
  type RuntimeSiteReadinessReport,
} from "@/gnr8/runtime/readiness/runtime-site-readiness";
import { resolveRuntimeSiteVersion, type RuntimeResolutionResult } from "@/gnr8/runtime/resolution/runtime-resolution";
import {
  getActivePointerForSite,
  getArtifactById,
  getRawImportedSiteArtifact,
  getRawTemplateSiteArtifact,
  getRuntimeSiteDomainReadinessBinding,
  getRuntimeSiteResolutionBinding,
  getSiteVersion,
  listDomainHostBindingsForSite,
  listPreviouslyPublishedVersions,
  type RuntimeDomainHostBinding,
  type RuntimeSiteResolutionBinding,
} from "@/gnr8/runtime/runtime-store";
import type {
  CanonicalSiteVersionSnapshot,
  RawImportedSiteArtifact,
  RawTemplateSiteArtifact,
  RuntimeArtifact,
  RuntimeImportProvenanceSummary,
} from "@/gnr8/runtime/types";

type ActivePointer = { siteVersionId: string; artifactId: string };
type RawSiteArtifact = RawTemplateSiteArtifact | RawImportedSiteArtifact;

export type HostingOperationsReadiness = {
  state: "ready" | "ready_with_warnings" | "blocked";
  blockers: string[];
  warnings: string[];
  site: RuntimeSiteReadinessReport | null;
  domains: RuntimeDomainReadinessReport | null;
};

export type HostingOperationsReadModel = {
  site: {
    siteId: string;
    canonicalSlug: string | null;
    found: boolean;
  };
  runtime: {
    activeVersion: {
      id: string;
      versionNo: number;
      state: string;
      createdAt: string;
      artifactId: string | null;
      rendererCompatibilityVersion: string;
    } | null;
    activeArtifact: {
      id: string;
      artifactType: "runtime_artifact" | "raw_imported_site" | "raw_template_site" | "unknown";
      siteVersionId: string | null;
      publishStage: string | null;
      bundleSha256: string | null;
      createdAt: string | null;
      entryHtmlPath: string | null;
      assetBasePath: string | null;
    } | null;
    activePointer: ActivePointer | null;
    resolution: RuntimeResolutionResult | null;
  };
  publish: {
    lastPublish: {
      siteVersionId: string;
      versionNo: number;
      artifactId: string | null;
      publishedAt: string;
      state: string;
    } | null;
    history: Array<{
      siteVersionId: string;
      versionNo: number;
      state: string;
      artifactId: string | null;
      createdAt: string;
      isActive: boolean;
    }>;
  };
  domains: Array<{
    id: string;
    host: string;
    status: RuntimeDomainHostBinding["status"];
    verified: boolean;
    lastCheckedAt: string | null;
    siteVersionId: string;
    verificationType: RuntimeDomainHostBinding["verificationType"];
    verificationHost: string | null;
    dnsRecordType: RuntimeDomainHostBinding["dnsRecordType"];
    dnsRecordHost: string | null;
    dnsRecordPurpose: RuntimeDomainHostBinding["dnsRecordPurpose"];
    createdAt: string;
    updatedAt: string;
  }>;
  readiness: HostingOperationsReadiness;
  assets: {
    artifactId: string | null;
    artifactType: "runtime_artifact" | "raw_imported_site" | "raw_template_site" | "none";
    counts: {
      htmlPaths: number;
      fingerprintedAssets: number;
      rawFiles: number;
      persistedAssets: number;
      externalFallbackAssets: number;
    };
    diagnostics: {
      healthy: boolean;
      codes: string[];
      warnings: string[];
      failures: string[];
    };
  };
  diagnostics: {
    latestRuntimeDiagnostics: {
      resolution: RuntimeResolutionResult["diagnostics"] | null;
      importProvenanceSummary: RuntimeImportProvenanceSummary | null;
      artifactGovernance: RuntimeArtifact["artifactGovernance"] | null;
      rawImportMetadata: RawImportedSiteArtifact["metadata"] | null;
    };
    latestFailures: string[];
    codes: string[];
  };
  rollbackCandidates: Array<{
    siteVersionId: string;
    versionNo: number | null;
    artifactId: string;
    publishedAt: string | null;
    state: string | null;
    isActive: boolean;
  }>;
};

export type HostingOperationsReadModelDependencies = {
  getRuntimeSiteResolutionBinding: typeof getRuntimeSiteResolutionBinding;
  getRuntimeSiteDomainReadinessBinding: typeof getRuntimeSiteDomainReadinessBinding;
  listDomainHostBindingsForSite: typeof listDomainHostBindingsForSite;
  listPreviouslyPublishedVersions: typeof listPreviouslyPublishedVersions;
  getSiteVersion: typeof getSiteVersion;
  getArtifactById: typeof getArtifactById;
  getRawTemplateSiteArtifact: typeof getRawTemplateSiteArtifact;
  getRawImportedSiteArtifact: typeof getRawImportedSiteArtifact;
  getActivePointerForSite: typeof getActivePointerForSite;
  createRuntimeSiteReadinessReport: typeof createRuntimeSiteReadinessReport;
  createRuntimeDomainReadinessReport: typeof createRuntimeDomainReadinessReport;
  resolveRuntimeSiteVersion: typeof resolveRuntimeSiteVersion;
};

const DEFAULT_DEPS: HostingOperationsReadModelDependencies = {
  getRuntimeSiteResolutionBinding,
  getRuntimeSiteDomainReadinessBinding,
  listDomainHostBindingsForSite,
  listPreviouslyPublishedVersions,
  getSiteVersion,
  getArtifactById,
  getRawTemplateSiteArtifact,
  getRawImportedSiteArtifact,
  getActivePointerForSite,
  createRuntimeSiteReadinessReport,
  createRuntimeDomainReadinessReport,
  resolveRuntimeSiteVersion,
};

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function getRawImportMetadata(artifact: RawSiteArtifact | null): RawImportedSiteArtifact["metadata"] | null {
  return artifact?.artifactType === "raw_imported_site" ? artifact.metadata : null;
}

function mapActiveArtifact(input: {
  activePointer: ActivePointer | null;
  runtimeArtifact: RuntimeArtifact | null;
  rawArtifact: RawSiteArtifact | null;
}): HostingOperationsReadModel["runtime"]["activeArtifact"] {
  if (input.runtimeArtifact) {
    return {
      id: input.runtimeArtifact.id,
      artifactType: "runtime_artifact",
      siteVersionId: input.runtimeArtifact.siteVersionId,
      publishStage: input.runtimeArtifact.publishStage,
      bundleSha256: input.runtimeArtifact.bundleSha256,
      createdAt: input.runtimeArtifact.createdAt,
      entryHtmlPath: null,
      assetBasePath: null,
    };
  }

  if (input.rawArtifact) {
    return {
      id: input.rawArtifact.id,
      artifactType: input.rawArtifact.artifactType,
      siteVersionId: input.rawArtifact.siteVersionId,
      publishStage: null,
      bundleSha256: null,
      createdAt: input.rawArtifact.createdAt,
      entryHtmlPath: input.rawArtifact.entryHtmlPath,
      assetBasePath: input.rawArtifact.assetBasePath,
    };
  }

  if (!input.activePointer) return null;
  return {
    id: input.activePointer.artifactId,
    artifactType: "unknown",
    siteVersionId: input.activePointer.siteVersionId,
    publishStage: null,
    bundleSha256: null,
    createdAt: null,
    entryHtmlPath: null,
    assetBasePath: null,
  };
}

function combineReadiness(input: {
  siteReadiness: RuntimeSiteReadinessReport | null;
  domainReadiness: RuntimeDomainReadinessReport | null;
}): HostingOperationsReadiness {
  const blockers = uniqueSorted([...(input.siteReadiness?.blockers ?? []), ...(input.domainReadiness?.blockers ?? [])]);
  const warnings = uniqueSorted([...(input.siteReadiness?.warnings ?? []), ...(input.domainReadiness?.warnings ?? [])]);
  const state =
    blockers.length > 0
      ? "blocked"
      : input.siteReadiness?.readinessStatus === "ready_with_warnings" ||
          input.domainReadiness?.domainReadinessStatus === "ready_with_warnings" ||
          warnings.length > 0
        ? "ready_with_warnings"
        : "ready";

  return {
    state,
    blockers,
    warnings,
    site: input.siteReadiness,
    domains: input.domainReadiness,
  };
}

function mapAssets(input: {
  runtimeArtifact: RuntimeArtifact | null;
  rawArtifact: RawSiteArtifact | null;
  importProvenanceSummary: RuntimeImportProvenanceSummary | null;
}): HostingOperationsReadModel["assets"] {
  const rawMetadata = getRawImportMetadata(input.rawArtifact);
  const codes = uniqueSorted([
    ...(rawMetadata?.diagnostics.codes ?? []),
    ...(input.importProvenanceSummary?.importDiagnosticCodes ?? []),
  ]);
  const failures = uniqueSorted(
    [
      input.importProvenanceSummary?.captureJob?.failureCode ?? null,
      input.importProvenanceSummary?.workerHealth?.lastFailureCode ?? null,
      input.importProvenanceSummary?.renderedCapture.execution.failureCode ?? null,
    ].filter((value): value is string => Boolean(value)),
  );
  const warnings = uniqueSorted(
    codes.filter((code) => {
      const normalized = code.toLowerCase();
      return normalized.includes("warn") || normalized.includes("fallback") || normalized.includes("degraded");
    }),
  );
  const artifactType = input.runtimeArtifact
    ? "runtime_artifact"
    : input.rawArtifact?.artifactType === "raw_imported_site"
      ? "raw_imported_site"
      : input.rawArtifact?.artifactType === "raw_template_site"
        ? "raw_template_site"
        : "none";

  return {
    artifactId: input.runtimeArtifact?.id ?? input.rawArtifact?.id ?? null,
    artifactType,
    counts: {
      htmlPaths: Object.keys(input.runtimeArtifact?.htmlByPath ?? {}).length,
      fingerprintedAssets: Object.keys(input.runtimeArtifact?.assetFingerprintMap ?? {}).length,
      rawFiles: Object.keys(input.rawArtifact?.fileMap ?? {}).length,
      persistedAssets: rawMetadata?.assetSummary.persistedAssetCount ?? 0,
      externalFallbackAssets: rawMetadata?.assetSummary.externalFallbackAssetCount ?? 0,
    },
    diagnostics: {
      healthy: failures.length === 0,
      codes,
      warnings,
      failures,
    },
  };
}

function mapPublishHistory(input: {
  binding: RuntimeSiteResolutionBinding;
  activePointer: ActivePointer | null;
}): HostingOperationsReadModel["publish"] {
  const history = [...input.binding.candidateSiteVersions]
    .sort((a, b) => {
      if (a.versionNo !== b.versionNo) return b.versionNo - a.versionNo;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .map((candidate) => ({
      siteVersionId: candidate.siteVersionId,
      versionNo: candidate.versionNo,
      state: candidate.state,
      artifactId: candidate.artifactId,
      createdAt: candidate.createdAt,
      isActive: candidate.siteVersionId === input.activePointer?.siteVersionId,
    }));

  const lastPublished = history.find((candidate) => candidate.artifactId && (candidate.state === "PUBLISHED" || candidate.state === "ARCHIVED"));
  return {
    lastPublish: lastPublished
      ? {
          siteVersionId: lastPublished.siteVersionId,
          versionNo: lastPublished.versionNo,
          artifactId: lastPublished.artifactId,
          publishedAt: lastPublished.createdAt,
          state: lastPublished.state,
        }
      : null,
    history,
  };
}

function mapActiveVersion(version: CanonicalSiteVersionSnapshot | null): HostingOperationsReadModel["runtime"]["activeVersion"] {
  if (!version) return null;
  return {
    id: version.id,
    versionNo: version.versionNo,
    state: version.state,
    createdAt: version.createdAt,
    artifactId: version.artifactId,
    rendererCompatibilityVersion: version.rendererCompatibilityVersion,
  };
}

export async function getHostingOperationsReadModel(
  siteId: string,
  deps: Partial<HostingOperationsReadModelDependencies> = {},
): Promise<HostingOperationsReadModel> {
  const resolvedDeps = { ...DEFAULT_DEPS, ...deps };
  const normalizedSiteId = String(siteId ?? "").trim();
  const [binding, domainBinding, domainRows, activePointer, rollbackRefs] = await Promise.all([
    resolvedDeps.getRuntimeSiteResolutionBinding(normalizedSiteId),
    resolvedDeps.getRuntimeSiteDomainReadinessBinding(normalizedSiteId),
    resolvedDeps.listDomainHostBindingsForSite({ siteId: normalizedSiteId }),
    resolvedDeps.getActivePointerForSite(normalizedSiteId),
    resolvedDeps.listPreviouslyPublishedVersions(normalizedSiteId),
  ]);

  const resolution =
    binding && binding.candidateSiteVersions.length > 0
      ? resolvedDeps.resolveRuntimeSiteVersion({
          strategy: "active",
          binding: {
            siteId: binding.siteId,
            canonicalSlug: binding.canonicalSlug ?? normalizedSiteId,
            activeSiteVersionId: binding.activeSiteVersionId,
            latestImportedSiteVersionId: binding.latestImportedSiteVersionId,
            publishedSiteVersionId: binding.publishedSiteVersionId,
            previewSiteVersionId: binding.previewSiteVersionId,
          },
          candidateSiteVersionIds: binding.candidateSiteVersions.map((candidate) => candidate.siteVersionId),
        })
      : null;

  const activeSiteVersionId = activePointer?.siteVersionId ?? resolution?.siteVersionId ?? binding?.activeSiteVersionId ?? null;
  const [activeVersion, runtimeArtifact, rawImportedArtifact, rawTemplateArtifact] = await Promise.all([
    activeSiteVersionId ? resolvedDeps.getSiteVersion(activeSiteVersionId) : Promise.resolve(null),
    activePointer?.artifactId ? resolvedDeps.getArtifactById(activePointer.artifactId) : Promise.resolve(null),
    activeSiteVersionId ? resolvedDeps.getRawImportedSiteArtifact(activeSiteVersionId) : Promise.resolve(null),
    activeSiteVersionId ? resolvedDeps.getRawTemplateSiteArtifact(activeSiteVersionId) : Promise.resolve(null),
  ]);
  const rawArtifact = rawImportedArtifact ?? rawTemplateArtifact;

  const siteReadiness = binding ? resolvedDeps.createRuntimeSiteReadinessReport(binding) : null;
  const domainReadiness =
    binding && domainBinding
      ? resolvedDeps.createRuntimeDomainReadinessReport({
          siteBinding: binding,
          primaryHost: domainBinding.primaryHost,
          internalPreviewHost: domainBinding.internalPreviewHost,
          domainBindings: domainBinding.domainBindingCandidates.map((candidate) => ({
            domain: candidate.source === "runtime_domain_binding" ? candidate.host : null,
            host: candidate.host,
            status: candidate.status,
            isInternalHost: candidate.isInternalHost,
            isActive: candidate.isActive,
          })),
        })
      : null;

  const publish = binding
    ? mapPublishHistory({ binding, activePointer })
    : {
        lastPublish: null,
        history: [],
      };
  const rollbackCandidateVersions = await Promise.all(rollbackRefs.map((ref) => resolvedDeps.getSiteVersion(ref.id)));
  const rollbackCandidates = rollbackRefs
    .map((ref, index) => {
      const version = rollbackCandidateVersions[index] ?? null;
      return {
        siteVersionId: ref.id,
        versionNo: version?.versionNo ?? null,
        artifactId: ref.artifactId,
        publishedAt: version?.createdAt ?? null,
        state: version?.state ?? null,
        isActive: ref.id === activePointer?.siteVersionId,
      };
    })
    .filter((candidate) => candidate.isActive === false);

  const assets = mapAssets({
    runtimeArtifact,
    rawArtifact,
    importProvenanceSummary: activeVersion?.importProvenanceSummary ?? null,
  });
  const codes = uniqueSorted([
    ...(resolution?.diagnostics.code ? [resolution.diagnostics.code] : []),
    ...assets.diagnostics.codes,
  ]);
  const latestFailures = uniqueSorted([...assets.diagnostics.failures, ...assets.diagnostics.codes.filter((code) => code.toLowerCase().includes("fail"))]);

  return {
    site: {
      siteId: normalizedSiteId,
      canonicalSlug: binding?.canonicalSlug ?? domainBinding?.canonicalSlug ?? null,
      found: Boolean(binding),
    },
    runtime: {
      activeVersion: mapActiveVersion(activeVersion),
      activeArtifact: mapActiveArtifact({ activePointer, runtimeArtifact, rawArtifact }),
      activePointer,
      resolution,
    },
    publish,
    domains: domainRows.map((bindingRow) => ({
      id: bindingRow.id,
      host: bindingRow.domain,
      status: bindingRow.status,
      verified: bindingRow.status === "active",
      lastCheckedAt: bindingRow.lastCheckedAt,
      siteVersionId: bindingRow.siteVersionId,
      verificationType: bindingRow.verificationType,
      verificationHost: bindingRow.verificationHost,
      dnsRecordType: bindingRow.dnsRecordType,
      dnsRecordHost: bindingRow.dnsRecordHost,
      dnsRecordPurpose: bindingRow.dnsRecordPurpose,
      createdAt: bindingRow.createdAt,
      updatedAt: bindingRow.updatedAt,
    })),
    readiness: combineReadiness({ siteReadiness, domainReadiness }),
    assets,
    diagnostics: {
      latestRuntimeDiagnostics: {
        resolution: resolution?.diagnostics ?? null,
        importProvenanceSummary: activeVersion?.importProvenanceSummary ?? null,
        artifactGovernance: runtimeArtifact?.artifactGovernance ?? null,
        rawImportMetadata: getRawImportMetadata(rawArtifact),
      },
      latestFailures,
      codes,
    },
    rollbackCandidates,
  };
}
