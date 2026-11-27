import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {rawImportGitPackage,writeRawImportGitArchive} from './raw-import-git-archive';
const scope={agencyId:'11111111-1111-4111-8111-111111111111',clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333'};
const input={scope,runtimeSiteId:'site_f34311640a819fb56f3c',siteVersionId:'44444444-4444-4444-8444-444444444444',
 files:[{path:'index.html',mediaType:'text/html',bytes:Buffer.from('<h1>GNR8</h1>'),sizeBytes:13,sha256:''}],
 target:{owner:'owner',ownerId:10,repository:'site',repositoryId:12,token:'test-token'}};
input.files[0].sha256=createHash('sha256').update(input.files[0].bytes).digest('hex');
const parent='a'.repeat(40),commit='b'.repeat(40);
test('raw import Git commit includes verified bytes and manifest, then exact readback',async()=>{
 const packageFiles=rawImportGitPackage(input).gitFiles;
 let pushes=0,reads=0;
 const deps={repository:async()=>({defaultBranch:'main',parent}),
  push:async (request:any)=>{pushes++;assert.deepEqual(request.files,packageFiles);return {commit,tree:'c'.repeat(40)};},
  read:async()=>{reads++;return {commit,parent,parentCount:1,files:new Map(packageFiles.map(f=>[f.path,f.body]))};}};
 const result=await writeRawImportGitArchive(input,deps as any);
 assert.equal(result.commit,commit);assert.equal(result.files[0].sha256,input.files[0].sha256);
 assert.equal(pushes,1);assert.equal(reads,1);
 const replay=await writeRawImportGitArchive(input,{...deps,repository:async()=>({defaultBranch:'main',parent,existingCommit:commit})} as any);
 assert.equal(replay.commit,commit);assert.equal(pushes,1,'same immutable branch is read, not rewritten');
 await assert.rejects(writeRawImportGitArchive(input,{...deps,read:async()=>({commit,parent,parentCount:1,files:new Map([[packageFiles[0].path,Buffer.from('corrupt')]])})} as any),/RAW_IMPORT_GIT_ARCHIVE_INVALID/);
});
test('invalid path, content hash and tenant scope fail before any Git call',()=>{
 assert.throws(()=>rawImportGitPackage({...input,files:[{...input.files[0],path:'../escape'}]}),/RAW_IMPORT_GIT_ARCHIVE_INVALID/);
 assert.throws(()=>rawImportGitPackage({...input,files:[{...input.files[0],sha256:'0'.repeat(64)}]}),/RAW_IMPORT_GIT_ARCHIVE_INVALID/);
 assert.throws(()=>rawImportGitPackage({...input,scope:{...scope,siteId:'another-site'}}),/RAW_IMPORT_GIT_ARCHIVE_INVALID/);
});
test('raw import package accepts a retained capture above the former 128 MiB ceiling',()=>{
 const bytes=Buffer.alloc(26*1024*1024);
 const sha256=createHash('sha256').update(bytes).digest('hex');
 const files=Array.from({length:5},(_,index)=>({path:`assets/large-${index}.bin`,
  mediaType:'application/octet-stream',bytes,sizeBytes:bytes.length,sha256}));
 const pkg=rawImportGitPackage({...input,files});
 assert.equal(pkg.manifest.files.length,5);
 assert.equal(pkg.manifest.files.reduce((sum,file)=>sum+file.bytes,0),130*1024*1024);
});
