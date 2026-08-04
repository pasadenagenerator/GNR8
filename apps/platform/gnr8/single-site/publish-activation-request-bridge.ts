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
  type ApprovalRequestTransactionInput,
  type ApprovalRequestTransactionResult,
} from "../aaf/aaf-writer-repository";

export const PUBLISH_ACTIVATION_REQUEST_BRIDGE_VERSION = "mvp-41-publish-activation-request-bridge:v1" as const;
export const PUBLISH_ACTIVATION_REQUEST_SCOPE = "publish_activation" as const;
export const PUBLISH_ACTIVATION_REQUEST_ACTION = "publish.activation" as const;
export const PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE = "site_version" as const;
export const PUBLISH_ACTIVATION_REQUEST_EVIDENCE_LINK_ROLE = "publish_activation_request_launch_readiness_evidence" as const;
export const PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION = "MVP-41" as const;

export const PUBLISH_ACTIVATION_REQUEST_BOUNDARY_FLAGS = {
  createsApprovalRequest: true,
  createsApprovalDecision: false,
  createsGateAttempt: false,
  evaluatesGate: false,
  publishes: false,
  publishActivationApproved: false,
  publishActionBlocked: false,
  runtimeMutation: false,
  providerCalls: false,
  evidenceOnlyUntilDecision: true,
} as const;

export type PublishActivationRequestBridgeActor = {
  actorType: Extract<AafActorType, "human" | "system">;
  actorId: string;
  actorRole: string;
};

export type PublishActivationRequestSourceRef = {
  sourceTable: string;
  sourceRecordId: string;
  sourceWatermark: string;
  sourceSystem?: string | null;
  sourceVersion?: string | number | null;
  sourceRef?: string | null;
  contentHash?: string | null;
  metadataJson?: AafJsonObject;
};

export type PublishActivationSubjectRef = PublishActivationRequestSourceRef & {
  role: string;
};

export type PreparePublishActivationRequestInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  launchReadinessRecordId: string;
  launchReadinessEvidencePackageId: string;
  improvedCandidateSiteVersionRef: PublishActivationRequestSourceRef;
  improvedRuntimeArtifactRef: PublishActivationRequestSourceRef;
  publishTargetRef: PublishActivationRequestSourceRef;
  actor: PublishActivationRequestBridgeActor;
  correlationId: string;
  causationId?: string | null;
  requestId?: string | null;
  idempotencyKey: string;
  policyVersion?: string | null;
  requestedExpiresAt?: string | null;
  expectedLaunchReadinessEvidenceWatermark?: string | null;
  expectedLaunchReadinessStatus?: "ready" | "ready_with_limitations" | null;
  publishActivationSubjectRefs?: readonly PublishActivationSubjectRef[];
  operatorNotes?: readonly unknown[];
};

export type ValidateLaunchReadinessEvidenceForPublishActivationRequestInput = Omit<
  PreparePublishActivationRequestInput,
  "actor" | "correlationId" | "causationId" | "requestId" | "idempotencyKey" | "requestedExpiresAt" | "operatorNotes"
>;

export type PublishActivationRequestValidationResult = {
  valid: boolean;
  status: "valid" | "missing" | "invalid" | "stale" | "blocked";
  blockerCodes: string[];
  evidencePackageId: string | null;
  evidencePackageRef: string | null;
  launchReadinessStatus: string | null;
  semanticWatermark: string;
  limitations: unknown[];
  sourceRefs: PublishActivationRequestOutputSourceRefs;
};

export type PublishActivationRequestOutputSourceRefs = {
  tenant: string;
  client: string;
  site: string;
  migration: string;
  launchReadinessRecord: string;
  launchReadinessEvidencePackage: string | null;
  improvedCandidateSiteVersion: PublishActivationRequestSourceRef;
  improvedRuntimeArtifact: PublishActivationRequestSourceRef;
  publishTarget: PublishActivationRequestSourceRef;
  additionalSubjectRefs: PublishActivationSubjectRef[];
};

export type PreparedPublishActivationRequest = {
  requestId: string;
  requestRef: string;
  launchReadinessEvidencePackageId: string;
  launchReadinessEvidencePackageRef: string;
  scope: typeof PUBLISH_ACTIVATION_REQUEST_SCOPE;
  action: typeof PUBLISH_ACTIVATION_REQUEST_ACTION;
  subjectType: typeof PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE;
  subjectId: string;
  status: "requested" | string;
  sourceRefs: PublishActivationRequestOutputSourceRefs;
  limitationsCarriedForward: unknown[];
  semanticWatermark: string;
  idempotency: {
    key: string;
    requestKey: string;
    evidenceLinkKey: string;
    policyEvaluationKey: string;
    auditEventKey: string;
    result: "created" | "reused";
  };
  approvalRequest: AafRecord;
  subjectRefs: AafRecord[];
  evidenceLink: AafRecord | null;
  policyEvaluation: AafRecord;
  requestedAuditEvent: AafRecord;
  flags: typeof PUBLISH_ACTIVATION_REQUEST_BOUNDARY_FLAGS;
};

type BridgeWriter = Pick<AafWriterRepository, "withTransaction" | "createApprovalRequestTransaction">;

function optionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function requiredText(field: string, value: unknown): string {
  const normalized = optionalText(value);
  if (!normalized) throw new PublishActivationRequestBridgeError(`missing required publish activation request field: ${field}`, [`missing_${field}`]);
  return normalized;
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

export function stablePublishActivationRequestJson(value: unknown): string {
  return JSON.stringify(stableJsonValue(value));
}

export function hashPublishActivationRequestValue(value: unknown): string {
  return createHash("sha256").update(stablePublishActivationRequestJson(value)).digest("hex");
}

function tenantScope(input: { tenantId: string; clientId: string; siteId: string; improvedCandidateSiteVersionRef: PublishActivationRequestSourceRef }): AafTenantScopeInput {
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

export type PublishActivationRequestSemanticInput = Omit<
  PreparePublishActivationRequestInput,
  "actor" | "correlationId" | "causationId" | "requestId" | "idempotencyKey" | "requestedExpiresAt" | "operatorNotes"
>;

export function computePublishActivationRequestSemanticWatermark(input: PublishActivationRequestSemanticInput): string {
  return `single-site-publish-activation-request:${hashPublishActivationRequestValue({
    bridgeVersion: PUBLISH_ACTIVATION_REQUEST_BRIDGE_VERSION,
    scope: PUBLISH_ACTIVATION_REQUEST_SCOPE,
    action: PUBLISH_ACTIVATION_REQUEST_ACTION,
    subjectType: PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    migrationId: input.migrationId,
    launchReadinessRecordId: input.launchReadinessRecordId,
    launchReadinessEvidencePackageId: input.launchReadinessEvidencePackageId,
    improvedCandidateSiteVersionRef: sourceRefForWatermark(input.improvedCandidateSiteVersionRef),
    improvedRuntimeArtifactRef: sourceRefForWatermark(input.improvedRuntimeArtifactRef),
    publishTargetRef: sourceRefForWatermark(input.publishTargetRef),
    expectedLaunchReadinessEvidenceWatermark: optionalText(input.expectedLaunchReadinessEvidenceWatermark),
    expectedLaunchReadinessStatus: optionalText(input.expectedLaunchReadinessStatus),
    publishActivationSubjectRefs: (input.publishActivationSubjectRefs ?? []).map((ref) => ({
      role: requiredText("publishActivationSubjectRefs.role", ref.role),
      ...sourceRefForWatermark(ref),
    })),
    policyVersion: optionalText((input as { policyVersion?: string | null }).policyVersion) ?? PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION,
  })}`;
}

export function buildPublishActivationRequestIdempotencyKeys(input: Pick<PreparePublishActivationRequestInput, "idempotencyKey">): PreparedPublishActivationRequest["idempotency"] {
  const key = requiredText("idempotencyKey", input.idempotencyKey);
  return {
    key,
    requestKey: `${key}:publish-activation-request`,
    evidenceLinkKey: `${key}:publish-activation-request:evidence-link`,
    policyEvaluationKey: `${key}:publish-activation-request:policy`,
    auditEventKey: `${key}:publish-activation-request:audit`,
    result: "created",
  };
}

export class PublishActivationRequestBridgeError extends Error {
  constructor(
    message: string,
    readonly blockerCodes: readonly string[],
  ) {
    super(message);
    this.name = "PublishActivationRequestBridgeError";
  }
}

function rowText(row: Record<string, unknown> | null | undefined, field: string): string | null {
  return optionalText(row?.[field]);
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
  const severity = optionalText(record.severity);
  const status = optionalText(record.status);
  if (severity === "p0_blocker" && status === "open") return true;
  return Object.values(record).some(containsOpenP0Blocker);
}

function sourceRefs(input: ValidateLaunchReadinessEvidenceForPublishActivationRequestInput): PublishActivationRequestOutputSourceRefs {
  return {
    tenant: requiredText("tenantId", input.tenantId),
    client: requiredText("clientId", input.clientId),
    site: requiredText("siteId", input.siteId),
    migration: requiredText("migrationId", input.migrationId),
    launchReadinessRecord: requiredText("launchReadinessRecordId", input.launchReadinessRecordId),
    launchReadinessEvidencePackage: requiredText("launchReadinessEvidencePackageId", input.launchReadinessEvidencePackageId),
    improvedCandidateSiteVersion: input.improvedCandidateSiteVersionRef,
    improvedRuntimeArtifact: input.improvedRuntimeArtifactRef,
    publishTarget: input.publishTargetRef,
    additionalSubjectRefs: [...(input.publishActivationSubjectRefs ?? [])],
  };
}

function collectDimensionBlockers(payload: Record<string, unknown>): string[] {
  const blockers: string[] = [];
  const dimensionStatuses = jsonObject(payload.dimensionStatuses);
  const requiredDimensions = jsonArray(payload.requiredDimensions).map(String).filter(Boolean);
  if (requiredDimensions.length === 0) blockers.push("required_dimensions_missing");

  for (const dimension of requiredDimensions) {
    const summary = jsonObject(dimensionStatuses[dimension]);
    const status = optionalText(summary.status);
    const freshnessStatus = optionalText(summary.freshnessStatus);
    if (!status) blockers.push(`dimension_summary_missing:${dimension}`);
    if (status && !["ready", "ready_with_limitations"].includes(status)) blockers.push(`dimension_not_ready:${dimension}:${status}`);
    if (!freshnessStatus) blockers.push(`dimension_freshness_missing:${dimension}`);
  }

  const freshness = jsonArray(payload.freshness).map(jsonObject);
  if (freshness.length === 0) blockers.push("freshness_summary_missing");
  for (const key of ["launch_readiness_record", ...requiredDimensions]) {
    const summary = freshness.find((item) => optionalText(item.key) === key);
    if (!summary) {
      blockers.push(`freshness_summary_missing:${key}`);
      continue;
    }
    const freshnessStatus = optionalText(summary.freshnessStatus);
    const acceptedLimitation = summary.acceptedLimitation === true;
    if (!["fresh", "not_applicable"].includes(String(freshnessStatus)) && !acceptedLimitation) {
      blockers.push(`freshness_not_current:${key}:${freshnessStatus ?? "missing"}`);
    }
  }

  if (jsonArray(payload.blockedDimensions).length > 0) blockers.push("blocked_dimensions_present");
  if (containsOpenP0Blocker(payload)) blockers.push("open_p0_blocker_present");
  return blockers;
}

function limitationsFromPayload(payload: Record<string, unknown>): unknown[] {
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

async function readEvidenceSourceRefs(client: AafPgClient, evidencePackageId: string): Promise<Record<string, unknown>[]> {
  const result = await client.query(
    `select * from public.gnr8_aaf_evidence_package_source_refs where evidence_package_id = $1::uuid`,
    [evidencePackageId],
  );
  return result.rows;
}

async function latestFreshness(client: AafPgClient, evidencePackageId: string): Promise<Record<string, unknown> | null> {
  return readOne(
    client,
    `
    select *
    from public.gnr8_aaf_evidence_package_freshness_checks
    where evidence_package_id = $1::uuid
    order by checked_at desc, created_at desc
    limit 1
    `,
    [evidencePackageId],
  );
}

async function existingRequest(client: AafPgClient, input: PreparePublishActivationRequestInput): Promise<Record<string, unknown> | null> {
  const keys = buildPublishActivationRequestIdempotencyKeys(input);
  const policyVersion = optionalText(input.policyVersion) ?? PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION;
  return readOne(
    client,
    `
    select *
    from public.gnr8_aaf_approval_requests
    where tenant_id = $1
      and scope = $2
      and subject_type = $3
      and subject_id = $4
      and policy_version = $5
      and idempotency_key = $6
    limit 1
    `,
    [
      input.tenantId,
      PUBLISH_ACTIVATION_REQUEST_SCOPE,
      PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
      input.improvedCandidateSiteVersionRef.sourceRecordId,
      policyVersion,
      keys.requestKey,
    ],
  );
}

function validationFailure(
  input: ValidateLaunchReadinessEvidenceForPublishActivationRequestInput,
  status: PublishActivationRequestValidationResult["status"],
  blockerCodes: string[],
): PublishActivationRequestValidationResult {
  return {
    valid: false,
    status,
    blockerCodes,
    evidencePackageId: optionalText(input.launchReadinessEvidencePackageId),
    evidencePackageRef: optionalText(input.launchReadinessEvidencePackageId) ? `aaf:evidence_package:${input.launchReadinessEvidencePackageId}` : null,
    launchReadinessStatus: null,
    semanticWatermark: computePublishActivationRequestSemanticWatermark(input),
    limitations: [],
    sourceRefs: sourceRefs(input),
  };
}

export class SingleSitePublishActivationRequestBridge {
  constructor(private readonly writer: BridgeWriter = new AafWriterRepository()) {}

  async validateLaunchReadinessEvidenceForPublishActivationRequest(
    input: ValidateLaunchReadinessEvidenceForPublishActivationRequestInput,
  ): Promise<PublishActivationRequestValidationResult> {
    requiredText("tenantId", input.tenantId);
    requiredText("clientId", input.clientId);
    requiredText("siteId", input.siteId);
    requiredText("migrationId", input.migrationId);
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

    return this.writer.withTransaction(async (tx) => {
      const evidence = await readOne(tx.client, `select * from public.gnr8_aaf_evidence_packages where id = $1::uuid`, [
        input.launchReadinessEvidencePackageId,
      ]);
      if (!evidence) return validationFailure(input, "missing", ["launch_readiness_evidence_package_missing"]);

      const blockers: string[] = [];
      const payload = jsonObject(evidence.limitations_json);
      const identity = jsonObject(payload.identity);
      const readinessStatus = optionalText(payload.readinessStatus);
      const expectedStatus = optionalText(input.expectedLaunchReadinessStatus);
      const evidenceWatermark = rowText(evidence, "source_watermark");
      const sourceRefRows = await readEvidenceSourceRefs(tx.client, input.launchReadinessEvidencePackageId);
      const freshness = await latestFreshness(tx.client, input.launchReadinessEvidencePackageId);

      if (rowText(evidence, "package_type") !== AAF_SINGLE_SITE_LAUNCH_READINESS_EVIDENCE_TYPE) blockers.push("evidence_type_mismatch");
      if (rowText(evidence, "subject_type") !== "single_site_launch_readiness_package") blockers.push("evidence_subject_type_mismatch");
      if (rowText(evidence, "subject_id") !== input.launchReadinessRecordId) blockers.push("launch_readiness_record_mismatch");
      if (!sameTenantScope(input, evidence)) blockers.push("tenant_client_site_mismatch");
      if (rowText(evidence, "site_version_id") !== input.improvedCandidateSiteVersionRef.sourceRecordId) {
        blockers.push("evidence_site_version_mismatch");
      }
      if (["invalid", "superseded"].includes(String(rowText(evidence, "status")))) blockers.push(`evidence_${rowText(evidence, "status")}`);
      if (!["fresh", "partial_timeline"].includes(String(rowText(evidence, "freshness_label")))) {
        blockers.push(`evidence_freshness_${rowText(evidence, "freshness_label") ?? "missing"}`);
      }
      if (input.expectedLaunchReadinessEvidenceWatermark && evidenceWatermark !== input.expectedLaunchReadinessEvidenceWatermark) {
        blockers.push("expected_launch_readiness_evidence_watermark_mismatch");
      }
      if (identity.tenantId !== input.tenantId) blockers.push("payload_tenant_id_mismatch");
      if (identity.clientId !== input.clientId) blockers.push("payload_client_id_mismatch");
      if (identity.siteId !== input.siteId) blockers.push("payload_site_id_mismatch");
      if (identity.migrationId !== input.migrationId) blockers.push("payload_migration_id_mismatch");
      if (identity.launchReadinessRecordId !== input.launchReadinessRecordId) blockers.push("payload_launch_readiness_record_mismatch");
      if (!["ready", "ready_with_limitations"].includes(String(readinessStatus))) blockers.push(`readiness_status_${readinessStatus ?? "missing"}`);
      if (expectedStatus && readinessStatus !== expectedStatus) blockers.push("expected_launch_readiness_status_mismatch");
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

      blockers.push(...collectDimensionBlockers(payload));
      const uniqueBlockers = Array.from(new Set(blockers)).sort((left, right) => left.localeCompare(right));
      if (uniqueBlockers.length > 0) {
        return {
          ...validationFailure(input, uniqueBlockers.some((code) => /blocked|p0/.test(code)) ? "blocked" : "invalid", uniqueBlockers),
          launchReadinessStatus: readinessStatus,
        };
      }

      const limitations = limitationsFromPayload(payload);
      return {
        valid: true,
        status: "valid",
        blockerCodes: [],
        evidencePackageId: input.launchReadinessEvidencePackageId,
        evidencePackageRef: `aaf:evidence_package:${input.launchReadinessEvidencePackageId}`,
        launchReadinessStatus: readinessStatus,
        semanticWatermark: computePublishActivationRequestSemanticWatermark(input),
        limitations,
        sourceRefs: sourceRefs(input),
      };
    });
  }

  async preparePublishActivationRequestFromLaunchReadiness(input: PreparePublishActivationRequestInput): Promise<PreparedPublishActivationRequest> {
    requiredText("actor.actorType", input.actor?.actorType);
    requiredText("actor.actorId", input.actor?.actorId);
    requiredText("actor.actorRole", input.actor?.actorRole);
    requiredText("correlationId", input.correlationId);
    requiredText("idempotencyKey", input.idempotencyKey);

    const validation = await this.validateLaunchReadinessEvidenceForPublishActivationRequest(input);
    if (!validation.valid) {
      throw new PublishActivationRequestBridgeError("launch readiness evidence refused for publish activation request", validation.blockerCodes);
    }

    const policyVersion = optionalText(input.policyVersion) ?? PUBLISH_ACTIVATION_REQUEST_POLICY_VERSION;
    const keys = buildPublishActivationRequestIdempotencyKeys(input);
    const reusedBeforeWrite = Boolean(await this.writer.withTransaction((tx) => existingRequest(tx.client, input)));
    const scope = tenantScope(input);
    const subject = {
      subjectType: PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
      subjectId: input.improvedCandidateSiteVersionRef.sourceRecordId,
    };
    const semanticWatermark = validation.semanticWatermark;
    const limitations = validation.limitations;
    const subjectRefs = buildRequestSubjectRefs(input, validation);

    const requestTx = await this.writer.createApprovalRequestTransaction({
      approvalRequest: {
        ...scope,
        ...subject,
        correlationId: input.correlationId,
        causationId: input.causationId ?? null,
        requestId: input.requestId ?? null,
        idempotencyKey: keys.requestKey,
        scope: PUBLISH_ACTIVATION_REQUEST_SCOPE,
        requesterActorType: input.actor.actorType,
        requesterActorId: input.actor.actorId,
        requesterRole: input.actor.actorRole,
        status: "requested",
        policyVersion,
        requestedExpiresAt: input.requestedExpiresAt ?? null,
        reason: `Request non-executing publish activation approval for site version ${subject.subjectId} from launch readiness evidence ${input.launchReadinessEvidencePackageId}.`,
        privacyLabel: "client_confidential",
        retentionClass: "compliance_long",
      },
      subjectRefs,
      evidenceLink: {
        evidencePackageId: input.launchReadinessEvidencePackageId,
        linkRole: PUBLISH_ACTIVATION_REQUEST_EVIDENCE_LINK_ROLE,
        sourceNote: "Direct MVP-40 single-site launch readiness evidence package. No wrapper publish activation evidence package created.",
        idempotencyKey: keys.evidenceLinkKey,
      },
      policyEvaluation: {
        ...scope,
        policyVersion,
        result: "approval_required",
        scope: PUBLISH_ACTIVATION_REQUEST_SCOPE,
        actionKey: PUBLISH_ACTIVATION_REQUEST_ACTION,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        actorType: input.actor.actorType,
        actorId: input.actor.actorId,
        actorRole: input.actor.actorRole,
        evidencePackageId: input.launchReadinessEvidencePackageId,
        blockerCodes: [],
        privacyLabel: "client_confidential",
        retentionClass: "compliance_long",
        idempotencyKey: keys.policyEvaluationKey,
      },
      requestedAuditEvent: {
        ...scope,
        eventName: "single_site.publish_activation.requested",
        eventFamily: "approval",
        severity: "notice",
        replayClass: AAF_SCOPE_REPLAY_CLASS[PUBLISH_ACTIVATION_REQUEST_SCOPE],
        actorType: input.actor.actorType,
        actorId: input.actor.actorId,
        actorRole: input.actor.actorRole,
        subjectType: subject.subjectType,
        subjectId: subject.subjectId,
        sourceRefJson: {
          migrationId: input.migrationId,
          launchReadinessRecordId: input.launchReadinessRecordId,
          launchReadinessEvidencePackageId: input.launchReadinessEvidencePackageId,
          nonExecuting: true,
        },
        payloadJson: {
          bridgeVersion: PUBLISH_ACTIVATION_REQUEST_BRIDGE_VERSION,
          scope: PUBLISH_ACTIVATION_REQUEST_SCOPE,
          action: PUBLISH_ACTIVATION_REQUEST_ACTION,
          semanticWatermark,
          launchReadinessStatus: validation.launchReadinessStatus,
          launchReadinessEvidencePackageId: input.launchReadinessEvidencePackageId,
          improvedCandidateSiteVersionRef: sourceRefForWatermark(input.improvedCandidateSiteVersionRef),
          improvedRuntimeArtifactRef: sourceRefForWatermark(input.improvedRuntimeArtifactRef),
          publishTargetRef: sourceRefForWatermark(input.publishTargetRef),
          limitationsCarriedForward: limitations,
          operatorNotes: jsonArray(input.operatorNotes),
          flags: PUBLISH_ACTIVATION_REQUEST_BOUNDARY_FLAGS,
        },
        privacyLabel: "client_confidential",
        redactionLabel: "none",
        retentionClass: "compliance_long",
        idempotencyKey: keys.auditEventKey,
      },
    } satisfies ApprovalRequestTransactionInput);

    return preparedResult(input, validation, requestTx, {
      ...keys,
      result: reusedBeforeWrite ? "reused" : "created",
    });
  }
}

function buildRequestSubjectRefs(
  input: PreparePublishActivationRequestInput,
  validation: PublishActivationRequestValidationResult,
): ApprovalRequestTransactionInput["subjectRefs"] {
  const subjectType = PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE;
  const subjectId = input.improvedCandidateSiteVersionRef.sourceRecordId;
  const baseRefs: PublishActivationSubjectRef[] = [
    { role: "tenant", sourceTable: "tenants", sourceRecordId: input.tenantId, sourceWatermark: input.tenantId },
    { role: "client", sourceTable: "clients", sourceRecordId: input.clientId, sourceWatermark: input.clientId },
    { role: "site", sourceTable: "sites", sourceRecordId: input.siteId, sourceWatermark: input.siteId },
    { role: "single_site_migration", sourceTable: "gnr8_single_site_migrations", sourceRecordId: input.migrationId, sourceWatermark: validation.semanticWatermark },
    {
      role: "launch_readiness_record",
      sourceTable: "gnr8_single_site_launch_readiness_records",
      sourceRecordId: input.launchReadinessRecordId,
      sourceWatermark: validation.semanticWatermark,
    },
    {
      role: "launch_readiness_evidence_package",
      sourceTable: "gnr8_aaf_evidence_packages",
      sourceRecordId: input.launchReadinessEvidencePackageId,
      sourceWatermark: input.expectedLaunchReadinessEvidenceWatermark ?? validation.semanticWatermark,
    },
    { role: "improved_candidate_site_version", ...input.improvedCandidateSiteVersionRef },
    { role: "improved_runtime_artifact", ...input.improvedRuntimeArtifactRef },
    { role: "publish_target", ...input.publishTargetRef },
    {
      role: "limitations",
      sourceTable: "gnr8_aaf_evidence_packages",
      sourceRecordId: input.launchReadinessEvidencePackageId,
      sourceWatermark: `limitations:${hashPublishActivationRequestValue(validation.limitations)}`,
    },
    ...(input.publishActivationSubjectRefs ?? []),
  ];

  return baseRefs.map((ref) => ({
    subjectType,
    subjectId,
    sourceSystem: optionalText(ref.sourceSystem) ?? "gnr8",
    sourceTable: ref.sourceTable,
    sourceRecordId: ref.sourceRecordId,
    sourceVersion: optionalText(ref.sourceVersion),
    sourceWatermark: ref.sourceWatermark,
    metadataJson: {
      ...(ref.metadataJson ?? {}),
      bridgeSubjectRole: ref.role,
      semanticWatermark: validation.semanticWatermark,
      nonExecuting: true,
      evidenceOnlyUntilDecision: true,
    },
  }));
}

function preparedResult(
  input: PreparePublishActivationRequestInput,
  validation: PublishActivationRequestValidationResult,
  requestTx: ApprovalRequestTransactionResult,
  idempotency: PreparedPublishActivationRequest["idempotency"],
): PreparedPublishActivationRequest {
  return {
    requestId: requestTx.approvalRequest.id,
    requestRef: `aaf:approval_request:${requestTx.approvalRequest.id}`,
    launchReadinessEvidencePackageId: input.launchReadinessEvidencePackageId,
    launchReadinessEvidencePackageRef: `aaf:evidence_package:${input.launchReadinessEvidencePackageId}`,
    scope: PUBLISH_ACTIVATION_REQUEST_SCOPE,
    action: PUBLISH_ACTIVATION_REQUEST_ACTION,
    subjectType: PUBLISH_ACTIVATION_REQUEST_SUBJECT_TYPE,
    subjectId: input.improvedCandidateSiteVersionRef.sourceRecordId,
    status: String(requestTx.approvalRequest.status ?? "requested"),
    sourceRefs: validation.sourceRefs,
    limitationsCarriedForward: validation.limitations,
    semanticWatermark: validation.semanticWatermark,
    idempotency,
    approvalRequest: requestTx.approvalRequest,
    subjectRefs: requestTx.subjectRefs,
    evidenceLink: requestTx.evidenceLink,
    policyEvaluation: requestTx.policyEvaluation,
    requestedAuditEvent: requestTx.auditEvent,
    flags: PUBLISH_ACTIVATION_REQUEST_BOUNDARY_FLAGS,
  };
}

export function validateLaunchReadinessEvidenceForPublishActivationRequest(
  input: ValidateLaunchReadinessEvidenceForPublishActivationRequestInput,
): Promise<PublishActivationRequestValidationResult> {
  return new SingleSitePublishActivationRequestBridge().validateLaunchReadinessEvidenceForPublishActivationRequest(input);
}

export function preparePublishActivationRequestFromLaunchReadiness(
  input: PreparePublishActivationRequestInput,
): Promise<PreparedPublishActivationRequest> {
  return new SingleSitePublishActivationRequestBridge().preparePublishActivationRequestFromLaunchReadiness(input);
}
