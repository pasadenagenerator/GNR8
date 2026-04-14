import type {
  Diagnostic,
  ExternalDesignRequest,
  PromptBuildResult,
} from "../types/adapter-types";

const MAX_PAGE_LINES = 12;
const MAX_CONTENT_HIGHLIGHTS = 30;
const MAX_STYLE_LINES = 16;

const bulletList = (title: string, lines: string[]): string => {
  if (lines.length === 0) {
    return `${title}\n- none`;
  }

  return `${title}\n${lines.map((line) => `- ${line}`).join("\n")}`;
};

export const buildPromptLayers = (request: ExternalDesignRequest): PromptBuildResult => {
  const diagnostics: Diagnostic[] = [];

  const intentLayer = [
    `Primary intent: ${request.intent.primaryIntent}`,
    `Tone: ${request.intent.tone}`,
    `Density: ${request.intent.density}`,
    `Brand strength: ${request.intent.brandStrength}`,
    `Conversion focus: ${request.intent.conversionFocus}`,
    `Readability priority: ${request.intent.readabilityPriority}`,
  ];

  const pageLines = request.project.pages
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path))
    .slice(0, MAX_PAGE_LINES)
    .map((page) => {
      const sections = page.sectionOrder
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((section) => `${section.role}:${section.id}`)
        .join(" > ");
      return `${page.path} (${page.purpose}) => ${sections || "no-sections"}`;
    });

  if (request.project.pages.length > MAX_PAGE_LINES) {
    diagnostics.push({
      code: "PROMPT_STRUCTURE_TRUNCATED",
      severity: "warning",
      message: `Structure layer truncated from ${request.project.pages.length} to ${MAX_PAGE_LINES} pages`,
      data: { limit: MAX_PAGE_LINES },
    });
  }

  const contentLines = request.content.highlights
    .slice(0, MAX_CONTENT_HIGHLIGHTS)
    .map((item) => `${item.type} [${item.id}] @${item.ownerId}: ${item.valuePreview}`);

  if (request.content.highlights.length > MAX_CONTENT_HIGHLIGHTS) {
    diagnostics.push({
      code: "PROMPT_CONTENT_TRUNCATED",
      severity: "warning",
      message: `Content layer truncated from ${request.content.highlights.length} to ${MAX_CONTENT_HIGHLIGHTS} highlights`,
      data: { limit: MAX_CONTENT_HIGHLIGHTS },
    });
  }

  const styleLines = [
    ...request.style.colors.map((token) => `color/${token.role} [${token.id}] ${token.valueHex8}`),
    ...request.style.typography.map(
      (token) => `type/${token.role} [${token.id}] ${token.family} ${token.weight}/${token.sizePx}px`,
    ),
    `section-tone: ${request.style.sectionTone}`,
  ].slice(0, MAX_STYLE_LINES);

  const constraintLines = request.constraints
    .filter((constraint) => constraint.enabled)
    .map((constraint) => `${constraint.code}: ${constraint.note}`);

  const intentBlock = bulletList("Intent Layer", intentLayer);
  const structureBlock = bulletList("Structure Layer", pageLines);
  const contentBlock = bulletList("Content Layer", contentLines);
  const styleBlock = bulletList("Style Layer", styleLines);
  const constraintsBlock = bulletList("Constraints Layer", constraintLines);

  const instructions = [
    "Use only the context below. Keep content factual to provided records.",
    "Do not generate lorem ipsum.",
    "Preserve canonical section identity where possible.",
    "If structure conflicts, propose warnings instead of inventing hidden pages.",
    request.instructions,
  ].join(" ");

  return {
    instructions,
    contextBlocks: [intentBlock, structureBlock, contentBlock, styleBlock, constraintsBlock],
    diagnostics,
  };
};
