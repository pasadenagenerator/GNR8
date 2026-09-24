import React, { type ReactNode } from "react";

import type { SingleSiteStudioPreviewState, SingleSiteStudioReadonlyProjection } from "@/gnr8/single-site/single-site-studio-readonly-projection";
import { gnr8StatusStyle, gnr8Styles, gnr8VisualTokens } from "../../../../gnr8/visual-system/gnr8-visual-system";

type Props = {
  model: SingleSiteStudioReadonlyProjection;
};

function labelize(value: string): string {
  return value.replaceAll("_", " ");
}

function statusBadge(value: string, tone: "good" | "warn" | "neutral" = "neutral") {
  const tokenTone = tone === "good" ? "success" : tone === "warn" ? "warning" : "neutral";
  return (
    <span
      style={{
        ...gnr8StatusStyle(tokenTone),
      }}
    >
      {labelize(value)}
    </span>
  );
}

function fact(label: string, value: ReactNode) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: gnr8VisualTokens.color.textMuted, fontSize: 12, fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 4, color: gnr8VisualTokens.color.text, fontSize: 15, fontWeight: 850, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function section(title: string, children: ReactNode) {
  return (
    <section style={{ display: "grid", gap: 14 }}>
      <h2 style={{ margin: 0, color: gnr8VisualTokens.color.text, fontSize: 20, lineHeight: 1.2 }}>{title}</h2>
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
          <h3 style={{ margin: 0, color: gnr8VisualTokens.color.text, fontSize: 16 }}>{preview.label}</h3>
          <div style={{ marginTop: 3, color: gnr8VisualTokens.color.textMuted, fontSize: 12, overflowWrap: "anywhere" }}>
            {preview.siteVersionId ? `Runtime site version ${preview.siteVersionId}` : "No runtime site version ref"}
          </div>
        </div>
        {statusBadge(statusLabel, preview.available ? "good" : "warn")}
      </div>
      {preview.available && preview.route ? (
        <div style={{ ...gnr8Styles.panel, overflow: "hidden", minHeight: 380 }}>
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
      <div style={{ color: gnr8VisualTokens.color.textMuted, fontSize: 12, lineHeight: 1.45 }}>{preview.authNote}</div>
    </div>
  );
}

export function SingleSiteStudio({ model }: Props) {
  const summaryTone = model.summary.activePointer === "live" && model.summary.publishedCandidate === "PUBLISHED" ? "good" : "warn";

  return (
    <main style={{ display: "grid", gap: 22, color: gnr8VisualTokens.color.text }}>
      <section
        style={{
          display: "grid",
          gap: 16,
          ...gnr8Styles.panel,
          padding: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ minWidth: 260 }}>
            <div style={{ color: gnr8VisualTokens.color.accentOrange, fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Single-Site Studio</div>
            <h1 style={{ margin: "4px 0 0", color: gnr8VisualTokens.color.text, fontSize: 30, lineHeight: 1.1 }}>{model.summary.site} MVP Studio</h1>
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
                borderRadius: gnr8VisualTokens.radius.button,
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
                  ...gnr8Styles.neutralButton,
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
            <a href={model.summary.sourceUrl} target="_blank" rel="noreferrer" style={{ color: gnr8VisualTokens.color.accentOrangeHover, textDecoration: "none" }}>
              {model.summary.sourceUrl}
            </a>,
          )}
          {fact("MVP status", statusBadge(model.summary.mvpStatus, summaryTone))}
          {fact(
            "Live published site",
            <a href={model.summary.liveSiteUrl} target="_blank" rel="noreferrer" style={{ color: gnr8VisualTokens.color.accentOrangeHover, textDecoration: "none" }}>
              {model.summary.liveSiteUrl}
            </a>,
          )}
          {fact("Active pointer", statusBadge(model.summary.activePointer, summaryTone))}
          {fact("Published candidate", statusBadge(model.summary.publishedCandidate, summaryTone))}
        </dl>
        <div style={{ borderTop: `1px solid ${gnr8VisualTokens.color.border}`, paddingTop: 12, color: gnr8VisualTokens.color.textMuted, fontSize: 13, lineHeight: 1.45 }}>
          Live site is the external customer/source domain shown above. Original clone and improved candidate are superadmin-only internal GNR8 previews. This readback does not publish or mutate active pointers.
        </div>
      </section>

      <section style={{ display: "grid", gap: 12 }}>
        <form action="/gnr8/command-center/single-site-studio" method="get" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 5, flex: "1 1 320px", color: gnr8VisualTokens.color.textMuted, fontSize: 12, fontWeight: 850 }}>
            Website URL
            <input
              name="sourceUrl"
              defaultValue={model.import.inputUrl}
              readOnly
              style={{
                width: "100%",
                boxSizing: "border-box",
                ...gnr8Styles.input,
                padding: "10px 12px",
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
            <li key={step.key} style={{ ...gnr8Styles.panel, padding: 12 }}>
              <div style={{ color: gnr8VisualTokens.color.textMuted, fontSize: 12, fontWeight: 850 }}>Step {index + 1}</div>
              <div style={{ marginTop: 4, color: gnr8VisualTokens.color.text, fontSize: 14, fontWeight: 900 }}>{step.label}</div>
              <div style={{ marginTop: 8 }}>{statusBadge(step.status, step.status === "done" ? "good" : step.status === "current" ? "warn" : "neutral")}</div>
            </li>
          ))}
        </ol>,
      )}

      {section(
        "Source Evidence",
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
          {model.sourceEvidence.map((item) => (
            <div key={`${item.label}:${item.status}`} style={{ ...gnr8Styles.panel, padding: 12, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}>
                <strong style={{ fontSize: 14 }}>{item.label}</strong>
                {statusBadge(item.status, item.status.includes("present") || item.status.includes("accepted") ? "good" : "neutral")}
              </div>
              <div style={{ marginTop: 8, color: gnr8VisualTokens.color.textMuted, fontSize: 13, lineHeight: 1.45, overflowWrap: "anywhere" }}>{item.detail}</div>
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
                  <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer" : undefined} style={{ color: gnr8VisualTokens.color.accentOrangeHover, textDecoration: "none" }}>
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
              <div key={recommendation.id} style={{ ...gnr8Styles.panel, padding: 12, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "start" }}>
                  <strong style={{ color: gnr8VisualTokens.color.text, fontSize: 14, lineHeight: 1.3 }}>{recommendation.title}</strong>
                  {statusBadge(recommendation.status, recommendation.status === "applied" ? "good" : "warn")}
                </div>
                <div style={{ marginTop: 8, color: gnr8VisualTokens.color.textMuted, fontSize: 12, overflowWrap: "anywhere" }}>
                  {recommendation.key} / {recommendation.category} / {recommendation.priority}
                </div>
                <div style={{ marginTop: 7, color: gnr8VisualTokens.color.textMuted, fontSize: 13 }}>Reason: {labelize(recommendation.reason)}</div>
              </div>
            ))}
          </div>
        </div>,
      )}
    </main>
  );
}
