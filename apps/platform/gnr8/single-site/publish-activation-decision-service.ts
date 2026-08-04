import "server-only";

import { createHash } from "node:crypto";

import { AAF_SCOPE_REPLAY_CLASS, AAF_SINGLE_SITE_LAUNCH_READINESS_EVIDENCE_TYPE } from "@gnr8/runtime-contracts";

import {
  AafWriterRepository,
  type AafActorType,
  type AafJsonObject,
  type AafPgClient,
  type AafRecord,
  type AafTenantScopeInput,
  type ApprovalDecisionTransactionInput,
  type ApprovalDecisionTransactionResult,
} from "../aaf/aaf-writer-repository";
import {
  PUBLISH_ACTIVATION_REQUEST_ACTION,
  PUBLISH_ACTIVATION_REQUEST_EVIDENCE_LINK_ROLE,
  PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION,
  PUBLISH_ACTIVATION_REQUEST_SCOPE,
  PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
  hashPublishActivationRequestValue,
  stablePublishActivationRequestJson,
  type PublishActivationRequestSourceRef,
} from "./publish-activation-request-bridge";

export const PUBLISH_ACTIVATION_DECISION_SERVICE_VERSION = "mvp-42-publish-activation-decision-service:v1" as const;
export const PUBLISH_ACTIVATION_DECISION_EVIDENCE_LINK_ROLE = "publish_activation_decision_launch_readiness_evidence" as const;

export const PUBLISH_ACTIVATION_DECISION_BOUNDARY_FLAGS = {
  createsApprovalDecision: true,
  createsGateAttempt: false,
  evaluatesGate: false,
  publishes: false,
  publishActionBlocked: false,
  runtimeMutation: false,
  providerCalls: false,
  approvalOnly: true,
} as const;

export const PUBLISH_ACTIVATION_DECISION_STATUSES = ["granted", "granted_with_limitations", "rejected"] as const;

export type PublishActivationDecisionStatus = (typeof PUBLISH_ACTIVATION_DECISION_STATUSES)[number];

export type PublishActivationDecisionActor = {
  actorType: Extract<AafActorType, "human" | "system">;
  actorId: string;
  actorRole: string;
};

export type PublishActivationDecisionInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  publishActivationRequestId: string;
  launchReadinessRecordId: string;
  launchReadinessEvidencePackageId: string;
  improvedCandidateSiteVersionRef: PublishActivationRequestSourceRef;
  improvedRuntimeArtifactRef: PublishActivationRequestSourceRef;
  publishTargetRef: PublishActivationRequestSourceRef;
  decisionStatus: PublishActivationDecisionStatus;
  decisionActor: PublishActivationDecisionActor;
  decisionReason: string;
  decisionNotes?: string | null;
  correlationId: string;
  causationId?: string | null;
  requestId?: string | null;
  idempotencyKey: string;
  limitations?: readonly unknown[];
  expiresAt?: string | null;
  policyVersion?: string | null;
  expectedRequestWatermark?: string | null;
  expectedLaunchReadinessEvidenceWatermark?: string | null;
};

export type ValidatePublishActivationDecisionInput = Omit<
  PublishActivationDecisionInput,
  "decisionActor" | "decisionReason" | "decisionNotes" | "correlationId" | "causationId" | "requestId" | "idempotencyKey" | "expiresAt"
> & {
  publishActivationDecisionId: string;
  approvalRequiredStatus?: "granted" | "granted_with_limitations" | null;
};

export type PublishActivationDecisionValidationStatus =
  | "granted"
  | "granted_with_limitations"
  | "rejected"
  | "revoked"
  | "expired"
  | "superseded"
  | "cancelled"
  | "invalid"
  | "stale"
  | "missing"
  | "requested";

export type PublishActivationDecisionValidationResult = {
  valid: boolean;
  status: PublishActivationDecisionValidationStatus;
  blockerCodes: string[];
  decisionId: string | null;
  decisionRef: string | null;
  requestId: string | null;
  requestRef: string | null;
  launchReadinessEvidencePackageId: string | null;
  launchReadinessEvidencePackageRef: string | null;
  scope: typeof PUBLISH_ACTIVATION_REQUEST_SCOPE | string | null;
  action: typeof PUBLISH_ACTIVATION_REQUEST_ACTION | string | null;
  decisionStatus: string | null;
  limitationsCarriedForward: unknown[];
  semanticWatermark: string;
  flags: typeof PUBLISH_ACTIVATION_DECISION_BOUNDARY_FLAGS;
};

export type PublishActivationDecisionIdempotencyKeys = {
  key: string;
  decisionKey: string;
  evidenceLinkKey: string;
  auditEventKey: string;
  auditEventId: string;
};

export type RecordedPublishActivationDecision = {
  decisionId: string;
  decisionRef: string;
  requestId: string;
  requestRef: string;
  launchReadinessEvidencePackageId: string;
  launchReadinessEvidencePackageRef: string;
  scope: typeof PUBLISH_ACTIVATION_REQUEST_SCOPE;
  action: typeof PUBLISH_ACTIVATION_REQUEST_ACTION;
  decisionStatus: PublishActivationDecisionStatus;
  limitationsCarriedForward: unknown[];
  semanticWatermark: string;
  idempotency: PublishActivationDecisionIdempotencyKeys & {
    result: "created" | "reused";
  };
  approvalDecision: AafRecord;
  evidenceLink: AafRecord | null;
  decisionAuditEvent: AafRecord;
  auditRefs: AafRecord[];
  flags: typeof PUBLISH_ACTIVATION_DECISION_BOUNDARY_FLAGS;
};

type DecisionWriter = Pick<AafWriterRepository, "withTransaction" | "createApprovalDecisionTransaction">;

type RequestEvidenceValidation = {
  valid: boolean;
  blockerCodes: string[];
  request: Record<string, unknown> | null;
  requestPolicyEvaluation: Record<string, unknown> | null;
  evidencePackage: Record<string, unknown> | null;
  evidenceWatermark: string | null;
  readinessStatus: string | null;
  limitations: unknown[];
  semanticWatermark: string;
};

export class PublishActivationDecisionServiceError extends Error {
  constructor(
    message: string,
    readonly blockerCodes: readonly string[],
  ) {
    super(message);
    this.name = "PublishActivationDecisionServiceError";
  }
}

function optionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function requiredText(field: string, value: unknown): string {
  const text = optionalText(value);
  if (!text) throw new PublishActivationDecisionServiceError(`missing required publish activation decision field: ${field}`, [`missing_${field}`]);
  return text;
}

function rowText(row: Record<string, unknown> | null | undefined, field: string): string | null {
  return optionalText(row?.[field]);
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return jsonObject(JSON.parse(value));
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return {};
  return value as Record<string, unknown>;
}

function jsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function sourceRefForWatermark(ref: PublishActivationRequestSourceRef): Record<string, unknown> {
  return {
    sourceSystem: optionalText(ref.sourceSystem) ?? "gnr8",
    sourceTable: requiredText("sourceRef.sourceTable", ref.sourceTable),
    sourceRecordId: requiredText("sourceRef.sourceRecordId", ref.sourceRecordId),
    sourceVersion: optionalText(ref.sourceVersion),
    sourceWatermark: requiredText("sourceRef.sourceWatermark", ref.sourceWatermark),
    sourceRef: optionalText(ref.sourceRef),
    contentHash: optionalText(ref.contentHash),
    metadataJson: jsonObject(ref.metadataJson),
  };
}

function tenantScope(input: PublishActivationDecisionInput): AafTenantScopeInput {
  return {
    tenantId: requiredText("tenantId", input.tenantId),
    clientId: requiredText("clientId", input.clientId),
    siteId: requiredText("siteId", input.siteId),
    batchId: null,
    jobId: null,
    siteVersionId: requiredText("improvedCandidateSiteVersionRef.sourceRecordId", input.improvedCandidateSiteVersionRef.sourceRecordId),
    domainId: null,
    costCenterId: null,
  };
}

function stableJsonValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableJsonValue(entry)]),
    );
  }
  return value ?? null;
}

export function stablePublishActivationDecisionJson(value: unknown): string {
  return JSON.stringify(stableJsonValue(value));
}

export function hashPublishActivationDecisionValue(value: unknown): string {
  return createHash("sha256").update(stablePublishActivationDecisionJson(value)).digest("hex");
}

function deterministicUuid(seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-${((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16)}${hash.slice(18, 20)}-${hash.slice(20, 32)}`;
}

export function computePublishActivationDecisionSemanticWatermark(input: Omit<PublishActivationDecisionInput, "decisionActor" | "correlationId" | "causationId" | "requestId" | "idempotencyKey">): string {
  return `single-site-publish-activation-decision:${hashPublishActivationDecisionValue({
    serviceVersion: PUBLISH_ACTIVATION_DECISION_SERVICE_VERSION,
    scope: PUBLISH_ACTIVATION_REQUEST_SCOPE,
    action: PUBLISH_ACTIVATION_REQUEST_ACTION,
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    migrationId: input.migrationId,
    publishActivationRequestId: input.publishActivationRequestId,
    launchReadinessRecordId: input.launchReadinessRecordId,
    launchReadinessEvidencePackageId: input.launchReadinessEvidencePackageId,
    improvedCandidateSiteVersionRef: sourceRefForWatermark(input.improvedCandidateSiteVersionRef),
    improvedRuntimeArtifactRef: sourceRefForWatermark(input.improvedRuntimeArtifactRef),
    publishTargetRef: sourceRefForWatermark(input.publishTargetRef),
    decisionStatus: input.decisionStatus,
    decisionReason: input.decisionReason,
    decisionNotes: optionalText(input.decisionNotes),
    limitations: stableJsonValue(input.limitations ?? []),
    expiresAt: optionalText(input.expiresAt),
    policyVersion: optionalText(input.policyVersion) ?? PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION,
    expectedRequestWatermark: optionalText(input.expectedRequestWatermark),
    expectedLaunchReadinessEvidenceWatermark: optionalText(input.expectedLaunchReadinessEvidenceWatermark),
  })}`;
}

export function buildPublishActivationDecisionIdempotencyKeys(input: Pick<PublishActivationDecisionInput, "idempotencyKey">): PublishActivationDecisionIdempotencyKeys {
  const key = requiredText("idempotencyKey", input.idempotencyKey);
  return {
    key,
    decisionKey: `${key}:publish-activation-decision`,
    evidenceLinkKey: `${key}:publish-activation-decision:evidence-link`,
    auditEventKey: `${key}:publish-activation-decision:audit`,
    auditEventId: deterministicUuid(`${PUBLISH_ACTIVATION_DECISION_SERVICE_VERSION}:${key}:audit`),
  };
}

function sameTenantScope(input: { tenantId: string; clientId: string; siteId: string }, row: Record<string, unknown>): boolean {
  return rowText(row, "tenant_id") === input.tenantId && rowText(row, "client_id") === input.clientId && rowText(row, "site_id") === input.siteId;
}

function metadataRole(row: Record<string, unknown>): string | null {
  const metadata = jsonObject(row.metadata_json);
  return optionalText(metadata.refRole) ?? optionalText(metadata.bridgeSubjectRole) ?? optionalText(metadata.bridgeEvidenceRole);
}

function refMatchesExpected(row: Record<string, unknown>, expected: PublishActivationRequestSourceRef, role?: string): boolean {
  return (
    (!role || metadataRole(row) === role) &&
    rowText(row, "source_table") === requiredText(`${role ?? "source"}.sourceTable`, expected.sourceTable) &&
    rowText(row, "source_record_id") === requiredText(`${role ?? "source"}.sourceRecordId`, expected.sourceRecordId) &&
    rowText(row, "source_watermark") === requiredText(`${role ?? "source"}.sourceWatermark`, expected.sourceWatermark)
  );
}

function payloadRefMatches(payload: Record<string, unknown>, role: string, expected: PublishActivationRequestSourceRef): boolean {
  const refs = jsonArray(jsonObject(payload.sourceRefs)[role]);
  return refs.some((entry) => {
    const ref = jsonObject(entry);
    return (
      optionalText(ref.sourceTable) === expected.sourceTable &&
      optionalText(ref.sourceRecordId) === expected.sourceRecordId &&
      optionalText(ref.sourceWatermark) === expected.sourceWatermark
    );
  });
}

function containsOpenP0Blocker(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsOpenP0Blocker);
  if (!value || typeof value !== "object") {
    const text = optionalText(value);
    return Boolean(text && /open[_ -]?p0|p0[_ -]?blocker/.test(text));
  }
  const record = value as Record<string, unknown>;
  if (optionalText(record.severity) === "p0_blocker" && optionalText(record.status) === "open") return true;
  return Object.values(record).some(containsOpenP0Blocker);
}

function limitationsFromEvidencePayload(payload: Record<string, unknown>): unknown[] {
  return [
    ...jsonArray(payload.acceptedLimitations),
    ...jsonArray(payload.unresolvedNonP0Blockers),
    ...jsonArray(jsonObject(payload.readinessCloseout).finalLimitations),
  ];
}

async function readOne(client: AafPgClient, sql: string, values: readonly unknown[]): Promise<Record<string, unknown> | null> {
  const result = await client.query(sql, values);
  return result.rows[0] ?? null;
}

async function readAll(client: AafPgClient, sql: string, values: readonly unknown[]): Promise<Record<string, unknown>[]> {
  const result = await client.query(sql, values);
  return result.rows;
}

function validateRequiredInput(input: PublishActivationDecisionInput): void {
  requiredText("tenantId", input.tenantId);
  requiredText("clientId", input.clientId);
  requiredText("siteId", input.siteId);
  requiredText("migrationId", input.migrationId);
  requiredText("publishActivationRequestId", input.publishActivationRequestId);
  requiredText("launchReadinessRecordId", input.launchReadinessRecordId);
  requiredText("launchReadinessEvidencePackageId", input.launchReadinessEvidencePackageId);
  requiredText("improvedCandidateSiteVersionRef.sourceTable", input.improvedCandidateSiteVersionRef?.sourceTable);
  requiredText("improvedCandidateSiteVersionRef.sourceRecordId", input.improvedCandidateSiteVersionRef?.sourceRecordId);
  requiredText("improvedCandidateSiteVersionRef.sourceWatermark", input.improvedCandidateSiteVersionRef?.sourceWatermark);
  requiredText("improvedRuntimeArtifactRef.sourceTable", input.improvedRuntimeArtifactRef?.sourceTable);
  requiredText("improvedRuntimeArtifactRef.sourceRecordId", input.improvedRuntimeArtifactRef?.sourceRecordId);
  requiredText("improvedRuntimeArtifactRef.sourceWatermark", input.improvedRuntimeArtifactRef?.sourceWatermark);
  requiredText("publishTargetRef.sourceTable", input.publishTargetRef?.sourceTable);
  requiredText("publishTargetRef.sourceRecordId", input.publishTargetRef?.sourceRecordId);
  requiredText("publishTargetRef.sourceWatermark", input.publishTargetRef?.sourceWatermark);
  if (!PUBLISH_ACTIVATION_DECISION_STATUSES.includes(input.decisionStatus)) {
    throw new PublishActivationDecisionServiceError("unsupported publish activation decision status", ["decision_status_unsupported"]);
  }
  requiredText("decisionActor.actorType", input.decisionActor?.actorType);
  requiredText("decisionActor.actorId", input.decisionActor?.actorId);
  requiredText("decisionActor.actorRole", input.decisionActor?.actorRole);
  requiredText("decisionReason", input.decisionReason);
  requiredText("correlationId", input.correlationId);
  requiredText("idempotencyKey", input.idempotencyKey);
}

async function validateRequestAndEvidence(client: AafPgClient, input: Pick<
  PublishActivationDecisionInput,
  | "tenantId"
  | "clientId"
  | "siteId"
  | "migrationId"
  | "publishActivationRequestId"
  | "launchReadinessRecordId"
  | "launchReadinessEvidencePackageId"
  | "improvedCandidateSiteVersionRef"
  | "improvedRuntimeArtifactRef"
  | "publishTargetRef"
  | "policyVersion"
  | "expectedRequestWatermark"
  | "expectedLaunchReadinessEvidenceWatermark"
>): Promise<RequestEvidenceValidation> {
  const semanticWatermark = `single-site-publish-activation-decision-prereq:${hashPublishActivationRequestValue({
    serviceVersion: PUBLISH_ACTIVATION_DECISION_SERVICE_VERSION,
    requestId: input.publishActivationRequestId,
    evidencePackageId: input.launchReadinessEvidencePackageId,
    candidate: sourceRefForWatermark(input.improvedCandidateSiteVersionRef),
    artifact: sourceRefForWatermark(input.improvedRuntimeArtifactRef),
    publishTarget: sourceRefForWatermark(input.publishTargetRef),
    expectedRequestWatermark: optionalText(input.expectedRequestWatermark),
    expectedLaunchReadinessEvidenceWatermark: optionalText(input.expectedLaunchReadinessEvidenceWatermark),
  })}`;
  const blockers: string[] = [];

  const request = await readOne(client, `select * from public.gnr8_aaf_approval_requests where id = $1::uuid`, [
    input.publishActivationRequestId,
  ]);
  if (!request) {
    return {
      valid: false,
      blockerCodes: ["publish_activation_request_missing"],
      request: null,
      requestPolicyEvaluation: null,
      evidencePackage: null,
      evidenceWatermark: null,
      readinessStatus: null,
      limitations: [],
      semanticWatermark,
    };
  }

  const policyEvaluation = await readOne(
    client,
    `
    select *
    from public.gnr8_aaf_approval_policy_evaluations
    where approval_request_id = $1::uuid
      and scope = $2
      and action_key = $3
    order by created_at asc
    limit 1
    `,
    [input.publishActivationRequestId, PUBLISH_ACTIVATION_REQUEST_SCOPE, PUBLISH_ACTIVATION_REQUEST_ACTION],
  );

  const requestEvidenceLink = await readOne(
    client,
    `
    select *
    from public.gnr8_aaf_approval_evidence_links
    where approval_request_id = $1::uuid
      and approval_decision_id is null
      and link_role = $2
      and evidence_package_id = $3::uuid
    limit 1
    `,
    [input.publishActivationRequestId, PUBLISH_ACTIVATION_REQUEST_EVIDENCE_LINK_ROLE, input.launchReadinessEvidencePackageId],
  );

  const evidencePackage = await readOne(client, `select * from public.gnr8_aaf_evidence_packages where id = $1::uuid`, [
    input.launchReadinessEvidencePackageId,
  ]);
  const sourceRefRows = evidencePackage
    ? await readAll(client, `select * from public.gnr8_aaf_evidence_package_source_refs where evidence_package_id = $1::uuid`, [
        input.launchReadinessEvidencePackageId,
      ])
    : [];
  const freshness = evidencePackage
    ? await readOne(
        client,
        `
        select *
        from public.gnr8_aaf_evidence_package_freshness_checks
        where evidence_package_id = $1::uuid
        order by checked_at desc, created_at desc
        limit 1
        `,
        [input.launchReadinessEvidencePackageId],
      )
    : null;

  const payload = jsonObject(evidencePackage?.limitations_json);
  const identity = jsonObject(payload.identity);
  const readinessStatus = optionalText(payload.readinessStatus);
  const evidenceWatermark = rowText(evidencePackage, "source_watermark");
  const requestWatermark = optionalText(jsonObject(request.reason).semanticWatermark) ?? null;
  const policyVersion = optionalText(input.policyVersion);

  if (!sameTenantScope(input, request)) blockers.push("request_tenant_client_site_mismatch");
  if (rowText(request, "scope") !== PUBLISH_ACTIVATION_REQUEST_SCOPE) blockers.push("request_scope_mismatch");
  if (rowText(request, "subject_type") !== PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE) blockers.push("request_subject_type_mismatch");
  if (rowText(request, "subject_id") !== input.improvedCandidateSiteVersionRef.sourceRecordId) blockers.push("request_subject_mismatch");
  if (rowText(request, "site_version_id") !== input.improvedCandidateSiteVersionRef.sourceRecordId) blockers.push("request_site_version_mismatch");
  if (!["requested"].includes(String(rowText(request, "status")))) blockers.push(`request_status_${rowText(request, "status") ?? "missing"}`);
  if (policyVersion && rowText(request, "policy_version") !== policyVersion) blockers.push("request_policy_version_mismatch");
  if (input.expectedRequestWatermark && requestWatermark && requestWatermark !== input.expectedRequestWatermark) blockers.push("expected_request_watermark_mismatch");
  if (input.expectedRequestWatermark && !requestWatermark) {
    const subjectRefs = await readAll(client, `select * from public.gnr8_aaf_approval_subject_refs where approval_request_id = $1::uuid`, [
      input.publishActivationRequestId,
    ]);
    if (!subjectRefs.some((row) => rowText(row, "source_watermark") === input.expectedRequestWatermark || optionalText(jsonObject(row.metadata_json).semanticWatermark) === input.expectedRequestWatermark)) {
      blockers.push("expected_request_watermark_mismatch");
    }
  }
  if (!policyEvaluation) blockers.push("request_policy_evaluation_missing");
  if (policyEvaluation && rowText(policyEvaluation, "result") !== "approval_required") blockers.push("request_policy_row_not_approval_required");
  if (policyEvaluation && rowText(policyEvaluation, "subject_type") !== PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE) blockers.push("request_policy_subject_type_mismatch");
  if (policyEvaluation && rowText(policyEvaluation, "subject_id") !== input.improvedCandidateSiteVersionRef.sourceRecordId) blockers.push("request_policy_subject_mismatch");
  if (policyEvaluation && rowText(policyEvaluation, "evidence_package_id") !== input.launchReadinessEvidencePackageId) blockers.push("request_policy_evidence_mismatch");
  if (!requestEvidenceLink) blockers.push("request_launch_readiness_evidence_link_missing");

  if (!evidencePackage) {
    blockers.push("launch_readiness_evidence_package_missing");
  } else {
    if (rowText(evidencePackage, "package_type") !== AAF_SINGLE_SITE_LAUNCH_READINESS_EVIDENCE_TYPE) blockers.push("evidence_type_mismatch");
    if (rowText(evidencePackage, "subject_type") !== "single_site_launch_readiness_package") blockers.push("evidence_subject_type_mismatch");
    if (rowText(evidencePackage, "subject_id") !== input.launchReadinessRecordId) blockers.push("launch_readiness_record_mismatch");
    if (!sameTenantScope(input, evidencePackage)) blockers.push("evidence_tenant_client_site_mismatch");
    if (rowText(evidencePackage, "site_version_id") !== input.improvedCandidateSiteVersionRef.sourceRecordId) blockers.push("evidence_site_version_mismatch");
    if (["invalid", "superseded"].includes(String(rowText(evidencePackage, "status")))) blockers.push(`evidence_${rowText(evidencePackage, "status")}`);
    if (!["fresh", "partial_timeline"].includes(String(rowText(evidencePackage, "freshness_label")))) blockers.push(`evidence_freshness_${rowText(evidencePackage, "freshness_label") ?? "missing"}`);
    if (input.expectedLaunchReadinessEvidenceWatermark && evidenceWatermark !== input.expectedLaunchReadinessEvidenceWatermark) {
      blockers.push("expected_launch_readiness_evidence_watermark_mismatch");
    }
    if (identity.tenantId !== input.tenantId) blockers.push("payload_tenant_id_mismatch");
    if (identity.clientId !== input.clientId) blockers.push("payload_client_id_mismatch");
    if (identity.siteId !== input.siteId) blockers.push("payload_site_id_mismatch");
    if (identity.migrationId !== input.migrationId) blockers.push("payload_migration_id_mismatch");
    if (identity.launchReadinessRecordId !== input.launchReadinessRecordId) blockers.push("payload_launch_readiness_record_mismatch");
    if (!["ready", "ready_with_limitations"].includes(String(readinessStatus))) blockers.push(`readiness_status_${readinessStatus ?? "missing"}`);
    if (containsOpenP0Blocker(payload)) blockers.push("open_p0_blocker_present");
  }

  if (!freshness) {
    blockers.push("freshness_check_missing");
  } else {
    const freshnessResult = rowText(freshness, "result");
    if (!["fresh", "partial_timeline"].includes(String(freshnessResult))) blockers.push(`freshness_check_${freshnessResult ?? "missing"}`);
    if (rowText(freshness, "current_source_watermark") !== evidenceWatermark) blockers.push("freshness_watermark_mismatch");
    const expiresAt = optionalText(freshness.expires_at);
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) blockers.push("freshness_expired");
  }

  if (
    !sourceRefRows.some((row) => refMatchesExpected(row, input.improvedCandidateSiteVersionRef, "improved_candidate_site_version")) &&
    !payloadRefMatches(payload, "improved_candidate_site_version", input.improvedCandidateSiteVersionRef)
  ) {
    blockers.push("improved_candidate_site_version_ref_mismatch");
  }
  if (
    !sourceRefRows.some((row) => refMatchesExpected(row, input.improvedRuntimeArtifactRef, "improved_runtime_artifact")) &&
    !payloadRefMatches(payload, "improved_runtime_artifact", input.improvedRuntimeArtifactRef)
  ) {
    blockers.push("improved_runtime_artifact_ref_mismatch");
  }
  if (!sourceRefRows.some((row) => refMatchesExpected(row, input.publishTargetRef, "publish_target")) && !payloadRefMatches(payload, "publish_target", input.publishTargetRef)) {
    blockers.push("publish_target_ref_mismatch");
  }

  const uniqueBlockers = Array.from(new Set(blockers)).sort((left, right) => left.localeCompare(right));
  return {
    valid: uniqueBlockers.length === 0,
    blockerCodes: uniqueBlockers,
    request,
    requestPolicyEvaluation: policyEvaluation,
    evidencePackage,
    evidenceWatermark,
    readinessStatus,
    limitations: limitationsFromEvidencePayload(payload),
    semanticWatermark,
  };
}

async function activeDecisionsForRequest(client: AafPgClient, requestId: string): Promise<Record<string, unknown>[]> {
  return readAll(
    client,
    `
    select d.*
    from public.gnr8_aaf_approval_decisions d
    where d.approval_request_id = $1::uuid
      and d.status not in ('revoked', 'expired', 'superseded', 'cancelled', 'not_required_by_policy')
      and not exists (
        select 1 from public.gnr8_aaf_approval_revocations r where r.approval_decision_id = d.id
      )
      and not exists (
        select 1 from public.gnr8_aaf_approval_supersession_links s where s.superseded_decision_id = d.id
      )
    order by d.created_at asc
    `,
    [requestId],
  );
}

function validationFailure(
  input: Pick<PublishActivationDecisionInput, "publishActivationRequestId" | "launchReadinessEvidencePackageId" | "decisionStatus">,
  status: PublishActivationDecisionValidationStatus,
  blockerCodes: string[],
  semanticWatermark: string,
  decisionId: string | null = null,
): PublishActivationDecisionValidationResult {
  return {
    valid: false,
    status,
    blockerCodes,
    decisionId,
    decisionRef: decisionId ? `aaf:approval_decision:${decisionId}` : null,
    requestId: optionalText(input.publishActivationRequestId),
    requestRef: optionalText(input.publishActivationRequestId) ? `aaf:approval_request:${input.publishActivationRequestId}` : null,
    launchReadinessEvidencePackageId: optionalText(input.launchReadinessEvidencePackageId),
    launchReadinessEvidencePackageRef: optionalText(input.launchReadinessEvidencePackageId) ? `aaf:evidence_package:${input.launchReadinessEvidencePackageId}` : null,
    scope: PUBLISH_ACTIVATION_REQUEST_SCOPE,
    action: PUBLISH_ACTIVATION_REQUEST_ACTION,
    decisionStatus: optionalText(input.decisionStatus),
    limitationsCarriedForward: [],
    semanticWatermark,
    flags: PUBLISH_ACTIVATION_DECISION_BOUNDARY_FLAGS,
  };
}

function limitationsForDecision(input: PublishActivationDecisionInput, validation: RequestEvidenceValidation): unknown[] {
  return input.decisionStatus === "granted_with_limitations"
    ? [...validation.limitations, ...jsonArray(input.limitations)]
    : [...jsonArray(input.limitations)];
}

function recordedResult(
  input: PublishActivationDecisionInput,
  validation: RequestEvidenceValidation,
  txResult: ApprovalDecisionTransactionResult,
  idempotency: RecordedPublishActivationDecision["idempotency"],
): RecordedPublishActivationDecision {
  return {
    decisionId: txResult.approvalDecision.id,
    decisionRef: `aaf:approval_decision:${txResult.approvalDecision.id}`,
    requestId: input.publishActivationRequestId,
    requestRef: `aaf:approval_request:${input.publishActivationRequestId}`,
    launchReadinessEvidencePackageId: input.launchReadinessEvidencePackageId,
    launchReadinessEvidencePackageRef: `aaf:evidence_package:${input.launchReadinessEvidencePackageId}`,
    scope: PUBLISH_ACTIVATION_REQUEST_SCOPE,
    action: PUBLISH_ACTIVATION_REQUEST_ACTION,
    decisionStatus: input.decisionStatus,
    limitationsCarriedForward: limitationsForDecision(input, validation),
    semanticWatermark: computePublishActivationDecisionSemanticWatermark(input),
    idempotency,
    approvalDecision: txResult.approvalDecision,
    evidenceLink: txResult.evidenceLink,
    decisionAuditEvent: txResult.auditEvent,
    auditRefs: txResult.auditRefs,
    flags: PUBLISH_ACTIVATION_DECISION_BOUNDARY_FLAGS,
  };
}

export class SingleSitePublishActivationDecisionService {
  constructor(private readonly writer: DecisionWriter = new AafWriterRepository()) {}

  async recordPublishActivationDecision(input: PublishActivationDecisionInput): Promise<RecordedPublishActivationDecision> {
    validateRequiredInput(input);
    const keys = buildPublishActivationDecisionIdempotencyKeys(input);
    const validation = await this.writer.withTransaction(async (tx) => {
      const result = await validateRequestAndEvidence(tx.client, input);
      if (!result.valid) return result;
      const activeDecisions = await activeDecisionsForRequest(tx.client, input.publishActivationRequestId);
      const nonReplayActive = activeDecisions.filter((decision) => rowText(decision, "idempotency_key") !== keys.decisionKey);
      if (nonReplayActive.length > 0) {
        return { ...result, valid: false, blockerCodes: ["conflicting_active_publish_activation_decision"] };
      }
      return result;
    });

    if (!validation.valid) {
      throw new PublishActivationDecisionServiceError(`publish activation decision refused: ${validation.blockerCodes.join(", ")}`, validation.blockerCodes);
    }

    const existing = await this.writer.withTransaction((tx) =>
      readOne(tx.client, `select * from public.gnr8_aaf_approval_decisions where idempotency_key = $1`, [keys.decisionKey]),
    );
    const policyVersion = optionalText(input.policyVersion) ?? rowText(validation.request, "policy_version") ?? PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION;
    const scope = tenantScope(input);
    const limitations = limitationsForDecision(input, validation);
    const semanticWatermark = computePublishActivationDecisionSemanticWatermark(input);
    const subject = {
      subjectType: PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
      subjectId: input.improvedCandidateSiteVersionRef.sourceRecordId,
    };

    const txResult = await this.writer.createApprovalDecisionTransaction({
      approvalDecision: {
        approvalRequestId: input.publishActivationRequestId,
        status: input.decisionStatus,
        decisionActorType: input.decisionActor.actorType,
        decisionActorId: input.decisionActor.actorId,
        decisionActorRole: input.decisionActor.actorRole,
        policyVersion,
        evidencePackageId: input.launchReadinessEvidencePackageId,
        policyEvaluationId: rowText(validation.requestPolicyEvaluation, "id"),
        auditEventId: keys.auditEventId,
        reason: input.decisionReason,
        expiresAt: input.expiresAt ?? null,
        freshnessLabel: rowText(validation.evidencePackage, "freshness_label") ?? "fresh",
        privacyLabel: "client_confidential",
        redactionLabel: "none",
        retentionClass: "compliance_long",
        correlationId: input.correlationId,
        causationId: input.causationId ?? null,
        requestId: input.requestId ?? null,
        idempotencyKey: keys.decisionKey,
      },
      evidenceLink: {
        evidencePackageId: input.launchReadinessEvidencePackageId,
        policyEvaluationId: rowText(validation.requestPolicyEvaluation, "id"),
        linkRole: PUBLISH_ACTIVATION_DECISION_EVIDENCE_LINK_ROLE,
        sourceNote: "MVP-42 decision basis: MVP-41 publish activation request linked to MVP-40 launch readiness evidence.",
        idempotencyKey: keys.evidenceLinkKey,
      },
      decisionAuditEvent: {
        ...scope,
        ...subject,
        eventName: `single_site.publish_activation.decision.${input.decisionStatus}`,
        eventFamily: "approval",
        severity: input.decisionStatus === "rejected" ? "warning" : "notice",
        replayClass: AAF_SCOPE_REPLAY_CLASS[PUBLISH_ACTIVATION_REQUEST_SCOPE],
        actorType: input.decisionActor.actorType,
        actorId: input.decisionActor.actorId,
        actorRole: input.decisionActor.actorRole,
        sourceRefJson: {
          requestId: input.publishActivationRequestId,
          launchReadinessRecordId: input.launchReadinessRecordId,
          launchReadinessEvidencePackageId: input.launchReadinessEvidencePackageId,
          nonExecuting: true,
        },
        payloadJson: {
          serviceVersion: PUBLISH_ACTIVATION_DECISION_SERVICE_VERSION,
          scope: PUBLISH_ACTIVATION_REQUEST_SCOPE,
          action: PUBLISH_ACTIVATION_REQUEST_ACTION,
          decisionStatus: input.decisionStatus,
          semanticWatermark,
          requestId: input.publishActivationRequestId,
          requestScope: rowText(validation.request, "scope"),
          requestAction: PUBLISH_ACTIVATION_REQUEST_ACTION,
          launchReadinessStatus: validation.readinessStatus,
          launchReadinessEvidencePackageId: input.launchReadinessEvidencePackageId,
          launchReadinessEvidenceWatermark: validation.evidenceWatermark,
          improvedCandidateSiteVersionRef: sourceRefForWatermark(input.improvedCandidateSiteVersionRef),
          improvedRuntimeArtifactRef: sourceRefForWatermark(input.improvedRuntimeArtifactRef),
          publishTargetRef: sourceRefForWatermark(input.publishTargetRef),
          limitationsCarriedForward: limitations,
          decisionNotes: optionalText(input.decisionNotes),
          flags: PUBLISH_ACTIVATION_DECISION_BOUNDARY_FLAGS,
        },
        privacyLabel: "client_confidential",
        redactionLabel: "none",
        retentionClass: "compliance_long",
        causationId: input.causationId ?? null,
        requestId: input.requestId ?? null,
        idempotencyKey: keys.auditEventKey,
      },
      auditRefs: [
        {
          refRole: "publish_activation_request",
          refType: "aaf_approval_request",
          refId: input.publishActivationRequestId,
          sourceTable: "gnr8_aaf_approval_requests",
          sourceWatermark: input.expectedRequestWatermark ?? stablePublishActivationRequestJson({ requestId: input.publishActivationRequestId }),
          metadataJson: { scope: PUBLISH_ACTIVATION_REQUEST_SCOPE, action: PUBLISH_ACTIVATION_REQUEST_ACTION },
        },
        {
          refRole: "launch_readiness_evidence",
          refType: "aaf_evidence_package",
          refId: input.launchReadinessEvidencePackageId,
          sourceTable: "gnr8_aaf_evidence_packages",
          sourceWatermark: validation.evidenceWatermark ?? input.expectedLaunchReadinessEvidenceWatermark ?? semanticWatermark,
          metadataJson: { packageType: AAF_SINGLE_SITE_LAUNCH_READINESS_EVIDENCE_TYPE },
        },
      ],
    } satisfies ApprovalDecisionTransactionInput);

    return recordedResult(input, validation, txResult, {
      ...keys,
      result: existing ? "reused" : "created",
    });
  }

  async validatePublishActivationDecision(input: ValidatePublishActivationDecisionInput): Promise<PublishActivationDecisionValidationResult> {
    requiredText("publishActivationDecisionId", input.publishActivationDecisionId);
    const semanticWatermark = `single-site-publish-activation-decision-validation:${hashPublishActivationDecisionValue({
      serviceVersion: PUBLISH_ACTIVATION_DECISION_SERVICE_VERSION,
      publishActivationDecisionId: input.publishActivationDecisionId,
      requestId: input.publishActivationRequestId,
      evidencePackageId: input.launchReadinessEvidencePackageId,
      decisionStatus: input.decisionStatus,
    })}`;

    return this.writer.withTransaction(async (tx) => {
      const decision = await readOne(tx.client, `select * from public.gnr8_aaf_approval_decisions where id = $1::uuid`, [
        input.publishActivationDecisionId,
      ]);
      if (!decision) {
        return validationFailure(input, "missing", ["approval_decision_missing"], semanticWatermark, input.publishActivationDecisionId);
      }

      const prerequisite = await validateRequestAndEvidence(tx.client, input);
      if (!prerequisite.valid) {
        return validationFailure(input, prerequisite.blockerCodes.some((code) => code.includes("watermark") || code.includes("freshness")) ? "stale" : "invalid", prerequisite.blockerCodes, semanticWatermark, input.publishActivationDecisionId);
      }

      const blockers: string[] = [];
      const decisionStatus = rowText(decision, "status");
      const request = prerequisite.request;
      if (rowText(decision, "approval_request_id") !== input.publishActivationRequestId) blockers.push("decision_request_mismatch");
      if (rowText(decision, "evidence_package_id") !== input.launchReadinessEvidencePackageId) blockers.push("decision_evidence_mismatch");
      const expectedPolicyVersion = optionalText(input.policyVersion) ?? rowText(request, "policy_version");
      if (expectedPolicyVersion && rowText(decision, "policy_version") !== expectedPolicyVersion) blockers.push("decision_policy_version_mismatch");
      if (input.decisionStatus && decisionStatus !== input.decisionStatus) blockers.push("decision_status_mismatch");
      if (input.approvalRequiredStatus && decisionStatus !== input.approvalRequiredStatus) blockers.push("decision_required_status_mismatch");
      if (!["granted", "granted_with_limitations"].includes(String(decisionStatus))) blockers.push(`approval_${decisionStatus ?? "invalid"}`);
      const expiresAt = optionalText(decision.expires_at);
      if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) blockers.push("approval_expired");
      if (await readOne(tx.client, `select * from public.gnr8_aaf_approval_revocations where approval_decision_id = $1::uuid limit 1`, [input.publishActivationDecisionId])) {
        blockers.push("approval_revoked");
      }
      if (await readOne(tx.client, `select * from public.gnr8_aaf_approval_supersession_links where superseded_decision_id = $1::uuid limit 1`, [input.publishActivationDecisionId])) {
        blockers.push("approval_superseded");
      }

      const audit = await readOne(
        tx.client,
        `select * from public.gnr8_aaf_audit_events where approval_decision_id = $1::uuid order by created_at asc limit 1`,
        [input.publishActivationDecisionId],
      );
      const payload = jsonObject(audit?.payload_json);
      if (optionalText(payload.scope) && optionalText(payload.scope) !== PUBLISH_ACTIVATION_REQUEST_SCOPE) blockers.push("decision_audit_scope_mismatch");
      if (optionalText(payload.action) && optionalText(payload.action) !== PUBLISH_ACTIVATION_REQUEST_ACTION) blockers.push("decision_audit_action_mismatch");

      const limitations = jsonArray(payload.limitationsCarriedForward);
      if (decisionStatus === "granted_with_limitations" && limitations.length === 0 && prerequisite.limitations.length === 0) {
        blockers.push("limitations_missing_for_limited_grant");
      }

      const status = decisionStatus && ["rejected", "revoked", "expired", "superseded", "cancelled", "requested"].includes(decisionStatus)
        ? (decisionStatus as PublishActivationDecisionValidationStatus)
        : blockers.some((code) => code.includes("expired") || code.includes("revoked") || code.includes("superseded"))
          ? blockers.includes("approval_revoked")
            ? "revoked"
            : blockers.includes("approval_superseded")
              ? "superseded"
              : "expired"
          : ["granted", "granted_with_limitations"].includes(String(decisionStatus))
            ? (decisionStatus as PublishActivationDecisionValidationStatus)
            : "invalid";

      return {
        valid: blockers.length === 0 && ["granted", "granted_with_limitations"].includes(String(decisionStatus)),
        status: blockers.length === 0 ? status : status === "granted" || status === "granted_with_limitations" ? "invalid" : status,
        blockerCodes: Array.from(new Set(blockers)).sort((left, right) => left.localeCompare(right)),
        decisionId: input.publishActivationDecisionId,
        decisionRef: `aaf:approval_decision:${input.publishActivationDecisionId}`,
        requestId: input.publishActivationRequestId,
        requestRef: `aaf:approval_request:${input.publishActivationRequestId}`,
        launchReadinessEvidencePackageId: input.launchReadinessEvidencePackageId,
        launchReadinessEvidencePackageRef: `aaf:evidence_package:${input.launchReadinessEvidencePackageId}`,
        scope: PUBLISH_ACTIVATION_REQUEST_SCOPE,
        action: PUBLISH_ACTIVATION_REQUEST_ACTION,
        decisionStatus,
        limitationsCarriedForward: limitations.length > 0 ? limitations : prerequisite.limitations,
        semanticWatermark,
        flags: PUBLISH_ACTIVATION_DECISION_BOUNDARY_FLAGS,
      };
    });
  }
}

export function recordPublishActivationDecision(input: PublishActivationDecisionInput): Promise<RecordedPublishActivationDecision> {
  return new SingleSitePublishActivationDecisionService().recordPublishActivationDecision(input);
}

export function validatePublishActivationDecision(input: ValidatePublishActivationDecisionInput): Promise<PublishActivationDecisionValidationResult> {
  return new SingleSitePublishActivationDecisionService().validatePublishActivationDecision(input);
}
