import "server-only";

import { getSupabaseServiceRoleClient } from "@/src/supabase/service-role-server";

import { renderSiteVersionPreview } from "../runtime/unified-render-preview";
import {
  GatewayBackedAstroProductionCandidateRepository,
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
  AstroProductionCandidateRecord,
} from "./astro-production-candidate-record";

export type AstroProductionCandidatePreviewRenderResult = {
  html: string;
  source: "astro_internal_preview_candidate";
  candidateId: string;
  runtimeSiteId: string;
  siteVersionId: string;
  path: string;
  fallbackUsed: false;
};

export type AstroProductionCandidatePreviewDependencies = {
  resolveOwnership(input: { siteVersionId: string }): Promise<AstroProductionCandidateOwnership>;
  readCandidate(input: {
    candidateId: string;
    trustedScope: AstroProductionCandidateOwnership;
  }): Promise<AstroProductionCandidateRecord>;
  renderCandidate(input: {
    record: AstroProductionCandidateRecord;
    path: string;
  }): Promise<AstroProductionCandidatePreviewRenderResult>;
};

/**
 * Constructs server-owned, stateless dependencies without making a Supabase
 * request. The route calls this only after authentication, the feature gate,
 * and selector validation; missing server configuration fails closed here.
 */
export function createAstroProductionCandidatePreviewDependencies(): AstroProductionCandidatePreviewDependencies {
  const serviceRoleClient = getSupabaseServiceRoleClient();
  if (!serviceRoleClient) throw new AstroProductionCandidatePreviewConfigurationError();
  const readClient = serviceRoleClient as unknown as AstroCandidateOwnershipReadClient & AstroCandidateRpcClient;
  const resolver = new SupabaseAstroCandidateOwnershipResolver(() => readClient);
  const repository = new GatewayBackedAstroProductionCandidateRepository({
    gateway: new SupabaseAstroProductionCandidateGateway(() => readClient),
  });

  return {
    resolveOwnership: (input) => resolver.resolve(input),
    readCandidate: (input) => repository.read(input),
    renderCandidate: renderAstroProductionCandidatePreview,
  };
}

export async function renderAstroProductionCandidatePreview(input: {
  record: AstroProductionCandidateRecord;
  path: string;
}): Promise<AstroProductionCandidatePreviewRenderResult> {
  const { record } = input;
  const preview = await renderSiteVersionPreview({
    siteVersionId: record.identity.siteVersionId,
    path: input.path,
    mode: "transformed",
    astroCandidateSelection: {
      candidateId: record.identity.candidateId,
      siteId: record.identity.runtimeSiteId,
    },
    astroCandidateContract: "production_v2",
    astroCandidateLoader: async (candidateId) => (
      candidateId === record.identity.candidateId ? record.candidate : null
    ),
    previewPoolStatus: () => ({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
  });

  if (
    preview.source !== "astro_internal_preview_candidate" ||
    preview.fallbackUsed !== false ||
    preview.artifactId !== record.identity.candidateId ||
    preview.siteId !== record.identity.runtimeSiteId ||
    preview.siteVersionId !== record.identity.siteVersionId ||
    preview.path !== input.path
  ) {
    throw new Error("Unified preview returned an unexpected production candidate selection.");
  }

  return {
    html: preview.html,
    source: "astro_internal_preview_candidate",
    candidateId: preview.artifactId,
    runtimeSiteId: preview.siteId,
    siteVersionId: preview.siteVersionId,
    path: preview.path,
    fallbackUsed: false,
  };
}
