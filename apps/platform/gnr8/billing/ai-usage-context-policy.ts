import "server-only";

export type AIUsageContextPolicy = "site_required" | "agency_required" | "optional_legacy";

export type AIUsageContextValidationInput = {
  policy: AIUsageContextPolicy;
  siteId?: string | null;
  agencyId?: string | null;
};

export type AIUsageContextValidationResult = {
  policy: AIUsageContextPolicy;
  siteId: string | null;
  agencyId: string | null;
  canLogUsage: boolean;
};

export type AIUsageContextErrorCode =
  | "AI_USAGE_SITE_CONTEXT_REQUIRED"
  | "AI_USAGE_AGENCY_CONTEXT_REQUIRED"
  | "AI_USAGE_CONTEXT_INVALID";

export class AIUsageContextPolicyError extends Error {
  readonly code: AIUsageContextErrorCode;

  constructor(code: AIUsageContextErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = "AIUsageContextPolicyError";
    this.code = code;
  }
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function assertSupportedPolicy(policy: AIUsageContextPolicy): void {
  if (policy === "site_required" || policy === "agency_required" || policy === "optional_legacy") {
    return;
  }
  throw new AIUsageContextPolicyError(
    "AI_USAGE_CONTEXT_INVALID",
    `unsupported AI usage context policy "${String(policy)}"`,
  );
}

export function validateAIUsageContext(input: AIUsageContextValidationInput): AIUsageContextValidationResult {
  assertSupportedPolicy(input.policy);

  const siteId = normalizeOptionalString(input.siteId);
  const agencyId = normalizeOptionalString(input.agencyId);

  if (input.policy === "site_required" && !siteId) {
    throw new AIUsageContextPolicyError(
      "AI_USAGE_SITE_CONTEXT_REQUIRED",
      "siteId is required for site-bound AI usage operations",
    );
  }

  if (input.policy === "agency_required" && !siteId && !agencyId) {
    throw new AIUsageContextPolicyError(
      "AI_USAGE_AGENCY_CONTEXT_REQUIRED",
      "agencyId is required when siteId is absent for agency-scoped AI usage operations",
    );
  }

  return {
    policy: input.policy,
    siteId,
    agencyId,
    canLogUsage: Boolean(siteId || agencyId),
  };
}
