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
  const blobSha = (body: Buffer) => createHash("sha1").update(`blob ${body.length}\0`).update(body).digest("hex");
  const blobs = new Map(packageFiles.map((entry) => [blobSha(entry.body), entry.body]));
  const transport = (tamper = false) => (async (url: string | URL | Request) => {
    const path = new URL(String(url)).pathname;
    const result = path.includes("/git/ref/") ? { object: { sha: commit } }
      : path.includes("/git/commits/") ? { tree: { sha: tree }, parents: [{ sha: parent }] }
      : path.includes("/git/blobs/") ? (() => {
          const body = blobs.get(path.split("/").at(-1) ?? "");
          assert.ok(body);
          return { encoding: "base64", size: body.length, content: body.toString("base64") };
        })()
      : { truncated: false, tree: packageFiles.map((entry, index) => ({
          path: entry.path, type: "blob", mode: "100644", size: entry.body.length,
          sha: tamper && index === 0 ? "f".repeat(40)
            : blobSha(entry.body),
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

test("a changed capture advances only an unbound import branch", async () => {
  const version = "d33d44df-7be3-48d8-9cf6-245474f95ca5";
  const scope = { agencyId: "00000000-0000-4000-8000-000000000001",
    clientId: "3d44ad6f-01e5-4884-a492-585de3b3af49",
    siteId: "9ff5613e-1625-43f1-844e-c5c91a813d4f" };
  const makeInput = (text: string) => {
    const bytes = Buffer.from(text);
    return { scope, runtimeSiteId: "chs", siteVersionId: version,
      files: [{ path: "index.html", mediaType: "text/html", bytes, sizeBytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex") }],
      target: { owner: "pasadenagenerator", ownerId: 1, repository: "gnr8-chs", repositoryId: 2, token: "test" } };
  };
  const oldInput = makeInput("old capture");
  const newInput = makeInput("new capture");
  const oldCommit = "a".repeat(40), newCommit = "b".repeat(40), base = "c".repeat(40), tree = "d".repeat(40);
  const blobSha = (body: Buffer) => createHash("sha1").update(`blob ${body.length}\0`).update(body).digest("hex");
  let head = oldCommit, parent = base, files = rawImportGitPackage(oldInput).gitFiles;
  const oldBlobs = new Map(files.map((file) => [blobSha(file.body), file.body]));
  const transport = (async (url: string | URL | Request) => {
    const path = new URL(String(url)).pathname;
    if (path.includes("/git/ref/")) return Response.json({ object: { sha: head } });
    if (path.includes("/git/commits/")) return Response.json({ tree: { sha: tree }, parents: [{ sha: parent }] });
    if (path.includes("/git/blobs/")) {
      const body = oldBlobs.get(path.split("/").at(-1) ?? "");
      assert.ok(body);
      return Response.json({ encoding: "base64", size: body.length, content: body.toString("base64") });
    }
    return Response.json({ truncated: false, tree: files.map((file) => ({ path: file.path,
      type: "blob", mode: "100644", size: file.body.length, sha: blobSha(file.body) })) });
  }) as typeof fetch;
  const repository = async () => ({ defaultBranch: "main", parent: base, existingCommit: oldCommit });
  const push = (async (input: {defaultBranch:string;parent:string}) => {
    assert.equal(input.defaultBranch, `imports/${version}`);
    assert.equal(input.parent, oldCommit);
    head = newCommit; parent = oldCommit; files = rawImportGitPackage(newInput).gitFiles;
    return { commit: newCommit };
  }) as never;
  await assert.rejects(writeRawImportGitArchive(newInput, { repository, transport, push }), /RAW_IMPORT_GIT_ARCHIVE_INVALID/);
  assert.equal(head, oldCommit);
  const result = await writeRawImportGitArchive(newInput,
    { repository, transport, push, allowAdvanceExisting: true });
  assert.equal(result.commit, newCommit);
  assert.equal(result.manifestSha256, rawImportGitPackage(newInput).manifestSha256);
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

test("cache stays below the storage connection limit across many files", async () => {
  const version = "43bb405b-912e-47e7-af85-f995cd2ed384";
  const files = Array.from({ length: 24 }, (_, index) => {
    const bytes = Buffer.from(`ViroiDoc asset ${index}`);
    return { path: `assets/${index}.txt`, mediaType: "text/plain", sizeBytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"), bytes };
  });
  const objects = new Map<string, Buffer>();
  let active = 0, maxActive = 0;
  const limited = async <T>(run: () => T): Promise<T> => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, 2));
    try { if (active > 8) throw new Error("Too many connections issued to the database"); return run(); }
    finally { active--; }
  };
  const client = { storage: {
    getBucket: async () => ({ data: { public: false }, error: null }),
    from: () => ({
      upload: (key: string, value: Buffer) => limited(() => {
        objects.set(key, value); return { data: {}, error: null };
      }),
      download: (key: string) => limited(() => {
        const value = objects.get(key);
        return value ? { data: new Blob([new Uint8Array(value)]), error: null }
          : { data: null, error: new Error("missing") };
      }),
    }),
  } } as unknown as ConstructorParameters<typeof RawImportGitCache>[0];
  const ref = { scope: { agencyId: "00000000-0000-4000-8000-000000000001",
    clientId: "3d44ad6f-01e5-4884-a492-585de3b3af49",
    siteId: "9ff5613e-1625-43f1-844e-c5c91a813d4f" },
    repository: "pasadenagenerator/gnr8-chs", commit: "a".repeat(40),
    manifestPath: `raw-import/${version}/.gnr8-import-manifest.json`, manifestSha256: "b".repeat(64) };
  await new RawImportGitCache(client, "gnr8-astro-candidate-routes").prepare(ref, version, files);
  assert.equal(objects.size, files.length);
  assert.equal(maxActive, 8);
});
