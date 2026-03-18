import type { CSSProperties, ReactNode } from "react";

import type { JsonValue } from "@/gnr8/import/import-contract";
import { stableStringify } from "@/gnr8/migration/runtime/diagnostics";
import type { PipelineStageId } from "@/gnr8/migration/pipeline-contract";
import type { ValidationRunResult } from "@/gnr8/validation/validation-contract";
import { runValidationShellRealSite01 } from "@/src/validation-shell/real-site-01";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function pillStyle(kind: "neutral" | "good" | "warn" | "bad") {
  const base: CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid",
    fontSize: 12,
    lineHeight: "16px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  };

  if (kind === "good") return { ...base, color: "#065f46", borderColor: "#34d399", background: "#ecfdf5" };
  if (kind === "warn") return { ...base, color: "#92400e", borderColor: "#fbbf24", background: "#fffbeb" };
  if (kind === "bad") return { ...base, color: "#7f1d1d", borderColor: "#fca5a5", background: "#fef2f2" };
  return { ...base, color: "#111827", borderColor: "#d1d5db", background: "#f9fafb" };
}

function StatusPill(props: { value: string; kind: "neutral" | "good" | "warn" | "bad" }) {
  return <span style={pillStyle(props.kind)}>{props.value}</span>;
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <section style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, marginTop: 12 }}>
      <h2 style={{ margin: "0 0 10px 0", fontSize: 16 }}>{props.title}</h2>
      {props.children}
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
    <details open={props.defaultOpen ?? false} style={{ marginTop: 10 }}>
      <summary style={{ cursor: "pointer" }}>{props.title}</summary>
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
        }}
      >
        {stableStringify(props.value as JsonValue)}
      </pre>
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

  return entries.map((e) => ({ k: e.k, v: e.v ? <StatusPill value="true" kind="good" /> : <StatusPill value="false" kind="bad" /> }));
}

function validationStatusPill(status: string) {
  if (status === "passed") return <StatusPill value={status} kind="good" />;
  if (status === "passed_with_warnings") return <StatusPill value={status} kind="warn" />;
  if (status === "blocked") return <StatusPill value={status} kind="warn" />;
  return <StatusPill value={status} kind="bad" />;
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

export default async function ValidationRealSite01Page() {
  const res = await runValidationShellRealSite01();

  return (
    <main style={{ padding: 18, fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
      <h1 style={{ margin: 0, fontSize: 18 }}>Temporary Phase-1 Validation Console</h1>
      <p style={{ margin: "6px 0 0 0", color: "#4b5563" }}>
        This route is a temporary debugging UI for the phase-1 migration spine. Fixture is fixed to{" "}
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>real-site-01</span>.
      </p>
      <p style={{ margin: "6px 0 0 0", color: "#4b5563" }}>
        Raw API:{" "}
        <a href="/api/validation/real-site-01" style={{ color: "#2563eb" }}>
          /api/validation/real-site-01
        </a>
      </p>

      <Section title="Validation Summary">
        {res.ok ? (
          <>
            <KeyValueTable
              rows={[
                { k: "fixtureId", v: res.result.fixtureId },
                { k: "overallStatus", v: validationStatusPill(res.result.validationSummary.overallStatus) },
                { k: "importOutput.status", v: <StatusPill value={res.result.importOutput.status} kind={res.result.importOutput.status === "ok" ? "good" : "bad"} /> },
                { k: "importManifest.status", v: <StatusPill value={res.result.importManifest.status} kind={res.result.importManifest.status === "success" ? "good" : res.result.importManifest.status === "success_with_warnings" ? "warn" : "bad"} /> },
                { k: "previewPageCount", v: res.result.validationSummary.counts.previewPageCount },
                { k: "renderedPageCount", v: res.result.validationSummary.counts.renderedPageCount },
                {
                  k: "keyDiagnosticCodes",
                  v: <CodeList codes={res.result.validationSummary.diagnostics.keyCodes} />,
                },
                {
                  k: "blockedReasonCodes",
                  v: <CodeList codes={res.result.validationSummary.diagnostics.blockedReasonCodes} />,
                },
              ]}
            />

            <h3 style={{ margin: "14px 0 8px 0", fontSize: 14 }}>Artifact Availability</h3>
            <KeyValueTable rows={artifactRows(res.result.validationSummary.artifacts)} />

            <JsonDetails title="Raw JSON: validationSummary" value={res.result.validationSummary as unknown as JsonValue} />
            <JsonDetails title="Raw JSON: importManifest" value={res.result.importManifest as unknown as JsonValue} />
            <JsonDetails title="Raw JSON: importOutput (can be large)" value={res.result.importOutput as unknown as JsonValue} />
          </>
        ) : (
          <>
            <KeyValueTable
              rows={[
                { k: "fixtureId", v: res.fixtureId },
                { k: "overallStatus", v: <StatusPill value="failed_to_run" kind="bad" /> },
                { k: "error.message", v: res.error.message },
              ]}
            />
            {res.error.stack ? (
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer" }}>error.stack</summary>
                <pre style={{ marginTop: 10, padding: 10, background: "#111827", color: "#e5e7eb", borderRadius: 10, overflow: "auto" }}>
                  {res.error.stack}
                </pre>
              </details>
            ) : null}
          </>
        )}
      </Section>

      <Section title="Pipeline Stages">
        {res.ok ? (
          <>
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
                {stageRowsFromPipeline(res.result).map((r) => (
                  <tr key={r.stageId}>
                    <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                      {r.stageId}
                    </td>
                    <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>
                      <StatusPill
                        value={r.status}
                        kind={r.status === "success" ? "good" : r.status === "skipped" ? "warn" : "bad"}
                      />
                    </td>
                    <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>{r.diagCount}</td>
                    <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>{r.summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <JsonDetails title="Raw JSON: pipelineResult" value={res.result.pipelineResult as unknown as JsonValue} />
          </>
        ) : (
          <p style={{ margin: 0, color: "#6b7280" }}>Pipeline not available (validation run failed).</p>
        )}
      </Section>

      <Section title="Preview">
        {res.ok ? (
          <>
            <KeyValueTable
              rows={[
                { k: "previewDocument.status", v: <StatusPill value={res.result.previewDocument.status} kind={res.result.previewDocument.status === "ready" ? "good" : res.result.previewDocument.status === "ready_with_warnings" ? "warn" : "bad"} /> },
                { k: "pages.total", v: res.result.previewDocument.pages.length },
                { k: "pages.previewable", v: res.result.previewDocument.siteSummary.previewablePageCount },
                { k: "pages.notPreviewable", v: res.result.previewDocument.siteSummary.notPreviewablePageCount },
              ]}
            />

            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
              {res.result.previewDocument.pages.map((p, idx) => (
                <article key={p.previewPageId} style={{ border: "1px solid #f3f4f6", borderRadius: 10, padding: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                        [{idx + 1}/{res.result.previewDocument.pages.length}] {p.sourcePath}
                      </div>
                      <div style={{ marginTop: 4, color: "#4b5563", fontSize: 12 }}>
                        previewEligibility={p.previewEligibility} · previewNodeCount={p.previewNodeCount} · isEntry={String(p.isEntry)}
                      </div>
                    </div>
                    <div>{p.previewEligibility === "previewable" ? <StatusPill value="previewable" kind="good" /> : <StatusPill value="not_previewable" kind="warn" />}</div>
                  </div>

                  <div style={{ marginTop: 10, border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
                    <iframe
                      title={`preview:${p.sourcePath}`}
                      sandbox=""
                      srcDoc={p.preview.html}
                      style={{ width: "100%", height: 420, border: 0, background: "white" }}
                    />
                  </div>

                  <details style={{ marginTop: 10 }}>
                    <summary style={{ cursor: "pointer" }}>Page metadata</summary>
                    <pre style={{ marginTop: 10, padding: 10, background: "#f9fafb", borderRadius: 10, overflow: "auto", fontSize: 12 }}>
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
              ))}
            </div>

            <JsonDetails title="Raw JSON: previewDocument" value={res.result.previewDocument as unknown as JsonValue} />
          </>
        ) : (
          <p style={{ margin: 0, color: "#6b7280" }}>Preview not available (validation run failed).</p>
        )}
      </Section>

      <Section title="Approval / Execution">
        {res.ok ? (
          <>
            <KeyValueTable
              rows={[
                { k: "approval.status", v: <StatusPill value={res.result.approvalPackage.eligibility.status} kind={res.result.approvalPackage.eligibility.status === "approvable" ? "good" : res.result.approvalPackage.eligibility.status === "approvable_with_warnings" ? "warn" : "bad"} /> },
                { k: "approval.blockingReasons", v: res.result.approvalPackage.eligibility.blockingReasons.length },
                { k: "approval.warningCodes", v: <CodeList codes={res.result.approvalPackage.eligibility.warningCodes} /> },
                { k: "execution.planEligibility", v: <StatusPill value={res.result.executionPlan.eligibility.status} kind={res.result.executionPlan.eligibility.status === "eligible" ? "good" : "bad"} /> },
                { k: "execution.resultStatus", v: <StatusPill value={res.result.executionResult.status} kind={res.result.executionResult.status === "executed" ? "good" : res.result.executionResult.status === "executed_with_warnings" ? "warn" : res.result.executionResult.status === "blocked" ? "warn" : "bad"} /> },
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
                {res.result.executionPlan.steps.map((s) => (
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
                { k: "executedSteps", v: res.result.executionResult.executedSteps.length },
                { k: "skippedSteps", v: res.result.executionResult.skippedSteps.length },
                { k: "blockingReasonCodes", v: <CodeList codes={res.result.executionResult.blockingReasons} /> },
                { k: "warningCodes", v: <CodeList codes={res.result.executionResult.warningCodes} /> },
              ]}
            />

            <JsonDetails title="Raw JSON: approvalPackage" value={res.result.approvalPackage as unknown as JsonValue} />
            <JsonDetails title="Raw JSON: executionPlan" value={res.result.executionPlan as unknown as JsonValue} />
            <JsonDetails title="Raw JSON: executionResult" value={res.result.executionResult as unknown as JsonValue} />
          </>
        ) : (
          <p style={{ margin: 0, color: "#6b7280" }}>Approval/execution not available (validation run failed).</p>
        )}
      </Section>

      <Section title="Run Report Summary">
        {res.ok ? (
          <>
            <KeyValueTable
              rows={[
                { k: "overallStatus", v: <StatusPill value={res.result.migrationRunReport.overallStatus} kind={res.result.migrationRunReport.overallStatus === "success" ? "good" : res.result.migrationRunReport.overallStatus === "success_with_warnings" ? "warn" : res.result.migrationRunReport.overallStatus === "blocked" ? "warn" : "bad"} /> },
                { k: "eventCount", v: res.result.migrationRunReport.events.length },
                {
                  k: "diagnostics.warnings",
                  v: <CodeList codes={res.result.migrationRunReport.diagnostics.warnings.codes} />,
                },
                {
                  k: "diagnostics.blocking",
                  v: <CodeList codes={res.result.migrationRunReport.diagnostics.blocking.codes} />,
                },
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
                {res.result.migrationRunReport.stages.map((s) => (
                  <tr key={s.stageId}>
                    <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6", fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                      {s.stageId}
                    </td>
                    <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>
                      <StatusPill
                        value={s.status}
                        kind={s.status === "success" ? "good" : s.status === "success_with_warnings" ? "warn" : s.status === "skipped" ? "neutral" : "bad"}
                      />
                    </td>
                    <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>{s.diagnosticCodes.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <JsonDetails title="Raw JSON: migrationRunReport" value={res.result.migrationRunReport as unknown as JsonValue} />
          </>
        ) : (
          <p style={{ margin: 0, color: "#6b7280" }}>Run report not available (validation run failed).</p>
        )}
      </Section>
    </main>
  );
}
