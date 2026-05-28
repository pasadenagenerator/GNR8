import { AI_ROUTING_POLICY_PREVIEW_REGISTRY } from "@/gnr8/runtime/providers/ai-routing-policy-registry";
import {
  PROVIDER_CONTRACT_BY_ID,
  type AIModelFamily,
  type ProviderId,
} from "@/gnr8/runtime/providers/provider-contract-registry";

export type AIRoutingEvaluatorPreviewInput = {
  taskType: string;
  inputModality?: "text" | "html" | "image" | "code" | "mixed";
  outputModality?: "text" | "html" | "code" | "json" | "mixed";
  sensitivityLevel?: "low" | "medium" | "high";
  latencyPreference?: "low_latency" | "balanced" | "quality_first";
  costPreference?: "low_cost" | "balanced" | "quality_first";
  contextRequirement?: "small" | "medium" | "large";
  regionPreference?: "eu" | "us" | "any";
  fallbackAllowed?: boolean;
};

export type AIRoutingEvaluatorPreviewResult = {
  selectedProviderId: string;
  selectedModelFamily: string;
  routingStrategy: string;
  fallbackProviderIds: string[];
  reason: string;
  constraintsApplied: string[];
  executionAllowed: false;
  executionBlocked: true;
  diagnostics: string[];
};

function resolveModelFamily(providerId: string): AIModelFamily | "unknown" {
  const provider = PROVIDER_CONTRACT_BY_ID[providerId as ProviderId];
  return provider?.aiRouting?.modelFamilies[0] ?? "unknown";
}

function buildConstraintsApplied(input: AIRoutingEvaluatorPreviewInput): string[] {
  const constraints: string[] = [];
  if (input.inputModality) constraints.push(`input_modality:${input.inputModality}`);
  if (input.outputModality) constraints.push(`output_modality:${input.outputModality}`);
  if (input.sensitivityLevel) constraints.push(`sensitivity_level:${input.sensitivityLevel}`);
  if (input.latencyPreference) constraints.push(`latency_preference:${input.latencyPreference}`);
  if (input.costPreference) constraints.push(`cost_preference:${input.costPreference}`);
  if (input.contextRequirement) constraints.push(`context_requirement:${input.contextRequirement}`);
  if (input.regionPreference) constraints.push(`region_preference:${input.regionPreference}`);
  constraints.push("execution_blocked");
  constraints.push("preview_only");
  return constraints;
}

export function evaluateAIRoutingPreview(input: AIRoutingEvaluatorPreviewInput): AIRoutingEvaluatorPreviewResult {
  const policy = AI_ROUTING_POLICY_PREVIEW_REGISTRY.find((row) => row.taskType === input.taskType);
  const fallbackAllowed = input.fallbackAllowed !== false;
  const selectedProviderId = policy?.preferredProviderId ?? "openai";
  const fallbackProviderIds = fallbackAllowed ? [policy?.secondaryProviderId ?? "anthropic"] : [];
  const routingStrategy = policy?.routingStrategy ?? "default_reasoning_priority";
  const reason = policy?.reasoning ?? "No exact policy match found; default preview routing selected.";

  return {
    selectedProviderId,
    selectedModelFamily: resolveModelFamily(selectedProviderId),
    routingStrategy,
    fallbackProviderIds,
    reason,
    constraintsApplied: buildConstraintsApplied(input),
    executionAllowed: false,
    executionBlocked: true,
    diagnostics: [
      "AI_ROUTING_EVALUATOR_PREVIEW_CREATED",
      policy ? "AI_ROUTING_POLICY_MATCHED" : "AI_ROUTING_POLICY_DEFAULTED",
      "AI_ROUTING_EXECUTION_BLOCKED",
      "AI_ROUTING_PREVIEW_ONLY",
    ],
  };
}
