import "server-only";

import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";

import { SupabaseAstroCandidateRuntimeArtifactStore } from "./astro-candidate-runtime-artifact-store";
import { createAstroCandidatePromotionService } from "./astro-candidate-promotion-service";
import {
  SupabaseAstroCandidateOwnershipResolver,
  type AstroCandidateOwnershipReadClient,
} from "./astro-production-candidate-ownership-resolver";
import { GatewayBackedAstroProductionCandidateRepository } from "./astro-production-candidate-repository";
import {
  SupabaseAstroProductionCandidateGateway,
  type AstroCandidateRpcClient,
} from "./astro-production-candidate-supabase-gateway";
import { AstroProductionCandidatePreviewConfigurationError } from "./astro-production-candidate-preview-feature-gate";
import { createAstroSuccessorPublicationService } from "./astro-successor-publication-service";
import { createGeneratedOutputPublicationDecisionResolver } from "./generated-output-publication-composition";

export function createAstroSuccessorPublicationOperation() {
  const serviceRoleClient = getSupabaseServiceRoleClient();
  if (!serviceRoleClient) throw new AstroProductionCandidatePreviewConfigurationError();
  const candidateClient = serviceRoleClient as unknown as AstroCandidateOwnershipReadClient & AstroCandidateRpcClient;
  const ownershipResolver = new SupabaseAstroCandidateOwnershipResolver(() => candidateClient);
  const candidateRepository = new GatewayBackedAstroProductionCandidateRepository({
    gateway: new SupabaseAstroProductionCandidateGateway(() => candidateClient),
  });
  const runtimeStore = new SupabaseAstroCandidateRuntimeArtifactStore(serviceRoleClient);
  const promoteCandidate = createAstroCandidatePromotionService({
    resolveOwnership: (input) => ownershipResolver.resolve(input),
    readCandidate: (input) => candidateRepository.read(input),
    runtimeStore,
  });

  return createAstroSuccessorPublicationService({
    resolveOwnership: (input) => ownershipResolver.resolve(input),
    candidateRepository,
    promoteCandidate,
    getSiteVersion: async (...args) => {
      const mod = await import("@/gnr8/runtime/runtime-store");
      return mod.getSiteVersion(...args);
    },
    getRuntimeSiteSummary: async (...args) => {
      const mod = await import("@/gnr8/runtime/runtime-store");
      return mod.getRuntimeSiteSummary(...args);
    },
    getActiveHostBindingForHost: async (...args) => {
      const mod = await import("@/gnr8/runtime/runtime-store");
      return mod.getActiveHostBindingForHost(...args);
    },
    getActivePointerForSite: async (...args) => {
      const mod = await import("@/gnr8/runtime/runtime-store");
      return mod.getActivePointerForSite(...args);
    },
    getArtifactById: async (...args) => {
      const mod = await import("@/gnr8/runtime/runtime-store");
      return mod.getArtifactById(...args);
    },
    getRuntimeSiteVersionOwnershipSnapshot: async (...args) => {
      const mod = await import("@/gnr8/runtime/runtime-store");
      return mod.getRuntimeSiteVersionOwnershipSnapshot(...args);
    },
    createSiteVersionFromMigration: async (...args) => {
      const mod = await import("@/gnr8/runtime/runtime-store");
      return mod.createSiteVersionFromMigration(...args);
    },
    linkRuntimeSiteVersionOwnershipIfAllowed: async (...args) => {
      const mod = await import("@/gnr8/runtime/runtime-store");
      return mod.linkRuntimeSiteVersionOwnershipIfAllowed(...args);
    },
    createArtifact: async (...args) => {
      const mod = await import("@/gnr8/runtime/runtime-store");
      return mod.createArtifact(...args);
    },
    bindArtifactToVersion: async (...args) => {
      const mod = await import("@/gnr8/runtime/runtime-store");
      return mod.bindArtifactToVersion(...args);
    },
    bindHostToSite: async (...args) => {
      const mod = await import("@/gnr8/runtime/runtime-store");
      return mod.bindHostToSite(...args);
    },
    transitionSiteVersionState: async (...args) => {
      const mod = await import("@/gnr8/runtime/version-lifecycle-enforcer");
      return mod.transitionSiteVersionState(...args);
    },
    publishApprovedSiteVersion: async (...args) => {
      const mod = await import("@/gnr8/runtime/publish-activation-orchestrator");
      return mod.publishApprovedSiteVersion(...args);
    },
    generatedOutputPublicationDecisionResolver: createGeneratedOutputPublicationDecisionResolver(),
    rollbackToSiteVersionArtifact: async (...args) => {
      const mod = await import("@/gnr8/runtime/rollback-switch");
      return mod.rollbackToSiteVersionArtifact(...args);
    },
  });
}

export type AstroSuccessorPublicationOperation = ReturnType<typeof createAstroSuccessorPublicationOperation>;
