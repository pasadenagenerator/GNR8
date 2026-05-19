import assert from "node:assert/strict";
import test from "node:test";

import {
  createProviderControlPlaneDbReadinessReport,
  type ProviderControlPlaneDbReadinessReport,
} from "@/gnr8/runtime/providers/provider-control-plane-db-readiness";

function table(report: ProviderControlPlaneDbReadinessReport, tableName: string) {
  const match = report.tables.find((value) => value.tableName === tableName);
  assert.ok(match, `Expected table report for ${tableName}`);
  return match;
}

test("provider control-plane db readiness: all tables and required columns present => ready", () => {
  const report = createProviderControlPlaneDbReadinessReport({
    hasDatabaseUrl: true,
    tableSnapshots: [
      {
        tableName: "public.gnr8_runtime_provider_jobs",
        exists: true,
        columns: [
          "id",
          "site_id",
          "site_version_id",
          "provider_id",
          "environment",
          "operation_kind",
          "status",
          "intent_payload",
          "dry_run_payload",
          "result_payload",
          "error_payload",
          "correlation_key",
          "created_at",
          "updated_at",
        ],
      },
      {
        tableName: "public.gnr8_agency_provider_settings",
        exists: true,
        columns: [
          "id",
          "agency_id",
          "provider_id",
          "environment",
          "credential_reference",
          "enabled",
          "capabilities",
          "created_at",
          "updated_at",
        ],
      },
      {
        tableName: "public.gnr8_provider_credential_references",
        exists: true,
        columns: [
          "id",
          "agency_id",
          "provider_id",
          "reference_key",
          "environment",
          "credential_names",
          "enabled",
          "created_at",
          "updated_at",
        ],
      },
    ],
  });

  assert.equal(report.status, "ready");
  assert.deepEqual(report.warnings, []);
  assert.deepEqual(report.blockers, []);
  assert.equal(report.tables.length, 3);
});

test("provider control-plane db readiness: missing table => missing_tables", () => {
  const report = createProviderControlPlaneDbReadinessReport({
    hasDatabaseUrl: true,
    tableSnapshots: [
      {
        tableName: "public.gnr8_runtime_provider_jobs",
        exists: true,
        columns: ["id", "site_id", "site_version_id", "provider_id", "environment", "operation_kind", "status", "intent_payload", "dry_run_payload", "result_payload", "error_payload", "correlation_key", "created_at", "updated_at"],
      },
      {
        tableName: "public.gnr8_agency_provider_settings",
        exists: false,
        columns: [],
      },
      {
        tableName: "public.gnr8_provider_credential_references",
        exists: true,
        columns: ["id", "agency_id", "provider_id", "reference_key", "environment", "credential_names", "enabled", "created_at", "updated_at"],
      },
    ],
  });

  assert.equal(report.status, "missing_tables");
  assert.equal(report.warnings.includes("missing_table:public.gnr8_agency_provider_settings"), true);
  assert.deepEqual(report.blockers, []);
});

test("provider control-plane db readiness: missing required column => blocked", () => {
  const report = createProviderControlPlaneDbReadinessReport({
    hasDatabaseUrl: true,
    tableSnapshots: [
      {
        tableName: "public.gnr8_runtime_provider_jobs",
        exists: true,
        columns: ["id", "site_id", "site_version_id", "provider_id", "environment", "operation_kind", "status", "intent_payload", "dry_run_payload", "result_payload", "error_payload", "correlation_key", "created_at", "updated_at"],
      },
      {
        tableName: "public.gnr8_agency_provider_settings",
        exists: true,
        columns: ["id", "agency_id", "provider_id", "environment", "credential_reference", "enabled", "created_at", "updated_at"],
      },
      {
        tableName: "public.gnr8_provider_credential_references",
        exists: true,
        columns: ["id", "agency_id", "provider_id", "reference_key", "environment", "credential_names", "enabled", "created_at", "updated_at"],
      },
    ],
  });

  assert.equal(report.status, "blocked");
  assert.equal(
    report.blockers.includes("missing_required_columns:public.gnr8_agency_provider_settings:capabilities"),
    true,
  );
  assert.deepEqual(table(report, "public.gnr8_agency_provider_settings").missingColumns, ["capabilities"]);
});

test("provider control-plane db readiness: missing DATABASE_URL => blocked", () => {
  const report = createProviderControlPlaneDbReadinessReport({
    hasDatabaseUrl: false,
    tableSnapshots: [],
  });

  assert.equal(report.status, "blocked");
  assert.deepEqual(report.blockers, ["missing_database_url"]);
});

test("provider control-plane db readiness: stable ordering and correlation key", () => {
  const first = createProviderControlPlaneDbReadinessReport({
    hasDatabaseUrl: true,
    tableSnapshots: [
      {
        tableName: "public.gnr8_provider_credential_references",
        exists: true,
        columns: ["updated_at", "created_at", "enabled", "credential_names", "environment", "reference_key", "provider_id", "agency_id", "id"],
      },
      {
        tableName: "public.gnr8_runtime_provider_jobs",
        exists: true,
        columns: ["updated_at", "created_at", "correlation_key", "error_payload", "result_payload", "dry_run_payload", "intent_payload", "status", "operation_kind", "environment", "provider_id", "site_version_id", "site_id", "id"],
      },
      {
        tableName: "public.gnr8_agency_provider_settings",
        exists: true,
        columns: ["updated_at", "created_at", "capabilities", "enabled", "credential_reference", "environment", "provider_id", "agency_id", "id"],
      },
    ],
  });

  const second = createProviderControlPlaneDbReadinessReport({
    hasDatabaseUrl: true,
    tableSnapshots: [
      {
        tableName: "public.gnr8_agency_provider_settings",
        exists: true,
        columns: ["id", "agency_id", "provider_id", "environment", "credential_reference", "enabled", "capabilities", "created_at", "updated_at"],
      },
      {
        tableName: "public.gnr8_provider_credential_references",
        exists: true,
        columns: ["id", "agency_id", "provider_id", "reference_key", "environment", "credential_names", "enabled", "created_at", "updated_at"],
      },
      {
        tableName: "public.gnr8_runtime_provider_jobs",
        exists: true,
        columns: ["id", "site_id", "site_version_id", "provider_id", "environment", "operation_kind", "status", "intent_payload", "dry_run_payload", "result_payload", "error_payload", "correlation_key", "created_at", "updated_at"],
      },
    ],
  });

  assert.deepEqual(
    first.tables.map((entry) => entry.tableName),
    [
      "public.gnr8_agency_provider_settings",
      "public.gnr8_provider_credential_references",
      "public.gnr8_runtime_provider_jobs",
    ],
  );
  assert.deepEqual(first.tables, second.tables);
  assert.equal(first.correlationKey, second.correlationKey);
});
