import "server-only";

import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

import { SupabaseAstroCandidateOwnershipResolver } from "./astro-production-candidate-ownership-resolver";
import { InMemoryAstroCandidateRegistrationRetryContextStore } from "./astro-production-candidate-registration-contract";
import { createAstroProductionCandidateRegistrationService } from "./astro-production-candidate-registration-service";
import { GatewayBackedAstroProductionCandidateRepository } from "./astro-production-candidate-repository";
import { SupabaseAstroProductionCandidateGateway } from "./astro-production-candidate-supabase-gateway";
import { createInternalSyntheticAstroCandidateProducer } from "./internal-synthetic-astro-candidate-producer";

/**
 * Explicit, unmounted production composition. Construction is import-safe and
 * performs no auth, producer, ownership, or storage work. Retry state is
 * deliberately process-local; durable recovery requires a later orchestrator.
 */
export function createProcessLocalPlatformSyntheticAstroRegistrationService() {
  const ownershipResolver = new SupabaseAstroCandidateOwnershipResolver();
  const repository = new GatewayBackedAstroProductionCandidateRepository({
    gateway: new SupabaseAstroProductionCandidateGateway(),
  });

  return createAstroProductionCandidateRegistrationService({
    authenticateSuperadmin: requireSuperadminUserId,
    resolveOwnership: (input) => ownershipResolver.resolve(input),
    producer: createInternalSyntheticAstroCandidateProducer(),
    repository,
    retryContexts: new InMemoryAstroCandidateRegistrationRetryContextStore(),
    now: () => new Date(),
  });
}
