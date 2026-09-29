import "server-only";

import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";

import { SupabaseAstroCandidateRuntimeArtifactStore } from "./astro-candidate-runtime-artifact-store";
import {
  createAstroCandidatePromotionService,
  type AstroCandidatePromotionInput,
} from "./astro-candidate-promotion-service";
import {
  SupabaseAstroCandidateOwnershipResolver,
  type AstroCandidateOwnershipReadClient,
} from "./astro-production-candidate-ownership-resolver";
import {
  GatewayBackedAstroProductionCandidateRepository,
} from "./astro-production-candidate-repository";
import {
  SupabaseAstroProductionCandidateGateway,
  type AstroCandidateRpcClient,
} from "./astro-production-candidate-supabase-gateway";
import { AstroProductionCandidatePreviewConfigurationError } from "./astro-production-candidate-preview-feature-gate";

export function createAstroCandidatePromotionOperation() {
  const serviceRoleClient = getSupabaseServiceRoleClient();
  if (!serviceRoleClient) throw new AstroProductionCandidatePreviewConfigurationError();
  const candidateClient = serviceRoleClient as unknown as AstroCandidateOwnershipReadClient & AstroCandidateRpcClient;
  const ownershipResolver = new SupabaseAstroCandidateOwnershipResolver(() => candidateClient);
  const repository = new GatewayBackedAstroProductionCandidateRepository({
    gateway: new SupabaseAstroProductionCandidateGateway(() => candidateClient),
  });
  return createAstroCandidatePromotionService({
    resolveOwnership: (input) => ownershipResolver.resolve(input),
    readCandidate: (input) => repository.read(input),
    runtimeStore: new SupabaseAstroCandidateRuntimeArtifactStore(serviceRoleClient),
  });
}

export type AstroCandidatePromotionOperation = ReturnType<typeof createAstroCandidatePromotionOperation>;
export type AstroCandidatePromotionOperationInput = AstroCandidatePromotionInput;
