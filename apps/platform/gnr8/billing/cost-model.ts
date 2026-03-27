import "server-only";

export const COST_MODEL = {
  AI: {
    INPUT_PER_1M: 0.2,
    OUTPUT_PER_1M: 0.8,
  },
  RUNTIME: {
    PER_REQUEST: 0.00001,
    PER_MB: 0.0001,
  },
} as const;

const ONE_MILLION = 1_000_000;
const BYTES_PER_MB = 1024 * 1024;

function roundCost(value: number): number {
  return Number(value.toFixed(6));
}

export function calculateAIEstimatedCost(input: {
  promptTokens?: number;
  completionTokens?: number;
}): number {
  const promptTokens = Number.isFinite(input.promptTokens) ? Math.max(0, Math.floor(input.promptTokens ?? 0)) : 0;
  const completionTokens = Number.isFinite(input.completionTokens)
    ? Math.max(0, Math.floor(input.completionTokens ?? 0))
    : 0;

  if (promptTokens === 0 && completionTokens === 0) {
    return 0;
  }

  const inputCost = (promptTokens / ONE_MILLION) * COST_MODEL.AI.INPUT_PER_1M;
  const outputCost = (completionTokens / ONE_MILLION) * COST_MODEL.AI.OUTPUT_PER_1M;
  return roundCost(inputCost + outputCost);
}

export function calculateRuntimeEstimatedCost(input: { requestCount?: number; bandwidthBytes?: number }): number {
  const requestCount = Number.isFinite(input.requestCount) ? Math.max(0, Math.floor(input.requestCount ?? 0)) : 0;
  const bandwidthBytes = Number.isFinite(input.bandwidthBytes)
    ? Math.max(0, Math.floor(input.bandwidthBytes ?? 0))
    : 0;

  const requestCost = requestCount * COST_MODEL.RUNTIME.PER_REQUEST;
  const bandwidthCost = (bandwidthBytes / BYTES_PER_MB) * COST_MODEL.RUNTIME.PER_MB;
  return roundCost(requestCost + bandwidthCost);
}
