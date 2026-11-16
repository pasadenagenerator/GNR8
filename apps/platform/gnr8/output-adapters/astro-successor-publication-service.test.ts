import assert from "node:assert/strict";
import test from "node:test";

import { createSyntheticAstroInternalPreviewCandidate } from "./astro-internal-preview-candidate-test-fixture";
import {
  createAstroProductionCandidateRecord,
  type AstroProductionCandidateOwnership,
} from "./astro-production-candidate-record";
import {
  ASTRO_SUCCESSOR_PRODUCER_KIND,
  ASTRO_SUCCESSOR_PRODUCER_VERSION,
  AstroSuccessorPublicationError,
  createAstroSuccessorPublicationService,
  prepareSuccessorSourceGit,
  buildSuccessorBoundAstroCandidate,
  deriveAstroSuccessorOperationIdentity,
  prepareSuccessorPreallocationManifest,
} from "./astro-successor-publication-service";

const SOURCE_VERSION_ID = "11111111-1111-4111-8111-111111111111";
const SOURCE_CANDIDATE_ID = "astro_candidate_22222222222242228222222222222222";
const RUNTIME_SITE_ID = "runtime-site-astro-successor";
const SOURCE_OWNERSHIP: AstroProductionCandidateOwnership = {
  runtimeSiteId: RUNTIME_SITE_ID,
  siteVersionId: SOURCE_VERSION_ID,
  ownershipSiteId: "33333333-3333-4333-8333-333333333333",
  organizationId: "44444444-4444-4444-8444-444444444444",
  agencyId: "55555555-5555-4555-8555-555555555555",
};

test('successor retry stops before candidate access when its Git source is missing or has DB content',async t=>{
  const keys=['GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED','GNR8_STACKI_GITHUB_ENABLED',
    'GNR8_STACKI_GITHUB_BINDINGS_ENABLED'] as const;
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  t.after(()=>{for(const key of keys)if(previous[key]===undefined)delete process.env[key];
    else process.env[key]=previous[key];});
  for(const key of keys)process.env[key]='0';
  const operation=deriveAstroSuccessorOperationIdentity({runtimeSiteId:RUNTIME_SITE_ID,
    sourceSiteVersionId:SOURCE_VERSION_ID,sourceCandidateId:SOURCE_CANDIDATE_ID});
  const sourceArtifactId='66666666-6666-4666-8666-666666666666';
  const source={id:SOURCE_VERSION_ID,siteId:RUNTIME_SITE_ID,artifactId:sourceArtifactId};
  const successor={id:operation.successorSiteVersionId,siteId:RUNTIME_SITE_ID,artifactId:null};
  const ref={scope:{agencyId:SOURCE_OWNERSHIP.agencyId,clientId:SOURCE_OWNERSHIP.organizationId,
    siteId:SOURCE_OWNERSHIP.ownershipSiteId},
    manifestPath:`generated/${operation.successorSiteVersionId}/.gnr8-generated-manifest.json`};
  let status:{reference:typeof ref;metadataOnly:boolean}|null=null;
  let candidateReads=0;
  const service=createAstroSuccessorPublicationService({
    getSiteVersion:async id=>id===SOURCE_VERSION_ID?source as never:successor as never,
    getRuntimeSiteSummary:async()=>({id:RUNTIME_SITE_ID}) as never,
    getActiveHostBindingForHost:async()=>({siteId:RUNTIME_SITE_ID,host:'internal.example.test',status:'ACTIVE'}) as never,
    getActivePointerForSite:async()=>({siteVersionId:SOURCE_VERSION_ID,artifactId:sourceArtifactId}),
    resolveOwnership:async()=>SOURCE_OWNERSHIP,
    getSiteVersionGitSourceStatus:async id=>id===SOURCE_VERSION_ID
      ? {reference:ref as never,metadataOnly:true}:status as never,
    candidateRepository:{read:async()=>{candidateReads++;throw Error('candidate read reached');}} as never,
  } as never);
  const input={actorUserId:'actor',runtimeSiteId:RUNTIME_SITE_ID,
    sourceSiteVersionId:SOURCE_VERSION_ID,sourceCandidateId:SOURCE_CANDIDATE_ID,
    sourceArtifactId,expectedSourceContentSha256:'a'.repeat(64),
    expectedSourceStorageSha256:'b'.repeat(64),
    expectedActivePointer:{siteVersionId:SOURCE_VERSION_ID,artifactId:sourceArtifactId},
    expectedInternalHost:'internal.example.test',stage:'shadow' as const};
  for(status of [null,{reference:ref,metadataOnly:false}]){
    await assert.rejects(service(input),(error:unknown)=>error instanceof AstroSuccessorPublicationError&&
      error.code==='successor_git_source_reference_missing');
    assert.equal(candidateReads,0);
  }
  status={reference:ref,metadataOnly:true};
  await assert.rejects(service(input),/candidate read reached/);
  assert.equal(candidateReads,1,'valid Git metadata reaches the next publication step even with flags disabled');
});

test("successor preallocation requires its own Git archive before artifact write",async t=>{
  const keys=['GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED','GNR8_STACKI_GITHUB_ENABLED','GNR8_STACKI_GITHUB_SITE_IDS'] as const;
  const previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  t.after(()=>{for(const key of keys)if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];});
  const candidate=createSyntheticAstroInternalPreviewCandidate({candidateId:SOURCE_CANDIDATE_ID,
    siteId:RUNTIME_SITE_ID,siteVersionId:SOURCE_VERSION_ID});
  const manifest={artifactSource:'astro_successor_preallocation'};
  const input={candidate,manifest,ownership:SOURCE_OWNERSHIP};
  Object.assign(process.env,{GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED:'1',GNR8_STACKI_GITHUB_ENABLED:'1',
    GNR8_STACKI_GITHUB_SITE_IDS:JSON.stringify([SOURCE_OWNERSHIP.ownershipSiteId])});
  const sourcePage={pageId:'home',path:'/',title:'Source title',structureModel:{},contentModel:{},
    styleTokens:{},assetGraph:[],semanticSignals:[],source:'migration',actor:'test'};
  const lineage={kind:'astro_generated_content_successor_v1'} as never;
  const sourceArchive={commit:'b'.repeat(40)} as never;
  assert.equal(await prepareSuccessorSourceGit({pages:[sourcePage] as never,lineage,
    candidate:candidate as never,ownership:{...SOURCE_OWNERSHIP,siteVersionId:SOURCE_VERSION_ID},
    prepareGeneratedGit:async(artifact,owner)=>{
      assert.deepEqual(owner,SOURCE_OWNERSHIP);
      assert.deepEqual((artifact.manifest.sourceMigrationPayload as {pages:unknown[]}).pages,[sourcePage]);
      assert.equal(typeof artifact.manifest.sourceMigrationPayloadSha256,'string');
      return sourceArchive;
    }}),sourceArchive);
  await assert.rejects(prepareSuccessorPreallocationManifest({...input,prepareGeneratedGit:async()=>null}),
    (error:unknown)=>error instanceof AstroSuccessorPublicationError&&error.code==='successor_git_archive_required');
  const archive={commit:'a'.repeat(40)} as never;
  assert.deepEqual(await prepareSuccessorPreallocationManifest({...input,prepareGeneratedGit:async(artifact,owner)=>{
    assert.deepEqual(artifact.htmlByPath,candidate.htmlByPath);
    assert.deepEqual(owner,SOURCE_OWNERSHIP);
    return archive;
  }}),{...manifest,generatedGitArchive:archive});
  process.env.GNR8_GITHUB_RAW_IMPORT_ARCHIVE_ENABLED='0';
  assert.deepEqual(await prepareSuccessorPreallocationManifest({...input,prepareGeneratedGit:async()=>null}),manifest);
});

test("derives stable canonical successor identities from immutable source lineage", () => {
  const first = deriveAstroSuccessorOperationIdentity({
    runtimeSiteId: RUNTIME_SITE_ID,
    sourceSiteVersionId: SOURCE_VERSION_ID,
    sourceCandidateId: SOURCE_CANDIDATE_ID,
  });
  const repeat = deriveAstroSuccessorOperationIdentity({
    runtimeSiteId: RUNTIME_SITE_ID,
    sourceSiteVersionId: SOURCE_VERSION_ID,
    sourceCandidateId: SOURCE_CANDIDATE_ID,
  });

  assert.deepEqual(repeat, first);
  assert.match(first.successorSiteVersionId, /^[0-9a-f-]{36}$/);
  assert.match(first.successorCandidateOperationId, /^[0-9a-f-]{36}$/);
  assert.match(first.successorCandidateId, /^astro_candidate_[0-9a-f]{32}$/);
  assert.notEqual(first.successorSiteVersionId, SOURCE_VERSION_ID);
});

test("rebinds ownership while preserving source Astro HTML, CSS, assets, and provenance", () => {
  const sourceCandidate = createSyntheticAstroInternalPreviewCandidate({
    candidateId: SOURCE_CANDIDATE_ID,
    siteId: RUNTIME_SITE_ID,
    siteVersionId: SOURCE_VERSION_ID,
  });
  const sourceRecord = createAstroProductionCandidateRecord({
    candidate: sourceCandidate,
    ownership: SOURCE_OWNERSHIP,
    registration: {
      registeredByActorId: "actor-source",
      producerKind: "source-producer",
      producerVersion: "v1",
      producerRef: "source-ref",
      idempotencyKey: "source-idempotency",
      correlationId: "source-correlation",
    },
    storedAt: "2026-09-29T10:00:00.000Z",
  });
  const identity = deriveAstroSuccessorOperationIdentity({
    runtimeSiteId: RUNTIME_SITE_ID,
    sourceSiteVersionId: SOURCE_VERSION_ID,
    sourceCandidateId: SOURCE_CANDIDATE_ID,
  });
  const candidate = buildSuccessorBoundAstroCandidate({
    source: sourceRecord,
    successorSiteVersionId: identity.successorSiteVersionId,
    successorCandidateId: identity.successorCandidateId,
    createdAt: "2026-09-30T10:00:00.123456+00:00",
  });

  assert.deepEqual(candidate.htmlByPath, sourceRecord.candidate.htmlByPath);
  assert.equal(candidate.compiledTokenStyles, sourceRecord.candidate.compiledTokenStyles);
  assert.deepEqual(candidate.assetFingerprintMap, sourceRecord.candidate.assetFingerprintMap);
  assert.deepEqual(candidate.manifest.provenance, {
    ...sourceRecord.candidate.manifest.provenance,
    convertedArtifactSha256: candidate.contentSha256,
  });
  assert.equal(candidate.siteVersionId, identity.successorSiteVersionId);
  assert.equal(candidate.createdAt, "2026-09-30T10:00:00.123Z");
  assert.equal(candidate.manifest.ownership.siteVersionId, identity.successorSiteVersionId);
  assert.notEqual(candidate.contentSha256, sourceRecord.candidate.contentSha256);

  const successorRecord = createAstroProductionCandidateRecord({
    candidate,
    ownership: { ...SOURCE_OWNERSHIP, siteVersionId: identity.successorSiteVersionId },
    registration: {
      registeredByActorId: "actor-successor",
      producerKind: ASTRO_SUCCESSOR_PRODUCER_KIND,
      producerVersion: ASTRO_SUCCESSOR_PRODUCER_VERSION,
      producerRef: SOURCE_CANDIDATE_ID,
      idempotencyKey: identity.idempotencyKey,
      correlationId: identity.correlationId,
    },
    storedAt: "2026-09-30T10:01:00.000Z",
  });
  assert.equal(successorRecord.registration.producerRef, SOURCE_CANDIDATE_ID);
  assert.equal(successorRecord.candidate.manifest.lifecycle.storage, "supabase_postgres");
});
