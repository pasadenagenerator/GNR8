import type { DesignIntelligenceAiHook } from "./design-model";
import type { AiDesignSuggestionInput, AiDesignSuggestion } from "./ai-suggestion-model";

/**
 * Future extension point only.
 * V1 keeps design intelligence deterministic and rule-based.
 */
export type { DesignIntelligenceAiHook };

export type DesignIntelligenceAiHookContext = {
  hook: DesignIntelligenceAiHook;
  enabled: boolean;
};

export type DesignIntelligenceAiSuggestionService = {
  name: string;
  requestAiDesignSuggestions: (input: AiDesignSuggestionInput) => AiDesignSuggestion | null;
};

export function createDesignIntelligenceAiSuggestionServiceFromHook(
  context?: DesignIntelligenceAiHookContext | null,
): DesignIntelligenceAiSuggestionService | null {
  if (!context || !context.enabled || !context.hook.requestAiDesignSuggestions) return null;
  return {
    name: context.hook.name,
    requestAiDesignSuggestions: context.hook.requestAiDesignSuggestions,
  };
}
