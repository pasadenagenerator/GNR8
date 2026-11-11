import {createHash} from 'node:crypto';
import {pushStandaloneGit} from '../standalone/publication-git';
import {githubCommitAuthor,githubDataBranchVercelConfig} from '../stacki/github-commit-author';

type Scope={agencyId:string;clientId:string;siteId:string};
type File={path:string;mediaType:string;sizeBytes:number;sha256:string;bytes:Buffer};
type Target={owner:string;ownerId:number;repository:string;repositoryId:number;token:string};
type GitFile={path:string;body:Buffer};
type Verification={target:Target;branch:string;commit:string;parent:string;files:GitFile[]};
type Archive={format:'gnr8-raw-import-git:v1';scope:Scope;runtimeSiteId:string;siteVersionId:string;
 files:Array<{path:string;mediaType:string;bytes:number;sha256:string}>};
const hash=(body:Uint8Array)=>createHash('sha256').update(body).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function invalid():never{throw Error('RAW_IMPORT_GIT_ARCHIVE_INVALID');}
const blobId=(body:Buffer)=>createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');
async function verifyRawImportGitTree(input:Verification,transport:typeof fetch=fetch):Promise<void>{
 const endpoint=`https://api.github.com/repos/${input.target.owner}/${input.target.repository}`;
 async function get(path:string):Promise<any>{
  const response=await transport(endpoint+path,{redirect:'error',signal:AbortSignal.timeout(30_000),
   headers:{authorization:`Bearer ${input.target.token}`,accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'}});
  if(response.headers.get('x-oauth-scopes')?.split(',').map(x=>x.trim()).includes('repo')||!response.ok)invalid();
  return response.json();
 }
 const ref=await get(`/git/ref/heads/${input.branch}`);
 if(ref?.object?.sha!==input.commit)invalid();
 const node=await get(`/git/commits/${input.commit}`);
 if(!/^[a-f0-9]{40}$/.test(node?.tree?.sha)||!Array.isArray(node?.parents)||
   node.parents.length!==1||node.parents[0]?.sha!==input.parent)invalid();
 const tree=await get(`/git/trees/${node.tree.sha}?recursive=1`);
 if(tree?.truncated||!Array.isArray(tree?.tree))invalid();
 const blobs=tree.tree.filter((entry:any)=>entry?.type==='blob');
 if(blobs.length!==input.files.length)invalid();
 const entries=new Map<string,any>(blobs.map((entry:any)=>[entry.path,entry]));
 if(entries.size!==input.files.length)invalid();
 for(const file of input.files){
  const entry=entries.get(file.path);
  if(entry?.mode!=='100644'||entry.sha!==blobId(file.body)||entry.size!==file.body.length)invalid();
 }
}
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
 const gitFiles:GitFile[]=[{path:'vercel.json',body:githubDataBranchVercelConfig},
   ...input.files.map(f=>({path:prefix+f.path,body:f.bytes})),
   {path:prefix+'.gnr8-import-manifest.json',body:Buffer.from(JSON.stringify(manifest))}];
 return {manifest,prefix,gitFiles,manifestSha256:hash(gitFiles.at(-1)!.body)};
}

/** Immutable raw capture branch. The caller must authenticate the owner and
 * verify the exact private target first. No DB write is performed here. */
export async function writeRawImportGitArchive(input:{scope:Scope;runtimeSiteId:string;siteVersionId:string;
 files:File[];target:Target},deps:{
 repository:()=>Promise<{defaultBranch:string;parent:string;existingCommit?:string}>;
 push?:typeof pushStandaloneGit;transport?:typeof fetch;
}):Promise<{repository:string;commit:string;manifestPath:string;manifestSha256:string;files:Archive['files']}>{
 const {manifest,prefix,gitFiles,manifestSha256}=rawImportGitPackage(input);
 const {defaultBranch,parent,existingCommit}=await deps.repository();
 if(!/^[a-zA-Z0-9._/-]{1,100}$/.test(defaultBranch)||!/^[a-f0-9]{40}$/.test(parent))invalid();
 const branch=`imports/${input.siteVersionId}`;
 if(existingCommit!==undefined&&!/^[a-f0-9]{40}$/.test(existingCommit))invalid();
 const commit=existingCommit??(await (deps.push??pushStandaloneGit)({owner:input.target.owner,repository:input.target.repository,
  defaultBranch,parent,ref:`heads/${branch}`,manifestSha256,files:gitFiles,token:input.target.token,
  author:githubCommitAuthor(input.target, 'GNR8 Import')})).commit;
 await verifyRawImportGitTree({target:input.target,branch,commit,parent,files:gitFiles},deps.transport);
 return {repository:`${input.target.owner}/${input.target.repository}`,commit,
  manifestPath:prefix+'.gnr8-import-manifest.json',manifestSha256,files:manifest.files};
}
