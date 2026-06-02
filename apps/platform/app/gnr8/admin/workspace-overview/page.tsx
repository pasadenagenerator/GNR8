import Link from "next/link";
import { buildWorkspaceOverviewModel } from "./model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CARD_STYLE = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 12,
  backgroundColor: "#ffffff",
} as const;

export default async function WorkspaceOverviewPage() {
  const model = await buildWorkspaceOverviewModel();

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px", fontFamily: "ui-sans-serif, system-ui" }}>
      <header>
        <h1 style={{ margin: 0 }}>Website OS Planning Console</h1>
        <p style={{ marginTop: 6, color: "#4b5563" }}>Operator Workspace Console · Read-only Runtime Preview</p>
      </header>

      <section style={{ marginTop: 20 }}>
        <h2 style={{ marginBottom: 10 }}>Workspace Snapshot</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Planning State</h3>
            <p style={{ margin: 0 }}>{model.overview.status}</p>
          </article>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Scope</h3>
            <p style={{ margin: 0 }}>{model.overview.environmentScope}</p>
          </article>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Workspace Version</h3>
            <p style={{ margin: 0 }}>{model.overview.siteVersionId}</p>
          </article>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Snapshot Updated</h3>
            <p style={{ margin: 0 }}>{model.overview.lastUpdated}</p>
          </article>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <div style={{ display: "grid", gap: 10 }}>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Content</h3>
            <p style={{ margin: 0 }}>{model.overview.contentSummary}</p>
          </article>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Design</h3>
            <p style={{ margin: 0 }}>{model.overview.designSummary}</p>
          </article>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Experience</h3>
            <p style={{ margin: 0 }}>{model.overview.experienceSummary}</p>
          </article>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Governance</h3>
            <p style={{ margin: 0 }}>{model.overview.governanceSummary}</p>
          </article>
          <article style={CARD_STYLE}>
            <h3 style={{ marginTop: 0, marginBottom: 6 }}>Operations</h3>
            <p style={{ margin: 0 }}>{model.overview.operationalSummary}</p>
          </article>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Planning Candidates</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {model.proposalCandidates.map((proposal) => (
            <article key={proposal.proposalId} style={CARD_STYLE}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{proposal.title}</h3>
              <p style={{ marginTop: 0, marginBottom: 4 }}>status: {proposal.status}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>executionState: {proposal.executionState}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>optimizationRank: {proposal.optimizationRank}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>optimizationScore: {proposal.optimizationScore}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>priority: {proposal.priority}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>expectedImpact: {proposal.expectedImpact}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>expectedEffort: {proposal.expectedEffort}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>risk: {proposal.risk}</p>
              <p style={{ marginTop: 0, marginBottom: 6 }}>
                <strong>Summary:</strong> {proposal.summary}
              </p>
              <p style={{ margin: 0, color: "#4b5563" }}>
                <strong>Reason:</strong> {proposal.reason}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Governance Review Preview</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {model.approvalPreviews.map((preview) => (
            <article key={preview.previewId} style={CARD_STYLE}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{preview.proposalTitle}</h3>
              <p style={{ marginTop: 0, marginBottom: 4 }}>currentState: {preview.currentState}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>requiredApprovals: {preview.requiredApprovals}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>governanceState: {preview.governanceState}</p>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Permissions</strong></p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>executionPermission: {String(preview.executionPermission)}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>mutationPermission: {String(preview.mutationPermission)}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>publishingPermission: {String(preview.publishingPermission)}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>providerPermission: {String(preview.providerPermission)}</p>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Governance State Path</strong></p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>
                proposal_candidate {"\u2192"} approval_review {"\u2192"} approved {"\u2192"} execution_plan {"\u2192"} execution_blocked
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Summary</strong></p>
              <p style={{ margin: 0 }}>{preview.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Approval Records</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {model.proposalApprovalRecords.map((record) => (
            <article key={record.approvalId} style={CARD_STYLE}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{record.proposalTitle}</h3>
              <p style={{ marginTop: 0, marginBottom: 4 }}>approvalStatus: {record.approvalStatus}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>decision: {record.decision}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>requiredApprovals: {record.requiredApprovals}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>receivedApprovals: {record.receivedApprovals}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>approvalComplete: {String(record.approvalComplete)}</p>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Permissions</strong></p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>executionAllowed: {String(record.executionAllowed)}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>mutationAllowed: {String(record.mutationAllowed)}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>publishingAllowed: {String(record.publishingAllowed)}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>
                providerExecutionAllowed: {String(record.providerExecutionAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Governance</strong></p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>governanceState: {record.governanceState}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Summary</strong></p>
              <p style={{ margin: 0 }}>{record.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Approval States</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {model.approvalStates.map((record) => (
            <article key={record.approvalId} style={CARD_STYLE}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{record.proposalTitle}</h3>
              <p style={{ marginTop: 0, marginBottom: 4 }}>approvalState: {record.approvalState}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>requiredApprovals: {record.requiredApprovals}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>receivedApprovals: {record.receivedApprovals}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>approvalComplete: {String(record.approvalComplete)}</p>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Permissions</strong></p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>executionAllowed: {String(record.executionAllowed)}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>mutationAllowed: {String(record.mutationAllowed)}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>publishingAllowed: {String(record.publishingAllowed)}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>
                providerExecutionAllowed: {String(record.providerExecutionAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Governance</strong></p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>governanceState: {record.governanceState}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Summary</strong></p>
              <p style={{ margin: 0 }}>{record.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Approval Queue</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {model.approvalQueueItems.map((queueItem) => (
            <article key={queueItem.queueId} style={CARD_STYLE}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{queueItem.proposalTitle}</h3>
              <p style={{ marginTop: 0, marginBottom: 4 }}>queueRank: {queueItem.queueRank}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>queuePriority: {queueItem.queuePriority}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>optimizationScore: {queueItem.optimizationScore}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>approvalState: {queueItem.approvalState}</p>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Permissions</strong></p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>executionAllowed: {String(queueItem.executionAllowed)}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>mutationAllowed: {String(queueItem.mutationAllowed)}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>publishingAllowed: {String(queueItem.publishingAllowed)}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>
                providerExecutionAllowed: {String(queueItem.providerExecutionAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Governance</strong></p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>governanceState: {queueItem.governanceState}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Summary</strong></p>
              <p style={{ margin: 0 }}>{queueItem.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Execution Readiness</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {model.executionReadinessRecords.map((record) => (
            <article key={record.readinessId} style={CARD_STYLE}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{record.proposalTitle}</h3>
              <p style={{ marginTop: 0, marginBottom: 4 }}>readinessState: {record.readinessState}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>readinessScore: {record.readinessScore}</p>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Requirements Met</strong></p>
              <ul style={{ marginTop: 0, marginBottom: 8 }}>
                {record.requirementsMet.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Requirements Missing</strong></p>
              <ul style={{ marginTop: 0, marginBottom: 8 }}>
                {record.requirementsMissing.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Governance</strong></p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>governanceState: {record.governanceState}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Summary</strong></p>
              <p style={{ margin: 0 }}>{record.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Execution Package Preview</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {model.executionPackagePreviews.map((preview) => (
            <article key={preview.packageId} style={CARD_STYLE}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{preview.proposalTitle}</h3>
              <p style={{ marginTop: 0, marginBottom: 4 }}>packageState: {preview.packageState}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>readinessState: {preview.readinessState}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>readinessScore: {preview.readinessScore}</p>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Included Plans</strong></p>
              <ul style={{ marginTop: 0, marginBottom: 8 }}>
                {preview.includedPlans.map((includedPlan) => (
                  <li key={includedPlan}>{includedPlan}</li>
                ))}
              </ul>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Included Artifacts</strong></p>
              <ul style={{ marginTop: 0, marginBottom: 8 }}>
                {preview.includedArtifacts.map((includedArtifact) => (
                  <li key={includedArtifact}>{includedArtifact}</li>
                ))}
              </ul>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Governance</strong></p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>governanceState: {preview.governanceState}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Summary</strong></p>
              <p style={{ margin: 0 }}>{preview.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Execution Package Readiness</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {model.executionPackageReadinessRecords.map((readinessRecord) => (
            <article key={readinessRecord.packageId} style={CARD_STYLE}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{readinessRecord.proposalTitle}</h3>
              <p style={{ marginTop: 0, marginBottom: 4 }}>readinessState: {readinessRecord.readinessState}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>readinessScore: {readinessRecord.readinessScore}</p>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Requirements Met</strong></p>
              <ul style={{ marginTop: 0, marginBottom: 8 }}>
                {readinessRecord.requirementsMet.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Requirements Missing</strong></p>
              <ul style={{ marginTop: 0, marginBottom: 8 }}>
                {readinessRecord.requirementsMissing.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Governance</strong></p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>
                executionAllowed: {String(readinessRecord.executionAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>
                mutationAllowed: {String(readinessRecord.mutationAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>
                publishingAllowed: {String(readinessRecord.publishingAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>
                providerExecutionAllowed: {String(readinessRecord.providerExecutionAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>governanceState: {readinessRecord.governanceState}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Summary</strong></p>
              <p style={{ margin: 0 }}>{readinessRecord.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Execution Contract Preview</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {model.executionContractPreviews.map((contractPreview) => (
            <article key={contractPreview.contractPreviewId} style={CARD_STYLE}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{contractPreview.proposalTitle}</h3>
              <p style={{ marginTop: 0, marginBottom: 4 }}>
                contractPreviewState: {contractPreview.contractPreviewState}
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>readinessState: {contractPreview.readinessState}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>readinessScore: {contractPreview.readinessScore}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>contractType: {contractPreview.contractType}</p>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Contract Scope</strong></p>
              <ul style={{ marginTop: 0, marginBottom: 8 }}>
                {contractPreview.contractScope.map((scope) => (
                  <li key={scope}>{scope}</li>
                ))}
              </ul>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Required Inputs</strong></p>
              <ul style={{ marginTop: 0, marginBottom: 8 }}>
                {contractPreview.requiredInputs.map((requiredInput) => (
                  <li key={requiredInput}>{requiredInput}</li>
                ))}
              </ul>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Blocked Reasons</strong></p>
              <ul style={{ marginTop: 0, marginBottom: 8 }}>
                {contractPreview.blockedReasons.map((blockedReason) => (
                  <li key={blockedReason}>{blockedReason}</li>
                ))}
              </ul>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Governance</strong></p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>
                executionAllowed: {String(contractPreview.executionAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>
                mutationAllowed: {String(contractPreview.mutationAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>
                publishingAllowed: {String(contractPreview.publishingAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>
                providerExecutionAllowed: {String(contractPreview.providerExecutionAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>governanceState: {contractPreview.governanceState}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Summary</strong></p>
              <p style={{ margin: 0 }}>{contractPreview.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Execution Contract Readiness</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {model.executionContractReadinessRecords.map((readinessRecord) => (
            <article key={readinessRecord.contractPreviewId} style={CARD_STYLE}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{readinessRecord.proposalTitle}</h3>
              <p style={{ marginTop: 0, marginBottom: 4 }}>readinessState: {readinessRecord.readinessState}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>readinessScore: {readinessRecord.readinessScore}</p>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Requirements Met</strong></p>
              <ul style={{ marginTop: 0, marginBottom: 8 }}>
                {readinessRecord.requirementsMet.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Requirements Missing</strong></p>
              <ul style={{ marginTop: 0, marginBottom: 8 }}>
                {readinessRecord.requirementsMissing.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Governance</strong></p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>
                executionAllowed: {String(readinessRecord.executionAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>
                mutationAllowed: {String(readinessRecord.mutationAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>
                publishingAllowed: {String(readinessRecord.publishingAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>
                providerExecutionAllowed: {String(readinessRecord.providerExecutionAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>governanceState: {readinessRecord.governanceState}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Summary</strong></p>
              <p style={{ margin: 0 }}>{readinessRecord.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Execution Plan Preview</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {model.executionPlanPreviews.map((preview) => (
            <article key={preview.planId} style={CARD_STYLE}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{preview.proposalTitle}</h3>
              <p style={{ marginTop: 0, marginBottom: 4 }}>executionState: {preview.executionState}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>governanceState: {preview.governanceState}</p>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Execution Gates</strong></p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>executionBlocked: {String(preview.executionBlocked)}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>
                providerExecutionAllowed: {String(preview.providerExecutionAllowed)}
              </p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>publishingAllowed: {String(preview.publishingAllowed)}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>mutationAllowed: {String(preview.mutationAllowed)}</p>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Planned Actions</strong></p>
              <ul style={{ marginTop: 0, marginBottom: 8 }}>
                {preview.plannedActions.map((plannedAction) => (
                  <li key={plannedAction}>{plannedAction}</li>
                ))}
              </ul>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Summary</strong></p>
              <p style={{ margin: 0 }}>{preview.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Execution Artifact Preview</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {model.executionArtifactPreviews.map((preview) => (
            <article key={preview.artifactId} style={CARD_STYLE}>
              <h3 style={{ marginTop: 0, marginBottom: 6 }}>{preview.proposalTitle}</h3>
              <p style={{ marginTop: 0, marginBottom: 4 }}>artifactType: {preview.artifactType}</p>
              <p style={{ marginTop: 0, marginBottom: 4 }}>executionState: {preview.executionState}</p>
              <p style={{ marginTop: 0, marginBottom: 8 }}>governanceState: {preview.governanceState}</p>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Affected Areas</strong></p>
              <ul style={{ marginTop: 0, marginBottom: 8 }}>
                {preview.affectedAreas.map((area) => (
                  <li key={area}>{area}</li>
                ))}
              </ul>
              <p style={{ marginTop: 0, marginBottom: 6 }}><strong>Planned Outputs</strong></p>
              <ul style={{ marginTop: 0, marginBottom: 8 }}>
                {preview.plannedOutputs.map((plannedOutput) => (
                  <li key={plannedOutput}>{plannedOutput}</li>
                ))}
              </ul>
              <p style={{ marginTop: 0, marginBottom: 4 }}><strong>Summary</strong></p>
              <p style={{ margin: 0 }}>{preview.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Opportunity Ranking</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {model.optimizationScores.map((score) => {
            const opportunity = model.optimizationOpportunities.find((entry) => entry.opportunityId === score.opportunityId);
            return (
              <article key={score.opportunityId} style={CARD_STYLE}>
                <p style={{ marginTop: 0, marginBottom: 6 }}>
                  <strong>#{score.rank}</strong> {opportunity?.title ?? score.opportunityId}
                </p>
                <p style={{ marginTop: 0, marginBottom: 6 }}>totalScore: {score.totalScore}</p>
                <p style={{ margin: 0, color: "#4b5563" }}>
                  impact / effort / confidence: {score.impactScore} / {score.effortScore} / {score.confidenceScore}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Operator Navigation Surfaces</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <article style={CARD_STYLE}>
            <Link href="/gnr8/admin/twin-preview">Twin Preview</Link>
          </article>
          <article style={CARD_STYLE}>
            <Link href="/gnr8/admin/twin-preview-real">Real Site Twin Preview</Link>
          </article>
          <article style={CARD_STYLE}>
            <Link href="/gnr8/admin/providers">Provider Governance Cockpit</Link>
          </article>
        </div>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Provider Governance Snapshot</h2>
        <article style={CARD_STYLE}>
          <p style={{ margin: 0 }}><strong>Provider Governance State</strong></p>
          <p style={{ marginTop: 8, marginBottom: 0 }}>Execution Layer: Blocked</p>
          <p style={{ marginTop: 6, marginBottom: 0 }}>Governance State: Preview / non-executable</p>
        </article>
      </section>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ marginBottom: 10 }}>Operational Boundaries</h2>
        <p style={{ margin: 0 }}>Read-only Planning Console Preview</p>
        <p style={{ marginTop: 6, marginBottom: 0 }}>No editing available.</p>
        <p style={{ marginTop: 6, marginBottom: 0 }}>No AI actions available.</p>
        <p style={{ marginTop: 6, marginBottom: 0 }}>No publishing available.</p>
      </section>

      <section style={{ marginTop: 16 }}>
        <details>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Runtime Evidence & Diagnostics</summary>
          <div style={{ marginTop: 10 }}>
            <h3 style={{ marginBottom: 8 }}>Observations</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {model.observations.map((observation) => (
                <article key={observation.observationId} style={CARD_STYLE}>
                  <p style={{ marginTop: 0, marginBottom: 6 }}><strong>{observation.severity}</strong></p>
                  <h4 style={{ marginTop: 0, marginBottom: 6 }}>{observation.title}</h4>
                  <p style={{ margin: 0 }}>{observation.summary}</p>
                </article>
              ))}
            </div>

            <h3 style={{ marginTop: 12, marginBottom: 8 }}>Insights</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {model.insights.map((insight) => (
                <article key={insight.insightId} style={CARD_STYLE}>
                  <p style={{ marginTop: 0, marginBottom: 6 }}><strong>{insight.severity}</strong></p>
                  <h4 style={{ marginTop: 0, marginBottom: 6 }}>{insight.title}</h4>
                  <p style={{ margin: 0 }}>{insight.summary}</p>
                  <p style={{ marginTop: 8, marginBottom: 0, color: "#4b5563" }}>
                    Supporting observations: {insight.supportingObservations.length}
                  </p>
                </article>
              ))}
            </div>

            <h3 style={{ marginTop: 12, marginBottom: 8 }}>Recommendations</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {model.recommendations.map((recommendation) => (
                <article key={recommendation.recommendationId} style={CARD_STYLE}>
                  <p style={{ marginTop: 0, marginBottom: 6 }}><strong>{recommendation.priority}</strong></p>
                  <h4 style={{ marginTop: 0, marginBottom: 6 }}>{recommendation.title}</h4>
                  <p style={{ margin: 0 }}>{recommendation.summary}</p>
                  <p style={{ marginTop: 8, marginBottom: 0, color: "#4b5563" }}>
                    Supporting insights: {recommendation.supportingInsights.length}
                  </p>
                </article>
              ))}
            </div>

            <h3 style={{ marginTop: 12, marginBottom: 8 }}>Optimization Opportunities</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {model.optimizationOpportunities.map((opportunity) => (
                <article key={opportunity.opportunityId} style={CARD_STYLE}>
                  <p style={{ marginTop: 0, marginBottom: 6 }}>
                    <strong>{opportunity.priority}</strong>
                  </p>
                  <h4 style={{ marginTop: 0, marginBottom: 6 }}>{opportunity.title}</h4>
                  <p style={{ margin: 0 }}>{opportunity.summary}</p>
                  <p style={{ marginTop: 8, marginBottom: 0, color: "#4b5563" }}>
                    impact={opportunity.impact}; effort={opportunity.effort}
                  </p>
                  <p style={{ marginTop: 6, marginBottom: 0, color: "#4b5563" }}>
                    Supporting recommendations: {opportunity.supportingRecommendations.length}
                  </p>
                </article>
              ))}
            </div>

            <h3 style={{ marginTop: 12, marginBottom: 8 }}>Diagnostics</h3>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Twin Source</h3>
            <p style={{ marginTop: 0 }}>
              {model.sourceId ?? "No imported site available."} → buildWebsiteDigitalTwin() → InMemoryTwinStore → createTwinOverview()
            </p>

            <h3 style={{ marginBottom: 8 }}>Diagnostics List</h3>
            <ul>
              {model.diagnostics.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>

            <h3 style={{ marginBottom: 8 }}>Import Source Diagnostics</h3>
            <dl>
              <dt>selectedSource</dt>
              <dd>{model.importSourceDiagnostics.selectedSource}</dd>
              <dt>stableArtifactPath</dt>
              <dd>{model.importSourceDiagnostics.stableArtifactPath ?? "n/a"}</dd>
              <dt>importedUrlSnapshotDirectory</dt>
              <dd>{model.importSourceDiagnostics.importedUrlSnapshotDirectory ?? "n/a"}</dd>
              <dt>importedUrlSnapshotCount</dt>
              <dd>{model.importSourceDiagnostics.importedUrlSnapshotCount}</dd>
              <dt>fallbackReason</dt>
              <dd>{model.importSourceDiagnostics.fallbackReason ?? "n/a"}</dd>
              <dt>persistedEvidenceChecked</dt>
              <dd>{String(model.importSourceDiagnostics.persistedEvidenceChecked)}</dd>
              <dt>persistedEvidenceAvailable</dt>
              <dd>{String(model.importSourceDiagnostics.persistedEvidenceAvailable)}</dd>
              <dt>persistedEvidenceSelected</dt>
              <dd>{String(model.importSourceDiagnostics.persistedEvidenceSelected)}</dd>
              <dt>persistedEvidenceReason</dt>
              <dd>{model.importSourceDiagnostics.persistedEvidenceReason ?? "n/a"}</dd>
              <dt>persistedEvidenceSiteVersionId</dt>
              <dd>{model.importSourceDiagnostics.persistedEvidenceSiteVersionId ?? "n/a"}</dd>
              <dt>persistedEvidenceImportId</dt>
              <dd>{model.importSourceDiagnostics.persistedEvidenceImportId ?? "n/a"}</dd>
              <dt>persistedEvidenceShapeStatus</dt>
              <dd>{model.importSourceDiagnostics.persistedEvidenceShapeStatus}</dd>
              <dt>persistedEvidenceMissingFields</dt>
              <dd>
                {model.importSourceDiagnostics.persistedEvidenceMissingFields.length > 0
                  ? model.importSourceDiagnostics.persistedEvidenceMissingFields.join(", ")
                  : "n/a"}
              </dd>
              <dt>persistedEvidenceAvailableFields</dt>
              <dd>
                {model.importSourceDiagnostics.persistedEvidenceAvailableFields.length > 0
                  ? model.importSourceDiagnostics.persistedEvidenceAvailableFields.join(", ")
                  : "n/a"}
              </dd>
              <dt>persistedEvidenceSourceKind</dt>
              <dd>{model.importSourceDiagnostics.persistedEvidenceSourceKind ?? "n/a"}</dd>
            </dl>

            <h3 style={{ marginBottom: 8 }}>Persisted Evidence Diagnostics</h3>
            <p style={{ marginTop: 0, marginBottom: 8 }}>
              selected={String(model.importSourceDiagnostics.persistedEvidenceSelected)}; status=
              {model.importSourceDiagnostics.persistedEvidenceShapeStatus}; reason=
              {model.importSourceDiagnostics.persistedEvidenceReason ?? "n/a"}
            </p>

            <h3 style={{ marginBottom: 8 }}>Branch Diagnostics</h3>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {Object.entries(model.importSourceDiagnostics.persistedEvidenceBranchDiagnostics).map(([branch, diagnostic]) => (
                <li key={branch}>
                  {branch}: present={String(diagnostic.present)}; type={diagnostic.type}
                  {diagnostic.keys.length > 0 ? `; keys=${diagnostic.keys.join(",")}` : ""}
                  {diagnostic.itemCount != null ? `; itemCount=${diagnostic.itemCount}` : ""}
                </li>
              ))}
            </ul>
          </div>
        </details>
      </section>
    </main>
  );
}
