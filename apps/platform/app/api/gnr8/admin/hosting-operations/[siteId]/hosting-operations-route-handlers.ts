import { getHostingOperationsReadModel } from "@/gnr8/runtime/hosting-operations/hosting-operations-read-model";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

export type HostingOperationsRouteDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  getHostingOperationsReadModel: typeof getHostingOperationsReadModel;
};

function token(value: unknown): string {
  return String(value ?? "").trim();
}

function mapAdminError(error: unknown): { status: number; message: string } {
  if (error instanceof Error) {
    if (error.message === "Unauthorized") return { status: 401, message: error.message };
    if (error.message.startsWith("Forbidden")) return { status: 403, message: "Forbidden: superadmin only" };
  }
  return {
    status: 500,
    message: error instanceof Error ? error.message : "Internal server error",
  };
}

export function createHostingOperationsRouteHandlers(deps: Partial<HostingOperationsRouteDependencies> = {}) {
  const resolvedDeps: HostingOperationsRouteDependencies = {
    requireSuperadminUserId,
    getHostingOperationsReadModel,
    ...deps,
  };

  return {
    async GET(_request: Request, context: { params: Promise<{ siteId: string }> }): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();

        const { siteId } = await context.params;
        const normalizedSiteId = token(siteId);
        if (!normalizedSiteId) {
          return Response.json({ error: "siteId is required" }, { status: 400 });
        }

        const readModel = await resolvedDeps.getHostingOperationsReadModel(normalizedSiteId);
        if (!readModel.site.found) {
          return Response.json({ error: "Hosting operations site not found", ...readModel }, { status: 404 });
        }

        return Response.json(readModel);
      } catch (error) {
        const mapped = mapAdminError(error);
        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    },
  };
}
