import "server-only";

import type {
  PublishShadowFreshnessState,
  PublishShadowRecommendedActionKey,
  PublishShadowResultReadModel,
  PublishShadowSeverity,
  PublishShadowSourceKey,
  PublishShadowStatus,
} from "./aaf-publish-shadow-result-read-model";

export const PUBLISH_SHADOW_RESULT_REDACTION_VERSION = "pasr-6-publish-shadow-result-redaction:v1" as const;

export const PUBLISH_SHADOW_REDACTION_ROLES = [
  "platform_superadmin",
  "agency_admin",
  "agency_operator",
  "technical_operator",
  "account_manager",
  "client_reviewer",
  "read_only_auditor",
  "support_debug_operator",
  "ai_operator",
] as const;

export type PublishShadowRedactionRole = (typeof PUBLISH_SHADOW_REDACTION_ROLES)[number];

export const PUBLISH_SHADOW_REDACTION_SURFACES = [
  "internal_debug",
  "command_center",
  "ops_inbox",
  "client_portal",
  "audit_export",
  "ai_advisory",
] as const;

export type PublishShadowRedactionSurface = (typeof PUBLISH_SHADOW_REDACTION_SURFACES)[number];

export const PUBLISH_SHADOW_VISIBILITY_LEVELS = ["full", "summarized", "redacted", "hidden", "forbidden"] as const;

export type PublishShadowVisibilityLevel = (typeof PUBLISH_SHADOW_VISIBILITY_LEVELS)[number];

export type PublishShadowRedactionReason =
  | "actor_missing"
  | "role_missing"
  | "surface_missing"
  | "unsupported_role"
  | "unsupported_surface"
  | "surface_forbidden"
  | "client_reviewer_forbidden_mvp"
  | "scope_unresolved"
  | "scope_mismatch"
  | "support_debug_scope_required"
  | "role_surface_not_allowed"
  | "field_not_authorized"
  | "raw_identifier_redacted"
  | "technical_diagnostic_redacted"
  | "client_visibility_deferred_mvp"
  | "ai_raw_identifier_forbidden"
  | "audit_export_diagnostic_redacted";

export type PublishShadowScopeMatchSummary = {
  tenant: "matched" | "not_required" | "missing_actor_scope" | "mismatch" | "unresolved";
  agency: "matched" | "not_required" | "missing_actor_scope" | "mismatch" | "unresolved";
  client: "matched" | "not_required" | "missing_actor_scope" | "mismatch" | "unresolved";
  site: "matched" | "missing_actor_scope" | "mismatch" | "unresolved";
  siteVersion: "matched" | "not_required" | "missing_actor_scope" | "mismatch" | "unresolved";
};

export type PublishShadowVisibilityProfile = {
  overall: PublishShadowVisibilityLevel;
  subjectRefs: PublishShadowVisibilityLevel;
  runtimeRefs: PublishShadowVisibilityLevel;
  ddom: PublishShadowVisibilityLevel;
  ddomRefs: PublishShadowVisibilityLevel;
  publishTarget: PublishShadowVisibilityLevel;
  approval: PublishShadowVisibilityLevel;
  approvalActors: PublishShadowVisibilityLevel;
  evidenceRefs: PublishShadowVisibilityLevel;
  sourceRefs: PublishShadowVisibilityLevel;
  auditRefs: PublishShadowVisibilityLevel;
  gateBlockers: PublishShadowVisibilityLevel;
  correlation: PublishShadowVisibilityLevel;
  idempotency: PublishShadowVisibilityLevel;
  failureReason: PublishShadowVisibilityLevel;
  internalDiagnostics: PublishShadowVisibilityLevel;
  nextAction: PublishShadowVisibilityLevel;
};

export type PublishShadowAccessDecision = {
  allowed: boolean;
  role: PublishShadowRedactionRole | null;
  surface: PublishShadowRedactionSurface | null;
  denialReason: PublishShadowRedactionReason | null;
  scopeMatch: PublishShadowScopeMatchSummary;
  visibilityProfile: PublishShadowVisibilityProfile;
};

export type PublishShadowRedactionActor = {
  actorId?: string | null;
  role?: string | null;
  tenantIds?: readonly string[];
  agencyIds?: readonly string[];
  clientIds?: readonly string[];
  siteIds?: readonly string[];
  siteVersionIds?: readonly string[];
  supportDebugAuthorized?: boolean;
};

export type PublishShadowRedactionSubjectScope = {
  tenantId?: string | null;
  agencyId?: string | null;
  clientId?: string | null;
  siteId?: string | null;
  siteVersionId?: string | null;
};

export type PublishShadowRedactionOptions = {
  supportDebugAuthorized?: boolean;
  auditPolicyAllowsActorIds?: boolean;
  revealTechnicalIdempotencyKeys?: boolean;
};

export type PublishShadowRedactionContext = {
  actor?: PublishShadowRedactionActor | null;
  surface?: string | null;
  subjectScope?: PublishShadowRedactionSubjectScope;
  options?: PublishShadowRedactionOptions;
};

export type PublishShadowRedactedField<T = unknown> = {
  visibility: PublishShadowVisibilityLevel;
  value?: T;
  summary?: string;
  count?: number;
  categories?: string[];
  reason?: PublishShadowRedactionReason;
};

export type PublishShadowRedactedLink = {
  kind: "site" | "site_version" | "runtime_artifact" | "publish_attempt" | "ddom_snapshot" | "publish_target" | "evidence" | "source" | "audit" | "approval" | "correlation";
  visibility: PublishShadowVisibilityLevel;
  ref?: string;
  label: string;
  reason?: PublishShadowRedactionReason;
};

export type PublishShadowRedactedNextActionKey =
  | PublishShadowRecommendedActionKey
  | "technical_follow_up_required"
  | "approval_follow_up_required"
  | "shadow_observation_pending"
  | "no_shadow_follow_up";

export type PublishShadowRedactedNextAction = {
  visibility: PublishShadowVisibilityLevel;
  actionKey: PublishShadowRedactedNextActionKey | null;
  label: string;
  ownerRole: "none" | "technical_operator" | "release_approver" | "superadmin" | "engineering" | "account_manager" | null;
  reason: PublishShadowRedactedField<string | null>;
  safeNow: boolean | null;
  blocksCurrentPublish: false;
  blocksFutureEnforcementReadiness: boolean | null;
  requiredRefs: PublishShadowRedactedLink[];
};

export type PublishShadowRedactedResultProjection = {
  derivedOnly: true;
  shadowOnly: true;
  enforcementApplied: false;
  publishActionBlocked: false;
  createsDdomSnapshot: false;
  createsApproval: false;
  mutatesSourceTruth: false;
  redactionVersion: typeof PUBLISH_SHADOW_RESULT_REDACTION_VERSION;
  readModelVersion: string | null;
  generatedAt: string | null;
  access: PublishShadowAccessDecision;
  visibility: PublishShadowVisibilityLevel;
  hiddenFields: string[];
  redactedFields: string[];
  status: {
    shadowStatus: PublishShadowRedactedField<PublishShadowStatus | null>;
    severity: PublishShadowRedactedField<PublishShadowSeverity | null>;
    readinessResult: PublishShadowRedactedField<PublishShadowResultReadModel["readinessResult"] | null>;
    operatorLabel: PublishShadowRedactedField<string | null>;
    projectionFreshness: PublishShadowRedactedField<PublishShadowFreshnessState | null>;
  };
  summary: {
    operatorSummary: string;
    freshnessSummary: string;
    missingSourceTruthCategories: PublishShadowSourceKey[];
    staleSourceTruthCategories: PublishShadowSourceKey[];
    boundaryLabels: string[];
  };
  subject: {
    tenantId: PublishShadowRedactedField<string | null>;
    clientId: PublishShadowRedactedField<string | null>;
    siteId: PublishShadowRedactedField<string | null>;
    siteVersionId: PublishShadowRedactedField<string | null>;
    runtimeArtifactId: PublishShadowRedactedField<string | null>;
    publishAttemptRef: PublishShadowRedactedField<string | null>;
    intendedPublishTarget: PublishShadowRedactedField<string | null>;
    intendedPublishStage: PublishShadowRedactedField<string | null>;
    trustedPublishEnvironment: PublishShadowRedactedField<string | null>;
  };
  recommendedNextAction: PublishShadowRedactedNextAction;
  sourceTruth: {
    visibility: PublishShadowVisibilityLevel;
    summary: {
      missingCount: number;
      staleCount: number;
      availableCount: number;
      missingCategories: PublishShadowSourceKey[];
      staleCategories: PublishShadowSourceKey[];
    };
    refs: PublishShadowRedactedField[];
    watermarks: PublishShadowRedactedField<Record<string, string | null>>;
  };
  ddomReadiness: {
    visibility: PublishShadowVisibilityLevel;
    status: PublishShadowRedactedField<PublishShadowResultReadModel["ddomReadiness"]["status"] | null>;
    readinessState: PublishShadowRedactedField<string | null>;
    snapshot: PublishShadowRedactedLink;
    freshnessState: PublishShadowRedactedField<PublishShadowFreshnessState | null>;
    capturedAt: PublishShadowRedactedField<string | null>;
    freshUntil: PublishShadowRedactedField<string | null>;
    staleReason: PublishShadowRedactedField<string | null>;
    blockers: PublishShadowRedactedField<string[]>;
    warnings: PublishShadowRedactedField<string[]>;
    createsSnapshot: false;
  };
  publishTarget: {
    visibility: PublishShadowVisibilityLevel;
    status: PublishShadowRedactedField<PublishShadowResultReadModel["publishTarget"]["status"] | null>;
    publishTargetId: PublishShadowRedactedField<string | null>;
    environment: PublishShadowRedactedField<string | null>;
    publishStage: PublishShadowRedactedField<string | null>;
    policyVersion: PublishShadowRedactedField<string | null>;
    sourceRef: PublishShadowRedactedLink;
    sourceWatermark: PublishShadowRedactedField<string | null>;
    limitations: PublishShadowRedactedField<string[]>;
  };
  approval: {
    visibility: PublishShadowVisibilityLevel;
    launchSignoff: PublishShadowRedactedField<PublishShadowResultReadModel["approval"]["launchSignoff"] | null>;
    publishActivation: PublishShadowRedactedField<PublishShadowResultReadModel["approval"]["publishActivation"] | null>;
    approvalRequest: PublishShadowRedactedLink;
    approvalDecision: PublishShadowRedactedLink;
    decisionStatus: PublishShadowRedactedField<string | null>;
    scope: PublishShadowRedactedField<string | null>;
    expiresAt: PublishShadowRedactedField<string | null>;
    actor: PublishShadowRedactedField<{ actorType: string | null; actorId: string | null; actorRole: string | null } | null>;
    createsApproval: false;
    limitations: PublishShadowRedactedField<string[]>;
  };
  evidence: {
    visibility: PublishShadowVisibilityLevel;
    evidencePackage: PublishShadowRedactedLink;
    packageStatus: PublishShadowRedactedField<string | null>;
    packageType: PublishShadowRedactedField<string | null>;
    evidenceCreatedAt: PublishShadowRedactedField<string | null>;
    freshnessLabel: PublishShadowRedactedField<PublishShadowFreshnessState | null>;
    sourceWatermark: PublishShadowRedactedField<string | null>;
    evidenceIdempotencyKey: PublishShadowRedactedField<string | null>;
    limitations: PublishShadowRedactedField<string[]>;
  };
  evidenceRefs: PublishShadowRedactedLink[];
  gateDryRunStatus: {
    visibility: PublishShadowVisibilityLevel;
    dryRunOnly: true;
    actionKey: "publish.activation";
    scope: "publish_activation";
    subjectType: "site_version";
    subjectId: PublishShadowRedactedField<string | null>;
    status: PublishShadowRedactedField<PublishShadowResultReadModel["gateDryRunStatus"]["status"] | null>;
    gateResult: PublishShadowRedactedField<string | null>;
    policyResult: PublishShadowRedactedField<string | null>;
    approvalDecision: PublishShadowRedactedLink;
    gateAttempt: PublishShadowRedactedLink;
    auditEvent: PublishShadowRedactedLink;
    gateDryRunIdempotencyKey: PublishShadowRedactedField<string | null>;
    blockedReasons: PublishShadowRedactedField<string[]>;
    staleEvidenceReasons: PublishShadowRedactedField<string[]>;
    missingSourceWatermarks: PublishShadowRedactedField<string[]>;
    warnings: PublishShadowRedactedField<string[]>;
  };
  correlation: {
    visibility: PublishShadowVisibilityLevel;
    correlationId: PublishShadowRedactedField<string | null>;
    causationId: PublishShadowRedactedField<string | null>;
    requestId: PublishShadowRedactedField<string | null>;
    idempotencyKey: PublishShadowRedactedField<string | null>;
    shadowEvaluationId: PublishShadowRedactedField<string | null>;
    evidenceIdempotencyKey: PublishShadowRedactedField<string | null>;
    gateDryRunIdempotencyKey: PublishShadowRedactedField<string | null>;
    publishAttemptRef: PublishShadowRedactedField<string | null>;
    linkageStrategy: PublishShadowRedactedField<PublishShadowResultReadModel["correlation"]["linkageStrategy"] | null>;
  };
  diagnostics: {
    visibility: PublishShadowVisibilityLevel;
    errorState: PublishShadowRedactedField<PublishShadowResultReadModel["errorState"] | null>;
    failureReason: PublishShadowRedactedField<string | null>;
    warnings: PublishShadowRedactedField<string[]>;
    limitations: PublishShadowRedactedField<string[]>;
    projectionLimitations: PublishShadowRedactedField<PublishShadowResultReadModel["projectionLimitations"]>;
  };
};

const DENIED_VISIBILITY_PROFILE: PublishShadowVisibilityProfile = {
  overall: "forbidden",
  subjectRefs: "forbidden",
  runtimeRefs: "forbidden",
  ddom: "forbidden",
  ddomRefs: "forbidden",
  publishTarget: "forbidden",
  approval: "forbidden",
  approvalActors: "forbidden",
  evidenceRefs: "forbidden",
  sourceRefs: "forbidden",
  auditRefs: "forbidden",
  gateBlockers: "forbidden",
  correlation: "forbidden",
  idempotency: "forbidden",
  failureReason: "forbidden",
  internalDiagnostics: "forbidden",
  nextAction: "forbidden",
};

const ROLE_SURFACE_ALLOWLIST: Record<PublishShadowRedactionSurface, readonly PublishShadowRedactionRole[]> = {
  internal_debug: ["platform_superadmin", "technical_operator", "support_debug_operator"],
  command_center: ["platform_superadmin", "agency_admin", "agency_operator", "technical_operator", "account_manager", "support_debug_operator"],
  ops_inbox: ["platform_superadmin", "agency_admin", "agency_operator", "technical_operator", "account_manager", "support_debug_operator"],
  client_portal: [],
  audit_export: ["platform_superadmin", "read_only_auditor", "support_debug_operator"],
  ai_advisory: ["platform_superadmin", "ai_operator"],
};

function fullProfile(): PublishShadowVisibilityProfile {
  return {
    overall: "full",
    subjectRefs: "full",
    runtimeRefs: "full",
    ddom: "full",
    ddomRefs: "full",
    publishTarget: "full",
    approval: "full",
    approvalActors: "full",
    evidenceRefs: "full",
    sourceRefs: "full",
    auditRefs: "full",
    gateBlockers: "full",
    correlation: "full",
    idempotency: "full",
    failureReason: "full",
    internalDiagnostics: "full",
    nextAction: "full",
  };
}

function profileForRole(role: PublishShadowRedactionRole, surface: PublishShadowRedactionSurface, options: PublishShadowRedactionOptions = {}): PublishShadowVisibilityProfile {
  if (role === "platform_superadmin") return fullProfile();
  if (role === "support_debug_operator") return fullProfile();
  if (role === "technical_operator") {
    return {
      ...fullProfile(),
      approvalActors: "redacted",
      auditRefs: "redacted",
      idempotency: options.revealTechnicalIdempotencyKeys ? "full" : "redacted",
      internalDiagnostics: "full",
    };
  }
  if (role === "read_only_auditor") {
    return {
      overall: "full",
      subjectRefs: "summarized",
      runtimeRefs: "redacted",
      ddom: "summarized",
      ddomRefs: "full",
      publishTarget: "redacted",
      approval: "full",
      approvalActors: options.auditPolicyAllowsActorIds ? "full" : "redacted",
      evidenceRefs: "full",
      sourceRefs: "redacted",
      auditRefs: "full",
      gateBlockers: "summarized",
      correlation: "full",
      idempotency: "redacted",
      failureReason: "redacted",
      internalDiagnostics: "redacted",
      nextAction: "summarized",
    };
  }
  if (role === "agency_admin") {
    return {
      overall: "full",
      subjectRefs: "summarized",
      runtimeRefs: "redacted",
      ddom: "summarized",
      ddomRefs: "redacted",
      publishTarget: "summarized",
      approval: "summarized",
      approvalActors: "redacted",
      evidenceRefs: "redacted",
      sourceRefs: "redacted",
      auditRefs: "redacted",
      gateBlockers: "summarized",
      correlation: "redacted",
      idempotency: "hidden",
      failureReason: "redacted",
      internalDiagnostics: "hidden",
      nextAction: "summarized",
    };
  }
  if (role === "agency_operator") {
    return {
      overall: "full",
      subjectRefs: "summarized",
      runtimeRefs: "hidden",
      ddom: "summarized",
      ddomRefs: "hidden",
      publishTarget: "summarized",
      approval: "summarized",
      approvalActors: "hidden",
      evidenceRefs: "hidden",
      sourceRefs: "hidden",
      auditRefs: "hidden",
      gateBlockers: "summarized",
      correlation: "hidden",
      idempotency: "hidden",
      failureReason: "summarized",
      internalDiagnostics: "hidden",
      nextAction: "summarized",
    };
  }
  if (role === "account_manager") {
    return {
      overall: "summarized",
      subjectRefs: "summarized",
      runtimeRefs: "hidden",
      ddom: "summarized",
      ddomRefs: "hidden",
      publishTarget: "hidden",
      approval: "summarized",
      approvalActors: "hidden",
      evidenceRefs: "hidden",
      sourceRefs: "hidden",
      auditRefs: "hidden",
      gateBlockers: "summarized",
      correlation: "hidden",
      idempotency: "hidden",
      failureReason: "summarized",
      internalDiagnostics: "hidden",
      nextAction: "summarized",
    };
  }
  if (role === "ai_operator" || surface === "ai_advisory") {
    return {
      overall: "summarized",
      subjectRefs: "redacted",
      runtimeRefs: "hidden",
      ddom: "summarized",
      ddomRefs: "redacted",
      publishTarget: "hidden",
      approval: "summarized",
      approvalActors: "hidden",
      evidenceRefs: "redacted",
      sourceRefs: "redacted",
      auditRefs: "redacted",
      gateBlockers: "summarized",
      correlation: "redacted",
      idempotency: "hidden",
      failureReason: "summarized",
      internalDiagnostics: "hidden",
      nextAction: "summarized",
    };
  }
  return DENIED_VISIBILITY_PROFILE;
}

function isSupportedRole(value: string | null | undefined): value is PublishShadowRedactionRole {
  return Boolean(value && (PUBLISH_SHADOW_REDACTION_ROLES as readonly string[]).includes(value));
}

function isSupportedSurface(value: string | null | undefined): value is PublishShadowRedactionSurface {
  return Boolean(value && (PUBLISH_SHADOW_REDACTION_SURFACES as readonly string[]).includes(value));
}

function emptyScopeMatch(): PublishShadowScopeMatchSummary {
  return {
    tenant: "unresolved",
    agency: "not_required",
    client: "unresolved",
    site: "unresolved",
    siteVersion: "unresolved",
  };
}

function scopeHas(values: readonly string[] | undefined, target: string | null | undefined): boolean {
  return Boolean(target && values?.includes(target));
}

function scopedDimension(values: readonly string[] | undefined, target: string | null | undefined, required: boolean): "matched" | "not_required" | "missing_actor_scope" | "mismatch" | "unresolved" {
  if (!target) return required ? "unresolved" : "not_required";
  if (!values || values.length === 0) return "missing_actor_scope";
  return values.includes(target) ? "matched" : "mismatch";
}

function deny(input: {
  role: PublishShadowRedactionRole | null;
  surface: PublishShadowRedactionSurface | null;
  reason: PublishShadowRedactionReason;
  scopeMatch?: PublishShadowScopeMatchSummary;
}): PublishShadowAccessDecision {
  return {
    allowed: false,
    role: input.role,
    surface: input.surface,
    denialReason: input.reason,
    scopeMatch: input.scopeMatch ?? emptyScopeMatch(),
    visibilityProfile: DENIED_VISIBILITY_PROFILE,
  };
}

export function evaluatePublishShadowResultAccess(
  model: PublishShadowResultReadModel,
  context: PublishShadowRedactionContext,
): PublishShadowAccessDecision {
  const actor = context.actor ?? null;
  if (!actor) return deny({ role: null, surface: null, reason: "actor_missing" });
  if (!actor.role) return deny({ role: null, surface: null, reason: "role_missing" });
  if (!context.surface) return deny({ role: null, surface: null, reason: "surface_missing" });
  if (!isSupportedRole(actor.role)) return deny({ role: null, surface: null, reason: "unsupported_role" });
  if (!isSupportedSurface(context.surface)) return deny({ role: actor.role, surface: null, reason: "unsupported_surface" });

  const role = actor.role;
  const surface = context.surface;
  const target = {
    tenantId: context.subjectScope?.tenantId ?? model.tenantId,
    agencyId: context.subjectScope?.agencyId ?? null,
    clientId: context.subjectScope?.clientId ?? model.clientId,
    siteId: context.subjectScope?.siteId ?? model.siteId,
    siteVersionId: context.subjectScope?.siteVersionId ?? model.siteVersionId,
  };

  if (role === "client_reviewer") {
    return deny({ role, surface, reason: "client_reviewer_forbidden_mvp" });
  }
  if (surface === "client_portal") {
    return deny({ role, surface, reason: "surface_forbidden" });
  }
  if (!ROLE_SURFACE_ALLOWLIST[surface].includes(role)) {
    return deny({ role, surface, reason: "role_surface_not_allowed" });
  }

  const superadmin = role === "platform_superadmin";
  const scopeMatch: PublishShadowScopeMatchSummary = superadmin
    ? {
        tenant: target.tenantId ? "matched" : "not_required",
        agency: target.agencyId ? "matched" : "not_required",
        client: target.clientId ? "matched" : "not_required",
        site: target.siteId ? "matched" : "unresolved",
        siteVersion: target.siteVersionId ? "matched" : "not_required",
      }
    : {
        tenant: scopedDimension(actor.tenantIds, target.tenantId, Boolean(target.tenantId)),
        agency: scopedDimension(actor.agencyIds, target.agencyId, Boolean(target.agencyId)),
        client: scopedDimension(actor.clientIds, target.clientId, Boolean(target.clientId)),
        site: scopedDimension(actor.siteIds, target.siteId, true) as PublishShadowScopeMatchSummary["site"],
        siteVersion: scopedDimension(actor.siteVersionIds, target.siteVersionId, false),
      };

  if (!target.siteId) return deny({ role, surface, reason: "scope_unresolved", scopeMatch });
  if (!superadmin) {
    const requiredResults = [scopeMatch.tenant, scopeMatch.agency, scopeMatch.client, scopeMatch.site].filter((item) => item !== "not_required");
    if (requiredResults.some((item) => item === "unresolved" || item === "missing_actor_scope")) {
      return deny({ role, surface, reason: "scope_unresolved", scopeMatch });
    }
    if (requiredResults.some((item) => item === "mismatch")) {
      return deny({ role, surface, reason: "scope_mismatch", scopeMatch });
    }
    if (target.siteVersionId && actor.siteVersionIds && actor.siteVersionIds.length > 0 && !scopeHas(actor.siteVersionIds, target.siteVersionId)) {
      return deny({ role, surface, reason: "scope_mismatch", scopeMatch });
    }
  }

  const supportAuthorized = context.options?.supportDebugAuthorized === true || actor.supportDebugAuthorized === true;
  if (role === "support_debug_operator" && !supportAuthorized) {
    return deny({ role, surface, reason: "support_debug_scope_required", scopeMatch });
  }

  return {
    allowed: true,
    role,
    surface,
    denialReason: null,
    scopeMatch,
    visibilityProfile: profileForRole(role, surface, context.options),
  };
}

function visible<T>(value: T, visibility: PublishShadowVisibilityLevel = "full"): PublishShadowRedactedField<T> {
  return { visibility, value };
}

function summarized<T>(summary: string, value?: T, categories?: string[]): PublishShadowRedactedField<T> {
  return { visibility: "summarized", ...(value === undefined ? {} : { value }), summary, ...(categories ? { categories } : {}) };
}

function redacted<T>(summary: string, count?: number, reason: PublishShadowRedactionReason = "field_not_authorized"): PublishShadowRedactedField<T> {
  return { visibility: "redacted", summary, ...(count === undefined ? {} : { count }), reason };
}

function hidden<T>(reason: PublishShadowRedactionReason = "field_not_authorized"): PublishShadowRedactedField<T> {
  return { visibility: "hidden", reason };
}

function forbidden<T>(reason: PublishShadowRedactionReason = "field_not_authorized"): PublishShadowRedactedField<T> {
  return { visibility: "forbidden", reason };
}

function fieldFor<T>(value: T, visibility: PublishShadowVisibilityLevel, summary: string, reason: PublishShadowRedactionReason = "field_not_authorized"): PublishShadowRedactedField<T> {
  if (visibility === "full") return visible(value);
  if (visibility === "summarized") return summarized(summary);
  if (visibility === "redacted") return redacted(summary, value === null || value === undefined ? 0 : 1, reason);
  if (visibility === "hidden") return hidden(reason);
  return forbidden(reason);
}

function stringListField(values: readonly string[], visibility: PublishShadowVisibilityLevel, summary: string, reason: PublishShadowRedactionReason): PublishShadowRedactedField<string[]> {
  if (visibility === "full") return visible([...values]);
  if (visibility === "summarized") return { visibility: "summarized", summary, count: values.length };
  if (visibility === "redacted") return redacted(summary, values.length, reason);
  if (visibility === "hidden") return hidden(reason);
  return forbidden(reason);
}

function link(kind: PublishShadowRedactedLink["kind"], ref: string | null | undefined, visibility: PublishShadowVisibilityLevel, label: string, reason: PublishShadowRedactionReason = "raw_identifier_redacted"): PublishShadowRedactedLink {
  if (visibility === "full" && ref) return { kind, visibility, ref, label };
  if (visibility === "summarized") return { kind, visibility, label };
  if (visibility === "redacted") return { kind, visibility, label, reason };
  if (visibility === "hidden") return { kind, visibility, label, reason };
  return { kind, visibility: "forbidden", label, reason };
}

function safeOperatorSummary(model: PublishShadowResultReadModel): string {
  return `${model.operatorLabel} Boundary: derived-only, shadow-only, non-enforcing, did not block publish.`;
}

function freshnessSummary(model: PublishShadowResultReadModel): string {
  return `Projection freshness is ${model.projectionFreshness}; source truth has ${model.sourceTruthSummary.availableCount} available, ${model.sourceTruthSummary.missingCount} missing, and ${model.sourceTruthSummary.staleCount} stale categories.`;
}

function nextActionLabel(actionKey: PublishShadowRedactedNextActionKey | null): string {
  switch (actionKey) {
    case "none":
    case "no_shadow_follow_up":
      return "No shadow follow-up.";
    case "review_warnings":
      return "Review shadow warnings.";
    case "run_ddom_manual_trigger_outside_pasr":
    case "refresh_stale_ddom_snapshot_outside_pasr":
      return "Refresh domain readiness through the DDOM workflow.";
    case "request_publish_activation_approval":
    case "approval_follow_up_required":
      return "Route publish activation approval in AAF.";
    case "configure_verify_publish_target_source_truth":
      return "Ask a technical operator to verify publish target configuration.";
    case "review_source_reader_failure":
    case "review_evidence_builder_failure":
      return "Escalate source reconstruction issue.";
    case "review_gate_dry_run_failure":
      return "Escalate gate dry-run issue.";
    case "escalate_domain_dns_ambiguity":
      return "Escalate domain readiness ambiguity.";
    case "wait_for_shadow_observer_to_run":
    case "shadow_observation_pending":
      return "Wait for or verify shadow observation availability.";
    case "technical_follow_up_required":
      return "Technical follow-up required.";
    default:
      return "Shadow follow-up unavailable.";
  }
}

function summarizedActionKey(actionKey: PublishShadowRecommendedActionKey): PublishShadowRedactedNextActionKey {
  if (actionKey === "none") return "no_shadow_follow_up";
  if (actionKey === "request_publish_activation_approval") return actionKey;
  if (actionKey === "wait_for_shadow_observer_to_run") return "shadow_observation_pending";
  if (actionKey === "review_warnings") return actionKey;
  if (actionKey === "run_ddom_manual_trigger_outside_pasr" || actionKey === "refresh_stale_ddom_snapshot_outside_pasr") {
    return "technical_follow_up_required";
  }
  if (actionKey === "configure_verify_publish_target_source_truth") return "technical_follow_up_required";
  if (actionKey === "review_gate_dry_run_failure") return "technical_follow_up_required";
  if (actionKey === "review_source_reader_failure" || actionKey === "review_evidence_builder_failure") return "technical_follow_up_required";
  if (actionKey === "escalate_domain_dns_ambiguity") return "technical_follow_up_required";
  return "technical_follow_up_required";
}

function redactNextAction(model: PublishShadowResultReadModel, profile: PublishShadowVisibilityProfile): PublishShadowRedactedNextAction {
  const raw = model.recommendedNextAction;
  if (profile.nextAction === "forbidden" || profile.nextAction === "hidden") {
    return {
      visibility: profile.nextAction,
      actionKey: null,
      label: "Shadow follow-up unavailable.",
      ownerRole: null,
      reason: hidden("field_not_authorized"),
      safeNow: null,
      blocksCurrentPublish: false,
      blocksFutureEnforcementReadiness: null,
      requiredRefs: [],
    };
  }

  const actionKey = profile.nextAction === "full" ? raw.actionKey : summarizedActionKey(raw.actionKey);
  const refsVisibility = profile.nextAction === "full" ? "full" : profile.evidenceRefs === "full" ? "redacted" : profile.nextAction;
  return {
    visibility: profile.nextAction,
    actionKey,
    label: nextActionLabel(actionKey),
    ownerRole: raw.ownerRole,
    reason: fieldFor(raw.reason, profile.nextAction === "full" ? "full" : "summarized", "Reason summarized for this role.", "technical_diagnostic_redacted"),
    safeNow: raw.safeNow,
    blocksCurrentPublish: false,
    blocksFutureEnforcementReadiness: raw.blocksFutureEnforcementReadiness,
    requiredRefs:
      refsVisibility === "full"
        ? raw.requiredRefs.map((ref) => link("source", ref, "full", "Required source ref"))
        : raw.requiredRefs.length > 0
          ? [link("source", null, "redacted", `${raw.requiredRefs.length} required refs restricted`)]
          : [],
  };
}

function hiddenDeniedProjection(access: PublishShadowAccessDecision): PublishShadowRedactedResultProjection {
  const forbiddenStatus = forbidden<null>(access.denialReason ?? "field_not_authorized");
  const forbiddenLinks: PublishShadowRedactedLink[] = [];
  return {
    derivedOnly: true,
    shadowOnly: true,
    enforcementApplied: false,
    publishActionBlocked: false,
    createsDdomSnapshot: false,
    createsApproval: false,
    mutatesSourceTruth: false,
    redactionVersion: PUBLISH_SHADOW_RESULT_REDACTION_VERSION,
    readModelVersion: null,
    generatedAt: null,
    access,
    visibility: "forbidden",
    hiddenFields: ["publishShadowResult"],
    redactedFields: [],
    status: {
      shadowStatus: forbiddenStatus,
      severity: forbiddenStatus,
      readinessResult: forbiddenStatus,
      operatorLabel: forbiddenStatus,
      projectionFreshness: forbiddenStatus,
    },
    summary: {
      operatorSummary: "Publish shadow result is not visible for this actor, scope, or surface.",
      freshnessSummary: "Unavailable.",
      missingSourceTruthCategories: [],
      staleSourceTruthCategories: [],
      boundaryLabels: ["derived_only", "shadow_only", "non_enforcing", "publish_not_blocked"],
    },
    subject: {
      tenantId: forbiddenStatus,
      clientId: forbiddenStatus,
      siteId: forbiddenStatus,
      siteVersionId: forbiddenStatus,
      runtimeArtifactId: forbiddenStatus,
      publishAttemptRef: forbiddenStatus,
      intendedPublishTarget: forbiddenStatus,
      intendedPublishStage: forbiddenStatus,
      trustedPublishEnvironment: forbiddenStatus,
    },
    recommendedNextAction: {
      visibility: "forbidden",
      actionKey: null,
      label: "Shadow follow-up unavailable.",
      ownerRole: null,
      reason: forbiddenStatus,
      safeNow: null,
      blocksCurrentPublish: false,
      blocksFutureEnforcementReadiness: null,
      requiredRefs: [],
    },
    sourceTruth: {
      visibility: "forbidden",
      summary: { missingCount: 0, staleCount: 0, availableCount: 0, missingCategories: [], staleCategories: [] },
      refs: [],
      watermarks: forbidden("field_not_authorized"),
    },
    ddomReadiness: {
      visibility: "forbidden",
      status: forbiddenStatus,
      readinessState: forbiddenStatus,
      snapshot: link("ddom_snapshot", null, "forbidden", "DDOM snapshot unavailable"),
      freshnessState: forbiddenStatus,
      capturedAt: forbiddenStatus,
      freshUntil: forbiddenStatus,
      staleReason: forbiddenStatus,
      blockers: forbidden("field_not_authorized"),
      warnings: forbidden("field_not_authorized"),
      createsSnapshot: false,
    },
    publishTarget: {
      visibility: "forbidden",
      status: forbiddenStatus,
      publishTargetId: forbiddenStatus,
      environment: forbiddenStatus,
      publishStage: forbiddenStatus,
      policyVersion: forbiddenStatus,
      sourceRef: link("publish_target", null, "forbidden", "Publish target unavailable"),
      sourceWatermark: forbiddenStatus,
      limitations: forbidden("field_not_authorized"),
    },
    approval: {
      visibility: "forbidden",
      launchSignoff: forbiddenStatus,
      publishActivation: forbiddenStatus,
      approvalRequest: link("approval", null, "forbidden", "Approval request unavailable"),
      approvalDecision: link("approval", null, "forbidden", "Approval decision unavailable"),
      decisionStatus: forbiddenStatus,
      scope: forbiddenStatus,
      expiresAt: forbiddenStatus,
      actor: forbidden("field_not_authorized"),
      createsApproval: false,
      limitations: forbidden("field_not_authorized"),
    },
    evidence: {
      visibility: "forbidden",
      evidencePackage: link("evidence", null, "forbidden", "Evidence unavailable"),
      packageStatus: forbiddenStatus,
      packageType: forbiddenStatus,
      evidenceCreatedAt: forbiddenStatus,
      freshnessLabel: forbiddenStatus,
      sourceWatermark: forbiddenStatus,
      evidenceIdempotencyKey: forbiddenStatus,
      limitations: forbidden("field_not_authorized"),
    },
    evidenceRefs: forbiddenLinks,
    gateDryRunStatus: {
      visibility: "forbidden",
      dryRunOnly: true,
      actionKey: "publish.activation",
      scope: "publish_activation",
      subjectType: "site_version",
      subjectId: forbiddenStatus,
      status: forbiddenStatus,
      gateResult: forbiddenStatus,
      policyResult: forbiddenStatus,
      approvalDecision: link("approval", null, "forbidden", "Approval decision unavailable"),
      gateAttempt: link("audit", null, "forbidden", "Gate attempt unavailable"),
      auditEvent: link("audit", null, "forbidden", "Audit event unavailable"),
      gateDryRunIdempotencyKey: forbiddenStatus,
      blockedReasons: forbidden("field_not_authorized"),
      staleEvidenceReasons: forbidden("field_not_authorized"),
      missingSourceWatermarks: forbidden("field_not_authorized"),
      warnings: forbidden("field_not_authorized"),
    },
    correlation: {
      visibility: "forbidden",
      correlationId: forbiddenStatus,
      causationId: forbiddenStatus,
      requestId: forbiddenStatus,
      idempotencyKey: forbiddenStatus,
      shadowEvaluationId: forbiddenStatus,
      evidenceIdempotencyKey: forbiddenStatus,
      gateDryRunIdempotencyKey: forbiddenStatus,
      publishAttemptRef: forbiddenStatus,
      linkageStrategy: forbiddenStatus,
    },
    diagnostics: {
      visibility: "forbidden",
      errorState: forbidden("field_not_authorized"),
      failureReason: forbiddenStatus,
      warnings: forbidden("field_not_authorized"),
      limitations: forbidden("field_not_authorized"),
      projectionLimitations: forbidden("field_not_authorized"),
    },
  };
}

function collectChangedFieldNames(projection: PublishShadowRedactedResultProjection): { hiddenFields: string[]; redactedFields: string[] } {
  const hiddenFields: string[] = [];
  const redactedFields: string[] = [];
  const visit = (path: string, value: unknown) => {
    if (!value || typeof value !== "object") return;
    if ("visibility" in value) {
      const visibility = (value as { visibility?: unknown }).visibility;
      if (visibility === "hidden" || visibility === "forbidden") hiddenFields.push(path);
      if (visibility === "redacted") redactedFields.push(path);
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === "access") continue;
      visit(path ? `${path}.${key}` : key, child);
    }
  };
  visit("", projection);
  return {
    hiddenFields: [...new Set(hiddenFields)].sort(),
    redactedFields: [...new Set(redactedFields)].sort(),
  };
}

export function redactPublishShadowResultForActor(
  model: PublishShadowResultReadModel,
  context: PublishShadowRedactionContext,
): PublishShadowRedactedResultProjection {
  const access = evaluatePublishShadowResultAccess(model, context);
  if (!access.allowed) return hiddenDeniedProjection(access);

  const profile = access.visibilityProfile;
  const statusVisibility = profile.overall === "full" ? "full" : "summarized";
  const sourceVisibility = profile.sourceRefs;
  const ddomVisibility = profile.ddom;
  const publishTargetVisibility = profile.publishTarget;
  const approvalVisibility = profile.approval;
  const evidenceVisibility = profile.evidenceRefs;
  const gateVisibility = profile.gateBlockers;
  const diagnosticVisibility = profile.internalDiagnostics;

  const projection: PublishShadowRedactedResultProjection = {
    derivedOnly: true,
    shadowOnly: true,
    enforcementApplied: false,
    publishActionBlocked: false,
    createsDdomSnapshot: false,
    createsApproval: false,
    mutatesSourceTruth: false,
    redactionVersion: PUBLISH_SHADOW_RESULT_REDACTION_VERSION,
    readModelVersion: model.readModelVersion,
    generatedAt: model.generatedAt,
    access,
    visibility: profile.overall,
    hiddenFields: [],
    redactedFields: [],
    status: {
      shadowStatus: fieldFor(model.shadowStatus, statusVisibility, "Shadow status summarized for this role."),
      severity: fieldFor(model.severity, statusVisibility, "Severity summarized for this role."),
      readinessResult: fieldFor(model.readinessResult, statusVisibility, "Readiness result summarized for this role."),
      operatorLabel: fieldFor(model.operatorLabel, statusVisibility, safeOperatorSummary(model)),
      projectionFreshness: fieldFor(model.projectionFreshness, statusVisibility, "Projection freshness summarized for this role."),
    },
    summary: {
      operatorSummary: safeOperatorSummary(model),
      freshnessSummary: freshnessSummary(model),
      missingSourceTruthCategories: [...model.missingSourceTruth],
      staleSourceTruthCategories: [...model.staleSourceTruth],
      boundaryLabels: [
        "derived_only",
        "shadow_only",
        "non_enforcing",
        "publish_not_blocked",
        "ddom_readiness_not_publish_activation_approval",
      ],
    },
    subject: {
      tenantId: fieldFor(model.tenantId, profile.subjectRefs, "Tenant scope matched.", "raw_identifier_redacted"),
      clientId: fieldFor(model.clientId, profile.subjectRefs, "Client scope matched.", "raw_identifier_redacted"),
      siteId: fieldFor(model.siteId, profile.subjectRefs, "Site scope matched.", "raw_identifier_redacted"),
      siteVersionId: fieldFor(model.siteVersionId, profile.subjectRefs, "Site version scope matched.", "raw_identifier_redacted"),
      runtimeArtifactId: fieldFor(model.runtimeArtifactId, profile.runtimeRefs, "Runtime artifact ref restricted.", "raw_identifier_redacted"),
      publishAttemptRef: fieldFor(model.publishAttemptRef, profile.runtimeRefs, "Publish attempt ref restricted.", "raw_identifier_redacted"),
      intendedPublishTarget: fieldFor(model.intendedPublishTarget, publishTargetVisibility, "Publish target summarized.", "raw_identifier_redacted"),
      intendedPublishStage: fieldFor(model.intendedPublishStage, publishTargetVisibility, "Publish stage summarized.", "raw_identifier_redacted"),
      trustedPublishEnvironment: fieldFor(model.trustedPublishEnvironment, publishTargetVisibility, "Publish environment summarized.", "raw_identifier_redacted"),
    },
    recommendedNextAction: redactNextAction(model, profile),
    sourceTruth: {
      visibility: sourceVisibility,
      summary: {
        missingCount: model.sourceTruthSummary.missingCount,
        staleCount: model.sourceTruthSummary.staleCount,
        availableCount: model.sourceTruthSummary.availableCount,
        missingCategories: [...model.missingSourceTruth],
        staleCategories: [...model.staleSourceTruth],
      },
      refs:
        sourceVisibility === "full"
          ? model.sourceTruth.map((source) => visible({ ...source, limitations: [...source.limitations] }))
          : sourceVisibility === "summarized"
            ? model.sourceTruth.map((source) => summarized(`${source.sourceKey} source ${source.freshness}.`, undefined, [source.sourceKey, source.freshness]))
            : sourceVisibility === "redacted"
              ? model.sourceTruth.map((source) => redacted(`${source.sourceKey} source ref restricted.`, 1, "raw_identifier_redacted"))
              : [],
      watermarks: fieldFor(model.sourceWatermarks, sourceVisibility === "full" ? "full" : sourceVisibility === "redacted" ? "redacted" : "hidden", "Source watermarks restricted.", "technical_diagnostic_redacted"),
    },
    ddomReadiness: {
      visibility: ddomVisibility,
      status: fieldFor(model.ddomReadiness.status, ddomVisibility, "DDOM readiness summarized."),
      readinessState: fieldFor(model.ddomReadiness.readinessState, ddomVisibility, "DDOM readiness state summarized."),
      snapshot: link("ddom_snapshot", model.ddomReadiness.snapshotRef ?? model.ddomReadiness.snapshotId, profile.ddomRefs, "DDOM snapshot ref"),
      freshnessState: fieldFor(model.ddomReadiness.freshnessState, ddomVisibility, "DDOM freshness summarized."),
      capturedAt: fieldFor(model.ddomReadiness.capturedAt, ddomVisibility === "full" ? "full" : ddomVisibility === "summarized" ? "summarized" : ddomVisibility, "DDOM capture time summarized."),
      freshUntil: fieldFor(model.ddomReadiness.freshUntil, ddomVisibility === "full" ? "full" : ddomVisibility === "summarized" ? "summarized" : ddomVisibility, "DDOM freshness window summarized."),
      staleReason: fieldFor(model.ddomReadiness.staleReason, profile.ddomRefs === "full" ? "full" : ddomVisibility, "DDOM stale reason summarized.", "technical_diagnostic_redacted"),
      blockers: stringListField(model.ddomReadiness.blockers, profile.ddomRefs === "full" ? "full" : ddomVisibility, "DDOM blocker categories summarized.", "technical_diagnostic_redacted"),
      warnings: stringListField(model.ddomReadiness.warnings, profile.ddomRefs === "full" ? "full" : ddomVisibility, "DDOM warnings summarized.", "technical_diagnostic_redacted"),
      createsSnapshot: false,
    },
    publishTarget: {
      visibility: publishTargetVisibility,
      status: fieldFor(model.publishTarget.status, publishTargetVisibility, "Publish target status summarized."),
      publishTargetId: fieldFor(model.publishTarget.publishTargetId, publishTargetVisibility === "full" ? "full" : publishTargetVisibility, "Publish target id restricted.", "raw_identifier_redacted"),
      environment: fieldFor(model.publishTarget.environment, publishTargetVisibility, "Publish environment summarized."),
      publishStage: fieldFor(model.publishTarget.publishStage, publishTargetVisibility, "Publish stage summarized."),
      policyVersion: fieldFor(
        model.publishTarget.policyVersion,
        publishTargetVisibility === "full" ? "full" : publishTargetVisibility === "hidden" || publishTargetVisibility === "forbidden" ? publishTargetVisibility : "redacted",
        "Publish target policy version restricted.",
        "technical_diagnostic_redacted",
      ),
      sourceRef: link("publish_target", model.publishTarget.sourceRef, publishTargetVisibility === "full" ? "full" : publishTargetVisibility === "summarized" ? "redacted" : publishTargetVisibility, "Publish target source ref"),
      sourceWatermark: fieldFor(
        model.publishTarget.sourceWatermark,
        publishTargetVisibility === "full" ? "full" : publishTargetVisibility === "hidden" || publishTargetVisibility === "forbidden" ? publishTargetVisibility : "redacted",
        "Publish target watermark restricted.",
        "technical_diagnostic_redacted",
      ),
      limitations: stringListField(model.publishTarget.limitations, publishTargetVisibility, "Publish target limitations summarized.", "technical_diagnostic_redacted"),
    },
    approval: {
      visibility: approvalVisibility,
      launchSignoff: fieldFor(model.approval.launchSignoff, approvalVisibility, "Launch signoff summarized."),
      publishActivation: fieldFor(model.approval.publishActivation, approvalVisibility, "Publish activation approval summarized."),
      approvalRequest: link("approval", model.approval.approvalRequestId, approvalVisibility === "full" ? "full" : approvalVisibility === "redacted" ? "redacted" : "hidden", "Approval request ref"),
      approvalDecision: link("approval", model.approval.approvalDecisionId, approvalVisibility === "full" ? "full" : approvalVisibility === "redacted" ? "redacted" : "hidden", "Approval decision ref"),
      decisionStatus: fieldFor(model.approval.decisionStatus, approvalVisibility, "Approval decision status summarized.", "raw_identifier_redacted"),
      scope: fieldFor(model.approval.scope, approvalVisibility, "Approval scope summarized.", "raw_identifier_redacted"),
      expiresAt: fieldFor(model.approval.expiresAt, approvalVisibility, "Approval expiry summarized."),
      actor: fieldFor(
        { actorType: model.actorType, actorId: model.actorId, actorRole: model.actorRole },
        profile.approvalActors,
        "Approval actor details restricted.",
        "raw_identifier_redacted",
      ),
      createsApproval: false,
      limitations: stringListField(model.approval.limitations, approvalVisibility, "Approval limitations summarized.", "technical_diagnostic_redacted"),
    },
    evidence: {
      visibility: evidenceVisibility,
      evidencePackage: link("evidence", model.evidence.evidencePackageId, evidenceVisibility, "Evidence package ref"),
      packageStatus: fieldFor(model.evidence.packageStatus, evidenceVisibility === "full" ? "full" : evidenceVisibility === "hidden" ? "hidden" : "summarized", "Evidence status summarized.", "raw_identifier_redacted"),
      packageType: fieldFor(model.evidence.packageType, evidenceVisibility === "full" ? "full" : evidenceVisibility === "hidden" ? "hidden" : "summarized", "Evidence type summarized.", "raw_identifier_redacted"),
      evidenceCreatedAt: fieldFor(model.evidence.evidenceCreatedAt, evidenceVisibility === "full" ? "full" : evidenceVisibility, "Evidence creation time summarized."),
      freshnessLabel: fieldFor(model.evidence.freshnessLabel, evidenceVisibility === "hidden" ? "hidden" : evidenceVisibility === "redacted" ? "summarized" : evidenceVisibility, "Evidence freshness summarized."),
      sourceWatermark: fieldFor(
        model.evidence.sourceWatermark,
        evidenceVisibility === "full" ? "full" : evidenceVisibility === "hidden" || evidenceVisibility === "forbidden" ? evidenceVisibility : "redacted",
        "Evidence watermark restricted.",
        "technical_diagnostic_redacted",
      ),
      evidenceIdempotencyKey: fieldFor(model.evidence.evidenceIdempotencyKey, profile.idempotency, "Evidence idempotency key restricted.", "technical_diagnostic_redacted"),
      limitations: stringListField(model.evidence.limitations, evidenceVisibility === "full" ? "full" : evidenceVisibility === "hidden" ? "hidden" : "summarized", "Evidence limitations summarized.", "technical_diagnostic_redacted"),
    },
    evidenceRefs: [
      link("evidence", model.evidenceRefs.evidencePackageId, profile.evidenceRefs, "Evidence package ref"),
      link("audit", model.evidenceRefs.gateAttemptId, profile.auditRefs, "Gate attempt ref"),
      link("audit", model.evidenceRefs.auditEventId, profile.auditRefs, "Audit event ref"),
      link("approval", model.evidenceRefs.approvalRequestId, approvalVisibility === "full" ? "full" : approvalVisibility === "redacted" ? "redacted" : "hidden", "Approval request ref"),
      link("approval", model.evidenceRefs.approvalDecisionId, approvalVisibility === "full" ? "full" : approvalVisibility === "redacted" ? "redacted" : "hidden", "Approval decision ref"),
      link("ddom_snapshot", model.evidenceRefs.ddomSnapshotRef, profile.ddomRefs, "DDOM snapshot ref"),
      link("publish_target", model.evidenceRefs.publishTargetRef, publishTargetVisibility === "full" ? "full" : publishTargetVisibility === "hidden" || publishTargetVisibility === "forbidden" ? publishTargetVisibility : "redacted", "Publish target ref"),
    ],
    gateDryRunStatus: {
      visibility: gateVisibility,
      dryRunOnly: true,
      actionKey: "publish.activation",
      scope: "publish_activation",
      subjectType: "site_version",
      subjectId: fieldFor(model.gateDryRunStatus.subjectId, profile.subjectRefs === "full" ? "full" : "redacted", "Gate subject id restricted.", "raw_identifier_redacted"),
      status: fieldFor(model.gateDryRunStatus.status, gateVisibility, "Gate dry-run status summarized."),
      gateResult: fieldFor(model.gateDryRunStatus.gateResult, gateVisibility, "Gate result summarized.", "technical_diagnostic_redacted"),
      policyResult: fieldFor(model.gateDryRunStatus.policyResult, gateVisibility, "Policy result summarized.", "technical_diagnostic_redacted"),
      approvalDecision: link("approval", model.gateDryRunStatus.approvalDecisionId, approvalVisibility === "full" ? "full" : approvalVisibility === "hidden" || approvalVisibility === "forbidden" ? approvalVisibility : "redacted", "Gate approval decision ref"),
      gateAttempt: link("audit", model.gateDryRunStatus.gateAttemptId, profile.auditRefs, "Gate attempt ref"),
      auditEvent: link("audit", model.gateDryRunStatus.auditEventId, profile.auditRefs, "Gate audit event ref"),
      gateDryRunIdempotencyKey: fieldFor(model.gateDryRunStatus.gateDryRunIdempotencyKey, profile.idempotency, "Gate dry-run idempotency key restricted.", "technical_diagnostic_redacted"),
      blockedReasons: stringListField(model.gateDryRunStatus.blockedReasons, gateVisibility, "Gate blocker categories summarized.", "technical_diagnostic_redacted"),
      staleEvidenceReasons: stringListField(model.gateDryRunStatus.staleEvidenceReasons, gateVisibility, "Stale evidence categories summarized.", "technical_diagnostic_redacted"),
      missingSourceWatermarks: stringListField(model.gateDryRunStatus.missingSourceWatermarks, gateVisibility === "full" ? "full" : "redacted", "Missing source watermarks restricted.", "technical_diagnostic_redacted"),
      warnings: stringListField(model.gateDryRunStatus.warnings, gateVisibility, "Gate warnings summarized.", "technical_diagnostic_redacted"),
    },
    correlation: {
      visibility: profile.correlation,
      correlationId: fieldFor(model.correlation.correlationId, profile.correlation, "Correlation id restricted.", profile.correlation === "redacted" ? "raw_identifier_redacted" : "field_not_authorized"),
      causationId: fieldFor(model.correlation.causationId, profile.correlation === "full" ? "full" : "hidden", "Causation id restricted.", "raw_identifier_redacted"),
      requestId: fieldFor(model.correlation.requestId, profile.correlation === "full" ? "full" : "hidden", "Request id restricted.", "raw_identifier_redacted"),
      idempotencyKey: fieldFor(model.correlation.idempotencyKey, profile.idempotency, "Idempotency key restricted.", "technical_diagnostic_redacted"),
      shadowEvaluationId: fieldFor(
        model.correlation.shadowEvaluationId,
        profile.correlation === "full" ? "full" : profile.correlation === "hidden" || profile.correlation === "forbidden" ? profile.correlation : "redacted",
        "Shadow evaluation id restricted.",
        "raw_identifier_redacted",
      ),
      evidenceIdempotencyKey: fieldFor(model.correlation.evidenceIdempotencyKey, profile.idempotency, "Evidence idempotency key restricted.", "technical_diagnostic_redacted"),
      gateDryRunIdempotencyKey: fieldFor(model.correlation.gateDryRunIdempotencyKey, profile.idempotency, "Gate idempotency key restricted.", "technical_diagnostic_redacted"),
      publishAttemptRef: fieldFor(model.correlation.publishAttemptRef, profile.runtimeRefs, "Publish attempt ref restricted.", "raw_identifier_redacted"),
      linkageStrategy: fieldFor(model.correlation.linkageStrategy, profile.correlation === "hidden" ? "hidden" : profile.correlation === "forbidden" ? "forbidden" : "summarized", "Linked by internal diagnostic ids.", "raw_identifier_redacted"),
    },
    diagnostics: {
      visibility: diagnosticVisibility,
      errorState: fieldFor(model.errorState, profile.failureReason === "full" ? "full" : profile.failureReason === "hidden" ? "hidden" : "summarized", "Safe error state summarized.", "technical_diagnostic_redacted"),
      failureReason: fieldFor(model.failureReason, profile.failureReason, "Technical failure reason summarized.", "technical_diagnostic_redacted"),
      warnings: stringListField(model.warnings, diagnosticVisibility, "Warnings summarized.", "technical_diagnostic_redacted"),
      limitations: stringListField(model.limitations, diagnosticVisibility, "Limitations summarized.", "technical_diagnostic_redacted"),
      projectionLimitations: fieldFor(model.projectionLimitations, diagnosticVisibility, "Projection limitations summarized.", "technical_diagnostic_redacted"),
    },
  };

  const changed = collectChangedFieldNames(projection);
  return { ...projection, hiddenFields: changed.hiddenFields, redactedFields: changed.redactedFields };
}
