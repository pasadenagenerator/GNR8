import {
  createMigrationBatchStoreRuntime,
  MigrationBatchStoreRuntimeConfigurationError,
  type MigrationBatchStoreRuntime,
} from "@/gnr8/migration-factory/migration-batch-store-runtime";
import {
  serializeMigrationBatch,
  serializeMigrationBatchJob,
  serializeMigrationBatchListItem,
} from "@/gnr8/migration-factory/migration-batch-response-serializer";
import {
  MIGRATION_BATCH_STATUSES,
  type MigrationBatchJsonObject,
  type MigrationBatchStatus,
} from "@/gnr8/migration-factory/migration-batch-types";

type CreateMigrationBatchBody = {
  batchId?: string;
  organizationId?: string | null;
  agencyId?: string | null;
  clientId?: string | null;
  name?: string;
  description?: string | null;
  status?: string;
  createdBy?: string | null;
  metadata?: unknown;
  diagnostics?: unknown;
};

type AddMigrationBatchJobBody = {
  agencyId?: string | null;
  jobId?: string;
  siteId?: string | null;
  siteVersionId?: string | null;
  sourceUrl?: string | null;
  position?: unknown;
  metadata?: unknown;
};

type RequireSuperadminUserId = () => Promise<string>;
type RequireAgencyActionContext = (input: {
  action: "run_migration";
  requestedAgencyId?: unknown;
}) => Promise<unknown>;

type MigrationBatchesRouteDeps = {
  requireSuperadminUserId: RequireSuperadminUserId;
  requireAgencyActionContext: RequireAgencyActionContext;
  createMigrationBatchStoreRuntime: typeof createMigrationBatchStoreRuntime;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function token(value: unknown): string {
  return String(value ?? "").trim();
}

function optionalUuid(value: unknown, field: string): string | null {
  const normalized = token(value);
  if (!normalized) return null;
  if (!UUID_RE.test(normalized)) throw new Error(`400|${field} must be a valid UUID`);
  return normalized;
}

function optionalJsonObject(value: unknown, field: string): MigrationBatchJsonObject {
  if (value === null || value === undefined) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`400|${field} must be a JSON object`);
  }
  return value as MigrationBatchJsonObject;
}

function optionalPosition(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new Error("400|position must be a non-negative integer");
  }
  return normalized;
}

function optionalBatchStatus(value: unknown): MigrationBatchStatus | undefined {
  const normalized = token(value);
  if (!normalized) return undefined;
  if (!MIGRATION_BATCH_STATUSES.includes(normalized as MigrationBatchStatus)) {
    throw new Error("400|status is not a valid migration batch status");
  }
  return normalized as MigrationBatchStatus;
}

async function parseJsonBody<T>(request: Request): Promise<T | null> {
  return (await request.json().catch(() => null)) as T | null;
}

function mapAdminError(error: unknown): { status: number; message: string } {
  if (error instanceof MigrationBatchStoreRuntimeConfigurationError) {
    return { status: 503, message: error.message };
  }

  if (error instanceof Error) {
    const [statusRaw, ...messageParts] = error.message.split("|");
    const status = Number(statusRaw);
    if (Number.isFinite(status) && status >= 400 && status < 600) {
      return {
        status,
        message: messageParts.join("|").trim() || "Operation failed",
      };
    }

    if (error.message === "Unauthorized") {
      return { status: 401, message: error.message };
    }

    if (error.message.startsWith("Forbidden")) {
      return { status: 403, message: error.message };
    }

    if (error.message.startsWith("Migration batch not found") || error.message.startsWith("Migration job not found")) {
      return { status: 404, message: error.message };
    }
  }

  return {
    status: 500,
    message: error instanceof Error ? error.message : "Internal server error",
  };
}

async function defaultRequireSuperadminUserId(): Promise<string> {
  const mod = await import("@/src/superadmin/require-superadmin-user-id");
  return mod.requireSuperadminUserId();
}

async function defaultRequireAgencyActionContext(input: Parameters<RequireAgencyActionContext>[0]): Promise<unknown> {
  const mod = await import("@/app/api/gnr8/agency/_lib/agency-action-access");
  return mod.requireAgencyActionContext(input);
}

function runtimeOptions(runtime: MigrationBatchStoreRuntime) {
  return {
    durable: runtime.durable,
    storeKind: runtime.storeKind,
  };
}

async function requireDurableBatchRuntime(
  createRuntime: typeof createMigrationBatchStoreRuntime,
): Promise<MigrationBatchStoreRuntime> {
  const runtime = await createRuntime({ mode: "durable" });
  if (!runtime.durable) {
    throw new Error("503|Durable migration batch admin route requires durable storage");
  }
  return runtime;
}

export function createMigrationBatchesRouteHandlers(deps: Partial<MigrationBatchesRouteDeps> = {}) {
  const resolvedDeps: MigrationBatchesRouteDeps = {
    requireSuperadminUserId: defaultRequireSuperadminUserId,
    requireAgencyActionContext: defaultRequireAgencyActionContext,
    createMigrationBatchStoreRuntime,
    ...deps,
  };

  async function requireAdminMigrationAccess(input?: { agencyId?: unknown }): Promise<void> {
    await resolvedDeps.requireSuperadminUserId();
    const agencyId = token(input?.agencyId);
    if (agencyId) {
      await resolvedDeps.requireAgencyActionContext({ action: "run_migration", requestedAgencyId: agencyId });
    }
  }

  return {
    async POST(request: Request): Promise<Response> {
      try {
        const body = await parseJsonBody<CreateMigrationBatchBody>(request);
        if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });

        await requireAdminMigrationAccess({ agencyId: body.agencyId });

        const name = token(body.name);
        if (!name) return Response.json({ error: "name is required" }, { status: 400 });

        const runtime = await requireDurableBatchRuntime(resolvedDeps.createMigrationBatchStoreRuntime);
        const batch = await runtime.store.createBatch({
          batchId: token(body.batchId) || undefined,
          organizationId: optionalUuid(body.organizationId, "organizationId"),
          agencyId: optionalUuid(body.agencyId, "agencyId"),
          clientId: optionalUuid(body.clientId, "clientId"),
          name,
          description: token(body.description) || null,
          status: optionalBatchStatus(body.status),
          createdBy: token(body.createdBy) || null,
          metadata: optionalJsonObject(body.metadata, "metadata"),
          diagnostics: optionalJsonObject(body.diagnostics, "diagnostics"),
        });
        const summary = await runtime.store.getBatchSummary(batch.batchId);

        return Response.json(
          {
            batch: serializeMigrationBatch(batch, {
              ...runtimeOptions(runtime),
              summary: summary ?? {
                batchId: batch.batchId,
                totalJobs: 0,
                pendingJobs: 0,
                runningJobs: 0,
                completedJobs: 0,
                failedJobs: 0,
                pausedJobs: 0,
                progressPercent: 0,
                latestEventAt: null,
              },
            }),
          },
          { status: 201 },
        );
      } catch (error) {
        const mapped = mapAdminError(error);
        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    },

    async LIST(_request: Request): Promise<Response> {
      try {
        await requireAdminMigrationAccess();
        const runtime = await requireDurableBatchRuntime(resolvedDeps.createMigrationBatchStoreRuntime);
        const batches = await runtime.store.listBatches();
        return Response.json({
          batches: batches.map((batch) => serializeMigrationBatchListItem(batch, runtimeOptions(runtime))),
        });
      } catch (error) {
        const mapped = mapAdminError(error);
        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    },

    async GET(_request: Request, context: { params: Promise<{ batchId: string }> }): Promise<Response> {
      try {
        await requireAdminMigrationAccess();
        const { batchId } = await context.params;
        const normalizedBatchId = token(batchId);
        if (!normalizedBatchId) return Response.json({ error: "batchId is required" }, { status: 400 });

        const runtime = await requireDurableBatchRuntime(resolvedDeps.createMigrationBatchStoreRuntime);
        const batch = await runtime.store.getBatch(normalizedBatchId);
        if (!batch) return Response.json({ error: "Migration batch not found" }, { status: 404 });

        const [summary, jobs] = await Promise.all([
          runtime.store.getBatchSummary(normalizedBatchId),
          runtime.store.listBatchJobs(normalizedBatchId),
        ]);

        return Response.json({
          batch: serializeMigrationBatch(batch, {
            ...runtimeOptions(runtime),
            summary: summary ?? {
              batchId: normalizedBatchId,
              totalJobs: 0,
              pendingJobs: 0,
              runningJobs: 0,
              completedJobs: 0,
              failedJobs: 0,
              pausedJobs: 0,
              progressPercent: 0,
              latestEventAt: null,
            },
            jobs,
          }),
        });
      } catch (error) {
        const mapped = mapAdminError(error);
        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    },

    async ADD_JOB(request: Request, context: { params: Promise<{ batchId: string }> }): Promise<Response> {
      try {
        const body = await parseJsonBody<AddMigrationBatchJobBody>(request);
        if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });

        await requireAdminMigrationAccess({ agencyId: body.agencyId });

        const { batchId } = await context.params;
        const normalizedBatchId = token(batchId);
        const jobId = token(body.jobId);
        if (!normalizedBatchId) return Response.json({ error: "batchId is required" }, { status: 400 });
        if (!jobId) return Response.json({ error: "jobId is required" }, { status: 400 });

        const runtime = await requireDurableBatchRuntime(resolvedDeps.createMigrationBatchStoreRuntime);
        const membership = await runtime.store.addJobToBatch({
          batchId: normalizedBatchId,
          jobId,
          siteId: token(body.siteId) || null,
          siteVersionId: optionalUuid(body.siteVersionId, "siteVersionId"),
          sourceUrl: token(body.sourceUrl) || null,
          position: optionalPosition(body.position),
          metadata: optionalJsonObject(body.metadata, "metadata"),
        });
        const jobs = await runtime.store.listBatchJobs(normalizedBatchId);
        const summaryJob = jobs.find((job) => job.jobId === membership.jobId);

        return Response.json(
          {
            job: summaryJob ? serializeMigrationBatchJob(summaryJob) : membership,
          },
          { status: 201 },
        );
      } catch (error) {
        const mapped = mapAdminError(error);
        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    },

    async DELETE_JOB(
      _request: Request,
      context: { params: Promise<{ batchId: string; jobId: string }> },
    ): Promise<Response> {
      try {
        await requireAdminMigrationAccess();
        const { batchId, jobId } = await context.params;
        const normalizedBatchId = token(batchId);
        const normalizedJobId = token(jobId);
        if (!normalizedBatchId) return Response.json({ error: "batchId is required" }, { status: 400 });
        if (!normalizedJobId) return Response.json({ error: "jobId is required" }, { status: 400 });

        const runtime = await requireDurableBatchRuntime(resolvedDeps.createMigrationBatchStoreRuntime);
        const removed = await runtime.store.removeJobFromBatch(normalizedBatchId, normalizedJobId);
        return Response.json({ removed });
      } catch (error) {
        const mapped = mapAdminError(error);
        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    },
  };
}
