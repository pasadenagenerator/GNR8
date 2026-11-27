import assert from 'node:assert/strict';
import test from 'node:test';
import postcss from 'postcss';
import {materializeDeferredStylesheetLinks,preserveMonoContactEmailStyles,rejectUnsupportedFunctions} from './standalone-export';

test('exact retained CSS load shim becomes an ordinary stylesheet while other events remain blocked',()=>{
 const css=`/_assets/${'a'.repeat(64)}/${'b'.repeat(64)}.css?gnr8css=2`;
 const link=`<link rel="stylesheet" href="${css}" media="print" onload="this.onload=null;this.media='all'" onerror="this.onerror=null;this.media='all'">`;
 const normalized=materializeDeferredStylesheetLinks(link);
 assert.equal(normalized,`<link rel="stylesheet" href="${css}" media="all">`);
 assert.doesNotThrow(()=>rejectUnsupportedFunctions(normalized));
 for(const other of [link.replace('onload=', 'onclick='),
   link.replace(css,'https://foreign.example/style.css'),
   link.replace('onerror=', 'onmouseover=')]){
  assert.equal(materializeDeferredStylesheetLinks(other),other);
  assert.throws(()=>rejectUnsupportedFunctions(other),/standalone_unsupported_dynamic_feature/);
 }
});

test('projected Mono email retains captured text-field styling and focus cascade without affecting login or other forms',()=>{
 const css='.form input[type="text"],.form input[type="password"],.login input[type="text"]{height:37px;padding:10px;border:1px solid #ccc;background-color:#f8f8f8}.form input[type=text]:focus{border-color:blue}@media(max-width:600px){.form input[type=\'text\']{font-size:14px}}';
 const sheet=postcss.parse(css);
 preserveMonoContactEmailStyles(sheet);
 const email='.form:where([data-gnr8-contact="v1"]) input[type="email"]';
 const rules:postcss.Rule[]=[];sheet.walkRules(rule=>{rules.push(rule);});
 assert(rules[0]!.selectors.includes(email));
 assert(rules[0]!.selectors.includes('.login input[type="text"]'));
 assert(!rules[0]!.selectors.some(selector=>selector.startsWith('.login')&&selector.includes('email')));
 assert(rules[1]!.selectors.includes(email+':focus'));
 assert(rules[2]!.selectors.includes(email));
 // No declarations are synthesized, reordered or removed by the adaptation.
 const declarations=(root:postcss.Root)=>{const values:string[]=[];root.walkDecls(d=>{values.push(d.toString());});return values;};
 assert.deepEqual(declarations(sheet),declarations(postcss.parse(css)));
 const once=sheet.toString();preserveMonoContactEmailStyles(sheet);assert.equal(sheet.toString(),once);
});

test('unsupported forms are rejected before export can reach providers',async()=>{
 const {rejectUnsupportedFunctions}=await import('./standalone-export');
 for(const html of ['<form action="/checkout"><input name="card"></form>','<form action="https://external.example/send"></form>','<script src="/api/auth/session"></script>','<script>fetch("https://payments.example/charge")</script>','<button onclick="checkout()">Buy</button>','<img src="/api/contact">'])assert.throws(()=>rejectUnsupportedFunctions(html),/standalone_unsupported/);
 assert.doesNotThrow(()=>rejectUnsupportedFunctions('<a href="https://original.example/booking">Open original booking</a>'));
});

test('verified retained image URL is rewritten before dynamic feature validation',async()=>{
 const {exportStandaloneProject}=await import('./standalone-export');
 const id='11111111-1111-4111-8111-111111111111';
 const scope={agencyId:id,clientId:id,siteId:id,siteVersionId:id};
 const assetPath=`/api/gnr8/runtime/preview-assets/site_test/${id}/images/logo.png`;
 const body=Buffer.from('verified-image');
 const {createHash}=await import('node:crypto');const sha=createHash('sha256').update(body).digest('hex');
 const baseline=[{path:'package.json',base64:Buffer.from('{"dependencies":{"astro":"5.18.2"}}').toString('base64')},
  {path:'src/pages/index.astro',base64:Buffer.from(`<img src="${assetPath}" alt="Logo">`).toString('base64')}];
 const result=await exportStandaloneProject({baseline,selection:{kind:'generated-source',scope,sha256:'a'.repeat(64)},sourceArtifact:{id,sha256:'b'.repeat(64)},assets:[{path:assetPath,sourceSha256:sha,mediaType:'image/png',body}]});
 const pkg=JSON.parse(result.files.find(f=>f.path==='package.json')!.body.toString());
 const lock=JSON.parse(result.files.find(f=>f.path==='package-lock.json')!.body.toString());
 assert.equal(pkg.dependencies.astro,'7.4.7');
 assert.equal(pkg.engines.node,'26.x');
 assert.deepEqual(lock.packages[''].dependencies,pkg.dependencies);
 assert.equal(lock.packages['node_modules/astro'].version,'7.4.7');
 const page=result.files.find(f=>f.path==='src/pages/index.astro')!.body.toString();
 assert.match(page,/src="\/_assets\/[a-f0-9]{64}\/[a-f0-9]{64}\.png"/);
 assert.ok(!page.includes('/api/gnr8/'));
});

test('Astro 7 source exports the exact Node 26 package and coherent lockfile',async()=>{
 const {exportStandaloneProject}=await import('./standalone-export');
 const id='11111111-1111-4111-8111-111111111111';
 const scope={agencyId:id,clientId:id,siteId:id,siteVersionId:id};
 const baseline=[
  {path:'package.json',base64:Buffer.from(JSON.stringify({dependencies:{astro:'7.4.4'},engines:{node:'26.13.0'}})).toString('base64')},
  {path:'src/pages/index.astro',base64:Buffer.from('<h1>Site</h1><style is:global>.navcontainer { width:66,666%; }</style>').toString('base64')},
 ];
 const result=await exportStandaloneProject({baseline,selection:{kind:'generated-source',scope,sha256:'a'.repeat(64)},sourceArtifact:{id,sha256:'b'.repeat(64)},assets:[]});
 const read=(path:string)=>JSON.parse(result.files.find(f=>f.path===path)!.body.toString());
 const pkg=read('package.json'),lock=read('package-lock.json');
 assert.equal(pkg.dependencies.astro,'7.4.7');
 assert.equal(pkg.engines.node,'26.x');
 assert.deepEqual(lock.packages[''].dependencies,pkg.dependencies);
 assert.equal(lock.packages['node_modules/astro'].version,'7.4.7');
 assert.match(result.files.find(f=>f.path==='README.md')!.body.toString(),/Node 26/);
 assert.match(result.files.find(f=>f.path==='astro.config.mjs')!.body.toString(),/cssMinify:false/);
 const page=result.files.find(f=>f.path==='src/pages/index.astro')!.body.toString();
 assert.match(page,/width:66\.666%/);
 assert.doesNotMatch(page,/66,666%/);
 assert.deepEqual(result.manifest.correctedCss,[{path:'src/pages/index.astro',property:'width',before:'66,666%',after:'66.666%'}]);
});
