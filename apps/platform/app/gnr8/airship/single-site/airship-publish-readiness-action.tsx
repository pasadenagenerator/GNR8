"use client";

import React, { useMemo, useState } from "react";

import type { AirshipInternalPreviewCandidateReviewRecord } from "@/gnr8/single-site/airship-single-site-draft-candidate-review-service";
import type { AirshipGovernedDryRunOutput, AirshipGovernedDryRunReadback } from "@/gnr8/single-site/airship-governed-dry-run-service";
import type { AirshipPublishActivationChainRecord } from "@/gnr8/single-site/airship-publish-activation-chain-service";
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
  initialDryRun: AirshipGovernedDryRunReadback | null;
};

type ReadinessState = "idle" | "preparing" | "ready" | "failed";
type ChainState = "idle" | "creating" | "ready" | "failed";
type DryRunState = "idle" | "running" | "complete" | "failed";

type ReadinessResponse = {
  ok?: boolean;
  readiness?: AirshipPublishReadinessRecord & { status?: "created" | "reused" };
  error?: string;
};

type DryRunResponse = {
  ok?: boolean;
  result?: AirshipGovernedDryRunReadback;
  nextStep?: AirshipGovernedDryRunOutput["nextStep"];
  error?: string;
  diagnostics?: string[];
};

type ChainResponse = {
  ok?: boolean;
  status?: "created" | "reused";
  chain?: AirshipPublishActivationChainRecord;
  error?: string;
  diagnostics?: string[];
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

function activationChainFromReadiness(readiness: AirshipPublishReadinessRecord | null): AirshipPublishActivationChainRecord | null {
  const metadata = readiness?.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const chain = (metadata as Record<string, unknown>).airshipPublishActivationChain;
  if (!chain || typeof chain !== "object" || Array.isArray(chain)) return null;
  return chain as AirshipPublishActivationChainRecord;
}

export function AirshipPublishReadinessAction(props: Props) {
  const [state, setState] = useState<ReadinessState>(props.initialReadiness ? "ready" : "idle");
  const [readiness, setReadiness] = useState<AirshipPublishReadinessRecord | null>(() => props.initialReadiness);
  const [chainState, setChainState] = useState<ChainState>(activationChainFromReadiness(props.initialReadiness) ? "ready" : "idle");
  const [chain, setChain] = useState<AirshipPublishActivationChainRecord | null>(() => activationChainFromReadiness(props.initialReadiness));
  const [chainError, setChainError] = useState<string | null>(null);
  const [dryRunState, setDryRunState] = useState<DryRunState>(props.initialDryRun ? "complete" : "idle");
  const [dryRun, setDryRun] = useState<AirshipGovernedDryRunReadback | null>(() => props.initialDryRun);
  const [dryRunError, setDryRunError] = useState<string | null>(null);
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
  const chainMatchesReadiness = Boolean(
    chain &&
      readinessMatchesReview &&
      readiness &&
      chain.readinessPackageId === readiness.id &&
      chain.reviewRecordId === readiness.reviewRecordId &&
      chain.candidateVersionId === readiness.reviewedCandidateSiteVersionId &&
      chain.artifactId === readiness.reviewedArtifactId &&
      chain.draftId === readiness.draftId &&
      chain.draftVersion === readiness.draftVersion,
  );
  const chainDisabled = chainState === "creating" || !props.migrationId || !props.candidate || !props.review || !readinessMatchesReview || !readiness || chainMatchesReadiness;
  const dryRunDisabled = dryRunState === "running" || !props.migrationId || !props.candidate || !props.review || !readinessMatchesReview || !readiness || !chainMatchesReadiness || Boolean(dryRun);
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
      setChain(activationChainFromReadiness(payload.readiness));
      setChainState(activationChainFromReadiness(payload.readiness) ? "ready" : "idle");
      setState("ready");
    } catch {
      setState("failed");
    }
  }

  async function createActivationChain() {
    if (chainDisabled || !props.candidate || !props.review || !readiness) return;
    setChainState("creating");
    setChainError(null);
    try {
      const response = await fetch("/api/gnr8/admin/airship/single-site/publish-activation-chain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actionMode: "create_publish_activation_chain",
          migrationId: props.migrationId,
          readinessPackageId: readiness.id,
          reviewRecordId: readiness.reviewRecordId,
          candidateVersionId: readiness.reviewedCandidateSiteVersionId,
          artifactId: readiness.reviewedArtifactId,
          draftId: readiness.draftId,
          draftVersion: readiness.draftVersion,
        }),
      });
      const payload = await response.json() as ChainResponse;
      if (!response.ok || !payload.ok || !payload.chain) {
        throw new Error(payload.diagnostics?.join("; ") || payload.error || "airship_publish_activation_chain_failed");
      }
      setChain(payload.chain);
      setChainState("ready");
    } catch (error) {
      setChainState("failed");
      setChainError(error instanceof Error ? error.message : "airship_publish_activation_chain_failed");
    }
  }

  async function runGovernedDryRun() {
    if (dryRunDisabled || !props.candidate || !props.review || !readiness) return;
    setDryRunState("running");
    setDryRunError(null);
    try {
      const response = await fetch("/api/gnr8/admin/airship/single-site/governed-dry-run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actionMode: "run_governed_dry_run",
          migrationId: props.migrationId,
          readinessPackageId: readiness.id,
          reviewRecordId: readiness.reviewRecordId,
          candidateVersionId: readiness.reviewedCandidateSiteVersionId,
          artifactId: readiness.reviewedArtifactId,
          draftId: readiness.draftId,
          draftVersion: readiness.draftVersion,
        }),
      });
      const payload = await response.json() as DryRunResponse;
      if (!response.ok || !payload.ok || !payload.result) {
        throw new Error(payload.diagnostics?.join("; ") || payload.error || "airship_governed_dry_run_failed");
      }
      setDryRun(payload.result);
      setDryRunState("complete");
    } catch (error) {
      setDryRunState("failed");
      setDryRunError(error instanceof Error ? error.message : "airship_governed_dry_run_failed");
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
          <div style={{ borderTop: "1px solid #dbeafe", paddingTop: 10, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "#1d4ed8", fontSize: 12, fontWeight: 900 }}>Publish activation chain</div>
                <div style={{ marginTop: 3, color: "#334155", fontSize: 12, lineHeight: 1.45 }}>
                  Creates approval/gate metadata only: no publish, no dry-run, no shadow-publish, no active pointer mutation.
                </div>
              </div>
              <button
                type="button"
                disabled={chainDisabled}
                aria-busy={chainState === "creating"}
                aria-label="Create publish activation chain"
                onClick={() => void createActivationChain()}
                style={buttonStyle(chainDisabled)}
              >
                {chainState === "creating" ? "Creating..." : chainMatchesReadiness ? "Activation chain ready" : "Create publish activation chain"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#334155", fontSize: 12, fontWeight: 850 }}>
              <span>approval/gate metadata only</span>
              <span>no publish</span>
              <span>no dry-run</span>
              <span>no shadow-publish</span>
              <span>active pointer unchanged</span>
            </div>
            {chainMatchesReadiness && chain ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 9 }}>
                  {fact("Activation request", `${chain.activationRequest.ref} / ${chain.activationRequest.status}`)}
                  {fact("Activation decision", `${chain.activationDecision.ref} / ${chain.activationDecision.status}`)}
                  {fact("Gate attempt", `${chain.gateAttempt.ref} / ${chain.gateAttempt.status}`)}
                  {fact("Gate input watermark", chain.gateInputWatermark)}
                  {fact("Candidate", chain.candidateVersionId)}
                  {fact("Artifact", chain.artifactId)}
                  {fact("Draft", `${chain.draftId} v${chain.draftVersion}`)}
                  {fact("Readiness package", chain.readinessPackageId)}
                  {fact("Review", chain.reviewRecordId)}
                  {fact("Publish target", chain.publishTargetRef.sourceRef ?? chain.publishTargetRef.sourceRecordId)}
                  {fact("Pointer before", pointerLabel(chain.activePointerBefore))}
                  {fact("Pointer after", pointerLabel(chain.activePointerAfter))}
                  {fact("Next step", chain.nextStep)}
                </div>
                <div style={{ color: "#334155", fontSize: 12, lineHeight: 1.45 }}>
                  <strong>Evidence/source refs:</strong>{" "}
                  {[
                    chain.evidenceSourceRefs.readinessPackageRef.sourceRef,
                    chain.evidenceSourceRefs.reviewRecordRef.sourceRef,
                    chain.evidenceSourceRefs.candidateSourceRef.sourceRef,
                    chain.evidenceSourceRefs.artifactSourceRef.sourceRef,
                    chain.evidenceSourceRefs.draftSourceRef.sourceRef,
                  ].filter(Boolean).join("; ")}
                </div>
                <div style={{ color: "#166534", fontSize: 12, lineHeight: 1.45 }}>
                  <strong>Readback:</strong> active pointer unchanged; candidate remains non-live; next step is governed dry-run, not publish.
                </div>
              </div>
            ) : chainState === "failed" ? (
              <div style={{ border: "1px solid #fbbf24", borderRadius: 8, background: "#fffbeb", color: "#92400e", padding: 10, fontSize: 12, lineHeight: 1.45 }}>
                Activation chain was not created. {chainError ?? "No publish, dry-run, shadow-publish, active pointer, provider, or live-site state changed."}
              </div>
            ) : null}
          </div>
          <div style={{ borderTop: "1px solid #dbeafe", paddingTop: 10, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "#1d4ed8", fontSize: 12, fontWeight: 900 }}>Governed dry-run check</div>
                <div style={{ marginTop: 3, color: "#334155", fontSize: 12, lineHeight: 1.45 }}>
                  Dry-run only; no publish; no shadow-publish; active pointer unchanged; live CHS unchanged.
                </div>
              </div>
              <button
                type="button"
                disabled={dryRunDisabled}
                aria-busy={dryRunState === "running"}
                aria-label="Run governed dry-run"
                onClick={() => void runGovernedDryRun()}
                style={buttonStyle(dryRunDisabled)}
              >
                {dryRunState === "running" ? "Running..." : dryRun ? "Governed dry-run recorded" : "Run governed dry-run"}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#334155", fontSize: 12, fontWeight: 850 }}>
              <span>dry-run only</span>
              <span>no publish</span>
              <span>no shadow-publish</span>
              <span>active pointer unchanged</span>
              <span>live CHS unchanged</span>
            </div>
            {dryRun ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 9 }}>
                  {fact("Dry-run result", dryRun.ok ? "ready / no blockers" : "blocked / review blockers")}
                  {fact("Action status", dryRun.actionStatus)}
                  {fact("Wrapper status", dryRun.wrapperDryRunStatus)}
                  {fact("Resolver status", dryRun.resolverStatus)}
                  {fact("Action ref", dryRun.actionId)}
                  {fact("Dry-run idempotency", dryRun.idempotencyKey)}
                </div>
                <div style={{ color: dryRun.blockerCodes.length > 0 ? "#92400e" : "#166534", fontSize: 12, lineHeight: 1.45 }}>
                  <strong>Blockers:</strong> {dryRun.blockerCodes.join("; ") || "none"}
                </div>
                <div style={{ color: "#334155", fontSize: 12, lineHeight: 1.45 }}>
                  <strong>Warnings/limitations:</strong> {[...dryRun.warnings, ...dryRun.limitationCodes].join("; ") || "none"}
                </div>
                <div style={{ color: "#334155", fontSize: 12, lineHeight: 1.45 }}>
                  <strong>Next step:</strong> {dryRun.ok ? "eligible for a separately approved shadow-publish task" : "resolve listed blockers"}
                </div>
              </div>
            ) : dryRunState === "failed" ? (
              <div style={{ border: "1px solid #fbbf24", borderRadius: 8, background: "#fffbeb", color: "#92400e", padding: 10, fontSize: 12, lineHeight: 1.45 }}>
                Governed dry-run did not run. {dryRunError ?? "No live state changed."}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
