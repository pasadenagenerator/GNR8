import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { materializeAstroInternalPreviewHtml, computeAstroInternalPreviewCandidateContentSha256 } from "./astro-static-site-internal-preview-bridge";
import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";
import { createAstroProductionCandidateId, type AstroProductionCandidateOwnership } from "./astro-production-candidate-record";
import {
  ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION,
  type AstroObjectBackedResolvedRecord,
} from "./astro-production-candidate-object-record";
import {
  AstroCandidateObjectStoreError,
  InMemoryAstroCandidateObjectStore,
  SupabaseAstroCandidateObjectStore,
} from "./astro-production-candidate-object-store";
import {
  AstroProductionCandidateRepositoryError,
  GatewayBackedAstroProductionCandidateRepository,
  InMemoryAstroProductionCandidateGateway,
} from "./astro-production-candidate-repository";

const CANDIDATE_ID = createAstroProductionCandidateId("88888888-8888-4888-8888-888888888888");
const OWNERSHIP: AstroProductionCandidateOwnership = {
  runtimeSiteId: "site-object-backed",
  siteVersionId: "22222222-2222-4222-8222-222222222222",
  ownershipSiteId: "33333333-3333-4333-8333-333333333333",
  organizationId: "44444444-4444-4444-8444-444444444444",
  agencyId: "55555555-5555-4555-8555-555555555555",
};

test("a multi-page candidate larger than the inline limit is stored, resolved, and rendered exactly", async () => {
  const gateway = new InMemoryAstroProductionCandidateGateway();
  const objectStore = new InMemoryAstroCandidateObjectStore();
  const repository = createRepository(gateway, objectStore);
  const input = createLargeInput();

  const created = await repository.create(input);
  assert.equal(created.record.schemaVersion, ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION);
  assert.ok(created.measurements.resolvedCandidateUtf8Bytes > 2 * 1024 * 1024);
  assert.ok(created.measurements.registryRecordUtf8Bytes < 2 * 1024 * 1024);
  assert.ok(created.measurements.objectPayloadUtf8Bytes > 2 * 1024 * 1024);
  const retry = await repository.create(input);
  assert.equal(retry.status, "idempotent");
  assert.equal(retry.record.storageSha256, created.record.storageSha256);

  const read = await repository.read({ candidateId: CANDIDATE_ID, trustedScope: OWNERSHIP });
  assert.equal(read.candidate.htmlByPath["/about"], input.candidate.htmlByPath["/about"]);
  assert.deepEqual(read.candidate.assetFingerprintMap, input.candidate.assetFingerprintMap);
  const rendered = materializeAstroInternalPreviewHtml({
    html: read.candidate.htmlByPath["/contact"],
    compiledTokenStyles: read.candidate.compiledTokenStyles,
  });
  assert.match(rendered, /data-gnr8-astro-compiled-styles/);
  assert.match(rendered, /--brand:#123456/);
  assert.match(rendered, /href="mailto:sales@chs\.si"/);
});

test("large shared CSS is retained as an immutable object and resolved before rendering", async () => {
  const gateway = new InMemoryAstroProductionCandidateGateway();
  const objectStore = new InMemoryAstroCandidateObjectStore();
  const repository = createRepository(gateway, objectStore);
  const input = createLargeStylesInput();

  const created = await repository.create(input);
  assert.ok(created.measurements.resolvedCandidateUtf8Bytes > 2 * 1024 * 1024);
  assert.ok(created.measurements.registryRecordUtf8Bytes < 2 * 1024 * 1024);
  const stylesObjectRef = (created.record as AstroObjectBackedResolvedRecord).stylesObjectRef;
  assert.ok(stylesObjectRef);
  assert.ok(stylesObjectRef.sizeBytes > 2 * 1024 * 1024);
  assert.equal(
    created.measurements.objectPayloadUtf8Bytes,
    Object.values((created.record as AstroObjectBackedResolvedRecord).objectManifest)
      .reduce((total, ref) => total + ref.sizeBytes, 0),
  );
  assert.equal(created.record.candidate.compiledTokenStyles, input.candidate.compiledTokenStyles);
  const rendered = materializeAstroInternalPreviewHtml({
    html: created.record.candidate.htmlByPath["/"],
    compiledTokenStyles: created.record.candidate.compiledTokenStyles,
  });
  assert.match(rendered, /--brand:#123456/);

  const retry = await repository.create(input);
  assert.equal(retry.status, "idempotent");
  assert.equal(retry.record.storageSha256, created.record.storageSha256);
});

test("missing or tampered immutable shared CSS fails closed", async (t) => {
  for (const mode of ["missing", "tampered"] as const) {
    await t.test(mode, async () => {
      const gateway = new InMemoryAstroProductionCandidateGateway();
      const objectStore = new InMemoryAstroCandidateObjectStore();
      const repository = createRepository(gateway, objectStore);
      const created = await repository.create(createLargeStylesInput());
      const ref = (created.record as AstroObjectBackedResolvedRecord).stylesObjectRef;
      assert.ok(ref);
      if (mode === "missing") objectStore.removeForTest(ref.key);
      else objectStore.tamperForTest(ref.key, Buffer.from("tampered", "utf8"));

      await assert.rejects(
        repository.read({ candidateId: CANDIDATE_ID, trustedScope: OWNERSHIP }),
        (error: unknown) => error instanceof AstroProductionCandidateRepositoryError && error.code === "corrupt",
      );
    });
  }
});

test("missing and tampered immutable route objects fail closed", async (t) => {
  for (const mode of ["missing", "tampered"] as const) {
    await t.test(mode, async () => {
      const gateway = new InMemoryAstroProductionCandidateGateway();
      const objectStore = new InMemoryAstroCandidateObjectStore();
      const repository = createRepository(gateway, objectStore);
      const created = await repository.create(createLargeInput());
      const ref = (created.record as AstroObjectBackedResolvedRecord).objectManifest["/about"];
      if (mode === "missing") objectStore.removeForTest(ref.key);
      else objectStore.tamperForTest(ref.key, Buffer.from("tampered", "utf8"));

      await assert.rejects(
        repository.read({ candidateId: CANDIDATE_ID, trustedScope: OWNERSHIP }),
        (error: unknown) => error instanceof AstroProductionCandidateRepositoryError && error.code === "corrupt",
      );
    });
  }
});

test("object-backed candidate read enforces authoritative ownership", async () => {
  const gateway = new InMemoryAstroProductionCandidateGateway();
  const objectStore = new InMemoryAstroCandidateObjectStore();
  const repository = createRepository(gateway, objectStore);
  await repository.create(createLargeInput());
  await assert.rejects(
    repository.read({
      candidateId: CANDIDATE_ID,
      trustedScope: { ...OWNERSHIP, organizationId: "99999999-9999-4999-8999-999999999999" },
    }),
    (error: unknown) => error instanceof AstroProductionCandidateRepositoryError && error.code === "ownership_mismatch",
  );
});

test("Supabase object writes never overwrite and verify ambiguous retries by bytes, MIME, and hash", async () => {
  const memory = new Map<string, Uint8Array>();
  const mediaTypes = new Map<string, string>();
  const uploadOptions: unknown[] = [];
  const bucketClient = {
    upload: async (key: string, bytes: Uint8Array, options: { contentType: string }) => {
      uploadOptions.push(options);
      if (memory.has(key)) return { data: null, error: { message: "already exists" } };
      memory.set(key, new Uint8Array(bytes));
      mediaTypes.set(key, options.contentType);
      return { data: { key }, error: null };
    },
    download: async (key: string) => {
      const bytes = memory.get(key);
      return bytes
        ? {
            data: new Blob([
              bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
            ], { type: "text/plain" }),
            error: null,
          }
        : { data: null, error: { message: "missing" } };
    },
    info: async (key: string) => {
      const contentType = mediaTypes.get(key);
      return contentType
        ? { data: { contentType }, error: null }
        : { data: null, error: { message: "missing" } };
    },
  };
  const store = new SupabaseAstroCandidateObjectStore({
    bucket: "astro-candidates-private",
    getClient: () => ({ storage: { from: () => bucketClient } }) as never,
  });
  const prepared = prepareForStoreTest();
  await store.putVerified(prepared);
  await store.putVerified(prepared);
  assert.deepEqual(uploadOptions, [
    { cacheControl: "31536000, immutable", contentType: "text/html; charset=utf-8", upsert: false },
    { cacheControl: "31536000, immutable", contentType: "text/html; charset=utf-8", upsert: false },
  ]);
  mediaTypes.set(prepared.ref.key, "application/octet-stream");
  await assert.rejects(
    store.readVerified(prepared.ref),
    (error: unknown) => error instanceof AstroCandidateObjectStoreError && error.code === "integrity_mismatch",
  );
  mediaTypes.set(prepared.ref.key, "text/html; charset=utf-8");
  memory.set(prepared.ref.key, Buffer.from("tampered", "utf8"));
  await assert.rejects(
    store.putVerified(prepared),
    (error: unknown) => error instanceof AstroCandidateObjectStoreError && error.code === "integrity_mismatch",
  );
});

function createRepository(
  gateway: InMemoryAstroProductionCandidateGateway,
  objectStore: InMemoryAstroCandidateObjectStore,
) {
  return new GatewayBackedAstroProductionCandidateRepository({
    gateway,
    objectStore,
    now: () => new Date("2026-10-12T10:00:00.000Z"),
  });
}

function createLargeInput() {
  const repeated = "Object-backed route content. ".repeat(43_000);
  const candidate = createSyntheticAstroInternalPreviewCandidate({
    candidateId: CANDIDATE_ID,
    siteId: OWNERSHIP.runtimeSiteId,
    siteVersionId: OWNERSHIP.siteVersionId,
    createdAt: "2026-10-12T09:00:00.000Z",
  });
  candidate.htmlByPath = {
    "/": html("Home", repeated, '<a href="/about">About</a>'),
    "/about": html("About", repeated, '<a href="/contact">Contact</a>'),
    "/contact": html("Contact", repeated, '<a href="mailto:sales@chs.si">Email CHS</a>'),
  };
  candidate.compiledTokenStyles = ":root{--brand:#123456}.hero{color:var(--brand)}";
  candidate.assetFingerprintMap = {
    "/api/gnr8/runtime/preview-assets/site-object-backed/hero.webp": "e".repeat(64),
  };
  candidate.contentSha256 = computeAstroInternalPreviewCandidateContentSha256(candidate);
  candidate.manifest.provenance.convertedArtifactSha256 = candidate.contentSha256;
  return {
    candidate,
    trustedScope: OWNERSHIP,
    registration: {
      registeredByActorId: "actor:object-backed-test",
      producerKind: "source_backed_astro_generation",
      producerVersion: "source_backed_astro_generation:v1",
      producerRef: "capture:object-backed-test",
      idempotencyKey: "idem:object-backed-test",
      correlationId: "correlation:object-backed-test",
    },
  };
}

function createLargeStylesInput() {
  const candidate = createSyntheticAstroInternalPreviewCandidate({
    candidateId: CANDIDATE_ID,
    siteId: OWNERSHIP.runtimeSiteId,
    siteVersionId: OWNERSHIP.siteVersionId,
    createdAt: "2026-10-12T09:00:00.000Z",
  });
  candidate.htmlByPath = {
    "/": html("Home", "Object-backed shared styles.", '<a href="/about">About</a>'),
    "/about": html("About", "Object-backed shared styles.", '<a href="/">Home</a>'),
  };
  candidate.compiledTokenStyles = `/*${"x".repeat(2 * 1024 * 1024)}*/:root{--brand:#123456}`;
  candidate.contentSha256 = computeAstroInternalPreviewCandidateContentSha256(candidate);
  candidate.manifest.provenance.convertedArtifactSha256 = candidate.contentSha256;
  return {
    candidate,
    trustedScope: OWNERSHIP,
    registration: {
      registeredByActorId: "actor:object-backed-test",
      producerKind: "source_backed_astro_generation",
      producerVersion: "source_backed_astro_generation:v1",
      producerRef: "capture:object-backed-styles-test",
      idempotencyKey: "idem:object-backed-styles-test",
      correlationId: "correlation:object-backed-styles-test",
    },
  };
}

function html(title: string, content: string, link: string): string {
  return `<!doctype html><html><head><title>${title}</title><style data-gnr8-astro-compiled-styles></style></head><body class="hero">${link}<main>${content}</main></body></html>`;
}

function prepareForStoreTest() {
  const bytes = Buffer.from("<!doctype html><html><body>Stored</body></html>", "utf8");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return {
    ref: {
      routePath: "/",
      bucket: "astro-candidates-private",
      key: `candidate-v3/test/${sha256}.html`,
      sha256,
      sizeBytes: bytes.byteLength,
      mediaType: "text/html; charset=utf-8" as const,
    },
    bytes,
  };
}
