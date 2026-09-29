import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  deserializeAstroProductionCandidateRecord,
  serializeAstroProductionCandidateRecord,
} from "../../../gnr8/output-adapters/astro-production-candidate-record";
import { createTypeScriptRoundTripCases, type TypeScriptRoundTripCase } from "./typescript-roundtrip";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, "../../../../..");
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  "apps/platform/supabase/migrations/20260928120000_astro_candidate_registry.sql",
);
const PREREQUISITE_MIGRATION_PATH = path.join(
  REPO_ROOT,
  "apps/platform/supabase/migrations/20260928110000_astro_candidate_hosted_prerequisites.sql",
);
const IMAGE = "postgres:17";
const OWNER = "gnr8_mvp13_owner";
const CONTAINER_TEST_DIR = "/tmp/gnr8-mvp13";
const ISOLATION_TESTER = "/usr/lib/postgresql/17/lib/pgxs/src/test/isolation/isolationtester";
const allowDiagnosticCorrection = process.argv.includes("--diagnostic-correction");
const suffix = `${process.pid}-${randomUUID().slice(0, 8)}`;
const containerName = `gnr8-mvp13-${suffix}`;
const password = randomUUID();
let started = false;

function docker(args: string[], input?: string): string {
  if (input === undefined) {
    return execFileSync("docker", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    }).trim();
  }
  const result = spawnSync("docker", args, {
    input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error([result.stdout, result.stderr].filter(Boolean).join("\n").trim());
  }
  return result.stdout.trim();
}

function inContainer(args: string[], input?: string): string {
  return docker(["exec", ...(input === undefined ? [] : ["-i"]), containerName, ...args], input);
}

function psqlFile(database: string, file: string): string {
  return inContainer(["psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", OWNER, "-d", database, "-f", file]);
}

function psqlText(database: string, sql: string): string {
  return inContainer(
    ["psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", OWNER, "-d", database],
    sql,
  );
}

function psqlAt(database: string, sql: string): string {
  return inContainer(["psql", "-X", "-A", "-t", "-U", OWNER, "-d", database, "-c", sql]);
}

function createDatabase(database: string): void {
  inContainer([
    "createdb", "-U", OWNER, "--template=template0", "--encoding=UTF8", "--locale=C", database,
  ]);
}

function prepareDatabase(database: string, prerequisiteMigrationSql: string, migrationSql: string): void {
  createDatabase(database);
  psqlFile(database, `${CONTAINER_TEST_DIR}/prerequisite.sql`);
  psqlText(database, prerequisiteMigrationSql);
  psqlText(database, migrationSql);
}

function asBase64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function decodeSql(value: string): string {
  return `pg_catalog.convert_from(pg_catalog.decode('${asBase64(value)}', 'base64'), 'UTF8')`;
}

function registrationCall(testCase: TypeScriptRoundTripCase): string {
  return `public.gnr8_register_astro_candidate(
    ${decodeSql(testCase.recordText)},
    ${decodeSql(testCase.unsignedRecordText)},
    ${decodeSql(testCase.registrationIntentText)},
    ${decodeSql(testCase.contentEnvelopeText)},
    '${testCase.registrationIntentSha256}',
    ${testCase.payloadSizeBytes}
  )`;
}

function roundTripSql(
  created: TypeScriptRoundTripCase,
  retry: TypeScriptRoundTripCase,
): string {
  return `\\set ON_ERROR_STOP on
begin;
set local role service_role;
do $roundtrip$
declare
  v_result jsonb;
begin
  v_result := ${registrationCall(created)};
  if v_result->>'status' <> 'created' then
    raise exception 'typescript_roundtrip_create_failed';
  end if;
  v_result := ${registrationCall(retry)};
  if v_result->>'status' <> 'idempotent'
    or v_result#>>'{record,registration,storedAt}' <> '2026-09-28T10:30:00.000Z' then
    raise exception 'typescript_roundtrip_retry_failed';
  end if;
end;
$roundtrip$;
reset role;
commit;
`;
}

function waitUntilReady(): void {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      inContainer(["pg_isready", "-U", OWNER, "-d", "postgres"]);
      return;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    }
  }
  throw new Error("Disposable PostgreSQL did not become ready.");
}

function migrationRollbackObjectCount(database: string): string {
  return psqlAt(database, `
    select
      (select pg_catalog.count(*) from pg_catalog.pg_class
       where relnamespace = 'public'::pg_catalog.regnamespace
         and relname like 'gnr8_astro_candidate_%')::text
      || ':' ||
      (select pg_catalog.count(*) from pg_catalog.pg_proc
       where pronamespace = 'public'::pg_catalog.regnamespace
         and proname like 'gnr8%astro_candidate%')::text
  `);
}

function run(): void {
  docker(["image", "inspect", IMAGE]);
  docker([
    "run", "--pull=never", "--rm", "-d",
    "--name", containerName,
    "--label", "gnr8.task=mvp13-astro-registry-validation",
    "-e", "POSTGRES_DB=postgres",
    "-e", `POSTGRES_USER=${OWNER}`,
    "-e", `POSTGRES_PASSWORD=${password}`,
    "-e", "POSTGRES_INITDB_ARGS=--encoding=UTF8 --locale=C",
    "-p", "127.0.0.1::5432",
    IMAGE,
  ]);
  started = true;
  waitUntilReady();
  inContainer(["mkdir", "-p", CONTAINER_TEST_DIR]);
  docker(["cp", `${TEST_DIR}/.`, `${containerName}:${CONTAINER_TEST_DIR}`]);

  const publishedPort = docker(["port", containerName, "5432/tcp"]);
  const version = inContainer(["psql", "-X", "-A", "-t", "-U", OWNER, "-d", "postgres", "-c", "show server_version"]);
  console.log(`ENV postgres=${version} image=${IMAGE} endpoint=${publishedPort} encoding=UTF8 locale=C owner=${OWNER}`);
  console.log("PROVENANCE focused test-only prerequisite fixture; not full migration-history replay");

  const migrationSql = readFileSync(MIGRATION_PATH, "utf8");
  const prerequisiteMigrationSql = readFileSync(PREREQUISITE_MIGRATION_PATH, "utf8");
  const prerequisiteMigrationSha256 = createHash("sha256")
    .update(prerequisiteMigrationSql, "utf8")
    .digest("hex");
  const migrationSha256 = createHash("sha256").update(migrationSql, "utf8").digest("hex");
  console.log(`PREREQUISITE_MIGRATION sha256=${prerequisiteMigrationSha256} source=${PREREQUISITE_MIGRATION_PATH}`);
  console.log(`MIGRATION sha256=${migrationSha256} source=${MIGRATION_PATH} diagnosticCorrection=${allowDiagnosticCorrection}`);
  const actualDatabase = "gnr8_mvp13_actual";
  createDatabase(actualDatabase);
  psqlFile(actualDatabase, `${CONTAINER_TEST_DIR}/prerequisite.sql`);
  psqlText(actualDatabase, prerequisiteMigrationSql);

  let executableMigration = migrationSql;
  let actualMigrationPassed = true;
  try {
    psqlText(actualDatabase, migrationSql);
    console.log("PASS candidate migration applied as checked in");
  } catch (error) {
    actualMigrationPassed = false;
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("function pg_catalog.coalesce(boolean, boolean) does not exist")) throw error;
    assert.equal(migrationRollbackObjectCount(actualDatabase), "0:0");
    console.log("EXPECTED-FAIL candidate migration: pg_catalog.coalesce is not a PostgreSQL function");
    console.log("PASS failed migration transaction rollback left 0 candidate relations and 0 candidate functions");
    if (!allowDiagnosticCorrection) {
      throw new Error("Candidate migration failed as checked in. Re-run with --diagnostic-correction for supplemental validation only.");
    }
    const needle = "pg_catalog.coalesce(";
    assert.equal(migrationSql.split(needle).length - 1, 1);
    executableMigration = migrationSql.replace(needle, "coalesce(");
    console.log("DIAGNOSTIC applying exact in-memory pg_catalog.coalesce -> COALESCE correction; repository migration unchanged");
  }

  const functionalDatabase = "gnr8_mvp13_functional";
  prepareDatabase(functionalDatabase, prerequisiteMigrationSql, executableMigration);
  psqlFile(functionalDatabase, `${CONTAINER_TEST_DIR}/functional.sql`);
  console.log("PASS functional SQL: atomicity, limits, hashes, ownership, metadata, access, immutability, actual roles");

  const catalogOutput = psqlFile(functionalDatabase, `${CONTAINER_TEST_DIR}/catalog.sql`);
  console.log(`PASS catalog assertions\n${catalogOutput.split("\n").at(-2) ?? catalogOutput}`);

  for (const [database, spec] of [
    ["gnr8_mvp13_identical", "registration_idempotency.spec"],
    ["gnr8_mvp13_conflict", "registration_conflict.spec"],
  ] as const) {
    prepareDatabase(database, prerequisiteMigrationSql, executableMigration);
    psqlFile(database, `${CONTAINER_TEST_DIR}/fixture.sql`);
    const output = inContainer(
      [ISOLATION_TESTER, `dbname=${database} user=${OWNER}`],
      readFileSync(path.join(TEST_DIR, spec), "utf8"),
    );
    assert.match(output, /<waiting \.\.\.>/);
    assert.match(output, /<\.\.\. completed>/);
    console.log(`PASS isolationtester ${spec}: waiter blocked then completed after winner commit`);
  }

  const roundTripDatabase = "gnr8_mvp13_typescript";
  prepareDatabase(roundTripDatabase, prerequisiteMigrationSql, executableMigration);
  psqlFile(roundTripDatabase, `${CONTAINER_TEST_DIR}/fixture.sql`);
  const cases = createTypeScriptRoundTripCases();
  psqlText(roundTripDatabase, roundTripSql(cases.created, cases.retry));
  const storedBase64 = psqlAt(roundTripDatabase, `
    select pg_catalog.replace(
      pg_catalog.encode(pg_catalog.convert_to(canonical_record_text, 'UTF8'), 'base64'),
      E'\\n',
      ''
    )
    from public.gnr8_astro_candidate_records
    where candidate_id = 'astro_candidate_cccccccccccc4ccc8ccccccccccccccc'
  `);
  const storedText = Buffer.from(storedBase64, "base64").toString("utf8");
  const returnedRecord = deserializeAstroProductionCandidateRecord(storedText);
  assert.equal(storedText, cases.created.recordText);
  assert.equal(serializeAstroProductionCandidateRecord(returnedRecord), cases.created.recordText);
  const roundTripEvidence = psqlAt(roundTripDatabase, `
    select pg_catalog.jsonb_build_object(
      'storedAt', stored_at_text,
      'payloadSizeBytes', payload_size_bytes,
      'contentSha256', content_sha256,
      'storageSha256', storage_sha256,
      'registrationIntentSha256', registration_intent_sha256
    )
    from public.gnr8_astro_candidate_records
    where candidate_id = 'astro_candidate_cccccccccccc4ccc8ccccccccccccccc'
  `);
  console.log(`PASS TypeScript -> PostgreSQL -> TypeScript canonical byte round-trip ${roundTripEvidence}`);
  console.log(actualMigrationPassed
    ? "RESULT locally validated"
    : "RESULT supplemental checks passed only with diagnostic correction; checked-in migration is not locally validated");
}

try {
  run();
} finally {
  if (started) {
    try {
      docker(["stop", "--timeout", "10", containerName]);
      console.log(`CLEANUP removed task-owned container ${containerName} and all disposable databases`);
    } catch (error) {
      console.error(`CLEANUP-FAIL ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
