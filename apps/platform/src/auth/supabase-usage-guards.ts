import type { CookieOptions } from "@supabase/ssr";

type CookieMutation = {
  name: string;
  value: string;
  options: CookieOptions;
};

/**
 * Page/render paths must stay cookie-mutation free.
 * By default this guard is non-breaking and only becomes strict when
 * GNR8_STRICT_SUPABASE_COOKIE_GUARD=1 is enabled.
 */
export function assertNoCookieMutationPath(input: {
  cookiesToSet: CookieMutation[];
  helperName: string;
}): void {
  if (input.cookiesToSet.length === 0) return;
  if (process.env.GNR8_STRICT_SUPABASE_COOKIE_GUARD !== "1") return;

  throw new Error(
    `${input.helperName} attempted cookie mutation in a read-only Supabase path. Use getSupabaseServerClientMutating() only in Server Actions/Route Handlers.`,
  );
}

