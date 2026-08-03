import "server-only";

import type {
  AafApprovalScope,
  AafAuditEventFamily,
  AafEvidencePackageType,
  AafGateResult,
  AafPolicyEvaluationResult,
  AafPrivacyLabel,
  AafRetentionClass,
} from "@gnr8/runtime-contracts";
import {
  AAF_SCOPE_PROHIBITED_ACTIONS,
  AAF_SCOPE_REPLAY_CLASS,
  AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
  AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE,
} from "@gnr8/runtime-contracts";

import {
  AafWriterError,
  AafWriterRepository,
  type AafActorType,
  type AafCorrelationInput,
  type AafEvidenceFreshnessResult,
  type AafPgClient,
  type AafRecord,
  type AafTenantScopeInput,
} from "./aaf-writer-repository";

export type AafPolicyRules = {
  allowedAction?: string | null;
  prohibitedActions?: readonly string[];
  requesterRoles?: readonly string[];
  approvalRequired?: boolean;
  emergencyExceptionRequired?: boolean;
  emergencyExceptionGranted?: boolean;
  blockedReason?: string | null;
  notRequiredReason?: string | null;
};

export type AafPolicyEvidenceStateInput = {
  evidenceMissing?: boolean;
  evidenceStale?: boolean;
  evidenceSuperseded?: boolean;
};

export type AafPolicyEvaluatorInput = AafTenantScopeInput &
  AafCorrelationInput & {
    actionKey: string;
    scope: AafApprovalScope;
    subjectType: string;
    subjectId: string;
    actorType: AafActorType;
    actorId: string;
    actorRole: string;
    policyId?: string | null;
    policyVersion: string;
    approvalRequestId?: string | null;
    approvalDecisionId?: string | null;
    evidencePackageId?: string | null;
    requiredEvidenceType?: AafEvidencePackageType | null;
    currentSubjectWatermark?: string | null;
    policyRules?: AafPolicyRules;
    evidenceState?: AafPolicyEvidenceStateInput;
    auditEventId?: string | null;
    privacyLabel?: AafPrivacyLabel;
    retentionClass?: AafRetentionClass;
  };

export type AafPolicyEvaluationFacadeResult = {
  result: AafPolicyEvaluationResult;
  policyEvaluation: AafRecord;
  blockerCodes: string[];
  staleReason: string | null;
  notRequiredReason: string | null;
};

export type AafGateValidationInput = AafTenantScopeInput &
  AafCorrelationInput & {
    actionKey: string;
    scope: AafApprovalScope;
    subjectType: string;
    subjectId: string;
    actorType: AafActorType;
    actorId: string;
    actorRole: string;
    policyId?: string | null;
    policyVersion: string;
    requiredEvidenceType?: AafEvidencePackageType | null;
    evidencePackageId?: string | null;
    approvalRequestId?: string | null;
    approvalDecisionId?: string | null;
    currentSubjectWatermark?: string | null;
    sourceRefsRequired?: boolean;
    auditRequired?: boolean;
    auditEventFamily?: AafAuditEventFamily;
    policyRules?: AafPolicyRules;
    policyIdempotencyKey?: string;
    auditIdempotencyKey?: string;
    gateIdempotencyKey?: string;
    requestId?: string | null;
    privacyLabel?: AafPrivacyLabel;
    retentionClass?: AafRetentionClass;
  };

export type AafGateValidationResult = {
  gateResult: AafGateResult;
  policyEvaluation: AafRecord | null;
  gateAttempt: AafRecord | null;
  preActionAuditEvent: AafRecord | null;
  blockerCodes: string[];
  failClosedReason: string | null;
};

type ScopeDefinitionRow = {
  allowed_action: string;
  prohibited_actions: unknown;
  requester_roles: unknown;
  approver_roles: unknown;
  required_evidence_type: string;
};

type EvidencePackageRow = AafRecord & {
  tenant_id?: unknown;
  client_id?: unknown;
  site_id?: unknown;
  batch_id?: unknown;
  job_id?: unknown;
  site_version_id?: unknown;
  domain_id?: unknown;
  cost_center_id?: unknown;
  package_type?: unknown;
  subject_type?: unknown;
  subject_id?: unknown;
  status?: unknown;
  source_watermark?: unknown;
  expires_at?: unknown;
};

type ApprovalRequestRow = AafRecord & {
  tenant_id?: unknown;
  client_id?: unknown;
  site_id?: unknown;
  batch_id?: unknown;
  job_id?: unknown;
  site_version_id?: unknown;
  domain_id?: unknown;
  cost_center_id?: unknown;
  scope?: unknown;
  subject_type?: unknown;
  subject_id?: unknown;
  policy_version?: unknown;
};

type ApprovalDecisionRow = AafRecord & {
  approval_request_id?: unknown;
  status?: unknown;
  decision_actor_role?: unknown;
  policy_version?: unknown;
  evidence_package_id?: unknown;
  policy_evaluation_id?: unknown;
  limitations_json?: unknown;
  expires_at?: unknown;
};

const SCOPE_FIELDS = [
  "tenant_id",
  "client_id",
  "site_id",
  "batch_id",
  "job_id",
  "site_version_id",
  "domain_id",
  "cost_center_id",
] as const;

export class AafPolicyEvaluationPersistenceError extends AafWriterError {
  constructor(message: string, readonly cause: unknown) {
    super(message);
    this.name = "AafPolicyEvaluationPersistenceError";
  }
}

export class AafGateFailClosedError extends AafWriterError {
  constructor(message: string, readonly cause: unknown) {
    super(message);
    this.name = "AafGateFailClosedError";
  }
}

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sameText(left: unknown, right: unknown): boolean {
  return text(left) === text(right);
}

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function isPast(value: unknown, now: Date): boolean {
  const raw = text(value);
  if (!raw) return false;
  const parsed = new Date(raw);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() <= now.getTime();
}

function scopeInputColumns(input: AafTenantScopeInput): Record<(typeof SCOPE_FIELDS)[number], string | null> {
  return {
    tenant_id: text(input.tenantId),
    client_id: text(input.clientId),
    site_id: text(input.siteId),
    batch_id: text(input.batchId),
    job_id: text(input.jobId),
    site_version_id: text(input.siteVersionId),
    domain_id: text(input.domainId),
    cost_center_id: text(input.costCenterId),
  };
}

export function exactScopeMatches(input: AafTenantScopeInput, row: Record<string, unknown>): boolean {
  const expected = scopeInputColumns(input);
  return SCOPE_FIELDS.every((field) => expected[field] === text(row[field]));
}

export function exactSubjectMatches(input: { subjectType: string; subjectId: string }, row: Record<string, unknown>): boolean {
  return sameText(input.subjectType, row.subject_type) && sameText(input.subjectId, row.subject_id);
}

export function actionIsProhibitedForScope(scope: AafApprovalScope, actionKey: string, additional: readonly string[] = []): boolean {
  const prohibited = new Set([...AAF_SCOPE_PROHIBITED_ACTIONS[scope], ...additional]);
  return prohibited.has(actionKey);
}

export function mapFreshnessResultToGateResult(result: AafEvidenceFreshnessResult): AafGateResult {
  if (result === "fresh") return "allowed";
  if (result === "stale" || result === "partial_timeline") return "evidence_stale";
  return "blocked";
}

const LIMITED_GRANT_SCOPES = new Set<AafApprovalScope>([
  AAF_SINGLE_SITE_CONTENT_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_CLIENT_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_LAUNCH_APPROVAL_SCOPE,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
]);

function limitationsArePresent(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value).length > 0;
}

export function mapApprovalStatusToGateResult(
  status: string,
  options: { scope?: AafApprovalScope; limitationsPresent?: boolean } = {},
): AafGateResult {
  if (status === "granted") return "allowed";
  if (status === "granted_with_limitations") {
    if (options.scope && LIMITED_GRANT_SCOPES.has(options.scope) && options.limitationsPresent) return "allowed";
    return "blocked";
  }
  if (status === "not_required_by_policy") return "not_required_by_policy";
  if (status === "revoked") return "approval_revoked";
  if (status === "expired") return "approval_stale";
  if (status === "superseded") return "approval_superseded";
  return "blocked";
}

export function mapFailClosedConditionToGateResult(condition: "policy_write" | "gate_write" | "audit_write"): AafGateResult {
  return condition === "audit_write" ? "audit_unavailable" : "fail_closed";
}

async function readScopeDefinition(
  client: AafPgClient,
  scope: AafApprovalScope,
  policyVersion: string,
): Promise<ScopeDefinitionRow | null> {
  const result = await client.query(
    `
    select allowed_action, prohibited_actions, requester_roles, approver_roles, required_evidence_type
    from public.gnr8_aaf_approval_scope_definitions
    where scope = $1 and policy_version = $2
    order by created_at desc
    limit 1
    `,
    [scope, policyVersion],
  );
  return (result.rows[0] as ScopeDefinitionRow | undefined) ?? null;
}

function combinePolicyRules(scopeDefinition: ScopeDefinitionRow | null, inputRules: AafPolicyRules | undefined): AafPolicyRules {
  return {
    allowedAction: inputRules?.allowedAction ?? scopeDefinition?.allowed_action ?? null,
    prohibitedActions: [...toArray(scopeDefinition?.prohibited_actions), ...(inputRules?.prohibitedActions ?? [])],
    requesterRoles: [...toArray(scopeDefinition?.requester_roles), ...(inputRules?.requesterRoles ?? [])],
    approvalRequired: inputRules?.approvalRequired,
    emergencyExceptionRequired: inputRules?.emergencyExceptionRequired,
    emergencyExceptionGranted: inputRules?.emergencyExceptionGranted,
    blockedReason: inputRules?.blockedReason ?? null,
    notRequiredReason: inputRules?.notRequiredReason ?? null,
  };
}

function determinePolicyResult(
  input: AafPolicyEvaluatorInput,
  rules: AafPolicyRules,
  scopeDefinitionMissing: boolean,
): Omit<AafPolicyEvaluationFacadeResult, "policyEvaluation"> {
  const blockerCodes: string[] = [];
  let staleReason: string | null = null;
  let notRequiredReason: string | null = null;

  if (scopeDefinitionMissing && !input.policyRules) {
    return {
      result: "policy_error",
      blockerCodes: ["scope_definition_missing"],
      staleReason: null,
      notRequiredReason: null,
    };
  }
  if (rules.emergencyExceptionGranted) {
    return { result: "emergency_exception_granted", blockerCodes, staleReason, notRequiredReason };
  }
  if (rules.emergencyExceptionRequired) {
    return { result: "emergency_exception_required", blockerCodes: ["emergency_exception_required"], staleReason, notRequiredReason };
  }
  if (rules.blockedReason) {
    return { result: "approval_blocked", blockerCodes: [rules.blockedReason], staleReason, notRequiredReason };
  }
  if (rules.allowedAction && rules.allowedAction !== input.actionKey) {
    return { result: "approval_blocked", blockerCodes: ["action_not_allowed_for_scope"], staleReason, notRequiredReason };
  }
  if (actionIsProhibitedForScope(input.scope, input.actionKey, rules.prohibitedActions ?? [])) {
    return { result: "approval_blocked", blockerCodes: ["prohibited_scope_overreach"], staleReason, notRequiredReason };
  }
  if ((rules.requesterRoles?.length ?? 0) > 0 && !rules.requesterRoles?.includes(input.actorRole)) {
    return { result: "approval_blocked", blockerCodes: ["actor_role_not_allowed"], staleReason, notRequiredReason };
  }
  if (input.evidenceState?.evidenceSuperseded) {
    return { result: "approval_superseded", blockerCodes: ["evidence_superseded"], staleReason, notRequiredReason };
  }
  if (input.evidenceState?.evidenceStale) {
    staleReason = "evidence_stale";
    return { result: "approval_stale", blockerCodes: ["evidence_stale"], staleReason, notRequiredReason };
  }
  if (rules.approvalRequired === false) {
    notRequiredReason = rules.notRequiredReason ?? "explicit_policy_rule";
    return {
      result: "approval_not_required_by_policy",
      blockerCodes,
      staleReason,
      notRequiredReason,
    };
  }
  return { result: "approval_required", blockerCodes, staleReason, notRequiredReason };
}

export class AafPolicyEvaluatorFacade {
  constructor(private readonly writer = new AafWriterRepository()) {}

  async evaluatePolicy(input: AafPolicyEvaluatorInput): Promise<AafPolicyEvaluationFacadeResult> {
    try {
      const scopeDefinition = await this.writer.withTransaction((tx) =>
        input.policyRules ? Promise.resolve(null) : readScopeDefinition(tx.client, input.scope, input.policyVersion),
      );
      const decision = determinePolicyResult(input, combinePolicyRules(scopeDefinition, input.policyRules), !scopeDefinition);
      const policyEvaluation = await this.writer.withTransaction((tx) =>
        this.writer.createApprovalPolicyEvaluation(tx, {
          ...input,
          idempotencyKey: input.idempotencyKey,
          result: decision.result,
          blockerCodes: decision.blockerCodes,
          staleReason: decision.staleReason,
          notRequiredReason: decision.notRequiredReason,
          auditEventId: input.auditEventId ?? null,
          privacyLabel: input.privacyLabel,
          retentionClass: input.retentionClass,
        }),
      );
      return { ...decision, policyEvaluation };
    } catch (error) {
      throw new AafPolicyEvaluationPersistenceError("AAF policy evaluation could not be persisted", error);
    }
  }
}

async function readEvidencePackage(client: AafPgClient, evidencePackageId: string): Promise<EvidencePackageRow | null> {
  const result = await client.query(`select * from public.gnr8_aaf_evidence_packages where id = $1::uuid`, [evidencePackageId]);
  return (result.rows[0] as EvidencePackageRow | undefined) ?? null;
}

async function readLatestFreshnessCheck(client: AafPgClient, evidencePackageId: string): Promise<Record<string, unknown> | null> {
  const result = await client.query(
    `
    select *
    from public.gnr8_aaf_evidence_package_freshness_checks
    where evidence_package_id = $1::uuid
    order by checked_at desc, created_at desc
    limit 1
    `,
    [evidencePackageId],
  );
  return result.rows[0] ?? null;
}

async function hasEvidenceSourceRefs(client: AafPgClient, evidencePackageId: string): Promise<boolean> {
  const result = await client.query(
    `select exists(select 1 from public.gnr8_aaf_evidence_package_source_refs where evidence_package_id = $1::uuid) as has_refs`,
    [evidencePackageId],
  );
  return result.rows[0]?.has_refs === true;
}

async function isEvidenceSuperseded(client: AafPgClient, evidencePackageId: string): Promise<boolean> {
  const result = await client.query(
    `select exists(select 1 from public.gnr8_aaf_evidence_package_supersession where superseded_package_id = $1::uuid) as superseded`,
    [evidencePackageId],
  );
  return result.rows[0]?.superseded === true;
}

async function readApprovalRequest(client: AafPgClient, approvalRequestId: string): Promise<ApprovalRequestRow | null> {
  const result = await client.query(`select * from public.gnr8_aaf_approval_requests where id = $1::uuid`, [approvalRequestId]);
  return (result.rows[0] as ApprovalRequestRow | undefined) ?? null;
}

async function readApprovalDecision(client: AafPgClient, approvalDecisionId: string): Promise<ApprovalDecisionRow | null> {
  const result = await client.query(`select * from public.gnr8_aaf_approval_decisions where id = $1::uuid`, [approvalDecisionId]);
  return (result.rows[0] as ApprovalDecisionRow | undefined) ?? null;
}

async function isApprovalRevoked(client: AafPgClient, approvalDecisionId: string): Promise<boolean> {
  const result = await client.query(
    `select exists(select 1 from public.gnr8_aaf_approval_revocations where approval_decision_id = $1::uuid) as revoked`,
    [approvalDecisionId],
  );
  return result.rows[0]?.revoked === true;
}

async function isApprovalSuperseded(client: AafPgClient, approvalDecisionId: string): Promise<boolean> {
  const result = await client.query(
    `select exists(select 1 from public.gnr8_aaf_approval_supersession_links where superseded_decision_id = $1::uuid) as superseded`,
    [approvalDecisionId],
  );
  return result.rows[0]?.superseded === true;
}

async function readPolicyEvaluation(client: AafPgClient, policyEvaluationId: string): Promise<Record<string, unknown> | null> {
  const result = await client.query(`select * from public.gnr8_aaf_approval_policy_evaluations where id = $1::uuid`, [
    policyEvaluationId,
  ]);
  return result.rows[0] ?? null;
}

function evidenceGateResult(
  input: AafGateValidationInput,
  evidence: EvidencePackageRow | null,
  freshnessCheck: Record<string, unknown> | null,
  sourceRefsExist: boolean,
  superseded: boolean,
  now: Date,
): { result: AafGateResult; blockers: string[] } {
  if (!input.requiredEvidenceType) return { result: "allowed", blockers: [] };
  if (!input.evidencePackageId || !evidence) return { result: "evidence_missing", blockers: ["evidence_missing"] };
  if (!exactScopeMatches(input, evidence) || !exactSubjectMatches(input, evidence)) {
    return { result: "blocked", blockers: ["evidence_scope_or_subject_mismatch"] };
  }
  if (text(evidence.package_type) !== input.requiredEvidenceType) {
    return { result: "blocked", blockers: ["evidence_type_mismatch"] };
  }
  if (text(evidence.status) === "invalid") return { result: "blocked", blockers: ["evidence_invalid"] };
  if (text(evidence.status) === "superseded" || superseded) return { result: "evidence_stale", blockers: ["evidence_superseded"] };
  if (input.sourceRefsRequired && !sourceRefsExist) return { result: "evidence_missing", blockers: ["evidence_source_refs_missing"] };
  if (isPast(evidence.expires_at, now)) return { result: "evidence_stale", blockers: ["evidence_expired"] };
  if (input.currentSubjectWatermark && text(evidence.source_watermark) !== input.currentSubjectWatermark) {
    return { result: "evidence_stale", blockers: ["subject_watermark_mismatch"] };
  }
  if (freshnessCheck) {
    const mapped = mapFreshnessResultToGateResult(text(freshnessCheck.result) as AafEvidenceFreshnessResult);
    if (mapped !== "allowed") return { result: mapped, blockers: [`freshness_${text(freshnessCheck.result)}`] };
    if (isPast(freshnessCheck.expires_at, now)) return { result: "evidence_stale", blockers: ["freshness_check_expired"] };
    if (input.currentSubjectWatermark && text(freshnessCheck.current_source_watermark) !== input.currentSubjectWatermark) {
      return { result: "evidence_stale", blockers: ["freshness_watermark_mismatch"] };
    }
  }
  return { result: "allowed", blockers: [] };
}

function policyResultToGateResult(result: AafPolicyEvaluationResult): AafGateResult {
  if (result === "approval_blocked") return "blocked";
  if (result === "approval_stale") return "approval_stale";
  if (result === "approval_superseded") return "approval_superseded";
  if (result === "policy_error") return "policy_error";
  if (result === "emergency_exception_required") return "approval_required";
  if (result === "approval_not_required_by_policy" || result === "emergency_exception_granted") return "not_required_by_policy";
  return "approval_required";
}

async function approvalGateResult(
  client: AafPgClient,
  input: AafGateValidationInput,
  policyEvaluation: AafRecord,
  limitationsPresent: boolean,
  now: Date,
): Promise<{ result: AafGateResult; approvalRequest: ApprovalRequestRow | null; approvalDecision: ApprovalDecisionRow | null; blockers: string[] }> {
  const policyGate = policyResultToGateResult(String(policyEvaluation.result) as AafPolicyEvaluationResult);
  if (policyGate !== "approval_required" && policyGate !== "not_required_by_policy") {
    return { result: policyGate, approvalRequest: null, approvalDecision: null, blockers: [policyGate] };
  }

  if (!input.approvalDecisionId) {
    return {
      result: "approval_required",
      approvalRequest: null,
      approvalDecision: null,
      blockers: [policyGate === "not_required_by_policy" ? "not_required_decision_missing" : "approval_missing"],
    };
  }

  const approvalDecision = await readApprovalDecision(client, input.approvalDecisionId);
  if (!approvalDecision) {
    return { result: "approval_required", approvalRequest: null, approvalDecision: null, blockers: ["approval_missing"] };
  }
  const approvalRequest = await readApprovalRequest(client, String(approvalDecision.approval_request_id));
  if (!approvalRequest) {
    return { result: "fail_closed", approvalRequest: null, approvalDecision, blockers: ["approval_request_missing"] };
  }
  if (
    !exactScopeMatches(input, approvalRequest) ||
    !exactSubjectMatches(input, approvalRequest) ||
    text(approvalRequest.scope) !== input.scope ||
    text(approvalRequest.policy_version) !== input.policyVersion
  ) {
    return { result: "approval_required", approvalRequest, approvalDecision, blockers: ["approval_scope_or_subject_mismatch"] };
  }
  if (input.approvalRequestId && approvalRequest.id !== input.approvalRequestId) {
    return { result: "approval_required", approvalRequest, approvalDecision, blockers: ["approval_request_mismatch"] };
  }
  if (text(approvalDecision.policy_version) !== input.policyVersion) {
    return { result: "approval_stale", approvalRequest, approvalDecision, blockers: ["approval_policy_version_mismatch"] };
  }
  if (input.evidencePackageId && text(approvalDecision.evidence_package_id) !== input.evidencePackageId) {
    return { result: "approval_stale", approvalRequest, approvalDecision, blockers: ["approval_evidence_mismatch"] };
  }
  if (await isApprovalRevoked(client, approvalDecision.id)) {
    return { result: "approval_revoked", approvalRequest, approvalDecision, blockers: ["approval_revocation_linked"] };
  }
  if (await isApprovalSuperseded(client, approvalDecision.id)) {
    return { result: "approval_superseded", approvalRequest, approvalDecision, blockers: ["approval_supersession_linked"] };
  }
  if (isPast(approvalDecision.expires_at, now)) {
    return { result: "approval_stale", approvalRequest, approvalDecision, blockers: ["approval_expired"] };
  }
  const scopeDefinition = await readScopeDefinition(client, input.scope, input.policyVersion);
  const approverRoles = toArray(scopeDefinition?.approver_roles);
  if (text(approvalDecision.status) === "granted" && approverRoles.length > 0 && !approverRoles.includes(String(approvalDecision.decision_actor_role))) {
    return { result: "blocked", approvalRequest, approvalDecision, blockers: ["approval_actor_role_not_allowed"] };
  }
  if (policyGate === "not_required_by_policy" && text(approvalDecision.status) !== "not_required_by_policy") {
    return { result: "approval_required", approvalRequest, approvalDecision, blockers: ["not_required_decision_missing"] };
  }
  const statusGate = mapApprovalStatusToGateResult(String(approvalDecision.status), {
    scope: input.scope,
    limitationsPresent,
  });
  if (statusGate === "not_required_by_policy") {
    const decisionPolicyEvaluationId = text(approvalDecision.policy_evaluation_id);
    if (!decisionPolicyEvaluationId) return { result: "fail_closed", approvalRequest, approvalDecision, blockers: ["not_required_policy_ref_missing"] };
    const decisionPolicyEvaluation = await readPolicyEvaluation(client, decisionPolicyEvaluationId);
    if (
      !decisionPolicyEvaluation ||
      text(decisionPolicyEvaluation.result) !== "approval_not_required_by_policy" ||
      text(decisionPolicyEvaluation.scope) !== input.scope ||
      text(decisionPolicyEvaluation.action_key) !== input.actionKey ||
      !exactScopeMatches(input, decisionPolicyEvaluation) ||
      !exactSubjectMatches(input, decisionPolicyEvaluation)
    ) {
      return { result: "fail_closed", approvalRequest, approvalDecision, blockers: ["not_required_policy_ref_mismatch"] };
    }
  }
  return { result: statusGate, approvalRequest, approvalDecision, blockers: statusGate === "allowed" || statusGate === "not_required_by_policy" ? [] : [statusGate] };
}

export class AafActionGateValidatorFacade {
  constructor(
    private readonly writer = new AafWriterRepository(),
    private readonly evaluator = new AafPolicyEvaluatorFacade(writer),
  ) {}

  async validateGate(input: AafGateValidationInput): Promise<AafGateValidationResult> {
    const policyIdempotencyKey = input.policyIdempotencyKey ?? `${input.idempotencyKey}:policy`;
    let policyEvaluation: AafRecord | null = null;
    try {
      const policyResult = await this.evaluator.evaluatePolicy({
        ...input,
        idempotencyKey: policyIdempotencyKey,
        evidenceState: {
          evidenceMissing: Boolean(input.requiredEvidenceType && !input.evidencePackageId),
        },
      });
      policyEvaluation = policyResult.policyEvaluation;
    } catch (error) {
      return this.recordFailClosed(input, "policy_evaluation_unavailable", error);
    }

    const now = new Date();
    const gateRead = await this.writer.withTransaction(async (tx) => {
      const evidence = input.evidencePackageId ? await readEvidencePackage(tx.client, input.evidencePackageId) : null;
      const freshnessCheck = input.evidencePackageId ? await readLatestFreshnessCheck(tx.client, input.evidencePackageId) : null;
      const sourceRefsExist = input.evidencePackageId ? await hasEvidenceSourceRefs(tx.client, input.evidencePackageId) : false;
      const evidenceSuperseded = input.evidencePackageId ? await isEvidenceSuperseded(tx.client, input.evidencePackageId) : false;
      const evidenceResult = evidenceGateResult(input, evidence, freshnessCheck, sourceRefsExist, evidenceSuperseded, now);
      const approvalResult =
        evidenceResult.result === "allowed"
          ? await approvalGateResult(tx.client, input, policyEvaluation, limitationsArePresent(evidence?.limitations_json), now)
          : { result: evidenceResult.result, approvalRequest: null, approvalDecision: null, blockers: evidenceResult.blockers };
      return { evidenceResult, approvalResult };
    });

    const finalGateResult = gateRead.approvalResult.result;
    const blockerCodes = [...gateRead.evidenceResult.blockers, ...gateRead.approvalResult.blockers];
    const auditEvent = await this.recordAuditIfRequired(input, policyEvaluation, finalGateResult, blockerCodes);
    if (auditEvent instanceof AafGateFailClosedError) {
      return this.persistGateAttempt(input, policyEvaluation, null, "audit_unavailable", ["audit_unavailable"], "audit_writer_unavailable");
    }
    return this.persistGateAttempt(
      input,
      policyEvaluation,
      auditEvent,
      finalGateResult,
      blockerCodes,
      finalGateResult === "fail_closed" ? blockerCodes.join(",") || "fail_closed" : null,
    );
  }

  private async recordAuditIfRequired(
    input: AafGateValidationInput,
    policyEvaluation: AafRecord,
    gateResult: AafGateResult,
    blockerCodes: string[],
  ): Promise<AafRecord | null | AafGateFailClosedError> {
    if (!input.auditRequired) return null;
    try {
      return await this.writer.withTransaction((tx) =>
        this.writer.createAuditEvent(tx, {
          ...input,
          idempotencyKey: input.auditIdempotencyKey ?? `${input.idempotencyKey}:audit`,
          eventName: `aaf.gate.${gateResult}`,
          eventFamily: input.auditEventFamily ?? "system failure/audit failure",
          severity: gateResult === "allowed" || gateResult === "not_required_by_policy" ? "notice" : "warning",
          replayClass: AAF_SCOPE_REPLAY_CLASS[input.scope],
          policyEvaluationId: policyEvaluation.id,
          evidencePackageId: input.evidencePackageId ?? null,
          approvalRequestId: input.approvalRequestId ?? null,
          approvalDecisionId: input.approvalDecisionId ?? null,
          payloadJson: { nonExecuting: true, gateResult, blockerCodes },
          privacyLabel: input.privacyLabel,
          retentionClass: input.retentionClass,
        }),
      );
    } catch (error) {
      return new AafGateFailClosedError("AAF audit write failed during non-executing gate validation", error);
    }
  }

  private async recordFailClosed(
    input: AafGateValidationInput,
    reason: string,
    cause: unknown,
  ): Promise<AafGateValidationResult> {
    try {
      return await this.persistGateAttempt(input, null, null, "fail_closed", [reason], reason);
    } catch (error) {
      throw new AafGateFailClosedError("AAF gate attempt could not be persisted after policy evaluation failure", cause ?? error);
    }
  }

  private async persistGateAttempt(
    input: AafGateValidationInput,
    policyEvaluation: AafRecord | null,
    auditEvent: AafRecord | null,
    gateResult: AafGateResult,
    blockerCodes: string[],
    failClosedReason: string | null,
  ): Promise<AafGateValidationResult> {
    try {
      const gateAttempt = await this.writer.withTransaction((tx) =>
        this.writer.createActionGateAttempt(tx, {
          ...input,
          idempotencyKey: input.gateIdempotencyKey ?? input.idempotencyKey,
          policyEvaluationId: policyEvaluation?.id ?? null,
          preActionAuditEventId: auditEvent?.id ?? null,
          evidencePackageId: input.evidencePackageId ?? null,
          approvalRequestId: input.approvalRequestId ?? null,
          approvalDecisionId: input.approvalDecisionId ?? null,
          gateResult,
          failClosedReason,
          completedAt: new Date().toISOString(),
        }),
      );
      return { gateResult, policyEvaluation, gateAttempt, preActionAuditEvent: auditEvent, blockerCodes, failClosedReason };
    } catch (error) {
      throw new AafGateFailClosedError("AAF gate attempt could not be persisted; privileged action must fail closed", error);
    }
  }
}
