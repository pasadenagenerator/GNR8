import "server-only";

import { resolveBillingContextForSite } from "@/gnr8/billing/billing-resolution-service";
import { calculateRuntimeEstimatedCost } from "@/gnr8/billing/cost-model";
import { logRuntimeUsageEvent } from "@/gnr8/billing/cost-event-logging-service";
import {
  drainRuntimeUsageAggregates,
  requeueRuntimeUsageAggregates,
  type RuntimeUsageAggregate,
} from "@/gnr8/runtime/runtime-usage-collector";

type RuntimeUsageFlusherDependencies = {
  resolveBillingContextForSite: typeof resolveBillingContextForSite;
  logRuntimeUsageEvent: typeof logRuntimeUsageEvent;
  warn: (message: string, payload: Record<string, unknown>) => void;
};

const runtimeUsageFlusherDependencies: RuntimeUsageFlusherDependencies = {
  resolveBillingContextForSite,
  logRuntimeUsageEvent,
  warn: (message, payload) => {
    console.warn(message, payload);
  },
};

// Legacy periodic flush path retained for compatibility; public runtime no longer depends on this timer.
const DEFAULT_FLUSH_INTERVAL_MS = 30_000;

let flushTimer: ReturnType<typeof setInterval> | null = null;
let flushInFlight = false;

function warningMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function flushIntervalMs(): number {
  const raw = Number(process.env.GNR8_RUNTIME_USAGE_FLUSH_INTERVAL_MS ?? DEFAULT_FLUSH_INTERVAL_MS);
  if (!Number.isFinite(raw) || raw < 5_000) return DEFAULT_FLUSH_INTERVAL_MS;
  return Math.floor(raw);
}

export type RuntimeUsageFlushResult = {
  drainedCount: number;
  writtenCount: number;
  skippedCount: number;
  failedCount: number;
};

async function writeAggregate(aggregate: RuntimeUsageAggregate): Promise<"written" | "skipped"> {
  const siteId = String(aggregate.siteId ?? "").trim();
  if (!siteId) {
    runtimeUsageFlusherDependencies.warn("[runtime-usage-flush] Skipping aggregate with missing siteId", {
      aggregate,
    });
    return "skipped";
  }

  const billingContext = await runtimeUsageFlusherDependencies.resolveBillingContextForSite(siteId);
  if (!billingContext) {
    runtimeUsageFlusherDependencies.warn("[runtime-usage-flush] Skipping aggregate because billing context could not be resolved", {
      siteId,
      periodStart: aggregate.periodStart,
      periodEnd: aggregate.periodEnd,
    });
    return "skipped";
  }

  await runtimeUsageFlusherDependencies.logRuntimeUsageEvent({
    siteId,
    artifactId: aggregate.artifactId,
    requestCount: aggregate.requestCount,
    bandwidthBytes: aggregate.bandwidthBytes,
    computeMs: aggregate.computeMs,
    estimatedCost: calculateRuntimeEstimatedCost({
      requestCount: aggregate.requestCount,
      bandwidthBytes: aggregate.bandwidthBytes,
    }),
    periodStart: aggregate.periodStart,
    periodEnd: aggregate.periodEnd,
  });

  return "written";
}

export async function flushRuntimeUsageNow(): Promise<RuntimeUsageFlushResult> {
  const aggregates = drainRuntimeUsageAggregates();
  if (aggregates.length === 0) {
    return {
      drainedCount: 0,
      writtenCount: 0,
      skippedCount: 0,
      failedCount: 0,
    };
  }

  const failed: RuntimeUsageAggregate[] = [];
  let writtenCount = 0;
  let skippedCount = 0;

  for (const aggregate of aggregates) {
    try {
      const result = await writeAggregate(aggregate);
      if (result === "written") writtenCount += 1;
      else skippedCount += 1;
    } catch (error) {
      failed.push(aggregate);
      runtimeUsageFlusherDependencies.warn("[runtime-usage-flush] Failed to persist aggregate; requeueing for retry", {
        siteId: aggregate.siteId,
        periodStart: aggregate.periodStart,
        periodEnd: aggregate.periodEnd,
        error: warningMessage(error),
      });
    }
  }

  if (failed.length > 0) {
    requeueRuntimeUsageAggregates(failed);
  }

  return {
    drainedCount: aggregates.length,
    writtenCount,
    skippedCount,
    failedCount: failed.length,
  };
}

async function maybeFlushRuntimeUsage(): Promise<void> {
  if (flushInFlight) return;
  flushInFlight = true;
  try {
    await flushRuntimeUsageNow();
  } catch (error) {
    runtimeUsageFlusherDependencies.warn("[runtime-usage-flush] Unhandled flush error", {
      error: warningMessage(error),
    });
  } finally {
    flushInFlight = false;
  }
}

export function ensureRuntimeUsageFlushLoopStarted(): void {
  if (flushTimer) return;

  flushTimer = setInterval(() => {
    void maybeFlushRuntimeUsage();
  }, flushIntervalMs());
  flushTimer.unref?.();
}

export function __setRuntimeUsageFlusherDependenciesForTest(
  overrides: Partial<RuntimeUsageFlusherDependencies>,
): () => void {
  const previous = { ...runtimeUsageFlusherDependencies };
  Object.assign(runtimeUsageFlusherDependencies, overrides);
  return () => {
    Object.assign(runtimeUsageFlusherDependencies, previous);
  };
}

export function __resetRuntimeUsageFlusherForTest(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  flushInFlight = false;
}
