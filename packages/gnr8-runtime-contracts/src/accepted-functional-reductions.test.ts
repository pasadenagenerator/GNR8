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

test('exact html route exclusions allow a final extension without accepting traversal or encoded paths',()=>{
  const path='/wp-content/plugins/smart-cookie-kit/res/empty.html'
  assert.deepEqual(parseAcceptedFunctionalReductions({...presentation,excludedRoutes:[{path,reason:'obsolete-template'}]}),{...presentation,excludedRoutes:[{path,reason:'obsolete-template'}]})
  for(const path of ['/','/../empty.html','/safe/../empty.html','/safe/./empty.html','/safe//empty.html','/safe/%2e%2e/empty.html','/safe/empty%2ehtml','/safe/empty.html?x=1','/safe/empty.html#x','/safe/empty.html/child','/safe/empty..html','//host/empty.html']) assert.equal(parseAcceptedFunctionalReductions({...presentation,excludedRoutes:[{path,reason:'obsolete-template'}]}),null)
})

test('native contact requires exact recipient confirmation and rejects hidden destination options',()=>{
 const base={kind:'retained-presentation-v1',search:'remove',map:'address-link',tracking:'remove-bundle'}
 const contact={recipient:'approved@example.com',recipientConfirmed:true}
 assert.deepEqual(parseAcceptedFunctionalReductions({...base,contact}),{...base,contact})
 for(const value of [{...contact,recipientConfirmed:false},{...contact,recipient:'a@b.com\r\nBcc: c@d.com'},{...contact,recipient:['a@b.com']},{...contact,siteId:'foreign'},{...contact,recipient:'a'.repeat(255)+'@example.com'}]) assert.equal(parseAcceptedFunctionalReductions({...base,contact:value}),null)
})
