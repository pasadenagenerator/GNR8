/**
 * Phase 8A-4 capture expansion contracts for first Dry Run readiness.
 *
 * This module defines evidence shapes and a pure readiness helper only. It does
 * not implement browser capture, DOM extraction, runtime observation, Dry Run
 * execution, reconstruction execution, AI generation, React generation, block
 * generation, persistence, or publishing.
 */

export const CAPTURE_EXPANSION_CONTRACT_VERSION = "8A-4" as const;

export type EvidenceBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayoutGeometryRegion = {
  regionId: string;
  tagName: string;
  role: string | null;
  selector: string;
  boundingBox: EvidenceBoundingBox;
  childCount: number;
};

export type LayoutGeometryEvidence = {
  routePath: string;
  viewportWidth: number;
  viewportHeight: number;
  documentHeight: number;
  regions: LayoutGeometryRegion[];
  capturedAt: string;
};

export const SECTION_BOUNDARY_REGION_TYPES = [
  "hero",
  "navigation",
  "content",
  "sidebar",
  "footer",
  "gallery",
  "form",
  "map",
  "unknown",
] as const;
export type SectionBoundaryRegionType = (typeof SECTION_BOUNDARY_REGION_TYPES)[number];

export const CAPTURE_EXPANSION_CONFIDENCE_LEVELS = [
  "LOW",
  "MEDIUM",
  "HIGH",
] as const;
export type CaptureExpansionConfidenceLevel =
  (typeof CAPTURE_EXPANSION_CONFIDENCE_LEVELS)[number];

export type SectionBoundaryEvidence = {
  sectionId: string;
  routePath: string;
  selector: string;
  boundingBox: EvidenceBoundingBox;
  regionType: SectionBoundaryRegionType;
  confidenceLevel: CaptureExpansionConfidenceLevel;
};

export type NavigationEvidenceItem = {
  label: string;
  href: string;
  position: number;
  confidenceLevel: CaptureExpansionConfidenceLevel;
};

export type NavigationEvidence = {
  routePath: string;
  navigationItems: NavigationEvidenceItem[];
  navigationCount: number;
  sourceEvidenceRefs: string[];
};

export const RUNTIME_MUTATION_TYPES = [
  "dom_insert",
  "dom_remove",
  "dom_replace",
  "style_change",
  "attribute_change",
  "unknown",
] as const;
export type RuntimeMutationType = (typeof RUNTIME_MUTATION_TYPES)[number];

export type RuntimeMutationEvidence = {
  routePath: string;
  mutationDetected: boolean;
  mutationCount: number;
  mutationTypes: RuntimeMutationType[];
  observedSelectors: string[];
};

export type CaptureExpansionReadinessStatus = "READY" | "PARTIAL" | "MISSING";

export type CaptureExpansionReadinessInput = {
  routePaths?: string[];
  layoutGeometryEvidence?: LayoutGeometryEvidence[];
  sectionBoundaryEvidence?: SectionBoundaryEvidence[];
  navigationEvidence?: NavigationEvidence[];
  runtimeMutationEvidence?: RuntimeMutationEvidence[];
};

export type CaptureExpansionReadinessEvaluation = {
  routeModel: CaptureExpansionReadinessStatus;
  navigationModel: CaptureExpansionReadinessStatus;
  sectionModel: CaptureExpansionReadinessStatus;
  evidenceTypesPresent: {
    routePaths: boolean;
    layoutGeometry: boolean;
    sectionBoundaries: boolean;
    navigation: boolean;
    runtimeMutation: boolean;
  };
};

function hasText(value: string | null | undefined): boolean {
  return Boolean(String(value ?? "").trim());
}

function hasPositiveBox(box: EvidenceBoundingBox): boolean {
  return box.width > 0 && box.height > 0;
}

function hasRoutePath(input: CaptureExpansionReadinessInput): boolean {
  return [
    ...(input.routePaths ?? []),
    ...(input.layoutGeometryEvidence ?? []).map((evidence) => evidence.routePath),
    ...(input.sectionBoundaryEvidence ?? []).map((evidence) => evidence.routePath),
    ...(input.navigationEvidence ?? []).map((evidence) => evidence.routePath),
    ...(input.runtimeMutationEvidence ?? []).map((evidence) => evidence.routePath),
  ].some(hasText);
}

function hasLayoutGeometry(input: CaptureExpansionReadinessInput): boolean {
  return (input.layoutGeometryEvidence ?? []).some((evidence) =>
    hasText(evidence.routePath) &&
    evidence.viewportWidth > 0 &&
    evidence.viewportHeight > 0 &&
    evidence.documentHeight > 0 &&
    evidence.regions.some((region) => hasText(region.selector) && hasPositiveBox(region.boundingBox)),
  );
}

function hasNavigationRegion(input: CaptureExpansionReadinessInput): boolean {
  return (input.layoutGeometryEvidence ?? []).some((evidence) =>
    evidence.regions.some((region) =>
      region.role === "navigation" ||
      region.tagName.toLowerCase() === "nav" ||
      /nav|menu|header/i.test(region.selector),
    ),
  ) || (input.sectionBoundaryEvidence ?? []).some((evidence) => evidence.regionType === "navigation");
}

function hasNavigationEvidence(input: CaptureExpansionReadinessInput): boolean {
  return (input.navigationEvidence ?? []).some((evidence) =>
    hasText(evidence.routePath) &&
    evidence.navigationCount > 0 &&
    evidence.navigationItems.length > 0 &&
    evidence.sourceEvidenceRefs.length > 0,
  );
}

function hasSectionBoundary(input: CaptureExpansionReadinessInput): boolean {
  return (input.sectionBoundaryEvidence ?? []).some((evidence) =>
    hasText(evidence.sectionId) &&
    hasText(evidence.routePath) &&
    hasText(evidence.selector) &&
    hasPositiveBox(evidence.boundingBox) &&
    evidence.regionType !== "unknown" &&
    evidence.confidenceLevel !== "LOW",
  );
}

function hasRuntimeMutationEvidence(input: CaptureExpansionReadinessInput): boolean {
  return (input.runtimeMutationEvidence ?? []).some((evidence) =>
    hasText(evidence.routePath) &&
    evidence.mutationCount >= 0 &&
    evidence.mutationTypes.length > 0,
  );
}

export function evaluateCaptureExpansionReadiness(
  input: CaptureExpansionReadinessInput,
): CaptureExpansionReadinessEvaluation {
  const routePaths = hasRoutePath(input);
  const layoutGeometry = hasLayoutGeometry(input);
  const sectionBoundaries = hasSectionBoundary(input);
  const navigation = hasNavigationEvidence(input);
  const navigationRegion = hasNavigationRegion(input);
  const runtimeMutation = hasRuntimeMutationEvidence(input);

  const routeModel: CaptureExpansionReadinessStatus = routePaths || layoutGeometry
    ? "READY"
    : sectionBoundaries || navigation || runtimeMutation
      ? "PARTIAL"
      : "MISSING";

  const navigationModel: CaptureExpansionReadinessStatus = navigation
    ? "READY"
    : navigationRegion
      ? "PARTIAL"
      : "MISSING";

  const sectionModel: CaptureExpansionReadinessStatus = layoutGeometry && sectionBoundaries && runtimeMutation
    ? "READY"
    : layoutGeometry || sectionBoundaries || runtimeMutation
      ? "PARTIAL"
      : "MISSING";

  return {
    routeModel,
    navigationModel,
    sectionModel,
    evidenceTypesPresent: {
      routePaths,
      layoutGeometry,
      sectionBoundaries,
      navigation,
      runtimeMutation,
    },
  };
}
