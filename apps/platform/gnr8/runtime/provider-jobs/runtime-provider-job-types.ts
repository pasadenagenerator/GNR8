export type RuntimeProviderJobStatus = "queued" | "running" | "completed" | "failed" | "blocked";

export type RuntimeProviderJobEnvironment = "contract" | "sandbox" | "live";

export type RuntimeProviderJobOperationKind =
  | "check_domain_availability"
  | "purchase_domain"
  | "create_dns_zone"
  | "upsert_dns_record"
  | "verify_dns_record"
  | "activate_domain_binding"
  | "manual_instruction";

export type RuntimeProviderJob = {
  id: string;
  siteId: string;
  siteVersionId?: string;
  providerId: string;
  environment: RuntimeProviderJobEnvironment;
  operationKind: RuntimeProviderJobOperationKind;
  status: RuntimeProviderJobStatus;
  intentPayload: Record<string, unknown>;
  dryRunPayload?: Record<string, unknown>;
  resultPayload?: Record<string, unknown>;
  errorPayload?: Record<string, unknown>;
  correlationKey: string;
  createdAt: string;
  updatedAt: string;
};
