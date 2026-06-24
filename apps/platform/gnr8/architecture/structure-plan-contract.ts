/**
 * Phase 8F-1 Structure Plan contract.
 *
 * A Structure Plan is a deterministic, metadata-only organization of one
 * exact latest Reconstruction Package artifact. It does not generate React,
 * blocks, content, AI output, publishing artifacts, deployment artifacts, or
 * execution artifacts.
 */

import {
  CANDIDATE_TYPES,
  type CandidateType,
} from "./candidate-discovery-contract";
import {
  RECONSTRUCTION_PACKAGE_STATUSES,
  type ReconstructionPackageStatus,
} from "./reconstruction-package-contract";

export const STRUCTURE_PLAN_CONTRACT_VERSION = "8F-1" as const;

export const STRUCTURE_PLAN_STATUSES = [
  "planned",
  "valid",
  "invalid",
  "blocked",
  "stale",
] as const;
export type StructurePlanStatus = (typeof STRUCTURE_PLAN_STATUSES)[number];

export const STRUCTURE_PLAN_ASSIGNMENT_TARGET_KINDS = [
  "route",
  "navigation",
  "section",
  "unresolved",
] as const;
export type StructurePlanAssignmentTargetKind =
  (typeof STRUCTURE_PLAN_ASSIGNMENT_TARGET_KINDS)[number];

export type StructurePlanCandidateRef = {
  readonly candidateId: string;
  readonly candidateType: CandidateType;
  readonly routePath?: string;
  readonly decisionReviewEventId: string;
  readonly sourceCandidateRefs?: readonly string[];
  readonly evidenceRefs?: readonly string[];
};

export type StructurePlanLineage = {
  readonly reconstructionPackageArtifactId: string;
  readonly reconstructionPackageId: string;
  readonly reconstructionPackageStatus: ReconstructionPackageStatus;
  readonly reconstructionPackageContractVersion: string;
  readonly candidateReviewPackageArtifactId: string;
  readonly candidateDiscoveryArtifactId: string;
  readonly siteVersionId: string;
  readonly dryRunId: string;
  readonly includedCandidateRefs: readonly StructurePlanCandidateRef[];
};

export type StructurePlanRoute = {
  readonly plannedRouteId: string;
  readonly routePath: string;
  readonly sourceCandidateIds: readonly string[];
  readonly assignmentIds: readonly string[];
  readonly diagnostics: readonly string[];
};

export type StructurePlanNavigation = {
  readonly plannedNavigationId: string;
  readonly sourceCandidateIds: readonly string[];
  readonly plannedRouteIds: readonly string[];
  readonly assignmentIds: readonly string[];
  readonly diagnostics: readonly string[];
};

export type StructurePlanSection = {
  readonly plannedSectionId: string;
  readonly plannedRouteId: string;
  readonly sectionOrder: number;
  readonly sourceCandidateIds: readonly string[];
  readonly assignmentIds: readonly string[];
  readonly diagnostics: readonly string[];
};

export type StructurePlanAssignment = {
  readonly assignmentId: string;
  readonly candidateId: string;
  readonly candidateType: CandidateType;
  readonly targetKind: StructurePlanAssignmentTargetKind;
  readonly plannedRouteId?: string;
  readonly plannedNavigationId?: string;
  readonly plannedSectionId?: string;
  readonly sourceCandidateRefs?: readonly string[];
  readonly evidenceRefs?: readonly string[];
  readonly diagnostics: readonly string[];
};

export type StructurePlan = {
  readonly structurePlanId: string;
  readonly structurePlanStatus: StructurePlanStatus;
  readonly reconstructionPackageArtifactId: string;
  readonly candidateReviewPackageArtifactId: string;
  readonly candidateDiscoveryArtifactId: string;
  readonly siteVersionId: string;
  readonly dryRunId: string;
  readonly contractVersion: typeof STRUCTURE_PLAN_CONTRACT_VERSION;
  readonly createdAt: string;
  readonly lineage: StructurePlanLineage;
  readonly plannedRoutes: readonly StructurePlanRoute[];
  readonly plannedNavigation: readonly StructurePlanNavigation[];
  readonly plannedSections: readonly StructurePlanSection[];
  readonly assignments: readonly StructurePlanAssignment[];
  readonly limitations: readonly string[];
  readonly diagnostics: readonly string[];
};

export type StructurePlanValidationResult = {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
};

export type CreateBlockedStructurePlanReason =
  | "no_eligible_candidates"
  | "invalid_lineage"
  | "stale_reconstruction_package";

export type CreateBlockedStructurePlanInput = {
  readonly reconstructionPackageArtifactId: string;
  readonly reconstructionPackageId: string;
  readonly reconstructionPackageStatus?: ReconstructionPackageStatus;
  readonly reconstructionPackageContractVersion: string;
  readonly candidateReviewPackageArtifactId: string;
  readonly candidateDiscoveryArtifactId: string;
  readonly siteVersionId: string;
  readonly dryRunId: string;
  readonly createdAt: string;
  readonly reason: CreateBlockedStructurePlanReason;
  readonly limitations?: readonly string[];
  readonly diagnostics?: readonly string[];
};

export const STRUCTURE_PLAN_FORBIDDEN_FIELDS = [
  "reactOutput",
  "generatedBlocks",
  "generatedContent",
  "generatedComponents",
  "aiOutputs",
  "structureInstructions",
  "publishingArtifacts",
  "deploymentArtifacts",
  "executionArtifacts",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

function validateStringArray(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string") errors.push(`${path}[${index}] must be a string`);
  }
}

function validateOptionalStringArray(value: unknown, path: string, errors: string[]): void {
  if (value !== undefined) validateStringArray(value, path, errors);
}

function validateForbiddenFields(
  value: unknown,
  path: string,
  errors: string[],
  seen: WeakSet<object>,
): void {
  if ((!isObject(value) && !Array.isArray(value)) || seen.has(value)) return;
  seen.add(value);
  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = path ? `${path}.${key}` : key;
    if (STRUCTURE_PLAN_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nestedPath} is forbidden in Structure Plans`);
    }
    validateForbiddenFields(nestedValue, nestedPath, errors, seen);
  }
}

function validateCandidateRef(value: unknown, path: string, errors: string[]): StructurePlanCandidateRef | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.candidateId)) errors.push(`${path}.candidateId is required`);
  if (!CANDIDATE_TYPES.includes(value.candidateType as never)) {
    errors.push(`${path}.candidateType must be route, navigation, or section`);
  }
  if (value.routePath !== undefined && !isNonEmptyString(value.routePath)) {
    errors.push(`${path}.routePath must be a non-empty string when present`);
  }
  if (!isNonEmptyString(value.decisionReviewEventId)) {
    errors.push(`${path}.decisionReviewEventId is required`);
  }
  validateOptionalStringArray(value.sourceCandidateRefs, `${path}.sourceCandidateRefs`, errors);
  validateOptionalStringArray(value.evidenceRefs, `${path}.evidenceRefs`, errors);
  return value as StructurePlanCandidateRef;
}

function validateLineage(
  value: unknown,
  plan: Record<string, unknown>,
  errors: string[],
): readonly StructurePlanCandidateRef[] {
  if (!isObject(value)) {
    errors.push("lineage is required");
    return [];
  }
  for (const field of [
    "reconstructionPackageArtifactId",
    "reconstructionPackageId",
    "reconstructionPackageContractVersion",
    "candidateReviewPackageArtifactId",
    "candidateDiscoveryArtifactId",
    "siteVersionId",
    "dryRunId",
  ] as const) {
    if (!isNonEmptyString(value[field])) errors.push(`lineage.${field} is required`);
  }
  if (!RECONSTRUCTION_PACKAGE_STATUSES.includes(value.reconstructionPackageStatus as never)) {
    errors.push("lineage.reconstructionPackageStatus must be planned, valid, invalid, blocked, or stale");
  }
  for (const field of [
    "reconstructionPackageArtifactId",
    "candidateReviewPackageArtifactId",
    "candidateDiscoveryArtifactId",
    "siteVersionId",
    "dryRunId",
  ] as const) {
    if (value[field] !== plan[field]) errors.push(`lineage.${field} must match ${field}`);
  }

  const candidateRefs: StructurePlanCandidateRef[] = [];
  if (!Array.isArray(value.includedCandidateRefs)) {
    errors.push("lineage.includedCandidateRefs must be an array");
    return candidateRefs;
  }

  const candidateIds = new Set<string>();
  for (const [index, candidateRef] of value.includedCandidateRefs.entries()) {
    const ref = validateCandidateRef(candidateRef, `lineage.includedCandidateRefs[${index}]`, errors);
    if (!ref || !isNonEmptyString(ref.candidateId)) continue;
    if (candidateIds.has(ref.candidateId)) {
      errors.push(`lineage.includedCandidateRefs[${index}].candidateId must be unique`);
    }
    candidateIds.add(ref.candidateId);
    candidateRefs.push(ref);
  }
  return candidateRefs;
}

function validateRoute(value: unknown, path: string, errors: string[]): StructurePlanRoute | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.plannedRouteId)) errors.push(`${path}.plannedRouteId is required`);
  if (!isNonEmptyString(value.routePath)) errors.push(`${path}.routePath is required`);
  validateStringArray(value.sourceCandidateIds, `${path}.sourceCandidateIds`, errors);
  validateStringArray(value.assignmentIds, `${path}.assignmentIds`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return value as StructurePlanRoute;
}

function validateNavigation(
  value: unknown,
  path: string,
  errors: string[],
): StructurePlanNavigation | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.plannedNavigationId)) {
    errors.push(`${path}.plannedNavigationId is required`);
  }
  validateStringArray(value.sourceCandidateIds, `${path}.sourceCandidateIds`, errors);
  validateStringArray(value.plannedRouteIds, `${path}.plannedRouteIds`, errors);
  validateStringArray(value.assignmentIds, `${path}.assignmentIds`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return value as StructurePlanNavigation;
}

function validateSection(value: unknown, path: string, errors: string[]): StructurePlanSection | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.plannedSectionId)) errors.push(`${path}.plannedSectionId is required`);
  if (!isNonEmptyString(value.plannedRouteId)) errors.push(`${path}.plannedRouteId is required`);
  if (!Number.isInteger(value.sectionOrder) || (value.sectionOrder as number) < 0) {
    errors.push(`${path}.sectionOrder must be a non-negative integer`);
  }
  validateStringArray(value.sourceCandidateIds, `${path}.sourceCandidateIds`, errors);
  validateStringArray(value.assignmentIds, `${path}.assignmentIds`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return value as StructurePlanSection;
}

function validateAssignment(
  value: unknown,
  path: string,
  errors: string[],
): StructurePlanAssignment | null {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return null;
  }
  if (!isNonEmptyString(value.assignmentId)) errors.push(`${path}.assignmentId is required`);
  if (!isNonEmptyString(value.candidateId)) errors.push(`${path}.candidateId is required`);
  if (!CANDIDATE_TYPES.includes(value.candidateType as never)) {
    errors.push(`${path}.candidateType must be route, navigation, or section`);
  }
  if (!STRUCTURE_PLAN_ASSIGNMENT_TARGET_KINDS.includes(value.targetKind as never)) {
    errors.push(`${path}.targetKind must be route, navigation, section, or unresolved`);
  }
  if (value.plannedRouteId !== undefined && !isNonEmptyString(value.plannedRouteId)) {
    errors.push(`${path}.plannedRouteId must be a non-empty string when present`);
  }
  if (value.plannedNavigationId !== undefined && !isNonEmptyString(value.plannedNavigationId)) {
    errors.push(`${path}.plannedNavigationId must be a non-empty string when present`);
  }
  if (value.plannedSectionId !== undefined && !isNonEmptyString(value.plannedSectionId)) {
    errors.push(`${path}.plannedSectionId must be a non-empty string when present`);
  }
  validateOptionalStringArray(value.sourceCandidateRefs, `${path}.sourceCandidateRefs`, errors);
  validateOptionalStringArray(value.evidenceRefs, `${path}.evidenceRefs`, errors);
  validateStringArray(value.diagnostics, `${path}.diagnostics`, errors);
  return value as StructurePlanAssignment;
}

function collectArray<T>(
  value: unknown,
  path: string,
  errors: string[],
  validateItem: (item: unknown, itemPath: string, errors: string[]) => T | null,
): T[] {
  const items: T[] = [];
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return items;
  }
  for (const [index, item] of value.entries()) {
    const validated = validateItem(item, `${path}[${index}]`, errors);
    if (validated) items.push(validated);
  }
  return items;
}

function validateUniqueStrings(values: readonly string[], path: string, errors: string[]): void {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value)) errors.push(`${path}[${index}] must be unique`);
    seen.add(value);
  }
}

function validateCandidateIdsByType(
  candidateIds: readonly string[],
  requiredType: CandidateType,
  candidateRefsById: ReadonlyMap<string, StructurePlanCandidateRef>,
  path: string,
  errors: string[],
): void {
  for (const [index, candidateId] of candidateIds.entries()) {
    const candidateRef = candidateRefsById.get(candidateId);
    if (!candidateRef) {
      errors.push(`${path}[${index}] must reference an included approved candidate`);
    } else if (candidateRef.candidateType !== requiredType) {
      errors.push(`${path}[${index}] must reference a ${requiredType} candidate`);
    }
  }
}

export function validateStructurePlan(value: unknown): StructurePlanValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObject(value)) {
    return { valid: false, errors: ["Structure Plan must be an object"], warnings };
  }

  validateForbiddenFields(value, "", errors, new WeakSet<object>());
  for (const field of [
    "structurePlanId",
    "reconstructionPackageArtifactId",
    "candidateReviewPackageArtifactId",
    "candidateDiscoveryArtifactId",
    "siteVersionId",
    "dryRunId",
  ] as const) {
    if (!isNonEmptyString(value[field])) errors.push(`${field} is required`);
  }
  if (!STRUCTURE_PLAN_STATUSES.includes(value.structurePlanStatus as never)) {
    errors.push("structurePlanStatus must be planned, valid, invalid, blocked, or stale");
  }
  if (value.contractVersion !== STRUCTURE_PLAN_CONTRACT_VERSION) {
    errors.push(`contractVersion must be ${STRUCTURE_PLAN_CONTRACT_VERSION}`);
  }
  if (
    isNonEmptyString(value.reconstructionPackageArtifactId) &&
    value.structurePlanId !==
      `structure-plan:${value.reconstructionPackageArtifactId}:${STRUCTURE_PLAN_CONTRACT_VERSION}`
  ) {
    errors.push("structurePlanId must be derived from the exact Reconstruction Package artifact and contract version");
  }
  if (!isTimestamp(value.createdAt)) errors.push("createdAt must be a valid timestamp");
  validateStringArray(value.limitations, "limitations", errors);
  validateStringArray(value.diagnostics, "diagnostics", errors);

  const candidateRefs = validateLineage(value.lineage, value, errors);
  const candidateRefsById = new Map(candidateRefs.map((candidateRef) => [candidateRef.candidateId, candidateRef]));

  const plannedRoutes = collectArray(value.plannedRoutes, "plannedRoutes", errors, validateRoute);
  const plannedNavigation = collectArray(
    value.plannedNavigation,
    "plannedNavigation",
    errors,
    validateNavigation,
  );
  const plannedSections = collectArray(value.plannedSections, "plannedSections", errors, validateSection);
  const assignments = collectArray(value.assignments, "assignments", errors, validateAssignment);

  validateUniqueStrings(plannedRoutes.map((route) => route.plannedRouteId), "plannedRoutes.plannedRouteId", errors);
  validateUniqueStrings(plannedRoutes.map((route) => route.routePath), "plannedRoutes.routePath", errors);
  validateUniqueStrings(
    plannedNavigation.map((navigation) => navigation.plannedNavigationId),
    "plannedNavigation.plannedNavigationId",
    errors,
  );
  validateUniqueStrings(
    plannedSections.map((section) => section.plannedSectionId),
    "plannedSections.plannedSectionId",
    errors,
  );
  validateUniqueStrings(assignments.map((assignment) => assignment.assignmentId), "assignments.assignmentId", errors);
  validateUniqueStrings(assignments.map((assignment) => assignment.candidateId), "assignments.candidateId", errors);

  const routeIds = new Set(plannedRoutes.map((route) => route.plannedRouteId));
  const navigationIds = new Set(plannedNavigation.map((navigation) => navigation.plannedNavigationId));
  const sectionIds = new Set(plannedSections.map((section) => section.plannedSectionId));
  const assignmentIds = new Set(assignments.map((assignment) => assignment.assignmentId));

  for (const [index, route] of plannedRoutes.entries()) {
    validateCandidateIdsByType(route.sourceCandidateIds, "route", candidateRefsById, `plannedRoutes[${index}].sourceCandidateIds`, errors);
    for (const [assignmentIndex, assignmentId] of route.assignmentIds.entries()) {
      if (!assignmentIds.has(assignmentId)) {
        errors.push(`plannedRoutes[${index}].assignmentIds[${assignmentIndex}] must reference an assignment`);
      }
    }
  }

  for (const [index, navigation] of plannedNavigation.entries()) {
    validateCandidateIdsByType(
      navigation.sourceCandidateIds,
      "navigation",
      candidateRefsById,
      `plannedNavigation[${index}].sourceCandidateIds`,
      errors,
    );
    for (const [routeIndex, routeId] of navigation.plannedRouteIds.entries()) {
      if (!routeIds.has(routeId)) {
        errors.push(`plannedNavigation[${index}].plannedRouteIds[${routeIndex}] must reference a planned route`);
      }
    }
    for (const [assignmentIndex, assignmentId] of navigation.assignmentIds.entries()) {
      if (!assignmentIds.has(assignmentId)) {
        errors.push(`plannedNavigation[${index}].assignmentIds[${assignmentIndex}] must reference an assignment`);
      }
    }
  }

  for (const [index, section] of plannedSections.entries()) {
    if (!routeIds.has(section.plannedRouteId)) {
      errors.push(`plannedSections[${index}].plannedRouteId must reference a planned route`);
    }
    validateCandidateIdsByType(
      section.sourceCandidateIds,
      "section",
      candidateRefsById,
      `plannedSections[${index}].sourceCandidateIds`,
      errors,
    );
    for (const [assignmentIndex, assignmentId] of section.assignmentIds.entries()) {
      if (!assignmentIds.has(assignmentId)) {
        errors.push(`plannedSections[${index}].assignmentIds[${assignmentIndex}] must reference an assignment`);
      }
    }
  }

  const sectionOrdersByRoute = new Map<string, Set<number>>();
  for (const [index, section] of plannedSections.entries()) {
    const orders = sectionOrdersByRoute.get(section.plannedRouteId) ?? new Set<number>();
    if (orders.has(section.sectionOrder)) {
      errors.push(`plannedSections[${index}].sectionOrder must be unique per planned route`);
    }
    orders.add(section.sectionOrder);
    sectionOrdersByRoute.set(section.plannedRouteId, orders);
  }

  for (const [index, assignment] of assignments.entries()) {
    const candidateRef = candidateRefsById.get(assignment.candidateId);
    if (!candidateRef) {
      errors.push(`assignments[${index}].candidateId must reference an included approved candidate`);
    } else if (candidateRef.candidateType !== assignment.candidateType) {
      errors.push(`assignments[${index}].candidateType must match the included approved candidate`);
    }

    if (assignment.targetKind === "route") {
      if (!isNonEmptyString(assignment.plannedRouteId)) {
        errors.push(`assignments[${index}].plannedRouteId is required for route assignments`);
      } else if (!routeIds.has(assignment.plannedRouteId)) {
        errors.push(`assignments[${index}].plannedRouteId must reference a planned route`);
      }
      if (assignment.candidateType !== "route") errors.push(`assignments[${index}].candidateType must be route`);
    } else if (assignment.targetKind === "navigation") {
      if (!isNonEmptyString(assignment.plannedNavigationId)) {
        errors.push(`assignments[${index}].plannedNavigationId is required for navigation assignments`);
      } else if (!navigationIds.has(assignment.plannedNavigationId)) {
        errors.push(`assignments[${index}].plannedNavigationId must reference planned navigation`);
      }
      if (assignment.candidateType !== "navigation") {
        errors.push(`assignments[${index}].candidateType must be navigation`);
      }
    } else if (assignment.targetKind === "section") {
      if (!isNonEmptyString(assignment.plannedSectionId)) {
        errors.push(`assignments[${index}].plannedSectionId is required for section assignments`);
      } else if (!sectionIds.has(assignment.plannedSectionId)) {
        errors.push(`assignments[${index}].plannedSectionId must reference a planned section`);
      }
      if (assignment.candidateType !== "section") errors.push(`assignments[${index}].candidateType must be section`);
    }
  }

  if (
    value.structurePlanStatus !== "blocked" &&
    value.structurePlanStatus !== "invalid" &&
    value.structurePlanStatus !== "stale" &&
    candidateRefs.length === 0
  ) {
    errors.push("A non-blocked Structure Plan must include at least one eligible candidate");
  }
  if (value.structurePlanStatus === "blocked" && assignments.length > 0) {
    errors.push("A blocked Structure Plan must not include assignments");
  }
  if (
    value.structurePlanStatus !== "blocked" &&
    value.structurePlanStatus !== "invalid" &&
    value.structurePlanStatus !== "stale" &&
    assignments.length !== candidateRefs.length
  ) {
    errors.push("assignments must cover every included approved candidate exactly once");
  }
  if (value.structurePlanStatus === "stale") {
    warnings.push("Stale Structure Plans are historical metadata and are not eligible for new work");
  }
  if (isObject(value.lineage) && value.lineage.reconstructionPackageStatus === "stale") {
    warnings.push("Source Reconstruction Package is stale and must not authorize new Structure Planning");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function createBlockedStructurePlan(input: CreateBlockedStructurePlanInput): StructurePlan {
  const defaultLimitationByReason: Record<CreateBlockedStructurePlanReason, string> = {
    no_eligible_candidates: "No included approved candidates are eligible for Structure Planning.",
    invalid_lineage: "Structure Planning is blocked because Reconstruction Package lineage is invalid.",
    stale_reconstruction_package: "Structure Planning is blocked because the Reconstruction Package is stale.",
  };

  return {
    structurePlanId: `structure-plan:${input.reconstructionPackageArtifactId}:${STRUCTURE_PLAN_CONTRACT_VERSION}`,
    structurePlanStatus: "blocked",
    reconstructionPackageArtifactId: input.reconstructionPackageArtifactId,
    candidateReviewPackageArtifactId: input.candidateReviewPackageArtifactId,
    candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    contractVersion: STRUCTURE_PLAN_CONTRACT_VERSION,
    createdAt: input.createdAt,
    lineage: {
      reconstructionPackageArtifactId: input.reconstructionPackageArtifactId,
      reconstructionPackageId: input.reconstructionPackageId,
      reconstructionPackageStatus: input.reconstructionPackageStatus ?? "blocked",
      reconstructionPackageContractVersion: input.reconstructionPackageContractVersion,
      candidateReviewPackageArtifactId: input.candidateReviewPackageArtifactId,
      candidateDiscoveryArtifactId: input.candidateDiscoveryArtifactId,
      siteVersionId: input.siteVersionId,
      dryRunId: input.dryRunId,
      includedCandidateRefs: [],
    },
    plannedRoutes: [],
    plannedNavigation: [],
    plannedSections: [],
    assignments: [],
    limitations: [...(input.limitations ?? [defaultLimitationByReason[input.reason]])],
    diagnostics: [...(input.diagnostics ?? [`STRUCTURE_PLAN_BLOCKED:${input.reason}`])],
  };
}
