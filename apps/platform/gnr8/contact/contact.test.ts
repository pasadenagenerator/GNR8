import assert from 'node:assert/strict'
import test from 'node:test'
import {parse,serialize} from 'parse5'
import {contactElements,readContactSchema,replaceSupportedContactForm} from './contact-form'
import {createContactPost, type ContactDelivery, type ContactOutcome, type PublishedContact} from './contact-submission'
import {publishedContactFromResolution} from './published-contact'
import {prepareOwnedRetainedRuntimeForAstro} from '../../src/public-site/owned-retained-runtime'
import {CONTACT_FORM_SCRIPT} from '../../src/public-site/contact-form-runtime'

export const basicForm = '<form class="wpcf7-form" method="post" action="/wp-json/contact"><input type="hidden" name="_wpcf7" value="94"><div class="column one-second"><input name="your-name" aria-required="true" placeholder="Ime in priimek"></div><div class="column one-second"><input type="email" name="your-email" aria-required="true" placeholder="E-mail"></div><input type="tel" name="your-phone" placeholder="Telefon"><textarea name="your-message" placeholder="Sporočilo"></textarea><input type="submit" value="Pošlji"></form>'
function converted(source = basicForm) { const doc = parse(source); const form = contactElements(doc).find(n=>n.tagName==='form')!; const ok = replaceSupportedContactForm(form,'/kontakt'); return {ok,html:serialize(doc)} }
test('conversion preserves columns, labels and optional distinctions; unexpected fields fail without mutation',()=>{
  const {ok,html}=converted(); assert.equal(ok,true); assert.match(html,/class="column one-second"/); assert.match(html,/aria-label="Ime in priimek"/); assert.doesNotMatch(html,/wp-json|name="_wpcf7"/)
  assert.deepEqual(readContactSchema(html),{fields:['name','email','phone','message'],required:['name','email']})
  for (const field of ['<input name="your-subject">','<input type="checkbox" name="dovoljenje[]">','<input type="file" name="file">','<input type="hidden" name="recipient" value="other@example.com">','<select name="booking"></select>','<input name="constructor">','<input name="__proto__">']) {
    const source=basicForm.replace('</form>',field+'</form>'), result=converted(source)
    assert.equal(result.ok,false); assert.equal(result.html,serialize(parse(source)))
  }
  for (const source of [basicForm.replace('wpcf7-form','newsletter'),basicForm.replace('name="your-name"','name="comment"'),basicForm.replace('name="your-phone"','name="your-phone" required')]) assert.equal(converted(source).ok,false)
})
test('only exact owned contact script survives Astro',()=>{
  const script=`<script data-gnr8-preview-runtime="contact-form">${CONTACT_FORM_SCRIPT}</script>`
  assert.match(prepareOwnedRetainedRuntimeForAstro(script),/is:inline/)
  for(const unsafe of [script.replace(CONTACT_FORM_SCRIPT,'alert(1)'),script.replace('<script ','<script src="contact.js" '),script.replace('<script ','<script onload="alert(1)" ')]) assert.throws(()=>prepareOwnedRetainedRuntimeForAstro(unsafe))
})
const site:PublishedContact={siteId:'site-one',siteVersionId:'version-one',pagePath:'/kontakt',artifactId:'artifact-one',artifactSha256:'a'.repeat(64),recipient:'approved@example.com',fields:['name','email','phone','message'],required:['name','email']}
function request(values:Record<string,string>={},headers:Record<string,string>={},url='https://site.example/api/gnr8/runtime/contact?path=%2Fkontakt') {
  return new Request(url,{method:'POST',headers:{origin:'https://site.example',accept:'application/json','content-type':'application/x-www-form-urlencoded',...headers},body:new URLSearchParams({name:'Example',email:'visitor@example.com',message:'Hello',website:'',requestId:'11111111-1111-4111-8111-111111111111',...values})})
}
// Explicit test double only; production delivery stays disabled. Atomic/durable
// storage semantics must be established before a production implementation binds.
function fixture(outcome:'accepted'|'failed'|'throw'='accepted') {
  let sends=0,claims=0;const records=new Map<string,{hash:string;outcome:ContactOutcome|'pending'}>()
  const delivery:ContactDelivery={verifiedSender:'verified@example.com',claim:async input=>{claims++;const previous=records.get(input.key);if(previous)return previous.hash===input.payloadHash?{status:'duplicate',outcome:previous.outcome}:{status:'conflict'};records.set(input.key,{hash:input.payloadHash,outcome:'pending'});return {status:'claimed',submissionId:input.key}},finish:async(id,outcome)=>{records.get(id)!.outcome=outcome},send:async message=>{sends++;assert.equal(message.to,site.recipient);assert.equal(message.from,'verified@example.com');assert.equal(message.replyTo,'visitor@example.com');if(outcome==='throw')throw Error('secret provider text');return outcome}}
  return {delivery,post:createContactPost({resolve:async(host)=>host==='site.example'?site:null,delivery}),sends:()=>sends,claims:()=>claims}
}
test('validated published submission distinguishes provider acceptance and retries without duplicate sending',async()=>{
  const f=fixture();assert.equal((await f.post(request())).status,200);assert.equal((await f.post(request())).status,200);assert.equal(f.sends(),1)
  assert.equal((await f.post(request({message:'changed'}))).status,409);assert.equal(f.sends(),1)
  const concurrent=fixture();await Promise.all([concurrent.post(request()),concurrent.post(request())]);assert.equal(concurrent.sends(),1)
  const noJs=fixture();await noJs.post(request({requestId:''}));await noJs.post(request({requestId:''}));assert.equal(noJs.sends(),1)
})
test('malformed, oversized, injected, arbitrary destination and honeypot payloads never claim or send',async()=>{
  const f=fixture()
  for(const values of [{recipient:'evil@example.com'},{siteId:'foreign'},{name:'x\r\nBcc:evil@example.com'},{email:'visitor@example.com\r\nBcc:x@y.com'},{name:''},{message:'x'.repeat(5001)},{website:'bot'},{requestId:'bad'}, {phone:'x'.repeat(41)}]) assert.equal((await f.post(request(values))).status,400)
  assert.equal((await f.post(request({}, {'content-length':'24001'}))).status,400)
  assert.equal((await f.post(request({}, {'content-type':'application/json'}))).status,400)
  const duplicate=request(); const body=await duplicate.text();assert.equal((await f.post(new Request(duplicate.url,{method:'POST',headers:duplicate.headers,body:body+'&email=other@example.com'}))).status,400)
  assert.equal((await f.post(new Request(duplicate.url,{method:'POST',headers:duplicate.headers,body:body+'&phone=%FF'}))).status,400)
  assert.equal(f.claims(),0);assert.equal(f.sends(),0)
})
test('cross-origin, preview, unknown sites and unconfigured delivery fail closed',async()=>{
  const f=fixture();assert.equal((await f.post(request({}, {origin:'null'}))).status,403)
  assert.equal((await f.post(request({}, {'sec-fetch-site':'cross-site'}))).status,403)
  assert.equal((await createContactPost({resolve:async()=>null,delivery:f.delivery})(request())).status,403)
  assert.equal((await createContactPost({resolve:async()=>site,delivery:null})(request())).status,503)
  assert.equal(f.sends(),0)
})
test('provider failure/uncertainty, storage failure and durable rate-limit rejection are never success',async()=>{
  for(const outcome of ['failed','throw'] as const){const f=fixture(outcome);const response=await f.post(request());assert.equal(response.status,502);assert.doesNotMatch(await response.text(),/secret provider text/);assert.equal((await f.post(request())).status,409);assert.equal(f.sends(),1)}
  const f=fixture(); f.delivery.claim=async()=>({status:'rate_limited'});assert.equal((await f.post(request())).status,429);assert.equal(f.sends(),0)
  f.delivery.claim=async()=>{throw Error('private')};assert.equal((await f.post(request())).status,503)
})
test('published resolver enforces ownership, active version, explicit recipient and public binding',()=>{
  const settings={kind:'retained-presentation-v1',search:'remove',map:'address-link',tracking:'remove-bundle',contact:{recipient:site.recipient,recipientConfirmed:true},scope:'generation-action',acceptedByActor:'user:owner'}
  const resolution:any={outcome:'artifact_hit',siteResolution:'domain_match',ownershipSiteId:'owner',resolvedPath:'/kontakt',normalizedPath:'/kontakt',siteId:site.siteId,activeSiteVersionId:site.siteVersionId,artifactId:site.artifactId,domainBindingStatus:'active',hostBindingKind:null,html:converted().html,artifact:{id:site.artifactId,bundleSha256:site.artifactSha256,siteId:site.siteId,siteVersionId:site.siteVersionId,publishStage:'production',shadowRestricted:false,manifest:{generatedOutputSourceWorkspace:{acceptedFunctionalReductions:settings}}}}
  assert.deepEqual(publishedContactFromResolution(resolution,'/kontakt'),site)
  for(const patch of [{siteResolution:'preview_host_match'},{siteResolution:'fallback_latest_site'},{ownershipSiteId:null},{activeSiteVersionId:'foreign'},{siteId:'foreign'},{resolvedPath:'/'},{domainBindingStatus:'pending'},{hostBindingKind:'preview_host'}]) assert.equal(publishedContactFromResolution({...resolution,...patch},'/kontakt'),null)
})

test('native no-JS POST returns a static result without reflecting visitor input',async()=>{
 const f=fixture();const response=await f.post(request({requestId:'',message:'<script>private content</script>'},{accept:'text/html'}))
 assert.equal(response.status,200);assert.match(response.headers.get('content-type')!,/text\/html/);assert.doesNotMatch(await response.text(),/private content|<script>/)
})

const permission = '<span class="wpcf7-form-control-wrap dovoljenje"><span class="wpcf7-form-control wpcf7-checkbox wpcf7-validates-as-required"><span class="wpcf7-list-item first last"><label><input type="checkbox" name="dovoljenje[]" value="Fixture permission."><span class="wpcf7-list-item-label">Fixture permission.</span></label></span></span></span>'
const subjectForm = basicForm.replace('</form>','<input name="your-subject" placeholder="Subject">'+permission+'<p>Unchanged explanatory text <a href="/privacy">Privacy</a></p></form>')
test('optional subject and proven required permission preserve source text, structure and legal link',()=>{
 const result=converted(subjectForm);assert.equal(result.ok,true)
 const schema=readContactSchema(result.html)!;assert.ok(schema.fields.includes('subject'));assert.ok(!schema.required.includes('subject'));assert.ok(!schema.required.includes('message'))
 assert.equal(schema.acceptance?.statement,'Fixture permission.');assert.match(schema.acceptance!.statementSha256,/^[a-f0-9]{64}$/);assert.match(schema.acceptance!.formSha256,/^[a-f0-9]{64}$/)
 assert.match(result.html,/name="acceptance" value="accepted" required=""/);assert.doesNotMatch(result.html,/checked=/);assert.match(result.html,/<p>Unchanged explanatory text <a href="\/privacy">Privacy<\/a><\/p>/)
 const changed=readContactSchema(converted(subjectForm.replaceAll('Fixture permission.','Different permission.')).html)!
 assert.notEqual(changed.acceptance?.statementSha256,schema.acceptance?.statementSha256);assert.notEqual(changed.acceptance?.formSha256,schema.acceptance?.formSha256)
 for(const source of [subjectForm.replace('name="dovoljenje[]"','name="newsletter"'),subjectForm.replace('type="checkbox"','type="checkbox" checked'),subjectForm.replace('value="Fixture permission."','value="different"'),subjectForm.replace('wpcf7-checkbox wpcf7-validates-as-required','wpcf7-checkbox'),subjectForm.replace('</form>',permission+'</form>'),subjectForm.replace('name="your-subject"','name="your-subject" required')]) assert.equal(converted(source).ok,false)
 assert.equal(readContactSchema(result.html.replace('name="acceptance"','name="forged"')),null)
 assert.equal(readContactSchema(result.html.replace('value="accepted"','value="on"')),null)
 assert.equal(readContactSchema(result.html.replace('Unchanged explanatory text','Changed explanation')),null)
 assert.equal(readContactSchema(result.html.replaceAll('</div><','</div> \n<').replace('<form ','<form data-astro-cid-example="" '))?.acceptance?.formVersion,schema.acceptance?.formVersion)
})
test('server requires exact affirmative acceptance, rejects tampering and binds evidence to server artifact',async()=>{
 const schema=readContactSchema(converted(subjectForm).html)!
 const configured={...site,...schema};let claims=0,sends=0,recorded:any
 const delivery:ContactDelivery={verifiedSender:'verified@example.com',claim:async input=>{claims++;recorded=input;return {status:'claimed',submissionId:'record'}},finish:async()=>{},send:async input=>{sends++;assert.equal(input.subject,'Optional topic');assert.equal(input.to,site.recipient);assert.equal(input.replyTo,'visitor@example.com');return 'accepted'}}
 const post=createContactPost({resolve:async()=>configured,delivery})
 for(const value of [undefined,'','on','true','1','false','accepted ',schema.acceptance!.statement]) {
   const response=await post(request(value===undefined?{}:{acceptance:value}));assert.equal(response.status,400)
 }
 for(const fields of [{subject:'a\r\nBcc:x@y.com'},{subject:'x'.repeat(201)},{subject:'a\0b'},{subject:'a\u0085b'},{subject:'a\u2028b'},{acceptanceText:'Forged'},{acceptedAt:'2000-01-01'},{artifactId:'foreign'},{formSha256:'f'.repeat(64)},{formVersion:'f'.repeat(64)}]) assert.equal((await post(request({acceptance:'accepted',formVersion:schema.acceptance!.formVersion,...fields}))).status,400)
 const duplicate=request({acceptance:'accepted',formVersion:schema.acceptance!.formVersion});assert.equal((await post(new Request(duplicate.url,{method:'POST',headers:duplicate.headers,body:(await duplicate.text())+'&acceptance=accepted'}))).status,400)
 assert.equal(claims,0);assert.equal(sends,0)
 const native=request({acceptance:'accepted',formVersion:schema.acceptance!.formVersion,subject:'Optional topic',requestId:''},{accept:'text/html'});const fields=new URLSearchParams(await native.text());fields.delete('message')
 const response=await post(new Request(native.url,{method:'POST',headers:native.headers,body:fields}));assert.equal(response.status,200);assert.match(response.headers.get('content-type')!,/text\/html/)
 assert.deepEqual(recorded.acceptanceEvidence,{...schema.acceptance,affirmative:true,artifactId:site.artifactId,artifactSha256:site.artifactSha256});assert.equal(recorded.payload.acceptance,'accepted');assert.equal(recorded.payload.message,'');assert.equal(Object.hasOwn(recorded,'acceptedAt'),false)
 delivery.send=async input=>{assert.equal(input.subject,'Website contact request');return 'accepted'}
 assert.equal((await post(request({acceptance:'accepted',formVersion:schema.acceptance!.formVersion,message:'',subject:''}))).status,200)
})
