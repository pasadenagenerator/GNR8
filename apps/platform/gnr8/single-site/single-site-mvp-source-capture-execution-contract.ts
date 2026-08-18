export const SINGLE_SITE_MVP_SOURCE_CAPTURE_CONFIRMATION =
  "I approve sending exactly one production import/capture POST for the selected GNR8 single-site MVP rehearsal site.";

export const SINGLE_SITE_MVP_SOURCE_CAPTURE_ROUTE_PATH =
  "/api/gnr8/admin/single-site-mvp/source-capture" as const;

export const SINGLE_SITE_MVP_SOURCE_CAPTURE_ALLOWED_FIELDS = [
  "clientId",
  "agencyId",
  "url",
  "rehearsalPosture",
  "idempotencyKey",
  "correlationId",
  "explicitConfirmation",
] as const;

export type SingleSiteMvpSourceCaptureAllowedField =
  (typeof SINGLE_SITE_MVP_SOURCE_CAPTURE_ALLOWED_FIELDS)[number];

export type SingleSiteMvpSourceCaptureExecutionInput = Record<
  SingleSiteMvpSourceCaptureAllowedField,
  string
>;

export type SingleSiteMvpSourceCaptureRedactedResult = {
  route: typeof SINGLE_SITE_MVP_SOURCE_CAPTURE_ROUTE_PATH;
  httpStatus: number | null;
  ok: boolean | null;
  resultStatus: "redacted_response_received" | "request_failed";
  diagnosticsCount: number;
  redactionsCount: number;
  mutationFlagsStatus: "all_false" | "not_all_false" | "not_returned";
  error: string | null;
};

function clean(value: string): string {
  return value.trim();
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => text(entry)).filter(Boolean);
}

function allMutationFlagsFalse(value: unknown): "all_false" | "not_all_false" | "not_returned" {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "not_returned";
  return Object.values(value as Record<string, unknown>).every((entry) => entry === false)
    ? "all_false"
    : "not_all_false";
}

export function hasExactSingleSiteMvpSourceCaptureConfirmation(input: {
  explicitConfirmation: string;
}): boolean {
  return clean(input.explicitConfirmation) === SINGLE_SITE_MVP_SOURCE_CAPTURE_CONFIRMATION;
}

export function createSingleSiteMvpSourceCaptureRequestBody(
  input: SingleSiteMvpSourceCaptureExecutionInput,
): SingleSiteMvpSourceCaptureExecutionInput {
  return {
    clientId: clean(input.clientId),
    agencyId: clean(input.agencyId),
    url: clean(input.url),
    rehearsalPosture: clean(input.rehearsalPosture),
    idempotencyKey: clean(input.idempotencyKey),
    correlationId: clean(input.correlationId),
    explicitConfirmation: clean(input.explicitConfirmation),
  };
}

export function createSingleSiteMvpSourceCaptureRedactedResult(input: {
  httpStatus: number | null;
  body: unknown;
  fallbackError?: string;
}): SingleSiteMvpSourceCaptureRedactedResult {
  const body = input.body && typeof input.body === "object" && !Array.isArray(input.body)
    ? (input.body as Record<string, unknown>)
    : {};

  return {
    route: SINGLE_SITE_MVP_SOURCE_CAPTURE_ROUTE_PATH,
    httpStatus: input.httpStatus,
    ok: typeof body.ok === "boolean" ? body.ok : null,
    resultStatus: input.httpStatus === null ? "request_failed" : "redacted_response_received",
    diagnosticsCount: stringArray(body.diagnostics).length,
    redactionsCount: stringArray(body.redactions).length,
    mutationFlagsStatus: allMutationFlagsFalse(body.mutationFlags),
    error: text(body.error) || input.fallbackError || null,
  };
}
