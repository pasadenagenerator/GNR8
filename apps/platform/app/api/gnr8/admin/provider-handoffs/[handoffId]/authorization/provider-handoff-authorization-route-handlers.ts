import { getProviderExecutionHandoffByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-repository";
import {
  buildRuntimeProviderGovernanceAuthorizationSummary,
  createRuntimeProviderGovernanceAuthorization,
  type RuntimeProviderGovernanceAuthorizationArtifact,
  type RuntimeProviderGovernanceAuthorizationStatus,
} from "@/gnr8/runtime/providers/runtime-provider-governance-authorization";
import {
  createProviderGovernanceAuthorizationArtifacts,
  getProviderGovernanceAuthorizationsByHandoffId,
} from "@/gnr8/runtime/providers/runtime-provider-governance-authorization-repository";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

const ALLOWED_AUTHORIZATION_STATUSES = new Set([
  "not_requested",
  "pending_authorization",
  "authorized_for_future_execution",
  "denied",
] as const satisfies readonly RuntimeProviderGovernanceAuthorizationStatus[]);

type AuthorizationCreateRequest = {
  authorizationStatus?: string;
  authorizationReason?: string;
};

type ProviderHandoffAuthorizationRouteDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  getProviderExecutionHandoffByHandoffId: typeof getProviderExecutionHandoffByHandoffId;
  getProviderGovernanceAuthorizationsByHandoffId: typeof getProviderGovernanceAuthorizationsByHandoffId;
  createProviderGovernanceAuthorizationArtifacts: typeof createProviderGovernanceAuthorizationArtifacts;
};

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function parseSuperadminAuthError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof Error)) return null;
  if (error.message === "Unauthorized") return { status: 401, message: "Unauthorized" };
  if (error.message.startsWith("Forbidden")) return { status: 403, message: "Forbidden: superadmin only" };
  return null;
}

function isAllowedAuthorizationStatus(value: string): value is RuntimeProviderGovernanceAuthorizationStatus {
  return ALLOWED_AUTHORIZATION_STATUSES.has(value as RuntimeProviderGovernanceAuthorizationStatus);
}

function sanitizeAuthorization(artifact: RuntimeProviderGovernanceAuthorizationArtifact): RuntimeProviderGovernanceAuthorizationArtifact {
  return {
    ...artifact,
    authorizationId: sanitizeToken(artifact.authorizationId),
    handoffId: sanitizeToken(artifact.handoffId),
    correlationKey: sanitizeToken(artifact.correlationKey),
    authorizationReason: sanitizeToken(artifact.authorizationReason),
    createdAt: sanitizeToken(artifact.createdAt),
    diagnostics: uniqueSorted(artifact.diagnostics) as RuntimeProviderGovernanceAuthorizationArtifact["diagnostics"],
    intentOnly: true,
    executionBlocked: true,
  };
}

export function createProviderHandoffAuthorizationRouteHandlers(
  deps: Partial<ProviderHandoffAuthorizationRouteDependencies> = {},
) {
  const resolvedDeps: ProviderHandoffAuthorizationRouteDependencies = {
    requireSuperadminUserId,
    getProviderExecutionHandoffByHandoffId,
    getProviderGovernanceAuthorizationsByHandoffId,
    createProviderGovernanceAuthorizationArtifacts,
    ...deps,
  };

  return {
    async GET(_request: Request, context: { params: Promise<{ handoffId: string }> }): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();
        const { handoffId } = await context.params;
        const normalizedHandoffId = sanitizeToken(handoffId);
        if (!normalizedHandoffId) {
          return Response.json(
            {
              authorization: null,
              authorizationSummary: {
                authorizationStatus: "not_requested",
                authorizationReason: "",
                intentOnly: true,
                executionBlocked: true,
                authorizationCount: 0,
                latestAuthorizationId: "",
                latestCreatedAt: "",
              },
              executionBlocked: true,
              intentOnly: true,
              diagnostics: ["GOVERNANCE_AUTHORIZATION_FAILED_CLOSED:MISSING_HANDOFF_ID"],
            },
            { status: 400 },
          );
        }

        const handoff = await resolvedDeps.getProviderExecutionHandoffByHandoffId(normalizedHandoffId);
        if (!handoff) {
          return Response.json(
            {
              authorization: null,
              authorizationSummary: {
                authorizationStatus: "not_requested",
                authorizationReason: "",
                intentOnly: true,
                executionBlocked: true,
                authorizationCount: 0,
                latestAuthorizationId: "",
                latestCreatedAt: "",
              },
              executionBlocked: true,
              intentOnly: true,
              diagnostics: ["GOVERNANCE_AUTHORIZATION_FAILED_CLOSED:HANDOFF_NOT_FOUND"],
            },
            { status: 404 },
          );
        }

        const result = await resolvedDeps.getProviderGovernanceAuthorizationsByHandoffId(normalizedHandoffId);
        const latest = result.authorizations.at(-1) ?? null;
        const summary = buildRuntimeProviderGovernanceAuthorizationSummary({ artifacts: result.authorizations });

        return Response.json(
          {
            authorization: latest ? sanitizeAuthorization(latest) : null,
            authorizationSummary: summary.summary,
            executionBlocked: true,
            intentOnly: true,
            diagnostics: uniqueSorted([...result.diagnostics, ...summary.diagnostics]),
          },
          { status: 200 },
        );
      } catch (error) {
        const mapped = parseSuperadminAuthError(error);
        if (mapped) return Response.json({ error: mapped.message }, { status: mapped.status });
        return Response.json(
          {
            authorization: null,
            executionBlocked: true,
            intentOnly: true,
            diagnostics: ["GOVERNANCE_AUTHORIZATION_FAILED_CLOSED"],
          },
          { status: 500 },
        );
      }
    },
    async POST(request: Request, context: { params: Promise<{ handoffId: string }> }): Promise<Response> {
      const diagnostics: string[] = ["GOVERNANCE_AUTHORIZATION_CREATE_REQUEST_RECEIVED"];
      try {
        await resolvedDeps.requireSuperadminUserId();
        const { handoffId } = await context.params;
        const normalizedHandoffId = sanitizeToken(handoffId);
        if (!normalizedHandoffId) {
          return Response.json(
            { ok: false, executionBlocked: true, intentOnly: true, diagnostics: [...diagnostics, "GOVERNANCE_AUTHORIZATION_FAILED_CLOSED:MISSING_HANDOFF_ID"] },
            { status: 400 },
          );
        }

        const handoff = await resolvedDeps.getProviderExecutionHandoffByHandoffId(normalizedHandoffId);
        if (!handoff) {
          return Response.json(
            { ok: false, executionBlocked: true, intentOnly: true, diagnostics: [...diagnostics, "GOVERNANCE_AUTHORIZATION_FAILED_CLOSED:HANDOFF_NOT_FOUND"] },
            { status: 404 },
          );
        }

        const payload = (await request.json().catch(() => ({}))) as AuthorizationCreateRequest;
        const authorizationStatus = sanitizeToken(payload.authorizationStatus);
        if (!isAllowedAuthorizationStatus(authorizationStatus)) {
          return Response.json(
            { ok: false, error: "Invalid authorizationStatus", executionBlocked: true, intentOnly: true, diagnostics: [...diagnostics, "GOVERNANCE_AUTHORIZATION_FAILED_CLOSED:INVALID_STATUS"] },
            { status: 400 },
          );
        }

        const created = createRuntimeProviderGovernanceAuthorization({
          handoffRef: { handoffId: handoff.handoffId, correlationKey: handoff.correlationKey },
          authorizationStatus,
          authorizationReason: sanitizeToken(payload.authorizationReason),
          createdAt: new Date().toISOString(),
        });

        if (!created.artifact) {
          return Response.json(
            {
              ok: false,
              executionBlocked: true,
              intentOnly: true,
              diagnostics: uniqueSorted([...diagnostics, ...created.diagnostics]),
              blockedReasons: created.blockedReasons,
            },
            { status: 422 },
          );
        }

        const persisted = await resolvedDeps.createProviderGovernanceAuthorizationArtifacts([created.artifact]);
        const artifact = persisted[0] ?? created.artifact;
        const readback = await resolvedDeps.getProviderGovernanceAuthorizationsByHandoffId(normalizedHandoffId);
        const summary = buildRuntimeProviderGovernanceAuthorizationSummary({ artifacts: readback.authorizations });

        return Response.json(
          {
            ok: true,
            authorization: sanitizeAuthorization(artifact),
            authorizationSummary: summary.summary,
            executionBlocked: true,
            intentOnly: true,
            diagnostics: uniqueSorted([...diagnostics, ...created.diagnostics, ...summary.diagnostics, "GOVERNANCE_AUTHORIZATION_PERSISTED"]),
          },
          { status: 200 },
        );
      } catch (error) {
        const mapped = parseSuperadminAuthError(error);
        if (mapped) return Response.json({ error: mapped.message }, { status: mapped.status });
        return Response.json(
          {
            ok: false,
            executionBlocked: true,
            intentOnly: true,
            diagnostics: uniqueSorted([...diagnostics, "GOVERNANCE_AUTHORIZATION_FAILED_CLOSED"]),
          },
          { status: 500 },
        );
      }
    },
  };
}
