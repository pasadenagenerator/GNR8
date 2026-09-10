"use client";

import React, { useMemo, useState } from "react";

import type { AirshipInternalPreviewCandidateReviewRecord } from "@/gnr8/single-site/airship-single-site-draft-candidate-review-service";

type CandidateSummary = {
  siteVersionId: string;
  runtimeArtifactId: string;
  route: string;
  draftId: string;
  draftVersion: number;
  statusLabel: string;
};

type Props = {
  migrationId: string | null;
  savedDraftId: string | null;
  savedDraftVersion: number | null;
  candidate: CandidateSummary | null;
  initialReview: AirshipInternalPreviewCandidateReviewRecord | null;
};

type ReviewState = "idle" | "approving" | "approved" | "failed";

type ReviewResponse = {
  ok?: boolean;
  review?: AirshipInternalPreviewCandidateReviewRecord & { status?: "created" | "reused" };
  error?: string;
};

function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    border: `1px solid ${disabled ? "#cbd5e1" : "#0f766e"}`,
    borderRadius: 8,
    background: disabled ? "#f8fafc" : "#0f766e",
    color: disabled ? "#94a3b8" : "#fff",
    padding: "9px 12px",
    fontSize: 13,
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function fact(label: string, value: string | number | null) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: "#64748b", fontSize: 11, fontWeight: 900 }}>{label}</div>
      <div style={{ marginTop: 3, color: "#0f172a", fontSize: 12, fontWeight: 850, overflowWrap: "anywhere" }}>{value ?? "unavailable"}</div>
    </div>
  );
}

export function AirshipDraftCandidateReviewAction(props: Props) {
  const [state, setState] = useState<ReviewState>(props.initialReview ? "approved" : "idle");
  const [review, setReview] = useState<AirshipInternalPreviewCandidateReviewRecord | null>(() => props.initialReview);
  const reviewMatchesCandidate = Boolean(
    review &&
      props.candidate &&
      review.draftId === props.candidate.draftId &&
      review.draftVersion === props.candidate.draftVersion &&
      review.candidateSiteVersionId === props.candidate.siteVersionId &&
      review.candidateRuntimeArtifactId === props.candidate.runtimeArtifactId,
  );
  const candidateMatchesSavedDraft = Boolean(
    props.candidate &&
      props.savedDraftId &&
      props.savedDraftVersion &&
      props.candidate.draftId === props.savedDraftId &&
      props.candidate.draftVersion === props.savedDraftVersion,
  );
  const disabled = state === "approving" || !props.migrationId || !props.candidate || !candidateMatchesSavedDraft;
  const message = useMemo(() => {
    if (!props.candidate) return "Create an internal preview candidate before review. This action never publishes.";
    if (!candidateMatchesSavedDraft) return "Latest candidate does not match the saved draft/version; save and apply the draft to preview before review.";
    if (reviewMatchesCandidate && review) return `Approved for publish-readiness evaluation at ${review.reviewedAt}. Not live, not published.`;
    if (state === "failed") return "Review could not be recorded. No live site, publish state, or active pointer changed.";
    if (state === "approving") return "Recording review readiness for the internal preview only...";
    return "Ready to approve this internal preview for publish-readiness evaluation only. This is not publish.";
  }, [candidateMatchesSavedDraft, props.candidate, review, reviewMatchesCandidate, state]);

  async function approvePreviewForPublishReadiness() {
    if (disabled || !props.candidate) return;
    setState("approving");
    try {
      const response = await fetch("/api/gnr8/admin/airship/single-site/draft-candidate-review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actionMode: "approve_internal_preview_for_publish_readiness",
          migrationId: props.migrationId,
          draftId: props.candidate.draftId,
          draftVersion: props.candidate.draftVersion,
          candidateSiteVersionId: props.candidate.siteVersionId,
          candidateRuntimeArtifactId: props.candidate.runtimeArtifactId,
          limitationsNotes: "Operator approved this Airship internal preview candidate for publish-readiness evaluation only. Internal preview only; not live, not published; active pointer unchanged.",
          idempotencyKey: `airship-preview-review:${props.migrationId}:${props.candidate.draftId}:${props.candidate.draftVersion}:${props.candidate.siteVersionId}:${props.candidate.runtimeArtifactId}:approved_for_publish_readiness`,
        }),
      });
      const payload = await response.json() as ReviewResponse;
      if (!response.ok || !payload.ok || !payload.review) throw new Error(payload.error || "airship_preview_review_failed");
      setReview(payload.review);
      setState("approved");
    } catch {
      setState("failed");
    }
  }

  return (
    <div style={{ border: "1px solid #99f6e4", borderRadius: 8, background: "#f0fdfa", padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#0f766e", fontSize: 12, fontWeight: 900 }}>Internal preview review readiness</div>
          <div style={{ marginTop: 3, color: "#334155", fontSize: 12, lineHeight: 1.45 }}>{message}</div>
        </div>
        <button
          type="button"
          disabled={disabled || reviewMatchesCandidate}
          aria-busy={state === "approving"}
          aria-label="Approve internal preview for publish readiness"
          onClick={() => void approvePreviewForPublishReadiness()}
          style={buttonStyle(disabled || reviewMatchesCandidate)}
        >
          {state === "approving" ? "Recording..." : reviewMatchesCandidate ? "Approved for publish readiness" : "Approve internal preview for publish readiness"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#334155", fontSize: 12, fontWeight: 850 }}>
        <span>internal preview only</span>
        <span>not live</span>
        <span>not published</span>
        <span>active pointer unchanged</span>
        <span>records review readiness only</span>
      </div>
      {reviewMatchesCandidate && review ? (
        <div style={{ borderTop: "1px solid #ccfbf1", paddingTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 9 }}>
          {fact("Status", `${review.reviewStatus} / reviewed`)}
          {fact("Reviewed candidate", review.candidateSiteVersionId)}
          {fact("Artifact", review.candidateRuntimeArtifactId)}
          {fact("Draft", `${review.draftId} v${review.draftVersion}`)}
          {fact("Reviewer", `${review.reviewerActorRole}: ${review.reviewerActorId}`)}
          {fact("Reviewed at", review.reviewedAt)}
          {fact("Next step", review.nextStep)}
        </div>
      ) : null}
    </div>
  );
}
