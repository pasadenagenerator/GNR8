import type { CanonicalSiteVersionSnapshot } from "@/gnr8/runtime/types";

export type RenderIntegrityIssue = {
  code: "MISSING_CRITICAL_CONTENT" | "INVALID_STRUCTURE" | "ASSET_RESOLUTION_FAILED";
  message: string;
  pagePath?: string;
};

export type RenderIntegrityResult =
  | { ok: true }
  | {
      ok: false;
      issues: RenderIntegrityIssue[];
    };

export function runRenderIntegrityGate(input: {
  siteVersion: CanonicalSiteVersionSnapshot;
  htmlByPath: Record<string, string>;
  assetFingerprintMap: Record<string, string>;
}): RenderIntegrityResult {
  const issues: RenderIntegrityIssue[] = [];

  for (const page of input.siteVersion.pages) {
    const path = page.path;
    const html = input.htmlByPath[path];
    if (!html || !html.trim()) {
      issues.push({
        code: "MISSING_CRITICAL_CONTENT",
        message: "Rendered HTML output is empty",
        pagePath: path,
      });
    }

    const sectionIds = page.structureModel.sections.map((s) => s.id);
    if (new Set(sectionIds).size !== sectionIds.length) {
      issues.push({
        code: "INVALID_STRUCTURE",
        message: "Structure model contains duplicate section IDs",
        pagePath: path,
      });
    }

    for (const section of page.structureModel.sections) {
      const props = page.contentModel.sectionProps[section.id];
      if (!props || Object.keys(props).length === 0) {
        issues.push({
          code: "MISSING_CRITICAL_CONTENT",
          message: `Section \"${section.id}\" has no content payload`,
          pagePath: path,
        });
      }
    }

    for (const asset of page.assetGraph) {
      if (asset.required && !input.assetFingerprintMap[asset.path]) {
        issues.push({
          code: "ASSET_RESOLUTION_FAILED",
          message: `Required asset \"${asset.path}\" did not resolve to a fingerprint`,
          pagePath: path,
        });
      }
    }
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
