import {createHash} from 'node:crypto';
import {pushStandaloneGit,readStandaloneGit} from '../standalone/publication-git';
import {githubCommitAuthor,githubDataBranchVercelConfig} from '../stacki/github-commit-author';
import {validateExportPath,type AstroExportResource} from '../output-adapters/astro-export-resources';

type Scope={agencyId:string;clientId:string;siteId:string};
type Target={owner:string;ownerId:number;repository:string;repositoryId:number;token:string};
type Input={scope:Scope;runtimeSiteId:string;siteVersionId:string;htmlByPath:Record<string,string>;
  compiledTokenStyles:string;manifest:Record<string,unknown>;exportedFiles?:AstroExportResource[];target:Target};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const sha1=/^[a-f0-9]{40}$/;
const hash=(body:Uint8Array|string)=>createHash('sha256').update(body).digest('hex');
function invalid():never{throw Error('GENERATED_ARTIFACT_GIT_INVALID');}

/** File-complete immutable package for one generated runtime artifact. */
export function generatedArtifactGitPackage(input:Input){
  if(!Object.values(input.scope).every(value=>uuid.test(value))||!uuid.test(input.siteVersionId)||
    !/^[A-Za-z0-9_-]{1,128}$/.test(input.runtimeSiteId)||
    typeof input.compiledTokenStyles!=='string'||!input.manifest||
    typeof input.manifest!=='object'||Array.isArray(input.manifest))invalid();
  const routes=Object.keys(input.htmlByPath).sort();
  if(!routes.length||routes.length>10000||routes.some(route=>!route.startsWith('/')||
    route.includes('?')||route.includes('#')||route.includes('\\')||route.includes('..')||
    typeof input.htmlByPath[route]!=='string'))invalid();
  const prefix=`generated/${input.siteVersionId}/`;
  const files=routes.map(route=>{
    const body=Buffer.from(input.htmlByPath[route],'utf8');
    return {route,path:`${prefix}html/${hash(route)}.html`,body,sha256:hash(body)};
  });
  const styles=Buffer.from(input.compiledTokenStyles,'utf8');
  const manifest=Buffer.from(JSON.stringify(input.manifest));
  if(input.exportedFiles && (!input.exportedFiles.length||input.exportedFiles.length>10000))invalid();
  const resourcePaths=new Set<string>();
  const resources=(input.exportedFiles??[]).map(file=>{
    try{validateExportPath(file.path);}catch{invalid();}
    if(resourcePaths.has(file.path)||typeof file.mediaType!=='string'||
      !/^[a-z0-9+.-]+\/[a-z0-9+.-]+(?:; charset=utf-8)?$/.test(file.mediaType)||
      !/^[a-f0-9]{64}$/.test(file.sha256)||!Number.isSafeInteger(file.sizeBytes)||
      file.sizeBytes<1||typeof file.base64!=='string')invalid();
    resourcePaths.add(file.path);
    const body=Buffer.from(file.base64,'base64');
    if(body.toString('base64')!==file.base64||body.length!==file.sizeBytes||hash(body)!==file.sha256)invalid();
    return {sourcePath:file.path,path:`${prefix}resources/${Buffer.from(file.path).toString('base64url')}-${file.sha256}`,
      mediaType:file.mediaType,body,bytes:body.length,sha256:file.sha256};
  }).sort((a,b)=>a.sourcePath.localeCompare(b.sourcePath));
  const gitFiles=[{path:'vercel.json',body:githubDataBranchVercelConfig},
    ...files.map(({path,body})=>({path,body})),
    {path:`${prefix}compiled-token-styles.css`,body:styles},
    {path:`${prefix}runtime-manifest.json`,body:manifest},
    ...resources.map(({path,body})=>({path,body}))];
  const descriptor={format:'gnr8-generated-artifact-git:v1',scope:input.scope,
    runtimeSiteId:input.runtimeSiteId,siteVersionId:input.siteVersionId,
    routes:files.map(({route,path,body,sha256})=>({route,path,bytes:body.length,sha256})),
    styles:{path:`${prefix}compiled-token-styles.css`,bytes:styles.length,sha256:hash(styles)},
    runtimeManifest:{path:`${prefix}runtime-manifest.json`,bytes:manifest.length,sha256:hash(manifest)},
    ...(input.exportedFiles?{resources:resources.map(({sourcePath,path,mediaType,bytes,sha256})=>
      ({sourcePath,path,mediaType,bytes,sha256}))}:{})};
  const descriptorBody=Buffer.from(JSON.stringify(descriptor));
  gitFiles.push({path:`${prefix}.gnr8-generated-manifest.json`,body:descriptorBody});
  if(gitFiles.reduce((total,file)=>total+file.body.length,0)>128*1024*1024)invalid();
  return {descriptor,gitFiles,manifestPath:`${prefix}.gnr8-generated-manifest.json`,manifestSha256:hash(descriptorBody)};
}

export async function writeGeneratedArtifactGitArchive(input:Input,deps:{
  repository:(branch:string)=>Promise<{defaultBranch:string;parent:string;existingCommit?:string}>;
  push?:typeof pushStandaloneGit;read?:typeof readStandaloneGit;
}){
  const packageData=generatedArtifactGitPackage(input);
  const branch=`artifacts/${input.siteVersionId}/${packageData.manifestSha256}`;
  const {defaultBranch,parent,existingCommit}=await deps.repository(branch);
  if(!/^[a-zA-Z0-9._/-]{1,100}$/.test(defaultBranch)||!sha1.test(parent)||
    (existingCommit!==undefined&&!sha1.test(existingCommit)))invalid();
  const commit=existingCommit??(await (deps.push??pushStandaloneGit)({
    owner:input.target.owner,repository:input.target.repository,defaultBranch,parent,
    ref:`heads/${branch}`,manifestSha256:packageData.manifestSha256,
    files:packageData.gitFiles,token:input.target.token,
    author:githubCommitAuthor(input.target, 'GNR8 Artifact'),
  })).commit;
  const read=await (deps.read??readStandaloneGit)({owner:input.target.owner,
    repository:input.target.repository,branch,commit,token:input.target.token});
  if(read.commit!==commit||read.parent!==parent||read.parentCount!==1||
    read.files.size!==packageData.gitFiles.length)invalid();
  for(const file of packageData.gitFiles)if(!read.files.get(file.path)?.equals(file.body))invalid();
  return {scope:input.scope,repository:`${input.target.owner}/${input.target.repository}`,commit,
    manifestPath:packageData.manifestPath,manifestSha256:packageData.manifestSha256,
    routes:packageData.descriptor.routes,styles:packageData.descriptor.styles,
    runtimeManifest:packageData.descriptor.runtimeManifest,
    ...('resources' in packageData.descriptor?{resources:packageData.descriptor.resources}:{})};
}
