import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("candidate registry migration widens only the html route-map key check", async () => {
  const sql = await readFile(
    new URL("../../supabase/migrations/20261002120000_astro_candidate_multipage_routes.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /create or replace function public\.gnr8_astro_candidate_has_exact_keys/i);
  assert.match(sql, /when p_keys = array\['\/'\]::text\[\]/i);
  assert.match(sql, /p_value \? '\/'/i);
  assert.match(sql, /select pg_catalog\.count\(\*\)[\s\S]*from pg_catalog\.jsonb_object_keys\(p_value\)[\s\S]*between 1 and 64/i);
  assert.match(sql, /jsonb_typeof\(body\) <> 'string'/i);
  assert.doesNotMatch(sql, /create table|create bucket|alter table/i);
});
