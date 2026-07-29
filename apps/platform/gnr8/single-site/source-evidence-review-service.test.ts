import assert from "node:assert/strict";
import test from "node:test";

import { SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES, SingleSiteTransitionError } from "./single-site-state-contracts";
import { SourceEvidenceReviewService, type AddSourceEvidenceItemInput, type ReviewDecisionInput } from "./source-evidence-review-service";

const REVIEW_ID = "11111111-1111-4111-8111-111111111111";
const MIGRATION_ID = "22222222-2222-4222-8222-222222222222";

function actor() {
  return { actorType: "human" as const, actorId: "reviewer-1", actorRole: "source_evidence_reviewer" };
}

function decision(overrides: Partial<ReviewDecisionInput> = {}): ReviewDecisionInput {
  return {
    reviewId: REVIEW_ID,
    actor: actor(),
    correlationId: "corr-review-test",
    idempotencyKey: `idem-review-${Math.random()}`,
    ...overrides,
  };
}

function item(category: AddSourceEvidenceItemInput["evidenceCategory"], overrides: Partial<AddSourceEvidenceItemInput> = {}): AddSourceEvidenceItemInput {
  return {
    reviewId: REVIEW_ID,
    migrationId: MIGRATION_ID,
    evidenceCategory: category,
    status: "present",
    actor: actor(),
    correlationId: "corr-review-test",
    idempotencyKey: `idem-item-${category}`,
    ...overrides,
  };
}

function fakeRepository(seedItems: Record<string, unknown>[] = []): never {
  const review = {
    id: REVIEW_ID,
    migration_id: MIGRATION_ID,
    tenant_id: "tenant-review",
    client_id: "33333333-3333-4333-8333-333333333333",
    source_url: "https://example.test",
    source_evidence_package_key: "pkg-1",
    source_watermark: "wm-1",
    review_status: "not_started",
    clone_generation_allowed: false,
  };
  const items = [...seedItems];
  const events: Record<string, unknown>[] = [];
  const repo = {
    async withTransaction(fn: (tx: unknown) => Promise<unknown>) {
      return fn({});
    },
    async createSourceEvidenceReview() {
      return { row: review, reusedExisting: false };
    },
    async getSourceEvidenceReviewEventByIdempotencyKey(_tx: unknown, idempotencyKey: string) {
      return events.find((event) => event.idempotency_key === idempotencyKey) ?? null;
    },
    async nextReviewEventIndex() {
      return events.length + 1;
    },
    async insertSourceEvidenceReviewEvent(_tx: unknown, input: Record<string, unknown>) {
      const row = { id: `event-${events.length + 1}`, idempotency_key: input.idempotencyKey, ...input };
      events.push(row);
      return { row, reusedExisting: false };
    },
    async getSourceEvidenceReviewById() {
      return review;
    },
    async insertSourceEvidenceReviewRef() {
      return { row: { id: "ref-1" }, reusedExisting: false };
    },
    async upsertSourceEvidenceReviewItem(_tx: unknown, input: Record<string, unknown>) {
      const existing = items.find((candidate) => candidate.evidence_category === input.evidenceCategory);
      const row = {
        id: existing?.id ?? `item-${items.length + 1}`,
        review_id: REVIEW_ID,
        migration_id: MIGRATION_ID,
        evidence_category: input.evidenceCategory,
        status: input.status,
        required_for_clone: input.requiredForClone ?? true,
        blocks_clone_generation: input.blocksCloneGeneration ?? false,
        accepted_limitation: input.acceptedLimitation ?? false,
      };
      if (existing) Object.assign(existing, row);
      else items.push(row);
      return row;
    },
    async listSourceEvidenceReviewItems() {
      return items;
    },
    async updateSourceEvidenceReviewStatus(_tx: unknown, input: Record<string, unknown>) {
      Object.assign(review, {
        review_status: input.reviewStatus,
        review_decision: input.reviewDecision,
        clone_generation_allowed: input.cloneGenerationAllowed,
        review_limitations_json: input.reviewLimitationsJson ?? [],
        aaf_approval_decision_id: input.aafApprovalDecisionId ?? null,
      });
      return review;
    },
  };
  return repo as never;
}

function completeItems(): Record<string, unknown>[] {
  return SINGLE_SITE_REQUIRED_SOURCE_EVIDENCE_CATEGORIES.map((category, index) => ({
    id: `item-${index + 1}`,
    review_id: REVIEW_ID,
    migration_id: MIGRATION_ID,
    evidence_category: category,
    status: "present",
    required_for_clone: true,
    blocks_clone_generation: false,
    accepted_limitation: false,
  }));
}

test("source evidence review creation, ref recording, and evidence item add write events", async () => {
  const service = new SourceEvidenceReviewService(fakeRepository());
  const created = await service.createReview({
    migrationId: MIGRATION_ID,
    tenantId: "tenant-review",
    clientId: "33333333-3333-4333-8333-333333333333",
    sourceUrl: "https://example.test",
    sourceEvidencePackageKey: "pkg-1",
    sourceWatermark: "wm-1",
    evidenceCapturedAt: "2026-07-29T12:00:00.000Z",
    completenessStatus: "complete",
    actor: actor(),
    correlationId: "corr-review-test",
    idempotencyKey: "idem-review-create",
  });
  const ref = await service.recordRef({
    reviewId: REVIEW_ID,
    migrationId: MIGRATION_ID,
    refRole: "source_url",
    refType: "url",
    sourceRecordId: "https://example.test",
    actor: actor(),
    correlationId: "corr-review-test",
    idempotencyKey: "idem-review-ref",
  });
  const added = await service.addEvidenceItem(item("source_url"));

  assert.equal(created.review.id, REVIEW_ID);
  assert.equal(ref.refId, "ref-1");
  assert.equal(added.item.evidence_category, "source_url");
  assert.equal(added.eventId, "event-2");
});

test("accept requires required evidence, while complete evidence allows clone generation", async () => {
  await assert.rejects(() => new SourceEvidenceReviewService(fakeRepository()).accept(decision({ idempotencyKey: "idem-accept-empty" })), /no evidence items/);

  const accepted = await new SourceEvidenceReviewService(fakeRepository(completeItems())).accept(decision({ idempotencyKey: "idem-accept-complete" }));
  assert.equal(accepted.review.review_status, "accepted");
  assert.equal(accepted.review.clone_generation_allowed, true);
});

test("accept with limitations, retry, reject, and supersede enforce reasons and limitation refs", async () => {
  await assert.rejects(
    () => new SourceEvidenceReviewService(fakeRepository(completeItems())).acceptWithLimitations(decision({ idempotencyKey: "idem-limit-missing" })),
    /limitations/,
  );

  const limited = await new SourceEvidenceReviewService(fakeRepository(completeItems())).acceptWithLimitations(
    decision({
      idempotencyKey: "idem-limit-ok",
      limitationsJson: [{ category: "font", reason: "remote font blocked" }],
      aafApprovalDecisionId: "44444444-4444-4444-8444-444444444444",
    }),
  );
  assert.equal(limited.review.review_status, "accepted_with_limitations");

  await assert.rejects(() => new SourceEvidenceReviewService(fakeRepository(completeItems())).requireRetry(decision({ idempotencyKey: "idem-retry-missing" })), /reason/);
  const retry = await new SourceEvidenceReviewService(fakeRepository(completeItems())).requireRetry(decision({ idempotencyKey: "idem-retry-ok", reason: "missing route map" }));
  assert.equal(retry.review.review_status, "retry_required");

  const rejected = await new SourceEvidenceReviewService(fakeRepository(completeItems())).reject(decision({ idempotencyKey: "idem-reject-ok", reason: "source unusable" }));
  assert.equal(rejected.review.review_status, "rejected");

  await assert.rejects(() => new SourceEvidenceReviewService(fakeRepository(completeItems())).supersede(decision({ idempotencyKey: "idem-supersede-missing" })), SingleSiteTransitionError);
});
