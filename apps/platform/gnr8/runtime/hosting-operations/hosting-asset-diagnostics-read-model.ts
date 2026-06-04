import type {
  CanonicalSiteVersionSnapshot,
  RawImportedSiteArtifact,
  RawTemplateSiteArtifact,
  RuntimeArtifact,
  RuntimeImportProvenanceSummary,
} from "@/gnr8/runtime/types";

type RawSiteArtifact = RawTemplateSiteArtifact | RawImportedSiteArtifact;

export type HostingAssetDiagnosticSeverity = "critical" | "warning" | "info";

export type HostingAssetFallbackStatus = "none" | "active" | "resolved";

export type HostingAssetDiagnosticCode =
  | "missing_asset"
  | "external_fallback"
  | "asset_lookup_failed"
  | "source_proxy_dependency"
  | "fallback_resolved";

export type HostingAssetDiagnosticEntry = {
  assetPath: string;
  assetType:
    | "runtime_required_asset"
    | "runtime_asset"
    | "raw_artifact"
    | "raw_file"
    | "external_fallback_asset"
    | "preview_asset"
    | "source_capture";
  severity: HostingAssetDiagnosticSeverity;
  diagnosticCode: HostingAssetDiagnosticCode;
  reason: string;
  source:
    | "runtime_artifact"
    | "runtime_import_provenance"
    | "raw_import_metadata"
    | "raw_template_artifact"
    | "raw_imported_artifact"
    | "preview_asset_diagnostics";
  remediation: string;
  fallbackStatus: HostingAssetFallbackStatus;
};

export type HostingAssetDiagnosticsReadModel = {
  summary: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
  entries: HostingAssetDiagnosticEntry[];
};

const REMEDIATION_BY_CODE: Record<HostingAssetDiagnosticCode, string> = {
  missing_asset: "Re-import or regenerate the affected artifact.",
  external_fallback: "Persist asset locally to remove source dependency.",
  asset_lookup_failed: "Verify artifact asset registration.",
  source_proxy_dependency: "Persist the affected source artifact locally before relying on it for production investigation.",
  fallback_resolved: "No action required; keep the fallback evidence for audit traceability.",
};

const SEVERITY_BY_CODE: Record<HostingAssetDiagnosticCode, HostingAssetDiagnosticSeverity> = {
  missing_asset: "critical",
  external_fallback: "warning",
  asset_lookup_failed: "critical",
  source_proxy_dependency: "warning",
  fallback_resolved: "info",
};

export const HOSTING_ASSET_DIAGNOSTIC_REMEDIATION_BY_CODE: Readonly<Record<HostingAssetDiagnosticCode, string>> = REMEDIATION_BY_CODE;

export const HOSTING_ASSET_DIAGNOSTIC_SEVERITY_BY_CODE: Readonly<
  Record<HostingAssetDiagnosticCode, HostingAssetDiagnosticSeverity>
> = SEVERITY_BY_CODE;

const SEVERITY_RANK: Record<HostingAssetDiagnosticSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

function remediationFor(code: HostingAssetDiagnosticCode): string {
  return REMEDIATION_BY_CODE[code];
}

function severityFor(code: HostingAssetDiagnosticCode): HostingAssetDiagnosticSeverity {
  return SEVERITY_BY_CODE[code];
}

function sourceForRawArtifact(rawArtifact: RawSiteArtifact | null): HostingAssetDiagnosticEntry["source"] {
  if (rawArtifact?.artifactType === "raw_template_site") return "raw_template_artifact";
  return "raw_imported_artifact";
}

function entry(input: Omit<HostingAssetDiagnosticEntry, "severity" | "remediation"> & { diagnosticCode: HostingAssetDiagnosticCode }) {
  return {
    ...input,
    severity: severityFor(input.diagnosticCode),
    remediation: remediationFor(input.diagnosticCode),
  };
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function rawImportCodes(rawArtifact: RawSiteArtifact | null): string[] {
  return rawArtifact?.artifactType === "raw_imported_site" ? rawArtifact.metadata.diagnostics.codes : [];
}

function externalFallbackCount(rawArtifact: RawSiteArtifact | null): number {
  return rawArtifact?.artifactType === "raw_imported_site" ? rawArtifact.metadata.assetSummary.externalFallbackAssetCount : 0;
}

function activeRequiredRuntimeAssetEntries(input: {
  activeVersion: CanonicalSiteVersionSnapshot | null;
  runtimeArtifact: RuntimeArtifact | null;
}): HostingAssetDiagnosticEntry[] {
  if (!input.activeVersion || !input.runtimeArtifact) return [];

  const entries: HostingAssetDiagnosticEntry[] = [];
  for (const page of input.activeVersion.pages) {
    for (const asset of page.assetGraph) {
      if (!asset.required) continue;
      if (input.runtimeArtifact.assetFingerprintMap[asset.path]) continue;
      entries.push(
        entry({
          assetPath: asset.path,
          assetType: "runtime_required_asset",
          diagnosticCode: "asset_lookup_failed",
          reason: `Required runtime asset is absent from the active artifact fingerprint map for ${page.path}.`,
          source: "runtime_artifact",
          fallbackStatus: "none",
        }),
      );
    }
  }
  return entries;
}

function rawArtifactEntries(rawArtifact: RawSiteArtifact | null): HostingAssetDiagnosticEntry[] {
  if (!rawArtifact) return [];
  const entries: HostingAssetDiagnosticEntry[] = [];
  const source = sourceForRawArtifact(rawArtifact);

  if (!rawArtifact.fileMap[rawArtifact.entryHtmlPath]) {
    entries.push(
      entry({
        assetPath: rawArtifact.entryHtmlPath,
        assetType: "raw_file",
        diagnosticCode: "missing_asset",
        reason: "Raw artifact entry HTML path is not present in the persisted file map.",
        source,
        fallbackStatus: "none",
      }),
    );
  }

  const codes = uniqueSorted(rawImportCodes(rawArtifact));
  if (codes.some((code) => normalizeCode(code) === "missing_local_asset")) {
    entries.push(
      entry({
        assetPath: "(raw import artifact)",
        assetType: "raw_artifact",
        diagnosticCode: "missing_asset",
        reason: "Raw import diagnostics include missing_local_asset.",
        source: "raw_import_metadata",
        fallbackStatus: "none",
      }),
    );
  }

  const fallbackCount = externalFallbackCount(rawArtifact);
  if (fallbackCount > 0 || codes.some((code) => normalizeCode(code) === "unsupported_remote_asset")) {
    entries.push(
      entry({
        assetPath: fallbackCount > 0 ? `(${fallbackCount} external fallback asset${fallbackCount === 1 ? "" : "s"})` : "(external fallback assets)",
        assetType: "external_fallback_asset",
        diagnosticCode: "external_fallback",
        reason:
          fallbackCount > 0
            ? `${fallbackCount} external asset fallback${fallbackCount === 1 ? "" : "s"} recorded in raw import metadata.`
            : "Raw import diagnostics include unsupported_remote_asset.",
        source: "raw_import_metadata",
        fallbackStatus: "active",
      }),
    );
  }

  return entries;
}

function provenanceEntries(importProvenanceSummary: RuntimeImportProvenanceSummary | null): HostingAssetDiagnosticEntry[] {
  if (!importProvenanceSummary) return [];
  const entries: HostingAssetDiagnosticEntry[] = [];
  const codes = uniqueSorted(importProvenanceSummary.importDiagnosticCodes);

  if (codes.some((code) => normalizeCode(code) === "missing_local_asset")) {
    entries.push(
      entry({
        assetPath: importProvenanceSummary.captureEvidence.entryHtmlPath ?? "(runtime import artifact)",
        assetType: "raw_artifact",
        diagnosticCode: "missing_asset",
        reason: "Runtime import provenance includes missing_local_asset.",
        source: "runtime_import_provenance",
        fallbackStatus: "none",
      }),
    );
  }

  if (codes.some((code) => normalizeCode(code).includes("preview_asset_route_db_lookup_error"))) {
    entries.push(
      entry({
        assetPath: "(preview asset route)",
        assetType: "preview_asset",
        diagnosticCode: "asset_lookup_failed",
        reason: "Preview asset diagnostics reported a database lookup failure.",
        source: "preview_asset_diagnostics",
        fallbackStatus: "none",
      }),
    );
  }

  if (codes.some((code) => normalizeCode(code).includes("fallback"))) {
    entries.push(
      entry({
        assetPath: importProvenanceSummary.captureEvidence.entryHtmlPath ?? "(runtime import artifact)",
        assetType: "source_capture",
        diagnosticCode: "external_fallback",
        reason: "Runtime import provenance includes fallback diagnostics.",
        source: "runtime_import_provenance",
        fallbackStatus: "active",
      }),
    );
  }

  if (importProvenanceSummary.sourceMode === "raw_html_fallback") {
    entries.push(
      entry({
        assetPath: importProvenanceSummary.captureEvidence.entryHtmlPath ?? "(source capture)",
        assetType: "source_capture",
        diagnosticCode: "source_proxy_dependency",
        reason: "Runtime import provenance selected raw_html_fallback as the source mode.",
        source: "runtime_import_provenance",
        fallbackStatus: "active",
      }),
    );
  }

  return entries;
}

function dedupeEntries(entries: HostingAssetDiagnosticEntry[]): HostingAssetDiagnosticEntry[] {
  const byKey = new Map<string, HostingAssetDiagnosticEntry>();
  for (const candidate of entries) {
    const key = [
      candidate.assetPath,
      candidate.assetType,
      candidate.diagnosticCode,
      candidate.source,
      candidate.fallbackStatus,
    ].join("\0");
    if (!byKey.has(key)) byKey.set(key, candidate);
  }

  return [...byKey.values()].sort((a, b) => {
    const severity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (severity !== 0) return severity;
    const path = a.assetPath.localeCompare(b.assetPath);
    if (path !== 0) return path;
    const code = a.diagnosticCode.localeCompare(b.diagnosticCode);
    if (code !== 0) return code;
    return a.source.localeCompare(b.source);
  });
}

export function createHostingAssetDiagnosticsReadModel(input: {
  activeVersion: CanonicalSiteVersionSnapshot | null;
  runtimeArtifact: RuntimeArtifact | null;
  rawArtifact: RawSiteArtifact | null;
  importProvenanceSummary: RuntimeImportProvenanceSummary | null;
}): HostingAssetDiagnosticsReadModel {
  const entries = dedupeEntries([
    ...activeRequiredRuntimeAssetEntries({
      activeVersion: input.activeVersion,
      runtimeArtifact: input.runtimeArtifact,
    }),
    ...rawArtifactEntries(input.rawArtifact),
    ...provenanceEntries(input.importProvenanceSummary),
  ]);

  return {
    summary: {
      total: entries.length,
      critical: entries.filter((candidate) => candidate.severity === "critical").length,
      warning: entries.filter((candidate) => candidate.severity === "warning").length,
      info: entries.filter((candidate) => candidate.severity === "info").length,
    },
    entries,
  };
}
