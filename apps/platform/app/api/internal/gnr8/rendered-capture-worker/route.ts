import { NextResponse } from "next/server";

import {
  RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
  type RenderedCaptureWorkerRequest,
} from "@/gnr8/import-rendered-capture-worker/worker-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const TOKEN_HEADER_NAME = "x-gnr8-rendered-capture-worker-token";
const DEFAULT_UPSTREAM_PATH = "/internal/gnr8/rendered-capture-worker";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function resolveBearerToken(req: Request): string {
  const authorization = normalizeText(req.headers.get("authorization"));
  if (!authorization) return "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return "";
  return normalizeText(match[1]);
}

function resolveProvidedWorkerToken(req: Request): string {
  const headerToken = normalizeText(req.headers.get(TOKEN_HEADER_NAME));
  if (headerToken) return headerToken;
  return resolveBearerToken(req);
}

function workerAuthorized(req: Request): {
  authorized: boolean;
  tokenPresent: boolean;
  tokenSource: "x_header" | "authorization_bearer" | "none";
} {
  const expected = normalizeText(process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN);
  if (!expected) {
    return {
      authorized: false,
      tokenPresent: false,
      tokenSource: "none",
    };
  }

  const headerToken = normalizeText(req.headers.get(TOKEN_HEADER_NAME));
  const bearerToken = resolveBearerToken(req);
  const provided = headerToken || bearerToken;
  return {
    authorized: provided.length > 0 && provided === expected,
    tokenPresent: provided.length > 0,
    tokenSource: headerToken ? "x_header" : bearerToken ? "authorization_bearer" : "none",
  };
}

function inferProducedEvidence(response: unknown): {
  domProduced: boolean;
  screenshotProduced: boolean;
  computedStylesProduced: boolean;
  meaningfulRenderSuccess: boolean;
} {
  const payload = response as {
    qualitySummary?: {
      domLength?: number;
      screenshotCount?: number;
      computedStyleSampleCount?: number;
    };
  };

  const domLength = Number(payload?.qualitySummary?.domLength ?? 0);
  const screenshotCount = Number(payload?.qualitySummary?.screenshotCount ?? 0);
  const computedStyleSampleCount = Number(payload?.qualitySummary?.computedStyleSampleCount ?? 0);

  return {
    domProduced: Number.isFinite(domLength) && domLength > 0,
    screenshotProduced: Number.isFinite(screenshotCount) && screenshotCount > 0,
    computedStylesProduced: Number.isFinite(computedStyleSampleCount) && computedStyleSampleCount > 0,
    meaningfulRenderSuccess:
      (Number.isFinite(domLength) && domLength > 0) ||
      (Number.isFinite(screenshotCount) && screenshotCount > 0) ||
      (Number.isFinite(computedStyleSampleCount) && computedStyleSampleCount > 0),
  };
}

function logEndpointEvent(code: string, details: Record<string, unknown>): void {
  const payload = {
    code,
    ...details,
  };
  if (code.endsWith("_FAILED")) {
    console.error("[capture-worker-endpoint]", payload);
    return;
  }
  if (code.endsWith("_AUTH_FAILED")) {
    console.warn("[capture-worker-endpoint]", payload);
    return;
  }
  console.info("[capture-worker-endpoint]", payload);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseRenderedCaptureWorkerRequestDetailed(payload: unknown): {
  request: RenderedCaptureWorkerRequest | null;
  error: {
    code: "INVALID_WORKER_REQUEST";
    message: string;
    details: Record<string, unknown>;
  } | null;
} {
  const payloadRecord = isObjectRecord(payload) ? payload : null;
  const wrappedRequest = payloadRecord && isObjectRecord(payloadRecord.request) ? payloadRecord.request : null;
  const root =
    wrappedRequest && payloadRecord !== null && !Object.prototype.hasOwnProperty.call(payloadRecord, "kind")
      ? wrappedRequest
      : payloadRecord ?? null;
  if (!root) {
    return {
      request: null,
      error: {
        code: "INVALID_WORKER_REQUEST",
        message: "Rendered capture worker request contract is invalid.",
        details: {
          expectedKind: "rendered_capture_worker_request_v1",
          expectedContractVersion: RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
          reason: "payload_not_object",
        },
      },
    };
  }

  const requestId = normalizeText(root.requestId);
  const importId = normalizeText(root.importId);
  const sourceUrl = normalizeText(root.sourceUrl);
  const kind = normalizeText(root.kind);
  const contractVersion = normalizeText(root.contractVersion);
  const trace = isObjectRecord(root.trace) ? root.trace : null;
  const capture = isObjectRecord(root.capture) ? root.capture : null;
  const viewport = capture && isObjectRecord(capture.viewport) ? capture.viewport : null;
  const readinessPolicy = capture && isObjectRecord(capture.readinessPolicy) ? capture.readinessPolicy : null;

  const valid =
    kind === "rendered_capture_worker_request_v1" &&
    contractVersion === RENDERED_CAPTURE_WORKER_CONTRACT_VERSION &&
    requestId.length > 0 &&
    importId.length > 0 &&
    sourceUrl.length > 0 &&
    trace &&
    capture &&
    viewport &&
    readinessPolicy &&
    typeof viewport.width === "number" &&
    Number.isFinite(viewport.width) &&
    typeof viewport.height === "number" &&
    Number.isFinite(viewport.height) &&
    typeof capture.timeoutBudgetMs === "number" &&
    Number.isFinite(capture.timeoutBudgetMs);

  if (!valid) {
    return {
      request: null,
      error: {
        code: "INVALID_WORKER_REQUEST",
        message: "Rendered capture worker request contract is invalid.",
        details: {
          expectedKind: "rendered_capture_worker_request_v1",
          expectedContractVersion: RENDERED_CAPTURE_WORKER_CONTRACT_VERSION,
          reason: "missing_or_invalid_required_fields",
        },
      },
    };
  }

  return {
    request: root as unknown as RenderedCaptureWorkerRequest,
    error: null,
  };
}

function resolveUpstreamWorkerUrl(req: Request): {
  url: string | null;
  reason: "missing_base_url" | "self_target" | null;
} {
  const baseUrlRaw = normalizeText(process.env.GNR8_RENDERED_CAPTURE_WORKER_BASE_URL);
  if (!baseUrlRaw) {
    return { url: null, reason: "missing_base_url" };
  }
  const upstreamPath = normalizeText(process.env.GNR8_RENDERED_CAPTURE_WORKER_PATH) || DEFAULT_UPSTREAM_PATH;
  try {
    const upstreamUrl = new URL(upstreamPath, `${baseUrlRaw.replace(/\/+$/, "")}/`);
    const incoming = new URL(req.url);
    if (upstreamUrl.origin === incoming.origin && upstreamUrl.pathname === incoming.pathname) {
      return { url: null, reason: "self_target" };
    }
    return { url: upstreamUrl.toString(), reason: null };
  } catch {
    return { url: null, reason: "missing_base_url" };
  }
}

export async function POST(req: Request) {
  const method = normalizeText(req.method || "POST").toUpperCase();
  const url = new URL(req.url);
  const auth = workerAuthorized(req);

  logEndpointEvent("CAPTURE_WORKER_ENDPOINT_REQUEST_RECEIVED", {
    method,
    path: url.pathname,
    routeHit: true,
    authPresent: auth.tokenPresent,
    authAccepted: auth.authorized,
    authTokenSource: auth.tokenSource,
    authHeaderName: TOKEN_HEADER_NAME,
  });

  if (!auth.authorized) {
    logEndpointEvent("CAPTURE_WORKER_ENDPOINT_AUTH_FAILED", {
      method,
      path: url.pathname,
      routeHit: true,
      authPresent: auth.tokenPresent,
      authAccepted: false,
      authTokenSource: auth.tokenSource,
      statusCode: 401,
    });
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "UNAUTHORIZED_WORKER_REQUEST",
          message: "Rendered capture worker authorization failed.",
        },
      },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = parseRenderedCaptureWorkerRequestDetailed(body);
  if (!parsed.request) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error,
      },
      { status: 400 },
    );
  }

  const siteId = normalizeText(parsed.request.trace?.siteId) || null;
  const clientId = normalizeText(parsed.request.trace?.clientId) || null;
  const agencyId = normalizeText(parsed.request.trace?.agencyId) || null;

  logEndpointEvent("CAPTURE_WORKER_ENDPOINT_RENDER_STARTED", {
    method,
    path: url.pathname,
    routeHit: true,
    authPresent: auth.tokenPresent,
    authAccepted: true,
    requestId: parsed.request.requestId,
    importId: parsed.request.importId,
    siteId,
    clientId,
    agencyId,
    sourceUrl: parsed.request.sourceUrl,
  });

  try {
    const upstream = resolveUpstreamWorkerUrl(req);
    if (!upstream.url) {
      const errorCode =
        upstream.reason === "self_target"
          ? "WORKER_UPSTREAM_SELF_TARGET"
          : "WORKER_UPSTREAM_NOT_CONFIGURED";
      const statusCode = upstream.reason === "self_target" ? 500 : 503;
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: errorCode,
            message: "Rendered capture worker upstream endpoint is not configured for this deployment runtime.",
          },
        },
        { status: statusCode },
      );
    }

    const upstreamToken = normalizeText(process.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN);
    const upstreamResponse = await fetch(upstream.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [TOKEN_HEADER_NAME]: upstreamToken,
      },
      body: JSON.stringify(parsed.request),
    });
    const upstreamBodyText = await upstreamResponse.text();
    const upstreamBody = upstreamBodyText ? JSON.parse(upstreamBodyText) : null;
    const response = upstreamBody;
    const produced = inferProducedEvidence(response);

    logEndpointEvent("CAPTURE_WORKER_ENDPOINT_RENDER_COMPLETED", {
      method,
      path: url.pathname,
      routeHit: true,
      authPresent: auth.tokenPresent,
      authAccepted: true,
      requestId: parsed.request.requestId,
      importId: parsed.request.importId,
      siteId,
      clientId,
      agencyId,
      statusCode: 200,
      workerStatus: (response as { status?: unknown })?.status ?? "unknown",
      domProduced: produced.domProduced,
      screenshotProduced: produced.screenshotProduced,
      computedStylesProduced: produced.computedStylesProduced,
      meaningfulRenderSuccess: produced.meaningfulRenderSuccess,
    });

    return NextResponse.json(response, { status: upstreamResponse.status });
  } catch (error) {
    logEndpointEvent("CAPTURE_WORKER_ENDPOINT_RENDER_FAILED", {
      method,
      path: url.pathname,
      routeHit: true,
      authPresent: auth.tokenPresent,
      authAccepted: true,
      requestId: parsed.request.requestId,
      importId: parsed.request.importId,
      siteId,
      clientId,
      agencyId,
      statusCode: 500,
      error: normalizeText((error as Error | null)?.message) || "unknown_error",
    });
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "WORKER_EXECUTION_FAILED",
          message: "Rendered capture worker execution failed.",
        },
      },
      { status: 500 },
    );
  }
}
