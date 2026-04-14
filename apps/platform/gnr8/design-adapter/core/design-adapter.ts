import { createHash } from "node:crypto";
import { buildPromptLayers } from "./prompt-builder";
import { normalizeVendorResponseDeterministically } from "./response-normalizer";
import type {
  DesignAdapterInput,
  Diagnostic,
  DesignAdapterResult,
  ExternalDesignRequest,
  VendorAdapterContract,
  VendorDesignResponse,
} from "../types/adapter-types";

type CreateExternalDesignRequestResult = {
  request: ExternalDesignRequest;
  diagnostics: Diagnostic[];
};

const DEFAULT_PRIMARY_INTENT = "Modern, conversion-aware, readable site design";

const hash = (value: string): string => {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
};

const previewContentValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value.replace(/\s+/g, " ").trim().slice(0, 160);
  }

  if (value && typeof value === "object" && "assetRef" in (value as Record<string, unknown>)) {
    const assetRef = (value as { assetRef?: unknown }).assetRef;
    return typeof assetRef === "string" ? `[asset] ${assetRef}` : "[asset]";
  }

  return "[structured-content]";
};

const projectPagesFromStructure = (input: DesignAdapterInput): ExternalDesignRequest["project"]["pages"] => {
  const sectionsByPage = new Map<string, ExternalDesignRequest["project"]["pages"][number]["sectionOrder"]>();

  for (const section of input.structure.sections) {
    if (!sectionsByPage.has(section.pageId)) {
      sectionsByPage.set(section.pageId, []);
    }
    sectionsByPage.get(section.pageId)?.push({
      id: section.id,
      role: section.role,
      order: section.order,
    });
  }

  return input.structure.pages
    .map((page) => ({
      id: page.id,
      path: page.path,
      purpose: page.purpose,
      sectionOrder: (sectionsByPage.get(page.id) ?? []).slice().sort((a, b) => a.order - b.order),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
};

const constraintsFromInput = (input: DesignAdapterInput): ExternalDesignRequest["constraints"] => {
  const constraints = input.constraints;
  return [
    {
      code: "PRESERVE_CONTENT_TEXT",
      enabled: constraints?.preserveContentText ?? true,
      note: "Do not rewrite business facts unless explicitly marked optional.",
    },
    {
      code: "PRESERVE_NAV_STRUCTURE",
      enabled: constraints?.preserveNavigationShape ?? true,
      note: "Keep navigation shape and major route intent aligned to canonical structure.",
    },
    {
      code: "REQUIRE_GLOBAL_REGIONS",
      enabled: constraints?.requireGlobalRegions ?? true,
      note: "Header/footer/global utility regions must remain represented.",
    },
    {
      code: "NO_LOREM_IPSUM",
      enabled: constraints?.disallowLoremIpsum ?? true,
      note: "Never return placeholder lorem text.",
    },
    {
      code: "ACCESSIBILITY_BASELINE",
      enabled: Boolean(constraints?.accessibilityBaseline),
      note: constraints?.accessibilityBaseline
        ? `Conform to ${constraints.accessibilityBaseline}.`
        : "Accessibility baseline not specified.",
    },
    {
      code: "MOBILE_FIRST",
      enabled: constraints?.mobileFirst ?? true,
      note: "Prioritize mobile-first layout and content readability.",
    },
    {
      code: "TOKEN_OVERRIDE_LIMIT",
      enabled: typeof constraints?.maxTokenOverrides === "number",
      note:
        typeof constraints?.maxTokenOverrides === "number"
          ? `Do not exceed ${constraints.maxTokenOverrides} token overrides.`
          : "Token override count limit not specified.",
    },
  ];
};

export const createExternalDesignRequest = (input: DesignAdapterInput): CreateExternalDesignRequestResult => {
  const pages = projectPagesFromStructure(input);

  const highlights = input.content.records
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((record) => ({
      id: record.id,
      type: record.type,
      ownerId: record.ownerId,
      valuePreview: previewContentValue(record.value),
    }));

  const ctaPairs = input.content.bindings
    .filter((binding) => binding.fieldKey.toLowerCase().includes("cta"))
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((binding) => {
      const contentRecord = input.content.records.find((record) => record.id === binding.contentId);
      const preview = contentRecord ? previewContentValue(contentRecord.value) : "";
      return {
        id: binding.id,
        label: preview,
        href: contentRecord?.type === "cta_url" && typeof contentRecord.value === "string" ? contentRecord.value : null,
      };
    });

  const instructions = [
    input.context?.customPrompt,
    input.context?.industry ? `Industry: ${input.context.industry}.` : undefined,
    input.context?.audience ? `Audience: ${input.context.audience}.` : undefined,
    input.context?.offerSummary ? `Offer summary: ${input.context.offerSummary}.` : undefined,
    input.context?.brandToneKeywords?.length
      ? `Brand tone keywords: ${input.context.brandToneKeywords.join(", ")}.`
      : undefined,
  ]
    .filter((line): line is string => Boolean(line))
    .join(" ")
    .trim();

  const requestSeed = JSON.stringify({
    siteId: input.structure.siteId,
    pageIds: pages.map((page) => page.id),
    recordIds: highlights.map((record) => record.id),
    colorIds: input.style.colorTokens.map((token) => token.id),
    typographyIds: input.style.typographyTokens.map((token) => token.id),
    intent: input.goals,
    constraints: input.constraints,
  });

  const request: ExternalDesignRequest = {
    contractVersion: "1.0.0",
    requestFingerprint: hash(requestSeed),
    project: {
      siteId: input.structure.siteId,
      locale: input.structure.locale,
      pages,
      sections: input.structure.sections
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((section) => ({
          id: section.id,
          pageId: section.pageId,
          role: section.role,
          sharedPatternId: section.sharedPatternId,
        })),
    },
    content: {
      totalRecords: input.content.records.length,
      highlights,
      ctas: ctaPairs,
    },
    style: {
      colors: input.style.colorTokens
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((token) => ({
          id: token.id,
          role: token.semanticRole,
          valueHex8: token.valueHex8,
        })),
      typography: input.style.typographyTokens
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((token) => ({
          id: token.id,
          role: token.role,
          family: token.family,
          sizePx: token.sizePx,
          weight: token.weight,
        })),
      sectionTone: input.style.componentProfile.sectionTone,
    },
    intent: {
      tone: input.goals?.tone ?? "modern",
      density: input.goals?.density ?? "balanced",
      brandStrength: input.goals?.brandStrength ?? "moderate",
      conversionFocus: input.goals?.conversionFocus ?? "medium",
      readabilityPriority: input.goals?.readabilityPriority ?? "medium",
      primaryIntent: input.goals?.primaryIntent ?? DEFAULT_PRIMARY_INTENT,
    },
    constraints: constraintsFromInput(input),
    instructions,
  };

  const diagnostics: Diagnostic[] = [
    {
      code: "REQUEST_CREATED",
      severity: "info",
      message: "External design request created from canonical inputs",
      data: {
        requestFingerprint: request.requestFingerprint,
        pageCount: request.project.pages.length,
        sectionCount: request.project.sections.length,
        contentRecordCount: request.content.totalRecords,
      },
    },
  ];

  if (!instructions) {
    diagnostics.push({
      code: "REQUEST_CONTEXT_MINIMAL",
      severity: "info",
      message: "No business custom instructions were provided",
      inferred: true,
    });
  }

  return { request, diagnostics };
};

export type DesignAdapterInstance<TVendorRequest> = {
  vendor: string;
  toVendorRequest: (input: DesignAdapterInput) => {
    externalRequest: ExternalDesignRequest;
    vendorRequest: TVendorRequest;
    diagnostics: Diagnostic[];
  };
  fromVendorResponse: (
    externalRequest: ExternalDesignRequest,
    response: VendorDesignResponse,
    diagnostics?: Diagnostic[],
  ) => DesignAdapterResult;
};

export const createDesignAdapter = <TVendorRequest>(
  vendorAdapter: VendorAdapterContract<TVendorRequest>,
): DesignAdapterInstance<TVendorRequest> => {
  return {
    vendor: vendorAdapter.vendor,
    toVendorRequest: (input) => {
      const requestCreation = createExternalDesignRequest(input);
      const prompt = buildPromptLayers(requestCreation.request);
      const vendorRequest = vendorAdapter.buildVendorRequest(requestCreation.request, prompt);

      return {
        externalRequest: requestCreation.request,
        vendorRequest,
        diagnostics: [...requestCreation.diagnostics, ...prompt.diagnostics],
      };
    },
    fromVendorResponse: (externalRequest, response, diagnostics = []) => {
      if (vendorAdapter.normalizeVendorResponse) {
        return vendorAdapter.normalizeVendorResponse(response, externalRequest, diagnostics);
      }
      return normalizeVendorResponseDeterministically(response, externalRequest, diagnostics);
    },
  };
};
