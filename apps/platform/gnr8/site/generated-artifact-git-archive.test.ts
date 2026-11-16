import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generatedArtifactGitPackage,writeGeneratedArtifactGitArchive} from './generated-artifact-git-archive';
import policy from '../output-adapters/lumos-reviewed-export.json';
import {exportMediaType} from '../output-adapters/astro-export-resources';

const input={scope:{agencyId:'11111111-1111-4111-8111-111111111111',
  clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333'},
  runtimeSiteId:'site_123',siteVersionId:'44444444-4444-4444-8444-444444444444',
  htmlByPath:{'/':'<h1>Home</h1>','/about':'<h1>About</h1>'},
  compiledTokenStyles:'body{color:red}',manifest:{sourceKind:'scoped_pipeline_import'},
  target:{owner:'owner',ownerId:10,repository:'site',repositoryId:12,token:'test-token'}};
const parent='a'.repeat(40),commit='b'.repeat(40);

test('generated HTML, CSS and runtime manifest are committed and verified exactly',async()=>{
  const pkg=generatedArtifactGitPackage(input);
  assert.equal(pkg.descriptor.routes.length,2);
  assert(pkg.gitFiles.some(file=>file.body.toString()==='<h1>About</h1>'));
  let pushed=0;
  const deps={repository:async(branch:string)=>{
    assert.equal(branch,`artifacts/${input.siteVersionId}/${pkg.manifestSha256}`);
    return {defaultBranch:'main',parent};
  },push:async(request:any)=>{pushed++;assert.deepEqual(request.files,pkg.gitFiles);return {commit,tree:'c'.repeat(40)};},
  read:async()=>({commit,parent,parentCount:1,files:new Map(pkg.gitFiles.map(file=>[file.path,file.body]))})};
  const archive=await writeGeneratedArtifactGitArchive(input,deps as any);
  assert.equal(archive.commit,commit);assert.equal(archive.manifestSha256,pkg.manifestSha256);
  assert.equal(pushed,1);
  await writeGeneratedArtifactGitArchive(input,{...deps,repository:async()=>({defaultBranch:'main',parent,existingCommit:commit})} as any);
  assert.equal(pushed,1);
  await assert.rejects(writeGeneratedArtifactGitArchive(input,{...deps,
    read:async()=>({commit,parent,parentCount:1,files:new Map([[pkg.gitFiles[0].path,Buffer.from('corrupt')]])})} as any),
  /GENERATED_ARTIFACT_GIT_INVALID/);
});

test('resource package retains every original export byte and rejects changed bytes',async()=>{
  const files=policy.files.map(({path})=>{
    const body=Buffer.from(`local Git package fixture: ${path}`);
    return {path,mediaType:exportMediaType(path),sizeBytes:body.length,
      sha256:createHash('sha256').update(body).digest('hex'),base64:body.toString('base64')};
  });
  const withResources={...input,exportedFiles:files};
  const pkg=generatedArtifactGitPackage(withResources);
  assert.equal(pkg.descriptor.resources?.length,22);
  for(const file of files){
    const ref=pkg.descriptor.resources?.find(entry=>entry.sourcePath===file.path);
    assert.equal(pkg.gitFiles.find(entry=>entry.path===ref?.path)?.body.toString('base64'),file.base64);
  }
  const deps={repository:async()=>({defaultBranch:'main',parent}),
    push:async()=>({commit,tree:'c'.repeat(40)}),
    read:async()=>({commit,parent,parentCount:1,files:new Map(pkg.gitFiles.map(entry=>[entry.path,entry.body]))})};
  const ref=await writeGeneratedArtifactGitArchive(withResources,deps as never);
  assert.equal(ref.resources?.length,22);
  assert.throws(()=>generatedArtifactGitPackage({...withResources,
    exportedFiles:[{...files[0],base64:Buffer.from('changed').toString('base64')},...files.slice(1)]}),
  /GENERATED_ARTIFACT_GIT_INVALID/);
});
