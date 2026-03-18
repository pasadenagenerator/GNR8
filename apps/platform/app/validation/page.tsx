import type { CSSProperties, ReactNode } from "react";

import {
  PHASE1_VALIDATION_FIXTURE_ORDER,
  runValidationControlTower,
  type ValidationControlTowerRow,
} from "@/src/validation-shell/control-tower";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

function CodeList(props: { codes: string[] }) {
  if (props.codes.length === 0) return <span style={{ color: "#6b7280", fontSize: 12 }}>none</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {props.codes.map((code) => (
        <span key={code} style={pillStyle("neutral")}>
          {code}
        </span>
      ))}
    </div>
  );
}

function Cell(props: { children: ReactNode; mono?: boolean }) {
  return (
    <td
      style={{
        borderTop: "1px solid #e5e7eb",
        padding: "8px 10px",
        verticalAlign: "top",
        fontFamily: props.mono ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" : undefined,
        fontSize: 13,
      }}
    >
      {props.children}
    </td>
  );
}

function FailureRowDetails(props: { row: Extract<ValidationControlTowerRow, { kind: "failure" }> }) {
  return (
    <tr>
      <td colSpan={13} style={{ borderTop: "1px solid #e5e7eb", padding: "10px", background: "#fff7f7" }}>
        <div style={{ fontSize: 12, color: "#7f1d1d" }}>
          <strong>failure.message:</strong> {props.row.failure.message}
        </div>
        {props.row.failure.stack ? (
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: "pointer", fontSize: 12, color: "#7f1d1d" }}>failure.stack</summary>
            <pre style={{ marginTop: 8, padding: 8, borderRadius: 8, background: "#111827", color: "#e5e7eb", overflow: "auto", fontSize: 12 }}>
              {props.row.failure.stack}
            </pre>
          </details>
        ) : null}
      </td>
    </tr>
  );
}

function FixtureRow(props: { row: ValidationControlTowerRow }) {
  const { row } = props;
  return (
    <>
      <tr>
        <Cell mono>{row.fixtureId}</Cell>
        <Cell>
          <StatusPill value={row.overallValidationStatus} kind={row.kind === "failure" ? "bad" : undefined} />
        </Cell>
        <Cell>
          <StatusPill value={row.importManifestStatus} kind={row.kind === "failure" ? "bad" : undefined} />
        </Cell>
        <Cell>
          <StatusPill value={row.pipelineStatus} kind={row.kind === "failure" ? "bad" : undefined} />
        </Cell>
        <Cell>
          <StatusPill value={row.previewStatus} kind={row.kind === "failure" ? "bad" : undefined} />
        </Cell>
        <Cell>
          <StatusPill value={row.approvalStatus} kind={row.kind === "failure" ? "bad" : undefined} />
        </Cell>
        <Cell>
          <StatusPill value={row.executionStatus} kind={row.kind === "failure" ? "bad" : undefined} />
        </Cell>
        <Cell>
          <StatusPill value={row.runReportOverallStatus} kind={row.kind === "failure" ? "bad" : undefined} />
        </Cell>
        <Cell mono>{row.previewPageCount ?? "n/a"}</Cell>
        <Cell mono>{row.renderedPageCount ?? "n/a"}</Cell>
        <Cell>{row.kind === "failure" ? <span style={{ color: "#6b7280", fontSize: 12 }}>n/a</span> : <CodeList codes={row.keyDiagnosticCodes} />}</Cell>
        <Cell>
          <a href={row.fixtureRoute} style={{ color: "#1d4ed8" }}>
            fixture page
          </a>
        </Cell>
        <Cell>
          <a href={row.fixtureApiRoute} style={{ color: "#1d4ed8" }}>
            fixture api
          </a>
        </Cell>
      </tr>
      {row.kind === "failure" ? <FailureRowDetails row={row} /> : null}
    </>
  );
}

export default async function ValidationComparisonIndexPage() {
  const rows = await runValidationControlTower({ requestIdPrefix: "validation-control-tower-page" });
  const failedCount = rows.filter((row) => row.kind === "failure").length;

  return (
    <main
      style={{
        padding: 18,
        maxWidth: 1800,
        margin: "0 auto",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        background: "#f3f6fb",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 20 }}>Temporary Phase-1 Validation Comparison Control Tower</h1>
      <p style={{ margin: "8px 0 0 0", color: "#4b5563" }}>
        Summary-first deterministic comparison for fixed fixtures only:{" "}
        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
          {PHASE1_VALIDATION_FIXTURE_ORDER.join(", ")}
        </span>
        .
      </p>
      <p style={{ margin: "8px 0 0 0", color: "#4b5563" }}>
        Beta operator export flow:{" "}
        <a href="/validation/beta-export-operator" style={{ color: "#1d4ed8" }}>
          /validation/beta-export-operator
        </a>
      </p>
      <p style={{ margin: "8px 0 0 0", color: "#4b5563" }}>
        URL import operator flow:{" "}
        <a href="/validation/url-import-operator" style={{ color: "#1d4ed8" }}>
          /validation/url-import-operator
        </a>
      </p>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, padding: 14, marginTop: 12, background: "#ffffff" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <StatusPill value="temporary-shell" kind="neutral" />
          <StatusPill value={`fixtures=${rows.length}`} kind="neutral" />
          <StatusPill value={`failed=${failedCount}`} kind={failedCount > 0 ? "bad" : "good"} />
        </div>

        <div style={{ marginTop: 10, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1460, background: "#ffffff" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12 }}>fixture id</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12 }}>overall</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12 }}>import manifest</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12 }}>pipeline</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12 }}>preview</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12 }}>approval</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12 }}>execution</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12 }}>run report</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12 }}>preview pages</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12 }}>rendered pages</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12 }}>key diagnostic codes</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12 }}>fixture page</th>
                <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 12 }}>fixture api</th>
              </tr>
            </thead>
            <tbody>{rows.map((row) => <FixtureRow key={row.fixtureId} row={row} />)}</tbody>
          </table>
        </div>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, padding: 14, marginTop: 12, background: "#ffffff" }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Implementation Notes</h2>
        <ul style={{ margin: "10px 0 0 18px", color: "#374151" }}>
          <li>
            Route path: <code>/validation</code>
          </li>
          <li>
            Fixture order: <code>{PHASE1_VALIDATION_FIXTURE_ORDER.join(" -> ")}</code>
          </li>
          <li>
            Summary fields: fixture id, overall, import manifest, pipeline, preview, approval, execution, run report overall, preview/rendered
            counts, key diagnostic codes, fixture links (page + API)
          </li>
          <li>
            Fixture gathering: server-side via <code>runValidationControlTower</code>, which calls the existing deterministic{" "}
            <code>runValidationShellForFixture</code> flow for each explicit fixture id
          </li>
          <li>
            Per-fixture failures: represented as a <code>failed_to_run</code> row with stable links, <code>n/a</code> counts/codes, and
            structured <code>failure.message</code>/<code>failure.stack</code> details
          </li>
        </ul>
      </section>
    </main>
  );
}
