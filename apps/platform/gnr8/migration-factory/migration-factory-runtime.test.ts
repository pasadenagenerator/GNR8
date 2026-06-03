import assert from "node:assert/strict";
import test from "node:test";

import {
  createMigrationFactoryRuntime,
  MigrationFactoryRuntimeConfigurationError,
} from "@/gnr8/migration-factory/migration-factory-runtime";
import { InMemoryMigrationJobStore } from "@/gnr8/migration-factory/migration-job-store";
import { PostgresMigrationJobStore } from "@/gnr8/migration-factory/postgres-migration-job-store";

test("migration factory runtime uses PostgresMigrationJobStore when durable mode is requested and DB config exists", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://user:pass@localhost:5432/gnr8_test";
  try {
    const runtime = await createMigrationFactoryRuntime({
      mode: "durable",
      databaseUrl: process.env.DATABASE_URL,
    });

    assert.equal(runtime.storeKind, "postgres");
    assert.equal(runtime.durable, true);
    assert.equal(runtime.store instanceof PostgresMigrationJobStore, true);
  } finally {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
  }
});

test("migration factory runtime durable mode fails closed when DB config is missing", async () => {
  await assert.rejects(
    () => createMigrationFactoryRuntime({ mode: "durable", databaseUrl: null }),
    (error) => {
      assert.equal(error instanceof MigrationFactoryRuntimeConfigurationError, true);
      assert.match((error as Error).message, /refusing to fall back to in-memory/);
      return true;
    },
  );
});

test("migration factory runtime respects injected stores for tests", async () => {
  const store = new InMemoryMigrationJobStore();
  const runtime = await createMigrationFactoryRuntime({
    mode: "durable",
    databaseUrl: null,
    store,
    storeKind: "injected",
    durable: false,
  });

  assert.equal(runtime.store, store);
  assert.equal(runtime.storeKind, "injected");
  assert.equal(runtime.durable, false);
});

test("migration factory runtime auto mode preserves memory store when DB config is unavailable", async () => {
  const runtime = await createMigrationFactoryRuntime({ mode: "auto", databaseUrl: null });

  assert.equal(runtime.storeKind, "memory");
  assert.equal(runtime.durable, false);
  assert.equal(runtime.store instanceof InMemoryMigrationJobStore, true);
});
