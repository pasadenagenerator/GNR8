import {
  createMigrationBatchStoreRuntime,
  MigrationBatchStoreRuntimeConfigurationError,
  type MigrationBatchStoreRuntime,
} from "@/gnr8/migration-factory/migration-batch-store-runtime";
import {
  createMigrationFactoryRuntime,
  MigrationFactoryRuntimeConfigurationError,
  type MigrationFactoryRuntime,
} from "@/gnr8/migration-factory/migration-factory-runtime";
import {
  createMigrationBatchSmokeTestSeed,
  type MigrationBatchSmokeTestSeedResult,
} from "@/gnr8/migration-factory/migration-batch-smoke-test-seed";

export type MigrationBatchSmokeTestSeedRouteDependencies = {
  requireSuperadminUserId: () => Promise<string>;
  createMigrationBatchStoreRuntime: typeof createMigrationBatchStoreRuntime;
  createMigrationFactoryRuntime: typeof createMigrationFactoryRuntime;
  createMigrationBatchSmokeTestSeed: typeof createMigrationBatchSmokeTestSeed;
  getNodeEnv: () => string;
  getDeploymentEnv: () => string;
  isExplicitlyEnabled: () => boolean;
};

type MigrationBatchSmokeTestSeedRouteResponse = MigrationBatchSmokeTestSeedResult & {
  ok: true;
  adminOnly: true;
  durableOnly: true;
  seedOnly: true;
  externalExecutionBlocked: true;
  store: {
    batch: {
      durable: boolean;
      storeKind: MigrationBatchStoreRuntime["storeKind"];
    };
    jobs: {
      durable: boolean;
      storeKind: MigrationFactoryRuntime["storeKind"];
    };
  };
};

const REQUIRED_ENV_FLAG = "GNR8_ADMIN_MIGRATION_BATCH_SMOKE_SEED_ENABLED=1";

async function defaultRequireSuperadminUserId(): Promise<string> {
  const mod = await import("@/src/auth/require-superadmin-user-id");
  return mod.requireSuperadminUserId();
}

function token(value: unknown): string {
  return String(value ?? "").trim();
}

function normalized(value: unknown): string {
  return token(value).toLowerCase();
}

function isSafeEnvironment(input: {
  nodeEnv: string;
  deploymentEnv: string;
  explicitlyEnabled: boolean;
}): boolean {
  if (input.explicitlyEnabled) return true;
  const nodeEnv = normalized(input.nodeEnv);
  const deploymentEnv = normalized(input.deploymentEnv);
  if (deploymentEnv === "staging") return true;
  return nodeEnv === "development" || nodeEnv === "test";
}

function mapError(error: unknown): { status: number; message: string } {
  if (
    error instanceof MigrationBatchStoreRuntimeConfigurationError ||
    error instanceof MigrationFactoryRuntimeConfigurationError
  ) {
    return { status: 503, message: error.message };
  }
  if (error instanceof Error) {
    if (error.message === "Unauthorized") return { status: 401, message: error.message };
    if (error.message.startsWith("Forbidden")) return { status: 403, message: error.message };
  }
  return { status: 500, message: error instanceof Error ? error.message : "Internal server error" };
}

export function createMigrationBatchSmokeTestSeedRouteHandlers(
  deps: Partial<MigrationBatchSmokeTestSeedRouteDependencies> = {},
) {
  const resolvedDeps: MigrationBatchSmokeTestSeedRouteDependencies = {
    requireSuperadminUserId: defaultRequireSuperadminUserId,
    createMigrationBatchStoreRuntime,
    createMigrationFactoryRuntime,
    createMigrationBatchSmokeTestSeed,
    getNodeEnv: () => token(process.env.NODE_ENV || "development"),
    getDeploymentEnv: () => token(process.env.GNR8_ENV || process.env.VERCEL_ENV || process.env.APP_ENV || ""),
    isExplicitlyEnabled: () => token(process.env.GNR8_ADMIN_MIGRATION_BATCH_SMOKE_SEED_ENABLED) === "1",
    ...deps,
  };

  return {
    async POST(_request: Request): Promise<Response> {
      try {
        const userId = await resolvedDeps.requireSuperadminUserId();
        const nodeEnv = resolvedDeps.getNodeEnv();
        const deploymentEnv = resolvedDeps.getDeploymentEnv();
        const explicitlyEnabled = resolvedDeps.isExplicitlyEnabled();

        if (!isSafeEnvironment({ nodeEnv, deploymentEnv, explicitlyEnabled })) {
          return Response.json(
            {
              ok: false,
              adminOnly: true,
              durableOnly: true,
              seedOnly: true,
              externalExecutionBlocked: true,
              error: "Forbidden: migration batch smoke-test seed is disabled outside development/staging",
              requiredEnvFlag: REQUIRED_ENV_FLAG,
            },
            { status: 403 },
          );
        }

        const [batchRuntime, migrationRuntime] = await Promise.all([
          resolvedDeps.createMigrationBatchStoreRuntime({ mode: "durable" }),
          resolvedDeps.createMigrationFactoryRuntime({ mode: "durable" }),
        ]);

        if (!batchRuntime.durable || !migrationRuntime.durable) {
          return Response.json(
            {
              ok: false,
              adminOnly: true,
              durableOnly: true,
              seedOnly: true,
              externalExecutionBlocked: true,
              error: "Durable migration batch smoke-test seed requires durable batch and job storage",
            },
            { status: 503 },
          );
        }

        const seed = await resolvedDeps.createMigrationBatchSmokeTestSeed({
          batchStore: batchRuntime.store,
          jobStore: migrationRuntime.store,
          createdBy: userId,
        });

        const body: MigrationBatchSmokeTestSeedRouteResponse = {
          ok: true,
          adminOnly: true,
          durableOnly: true,
          seedOnly: true,
          externalExecutionBlocked: true,
          ...seed,
          store: {
            batch: {
              durable: batchRuntime.durable,
              storeKind: batchRuntime.storeKind,
            },
            jobs: {
              durable: migrationRuntime.durable,
              storeKind: migrationRuntime.storeKind,
            },
          },
        };

        return Response.json(body, { status: 200 });
      } catch (error) {
        const mapped = mapError(error);
        return Response.json(
          {
            ok: false,
            adminOnly: true,
            durableOnly: true,
            seedOnly: true,
            externalExecutionBlocked: true,
            error: mapped.message,
          },
          { status: mapped.status },
        );
      }
    },
  };
}
