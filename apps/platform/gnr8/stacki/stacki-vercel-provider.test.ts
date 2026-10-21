import test from "node:test";
import assert from "node:assert/strict";
import type { Sandbox, Snapshot } from "@vercel/sandbox";
import { Readable } from "node:stream";
import { STACKI_CHECKPOINT_MAX_BYTES } from "./stacki-draft-contract";
import { VercelStackiProvider } from "./stacki-vercel-provider";
import type { StackiSession } from "./stacki-session-store";

const session: StackiSession = {
  id: "11111111-1111-4111-8111-111111111111", actorUserId: "22222222-2222-4222-8222-222222222222",
  scope: { agencyId: "33333333-3333-4333-8333-333333333333", clientId: "44444444-4444-4444-8444-444444444444",
    siteId: "55555555-5555-4555-8555-555555555555", siteVersionId: "66666666-6666-4666-8666-666666666666" },
  platformOrigin: "https://gnr8.invalid", baseRevision: 1, expiresAt: Date.now() + 20 * 60_000, ticket: "a".repeat(43), month: "2026-10", slot: 1,
};
const files = ["astro.config.mjs", "package.json", "src/pages/index.astro"].map(path => ({ path, base64: Buffer.from(path).toString("base64") }));

test("Vercel boundary uses bounded ephemeral offline snapshot, only protected port and no platform env", async () => {
  const creates: unknown[] = [], gets: unknown[] = [], commands: unknown[] = [];
  const writes: Array<{ path: string; content: Buffer }[]> = [];
  let stops = 0, oversize = false;
  const stub = {
    persistent: false, status: "running",
    domain: (port: number) => { assert.equal(port, 4357); return "https://sandbox.invalid"; },
    writeFiles: async (value: typeof writes[number]) => { writes.push(value); },
    runCommand: async (value: unknown) => { commands.push(value); return { exitCode: 0 }; },
    readFile: async ({ path }: { path: string }) => Readable.from([oversize ? Buffer.alloc(STACKI_CHECKPOINT_MAX_BYTES + 1) : Buffer.from(JSON.stringify(
      path.endsWith("runtime.json") ? { format: "gnr8-stacki-runtime:v1", platform: "linux", studio: "0.1.59",
        astro: "5.18.2", checkpointHook: 2, checkpointMaxBytes: STACKI_CHECKPOINT_MAX_BYTES, siteDependenciesInstalled: true, upstreamCommit: "36bab90a9ba5fb19134a13f6f1a9e71b2ea7ce24" }
      : path.endsWith("ready.json") ? { entryUrl: `https://sandbox.invalid/__gnr8/enter#${session.ticket}` } : files))]),
    stop: async () => { stops++; },
  };
  const sdk = {
    create: async (input: unknown) => { creates.push(input); return stub; },
    get: async (input: unknown) => { gets.push(input); return stub; },
  } as unknown as Pick<typeof Sandbox, "create" | "get">;
  const snapshots = { get: async () => ({ status: "created", expiresAt: new Date(Date.now() + 86400000) }) } as unknown as Pick<typeof Snapshot, "get">;
  const provider = new VercelStackiProvider("snap_test", sdk, snapshots);
  assert((await provider.start(session, files)).entryUrl.includes(session.ticket));
  assert.equal(creates.length, 1);
  const config = creates[0] as Record<string, unknown>;
  assert.equal(config.persistent, false);
  assert.equal(config.networkPolicy, "deny-all");
  assert.deepEqual(config.ports, [4357]);
  assert.deepEqual(config.source, { type: "snapshot", snapshotId: "snap_test" });
  assert.deepEqual(config.resources, { vcpus: 2 });
  assert(Number(config.timeout) > 0 && Number(config.timeout) <= 20 * 60_000);
  assert(!Object.hasOwn(config, "env"));
  assert.deepEqual(await provider.capture(session, { operationId: session.id, expectedRevision: 1 }), files);
  await provider.stop(session);
  assert.equal(stops, 1);
  assert(gets.every(value => (value as { resume: boolean }).resume === false));
  assert.equal(writes.length, 2);
  assert(!JSON.stringify(writes).includes("SUPABASE"));
  assert(commands.length >= 3);
  oversize = true;
  await assert.rejects(provider.capture(session, { operationId: session.id, expectedRevision: 1 }), /STACKI_CHECKPOINT_TOO_LARGE/);
  stub.status = "stopped";
  const before = commands.length;
  await assert.rejects(provider.capture(session, { operationId: session.id, expectedRevision: 1 }), /STACKI_SESSION_EXPIRED/);
  assert.equal(commands.length, before, "stopped VM must never auto-resume");
});

test("expired/missing snapshot fails without launching; replacing it reuses the same draft input", async () => {
  let creates = 0;
  const sdk = { create: async () => { creates++; throw new Error("create boundary reached"); } } as unknown as Pick<typeof Sandbox, "create" | "get">;
  let expiresAt = new Date(0);
  const snapshots = { get: async () => ({ status: "created", expiresAt }) } as unknown as Pick<typeof Snapshot, "get">;
  await assert.rejects(new VercelStackiProvider("snap_old", sdk, snapshots).start(session, files), /STACKI_RUNTIME_REFRESH_REQUIRED/);
  assert.equal(creates, 0);
  expiresAt = new Date(Date.now() + 86400000);
  await assert.rejects(new VercelStackiProvider("snap_rebuilt", sdk, snapshots).start(session, files), /create boundary reached/);
  assert.equal(creates, 1, "fresh configuration reaches existing creation path; no alternate persistence");
  const missing = { get: async () => { throw { response: new Response(null, { status: 404 }) }; } } as unknown as Pick<typeof Snapshot, "get">;
  await assert.rejects(new VercelStackiProvider("snap_missing", sdk, missing).start(session, files), /STACKI_RUNTIME_REFRESH_REQUIRED/);
});
