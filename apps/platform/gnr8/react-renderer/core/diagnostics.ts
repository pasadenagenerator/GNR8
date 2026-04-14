import type { RenderDiagnostic } from "@/gnr8/renderer-contract";

export const RUNTIME_FALLBACK_DIAGNOSTIC_CODES = new Set([
  "RUNTIME_ROUTE_NOT_FOUND",
  "RUNTIME_ROUTE_PAGE_UNRESOLVED",
  "RUNTIME_PAGE_EMPTY",
  "RUNTIME_SECTION_LAYOUT_UNSUPPORTED",
  "RUNTIME_COMPONENT_UNKNOWN_KIND",
  "RUNTIME_COMPONENT_PROP_MISSING",
  "RUNTIME_COMPONENT_MEDIA_MISSING",
  "RUNTIME_SLOT_MALFORMED",
]);

const DIAGNOSTIC_SEVERITY_RANK: Record<RenderDiagnostic["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function sortRuntimeDiagnostics(input: RenderDiagnostic[]): RenderDiagnostic[] {
  return [...input].sort((a, b) => {
    const sev = DIAGNOSTIC_SEVERITY_RANK[a.severity] - DIAGNOSTIC_SEVERITY_RANK[b.severity];
    if (sev !== 0) return sev;

    const code = stringCmp(a.code, b.code);
    if (code !== 0) return code;

    const page = stringCmp(a.pageId ?? "", b.pageId ?? "");
    if (page !== 0) return page;

    const section = stringCmp(a.sectionId ?? "", b.sectionId ?? "");
    if (section !== 0) return section;

    const component = stringCmp(a.componentId ?? "", b.componentId ?? "");
    if (component !== 0) return component;

    return stringCmp(a.message, b.message);
  });
}

export function didRenderWithFallback(diagnostics: RenderDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => RUNTIME_FALLBACK_DIAGNOSTIC_CODES.has(diagnostic.code));
}

export function buildDiagnostic(code: string, severity: RenderDiagnostic["severity"], message: string): RenderDiagnostic {
  return {
    code,
    severity,
    message,
  };
}
