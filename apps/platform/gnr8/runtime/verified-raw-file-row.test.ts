import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {verifiedRawFileRow} from './verified-raw-file-row';

test('SQL raw-file consumer accepts exact bytes and rejects corrupted size/hash or missing body',()=>{
 const body=Buffer.from('retained bytes');
 const row={media_type:'image/png',file_size_bytes:body.length,
  sha256:createHash('sha256').update(body).digest('hex'),content_bytes:body};
 assert.deepEqual(verifiedRawFileRow(row),{mediaType:'image/png',sizeBytes:body.length,sha256:row.sha256,bytes:body});
 for(const broken of [{...row,file_size_bytes:body.length+1},{...row,sha256:'0'.repeat(64)},
  {...row,content_bytes:null},{...row,content_bytes:Buffer.from('altered bytes')}])
  assert.throws(()=>verifiedRawFileRow(broken),/RAW_IMPORT_ASSET_INTEGRITY_FAILED/);
});
