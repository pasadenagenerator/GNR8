import type { CSSProperties, ReactNode } from "react";

import type { JsonValue } from "@/gnr8/import/import-contract";
import { stableStringify } from "@/gnr8/migration/runtime/diagnostics";
import type { PipelineStageId } from "@/gnr8/migration/pipeline-contract";
import type { ValidationFixtureId, ValidationRunResult } from "@/gnr8/validation/validation-contract";
import type { ValidationShellResponse } from "@/src/validation-shell/real-site-01";

type FixtureShellConfig = {
  fixtureId: ValidationFixtureId;
  fixtureRoute: string;
  fixtureApiRoute: string;
  otherFixtureId: ValidationFixtureId;
  otherFixtureRoute: string;
  otherFixtureApiRoute: string;
};

type ValidationShellPageProps = {
  config: FixtureShellConfig;
  response: ValidationShellResponse;
};

type PillKind = "neutral" | "good" | "warn" | "bad";

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
    status === "true"
  ) {
    return "good";
  }

  if (status.includes("warning") || status === "skipped" || status === "not_previewable") return "warn";
  if (status === "blocked") return "bad";
  if (status === "false" || status.includes("fail") || status.includes("error") || status === "missing") return "bad";

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

function KeyValueTable(props: { rows: { k: string; v: ReactNode }[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        {props.rows.map((r) => (
          <tr key={r.k}>
            <td style={{ width: 260, verticalAlign: "top", padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>
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
  if (props.codes.length === 0) return <span style={{ color: "#6b7280" }}>none</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {props.codes.map((c) => (
        <span key={c} style={pillStyle("neutral")}>
          {c}
        </span>
      ))}
    </div>
  );
}

function JsonDetails(props: { title: string; value: unknown; defaultOpen?: boolean }) {
  return (
    <details open={props.defaultOpen ?? false} style={{ marginTop: 8 }}>
      <summary style={{ cursor: "pointer", color: "#111827" }}>{props.title}</summary>
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
          maxHeight: 320,
        }}
      >
        {stableStringify(props.value as JsonValue)}
      </pre>
    </details>
  );
}

function RawJsonPanel(props: { title: string; items: { title: string; value: unknown }[] }) {
  return (
    <details style={{ marginTop: 12 }}>
      <summary style={{ cursor: "pointer", fontWeight: 600 }}>{props.title}</summary>
      <div style={{ marginTop: 8 }}>
        {props.items.map((item) => (
          <JsonDetails key={item.title} title={item.title} value={item.value} />
        ))}
      </div>
    </details>
  );
}

function artifactRows(r: ValidationRunResult["validationSummary"]["artifacts"]) {
  const entries: { k: string; v: boolean }[] = [
    { k: "importOutput", v: r.importOutput },
    { k: "importManifest", v: r.importManifest },
    { k: "pipelineResult", v: r.pipelineResult },
    { k: "previewDocument", v: r.previewDocument },
    { k: "approvalPackage", v: r.approvalPackage },
    { k: "executionPlan", v: r.executionPlan },
    { k: "executionResult", v: r.executionResult },
    { k: "migrationRunReport", v: r.migrationRunReport },
  ];

  return entries.map((e) => ({ k: e.k, v: <StatusPill value={String(e.v)} kind={e.v ? "good" : "bad"} /> }));
}

function stageRowsFromPipeline(result: ValidationRunResult) {
  const stageById = new Map<PipelineStageId, ValidationRunResult["pipelineResult"]["stages"][number]>();
  for (const s of result.pipelineResult.stages) stageById.set(s.stageId, s);
  return result.pipelineResult.stageOrder.map((stageId) => {
    const stage = stageById.get(stageId) ?? null;
    return {
      stageId,
      status: stage?.status ?? "missing",
      summary: stage?.summary ?? "",
      diagCount: stage?.diagnostics.length ?? 0,
    };
  });
}

function summaryCardStyle(kind: PillKind): CSSProperties {
  const palette: Record<PillKind, { border: string; background: string }> = {
    neutral: { border: "#d1d5db", background: "#f9fafb" },
    good: { border: "#a7f3d0", background: "#ecfdf5" },
    warn: { border: "#fcd34d", background: "#fffbeb" },
    bad: { border: "#fca5a5", background: "#fef2f2" },
  };

  return {
    border: `1px solid ${palette[kind].border}`,
    background: palette[kind].background,
    borderRadius: 10,
    padding: "8px 10px",
    minWidth: 150,
  };
}

function SummaryCard(props: { label: string; value: ReactNode; kind?: PillKind }) {
  return (
    <div style={summaryCardStyle(props.kind ?? "neutral")}>
      <div style={{ fontSize: 11, color: "#4b5563" }}>{props.label}</div>
      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600 }}>{props.value}</div>
    </div>
  );
}

function TopNavigation(props: { config: FixtureShellConfig }) {
  const { config } = props;
  return (
    <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, padding: 14, background: "#f8fafc", marginTop: 10 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>fixture: {config.fixtureId}</span>
        <StatusPill value="temporary-shell" kind="neutral" />
      </div>
      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <a href={config.fixtureRoute} style={{ color: "#1d4ed8" }}>
          Current Fixture Page ({config.fixtureId})
        </a>
        <a href={config.otherFixtureRoute} style={{ color: "#1d4ed8" }}>
          Other Fixture Page ({config.otherFixtureId})
        </a>
        <a href={config.fixtureApiRoute} style={{ color: "#1d4ed8" }}>
          Current Fixture API
        </a>
        <a href={config.otherFixtureApiRoute} style={{ color: "#1d4ed8" }}>
          Other Fixture API
        </a>
      </div>
    </section>
  );
}

function SuccessView(props: { result: ValidationRunResult }) {
  const { result } = props;
  const validationSummary = result.validationSummary;

  return (
    <>
      <Section
        title="Validation Summary"
        summary={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusPill value={validationSummary.overallStatus} />
            <StatusPill value={result.importOutput.status} />
            <StatusPill value={result.importManifest.status} />
          </div>
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <SummaryCard label="overall" value={<StatusPill value={validationSummary.overallStatus} />} kind={statusKindFromString(validationSummary.overallStatus)} />
          <SummaryCard label="preview pages" value={validationSummary.counts.previewPageCount} />
          <SummaryCard label="rendered pages" value={validationSummary.counts.renderedPageCount} />
          <SummaryCard label="key diagnostics" value={validationSummary.diagnostics.keyCodes.length} kind={validationSummary.diagnostics.keyCodes.length > 0 ? "warn" : "good"} />
          <SummaryCard label="blocked reasons" value={validationSummary.diagnostics.blockedReasonCodes.length} kind={validationSummary.diagnostics.blockedReasonCodes.length > 0 ? "bad" : "good"} />
        </div>

        <KeyValueTable
          rows={[
            { k: "fixtureId", v: result.fixtureId },
            { k: "overallStatus", v: <StatusPill value={validationSummary.overallStatus} /> },
            { k: "importOutput.status", v: <StatusPill value={result.importOutput.status} /> },
            { k: "importManifest.status", v: <StatusPill value={result.importManifest.status} /> },
            { k: "previewPageCount", v: validationSummary.counts.previewPageCount },
            { k: "renderedPageCount", v: validationSummary.counts.renderedPageCount },
            { k: "keyDiagnosticCodes", v: <CodeList codes={validationSummary.diagnostics.keyCodes} /> },
            { k: "blockedReasonCodes", v: <CodeList codes={validationSummary.diagnostics.blockedReasonCodes} /> },
          ]}
        />

        <h3 style={{ margin: "14px 0 8px 0", fontSize: 14 }}>Artifact Availability</h3>
        <KeyValueTable rows={artifactRows(validationSummary.artifacts)} />

        <RawJsonPanel
          title="Raw JSON"
          items={[
            { title: "validationSummary", value: validationSummary },
            { title: "comparison slice", value: validationSummary.comparison },
            { title: "importManifest", value: result.importManifest },
            { title: "importOutput (can be large)", value: result.importOutput },
          ]}
        />
      </Section>

      <Section
        title="Pipeline Stages"
        summary={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusPill value={result.pipelineResult.status} />
            <span>{result.pipelineResult.stages.length} stages</span>
          </div>
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <SummaryCard label="pipeline status" value={<StatusPill value={result.pipelineResult.status} />} kind={statusKindFromString(result.pipelineResult.status)} />
          <SummaryCard label="stage count" value={result.pipelineResult.stageOrder.length} />
          <SummaryCard
            label="diagnostics total"
            value={result.pipelineResult.stages.reduce((sum, s) => sum + s.diagnostics.length, 0)}
            kind={result.pipelineResult.stages.some((s) => s.diagnostics.length > 0) ? "warn" : "good"}
          />
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>stageId</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>status</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>diagnostics</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>summary</th>
            </tr>
          </thead>
          <tbody>
            {stageRowsFromPipeline(result).map((r) => (
              <tr key={r.stageId}>
                <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                  {r.stageId}
                </td>
                <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>
                  <StatusPill value={r.status} />
                </td>
                <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>{r.diagCount}</td>
                <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>{r.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <RawJsonPanel title="Raw JSON" items={[{ title: "pipelineResult", value: result.pipelineResult }]} />
      </Section>

      <Section
        title="Preview"
        summary={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusPill value={result.previewDocument.status} />
            <span>{result.previewDocument.pages.length} pages</span>
          </div>
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <SummaryCard label="preview status" value={<StatusPill value={result.previewDocument.status} />} kind={statusKindFromString(result.previewDocument.status)} />
          <SummaryCard label="pages total" value={result.previewDocument.pages.length} />
          <SummaryCard label="previewable" value={result.previewDocument.siteSummary.previewablePageCount} kind={result.previewDocument.siteSummary.previewablePageCount > 0 ? "good" : "neutral"} />
          <SummaryCard
            label="not previewable"
            value={result.previewDocument.siteSummary.notPreviewablePageCount}
            kind={result.previewDocument.siteSummary.notPreviewablePageCount > 0 ? "warn" : "good"}
          />
        </div>

        <KeyValueTable
          rows={[
            { k: "previewDocument.status", v: <StatusPill value={result.previewDocument.status} /> },
            { k: "pages.total", v: result.previewDocument.pages.length },
            { k: "pages.previewable", v: result.previewDocument.siteSummary.previewablePageCount },
            { k: "pages.notPreviewable", v: result.previewDocument.siteSummary.notPreviewablePageCount },
          ]}
        />

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
          {result.previewDocument.pages.map((p, idx) => {
            const previewKind = p.previewEligibility === "previewable" ? "good" : "warn";
            return (
              <article
                key={p.previewPageId}
                style={{
                  border: "1px solid #dbe3ea",
                  borderLeft: `4px solid ${previewKind === "good" ? "#10b981" : "#f59e0b"}`,
                  borderRadius: 10,
                  padding: 10,
                  background: "#fcfcfd",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <StatusPill value={`${idx + 1}/${result.previewDocument.pages.length}`} kind="neutral" />
                      <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{p.sourcePath}</span>
                    </div>
                    <div style={{ marginTop: 4, color: "#4b5563", fontSize: 12 }}>
                      previewEligibility={p.previewEligibility} · previewNodeCount={p.previewNodeCount} · isEntry={String(p.isEntry)}
                    </div>
                  </div>
                  <div>
                    <StatusPill value={p.previewEligibility === "previewable" ? "previewable" : "not_previewable"} />
                  </div>
                </div>

                <div style={{ marginTop: 10, border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#ffffff" }}>
                  <iframe
                    title={`preview:${p.sourcePath}`}
                    sandbox=""
                    srcDoc={p.preview.html}
                    style={{ width: "100%", height: 560, border: 0, background: "white" }}
                  />
                </div>

                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: "pointer" }}>Page metadata</summary>
                  <pre style={{ marginTop: 10, padding: 10, background: "#f9fafb", borderRadius: 10, overflow: "auto", fontSize: 12, maxHeight: 260 }}>
                    {stableStringify(
                      {
                        previewPageId: p.previewPageId,
                        sourceRenderedPageId: p.sourceRenderedPageId,
                        sourcePageId: p.sourcePageId,
                        sourceDocumentId: p.sourceDocumentId,
                        sourcePath: p.sourcePath,
                        isEntry: p.isEntry,
                        previewEligibility: p.previewEligibility,
                        previewNodeCount: p.previewNodeCount,
                      } as unknown as JsonValue,
                    )}
                  </pre>
                </details>
              </article>
            );
          })}
        </div>

        <RawJsonPanel title="Raw JSON" items={[{ title: "previewDocument", value: result.previewDocument }]} />
      </Section>

      <Section
        title="Approval / Execution"
        summary={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusPill value={result.approvalPackage.eligibility.status} />
            <StatusPill value={result.executionPlan.eligibility.status} />
            <StatusPill value={result.executionResult.status} />
          </div>
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <SummaryCard label="approval" value={<StatusPill value={result.approvalPackage.eligibility.status} />} kind={statusKindFromString(result.approvalPackage.eligibility.status)} />
          <SummaryCard label="plan eligibility" value={<StatusPill value={result.executionPlan.eligibility.status} />} kind={statusKindFromString(result.executionPlan.eligibility.status)} />
          <SummaryCard label="execution" value={<StatusPill value={result.executionResult.status} />} kind={statusKindFromString(result.executionResult.status)} />
          <SummaryCard label="blocking reasons" value={result.approvalPackage.eligibility.blockingReasons.length} kind={result.approvalPackage.eligibility.blockingReasons.length > 0 ? "bad" : "good"} />
        </div>

        <KeyValueTable
          rows={[
            { k: "approval.status", v: <StatusPill value={result.approvalPackage.eligibility.status} /> },
            { k: "approval.blockingReasons", v: result.approvalPackage.eligibility.blockingReasons.length },
            { k: "approval.warningCodes", v: <CodeList codes={result.approvalPackage.eligibility.warningCodes} /> },
            { k: "execution.planEligibility", v: <StatusPill value={result.executionPlan.eligibility.status} /> },
            { k: "execution.resultStatus", v: <StatusPill value={result.executionResult.status} /> },
          ]}
        />

        <h3 style={{ margin: "14px 0 8px 0", fontSize: 14 }}>Execution Steps (Plan)</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>stepId</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>summary</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>sourcePreviewPageIds</th>
            </tr>
          </thead>
          <tbody>
            {result.executionPlan.steps.map((s) => (
              <tr key={s.stepId}>
                <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                  {s.stepId}
                </td>
                <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>{s.summary}</td>
                <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>{s.sourcePreviewPageIds.length}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ margin: "14px 0 8px 0", fontSize: 14 }}>Execution Result (Simulation)</h3>
        <KeyValueTable
          rows={[
            { k: "executedSteps", v: result.executionResult.executedSteps.length },
            { k: "skippedSteps", v: result.executionResult.skippedSteps.length },
            { k: "blockingReasonCodes", v: <CodeList codes={result.executionResult.blockingReasons} /> },
            { k: "warningCodes", v: <CodeList codes={result.executionResult.warningCodes} /> },
          ]}
        />

        <RawJsonPanel
          title="Raw JSON"
          items={[
            { title: "approvalPackage", value: result.approvalPackage },
            { title: "executionPlan", value: result.executionPlan },
            { title: "executionResult", value: result.executionResult },
          ]}
        />
      </Section>

      <Section
        title="Run Report Summary"
        summary={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusPill value={result.migrationRunReport.overallStatus} />
            <span>{result.migrationRunReport.events.length} events</span>
          </div>
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <SummaryCard label="overall" value={<StatusPill value={result.migrationRunReport.overallStatus} />} kind={statusKindFromString(result.migrationRunReport.overallStatus)} />
          <SummaryCard label="event count" value={result.migrationRunReport.events.length} />
          <SummaryCard
            label="warning codes"
            value={result.migrationRunReport.diagnostics.warnings.codes.length}
            kind={result.migrationRunReport.diagnostics.warnings.codes.length > 0 ? "warn" : "good"}
          />
          <SummaryCard
            label="blocking codes"
            value={result.migrationRunReport.diagnostics.blocking.codes.length}
            kind={result.migrationRunReport.diagnostics.blocking.codes.length > 0 ? "bad" : "good"}
          />
        </div>

        <KeyValueTable
          rows={[
            { k: "overallStatus", v: <StatusPill value={result.migrationRunReport.overallStatus} /> },
            { k: "eventCount", v: result.migrationRunReport.events.length },
            { k: "diagnostics.warnings", v: <CodeList codes={result.migrationRunReport.diagnostics.warnings.codes} /> },
            { k: "diagnostics.blocking", v: <CodeList codes={result.migrationRunReport.diagnostics.blocking.codes} /> },
          ]}
        />

        <h3 style={{ margin: "14px 0 8px 0", fontSize: 14 }}>Stage Coverage</h3>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>stageId</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>status</th>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>diagnosticCodes</th>
            </tr>
          </thead>
          <tbody>
            {result.migrationRunReport.stages.map((s) => (
              <tr key={s.stageId}>
                <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                  {s.stageId}
                </td>
                <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>
                  <StatusPill value={s.status} />
                </td>
                <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>{s.diagnosticCodes.length}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <RawJsonPanel title="Raw JSON" items={[{ title: "migrationRunReport", value: result.migrationRunReport }]} />
      </Section>
    </>
  );
}

export function ValidationShellPage(props: ValidationShellPageProps) {
  const { config, response } = props;

  return (
    <main
      style={{
        padding: 18,
        maxWidth: 1400,
        margin: "0 auto",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        background: "#f3f6fb",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 18 }}>Temporary Phase-1 Validation Console</h1>
      <p style={{ margin: "6px 0 0 0", color: "#4b5563" }}>
        Temporary debug-oriented shell for phase-1 migration inspection. Fixture is fixed to{" "}
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>{config.fixtureId}</span>.
      </p>

      <TopNavigation config={config} />

      {response.ok ? (
        <SuccessView result={response.result} />
      ) : (
        <>
          <Section title="Validation Summary" summary={<StatusPill value="failed_to_run" kind="bad" />}>
            <KeyValueTable
              rows={[
                { k: "fixtureId", v: response.fixtureId },
                { k: "overallStatus", v: <StatusPill value="failed_to_run" kind="bad" /> },
                { k: "error.message", v: response.error.message },
              ]}
            />
            {response.error.stack ? (
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer" }}>error.stack</summary>
                <pre style={{ marginTop: 10, padding: 10, background: "#111827", color: "#e5e7eb", borderRadius: 10, overflow: "auto" }}>
                  {response.error.stack}
                </pre>
              </details>
            ) : null}
          </Section>
          <Section title="Pipeline Stages">
            <p style={{ margin: 0, color: "#6b7280" }}>Pipeline not available (validation run failed).</p>
          </Section>
          <Section title="Preview">
            <p style={{ margin: 0, color: "#6b7280" }}>Preview not available (validation run failed).</p>
          </Section>
          <Section title="Approval / Execution">
            <p style={{ margin: 0, color: "#6b7280" }}>Approval/execution not available (validation run failed).</p>
          </Section>
          <Section title="Run Report Summary">
            <p style={{ margin: 0, color: "#6b7280" }}>Run report not available (validation run failed).</p>
          </Section>
        </>
      )}
    </main>
  );
}
