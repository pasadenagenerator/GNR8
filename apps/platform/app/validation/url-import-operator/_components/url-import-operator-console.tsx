"use client";

import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";

type ExecutionMode = "simulation" | "materialize";
type PillKind = "neutral" | "good" | "warn" | "bad";

type PageMigrationGate = {
  state: string;
  score: number;
  reasons: string[];
  weakSectionIds: string[];
  anomalySummary: string[];
  recommendedAction: string;
};

type PageRolloutPolicy = {
  state: string;
  reasons: string[];
  recommendedNextStep: string;
  requiresOperatorReview: boolean;
  allowsShadow: boolean;
  allowsCanary: boolean;
  allowsProductionConsideration: boolean;
  recommendsAiRemediation: boolean;
};

type SiteMigrationGate = {
  state: string;
  score: number;
  pageStates: Array<{ pageId: string; sourcePath: string; isRoot: boolean; state: string; score: number }>;
  blockingPages: string[];
  summaryReasons: string[];
  recommendedAction: string;
};

type SiteRolloutPolicy = {
  state: string;
  reasons: string[];
  blockingPages: string[];
  recommendedNextStep: string;
  requiresOperatorReview: boolean;
  allowsShadow: boolean;
  allowsCanary: boolean;
  allowsProductionConsideration: boolean;
  recommendsAiRemediation: boolean;
};

type EnforcementAdapterDecision = {
  stage: "shadow" | "canary" | "production";
  decision: "ALLOW" | "REVIEW_ONLY" | "DENY";
  reasons: string[];
  blockingPages: string[];
  requiresOperatorReview: boolean;
  enforcementSource: {
    gateState: { page: string[]; site: string };
    rolloutPolicyState: { page: string[]; site: string };
    enforcementState: { page: string[]; site: string };
  };
};

type PageReviewRecord = {
  pageId: string;
  sourcePath: string;
  isRoot: boolean;
  title: string | null;
  pageStructuralConfidence: number;
  weakSectionIds: string[];
  structuralAnomalies: string[];
  pageMigrationGate: PageMigrationGate;
  pageRolloutPolicy: PageRolloutPolicy;
  pageEnforcement: {
    SHADOW: { decision: string; recommendedNextStep: string; blockingReasons: string[] };
    CANARY: { decision: string; recommendedNextStep: string; blockingReasons: string[] };
    PRODUCTION: { decision: string; recommendedNextStep: string; blockingReasons: string[] };
  };
  weakSectionDetails: Array<{
    sectionId: string;
    intent: string | null;
    structuralConfidence: number | null;
    confidenceComponents: Record<string, unknown> | null;
    anomalies: string[];
  }>;
};

type CompareStructureSummary = {
  detectedRegions: string[];
  regionOrder: string[];
  regionCounts: Record<string, number>;
  regionConfidence: Record<string, number>;
  sectionCount: number;
};

type PrimaryPageCompareEvidence = {
  pageId: string;
  sourcePath: string;
  isRoot: boolean;
  sourceSnapshotHtml: string;
  migratedPreviewHtml: string | null;
  sourceStructure: CompareStructureSummary;
  migratedStructure: CompareStructureSummary;
  mismatchFlags: string[];
  mismatchReasons: string[];
};

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
    sourceMode: "raw_html" | "rendered_dom";
    responseHtmlPathAbs: string;
    entryHtmlPathAbs: string;
    assetsDirAbs: string;
    renderedCapture: {
      status: "available" | "unavailable" | "failed";
      documents: Array<{ htmlPathAbs: string }>;
      screenshots: Array<{ filePathAbs: string; captureType: string }>;
      computedStyleSamples: Array<{ sampleId: string; target: string }>;
    };
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
    pageReview: PageReviewRecord[];
    compareEvidence: {
      primaryPage: PrimaryPageCompareEvidence | null;
    };
    enforcementAdapterByStage: {
      SHADOW: EnforcementAdapterDecision;
      CANARY: EnforcementAdapterDecision;
      PRODUCTION: EnforcementAdapterDecision;
    };
    publishStageEligibility: {
      shadow: boolean;
      canary: boolean;
      production: boolean;
    };
    siteMigrationGate: SiteMigrationGate;
    siteRolloutPolicy: SiteRolloutPolicy;
    siteEnforcement: {
      SHADOW: { decision: string; blockingReasons: string[] };
      CANARY: { decision: string; blockingReasons: string[] };
      PRODUCTION: { decision: string; blockingReasons: string[] };
    };
  };
  summary: {
    importStatus: string;
    pipelineStatus: string;
    approvalStatus: string;
    executionPlanEligibility: string;
    executionStatus: string;
    reportStatus: string;
    renderedCaptureStatus: "available" | "partial" | "unavailable" | "failed";
    renderedDomCaptured: boolean;
    screenshotCount: number;
    computedStyleSampleCount: number;
    structureSourceMode: "raw_html" | "rendered_dom";
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
    sourceMode: "raw_html" | "rendered_dom" | null;
    responseHtmlPathAbs: string | null;
    entryHtmlPathAbs: string | null;
    assetsDirAbs: string | null;
    renderedCapture: {
      status: "available" | "partial" | "unavailable" | "failed";
      documents: Array<{ htmlPathAbs: string }>;
      screenshots: Array<{ filePathAbs: string; captureType: string }>;
      computedStyleSamples: Array<{ sampleId: string; target: string }>;
    } | null;
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
  const upper = status.toUpperCase();
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
    status === "true" ||
    upper === "SHADOW_READY" ||
    upper === "CANARY_CANDIDATE" ||
    upper === "PRODUCTION_CANDIDATE" ||
    upper === "SITE_SHADOW_READY" ||
    upper === "SITE_CANARY_READY" ||
    upper === "SITE_PRODUCTION_READY" ||
    upper === "ALLOW" ||
    upper === "SHADOW_ALLOWED" ||
    upper === "SHADOW_RECOMMENDED" ||
    upper === "CANARY_ALLOWED" ||
    upper === "SITE_SHADOW_ALLOWED" ||
    upper === "SITE_SHADOW_RECOMMENDED" ||
    upper === "SITE_CANARY_ALLOWED"
  ) {
    return "good";
  }

  if (
    status.includes("warning") ||
    status === "partial" ||
    status === "skipped" ||
    status === "not_run" ||
    upper === "REVIEW_ONLY" ||
    upper === "LOW_CONFIDENCE" ||
    upper === "REVIEW_REQUIRED" ||
    upper === "SITE_REVIEW_REQUIRED"
  ) {
    return "warn";
  }
  if (status === "blocked" || upper === "BROKEN" || upper === "SITE_BROKEN" || upper === "BLOCKED" || upper === "SITE_BLOCKED" || upper === "DENY")
    return "bad";
  if (
    status.includes("fail") ||
    status.includes("error") ||
    status === "false" ||
    status === "missing" ||
    upper === "PRODUCTION_DISALLOWED" ||
    upper === "SITE_PRODUCTION_DISALLOWED"
  ) {
    return "bad";
  }

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

function BooleanPill(props: { value: boolean }) {
  return <StatusPill value={String(props.value)} kind={props.value ? "good" : "neutral"} />;
}

function ReasonList(props: { reasons: string[] }) {
  const reasons = sortedUnique(props.reasons);
  if (reasons.length === 0) return <span style={{ color: "#6b7280" }}>none</span>;

  return (
    <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
      {reasons.map((reason) => (
        <li key={reason}>
          <code>{reason}</code>
        </li>
      ))}
    </ul>
  );
}

function StructureSummaryTable(props: { summary: CompareStructureSummary }) {
  return (
    <KeyValueTable
      rows={[
        { k: "sectionCount", v: props.summary.sectionCount },
        { k: "detectedRegions", v: <CodeList codes={props.summary.detectedRegions} /> },
        { k: "regionOrder", v: <CodeList codes={props.summary.regionOrder} /> },
        { k: "regionCounts", v: <code>{stableStringify(props.summary.regionCounts)}</code> },
        { k: "regionConfidence", v: <code>{stableStringify(props.summary.regionConfidence)}</code> },
      ]}
    />
  );
}

function formatScore(value: number): string {
  if (!Number.isFinite(value)) return "n/a";
  return value.toFixed(3);
}

function primaryPageReview(pages: PageReviewRecord[]): PageReviewRecord | null {
  if (pages.length === 0) return null;
  const root = pages.find((page) => page.isRoot);
  if (root) return root;
  return pages.slice().sort((a, b) => a.sourcePath.localeCompare(b.sourcePath) || a.pageId.localeCompare(b.pageId))[0] ?? null;
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
              { k: "snapshot.sourceMode", v: props.response.snapshot.sourceMode ?? "n/a" },
              { k: "snapshot.responseHtmlPathAbs", v: props.response.snapshot.responseHtmlPathAbs ?? "n/a" },
              { k: "snapshot.entryHtmlPathAbs", v: props.response.snapshot.entryHtmlPathAbs ?? "n/a" },
              { k: "snapshot.assetsDirAbs", v: props.response.snapshot.assetsDirAbs ?? "n/a" },
              { k: "snapshot.renderedCaptureStatus", v: props.response.snapshot.renderedCapture?.status ?? "n/a" },
              { k: "snapshot.renderedDocumentCount", v: props.response.snapshot.renderedCapture?.documents.length ?? "n/a" },
              { k: "snapshot.screenshotCount", v: props.response.snapshot.renderedCapture?.screenshots.length ?? "n/a" },
              { k: "snapshot.computedStyleSampleCount", v: props.response.snapshot.renderedCapture?.computedStyleSamples.length ?? "n/a" },
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
  const siteGate = props.response.result.siteMigrationGate;
  const sitePolicy = props.response.result.siteRolloutPolicy;
  const enforcementAdapter = props.response.result.enforcementAdapterByStage;
  const publishStageEligibility = props.response.result.publishStageEligibility;
  const pageReviews = props.response.result.pageReview ?? [];
  const primaryPage = primaryPageReview(pageReviews);
  const primaryCompare = props.response.result.compareEvidence?.primaryPage ?? null;
  const isBlocked =
    props.response.summary.approvalStatus === "blocked" ||
    props.response.summary.executionPlanEligibility === "blocked" ||
    props.response.summary.executionStatus === "blocked" ||
    blockingReasonCodes.length > 0;
  const isWarningMode = !isBlocked && (warningCodes.length > 0 || props.response.summary.executionStatus.includes("warning"));
  const explainabilityReasons = sortedUnique([
    ...(primaryPage?.pageMigrationGate.reasons.map((reason) => `pageMigrationGate:${reason}`) ?? []),
    ...(primaryPage?.pageRolloutPolicy.reasons.map((reason) => `pageRolloutPolicy:${reason}`) ?? []),
    ...siteGate.summaryReasons.map((reason) => `siteMigrationGate:${reason}`),
    ...sitePolicy.reasons.map((reason) => `siteRolloutPolicy:${reason}`),
  ]);
  const weakAndAnomalyRows = pageReviews.flatMap((page) => {
    const weakRows = page.weakSectionDetails.map((weak) => ({
      key: `weak:${page.pageId}:${weak.sectionId}`,
      pagePath: page.sourcePath,
      kind: "weak_section",
      sectionId: weak.sectionId,
      intent: weak.intent ?? "unknown",
      structuralConfidence: weak.structuralConfidence === null ? "n/a" : formatScore(weak.structuralConfidence),
      confidenceComponents: weak.confidenceComponents ? stableStringify(weak.confidenceComponents) : "n/a",
      anomalies: weak.anomalies.length > 0 ? weak.anomalies.join(", ") : "none",
    }));

    const anomalyRows = page.structuralAnomalies.map((anomaly) => ({
      key: `anomaly:${page.pageId}:${anomaly}`,
      pagePath: page.sourcePath,
      kind: "structural_anomaly",
      sectionId: "n/a",
      intent: "n/a",
      structuralConfidence: "n/a",
      confidenceComponents: "n/a",
      anomalies: anomaly,
    }));

    return [...weakRows, ...anomalyRows];
  });

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
          <SummaryCard label="capture source" value={<StatusPill value={props.response.summary.structureSourceMode} />} kind={props.response.summary.structureSourceMode === "rendered_dom" ? "good" : "warn"} />
          <SummaryCard label="capture status" value={<StatusPill value={props.response.summary.renderedCaptureStatus} />} kind={statusKindFromString(props.response.summary.renderedCaptureStatus)} />
          <SummaryCard label="screenshots" value={props.response.summary.screenshotCount} kind={props.response.summary.screenshotCount > 0 ? "good" : "warn"} />
          <SummaryCard label="style samples" value={props.response.summary.computedStyleSampleCount} kind={props.response.summary.computedStyleSampleCount > 0 ? "good" : "warn"} />
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
            { k: "renderedCapture.status", v: <StatusPill value={props.response.summary.renderedCaptureStatus} /> },
            { k: "structureSourceMode", v: <StatusPill value={props.response.summary.structureSourceMode} /> },
            { k: "renderedDomCaptured", v: <BooleanPill value={props.response.summary.renderedDomCaptured} /> },
            { k: "screenshotCount", v: props.response.summary.screenshotCount },
            { k: "computedStyleSampleCount", v: props.response.summary.computedStyleSampleCount },
            { k: "warningCodes", v: <CodeList codes={warningCodes} /> },
            { k: "blockingReasonCodes", v: <CodeList codes={blockingReasonCodes} /> },
          ]}
        />
      </Section>

      <Section
        title="Site-Level Quality + Policy"
        summary={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatusPill value={siteGate.state} />
            <StatusPill value={sitePolicy.state} />
            <StatusPill value={sitePolicy.recommendedNextStep} kind="warn" />
          </div>
        }
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <SummaryCard label="siteMigrationGate.state" value={<StatusPill value={siteGate.state} />} kind={statusKindFromString(siteGate.state)} />
          <SummaryCard label="siteRolloutPolicy.state" value={<StatusPill value={sitePolicy.state} />} kind={statusKindFromString(sitePolicy.state)} />
          <SummaryCard label="adapter.shadow" value={<StatusPill value={enforcementAdapter.SHADOW.decision} />} kind={statusKindFromString(enforcementAdapter.SHADOW.decision)} />
          <SummaryCard label="adapter.canary" value={<StatusPill value={enforcementAdapter.CANARY.decision} />} kind={statusKindFromString(enforcementAdapter.CANARY.decision)} />
          <SummaryCard
            label="adapter.production"
            value={<StatusPill value={enforcementAdapter.PRODUCTION.decision} />}
            kind={statusKindFromString(enforcementAdapter.PRODUCTION.decision)}
          />
          <SummaryCard label="overall score" value={formatScore(siteGate.score)} kind={siteGate.score >= 0.72 ? "good" : siteGate.score >= 0.5 ? "warn" : "bad"} />
          <SummaryCard
            label="recommendedNextStep"
            value={<StatusPill value={sitePolicy.recommendedNextStep} kind="warn" />}
            kind={sitePolicy.recommendedNextStep === "CANARY_REVIEW" || sitePolicy.recommendedNextStep === "SHADOW_VALIDATE" ? "good" : "warn"}
          />
          <SummaryCard label="blockingPages" value={sitePolicy.blockingPages.length} kind={sitePolicy.blockingPages.length > 0 ? "bad" : "good"} />
        </div>
        <KeyValueTable
          rows={[
            { k: "siteMigrationGate.state", v: <StatusPill value={siteGate.state} /> },
            { k: "siteRolloutPolicy.state", v: <StatusPill value={sitePolicy.state} /> },
            { k: "siteMigrationGate.score", v: formatScore(siteGate.score) },
            { k: "recommendedNextStep", v: <StatusPill value={sitePolicy.recommendedNextStep} kind="warn" /> },
            { k: "allowsShadow", v: <BooleanPill value={sitePolicy.allowsShadow} /> },
            { k: "allowsCanary", v: <BooleanPill value={sitePolicy.allowsCanary} /> },
            { k: "allowsProductionConsideration", v: <BooleanPill value={sitePolicy.allowsProductionConsideration} /> },
            { k: "requiresOperatorReview", v: <BooleanPill value={sitePolicy.requiresOperatorReview} /> },
            { k: "blockingPages.count", v: sitePolicy.blockingPages.length },
            { k: "blockingPages", v: <CodeList codes={sitePolicy.blockingPages} /> },
            { k: "siteMigrationGate.summaryReasons", v: <ReasonList reasons={siteGate.summaryReasons} /> },
            { k: "siteRolloutPolicy.reasons", v: <ReasonList reasons={sitePolicy.reasons} /> },
            { k: "enforcementAdapter.SHADOW.decision", v: <StatusPill value={enforcementAdapter.SHADOW.decision} /> },
            { k: "enforcementAdapter.CANARY.decision", v: <StatusPill value={enforcementAdapter.CANARY.decision} /> },
            { k: "enforcementAdapter.PRODUCTION.decision", v: <StatusPill value={enforcementAdapter.PRODUCTION.decision} /> },
            { k: "publishStageEligibility.shadow", v: <BooleanPill value={publishStageEligibility.shadow} /> },
            { k: "publishStageEligibility.canary", v: <BooleanPill value={publishStageEligibility.canary} /> },
            { k: "publishStageEligibility.production", v: <BooleanPill value={publishStageEligibility.production} /> },
            { k: "enforcementAdapter.SHADOW.reasons", v: <ReasonList reasons={enforcementAdapter.SHADOW.reasons} /> },
            { k: "enforcementAdapter.CANARY.reasons", v: <ReasonList reasons={enforcementAdapter.CANARY.reasons} /> },
            { k: "enforcementAdapter.PRODUCTION.reasons", v: <ReasonList reasons={enforcementAdapter.PRODUCTION.reasons} /> },
          ]}
        />
      </Section>

      <Section
        title="Page-Level Quality + Policy"
        summary={
          primaryPage ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <StatusPill value={primaryPage.pageMigrationGate.state} />
              <StatusPill value={primaryPage.pageRolloutPolicy.state} />
              <StatusPill value={primaryPage.pageRolloutPolicy.recommendedNextStep} kind="warn" />
            </div>
          ) : (
            <span style={{ color: "#6b7280" }}>No page diagnostics available</span>
          )
        }
      >
        {primaryPage ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <SummaryCard
                label="pageStructuralConfidence"
                value={formatScore(primaryPage.pageStructuralConfidence)}
                kind={
                  primaryPage.pageStructuralConfidence >= 0.72 ? "good" : primaryPage.pageStructuralConfidence >= 0.5 ? "warn" : "bad"
                }
              />
              <SummaryCard
                label="pageMigrationGate.state"
                value={<StatusPill value={primaryPage.pageMigrationGate.state} />}
                kind={statusKindFromString(primaryPage.pageMigrationGate.state)}
              />
              <SummaryCard
                label="pageRolloutPolicy.state"
                value={<StatusPill value={primaryPage.pageRolloutPolicy.state} />}
                kind={statusKindFromString(primaryPage.pageRolloutPolicy.state)}
              />
              <SummaryCard
                label="recommendedNextStep"
                value={<StatusPill value={primaryPage.pageRolloutPolicy.recommendedNextStep} kind="warn" />}
                kind={primaryPage.pageRolloutPolicy.recommendedNextStep === "CANARY_REVIEW" ? "good" : "warn"}
              />
            </div>
            <KeyValueTable
              rows={[
                { k: "page.sourcePath", v: primaryPage.sourcePath },
                { k: "page.title", v: primaryPage.title ?? "n/a" },
                { k: "pageStructuralConfidence", v: formatScore(primaryPage.pageStructuralConfidence) },
                { k: "pageMigrationGate.state", v: <StatusPill value={primaryPage.pageMigrationGate.state} /> },
                { k: "pageMigrationGate.score", v: formatScore(primaryPage.pageMigrationGate.score) },
                { k: "pageRolloutPolicy.state", v: <StatusPill value={primaryPage.pageRolloutPolicy.state} /> },
                { k: "recommendedNextStep", v: <StatusPill value={primaryPage.pageRolloutPolicy.recommendedNextStep} kind="warn" /> },
                { k: "requiresOperatorReview", v: <BooleanPill value={primaryPage.pageRolloutPolicy.requiresOperatorReview} /> },
                { k: "allowsShadow", v: <BooleanPill value={primaryPage.pageRolloutPolicy.allowsShadow} /> },
                { k: "allowsCanary", v: <BooleanPill value={primaryPage.pageRolloutPolicy.allowsCanary} /> },
                { k: "allowsProductionConsideration", v: <BooleanPill value={primaryPage.pageRolloutPolicy.allowsProductionConsideration} /> },
                { k: "weakSectionIds", v: <CodeList codes={primaryPage.weakSectionIds} /> },
                { k: "structuralAnomalies", v: <CodeList codes={primaryPage.structuralAnomalies} /> },
                { k: "pageMigrationGate.reasons", v: <ReasonList reasons={primaryPage.pageMigrationGate.reasons} /> },
                { k: "pageRolloutPolicy.reasons", v: <ReasonList reasons={primaryPage.pageRolloutPolicy.reasons} /> },
              ]}
            />
          </>
        ) : (
          <p style={{ margin: 0, color: "#6b7280" }}>No page diagnostics available from this run.</p>
        )}
      </Section>

      <Section
        title="Source vs Migrated Compare (Primary Page)"
        summary={
          primaryCompare ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <StatusPill value={primaryCompare.isRoot ? "root_page" : "non_root_page"} kind="neutral" />
              <StatusPill value={primaryCompare.sourcePath} kind="neutral" />
              <StatusPill value={`${primaryCompare.mismatchFlags.length}_flags`} kind={primaryCompare.mismatchFlags.length > 0 ? "warn" : "good"} />
            </div>
          ) : (
            <span style={{ color: "#6b7280" }}>No compare evidence available</span>
          )
        }
      >
        {primaryCompare ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <SummaryCard label="sourcePath" value={<code>{primaryCompare.sourcePath}</code>} />
              <SummaryCard label="mismatch flags" value={primaryCompare.mismatchFlags.length} kind={primaryCompare.mismatchFlags.length > 0 ? "warn" : "good"} />
              <SummaryCard label="source regions" value={primaryCompare.sourceStructure.detectedRegions.length} />
              <SummaryCard label="migrated regions" value={primaryCompare.migratedStructure.detectedRegions.length} />
              <SummaryCard
                label="pageMigrationGate.state"
                value={primaryPage ? <StatusPill value={primaryPage.pageMigrationGate.state} /> : "n/a"}
                kind={primaryPage ? statusKindFromString(primaryPage.pageMigrationGate.state) : "neutral"}
              />
              <SummaryCard
                label="pageRolloutPolicy.state"
                value={primaryPage ? <StatusPill value={primaryPage.pageRolloutPolicy.state} /> : "n/a"}
                kind={primaryPage ? statusKindFromString(primaryPage.pageRolloutPolicy.state) : "neutral"}
              />
            </div>

            <KeyValueTable
              rows={[
                { k: "compare.pageId", v: primaryCompare.pageId },
                { k: "compare.sourcePath", v: primaryCompare.sourcePath },
                { k: "compare.isRoot", v: <BooleanPill value={primaryCompare.isRoot} /> },
                { k: "mismatchFlags", v: <CodeList codes={primaryCompare.mismatchFlags} /> },
                { k: "mismatchReasons", v: <CodeList codes={primaryCompare.mismatchReasons} /> },
                { k: "pageStructuralConfidence", v: primaryPage ? formatScore(primaryPage.pageStructuralConfidence) : "n/a" },
                { k: "weakSectionIds", v: primaryPage ? <CodeList codes={primaryPage.weakSectionIds} /> : "n/a" },
                { k: "structuralAnomalies", v: primaryPage ? <CodeList codes={primaryPage.structuralAnomalies} /> : "n/a" },
                { k: "pageMigrationGate.state", v: primaryPage ? <StatusPill value={primaryPage.pageMigrationGate.state} /> : "n/a" },
                { k: "pageRolloutPolicy.state", v: primaryPage ? <StatusPill value={primaryPage.pageRolloutPolicy.state} /> : "n/a" },
                { k: "pageEnforcement.SHADOW", v: primaryPage ? <StatusPill value={primaryPage.pageEnforcement.SHADOW.decision} /> : "n/a" },
                { k: "pageEnforcement.CANARY", v: primaryPage ? <StatusPill value={primaryPage.pageEnforcement.CANARY.decision} /> : "n/a" },
                { k: "pageEnforcement.PRODUCTION", v: primaryPage ? <StatusPill value={primaryPage.pageEnforcement.PRODUCTION.decision} /> : "n/a" },
              ]}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 12,
                marginTop: 12,
              }}
            >
              <article style={{ border: "1px solid #dbe3ea", borderRadius: 10, padding: 10, background: "#fcfcfd" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: 14 }}>Source Snapshot Preview</h3>
                <div style={{ marginTop: 10, border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#ffffff" }}>
                  <iframe title={`source:${primaryCompare.sourcePath}`} sandbox="" srcDoc={primaryCompare.sourceSnapshotHtml} style={{ width: "100%", height: 420, border: 0 }} />
                </div>
                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: "pointer" }}>Source structural summary</summary>
                  <div style={{ marginTop: 8 }}>
                    <StructureSummaryTable summary={primaryCompare.sourceStructure} />
                  </div>
                </details>
              </article>

              <article style={{ border: "1px solid #dbe3ea", borderRadius: 10, padding: 10, background: "#fcfcfd" }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: 14 }}>Migrated Preview</h3>
                <div style={{ marginTop: 10, border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#ffffff" }}>
                  <iframe
                    title={`migrated:${primaryCompare.sourcePath}`}
                    sandbox=""
                    srcDoc={primaryCompare.migratedPreviewHtml ?? "<html><body><p>No migrated preview HTML available.</p></body></html>"}
                    style={{ width: "100%", height: 420, border: 0 }}
                  />
                </div>
                <details style={{ marginTop: 10 }}>
                  <summary style={{ cursor: "pointer" }}>Migrated structural summary</summary>
                  <div style={{ marginTop: 8 }}>
                    <StructureSummaryTable summary={primaryCompare.migratedStructure} />
                  </div>
                </details>
              </article>
            </div>

            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer" }}>Raw compare structural evidence (optional)</summary>
              <pre style={{ marginTop: 10, padding: 10, background: "#f9fafb", borderRadius: 10, overflow: "auto", fontSize: 12, maxHeight: 320 }}>
                {stableStringify({
                  sourceStructure: primaryCompare.sourceStructure,
                  migratedStructure: primaryCompare.migratedStructure,
                  mismatchFlags: primaryCompare.mismatchFlags,
                  mismatchReasons: primaryCompare.mismatchReasons,
                })}
              </pre>
            </details>
          </>
        ) : (
          <p style={{ margin: 0, color: "#6b7280" }}>No compare evidence was produced for this run.</p>
        )}
      </Section>

      <Section title="Weak Sections + Structural Anomalies">
        {weakAndAnomalyRows.length === 0 ? (
          <p style={{ margin: 0, color: "#6b7280" }}>No weak sections or structural anomalies were reported.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>kind</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>page</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>section</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>intent</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>confidence</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>confidence components</th>
                  <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>anomalies</th>
                </tr>
              </thead>
              <tbody>
                {weakAndAnomalyRows.map((row) => (
                  <tr key={row.key}>
                    <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>
                      <StatusPill value={row.kind} kind={row.kind === "weak_section" ? "warn" : "bad"} />
                    </td>
                    <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>
                      <code>{row.pagePath}</code>
                    </td>
                    <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>
                      <code>{row.sectionId}</code>
                    </td>
                    <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>{row.intent}</td>
                    <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>{row.structuralConfidence}</td>
                    <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6", maxWidth: 360 }}>
                      <code>{row.confidenceComponents}</code>
                    </td>
                    <td style={{ padding: "6px 8px", borderTop: "1px solid #f3f4f6" }}>{row.anomalies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title="Explainability + Recommended Actions"
        summary={<StatusPill value={sitePolicy.recommendedNextStep} kind={sitePolicy.recommendedNextStep.includes("NOT") ? "bad" : "warn"} />}
      >
        <KeyValueTable
          rows={[
            { k: "site.recommendedNextStep", v: <StatusPill value={sitePolicy.recommendedNextStep} kind="warn" /> },
            {
              k: "page.recommendedNextStep",
              v: primaryPage ? <StatusPill value={primaryPage.pageRolloutPolicy.recommendedNextStep} kind="warn" /> : "n/a",
            },
            {
              k: "pageMigrationGate.recommendedAction",
              v: primaryPage ? <StatusPill value={primaryPage.pageMigrationGate.recommendedAction} kind="warn" /> : "n/a",
            },
            { k: "siteMigrationGate.recommendedAction", v: <StatusPill value={siteGate.recommendedAction} kind="warn" /> },
            { k: "decisionReasons", v: <ReasonList reasons={explainabilityReasons} /> },
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
            { k: "snapshot.sourceMode", v: props.response.snapshot.sourceMode },
            { k: "snapshot.responseHtmlPathAbs", v: props.response.snapshot.responseHtmlPathAbs },
            { k: "snapshot.entryHtmlPathAbs", v: props.response.snapshot.entryHtmlPathAbs },
            { k: "snapshot.assetsDirAbs", v: props.response.snapshot.assetsDirAbs },
            { k: "snapshot.renderedCaptureStatus", v: props.response.snapshot.renderedCapture.status },
            { k: "snapshot.renderedDocumentCount", v: props.response.snapshot.renderedCapture.documents.length },
            { k: "snapshot.screenshotCount", v: props.response.snapshot.renderedCapture.screenshots.length },
            { k: "snapshot.computedStyleSampleCount", v: props.response.snapshot.renderedCapture.computedStyleSamples.length },
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
