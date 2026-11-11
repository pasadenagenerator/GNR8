import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { RawImportGitCache } from "./raw-import-git-cache";
import { rawImportGitPackage, writeRawImportGitArchive } from "./raw-import-git-archive";

test("derived capture cache rejects the parent Git ref and accepts its own version", async () => {
  const parentVersion = "0b609c81-98c5-42cc-a9f2-18b3bbc1f3c0";
  const derivedVersion = "d33d44df-7be3-48d8-9cf6-245474f95ca5";
  const bytes = Buffer.from("<html>CHS derived capture</html>");
  const file = {
    path: "index.html",
    mediaType: "text/html",
    sizeBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes,
  };
  const objects = new Map<string, Buffer>();
  const bucket = {
    upload: async (key: string, value: Buffer) => {
      objects.set(key, value);
      return { data: {}, error: null };
    },
    download: async (key: string) => {
      const value = objects.get(key);
      return value
        ? { data: new Blob([new Uint8Array(value)]), error: null }
        : { data: null, error: new Error("missing") };
    },
  };
  const client = { storage: {
    getBucket: async () => ({ data: { public: false }, error: null }),
    from: () => bucket,
  } } as unknown as ConstructorParameters<typeof RawImportGitCache>[0];
  const cache = new RawImportGitCache(client, "gnr8-astro-candidate-routes");
  const scope = {
      agencyId: "00000000-0000-4000-8000-000000000001",
      clientId: "3d44ad6f-01e5-4884-a492-585de3b3af49",
      siteId: "9ff5613e-1625-43f1-844e-c5c91a813d4f",
  };
  const ref = {
    scope,
    repository: "pasadenagenerator/gnr8-chs",
    commit: "a".repeat(40),
    manifestPath: `raw-import/${parentVersion}/.gnr8-import-manifest.json`,
    manifestSha256: "b".repeat(64),
  };
  await assert.rejects(cache.prepare(ref, derivedVersion, [file]), /RAW_IMPORT_CACHE_INTEGRITY_FAILED/);
  const archiveInput = {
    scope,
    runtimeSiteId: "chs",
    siteVersionId: derivedVersion,
    files: [file],
    target: { owner: "pasadenagenerator", ownerId: 1, repository: "gnr8-chs", repositoryId: 2, token: "test" },
  };
  const packageFiles = rawImportGitPackage(archiveInput).gitFiles;
  const commit = "c".repeat(40);
  const parent = "d".repeat(40);
  const tree = "e".repeat(40);
  const transport = (tamper = false) => (async (url: string | URL | Request) => {
    const path = new URL(String(url)).pathname;
    const result = path.includes("/git/ref/") ? { object: { sha: commit } }
      : path.includes("/git/commits/") ? { tree: { sha: tree }, parents: [{ sha: parent }] }
      : { truncated: false, tree: packageFiles.map((entry, index) => ({
          path: entry.path, type: "blob", mode: "100644", size: entry.body.length,
          sha: tamper && index === 0 ? "f".repeat(40)
            : createHash("sha1").update(`blob ${entry.body.length}\0`).update(entry.body).digest("hex"),
        })) };
    return Response.json(result);
  }) as typeof fetch;
  const archiveDeps = {
    repository: async () => ({ defaultBranch: "main", parent }),
    push: async () => ({ commit }) as never,
    transport: transport(),
  };
  const archive = await writeRawImportGitArchive(archiveInput, archiveDeps);
  await assert.rejects(writeRawImportGitArchive(archiveInput,
    { ...archiveDeps, repository: async () => ({ defaultBranch: "main", parent, existingCommit: commit }),
      transport: transport(true) }), /RAW_IMPORT_GIT_ARCHIVE_INVALID/);
  const derivedRef = {
    scope,
    repository: archive.repository,
    commit: archive.commit,
    manifestPath: archive.manifestPath,
    manifestSha256: archive.manifestSha256,
  };
  assert.equal(archive.manifestPath, `raw-import/${derivedVersion}/.gnr8-import-manifest.json`);
  await cache.prepare(derivedRef, derivedVersion, [file]);
  assert.deepEqual(await cache.read(derivedRef, derivedVersion, file), bytes);
});

test("cache retries a transient upload failure and verifies readback", async () => {
  const version = "43bb405b-912e-47e7-af85-f995cd2ed384";
  const bytes = Buffer.from("CHS asset");
  const file = { path: "assets/chs.txt", mediaType: "text/plain", sizeBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"), bytes };
  const objects = new Map<string, Buffer>();
  let uploads = 0;
  const client = { storage: {
    getBucket: async () => ({ data: { public: false }, error: null }),
    from: () => ({
      upload: async (key: string, value: Buffer) => {
        uploads++;
        if (uploads === 1) return { data: null, error: new Error("temporary failure") };
        objects.set(key, value);
        return { data: {}, error: null };
      },
      download: async (key: string) => {
        const value = objects.get(key);
        return value ? { data: new Blob([new Uint8Array(value)]), error: null }
          : { data: null, error: new Error("missing") };
      },
    }),
  } } as unknown as ConstructorParameters<typeof RawImportGitCache>[0];
  const ref = { scope: { agencyId: "00000000-0000-4000-8000-000000000001",
    clientId: "3d44ad6f-01e5-4884-a492-585de3b3af49",
    siteId: "9ff5613e-1625-43f1-844e-c5c91a813d4f" },
    repository: "pasadenagenerator/gnr8-chs", commit: "a".repeat(40),
    manifestPath: `raw-import/${version}/.gnr8-import-manifest.json`, manifestSha256: "b".repeat(64) };
  const cache = new RawImportGitCache(client, "gnr8-astro-candidate-routes");
  await cache.prepare(ref, version, [file]);
  assert.equal(uploads, 2);
  assert.deepEqual(await cache.read(ref, version, file), bytes);
});

test("cache reports the file and storage error after failed readback", async () => {
  const version = "43bb405b-912e-47e7-af85-f995cd2ed384";
  const bytes = Buffer.from("CHS asset");
  const file = { path: "assets/chs.txt", mediaType: "text/plain", sizeBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"), bytes };
  const client = { storage: {
    getBucket: async () => ({ data: { public: false }, error: null }),
    from: () => ({
      upload: async () => ({ data: null, error: new Error("storage unavailable") }),
      download: async () => ({ data: null, error: new Error("missing") }),
    }),
  } } as unknown as ConstructorParameters<typeof RawImportGitCache>[0];
  const ref = { scope: { agencyId: "00000000-0000-4000-8000-000000000001",
    clientId: "3d44ad6f-01e5-4884-a492-585de3b3af49",
    siteId: "9ff5613e-1625-43f1-844e-c5c91a813d4f" },
    repository: "pasadenagenerator/gnr8-chs", commit: "a".repeat(40),
    manifestPath: `raw-import/${version}/.gnr8-import-manifest.json`, manifestSha256: "b".repeat(64) };
  await assert.rejects(new RawImportGitCache(client, "gnr8-astro-candidate-routes").prepare(ref, version, [file]),
    /RAW_IMPORT_CACHE_INTEGRITY_FAILED:assets\/chs\.txt:storage unavailable/);
});

test("cache repairs an existing object whose bytes fail exact readback", async () => {
  const version = "43bb405b-912e-47e7-af85-f995cd2ed384";
  const bytes = Buffer.from("correct CHS SVG");
  const file = { path: "assets/style_asset/chs.svg", mediaType: "image/svg+xml", sizeBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"), bytes };
  const objects = new Map<string, Buffer>();
  const upsertFlags: boolean[] = [];
  const client = { storage: {
    getBucket: async () => ({ data: { public: false }, error: null }),
    from: () => ({
      upload: async (key: string, value: Buffer, options: { upsert: boolean }) => {
        upsertFlags.push(options.upsert);
        if (objects.has(key) && !options.upsert) return { data: null, error: new Error("The resource already exists") };
        objects.set(key, value);
        return { data: {}, error: null };
      },
      download: async (key: string) => {
        const value = objects.get(key);
        return value ? { data: new Blob([new Uint8Array(value)]), error: null }
          : { data: null, error: new Error("missing") };
      },
    }),
  } } as unknown as ConstructorParameters<typeof RawImportGitCache>[0];
  const ref = { scope: { agencyId: "00000000-0000-4000-8000-000000000001",
    clientId: "3d44ad6f-01e5-4884-a492-585de3b3af49",
    siteId: "9ff5613e-1625-43f1-844e-c5c91a813d4f" },
    repository: "pasadenagenerator/gnr8-chs", commit: "a".repeat(40),
    manifestPath: `raw-import/${version}/.gnr8-import-manifest.json`, manifestSha256: "b".repeat(64) };
  const cache = new RawImportGitCache(client, "gnr8-astro-candidate-routes");
  const objectKey = `raw-import-cache/v1/${ref.scope.agencyId}/${ref.scope.clientId}/${ref.scope.siteId}/${version}/${ref.commit}/${file.sha256}`;
  objects.set(objectKey, Buffer.from("stale bytes"));
  await cache.prepare(ref, version, [file]);
  assert.deepEqual(upsertFlags, [false, true]);
  assert.deepEqual(await cache.read(ref, version, file), bytes);
});
