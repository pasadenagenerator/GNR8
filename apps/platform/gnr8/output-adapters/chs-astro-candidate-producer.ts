import "server-only";

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
  CHS_ASTRO_SOURCE_LINEAGE,
  chsAstroSourceContent,
} from "./chs-astro-source-content";

export const CHS_SOURCE_BACKED_ASTRO_PRODUCER_KIND = "chs_source_backed_astro_build_export_bridge" as const;
export const CHS_SOURCE_BACKED_ASTRO_PRODUCER_VERSION = "v1" as const;
export const CHS_SOURCE_BACKED_ASTRO_INPUT_ID = `chs:${CHS_ASTRO_SOURCE_LINEAGE.sourceSnapshotId}` as const;

export type ChsSourceBackedAstroCandidateProducerDependencies = {
  runBuildExport(input: RunAstroBuildExportProofInput): Promise<AstroBuildExportProofEvidence>;
  prepareWorkspace: typeof prepareAstroStaticSiteWorkspace;
  inspectExport: typeof inspectAstroStaticExport;
  convertExport(input: ConvertAstroExportToInternalPreviewCandidateInput): Promise<AstroInternalPreviewCandidate>;
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
): AstroSyntheticCandidateProducer {
  const resolved: ChsSourceBackedAstroCandidateProducerDependencies = {
    runBuildExport: dependencies.runBuildExport ?? runAstroBuildExportProof,
    prepareWorkspace: dependencies.prepareWorkspace ?? prepareAstroStaticSiteWorkspace,
    inspectExport: dependencies.inspectExport ?? inspectAstroStaticExport,
    convertExport: dependencies.convertExport ?? convertAstroExportToInternalPreviewCandidate,
  };

  return {
    kind: CHS_SOURCE_BACKED_ASTRO_PRODUCER_KIND,
    version: CHS_SOURCE_BACKED_ASTRO_PRODUCER_VERSION,
    supports: (input) => input.fixtureId === CHS_SOURCE_BACKED_ASTRO_INPUT_ID,
    async produce(input) {
      if (input.syntheticInput.fixtureId !== CHS_SOURCE_BACKED_ASTRO_INPUT_ID) {
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
          content: chsAstroSourceContent(),
          verification: {
            expectedContent: [
              "<title>Home | CHS</title>",
              "The team that helps you change your IT to fit into every season and technology wave.",
              "VMware pricing change just became your opportunity",
              "Vendor-Neutral yet vendor supported advice",
              "sales@chs.si",
              "Copyright © 2026 CHS d.o.o. - All rights reserved",
            ],
            expectedThemeToken: "--gnr8-astro-accent: #ed7635;",
          },
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
      if (!candidate) {
        throw new ChsSourceBackedAstroCandidateProducerError(
          "candidate_missing",
          "CHS source-backed Astro build/export completed without a candidate.",
        );
      }
      return structuredClone(candidate);
    },
  };
}
