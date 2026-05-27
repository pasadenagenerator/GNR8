import { runOpenproviderSandboxRegisterDomainProbe } from "@/gnr8/runtime/providers/openprovider/openprovider-sandbox-register-domain-probe";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

type OpenproviderSandboxRegisterProbeRouteDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  runOpenproviderSandboxRegisterDomainProbe: typeof runOpenproviderSandboxRegisterDomainProbe;
};

function parseSuperadminAuthError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "Unauthorized") return { status: 401, message: "Unauthorized" };
  if (error.message.startsWith("Forbidden")) return { status: 403, message: "Forbidden: superadmin only" };
  return null;
}

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

export function createOpenproviderSandboxRegisterDomainProbeRouteHandlers(
  deps: Partial<OpenproviderSandboxRegisterProbeRouteDependencies> = {},
) {
  const resolvedDeps: OpenproviderSandboxRegisterProbeRouteDependencies = {
    requireSuperadminUserId,
    runOpenproviderSandboxRegisterDomainProbe,
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();

        const body = (await request.json().catch(() => ({}))) as { domain?: unknown };
        const domain = sanitizeToken(body.domain);
        if (!domain) {
          return Response.json(
            {
              error: "Invalid request body: domain is required",
              provider: "openprovider",
              adminOnly: true,
              executionAllowed: false,
              executionBlocked: true,
              diagnostics: [
                "OPENPROVIDER_SANDBOX_REGISTER_PROBE_FAILED_CLOSED",
                "OPENPROVIDER_SANDBOX_REGISTER_PROBE_INVALID_DOMAIN",
                "OPENPROVIDER_SANDBOX_REGISTER_PROBE_BOUNDARY_CONFIRMED",
              ],
            },
            { status: 400 },
          );
        }

        const result = await resolvedDeps.runOpenproviderSandboxRegisterDomainProbe({ domain });
        const status = result.success ? 200 : result.status;
        return Response.json(result, { status });
      } catch (error) {
        const authError = parseSuperadminAuthError(error);
        if (authError) {
          return Response.json(
            {
              error: authError.message,
              provider: "openprovider",
              adminOnly: true,
              executionAllowed: false,
              executionBlocked: true,
              diagnostics: [
                "OPENPROVIDER_SANDBOX_REGISTER_PROBE_FAILED_CLOSED",
                "OPENPROVIDER_SANDBOX_REGISTER_PROBE_BOUNDARY_CONFIRMED",
              ],
            },
            { status: authError.status },
          );
        }

        return Response.json(
          {
            error: "Failed to execute Openprovider sandbox register-domain probe",
            provider: "openprovider",
            adminOnly: true,
            executionAllowed: false,
            executionBlocked: true,
            diagnostics: [
              "OPENPROVIDER_SANDBOX_REGISTER_PROBE_FAILED_CLOSED",
              "OPENPROVIDER_SANDBOX_REGISTER_PROBE_BOUNDARY_CONFIRMED",
            ],
          },
          { status: 500 },
        );
      }
    },
  };
}
