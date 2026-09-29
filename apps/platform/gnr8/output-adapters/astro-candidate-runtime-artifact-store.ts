import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CanonicalPageVersionSnapshot,
  CanonicalSiteVersionSnapshot,
  RuntimeArtifact,
} from "@/gnr8/runtime/types";

export type AstroCandidateRuntimeArtifactContext = {
  siteVersion: CanonicalSiteVersionSnapshot;
  artifact: RuntimeArtifact | null;
  activePointerReferencesArtifact: boolean;
  previewBindingCount: number;
};

export type AstroCandidateRuntimeArtifactWrite = Pick<
  RuntimeArtifact,
  | "id"
  | "siteId"
  | "siteVersionId"
  | "rendererCompatibilityVersion"
  | "bundleSha256"
  | "htmlByPath"
  | "compiledTokenStyles"
  | "assetFingerprintMap"
  | "manifest"
  | "publishStage"
  | "shadowRestricted"
  | "artifactGovernance"
>;

export interface AstroCandidateRuntimeArtifactStore {
  readContext(siteVersionId: string): Promise<AstroCandidateRuntimeArtifactContext | null>;
  compareAndSetArtifact(input: {
    expectedBundleSha256: string;
    artifact: AstroCandidateRuntimeArtifactWrite;
  }): Promise<"updated" | "not_updated" | "unavailable">;
}

type SiteVersionRow = {
  id: string;
  site_id: string;
  version_no: number;
  state: CanonicalSiteVersionSnapshot["state"];
  source: CanonicalSiteVersionSnapshot["source"];
  actor: string;
  renderer_compatibility_version: string;
  import_provenance_summary: CanonicalSiteVersionSnapshot["importProvenanceSummary"] | null;
  artifact_id: string | null;
  created_at: string;
};

type PageVersionRow = {
  id: string;
  site_version_id: string;
  page_id: string;
  path: string;
  title: string | null;
  structure_model: CanonicalPageVersionSnapshot["structureModel"];
  content_model: CanonicalPageVersionSnapshot["contentModel"];
  style_tokens: CanonicalPageVersionSnapshot["styleTokens"];
  asset_graph: CanonicalPageVersionSnapshot["assetGraph"];
  semantic_signals: CanonicalPageVersionSnapshot["semanticSignals"];
  migration_governance: CanonicalPageVersionSnapshot["migrationGovernance"] | null;
  source: CanonicalPageVersionSnapshot["source"];
  actor: string;
  created_at: string;
};

type ArtifactRow = {
  id: string;
  site_id: string;
  site_version_id: string;
  renderer_compatibility_version: string;
  html_by_path: Record<string, string>;
  compiled_token_styles: string;
  asset_fingerprint_map: Record<string, string>;
  manifest: Record<string, unknown>;
  publish_stage: RuntimeArtifact["publishStage"];
  shadow_restricted: boolean;
  artifact_governance: RuntimeArtifact["artifactGovernance"];
  bundle_sha256: string;
  created_at: string;
};

const SITE_VERSION_COLUMNS = [
  "id",
  "site_id",
  "version_no",
  "state",
  "source",
  "actor",
  "renderer_compatibility_version",
  "import_provenance_summary",
  "artifact_id",
  "created_at",
].join(",");

const PAGE_VERSION_COLUMNS = [
  "id",
  "site_version_id",
  "page_id",
  "path",
  "title",
  "structure_model",
  "content_model",
  "style_tokens",
  "asset_graph",
  "semantic_signals",
  "migration_governance",
  "source",
  "actor",
  "created_at",
].join(",");

const ARTIFACT_COLUMNS = [
  "id",
  "site_id",
  "site_version_id",
  "renderer_compatibility_version",
  "html_by_path",
  "compiled_token_styles",
  "asset_fingerprint_map",
  "manifest",
  "publish_stage",
  "shadow_restricted",
  "artifact_governance",
  "bundle_sha256",
  "created_at",
].join(",");

export class SupabaseAstroCandidateRuntimeArtifactStore implements AstroCandidateRuntimeArtifactStore {
  constructor(private readonly client: SupabaseClient) {}

  async readContext(siteVersionId: string): Promise<AstroCandidateRuntimeArtifactContext | null> {
    const [versionResult, pagesResult] = await Promise.all([
      this.client
        .from("gnr8_runtime_site_versions")
        .select(SITE_VERSION_COLUMNS)
        .eq("id", siteVersionId)
        .limit(2),
      this.client
        .from("gnr8_runtime_page_versions")
        .select(PAGE_VERSION_COLUMNS)
        .eq("site_version_id", siteVersionId)
        .order("path", { ascending: true }),
    ]);
    if (versionResult.error || pagesResult.error) throw new Error("runtime_artifact_context_unavailable");
    if (!Array.isArray(versionResult.data) || versionResult.data.length === 0) return null;
    if (versionResult.data.length !== 1 || !Array.isArray(pagesResult.data)) {
      throw new Error("runtime_artifact_context_invalid");
    }

    const version = versionResult.data[0] as unknown as SiteVersionRow;
    const pages = pagesResult.data as unknown as PageVersionRow[];
    const siteVersion: CanonicalSiteVersionSnapshot = {
      id: version.id,
      siteId: version.site_id,
      versionNo: version.version_no,
      state: version.state,
      source: version.source,
      actor: version.actor,
      createdAt: version.created_at,
      rendererCompatibilityVersion: version.renderer_compatibility_version,
      artifactId: version.artifact_id,
      importProvenanceSummary: version.import_provenance_summary ?? null,
      pages: pages.map(mapPage),
    };
    if (!version.artifact_id) {
      return {
        siteVersion,
        artifact: null,
        activePointerReferencesArtifact: false,
        previewBindingCount: 0,
      };
    }

    const [artifactResult, pointerResult, previewBindingsResult] = await Promise.all([
      this.client
        .from("gnr8_runtime_artifacts")
        .select(ARTIFACT_COLUMNS)
        .eq("id", version.artifact_id)
        .eq("site_version_id", siteVersionId)
        .limit(2),
      this.client
        .from("gnr8_runtime_active_pointers")
        .select("active_artifact_id")
        .eq("active_artifact_id", version.artifact_id)
        .limit(1),
      this.client
        .from("gnr8_runtime_preview_host_bindings")
        .select("id", { count: "exact", head: true })
        .eq("candidate_artifact_id", version.artifact_id)
        .eq("status", "ACTIVE"),
    ]);
    if (artifactResult.error || pointerResult.error || previewBindingsResult.error) {
      throw new Error("runtime_artifact_context_unavailable");
    }
    if (!Array.isArray(artifactResult.data) || artifactResult.data.length !== 1) {
      throw new Error("runtime_artifact_binding_incomplete");
    }
    return {
      siteVersion,
      artifact: mapArtifact(artifactResult.data[0] as unknown as ArtifactRow),
      activePointerReferencesArtifact: Array.isArray(pointerResult.data) && pointerResult.data.length > 0,
      previewBindingCount: previewBindingsResult.count ?? 0,
    };
  }

  async compareAndSetArtifact(input: {
    expectedBundleSha256: string;
    artifact: AstroCandidateRuntimeArtifactWrite;
  }): Promise<"updated" | "not_updated" | "unavailable"> {
    try {
      const result = await this.client
        .from("gnr8_runtime_artifacts")
        .update({
          renderer_compatibility_version: input.artifact.rendererCompatibilityVersion,
          bundle_sha256: input.artifact.bundleSha256,
          html_by_path: input.artifact.htmlByPath,
          compiled_token_styles: input.artifact.compiledTokenStyles,
          asset_fingerprint_map: input.artifact.assetFingerprintMap,
          manifest: input.artifact.manifest,
          publish_stage: input.artifact.publishStage,
          shadow_restricted: input.artifact.shadowRestricted,
          artifact_governance: input.artifact.artifactGovernance,
        })
        .eq("id", input.artifact.id)
        .eq("site_id", input.artifact.siteId)
        .eq("site_version_id", input.artifact.siteVersionId)
        .eq("bundle_sha256", input.expectedBundleSha256)
        .select("id");
      if (result.error || !Array.isArray(result.data)) return "unavailable";
      return result.data.length === 1 ? "updated" : "not_updated";
    } catch {
      return "unavailable";
    }
  }
}

function mapPage(row: PageVersionRow): CanonicalPageVersionSnapshot {
  return {
    id: row.id,
    siteVersionId: row.site_version_id,
    pageId: row.page_id,
    path: row.path,
    title: row.title,
    structureModel: row.structure_model,
    contentModel: row.content_model,
    styleTokens: row.style_tokens,
    assetGraph: row.asset_graph,
    semanticSignals: row.semantic_signals,
    migrationGovernance: row.migration_governance ?? null,
    source: row.source,
    actor: row.actor,
    createdAt: row.created_at,
  };
}

function mapArtifact(row: ArtifactRow): RuntimeArtifact {
  return {
    id: row.id,
    siteId: row.site_id,
    siteVersionId: row.site_version_id,
    rendererCompatibilityVersion: row.renderer_compatibility_version,
    htmlByPath: row.html_by_path,
    compiledTokenStyles: row.compiled_token_styles,
    assetFingerprintMap: row.asset_fingerprint_map,
    manifest: row.manifest,
    publishStage: row.publish_stage,
    shadowRestricted: row.shadow_restricted,
    artifactGovernance: row.artifact_governance,
    bundleSha256: row.bundle_sha256,
    createdAt: row.created_at,
  };
}
