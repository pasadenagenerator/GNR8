import { createRequire } from "node:module";

import { AirshipOnlineBuilderPostgresRepository } from "./airship-online-builder-postgres-repository";
import {
  createAirshipOnlineBuilderInMemoryRepository,
  type AirshipOnlineBuilderRepositoryBoundary,
} from "./airship-online-builder-repository";
import type { AirshipOnlineBuilderSecurityLifecycleConfig } from "./airship-online-builder-security-lifecycle";

const require = createRequire(import.meta.url);

export type AirshipOnlineBuilderRepositoryMode = "in_memory_proof" | "durable_postgres";

export function resolveAirshipOnlineBuilderRepositoryModeFromEnv(): AirshipOnlineBuilderRepositoryMode {
  return process.env.GNR8_AIRSHIP_ONLINE_BUILDER_REPOSITORY === "postgres"
    ? "durable_postgres"
    : "in_memory_proof";
}

export function createConfiguredAirshipOnlineBuilderRepository(): AirshipOnlineBuilderRepositoryBoundary {
  if (resolveAirshipOnlineBuilderRepositoryModeFromEnv() !== "durable_postgres") {
    return createAirshipOnlineBuilderInMemoryRepository();
  }
  const { getSuperadminPool } = require("@/src/superadmin/db") as typeof import("@/src/superadmin/db");
  return new AirshipOnlineBuilderPostgresRepository(getSuperadminPool());
}

export function decorateAirshipOnlineBuilderSecurityLifecycleConfigFromEnv(
  config: AirshipOnlineBuilderSecurityLifecycleConfig | null | undefined,
): AirshipOnlineBuilderSecurityLifecycleConfig | null | undefined {
  if (resolveAirshipOnlineBuilderRepositoryModeFromEnv() !== "durable_postgres") return config;
  return {
    ...(config ?? {}),
    durableRepository: { configured: true, storage: "postgres_jsonb_records" },
  };
}
