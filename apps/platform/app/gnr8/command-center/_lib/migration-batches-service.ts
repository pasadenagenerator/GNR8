import { headers } from "next/headers";

import {
  normalizeMigrationBatchDetailPayload,
  normalizeMigrationBatchListPayload,
  type MigrationBatchDetailPageViewModel,
  type MigrationBatchListPageViewModel,
} from "./migration-batches-view-model";

type FetchDeps = {
  fetchImpl?: typeof fetch;
  headersImpl?: typeof headers;
  baseUrl?: string;
};

function token(value: unknown): string {
  return String(value ?? "").trim();
}

async function resolveRequestContext(deps: FetchDeps): Promise<{
  baseUrl: string;
  requestHeaders: HeadersInit | undefined;
}> {
  if (deps.baseUrl) {
    return {
      baseUrl: deps.baseUrl.replace(/\/$/, ""),
      requestHeaders: undefined,
    };
  }

  const incomingHeaders = await (deps.headersImpl ?? headers)();
  const proto = token(incomingHeaders.get("x-forwarded-proto")) || "http";
  const host = token(incomingHeaders.get("x-forwarded-host")) || token(incomingHeaders.get("host")) || "localhost:3000";
  const cookie = token(incomingHeaders.get("cookie"));

  return {
    baseUrl: `${proto}://${host}`,
    requestHeaders: cookie ? { cookie } : undefined,
  };
}

async function fetchJson(input: {
  endpoint: string;
  fetchImpl: typeof fetch;
  requestHeaders: HeadersInit | undefined;
}): Promise<{ ok: boolean; payload: unknown; error: string | null }> {
  try {
    const response = await input.fetchImpl(input.endpoint, {
      method: "GET",
      cache: "no-store",
      headers: input.requestHeaders,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = payload && typeof payload === "object" && "error" in payload
        ? token((payload as { error?: unknown }).error)
        : `Request failed with status ${response.status}`;
      return { ok: false, payload, error };
    }
    return { ok: true, payload, error: null };
  } catch (error) {
    return {
      ok: false,
      payload: {},
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

export async function getMigrationBatchListViewModel(
  deps: FetchDeps = {},
): Promise<MigrationBatchListPageViewModel> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const context = await resolveRequestContext(deps);
  const response = await fetchJson({
    endpoint: `${context.baseUrl}/api/gnr8/admin/migration-batches`,
    fetchImpl,
    requestHeaders: context.requestHeaders,
  });
  if (!response.ok) {
    return { batches: [], fetchError: response.error ?? "Failed to load migration batches" };
  }
  return normalizeMigrationBatchListPayload(response.payload);
}

export async function getMigrationBatchDetailViewModel(
  batchId: string,
  deps: FetchDeps = {},
): Promise<MigrationBatchDetailPageViewModel> {
  const normalizedBatchId = token(batchId);
  if (!normalizedBatchId) return { batch: null, fetchError: "batchId is required" };

  const fetchImpl = deps.fetchImpl ?? fetch;
  const context = await resolveRequestContext(deps);
  const encodedBatchId = encodeURIComponent(normalizedBatchId);
  const [batchResponse, observabilityResponse, timelineResponse] = await Promise.all([
    fetchJson({
      endpoint: `${context.baseUrl}/api/gnr8/admin/migration-batches/${encodedBatchId}`,
      fetchImpl,
      requestHeaders: context.requestHeaders,
    }),
    fetchJson({
      endpoint: `${context.baseUrl}/api/gnr8/admin/migration-batches/${encodedBatchId}/observability`,
      fetchImpl,
      requestHeaders: context.requestHeaders,
    }),
    fetchJson({
      endpoint: `${context.baseUrl}/api/gnr8/admin/migration-batches/${encodedBatchId}/timeline`,
      fetchImpl,
      requestHeaders: context.requestHeaders,
    }),
  ]);

  if (!batchResponse.ok) {
    return { batch: null, fetchError: batchResponse.error ?? "Failed to load migration batch" };
  }

  const model = normalizeMigrationBatchDetailPayload({
    batchPayload: batchResponse.payload,
    observabilityPayload: observabilityResponse.ok ? observabilityResponse.payload : undefined,
    timelinePayload: timelineResponse.ok ? timelineResponse.payload : undefined,
  });

  if (model.fetchError) return model;
  if (!observabilityResponse.ok || !timelineResponse.ok) {
    return {
      ...model,
      fetchError: [
        observabilityResponse.ok ? null : observabilityResponse.error ?? "Observability unavailable",
        timelineResponse.ok ? null : timelineResponse.error ?? "Timeline unavailable",
      ].filter(Boolean).join("; "),
    };
  }

  return model;
}
