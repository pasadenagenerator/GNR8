import type {
  AirshipOnlineBuilderAllowedEditScope,
  AirshipOnlineBuilderAuditEventName,
  AirshipOnlineBuilderAuditEventRecord,
  AirshipOnlineBuilderMutationBoundaries,
  AirshipOnlineBuilderSessionRecord,
  AirshipOnlineBuilderSiteKey,
} from "./airship-online-builder-worker-contract";

export const AIRSHIP_ONLINE_BUILDER_DEFAULT_MUTATION_BOUNDARIES: AirshipOnlineBuilderMutationBoundaries = {
  noPublishMutation: true,
  noLivePointerMutation: true,
  noDemoMutation: true,
  noDnsMutation: true,
  noProviderMutation: true,
  noBillingMutation: true,
  noEnvMutation: true,
  noSourceCaptureImport: true,
  noCustomerDomainMutation: true,
  noRollbackMutation: true,
  noDryRunMutation: true,
  noShadowPublishMutation: true,
  noPreviewHostBindingMutation: true,
};

export type AirshipOnlineBuilderMigrationAllowlistEntry = {
  migrationId: string;
  siteKey: AirshipOnlineBuilderSiteKey;
  allowedEditScope: AirshipOnlineBuilderAllowedEditScope;
};

export const AIRSHIP_ONLINE_BUILDER_CHS_MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63" as const;

export const AIRSHIP_ONLINE_BUILDER_DEFAULT_MIGRATION_ALLOWLIST: readonly AirshipOnlineBuilderMigrationAllowlistEntry[] = [
  {
    migrationId: AIRSHIP_ONLINE_BUILDER_CHS_MIGRATION_ID,
    siteKey: "chs",
    allowedEditScope: "chs_text_safe_fields_v1",
  },
] as const;

const OPAQUE_SESSION_ID_PATTERN = /^aob_[A-Za-z0-9_-]{18,96}$/;

export function isValidAirshipOnlineBuilderOpaqueSessionId(sessionId: string): boolean {
  return OPAQUE_SESSION_ID_PATTERN.test(sessionId);
}

export function assertValidAirshipOnlineBuilderOpaqueSessionId(sessionId: string): void {
  if (!isValidAirshipOnlineBuilderOpaqueSessionId(sessionId)) {
    throw new Error("airship_online_builder_session_id_invalid");
  }
}

export function isAirshipOnlineBuilderSessionExpired(input: {
  session: Pick<AirshipOnlineBuilderSessionRecord, "expiresAt" | "state">;
  now: Date;
}): boolean {
  if (input.session.state === "expired") return true;
  return Date.parse(input.session.expiresAt) <= input.now.getTime();
}

export function assertAirshipOnlineBuilderSessionOwner(input: {
  session: Pick<AirshipOnlineBuilderSessionRecord, "requestedByUserId" | "ownerOrganizationId">;
  actorUserId: string;
  ownerOrganizationId: string;
}): void {
  if (
    input.session.requestedByUserId !== input.actorUserId ||
    input.session.ownerOrganizationId !== input.ownerOrganizationId
  ) {
    throw new Error("airship_online_builder_session_owner_mismatch");
  }
}

export function findAirshipOnlineBuilderMigrationAllowlistEntry(input: {
  migrationId: string;
  siteKey?: AirshipOnlineBuilderSiteKey | null;
  allowlist?: readonly AirshipOnlineBuilderMigrationAllowlistEntry[];
}): AirshipOnlineBuilderMigrationAllowlistEntry | null {
  const allowlist = input.allowlist ?? AIRSHIP_ONLINE_BUILDER_DEFAULT_MIGRATION_ALLOWLIST;
  return allowlist.find((entry) => {
    if (entry.migrationId !== input.migrationId) return false;
    return input.siteKey ? entry.siteKey === input.siteKey : true;
  }) ?? null;
}

export function validateAirshipOnlineBuilderOriginIntent(input: {
  origin: string;
  allowedOrigins: readonly string[];
  csrfValidated: boolean;
}): { ok: true } | { ok: false; diagnostics: string[] } {
  const diagnostics: string[] = [];
  if (!input.csrfValidated) diagnostics.push("airship_online_builder_csrf_not_validated");
  if (!input.allowedOrigins.includes(input.origin)) diagnostics.push("airship_online_builder_origin_not_allowed");
  return diagnostics.length === 0 ? { ok: true } : { ok: false, diagnostics };
}

export function buildAirshipOnlineBuilderAuditEvent(input: {
  id: string;
  sessionId: string;
  actorUserId: string;
  eventType: AirshipOnlineBuilderAuditEventName;
  severity?: AirshipOnlineBuilderAuditEventRecord["severity"];
  correlationId: string;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}): AirshipOnlineBuilderAuditEventRecord {
  return {
    id: input.id,
    sessionId: input.sessionId,
    actorUserId: input.actorUserId,
    eventType: input.eventType,
    severity: input.severity ?? "info",
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey ?? null,
    metadata: {
      boundaries: AIRSHIP_ONLINE_BUILDER_DEFAULT_MUTATION_BOUNDARIES,
      ...(input.metadata ?? {}),
    },
    createdAt: input.createdAt,
  };
}
