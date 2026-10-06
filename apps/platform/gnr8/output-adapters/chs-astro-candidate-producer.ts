import "server-only";

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import { RENDERER_COMPATIBILITY_VERSION } from "../runtime/types";
import {
  runAstroBuildExportProof,
  inspectAstroStaticExport,
  type AstroBuildExportProofEvidence,
  type RunAstroBuildExportProofInput,
} from "./astro-static-site-build-export-proof";
import {
  convertAstroExportToInternalPreviewCandidate,
  type AstroInternalPreviewCandidate,
  type ConvertAstroExportToInternalPreviewCandidateInput,
} from "./astro-static-site-internal-preview-bridge";
import {
  prepareAstroStaticSiteWorkspace,
  type PreparedAstroStaticSiteWorkspace,
} from "./astro-static-site-workspace-preparation";
import type { AstroSyntheticCandidateProducer } from "./astro-production-candidate-registration-contract";
import {
  CHS_ASTRO_EXPORT_VERIFICATION,
  CHS_ASTRO_SOURCE_LINEAGE,
  chsAstroSourceContent,
} from "./chs-astro-source-content";
import type { NormalizedStaticBusinessSiteContent } from "./astro-static-site-adapter";

export const CHS_SOURCE_BACKED_ASTRO_PRODUCER_KIND = "chs_source_backed_astro_build_export_bridge" as const;
export const CHS_SOURCE_BACKED_ASTRO_PRODUCER_VERSION = "v1" as const;
export const CHS_SOURCE_BACKED_ASTRO_INPUT_ID = `chs:${CHS_ASTRO_SOURCE_LINEAGE.sourceSnapshotId}` as const;
export const SOURCE_BACKED_ASTRO_PRODUCER_KIND = "source_backed_astro_build_export_bridge" as const;
export const SOURCE_BACKED_ASTRO_PRODUCER_VERSION = "v1" as const;

export type ChsSourceBackedAstroCandidateProducerDependencies = {
  runBuildExport(input: RunAstroBuildExportProofInput): Promise<AstroBuildExportProofEvidence>;
  prepareWorkspace: typeof prepareAstroStaticSiteWorkspace;
  inspectExport: typeof inspectAstroStaticExport;
  convertExport(input: ConvertAstroExportToInternalPreviewCandidateInput): Promise<AstroInternalPreviewCandidate>;
  content: NormalizedStaticBusinessSiteContent;
  inputId: string;
  producerKind: string;
  producerVersion: string;
  verification: RunAstroBuildExportProofInput["verification"];
  ownedAssetFingerprints: Record<string, string>;
  now(): string;
};

export type ChsAstroBuildReceipt = {
  proofVersion: AstroBuildExportProofEvidence["proofVersion"];
  candidateId: string;
  buildCompletedAt: string;
  toolVersions: AstroBuildExportProofEvidence["versions"];
  generatedSourceSha256: string;
  exportSha256: string;
  outputPaths: string[];
  exportFiles: AstroBuildExportProofEvidence["export"]["files"];
  execution: {
    installationCompleted: true;
    buildCompleted: true;
    sourceUnchanged: true;
    cleanupCompleted: true;
    workspaceRemoved: true;
    cleanupErrorCount: 0;
  };
  receiptSha256: string;
};

export type ChsSourceBackedAstroCandidateProducer = AstroSyntheticCandidateProducer & {
  readBuildReceipt(candidateId: string): ChsAstroBuildReceipt | null;
};

export class ChsSourceBackedAstroCandidateProducerError extends Error {
  readonly code: "unsupported_input" | "production_failed" | "cleanup_incomplete" | "candidate_missing";

  constructor(
    code: ChsSourceBackedAstroCandidateProducerError["code"],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ChsSourceBackedAstroCandidateProducerError";
    this.code = code;
  }
}

export function createChsSourceBackedAstroCandidateProducer(
  dependencies: Partial<ChsSourceBackedAstroCandidateProducerDependencies> = {},
): ChsSourceBackedAstroCandidateProducer {
  return createSourceBackedAstroCandidateProducer({
    producerKind: CHS_SOURCE_BACKED_ASTRO_PRODUCER_KIND,
    producerVersion: CHS_SOURCE_BACKED_ASTRO_PRODUCER_VERSION,
    ...dependencies,
  });
}

export function createSourceBackedAstroCandidateProducer(
  dependencies: Partial<ChsSourceBackedAstroCandidateProducerDependencies>,
): ChsSourceBackedAstroCandidateProducer {
  const resolved: ChsSourceBackedAstroCandidateProducerDependencies = {
    runBuildExport: dependencies.runBuildExport ?? runAstroBuildExportProof,
    prepareWorkspace: dependencies.prepareWorkspace ?? prepareAstroStaticSiteWorkspace,
    inspectExport: dependencies.inspectExport ?? inspectAstroStaticExport,
    convertExport: dependencies.convertExport ?? convertAstroExportToInternalPreviewCandidate,
    content: dependencies.content ?? chsAstroSourceContent(),
    inputId: dependencies.inputId ?? CHS_SOURCE_BACKED_ASTRO_INPUT_ID,
    producerKind: dependencies.producerKind ?? SOURCE_BACKED_ASTRO_PRODUCER_KIND,
    producerVersion: dependencies.producerVersion ?? SOURCE_BACKED_ASTRO_PRODUCER_VERSION,
    verification: dependencies.verification ?? {
      expectedContent: [...CHS_ASTRO_EXPORT_VERIFICATION.expectedContent],
      expectedThemeToken: CHS_ASTRO_EXPORT_VERIFICATION.expectedThemeToken,
    },
    ownedAssetFingerprints: structuredClone(dependencies.ownedAssetFingerprints ?? {}),
    now: dependencies.now ?? (() => new Date().toISOString()),
  };
  const receipts = new Map<string, ChsAstroBuildReceipt>();

  return {
    kind: resolved.producerKind,
    version: resolved.producerVersion,
    supports: (input) => input.fixtureId === resolved.inputId,
    readBuildReceipt(candidateId) {
      const receipt = receipts.get(candidateId);
      return receipt ? structuredClone(receipt) : null;
    },
    async produce(input) {
      if (input.syntheticInput.fixtureId !== resolved.inputId) {
        throw new ChsSourceBackedAstroCandidateProducerError(
          "unsupported_input",
          "CHS source-backed Astro producer input is not allowlisted.",
        );
      }

      let prepared: PreparedAstroStaticSiteWorkspace | null = null;
      let candidate: AstroInternalPreviewCandidate | null = null;
      let evidence: AstroBuildExportProofEvidence;
      try {
        evidence = await resolved.runBuildExport({
          content: resolved.content,
          verification: resolved.verification,
          dependencies: {
            prepareWorkspace: async (prepareInput) => {
              prepared = await resolved.prepareWorkspace(prepareInput);
              return prepared;
            },
            inspectExport: async (workspacePath, verification) => {
              const inspected = await resolved.inspectExport(workspacePath, verification);
              if (!prepared) {
                throw new ChsSourceBackedAstroCandidateProducerError(
                  "candidate_missing",
                  "CHS Astro workspace context is unavailable.",
                );
              }
              candidate = await resolved.convertExport({
                inspectedExport: inspected,
                candidateId: input.candidateId,
                siteId: input.ownership.runtimeSiteId,
                siteVersionId: input.ownership.siteVersionId,
                rendererCompatibilityVersion: RENDERER_COMPATIBILITY_VERSION,
                sourceSnapshotSha256: prepared.sourceSnapshot.aggregateSha256,
                ownedAssetFingerprints: resolved.ownedAssetFingerprints,
                createdAt: input.candidateCreatedAt,
              });
              return inspected;
            },
          },
        });
      } catch (error) {
        if (error instanceof ChsSourceBackedAstroCandidateProducerError) throw error;
        throw new ChsSourceBackedAstroCandidateProducerError(
          "production_failed",
          "CHS source-backed Astro build/export production failed.",
          { cause: error },
        );
      }

      if (!evidence.cleanup.completed || !evidence.workspace.removed || evidence.cleanup.errors.length > 0) {
        throw new ChsSourceBackedAstroCandidateProducerError(
          "cleanup_incomplete",
          "CHS source-backed Astro producer cleanup did not complete.",
        );
      }
      const completedCandidate = candidate as AstroInternalPreviewCandidate | null;
      if (!completedCandidate) {
        throw new ChsSourceBackedAstroCandidateProducerError(
          "candidate_missing",
          "CHS source-backed Astro build/export completed without a candidate.",
        );
      }
      if (
        !evidence.build.completed ||
        !evidence.installation.completed ||
        !evidence.export.aggregateSha256 ||
        !evidence.sourceComparison.baselineAggregateSha256 ||
        !evidence.sourceComparison.unchanged
      ) {
        throw new ChsSourceBackedAstroCandidateProducerError(
          "production_failed",
          "CHS Astro build/export evidence is incomplete.",
        );
      }
      const unsignedReceipt = {
        proofVersion: evidence.proofVersion,
        candidateId: completedCandidate.id,
        buildCompletedAt: resolved.now(),
        toolVersions: structuredClone(evidence.versions),
        generatedSourceSha256: evidence.sourceComparison.baselineAggregateSha256,
        exportSha256: evidence.export.aggregateSha256,
        outputPaths: Object.keys(completedCandidate.htmlByPath).sort((left, right) => left.localeCompare(right)),
        exportFiles: structuredClone(evidence.export.files),
        execution: {
          installationCompleted: true as const,
          buildCompleted: true as const,
          sourceUnchanged: true as const,
          cleanupCompleted: true as const,
          workspaceRemoved: true as const,
          cleanupErrorCount: 0 as const,
        },
      };
      receipts.set(completedCandidate.id, {
        ...unsignedReceipt,
        receiptSha256: sha256Hex(stableStringify(unsignedReceipt)),
      });
      return structuredClone(completedCandidate);
    },
  };
}
