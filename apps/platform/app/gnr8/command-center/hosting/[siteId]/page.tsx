import Link from "next/link";
import type { ReactNode } from "react";

import { getHostingOperationsReadModel } from "@/gnr8/runtime/hosting-operations/hosting-operations-read-model";

function text(value: unknown): string {
  const normalized = String(value ?? "").trim();
  return normalized || "-";
}

function list(values: readonly string[]): string {
  return values.length > 0 ? values.join(", ") : "-";
}

function metric(label: string, value: string | number | null | undefined) {
  return (
    <article style={{ border: "1px solid #dbe2ea", borderRadius: 8, background: "#fff", padding: 12, minWidth: 0 }}>
      <div style={{ fontSize: 12, color: "#64748b" }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: "#0f172a", wordBreak: "break-word" }}>{text(value)}</div>
    </article>
  );
}

function section(title: string, children: ReactNode) {
  return (
    <section style={{ marginTop: 12, border: "1px solid #dbe2ea", borderRadius: 12, background: "#fff", padding: 14 }}>
      <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 20, color: "#0f172a" }}>{title}</h2>
      {children}
    </section>
  );
}

export default async function CommandCenterHostingSitePage(props: {
  params: Promise<{ siteId: string }>;
}) {
  const { siteId } = await props.params;
  const model = await getHostingOperationsReadModel(siteId);

  if (!model.site.found) {
    return (
      <section style={{ border: "1px solid #fecaca", borderRadius: 12, background: "#fff1f2", padding: 14 }}>
        <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 24 }}>Hosting Site Not Found</h1>
        <p style={{ marginTop: 0, color: "#7f1d1d" }}>{text(siteId)}</p>
        <Link href="/gnr8/command-center/hosting" style={{ color: "#1d4ed8" }}>
          Back to Hosting
        </Link>
      </section>
    );
  }

  return (
    <>
      <section style={{ border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
        <Link href="/gnr8/command-center/hosting" style={{ color: "#1d4ed8", fontSize: 13 }}>
          Back to Hosting
        </Link>
        <header style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>Hosting Overview</h1>
          <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>{model.site.siteId}</p>
        </header>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
          {metric("Active Version", model.runtime.activeVersion ? `v${model.runtime.activeVersion.versionNo}` : null)}
          {metric("Active Artifact", model.runtime.activeArtifact?.id)}
          {metric("Publish Timestamp", model.publish.lastPublish?.publishedAt)}
          {metric("Runtime Readiness", model.readiness.state)}
        </div>
      </section>

      {section(
        "Domains",
        model.domains.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>No domains are attached.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", color: "#475569" }}>
                  <th style={{ padding: "8px 6px" }}>Host</th>
                  <th style={{ padding: "8px 6px" }}>Status</th>
                  <th style={{ padding: "8px 6px" }}>Verified</th>
                  <th style={{ padding: "8px 6px" }}>Last Checked</th>
                  <th style={{ padding: "8px 6px" }}>DNS</th>
                </tr>
              </thead>
              <tbody>
                {model.domains.map((domain) => (
                  <tr key={domain.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "9px 6px", fontWeight: 700 }}>{domain.host}</td>
                    <td style={{ padding: "9px 6px" }}>{domain.status}</td>
                    <td style={{ padding: "9px 6px" }}>{domain.verified ? "yes" : "no"}</td>
                    <td style={{ padding: "9px 6px" }}>{text(domain.lastCheckedAt)}</td>
                    <td style={{ padding: "9px 6px" }}>{text(domain.dnsRecordType)} {text(domain.dnsRecordHost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}

      {section(
        "Runtime Readiness",
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {metric("State", model.readiness.state)}
            {metric("Site Readiness", model.readiness.site?.readinessStatus)}
            {metric("Domain Readiness", model.readiness.domains?.domainReadinessStatus)}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>
            <strong>Blockers:</strong> {list(model.readiness.blockers)}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>
            <strong>Warnings:</strong> {list(model.readiness.warnings)}
          </p>
        </div>,
      )}

      {section(
        "Assets",
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {metric("Artifact Type", model.assets.artifactType)}
            {metric("HTML Paths", model.assets.counts.htmlPaths)}
            {metric("Fingerprinted Assets", model.assets.counts.fingerprintedAssets)}
            {metric("Raw Files", model.assets.counts.rawFiles)}
            {metric("Persisted Assets", model.assets.counts.persistedAssets)}
            {metric("External Fallbacks", model.assets.counts.externalFallbackAssets)}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: "#374151" }}>
            <strong>Diagnostics:</strong> {list(model.assets.diagnostics.codes)}
          </p>
        </div>,
      )}

      {section(
        "Rollback",
        model.rollbackCandidates.length === 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>No rollback candidates are available.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", color: "#475569" }}>
                  <th style={{ padding: "8px 6px" }}>Version</th>
                  <th style={{ padding: "8px 6px" }}>Artifact</th>
                  <th style={{ padding: "8px 6px" }}>Published</th>
                  <th style={{ padding: "8px 6px" }}>State</th>
                </tr>
              </thead>
              <tbody>
                {model.rollbackCandidates.map((candidate) => (
                  <tr key={candidate.siteVersionId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "9px 6px" }}>v{text(candidate.versionNo)}</td>
                    <td style={{ padding: "9px 6px", fontFamily: "monospace" }}>{candidate.artifactId}</td>
                    <td style={{ padding: "9px 6px" }}>{text(candidate.publishedAt)}</td>
                    <td style={{ padding: "9px 6px" }}>{text(candidate.state)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}

      {section(
        "Diagnostics",
        <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#374151" }}>
          <p style={{ margin: 0 }}>
            <strong>Resolution:</strong> {model.runtime.resolution?.diagnostics.code ?? "-"}{" "}
            {model.runtime.resolution ? `(${model.runtime.resolution.strategy})` : ""}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Latest Failures:</strong> {list(model.diagnostics.latestFailures)}
          </p>
          <p style={{ margin: 0 }}>
            <strong>Codes:</strong> {list(model.diagnostics.codes)}
          </p>
        </div>,
      )}
    </>
  );
}
