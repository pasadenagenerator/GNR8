import type { CSSProperties, ReactNode } from "react";

import type { ExecutionMode } from "@/gnr8/migration/execution-plan-model";
import type { ValidationFixtureId } from "@/gnr8/validation/validation-contract";
import {
  BETA_EXPORT_OPERATOR_EXECUTION_MODES,
  BETA_EXPORT_OPERATOR_FIXTURE_ORDER,
  runBetaExportOperatorFlow,
  type BetaExportOperatorResponse,
} from "@/src/validation-shell/beta-export-operator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;
type PillKind = "neutral" | "good" | "warn" | "bad";

function pickParam(params: SearchParams, key: string): string | null {
  const raw = params[key];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return typeof raw[0] === "string" ? raw[0] : null;
  return null;
}

function asFixtureId(value: string | null): ValidationFixtureId {
  return BETA_EXPORT_OPERATOR_FIXTURE_ORDER.includes(value as ValidationFixtureId)
    ? (value as ValidationFixtureId)
    : BETA_EXPORT_OPERATOR_FIXTURE_ORDER[0];
}

function asExecutionMode(value: string | null): ExecutionMode {
  return BETA_EXPORT_OPERATOR_EXECUTION_MODES.includes(value as ExecutionMode)
    ? (value as ExecutionMode)
    : BETA_EXPORT_OPERATOR_EXECUTION_MODES[0];
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

function KeyValueTable(props: { rows: { k: string; v: ReactNode }[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        {props.rows.map((r) => (
          <tr key={r.k}>
            <td style={{ width: 300, verticalAlign: "top", padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>
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
        minWidth: 180,
      }}
    >
      <div style={{ fontSize: 11, color: "#4b5563" }}>{props.label}</div>
      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600 }}>{props.value}</div>
    </div>
  );
}

function ResultPanel(props: { response: BetaExportOperatorResponse }) {
  if (!props.response.ok) {
    return (
      <Section title="Run Result" summary={<StatusPill value="failed_to_run" kind="bad" />}>
        <KeyValueTable
          rows={[
            { k: "fixtureId", v: props.response.fixtureId },
            { k: "executionMode", v: props.response.executionMode },
            { k: "fixtureRoute", v: <a href={props.response.fixtureRoute}>{props.response.fixtureRoute}</a> },
            { k: "fixtureApiRoute", v: <a href={props.response.fixtureApiRoute}>{props.response.fixtureApiRoute}</a> },
            { k: "failure.message", v: props.response.error.message },
            { k: "failure.stack", v: props.response.error.stack ?? "n/a" },
          ]}
        />
      </Section>
    );
  }

  const result = props.response.result;
  const summary = props.response.summary;
  const materialization = result.executionResult.materialization;
  const previewHosting = result.executionResult.previewHosting;
  const warningCodes = sortedUnique(summary.warningCodes);
  const blockingReasonCodes = sortedUnique(summary.blockingReasonCodes);

  return (
    <>
      <Section
        title="Run Summary"
        summary={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusPill value={props.response.executionMode} kind={props.response.executionMode === "materialize" ? "warn" : "neutral"} />
            <StatusPill value={summary.overallValidationStatus} />
            <StatusPill value={summary.executionStatus} />
          </div>
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <SummaryCard label="fixture" value={props.response.fixtureId} kind="neutral" />
          <SummaryCard
            label="mode"
            value={props.response.executionMode}
            kind={props.response.executionMode === "materialize" ? "warn" : "neutral"}
          />
          <SummaryCard label="validation" value={<StatusPill value={summary.overallValidationStatus} />} kind={statusKindFromString(summary.overallValidationStatus)} />
          <SummaryCard label="approval" value={<StatusPill value={summary.approvalStatus} />} kind={statusKindFromString(summary.approvalStatus)} />
          <SummaryCard label="execution" value={<StatusPill value={summary.executionStatus} />} kind={statusKindFromString(summary.executionStatus)} />
          <SummaryCard label="warnings" value={warningCodes.length} kind={warningCodes.length > 0 ? "warn" : "good"} />
          <SummaryCard label="blocking reasons" value={blockingReasonCodes.length} kind={blockingReasonCodes.length > 0 ? "bad" : "good"} />
        </div>

        <KeyValueTable
          rows={[
            { k: "selected.fixtureId", v: props.response.fixtureId },
            { k: "selected.executionMode", v: props.response.executionMode },
            { k: "validation.overallStatus", v: <StatusPill value={summary.overallValidationStatus} /> },
            { k: "approval.status", v: <StatusPill value={summary.approvalStatus} /> },
            { k: "execution.planEligibility", v: <StatusPill value={summary.executionPlanEligibility} /> },
            { k: "execution.status", v: <StatusPill value={summary.executionStatus} /> },
            { k: "fixture.sourceRootPath", v: props.response.fixtureRootDirAbs },
            { k: "fixture.detailPage", v: <a href={props.response.fixtureRoute}>{props.response.fixtureRoute}</a> },
            { k: "fixture.validationApi", v: <a href={props.response.fixtureApiRoute}>{props.response.fixtureApiRoute}</a> },
            { k: "warningCodes", v: <CodeList codes={warningCodes} /> },
            { k: "blockingReasonCodes", v: <CodeList codes={blockingReasonCodes} /> },
          ]}
        />
      </Section>

      <Section
        title="Materialization Output"
        summary={
          props.response.executionMode === "simulation" ? (
            <StatusPill value="simulation_no_real_bundle_write" kind="neutral" />
          ) : (
            <StatusPill value={materialization.status} />
          )
        }
      >
        <KeyValueTable
          rows={[
            { k: "executionMode", v: props.response.executionMode },
            { k: "materialization.status", v: <StatusPill value={materialization.status} /> },
            { k: "materialization.outputLocationRule", v: materialization.outputLocationRule },
            { k: "materialization.outputRootPath", v: materialization.outputRootPath ?? "n/a" },
            { k: "materialization.bundleRef", v: materialization.bundleRef ? `${materialization.bundleRef.kind}@${materialization.bundleRef.version}` : "n/a" },
            { k: "summary.pageFileCount", v: materialization.summary.pageFileCount },
            { k: "summary.writtenPageCount", v: materialization.summary.writtenPageCount },
            { k: "summary.nonRenderablePageCount", v: materialization.summary.nonRenderablePageCount },
            { k: "summary.failedPageCount", v: materialization.summary.failedPageCount },
            { k: "summary.assetFileCount", v: materialization.summary.assetFileCount },
            { k: "summary.copiedAssetCount", v: materialization.summary.copiedAssetCount },
            { k: "summary.missingAssetCount", v: materialization.summary.missingAssetCount },
            { k: "summary.skippedAssetCount", v: materialization.summary.skippedAssetCount },
            { k: "summary.failedAssetCount", v: materialization.summary.failedAssetCount },
            { k: "materialization.warningCodes", v: <CodeList codes={materialization.warningCodes} /> },
            { k: "materialization.errorCodes", v: <CodeList codes={materialization.errorCodes} /> },
            { k: "previewHosting.status", v: <StatusPill value={previewHosting.status} /> },
            { k: "previewHosting.available", v: String(previewHosting.available) },
            { k: "previewHosting.routeRule", v: previewHosting.routeRule },
            {
              k: "previewHosting.previewEntryUrl (primary)",
              v: previewHosting.previewEntryUrl ? <a href={previewHosting.previewEntryUrl}>{previewHosting.previewEntryUrl}</a> : "n/a",
            },
            {
              k: "previewHosting.previewRootUrl (secondary/technical)",
              v: previewHosting.previewRootUrl ? <a href={previewHosting.previewRootUrl}>{previewHosting.previewRootUrl}</a> : "n/a",
            },
            { k: "previewHosting.previewStorageKind", v: previewHosting.previewStorageKind },
            { k: "previewHosting.previewStorageKey", v: previewHosting.previewStorageKey ?? "n/a" },
            { k: "previewHosting.reasonCode", v: previewHosting.reasonCode ?? "n/a" },
          ]}
        />
      </Section>
    </>
  );
}

export default async function BetaExportOperatorPage(props: { searchParams: Promise<SearchParams> }) {
  const searchParams = await props.searchParams;
  const selectedFixtureId = asFixtureId(pickParam(searchParams, "fixtureId"));
  const selectedExecutionMode = asExecutionMode(pickParam(searchParams, "executionMode"));
  const run = pickParam(searchParams, "run") === "1";

  const response = run
    ? await runBetaExportOperatorFlow({
        fixtureId: selectedFixtureId,
        executionMode: selectedExecutionMode,
      })
    : null;

  return (
    <main
      style={{
        padding: 18,
        maxWidth: 1300,
        margin: "0 auto",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        background: "#f3f6fb",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 20 }}>Beta Export Operator Flow (Internal)</h1>
      <p style={{ margin: "8px 0 0 0", color: "#4b5563" }}>
        Internal deterministic operator console for controlled landing-page beta exports. Explicit fixtures only. No arbitrary upload, no ZIP,
        no deployment integration.
      </p>
      <p style={{ margin: "8px 0 0 0", color: "#4b5563" }}>
        URL import operator flow:{" "}
        <a href="/validation/url-import-operator" style={{ color: "#1d4ed8" }}>
          /validation/url-import-operator
        </a>
      </p>

      <Section title="Run Export">
        <form method="get" action="/validation/beta-export-operator" style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#374151" }}>Fixture</span>
            <select name="fixtureId" defaultValue={selectedFixtureId} style={{ minWidth: 180, padding: "6px 8px" }}>
              {BETA_EXPORT_OPERATOR_FIXTURE_ORDER.map((fixtureId) => (
                <option key={fixtureId} value={fixtureId}>
                  {fixtureId}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#374151" }}>Execution Mode</span>
            <select name="executionMode" defaultValue={selectedExecutionMode} style={{ minWidth: 180, padding: "6px 8px" }}>
              {BETA_EXPORT_OPERATOR_EXECUTION_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>

          <input type="hidden" name="run" value="1" />
          <button type="submit" style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #9ca3af", background: "#ffffff" }}>
            Run Export
          </button>
        </form>
      </Section>

      {response ? <ResultPanel response={response} /> : null}

      <Section title="Implementation Notes">
        <ul style={{ margin: "10px 0 0 18px", color: "#374151" }}>
          <li>
            Route path: <code>/validation/beta-export-operator</code>
          </li>
          <li>
            Trigger: server-rendered page submit (<code>GET</code>) runs <code>runBetaExportOperatorFlow</code>, which calls existing deterministic{" "}
            <code>runRealSiteValidation</code> and phase-1 approve → execute runtime.
          </li>
          <li>
            Supported fixtures: <code>{BETA_EXPORT_OPERATOR_FIXTURE_ORDER.join(", ")}</code>.
          </li>
          <li>
            Execution mode: explicit operator selection of <code>simulation</code> vs <code>materialize</code>, clearly labeled in result summary.
          </li>
          <li>
            Temporary preview route structure: <code>/validation/previews/by-output/&lt;previewKey&gt;/&lt;bundle-path&gt;</code> (entry:
            <code>/validation/previews/by-output/&lt;previewKey&gt;/index.html</code>).
          </li>
          <li>
            Preview URL rule: deterministic <code>previewKey</code> derived from materialized <code>outputRootPath</code>. The same output root maps
            to the same preview URL.
          </li>
          <li>
            Safe bundle serving: preview handler decodes <code>previewKey</code>, resolves only under controlled <code>.gnr8-static-output</code> bundle
            roots, blocks traversal, and returns structured 404 JSON for missing bundles/files.
          </li>
          <li>
            Execution results now surface preview metadata in <code>executionResult.previewHosting</code>:
            <code>status</code>, <code>available</code>, <code>previewRootUrl</code>, and <code>previewEntryUrl</code>.
          </li>
          <li>
            Current temporary limitations: internal-only previewing, no long-term hosting guarantees, no ZIP export download, and no deployment/CDN
            integration.
          </li>
        </ul>
      </Section>
    </main>
  );
}
