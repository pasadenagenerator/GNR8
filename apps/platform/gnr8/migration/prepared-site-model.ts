import type { AssetKind, AssetReferenceKind, AssetValidationStatus } from "../import/import-contract";
import type { ImportManifest } from "../import/import-manifest";
import type { ImportOutput } from "../import/import-contract";
import { sha256Hex } from "./runtime/diagnostics";

export const PREPARED_SITE_MODEL_VERSION = "1.0.0" as const;

export type PreparedSitePreparationStatus = "ready" | "ready_with_warnings" | "blocked";

export type PreparedDocumentOriginalKind = "entry_html" | "html_document";

export type PreparedDocumentRecord = {
  id: string;
  path: string;
  isEntry: boolean;
  originalKind: PreparedDocumentOriginalKind;

  normalizedHtmlAvailable: boolean;
  serializedDomAvailable: boolean;
  nodeCount: number;
  parseWarningCount: number;
  decodingHadErrors: boolean;
  effectivelyEmpty: boolean;

  contentSha256: string;
  byteLength: number;

  assetReferenceIds: string[];
};

export type PreparedSiteModel = {
  kind: "prepared_site_model_v1";
  modelVersion: typeof PREPARED_SITE_MODEL_VERSION;

  source: {
    importContractVersion: ImportOutput["contractVersion"];
    importManifestVersion: ImportManifest["manifestVersion"];
    fingerprints: ImportOutput["documentMeta"]["fingerprints"];

    sourceKind: ImportManifest["sourceKind"];
    entryHtmlPath: string | null;
    htmlFilePaths: string[];
    assetsDirPath: string | null;
  };

  status: PreparedSitePreparationStatus;

  siteSummary: {
    documentCount: number;
    entryDocumentId: string | null;
    documentsWithNormalizedHtmlCount: number;
    documentsWithDomCount: number;
    totalNodeCount: number;
    totalParseWarningCount: number;
    effectivelyEmpty: boolean;
  };

  preparedAssets: {
    assetFiles: {
      totalCount: number;
    };
    references: {
      totalCount: number;
      referencesByAssetKind: Record<AssetKind, number>;
      referencesByReferenceKind: Record<AssetReferenceKind, number>;
      referencesByValidationStatus: Record<AssetValidationStatus, number>;
      existingLocalCount: number;
      missingLocalCount: number;
    };
  };

  diagnostics: {
    import: {
      totalCount: number;
      infoCount: number;
      warningCount: number;
      errorCount: number;
      fatalCount: number;
      codes: string[];
      issueIds: string[];
    };
  };

  documents: PreparedDocumentRecord[];
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function computeStatus(importOutput: ImportOutput, importManifest: ImportManifest): PreparedSitePreparationStatus {
  const blocked = importOutput.status === "failed" || importManifest.status === "failed";
  if (blocked) return "blocked";
  if (importManifest.status === "success_with_warnings") return "ready_with_warnings";
  return "ready";
}

function documentIdForPath(path: string): string {
  return sha256Hex(`prepared_document_v1:${path}`);
}

function toCanonicalDocumentList(documents: ImportOutput["rawDomSnapshot"]["documents"]): ImportOutput["rawDomSnapshot"]["documents"] {
  const sorted = [...documents].sort((a, b) => {
    if (a.path !== b.path) return stringCmp(a.path, b.path);
    if (a.contentSha256 !== b.contentSha256) return stringCmp(a.contentSha256, b.contentSha256);
    if (a.byteLength !== b.byteLength) return a.byteLength - b.byteLength;
    return 0;
  });

  const out: ImportOutput["rawDomSnapshot"]["documents"] = [];
  const seen = new Set<string>();
  for (const doc of sorted) {
    if (seen.has(doc.path)) continue;
    seen.add(doc.path);
    out.push(doc);
  }
  return out;
}

export function createPreparedSiteModel(input: {
  importOutput: ImportOutput;
  importManifest: ImportManifest;
}): PreparedSiteModel {
  const { importOutput, importManifest } = input;

  const docs = toCanonicalDocumentList(importOutput.rawDomSnapshot.documents);

  const referenceIdsByDocumentPath = new Map<string, string[]>();
  for (const ref of importOutput.assetRegistry.references) {
    const list = referenceIdsByDocumentPath.get(ref.fromDocumentPath);
    if (list) list.push(ref.id);
    else referenceIdsByDocumentPath.set(ref.fromDocumentPath, [ref.id]);
  }
  for (const [docPath, ids] of referenceIdsByDocumentPath) {
    ids.sort(stringCmp);
    referenceIdsByDocumentPath.set(docPath, ids);
  }

  const entryPath = importManifest.entryHtmlPath;
  const documents: PreparedDocumentRecord[] = [];

  let documentsWithNormalizedHtmlCount = 0;
  let documentsWithDomCount = 0;
  let totalNodeCount = 0;
  let totalParseWarningCount = 0;
  let effectivelyEmpty = true;

  for (const doc of docs) {
    const normalizedHtmlAvailable = doc.text.length > 0;
    const serializedDomAvailable = doc.dom !== null && doc.dom.serializedDom.length > 0;
    const nodeCount = doc.dom?.nodeCount ?? 0;
    const parseWarningCount = doc.dom?.parseWarnings.length ?? 0;
    const decodingHadErrors = doc.decoding.hadDecodingErrors;
    const docEffectivelyEmpty = doc.text.trim().length === 0;
    const isEntry = entryPath !== null && doc.path === entryPath;

    if (normalizedHtmlAvailable) documentsWithNormalizedHtmlCount++;
    if (doc.dom) documentsWithDomCount++;
    totalNodeCount += nodeCount;
    totalParseWarningCount += parseWarningCount;
    if (!docEffectivelyEmpty) effectivelyEmpty = false;

    const assetReferenceIds = referenceIdsByDocumentPath.get(doc.path) ?? [];

    documents.push({
      id: documentIdForPath(doc.path),
      path: doc.path,
      isEntry,
      originalKind: isEntry ? "entry_html" : "html_document",
      normalizedHtmlAvailable,
      serializedDomAvailable,
      nodeCount,
      parseWarningCount,
      decodingHadErrors,
      effectivelyEmpty: docEffectivelyEmpty,
      contentSha256: doc.contentSha256,
      byteLength: doc.byteLength,
      assetReferenceIds,
    });
  }

  const entryDocumentId =
    entryPath === null ? null : documents.find((d) => d.path === entryPath)?.id ?? null;

  const issueIds = importOutput.importDiagnostics.issues.map((i) => i.id).slice().sort(stringCmp);
  const codes = [...new Set(importManifest.diagnostics.codes)].sort(stringCmp);

  const status = computeStatus(importOutput, importManifest);

  return {
    kind: "prepared_site_model_v1",
    modelVersion: PREPARED_SITE_MODEL_VERSION,
    source: {
      importContractVersion: importOutput.contractVersion,
      importManifestVersion: importManifest.manifestVersion,
      fingerprints: importManifest.fingerprints,
      sourceKind: importManifest.sourceKind,
      entryHtmlPath: importManifest.entryHtmlPath,
      htmlFilePaths: [...importManifest.htmlFilePaths].slice().sort(stringCmp),
      assetsDirPath: importManifest.assetsDirPath,
    },
    status,
    siteSummary: {
      documentCount: documents.length,
      entryDocumentId,
      documentsWithNormalizedHtmlCount,
      documentsWithDomCount,
      totalNodeCount,
      totalParseWarningCount,
      effectivelyEmpty,
    },
    preparedAssets: {
      assetFiles: {
        totalCount: importManifest.assets.totalAssetFiles,
      },
      references: {
        totalCount: importManifest.assets.totalAssets,
        referencesByAssetKind: importManifest.assets.referencesByAssetKind,
        referencesByReferenceKind: importManifest.assets.referencesByReferenceKind,
        referencesByValidationStatus: importManifest.assets.referencesByValidationStatus,
        existingLocalCount: importManifest.assets.existingLocalCount,
        missingLocalCount: importManifest.assets.missingLocalCount,
      },
    },
    diagnostics: {
      import: {
        totalCount: importManifest.diagnostics.totalCount,
        infoCount: importManifest.diagnostics.infoCount,
        warningCount: importManifest.diagnostics.warningCount,
        errorCount: importManifest.diagnostics.errorCount,
        fatalCount: importManifest.diagnostics.fatalCount,
        codes,
        issueIds,
      },
    },
    documents,
  };
}

