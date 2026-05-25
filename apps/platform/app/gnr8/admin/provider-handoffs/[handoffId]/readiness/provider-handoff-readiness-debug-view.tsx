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
type ExecutionPreconditionsLedgerRequirement = {
  requirementId: string;
  category: "governance" | "approval" | "execution" | "provider" | "safety";
  name: string;
  status: "satisfied" | "missing" | "blocked";
  reason: string;
};
type ExecutionPreconditionsLedgerSummary = {
  ledgerId: string;
  overallStatus: "incomplete" | "satisfied_but_execution_disabled" | "blocked";
  executionAllowed: boolean;
  executionBlocked: boolean;
  missingRequirements: ExecutionPreconditionsLedgerRequirement[];
  blockedRequirements: ExecutionPreconditionsLedgerRequirement[];
  requirements: ExecutionPreconditionsLedgerRequirement[];
  diagnostics: string[];
};
type ExecutionRemediationActionSummary = {
  actionId: string;
  priority: "critical" | "high" | "normal";
  source: "ledger" | "gate" | "handoff";
  reason: string;
  recommendedAction: string;
};
type ExecutionRemediationPlanSummary = {
  planId: string;
  overallStatus: "blocked" | "missing_requirements" | "ready_but_execution_disabled";
  summary: string;
  executionAllowed: boolean;
  executionBlocked: boolean;
  intentOnly: boolean;
  actions: ExecutionRemediationActionSummary[];
  diagnostics: string[];
};
type DryRunJobPlanSummary = {
  planId: string;
  handoffId: string;
  executionAllowed: boolean;
  executionBlocked: boolean;
  intentOnly: boolean;
  jobCount: number;
  jobs: {
    jobId: string;
    jobType: "provider_dns_upsert" | "provider_dns_delete" | "provider_domain_attach" | "provider_unknown";
    provider: string;
    environment: string;
    status: "planned" | "simulated";
    reason: string;
  }[];
  summary: string;
  diagnostics: string[];
  createdAt: string;
};
type ExecutionJobPreviewSummary = {
  previewId: string;
  executionAllowed: boolean;
  executionBlocked: boolean;
  intentOnly: boolean;
  handoffId: string;
  correlationKey: string;
  summary: string;
  jobs: {
    jobId: string;
    jobType: string;
    provider: string;
    environment: string;
    simulatedStatus: "preview_only";
    queueTarget: string;
    workerTarget: string;
    payloadShape: {
      providerId: string;
      operationKind: string;
      siteId: string;
      siteVersionId: string;
      correlationKey: string;
    };
    diagnostics: string[];
  }[];
  diagnostics: string[];
};
type WorkerEnvelopePreviewSummary = {
  previewId: string;
  executionAllowed: boolean;
  executionBlocked: boolean;
  intentOnly: boolean;
  handoffId: string;
  correlationKey: string;
  summary: string;
  envelope: {
    queueTarget: string;
    workerTarget: string;
    payload: {
      payloadVersion: "v1";
      handoffId: string;
      providerId: string;
      operationKind: string;
      environment: string;
      siteId: string;
      siteVersionId: string;
      correlationKey: string;
      executionIntent: "control_plane_simulation_only";
      executionBlocked: true;
      executionAllowed: false;
    };
    diagnostics: string[];
  };
  diagnostics: string[];
};
type ExecutionSafetyManifestSummary = {
  manifestId: string;
  executionAllowed: boolean;
  executionBlocked: boolean;
  overallStatus: "execution_impossible" | "execution_boundary_active";
  summary: string;
  barriers: {
    barrierId: string;
    category: "governance" | "worker" | "queue" | "provider" | "execution" | "security";
    status: "active";
    reason: string;
  }[];
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
  executionPreconditionsLedger?: ExecutionPreconditionsLedgerSummary | null;
  executionRemediationPlan?: ExecutionRemediationPlanSummary | null;
  dryRunJobPlan?: DryRunJobPlanSummary | null;
  executionJobPreview?: ExecutionJobPreviewSummary | null;
  workerEnvelopePreview?: WorkerEnvelopePreviewSummary | null;
  executionSafetyManifest?: ExecutionSafetyManifestSummary | null;
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

function GroupSection(props: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid #cbd5e1", borderRadius: 12, background: "#f8fafc", padding: 14, marginTop: 14 }}>
      <h2 style={{ margin: "0 0 10px 0", fontSize: 17 }}>{props.title}</h2>
      {props.children}
    </section>
  );
}

function Panel(props: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 10 }}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>{props.title}</h3>
      {props.children}
    </section>
  );
}

function CollapsiblePanel(props: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={props.defaultOpen} style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 10 }}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>{props.title}</summary>
      <div style={{ marginTop: 8 }}>{props.children}</div>
    </details>
  );
}

function SummaryCard(props: { title: string; lines: Array<{ label: string; value: string }> }) {
  return (
    <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
      <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>{props.title}</h2>
      {props.lines.map((line) => (
        <Field key={`${props.title}:${line.label}`} label={line.label} value={line.value} />
      ))}
    </section>
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
  const safetyBarrierCount = display.executionSafetyManifest.barriers.length;

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
      <h1 style={{ margin: 0, fontSize: 20 }}>Provider Handoff Readiness Operator Cockpit</h1>
      <p style={{ margin: "8px 0 0 0", color: "#374151", fontWeight: 600 }}>{display.executionBlockedLabel}</p>
      <p style={{ margin: "4px 0 0 0", color: "#4b5563" }}>{display.reviewOnlyLabel}</p>
      <section style={{ position: "sticky", top: 8, zIndex: 10, border: "1px solid #fca5a5", borderRadius: 10, background: "#fee2e2", padding: 12, marginTop: 12 }}>
        <strong>Execution impossible. Control-plane simulation only.</strong>
      </section>

      {fetchError ? (
        <section style={{ border: "1px solid #fecaca", borderRadius: 10, background: "#fff1f2", padding: 12, marginTop: 12 }}>
          <strong>Readiness fetch error:</strong> {redactSecretLikeText(fetchError)}
        </section>
      ) : null}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
        <SummaryCard
          title="Execution State"
          lines={[
            { label: "executionBlocked", value: display.executionBlocked },
            { label: "executionAllowed", value: String(Boolean(display.executionReadinessGate.executionAllowed)) },
            { label: "overall execution state", value: display.executionSafetyManifest.overallStatus },
          ]}
        />
        <SummaryCard
          title="Governance State"
          lines={[
            { label: "review status", value: display.governanceDecisionPackage.reviewStatus },
            { label: "authorization status", value: display.governanceDecisionPackage.authorizationStatus },
            { label: "decision package recommendation", value: display.governanceDecisionPackage.recommendedAction },
          ]}
        />
        <SummaryCard
          title="Readiness State"
          lines={[
            { label: "readinessStatus", value: display.readinessStatus },
            { label: "gateStatus", value: display.executionReadinessGate.gateStatus },
            { label: "preconditions status", value: display.executionPreconditionsLedger.overallStatus },
          ]}
        />
        <SummaryCard
          title="Safety State"
          lines={[
            { label: "execution_impossible", value: String(display.executionSafetyManifest.overallStatus === "execution_impossible") },
            { label: "active barrier count", value: String(safetyBarrierCount) },
          ]}
        />
      </section>

      <GroupSection title="Governance">
        <Panel title="Readiness">
          <Field label="handoffId" value={display.handoffId} />
          <Field label="readinessStatus" value={display.readinessStatus} />
          <Field label="executionBlocked" value={display.executionBlocked} />
          <ListField label="blockedReasons" values={display.blockedReasons} />
          <Field label="nextAllowedAction" value={display.nextAllowedAction} />
          <Field label="correlationKey" value={display.correlationKey} />
          <CollapsiblePanel title="Diagnostics" defaultOpen={false}>
            <ListField label="diagnostics" values={display.diagnostics} />
          </CollapsiblePanel>
        </Panel>

        <Panel title="Decision Package">
        <Field label="packageId" value={redactSecretLikeText(display.governanceDecisionPackage.packageId)} />
        <Field label="recommendedAction" value={redactSecretLikeText(display.governanceDecisionPackage.recommendedAction)} />
        <Field label="executionBlocked" value={String(Boolean(display.governanceDecisionPackage.executionBlocked))} />
        <Field label="reviewStatus" value={redactSecretLikeText(display.governanceDecisionPackage.reviewStatus)} />
        <Field label="authorizationStatus" value={redactSecretLikeText(display.governanceDecisionPackage.authorizationStatus)} />
        <Field label="snapshotCount" value={String(display.governanceDecisionPackage.snapshotCount)} />
        <CollapsiblePanel title="Diagnostics" defaultOpen={false}>
          <ListField label="diagnostics" values={display.governanceDecisionPackage.diagnostics} />
        </CollapsiblePanel>
        </Panel>

        <Panel title="Authorization">
          <p style={{ margin: "0 0 10px 0", color: "#4b5563" }}>Authorization is intent only. Execution remains blocked.</p>
          <GovernanceAuthorizationIntentForm handoffId={model.handoffId} />
          <div style={{ height: 8 }} />
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, background: "#f9fafb" }}>
            <Field label="authorizationStatus" value={redactSecretLikeText(display.governanceAuthorization.authorizationStatus)} />
            <Field label="authorizationReason" value={redactSecretLikeText(display.governanceAuthorization.authorizationReason)} />
            <Field label="intentOnly" value={String(Boolean(display.governanceAuthorization.intentOnly))} />
            <Field label="executionBlocked" value={String(Boolean(display.governanceAuthorization.executionBlocked))} />
            <Field label="createdAt" value={redactSecretLikeText(display.governanceAuthorization.createdAt)} />
            <CollapsiblePanel title="Diagnostics" defaultOpen={false}>
              <ListField label="diagnostics" values={display.governanceAuthorization.diagnostics} />
            </CollapsiblePanel>
          </div>
        </Panel>

        <Panel title="Reviews">
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
        </Panel>

        <CollapsiblePanel title="Timelines" defaultOpen={false}>
          <Panel title="Governance Snapshot">
            <Field label="snapshotId" value={redactSecretLikeText(display.governanceSnapshot.snapshotId)} />
            <Field label="handoffId" value={redactSecretLikeText(display.governanceSnapshot.handoffId)} />
            <Field label="readinessStatus" value={redactSecretLikeText(display.governanceSnapshot.readinessStatus)} />
            <Field label="executionBlocked" value={String(Boolean(display.governanceSnapshot.executionBlocked))} />
            <Field label="correlationKey" value={redactSecretLikeText(display.governanceSnapshot.correlationKey)} />
            <Field label="createdAt" value={redactSecretLikeText(display.governanceSnapshot.createdAt)} />
            <Field label="reviewSummaryStatus" value={redactSecretLikeText(display.governanceSnapshot.reviewSummaryStatus)} />
            <ListField label="diagnostics" values={display.governanceSnapshot.diagnostics} />
          </Panel>
          <Panel title="Governance Timeline">
            {display.governanceTimeline.length > 0 ? (
              display.governanceTimeline.map((snapshot) => (
                <div key={snapshot.snapshotId} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, background: "#f9fafb" }}>
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
          </Panel>
        </CollapsiblePanel>
      </GroupSection>

      <GroupSection title="Execution Analysis">
        <Panel title="Execution Readiness Gate">
          <Field label="gateStatus" value={redactSecretLikeText(display.executionReadinessGate.gateStatus)} />
          <Field label="executionAllowed" value={String(Boolean(display.executionReadinessGate.executionAllowed))} />
          <Field label="executionBlocked" value={String(Boolean(display.executionReadinessGate.executionBlocked))} />
          <ListField label="blockingReasons" values={display.executionReadinessGate.blockingReasons} />
          <CollapsiblePanel title="Diagnostics" defaultOpen={false}>
            <ListField label="diagnostics" values={display.executionReadinessGate.diagnostics} />
          </CollapsiblePanel>
          {display.executionReadinessGate.requiredConditions.length > 0 ? (
            display.executionReadinessGate.requiredConditions.map((condition) => (
              <div key={`${condition.condition}:${condition.status}`} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, background: "#f9fafb" }}>
                <Field label="condition" value={redactSecretLikeText(condition.condition)} />
                <Field label="status" value={redactSecretLikeText(condition.status)} />
                <Field label="reason" value={redactSecretLikeText(condition.reason)} />
              </div>
            ))
          ) : (
            <p style={{ margin: 0, color: "#6b7280" }}>No required conditions available.</p>
          )}
        </Panel>

        <Panel title="Execution Preconditions Ledger">
          <Field label="overallStatus" value={redactSecretLikeText(display.executionPreconditionsLedger.overallStatus)} />
          <Field label="executionAllowed" value={String(Boolean(display.executionPreconditionsLedger.executionAllowed))} />
          <Field label="executionBlocked" value={String(Boolean(display.executionPreconditionsLedger.executionBlocked))} />
          <ListField
            label="missingRequirements"
            values={display.executionPreconditionsLedger.missingRequirements.map((requirement) => `${requirement.requirementId}:${requirement.status}`)}
          />
          <ListField
            label="blockedRequirements"
            values={display.executionPreconditionsLedger.blockedRequirements.map((requirement) => `${requirement.requirementId}:${requirement.status}`)}
          />
          <CollapsiblePanel title="Diagnostics" defaultOpen={false}>
            <ListField label="diagnostics" values={display.executionPreconditionsLedger.diagnostics} />
          </CollapsiblePanel>
          {display.executionPreconditionsLedger.requirements.length > 0 ? (
            display.executionPreconditionsLedger.requirements.map((requirement) => (
              <div key={requirement.requirementId} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, background: "#f9fafb" }}>
                <Field label="requirementId" value={redactSecretLikeText(requirement.requirementId)} />
                <Field label="category" value={redactSecretLikeText(requirement.category)} />
                <Field label="name" value={redactSecretLikeText(requirement.name)} />
                <Field label="status" value={redactSecretLikeText(requirement.status)} />
                <Field label="reason" value={redactSecretLikeText(requirement.reason)} />
              </div>
            ))
          ) : (
            <p style={{ margin: 0, color: "#6b7280" }}>No precondition requirements available.</p>
          )}
        </Panel>

        <Panel title="Execution Remediation Plan">
          <Field label="overallStatus" value={redactSecretLikeText(display.executionRemediationPlan.overallStatus)} />
          <Field label="summary" value={redactSecretLikeText(display.executionRemediationPlan.summary)} />
          <CollapsiblePanel title="Diagnostics" defaultOpen={false}>
            <ListField label="diagnostics" values={display.executionRemediationPlan.diagnostics} />
          </CollapsiblePanel>
          {display.executionRemediationPlan.actions.length > 0 ? (
            display.executionRemediationPlan.actions.map((action) => (
              <div key={action.actionId} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, background: "#f9fafb" }}>
                <Field label="priority" value={redactSecretLikeText(action.priority)} />
                <Field label="source" value={redactSecretLikeText(action.source)} />
                <Field label="reason" value={redactSecretLikeText(action.reason)} />
                <Field label="recommendedAction" value={redactSecretLikeText(action.recommendedAction)} />
              </div>
            ))
          ) : (
            <p style={{ margin: 0, color: "#6b7280" }}>No remediation actions required.</p>
          )}
        </Panel>
      </GroupSection>

      <GroupSection title="Execution Simulation">
        <Panel title="Dry-run Job Plan">
          <Field label="jobCount" value={String(display.dryRunJobPlan.jobCount)} />
          <Field label="summary" value={redactSecretLikeText(display.dryRunJobPlan.summary)} />
          <CollapsiblePanel title="Diagnostics" defaultOpen={false}>
            <ListField label="diagnostics" values={display.dryRunJobPlan.diagnostics} />
          </CollapsiblePanel>
          {display.dryRunJobPlan.jobs.length > 0 ? (
            display.dryRunJobPlan.jobs.map((job) => (
              <div key={job.jobId} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, background: "#f9fafb" }}>
                <Field label="jobType" value={redactSecretLikeText(job.jobType)} />
                <Field label="provider" value={redactSecretLikeText(job.provider)} />
                <Field label="environment" value={redactSecretLikeText(job.environment)} />
                <Field label="status" value={redactSecretLikeText(job.status)} />
                <Field label="reason" value={redactSecretLikeText(job.reason)} />
              </div>
            ))
          ) : (
            <p style={{ margin: 0, color: "#6b7280" }}>No dry-run jobs available.</p>
          )}
        </Panel>

        <Panel title="Execution Job Preview">
        <Field label="jobCount" value={String(display.executionJobPreview.jobs.length)} />
        <Field label="summary" value={redactSecretLikeText(display.executionJobPreview.summary)} />
        {display.executionJobPreview.jobs.length > 0 ? (
          display.executionJobPreview.jobs.map((job) => (
            <div
              key={job.jobId}
              style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, background: "#f9fafb" }}
            >
              <Field label="jobType" value={redactSecretLikeText(job.jobType)} />
              <Field label="provider" value={redactSecretLikeText(job.provider)} />
              <Field label="environment" value={redactSecretLikeText(job.environment)} />
              <Field label="queueTarget" value={redactSecretLikeText(job.queueTarget)} />
              <Field label="workerTarget" value={redactSecretLikeText(job.workerTarget)} />
              <Field label="simulatedStatus" value={redactSecretLikeText(job.simulatedStatus)} />
              <Field
                label="payloadShape"
                value={JSON.stringify({
                  providerId: job.payloadShape.providerId,
                  operationKind: job.payloadShape.operationKind,
                  siteId: job.payloadShape.siteId,
                  siteVersionId: job.payloadShape.siteVersionId,
                  correlationKey: job.payloadShape.correlationKey,
                })}
              />
              <ListField label="diagnostics" values={job.diagnostics} />
            </div>
          ))
        ) : (
          <p style={{ margin: 0, color: "#6b7280" }}>No execution job previews available.</p>
        )}
        </Panel>

        <Panel title="Provider Worker Envelope Preview">
        <Field label="summary" value={redactSecretLikeText(display.workerEnvelopePreview.summary)} />
        <Field label="queueTarget" value={redactSecretLikeText(display.workerEnvelopePreview.envelope.queueTarget)} />
        <Field label="workerTarget" value={redactSecretLikeText(display.workerEnvelopePreview.envelope.workerTarget)} />
        <Field label="payloadVersion" value={redactSecretLikeText(display.workerEnvelopePreview.envelope.payload.payloadVersion)} />
        <Field
          label="payload"
          value={JSON.stringify({
            payloadVersion: display.workerEnvelopePreview.envelope.payload.payloadVersion,
            handoffId: display.workerEnvelopePreview.envelope.payload.handoffId,
            providerId: display.workerEnvelopePreview.envelope.payload.providerId,
            operationKind: display.workerEnvelopePreview.envelope.payload.operationKind,
            environment: display.workerEnvelopePreview.envelope.payload.environment,
            siteId: display.workerEnvelopePreview.envelope.payload.siteId,
            siteVersionId: display.workerEnvelopePreview.envelope.payload.siteVersionId,
            correlationKey: display.workerEnvelopePreview.envelope.payload.correlationKey,
            executionIntent: display.workerEnvelopePreview.envelope.payload.executionIntent,
            executionBlocked: display.workerEnvelopePreview.envelope.payload.executionBlocked,
            executionAllowed: display.workerEnvelopePreview.envelope.payload.executionAllowed,
          })}
        />
        <CollapsiblePanel title="Payload JSON Blocks" defaultOpen={false}>
          <ListField label="diagnostics" values={display.workerEnvelopePreview.diagnostics} />
        </CollapsiblePanel>
        </Panel>
      </GroupSection>

      <GroupSection title="Safety">
        <Panel title="Provider Execution Safety Manifest">
        <Field label="overallStatus" value={redactSecretLikeText(display.executionSafetyManifest.overallStatus)} />
        <Field label="summary" value={redactSecretLikeText(display.executionSafetyManifest.summary)} />
        <CollapsiblePanel title="Diagnostics" defaultOpen={false}>
          <ListField label="diagnostics" values={display.executionSafetyManifest.diagnostics} />
        </CollapsiblePanel>
        {display.executionSafetyManifest.barriers.length > 0 ? (
          display.executionSafetyManifest.barriers.map((barrier) => (
            <div
              key={barrier.barrierId}
              style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 8, background: "#f9fafb" }}
            >
              <Field label="barrierId" value={redactSecretLikeText(barrier.barrierId)} />
              <Field label="category" value={redactSecretLikeText(barrier.category)} />
              <Field label="status" value={redactSecretLikeText(barrier.status)} />
              <Field label="reason" value={redactSecretLikeText(barrier.reason)} />
            </div>
          ))
        ) : (
          <p style={{ margin: 0, color: "#6b7280" }}>No execution safety barriers available.</p>
        )}
        </Panel>

        <CollapsiblePanel title="Payload JSON Blocks" defaultOpen={false}>
          <Panel title="handoffArtifact summary">
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
          </Panel>
          <Panel title="workerPickupEvidence summary">
        <Field label="providerRef" value={redactSecretLikeText(evidence.providerRef)} />
        <Field label="approvalStatus" value={redactSecretLikeText(evidence.approvalStatus)} />
        <Field label="readinessStatus" value={redactSecretLikeText(evidence.readinessStatus)} />
        <Field label="executionBlocked" value={String(Boolean(evidence.executionBlocked))} />
        <Field label="nextAllowedAction" value={redactSecretLikeText(evidence.nextAllowedAction)} />
        <ListField label="jobRefs" values={evidence.jobRefs} />
        <ListField label="blockedReasons" values={evidence.blockedReasons} />
        <ListField label="diagnostics" values={evidence.diagnostics} />
          </Panel>
        </CollapsiblePanel>
      </GroupSection>
    </main>
  );
}
