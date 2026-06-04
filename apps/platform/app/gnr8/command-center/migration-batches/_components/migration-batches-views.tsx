import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import {
  formatMigrationBatchDuration,
  formatMigrationBatchTimestamp,
  type MigrationBatchDetailPageViewModel,
  type MigrationBatchDetailViewModel,
  type MigrationBatchListPageViewModel,
  type MigrationBatchStatus,
} from "../../_lib/migration-batches-view-model";
import { MigrationBatchControls } from "./migration-batch-controls";

function badgeStyle(status: MigrationBatchStatus): CSSProperties {
  if (status === "completed") return { color: "#166534", background: "#dcfce7", border: "1px solid #86efac" };
  if (status === "running") return { color: "#1d4ed8", background: "#dbeafe", border: "1px solid #93c5fd" };
  if (status === "failed" || status === "partially_failed") return { color: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5" };
  if (status === "paused") return { color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d" };
  if (status === "queued") return { color: "#6b21a8", background: "#f3e8ff", border: "1px solid #d8b4fe" };
  return { color: "#374151", background: "#f3f4f6", border: "1px solid #d1d5db" };
}

function StatusBadge(props: { status: MigrationBatchStatus }) {
  return (
    <span
      style={{
        ...badgeStyle(props.status),
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "3px 8px",
        fontSize: 12,
        fontWeight: 800,
      }}
    >
      {props.status}
    </span>
  );
}

function Section(props: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section style={{ border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
      <header style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>{props.title}</h2>
        {props.actions}
      </header>
      {props.children}
    </section>
  );
}

function StatGrid(props: { children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
      {props.children}
    </div>
  );
}

function Stat(props: { label: string; value: ReactNode; tone?: "default" | "success" | "danger" | "warning" }) {
  const tones = {
    default: { border: "#dbe2ea", background: "#fff", color: "#0f172a", label: "#64748b" },
    success: { border: "#bbf7d0", background: "#f0fdf4", color: "#166534", label: "#166534" },
    danger: { border: "#fecaca", background: "#fff1f2", color: "#991b1b", label: "#991b1b" },
    warning: { border: "#fcd34d", background: "#fffbeb", color: "#92400e", label: "#92400e" },
  }[props.tone ?? "default"];
  return (
    <article style={{ border: `1px solid ${tones.border}`, borderRadius: 10, background: tones.background, padding: 12 }}>
      <div style={{ fontSize: 12, color: tones.label }}>{props.label}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: tones.color }}>{props.value}</div>
    </article>
  );
}

function EmptyOrList(props: { values: string[] }) {
  if (props.values.length === 0) return <span>None</span>;
  return <span>{props.values.join(", ")}</span>;
}

export function MigrationBatchListView(props: { model: MigrationBatchListPageViewModel }) {
  return (
    <>
      <section style={{ border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
        <header style={{ display: "grid", gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>Migration Batches</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>
            Durable migration batch visibility for operator inspection and manual run controls.
          </p>
        </header>
        {props.model.fetchError ? (
          <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: "#991b1b" }}>{props.model.fetchError}</p>
        ) : null}
      </section>

      <section style={{ marginTop: 12, border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 13, color: "#374151", marginBottom: 12 }}>
          <span>
            <strong>Batches:</strong> {props.model.batches.length}
          </span>
        </div>
        {props.model.batches.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>No durable migration batches are available yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "#475569", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "8px" }}>Batch</th>
                  <th style={{ padding: "8px" }}>Status</th>
                  <th style={{ padding: "8px" }}>Progress</th>
                  <th style={{ padding: "8px" }}>Total Jobs</th>
                  <th style={{ padding: "8px" }}>Completed</th>
                  <th style={{ padding: "8px" }}>Failed</th>
                  <th style={{ padding: "8px" }}>Latest Event</th>
                  <th style={{ padding: "8px" }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {props.model.batches.map((batch) => (
                  <tr key={batch.batchId} style={{ borderBottom: "1px solid #eef2f7" }}>
                    <td style={{ padding: "8px", minWidth: 220 }}>
                      <Link href={batch.href} style={{ color: "#1d4ed8", fontWeight: 800, textDecoration: "none" }}>
                        {batch.name}
                      </Link>
                      <div style={{ marginTop: 3, fontSize: 11, color: "#64748b" }}>{batch.batchId}</div>
                    </td>
                    <td style={{ padding: "8px" }}><StatusBadge status={batch.status} /></td>
                    <td style={{ padding: "8px", fontWeight: 800 }}>{batch.progressPercent}%</td>
                    <td style={{ padding: "8px" }}>{batch.totalJobs}</td>
                    <td style={{ padding: "8px" }}>{batch.completedJobs}</td>
                    <td style={{ padding: "8px", color: batch.failedJobs > 0 ? "#991b1b" : "#374151", fontWeight: 700 }}>
                      {batch.failedJobs}
                    </td>
                    <td style={{ padding: "8px" }}>{formatMigrationBatchTimestamp(batch.latestEventAt)}</td>
                    <td style={{ padding: "8px" }}>{formatMigrationBatchTimestamp(batch.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function DetailHeader(props: { batch: MigrationBatchDetailViewModel; fetchError: string | null; showControls: boolean }) {
  return (
    <section style={{ border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
      <Link href="/gnr8/command-center/migration-batches" style={{ color: "#1d4ed8", fontSize: 13, textDecoration: "none" }}>
        Back to migration batches
      </Link>
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>{props.batch.name}</h1>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 13, color: "#64748b" }}>
            <StatusBadge status={props.batch.status} />
            <span>{props.batch.batchId}</span>
          </div>
          {props.batch.description ? <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>{props.batch.description}</p> : null}
          {props.fetchError ? <p style={{ margin: 0, fontSize: 13, color: "#92400e" }}>{props.fetchError}</p> : null}
        </div>
        {props.showControls ? (
          <MigrationBatchControls batchId={props.batch.batchId} runEndpoint={props.batch.runEndpoint} resumeEndpoint={props.batch.resumeEndpoint} />
        ) : null}
      </div>
    </section>
  );
}

export function MigrationBatchDetailView(props: { model: MigrationBatchDetailPageViewModel; showControls?: boolean }) {
  const batch = props.model.batch;
  if (!batch) {
    return (
      <section style={{ border: "1px solid #fecaca", background: "#fff1f2", borderRadius: 12, padding: 14 }}>
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 24, color: "#991b1b" }}>Migration Batch Unavailable</h1>
        <p style={{ margin: 0, fontSize: 14, color: "#7f1d1d" }}>{props.model.fetchError ?? "Unable to load migration batch."}</p>
      </section>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <DetailHeader batch={batch} fetchError={props.model.fetchError} showControls={props.showControls ?? true} />

      <Section title="Summary">
        <StatGrid>
          <Stat label="Progress" value={`${batch.summary.progressPercent}%`} />
          <Stat label="Total Jobs" value={batch.summary.totalJobs} />
          <Stat label="Completed Jobs" value={batch.summary.completedJobs} tone="success" />
          <Stat label="Failed Jobs" value={batch.summary.failedJobs} tone={batch.summary.failedJobs > 0 ? "danger" : "default"} />
          <Stat label="Success Rate" value={`${batch.summary.successRate}%`} />
          <Stat label="Latest Event" value={formatMigrationBatchTimestamp(batch.summary.latestEventAt)} />
        </StatGrid>
        <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: 13, color: "#374151" }}>
          <div><strong>First failure:</strong> {batch.summary.firstFailureJobId ?? "None"} {batch.summary.firstFailureReason ? `- ${batch.summary.firstFailureReason}` : ""}</div>
          <div><strong>Last executed job:</strong> {batch.summary.lastExecutedJobId ?? "None"}</div>
          <div><strong>Last completed job:</strong> {batch.summary.lastCompletedJobId ?? "None"}</div>
          <div><strong>Generated:</strong> {formatMigrationBatchTimestamp(batch.generatedAt)}</div>
        </div>
      </Section>

      <Section title="Diagnostics">
        <StatGrid>
          <Stat label="Execution Count" value={batch.diagnostics.executionCount} />
          <Stat label="Run Attempts" value={batch.diagnostics.runAttempts} />
          <Stat label="Last Run" value={formatMigrationBatchTimestamp(batch.diagnostics.lastRunStartedAt)} />
          <Stat label="Duration" value={formatMigrationBatchDuration(batch.diagnostics.lastExecutionDurationMs)} />
          <Stat label="Runnable Jobs" value={batch.diagnostics.currentlyRunnableJobs.length} />
          <Stat label="Blocked Jobs" value={batch.diagnostics.blockedJobs.length} tone={batch.diagnostics.blockedJobs.length > 0 ? "warning" : "default"} />
        </StatGrid>
        <div style={{ marginTop: 12, display: "grid", gap: 6, fontSize: 13, color: "#374151" }}>
          <div><strong>Runnable:</strong> <EmptyOrList values={batch.diagnostics.currentlyRunnableJobs} /></div>
          <div><strong>Blocked:</strong> <EmptyOrList values={batch.diagnostics.blockedJobs} /></div>
          <div><strong>Completed:</strong> <EmptyOrList values={batch.diagnostics.completedJobs} /></div>
        </div>
      </Section>

      <Section title="Failures">
        {batch.failures.failures.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>No failed jobs are reported for this batch.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>
              <strong>Latest failure:</strong> {batch.failures.latestFailure?.jobId ?? "None"} {batch.failures.latestFailure?.latestReason ? `- ${batch.failures.latestFailure.latestReason}` : ""}
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#475569", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "8px" }}>Job</th>
                    <th style={{ padding: "8px" }}>Count</th>
                    <th style={{ padding: "8px" }}>Latest Failure</th>
                    <th style={{ padding: "8px" }}>Stage</th>
                    <th style={{ padding: "8px" }}>Reasons</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.failures.failures.map((failure) => (
                    <tr key={failure.jobId} style={{ borderBottom: "1px solid #eef2f7" }}>
                      <td style={{ padding: "8px", fontWeight: 800 }}>{failure.jobId}</td>
                      <td style={{ padding: "8px" }}>{failure.count}</td>
                      <td style={{ padding: "8px" }}>{formatMigrationBatchTimestamp(failure.latestAt)}</td>
                      <td style={{ padding: "8px" }}>{failure.latestStage ?? "Unknown"}</td>
                      <td style={{ padding: "8px" }}>
                        <EmptyOrList values={batch.failures.failureReasons[failure.jobId] ?? []} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Section>

      <Section title="Timeline">
        {batch.timeline.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>No batch execution events are available.</p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8 }}>
            {batch.timeline.map((entry, index) => (
              <li key={`${entry.timestamp}-${entry.eventType}-${entry.jobId}-${index}`} style={{ fontSize: 13, color: "#374151" }}>
                <div style={{ fontWeight: 800, color: "#111827" }}>{entry.eventType}</div>
                <div>{formatMigrationBatchTimestamp(entry.timestamp)} {entry.jobId ? `| ${entry.jobId}` : ""}</div>
                <div>{entry.message || "No message recorded."}</div>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
