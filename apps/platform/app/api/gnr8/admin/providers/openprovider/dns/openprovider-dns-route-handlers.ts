import { readOpenproviderDnsRecordInventory } from "@/gnr8/runtime/providers/openprovider/openprovider-dns-record-inventory";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

type OpenproviderDnsRouteDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  readOpenproviderDnsRecordInventory: typeof readOpenproviderDnsRecordInventory;
};

function parseSuperadminAuthError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "Unauthorized") return { status: 401, message: "Unauthorized" };
  if (error.message.startsWith("Forbidden")) return { status: 403, message: "Forbidden: superadmin only" };
  return null;
}

function failClosedPayload(error: string) {
  return {
    error,
    provider: "openprovider" as const,
    readOnly: true as const,
    executionAllowed: false as const,
    executionBlocked: true as const,
    domains: [],
    diagnostics: ["OPENPROVIDER_DNS_READ_FAILED_CLOSED", "OPENPROVIDER_DNS_READ_ONLY_BOUNDARY_CONFIRMED"],
  };
}

export function createOpenproviderDnsRouteHandlers(deps: Partial<OpenproviderDnsRouteDependencies> = {}) {
  const resolvedDeps: OpenproviderDnsRouteDependencies = {
    requireSuperadminUserId,
    readOpenproviderDnsRecordInventory,
    ...deps,
  };

  return {
    async GET(): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();
        const inventory = await resolvedDeps.readOpenproviderDnsRecordInventory();
        return Response.json(inventory, { status: 200 });
      } catch (error) {
        const authError = parseSuperadminAuthError(error);
        if (authError) {
          return Response.json(failClosedPayload(authError.message), { status: authError.status });
        }
        return Response.json(failClosedPayload("Failed to read Openprovider DNS record inventory"), { status: 500 });
      }
    },
  };
}
