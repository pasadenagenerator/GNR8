import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {getRawTemplateSiteArtifactFiles,verifiedRawArtifactFile} from './runtime-store';

test('SQL raw reader hydrates Git reference and still reads legacy byte rows',async()=>{
  const bytes=Buffer.from('<h1>GNR8</h1>'),sha256=createHash('sha256').update(bytes).digest('hex');
  const row={media_type:'text/html',file_size_bytes:bytes.length,sha256,
    content_bytes:Buffer.alloc(0)};
  const gitArchive={scope:{agencyId:'11111111-1111-4111-8111-111111111111',
    clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333'},
    repository:'owner/site',commit:'a'.repeat(40),manifestPath:'raw-import/version/.gnr8-import-manifest.json',manifestSha256:'b'.repeat(64)};
  let reads=0;
  const cache={read:async(ref:unknown,version:string,file:{sha256:string;sizeBytes:number})=>{
    reads++;assert.deepEqual(ref,gitArchive);assert.equal(version,'version');assert.equal(file.sha256,sha256);
    return bytes;
  }};
  assert.deepEqual((await verifiedRawArtifactFile({...row,metadata_json:{gitArchive}},'version',cache)).bytes,bytes);
  assert.equal(reads,1);
  assert.deepEqual((await verifiedRawArtifactFile({...row,content_bytes:bytes},'version',cache)).bytes,bytes);
  assert.equal(reads,1);
  await assert.rejects(verifiedRawArtifactFile({...row,metadata_json:{gitArchive}},'version',
    {read:async()=>Buffer.from('corrupt')}),/RAW_IMPORT_ASSET_INTEGRITY_FAILED/);
});

test('bulk raw reader bounds parallel Git reads and preserves file order and integrity',async()=>{
  const gitArchive={scope:{agencyId:'11111111-1111-4111-8111-111111111111',
    clientId:'22222222-2222-4222-8222-222222222222',siteId:'33333333-3333-4333-8333-333333333333'},
    repository:'owner/site',commit:'a'.repeat(40),manifestPath:'raw-import/version/.gnr8-import-manifest.json',manifestSha256:'b'.repeat(64)};
  const bodies=Array.from({length:40},(_,index)=>Buffer.from(`file-${index}`));
  const byHash=new Map(bodies.map(bytes=>[createHash('sha256').update(bytes).digest('hex'),bytes]));
  const rows=bodies.map((bytes,index)=>({file_path:`file-${String(index).padStart(2,'0')}.html`,
    media_type:'text/html',file_size_bytes:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex'),content_bytes:Buffer.alloc(0),metadata_json:{gitArchive}}));
  let active=0,maxActive=0;
  const files=await getRawTemplateSiteArtifactFiles({siteVersionId:'version',artifactId:'artifact',
    dbClient:{query:async()=>({rows,rowCount:rows.length})} as never,
    cache:{read:async(_ref,_version,file)=>{
      active++;maxActive=Math.max(maxActive,active);
      await new Promise(resolve=>setTimeout(resolve,1));
      active--;
      return byHash.get(file.sha256)!;
    }}});
  assert.ok(maxActive>1,'large captures should not read one file at a time');
  assert.ok(maxActive<=16,'remote reads must remain bounded');
  assert.deepEqual(files.map(file=>file.path),rows.map(row=>row.file_path));
  assert.deepEqual(files.map(file=>file.bytes),bodies);
});
