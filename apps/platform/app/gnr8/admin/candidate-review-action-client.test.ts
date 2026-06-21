import assert from "node:assert/strict";
import test from "node:test";

import {
  submitCandidateReviewAction,
  type CandidateReviewUiActionType,
} from "./candidate-review/[siteVersionId]/candidate-review-action-client";

const target = {
  siteVersionId: "site-version-1",
  candidateId: "candidate-1",
  rationale: "Reviewed against captured evidence.",
  candidateDiscoveryArtifactId: "discovery-artifact-1",
  candidateReviewPackageArtifactId: "review-artifact-1",
};

for (const actionType of ["approve", "reject", "defer"] as const) {
  test(`${actionType} submits the exact Candidate Review action payload`, async () => {
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    const response = await submitCandidateReviewAction(
      { ...target, actionType },
      async (url, init) => {
        requestUrl = url;
        requestInit = init;
        return {
          json: async () => successResponse(actionType),
        };
      },
    );

    assert.equal(requestUrl, "/api/gnr8/admin/candidate-review/actions");
    assert.equal(requestInit?.method, "POST");
    assert.equal(requestInit?.credentials, "same-origin");
    assert.deepEqual(requestInit?.headers, { "content-type": "application/json" });
    assert.deepEqual(JSON.parse(String(requestInit?.body)), { ...target, actionType });
    assert.equal(response.ok, true);
  });
}

function successResponse(actionType: CandidateReviewUiActionType) {
  const decision = actionType === "approve" ? "approved" : actionType === "reject" ? "rejected" : "deferred";
  return {
    ok: true as const,
    actionId: `action:${actionType}`,
    candidateId: target.candidateId,
    decision,
    reviewEventId: `event:${actionType}`,
    candidateReviewPackageArtifactId: "review-artifact-2",
    counts: {
      reviewedCandidateCount: 1,
      approvedCount: actionType === "approve" ? 1 : 0,
      rejectedCount: actionType === "reject" ? 1 : 0,
      deferredCount: actionType === "defer" ? 1 : 0,
    },
    diagnostics: ["CANDIDATE_REVIEW_ACTION_APPLIED"],
  };
}
