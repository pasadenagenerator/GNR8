import type { ProviderId } from "@/gnr8/runtime/providers/provider-contract-registry";

export type AIRoutingStrategy =
  | "reasoning_priority"
  | "context_priority"
  | "latency_priority"
  | "sovereignty_priority"
  | "orchestration_priority";

export type AIRoutingExecutionState = "preview_only";

export type AIRoutingPolicyPreviewRow = {
  taskType: string;
  preferredProviderId: ProviderId;
  secondaryProviderId: ProviderId;
  routingStrategy: AIRoutingStrategy;
  reasoning: string;
  executionState: AIRoutingExecutionState;
};

export const AI_ROUTING_POLICY_PREVIEW_REGISTRY = [
  {
    taskType: "Site Migration Planning",
    preferredProviderId: "openai",
    secondaryProviderId: "anthropic",
    routingStrategy: "reasoning_priority",
    reasoning: "strongest structured reasoning",
    executionState: "preview_only",
  },
  {
    taskType: "Long Architecture Review",
    preferredProviderId: "anthropic",
    secondaryProviderId: "openai",
    routingStrategy: "context_priority",
    reasoning: "strongest long-context safety reasoning",
    executionState: "preview_only",
  },
  {
    taskType: "Layout / Visual Understanding",
    preferredProviderId: "gemini",
    secondaryProviderId: "openai",
    routingStrategy: "context_priority",
    reasoning: "multimodal/layout strengths",
    executionState: "preview_only",
  },
  {
    taskType: "Fast Interactive Generation",
    preferredProviderId: "groq",
    secondaryProviderId: "openai",
    routingStrategy: "latency_priority",
    reasoning: "ultra-low latency",
    executionState: "preview_only",
  },
  {
    taskType: "EU-sensitive Workloads",
    preferredProviderId: "mistral",
    secondaryProviderId: "openai",
    routingStrategy: "sovereignty_priority",
    reasoning: "EU/open-weight flexibility",
    executionState: "preview_only",
  },
  {
    taskType: "Structured Tool Orchestration",
    preferredProviderId: "openai",
    secondaryProviderId: "anthropic",
    routingStrategy: "orchestration_priority",
    reasoning: "strongest structured reasoning",
    executionState: "preview_only",
  },
] as const satisfies readonly AIRoutingPolicyPreviewRow[];
