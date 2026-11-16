import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createStackiLocalStorage} from './stacki-local-storage-transport';
import {StackiAssetPreparation,type StackiAssetPlan} from './stacki-asset-preparation';
const sha=(body:Buffer|string)=>createHash('sha256').update(body).digest('hex');

test('partial preparation cannot open; recovery reuses verified parts and restores every byte',async()=>{
 const root=await mkdtemp(join(tmpdir(),'stacki-asset-steps-'));
 try{
  const transport=createStackiLocalStorage(root,{loseUploadResponse:true});
  const cache=new StackiAssetPreparation(transport.client,transport.bucket);
  const bodies=Array.from({length:65},(_,i)=>Buffer.from(`asset ${i}`));let reads=0;
  const plan:StackiAssetPlan={identity:sha('owned-source-and-transform'),entries:bodies.map((body,i)=>({path:String(i),name:sha(String(i)),sha256:sha(body),bytes:body.length})),read:async entries=>{reads++;return entries.map(entry=>({name:entry.name,body:bodies[Number(entry.path)]}));}};
  await assert.rejects(cache.readAll(plan),{code:'STACKI_ASSETS_NOT_PREPARED'});
  const first=await cache.step(plan,0,async()=>{});assert.equal(first.total,3);assert.equal(first.ready,false);
  await assert.rejects(cache.readAll(plan),{code:'STACKI_ASSETS_NOT_PREPARED'});
  await cache.step(plan,0,async()=>{});assert.equal(reads,1,'do not refetch a prepared part');
  await assert.rejects(cache.step(plan,1,async()=>{throw Error('revoked')}),/revoked/);
  await assert.rejects(cache.readAll(plan),{code:'STACKI_ASSETS_NOT_PREPARED'});
  await cache.step(plan,1,async()=>{});await cache.step(plan,2,async()=>{});
  const restored=await new StackiAssetPreparation(transport.client,transport.bucket).readAll(plan);
  assert.deepEqual(restored,plan.entries.map((entry,i)=>({name:entry.name,body:bodies[i]})));
  await assert.rejects(cache.readAll({...plan,identity:sha('different-owner')}),{code:'STACKI_ASSETS_NOT_PREPARED'});
  const path=join(root,`stacki-asset-preparation/v1/${plan.identity}/0.json`),bytes=await readFile(path);
  bytes[bytes.length-1]^=1;await writeFile(path,bytes);
  await assert.rejects(cache.readAll(plan),{code:'STACKI_ASSET_PREPARATION_UNAVAILABLE'});
  await assert.rejects(cache.step(plan,0,async()=>{}),{code:'STACKI_ASSET_PREPARATION_UNAVAILABLE'});
 }finally{await rm(root,{recursive:true,force:true});}
});

test('public storage, oversized dependency and forged progress fail closed',async()=>{
 const root=await mkdtemp(join(tmpdir(),'stacki-asset-limits-'));
 try{
  const transport=createStackiLocalStorage(root,{publicBucket:true});
  const cache=new StackiAssetPreparation(transport.client,transport.bucket);
  const plan:StackiAssetPlan={identity:sha('scope'),entries:[{path:'a',name:sha('a'),sha256:sha('b'),bytes:1}],read:async()=>{throw Error('must not read source')}};
  await assert.rejects(cache.step(plan,0,async()=>{}),{code:'STACKI_ASSET_PREPARATION_UNAVAILABLE'});
  await assert.rejects(cache.step(plan,5,async()=>{}),{code:'STACKI_ASSET_STEP_INVALID'});
  await assert.rejects(cache.step({...plan,entries:[{...plan.entries[0],bytes:13*1024*1024}]},0,async()=>{}),{code:'STACKI_ASSET_PREPARATION_UNAVAILABLE'});
 }finally{await rm(root,{recursive:true,force:true});}
});

test('step reports only safe failure stage and reconciles an uncertain upload',async()=>{
 const root=await mkdtemp(join(tmpdir(),'stacki-asset-diagnostic-'));
 const body=Buffer.from('retained proof');
 const plan:StackiAssetPlan={identity:sha('diagnostic'),entries:[{path:'private-source-path',name:sha('private-source-path'),sha256:sha(body),bytes:body.length}],read:async entries=>entries.map(entry=>({name:entry.name,body}))};
 const original=console.warn;const warnings:unknown[][]=[];
 console.warn=(...args:unknown[])=>{warnings.push(args)};
 try{
  const failedUpload=createStackiLocalStorage(join(root,'failed'),{failUpload:true});
  await assert.rejects(new StackiAssetPreparation(failedUpload.client,failedUpload.bucket).step(plan,0,async()=>{}),{code:'STACKI_ASSET_PREPARATION_UNAVAILABLE'});
  assert.deepEqual(warnings.at(-1)?.[1],{index:0,phase:'readback',uploadStatus:503,reason:'STACKI_ASSET_PREPARATION_UNAVAILABLE'});
  assert(!JSON.stringify(warnings).includes('private-source-path'));
  const failedRead=createStackiLocalStorage(join(root,'unreadable'),{failDownload:true});
  await assert.rejects(new StackiAssetPreparation(failedRead.client,failedRead.bucket).step(plan,0,async()=>{}),{code:'STACKI_ASSET_PREPARATION_UNAVAILABLE'});
  assert.deepEqual(warnings.at(-1)?.[1],{index:0,phase:'existing-read',uploadStatus:null,reason:'STACKI_ASSET_PREPARATION_UNAVAILABLE'});
  const before=warnings.length;
  const uncertain=createStackiLocalStorage(join(root,'uncertain'),{loseUploadResponse:true});
  assert.equal((await new StackiAssetPreparation(uncertain.client,uncertain.bucket).step(plan,0,async()=>{})).ready,true);
  assert.equal(warnings.length,before,'a lost success response must be reconciled, not reported as failure');
 }finally{console.warn=original;await rm(root,{recursive:true,force:true});}
});
