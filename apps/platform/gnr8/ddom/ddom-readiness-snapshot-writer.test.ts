import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  DDOM_READINESS_STATES,
  DdomReadinessSnapshotIdempotencyConflictError,
  DdomReadinessSnapshotRepository,
  DdomReadinessSnapshotValidationError,
  DdomReadinessSnapshotWriter,
  buildDdomReadinessSnapshotInput,
  buildDdomSourceWatermark,
  createDdomReadinessSnapshot,
  type CreateDdomReadinessSnapshotInput,
  type DdomCanonicalSnapshotWrite,
  type DdomReadinessSnapshotRepositoryLike,
  type DdomSnapshotWriterClient,
} from "./ddom-readiness-snapshot-writer";

const SOURCE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "ddom-readiness-snapshot-writer.ts");
const UUIDS = {
  siteVersionId: "11111111-1111-4111-8111-111111111111",
  domainBindingId: "22222222-2222-4222-8222-222222222222",
  hostBindingId: "33333333-3333-4333-8333-333333333333",
};

function baseInput(overrides: Partial<CreateDdomReadinessSnapshotInput> = {}): CreateDdomReadinessSnapshotInput {
  return {
    tenantId: "tenant-ddom-unit",
    clientId: "client-ddom-unit",
    siteId: "site-ddom-unit",
    siteVersionId: UUIDS.siteVersionId,
    domainBindingId: UUIDS.domainBindingId,
    domain: "Example.COM",
    readinessState: "ready",
    readinessBlockers: [],
    readinessWarnings: [],
    freshnessState: "fresh",
    freshUntil: "2026-07-28T10:00:00.000Z",
    sourceWatermarkJson: { domainBinding: "binding-watermark-1" },
    snapshotJson: { canonical: { status: "ready" } },
    refs: [
      {
        refRole: "domain_binding",
        refType: "runtime_domain_host_binding",
        sourceTable: "gnr8_runtime_domain_host_bindings",
        sourceRecordId: UUIDS.domainBindingId,
        sourceWatermark: "binding-watermark-1",
        metadataJson: { status: "active" },
      },
    ],
    actorType: "system",
    actorId: "ddom-unit-test",
    correlationId: "corr-ddom-unit",
    idempotencyKey: "idem-ddom-unit",
    ...overrides,
  };
}

function captureRepository() {
  const writes: DdomCanonicalSnapshotWrite[] = [];
  const repository: DdomReadinessSnapshotRepositoryLike = {
    async createSnapshot(input) {
      writes.push(input);
      return {
        snapshotId: "snapshot-unit-1",
        sourceWatermark: input.row.source_watermark,
        reusedExisting: false,
        refIds: input.refs.map((_, index) => `ref-${index + 1}`),
      };
    },
  };
  return { repository, writes };
}

function assertValidation(fn: () => unknown): void {
  assert.throws(fn, (error) => error instanceof DdomReadinessSnapshotValidationError);
}

function idempotencyAwarePool() {
  const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
  const snapshots: Record<string, unknown>[] = [];
  const refs: Record<string, unknown>[] = [];
  let snapshotSeq = 0;
  let refSeq = 0;

  const client: DdomSnapshotWriterClient = {
    release() {},
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (/^\s*(begin|commit|rollback)\b/i.test(sql)) return { rows: [], rowCount: null };
      if (/insert into public\.gnr8_ddom_readiness_snapshots/i.test(sql)) {
        const idempotencyKey = values[23];
        if (snapshots.some((row) => row.idempotency_key === idempotencyKey)) return { rows: [], rowCount: 0 };
        snapshotSeq += 1;
        const row = {
          id: `00000000-0000-4000-8000-${String(snapshotSeq).padStart(12, "0")}`,
          tenant_id: values[0],
          client_id: values[1],
          site_id: values[2],
          ownership_site_id: values[3],
          site_version_id: values[4],
          domain_binding_id: values[5],
          host_binding_id: values[6],
          domain: values[7],
          internal_host: values[8],
          intended_launch_domain: values[9],
          readiness_state: values[10],
          readiness_blockers: JSON.parse(String(values[11])),
          readiness_warnings: JSON.parse(String(values[12])),
          freshness_state: values[13],
          fresh_until: values[14],
          stale_reason: values[15],
          source_watermark: values[16],
          source_watermark_json: JSON.parse(String(values[17])),
          snapshot_json: JSON.parse(String(values[18])),
          created_by_actor_type: values[19],
          created_by_actor_id: values[20],
          correlation_id: values[21],
          causation_id: values[22],
          idempotency_key: idempotencyKey,
          privacy_label: values[24],
          retention_class: values[25],
        };
        snapshots.push(row);
        return { rows: [row], rowCount: 1 };
      }
      if (/insert into public\.gnr8_ddom_readiness_snapshot_refs/i.test(sql)) {
        refSeq += 1;
        const row = {
          id: `ref-${refSeq}`,
          snapshot_id: values[0],
          ref_role: values[1],
          ref_type: values[2],
          source_system: values[3],
          source_table: values[4],
          source_record_id: values[5],
          source_version: values[6],
          source_watermark: values[7],
          captured_at: values[8],
          metadata_json: JSON.parse(String(values[9])),
        };
        refs.push(row);
        return { rows: [{ id: row.id }], rowCount: 1 };
      }
      if (/from public\.gnr8_ddom_readiness_snapshots/i.test(sql)) {
        const row = snapshots.find((candidate) => candidate.idempotency_key === values[0]);
        return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
      }
      if (/from public\.gnr8_ddom_readiness_snapshot_refs/i.test(sql)) {
        const rows = refs.filter((ref) => ref.snapshot_id === values[0]);
        return { rows, rowCount: rows.length };
      }
      throw new Error(`Unexpected SQL in DDOM unit fake: ${sql}`);
    },
  };

  return {
    calls,
    snapshots,
    refs,
    pool: {
      async connect() {
        return client;
      },
    },
  };
}

test("DDOM writer is server-only and exposes no provider/runtime mutation imports or update/delete helpers", () => {
  const source = fs.readFileSync(SOURCE_PATH, "utf8");
  assert.match(source, /^import "server-only";/);
  assert.doesNotMatch(source, /from\s+["'][^"']*(runtime-store|hosting-domain-recheck|vercel|openprovider|dns-provider|provider-execution|publish-|rollback|stripe|billing|ai_execution|worker)[^"']*["']/i);
  assert.doesNotMatch(source, /\b(checkDomainStatus|addDomainToVercel|vercelFetch|computeDomainDnsInstructions|openprovider|dnsLookup|resolveTxt|resolveCname)\b/i);
  assert.doesNotMatch(source, /\bupdate\s+public\.gnr8_/i);
  assert.doesNotMatch(source, /\bdelete\s+from\s+public\.gnr8_/i);
  assert.doesNotMatch(source, /\binsert\s+into\s+public\.(?!gnr8_ddom_readiness_snapshots|gnr8_ddom_readiness_snapshot_refs)/i);
});

test("valid snapshot input writes expected canonical payload through a repository", async () => {
  const { repository, writes } = captureRepository();
  const result = await createDdomReadinessSnapshot(baseInput(), repository);

  assert.equal(result.snapshotId, "snapshot-unit-1");
  assert.equal(result.reusedExisting, false);
  assert.equal(writes.length, 1);
  assert.equal(writes[0]?.row.tenant_id, "tenant-ddom-unit");
  assert.equal(writes[0]?.row.domain, "example.com");
  assert.equal(writes[0]?.row.privacy_label, "client_confidential");
  assert.equal(writes[0]?.refs.length, 1);
  assert.equal(writes[0]?.refs[0]?.source_system, "gnr8");
});

test("source watermark is stable, excludes volatile caller fields, and changes with canonical source state", () => {
  const first = buildDdomSourceWatermark(baseInput({ actorId: "actor-a", correlationId: "corr-a", idempotencyKey: "idem-a" }));
  const retry = buildDdomSourceWatermark(baseInput({ actorId: "actor-b", correlationId: "corr-b", idempotencyKey: "idem-b" }));
  const changed = buildDdomSourceWatermark(baseInput({ snapshotJson: { canonical: { status: "blocked" } } }));

  assert.equal(first, retry);
  assert.notEqual(first, changed);
});

test("explicit source watermark is accepted and payload hash is retained in source watermark json", async () => {
  const { repository, writes } = captureRepository();
  const result = await createDdomReadinessSnapshot(baseInput({ sourceWatermark: "external-watermark-1" }), repository);
  assert.equal(result.sourceWatermark, "external-watermark-1");
  assert.equal(writes[0]?.row.source_watermark, "external-watermark-1");
  assert.match(String((writes[0]?.row.source_watermark_json as Record<string, unknown>)._ddomWriterPayloadHash), /^sha256:/);
});

test("invalid readiness, freshness, actor, privacy, retention, and JSON shape are rejected before DB write", async () => {
  const { repository, writes } = captureRepository();
  const writer = new DdomReadinessSnapshotWriter(repository);

  await assert.rejects(() => writer.createDdomReadinessSnapshot(baseInput({ readinessState: "almost_ready" as never })), DdomReadinessSnapshotValidationError);
  await assert.rejects(() => writer.createDdomReadinessSnapshot(baseInput({ freshnessState: "expired" as never })), DdomReadinessSnapshotValidationError);
  await assert.rejects(() => writer.createDdomReadinessSnapshot(baseInput({ actorType: "robot" as never })), DdomReadinessSnapshotValidationError);
  await assert.rejects(() => writer.createDdomReadinessSnapshot(baseInput({ privacyLabel: "private" as never })), DdomReadinessSnapshotValidationError);
  await assert.rejects(() => writer.createDdomReadinessSnapshot(baseInput({ retentionClass: "forever" as never })), DdomReadinessSnapshotValidationError);
  await assert.rejects(() => writer.createDdomReadinessSnapshot(baseInput({ sourceWatermarkJson: [] as never })), DdomReadinessSnapshotValidationError);
  await assert.rejects(() => writer.createDdomReadinessSnapshot(baseInput({ refs: [{ ...baseInput().refs[0]!, metadataJson: [] as never }] })), DdomReadinessSnapshotValidationError);

  assert.equal(writes.length, 0);
});

test("missing domain or host intent is rejected unless not_applicable", async () => {
  assertValidation(() =>
    buildDdomSourceWatermark(
      baseInput({
        domain: null,
        internalHost: null,
        intendedLaunchDomain: null,
        domainBindingId: null,
        hostBindingId: null,
      }),
    ),
  );

  const notApplicable = buildDdomSourceWatermark(
    baseInput({
      readinessState: "not_applicable",
      domain: null,
      internalHost: null,
      intendedLaunchDomain: null,
      domainBindingId: null,
      hostBindingId: null,
      refs: [],
    }),
  );
  assert.match(notApplicable, /^sha256:/);
});

test("duplicate identical refs are deduped while duplicate drift is rejected", async () => {
  const duplicateRef = baseInput().refs[0]!;
  const { repository, writes } = captureRepository();
  await createDdomReadinessSnapshot(baseInput({ refs: [duplicateRef, duplicateRef] }), repository);
  assert.equal(writes[0]?.refs.length, 1);

  await assert.rejects(
    () =>
      createDdomReadinessSnapshot(
        baseInput({
          refs: [duplicateRef, { ...duplicateRef, metadataJson: { status: "changed" } }],
          idempotencyKey: "idem-duplicate-ref-drift",
        }),
        repository,
      ),
    DdomReadinessSnapshotValidationError,
  );
});

test("same idempotency key and same semantic payload reuses safely; drift conflicts fail closed", async () => {
  const { pool } = idempotencyAwarePool();
  const repository = new DdomReadinessSnapshotRepository(pool);
  const writer = new DdomReadinessSnapshotWriter(repository);

  const first = await writer.createDdomReadinessSnapshot(baseInput({ idempotencyKey: "idem-reuse" }));
  const second = await writer.createDdomReadinessSnapshot(baseInput({ idempotencyKey: "idem-reuse" }));
  assert.equal(first.snapshotId, second.snapshotId);
  assert.equal(second.reusedExisting, true);

  await assert.rejects(
    () =>
      writer.createDdomReadinessSnapshot(
        baseInput({
          idempotencyKey: "idem-reuse",
          readinessWarnings: ["new_warning"],
        }),
      ),
    (error) =>
      error instanceof DdomReadinessSnapshotIdempotencyConflictError &&
      error.driftedFields.includes("snapshot_payload"),
  );
});

test("all DDOM readiness states can be canonicalized through the writer", async () => {
  const { repository, writes } = captureRepository();
  const writer = new DdomReadinessSnapshotWriter(repository);
  for (const readinessState of DDOM_READINESS_STATES) {
    await writer.createDdomReadinessSnapshot(
      baseInput({
        readinessState,
        readinessBlockers: readinessState === "blocked" || readinessState === "stale" ? ["domain_blocker"] : [],
        freshnessState: readinessState === "stale" ? "stale" : "fresh",
        idempotencyKey: `idem-${readinessState}`,
      }),
    );
  }
  assert.deepEqual(
    writes.map((write) => write.row.readiness_state),
    DDOM_READINESS_STATES,
  );
});

test("pure domain-binding transform maps already-read state without querying or calling providers", () => {
  const input = buildDdomReadinessSnapshotInput({
    tenantId: "tenant-ddom-unit",
    clientId: "client-ddom-unit",
    siteId: "site-ddom-unit",
    siteVersionId: UUIDS.siteVersionId,
    readinessBlockers: [],
    readinessWarnings: [],
    actorType: "system",
    actorId: "ddom-unit-test",
    correlationId: "corr-domain-binding-transform",
    idempotencyKey: "idem-domain-binding-transform",
    domainBinding: {
      id: UUIDS.domainBindingId,
      domain: "Launch.Example.COM",
      status: "active",
      dnsRecordType: "cname",
      dnsRecordPurpose: "routing",
      dnsRecordValue: "cname.vercel-dns.com",
      dnsInstructions: [{ type: "cname", host: "www", value: "cname.vercel-dns.com", purpose: "routing", source: "vercel" }],
      vercelDomainId: "vercel-domain-1",
      lastCheckedAt: "2026-07-27T08:00:00.000Z",
      updatedAt: "2026-07-27T08:01:00.000Z",
    },
  });

  assert.equal(input.domain, "launch.example.com");
  assert.equal(input.readinessState, "ready");
  assert.ok(input.refs.some((ref) => ref.refRole === "domain_binding"));
  assert.ok(input.refs.some((ref) => ref.refRole === "vercel_snapshot"));
  assert.ok(input.refs.some((ref) => ref.refRole === "dns_instruction_snapshot"));
});
