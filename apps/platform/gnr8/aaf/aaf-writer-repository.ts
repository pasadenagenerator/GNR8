import "server-only";

import { randomUUID } from "node:crypto";

import type {
  AafApprovalScope,
  AafApprovalStatus,
  AafAuditEventFamily,
  AafAuditSeverity,
  AafEvidencePackageType,
  AafGateResult,
  AafPolicyEvaluationResult,
  AafPrivacyLabel,
  AafRedactionLabel,
  AafReplayClass,
  AafRetentionClass,
} from "@gnr8/runtime-contracts";
import {
  AAF_APPROVAL_SCOPES,
  AAF_APPROVAL_STATUSES,
  AAF_AUDIT_EVENT_FAMILIES,
  AAF_AUDIT_SEVERITIES,
  AAF_EVIDENCE_PACKAGE_TYPES,
  AAF_GATE_RESULTS,
  AAF_POLICY_EVALUATION_RESULTS,
  AAF_PRIVACY_LABELS,
  AAF_REDACTION_LABELS,
  AAF_REPLAY_CLASSES,
  AAF_RETENTION_CLASSES,
} from "@gnr8/runtime-contracts";
import type { Pool, PoolClient } from "pg";

import { getSuperadminPool } from "../../src/superadmin/db";

export type AafActorType = "human" | "system" | "provider" | "external_reference" | "ai_advisory";
export type AafApprovalDecisionStatus = Exclude<AafApprovalStatus, "requested">;
export type AafApprovalPolicyStatus = "draft" | "active" | "superseded" | "retired";
export type AafEvidencePackageStatus = "created" | "verified" | "redacted" | "superseded" | "invalid";
export type AafEvidenceFreshnessResult = "fresh" | "stale" | "failed" | "partial_timeline";
export type AafPartialTimelineStatus = "open" | "reconciled" | "compensating_recorded";

export type AafJsonObject = Record<string, unknown>;
export type AafJsonArray = readonly unknown[];

export type AafTenantScopeInput = {
  tenantId: string;
  clientId?: string | null;
  siteId?: string | null;
  batchId?: string | null;
  jobId?: string | null;
  siteVersionId?: string | null;
  domainId?: string | null;
  costCenterId?: string | null;
};

export type AafCorrelationInput = {
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
};

export type AafStorageLabelInput = {
  privacyLabel?: AafPrivacyLabel;
  redactionLabel?: AafRedactionLabel;
  retentionClass?: AafRetentionClass;
};

export type AafRecord = {
  id: string;
  [key: string]: unknown;
};

export type AafPgClient = {
  query(sql: string, values?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
};

export class AafWriterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AafWriterError";
  }
}

export class AafWriterTx {
  readonly _tag = "aaf_writer_tx" as const;

  constructor(readonly client: AafPgClient) {}
}

export type CreateApprovalPolicyInput = {
  policyKey: string;
  version: string;
  status?: AafApprovalPolicyStatus;
  definitionJson?: AafJsonObject;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  supersedesPolicyId?: string | null;
  createdBy: string;
  notes?: string | null;
};

export type CreateApprovalScopeDefinitionInput = {
  scope: AafApprovalScope;
  policyKey: string;
  policyVersion: string;
  subjectType: string;
  allowedAction: string;
  prohibitedActions?: AafJsonArray;
  requiredEvidenceType: AafEvidencePackageType;
  requesterRoles?: AafJsonArray;
  approverRoles?: AafJsonArray;
  freshnessRule?: AafJsonObject;
  separationOfDutyRule?: AafJsonObject | null;
  retentionClass?: AafRetentionClass;
  privacyLabel?: AafPrivacyLabel;
  notes?: string | null;
};

export type CreateApprovalRequestInput = AafTenantScopeInput &
  AafCorrelationInput & {
    scope: AafApprovalScope;
    subjectType: string;
    subjectId: string;
    requesterActorType: AafActorType;
    requesterActorId: string;
    requesterRole: string;
    status?: "requested" | "not_required_by_policy" | "cancelled";
    policyId?: string | null;
    policyVersion: string;
    requestedExpiresAt?: string | null;
    reason?: string | null;
    opsInboxItemId?: string | null;
    privacyLabel?: AafPrivacyLabel;
    retentionClass?: AafRetentionClass;
  };

export type CreateApprovalDecisionInput = AafCorrelationInput &
  AafStorageLabelInput & {
    id?: string;
    approvalRequestId: string;
    status: AafApprovalDecisionStatus;
    decisionActorType: AafActorType;
    decisionActorId: string;
    decisionActorRole: string;
    decidedAt?: string | null;
    policyVersion: string;
    evidencePackageId?: string | null;
    policyEvaluationId?: string | null;
    auditEventId?: string | null;
    reason?: string | null;
    expiresAt?: string | null;
    freshnessLabel?: string | null;
    separationOfDutyResult?: string | null;
    emergencyPolicyRef?: string | null;
  };

export type CreateApprovalSubjectRefInput = AafTenantScopeInput & {
  approvalRequestId?: string | null;
  approvalDecisionId?: string | null;
  policyEvaluationId?: string | null;
  evidencePackageId?: string | null;
  gateAttemptId?: string | null;
  subjectType: string;
  subjectId: string;
  sourceSystem?: string;
  sourceTable: string;
  sourceRecordId: string;
  sourceVersion?: string | null;
  sourceWatermark: string;
  metadataJson?: AafJsonObject;
  correlationId: string;
};

export type CreateApprovalEvidenceLinkInput = {
  approvalRequestId: string;
  approvalDecisionId?: string | null;
  policyEvaluationId?: string | null;
  evidencePackageId: string;
  linkRole: string;
  sourceNote?: string | null;
  correlationId: string;
  idempotencyKey: string;
};

export type CreateApprovalPolicyEvaluationInput = AafTenantScopeInput &
  AafCorrelationInput & {
    policyId?: string | null;
    policyVersion: string;
    result: AafPolicyEvaluationResult;
    scope: AafApprovalScope;
    actionKey: string;
    subjectType: string;
    subjectId: string;
    actorType: AafActorType;
    actorId: string;
    actorRole: string;
    approvalRequestId?: string | null;
    approvalDecisionId?: string | null;
    evidencePackageId?: string | null;
    blockerCodes?: AafJsonArray;
    staleReason?: string | null;
    emergencyReason?: string | null;
    notRequiredReason?: string | null;
    auditEventId?: string | null;
    evaluatedAt?: string | null;
    privacyLabel?: AafPrivacyLabel;
    retentionClass?: AafRetentionClass;
  };

export type CreateApprovalRevocationInput = {
  approvalDecisionId: string;
  revokedByActorType: AafActorType;
  revokedByActorId: string;
  revokedByRole: string;
  revokedAt?: string | null;
  reason: string;
  auditEventId: string;
  incidentRef?: string | null;
  replacementRequestId?: string | null;
  correlationId: string;
  idempotencyKey: string;
};

export type CreateApprovalSupersessionLinkInput = {
  supersededApprovalRequestId: string;
  supersedingApprovalRequestId: string;
  supersededDecisionId?: string | null;
  supersedingDecisionId?: string | null;
  reason: string;
  createdByActorType: AafActorType;
  createdByActorId: string;
  auditEventId?: string | null;
  sourceRefId?: string | null;
  correlationId: string;
  idempotencyKey: string;
};

export type CreateAuditEventInput = AafTenantScopeInput &
  AafCorrelationInput &
  AafStorageLabelInput & {
    id?: string;
    eventName: string;
    eventFamily: AafAuditEventFamily;
    severity: AafAuditSeverity;
    replayClass: AafReplayClass;
    actorType: AafActorType;
    actorId: string;
    actorRole: string;
    subjectType: string;
    subjectId: string;
    subjectVersion?: string | null;
    sourceSystem?: string;
    sourceRoute?: string | null;
    sourceRefJson?: AafJsonObject;
    approvalRequestId?: string | null;
    approvalDecisionId?: string | null;
    policyEvaluationId?: string | null;
    evidencePackageId?: string | null;
    originalAuditEventId?: string | null;
    beforeRefJson?: AafJsonObject;
    afterRefJson?: AafJsonObject;
    payloadJson?: AafJsonObject;
    schemaVersion?: number;
  };

export type CreateAuditEventRefInput = {
  auditEventId: string;
  refRole: string;
  refType: string;
  refId: string;
  refVersion?: string | null;
  sourceSystem?: string;
  sourceTable?: string | null;
  sourceWatermark?: string | null;
  metadataJson?: AafJsonObject;
};

export type CreateAuditPartialTimelineMarkerInput = AafTenantScopeInput & {
  subjectType: string;
  subjectId: string;
  correlationId: string;
  firstObservedAuditEventId?: string | null;
  missingEventName: string;
  failureReason: string;
  status?: AafPartialTimelineStatus;
  auditEventId?: string | null;
  createdByActorType: AafActorType;
  createdByActorId: string;
  reconciledAt?: string | null;
};

export type CreateEvidencePackageInput = AafTenantScopeInput &
  AafCorrelationInput & {
    packageType: AafEvidencePackageType;
    subjectType: string;
    subjectId: string;
    packageVersion?: number;
    status?: AafEvidencePackageStatus;
    createdByActorType: AafActorType;
    createdByActorId: string;
    sourceWatermark: string;
    freshnessLabel: string;
    expiresAt?: string | null;
    contentHash: string;
    supersedesPackageId?: string | null;
    redactedPackageId?: string | null;
    limitationsJson?: AafJsonObject;
    privacyLabel?: AafPrivacyLabel;
    redactionLabel?: AafRedactionLabel;
    retentionClass?: AafRetentionClass;
  };

export type CreateEvidencePackageItemInput = AafStorageLabelInput & {
  evidencePackageId: string;
  itemType: string;
  itemRef: string;
  itemHash: string;
  mediaType: string;
  sizeBytes?: number;
  storageBucket?: string | null;
  storageKey?: string | null;
  sourceTable?: string | null;
  sourceRecordId?: string | null;
  displayName?: string | null;
  limitationsJson?: AafJsonObject;
};

export type CreateEvidencePackageSourceRefInput = {
  evidencePackageId: string;
  sourceSystem?: string;
  sourceTable: string;
  sourceRecordId: string;
  sourceVersion?: string | null;
  sourceWatermark: string;
  capturedAt?: string | null;
  hash: string;
  queryRef?: string | null;
  snapshotRef?: string | null;
  metadataJson?: AafJsonObject;
};

export type CreateEvidencePackageFreshnessCheckInput = {
  evidencePackageId: string;
  policyVersion: string;
  result: AafEvidenceFreshnessResult;
  checkedAt?: string | null;
  checkedByActorType: AafActorType;
  checkedByActorId: string;
  staleReason?: string | null;
  expiresAt?: string | null;
  currentSourceWatermark?: string | null;
  auditEventId?: string | null;
  correlationId: string;
  idempotencyKey: string;
};

export type CreateEvidencePackageAuditLinkInput = {
  evidencePackageId: string;
  evidencePackageItemId?: string | null;
  auditEventId: string;
  approvalRequestId?: string | null;
  approvalDecisionId?: string | null;
  policyEvaluationId?: string | null;
  linkRole: string;
};

export type CreateEvidencePackageSupersessionLinkInput = {
  supersededPackageId: string;
  supersedingPackageId: string;
  reason: string;
  createdByActorType: AafActorType;
  createdByActorId: string;
  auditEventId?: string | null;
  sourceRefId?: string | null;
  policyEvaluationId?: string | null;
  correlationId: string;
  idempotencyKey: string;
};

export type CreateActionGateAttemptInput = AafTenantScopeInput &
  AafCorrelationInput & {
    actionKey: string;
    scope: AafApprovalScope;
    subjectType: string;
    subjectId: string;
    actorType: AafActorType;
    actorId: string;
    actorRole: string;
    policyEvaluationId?: string | null;
    evidencePackageId?: string | null;
    approvalRequestId?: string | null;
    approvalDecisionId?: string | null;
    preActionAuditEventId?: string | null;
    outcomeAuditEventId?: string | null;
    gateResult: AafGateResult;
    failClosedReason?: string | null;
    startedAt?: string | null;
    completedAt?: string | null;
  };

export type ApprovalRequestTransactionInput = {
  approvalRequest: CreateApprovalRequestInput;
  subjectRefs?: Array<Omit<CreateApprovalSubjectRefInput, keyof AafTenantScopeInput | "approvalRequestId" | "correlationId">>;
  evidenceLink?: Omit<CreateApprovalEvidenceLinkInput, "approvalRequestId" | "correlationId">;
  policyEvaluation: Omit<
    CreateApprovalPolicyEvaluationInput,
    keyof AafTenantScopeInput | "approvalRequestId" | "correlationId" | "causationId" | "requestId"
  > &
    Partial<Pick<AafTenantScopeInput, keyof AafTenantScopeInput>> &
    Partial<Pick<AafCorrelationInput, "causationId" | "requestId">>;
  requestedAuditEvent: Omit<
    CreateAuditEventInput,
    keyof AafTenantScopeInput | "approvalRequestId" | "policyEvaluationId" | "evidencePackageId" | "correlationId" | "causationId" | "requestId"
  > &
    Partial<Pick<AafTenantScopeInput, keyof AafTenantScopeInput>> &
    Partial<Pick<AafCorrelationInput, "causationId" | "requestId">>;
};

export type ApprovalRequestTransactionResult = {
  approvalRequest: AafRecord;
  subjectRefs: AafRecord[];
  evidenceLink: AafRecord | null;
  policyEvaluation: AafRecord;
  auditEvent: AafRecord;
};

export type ApprovalDecisionTransactionInput = {
  approvalDecision: CreateApprovalDecisionInput;
  evidenceLink?: Omit<CreateApprovalEvidenceLinkInput, "approvalRequestId" | "approvalDecisionId" | "correlationId">;
  decisionAuditEvent: Omit<
    CreateAuditEventInput,
    "id" | "approvalRequestId" | "approvalDecisionId" | "policyEvaluationId" | "evidencePackageId" | "correlationId" | "causationId" | "requestId"
  > &
    Partial<Pick<CreateAuditEventInput, "policyEvaluationId" | "evidencePackageId" | "causationId" | "requestId">>;
  auditRefs?: Omit<CreateAuditEventRefInput, "auditEventId">[];
};

export type ApprovalDecisionTransactionResult = {
  approvalDecision: AafRecord;
  evidenceLink: AafRecord | null;
  auditEvent: AafRecord;
  auditRefs: AafRecord[];
};

export type EvidencePackageTransactionInput = {
  evidencePackage: CreateEvidencePackageInput;
  sourceRefs?: Omit<CreateEvidencePackageSourceRefInput, "evidencePackageId">[];
  items?: Omit<CreateEvidencePackageItemInput, "evidencePackageId">[];
  freshnessCheck?: Omit<CreateEvidencePackageFreshnessCheckInput, "evidencePackageId" | "correlationId">;
  auditLink?: Omit<CreateEvidencePackageAuditLinkInput, "evidencePackageId">;
};

export type EvidencePackageTransactionResult = {
  evidencePackage: AafRecord;
  sourceRefs: AafRecord[];
  items: AafRecord[];
  freshnessCheck: AafRecord | null;
  auditLink: AafRecord | null;
};

export type GateAttemptTransactionInput = {
  policyEvaluation?: CreateApprovalPolicyEvaluationInput;
  preActionAuditEvent?: CreateAuditEventInput;
  gateAttempt: Omit<CreateActionGateAttemptInput, "policyEvaluationId" | "preActionAuditEventId"> &
    Partial<Pick<CreateActionGateAttemptInput, "policyEvaluationId" | "preActionAuditEventId">>;
};

export type GateAttemptTransactionResult = {
  policyEvaluation: AafRecord | null;
  preActionAuditEvent: AafRecord | null;
  gateAttempt: AafRecord;
};

export interface AafWriterOperations {
  createApprovalPolicy(tx: AafWriterTx, input: CreateApprovalPolicyInput): Promise<AafRecord>;
  createApprovalScopeDefinition(tx: AafWriterTx, input: CreateApprovalScopeDefinitionInput): Promise<AafRecord>;
  createApprovalRequest(tx: AafWriterTx, input: CreateApprovalRequestInput): Promise<AafRecord>;
  createApprovalSubjectRef(tx: AafWriterTx, input: CreateApprovalSubjectRefInput): Promise<AafRecord>;
  createApprovalEvidenceLink(tx: AafWriterTx, input: CreateApprovalEvidenceLinkInput): Promise<AafRecord>;
  createApprovalPolicyEvaluation(tx: AafWriterTx, input: CreateApprovalPolicyEvaluationInput): Promise<AafRecord>;
  createApprovalDecision(tx: AafWriterTx, input: CreateApprovalDecisionInput): Promise<AafRecord>;
  createApprovalRevocation(tx: AafWriterTx, input: CreateApprovalRevocationInput): Promise<AafRecord>;
  createApprovalSupersessionLink(tx: AafWriterTx, input: CreateApprovalSupersessionLinkInput): Promise<AafRecord>;
  createAuditEvent(tx: AafWriterTx, input: CreateAuditEventInput): Promise<AafRecord>;
  createAuditEventRef(tx: AafWriterTx, input: CreateAuditEventRefInput): Promise<AafRecord>;
  createAuditPartialTimelineMarker(tx: AafWriterTx, input: CreateAuditPartialTimelineMarkerInput): Promise<AafRecord>;
  createEvidencePackage(tx: AafWriterTx, input: CreateEvidencePackageInput): Promise<AafRecord>;
  createEvidencePackageItem(tx: AafWriterTx, input: CreateEvidencePackageItemInput): Promise<AafRecord>;
  createEvidencePackageSourceRef(tx: AafWriterTx, input: CreateEvidencePackageSourceRefInput): Promise<AafRecord>;
  createEvidencePackageFreshnessCheck(tx: AafWriterTx, input: CreateEvidencePackageFreshnessCheckInput): Promise<AafRecord>;
  createEvidencePackageAuditLink(tx: AafWriterTx, input: CreateEvidencePackageAuditLinkInput): Promise<AafRecord>;
  createEvidencePackageSupersessionLink(tx: AafWriterTx, input: CreateEvidencePackageSupersessionLinkInput): Promise<AafRecord>;
  createActionGateAttempt(tx: AafWriterTx, input: CreateActionGateAttemptInput): Promise<AafRecord>;
}

type InsertableRow = Record<string, unknown>;

const ACTOR_TYPES = ["human", "system", "provider", "external_reference", "ai_advisory"] as const;
const APPROVAL_DECISION_STATUSES = AAF_APPROVAL_STATUSES.filter(
  (status): status is AafApprovalDecisionStatus => status !== "requested",
);
const APPROVAL_REQUEST_STATUSES = ["requested", "not_required_by_policy", "cancelled"] as const;
const APPROVAL_POLICY_STATUSES = ["draft", "active", "superseded", "retired"] as const;
const EVIDENCE_PACKAGE_STATUSES = ["created", "verified", "redacted", "superseded", "invalid"] as const;
const EVIDENCE_FRESHNESS_RESULTS = ["fresh", "stale", "failed", "partial_timeline"] as const;
const PARTIAL_TIMELINE_STATUSES = ["open", "reconciled", "compensating_recorded"] as const;

const TABLES = {
  approvalPolicies: "gnr8_aaf_approval_policies",
  approvalScopeDefinitions: "gnr8_aaf_approval_scope_definitions",
  approvalRequests: "gnr8_aaf_approval_requests",
  approvalDecisions: "gnr8_aaf_approval_decisions",
  approvalEvidenceLinks: "gnr8_aaf_approval_evidence_links",
  approvalSubjectRefs: "gnr8_aaf_approval_subject_refs",
  approvalPolicyEvaluations: "gnr8_aaf_approval_policy_evaluations",
  approvalRevocations: "gnr8_aaf_approval_revocations",
  approvalSupersessionLinks: "gnr8_aaf_approval_supersession_links",
  auditEvents: "gnr8_aaf_audit_events",
  auditEventRefs: "gnr8_aaf_audit_event_refs",
  auditPartialTimelineMarkers: "gnr8_aaf_audit_partial_timeline_markers",
  evidencePackages: "gnr8_aaf_evidence_packages",
  evidencePackageItems: "gnr8_aaf_evidence_package_items",
  evidencePackageSourceRefs: "gnr8_aaf_evidence_package_source_refs",
  evidencePackageFreshnessChecks: "gnr8_aaf_evidence_package_freshness_checks",
  evidencePackageAuditLinks: "gnr8_aaf_evidence_package_audit_links",
  evidencePackageSupersession: "gnr8_aaf_evidence_package_supersession",
  actionGateAttempts: "gnr8_aaf_action_gate_attempts",
} as const;

function optionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function optionalDefaultText(value: string | null | undefined): string | undefined {
  return optionalText(value) ?? undefined;
}

function requiredText(name: string, value: string | null | undefined): string {
  const text = optionalText(value);
  if (!text) throw new AafWriterError(`${name} is required`);
  return text;
}

function optionalPositiveInteger(name: string, value: number | null | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 1) {
    throw new AafWriterError(`${name} must be a positive integer`);
  }
  return numberValue;
}

function optionalNonNegativeInteger(name: string, value: number | null | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new AafWriterError(`${name} must be a non-negative integer`);
  }
  return numberValue;
}

function jsonObject(name: string, value: AafJsonObject | null | undefined): AafJsonObject {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new AafWriterError(`${name} must be a JSON object`);
  }
  return value;
}

function jsonArray(name: string, value: AafJsonArray | null | undefined): AafJsonArray {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new AafWriterError(`${name} must be a JSON array`);
  }
  return value;
}

function enumValue<T extends string>(name: string, value: string, allowed: readonly T[]): T {
  if (!allowed.includes(value as T)) {
    throw new AafWriterError(`${name} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function scopeColumns(input: Partial<AafTenantScopeInput>): InsertableRow {
  return {
    tenant_id: input.tenantId !== undefined ? requiredText("tenantId", input.tenantId) : undefined,
    client_id: optionalText(input.clientId),
    site_id: optionalText(input.siteId),
    batch_id: optionalText(input.batchId),
    job_id: optionalText(input.jobId),
    site_version_id: optionalText(input.siteVersionId),
    domain_id: optionalText(input.domainId),
    cost_center_id: optionalText(input.costCenterId),
  };
}

function correlationColumns(input: AafCorrelationInput): InsertableRow {
  return {
    correlation_id: requiredText("correlationId", input.correlationId),
    causation_id: optionalText(input.causationId),
    idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
    request_id: optionalText(input.requestId),
  };
}

function labelColumns(input: AafStorageLabelInput): InsertableRow {
  return {
    privacy_label: enumValue("privacyLabel", input.privacyLabel ?? "internal_operational", AAF_PRIVACY_LABELS),
    redaction_label: enumValue("redactionLabel", input.redactionLabel ?? "none", AAF_REDACTION_LABELS),
    retention_class: enumValue("retentionClass", input.retentionClass ?? "compliance_long", AAF_RETENTION_CLASSES),
  };
}

function compactRow(row: InsertableRow): InsertableRow {
  const compacted: InsertableRow = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) compacted[key] = value;
  }
  return compacted;
}

function toPostgresValue(value: unknown): unknown {
  if (value !== null && typeof value === "object") {
    return JSON.stringify(value);
  }
  return value;
}

function mapRecord(row: Record<string, unknown>): AafRecord {
  const id = requiredText("id", row.id as string | undefined);
  return { ...row, id };
}

function buildWhereClause(where: InsertableRow, startAt = 1): { sql: string; values: unknown[] } {
  const values: unknown[] = [];
  const parts = Object.entries(where).map(([column, value], index) => {
    values.push(value);
    return `${column} is not distinct from $${startAt + index}`;
  });
  return { sql: parts.join(" and "), values };
}

async function insertReturning(
  client: AafPgClient,
  tableName: string,
  row: InsertableRow,
  options?: { conflictClause?: string; lookup?: InsertableRow },
): Promise<AafRecord> {
  const payload = compactRow(row);
  const columns = Object.keys(payload);
  if (columns.length === 0) throw new AafWriterError(`cannot insert empty AAF row into ${tableName}`);

  const values = columns.map((column) => toPostgresValue(payload[column]));
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const conflictClause = options?.conflictClause ? ` ${options.conflictClause}` : "";
  const result = await client.query(
    `insert into public.${tableName} (${columns.join(", ")})
     values (${placeholders.join(", ")})
     ${conflictClause}
     returning *`,
    values,
  );

  const inserted = result.rows[0];
  if (inserted) return mapRecord(inserted);

  if (!options?.lookup) {
    throw new AafWriterError(`AAF insert into ${tableName} did not return a row`);
  }

  const lookup = buildWhereClause(compactRow(options.lookup));
  const existing = await client.query(
    `select *
     from public.${tableName}
     where ${lookup.sql}
     order by created_at asc
     limit 1`,
    lookup.values,
  );

  const rowMatch = existing.rows[0];
  if (!rowMatch) throw new AafWriterError(`AAF idempotent insert into ${tableName} did not find an existing row`);
  return mapRecord(rowMatch);
}

function idempotencyLookup(idempotencyKey: string): InsertableRow {
  return { idempotency_key: requiredText("idempotencyKey", idempotencyKey) };
}

function approvalRequestIdempotencyLookup(input: CreateApprovalRequestInput): InsertableRow {
  return {
    tenant_id: requiredText("tenantId", input.tenantId),
    scope: enumValue("scope", input.scope, AAF_APPROVAL_SCOPES),
    subject_type: requiredText("subjectType", input.subjectType),
    subject_id: requiredText("subjectId", input.subjectId),
    policy_version: requiredText("policyVersion", input.policyVersion),
    idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
  };
}

function generateUuid(): string {
  return randomUUID();
}

export async function writeApprovalRequestTransaction(
  writer: AafWriterOperations,
  tx: AafWriterTx,
  input: ApprovalRequestTransactionInput,
): Promise<ApprovalRequestTransactionResult> {
  const approvalRequest = await writer.createApprovalRequest(tx, input.approvalRequest);
  const subjectRefs = [];

  for (const subjectRef of input.subjectRefs ?? []) {
    subjectRefs.push(
      await writer.createApprovalSubjectRef(tx, {
        ...input.approvalRequest,
        ...subjectRef,
        approvalRequestId: approvalRequest.id,
        correlationId: input.approvalRequest.correlationId,
      }),
    );
  }

  const evidenceLink = input.evidenceLink
    ? await writer.createApprovalEvidenceLink(tx, {
        ...input.evidenceLink,
        approvalRequestId: approvalRequest.id,
        correlationId: input.approvalRequest.correlationId,
      })
    : null;

  const policyEvaluation = await writer.createApprovalPolicyEvaluation(tx, {
    ...input.approvalRequest,
    ...input.policyEvaluation,
    approvalRequestId: approvalRequest.id,
    correlationId: input.approvalRequest.correlationId,
    causationId: input.policyEvaluation.causationId ?? input.approvalRequest.causationId ?? null,
    requestId: input.policyEvaluation.requestId ?? input.approvalRequest.requestId ?? null,
  });

  const auditEvent = await writer.createAuditEvent(tx, {
    ...input.approvalRequest,
    ...input.requestedAuditEvent,
    approvalRequestId: approvalRequest.id,
    policyEvaluationId: policyEvaluation.id,
    evidencePackageId: input.evidenceLink?.evidencePackageId ?? null,
    correlationId: input.approvalRequest.correlationId,
    causationId: input.requestedAuditEvent.causationId ?? policyEvaluation.id,
    requestId: input.requestedAuditEvent.requestId ?? input.approvalRequest.requestId ?? null,
  });

  return { approvalRequest, subjectRefs, evidenceLink, policyEvaluation, auditEvent };
}

export async function writeApprovalDecisionTransaction(
  writer: AafWriterOperations,
  tx: AafWriterTx,
  input: ApprovalDecisionTransactionInput,
): Promise<ApprovalDecisionTransactionResult> {
  const auditEventId = input.approvalDecision.auditEventId ?? generateUuid();
  const approvalDecision = await writer.createApprovalDecision(tx, {
    ...input.approvalDecision,
    auditEventId,
  });

  const auditEvent = await writer.createAuditEvent(tx, {
    ...input.decisionAuditEvent,
    id: auditEventId,
    approvalRequestId: input.approvalDecision.approvalRequestId,
    approvalDecisionId: approvalDecision.id,
    policyEvaluationId: input.decisionAuditEvent.policyEvaluationId ?? input.approvalDecision.policyEvaluationId ?? null,
    evidencePackageId: input.decisionAuditEvent.evidencePackageId ?? input.approvalDecision.evidencePackageId ?? null,
    correlationId: input.approvalDecision.correlationId,
    causationId: input.decisionAuditEvent.causationId ?? input.approvalDecision.causationId ?? null,
    requestId: input.decisionAuditEvent.requestId ?? input.approvalDecision.requestId ?? null,
  });

  const evidenceLink = input.evidenceLink
    ? await writer.createApprovalEvidenceLink(tx, {
        ...input.evidenceLink,
        approvalRequestId: input.approvalDecision.approvalRequestId,
        approvalDecisionId: approvalDecision.id,
        correlationId: input.approvalDecision.correlationId,
      })
    : null;

  const auditRefs = [];
  for (const auditRef of input.auditRefs ?? []) {
    auditRefs.push(await writer.createAuditEventRef(tx, { ...auditRef, auditEventId: auditEvent.id }));
  }

  return { approvalDecision, evidenceLink, auditEvent, auditRefs };
}

export async function writeEvidencePackageTransaction(
  writer: AafWriterOperations,
  tx: AafWriterTx,
  input: EvidencePackageTransactionInput,
): Promise<EvidencePackageTransactionResult> {
  const evidencePackage = await writer.createEvidencePackage(tx, input.evidencePackage);
  const sourceRefs = [];
  const items = [];

  for (const sourceRef of input.sourceRefs ?? []) {
    sourceRefs.push(await writer.createEvidencePackageSourceRef(tx, { ...sourceRef, evidencePackageId: evidencePackage.id }));
  }

  for (const item of input.items ?? []) {
    items.push(await writer.createEvidencePackageItem(tx, { ...item, evidencePackageId: evidencePackage.id }));
  }

  const freshnessCheck = input.freshnessCheck
    ? await writer.createEvidencePackageFreshnessCheck(tx, {
        ...input.freshnessCheck,
        evidencePackageId: evidencePackage.id,
        correlationId: input.evidencePackage.correlationId,
      })
    : null;

  const auditLink = input.auditLink
    ? await writer.createEvidencePackageAuditLink(tx, {
        ...input.auditLink,
        evidencePackageId: evidencePackage.id,
      })
    : null;

  return { evidencePackage, sourceRefs, items, freshnessCheck, auditLink };
}

export async function writeGateAttemptTransaction(
  writer: AafWriterOperations,
  tx: AafWriterTx,
  input: GateAttemptTransactionInput,
): Promise<GateAttemptTransactionResult> {
  const policyEvaluation = input.policyEvaluation
    ? await writer.createApprovalPolicyEvaluation(tx, input.policyEvaluation)
    : null;
  const preActionAuditEvent = input.preActionAuditEvent ? await writer.createAuditEvent(tx, input.preActionAuditEvent) : null;

  const gateAttempt = await writer.createActionGateAttempt(tx, {
    ...input.gateAttempt,
    policyEvaluationId: input.gateAttempt.policyEvaluationId ?? policyEvaluation?.id ?? null,
    preActionAuditEventId: input.gateAttempt.preActionAuditEventId ?? preActionAuditEvent?.id ?? null,
  });

  return { policyEvaluation, preActionAuditEvent, gateAttempt };
}

export class AafWriterRepository implements AafWriterOperations {
  constructor(private readonly pool: Pick<Pool, "connect"> = getSuperadminPool()) {}

  async withTransaction<T>(fn: (tx: AafWriterTx) => Promise<T>): Promise<T> {
    const client = (await this.pool.connect()) as PoolClient;
    try {
      await client.query("begin");
      const tx = new AafWriterTx(client);
      const result = await fn(tx);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  createApprovalRequestTransaction(input: ApprovalRequestTransactionInput): Promise<ApprovalRequestTransactionResult> {
    return this.withTransaction((tx) => writeApprovalRequestTransaction(this, tx, input));
  }

  createApprovalDecisionTransaction(input: ApprovalDecisionTransactionInput): Promise<ApprovalDecisionTransactionResult> {
    return this.withTransaction((tx) => writeApprovalDecisionTransaction(this, tx, input));
  }

  createEvidencePackageTransaction(input: EvidencePackageTransactionInput): Promise<EvidencePackageTransactionResult> {
    return this.withTransaction((tx) => writeEvidencePackageTransaction(this, tx, input));
  }

  createGateAttemptTransaction(input: GateAttemptTransactionInput): Promise<GateAttemptTransactionResult> {
    return this.withTransaction((tx) => writeGateAttemptTransaction(this, tx, input));
  }

  createApprovalPolicy(tx: AafWriterTx, input: CreateApprovalPolicyInput): Promise<AafRecord> {
    const row = {
      policy_key: requiredText("policyKey", input.policyKey),
      version: requiredText("version", input.version),
      status: enumValue("status", input.status ?? "draft", APPROVAL_POLICY_STATUSES),
      definition_json: jsonObject("definitionJson", input.definitionJson),
      effective_from: optionalDefaultText(input.effectiveFrom),
      effective_until: optionalText(input.effectiveUntil),
      supersedes_policy_id: optionalText(input.supersedesPolicyId),
      created_by: requiredText("createdBy", input.createdBy),
      notes: optionalText(input.notes),
    };
    return insertReturning(tx.client, TABLES.approvalPolicies, row, {
      conflictClause: "on conflict (policy_key, version) do nothing",
      lookup: { policy_key: row.policy_key, version: row.version },
    });
  }

  createApprovalScopeDefinition(tx: AafWriterTx, input: CreateApprovalScopeDefinitionInput): Promise<AafRecord> {
    const row = {
      scope: enumValue("scope", input.scope, AAF_APPROVAL_SCOPES),
      policy_key: requiredText("policyKey", input.policyKey),
      policy_version: requiredText("policyVersion", input.policyVersion),
      subject_type: requiredText("subjectType", input.subjectType),
      allowed_action: requiredText("allowedAction", input.allowedAction),
      prohibited_actions: jsonArray("prohibitedActions", input.prohibitedActions),
      required_evidence_type: enumValue("requiredEvidenceType", input.requiredEvidenceType, AAF_EVIDENCE_PACKAGE_TYPES),
      requester_roles: jsonArray("requesterRoles", input.requesterRoles),
      approver_roles: jsonArray("approverRoles", input.approverRoles),
      freshness_rule: jsonObject("freshnessRule", input.freshnessRule),
      separation_of_duty_rule: input.separationOfDutyRule === null ? null : jsonObject("separationOfDutyRule", input.separationOfDutyRule),
      retention_class: enumValue("retentionClass", input.retentionClass ?? "compliance_long", AAF_RETENTION_CLASSES),
      privacy_label: enumValue("privacyLabel", input.privacyLabel ?? "internal_operational", AAF_PRIVACY_LABELS),
      notes: optionalText(input.notes),
    };
    return insertReturning(tx.client, TABLES.approvalScopeDefinitions, row, {
      conflictClause: "on conflict (scope, policy_version) do nothing",
      lookup: { scope: row.scope, policy_version: row.policy_version },
    });
  }

  createApprovalRequest(tx: AafWriterTx, input: CreateApprovalRequestInput): Promise<AafRecord> {
    const row = {
      ...scopeColumns(input),
      scope: enumValue("scope", input.scope, AAF_APPROVAL_SCOPES),
      subject_type: requiredText("subjectType", input.subjectType),
      subject_id: requiredText("subjectId", input.subjectId),
      requester_actor_type: enumValue("requesterActorType", input.requesterActorType, ACTOR_TYPES),
      requester_actor_id: requiredText("requesterActorId", input.requesterActorId),
      requester_role: requiredText("requesterRole", input.requesterRole),
      status: enumValue("status", input.status ?? "requested", APPROVAL_REQUEST_STATUSES),
      policy_id: optionalText(input.policyId),
      policy_version: requiredText("policyVersion", input.policyVersion),
      requested_expires_at: optionalText(input.requestedExpiresAt),
      reason: optionalText(input.reason),
      ops_inbox_item_id: optionalText(input.opsInboxItemId),
      privacy_label: enumValue("privacyLabel", input.privacyLabel ?? "internal_operational", AAF_PRIVACY_LABELS),
      retention_class: enumValue("retentionClass", input.retentionClass ?? "compliance_long", AAF_RETENTION_CLASSES),
      ...correlationColumns(input),
    };
    return insertReturning(tx.client, TABLES.approvalRequests, row, {
      conflictClause: "on conflict (tenant_id, scope, subject_type, subject_id, policy_version, idempotency_key) do nothing",
      lookup: approvalRequestIdempotencyLookup(input),
    });
  }

  createApprovalSubjectRef(tx: AafWriterTx, input: CreateApprovalSubjectRefInput): Promise<AafRecord> {
    return insertReturning(tx.client, TABLES.approvalSubjectRefs, {
      ...scopeColumns(input),
      approval_request_id: optionalText(input.approvalRequestId),
      approval_decision_id: optionalText(input.approvalDecisionId),
      policy_evaluation_id: optionalText(input.policyEvaluationId),
      evidence_package_id: optionalText(input.evidencePackageId),
      gate_attempt_id: optionalText(input.gateAttemptId),
      subject_type: requiredText("subjectType", input.subjectType),
      subject_id: requiredText("subjectId", input.subjectId),
      source_system: optionalText(input.sourceSystem) ?? "gnr8",
      source_table: requiredText("sourceTable", input.sourceTable),
      source_record_id: requiredText("sourceRecordId", input.sourceRecordId),
      source_version: optionalText(input.sourceVersion),
      source_watermark: requiredText("sourceWatermark", input.sourceWatermark),
      metadata_json: jsonObject("metadataJson", input.metadataJson),
      correlation_id: requiredText("correlationId", input.correlationId),
    });
  }

  createApprovalEvidenceLink(tx: AafWriterTx, input: CreateApprovalEvidenceLinkInput): Promise<AafRecord> {
    return insertReturning(
      tx.client,
      TABLES.approvalEvidenceLinks,
      {
        approval_request_id: requiredText("approvalRequestId", input.approvalRequestId),
        approval_decision_id: optionalText(input.approvalDecisionId),
        policy_evaluation_id: optionalText(input.policyEvaluationId),
        evidence_package_id: requiredText("evidencePackageId", input.evidencePackageId),
        link_role: requiredText("linkRole", input.linkRole),
        source_note: optionalText(input.sourceNote),
        correlation_id: requiredText("correlationId", input.correlationId),
        idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      },
      {
        conflictClause: "on conflict (idempotency_key) do nothing",
        lookup: idempotencyLookup(input.idempotencyKey),
      },
    );
  }

  createApprovalPolicyEvaluation(tx: AafWriterTx, input: CreateApprovalPolicyEvaluationInput): Promise<AafRecord> {
    return insertReturning(
      tx.client,
      TABLES.approvalPolicyEvaluations,
      {
        ...scopeColumns(input),
        policy_id: optionalText(input.policyId),
        policy_version: requiredText("policyVersion", input.policyVersion),
        result: enumValue("result", input.result, AAF_POLICY_EVALUATION_RESULTS),
        scope: enumValue("scope", input.scope, AAF_APPROVAL_SCOPES),
        action_key: requiredText("actionKey", input.actionKey),
        subject_type: requiredText("subjectType", input.subjectType),
        subject_id: requiredText("subjectId", input.subjectId),
        actor_type: enumValue("actorType", input.actorType, ACTOR_TYPES),
        actor_id: requiredText("actorId", input.actorId),
        actor_role: requiredText("actorRole", input.actorRole),
        approval_request_id: optionalText(input.approvalRequestId),
        approval_decision_id: optionalText(input.approvalDecisionId),
        evidence_package_id: optionalText(input.evidencePackageId),
        blocker_codes: jsonArray("blockerCodes", input.blockerCodes),
        stale_reason: optionalText(input.staleReason),
        emergency_reason: optionalText(input.emergencyReason),
        not_required_reason: optionalText(input.notRequiredReason),
        audit_event_id: optionalText(input.auditEventId),
        evaluated_at: optionalDefaultText(input.evaluatedAt),
        privacy_label: enumValue("privacyLabel", input.privacyLabel ?? "internal_operational", AAF_PRIVACY_LABELS),
        retention_class: enumValue("retentionClass", input.retentionClass ?? "compliance_long", AAF_RETENTION_CLASSES),
        ...correlationColumns(input),
      },
      {
        conflictClause: "on conflict (idempotency_key) do nothing",
        lookup: idempotencyLookup(input.idempotencyKey),
      },
    );
  }

  createApprovalDecision(tx: AafWriterTx, input: CreateApprovalDecisionInput): Promise<AafRecord> {
    if (input.status === "not_required_by_policy" && !optionalText(input.policyEvaluationId)) {
      throw new AafWriterError("policyEvaluationId is required for not_required_by_policy decisions");
    }
    const labels = labelColumns(input);
    return insertReturning(
      tx.client,
      TABLES.approvalDecisions,
      {
        id: optionalDefaultText(input.id),
        approval_request_id: requiredText("approvalRequestId", input.approvalRequestId),
        status: enumValue("status", input.status, APPROVAL_DECISION_STATUSES),
        decision_actor_type: enumValue("decisionActorType", input.decisionActorType, ACTOR_TYPES),
        decision_actor_id: requiredText("decisionActorId", input.decisionActorId),
        decision_actor_role: requiredText("decisionActorRole", input.decisionActorRole),
        decided_at: optionalDefaultText(input.decidedAt),
        policy_version: requiredText("policyVersion", input.policyVersion),
        evidence_package_id: optionalText(input.evidencePackageId),
        policy_evaluation_id: optionalText(input.policyEvaluationId),
        audit_event_id: optionalText(input.auditEventId),
        reason: optionalText(input.reason),
        expires_at: optionalText(input.expiresAt),
        freshness_label: optionalText(input.freshnessLabel),
        separation_of_duty_result: optionalText(input.separationOfDutyResult),
        emergency_policy_ref: optionalText(input.emergencyPolicyRef),
        privacy_label: labels.privacy_label,
        redaction_label: labels.redaction_label,
        retention_class: labels.retention_class,
        ...correlationColumns(input),
      },
      {
        conflictClause: "on conflict (idempotency_key) do nothing",
        lookup: idempotencyLookup(input.idempotencyKey),
      },
    );
  }

  createApprovalRevocation(tx: AafWriterTx, input: CreateApprovalRevocationInput): Promise<AafRecord> {
    return insertReturning(
      tx.client,
      TABLES.approvalRevocations,
      {
        approval_decision_id: requiredText("approvalDecisionId", input.approvalDecisionId),
        revoked_by_actor_type: enumValue("revokedByActorType", input.revokedByActorType, ACTOR_TYPES),
        revoked_by_actor_id: requiredText("revokedByActorId", input.revokedByActorId),
        revoked_by_role: requiredText("revokedByRole", input.revokedByRole),
        revoked_at: optionalDefaultText(input.revokedAt),
        reason: requiredText("reason", input.reason),
        audit_event_id: requiredText("auditEventId", input.auditEventId),
        incident_ref: optionalText(input.incidentRef),
        replacement_request_id: optionalText(input.replacementRequestId),
        correlation_id: requiredText("correlationId", input.correlationId),
        idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      },
      {
        conflictClause: "on conflict (idempotency_key) do nothing",
        lookup: idempotencyLookup(input.idempotencyKey),
      },
    );
  }

  createApprovalSupersessionLink(tx: AafWriterTx, input: CreateApprovalSupersessionLinkInput): Promise<AafRecord> {
    return insertReturning(
      tx.client,
      TABLES.approvalSupersessionLinks,
      {
        superseded_approval_request_id: requiredText("supersededApprovalRequestId", input.supersededApprovalRequestId),
        superseding_approval_request_id: requiredText("supersedingApprovalRequestId", input.supersedingApprovalRequestId),
        superseded_decision_id: optionalText(input.supersededDecisionId),
        superseding_decision_id: optionalText(input.supersedingDecisionId),
        reason: requiredText("reason", input.reason),
        created_by_actor_type: enumValue("createdByActorType", input.createdByActorType, ACTOR_TYPES),
        created_by_actor_id: requiredText("createdByActorId", input.createdByActorId),
        audit_event_id: optionalText(input.auditEventId),
        source_ref_id: optionalText(input.sourceRefId),
        correlation_id: requiredText("correlationId", input.correlationId),
        idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      },
      {
        conflictClause: "on conflict (idempotency_key) do nothing",
        lookup: idempotencyLookup(input.idempotencyKey),
      },
    );
  }

  createAuditEvent(tx: AafWriterTx, input: CreateAuditEventInput): Promise<AafRecord> {
    const labels = labelColumns(input);
    return insertReturning(
      tx.client,
      TABLES.auditEvents,
      {
        id: optionalDefaultText(input.id),
        ...scopeColumns(input),
        event_name: requiredText("eventName", input.eventName),
        event_family: enumValue("eventFamily", input.eventFamily, AAF_AUDIT_EVENT_FAMILIES),
        severity: enumValue("severity", input.severity, AAF_AUDIT_SEVERITIES),
        replay_class: enumValue("replayClass", input.replayClass, AAF_REPLAY_CLASSES),
        actor_type: enumValue("actorType", input.actorType, ACTOR_TYPES),
        actor_id: requiredText("actorId", input.actorId),
        actor_role: requiredText("actorRole", input.actorRole),
        subject_type: requiredText("subjectType", input.subjectType),
        subject_id: requiredText("subjectId", input.subjectId),
        subject_version: optionalText(input.subjectVersion),
        source_system: optionalText(input.sourceSystem) ?? "gnr8",
        source_route: optionalText(input.sourceRoute),
        source_ref_json: jsonObject("sourceRefJson", input.sourceRefJson),
        approval_request_id: optionalText(input.approvalRequestId),
        approval_decision_id: optionalText(input.approvalDecisionId),
        policy_evaluation_id: optionalText(input.policyEvaluationId),
        evidence_package_id: optionalText(input.evidencePackageId),
        original_audit_event_id: optionalText(input.originalAuditEventId),
        before_ref_json: jsonObject("beforeRefJson", input.beforeRefJson),
        after_ref_json: jsonObject("afterRefJson", input.afterRefJson),
        payload_json: jsonObject("payloadJson", input.payloadJson),
        redaction_label: labels.redaction_label,
        privacy_label: labels.privacy_label,
        retention_class: labels.retention_class,
        schema_version: optionalPositiveInteger("schemaVersion", input.schemaVersion),
        ...correlationColumns(input),
      },
      {
        conflictClause: "on conflict (idempotency_key) do nothing",
        lookup: idempotencyLookup(input.idempotencyKey),
      },
    );
  }

  createAuditEventRef(tx: AafWriterTx, input: CreateAuditEventRefInput): Promise<AafRecord> {
    const row = {
      audit_event_id: requiredText("auditEventId", input.auditEventId),
      ref_role: requiredText("refRole", input.refRole),
      ref_type: requiredText("refType", input.refType),
      ref_id: requiredText("refId", input.refId),
      ref_version: optionalText(input.refVersion),
      source_system: optionalText(input.sourceSystem) ?? "gnr8",
      source_table: optionalText(input.sourceTable),
      source_watermark: optionalText(input.sourceWatermark),
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };
    return insertReturning(tx.client, TABLES.auditEventRefs, row, {
      conflictClause: "on conflict (audit_event_id, ref_role, ref_type, ref_id) do nothing",
      lookup: {
        audit_event_id: row.audit_event_id,
        ref_role: row.ref_role,
        ref_type: row.ref_type,
        ref_id: row.ref_id,
      },
    });
  }

  createAuditPartialTimelineMarker(tx: AafWriterTx, input: CreateAuditPartialTimelineMarkerInput): Promise<AafRecord> {
    return insertReturning(tx.client, TABLES.auditPartialTimelineMarkers, {
      ...scopeColumns(input),
      subject_type: requiredText("subjectType", input.subjectType),
      subject_id: requiredText("subjectId", input.subjectId),
      correlation_id: requiredText("correlationId", input.correlationId),
      first_observed_audit_event_id: optionalText(input.firstObservedAuditEventId),
      missing_event_name: requiredText("missingEventName", input.missingEventName),
      failure_reason: requiredText("failureReason", input.failureReason),
      status: enumValue("status", input.status ?? "open", PARTIAL_TIMELINE_STATUSES),
      audit_event_id: optionalText(input.auditEventId),
      created_by_actor_type: enumValue("createdByActorType", input.createdByActorType, ACTOR_TYPES),
      created_by_actor_id: requiredText("createdByActorId", input.createdByActorId),
      reconciled_at: optionalText(input.reconciledAt),
    });
  }

  createEvidencePackage(tx: AafWriterTx, input: CreateEvidencePackageInput): Promise<AafRecord> {
    const labels = labelColumns(input);
    return insertReturning(
      tx.client,
      TABLES.evidencePackages,
      {
        ...scopeColumns(input),
        package_type: enumValue("packageType", input.packageType, AAF_EVIDENCE_PACKAGE_TYPES),
        subject_type: requiredText("subjectType", input.subjectType),
        subject_id: requiredText("subjectId", input.subjectId),
        package_version: optionalPositiveInteger("packageVersion", input.packageVersion),
        status: enumValue("status", input.status ?? "created", EVIDENCE_PACKAGE_STATUSES),
        created_by_actor_type: enumValue("createdByActorType", input.createdByActorType, ACTOR_TYPES),
        created_by_actor_id: requiredText("createdByActorId", input.createdByActorId),
        source_watermark: requiredText("sourceWatermark", input.sourceWatermark),
        freshness_label: requiredText("freshnessLabel", input.freshnessLabel),
        expires_at: optionalText(input.expiresAt),
        content_hash: requiredText("contentHash", input.contentHash),
        supersedes_package_id: optionalText(input.supersedesPackageId),
        redacted_package_id: optionalText(input.redactedPackageId),
        limitations_json: jsonObject("limitationsJson", input.limitationsJson),
        privacy_label: labels.privacy_label,
        redaction_label: labels.redaction_label,
        retention_class: labels.retention_class,
        ...correlationColumns(input),
      },
      {
        conflictClause: "on conflict (idempotency_key) do nothing",
        lookup: idempotencyLookup(input.idempotencyKey),
      },
    );
  }

  createEvidencePackageItem(tx: AafWriterTx, input: CreateEvidencePackageItemInput): Promise<AafRecord> {
    const labels = labelColumns(input);
    const row = {
      evidence_package_id: requiredText("evidencePackageId", input.evidencePackageId),
      item_type: requiredText("itemType", input.itemType),
      item_ref: requiredText("itemRef", input.itemRef),
      item_hash: requiredText("itemHash", input.itemHash),
      media_type: requiredText("mediaType", input.mediaType),
      size_bytes: optionalNonNegativeInteger("sizeBytes", input.sizeBytes),
      storage_bucket: optionalText(input.storageBucket),
      storage_key: optionalText(input.storageKey),
      source_table: optionalText(input.sourceTable),
      source_record_id: optionalText(input.sourceRecordId),
      display_name: optionalText(input.displayName),
      limitations_json: jsonObject("limitationsJson", input.limitationsJson),
      privacy_label: labels.privacy_label,
      redaction_label: labels.redaction_label,
      retention_class: labels.retention_class,
    };
    return insertReturning(tx.client, TABLES.evidencePackageItems, row, {
      conflictClause: "on conflict (evidence_package_id, item_ref, item_hash) do nothing",
      lookup: {
        evidence_package_id: row.evidence_package_id,
        item_ref: row.item_ref,
        item_hash: row.item_hash,
      },
    });
  }

  createEvidencePackageSourceRef(tx: AafWriterTx, input: CreateEvidencePackageSourceRefInput): Promise<AafRecord> {
    const row = {
      evidence_package_id: requiredText("evidencePackageId", input.evidencePackageId),
      source_system: optionalText(input.sourceSystem) ?? "gnr8",
      source_table: requiredText("sourceTable", input.sourceTable),
      source_record_id: requiredText("sourceRecordId", input.sourceRecordId),
      source_version: optionalText(input.sourceVersion),
      source_watermark: requiredText("sourceWatermark", input.sourceWatermark),
      captured_at: optionalDefaultText(input.capturedAt),
      hash: requiredText("hash", input.hash),
      query_ref: optionalText(input.queryRef),
      snapshot_ref: optionalText(input.snapshotRef),
      metadata_json: jsonObject("metadataJson", input.metadataJson),
    };
    return insertReturning(tx.client, TABLES.evidencePackageSourceRefs, row, {
      conflictClause: "on conflict (evidence_package_id, source_system, source_table, source_record_id, source_watermark) do nothing",
      lookup: {
        evidence_package_id: row.evidence_package_id,
        source_system: row.source_system,
        source_table: row.source_table,
        source_record_id: row.source_record_id,
        source_watermark: row.source_watermark,
      },
    });
  }

  createEvidencePackageFreshnessCheck(tx: AafWriterTx, input: CreateEvidencePackageFreshnessCheckInput): Promise<AafRecord> {
    return insertReturning(
      tx.client,
      TABLES.evidencePackageFreshnessChecks,
      {
        evidence_package_id: requiredText("evidencePackageId", input.evidencePackageId),
        policy_version: requiredText("policyVersion", input.policyVersion),
        result: enumValue("result", input.result, EVIDENCE_FRESHNESS_RESULTS),
        checked_at: optionalDefaultText(input.checkedAt),
        checked_by_actor_type: enumValue("checkedByActorType", input.checkedByActorType, ACTOR_TYPES),
        checked_by_actor_id: requiredText("checkedByActorId", input.checkedByActorId),
        stale_reason: optionalText(input.staleReason),
        expires_at: optionalText(input.expiresAt),
        current_source_watermark: optionalText(input.currentSourceWatermark),
        audit_event_id: optionalText(input.auditEventId),
        correlation_id: requiredText("correlationId", input.correlationId),
        idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      },
      {
        conflictClause: "on conflict (idempotency_key) do nothing",
        lookup: idempotencyLookup(input.idempotencyKey),
      },
    );
  }

  createEvidencePackageAuditLink(tx: AafWriterTx, input: CreateEvidencePackageAuditLinkInput): Promise<AafRecord> {
    const row = {
      evidence_package_id: requiredText("evidencePackageId", input.evidencePackageId),
      evidence_package_item_id: optionalText(input.evidencePackageItemId),
      audit_event_id: requiredText("auditEventId", input.auditEventId),
      approval_request_id: optionalText(input.approvalRequestId),
      approval_decision_id: optionalText(input.approvalDecisionId),
      policy_evaluation_id: optionalText(input.policyEvaluationId),
      link_role: requiredText("linkRole", input.linkRole),
    };
    return insertReturning(tx.client, TABLES.evidencePackageAuditLinks, row, {
      conflictClause: "on conflict (evidence_package_id, audit_event_id, link_role) do nothing",
      lookup: {
        evidence_package_id: row.evidence_package_id,
        audit_event_id: row.audit_event_id,
        link_role: row.link_role,
      },
    });
  }

  createEvidencePackageSupersessionLink(tx: AafWriterTx, input: CreateEvidencePackageSupersessionLinkInput): Promise<AafRecord> {
    return insertReturning(
      tx.client,
      TABLES.evidencePackageSupersession,
      {
        superseded_package_id: requiredText("supersededPackageId", input.supersededPackageId),
        superseding_package_id: requiredText("supersedingPackageId", input.supersedingPackageId),
        reason: requiredText("reason", input.reason),
        created_by_actor_type: enumValue("createdByActorType", input.createdByActorType, ACTOR_TYPES),
        created_by_actor_id: requiredText("createdByActorId", input.createdByActorId),
        audit_event_id: optionalText(input.auditEventId),
        source_ref_id: optionalText(input.sourceRefId),
        policy_evaluation_id: optionalText(input.policyEvaluationId),
        correlation_id: requiredText("correlationId", input.correlationId),
        idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      },
      {
        conflictClause: "on conflict (idempotency_key) do nothing",
        lookup: idempotencyLookup(input.idempotencyKey),
      },
    );
  }

  createActionGateAttempt(tx: AafWriterTx, input: CreateActionGateAttemptInput): Promise<AafRecord> {
    if (input.gateResult === "fail_closed" && !optionalText(input.failClosedReason)) {
      throw new AafWriterError("failClosedReason is required for fail_closed gate attempts");
    }
    return insertReturning(
      tx.client,
      TABLES.actionGateAttempts,
      {
        ...scopeColumns(input),
        action_key: requiredText("actionKey", input.actionKey),
        scope: enumValue("scope", input.scope, AAF_APPROVAL_SCOPES),
        subject_type: requiredText("subjectType", input.subjectType),
        subject_id: requiredText("subjectId", input.subjectId),
        actor_type: enumValue("actorType", input.actorType, ACTOR_TYPES),
        actor_id: requiredText("actorId", input.actorId),
        actor_role: requiredText("actorRole", input.actorRole),
        policy_evaluation_id: optionalText(input.policyEvaluationId),
        evidence_package_id: optionalText(input.evidencePackageId),
        approval_request_id: optionalText(input.approvalRequestId),
        approval_decision_id: optionalText(input.approvalDecisionId),
        pre_action_audit_event_id: optionalText(input.preActionAuditEventId),
        outcome_audit_event_id: optionalText(input.outcomeAuditEventId),
        gate_result: enumValue("gateResult", input.gateResult, AAF_GATE_RESULTS),
        fail_closed_reason: optionalText(input.failClosedReason),
        started_at: optionalDefaultText(input.startedAt),
        completed_at: optionalText(input.completedAt),
        ...correlationColumns(input),
      },
      {
        conflictClause: "on conflict (idempotency_key) do nothing",
        lookup: idempotencyLookup(input.idempotencyKey),
      },
    );
  }
}
