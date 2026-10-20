import 'server-only';
import { createHash } from 'node:crypto';
import { getSupabaseServiceRoleClient } from '@/src/supabase/service-role-server';
import { SupabaseAstroCandidateRuntimeArtifactStore } from '@/gnr8/output-adapters/astro-candidate-runtime-artifact-store';
import { resolveAstroCaptureSource, astroSourceTarget } from '@/gnr8/output-adapters/astro-capture-source';
import { loadSourceBackedAstroHtmlByPath } from '@/gnr8/output-adapters/source-backed-astro-input';
import { findContactSuggestions, type ContactSuggestionModel } from '@/gnr8/output-adapters/source-contact-suggestions';
import { routeMapFromProvenance } from '@/gnr8/runtime/raw-template-route-map-resolver';
import type { RawImportedSiteArtifact } from '@/gnr8/runtime/types';

/** Uses only retained storage. Scope is checked before loading capture bytes. */
export async function readContactSuggestions(scope: { siteId: string; agencyId: string; clientId: string }): Promise<ContactSuggestionModel> {
  const client = getSupabaseServiceRoleClient();
  if (!client) throw new Error('503|CONTACT_SOURCE_UNAVAILABLE');
  const site = await client.from('sites').select('id').eq('id', scope.siteId).eq('agency_id', scope.agencyId).eq('org_id', scope.clientId).maybeSingle();
  if (site.error || !site.data) throw new Error('404|CONTACT_SITE_NOT_FOUND');
  const latest = await client.from('gnr8_runtime_site_versions').select('id').eq('ownership_site_id', scope.siteId).not('artifact_id', 'is', null)
    .order('version_no', { ascending: false }).order('updated_at', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1).maybeSingle();
  if (latest.error || !latest.data) throw new Error('409|CONTACT_SOURCE_UNAVAILABLE');
  const store = new SupabaseAstroCandidateRuntimeArtifactStore(client);
  const context = await store.readContext(latest.data.id);
  if (!context?.artifact) throw new Error('409|CONTACT_SOURCE_UNAVAILABLE');
  const source = await resolveAstroCaptureSource(context.siteVersion, context.artifact,
    (context.artifact.manifest.generatedOutputSourceWorkspace as { adapterId?: string })?.adapterId ?? (context.artifact.manifest.astroCandidateManifest as { adapterId?: string })?.adapterId ?? null, {
    getSiteVersion: async id => (await store.readContext(id))?.siteVersion ?? null,
    getArtifactById: async id => {
      const row = await client.from('gnr8_runtime_artifacts').select('site_version_id').eq('id', id).maybeSingle();
      if (row.error || !row.data) return null;
      const artifact = (await store.readContext(row.data.site_version_id))?.artifact;
      return artifact?.id === id ? artifact : null;
    },
    getRawImportedSiteArtifact: async id => {
      const result = await client.from('gnr8_runtime_raw_template_artifacts').select('*').eq('site_version_id', id).eq('artifact_type', 'raw_imported_site').maybeSingle();
      if (result.error) throw new Error('503|CONTACT_SOURCE_UNAVAILABLE');
      const row = result.data;
      return row ? { id: row.id, artifactType: row.artifact_type, siteId: row.site_id, siteVersionId: row.site_version_id,
        entryHtmlPath: row.entry_html_path, assetBasePath: row.asset_base_path, fileMap: row.file_map, metadata: row.metadata_json, createdAt: row.created_at } as RawImportedSiteArtifact : null;
    },
  });
  const htmlByPath = await loadSourceBackedAstroHtmlByPath({ siteVersion: source.sourceVersion, rawArtifact: source.rawArtifact, getRawAsset: async input => {
    const result = await client.from('gnr8_runtime_raw_template_artifact_files').select('media_type,file_size_bytes,sha256,content_bytes').eq('artifact_id', input.artifactId).eq('file_path', input.filePath).maybeSingle();
    if (result.error || !result.data) return null;
    const row = result.data;
    if (typeof row.content_bytes !== 'string' || !row.content_bytes.startsWith('\\x')) throw new Error('409|CONTACT_SOURCE_INVALID');
    const bytes = Buffer.from(row.content_bytes.slice(2), 'hex');
    if (bytes.length !== row.file_size_bytes || createHash('sha256').update(bytes).digest('hex') !== row.sha256) throw new Error('409|CONTACT_SOURCE_INVALID');
    return { bytes, mediaType: row.media_type, sizeBytes: row.file_size_bytes, sha256: row.sha256 };
  } });
  const routes = routeMapFromProvenance(source.sourceVersion.importProvenanceSummary);
  const pages = Object.entries(htmlByPath).flatMap(([path, html]) => {
    const route = routes.find(r => r.routePath === path);
    const sourceUrl = route?.finalUrl || route?.sourceUrl || (path === '/' ? source.rawArtifact.metadata.finalUrl || source.rawArtifact.metadata.sourceUrl : null);
    return sourceUrl ? [{ sourceUrl, html }] : [];
  });
  return { sourceTarget: astroSourceTarget(source), suggestions: findContactSuggestions(pages) };
}
