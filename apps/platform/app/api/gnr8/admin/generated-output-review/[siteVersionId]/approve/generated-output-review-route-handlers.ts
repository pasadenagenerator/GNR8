import { approveGeneratedOutputReview } from "@/gnr8/output-adapters/generated-output-publication-composition";
import {
  isAstroProductionCandidateId,
  isCanonicalUuid,
} from "@/gnr8/output-adapters/astro-production-candidate-record";
import { isAstroProductionCandidatePreviewFeatureEnabled } from "@/gnr8/output-adapters/astro-production-candidate-preview-feature-gate";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";
import { randomUUID } from 'node:crypto';
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server';
import { SupabaseAstroCandidateRuntimeArtifactStore } from '@/gnr8/output-adapters/astro-candidate-runtime-artifact-store';
import { SupabaseAstroCandidateOwnershipResolver } from '@/gnr8/output-adapters/astro-production-candidate-ownership-resolver';
import { fingerprint, publicationSelectionForArtifact } from '@/gnr8/standalone/publication-contract';
import { inngest } from '@/gnr8/inngest/client';

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CONFIRMATION = "approve-exact-generated-output-artifact";
const BODY_KEYS = new Set([
  "confirmation",
  "artifactId",
  "artifactBundleSha256",
  "candidateId",
  "candidateContentSha256",
  "contentManifestSha256",
  "technicalEvaluationSha256",
]);

export function createGeneratedOutputReviewRouteHandlers(dependencies: {
  requireActor?: typeof requireSuperadminUserId;
  approve?: typeof approveGeneratedOutputReview;
  enabled?: () => boolean;
  enqueueStudioSource?: typeof enqueueApprovedStudioSource;
} = {}) {
  const requireActor = dependencies.requireActor ?? requireSuperadminUserId;
  const approve = dependencies.approve ?? approveGeneratedOutputReview;
  const enabled = dependencies.enabled ?? isAstroProductionCandidatePreviewFeatureEnabled;
  const enqueueStudioSource = dependencies.enqueueStudioSource ?? enqueueApprovedStudioSource;
  return {
    async POST(request: Request, context: { params: Promise<{ siteVersionId: string }> }): Promise<Response> {
      let actor: string;
      try {
        actor = await requireActor();
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        return failure(message.startsWith("Unauthorized") ? 401 : 403, "SUPERADMIN_REQUIRED");
      }
      if (!enabled()) return failure(503, "GENERATED_OUTPUT_REVIEW_DISABLED");
      if (!sameOrigin(request)) return failure(403, "INVALID_REQUEST_ORIGIN");
      const { siteVersionId } = await context.params;
      if (!isCanonicalUuid(siteVersionId)) return failure(404, "REVIEW_TARGET_NOT_FOUND");
      const body = await request.json().catch(() => null);
      if (!body || typeof body !== "object" || Array.isArray(body)) return failure(422, "INVALID_REVIEW_REQUEST");
      const value = body as Record<string, unknown>;
      if (Object.keys(value).some((key) => !BODY_KEYS.has(key)) || value.confirmation !== CONFIRMATION) {
        return failure(422, "INVALID_REVIEW_REQUEST");
      }
      if (
        !isCanonicalUuid(String(value.artifactId ?? "")) ||
        !isAstroProductionCandidateId(String(value.candidateId ?? "")) ||
        ![
          value.artifactBundleSha256,
          value.candidateContentSha256,
          value.contentManifestSha256,
          value.technicalEvaluationSha256,
        ].every((item) => SHA256_PATTERN.test(String(item ?? "")))
      ) {
        return failure(422, "INVALID_REVIEW_SELECTION");
      }
      try {
        const result = await approve({
          siteVersionId,
          reviewerActorId: actor,
          expectedArtifactId: String(value.artifactId),
          expectedArtifactBundleSha256: String(value.artifactBundleSha256),
          expectedCandidateId: String(value.candidateId),
          expectedCandidateContentSha256: String(value.candidateContentSha256),
          expectedContentManifestSha256: String(value.contentManifestSha256),
          expectedTechnicalEvaluationSha256: String(value.technicalEvaluationSha256),
        });
        let sourcePreparation: 'disabled' | 'queued' | 'queue-failed' = 'disabled';
        if(process.env.GNR8_NATIVE_STUDIO_BOOTSTRAP_ENABLED==='1'){
          try{await enqueueStudioSource({siteVersionId,actor,artifactId:result.review.artifactId,
            artifactBundleSha256:result.review.artifactBundleSha256,confirmationSha256:result.review.reviewSha256});
            sourcePreparation='queued';}
          catch{sourcePreparation='queue-failed';}
        }
        return Response.json({
          ok: true,
          status: result.status,
          reviewId: result.review.reviewId,
          reviewSha256: result.review.reviewSha256,
          reviewerActorId: result.review.reviewerActorId,
          reviewedAt: result.review.reviewedAt,
          artifactId: result.review.artifactId,
          artifactBundleSha256: result.review.artifactBundleSha256,
          technicalEvaluationSha256: result.review.technicalEvaluationSha256,
          activation: result.decision.activation,
          sourcePreparation,
        }, { status: 200, headers: { "cache-control": "no-store" } });
      } catch (error) {
        const message = error instanceof Error ? error.message : "generated_output_review_failed";
        const conflict = message.includes("stale") || message.includes("state_invalid");
        return failure(conflict ? 409 : 422, conflict ? "REVIEW_SELECTION_STALE" : "GENERATED_OUTPUT_REVIEW_BLOCKED");
      }
    },
  };
}

async function enqueueApprovedStudioSource(input:{siteVersionId:string;actor:string;artifactId:string;
 artifactBundleSha256:string;confirmationSha256:string}){
 const client=getSupabaseServiceRoleClient();
 if(!client)throw Error('native_studio_store_unavailable');
 const [owner,source]=await Promise.all([
  new SupabaseAstroCandidateOwnershipResolver().resolve({siteVersionId:input.siteVersionId}),
  new SupabaseAstroCandidateRuntimeArtifactStore(client).readSourceContext(input.siteVersionId),
 ]);
 if(!source||source.artifact.id!==input.artifactId||
  source.artifact.bundleSha256!==input.artifactBundleSha256)throw Error('native_studio_source_stale');
 const scope={agencyId:owner.agencyId,clientId:owner.organizationId,siteId:owner.ownershipSiteId};
 const selection=publicationSelectionForArtifact({...scope,siteVersionId:input.siteVersionId},source.artifact);
 if(!('kind' in selection.selection)||selection.selection.kind!=='generated-source')return;
 const requestId=fingerprint({input:selection,confirmationSha256:input.confirmationSha256});
 await inngest.send({name:'gnr8/native-studio.prepare.requested',data:{mode:'source',scope,
  input:selection,requestId,attemptId:randomUUID(),actor:input.actor}});
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || new URL(request.url).host;
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || new URL(request.url).protocol.replace(":", "");
  try {
    return new URL(origin).origin === new URL(`${protocol}://${host}`).origin;
  } catch {
    return false;
  }
}

function failure(status: number, error: string): Response {
  return Response.json({ ok: false, error, approved: false }, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
