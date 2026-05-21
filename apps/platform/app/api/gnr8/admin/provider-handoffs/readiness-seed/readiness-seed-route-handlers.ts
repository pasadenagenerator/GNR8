import { createProviderHandoffReadinessDevSeed } from "@/gnr8/runtime/providers/provider-handoff-readiness-dev-seed";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

export type ProviderHandoffReadinessSeedRouteDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  createProviderHandoffReadinessDevSeed: typeof createProviderHandoffReadinessDevSeed;
  getNodeEnv: () => string;
  isProductionSeedEnabled: () => boolean;
};

type ProviderHandoffReadinessSeedResponse = {
  ok: boolean;
  adminOnly: true;
  executionBlocked: true;
  handoffId: string;
  readinessUrl: string;
  nextAllowedAction: string;
  diagnostics: string[];
  warning: string;
  reusedExisting: boolean;
};

function mapError(error: unknown): { status: number; message: string } {
  const message = redactSensitive(sanitizeToken(error instanceof Error ? error.message : "Internal server error"));
  if (message === "Unauthorized") return { status: 401, message };
  if (message.startsWith("Forbidden")) return { status: 403, message };
  return { status: 500, message };
}

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function redactSensitive(value: string): string {
  let output = value;
  output = output.replace(/\b([A-Za-z0-9_]*(?:token|secret|password|api[_-]?key|credential)[A-Za-z0-9_]*)\b/gi, "[redacted]");
  output = output.replace(/\b(?:sk|pk)_[A-Za-z0-9_-]{8,}\b/g, "[redacted]");
  return output;
}

function sanitizeDiagnostics(values: readonly string[]): string[] {
  const out: string[] = [];
  for (const entry of values) {
    const sanitized = redactSensitive(sanitizeToken(entry));
    if (!sanitized) continue;
    if (!out.includes(sanitized)) out.push(sanitized);
  }
  return out;
}

export function createProviderHandoffReadinessSeedRouteHandlers(
  deps: Partial<ProviderHandoffReadinessSeedRouteDependencies> = {},
) {
  const resolvedDeps: ProviderHandoffReadinessSeedRouteDependencies = {
    requireSuperadminUserId,
    createProviderHandoffReadinessDevSeed,
    getNodeEnv: () => String(process.env.NODE_ENV ?? "development").trim().toLowerCase(),
    isProductionSeedEnabled: () => String(process.env.GNR8_ADMIN_PROVIDER_HANDOFF_READINESS_SEED_ENABLED ?? "").trim() === "1",
    ...deps,
  };

  return {
    async POST(_request: Request): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();

        const nodeEnv = resolvedDeps.getNodeEnv();
        const production = nodeEnv === "production";
        if (production && !resolvedDeps.isProductionSeedEnabled()) {
          return Response.json(
            {
              ok: false,
              adminOnly: true,
              executionBlocked: true,
              error: "Forbidden: readiness seed route is disabled in production",
              requiredEnvFlag: "GNR8_ADMIN_PROVIDER_HANDOFF_READINESS_SEED_ENABLED=1",
            },
            { status: 403 },
          );
        }

        const seeded = await resolvedDeps.createProviderHandoffReadinessDevSeed({
          nodeEnv,
          allowProduction: production,
        });

        const body: ProviderHandoffReadinessSeedResponse = {
          ok: true,
          adminOnly: true,
          executionBlocked: true,
          handoffId: sanitizeToken(seeded.handoffId),
          readinessUrl: sanitizeToken(seeded.readinessUiPath),
          nextAllowedAction: sanitizeToken(seeded.workerPickupEvidence.nextAllowedAction),
          diagnostics: sanitizeDiagnostics(seeded.workerPickupEvidence.diagnostics),
          warning: "Admin-only dev/test readiness seed. Provider execution remains blocked; control-plane dry-run artifacts only.",
          reusedExisting: seeded.reusedExisting === true,
        };

        return Response.json(body, { status: 200 });
      } catch (error) {
        const mapped = mapError(error);
        return Response.json(
          {
            ok: false,
            adminOnly: true,
            executionBlocked: true,
            error: mapped.message,
          },
          { status: mapped.status },
        );
      }
    },
  };
}
