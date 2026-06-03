import type { MigrationBatchStore } from "@/gnr8/migration-factory/migration-batch-store";

export type MigrationBatchStoreRuntimeMode = "durable" | "memory";
export type MigrationBatchStoreKind = "postgres" | "memory" | "injected";

export type MigrationBatchStoreRuntime = {
  store: MigrationBatchStore;
  storeKind: MigrationBatchStoreKind;
  durable: boolean;
};

export class MigrationBatchStoreRuntimeConfigurationError extends Error {
  readonly code = "MIGRATION_BATCH_STORE_CONFIGURATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "MigrationBatchStoreRuntimeConfigurationError";
  }
}

type CreateMigrationBatchStoreRuntimeOptions = {
  mode?: MigrationBatchStoreRuntimeMode;
  store?: MigrationBatchStore;
  storeKind?: MigrationBatchStoreKind;
  durable?: boolean;
  databaseUrl?: string | null;
  now?: () => string;
};

function hasDatabaseConfig(databaseUrl: string | null | undefined): boolean {
  return typeof databaseUrl === "string" && databaseUrl.trim().length > 0;
}

export function isMigrationBatchStoreDatabaseConfigured(input?: { databaseUrl?: string | null }): boolean {
  return hasDatabaseConfig(input?.databaseUrl ?? process.env.DATABASE_URL);
}

export async function createMigrationBatchStoreRuntime(
  options: CreateMigrationBatchStoreRuntimeOptions = {},
): Promise<MigrationBatchStoreRuntime> {
  if (options.store) {
    const storeKind = options.storeKind ?? "injected";
    const durable = options.durable ?? storeKind === "postgres";
    return {
      store: options.store,
      storeKind,
      durable,
    };
  }

  const mode = options.mode ?? "durable";
  if (mode !== "durable") {
    throw new MigrationBatchStoreRuntimeConfigurationError(
      "Migration batch admin routes require durable storage; in-memory batch storage is not available.",
    );
  }

  const databaseConfigured = isMigrationBatchStoreDatabaseConfigured({ databaseUrl: options.databaseUrl });
  if (!databaseConfigured) {
    throw new MigrationBatchStoreRuntimeConfigurationError(
      "Durable migration batch store requires DATABASE_URL; refusing to fall back to in-memory migration batch storage.",
    );
  }

  const { PostgresMigrationBatchStore } = await import("@/gnr8/migration-factory/postgres-migration-batch-store");
  return {
    store: new PostgresMigrationBatchStore({ now: options.now }),
    storeKind: "postgres",
    durable: true,
  };
}
