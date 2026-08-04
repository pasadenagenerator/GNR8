import "server-only";

import { createHash } from "node:crypto";

import { getSuperadminPool } from "../../src/superadmin/db";
import { SingleSiteIdempotencyConflictError, SingleSiteStateWriterError } from "./single-site-state-contracts";
import type { SingleSitePgClient } from "./single-site-state-writer-repository";

export type LaunchReadinessWriterTx = SingleSitePgClient & {
  release?: () => void;
};

export type LaunchReadinessWriterPool = {
  connect(): Promise<LaunchReadinessWriterTx>;
};

export type LaunchReadinessRecordStatus =
  | "draft"
  | "collecting_evidence"
  | "ready"
  | "ready_with_limitations"
  | "blocked"
  | "stale"
  | "superseded"
  | "cancelled";

export type LaunchReadinessFreshnessStatus = "fresh" | "stale" | "missing" | "unknown" | "not_applicable";
export type LaunchReadinessDimensionStatus = "ready" | "ready_with_limitations" | "blocked" | "stale" | "missing" | "not_applicable" | "unknown";
export type LaunchReadinessBlockerSeverity = "p0_blocker" | "p1_major" | "p2_minor" | "p3_note";
export type LaunchReadinessBlockerStatus = "open" | "resolved" | "accepted_limitation" | "superseded" | "cancelled";
export type LaunchReadinessEventAction =
  | "readiness_created"
  | "evidence_collection_started"
  | "dimension_recorded"
  | "dimension_ref_recorded"
  | "blocker_opened"
  | "blocker_resolved"
  | "limitation_accepted"
  | "readiness_marked_ready"
  | "readiness_marked_ready_with_limitations"
  | "readiness_blocked"
  | "readiness_marked_stale"
  | "readiness_superseded"
  | "readiness_cancelled"
  | "closeout_recorded";

export type LaunchReadinessActor = {
  actorType: "human" | "system" | "provider" | "external_reference" | "ai_advisory";
  actorId: string;
  actorRole: string;
  actorDisplayLabel?: string | null;
};

export type LaunchReadinessEnvelope = {
  actor: LaunchReadinessActor;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  privacyLabel?: string | null;
  retentionClass?: string | null;
  metadataJson?: Record<string, unknown>;
};

export type LaunchReadinessRecordRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  site_id: string;
  migration_id: string;
  launch_approval_ref: string;
  launch_approval_source_watermark: string | null;
  improved_candidate_site_version_ref: string;
  improved_runtime_artifact_ref: string;
  status: LaunchReadinessRecordStatus;
  freshness_status: LaunchReadinessFreshnessStatus;
  semantic_source_watermark: string;
  readiness_summary_json: unknown;
  limitation_summary_json: unknown;
  blocker_summary_json: unknown;
  actor_type: string;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  request_id: string | null;
  privacy_label: string;
  retention_class: string;
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

export type LaunchReadinessDimensionRow = {
  id: string;
  readiness_id: string;
  dimension: string;
  dimension_status: LaunchReadinessDimensionStatus;
  source_refs_json: unknown;
  source_watermark: string | null;
  freshness_status: LaunchReadinessFreshnessStatus;
  source_captured_at: string | null;
  freshness_checked_at: string | null;
  fresh_until: string | null;
  stale_at: string | null;
  missing_at: string | null;
  blocker_refs_json: unknown;
  limitations_json: unknown;
  diagnostics_json: unknown;
  required_for_launch_readiness: boolean;
  required_for_publish_activation: boolean;
  actor_type: string;
  actor_id: string;
  actor_role: string;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  privacy_label: string;
  retention_class: string;
  metadata_json: unknown;
  created_at: string;
  updated_at: string;
};

export type LaunchReadinessRefRow = {
  id: string;
  readiness_id: string;
  dimension_id: string | null;
  ref_role: string;
  source_system: string;
  source_table: string | null;
  source_type: string;
  source_record_id: string;
  source_ref: string;
  source_version: string | null;
  source_watermark: string | null;
  metadata_json: unknown;
  idempotency_key: string;
  created_at: string;
};

export type LaunchReadinessBlockerRow = {
  id: string;
  readiness_id: string;
  dimension_id: string | null;
  severity: LaunchReadinessBlockerSeverity;
  category: string;
  status: LaunchReadinessBlockerStatus;
  description: string;
  source_refs_json: unknown;
  resolution_refs_json: unknown;
  actor_type: string;
  actor_id: string;
  actor_role: string;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  privacy_label: string;
  retention_class: string;
  metadata_json: unknown;
  created_at: string;
  resolved_at: string | null;
  updated_at: string;
};

export type LaunchReadinessEventRow = {
  id: string;
  readiness_id: string;
  dimension_id: string | null;
  blocker_id: string | null;
  event_index: number;
  event_action: LaunchReadinessEventAction;
  from_status: LaunchReadinessRecordStatus | null;
  to_status: LaunchReadinessRecordStatus | null;
  actor_type: string;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  details_json: unknown;
  source_watermark: string | null;
  semantic_watermark: string | null;
  payload_hash: string | null;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  request_id: string | null;
  privacy_label: string;
  retention_class: string;
  metadata_json: unknown;
  occurred_at: string;
  created_at: string;
};

export type LaunchReadinessCloseoutRow = {
  id: string;
  readiness_id: string;
  final_status: LaunchReadinessRecordStatus;
  final_evidence_summary_json: unknown;
  final_limitations_json: unknown;
  final_blockers_json: unknown;
  publish_activation_handoff_refs_json: unknown;
  actor_type: string;
  actor_id: string;
  actor_role: string;
  actor_display_label: string | null;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  request_id: string | null;
  privacy_label: string;
  retention_class: string;
  metadata_json: unknown;
  created_at: string;
};

type InsertableRow = Record<string, unknown>;

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
  return value;
}

export function hashLaunchReadinessWriterValue(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableJsonValue(value))).digest("hex");
}

function toPg(value: unknown): unknown {
  if (value === undefined) return null;
  if (value && typeof value === "object" && !(value instanceof Date)) return JSON.stringify(stableJsonValue(value));
  return value;
}

function semanticValue(value: unknown): string {
  if (value && typeof value === "object") return JSON.stringify(stableJsonValue(value));
  if (typeof value === "string") {
    try {
      return JSON.stringify(stableJsonValue(JSON.parse(value)));
    } catch {
      return JSON.stringify(value);
    }
  }
  return JSON.stringify(value ?? null);
}

function compactRow(row: InsertableRow): InsertableRow {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}

function requiredText(field: string, value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) throw new SingleSiteStateWriterError(`missing required launch readiness field: ${field}`);
  return text;
}

function optionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function defaultPrivacy(value: string | null | undefined): string {
  return optionalText(value) ?? "client_confidential";
}

function defaultRetention(value: string | null | undefined): string {
  return optionalText(value) ?? "compliance_long";
}

function assertSemanticMatch(tableName: string, idempotencyKey: string, attempted: InsertableRow, existing: InsertableRow, fields: readonly string[]): void {
  const drifted = fields.filter((field) => semanticValue(attempted[field]) !== semanticValue(existing[field]));
  if (drifted.length > 0) throw new SingleSiteIdempotencyConflictError(tableName, idempotencyKey, drifted);
}

async function insertReturning<T extends Record<string, unknown>>(
  client: SingleSitePgClient,
  tableName: string,
  row: InsertableRow,
  semanticFields: readonly string[],
): Promise<{ row: T; reusedExisting: boolean }> {
  const payload = compactRow(row);
  const columns = Object.keys(payload);
  const values = columns.map((column) => toPg(payload[column]));
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const inserted = await client.query(
    `insert into public.${tableName} (${columns.join(", ")})
     values (${placeholders.join(", ")})
     on conflict (idempotency_key) do nothing
     returning *`,
    values,
  );
  if (inserted.rows[0]) return { row: inserted.rows[0] as T, reusedExisting: false };
  const idempotencyKey = requiredText("idempotency_key", row.idempotency_key);
  const existing = await client.query(`select * from public.${tableName} where idempotency_key = $1 limit 1`, [idempotencyKey]);
  const existingRow = existing.rows[0] as T | undefined;
  if (!existingRow) throw new SingleSiteStateWriterError(`idempotent insert into ${tableName} did not find existing row`);
  assertSemanticMatch(tableName, idempotencyKey, payload, existingRow, semanticFields);
  return { row: existingRow, reusedExisting: true };
}

async function withTransaction<T>(pool: LaunchReadinessWriterPool, fn: (client: LaunchReadinessWriterTx) => Promise<T>): Promise<T> {
  const client = (await pool.connect()) as LaunchReadinessWriterTx;
  let started = false;
  try {
    await client.query("begin");
    started = true;
    const result = await fn(client);
    await client.query("commit");
    started = false;
    return result;
  } catch (error) {
    if (started) {
      try {
        await client.query("rollback");
      } catch {
        // Best-effort rollback after a failed launch readiness writer transaction.
      }
    }
    throw error;
  } finally {
    client.release?.();
  }
}

export type CreateOrReuseLaunchReadinessRecordInput = LaunchReadinessEnvelope & {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  launchApprovalRef: string;
  launchApprovalSourceWatermark?: string | null;
  improvedCandidateSiteVersionRef: string;
  improvedRuntimeArtifactRef: string;
  status: LaunchReadinessRecordStatus;
  freshnessStatus: LaunchReadinessFreshnessStatus;
  semanticSourceWatermark: string;
  readinessSummaryJson: Record<string, unknown>;
  limitationSummaryJson: readonly unknown[];
  blockerSummaryJson: readonly unknown[];
};

export type CreateOrReuseLaunchReadinessDimensionInput = LaunchReadinessEnvelope & {
  readinessId: string;
  dimension: string;
  dimensionStatus: LaunchReadinessDimensionStatus;
  sourceRefsJson: readonly unknown[];
  sourceWatermark?: string | null;
  freshnessStatus: LaunchReadinessFreshnessStatus;
  sourceCapturedAt?: string | null;
  freshUntil?: string | null;
  staleAt?: string | null;
  missingAt?: string | null;
  blockerRefsJson: readonly unknown[];
  limitationsJson: readonly unknown[];
  diagnosticsJson: Record<string, unknown>;
  requiredForLaunchReadiness: boolean;
  requiredForPublishActivation: boolean;
};

export type CreateOrReuseLaunchReadinessRefInput = {
  readinessId: string;
  dimensionId?: string | null;
  refRole: string;
  sourceSystem?: string | null;
  sourceTable?: string | null;
  sourceType: string;
  sourceRecordId: string;
  sourceRef: string;
  sourceVersion?: string | null;
  sourceWatermark?: string | null;
  metadataJson?: Record<string, unknown>;
  idempotencyKey: string;
};

export type CreateOrReuseLaunchReadinessBlockerInput = LaunchReadinessEnvelope & {
  readinessId: string;
  dimensionId?: string | null;
  severity: LaunchReadinessBlockerSeverity;
  category: string;
  status: LaunchReadinessBlockerStatus;
  description: string;
  sourceRefsJson: readonly unknown[];
  resolutionRefsJson?: readonly unknown[];
  resolvedAt?: string | null;
};

export type CreateOrReuseLaunchReadinessEventInput = LaunchReadinessEnvelope & {
  readinessId: string;
  dimensionId?: string | null;
  blockerId?: string | null;
  eventIndex: number;
  eventAction: LaunchReadinessEventAction;
  fromStatus?: LaunchReadinessRecordStatus | null;
  toStatus?: LaunchReadinessRecordStatus | null;
  detailsJson?: Record<string, unknown>;
  sourceWatermark?: string | null;
  semanticWatermark?: string | null;
  payloadHash?: string | null;
};

export type CreateOrReuseLaunchReadinessCloseoutInput = LaunchReadinessEnvelope & {
  readinessId: string;
  finalStatus: "ready" | "ready_with_limitations";
  finalEvidenceSummaryJson: Record<string, unknown>;
  finalLimitationsJson: readonly unknown[];
  finalBlockersJson: readonly unknown[];
  publishActivationHandoffRefsJson: readonly unknown[];
};

export interface LaunchReadinessWriterRepositoryLike {
  withTransaction<T>(fn: (tx: LaunchReadinessWriterTx) => Promise<T>): Promise<T>;
  createOrReuseReadinessRecord(
    client: SingleSitePgClient,
    input: CreateOrReuseLaunchReadinessRecordInput,
  ): Promise<{ row: LaunchReadinessRecordRow; reusedExisting: boolean }>;
  updateReadinessStatus(
    client: SingleSitePgClient,
    input: {
      readinessId: string;
      status: LaunchReadinessRecordStatus;
      freshnessStatus: LaunchReadinessFreshnessStatus;
      readinessSummaryJson?: Record<string, unknown>;
      limitationSummaryJson?: readonly unknown[];
      blockerSummaryJson?: readonly unknown[];
      metadataJson?: Record<string, unknown>;
    },
  ): Promise<LaunchReadinessRecordRow>;
  createOrReuseDimension(
    client: SingleSitePgClient,
    input: CreateOrReuseLaunchReadinessDimensionInput,
  ): Promise<{ row: LaunchReadinessDimensionRow; reusedExisting: boolean }>;
  createOrReuseRef(client: SingleSitePgClient, input: CreateOrReuseLaunchReadinessRefInput): Promise<{ row: LaunchReadinessRefRow; reusedExisting: boolean }>;
  createOrReuseBlocker(
    client: SingleSitePgClient,
    input: CreateOrReuseLaunchReadinessBlockerInput,
  ): Promise<{ row: LaunchReadinessBlockerRow; reusedExisting: boolean }>;
  createOrReuseEvent(
    client: SingleSitePgClient,
    input: CreateOrReuseLaunchReadinessEventInput,
  ): Promise<{ row: LaunchReadinessEventRow; reusedExisting: boolean }>;
  createOrReuseCloseout(
    client: SingleSitePgClient,
    input: CreateOrReuseLaunchReadinessCloseoutInput,
  ): Promise<{ row: LaunchReadinessCloseoutRow; reusedExisting: boolean }>;
  getReadinessById(client: SingleSitePgClient, readinessId: string): Promise<LaunchReadinessRecordRow | null>;
  countOpenP0Blockers(client: SingleSitePgClient, readinessId: string): Promise<number>;
  nextEventIndex(client: SingleSitePgClient, readinessId: string): Promise<number>;
}

export class LaunchReadinessWriterRepository implements LaunchReadinessWriterRepositoryLike {
  constructor(private readonly pool: LaunchReadinessWriterPool = getSuperadminPool()) {}

  withTransaction<T>(fn: (tx: LaunchReadinessWriterTx) => Promise<T>): Promise<T> {
    return withTransaction(this.pool, fn);
  }

  async createOrReuseReadinessRecord(
    client: SingleSitePgClient,
    input: CreateOrReuseLaunchReadinessRecordInput,
  ): Promise<{ row: LaunchReadinessRecordRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      tenant_id: requiredText("tenantId", input.tenantId),
      client_id: requiredText("clientId", input.clientId),
      site_id: requiredText("siteId", input.siteId),
      migration_id: requiredText("migrationId", input.migrationId),
      launch_approval_ref: requiredText("launchApprovalRef", input.launchApprovalRef),
      launch_approval_source_watermark: optionalText(input.launchApprovalSourceWatermark),
      improved_candidate_site_version_ref: requiredText("improvedCandidateSiteVersionRef", input.improvedCandidateSiteVersionRef),
      improved_runtime_artifact_ref: requiredText("improvedRuntimeArtifactRef", input.improvedRuntimeArtifactRef),
      status: requiredText("status", input.status),
      freshness_status: requiredText("freshnessStatus", input.freshnessStatus),
      semantic_source_watermark: requiredText("semanticSourceWatermark", input.semanticSourceWatermark),
      readiness_summary_json: input.readinessSummaryJson,
      limitation_summary_json: input.limitationSummaryJson,
      blocker_summary_json: input.blockerSummaryJson,
      actor_type: input.actor.actorType,
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      actor_display_label: optionalText(input.actor.actorDisplayLabel),
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      request_id: optionalText(input.requestId),
      privacy_label: defaultPrivacy(input.privacyLabel),
      retention_class: defaultRetention(input.retentionClass),
      metadata_json: input.metadataJson ?? {},
    };
    return insertReturning<LaunchReadinessRecordRow>(client, "gnr8_single_site_launch_readiness_records", row, [
      "tenant_id",
      "client_id",
      "site_id",
      "migration_id",
      "launch_approval_ref",
      "launch_approval_source_watermark",
      "improved_candidate_site_version_ref",
      "improved_runtime_artifact_ref",
      "status",
      "freshness_status",
      "semantic_source_watermark",
      "readiness_summary_json",
      "limitation_summary_json",
      "blocker_summary_json",
      "actor_type",
      "actor_id",
      "actor_role",
      "correlation_id",
      "causation_id",
      "request_id",
      "metadata_json",
    ]);
  }

  async updateReadinessStatus(
    client: SingleSitePgClient,
    input: {
      readinessId: string;
      status: LaunchReadinessRecordStatus;
      freshnessStatus: LaunchReadinessFreshnessStatus;
      readinessSummaryJson?: Record<string, unknown>;
      limitationSummaryJson?: readonly unknown[];
      blockerSummaryJson?: readonly unknown[];
      metadataJson?: Record<string, unknown>;
    },
  ): Promise<LaunchReadinessRecordRow> {
    const current = await this.getReadinessById(client, input.readinessId);
    if (!current) throw new SingleSiteStateWriterError(`launch readiness record ${input.readinessId} not found`);
    const result = await client.query(
      `
      update public.gnr8_single_site_launch_readiness_records
      set status = $2,
          freshness_status = $3,
          readiness_summary_json = coalesce($4::jsonb, readiness_summary_json),
          limitation_summary_json = coalesce($5::jsonb, limitation_summary_json),
          blocker_summary_json = coalesce($6::jsonb, blocker_summary_json),
          metadata_json = coalesce($7::jsonb, metadata_json),
          updated_at = now()
      where id = $1::uuid
      returning *
      `,
      [
        input.readinessId,
        input.status,
        input.freshnessStatus,
        input.readinessSummaryJson === undefined ? null : JSON.stringify(stableJsonValue(input.readinessSummaryJson)),
        input.limitationSummaryJson === undefined ? null : JSON.stringify(stableJsonValue(input.limitationSummaryJson)),
        input.blockerSummaryJson === undefined ? null : JSON.stringify(stableJsonValue(input.blockerSummaryJson)),
        input.metadataJson === undefined ? null : JSON.stringify(stableJsonValue(input.metadataJson)),
      ],
    );
    const row = result.rows[0] as LaunchReadinessRecordRow | undefined;
    if (!row) throw new SingleSiteStateWriterError(`launch readiness record ${input.readinessId} status update failed`);
    return row;
  }

  async createOrReuseDimension(
    client: SingleSitePgClient,
    input: CreateOrReuseLaunchReadinessDimensionInput,
  ): Promise<{ row: LaunchReadinessDimensionRow; reusedExisting: boolean }> {
    const nowMarker = new Date(0).toISOString();
    const row: InsertableRow = {
      readiness_id: requiredText("readinessId", input.readinessId),
      dimension: requiredText("dimension", input.dimension),
      dimension_status: requiredText("dimensionStatus", input.dimensionStatus),
      source_refs_json: input.sourceRefsJson,
      source_watermark: optionalText(input.sourceWatermark),
      freshness_status: requiredText("freshnessStatus", input.freshnessStatus),
      source_captured_at: optionalText(input.sourceCapturedAt),
      freshness_checked_at: nowMarker,
      fresh_until: optionalText(input.freshUntil),
      stale_at: input.dimensionStatus === "stale" || input.freshnessStatus === "stale" ? nowMarker : optionalText(input.staleAt),
      missing_at: input.dimensionStatus === "missing" || input.freshnessStatus === "missing" ? nowMarker : optionalText(input.missingAt),
      blocker_refs_json: input.blockerRefsJson,
      limitations_json: input.limitationsJson,
      diagnostics_json: input.diagnosticsJson,
      required_for_launch_readiness: input.requiredForLaunchReadiness,
      required_for_publish_activation: input.requiredForPublishActivation,
      actor_type: input.actor.actorType,
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      privacy_label: defaultPrivacy(input.privacyLabel),
      retention_class: defaultRetention(input.retentionClass),
      metadata_json: input.metadataJson ?? {},
    };
    return insertReturning<LaunchReadinessDimensionRow>(client, "gnr8_single_site_launch_readiness_dimensions", row, [
      "readiness_id",
      "dimension",
      "dimension_status",
      "source_refs_json",
      "source_watermark",
      "freshness_status",
      "source_captured_at",
      "fresh_until",
      "blocker_refs_json",
      "limitations_json",
      "diagnostics_json",
      "required_for_launch_readiness",
      "required_for_publish_activation",
      "actor_type",
      "actor_id",
      "actor_role",
      "correlation_id",
      "causation_id",
      "metadata_json",
    ]);
  }

  async createOrReuseRef(client: SingleSitePgClient, input: CreateOrReuseLaunchReadinessRefInput): Promise<{ row: LaunchReadinessRefRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      readiness_id: requiredText("readinessId", input.readinessId),
      dimension_id: optionalText(input.dimensionId),
      ref_role: requiredText("refRole", input.refRole),
      source_system: optionalText(input.sourceSystem) ?? "gnr8",
      source_table: optionalText(input.sourceTable),
      source_type: requiredText("sourceType", input.sourceType),
      source_record_id: requiredText("sourceRecordId", input.sourceRecordId),
      source_ref: requiredText("sourceRef", input.sourceRef),
      source_version: optionalText(input.sourceVersion),
      source_watermark: optionalText(input.sourceWatermark),
      metadata_json: input.metadataJson ?? {},
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
    };
    return insertReturning<LaunchReadinessRefRow>(client, "gnr8_single_site_launch_readiness_refs", row, [
      "readiness_id",
      "dimension_id",
      "ref_role",
      "source_system",
      "source_table",
      "source_type",
      "source_record_id",
      "source_ref",
      "source_version",
      "source_watermark",
      "metadata_json",
    ]);
  }

  async createOrReuseBlocker(
    client: SingleSitePgClient,
    input: CreateOrReuseLaunchReadinessBlockerInput,
  ): Promise<{ row: LaunchReadinessBlockerRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      readiness_id: requiredText("readinessId", input.readinessId),
      dimension_id: optionalText(input.dimensionId),
      severity: requiredText("severity", input.severity),
      category: requiredText("category", input.category),
      status: requiredText("status", input.status),
      description: requiredText("description", input.description),
      source_refs_json: input.sourceRefsJson,
      resolution_refs_json: input.resolutionRefsJson ?? [],
      actor_type: input.actor.actorType,
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      privacy_label: defaultPrivacy(input.privacyLabel),
      retention_class: defaultRetention(input.retentionClass),
      metadata_json: input.metadataJson ?? {},
      resolved_at: input.status === "resolved" || input.status === "accepted_limitation" ? optionalText(input.resolvedAt) ?? new Date(0).toISOString() : null,
    };
    return insertReturning<LaunchReadinessBlockerRow>(client, "gnr8_single_site_launch_readiness_blockers", row, [
      "readiness_id",
      "dimension_id",
      "severity",
      "category",
      "status",
      "description",
      "source_refs_json",
      "resolution_refs_json",
      "actor_type",
      "actor_id",
      "actor_role",
      "correlation_id",
      "causation_id",
      "metadata_json",
      "resolved_at",
    ]);
  }

  async createOrReuseEvent(
    client: SingleSitePgClient,
    input: CreateOrReuseLaunchReadinessEventInput,
  ): Promise<{ row: LaunchReadinessEventRow; reusedExisting: boolean }> {
    const details = input.detailsJson ?? {};
    const row: InsertableRow = {
      readiness_id: requiredText("readinessId", input.readinessId),
      dimension_id: optionalText(input.dimensionId),
      blocker_id: optionalText(input.blockerId),
      event_index: input.eventIndex,
      event_action: requiredText("eventAction", input.eventAction),
      from_status: optionalText(input.fromStatus),
      to_status: optionalText(input.toStatus),
      actor_type: input.actor.actorType,
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      actor_display_label: optionalText(input.actor.actorDisplayLabel),
      details_json: details,
      source_watermark: optionalText(input.sourceWatermark),
      semantic_watermark: optionalText(input.semanticWatermark),
      payload_hash: optionalText(input.payloadHash) ?? `sha256:${hashLaunchReadinessWriterValue(details)}`,
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      request_id: optionalText(input.requestId),
      privacy_label: defaultPrivacy(input.privacyLabel),
      retention_class: defaultRetention(input.retentionClass),
      metadata_json: input.metadataJson ?? {},
    };
    return insertReturning<LaunchReadinessEventRow>(client, "gnr8_single_site_launch_readiness_events", row, [
      "readiness_id",
      "dimension_id",
      "blocker_id",
      "event_action",
      "from_status",
      "to_status",
      "actor_type",
      "actor_id",
      "actor_role",
      "details_json",
      "source_watermark",
      "semantic_watermark",
      "payload_hash",
      "correlation_id",
      "causation_id",
      "request_id",
      "metadata_json",
    ]);
  }

  async createOrReuseCloseout(
    client: SingleSitePgClient,
    input: CreateOrReuseLaunchReadinessCloseoutInput,
  ): Promise<{ row: LaunchReadinessCloseoutRow; reusedExisting: boolean }> {
    const row: InsertableRow = {
      readiness_id: requiredText("readinessId", input.readinessId),
      final_status: requiredText("finalStatus", input.finalStatus),
      final_evidence_summary_json: input.finalEvidenceSummaryJson,
      final_limitations_json: input.finalLimitationsJson,
      final_blockers_json: input.finalBlockersJson,
      publish_activation_handoff_refs_json: input.publishActivationHandoffRefsJson,
      actor_type: input.actor.actorType,
      actor_id: requiredText("actor.actorId", input.actor.actorId),
      actor_role: requiredText("actor.actorRole", input.actor.actorRole),
      actor_display_label: optionalText(input.actor.actorDisplayLabel),
      correlation_id: requiredText("correlationId", input.correlationId),
      causation_id: optionalText(input.causationId),
      idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
      request_id: optionalText(input.requestId),
      privacy_label: defaultPrivacy(input.privacyLabel),
      retention_class: defaultRetention(input.retentionClass),
      metadata_json: input.metadataJson ?? {},
    };
    return insertReturning<LaunchReadinessCloseoutRow>(client, "gnr8_single_site_launch_readiness_closeouts", row, [
      "readiness_id",
      "final_status",
      "final_evidence_summary_json",
      "final_limitations_json",
      "final_blockers_json",
      "publish_activation_handoff_refs_json",
      "actor_type",
      "actor_id",
      "actor_role",
      "correlation_id",
      "causation_id",
      "request_id",
      "metadata_json",
    ]);
  }

  async getReadinessById(client: SingleSitePgClient, readinessId: string): Promise<LaunchReadinessRecordRow | null> {
    const result = await client.query("select * from public.gnr8_single_site_launch_readiness_records where id = $1::uuid limit 1", [
      requiredText("readinessId", readinessId),
    ]);
    return (result.rows[0] as LaunchReadinessRecordRow | undefined) ?? null;
  }

  async countOpenP0Blockers(client: SingleSitePgClient, readinessId: string): Promise<number> {
    const result = await client.query(
      `
      select count(*)::int as count
      from public.gnr8_single_site_launch_readiness_blockers
      where readiness_id = $1::uuid
        and severity = 'p0_blocker'
        and status = 'open'
      `,
      [requiredText("readinessId", readinessId)],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async nextEventIndex(client: SingleSitePgClient, readinessId: string): Promise<number> {
    const result = await client.query(
      `
      select coalesce(max(event_index), 0)::int + 1 as event_index
      from public.gnr8_single_site_launch_readiness_events
      where readiness_id = $1::uuid
      `,
      [requiredText("readinessId", readinessId)],
    );
    return Number(result.rows[0]?.event_index ?? 1);
  }
}
