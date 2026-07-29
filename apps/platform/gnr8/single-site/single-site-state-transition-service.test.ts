import assert from "node:assert/strict";
import test from "node:test";

import { SingleSiteTransitionError, type SingleSiteMigrationState } from "./single-site-state-contracts";
import { SingleSiteStateTransitionService, type TransitionSingleSiteMigrationInput } from "./single-site-state-transition-service";

const MIGRATION_ID = "11111111-1111-4111-8111-111111111111";
const REVIEW_ID = "22222222-2222-4222-8222-222222222222";

function migration(state: SingleSiteMigrationState) {
  return {
    id: MIGRATION_ID,
    current_state: state,
    current_stage: state === "source_evidence_review_required" ? "source_evidence_review" : state === "migration_failed" ? "terminal" : "proposal",
    state_version: 1,
    latest_source_evidence_review_id: REVIEW_ID,
  };
}

function baseInput(overrides: Partial<TransitionSingleSiteMigrationInput> = {}): TransitionSingleSiteMigrationInput {
  return {
    migrationId: MIGRATION_ID,
    toState: "clone_generation_started",
    actor: { actorType: "system", actorId: "transition-test", actorRole: "migration_operator" },
    correlationId: "corr-transition-test",
    idempotencyKey: "idem-transition-test",
    refs: [
      {
        refRole: "source_evidence_review",
        refType: "source_evidence_review",
        sourceRecordId: REVIEW_ID,
        idempotencyKey: "idem-transition-ref",
      },
    ],
    sourceEvidenceReviewId: REVIEW_ID,
    ...overrides,
  };
}

function fakeRepository(options: {
  state: SingleSiteMigrationState;
  reviewStatus?: string;
  cloneAllowed?: boolean;
  blockingItems?: boolean;
}): never {
  const events: Record<string, unknown>[] = [];
  const refs: Record<string, unknown>[] = [];
  const repo = {
    async withTransaction(fn: (tx: unknown) => Promise<unknown>) {
      return fn({});
    },
    async getMigrationById() {
      return migration(options.state);
    },
    async getStateEventByIdempotencyKey() {
      return null;
    },
    async nextStateEventIndex() {
      return events.length + 1;
    },
    async insertStateEvent(_tx: unknown, input: Record<string, unknown>) {
      const row = {
        id: `event-${events.length + 1}`,
        migration_id: MIGRATION_ID,
        event_index: events.length + 1,
        from_state: options.state,
        to_state: input.toState,
        from_stage: migration(options.state).current_stage,
        to_stage: "clone",
        ...input,
      };
      events.push(row);
      return { row, reusedExisting: false };
    },
    async insertMigrationRef(_tx: unknown, input: Record<string, unknown>) {
      refs.push(input);
      return { row: { id: `ref-${refs.length}`, ...input }, reusedExisting: false };
    },
    async updateMigrationCurrentState(_tx: unknown, input: Record<string, unknown>) {
      return {
        ...migration(input.toState as SingleSiteMigrationState),
        latest_state_event_id: input.latestStateEventId,
        state_version: 2,
      };
    },
    async getSourceEvidenceReviewById() {
      return {
        id: REVIEW_ID,
        migration_id: MIGRATION_ID,
        review_status: options.reviewStatus ?? "accepted",
        clone_generation_allowed: options.cloneAllowed ?? true,
        review_limitations_json: [],
        aaf_approval_decision_id: null,
      };
    },
    async listSourceEvidenceReviewItems() {
      return options.blockingItems ? [{ blocks_clone_generation: true }] : [];
    },
  };
  return repo as never;
}

test("valid transition records state event, refs, and current state update", async () => {
  const service = new SingleSiteStateTransitionService(fakeRepository({ state: "source_evidence_review_required" }));
  const result = await service.transition(baseInput());
  assert.equal(result.toState, "clone_generation_started");
  assert.equal(result.stateEventId, "event-1");
  assert.equal(result.stateVersion, 2);
});

test("invalid transition and source evidence shortcuts fail closed", async () => {
  await assert.rejects(
    () => new SingleSiteStateTransitionService(fakeRepository({ state: "site_candidate_created" })).transition(baseInput()),
    SingleSiteTransitionError,
  );
  await assert.rejects(
    () => new SingleSiteStateTransitionService(fakeRepository({ state: "source_evidence_review_required", reviewStatus: "ready_for_review" })).transition(baseInput()),
    /accepted source evidence review status/,
  );
  await assert.rejects(
    () => new SingleSiteStateTransitionService(fakeRepository({ state: "source_evidence_review_required", blockingItems: true })).transition(baseInput()),
    /no clone-blocking evidence items/,
  );
});

test("proposal, publish, closeout, and terminal guardrails block missing prerequisites", async () => {
  await assert.rejects(
    () => new SingleSiteStateTransitionService(fakeRepository({ state: "improvement_proposal_started" })).transition(baseInput({ toState: "improvement_proposal_approved", refs: [] })),
    SingleSiteTransitionError,
  );
  await assert.rejects(
    () => new SingleSiteStateTransitionService(fakeRepository({ state: "launch_approval_required" })).transition(baseInput({ toState: "publish_ready", refs: [] })),
    /content approval ref/,
  );
  await assert.rejects(
    () => new SingleSiteStateTransitionService(fakeRepository({ state: "published" })).transition(baseInput({ toState: "migration_closed_out", refs: [], closeoutEvidence: false })),
    /rollback readiness ref/,
  );
  await assert.rejects(
    () => new SingleSiteStateTransitionService(fakeRepository({ state: "migration_failed" })).transition(baseInput({ toState: "source_capture_started" })),
    /terminal migration state/,
  );
});
