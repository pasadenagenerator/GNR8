import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { type TestContext } from "node:test";

import type { RuntimeProviderOperatorReviewArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-operator-review-store";
import {
  createProviderOperatorReviewArtifacts,
  getProviderOperatorReviewsByHandoffId,
} from "@/gnr8/runtime/providers/runtime-provider-operator-review-repository";
import { getSuperadminPool } from "@/src/superadmin/db";

const MISSING_TABLE_MESSAGE = `relation "public.gnr8_runtime_provider_operator_reviews" does not exist`;
const MISSING_DB_CONFIG_MESSAGE = `Invalid database configuration: {"sourceEnvVar":"DATABASE_URL","protocol":null,"hostname":null,"reasonCode":"MISSING"}`;

function buildReview(input?: Partial<RuntimeProviderOperatorReviewArtifactRecord>): RuntimeProviderOperatorReviewArtifactRecord {
  const nonce = randomUUID();
  return {
    reviewId: `review_${nonce}`,
    handoffId: `handoff_${nonce}`,
    correlationKey: `corr_${nonce}`,
    reviewerRef: `reviewer_${nonce}`,
    reviewStatus: "pending_review",
    reviewReason: "operator validated dry-run evidence",
    createdAt: "2026-05-22T00:00:00.000Z",
    ...input,
  };
}

async function cleanup(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await getSuperadminPool().query(`delete from public.gnr8_runtime_provider_operator_reviews where review_id = any($1::text[])`, [ids]);
}

function getMissingTableSkipReason(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  if (error.message.includes(MISSING_DB_CONFIG_MESSAGE)) {
    return "Skipping DB-backed runtime provider operator review repository tests: DATABASE_URL is not configured for local integration runs.";
  }
  if (!error.message.includes(MISSING_TABLE_MESSAGE)) return null;
  return `Skipping DB-backed runtime provider operator review repository tests: missing migration table public.gnr8_runtime_provider_operator_reviews (${MISSING_TABLE_MESSAGE}).`;
}

let dbSkipReasonPromise: Promise<string | null> | null = null;

async function getRepositoryDbSkipReason(): Promise<string | null> {
  if (!dbSkipReasonPromise) {
    dbSkipReasonPromise = (async () => {
      try {
        await getSuperadminPool().query(`select 1 from public.gnr8_runtime_provider_operator_reviews limit 1`);
        return null;
      } catch (error) {
        const skipReason = getMissingTableSkipReason(error);
        if (skipReason) return skipReason;
        throw error;
      }
    })();
  }
  return dbSkipReasonPromise;
}

async function skipIfRepositoryTableMissing(t: TestContext): Promise<boolean> {
  const skipReason = await getRepositoryDbSkipReason();
  if (!skipReason) return false;
  t.skip(skipReason);
  return true;
}

test("runtime provider operator review repository: persist pending review", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;
  const review = buildReview({ reviewStatus: "pending_review" });
  try {
    const inserted = await createProviderOperatorReviewArtifacts([review]);
    assert.equal(inserted.length, 1);
    assert.equal(inserted[0]?.reviewStatus, "pending_review");
  } finally {
    await cleanup([review.reviewId]);
  }
});

test("runtime provider operator review repository: persist approved_for_future_execution", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;
  const review = buildReview({ reviewStatus: "approved_for_future_execution" });
  try {
    const inserted = await createProviderOperatorReviewArtifacts([review]);
    assert.equal(inserted.length, 1);
    assert.equal(inserted[0]?.reviewStatus, "approved_for_future_execution");
  } finally {
    await cleanup([review.reviewId]);
  }
});

test("runtime provider operator review repository: persist rejected", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;
  const review = buildReview({ reviewStatus: "rejected" });
  try {
    const inserted = await createProviderOperatorReviewArtifacts([review]);
    assert.equal(inserted.length, 1);
    assert.equal(inserted[0]?.reviewStatus, "rejected");
  } finally {
    await cleanup([review.reviewId]);
  }
});

test("runtime provider operator review repository: read by handoffId deterministic ordering", async (t) => {
  if (await skipIfRepositoryTableMissing(t)) return;
  const handoffId = `handoff_shared_${randomUUID()}`;
  const a = buildReview({
    reviewId: `review_a_${randomUUID()}`,
    handoffId,
    createdAt: "2026-05-22T00:00:01.000Z",
    reviewStatus: "needs_changes",
  });
  const b = buildReview({
    reviewId: `review_b_${randomUUID()}`,
    handoffId,
    createdAt: "2026-05-22T00:00:00.000Z",
    reviewStatus: "pending_review",
  });
  try {
    await createProviderOperatorReviewArtifacts([a, b]);
    const result = await getProviderOperatorReviewsByHandoffId(handoffId);
    assert.deepEqual(
      result.reviews.map((row) => row.reviewId),
      [b.reviewId, a.reviewId],
    );
    assert.equal(result.diagnostics.includes("OPERATOR_REVIEW_READ"), true);
  } finally {
    await cleanup([a.reviewId, b.reviewId]);
  }
});

