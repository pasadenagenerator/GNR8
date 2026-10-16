import { approveGeneratedOutputReview } from "@/gnr8/output-adapters/generated-output-publication-composition";
import {
  isAstroProductionCandidateId,
  isCanonicalUuid,
} from "@/gnr8/output-adapters/astro-production-candidate-record";
import { isAstroProductionCandidatePreviewFeatureEnabled } from "@/gnr8/output-adapters/astro-production-candidate-preview-feature-gate";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

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
} = {}) {
  const requireActor = dependencies.requireActor ?? requireSuperadminUserId;
  const approve = dependencies.approve ?? approveGeneratedOutputReview;
  const enabled = dependencies.enabled ?? isAstroProductionCandidatePreviewFeatureEnabled;
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
        }, { status: 200, headers: { "cache-control": "no-store" } });
      } catch (error) {
        const message = error instanceof Error ? error.message : "generated_output_review_failed";
        const conflict = message.includes("stale") || message.includes("state_invalid");
        return failure(conflict ? 409 : 422, conflict ? "REVIEW_SELECTION_STALE" : "GENERATED_OUTPUT_REVIEW_BLOCKED");
      }
    },
  };
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
