import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {GeneratedArtifactGitCache,type GeneratedGitRef} from './generated-artifact-git-cache';

test('generated cache repairs stale bytes and verifies the Git artifact',async()=>{
  const version='43bb405b-912e-47e7-af85-f995cd2ed384';
  const hash=(body:Buffer|string)=>createHash('sha256').update(body).digest('hex');
  const html='<html>CHS</html>';
  const styles='body{color:#123}';
  const manifest={site:'CHS'};
  const routeFile={route:'/',path:`generated/${version}/html/${hash('/')}.html`,bytes:Buffer.byteLength(html),sha256:hash(html)};
  const styleFile={path:`generated/${version}/compiled-token-styles.css`,bytes:Buffer.byteLength(styles),sha256:hash(styles)};
  const manifestFile={path:`generated/${version}/runtime-manifest.json`,bytes:Buffer.byteLength(JSON.stringify(manifest)),sha256:hash(JSON.stringify(manifest))};
  const ref={scope:{agencyId:'00000000-0000-4000-8000-000000000001',clientId:'3d44ad6f-01e5-4884-a492-585de3b3af49',siteId:'9ff5613e-1625-43f1-844e-c5c91a813d4f'},
    repository:'pasadenagenerator/gnr8-chs',commit:'a'.repeat(40),
    manifestPath:`generated/${version}/.gnr8-generated-manifest.json`,manifestSha256:'b'.repeat(64),
    routes:[routeFile],styles:styleFile,runtimeManifest:manifestFile} as GeneratedGitRef;
  const objects=new Map<string,Buffer>();
  const flags:Array<{key:string;upsert:boolean}>=[];
  const client={storage:{
    getBucket:async()=>({data:{public:false},error:null}),
    from:()=>({
      upload:async(key:string,body:Buffer,options:{upsert:boolean})=>{
        flags.push({key,upsert:options.upsert});
        if(objects.has(key)&&!options.upsert)return {data:null,error:new Error('The resource already exists')};
        objects.set(key,body);return {data:{},error:null};
      },
      download:async(key:string)=>{
        const body=objects.get(key);
        return body?{data:new Blob([new Uint8Array(body)]),error:null}:{data:null,error:new Error('missing')};
      },
    }),
  }} as unknown as ConstructorParameters<typeof GeneratedArtifactGitCache>[0];
  const key=`generated-git-cache/v1/${ref.scope.agencyId}/${ref.scope.clientId}/${ref.scope.siteId}/${version}/${ref.commit}/${routeFile.sha256}`;
  objects.set(key,Buffer.from('stale'));
  const cache=new GeneratedArtifactGitCache(client,'gnr8-astro-candidate-routes');
  await cache.prepare(ref,version,{htmlByPath:{'/':html},compiledTokenStyles:styles,manifest});
  assert.deepEqual(flags.filter(entry=>entry.key===key).map(entry=>entry.upsert),[false,true]);
  assert.equal(await cache.readRoute(ref,version,'/'),html);
});
