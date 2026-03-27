import "server-only";

import { resolveBillingContextForSite } from "@/gnr8/billing/billing-resolution-service";
import { logRuntimeUsageEventWithAttribution } from "@/gnr8/billing/cost-event-logging-service";

type PersistRuntimeUsageEventInput = {
  siteId?: string | null;
  artifactId?: string | null;
  requestCount?: number;
  bandwidthBytes?: number;
  computeMs?: number;
  periodStart: string | Date;
  periodEnd: string | Date;
};

export type PersistRuntimeUsageEventResult =
  | { status: "written" }
  | { status: "skipped"; reason: "missing_site_id" | "missing_billing_context" }
  | { status: "failed"; reason: "persist_error" };

type RuntimeUsageEventLoggerDependencies = {
  resolveBillingContextForSite: typeof resolveBillingContextForSite;
  logRuntimeUsageEventWithAttribution: typeof logRuntimeUsageEventWithAttribution;
  warn: (message: string, payload: Record<string, unknown>) => void;
};

const runtimeUsageEventLoggerDependencies: RuntimeUsageEventLoggerDependencies = {
  resolveBillingContextForSite,
  logRuntimeUsageEventWithAttribution,
  warn: (message, payload) => {
    console.warn(message, payload);
  },
};

function warningMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export async function persistRuntimeUsageEvent(
  input: PersistRuntimeUsageEventInput,
): Promise<PersistRuntimeUsageEventResult> {
  const siteId = String(input.siteId ?? "").trim();
  if (!siteId) {
    return { status: "skipped", reason: "missing_site_id" };
  }

  const billingContext = await runtimeUsageEventLoggerDependencies.resolveBillingContextForSite(siteId);
  if (!billingContext) {
    runtimeUsageEventLoggerDependencies.warn(
      "[runtime-usage-event] Skipping runtime usage event because billing context could not be resolved",
      {
        siteId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
    );
    return { status: "skipped", reason: "missing_billing_context" };
  }

  try {
    await runtimeUsageEventLoggerDependencies.logRuntimeUsageEventWithAttribution(
      {
        siteId,
        artifactId: input.artifactId,
        requestCount: input.requestCount,
        bandwidthBytes: input.bandwidthBytes,
        computeMs: input.computeMs,
        estimatedCost: 0,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
      {
        billingAccountId: billingContext.billingAccountId,
        agencyId: billingContext.agencyId,
        clientId: billingContext.clientId,
        siteId: billingContext.siteId,
        costCenterIds: {
          agencyCostCenterId: billingContext.costCenterIds.agencyCostCenterId,
          clientCostCenterId: billingContext.costCenterIds.clientCostCenterId,
          siteCostCenterId: billingContext.costCenterIds.siteCostCenterId,
        },
      },
    );
    return { status: "written" };
  } catch (error) {
    runtimeUsageEventLoggerDependencies.warn("[runtime-usage-event] Failed to persist runtime usage event", {
      siteId,
      artifactId: input.artifactId ?? null,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      error: warningMessage(error),
    });
    return { status: "failed", reason: "persist_error" };
  }
}

export function __setRuntimeUsageEventLoggerDependenciesForTest(
  overrides: Partial<RuntimeUsageEventLoggerDependencies>,
): () => void {
  const previous = { ...runtimeUsageEventLoggerDependencies };
  Object.assign(runtimeUsageEventLoggerDependencies, overrides);
  return () => {
    Object.assign(runtimeUsageEventLoggerDependencies, previous);
  };
}
