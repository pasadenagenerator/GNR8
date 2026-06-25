import type { RuntimeImportProvenanceSummary } from "../runtime/types";
import { validateStructurePlan, type StructurePlan, type StructurePlanValidationResult } from "./structure-plan-contract";
import {
  STRUCTURE_PLAN_ARTIFACT_KIND,
  loadLatestStructurePlan,
  type StructurePlanArtifactRecord,
  type StructurePlanPersistenceOptions,
} from "./structure-plan-persistence";

export type StructurePlanSurfaceState = "missing" | "blocked" | "stale" | "valid";
export type StructurePlanSurfaceAttentionState = "limitations_present" | "no_navigation" | "no_sections";

export type StructurePlanSurfaceProjection = {
  siteVersionId: string;
  artifact: {
    artifactRef: string | null;
    artifactKind: typeof STRUCTURE_PLAN_ARTIFACT_KIND;
    artifactVersion: number | null;
    structurePlanId: string | null;
    siteVersionId: string;
    status: string | null;
    contractVersion: string | null;
    createdAt: string | null;
    persistedAt: string | null;
  } | null;
  lineage: {
    reconstructionPackageArtifactId: string | null;
    candidateReviewPackageArtifactId: string | null;
    candidateDiscoveryArtifactId: string | null;
    dryRunId: string | null;
    latestReconstructionPackageArtifactId: string | null;
    reconstructionPackageStale: boolean;
  };
  summary: {
    plannedRoutes: number;
    plannedNavigation: number;
    plannedSections: number;
    assignments: number;
    blockedCandidates: number;
  };
  plannedRoutes: Array<{
    plannedRouteId: string;
    routePath: string;
    sourceCandidateIds: string[];
    assignmentIds: string[];
  }>;
  plannedNavigation: Array<{
    plannedNavigationId: string;
    routeAssociations: string[];
    sourceCandidateIds: string[];
    assignmentIds: string[];
  }>;
  plannedSections: Array<{
    plannedSectionId: string;
    routeAssociation: string | null;
    sectionOrder: number;
    sourceCandidateIds: string[];
    assignmentIds: string[];
  }>;
  assignments: Array<{
    assignmentId: string;
    candidateId: string;
    candidateType: string;
    targetKind: string;
    targetId: string | null;
  }>;
  limitations: string[];
  diagnostics: string[];
  validation: {
    status: "valid" | "invalid" | "unavailable";
    errorCount: number;
    warningCount: number;
    errors: string[];
    warnings: string[];
  };
  state: StructurePlanSurfaceState;
  attentionStates: StructurePlanSurfaceAttentionState[];
};

type SurfaceSiteVersion = { importProvenanceSummary?: RuntimeImportProvenanceSummary | null };

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringList(value: readonly string[] | undefined): string[] {
  return Array.isArray(value) ? [...value] : [];
}

function emptySummary(): StructurePlanSurfaceProjection["summary"] {
  return {
    plannedRoutes: 0,
    plannedNavigation: 0,
    plannedSections: 0,
    assignments: 0,
    blockedCandidates: 0,
  };
}

function missingProjection(siteVersionId: string): StructurePlanSurfaceProjection {
  return {
    siteVersionId,
    artifact: null,
    lineage: {
      reconstructionPackageArtifactId: null,
      candidateReviewPackageArtifactId: null,
      candidateDiscoveryArtifactId: null,
      dryRunId: null,
      latestReconstructionPackageArtifactId: null,
      reconstructionPackageStale: false,
    },
    summary: emptySummary(),
    plannedRoutes: [],
    plannedNavigation: [],
    plannedSections: [],
    assignments: [],
    limitations: [],
    diagnostics: ["STRUCTURE_PLAN_MISSING"],
    validation: { status: "unavailable", errorCount: 0, warningCount: 0, errors: [], warnings: [] },
    state: "missing",
    attentionStates: [],
  };
}

function artifactBlockedCandidateCount(artifact: StructurePlanArtifactRecord, plan: StructurePlan): number {
  if (Number.isFinite(artifact.blockedCandidateCount)) return artifact.blockedCandidateCount;
  const unresolvedAssignments = plan.assignments.filter((assignment) => assignment.targetKind === "unresolved").length;
  return plan.structurePlanStatus === "blocked"
    ? plan.lineage.includedCandidateRefs.length + unresolvedAssignments
    : unresolvedAssignments;
}

function validationProjection(validation: StructurePlanValidationResult): StructurePlanSurfaceProjection["validation"] {
  return {
    status: validation.valid ? "valid" : "invalid",
    errorCount: validation.errors.length,
    warningCount: validation.warnings.length,
    errors: [...validation.errors],
    warnings: [...validation.warnings],
  };
}

function validationIndicatesStale(validation: StructurePlanValidationResult): boolean {
  const text = [...validation.errors, ...validation.warnings].join("\n").toLowerCase();
  return text.includes("stale");
}

function routePathById(plan: StructurePlan): Map<string, string> {
  return new Map(plan.plannedRoutes.map((route) => [route.plannedRouteId, route.routePath]));
}

function targetId(assignment: StructurePlan["assignments"][number]): string | null {
  if (assignment.targetKind === "route") return assignment.plannedRouteId ?? null;
  if (assignment.targetKind === "navigation") return assignment.plannedNavigationId ?? null;
  if (assignment.targetKind === "section") return assignment.plannedSectionId ?? null;
  return assignment.plannedRouteId ?? assignment.plannedNavigationId ?? assignment.plannedSectionId ?? null;
}

export function projectStructurePlanSurface(input: {
  siteVersionId: string;
  artifact: StructurePlanArtifactRecord | null | undefined;
  latestReconstructionPackageArtifactId?: string | null;
}): StructurePlanSurfaceProjection {
  if (!input.artifact) return missingProjection(input.siteVersionId);

  const artifact = cloneJson(input.artifact);
  const plan = artifact.plan;
  const validation = validateStructurePlan(plan);
  const persistedValidation = artifact.validation ?? { valid: true, errors: [], warnings: [] };
  const mergedValidation: StructurePlanValidationResult = {
    valid: validation.valid && persistedValidation.valid,
    errors: [...new Set([...validation.errors, ...persistedValidation.errors])],
    warnings: [...new Set([...validation.warnings, ...persistedValidation.warnings])],
  };
  const routesById = routePathById(plan);
  const latestReconstructionPackageArtifactId = input.latestReconstructionPackageArtifactId ?? null;
  const reconstructionPackageStale = Boolean(
    latestReconstructionPackageArtifactId &&
    latestReconstructionPackageArtifactId !== plan.reconstructionPackageArtifactId,
  );
  const status = plan.structurePlanStatus;
  const isStale = status === "stale" || reconstructionPackageStale || validationIndicatesStale(mergedValidation);
  const state: StructurePlanSurfaceState = isStale ? "stale" : status === "blocked" ? "blocked" : "valid";
  const attentionStates: StructurePlanSurfaceAttentionState[] = [];
  if (plan.limitations.length > 0) attentionStates.push("limitations_present");
  if (plan.plannedNavigation.length === 0) attentionStates.push("no_navigation");
  if (plan.plannedSections.length === 0) attentionStates.push("no_sections");

  return {
    siteVersionId: input.siteVersionId,
    artifact: {
      artifactRef: safeString(artifact.artifactId),
      artifactKind: STRUCTURE_PLAN_ARTIFACT_KIND,
      artifactVersion: safeNumber(artifact.artifactVersion),
      structurePlanId: safeString(artifact.structurePlanId),
      siteVersionId: input.siteVersionId,
      status: safeString(artifact.status) ?? status,
      contractVersion: safeString(artifact.contractVersion),
      createdAt: safeString(artifact.createdAt),
      persistedAt: safeString(artifact.persistedAt),
    },
    lineage: {
      reconstructionPackageArtifactId: plan.reconstructionPackageArtifactId,
      candidateReviewPackageArtifactId: plan.candidateReviewPackageArtifactId,
      candidateDiscoveryArtifactId: plan.candidateDiscoveryArtifactId,
      dryRunId: plan.dryRunId,
      latestReconstructionPackageArtifactId,
      reconstructionPackageStale,
    },
    summary: {
      plannedRoutes: plan.plannedRoutes.length,
      plannedNavigation: plan.plannedNavigation.length,
      plannedSections: plan.plannedSections.length,
      assignments: plan.assignments.length,
      blockedCandidates: artifactBlockedCandidateCount(artifact, plan),
    },
    plannedRoutes: plan.plannedRoutes.map((route) => ({
      plannedRouteId: route.plannedRouteId,
      routePath: route.routePath,
      sourceCandidateIds: stringList(route.sourceCandidateIds),
      assignmentIds: stringList(route.assignmentIds),
    })),
    plannedNavigation: plan.plannedNavigation.map((navigation) => ({
      plannedNavigationId: navigation.plannedNavigationId,
      routeAssociations: navigation.plannedRouteIds.map((routeId) => routesById.get(routeId) ?? routeId),
      sourceCandidateIds: stringList(navigation.sourceCandidateIds),
      assignmentIds: stringList(navigation.assignmentIds),
    })),
    plannedSections: plan.plannedSections.map((section) => ({
      plannedSectionId: section.plannedSectionId,
      routeAssociation: routesById.get(section.plannedRouteId) ?? section.plannedRouteId ?? null,
      sectionOrder: section.sectionOrder,
      sourceCandidateIds: stringList(section.sourceCandidateIds),
      assignmentIds: stringList(section.assignmentIds),
    })),
    assignments: plan.assignments.map((assignment) => ({
      assignmentId: assignment.assignmentId,
      candidateId: assignment.candidateId,
      candidateType: assignment.candidateType,
      targetKind: assignment.targetKind,
      targetId: targetId(assignment),
    })),
    limitations: [...plan.limitations],
    diagnostics: [...new Set([...artifact.diagnostics, ...plan.diagnostics])],
    validation: validationProjection(mergedValidation),
    state,
    attentionStates,
  };
}

async function defaultGetSiteVersion(
  siteVersionId: string,
  options: StructurePlanPersistenceOptions,
): Promise<SurfaceSiteVersion | null> {
  const { getSiteVersion } = await import("../runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

async function latestReconstructionPackageArtifactId(
  siteVersionId: string,
  options: StructurePlanPersistenceOptions,
): Promise<string | null> {
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(siteVersionId)
    : await defaultGetSiteVersion(siteVersionId, options);
  const summary = siteVersion?.importProvenanceSummary;
  const provenance = isRecord(summary) ? summary as Record<string, unknown> : null;
  const latest = isRecord(provenance?.latestReconstructionPackageArtifact)
    ? provenance.latestReconstructionPackageArtifact
    : null;
  return safeString(latest?.artifactId);
}

export async function loadLatestStructurePlanSurfaceProjection(input: {
  siteVersionId: string;
  options?: StructurePlanPersistenceOptions;
}): Promise<StructurePlanSurfaceProjection> {
  const options = input.options ?? {};
  const artifact = await loadLatestStructurePlan({
    siteVersionId: input.siteVersionId,
    options,
  });
  if (!artifact) return missingProjection(input.siteVersionId);
  return projectStructurePlanSurface({
    siteVersionId: input.siteVersionId,
    artifact,
    latestReconstructionPackageArtifactId: await latestReconstructionPackageArtifactId(input.siteVersionId, options),
  });
}
