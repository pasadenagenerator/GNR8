export const CANDIDATE_REVIEW_UI_ACTION_TYPES = ["approve", "reject", "defer"] as const;

export type CandidateReviewUiActionType = typeof CANDIDATE_REVIEW_UI_ACTION_TYPES[number];

export type CandidateReviewActionClientPayload = {
  siteVersionId: string;
  candidateId: string;
  actionType: CandidateReviewUiActionType;
  rationale: string;
  candidateDiscoveryArtifactId: string;
  candidateReviewPackageArtifactId: string;
};

export type CandidateReviewActionClientResponse =
  | {
      ok: true;
      actionId: string;
      candidateId: string;
      decision: "approved" | "rejected" | "deferred";
      reviewEventId: string;
      candidateReviewPackageArtifactId: string;
      counts: {
        reviewedCandidateCount: number;
        approvedCount: number;
        rejectedCount: number;
        deferredCount: number;
      };
      diagnostics: string[];
    }
  | {
      ok: false;
      errorCode: string;
      message: string;
      diagnostics: string[];
    };

type FetchLike = (input: string, init: RequestInit) => Promise<Pick<Response, "json">>;

export async function submitCandidateReviewAction(
  payload: CandidateReviewActionClientPayload,
  fetchImpl: FetchLike = fetch,
): Promise<CandidateReviewActionClientResponse> {
  const response = await fetchImpl("/api/gnr8/admin/candidate-review/actions", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json() as Promise<CandidateReviewActionClientResponse>;
}
