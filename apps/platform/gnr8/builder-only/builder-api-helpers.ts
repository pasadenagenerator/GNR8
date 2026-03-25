import type { NextRequest } from "next/server";
import { Pool } from "pg";

import { registerBuilderOnlyModule } from "@gnr8/builder-only/builder-boundary-guard";

registerBuilderOnlyModule(import.meta.url);

type BuilderPoolMode = "default" | "insecure_ssl";

const poolByMode = new Map<BuilderPoolMode, Pool>();

function createPool(mode: BuilderPoolMode): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  if (mode === "insecure_ssl") {
    return new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  }
  return new Pool({ connectionString });
}

export function getBuilderPool(mode: BuilderPoolMode = "default"): Pool {
  const existing = poolByMode.get(mode);
  if (existing) return existing;
  const created = createPool(mode);
  poolByMode.set(mode, created);
  return created;
}

export function requireInternalBuilderRequest(req: NextRequest): { actorUserId: string } {
  const key = req.headers.get("x-gnr8-internal-key") ?? "";
  const expected = process.env.BUILDER_INTERNAL_API_KEY ?? "";
  if (!expected) throw new Error("BUILDER_INTERNAL_API_KEY is not set");
  if (!key || key !== expected) throw new Error("Not authenticated (invalid internal key)");

  const actorUserId = (req.headers.get("x-actor-user-id") ?? "").trim();
  if (!actorUserId) throw new Error("Missing x-actor-user-id");
  return { actorUserId };
}

export async function requireBuilderMembership(input: {
  orgId: string;
  actorUserId: string;
  poolMode?: BuilderPoolMode;
}): Promise<boolean> {
  const client = await getBuilderPool(input.poolMode).connect();
  try {
    const res = await client.query(
      `
      select 1
      from public.memberships
      where org_id = $1::uuid
        and user_id = $2::uuid
      limit 1
      `,
      [input.orgId, input.actorUserId],
    );
    return Boolean(res.rows[0]);
  } finally {
    client.release();
  }
}
