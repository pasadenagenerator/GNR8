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

function parseRegistrationPeriod(input: unknown): number | null {
  if (input === undefined) return 1;
  if (typeof input !== "number" || !Number.isInteger(input)) return null;
  if (input < 1 || input > 10) return null;
  return input;
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

        const body = (await request.json().catch(() => ({}))) as { domain?: unknown; period?: unknown };
        const domain = sanitizeToken(body.domain);
        const period = parseRegistrationPeriod(body.period);
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
        if (period === null) {
          return Response.json(
            {
              error: "Invalid request body: period must be an integer between 1 and 10",
              provider: "openprovider",
              adminOnly: true,
              executionAllowed: false,
              executionBlocked: true,
              diagnostics: [
                "OPENPROVIDER_SANDBOX_REGISTER_PROBE_FAILED_CLOSED",
                "OPENPROVIDER_SANDBOX_REGISTER_PROBE_INVALID_PERIOD",
                "OPENPROVIDER_SANDBOX_REGISTER_PROBE_BOUNDARY_CONFIRMED",
              ],
            },
            { status: 400 },
          );
        }

        const result = await resolvedDeps.runOpenproviderSandboxRegisterDomainProbe({ domain, period });
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
