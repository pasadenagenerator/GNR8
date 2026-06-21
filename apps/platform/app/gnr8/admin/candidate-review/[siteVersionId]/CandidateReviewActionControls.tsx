"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CSSProperties } from "react";

import {
  CANDIDATE_REVIEW_UI_ACTION_TYPES,
  submitCandidateReviewAction,
  type CandidateReviewActionClientResponse,
  type CandidateReviewUiActionType,
} from "./candidate-review-action-client";

type Props = {
  siteVersionId: string;
  candidateId: string;
  candidateDiscoveryArtifactId: string;
  candidateReviewPackageArtifactId: string;
};

type Feedback =
  | { kind: "success"; response: Extract<CandidateReviewActionClientResponse, { ok: true }> }
  | { kind: "stale"; response: Extract<CandidateReviewActionClientResponse, { ok: false }> }
  | { kind: "error"; response: Extract<CandidateReviewActionClientResponse, { ok: false }> };

const actionLabels: Record<CandidateReviewUiActionType, string> = {
  approve: "Approve",
  reject: "Reject",
  defer: "Defer",
};

const buttonStyle: CSSProperties = {
  border: "1px solid #94a3b8",
  borderRadius: 6,
  backgroundColor: "#f8fafc",
  color: "#0f172a",
  cursor: "pointer",
  padding: "7px 12px",
};

export function CandidateReviewActionControls(props: Props) {
  const router = useRouter();
  const [rationale, setRationale] = useState("");
  const [pendingAction, setPendingAction] = useState<CandidateReviewUiActionType | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function submit(actionType: CandidateReviewUiActionType) {
    setPendingAction(actionType);
    setFeedback(null);
    try {
      const response = await submitCandidateReviewAction({
        siteVersionId: props.siteVersionId,
        candidateId: props.candidateId,
        actionType,
        rationale,
        candidateDiscoveryArtifactId: props.candidateDiscoveryArtifactId,
        candidateReviewPackageArtifactId: props.candidateReviewPackageArtifactId,
      });
      if (response.ok) {
        setFeedback({ kind: "success", response });
        setRationale("");
        router.refresh();
      } else if (response.errorCode === "STALE_REVIEW_PACKAGE") {
        setFeedback({ kind: "stale", response });
        router.refresh();
      } else {
        setFeedback({ kind: "error", response });
      }
    } catch {
      setFeedback({
        kind: "error",
        response: {
          ok: false,
          errorCode: "REQUEST_FAILED",
          message: "The Candidate Review action request failed.",
          diagnostics: ["CANDIDATE_REVIEW_ACTION_REQUEST_FAILED"],
        },
      });
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section aria-label={`Candidate review actions for ${props.candidateId}`} style={{ marginTop: 14, borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
      <label htmlFor={`candidate-review-rationale:${props.candidateId}`} style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
        Optional rationale
      </label>
      <textarea
        id={`candidate-review-rationale:${props.candidateId}`}
        value={rationale}
        maxLength={2000}
        rows={3}
        disabled={pendingAction !== null}
        onChange={(event) => setRationale(event.target.value)}
        style={{ boxSizing: "border-box", marginTop: 6, padding: 8, width: "100%" }}
      />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {CANDIDATE_REVIEW_UI_ACTION_TYPES.map((actionType) => (
          <button
            key={actionType}
            type="button"
            disabled={pendingAction !== null}
            onClick={() => void submit(actionType)}
            style={{ ...buttonStyle, opacity: pendingAction !== null ? 0.6 : 1 }}
          >
            {pendingAction === actionType ? `${actionLabels[actionType]} pending` : actionLabels[actionType]}
          </button>
        ))}
      </div>
      {feedback?.kind === "success" ? (
        <div role="status" style={{ marginTop: 10, color: "#166534", fontSize: 13 }}>
          Action succeeded: {feedback.response.decision}. Event {feedback.response.reviewEventId}. Package {feedback.response.candidateReviewPackageArtifactId}.
        </div>
      ) : null}
      {feedback?.kind === "stale" ? (
        <div role="alert" style={{ marginTop: 10, color: "#9a3412", fontSize: 13 }}>
          Stale package: the latest Candidate Review package was reloaded. Review its current decision and submit again deliberately. ({feedback.response.errorCode})
        </div>
      ) : null}
      {feedback?.kind === "error" ? (
        <div role="alert" style={{ marginTop: 10, color: "#b91c1c", fontSize: 13 }}>
          {feedback.response.message} ({feedback.response.errorCode})
        </div>
      ) : null}
    </section>
  );
}
