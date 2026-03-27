export type CostCenterHierarchy = {
  agencyCostCenterId: string | null;
  clientCostCenterId: string | null;
  siteCostCenterId: string | null;
};

export type ResolvedBillingAttribution = {
  billingAccountId: string | null;
  agencyId: string;
  clientId: string | null;
  siteId: string | null;
  costCenterIds: CostCenterHierarchy;
};

export type LoggedCostEventResult = {
  id: string;
  createdAt: string;
  attribution: ResolvedBillingAttribution;
};

export type AIUsageEventInput = {
  operationType: string;
  featureContext: string;
  agencyId?: string | null;
  clientId?: string | null;
  siteId?: string | null;
  siteVersionId?: string | null;
  artifactId?: string | null;
  modelProvider?: string | null;
  modelName?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  traceId?: string | null;
};

export type RuntimeUsageEventInput = {
  siteId: string;
  artifactId?: string | null;
  requestCount?: number;
  bandwidthBytes?: number;
  computeMs?: number;
  estimatedCost?: number;
  periodStart: string | Date;
  periodEnd: string | Date;
};

export type MigrationCostEventInput = {
  agencyId: string;
  siteId?: string | null;
  migrationJobId?: string | null;
  costType: string;
  computeUnits?: number;
  estimatedCost?: number;
};
