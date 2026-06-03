import { MigrationFactory } from "@/gnr8/migration-factory/migration-factory";
import { InMemoryMigrationJobStore, type MigrationJobStore } from "@/gnr8/migration-factory/migration-job-store";
import type { MigrationStageRunner } from "@/gnr8/migration-factory/migration-stage-runner";
import type { MigrationActivationExecutionResult, MigrationJob } from "@/gnr8/migration-factory/migration-job-types";

export type MigrationFactoryRuntimeMode = "auto" | "durable" | "memory";
export type MigrationFactoryRuntimeStoreKind = "postgres" | "memory" | "injected";

export type MigrationFactoryRuntime = {
  factory: MigrationFactory;
  store: MigrationJobStore;
  storeKind: MigrationFactoryRuntimeStoreKind;
  durable: boolean;
};

export class MigrationFactoryRuntimeConfigurationError extends Error {
  readonly code = "MIGRATION_RUNTIME_CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "MigrationFactoryRuntimeConfigurationError";
  }
}

type CreateMigrationFactoryRuntimeOptions = {
  mode?: MigrationFactoryRuntimeMode;
  store?: MigrationJobStore;
  storeKind?: MigrationFactoryRuntimeStoreKind;
  durable?: boolean;
  databaseUrl?: string | null;
  now?: () => string;
  stageRunner?: MigrationStageRunner;
  activationExecutor?: (input: { job: MigrationJob; now: () => string }) => Promise<MigrationActivationExecutionResult>;
};

function hasDatabaseConfig(databaseUrl: string | null | undefined): boolean {
  return typeof databaseUrl === "string" && databaseUrl.trim().length > 0;
}

export function isMigrationFactoryRuntimeDatabaseConfigured(input?: { databaseUrl?: string | null }): boolean {
  return hasDatabaseConfig(input?.databaseUrl ?? process.env.DATABASE_URL);
}

export async function createMigrationFactoryRuntime(
  options: CreateMigrationFactoryRuntimeOptions = {},
): Promise<MigrationFactoryRuntime> {
  const mode = options.mode ?? "auto";

  if (options.store) {
    const storeKind = options.storeKind ?? "injected";
    const durable = options.durable ?? storeKind === "postgres";
    return {
      factory: new MigrationFactory({
        store: options.store,
        now: options.now,
        stageRunner: options.stageRunner,
        activationExecutor: options.activationExecutor,
      }),
      store: options.store,
      storeKind,
      durable,
    };
  }

  if (mode === "memory") {
    const store = new InMemoryMigrationJobStore({ now: options.now });
    return {
      factory: new MigrationFactory({
        store,
        now: options.now,
        stageRunner: options.stageRunner,
        activationExecutor: options.activationExecutor,
      }),
      store,
      storeKind: "memory",
      durable: false,
    };
  }

  const databaseConfigured = isMigrationFactoryRuntimeDatabaseConfigured({ databaseUrl: options.databaseUrl });
  if (!databaseConfigured) {
    if (mode === "durable") {
      throw new MigrationFactoryRuntimeConfigurationError(
        "Durable migration runtime requires DATABASE_URL; refusing to fall back to in-memory migration job storage.",
      );
    }

    const store = new InMemoryMigrationJobStore({ now: options.now });
    return {
      factory: new MigrationFactory({
        store,
        now: options.now,
        stageRunner: options.stageRunner,
        activationExecutor: options.activationExecutor,
      }),
      store,
      storeKind: "memory",
      durable: false,
    };
  }

  const { PostgresMigrationJobStore } = await import("@/gnr8/migration-factory/postgres-migration-job-store");
  const store = new PostgresMigrationJobStore({ now: options.now });
  return {
    factory: new MigrationFactory({
      store,
      now: options.now,
      stageRunner: options.stageRunner,
      activationExecutor: options.activationExecutor,
    }),
    store,
    storeKind: "postgres",
    durable: true,
  };
}
