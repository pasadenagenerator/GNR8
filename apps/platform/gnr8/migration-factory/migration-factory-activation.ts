import fs from "node:fs/promises";
import path from "node:path";

import { deterministicId } from "@/gnr8/runtime/deterministic";
import { executeMigrationPublishActivation } from "@/gnr8/runtime/publish-activation-orchestrator";
import { evaluatePublishActivationCandidate, type PublishActivationFailureCode } from "@/gnr8/runtime/publish-activation-guard";
import { runRenderIntegrityGate } from "@/gnr8/runtime/render-integrity-gate";
import { upsertMigrationActivationLineage } from "@/gnr8/runtime/runtime-store";
import type { CanonicalSiteMigrationInput, CanonicalSiteVersionSnapshot, RuntimeArtifact } from "@/gnr8/runtime/types";

import type { MigrationActivationExecutionResult, MigrationJob } from "@/gnr8/migration-factory/migration-job-types";

type ShadowBindReadyPayload = {
  artifactId?: string;
  siteVersionId?: string;
  artifactRef?: string;
  publishStageCandidate?: "shadow" | "canary" | "production";
  shadowEligibilityState?: string;
  publishCandidateState?: string;
};

type ArtifactBuildPayload = {
  artifactId?: string;
  siteVersionId?: string;
  artifact?: Omit<RuntimeArtifact, "id" | "createdAt" | "publishStage" | "shadowRestricted" | "artifactGovernance">;
  artifactGovernance?: RuntimeArtifact["artifactGovernance"];
  publishStageCandidate?: "shadow" | "canary" | "production";
  shadowRestricted?: boolean;
};

type CanonicalPagePayload = {
  canonicalInput?: CanonicalSiteMigrationInput;
};

type MigrationFactoryActivationDeps = {
  readFile: (fileRef: string) => Promise<string>;
  writeFile: (fileRef: string, content: string) => Promise<void>;
  mkdir: (dirRef: string) => Promise<void>;
  upsertLineage: typeof upsertMigrationActivationLineage;
  executeActivation: typeof executeMigrationPublishActivation;
};

type ExecuteMigrationFactoryActivationInput = {
  job: MigrationJob;
  now: () => string;
};

const defaultDeps: MigrationFactoryActivationDeps = {
  readFile: (fileRef) => fs.readFile(fileRef, "utf8"),
  writeFile: (fileRef, content) => fs.writeFile(fileRef, content, "utf8"),
  mkdir: async (dirRef) => {
    await fs.mkdir(dirRef, { recursive: true });
  },
  upsertLineage: upsertMigrationActivationLineage,
  executeActivation: executeMigrationPublishActivation,
};

function buildExecutionId(jobId: string, candidateRef: string, artifactId: string, siteVersionId: string): string {
  return deterministicId("migration_activation_execution", `${jobId}:${candidateRef}:${artifactId}:${siteVersionId}`);
}

function parseFailureCode(errorMessage: string | null | undefined): string | undefined {
  if (!errorMessage) return undefined;
  const [candidate] = errorMessage.split(":");
  if (!candidate) return undefined;
  return candidate.startsWith("PUBLISH_") ? candidate : undefined;
}

function toRuntimeArtifact(input: {
  artifactId: string;
  artifactPayload: ArtifactBuildPayload;
}): RuntimeArtifact | null {
  const artifact = input.artifactPayload.artifact;
  const artifactGovernance = input.artifactPayload.artifactGovernance;
  if (
    !artifact ||
    !artifact.siteId ||
    !artifact.siteVersionId ||
    !artifact.rendererCompatibilityVersion ||
    !artifact.htmlByPath ||
    !artifact.assetFingerprintMap ||
    !artifact.manifest ||
    !artifact.bundleSha256 ||
    !artifactGovernance
  ) {
    return null;
  }

  return {
    id: input.artifactId,
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    rendererCompatibilityVersion: artifact.rendererCompatibilityVersion,
    htmlByPath: artifact.htmlByPath,
    compiledTokenStyles: artifact.compiledTokenStyles ?? "",
    assetFingerprintMap: artifact.assetFingerprintMap,
    manifest: artifact.manifest,
    publishStage: artifactGovernance.publishStage,
    shadowRestricted: input.artifactPayload.shadowRestricted ?? false,
    artifactGovernance,
    bundleSha256: artifact.bundleSha256,
    createdAt: "migration-factory-activation",
  };
}

function toCanonicalSiteVersion(input: {
  siteVersionId: string;
  rendererCompatibilityVersion: string;
  canonicalInput: CanonicalSiteMigrationInput;
}): CanonicalSiteVersionSnapshot {
  return {
    id: input.siteVersionId,
    siteId: input.canonicalInput.siteId,
    versionNo: 1,
    state: "APPROVED",
    source: "migration",
    actor: input.canonicalInput.actor,
    createdAt: "migration-factory-activation",
    rendererCompatibilityVersion: input.rendererCompatibilityVersion,
    artifactId: null,
    pages: input.canonicalInput.pages.map((page, index) => ({
      id: deterministicId("page_version", `${input.siteVersionId}:${page.pageId}:${index}`),
      siteVersionId: input.siteVersionId,
      pageId: page.pageId,
      path: page.path,
      title: page.title,
      structureModel: page.structureModel,
      contentModel: page.contentModel,
      styleTokens: page.styleTokens,
      assetGraph: page.assetGraph,
      semanticSignals: page.semanticSignals,
      migrationGovernance: page.migrationGovernance ?? null,
      source: page.source,
      actor: page.actor,
      createdAt: "migration-factory-activation",
    })),
  };
}

function buildFailureResult(input: {
  jobId: string;
  candidateRef: string;
  artifactId: string;
  siteVersionId: string;
  publishStage: string;
  enforcementState: string;
  failureCode: PublishActivationFailureCode | string;
  reasons: string[];
}): MigrationActivationExecutionResult {
  return {
    executionId: buildExecutionId(input.jobId, input.candidateRef, input.artifactId, input.siteVersionId),
    candidateRef: input.candidateRef,
    artifactId: input.artifactId,
    siteVersionId: input.siteVersionId,
    activationOutcome: "FAILED",
    switched: false,
    previousActivePointer: null,
    newActivePointer: null,
    enforcementState: input.enforcementState,
    publishStage: input.publishStage,
    failureCode: input.failureCode,
    reasons: input.reasons,
  };
}

export async function executeMigrationFactoryActivation(
  input: ExecuteMigrationFactoryActivationInput,
  deps: Partial<MigrationFactoryActivationDeps> = {},
): Promise<MigrationActivationExecutionResult> {
  const runtimeDeps: MigrationFactoryActivationDeps = { ...defaultDeps, ...deps };
  const shadowRefs = input.job.stageStates.SHADOW_BIND_READY.outputRefs;
  const canonicalRefs = input.job.stageStates.CANONICAL.outputRefs;

  const candidateRef = shadowRefs.publishCandidateRef ?? shadowRefs.shadowBindReadyRef ?? "missing-candidate-ref";
  if (!shadowRefs.shadowBindReadyRef) {
    return buildFailureResult({
      jobId: input.job.jobId,
      candidateRef,
      artifactId: shadowRefs.artifactId ?? "missing-artifact-id",
      siteVersionId: shadowRefs.siteVersionId ?? "missing-site-version-id",
      publishStage: "shadow",
      enforcementState: shadowRefs.shadowEligibilityState ?? "UNKNOWN",
      failureCode: "PUBLISH_CANDIDATE_REF_MISSING",
      reasons: ["shadow bind ready reference is missing"],
    });
  }

  let candidatePayload: ShadowBindReadyPayload;
  try {
    candidatePayload = JSON.parse(await runtimeDeps.readFile(shadowRefs.shadowBindReadyRef)) as ShadowBindReadyPayload;
  } catch (error) {
    return buildFailureResult({
      jobId: input.job.jobId,
      candidateRef: shadowRefs.shadowBindReadyRef,
      artifactId: shadowRefs.artifactId ?? "missing-artifact-id",
      siteVersionId: shadowRefs.siteVersionId ?? "missing-site-version-id",
      publishStage: "shadow",
      enforcementState: shadowRefs.shadowEligibilityState ?? "UNKNOWN",
      failureCode: "PUBLISH_ARTIFACT_PAYLOAD_INVALID",
      reasons: [`failed to read shadow bind candidate: ${String((error as Error)?.message ?? error)}`],
    });
  }

  const artifactId = candidatePayload.artifactId ?? shadowRefs.artifactId ?? "missing-artifact-id";
  const siteVersionId = candidatePayload.siteVersionId ?? shadowRefs.siteVersionId ?? "missing-site-version-id";
  const publishStage = candidatePayload.publishStageCandidate ?? "shadow";
  const enforcementState = candidatePayload.shadowEligibilityState ?? "UNKNOWN";
  const candidateState = candidatePayload.publishCandidateState ?? "UNKNOWN";

  if (!candidatePayload.artifactRef) {
    return buildFailureResult({
      jobId: input.job.jobId,
      candidateRef,
      artifactId,
      siteVersionId,
      publishStage,
      enforcementState,
      failureCode: "PUBLISH_ARTIFACT_READ_FAILED",
      reasons: ["candidate artifactRef is missing"],
    });
  }

  let artifactPayload: ArtifactBuildPayload;
  try {
    artifactPayload = JSON.parse(await runtimeDeps.readFile(candidatePayload.artifactRef)) as ArtifactBuildPayload;
  } catch (error) {
    return buildFailureResult({
      jobId: input.job.jobId,
      candidateRef,
      artifactId,
      siteVersionId,
      publishStage,
      enforcementState,
      failureCode: "PUBLISH_ARTIFACT_READ_FAILED",
      reasons: [`failed to read candidate artifact payload: ${String((error as Error)?.message ?? error)}`],
    });
  }

  const runtimeArtifact = toRuntimeArtifact({
    artifactId,
    artifactPayload,
  });
  if (!runtimeArtifact) {
    return buildFailureResult({
      jobId: input.job.jobId,
      candidateRef,
      artifactId,
      siteVersionId,
      publishStage,
      enforcementState,
      failureCode: "PUBLISH_ARTIFACT_PAYLOAD_INVALID",
      reasons: ["artifact payload is missing required runtime fields"],
    });
  }

  const candidateValidation = evaluatePublishActivationCandidate({
    candidateRef,
    candidateState,
    shadowEligibilityState: enforcementState,
    artifactId,
    siteVersionId,
    expectedSiteId: runtimeArtifact.siteId,
    expectedSiteVersionId: siteVersionId,
    expectedArtifactId: artifactId,
    expectedRendererCompatibilityVersion: runtimeArtifact.rendererCompatibilityVersion,
    expectedPublishStage: publishStage,
    artifact: runtimeArtifact,
  });

  if (!candidateValidation.ok) {
    return buildFailureResult({
      jobId: input.job.jobId,
      candidateRef,
      artifactId,
      siteVersionId,
      publishStage,
      enforcementState,
      failureCode: candidateValidation.code,
      reasons: [candidateValidation.message],
    });
  }

  if (!canonicalRefs.canonicalPageRef) {
    return buildFailureResult({
      jobId: input.job.jobId,
      candidateRef,
      artifactId,
      siteVersionId,
      publishStage,
      enforcementState,
      failureCode: "PUBLISH_ARTIFACT_PAYLOAD_INVALID",
      reasons: ["canonical page reference missing for integrity validation"],
    });
  }

  let canonicalPayload: CanonicalPagePayload;
  try {
    canonicalPayload = JSON.parse(await runtimeDeps.readFile(canonicalRefs.canonicalPageRef)) as CanonicalPagePayload;
  } catch (error) {
    return buildFailureResult({
      jobId: input.job.jobId,
      candidateRef,
      artifactId,
      siteVersionId,
      publishStage,
      enforcementState,
      failureCode: "PUBLISH_ARTIFACT_PAYLOAD_INVALID",
      reasons: [`failed to read canonical payload: ${String((error as Error)?.message ?? error)}`],
    });
  }

  if (!canonicalPayload.canonicalInput || !Array.isArray(canonicalPayload.canonicalInput.pages) || canonicalPayload.canonicalInput.pages.length === 0) {
    return buildFailureResult({
      jobId: input.job.jobId,
      candidateRef,
      artifactId,
      siteVersionId,
      publishStage,
      enforcementState,
      failureCode: "PUBLISH_ARTIFACT_PAYLOAD_INVALID",
      reasons: ["canonical payload is missing canonicalInput.pages"],
    });
  }

  const canonicalSiteVersion = toCanonicalSiteVersion({
    siteVersionId,
    rendererCompatibilityVersion: runtimeArtifact.rendererCompatibilityVersion,
    canonicalInput: canonicalPayload.canonicalInput,
  });
  const integrity = runRenderIntegrityGate({
    siteVersion: canonicalSiteVersion,
    htmlByPath: runtimeArtifact.htmlByPath,
    assetFingerprintMap: runtimeArtifact.assetFingerprintMap,
  });
  if (!integrity.ok) {
    return buildFailureResult({
      jobId: input.job.jobId,
      candidateRef,
      artifactId,
      siteVersionId,
      publishStage,
      enforcementState,
      failureCode: "PUBLISH_ARTIFACT_PAYLOAD_INVALID",
      reasons: integrity.issues.map((issue) => `${issue.code}:${issue.message}`),
    });
  }

  try {
    await runtimeDeps.upsertLineage({
      siteId: runtimeArtifact.siteId,
      sourceUrl: input.job.sourceUrl,
      siteVersionId,
      artifact: runtimeArtifact,
      actor: "migration-factory-activation",
    });
  } catch (error) {
    const explicit = parseFailureCode(String((error as Error)?.message ?? error));
    return buildFailureResult({
      jobId: input.job.jobId,
      candidateRef,
      artifactId,
      siteVersionId,
      publishStage,
      enforcementState,
      failureCode: explicit ?? "PUBLISH_LINEAGE_MISMATCH",
      reasons: [String((error as Error)?.message ?? error)],
    });
  }

  try {
    const activation = await runtimeDeps.executeActivation({
      candidateRef,
      candidateState,
      shadowEligibilityState: enforcementState,
      siteId: runtimeArtifact.siteId,
      siteVersionId,
      artifactId,
      expectedRendererCompatibilityVersion: runtimeArtifact.rendererCompatibilityVersion,
      expectedPublishStage: publishStage,
      actor: "migration-factory-activation",
    });
    const result: MigrationActivationExecutionResult = {
      executionId: buildExecutionId(input.job.jobId, candidateRef, artifactId, siteVersionId),
      candidateRef,
      artifactId,
      siteVersionId,
      activationOutcome: activation.activationOutcome,
      switched: activation.switched,
      previousActivePointer: activation.previousActivePointer,
      newActivePointer: activation.newActivePointer,
      enforcementState,
      publishStage,
      reasons:
        activation.activationOutcome === "SAFE_NOOP"
          ? ["publish target already active; pointer switch is a safe no-op"]
          : ["publish activation succeeded"],
    };
    const reportRef = path.resolve(path.dirname(shadowRefs.shadowBindReadyRef), "activation-execution-report.json");
    await runtimeDeps.mkdir(path.dirname(reportRef));
    await runtimeDeps.writeFile(reportRef, `${JSON.stringify(result, null, 2)}\n`);
    return result;
  } catch (error) {
    const errorMessage = String((error as Error)?.message ?? error);
    const failureCode = parseFailureCode(errorMessage) ?? "PUBLISH_ENFORCEMENT_DENIED";
    const result = buildFailureResult({
      jobId: input.job.jobId,
      candidateRef,
      artifactId,
      siteVersionId,
      publishStage,
      enforcementState,
      failureCode,
      reasons: [errorMessage],
    });
    const reportRef = path.resolve(path.dirname(shadowRefs.shadowBindReadyRef), "activation-execution-report.json");
    await runtimeDeps.mkdir(path.dirname(reportRef));
    await runtimeDeps.writeFile(reportRef, `${JSON.stringify(result, null, 2)}\n`);
    return result;
  }
}
