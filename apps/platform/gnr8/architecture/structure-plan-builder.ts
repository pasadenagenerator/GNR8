/**
 * Phase 8F-3 Structure Plan builder.
 *
 * Pure deterministic mapping from one exact latest persisted Reconstruction
 * Package artifact into a metadata-only Structure Plan. This module does not
 * persist, generate, execute, publish, enqueue workers, or call AI systems.
 */

import {
  validateReconstructionPackage,
  type ReconstructionPackage,
  type ReconstructionPackageCandidateRef,
} from "./reconstruction-package-contract";
import {
  STRUCTURE_PLAN_CONTRACT_VERSION,
  validateStructurePlan,
  type StructurePlan,
  type StructurePlanAssignment,
  type StructurePlanCandidateRef,
  type StructurePlanNavigation,
  type StructurePlanRoute,
  type StructurePlanSection,
  type StructurePlanStatus,
} from "./structure-plan-contract";

export type BuildStructurePlanInput = {
  readonly reconstructionPackage: ReconstructionPackage;
  readonly reconstructionPackageArtifactId: string;
  readonly latestReconstructionPackageArtifactId: string;
  readonly contractVersion?: typeof STRUCTURE_PLAN_CONTRACT_VERSION;
};

type CandidateBlocker = {
  readonly candidateId: string;
  readonly candidateType: ReconstructionPackageCandidateRef["candidateType"];
  readonly reason: string;
};

type PlannedRouteDraft = StructurePlanRoute & {
  readonly sourceIndex: number;
};

type PlannedNavigationDraft = StructurePlanNavigation & {
  readonly routeOrder: number;
  readonly sourceIndex: number;
};

type PlannedSectionDraft = Omit<StructurePlanSection, "sectionOrder" | "plannedSectionId"> & {
  readonly routeOrder: number;
  readonly sourceIndex: number;
  readonly sourceCandidateId: string;
};

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

function stableRef(value: string): string {
  return encodeURIComponent(value);
}

function unknownLimitations(value: unknown, source: string): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((limitation, index) => {
    if (typeof limitation === "string") return `${source}:${limitation}`;
    if (typeof limitation === "object" && limitation !== null) {
      return `${source}:${JSON.stringify(limitation)}`;
    }
    return `${source}:limitation[${index}]=${String(limitation)}`;
  });
}

function hasRoutePath(candidateRef: ReconstructionPackageCandidateRef): candidateRef is ReconstructionPackageCandidateRef & { readonly routePath: string } {
  return typeof candidateRef.routePath === "string" && candidateRef.routePath.length > 0;
}

function toStructurePlanCandidateRef(candidateRef: ReconstructionPackageCandidateRef): StructurePlanCandidateRef {
  return {
    candidateId: candidateRef.candidateId,
    candidateType: candidateRef.candidateType,
    ...(candidateRef.routePath ? { routePath: candidateRef.routePath } : {}),
    decisionReviewEventId: candidateRef.decisionReviewEventId,
    ...(candidateRef.sourceCandidateRefs ? { sourceCandidateRefs: [...candidateRef.sourceCandidateRefs] } : {}),
    ...(candidateRef.evidenceRefs ? { evidenceRefs: [...candidateRef.evidenceRefs] } : {}),
  };
}

function assignmentId(structurePlanId: string, candidateRef: ReconstructionPackageCandidateRef): string {
  return `assignment:${structurePlanId}:${candidateRef.candidateType}:${stableRef(candidateRef.candidateId)}`;
}

function buildRouteId(structurePlanId: string, routePath: string, candidateId: string): string {
  return `planned-route:${structurePlanId}:${stableRef(routePath)}:${stableRef(candidateId)}`;
}

function buildNavigationId(structurePlanId: string, plannedRouteId: string, candidateId: string): string {
  return `planned-navigation:${structurePlanId}:${stableRef(plannedRouteId)}:${stableRef(candidateId)}`;
}

function buildSectionId(
  structurePlanId: string,
  plannedRouteId: string,
  sectionOrder: number,
  candidateId: string,
): string {
  return `planned-section:${structurePlanId}:${stableRef(plannedRouteId)}:${sectionOrder}:${stableRef(candidateId)}`;
}

function compareRouteDrafts(a: PlannedRouteDraft, b: PlannedRouteDraft): number {
  return (
    a.routePath.localeCompare(b.routePath) ||
    a.sourceIndex - b.sourceIndex ||
    a.sourceCandidateIds[0].localeCompare(b.sourceCandidateIds[0])
  );
}

function compareRoutedDrafts(
  a: Pick<PlannedNavigationDraft | PlannedSectionDraft, "routeOrder" | "sourceIndex"> & {
    readonly sourceCandidateIds?: readonly string[];
    readonly sourceCandidateId?: string;
  },
  b: Pick<PlannedNavigationDraft | PlannedSectionDraft, "routeOrder" | "sourceIndex"> & {
    readonly sourceCandidateIds?: readonly string[];
    readonly sourceCandidateId?: string;
  },
): number {
  const aCandidateId = a.sourceCandidateId ?? a.sourceCandidateIds?.[0] ?? "";
  const bCandidateId = b.sourceCandidateId ?? b.sourceCandidateIds?.[0] ?? "";
  return a.routeOrder - b.routeOrder || a.sourceIndex - b.sourceIndex || aCandidateId.localeCompare(bCandidateId);
}

function findAssociatedRoute(
  candidateRef: ReconstructionPackageCandidateRef,
  plannedRoutes: readonly PlannedRouteDraft[],
): PlannedRouteDraft | null {
  if (hasRoutePath(candidateRef)) {
    return plannedRoutes.find((route) => route.routePath === candidateRef.routePath) ?? null;
  }
  return plannedRoutes.length === 1 ? plannedRoutes[0] : null;
}

export function buildStructurePlan(input: BuildStructurePlanInput): StructurePlan {
  const {
    reconstructionPackage,
    reconstructionPackageArtifactId,
    latestReconstructionPackageArtifactId,
  } = input;
  const contractVersion = input.contractVersion ?? STRUCTURE_PLAN_CONTRACT_VERSION;
  const structurePlanId = `structure-plan:${reconstructionPackageArtifactId}:${contractVersion}`;
  const diagnostics: string[] = [];
  const limitations: string[] = [];
  const blockedCandidates: CandidateBlocker[] = [];

  const sourceValidation = validateReconstructionPackage(reconstructionPackage);
  diagnostics.push(
    `RECONSTRUCTION_PACKAGE_VALIDATION:${sourceValidation.valid ? "valid" : "invalid"}:errors=${sourceValidation.errors.length}:warnings=${sourceValidation.warnings.length}`,
  );

  const stale = reconstructionPackageArtifactId !== latestReconstructionPackageArtifactId;
  diagnostics.push(
    `STALE_RECONSTRUCTION_PACKAGE_CHECK:${stale ? "stale" : "latest"}:reconstructionPackageArtifactId=${reconstructionPackageArtifactId}:latestReconstructionPackageArtifactId=${latestReconstructionPackageArtifactId}`,
  );
  if (stale) {
    limitations.push("builder:blocker:STALE_RECONSTRUCTION_PACKAGE:Reconstruction Package artifact is not the latest package for this lineage.");
  }

  limitations.push(...unknownLimitations(reconstructionPackage.limitations, "reconstruction-package"));
  for (const candidateRef of reconstructionPackage.approvedCandidateRefs) {
    limitations.push(
      ...unknownLimitations(
        (candidateRef as unknown as { readonly limitations?: unknown }).limitations,
        `candidate:${candidateRef.candidateId}`,
      ),
    );
  }

  const includedCandidateRefs = reconstructionPackage.approvedCandidateRefs.map(toStructurePlanCandidateRef);
  diagnostics.push(`INCLUDED_APPROVED_CANDIDATE_COUNT:${includedCandidateRefs.length}`);
  if (includedCandidateRefs.length === 0) {
    limitations.push("builder:blocker:NO_INCLUDED_CANDIDATES:No included approved candidates are eligible for Structure Planning.");
  }

  const routePathCounts = new Map<string, number>();
  for (const candidateRef of reconstructionPackage.approvedCandidateRefs) {
    if (candidateRef.candidateType === "route" && hasRoutePath(candidateRef)) {
      routePathCounts.set(candidateRef.routePath, (routePathCounts.get(candidateRef.routePath) ?? 0) + 1);
    }
  }

  const routeDrafts: PlannedRouteDraft[] = [];
  for (const [sourceIndex, candidateRef] of reconstructionPackage.approvedCandidateRefs.entries()) {
    if (candidateRef.candidateType !== "route") continue;
    if (!hasRoutePath(candidateRef)) {
      blockedCandidates.push({
        candidateId: candidateRef.candidateId,
        candidateType: candidateRef.candidateType,
        reason: "MISSING_ROUTE_PATH",
      });
      continue;
    }
    if ((routePathCounts.get(candidateRef.routePath) ?? 0) > 1) {
      blockedCandidates.push({
        candidateId: candidateRef.candidateId,
        candidateType: candidateRef.candidateType,
        reason: `DUPLICATE_ROUTE_PATH:${candidateRef.routePath}`,
      });
      continue;
    }
    const plannedRouteId = buildRouteId(structurePlanId, candidateRef.routePath, candidateRef.candidateId);
    routeDrafts.push({
      sourceIndex,
      plannedRouteId,
      routePath: candidateRef.routePath,
      sourceCandidateIds: [candidateRef.candidateId],
      assignmentIds: [],
      diagnostics: [
        `SOURCE_RECONSTRUCTION_PACKAGE_REF:${reconstructionPackageArtifactId}`,
        `SOURCE_ORDER:${sourceIndex}`,
      ],
    });
  }
  routeDrafts.sort(compareRouteDrafts);

  const routeOrderById = new Map(routeDrafts.map((route, index) => [route.plannedRouteId, index]));

  const navigationDrafts: PlannedNavigationDraft[] = [];
  for (const [sourceIndex, candidateRef] of reconstructionPackage.approvedCandidateRefs.entries()) {
    if (candidateRef.candidateType !== "navigation") continue;
    const associatedRoute = findAssociatedRoute(candidateRef, routeDrafts);
    if (associatedRoute === null) {
      blockedCandidates.push({
        candidateId: candidateRef.candidateId,
        candidateType: candidateRef.candidateType,
        reason: hasRoutePath(candidateRef)
          ? `MISSING_ROUTE_ASSOCIATION:${candidateRef.routePath}`
          : "AMBIGUOUS_ROUTE_ASSOCIATION",
      });
      continue;
    }
    const routeOrder = routeOrderById.get(associatedRoute.plannedRouteId) ?? 0;
    navigationDrafts.push({
      routeOrder,
      sourceIndex,
      plannedNavigationId: buildNavigationId(structurePlanId, associatedRoute.plannedRouteId, candidateRef.candidateId),
      sourceCandidateIds: [candidateRef.candidateId],
      plannedRouteIds: [associatedRoute.plannedRouteId],
      assignmentIds: [],
      diagnostics: [
        `SOURCE_RECONSTRUCTION_PACKAGE_REF:${reconstructionPackageArtifactId}`,
        `SOURCE_ORDER:${sourceIndex}`,
        hasRoutePath(candidateRef)
          ? `ROUTE_ASSOCIATION:explicit:${candidateRef.routePath}`
          : `ROUTE_ASSOCIATION:unambiguous:${associatedRoute.routePath}`,
      ],
    });
  }
  navigationDrafts.sort(compareRoutedDrafts);

  const sectionDrafts: PlannedSectionDraft[] = [];
  for (const [sourceIndex, candidateRef] of reconstructionPackage.approvedCandidateRefs.entries()) {
    if (candidateRef.candidateType !== "section") continue;
    const associatedRoute = findAssociatedRoute(candidateRef, routeDrafts);
    if (associatedRoute === null) {
      blockedCandidates.push({
        candidateId: candidateRef.candidateId,
        candidateType: candidateRef.candidateType,
        reason: hasRoutePath(candidateRef)
          ? `MISSING_ROUTE_ASSOCIATION:${candidateRef.routePath}`
          : "AMBIGUOUS_ROUTE_ASSOCIATION",
      });
      continue;
    }
    const routeOrder = routeOrderById.get(associatedRoute.plannedRouteId) ?? 0;
    sectionDrafts.push({
      routeOrder,
      sourceIndex,
      plannedRouteId: associatedRoute.plannedRouteId,
      sourceCandidateId: candidateRef.candidateId,
      sourceCandidateIds: [candidateRef.candidateId],
      assignmentIds: [],
      diagnostics: [
        `SOURCE_RECONSTRUCTION_PACKAGE_REF:${reconstructionPackageArtifactId}`,
        `SOURCE_ORDER:${sourceIndex}`,
        hasRoutePath(candidateRef)
          ? `ROUTE_ASSOCIATION:explicit:${candidateRef.routePath}`
          : `ROUTE_ASSOCIATION:unambiguous:${associatedRoute.routePath}`,
      ],
    });
  }
  sectionDrafts.sort(compareRoutedDrafts);

  const sectionOrdersByRoute = new Map<string, number>();
  const plannedSections = sectionDrafts.map((sectionDraft): StructurePlanSection => {
    const sectionOrder = sectionOrdersByRoute.get(sectionDraft.plannedRouteId) ?? 0;
    sectionOrdersByRoute.set(sectionDraft.plannedRouteId, sectionOrder + 1);
    return {
      plannedSectionId: buildSectionId(
        structurePlanId,
        sectionDraft.plannedRouteId,
        sectionOrder,
        sectionDraft.sourceCandidateId,
      ),
      plannedRouteId: sectionDraft.plannedRouteId,
      sectionOrder,
      sourceCandidateIds: sectionDraft.sourceCandidateIds,
      assignmentIds: [],
      diagnostics: sectionDraft.diagnostics,
    };
  });

  const candidateById = new Map(reconstructionPackage.approvedCandidateRefs.map((candidateRef) => [candidateRef.candidateId, candidateRef]));
  const plannedRoutes = routeDrafts.map(({ sourceIndex: _sourceIndex, ...route }) => route);
  const plannedNavigation = navigationDrafts.map(({ routeOrder: _routeOrder, sourceIndex: _sourceIndex, ...navigation }) => navigation);
  const assignmentDrafts: StructurePlanAssignment[] = [];

  for (const route of plannedRoutes) {
    const candidateRef = candidateById.get(route.sourceCandidateIds[0]);
    if (!candidateRef) continue;
    assignmentDrafts.push({
      assignmentId: assignmentId(structurePlanId, candidateRef),
      candidateId: candidateRef.candidateId,
      candidateType: candidateRef.candidateType,
      targetKind: "route",
      plannedRouteId: route.plannedRouteId,
      ...(candidateRef.sourceCandidateRefs ? { sourceCandidateRefs: [...candidateRef.sourceCandidateRefs] } : {}),
      ...(candidateRef.evidenceRefs ? { evidenceRefs: [...candidateRef.evidenceRefs] } : {}),
      diagnostics: [`SOURCE_RECONSTRUCTION_PACKAGE_REF:${reconstructionPackageArtifactId}`],
    });
  }
  for (const navigation of plannedNavigation) {
    const candidateRef = candidateById.get(navigation.sourceCandidateIds[0]);
    if (!candidateRef) continue;
    assignmentDrafts.push({
      assignmentId: assignmentId(structurePlanId, candidateRef),
      candidateId: candidateRef.candidateId,
      candidateType: candidateRef.candidateType,
      targetKind: "navigation",
      plannedNavigationId: navigation.plannedNavigationId,
      ...(candidateRef.sourceCandidateRefs ? { sourceCandidateRefs: [...candidateRef.sourceCandidateRefs] } : {}),
      ...(candidateRef.evidenceRefs ? { evidenceRefs: [...candidateRef.evidenceRefs] } : {}),
      diagnostics: [`SOURCE_RECONSTRUCTION_PACKAGE_REF:${reconstructionPackageArtifactId}`],
    });
  }
  for (const section of plannedSections) {
    const candidateRef = candidateById.get(section.sourceCandidateIds[0]);
    if (!candidateRef) continue;
    assignmentDrafts.push({
      assignmentId: assignmentId(structurePlanId, candidateRef),
      candidateId: candidateRef.candidateId,
      candidateType: candidateRef.candidateType,
      targetKind: "section",
      plannedSectionId: section.plannedSectionId,
      ...(candidateRef.sourceCandidateRefs ? { sourceCandidateRefs: [...candidateRef.sourceCandidateRefs] } : {}),
      ...(candidateRef.evidenceRefs ? { evidenceRefs: [...candidateRef.evidenceRefs] } : {}),
      diagnostics: [`SOURCE_RECONSTRUCTION_PACKAGE_REF:${reconstructionPackageArtifactId}`],
    });
  }

  const blockedCandidateIds = new Set(blockedCandidates.map((blocker) => blocker.candidateId));
  const assignments = blockedCandidates.length > 0
    ? []
    : assignmentDrafts.filter((assignment) => !blockedCandidateIds.has(assignment.candidateId));
  const assignmentsByCandidateId = new Map(assignments.map((assignment) => [assignment.candidateId, assignment.assignmentId]));
  const plannedRoutesWithAssignments = plannedRoutes.map((route) => ({
    ...route,
    assignmentIds: route.sourceCandidateIds.map((candidateId) => assignmentsByCandidateId.get(candidateId)).filter(Boolean) as string[],
  }));
  const plannedNavigationWithAssignments = plannedNavigation.map((navigation) => ({
    ...navigation,
    assignmentIds: navigation.sourceCandidateIds.map((candidateId) => assignmentsByCandidateId.get(candidateId)).filter(Boolean) as string[],
  }));
  const plannedSectionsWithAssignments = plannedSections.map((section) => ({
    ...section,
    assignmentIds: section.sourceCandidateIds.map((candidateId) => assignmentsByCandidateId.get(candidateId)).filter(Boolean) as string[],
  }));

  for (const blocker of blockedCandidates) {
    limitations.push(`builder:blocker:${blocker.reason}:candidateId=${blocker.candidateId}:candidateType=${blocker.candidateType}`);
  }
  diagnostics.push(`PLANNED_ROUTE_COUNT:${plannedRoutesWithAssignments.length}`);
  diagnostics.push(`PLANNED_NAVIGATION_COUNT:${plannedNavigationWithAssignments.length}`);
  diagnostics.push(`PLANNED_SECTION_COUNT:${plannedSectionsWithAssignments.length}`);
  diagnostics.push(`ASSIGNMENT_COUNT:${assignments.length}`);
  diagnostics.push(
    `BLOCKED_CANDIDATE_COUNT:${blockedCandidates.length}${blockedCandidates.length > 0 ? `:${blockedCandidates.map((blocker) => `${blocker.candidateId}=${blocker.reason}`).join(",")}` : ""}`,
  );
  if (blockedCandidates.length > 0) {
    diagnostics.push("BLOCKED_STATUS_ASSIGNMENT_POLICY:normal_assignments_suppressed_to_preserve_structure_plan_contract");
  }

  let status: StructurePlanStatus = "valid";
  if (!sourceValidation.valid) {
    status = "invalid";
  } else if (stale) {
    status = "stale";
  } else if (includedCandidateRefs.length === 0 || blockedCandidates.length > 0) {
    status = "blocked";
  }

  const structurePlan: StructurePlan = {
    structurePlanId,
    structurePlanStatus: status,
    reconstructionPackageArtifactId,
    candidateReviewPackageArtifactId: reconstructionPackage.candidateReviewPackageArtifactId,
    candidateDiscoveryArtifactId: reconstructionPackage.candidateDiscoveryArtifactId,
    siteVersionId: reconstructionPackage.siteVersionId,
    dryRunId: reconstructionPackage.dryRunId,
    contractVersion,
    createdAt: reconstructionPackage.createdAt,
    lineage: {
      reconstructionPackageArtifactId,
      reconstructionPackageId: reconstructionPackage.reconstructionPackageId,
      reconstructionPackageStatus: reconstructionPackage.reconstructionPackageStatus,
      reconstructionPackageContractVersion: reconstructionPackage.contractVersion,
      candidateReviewPackageArtifactId: reconstructionPackage.candidateReviewPackageArtifactId,
      candidateDiscoveryArtifactId: reconstructionPackage.candidateDiscoveryArtifactId,
      siteVersionId: reconstructionPackage.siteVersionId,
      dryRunId: reconstructionPackage.dryRunId,
      includedCandidateRefs,
    },
    plannedRoutes: plannedRoutesWithAssignments,
    plannedNavigation: plannedNavigationWithAssignments,
    plannedSections: plannedSectionsWithAssignments,
    assignments,
    limitations: uniqueStrings(limitations),
    diagnostics,
  };

  const validation = validateStructurePlan(structurePlan);
  const validatedPlan: StructurePlan = {
    ...structurePlan,
    structurePlanStatus: validation.valid ? structurePlan.structurePlanStatus : "invalid",
    diagnostics: [
      ...structurePlan.diagnostics,
      `STRUCTURE_PLAN_VALIDATION:${validation.valid ? "valid" : "invalid"}:errors=${validation.errors.length}:warnings=${validation.warnings.length}`,
      ...validation.errors.map((error) => `STRUCTURE_PLAN_VALIDATION_ERROR:${error}`),
      ...validation.warnings.map((warning) => `STRUCTURE_PLAN_VALIDATION_WARNING:${warning}`),
    ],
    limitations: validation.valid
      ? structurePlan.limitations
      : uniqueStrings([
        ...structurePlan.limitations,
        "builder:blocker:STRUCTURE_PLAN_VALIDATION_FAILED:Structure Plan contract validation failed.",
      ]),
  };

  return validatedPlan;
}
