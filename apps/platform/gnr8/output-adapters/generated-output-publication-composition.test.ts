import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { readLatestReview } from "./generated-output-publication-composition";

const SITE_VERSION_ID = "8ac51260-8180-5f64-ae5e-4f7259c971ab";

type QueryResult = { data: unknown; error: unknown };

function reviewClient(result: QueryResult, calls: string[]): SupabaseClient {
  const builder = {
    select(columns: string) {
      calls.push(`select:${columns}`);
      return builder;
    },
    eq(column: string, value: string) {
      calls.push(`eq:${column}:${value}`);
      return builder;
    },
    order(column: string, options: { ascending: boolean }) {
      calls.push(`order:${column}:${String(options.ascending)}`);
      return builder;
    },
    limit(count: number) {
      calls.push(`limit:${count}`);
      return Promise.resolve(result);
    },
  };
  return {
    from(table: string) {
      calls.push(`from:${table}`);
      return builder;
    },
  } as unknown as SupabaseClient;
}

test("reads the actual audit timestamp schema and treats no review as missing", async () => {
  const calls: string[] = [];
  const review = await readLatestReview(reviewClient({ data: [], error: null }, calls), SITE_VERSION_ID);

  assert.equal(review, null);
  assert.deepEqual(calls, [
    "from:gnr8_runtime_version_audit",
    "select:actor,details,timestamp,from_state,to_state",
    `eq:site_version_id:${SITE_VERSION_ID}`,
    "eq:to_state:APPROVED",
    "order:timestamp:false",
    "limit:20",
  ]);
});

test("keeps audit query failures explicit", async () => {
  const calls: string[] = [];

  await assert.rejects(
    () => readLatestReview(reviewClient({ data: null, error: { code: "42703" } }, calls), SITE_VERSION_ID),
    /generated_output_review_store_unavailable/,
  );
});
