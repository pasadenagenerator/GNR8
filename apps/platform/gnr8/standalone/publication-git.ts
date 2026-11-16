import 'server-only';
import fs from 'node:fs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import git from 'isomorphic-git';
import type {ExportFile} from './standalone-export';
type GitHttp = NonNullable<Parameters<typeof git.clone>[0]['http']>;
function githubHttp(url:string,transport:typeof fetch,deadline:number):GitHttp{return {async request(request){
  const endpoint=new URL(request.url);if(endpoint.origin!=='https://github.com'||![url+'/info/refs',url+'/git-upload-pack',url+'/git-receive-pack'].includes(endpoint.origin+endpoint.pathname))throw Error('standalone_git_endpoint_invalid');
  const chunks:Buffer[]=[];let bytes=0;if(request.body)for await(const chunk of request.body){const b=Buffer.from(chunk);bytes+=b.length;if(bytes>128*1024*1024)throw Error('standalone_git_budget_exceeded');chunks.push(b);}
  if(Date.now()>=deadline)throw Error('standalone_git_timeout');
  const response=await transport(request.url,{method:request.method??'GET',headers:request.headers,body:chunks.length?Buffer.concat(chunks):undefined,redirect:'error',signal:AbortSignal.timeout(Math.max(1,deadline-Date.now()))});
  const output:Uint8Array[]=[];let total=0;if(response.body)for await(const chunk of response.body as unknown as AsyncIterable<Uint8Array>){total+=chunk.length;if(total>128*1024*1024)throw Error('standalone_git_budget_exceeded');output.push(chunk);}
  return {url:request.url,method:request.method??'GET',statusCode:response.status,statusMessage:response.statusText,headers:Object.fromEntries(response.headers),body:(async function*(){yield* output;})()};
 }};}
export async function readStandaloneGit(input:{owner:string;repository:string;branch:string;commit:string;token:string},transport:typeof fetch=fetch){
 const dir=await mkdtemp(join(tmpdir(),'gnr8-stacki-git-read-'));const url=`https://github.com/${input.owner}/${input.repository}.git`;
 const http=githubHttp(url,transport,Date.now()+90_000);const onAuth=()=>({username:input.token,password:'x-oauth-basic'});
 try{
  await git.clone({fs,http,dir,url,ref:input.branch,singleBranch:true,noCheckout:true,noTags:true,depth:65,onAuth,onAuthFailure:()=>{throw Error('standalone_git_auth_failed');}});
  const node=await git.readCommit({fs,dir,oid:input.commit});
  const paths=await git.listFiles({fs,dir,ref:input.commit});const files=new Map<string,Buffer>();
  for(let i=0;i<paths.length;i+=16){const chunk=paths.slice(i,i+16);const bodies=await Promise.all(chunk.map(async path=>Buffer.from((await git.readBlob({fs,dir,oid:input.commit,filepath:path})).blob)));for(let j=0;j<chunk.length;j++)files.set(chunk[j],bodies[j]);}
  return {commit:input.commit,parent:node.commit.parent.length===1?node.commit.parent[0]:null,parentCount:node.commit.parent.length,files};
 }catch{throw Error('standalone_git_read_unavailable');}finally{await rm(dir,{recursive:true,force:true});}
}
/** Assemble only manifest files as Git objects. No worktree traversal, hooks,
 * shell credentials, editor state or object-store references enter the commit. */
export async function writeExportTree(dir:string,files:ExportFile[]){
 type Node={files:Map<string,string>;dirs:Map<string,Node>};const root:Node={files:new Map(),dirs:new Map()};
 for(const f of files){const parts=f.path.split('/');if(parts.some(p=>!p||p==='.'||p==='..'||p.toLowerCase()==='.git')||f.path.includes('\\'))throw Error('standalone_git_path_invalid');let node=root;for(const part of parts.slice(0,-1)){if(node.files.has(part))throw Error('standalone_git_path_conflict');if(!node.dirs.has(part))node.dirs.set(part,{files:new Map(),dirs:new Map()});node=node.dirs.get(part)!;}const name=parts.at(-1)!;if(node.files.has(name)||node.dirs.has(name))throw Error('standalone_git_path_conflict');node.files.set(name,await git.writeBlob({fs,dir,blob:f.body}));}
 async function write(node:Node):Promise<string>{const entries:Array<{mode:string;path:string;oid:string;type:'blob'|'tree'}>=[];for(const [path,oid]of node.files)entries.push({path,oid,type:'blob',mode:'100644'});for(const [path,child]of node.dirs)entries.push({path,oid:await write(child),type:'tree',mode:'040000'});return git.writeTree({fs,dir,tree:entries});}return write(root);
}
export async function pushStandaloneGit(input:{owner:string;repository:string;defaultBranch:string;parent:string;ref:string;manifestSha256:string;files:ExportFile[];token:string;author:{name:string;email:string}},transport:typeof fetch=fetch){
 const dir=await mkdtemp(join(tmpdir(),'gnr8-standalone-git-'));const url=`https://github.com/${input.owner}/${input.repository}.git`;
 const deadline=Date.now()+180000;
 const http=githubHttp(url,transport,deadline);
 const onAuth=()=>({username:input.token,password:'x-oauth-basic'});
 try{
  await git.clone({fs,http,dir,url,ref:input.defaultBranch,singleBranch:true,noCheckout:true,noTags:true,depth:1,onAuth,onAuthFailure:()=>{throw Error('standalone_git_auth_failed');}});
  const parent=await git.resolveRef({fs,dir,ref:input.defaultBranch});if(parent!==input.parent)throw Error('standalone_git_parent_changed');
  const tree=await writeExportTree(dir,input.files);const author={...input.author,timestamp:Math.floor(Date.now()/1000),timezoneOffset:0};
  const commit=await git.writeCommit({fs,dir,commit:{tree,parent:[parent],author,committer:author,message:`Standalone release ${input.manifestSha256}\n`}});
  await git.writeRef({fs,dir,ref:'refs/'+input.ref,value:commit,force:true});
  const result=await git.push({fs,http,dir,url,ref:'refs/'+input.ref,remoteRef:'refs/'+input.ref,force:false,onAuth,onAuthFailure:()=>{throw Error('standalone_git_auth_failed');}});
  if(!result.ok)throw Error('standalone_git_push_unconfirmed');return {commit,tree};
 }catch{throw Error('standalone_git_push_unconfirmed');}finally{await rm(dir,{recursive:true,force:true});}
}
