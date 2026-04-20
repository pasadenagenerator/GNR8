import type { ImportDiagnosticCode, ImportDiagnosticIssue, ImportOutput } from "./import-contract";

/**
 * Non-structural asset diagnostics:
 * - remain visible and traceable end-to-end
 * - do not block deterministic phase-1 progression when structure is usable
 */
export const NON_STRUCTURAL_DEGRADED_IMPORT_CODES = [
  "missing_local_asset",
  "unsupported_remote_asset",
  "unsupported_data_url_asset",
] as const satisfies readonly ImportDiagnosticCode[];

const NON_STRUCTURAL_DEGRADED_IMPORT_CODE_SET = new Set<ImportDiagnosticCode>(NON_STRUCTURAL_DEGRADED_IMPORT_CODES);

export function isNonStructuralDegradedImportCode(code: ImportDiagnosticCode): boolean {
  return NON_STRUCTURAL_DEGRADED_IMPORT_CODE_SET.has(code);
}

export function hasStructurallyUsableImportDocuments(output: Pick<ImportOutput, "rawDomSnapshot">): boolean {
  const docs = output.rawDomSnapshot.documents;
  if (docs.length === 0) return false;
  return docs.some((doc) => doc.dom !== null);
}

export function isStructuralBlockingImportIssue(issue: Pick<ImportDiagnosticIssue, "severity" | "code">): boolean {
  if (issue.severity === "fatal") return true;
  if (issue.severity !== "error") return false;
  return !isNonStructuralDegradedImportCode(issue.code);
}

export function hasStructuralImportBlockers(
  output: Pick<ImportOutput, "status" | "rawDomSnapshot" | "importDiagnostics">,
): boolean {
  if (output.status === "failed") return true;
  if (!hasStructurallyUsableImportDocuments(output)) return true;
  return output.importDiagnostics.issues.some(isStructuralBlockingImportIssue);
}

