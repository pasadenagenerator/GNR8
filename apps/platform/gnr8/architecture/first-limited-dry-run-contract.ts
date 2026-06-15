/**
 * Phase 8B-1 first limited dry-run output contract.
 *
 * This module defines the formal object shape for the first limited Dry Run:
 * Route Model, Navigation Model, and Section Model only. It does not execute a
 * dry run, execute simulation, execute reconstruction, call AI systems,
 * generate React, generate GNR8 blocks, generate content, generate design
 * tokens, persist output, dispatch workers, or publish anything.
 */

import type {
  CaptureExpansionConfidenceLevel,
  EvidenceBoundingBox,
  SectionBoundaryRegionType,
} from "./evidence-capture-layout-contract";
import type {
  ReconstructionDryRunLimitation,
  ReconstructionDryRunPackage,
} from "./reconstruction-dry-run-contract";
import type { ReconstructionPlanningRouteScope } from "./reconstruction-planning-contract";

export const FIRST_LIMITED_DRY_RUN_OUTPUT_STATUSES = [
  "planned",
  "valid",
  "invalid",
  "blocked",
] as const;
export type FirstLimitedDryRunOutputStatus =
  (typeof FIRST_LIMITED_DRY_RUN_OUTPUT_STATUSES)[number];

export type LimitedDryRunNavigationItem = {
  label: string;
  href: string;
  position: number;
  confidenceLevel: CaptureExpansionConfidenceLevel;
  sourceEvidenceRefs: string[];
};

export type LimitedDryRunRouteModel = {
  routePath: string;
  sourceUrl: string;
  sectionRefs: string[];
  navigationRefs: string[];
  limitationRefs: string[];
  confidenceLevel: CaptureExpansionConfidenceLevel;
};

export type LimitedDryRunNavigationModel = {
  navigationId: string;
  routePath: string;
  items: LimitedDryRunNavigationItem[];
  confidenceLevel: CaptureExpansionConfidenceLevel;
  sourceEvidenceRefs: string[];
  limitationRefs: string[];
};

export type LimitedDryRunSectionModel = {
  sectionId: string;
  routePath: string;
  regionType: SectionBoundaryRegionType;
  selector: string;
  boundingBox: EvidenceBoundingBox;
  confidenceLevel: CaptureExpansionConfidenceLevel;
  sourceEvidenceRefs: string[];
  limitationRefs: string[];
};

export type FirstLimitedDryRunOutput = {
  outputId: string;
  dryRunId: string;
  reconstructionPackageId: string;
  siteVersionId: string;
  routeScope: ReconstructionPlanningRouteScope;
  outputStatus: FirstLimitedDryRunOutputStatus;
  routeModels: LimitedDryRunRouteModel[];
  navigationModels: LimitedDryRunNavigationModel[];
  sectionModels: LimitedDryRunSectionModel[];
  limitations: ReconstructionDryRunLimitation[];
  evidenceRefs: string[];
  createdAt: string;
};

export type FirstLimitedDryRunOutputValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export const FIRST_LIMITED_DRY_RUN_FORBIDDEN_OUTPUT_KEYS = [
  "blockModel",
  "blockModels",
  "blocks",
  "gnr8Blocks",
  "contentModel",
  "contentModels",
  "generatedContent",
  "designTokenModel",
  "designTokenModels",
  "designTokens",
  "react",
  "reactOutput",
  "reactComponents",
  "jsx",
  "cmsBinding",
  "cmsBindings",
  "publishingArtifact",
  "publishingArtifacts",
  "publishArtifacts",
  "publishedArtifacts",
  "generatedOutputs",
] as const;

const FIRST_LIMITED_DRY_RUN_EXECUTED_OUTPUT_STATUSES = [
  "executed",
  "completed",
  "complete",
  "published",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.length > 0;
}

function isKnownOutputStatus(value: unknown): value is FirstLimitedDryRunOutputStatus {
  return (
    typeof value === "string" &&
    FIRST_LIMITED_DRY_RUN_OUTPUT_STATUSES.includes(
      value as FirstLimitedDryRunOutputStatus,
    )
  );
}

function isExecutedOutputStatus(value: unknown): boolean {
  return (
    typeof value === "string" &&
    FIRST_LIMITED_DRY_RUN_EXECUTED_OUTPUT_STATUSES.includes(
      value as (typeof FIRST_LIMITED_DRY_RUN_EXECUTED_OUTPUT_STATUSES)[number],
    )
  );
}

function isKnownConfidenceLevel(value: unknown): value is CaptureExpansionConfidenceLevel {
  return value === "LOW" || value === "MEDIUM" || value === "HIGH";
}

function isKnownRegionType(value: unknown): value is SectionBoundaryRegionType {
  return (
    value === "hero" ||
    value === "navigation" ||
    value === "content" ||
    value === "sidebar" ||
    value === "footer" ||
    value === "gallery" ||
    value === "form" ||
    value === "map" ||
    value === "unknown"
  );
}

function validateStringArray(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }

  for (const [index, item] of value.entries()) {
    if (typeof item !== "string") {
      errors.push(`${path}[${index}] must be a string`);
    }
  }
}

function validateBoundingBox(value: unknown, path: string, errors: string[]): void {
  if (!isObject(value)) {
    errors.push(`${path} must be an object`);
    return;
  }

  for (const key of ["x", "y", "width", "height"] as const) {
    if (typeof value[key] !== "number" || !Number.isFinite(value[key])) {
      errors.push(`${path}.${key} must be a finite number`);
    }
  }
}

function validateRouteModels(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }

  for (const [index, model] of value.entries()) {
    const modelPath = `${path}[${index}]`;
    if (!isObject(model)) {
      errors.push(`${modelPath} must be an object`);
      continue;
    }

    if (!hasNonEmptyString(model.routePath)) errors.push(`${modelPath}.routePath is required`);
    if (!hasNonEmptyString(model.sourceUrl)) errors.push(`${modelPath}.sourceUrl is required`);
    validateStringArray(model.sectionRefs, `${modelPath}.sectionRefs`, errors);
    validateStringArray(model.navigationRefs, `${modelPath}.navigationRefs`, errors);
    validateStringArray(model.limitationRefs, `${modelPath}.limitationRefs`, errors);
    if (!isKnownConfidenceLevel(model.confidenceLevel)) {
      errors.push(`${modelPath}.confidenceLevel must be LOW, MEDIUM, or HIGH`);
    }
  }
}

function validateNavigationItems(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }

  for (const [index, item] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!isObject(item)) {
      errors.push(`${itemPath} must be an object`);
      continue;
    }

    if (!hasNonEmptyString(item.label)) errors.push(`${itemPath}.label is required`);
    if (!hasNonEmptyString(item.href)) errors.push(`${itemPath}.href is required`);
    if (typeof item.position !== "number" || !Number.isInteger(item.position)) {
      errors.push(`${itemPath}.position must be an integer`);
    }
    if (!isKnownConfidenceLevel(item.confidenceLevel)) {
      errors.push(`${itemPath}.confidenceLevel must be LOW, MEDIUM, or HIGH`);
    }
    validateStringArray(item.sourceEvidenceRefs, `${itemPath}.sourceEvidenceRefs`, errors);
  }
}

function validateNavigationModels(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }

  for (const [index, model] of value.entries()) {
    const modelPath = `${path}[${index}]`;
    if (!isObject(model)) {
      errors.push(`${modelPath} must be an object`);
      continue;
    }

    if (!hasNonEmptyString(model.navigationId)) {
      errors.push(`${modelPath}.navigationId is required`);
    }
    if (!hasNonEmptyString(model.routePath)) errors.push(`${modelPath}.routePath is required`);
    validateNavigationItems(model.items, `${modelPath}.items`, errors);
    if (!isKnownConfidenceLevel(model.confidenceLevel)) {
      errors.push(`${modelPath}.confidenceLevel must be LOW, MEDIUM, or HIGH`);
    }
    validateStringArray(model.sourceEvidenceRefs, `${modelPath}.sourceEvidenceRefs`, errors);
    validateStringArray(model.limitationRefs, `${modelPath}.limitationRefs`, errors);
  }
}

function validateSectionModels(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }

  for (const [index, model] of value.entries()) {
    const modelPath = `${path}[${index}]`;
    if (!isObject(model)) {
      errors.push(`${modelPath} must be an object`);
      continue;
    }

    if (!hasNonEmptyString(model.sectionId)) errors.push(`${modelPath}.sectionId is required`);
    if (!hasNonEmptyString(model.routePath)) errors.push(`${modelPath}.routePath is required`);
    if (!isKnownRegionType(model.regionType)) {
      errors.push(`${modelPath}.regionType must be a known section boundary region type`);
    }
    if (!hasNonEmptyString(model.selector)) errors.push(`${modelPath}.selector is required`);
    validateBoundingBox(model.boundingBox, `${modelPath}.boundingBox`, errors);
    if (!isKnownConfidenceLevel(model.confidenceLevel)) {
      errors.push(`${modelPath}.confidenceLevel must be LOW, MEDIUM, or HIGH`);
    }
    validateStringArray(model.sourceEvidenceRefs, `${modelPath}.sourceEvidenceRefs`, errors);
    validateStringArray(model.limitationRefs, `${modelPath}.limitationRefs`, errors);
  }
}

function validateForbiddenOutputKeys(
  value: unknown,
  path: string,
  errors: string[],
  seen: WeakSet<object>,
): void {
  if (!isObject(value)) return;
  if (seen.has(value)) return;
  seen.add(value);

  for (const [key, nestedValue] of Object.entries(value)) {
    const nestedPath = path ? `${path}.${key}` : key;
    if (
      FIRST_LIMITED_DRY_RUN_FORBIDDEN_OUTPUT_KEYS.includes(
        key as (typeof FIRST_LIMITED_DRY_RUN_FORBIDDEN_OUTPUT_KEYS)[number],
      )
    ) {
      errors.push(`${nestedPath} is forbidden in first limited dry-run output`);
    }

    if (isObject(nestedValue) || Array.isArray(nestedValue)) {
      validateForbiddenOutputKeys(nestedValue, nestedPath, errors, seen);
    }
  }
}

export function validateFirstLimitedDryRunOutput(
  output: unknown,
): FirstLimitedDryRunOutputValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(output)) {
    return {
      valid: false,
      errors: ["first limited dry-run output must be an object"],
      warnings,
    };
  }

  validateForbiddenOutputKeys(output, "", errors, new WeakSet<object>());

  if (!hasNonEmptyString(output.outputId)) errors.push("outputId is required");
  if (!hasNonEmptyString(output.dryRunId)) errors.push("dryRunId is required");
  if (!hasNonEmptyString(output.reconstructionPackageId)) {
    errors.push("reconstructionPackageId is required");
  }
  if (!hasNonEmptyString(output.siteVersionId)) errors.push("siteVersionId is required");
  if (!isObject(output.routeScope)) errors.push("routeScope is required");

  if (isExecutedOutputStatus(output.outputStatus)) {
    errors.push("outputStatus must not be executed, completed, complete, or published");
  } else if (!isKnownOutputStatus(output.outputStatus)) {
    errors.push("outputStatus must be planned, valid, invalid, or blocked");
  }

  validateRouteModels(output.routeModels, "routeModels", errors);
  validateNavigationModels(output.navigationModels, "navigationModels", errors);
  validateSectionModels(output.sectionModels, "sectionModels", errors);

  if (!Array.isArray(output.limitations)) errors.push("limitations must be an array");
  validateStringArray(output.evidenceRefs, "evidenceRefs", errors);
  if (!hasNonEmptyString(output.createdAt)) errors.push("createdAt is required");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function createEmptyFirstLimitedDryRunOutput(
  dryRunPackage: ReconstructionDryRunPackage,
): FirstLimitedDryRunOutput {
  return {
    outputId: `${dryRunPackage.dryRunId}:first-limited-output`,
    dryRunId: dryRunPackage.dryRunId,
    reconstructionPackageId: dryRunPackage.reconstructionPackageId,
    siteVersionId: dryRunPackage.siteVersionId,
    routeScope: dryRunPackage.routeScope,
    outputStatus: "planned",
    routeModels: [],
    navigationModels: [],
    sectionModels: [],
    limitations: [...dryRunPackage.limitations],
    evidenceRefs: [],
    createdAt: dryRunPackage.createdAt,
  };
}
