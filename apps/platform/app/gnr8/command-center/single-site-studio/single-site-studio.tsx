import React, { type ReactNode } from "react";

import type { SingleSiteStudioPreviewState, SingleSiteStudioReadonlyProjection } from "@/gnr8/single-site/single-site-studio-readonly-projection";

type Props = {
  model: SingleSiteStudioReadonlyProjection;
};

function labelize(value: string): string {
  return value.replaceAll("_", " ");
}

function statusBadge(value: string, tone: "good" | "warn" | "neutral" = "neutral") {
  const palette = {
    good: { border: "#86efac", background: "#f0fdf4", color: "#166534" },
    warn: { border: "#fcd34d", background: "#fffbeb", color: "#92400e" },
    neutral: { border: "#cbd5e1", background: "#f8fafc", color: "#334155" },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
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
    >
      {labelize(value)}
    </span>
  );
}

function fact(label: string, value: ReactNode) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 4, color: "#0f172a", fontSize: 15, fontWeight: 850, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function section(title: string, children: ReactNode) {
  return (
    <section style={{ display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0, color: "#0f172a", fontSize: 20, lineHeight: 1.2 }}>{title}</h2>
      {children}
    </section>
  );
}

function previewCard(preview: SingleSiteStudioPreviewState) {
  const statusLabel = preview.available ? "internal_preview" : "internal_preview_unavailable";
  return (
    <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, color: "#0f172a", fontSize: 16 }}>{preview.label}</h3>
          <div style={{ marginTop: 3, color: "#64748b", fontSize: 12, overflowWrap: "anywhere" }}>
            {preview.siteVersionId ? `Runtime site version ${preview.siteVersionId}` : "No runtime site version ref"}
          </div>
        </div>
        {statusBadge(statusLabel, preview.available ? "good" : "warn")}
      </div>
      {preview.available && preview.route ? (
        <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, overflow: "hidden", background: "#fff", minHeight: 380 }}>
          <iframe
            title={preview.label}
            src={preview.route}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            style={{ display: "block", width: "100%", height: 380, border: 0, background: "#fff" }}
          />
        </div>
      ) : (
        <div style={{ border: "1px solid #fcd34d", borderRadius: 8, background: "#fffbeb", padding: 12, color: "#92400e", fontSize: 13 }}>
          <strong>Internal preview unavailable.</strong> {preview.unavailableReason}
        </div>
      )}
      <div style={{ color: "#475569", fontSize: 12, lineHeight: 1.45 }}>{preview.authNote}</div>
    </div>
  );
}

export function SingleSiteStudio({ model }: Props) {
  const summaryTone = model.summary.activePointer === "live" && model.summary.publishedCandidate === "PUBLISHED" ? "good" : "warn";

  return (
    <main style={{ display: "grid", gap: 22, color: "#0f172a" }}>
      <section
        style={{
          display: "grid",
          gap: 16,
          border: "1px solid #dbe3ee",
          borderRadius: 8,
          background: "#ffffff",
          padding: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 260 }}>
            <div style={{ color: "#0f766e", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Single-Site Studio</div>
            <h1 style={{ margin: "4px 0 0", color: "#0f172a", fontSize: 30, lineHeight: 1.1 }}>chs.si MVP Studio</h1>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a
              href={model.summary.liveSiteUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #0f766e",
                borderRadius: 8,
                background: "#0f766e",
                color: "#fff",
                padding: "10px 13px",
                fontSize: 14,
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Open live site
            </a>
            {model.diagnosticsHref ? (
              <a
                href={model.diagnosticsHref}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  background: "#fff",
                  color: "#334155",
                  padding: "10px 13px",
                  fontSize: 14,
                  fontWeight: 850,
                  textDecoration: "none",
                }}
              >
                Open diagnostics
              </a>
            ) : null}
          </div>
        </div>

        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
          {fact("Site", model.summary.site)}
          {fact(
            "Source URL",
            <a href={model.summary.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "#0369a1", textDecoration: "none" }}>
              {model.summary.sourceUrl}
            </a>,
          )}
          {fact("MVP status", statusBadge(model.summary.mvpStatus, summaryTone))}
          {fact(
            "Live published site",
            <a href={model.summary.liveSiteUrl} target="_blank" rel="noreferrer" style={{ color: "#0369a1", textDecoration: "none" }}>
              {model.summary.liveSiteUrl}
            </a>,
          )}
          {fact("Active pointer", statusBadge(model.summary.activePointer, summaryTone))}
          {fact("Published candidate", statusBadge(model.summary.publishedCandidate, summaryTone))}
        </dl>
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
          Live site is the published CHS production domain. Original clone and improved candidate are superadmin-only internal GNR8 previews. This MVP proved the governed workflow; meaningful AI content improvement remains a next product phase.
        </div>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <form action="/gnr8/command-center/single-site-studio" method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 5, flex: "1 1 320px", color: "#475569", fontSize: 12, fontWeight: 850 }}>
            Website URL
            <input
              name="sourceUrl"
              defaultValue={model.import.inputUrl}
              readOnly
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                padding: "10px 12px",
                color: "#0f172a",
                background: "#fff",
                fontSize: 14,
              }}
            />
          </label>
          {model.migrationId ? <input type="hidden" name="migrationId" value={model.migrationId} /> : null}
          <button
            type="submit"
            disabled
            style={{
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              background: "#f8fafc",
              color: "#64748b",
              padding: "10px 13px",
              fontSize: 14,
              fontWeight: 850,
            }}
          >
            Import captured
          </button>
        </form>
        <div style={{ color: "#64748b", fontSize: 12 }}>
          Captured source locked for the accepted MVP rehearsal.
        </div>
      </section>

      {section(
        "Workflow",
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
          {model.workflow.map((step, index) => (
            <li key={step.key} style={{ border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 12 }}>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 850 }}>Step {index + 1}</div>
              <div style={{ marginTop: 4, color: "#0f172a", fontSize: 14, fontWeight: 900 }}>{step.label}</div>
              <div style={{ marginTop: 8 }}>{statusBadge(step.status, step.status === "done" ? "good" : step.status === "current" ? "warn" : "neutral")}</div>
            </li>
          ))}
        </ol>,
      )}

      {section(
        "Source Evidence",
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
          {model.sourceEvidence.map((item) => (
            <div key={`${item.label}:${item.status}`} style={{ border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 12, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}>
                <strong style={{ fontSize: 14 }}>{item.label}</strong>
                {statusBadge(item.status, item.status.includes("present") || item.status.includes("accepted") ? "good" : "neutral")}
              </div>
              <div style={{ marginTop: 8, color: "#475569", fontSize: 13, lineHeight: 1.45, overflowWrap: "anywhere" }}>{item.detail}</div>
            </div>
          ))}
        </div>,
      )}

      {section(
        "Previews",
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 16 }}>
          {previewCard(model.previews.originalClone)}
          {previewCard(model.previews.improvedCandidate)}
        </div>,
      )}

      {section(
        "Comparison Summary",
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
          {model.comparison.map((item) => (
            <div key={item.label} style={{ border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 12, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 900 }}>{item.label}</div>
              <div style={{ marginTop: 8 }}>{statusBadge(item.status, item.status === "live" || item.status === "PUBLISHED" ? "good" : "neutral")}</div>
              <div style={{ marginTop: 8, color: "#475569", fontSize: 13, overflowWrap: "anywhere" }}>
                {item.href ? (
                  <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer" : undefined} style={{ color: "#0369a1", textDecoration: "none" }}>
                    {item.detail}
                  </a>
                ) : (
                  item.detail
                )}
              </div>
            </div>
          ))}
        </div>,
      )}

      {section(
        "AI Improvement Summary",
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              border: model.improvementSummary.noDeterministicContentChanges ? "1px solid #fcd34d" : "1px solid #86efac",
              borderRadius: 8,
              background: model.improvementSummary.noDeterministicContentChanges ? "#fffbeb" : "#f0fdf4",
              color: model.improvementSummary.noDeterministicContentChanges ? "#92400e" : "#166534",
              padding: 12,
              fontSize: 14,
              fontWeight: 850,
            }}
          >
            {model.improvementSummary.headline}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
            {model.improvementSummary.recommendations.map((recommendation) => (
              <div key={recommendation.id} style={{ border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 12, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "start" }}>
                  <strong style={{ color: "#0f172a", fontSize: 14, lineHeight: 1.3 }}>{recommendation.title}</strong>
                  {statusBadge(recommendation.status, recommendation.status === "applied" ? "good" : "warn")}
                </div>
                <div style={{ marginTop: 8, color: "#475569", fontSize: 12, overflowWrap: "anywhere" }}>
                  {recommendation.key} / {recommendation.category} / {recommendation.priority}
                </div>
                <div style={{ marginTop: 7, color: "#334155", fontSize: 13 }}>Reason: {labelize(recommendation.reason)}</div>
              </div>
            ))}
          </div>
        </div>,
      )}
    </main>
  );
}
