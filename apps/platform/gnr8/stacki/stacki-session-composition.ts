import "server-only";
import { ASTRO_CANDIDATE_OBJECT_BUCKET_ENV } from "../output-adapters/astro-production-candidate-object-store";
import { getSupabaseServiceRoleClient } from "../../src/supabase/service-role-server";
import { authorizeConfiguredStackiPilot, createConfiguredStackiDraftRoutes } from "./stacki-draft-composition";
import { SupabaseStackiDraftStore } from "./stacki-draft-store";
import { StackiDraftError } from "./stacki-draft-contract";
import { StackiSessionStore } from "./stacki-session-store";
import { createStackiSessionRoutes } from "./stacki-session-routes";
import { VercelStackiProvider } from "./stacki-vercel-provider";

export function stackiSessionsConfigured() {
  return process.env.GNR8_STACKI_DRAFTS_ENABLED === "1" &&
    process.env.GNR8_STACKI_SESSIONS_ENABLED === "1" &&
    Boolean(process.env.GNR8_STACKI_RUNTIME_SNAPSHOT) &&
    Boolean(process.env.GNR8_STACKI_PILOT_USER_ID);
}
export function createConfiguredStackiSessionRoutes() {
  function storage() {
    const client = getSupabaseServiceRoleClient();
    if (!client) throw new StackiDraftError(503, "STACKI_DRAFT_STORAGE_UNAVAILABLE");
    return { client, bucket: process.env[ASTRO_CANDIDATE_OBJECT_BUCKET_ENV] ?? "" };
  }
  return createStackiSessionRoutes({
    enabled: stackiSessionsConfigured,
    authorize: authorizeConfiguredStackiPilot,
    drafts: () => { const { client, bucket } = storage(); return new SupabaseStackiDraftStore(client, bucket); },
    sessions: () => { const { client, bucket } = storage(); return new StackiSessionStore(client, bucket); },
    prepare: createConfiguredStackiDraftRoutes().PREPARE,
    provider: () => new VercelStackiProvider(process.env.GNR8_STACKI_RUNTIME_SNAPSHOT ?? ""),
  });
}
