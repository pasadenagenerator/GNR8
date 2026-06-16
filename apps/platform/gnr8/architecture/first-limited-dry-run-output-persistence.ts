/**
 * Phase 8B-5 first limited dry-run output persistence.
 *
 * This module persists and reads the deterministic FirstLimitedDryRunOutput as a
 * control-plane provenance artifact only. It does not execute a dry run, trigger
 * runtime/API work, dispatch workers, generate output, or publish anything.
 */

import { sha256Hex, stableStringify } from "@/gnr8/runtime/deterministic";
import type { RuntimeStoreDbOptions } from "@/gnr8/runtime/runtime-store";
import type { RuntimeImportProvenanceSummary } from "@/gnr8/runtime/types";
import {
  validateFirstLimitedDryRunOutput,
  type FirstLimitedDryRunOutput,
  type FirstLimitedDryRunOutputValidationResult,
} from "./first-limited-dry-run-contract";

export const FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND =
  "first_limited_dry_run_output" as const;

export type FirstLimitedDryRunOutputArtifactRecord = {
  kind: typeof FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND;
  artifactVersion: 1;
  artifactId: string;
  siteVersionId: string;
  dryRunId: string;
  outputId: string;
  outputCreatedAt: string;
  persistedAt: string;
  output: FirstLimitedDryRunOutput;
  validation: FirstLimitedDryRunOutputValidationResult;
  diagnostics: string[];
};

export type FirstLimitedDryRunOutputArtifactReference = {
  kind: typeof FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND;
  artifactId: string;
  siteVersionId: string;
  dryRunId: string;
  outputId: string;
  persistedAt: string;
  validation: FirstLimitedDryRunOutputValidationResult;
  diagnostics: string[];
};

export type FirstLimitedDryRunOutputProvenanceSummary =
  RuntimeImportProvenanceSummary & {
    firstLimitedDryRunOutputArtifacts?: FirstLimitedDryRunOutputArtifactRecord[];
    latestFirstLimitedDryRunOutputArtifact?: FirstLimitedDryRunOutputArtifactRecord | null;
  };

type PersistenceSiteVersion = {
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
};

export type FirstLimitedDryRunOutputPersistenceOptions = RuntimeStoreDbOptions & {
  persistedAt?: string;
  getSiteVersion?: (siteVersionId: string) => Promise<PersistenceSiteVersion | null>;
  setSiteVersionImportProvenanceSummary?: (input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  }) => Promise<{ affectedRows: number }>;
};

export class FirstLimitedDryRunOutputPersistenceValidationError extends Error {
  readonly validation: FirstLimitedDryRunOutputValidationResult;

  constructor(validation: FirstLimitedDryRunOutputValidationResult) {
    super("FirstLimitedDryRunOutput is invalid and was not persisted.");
    this.name = "FirstLimitedDryRunOutputPersistenceValidationError";
    this.validation = validation;
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createArtifactId(input: {
  siteVersionId: string;
  dryRunId: string;
  output: FirstLimitedDryRunOutput;
  persistedAt: string;
}): string {
  const hash = sha256Hex(stableStringify(input)).slice(0, 32);
  return `first_limited_dry_run_output_${hash}`;
}

function mergeValidationDiagnostics(input: {
  validation: FirstLimitedDryRunOutputValidationResult;
  siteVersionId: string;
  dryRunId: string;
  output: FirstLimitedDryRunOutput;
}): FirstLimitedDryRunOutputValidationResult {
  const errors = [...input.validation.errors];
  if (input.output.siteVersionId !== input.siteVersionId) {
    errors.push("output.siteVersionId must match persisted siteVersionId");
  }
  if (input.output.dryRunId !== input.dryRunId) {
    errors.push("output.dryRunId must match persisted dryRunId");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: [...input.validation.warnings],
  };
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
    validation: cloneJson(artifact.validation),
    diagnostics: [...artifact.diagnostics],
  };
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
    if (!artifact.output) return false;
    if (artifact.validation?.valid !== true) return false;
    return validateFirstLimitedDryRunOutput(artifact.output).valid;
  });
}

function selectLatestArtifact(input: {
  artifacts: FirstLimitedDryRunOutputArtifactRecord[];
  siteVersionId: string;
  dryRunId?: string;
}): FirstLimitedDryRunOutputArtifactRecord | null {
  const matches = input.artifacts.filter((artifact) => {
    if (artifact.siteVersionId !== input.siteVersionId) return false;
    if (input.dryRunId && artifact.dryRunId !== input.dryRunId) return false;
    return true;
  });
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

async function defaultGetSiteVersion(
  siteVersionId: string,
  options: RuntimeStoreDbOptions,
): Promise<PersistenceSiteVersion | null> {
  const { getSiteVersion } = await import("@/gnr8/runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

async function defaultSetSiteVersionImportProvenanceSummary(
  input: {
    siteVersionId: string;
    importProvenanceSummary: RuntimeImportProvenanceSummary;
  },
  options: RuntimeStoreDbOptions,
): Promise<{ affectedRows: number }> {
  const { setSiteVersionImportProvenanceSummary } = await import("@/gnr8/runtime/runtime-store");
  return setSiteVersionImportProvenanceSummary(input, options);
}

export async function persistFirstLimitedDryRunOutput(input: {
  siteVersionId: string;
  dryRunId: string;
  output: FirstLimitedDryRunOutput;
  options?: FirstLimitedDryRunOutputPersistenceOptions;
}): Promise<FirstLimitedDryRunOutputArtifactReference> {
  const baseValidation = validateFirstLimitedDryRunOutput(input.output);
  const validation = mergeValidationDiagnostics({
    validation: baseValidation,
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    output: input.output,
  });
  if (!validation.valid) {
    throw new FirstLimitedDryRunOutputPersistenceValidationError(validation);
  }

  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) {
    throw new Error(`Runtime site version not found for first limited dry-run output persistence: ${input.siteVersionId}`);
  }

  const persistedAt = options.persistedAt ?? new Date().toISOString();
  const artifact: FirstLimitedDryRunOutputArtifactRecord = {
    kind: FIRST_LIMITED_DRY_RUN_OUTPUT_ARTIFACT_KIND,
    artifactVersion: 1,
    artifactId: createArtifactId({
      siteVersionId: input.siteVersionId,
      dryRunId: input.dryRunId,
      output: input.output,
      persistedAt,
    }),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
    outputId: input.output.outputId,
    outputCreatedAt: input.output.createdAt,
    persistedAt,
    output: cloneJson(input.output),
    validation: cloneJson(validation),
    diagnostics: ["FIRST_LIMITED_DRY_RUN_OUTPUT_VALIDATION_PASSED"],
  };

  const existingSummary =
    siteVersion.importProvenanceSummary ??
    ({ kind: "runtime_import_provenance_summary_v1" } as RuntimeImportProvenanceSummary);
  const previousArtifacts = readArtifacts(existingSummary);
  const nextSummary: FirstLimitedDryRunOutputProvenanceSummary = {
    ...existingSummary,
    firstLimitedDryRunOutputArtifacts: [...previousArtifacts, artifact],
    latestFirstLimitedDryRunOutputArtifact: artifact,
  };

  const write = options.setSiteVersionImportProvenanceSummary
    ? await options.setSiteVersionImportProvenanceSummary({
        siteVersionId: input.siteVersionId,
        importProvenanceSummary: nextSummary,
      })
    : await defaultSetSiteVersionImportProvenanceSummary(
        {
          siteVersionId: input.siteVersionId,
          importProvenanceSummary: nextSummary,
        },
        options,
      );

  if (write.affectedRows <= 0) {
    throw new Error(`First limited dry-run output persistence affected 0 rows for site version ${input.siteVersionId}`);
  }

  return toArtifactReference(artifact);
}

export async function loadLatestFirstLimitedDryRunOutput(input: {
  siteVersionId: string;
  dryRunId?: string;
  options?: FirstLimitedDryRunOutputPersistenceOptions;
}): Promise<FirstLimitedDryRunOutput | null> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  if (!siteVersion) return null;

  const artifact = selectLatestArtifact({
    artifacts: readArtifacts(siteVersion.importProvenanceSummary),
    siteVersionId: input.siteVersionId,
    dryRunId: input.dryRunId,
  });

  return artifact ? cloneJson(artifact.output) : null;
}
