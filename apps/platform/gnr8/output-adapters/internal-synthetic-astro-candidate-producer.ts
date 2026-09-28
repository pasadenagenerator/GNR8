import "server-only";

import { RENDERER_COMPATIBILITY_VERSION } from "../runtime/types";
import {
  runAstroBuildExportProof,
  inspectAstroStaticExport,
  type AstroBuildExportProofEvidence,
  type RunAstroBuildExportProofInput,
} from "./astro-static-site-build-export-proof";
import { astroDevServerSmokeProofFixture } from "./astro-static-site-dev-server-smoke-proof";
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

export const INTERNAL_SYNTHETIC_ASTRO_PRODUCER_KIND =
  "internal_synthetic_astro_build_export_bridge" as const;
export const INTERNAL_SYNTHETIC_ASTRO_PRODUCER_VERSION = "v1" as const;
export const INTERNAL_SYNTHETIC_ASTRO_FIXTURE_ID = "northline_operations_v1" as const;

export type InternalSyntheticAstroCandidateProducerDependencies = {
  runBuildExport(input: RunAstroBuildExportProofInput): Promise<AstroBuildExportProofEvidence>;
  prepareWorkspace: typeof prepareAstroStaticSiteWorkspace;
  inspectExport: typeof inspectAstroStaticExport;
  convertExport(input: ConvertAstroExportToInternalPreviewCandidateInput): Promise<AstroInternalPreviewCandidate>;
};

export class InternalSyntheticAstroCandidateProducerError extends Error {
  readonly code: "unsupported_input" | "production_failed" | "cleanup_incomplete" | "candidate_missing";

  constructor(
    code: InternalSyntheticAstroCandidateProducerError["code"],
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "InternalSyntheticAstroCandidateProducerError";
    this.code = code;
  }
}

export function createInternalSyntheticAstroCandidateProducer(
  dependencies: Partial<InternalSyntheticAstroCandidateProducerDependencies> = {},
): AstroSyntheticCandidateProducer {
  const resolved: InternalSyntheticAstroCandidateProducerDependencies = {
    runBuildExport: dependencies.runBuildExport ?? runAstroBuildExportProof,
    prepareWorkspace: dependencies.prepareWorkspace ?? prepareAstroStaticSiteWorkspace,
    inspectExport: dependencies.inspectExport ?? inspectAstroStaticExport,
    convertExport: dependencies.convertExport ?? convertAstroExportToInternalPreviewCandidate,
  };

  return {
    kind: INTERNAL_SYNTHETIC_ASTRO_PRODUCER_KIND,
    version: INTERNAL_SYNTHETIC_ASTRO_PRODUCER_VERSION,
    supports: (input) => input.fixtureId === INTERNAL_SYNTHETIC_ASTRO_FIXTURE_ID,
    async produce(input) {
      if (input.syntheticInput.fixtureId !== INTERNAL_SYNTHETIC_ASTRO_FIXTURE_ID) {
        throw new InternalSyntheticAstroCandidateProducerError(
          "unsupported_input",
          "Synthetic Astro producer input is not allowlisted.",
        );
      }

      let prepared: PreparedAstroStaticSiteWorkspace | null = null;
      let candidate: AstroInternalPreviewCandidate | null = null;
      let evidence: AstroBuildExportProofEvidence;
      try {
        evidence = await resolved.runBuildExport({
          content: astroDevServerSmokeProofFixture(),
          dependencies: {
            prepareWorkspace: async (prepareInput) => {
              prepared = await resolved.prepareWorkspace(prepareInput);
              return prepared;
            },
            inspectExport: async (workspacePath, verification) => {
              const inspected = await resolved.inspectExport(workspacePath, verification);
              if (!prepared) {
                throw new InternalSyntheticAstroCandidateProducerError(
                  "candidate_missing",
                  "Synthetic Astro workspace context is unavailable.",
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
        if (error instanceof InternalSyntheticAstroCandidateProducerError) throw error;
        throw new InternalSyntheticAstroCandidateProducerError(
          "production_failed",
          "Synthetic Astro build/export-to-bridge production failed.",
          { cause: error },
        );
      }

      if (
        !evidence.cleanup.completed ||
        !evidence.workspace.removed ||
        evidence.cleanup.errors.length > 0
      ) {
        throw new InternalSyntheticAstroCandidateProducerError(
          "cleanup_incomplete",
          "Synthetic Astro producer cleanup did not complete.",
        );
      }
      if (!candidate) {
        throw new InternalSyntheticAstroCandidateProducerError(
          "candidate_missing",
          "Synthetic Astro build/export completed without a bridged candidate.",
        );
      }
      return structuredClone(candidate);
    },
  };
}
