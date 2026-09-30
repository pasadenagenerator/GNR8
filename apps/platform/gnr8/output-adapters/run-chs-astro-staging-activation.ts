import "server-only";

import { createClient } from "@supabase/supabase-js";

import { SupabaseAstroCandidateRuntimeArtifactStore } from "./astro-candidate-runtime-artifact-store";
import { createAstroCandidatePromotionService } from "./astro-candidate-promotion-service";
import { createChsSourceBackedAstroCandidateProducer } from "./chs-astro-candidate-producer";
import {
  CHS_ASTRO_EVALUATION,
  CHS_ASTRO_EVALUATION_CANDIDATE_ID,
} from "./chs-astro-evaluation-contract";
import {
  InMemoryAstroCandidateRegistrationRetryContextStore,
} from "./astro-production-candidate-registration-contract";
import { createAstroProductionCandidateRegistrationService } from "./astro-production-candidate-registration-service";
import {
  SupabaseAstroCandidateOwnershipResolver,
  type AstroCandidateOwnershipReadClient,
} from "./astro-production-candidate-ownership-resolver";
import { GatewayBackedAstroProductionCandidateRepository } from "./astro-production-candidate-repository";
import {
  SupabaseAstroProductionCandidateGateway,
  type AstroCandidateRpcClient,
} from "./astro-production-candidate-supabase-gateway";
import {
  CHS_SOURCE_BACKED_ASTRO_INPUT_ID,
  CHS_SOURCE_BACKED_ASTRO_PRODUCER_KIND,
  CHS_SOURCE_BACKED_ASTRO_PRODUCER_VERSION,
} from "./chs-astro-candidate-producer";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const actorUserId = process.env.GNR8_CHS_ASTRO_ACTOR_USER_ID?.trim();
if (!url || !key) throw new Error("CHS_ASTRO_STAGING_SUPABASE_ENV_MISSING");
if (!actorUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actorUserId)) {
  throw new Error("CHS_ASTRO_STAGING_ACTOR_INVALID");
}

const client = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const candidateClient = client as unknown as AstroCandidateOwnershipReadClient & AstroCandidateRpcClient;
const ownershipResolver = new SupabaseAstroCandidateOwnershipResolver(() => candidateClient);
const repository = new GatewayBackedAstroProductionCandidateRepository({
  gateway: new SupabaseAstroProductionCandidateGateway(() => candidateClient),
});
const register = createAstroProductionCandidateRegistrationService({
  authenticateSuperadmin: async () => actorUserId,
  resolveOwnership: (input) => ownershipResolver.resolve(input),
  producer: createChsSourceBackedAstroCandidateProducer(),
  repository,
  retryContexts: new InMemoryAstroCandidateRegistrationRetryContextStore(),
  now: () => new Date("2026-09-30T12:00:00.000Z"),
});

const registration = await register({
  operationId: CHS_ASTRO_EVALUATION.registrationOperationId,
  siteVersionId: CHS_ASTRO_EVALUATION.sourceSiteVersionId,
  producer: {
    kind: CHS_SOURCE_BACKED_ASTRO_PRODUCER_KIND,
    version: CHS_SOURCE_BACKED_ASTRO_PRODUCER_VERSION,
  },
  syntheticInput: { fixtureId: CHS_SOURCE_BACKED_ASTRO_INPUT_ID },
});
if (registration.candidate.candidateId !== CHS_ASTRO_EVALUATION_CANDIDATE_ID) {
  throw new Error("CHS_ASTRO_CANDIDATE_IDENTITY_MISMATCH");
}

const promote = createAstroCandidatePromotionService({
  resolveOwnership: (input) => ownershipResolver.resolve(input),
  readCandidate: (input) => repository.read(input),
  runtimeStore: new SupabaseAstroCandidateRuntimeArtifactStore(client),
});
const promotion = await promote({
  actorUserId,
  siteVersionId: CHS_ASTRO_EVALUATION.sourceSiteVersionId,
  candidateId: registration.candidate.candidateId,
  expectedContentSha256: registration.candidate.contentSha256,
  expectedStorageSha256: registration.candidate.storageSha256,
  idempotencyKey: CHS_ASTRO_EVALUATION.promotionIdempotencyKey,
});

process.stdout.write(`${JSON.stringify({
  sourceSiteVersionId: CHS_ASTRO_EVALUATION.sourceSiteVersionId,
  candidateId: registration.candidate.candidateId,
  registrationStatus: registration.status,
  contentSha256: registration.candidate.contentSha256,
  storageSha256: registration.candidate.storageSha256,
  sourceArtifactId: promotion.runtimeArtifactId,
  runtimeBundleSha256: promotion.runtimeBundleSha256,
  sourceSnapshotSha256: promotion.sourceSnapshotSha256,
  exportSha256: promotion.exportSha256,
  convertedArtifactSha256: promotion.convertedArtifactSha256,
  governance: promotion.governance,
  workflowHandoff: promotion.workflowHandoff,
  htmlPreservedExactly: promotion.htmlPreservedExactly,
  cssPreservedExactly: promotion.cssPreservedExactly,
}, null, 2)}\n`);
