import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createAstroStaticSiteProjectManifest} from '../output-adapters/astro-static-site-adapter';
import {astroDevServerSmokeProofFixture} from '../output-adapters/astro-static-site-dev-server-smoke-proof';
import {runAstroBuildExportProof} from '../output-adapters/astro-static-site-build-export-proof';
import {prepareAstroStaticSiteSourceWorkspace} from '../output-adapters/astro-static-site-workspace-preparation';
import {exportStandaloneProject} from './standalone-export';
import {fingerprint} from './publication-contract';
const exec=promisify(execFile);
// Uses the existing build/export proof and fresh local Git clone, no hosted I/O.
test('fresh complete Git clone builds offline with no GNR8 or contact runtime',{skip:process.env.GNR8_STANDALONE_BUILD_PROOF!=='1',timeout:240000},async()=>{
 const cache=process.env.GNR8_STANDALONE_NPM_CACHE;assert(cache,'Set the retained npm cache for this offline proof');
 const root=await mkdtemp(join(tmpdir(),'gnr8-independent-proof-'));
 const env={PATH:process.env.PATH,HOME:root,GIT_CONFIG_NOSYSTEM:'1',GIT_TERMINAL_PROMPT:'0'};
 const git=async(args:string[],cwd=root)=>(await exec('git',['-c','core.hooksPath=/dev/null',...args],{cwd,env})).stdout.trim();
 try{
  const baseline=createAstroStaticSiteProjectManifest(astroDevServerSmokeProofFixture()).files.map(f=>({path:f.path,base64:Buffer.from(f.contents).toString('base64')}));
  const source=await exportStandaloneProject({baseline,assets:[],selection:{kind:'generated-source',scope:{agencyId:'11111111-1111-4111-8111-111111111111',clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333',siteVersionId:'44444444-4444-4444-8444-444444444444'},sha256:fingerprint(baseline)},sourceArtifact:{id:'55555555-5555-4555-8555-555555555555',sha256:'a'.repeat(64)}});
  const original=join(root,'original'),clone=join(root,'clone');await mkdir(original);
  for(const f of source.files){await mkdir(dirname(join(original,f.path)),{recursive:true});await writeFile(join(original,f.path),f.body);}
  await git(['init','-b','main'],original);await git(['add','.'],original);await git(['-c','user.name=Local proof','-c','user.email=proof@example.invalid','commit','-m','Standalone generated source'],original);
  const commit=await git(['rev-parse','HEAD'],original);await git(['clone','--no-local',original,clone]);
  const files=await Promise.all((await git(['ls-files'],clone)).split('\n').map(async path=>({path,body:await readFile(join(clone,path))})));
  assert.equal(files.length,source.files.length);assert(!files.some(f=>f.path.startsWith('api/')||f.path.startsWith('server/')));
  const page=files.find(f=>f.path==='src/pages/index.astro')!.body.toString();
  const styles=[...page.matchAll(/<link[^>]*href="([^"]+\.css)"/g)].map(m=>m[1]!);
  const proof=await runAstroBuildExportProof({packageManager:'npm',commandEnvironment:{PATH:process.env.PATH,NODE_ENV:'production',npm_config_offline:'true',npm_config_cache:cache,npm_config_logs_dir:join(root,'npm-logs')},verification:{expectedContent:[],expectedThemeToken:null,expectedStylesheetReferences:styles},dependencies:{
   prepareWorkspace:async({workspaceRoot})=>prepareAstroStaticSiteSourceWorkspace({files,workspaceRoot}),
   runCommand:async(executable,args,options)=>{
    const result=await exec('/usr/bin/sandbox-exec',['-p',`(version 1)(allow default)(deny network*)(deny file-write* (subpath ${JSON.stringify(cache)}))`,executable,...args],{cwd:options.cwd,env:options.env,timeout:options.timeoutMs,maxBuffer:4*1024*1024});return {stdout:result.stdout,stderr:result.stderr};
   },
  }});
  assert.equal(proof.sourceComparison.unchanged,true);assert.equal(proof.build.completed,true);
  const evidence={input:'existing astroDevServerSmokeProofFixture through actual Astro adapter',sourceKind:'generated-source',manifestSha256:source.manifestSha256,commit,sourceFiles:files.length,export:proof.export,sourceUnchanged:proof.sourceComparison.unchanged,versions:proof.versions,network:'install/build child processes deny all network; proof HTTP only uses loopback',hostedOperations:0};
  if(process.env.GNR8_STANDALONE_EVIDENCE_PATH)await writeFile(process.env.GNR8_STANDALONE_EVIDENCE_PATH,JSON.stringify(evidence,null,2)+'\n');
 }finally{await rm(root,{recursive:true,force:true});}
});
