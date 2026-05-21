export const READINESS_SEED_ROUTE = "/api/gnr8/admin/provider-handoffs/readiness-seed";

const SECRET_LIKE = /(token|secret|password|credential|api[_-]?key|bearer|private[_-]?key)/i;

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

export function redactSecretLikeText(value: unknown): string {
  const text = normalizeText(value);
  if (!text) return "";
  return SECRET_LIKE.test(text) ? "[redacted]" : text;
}

export function sanitizeList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const values = input.map((value) => redactSecretLikeText(value)).filter(Boolean);
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export type ReadinessSeedSuccessModel = {
  ok: true;
  handoffId: string;
  readinessUrl: string;
  reusedExisting: boolean;
  executionBlocked: boolean;
  nextAllowedAction: string;
  diagnostics: string[];
  warning: string;
};

export type ReadinessSeedErrorModel = {
  ok: false;
  status: number;
  message: string;
  setupMessage: string;
};

export type ReadinessSeedResultModel = ReadinessSeedSuccessModel | ReadinessSeedErrorModel;

export function parseReadinessSeedResult(input: { status: number; body: unknown }): ReadinessSeedResultModel {
  const body = (input.body ?? {}) as Record<string, unknown>;

  if (Boolean(body.ok)) {
    return {
      ok: true,
      handoffId: redactSecretLikeText(body.handoffId),
      readinessUrl: redactSecretLikeText(body.readinessUrl),
      reusedExisting: Boolean(body.reusedExisting),
      executionBlocked: Boolean(body.executionBlocked),
      nextAllowedAction: redactSecretLikeText(body.nextAllowedAction),
      diagnostics: sanitizeList(body.diagnostics),
      warning: redactSecretLikeText(body.warning),
    };
  }

  const requiredEnvFlag = normalizeText(body.requiredEnvFlag);
  if (requiredEnvFlag) {
    return {
      ok: false,
      status: input.status,
      message: redactSecretLikeText(body.error) || "Readiness seed route is not available.",
      setupMessage: `Set ${requiredEnvFlag} to enable admin-only readiness seeding in production.`,
    };
  }

  if (input.status === 401 || input.status === 403) {
    return {
      ok: false,
      status: input.status,
      message: "Admin authentication required. This page is superadmin-only.",
      setupMessage: "Sign in as superadmin and retry.",
    };
  }

  return {
    ok: false,
    status: input.status,
    message: redactSecretLikeText(body.error) || "Readiness seed request failed closed.",
    setupMessage: "Check DATABASE_URL/schema and route health, then retry.",
  };
}

export async function callReadinessSeedRoute(
  fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<ReadinessSeedResultModel> {
  const response = await fetchImpl(READINESS_SEED_ROUTE, {
    method: "POST",
    headers: { "content-type": "application/json" },
  });

  let body: unknown = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  return parseReadinessSeedResult({ status: response.status, body });
}
