import type { MergeConflict, MergeContext, MergeDiagnostic } from "../types/merge-types";

const DIAGNOSTIC_SEVERITY_RANK: Record<MergeDiagnostic["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

const CONFLICT_RESOLUTION_RANK: Record<MergeConflict["resolution"], number> = {
  merged: 0,
  used_import: 1,
  used_design: 2,
  fallback_generic: 3,
  skipped: 4,
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function pushDiagnostic(context: MergeContext, diagnostic: MergeDiagnostic): void {
  context.diagnostics.push(diagnostic);
}

export function pushConflict(context: MergeContext, conflict: MergeConflict): void {
  context.conflicts.push(conflict);
}

export function sortDiagnostics(input: MergeDiagnostic[]): MergeDiagnostic[] {
  return [...input].sort((a, b) => {
    const sev = DIAGNOSTIC_SEVERITY_RANK[a.severity] - DIAGNOSTIC_SEVERITY_RANK[b.severity];
    if (sev !== 0) return sev;

    const code = stringCmp(a.code, b.code);
    if (code !== 0) return code;

    const page = stringCmp(a.pageId ?? "", b.pageId ?? "");
    if (page !== 0) return page;

    const section = stringCmp(a.sectionId ?? "", b.sectionId ?? "");
    if (section !== 0) return section;

    return stringCmp(a.message, b.message);
  });
}

export function sortConflicts(input: MergeConflict[]): MergeConflict[] {
  return [...input].sort((a, b) => {
    const type = stringCmp(a.type, b.type);
    if (type !== 0) return type;

    const resolution = CONFLICT_RESOLUTION_RANK[a.resolution] - CONFLICT_RESOLUTION_RANK[b.resolution];
    if (resolution !== 0) return resolution;

    const aDetails = JSON.stringify(a.details ?? {});
    const bDetails = JSON.stringify(b.details ?? {});
    return stringCmp(aDetails, bDetails);
  });
}
