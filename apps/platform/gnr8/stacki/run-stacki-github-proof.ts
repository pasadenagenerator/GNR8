/** Bounded retained-input proof; explicit --github enables the approved private remote. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createServer } from "node:net";
import { parseStackiRecord, type StackiDraftFile, type StackiDraftSave } from "./stacki-draft-contract";
import { SupabaseStackiDraftStore } from "./stacki-draft-store";
import { createStackiLocalStorage } from "./stacki-local-storage-transport";
import { captureStackiRuntimeFiles } from "./stacki-runtime-files";
import { startStackiEditorRuntime } from "./stacki-editor-runtime";
import { GithubProofStore, measuredProofStorage, proofHash } from "./stacki-github-proof-store";

async function main() {
  if (process.argv.includes("--editor-only")) return openEditor(resolve(".gnr8/stacki-github-proof"));
  assert(process.argv.includes("--github"), "Explicit private GitHub proof flag required");
  const root = resolve(".gnr8/stacki-github-proof");
  const access = JSON.parse(await readFile(join(root,"github-access.json"),"utf8"));
  assert.equal(access[0].login,"pasadenagenerator");
  assert.equal(access[1].full_name,"pasadenagenerator/gnr8-stacki-source-proof-20261021");
  assert.equal(access[1].private,true); assert.equal(access[1].permissions.push,true);
  const raw=JSON.parse(await readFile(join(root,"input.json"),"utf8"));
  const input=parseStackiRecord(raw,raw.scope,raw.revision);
  const runtime=resolve("/private/tmp/gnr8-stacki-save-runtime-verified");
  const require=createRequire(join(runtime,"studio/package.json"));
  const Y = require("yjs");
  const workspace=join(root,"editing"); await materialize(workspace,input.files);
  const manifest=input.files.map(f=>({path:f.path,sha256:proofHash(Buffer.from(f.base64,"base64")),bytes:Buffer.from(f.base64,"base64").length}));
  await writeFile(join(root,"input-manifest.json"),JSON.stringify(manifest,null,2));
  const assetMap=new Map(input.files.filter(f=>f.path.startsWith("public/")).map(f=>[f.path.slice(6),proofHash(Buffer.from(f.base64,"base64"))]));
  await writeFile(join(root,"asset-map.json"),JSON.stringify([...assetMap],null,2));
  const page="src/pages/index.astro", state=".studio-state/"+Buffer.from(page).toString("base64").replace(/=+$/g,"")+".bin";
  const original=await readFile(join(workspace,page),"utf8");
  const oldHeading="Celovite rešitve – test Stacki B";
  assert(original.includes(oldHeading));
  const images=[...original.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m=>m[1]);
  const oldAsset=images.find(p=>p.endsWith("logatcan-slide5.jpg"))!;
  const newAsset=images.find(p=>p.endsWith("logatcan-slide7.jpg"))!;
  assert(assetMap.has(oldAsset)); assert(assetMap.has(newAsset));
  async function edit(from:string,to:string) {
    const source=await readFile(join(workspace,page),"utf8"); assert(source.includes(from));
    const doc=new Y.Doc(); Y.applyUpdate(doc,await readFile(join(workspace,state)));
    const text=doc.getText("source"); assert(text.toString()===source,"Studio state must agree with source before edit");
    const at=text.toString().indexOf(from); assert(at>=0);
    doc.transact(()=>{text.delete(at,from.length);text.insert(at,to);});
    await writeFile(join(workspace,page),text.toString());
    await writeFile(join(workspace,state),Y.encodeStateAsUpdate(doc)); doc.destroy();
  }
  const baselineTransport=createStackiLocalStorage(join(root,"baseline-objects"));
  const baselineMeasured=measuredProofStorage(baselineTransport.client,baselineTransport.bucket);
  const baseline=new SupabaseStackiDraftStore(baselineMeasured.client,baselineTransport.bucket);
  const objectTransport=createStackiLocalStorage(join(root,"split-objects"));
  const objectMeasured=measuredProofStorage(objectTransport.client,objectTransport.bucket);
  const remote="https://github.com/pasadenagenerator/gnr8-stacki-source-proof-20261021.git";
  const candidate=new GithubProofStore(join(root,"git-working"),remote,objectMeasured.client.storage.from(objectTransport.bucket),input.sha256);
  await candidate.init();
  const timings: {label:string;ms:number}[]=[];
  const commits: Record<string,string>={};
  async function timed<T>(label:string,fn:()=>Promise<T>) {const start=performance.now();try{return await fn();}finally{timings.push({label,ms:performance.now()-start});}}
  const saves: StackiDraftSave[]=[];
  for (const [index,label] of ["initial","A","B"].entries()) {
    if (label==="A") await edit(oldHeading,"Celovite rešitve – GitHub A");
    if (label==="B") {await edit("Celovite rešitve – GitHub A","Celovite rešitve – GitHub B");await edit(oldAsset,newAsset);}
    const files=await captureStackiRuntimeFiles(workspace);
    const save={expectedRevision:index,files}; saves.push(save);
    await writeFile(join(root,`capture-${label}.json`),JSON.stringify(files));
    const b=await timed(`baseline-${label}`,()=>baseline.save(input.scope,input.actorUserId,save));
    if(label==="B") candidate.loseAcknowledgement=true;
    if(label==="B") {
      await assert.rejects(timed(`candidate-${label}`,()=>candidate.save(input.scope,input.actorUserId,save)),/STACKI_DRAFT_SAVE_UNCONFIRMED/);
    } else {
      const c=await timed(`candidate-${label}`,()=>candidate.save(input.scope,input.actorUserId,save));assert.equal(c.sha256,b.sha256);
    }
    commits[label]=candidate.git(["rev-parse","HEAD"]);
    console.log(JSON.stringify({saved:label,commit:commits[label],checkpoint:b.sha256,acknowledgement:label==="B"?"injected lost response":"confirmed"}));
  }
  // A new unsaved edit must not replace the immutable B payload on retry.
  await edit("Celovite rešitve – GitHub B","Celovite rešitve – newer unsaved C");
  const newer=await captureStackiRuntimeFiles(workspace);
  const bRetry=await timed("baseline-retry-B",()=>baseline.save(input.scope,input.actorUserId,saves[2]));
  const cRetry=await timed("candidate-retry-B",()=>candidate.save(input.scope,input.actorUserId,saves[2]));
  assert.equal(cRetry.sha256,bRetry.sha256); assert.equal(cRetry.revision,3);
  assert.deepEqual(await captureStackiRuntimeFiles(workspace),newer);
  assert.equal(candidate.git(["rev-list","--count","origin/main"]),"3");
  const candidateSaveMetrics={...objectMeasured.metrics};
  const candidateSaveGitOperations=[...candidate.metrics];
  const baselineSaveMetrics={...baselineMeasured.metrics};
  // Even an old A retry must return A without rolling the newer durable B back.
  assert.equal((await candidate.save(input.scope,input.actorUserId,saves[1])).revision,2);
  assert.equal(candidate.git(["rev-parse","origin/main"]),commits.B);
  await assert.rejects(candidate.save(input.scope,input.actorUserId,{expectedRevision:1,files:newer}),/STACKI_DRAFT_CONFLICT/);
  candidate.unavailable=true;
  await assert.rejects(candidate.save(input.scope,input.actorUserId,{expectedRevision:3,files:newer}),/STACKI_DRAFT_STORAGE_UNAVAILABLE/);
  candidate.unavailable=false;
  const allCommits=Object.values(commits);
  const pack=execFileSync("git",["-C",candidate.root,"pack-objects","--stdout","--revs"],{input:commits.B+"\n",maxBuffer:16*1024*1024});
  const gitLogicalObjects=Number(candidate.git(["cat-file","--batch-all-objects","--batch-check=%(objectsize)"]).split("\n").reduce((n,s)=>n+Number(s),0));
  await writeFile(join(root,"history.pack"),pack);
  await rm(workspace,{recursive:true}); await rm(candidate.root,{recursive:true});
  const restoredRepo=join(root,"git-fresh");
  const cloneStart=performance.now();
  execFileSync("git",["-c","core.hooksPath=/dev/null","clone","--quiet","--no-checkout",remote,restoredRepo],
    {timeout:60_000,stdio:["ignore","pipe","pipe"],env:{...process.env,GIT_TERMINAL_PROMPT:"0"}});
  timings.push({label:"github-cold-clone",ms:performance.now()-cloneStart});
  const packDirectory=join(restoredRepo,".git/objects/pack");
  let receivedClonePackBytes=0;
  for(const name of (await readdir(packDirectory)).filter(n=>n.endsWith(".pack"))) receivedClonePackBytes+=(await stat(join(packDirectory,name))).size;
  const freshObjects=createStackiLocalStorage(join(root,"split-objects"));
  const freshMeasured=measuredProofStorage(freshObjects.client,freshObjects.bucket);
  const fresh=new GithubProofStore(restoredRepo,remote,freshMeasured.client.storage.from(freshObjects.bucket),input.sha256);
  for (const commit of allCommits) assert.equal(fresh.git(["cat-file","-t",commit]),"commit");
  const restored=await timed("candidate-restore-local-objects",()=>fresh.readCommit(commits.B,input.scope));
  assert.deepEqual(restored,cRetry);
  const freshBaseline=createStackiLocalStorage(join(root,"baseline-objects"));
  const freshBaselineMeasured=measuredProofStorage(freshBaseline.client,freshBaseline.bucket);
  const baselineRestored=await timed("baseline-restore-local",()=>new SupabaseStackiDraftStore(freshBaselineMeasured.client,freshBaseline.bucket).latest(input.scope));
  assert.deepEqual(baselineRestored,restored);
  const restoredWorkspace=join(root,"restored"); await materialize(restoredWorkspace,restored.files);
  assert.deepEqual(await captureStackiRuntimeFiles(restoredWorkspace),restored.files);
  for(const originalFile of input.files.filter(f=>f.path.startsWith("public/")||f.path.startsWith("src/pages/")&&f.path!==page))
    assert.equal(restored.files.find(f=>f.path===originalFile.path)?.base64,originalFile.base64);
  const evidence={checkedAt:new Date().toISOString(),input:{revision:input.revision,sha256:input.sha256,files:input.files.length},
    remote,commits,scope:input.scope,assetReferenceChange:{from:oldAsset,to:newAsset,fromSha256:assetMap.get(oldAsset),toSha256:assetMap.get(newAsset)},
    logicalBytes:manifest.reduce((n,f)=>n+f.bytes,0),assetFiles:assetMap.size,
    assetBytes:manifest.filter(f=>f.path.startsWith("public/")).reduce((n,f)=>n+f.bytes,0),
    stateBytes:manifest.filter(f=>f.path.startsWith(".studio-state/")).reduce((n,f)=>n+f.bytes,0),
    baseline:{storedBytes:await sizeTree(join(root,"baseline-objects")),save:baselineSaveMetrics,recovery:freshBaselineMeasured.metrics},
    split:{objectStoredBytes:await sizeTree(join(root,"split-objects")),gitPackBytes:pack.length,receivedClonePackBytes,gitLogicalObjects,
      save:candidateSaveMetrics,recovery:freshMeasured.metrics,gitOperations:candidateSaveGitOperations,diagnosticGitOperations:candidate.metrics.slice(candidateSaveGitOperations.length)},timings,
    assertions:{exactRecovery:true,unchangedAssets:true,unchangedOtherRoutesAndContact:true,threeLogicalRevisions:true,
      ambiguousRetry:true,newerUnsavedEditPreserved:true,oldRetryPreservesNewerHead:true,staleConflict:true,unavailableNeverSaved:true,
      disposableCopiesRemoved:true,remoteCommitsReadBack:true},
    limitations:["External objects use the actual Supabase SDK with local transport, not hosted writes.",
      "Pack sizes are Git payload estimates from exact object sets, not TLS/network byte capture or GitHub billed storage.",
      "Faults are injected locally; no hosted service outage is induced.","Three serial revisions; no production multi-user CAS claim."]};
  await writeFile(join(root,"evidence.json"),JSON.stringify(evidence,null,2));
  await openEditor(root);
}
async function openEditor(root:string) {
  const restoredWorkspace=join(root,"restored");
  const runtime=resolve("/private/tmp/gnr8-stacki-save-runtime-verified");
  const retained=resolve(".gnr8/stacki-pilot/logatcan-replay-lbrnrd/site");
  try {await symlink(join(retained,"node_modules"),join(restoredWorkspace,"node_modules"));}
  catch(error){if((error as NodeJS.ErrnoException).code!=="EEXIST")throw error;}
  const astroPort=await freePort(),gatewayPort=await freePort();
  const editor=await startStackiEditorRuntime({workspace:restoredWorkspace,studio:join(runtime,"studio"),
    publicOrigin:`http://127.0.0.1:${gatewayPort}`,astroPort,gatewayPort,entryTicket:randomBytes(32).toString("base64url"),
    expiresAt:Date.now()+20*60_000,allowLocalHttp:true,checkpointModule:join(runtime,"capture.mjs")});
  await writeFile(join(root,"editor.json"),JSON.stringify({entryUrl:editor.entryUrl,astroPort,gatewayPort,restoredWorkspace},null,2));
  console.log(JSON.stringify({result:"PASS storage integrity and faults; visual check pending",entryUrl:editor.entryUrl,root}));
  const stop=async()=>{await editor.close();await writeFile(join(root,"editor-stopped.json"),JSON.stringify({stopped:true}));process.exit(0);};
  process.on("SIGTERM",()=>void stop());process.on("SIGINT",()=>void stop());
}
async function materialize(root:string,files:StackiDraftFile[]) {
  await mkdir(root,{recursive:false});for(const file of files){const path=join(root,file.path);await mkdir(dirname(path),{recursive:true});await writeFile(path,Buffer.from(file.base64,"base64"),{flag:"wx"});}
}
async function sizeTree(root:string):Promise<number>{let total=0;for(const name of await readdir(root)){const p=join(root,name),s=await stat(p);total+=s.isDirectory()?await sizeTree(p):s.size;}return total;}
async function freePort(){const server=createServer();await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));const a=server.address();assert(a&&typeof a!=="string");await new Promise<void>(r=>server.close(()=>r()));return a.port;}
main().catch(error=>{console.error(error);process.exitCode=1;});
