/**
 * Local proof I/O only: the real Supabase SDK uses this fetch instead of a
 * network connection. Objects survive client/process recreation on disk.
 * This is not a hosted storage emulator or an application dependency.
 */
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
import { link, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

export function createStackiLocalStorage(root: string, options: {
  publicBucket?: boolean; failUpload?: boolean; loseUploadResponse?: boolean; failDownload?: boolean;
} = {}) {
  const calls: { method: string; path: string; requestBytes: number; responseBytes: number; status: number }[] = [];
  const bucket = "gnr8-proof-private";
  const serve: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    assert.equal(url.origin, "https://stacki-storage.invalid", "Proof transport forbids real provider calls");
    const path = decodeURIComponent(url.pathname);
    if (path === `/storage/v1/bucket/${bucket}` && request.method === "GET")
      return Response.json({ id: bucket, name: bucket, public: options.publicBucket ?? false });
    if (path === `/storage/v1/object/list/${bucket}` && request.method === "POST") {
      const body = await request.json();
      assert([1, 1000].includes(body.limit));
      assert.equal(body.sortBy.column, "name");
      const directory = safePath(root, body.prefix);
      let names: string[];
      try { names = await readdir(directory); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; names = []; }
      names = names.filter(name => name.endsWith(".json") || /^[a-f0-9]{64}$/.test(name)).sort();
      if (body.sortBy.order === "desc") names.reverse();
      return Response.json(await Promise.all(names.slice(body.offset ?? 0, (body.offset ?? 0) + body.limit).map(async name => {
        const bytes = await readFile(join(directory, name));
        return { name, metadata: { size: bytes.length, eTag: `"${createHash("md5").update(bytes).digest("hex")}"` } };
      })));
    }
    const prefix = `/storage/v1/object/${bucket}/`;
    assert(path.startsWith(prefix), `Unexpected storage request: ${path}`);
    const file = safePath(root, path.slice(prefix.length));
    if (request.method === "POST") {
      assert.equal(request.headers.get("x-upsert"), "false");
      if (options.failUpload) return storageError(503, "Local injected write failure");
      await mkdir(dirname(file), { recursive: true });
      const temporary = `${file}.${randomUUID()}.pending`;
      await writeFile(temporary, Buffer.from(await request.arrayBuffer()), { flag: "wx" });
      try { await link(temporary, file); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        return storageError(409, "The resource already exists");
      } finally { await rm(temporary); }
      if (options.loseUploadResponse) return storageError(503, "Local injected ambiguous response");
      return Response.json({ Id: randomUUID(), Key: `${bucket}/${path.slice(prefix.length)}` });
    }
    assert.equal(request.method, "GET");
    if (options.failDownload) return storageError(503, "Local injected read failure");
    try {
      return new Response(await readFile(file), { headers: { "content-type": "application/json" } });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return storageError(404, "Object not found");
    }
  };
  const localFetch: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const call = { method: request.method, path: decodeURIComponent(new URL(request.url).pathname),
      requestBytes: (await request.clone().arrayBuffer()).byteLength, responseBytes: 0, status: 0 };
    calls.push(call);
    const response = await serve(request);
    call.responseBytes = (await response.clone().arrayBuffer()).byteLength;
    call.status = response.status;
    return response;
  };
  const client = createClient("https://stacki-storage.invalid", "local-proof-not-a-provider-secret", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: localFetch },
  });
  return { client, bucket, calls };
}

function safePath(root: string, key: unknown) {
  assert(typeof key === "string" && /^[a-zA-Z0-9_/-]+(?:\.json)?$/.test(key));
  assert(key.split("/").every(part => part && part !== "." && part !== ".."));
  return join(root, key);
}
function storageError(status: number, message: string) {
  return Response.json({ statusCode: String(status), error: message, message }, { status });
}
