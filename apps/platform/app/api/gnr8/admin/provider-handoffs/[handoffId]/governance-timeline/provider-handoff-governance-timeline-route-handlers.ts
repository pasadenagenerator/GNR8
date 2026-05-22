import { parseAgencyActionContextError, requireAgencyActionContext } from "@/app/api/gnr8/agency/_lib/agency-action-access";
import { resolveAgencyIdForSite, resolveAgencyIdForSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";
import { getProviderExecutionHandoffByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-repository";
import { getProviderGovernanceTimelineByHandoffId } from "@/gnr8/runtime/providers/runtime-provider-governance-snapshot-repository";
import { requireSuperadminUserId } from "@/src/superadmin/require-superadmin-user-id";

type TimelineSnapshot = {
  snapshotId: string;
  createdAt: string;
  reviewSummaryStatus: string;
  reviewCount: number;
  readinessStatus: string;
  diagnostics: string[];
};

export type ProviderHandoffGovernanceTimelineResponse = {
  snapshots: TimelineSnapshot[];
  executionBlocked: true;
};

type ProviderHandoffGovernanceTimelineRouteDependencies = {
  requireSuperadminUserId: typeof requireSuperadminUserId;
  getProviderExecutionHandoffByHandoffId: typeof getProviderExecutionHandoffByHandoffId;
  getProviderGovernanceTimelineByHandoffId: typeof getProviderGovernanceTimelineByHandoffId;
  resolveAgencyIdForSiteVersion: typeof resolveAgencyIdForSiteVersion;
  resolveAgencyIdForSite: typeof resolveAgencyIdForSite;
  requireAgencyActionContext: typeof requireAgencyActionContext;
};

const UUID_V4_TO_V8_LOOSE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function isUuidLike(value: string): boolean {
  return UUID_V4_TO_V8_LOOSE_REGEX.test(value);
}

function isDeterministicDevSeedHandoff(handoff: {
  siteId?: string | null;
  siteVersionId?: string | null;
  correlationKey?: string | null;
}): boolean {
  const siteId = sanitizeToken(handoff.siteId);
  const siteVersionId = sanitizeToken(handoff.siteVersionId);
  const correlationKey = sanitizeToken(handoff.correlationKey);
  if (siteId.startsWith("dev_readiness_seed_")) return true;
  if (siteVersionId.startsWith("dev_readiness_seed_")) return true;
  return correlationKey.startsWith("provider_handoff_readiness_ui_dev_seed_");
}

export function createProviderHandoffGovernanceTimelineRouteHandlers(
  deps: Partial<ProviderHandoffGovernanceTimelineRouteDependencies> = {},
) {
  const resolvedDeps: ProviderHandoffGovernanceTimelineRouteDependencies = {
    requireSuperadminUserId,
    getProviderExecutionHandoffByHandoffId,
    getProviderGovernanceTimelineByHandoffId,
    resolveAgencyIdForSiteVersion,
    resolveAgencyIdForSite,
    requireAgencyActionContext,
    ...deps,
  };

  return {
    async GET(_request: Request, context: { params: Promise<{ handoffId: string }> }): Promise<Response> {
      try {
        await resolvedDeps.requireSuperadminUserId();
        const { handoffId } = await context.params;
        const normalizedHandoffId = sanitizeToken(handoffId);
        if (!normalizedHandoffId) {
          return Response.json({ snapshots: [], executionBlocked: true } satisfies ProviderHandoffGovernanceTimelineResponse, { status: 400 });
        }

        const handoff = await resolvedDeps.getProviderExecutionHandoffByHandoffId(normalizedHandoffId);
        if (!handoff) {
          return Response.json({ snapshots: [], executionBlocked: true } satisfies ProviderHandoffGovernanceTimelineResponse, { status: 404 });
        }

        if (!isDeterministicDevSeedHandoff(handoff)) {
          const siteVersionId = sanitizeToken(handoff.siteVersionId);
          const siteId = sanitizeToken(handoff.siteId);
          const agencyId = siteVersionId && isUuidLike(siteVersionId)
            ? await resolvedDeps.resolveAgencyIdForSiteVersion(siteVersionId)
            : isUuidLike(siteId)
              ? await resolvedDeps.resolveAgencyIdForSite(siteId)
              : null;
          if (!agencyId) {
            return Response.json({ snapshots: [], executionBlocked: true } satisfies ProviderHandoffGovernanceTimelineResponse, { status: 422 });
          }
          await resolvedDeps.requireAgencyActionContext({ action: "run_migration", requestedAgencyId: agencyId });
        }

        const timeline = await resolvedDeps.getProviderGovernanceTimelineByHandoffId(normalizedHandoffId);
        const snapshots = timeline.snapshots
          .map((snapshot) => ({
            snapshotId: sanitizeToken(snapshot.snapshotId),
            createdAt: sanitizeToken(snapshot.createdAt),
            reviewSummaryStatus: sanitizeToken(snapshot.reviewSummary.reviewSummaryStatus),
            reviewCount: Number.isFinite(snapshot.reviewSummary.reviewCount) ? snapshot.reviewSummary.reviewCount : 0,
            readinessStatus: sanitizeToken(snapshot.readinessStatus),
            diagnostics: uniqueSorted(snapshot.diagnostics),
          }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.snapshotId.localeCompare(a.snapshotId));

        return Response.json({ snapshots, executionBlocked: true } satisfies ProviderHandoffGovernanceTimelineResponse, { status: 200 });
      } catch (error) {
        const mapped = parseAgencyActionContextError(error);
        if (mapped.status >= 400 && mapped.status < 500) {
          return Response.json({ error: mapped.message }, { status: mapped.status });
        }
        return Response.json({ snapshots: [], executionBlocked: true } satisfies ProviderHandoffGovernanceTimelineResponse, { status: 500 });
      }
    },
  };
}
