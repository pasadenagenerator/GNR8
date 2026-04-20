import crypto from "node:crypto";

import type {
  ImportDiagnosticCode,
  ImportDiagnosticIssue,
  ImportDiagnosticLocation,
  ImportDiagnosticSeverity,
  ImportDiagnostics,
  JsonValue,
} from "../import-contract";

const SEVERITY_RANK: Record<ImportDiagnosticSeverity, number> = {
  fatal: 0,
  error: 1,
  warning: 2,
  info: 3,
};

export function stableStringify(value: JsonValue): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    const parts: string[] = [];
    for (const key of keys) {
      const v = value[key];
      if (v === undefined) continue;
      parts.push(`${JSON.stringify(key)}:${stableStringify(v)}`);
    }
    return `{${parts.join(",")}}`;
  }
  return "null";
}

export function sha256Hex(data: Uint8Array | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function createDiagnosticIssue(input: {
  severity: ImportDiagnosticSeverity;
  code: ImportDiagnosticCode;
  message: string;
  location: ImportDiagnosticLocation | null;
  details: JsonValue | null;
}): ImportDiagnosticIssue {
  const idPayload: JsonValue = {
    severity: input.severity,
    code: input.code,
    message: input.message,
    location: input.location,
  };

  return {
    id: sha256Hex(stableStringify(idPayload)),
    severity: input.severity,
    code: input.code,
    message: input.message,
    location: input.location,
    details: input.details,
  };
}

export function sortDiagnosticIssues(
  issues: ImportDiagnosticIssue[],
): ImportDiagnosticIssue[] {
  return [...issues].sort((a, b) => {
    const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (sev !== 0) return sev;
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;

    const aPath = a.location?.path ?? "";
    const bPath = b.location?.path ?? "";
    if (aPath !== bPath) return aPath < bPath ? -1 : 1;

    if (a.message !== b.message) return a.message < b.message ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function buildImportDiagnostics(issues: ImportDiagnosticIssue[]): ImportDiagnostics {
  const sorted = sortDiagnosticIssues(issues);
  let infoCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  let fatalCount = 0;

  for (const issue of sorted) {
    switch (issue.severity) {
      case "info":
        infoCount++;
        break;
      case "warning":
        warningCount++;
        break;
      case "error":
        errorCount++;
        break;
      case "fatal":
        fatalCount++;
        break;
    }
  }

  return {
    summary: { infoCount, warningCount, errorCount, fatalCount },
    issues: sorted,
  };
}

export function hasFatalIssues(issues: ImportDiagnosticIssue[]): boolean {
  return issues.some((i) => i.severity === "fatal");
}
