import { readOpenproviderDomainInventory } from "@/gnr8/runtime/providers/openprovider/openprovider-domain-inventory";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

type OpenproviderDomainsRouteDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  readOpenproviderDomainInventory: typeof readOpenproviderDomainInventory;
};

function parseSuperadminAuthError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "Unauthorized") return { status: 401, message: "Unauthorized" };
  if (error.message.startsWith("Forbidden")) return { status: 403, message: "Forbidden: superadmin only" };
  return null;
}

export function createOpenproviderDomainsRouteHandlers(
  deps: Partial<OpenproviderDomainsRouteDependencies> = {},
) {
  const resolvedDeps: OpenproviderDomainsRouteDependencies = {
    requireSuperadminUserId,
    readOpenproviderDomainInventory,
    ...deps,
  };

  return {
    async GET(): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();
        const inventory = await resolvedDeps.readOpenproviderDomainInventory();
        return Response.json(inventory, { status: 200 });
      } catch (error) {
        const authError = parseSuperadminAuthError(error);
        if (authError) {
          return Response.json(
            {
              error: authError.message,
              provider: "openprovider",
              readOnly: true,
              executionAllowed: false,
              executionBlocked: true,
              fetchedAt: new Date().toISOString(),
              domains: [],
              diagnostics: ["OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED", "OPENPROVIDER_READ_ONLY_BOUNDARY_CONFIRMED"],
            },
            { status: authError.status },
          );
        }

        return Response.json(
          {
            error: "Failed to read Openprovider domain inventory",
            provider: "openprovider",
            readOnly: true,
            executionAllowed: false,
            executionBlocked: true,
            fetchedAt: new Date().toISOString(),
            domains: [],
            diagnostics: ["OPENPROVIDER_DOMAIN_INVENTORY_READ_FAILED_CLOSED", "OPENPROVIDER_READ_ONLY_BOUNDARY_CONFIRMED"],
          },
          { status: 500 },
        );
      }
    },
  };
}
