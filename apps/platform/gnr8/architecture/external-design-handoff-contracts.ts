import type {
  CanonicalContentInventory,
  CanonicalSiteStructure,
  CanonicalStyleCgpModel,
} from "./canonical-import-models";

export const EXTERNAL_DESIGN_HANDOFF_VERSION = "1.0.0" as const;

export type ExternalDesignTargetLevel =
  | "composition_spec"
  | "component_layout_spec"
  | "token_system_spec"
  | "render_hints";

export type ExternalDesignGoal =
  | "improve_readability"
  | "improve_conversion"
  | "modernize_visual_language"
  | "increase_brand_consistency"
  | "maintain_content_fidelity"
  | "maintain_structure_fidelity";

export type ExternalDesignConstraint = {
  code:
    | "CONTENT_TEXT_LOCKED"
    | "NAV_STRUCTURE_LOCKED"
    | "GLOBAL_REGIONS_REQUIRED"
    | "NO_LOREM_ALLOWED"
    | "A11Y_BASELINE_REQUIRED"
    | "MOBILE_FIRST_REQUIRED"
    | "TOKEN_OVERRIDE_LIMITED";
  note: string;
};

export type ExternalEditabilityRequirement = {
  contentMustRemainFieldEditable: boolean;
  styleTokensMustBeEditable: boolean;
  sectionCompositionMustRemainAddressable: boolean;
  preserveCanonicalIdsWhenPossible: boolean;
};

export type ExternalDesignBusinessContext = {
  industry: string | null;
  audience: string | null;
  offerSummary: string | null;
  brandToneKeywords: string[];
  customPrompt: string | null;
};

export type ExternalDeliveryAssumptions = {
  breakpointSet: Array<"mobile" | "tablet" | "desktop">;
  locale: string;
  outputLevel: ExternalDesignTargetLevel[];
};

export type ExternalDesignHandoffRequest = {
  kind: "external_design_handoff_request_v1";
  version: typeof EXTERNAL_DESIGN_HANDOFF_VERSION;
  requestId: string;
  structure: CanonicalSiteStructure;
  content: CanonicalContentInventory;
  style: CanonicalStyleCgpModel;
  businessContext: ExternalDesignBusinessContext;
  goals: ExternalDesignGoal[];
  constraints: ExternalDesignConstraint[];
  editability: ExternalEditabilityRequirement;
  delivery: ExternalDeliveryAssumptions;
};

export type ExternalGlobalDecision = {
  id: string;
  scope: "site" | "global_region";
  targetId: string;
  decision: string;
  rationale: string;
  confidence: number;
};

export type ExternalSectionComposition = {
  sectionId: string;
  compositionType: string;
  componentChoices: Array<{
    slot: string;
    componentType: string;
    variant: string;
  }>;
  layoutHierarchy: Array<{
    nodeId: string;
    parentNodeId: string | null;
    role: string;
    order: number;
  }>;
  unresolvedPlaceholders: string[];
  warnings: string[];
  confidence: number;
};

export type ExternalPageDesignOutput = {
  pageId: string;
  sectionCompositions: ExternalSectionComposition[];
  pageWarnings: string[];
  confidence: number;
};

export type ExternalTokenPatch = {
  mode: "add" | "override";
  tokenType: "color" | "typography" | "spacing" | "surface" | "component";
  tokenId: string;
  value: string;
  rationale: string;
  confidence: number;
};

export type ExternalRenderHint = {
  kind: "react_hint" | "html_hint" | "css_hint" | "asset_hint";
  description: string;
  payload: string;
};

export type ExternalDesignHandoffResponse = {
  kind: "external_design_handoff_response_v1";
  version: typeof EXTERNAL_DESIGN_HANDOFF_VERSION;
  requestId: string;
  vendorRunId: string;
  outputLevels: ExternalDesignTargetLevel[];
  globalDecisions: ExternalGlobalDecision[];
  pageOutputs: ExternalPageDesignOutput[];
  tokenPatches: ExternalTokenPatch[];
  unresolvedPlaceholders: Array<{
    id: string;
    scope: "site" | "page" | "section";
    targetId: string;
    reason: string;
  }>;
  mergeWarnings: Array<{
    code: string;
    message: string;
    targetId: string | null;
  }>;
  renderHints: ExternalRenderHint[];
  confidence: {
    overall: number;
    structureAlignment: number;
    contentPreservation: number;
    styleConsistency: number;
  };
};

export type MergeAuthorityModel = {
  structureAuthority: "canonical_import" | "external_design" | "hybrid_with_policy";
  contentAuthority: "canonical_import" | "external_design" | "hybrid_with_policy";
  styleAuthority: "canonical_import" | "external_design" | "overlay";
};

export type MergeConflictType = "structure_conflict" | "content_conflict" | "style_conflict" | "mapping_conflict";

export type MergeConflict = {
  id: string;
  type: MergeConflictType;
  targetId: string | null;
  message: string;
  resolution: "kept_import" | "applied_design" | "manual_review_required";
};

export type MergeWarning = {
  code: string;
  message: string;
  targetId: string | null;
};

export type CanonicalDesignMergeResult = {
  kind: "canonical_design_merge_result_v1";
  requestId: string;
  status: "merged" | "merged_with_warnings" | "manual_review_required";
  authority: MergeAuthorityModel;
  applied: {
    pageCount: number;
    sectionCompositionCount: number;
    tokenPatchCount: number;
  };
  conflicts: MergeConflict[];
  warnings: MergeWarning[];
  unresolvedPlaceholders: ExternalDesignHandoffResponse["unresolvedPlaceholders"];
};

/**
 * Vendor adapter boundary to keep canonical contracts stable while mapping
 * to provider-specific request/response schemas.
 */
export type ExternalDesignVendorAdapter<TVendorRequest, TVendorResponse> = {
  vendorName: string;
  mapRequest: (request: ExternalDesignHandoffRequest) => TVendorRequest;
  mapResponse: (response: TVendorResponse) => ExternalDesignHandoffResponse;
};
