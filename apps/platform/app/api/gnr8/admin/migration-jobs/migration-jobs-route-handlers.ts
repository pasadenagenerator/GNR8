import {
  createMigrationFactoryRuntime,
  MigrationFactoryRuntimeConfigurationError,
  type MigrationFactoryRuntime,
} from "@/gnr8/migration-factory/migration-factory-runtime";
import { serializeMigrationJob } from "@/gnr8/migration-factory/migration-job-response-serializer";

type CreateMigrationJobBody = {
  jobId?: string;
  siteId?: string;
  sourceUrl?: string;
  startExecution?: boolean;
  agencyId?: string;
};

type ResumeMigrationJobBody = {
  agencyId?: string;
};

type RequireSuperadminUserId = () => Promise<string>;
type RequireAgencyActionContext = (input: {
  action: "run_migration";
  requestedAgencyId?: unknown;
}) => Promise<unknown>;

type MigrationJobsRouteDeps = {
  requireSuperadminUserId: RequireSuperadminUserId;
  requireAgencyActionContext: RequireAgencyActionContext;
  createMigrationFactoryRuntime: typeof createMigrationFactoryRuntime;
};

function token(value: unknown): string {
  return String(value ?? "").trim();
}

function parseHttpUrl(value: unknown): string | null {
  const raw = token(value);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

async function parseJsonBody<T>(request: Request): Promise<T | null> {
  return (await request.json().catch(() => null)) as T | null;
}

function mapAdminError(error: unknown): { status: number; message: string } {
  if (error instanceof MigrationFactoryRuntimeConfigurationError) {
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

function runtimeOptions(runtime: MigrationFactoryRuntime) {
  return {
    durable: runtime.durable,
    storeKind: runtime.storeKind,
  };
}

export function createMigrationJobsRouteHandlers(deps: Partial<MigrationJobsRouteDeps> = {}) {
  const resolvedDeps: MigrationJobsRouteDeps = {
    requireSuperadminUserId: defaultRequireSuperadminUserId,
    requireAgencyActionContext: defaultRequireAgencyActionContext,
    createMigrationFactoryRuntime,
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
        const body = await parseJsonBody<CreateMigrationJobBody>(request);
        if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });

        await requireAdminMigrationAccess({ agencyId: body.agencyId });

        const siteId = token(body.siteId);
        const sourceUrl = parseHttpUrl(body.sourceUrl);
        if (!siteId) return Response.json({ error: "siteId is required" }, { status: 400 });
        if (!sourceUrl) return Response.json({ error: "sourceUrl must be valid http(s)" }, { status: 400 });

        const runtime = await resolvedDeps.createMigrationFactoryRuntime({ mode: "durable" });
        if (!runtime.durable) {
          return Response.json(
            { error: "Durable migration admin route requires durable storage" },
            { status: 503 },
          );
        }

        const job = await runtime.factory.startMigrationJob({
          jobId: token(body.jobId) || undefined,
          siteId,
          sourceUrl,
        });
        const executionReport = body.startExecution ? await runtime.factory.runMigrationJob(job.jobId) : null;
        const loaded = (await runtime.store.getJob(job.jobId)) ?? job;

        return Response.json(
          {
            job: serializeMigrationJob(loaded, runtimeOptions(runtime)),
            executionReport,
          },
          { status: 201 },
        );
      } catch (error) {
        const mapped = mapAdminError(error);
        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    },

    async GET(_request: Request, context: { params: Promise<{ jobId: string }> }): Promise<Response> {
      try {
        await requireAdminMigrationAccess();
        const { jobId } = await context.params;
        const normalizedJobId = token(jobId);
        if (!normalizedJobId) return Response.json({ error: "jobId is required" }, { status: 400 });

        const runtime = await resolvedDeps.createMigrationFactoryRuntime({ mode: "durable" });
        if (!runtime.durable) {
          return Response.json(
            { error: "Durable migration admin route requires durable storage" },
            { status: 503 },
          );
        }

        const job = await runtime.store.getJob(normalizedJobId);
        if (!job) return Response.json({ error: "Migration job not found" }, { status: 404 });

        return Response.json({
          job: serializeMigrationJob(job, {
            ...runtimeOptions(runtime),
            includeEvents: true,
            includeActivationHistory: true,
          }),
        });
      } catch (error) {
        const mapped = mapAdminError(error);
        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    },

    async RESUME(request: Request, context: { params: Promise<{ jobId: string }> }): Promise<Response> {
      try {
        const body = await parseJsonBody<ResumeMigrationJobBody>(request);
        await requireAdminMigrationAccess({ agencyId: body?.agencyId });
        const { jobId } = await context.params;
        const normalizedJobId = token(jobId);
        if (!normalizedJobId) return Response.json({ error: "jobId is required" }, { status: 400 });

        const runtime = await resolvedDeps.createMigrationFactoryRuntime({ mode: "durable" });
        if (!runtime.durable) {
          return Response.json(
            { error: "Durable migration admin route requires durable storage" },
            { status: 503 },
          );
        }

        const existing = await runtime.store.getJob(normalizedJobId);
        if (!existing) return Response.json({ error: "Migration job not found" }, { status: 404 });

        const executionReport = await runtime.factory.resumeMigrationJob(normalizedJobId);
        const updated = (await runtime.store.getJob(normalizedJobId)) ?? existing;

        return Response.json({
          job: serializeMigrationJob(updated, {
            ...runtimeOptions(runtime),
            includeEvents: true,
            includeActivationHistory: true,
          }),
          executionReport,
        });
      } catch (error) {
        const mapped = mapAdminError(error);
        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    },
  };
}
