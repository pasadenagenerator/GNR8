import { createImportArtifactAuditRouteHandlers } from "@/app/api/gnr8/admin/import-artifact-audit/import-artifact-audit-route-handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = createImportArtifactAuditRouteHandlers();

export const GET = handlers.GET;
