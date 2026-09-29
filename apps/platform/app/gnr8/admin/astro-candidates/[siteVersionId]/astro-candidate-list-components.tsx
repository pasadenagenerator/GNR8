import React, { type CSSProperties, type ReactNode } from "react";

import type {
  AstroProductionCandidateListItemReadModel,
  AstroProductionCandidateListReadModel,
} from "@/gnr8/output-adapters/astro-production-candidate-list-read-model";

import { AstroCandidatePromotionAction } from "./astro-candidate-promotion-action";

const shellStyle: CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "32px 24px 64px",
  color: "#111827",
  fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
};

const panelStyle: CSSProperties = {
  border: "1px solid #d8e2ec",
  borderRadius: 10,
  background: "#ffffff",
};

const linkStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "8px 12px",
  border: "1px solid #1d4ed8",
  borderRadius: 8,
  background: "#eff6ff",
  color: "#1d4ed8",
  fontWeight: 800,
  textDecoration: "none",
};

function StatePanel(props: {
  title: string;
  children: ReactNode;
  tone?: "neutral" | "amber";
}) {
  const amber = props.tone === "amber";
  return (
    <section
      role="status"
      style={{
        ...panelStyle,
        marginTop: 24,
        padding: 20,
        borderColor: amber ? "#fed7aa" : "#d8e2ec",
        background: amber ? "#fff7ed" : "#f8fafc",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 22 }}>{props.title}</h2>
      <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.55 }}>{props.children}</div>
    </section>
  );
}

function Field(props: { label: string; children: ReactNode; code?: boolean }) {
  return (
    <div style={{ minWidth: 0 }}>
      <dt style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{props.label}</dt>
      <dd
        style={{
          margin: "4px 0 0",
          color: "#172033",
          fontFamily: props.code ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
          fontSize: props.code ? 12 : 14,
          lineHeight: 1.45,
          overflowWrap: "anywhere",
          wordBreak: "break-word",
        }}
      >
        {props.children}
      </dd>
    </div>
  );
}

function StatusBadge(props: { children: ReactNode; active?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 25,
        padding: "3px 9px",
        border: `1px solid ${props.active ? "#bbf7d0" : "#fed7aa"}`,
        borderRadius: 999,
        background: props.active ? "#f0fdf4" : "#fff7ed",
        color: props.active ? "#166534" : "#9a3412",
        fontSize: 12,
        fontWeight: 850,
      }}
    >
      {props.children}
    </span>
  );
}

function CandidateCard(props: { item: AstroProductionCandidateListItemReadModel }) {
  const { item } = props;
  const eligible = item.previewHref !== null;
  return (
    <article style={{ ...panelStyle, padding: 18, minWidth: 0 }} data-candidate-id={item.candidateId}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ margin: 0, minWidth: 0, fontSize: 18, overflowWrap: "anywhere" }}>{item.candidateId}</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <StatusBadge active={item.accessState === "enabled"}>{item.accessState}</StatusBadge>
          <StatusBadge active={item.compatibilityState === "supported"}>{item.compatibilityState}</StatusBadge>
        </div>
      </div>

      <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "14px 18px", margin: "18px 0 0" }}>
        <Field label="Candidate created"><time dateTime={item.candidateCreatedAt}>{item.candidateCreatedAt}</time></Field>
        <Field label="Stored"><time dateTime={item.storedAt}>{item.storedAt}</time></Field>
        <Field label="Payload size">{formatBytes(item.payloadSizeBytes)}</Field>
        <Field label="Access reason" code>{item.accessReasonCode}</Field>
        <Field label="Producer" code>{item.producerKind} · {item.producerVersion}</Field>
        <Field label="Producer ref" code>{item.producerRef}</Field>
        <Field label="Schema" code>{item.schemaVersion}</Field>
        <Field label="Record kind" code>{item.recordKind}</Field>
        <Field label="Adapter" code>{item.adapterId}</Field>
        <Field label="Conversion" code>{item.conversionVersion}</Field>
        <Field label="Export manifest" code>{item.exportManifestVersion}</Field>
        <Field label="Renderer" code>{item.rendererCompatibilityVersion}</Field>
        <Field label="Content hash" code>{item.contentSha256Prefix}</Field>
        <Field label="Storage hash" code>{item.storageSha256Prefix}</Field>
      </dl>

      <div style={{ marginTop: 18 }}>
        {eligible ? (
          <a href={item.previewHref!} target="_blank" rel="noopener noreferrer" style={linkStyle}>
            Open Astro candidate
          </a>
        ) : (
          <span style={{ color: "#64748b", fontSize: 14, fontWeight: 750 }}>
            {item.accessState === "disabled"
              ? "Preview access is disabled for this candidate."
              : "This candidate uses unsupported compatibility metadata."}
          </span>
        )}
        {eligible ? (
          <AstroCandidatePromotionAction
            siteVersionId={item.siteVersionId}
            candidateId={item.candidateId}
            contentSha256={item.contentSha256}
            storageSha256={item.storageSha256}
          />
        ) : null}
      </div>
    </article>
  );
}

export function AstroCandidateListPageView(props: { model: AstroProductionCandidateListReadModel }) {
  const { model } = props;
  const siteVersionId = model.state === "feature_disabled" ? null : model.siteVersionId;
  return (
    <main style={shellStyle}>
      <header>
        <p style={{ margin: 0, color: "#1d4ed8", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>
          Superadmin · governed materialization
        </p>
        <h1 style={{ margin: "5px 0 0", fontSize: 36, lineHeight: 1.08 }}>Astro candidates</h1>
        <p style={{ margin: "10px 0 0", maxWidth: 760, color: "#475569", lineHeight: 1.55 }}>
          Bounded candidate metadata for one authoritative site-version scope. Preview remains read-only; the explicit materialization action revalidates the complete record, runs runtime gates, and stops before publishing or activation.
        </p>
        {siteVersionId && siteVersionId !== "unavailable" ? (
          <div style={{ marginTop: 14 }}>
            <a href={`/gnr8/admin/workspace/${encodeURIComponent(siteVersionId)}`} style={{ color: "#1d4ed8", fontWeight: 750 }}>
              Back to Workspace
            </a>
          </div>
        ) : null}
      </header>

      {model.state === "feature_disabled" ? (
        <StatePanel title="Astro candidate preview is disabled" tone="amber">
          The default-off Astro candidate preview feature is not enabled. No ownership or candidate metadata was read.
        </StatePanel>
      ) : null}
      {model.state === "invalid_request" ? (
        <StatePanel title="Invalid candidate list link" tone="amber">{model.message}</StatePanel>
      ) : null}
      {model.state === "access_denied" ? (
        <StatePanel title="Candidate access denied" tone="amber">{model.message}</StatePanel>
      ) : null}
      {model.state === "unavailable" ? (
        <StatePanel title="Candidate list unavailable" tone="amber">{model.message}</StatePanel>
      ) : null}
      {model.state === "empty" ? (
        <StatePanel title="No Astro candidates">No candidate metadata exists in the current authoritative scope.</StatePanel>
      ) : null}
      {model.state === "ready" ? (
        <>
          <section aria-label="Astro candidate metadata" style={{ display: "grid", gap: 12, marginTop: 24 }}>
            {model.items.map((item) => <CandidateCard key={item.candidateId} item={item} />)}
          </section>
          {model.nextCursor ? (
            <nav aria-label="Candidate pagination" style={{ marginTop: 20 }}>
              <a href={`?cursor=${encodeURIComponent(model.nextCursor)}`} style={linkStyle}>Next page</a>
            </nav>
          ) : null}
        </>
      ) : null}
    </main>
  );
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(value < 10240 ? 1 : 0)} KiB`;
}
