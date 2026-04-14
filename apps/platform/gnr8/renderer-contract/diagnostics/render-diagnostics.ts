import type { RenderDiagnostic, RendererContractContext } from "../types/renderer-types";

const DIAGNOSTIC_SEVERITY_RANK: Record<RenderDiagnostic["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function stringCmp(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function pushRenderDiagnostic(context: RendererContractContext, diagnostic: RenderDiagnostic): void {
  context.diagnostics.push(diagnostic);
}

export function sortRenderDiagnostics(input: RenderDiagnostic[]): RenderDiagnostic[] {
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
