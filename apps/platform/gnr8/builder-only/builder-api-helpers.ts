import type { NextRequest } from "next/server";

import { registerBuilderOnlyModule } from "@gnr8/builder-only/builder-boundary-guard";

registerBuilderOnlyModule(import.meta.url);

type BuilderPoolMode = "default" | "insecure_ssl";

function throwBuilderApiDecommissioned(): never {
  throw new Error("BUILDER_API_DECOMMISSIONED");
}

export function getBuilderPool(mode: BuilderPoolMode = "default"): never {
  void mode;
  return throwBuilderApiDecommissioned();
}

export function requireInternalBuilderRequest(req: NextRequest): never {
  void req;
  return throwBuilderApiDecommissioned();
}

export async function requireBuilderMembership(input: {
  orgId: string;
  actorUserId: string;
  poolMode?: BuilderPoolMode;
}): Promise<never> {
  void input;
  return throwBuilderApiDecommissioned();
}
