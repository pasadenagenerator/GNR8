import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {generatedArtifactGitPackage} from "../site/generated-artifact-git-archive";
import {createObjectBackedRoundTripCases} from "../../supabase/tests/astro_candidate_registry/typescript-roundtrip";
import policy from "./lumos-reviewed-export.json";
import {exportMediaType,RESOURCE_RECORD_VERSION,RESOURCE_CONVERSION_VERSION,REVIEWED_LUMOS_SOURCE} from "./astro-export-resources";
import test from "node:test";
import { parse, serialize } from "parse5";
import { contactElements, readContactSchema, replaceSupportedContactForm } from "../contact/contact-form";
import { RETAINED_HERO_SCRIPT } from "../../src/public-site/retained-hero-slider";
import { CONTACT_FORM_SCRIPT } from "../../src/public-site/contact-form-runtime";
import { validateSelfContainedAstroProductionPayload } from "./astro-production-candidate-record";

import { materializeAstroInternalPreviewHtml, computeAstroInternalPreviewCandidateContentSha256 } from "./astro-static-site-internal-preview-bridge";
import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";
import { createAstroProductionCandidateId, type AstroProductionCandidateOwnership } from "./astro-production-candidate-record";
import {
  ASTRO_OBJECT_CANDIDATE_SCHEMA_VERSION,
  computeAstroObjectBackedCandidateStorageSha256,
  validateAstroObjectBackedCandidateRecord,
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

test("object writes are bounded and all verification drains before registration or failure", async () => {
  for (const fail of [false, true]) {
    const gateway = new InMemoryAstroProductionCandidateGateway();
    const store = new InMemoryAstroCandidateObjectStore();
    const original = store.putVerified.bind(store);
    let active = 0, peak = 0, writes = 0, registered = 0;
    store.putVerified = async upload => {
      active++; peak = Math.max(peak, active);
      const index = writes++;
      try {
        await new Promise<void>(resolve => setImmediate(resolve));
        if (fail && index === 0) throw new Error('verification unavailable');
        await original(upload);
      } finally { active--; }
    };
    const register = gateway.atomicCreate.bind(gateway);
    gateway.atomicCreate = async input => { assert.equal(active, 0); registered++; return register(input); };
    const input = createLargeInput();
    input.candidate.htmlByPath = Object.fromEntries(Array.from({length:10},(_,i)=>[i ? `/page-${i}` : '/', html('Page','Retained content','')])) as typeof input.candidate.htmlByPath;
    input.candidate.contentSha256 = computeAstroInternalPreviewCandidateContentSha256(input.candidate);
    input.candidate.manifest.provenance.convertedArtifactSha256 = input.candidate.contentSha256;
    const operation = createRepository(gateway,store).create(input);
    if (fail) await assert.rejects(operation);
    else assert.equal((await operation).status,'created');
    assert.equal(peak,4);
    assert.equal(active,0);
    assert.equal(registered,fail ? 0 : 1);
    assert.equal(writes,fail ? 4 : 11);
  }
});

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
  const stylesRef = (created.record as AstroObjectBackedResolvedRecord).stylesObjectRef;
  assert.ok(stylesRef, "short shared CSS is stored outside the candidate record");
  assert.equal(stylesRef.sizeBytes, Buffer.byteLength(input.candidate.compiledTokenStyles));
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

test("a one-page candidate stores HTML and CSS as verified objects", async () => {
  const gateway = new InMemoryAstroProductionCandidateGateway();
  const repository = createRepository(gateway, new InMemoryAstroCandidateObjectStore());
  const input = createLargeInput();
  input.candidate.htmlByPath = {"/": html("Home", "One page", "")};
  input.candidate.contentSha256 = computeAstroInternalPreviewCandidateContentSha256(input.candidate);
  input.candidate.manifest.provenance.convertedArtifactSha256 = input.candidate.contentSha256;

  await repository.create(input);
  const saved = await gateway.readForScope({candidateId:CANDIDATE_ID,trustedScope:OWNERSHIP});
  assert.equal(saved.status,"found");
  if(saved.status!=="found")return;
  assert.equal(JSON.stringify(saved.record).includes("One page"),false);
  assert.equal(JSON.stringify(saved.record).includes("--brand:#123456"),false);
  const restored = await repository.read({candidateId:CANDIDATE_ID,trustedScope:OWNERSHIP});
  assert.equal(restored.candidate.htmlByPath["/"],input.candidate.htmlByPath["/"]);
  assert.equal(restored.candidate.compiledTokenStyles,input.candidate.compiledTokenStyles);
});

test("Git-selected one-page candidate cannot fall back to inline registration", async () => {
  const gateway=new InMemoryAstroProductionCandidateGateway();
  const input=createLargeInput();
  input.candidate.htmlByPath={"/":html("Home","Git-selected page","")};
  input.candidate.contentSha256=computeAstroInternalPreviewCandidateContentSha256(input.candidate);
  input.candidate.manifest.provenance.convertedArtifactSha256=input.candidate.contentSha256;
  let gitCalls=0,registrations=0;
  gateway.atomicCreate=async()=>{registrations++;throw Error("unexpected registration");};
  const repository=new GatewayBackedAstroProductionCandidateRepository({gateway,
    gitArchiveRequired:()=>true,prepareGeneratedGit:async()=>{gitCalls++;return null;}});
  await assert.rejects(repository.create(input),
    (error:unknown)=>error instanceof AstroProductionCandidateRepositoryError&&error.code==='unavailable');
  assert.equal(gitCalls,0);
  assert.equal(registrations,0);
});

test("Git-backed candidate registers only after its archive is verified and reads Git bytes", async () => {
  const gateway=new InMemoryAstroProductionCandidateGateway();
  const objects=new InMemoryAstroCandidateObjectStore();
  const input=createLargeInput();
  input.candidate.htmlByPath={"/":html("Home","Git candidate","")};
  input.candidate.contentSha256=computeAstroInternalPreviewCandidateContentSha256(input.candidate);
  input.candidate.manifest.provenance.convertedArtifactSha256=input.candidate.contentSha256;
  const events:string[]=[];
  let archivedManifest:Record<string,unknown>|null=null;
  let corrupt=false;
  const originalPut=objects.putVerified.bind(objects);
  objects.putVerified=async upload=>{events.push('cache');await originalPut(upload);};
  const originalCreate=gateway.atomicCreate.bind(gateway);
  gateway.atomicCreate=async value=>{events.push('register');return originalCreate(value);};
  const repository=new GatewayBackedAstroProductionCandidateRepository({gateway,objectStore:objects,
    now:()=>new Date("2026-10-12T10:00:00.000Z"),
    prepareGeneratedGit:async artifact=>{
      archivedManifest=artifact.manifest;
      const pkg=generatedArtifactGitPackage({scope:{agencyId:OWNERSHIP.agencyId,
        clientId:OWNERSHIP.organizationId,siteId:OWNERSHIP.ownershipSiteId},
        runtimeSiteId:OWNERSHIP.runtimeSiteId,siteVersionId:OWNERSHIP.siteVersionId,
        htmlByPath:artifact.htmlByPath,compiledTokenStyles:artifact.compiledTokenStyles,
        manifest:artifact.manifest,target:{owner:'owner',ownerId:1,repository:'repo',repositoryId:1,token:'token'}});
      events.push('git');
      return {scope:pkg.descriptor.scope,repository:'owner/repo',commit:'a'.repeat(40),
        manifestPath:pkg.manifestPath,manifestSha256:pkg.manifestSha256,
        routes:pkg.descriptor.routes,styles:pkg.descriptor.styles,runtimeManifest:pkg.descriptor.runtimeManifest};
    },
    generatedCache:{read:async()=>Buffer.from(JSON.stringify(archivedManifest)),
      hydrate:async()=>({htmlByPath:{"/":corrupt?'changed':input.candidate.htmlByPath["/"]},
        compiledTokenStyles:input.candidate.compiledTokenStyles})} as never,
  });
  const created=await repository.create(input);
  assert.deepEqual(events.slice(0,2),['git','cache']);
  assert.equal(events.at(-1),'register');
  assert.ok('generatedGitArchive' in created.record);
  const saved=await gateway.readForScope({candidateId:CANDIDATE_ID,trustedScope:OWNERSHIP});
  assert.equal(saved.status,'found');
  assert.equal(JSON.stringify(saved).includes('Git candidate'),false);
  assert.equal((await repository.read({candidateId:CANDIDATE_ID,trustedScope:OWNERSHIP})).candidate.htmlByPath['/'],
    input.candidate.htmlByPath['/']);
  corrupt=true;
  await assert.rejects(repository.read({candidateId:CANDIDATE_ID,trustedScope:OWNERSHIP}),
    (error:unknown)=>error instanceof AstroProductionCandidateRepositoryError&&error.code==='corrupt');
});

test("selected resource candidate stops before any byte or registry write", async () => {
  const gateway=new InMemoryAstroProductionCandidateGateway();
  const objects=new InMemoryAstroCandidateObjectStore();
  const input=createLargeInput();
  input.candidate.exportedFiles=[];
  let uploads=0,registrations=0;
  objects.putVerified=async()=>{uploads++;};
  gateway.atomicCreate=async()=>{registrations++;throw Error('unexpected registration');};
  const repository=new GatewayBackedAstroProductionCandidateRepository({gateway,objectStore:objects,
    gitArchiveRequired:()=>true});
  await assert.rejects(repository.create(input),
    (error:unknown)=>error instanceof AstroProductionCandidateRepositoryError&&error.code==='unsupported_version');
  assert.equal(uploads,0);
  assert.equal(registrations,0);
});

test("v4 Git reference binds all reviewed resource descriptors to the immutable record",()=>{
  const record=structuredClone(createObjectBackedRoundTripCases().created.record) as any;
  const id=record.identity, version=id.siteVersionId;
  record.schemaVersion=RESOURCE_RECORD_VERSION;
  record.candidate.manifest.conversionVersion=RESOURCE_CONVERSION_VERSION;
  record.candidate.manifest.provenance.sourceSnapshotSha256=REVIEWED_LUMOS_SOURCE;
  record.candidate.manifest.assetHandling.mode='typed_export_resources';
  record.candidate.manifest.assetHandling.externalAssetStorageRequired=true;
  record.candidate.resourcePayloads=policy.files.map(file=>({path:file.path,mediaType:exportMediaType(file.path),
    sizeBytes:file.sizeBytes,sha256:file.sha256,kind:'export_resource',bucket:'gnr8-preview-bundles',
    key:['candidate-v4',id.organizationId,id.ownershipSiteId,version,id.candidateId,'resources',
      Buffer.from(file.path).toString('base64url')+'-'+file.sha256].join('/')}));
  const pkg=generatedArtifactGitPackage({scope:{agencyId:id.agencyId,clientId:id.organizationId,
    siteId:id.ownershipSiteId},runtimeSiteId:id.runtimeSiteId,siteVersionId:version,
    htmlByPath:{'/':'<!doctype html><html></html>'},compiledTokenStyles:'',
    manifest:record.candidate.manifest,target:{owner:'owner',ownerId:1,repository:'repo',repositoryId:1,token:'token'}});
  record.generatedGitArchive={scope:pkg.descriptor.scope,repository:'owner/repo',commit:'a'.repeat(40),
    manifestPath:pkg.manifestPath,manifestSha256:pkg.manifestSha256,
    routes:Object.entries(record.candidate.routePayloads).map(([route,ref]:[string,any])=>({route,
      path:`generated/${version}/html/${createHash('sha256').update(route).digest('hex')}.html`,
      bytes:ref.sizeBytes,sha256:ref.sha256})),
    styles:{path:`generated/${version}/compiled-token-styles.css`,bytes:record.candidate.compiledTokenStyles.sizeBytes,
      sha256:record.candidate.compiledTokenStyles.sha256},runtimeManifest:pkg.descriptor.runtimeManifest,
    resources:record.candidate.resourcePayloads.map((ref:any)=>({sourcePath:ref.path,
      path:`generated/${version}/resources/${Buffer.from(ref.path).toString('base64url')}-${ref.sha256}`,
      mediaType:ref.mediaType,bytes:ref.sizeBytes,sha256:ref.sha256}))};
  const {storageSha256:_old,...unsigned}=record;
  record.storageSha256=computeAstroObjectBackedCandidateStorageSha256(unsigned);
  assert.equal(validateAstroObjectBackedCandidateRecord(record).schemaVersion,RESOURCE_RECORD_VERSION);
  record.generatedGitArchive.resources[0].sha256='0'.repeat(64);
  const {storageSha256:_hash,...changed}=record;
  record.storageSha256=computeAstroObjectBackedCandidateStorageSha256(changed);
  assert.throws(()=>validateAstroObjectBackedCandidateRecord(record));
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
    getClient: () => ({ storage: { getBucket: async () => ({data:{public:false},error:null}),
      from: () => bucketClient } }) as never,
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

test("public candidate bucket is rejected before file access", async () => {
  let fileAccesses = 0;
  const store = new SupabaseAstroCandidateObjectStore({
    bucket: "astro-candidates-private",
    getClient: () => ({storage:{
      getBucket: async () => ({data:{public:true},error:null}),
      from: () => {fileAccesses++; throw Error("unexpected file access");},
    }}) as never,
  });
  const file = prepareForStoreTest();
  for (const action of [() => store.putVerified(file), () => store.readVerified(file.ref)]) {
    await assert.rejects(action(),
      (error: unknown) => error instanceof AstroCandidateObjectStoreError && error.code === "configuration_invalid");
  }
  assert.equal(fileAccesses, 0);
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


test("owned controllers and native contact survive immutable registration and readback; spoofing fails closed", async () => {
  const source = '<form class="wpcf7-form" method="post"><input name="your-name" required placeholder="Name"><input type="email" name="your-email" required placeholder="Email"><input name="your-subject" placeholder="Subject"><textarea name="your-message" placeholder="Message"></textarea><input type="submit" value="Send"></form>';
  const doc = parse(`<!doctype html>${source}`);
  assert.equal(replaceSupportedContactForm(contactElements(doc).find(n => n.tagName === "form")!, "/contact"), true);
  const scripts = `<script data-gnr8-preview-runtime="retained-hero">${RETAINED_HERO_SCRIPT}</script><script data-gnr8-preview-runtime="contact-form">${CONTACT_FORM_SCRIPT}</script>`;
  const page = serialize(doc).replace("</body>", `${scripts}</body>`);
  const input = createLargeInput();
  input.candidate.htmlByPath = {"/": html("Home", scripts, ""), "/contact": page};
  input.candidate.contentSha256 = computeAstroInternalPreviewCandidateContentSha256(input.candidate);
  input.candidate.manifest.provenance.convertedArtifactSha256 = input.candidate.contentSha256;
  const repository = createRepository(new InMemoryAstroProductionCandidateGateway(), new InMemoryAstroCandidateObjectStore());
  await repository.create(input);
  const restored = await repository.read({candidateId: CANDIDATE_ID, trustedScope: OWNERSHIP});
  assert.equal(restored.candidate.htmlByPath["/contact"], page);
  assert.deepEqual(readContactSchema(restored.candidate.htmlByPath["/contact"]!), {fields:["name","email","subject","message"],required:["name","email"]});
  assert.equal((await repository.create(input)).status, "idempotent");
  for (const invalid of [
    page.replace(RETAINED_HERO_SCRIPT, "alert(1)"),
    page.replace('<script ', '<script src="https://example.com/script.js" '),
    page.replace('action="/api/gnr8/runtime/contact?path=%2Fcontact"', 'action="https://example.com/contact"'),
    page.replace('name="subject"', 'name="recipient"'),
    page.replace('type="submit"', 'type="submit" formaction="https://example.com/contact"'),
    page.replace('data-gnr8-contact="v1"', 'data-gnr8-contact="fake"'),
    page.replace('</body>', '<form method="post"></form></body>'),
    page.replace('name="name"', 'name="name" onclick="alert(1)"'),
  ]) assert.throws(() => validateSelfContainedAstroProductionPayload({html:invalid,compiledTokenStyles:""}));
});
