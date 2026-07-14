import { sha256Hex, stableStringify } from "../runtime/deterministic";
import {
  buildBusinessDiscoveryFromSiteEvidence,
  type BusinessDiscoveryBuilderInput,
} from "./business-discovery-builder";
import type { BusinessDiscoveryArtifact } from "./business-discovery-contract";
import type { CaptureExpansionConfidenceLevel, SectionBoundaryRegionType } from "./evidence-capture-layout-contract";
import type {
  SourceNavigationUnderstanding,
  SourceSectionUnderstanding,
  SourceWebsiteLimitation,
  SourceWebsiteUnderstandingProjection,
} from "./source-website-understanding-projection-contract";

export type BusinessDiscoveryWebsiteUnderstandingAdapterBlocker = {
  code: string;
  message: string;
  sourceRefs: string[];
};

export type BusinessDiscoveryWebsiteUnderstandingAdapterResult =
  | {
    status: "ready";
    input: BusinessDiscoveryBuilderInput;
    diagnostics: string[];
  }
  | {
    status: "blocked";
    blockers: BusinessDiscoveryWebsiteUnderstandingAdapterBlocker[];
    diagnostics: string[];
  };

export type ShadowBusinessDiscoveryResult =
  | {
    status: "built";
    shadowMarker: "business_discovery_website_understanding_shadow";
    shadowArtifactId: string;
    contentIdentity: string;
    artifact: BusinessDiscoveryArtifact;
    adapterInput: BusinessDiscoveryBuilderInput;
    diagnostics: string[];
  }
  | {
    status: "blocked";
    shadowMarker: "business_discovery_website_understanding_shadow";
    blockers: BusinessDiscoveryWebsiteUnderstandingAdapterBlocker[];
    diagnostics: string[];
  };

const SECTION_REGION_TYPES = new Set<SectionBoundaryRegionType>([
  "hero",
  "navigation",
  "content",
  "sidebar",
  "footer",
  "gallery",
  "form",
  "map",
  "unknown",
]);

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort((left, right) => left.localeCompare(right));
}

function confidenceLevel(level: string | null | undefined): CaptureExpansionConfidenceLevel {
  return level === "HIGH" || level === "MEDIUM" || level === "LOW" ? level : "LOW";
}

function sectionRegionType(value: string | null | undefined): SectionBoundaryRegionType {
  return value && SECTION_REGION_TYPES.has(value as SectionBoundaryRegionType)
    ? value as SectionBoundaryRegionType
    : "unknown";
}

function routePath(value: string | null | undefined): string {
  const clean = String(value ?? "/").split("#")[0].split("?")[0].trim().replace(/\\/g, "/");
  const withSlash = clean.startsWith("/") ? clean : `/${clean}`;
  return withSlash.replace(/\/{2,}/g, "/").replace(/\/+$/g, "") || "/";
}

function sourceUrl(projection: SourceWebsiteUnderstandingProjection): string | null {
  return text(projection.sourceIdentity.sourceUrl) ?? text(projection.sourceIdentity.finalUrl);
}

function upstreamLimitations(projection: SourceWebsiteUnderstandingProjection): SourceWebsiteLimitation[] {
  return projection.limitations.filter((item) =>
    item.code === "UPSTREAM_EVIDENCE_LIMITATION" ||
    item.code === "UPSTREAM_FIDELITY_LIMITATION");
}

function currentBaselineLimitations(projection: SourceWebsiteUnderstandingProjection): string[] {
  return upstreamLimitations(projection)
    .filter((item) => item.code === "UPSTREAM_EVIDENCE_LIMITATION")
    .map((item) => item.message);
}

function currentFidelityLimitations(projection: SourceWebsiteUnderstandingProjection) {
  return upstreamLimitations(projection)
    .filter((item) => item.code === "UPSTREAM_FIDELITY_LIMITATION")
    .map((item) => {
      const diagnostics = item.diagnostics ?? [];
      return {
        type: item.originalCode ?? diagnostics[0] ?? "source_understanding_fidelity_limitation",
        affectedLayer: diagnostics[1] ?? "evidence_capture",
        severity: item.severity === "info" ? "info" : item.severity === "blocking" ? "blocking" : "warning",
        explanation: item.message,
        recommendedNextLayer: diagnostics[2] ?? "manual_review",
        evidenceRefIds: item.sourceRefs,
      };
    });
}

function navigationEvidence(projection: SourceWebsiteUnderstandingProjection) {
  const byRoute = new Map<string, SourceNavigationUnderstanding[]>();
  for (const item of projection.navigation) {
    const path = routePath(item.routePath ?? "/");
    byRoute.set(path, [...(byRoute.get(path) ?? []), item]);
  }
  return [...byRoute.entries()].map(([path, items]) => ({
    routePath: path,
    navigationItems: items
      .slice()
      .sort((left, right) => left.label.localeCompare(right.label) || String(left.href ?? "").localeCompare(String(right.href ?? "")))
      .map((item, index) => ({
        label: item.label,
        href: item.href ?? "",
        position: index,
        confidenceLevel: confidenceLevel(item.confidence.level),
      })),
    navigationCount: items.length,
    sourceEvidenceRefs: uniqueSorted(items.flatMap((item) => item.evidenceRefs)),
  }));
}

function sectionBoundaryEvidence(projection: SourceWebsiteUnderstandingProjection) {
  return projection.sections
    .filter((item): item is SourceSectionUnderstanding => !item.plannedOnly && Boolean(item.semanticType))
    .map((item, index) => ({
      sectionId: item.sectionId,
      routePath: routePath(item.routePath ?? "/"),
      selector: `source-understanding-section-${index}`,
      boundingBox: { x: 0, y: index, width: 1, height: 1 },
      regionType: sectionRegionType(item.semanticType),
      confidenceLevel: confidenceLevel(item.confidence.level),
    }));
}

function routeCandidates(projection: SourceWebsiteUnderstandingProjection): string[] {
  return uniqueSorted(projection.routes.map((route) => route.routePath));
}

function syntheticCandidateDiscoveryResult(projection: SourceWebsiteUnderstandingProjection) {
  const artifactId = projection.candidateArtifactRefs[0]?.artifactId ?? null;
  if (!artifactId || !projection.dryRunId) return { artifactId: null, result: null };
  const candidateIds = uniqueSorted([
    ...projection.routes.map((item) => item.routeId),
    ...projection.navigation.map((item) => item.sourceCandidateId ?? "").filter(Boolean),
    ...projection.sections.map((item) => item.sourceCandidateId ?? "").filter(Boolean),
  ]);
  return {
    artifactId,
    result: {
      discoveryId: projection.candidateArtifactRefs[0]?.canonicalId ?? artifactId,
      siteVersionId: projection.siteVersionId,
      dryRunId: projection.dryRunId,
      createdAt: projection.generatedAt,
      candidateCount: candidateIds.length,
      candidateTypesPresent: ["route"],
      candidates: projection.routes.map((route) => ({
        candidateId: route.routeId,
        candidateType: "route",
        candidateStatus: route.state,
        routePath: route.routePath,
        confidence: route.confidence,
        sourceEvidenceRefs: route.evidenceRefs.map((refId) => ({ refId, sourceKind: "route", routePath: route.routePath })),
        sourceDryRunRefs: [],
        limitations: route.limitations.map((code) => ({ code, message: code, severity: "warning" })),
        diagnostics: [],
      })),
      limitations: [],
      diagnostics: projection.diagnostics.map((item) => item.code),
    },
  };
}

function syntheticEvidenceCaptureBaseline(projection: SourceWebsiteUnderstandingProjection) {
  const path = projection.routes[0]?.routePath ?? "/";
  return {
    kind: "evidence_capture_baseline",
    artifactVersion: 1,
    captureRunId: projection.evidenceArtifactRefs.find((ref) => ref.kind === "evidence_capture_baseline")?.artifactId ?? `source-understanding:${projection.projectionId}`,
    siteVersionId: projection.siteVersionId,
    sourceUrl: sourceUrl(projection) ?? "",
    finalUrl: projection.sourceIdentity.finalUrl,
    routePath: path,
    captureStatus: projection.sourceIdentity.sourceAvailability === "failed" ? "failed" : "completed",
    captureExpansionEvidence: {
      layoutGeometryEvidence: [],
      sectionBoundaryEvidence: sectionBoundaryEvidence(projection),
      navigationEvidence: navigationEvidence(projection),
    },
    persistedRefs: {
      rawImportArtifactId: projection.sourceArtifactRefs[0]?.artifactId ?? null,
    },
    summaries: {
      assetInventory: {
        persistedAssetCount: projection.assets.length,
      },
    },
    limitations: currentBaselineLimitations(projection),
    fidelityLimitations: currentFidelityLimitations(projection),
  };
}

function importProvenanceSummary(projection: SourceWebsiteUnderstandingProjection) {
  return {
    kind: "runtime_import_provenance_summary_v1",
    sourceMode: projection.connectorType === "raw_html_fallback" ? "raw_html_fallback" : "rendered_dom",
    importDiagnosticCodes: uniqueSorted(projection.diagnostics.map((item) => item.code)),
    multiPageDiscovery: {
      manifest: {
        seedUrl: sourceUrl(projection),
        routeCandidates: routeCandidates(projection),
        discoveredPages: projection.routes.map((route) => ({ normalizedRoutePath: route.routePath })),
      },
      rawArtifactAssembly: {
        routeMap: projection.routes.map((route) => ({ routePath: route.routePath })),
      },
    },
  };
}

export function buildBusinessDiscoveryInputFromWebsiteUnderstanding(
  projection: SourceWebsiteUnderstandingProjection,
): BusinessDiscoveryWebsiteUnderstandingAdapterResult {
  const blockers: BusinessDiscoveryWebsiteUnderstandingAdapterBlocker[] = [];
  if (!projection.siteVersionId) {
    blockers.push({ code: "SITE_VERSION_ID_MISSING", message: "Website Understanding projection is missing siteVersionId.", sourceRefs: [projection.projectionId] });
  }
  if (!projection.sourceSiteId) {
    blockers.push({ code: "SOURCE_SITE_ID_MISSING", message: "Website Understanding projection is missing sourceSiteId.", sourceRefs: [projection.projectionId] });
  }
  if (!projection.dryRunId) {
    blockers.push({ code: "DRY_RUN_ID_MISSING", message: "Website Understanding projection is missing dryRunId required by Business Discovery.", sourceRefs: [projection.projectionId] });
  }
  if (!sourceUrl(projection)) {
    blockers.push({ code: "SOURCE_URL_MISSING", message: "Website Understanding projection is missing source URL.", sourceRefs: [projection.projectionId] });
  }
  if (projection.readiness.blockers.length > 0) {
    blockers.push(...projection.readiness.blockers.map((item) => ({
      code: item.code,
      message: item.message,
      sourceRefs: item.sourceRefs,
    })));
  }
  if (blockers.length > 0) {
    return {
      status: "blocked",
      blockers,
      diagnostics: ["BUSINESS_DISCOVERY_WU_ADAPTER_BLOCKED"],
    };
  }

  const candidateDiscovery = syntheticCandidateDiscoveryResult(projection);
  return {
    status: "ready",
    input: {
      siteVersionId: projection.siteVersionId,
      dryRunId: projection.dryRunId!,
      sourceSiteId: projection.sourceSiteId,
      sourceUrl: sourceUrl(projection),
      createdAt: projection.generatedAt,
      importProvenanceSummary: importProvenanceSummary(projection) as never,
      evidenceCaptureBaseline: syntheticEvidenceCaptureBaseline(projection) as never,
      candidateDiscoveryArtifactId: candidateDiscovery.artifactId,
      candidateDiscoveryResult: candidateDiscovery.result as never,
    },
    diagnostics: [
      "BUSINESS_DISCOVERY_WU_ADAPTER_READY",
      "BUSINESS_DISCOVERY_WU_ADAPTER_NO_PERSISTENCE",
      "BUSINESS_DISCOVERY_WU_ADAPTER_NO_RAW_ARTIFACT_ACCESS",
    ],
  };
}

export function buildShadowBusinessDiscoveryFromWebsiteUnderstanding(
  projection: SourceWebsiteUnderstandingProjection,
): ShadowBusinessDiscoveryResult {
  const adapter = buildBusinessDiscoveryInputFromWebsiteUnderstanding(projection);
  if (adapter.status === "blocked") {
    return {
      status: "blocked",
      shadowMarker: "business_discovery_website_understanding_shadow",
      blockers: adapter.blockers,
      diagnostics: adapter.diagnostics,
    };
  }
  const artifact = buildBusinessDiscoveryFromSiteEvidence(adapter.input);
  const contentIdentity = sha256Hex(stableStringify({
    shadowMarker: "business_discovery_website_understanding_shadow",
    artifact,
  }));
  return {
    status: "built",
    shadowMarker: "business_discovery_website_understanding_shadow",
    shadowArtifactId: `business_discovery_shadow_${contentIdentity.slice(0, 32)}`,
    contentIdentity,
    artifact,
    adapterInput: adapter.input,
    diagnostics: adapter.diagnostics,
  };
}
