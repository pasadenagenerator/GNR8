import type { RuntimeProviderGovernanceSnapshot } from "@/gnr8/runtime/providers/runtime-provider-governance-snapshot";
import {
  createGovernanceSnapshotInsertRows,
  mapGovernanceSnapshotRow,
  normalizeGovernanceSnapshotPayload,
  type RuntimeProviderGovernanceSnapshotRecord,
  type RuntimeProviderGovernanceSnapshotRow,
} from "@/gnr8/runtime/providers/runtime-provider-governance-snapshot-store";
import { getSuperadminPool } from "@/src/superadmin/db";

export type PersistGovernanceSnapshotResult = {
  snapshot: RuntimeProviderGovernanceSnapshotRecord;
  reused: boolean;
  diagnostics: string[];
};

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function stringifyJsonbColumnValue(input: { field: string; rowId: string; value: unknown }): string {
  if (typeof input.value === "string") {
    throw new Error(
      `governance_snapshot_persistence_invalid_json_field:${input.field}:row=${input.rowId}:reason=string_payload_not_allowed`,
    );
  }
  try {
    const json = JSON.stringify(input.value);
    if (typeof json !== "string") {
      throw new Error("json_stringify_returned_non_string");
    }
    JSON.parse(json);
    return json;
  } catch {
    throw new Error(
      `governance_snapshot_persistence_invalid_json_field:${input.field}:row=${input.rowId}:reason=not_json_serializable`,
    );
  }
}

export async function persistProviderGovernanceSnapshot(
  snapshot: RuntimeProviderGovernanceSnapshot,
): Promise<PersistGovernanceSnapshotResult> {
  const normalized = normalizeGovernanceSnapshotPayload(snapshot);
  const normalizedPayloadFingerprint = stableJson(normalized);

  const existing = await getGovernanceSnapshotsByCorrelationKey(normalized.correlationKey);
  const reusedExisting = existing.find((entry) => stableJson(normalizeGovernanceSnapshotPayload(entry)) === normalizedPayloadFingerprint);
  if (reusedExisting) {
    return {
      snapshot: reusedExisting,
      reused: true,
      diagnostics: uniqueSorted(["GOVERNANCE_SNAPSHOT_REUSED", ...reusedExisting.diagnostics]),
    };
  }

  const rows = createGovernanceSnapshotInsertRows([normalized]);
  const row = rows[0];
  if (!row) {
    return {
      snapshot: normalized,
      reused: true,
      diagnostics: uniqueSorted(["GOVERNANCE_SNAPSHOT_REUSED", ...normalized.diagnostics]),
    };
  }

  const payloadJson = stringifyJsonbColumnValue({ field: "snapshot_payload", rowId: row.snapshot_id, value: row.snapshot_payload });
  const diagnosticsJson = stringifyJsonbColumnValue({ field: "diagnostics", rowId: row.snapshot_id, value: row.diagnostics });

  try {
    const pool = getSuperadminPool();
    const res = await pool.query<RuntimeProviderGovernanceSnapshotRow>(
      `
      insert into public.gnr8_runtime_provider_governance_snapshots (
        snapshot_id,
        handoff_id,
        correlation_key,
        readiness_status,
        execution_blocked,
        review_summary_status,
        review_count,
        snapshot_payload,
        diagnostics,
        created_at
      )
      values (
        $1::text,
        $2::text,
        $3::text,
        $4::text,
        $5::boolean,
        $6::text,
        $7::integer,
        $8::jsonb,
        $9::jsonb,
        $10::timestamptz
      )
      on conflict (snapshot_id) do nothing
      returning
        snapshot_id::text as snapshot_id,
        handoff_id::text as handoff_id,
        correlation_key::text as correlation_key,
        readiness_status::text as readiness_status,
        execution_blocked,
        review_summary_status::text as review_summary_status,
        review_count,
        snapshot_payload,
        diagnostics,
        created_at::text as created_at
      `,
      [
        row.snapshot_id,
        row.handoff_id,
        row.correlation_key,
        row.readiness_status,
        row.execution_blocked,
        row.review_summary_status,
        row.review_count,
        payloadJson,
        diagnosticsJson,
        row.created_at,
      ],
    );

    const inserted = res.rows[0];
    if (inserted) {
      const persisted = mapGovernanceSnapshotRow(inserted);
      return {
        snapshot: persisted,
        reused: false,
        diagnostics: uniqueSorted(["GOVERNANCE_SNAPSHOT_PERSISTED", ...persisted.diagnostics]),
      };
    }

    const byId = await getProviderGovernanceSnapshotById(row.snapshot_id);
    if (byId) {
      return {
        snapshot: byId,
        reused: true,
        diagnostics: uniqueSorted(["GOVERNANCE_SNAPSHOT_REUSED", ...byId.diagnostics]),
      };
    }

    return {
      snapshot: normalized,
      reused: false,
      diagnostics: uniqueSorted(["GOVERNANCE_SNAPSHOT_PERSISTED", ...normalized.diagnostics]),
    };
  } catch {
    return {
      snapshot: {
        ...normalized,
        readinessStatus: "failed_closed",
        executionBlocked: true,
        diagnostics: uniqueSorted(["GOVERNANCE_SNAPSHOT_PERSIST_FAILED_CLOSED", ...normalized.diagnostics]),
      },
      reused: false,
      diagnostics: uniqueSorted(["GOVERNANCE_SNAPSHOT_PERSIST_FAILED_CLOSED", ...normalized.diagnostics]),
    };
  }
}

export async function getProviderGovernanceSnapshotById(
  snapshotId: string,
): Promise<RuntimeProviderGovernanceSnapshotRecord | null> {
  const normalizedSnapshotId = sanitizeToken(snapshotId);
  if (!normalizedSnapshotId) return null;
  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderGovernanceSnapshotRow>(
    `
    select
      snapshot_id::text as snapshot_id,
      handoff_id::text as handoff_id,
      correlation_key::text as correlation_key,
      readiness_status::text as readiness_status,
      execution_blocked,
      review_summary_status::text as review_summary_status,
      review_count,
      snapshot_payload,
      diagnostics,
      created_at::text as created_at
    from public.gnr8_runtime_provider_governance_snapshots
    where snapshot_id = $1::text
    limit 1
    `,
    [normalizedSnapshotId],
  );

  const row = res.rows[0];
  return row ? mapGovernanceSnapshotRow(row) : null;
}

export async function getGovernanceSnapshotsByCorrelationKey(
  correlationKey: string,
): Promise<RuntimeProviderGovernanceSnapshotRecord[]> {
  const normalizedCorrelationKey = sanitizeToken(correlationKey);
  if (!normalizedCorrelationKey) return [];

  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderGovernanceSnapshotRow>(
    `
    select
      snapshot_id::text as snapshot_id,
      handoff_id::text as handoff_id,
      correlation_key::text as correlation_key,
      readiness_status::text as readiness_status,
      execution_blocked,
      review_summary_status::text as review_summary_status,
      review_count,
      snapshot_payload,
      diagnostics,
      created_at::text as created_at
    from public.gnr8_runtime_provider_governance_snapshots
    where correlation_key = $1::text
    order by created_at desc, snapshot_id desc
    `,
    [normalizedCorrelationKey],
  );

  return res.rows.map(mapGovernanceSnapshotRow);
}

export async function getProviderGovernanceTimelineByHandoffId(
  handoffId: string,
): Promise<{ snapshots: RuntimeProviderGovernanceSnapshotRecord[]; executionBlocked: true; diagnostics: string[] }> {
  const normalizedHandoffId = sanitizeToken(handoffId);
  if (!normalizedHandoffId) {
    return { snapshots: [], executionBlocked: true, diagnostics: ["GOVERNANCE_SNAPSHOT_AUDIT_READ", "GOVERNANCE_SNAPSHOT_FAILED_CLOSED"] };
  }

  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderGovernanceSnapshotRow>(
    `
    select
      snapshot_id::text as snapshot_id,
      handoff_id::text as handoff_id,
      correlation_key::text as correlation_key,
      readiness_status::text as readiness_status,
      execution_blocked,
      review_summary_status::text as review_summary_status,
      review_count,
      snapshot_payload,
      diagnostics,
      created_at::text as created_at
    from public.gnr8_runtime_provider_governance_snapshots
    where handoff_id = $1::text
    order by created_at desc, snapshot_id desc
    `,
    [normalizedHandoffId],
  );

  return {
    snapshots: res.rows.map(mapGovernanceSnapshotRow),
    executionBlocked: true,
    diagnostics: ["GOVERNANCE_SNAPSHOT_AUDIT_READ"],
  };
}
