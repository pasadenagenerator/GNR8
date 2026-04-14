import { normalizeVendorResponseDeterministically } from "../core/response-normalizer";
import type {
  MagicPathRequestAdapter,
  VendorAdapterContract,
} from "../types/adapter-types";

export const magicPathVendorAdapter: VendorAdapterContract<MagicPathRequestAdapter> = {
  vendor: "magicpath",
  buildVendorRequest: (request, prompt) => {
    return {
      structuredInput: {
        project: request.project,
        content: request.content,
        style: request.style,
        intent: request.intent,
        constraints: request.constraints,
      },
      prompt: [
        "Generate a structured design response aligned to provided canonical IDs.",
        prompt.instructions,
      ].join(" "),
    };
  },
  normalizeVendorResponse: (response, request, diagnostics) => {
    return normalizeVendorResponseDeterministically(response, request, [
      ...diagnostics,
      {
        code: "MAGICPATH_NORMALIZATION_PATH",
        severity: "info",
        message: "MagicPath response normalization executed via deterministic core normalizer",
      },
    ]);
  },
};
