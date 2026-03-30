import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { assertNoCookieMutationPath } from "@/src/auth/supabase-usage-guards";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function getSupabaseServerClientReadOnly() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  if (!supabaseAnon) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");

  return createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        assertNoCookieMutationPath({
          cookiesToSet,
          helperName: "getSupabaseServerClientReadOnly",
        });
      },
    },
  });
}

