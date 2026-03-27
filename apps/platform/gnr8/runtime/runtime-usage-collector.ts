import "server-only";

export type RuntimeUsageIncrement = {
  artifactId?: string | null;
  requestCount?: number;
  bandwidthBytes?: number;
  computeMs?: number;
  at?: number | Date;
};

export type RuntimeUsageAggregate = {
  siteId: string;
  artifactId: string | null;
  requestCount: number;
  bandwidthBytes: number;
  computeMs: number;
  periodStart: string;
  periodEnd: string;
  lastUpdated: string;
};

type RuntimeUsageMutableAggregate = {
  siteId: string;
  artifactId: string | null;
  requestCount: number;
  bandwidthBytes: number;
  computeMs: number;
  periodStartMs: number;
  periodEndMs: number;
  lastUpdatedMs: number;
};

const usageBySiteId = new Map<string, RuntimeUsageMutableAggregate>();

function normalizeSiteId(siteId: string | null | undefined): string {
  return String(siteId ?? "").trim();
}

function toFiniteNonNegativeInteger(value: number | undefined, fallback = 0): number {
  if (value == null) return fallback;
  if (!Number.isFinite(value) || value < 0) return fallback;
  return Math.floor(value);
}

function toTimestamp(value: number | Date | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? Math.floor(ms) : Date.now();
  }
  return Date.now();
}

function toAggregateSnapshot(aggregate: RuntimeUsageMutableAggregate): RuntimeUsageAggregate {
  return {
    siteId: aggregate.siteId,
    artifactId: aggregate.artifactId,
    requestCount: aggregate.requestCount,
    bandwidthBytes: aggregate.bandwidthBytes,
    computeMs: aggregate.computeMs,
    periodStart: new Date(aggregate.periodStartMs).toISOString(),
    periodEnd: new Date(aggregate.periodEndMs).toISOString(),
    lastUpdated: new Date(aggregate.lastUpdatedMs).toISOString(),
  };
}

function mergeArtifactId(existing: string | null, incoming: string | null | undefined): string | null {
  const next = incoming ? String(incoming).trim() : "";
  if (!next) return existing;
  if (!existing) return next;
  return existing === next ? existing : null;
}

export function incrementRuntimeUsage(siteId: string | null | undefined, increment: RuntimeUsageIncrement): void {
  const normalizedSiteId = normalizeSiteId(siteId);
  if (!normalizedSiteId) return;

  const atMs = toTimestamp(increment.at);
  const requestCount = toFiniteNonNegativeInteger(increment.requestCount, 0);
  const bandwidthBytes = toFiniteNonNegativeInteger(increment.bandwidthBytes, 0);
  const computeMs = toFiniteNonNegativeInteger(increment.computeMs, 0);

  const existing = usageBySiteId.get(normalizedSiteId);
  if (!existing) {
    usageBySiteId.set(normalizedSiteId, {
      siteId: normalizedSiteId,
      artifactId: mergeArtifactId(null, increment.artifactId),
      requestCount,
      bandwidthBytes,
      computeMs,
      periodStartMs: atMs,
      periodEndMs: atMs,
      lastUpdatedMs: atMs,
    });
    return;
  }

  existing.artifactId = mergeArtifactId(existing.artifactId, increment.artifactId);
  existing.requestCount += requestCount;
  existing.bandwidthBytes += bandwidthBytes;
  existing.computeMs += computeMs;
  if (atMs < existing.periodStartMs) existing.periodStartMs = atMs;
  if (atMs > existing.periodEndMs) existing.periodEndMs = atMs;
  existing.lastUpdatedMs = atMs;
}

export function drainRuntimeUsageAggregates(): RuntimeUsageAggregate[] {
  if (usageBySiteId.size === 0) return [];

  const snapshot = [...usageBySiteId.values()].map(toAggregateSnapshot);
  usageBySiteId.clear();
  return snapshot;
}

export function requeueRuntimeUsageAggregates(aggregates: RuntimeUsageAggregate[]): void {
  for (const aggregate of aggregates) {
    incrementRuntimeUsage(aggregate.siteId, {
      artifactId: aggregate.artifactId,
      requestCount: aggregate.requestCount,
      bandwidthBytes: aggregate.bandwidthBytes,
      computeMs: aggregate.computeMs,
      at: new Date(aggregate.periodStart),
    });
    const existing = usageBySiteId.get(aggregate.siteId);
    if (!existing) continue;
    const periodEndMs = new Date(aggregate.periodEnd).getTime();
    if (Number.isFinite(periodEndMs) && periodEndMs > existing.periodEndMs) {
      existing.periodEndMs = periodEndMs;
      existing.lastUpdatedMs = periodEndMs;
    }
  }
}

export function getRuntimeUsageAggregateSnapshot(): RuntimeUsageAggregate[] {
  return [...usageBySiteId.values()].map(toAggregateSnapshot);
}

export function __resetRuntimeUsageCollectorForTest(): void {
  usageBySiteId.clear();
}
