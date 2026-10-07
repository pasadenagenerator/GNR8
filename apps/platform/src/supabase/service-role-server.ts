import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createBoundedPageReadFetch } from "@/src/auth/supabase-page-read-fetch";

export function getSupabaseServiceRoleClient(): SupabaseClient | null {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (supabaseUrl.length === 0 || serviceRoleKey.length === 0) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseServiceRolePageReadClient(): SupabaseClient | null {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (supabaseUrl.length === 0 || serviceRoleKey.length === 0) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: createBoundedPageReadFetch(),
    },
  });
}
