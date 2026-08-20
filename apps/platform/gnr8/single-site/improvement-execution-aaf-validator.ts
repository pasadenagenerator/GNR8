import "server-only";

import {
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_EVIDENCE_TYPE,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE,
  AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE,
} from "@gnr8/runtime-contracts";

import { AafWriterRepository, type AafPgClient } from "../aaf/aaf-writer-repository";
import {
  SingleSiteImplementationAuthorizationBridge,
  buildExpectedImplementationAuthorizationRefs,
  computeImplementationAuthorizationSemanticWatermark,
  semanticReplayFromEvidence,
  validationInputFromReplay,
  type ImplementationAuthorizationProposalApprovalRef,
  type ImplementationAuthorizationSemanticReplayContract,
  type ImplementationAuthorizationSelectedRecommendationRef,
  type ImplementationAuthorizationSourceRef,
  type SingleSiteImplementationAuthorizationActor,
  type ValidateImplementationAuthorizationRefInput,
} from "./implementation-authorization-bridge";

export type ImprovementExecutionAuthorizationRef = {
  approvalRequestId?: string | null;
  approvalDecisionId?: string | null;
  evidencePackageId?: string | null;
  sourceTable?: string | null;
  sourceRecordId?: string | null;
  scope?: string | null;
  refKind?: string | null;
};

export type ImprovementExecutionAafValidatorInput = {
  tenantId: string;
  clientId: string;
  siteId: string;
  migrationId: string;
  proposalPlanId: string;
  proposalPlanVersion: string | number;
  proposalStatus: "approved" | "approved_with_limitations" | string;
  proposalPlanSemanticWatermark: string;
  proposalApprovalRef: ImplementationAuthorizationProposalApprovalRef;
  implementationAuthorizationRef: ImprovementExecutionAuthorizationRef;
  cloneReviewRef: ImplementationAuthorizationSourceRef & { reviewStatus?: "accepted" | "accepted_with_limitations" | string; limitations?: unknown[] };
  cloneSiteVersionRef: ImplementationAuthorizationSourceRef;
  cloneRuntimeArtifactRef: ImplementationAuthorizationSourceRef;
  sourceEvidenceReviewRef: ImplementationAuthorizationSourceRef & { reviewStatus?: "accepted" | "accepted_with_limitations" | string; limitations?: unknown[] };
  selectedRecommendationRefs: ImplementationAuthorizationSelectedRecommendationRef[];
  expectedRecommendationWatermarks?: Record<string, string> | Array<{ recommendationId: string; sourceWatermark: string }> | null;
  implementationScopeSummary: string;
  implementationScopeWatermark: string;
  implementationNonGoals: string[];
  riskImpactEffortSummary: Record<string, unknown>;
  limitations?: unknown[];
  operatorNotes?: unknown[];
  advisoryAiProviderRefs?: ImplementationAuthorizationSourceRef[];
  auditTimelineRefs?: ImplementationAuthorizationSourceRef[];
  implementationTargetRef?: ImplementationAuthorizationSourceRef | null;
  implementationAttemptPlaceholderRef?: string | null;
  actor: SingleSiteImplementationAuthorizationActor;
  correlationId: string;
  idempotencyKey?: string | null;
  executionAttemptKey?: string | null;
  policyVersion: string;
};

export type ImprovementExecutionAafReasonCode =
  | "authorization_valid"
  | "authorization_valid_with_limitations"
  | "authorization_ref_missing"
  | "authorization_ref_not_aaf_decision"
  | "proposal_not_approved"
  | "clone_review_not_accepted"
  | "source_evidence_review_not_accepted"
  | "correlation_missing"
  | "idempotency_missing"
  | "wrong_scope"
  | "wrong_subject"
  | "wrong_evidence"
  | "approval_required"
  | "approval_rejected"
  | "approval_revoked"
  | "approval_expired"
  | "approval_superseded"
  | "approval_cancelled"
  | "approval_invalid"
  | "approval_stale"
  | "approval_conflict"
  | "evidence_missing"
  | "evidence_stale"
  | "subject_ref_missing"
  | "subject_ref_mismatch"
  | "source_watermark_mismatch"
  | "selected_recommendation_drift"
  | "proposal_scope_drift"
  | "fail_closed";

export type MatchedExecutionAafRef = {
  role: string;
  sourceTable: string | null;
  sourceRecordId: string | null;
  sourceWatermark: string | null;
};

export type ImprovementExecutionAafValidationResult = {
  allowed: boolean;
  mode: "allowed" | "allowed_with_limitations" | "blocked";
  reasonCode: ImprovementExecutionAafReasonCode;
  blockerCodes: string[];
  matchedAafRequestDecisionRefs: {
    approvalRequestId: string | null;
    approvalDecisionId: string | null;
    evidencePackageId: string | null;
    scope: string | null;
    status: string | null;
  };
  matchedEvidenceRefs: MatchedExecutionAafRef[];
  matchedSubjectRefs: MatchedExecutionAafRef[];
  limitations: unknown[];
  freshnessResult: {
    status: "fresh" | "stale" | "missing" | "failed" | "unknown";
    expectedSemanticWatermark: string;
    actualEvidenceWatermark: string | null;
    actualFreshnessWatermark: string | null;
    checkedAt: string | null;
  };
  driftResult: {
    proposalWatermarkMatched: boolean;
    selectedRecommendationWatermarkMatched: boolean;
    implementationScopeWatermarkMatched: boolean;
    semanticWatermarkMatched: boolean;
    driftedRoles: string[];
  };
  missingRefs: {
    authorization: string[];
    subject: string[];
    evidence: string[];
  };
  staleRefs: {
    subject: string[];
    evidence: string[];
    freshness: string[];
  };
  prohibitedSubstitutionFlags: {
    prohibited: boolean;
    proposalApproval: boolean;
    cloneReview: boolean;
    contentApproval: boolean;
    clientApproval: boolean;
    launchApproval: boolean;
    publishActivation: boolean;
    domainDdomReadiness: boolean;
    aiProviderAdvisory: boolean;
    generatedProposalBundle: boolean;
    commandCenterOpsInbox: boolean;
    unknownScope: boolean;
  };
  actor: SingleSiteImplementationAuthorizationActor;
  correlationId: string;
  idempotencyKey: string | null;
  executionAttemptKey: string | null;
  mutatesSourceTruth: false;
  nonExecuting: true;
};

type ReadOnlyAafGateway = Pick<AafWriterRepository, "withTransaction">;

type DetailRows = {
  decision: Record<string, unknown> | null;
  request: Record<string, unknown> | null;
  evidence: Record<string, unknown> | null;
  subjectRefs: Record<string, unknown>[];
  evidenceRefs: Record<string, unknown>[];
  freshness: Record<string, unknown> | null;
  conflictingDecisionIds: string[];
};

function replayForDetails(details: DetailRows): ImplementationAuthorizationSemanticReplayContract | null {
  if (!details.evidence) return null;
  const replay = semanticReplayFromEvidence(details.evidence);
  if (!replay.replay) return null;
  return replay.replay;
}

function optionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function requiredText(field: string, value: unknown): string {
  const text = optionalText(value);
  if (!text) throw new Error(`${field} is required`);
  return text;
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

function metadataRole(row: Record<string, unknown>, field: string): string | null {
  return optionalText(jsonObject(row.metadata_json)[field]) ?? optionalText(jsonObject(row.limitations_json)[field]);
}

function rowRef(row: Record<string, unknown>, role: string): MatchedExecutionAafRef {
  return {
    role,
    sourceTable: optionalText(row.source_table),
    sourceRecordId: optionalText(row.source_record_id),
    sourceWatermark: optionalText(row.source_watermark),
  };
}

function refMatches(row: Record<string, unknown>, expected: ImplementationAuthorizationSourceRef & { role: string }, roleField: string): boolean {
  return (
    metadataRole(row, roleField) === expected.role &&
    optionalText(row.source_table) === expected.sourceTable &&
    optionalText(row.source_record_id) === expected.sourceRecordId &&
    optionalText(row.source_watermark) === expected.sourceWatermark
  );
}

function expectedRecommendationMap(input: ImprovementExecutionAafValidatorInput): Map<string, string> {
  const expected = input.expectedRecommendationWatermarks;
  if (!expected) return new Map();
  if (Array.isArray(expected)) return new Map(expected.map((entry) => [entry.recommendationId, entry.sourceWatermark]));
  return new Map(Object.entries(expected));
}

function substitutionFlags(input: ImprovementExecutionAafValidatorInput, scope: string | null): ImprovementExecutionAafValidationResult["prohibitedSubstitutionFlags"] {
  const sourceTable = optionalText(input.implementationAuthorizationRef.sourceTable);
  const refKind = optionalText(input.implementationAuthorizationRef.refKind);
  const effectiveScope = scope ?? optionalText(input.implementationAuthorizationRef.scope);
  const haystack = [sourceTable, refKind, effectiveScope].filter(Boolean).join(" ");
  const flags = {
    prohibited: false,
    proposalApproval: /proposal.*approval/i.test(haystack),
    cloneReview: /clone.*review/i.test(haystack),
    contentApproval: /content/i.test(haystack),
    clientApproval: /client/i.test(haystack),
    launchApproval: /launch/i.test(haystack),
    publishActivation: /publish/i.test(haystack),
    domainDdomReadiness: /domain|ddom|dns/i.test(haystack),
    aiProviderAdvisory: /ai|provider|advisory/i.test(haystack),
    generatedProposalBundle: /generated.*proposal.*bundle/i.test(haystack),
    commandCenterOpsInbox: /command.*center|ops.*inbox/i.test(haystack),
    unknownScope: Boolean(effectiveScope && effectiveScope !== AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE),
  };
  flags.prohibited = Object.entries(flags).some(([key, value]) => key !== "prohibited" && value);
  return flags;
}

function bridgeInput(input: ImprovementExecutionAafValidatorInput): ValidateImplementationAuthorizationRefInput {
  return {
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    migrationId: input.migrationId,
    proposalPlanId: input.proposalPlanId,
    proposalPlanVersion: input.proposalPlanVersion,
    proposalPlanSemanticWatermark: input.proposalPlanSemanticWatermark,
    proposalApprovalRef: input.proposalApprovalRef,
    cloneReviewRef: input.cloneReviewRef,
    cloneSiteVersionRef: input.cloneSiteVersionRef,
    runtimeArtifactRef: input.cloneRuntimeArtifactRef,
    sourceEvidenceReviewRef: input.sourceEvidenceReviewRef,
    selectedRecommendationRefs: input.selectedRecommendationRefs,
    implementationScopeSummary: input.implementationScopeSummary,
    implementationNonGoals: input.implementationNonGoals,
    riskImpactEffortSummary: input.riskImpactEffortSummary,
    limitations: input.limitations,
    operatorNotes: input.operatorNotes,
    advisoryAiProviderRefs: input.advisoryAiProviderRefs,
    auditTimelineRefs: input.auditTimelineRefs,
    implementationTargetRef: input.implementationTargetRef,
    implementationAttemptPlaceholderRef: input.implementationAttemptPlaceholderRef,
    implementationAuthorizationDecisionId: input.implementationAuthorizationRef.approvalDecisionId ?? "",
    approvalRequestId: input.implementationAuthorizationRef.approvalRequestId,
    evidencePackageId: input.implementationAuthorizationRef.evidencePackageId,
    policyVersion: input.policyVersion,
  };
}

function block(
  input: ImprovementExecutionAafValidatorInput,
  reasonCode: ImprovementExecutionAafReasonCode,
  blockerCodes: string[],
  details?: Partial<ImprovementExecutionAafValidationResult>,
): ImprovementExecutionAafValidationResult {
  const semanticWatermark = computeImplementationAuthorizationSemanticWatermark(bridgeInput(input));
  const flags = substitutionFlags(input, details?.matchedAafRequestDecisionRefs?.scope ?? null);
  return {
    allowed: false,
    mode: "blocked",
    reasonCode,
    blockerCodes,
    matchedAafRequestDecisionRefs: {
      approvalRequestId: input.implementationAuthorizationRef.approvalRequestId ?? null,
      approvalDecisionId: input.implementationAuthorizationRef.approvalDecisionId ?? null,
      evidencePackageId: input.implementationAuthorizationRef.evidencePackageId ?? null,
      scope: null,
      status: null,
      ...details?.matchedAafRequestDecisionRefs,
    },
    matchedEvidenceRefs: details?.matchedEvidenceRefs ?? [],
    matchedSubjectRefs: details?.matchedSubjectRefs ?? [],
    limitations: details?.limitations ?? [],
    freshnessResult: details?.freshnessResult ?? {
      status: "unknown",
      expectedSemanticWatermark: semanticWatermark,
      actualEvidenceWatermark: null,
      actualFreshnessWatermark: null,
      checkedAt: null,
    },
    driftResult: details?.driftResult ?? {
      proposalWatermarkMatched: false,
      selectedRecommendationWatermarkMatched: false,
      implementationScopeWatermarkMatched: false,
      semanticWatermarkMatched: false,
      driftedRoles: [],
    },
    missingRefs: details?.missingRefs ?? { authorization: [], subject: [], evidence: [] },
    staleRefs: details?.staleRefs ?? { subject: [], evidence: [], freshness: [] },
    prohibitedSubstitutionFlags: details?.prohibitedSubstitutionFlags ?? flags,
    actor: input.actor,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey ?? null,
    executionAttemptKey: input.executionAttemptKey ?? null,
    mutatesSourceTruth: false,
    nonExecuting: true,
  };
}

function mapBridgeReason(blockerCodes: string[]): ImprovementExecutionAafReasonCode {
  const joined = blockerCodes.join(" ");
  if (/scope/.test(joined)) return "wrong_scope";
  if (/subject/.test(joined)) return "wrong_subject";
  if (/required_evidence_refs_missing|evidence_package_missing|approval_evidence_missing|approval_evidence_link_missing/.test(joined)) return "evidence_missing";
  if (/evidence|freshness|watermark|policy_version|semantic_replay|replay|semanticInput|replayRoles/.test(joined)) return "evidence_stale";
  if (/revocation|approval_revoked/.test(joined)) return "approval_revoked";
  if (/supersession|approval_superseded/.test(joined)) return "approval_superseded";
  if (/expired/.test(joined)) return "approval_expired";
  if (/rejected/.test(joined)) return "approval_rejected";
  if (/cancelled/.test(joined)) return "approval_cancelled";
  if (/requested|pending|missing/.test(joined)) return "approval_required";
  if (/stale/.test(joined)) return "approval_stale";
  return "approval_invalid";
}

async function readOne(client: AafPgClient, sql: string, values: readonly unknown[]): Promise<Record<string, unknown> | null> {
  const result = await client.query(sql, values);
  return result.rows[0] ?? null;
}

async function readDetails(reader: ReadOnlyAafGateway, decisionId: string): Promise<DetailRows> {
  return reader.withTransaction(async (tx) => {
    const decision = await readOne(tx.client, `select * from public.gnr8_aaf_approval_decisions where id = $1::uuid`, [decisionId]);
    const requestId = optionalText(decision?.approval_request_id);
    const evidencePackageId = optionalText(decision?.evidence_package_id);
    const request = requestId ? await readOne(tx.client, `select * from public.gnr8_aaf_approval_requests where id = $1::uuid`, [requestId]) : null;
    const evidence = evidencePackageId ? await readOne(tx.client, `select * from public.gnr8_aaf_evidence_packages where id = $1::uuid`, [evidencePackageId]) : null;
    const subjectRefs = requestId
      ? (await tx.client.query(`select * from public.gnr8_aaf_approval_subject_refs where approval_request_id = $1::uuid`, [requestId])).rows
      : [];
    const evidenceRefs = evidencePackageId
      ? (await tx.client.query(`select * from public.gnr8_aaf_evidence_package_source_refs where evidence_package_id = $1::uuid`, [evidencePackageId])).rows
      : [];
    const freshness = evidencePackageId
      ? await readOne(
          tx.client,
          `
          select *
          from public.gnr8_aaf_evidence_package_freshness_checks
          where evidence_package_id = $1::uuid
          order by checked_at desc, created_at desc
          limit 1
          `,
          [evidencePackageId],
        )
      : null;
    const conflictingDecisionIds = requestId
      ? (
          await tx.client.query(
            `
            select id
            from public.gnr8_aaf_approval_decisions
            where approval_request_id = $1::uuid
              and id <> $2::uuid
              and status in ('granted', 'granted_with_limitations')
            `,
            [requestId, decisionId],
          )
        ).rows.map((row) => requiredText("conflicting decision id", row.id))
      : [];
    return { decision, request, evidence, subjectRefs, evidenceRefs, freshness, conflictingDecisionIds };
  });
}

function detailResult(input: ImprovementExecutionAafValidatorInput, details: DetailRows): Pick<
  ImprovementExecutionAafValidationResult,
  | "matchedAafRequestDecisionRefs"
  | "matchedEvidenceRefs"
  | "matchedSubjectRefs"
  | "freshnessResult"
  | "driftResult"
  | "missingRefs"
  | "staleRefs"
  | "prohibitedSubstitutionFlags"
> {
  const replay = replayForDetails(details);
  const validationInput = replay ? validationInputFromReplay(bridgeInput(input), replay) : bridgeInput(input);
  const expected = buildExpectedImplementationAuthorizationRefs(validationInput);
  const semanticWatermark = computeImplementationAuthorizationSemanticWatermark(validationInput);
  const matchedSubjectRefs = expected.subjectRefs
    .map((ref) => ({ expected: ref, row: details.subjectRefs.find((row) => refMatches(row, ref, "bridgeSubjectRole")) }))
    .filter((entry): entry is { expected: typeof entry.expected; row: Record<string, unknown> } => Boolean(entry.row))
    .map((entry) => rowRef(entry.row, entry.expected.role));
  const matchedEvidenceRefs = expected.evidenceRefs
    .map((ref) => ({ expected: ref, row: details.evidenceRefs.find((row) => refMatches(row, ref, "bridgeEvidenceRole")) }))
    .filter((entry): entry is { expected: typeof entry.expected; row: Record<string, unknown> } => Boolean(entry.row))
    .map((entry) => rowRef(entry.row, entry.expected.role));
  const missingSubject = expected.subjectRefs
    .filter((ref) => !details.subjectRefs.some((row) => metadataRole(row, "bridgeSubjectRole") === ref.role))
    .map((ref) => ref.role);
  const missingEvidence = expected.evidenceRefs
    .filter((ref) => !details.evidenceRefs.some((row) => metadataRole(row, "bridgeEvidenceRole") === ref.role))
    .map((ref) => ref.role);
  const staleSubject = expected.subjectRefs
    .filter((ref) => details.subjectRefs.some((row) => metadataRole(row, "bridgeSubjectRole") === ref.role) && !details.subjectRefs.some((row) => refMatches(row, ref, "bridgeSubjectRole")))
    .map((ref) => ref.role);
  const staleEvidence = expected.evidenceRefs
    .filter((ref) => details.evidenceRefs.some((row) => metadataRole(row, "bridgeEvidenceRole") === ref.role) && !details.evidenceRefs.some((row) => refMatches(row, ref, "bridgeEvidenceRole")))
    .map((ref) => ref.role);
  const replaySemantic = replay?.semanticInput;
  const replayRecommendations = new Map((replaySemantic?.selectedRecommendationRefs ?? []).map((ref) => [ref.recommendationId, ref.sourceWatermark]));
  const proposalWatermarkMatched =
    (!replaySemantic || optionalText(input.proposalPlanSemanticWatermark) === optionalText(replaySemantic.proposalPlanSemanticWatermark)) &&
    ![...missingSubject, ...staleSubject, ...missingEvidence, ...staleEvidence].some((role) => /proposal/.test(role));
  const selectedRecommendationWatermarkMatched =
    (!replaySemantic ||
      input.selectedRecommendationRefs.every((ref) => replayRecommendations.get(ref.recommendationId) === ref.sourceWatermark) &&
        input.selectedRecommendationRefs.length === replayRecommendations.size) &&
    ![...missingSubject, ...staleSubject, ...missingEvidence, ...staleEvidence].some((role) => /selected_recommendation/.test(role));
  const implementationScopeWatermarkMatched =
    optionalText(input.implementationScopeWatermark) === null ||
    details.evidenceRefs.some(
      (row) =>
        metadataRole(row, "bridgeEvidenceRole") === "implementation_scope_summary" &&
        (optionalText(row.source_watermark) === input.implementationScopeWatermark || optionalText(jsonObject(row.metadata_json).originalSourceWatermark) === input.implementationScopeWatermark),
    );
  const semanticWatermarkMatched = optionalText(details.evidence?.source_watermark) === semanticWatermark;
  const freshnessStatus = (() => {
    if (!details.evidence) return "missing";
    if (!details.freshness) return semanticWatermarkMatched ? "fresh" : "stale";
    const result = optionalText(details.freshness.result);
    if (result === "fresh" && optionalText(details.freshness.current_source_watermark) === semanticWatermark) return "fresh";
    if (result === "stale" || result === "partial_timeline") return "stale";
    if (result === "failed") return "failed";
    return "unknown";
  })();
  const driftedRoles = Array.from(new Set([...staleSubject, ...staleEvidence, ...(!semanticWatermarkMatched ? ["semantic_watermark"] : []), ...(!implementationScopeWatermarkMatched ? ["implementation_scope_summary"] : [])]));
  return {
    matchedAafRequestDecisionRefs: {
      approvalRequestId: optionalText(details.request?.id) ?? input.implementationAuthorizationRef.approvalRequestId ?? null,
      approvalDecisionId: optionalText(details.decision?.id) ?? input.implementationAuthorizationRef.approvalDecisionId ?? null,
      evidencePackageId: optionalText(details.evidence?.id) ?? input.implementationAuthorizationRef.evidencePackageId ?? null,
      scope: optionalText(details.request?.scope),
      status: optionalText(details.decision?.status),
    },
    matchedEvidenceRefs,
    matchedSubjectRefs,
    freshnessResult: {
      status: freshnessStatus,
      expectedSemanticWatermark: semanticWatermark,
      actualEvidenceWatermark: optionalText(details.evidence?.source_watermark),
      actualFreshnessWatermark: optionalText(details.freshness?.current_source_watermark),
      checkedAt: optionalText(details.freshness?.checked_at) ?? optionalText(details.freshness?.created_at),
    },
    driftResult: {
      proposalWatermarkMatched,
      selectedRecommendationWatermarkMatched,
      implementationScopeWatermarkMatched,
      semanticWatermarkMatched,
      driftedRoles,
    },
    missingRefs: {
      authorization: [
        ...(!details.request ? ["approval_request"] : []),
        ...(!details.decision ? ["approval_decision"] : []),
        ...(!details.evidence ? ["evidence_package"] : []),
      ],
      subject: missingSubject,
      evidence: missingEvidence,
    },
    staleRefs: {
      subject: staleSubject,
      evidence: staleEvidence,
      freshness: freshnessStatus === "fresh" ? [] : ["freshness_check"],
    },
    prohibitedSubstitutionFlags: substitutionFlags(input, optionalText(details.request?.scope)),
  };
}

function preflight(input: ImprovementExecutionAafValidatorInput): ImprovementExecutionAafValidationResult | null {
  const missingEnvelopeFields = [
    ["tenantId", input.tenantId],
    ["clientId", input.clientId],
    ["siteId", input.siteId],
    ["migrationId", input.migrationId],
    ["proposalPlanId", input.proposalPlanId],
    ["proposalPlanVersion", input.proposalPlanVersion],
    ["proposalPlanSemanticWatermark", input.proposalPlanSemanticWatermark],
    ["implementationScopeSummary", input.implementationScopeSummary],
    ["implementationScopeWatermark", input.implementationScopeWatermark],
    ["actor.actorType", input.actor?.actorType],
    ["actor.actorId", input.actor?.actorId],
    ["actor.actorRole", input.actor?.actorRole],
    ["policyVersion", input.policyVersion],
  ]
    .filter(([, value]) => !optionalText(value))
    .map(([field]) => String(field));
  if (missingEnvelopeFields.length > 0) {
    return block(input, "fail_closed", missingEnvelopeFields.map((field) => `${field}_missing`));
  }
  if (!["approved", "approved_with_limitations"].includes(input.proposalStatus)) {
    return block(input, "proposal_not_approved", ["proposal_status_not_approved"]);
  }
  if (input.cloneReviewRef.reviewStatus && !["accepted", "accepted_with_limitations"].includes(input.cloneReviewRef.reviewStatus)) {
    return block(input, "clone_review_not_accepted", ["clone_review_not_accepted"]);
  }
  if (input.sourceEvidenceReviewRef.reviewStatus && !["accepted", "accepted_with_limitations"].includes(input.sourceEvidenceReviewRef.reviewStatus)) {
    return block(input, "source_evidence_review_not_accepted", ["source_evidence_review_not_accepted"]);
  }
  if (!optionalText(input.correlationId)) return block(input, "correlation_missing", ["correlation_missing"]);
  if (!optionalText(input.idempotencyKey) && !optionalText(input.executionAttemptKey)) return block(input, "idempotency_missing", ["idempotency_or_execution_attempt_key_missing"]);
  const decisionId = optionalText(input.implementationAuthorizationRef.approvalDecisionId);
  const sourceRecordId = optionalText(input.implementationAuthorizationRef.sourceRecordId);
  if (!decisionId && !sourceRecordId) {
    return block(input, "authorization_ref_missing", ["implementation_authorization_decision_ref_missing"], {
      missingRefs: { authorization: ["approval_decision"], subject: [], evidence: [] },
    });
  }
  if (optionalText(input.implementationAuthorizationRef.sourceTable) && input.implementationAuthorizationRef.sourceTable !== "gnr8_aaf_approval_decisions") {
    return block(input, "authorization_ref_not_aaf_decision", ["implementation_authorization_ref_not_aaf_decision"]);
  }
  if (sourceRecordId && decisionId && sourceRecordId !== decisionId) {
    return block(input, "authorization_ref_missing", ["implementation_authorization_decision_ref_mismatch"], {
      missingRefs: { authorization: ["approval_decision"], subject: [], evidence: [] },
    });
  }
  for (const [recommendationId, watermark] of expectedRecommendationMap(input)) {
    const actual = input.selectedRecommendationRefs.find((ref) => ref.recommendationId === recommendationId)?.sourceWatermark;
    if (actual !== watermark) {
      return block(input, "selected_recommendation_drift", ["expected_recommendation_watermark_mismatch"], {
        driftResult: {
          proposalWatermarkMatched: true,
          selectedRecommendationWatermarkMatched: false,
          implementationScopeWatermarkMatched: true,
          semanticWatermarkMatched: false,
          driftedRoles: ["selected_recommendation_watermarks"],
        },
      });
    }
  }
  return null;
}

export class ImprovementExecutionAafValidator {
  private readonly bridge: SingleSiteImplementationAuthorizationBridge;

  constructor(private readonly reader: ReadOnlyAafGateway = new AafWriterRepository()) {
    this.bridge = new SingleSiteImplementationAuthorizationBridge(reader as never);
  }

  async validateImprovementExecutionAuthorization(input: ImprovementExecutionAafValidatorInput): Promise<ImprovementExecutionAafValidationResult> {
    const preflightResult = preflight(input);
    if (preflightResult) return preflightResult;

    const decisionId = requiredText(
      "implementationAuthorizationRef.approvalDecisionId",
      input.implementationAuthorizationRef.approvalDecisionId ?? input.implementationAuthorizationRef.sourceRecordId,
    );
    const normalizedInput = {
      ...input,
      implementationAuthorizationRef: {
        ...input.implementationAuthorizationRef,
        approvalDecisionId: decisionId,
      },
    };

    const [bridgeValidation, details] = await Promise.all([
      this.bridge.validateImplementationAuthorizationRef(bridgeInput(normalizedInput)),
      readDetails(this.reader, decisionId),
    ]);
    const detail = detailResult(normalizedInput, details);

    if (detail.prohibitedSubstitutionFlags.prohibited) {
      return block(normalizedInput, "wrong_scope", ["prohibited_authorization_substitution"], detail);
    }
    if (details.conflictingDecisionIds.length > 0) {
      return block(normalizedInput, "approval_conflict", ["multiple_conflicting_active_decisions"], detail);
    }
    if (!bridgeValidation.valid) {
      return block(normalizedInput, mapBridgeReason(bridgeValidation.blockerCodes), bridgeValidation.blockerCodes, {
        ...detail,
        limitations: bridgeValidation.limitations,
      });
    }
    if (detail.missingRefs.subject.length > 0) return block(normalizedInput, "subject_ref_missing", ["required_subject_refs_missing"], detail);
    if (detail.missingRefs.evidence.length > 0) return block(normalizedInput, "evidence_missing", ["required_evidence_refs_missing"], detail);
    if (detail.staleRefs.subject.length > 0) return block(normalizedInput, "subject_ref_mismatch", ["required_subject_refs_mismatched"], detail);
    if (detail.staleRefs.evidence.length > 0) return block(normalizedInput, "source_watermark_mismatch", ["required_evidence_refs_mismatched"], detail);
    if (!detail.driftResult.proposalWatermarkMatched) return block(normalizedInput, "evidence_stale", ["proposal_semantic_replay_mismatch"], detail);
    if (!detail.driftResult.selectedRecommendationWatermarkMatched) return block(normalizedInput, "selected_recommendation_drift", ["selected_recommendation_semantic_replay_mismatch"], detail);
    if (!detail.driftResult.implementationScopeWatermarkMatched) return block(normalizedInput, "proposal_scope_drift", ["implementation_scope_watermark_mismatch"], detail);
    if (detail.freshnessResult.status !== "fresh") return block(normalizedInput, "evidence_stale", ["evidence_freshness_not_fresh"], detail);
    if (detail.matchedAafRequestDecisionRefs.scope !== AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SCOPE) return block(normalizedInput, "wrong_scope", ["approval_scope_mismatch"], detail);
    if (optionalText(details.request?.subject_type) !== AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_SUBJECT_TYPE) return block(normalizedInput, "wrong_subject", ["approval_subject_type_mismatch"], detail);
    if (optionalText(details.evidence?.package_type) !== AAF_SINGLE_SITE_IMPLEMENTATION_AUTHORIZATION_EVIDENCE_TYPE) return block(normalizedInput, "wrong_evidence", ["evidence_package_type_mismatch"], detail);

    const limited = bridgeValidation.status === "granted_with_limitations" || bridgeValidation.limitations.length > 0;
    return {
      allowed: true,
      mode: limited ? "allowed_with_limitations" : "allowed",
      reasonCode: limited ? "authorization_valid_with_limitations" : "authorization_valid",
      blockerCodes: [],
      ...detail,
      limitations: bridgeValidation.limitations,
      actor: normalizedInput.actor,
      correlationId: normalizedInput.correlationId,
      idempotencyKey: normalizedInput.idempotencyKey ?? null,
      executionAttemptKey: normalizedInput.executionAttemptKey ?? null,
      mutatesSourceTruth: false,
      nonExecuting: true,
    };
  }
}

export function validateImprovementExecutionAuthorization(input: ImprovementExecutionAafValidatorInput): Promise<ImprovementExecutionAafValidationResult> {
  return new ImprovementExecutionAafValidator().validateImprovementExecutionAuthorization(input);
}
