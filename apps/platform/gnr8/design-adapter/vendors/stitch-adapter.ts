import { normalizeVendorResponseDeterministically } from "../core/response-normalizer";
import type {
  PromptBuildResult,
  StitchRequestAdapter,
  VendorAdapterContract,
} from "../types/adapter-types";

const stitchPrompt = (prompt: PromptBuildResult): string => {
  return [
    "Generate a production-grade UI composition plan.",
    prompt.instructions,
    ...prompt.contextBlocks,
  ].join("\n\n");
};

export const stitchVendorAdapter: VendorAdapterContract<StitchRequestAdapter> = {
  vendor: "stitch",
  buildVendorRequest: (request, prompt) => {
    return {
      prompt: stitchPrompt(prompt),
      contextBlocks: prompt.contextBlocks,
      designSystem: request.intent.brandStrength === "strong" ? "strict-brand" : "adaptive-brand",
    };
  },
  normalizeVendorResponse: (response, request, diagnostics) => {
    return normalizeVendorResponseDeterministically(response, request, [
      ...diagnostics,
      {
        code: "STITCH_NORMALIZATION_PATH",
        severity: "info",
        message: "Stitch response normalization executed via deterministic core normalizer",
      },
    ]);
  },
};
