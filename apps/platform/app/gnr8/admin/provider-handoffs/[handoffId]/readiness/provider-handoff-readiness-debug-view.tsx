import React from "react";
import {
  buildProviderHandoffReadinessDebugDisplay,
  redactSecretLikeText,
} from "@/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/provider-handoff-readiness-debug-presenter";
import { OperatorReviewIntentForm } from "@/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/operator-review-intent-form";

type ProviderHandoffArtifactSummary = {
  handoffId?: string;
  artifactId?: string;
  siteId?: string;
  siteVersionId?: string;
  providerId?: string;
  environment?: string;
  capability?: string;
  operationKind?: string;
  approvalStatus?: string;
  riskLevel?: string;
  handoffStatus?: string;
  plannedJobIds?: string[];
  warnings?: string[];
  blockers?: string[];
  correlationKey?: string;
} | null;

type WorkerPickupEvidenceSummary = {
  handoffRef?: string;
  providerRef?: string;
  jobRefs?: string[];
  approvalRef?: string;
  approvalStatus?: string;
  readinessStatus?: string;
  executionBlocked?: boolean;
  blockedReasons?: string[];
  diagnostics?: string[];
  nextAllowedAction?: string;
  correlationKey?: string;
};

type OperatorReviewSummary = {
  reviewId: string;
  reviewerRef: string;
  reviewStatus: string;
  reviewReason: string;
  createdAt: string;
};

type OperatorReviewStateSummary = {
  reviewSummaryStatus: string;
  reviewCount: number;
  latestReviewer: string;
  latestCreatedAt: string;
  latestReason: string;
  intentOnly: boolean;
  executionBlocked: boolean;
};

export type ProviderHandoffReadinessDebugModel = {
  handoffId: string;
  readinessStatus: string;
  executionBlocked: boolean;
  blockedReasons: string[];
  nextAllowedAction: string;
  correlationKey: string;
  diagnostics: string[];
  handoffArtifact: ProviderHandoffArtifactSummary;
  workerPickupEvidence: WorkerPickupEvidenceSummary;
  operatorReviews: OperatorReviewSummary[];
  operatorReviewSummary: OperatorReviewStateSummary;
  operatorReviewIntentOnly: boolean;
};

function Field(props: { label: string; value: string }) {
  return (
    <div>
      <strong>{props.label}:</strong> <span>{props.value}</span>
    </div>
  );
}

function ListField(props: { label: string; values: string[] }) {
  return (
    <div>
      <strong>{props.label}:</strong>{" "}
      <span>{props.values.length > 0 ? props.values.join(", ") : "none"}</span>
    </div>
  );
}

export function ProviderHandoffReadinessDebugView(props: { model: ProviderHandoffReadinessDebugModel; fetchError?: string | null }) {
  const { model, fetchError } = props;
  const display = buildProviderHandoffReadinessDebugDisplay(model);
  const artifact = display.handoffArtifactSummary;
  const evidence = display.workerPickupEvidenceSummary;

  return (
    <main
      style={{
        padding: 18,
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        background: "#f3f6fb",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 20 }}>Provider Handoff Pickup Readiness (Internal Debug)</h1>
      <p style={{ margin: "8px 0 0 0", color: "#374151", fontWeight: 600 }}>{display.executionBlockedLabel}</p>
      <p style={{ margin: "4px 0 0 0", color: "#4b5563" }}>{display.reviewOnlyLabel}</p>

      {fetchError ? (
        <section style={{ border: "1px solid #fecaca", borderRadius: 10, background: "#fff1f2", padding: 12, marginTop: 12 }}>
          <strong>Readiness fetch error:</strong> {redactSecretLikeText(fetchError)}
        </section>
      ) : null}

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Readiness</h2>
        <Field label="handoffId" value={display.handoffId} />
        <Field label="readinessStatus" value={display.readinessStatus} />
        <Field label="executionBlocked" value={display.executionBlocked} />
        <ListField label="blockedReasons" values={display.blockedReasons} />
        <Field label="nextAllowedAction" value={display.nextAllowedAction} />
        <Field label="correlationKey" value={display.correlationKey} />
        <ListField label="diagnostics" values={display.diagnostics} />
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>handoffArtifact summary</h2>
        {artifact ? (
          <>
            <Field label="providerId" value={redactSecretLikeText(artifact.providerId)} />
            <Field label="environment" value={redactSecretLikeText(artifact.environment)} />
            <Field label="capability" value={redactSecretLikeText(artifact.capability)} />
            <Field label="operationKind" value={redactSecretLikeText(artifact.operationKind)} />
            <Field label="approvalStatus" value={redactSecretLikeText(artifact.approvalStatus)} />
            <Field label="riskLevel" value={redactSecretLikeText(artifact.riskLevel)} />
            <Field label="handoffStatus" value={redactSecretLikeText(artifact.handoffStatus)} />
            <ListField label="plannedJobIds" values={artifact.plannedJobIds} />
            <ListField label="warnings" values={artifact.warnings} />
            <ListField label="blockers" values={artifact.blockers} />
          </>
        ) : (
          <p style={{ margin: 0, color: "#6b7280" }}>No persisted handoff artifact available.</p>
        )}
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Operator Review</h2>
        <p style={{ margin: "0 0 10px 0", color: "#4b5563" }}>Review intent only. Execution remains blocked.</p>
        <OperatorReviewIntentForm handoffId={model.handoffId} />
        <div style={{ height: 8 }} />
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, background: "#f9fafb" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14 }}>Operator Review Summary</h3>
          <Field label="summary status" value={display.operatorReviewSummary.reviewSummaryStatus} />
          <Field label="review count" value={String(display.operatorReviewSummary.reviewCount)} />
          <Field label="latest reviewer" value={display.operatorReviewSummary.latestReviewer} />
          <Field label="latest timestamp" value={display.operatorReviewSummary.latestCreatedAt} />
          <Field label="latest reason" value={display.operatorReviewSummary.latestReason} />
          <p style={{ margin: "8px 0 0 0", color: "#4b5563" }}>Review intent only. Execution remains blocked.</p>
        </div>
        {display.operatorReviews.length > 0 ? (
          display.operatorReviews.map((review) => (
            <div
              key={review.reviewId}
              style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, background: "#f9fafb" }}
            >
              <Field label="reviewer" value={redactSecretLikeText(review.reviewerRef)} />
              <Field label="status" value={redactSecretLikeText(review.reviewStatus)} />
              <Field label="reason" value={redactSecretLikeText(review.reviewReason)} />
              <Field label="createdAt" value={redactSecretLikeText(review.createdAt)} />
            </div>
          ))
        ) : (
          <p style={{ margin: 0, color: "#6b7280" }}>No operator reviews persisted for this handoff.</p>
        )}
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>workerPickupEvidence summary</h2>
        <Field label="providerRef" value={redactSecretLikeText(evidence.providerRef)} />
        <Field label="approvalStatus" value={redactSecretLikeText(evidence.approvalStatus)} />
        <Field label="readinessStatus" value={redactSecretLikeText(evidence.readinessStatus)} />
        <Field label="executionBlocked" value={String(Boolean(evidence.executionBlocked))} />
        <Field label="nextAllowedAction" value={redactSecretLikeText(evidence.nextAllowedAction)} />
        <ListField label="jobRefs" values={evidence.jobRefs} />
        <ListField label="blockedReasons" values={evidence.blockedReasons} />
        <ListField label="diagnostics" values={evidence.diagnostics} />
      </section>
    </main>
  );
}
