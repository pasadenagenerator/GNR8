import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  renderSiteVersionPreview,
  setUnifiedRenderPreviewDependenciesForTest,
} from "../runtime/unified-render-preview";
import {
  ASTRO_PERSISTED_CANDIDATE_RECORD_KIND,
  ASTRO_PERSISTED_CANDIDATE_SCHEMA_VERSION,
  AstroCandidateRepositoryError,
  LocalFilesystemAstroInternalPreviewCandidateRepository,
  astroCandidateStorageKey,
} from "./astro-internal-preview-candidate-repository";
import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";
import { isAstroInternalPreviewCandidate } from "./astro-static-site-internal-preview-bridge";

const SITE_ID = "site-persistence-proof";
const SITE_VERSION_ID = "sv-persistence-proof";
const CANDIDATE_ID = "candidate-persistence-proof";

test("persistence proof command remains inert when imported", async () => {
  const entrypoint = await import("./run-astro-candidate-persistence-proof");
  assert.equal(typeof entrypoint.main, "function");
});

test("repository round-trips a self-contained candidate through an independent reader", async () => {
  await withStorageRoot(async (storageRoot) => {
    const candidate = createSyntheticAstroInternalPreviewCandidate();
    assert.equal(candidate.manifest.lifecycle.storage, "caller_owned_in_memory");
    const writer = repository(storageRoot, "2026-09-27T10:00:00.000Z");
    const created = await writer.create(candidate);
    assert.equal(created.status, "created");
    assert.equal(created.record.schemaVersion, ASTRO_PERSISTED_CANDIDATE_SCHEMA_VERSION);
    assert.equal(created.record.recordKind, ASTRO_PERSISTED_CANDIDATE_RECORD_KIND);
    assert.equal(created.record.candidate.manifest.lifecycle.storage, "isolated_local_filesystem");
    assert.equal(created.record.candidate.manifest.lifecycle.lifetime, "proof_retained_until_explicit_cleanup");
    assert.equal(created.record.candidate.contentSha256, candidate.contentSha256);
    assert.match(created.record.storageSha256, /^[0-9a-f]{64}$/);

    const independentReader = repository(storageRoot, "2030-01-01T00:00:00.000Z");
    const reloaded = await independentReader.read(identity());
    assert.deepEqual(reloaded, created.record);
    assert.equal(isAstroInternalPreviewCandidate(reloaded.candidate), true);
    assert.match(reloaded.candidate.htmlByPath["/"], /Persistence survives process exit/);
    assert.match(reloaded.candidate.htmlByPath["/"], /<style>/);
  });
});

test("immutable create is idempotent for identical retries and rejects conflicts", async () => {
  await withStorageRoot(async (storageRoot) => {
    const first = await repository(storageRoot, "2026-09-27T10:00:00.000Z").create(createSyntheticAstroInternalPreviewCandidate());
    const retry = await repository(storageRoot, "2026-09-27T11:00:00.000Z").create(createSyntheticAstroInternalPreviewCandidate());
    assert.equal(first.status, "created");
    assert.equal(retry.status, "idempotent");
    assert.deepEqual(retry.record, first.record);

    await assert.rejects(
      () => repository(storageRoot).create(createSyntheticAstroInternalPreviewCandidate({ html: "<!doctype html><html><body>conflict</body></html>" })),
      isRepositoryError("conflicting_write"),
    );
    await assert.rejects(
      () => repository(storageRoot).create(createSyntheticAstroInternalPreviewCandidate({ siteId: "site-conflicting-owner" })),
      isRepositoryError("conflicting_write"),
    );
    const preserved = await repository(storageRoot).read(identity());
    assert.equal(preserved.candidate.contentSha256, first.record.candidate.contentSha256);
  });
});

test("concurrent conflicting creates publish exactly one complete immutable record", async () => {
  await withStorageRoot(async (storageRoot) => {
    const candidateA = createSyntheticAstroInternalPreviewCandidate({ html: "<!doctype html><html><body>candidate A</body></html>" });
    const candidateB = createSyntheticAstroInternalPreviewCandidate({ html: "<!doctype html><html><body>candidate B</body></html>" });
    const attempts = await Promise.allSettled([
      repository(storageRoot).create(candidateA),
      repository(storageRoot).create(candidateB),
    ]);
    assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
    const rejection = attempts.find((attempt): attempt is PromiseRejectedResult => attempt.status === "rejected");
    assert.equal(isRepositoryError("conflicting_write")(rejection?.reason), true);

    const record = await repository(storageRoot).read(identity());
    assert.equal(
      [candidateA.contentSha256, candidateB.contentSha256].includes(record.candidate.contentSha256),
      true,
    );
    assert.equal(isAstroInternalPreviewCandidate(record.candidate), true);
  });
});

test("read distinguishes missing, unsupported, corrupt, and ownership-mismatch outcomes", async (t) => {
  await t.test("missing", async () => {
    await withStorageRoot(async (storageRoot) => {
      await assert.rejects(() => repository(storageRoot).read(identity()), isRepositoryError("missing"));
    });
  });

  await t.test("malformed and truncated", async () => {
    for (const body of ["{not-json", '{"schemaVersion":"gnr8-astro-persisted-preview-candidate:v1"']) {
      await withStorageRoot(async (storageRoot) => {
        await repository(storageRoot).create(createSyntheticAstroInternalPreviewCandidate());
        await writeFile(recordPath(storageRoot, CANDIDATE_ID), body);
        await assert.rejects(() => repository(storageRoot).read(identity()), isRepositoryError("corrupt"));
      });
    }
  });

  await t.test("unsupported version", async () => {
    await withStorageRoot(async (storageRoot) => {
      await repository(storageRoot).create(createSyntheticAstroInternalPreviewCandidate());
      const path = recordPath(storageRoot, CANDIDATE_ID);
      const value = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
      value.schemaVersion = "gnr8-astro-persisted-preview-candidate:v999";
      await writeFile(path, JSON.stringify(value));
      await assert.rejects(() => repository(storageRoot).read(identity()), isRepositoryError("unsupported_version"));
    });
  });

  await t.test("rendered-content and metadata tampering", async () => {
    for (const mutate of [
      (value: Record<string, any>) => { value.candidate.htmlByPath["/"] += "tampered"; },
      (value: Record<string, any>) => { value.storedAt = "2026-09-27T12:00:00.000Z"; },
    ]) {
      await withStorageRoot(async (storageRoot) => {
        await repository(storageRoot).create(createSyntheticAstroInternalPreviewCandidate());
        const path = recordPath(storageRoot, CANDIDATE_ID);
        const value = JSON.parse(await readFile(path, "utf8")) as Record<string, any>;
        mutate(value);
        await writeFile(path, JSON.stringify(value));
        await assert.rejects(() => repository(storageRoot).read(identity()), isRepositoryError("corrupt"));
      });
    }
  });

  await t.test("wrong ownership exposes no candidate payload", async () => {
    await withStorageRoot(async (storageRoot) => {
      await repository(storageRoot).create(createSyntheticAstroInternalPreviewCandidate());
      const error = await assert.rejects(
        () => repository(storageRoot).read({ ...identity(), siteId: "site-other-owner" }),
        isRepositoryError("ownership_mismatch"),
      );
      assert.equal(String(error).includes("Persistence survives process exit"), false);
      assert.equal(String(error).includes(SITE_ID), false);
    });
  });
});

test("storage keys contain traversal-like IDs and symlink boundaries fail closed", async (t) => {
  await t.test("caller identities are hashed rather than used as paths", async () => {
    await withStorageRoot(async (storageRoot) => {
      const candidateId = "../../outside/../candidate";
      const candidate = createSyntheticAstroInternalPreviewCandidate({ candidateId });
      const result = await repository(storageRoot).create(candidate);
      assert.equal(result.status, "created");
      assert.match(astroCandidateStorageKey(candidateId), /^[0-9a-f]{64}$/);
      const reloaded = await repository(storageRoot).read({ ...identity(), candidateId });
      assert.equal(reloaded.candidate.id, candidateId);
    });
  });

  await t.test("symlink storage root", async () => {
    const ownerRoot = await realTemporaryDirectory("gnr8-astro-repository-owner-");
    const outside = await realTemporaryDirectory("gnr8-astro-repository-outside-");
    const linkedRoot = join(ownerRoot, "linked-storage");
    try {
      await symlink(outside, linkedRoot);
      await assert.rejects(() => repository(linkedRoot).create(createSyntheticAstroInternalPreviewCandidate()), isRepositoryError("storage_boundary_invalid"));
    } finally {
      await rm(ownerRoot, { recursive: true, force: true });
      await rm(outside, { recursive: true, force: true });
    }
  });

  await t.test("symlink key prefix", async () => {
    await withStorageRoot(async (storageRoot) => {
      const outside = await realTemporaryDirectory("gnr8-astro-repository-prefix-outside-");
      try {
        const key = astroCandidateStorageKey(CANDIDATE_ID);
        const base = join(storageRoot, "astro-candidates-v1");
        await mkdir(base);
        await symlink(outside, join(base, key.slice(0, 2)));
        await assert.rejects(() => repository(storageRoot).create(createSyntheticAstroInternalPreviewCandidate()), isRepositoryError("storage_boundary_invalid"));
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    });
  });

  await t.test("symlink record file", async () => {
    await withStorageRoot(async (storageRoot) => {
      await repository(storageRoot).create(createSyntheticAstroInternalPreviewCandidate());
      const outside = join(storageRoot, "outside-record.json");
      const path = recordPath(storageRoot, CANDIDATE_ID);
      await writeFile(outside, "{}", "utf8");
      await rm(path);
      await symlink(outside, path);
      await assert.rejects(() => repository(storageRoot).read(identity()), isRepositoryError("storage_boundary_invalid"));
    });
  });
});

test("repository enforces a bounded serialized record size", async () => {
  await withStorageRoot(async (storageRoot) => {
    const oversized = createSyntheticAstroInternalPreviewCandidate({ html: `<html><body>${"x".repeat(4_000)}</body></html>` });
    await assert.rejects(
      () => new LocalFilesystemAstroInternalPreviewCandidateRepository({ storageRoot, maxRecordBytes: 1_024 }).create(oversized),
      isRepositoryError("record_too_large"),
    );
    await repository(storageRoot).create(createSyntheticAstroInternalPreviewCandidate());
    await assert.rejects(
      () => new LocalFilesystemAstroInternalPreviewCandidateRepository({ storageRoot, maxRecordBytes: 1_024 }).read(identity()),
      isRepositoryError("record_too_large"),
    );
  });
});

test("persisted readback feeds the unified selector and missing or corrupt records do not fall back", async (t) => {
  await t.test("stored candidate selection", async () => {
    await withStorageRoot(async (storageRoot) => {
      await repository(storageRoot).create(createSyntheticAstroInternalPreviewCandidate());
      let databaseReads = 0;
      const restore = setUnifiedRenderPreviewDependenciesForTest({
        requestScopedDbClientEnabled: false,
        getPoolStatus: () => ({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
        getAstroInternalPreviewCandidate: async (candidateId) => {
          assert.equal(candidateId, CANDIDATE_ID);
          return (await repository(storageRoot).read(identity())).candidate;
        },
        getSiteVersion: async () => {
          databaseReads += 1;
          throw new Error("persisted Astro selection must not read a site version");
        },
        getSiteVersionArtifactBinding: async () => {
          databaseReads += 1;
          throw new Error("persisted Astro selection must not read an artifact binding");
        },
        getArtifactById: async () => {
          databaseReads += 1;
          throw new Error("persisted Astro selection must not read a runtime artifact");
        },
      });
      try {
        const preview = await renderSiteVersionPreview({
          siteVersionId: SITE_VERSION_ID,
          path: "/",
          mode: "transformed",
          astroCandidateSelection: { candidateId: CANDIDATE_ID, siteId: SITE_ID },
        });
        assert.equal(preview.source, "astro_internal_preview_candidate");
        assert.equal(preview.fallbackUsed, false);
        assert.match(preview.html, /Persistence survives process exit/);
        assert.match(preview.html, /--proof:#0f766e/);
        assert.match(preview.html, /href="#contact"/);
        assert.equal(databaseReads, 0);
      } finally {
        restore();
      }
    });
  });

  for (const scenario of ["missing", "corrupt"] as const) {
    await t.test(`${scenario} selection`, async () => {
      await withStorageRoot(async (storageRoot) => {
        if (scenario === "corrupt") {
          await repository(storageRoot).create(createSyntheticAstroInternalPreviewCandidate());
          await writeFile(recordPath(storageRoot, CANDIDATE_ID), "{truncated");
        }
        let fallbackReads = 0;
        const restore = setUnifiedRenderPreviewDependenciesForTest({
          requestScopedDbClientEnabled: false,
          getPoolStatus: () => ({ totalCount: 0, idleCount: 0, waitingCount: 0 }),
          getAstroInternalPreviewCandidate: async () => (await repository(storageRoot).read(identity())).candidate,
          getSiteVersionArtifactBinding: async () => {
            fallbackReads += 1;
            return null;
          },
          getArtifactById: async () => {
            fallbackReads += 1;
            return null;
          },
        });
        try {
          await assert.rejects(
            () => renderSiteVersionPreview({
              siteVersionId: SITE_VERSION_ID,
              mode: "transformed",
              astroCandidateSelection: { candidateId: CANDIDATE_ID, siteId: SITE_ID },
            }),
            isRepositoryError(scenario),
          );
          assert.equal(fallbackReads, 0);
        } finally {
          restore();
        }
      });
    });
  }
});

function repository(storageRoot: string, now = "2026-09-27T10:00:00.000Z") {
  return new LocalFilesystemAstroInternalPreviewCandidateRepository({
    storageRoot,
    now: () => new Date(now),
  });
}

function identity() {
  return { candidateId: CANDIDATE_ID, siteId: SITE_ID, siteVersionId: SITE_VERSION_ID };
}

function recordPath(storageRoot: string, candidateId: string): string {
  const key = astroCandidateStorageKey(candidateId);
  return join(storageRoot, "astro-candidates-v1", key.slice(0, 2), `${key}.json`);
}

function isRepositoryError(code: AstroCandidateRepositoryError["code"]) {
  return (error: unknown): boolean => error instanceof AstroCandidateRepositoryError && error.code === code;
}

async function realTemporaryDirectory(prefix: string): Promise<string> {
  return realpath(await mkdtemp(join(tmpdir(), prefix)));
}

async function withStorageRoot(run: (storageRoot: string) => Promise<void>): Promise<void> {
  const storageRoot = await realTemporaryDirectory("gnr8-astro-repository-test-");
  try {
    await run(storageRoot);
  } finally {
    await rm(storageRoot, { recursive: true, force: true });
  }
}
