/**
 * Phase 8B-3 deterministic first limited dry-run builder.
 *
 * This module maps existing Evidence Capture data into Route, Navigation, and
 * Section models only. It does not execute a dry run, execute simulation,
 * execute reconstruction, call AI systems, generate React, generate GNR8
 * blocks, generate content, generate design tokens, persist output, dispatch
 * workers, read live sites, or publish anything.
 */

import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";
import type {
  CaptureExpansionConfidenceLevel,
  EvidenceBoundingBox,
  LayoutGeometryEvidence,
  NavigationEvidence,
  NavigationEvidenceItem,
  SectionBoundaryEvidence,
} from "./evidence-capture-layout-contract";
import {
  createEmptyFirstLimitedDryRunOutput,
  validateFirstLimitedDryRunOutput,
  type FirstLimitedDryRunOutput,
  type LimitedDryRunNavigationItem,
  type LimitedDryRunNavigationModel,
  type LimitedDryRunRouteModel,
  type LimitedDryRunSectionModel,
} from "./first-limited-dry-run-contract";
import type {
  ReconstructionDryRunLimitation,
  ReconstructionDryRunPackage,
} from "./reconstruction-dry-run-contract";

export type FirstLimitedDryRunBuilderInput = {
  evidenceCaptureBaseline?:
    | EvidenceCaptureBaselineArtifactRecord
    | EvidenceCaptureBaselineArtifactRecord[]
    | null;
  layoutGeometryEvidence?: LayoutGeometryEvidence[] | null;
  sectionBoundaryEvidence?: SectionBoundaryEvidence[] | null;
  navigationEvidence?: NavigationEvidence[] | null;
};

type LimitationCollector = {
  limitations: Map<string, ReconstructionDryRunLimitation>;
  add: (limitation: ReconstructionDryRunLimitation) => string;
};

type SectionBuildResult = {
  sectionModels: LimitedDryRunSectionModel[];
  routeLimitationRefs: Map<string, string[]>;
};

const CONFIDENCE_RANK: Record<CaptureExpansionConfidenceLevel, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
};

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function uniquePreservingOrder(values: string[]): string[] {
  return [...new Set(values)];
}

function routeRef(routePath: string): string {
  return `evidence:route:${routePath}`;
}

function layoutRouteRef(routePath: string): string {
  return `evidence:layout-geometry:${routePath}`;
}

function layoutRegionRef(routePath: string, regionId: string): string {
  return `evidence:layout-geometry:${routePath}:region:${regionId}`;
}

function sectionRef(routePath: string, sectionId: string): string {
  return `evidence:section-boundary:${routePath}:${sectionId}`;
}

function navigationRef(routePath: string): string {
  return `evidence:navigation:${routePath}`;
}

function navigationItemRef(routePath: string, position: number): string {
  return `evidence:navigation:${routePath}:item:${position}`;
}

function navModelId(routePath: string): string {
  return `nav:${routePath}`;
}

function limitationId(
  routePath: string,
  model: "route" | "navigation" | "section",
  code: string,
  sourceId?: string | number,
): string {
  return sourceId === undefined
    ? `limited-dry-run:${routePath}:${model}:${code}`
    : `limited-dry-run:${routePath}:${model}:${sourceId}:${code}`;
}

function createLimitationCollector(
  dryRunPackage: ReconstructionDryRunPackage,
): LimitationCollector {
  const limitations = new Map<string, ReconstructionDryRunLimitation>();
  for (const limitation of dryRunPackage.limitations) {
    limitations.set(limitation.limitationId, { ...limitation });
  }

  return {
    limitations,
    add(limitation) {
      if (!limitations.has(limitation.limitationId)) {
        limitations.set(limitation.limitationId, { ...limitation });
      }
      return limitation.limitationId;
    },
  };
}

function minConfidence(
  values: CaptureExpansionConfidenceLevel[],
): CaptureExpansionConfidenceLevel {
  if (values.length === 0) return "LOW";
  return values.reduce<CaptureExpansionConfidenceLevel>((lowest, value) =>
    CONFIDENCE_RANK[value] < CONFIDENCE_RANK[lowest] ? value : lowest,
  "HIGH");
}

function maxConfidence(
  values: CaptureExpansionConfidenceLevel[],
): CaptureExpansionConfidenceLevel {
  if (values.length === 0) return "LOW";
  return values.reduce<CaptureExpansionConfidenceLevel>((highest, value) =>
    CONFIDENCE_RANK[value] > CONFIDENCE_RANK[highest] ? value : highest,
  "LOW");
}

function normalizeNavigationLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeNavigationHref(value: string): string {
  return value.trim();
}

function isFinitePositiveBox(box: EvidenceBoundingBox): boolean {
  return (
    Number.isFinite(box.x) &&
    Number.isFinite(box.y) &&
    Number.isFinite(box.width) &&
    Number.isFinite(box.height) &&
    box.width > 0 &&
    box.height > 0
  );
}

function boxesEqual(first: EvidenceBoundingBox, second: EvidenceBoundingBox): boolean {
  return (
    first.x === second.x &&
    first.y === second.y &&
    first.width === second.width &&
    first.height === second.height
  );
}

function baselinesFromInput(
  input: FirstLimitedDryRunBuilderInput,
): EvidenceCaptureBaselineArtifactRecord[] {
  const baseline = input.evidenceCaptureBaseline;
  if (!baseline) return [];
  return Array.isArray(baseline) ? baseline : [baseline];
}

function collectLayoutGeometryEvidence(
  input: FirstLimitedDryRunBuilderInput,
): LayoutGeometryEvidence[] {
  const baselineEvidence = baselinesFromInput(input).flatMap(
    (baseline) => baseline.captureExpansionEvidence.layoutGeometryEvidence,
  );
  return [...baselineEvidence, ...(input.layoutGeometryEvidence ?? [])];
}

function collectSectionBoundaryEvidence(
  input: FirstLimitedDryRunBuilderInput,
): SectionBoundaryEvidence[] {
  const baselineEvidence = baselinesFromInput(input).flatMap(
    (baseline) => baseline.captureExpansionEvidence.sectionBoundaryEvidence,
  );
  return [...baselineEvidence, ...(input.sectionBoundaryEvidence ?? [])];
}

function collectNavigationEvidence(input: FirstLimitedDryRunBuilderInput): NavigationEvidence[] {
  const baselineEvidence = baselinesFromInput(input).flatMap(
    (baseline) => baseline.captureExpansionEvidence.navigationEvidence,
  );
  return [...baselineEvidence, ...(input.navigationEvidence ?? [])];
}

function buildSourceUrlByRoute(input: FirstLimitedDryRunBuilderInput): Map<string, string> {
  const sourceUrlByRoute = new Map<string, string>();
  for (const baseline of baselinesFromInput(input)) {
    if (!sourceUrlByRoute.has(baseline.routePath) && baseline.sourceUrl.trim()) {
      sourceUrlByRoute.set(baseline.routePath, baseline.sourceUrl);
    }
  }
  return sourceUrlByRoute;
}

function pushRouteLimitation(
  routeLimitationRefs: Map<string, string[]>,
  routePath: string,
  limitationRef: string,
): void {
  routeLimitationRefs.set(routePath, [
    ...(routeLimitationRefs.get(routePath) ?? []),
    limitationRef,
  ]);
}

function addEvidenceRouteMismatchLimitations(input: {
  routeScopeRoutes: Set<string>;
  baselineRoutes: string[];
  layoutGeometryEvidence: LayoutGeometryEvidence[];
  sectionBoundaryEvidence: SectionBoundaryEvidence[];
  navigationEvidence: NavigationEvidence[];
  limitations: LimitationCollector;
}): void {
  const evidenceRoutes = uniqueSorted([
    ...input.baselineRoutes,
    ...input.layoutGeometryEvidence.map((evidence) => evidence.routePath),
    ...input.sectionBoundaryEvidence.map((evidence) => evidence.routePath),
    ...input.navigationEvidence.map((evidence) => evidence.routePath),
  ]);

  for (const routePath of evidenceRoutes) {
    if (input.routeScopeRoutes.has(routePath)) continue;
    input.limitations.add({
      limitationId: limitationId(routePath, "route", "evidence_route_scope_mismatch"),
      severity: "warning",
      sourceRef: routeRef(routePath),
      message: `Evidence for route ${routePath} is outside the dry-run route scope and was not modeled.`,
    });
  }
}

function buildNavigationModels(input: {
  routeScopeRoutes: string[];
  navigationEvidence: NavigationEvidence[];
  limitations: LimitationCollector;
  routeLimitationRefs: Map<string, string[]>;
}): LimitedDryRunNavigationModel[] {
  const routeScopeSet = new Set(input.routeScopeRoutes);
  const models: LimitedDryRunNavigationModel[] = [];

  for (const routePath of input.routeScopeRoutes) {
    const routeNavigationEvidence = input.navigationEvidence
      .filter((evidence) => evidence.routePath === routePath)
      .sort((a, b) => {
        const first = a.sourceEvidenceRefs.join("|");
        const second = b.sourceEvidenceRefs.join("|");
        return first.localeCompare(second);
      });

    if (routeNavigationEvidence.length === 0) {
      const ref = input.limitations.add({
        limitationId: limitationId(routePath, "navigation", "missing_navigation_evidence"),
        severity: "blocker",
        sourceRef: navigationRef(routePath),
        message: `No navigation evidence is available for in-scope route ${routePath}.`,
      });
      pushRouteLimitation(input.routeLimitationRefs, routePath, ref);
      continue;
    }

    const sourceItems = routeNavigationEvidence.flatMap((evidence) =>
      evidence.navigationItems.map((item) => ({
        ...item,
        groupRefs: evidence.sourceEvidenceRefs,
      })),
    );
    const itemGroups = new Map<
      string,
      Array<NavigationEvidenceItem & { groupRefs: string[] }>
    >();
    const navigationLimitationRefs: string[] = [];

    for (const item of sourceItems) {
      const normalizedLabel = normalizeNavigationLabel(item.label);
      const normalizedHref = normalizeNavigationHref(item.href);
      const sourceRef = navigationItemRef(routePath, item.position);

      if (!normalizedLabel) {
        navigationLimitationRefs.push(input.limitations.add({
          limitationId: limitationId(routePath, "navigation", "blank_label", item.position),
          severity: "warning",
          sourceRef,
          message: `Navigation item at position ${item.position} on ${routePath} has a blank label and was omitted.`,
        }));
        continue;
      }

      if (!normalizedHref) {
        navigationLimitationRefs.push(input.limitations.add({
          limitationId: limitationId(routePath, "navigation", "blank_href", item.position),
          severity: "warning",
          sourceRef,
          message: `Navigation item ${normalizedLabel} at position ${item.position} on ${routePath} has a blank href and was omitted.`,
        }));
        continue;
      }

      const key = `${normalizedLabel}\u0000${normalizedHref}`;
      itemGroups.set(key, [...(itemGroups.get(key) ?? []), item]);
    }

    const retainedItems = [...itemGroups.values()]
      .map((duplicates) => {
        const orderedDuplicates = [...duplicates].sort((a, b) =>
          a.position - b.position ||
          normalizeNavigationHref(a.href).localeCompare(normalizeNavigationHref(b.href)) ||
          normalizeNavigationLabel(a.label).localeCompare(normalizeNavigationLabel(b.label)),
        );
        const retained = orderedDuplicates[0];
        const sourcePositions = orderedDuplicates.map((item) => item.position);
        const sourceEvidenceRefs = uniqueSorted([
          ...orderedDuplicates.flatMap((item) => item.groupRefs),
          ...sourcePositions.map((position) => navigationItemRef(routePath, position)),
        ]);

        if (orderedDuplicates.length > 1) {
          navigationLimitationRefs.push(input.limitations.add({
            limitationId: limitationId(
              routePath,
              "navigation",
              "duplicate_navigation_items_merged",
              retained.position,
            ),
            severity: "warning",
            sourceRef: navigationItemRef(routePath, retained.position),
            message: `Duplicate navigation items for ${normalizeNavigationLabel(retained.label)} on ${routePath} were merged deterministically.`,
          }));
        }

        if (orderedDuplicates.some((item) => item.confidenceLevel === "LOW")) {
          navigationLimitationRefs.push(input.limitations.add({
            limitationId: limitationId(routePath, "navigation", "low_confidence", retained.position),
            severity: "warning",
            sourceRef: navigationItemRef(routePath, retained.position),
            message: `Navigation item ${normalizeNavigationLabel(retained.label)} on ${routePath} includes low-confidence evidence.`,
          }));
        }

        if (
          normalizeNavigationHref(retained.href).startsWith("/") &&
          !routeScopeSet.has(normalizeNavigationHref(retained.href))
        ) {
          navigationLimitationRefs.push(input.limitations.add({
            limitationId: limitationId(
              routePath,
              "navigation",
              "out_of_scope_href",
              retained.position,
            ),
            severity: "warning",
            sourceRef: navigationItemRef(routePath, retained.position),
            message: `Navigation href ${normalizeNavigationHref(retained.href)} on ${routePath} is outside the dry-run route scope.`,
          }));
        }

        return {
          label: retained.label,
          href: retained.href,
          sourcePosition: retained.position,
          confidenceLevel: maxConfidence(orderedDuplicates.map((item) => item.confidenceLevel)),
          sourceEvidenceRefs,
        };
      })
      .sort((a, b) =>
        a.sourcePosition - b.sourcePosition ||
        normalizeNavigationHref(a.href).localeCompare(normalizeNavigationHref(b.href)) ||
        normalizeNavigationLabel(a.label).localeCompare(normalizeNavigationLabel(b.label)),
      );

    if (retainedItems.length === 0) {
      navigationLimitationRefs.push(input.limitations.add({
        limitationId: limitationId(routePath, "navigation", "empty_navigation_items"),
        severity: "blocker",
        sourceRef: navigationRef(routePath),
        message: `Navigation evidence for ${routePath} produced no retained navigation items.`,
      }));
    }

    const items: LimitedDryRunNavigationItem[] = retainedItems.map((item, index) => ({
      label: item.label,
      href: item.href,
      position: index,
      confidenceLevel: item.confidenceLevel,
      sourceEvidenceRefs: item.sourceEvidenceRefs,
    }));

    const sourceEvidenceRefs = uniqueSorted([
      navigationRef(routePath),
      ...routeNavigationEvidence.flatMap((evidence) => evidence.sourceEvidenceRefs),
      ...items.flatMap((item) => item.sourceEvidenceRefs),
    ]);

    models.push({
      navigationId: navModelId(routePath),
      routePath,
      items,
      confidenceLevel: minConfidence(items.map((item) => item.confidenceLevel)),
      sourceEvidenceRefs,
      limitationRefs: uniqueSorted(navigationLimitationRefs),
    });
  }

  return models;
}

function buildSectionModels(input: {
  routeScopeRoutes: string[];
  sectionBoundaryEvidence: SectionBoundaryEvidence[];
  layoutGeometryEvidence: LayoutGeometryEvidence[];
  limitations: LimitationCollector;
}): SectionBuildResult {
  const sectionModels: LimitedDryRunSectionModel[] = [];
  const routeLimitationRefs = new Map<string, string[]>();

  for (const routePath of input.routeScopeRoutes) {
    const routeSections = input.sectionBoundaryEvidence.filter(
      (evidence) => evidence.routePath === routePath,
    );
    const routeLayoutGeometry = input.layoutGeometryEvidence.filter(
      (evidence) => evidence.routePath === routePath,
    );

    if (routeSections.length === 0) {
      const ref = input.limitations.add({
        limitationId: limitationId(routePath, "section", "missing_section_evidence"),
        severity: "blocker",
        sourceRef: sectionRef(routePath, "missing"),
        message: `No section boundary evidence is available for in-scope route ${routePath}.`,
      });
      pushRouteLimitation(routeLimitationRefs, routePath, ref);
      continue;
    }

    const sectionIdCounts = new Map<string, number>();

    for (const evidence of [...routeSections].sort((a, b) =>
      a.boundingBox.y - b.boundingBox.y ||
      a.boundingBox.x - b.boundingBox.x ||
      a.boundingBox.height - b.boundingBox.height ||
      a.boundingBox.width - b.boundingBox.width ||
      a.sectionId.localeCompare(b.sectionId),
    )) {
      const sourceRef = sectionRef(evidence.routePath, evidence.sectionId);
      const sectionLimitationRefs: string[] = [];

      if (!evidence.selector.trim()) {
        const ref = input.limitations.add({
          limitationId: limitationId(routePath, "section", "blank_selector", evidence.sectionId),
          severity: "blocker",
          sourceRef,
          message: `Section ${evidence.sectionId} on ${routePath} has a blank selector and was omitted.`,
        });
        pushRouteLimitation(routeLimitationRefs, routePath, ref);
        continue;
      }

      if (!isFinitePositiveBox(evidence.boundingBox)) {
        const ref = input.limitations.add({
          limitationId: limitationId(routePath, "section", "invalid_bounding_box", evidence.sectionId),
          severity: "blocker",
          sourceRef,
          message: `Section ${evidence.sectionId} on ${routePath} has an invalid bounding box and was omitted.`,
        });
        pushRouteLimitation(routeLimitationRefs, routePath, ref);
        continue;
      }

      const duplicateOrdinal = sectionIdCounts.get(evidence.sectionId) ?? 0;
      sectionIdCounts.set(evidence.sectionId, duplicateOrdinal + 1);
      const sectionId = duplicateOrdinal === 0
        ? evidence.sectionId
        : `${evidence.sectionId}:${duplicateOrdinal}`;

      if (duplicateOrdinal > 0) {
        sectionLimitationRefs.push(input.limitations.add({
          limitationId: limitationId(routePath, "section", "duplicate_section_id", evidence.sectionId),
          severity: "warning",
          sourceRef,
          message: `Duplicate section ID ${evidence.sectionId} on ${routePath} was suffixed deterministically.`,
        }));
      }

      if (evidence.confidenceLevel === "LOW") {
        sectionLimitationRefs.push(input.limitations.add({
          limitationId: limitationId(routePath, "section", "low_confidence", evidence.sectionId),
          severity: "warning",
          sourceRef,
          message: `Section ${evidence.sectionId} on ${routePath} has low confidence.`,
        }));
      }

      if (evidence.regionType === "unknown") {
        sectionLimitationRefs.push(input.limitations.add({
          limitationId: limitationId(routePath, "section", "unknown_region_type", evidence.sectionId),
          severity: "warning",
          sourceRef,
          message: `Section ${evidence.sectionId} on ${routePath} has unknown region type.`,
        }));
      }

      const matchingRegions = routeLayoutGeometry.flatMap((geometry) =>
        geometry.regions.filter((region) => region.selector === evidence.selector).map((region) => ({
          geometry,
          region,
        })),
      );
      const sourceEvidenceRefs = [sourceRef];

      if (matchingRegions.length > 0) {
        sourceEvidenceRefs.push(layoutRouteRef(routePath));
        sourceEvidenceRefs.push(
          ...matchingRegions.map(({ region }) => layoutRegionRef(routePath, region.regionId)),
        );

        if (
          matchingRegions.some(({ region }) => !boxesEqual(region.boundingBox, evidence.boundingBox))
        ) {
          sectionLimitationRefs.push(input.limitations.add({
            limitationId: limitationId(
              routePath,
              "section",
              "layout_bounding_box_disagreement",
              evidence.sectionId,
            ),
            severity: "warning",
            sourceRef,
            message: `Section ${evidence.sectionId} on ${routePath} keeps section boundary geometry because layout geometry disagrees.`,
          }));
        }
      } else if (routeLayoutGeometry.length > 0) {
        sourceEvidenceRefs.push(layoutRouteRef(routePath));
        sectionLimitationRefs.push(input.limitations.add({
          limitationId: limitationId(routePath, "section", "missing_layout_match", evidence.sectionId),
          severity: "warning",
          sourceRef,
          message: `Section ${evidence.sectionId} on ${routePath} has no matching layout geometry selector.`,
        }));
      } else {
        sectionLimitationRefs.push(input.limitations.add({
          limitationId: limitationId(routePath, "section", "missing_layout_geometry", evidence.sectionId),
          severity: "warning",
          sourceRef,
          message: `Section ${evidence.sectionId} on ${routePath} has no route-level layout geometry evidence.`,
        }));
      }

      sectionModels.push({
        sectionId,
        routePath: evidence.routePath,
        regionType: evidence.regionType,
        selector: evidence.selector,
        boundingBox: { ...evidence.boundingBox },
        confidenceLevel: evidence.confidenceLevel,
        sourceEvidenceRefs: uniqueSorted(sourceEvidenceRefs),
        limitationRefs: uniqueSorted(sectionLimitationRefs),
      });
    }
  }

  return { sectionModels, routeLimitationRefs };
}

function buildRouteModels(input: {
  routeScopeRoutes: string[];
  sourceUrlByRoute: Map<string, string>;
  sectionModels: LimitedDryRunSectionModel[];
  navigationModels: LimitedDryRunNavigationModel[];
  routeLimitationRefs: Map<string, string[]>;
  limitations: LimitationCollector;
}): LimitedDryRunRouteModel[] {
  return input.routeScopeRoutes.flatMap((routePath): LimitedDryRunRouteModel[] => {
    const sourceUrl = input.sourceUrlByRoute.get(routePath);
    if (!sourceUrl) {
      input.limitations.add({
        limitationId: limitationId(routePath, "route", "missing_source_url"),
        severity: "blocker",
        sourceRef: routeRef(routePath),
        message: `No captured source URL is available for in-scope route ${routePath}.`,
      });
      return [];
    }

    const routeSections = input.sectionModels.filter((model) => model.routePath === routePath);
    const routeNavigation = input.navigationModels.filter((model) => model.routePath === routePath);
    const limitationRefs = uniqueSorted(input.routeLimitationRefs.get(routePath) ?? []);
    const confidenceInputs = [
      ...routeSections.map((model) => model.confidenceLevel),
      ...routeNavigation.map((model) => model.confidenceLevel),
    ];

    return [{
      routePath,
      sourceUrl,
      sectionRefs: routeSections.map((model) => model.sectionId),
      navigationRefs: routeNavigation.map((model) => model.navigationId),
      limitationRefs,
      confidenceLevel:
        routeSections.length === 0 || routeNavigation.length === 0
          ? "LOW"
          : minConfidence(confidenceInputs),
    }];
  });
}

export function buildFirstLimitedDryRunOutput(
  dryRunPackage: ReconstructionDryRunPackage,
  input: FirstLimitedDryRunBuilderInput = {},
): FirstLimitedDryRunOutput {
  const output = createEmptyFirstLimitedDryRunOutput(dryRunPackage);
  const limitations = createLimitationCollector(dryRunPackage);
  const routeScopeRoutes = uniquePreservingOrder(dryRunPackage.routeScope.routes);
  const routeScopeSet = new Set(routeScopeRoutes);
  const baselineRecords = baselinesFromInput(input);
  const sourceUrlByRoute = buildSourceUrlByRoute(input);
  const layoutGeometryEvidence = collectLayoutGeometryEvidence(input);
  const sectionBoundaryEvidence = collectSectionBoundaryEvidence(input);
  const navigationEvidence = collectNavigationEvidence(input);

  addEvidenceRouteMismatchLimitations({
    routeScopeRoutes: routeScopeSet,
    baselineRoutes: baselineRecords.map((baseline) => baseline.routePath),
    layoutGeometryEvidence,
    sectionBoundaryEvidence,
    navigationEvidence,
    limitations,
  });

  const sectionResult = buildSectionModels({
    routeScopeRoutes,
    sectionBoundaryEvidence,
    layoutGeometryEvidence,
    limitations,
  });
  const routeLimitationRefs = sectionResult.routeLimitationRefs;
  const navigationModels = buildNavigationModels({
    routeScopeRoutes,
    navigationEvidence,
    limitations,
    routeLimitationRefs,
  });
  const routeModels = buildRouteModels({
    routeScopeRoutes,
    sourceUrlByRoute,
    sectionModels: sectionResult.sectionModels,
    navigationModels,
    routeLimitationRefs,
    limitations,
  });

  const evidenceRefs = uniqueSorted([
    ...(baselineRecords.length > 0 ? ["evidence:capture-baseline"] : []),
    ...routeModels.map((model) => routeRef(model.routePath)),
    ...navigationModels.flatMap((model) => model.sourceEvidenceRefs),
    ...sectionResult.sectionModels.flatMap((model) => model.sourceEvidenceRefs),
    ...[...limitations.limitations.values()].flatMap((limitation) =>
      limitation.sourceRef ? [limitation.sourceRef] : [],
    ),
  ]);

  const builtOutput: FirstLimitedDryRunOutput = {
    ...output,
    routeModels,
    navigationModels,
    sectionModels: sectionResult.sectionModels,
    limitations: [...limitations.limitations.values()].sort((a, b) =>
      a.limitationId.localeCompare(b.limitationId),
    ),
    evidenceRefs,
    outputStatus:
      routeModels.length !== routeScopeRoutes.length ||
      routeModels.some((model) => model.sectionRefs.length === 0 || model.navigationRefs.length === 0)
        ? "blocked"
        : "valid",
  };

  const validation = validateFirstLimitedDryRunOutput(builtOutput);
  return validation.valid ? builtOutput : { ...builtOutput, outputStatus: "invalid" };
}
