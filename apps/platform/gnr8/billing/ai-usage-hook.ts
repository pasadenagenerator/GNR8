import "server-only";

import { logAIUsageEvent } from "@/gnr8/billing/cost-event-logging-service";
import { resolveBillingContextForSite } from "@/gnr8/billing/billing-resolution-service";

export type AIUsageFeatureContext = "migration" | "content_generation" | "optimization" | "chat" | "unknown";

export type AIUsageOperationType = "llm_generate" | "llm_transform" | "llm_analyze" | "llm_chat";

export type AIUsageTokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type WrapAIExecutionContext = {
  siteId?: string | null;
  agencyId?: string | null;
  clientId?: string | null;
  siteVersionId?: string | null;
  artifactId?: string | null;
  featureContext: AIUsageFeatureContext;
  operationType: AIUsageOperationType;
  modelProvider?: string | null;
  modelName?: string | null;
  usage?: unknown;
  estimatedCost?: number;
  traceId?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function toFiniteNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

function toFiniteNonNegativeNumber(value: unknown): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function resolveTokenUsage(raw: unknown): AIUsageTokenUsage {
  const usage = asRecord(raw);
  if (!usage) {
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  const promptTokens =
    toFiniteNonNegativeInteger(usage.promptTokens) ?? toFiniteNonNegativeInteger(usage.prompt_tokens) ?? 0;
  const completionTokens =
    toFiniteNonNegativeInteger(usage.completionTokens) ?? toFiniteNonNegativeInteger(usage.completion_tokens) ?? 0;
  const explicitTotal =
    toFiniteNonNegativeInteger(usage.totalTokens) ?? toFiniteNonNegativeInteger(usage.total_tokens) ?? null;

  return {
    promptTokens,
    completionTokens,
    totalTokens: explicitTotal ?? promptTokens + completionTokens,
  };
}

function resolveModelInfo(input: {
  explicitProvider: string | null;
  explicitName: string | null;
  result: unknown;
}): { provider: string | null; name: string | null } {
  if (input.explicitProvider || input.explicitName) {
    return {
      provider: input.explicitProvider,
      name: input.explicitName,
    };
  }

  const resultRecord = asRecord(input.result);
  if (!resultRecord) return { provider: null, name: null };

  const provider =
    (typeof resultRecord.modelProvider === "string" && resultRecord.modelProvider.trim()) ||
    (typeof resultRecord.model_provider === "string" && resultRecord.model_provider.trim()) ||
    null;

  const name =
    (typeof resultRecord.modelName === "string" && resultRecord.modelName.trim()) ||
    (typeof resultRecord.model_name === "string" && resultRecord.model_name.trim()) ||
    (typeof resultRecord.model === "string" && resultRecord.model.trim()) ||
    null;

  return { provider, name };
}

function resolveUsageInfo(input: { explicitUsage: unknown; result: unknown }): AIUsageTokenUsage {
  const explicit = resolveTokenUsage(input.explicitUsage);
  if (explicit.promptTokens > 0 || explicit.completionTokens > 0 || explicit.totalTokens > 0) {
    return explicit;
  }

  const resultRecord = asRecord(input.result);
  if (!resultRecord) return explicit;

  const fromResultUsage = resolveTokenUsage(resultRecord.usage);
  if (fromResultUsage.promptTokens > 0 || fromResultUsage.completionTokens > 0 || fromResultUsage.totalTokens > 0) {
    return fromResultUsage;
  }

  return explicit;
}

function warningMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function wrapAIExecution<T>(context: WrapAIExecutionContext, fn: () => Promise<T> | T): Promise<T> {
  const siteId = normalizeOptionalString(context.siteId);
  const agencyId = normalizeOptionalString(context.agencyId);
  const clientIdInput = normalizeOptionalString(context.clientId);

  let resolvedAgencyId = agencyId;
  let resolvedClientId = clientIdInput;

  if (siteId) {
    const billingContext = await resolveBillingContextForSite(siteId);
    if (!billingContext) {
      throw new Error("AI usage ownership validation failed: siteId does not resolve billing context");
    }
    if (agencyId && agencyId !== billingContext.agencyId) {
      throw new Error("AI usage ownership validation failed: provided agencyId does not match site ownership");
    }
    resolvedAgencyId = billingContext.agencyId;
    resolvedClientId = billingContext.clientId;
  }

  const startedAt = Date.now();
  const result = await fn();
  const durationMs = Math.max(0, Date.now() - startedAt);

  if (!siteId && !resolvedAgencyId) {
    console.warn("[ai-usage-hook] Skipping AI usage logging because neither siteId nor agencyId was provided", {
      featureContext: context.featureContext,
      operationType: context.operationType,
      durationMs,
    });
    return result;
  }

  const usage = resolveUsageInfo({ explicitUsage: context.usage, result });
  const model = resolveModelInfo({
    explicitProvider: normalizeOptionalString(context.modelProvider),
    explicitName: normalizeOptionalString(context.modelName),
    result,
  });

  try {
    await logAIUsageEvent({
      operationType: context.operationType,
      featureContext: context.featureContext,
      agencyId: resolvedAgencyId,
      clientId: resolvedClientId,
      siteId,
      siteVersionId: normalizeOptionalString(context.siteVersionId),
      artifactId: normalizeOptionalString(context.artifactId),
      modelProvider: model.provider,
      modelName: model.name,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      estimatedCost: toFiniteNonNegativeNumber(context.estimatedCost) ?? 0,
      traceId: normalizeOptionalString(context.traceId),
    });
  } catch (error) {
    console.warn("[ai-usage-hook] Failed to log AI usage event", {
      featureContext: context.featureContext,
      operationType: context.operationType,
      siteId,
      agencyId: resolvedAgencyId,
      durationMs,
      error: warningMessage(error),
    });
  }

  return result;
}
