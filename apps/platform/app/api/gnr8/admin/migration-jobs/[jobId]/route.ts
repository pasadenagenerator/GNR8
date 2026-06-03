import { createMigrationJobsRouteHandlers } from "@/app/api/gnr8/admin/migration-jobs/migration-jobs-route-handlers";

export const runtime = "nodejs";

const handlers = createMigrationJobsRouteHandlers();

export const GET = handlers.GET;
