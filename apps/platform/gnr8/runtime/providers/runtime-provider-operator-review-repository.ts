import {
  createOperatorReviewInsertRows,
  mapOperatorReviewArtifactRow,
  type RuntimeProviderOperatorReviewArtifactRecord,
  type RuntimeProviderOperatorReviewArtifactRow,
} from "@/gnr8/runtime/providers/runtime-provider-operator-review-store";
import { getSuperadminPool } from "@/src/superadmin/db";

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => sanitizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export async function createProviderOperatorReviewArtifacts(
  input: readonly RuntimeProviderOperatorReviewArtifactRecord[],
): Promise<RuntimeProviderOperatorReviewArtifactRecord[]> {
  const rows = createOperatorReviewInsertRows(input);
  if (rows.length === 0) return [];

  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderOperatorReviewArtifactRow>(
    `
    insert into public.gnr8_runtime_provider_operator_reviews (
      review_id,
      handoff_id,
      correlation_key,
      reviewer_ref,
      review_status,
      review_reason,
      created_at
    )
    select
      t.review_id::text,
      t.handoff_id::text,
      t.correlation_key::text,
      t.reviewer_ref::text,
      t.review_status::text,
      t.review_reason::text,
      t.created_at::timestamptz
    from unnest(
      $1::text[],
      $2::text[],
      $3::text[],
      $4::text[],
      $5::text[],
      $6::text[],
      $7::timestamptz[]
    ) as t(
      review_id,
      handoff_id,
      correlation_key,
      reviewer_ref,
      review_status,
      review_reason,
      created_at
    )
    on conflict do nothing
    returning
      review_id::text as review_id,
      handoff_id::text as handoff_id,
      correlation_key::text as correlation_key,
      reviewer_ref::text as reviewer_ref,
      review_status::text as review_status,
      review_reason::text as review_reason,
      created_at::text as created_at
    `,
    [
      rows.map((row) => row.review_id),
      rows.map((row) => row.handoff_id),
      rows.map((row) => row.correlation_key),
      rows.map((row) => row.reviewer_ref),
      rows.map((row) => row.review_status),
      rows.map((row) => row.review_reason),
      rows.map((row) => row.created_at),
    ],
  );

  return res.rows.map(mapOperatorReviewArtifactRow);
}

export async function getProviderOperatorReviewsByHandoffId(
  handoffId: string,
): Promise<{ reviews: RuntimeProviderOperatorReviewArtifactRecord[]; diagnostics: string[] }> {
  const normalizedHandoffId = sanitizeToken(handoffId);
  if (!normalizedHandoffId) {
    return { reviews: [], diagnostics: ["OPERATOR_REVIEW_FAILED_CLOSED:MISSING_HANDOFF_ID"] };
  }

  const pool = getSuperadminPool();
  const res = await pool.query<RuntimeProviderOperatorReviewArtifactRow>(
    `
    select
      review_id::text as review_id,
      handoff_id::text as handoff_id,
      correlation_key::text as correlation_key,
      reviewer_ref::text as reviewer_ref,
      review_status::text as review_status,
      review_reason::text as review_reason,
      created_at::text as created_at
    from public.gnr8_runtime_provider_operator_reviews
    where handoff_id = $1::text
    order by created_at asc, review_id asc
    `,
    [normalizedHandoffId],
  );

  return {
    reviews: res.rows.map(mapOperatorReviewArtifactRow),
    diagnostics: uniqueSorted(["OPERATOR_REVIEW_READ"]),
  };
}

