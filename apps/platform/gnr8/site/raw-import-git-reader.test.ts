import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import test from 'node:test';
import {readRawImportGitFile} from './raw-import-git-reader';

const version='43bb405b-912e-47e7-af85-f995cd2ed384';
const scope={agencyId:'00000000-0000-4000-8000-000000000001',
  clientId:'3d44ad6f-01e5-4884-a492-585de3b3af49',
  siteId:'9ff5613e-1625-43f1-844e-c5c91a813d4f'};
const ref={scope,repository:'pasadenagenerator/gnr8-viroidoc',commit:'a'.repeat(40),
  manifestPath:`raw-import/${version}/.gnr8-import-manifest.json`,manifestSha256:'b'.repeat(64)};
const target={owner:'pasadenagenerator',repository:'gnr8-viroidoc',token:'test'};

test('reads a path from the immutable Git commit and verifies exact bytes',async()=>{
  const bytes=Buffer.from('<html>ViroiDoc</html>');
  const file={path:'pages/b/viroidoc-welcomes-10-new-msca-fellows/index.html',
    sha256:createHash('sha256').update(bytes).digest('hex'),sizeBytes:bytes.length};
  const transport=(async (url:string|URL|Request,options?:RequestInit)=>{
    assert.equal(String(url),`https://api.github.com/repos/pasadenagenerator/gnr8-viroidoc/contents/raw-import/${version}/${file.path}?ref=${ref.commit}`);
    assert.equal(options?.redirect,'error');
    assert.equal((options?.headers as Record<string,string>).accept,'application/vnd.github.raw+json');
    return new Response(bytes);
  }) as typeof fetch;
  assert.deepEqual(await readRawImportGitFile(ref,version,file,target,transport),bytes);
  await assert.rejects(readRawImportGitFile(ref,version,{...file,sha256:'c'.repeat(64)},target,transport),
    /RAW_IMPORT_GIT_FILE_INVALID/);
  await assert.rejects(readRawImportGitFile(ref,version,file,{...target,repository:'another-repo'},transport),
    /RAW_IMPORT_GIT_FILE_INVALID/);
  await assert.rejects(readRawImportGitFile(ref,version,{...file,path:'../secret'},target,transport),
    /RAW_IMPORT_GIT_FILE_INVALID/);
});
