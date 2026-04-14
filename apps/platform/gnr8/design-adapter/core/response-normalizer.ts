import type {
  DesignAdapterResult,
  Diagnostic,
  ExternalDesignRequest,
  GeneratedComponent,
  GeneratedPage,
  GeneratedSection,
  NormalizedTokenPatch,
  VendorDesignResponse,
} from "../types/adapter-types";

const clamp01 = (value: number): number => {
  if (Number.isNaN(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const normalizeGeneratedComponents = (
  sectionId: string,
  rawComponents: unknown,
  diagnostics: Diagnostic[],
): GeneratedComponent[] => {
  return asArray(rawComponents)
    .map((component, index) => {
      const node = asRecord(component);
      if (!node) {
        diagnostics.push({
          code: "NORMALIZE_COMPONENT_INVALID",
          severity: "warning",
          message: `Component at index ${index} in section ${sectionId} is invalid`,
          inferred: true,
        });
        return null;
      }

      const id = typeof node.id === "string" ? node.id : `${sectionId}-component-${index + 1}`;
      const type = typeof node.type === "string" ? node.type : "custom";
      const variant = typeof node.variant === "string" ? node.variant : "default";
      const confidence = clamp01(typeof node.confidence === "number" ? node.confidence : 0.5);
      const props = asRecord(node.props) ?? {};

      if (type === "custom") {
        diagnostics.push({
          code: "NORMALIZE_COMPONENT_CUSTOM",
          severity: "info",
          message: `Unknown component type mapped to custom for ${id}`,
          inferred: true,
        });
      }

      return {
        id,
        sectionId,
        type,
        variant,
        props,
        confidence,
      };
    })
    .filter((component): component is GeneratedComponent => component !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
};

const normalizeSections = (pageId: string, rawSections: unknown, diagnostics: Diagnostic[]): GeneratedSection[] => {
  return asArray(rawSections)
    .map((section, index) => {
      const node = asRecord(section);
      if (!node) {
        diagnostics.push({
          code: "NORMALIZE_SECTION_INVALID",
          severity: "warning",
          message: `Section at index ${index} in page ${pageId} is invalid`,
          inferred: true,
        });
        return null;
      }

      const id = typeof node.id === "string" ? node.id : `${pageId}-section-${index + 1}`;
      const role = typeof node.role === "string" ? node.role : "unknown";
      const layoutType = typeof node.layoutType === "string" ? node.layoutType : "stack";
      const warnings = asArray(node.warnings).filter((entry): entry is string => typeof entry === "string");
      const confidence = clamp01(typeof node.confidence === "number" ? node.confidence : 0.5);

      const components = normalizeGeneratedComponents(id, node.components, diagnostics);

      return {
        id,
        role,
        layoutType,
        components,
        warnings,
        confidence,
      };
    })
    .filter((section): section is GeneratedSection => section !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
};

const normalizePages = (
  request: ExternalDesignRequest,
  rawPages: unknown,
  diagnostics: Diagnostic[],
): GeneratedPage[] => {
  const indexedRequestPages = new Map(request.project.pages.map((page) => [page.id, page]));

  const pages = asArray(rawPages)
    .map((page, index) => {
      const node = asRecord(page);
      if (!node) {
        diagnostics.push({
          code: "NORMALIZE_PAGE_INVALID",
          severity: "warning",
          message: `Page at index ${index} is invalid`,
          inferred: true,
        });
        return null;
      }

      const id = typeof node.id === "string" ? node.id : request.project.pages[index]?.id ?? `generated-page-${index + 1}`;
      const canonical = indexedRequestPages.get(id);
      const path = typeof node.path === "string" ? node.path : canonical?.path ?? "/";
      const warnings = asArray(node.warnings).filter((entry): entry is string => typeof entry === "string");
      const confidence = clamp01(typeof node.confidence === "number" ? node.confidence : 0.5);
      const sections = normalizeSections(id, node.sections, diagnostics);

      return {
        id,
        path,
        sections,
        warnings,
        confidence,
      };
    })
    .filter((page): page is GeneratedPage => page !== null)
    .sort((a, b) => a.path.localeCompare(b.path));

  if (pages.length === 0) {
    diagnostics.push({
      code: "NORMALIZE_PARTIAL_EMPTY_PAGES",
      severity: "warning",
      message: "Vendor response did not include valid pages; returning empty normalized pages",
      inferred: true,
    });
  }

  return pages;
};

const normalizeTokens = (rawTokens: unknown, diagnostics: Diagnostic[]): NormalizedTokenPatch[] => {
  return asArray(rawTokens)
    .map((token, index) => {
      const node = asRecord(token);
      if (!node) {
        diagnostics.push({
          code: "NORMALIZE_TOKEN_INVALID",
          severity: "warning",
          message: `Token patch at index ${index} is invalid`,
          inferred: true,
        });
        return null;
      }

      const tokenType =
        node.tokenType === "color" ||
        node.tokenType === "typography" ||
        node.tokenType === "spacing" ||
        node.tokenType === "surface" ||
        node.tokenType === "component"
          ? node.tokenType
          : "component";

      return {
        tokenType,
        tokenId: typeof node.tokenId === "string" ? node.tokenId : `token-${index + 1}`,
        value: typeof node.value === "string" ? node.value : "",
        source: node.source === "vendor" ? "vendor" : "inferred",
        confidence: clamp01(typeof node.confidence === "number" ? node.confidence : 0.5),
      };
    })
    .filter((token): token is NormalizedTokenPatch => token !== null)
    .sort((a, b) => a.tokenId.localeCompare(b.tokenId));
};

const calculateConfidence = (pages: GeneratedPage[], tokens: NormalizedTokenPatch[], diagnostics: Diagnostic[]): number => {
  const pageScore = pages.length === 0 ? 0.25 : pages.reduce((sum, page) => sum + page.confidence, 0) / pages.length;
  const tokenScore = tokens.length === 0 ? 0.5 : tokens.reduce((sum, token) => sum + token.confidence, 0) / tokens.length;
  const errorPenalty = diagnostics.filter((item) => item.severity === "error").length * 0.1;
  const warningPenalty = diagnostics.filter((item) => item.severity === "warning").length * 0.02;

  return clamp01(pageScore * 0.7 + tokenScore * 0.3 - errorPenalty - warningPenalty);
};

export const normalizeVendorResponseDeterministically = (
  response: VendorDesignResponse,
  request: ExternalDesignRequest,
  baseDiagnostics: Diagnostic[] = [],
): DesignAdapterResult => {
  const diagnostics = [...baseDiagnostics];

  const root = asRecord(response.raw);
  if (!root) {
    diagnostics.push({
      code: "NORMALIZE_RESPONSE_NOT_OBJECT",
      severity: "error",
      message: "Vendor response raw payload is not an object",
      inferred: true,
    });

    return {
      normalized: {
        pages: [],
        globalDesign: {
          tone: request.intent.tone,
          density: request.intent.density,
          notes: ["No normalized layout due to invalid payload"],
        },
        tokens: [],
        components: [],
        warnings: [
          {
            code: "INVALID_VENDOR_PAYLOAD",
            message: "Vendor payload could not be normalized",
            targetId: null,
          },
        ],
      },
      diagnostics,
      confidence: 0,
    };
  }

  const pages = normalizePages(request, root.pages, diagnostics);
  const tokens = normalizeTokens(root.tokens, diagnostics);
  const components = pages.flatMap((page) => page.sections.flatMap((section) => section.components));
  const warnings = asArray(root.warnings)
    .map((warning, index) => {
      const node = asRecord(warning);
      if (!node) {
        return {
          code: `NORMALIZED_WARNING_${index + 1}`,
          message: "Unstructured warning from vendor response",
          targetId: null,
        };
      }

      return {
        code: typeof node.code === "string" ? node.code : `NORMALIZED_WARNING_${index + 1}`,
        message: typeof node.message === "string" ? node.message : "Unspecified vendor warning",
        targetId: typeof node.targetId === "string" ? node.targetId : null,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  const confidence = calculateConfidence(pages, tokens, diagnostics);

  return {
    normalized: {
      pages,
      globalDesign: {
        tone: typeof root.tone === "string" ? root.tone : request.intent.tone,
        density: typeof root.density === "string" ? root.density : request.intent.density,
        notes: [
          `normalized-from:${response.metadata.vendor}`,
          `request-fingerprint:${request.requestFingerprint}`,
        ],
      },
      tokens,
      components,
      warnings,
    },
    diagnostics,
    confidence,
  };
};
