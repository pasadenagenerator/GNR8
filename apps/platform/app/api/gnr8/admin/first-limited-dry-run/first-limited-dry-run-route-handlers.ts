import { buildFirstLimitedDryRunOutput } from "@/gnr8/architecture/first-limited-dry-run-builder";
import {
  validateFirstLimitedDryRunOutput,
  type FirstLimitedDryRunOutput,
  type FirstLimitedDryRunOutputValidationResult,
} from "@/gnr8/architecture/first-limited-dry-run-contract";
import {
  FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND,
  persistFirstLimitedDryRunOutput,
  type FirstLimitedDryRunOutputArtifactRecord,
  type FirstLimitedDryRunOutputArtifactReference,
  type FirstLimitedDryRunOutputProvenanceSummary,
} from "@/gnr8/architecture/first-limited-dry-run-output-persistence";
import {
  validateReconstructionDryRunPackage,
  type ReconstructionDryRunPackage,
} from "@/gnr8/architecture/reconstruction-dry-run-contract";
import { getLatestEvidenceCaptureBaselineArtifactForSiteVersion } from "@/gnr8/architecture/evidence-capture-baseline-artifact";
import { stableStringify } from "@/gnr8/runtime/deterministic";
import type { RuntimeStoreDbClient } from "@/gnr8/runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";

type JsonRecord = Record<string, unknown>;

export type FirstLimitedDryRunTriggerResponse = {
  ok: true;
  artifactRef: string;
  artifactKind: typeof FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND;
  outputStatus: FirstLimitedDryRunOutput["outputStatus"];
  validation: FirstLimitedDryRunOutputValidationResult;
  routeModelCount: number;
  navigationModelCount: number;
  sectionModelCount: number;
  limitationsCount: number;
  blockerLimitationsCount: number;
  idempotencyResult: "reused" | "created";
  diagnostics: string[];
};

type FirstLimitedDryRunRouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  withSuperadminClient: <T>(fn: (client: RuntimeStoreDbClient) => Promise<T>) => Promise<T>;
  getSiteVersion: (
    siteVersionId: string,
    options?: { dbClient?: RuntimeStoreDbClient },
  ) => Promise<CanonicalSiteVersionSnapshot | null>;
  setSiteVersionImportProvenanceSummary: (
    input: {
      siteVersionId: string;
      importProvenanceSummary: RuntimeImportProvenanceSummary;
    },
    options?: { dbClient?: RuntimeStoreDbClient },
  ) => Promise<{ affectedRows: number }>;
  buildFirstLimitedDryRunOutput: typeof buildFirstLimitedDryRunOutput;
  validateFirstLimitedDryRunOutput: typeof validateFirstLimitedDryRunOutput;
  persistFirstLimitedDryRunOutput: typeof persistFirstLimitedDryRunOutput;
};

type RequestValidationResult =
  | { valid: true; siteVersionId: string; dryRunId: string }
  | { valid: false; errors: string[] };

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeToken(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function deterministicFailure(
  status: number,
  code: string,
  diagnostics: string[] = [code],
): Response {
  return Response.json(
    {
      ok: false,
      error: code,
      diagnostics,
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

async function parseRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function validateRequestBody(body: unknown): RequestValidationResult {
  if (!isRecord(body)) {
    return { valid: false, errors: ["REQUEST_BODY_MUST_BE_OBJECT"] };
  }

  const allowedKeys = new Set(["siteVersionId", "dryRunId"]);
  const forbiddenKeys = Object.keys(body).filter((key) => !allowedKeys.has(key)).sort();
  const errors = forbiddenKeys.map((key) => `FORBIDDEN_REQUEST_FIELD:${key}`);

  const siteVersionId = normalizeToken(body.siteVersionId);
  const dryRunId = normalizeToken(body.dryRunId);
  if (!siteVersionId) errors.push("SITE_VERSION_ID_REQUIRED");
  if (!dryRunId) errors.push("DRY_RUN_ID_REQUIRED");

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, siteVersionId, dryRunId };
}

function statusForError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("Unauthorized")) return 401;
  if (message.startsWith("Forbidden")) return 403;
  return 500;
}

function readArtifacts(
  summary: RuntimeImportProvenanceSummary | null | undefined,
): FirstLimitedDryRunOutputArtifactRecord[] {
  const provenance = summary as FirstLimitedDryRunOutputProvenanceSummary | null | undefined;
  const artifacts = provenance?.firstLimitedDryRunOutputArtifacts;
  if (!Array.isArray(artifacts)) return [];

  return artifacts.filter((artifact): artifact is FirstLimitedDryRunOutputArtifactRecord => {
    if (!artifact || typeof artifact !== "object") return false;
    if (artifact.kind !== FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND) return false;
    if (artifact.artifactVersion !== 1) return false;
    if (artifact.validation?.valid !== true) return false;
    return validateFirstLimitedDryRunOutput(artifact.output).valid;
  });
}

function selectLatestFirstLimitedArtifact(input: {
  siteVersion: CanonicalSiteVersionSnapshot;
  siteVersionId: string;
  dryRunId: string;
}): FirstLimitedDryRunOutputArtifactRecord | null {
  const matches = readArtifacts(input.siteVersion.importProvenanceSummary).filter(
    (artifact) =>
      artifact.siteVersionId === input.siteVersionId && artifact.dryRunId === input.dryRunId,
  );
  if (matches.length === 0) return null;

  return matches
    .slice()
    .sort((a, b) => {
      const persistedOrder = a.persistedAt.localeCompare(b.persistedAt);
      if (persistedOrder !== 0) return persistedOrder;
      return a.artifactId.localeCompare(b.artifactId);
    })
    .at(-1) ?? null;
}

function toArtifactReference(
  artifact: FirstLimitedDryRunOutputArtifactRecord,
): FirstLimitedDryRunOutputArtifactReference {
  return {
    kind: artifact.kind,
    artifactId: artifact.artifactId,
    siteVersionId: artifact.siteVersionId,
    dryRunId: artifact.dryRunId,
    outputId: artifact.outputId,
    persistedAt: artifact.persistedAt,
    validation: JSON.parse(JSON.stringify(artifact.validation)) as FirstLimitedDryRunOutputValidationResult,
    diagnostics: [...artifact.diagnostics],
  };
}

function outputEquivalent(left: FirstLimitedDryRunOutput, right: FirstLimitedDryRunOutput): boolean {
  return stableStringify(left) === stableStringify(right);
}

function collectDryRunPackageCandidates(summary: RuntimeImportProvenanceSummary | null | undefined): unknown[] {
  const record = summary as JsonRecord | null | undefined;
  if (!record) return [];

  const candidates: unknown[] = [];
  for (const key of [
    "latestReconstructionDryRunPackage",
    "reconstructionDryRunPackage",
    "dryRunPackage",
  ]) {
    if (record[key]) candidates.push(record[key]);
  }

  for (const key of [
    "reconstructionDryRunPackages",
    "dryRunPackages",
  ]) {
    if (Array.isArray(record[key])) candidates.push(...record[key]);
  }

  return candidates;
}

function loadDryRunPackage(input: {
  siteVersion: CanonicalSiteVersionSnapshot;
  siteVersionId: string;
  dryRunId: string;
}): ReconstructionDryRunPackage | null {
  for (const candidate of collectDryRunPackageCandidates(input.siteVersion.importProvenanceSummary)) {
    if (!isRecord(candidate)) continue;
    if (candidate.dryRunId !== input.dryRunId) continue;
    const validation = validateReconstructionDryRunPackage(candidate);
    if (!validation.valid) continue;
    if (candidate.siteVersionId !== input.siteVersionId) continue;
    return JSON.parse(JSON.stringify(candidate)) as ReconstructionDryRunPackage;
  }

  return null;
}

function countBlockerLimitations(output: FirstLimitedDryRunOutput): number {
  return output.limitations.filter((limitation) => limitation.severity === "blocker").length;
}

function successResponse(input: {
  artifact: FirstLimitedDryRunOutputArtifactReference;
  output: FirstLimitedDryRunOutput;
  validation: FirstLimitedDryRunOutputValidationResult;
  idempotencyResult: "reused" | "created";
  diagnostics: string[];
}): Response {
  const body: FirstLimitedDryRunTriggerResponse = {
    ok: true,
    artifactRef: input.artifact.artifactId,
    artifactKind: FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND,
    outputStatus: input.output.outputStatus,
    validation: input.validation,
    routeModelCount: input.output.routeModels.length,
    navigationModelCount: input.output.navigationModels.length,
    sectionModelCount: input.output.sectionModels.length,
    limitationsCount: input.output.limitations.length,
    blockerLimitationsCount: countBlockerLimitations(input.output),
    idempotencyResult: input.idempotencyResult,
    diagnostics: input.diagnostics,
  };

  return Response.json(body, { headers: { "cache-control": "no-store" } });
}

async function defaultRequireSuperadminUserId(): Promise<string> {
  const { requireSuperadminUserId } = await import("@/src/superadmin/require-superadmin-user-id");
  return requireSuperadminUserId();
}

async function defaultWithSuperadminClient<T>(
  fn: (client: RuntimeStoreDbClient) => Promise<T>,
): Promise<T> {
  const { withSuperadminClient } = await import("@/src/superadmin/db");
  return withSuperadminClient(fn);
}

async function defaultGetSiteVersion(
  siteVersionId: string,
  options?: { dbClient?: RuntimeStoreDbClient },
): Promise<CanonicalSiteVersionSnapshot | null> {
  const { getSiteVersion } = await import("@/gnr8/runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

async function defaultSetSiteVersionImportProvenanceSummary(
  input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  },
  options?: { dbClient?: RuntimeStoreDbClient },
): Promise<{ affectedRows: number }> {
  const { setSiteVersionImportProvenanceSummary } = await import("@/gnr8/runtime/runtime-store");
  return setSiteVersionImportProvenanceSummary(input, options);
}

export function createFirstLimitedDryRunRouteHandlers(
  deps: Partial<FirstLimitedDryRunRouteDeps> = {},
) {
  const resolvedDeps: FirstLimitedDryRunRouteDeps = {
    requireSuperadminUserId: defaultRequireSuperadminUserId,
    withSuperadminClient: defaultWithSuperadminClient,
    getSiteVersion: defaultGetSiteVersion,
    setSiteVersionImportProvenanceSummary: defaultSetSiteVersionImportProvenanceSummary,
    buildFirstLimitedDryRunOutput,
    validateFirstLimitedDryRunOutput,
    persistFirstLimitedDryRunOutput,
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      const body = await parseRequestBody(request);
      const requestValidation = validateRequestBody(body);
      if (!requestValidation.valid) {
        return deterministicFailure(400, "INVALID_REQUEST", requestValidation.errors);
      }

      try {
        await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return deterministicFailure(statusForError(error), "SUPERADMIN_REQUIRED", ["SUPERADMIN_REQUIRED"]);
      }

      try {
        return await resolvedDeps.withSuperadminClient(async (dbClient: RuntimeStoreDbClient) => {
          const siteVersion = await resolvedDeps.getSiteVersion(requestValidation.siteVersionId, {
            dbClient,
          });
          if (!siteVersion) {
            return deterministicFailure(404, "SITE_VERSION_NOT_FOUND", ["SITE_VERSION_NOT_FOUND"]);
          }

          const baseline = getLatestEvidenceCaptureBaselineArtifactForSiteVersion({ siteVersion });
          if (!baseline) {
            return deterministicFailure(409, "EVIDENCE_CAPTURE_BASELINE_MISSING", [
              "EVIDENCE_CAPTURE_BASELINE_MISSING",
            ]);
          }

          const dryRunPackage = loadDryRunPackage({
            siteVersion,
            siteVersionId: requestValidation.siteVersionId,
            dryRunId: requestValidation.dryRunId,
          });
          if (!dryRunPackage) {
            return deterministicFailure(404, "RECONSTRUCTION_DRY_RUN_PACKAGE_NOT_FOUND", [
              "RECONSTRUCTION_DRY_RUN_PACKAGE_NOT_FOUND",
            ]);
          }

          const output = resolvedDeps.buildFirstLimitedDryRunOutput(dryRunPackage, {
            evidenceCaptureBaseline: baseline,
          });
          const validation = resolvedDeps.validateFirstLimitedDryRunOutput(output);
          if (!validation.valid) {
            return deterministicFailure(422, "FIRST_LIMITED_DRY_RUN_OUTPUT_INVALID", [
              "FIRST_LIMITED_DRY_RUN_OUTPUT_INVALID",
              ...validation.errors,
            ]);
          }

          const latestArtifact = selectLatestFirstLimitedArtifact({
            siteVersion,
            siteVersionId: requestValidation.siteVersionId,
            dryRunId: requestValidation.dryRunId,
          });

          if (latestArtifact && outputEquivalent(output, latestArtifact.output)) {
            return successResponse({
              artifact: toArtifactReference(latestArtifact),
              output,
              validation,
              idempotencyResult: "reused",
              diagnostics: [
                "FIRST_LIMITED_DRY_RUN_TRIGGER_SUCCEEDED",
                "FIRST_LIMITED_DRY_RUN_OUTPUT_REUSED",
              ],
            });
          }

          const artifact = await resolvedDeps.persistFirstLimitedDryRunOutput({
            siteVersionId: requestValidation.siteVersionId,
            dryRunId: requestValidation.dryRunId,
            output,
            options: {
              dbClient,
              getSiteVersion: async (siteVersionId) =>
                resolvedDeps.getSiteVersion(siteVersionId, { dbClient }),
              setSiteVersionImportProvenanceSummary: async (input) =>
                resolvedDeps.setSiteVersionImportProvenanceSummary(input, { dbClient }),
            },
          });

          return successResponse({
            artifact,
            output,
            validation,
            idempotencyResult: "created",
            diagnostics: [
              "FIRST_LIMITED_DRY_RUN_TRIGGER_SUCCEEDED",
              "FIRST_LIMITED_DRY_RUN_OUTPUT_CREATED",
            ],
          });
        });
      } catch {
        return deterministicFailure(500, "FIRST_LIMITED_DRY_RUN_TRIGGER_FAILED", [
          "FIRST_LIMITED_DRY_RUN_TRIGGER_FAILED",
        ]);
      }
    },
  };
}
