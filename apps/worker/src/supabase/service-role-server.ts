import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseServiceRoleClient(fetcher?: typeof fetch): SupabaseClient | null {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (supabaseUrl.length === 0 || serviceRoleKey.length === 0) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    ...(fetcher ? { global: { fetch: fetcher } } : {}),
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
