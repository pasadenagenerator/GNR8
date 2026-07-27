import "server-only";

import { createHash } from "node:crypto";

import { getSuperadminPool } from "../../src/superadmin/db";

export const DDOM_READINESS_STATES = [
  "ready",
  "ready_with_warnings",
  "blocked",
  "not_applicable",
  "manually_excepted",
  "stale",
] as const;

export const DDOM_FRESHNESS_STATES = ["fresh", "stale", "failed", "partial_timeline"] as const;

export const DDOM_ACTOR_TYPES = ["human", "system", "provider", "external_reference", "ai_advisory"] as const;

export const DDOM_PRIVACY_LABELS = [
  "public_operational",
  "internal_operational",
  "client_confidential",
  "credential_sensitive",
  "billing_sensitive",
  "provider_sensitive",
  "legal_sensitive",
] as const;

export const DDOM_RETENTION_CLASSES = [
  "short_operational",
  "mvp_operational",
  "security",
  "compliance_long",
  "legal_hold",
] as const;

export const DDOM_SNAPSHOT_REF_ROLES = [
  "domain_binding",
  "host_binding",
  "vercel_snapshot",
  "dns_instruction_snapshot",
  "manual_completion_evidence",
  "domain_exception",
  "audit_event",
  "external_reference",
  "aaf_evidence_package",
  "aaf_approval",
  "freshness_watermark",
] as const;

export type DdomReadinessState = (typeof DDOM_READINESS_STATES)[number];
export type DdomFreshnessState = (typeof DDOM_FRESHNESS_STATES)[number];
export type DdomActorType = (typeof DDOM_ACTOR_TYPES)[number];
export type DdomPrivacyLabel = (typeof DDOM_PRIVACY_LABELS)[number];
export type DdomRetentionClass = (typeof DDOM_RETENTION_CLASSES)[number];
export type DdomSnapshotRefRole = (typeof DDOM_SNAPSHOT_REF_ROLES)[number];
export type DdomJsonObject = Record<string, unknown>;

export type DdomReadinessSnapshotRefInput = {
  refRole: DdomSnapshotRefRole;
  refType: string;
  sourceSystem?: string | null;
  sourceTable?: string | null;
  sourceRecordId: string;
  sourceVersion?: string | null;
  sourceWatermark?: string | null;
  capturedAt?: string | null;
  metadataJson?: DdomJsonObject;
};

export type CreateDdomReadinessSnapshotInput = {
  tenantId: string;
  clientId?: string | null;
  siteId: string;
  ownershipSiteId?: string | null;
  siteVersionId?: string | null;
  domainBindingId?: string | null;
  hostBindingId?: string | null;
  domain?: string | null;
  internalHost?: string | null;
  intendedLaunchDomain?: string | null;
  readinessState: DdomReadinessState;
  readinessBlockers: readonly string[];
  readinessWarnings: readonly string[];
  freshnessState: DdomFreshnessState;
  freshUntil?: string | null;
  staleReason?: string | null;
  sourceWatermark?: string | null;
  sourceWatermarkJson: DdomJsonObject;
  snapshotJson: DdomJsonObject;
  refs: readonly DdomReadinessSnapshotRefInput[];
  actorType: DdomActorType;
  actorId: string;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  privacyLabel?: DdomPrivacyLabel | null;
  retentionClass?: DdomRetentionClass | null;
};

export type DdomReadinessSnapshotWriterResult = {
  snapshotId: string;
  sourceWatermark: string;
  reusedExisting: boolean;
  refIds: string[];
};

export type DdomPgClient = {
  query(sql: string, values?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
};

export type DdomSnapshotWriterClient = DdomPgClient & {
  release?: () => void;
};

export type DdomSnapshotWriterPool = {
  connect(): Promise<DdomSnapshotWriterClient>;
};

type DdomSnapshotRow = {
  id: string;
  tenant_id: string;
  client_id: string | null;
  site_id: string;
  ownership_site_id: string | null;
  site_version_id: string | null;
  domain_binding_id: string | null;
  host_binding_id: string | null;
  domain: string | null;
  internal_host: string | null;
  intended_launch_domain: string | null;
  readiness_state: string;
  readiness_blockers: unknown;
  readiness_warnings: unknown;
  freshness_state: string;
  fresh_until: string | null;
  stale_reason: string | null;
  source_watermark: string;
  source_watermark_json: unknown;
  snapshot_json: unknown;
  created_by_actor_type: string;
  created_by_actor_id: string;
  correlation_id: string;
  causation_id: string | null;
  idempotency_key: string;
  privacy_label: string;
  retention_class: string;
};

type DdomSnapshotRefRow = {
  id: string;
  snapshot_id: string;
  ref_role: string;
  ref_type: string;
  source_system: string;
  source_table: string | null;
  source_record_id: string;
  source_version: string | null;
  source_watermark: string | null;
  captured_at: string | null;
  metadata_json: unknown;
};

type CanonicalSnapshotRef = {
  ref_role: DdomSnapshotRefRole;
  ref_type: string;
  source_system: string;
  source_table: string | null;
  source_record_id: string;
  source_version: string | null;
  source_watermark: string | null;
  captured_at: string | null;
  metadata_json: DdomJsonObject;
};

export type DdomCanonicalSnapshotWrite = {
  row: Omit<DdomSnapshotRow, "id">;
  refs: CanonicalSnapshotRef[];
  payloadHash: string;
  driftPayload: {
    scope_payload: unknown;
    snapshot_payload: unknown;
    refs_payload: unknown;
    actor_payload: unknown;
  };
};

export class DdomReadinessSnapshotWriterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DdomReadinessSnapshotWriterError";
  }
}

export class DdomReadinessSnapshotValidationError extends DdomReadinessSnapshotWriterError {
  constructor(message: string) {
    super(message);
    this.name = "DdomReadinessSnapshotValidationError";
  }
}

export class DdomReadinessSnapshotIdempotencyConflictError extends DdomReadinessSnapshotWriterError {
  constructor(
    readonly idempotencyKey: string,
    readonly driftedFields: string[],
  ) {
    super(`DDOM snapshot idempotency conflict for key ${idempotencyKey}: semantic payload drift in ${driftedFields.join(", ")}`);
    this.name = "DdomReadinessSnapshotIdempotencyConflictError";
  }
}

function trimText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function requiredText(field: string, value: unknown): string {
  const normalized = trimText(value);
  if (!normalized) throw new DdomReadinessSnapshotValidationError(`${field} is required`);
  return normalized;
}

function optionalText(value: unknown): string | null {
  return trimText(value);
}

function enumValue<T extends string>(field: string, value: unknown, allowed: readonly T[]): T {
  const normalized = requiredText(field, value);
  if (!allowed.includes(normalized as T)) {
    throw new DdomReadinessSnapshotValidationError(`${field} must be one of ${allowed.join(", ")}`);
  }
  return normalized as T;
}

function jsonObject(field: string, value: unknown): DdomJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) {
    throw new DdomReadinessSnapshotValidationError(`${field} must be an object`);
  }
  return stableJsonValue(value) as DdomJsonObject;
}

function stableStringArray(field: string, value: unknown): string[] {
  if (!Array.isArray(value)) throw new DdomReadinessSnapshotValidationError(`${field} must be an array`);
  return [...new Set(value.map((entry) => requiredText(field, entry)))].sort((left, right) => left.localeCompare(right));
}

function assertUuid(field: string, value: string | null): void {
  if (!value) return;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new DdomReadinessSnapshotValidationError(`${field} must be a uuid`);
  }
}

function normalizeTimestamp(field: string, value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new DdomReadinessSnapshotValidationError(`${field} must be a valid timestamp`);
  return parsed.toISOString();
}

function stableJsonValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((entry) => stableJsonValue(entry));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableJsonValue(entry)]),
    );
  }
  return value ?? null;
}

function stableJsonString(value: unknown): string {
  return JSON.stringify(stableJsonValue(value));
}

function stableHash(value: unknown): string {
  return `sha256:${createHash("sha256").update(stableJsonString(value)).digest("hex")}`;
}

function semanticEqual(left: unknown, right: unknown): boolean {
  return stableJsonString(left) === stableJsonString(right);
}

function toPostgresJson(value: unknown): string {
  return stableJsonString(value);
}

function canonicalRefKey(ref: Pick<CanonicalSnapshotRef, "ref_role" | "ref_type" | "source_record_id">): string {
  return `${ref.ref_role}\u0000${ref.ref_type}\u0000${ref.source_record_id}`;
}

function canonicalizeRefs(inputRefs: readonly DdomReadinessSnapshotRefInput[]): CanonicalSnapshotRef[] {
  const byKey = new Map<string, CanonicalSnapshotRef>();
  for (const input of inputRefs) {
    const ref: CanonicalSnapshotRef = {
      ref_role: enumValue("refRole", input.refRole, DDOM_SNAPSHOT_REF_ROLES),
      ref_type: requiredText("refType", input.refType),
      source_system: optionalText(input.sourceSystem) ?? "gnr8",
      source_table: optionalText(input.sourceTable),
      source_record_id: requiredText("sourceRecordId", input.sourceRecordId),
      source_version: optionalText(input.sourceVersion),
      source_watermark: optionalText(input.sourceWatermark),
      captured_at: normalizeTimestamp("ref.capturedAt", optionalText(input.capturedAt)),
      metadata_json: jsonObject("metadataJson", input.metadataJson ?? {}),
    };
    const key = canonicalRefKey(ref);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, ref);
    } else if (!semanticEqual(existing, ref)) {
      throw new DdomReadinessSnapshotValidationError("duplicate refs with the same semantic key must have identical payloads");
    }
  }
  return [...byKey.values()].sort((left, right) => stableJsonString(left).localeCompare(stableJsonString(right)));
}

function canonicalizeInput(input: CreateDdomReadinessSnapshotInput): DdomCanonicalSnapshotWrite {
  const readinessState = enumValue("readinessState", input.readinessState, DDOM_READINESS_STATES);
  const freshnessState = enumValue("freshnessState", input.freshnessState, DDOM_FRESHNESS_STATES);
  const ownershipSiteId = optionalText(input.ownershipSiteId);
  const siteVersionId = optionalText(input.siteVersionId);
  const domainBindingId = optionalText(input.domainBindingId);
  const hostBindingId = optionalText(input.hostBindingId);
  const domain = optionalText(input.domain)?.toLowerCase() ?? null;
  const internalHost = optionalText(input.internalHost)?.toLowerCase() ?? null;
  const intendedLaunchDomain = optionalText(input.intendedLaunchDomain)?.toLowerCase() ?? null;
  const freshUntil = normalizeTimestamp("freshUntil", optionalText(input.freshUntil));
  const staleReason = optionalText(input.staleReason);

  assertUuid("ownershipSiteId", ownershipSiteId);
  assertUuid("siteVersionId", siteVersionId);
  assertUuid("domainBindingId", domainBindingId);
  assertUuid("hostBindingId", hostBindingId);

  const siteId = requiredText("siteId", input.siteId);
  const hasDomainOrHostIntent = Boolean(domain || internalHost || intendedLaunchDomain || domainBindingId || hostBindingId);
  if (readinessState !== "not_applicable" && !hasDomainOrHostIntent) {
    throw new DdomReadinessSnapshotValidationError(
      "at least one of domain, internalHost, intendedLaunchDomain, domainBindingId, or hostBindingId is required unless readinessState is not_applicable",
    );
  }

  const sourceWatermarkJson = jsonObject("sourceWatermarkJson", input.sourceWatermarkJson);
  const snapshotJson = jsonObject("snapshotJson", input.snapshotJson);
  const readinessBlockers = stableStringArray("readinessBlockers", input.readinessBlockers);
  const readinessWarnings = stableStringArray("readinessWarnings", input.readinessWarnings);
  const refs = canonicalizeRefs(input.refs);

  const scopePayload = {
    tenant_id: requiredText("tenantId", input.tenantId),
    client_id: optionalText(input.clientId),
    site_id: siteId,
    ownership_site_id: ownershipSiteId,
    site_version_id: siteVersionId,
    domain_binding_id: domainBindingId,
    host_binding_id: hostBindingId,
    domain,
    internal_host: internalHost,
    intended_launch_domain: intendedLaunchDomain,
  };
  const snapshotPayload = {
    readiness_state: readinessState,
    readiness_blockers: readinessBlockers,
    readiness_warnings: readinessWarnings,
    freshness_state: freshnessState,
    fresh_until: freshUntil,
    stale_reason: staleReason,
    source_watermark_json: sourceWatermarkJson,
    snapshot_json: snapshotJson,
  };
  const refsPayload = refs.map(({ ref_role, ref_type, source_system, source_table, source_record_id, source_version, source_watermark, captured_at, metadata_json }) => ({
    ref_role,
    ref_type,
    source_system,
    source_table,
    source_record_id,
    source_version,
    source_watermark,
    captured_at,
    metadata_json,
  }));
  const payloadHash = stableHash({ scope_payload: scopePayload, snapshot_payload: snapshotPayload, refs_payload: refsPayload });
  const suppliedSourceWatermark = optionalText(input.sourceWatermark);
  const storedSourceWatermarkJson = suppliedSourceWatermark
    ? stableJsonValue({ ...sourceWatermarkJson, _ddomWriterPayloadHash: payloadHash })
    : sourceWatermarkJson;
  const sourceWatermark = suppliedSourceWatermark ?? payloadHash;

  const row = {
    ...scopePayload,
    readiness_state: readinessState,
    readiness_blockers: readinessBlockers,
    readiness_warnings: readinessWarnings,
    freshness_state: freshnessState,
    fresh_until: freshUntil,
    stale_reason: staleReason,
    source_watermark: sourceWatermark,
    source_watermark_json: storedSourceWatermarkJson,
    snapshot_json: snapshotJson,
    created_by_actor_type: enumValue("actorType", input.actorType, DDOM_ACTOR_TYPES),
    created_by_actor_id: requiredText("actorId", input.actorId),
    correlation_id: requiredText("correlationId", input.correlationId),
    causation_id: optionalText(input.causationId),
    idempotency_key: requiredText("idempotencyKey", input.idempotencyKey),
    privacy_label: enumValue("privacyLabel", input.privacyLabel ?? "client_confidential", DDOM_PRIVACY_LABELS),
    retention_class: enumValue("retentionClass", input.retentionClass ?? "compliance_long", DDOM_RETENTION_CLASSES),
  };

  return {
    row,
    refs,
    payloadHash,
    driftPayload: {
      scope_payload: scopePayload,
      snapshot_payload: {
        ...snapshotPayload,
        source_watermark: sourceWatermark,
        source_watermark_json: storedSourceWatermarkJson,
      },
      refs_payload: refsPayload,
      actor_payload: {
        created_by_actor_type: row.created_by_actor_type,
        created_by_actor_id: row.created_by_actor_id,
        correlation_id: row.correlation_id,
        causation_id: row.causation_id,
        privacy_label: row.privacy_label,
        retention_class: row.retention_class,
      },
    },
  };
}

function mapExistingDriftPayload(snapshot: DdomSnapshotRow, refs: DdomSnapshotRefRow[]): DdomCanonicalSnapshotWrite["driftPayload"] {
  return {
    scope_payload: {
      tenant_id: snapshot.tenant_id,
      client_id: snapshot.client_id,
      site_id: snapshot.site_id,
      ownership_site_id: snapshot.ownership_site_id,
      site_version_id: snapshot.site_version_id,
      domain_binding_id: snapshot.domain_binding_id,
      host_binding_id: snapshot.host_binding_id,
      domain: snapshot.domain,
      internal_host: snapshot.internal_host,
      intended_launch_domain: snapshot.intended_launch_domain,
    },
    snapshot_payload: {
      readiness_state: snapshot.readiness_state,
      readiness_blockers: snapshot.readiness_blockers,
      readiness_warnings: snapshot.readiness_warnings,
      freshness_state: snapshot.freshness_state,
      fresh_until: normalizeTimestamp("freshUntil", snapshot.fresh_until),
      stale_reason: snapshot.stale_reason,
      source_watermark_json: snapshot.source_watermark_json,
      snapshot_json: snapshot.snapshot_json,
      source_watermark: snapshot.source_watermark,
    },
    refs_payload: refs
      .map((ref) => ({
        ref_role: ref.ref_role,
        ref_type: ref.ref_type,
        source_system: ref.source_system,
        source_table: ref.source_table,
        source_record_id: ref.source_record_id,
        source_version: ref.source_version,
        source_watermark: ref.source_watermark,
        captured_at: normalizeTimestamp("ref.capturedAt", ref.captured_at),
        metadata_json: ref.metadata_json,
      }))
      .sort((left, right) => stableJsonString(left).localeCompare(stableJsonString(right))),
    actor_payload: {
      created_by_actor_type: snapshot.created_by_actor_type,
      created_by_actor_id: snapshot.created_by_actor_id,
      correlation_id: snapshot.correlation_id,
      causation_id: snapshot.causation_id,
      privacy_label: snapshot.privacy_label,
      retention_class: snapshot.retention_class,
    },
  };
}

function assertIdempotencyMatch(input: DdomCanonicalSnapshotWrite, existing: DdomSnapshotRow, refs: DdomSnapshotRefRow[]): void {
  const existingPayload = mapExistingDriftPayload(existing, refs);
  const driftedFields = (["scope_payload", "snapshot_payload", "refs_payload", "actor_payload"] as const).filter(
    (field) => !semanticEqual(input.driftPayload[field], existingPayload[field]),
  );
  if (driftedFields.length > 0) {
    throw new DdomReadinessSnapshotIdempotencyConflictError(input.row.idempotency_key, driftedFields);
  }
}

async function withTransaction<T>(pool: DdomSnapshotWriterPool, fn: (client: DdomSnapshotWriterClient) => Promise<T>): Promise<T> {
  const client = (await pool.connect()) as DdomSnapshotWriterClient;
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
        // Best-effort rollback after a failed DDOM writer transaction.
      }
    }
    throw error;
  } finally {
    client.release?.();
  }
}

export class DdomReadinessSnapshotRepository {
  constructor(private readonly pool: DdomSnapshotWriterPool = getSuperadminPool()) {}

  async createSnapshot(input: DdomCanonicalSnapshotWrite): Promise<DdomReadinessSnapshotWriterResult> {
    return withTransaction(this.pool, async (client) => {
      const inserted = await client.query(
        `
        insert into public.gnr8_ddom_readiness_snapshots (
          tenant_id,
          client_id,
          site_id,
          ownership_site_id,
          site_version_id,
          domain_binding_id,
          host_binding_id,
          domain,
          internal_host,
          intended_launch_domain,
          readiness_state,
          readiness_blockers,
          readiness_warnings,
          freshness_state,
          fresh_until,
          stale_reason,
          source_watermark,
          source_watermark_json,
          snapshot_json,
          created_by_actor_type,
          created_by_actor_id,
          correlation_id,
          causation_id,
          idempotency_key,
          privacy_label,
          retention_class
        )
        values (
          $1, $2, $3, $4::uuid, $5::uuid, $6::uuid, $7::uuid, $8, $9, $10,
          $11, $12::jsonb, $13::jsonb, $14, $15::timestamptz, $16, $17, $18::jsonb,
          $19::jsonb, $20, $21, $22, $23, $24, $25, $26
        )
        on conflict (idempotency_key) do nothing
        returning
          id::text,
          tenant_id,
          client_id,
          site_id,
          ownership_site_id::text,
          site_version_id::text,
          domain_binding_id::text,
          host_binding_id::text,
          domain,
          internal_host,
          intended_launch_domain,
          readiness_state,
          readiness_blockers,
          readiness_warnings,
          freshness_state,
          fresh_until::text,
          stale_reason,
          source_watermark,
          source_watermark_json,
          snapshot_json,
          created_by_actor_type,
          created_by_actor_id,
          correlation_id,
          causation_id,
          idempotency_key,
          privacy_label,
          retention_class
        `,
        [
          input.row.tenant_id,
          input.row.client_id,
          input.row.site_id,
          input.row.ownership_site_id,
          input.row.site_version_id,
          input.row.domain_binding_id,
          input.row.host_binding_id,
          input.row.domain,
          input.row.internal_host,
          input.row.intended_launch_domain,
          input.row.readiness_state,
          toPostgresJson(input.row.readiness_blockers),
          toPostgresJson(input.row.readiness_warnings),
          input.row.freshness_state,
          input.row.fresh_until,
          input.row.stale_reason,
          input.row.source_watermark,
          toPostgresJson(input.row.source_watermark_json),
          toPostgresJson(input.row.snapshot_json),
          input.row.created_by_actor_type,
          input.row.created_by_actor_id,
          input.row.correlation_id,
          input.row.causation_id,
          input.row.idempotency_key,
          input.row.privacy_label,
          input.row.retention_class,
        ],
      );

      const insertedSnapshot = inserted.rows[0] as DdomSnapshotRow | undefined;
      if (insertedSnapshot) {
        const refIds: string[] = [];
        for (const ref of input.refs) {
          const result = await client.query(
            `
            insert into public.gnr8_ddom_readiness_snapshot_refs (
              snapshot_id,
              ref_role,
              ref_type,
              source_system,
              source_table,
              source_record_id,
              source_version,
              source_watermark,
              captured_at,
              metadata_json
            )
            values ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9::timestamptz, $10::jsonb)
            returning id::text
            `,
            [
              insertedSnapshot.id,
              ref.ref_role,
              ref.ref_type,
              ref.source_system,
              ref.source_table,
              ref.source_record_id,
              ref.source_version,
              ref.source_watermark,
              ref.captured_at,
              toPostgresJson(ref.metadata_json),
            ],
          );
          const id = trimText(result.rows[0]?.id);
          if (!id) throw new DdomReadinessSnapshotWriterError("DDOM snapshot ref insert did not return an id");
          refIds.push(id);
        }
        return {
          snapshotId: insertedSnapshot.id,
          sourceWatermark: insertedSnapshot.source_watermark,
          reusedExisting: false,
          refIds,
        };
      }

      const existing = await this.readExistingByIdempotencyKey(client, input.row.idempotency_key);
      assertIdempotencyMatch(input, existing.snapshot, existing.refs);
      return {
        snapshotId: existing.snapshot.id,
        sourceWatermark: existing.snapshot.source_watermark,
        reusedExisting: true,
        refIds: existing.refs.map((ref) => ref.id),
      };
    });
  }

  private async readExistingByIdempotencyKey(
    client: DdomPgClient,
    idempotencyKey: string,
  ): Promise<{ snapshot: DdomSnapshotRow; refs: DdomSnapshotRefRow[] }> {
    const snapshotResult = await client.query(
      `
      select
        id::text,
        tenant_id,
        client_id,
        site_id,
        ownership_site_id::text,
        site_version_id::text,
        domain_binding_id::text,
        host_binding_id::text,
        domain,
        internal_host,
        intended_launch_domain,
        readiness_state,
        readiness_blockers,
        readiness_warnings,
        freshness_state,
        fresh_until::text,
        stale_reason,
        source_watermark,
        source_watermark_json,
        snapshot_json,
        created_by_actor_type,
        created_by_actor_id,
        correlation_id,
        causation_id,
        idempotency_key,
        privacy_label,
        retention_class
      from public.gnr8_ddom_readiness_snapshots
      where idempotency_key = $1
      limit 1
      `,
      [idempotencyKey],
    );
    const snapshot = snapshotResult.rows[0] as DdomSnapshotRow | undefined;
    if (!snapshot) throw new DdomReadinessSnapshotWriterError("DDOM idempotent insert did not find an existing snapshot");

    const refsResult = await client.query(
      `
      select
        id::text,
        snapshot_id::text,
        ref_role,
        ref_type,
        source_system,
        source_table,
        source_record_id,
        source_version,
        source_watermark,
        captured_at::text,
        metadata_json
      from public.gnr8_ddom_readiness_snapshot_refs
      where snapshot_id = $1::uuid
      order by ref_role, ref_type, source_record_id
      `,
      [snapshot.id],
    );
    return { snapshot, refs: refsResult.rows as DdomSnapshotRefRow[] };
  }
}

export type DdomReadinessSnapshotRepositoryLike = Pick<DdomReadinessSnapshotRepository, "createSnapshot">;

export class DdomReadinessSnapshotWriter {
  constructor(private readonly repository: DdomReadinessSnapshotRepositoryLike = new DdomReadinessSnapshotRepository()) {}

  async createDdomReadinessSnapshot(input: CreateDdomReadinessSnapshotInput): Promise<DdomReadinessSnapshotWriterResult> {
    return this.repository.createSnapshot(canonicalizeInput(input));
  }
}

export async function createDdomReadinessSnapshot(
  input: CreateDdomReadinessSnapshotInput,
  repository?: DdomReadinessSnapshotRepositoryLike,
): Promise<DdomReadinessSnapshotWriterResult> {
  return new DdomReadinessSnapshotWriter(repository).createDdomReadinessSnapshot(input);
}

export function buildDdomSourceWatermark(input: CreateDdomReadinessSnapshotInput): string {
  return canonicalizeInput(input).row.source_watermark;
}

export type BuildDdomReadinessSnapshotInputFromDomainBindingInput = Omit<
  CreateDdomReadinessSnapshotInput,
  "domainBindingId" | "domain" | "readinessState" | "freshnessState" | "sourceWatermarkJson" | "snapshotJson" | "refs"
> & {
  domainBinding: {
    id: string;
    domain: string;
    status?: string | null;
    domainType?: string | null;
    verificationType?: string | null;
    verificationValue?: string | null;
    verificationHost?: string | null;
    dnsRecordType?: string | null;
    dnsRecordHost?: string | null;
    dnsRecordValue?: string | null;
    dnsRecordPurpose?: string | null;
    dnsInstructions?: unknown;
    lastCheckedAt?: string | null;
    vercelDomainId?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
  readinessState?: DdomReadinessState;
  freshnessState?: DdomFreshnessState;
  sourceWatermarkJson?: DdomJsonObject;
  snapshotJson?: DdomJsonObject;
  refs?: readonly DdomReadinessSnapshotRefInput[];
};

export function buildDdomReadinessSnapshotInput(
  input: BuildDdomReadinessSnapshotInputFromDomainBindingInput,
): CreateDdomReadinessSnapshotInput {
  const {
    domainBinding,
    readinessState,
    freshnessState,
    sourceWatermarkJson,
    snapshotJson,
    refs: extraRefs,
    ...baseInput
  } = input;
  const bindingId = requiredText("domainBinding.id", domainBinding.id);
  const domain = requiredText("domainBinding.domain", domainBinding.domain).toLowerCase();
  const bindingPayload = stableJsonValue({
    id: bindingId,
    domain,
    status: optionalText(domainBinding.status),
    domainType: optionalText(domainBinding.domainType),
    verificationType: optionalText(domainBinding.verificationType),
    verificationValue: optionalText(domainBinding.verificationValue),
    verificationHost: optionalText(domainBinding.verificationHost),
    dnsRecordType: optionalText(domainBinding.dnsRecordType),
    dnsRecordHost: optionalText(domainBinding.dnsRecordHost),
    dnsRecordValue: optionalText(domainBinding.dnsRecordValue),
    dnsRecordPurpose: optionalText(domainBinding.dnsRecordPurpose),
    dnsInstructions: stableJsonValue(domainBinding.dnsInstructions ?? null),
    lastCheckedAt: optionalText(domainBinding.lastCheckedAt),
    vercelDomainId: optionalText(domainBinding.vercelDomainId),
    createdAt: optionalText(domainBinding.createdAt),
    updatedAt: optionalText(domainBinding.updatedAt),
  });
  const bindingWatermark = stableHash(bindingPayload);
  const refs: DdomReadinessSnapshotRefInput[] = [
    {
      refRole: "domain_binding",
      refType: "runtime_domain_host_binding",
      sourceSystem: "gnr8",
      sourceTable: "gnr8_runtime_domain_host_bindings",
      sourceRecordId: bindingId,
      sourceVersion: optionalText(domainBinding.updatedAt),
      sourceWatermark: bindingWatermark,
      capturedAt: optionalText(domainBinding.lastCheckedAt) ?? optionalText(domainBinding.updatedAt),
      metadataJson: { status: optionalText(domainBinding.status), domain },
    },
    ...(extraRefs ?? []),
  ];

  if (optionalText(domainBinding.vercelDomainId) || optionalText(domainBinding.lastCheckedAt)) {
    refs.push({
      refRole: "vercel_snapshot",
      refType: "runtime_domain_host_binding_vercel_fields",
      sourceSystem: "gnr8",
      sourceTable: "gnr8_runtime_domain_host_bindings",
      sourceRecordId: bindingId,
      sourceVersion: optionalText(domainBinding.lastCheckedAt),
      sourceWatermark: bindingWatermark,
      capturedAt: optionalText(domainBinding.lastCheckedAt),
      metadataJson: {
        vercelDomainId: optionalText(domainBinding.vercelDomainId),
        lastCheckedAt: optionalText(domainBinding.lastCheckedAt),
        limitation: "vercel_project_domain_state_not_registrar_or_dns_truth",
      },
    });
  }

  if (domainBinding.dnsInstructions || optionalText(domainBinding.dnsRecordValue)) {
    refs.push({
      refRole: "dns_instruction_snapshot",
      refType: "runtime_domain_host_binding_dns_instruction_fields",
      sourceSystem: "gnr8",
      sourceTable: "gnr8_runtime_domain_host_bindings",
      sourceRecordId: bindingId,
      sourceVersion: optionalText(domainBinding.updatedAt),
      sourceWatermark: bindingWatermark,
      capturedAt: optionalText(domainBinding.updatedAt),
      metadataJson: {
        limitation: "dns_instruction_snapshot_not_dns_completion_proof",
        dnsRecordType: optionalText(domainBinding.dnsRecordType),
        dnsRecordPurpose: optionalText(domainBinding.dnsRecordPurpose),
      },
    });
  }

  return {
    ...baseInput,
    domainBindingId: bindingId,
    domain,
    readinessState: readinessState ?? (optionalText(domainBinding.status) === "active" ? "ready" : "blocked"),
    freshnessState: freshnessState ?? (optionalText(domainBinding.lastCheckedAt) ? "fresh" : "partial_timeline"),
    sourceWatermarkJson: {
      ...(sourceWatermarkJson ?? {}),
      domainBinding: bindingWatermark,
    },
    snapshotJson: {
      ...(snapshotJson ?? {}),
      domainBinding: bindingPayload,
      ddomBoundary: {
        dnsTruthOwner: "external_dns_provider",
        vercelTruthOwner: "vercel_project_domain_state",
        readinessIsPublishPrerequisiteOnly: true,
      },
    },
    refs,
  };
}
