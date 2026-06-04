import Link from "next/link";
import type { ReactNode } from "react";

import { HostingDomainRecheckButton } from "@/app/gnr8/command-center/hosting/[siteId]/hosting-domain-recheck-button";
import type { HostingAssetDiagnosticEntry } from "@/gnr8/runtime/hosting-operations/hosting-asset-diagnostics-read-model";
import type { HostingReadinessFinding } from "@/gnr8/runtime/hosting-operations/hosting-readiness-drilldown";
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

function findingsTable(findings: readonly HostingReadinessFinding[]) {
  if (findings.length === 0) {
    return <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>None.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", color: "#475569" }}>
            <th style={{ padding: "8px 6px" }}>Code</th>
            <th style={{ padding: "8px 6px" }}>Description</th>
            <th style={{ padding: "8px 6px" }}>Affected</th>
            <th style={{ padding: "8px 6px" }}>Remediation</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((finding) => (
            <tr key={`${finding.severity}-${finding.code}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={{ padding: "9px 6px", fontFamily: "monospace", fontWeight: 700 }}>{finding.code}</td>
              <td style={{ padding: "9px 6px" }}>{finding.description}</td>
              <td style={{ padding: "9px 6px" }}>{finding.affectedObject}</td>
              <td style={{ padding: "9px 6px" }}>{text(finding.suggestedRemediation)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function assetDiagnosticsTable(entries: readonly HostingAssetDiagnosticEntry[]) {
  if (entries.length === 0) {
    return <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>No asset diagnostics are currently reported.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", color: "#475569" }}>
            <th style={{ padding: "8px 6px" }}>Path</th>
            <th style={{ padding: "8px 6px" }}>Severity</th>
            <th style={{ padding: "8px 6px" }}>Diagnostic Code</th>
            <th style={{ padding: "8px 6px" }}>Reason</th>
            <th style={{ padding: "8px 6px" }}>Source</th>
            <th style={{ padding: "8px 6px" }}>Remediation</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((diagnostic) => (
            <tr
              key={`${diagnostic.assetPath}-${diagnostic.diagnosticCode}-${diagnostic.source}`}
              style={{ borderBottom: "1px solid #f1f5f9" }}
            >
              <td style={{ padding: "9px 6px", fontFamily: "monospace", wordBreak: "break-word" }}>{diagnostic.assetPath}</td>
              <td style={{ padding: "9px 6px", fontWeight: 800 }}>{diagnostic.severity}</td>
              <td style={{ padding: "9px 6px", fontFamily: "monospace", fontWeight: 700 }}>{diagnostic.diagnosticCode}</td>
              <td style={{ padding: "9px 6px" }}>{diagnostic.reason}</td>
              <td style={{ padding: "9px 6px" }}>{diagnostic.source}</td>
              <td style={{ padding: "9px 6px" }}>{diagnostic.remediation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
        <dl style={{ display: "grid", gap: 4, margin: "0 0 12px", color: "#7f1d1d", fontSize: 13 }}>
          <div>
            <dt style={{ display: "inline", fontWeight: 700 }}>requestedSiteId: </dt>
            <dd style={{ display: "inline", margin: 0 }}>{text(model.site.requestedSiteId)}</dd>
          </div>
          <div>
            <dt style={{ display: "inline", fontWeight: 700 }}>lookupMode: </dt>
            <dd style={{ display: "inline", margin: 0 }}>{text(model.site.lookupMode)}</dd>
          </div>
          <div>
            <dt style={{ display: "inline", fontWeight: 700 }}>available identifier type expected: </dt>
            <dd style={{ display: "inline", margin: 0 }}>{text(model.site.expectedIdentifier)}</dd>
          </div>
        </dl>
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
        "Readiness Drilldown",
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            {metric("Site Readiness", model.readinessDrilldown.site.state)}
            {metric("Domain Readiness", model.readinessDrilldown.domains.state)}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>Site Readiness</h3>
            <h4 style={{ margin: "4px 0 0", fontSize: 13, color: "#7f1d1d" }}>Blockers</h4>
            {findingsTable(model.readinessDrilldown.site.blockers)}
            <h4 style={{ margin: "4px 0 0", fontSize: 13, color: "#92400e" }}>Warnings</h4>
            {findingsTable(model.readinessDrilldown.site.warnings)}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>Domain Readiness</h3>
            <h4 style={{ margin: "4px 0 0", fontSize: 13, color: "#7f1d1d" }}>Blockers</h4>
            {findingsTable(model.readinessDrilldown.domains.blockers)}
            <h4 style={{ margin: "4px 0 0", fontSize: 13, color: "#92400e" }}>Warnings</h4>
            {findingsTable(model.readinessDrilldown.domains.warnings)}
          </div>
        </div>,
      )}

      {section(
        "Domain Operations",
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>Internal / Working Domains</h3>
            {model.domainOperations.workingDomains.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>No internal working domain is attached.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {model.domainOperations.workingDomains.map((domain) => (
                  <article key={domain.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                      {metric("Hostname", domain.hostname)}
                      {metric("Binding Kind", domain.bindingKind)}
                      {metric("Status", domain.status)}
                      {metric("Active", domain.active ? "yes" : "no")}
                      {metric("Source", domain.source)}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>External / Custom Domains</h3>
            {model.domainOperations.customDomains.length === 0 ? (
              <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>No external custom domain is attached.</p>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {model.domainOperations.customDomains.map((domain) => (
                  <article key={domain.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                      {metric("Hostname", domain.hostname)}
                      {metric("Status", domain.status)}
                      {metric("Active", domain.active ? "yes" : "no")}
                      {metric("Last Checked", domain.lastCheckedAt)}
                      {metric("Last Error", domain.lastError)}
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>DNS Instructions</h3>
                      {domain.dnsInstructions.length === 0 ? (
                        <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>No DNS instructions are persisted.</p>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                            <thead>
                              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", color: "#475569" }}>
                                <th style={{ padding: "8px 6px" }}>Type</th>
                                <th style={{ padding: "8px 6px" }}>Host</th>
                                <th style={{ padding: "8px 6px" }}>Value</th>
                                <th style={{ padding: "8px 6px" }}>Expected Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {domain.dnsInstructions.map((instruction) => (
                                <tr key={`${instruction.recordType}-${instruction.host}-${instruction.value}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td style={{ padding: "9px 6px", fontWeight: 700 }}>{instruction.recordType}</td>
                                  <td style={{ padding: "9px 6px", fontFamily: "monospace" }}>{instruction.host}</td>
                                  <td style={{ padding: "9px 6px", fontFamily: "monospace", wordBreak: "break-word" }}>{instruction.value}</td>
                                  <td style={{ padding: "9px 6px" }}>{instruction.expectedStatus}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                    <HostingDomainRecheckButton siteId={model.site.requestedSiteId} domainId={domain.id} />
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>,
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
        "Asset Diagnostics Drilldown",
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {metric("Total Diagnostics", model.assetDiagnostics.summary.total)}
            {metric("Critical", model.assetDiagnostics.summary.critical)}
            {metric("Warning", model.assetDiagnostics.summary.warning)}
            {metric("Info", model.assetDiagnostics.summary.info)}
          </div>
          {assetDiagnosticsTable(model.assetDiagnostics.entries)}
        </div>,
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
          {model.domainOperations.domains.map((domain) => (
            <div key={domain.id} style={{ borderTop: "1px solid #e5e7eb", marginTop: 4, paddingTop: 8, display: "grid", gap: 4 }}>
              <p style={{ margin: 0 }}>
                <strong>{domain.hostname}</strong>
              </p>
              <p style={{ margin: 0 }}>
                <strong>Last Domain Check:</strong> {text(domain.diagnostics.lastDomainCheck)}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Last Verification Result:</strong> {text(domain.diagnostics.lastVerificationResult)}
              </p>
              <p style={{ margin: 0 }}>
                <strong>Verification Diagnostics:</strong> {list(domain.diagnostics.verificationDiagnostics)}
              </p>
            </div>
          ))}
        </div>,
      )}
    </>
  );
}
