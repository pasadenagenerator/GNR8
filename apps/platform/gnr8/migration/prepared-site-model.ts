import type { AssetKind, AssetReferenceKind, AssetValidationStatus } from "../import/import-contract";
import type { ImportManifest } from "../import/import-manifest";
import type { ImportOutput } from "../import/import-contract";
import { parse } from "parse5";
import { sha256Hex } from "./runtime/diagnostics";

export const PREPARED_SITE_MODEL_VERSION = "1.2.0" as const;

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

  /**
   * Compact, deterministic structural outline of `<body>` suitable for phase-1 layout preparation.
   * This avoids duplicating full DOM payloads while enabling stable block extraction later.
   *
   * `null` when no serialized DOM snapshot was available for this document.
   */
  domOutline: PreparedDocumentDomOutline | null;
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

export type PreparedDocumentDomOutline = {
  kind: "prepared_document_dom_outline_v1";
  bodyAvailable: boolean;
  bodyChildElements: PreparedDomOutlineElement[];
};

export type PreparedDomOutlineElement = {
  tagName: string;
  domPath: string;
  ordinalIndex: number;
  nthOfType: number;
  childElementCount: number;
  directTextPresent: boolean;
  textPresent: boolean;
  /**
   * Deterministic, compact text excerpt derived from the element subtree.
   * - `null` when no non-whitespace text nodes were found.
   * - Intended for phase-1 preview visibility only (not design fidelity).
   */
  textExcerpt: string | null;
  childElements: PreparedDomOutlineElement[];
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

function isElement(node: unknown): node is { tagName: string; childNodes?: unknown[] } {
  return !!node && typeof node === "object" && typeof (node as { tagName?: unknown }).tagName === "string";
}

function walkDom(node: unknown, visit: (n: unknown) => void): void {
  const stack: unknown[] = [node];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    visit(current);
    const childNodes = (current as { childNodes?: unknown[] }).childNodes;
    if (Array.isArray(childNodes)) {
      for (let i = childNodes.length - 1; i >= 0; i--) stack.push(childNodes[i]);
    }
    const content = (current as { content?: unknown }).content;
    if (content && typeof content === "object") stack.push(content);
  }
}

function findFirstElementByTagName(root: unknown, tagNameLower: string): unknown | null {
  let found: unknown | null = null;
  walkDom(root, (n) => {
    if (found) return;
    if (!isElement(n)) return;
    if (n.tagName.toLowerCase() === tagNameLower) found = n;
  });
  return found;
}

const DOM_OUTLINE_TEXT_EXCERPT_MAX_CHARS = 160;

function normalizeWhitespace(input: string): string {
  // Stable: collapse all whitespace sequences to single spaces and trim ends.
  return input.replaceAll(/\s+/g, " ").trim();
}

function escapeTextForExcerpt(raw: unknown): string {
  return String(raw ?? "");
}

function textValueFromNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const raw = (node as { value?: unknown; data?: unknown }).value ?? (node as { data?: unknown }).data ?? "";
  return escapeTextForExcerpt(raw);
}

function hasDirectNonWhitespaceTextChild(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const children = (node as { childNodes?: unknown[] }).childNodes;
  if (!Array.isArray(children) || children.length === 0) return false;
  for (const child of children) {
    if (!child || typeof child !== "object") continue;
    const nodeName = String((child as { nodeName?: unknown }).nodeName ?? "");
    if (nodeName !== "#text") continue;
    if (textValueFromNode(child).trim().length > 0) return true;
  }
  return false;
}

function computeTextExcerptFromSubtree(node: unknown): string | null {
  // Deterministic: traverse text nodes in document order, normalize whitespace, cap length.
  let sawNonWhitespace = false;
  let collected = "";
  let done = false;

  walkDom(node, (n) => {
    if (done) return;
    if (!n || typeof n !== "object") return;
    const nodeName = String((n as { nodeName?: unknown }).nodeName ?? "");
    if (nodeName !== "#text") return;

    const raw = (n as { value?: unknown; data?: unknown }).value ?? (n as { data?: unknown }).data ?? "";
    const rawStr = escapeTextForExcerpt(raw);
    if (rawStr.trim().length > 0) sawNonWhitespace = true;
    collected += rawStr;

    // Stop early to keep processing bounded; normalization/truncation happens after.
    if (collected.length >= DOM_OUTLINE_TEXT_EXCERPT_MAX_CHARS * 2) done = true;
  });

  if (!sawNonWhitespace) return null;

  const normalized = normalizeWhitespace(collected);
  if (normalized.length <= DOM_OUTLINE_TEXT_EXCERPT_MAX_CHARS) return normalized;

  // Stable truncation marker; avoids embedding large DOM payloads.
  const head = normalized.slice(0, Math.max(0, DOM_OUTLINE_TEXT_EXCERPT_MAX_CHARS - 1)).trimEnd();
  return `${head}…`;
}

function buildChildElements(parent: unknown, parentDomPath: string): PreparedDomOutlineElement[] {
  if (!parent || typeof parent !== "object") return [];
  const childNodes = (parent as { childNodes?: unknown[] }).childNodes ?? [];
  const elementChildren = childNodes.filter(isElement);
  const typeCounts = new Map<string, number>();
  const out: PreparedDomOutlineElement[] = [];

  for (let i = 0; i < elementChildren.length; i++) {
    const el = elementChildren[i]!;
    const tagName = el.tagName.toLowerCase();
    const nthOfType = (typeCounts.get(tagName) ?? 0) + 1;
    typeCounts.set(tagName, nthOfType);

    const domPath = `${parentDomPath}>${tagName}:nth-of-type(${nthOfType})`;
    const childElements = buildChildElements(el, domPath);
    const textExcerpt = computeTextExcerptFromSubtree(el);

    out.push({
      tagName,
      domPath,
      ordinalIndex: i,
      nthOfType,
      childElementCount: childElements.length,
      directTextPresent: hasDirectNonWhitespaceTextChild(el),
      textPresent: textExcerpt !== null,
      textExcerpt,
      childElements,
    });
  }

  return out;
}

function createDomOutlineFromSerializedDom(serializedDom: string): PreparedDocumentDomOutline {
  const document = parse(serializedDom);
  const body = findFirstElementByTagName(document, "body");

  if (!body || typeof body !== "object") {
    return { kind: "prepared_document_dom_outline_v1", bodyAvailable: false, bodyChildElements: [] };
  }

  const bodyChildElements = buildChildElements(body, "html>body");
  return { kind: "prepared_document_dom_outline_v1", bodyAvailable: true, bodyChildElements };
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
    const domOutline = serializedDomAvailable ? createDomOutlineFromSerializedDom(doc.dom?.serializedDom ?? "") : null;

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
      domOutline,
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
