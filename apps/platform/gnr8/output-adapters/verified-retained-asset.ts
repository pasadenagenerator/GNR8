import "server-only";
import { retainedStylesheetSourceUrl } from "@/gnr8/validation/runtime/retained-css-dependency-path";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAssetMediaType, rewriteRawTemplateCssForRuntime } from "@/src/public-site/raw-template-runtime";
import { readRawImportGitFile } from '@/gnr8/site/raw-import-git-reader';
import { configuredGitHubTarget } from '@/gnr8/stacki/stacki-github-config';
import type { RawImportedSiteArtifactMetadata } from '@/gnr8/runtime/types';

const headers = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
  "cross-origin-resource-policy": "same-origin",
  "content-security-policy": "sandbox; default-src 'none'",
};

type AssetInput = { siteId: string; siteVersionId: string; path: string; expectedSha256?: string; allowedPaths?: string[] };
export type RetainedAssetReadFailure = {
  reason: 'artifact_query'|'artifact_missing'|'path_missing'|'file_query'|'file_missing'|'bytea_invalid'|'integrity_mismatch'|'stylesheet_manifest'|'exception';
  status:number;
  pathSha256:string;
  providerCode?:string;
  providerStatus?:number;
};
type FailureObserver=(failure:RetainedAssetReadFailure)=>void;

/** Request-local immutable metadata cache. Never share across actors or requests. */
export function createVerifiedRetainedAssetReader(client: SupabaseClient, batchFiles = false, batchPaths?: string[],onFailure?:FailureObserver) {
  const artifacts = new Map<string, ReturnType<typeof readArtifact>>();
  const manifests = new Map<string, ReturnType<typeof readManifest>>();
  const fileBatches = new Map<string, Promise<{ data: any[] | null; error: unknown; status?:number }>>();
  let activeBatches = 0;
  const waitingBatches: Array<() => void> = [];
  async function readBatch(id: string, group: string[]) {
    if (activeBatches >= 4) await new Promise<void>(resolve => waitingBatches.push(resolve));
    else activeBatches++;
    try {
      return await client.from('gnr8_runtime_raw_template_artifact_files')
        .select('file_path,media_type,file_size_bytes,sha256,content_bytes')
        .eq('artifact_id', id).in('file_path', group).limit(group.length + 1);
    } finally {
      const next = waitingBatches.shift();
      if (next) next(); else activeBatches--;
    }
  }
  function readArtifact(input: AssetInput) {
    return Promise.resolve(client.from("gnr8_runtime_raw_template_artifacts")
      .select("id,site_id,site_version_id,file_map,metadata_json")
      .eq("site_version_id", input.siteVersionId).eq("site_id", input.siteId)
      .in("artifact_type", ["raw_imported_site", "raw_template_site"]).limit(2));
  }
  function readManifest(artifactId: string) {
    return Promise.resolve(client.from('gnr8_runtime_raw_template_artifact_files').select('content_bytes')
      .eq('artifact_id', artifactId).eq('file_path', 'url-fetch-manifest.json').single());
  }
  return (input: AssetInput) => readAsset(input, client, {
    artifact() {
      const key = JSON.stringify([input.siteId, input.siteVersionId]);
      if (!artifacts.has(key)) artifacts.set(key, readArtifact(input));
      return artifacts.get(key)!;
    },
    async files(id: string, fileMap: Record<string, { sizeBytes: number }>) {
      if (!batchFiles) return client.from("gnr8_runtime_raw_template_artifact_files")
        .select("media_type,file_size_bytes,sha256,content_bytes")
        .eq("artifact_id", id).eq("file_path", input.path).limit(2);
      const paths = batchPaths ?? input.allowedPaths ?? [input.path];
      let group: string[] = [], bytes = 0;
      for (const path of paths) {
        const size = fileMap[path]?.sizeBytes;
        if (!Number.isSafeInteger(size) || size < 0 || size > 12 * 1024 * 1024) throw new Error('Invalid retained file size');
        if (group.length && (group.length >= 8 || bytes + size > 4 * 1024 * 1024)) {
          if (group.includes(input.path)) break;
          group = []; bytes = 0;
        }
        group.push(path); bytes += size;
      }
      if (!group.includes(input.path)) throw new Error('Retained path outside selection');
      const key = JSON.stringify([id, group]);
      if (!fileBatches.has(key)) fileBatches.set(key, readBatch(id, group));
      const result = await fileBatches.get(key)!;
      if (result.error) return {data:null,error:result.error,status:result.status};
      if (!result.data || result.data.length !== group.length ||
          new Set(result.data.map(row => row.file_path)).size !== group.length ||
          result.data.some(row => !group.includes(row.file_path))) return { data: null, error: new Error('Retained batch incomplete') };
      return { data: result.data.filter(row => row.file_path === input.path), error: null };
    },
    manifest(id: string) {
      if (!manifests.has(id)) manifests.set(id, readManifest(id));
      return manifests.get(id)!;
    },
  },onFailure);
}

/** Caller must establish either authenticated ownership or an active public artifact binding. */
export async function readVerifiedRetainedAsset(
  input: AssetInput,
  client: SupabaseClient,
): Promise<Response> {
  return createVerifiedRetainedAssetReader(client)(input);
}

async function readAsset(input: AssetInput, client: SupabaseClient, reads: {
  artifact: () => PromiseLike<{ data: any; error: unknown }>;
  files: (id: string, fileMap: Record<string, { sizeBytes: number }>) => PromiseLike<{ data: any[] | null; error: unknown; status?:number }>;
  manifest: (id: string) => PromiseLike<{ data: any; error: unknown }>;
},onFailure?:FailureObserver): Promise<Response> {
  const fail = (status: number,reason:RetainedAssetReadFailure['reason'],error?:unknown,upstreamStatus?:number) => {
    const code=(error as {code?:unknown}|null)?.code;
    // Codes only, never PostgreSQL messages/details, URLs, names or file bytes.
    const providerCode=typeof code==='string'&&/^(?:[A-Z0-9]{5}|PGRST[0-9X][0-9]{2})$/.test(code)?code:undefined;
    const providerStatus=typeof upstreamStatus==='number'&&Number.isInteger(upstreamStatus)&&upstreamStatus>=400&&upstreamStatus<=599?upstreamStatus:undefined;
    try {onFailure?.({reason,status,pathSha256:createHash('sha256').update(input.path).digest('hex'),...(providerCode?{providerCode}:{}),...(providerStatus?{providerStatus}:{})});}catch{/* Diagnostics cannot change asset authorization or response. */}
    return new Response("Retained asset unavailable.", { status, headers });
  };
  try {
    const { data: artifacts, error: artifactError } = await reads.artifact();
    if (artifactError) return fail(500,'artifact_query',artifactError);
    if (artifacts?.length !== 1) return fail(404,'artifact_missing');
    const artifact = artifacts[0];
    const entry = artifact.file_map?.[input.path];
    if (!entry || entry.path !== input.path) return fail(404,'path_missing');
    const { data: files, error: fileError, status: fileStatus } = await reads.files(artifact.id, artifact.file_map);
    if (fileError) return fail(500,'file_query',fileError,fileStatus);
    if (files?.length !== 1) return fail(404,'file_missing');
    const file = files[0];
    const gitArchive = (artifact.metadata_json as RawImportedSiteArtifactMetadata | undefined)?.gitArchive;
    // Legacy rows retain PostgreSQL bytea. New rows read the immutable Git
    // commit and verify each file against the artifact metadata.
    let bytes: Buffer;
    if (gitArchive) bytes = await readRawImportGitFile(gitArchive, input.siteVersionId,
      {path:input.path,sha256:file.sha256,sizeBytes:file.file_size_bytes},
      await configuredGitHubTarget({...gitArchive.scope,siteVersionId:input.siteVersionId},gitArchive.repository));
    else {
      if (typeof file.content_bytes !== "string" || !/^\\x(?:[a-f0-9]{2})*$/i.test(file.content_bytes)) return fail(500,'bytea_invalid');
      bytes = Buffer.from(file.content_bytes.slice(2), "hex");
    }
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== file.file_size_bytes || bytes.length !== entry.sizeBytes ||
      digest !== file.sha256 || digest !== entry.sha256 || file.media_type !== entry.mediaType ||
      (input.expectedSha256 !== undefined && digest !== input.expectedSha256)) return fail(500,'integrity_mismatch');
    const stylesheet = file.media_type?.split(";")[0].trim().toLowerCase() === "text/css" || input.path.endsWith(".css");
    let stylesheetSourceUrl: string | null = null;
    const sourceMap = artifact.file_map['url-fetch-manifest.json'];
    if (stylesheet && sourceMap) {
      let manifestBytes: Buffer;
      if (gitArchive) manifestBytes = await readRawImportGitFile(gitArchive, input.siteVersionId,
        {path:'url-fetch-manifest.json',sha256:sourceMap.sha256,sizeBytes:sourceMap.sizeBytes},
        await configuredGitHubTarget({...gitArchive.scope,siteVersionId:input.siteVersionId},gitArchive.repository));
      else {
        const result = await reads.manifest(artifact.id);
        if (result.error || typeof result.data?.content_bytes !== 'string' || !/^\\x(?:[a-f0-9]{2})*$/i.test(result.data.content_bytes)) return fail(500,'stylesheet_manifest',result.error);
        manifestBytes = Buffer.from(result.data.content_bytes.slice(2),'hex');
      }
      stylesheetSourceUrl = retainedStylesheetSourceUrl({bytes:manifestBytes,expectedSha256:sourceMap.sha256,expectedSizeBytes:sourceMap.sizeBytes,stylesheetPath:input.path});
    }
    const body = stylesheet ? rewriteRawTemplateCssForRuntime({
      css: bytes.toString("utf8"), siteId: input.siteId, siteVersionId: input.siteVersionId, assetFilePath: input.path, stylesheetSourceUrl, versionCssUrls: true,
      fileMapPaths: new Set(input.allowedPaths ?? Object.keys(artifact.file_map)),
    }) : new Uint8Array(bytes);
    return new Response(body, { status: 200, headers: {
      ...headers,
      "content-type": resolveAssetMediaType({ filePath: input.path, mediaType: file.media_type }),
      "x-gnr8-preview-asset-path": input.path,
    } });
  } catch {
    return fail(500,'exception');
  }
}
