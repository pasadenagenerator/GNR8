import { recheckHostingDomain } from "@/gnr8/runtime/hosting-operations/hosting-domain-recheck-workflow";
import { resolveRuntimeHostingOperationsSiteIdentity } from "@/gnr8/runtime/runtime-store";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

export type HostingDomainRecheckRouteDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  resolveRuntimeHostingOperationsSiteIdentity: typeof resolveRuntimeHostingOperationsSiteIdentity;
  recheckHostingDomain: typeof recheckHostingDomain;
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

export function createHostingDomainRecheckRouteHandlers(deps: Partial<HostingDomainRecheckRouteDependencies> = {}) {
  const resolvedDeps: HostingDomainRecheckRouteDependencies = {
    requireSuperadminUserId,
    resolveRuntimeHostingOperationsSiteIdentity,
    recheckHostingDomain,
    ...deps,
  };

  return {
    async POST(_request: Request, context: { params: Promise<{ siteId: string; domainId: string }> }): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();

        const { siteId, domainId } = await context.params;
        const requestedSiteId = token(siteId);
        const normalizedDomainId = token(domainId);
        if (!requestedSiteId) return Response.json({ error: "siteId is required" }, { status: 400 });
        if (!normalizedDomainId) return Response.json({ error: "domainId is required" }, { status: 400 });

        const siteIdentity = await resolvedDeps.resolveRuntimeHostingOperationsSiteIdentity(requestedSiteId);
        if (!siteIdentity.runtimeSiteId) {
          return Response.json({ error: "Hosting operations site not found" }, { status: 404 });
        }

        const result = await resolvedDeps.recheckHostingDomain({
          siteId: siteIdentity.runtimeSiteId,
          domainId: normalizedDomainId,
        });
        if (!result) {
          return Response.json({ error: "Domain binding not found" }, { status: 404 });
        }

        return Response.json(result);
      } catch (error) {
        const mapped = mapAdminError(error);
        return Response.json({ error: mapped.message }, { status: mapped.status });
      }
    },
  };
}
