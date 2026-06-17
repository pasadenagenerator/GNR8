import {
  checkRenderedCaptureWorkerReadiness,
  resolveRenderedCaptureWorkerReadinessConfigFromEnv,
  type RenderedCaptureWorkerReadinessConfig,
  type RenderedCaptureWorkerReadinessResult,
} from "@/gnr8/import-rendered-capture-worker/worker-readiness";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type RenderedCaptureWorkerReadinessRouteDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  resolveConfig: () => RenderedCaptureWorkerReadinessConfig;
  checkReadiness: (input: {
    config: RenderedCaptureWorkerReadinessConfig;
    fetchImpl: FetchLike;
    sharedToken: string | null;
  }) => Promise<RenderedCaptureWorkerReadinessResult>;
  fetch: FetchLike;
  env: NodeJS.ProcessEnv;
};

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function statusForError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message.startsWith("Unauthorized")) return 401;
  if (message.startsWith("Forbidden")) return 403;
  return 500;
}

export function createRenderedCaptureWorkerReadinessRouteHandlers(
  deps: Partial<RenderedCaptureWorkerReadinessRouteDependencies> = {},
) {
  const env = deps.env ?? process.env;
  const resolvedDeps: RenderedCaptureWorkerReadinessRouteDependencies = {
    requireSuperadminUserId,
    resolveConfig: () => resolveRenderedCaptureWorkerReadinessConfigFromEnv(env),
    checkReadiness: checkRenderedCaptureWorkerReadiness,
    fetch: globalThis.fetch.bind(globalThis),
    env,
    ...deps,
  };

  return {
    async GET(): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();
        const config = resolvedDeps.resolveConfig();
        const readiness = await resolvedDeps.checkReadiness({
          config,
          fetchImpl: resolvedDeps.fetch,
          sharedToken: normalizeText(resolvedDeps.env.GNR8_RENDERED_CAPTURE_WORKER_SHARED_TOKEN) || null,
        });

        return Response.json(readiness, {
          headers: {
            "cache-control": "no-store",
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Rendered capture worker readiness check failed";
        return Response.json(
          {
            ok: false,
            error: message,
          },
          {
            status: statusForError(error),
            headers: {
              "cache-control": "no-store",
            },
          },
        );
      }
    },
  };
}
