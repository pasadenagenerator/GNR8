import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { stableStringify } from "../runtime/deterministic";
import {
  ASTRO_PRODUCTION_CANDIDATE_ADAPTER_ID,
  ASTRO_PRODUCTION_CANDIDATE_LIFETIME,
  ASTRO_PRODUCTION_CANDIDATE_MAX_BYTES,
  ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND,
  ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION,
  ASTRO_PRODUCTION_CANDIDATE_STORAGE,
} from "./astro-production-candidate-record";
import {
  ASTRO_INTERNAL_PREVIEW_ASSET_MODE,
  ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND,
  ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION,
} from "./astro-static-site-internal-preview-bridge";
import { ASTRO_STATIC_EXPORT_MANIFEST_VERSION } from "./astro-static-site-build-export-proof";
import { RENDERER_COMPATIBILITY_VERSION } from "../runtime/types";

const REPO_ROOT = process.cwd().endsWith(`${path.sep}apps${path.sep}platform`)
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  "apps/platform/supabase/migrations/20260928120000_astro_candidate_registry.sql",
);
const PREREQUISITE_MIGRATION_PATH = path.join(
  REPO_ROOT,
  "apps/platform/supabase/migrations/20260928110000_astro_candidate_hosted_prerequisites.sql",
);
const TEST_ROOT = path.join(REPO_ROOT, "apps/platform/supabase/tests/astro_candidate_registry");
const READINESS_PATH = path.join(
  REPO_ROOT,
  "docs/product/gnr8-platform-mvp-12-astro-candidate-registry-migration-draft.md",
);

const sql = readFileSync(MIGRATION_PATH, "utf8");
const prerequisiteMigrationSql = readFileSync(PREREQUISITE_MIGRATION_PATH, "utf8");
const functionalSql = readFileSync(path.join(TEST_ROOT, "functional.sql"), "utf8");
const fixtureSql = readFileSync(path.join(TEST_ROOT, "fixture.sql"), "utf8");
const prerequisiteSql = readFileSync(path.join(TEST_ROOT, "prerequisite.sql"), "utf8");
const catalogSql = readFileSync(path.join(TEST_ROOT, "catalog.sql"), "utf8");
const localRunner = readFileSync(path.join(TEST_ROOT, "run-local-validation.ts"), "utf8");
const identicalSpec = readFileSync(path.join(TEST_ROOT, "registration_idempotency.spec"), "utf8");
const conflictSpec = readFileSync(path.join(TEST_ROOT, "registration_conflict.spec"), "utf8");
const readiness = readFileSync(READINESS_PATH, "utf8");

test("migration vocabulary stays aligned with the exact MVP 11 TypeScript contract", () => {
  const vocabulary = [
    ASTRO_PRODUCTION_CANDIDATE_SCHEMA_VERSION,
    ASTRO_PRODUCTION_CANDIDATE_RECORD_KIND,
    ASTRO_PRODUCTION_CANDIDATE_ADAPTER_ID,
    ASTRO_INTERNAL_PREVIEW_CANDIDATE_KIND,
    ASTRO_INTERNAL_PREVIEW_CONVERSION_VERSION,
    ASTRO_INTERNAL_PREVIEW_ASSET_MODE,
    ASTRO_STATIC_EXPORT_MANIFEST_VERSION,
    RENDERER_COMPATIBILITY_VERSION,
    ASTRO_PRODUCTION_CANDIDATE_STORAGE,
    ASTRO_PRODUCTION_CANDIDATE_LIFETIME,
  ];
  for (const value of vocabulary) assert.match(sql, new RegExp(escapeRegex(value)));
  assert.match(sql, /durableRegistration/);
  assert.match(sql, /'true'::jsonb/);

  for (const field of [
    "candidateId", "runtimeSiteId", "siteVersionId", "ownershipSiteId", "organizationId", "agencyId",
    "storedAt", "registeredByActorId", "producerKind", "producerVersion", "producerRef", "idempotencyKey",
    "correlationId", "contentSha256", "storageSha256", "payloadSizeBytes",
  ]) assert.match(sql, new RegExp(escapeRegex(field)));
});

test("migration maps every ownership field to the checked-in authoritative chain", () => {
  assert.match(sql, /runtime_site_id text not null\s+references public\.gnr8_runtime_sites\(id\) on delete restrict/i);
  assert.match(sql, /site_version_id uuid not null\s+references public\.gnr8_runtime_site_versions\(id\) on delete restrict/i);
  assert.match(sql, /ownership_site_id uuid not null\s+references public\.sites\(id\) on delete restrict/i);
  assert.match(sql, /organization_id uuid not null\s+references public\.organizations\(id\) on delete restrict/i);
  assert.match(sql, /agency_id uuid not null\s+references public\.agencies\(id\) on delete restrict/i);
  assert.match(sql, /sv\.site_id as runtime_site_id[\s\S]*sv\.ownership_site_id[\s\S]*s\.org_id as organization_id[\s\S]*o\.agency_id as organization_agency_id/i);
  assert.match(readiness, /original `organizations` table creation/);
  assert.match(readiness, /deployed shape or data/);
});

test("canonical UTF-8 bytes, hashes, and the inclusive limit are independently checked", () => {
  assert.equal(ASTRO_PRODUCTION_CANDIDATE_MAX_BYTES, 2_097_152);
  assert.match(sql, /payload_size_bytes integer generated always as\s+\(pg_catalog\.octet_length\(canonical_record_text\)\) stored/i);
  assert.match(sql, /payload_size_bytes between 1 and 2097152/i);
  assert.match(sql, /p_payload_size_bytes <> pg_catalog\.octet_length\(p_record_canonical_text\)/i);
  assert.match(sql, /gnr8_astro_candidate_sha256\(p_content_envelope_canonical_text\)/i);
  assert.match(sql, /gnr8_astro_candidate_sha256\(p_registration_intent_canonical_text\)/i);
  assert.match(sql, /gnr8_astro_candidate_sha256\(p_unsigned_record_canonical_text\)/i);

  const insertionOrdered = { z: "ž", a: { y: 2, b: 1 } };
  const canonical = stableStringify(insertionOrdered);
  assert.notEqual(canonical, JSON.stringify(insertionOrdered));
  assert.equal(canonical, '{"a":{"b":1,"y":2},"z":"ž"}');
  assert.equal(Buffer.byteLength("ž", "utf8"), 2);
  assert.equal(Buffer.byteLength("x".repeat(ASTRO_PRODUCTION_CANDIDATE_MAX_BYTES), "utf8"), 2_097_152);
  assert.match(readiness, /never treats `jsonb::text` as equivalent to `stableStringify`/);
  assert.match(functionalSql, /2097152[\s\S]*true/);
  assert.match(functionalSql, /2097153[\s\S]*true/);
});

test("registration and access RPCs preserve gateway outcomes and atomic locking shape", () => {
  for (const outcome of [
    "created", "idempotent", "conflicting_write", "ownership_mismatch",
    "found", "missing", "disabled", "version_conflict", "integrity_validation_failed",
  ]) assert.match(sql, new RegExp(`'${escapeRegex(outcome)}'`));
  assert.match(sql, /pg_advisory_xact_lock/g);
  assert.match(sql, /for update/g);
  assert.match(sql, /registration_intent_sha256 = p_registration_intent_sha256/);
  assert.match(sql, /source_access_version/);
  assert.match(sql, /v_validated_at < v_access\.changed_at/);
  assert.match(sql, /v_validated_at > v_occurred_at/);
  assert.match(sql, /insert into public\.gnr8_astro_candidate_records[\s\S]*insert into public\.gnr8_astro_candidate_access_states[\s\S]*insert into public\.gnr8_astro_candidate_access_events/);
});

test("records and events are protected while service-role access is RPC-only", () => {
  for (const table of ["records", "access_states", "access_events"]) {
    assert.match(sql, new RegExp(`alter table public\\.gnr8_astro_candidate_${table} enable row level security`, "i"));
    assert.match(sql, new RegExp(`alter table public\\.gnr8_astro_candidate_${table} force row level security`, "i"));
    assert.match(sql, new RegExp(`revoke all on table public\\.gnr8_astro_candidate_${table} from public, anon, authenticated, service_role`, "i"));
  }
  assert.match(sql, /astro_candidate_records_are_immutable/);
  assert.match(sql, /astro_candidate_access_events_are_append_only/);
  assert.match(sql, /security definer[\s\S]*set search_path = pg_catalog/);
  assert.doesNotMatch(sql, /\bexecute\s+(?:format|\$|')/i);
  for (const rpc of [
    "gnr8_register_astro_candidate",
    "gnr8_read_astro_candidate_for_scope",
    "gnr8_list_astro_candidate_metadata",
    "gnr8_set_astro_candidate_access",
  ]) assert.match(sql, new RegExp(`grant execute on function public\\.${rpc}`));
});

test("PL/pgSQL validation catches undeclared and duplicate local variables offline", () => {
  const bodies = [...sql.matchAll(/language plpgsql[\s\S]*?as \$\$([\s\S]*?)\$\$;/g)].map((match) => match[1]);
  assert.ok(bodies.length >= 6);
  for (const body of bodies) {
    const declaration = /^\s*declare\s+([\s\S]*?)\s+begin\b/i.exec(body)?.[1] ?? "";
    const declared = [...declaration.matchAll(/^\s*(v_[a-z0-9_]+)\s+/gim)].map((match) => match[1]);
    assert.equal(new Set(declared).size, declared.length, `duplicate PL/pgSQL variable in:\n${declaration}`);
    const used = new Set([...body.matchAll(/\b(v_[a-z0-9_]+)\b/gi)].map((match) => match[1]));
    for (const variable of used) {
      assert.ok(declared.includes(variable), `undeclared PL/pgSQL variable ${variable}`);
    }
  }
  assert.equal((sql.match(/\$\$/g) ?? []).length % 2, 0);
  assert.match(sql, /^begin;/m);
  assert.match(sql, /commit;\s*$/);
});

test("migration does not schema-qualify the COALESCE SQL special form", () => {
  assert.doesNotMatch(sql, /\bpg_catalog\.coalesce\s*\(/i);
  assert.match(sql, /\bselect coalesce\s*\(/i);
});

test("hosted compatibility package matches the observed ownership and extension boundary", () => {
  assert.match(prerequisiteSql, /create extension pgcrypto with schema extensions/i);
  assert.doesNotMatch(prerequisiteSql, /create table public\.(?:organizations|agencies|sites)/i);
  assert.match(prerequisiteMigrationSql, /create table public\.agencies/i);
  assert.match(prerequisiteMigrationSql, /create table public\.organizations/i);
  assert.match(prerequisiteMigrationSql, /create table public\.sites/i);
  assert.match(prerequisiteMigrationSql, /add column ownership_site_id uuid/i);
  assert.match(prerequisiteMigrationSql, /astro_candidate_prerequisite_object_collision/i);
  assert.doesNotMatch(prerequisiteMigrationSql, /insert into public\.(?:agencies|organizations|sites)/i);
  assert.doesNotMatch(prerequisiteMigrationSql, /update public\.(?:agencies|organizations|sites)/i);
  assert.match(sql, /extensions\.digest\(pg_catalog\.convert_to/i);
  assert.doesNotMatch(sql, /public\.digest\(/i);
});

test("executable database fixtures and local runner cover the required behavior", () => {
  for (const marker of [
    "atomic_registration_rows_failed",
    "idempotent_retry_failed",
    "candidate_conflict_failed",
    "idempotency_conflict_failed",
    "ownership_mismatch_failed",
    "atomic_failure_rollback_failed",
    "inclusive_multibyte_size_limit_failed",
    "over_limit_rejection_failed",
    "metadata_payload_redaction_failed",
    "disable_failed",
    "disabled_read_denial_failed",
    "access_version_conflict_failed",
    "reenable_hash_denial_failed",
    "reenable_version_binding_failed",
    "immutable_payload_changed_by_access_failed",
    "hash_size_or_ownership_persistence_failed",
    "registration_mutated_runtime_or_ownership_failed",
    "append_only_event_trigger_failed",
    "privilege_boundary_failed",
    "anon_direct_select_was_not_denied",
    "authenticated_direct_select_was_not_denied",
    "service_role_direct_insert_was_not_denied",
    "service_role_rpc_failed",
  ]) assert.match(functionalSql, new RegExp(marker));
  assert.match(fixtureSql, /p_multibyte_filler/);
  assert.match(prerequisiteSql, /not a replay of repository migration history/i);
  assert.match(prerequisiteSql, /create schema extensions/i);
  assert.match(catalogSql, /security_definer_or_search_path_failed/);
  assert.match(catalogSql, /hosted_default_privilege_fixture_missing/);
  assert.match(localRunner, /--pull=never/);
  assert.match(localRunner, /--diagnostic-correction/);
  assert.match(localRunner, /migrationRollbackObjectCount/);
  assert.match(identicalSpec, /pg_advisory_xact_lock|concurrent-identical|idempotent/s);
  assert.match(conflictSpec, /concurrent-conflict|different|conflicting_write/s);
  assert.match(readiness, /PREPARED BUT NOT RUN|prepared only/i);
  assert.match(readiness, /real transaction.*unverified/i);
});

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
