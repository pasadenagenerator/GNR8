import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("ownership backfill activation does not use uuid max aggregation", async () => {
  const sourcePath = fileURLToPath(new URL("./ownership-backfill-activation.ts", import.meta.url));
  const source = await readFile(sourcePath, "utf8");

  assert.equal(/max\s*\(\s*ownership_site_id\s*\)/i.test(source), false);
  assert.equal(/max\s*\(\s*sv\.ownership_site_id\s*\)/i.test(source), false);

  assert.equal(source.includes("select distinct on (sv.site_id)"), true);
  assert.equal(source.includes("order by sv.site_id, sv.created_at desc, sv.id::text desc"), true);
  assert.equal(source.includes("select distinct on (site_id)"), true);
  assert.equal(source.includes("order by site_id, created_at desc, id::text desc"), true);
});
