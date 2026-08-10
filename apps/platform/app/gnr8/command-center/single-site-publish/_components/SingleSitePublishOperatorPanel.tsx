import type {
  SingleSitePublishOperatorActionAttemptProjection,
  SingleSitePublishOperatorReadonlyProjection,
} from "@/gnr8/single-site/single-site-publish-operator-readonly-projection";
import React, { type ReactNode } from "react";

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

function section(title: string, children: ReactNode) {
  return (
    <section style={{ border: "1px solid #dbe2ea", borderRadius: 10, background: "#fff", padding: 14 }}>
      <h2 style={{ margin: "0 0 10px", fontSize: 18, color: "#0f172a" }}>{title}</h2>
      {children}
    </section>
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

function timeline(model: SingleSitePublishOperatorReadonlyProjection) {
  if (model.timeline.length === 0) {
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
          {model.timeline.map((attempt) => (
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

      {section("Recent Action Timeline", timeline(model))}
    </div>
  );
}
