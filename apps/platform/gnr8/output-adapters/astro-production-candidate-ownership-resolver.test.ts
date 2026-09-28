import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  AstroCandidateOwnershipResolutionError,
  SupabaseAstroCandidateOwnershipResolver,
  type AstroCandidateOwnershipReadClient,
  type AstroCandidateOwnershipQueryResult,
} from "./astro-production-candidate-ownership-resolver";

const VERSION_ID = "22222222-2222-4222-8222-222222222222";
const SECOND_VERSION_ID = "77777777-7777-4777-8777-777777777777";
const OWNERSHIP_SITE_ID = "33333333-3333-4333-8333-333333333333";
const ORGANIZATION_ID = "44444444-4444-4444-8444-444444444444";
const AGENCY_ID = "55555555-5555-4555-8555-555555555555";

test("resolver follows the exact version, runtime-site, first-class-site, organization, and agency chain", async () => {
  const client = new FakeOwnershipClient(validRows());
  const resolver = new SupabaseAstroCandidateOwnershipResolver(() => client);
  const scope = await resolver.resolve({ siteVersionId: VERSION_ID });

  assert.deepEqual(scope, {
    runtimeSiteId: "runtime-site-mvp14",
    siteVersionId: VERSION_ID,
    ownershipSiteId: OWNERSHIP_SITE_ID,
    organizationId: ORGANIZATION_ID,
    agencyId: AGENCY_ID,
  });
  assert.deepEqual(client.calls, [
    query("gnr8_runtime_site_versions", "id,site_id,ownership_site_id", VERSION_ID),
    query("gnr8_runtime_sites", "id", "runtime-site-mvp14"),
    query("sites", "id,org_id,agency_id", OWNERSHIP_SITE_ID),
    query("organizations", "id,agency_id", ORGANIZATION_ID),
    query("agencies", "id", AGENCY_ID),
  ]);
});

test("resolver rejects invalid selectors and runtime-site/version mismatches before returning scope", async () => {
  const client = new FakeOwnershipClient(validRows());
  const resolver = new SupabaseAstroCandidateOwnershipResolver(() => client);
  await assert.rejects(
    () => resolver.resolve({ siteVersionId: "not-a-uuid" }),
    resolutionError("identity_invalid"),
  );
  assert.equal(client.calls.length, 0);
  await assert.rejects(
    () => resolver.resolve({ siteVersionId: VERSION_ID, expectedRuntimeSiteId: "another-runtime-site" }),
    resolutionError("ownership_mismatch"),
  );
});

test("resolver fails closed for missing, null, mismatched, and inconsistent authoritative relationships", async (t) => {
  const scenarios: Array<{
    name: string;
    mutate: (rows: RowMap) => void;
    code: AstroCandidateOwnershipResolutionError["code"];
  }> = [
    {
      name: "missing runtime version",
      mutate: (rows) => rows.delete(key("gnr8_runtime_site_versions", VERSION_ID)),
      code: "not_found",
    },
    {
      name: "null first-class ownership link",
      mutate: (rows) => rows.set(key("gnr8_runtime_site_versions", VERSION_ID), [{
        id: VERSION_ID, site_id: "runtime-site-mvp14", ownership_site_id: null,
      }]),
      code: "ownership_incomplete",
    },
    {
      name: "missing runtime site",
      mutate: (rows) => rows.delete(key("gnr8_runtime_sites", "runtime-site-mvp14")),
      code: "ownership_incomplete",
    },
    {
      name: "missing first-class site",
      mutate: (rows) => rows.delete(key("sites", OWNERSHIP_SITE_ID)),
      code: "ownership_incomplete",
    },
    {
      name: "missing organization",
      mutate: (rows) => rows.delete(key("organizations", ORGANIZATION_ID)),
      code: "ownership_incomplete",
    },
    {
      name: "missing agency",
      mutate: (rows) => rows.delete(key("agencies", AGENCY_ID)),
      code: "ownership_incomplete",
    },
    {
      name: "organization agency mismatch",
      mutate: (rows) => rows.set(key("organizations", ORGANIZATION_ID), [{
        id: ORGANIZATION_ID, agency_id: "88888888-8888-4888-8888-888888888888",
      }]),
      code: "ownership_mismatch",
    },
    {
      name: "runtime version result mismatch",
      mutate: (rows) => rows.set(key("gnr8_runtime_site_versions", VERSION_ID), [{
        id: SECOND_VERSION_ID, site_id: "runtime-site-mvp14", ownership_site_id: OWNERSHIP_SITE_ID,
      }]),
      code: "ownership_mismatch",
    },
  ];

  for (const scenario of scenarios) {
    await t.test(scenario.name, async () => {
      const rows = validRows();
      scenario.mutate(rows);
      const resolver = new SupabaseAstroCandidateOwnershipResolver(() => new FakeOwnershipClient(rows));
      await assert.rejects(() => resolver.resolve({ siteVersionId: VERSION_ID }), resolutionError(scenario.code));
    });
  }
});

test("resolver rejects duplicate rows, malformed shapes, query errors, and unavailable clients", async () => {
  const duplicateRows = validRows();
  duplicateRows.set(key("gnr8_runtime_site_versions", VERSION_ID), [
    { id: VERSION_ID, site_id: "runtime-site-mvp14", ownership_site_id: OWNERSHIP_SITE_ID },
    { id: VERSION_ID, site_id: "runtime-site-other", ownership_site_id: OWNERSHIP_SITE_ID },
  ]);
  await assert.rejects(
    () => new SupabaseAstroCandidateOwnershipResolver(
      () => new FakeOwnershipClient(duplicateRows),
    ).resolve({ siteVersionId: VERSION_ID }),
    resolutionError("schema_incompatible"),
  );

  const malformed = new FakeOwnershipClient(validRows(), async () => ({ data: { unexpected: true }, error: null }));
  await assert.rejects(
    () => new SupabaseAstroCandidateOwnershipResolver(() => malformed).resolve({ siteVersionId: VERSION_ID }),
    resolutionError("schema_incompatible"),
  );

  const failed = new FakeOwnershipClient(validRows(), async () => ({
    data: null,
    error: { message: "secret relation and credential detail" },
  }));
  await assert.rejects(
    () => new SupabaseAstroCandidateOwnershipResolver(() => failed).resolve({ siteVersionId: VERSION_ID }),
    (error: unknown) => resolutionError("unavailable")(error) && !String(error).includes("secret relation"),
  );
  await assert.rejects(
    () => new SupabaseAstroCandidateOwnershipResolver(() => null).resolve({ siteVersionId: VERSION_ID }),
    resolutionError("unavailable"),
  );
  await assert.rejects(
    () => new SupabaseAstroCandidateOwnershipResolver(() => { throw new Error("secret client setup"); })
      .resolve({ siteVersionId: VERSION_ID }),
    resolutionError("unavailable"),
  );
});

test("concurrent ownership requests do not share selectors or results", async () => {
  const rows = validRows();
  rows.set(key("gnr8_runtime_site_versions", SECOND_VERSION_ID), [{
    id: SECOND_VERSION_ID,
    site_id: "runtime-site-second",
    ownership_site_id: OWNERSHIP_SITE_ID,
  }]);
  rows.set(key("gnr8_runtime_sites", "runtime-site-second"), [{ id: "runtime-site-second" }]);
  const client = new FakeOwnershipClient(rows, async (call, defaultResult) => {
    if (call.value === VERSION_ID) await new Promise((resolve) => setTimeout(resolve, 5));
    return defaultResult;
  });
  const resolver = new SupabaseAstroCandidateOwnershipResolver(() => client);
  const [first, second] = await Promise.all([
    resolver.resolve({ siteVersionId: VERSION_ID }),
    resolver.resolve({ siteVersionId: SECOND_VERSION_ID }),
  ]);
  assert.equal(first.runtimeSiteId, "runtime-site-mvp14");
  assert.equal(second.runtimeSiteId, "runtime-site-second");
  assert.equal(first.siteVersionId, VERSION_ID);
  assert.equal(second.siteVersionId, SECOND_VERSION_ID);
});

test("resolver is server-only, read-only, bounded, auth-independent, and has no fallback ownership inference", () => {
  let clientAcquisitions = 0;
  new SupabaseAstroCandidateOwnershipResolver(() => {
    clientAcquisitions += 1;
    throw new Error("must not run during construction");
  });
  assert.equal(clientAcquisitions, 0);
  const source = readFileSync(new URL("./astro-production-candidate-ownership-resolver.ts", import.meta.url), "utf8");
  assert.match(source, /^import "server-only";/);
  assert.match(source, /\.limit\(2\)/);
  assert.equal(/\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.rpc\s*\(|\bpg\b|DATABASE_URL/.test(source), false);
  assert.equal(/memberships|is_home_agency|candidateMetadata|organizationId.*input|agencyId.*input/.test(source), false);
  assert.equal(/authenticate|requireSuperadminUserId/.test(source), false);
});

type QueryCall = {
  table: string;
  columns: string;
  column: string;
  value: string;
  limit: number;
};

type RowMap = Map<string, unknown[]>;

class FakeOwnershipClient implements AstroCandidateOwnershipReadClient {
  readonly calls: QueryCall[] = [];

  constructor(
    private readonly rows: RowMap,
    private readonly intercept?: (
      call: QueryCall,
      defaultResult: AstroCandidateOwnershipQueryResult,
    ) => Promise<AstroCandidateOwnershipQueryResult>,
  ) {}

  from(table: string) {
    return {
      select: (columns: string) => ({
        eq: (column: string, value: string) => ({
          limit: async (limit: number) => {
            const call = { table, columns, column, value, limit };
            this.calls.push(call);
            const defaultResult = {
              data: structuredClone(this.rows.get(key(table, value)) ?? []),
              error: null,
            };
            return this.intercept ? this.intercept(call, defaultResult) : defaultResult;
          },
        }),
      }),
    };
  }
}

function validRows(): RowMap {
  return new Map([
    [key("gnr8_runtime_site_versions", VERSION_ID), [{
      id: VERSION_ID,
      site_id: "runtime-site-mvp14",
      ownership_site_id: OWNERSHIP_SITE_ID,
    }]],
    [key("gnr8_runtime_sites", "runtime-site-mvp14"), [{ id: "runtime-site-mvp14" }]],
    [key("sites", OWNERSHIP_SITE_ID), [{
      id: OWNERSHIP_SITE_ID,
      org_id: ORGANIZATION_ID,
      agency_id: AGENCY_ID,
    }]],
    [key("organizations", ORGANIZATION_ID), [{ id: ORGANIZATION_ID, agency_id: AGENCY_ID }]],
    [key("agencies", AGENCY_ID), [{ id: AGENCY_ID }]],
  ]);
}

function key(table: string, value: string): string {
  return `${table}:${value}`;
}

function query(table: string, columns: string, value: string): QueryCall {
  return { table, columns, column: "id", value, limit: 2 };
}

function resolutionError(code: AstroCandidateOwnershipResolutionError["code"]) {
  return (error: unknown): boolean => (
    error instanceof AstroCandidateOwnershipResolutionError && error.code === code
  );
}
