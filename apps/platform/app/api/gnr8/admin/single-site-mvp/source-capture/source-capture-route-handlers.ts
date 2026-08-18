import { POST as postCanonicalScopedSiteImport } from "@/app/api/gnr8/agency/clients/[clientId]/sites/import/route";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

export const SINGLE_SITE_MVP_SOURCE_CAPTURE_CONFIRMATION =
  "I approve sending exactly one production import/capture POST for the selected GNR8 single-site MVP rehearsal site.";

export const SINGLE_SITE_MVP_SOURCE_CAPTURE_ROUTE_VERSION =
  "mvp-cutline-26-authenticated-admin-view-import-execution-surface:v1" as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_REHEARSAL_POSTURES = new Set(["internal test"]);

const BODY_KEYS = new Set([
  "clientId",
  "agencyId",
  "url",
  "rehearsalPosture",
  "explicitConfirmation",
  "idempotencyKey",
  "correlationId",
]);

const FORBIDDEN_ACTOR_KEYS = new Set([
  "actor",
  "actorId",
  "actorRole",
  "actorType",
  "role",
  "userId",
  "principal",
  "superadminUserId",
]);

type SourceCaptureBody = Record<string, unknown>;

type CanonicalScopedSiteImportDelegate = (
  request: Request,
  ctx: { params: Promise<{ clientId: string }> },
) => Promise<Response>;

type SourceCaptureRouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  delegateToCanonicalScopedSiteImport: CanonicalScopedSiteImportDelegate;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function statusForAuthError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Unauthorized") return 401;
  if (message.startsWith("Forbidden")) return 403;
  return 500;
}

function parseHttpUrl(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

async function parseRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function bodyRecord(body: unknown): SourceCaptureBody | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as SourceCaptureBody;
}

function validateUnknownKeys(record: SourceCaptureBody): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(record).sort()) {
    if (FORBIDDEN_ACTOR_KEYS.has(key)) errors.push(`SOURCE_CAPTURE_ACTOR_OVERRIDE_FORBIDDEN:${key}`);
    if (!BODY_KEYS.has(key)) errors.push(`SOURCE_CAPTURE_UNKNOWN_FIELD:${key}`);
  }
  return Array.from(new Set(errors)).sort();
}

function validateBody(record: SourceCaptureBody): { errors: string[]; request: ValidSourceCaptureRequest | null } {
  const errors = validateUnknownKeys(record);
  const clientId = text(record.clientId);
  const agencyId = text(record.agencyId);
  const normalizedUrl = parseHttpUrl(record.url);
  const rehearsalPosture = text(record.rehearsalPosture);
  const explicitConfirmation = text(record.explicitConfirmation);
  const idempotencyKey = text(record.idempotencyKey);
  const correlationId = text(record.correlationId);

  if (!clientId) errors.push("SOURCE_CAPTURE_CLIENT_ID_REQUIRED");
  else if (!isUuid(clientId)) errors.push("SOURCE_CAPTURE_CLIENT_ID_INVALID");

  if (!agencyId) errors.push("SOURCE_CAPTURE_AGENCY_ID_REQUIRED");
  else if (!isUuid(agencyId)) errors.push("SOURCE_CAPTURE_AGENCY_ID_INVALID");

  if (!normalizedUrl) errors.push("SOURCE_CAPTURE_URL_INVALID");
  if (!rehearsalPosture || !ALLOWED_REHEARSAL_POSTURES.has(rehearsalPosture)) {
    errors.push("SOURCE_CAPTURE_REHEARSAL_POSTURE_INVALID");
  }
  if (explicitConfirmation !== SINGLE_SITE_MVP_SOURCE_CAPTURE_CONFIRMATION) {
    errors.push("SOURCE_CAPTURE_EXPLICIT_CONFIRMATION_REQUIRED");
  }
  if (!idempotencyKey) errors.push("SOURCE_CAPTURE_IDEMPOTENCY_KEY_REQUIRED");
  if (!correlationId) errors.push("SOURCE_CAPTURE_CORRELATION_ID_REQUIRED");

  if (errors.length > 0 || !normalizedUrl) {
    return { errors: Array.from(new Set(errors)).sort(), request: null };
  }

  return {
    errors: [],
    request: {
      clientId,
      agencyId,
      url: normalizedUrl,
      rehearsalPosture,
      explicitConfirmation,
      idempotencyKey,
      correlationId,
    },
  };
}

type ValidSourceCaptureRequest = {
  clientId: string;
  agencyId: string;
  url: string;
  rehearsalPosture: string;
  explicitConfirmation: string;
  idempotencyKey: string;
  correlationId: string;
};

function mutationFlags() {
  return {
    dryRun: false,
    shadowPublish: false,
    publishes: false,
    runtimeMutation: false,
    providerCalls: false,
    billingCalls: false,
    domainDnsCalls: false,
    createsAafRecords: false,
    createsGateAttempt: false,
    evaluatesGate: false,
    launchReadiness: false,
  };
}

function redactions(): string[] {
  return [
    "serverActor",
    "requestActorOverrides",
    "rawHtml",
    "previewHtml",
    "contentSlotMaterialization",
    "rawSqlErrors",
    "stackTraces",
    "providerSecrets",
    "billingData",
    "paymentData",
  ];
}

function failure(status: number, error: string, diagnostics: string[]): Response {
  return Response.json(
    {
      ok: false,
      routeVersion: SINGLE_SITE_MVP_SOURCE_CAPTURE_ROUTE_VERSION,
      error,
      diagnostics,
      redactions: redactions(),
      mutationFlags: mutationFlags(),
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => text(entry)).filter(Boolean);
}

async function jsonOrNull(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const body = await response.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

function redactedCanonicalImportResult(input: {
  status: number;
  body: Record<string, unknown> | null;
  request: ValidSourceCaptureRequest;
}): Record<string, unknown> {
  const body = input.body ?? {};
  const pipeline = body.pipeline && typeof body.pipeline === "object" && !Array.isArray(body.pipeline)
    ? (body.pipeline as Record<string, unknown>)
    : null;

  return {
    ok: body.ok === true,
    routeVersion: SINGLE_SITE_MVP_SOURCE_CAPTURE_ROUTE_VERSION,
    importPathClassification: body.importPathClassification ?? "canonical_scoped",
    canonicalImportPath: body.canonicalImportPath ?? "/api/gnr8/agency/clients/[clientId]/sites/import",
    canonicalResponseStatus: input.status,
    operatorTrace: {
      idempotencyKey: input.request.idempotencyKey,
      correlationId: input.request.correlationId,
      rehearsalPosture: input.request.rehearsalPosture,
    },
    siteId: body.siteId ?? null,
    runtimeSiteId: body.runtimeSiteId ?? null,
    siteVersionId: body.siteVersionId ?? null,
    siteVersionNo: body.siteVersionNo ?? null,
    actor_mode: body.actor_mode ?? "admin_view",
    fallbackUsed: body.fallbackUsed ?? null,
    previewMode: body.previewMode ?? null,
    htmlLength: body.htmlLength ?? null,
    appliedTransformationsCount: body.appliedTransformationsCount ?? null,
    diagnostics: stringArray(body.diagnostics),
    reasonCode: body.reasonCode ?? null,
    error: body.error ?? null,
    siteName: body.siteName ?? null,
    siteNameSource: body.siteNameSource ?? null,
    importManifest: body.importManifest ?? null,
    warning: body.warning ?? null,
    previewArtifacts: body.previewArtifacts ?? null,
    pipeline: pipeline
      ? {
          pipelineMode: pipeline.pipelineMode ?? null,
          executionStatus: pipeline.executionStatus ?? null,
          consolidationApplied: pipeline.consolidationApplied ?? null,
          renderedCaptureUsed: pipeline.renderedCaptureUsed ?? null,
          artifactGenerated: pipeline.artifactGenerated ?? null,
          sourceMode: pipeline.sourceMode ?? null,
          fidelityStatus: pipeline.fidelityStatus ?? null,
          fidelityDegraded: pipeline.fidelityDegraded ?? null,
          renderedCaptureStatus: pipeline.renderedCaptureStatus ?? null,
          renderedDomQuality: pipeline.renderedDomQuality ?? null,
          screenshotCount: pipeline.screenshotCount ?? null,
          computedStyleSampleCount: pipeline.computedStyleSampleCount ?? null,
          importDiagnosticCodes: pipeline.importDiagnosticCodes ?? null,
        }
      : null,
    redactions: redactions(),
    mutationFlags: mutationFlags(),
  };
}

function canonicalRequest(request: ValidSourceCaptureRequest, originalRequest: Request): Request {
  return new Request(
    new URL(`/api/gnr8/agency/clients/${encodeURIComponent(request.clientId)}/sites/import`, originalRequest.url),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: request.url,
        agencyId: request.agencyId,
        adminView: true,
      }),
    },
  );
}

export function createSingleSiteMvpSourceCaptureRouteHandlers(
  deps: Partial<SourceCaptureRouteDeps> = {},
) {
  const resolvedDeps: SourceCaptureRouteDeps = {
    requireSuperadminUserId,
    delegateToCanonicalScopedSiteImport: postCanonicalScopedSiteImport,
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", [
          "single_site_mvp_source_capture_superadmin_required",
        ]);
      }

      const body = bodyRecord(await parseRequestBody(request));
      if (!body) {
        return failure(400, "INVALID_SINGLE_SITE_MVP_SOURCE_CAPTURE_REQUEST", [
          "SOURCE_CAPTURE_REQUEST_BODY_MUST_BE_OBJECT",
        ]);
      }

      const validation = validateBody(body);
      if (!validation.request) {
        return failure(400, "INVALID_SINGLE_SITE_MVP_SOURCE_CAPTURE_REQUEST", validation.errors);
      }

      try {
        const canonicalResponse = await resolvedDeps.delegateToCanonicalScopedSiteImport(
          canonicalRequest(validation.request, request),
          { params: Promise.resolve({ clientId: validation.request.clientId }) },
        );
        const canonicalBody = await jsonOrNull(canonicalResponse);
        return Response.json(
          redactedCanonicalImportResult({
            status: canonicalResponse.status,
            body: canonicalBody,
            request: validation.request,
          }),
          { status: canonicalResponse.status, headers: { "cache-control": "no-store" } },
        );
      } catch {
        return failure(500, "SINGLE_SITE_MVP_SOURCE_CAPTURE_FAILED", [
          "single_site_mvp_source_capture_failed",
        ]);
      }
    },
  };
}
