import "server-only";
import { createHash } from 'node:crypto';
import { SupabaseAstroCandidateRuntimeArtifactStore } from "../output-adapters/astro-candidate-runtime-artifact-store";
import { validateGeneratedOutputBuildEvidence, validateGeneratedOutputContentManifest } from "../output-adapters/generated-output-eligibility";
import { createVerifiedRetainedAssetReader, readVerifiedRetainedAsset } from "../output-adapters/verified-retained-asset";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STACKI_FILE_MAX_BYTES, STACKI_PROJECT_MAX_BYTES } from "./stacki-draft-contract";
import { retainedAssetName, type StackiRuntimeAsset } from "./stacki-retained-assets";
import { prepareStackiSourceProject } from "./stacki-source-project";
import { StackiDraftError, type StackiDraftScope } from "./stacki-draft-contract";
import { stackiImageMediaType } from './stacki-candidate-source';
import { parseStackiCandidateSelection } from './stacki-candidate-selection';
import { SupabaseStackiDraftStore } from './stacki-draft-store';
import { resolvedGitHubStackiStore } from './stacki-github-config';
import { ASTRO_CANDIDATE_OBJECT_BUCKET_ENV } from '../output-adapters/astro-production-candidate-object-store';
import { createAstroStaticSiteSourceSnapshot } from '../output-adapters/astro-static-site-workspace-preparation';

/** Caller already authorized the selected version. Reuses stateless GNR8 reads. */
export async function loadStackiSource(scope: StackiDraftScope, client: SupabaseClient,
  authorizeVersion: (scope: StackiDraftScope, siteVersionId: string) => Promise<unknown>,
  verifiedArtifactBaseline = false) {
  const runtime = new SupabaseAstroCandidateRuntimeArtifactStore(client);
  const selected = await runtime.readSourceContext(scope.siteVersionId);
  if (!selected?.artifact || selected.siteVersion.id !== scope.siteVersionId ||
      selected.artifact.siteVersionId !== scope.siteVersionId ||
      selected.artifact.id !== selected.siteVersion.artifactId ||
      selected.artifact.siteId !== selected.siteVersion.siteId) invalid();
  let build;
  try { build = validateGeneratedOutputBuildEvidence(selected.artifact.manifest.generatedOutputBuildEvidence); }
  catch { invalid(); }
  const content = validateGeneratedOutputContentManifest(selected.artifact.manifest.generatedOutputContentManifest);
  if (!build || !content || content.sourceRef !== build.contentManifestSourceRef ||
      build.sourceCapture.runtimeSiteId !== selected.siteVersion.siteId) invalid();
  const capture = build.sourceCapture;
  // Provenance is not authorization: independently check the original capture.
  await authorizeVersion(scope, capture.siteVersionId);
  const source = await runtime.readSourceContext(capture.siteVersionId);
  if (!source?.artifact || source.siteVersion.id !== capture.siteVersionId ||
      source.siteVersion.siteId !== selected.siteVersion.siteId || source.artifact.siteId !== selected.siteVersion.siteId ||
      source.siteVersion.artifactId !== capture.artifactId || source.artifact.id !== capture.artifactId ||
      source.artifact.siteVersionId !== capture.siteVersionId ||
      source.artifact.bundleSha256 !== capture.artifactBundleSha256) invalid();
  const workspace = selected.artifact.manifest.generatedOutputSourceWorkspace as Record<string, unknown> | undefined;
  // A historical Stacki revision can predate the GitHub migration. For a new
  // baseline, the immutable generated artifact already carries the exact built
  // project; verify its files against the recorded build snapshot before upgrading.
  if (verifiedArtifactBaseline && workspace?.stackiRevision) {
    const ref = workspace.stackiRevision as Record<string, unknown>;
    const saved = parseStackiCandidateSelection({ scope: ref.scope, revision: ref.revision, sha256: ref.sha256 });
    if (saved.scope.siteId !== scope.siteId || saved.scope.clientId !== scope.clientId || saved.scope.agencyId !== scope.agencyId) invalid();
    await authorizeVersion(saved.scope, saved.scope.siteVersionId);
    if (!Array.isArray(workspace.files)) invalid();
    const files = workspace.files.map((file: Record<string, unknown>) => {
      if (typeof file.path !== 'string' || typeof file.sha256 !== 'string' ||
          typeof file.bytes !== 'number' ||
          (typeof file.contents !== 'string' && typeof file.base64 !== 'string')) invalid();
      const body = typeof file.base64 === 'string' ? Buffer.from(file.base64, 'base64') : Buffer.from(file.contents as string);
      if (body.length !== file.bytes || createHash('sha256').update(body).digest('hex') !== file.sha256) invalid();
      return { path: file.path, body };
    });
    if (createAstroStaticSiteSourceSnapshot(files).aggregateSha256 !== build.sourceSnapshotSha256) invalid();
    return files.map(file => ({ path: file.path, base64: file.body.toString('base64') }));
  }
  if (workspace?.stackiRevision) {
    const ref = workspace.stackiRevision as Record<string, unknown>;
    const saved = parseStackiCandidateSelection({ scope: ref.scope, revision: ref.revision, sha256: ref.sha256 });
    if (saved.scope.siteId !== scope.siteId || saved.scope.clientId !== scope.clientId || saved.scope.agencyId !== scope.agencyId) invalid();
    await authorizeVersion(saved.scope, saved.scope.siteVersionId);
    const githubStore=await resolvedGitHubStackiStore(saved.scope);
    const checkpoint = await (githubStore ??
      new SupabaseStackiDraftStore(client, process.env[ASTRO_CANDIDATE_OBJECT_BUCKET_ENV] ?? '')).revision(saved.scope, saved.revision);
    if (checkpoint.sha256 !== saved.sha256 || !Array.isArray(workspace.files)) invalid();
    const files = new Map(checkpoint.files.map(file => [file.path, file]));
    const mirrors:typeof checkpoint.files=[];
    const snapshot = createAstroStaticSiteSourceSnapshot(workspace.files.map((file: { path: string }) => {
      let retained = files.get(file.path);
      if (!retained && workspace.stackiImageProjection === 'src-image-public-mirror:v1' &&
          /^public\/src\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_.-]+\.(?:png|jpe?g|webp|svg)$/i.test(file.path)) {
        const image=files.get(file.path.slice(7));
        if(image && stackiImageMediaType(image.path,Buffer.from(image.base64,'base64'))) {
          retained={path:file.path,base64:image.base64};mirrors.push(retained);
        }
      }
      if (!retained) invalid();
      return { path: file.path, body: Buffer.from(retained.base64, 'base64') };
    }));
    if (snapshot.aggregateSha256 !== build.sourceSnapshotSha256) invalid();
    return [...checkpoint.files,...mirrors];
  }
  const project = await prepareStackiSourceProject({
    ...(needsRetainedOverlay(workspace,content.requiredAssets) ? {assetMode:"runtime-overlay" as const} : {}),
    workspace: selected.artifact.manifest.generatedOutputSourceWorkspace,
    binding: { runtimeSiteId: selected.siteVersion.siteId, sourceSiteVersionId: capture.siteVersionId,
      sourceArtifactId: capture.artifactId, sourceSnapshotSha256: build.sourceSnapshotSha256,
      requiredAssets: content.requiredAssets },
    readVerifiedAsset: async (asset, path, allowedPaths) => {
      const response = await readVerifiedRetainedAsset({
        siteId: selected.siteVersion.siteId, siteVersionId: capture.siteVersionId,
        path, expectedSha256: asset.sha256, allowedPaths,
      }, client);
      if (!response.ok) throw new StackiDraftError(503, "STACKI_SOURCE_ASSET_UNAVAILABLE");
      return new Uint8Array(await response.arrayBuffer());
    },
  });
  return project.files;
}
function invalid(): never { throw new StackiDraftError(422, "STACKI_SOURCE_PROJECT_UNAVAILABLE"); }


/** Called only after normal session authorization, before reserving a start.
 * Reads the same immutable, ownership-checked capture dependency identities. */
export async function loadStackiRuntimeAssets(scope:StackiDraftScope,client:SupabaseClient,
 authorizeVersion:(scope:StackiDraftScope,siteVersionId:string)=>Promise<unknown>):Promise<StackiRuntimeAsset[]> {
 const plan=await planStackiRuntimeAssets(scope,client,authorizeVersion);
 return plan.read(plan.entries);
}

/** Stable identity of the complete verified dependency selection, never a draft head. */
export async function planStackiRuntimeAssets(scope:StackiDraftScope,client:SupabaseClient,
 authorizeVersion:(scope:StackiDraftScope,siteVersionId:string)=>Promise<unknown>) {
 await authorizeVersion(scope,scope.siteVersionId);
 const runtime=new SupabaseAstroCandidateRuntimeArtifactStore(client);
 const selected=await runtime.readSourceContext(scope.siteVersionId);
 if(!selected?.artifact || selected.siteVersion.id!==scope.siteVersionId || selected.artifact.siteVersionId!==scope.siteVersionId ||
    selected.siteVersion.artifactId!==selected.artifact.id || selected.artifact.siteId!==selected.siteVersion.siteId)invalid();
 const build=validateGeneratedOutputBuildEvidence(selected.artifact.manifest.generatedOutputBuildEvidence);
 const content=validateGeneratedOutputContentManifest(selected.artifact.manifest.generatedOutputContentManifest);
 if(!build || !content || content.sourceRef!==build.contentManifestSourceRef || build.sourceCapture.runtimeSiteId!==selected.siteVersion.siteId)invalid();
 const capture=build.sourceCapture;
 await authorizeVersion(scope,capture.siteVersionId);
 const source=await runtime.readSourceContext(capture.siteVersionId);
 if(!source?.artifact || source.siteVersion.id!==capture.siteVersionId || source.artifact.siteId!==selected.siteVersion.siteId || source.siteVersion.siteId!==selected.siteVersion.siteId ||
    source.siteVersion.artifactId!==capture.artifactId || source.artifact.id!==capture.artifactId ||
    source.artifact.siteVersionId!==capture.siteVersionId || source.artifact.bundleSha256!==capture.artifactBundleSha256)invalid();
 const workspace=selected.artifact.manifest.generatedOutputSourceWorkspace as Record<string,unknown>;
 const overlay=needsRetainedOverlay(workspace,content.requiredAssets);
 const prefix='/api/gnr8/runtime/preview-assets/'+encodeURIComponent(capture.runtimeSiteId)+'/'+encodeURIComponent(capture.siteVersionId)+'/';
 const evidence=new Map((workspace.assetEvidence as Array<{path:string;sha256:string;sizeBytes:number}>).map(asset=>[asset.path,asset]));
 const retained=overlay?content.requiredAssets.filter(asset=>asset.path.startsWith(prefix)):[];
 if(retained.length>2000)invalid();
 const paths=retained.map(asset=>asset.path.slice(prefix.length));
 let total=0;
 for(const required of retained){
  const asset=evidence.get(required.path);
  if(!asset || asset.sha256!==required.sha256 || !Number.isSafeInteger(asset.sizeBytes) ||
    asset.sizeBytes<0 || asset.sizeBytes>12*1024*1024)invalid();
  total+=asset.sizeBytes;if(total>128*1024*1024)invalid();
 }
 const entries=retained.map(required=>({path:required.path,name:retainedAssetName(required.path),sha256:required.sha256,bytes:evidence.get(required.path)!.sizeBytes}));
 const identity=createHash('sha256').update(JSON.stringify({format:'stacki-retained-preparation:v1',scope,
  source:build.sourceCapture,entries})).digest('hex');
 return {identity,entries,async read(selection:typeof entries,onFailure?:Parameters<typeof createVerifiedRetainedAssetReader>[3]):Promise<StackiRuntimeAsset[]> {
  const selected=new Set(selection.map(entry=>entry.path));
  if(selection.length!==selected.size || selection.some(entry=>!entries.some(expected=>JSON.stringify(entry)===JSON.stringify(expected))))invalid();
  // The capture table can time out when a single query fetches several bytea
  // values. Exact-path reads retain the same integrity checks with bounded load.
  const readAsset=createVerifiedRetainedAssetReader(client,false,undefined,onFailure);
  const result:StackiRuntimeAsset[]=[];
  for(let offset=0;offset<selection.length;offset+=8){
   const batch=await Promise.all(selection.slice(offset,offset+8).map(async required=>{
    const response=await readAsset({siteId:capture.runtimeSiteId,siteVersionId:capture.siteVersionId,
     path:required.path.slice(prefix.length),expectedSha256:required.sha256,allowedPaths:paths});
    if(!response.ok)throw new StackiDraftError(503,'STACKI_SOURCE_ASSET_UNAVAILABLE');
    const body=Buffer.from(await response.arrayBuffer());
    if(body.length>12*1024*1024)invalid();
    return {name:required.name,body};
   }));
   result.push(...batch);
  }
  if(result.reduce((sum,file)=>sum+file.body.length,0)>128*1024*1024)invalid();
  return result;
 }};
}

function needsRetainedOverlay(workspace:Record<string,unknown>|undefined,required:Array<{path:string}>):boolean {
 if(!workspace || !Array.isArray(workspace.assetEvidence) || !Array.isArray(workspace.files))invalid();
 const wanted=new Set(required.map(asset=>asset.path));
 const assets=(workspace.assetEvidence as Array<{path:string;sizeBytes:number}>).filter(asset=>wanted.has(asset.path));
 const sourceBytes=(workspace.files as Array<{bytes:number}>).reduce((total,file)=>total+file.bytes,0);
 return assets.length+workspace.files.length>256 || assets.some(asset=>asset.sizeBytes>STACKI_FILE_MAX_BYTES) ||
  assets.reduce((total,asset)=>total+asset.sizeBytes,sourceBytes)>STACKI_PROJECT_MAX_BYTES;
}
