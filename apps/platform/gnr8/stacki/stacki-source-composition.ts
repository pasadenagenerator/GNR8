import "server-only";
import { requirePublicOutputVersion } from "../output-adapters/public-output-access";
import { getSupabaseServiceRoleClient } from "../../src/supabase/service-role-server";
import { StackiDraftError, type StackiDraftScope } from "./stacki-draft-contract";
import { loadStackiSource } from "./stacki-source-loader";

/** Caller already authorized the selected version. Capture access is independent. */
export async function loadConfiguredStackiSource(scope: StackiDraftScope) {
  const client = getSupabaseServiceRoleClient();
  if (!client) throw new StackiDraftError(503, "STACKI_SOURCE_UNAVAILABLE");
  return loadStackiSource(scope, client, requirePublicOutputVersion);
}
