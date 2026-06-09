import "server-only";

import type { PoolClient } from "pg";

import { getSuperadminPool } from "@/src/superadmin/db";

import { normalizePagePath, stableStringify } from "@/gnr8/runtime/deterministic";
import {
  normalizeRuntimeDomain as normalizeRuntimeDomainIdentity,
  normalizeRuntimeHost as normalizeRuntimeHostIdentity,
} from "@/gnr8/runtime/identity/runtime-identity";
import { evaluateRuntimeArtifactServingEligibility } from "@/gnr8/runtime/publish-enforcement";
import type {
  CanonicalPageVersionInput,
  CanonicalPageVersionSnapshot,
  PageMigrationGovernanceSnapshot,
  RuntimeImportProvenanceSummary,
  CanonicalSiteMigrationInput,
  CanonicalSiteVersionSnapshot,
  RawImportedSiteArtifact,
  RawImportedSiteArtifactMetadata,
  RawTemplateSiteArtifact,
  RawTemplateSiteFileMeta,
  RuntimeArtifact,
  SiteVersionState,
  VersionScopedFormSubmission,
} from "@/gnr8/runtime/types";
import type { ContentOverride, ContentOverrideStatus, ContentSlot, ContentSlotType } from "@/gnr8/runtime/content-binding";

export type RuntimeStoreDbClient = PoolClient;
export type RuntimeStoreDbOptions = { dbClient?: RuntimeStoreDbClient };

let tablesReady: Promise<void> | null = null;

export async function ensureRuntimeTables(options: RuntimeStoreDbOptions = {}): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      const client = options.dbClient ?? (await getSuperadminPool().connect());
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
            metadata_json jsonb not null default '{}'::jsonb,
            created_at timestamptz not null default now(),
            unique (site_version_id)
          )
        `);
        await client.query(`
          alter table public.gnr8_runtime_raw_template_artifacts
          add column if not exists metadata_json jsonb not null default '{}'::jsonb
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
          create table if not exists public.gnr8_content_slots (
            id uuid primary key default gen_random_uuid(),
            site_id text not null,
            site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
            slot_key text not null,
            slot_type text not null,
            source_selector text,
            source_text text,
            source_asset_path text,
            confidence numeric,
            diagnostics jsonb,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now(),
            unique (site_version_id, slot_key)
          )
        `);

        await client.query(`
          create table if not exists public.gnr8_content_overrides (
            id uuid primary key default gen_random_uuid(),
            site_id text not null,
            site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
            slot_key text not null,
            value_type text not null,
            value_json jsonb not null,
            status text not null default 'draft',
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now(),
            unique (site_version_id, slot_key, status)
          )
        `);

        await client.query(`
          create table if not exists public.gnr8_content_override_history (
            id uuid primary key default gen_random_uuid(),
            site_id text not null,
            site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
            slot_key text not null,
            value_type text not null,
            previous_value_json jsonb,
            next_value_json jsonb not null,
            action text not null check (action in ('draft_saved', 'content_published', 'rollback_applied')),
            actor_user_id uuid,
            source text not null default 'manual' check (source in ('manual', 'batch', 'system', 'ai')),
            created_at timestamptz not null default now(),
            metadata jsonb
          )
        `);
        await client.query(`create index if not exists gnr8_content_override_history_site_version_idx on public.gnr8_content_override_history (site_version_id)`);
        await client.query(`create index if not exists gnr8_content_override_history_site_idx on public.gnr8_content_override_history (site_id)`);
        await client.query(`create index if not exists gnr8_content_override_history_slot_key_idx on public.gnr8_content_override_history (slot_key)`);
        await client.query(`create index if not exists gnr8_content_override_history_created_at_desc_idx on public.gnr8_content_override_history (created_at desc)`);

        await client.query(`
          create table if not exists public.gnr8_runtime_domain_host_bindings (
            id uuid primary key default gen_random_uuid(),
            site_id text not null references public.gnr8_runtime_sites(id) on delete cascade,
            site_version_id uuid not null references public.gnr8_runtime_site_versions(id) on delete cascade,
            domain text not null,
            status text not null default 'pending' check (status in ('pending', 'verifying', 'active', 'failed')),
            domain_type text check (domain_type in ('apex_domain', 'subdomain', 'wildcard_domain', 'unknown')),
            verification_type text check (verification_type in ('cname', 'txt')),
            verification_value text,
            verification_host text,
            dns_record_type text check (dns_record_type in ('a', 'cname', 'txt')),
            dns_record_host text,
            dns_record_value text,
            dns_record_purpose text check (dns_record_purpose in ('verification', 'routing')),
            dns_instructions_json jsonb,
            last_checked_at timestamptz,
            vercel_domain_id text,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now(),
            unique (site_id, domain)
          )
        `);

        await client.query(`
          alter table public.gnr8_runtime_domain_host_bindings
          add column if not exists verification_type text
        `);
        await client.query(`
          alter table public.gnr8_runtime_domain_host_bindings
          add column if not exists domain_type text
        `);
        await client.query(`
          alter table public.gnr8_runtime_domain_host_bindings
          add column if not exists verification_value text
        `);
        await client.query(`
          alter table public.gnr8_runtime_domain_host_bindings
          add column if not exists verification_host text
        `);
        await client.query(`
          alter table public.gnr8_runtime_domain_host_bindings
          add column if not exists last_checked_at timestamptz
        `);
        await client.query(`
          alter table public.gnr8_runtime_domain_host_bindings
          add column if not exists vercel_domain_id text
        `);
        await client.query(`
          alter table public.gnr8_runtime_domain_host_bindings
          add column if not exists dns_record_type text
        `);
        await client.query(`
          alter table public.gnr8_runtime_domain_host_bindings
          add column if not exists dns_record_host text
        `);
        await client.query(`
          alter table public.gnr8_runtime_domain_host_bindings
          add column if not exists dns_record_value text
        `);
        await client.query(`
          alter table public.gnr8_runtime_domain_host_bindings
          add column if not exists dns_record_purpose text
        `);
        await client.query(`
          alter table public.gnr8_runtime_domain_host_bindings
          add column if not exists dns_instructions_json jsonb
        `);
        await client.query(`
          do $$
          declare
            r record;
          begin
            for r in
              select c.conname
              from pg_constraint c
              where c.conrelid = 'public.gnr8_runtime_domain_host_bindings'::regclass
                and c.contype = 'c'
                and pg_get_constraintdef(c.oid) ilike '%status in (''pending'', ''active'')%'
            loop
              execute format('alter table public.gnr8_runtime_domain_host_bindings drop constraint %I', r.conname);
            end loop;
          end $$;
        `);
        await client.query(`
          do $$
          begin
            if not exists (
              select 1
              from pg_constraint
              where conrelid = 'public.gnr8_runtime_domain_host_bindings'::regclass
                and conname = 'gnr8_runtime_domain_host_bindings_status_ck'
            ) then
              alter table public.gnr8_runtime_domain_host_bindings
              add constraint gnr8_runtime_domain_host_bindings_status_ck
              check (status in ('pending', 'verifying', 'active', 'failed'));
            end if;
          end $$;
        `);
        await client.query(`
          do $$
          begin
            if not exists (
              select 1
              from pg_constraint
              where conrelid = 'public.gnr8_runtime_domain_host_bindings'::regclass
                and conname = 'gnr8_runtime_domain_host_bindings_verification_type_ck'
            ) then
              alter table public.gnr8_runtime_domain_host_bindings
              add constraint gnr8_runtime_domain_host_bindings_verification_type_ck
              check (verification_type in ('cname', 'txt'));
            end if;
          end $$;
        `);
        await client.query(`
          do $$
          begin
            if not exists (
              select 1
              from pg_constraint
              where conrelid = 'public.gnr8_runtime_domain_host_bindings'::regclass
                and conname = 'gnr8_runtime_domain_host_bindings_domain_type_ck'
            ) then
              alter table public.gnr8_runtime_domain_host_bindings
              add constraint gnr8_runtime_domain_host_bindings_domain_type_ck
              check (domain_type in ('apex_domain', 'subdomain', 'wildcard_domain', 'unknown'));
            end if;
          end $$;
        `);
        await client.query(`
          do $$
          begin
            if not exists (
              select 1
              from pg_constraint
              where conrelid = 'public.gnr8_runtime_domain_host_bindings'::regclass
                and conname = 'gnr8_runtime_domain_host_bindings_dns_record_type_ck'
            ) then
              alter table public.gnr8_runtime_domain_host_bindings
              add constraint gnr8_runtime_domain_host_bindings_dns_record_type_ck
              check (dns_record_type in ('a', 'cname', 'txt'));
            end if;
          end $$;
        `);
        await client.query(`
          do $$
          begin
            if not exists (
              select 1
              from pg_constraint
              where conrelid = 'public.gnr8_runtime_domain_host_bindings'::regclass
                and conname = 'gnr8_runtime_domain_host_bindings_dns_record_purpose_ck'
            ) then
              alter table public.gnr8_runtime_domain_host_bindings
              add constraint gnr8_runtime_domain_host_bindings_dns_record_purpose_ck
              check (dns_record_purpose in ('verification', 'routing'));
            end if;
          end $$;
        `);

        await client.query(`
          create unique index if not exists gnr8_runtime_domain_host_bindings_active_domain_uq
          on public.gnr8_runtime_domain_host_bindings (lower(domain))
          where status = 'active'
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
        if (!options.dbClient) client.release();
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
  metadata_json: unknown;
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

export type RuntimeSiteSummary = {
  id: string;
  sourceUrl: string;
  sourceHost: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RuntimeOwnershipSiteSummary = {
  id: string;
  name: string | null;
  status: string | null;
  domain: string | null;
  orgId: string | null;
  agencyId: string | null;
};

export type RuntimeSiteVersionOwnershipSnapshot = {
  id: string;
  siteId: string;
  versionNo: number;
  state: SiteVersionState;
  artifactId: string | null;
  ownershipSiteId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RuntimeDomainHostBindingStatus = "pending" | "verifying" | "active" | "failed";
export type RuntimeDomainVerificationType = "cname" | "txt";
export type RuntimeDomainType = "apex_domain" | "subdomain" | "wildcard_domain" | "unknown";
export type RuntimeDomainDnsRecordType = "a" | "cname" | "txt";
export type RuntimeDomainDnsRecordPurpose = "verification" | "routing";

export type RuntimeDomainDnsInstruction = {
  type: RuntimeDomainDnsRecordType;
  host: string;
  value: string;
  purpose: RuntimeDomainDnsRecordPurpose;
  source: "vercel" | "inferred";
};

export type RuntimeDomainHostBinding = {
  id: string;
  siteId: string;
  siteVersionId: string;
  domain: string;
  status: RuntimeDomainHostBindingStatus;
  domainType: RuntimeDomainType | null;
  verificationType: RuntimeDomainVerificationType | null;
  verificationValue: string | null;
  verificationHost: string | null;
  dnsRecordType: RuntimeDomainDnsRecordType | null;
  dnsRecordHost: string | null;
  dnsRecordValue: string | null;
  dnsRecordPurpose: RuntimeDomainDnsRecordPurpose | null;
  dnsInstructions: RuntimeDomainDnsInstruction[] | null;
  lastCheckedAt: string | null;
  vercelDomainId: string | null;
  createdAt: string;
  updatedAt: string;
};

async function withRuntimeClient<T>(
  options: RuntimeStoreDbOptions | undefined,
  fn: (client: RuntimeStoreDbClient) => Promise<T>,
): Promise<T> {
  await ensureRuntimeTables(options);
  if (options?.dbClient) return fn(options.dbClient);

  const client = await getSuperadminPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

async function withTx<T>(fn: (client: PoolClient) => Promise<T>, options: RuntimeStoreDbOptions = {}): Promise<T> {
  await ensureRuntimeTables(options);
  const client = options.dbClient ?? (await getSuperadminPool().connect());
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    if (!options.dbClient) client.release();
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
  return normalizeRuntimeHostIdentity(host);
}

function normalizeRuntimeDomain(domain: string): string {
  return normalizeRuntimeDomainIdentity(domain);
}

function parseRuntimeDomainDnsInstructions(value: unknown): RuntimeDomainDnsInstruction[] | null {
  if (!Array.isArray(value)) return null;
  const records: RuntimeDomainDnsInstruction[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const typeRaw = String(record.type ?? "").trim().toLowerCase();
    const host = String(record.host ?? "").trim();
    const valueRaw = String(record.value ?? "").trim();
    const purposeRaw = String(record.purpose ?? "").trim().toLowerCase();
    const sourceRaw = String(record.source ?? "").trim().toLowerCase();
    const type = typeRaw === "a" || typeRaw === "cname" || typeRaw === "txt" ? typeRaw : null;
    const purpose = purposeRaw === "verification" || purposeRaw === "routing" ? purposeRaw : null;
    const source = sourceRaw === "vercel" || sourceRaw === "inferred" ? sourceRaw : null;
    if (!type || !purpose || !source || !host || !valueRaw) continue;
    records.push({
      type,
      host,
      value: valueRaw,
      purpose,
      source,
    });
  }
  return records.length > 0 ? records : null;
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

function parseRawImportedSiteArtifactMetadata(value: unknown): RawImportedSiteArtifactMetadata {
  const record = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  const diagnostics = record.diagnostics && typeof record.diagnostics === "object" && !Array.isArray(record.diagnostics)
    ? (record.diagnostics as Record<string, unknown>)
    : {};
  const assetSummary = record.assetSummary && typeof record.assetSummary === "object" && !Array.isArray(record.assetSummary)
    ? (record.assetSummary as Record<string, unknown>)
    : {};
  return {
    sourceUrl: String(record.sourceUrl ?? "").trim(),
    finalUrl: String(record.finalUrl ?? "").trim() || null,
    htmlByteLength: Math.max(0, Math.floor(Number(record.htmlByteLength ?? 0) || 0)),
    multiPage:
      record.multiPage && typeof record.multiPage === "object" && !Array.isArray(record.multiPage)
        ? {
            enabled: (record.multiPage as Record<string, unknown>).enabled === true,
            pageCount: Math.max(0, Math.floor(Number((record.multiPage as Record<string, unknown>).pageCount ?? 0) || 0)),
            routeMapRef: String((record.multiPage as Record<string, unknown>).routeMapRef ?? "").trim(),
          }
        : undefined,
    diagnostics: {
      codes: Array.isArray(diagnostics.codes)
        ? diagnostics.codes.map((value) => String(value ?? "").trim()).filter(Boolean)
        : [],
    },
    assetSummary: {
      persistedAssetCount: Math.max(0, Math.floor(Number(assetSummary.persistedAssetCount ?? 0) || 0)),
      externalFallbackAssetCount: Math.max(0, Math.floor(Number(assetSummary.externalFallbackAssetCount ?? 0) || 0)),
    },
  };
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

function normalizeRuntimePageVersionIdentityPath(value: string): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || trimmed === "/") return "/";
  let next = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  next = next.replace(/\/{2,}/g, "/");
  next = next.replace(/\/index\.html?$/i, "/");
  if (next !== "/") next = next.replace(/\/+$/g, "");
  return next || "/";
}

type RuntimePageVersionDeduplicationEntry = NonNullable<RuntimeImportProvenanceSummary["pageVersionDeduplication"]>["entries"][number];

function uniqueSortedStrings(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function sourceUrlForRuntimePage(input: { sourceUrl: string; routePath: string }): string | null {
  try {
    const parsed = new URL(input.sourceUrl);
    parsed.pathname = normalizeRuntimePageVersionIdentityPath(input.routePath);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function runtimePageVersionSortKey(input: { page: CanonicalPageVersionInput; sourceUrl: string }): string {
  const routePath = normalizeRuntimePageVersionIdentityPath(input.page.path);
  return [
    routePath,
    String(input.page.pageId ?? "").trim(),
    String(input.page.title ?? "").trim(),
    input.page.source,
    input.page.actor,
    stableStringify(input.page.structureModel),
    stableStringify(input.page.contentModel),
  ].join("|");
}

function buildRuntimePageVersionDuplicateEntry(input: {
  siteVersionId: string | null;
  sourceUrl: string;
  pages: CanonicalPageVersionInput[];
  winner: CanonicalPageVersionInput;
}): RuntimePageVersionDeduplicationEntry {
  const routePaths = uniqueSortedStrings(input.pages.map((page) => normalizeRuntimePageVersionIdentityPath(page.path)));
  const selectedRoutePath = normalizeRuntimePageVersionIdentityPath(input.winner.path);
  const sourceUrls = uniqueSortedStrings(
    input.pages.map((page) => sourceUrlForRuntimePage({ sourceUrl: input.sourceUrl, routePath: normalizeRuntimePageVersionIdentityPath(page.path) })),
  );
  return {
    siteVersionId: input.siteVersionId,
    routePath: selectedRoutePath,
    duplicateRoutePaths: routePaths,
    pageId: String(input.winner.pageId ?? "").trim() || null,
    selectedSourceUrl: sourceUrlForRuntimePage({ sourceUrl: input.sourceUrl, routePath: selectedRoutePath }),
    duplicateSourceUrls: sourceUrls,
    duplicateSourcePaths: [],
    duplicatePageIds: uniqueSortedStrings(input.pages.map((page) => page.pageId)),
  };
}

function buildRuntimePageVersionExistingConflictEntry(input: {
  siteVersionId: string;
  sourceUrl: string;
  pageId: string;
  incomingRoutePath: string;
  existingRoutePath: string;
}): RuntimePageVersionDeduplicationEntry {
  const selectedRoutePath = normalizeRuntimePageVersionIdentityPath(input.incomingRoutePath);
  const existingRoutePath = normalizeRuntimePageVersionIdentityPath(input.existingRoutePath);
  return {
    siteVersionId: input.siteVersionId,
    routePath: selectedRoutePath,
    duplicateRoutePaths: uniqueSortedStrings([selectedRoutePath, existingRoutePath]),
    pageId: input.pageId,
    selectedSourceUrl: sourceUrlForRuntimePage({ sourceUrl: input.sourceUrl, routePath: selectedRoutePath }),
    duplicateSourceUrls: uniqueSortedStrings([
      sourceUrlForRuntimePage({ sourceUrl: input.sourceUrl, routePath: selectedRoutePath }),
      sourceUrlForRuntimePage({ sourceUrl: input.sourceUrl, routePath: existingRoutePath }),
    ]),
    duplicateSourcePaths: [],
    duplicatePageIds: [input.pageId],
  };
}

function runtimePageVersionDuplicateDiagnostic(entry: RuntimePageVersionDeduplicationEntry): string {
  return [
    "MULTIPAGE_PAGE_VERSION_DUPLICATE_DEDUPED",
    `siteVersionId=${entry.siteVersionId ?? "unknown"}`,
    `pageId=${entry.pageId ?? "unknown"}`,
    `routePath=${entry.routePath}`,
    `selectedSourceUrl=${entry.selectedSourceUrl ?? "unknown"}`,
    `duplicateSourceUrls=${entry.duplicateSourceUrls.join(",") || "unknown"}`,
    `sourceDocumentPaths=${entry.duplicateSourcePaths.join(",") || "unknown"}`,
  ].join(":");
}

function mergeRuntimePageVersionDeduplication(input: {
  summary: RuntimeImportProvenanceSummary | null | undefined;
  entries: RuntimePageVersionDeduplicationEntry[];
}): RuntimeImportProvenanceSummary | null | undefined {
  if (!input.summary || input.entries.length === 0) return input.summary;

  const existing = input.summary.pageVersionDeduplication ?? null;
  const existingEntries = existing?.entries ?? [];
  const entries = [...existingEntries, ...input.entries];
  const diagnostics = uniqueSortedStrings([
    ...(existing?.diagnostics ?? []),
    "MULTIPAGE_PAGE_VERSION_DUPLICATE_DEDUPED",
    ...input.entries.map(runtimePageVersionDuplicateDiagnostic),
  ]);
  const duplicateCount = Math.max(0, existing?.duplicateCount ?? 0) + input.entries.reduce((count, entry) => {
    const duplicatePageIdCount = Math.max(0, entry.duplicatePageIds.length - 1);
    const duplicateRouteCount = Math.max(0, (entry.duplicateRoutePaths ?? []).length - 1);
    const duplicateSourceCount = Math.max(0, entry.duplicateSourceUrls.length - 1);
    return count + Math.max(1, duplicatePageIdCount, duplicateRouteCount, duplicateSourceCount);
  }, 0);

  const nextSummary: RuntimeImportProvenanceSummary = {
    ...input.summary,
    importDiagnosticCodes: uniqueSortedStrings([...input.summary.importDiagnosticCodes, "MULTIPAGE_PAGE_VERSION_DUPLICATE_DEDUPED"]),
    pageVersionDeduplication: {
      kind: "runtime_page_version_deduplication_v1",
      duplicateCount,
      diagnostics,
      entries,
    },
  };
  Object.assign(input.summary, nextSummary);
  return input.summary;
}

function buildRuntimePageVersionDuplicateError(input: {
  siteVersionId: string | null;
  sourceUrl: string;
  pageId: string;
  pages: CanonicalPageVersionInput[];
}): Error {
  const routePaths = uniqueSortedStrings(input.pages.map((page) => normalizeRuntimePageVersionIdentityPath(page.path)));
  const sourceUrls = uniqueSortedStrings(input.pages.map((page) => sourceUrlForRuntimePage({ sourceUrl: input.sourceUrl, routePath: page.path })));
  return new Error(
    [
      "MULTIPAGE_PAGE_VERSION_DUPLICATE",
      `siteVersionId=${input.siteVersionId ?? "unknown"}`,
      `pageId=${input.pageId || "unknown"}`,
      `routePath=${routePaths[0] ?? "unknown"}`,
      `duplicateRoutePaths=${routePaths.join(",") || "unknown"}`,
      `duplicateSourceUrls=${sourceUrls.join(",") || "unknown"}`,
      "sourceDocumentPaths=unknown",
    ].join(":"),
  );
}

function canonicalizeRuntimePageVersionsForInsert(input: {
  siteVersionId: string | null;
  sourceUrl: string;
  pages: CanonicalPageVersionInput[];
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
}): {
  pages: CanonicalPageVersionInput[];
  importProvenanceSummary?: RuntimeImportProvenanceSummary | null;
  deduplicationEntries: RuntimePageVersionDeduplicationEntry[];
} {
  const deduplicationEntries: RuntimePageVersionDeduplicationEntry[] = [];
  const byRoute = new Map<string, CanonicalPageVersionInput[]>();
  for (const page of input.pages) {
    const routePath = normalizeRuntimePageVersionIdentityPath(page.path);
    const normalizedPage = {
      ...page,
      path: routePath,
    };
    byRoute.set(routePath, [...(byRoute.get(routePath) ?? []), normalizedPage]);
  }

  const routeDeduped: CanonicalPageVersionInput[] = [];
  for (const routePath of [...byRoute.keys()].sort((left, right) => left.localeCompare(right))) {
    const group = (byRoute.get(routePath) ?? []).sort((left, right) =>
      runtimePageVersionSortKey({ page: left, sourceUrl: input.sourceUrl }).localeCompare(
        runtimePageVersionSortKey({ page: right, sourceUrl: input.sourceUrl }),
      ),
    );
    const winner = group[0];
    if (!winner) continue;
    routeDeduped.push(winner);
    if (group.length > 1) {
      deduplicationEntries.push(
        buildRuntimePageVersionDuplicateEntry({
          siteVersionId: input.siteVersionId,
          sourceUrl: input.sourceUrl,
          pages: group,
          winner,
        }),
      );
    }
  }

  const byPageId = new Map<string, CanonicalPageVersionInput[]>();
  for (const page of routeDeduped) {
    const pageId = String(page.pageId ?? "").trim();
    if (!pageId) {
      throw buildRuntimePageVersionDuplicateError({
        siteVersionId: input.siteVersionId,
        sourceUrl: input.sourceUrl,
        pageId,
        pages: [page],
      });
    }
    byPageId.set(pageId, [...(byPageId.get(pageId) ?? []), page]);
  }

  const pageIdDeduped: CanonicalPageVersionInput[] = [];
  for (const pageId of [...byPageId.keys()].sort((left, right) => left.localeCompare(right))) {
    const group = (byPageId.get(pageId) ?? []).sort((left, right) =>
      runtimePageVersionSortKey({ page: left, sourceUrl: input.sourceUrl }).localeCompare(
        runtimePageVersionSortKey({ page: right, sourceUrl: input.sourceUrl }),
      ),
    );
    const winner = group[0];
    if (!winner) continue;
    pageIdDeduped.push(winner);
    if (group.length > 1) {
      deduplicationEntries.push(
        buildRuntimePageVersionDuplicateEntry({
          siteVersionId: input.siteVersionId,
          sourceUrl: input.sourceUrl,
          pages: group,
          winner,
        }),
      );
    }
  }

  const seenFinalPageIds = new Set<string>();
  for (const page of pageIdDeduped) {
    const pageId = String(page.pageId ?? "").trim();
    if (seenFinalPageIds.has(pageId)) {
      throw buildRuntimePageVersionDuplicateError({
        siteVersionId: input.siteVersionId,
        sourceUrl: input.sourceUrl,
        pageId,
        pages: pageIdDeduped.filter((candidate) => String(candidate.pageId ?? "").trim() === pageId),
      });
    }
    seenFinalPageIds.add(pageId);
  }

  const nextImportProvenanceSummary = mergeRuntimePageVersionDeduplication({
    summary: input.importProvenanceSummary,
    entries: deduplicationEntries,
  });
  return {
    pages: pageIdDeduped.sort((left, right) => normalizeRuntimePageVersionIdentityPath(left.path).localeCompare(normalizeRuntimePageVersionIdentityPath(right.path))),
    importProvenanceSummary: nextImportProvenanceSummary,
    deduplicationEntries,
  };
}

function assertNoDuplicateRuntimePageVersions(pages: CanonicalPageVersionInput[]): void {
  const deduped = canonicalizeRuntimePageVersionsForInsert({
    siteVersionId: null,
    sourceUrl: "https://invalid.local/",
    pages,
  });
  if (deduped.deduplicationEntries.length > 0) {
    const entry = deduped.deduplicationEntries[0]!;
    throw new Error(
      [
        "MULTIPAGE_PAGE_VERSION_DUPLICATE",
        `routePath=${entry.routePath}`,
        `pageId=${entry.pageId ?? "unknown"}`,
        `duplicateRoutePaths=${entry.duplicateRoutePaths?.join(",") || "unknown"}`,
        `duplicateSourceUrls=${entry.duplicateSourceUrls.join(",") || "unknown"}`,
        "sourceDocumentPaths=unknown",
      ].join(":"),
    );
  }
}

export async function createSiteVersionFromMigration(
  input: CanonicalSiteMigrationInput & { rendererCompatibilityVersion: string; siteVersionId?: string },
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

    const preallocatedSiteVersionId = typeof input.siteVersionId === "string" ? input.siteVersionId.trim() : "";
    const existingSiteVersion = preallocatedSiteVersionId
      ? await client.query<{ id: string; site_id: string; version_no: number }>(
          `
          select id::text as id, site_id::text as site_id, version_no::int as version_no
          from public.gnr8_runtime_site_versions
          where id = $1::uuid
          limit 1
          `,
          [preallocatedSiteVersionId],
        )
      : { rows: [] };

    let siteVersionId = preallocatedSiteVersionId;
    let versionNo = 0;
    if (existingSiteVersion.rows[0]) {
      if (existingSiteVersion.rows[0].site_id !== input.siteId) {
        throw new Error("RUNTIME_IMPORT_IDENTITY_SITE_VERSION_SITE_MISMATCH");
      }
      siteVersionId = existingSiteVersion.rows[0].id;
      versionNo = existingSiteVersion.rows[0].version_no;
    } else {
      versionNo = await getNextSiteVersionNo(client, input.siteId);
      const siteVersionInsert = await client.query<{ id: string }>(
        `
        insert into public.gnr8_runtime_site_versions (
          id,
          site_id,
          version_no,
          state,
          source,
          actor,
          renderer_compatibility_version,
          import_provenance_summary
        )
        values ($1::uuid, $2::text, $3::int, 'DRAFT', 'migration', $4::text, $5::text, $6::jsonb)
        returning id::text as id
        `,
        [
          preallocatedSiteVersionId || null,
          input.siteId,
          versionNo,
          input.actor,
          input.rendererCompatibilityVersion,
          input.importProvenanceSummary ? JSON.stringify(input.importProvenanceSummary) : null,
        ],
      );
      siteVersionId = siteVersionInsert.rows[0]!.id;
    }

    const canonicalizedPageVersions = canonicalizeRuntimePageVersionsForInsert({
      siteVersionId,
      sourceUrl: input.sourceUrl,
      pages: input.pages,
      importProvenanceSummary: input.importProvenanceSummary,
    });
    const canonicalizedPageById = new Map(canonicalizedPageVersions.pages.map((page) => [page.pageId, page]));
    const canonicalizedPageIds = [...canonicalizedPageById.keys()];
    const existingPageVersionConflicts = canonicalizedPageIds.length > 0
      ? await client.query<{ page_id: string; path: string }>(
          `
          select page_id::text as page_id, path::text as path
          from public.gnr8_runtime_page_versions
          where site_version_id = $1::uuid
            and page_id = any($2::text[])
          order by page_id asc, path asc
          `,
          [siteVersionId, canonicalizedPageIds],
        )
      : { rows: [] };
    const existingConflictEntries = existingPageVersionConflicts.rows.flatMap((row) => {
      const incoming = canonicalizedPageById.get(row.page_id);
      if (!incoming) return [];
      return [
        buildRuntimePageVersionExistingConflictEntry({
          siteVersionId,
          sourceUrl: input.sourceUrl,
          pageId: row.page_id,
          incomingRoutePath: incoming.path,
          existingRoutePath: row.path,
        }),
      ];
    });
    const importProvenanceSummaryForWrite = mergeRuntimePageVersionDeduplication({
      summary: canonicalizedPageVersions.importProvenanceSummary,
      entries: existingConflictEntries,
    });
    if ((canonicalizedPageVersions.deduplicationEntries.length > 0 || existingConflictEntries.length > 0) && importProvenanceSummaryForWrite) {
      await client.query(
        `
        update public.gnr8_runtime_site_versions
        set import_provenance_summary = $2::jsonb, updated_at = now()
        where id = $1::uuid
        `,
        [siteVersionId, JSON.stringify(importProvenanceSummaryForWrite)],
      );
    }

    for (const page of canonicalizedPageVersions.pages) {
      const path = normalizePagePath(page.path);
      await client.query(
        `
        insert into public.gnr8_runtime_pages (id, site_id, path, title)
        values ($1::text, $2::text, $3::text, $4::text)
        on conflict (id)
        do update set
          path = excluded.path,
          title = excluded.title
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
        on conflict (site_version_id, page_id)
        do update set
          path = excluded.path,
          title = excluded.title,
          structure_model = excluded.structure_model,
          content_model = excluded.content_model,
          style_tokens = excluded.style_tokens,
          asset_graph = excluded.asset_graph,
          semantic_signals = excluded.semantic_signals,
          migration_governance = excluded.migration_governance,
          source = excluded.source,
          actor = excluded.actor
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

export async function preallocateSiteVersionIdentity(input: {
  siteId: string;
  siteVersionId: string;
  sourceUrl: string;
  actor: string;
  rendererCompatibilityVersion: string;
  correlationKey: string;
}): Promise<{ siteId: string; siteVersionId: string; versionNo: number; reused: boolean }> {
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

    const existing = await client.query<{ id: string; site_id: string; version_no: number }>(
      `
      select id::text as id, site_id::text as site_id, version_no::int as version_no
      from public.gnr8_runtime_site_versions
      where id = $1::uuid
      limit 1
      `,
      [input.siteVersionId],
    );
    if (existing.rows[0]) {
      if (existing.rows[0].site_id !== input.siteId) {
        throw new Error("RUNTIME_IMPORT_IDENTITY_SITE_VERSION_SITE_MISMATCH");
      }
      return {
        siteId: input.siteId,
        siteVersionId: existing.rows[0].id,
        versionNo: existing.rows[0].version_no,
        reused: true,
      };
    }

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
        import_provenance_summary
      )
      values ($1::uuid, $2::text, $3::int, 'DRAFT', 'migration', $4::text, $5::text, $6::jsonb)
      `,
      [
        input.siteVersionId,
        input.siteId,
        versionNo,
        input.actor,
        input.rendererCompatibilityVersion,
        JSON.stringify({
          kind: "runtime_import_preallocation_v1",
          correlationKey: input.correlationKey,
        }),
      ],
    );
    return {
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      versionNo,
      reused: false,
    };
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

export async function getRuntimeSiteSummary(siteId: string, options: RuntimeStoreDbOptions = {}): Promise<RuntimeSiteSummary | null> {
  return withRuntimeClient(options, async (client) => {
    const res = await client.query<{
      id: string;
      source_url: string;
      source_host: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      select
        id::text as id,
        source_url::text as source_url,
        source_host::text as source_host,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_runtime_sites
      where id = $1::text
      limit 1
      `,
      [siteId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      sourceUrl: row.source_url,
      sourceHost: row.source_host,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function getOwnershipSiteSummary(
  ownershipSiteId: string,
  options: RuntimeStoreDbOptions = {},
): Promise<RuntimeOwnershipSiteSummary | null> {
  return withRuntimeClient(options, async (client) => {
    const res = await client.query<{
      id: string;
      name: string | null;
      status: string | null;
      domain: string | null;
      org_id: string | null;
      agency_id: string | null;
    }>(
      `
      select
        id::text as id,
        name::text as name,
        status::text as status,
        domain::text as domain,
        org_id::text as org_id,
        agency_id::text as agency_id
      from public.sites
      where id = $1::uuid
      limit 1
      `,
      [ownershipSiteId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      domain: row.domain,
      orgId: row.org_id,
      agencyId: row.agency_id,
    };
  });
}

export async function getRuntimeSiteVersionOwnershipSnapshot(
  siteVersionId: string,
  options: RuntimeStoreDbOptions = {},
): Promise<RuntimeSiteVersionOwnershipSnapshot | null> {
  return withRuntimeClient(options, async (client) => {
    const res = await client.query<{
      id: string;
      site_id: string;
      version_no: number;
      state: SiteVersionState;
      artifact_id: string | null;
      ownership_site_id: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      select
        id::text as id,
        site_id::text as site_id,
        version_no::int as version_no,
        state::text as state,
        artifact_id::text as artifact_id,
        ownership_site_id::text as ownership_site_id,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_runtime_site_versions
      where id = $1::uuid
      limit 1
      `,
      [siteVersionId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      siteId: row.site_id,
      versionNo: row.version_no,
      state: row.state,
      artifactId: row.artifact_id,
      ownershipSiteId: row.ownership_site_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function getActiveHostBindingForHost(host: string, options: RuntimeStoreDbOptions = {}): Promise<RuntimeHostBinding | null> {
  const normalizedHost = normalizeRuntimeHost(host);
  if (!normalizedHost) return null;
  return withRuntimeClient(options, async (client) => {
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
      where lower(host) = $1::text
        and status = 'ACTIVE'
      order by updated_at desc, created_at desc
      limit 1
      `,
      [normalizedHost],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      siteId: row.site_id,
      host: row.host,
      status: row.status,
      bindingKind: row.binding_kind,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
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

export async function linkRuntimeSiteVersionOwnershipIfAllowed(input: {
  siteVersionId: string;
  ownershipSiteId: string;
  dbClient?: RuntimeStoreDbClient;
}): Promise<RuntimeSiteVersionOwnershipSnapshot> {
  return withTx(async (client) => {
    const res = await client.query<{
      id: string;
      site_id: string;
      version_no: number;
      state: SiteVersionState;
      artifact_id: string | null;
      ownership_site_id: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      update public.gnr8_runtime_site_versions
      set ownership_site_id = $2::uuid, updated_at = now()
      where id = $1::uuid
        and (ownership_site_id is null or ownership_site_id = $2::uuid)
      returning
        id::text as id,
        site_id::text as site_id,
        version_no::int as version_no,
        state::text as state,
        artifact_id::text as artifact_id,
        ownership_site_id::text as ownership_site_id,
        created_at::text as created_at,
        updated_at::text as updated_at
      `,
      [input.siteVersionId, input.ownershipSiteId],
    );
    const row = res.rows[0];
    if (!row) throw new Error("Runtime site version ownership link denied");
    return {
      id: row.id,
      siteId: row.site_id,
      versionNo: row.version_no,
      state: row.state,
      artifactId: row.artifact_id,
      ownershipSiteId: row.ownership_site_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }, { dbClient: input.dbClient });
}

export async function transferRuntimeHostBinding(input: {
  host: string;
  fromSiteId: string;
  toSiteId: string;
  bindingKind?: RuntimeHostBindingKind | string | null;
  dbClient?: RuntimeStoreDbClient;
}): Promise<{
  host: string;
  fromSiteId: string;
  toSiteId: string;
  transferred: boolean;
  previousBinding: RuntimeHostBinding | null;
  newBinding: RuntimeHostBinding;
}> {
  return withTx(async (client) => {
    const normalizedHost = normalizeRuntimeHost(input.host);
    if (!normalizedHost) throw new Error("Invalid host");

    const siteRes = await client.query<{ id: string }>(
      `select id::text as id from public.gnr8_runtime_sites where id = $1::text limit 1`,
      [input.toSiteId],
    );
    if (!siteRes.rows[0]) throw new Error("Target runtime site not found");

    const activeRes = await client.query<{
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
      where lower(host) = $1::text
        and status = 'ACTIVE'
      order by updated_at desc, created_at desc
      limit 1
      `,
      [normalizedHost],
    );
    const activeRow = activeRes.rows[0];
    if (!activeRow) throw new Error("Active runtime host binding not found");
    if (activeRow.site_id !== input.fromSiteId && activeRow.site_id !== input.toSiteId) {
      throw new Error("Active runtime host binding source mismatch");
    }

    const previousBinding: RuntimeHostBinding = {
      id: activeRow.id,
      siteId: activeRow.site_id,
      host: activeRow.host,
      status: activeRow.status,
      bindingKind: activeRow.binding_kind,
      createdAt: activeRow.created_at,
      updatedAt: activeRow.updated_at,
    };
    const bindingKind = String(input.bindingKind ?? activeRow.binding_kind ?? "shadow").trim() || "shadow";

    if (activeRow.site_id !== input.toSiteId) {
      await client.query(
        `
        update public.gnr8_runtime_host_bindings
        set status = 'INACTIVE', updated_at = now()
        where lower(host) = $1::text
          and status = 'ACTIVE'
          and site_id <> $2::text
        `,
        [normalizedHost, input.toSiteId],
      );
    }

    await client.query(
      `
      insert into public.gnr8_runtime_host_bindings (site_id, host, status, binding_kind)
      values ($1::text, $2::text, 'ACTIVE', $3::text)
      on conflict (site_id, host)
      do update set
        status = 'ACTIVE',
        binding_kind = excluded.binding_kind,
        updated_at = now()
      `,
      [input.toSiteId, normalizedHost, bindingKind],
    );

    const newRes = await client.query<{
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
      where lower(host) = $1::text
        and site_id = $2::text
        and status = 'ACTIVE'
      limit 1
      `,
      [normalizedHost, input.toSiteId],
    );
    const newRow = newRes.rows[0];
    if (!newRow) throw new Error("Runtime host binding transfer verification failed");

    return {
      host: normalizedHost,
      fromSiteId: input.fromSiteId,
      toSiteId: input.toSiteId,
      transferred: activeRow.site_id !== input.toSiteId,
      previousBinding,
      newBinding: {
        id: newRow.id,
        siteId: newRow.site_id,
        host: newRow.host,
        status: newRow.status,
        bindingKind: newRow.binding_kind,
        createdAt: newRow.created_at,
        updatedAt: newRow.updated_at,
      },
    };
  }, { dbClient: input.dbClient });
}

export async function upsertDomainHostBinding(input: {
  siteId: string;
  siteVersionId: string;
  domain: string;
  status: RuntimeDomainHostBindingStatus;
  domainType?: RuntimeDomainType | null;
  verificationType?: RuntimeDomainVerificationType | null;
  verificationValue?: string | null;
  verificationHost?: string | null;
  dnsRecordType?: RuntimeDomainDnsRecordType | null;
  dnsRecordHost?: string | null;
  dnsRecordValue?: string | null;
  dnsRecordPurpose?: RuntimeDomainDnsRecordPurpose | null;
  dnsInstructions?: RuntimeDomainDnsInstruction[] | null;
  lastCheckedAt?: string | null;
  vercelDomainId?: string | null;
}): Promise<RuntimeDomainHostBinding> {
  return withTx(async (client) => {
    const normalizedDomain = normalizeRuntimeDomain(input.domain);
    if (!normalizedDomain) throw new Error("Invalid domain");

    const siteVersionRes = await client.query<{ site_id: string }>(
      `
      select site_id::text as site_id
      from public.gnr8_runtime_site_versions
      where id = $1::uuid
      limit 1
      `,
      [input.siteVersionId],
    );
    const siteVersion = siteVersionRes.rows[0];
    if (!siteVersion) throw new Error("Runtime site version not found");
    if (siteVersion.site_id !== input.siteId) {
      throw new Error("Runtime site version does not belong to runtime site");
    }

    const conflictingDomain = await client.query<{ site_id: string }>(
      `
      select site_id::text as site_id
      from public.gnr8_runtime_domain_host_bindings
      where lower(domain) = $1::text
        and site_id <> $2::text
      limit 1
      `,
      [normalizedDomain, input.siteId],
    );
    if (conflictingDomain.rows[0]) {
      throw new Error("DOMAIN_ALREADY_BOUND_TO_ANOTHER_SITE");
    }

    const result = await client.query<{
      id: string;
      site_id: string;
      site_version_id: string;
      domain: string;
      status: RuntimeDomainHostBindingStatus;
      domain_type: RuntimeDomainType | null;
      verification_type: RuntimeDomainVerificationType | null;
      verification_value: string | null;
      verification_host: string | null;
      dns_record_type: RuntimeDomainDnsRecordType | null;
      dns_record_host: string | null;
      dns_record_value: string | null;
      dns_record_purpose: RuntimeDomainDnsRecordPurpose | null;
      dns_instructions_json: unknown;
      last_checked_at: string | null;
      vercel_domain_id: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      insert into public.gnr8_runtime_domain_host_bindings (
        site_id,
        site_version_id,
        domain,
        status,
        domain_type,
        verification_type,
        verification_value,
        verification_host,
        dns_record_type,
        dns_record_host,
        dns_record_value,
        dns_record_purpose,
        dns_instructions_json,
        last_checked_at,
        vercel_domain_id
      )
      values (
        $1::text,
        $2::uuid,
        $3::text,
        $4::text,
        $5::text,
        $6::text,
        $7::text,
        $8::text,
        $9::text,
        $10::text,
        $11::text,
        $12::text,
        $13::jsonb,
        $14::timestamptz,
        $15::text
      )
      on conflict (site_id, domain)
      do update set
        site_version_id = excluded.site_version_id,
        status = excluded.status,
        domain_type = excluded.domain_type,
        verification_type = excluded.verification_type,
        verification_value = excluded.verification_value,
        verification_host = excluded.verification_host,
        dns_record_type = excluded.dns_record_type,
        dns_record_host = excluded.dns_record_host,
        dns_record_value = excluded.dns_record_value,
        dns_record_purpose = excluded.dns_record_purpose,
        dns_instructions_json = excluded.dns_instructions_json,
        last_checked_at = excluded.last_checked_at,
        vercel_domain_id = excluded.vercel_domain_id,
        updated_at = now()
      returning
        id::text as id,
        site_id::text as site_id,
        site_version_id::text as site_version_id,
        domain::text as domain,
        status::text as status,
        domain_type::text as domain_type,
        verification_type::text as verification_type,
        verification_value::text as verification_value,
        verification_host::text as verification_host,
        dns_record_type::text as dns_record_type,
        dns_record_host::text as dns_record_host,
        dns_record_value::text as dns_record_value,
        dns_record_purpose::text as dns_record_purpose,
        dns_instructions_json as dns_instructions_json,
        last_checked_at::text as last_checked_at,
        vercel_domain_id::text as vercel_domain_id,
        created_at::text as created_at,
        updated_at::text as updated_at
      `,
      [
        input.siteId,
        input.siteVersionId,
        normalizedDomain,
        input.status,
        input.domainType ?? null,
        input.verificationType ?? null,
        input.verificationValue ?? null,
        input.verificationHost ?? null,
        input.dnsRecordType ?? null,
        input.dnsRecordHost ?? null,
        input.dnsRecordValue ?? null,
        input.dnsRecordPurpose ?? null,
        input.dnsInstructions ? JSON.stringify(input.dnsInstructions) : null,
        input.lastCheckedAt ?? null,
        input.vercelDomainId ?? null,
      ],
    );

    const row = result.rows[0];
    if (!row) throw new Error("Failed to upsert domain host binding");
    return {
      id: row.id,
      siteId: row.site_id,
      siteVersionId: row.site_version_id,
      domain: row.domain,
      status: row.status,
      domainType: row.domain_type,
      verificationType: row.verification_type,
      verificationValue: row.verification_value,
      verificationHost: row.verification_host,
      dnsRecordType: row.dns_record_type,
      dnsRecordHost: row.dns_record_host,
      dnsRecordValue: row.dns_record_value,
      dnsRecordPurpose: row.dns_record_purpose,
      dnsInstructions: parseRuntimeDomainDnsInstructions(row.dns_instructions_json),
      lastCheckedAt: row.last_checked_at,
      vercelDomainId: row.vercel_domain_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function updateDomainHostBindingById(input: {
  bindingId: string;
  siteVersionId?: string;
  status: RuntimeDomainHostBindingStatus;
  domainType?: RuntimeDomainType | null;
  verificationType?: RuntimeDomainVerificationType | null;
  verificationValue?: string | null;
  verificationHost?: string | null;
  dnsRecordType?: RuntimeDomainDnsRecordType | null;
  dnsRecordHost?: string | null;
  dnsRecordValue?: string | null;
  dnsRecordPurpose?: RuntimeDomainDnsRecordPurpose | null;
  dnsInstructions?: RuntimeDomainDnsInstruction[] | null;
  lastCheckedAt?: string | null;
  vercelDomainId?: string | null;
}): Promise<RuntimeDomainHostBinding | null> {
  return withTx(async (client) => {
    const result = await client.query<{
      id: string;
      site_id: string;
      site_version_id: string;
      domain: string;
      status: RuntimeDomainHostBindingStatus;
      domain_type: RuntimeDomainType | null;
      verification_type: RuntimeDomainVerificationType | null;
      verification_value: string | null;
      verification_host: string | null;
      dns_record_type: RuntimeDomainDnsRecordType | null;
      dns_record_host: string | null;
      dns_record_value: string | null;
      dns_record_purpose: RuntimeDomainDnsRecordPurpose | null;
      dns_instructions_json: unknown;
      last_checked_at: string | null;
      vercel_domain_id: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      update public.gnr8_runtime_domain_host_bindings
      set
        status = $2::text,
        site_version_id = coalesce($3::uuid, site_version_id),
        domain_type = coalesce($4::text, domain_type),
        verification_type = coalesce($5::text, verification_type),
        verification_value = coalesce($6::text, verification_value),
        verification_host = coalesce($7::text, verification_host),
        dns_record_type = coalesce($8::text, dns_record_type),
        dns_record_host = coalesce($9::text, dns_record_host),
        dns_record_value = coalesce($10::text, dns_record_value),
        dns_record_purpose = coalesce($11::text, dns_record_purpose),
        dns_instructions_json = coalesce($12::jsonb, dns_instructions_json),
        last_checked_at = coalesce($13::timestamptz, last_checked_at),
        vercel_domain_id = coalesce($14::text, vercel_domain_id),
        updated_at = now()
      where id = $1::uuid
      returning
        id::text as id,
        site_id::text as site_id,
        site_version_id::text as site_version_id,
        domain::text as domain,
        status::text as status,
        domain_type::text as domain_type,
        verification_type::text as verification_type,
        verification_value::text as verification_value,
        verification_host::text as verification_host,
        dns_record_type::text as dns_record_type,
        dns_record_host::text as dns_record_host,
        dns_record_value::text as dns_record_value,
        dns_record_purpose::text as dns_record_purpose,
        dns_instructions_json as dns_instructions_json,
        last_checked_at::text as last_checked_at,
        vercel_domain_id::text as vercel_domain_id,
        created_at::text as created_at,
        updated_at::text as updated_at
      `,
      [
        input.bindingId,
        input.status,
        input.siteVersionId ?? null,
        input.domainType ?? null,
        input.verificationType ?? null,
        input.verificationValue ?? null,
        input.verificationHost ?? null,
        input.dnsRecordType ?? null,
        input.dnsRecordHost ?? null,
        input.dnsRecordValue ?? null,
        input.dnsRecordPurpose ?? null,
        input.dnsInstructions ? JSON.stringify(input.dnsInstructions) : null,
        input.lastCheckedAt ?? null,
        input.vercelDomainId ?? null,
      ],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      siteId: row.site_id,
      siteVersionId: row.site_version_id,
      domain: row.domain,
      status: row.status,
      domainType: row.domain_type,
      verificationType: row.verification_type,
      verificationValue: row.verification_value,
      verificationHost: row.verification_host,
      dnsRecordType: row.dns_record_type,
      dnsRecordHost: row.dns_record_host,
      dnsRecordValue: row.dns_record_value,
      dnsRecordPurpose: row.dns_record_purpose,
      dnsInstructions: parseRuntimeDomainDnsInstructions(row.dns_instructions_json),
      lastCheckedAt: row.last_checked_at,
      vercelDomainId: row.vercel_domain_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

export async function listDomainHostBindingsForSite(input: {
  siteId: string;
  statuses?: RuntimeDomainHostBindingStatus[];
}): Promise<RuntimeDomainHostBinding[]> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const normalizedStatuses = (input.statuses ?? []).filter(Boolean);
    const result = await client.query<{
      id: string;
      site_id: string;
      site_version_id: string;
      domain: string;
      status: RuntimeDomainHostBindingStatus;
      domain_type: RuntimeDomainType | null;
      verification_type: RuntimeDomainVerificationType | null;
      verification_value: string | null;
      verification_host: string | null;
      dns_record_type: RuntimeDomainDnsRecordType | null;
      dns_record_host: string | null;
      dns_record_value: string | null;
      dns_record_purpose: RuntimeDomainDnsRecordPurpose | null;
      dns_instructions_json: unknown;
      last_checked_at: string | null;
      vercel_domain_id: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      select
        id::text as id,
        site_id::text as site_id,
        site_version_id::text as site_version_id,
        domain::text as domain,
        status::text as status,
        domain_type::text as domain_type,
        verification_type::text as verification_type,
        verification_value::text as verification_value,
        verification_host::text as verification_host,
        dns_record_type::text as dns_record_type,
        dns_record_host::text as dns_record_host,
        dns_record_value::text as dns_record_value,
        dns_record_purpose::text as dns_record_purpose,
        dns_instructions_json as dns_instructions_json,
        last_checked_at::text as last_checked_at,
        vercel_domain_id::text as vercel_domain_id,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_runtime_domain_host_bindings
      where site_id = $1::text
        and ($2::text[] is null or status = any($2::text[]))
      order by updated_at desc, created_at desc
      `,
      [input.siteId, normalizedStatuses.length > 0 ? normalizedStatuses : null],
    );
    return result.rows.map((row) => ({
      id: row.id,
      siteId: row.site_id,
      siteVersionId: row.site_version_id,
      domain: row.domain,
      status: row.status,
      domainType: row.domain_type,
      verificationType: row.verification_type,
      verificationValue: row.verification_value,
      verificationHost: row.verification_host,
      dnsRecordType: row.dns_record_type,
      dnsRecordHost: row.dns_record_host,
      dnsRecordValue: row.dns_record_value,
      dnsRecordPurpose: row.dns_record_purpose,
      dnsInstructions: parseRuntimeDomainDnsInstructions(row.dns_instructions_json),
      lastCheckedAt: row.last_checked_at,
      vercelDomainId: row.vercel_domain_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } finally {
    client.release();
  }
}

export async function listDomainHostBindingsForVerification(input?: {
  statuses?: RuntimeDomainHostBindingStatus[];
  limit?: number;
}): Promise<RuntimeDomainHostBinding[]> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const normalizedStatuses = (input?.statuses ?? ["pending", "verifying"]).filter(Boolean);
    const normalizedLimit = Math.max(1, Math.min(500, Number(input?.limit ?? 50) || 50));
    const result = await client.query<{
      id: string;
      site_id: string;
      site_version_id: string;
      domain: string;
      status: RuntimeDomainHostBindingStatus;
      domain_type: RuntimeDomainType | null;
      verification_type: RuntimeDomainVerificationType | null;
      verification_value: string | null;
      verification_host: string | null;
      dns_record_type: RuntimeDomainDnsRecordType | null;
      dns_record_host: string | null;
      dns_record_value: string | null;
      dns_record_purpose: RuntimeDomainDnsRecordPurpose | null;
      dns_instructions_json: unknown;
      last_checked_at: string | null;
      vercel_domain_id: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `
      select
        id::text as id,
        site_id::text as site_id,
        site_version_id::text as site_version_id,
        domain::text as domain,
        status::text as status,
        domain_type::text as domain_type,
        verification_type::text as verification_type,
        verification_value::text as verification_value,
        verification_host::text as verification_host,
        dns_record_type::text as dns_record_type,
        dns_record_host::text as dns_record_host,
        dns_record_value::text as dns_record_value,
        dns_record_purpose::text as dns_record_purpose,
        dns_instructions_json as dns_instructions_json,
        last_checked_at::text as last_checked_at,
        vercel_domain_id::text as vercel_domain_id,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_runtime_domain_host_bindings
      where ($1::text[] is null or status = any($1::text[]))
      order by coalesce(last_checked_at, created_at) asc, updated_at asc
      limit $2::int
      `,
      [normalizedStatuses.length > 0 ? normalizedStatuses : null, normalizedLimit],
    );
    return result.rows.map((row) => ({
      id: row.id,
      siteId: row.site_id,
      siteVersionId: row.site_version_id,
      domain: row.domain,
      status: row.status,
      domainType: row.domain_type,
      verificationType: row.verification_type,
      verificationValue: row.verification_value,
      verificationHost: row.verification_host,
      dnsRecordType: row.dns_record_type,
      dnsRecordHost: row.dns_record_host,
      dnsRecordValue: row.dns_record_value,
      dnsRecordPurpose: row.dns_record_purpose,
      dnsInstructions: parseRuntimeDomainDnsInstructions(row.dns_instructions_json),
      lastCheckedAt: row.last_checked_at,
      vercelDomainId: row.vercel_domain_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } finally {
    client.release();
  }
}

export async function countNonActiveDomainHostBindingsForSite(siteId: string): Promise<number> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const result = await client.query<{ count: string }>(
      `
      select count(*)::text as count
      from public.gnr8_runtime_domain_host_bindings
      where site_id = $1::text
        and status <> 'active'
      `,
      [siteId],
    );
    return Number(result.rows[0]?.count ?? "0");
  } finally {
    client.release();
  }
}

export async function activateDomainHostBindingsForSiteVersion(input: {
  siteId: string;
  siteVersionId: string;
}): Promise<number> {
  return withTx(async (client) => {
    const update = await client.query(
      `
      update public.gnr8_runtime_domain_host_bindings
      set site_version_id = $2::uuid, status = 'active', updated_at = now()
      where site_id = $1::text and status = 'active'
      `,
      [input.siteId, input.siteVersionId],
    );
    return update.rowCount ?? 0;
  });
}

export type RuntimeDomainSiteResolution =
  | {
      outcome: "domain_hit";
      host: string;
      siteId: string;
      siteVersionId: string;
      legacyDomainSiteVersionId: string;
      domain: string;
      status: RuntimeDomainHostBindingStatus;
      bindingId: string;
      diagnostics: RuntimeActiveServingDiagnostic[];
    }
  | {
      outcome: "domain_miss";
      host: string;
      reasonCode: "domain_not_found";
    };

export type RuntimeSiteResolutionCandidate = {
  siteVersionId: string;
  versionNo: number;
  state: SiteVersionState;
  createdAt: string;
  artifactId: string | null;
};

export type RuntimeSiteDomainReadinessBindingCandidate = {
  host: string;
  source: "runtime_host_binding" | "runtime_domain_binding";
  status: string | null;
  isInternalHost: boolean;
  isActive: boolean;
};

export type RuntimeSiteDomainReadinessBinding = {
  siteId: string;
  canonicalSlug?: string;
  primaryHost: string | null;
  internalPreviewHost: string | null;
  customDomains: string[];
  activeDomainBindingHost: string | null;
  domainBindingCandidates: RuntimeSiteDomainReadinessBindingCandidate[];
};

export type RuntimeSiteResolutionBinding = {
  siteId: string;
  canonicalSlug?: string;
  activeSiteVersionId: string | null;
  latestImportedSiteVersionId: string | null;
  publishedSiteVersionId?: string;
  previewSiteVersionId?: string;
  candidateSiteVersions: RuntimeSiteResolutionCandidate[];
};

export type RuntimeActiveServingDiagnostic = {
  code: "CUSTOM_DOMAIN_VERSION_DIVERGENCE_DETECTED";
  domain: string;
  legacyDomainSiteVersionId: string;
  activePointerSiteVersionId: string;
};

type RuntimeActiveServingResolutionKind = "host_match" | "domain_match" | "fallback_latest_site";

export type RuntimeActiveServingMissReasonCode = "no_runtime_site" | "no_active_pointer" | "active_artifact_missing";

export type RuntimeActiveServingArtifactResolution =
  | {
      outcome: "active_serving_hit";
      host: string;
      path: string;
      normalizedPath: string;
      siteId: string;
      ownershipSiteId?: string | null;
      siteResolution: RuntimeActiveServingResolutionKind;
      sourceUrl: string;
      sourceHost: string | null;
      hostBindingId: string | null;
      hostBindingKind: string | null;
      hostBindingStatus: RuntimeHostBindingStatus | null;
      domain: string | null;
      domainBindingId: string | null;
      domainBindingStatus: RuntimeDomainHostBindingStatus | null;
      legacyDomainSiteVersionId: string | null;
      activeSiteVersionId: string;
      artifactId: string;
      artifact: RuntimeArtifact;
      diagnostics: RuntimeActiveServingDiagnostic[];
    }
  | {
      outcome: "active_serving_miss";
      host: string;
      path: string;
      normalizedPath: string;
      siteId: string | null;
      ownershipSiteId?: string | null;
      siteResolution: RuntimeActiveServingResolutionKind | "none";
      sourceUrl: string | null;
      sourceHost: string | null;
      hostBindingId: string | null;
      hostBindingKind: string | null;
      hostBindingStatus: RuntimeHostBindingStatus | null;
      domain: string | null;
      domainBindingId: string | null;
      domainBindingStatus: RuntimeDomainHostBindingStatus | null;
      legacyDomainSiteVersionId: string | null;
      activeSiteVersionId: string | null;
      artifactId: string | null;
      reasonCode: RuntimeActiveServingMissReasonCode;
      diagnostics: RuntimeActiveServingDiagnostic[];
    };

type RuntimeSiteResolutionBindingVersionRow = {
  id: string;
  version_no: number;
  state: SiteVersionState;
  created_at: string;
  artifact_id: string | null;
};

type RuntimeSiteDomainReadinessBindingHostRow = {
  host: string;
  status: RuntimeHostBindingStatus;
};

type RuntimeSiteDomainReadinessBindingDomainRow = {
  domain: string;
  status: RuntimeDomainHostBindingStatus;
};

function inferCanonicalSlug(input: { domain: string | null; sourceHost: string | null }): string | undefined {
  const host = String(input.domain ?? input.sourceHost ?? "").trim().toLowerCase();
  if (!host) return undefined;
  const firstLabel = host.split(".")[0]?.trim() ?? "";
  if (!firstLabel) return undefined;
  if (!/^[a-z0-9-]+$/.test(firstLabel)) return undefined;
  return firstLabel;
}

function sortResolutionCandidates(a: RuntimeSiteResolutionCandidate, b: RuntimeSiteResolutionCandidate): number {
  if (a.versionNo !== b.versionNo) return a.versionNo - b.versionNo;
  const createdDiff = a.createdAt.localeCompare(b.createdAt);
  if (createdDiff !== 0) return createdDiff;
  return a.siteVersionId.localeCompare(b.siteVersionId);
}

function sortDomainReadinessCandidates(
  a: RuntimeSiteDomainReadinessBindingCandidate,
  b: RuntimeSiteDomainReadinessBindingCandidate,
): number {
  const hostDiff = a.host.localeCompare(b.host);
  if (hostDiff !== 0) return hostDiff;
  const sourceDiff = a.source.localeCompare(b.source);
  if (sourceDiff !== 0) return sourceDiff;
  return String(a.status ?? "").localeCompare(String(b.status ?? ""));
}

export function mapRuntimeSiteDomainReadinessBindingRows(input: {
  siteId: string;
  sourceHost: string | null;
  hostBindingRows: RuntimeSiteDomainReadinessBindingHostRow[];
  domainBindingRows: RuntimeSiteDomainReadinessBindingDomainRow[];
}): RuntimeSiteDomainReadinessBinding {
  const normalizedPrimaryHost = normalizeRuntimeHost(String(input.sourceHost ?? ""));
  const primaryHost = normalizedPrimaryHost || null;
  const domainRows = [...input.domainBindingRows].sort((a, b) => {
    const domainDiff = normalizeRuntimeDomain(a.domain).localeCompare(normalizeRuntimeDomain(b.domain));
    if (domainDiff !== 0) return domainDiff;
    return a.status.localeCompare(b.status);
  });
  const customDomains = [...new Set(domainRows.map((row) => normalizeRuntimeDomain(row.domain)).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );

  const hostRows = [...input.hostBindingRows].sort((a, b) => {
    const hostDiff = normalizeRuntimeHost(a.host).localeCompare(normalizeRuntimeHost(b.host));
    if (hostDiff !== 0) return hostDiff;
    return a.status.localeCompare(b.status);
  });
  const internalPreviewHost =
    hostRows
      .map((row) => ({ host: normalizeRuntimeHost(row.host), status: row.status }))
      .find((row) => row.host.length > 0 && row.status === "ACTIVE")?.host ?? null;

  const domainBindingCandidates = [
    ...hostRows
      .map((row) => ({ host: normalizeRuntimeHost(row.host), status: row.status }))
      .filter((row) => row.host.length > 0)
      .map((row) => ({
        host: row.host,
        source: "runtime_host_binding" as const,
        status: row.status,
        isInternalHost: true,
        isActive: row.status === "ACTIVE",
      })),
    ...domainRows.map((row) => ({
      host: normalizeRuntimeDomain(row.domain),
      source: "runtime_domain_binding" as const,
      status: row.status,
      isInternalHost: false,
      isActive: row.status === "active",
    })),
  ]
    .filter((candidate) => candidate.host.length > 0)
    .sort(sortDomainReadinessCandidates);

  const activeDomainBindingHost =
    domainBindingCandidates.find((candidate) => candidate.source === "runtime_domain_binding" && candidate.isActive)?.host ??
    domainBindingCandidates.find((candidate) => candidate.isActive)?.host ??
    null;

  return {
    siteId: input.siteId,
    canonicalSlug: inferCanonicalSlug({
      domain: customDomains[0] ?? null,
      sourceHost: primaryHost,
    }),
    primaryHost,
    internalPreviewHost,
    customDomains,
    activeDomainBindingHost,
    domainBindingCandidates,
  };
}

export function mapRuntimeSiteResolutionBindingRows(input: {
  siteId: string;
  sourceHost: string | null;
  domain: string | null;
  activeSiteVersionId: string | null;
  versionRows: RuntimeSiteResolutionBindingVersionRow[];
}): RuntimeSiteResolutionBinding {
  const candidateSiteVersions: RuntimeSiteResolutionCandidate[] = input.versionRows
    .map((row) => ({
      siteVersionId: row.id,
      versionNo: row.version_no,
      state: row.state,
      createdAt: row.created_at,
      artifactId: row.artifact_id,
    }))
    .sort(sortResolutionCandidates);

  const latestImported = candidateSiteVersions[candidateSiteVersions.length - 1]?.siteVersionId ?? null;
  const publishedCandidates = candidateSiteVersions.filter((candidate) => candidate.state === "PUBLISHED");
  const publishedSiteVersionId = publishedCandidates[publishedCandidates.length - 1]?.siteVersionId;
  const previewCandidates = candidateSiteVersions.filter(
    (candidate) => candidate.state !== "PUBLISHED" && candidate.state !== "ARCHIVED",
  );
  const previewSiteVersionId =
    previewCandidates.length > 0 ? previewCandidates[previewCandidates.length - 1]?.siteVersionId : undefined;

  return {
    siteId: input.siteId,
    canonicalSlug: inferCanonicalSlug({
      domain: input.domain,
      sourceHost: input.sourceHost,
    }),
    activeSiteVersionId: input.activeSiteVersionId,
    latestImportedSiteVersionId: latestImported,
    publishedSiteVersionId,
    previewSiteVersionId,
    candidateSiteVersions,
  };
}

export async function getRuntimeSiteResolutionBinding(siteId: string): Promise<RuntimeSiteResolutionBinding | null> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const siteRes = await client.query<{ source_host: string | null }>(
      `
      select source_host::text as source_host
      from public.gnr8_runtime_sites
      where id = $1::text
      limit 1
      `,
      [siteId],
    );
    if (!siteRes.rows[0]) return null;

    const [activePointer, domainBindingRes, versionsRes] = await Promise.all([
      client.query<{ active_site_version_id: string }>(
        `
        select active_site_version_id::text as active_site_version_id
        from public.gnr8_runtime_active_pointers
        where site_id = $1::text
        limit 1
        `,
        [siteId],
      ),
      client.query<{ domain: string }>(
        `
        select domain::text as domain
        from public.gnr8_runtime_domain_host_bindings
        where site_id = $1::text and status = 'active'
        order by updated_at desc, created_at desc
        limit 1
        `,
        [siteId],
      ),
      client.query<RuntimeSiteResolutionBindingVersionRow>(
        `
        select
          id::text as id,
          version_no::int as version_no,
          state::text as state,
          created_at::text as created_at,
          artifact_id::text as artifact_id
        from public.gnr8_runtime_site_versions
        where site_id = $1::text
        order by version_no asc, created_at asc, id asc
        `,
        [siteId],
      ),
    ]);

    return mapRuntimeSiteResolutionBindingRows({
      siteId,
      sourceHost: siteRes.rows[0].source_host,
      domain: domainBindingRes.rows[0]?.domain ?? null,
      activeSiteVersionId: activePointer.rows[0]?.active_site_version_id ?? null,
      versionRows: versionsRes.rows,
    });
  } finally {
    client.release();
  }
}

export type RuntimeHostingOperationsSiteIdentity =
  | {
      requestedSiteId: string;
      runtimeSiteId: string;
      lookupMode: "runtime_site_id" | "ownership_site_id";
      expectedIdentifier: "ownership_site_id_or_runtime_site_id";
    }
  | {
      requestedSiteId: string;
      runtimeSiteId: null;
      lookupMode: "not_found";
      expectedIdentifier: "ownership_site_id_or_runtime_site_id";
    };

export async function resolveRuntimeHostingOperationsSiteIdentity(
  siteId: string,
): Promise<RuntimeHostingOperationsSiteIdentity> {
  await ensureRuntimeTables();
  const requestedSiteId = String(siteId ?? "").trim();
  if (!requestedSiteId) {
    return {
      requestedSiteId,
      runtimeSiteId: null,
      lookupMode: "not_found",
      expectedIdentifier: "ownership_site_id_or_runtime_site_id",
    };
  }

  const client = await getSuperadminPool().connect();
  try {
    const directSite = await client.query<{ runtime_site_id: string }>(
      `
      select id::text as runtime_site_id
      from public.gnr8_runtime_sites
      where id = $1::text
      limit 1
      `,
      [requestedSiteId],
    );
    const directRow = directSite.rows[0];
    if (directRow) {
      return {
        requestedSiteId,
        runtimeSiteId: directRow.runtime_site_id,
        lookupMode: "runtime_site_id",
        expectedIdentifier: "ownership_site_id_or_runtime_site_id",
      };
    }

    const ownershipColumn = await client.query<{ exists: boolean }>(
      `
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'gnr8_runtime_site_versions'
          and column_name = 'ownership_site_id'
      ) as exists
      `,
    );

    if (!ownershipColumn.rows[0]?.exists) {
      return {
        requestedSiteId,
        runtimeSiteId: null,
        lookupMode: "not_found",
        expectedIdentifier: "ownership_site_id_or_runtime_site_id",
      };
    }

    const ownershipSite = await client.query<{ runtime_site_id: string }>(
      `
      select site_id::text as runtime_site_id
      from public.gnr8_runtime_site_versions
      where ownership_site_id::text = $1::text
      order by
        case when state = 'PUBLISHED' then 0 else 1 end,
        version_no desc,
        updated_at desc,
        created_at desc,
        id::text desc
      limit 1
      `,
      [requestedSiteId],
    );

    const row = ownershipSite.rows[0];
    if (!row) {
      return {
        requestedSiteId,
        runtimeSiteId: null,
        lookupMode: "not_found",
        expectedIdentifier: "ownership_site_id_or_runtime_site_id",
      };
    }

    return {
      requestedSiteId,
      runtimeSiteId: row.runtime_site_id,
      lookupMode: "ownership_site_id",
      expectedIdentifier: "ownership_site_id_or_runtime_site_id",
    };
  } finally {
    client.release();
  }
}

export async function getRuntimeSiteDomainReadinessBinding(siteId: string): Promise<RuntimeSiteDomainReadinessBinding | null> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const siteRes = await client.query<{ source_host: string | null }>(
      `
      select source_host::text as source_host
      from public.gnr8_runtime_sites
      where id = $1::text
      limit 1
      `,
      [siteId],
    );
    if (!siteRes.rows[0]) return null;

    const [hostBindingsRes, domainBindingsRes] = await Promise.all([
      client.query<RuntimeSiteDomainReadinessBindingHostRow>(
        `
        select
          host::text as host,
          status::text as status
        from public.gnr8_runtime_host_bindings
        where site_id = $1::text
        `,
        [siteId],
      ),
      client.query<RuntimeSiteDomainReadinessBindingDomainRow>(
        `
        select
          domain::text as domain,
          status::text as status
        from public.gnr8_runtime_domain_host_bindings
        where site_id = $1::text
        `,
        [siteId],
      ),
    ]);

    return mapRuntimeSiteDomainReadinessBindingRows({
      siteId,
      sourceHost: siteRes.rows[0].source_host,
      hostBindingRows: hostBindingsRes.rows,
      domainBindingRows: domainBindingsRes.rows,
    });
  } finally {
    client.release();
  }
}

function buildCustomDomainVersionDivergenceDiagnostics(input: {
  domain: string | null;
  legacyDomainSiteVersionId: string | null;
  activePointerSiteVersionId: string | null;
}): RuntimeActiveServingDiagnostic[] {
  const domain = String(input.domain ?? "").trim();
  const legacyDomainSiteVersionId = String(input.legacyDomainSiteVersionId ?? "").trim();
  const activePointerSiteVersionId = String(input.activePointerSiteVersionId ?? "").trim();
  if (!domain || !legacyDomainSiteVersionId || !activePointerSiteVersionId) return [];
  if (legacyDomainSiteVersionId === activePointerSiteVersionId) return [];
  return [
    {
      code: "CUSTOM_DOMAIN_VERSION_DIVERGENCE_DETECTED",
      domain,
      legacyDomainSiteVersionId,
      activePointerSiteVersionId,
    },
  ];
}

export async function resolveActiveServingArtifactForHostAndPath(input: {
  host?: string | null;
  path: string;
  dbClient?: RuntimeStoreDbClient;
}): Promise<RuntimeActiveServingArtifactResolution> {
  return withRuntimeClient({ dbClient: input.dbClient }, async (client) => {
    const host = normalizeRuntimeHost(String(input.host ?? ""));
    const normalizedPath = normalizePagePath(input.path);

    const pointerRes = await client.query<{
      site_id: string;
      ownership_site_id: string | null;
      site_resolution: RuntimeActiveServingResolutionKind;
      source_url: string | null;
      source_host: string | null;
      host_binding_id: string | null;
      host_binding_kind: string | null;
      host_binding_status: RuntimeHostBindingStatus | null;
      domain: string | null;
      domain_binding_id: string | null;
      domain_binding_status: RuntimeDomainHostBindingStatus | null;
      legacy_domain_site_version_id: string | null;
      active_site_version_id: string | null;
      artifact_id: string | null;
    }>(
      `
      with host_site as (
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
      ), domain_site as (
        select
          d.id::text as domain_binding_id,
          d.site_id::text as site_id,
          d.site_version_id::text as legacy_domain_site_version_id,
          d.domain::text as domain,
          d.status::text as domain_binding_status
        from public.gnr8_runtime_domain_host_bindings d
        where lower(d.domain) = $1::text
          and d.status = 'active'
        order by d.updated_at desc, d.created_at desc
        limit 1
      ), fallback_site as (
        select id::text as site_id from public.gnr8_runtime_sites order by created_at desc limit 1
      ), resolved_site as (
        select
          site_id,
          'host_match'::text as site_resolution,
          host_binding_id,
          host_binding_kind,
          host_binding_status,
          null::text as domain,
          null::text as domain_binding_id,
          null::text as domain_binding_status,
          null::text as legacy_domain_site_version_id
        from host_site
        union all
        select
          site_id,
          'domain_match'::text as site_resolution,
          null::text as host_binding_id,
          null::text as host_binding_kind,
          null::text as host_binding_status,
          domain,
          domain_binding_id,
          domain_binding_status,
          legacy_domain_site_version_id
        from domain_site
        where not exists (select 1 from host_site)
        union all
        select
          site_id,
          'fallback_latest_site'::text as site_resolution,
          null::text as host_binding_id,
          null::text as host_binding_kind,
          null::text as host_binding_status,
          null::text as domain,
          null::text as domain_binding_id,
          null::text as domain_binding_status,
          null::text as legacy_domain_site_version_id
        from fallback_site
        where not exists (select 1 from host_site)
          and not exists (select 1 from domain_site)
      )
      select
        s.site_id::text as site_id,
        s.site_resolution::text as site_resolution,
        s.host_binding_id::text as host_binding_id,
        s.host_binding_kind::text as host_binding_kind,
        s.host_binding_status::text as host_binding_status,
        s.domain::text as domain,
        s.domain_binding_id::text as domain_binding_id,
        s.domain_binding_status::text as domain_binding_status,
        s.legacy_domain_site_version_id::text as legacy_domain_site_version_id,
        rs.source_url::text as source_url,
        rs.source_host::text as source_host,
        sv.ownership_site_id::text as ownership_site_id,
        p.active_site_version_id::text as active_site_version_id,
        p.active_artifact_id::text as artifact_id
      from resolved_site s
      join public.gnr8_runtime_sites rs on rs.id = s.site_id
      left join public.gnr8_runtime_active_pointers p on p.site_id = s.site_id
      left join public.gnr8_runtime_site_versions sv on sv.id = p.active_site_version_id
      limit 1
      `,
      [host],
    );

    const pointerRow = pointerRes.rows[0];
    if (!pointerRow) {
      return {
        outcome: "active_serving_miss",
        host,
        path: input.path,
        normalizedPath,
        siteId: null,
        ownershipSiteId: null,
        siteResolution: "none",
        sourceUrl: null,
        sourceHost: null,
        hostBindingId: null,
        hostBindingKind: null,
        hostBindingStatus: null,
        domain: null,
        domainBindingId: null,
        domainBindingStatus: null,
        legacyDomainSiteVersionId: null,
        activeSiteVersionId: null,
        artifactId: null,
        reasonCode: "no_runtime_site",
        diagnostics: [],
      };
    }

    const diagnostics = buildCustomDomainVersionDivergenceDiagnostics({
      domain: pointerRow.domain,
      legacyDomainSiteVersionId: pointerRow.legacy_domain_site_version_id,
      activePointerSiteVersionId: pointerRow.active_site_version_id,
    });
    const base = {
      host,
      path: input.path,
      normalizedPath,
      siteId: pointerRow.site_id,
      ownershipSiteId: pointerRow.ownership_site_id,
      siteResolution: pointerRow.site_resolution,
      sourceUrl: pointerRow.source_url,
      sourceHost: pointerRow.source_host,
      hostBindingId: pointerRow.host_binding_id,
      hostBindingKind: pointerRow.host_binding_kind,
      hostBindingStatus: pointerRow.host_binding_status,
      domain: pointerRow.domain,
      domainBindingId: pointerRow.domain_binding_id,
      domainBindingStatus: pointerRow.domain_binding_status,
      legacyDomainSiteVersionId: pointerRow.legacy_domain_site_version_id,
      activeSiteVersionId: pointerRow.active_site_version_id,
      artifactId: pointerRow.artifact_id,
      diagnostics,
    };

    if (!pointerRow.active_site_version_id || !pointerRow.artifact_id) {
      return {
        ...base,
        outcome: "active_serving_miss",
        reasonCode: "no_active_pointer",
      };
    }

    const artifact = await getArtifactByIdWithClient(client, pointerRow.artifact_id);
    if (!artifact) {
      return {
        ...base,
        outcome: "active_serving_miss",
        activeSiteVersionId: pointerRow.active_site_version_id,
        artifactId: pointerRow.artifact_id,
        reasonCode: "active_artifact_missing",
      };
    }

    return {
      ...base,
      outcome: "active_serving_hit",
      sourceUrl: pointerRow.source_url ?? "",
      activeSiteVersionId: pointerRow.active_site_version_id,
      artifactId: pointerRow.artifact_id,
      artifact,
    };
  });
}

export async function resolveDomainSiteVersionForHost(input: { host?: string | null }): Promise<RuntimeDomainSiteResolution> {
  const resolved = await resolveActiveServingArtifactForHostAndPath({
    host: input.host,
    path: "/",
  });
  if (resolved.siteResolution !== "domain_match" || !resolved.domain || !resolved.domainBindingId || !resolved.domainBindingStatus) {
    return {
      outcome: "domain_miss",
      host: normalizeRuntimeDomain(String(input.host ?? "")),
      reasonCode: "domain_not_found",
    };
  }
  if (!resolved.siteId || !resolved.activeSiteVersionId || !resolved.legacyDomainSiteVersionId) {
    return {
      outcome: "domain_miss",
      host: resolved.host,
      reasonCode: "domain_not_found",
    };
  }
  return {
    outcome: "domain_hit",
    host: resolved.host,
    siteId: resolved.siteId,
    siteVersionId: resolved.activeSiteVersionId,
    legacyDomainSiteVersionId: resolved.legacyDomainSiteVersionId,
    domain: resolved.domain,
    status: resolved.domainBindingStatus,
    bindingId: resolved.domainBindingId,
    diagnostics: resolved.diagnostics,
  };
}

type RawTemplateMissReasonCode = "domain_not_found" | "raw_template_site_not_found" | "raw_template_html_not_found";

export type RawTemplateDomainResolution =
  | {
      outcome: "raw_template_hit";
      host: string;
      siteId: string;
      siteVersionId: string;
      siteResolution: Extract<RuntimeActiveServingResolutionKind, "domain_match" | "host_match">;
      matchKind: Extract<RuntimeActiveServingResolutionKind, "domain_match" | "host_match">;
      domain: string | null;
      bindingId: string;
      status: RuntimeDomainHostBindingStatus | RuntimeHostBindingStatus;
      legacyDomainSiteVersionId: string | null;
      activePointerSiteVersionId: string;
      activeArtifactId: string;
      diagnostics: RawTemplateServingDiagnostic[];
      normalizedPath: string;
      resolvedFilePath: string;
      html: string;
    }
  | {
      outcome: "raw_template_miss";
      host: string;
      normalizedPath: string;
      siteId: string | null;
      siteVersionId: string | null;
      domain: string | null;
      bindingId: string | null;
      status: RuntimeDomainHostBindingStatus | RuntimeHostBindingStatus | null;
      legacyDomainSiteVersionId: string | null;
      activePointerSiteVersionId: string | null;
      activeArtifactId: string | null;
      diagnostics: RawTemplateServingDiagnostic[];
      reasonCode: RawTemplateMissReasonCode;
    };

type RawTemplateServingDiagnostic =
  | RuntimeActiveServingDiagnostic
  | {
      code:
        | "raw_template_domain_match"
        | "raw_template_host_match"
        | "raw_template_miss"
        | "host_match_raw_template_selected";
      host: string;
      siteId: string | null;
      siteVersionId: string | null;
      siteResolution: RuntimeActiveServingResolutionKind | "none";
      reasonCode?: RawTemplateMissReasonCode;
      resolvedFilePath?: string;
    };

function buildRawTemplateHtmlPathCandidates(input: {
  path: string;
  entryHtmlPath: string;
  fileMap: Record<string, RawTemplateSiteFileMeta>;
}): string[] {
  const normalizedPath = normalizePagePath(input.path);
  if (normalizedPath === "/") return [input.entryHtmlPath];
  const trimmed = normalizedPath.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!trimmed) return [input.entryHtmlPath];

  const candidates = new Set<string>();
  if (trimmed.toLowerCase().endsWith(".html")) {
    candidates.add(trimmed);
  } else {
    candidates.add(`${trimmed}.html`);
    candidates.add(`${trimmed}/index.html`);
  }
  candidates.add(trimmed);
  candidates.add(input.entryHtmlPath);

  return [...candidates].map((candidate) => normalizeRawTemplateFilePath(candidate)).filter((candidate) => Boolean(candidate));
}

export async function resolveRawTemplateSiteForDomainAndPath(input: {
  host?: string | null;
  path: string;
  dbClient?: RuntimeStoreDbClient;
}): Promise<RawTemplateDomainResolution> {
  const siteResolution = await resolveActiveServingArtifactForHostAndPath({
    host: input.host,
    path: input.path,
    dbClient: input.dbClient,
  });
  const normalizedPath = normalizePagePath(input.path);
  const missDiagnostics = (reasonCode: RawTemplateMissReasonCode): RawTemplateServingDiagnostic[] => [
    {
      code: "raw_template_miss",
      host: siteResolution.host,
      siteId: siteResolution.siteId ?? null,
      siteVersionId: siteResolution.activeSiteVersionId ?? null,
      siteResolution: siteResolution.siteResolution,
      reasonCode,
    },
  ];
  const activeMatchKind =
    siteResolution.siteResolution === "domain_match" || siteResolution.siteResolution === "host_match"
      ? siteResolution.siteResolution
      : null;
  if (!activeMatchKind) {
    return {
      outcome: "raw_template_miss",
      host: siteResolution.host,
      normalizedPath,
      siteId: null,
      siteVersionId: null,
      domain: null,
      bindingId: null,
      status: null,
      legacyDomainSiteVersionId: null,
      activePointerSiteVersionId: null,
      activeArtifactId: null,
      diagnostics: missDiagnostics("domain_not_found"),
      reasonCode: "domain_not_found",
    };
  }

  const activeSiteVersionId = siteResolution.activeSiteVersionId;
  const activeArtifactId = siteResolution.artifactId;
  const bindingId = activeMatchKind === "domain_match" ? siteResolution.domainBindingId : siteResolution.hostBindingId;
  const bindingStatus = activeMatchKind === "domain_match" ? siteResolution.domainBindingStatus : siteResolution.hostBindingStatus;
  const bindingIsActive = activeMatchKind === "domain_match" ? bindingStatus === "active" : bindingStatus === "ACTIVE";
  if (!activeSiteVersionId || !activeArtifactId || !bindingId || !bindingStatus || !bindingIsActive) {
    return {
      outcome: "raw_template_miss",
      host: siteResolution.host,
      normalizedPath,
      siteId: siteResolution.siteId,
      siteVersionId: activeSiteVersionId ?? null,
      domain: siteResolution.domain,
      bindingId,
      status: bindingStatus,
      legacyDomainSiteVersionId: siteResolution.legacyDomainSiteVersionId,
      activePointerSiteVersionId: activeSiteVersionId ?? null,
      activeArtifactId,
      diagnostics: [...siteResolution.diagnostics, ...missDiagnostics("raw_template_site_not_found")],
      reasonCode: "raw_template_site_not_found",
    };
  }

  const artifact =
    (await getRawImportedSiteArtifact(activeSiteVersionId, { dbClient: input.dbClient })) ??
    (await getRawTemplateSiteArtifact(activeSiteVersionId, { dbClient: input.dbClient }));
  if (!artifact || artifact.siteId !== siteResolution.siteId) {
    return {
      outcome: "raw_template_miss",
      host: siteResolution.host,
      normalizedPath,
      siteId: siteResolution.siteId,
      siteVersionId: activeSiteVersionId,
      domain: siteResolution.domain,
      bindingId,
      status: bindingStatus,
      legacyDomainSiteVersionId: siteResolution.legacyDomainSiteVersionId,
      activePointerSiteVersionId: activeSiteVersionId,
      activeArtifactId,
      diagnostics: [...siteResolution.diagnostics, ...missDiagnostics("raw_template_site_not_found")],
      reasonCode: "raw_template_site_not_found",
    };
  }

  const candidates = buildRawTemplateHtmlPathCandidates({
    path: input.path,
    entryHtmlPath: artifact.entryHtmlPath,
    fileMap: artifact.fileMap,
  });
  const resolvedFilePath = candidates.find((candidate) => Boolean(artifact.fileMap[candidate])) ?? null;
  if (!resolvedFilePath) {
    return {
      outcome: "raw_template_miss",
      host: siteResolution.host,
      normalizedPath,
      siteId: artifact.siteId,
      siteVersionId: artifact.siteVersionId,
      domain: siteResolution.domain,
      bindingId,
      status: bindingStatus,
      legacyDomainSiteVersionId: siteResolution.legacyDomainSiteVersionId,
      activePointerSiteVersionId: activeSiteVersionId,
      activeArtifactId,
      diagnostics: [...siteResolution.diagnostics, ...missDiagnostics("raw_template_html_not_found")],
      reasonCode: "raw_template_html_not_found",
    };
  }

  const htmlAsset = await getRawTemplateSiteAsset({
    siteVersionId: artifact.siteVersionId,
    filePath: resolvedFilePath,
    artifactId: artifact.id,
    dbClient: input.dbClient,
  });
  if (!htmlAsset) {
    return {
      outcome: "raw_template_miss",
      host: siteResolution.host,
      normalizedPath,
      siteId: artifact.siteId,
      siteVersionId: artifact.siteVersionId,
      domain: siteResolution.domain,
      bindingId,
      status: bindingStatus,
      legacyDomainSiteVersionId: siteResolution.legacyDomainSiteVersionId,
      activePointerSiteVersionId: activeSiteVersionId,
      activeArtifactId,
      diagnostics: [...siteResolution.diagnostics, ...missDiagnostics("raw_template_html_not_found")],
      reasonCode: "raw_template_html_not_found",
    };
  }

  const rawMatchDiagnostics: RawTemplateServingDiagnostic[] = [
    ...siteResolution.diagnostics,
    {
      code: activeMatchKind === "domain_match" ? "raw_template_domain_match" : "raw_template_host_match",
      host: siteResolution.host,
      siteId: artifact.siteId,
      siteVersionId: artifact.siteVersionId,
      siteResolution: activeMatchKind,
      resolvedFilePath,
    },
  ];
  if (activeMatchKind === "host_match") {
    rawMatchDiagnostics.push({
      code: "host_match_raw_template_selected",
      host: siteResolution.host,
      siteId: artifact.siteId,
      siteVersionId: artifact.siteVersionId,
      siteResolution: activeMatchKind,
      resolvedFilePath,
    });
  }

  return {
    outcome: "raw_template_hit",
    host: siteResolution.host,
    siteId: artifact.siteId,
    siteVersionId: artifact.siteVersionId,
    siteResolution: activeMatchKind,
    matchKind: activeMatchKind,
    domain: siteResolution.domain,
    bindingId,
    status: bindingStatus,
    legacyDomainSiteVersionId: siteResolution.legacyDomainSiteVersionId,
    activePointerSiteVersionId: activeSiteVersionId,
    activeArtifactId,
    diagnostics: rawMatchDiagnostics,
    normalizedPath,
    resolvedFilePath,
    html: htmlAsset.bytes.toString("utf8"),
  };
}

export async function getSiteVersion(siteVersionId: string, options: RuntimeStoreDbOptions = {}): Promise<CanonicalSiteVersionSnapshot | null> {
  return withRuntimeClient(options, async (client) => {
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
  });
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

export async function materializePageMigrationGovernanceForSiteVersion(input: {
  siteVersionId: string;
  governanceByPageId: Record<string, PageMigrationGovernanceSnapshot>;
  actor: string;
  details?: Record<string, unknown>;
  dbClient?: RuntimeStoreDbClient;
}): Promise<{ affectedRows: number; pageIds: string[] }> {
  const pageIds = Object.keys(input.governanceByPageId)
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0)
    .sort((a, b) => a.localeCompare(b));

  if (pageIds.length === 0) return { affectedRows: 0, pageIds: [] };

  return withTx(async (client) => {
    let affectedRows = 0;
    for (const pageId of pageIds) {
      const updated = await client.query<{ page_id: string }>(
        `
        update public.gnr8_runtime_page_versions
        set migration_governance = $3::jsonb
        where site_version_id = $1::uuid
          and page_id = $2::text
        returning page_id::text as page_id
        `,
        [input.siteVersionId, pageId, JSON.stringify(input.governanceByPageId[pageId])],
      );
      affectedRows += updated.rowCount ?? 0;
    }

    const current = await client.query<{ state: string }>(
      `select state::text as state from public.gnr8_runtime_site_versions where id = $1::uuid limit 1`,
      [input.siteVersionId],
    );
    const state = current.rows[0]?.state ?? "DRAFT";
    await client.query(
      `
      insert into public.gnr8_runtime_version_audit (site_version_id, from_state, to_state, actor, source, details)
      values ($1::uuid, $2::text, $2::text, $3::text, 'manual', $4::jsonb)
      `,
      [
        input.siteVersionId,
        state,
        input.actor,
        JSON.stringify({
          workflow: "reconcile_imported_runtime",
          action: "materialize_page_migration_governance",
          pageIds,
          affectedRows,
          ...(input.details ?? {}),
        }),
      ],
    );

    return { affectedRows, pageIds };
  }, { dbClient: input.dbClient });
}

export async function setSiteVersionState(input: {
  siteVersionId: string;
  expectedCurrentState: SiteVersionState;
  nextState: SiteVersionState;
  actor: string;
  source: string;
  details?: Record<string, unknown>;
  dbClient?: RuntimeStoreDbClient;
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
  }, { dbClient: input.dbClient });
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
  dbClient?: RuntimeStoreDbClient;
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
  }, { dbClient: input.dbClient });
}

export async function refreshArtifactForVersionPublishCandidate(input: {
  siteId: string;
  siteVersionId: string;
  artifactId: string;
  rendererCompatibilityVersion: string;
  bundleSha256: string;
  htmlByPath: Record<string, string>;
  compiledTokenStyles: string;
  assetFingerprintMap: Record<string, string>;
  manifest: Record<string, unknown>;
  publishStage: RuntimeArtifact["publishStage"];
  shadowRestricted: boolean;
  artifactGovernance: RuntimeArtifact["artifactGovernance"];
  dbClient?: RuntimeStoreDbClient;
}): Promise<{ affectedRows: number }> {
  return withTx(async (client) => {
    const updated = await client.query<{ id: string }>(
      `
      update public.gnr8_runtime_artifacts
      set
        renderer_compatibility_version = $4::text,
        bundle_sha256 = $5::text,
        html_by_path = $6::jsonb,
        compiled_token_styles = $7::text,
        asset_fingerprint_map = $8::jsonb,
        manifest = $9::jsonb,
        publish_stage = $10::text,
        shadow_restricted = $11::boolean,
        artifact_governance = $12::jsonb
      where id = $1::uuid
        and site_id = $2::text
        and site_version_id = $3::uuid
      returning id::text as id
      `,
      [
        input.artifactId,
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
    if (!updated.rows[0]) {
      throw new Error(
        `PUBLISH_LINEAGE_MISMATCH:${JSON.stringify({
          message: "Bound artifact could not be refreshed because its site/version lineage does not match the publish candidate.",
          details: {
            artifactId: input.artifactId,
            expectedSiteId: input.siteId,
            expectedSiteVersionId: input.siteVersionId,
          },
        })}`,
      );
    }
    return { affectedRows: updated.rowCount ?? 0 };
  }, { dbClient: input.dbClient });
}

export async function bindArtifactToVersion(input: {
  siteVersionId: string;
  artifactId: string;
  rendererCompatibilityVersion: string;
  dbClient?: RuntimeStoreDbClient;
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
  }, { dbClient: input.dbClient });
}

export async function switchActivePointer(input: {
  siteId: string;
  siteVersionId: string;
  artifactId: string;
  dbClient?: RuntimeStoreDbClient;
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
  }, { dbClient: input.dbClient });
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

export async function getArtifactById(artifactId: string, options: RuntimeStoreDbOptions = {}): Promise<RuntimeArtifact | null> {
  return withRuntimeClient(options, (client) => getArtifactByIdWithClient(client, artifactId));
}

type QueryableClient = Pick<PoolClient, "query">;

async function getArtifactByIdWithClient(client: QueryableClient, artifactId: string): Promise<RuntimeArtifact | null> {
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
      siteResolution: RuntimeActiveServingResolutionKind;
      hostBindingId: string | null;
      hostBindingKind: string | null;
      hostBindingStatus: RuntimeHostBindingStatus | null;
      domain: string | null;
      domainBindingId: string | null;
      domainBindingStatus: RuntimeDomainHostBindingStatus | null;
      legacyDomainSiteVersionId: string | null;
      diagnostics: RuntimeActiveServingDiagnostic[];
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
      siteResolution: RuntimeActiveServingResolutionKind | "none";
      hostBindingId: string | null;
      hostBindingKind: string | null;
      hostBindingStatus: RuntimeHostBindingStatus | null;
      domain: string | null;
      domainBindingId: string | null;
      domainBindingStatus: RuntimeDomainHostBindingStatus | null;
      legacyDomainSiteVersionId: string | null;
      diagnostics: RuntimeActiveServingDiagnostic[];
      activeSiteVersionId: string | null;
      artifactId: string | null;
      reasonCode: PublicRuntimeArtifactMissReasonCode;
    };

export type RuntimeSiteResolutionForHost =
  | {
      outcome: "site_hit";
      host: string;
      siteId: string;
      siteResolution: RuntimeActiveServingResolutionKind;
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
  const resolved = await resolveActiveServingArtifactForHostAndPath({ host: input.host, path: "/" });
  if (!resolved.siteId || resolved.siteResolution === "none") {
    return { outcome: "site_miss", host: resolved.host, reasonCode: "no_runtime_site" };
  }
  if (!resolved.sourceUrl || !resolved.sourceUrl.trim()) {
    return { outcome: "site_miss", host: resolved.host, reasonCode: "missing_source_url" };
  }
  return {
    outcome: "site_hit",
    host: resolved.host,
    siteId: resolved.siteId,
    siteResolution: resolved.siteResolution,
    hostBindingId: resolved.hostBindingId,
    hostBindingKind: resolved.hostBindingKind,
    hostBindingStatus: resolved.hostBindingStatus,
    sourceUrl: resolved.sourceUrl,
    sourceHost: resolved.sourceHost,
  };
}

export async function resolveActiveArtifactForHostAndPathWithDiagnostics(input: {
  host?: string | null;
  path: string;
  dbClient?: RuntimeStoreDbClient;
}): Promise<PublicRuntimeArtifactResolution> {
  const resolved = await resolveActiveServingArtifactForHostAndPath(input);
  if (resolved.outcome === "active_serving_miss") {
    return {
      outcome: "artifact_miss",
      host: resolved.host,
      path: input.path,
      normalizedPath: resolved.normalizedPath,
      siteId: resolved.siteId,
      ownershipSiteId: resolved.ownershipSiteId,
      siteResolution: resolved.siteResolution,
      hostBindingId: resolved.hostBindingId,
      hostBindingKind: resolved.hostBindingKind,
      hostBindingStatus: resolved.hostBindingStatus,
      domain: resolved.domain,
      domainBindingId: resolved.domainBindingId,
      domainBindingStatus: resolved.domainBindingStatus,
      legacyDomainSiteVersionId: resolved.legacyDomainSiteVersionId,
      diagnostics: resolved.diagnostics,
      activeSiteVersionId: resolved.activeSiteVersionId,
      artifactId: resolved.artifactId,
      reasonCode: resolved.reasonCode,
    };
  }

  const servingStage = resolveServingStageFromBindingKind(resolved.hostBindingKind);
  const servingEligibility = evaluateRuntimeArtifactServingEligibility({
    artifact: resolved.artifact,
    servingStage,
  });
  if (!servingEligibility.allow) {
    return {
      outcome: "artifact_miss",
      host: resolved.host,
      path: input.path,
      normalizedPath: resolved.normalizedPath,
      siteId: resolved.siteId,
      ownershipSiteId: resolved.ownershipSiteId,
      siteResolution: resolved.siteResolution,
      hostBindingId: resolved.hostBindingId,
      hostBindingKind: resolved.hostBindingKind,
      hostBindingStatus: resolved.hostBindingStatus,
      domain: resolved.domain,
      domainBindingId: resolved.domainBindingId,
      domainBindingStatus: resolved.domainBindingStatus,
      legacyDomainSiteVersionId: resolved.legacyDomainSiteVersionId,
      diagnostics: resolved.diagnostics,
      activeSiteVersionId: resolved.activeSiteVersionId,
      artifactId: resolved.artifactId,
      reasonCode: "artifact_stage_denied",
    };
  }

  const resolvedPath = resolved.artifact.htmlByPath[resolved.normalizedPath] ? resolved.normalizedPath : "/";
  const html = resolved.artifact.htmlByPath[resolvedPath];
  if (!html) {
    return {
      outcome: "artifact_miss",
      host: resolved.host,
      path: input.path,
      normalizedPath: resolved.normalizedPath,
      siteId: resolved.siteId,
      ownershipSiteId: resolved.ownershipSiteId,
      siteResolution: resolved.siteResolution,
      hostBindingId: resolved.hostBindingId,
      hostBindingKind: resolved.hostBindingKind,
      hostBindingStatus: resolved.hostBindingStatus,
      domain: resolved.domain,
      domainBindingId: resolved.domainBindingId,
      domainBindingStatus: resolved.domainBindingStatus,
      legacyDomainSiteVersionId: resolved.legacyDomainSiteVersionId,
      diagnostics: resolved.diagnostics,
      activeSiteVersionId: resolved.activeSiteVersionId,
      artifactId: resolved.artifactId,
      reasonCode: "artifact_path_missing",
    };
  }

  return {
    outcome: "artifact_hit",
    host: resolved.host,
    path: input.path,
    normalizedPath: resolved.normalizedPath,
    siteId: resolved.siteId,
    ownershipSiteId: resolved.ownershipSiteId,
    siteResolution: resolved.siteResolution,
    hostBindingId: resolved.hostBindingId,
    hostBindingKind: resolved.hostBindingKind,
    hostBindingStatus: resolved.hostBindingStatus,
    domain: resolved.domain,
    domainBindingId: resolved.domainBindingId,
    domainBindingStatus: resolved.domainBindingStatus,
    legacyDomainSiteVersionId: resolved.legacyDomainSiteVersionId,
    diagnostics: resolved.diagnostics,
    activeSiteVersionId: resolved.activeSiteVersionId,
    artifactId: resolved.artifactId,
    artifact: resolved.artifact,
    html,
    resolvedPath,
  };
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

export async function archivePublishedVersionsExcept(input: {
  siteId: string;
  keepSiteVersionId: string;
  actor: string;
  dbClient?: RuntimeStoreDbClient;
}): Promise<void> {
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
  }, { dbClient: input.dbClient });
}

export async function getVersionState(siteVersionId: string, options: RuntimeStoreDbOptions = {}): Promise<SiteVersionState | null> {
  return withRuntimeClient(options, async (client) => {
    const res = await client.query<{ state: SiteVersionState }>(
      `select state::text as state from public.gnr8_runtime_site_versions where id = $1::uuid limit 1`,
      [siteVersionId],
    );
    return res.rows[0]?.state ?? null;
  });
}

export async function getSiteVersionArtifactBinding(
  siteVersionId: string,
  options: RuntimeStoreDbOptions = {},
): Promise<{ siteId: string; artifactId: string | null } | null> {
  return withRuntimeClient(options, async (client) => {
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
  });
}

export async function getRawTemplateSiteArtifact(
  siteVersionId: string,
  options: RuntimeStoreDbOptions = {},
): Promise<RawTemplateSiteArtifact | null> {
  return withRuntimeClient(options, async (client) => {
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
        metadata_json,
        created_at::text as created_at
      from public.gnr8_runtime_raw_template_artifacts
      where site_version_id = $1::uuid
        and artifact_type = 'raw_template_site'
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
  });
}

export async function getRawImportedSiteArtifact(
  siteVersionId: string,
  options: RuntimeStoreDbOptions = {},
): Promise<RawImportedSiteArtifact | null> {
  return withRuntimeClient(options, async (client) => {
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
        metadata_json,
        created_at::text as created_at
      from public.gnr8_runtime_raw_template_artifacts
      where site_version_id = $1::uuid
        and artifact_type = 'raw_imported_site'
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
    artifactType: "raw_imported_site",
    siteId: row.site_id,
    siteVersionId: row.site_version_id,
    entryHtmlPath,
    assetBasePath,
    fileMap: parseRawTemplateFileMap(row.file_map),
    metadata: parseRawImportedSiteArtifactMetadata(row.metadata_json),
    createdAt: row.created_at,
  };
  });
}

export async function getRawTemplateSiteAsset(input: {
  siteVersionId: string;
  filePath: string;
  artifactId?: string | null;
  dbClient?: RuntimeStoreDbClient;
}): Promise<{ mediaType: string; sizeBytes: number; sha256: string; bytes: Buffer } | null> {
  const normalizedFilePath = normalizeRawTemplateFilePath(input.filePath);
  if (!normalizedFilePath) return null;
  const artifactId = String(input.artifactId ?? "").trim();
  return withRuntimeClient({ dbClient: input.dbClient }, async (client) => {
    console.info("[preview-runtime] RAW_IMPORT_ASSET_DB_COLUMN_MAPPING_USED", {
      table: "public.gnr8_runtime_raw_template_artifact_files",
      filePathColumn: "file_path",
      mediaTypeColumn: "media_type",
      contentColumn: "content_bytes",
      artifactScopedLookup: Boolean(artifactId),
      siteVersionId: input.siteVersionId,
      artifactId: artifactId || null,
      filePath: normalizedFilePath,
    });
    const row = artifactId
      ? await client.query<RawTemplateArtifactFileRow>(
          `
          select
            f.media_type::text as media_type,
            f.file_size_bytes::integer as file_size_bytes,
            f.sha256::text as sha256,
            f.content_bytes
          from public.gnr8_runtime_raw_template_artifact_files f
          where f.artifact_id = $1::uuid
            and f.file_path = $2::text
          limit 1
          `,
          [artifactId, normalizedFilePath],
        )
      : await client.query<RawTemplateArtifactFileRow>(
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
    if (!hit) {
      console.warn("[preview-runtime] RAW_IMPORT_ASSET_FILE_ROW_MISSING", {
        siteVersionId: input.siteVersionId,
        artifactId: artifactId || null,
        filePath: normalizedFilePath,
      });
      return null;
    }
    console.info("[preview-runtime] RAW_IMPORT_ASSET_FILE_ROW_FOUND", {
      siteVersionId: input.siteVersionId,
      artifactId: artifactId || null,
      filePath: normalizedFilePath,
      mediaType: hit.media_type,
      sizeBytes: Number(hit.file_size_bytes) || 0,
    });
    const bytes = Buffer.isBuffer(hit.content_bytes) ? hit.content_bytes : Buffer.from(hit.content_bytes);
    return {
      mediaType: hit.media_type,
      sizeBytes: Math.max(0, Math.floor(Number(hit.file_size_bytes) || 0)),
      sha256: hit.sha256,
      bytes,
    };
  });
}

export async function persistRawImportedSiteArtifact(input: {
  siteId: string;
  siteVersionId: string;
  entryHtmlPath: string;
  assetBasePath: string;
  fileRows: Array<{ path: string; mediaType: string; sizeBytes: number; sha256: string; bytes: Buffer }>;
  metadata: RawImportedSiteArtifactMetadata;
}): Promise<{ artifactId: string; fileCount: number }> {
  await ensureRuntimeTables();
  const entryHtmlPath = normalizeRawTemplateFilePath(input.entryHtmlPath);
  const assetBasePath = normalizeRawTemplateFilePath(input.assetBasePath) || ".";
  if (!entryHtmlPath) throw new Error("RAW_IMPORT_ARTIFACT_ENTRY_HTML_INVALID");
  const fileMap: Record<string, RawTemplateSiteFileMeta> = {};
  for (const row of input.fileRows) {
    const p = normalizeRawTemplateFilePath(row.path);
    if (!p) continue;
    fileMap[p] = { path: p, mediaType: row.mediaType, sizeBytes: row.sizeBytes, sha256: row.sha256 };
  }
  if (!fileMap[entryHtmlPath]) throw new Error("RAW_IMPORT_ARTIFACT_ENTRY_HTML_MISSING");

  return withTx(async (client) => {
    const upsert = await client.query<{ id: string }>(
      `
      insert into public.gnr8_runtime_raw_template_artifacts (
        site_id,
        site_version_id,
        artifact_type,
        entry_html_path,
        asset_base_path,
        file_map,
        metadata_json
      )
      values ($1::text, $2::uuid, 'raw_imported_site', $3::text, $4::text, $5::jsonb, $6::jsonb)
      on conflict (site_version_id)
      do update set
        site_id = excluded.site_id,
        artifact_type = excluded.artifact_type,
        entry_html_path = excluded.entry_html_path,
        asset_base_path = excluded.asset_base_path,
        file_map = excluded.file_map,
        metadata_json = excluded.metadata_json
      returning id::text as id
      `,
      [input.siteId, input.siteVersionId, entryHtmlPath, assetBasePath, JSON.stringify(fileMap), JSON.stringify(input.metadata)],
    );
    const artifactId = upsert.rows[0]?.id;
    if (!artifactId) throw new Error("RAW_IMPORT_ARTIFACT_UPSERT_FAILED");
    await client.query(`delete from public.gnr8_runtime_raw_template_artifact_files where artifact_id = $1::uuid`, [artifactId]);
    for (const file of input.fileRows) {
      const filePath = normalizeRawTemplateFilePath(file.path);
      if (!filePath) continue;
      await client.query(
        `
        insert into public.gnr8_runtime_raw_template_artifact_files (
          artifact_id,
          file_path,
          media_type,
          file_size_bytes,
          sha256,
          content_bytes
        )
        values ($1::uuid, $2::text, $3::text, $4::integer, $5::text, $6::bytea)
        `,
        [artifactId, filePath, file.mediaType, file.sizeBytes, file.sha256, file.bytes],
      );
    }
    return { artifactId, fileCount: Object.keys(fileMap).length };
  });
}

export async function getActivePointerForSite(
  siteId: string,
  options: RuntimeStoreDbOptions = {},
): Promise<{ siteVersionId: string; artifactId: string } | null> {
  return withRuntimeClient(options, async (client) => {
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
  });
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
  dbClient?: RuntimeStoreDbClient;
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
  }, { dbClient: input.dbClient });
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

export async function upsertContentSlots(input: {
  siteId: string;
  siteVersionId: string;
  slots: Array<Omit<ContentSlot, "id" | "createdAt" | "updatedAt">>;
}): Promise<number> {
  if (input.slots.length === 0) return 0;
  return withTx(async (client) => {
    let affected = 0;
    for (const slot of input.slots) {
      const res = await client.query(
        `
        insert into public.gnr8_content_slots (
          site_id, site_version_id, slot_key, slot_type, source_selector, source_text, source_asset_path, confidence, diagnostics, updated_at
        )
        values ($1::text, $2::uuid, $3::text, $4::text, $5::text, $6::text, $7::text, $8::numeric, $9::jsonb, now())
        on conflict (site_version_id, slot_key)
        do update set
          slot_type = excluded.slot_type,
          source_selector = excluded.source_selector,
          source_text = excluded.source_text,
          source_asset_path = excluded.source_asset_path,
          confidence = excluded.confidence,
          diagnostics = excluded.diagnostics,
          updated_at = now()
        `,
        [
          input.siteId,
          input.siteVersionId,
          slot.slotKey,
          slot.slotType,
          slot.sourceSelector,
          slot.sourceText,
          slot.sourceAssetPath,
          slot.confidence,
          JSON.stringify(slot.diagnostics ?? {}),
        ],
      );
      affected += res.rowCount ?? 0;
    }
    return affected;
  });
}

export async function listContentSlots(siteVersionId: string, options: RuntimeStoreDbOptions = {}): Promise<ContentSlot[]> {
  return withRuntimeClient(options, async (client) => {
    const res = await client.query<any>(
      `
      select id::text, site_id::text, site_version_id::text, slot_key::text, slot_type::text, source_selector::text, source_text::text, source_asset_path::text, confidence::text, diagnostics, created_at::text, updated_at::text
      from public.gnr8_content_slots
      where site_version_id = $1::uuid
      order by slot_key asc
      `,
      [siteVersionId],
    );
    return res.rows.map((row: any) => ({
      id: row.id,
      siteId: row.site_id,
      siteVersionId: row.site_version_id,
      slotKey: row.slot_key,
      slotType: row.slot_type as ContentSlotType,
      sourceSelector: row.source_selector ?? null,
      sourceText: row.source_text ?? null,
      sourceAssetPath: row.source_asset_path ?? null,
      confidence: Number(row.confidence ?? 0),
      diagnostics: (row.diagnostics ?? null) as Record<string, unknown> | null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  });
}

export async function listContentOverrides(input: {
  siteVersionId: string;
  status?: ContentOverrideStatus;
  dbClient?: RuntimeStoreDbClient;
}): Promise<ContentOverride[]> {
  return withRuntimeClient({ dbClient: input.dbClient }, async (client) => {
    const res = await client.query<any>(
      `
      select id::text, site_id::text, site_version_id::text, slot_key::text, value_type::text, value_json, status::text, created_at::text, updated_at::text
      from public.gnr8_content_overrides
      where site_version_id = $1::uuid
        and ($2::text is null or status = $2::text)
      order by slot_key asc
      `,
      [input.siteVersionId, input.status ?? null],
    );
    return res.rows.map((row: any) => ({
      id: row.id,
      siteId: row.site_id,
      siteVersionId: row.site_version_id,
      slotKey: row.slot_key,
      valueType: row.value_type as ContentSlotType,
      valueJson: row.value_json,
      status: row.status as ContentOverrideStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  });
}

export type ContentOverrideHistoryAction = "draft_saved" | "content_published" | "rollback_applied";
export type ContentOverrideHistorySource = "manual" | "batch" | "system" | "ai";

export type ContentOverrideHistoryRow = {
  id: string;
  siteId: string;
  siteVersionId: string;
  slotKey: string;
  valueType: ContentSlotType;
  previousValueJson: unknown | null;
  nextValueJson: unknown;
  action: ContentOverrideHistoryAction;
  actorUserId: string | null;
  source: ContentOverrideHistorySource;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

function contentJsonEquals(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

async function getContentOverrideBySlotWithClient(input: {
  client: PoolClient;
  siteVersionId: string;
  slotKey: string;
  status: ContentOverrideStatus;
}): Promise<{ valueType: ContentSlotType; valueJson: unknown } | null> {
  const res = await input.client.query<any>(
    `
    select value_type::text as value_type, value_json
    from public.gnr8_content_overrides
    where site_version_id = $1::uuid and slot_key = $2::text and status = $3::text
    limit 1
    `,
    [input.siteVersionId, input.slotKey, input.status],
  );
  const row = res.rows[0];
  if (!row) return null;
  return { valueType: row.value_type as ContentSlotType, valueJson: row.value_json };
}

async function insertContentOverrideHistoryWithClient(input: {
  client: PoolClient;
  siteId: string;
  siteVersionId: string;
  slotKey: string;
  valueType: ContentSlotType;
  previousValueJson: unknown | null;
  nextValueJson: unknown;
  action: ContentOverrideHistoryAction;
  actorUserId?: string | null;
  source: ContentOverrideHistorySource;
  metadata?: Record<string, unknown> | null;
}): Promise<void> {
  await input.client.query(
    `
    insert into public.gnr8_content_override_history (
      site_id,
      site_version_id,
      slot_key,
      value_type,
      previous_value_json,
      next_value_json,
      action,
      actor_user_id,
      source,
      metadata
    )
    values ($1, $2::uuid, $3::text, $4::text, $5::jsonb, $6::jsonb, $7::text, $8::uuid, $9::text, $10::jsonb)
    `,
    [
      input.siteId,
      input.siteVersionId,
      input.slotKey,
      input.valueType,
      input.previousValueJson == null ? null : JSON.stringify(input.previousValueJson),
      JSON.stringify(input.nextValueJson ?? {}),
      input.action,
      input.actorUserId ?? null,
      input.source,
      input.metadata == null ? null : JSON.stringify(input.metadata),
    ],
  );
}

export async function upsertContentOverrideDraft(input: {
  siteId: string;
  siteVersionId: string;
  slotKey: string;
  valueType: ContentSlotType;
  valueJson: unknown;
  actorUserId?: string | null;
  source?: ContentOverrideHistorySource;
}): Promise<{
  changed: boolean;
  historyRecorded: boolean;
  draftOverrideCountForVersion: number;
  savedRow: { slotKey: string; valueJson: unknown; value_json: unknown; status: ContentOverrideStatus; siteVersionId: string; updated_at: string | null } | null;
  normalizedValue: unknown;
  diagnostics: string[];
}> {
  return withTx(async (client) => {
    const diagnostics: string[] = ["CONTENT_HISTORY_WRITE_STARTED"];
    const normalizedValue = input.valueJson ?? {};
    const previous = await getContentOverrideBySlotWithClient({
      client,
      siteVersionId: input.siteVersionId,
      slotKey: input.slotKey,
      status: "draft",
    });
    if (previous && contentJsonEquals(previous.valueJson, normalizedValue) && previous.valueType === input.valueType) {
      diagnostics.push("CONTENT_HISTORY_SKIPPED_UNCHANGED");
      const countRes = await client.query<{ count: string }>(
        `select count(*)::text as count from public.gnr8_content_overrides where site_version_id = $1::uuid and status = 'draft'`,
        [input.siteVersionId],
      );
      const savedRes = await client.query<any>(
        `
        select slot_key::text, value_json, status::text, site_version_id::text, updated_at::text
        from public.gnr8_content_overrides
        where site_version_id = $1::uuid and slot_key = $2::text and status = 'draft'
        limit 1
        `,
        [input.siteVersionId, input.slotKey],
      );
      const savedRow = savedRes.rows[0]
        ? {
            slotKey: savedRes.rows[0].slot_key,
            valueJson: savedRes.rows[0].value_json,
            value_json: savedRes.rows[0].value_json,
            status: savedRes.rows[0].status as ContentOverrideStatus,
            siteVersionId: savedRes.rows[0].site_version_id,
            updated_at: savedRes.rows[0].updated_at ?? null,
          }
        : null;
      if (!contentJsonEquals(savedRow?.valueJson ?? null, normalizedValue)) {
        diagnostics.push("CONTENT_WRITE_MISMATCH_FATAL");
        throw new Error("CONTENT_WRITE_MISMATCH_FATAL");
      }
      diagnostics.push("CONTENT_DRAFT_SAVE_ROW_READBACK", "CONTENT_WRITE_VERIFIED");
      return {
        changed: false,
        historyRecorded: false,
        draftOverrideCountForVersion: Number(countRes.rows[0]?.count ?? 0),
        savedRow,
        normalizedValue,
        diagnostics,
      };
    }

    await client.query(
      `
      insert into public.gnr8_content_overrides (site_id, site_version_id, slot_key, value_type, value_json, status, updated_at)
      values ($1, $2::uuid, $3::text, $4::text, $5::jsonb, 'draft', now())
      on conflict (site_version_id, slot_key, status)
      do update set value_type = excluded.value_type, value_json = excluded.value_json, updated_at = now()
      `,
      [input.siteId, input.siteVersionId, input.slotKey, input.valueType, JSON.stringify(normalizedValue)],
    );
    let historyRecorded = false;
    try {
      await insertContentOverrideHistoryWithClient({
        client,
        siteId: input.siteId,
        siteVersionId: input.siteVersionId,
        slotKey: input.slotKey,
        valueType: input.valueType,
        previousValueJson: previous?.valueJson ?? null,
        nextValueJson: normalizedValue,
        action: "draft_saved",
        actorUserId: input.actorUserId ?? null,
        source: input.source ?? "manual",
      });
      historyRecorded = true;
      diagnostics.push("CONTENT_HISTORY_RECORDED");
    } catch {
      diagnostics.push("CONTENT_HISTORY_WRITE_FAILED_NON_BLOCKING");
    }
    const countRes = await client.query<{ count: string }>(
      `select count(*)::text as count from public.gnr8_content_overrides where site_version_id = $1::uuid and status = 'draft'`,
      [input.siteVersionId],
    );
    const savedRes = await client.query<any>(
      `
      select slot_key::text, value_json, status::text, site_version_id::text, updated_at::text
      from public.gnr8_content_overrides
      where site_version_id = $1::uuid and slot_key = $2::text and status = 'draft'
      limit 1
      `,
      [input.siteVersionId, input.slotKey],
    );
    const savedRow = savedRes.rows[0]
      ? {
          slotKey: savedRes.rows[0].slot_key,
          valueJson: savedRes.rows[0].value_json,
          value_json: savedRes.rows[0].value_json,
          status: savedRes.rows[0].status as ContentOverrideStatus,
          siteVersionId: savedRes.rows[0].site_version_id,
          updated_at: savedRes.rows[0].updated_at ?? null,
        }
      : null;
    if (!contentJsonEquals(savedRow?.valueJson ?? null, normalizedValue)) {
      diagnostics.push("CONTENT_WRITE_MISMATCH_FATAL");
      throw new Error("CONTENT_WRITE_MISMATCH_FATAL");
    }
    diagnostics.push("CONTENT_DRAFT_SAVE_ROW_READBACK", "CONTENT_WRITE_VERIFIED");
    return {
      changed: true,
      historyRecorded,
      draftOverrideCountForVersion: Number(countRes.rows[0]?.count ?? 0),
      savedRow,
      normalizedValue,
      diagnostics,
    };
  });
}

export async function upsertContentOverrideDraftBatch(input: {
  siteId: string;
  siteVersionId: string;
  overrides: Array<{
    slotKey: string;
    valueType: ContentSlotType;
    valueJson: unknown;
  }>;
  actorUserId?: string | null;
  source?: ContentOverrideHistorySource;
}): Promise<{ updatedCount: number; historyCount: number; skippedUnchangedCount: number; diagnostics: string[] }> {
  if (input.overrides.length === 0) return { updatedCount: 0, historyCount: 0, skippedUnchangedCount: 0, diagnostics: ["CONTENT_HISTORY_WRITE_STARTED"] };
  return withTx(async (client) => {
    let affected = 0;
    let historyCount = 0;
    let skippedUnchangedCount = 0;
    const diagnostics: string[] = ["CONTENT_HISTORY_WRITE_STARTED"];
    for (const override of input.overrides) {
      const previous = await getContentOverrideBySlotWithClient({
        client,
        siteVersionId: input.siteVersionId,
        slotKey: override.slotKey,
        status: "draft",
      });
      if (previous && contentJsonEquals(previous.valueJson, override.valueJson) && previous.valueType === override.valueType) {
        skippedUnchangedCount += 1;
        diagnostics.push("CONTENT_HISTORY_SKIPPED_UNCHANGED");
        continue;
      }
      const res = await client.query(
        `
        insert into public.gnr8_content_overrides (site_id, site_version_id, slot_key, value_type, value_json, status, updated_at)
        values ($1, $2::uuid, $3::text, $4::text, $5::jsonb, 'draft', now())
        on conflict (site_version_id, slot_key, status)
        do update set value_type = excluded.value_type, value_json = excluded.value_json, updated_at = now()
        `,
        [input.siteId, input.siteVersionId, override.slotKey, override.valueType, JSON.stringify(override.valueJson ?? {})],
      );
      affected += res.rowCount ?? 0;
      const readbackRes = await client.query<any>(
        `
        select value_json
        from public.gnr8_content_overrides
        where site_version_id = $1::uuid and slot_key = $2::text and status = 'draft'
        limit 1
        `,
        [input.siteVersionId, override.slotKey],
      );
      const readbackValue = readbackRes.rows[0]?.value_json ?? null;
      if (!contentJsonEquals(readbackValue, override.valueJson ?? {})) {
        diagnostics.push("CONTENT_WRITE_MISMATCH_FATAL");
        throw new Error("CONTENT_WRITE_MISMATCH_FATAL");
      }
      diagnostics.push("CONTENT_WRITE_VERIFIED");
      try {
        await insertContentOverrideHistoryWithClient({
          client,
          siteId: input.siteId,
          siteVersionId: input.siteVersionId,
          slotKey: override.slotKey,
          valueType: override.valueType,
          previousValueJson: previous?.valueJson ?? null,
          nextValueJson: override.valueJson ?? {},
          action: "draft_saved",
          actorUserId: input.actorUserId ?? null,
          source: input.source ?? "batch",
        });
        historyCount += 1;
        diagnostics.push("CONTENT_HISTORY_RECORDED");
      } catch {
        diagnostics.push("CONTENT_HISTORY_WRITE_FAILED_NON_BLOCKING");
      }
    }
    return { updatedCount: affected, historyCount, skippedUnchangedCount, diagnostics };
  });
}

export async function publishDraftContentOverrides(input: {
  siteId: string;
  siteVersionId: string;
  actorUserId?: string | null;
  source?: ContentOverrideHistorySource;
}): Promise<{ publishedCount: number; draftCount: number; historyCount: number; diagnostics: string[] }> {
  return withTx(async (client) => {
    const drafts = await client.query<any>(
      `select slot_key::text, value_type::text, value_json from public.gnr8_content_overrides where site_version_id = $1::uuid and status = 'draft'`,
      [input.siteVersionId],
    );
    let count = 0;
    let historyCount = 0;
    const diagnostics: string[] = ["CONTENT_HISTORY_WRITE_STARTED"];
    if ((drafts.rows ?? []).length === 0) {
      diagnostics.push("CONTENT_PUBLISH_NO_DRAFTS_FOUND");
      return { publishedCount: 0, draftCount: 0, historyCount: 0, diagnostics };
    }
    const draftCount = drafts.rows.length;
    for (const row of drafts.rows) {
      const previousPublished = await getContentOverrideBySlotWithClient({
        client,
        siteVersionId: input.siteVersionId,
        slotKey: row.slot_key,
        status: "published",
      });
      if (
        previousPublished &&
        contentJsonEquals(previousPublished.valueJson, row.value_json) &&
        previousPublished.valueType === row.value_type
      ) {
        diagnostics.push("CONTENT_HISTORY_SKIPPED_UNCHANGED");
        continue;
      }
      const res = await client.query(
        `
        insert into public.gnr8_content_overrides (site_id, site_version_id, slot_key, value_type, value_json, status, updated_at)
        values ($1, $2::uuid, $3::text, $4::text, $5::jsonb, 'published', now())
        on conflict (site_version_id, slot_key, status)
        do update set value_type = excluded.value_type, value_json = excluded.value_json, updated_at = now()
        `,
        [input.siteId, input.siteVersionId, row.slot_key, row.value_type, JSON.stringify(row.value_json)],
      );
      count += res.rowCount ?? 0;
      try {
        await insertContentOverrideHistoryWithClient({
          client,
          siteId: input.siteId,
          siteVersionId: input.siteVersionId,
          slotKey: row.slot_key,
          valueType: row.value_type as ContentSlotType,
          previousValueJson: previousPublished?.valueJson ?? null,
          nextValueJson: row.value_json,
          action: "content_published",
          actorUserId: input.actorUserId ?? null,
          source: input.source ?? "manual",
        });
        historyCount += 1;
        diagnostics.push("CONTENT_HISTORY_RECORDED");
      } catch {
        diagnostics.push("CONTENT_HISTORY_WRITE_FAILED_NON_BLOCKING");
      }
    }
    return { publishedCount: count, draftCount, historyCount, diagnostics };
  });
}

export async function listContentOverrideHistory(input: {
  siteId?: string;
  siteVersionId: string;
  limit?: number;
}): Promise<ContentOverrideHistoryRow[]> {
  await ensureRuntimeTables();
  const client = await getSuperadminPool().connect();
  try {
    const limit = Math.max(1, Math.min(500, Math.floor(input.limit ?? 100)));
    const res = await client.query<any>(
      `
      select
        id::text,
        site_id::text,
        site_version_id::text,
        slot_key::text,
        value_type::text,
        previous_value_json,
        next_value_json,
        action::text,
        actor_user_id::text,
        source::text,
        created_at::text,
        metadata
      from public.gnr8_content_override_history
      where site_version_id = $1::uuid
        and ($2::text is null or site_id::text = $2::text)
      order by created_at desc
      limit $3::int
      `,
      [input.siteVersionId, input.siteId ?? null, limit],
    );
    return res.rows.map((row: any) => ({
      id: row.id,
      siteId: row.site_id,
      siteVersionId: row.site_version_id,
      slotKey: row.slot_key,
      valueType: row.value_type as ContentSlotType,
      previousValueJson: row.previous_value_json ?? null,
      nextValueJson: row.next_value_json,
      action: row.action as ContentOverrideHistoryAction,
      actorUserId: row.actor_user_id ?? null,
      source: row.source as ContentOverrideHistorySource,
      createdAt: row.created_at,
      metadata: (row.metadata ?? null) as Record<string, unknown> | null,
    }));
  } finally {
    client.release();
  }
}

export async function rollbackContentOverride(input: {
  siteId: string;
  siteVersionId: string;
  slotKey: string;
  historyId: string;
  targetStatus: ContentOverrideStatus;
  actorUserId?: string | null;
  source?: ContentOverrideHistorySource;
}): Promise<{ restored: boolean; diagnostics: string[] }> {
  return withTx(async (client) => {
    const historyRes = await client.query<any>(
      `
      select id::text, slot_key::text, value_type::text, previous_value_json, next_value_json
      from public.gnr8_content_override_history
      where id = $1::uuid and site_id = $2::text and site_version_id = $3::uuid
      limit 1
      `,
      [input.historyId, input.siteId, input.siteVersionId],
    );
    const history = historyRes.rows[0];
    if (!history) return { restored: false, diagnostics: ["CONTENT_ROLLBACK_FAILED"] };
    if (history.slot_key !== input.slotKey) return { restored: false, diagnostics: ["CONTENT_ROLLBACK_FAILED"] };

    const targetValue = history.previous_value_json ?? history.next_value_json;
    const current = await getContentOverrideBySlotWithClient({
      client,
      siteVersionId: input.siteVersionId,
      slotKey: input.slotKey,
      status: input.targetStatus,
    });
    if (current && contentJsonEquals(current.valueJson, targetValue) && current.valueType === history.value_type) {
      return { restored: false, diagnostics: ["CONTENT_HISTORY_SKIPPED_UNCHANGED"] };
    }

    await client.query(
      `
      insert into public.gnr8_content_overrides (site_id, site_version_id, slot_key, value_type, value_json, status, updated_at)
      values ($1::text, $2::uuid, $3::text, $4::text, $5::jsonb, $6::text, now())
      on conflict (site_version_id, slot_key, status)
      do update set value_type = excluded.value_type, value_json = excluded.value_json, updated_at = now()
      `,
      [input.siteId, input.siteVersionId, input.slotKey, history.value_type, JSON.stringify(targetValue ?? {}), input.targetStatus],
    );
    await insertContentOverrideHistoryWithClient({
      client,
      siteId: input.siteId,
      siteVersionId: input.siteVersionId,
      slotKey: input.slotKey,
      valueType: history.value_type as ContentSlotType,
      previousValueJson: current?.valueJson ?? null,
      nextValueJson: targetValue ?? {},
      action: "rollback_applied",
      actorUserId: input.actorUserId ?? null,
      source: input.source ?? "manual",
      metadata: { historyId: input.historyId, targetStatus: input.targetStatus },
    });
    return { restored: true, diagnostics: ["CONTENT_HISTORY_RECORDED", "CONTENT_ROLLBACK_APPLIED"] };
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

export const __runtimeStoreTestUtils = {
  assertNoDuplicateRuntimePageVersions,
  canonicalizeRuntimePageVersionsForInsert,
  normalizeRuntimePageVersionIdentityPath,
};
