import "server-only";

import { createHash } from "node:crypto";

import { getSuperadminPool } from "@/src/superadmin/db";
import {
  getActivePointerForSite,
  getArtifactById,
  getSiteVersion,
  recordPublishActivationAudit,
  switchActivePointer,
} from "@/gnr8/runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RuntimeArtifact } from "@/gnr8/runtime/types";

export const AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_SERVICE_VERSION = "airship-23-simple-promote-rollback:v1" as const;
export const AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID = "site_57d9665a3a5867edf6ef" as const;
export const AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER = {
  siteVersionId: "92e476b9-67fc-408a-be3d-5c744aa0f3f6",
  artifactId: "5ac3716a-f29d-4648-bc86-a6942638ed53",
} as const;
export const AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER = {
  siteVersionId: "a3f9493e-9da4-4ef8-8608-154fe6d25a0f",
  artifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
} as const;

type ActivePointer = { siteVersionId: string; artifactId: string };
type NullablePointer = ActivePointer | null;

export type AirshipSimplePromoteRollbackInput = Record<string, unknown> & {
  migrationId: string;
  currentSiteVersionId: string;
  currentArtifactId: string;
  rollbackSiteVersionId: string;
  rollbackArtifactId: string;
  promoteAuditRef?: string | null;
  promoteAuditRowId?: string | null;
  idempotencyKey: string;
  reason?: string | null;
  actorId: string;
};

export type AirshipPromoteAuditRecord = {
  id: string;
  siteVersionId: string;
  source: string;
  details: Record<string, unknown>;
};

export type AirshipSimplePromoteRollbackAuditRepository = {
  readPromoteAudit(input: {
    promoteAuditRowId: string | null;
    promoteAuditRef: string | null;
  }): Promise<AirshipPromoteAuditRecord | null>;
};

export type AirshipSimplePromoteRollbackOutput = {
  ok: true;
  outcome: "rolled_back" | "noop_already_rolled_back";
  rolledBack: boolean;
  noOp: boolean;
  serviceVersion: typeof AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_SERVICE_VERSION;
  previousPointer: ActivePointer;
  currentPointer: ActivePointer;
  restoredPointer: ActivePointer;
  rollbackTarget: ActivePointer;
  auditRefs: {
    source: "gnr8_runtime_version_audit";
    promoteAuditRowId: string;
    preRollbackAudit: string;
    postRollbackAudit: string | null;
    siteVersionId: string;
  };
  refs: {
    migrationId: string;
    runtimeSiteId: typeof AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID;
    currentSiteVersionId: string;
    currentArtifactId: string;
    rollbackSiteVersionId: string;
    rollbackArtifactId: string;
    promoteAuditRef: string | null;
    promoteAuditRowId: string | null;
    idempotencyKey: string;
  };
};

export type AirshipSimplePromoteRollbackDependencies = {
  auditRepository: AirshipSimplePromoteRollbackAuditRepository;
  getSiteVersion: typeof getSiteVersion;
  getArtifactById: typeof getArtifactById;
  getActivePointerForSite: typeof getActivePointerForSite;
  switchActivePointer: typeof switchActivePointer;
  recordPublishActivationAudit: typeof recordPublishActivationAudit;
};

const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_INPUT_KEYS = new Set([
  "migrationId",
  "currentSiteVersionId",
  "currentArtifactId",
  "rollbackSiteVersionId",
  "rollbackArtifactId",
  "promoteAuditRef",
  "promoteAuditRowId",
  "idempotencyKey",
  "reason",
  "actorId",
]);
const FORBIDDEN_INPUT_KEYS = new Set([
  "actor",
  "actorRole",
  "actorType",
  "userId",
  "principal",
  "superadminUserId",
  "apiKey",
  "secret",
  "token",
  "authorization",
  "credential",
  "provider",
  "providerPayload",
  "providerConfig",
  "publish",
  "publishMode",
  "publishChain",
  "activationChain",
  "dryRun",
  "shadowPublish",
  "rollback",
  "sourceCapture",
  "activePointer",
  "runtimeSiteId",
  "siteId",
  "audit",
]);

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function required(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new Error(`airship_simple_promote_rollback_${field}_required`);
  return normalized;
}

function uuid(field: string, value: unknown): string {
  const normalized = required(field, value);
  if (!UUIDISH.test(normalized)) throw new Error(`airship_simple_promote_rollback_${field}_invalid`);
  return normalized;
}

function validateInputKeys(input: Record<string, unknown>): void {
  const errors: string[] = [];
  for (const key of Object.keys(input).sort()) {
    if (FORBIDDEN_INPUT_KEYS.has(key)) errors.push(`airship_simple_promote_rollback_forbidden_field:${key}`);
    if (!ALLOWED_INPUT_KEYS.has(key)) errors.push(`airship_simple_promote_rollback_unknown_field:${key}`);
  }
  if (errors.length > 0) throw new Error(Array.from(new Set(errors)).sort().join(","));
}

function samePointer(left: NullablePointer, right: NullablePointer): boolean {
  return (left?.siteVersionId ?? null) === (right?.siteVersionId ?? null) && (left?.artifactId ?? null) === (right?.artifactId ?? null);
}

function assertPointer(label: "current" | "rollback", actual: ActivePointer, expected: ActivePointer): void {
  if (!samePointer(actual, expected)) {
    throw new Error(`airship_simple_promote_rollback_${label}_request_pointer_mismatch`);
  }
}

function requirePointer(label: string, pointer: NullablePointer): ActivePointer {
  if (!pointer) throw new Error(`airship_simple_promote_rollback_${label}_missing`);
  return pointer;
}

function pointerFromRequest(siteVersionId: string, artifactId: string): ActivePointer {
  return { siteVersionId, artifactId };
}

function auditMarker(input: {
  phase: "pre_rollback" | "post_rollback_noop" | "post_rollback_readback";
  migrationId: string;
  idempotencyKey: string;
}): string {
  const digest = createHash("sha256")
    .update(`${input.phase}:${input.migrationId}:${input.idempotencyKey}`)
    .digest("hex");
  return `airship-simple-promote-rollback:${input.phase}:${digest}`;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function pointerValue(value: unknown): ActivePointer | null {
  const record = objectValue(value);
  if (!record) return null;
  const siteVersionId = text(record.siteVersionId);
  const artifactId = text(record.artifactId);
  return siteVersionId && artifactId ? { siteVersionId, artifactId } : null;
}

function assertRollbackTargetExists(input: {
  rollbackVersion: CanonicalSiteVersionSnapshot | null;
  rollbackArtifact: RuntimeArtifact | null;
  rollbackPointer: ActivePointer;
}): void {
  if (!input.rollbackVersion) throw new Error("airship_simple_promote_rollback_target_site_version_missing");
  if (!input.rollbackArtifact) throw new Error("airship_simple_promote_rollback_target_artifact_missing");
  if (input.rollbackVersion.id !== input.rollbackPointer.siteVersionId) throw new Error("airship_simple_promote_rollback_target_site_version_mismatch");
  if (input.rollbackVersion.artifactId !== input.rollbackPointer.artifactId) throw new Error("airship_simple_promote_rollback_target_version_artifact_mismatch");
  if (input.rollbackArtifact.id !== input.rollbackPointer.artifactId) throw new Error("airship_simple_promote_rollback_target_artifact_id_mismatch");
  if (input.rollbackArtifact.siteVersionId !== input.rollbackPointer.siteVersionId) throw new Error("airship_simple_promote_rollback_target_artifact_version_mismatch");
  if (input.rollbackVersion.siteId !== AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID) throw new Error("airship_simple_promote_rollback_target_runtime_site_mismatch");
  if (input.rollbackArtifact.siteId !== AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID) throw new Error("airship_simple_promote_rollback_target_artifact_runtime_site_mismatch");
}

function requirePromoteAuditMatches(input: {
  migrationId: string;
  audit: AirshipPromoteAuditRecord | null;
  currentPointer: ActivePointer;
  rollbackPointer: ActivePointer;
}): AirshipPromoteAuditRecord {
  if (!input.audit) throw new Error("airship_simple_promote_rollback_promote_audit_missing");
  const details = input.audit.details;
  if (text(details.serviceVersion) !== "airship-22-simple-promote-to-live:v1") {
    throw new Error("airship_simple_promote_rollback_promote_audit_service_mismatch");
  }
  if (text(details.migrationId) !== input.migrationId) throw new Error("airship_simple_promote_rollback_promote_audit_migration_mismatch");
  const previous = pointerValue(details.previousActivePointer);
  const target = pointerValue(details.targetCandidatePointer);
  const readback = pointerValue(details.newActivePointer);
  if (!samePointer(previous, input.rollbackPointer)) throw new Error("airship_simple_promote_rollback_promote_audit_before_pointer_mismatch");
  if (!samePointer(target, input.currentPointer) && !samePointer(readback, input.currentPointer)) {
    throw new Error("airship_simple_promote_rollback_promote_audit_after_pointer_mismatch");
  }
  if (input.audit.siteVersionId !== input.currentPointer.siteVersionId) {
    throw new Error("airship_simple_promote_rollback_promote_audit_site_version_mismatch");
  }
  return input.audit;
}

function auditDetails(input: {
  phase: "pre_rollback" | "post_rollback_noop" | "post_rollback_readback";
  migrationId: string;
  idempotencyKey: string;
  reason: string | null;
  actorId: string;
  promoteAuditRowId: string;
  previousPointer: ActivePointer;
  currentPointer: ActivePointer;
  restoredPointer: NullablePointer;
  switched: boolean;
}) {
  return {
    serviceVersion: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_SERVICE_VERSION,
    phase: input.phase,
    auditMarker: auditMarker({
      phase: input.phase,
      migrationId: input.migrationId,
      idempotencyKey: input.idempotencyKey,
    }),
    migrationId: input.migrationId,
    idempotencyKey: input.idempotencyKey,
    reason: input.reason,
    actorSuperadminUserId: input.actorId,
    runtimeSiteId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID,
    promoteAuditRowId: input.promoteAuditRowId,
    activePointerBeforeRollback: input.previousPointer,
    expectedCurrentPointer: input.currentPointer,
    rollbackTargetPointer: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER,
    restoredActivePointer: input.restoredPointer,
    switched: input.switched,
    noProviderCall: true,
    noDnsDomainBillingMutation: true,
  };
}

export class PostgresAirshipSimplePromoteRollbackAuditRepository implements AirshipSimplePromoteRollbackAuditRepository {
  async readPromoteAudit(input: {
    promoteAuditRowId: string | null;
    promoteAuditRef: string | null;
  }): Promise<AirshipPromoteAuditRecord | null> {
    const pool = getSuperadminPool();
    const rowId = text(input.promoteAuditRowId);
    const ref = text(input.promoteAuditRef);
    const result = rowId
      ? await pool.query<{ id: string; site_version_id: string; source: string; details: Record<string, unknown> }>(
          `
          select id::text as id, site_version_id::text as site_version_id, source::text as source, details
          from public.gnr8_runtime_version_audit
          where id = $1::uuid
          limit 1
          `,
          [rowId],
        )
      : await pool.query<{ id: string; site_version_id: string; source: string; details: Record<string, unknown> }>(
          `
          select id::text as id, site_version_id::text as site_version_id, source::text as source, details
          from public.gnr8_runtime_version_audit
          where id::text = $1::text or details->>'auditMarker' = $1::text
          limit 1
          `,
          [ref],
        );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      siteVersionId: row.site_version_id,
      source: row.source,
      details: objectValue(row.details) ?? {},
    };
  }
}

export async function rollbackAirshipSimplePromoteToPreviousPointer(
  input: AirshipSimplePromoteRollbackInput,
  dependencies: Partial<AirshipSimplePromoteRollbackDependencies> = {},
): Promise<AirshipSimplePromoteRollbackOutput> {
  validateInputKeys(input);
  const deps: AirshipSimplePromoteRollbackDependencies = {
    auditRepository: dependencies.auditRepository ?? new PostgresAirshipSimplePromoteRollbackAuditRepository(),
    getSiteVersion: dependencies.getSiteVersion ?? getSiteVersion,
    getArtifactById: dependencies.getArtifactById ?? getArtifactById,
    getActivePointerForSite: dependencies.getActivePointerForSite ?? getActivePointerForSite,
    switchActivePointer: dependencies.switchActivePointer ?? switchActivePointer,
    recordPublishActivationAudit: dependencies.recordPublishActivationAudit ?? recordPublishActivationAudit,
  };

  const migrationId = uuid("migrationId", input.migrationId);
  const currentSiteVersionId = uuid("currentSiteVersionId", input.currentSiteVersionId);
  const currentArtifactId = uuid("currentArtifactId", input.currentArtifactId);
  const rollbackSiteVersionId = uuid("rollbackSiteVersionId", input.rollbackSiteVersionId);
  const rollbackArtifactId = uuid("rollbackArtifactId", input.rollbackArtifactId);
  const promoteAuditRowId = text(input.promoteAuditRowId);
  const promoteAuditRef = text(input.promoteAuditRef);
  const idempotencyKey = required("idempotencyKey", input.idempotencyKey);
  const actorId = required("actorId", input.actorId);
  const reason = text(input.reason);
  if (!promoteAuditRowId && !promoteAuditRef) throw new Error("airship_simple_promote_rollback_promoteAuditRef_required");
  if (promoteAuditRowId && !UUIDISH.test(promoteAuditRowId)) throw new Error("airship_simple_promote_rollback_promoteAuditRowId_invalid");

  const currentPointer = pointerFromRequest(currentSiteVersionId, currentArtifactId);
  const rollbackPointer = pointerFromRequest(rollbackSiteVersionId, rollbackArtifactId);
  assertPointer("current", currentPointer, AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_CURRENT_POINTER);
  assertPointer("rollback", rollbackPointer, AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_TARGET_POINTER);

  const rollbackVersion = await deps.getSiteVersion(rollbackSiteVersionId);
  const rollbackArtifact = await deps.getArtifactById(rollbackArtifactId);
  assertRollbackTargetExists({ rollbackVersion, rollbackArtifact, rollbackPointer });

  const promoteAudit = requirePromoteAuditMatches({
    migrationId,
    audit: await deps.auditRepository.readPromoteAudit({ promoteAuditRowId, promoteAuditRef }),
    currentPointer,
    rollbackPointer,
  });

  const previousPointer = requirePointer(
    "active_pointer",
    await deps.getActivePointerForSite(AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID),
  );
  const refs = {
    migrationId,
    runtimeSiteId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID,
    currentSiteVersionId,
    currentArtifactId,
    rollbackSiteVersionId,
    rollbackArtifactId,
    promoteAuditRef,
    promoteAuditRowId,
    idempotencyKey,
  };

  if (samePointer(previousPointer, rollbackPointer)) {
    const postRollbackAudit = auditMarker({ phase: "post_rollback_noop", migrationId, idempotencyKey });
    await deps.recordPublishActivationAudit({
      siteVersionId: rollbackSiteVersionId,
      actor: actorId,
      source: "manual",
      details: auditDetails({
        phase: "post_rollback_noop",
        migrationId,
        idempotencyKey,
        reason,
        actorId,
        promoteAuditRowId: promoteAudit.id,
        previousPointer,
        currentPointer,
        restoredPointer: previousPointer,
        switched: false,
      }),
    });
    return {
      ok: true,
      outcome: "noop_already_rolled_back",
      rolledBack: false,
      noOp: true,
      serviceVersion: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_SERVICE_VERSION,
      previousPointer,
      currentPointer,
      restoredPointer: previousPointer,
      rollbackTarget: rollbackPointer,
      auditRefs: {
        source: "gnr8_runtime_version_audit",
        promoteAuditRowId: promoteAudit.id,
        preRollbackAudit: postRollbackAudit,
        postRollbackAudit,
        siteVersionId: rollbackSiteVersionId,
      },
      refs,
    };
  }

  if (!samePointer(previousPointer, currentPointer)) {
    throw new Error("airship_simple_promote_rollback_current_active_pointer_mismatch");
  }

  const preRollbackAudit = auditMarker({ phase: "pre_rollback", migrationId, idempotencyKey });
  await deps.recordPublishActivationAudit({
    siteVersionId: rollbackSiteVersionId,
    actor: actorId,
    source: "manual",
    details: auditDetails({
      phase: "pre_rollback",
      migrationId,
      idempotencyKey,
      reason,
      actorId,
      promoteAuditRowId: promoteAudit.id,
      previousPointer,
      currentPointer,
      restoredPointer: null,
      switched: false,
    }),
  });

  await deps.switchActivePointer({
    siteId: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID,
    siteVersionId: rollbackSiteVersionId,
    artifactId: rollbackArtifactId,
  });

  const restoredPointer = requirePointer(
    "restored_active_pointer",
    await deps.getActivePointerForSite(AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_RUNTIME_SITE_ID),
  );
  if (!samePointer(restoredPointer, rollbackPointer)) {
    throw new Error("airship_simple_promote_rollback_restored_pointer_mismatch");
  }

  const postRollbackAudit = auditMarker({ phase: "post_rollback_readback", migrationId, idempotencyKey });
  await deps.recordPublishActivationAudit({
    siteVersionId: rollbackSiteVersionId,
    actor: actorId,
    source: "manual",
    details: auditDetails({
      phase: "post_rollback_readback",
      migrationId,
      idempotencyKey,
      reason,
      actorId,
      promoteAuditRowId: promoteAudit.id,
      previousPointer,
      currentPointer,
      restoredPointer,
      switched: true,
    }),
  });

  return {
    ok: true,
    outcome: "rolled_back",
    rolledBack: true,
    noOp: false,
    serviceVersion: AIRSHIP_SIMPLE_PROMOTE_ROLLBACK_SERVICE_VERSION,
    previousPointer,
    currentPointer,
    restoredPointer,
    rollbackTarget: rollbackPointer,
    auditRefs: {
      source: "gnr8_runtime_version_audit",
      promoteAuditRowId: promoteAudit.id,
      preRollbackAudit,
      postRollbackAudit,
      siteVersionId: rollbackSiteVersionId,
    },
    refs,
  };
}
