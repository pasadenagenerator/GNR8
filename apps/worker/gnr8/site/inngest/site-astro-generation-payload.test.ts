import assert from 'node:assert/strict'
import test from 'node:test'
import {parseSiteAstroGenerationPayload} from './site-astro-generation-payload'
const payload={actionId:'action',requestedAt:'2026-10-18T12:00:00.000Z',ownershipSiteId:'owner',runtimeSiteId:'runtime',sourceSiteVersionId:'version',sourceArtifactId:'artifact',actor:'test',strategy:'balanced'}
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
