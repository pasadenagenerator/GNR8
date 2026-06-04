import { createReconcileImportedRuntimeRouteHandlers } from "@/app/api/gnr8/admin/hosting-operations/reconcile-imported-runtime/reconcile-imported-runtime-route-handlers";

const handlers = createReconcileImportedRuntimeRouteHandlers();

export const POST = handlers.POST;
