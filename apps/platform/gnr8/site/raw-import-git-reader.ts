import 'server-only';
import {createHash} from 'node:crypto';
import type {RawImportedSiteArtifactMetadata} from '../runtime/types';

type Ref=NonNullable<RawImportedSiteArtifactMetadata['gitArchive']>;
type Target={owner:string;repository:string;token:string};
type File={path:string;sha256:string;sizeBytes:number};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const sha=/^[a-f0-9]{64}$/;
const commit=/^[a-f0-9]{40}$/;
function invalid():never{throw Error('RAW_IMPORT_GIT_FILE_INVALID');}

/** Read one immutable Git blob. The configured site repository and exact
 * manifest hash remain authoritative; the response is checked against the
 * persisted file metadata before it can reach a preview. */
export async function readRawImportGitFile(ref:Ref,versionId:string,file:File,target:Target,
  transport:typeof fetch=fetch):Promise<Buffer>{
  if(!ref||!uuid.test(versionId)||!uuid.test(ref.scope?.agencyId??'')||
    !uuid.test(ref.scope?.clientId??'')||!uuid.test(ref.scope?.siteId??'')||
    Object.keys(ref.scope??{}).length!==3||!commit.test(ref.commit)||
    !sha.test(ref.manifestSha256)||!sha.test(file.sha256)||
    ref.manifestPath!==`raw-import/${versionId}/.gnr8-import-manifest.json`||
    !/^[A-Za-z0-9-]{1,39}$/.test(target.owner)||
    !/^[a-z0-9][a-z0-9-]{0,62}$/.test(target.repository)||!target.token||
    ref.repository!==`${target.owner}/${target.repository}`||
    !Number.isSafeInteger(file.sizeBytes)||file.sizeBytes<0||file.sizeBytes>100*1024*1024||
    !file.path||file.path.length>500||file.path.includes('\\')||
    file.path.split('/').some(part=>!part||part==='.'||part==='..'||part==='.git'))invalid();
  const archivePath=ref.format==='gnr8-raw-import-git:v2'
    ? `blobs/${file.sha256}`
    : file.path;
  const path=`raw-import/${versionId}/${archivePath.split('/').map(encodeURIComponent).join('/')}`;
  let response=await transport(`https://api.github.com/repos/${target.owner}/${target.repository}/contents/${path}?ref=${ref.commit}`,
    {redirect:'manual',signal:AbortSignal.timeout(30_000),headers:{
      authorization:`Bearer ${target.token}`,accept:'application/vnd.github.raw+json',
      'X-GitHub-Api-Version':'2022-11-28',
    }});
  if(response.headers.get('x-oauth-scopes')?.split(',').map(x=>x.trim()).includes('repo'))invalid();
  if(response.status===302){
    let location:URL;
    try{location=new URL(response.headers.get('location')??'');}catch{invalid();}
    if(location.protocol!=='https:'||location.username||location.password||location.hash||
      !/^[a-z0-9-]+\.githubusercontent\.com$/.test(location.hostname))invalid();
    // GitHub's temporary download URL is already authorized. Never forward
    // the repository credential to the CDN host or follow another redirect.
    response=await transport(location,{redirect:'error',signal:AbortSignal.timeout(30_000)});
  }
  if(!response.ok)invalid();
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length!==file.sizeBytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)invalid();
  return bytes;
}
