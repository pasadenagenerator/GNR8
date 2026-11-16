import {createHash} from 'node:crypto';
import {pushStandaloneGit,readStandaloneGit} from '../standalone/publication-git';

type Scope={agencyId:string;clientId:string;siteId:string};
type File={path:string;mediaType:string;sizeBytes:number;sha256:string;bytes:Buffer};
type Target={owner:string;ownerId:number;repository:string;repositoryId:number;token:string};
type GitFile={path:string;body:Buffer};
type Archive={format:'gnr8-raw-import-git:v1';scope:Scope;runtimeSiteId:string;siteVersionId:string;
 files:Array<{path:string;mediaType:string;bytes:number;sha256:string}>};
const hash=(body:Uint8Array)=>createHash('sha256').update(body).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function invalid():never{throw Error('RAW_IMPORT_GIT_ARCHIVE_INVALID');}
function filePath(path:string){
 if(typeof path!=='string'||path.length>500||!path||path.includes('\\')||path.split('/').some(s=>!s||s==='.'||s==='..'||s==='.git'||s.startsWith('.gnr8')))invalid();
 return path;
}
export function rawImportGitPackage(input:{scope:Scope;runtimeSiteId:string;siteVersionId:string;files:File[]}){
 if(!Object.values(input.scope).every(v=>uuid.test(v))||!uuid.test(input.siteVersionId)||
   !/^[A-Za-z0-9_-]{1,128}$/.test(input.runtimeSiteId)||input.files.length<1||input.files.length>10000)invalid();
 const seen=new Set<string>();let total=0;
 const files=input.files.map(file=>{
  const path=filePath(file.path),key=path.normalize('NFC').toLowerCase();
  if(seen.has(key)||!Buffer.isBuffer(file.bytes)||file.bytes.length!==file.sizeBytes||
    hash(file.bytes)!==file.sha256||!/^[a-z0-9.+-]+\/[a-z0-9.+-]+(?:; charset=utf-8)?$/i.test(file.mediaType))invalid();
  seen.add(key);total+=file.bytes.length;if(total>128*1024*1024)invalid();
  return {path,mediaType:file.mediaType,bytes:file.sizeBytes,sha256:file.sha256};
 }).sort((a,b)=>a.path.localeCompare(b.path));
 const manifest:Archive={format:'gnr8-raw-import-git:v1',scope:input.scope,runtimeSiteId:input.runtimeSiteId,
   siteVersionId:input.siteVersionId,files};
 const prefix=`raw-import/${input.siteVersionId}/`;
 const gitFiles:GitFile[]=[...input.files.map(f=>({path:prefix+f.path,body:f.bytes})),
   {path:prefix+'.gnr8-import-manifest.json',body:Buffer.from(JSON.stringify(manifest))}];
 return {manifest,prefix,gitFiles,manifestSha256:hash(gitFiles.at(-1)!.body)};
}

/** Immutable raw capture branch. The caller must authenticate the owner and
 * verify the exact private target first. No DB write is performed here. */
export async function writeRawImportGitArchive(input:{scope:Scope;runtimeSiteId:string;siteVersionId:string;
 files:File[];target:Target},deps:{
 repository:()=>Promise<{defaultBranch:string;parent:string;existingCommit?:string}>;
 push?:typeof pushStandaloneGit;read?:typeof readStandaloneGit;
}):Promise<{repository:string;commit:string;manifestPath:string;manifestSha256:string;files:Archive['files']}>{
 const {manifest,prefix,gitFiles,manifestSha256}=rawImportGitPackage(input);
 const {defaultBranch,parent,existingCommit}=await deps.repository();
 if(!/^[a-zA-Z0-9._/-]{1,100}$/.test(defaultBranch)||!/^[a-f0-9]{40}$/.test(parent))invalid();
 const branch=`imports/${input.siteVersionId}`;
 if(existingCommit!==undefined&&!/^[a-f0-9]{40}$/.test(existingCommit))invalid();
 const commit=existingCommit??(await (deps.push??pushStandaloneGit)({owner:input.target.owner,repository:input.target.repository,
  defaultBranch,parent,ref:`heads/${branch}`,manifestSha256,files:gitFiles,token:input.target.token,
  author:{name:'GNR8 Import',email:'import@gnr8.invalid'}})).commit;
 const read=await (deps.read??readStandaloneGit)({owner:input.target.owner,repository:input.target.repository,
  branch,commit,token:input.target.token});
 if(read.commit!==commit||read.parent!==parent||read.parentCount!==1||
   read.files.size!==gitFiles.length||[...read.files.keys()].some(path=>!gitFiles.some(f=>f.path===path)))invalid();
 for(const file of gitFiles)if(!read.files.get(file.path)?.equals(file.body))invalid();
 return {repository:`${input.target.owner}/${input.target.repository}`,commit,
  manifestPath:prefix+'.gnr8-import-manifest.json',manifestSha256,files:manifest.files};
}
