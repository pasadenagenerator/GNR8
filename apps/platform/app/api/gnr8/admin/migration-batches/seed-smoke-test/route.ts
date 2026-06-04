import { createMigrationBatchSmokeTestSeedRouteHandlers } from "@/app/api/gnr8/admin/migration-batches/seed-smoke-test/seed-smoke-test-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const handlers = createMigrationBatchSmokeTestSeedRouteHandlers();

export const POST = handlers.POST;
