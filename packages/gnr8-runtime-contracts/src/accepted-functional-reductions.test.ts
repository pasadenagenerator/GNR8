import assert from 'node:assert/strict'
import test from 'node:test'
import { parseAcceptedFunctionalReductions } from './accepted-functional-reductions'
const presentation = {kind:'retained-presentation-v1',search:'remove',map:'address-link',tracking:'remove-bundle'}
test('presentation reductions are explicit and cannot authorize contact replacement or partial tracking removal',()=>{
  assert.deepEqual(parseAcceptedFunctionalReductions(presentation),presentation)
  for(const value of [null,[],{}, {...presentation,tracking:'banner-only'}, {...presentation,contactEmail:'test@example.com'}, {...presentation,sourceWidgetRemovals:['form-captcha']}, {...presentation,map:undefined}]) assert.equal(parseAcceptedFunctionalReductions(value),null)
})
test('legacy reductions retain their existing explicit contract',()=>{
  const legacy={kind:'legacy-forms-to-disclosed-links-v1',contactEmail:'Test@Example.com',commentLinks:'source-article',sourceWidgetRemovals:['form-captcha']}
  assert.deepEqual(parseAcceptedFunctionalReductions(legacy),{...legacy,contactEmail:'test@example.com'})
  assert.equal(parseAcceptedFunctionalReductions({...legacy,sourceWidgetRemovals:['form-captcha','form-captcha']}),null)
})

test('route exclusions are explicit, canonical, and cannot exclude the root or ambiguous paths',()=>{
  assert.deepEqual(parseAcceptedFunctionalReductions({...presentation,excludedRoutes:[{path:'/home/',reason:'obsolete-template'}]}),{...presentation,excludedRoutes:[{path:'/home',reason:'obsolete-template'}]})
  for(const path of ['/','//home','/home?x=1','/home/../','/%68ome']) assert.equal(parseAcceptedFunctionalReductions({...presentation,excludedRoutes:[{path,reason:'obsolete-template'}]}),null)
  assert.equal(parseAcceptedFunctionalReductions({...presentation,excludedRoutes:[{path:'/home',reason:'obsolete-template'},{path:'/home/',reason:'obsolete-template'}]}),null)
})
