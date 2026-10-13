import assert from "node:assert/strict";
import test from "node:test";

import {
  assertMvp28EffectiveDatabaseIdentity,
  assertMvp28StagingConnectionConfiguration,
} from "./mvp28-staging-database-identity";

const PROJECT_REF = "dpkdxllcxnlytgjbnmvp";
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const PASSWORD = "test-only-password";

test("MVP 28 accepts the approved staging shared-pooler identity with effective role postgres", () => {
  assert.equal(
    assertMvp28StagingConnectionConfiguration({
      supabaseUrl: SUPABASE_URL,
      databaseUrl: `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@aws-1-eu-central-2.pooler.supabase.com:5432/postgres`,
    }),
    "shared_session_pooler",
  );
  assert.doesNotThrow(() => assertMvp28EffectiveDatabaseIdentity({
    databaseName: "postgres",
    databaseUser: "postgres",
  }));
});

test("MVP 28 accepts the approved staging direct identity", () => {
  assert.equal(
    assertMvp28StagingConnectionConfiguration({
      supabaseUrl: SUPABASE_URL,
      databaseUrl: `postgresql://postgres:${PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    }),
    "direct",
  );
  assert.doesNotThrow(() => assertMvp28EffectiveDatabaseIdentity({
    databaseName: "postgres",
    databaseUser: "postgres",
  }));
});

test("MVP 28 rejects wrong or ambiguous configured staging identities", async (t) => {
  await t.test("wrong project", () => {
    assert.throws(() => assertMvp28StagingConnectionConfiguration({
      supabaseUrl: "https://wrongprojectref.supabase.co",
      databaseUrl: `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@aws-1-eu-central-2.pooler.supabase.com:5432/postgres`,
    }), /mvp28_wrong_staging_target/);
  });
  await t.test("unapproved pooler host", () => {
    assert.throws(() => assertMvp28StagingConnectionConfiguration({
      supabaseUrl: SUPABASE_URL,
      databaseUrl: `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@aws-2-eu-central-2.pooler.supabase.com:5432/postgres`,
    }), /mvp28_wrong_staging_target/);
  });
  await t.test("pooler routing login on the direct host", () => {
    assert.throws(() => assertMvp28StagingConnectionConfiguration({
      supabaseUrl: SUPABASE_URL,
      databaseUrl: `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    }), /mvp28_wrong_staging_target/);
  });
});

test("MVP 28 rejects an unexpected effective role or database", async (t) => {
  await t.test("unexpected effective role", () => {
    assert.throws(() => assertMvp28EffectiveDatabaseIdentity({
      databaseName: "postgres",
      databaseUser: `postgres.${PROJECT_REF}`,
    }), /mvp28_database_identity_mismatch/);
  });
  await t.test("wrong database", () => {
    assert.throws(() => assertMvp28EffectiveDatabaseIdentity({
      databaseName: "template1",
      databaseUser: "postgres",
    }), /mvp28_database_identity_mismatch/);
  });
});
