import "server-only";

import {
  SINGLE_SITE_STATE_STAGE,
  type SingleSiteActorType,
  type SingleSiteJsonObject,
  type SingleSiteMigrationRefRole,
  type SingleSiteMigrationState,
  type SingleSitePrivacyLabel,
  type SingleSiteRetentionClass,
  type SingleSiteTransitionResult,
  isSingleSiteTerminalState,
  SingleSiteIdempotencyConflictError,
  SingleSiteTransitionError,
} from "./single-site-state-contracts";
import {
  SingleSiteStateWriterRepository,
  type InsertSingleSiteStateEventInput,
  type SingleSiteActorInput,
  type SingleSiteMigrationRow,
} from "./single-site-state-writer-repository";

export type SingleSiteTransitionRefInput = {
  refRole: SingleSiteMigrationRefRole;
  refType: string;
  sourceSystem?: string | null;
  sourceTable?: string | null;
  sourceRecordId: string;
  sourceVersion?: string | null;
  sourceWatermark?: string | null;
  payloadHash?: string | null;
  capturedAt?: string | null;
  freshUntil?: string | null;
  metadataJson?: SingleSiteJsonObject;
  idempotencyKey: string;
};

export type TransitionSingleSiteMigrationInput = {
  migrationId: string;
  toState: SingleSiteMigrationState;
  transitionKey?: string | null;
  transitionReason?: string | null;
  actor: SingleSiteActorInput;
  correlationId: string;
  causationId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  privacyLabel?: SingleSitePrivacyLabel | null;
  retentionClass?: SingleSiteRetentionClass | null;
  metadataJson?: SingleSiteJsonObject;
  requiredRefsJson?: SingleSiteJsonObject;
  beforeRefJson?: SingleSiteJsonObject;
  afterRefJson?: SingleSiteJsonObject;
  refs?: readonly SingleSiteTransitionRefInput[];
  sourceEvidenceReviewId?: string | null;
  aafAuditEventId?: string | null;
  aafEvidencePackageId?: string | null;
  aafApprovalRequestId?: string | null;
  aafApprovalDecisionId?: string | null;
  sourceWatermark?: string | null;
  payloadHash?: string | null;
  controlledOverride?: boolean | null;
  closeoutEvidence?: boolean | null;
};

const ALLOWED_DIRECT_TRANSITIONS = new Set<string>([
  "site_candidate_created->source_capture_started",
  "source_capture_started->source_capture_completed",
  "source_capture_started->source_capture_failed",
  "source_capture_failed->source_capture_started",
  "source_capture_completed->source_evidence_review_required",
  "source_evidence_review_required->source_capture_started",
  "source_evidence_review_required->clone_generation_started",
  "clone_generation_started->clone_generation_completed",
  "clone_generation_started->migration_failed",
  "clone_generation_completed->clone_review_required",
  "clone_review_required->clone_revision_required",
  "clone_revision_required->clone_generation_started",
  "clone_review_required->improvement_proposal_started",
  "improvement_proposal_started->improvement_proposal_ready",
  "improvement_proposal_ready->improvement_proposal_started",
  "improvement_proposal_ready->improvement_proposal_approved",
  "improvement_proposal_ready->improvement_proposal_rejected",
  "improvement_proposal_rejected->improvement_proposal_started",
  "improvement_proposal_approved->improvement_implementation_started",
  "improvement_implementation_started->improvement_implementation_completed",
  "improvement_implementation_completed->improved_version_review_required",
  "improved_version_review_required->content_review_required",
  "improvement_implementation_completed->improved_preview_ready",
  "improved_preview_ready->content_review_required",
  "content_review_required->content_approved",
  "content_approved->domain_readiness_required",
  "content_approved->subscription_required",
  "domain_readiness_required->domain_readiness_ready",
  "domain_readiness_ready->launch_approval_required",
  "subscription_required->subscription_created",
  "subscription_created->hosting_entitlement_ready",
  "hosting_entitlement_ready->launch_approval_required",
  "launch_approval_required->publish_ready",
  "publish_ready->published",
  "published->migration_closed_out",
  "published->rollback_available",
  "rollback_available->migration_closed_out",
]);

const NON_TERMINAL_FAILURES = new Set<SingleSiteMigrationState>(["migration_failed", "migration_cancelled"]);

function hasRef(input: TransitionSingleSiteMigrationInput, roles: readonly SingleSiteMigrationRefRole[]): boolean {
  return (input.refs ?? []).some((ref) => roles.includes(ref.refRole));
}

function hasJsonRef(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.keys(value as Record<string, unknown>).length > 0;
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

function validationAllowsExecutionStart(value: unknown): boolean {
  const validation = jsonObject(value);
  return validation.allowed === true && ["allowed", "allowed_with_limitations"].includes(String(validation.mode));
}

function reviewAllowsContentApproval(value: unknown): boolean {
  const review = jsonObject(value);
  return review.content_approval_ready === true && ["accepted", "accepted_with_limitations"].includes(String(review.review_status));
}

function contentApprovalAllowsClientOrLaunchApproval(value: unknown): boolean {
  const approval = jsonObject(value);
  return approval.client_or_launch_approval_ready === true && ["approved", "approved_with_limitations"].includes(String(approval.status));
}

async function latestContentApprovalForMigration(tx: unknown, migrationId: string): Promise<Record<string, unknown> | null> {
  if (!tx || typeof (tx as { query?: unknown }).query !== "function") return null;
  const latest = await (tx as { query(sql: string, values?: readonly unknown[]): Promise<{ rows: Record<string, unknown>[] }> }).query(
    `
    select *
    from public.gnr8_single_site_content_approvals
    where migration_id = $1::uuid
    order by updated_at desc, created_at desc
    limit 1
    `,
    [migrationId],
  );
  return latest.rows[0] ?? null;
}

function requireRefs(input: TransitionSingleSiteMigrationInput, roles: readonly SingleSiteMigrationRefRole[], missing: string[], label: string): void {
  if (!hasRef(input, roles)) missing.push(label);
}

function transitionKey(input: TransitionSingleSiteMigrationInput, fromState: SingleSiteMigrationState): string {
  return input.transitionKey?.trim() || `${fromState}.${input.toState}`;
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableJsonValue(record[key]);
        return acc;
      }, {});
  }
  return value ?? null;
}

function jsonSemanticValue(value: unknown): string {
  if (typeof value === "string") {
    try {
      return JSON.stringify(stableJsonValue(JSON.parse(value)));
    } catch {
      return JSON.stringify(stableJsonValue(value));
    }
  }
  return JSON.stringify(stableJsonValue(value));
}

function textSemanticValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function assertExistingTransitionMatchesInput(
  input: TransitionSingleSiteMigrationInput,
  existingEvent: { [key: string]: unknown },
): void {
  const attempted: Record<string, unknown> = {
    transition_key: input.transitionKey ? input.transitionKey.trim() : existingEvent.transition_key,
    transition_reason: textSemanticValue(input.transitionReason),
    required_refs_json: input.requiredRefsJson ?? {},
    before_ref_json: input.beforeRefJson ?? {},
    after_ref_json: input.afterRefJson ?? {},
    actor_type: input.actor.actorType,
    actor_id: textSemanticValue(input.actor.actorId),
    actor_role: textSemanticValue(input.actor.actorRole),
    aaf_audit_event_id: textSemanticValue(input.aafAuditEventId),
    aaf_evidence_package_id: textSemanticValue(input.aafEvidencePackageId),
    aaf_approval_request_id: textSemanticValue(input.aafApprovalRequestId),
    aaf_approval_decision_id: textSemanticValue(input.aafApprovalDecisionId),
    source_watermark: textSemanticValue(input.sourceWatermark),
    payload_hash: textSemanticValue(input.payloadHash),
    privacy_label: textSemanticValue(input.privacyLabel) ?? "client_confidential",
    retention_class: textSemanticValue(input.retentionClass) ?? "compliance_long",
    metadata_json: input.metadataJson ?? {},
  };
  const jsonFields = new Set(["required_refs_json", "before_ref_json", "after_ref_json", "metadata_json"]);
  const driftedFields = Object.keys(attempted).filter((field) => {
    const attemptedValue = attempted[field];
    const existingValue = existingEvent[field];
    return jsonFields.has(field)
      ? jsonSemanticValue(attemptedValue) !== jsonSemanticValue(existingValue)
      : textSemanticValue(attemptedValue) !== textSemanticValue(existingValue);
  });
  if (driftedFields.length > 0) {
    throw new SingleSiteIdempotencyConflictError(
      "gnr8_single_site_migration_state_events",
      input.idempotencyKey,
      driftedFields,
    );
  }
}

export class SingleSiteStateTransitionService {
  constructor(private readonly repository = new SingleSiteStateWriterRepository()) {}

  async transition(input: TransitionSingleSiteMigrationInput): Promise<SingleSiteTransitionResult> {
    return this.repository.withTransaction(async (tx) => {
      const migration = await this.repository.getMigrationById(tx, input.migrationId);
      if (!migration) throw new SingleSiteTransitionError(`single-site migration ${input.migrationId} was not found`);

      const existingEvent = await this.repository.getStateEventByIdempotencyKey(tx, input.idempotencyKey);
      if (existingEvent) {
        if (existingEvent.migration_id !== input.migrationId || existingEvent.to_state !== input.toState) {
          throw new SingleSiteTransitionError(`transition idempotency key ${input.idempotencyKey} belongs to a different transition`);
        }
        assertExistingTransitionMatchesInput(input, existingEvent);
        return {
          migrationId: migration.id,
          stateEventId: existingEvent.id,
          fromState: existingEvent.from_state ?? migration.current_state,
          toState: existingEvent.to_state,
          fromStage: existingEvent.from_stage ?? migration.current_stage,
          toStage: existingEvent.to_stage,
          stateVersion: migration.state_version,
          reusedExisting: true,
        };
      }

      await this.assertTransitionAllowed(tx, migration, input);

      const eventIndex = await this.repository.nextStateEventIndex(tx, migration.id);
      const eventInput: InsertSingleSiteStateEventInput = {
        migrationId: migration.id,
        eventIndex,
        fromState: migration.current_state,
        toState: input.toState,
        transitionKey: transitionKey(input, migration.current_state),
        transitionReason: input.transitionReason,
        requiredRefsJson: input.requiredRefsJson,
        missingRequirementsJson: [],
        beforeRefJson: input.beforeRefJson,
        afterRefJson: input.afterRefJson,
        actor: input.actor,
        aafAuditEventId: input.aafAuditEventId,
        aafEvidencePackageId: input.aafEvidencePackageId,
        aafApprovalRequestId: input.aafApprovalRequestId,
        aafApprovalDecisionId: input.aafApprovalDecisionId,
        sourceWatermark: input.sourceWatermark,
        payloadHash: input.payloadHash,
        correlationId: input.correlationId,
        causationId: input.causationId,
        idempotencyKey: input.idempotencyKey,
        requestId: input.requestId,
        privacyLabel: input.privacyLabel,
        retentionClass: input.retentionClass,
        metadataJson: input.metadataJson,
      };
      const event = await this.repository.insertStateEvent(tx, eventInput);

      for (const [index, ref] of (input.refs ?? []).entries()) {
        await this.repository.insertMigrationRef(tx, {
          ...ref,
          migrationId: migration.id,
          stateEventId: event.row.id,
          correlationId: input.correlationId,
          causationId: input.causationId,
          privacyLabel: input.privacyLabel,
          retentionClass: input.retentionClass,
          metadataJson: ref.metadataJson,
          idempotencyKey: ref.idempotencyKey || `${input.idempotencyKey}:ref:${index + 1}`,
        });
      }

      const updated = await this.repository.updateMigrationCurrentState(tx, {
        migrationId: migration.id,
        toState: input.toState,
        latestStateEventId: event.row.id,
        latestSourceEvidenceReviewId: input.sourceEvidenceReviewId ?? undefined,
        terminalAt: isSingleSiteTerminalState(input.toState) ? new Date().toISOString() : null,
      });

      return {
        migrationId: migration.id,
        stateEventId: event.row.id,
        fromState: migration.current_state,
        toState: updated.current_state,
        fromStage: migration.current_stage,
        toStage: updated.current_stage,
        stateVersion: updated.state_version,
        reusedExisting: event.reusedExisting,
      };
    });
  }

  private async assertTransitionAllowed(
    tx: Parameters<SingleSiteStateWriterRepository["getMigrationById"]>[0],
    migration: SingleSiteMigrationRow,
    input: TransitionSingleSiteMigrationInput,
  ): Promise<void> {
    const missing: string[] = [];
    const fromState = migration.current_state;

    if (fromState === input.toState) {
      throw new SingleSiteTransitionError(`migration is already in ${input.toState}`);
    }
    if (isSingleSiteTerminalState(fromState)) {
      throw new SingleSiteTransitionError(`terminal migration state ${fromState} cannot transition`);
    }

    const pair = `${fromState}->${input.toState}`;
    if (!ALLOWED_DIRECT_TRANSITIONS.has(pair) && !NON_TERMINAL_FAILURES.has(input.toState)) {
      throw new SingleSiteTransitionError(`transition ${pair} is not allowed`);
    }

    if (input.toState === "clone_generation_started") {
      const reviewId = input.sourceEvidenceReviewId ?? migration.latest_source_evidence_review_id;
      if (!reviewId) missing.push("accepted source evidence review ref");
      if (reviewId) {
        const review = await this.repository.getSourceEvidenceReviewById(tx, reviewId);
        if (!review || review.migration_id !== migration.id) missing.push("source evidence review for this migration");
        if (review && !["accepted", "accepted_with_limitations"].includes(review.review_status)) missing.push("accepted source evidence review status");
        if (review && !review.clone_generation_allowed) missing.push("clone_generation_allowed source evidence review");
        if (review?.review_status === "accepted_with_limitations") {
          const limitations = Array.isArray(review.review_limitations_json) ? review.review_limitations_json : [];
          if (limitations.length === 0) missing.push("accepted source evidence limitations");
          if (!review.aaf_approval_decision_id && !input.aafApprovalDecisionId) missing.push("AAF degraded evidence approval decision ref");
        }
        if (review) {
          const items = await this.repository.listSourceEvidenceReviewItems(tx, review.id);
          if (items.some((item) => item.blocks_clone_generation)) missing.push("no clone-blocking evidence items");
        }
      }
      requireRefs(input, ["source_evidence_review", "source_evidence_package"], missing, "source evidence migration ref");
    }

    if (input.toState === "improvement_proposal_started") {
      const review = await this.repository.getLatestCloneReviewForMigration(tx, migration.id);
      if (!review) {
        missing.push("accepted clone review");
      } else {
        if (!["accepted", "accepted_with_limitations"].includes(review.review_status)) missing.push("accepted clone review status");
        if (!review.proposal_planning_allowed) missing.push("clone review proposal planning allowed");
        const reviewRefs = await this.repository.listCloneReviewRefs(tx, review.id);
        const reviewRefRoles = new Set(reviewRefs.map((ref) => ref.ref_role));
        if (!reviewRefRoles.has("runtime_site_version_clone")) missing.push("clone site version ref");
        if (!reviewRefRoles.has("runtime_artifact_clone")) missing.push("runtime artifact ref");
        if (!reviewRefRoles.has("source_evidence_review")) missing.push("source evidence review ref");
        if (review.review_status === "accepted_with_limitations" && (!Array.isArray(review.limitations_json) || review.limitations_json.length === 0)) {
          missing.push("accepted clone review limitations");
        }
      }
      requireRefs(input, ["clone_review"], missing, "clone review migration ref");
    }

    if (input.toState === "improvement_proposal_approved" && fromState !== "improvement_proposal_ready") {
      missing.push("proposal ready state");
    }
    if (input.toState === "improvement_implementation_started") {
      const proposal = await this.repository.getLatestImprovementProposalPlanForMigration(tx, migration.id);
      if (!proposal || !["approved", "approved_with_limitations"].includes(proposal.plan_status)) missing.push("approved improvement proposal plan");
      if (!proposal?.implementation_authorization_attached) missing.push("separate implementation authorization ref");
      const executionAttempt = await this.repository.getLatestImprovementExecutionAttemptForMigration(tx, migration.id);
      if (!executionAttempt) {
        missing.push("ready improvement execution attempt");
      } else {
        if (executionAttempt.status !== "ready") missing.push("ready improvement execution attempt status");
        if (!validationAllowsExecutionStart(executionAttempt.validation_summary_json)) missing.push("successful execution-time AAF validation result");
        if (!Array.isArray(executionAttempt.selected_recommendation_refs_json) || executionAttempt.selected_recommendation_refs_json.length === 0) {
          missing.push("selected recommendation refs");
        }
        if (!executionAttempt.semantic_input_watermark) missing.push("implementation scope watermark");
      }
    }
    if (input.toState === "content_review_required") {
      const latest = await tx.query(
        `
        select *
        from public.gnr8_single_site_improved_version_reviews
        where migration_id = $1::uuid
        order by updated_at desc, created_at desc
        limit 1
        `,
        [migration.id],
      );
      const review = latest.rows[0];
      if (!review) missing.push("accepted improved version review");
      if (review && !reviewAllowsContentApproval(review)) missing.push("accepted improved version review status");
      if (review?.review_status === "accepted_with_limitations" && (!Array.isArray(review.limitations_json) || review.limitations_json.length === 0)) {
        missing.push("accepted improved version review limitations");
      }
      requireRefs(input, ["improved_version_review"], missing, "improved version review migration ref");
    }
    if (input.toState === "content_approved") {
      if (!["content_review_required", "improved_preview_ready"].includes(fromState)) {
        missing.push("improved preview/content review state");
      }
      const approval = await latestContentApprovalForMigration(tx, migration.id);
      if (!approval) missing.push("approved content approval");
      if (approval && !contentApprovalAllowsClientOrLaunchApproval(approval)) missing.push("approved content approval status");
      if (!approval?.aaf_content_approval_decision_id && !input.aafApprovalDecisionId) missing.push("AAF content approval decision ref");
      if (approval?.status === "approved_with_limitations" && (!Array.isArray(approval.limitations_json) || approval.limitations_json.length === 0)) {
        missing.push("approved content approval limitations");
      }
      requireRefs(input, ["content_approval"], missing, "content approval migration ref");
    }
    if (input.toState === "domain_readiness_ready") {
      requireRefs(input, ["ddom_readiness_snapshot"], missing, "DDOM readiness snapshot ref");
    }
    if (input.toState === "subscription_created") {
      requireRefs(input, ["subscription", "stripe_subscription", "billing_account", "hosting_entitlement"], missing, "billing/subscription/entitlement ref placeholder");
    }
    if (input.toState === "publish_ready") {
      const approval = await latestContentApprovalForMigration(tx, migration.id);
      if (!approval || !contentApprovalAllowsClientOrLaunchApproval(approval)) missing.push("approved content approval");
      requireRefs(input, ["content_approval"], missing, "content approval ref");
      requireRefs(input, ["ddom_readiness_snapshot", "domain_binding"], missing, "domain readiness ref");
      requireRefs(input, ["subscription", "hosting_entitlement", "stripe_subscription"], missing, "subscription or hosting entitlement ref");
      requireRefs(input, ["aaf_approval_decision", "aaf_approval_request"], missing, "launch approval ref");
      requireRefs(input, ["publish_target"], missing, "publish target ref");
      requireRefs(input, ["rollback_target"], missing, "rollback target ref");
    }
    if (input.toState === "published" && fromState !== "publish_ready" && !input.controlledOverride) {
      missing.push("publish_ready state or controlled override");
    }
    if (input.toState === "migration_closed_out") {
      if (!["published", "rollback_available"].includes(fromState)) missing.push("published or rollback_available state");
      if (fromState === "published" && !hasRef(input, ["rollback_target"])) missing.push("rollback readiness ref");
      if (!input.closeoutEvidence && !hasJsonRef(input.afterRefJson)) missing.push("closeout evidence");
      requireRefs(input, ["closeout"], missing, "closeout ref");
    }

    if (missing.length > 0) {
      throw new SingleSiteTransitionError(`transition ${pair} is blocked: ${missing.join(", ")}`, missing);
    }
  }
}

export function buildSingleSiteActor(actorType: SingleSiteActorType, actorId: string, actorRole: string): SingleSiteActorInput {
  return { actorType, actorId, actorRole };
}
