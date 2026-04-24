import "server-only";

import type { PoolClient } from "pg";

import { getSuperadminPool } from "@/src/superadmin/db";

import { normalizePagePath } from "@/gnr8/runtime/deterministic";
import { evaluateRuntimeArtifactServingEligibility } from "@/gnr8/runtime/publish-enforcement";
import type {
  CanonicalPageVersionInput,
  CanonicalPageVersionSnapshot,
  RuntimeImportProvenanceSummary,
  CanonicalSiteMigrationInput,
  CanonicalSiteVersionSnapshot,
  RawTemplateSiteArtifact,
  RawTemplateSiteFileMeta,
  RuntimeArtifact,
  SiteVersionState,
  VersionScopedFormSubmission,
} from "@/gnr8/runtime/types";

let tablesReady: Promise<void> | null = null;

export async function ensureRuntimeTables(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      const client = await getSuperadminPool().connect();
      try {
        await client.query(`
          create table if not exists public.gnr8_runtime_sites (
            id text primary key,
            source_url text not null,
            source_host text,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
          )
        `);

        await client.query(`
          create table if not exists public.gnr8_runtime_host_bindings (
            id uuid primary key default gen_random_uuid(),
            site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
            host text not null,
            status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
            binding_kind text not null default 'shadow',
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now(),
            unique (site_id, host)
          )
        `);

        await client.query(`
          create unique index if not exists gnr8_runtime_host_bindings_active_host_uq
          on public.gnr8_runtime_host_bindings (lower(host))
          where status = 'ACTIVE'
        `);

        await client.query(`
          create table if not exists public.gnr8_runtime_pages (
            id text primary key,
            site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
            path text not null,
            title text,
            created_at timestamptz not null default now(),
            unique (site_id, path)
          )
        `);

        await client.query(`
          create table if not exists public.gnr8_runtime_site_versions (
            id uuid primary key default gen_random_uuid(),
            site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
            version_no integer not null,
            state text not null,
            source text not null,
            actor text not null,
            renderer_compatibility_version text not null,
            import_provenance_summary jsonb,
            artifact_id uuid,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now(),
            unique (site_id, version_no)
          )
        `);

        await client.query(`
          create table if not exists public.gnr8_runtime_page_versions (
            id uuid primary key default gen_random_uuid(),
            site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
            page_id text not null references public.gnr8_runtime_pages(id) on delete cascade,
            path text not null,
            title text,
            structure_model jsonb not null,
            content_model jsonb not null,
            style_tokens jsonb not null,
            asset_graph jsonb not null,
            semantic_signals jsonb not null,
            migration_governance jsonb,
            source text not null,
            actor text not null,
            created_at timestamptz not null default now(),
            unique (site_version_id, page_id)
          )
        `);

        await client.query(`
          create table if not exists public.gnr8_runtime_artifacts (
            id uuid primary key default gen_random_uuid(),
            site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
            site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
            renderer_compatibility_version text not null,
            bundle_sha256 text not null,
            html_by_path jsonb not null,
            compiled_token_styles text not null,
            asset_fingerprint_map jsonb not null,
            manifest jsonb not null,
            publish_stage text not null default 'production',
            shadow_restricted boolean not null default false,
            artifact_governance jsonb not null default '{}'::jsonb,
            created_at timestamptz not null default now(),
            unique (site_version_id)
          )
        `);

        await client.query(`
          create table if not exists public.gnr8_runtime_raw_template_artifacts (
            id uuid primary key default gen_random_uuid(),
            artifact_type text not null default 'raw_template_site',
            site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
            site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
            entry_html_path text not null,
            asset_base_path text not null,
            file_map jsonb not null default '{}'::jsonb,
            created_at timestamptz not null default now(),
            unique (site_version_id)
          )
        `);

        await client.query(`
          create table if not exists public.gnr8_runtime_raw_template_artifact_files (
            artifact_id uuid not null references public.gnr8_runtime_raw_template_artifacts(id) on delete cascade,
            file_path text not null,
            media_type text not null,
            file_size_bytes integer not null,
            sha256 text not null,
            content_bytes bytea not null,
            created_at timestamptz not null default now(),
            primary key (artifact_id, file_path)
          )
        `);

        await client.query(`
          alter table public.gnr8_runtime_site_versions
          add column if not exists import_provenance_summary jsonb
        `);

        await client.query(`
          alter table public.gnr8_runtime_page_versions
          add column if not exists migration_governance jsonb
        `);

        await client.query(`
          alter table public.gnr8_runtime_artifacts
          add column if not exists publish_stage text not null default 'production'
        `);

        await client.query(`
          alter table public.gnr8_runtime_artifacts
          add column if not exists shadow_restricted boolean not null default false
        `);

        await client.query(`
          alter table public.gnr8_runtime_artifacts
          add column if not exists artifact_governance jsonb not null default '{}'::jsonb
        `);

        await client.query(`
          create table if not exists public.gnr8_runtime_active_pointers (
            site_id text primary key references public.gnr8_runtime_sites(id) on delete cascade,
            active_site_version_id uuid not null references public.gnr8_runtime_site_versions(id),
            active_artifact_id uuid not null references public.gnr8_runtime_artifacts(id),
            updated_at timestamptz not null default now()
          )
        `);

        await client.query(`
          create table if not exists public.gnr8_runtime_version_audit (
            id uuid primary key default gen_random_uuid(),
            site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
            from_state text,
            to_state text not null,
            actor text not null,
            source text not null,
            timestamp timestamptz not null default now(),
            details jsonb not null default '{}'::jsonb
          )
        `);

        await client.query(`
          create table if not exists public.gnr8_runtime_form_submissions (
            id uuid primary key default gen_random_uuid(),
            site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
            site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
            page_path text not null,
            form_id text not null,
            payload jsonb not null,
            actor text not null,
            created_at timestamptz not null default now()
          )
        `);

        await client.query(`
          with ranked as (
            select
              s.id::text as site_id,
              lower(trim(s.source_host))::text as host,
              row_number() over (
                partition by lower(trim(s.source_host))
                order by s.created_at desc, s.id desc
              ) as host_rank
            from public.gnr8_runtime_sites s
            where s.source_host is not null
              and length(trim(s.source_host)) > 0
          )
          insert into public.gnr8_runtime_host_bindings (site_id, host, status, binding_kind)
          select
            ranked.site_id,
            ranked.host,
            case when ranked.host_rank = 1 then 'ACTIVE' else 'INACTIVE' end as status,
            'legacy_source_host_backfill'::text as binding_kind
          from ranked
          on conflict (site_id, host) do nothing
        `);
      } finally {
        client.release();
      }
    })();
  }

  await tablesReady;
}

type SiteVersionRow = {
  id: string;
  site_id: string;
  version_no: number;
  state: SiteVersionState;
  source: string;
  actor: string;
  renderer_compatibility_version: string;
  import_provenance_summary: unknown | null;
  artifact_id: string | null;
  created_at: string;
};

type PageVersionRow = {
  id: string;
  site_version_id: string;
  page_id: string;
  path: string;
  title: string | null;
  structure_model: unknown;
  content_model: unknown;
  style_tokens: unknown;
  asset_graph: unknown;
  semantic_signals: unknown;
  migration_governance: unknown | null;
  source: string;
  actor: string;
  created_at: string;
};

type RawTemplateArtifactRow = {
  id: string;
  artifact_type: string;
  site_id: string;
  site_version_id: string;
  entry_html_path: string;
  asset_base_path: string;
  file_map: unknown;
  created_at: string;
};

type RawTemplateArtifactFileRow = {
  media_type: string;
  file_size_bytes: number;
  sha256: string;
  content_bytes: Buffer | Uint8Array;
};

export type RuntimeHostBindingStatus = "ACTIVE" | "INACTIVE";
export type RuntimeHostBindingKind = "shadow" | "canary" | "canonical" | "legacy_source_host_backfill" | "manual";

export type RuntimeHostBinding = {
  id: string;
  siteId: string;
  host: string;
  status: RuntimeHostBindingStatus;
  bindingKind: string;
  createdAt: string;
  updatedAt: string;
};

async function withTx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function getNextSiteVersionNo(client: PoolClient, siteId: string): Promise<number> {
  const row = await client.query<{ next: number }>(
    `select coalesce(max(version_no), 0) + 1 as next from public.gnr8_runtime_site_versions where site_id = $1::text`,
    [siteId],
  );
  return row.rows[0]?.next ?? 1;
}

function normalizeRuntimeHost(host: string): string {
  return String(host ?? "").trim().toLowerCase();
}

function normalizeRawTemplateFilePath(filePath: string): string {
  const normalized = String(filePath ?? "").trim().replaceAll("\\", "/").replace(/^\/+/, "");
  if (!normalized || normalized === "." || normalized === "..") return "";
  const segments = normalized
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== ".");
  if (segments.some((segment) => segment === "..")) return "";
  return segments.join("/");
}

function parseRawTemplateFileMap(value: unknown): Record<string, RawTemplateSiteFileMeta> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, RawTemplateSiteFileMeta> = {};
  for (const [rawPath, rawMeta] of Object.entries(value as Record<string, unknown>)) {
    const path = normalizeRawTemplateFilePath(rawPath);
    if (!path || !rawMeta || typeof rawMeta !== "object" || Array.isArray(rawMeta)) continue;
    const rec = rawMeta as Record<string, unknown>;
    const mediaType = String(rec.mediaType ?? "").trim() || "application/octet-stream";
    const sizeBytesRaw = Number(rec.sizeBytes ?? rec.fileSizeBytes ?? 0);
    const sizeBytes = Number.isFinite(sizeBytesRaw) && sizeBytesRaw >= 0 ? Math.floor(sizeBytesRaw) : 0;
    const sha256 = String(rec.sha256 ?? "").trim();
    out[path] = {
      path,
      mediaType,
      sizeBytes,
      sha256,
    };
  }
  return out;
}

function resolveServingStageFromBindingKind(bindingKind: string | null): "shadow" | "canary" | "production" {
  const normalized = String(bindingKind ?? "").trim().toLowerCase();
  if (normalized === "shadow") return "shadow";
  if (normalized === "canary") return "canary";
  return "production";
}

async function bindHostToSiteInTx(
  client: PoolClient,
  input: {
    siteId: string;
    host: string;
    status?: RuntimeHostBindingStatus;
    bindingKind?: RuntimeHostBindingKind | string;
  },
): Promise<void> {
  const normalizedHost = normalizeRuntimeHost(input.host);
  if (!normalizedHost) return;

  const status = input.status ?? "ACTIVE";
  const bindingKind = String(input.bindingKind ?? "shadow").trim() || "shadow";

  if (status === "ACTIVE") {
    await client.query(
      `
      update public.gnr8_runtime_host_bindings
      set status = 'INACTIVE', updated_at = now()
      where lower(host) = $1::text and status = 'ACTIVE' and site_id <> $2::text
      `,
      [normalizedHost, input.siteId],
    );
  }

  await client.query(
    `
    insert into public.gnr8_runtime_host_bindings (site_id, host, status, binding_kind)
    values ($1::text, $2::text, $3::text, $4::text)
    on conflict (site_id, host)
    do update set
      status = excluded.status,
      binding_kind = excluded.binding_kind,
      updated_at = now()
    `,
    [input.siteId, normalizedHost, status, bindingKind],
  );
}

function mapPageVersionRow(row: PageVersionRow): CanonicalPageVersionSnapshot {
  return {
    id: row.id,
    siteVersionId: row.site_version_id,
    pageId: row.page_id,
    path: row.path,
    title: row.title,
    structureModel: row.structure_model as CanonicalPageVersionSnapshot["structureModel"],
    contentModel: row.content_model as CanonicalPageVersionSnapshot["contentModel"],
    styleTokens: row.style_tokens as CanonicalPageVersionSnapshot["styleTokens"],
    assetGraph: row.asset_graph as CanonicalPageVersionSnapshot["assetGraph"],
    semanticSignals: row.semantic_signals as CanonicalPageVersionSnapshot["semanticSignals"],
    migrationGovernance: (row.migration_governance ?? null) as CanonicalPageVersionSnapshot["migrationGovernance"],
    source: row.source as CanonicalPageVersionSnapshot["source"],
    actor: row.actor,
    createdAt: row.created_at,
  };
}

export async function createSiteVersionFromMigration(
  input: CanonicalSiteMigrationInput & { rendererCompatibilityVersion: string },
): Promise<{ siteId: string; siteVersionId: string; versionNo: number }> {
  return withTx(async (client) => {
    const sourceHost = (() => {
      try {
        return new URL(input.sourceUrl).host;
      } catch {
        return null;
      }
    })();

    await client.query(
      `
      insert into public.gnr8_runtime_sites (id, source_url, source_host)
      values ($1::text, $2::text, $3::text)
      on conflict (id)
      do update set source_url = excluded.source_url, source_host = excluded.source_host, updated_at = now()
      `,
      [input.siteId, input.sourceUrl, sourceHost],
    );

    if (sourceHost) {
      await bindHostToSiteInTx(client, {
        siteId: input.siteId,
        host: sourceHost,
        status: "ACTIVE",
        bindingKind: "shadow",
      });
    }

    const versionNo = await getNextSiteVersionNo(client, input.siteId);
    const siteVersionInsert = await client.query<{ id: string }>(
      `
      insert into public.gnr8_runtime_site_versions (
        site_id,
        version_no,
        state,
        source,
        actor,
        renderer_compatibility_version,
        import_provenance_summary
      )
      values ($1::text, $2::int, 'DRAFT', 'migration', $3::text, $4::text, $5::jsonb)
      returning id::text as id
      `,
      [
        input.siteId,
        versionNo,
        input.actor,
        input.rendererCompatibilityVersion,
        input.importProvenanceSummary ? JSON.stringify(input.importProvenanceSummary) : null,
      ],
    );

    const siteVersionId = siteVersionInsert.rows[0]!.id;

    for (const page of input.pages) {
      const path = normalizePagePath(page.path);
      await client.query(
        `
        insert into public.gnr8_runtime_pages (id, site_id, path, title)
        values ($1::text, $2::text, $3::text, $4::text)
        on conflict (id)
        do update set title = excluded.title
        `,
        [page.pageId, input.siteId, path, page.title],
      );

      await client.query(
        `
        insert into public.gnr8_runtime_page_versions (
          site_version_id,
          page_id,
          path,
          title,
          structure_model,
          content_model,
          style_tokens,
          asset_graph,
          semantic_signals,
          migration_governance,
          source,
          actor
        )
        values ($1::uuid, $2::text, $3::text, $4::text, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::text, $12::text)
        `,
        [
          siteVersionId,
          page.pageId,
          path,
          page.title,
          JSON.stringify(page.structureModel),
          JSON.stringify(page.contentModel),
          JSON.stringify(page.styleTokens),
          JSON.stringify(page.assetGraph),
          JSON.stringify(page.semanticSignals),
          page.migrationGovernance ? JSON.stringify(page.migrationGovernance) : null,
          page.source,
          page.actor,
        ],
      );
    }

    await client.query(
      `
      insert into public.gnr8_runtime_version_audit (site_version_id, from_state, to_state, actor, source, details)
      values ($1::uuid, null, 'DRAFT', $2::text, 'migration', $3::jsonb)
      `,
      [siteVersionId, input.actor, JSON.stringify({ createdFromMigration: true })],
    );

    return { siteId: input.siteId, siteVersionId, versionNo };
  });
}

export async function bindHostToSite(input: {
  siteId: string;
  host: string;
  status?: RuntimeHostBindingStatus;
  bindingKind?: RuntimeHostBindingKind | string;
}): Promise<void> {
  await withTx(async (client) => {
    const siteRes = await client.query<{ id: string }>(
      `select id::text as id from public.gnr8_runtime_sites where id = $1::text limit 1`,
      [input.siteId],
    );
    if (!siteRes.rows[0]) throw new Error("Runtime site not found");
    await bindHostToSiteInTx(client, input);
  });
}

export async function listHostBindingsForSite(siteId: string): Promise<RuntimeHostBinding[]> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const res = await client.query<{
      id: string;
      site_id: string;
      host: string;
      status: RuntimeHostBindingStatus;
      binding_kind: string;
      created_at: string;
      updated_at: string;
    }>(
      `
      select
        id::text as id,
        site_id::text as site_id,
        host::text as host,
        status::text as status,
        binding_kind::text as binding_kind,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_runtime_host_bindings
      where site_id = $1::text
      order by case when status = 'ACTIVE' then 0 else 1 end asc, host asc
      `,
      [siteId],
    );

    return res.rows.map((row) => ({
      id: row.id,
      siteId: row.site_id,
      host: row.host,
      status: row.status,
      bindingKind: row.binding_kind,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } finally {
    client.release();
  }
}

export async function getSiteVersion(siteVersionId: string): Promise<CanonicalSiteVersionSnapshot | null> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const res = await client.query<SiteVersionRow>(
      `
      select
        id::text as id,
        site_id::text as site_id,
        version_no,
        state::text as state,
        source::text as source,
        actor::text as actor,
        renderer_compatibility_version::text,
        import_provenance_summary,
        artifact_id::text,
        created_at::text
      from public.gnr8_runtime_site_versions
      where id = $1::uuid
      limit 1
      `,
      [siteVersionId],
    );
    const row = res.rows[0];
    if (!row) return null;

    const pages = await client.query<PageVersionRow>(
      `
      select
        id::text as id,
        site_version_id::text,
        page_id::text,
        path::text,
        title::text,
        structure_model,
        content_model,
        style_tokens,
        asset_graph,
        semantic_signals,
        migration_governance,
        source::text,
        actor::text,
        created_at::text
      from public.gnr8_runtime_page_versions
      where site_version_id = $1::uuid
      order by path asc
      `,
      [siteVersionId],
    );

    return {
      id: row.id,
      siteId: row.site_id,
      versionNo: row.version_no,
      state: row.state,
      source: row.source as CanonicalSiteVersionSnapshot["source"],
      actor: row.actor,
      createdAt: row.created_at,
      rendererCompatibilityVersion: row.renderer_compatibility_version,
      importProvenanceSummary: (row.import_provenance_summary ?? null) as RuntimeImportProvenanceSummary | null,
      artifactId: row.artifact_id,
      pages: pages.rows.map(mapPageVersionRow),
    };
  } finally {
    client.release();
  }
}

export async function setSiteVersionImportProvenanceSummary(input: {
  siteVersionId: string;
  importProvenanceSummary: RuntimeImportProvenanceSummary;
}): Promise<{ affectedRows: number }> {
  return withTx(async (client) => {
    const updated = await client.query<{ id: string }>(
      `
      update public.gnr8_runtime_site_versions
      set import_provenance_summary = $2::jsonb, updated_at = now()
      where id = $1::uuid
      returning id::text as id
      `,
      [input.siteVersionId, JSON.stringify(input.importProvenanceSummary)],
    );
    if (!updated.rows[0]) {
      throw new Error(`Runtime site version not found for provenance write: ${input.siteVersionId}`);
    }
    return { affectedRows: updated.rowCount ?? 0 };
  });
}

export async function setSiteVersionState(input: {
  siteVersionId: string;
  expectedCurrentState: SiteVersionState;
  nextState: SiteVersionState;
  actor: string;
  source: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await withTx(async (client) => {
    const read = await client.query<{ state: SiteVersionState }>(
      `select state::text as state from public.gnr8_runtime_site_versions where id = $1::uuid limit 1`,
      [input.siteVersionId],
    );
    const current = read.rows[0]?.state;
    if (!current) throw new Error("SiteVersion not found");
    if (current !== input.expectedCurrentState) {
      throw new Error(`Invalid current state: expected ${input.expectedCurrentState}, got ${current}`);
    }

    await client.query(
      `
      update public.gnr8_runtime_site_versions
      set state = $2::text, updated_at = now()
      where id = $1::uuid
      `,
      [input.siteVersionId, input.nextState],
    );

    await client.query(
      `
      insert into public.gnr8_runtime_version_audit (site_version_id, from_state, to_state, actor, source, details)
      values ($1::uuid, $2::text, $3::text, $4::text, $5::text, $6::jsonb)
      `,
      [
        input.siteVersionId,
        input.expectedCurrentState,
        input.nextState,
        input.actor,
        input.source,
        JSON.stringify(input.details ?? {}),
      ],
    );
  });
}

export async function createArtifact(input: {
  siteId: string;
  siteVersionId: string;
  rendererCompatibilityVersion: string;
  bundleSha256: string;
  htmlByPath: Record<string, string>;
  compiledTokenStyles: string;
  assetFingerprintMap: Record<string, string>;
  manifest: Record<string, unknown>;
  publishStage: RuntimeArtifact["publishStage"];
  shadowRestricted: boolean;
  artifactGovernance: RuntimeArtifact["artifactGovernance"];
}): Promise<{ artifactId: string }> {
  return withTx(async (client) => {
    const existing = await client.query<{ id: string }>(
      `select id::text as id from public.gnr8_runtime_artifacts where site_version_id = $1::uuid limit 1`,
      [input.siteVersionId],
    );
    const existingId = existing.rows[0]?.id;
    if (existingId) return { artifactId: existingId };

    const insert = await client.query<{ id: string }>(
      `
      insert into public.gnr8_runtime_artifacts (
        site_id,
        site_version_id,
        renderer_compatibility_version,
        bundle_sha256,
        html_by_path,
        compiled_token_styles,
        asset_fingerprint_map,
        manifest,
        publish_stage,
        shadow_restricted,
        artifact_governance
      )
      values ($1::text, $2::uuid, $3::text, $4::text, $5::jsonb, $6::text, $7::jsonb, $8::jsonb, $9::text, $10::boolean, $11::jsonb)
      returning id::text as id
      `,
      [
        input.siteId,
        input.siteVersionId,
        input.rendererCompatibilityVersion,
        input.bundleSha256,
        JSON.stringify(input.htmlByPath),
        input.compiledTokenStyles,
        JSON.stringify(input.assetFingerprintMap),
        JSON.stringify(input.manifest),
        input.publishStage,
        input.shadowRestricted,
        JSON.stringify(input.artifactGovernance),
      ],
    );

    return { artifactId: insert.rows[0]!.id };
  });
}

export async function bindArtifactToVersion(input: {
  siteVersionId: string;
  artifactId: string;
  rendererCompatibilityVersion: string;
}): Promise<{ affectedRows: number }> {
  return withTx(async (client) => {
    const updated = await client.query<{ id: string }>(
      `
      update public.gnr8_runtime_site_versions
      set artifact_id = $2::uuid, renderer_compatibility_version = $3::text, updated_at = now()
      where id = $1::uuid
      returning id::text as id
      `,
      [input.siteVersionId, input.artifactId, input.rendererCompatibilityVersion],
    );
    if (!updated.rows[0]) {
      throw new Error(`Runtime site version not found for artifact bind: ${input.siteVersionId}`);
    }
    return { affectedRows: updated.rowCount ?? 0 };
  });
}

export async function switchActivePointer(input: {
  siteId: string;
  siteVersionId: string;
  artifactId: string;
}): Promise<{
  switched: boolean;
  previousActivePointer: { siteVersionId: string; artifactId: string } | null;
}> {
  return withTx(async (client) => {
    const previous = await client.query<{ active_site_version_id: string; active_artifact_id: string }>(
      `
      select active_site_version_id::text as active_site_version_id, active_artifact_id::text as active_artifact_id
      from public.gnr8_runtime_active_pointers
      where site_id = $1::text
      limit 1
      `,
      [input.siteId],
    );
    const previousActivePointer = previous.rows[0]
      ? {
          siteVersionId: previous.rows[0].active_site_version_id,
          artifactId: previous.rows[0].active_artifact_id,
        }
      : null;
    const alreadyActive =
      previousActivePointer?.siteVersionId === input.siteVersionId && previousActivePointer?.artifactId === input.artifactId;
    if (alreadyActive) {
      return {
        switched: false,
        previousActivePointer,
      };
    }

    await client.query(
      `
      insert into public.gnr8_runtime_active_pointers (site_id, active_site_version_id, active_artifact_id, updated_at)
      values ($1::text, $2::uuid, $3::uuid, now())
      on conflict (site_id)
      do update set
        active_site_version_id = excluded.active_site_version_id,
        active_artifact_id = excluded.active_artifact_id,
        updated_at = now()
      `,
      [input.siteId, input.siteVersionId, input.artifactId],
    );

    return {
      switched: true,
      previousActivePointer,
    };
  });
}

export async function getPublishedVersionForSite(siteId: string): Promise<{ id: string; artifactId: string } | null> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const res = await client.query<{ id: string; artifact_id: string }>(
      `
      select id::text as id, artifact_id::text as artifact_id
      from public.gnr8_runtime_site_versions
      where site_id = $1::text and state = 'PUBLISHED' and artifact_id is not null
      order by version_no desc
      limit 1
      `,
      [siteId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return { id: row.id, artifactId: row.artifact_id };
  } finally {
    client.release();
  }
}

export async function getArtifactById(artifactId: string): Promise<RuntimeArtifact | null> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    return getArtifactByIdWithClient(client, artifactId);
  } finally {
    client.release();
  }
}

async function getArtifactByIdWithClient(client: PoolClient, artifactId: string): Promise<RuntimeArtifact | null> {
  const res = await client.query<{
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
  }>(
    `
    select
      id::text as id,
      site_id::text,
      site_version_id::text,
      renderer_compatibility_version::text,
      html_by_path,
      compiled_token_styles,
      asset_fingerprint_map,
      manifest,
      publish_stage::text as publish_stage,
      shadow_restricted,
      artifact_governance,
      bundle_sha256::text,
      created_at::text
    from public.gnr8_runtime_artifacts
    where id = $1::uuid
    limit 1
    `,
    [artifactId],
  );
  const row = res.rows[0];
  if (!row) return null;

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

export async function resolveActiveArtifactForHostAndPath(input: {
  host?: string | null;
  path: string;
}): Promise<{ artifact: RuntimeArtifact; html: string } | null> {
  const resolved = await resolveActiveArtifactForHostAndPathWithDiagnostics(input);
  if (resolved.outcome !== "artifact_hit") return null;
  return {
    artifact: resolved.artifact,
    html: resolved.html,
  };
}

export type PublicRuntimeArtifactMissReasonCode =
  | "no_runtime_site"
  | "no_active_pointer"
  | "active_artifact_missing"
  | "artifact_path_missing"
  | "artifact_stage_denied";

export type PublicRuntimeArtifactResolution =
  | {
      outcome: "artifact_hit";
      host: string;
      path: string;
      normalizedPath: string;
      siteId: string;
      ownershipSiteId?: string | null;
      siteResolution: "host_match" | "fallback_latest_site";
      hostBindingId: string | null;
      hostBindingKind: string | null;
      hostBindingStatus: RuntimeHostBindingStatus | null;
      activeSiteVersionId: string;
      artifactId: string;
      artifact: RuntimeArtifact;
      html: string;
      resolvedPath: string;
    }
  | {
      outcome: "artifact_miss";
      host: string;
      path: string;
      normalizedPath: string;
      siteId: string | null;
      ownershipSiteId?: string | null;
      siteResolution: "host_match" | "fallback_latest_site" | "none";
      hostBindingId: string | null;
      hostBindingKind: string | null;
      hostBindingStatus: RuntimeHostBindingStatus | null;
      activeSiteVersionId: string | null;
      artifactId: string | null;
      reasonCode: PublicRuntimeArtifactMissReasonCode;
    };

export type RuntimeSiteResolutionForHost =
  | {
      outcome: "site_hit";
      host: string;
      siteId: string;
      siteResolution: "host_match" | "fallback_latest_site";
      hostBindingId: string | null;
      hostBindingKind: string | null;
      hostBindingStatus: RuntimeHostBindingStatus | null;
      sourceUrl: string;
      sourceHost: string | null;
    }
  | {
      outcome: "site_miss";
      host: string;
      reasonCode: "no_runtime_site" | "missing_source_url";
    };

export async function resolveRuntimeSiteForHost(input: {
  host?: string | null;
}): Promise<RuntimeSiteResolutionForHost> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const host = normalizeRuntimeHost(String(input.host ?? ""));
    const res = await client.query<{
      site_id: string;
      site_resolution: "host_match" | "fallback_latest_site";
      host_binding_id: string | null;
      host_binding_kind: string | null;
      host_binding_status: RuntimeHostBindingStatus | null;
      source_url: string | null;
      source_host: string | null;
    }>(
      `
      with candidate_site as (
        select
          b.id::text as host_binding_id,
          b.site_id::text as site_id,
          b.binding_kind::text as host_binding_kind,
          b.status::text as host_binding_status
        from public.gnr8_runtime_host_bindings b
        where lower(b.host) = $1::text
          and b.status = 'ACTIVE'
        order by b.updated_at desc, b.created_at desc
        limit 1
      ), fallback_site as (
        select id::text as site_id from public.gnr8_runtime_sites order by created_at desc limit 1
      ), resolved_site as (
        select
          site_id,
          'host_match'::text as site_resolution,
          host_binding_id,
          host_binding_kind,
          host_binding_status
        from candidate_site
        union all
        select
          site_id,
          'fallback_latest_site'::text as site_resolution,
          null::text as host_binding_id,
          null::text as host_binding_kind,
          null::text as host_binding_status
        from fallback_site
        where not exists (select 1 from candidate_site)
      )
      select
        s.site_id::text as site_id,
        s.site_resolution::text as site_resolution,
        s.host_binding_id::text as host_binding_id,
        s.host_binding_kind::text as host_binding_kind,
        s.host_binding_status::text as host_binding_status,
        rs.source_url::text as source_url,
        rs.source_host::text as source_host
      from resolved_site s
      join public.gnr8_runtime_sites rs on rs.id = s.site_id
      limit 1
      `,
      [host],
    );

    const row = res.rows[0];
    if (!row) return { outcome: "site_miss", host, reasonCode: "no_runtime_site" };
    if (!row.source_url || !row.source_url.trim()) return { outcome: "site_miss", host, reasonCode: "missing_source_url" };
    return {
      outcome: "site_hit",
      host,
      siteId: row.site_id,
      siteResolution: row.site_resolution,
      hostBindingId: row.host_binding_id,
      hostBindingKind: row.host_binding_kind,
      hostBindingStatus: row.host_binding_status,
      sourceUrl: row.source_url,
      sourceHost: row.source_host,
    };
  } finally {
    client.release();
  }
}

export async function resolveActiveArtifactForHostAndPathWithDiagnostics(input: {
  host?: string | null;
  path: string;
}): Promise<PublicRuntimeArtifactResolution> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const host = normalizeRuntimeHost(String(input.host ?? ""));
    const normalizedPath = normalizePagePath(input.path);

    const pointerRes = await client.query<{
      site_id: string;
      ownership_site_id: string | null;
      site_resolution: "host_match" | "fallback_latest_site";
      host_binding_id: string | null;
      host_binding_kind: string | null;
      host_binding_status: RuntimeHostBindingStatus | null;
      active_site_version_id: string | null;
      artifact_id: string | null;
    }>(
      `
      with candidate_site as (
        select
          b.id::text as host_binding_id,
          b.site_id::text as site_id,
          b.binding_kind::text as host_binding_kind,
          b.status::text as host_binding_status
        from public.gnr8_runtime_host_bindings b
        where lower(b.host) = $1::text
          and b.status = 'ACTIVE'
        order by b.updated_at desc, b.created_at desc
        limit 1
      ), fallback_site as (
        select id::text as site_id from public.gnr8_runtime_sites order by created_at desc limit 1
      ), resolved_site as (
        select
          site_id,
          'host_match'::text as site_resolution,
          host_binding_id,
          host_binding_kind,
          host_binding_status
        from candidate_site
        union all
        select
          site_id,
          'fallback_latest_site'::text as site_resolution,
          null::text as host_binding_id,
          null::text as host_binding_kind,
          null::text as host_binding_status
        from fallback_site
        where not exists (select 1 from candidate_site)
      )
      select
        s.site_id::text as site_id,
        s.site_resolution::text as site_resolution,
        s.host_binding_id::text as host_binding_id,
        s.host_binding_kind::text as host_binding_kind,
        s.host_binding_status::text as host_binding_status,
        sv.ownership_site_id::text as ownership_site_id,
        p.active_site_version_id::text as active_site_version_id,
        p.active_artifact_id::text as artifact_id
      from resolved_site s
      left join public.gnr8_runtime_active_pointers p on p.site_id = s.site_id
      left join public.gnr8_runtime_site_versions sv on sv.id = p.active_site_version_id
      limit 1
      `,
      [host],
    );

    const pointerRow = pointerRes.rows[0];
    if (!pointerRow) {
      return {
        outcome: "artifact_miss",
        host,
        path: input.path,
        normalizedPath,
        siteId: null,
        ownershipSiteId: null,
        siteResolution: "none",
        hostBindingId: null,
        hostBindingKind: null,
        hostBindingStatus: null,
        activeSiteVersionId: null,
        artifactId: null,
        reasonCode: "no_runtime_site",
      };
    }
    const siteId = pointerRow.site_id;
    const ownershipSiteId = pointerRow.ownership_site_id;
    const siteResolution = pointerRow.site_resolution;
    const hostBindingId = pointerRow.host_binding_id;
    const hostBindingKind = pointerRow.host_binding_kind;
    const hostBindingStatus = pointerRow.host_binding_status;
    const activeSiteVersionId = pointerRow.active_site_version_id;
    const artifactId = pointerRow.artifact_id;
    if (!artifactId || !activeSiteVersionId) {
      return {
        outcome: "artifact_miss",
        host,
        path: input.path,
        normalizedPath,
        siteId,
        ownershipSiteId,
        siteResolution,
        hostBindingId,
        hostBindingKind,
        hostBindingStatus,
        activeSiteVersionId: activeSiteVersionId ?? null,
        artifactId: artifactId ?? null,
        reasonCode: "no_active_pointer",
      };
    }

    const artifact = await getArtifactByIdWithClient(client, artifactId);
    if (!artifact) {
      return {
        outcome: "artifact_miss",
        host,
        path: input.path,
        normalizedPath,
        siteId,
        ownershipSiteId,
        siteResolution,
        hostBindingId,
        hostBindingKind,
        hostBindingStatus,
        activeSiteVersionId,
        artifactId,
        reasonCode: "active_artifact_missing",
      };
    }

    const servingStage = resolveServingStageFromBindingKind(hostBindingKind);
    const servingEligibility = evaluateRuntimeArtifactServingEligibility({
      artifact,
      servingStage,
    });
    if (!servingEligibility.allow) {
      return {
        outcome: "artifact_miss",
        host,
        path: input.path,
        normalizedPath,
        siteId,
        ownershipSiteId,
        siteResolution,
        hostBindingId,
        hostBindingKind,
        hostBindingStatus,
        activeSiteVersionId,
        artifactId,
        reasonCode: "artifact_stage_denied",
      };
    }

    const resolvedPath = artifact.htmlByPath[normalizedPath] ? normalizedPath : "/";
    const html = artifact.htmlByPath[resolvedPath];
    if (!html) {
      return {
        outcome: "artifact_miss",
        host,
        path: input.path,
        normalizedPath,
        siteId,
        ownershipSiteId,
        siteResolution,
        hostBindingId,
        hostBindingKind,
        hostBindingStatus,
        activeSiteVersionId,
        artifactId,
        reasonCode: "artifact_path_missing",
      };
    }

    return {
      outcome: "artifact_hit",
      host,
      path: input.path,
      normalizedPath,
      siteId,
      ownershipSiteId,
      siteResolution,
      hostBindingId,
      hostBindingKind,
      hostBindingStatus,
      activeSiteVersionId,
      artifactId,
      artifact,
      html,
      resolvedPath,
    };
  } finally {
    client.release();
  }
}

export async function listPreviouslyPublishedVersions(siteId: string): Promise<Array<{ id: string; artifactId: string }>> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const res = await client.query<{ id: string; artifact_id: string }>(
      `
      select id::text as id, artifact_id::text as artifact_id
      from public.gnr8_runtime_site_versions
      where site_id = $1::text and artifact_id is not null and state in ('PUBLISHED', 'ARCHIVED')
      order by version_no desc
      `,
      [siteId],
    );

    return res.rows.map((r) => ({ id: r.id, artifactId: r.artifact_id }));
  } finally {
    client.release();
  }
}

export async function archivePublishedVersionsExcept(input: { siteId: string; keepSiteVersionId: string; actor: string }): Promise<void> {
  await withTx(async (client) => {
    const rows = await client.query<{ id: string }>(
      `
      select id::text as id
      from public.gnr8_runtime_site_versions
      where site_id = $1::text and state = 'PUBLISHED' and id <> $2::uuid
      `,
      [input.siteId, input.keepSiteVersionId],
    );

    for (const row of rows.rows) {
      await client.query(
        `update public.gnr8_runtime_site_versions set state = 'ARCHIVED', updated_at = now() where id = $1::uuid`,
        [row.id],
      );
      await client.query(
        `
        insert into public.gnr8_runtime_version_audit (site_version_id, from_state, to_state, actor, source, details)
        values ($1::uuid, 'PUBLISHED', 'ARCHIVED', $2::text, 'manual', $3::jsonb)
        `,
        [row.id, input.actor, JSON.stringify({ autoArchivedByPublish: input.keepSiteVersionId })],
      );
    }
  });
}

export async function getVersionState(siteVersionId: string): Promise<SiteVersionState | null> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const res = await client.query<{ state: SiteVersionState }>(
      `select state::text as state from public.gnr8_runtime_site_versions where id = $1::uuid limit 1`,
      [siteVersionId],
    );
    return res.rows[0]?.state ?? null;
  } finally {
    client.release();
  }
}

export async function getSiteVersionArtifactBinding(siteVersionId: string): Promise<{ siteId: string; artifactId: string | null } | null> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const res = await client.query<{ site_id: string; artifact_id: string | null }>(
      `
      select site_id::text as site_id, artifact_id::text as artifact_id
      from public.gnr8_runtime_site_versions
      where id = $1::uuid
      limit 1
      `,
      [siteVersionId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return { siteId: row.site_id, artifactId: row.artifact_id };
  } finally {
    client.release();
  }
}

export async function getRawTemplateSiteArtifact(siteVersionId: string): Promise<RawTemplateSiteArtifact | null> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const result = await client.query<RawTemplateArtifactRow>(
      `
      select
        id::text as id,
        artifact_type::text as artifact_type,
        site_id::text as site_id,
        site_version_id::text as site_version_id,
        entry_html_path::text as entry_html_path,
        asset_base_path::text as asset_base_path,
        file_map,
        created_at::text as created_at
      from public.gnr8_runtime_raw_template_artifacts
      where site_version_id = $1::uuid
      limit 1
      `,
      [siteVersionId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const entryHtmlPath = normalizeRawTemplateFilePath(row.entry_html_path);
    if (!entryHtmlPath) return null;
    const assetBasePath = normalizeRawTemplateFilePath(row.asset_base_path);
    return {
      id: row.id,
      artifactType: "raw_template_site",
      siteId: row.site_id,
      siteVersionId: row.site_version_id,
      entryHtmlPath,
      assetBasePath,
      fileMap: parseRawTemplateFileMap(row.file_map),
      createdAt: row.created_at,
    };
  } finally {
    client.release();
  }
}

export async function getRawTemplateSiteAsset(input: {
  siteVersionId: string;
  filePath: string;
}): Promise<{ mediaType: string; sizeBytes: number; sha256: string; bytes: Buffer } | null> {
  await ensureRuntimeTables();
  const normalizedFilePath = normalizeRawTemplateFilePath(input.filePath);
  if (!normalizedFilePath) return null;
  const client = await getSuperadminPool().connect();
  try {
    const row = await client.query<RawTemplateArtifactFileRow>(
      `
      select
        f.media_type::text as media_type,
        f.file_size_bytes::integer as file_size_bytes,
        f.sha256::text as sha256,
        f.content_bytes
      from public.gnr8_runtime_raw_template_artifacts a
      join public.gnr8_runtime_raw_template_artifact_files f
        on f.artifact_id = a.id
      where a.site_version_id = $1::uuid
        and f.file_path = $2::text
      limit 1
      `,
      [input.siteVersionId, normalizedFilePath],
    );
    const hit = row.rows[0];
    if (!hit) return null;
    const bytes = Buffer.isBuffer(hit.content_bytes) ? hit.content_bytes : Buffer.from(hit.content_bytes);
    return {
      mediaType: hit.media_type,
      sizeBytes: Math.max(0, Math.floor(Number(hit.file_size_bytes) || 0)),
      sha256: hit.sha256,
      bytes,
    };
  } finally {
    client.release();
  }
}

export async function getActivePointerForSite(siteId: string): Promise<{ siteVersionId: string; artifactId: string } | null> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const res = await client.query<{ active_site_version_id: string; active_artifact_id: string }>(
      `
      select
        active_site_version_id::text as active_site_version_id,
        active_artifact_id::text as active_artifact_id
      from public.gnr8_runtime_active_pointers
      where site_id = $1::text
      limit 1
      `,
      [siteId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      siteVersionId: row.active_site_version_id,
      artifactId: row.active_artifact_id,
    };
  } finally {
    client.release();
  }
}

export async function upsertMigrationActivationLineage(input: {
  siteId: string;
  sourceUrl: string;
  siteVersionId: string;
  artifact: RuntimeArtifact;
  actor: string;
}): Promise<void> {
  await withTx(async (client) => {
    const sourceHost = (() => {
      try {
        return new URL(input.sourceUrl).host;
      } catch {
        return null;
      }
    })();

    await client.query(
      `
      insert into public.gnr8_runtime_sites (id, source_url, source_host)
      values ($1::text, $2::text, $3::text)
      on conflict (id)
      do update set source_url = excluded.source_url, source_host = excluded.source_host, updated_at = now()
      `,
      [input.siteId, input.sourceUrl, sourceHost],
    );

    const existingSiteVersion = await client.query<{
      id: string;
      site_id: string;
      renderer_compatibility_version: string;
    }>(
      `
      select
        id::text as id,
        site_id::text as site_id,
        renderer_compatibility_version::text as renderer_compatibility_version
      from public.gnr8_runtime_site_versions
      where id = $1::uuid
      limit 1
      `,
      [input.siteVersionId],
    );

    if (!existingSiteVersion.rows[0]) {
      const versionNo = await getNextSiteVersionNo(client, input.siteId);
      await client.query(
        `
        insert into public.gnr8_runtime_site_versions (
          id,
          site_id,
          version_no,
          state,
          source,
          actor,
          renderer_compatibility_version,
          artifact_id
        )
        values ($1::uuid, $2::text, $3::int, 'APPROVED', 'migration', $4::text, $5::text, null)
        `,
        [input.siteVersionId, input.siteId, versionNo, input.actor, input.artifact.rendererCompatibilityVersion],
      );
      await client.query(
        `
        insert into public.gnr8_runtime_version_audit (site_version_id, from_state, to_state, actor, source, details)
        values ($1::uuid, null, 'APPROVED', $2::text, 'migration', $3::jsonb)
        `,
        [
          input.siteVersionId,
          input.actor,
          JSON.stringify({
            seededByMigrationActivation: true,
            artifactId: input.artifact.id,
          }),
        ],
      );
    } else {
      if (existingSiteVersion.rows[0].site_id !== input.siteId) {
        throw new Error("PUBLISH_LINEAGE_MISMATCH:siteVersion siteId mismatch");
      }
      if (existingSiteVersion.rows[0].renderer_compatibility_version !== input.artifact.rendererCompatibilityVersion) {
        throw new Error("PUBLISH_LINEAGE_MISMATCH:renderer compatibility mismatch");
      }
    }

    const existingForSiteVersion = await client.query<{ id: string }>(
      `select id::text as id from public.gnr8_runtime_artifacts where site_version_id = $1::uuid limit 1`,
      [input.siteVersionId],
    );
    if (existingForSiteVersion.rows[0] && existingForSiteVersion.rows[0].id !== input.artifact.id) {
      throw new Error("PUBLISH_LINEAGE_MISMATCH:siteVersion artifact binding conflict");
    }

    const existingArtifact = await client.query<{
      id: string;
      site_id: string;
      site_version_id: string;
      renderer_compatibility_version: string;
    }>(
      `
      select
        id::text as id,
        site_id::text as site_id,
        site_version_id::text as site_version_id,
        renderer_compatibility_version::text as renderer_compatibility_version
      from public.gnr8_runtime_artifacts
      where id = $1::uuid
      limit 1
      `,
      [input.artifact.id],
    );

    if (!existingArtifact.rows[0]) {
      await client.query(
        `
        insert into public.gnr8_runtime_artifacts (
          id,
          site_id,
          site_version_id,
          renderer_compatibility_version,
          bundle_sha256,
          html_by_path,
          compiled_token_styles,
          asset_fingerprint_map,
          manifest,
          publish_stage,
          shadow_restricted,
          artifact_governance
        )
        values ($1::uuid, $2::text, $3::uuid, $4::text, $5::text, $6::jsonb, $7::text, $8::jsonb, $9::jsonb, $10::text, $11::boolean, $12::jsonb)
        `,
        [
          input.artifact.id,
          input.siteId,
          input.siteVersionId,
          input.artifact.rendererCompatibilityVersion,
          input.artifact.bundleSha256,
          JSON.stringify(input.artifact.htmlByPath),
          input.artifact.compiledTokenStyles,
          JSON.stringify(input.artifact.assetFingerprintMap),
          JSON.stringify(input.artifact.manifest),
          input.artifact.publishStage,
          input.artifact.shadowRestricted,
          JSON.stringify(input.artifact.artifactGovernance),
        ],
      );
    } else {
      if (existingArtifact.rows[0].site_id !== input.siteId || existingArtifact.rows[0].site_version_id !== input.siteVersionId) {
        throw new Error("PUBLISH_LINEAGE_MISMATCH:artifact lineage mismatch");
      }
      if (existingArtifact.rows[0].renderer_compatibility_version !== input.artifact.rendererCompatibilityVersion) {
        throw new Error("PUBLISH_LINEAGE_MISMATCH:artifact renderer compatibility mismatch");
      }
    }

    await client.query(
      `
      update public.gnr8_runtime_site_versions
      set artifact_id = $2::uuid, renderer_compatibility_version = $3::text, updated_at = now()
      where id = $1::uuid
      `,
      [input.siteVersionId, input.artifact.id, input.artifact.rendererCompatibilityVersion],
    );
  });
}

export async function recordPublishActivationAudit(input: {
  siteVersionId: string;
  actor: string;
  source: "migration" | "ai" | "manual";
  details: Record<string, unknown>;
}): Promise<void> {
  await withTx(async (client) => {
    const stateRes = await client.query<{ state: SiteVersionState }>(
      `select state::text as state from public.gnr8_runtime_site_versions where id = $1::uuid limit 1`,
      [input.siteVersionId],
    );
    const current = stateRes.rows[0]?.state;
    if (!current) throw new Error("SiteVersion not found");

    await client.query(
      `
      insert into public.gnr8_runtime_version_audit (site_version_id, from_state, to_state, actor, source, details)
      values ($1::uuid, $2::text, $2::text, $3::text, $4::text, $5::jsonb)
      `,
      [input.siteVersionId, current, input.actor, input.source, JSON.stringify(input.details)],
    );
  });
}

export async function saveFormSubmission(input: VersionScopedFormSubmission): Promise<{ submissionId: string; createdAt: string }> {
  return withTx(async (client) => {
    const versionRes = await client.query<{ id: string }>(
      `
      select id::text as id
      from public.gnr8_runtime_site_versions
      where id = $1::uuid and site_id = $2::text
      limit 1
      `,
      [input.siteVersionId, input.siteId],
    );

    if (!versionRes.rows[0]) throw new Error("Unknown siteVersion");

    const insert = await client.query<{ id: string; created_at: string }>(
      `
      insert into public.gnr8_runtime_form_submissions (site_id, site_version_id, page_path, form_id, payload, actor)
      values ($1::text, $2::uuid, $3::text, $4::text, $5::jsonb, $6::text)
      returning id::text as id, created_at::text as created_at
      `,
      [
        input.siteId,
        input.siteVersionId,
        normalizePagePath(input.pagePath),
        input.formId,
        JSON.stringify(input.payload),
        input.actor,
      ],
    );

    return {
      submissionId: insert.rows[0]!.id,
      createdAt: insert.rows[0]!.created_at,
    };
  });
}

export async function markSiteVersionPublished(input: { siteVersionId: string }): Promise<void> {
  await withTx(async (client) => {
    await client.query(
      `update public.gnr8_runtime_site_versions set state = 'PUBLISHED', updated_at = now() where id = $1::uuid`,
      [input.siteVersionId],
    );
  });
}

export async function hydratePageVersionFromInput(input: CanonicalPageVersionInput): Promise<CanonicalPageVersionInput> {
  return {
    ...input,
    path: normalizePagePath(input.path),
  };
}
