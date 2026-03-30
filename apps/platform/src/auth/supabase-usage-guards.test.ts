import assert from "node:assert/strict";
import test from "node:test";

import { assertNoCookieMutationPath } from "@/src/auth/supabase-usage-guards";

test("assertNoCookieMutationPath does not throw when strict guard is disabled", () => {
  const previous = process.env.GNR8_STRICT_SUPABASE_COOKIE_GUARD;
  delete process.env.GNR8_STRICT_SUPABASE_COOKIE_GUARD;

  assert.doesNotThrow(() => {
    assertNoCookieMutationPath({
      helperName: "getSupabaseServerClientReadOnly",
      cookiesToSet: [
        {
          name: "sb-access-token",
          value: "token",
          options: {},
        },
      ],
    });
  });

  if (previous == null) {
    delete process.env.GNR8_STRICT_SUPABASE_COOKIE_GUARD;
  } else {
    process.env.GNR8_STRICT_SUPABASE_COOKIE_GUARD = previous;
  }
});

test("assertNoCookieMutationPath throws when strict guard is enabled and cookie mutation is attempted", () => {
  const previous = process.env.GNR8_STRICT_SUPABASE_COOKIE_GUARD;
  process.env.GNR8_STRICT_SUPABASE_COOKIE_GUARD = "1";

  assert.throws(() => {
    assertNoCookieMutationPath({
      helperName: "getSupabaseServerClientReadOnly",
      cookiesToSet: [
        {
          name: "sb-refresh-token",
          value: "token",
          options: {},
        },
      ],
    });
  });

  if (previous == null) {
    delete process.env.GNR8_STRICT_SUPABASE_COOKIE_GUARD;
  } else {
    process.env.GNR8_STRICT_SUPABASE_COOKIE_GUARD = previous;
  }
});

