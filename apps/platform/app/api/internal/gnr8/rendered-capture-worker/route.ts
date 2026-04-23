import { NextResponse } from "next/server";

import {
  executeRenderedCaptureWorkerRequest,
  parseRenderedCaptureWorkerRequestDetailed,
} from "@/gnr8/import-rendered-capture-worker/worker-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const TOKEN_HEADER_NAME = "x-gnr8-rendered-capture-worker-token";

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
    const response = await executeRenderedCaptureWorkerRequest({ request: parsed.request });
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
      workerStatus: response.status,
      domProduced: produced.domProduced,
      screenshotProduced: produced.screenshotProduced,
      computedStylesProduced: produced.computedStylesProduced,
      meaningfulRenderSuccess: produced.meaningfulRenderSuccess,
    });

    return NextResponse.json(response, { status: 200 });
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
