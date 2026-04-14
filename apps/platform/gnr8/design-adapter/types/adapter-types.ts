import type {
  CanonicalContentInventory,
  CanonicalSiteStructure,
  CanonicalStyleCgpModel,
} from "../../architecture/canonical-import-models";

export const DESIGN_ADAPTER_CONTRACT_VERSION = "1.0.0" as const;

export type DesignGoals = {
  primaryIntent?: string;
  tone?: "modern" | "editorial" | "corporate" | "playful" | "premium" | "minimal";
  conversionFocus?: "low" | "medium" | "high";
  readabilityPriority?: "low" | "medium" | "high";
  density?: "compact" | "balanced" | "spacious";
  brandStrength?: "light" | "moderate" | "strong";
  preferredKeywords?: string[];
};

export type DesignConstraints = {
  preserveContentText?: boolean;
  preserveNavigationShape?: boolean;
  requireGlobalRegions?: boolean;
  disallowLoremIpsum?: boolean;
  accessibilityBaseline?: "WCAG_AA" | "WCAG_AAA";
  mobileFirst?: boolean;
  maxTokenOverrides?: number;
};

export type BusinessContext = {
  industry?: string;
  audience?: string;
  offerSummary?: string;
  brandToneKeywords?: string[];
  customPrompt?: string;
};

export type DesignAdapterInput = {
  structure: CanonicalSiteStructure;
  content: CanonicalContentInventory;
  style: CanonicalStyleCgpModel;
  goals?: DesignGoals;
  constraints?: DesignConstraints;
  context?: BusinessContext;
};

export type ExternalDesignPageSummary = {
  id: string;
  path: string;
  purpose: string;
  sectionOrder: Array<{
    id: string;
    role: string;
    order: number;
  }>;
};

export type ExternalDesignRequest = {
  contractVersion: typeof DESIGN_ADAPTER_CONTRACT_VERSION;
  requestFingerprint: string;
  project: {
    siteId: string;
    locale: string;
    pages: ExternalDesignPageSummary[];
    sections: Array<{
      id: string;
      pageId: string;
      role: string;
      sharedPatternId: string | null;
    }>;
  };
  content: {
    totalRecords: number;
    highlights: Array<{
      id: string;
      type: string;
      ownerId: string;
      valuePreview: string;
    }>;
    ctas: Array<{
      id: string;
      label: string;
      href: string | null;
    }>;
  };
  style: {
    colors: Array<{
      id: string;
      role: string;
      valueHex8: string;
    }>;
    typography: Array<{
      id: string;
      role: string;
      family: string;
      sizePx: number;
      weight: number;
    }>;
    sectionTone: string;
  };
  intent: {
    tone: string;
    density: string;
    brandStrength: string;
    conversionFocus: string;
    readabilityPriority: string;
    primaryIntent: string;
  };
  constraints: Array<{
    code: string;
    enabled: boolean;
    note: string;
  }>;
  instructions: string;
};

export type StitchRequestAdapter = {
  prompt: string;
  contextBlocks: string[];
  designSystem?: string;
};

export type MagicPathRequestAdapter = {
  structuredInput: Record<string, unknown>;
  prompt: string;
};

export type VendorDesignResponse = {
  raw: unknown;
  metadata: {
    vendor: string;
    vendorRunId?: string;
    receivedAtIso: string;
    transport?: "mock" | "http" | "queue";
  };
};

export type NormalizedTokenPatch = {
  tokenType: "color" | "typography" | "spacing" | "surface" | "component";
  tokenId: string;
  value: string;
  source: "vendor" | "inferred";
  confidence: number;
};

export type GeneratedComponent = {
  id: string;
  sectionId: string;
  type: string;
  variant: string;
  props: Record<string, unknown>;
  confidence: number;
};

export type GeneratedSection = {
  id: string;
  role: string;
  layoutType: string;
  components: GeneratedComponent[];
  structureOverride?: {
    allowed: boolean;
    rationale: string;
  };
  warnings: string[];
  confidence: number;
};

export type GeneratedPage = {
  id: string;
  path: string;
  sections: GeneratedSection[];
  warnings: string[];
  confidence: number;
};

export type NormalizedDesignResult = {
  pages: GeneratedPage[];
  globalDesign: {
    tone: string;
    density: string;
    notes: string[];
  };
  tokens: NormalizedTokenPatch[];
  components: GeneratedComponent[];
  warnings: Array<{
    code: string;
    message: string;
    targetId: string | null;
  }>;
};

export type Diagnostic = {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  inferred?: boolean;
  data?: Record<string, unknown>;
};

export type DesignAdapterResult = {
  normalized: NormalizedDesignResult;
  diagnostics: Diagnostic[];
  confidence: number;
};

export type PromptBuildResult = {
  instructions: string;
  contextBlocks: string[];
  diagnostics: Diagnostic[];
};

export type VendorAdapterContract<TVendorRequest> = {
  vendor: "stitch" | "magicpath" | string;
  buildVendorRequest: (request: ExternalDesignRequest, prompt: PromptBuildResult) => TVendorRequest;
  normalizeVendorResponse: (
    response: VendorDesignResponse,
    request: ExternalDesignRequest,
    diagnostics: Diagnostic[],
  ) => DesignAdapterResult;
};
