"use client";

import React, { useMemo, useState } from "react";

import type { AirshipInternalPreviewCandidateReviewRecord } from "@/gnr8/single-site/airship-single-site-draft-candidate-review-service";
import type { AirshipPublishReadinessRecord } from "@/gnr8/single-site/airship-single-site-publish-readiness-service";

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
  review: AirshipInternalPreviewCandidateReviewRecord | null;
  initialReadiness: AirshipPublishReadinessRecord | null;
};

type ReadinessState = "idle" | "preparing" | "ready" | "failed";

type ReadinessResponse = {
  ok?: boolean;
  readiness?: AirshipPublishReadinessRecord & { status?: "created" | "reused" };
  error?: string;
};

function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    border: `1px solid ${disabled ? "#cbd5e1" : "#1d4ed8"}`,
    borderRadius: 8,
    background: disabled ? "#f8fafc" : "#1d4ed8",
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

function pointerLabel(pointer: { siteVersionId: string | null; artifactId: string | null }): string {
  return `${pointer.siteVersionId ?? "none"} / ${pointer.artifactId ?? "none"}`;
}

export function AirshipPublishReadinessAction(props: Props) {
  const [state, setState] = useState<ReadinessState>(props.initialReadiness ? "ready" : "idle");
  const [readiness, setReadiness] = useState<AirshipPublishReadinessRecord | null>(() => props.initialReadiness);
  const reviewMatchesCandidate = Boolean(
    props.review &&
      props.candidate &&
      props.review.draftId === props.candidate.draftId &&
      props.review.draftVersion === props.candidate.draftVersion &&
      props.review.candidateSiteVersionId === props.candidate.siteVersionId &&
      props.review.candidateRuntimeArtifactId === props.candidate.runtimeArtifactId,
  );
  const readinessMatchesReview = Boolean(
    readiness &&
      props.review &&
      props.candidate &&
      readiness.reviewRecordId === props.review.id &&
      readiness.draftId === props.candidate.draftId &&
      readiness.draftVersion === props.candidate.draftVersion &&
      readiness.reviewedCandidateSiteVersionId === props.candidate.siteVersionId &&
      readiness.reviewedArtifactId === props.candidate.runtimeArtifactId,
  );
  const candidateMatchesSavedDraft = Boolean(
    props.candidate &&
      props.savedDraftId &&
      props.savedDraftVersion &&
      props.candidate.draftId === props.savedDraftId &&
      props.candidate.draftVersion === props.savedDraftVersion,
  );
  const disabled = state === "preparing" || !props.migrationId || !props.candidate || !props.review || !candidateMatchesSavedDraft || !reviewMatchesCandidate;
  const message = useMemo(() => {
    if (!props.candidate) return "Create an internal preview candidate first. This readiness step never publishes.";
    if (!candidateMatchesSavedDraft) return "Latest candidate does not match the saved draft/version; save and apply the draft to preview before readiness.";
    if (!props.review || !reviewMatchesCandidate) return "Approved internal preview review is required before publish-readiness evidence can be prepared.";
    if (readinessMatchesReview && readiness) return `Publish-readiness evidence prepared at ${readiness.createdAt}. Next step is governed dry-run later, not publish.`;
    if (state === "failed") return "Publish-readiness evidence could not be prepared. No live site, publish state, or active pointer changed.";
    if (state === "preparing") return "Preparing readiness/evidence for the approved internal preview only...";
    return "Prepare a publish-readiness/evidence package only. Internal preview only; not live; not published; active pointer unchanged.";
  }, [candidateMatchesSavedDraft, props.candidate, props.review, readiness, readinessMatchesReview, reviewMatchesCandidate, state]);

  async function prepareReadiness() {
    if (disabled || !props.candidate || !props.review) return;
    setState("preparing");
    try {
      const response = await fetch("/api/gnr8/admin/airship/single-site/publish-readiness", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actionMode: "prepare_publish_readiness",
          migrationId: props.migrationId,
          draftId: props.candidate.draftId,
          draftVersion: props.candidate.draftVersion,
          candidateSiteVersionId: props.candidate.siteVersionId,
          candidateRuntimeArtifactId: props.candidate.runtimeArtifactId,
          reviewRecordId: props.review.id,
          idempotencyKey: `airship-publish-readiness:${props.migrationId}:${props.review.id}:${props.candidate.siteVersionId}:${props.candidate.runtimeArtifactId}:${props.candidate.draftId}:${props.candidate.draftVersion}`,
        }),
      });
      const payload = await response.json() as ReadinessResponse;
      if (!response.ok || !payload.ok || !payload.readiness) throw new Error(payload.error || "airship_publish_readiness_failed");
      setReadiness(payload.readiness);
      setState("ready");
    } catch {
      setState("failed");
    }
  }

  return (
    <div style={{ border: "1px solid #bfdbfe", borderRadius: 8, background: "#eff6ff", padding: 12, display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#1d4ed8", fontSize: 12, fontWeight: 900 }}>Publish-readiness evidence handoff</div>
          <div style={{ marginTop: 3, color: "#334155", fontSize: 12, lineHeight: 1.45 }}>{message}</div>
        </div>
        <button
          type="button"
          disabled={disabled || readinessMatchesReview}
          aria-busy={state === "preparing"}
          aria-label="Prepare publish readiness"
          onClick={() => void prepareReadiness()}
          style={buttonStyle(disabled || readinessMatchesReview)}
        >
          {state === "preparing" ? "Preparing..." : readinessMatchesReview ? "Publish readiness prepared" : "Prepare publish readiness"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#334155", fontSize: 12, fontWeight: 850 }}>
        <span>internal preview only</span>
        <span>not live</span>
        <span>not published</span>
        <span>active pointer unchanged</span>
        <span>readiness/evidence only</span>
        <span>next step: governed dry-run</span>
      </div>
      {readinessMatchesReview && readiness ? (
        <div style={{ borderTop: "1px solid #dbeafe", paddingTop: 10, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 9 }}>
            {fact("Readiness status", `${readiness.readinessStatus} / evidence prepared`)}
            {fact("Reviewed candidate", readiness.reviewedCandidateSiteVersionId)}
            {fact("Artifact", readiness.reviewedArtifactId)}
            {fact("Draft", `${readiness.draftId} v${readiness.draftVersion}`)}
            {fact("Review", `${readiness.reviewRecordId} / ${readiness.reviewStatus} / ${readiness.reviewedAt}`)}
            {fact("Source URL", readiness.siteClientSourceLabels.sourceUrl)}
            {fact("Internal preview ref", readiness.internalPreviewUrl)}
            {fact("Pointer before", pointerLabel(readiness.currentLiveActivePointerBefore))}
            {fact("Pointer after", pointerLabel(readiness.currentLiveActivePointerAfter))}
            {fact("Next step", readiness.nextStep)}
          </div>
          <div style={{ color: "#334155", fontSize: 12, lineHeight: 1.45 }}>
            <strong>Source evidence:</strong> {readiness.sourceEvidenceSummary.detail}
          </div>
          <div style={{ color: "#334155", fontSize: 12, lineHeight: 1.45 }}>
            <strong>Saved draft fields:</strong> {readiness.savedDraftFieldSummary.map((item) => `${item.targetSectionPage} (${item.status})`).join("; ") || "unavailable"}
          </div>
          <div style={{ color: "#334155", fontSize: 12, lineHeight: 1.45 }}>
            <strong>No-publish confirmation:</strong> internal preview only; not live; not published; candidate runtime state DRAFT; active pointer unchanged before/after; no dry-run, shadow-publish, rollback, source capture, provider call, or live-site mutation.
          </div>
        </div>
      ) : null}
    </div>
  );
}
