import { headers } from "next/headers";
import type { PoolClient } from "pg";

import { buildMigrationBatchObservability } from "@/gnr8/migration-factory/migration-batch-observability";
import type { MigrationBatchStore } from "@/gnr8/migration-factory/migration-batch-store";
import {
  serializeMigrationBatch,
} from "@/gnr8/migration-factory/migration-batch-response-serializer";
import type { MigrationJobStore } from "@/gnr8/migration-factory/migration-job-store";

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
  requireSuperadminUserIdForPage?: () => Promise<string>;
  withSuperadminClient?: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>;
  createStoresForClient?: (client: PoolClient) => {
    batchStore: MigrationBatchStore;
    jobStore: MigrationJobStore;
  };
};

function token(value: unknown): string {
  return String(value ?? "").trim();
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to load migration batch";
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

function shouldUseApiFetch(deps: FetchDeps): boolean {
  return Boolean(deps.fetchImpl || deps.headersImpl || deps.baseUrl);
}

export async function composeMigrationBatchDetailPayload(input: {
  batchId: string;
  batchStore: MigrationBatchStore;
  jobStore: MigrationJobStore;
  now?: () => string;
}): Promise<{
  batchPayload: unknown;
  observabilityPayload: unknown;
  timelinePayload: unknown;
} | null> {
  const batchId = token(input.batchId);
  if (!batchId) throw new Error("batchId is required");

  const batch = await input.batchStore.getBatch(batchId);
  if (!batch) return null;

  const [jobSummaries, batchEvents] = await Promise.all([
    input.batchStore.listBatchJobs(batchId),
    input.batchStore.listBatchEvents(batchId),
  ]);
  const jobs = await Promise.all(jobSummaries.map((job) => input.jobStore.getJob(job.jobId)));
  const observability = await buildMigrationBatchObservability({
    batchStore: input.batchStore,
    jobStore: input.jobStore,
    batchId,
    batch,
    jobSummaries,
    batchEvents,
    jobs,
    now: input.now,
  });
  if (!observability) return null;

  const summary = {
    batchId,
    totalJobs: observability.summary.totalJobs,
    pendingJobs: observability.summary.pendingJobs,
    runningJobs: observability.summary.runningJobs,
    completedJobs: observability.summary.completedJobs,
    failedJobs: observability.summary.failedJobs,
    pausedJobs: observability.summary.pausedJobs,
    progressPercent: observability.summary.progressPercent,
    latestEventAt: observability.summary.latestEventAt,
  };

  return {
    batchPayload: {
      batch: serializeMigrationBatch(batch, {
        durable: true,
        storeKind: "postgres",
        summary,
        jobs: jobSummaries,
      }),
    },
    observabilityPayload: {
      observability,
      store: {
        batch: { durable: true, storeKind: "postgres" },
        jobs: { durable: true, storeKind: "postgres" },
      },
    },
    timelinePayload: {
      batchId,
      timeline: observability.timeline,
      latestEventAt: observability.summary.latestEventAt,
      store: {
        batch: { durable: true, storeKind: "postgres" },
        jobs: { durable: true, storeKind: "postgres" },
      },
    },
  };
}

async function getMigrationBatchDetailPayloadFromDatabase(batchId: string, deps: FetchDeps) {
  const requirePageAccess = deps.requireSuperadminUserIdForPage ?? await (async () => {
    const mod = await import("@/src/superadmin/require-superadmin-user-id");
    return mod.requireSuperadminUserIdForPage;
  })();
  const runWithClient = deps.withSuperadminClient ?? await (async () => {
    const mod = await import("@/src/superadmin/db");
    return mod.withSuperadminClient;
  })();

  await requirePageAccess();

  return runWithClient(async (client) => {
    const stores = deps.createStoresForClient
      ? deps.createStoresForClient(client)
      : await (async () => {
        const [{ PostgresMigrationBatchStore }, { PostgresMigrationJobStore }] = await Promise.all([
          import("@/gnr8/migration-factory/postgres-migration-batch-store"),
          import("@/gnr8/migration-factory/postgres-migration-job-store"),
        ]);
        return {
          batchStore: new PostgresMigrationBatchStore({ client }),
          jobStore: new PostgresMigrationJobStore({ client }),
        };
      })();

    return composeMigrationBatchDetailPayload({
      batchId,
      batchStore: stores.batchStore,
      jobStore: stores.jobStore,
    });
  });
}

async function getMigrationBatchDetailPayloadFromApi(
  normalizedBatchId: string,
  deps: FetchDeps,
): Promise<{ payload: Parameters<typeof normalizeMigrationBatchDetailPayload>[0] | null; error: string | null }> {
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
    return { payload: null, error: batchResponse.error ?? "Failed to load migration batch" };
  }

  return {
    payload: {
      batchPayload: batchResponse.payload,
      observabilityPayload: observabilityResponse.ok ? observabilityResponse.payload : undefined,
      timelinePayload: timelineResponse.ok ? timelineResponse.payload : undefined,
    },
    error: [
      observabilityResponse.ok ? null : observabilityResponse.error ?? "Observability unavailable",
      timelineResponse.ok ? null : timelineResponse.error ?? "Timeline unavailable",
    ].filter(Boolean).join("; ") || null,
  };
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

  const detailPayload = shouldUseApiFetch(deps)
    ? await getMigrationBatchDetailPayloadFromApi(normalizedBatchId, deps)
    : await getMigrationBatchDetailPayloadFromDatabase(normalizedBatchId, deps)
      .then((payload) => ({ payload, error: null }))
      .catch((error: unknown) => ({ payload: null, error: errorMessage(error) }));

  if (!detailPayload.payload) {
    return { batch: null, fetchError: detailPayload.error ?? "Failed to load migration batch" };
  }

  const model = normalizeMigrationBatchDetailPayload(detailPayload.payload);

  if (model.fetchError) return model;
  if (detailPayload.error) {
    return {
      ...model,
      fetchError: detailPayload.error,
    };
  }

  return model;
}
