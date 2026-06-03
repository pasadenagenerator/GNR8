import { createMigrationBatchesRouteHandlers } from "@/app/api/gnr8/admin/migration-batches/migration-batches-route-handlers";

export const runtime = "nodejs";

const handlers = createMigrationBatchesRouteHandlers();

export const GET = handlers.GET;
