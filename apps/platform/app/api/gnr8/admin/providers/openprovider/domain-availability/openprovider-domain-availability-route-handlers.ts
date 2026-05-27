import { readOpenproviderDomainAvailability } from "@/gnr8/runtime/providers/openprovider/openprovider-domain-availability";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

type OpenproviderDomainAvailabilityRouteDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  readOpenproviderDomainAvailability: typeof readOpenproviderDomainAvailability;
};

function parseSuperadminAuthError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "Unauthorized") return { status: 401, message: "Unauthorized" };
  if (error.message.startsWith("Forbidden")) return { status: 403, message: "Forbidden: superadmin only" };
  return null;
}

function normalizeDomainParam(raw: string | null): string {
  return String(raw ?? "").trim().toLowerCase();
}

export function createOpenproviderDomainAvailabilityRouteHandlers(
  deps: Partial<OpenproviderDomainAvailabilityRouteDependencies> = {},
) {
  const resolvedDeps: OpenproviderDomainAvailabilityRouteDependencies = {
    requireSuperadminUserId,
    readOpenproviderDomainAvailability,
    ...deps,
  };

  return {
    async GET(request: Request): Promise<Response> {
      const checkedAt = new Date().toISOString();
      const domain = normalizeDomainParam(new URL(request.url).searchParams.get("domain"));

      try {
        await resolvedDeps.requireSuperadminUserId();

        if (!domain) {
          return Response.json(
            {
              error: "Missing required query parameter: domain",
              provider: "openprovider",
              readOnly: true,
              executionAllowed: false,
              executionBlocked: true,
              domain,
              available: "unknown",
              status: "failed_closed",
              checkedAt,
              diagnostics: [
                "OPENPROVIDER_AVAILABILITY_STARTED",
                "OPENPROVIDER_AVAILABILITY_BOUNDARY_CONFIRMED",
                "OPENPROVIDER_AVAILABILITY_FAILED_CLOSED",
                "OPENPROVIDER_AVAILABILITY_INVALID_DOMAIN",
              ],
            },
            { status: 400 },
          );
        }

        const availability = await resolvedDeps.readOpenproviderDomainAvailability(domain);
        return Response.json(availability, { status: 200 });
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
              domain,
              available: "unknown",
              status: "failed_closed",
              checkedAt,
              diagnostics: [
                "OPENPROVIDER_AVAILABILITY_STARTED",
                "OPENPROVIDER_AVAILABILITY_BOUNDARY_CONFIRMED",
                "OPENPROVIDER_AVAILABILITY_FAILED_CLOSED",
              ],
            },
            { status: authError.status },
          );
        }

        return Response.json(
          {
            error: "Failed to read Openprovider domain availability",
            provider: "openprovider",
            readOnly: true,
            executionAllowed: false,
            executionBlocked: true,
            domain,
            available: "unknown",
            status: "failed_closed",
            checkedAt,
            diagnostics: [
              "OPENPROVIDER_AVAILABILITY_STARTED",
              "OPENPROVIDER_AVAILABILITY_BOUNDARY_CONFIRMED",
              "OPENPROVIDER_AVAILABILITY_FAILED_CLOSED",
            ],
          },
          { status: 500 },
        );
      }
    },
  };
}
