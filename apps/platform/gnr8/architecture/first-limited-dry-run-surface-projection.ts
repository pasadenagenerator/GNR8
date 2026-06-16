import {
  validateFirstLimitedDryRunOutput,
  type FirstLimitedDryRunOutput,
  type FirstLimitedDryRunOutputStatus,
  type FirstLimitedDryRunOutputValidationResult,
  type LimitedDryRunNavigationModel,
  type LimitedDryRunRouteModel,
  type LimitedDryRunSectionModel,
} from "./first-limited-dry-run-contract";
import {
  FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND,
  type FirstLimitedDryRunOutputArtifactRecord,
  type FirstLimitedDryRunOutputPersistenceOptions,
  type FirstLimitedDryRunOutputProvenanceSummary,
} from "./first-limited-dry-run-output-persistence";
import type { ReconstructionDryRunLimitation } from "./reconstruction-dry-run-contract";
import type { RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";

type ArtifactStatus = "missing" | "present" | "invalid" | "blocked";
type ValidationStatus = "missing" | "valid" | "invalid";

type SurfaceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

type SafeArtifactRecord = Partial<FirstLimitedDryRunOutputArtifactRecord> & {
  output?: unknown;
  validation?: Partial<FirstLimitedDryRunOutputValidationResult> | null;
  diagnostics?: unknown;
};

export type FirstLimitedDryRunSurfaceProjection = {
  artifactStatus: ArtifactStatus;
  artifactRef: string | null;
  artifactKind: typeof FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND | null;
  dryRunId: string | null;
  siteVersionId: string;
  outputId: string | null;
  outputStatus: FirstLimitedDryRunOutputStatus | "unknown";
  validationStatus: ValidationStatus;
  validation: FirstLimitedDryRunOutputValidationResult;
  routeModelCount: number;
  navigationModelCount: number;
  sectionModelCount: number;
  limitationsCount: number;
  blockerLimitationsCount: number;
  diagnostics: string[];
  createdAt: string | null;
  persistedAt: string | null;
  reconstructionPackageId: string | null;
  evidenceRefCount: number;
  routeModels: LimitedDryRunRouteModel[];
  navigationModels: LimitedDryRunNavigationModel[];
  sectionModels: LimitedDryRunSectionModel[];
  limitations: ReconstructionDryRunLimitation[];
};

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function safeDiagnostics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function safeValidation(value: unknown): FirstLimitedDryRunOutputValidationResult {
  if (!isRecord(value)) {
    return { valid: false, errors: ["persisted validation metadata is missing"], warnings: [] };
  }

  return {
    valid: value.valid === true,
    errors: safeDiagnostics(value.errors),
    warnings: safeDiagnostics(value.warnings),
  };
}

function collectArtifactCandidates(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): SafeArtifactRecord[] {
  const provenance = summary as FirstLimitedDryRunOutputProvenanceSummary | null | undefined;
  const candidates: SafeArtifactRecord[] = [];

  if (provenance?.latestFirstLimitedDryRunOutputArtifact) {
    candidates.push(provenance.latestFirstLimitedDryRunOutputArtifact);
  }

  if (Array.isArray(provenance?.firstLimitedDryRunOutputArtifacts)) {
    candidates.push(...provenance.firstLimitedDryRunOutputArtifacts);
  }

  return candidates.filter((artifact): artifact is SafeArtifactRecord => {
    if (!artifact || typeof artifact !== "object") return false;
    if (artifact.kind !== FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND) return false;
    if (artifact.artifactVersion !== 1) return false;
    return true;
  });
}

function selectLatestArtifact(input: {
  summary: RuntimeImportProvenanceSummary | null | undefined;
  siteVersionId: string;
  dryRunId?: string;
}): SafeArtifactRecord | null {
  const matches = collectArtifactCandidates(input.summary).filter((artifact) => {
    if (artifact.siteVersionId !== input.siteVersionId) return false;
    if (input.dryRunId && artifact.dryRunId !== input.dryRunId) return false;
    return true;
  });
  if (matches.length === 0) return null;

  return matches
    .slice()
    .sort((a, b) => {
      const persistedOrder = String(a.persistedAt ?? "").localeCompare(String(b.persistedAt ?? ""));
      if (persistedOrder !== 0) return persistedOrder;
      return String(a.artifactId ?? "").localeCompare(String(b.artifactId ?? ""));
    })
    .at(-1) ?? null;
}

function mergeValidation(input: {
  persisted: FirstLimitedDryRunOutputValidationResult;
  current: FirstLimitedDryRunOutputValidationResult;
}): FirstLimitedDryRunOutputValidationResult {
  const errors = [...input.persisted.errors, ...input.current.errors];
  const warnings = [...input.persisted.warnings, ...input.current.warnings];
  if (input.persisted.valid !== true) {
    errors.unshift("persisted validation metadata is invalid");
  }

  return {
    valid: input.persisted.valid === true && input.current.valid && errors.length === 0,
    errors,
    warnings,
  };
}

function countBlockerLimitations(limitations: ReconstructionDryRunLimitation[]): number {
  return limitations.filter((limitation) => limitation.severity === "blocker").length;
}

function missingProjection(siteVersionId: string): FirstLimitedDryRunSurfaceProjection {
  return {
    artifactStatus: "missing",
    artifactRef: null,
    artifactKind: null,
    dryRunId: null,
    siteVersionId,
    outputId: null,
    outputStatus: "unknown",
    validationStatus: "missing",
    validation: { valid: false, errors: [], warnings: [] },
    routeModelCount: 0,
    navigationModelCount: 0,
    sectionModelCount: 0,
    limitationsCount: 0,
    blockerLimitationsCount: 0,
    diagnostics: ["FIRST_LIMITED_DRY_RUN_OUTPUT_MISSING"],
    createdAt: null,
    persistedAt: null,
    reconstructionPackageId: null,
    evidenceRefCount: 0,
    routeModels: [],
    navigationModels: [],
    sectionModels: [],
    limitations: [],
  };
}

export function projectFirstLimitedDryRunSurface(input: {
  siteVersionId: string;
  artifact: unknown;
}): FirstLimitedDryRunSurfaceProjection {
  if (!isRecord(input.artifact)) {
    return missingProjection(input.siteVersionId);
  }

  const artifact = input.artifact as SafeArtifactRecord;
  const persistedValidation = safeValidation(artifact.validation);
  const currentValidation = validateFirstLimitedDryRunOutput(artifact.output);
  const validation = mergeValidation({
    persisted: persistedValidation,
    current: currentValidation,
  });
  const validOutput = validation.valid ? (cloneJson(artifact.output) as FirstLimitedDryRunOutput) : null;
  const limitations = validOutput?.limitations ?? [];
  const blockerLimitationsCount = countBlockerLimitations(limitations);
  const outputStatus = validOutput?.outputStatus ?? "unknown";
  const artifactStatus: ArtifactStatus = !validation.valid
    ? "invalid"
    : outputStatus === "blocked" || blockerLimitationsCount > 0
      ? "blocked"
      : "present";

  return {
    artifactStatus,
    artifactRef: safeString(artifact.artifactId),
    artifactKind: artifact.kind === FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND
      ? FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND
      : null,
    dryRunId: safeString(artifact.dryRunId) ?? validOutput?.dryRunId ?? null,
    siteVersionId: input.siteVersionId,
    outputId: safeString(artifact.outputId) ?? validOutput?.outputId ?? null,
    outputStatus,
    validationStatus: validation.valid ? "valid" : "invalid",
    validation,
    routeModelCount: validOutput?.routeModels.length ?? 0,
    navigationModelCount: validOutput?.navigationModels.length ?? 0,
    sectionModelCount: validOutput?.sectionModels.length ?? 0,
    limitationsCount: limitations.length,
    blockerLimitationsCount,
    diagnostics: [
      ...safeDiagnostics(artifact.diagnostics),
      ...validation.errors,
      ...validation.warnings,
    ],
    createdAt: safeString(artifact.outputCreatedAt) ?? validOutput?.createdAt ?? null,
    persistedAt: safeString(artifact.persistedAt),
    reconstructionPackageId: validOutput?.reconstructionPackageId ?? null,
    evidenceRefCount: validOutput?.evidenceRefs.length ?? 0,
    routeModels: validOutput?.routeModels ?? [],
    navigationModels: validOutput?.navigationModels ?? [],
    sectionModels: validOutput?.sectionModels ?? [],
    limitations,
  };
}

async function defaultGetSiteVersion(
  siteVersionId: string,
  options: FirstLimitedDryRunOutputPersistenceOptions,
): Promise<SurfaceSiteVersion | null> {
  const { getSiteVersion } = await import("@/gnr8/runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

export async function loadLatestFirstLimitedDryRunSurfaceProjection(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: FirstLimitedDryRunOutputPersistenceOptions;
}): Promise<FirstLimitedDryRunSurfaceProjection> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);

  if (!siteVersion) {
    return missingProjection(input.siteVersionId);
  }

  const artifact = selectLatestArtifact({
    summary: siteVersion.importProvenanceSummary,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
  });

  if (!artifact) {
    return missingProjection(input.siteVersionId);
  }

  return projectFirstLimitedDryRunSurface({
    siteVersionId: input.siteVersionId,
    artifact,
  });
}
