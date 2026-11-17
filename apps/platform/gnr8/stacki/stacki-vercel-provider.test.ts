import test from "node:test";
import assert from "node:assert/strict";
import type { Sandbox, Snapshot } from "@vercel/sandbox";
import { Readable } from "node:stream";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
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
  let stops = 0, oversize = false, entryReopenVersion = 1, lazyAssetsVersion: number | undefined;
  let checkpointMaxBytes = STACKI_CHECKPOINT_MAX_BYTES;
  const stub = {
    persistent: false, status: "running",
    domain: (port: number) => { assert.equal(port, 4357); return "https://sandbox.invalid"; },
    writeFiles: async (value: typeof writes[number]) => { writes.push(value); },
    runCommand: async (value: unknown) => { commands.push(value); return { exitCode: 0 }; },
    readFile: async ({ path }: { path: string }) => Readable.from([oversize ? Buffer.alloc(STACKI_CHECKPOINT_MAX_BYTES + 1) : Buffer.from(JSON.stringify(
      path.endsWith("runtime.json") ? { format: "gnr8-stacki-runtime:v1", platform: "linux", studio: "0.1.94",
        astro: "7.4.4", node: "26.13.0", checkpointHook: 2, entryReopenVersion, lazyAssetsVersion, checkpointMaxBytes, siteDependenciesInstalled: true, upstreamCommit: "2ed510fbaf19e120c642f96a8e3047f15bcd71ab" }
      : path.endsWith("ready.json") ? { entryUrl: `https://sandbox.invalid/__gnr8/enter#${session.ticket}` } : files))]),
    stop: async () => { stops++; },
  };
  const sdk = {
    create: async (input: unknown) => { creates.push(input); return stub; },
    get: async (input: unknown) => { gets.push(input); return stub; },
  } as unknown as Pick<typeof Sandbox, "create" | "get">;
  const snapshots = { get: async () => ({ status: "created", expiresAt: new Date(Date.now() + 86400000) }) } as unknown as Pick<typeof Snapshot, "get">;
  const provider = new VercelStackiProvider("snap_test", sdk, snapshots);
  assert((await provider.start(session, files, [{name:"a".repeat(64),body:Buffer.alloc(2*1024*1024)}])).entryUrl.includes(session.ticket));
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
  assert.equal(writes.length, 3);
  assert.equal(writes[1]![0]!.path,"/vercel/sandbox/gnr8/site/node_modules/.gnr8-retained-assets/"+"a".repeat(64));
  assert.equal(writes[1]![0]!.content.length,2*1024*1024);
  assert(!JSON.stringify(writes).includes("SUPABASE"));
  assert(commands.length >= 3);
  checkpointMaxBytes = 72 * 1024 * 1024;
  const beforeMismatchedRuntime = writes.length;
  await assert.rejects(provider.start(session, files), /STACKI_RUNTIME_REFRESH_REQUIRED/);
  assert.equal(writes.length, beforeMismatchedRuntime, "observed 72 MB image fails before uploading customer source");
  checkpointMaxBytes = STACKI_CHECKPOINT_MAX_BYTES;
  entryReopenVersion = 0;
  const beforeOldRuntime = writes.length;
  await assert.rejects(provider.start(session, files), /STACKI_RUNTIME_REFRESH_REQUIRED/);
  assert.equal(writes.length, beforeOldRuntime, "old gateway must fail before any user source is uploaded");
  assert.equal(stops, 3);
  entryReopenVersion = 1;
  const delivery = {commit:'a'.repeat(40),redirects:{'/api/gnr8/runtime/preview-assets/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/image':'https://storage.invalid/object/sign/private/image?token=short'}};
  const beforeLazy=writes.length;
  await assert.rejects(provider.start(session,files,[],delivery),/STACKI_RUNTIME_REFRESH_REQUIRED/);
  assert.equal(writes.length,beforeLazy,'old snapshot cannot receive a lazy session');
  lazyAssetsVersion=1;
  const smallLinked = Array.from({length:313},(_,i)=>({name:i.toString(16).padStart(64,'0'),body:Buffer.from('<svg/>')}));
  await provider.start(session,files,smallLinked,delivery);

  const lazyWrites=writes.slice(beforeLazy);
  assert.equal(lazyWrites.length,2,'one source/archive write and one session write');
  assert.equal(lazyWrites[0].length,files.length+313,'linked assets share the one startup archive');
  assert.deepEqual(JSON.parse(lazyWrites[1][0].content.toString()).assetDelivery,delivery);
  assert.equal((creates.at(-1) as {networkPolicy:string}).networkPolicy,'deny-all');
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


test("GitHub accepts the exact shipped browser bundle and rejects altered image code before source upload", async () => {
  const previous = {enabled:process.env.GNR8_STACKI_GITHUB_ENABLED, ids:process.env.GNR8_STACKI_GITHUB_SITE_IDS,
    targets:process.env.GNR8_STACKI_GITHUB_TARGETS, token:process.env.GNR8_STACKI_GITHUB_TOKEN};
  const directory = await mkdtemp(join(tmpdir(), 'stacki-image-check-'));
  const browser = join(directory,'studio.js');
  let writes=0, stops=0;
  try {
    process.env.GNR8_STACKI_GITHUB_ENABLED='1';
    process.env.GNR8_STACKI_GITHUB_SITE_IDS=JSON.stringify([session.scope.siteId]);
    process.env.GNR8_STACKI_GITHUB_TARGETS=JSON.stringify({[session.scope.siteId]:{owner:'test',ownerId:1,repository:'test',repositoryId:2}});
    process.env.GNR8_STACKI_GITHUB_TOKEN='local-test-only';
    await writeFile(browser, await readFile(resolve('apps/platform/gnr8/stacki/studio-client.bundle.js')));
    const stub={
      domain:()=> 'https://sandbox.invalid', stop:async()=>{stops++;},
      writeFiles:async()=>{writes++;},
      readFile:async({path}:{path:string})=>Readable.from([Buffer.from(JSON.stringify(path.endsWith('runtime.json') ? {
        format:'gnr8-stacki-runtime:v1',platform:'linux',node:'26.13.0',studio:'0.1.94',astro:'7.4.4',
        checkpointHook:2,entryReopenVersion:1,checkpointMaxBytes:STACKI_CHECKPOINT_MAX_BYTES,
        siteDependenciesInstalled:true,upstreamCommit:'2ed510fbaf19e120c642f96a8e3047f15bcd71ab'
      }:{entryUrl:`https://sandbox.invalid/__gnr8/enter#${session.ticket}`}))]),
      runCommand:async(value:{args:string[]})=>{
        const script=value.args.at(-1)??'';
        if(script.includes("createHash")) {
          try {execFileSync(process.execPath,['--input-type=module','-e',script.replace('/vercel/sandbox/gnr8/studio/dist/studio.js',browser)],{stdio:'pipe'});}
          catch {return {exitCode:2};}
        }
        return {exitCode:0};
      },
    };
    const provider=new VercelStackiProvider('snap_refreshed',{create:async()=>stub} as unknown as Pick<typeof Sandbox,'create'|'get'>,
      {get:async()=>({status:'created'})} as unknown as Pick<typeof Snapshot,'get'>);
    await provider.start(session,files);
    assert.equal(writes,3);
    await writeFile(browser,'unrecognized runtime browser bundle');
    await assert.rejects(provider.start(session,files),/STACKI_RUNTIME_REFRESH_REQUIRED/);
    assert.equal(writes,3,'unrecognized bundle fails before all source/session writes');
    assert.equal(stops,1);
  } finally {
    const values={GNR8_STACKI_GITHUB_ENABLED:previous.enabled,GNR8_STACKI_GITHUB_SITE_IDS:previous.ids,
      GNR8_STACKI_GITHUB_TARGETS:previous.targets,GNR8_STACKI_GITHUB_TOKEN:previous.token};
    for(const [key,value] of Object.entries(values)) {if(value===undefined)delete process.env[key];else process.env[key]=value;}
    await rm(directory,{recursive:true,force:true});
  }
});
