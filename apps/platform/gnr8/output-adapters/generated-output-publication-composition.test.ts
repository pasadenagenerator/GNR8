import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createGeneratedOutputComposition, readLatestReview } from "./generated-output-publication-composition";

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

test("Stacki candidate composition requires Git for selected sites only", async () => {
  const keys = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY",
    "GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED", "GNR8_STACKI_GITHUB_ENABLED",
    "GNR8_STACKI_GITHUB_SITE_IDS", "GNR8_STACKI_GITHUB_BINDINGS_ENABLED"] as const;
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  const siteId = "33333333-3333-4333-8333-333333333333";
  try {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://local.invalid";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "local-test-key";
    process.env.GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED = "1";
    process.env.GNR8_STACKI_GITHUB_ENABLED = "1";
    process.env.GNR8_STACKI_GITHUB_SITE_IDS = JSON.stringify([siteId]);
    process.env.GNR8_STACKI_GITHUB_BINDINGS_ENABLED = "0";
    const repository = createGeneratedOutputComposition().candidateRepository as unknown as {
      prepareGeneratedGit?: unknown;
      gitArchiveRequired?: (owner: { agencyId: string; organizationId: string;
        ownershipSiteId: string; siteVersionId: string; runtimeSiteId: string }) => Promise<boolean>;
    };
    assert.equal(typeof repository.prepareGeneratedGit, "function");
    const owner = { agencyId: "11111111-1111-4111-8111-111111111111",
      organizationId: "22222222-2222-4222-8222-222222222222", ownershipSiteId: siteId,
      siteVersionId: "44444444-4444-4444-8444-444444444444", runtimeSiteId: "site_123" };
    assert.equal(await repository.gitArchiveRequired?.(owner), true);
    assert.equal(await repository.gitArchiveRequired?.({ ...owner, ownershipSiteId: "55555555-5555-4555-8555-555555555555" }), false);
    process.env.GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED = "0";
    assert.equal(await repository.gitArchiveRequired?.(owner), false);
  } finally {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
