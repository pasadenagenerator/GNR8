import type { DesignIntelligenceAiHook } from "./design-model";

/**
 * Future extension point only.
 * V1 keeps design intelligence deterministic and rule-based.
 */
export type { DesignIntelligenceAiHook };

export type DesignIntelligenceAiHookContext = {
  hook: DesignIntelligenceAiHook;
  enabled: boolean;
};
