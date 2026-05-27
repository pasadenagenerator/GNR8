import { createOpenproviderSandboxRegisterDomainProbeRouteHandlers } from "@/app/api/gnr8/admin/providers/openprovider/sandbox/register-domain-probe/openprovider-sandbox-register-domain-probe-route-handlers";

const handlers = createOpenproviderSandboxRegisterDomainProbeRouteHandlers();

export const POST = handlers.POST;
