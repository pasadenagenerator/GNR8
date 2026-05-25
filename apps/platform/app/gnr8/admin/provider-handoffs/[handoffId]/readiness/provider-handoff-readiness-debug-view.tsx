import React from "react";
import {
  buildProviderHandoffReadinessDebugDisplay,
  redactSecretLikeText,
} from "@/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/provider-handoff-readiness-debug-presenter";
import { GovernanceAuthorizationIntentForm } from "@/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/governance-authorization-intent-form";
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

type GovernanceSnapshotSummary = {
  snapshotId?: string;
  handoffId?: string;
  correlationKey?: string;
  readinessStatus?: string;
  executionBlocked?: boolean;
  workerPickupEvidence?: WorkerPickupEvidenceSummary;
  reviewSummary?: OperatorReviewStateSummary;
  diagnostics?: string[];
  createdAt?: string;
};
type GovernanceTimelineSnapshotSummary = {
  snapshotId: string;
  createdAt: string;
  reviewSummaryStatus: string;
  reviewCount: number;
  readinessStatus: string;
  diagnostics: string[];
};
type GovernanceAuthorizationSummary = {
  authorizationId?: string;
  handoffId?: string;
  correlationKey?: string;
  authorizationStatus?: string;
  authorizationReason?: string;
  intentOnly?: boolean;
  executionBlocked?: boolean;
  createdAt?: string;
  diagnostics?: string[];
};
type GovernanceDecisionPackageSummary = {
  packageId: string;
  recommendedAction: string;
  executionBlocked: boolean;
  reviewStatus: string;
  authorizationStatus: string;
  snapshotCount: number;
  diagnostics: string[];
};
type ExecutionReadinessGateCondition = {
  condition: string;
  status: "passed" | "failed" | "not_applicable";
  reason: string;
};
type ExecutionReadinessGateSummary = {
  gateId: string;
  gateStatus: string;
  executionAllowed: boolean;
  executionBlocked: boolean;
  blockingReasons: string[];
  requiredConditions: ExecutionReadinessGateCondition[];
  diagnostics: string[];
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
  governanceSnapshot?: GovernanceSnapshotSummary;
  governanceTimeline?: GovernanceTimelineSnapshotSummary[];
  governanceAuthorization?: GovernanceAuthorizationSummary | null;
  governanceDecisionPackage?: GovernanceDecisionPackageSummary | null;
  executionReadinessGate?: ExecutionReadinessGateSummary | null;
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

export function ProviderHandoffReadinessDebugView(props: {
  model: ProviderHandoffReadinessDebugModel;
  fetchError?: string | null;
  operatorReviewFetchError?: string | null;
}) {
  const { model, fetchError, operatorReviewFetchError } = props;
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
      <section style={{ border: "1px solid #facc15", borderRadius: 10, background: "#fef9c3", padding: 12, marginTop: 12 }}>
        <strong>Decision package is advisory only. Execution remains blocked.</strong>
      </section>
      <section style={{ border: "1px solid #bfdbfe", borderRadius: 10, background: "#eff6ff", padding: 12, marginTop: 12 }}>
        <strong>Execution gate is evaluative only. Execution remains disabled.</strong>
      </section>

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
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Governance Decision Package</h2>
        <Field label="packageId" value={redactSecretLikeText(display.governanceDecisionPackage.packageId)} />
        <Field label="recommendedAction" value={redactSecretLikeText(display.governanceDecisionPackage.recommendedAction)} />
        <Field label="executionBlocked" value={String(Boolean(display.governanceDecisionPackage.executionBlocked))} />
        <Field label="reviewStatus" value={redactSecretLikeText(display.governanceDecisionPackage.reviewStatus)} />
        <Field label="authorizationStatus" value={redactSecretLikeText(display.governanceDecisionPackage.authorizationStatus)} />
        <Field label="snapshotCount" value={String(display.governanceDecisionPackage.snapshotCount)} />
        <ListField label="diagnostics" values={display.governanceDecisionPackage.diagnostics} />
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Execution Readiness Gate</h2>
        <Field label="gateStatus" value={redactSecretLikeText(display.executionReadinessGate.gateStatus)} />
        <Field label="executionAllowed" value={String(Boolean(display.executionReadinessGate.executionAllowed))} />
        <Field label="executionBlocked" value={String(Boolean(display.executionReadinessGate.executionBlocked))} />
        <ListField label="blockingReasons" values={display.executionReadinessGate.blockingReasons} />
        <ListField label="diagnostics" values={display.executionReadinessGate.diagnostics} />
        {display.executionReadinessGate.requiredConditions.length > 0 ? (
          display.executionReadinessGate.requiredConditions.map((condition) => (
            <div
              key={`${condition.condition}:${condition.status}`}
              style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, background: "#f9fafb" }}
            >
              <Field label="condition" value={redactSecretLikeText(condition.condition)} />
              <Field label="status" value={redactSecretLikeText(condition.status)} />
              <Field label="reason" value={redactSecretLikeText(condition.reason)} />
            </div>
          ))
        ) : (
          <p style={{ margin: 0, color: "#6b7280" }}>No required conditions available.</p>
        )}
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
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Authorization</h2>
        <p style={{ margin: "0 0 10px 0", color: "#4b5563" }}>Authorization is intent only. Execution remains blocked.</p>
        <GovernanceAuthorizationIntentForm handoffId={model.handoffId} />
        <div style={{ height: 8 }} />
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, background: "#f9fafb" }}>
          <Field label="authorizationStatus" value={redactSecretLikeText(display.governanceAuthorization.authorizationStatus)} />
          <Field label="authorizationReason" value={redactSecretLikeText(display.governanceAuthorization.authorizationReason)} />
          <Field label="intentOnly" value={String(Boolean(display.governanceAuthorization.intentOnly))} />
          <Field label="executionBlocked" value={String(Boolean(display.governanceAuthorization.executionBlocked))} />
          <Field label="createdAt" value={redactSecretLikeText(display.governanceAuthorization.createdAt)} />
          <ListField label="diagnostics" values={display.governanceAuthorization.diagnostics} />
        </div>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Operator Review</h2>
        <p style={{ margin: "0 0 10px 0", color: "#4b5563" }}>Review intent only. Execution remains blocked.</p>
        {operatorReviewFetchError ? (
          <section style={{ border: "1px solid #fecaca", borderRadius: 10, background: "#fff1f2", padding: 12, marginBottom: 12 }}>
            <strong>Operator review fetch error:</strong> {redactSecretLikeText(operatorReviewFetchError)}
          </section>
        ) : null}
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

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Governance Snapshot</h2>
        <Field label="snapshotId" value={redactSecretLikeText(display.governanceSnapshot.snapshotId)} />
        <Field label="handoffId" value={redactSecretLikeText(display.governanceSnapshot.handoffId)} />
        <Field label="readinessStatus" value={redactSecretLikeText(display.governanceSnapshot.readinessStatus)} />
        <Field label="executionBlocked" value={String(Boolean(display.governanceSnapshot.executionBlocked))} />
        <Field label="correlationKey" value={redactSecretLikeText(display.governanceSnapshot.correlationKey)} />
        <Field label="createdAt" value={redactSecretLikeText(display.governanceSnapshot.createdAt)} />
        <Field label="reviewSummaryStatus" value={redactSecretLikeText(display.governanceSnapshot.reviewSummaryStatus)} />
        <ListField label="diagnostics" values={display.governanceSnapshot.diagnostics} />
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Governance Timeline</h2>
        {display.governanceTimeline.length > 0 ? (
          display.governanceTimeline.map((snapshot) => (
            <div
              key={snapshot.snapshotId}
              style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, background: "#f9fafb" }}
            >
              <Field label="snapshotId" value={snapshot.snapshotId} />
              <Field label="createdAt" value={snapshot.createdAt} />
              <Field label="reviewSummaryStatus" value={snapshot.reviewSummaryStatus} />
              <Field label="reviewCount" value={String(snapshot.reviewCount)} />
              <Field label="readinessStatus" value={snapshot.readinessStatus} />
              <ListField label="diagnostics" values={snapshot.diagnostics} />
            </div>
          ))
        ) : (
          <p style={{ margin: 0, color: "#6b7280" }}>No governance timeline snapshots available for this handoff.</p>
        )}
      </section>
    </main>
  );
}
