import assert from "node:assert/strict";
import test from "node:test";

import { resolveAgencyIdForPreviewSiteVersion } from "@/app/api/gnr8/runtime/_lib/runtime-agency-scope";

const REQUESTED_VERSION_ID = "11111111-1111-4111-8111-111111111111";

function dbClientReturning(rows: Array<{ agency_id: string | null }>) {
  const calls: Array<{ sql: string; params: unknown[] | undefined }> = [];
  return {
    calls,
    dbClient: {
      query: async (sql: string, params?: unknown[]) => {
        calls.push({ sql, params });
        return { rows };
      },
    },
  };
}

test("preview agency scope resolver uses a read-only sibling ownership fallback", async () => {
  const { calls, dbClient } = dbClientReturning([{ agency_id: "agency-preview-1" }]);

  const agencyId = await resolveAgencyIdForPreviewSiteVersion(REQUESTED_VERSION_ID, { dbClient: dbClient as never });

  assert.equal(agencyId, "agency-preview-1");
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.params, [REQUESTED_VERSION_ID]);
  assert.match(calls[0]?.sql ?? "", /with requested_version/i);
  assert.match(calls[0]?.sql ?? "", /join public\.gnr8_runtime_site_versions sibling/i);
  assert.doesNotMatch(calls[0]?.sql ?? "", /\b(update|insert|delete|upsert|publish|rollback)\b/i);
});

test("preview agency scope resolver fails closed for invalid ids", async () => {
  const { calls, dbClient } = dbClientReturning([{ agency_id: "agency-preview-1" }]);

  const agencyId = await resolveAgencyIdForPreviewSiteVersion("not-a-version-id", { dbClient: dbClient as never });

  assert.equal(agencyId, null);
  assert.equal(calls.length, 0);
});
