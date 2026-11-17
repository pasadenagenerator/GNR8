import assert from 'node:assert/strict'
import test from 'node:test'
import {parseSiteAstroGenerationPayload} from './site-astro-generation-payload'
const payload={actionId:'action',requestedAt:'2026-10-18T12:00:00.000Z',ownershipSiteId:'owner',runtimeSiteId:'runtime',sourceSiteVersionId:'version',sourceArtifactId:'artifact',actor:'test',strategy:'balanced'}
test('worker retains exact Lumos guide identity and rejects foreign capture or invalid revision',()=>{
 const lumosBrand={siteVersionId:'10000000-0000-4000-8000-000000000001',artifactId:'10000000-0000-4000-8000-000000000002',revision:3};
 const input={...payload,sourceSiteVersionId:lumosBrand.siteVersionId,requestedAdapterId:'astro-static-site',lumosBrand};
 assert.deepEqual(parseSiteAstroGenerationPayload(input)?.lumosBrand,lumosBrand);
 assert.equal(parseSiteAstroGenerationPayload({...input,sourceSiteVersionId:'other'}),null);
 assert.equal(parseSiteAstroGenerationPayload({...input,lumosBrand:{...lumosBrand,revision:0}}),null);
 assert.equal(parseSiteAstroGenerationPayload({...input,requestedAdapterId:'html-static-artifact'}),null);
});
test('worker preserves exact Stacki revision and rejects scope/hash drift or replacement contact settings', () => {
  const scope = { agencyId: '10000000-0000-4000-8000-000000000001', clientId: '10000000-0000-4000-8000-000000000002',
    siteId: '10000000-0000-4000-8000-000000000003', siteVersionId: '10000000-0000-4000-8000-000000000004' };
  const input = { ...payload, ownershipSiteId: scope.siteId, sourceSiteVersionId: scope.siteVersionId,
    stackiRevision: { scope, revision: 3, sha256: 'a'.repeat(64) }, stackiSourceArtifactSha256: 'b'.repeat(64) };
  assert.deepEqual(parseSiteAstroGenerationPayload(input), input);
  assert.equal(parseSiteAstroGenerationPayload({ ...input, ownershipSiteId: 'another' }), null);
  assert.equal(parseSiteAstroGenerationPayload({ ...input, stackiSourceArtifactSha256: undefined }), null);
  assert.equal(parseSiteAstroGenerationPayload({ ...input, stackiRevision: undefined }), null);
  assert.equal(parseSiteAstroGenerationPayload({ ...input, acceptedFunctionalReductions: {kind:'retained-presentation-v1',search:'remove',map:'address-link',tracking:'remove-bundle'} }), null);
});
test('worker event parser preserves scoped presentation decisions and rejects mixed form consent',()=>{
  const acceptedFunctionalReductions={kind:'retained-presentation-v1',search:'remove',map:'address-link',tracking:'remove-bundle',excludedRoutes:[{path:'/home',reason:'obsolete-template'}]}
  assert.deepEqual(parseSiteAstroGenerationPayload({...payload,acceptedFunctionalReductions}),{...payload,acceptedFunctionalReductions})
  assert.equal(parseSiteAstroGenerationPayload({...payload,acceptedFunctionalReductions:{...acceptedFunctionalReductions,contactEmail:'test@example.com'}}),null)
  assert.equal(parseSiteAstroGenerationPayload({...payload,sourceArtifactId:''}),null)
  assert.deepEqual(parseSiteAstroGenerationPayload(payload),payload)
})
test('worker keeps the legacy reduction contract distinct',()=>{
  const acceptedFunctionalReductions={kind:'legacy-forms-to-disclosed-links-v1',contactEmail:'Test@Example.com',commentLinks:'source-article'}
  assert.deepEqual(parseSiteAstroGenerationPayload({...payload,acceptedFunctionalReductions})?.acceptedFunctionalReductions,{...acceptedFunctionalReductions,contactEmail:'test@example.com'})
})
test('worker forwards explicit native contact settings and does not infer recipient consent',()=>{
 const acceptedFunctionalReductions={kind:'retained-presentation-v1',search:'remove',map:'address-link',tracking:'remove-bundle',contact:{recipient:'approved@example.com',recipientConfirmed:true},excludedRoutes:[{path:'/obsolete',reason:'obsolete-template'}]}
 assert.deepEqual(parseSiteAstroGenerationPayload({...payload,acceptedFunctionalReductions})?.acceptedFunctionalReductions,acceptedFunctionalReductions)
 assert.equal(parseSiteAstroGenerationPayload({...payload,acceptedFunctionalReductions:{...acceptedFunctionalReductions,contact:{recipient:'approved@example.com'}}}),null)
})
test('ordinary UI builder round-trips through API validation and Worker without site defaults',async()=>{
 const {createRetainedPresentationSettings,parseAcceptedFunctionalReductions}=await import('@gnr8/runtime-contracts')
 const ui=createRetainedPresentationSettings({excludedPaths:'/obsolete\n/unused',nativeContact:true,recipient:'approved@example.com',recipientConfirmed:true})
 const api=parseAcceptedFunctionalReductions(JSON.parse(JSON.stringify(ui)))
 assert.deepEqual(parseSiteAstroGenerationPayload({...payload,acceptedFunctionalReductions:api})?.acceptedFunctionalReductions,ui)
 assert.equal(createRetainedPresentationSettings({excludedPaths:'/obsolete',nativeContact:true,recipient:'approved@example.com',recipientConfirmed:false}),null)
})

test('worker preserves source-link scope and requires the explicit native recipient',()=>{
 const acceptedFunctionalReductions={kind:'retained-source-links-v1',uncapturedRoutes:'source',complexForms:'source-page',contact:{recipient:'approved@example.com',recipientConfirmed:true}}
 assert.deepEqual(parseSiteAstroGenerationPayload({...payload,acceptedFunctionalReductions})?.acceptedFunctionalReductions,acceptedFunctionalReductions)
 assert.equal(parseSiteAstroGenerationPayload({...payload,acceptedFunctionalReductions:{...acceptedFunctionalReductions,contact:{recipient:'approved@example.com',recipientConfirmed:false}}}),null)
})

test('preserved functions retain the confirmed recipient and only the approved route exclusion',()=>{
 const lumosBrand={siteVersionId:'10000000-0000-4000-8000-000000000001',artifactId:'10000000-0000-4000-8000-000000000002',revision:1};
 const retainedFunctions={kind:'retained-functions-v1',contact:{recipient:'komerciala@logatcan.si',recipientConfirmed:true},excludedRoutes:[{path:'/home',reason:'obsolete-template'}]};
 const input={...payload,sourceSiteVersionId:lumosBrand.siteVersionId,requestedAdapterId:"astro-static-site",lumosBrand,retainedFunctions};
 assert.deepEqual(parseSiteAstroGenerationPayload(input)?.retainedFunctions,retainedFunctions);
 assert.equal(parseSiteAstroGenerationPayload({...input,lumosBrand:undefined}),null);
 assert.equal(parseSiteAstroGenerationPayload({...input,retainedFunctions:{...retainedFunctions,contact:{...retainedFunctions.contact,recipientConfirmed:false}}}),null);
 assert.equal(parseSiteAstroGenerationPayload({...input,retainedFunctions:{...retainedFunctions,excludedRoutes:[{path:'/',reason:'obsolete-template'}]}}),null);
});

test('omitting missing backgrounds is explicit, exact and does not authorize route removal',()=>{
 const lumosBrand={siteVersionId:'10000000-0000-4000-8000-000000000001',artifactId:'10000000-0000-4000-8000-000000000002',revision:1};
 const retainedFunctions={kind:'retained-functions-v1',contact:{recipient:'approved@example.com',recipientConfirmed:true},omittedBackgroundImages:['http://example.com/missing.png']};
 const input={...payload,sourceSiteVersionId:lumosBrand.siteVersionId,requestedAdapterId:'astro-static-site',lumosBrand,retainedFunctions};
 assert.deepEqual(parseSiteAstroGenerationPayload(input)?.retainedFunctions,retainedFunctions);
 for(const urls of [['javascript:alert(1)'],['https://user:password@example.com/image.jpg'],['http://example.com/missing.png','http://example.com/missing.png']])assert.equal(parseSiteAstroGenerationPayload({...input,retainedFunctions:{...retainedFunctions,omittedBackgroundImages:urls}}),null);
});
