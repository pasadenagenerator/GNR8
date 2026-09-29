import "server-only";

import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";

import {
  GatewayBackedAstroProductionCandidateRepository,
  type AstroProductionCandidateListCursor,
  type AstroProductionCandidateListResult,
} from "./astro-production-candidate-repository";
import {
  SupabaseAstroCandidateOwnershipResolver,
  type AstroCandidateOwnershipReadClient,
} from "./astro-production-candidate-ownership-resolver";
import {
  SupabaseAstroProductionCandidateGateway,
  type AstroCandidateRpcClient,
} from "./astro-production-candidate-supabase-gateway";
import {
  AstroProductionCandidatePreviewConfigurationError,
} from "./astro-production-candidate-preview-feature-gate";
import type {
  AstroProductionCandidateOwnership,
} from "./astro-production-candidate-record";

export type AstroProductionCandidateListDependencies = {
  resolveOwnership(input: { siteVersionId: string }): Promise<AstroProductionCandidateOwnership>;
  listCandidateMetadata(input: {
    trustedScope: AstroProductionCandidateOwnership;
    cursor: AstroProductionCandidateListCursor | null;
    limit: number;
  }): Promise<AstroProductionCandidateListResult>;
};

/**
 * Creates one request-owned resolver/repository pair. Construction is lazy at
 * the page-loader boundary, after authentication, feature gating, and selector
 * validation. Only the payload-free metadata list operation is exposed.
 */
export function createAstroProductionCandidateListDependencies(): AstroProductionCandidateListDependencies {
  const serviceRoleClient = getSupabaseServiceRoleClient();
  if (!serviceRoleClient) throw new AstroProductionCandidatePreviewConfigurationError();

  const readClient = serviceRoleClient as unknown as AstroCandidateOwnershipReadClient & AstroCandidateRpcClient;
  const resolver = new SupabaseAstroCandidateOwnershipResolver(() => readClient);
  const repository = new GatewayBackedAstroProductionCandidateRepository({
    gateway: new SupabaseAstroProductionCandidateGateway(() => readClient),
  });

  return {
    resolveOwnership: (input) => resolver.resolve(input),
    listCandidateMetadata: (input) => repository.list(input),
  };
}
