"use client";

import type {
  SingleSitePublishOperatorActionAttemptProjection,
  SingleSitePublishOperatorDrilldownRow,
  SingleSitePublishOperatorReadonlyProjection,
  SingleSitePublishOperatorRunbookEntry,
  SingleSitePublishOperatorRunbookSeverity,
} from "@/gnr8/single-site/single-site-publish-operator-readonly-projection";
import React, { useMemo, useState, type ChangeEvent, type ReactNode } from "react";

type Props = {
  model: SingleSitePublishOperatorReadonlyProjection;
};

function text(value: unknown): string {
  const normalized = String(value ?? "").trim();
  return normalized || "-";
}

function labelize(value: string): string {
  return value.replaceAll("_", " ");
}

function badge(value: string, tone: "neutral" | "good" | "warn" | "bad" = "neutral") {
  const palette = {
    neutral: { border: "#d1d5db", background: "#f8fafc", color: "#334155" },
    good: { border: "#bbf7d0", background: "#f0fdf4", color: "#166534" },
    warn: { border: "#fed7aa", background: "#fff7ed", color: "#9a3412" },
    bad: { border: "#fecaca", background: "#fff1f2", color: "#991b1b" },
  }[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        maxWidth: "100%",
        alignItems: "center",
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
        padding: "4px 8px",
        background: palette.background,
        color: palette.color,
        fontSize: 12,
        fontWeight: 800,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
      title={value}
    >
      {labelize(value)}
    </span>
  );
}

function statusTone(value: string): "neutral" | "good" | "warn" | "bad" {
  const normalized = value.toLowerCase();
  if (normalized.includes("completed") || normalized.includes("ready") || normalized.includes("available")) return "good";
  if (normalized.includes("blocked") || normalized.includes("failed") || normalized.includes("missing")) return "bad";
  if (normalized.includes("pending") || normalized.includes("waiting") || normalized.includes("unknown")) return "warn";
  return "neutral";
}

function severityTone(value: SingleSitePublishOperatorRunbookSeverity): "neutral" | "good" | "warn" | "bad" {
  if (value === "critical" || value === "blocked") return "bad";
  if (value === "warning") return "warn";
  return "neutral";
}

function section(title: string, children: ReactNode) {
  return (
    <section style={{ border: "1px solid #dbe2ea", borderRadius: 10, background: "#fff", padding: 14 }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 18, color: "#0f172a" }}>{title}</h2>
      {children}
    </section>
  );
}

function runbookEntriesBySeverityAndSource(entries: readonly SingleSitePublishOperatorRunbookEntry[]) {
  const groups = new Map<string, SingleSitePublishOperatorRunbookEntry[]>();
  entries.forEach((entry) => {
    const key = `${entry.severity}:${entry.sourceOwner}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  });
  return [...groups.entries()].map(([key, groupEntries]) => {
    const [severity, sourceOwner] = key.split(":");
    return { severity: severity as SingleSitePublishOperatorRunbookSeverity, sourceOwner, entries: groupEntries };
  });
}

function diagnosticRunbook(model: SingleSitePublishOperatorReadonlyProjection) {
  const groups = runbookEntriesBySeverityAndSource(model.runbookEntries);
  const top = model.runbookSummary.topBlockingReason;

  return (
    <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
      <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
        {field("Total Entries", model.runbookSummary.totalEntries)}
        {field("Blocking Entries", model.runbookSummary.blockingEntries)}
        {field("Stale Entries", model.runbookSummary.staleEntries)}
        {field("Missing Entries", model.runbookSummary.missingEntries)}
        {field("Conflict Entries", model.runbookSummary.conflictEntries)}
      </dl>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <strong>Severity counts:</strong>
          <div>{countList(model.runbookSummary.severityCounts)}</div>
        </div>
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <strong>Source owner counts:</strong>
          <div>{countList(model.runbookSummary.sourceOwnerCounts)}</div>
        </div>
        <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <strong>Inspection order:</strong>
          <div>{codeList(model.runbookSummary.recommendedInspectionOrder, "No blocking or warning sources")}</div>
        </div>
      </div>
      {top ? (
        <div style={{ border: "1px solid #fecaca", borderRadius: 8, background: "#fff1f2", padding: 10, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
            {badge(top.severity, severityTone(top.severity))}
            {badge(top.sourceOwner)}
            <code style={{ overflowWrap: "anywhere", fontSize: 12 }}>{top.code}</code>
          </div>
          <div style={{ fontWeight: 800, color: "#991b1b", overflowWrap: "anywhere" }}>{top.title}</div>
          <div style={{ marginTop: 4, color: "#334155", overflowWrap: "anywhere" }}>{top.safeNextInspectionHint}</div>
        </div>
      ) : (
        <div style={{ border: "1px solid #bbf7d0", borderRadius: 8, background: "#f0fdf4", padding: 10, color: "#166534" }}>
          No blocking runbook reason is active.
        </div>
      )}
      {groups.length === 0 ? (
        <p style={{ margin: 0, color: "#64748b" }}>No diagnostic runbook entries are active for this projection.</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {groups.map((group) => (
            <div key={`${group.severity}:${group.sourceOwner}`} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                {badge(group.severity, severityTone(group.severity))}
                {badge(group.sourceOwner)}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {group.entries.map((entry) => (
                  <div key={entry.code} style={{ borderTop: "1px solid #f1f5f9", paddingTop: 8, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "start" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900, color: "#0f172a", overflowWrap: "anywhere" }}>{entry.title}</div>
                        <code style={{ display: "block", marginTop: 2, color: "#475569", fontSize: 12, overflowWrap: "anywhere" }}>{entry.code}</code>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        {entry.blocking ? badge("blocking", "bad") : badge("non_blocking")}
                        {entry.stale ? badge("stale", "warn") : null}
                        {entry.missing ? badge("missing", "bad") : null}
                        {entry.conflict ? badge("conflict", "bad") : null}
                        {badge("read_only", "good")}
                        {badge("no_action")}
                      </div>
                    </div>
                    <div style={{ marginTop: 6, color: "#334155", overflowWrap: "anywhere" }}>{entry.diagnosticExplanation}</div>
                    <div style={{ marginTop: 4, color: "#0f172a", overflowWrap: "anywhere" }}><strong>Inspect:</strong> {entry.safeNextInspectionHint}</div>
                    <div style={{ marginTop: 4 }}><strong>Upstream:</strong> <code>{text(entry.requiredUpstreamSource)}</code></div>
                    <div style={{ marginTop: 4 }}><strong>Safe refs:</strong> {codeList(entry.relatedSafeRefs)}</div>
                    <div style={{ marginTop: 4 }}><strong>Safe codes:</strong> {codeList(entry.relatedSafeCodes)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function field(label: string, value: unknown) {
  const rendered = text(value);
  return (
    <div style={{ minWidth: 0 }}>
      <dt style={{ marginBottom: 4, fontSize: 12, color: "#64748b" }}>{label}</dt>
      <dd
        style={{
          margin: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          color: "#111827",
          fontFamily: "monospace",
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
        title={rendered}
      >
        {rendered}
      </dd>
    </div>
  );
}

function codeList(values: readonly string[], empty = "None") {
  if (values.length === 0) return <span style={{ color: "#64748b" }}>{empty}</span>;
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      {values.map((value) => (
        <code
          key={value}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            background: "#f8fafc",
            padding: "2px 6px",
            color: "#111827",
            fontSize: 12,
          }}
          title={value}
        >
          {value}
        </code>
      ))}
    </span>
  );
}

function countList(values: readonly { key: string; count: number }[], empty = "None") {
  if (values.length === 0) return <span style={{ color: "#64748b" }}>{empty}</span>;
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
      {values.map((value) => (
        <code
          key={value.key}
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            background: "#f8fafc",
            padding: "2px 6px",
            color: "#111827",
            fontSize: 12,
          }}
          title={`${value.key}:${value.count}`}
        >
          {value.key}:{value.count}
        </code>
      ))}
    </span>
  );
}

function boundaryText(boundary: { ownership: string; truthRole: string; enforcing: false; mutating: false }) {
  return `${boundary.ownership}; ${boundary.truthRole}; non-enforcing; non-mutating`;
}

function statusBadges(values: readonly string[], empty: string) {
  if (values.length === 0) return badge(empty, "good");
  return <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>{values.map((value) => badge(value, statusTone(value)))}</span>;
}

function attemptSummary(title: string, attempt: SingleSitePublishOperatorActionAttemptProjection | null) {
  if (!attempt) {
    return (
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#0f172a" }}>{title}</h3>
        <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>No persisted attempt is available for this lookup.</p>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "start" }}>
        <h3 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>{title}</h3>
        {badge(attempt.status, statusTone(attempt.status))}
      </div>
      <dl style={{ margin: "10px 0 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        {field("Result", attempt.resultStatus)}
        {field("Wrapper", attempt.wrapperStatus)}
        {field("Resolver", attempt.resolverStatus)}
        {field("Publish Orchestrator", attempt.publishOrchestratorStatus)}
        {field("Started", attempt.startedAt)}
        {field("Completed", attempt.completedAt)}
        {field("Actor", `${attempt.actor.actorRole}:${attempt.actor.actorId}`)}
        {field("Correlation", attempt.correlationId)}
        {field("Idempotency", attempt.idempotencyKey)}
      </dl>
      <div style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 13 }}>
        <div>
          <strong>Blockers:</strong> {codeList(attempt.blockerCodes)}
        </div>
        <div>
          <strong>Warnings:</strong> {codeList(attempt.warningCodes)}
        </div>
        <div>
          <strong>Limitations:</strong> {codeList(attempt.limitationCodes)}
        </div>
        <div>
          <strong>Persisted result flags:</strong>{" "}
          {[
            `publishes:${String(attempt.persistedMutationFlags.publishes)}`,
            `runtimeMutation:${String(attempt.persistedMutationFlags.runtimeMutation)}`,
            `blockingEnforcementApplied:${String(attempt.persistedMutationFlags.blockingEnforcementApplied)}`,
            `publishMayHaveExecuted:${String(attempt.persistedMutationFlags.publishMayHaveExecuted)}`,
          ].join("  ")}
        </div>
        <div>
          <strong>Diagnostics:</strong>{" "}
          {attempt.redactedDiagnosticSummary.available
            ? `${text(attempt.redactedDiagnosticSummary.status)} ${attempt.redactedDiagnosticSummary.reasonCodes.join(", ") || ""}`.trim()
            : "No redacted diagnostics recorded."}
          {attempt.redactedDiagnosticSummary.omittedUnsafeDiagnostics ? " Unsafe diagnostics omitted." : ""}
        </div>
      </div>
    </div>
  );
}

function normalizedSearch(value: string): string {
  return value.trim().toLowerCase();
}

function rowMatchesSearch(row: SingleSitePublishOperatorDrilldownRow, query: string): boolean {
  if (!query) return true;
  return [row.id, row.group, row.label, row.status, row.freshnessStatus, row.severity, row.category, row.code, row.ref, row.watermark, row.summary]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(query));
}

function rowMatchesStatus(row: SingleSitePublishOperatorDrilldownRow, filter: string): boolean {
  if (filter === "blockers") return row.group === "blocked" || row.status.toLowerCase().includes("blocked") || row.severity?.toLowerCase().includes("p1") === true;
  if (filter === "stale") return row.group === "stale" || row.status.toLowerCase().includes("stale") || row.freshnessStatus?.toLowerCase().includes("stale") === true;
  if (filter === "missing") return row.group === "missing" || row.status.toLowerCase().includes("missing");
  return true;
}

export function filterSingleSitePublishOperatorDrilldownRows(
  rows: readonly SingleSitePublishOperatorDrilldownRow[],
  input: { rowFilter?: string; search?: string },
): SingleSitePublishOperatorDrilldownRow[] {
  const query = normalizedSearch(input.search ?? "");
  return rows.filter((row) => rowMatchesStatus(row, input.rowFilter ?? "all") && rowMatchesSearch(row, query));
}

export function filterSingleSitePublishOperatorTimelineRows(
  attempts: readonly SingleSitePublishOperatorActionAttemptProjection[],
  input: { mode?: string; sort?: string; search?: string },
): SingleSitePublishOperatorActionAttemptProjection[] {
  const query = normalizedSearch(input.search ?? "");
  const mode = input.mode ?? "all";
  const sort = input.sort ?? "newest";
  const rows = attempts
    .filter((attempt) => mode === "all" || attempt.mode === mode)
    .filter((attempt) => {
      if (!query) return true;
      return [
        attempt.actionId,
        attempt.mode,
        attempt.status,
        attempt.resultStatus,
        attempt.wrapperStatus,
        attempt.resolverStatus,
        attempt.correlationId,
        attempt.idempotencyKey,
        attempt.candidateSiteVersionRef,
        attempt.runtimeArtifactRef,
        attempt.publishTargetRef,
        ...attempt.blockerCodes,
        ...attempt.warningCodes,
        ...attempt.limitationCodes,
      ].some((value) => String(value).toLowerCase().includes(query));
    });
  return rows.sort((left, right) => {
    const compared = left.updatedAt.localeCompare(right.updatedAt);
    return sort === "oldest" ? compared : -compared;
  });
}

function drilldownTable(rows: readonly SingleSitePublishOperatorDrilldownRow[], empty: string) {
  if (rows.length === 0) {
    return <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{empty}</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#475569", textAlign: "left" }}>
            <th style={{ padding: "8px 6px" }}>Group</th>
            <th style={{ padding: "8px 6px" }}>Label</th>
            <th style={{ padding: "8px 6px" }}>Status</th>
            <th style={{ padding: "8px 6px" }}>Freshness</th>
            <th style={{ padding: "8px 6px" }}>Code</th>
            <th style={{ padding: "8px 6px" }}>Ref / Watermark</th>
            <th style={{ padding: "8px 6px" }}>Summary</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "8px 6px" }}>{badge(row.group, statusTone(row.group))}</td>
              <td style={{ padding: "8px 6px", fontFamily: "monospace", overflowWrap: "anywhere" }}>{row.label}</td>
              <td style={{ padding: "8px 6px" }}>{badge(row.status, statusTone(row.status))}</td>
              <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>{text(row.freshnessStatus)}</td>
              <td style={{ padding: "8px 6px", fontFamily: "monospace", overflowWrap: "anywhere" }}>{text(row.code)}</td>
              <td style={{ padding: "8px 6px", fontFamily: "monospace", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={[row.ref, row.watermark].filter(Boolean).join(" / ")}>
                {[row.ref, row.watermark].filter(Boolean).join(" / ") || "-"}
              </td>
              <td style={{ padding: "8px 6px", color: "#334155", overflowWrap: "anywhere" }}>{row.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function timeline(attempts: readonly SingleSitePublishOperatorActionAttemptProjection[]) {
  if (attempts.length === 0) {
    return <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>No audit attempts match this lookup.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 860 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#475569", textAlign: "left" }}>
            <th style={{ padding: "8px 6px" }}>Updated</th>
            <th style={{ padding: "8px 6px" }}>Mode</th>
            <th style={{ padding: "8px 6px" }}>Status</th>
            <th style={{ padding: "8px 6px" }}>Result</th>
            <th style={{ padding: "8px 6px" }}>Actor</th>
            <th style={{ padding: "8px 6px" }}>Correlation</th>
            <th style={{ padding: "8px 6px" }}>Idempotency</th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((attempt) => (
            <tr key={attempt.actionId} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{attempt.updatedAt}</td>
              <td style={{ padding: "8px 6px" }}>{badge(attempt.mode)}</td>
              <td style={{ padding: "8px 6px" }}>{badge(attempt.status, statusTone(attempt.status))}</td>
              <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>{attempt.resultStatus}</td>
              <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>{attempt.actor.actorRole}</td>
              <td style={{ padding: "8px 6px", fontFamily: "monospace", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={attempt.correlationId}>
                {attempt.correlationId}
              </td>
              <td style={{ padding: "8px 6px", fontFamily: "monospace", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={attempt.idempotencyKey}>
                {attempt.idempotencyKey}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SingleSitePublishOperatorPanel({ model }: Props) {
  const [rowFilter, setRowFilter] = useState("all");
  const [timelineMode, setTimelineMode] = useState("all");
  const [timelineSort, setTimelineSort] = useState("newest");
  const [search, setSearch] = useState("");
  const query = normalizedSearch(search);
  const diagnosticRows = useMemo(
    () =>
      filterSingleSitePublishOperatorDrilldownRows([
        ...model.launchReadiness.dimensionDrilldown,
        ...model.gateHandoffEvaluation.conflictDetails,
        ...model.metadataResolver.detailRows,
        ...model.operatorAudit.timelineSummaries,
      ], { rowFilter, search }),
    [model, rowFilter, query],
  );
  const filteredTimeline = useMemo(() => {
    return filterSingleSitePublishOperatorTimelineRows(model.timeline, { mode: timelineMode, sort: timelineSort, search });
  }, [model.timeline, query, timelineMode, timelineSort]);
  const onRowFilterChange = (event: ChangeEvent<HTMLSelectElement>) => setRowFilter(event.target.value);
  const onTimelineModeChange = (event: ChangeEvent<HTMLSelectElement>) => setTimelineMode(event.target.value);
  const onTimelineSortChange = (event: ChangeEvent<HTMLSelectElement>) => setTimelineSort(event.target.value);
  const onSearchChange = (event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ border: "1px solid #dbe2ea", borderRadius: 10, background: "#fff", padding: 14 }}>
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, color: "#0f172a" }}>Single-Site Publish Operator Panel</h1>
            <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 13 }}>
              Internal Command Center read-only projection over governed publish status and MVP-57 operator audit records.
            </p>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {badge("read_only", "good")}
            {badge(`state_${model.state}`, statusTone(model.state))}
            {badge(`next_${model.nextAction}`, statusTone(model.nextAction))}
          </div>
        </div>
        <dl style={{ margin: "12px 0 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          {field("Generated", model.generatedAt)}
          {field("Lookup Migration", model.lookup.migrationId)}
          {field("Lookup Site", model.lookup.siteId)}
          {field("Lookup Candidate", model.lookup.candidateSiteVersionRef)}
          {field("Readiness", model.readinessState)}
          {field("Panel Version", model.panelVersion)}
        </dl>
      </section>

      {model.state === "lookup_required" ? (
        section(
          "Lookup Required",
          <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>
            Provide `migrationId`, `siteId`, or `candidateSiteVersionRef` in the URL query to load the read-only projection.
          </p>,
        )
      ) : null}

      {model.state === "empty" ? (
        section(
          "No Audit Records",
          <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>
            No MVP-57 dry-run or shadow-publish audit attempts match this lookup. Recommended next action: {model.nextAction}.
          </p>,
        )
      ) : null}

      {section(
        "Display Filters",
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, fontSize: 13 }}>
          <label style={{ display: "grid", gap: 4, color: "#475569" }}>
            Row status
            <select value={rowFilter} onChange={onRowFilterChange} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 8px", color: "#111827", background: "#fff" }}>
              <option value="all">Show all</option>
              <option value="blockers">Blockers only</option>
              <option value="stale">Stale only</option>
              <option value="missing">Missing only</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 4, color: "#475569" }}>
            Timeline mode
            <select value={timelineMode} onChange={onTimelineModeChange} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 8px", color: "#111827", background: "#fff" }}>
              <option value="all">All attempts</option>
              <option value="dry_run">Dry-run only</option>
              <option value="shadow_publish">Shadow-publish only</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 4, color: "#475569" }}>
            Timeline sort
            <select value={timelineSort} onChange={onTimelineSortChange} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 8px", color: "#111827", background: "#fff" }}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 4, color: "#475569" }}>
            Safe ref/code search
            <input value={search} onChange={onSearchChange} placeholder="Filter visible refs and codes" style={{ width: "100%", boxSizing: "border-box", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px", color: "#111827" }} />
          </label>
        </div>,
      )}

      {section(
        "Read-Only Boundary",
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          {field("publishes", String(model.flags.publishes))}
          {field("runtimeMutation", String(model.flags.runtimeMutation))}
          {field("enforcementApplied", String(model.flags.enforcementApplied))}
          {field("createsAafRecords", String(model.flags.createsAafRecords))}
          {field("createsGateAttempt", String(model.flags.createsGateAttempt))}
          {field("evaluatesGate", String(model.flags.evaluatesGate))}
          {field("pasrInvoked", String(model.flags.pasrInvoked))}
          {field("createsDdomSnapshots", String(model.flags.createsDdomSnapshots))}
          {field("providerCalls", String(model.flags.providerCalls))}
        </dl>,
      )}

      {section(
        "Identity And Target",
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
          {field("Tenant", model.identity.tenantId)}
          {field("Client", model.identity.clientId)}
          {field("Site", model.identity.siteId)}
          {field("Migration", model.identity.migrationId)}
          {field("Candidate Version", model.publishContext.candidateSiteVersionRef)}
          {field("Runtime Artifact", model.publishContext.runtimeArtifactRef)}
          {field("Publish Target", model.publishContext.publishTargetRef)}
          {field("Stage", model.publishContext.publishStage)}
          {field("Environment", model.publishContext.publishEnvironment)}
        </dl>,
      )}

      {section(
        "Governed Publish Chain",
        <div style={{ display: "grid", gap: 12 }}>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
            {field("Launch Readiness Ref", model.governedPublishChain.launchReadinessEvidence.ref)}
            {field("Launch Readiness Status", model.governedPublishChain.launchReadinessEvidence.status)}
            {field("Activation Request Ref", model.governedPublishChain.publishActivationRequest.ref)}
            {field("Activation Request Status", model.governedPublishChain.publishActivationRequest.status)}
            {field("Activation Decision Ref", model.governedPublishChain.publishActivationDecision.ref)}
            {field("Activation Decision Status", model.governedPublishChain.publishActivationDecision.status)}
            {field("Gate Result Ref", model.governedPublishChain.gateResult.ref)}
            {field("Gate Result Status", model.governedPublishChain.gateResult.status)}
            {field("Handoff Watermark", model.governedPublishChain.handoffWatermark)}
            {field("Gate Input Watermark", model.governedPublishChain.gateInputWatermark)}
          </dl>
        </div>,
      )}

      {section("Diagnostics Runbook", diagnosticRunbook(model))}

      {section(
        "Launch Readiness",
        <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {badge(model.launchReadiness.status, statusTone(model.launchReadiness.status))}
            {badge(`freshness_${model.launchReadiness.freshnessStatus}`, statusTone(model.launchReadiness.freshnessStatus))}
            {model.launchReadiness.flags.ready ? badge("ready", "good") : null}
            {model.launchReadiness.flags.readyWithLimitations ? badge("ready_with_limitations", "warn") : null}
            {model.launchReadiness.flags.blocked ? badge("blocked", "bad") : null}
            {model.launchReadiness.flags.stale ? badge("stale", "bad") : null}
            {model.launchReadiness.flags.missing ? badge("missing", "bad") : null}
          </div>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
            {field("Boundary", boundaryText(model.launchReadiness.boundary))}
            {field("Readiness Record", model.launchReadiness.recordRef)}
            {field("Source Watermark", model.launchReadiness.sourceWatermark)}
            {field("Evidence Package", model.launchReadiness.evidencePackageRef)}
            {field("Evidence Status", model.launchReadiness.evidencePackageStatus)}
            {field("Evidence Watermark", model.launchReadiness.evidenceWatermark)}
          </dl>
          <div><strong>Required missing dimensions:</strong> {codeList(model.launchReadiness.requiredMissingDimensions, "None")}</div>
          <div><strong>Stale dimensions:</strong> {codeList(model.launchReadiness.staleDimensions, "None")}</div>
          <div><strong>Blocked dimensions:</strong> {codeList(model.launchReadiness.blockedDimensions, "None")}</div>
          <div><strong>Ready dimensions:</strong> {codeList(model.launchReadiness.dimensionGroups.ready, "None")}</div>
          <div><strong>Optional dimensions:</strong> {codeList(model.launchReadiness.dimensionGroups.optional, "None")}</div>
          <div><strong>Blocker count by severity:</strong> {countList(model.launchReadiness.blockerCountBySeverity)}</div>
          <div><strong>Blocker count by category:</strong> {countList(model.launchReadiness.blockerCountByCategory)}</div>
          <div><strong>Accepted limitations:</strong> {codeList(model.launchReadiness.acceptedLimitations, "None")}</div>
          {model.launchReadiness.flags.missing ? <div style={{ color: "#9a3412" }}>No launch readiness record is available for this lookup.</div> : null}
          {model.launchReadiness.dimensionDrilldown.length === 0 ? <div style={{ color: "#64748b" }}>No launch readiness dimension rows are available.</div> : null}
          {drilldownTable(
            model.launchReadiness.dimensionDrilldown.filter((row) => rowMatchesStatus(row, rowFilter) && rowMatchesSearch(row, query)),
            "No launch readiness dimensions match the current filters.",
          )}
          {model.launchReadiness.openBlockers.length === 0 ? (
            <div style={{ color: "#64748b" }}>No open launch readiness blockers are available.</div>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {model.launchReadiness.openBlockers.map((blocker, index) => (
                <div key={`${blocker.severity}:${blocker.category}:${index}`} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                    {badge(blocker.severity, statusTone(blocker.severity))}
                    {badge(blocker.category)}
                    {badge(blocker.status, statusTone(blocker.status))}
                  </div>
                  <div style={{ overflowWrap: "anywhere", color: "#334155" }}>{blocker.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>,
      )}

      {section(
        "Publish Activation",
        <div style={{ display: "grid", gap: 12 }}>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
            {field("Request Boundary", boundaryText(model.publishActivationRequest.boundary))}
            {field("Request Ref", model.publishActivationRequest.ref)}
            {field("Request Status", model.publishActivationRequest.status)}
            {field("Request Scope", model.publishActivationRequest.scope)}
            {field("Request Action", model.publishActivationRequest.action)}
            {field("Request Subject", `${text(model.publishActivationRequest.subjectType)}:${text(model.publishActivationRequest.subjectId)}`)}
            {field("Linked Evidence", model.publishActivationRequest.linkedLaunchReadinessEvidenceRef)}
            {field("Requested Expiration", model.publishActivationRequest.policyMetadata.requestedExpiresAt)}
            {field("Policy Version", model.publishActivationRequest.policyMetadata.policyVersion)}
            {field("Policy Evaluation", model.publishActivationRequest.policyMetadata.policyEvaluationId)}
            {field("Decision Boundary", boundaryText(model.publishActivationDecision.boundary))}
            {field("Decision Ref", model.publishActivationDecision.ref)}
            {field("Decision Status", model.publishActivationDecision.status)}
            {field("Decision Projection", model.publishActivationDecision.projection)}
            {field("Expires", model.publishActivationDecision.expiresAt)}
          </dl>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {model.publishActivationDecision.granted ? badge("granted", "good") : null}
            {model.publishActivationDecision.grantedWithLimitations ? badge("granted_with_limitations", "warn") : null}
            {model.publishActivationDecision.rejected ? badge("rejected", "bad") : null}
            {model.publishActivationDecision.invalid ? badge("invalid", "bad") : null}
            {model.publishActivationDecision.revoked ? badge("revoked", "bad") : null}
            {model.publishActivationDecision.superseded ? badge("superseded", "warn") : null}
            {model.publishActivationDecision.expired ? badge("expired", "bad") : null}
          </div>
          {!model.publishActivationRequest.id ? <div style={{ color: "#9a3412", fontSize: 13 }}>No publish activation request is available.</div> : null}
          {!model.publishActivationDecision.id ? <div style={{ color: "#9a3412", fontSize: 13 }}>No publish activation decision is available.</div> : null}
          <div><strong>Request evidence refs:</strong> {codeList(model.publishActivationRequest.evidenceRefs, "None")}</div>
          <div><strong>Decision evidence refs:</strong> {codeList(model.publishActivationDecision.evidenceRefs, "None")}</div>
          <div><strong>Decision limitations:</strong> {codeList(model.publishActivationDecision.limitations, "None")}</div>
          <div><strong>Decision indicators:</strong> {codeList(model.publishActivationDecision.indicators, "None")}</div>
        </div>,
      )}

      {section(
        "Gate Handoff",
        <div style={{ display: "grid", gap: 12 }}>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
            {field("Gate Boundary", boundaryText(model.gateHandoffEvaluation.boundary))}
            {field("Handoff Readiness", model.gateHandoffEvaluation.handoffReadinessStatus)}
            {field("Handoff Watermark", model.gateHandoffEvaluation.handoffWatermark)}
            {field("Gate Input Watermark", model.gateHandoffEvaluation.gateInputWatermark)}
            {field("Gate Result Ref", model.gateHandoffEvaluation.gateResultRef)}
            {field("Gate Result Status", model.gateHandoffEvaluation.gateResultStatus)}
          </dl>
          {!model.gateHandoffEvaluation.gateResultId ? <div style={{ color: "#9a3412", fontSize: 13 }}>No gate attempt is available.</div> : null}
          <div><strong>Gate blockers:</strong> {codeList(model.gateHandoffEvaluation.gateBlockers, "None")}</div>
          <div><strong>Gate warnings:</strong> {codeList(model.gateHandoffEvaluation.gateWarnings, "None")}</div>
          <div><strong>Gate mismatches:</strong> {codeList(model.gateHandoffEvaluation.mismatchIndicators, "None")}</div>
          <div><strong>Gate conflict:</strong> {statusBadges(model.gateHandoffEvaluation.newerConflict ? ["newer_conflict"] : [], "no_newer_conflict")}</div>
          {drilldownTable(
            model.gateHandoffEvaluation.conflictDetails.filter((row) => rowMatchesStatus(row, rowFilter) && rowMatchesSearch(row, query)),
            "No gate conflicts or mismatches match the current filters.",
          )}
        </div>,
      )}

      {section(
        "Metadata Resolver",
        <div style={{ display: "grid", gap: 12 }}>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
            {field("Metadata Boundary", boundaryText(model.metadataResolver.boundary))}
            {field("Metadata Completeness", model.metadataResolver.completenessStatus)}
          </dl>
          {model.metadataResolver.completenessStatus !== "complete" ? <div style={{ color: "#9a3412", fontSize: 13 }}>Metadata is incomplete for this lookup.</div> : null}
          <div><strong>Missing metadata:</strong> {codeList(model.metadataResolver.missingMetadataCodes, "None")}</div>
          <div><strong>Expected/resolved mismatches:</strong> {codeList(model.metadataResolver.expectedResolvedMismatchCodes, "None")}</div>
          <div><strong>Resolver-safe diagnostics:</strong> {codeList(model.metadataResolver.safeDiagnostics, "None")}</div>
          {drilldownTable(
            model.metadataResolver.detailRows.filter((row) => rowMatchesStatus(row, rowFilter) && rowMatchesSearch(row, query)),
            "No metadata diagnostics match the current filters.",
          )}
        </div>,
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
        {attemptSummary("Latest Dry-Run", model.latestDryRun)}
        {attemptSummary("Latest Shadow-Publish", model.latestShadowPublish)}
      </div>

      {section(
        "Blockers And Limitations",
        <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
          <div>
            <strong>Blockers:</strong> {codeList(model.blockerCodes)}
          </div>
          <div>
            <strong>Warnings:</strong> {codeList(model.warningCodes)}
          </div>
          <div>
            <strong>Limitations:</strong> {codeList(model.limitationCodes)}
          </div>
          <div>
            <strong>Stale or missing metadata:</strong> {codeList(model.staleOrMissingMetadataIndicators)}
          </div>
          <div>
            <strong>Recommended next operator action:</strong> <code>{model.nextAction}</code>
          </div>
        </div>,
      )}

      {section(
        "Audit Projection",
        <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
            {field("Boundary", boundaryText(model.operatorAudit.boundary))}
            {field("Latest Dry-Run Action", model.operatorAudit.latestDryRunActionId)}
            {field("Latest Shadow-Publish Action", model.operatorAudit.latestShadowPublishActionId)}
            {field("Recent Attempts", model.operatorAudit.recentAttemptCount)}
            {field("Any publishMayHaveExecuted", String(model.operatorAudit.persistedResultFlags.anyPublishMayHaveExecuted))}
            {field("Any runtimeMutation flag", String(model.operatorAudit.persistedResultFlags.anyRuntimeMutationFlag))}
            {field("Any enforcement flag", String(model.operatorAudit.persistedResultFlags.anyBlockingEnforcementAppliedFlag))}
          </dl>
          {model.operatorAudit.recentEvents.length === 0 ? (
            <div style={{ color: "#64748b" }}>No audit event history is available.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 760 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#475569", textAlign: "left" }}>
                    <th style={{ padding: "8px 6px" }}>Occurred</th>
                    <th style={{ padding: "8px 6px" }}>Event</th>
                    <th style={{ padding: "8px 6px" }}>Status</th>
                    <th style={{ padding: "8px 6px" }}>Actor</th>
                    <th style={{ padding: "8px 6px" }}>Result</th>
                    <th style={{ padding: "8px 6px" }}>Codes</th>
                  </tr>
                </thead>
                <tbody>
                  {model.operatorAudit.recentEvents.map((event, index) => (
                    <tr key={`${event.actionId}:${event.eventAction}:${index}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{event.occurredAt}</td>
                      <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>{event.eventAction}</td>
                      <td style={{ padding: "8px 6px" }}>{badge(event.status, statusTone(event.status))}</td>
                      <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>{event.actorRole}</td>
                      <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>{text(event.resultStatus)}</td>
                      <td style={{ padding: "8px 6px" }}>{codeList(event.reasonCodes)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>,
      )}

      {section("Filtered Diagnostic Rows", drilldownTable(diagnosticRows, "No diagnostic rows match the current filters."))}

      {section("Recent Action Timeline", timeline(filteredTimeline))}
    </div>
  );
}
