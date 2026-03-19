"use client";

import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

type ExecutionMode = "simulation" | "materialize";
type PillKind = "neutral" | "good" | "warn" | "bad";

type UrlImportOperatorSuccessResponse = {
  kind: "url_import_operator_response_v1";
  ok: true;
  sourceKind: string;
  sourceUrl: string;
  normalizedUrl: string;
  executionMode: ExecutionMode;
  snapshot: {
    snapshotId: string;
    snapshotRootDirAbs: string;
    entryHtmlPathAbs: string;
    assetsDirAbs: string;
    importDiagnostics: {
      summary: { infoCount: number; warningCount: number; errorCount: number; fatalCount: number };
      issues: Array<{ code: string; severity: string; message: string }>;
    };
    fetchManifest: Array<{ url: string; status: string }>;
  };
  result: {
    importManifest: { status: string };
    pipelineResult: { status: string };
    approvalPackage: { eligibility: { status: string } };
    executionPlan: { eligibility: { status: string } };
    executionResult: {
      status: string;
      warningCodes: string[];
      blockingReasons: string[];
      materialization: {
        status: string;
        outputRootPath: string | null;
        summary: {
          pageFileCount: number;
          writtenPageCount: number;
          nonRenderablePageCount: number;
          failedPageCount: number;
          assetFileCount: number;
          copiedAssetCount: number;
          missingAssetCount: number;
          skippedAssetCount: number;
          failedAssetCount: number;
        };
      };
      previewHosting: {
        status: string;
        available: boolean;
        previewRootUrl: string | null;
        previewEntryUrl: string | null;
        previewStorageKind: string;
        previewStorageKey: string | null;
        reasonCode: string | null;
      };
    };
    migrationRunReport: { overallStatus: string };
  };
  summary: {
    importStatus: string;
    pipelineStatus: string;
    approvalStatus: string;
    executionPlanEligibility: string;
    executionStatus: string;
    reportStatus: string;
    warningCodes: string[];
    blockingReasonCodes: string[];
  };
  error: null;
};

type UrlImportOperatorFailureResponse = {
  kind: "url_import_operator_response_v1";
  ok: false;
  sourceKind: string;
  sourceUrl: string;
  normalizedUrl: string | null;
  executionMode: ExecutionMode;
  snapshot: {
    snapshotId: string | null;
    snapshotRootDirAbs: string | null;
    entryHtmlPathAbs: string | null;
    assetsDirAbs: string | null;
    importDiagnostics: {
      summary: { infoCount: number; warningCount: number; errorCount: number; fatalCount: number };
      issues: Array<{ code: string; severity: string; message: string }>;
    } | null;
    fetchManifest: Array<{ url: string; status: string }>;
  };
  result: null;
  summary: null;
  error: { message: string; stack: string | null };
};

type UrlImportOperatorResponse = UrlImportOperatorSuccessResponse | UrlImportOperatorFailureResponse;

function stableStringify(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return "null";
}

function sortedUnique(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function pillStyle(kind: PillKind): CSSProperties {
  const base: CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 12,
    lineHeight: "16px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontWeight: 600,
  };

  if (kind === "good") return { ...base, color: "#065f46", borderColor: "#34d399", background: "#ecfdf5" };
  if (kind === "warn") return { ...base, color: "#92400e", borderColor: "#f59e0b", background: "#fffbeb" };
  if (kind === "bad") return { ...base, color: "#7f1d1d", borderColor: "#f87171", background: "#fef2f2" };
  return { ...base, color: "#111827", borderColor: "#d1d5db", background: "#f9fafb" };
}

function statusKindFromString(status: string): PillKind {
  if (
    status === "passed" ||
    status === "success" ||
    status === "ok" ||
    status === "ready" ||
    status === "approvable" ||
    status === "eligible" ||
    status === "executed" ||
    status === "previewable" ||
    status === "available" ||
    status === "materialized" ||
    status === "true"
  ) {
    return "good";
  }

  if (status.includes("warning") || status === "skipped" || status === "not_run") return "warn";
  if (status === "blocked") return "bad";
  if (status.includes("fail") || status.includes("error") || status === "false" || status === "missing") return "bad";

  return "neutral";
}

function StatusPill(props: { value: string; kind?: PillKind }) {
  return <span style={pillStyle(props.kind ?? statusKindFromString(props.value))}>{props.value}</span>;
}

function Section(props: { title: string; summary?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, padding: 14, marginTop: 12, background: "#ffffff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{props.title}</h2>
        {props.summary ? <div style={{ color: "#4b5563", fontSize: 12 }}>{props.summary}</div> : null}
      </div>
      <div style={{ marginTop: 10 }}>{props.children}</div>
    </section>
  );
}

function SummaryCard(props: { label: string; value: ReactNode; kind?: PillKind }) {
  const palette: Record<PillKind, { border: string; background: string }> = {
    neutral: { border: "#d1d5db", background: "#f9fafb" },
    good: { border: "#a7f3d0", background: "#ecfdf5" },
    warn: { border: "#fcd34d", background: "#fffbeb" },
    bad: { border: "#fca5a5", background: "#fef2f2" },
  };

  const kind = props.kind ?? "neutral";
  return (
    <div
      style={{
        border: `1px solid ${palette[kind].border}`,
        background: palette[kind].background,
        borderRadius: 10,
        padding: "8px 10px",
        minWidth: 170,
      }}
    >
      <div style={{ fontSize: 11, color: "#4b5563" }}>{props.label}</div>
      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600 }}>{props.value}</div>
    </div>
  );
}

function KeyValueTable(props: { rows: { k: string; v: ReactNode }[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        {props.rows.map((r) => (
          <tr key={r.k}>
            <td style={{ width: 320, verticalAlign: "top", padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>
              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{r.k}</span>
            </td>
            <td style={{ verticalAlign: "top", padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>{r.v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CodeList(props: { codes: string[] }) {
  const codes = sortedUnique(props.codes);
  if (codes.length === 0) return <span style={{ color: "#6b7280" }}>none</span>;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {codes.map((c) => (
        <span key={c} style={pillStyle("neutral")}>
          {c}
        </span>
      ))}
    </div>
  );
}

function ResultPanel(props: { response: UrlImportOperatorResponse }) {
  const modePillKind: PillKind = props.response.executionMode === "materialize" ? "warn" : "neutral";

  if (!props.response.ok) {
    const snapshotWarningCodes = sortedUnique(
      props.response.snapshot.importDiagnostics?.issues.filter((issue) => issue.severity === "warning").map((issue) => issue.code) ?? [],
    );
    const snapshotFatalCodes = sortedUnique(
      props.response.snapshot.importDiagnostics?.issues
        .filter((issue) => issue.severity === "fatal" || issue.severity === "error")
        .map((issue) => issue.code) ?? [],
    );

    return (
      <>
        <Section
          title="Run Summary"
          summary={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <StatusPill value={props.response.executionMode} kind={modePillKind} />
              <StatusPill value="failed_to_run" kind="bad" />
            </div>
          }
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <SummaryCard label="mode" value={props.response.executionMode} kind={modePillKind} />
            <SummaryCard label="status" value={<StatusPill value="failed_to_run" kind="bad" />} kind="bad" />
            <SummaryCard label="warnings" value={snapshotWarningCodes.length} kind={snapshotWarningCodes.length > 0 ? "warn" : "neutral"} />
            <SummaryCard label="blocking/error codes" value={snapshotFatalCodes.length} kind={snapshotFatalCodes.length > 0 ? "bad" : "neutral"} />
          </div>
          <KeyValueTable
            rows={[
              { k: "submittedUrl", v: props.response.sourceUrl },
              { k: "normalizedUrl", v: props.response.normalizedUrl ?? "n/a" },
              { k: "sourceKind", v: props.response.sourceKind },
              { k: "executionMode", v: <StatusPill value={props.response.executionMode} kind={modePillKind} /> },
              { k: "overallValidationOrExportStatus", v: <StatusPill value="failed_to_run" kind="bad" /> },
              { k: "importManifestStatus", v: "n/a" },
              { k: "pipelineStatus", v: "n/a" },
              { k: "previewStatus", v: "n/a" },
              { k: "approvalStatus", v: "n/a" },
              { k: "executionStatus", v: "n/a" },
              { k: "warningCodes", v: <CodeList codes={snapshotWarningCodes} /> },
              { k: "blockingReasonCodes", v: <CodeList codes={snapshotFatalCodes} /> },
              { k: "failure.message", v: props.response.error.message },
              { k: "failure.stack", v: props.response.error.stack ?? "n/a" },
            ]}
          />
        </Section>

        <Section title="Snapshot Diagnostics" summary={<StatusPill value="failed_before_pipeline" kind="bad" />}>
          <KeyValueTable
            rows={[
              { k: "snapshot.snapshotId", v: props.response.snapshot.snapshotId ?? "n/a" },
              { k: "snapshot.snapshotRootDirAbs", v: props.response.snapshot.snapshotRootDirAbs ?? "n/a" },
              { k: "snapshot.entryHtmlPathAbs", v: props.response.snapshot.entryHtmlPathAbs ?? "n/a" },
              { k: "snapshot.assetsDirAbs", v: props.response.snapshot.assetsDirAbs ?? "n/a" },
              { k: "snapshot.fetchManifestCount", v: props.response.snapshot.fetchManifest.length },
              { k: "snapshot.importDiagnostics.warningCount", v: props.response.snapshot.importDiagnostics?.summary.warningCount ?? "n/a" },
              { k: "snapshot.importDiagnostics.errorCount", v: props.response.snapshot.importDiagnostics?.summary.errorCount ?? "n/a" },
              { k: "snapshot.importDiagnostics.fatalCount", v: props.response.snapshot.importDiagnostics?.summary.fatalCount ?? "n/a" },
            ]}
          />
        </Section>
      </>
    );
  }

  const warningCodes = sortedUnique(props.response.summary.warningCodes);
  const blockingReasonCodes = sortedUnique(props.response.summary.blockingReasonCodes);
  const preview = props.response.result.executionResult.previewHosting;
  const materialization = props.response.result.executionResult.materialization;
  const isBlocked =
    props.response.summary.approvalStatus === "blocked" ||
    props.response.summary.executionPlanEligibility === "blocked" ||
    props.response.summary.executionStatus === "blocked" ||
    blockingReasonCodes.length > 0;
  const isWarningMode = !isBlocked && (warningCodes.length > 0 || props.response.summary.executionStatus.includes("warning"));

  return (
    <>
      <Section
        title="Run Summary"
        summary={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusPill value={props.response.executionMode} kind={modePillKind} />
            <StatusPill value={isBlocked ? "blocked" : isWarningMode ? "warning_mode" : "ok"} kind={isBlocked ? "bad" : isWarningMode ? "warn" : "good"} />
          </div>
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <SummaryCard label="mode" value={props.response.executionMode} kind={modePillKind} />
          <SummaryCard
            label="overall validation/export"
            value={<StatusPill value={props.response.summary.reportStatus} />}
            kind={statusKindFromString(props.response.summary.reportStatus)}
          />
          <SummaryCard label="import manifest" value={<StatusPill value={props.response.summary.importStatus} />} kind={statusKindFromString(props.response.summary.importStatus)} />
          <SummaryCard label="pipeline" value={<StatusPill value={props.response.summary.pipelineStatus} />} kind={statusKindFromString(props.response.summary.pipelineStatus)} />
          <SummaryCard label="approval" value={<StatusPill value={props.response.summary.approvalStatus} />} kind={statusKindFromString(props.response.summary.approvalStatus)} />
          <SummaryCard label="execution" value={<StatusPill value={props.response.summary.executionStatus} />} kind={statusKindFromString(props.response.summary.executionStatus)} />
          <SummaryCard label="warnings" value={warningCodes.length} kind={warningCodes.length > 0 ? "warn" : "good"} />
          <SummaryCard label="blocking reasons" value={blockingReasonCodes.length} kind={blockingReasonCodes.length > 0 ? "bad" : "good"} />
        </div>

        <KeyValueTable
          rows={[
            { k: "submittedUrl", v: props.response.sourceUrl },
            { k: "normalizedUrl", v: props.response.normalizedUrl },
            { k: "sourceKind", v: props.response.sourceKind },
            { k: "executionMode", v: <StatusPill value={props.response.executionMode} kind={modePillKind} /> },
            { k: "overallValidationOrExportStatus", v: <StatusPill value={props.response.summary.reportStatus} /> },
            { k: "importManifestStatus", v: <StatusPill value={props.response.summary.importStatus} /> },
            { k: "pipelineStatus", v: <StatusPill value={props.response.summary.pipelineStatus} /> },
            { k: "previewStatus", v: <StatusPill value={preview.status} /> },
            { k: "approvalStatus", v: <StatusPill value={props.response.summary.approvalStatus} /> },
            { k: "executionStatus", v: <StatusPill value={props.response.summary.executionStatus} /> },
            { k: "warningCodes", v: <CodeList codes={warningCodes} /> },
            { k: "blockingReasonCodes", v: <CodeList codes={blockingReasonCodes} /> },
          ]}
        />
      </Section>

      <Section
        title={props.response.executionMode === "materialize" ? "Materialized Output + Preview" : "Simulation Output + Preview"}
        summary={<StatusPill value={props.response.executionMode === "materialize" ? "materialize_mode" : "simulation_mode"} kind={modePillKind} />}
      >
        <KeyValueTable
          rows={[
            { k: "materialization.status", v: <StatusPill value={materialization.status} /> },
            { k: "materialization.outputRootPath", v: materialization.outputRootPath ?? "n/a" },
            { k: "materialization.summary.pageFileCount", v: materialization.summary.pageFileCount },
            { k: "materialization.summary.writtenPageCount", v: materialization.summary.writtenPageCount },
            { k: "materialization.summary.nonRenderablePageCount", v: materialization.summary.nonRenderablePageCount },
            { k: "materialization.summary.failedPageCount", v: materialization.summary.failedPageCount },
            { k: "materialization.summary.assetFileCount", v: materialization.summary.assetFileCount },
            { k: "materialization.summary.copiedAssetCount", v: materialization.summary.copiedAssetCount },
            { k: "materialization.summary.missingAssetCount", v: materialization.summary.missingAssetCount },
            { k: "materialization.summary.skippedAssetCount", v: materialization.summary.skippedAssetCount },
            { k: "materialization.summary.failedAssetCount", v: materialization.summary.failedAssetCount },
            { k: "preview.available", v: <StatusPill value={String(preview.available)} kind={preview.available ? "good" : "neutral"} /> },
            { k: "preview.status", v: <StatusPill value={preview.status} /> },
            { k: "preview.entryUrl (primary)", v: preview.previewEntryUrl ? <a href={preview.previewEntryUrl}>{preview.previewEntryUrl}</a> : "n/a" },
            {
              k: "preview.rootUrl (secondary/technical)",
              v: preview.previewRootUrl ? <a href={preview.previewRootUrl}>{preview.previewRootUrl}</a> : "n/a",
            },
            { k: "preview.storageKind", v: preview.previewStorageKind },
            { k: "preview.storageKey", v: preview.previewStorageKey ?? "n/a" },
            { k: "preview.reasonCode", v: preview.reasonCode ?? "n/a" },
          ]}
        />
      </Section>

      <Section title="Snapshot Diagnostics">
        <KeyValueTable
          rows={[
            { k: "snapshot.snapshotId", v: props.response.snapshot.snapshotId },
            { k: "snapshot.snapshotRootDirAbs", v: props.response.snapshot.snapshotRootDirAbs },
            { k: "snapshot.entryHtmlPathAbs", v: props.response.snapshot.entryHtmlPathAbs },
            { k: "snapshot.assetsDirAbs", v: props.response.snapshot.assetsDirAbs },
            { k: "snapshot.fetchManifestCount", v: props.response.snapshot.fetchManifest.length },
            { k: "snapshot.importDiagnostics.infoCount", v: props.response.snapshot.importDiagnostics.summary.infoCount },
            { k: "snapshot.importDiagnostics.warningCount", v: props.response.snapshot.importDiagnostics.summary.warningCount },
            { k: "snapshot.importDiagnostics.errorCount", v: props.response.snapshot.importDiagnostics.summary.errorCount },
            { k: "snapshot.importDiagnostics.fatalCount", v: props.response.snapshot.importDiagnostics.summary.fatalCount },
          ]}
        />
      </Section>
    </>
  );
}

export function UrlImportOperatorConsole() {
  const [url, setUrl] = useState("");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("simulation");
  const [operatorKey, setOperatorKey] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [response, setResponse] = useState<UrlImportOperatorResponse | null>(null);

  const modeHint = useMemo(
    () =>
      executionMode === "simulation"
        ? "Simulation runs deterministic validation/export without writing a real output bundle."
        : "Materialize writes a real output bundle and can expose a hosted preview URL when available.",
    [executionMode],
  );

  async function onRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sourceUrl = url.trim();
    if (!sourceUrl) {
      setErrorText("URL is required.");
      return;
    }

    setIsRunning(true);
    setErrorText(null);
    setResponse(null);

    try {
      const res = await fetch("/api/validation/url-import", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(operatorKey.trim() ? { "x-gnr8-validation-operator-key": operatorKey.trim() } : {}),
        },
        body: JSON.stringify({
          url: sourceUrl,
          executionMode,
        }),
      });

      const payload = (await res.json().catch(() => null)) as { kind?: string } | null;
      if (!payload || payload.kind !== "url_import_operator_response_v1") {
        throw new Error(`Unexpected API response (status ${res.status}).`);
      }

      setResponse(payload as UrlImportOperatorResponse);
      if (!res.ok && (payload as UrlImportOperatorResponse).ok === false) {
        setErrorText((payload as UrlImportOperatorFailureResponse).error.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorText(message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <>
      <Section title="Run URL Import">
        <form onSubmit={onRun} style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#374151" }}>Public Landing Page URL</span>
            <input
              type="url"
              name="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/"
              required
              style={{ width: "100%", maxWidth: 740, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
            />
          </label>

          <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#374151" }}>Execution Mode</span>
              <select
                name="executionMode"
                value={executionMode}
                onChange={(event) => setExecutionMode(event.target.value as ExecutionMode)}
                style={{ minWidth: 180, padding: "7px 8px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              >
                <option value="simulation">simulation</option>
                <option value="materialize">materialize</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#374151" }}>Operator Key (optional header)</span>
              <input
                type="password"
                name="operatorKey"
                value={operatorKey}
                onChange={(event) => setOperatorKey(event.target.value)}
                placeholder="x-gnr8-validation-operator-key"
                style={{ minWidth: 320, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              />
            </label>

            <button
              type="submit"
              disabled={isRunning}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #9ca3af",
                background: isRunning ? "#e5e7eb" : "#ffffff",
                cursor: isRunning ? "not-allowed" : "pointer",
              }}
            >
              {isRunning ? "Running…" : "Run Import"}
            </button>
          </div>
        </form>
        <p style={{ margin: "8px 0 0 0", color: "#4b5563", fontSize: 12 }}>{modeHint}</p>
        {errorText ? <p style={{ margin: "8px 0 0 0", color: "#b91c1c", fontSize: 13 }}>{errorText}</p> : null}
      </Section>

      {response ? <ResultPanel response={response} /> : null}

      {response ? (
        <Section title="Raw Payload (Secondary)">
          <details>
            <summary style={{ cursor: "pointer" }}>Show raw JSON payload</summary>
            <pre
              style={{
                marginTop: 10,
                padding: 10,
                background: "#0b1020",
                color: "#e5e7eb",
                borderRadius: 10,
                overflow: "auto",
                fontSize: 12,
                lineHeight: "16px",
                maxHeight: 420,
              }}
            >
              {stableStringify(response)}
            </pre>
          </details>
        </Section>
      ) : null}
    </>
  );
}
