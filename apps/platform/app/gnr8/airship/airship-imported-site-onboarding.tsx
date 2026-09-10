import React, { type ReactNode } from "react";

import type {
  AirshipImportedSiteOnboardingProjection,
  AirshipOnboardingStatusTone,
} from "@/gnr8/single-site/airship-imported-site-onboarding-projection";

type Props = {
  model: AirshipImportedSiteOnboardingProjection;
};

function statusBadge(label: string, tone: AirshipOnboardingStatusTone) {
  const palette = {
    good: { border: "#86efac", background: "#f0fdf4", color: "#166534" },
    warn: { border: "#fbbf24", background: "#fffbeb", color: "#92400e" },
    neutral: { border: "#cbd5e1", background: "#f8fafc", color: "#334155" },
  }[tone];

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      border: `1px solid ${palette.border}`,
      borderRadius: 8,
      padding: "4px 8px",
      background: palette.background,
      color: palette.color,
      fontSize: 12,
      fontWeight: 850,
      lineHeight: 1.2,
      whiteSpace: "nowrap",
      textTransform: "capitalize",
    }}>
      {label}
    </span>
  );
}

function fact(label: string, value: ReactNode) {
  return (
    <div style={{ minWidth: 0 }}>
      <dt style={{ color: "#64748b", fontSize: 12, fontWeight: 850 }}>{label}</dt>
      <dd style={{ margin: "5px 0 0", color: "#0f172a", fontSize: 14, fontWeight: 800, overflowWrap: "anywhere" }}>{value}</dd>
    </div>
  );
}

function linkOrUnavailable(value: string | null, label?: string) {
  if (!value) return <span style={{ color: "#92400e" }}>Unavailable</span>;
  return (
    <a href={value} target="_blank" rel="noreferrer" style={{ color: "#0369a1", textDecoration: "none" }}>
      {label ?? value}
    </a>
  );
}

function statusBlock(title: string, status: { label: string; detail: string; tone: AirshipOnboardingStatusTone }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", padding: 10, minWidth: 0 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ color: "#475569", fontSize: 12, fontWeight: 900 }}>{title}</div>
        {statusBadge(status.label, status.tone)}
      </div>
      <p style={{ margin: "8px 0 0", color: "#334155", fontSize: 13, lineHeight: 1.45, overflowWrap: "anywhere" }}>
        {status.detail}
      </p>
    </div>
  );
}

export function AirshipImportedSiteOnboarding({ model }: Props) {
  return (
    <main style={{ display: "grid", gap: 18, minHeight: "100vh", padding: 20, background: "#f8fafc", color: "#0f172a" }}>
      <section style={{ display: "grid", gap: 10, border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 18 }}>
        <div style={{ color: "#0f766e", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Airship</div>
        <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1 }}>Imported site onboarding</h1>
        <p style={{ margin: 0, color: "#475569", fontSize: 14, lineHeight: 1.45 }}>
          Open existing imported single-site migrations in Airship. This surface is read-only and does not start imports, source capture, provider work, previews, publication, rollback, or live pointer changes.
        </p>
        {model.instrumentation.repositoryReadStatus === "unavailable" ? (
          <p style={{ margin: 0, border: "1px solid #fbbf24", borderRadius: 8, background: "#fffbeb", color: "#92400e", padding: 10, fontSize: 13 }}>
            Repository discovery is unavailable; showing seeded imported-site migrations only.
          </p>
        ) : null}
      </section>

      {model.state === "empty" ? (
        <section style={{ border: "1px solid #fbbf24", borderRadius: 8, background: "#fffbeb", padding: 18, color: "#92400e" }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{model.emptyState.title}</h2>
          <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.45 }}>{model.emptyState.detail}</p>
        </section>
      ) : (
        <section style={{ display: "grid", gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Imported single-site migrations</h2>
          <div style={{ display: "grid", gap: 12 }}>
            {model.items.map((item) => (
              <article key={item.migrationId} style={{ display: "grid", gap: 14, border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "start", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 240 }}>
                    <h3 style={{ margin: 0, fontSize: 20, lineHeight: 1.2 }}>{item.siteLabel}</h3>
                    <div style={{ marginTop: 5, color: "#64748b", fontSize: 12, overflowWrap: "anywhere" }}>{item.migrationId}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <a href={item.links.overviewHref} style={{ border: "1px solid #0f766e", borderRadius: 8, background: "#0f766e", color: "#fff", padding: "9px 12px", fontSize: 13, fontWeight: 900, textDecoration: "none" }}>
                      Open Airship overview
                    </a>
                    <a href={item.links.editorHref} style={{ border: "1px solid #1d4ed8", borderRadius: 8, background: "#1d4ed8", color: "#fff", padding: "9px 12px", fontSize: 13, fontWeight: 900, textDecoration: "none" }}>
                      Open Airship editor
                    </a>
                  </div>
                </div>

                <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  {fact("Site/client label", item.siteLabel)}
                  {fact("Source URL", linkOrUnavailable(item.sourceUrl))}
                  {fact("Live URL", linkOrUnavailable(item.liveUrl))}
                  {fact("Migration id", item.migrationId)}
                </dl>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 10 }}>
                  {statusBlock("Import / source evidence", item.importSourceEvidenceStatus)}
                  {statusBlock("Latest Airship draft", item.latestAirshipDraftStatus)}
                  {statusBlock("Latest internal preview candidate", item.latestInternalPreviewCandidate)}
                  {statusBlock("Published / live pointer", item.publishedLivePointerStatus)}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
