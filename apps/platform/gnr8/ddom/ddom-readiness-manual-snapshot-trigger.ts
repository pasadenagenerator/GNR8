import "server-only";

import {
  DdomReadinessManualSnapshotCaller,
  type DdomReadinessManualSnapshotCallerInput,
  type DdomReadinessManualSnapshotCallerOutput,
} from "./ddom-readiness-manual-snapshot-caller";
import type { DdomPrivacyLabel, DdomRetentionClass } from "./ddom-readiness-snapshot-writer";
import type { DdomPasrImplicationSummary } from "./ddom-readiness-stored-state-mapper";
import type { DdomReadinessStoredStateRequestScope } from "./ddom-readiness-stored-state-repository";

export type DdomReadinessManualSnapshotTriggerActorType = "human" | "system";

export type DdomReadinessManualSnapshotTriggerActorScope = {
  tenantIds?: readonly string[] | null;
  clientIds?: readonly string[] | null;
  agencyIds?: readonly string[] | null;
  siteIds?: readonly string[] | null;
  ownershipSiteIds?: readonly string[] | null;
  domainBindingIds?: readonly string[] | null;
  hostBindingIds?: readonly string[] | null;
};

export type DdomReadinessManualSnapshotTriggerInput = {
  actorType: DdomReadinessManualSnapshotTriggerActorType;
  actorId: string;
  actorDisplayLabel?: string | null;
  actorRoles?: readonly string[] | null;
  actorScope?: DdomReadinessManualSnapshotTriggerActorScope | null;
  tenantId: string;
  clientId?: string | null;
  agencyId?: string | null;
  ownershipSiteId?: string | null;
  siteId: string;
  siteVersionId?: string | null;
  domainBindingId?: string | null;
  hostBindingId?: string | null;
  intendedDomain?: string | null;
  internalHost?: string | null;
  environment?: string | null;
  stage?: string | null;
  requestScope: DdomReadinessStoredStateRequestScope;
  reason: string;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  privacyLabel: DdomPrivacyLabel;
  retentionClass: DdomRetentionClass;
  domainExceptionApprovalRequestId?: string | null;
  domainExceptionApprovalDecisionId?: string | null;
  domainExceptionEvidencePackageId?: string | null;
  manualCompletionEvidencePackageId?: string | null;
  auditEventId?: string | null;
  readinessTtlHours?: number | null;
};

export type DdomReadinessManualSnapshotTriggerAuthorizationRequest = {
  actorType: DdomReadinessManualSnapshotTriggerActorType;
  actorId: string;
  actorRoles: string[];
  actorScope: DdomReadinessManualSnapshotTriggerActorScope | null;
  tenantId: string;
  clientId: string | null;
  agencyId: string | null;
  ownershipSiteId: string | null;
  siteId: string;
  siteVersionId: string | null;
  domainBindingId: string | null;
  hostBindingId: string | null;
  intendedDomain: string | null;
  internalHost: string | null;
  environment: string;
  stage: string;
  requestScope: DdomReadinessStoredStateRequestScope;
  reason: string;
  correlationId: string;
  idempotencyKey: string;
};

export type DdomReadinessManualSnapshotTriggerAuthorizationDecision = {
  authorized: boolean;
  decision: "authorized" | "rejected";
  reasonCode?: string | null;
  summary?: string | null;
  matchedRole?: string | null;
  matchedScopes?: readonly string[] | null;
  warnings?: readonly string[] | null;
};

export type DdomReadinessManualSnapshotTriggerAuthorizationAdapter = {
  authorizeDdomReadinessManualSnapshotTrigger(
    request: DdomReadinessManualSnapshotTriggerAuthorizationRequest,
  ): Promise<DdomReadinessManualSnapshotTriggerAuthorizationDecision>;
};

export type DdomReadinessManualSnapshotTriggerAuthorizationSummary = {
  checked: boolean;
  authorized: boolean;
  actorId: string | null;
  actorType: DdomReadinessManualSnapshotTriggerActorType | null;
  actorRoles: string[];
  matchedRole: string | null;
  matchedScopes: string[];
  reasonCode: string | null;
  summary: string;
  failClosed: boolean;
};

export type DdomReadinessManualSnapshotTriggerBoundary = {
  publishReadyApprovalGranted: false;
  publishActionPerformed: false;
  providerCallsPerformed: false;
  sourceStateMutationPerformed: false;
  aafApprovalCreated: false;
  aafEvidencePackageCreated: false;
  pasrSnapshotCreationPerformed: false;
};

export type DdomReadinessManualSnapshotTriggerResult = DdomReadinessManualSnapshotTriggerBoundary & {
  kind: "ddom_readiness_manual_snapshot_trigger_result_v1";
  status: "accepted" | "rejected";
  rejectionCode: string | null;
  snapshotId: string | null;
  readinessStatus: string | null;
  freshnessStatus: string | null;
  sourceWatermark: string | null;
  sourceRefsCount: number;
  warningsCount: number;
  blockersCount: number;
  limitationsCount: number;
  reusedExisting: boolean;
  authorizationSummary: DdomReadinessManualSnapshotTriggerAuthorizationSummary;
  pasrImplication: DdomPasrImplicationSummary;
  operatorMessage: string;
};

export type DdomReadinessManualSnapshotTriggerCallerLike = {
  createManualReadinessSnapshot(input: DdomReadinessManualSnapshotCallerInput): Promise<DdomReadinessManualSnapshotCallerOutput>;
};

export type DdomReadinessManualSnapshotTriggerDeps = {
  authorization?: DdomReadinessManualSnapshotTriggerAuthorizationAdapter | null;
  caller?: DdomReadinessManualSnapshotTriggerCallerLike;
};

const DDOM_TRIGGER_ALLOWED_ROLES = new Set([
  "superadmin",
  "owner",
  "admin",
  "agency_admin",
  "client_admin",
  "domain_operator",
  "ddom_operator",
  "publish_operator",
]);

const EMPTY_PASR_IMPLICATION: DdomPasrImplicationSummary = {
  pasrStatus: "blocked",
  warnings: [],
  blockers: ["ddom_manual_snapshot_trigger_rejected"],
  staleReason: "ddom_manual_snapshot_trigger_rejected",
};

const BOUNDARY_CONFIRMATION: DdomReadinessManualSnapshotTriggerBoundary = {
  publishReadyApprovalGranted: false,
  publishActionPerformed: false,
  providerCallsPerformed: false,
  sourceStateMutationPerformed: false,
  aafApprovalCreated: false,
  aafEvidencePackageCreated: false,
  pasrSnapshotCreationPerformed: false,
};

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function required(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function normalizedRoles(value: readonly string[] | null | undefined): string[] {
  return [...new Set((value ?? []).map((role) => text(role)?.toLowerCase()).filter((role): role is string => Boolean(role)))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function normalizedScopeList(value: readonly string[] | null | undefined): string[] {
  return [...new Set((value ?? []).map((entry) => text(entry)).filter((entry): entry is string => Boolean(entry)))].sort((left, right) =>
    left.localeCompare(right),
  );
}

function hasAnyScope(scope: DdomReadinessManualSnapshotTriggerActorScope | null): boolean {
  if (!scope) return false;
  return (
    normalizedScopeList(scope.tenantIds).length > 0 ||
    normalizedScopeList(scope.clientIds).length > 0 ||
    normalizedScopeList(scope.agencyIds).length > 0 ||
    normalizedScopeList(scope.siteIds).length > 0 ||
    normalizedScopeList(scope.ownershipSiteIds).length > 0 ||
    normalizedScopeList(scope.domainBindingIds).length > 0 ||
    normalizedScopeList(scope.hostBindingIds).length > 0
  );
}

function scopeContains(scope: DdomReadinessManualSnapshotTriggerActorScope | null, field: keyof DdomReadinessManualSnapshotTriggerActorScope, value: string | null): boolean {
  if (!value) return true;
  const allowed = normalizedScopeList(scope?.[field]);
  return allowed.length === 0 || allowed.includes(value);
}

function scopeMatches(request: DdomReadinessManualSnapshotTriggerAuthorizationRequest): { matches: boolean; matchedScopes: string[]; reasonCode: string | null } {
  if (request.actorRoles.includes("superadmin")) {
    return { matches: true, matchedScopes: ["superadmin"], reasonCode: null };
  }
  if (!hasAnyScope(request.actorScope)) {
    return { matches: false, matchedScopes: [], reasonCode: "actor_scope_missing" };
  }

  const checks: Array<[keyof DdomReadinessManualSnapshotTriggerActorScope, string | null, string]> = [
    ["tenantIds", request.tenantId, "tenant"],
    ["clientIds", request.clientId, "client"],
    ["agencyIds", request.agencyId, "agency"],
    ["siteIds", request.siteId, "site"],
    ["ownershipSiteIds", request.ownershipSiteId, "ownership_site"],
    ["domainBindingIds", request.domainBindingId, "domain_binding"],
    ["hostBindingIds", request.hostBindingId, "host_binding"],
  ];
  const matchedScopes: string[] = [];
  for (const [field, value, label] of checks) {
    if (!scopeContains(request.actorScope, field, value)) {
      return { matches: false, matchedScopes, reasonCode: `${label}_scope_mismatch` };
    }
    if (value && normalizedScopeList(request.actorScope?.[field]).includes(value)) {
      matchedScopes.push(label);
    }
  }
  return { matches: true, matchedScopes, reasonCode: null };
}

function buildAuthorizationSummary(input: {
  checked: boolean;
  authorized: boolean;
  actorId: string | null;
  actorType: DdomReadinessManualSnapshotTriggerActorType | null;
  actorRoles: string[];
  matchedRole?: string | null;
  matchedScopes?: readonly string[] | null;
  reasonCode?: string | null;
  summary?: string | null;
}): DdomReadinessManualSnapshotTriggerAuthorizationSummary {
  return {
    checked: input.checked,
    authorized: input.authorized,
    actorId: input.actorId,
    actorType: input.actorType,
    actorRoles: input.actorRoles,
    matchedRole: input.matchedRole ?? null,
    matchedScopes: [...(input.matchedScopes ?? [])],
    reasonCode: input.reasonCode ?? null,
    summary: input.summary ?? (input.authorized ? "Authorized DDOM manual snapshot trigger." : "DDOM manual snapshot trigger rejected fail-closed."),
    failClosed: !input.authorized,
  };
}

function rejectedResult(input: {
  code: string;
  authorizationSummary: DdomReadinessManualSnapshotTriggerAuthorizationSummary;
  operatorMessage?: string;
  pasrImplication?: DdomPasrImplicationSummary;
}): DdomReadinessManualSnapshotTriggerResult {
  return {
    kind: "ddom_readiness_manual_snapshot_trigger_result_v1",
    status: "rejected",
    rejectionCode: input.code,
    snapshotId: null,
    readinessStatus: null,
    freshnessStatus: null,
    sourceWatermark: null,
    sourceRefsCount: 0,
    warningsCount: 0,
    blockersCount: 0,
    limitationsCount: 0,
    reusedExisting: false,
    authorizationSummary: input.authorizationSummary,
    pasrImplication: input.pasrImplication ?? EMPTY_PASR_IMPLICATION,
    operatorMessage: input.operatorMessage ?? "DDOM readiness snapshot trigger rejected.",
    ...BOUNDARY_CONFIRMATION,
  };
}

function validateTriggerInput(input: DdomReadinessManualSnapshotTriggerInput): DdomReadinessManualSnapshotTriggerAuthorizationRequest {
  const actorType = required("actorType", input.actorType) as DdomReadinessManualSnapshotTriggerActorType;
  if (actorType !== "human" && actorType !== "system") throw new Error("actorType must be human or system");
  const actorId = required("actorId", input.actorId);
  const tenantId = required("tenantId", input.tenantId);
  const siteId = required("siteId", input.siteId);
  const reason = required("reason", input.reason);
  const correlationId = required("correlationId", input.correlationId);
  const idempotencyKey = required("idempotencyKey", input.idempotencyKey);
  required("privacyLabel", input.privacyLabel);
  required("retentionClass", input.retentionClass);
  if (input.requestScope !== "custom_domain" && input.requestScope !== "internal_host" && input.requestScope !== "no_custom_domain") {
    throw new Error("requestScope must be custom_domain, internal_host, or no_custom_domain");
  }
  if (input.requestScope === "custom_domain" && !text(input.domainBindingId) && !text(input.intendedDomain)) {
    throw new Error("custom_domain snapshots require domainBindingId or intendedDomain");
  }
  if (input.requestScope === "internal_host" && !text(input.hostBindingId) && !text(input.internalHost)) {
    throw new Error("internal_host snapshots require hostBindingId or internalHost");
  }

  return {
    actorType,
    actorId,
    actorRoles: normalizedRoles(input.actorRoles),
    actorScope: input.actorScope ?? null,
    tenantId,
    clientId: text(input.clientId),
    agencyId: text(input.agencyId),
    ownershipSiteId: text(input.ownershipSiteId),
    siteId,
    siteVersionId: text(input.siteVersionId),
    domainBindingId: text(input.domainBindingId),
    hostBindingId: text(input.hostBindingId),
    intendedDomain: text(input.intendedDomain),
    internalHost: text(input.internalHost),
    environment: text(input.environment) ?? "production",
    stage: text(input.stage) ?? "production",
    requestScope: input.requestScope,
    reason,
    correlationId,
    idempotencyKey,
  };
}

function callerInputFromTrigger(input: DdomReadinessManualSnapshotTriggerInput): DdomReadinessManualSnapshotCallerInput {
  return {
    actorType: input.actorType,
    actorId: input.actorId,
    actorDisplayLabel: input.actorDisplayLabel,
    tenantId: input.tenantId,
    clientId: input.clientId,
    agencyId: input.agencyId,
    ownershipSiteId: input.ownershipSiteId,
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    domainBindingId: input.domainBindingId,
    hostBindingId: input.hostBindingId,
    intendedDomain: input.intendedDomain,
    internalHost: input.internalHost,
    environment: input.environment,
    stage: input.stage,
    requestScope: input.requestScope,
    reason: input.reason,
    correlationId: input.correlationId,
    causationId: input.causationId,
    idempotencyKey: input.idempotencyKey,
    privacyLabel: input.privacyLabel,
    retentionClass: input.retentionClass,
    domainExceptionApprovalRequestId: input.domainExceptionApprovalRequestId,
    domainExceptionApprovalDecisionId: input.domainExceptionApprovalDecisionId,
    domainExceptionEvidencePackageId: input.domainExceptionEvidencePackageId,
    manualCompletionEvidencePackageId: input.manualCompletionEvidencePackageId,
    auditEventId: input.auditEventId,
    readinessTtlHours: input.readinessTtlHours,
  };
}

export class DdomReadinessManualSnapshotTrigger {
  constructor(private readonly deps: DdomReadinessManualSnapshotTriggerDeps = {}) {}

  async triggerManualReadinessSnapshot(input: DdomReadinessManualSnapshotTriggerInput): Promise<DdomReadinessManualSnapshotTriggerResult> {
    let request: DdomReadinessManualSnapshotTriggerAuthorizationRequest;
    try {
      request = validateTriggerInput(input);
    } catch (error) {
      return rejectedResult({
        code: "trigger_input_invalid",
        authorizationSummary: buildAuthorizationSummary({
          checked: false,
          authorized: false,
          actorId: text(input.actorId),
          actorType: text(input.actorType) as DdomReadinessManualSnapshotTriggerActorType | null,
          actorRoles: normalizedRoles(input.actorRoles),
          reasonCode: error instanceof Error ? error.message : "trigger_input_invalid",
          summary: "DDOM manual snapshot trigger input failed validation.",
        }),
      });
    }

    if (!this.deps.authorization) {
      return rejectedResult({
        code: "authorization_adapter_missing",
        authorizationSummary: buildAuthorizationSummary({
          checked: false,
          authorized: false,
          actorId: request.actorId,
          actorType: request.actorType,
          actorRoles: request.actorRoles,
          reasonCode: "authorization_adapter_missing",
          summary: "DDOM manual snapshot trigger has no authorization adapter and failed closed.",
        }),
      });
    }

    const matchedRole = request.actorRoles.find((role) => DDOM_TRIGGER_ALLOWED_ROLES.has(role)) ?? null;
    if (!matchedRole) {
      return rejectedResult({
        code: "actor_role_not_authorized",
        authorizationSummary: buildAuthorizationSummary({
          checked: true,
          authorized: false,
          actorId: request.actorId,
          actorType: request.actorType,
          actorRoles: request.actorRoles,
          reasonCode: "actor_role_not_authorized",
          summary: "Actor role is not authorized for DDOM manual readiness snapshot creation.",
        }),
      });
    }

    const localScope = scopeMatches(request);
    if (!localScope.matches) {
      return rejectedResult({
        code: localScope.reasonCode ?? "actor_scope_not_authorized",
        authorizationSummary: buildAuthorizationSummary({
          checked: true,
          authorized: false,
          actorId: request.actorId,
          actorType: request.actorType,
          actorRoles: request.actorRoles,
          matchedRole,
          matchedScopes: localScope.matchedScopes,
          reasonCode: localScope.reasonCode,
          summary: "Actor scope does not match DDOM manual readiness snapshot subject.",
        }),
      });
    }

    let decision: DdomReadinessManualSnapshotTriggerAuthorizationDecision;
    try {
      decision = await this.deps.authorization.authorizeDdomReadinessManualSnapshotTrigger(request);
    } catch (error) {
      return rejectedResult({
        code: "authorization_check_failed",
        authorizationSummary: buildAuthorizationSummary({
          checked: true,
          authorized: false,
          actorId: request.actorId,
          actorType: request.actorType,
          actorRoles: request.actorRoles,
          matchedRole,
          matchedScopes: localScope.matchedScopes,
          reasonCode: error instanceof Error ? error.message : "authorization_check_failed",
          summary: "DDOM manual snapshot authorization adapter failed closed.",
        }),
      });
    }

    if (!decision.authorized || decision.decision !== "authorized") {
      return rejectedResult({
        code: decision.reasonCode ?? "authorization_rejected",
        authorizationSummary: buildAuthorizationSummary({
          checked: true,
          authorized: false,
          actorId: request.actorId,
          actorType: request.actorType,
          actorRoles: request.actorRoles,
          matchedRole: decision.matchedRole ?? matchedRole,
          matchedScopes: decision.matchedScopes ?? localScope.matchedScopes,
          reasonCode: decision.reasonCode ?? "authorization_rejected",
          summary: decision.summary ?? "DDOM manual snapshot authorization rejected.",
        }),
      });
    }

    const authorizationSummary = buildAuthorizationSummary({
      checked: true,
      authorized: true,
      actorId: request.actorId,
      actorType: request.actorType,
      actorRoles: request.actorRoles,
      matchedRole: decision.matchedRole ?? matchedRole,
      matchedScopes: decision.matchedScopes ?? localScope.matchedScopes,
      reasonCode: decision.reasonCode,
      summary: decision.summary ?? "Authorized DDOM manual snapshot trigger.",
    });

    try {
      const caller = this.deps.caller ?? new DdomReadinessManualSnapshotCaller();
      const output = await caller.createManualReadinessSnapshot(callerInputFromTrigger(input));
      return {
        kind: "ddom_readiness_manual_snapshot_trigger_result_v1",
        status: "accepted",
        rejectionCode: null,
        snapshotId: output.snapshotId,
        readinessStatus: output.readinessStatus,
        freshnessStatus: output.freshnessStatus,
        sourceWatermark: output.sourceWatermark,
        sourceRefsCount: output.sourceRefsCount,
        warningsCount: output.warningsCount,
        blockersCount: output.blockersCount,
        limitationsCount: output.limitationsCount,
        reusedExisting: output.reusedExisting,
        authorizationSummary,
        pasrImplication: output.pasrImplication,
        operatorMessage: output.reusedExisting
          ? "DDOM readiness snapshot already existed for this idempotent request."
          : "DDOM readiness snapshot created from stored GNR8 state.",
        ...BOUNDARY_CONFIRMATION,
      };
    } catch (error) {
      return rejectedResult({
        code: error instanceof Error ? error.name || "ddom_manual_snapshot_caller_failed_closed" : "ddom_manual_snapshot_caller_failed_closed",
        authorizationSummary,
        operatorMessage: "DDOM readiness snapshot creation failed closed before any publish/provider action.",
      });
    }
  }
}

export async function triggerManualDdomReadinessSnapshot(
  input: DdomReadinessManualSnapshotTriggerInput,
  deps: DdomReadinessManualSnapshotTriggerDeps = {},
): Promise<DdomReadinessManualSnapshotTriggerResult> {
  return new DdomReadinessManualSnapshotTrigger(deps).triggerManualReadinessSnapshot(input);
}
