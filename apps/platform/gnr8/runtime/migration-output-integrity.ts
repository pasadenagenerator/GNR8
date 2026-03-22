import type { CanonicalPageVersionInput, CanonicalSiteMigrationInput } from "@/gnr8/runtime/types";

export type MigrationOutputIssue = {
  code: string;
  message: string;
  pagePath?: string;
};

export type MigrationOutputIntegrityResult =
  | { ok: true }
  | {
      ok: false;
      issues: MigrationOutputIssue[];
    };

const REQUIRED_BASELINE_TOKEN_KEYS = ["color.background", "color.text", "spacing.section"];

function hasRuntimeHtmlBlob(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasRuntimeHtmlBlob);
  if (!value || typeof value !== "object") return false;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const k = key.toLowerCase();
    if (k === "html" || k === "runtimehtml" || k === "renderedhtml" || k === "bodyhtml") {
      return true;
    }
    if (hasRuntimeHtmlBlob(entry)) return true;
  }
  return false;
}

function validatePageVersionCompleteness(page: CanonicalPageVersionInput): MigrationOutputIssue[] {
  const issues: MigrationOutputIssue[] = [];

  if (!Array.isArray(page.structureModel.sections) || page.structureModel.sections.length === 0) {
    issues.push({
      code: "RENDER_INCOMPLETE_STRUCTURE",
      message: "structureModel.sections must contain at least one section",
      pagePath: page.path,
    });
  }

  const uniqueSectionIds = new Set<string>();
  for (const section of page.structureModel.sections ?? []) {
    if (!section.id || !section.type) {
      issues.push({
        code: "RENDER_INCOMPLETE_STRUCTURE",
        message: "Each structure section requires id and type",
        pagePath: page.path,
      });
      continue;
    }
    if (uniqueSectionIds.has(section.id)) {
      issues.push({
        code: "INVALID_STRUCTURE_DUPLICATE_SECTION_ID",
        message: `Duplicate section id \"${section.id}\"`,
        pagePath: page.path,
      });
      continue;
    }
    uniqueSectionIds.add(section.id);

    const props = page.contentModel.sectionProps[section.id];
    if (!props || typeof props !== "object") {
      issues.push({
        code: "RENDER_INCOMPLETE_CONTENT",
        message: `contentModel.sectionProps is missing section \"${section.id}\"`,
        pagePath: page.path,
      });
    }
  }

  for (const tokenKey of REQUIRED_BASELINE_TOKEN_KEYS) {
    if (!page.styleTokens[tokenKey]) {
      issues.push({
        code: "RENDER_INCOMPLETE_STYLE_TOKENS",
        message: `Missing baseline style token \"${tokenKey}\"`,
        pagePath: page.path,
      });
    }
  }

  if (!Array.isArray(page.assetGraph)) {
    issues.push({
      code: "RENDER_INCOMPLETE_ASSET_GRAPH",
      message: "assetGraph must be an array",
      pagePath: page.path,
    });
  }

  if (!Array.isArray(page.semanticSignals) || page.semanticSignals.length === 0) {
    issues.push({
      code: "RENDER_INCOMPLETE_SEMANTIC_SIGNALS",
      message: "semanticSignals must include at least one confidence-tagged entry",
      pagePath: page.path,
    });
  } else {
    for (const signal of page.semanticSignals) {
      const validConfidence = typeof signal.confidence === "number" && signal.confidence >= 0 && signal.confidence <= 1;
      if (!signal.label || !validConfidence) {
        issues.push({
          code: "INVALID_SEMANTIC_SIGNAL",
          message: "Each semantic signal requires label and confidence in [0,1]",
          pagePath: page.path,
        });
      }
    }
  }

  return issues;
}

export function validateMigrationOutputIntegrity(input: CanonicalSiteMigrationInput): MigrationOutputIntegrityResult {
  const issues: MigrationOutputIssue[] = [];

  if (!input.siteId.trim()) {
    issues.push({ code: "SITE_ID_REQUIRED", message: "siteId is required" });
  }

  if (!input.sourceUrl.trim()) {
    issues.push({ code: "SOURCE_URL_REQUIRED", message: "sourceUrl is required" });
  }

  if (!Array.isArray(input.pages) || input.pages.length === 0) {
    issues.push({ code: "PAGES_REQUIRED", message: "Migration must produce at least one PageVersion" });
  }

  if (hasRuntimeHtmlBlob(input)) {
    issues.push({
      code: "AUTHORITATIVE_RUNTIME_HTML_FORBIDDEN",
      message: "Runtime HTML blobs are not allowed in canonical migration output",
    });
  }

  for (const page of input.pages ?? []) {
    if (!page.pageId.trim()) {
      issues.push({ code: "PAGE_ID_REQUIRED", message: "pageId is required", pagePath: page.path });
    }
    if (!page.path.trim()) {
      issues.push({ code: "PAGE_PATH_REQUIRED", message: "path is required", pagePath: page.path });
    }
    issues.push(...validatePageVersionCompleteness(page));
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}
