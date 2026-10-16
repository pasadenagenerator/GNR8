import assert from "node:assert/strict";
import test from "node:test";

import { RUNTIME_HOST_BINDING_BACKFILL_SQL } from "./runtime-host-binding-backfill";

test("legacy host backfill preserves an existing active binding and inserts missing duplicates as inactive", () => {
  assert.match(RUNTIME_HOST_BINDING_BACKFILL_SQL, /ranked\.host_rank = 1 and not exists/i);
  assert.match(RUNTIME_HOST_BINDING_BACKFILL_SQL, /lower\(existing\.host\) = ranked\.host/i);
  assert.match(RUNTIME_HOST_BINDING_BACKFILL_SQL, /existing\.status = 'ACTIVE'/i);
  assert.match(RUNTIME_HOST_BINDING_BACKFILL_SQL, /else 'INACTIVE'/i);
  assert.match(RUNTIME_HOST_BINDING_BACKFILL_SQL, /on conflict \(site_id, host\) do nothing/i);
});
