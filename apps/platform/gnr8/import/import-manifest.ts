import type {
  AssetExistenceStatus,
  AssetKind,
  AssetReferenceKind,
  AssetValidationStatus,
  ImportDiagnosticCode,
  ImportOutput,
} from "./import-contract";

export const IMPORT_MANIFEST_VERSION = "1.0.0" as const;

export type ImportStatusSummary = "success" | "success_with_warnings" | "failed";

export type AssetReferenceManifestEntry = {
  id: string;
  assetKind: AssetKind;
  referenceKind: AssetReferenceKind;
  resolvedPath: string | null;
  existence: AssetExistenceStatus;
  validationStatus: AssetValidationStatus;
};

export type ImportManifest = {
  manifestVersion: typeof IMPORT_MANIFEST_VERSION;
  contractVersion: ImportOutput["contractVersion"];

  /**
   * Deterministic status summary derived from `importDiagnostics.summary`.
   * This is more operational than `ImportOutput.status` (which only gates on `fatal`).
   */
  status: ImportStatusSummary;

  /**
   * Raw importer status for traceability (ok vs failed=fatal).
   */
  outputStatus: ImportOutput["status"];

  /**
   * Canonical, root-relative POSIX paths from ImportOutput.
   * rootDirPath is not available in ImportOutput (and would be environment-specific).
   */
  rootDirPath: string | null;
  entryHtmlPath: string | null;
  sourceKind: ImportOutput["documentMeta"]["source"]["kind"];
  htmlFilePaths: string[];
  assetsDirPath: string | null;

  fingerprints: ImportOutput["documentMeta"]["fingerprints"];

  diagnostics: {
    totalCount: number;
    infoCount: number;
    warningCount: number;
    errorCount: number;
    fatalCount: number;
    codes: ImportDiagnosticCode[];
  };

  dom: {
    documentCount: number;
    documentsWithDomCount: number;
    nodeCount: number;
    parseWarningCount: number;
    decodingErrorCount: number;
    effectivelyEmpty: boolean;
    documentPaths: string[];
  };

  assets: {
    totalAssetFiles: number;
    totalAssets: number;
    referencesByAssetKind: Record<AssetKind, number>;
    referencesByReferenceKind: Record<AssetReferenceKind, number>;
    referencesByValidationStatus: Record<AssetValidationStatus, number>;
    existingLocalCount: number;
    missingLocalCount: number;
    references: AssetReferenceManifestEntry[];
  };
};

const ASSET_KINDS: readonly AssetKind[] = ["image", "stylesheet", "script", "unknown"];
const ASSET_REFERENCE_KINDS: readonly AssetReferenceKind[] = [
  "relative_local",
  "root_relative",
  "absolute_url",
  "data_url",
  "empty_invalid",
];
const ASSET_VALIDATION_STATUSES: readonly AssetValidationStatus[] = [
  "ok",
  "invalid_asset_reference",
  "unsupported_remote_asset",
  "unsupported_data_url_asset",
  "path_traversal_blocked",
  "missing_local_asset",
];

function emptyCountRecord<T extends string>(keys: readonly T[]): Record<T, number> {
  const out = Object.create(null) as Record<T, number>;
  for (const k of keys) out[k] = 0;
  return out;
}

function computeStatusSummary(summary: ImportOutput["importDiagnostics"]["summary"]): ImportStatusSummary {
  if (summary.fatalCount > 0 || summary.errorCount > 0) return "failed";
  if (summary.warningCount > 0) return "success_with_warnings";
  return "success";
}

export function createImportManifest(output: ImportOutput): ImportManifest {
  const issues = output.importDiagnostics.issues;
  const diagSummary = output.importDiagnostics.summary;

  const diagnosticCodeSet = new Set<ImportDiagnosticCode>();
  for (const issue of issues) diagnosticCodeSet.add(issue.code);
  const diagnosticCodes = [...diagnosticCodeSet].sort((a, b) => a.localeCompare(b));

  const documents = output.rawDomSnapshot.documents;
  const documentPaths = documents.map((d) => d.path).slice().sort((a, b) => a.localeCompare(b));

  let documentsWithDomCount = 0;
  let nodeCount = 0;
  let parseWarningCount = 0;
  let decodingErrorCount = 0;
  let effectivelyEmpty = true;

  for (const doc of documents) {
    if (doc.decoding.hadDecodingErrors) decodingErrorCount++;
    if (doc.text.trim().length > 0) effectivelyEmpty = false;

    if (doc.dom) {
      documentsWithDomCount++;
      nodeCount += doc.dom.nodeCount;
      parseWarningCount += doc.dom.parseWarnings.length;
    }
  }

  const references = output.assetRegistry.references;
  const referencesByAssetKind = emptyCountRecord(ASSET_KINDS);
  const referencesByReferenceKind = emptyCountRecord(ASSET_REFERENCE_KINDS);
  const referencesByValidationStatus = emptyCountRecord(ASSET_VALIDATION_STATUSES);

  let existingLocalCount = 0;
  let missingLocalCount = 0;

  const referenceEntries: AssetReferenceManifestEntry[] = [];
  for (const ref of references) {
    referencesByAssetKind[ref.assetKind]++;
    referencesByReferenceKind[ref.referenceKind]++;
    referencesByValidationStatus[ref.validationStatus]++;

    if (ref.existence === "exists") existingLocalCount++;
    if (ref.existence === "missing" || ref.validationStatus === "missing_local_asset") missingLocalCount++;

    referenceEntries.push({
      id: ref.id,
      assetKind: ref.assetKind,
      referenceKind: ref.referenceKind,
      resolvedPath: ref.resolvedPath,
      existence: ref.existence,
      validationStatus: ref.validationStatus,
    });
  }

  referenceEntries.sort((a, b) => a.id.localeCompare(b.id));

  const source = output.documentMeta.source;
  const htmlFilePaths = source.kind === "html-files" ? [...source.htmlFilePaths].sort((a, b) => a.localeCompare(b)) : [];
  const entryHtmlPath = source.entryHtmlPath;

  return {
    manifestVersion: IMPORT_MANIFEST_VERSION,
    contractVersion: output.contractVersion,

    status: computeStatusSummary(diagSummary),
    outputStatus: output.status,

    rootDirPath: null,
    entryHtmlPath,
    sourceKind: source.kind,
    htmlFilePaths,
    assetsDirPath: source.assetsDirPath,

    fingerprints: output.documentMeta.fingerprints,

    diagnostics: {
      totalCount: issues.length,
      infoCount: diagSummary.infoCount,
      warningCount: diagSummary.warningCount,
      errorCount: diagSummary.errorCount,
      fatalCount: diagSummary.fatalCount,
      codes: diagnosticCodes,
    },

    dom: {
      documentCount: documents.length,
      documentsWithDomCount,
      nodeCount,
      parseWarningCount,
      decodingErrorCount,
      effectivelyEmpty,
      documentPaths,
    },

    assets: {
      totalAssetFiles: output.assetRegistry.files.length,
      totalAssets: references.length,
      referencesByAssetKind,
      referencesByReferenceKind,
      referencesByValidationStatus,
      existingLocalCount,
      missingLocalCount,
      references: referenceEntries,
    },
  };
}
