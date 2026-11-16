/** Local-only compatibility probe. No customer data, provider calls or production wiring. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseBrandDecisions, type BrandKey } from './brand-guide';
import { prepareAstroStaticSiteSourceWorkspace } from '../output-adapters/astro-static-site-workspace-preparation';
import { captureStackiRuntimeFiles } from '../stacki/stacki-runtime-files';
import { createStackiLocalStorage } from '../stacki/stacki-local-storage-transport';
import { SupabaseStackiDraftStore } from '../stacki/stacki-draft-store';
import { selectStackiCandidateSource } from '../stacki/stacki-candidate-source';

const upstream=resolve(process.argv[2]), dependencies=resolve(process.argv[3]), output=resolve(process.argv[4]);
const pin='968d013064bd9b3f1b7a73afec7abe9925ac9560';
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:upstream,encoding:'utf8'}).trim(),pin);
assert.equal(JSON.parse(await readFile(join(dependencies,'astro/package.json'),'utf8')).version,'5.18.2');
await mkdir(output,{recursive:true});
// Deliberately a proof-only subset, not an installed renderer or automatic proposal promotion.
const mapping:Partial<Record<BrandKey,string>>={background:'--background',text:'--text',accent:'--brand-500',fontFamily:'--text-main-font-family',fontWeight:'--text-main-font-weight',fontSize:'--text-main',lineHeight:'--text-main-line-height',contentWidth:'--max-width-main'};
function tokens(input:unknown){
 const decisions=parseBrandDecisions(input);
 return ':root, .theme-light {\n'+Object.entries(mapping).flatMap(([key,variable])=>{
  const d=decisions[key as BrandKey];return d?.confirmed?[`  ${variable}: ${d.value};`]:[];
 }).join('\n')+'\n}\n';
}
const initial={background:{value:'#ffffff',confirmed:true},text:{value:'#222222',confirmed:true},accent:{value:'#cc0000',confirmed:true},fontFamily:{value:'system-ui',confirmed:true},fontWeight:{value:'400',confirmed:true},fontSize:{value:'18px',confirmed:true},lineHeight:{value:'1.5',confirmed:true},contentWidth:{value:'720px',confirmed:true},radius:{value:'9px',confirmed:false}};
assert(!tokens(initial).includes('radius'));
assert.equal(tokens({accent:{value:'red',confirmed:false}}),':root, .theme-light {\n\n}\n');
assert.throws(()=>tokens({fontSize:{value:'banana',confirmed:true}}),/422/);
const fileMap:Record<string,string>={
 'package.json':JSON.stringify({name:'gnr8-lumos-local-proof',private:true,type:'module',dependencies:{astro:'5.18.2'}}),
 'astro.config.mjs':'import {defineConfig} from "astro/config"; export default defineConfig({output:"static"});\n',
 'src/styles/brand.css':tokens(initial),
 'src/pages/index.astro':`---
import '../styles/base.css';
import '../styles/patterns.css';
import '../styles/brand.css';
import Paragraph from '../components/Paragraph.astro';
---
<html lang="sl"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><title>Lokalni preizkus Lumos</title></head>
<body class="theme-light"><main class="container"><h1>Lokalni primer — ni stran Ladje Žaba</h1><Paragraph variant="main">Preverjanje potrjenih oblikovnih vrednosti.</Paragraph><div id="accent" style="background:var(--brand-500);width:100%;height:48px">Poudarek znamke</div></main></body></html>`,
};
for(const name of ['base.css','patterns.css'])fileMap['src/styles/'+name]=await readFile(join(upstream,'src/styles',name),'utf8');
fileMap['src/components/Paragraph.astro']=(await readFile(join(upstream,'src/components/typography/Paragraph.astro'),'utf8')).replace('@/utils/slots.ts','../utils/slots.ts');
fileMap['src/utils/slots.ts']=await readFile(join(upstream,'src/utils/slots.ts'),'utf8');
fileMap['public/LUMOS-LICENSE.txt']=await readFile(join(upstream,'LICENSE'),'utf8');
const project=await prepareAstroStaticSiteSourceWorkspace({files:Object.entries(fileMap).map(([path,body])=>({path,body:Buffer.from(body)})),workspaceRoot:output});
await symlink(dependencies,join(project.workspacePath,'node_modules'));
function build(root:string,label:string){const log=execFileSync(process.execPath,[join(dependencies,'astro/astro.js'),'build'],{cwd:root,env:{...process.env,ASTRO_TELEMETRY_DISABLED:'1'},encoding:'utf8',timeout:120000});return writeFile(join(output,label+'.log'),log);}
await build(project.workspacePath,'initial-build');
const scope={agencyId:'10000000-0000-4000-8000-000000000001',clientId:'10000000-0000-4000-8000-000000000002',siteId:'10000000-0000-4000-8000-000000000003',siteVersionId:'10000000-0000-4000-8000-000000000004'};
const transport=createStackiLocalStorage(join(output,'storage'));
const store=new SupabaseStackiDraftStore(transport.client,transport.bucket);
const first=await store.save(scope,'10000000-0000-4000-8000-000000000005',{expectedRevision:0,files:await captureStackiRuntimeFiles(project.workspacePath)});
const changed={...initial,accent:{value:'#006633',confirmed:true},fontSize:{value:'22px',confirmed:true},fontWeight:{value:'700',confirmed:true},contentWidth:{value:'90%',confirmed:true}};
await writeFile(join(project.workspacePath,'src/styles/brand.css'),tokens(changed));
const second=await store.save(scope,first.actorUserId,{expectedRevision:1,files:await captureStackiRuntimeFiles(project.workspacePath)});
const reopenedTransport=createStackiLocalStorage(join(output,'storage'));
const fresh=new SupabaseStackiDraftStore(reopenedTransport.client,reopenedTransport.bucket);
const latest=await fresh.latest(scope);assert.deepEqual(latest,second);assert.deepEqual(await fresh.revision(scope,1),first);
const candidateInput={scope,baseline:first.files,sourcePaths:first.files.map(f=>f.path),ownedImagePaths:[]};
selectStackiCandidateSource({...candidateInput,checkpoint:first,expectedRevision:1,expectedSha256:first.sha256});
assert.throws(()=>selectStackiCandidateSource({...candidateInput,checkpoint:second,expectedRevision:2,expectedSha256:second.sha256}),/STACKI_CANDIDATE_CODE_OR_ASSET_CHANGE_UNSUPPORTED/);
const restored=await prepareAstroStaticSiteSourceWorkspace({files:latest!.files.map(f=>({path:f.path,body:Buffer.from(f.base64,'base64')})),workspaceRoot:output});
assert.deepEqual(await captureStackiRuntimeFiles(restored.workspacePath),latest!.files);
await symlink(dependencies,join(restored.workspacePath,'node_modules'));await build(restored.workspacePath,'restored-build');
const css=await readFile(join(restored.workspacePath,'src/styles/brand.css'),'utf8');assert.equal(css,tokens(changed));
await writeFile(join(output,'evidence.json'),JSON.stringify({pin,node:process.version,astro:'5.18.2',initialWorkspace:project.workspacePath,restoredWorkspace:restored.workspacePath,initialTokens:tokens(initial),restoredTokens:css,revisions:[first.revision,second.revision],exactCheckpointRestored:true,unconfirmedOmitted:true,invalidRejected:true,builds:2,hostedCalls:0,upstreamFiles:['base.css','patterns.css'].map(name=>({name,sha256:createHash('sha256').update(fileMap['src/styles/'+name]).digest('hex')})),limitations:['Proof-only token subset; no production renderer wiring.','Local file transport through existing draft store; not editor Save UI or hosted storage.','Only Paragraph and CSS layer tested, not full Lumos template.']},null,2));
console.log(JSON.stringify({output,workspace:restored.workspacePath,builds:2,revisions:[1,2],exactCheckpointRestored:true}));
