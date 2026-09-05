import "server-only";

import { createHash, randomUUID } from "node:crypto";

import { getSuperadminPool } from "@/src/superadmin/db";
import type { SingleSitePgClient } from "./single-site-state-writer-repository";

export const AIRSHIP_SINGLE_SITE_DRAFT_SERVICE_VERSION = "airship-3-single-site-draft-service:v1" as const;
export const AIRSHIP_SINGLE_SITE_DRAFT_REPOSITORY_VERSION = "airship-3-single-site-draft-repository:v1" as const;

export type AirshipSingleSiteDraftEditStatus = "proposed" | "edited" | "accepted" | "rejected";
export type AirshipSingleSiteDraftStatus = "draft" | "mixed" | "accepted" | "rejected";

export type AirshipSingleSiteDraftEdit = {
  id: string;
  targetSectionPage: string;
  currentTextContentSummary: string;
  proposedTextContent: string;
  reasonForChange: string;
  status: AirshipSingleSiteDraftEditStatus;
  previewImpact: string;
};

export type AirshipSingleSiteDraftStyleSettings = {
  heroTopPadding: number;
  heroBottomPadding: number;
  backgroundTint: "#ecfeff" | "#eef6ff" | "#fefce8" | "#ffffff";
  ctaColor: "#0f766e" | "#1d4ed8" | "#111827" | "#047857";
};

export type AirshipSingleSiteDraftActor = {
  actorId: string;
  actorType: "human" | "system";
  actorRole: "platform_superadmin" | "internal_operator";
};

export type AirshipSingleSiteDraftSeed = {
  migrationId: string;
  tenantId: string | null;
  clientId: string | null;
  siteId: string | null;
  agencyId: string | null;
  sourceUrl: string;
  targetSiteVersionRefs: {
    originalCloneSiteVersionId: string | null;
    originalCloneRuntimeArtifactId: string | null;
    improvedCandidateSiteVersionId: string | null;
    improvedCandidateRuntimeArtifactId: string | null;
  };
  draftEdits: AirshipSingleSiteDraftEdit[];
  metadata: {
    serviceVersion?: string;
    projectionVersion?: string;
    previewPersistence?: string;
    liveSiteUrl?: string;
    liveBoundary?: "not_applied_to_live_site";
    styleSettings?: Partial<AirshipSingleSiteDraftStyleSettings>;
  };
};

export type AirshipSingleSiteDraftRecord = {
  id: string;
  migrationId: string;
  tenantId: string | null;
  clientId: string | null;
  siteId: string | null;
  agencyId: string | null;
  sourceUrl: string;
  targetSiteVersionRefs: AirshipSingleSiteDraftSeed["targetSiteVersionRefs"];
  draftEdits: AirshipSingleSiteDraftEdit[];
  draftStatus: AirshipSingleSiteDraftStatus;
  version: number;
  semanticWatermark: string;
  metadata: Record<string, unknown>;
  createdByActorId: string;
  updatedByActorId: string;
  acceptedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AirshipSingleSiteDraftRepository = {
  readCurrentDraftByMigrationId(migrationId: string): Promise<AirshipSingleSiteDraftRecord | null>;
  createOrReuseDraft(input: AirshipSingleSiteDraftCreateInput): Promise<AirshipSingleSiteDraftRecord>;
  updateDraftEditText(input: AirshipSingleSiteDraftEditTextInput): Promise<AirshipSingleSiteDraftRecord>;
  updateDraftStyleSettings(input: AirshipSingleSiteDraftStyleSettingsInput): Promise<AirshipSingleSiteDraftRecord>;
  markDraftEditAccepted(input: AirshipSingleSiteDraftEditDecisionInput): Promise<AirshipSingleSiteDraftRecord>;
  markDraftEditRejected(input: AirshipSingleSiteDraftEditDecisionInput): Promise<AirshipSingleSiteDraftRecord>;
};

export type AirshipSingleSiteDraftCreateInput = AirshipSingleSiteDraftSeed & {
  actor: AirshipSingleSiteDraftActor;
  correlationId?: string | null;
  idempotencyKey?: string | null;
};

export type AirshipSingleSiteDraftEditTextInput = AirshipSingleSiteDraftSeed & {
  draftEditId: string;
  proposedTextContent: string;
  actor: AirshipSingleSiteDraftActor;
  correlationId?: string | null;
  idempotencyKey?: string | null;
};

export type AirshipSingleSiteDraftEditDecisionInput = AirshipSingleSiteDraftSeed & {
  draftEditId: string;
  actor: AirshipSingleSiteDraftActor;
  correlationId?: string | null;
  idempotencyKey?: string | null;
};

export type AirshipSingleSiteDraftStyleSettingsInput = AirshipSingleSiteDraftSeed & {
  styleSettings: Partial<AirshipSingleSiteDraftStyleSettings>;
  actor: AirshipSingleSiteDraftActor;
  correlationId?: string | null;
  idempotencyKey?: string | null;
};

type QueryResult<T> = {
  rows: T[];
};

type PoolLike = {
  connect(): Promise<SingleSitePgClient & { release?: () => void }>;
};

export const DEFAULT_AIRSHIP_SINGLE_SITE_DRAFT_STYLE_SETTINGS: AirshipSingleSiteDraftStyleSettings = {
  heroTopPadding: 72,
  heroBottomPadding: 72,
  backgroundTint: "#ecfeff",
  ctaColor: "#0f766e",
};

const AIRSHIP_STYLE_DRAFT_EDIT_ID = "airship-editor-style-settings";
const SAFE_METADATA_KEYS = new Set(["serviceVersion", "projectionVersion", "previewPersistence", "liveSiteUrl", "liveBoundary", "styleSettings"]);
const UNSAFE_METADATA_VALUE = /secret|password|credential|token|cookie|billing|stripe|payment|openprovider|raw sql|stack trace|database_url|openai_api_key/i;
const SAFE_BACKGROUND_TINTS = new Set<AirshipSingleSiteDraftStyleSettings["backgroundTint"]>(["#ecfeff", "#eef6ff", "#fefce8", "#ffffff"]);
const SAFE_CTA_COLORS = new Set<AirshipSingleSiteDraftStyleSettings["ctaColor"]>(["#0f766e", "#1d4ed8", "#111827", "#047857"]);

function text(field: string, value: unknown, options: { max?: number; nullable?: boolean } = {}): string | null {
  if (value === undefined || value === null) {
    if (options.nullable) return null;
    throw new Error(`${field}_required`);
  }
  const normalized = String(value).trim();
  if (!normalized) {
    if (options.nullable) return null;
    throw new Error(`${field}_required`);
  }
  if (options.max && normalized.length > options.max) throw new Error(`${field}_too_long`);
  return normalized;
}

function safeMetadata(metadata: AirshipSingleSiteDraftSeed["metadata"]): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (key === "styleSettings") {
      safe.styleSettings = sanitizeDraftStyleSettings(value);
      continue;
    }
    const normalized = String(value).trim();
    if (!normalized || UNSAFE_METADATA_VALUE.test(normalized)) continue;
    safe[key] = normalized;
  }
  return safe;
}

function metadataWithPreservedStyleSettings(
  seedMetadata: AirshipSingleSiteDraftSeed["metadata"],
  currentMetadata: Record<string, unknown>,
): Record<string, unknown> {
  const safe = safeMetadata(seedMetadata);
  const currentStyleSettings = sanitizeDraftStyleSettings(currentMetadata.styleSettings);
  const seedStyleSettings = safe.styleSettings as AirshipSingleSiteDraftStyleSettings | undefined;
  return {
    ...safe,
    styleSettings: seedStyleSettings ?? currentStyleSettings,
  };
}

function numberInRange(value: unknown, fallback: number): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(24, Math.min(140, Math.round(numeric)));
}

export function sanitizeDraftStyleSettings(value: unknown): AirshipSingleSiteDraftStyleSettings {
  const record = jsonObject(value);
  const backgroundTint = SAFE_BACKGROUND_TINTS.has(record.backgroundTint as AirshipSingleSiteDraftStyleSettings["backgroundTint"])
    ? record.backgroundTint as AirshipSingleSiteDraftStyleSettings["backgroundTint"]
    : DEFAULT_AIRSHIP_SINGLE_SITE_DRAFT_STYLE_SETTINGS.backgroundTint;
  const ctaColor = SAFE_CTA_COLORS.has(record.ctaColor as AirshipSingleSiteDraftStyleSettings["ctaColor"])
    ? record.ctaColor as AirshipSingleSiteDraftStyleSettings["ctaColor"]
    : DEFAULT_AIRSHIP_SINGLE_SITE_DRAFT_STYLE_SETTINGS.ctaColor;
  return {
    heroTopPadding: numberInRange(record.heroTopPadding, DEFAULT_AIRSHIP_SINGLE_SITE_DRAFT_STYLE_SETTINGS.heroTopPadding),
    heroBottomPadding: numberInRange(record.heroBottomPadding, DEFAULT_AIRSHIP_SINGLE_SITE_DRAFT_STYLE_SETTINGS.heroBottomPadding),
    backgroundTint,
    ctaColor,
  };
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return jsonObject(JSON.parse(value));
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return {};
  return value as Record<string, unknown>;
}

function jsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function dateText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function sanitizeEdit(edit: AirshipSingleSiteDraftEdit): AirshipSingleSiteDraftEdit {
  const status = edit.status === "accepted" || edit.status === "rejected" || edit.status === "edited" ? edit.status : "proposed";
  return {
    id: text("draftEditId", edit.id, { max: 160 }) ?? "",
    targetSectionPage: text("targetSectionPage", edit.targetSectionPage, { max: 300 }) ?? "",
    currentTextContentSummary: text("currentTextContentSummary", edit.currentTextContentSummary, { max: 2000 }) ?? "",
    proposedTextContent: text("proposedTextContent", edit.proposedTextContent, { max: 5000 }) ?? "",
    reasonForChange: text("reasonForChange", edit.reasonForChange, { max: 2000 }) ?? "",
    status,
    previewImpact: text("previewImpact", edit.previewImpact, { max: 2000 }) ?? "",
  };
}

function sanitizeDraftEdits(edits: AirshipSingleSiteDraftEdit[]): AirshipSingleSiteDraftEdit[] {
  const seen = new Set<string>();
  return edits.map(sanitizeEdit).filter((edit) => {
    if (seen.has(edit.id)) return false;
    seen.add(edit.id);
    return true;
  });
}

function deriveDraftStatus(edits: readonly AirshipSingleSiteDraftEdit[]): AirshipSingleSiteDraftStatus {
  if (edits.length === 0) return "draft";
  if (edits.every((edit) => edit.status === "accepted")) return "accepted";
  if (edits.every((edit) => edit.status === "rejected")) return "rejected";
  if (edits.some((edit) => edit.status === "accepted" || edit.status === "rejected")) return "mixed";
  return "draft";
}

function semanticWatermark(input: {
  migrationId: string;
  sourceUrl: string;
  targetSiteVersionRefs: AirshipSingleSiteDraftSeed["targetSiteVersionRefs"];
  draftEdits: AirshipSingleSiteDraftEdit[];
  draftStatus: AirshipSingleSiteDraftStatus;
  version: number;
}): string {
  const digest = createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
  return `airship-single-site-editor-draft:${digest}`;
}

function stableDigest(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function seedWithSafeValues(seed: AirshipSingleSiteDraftSeed): AirshipSingleSiteDraftSeed {
  return {
    migrationId: text("migrationId", seed.migrationId, { max: 80 }) ?? "",
    tenantId: text("tenantId", seed.tenantId, { max: 120, nullable: true }),
    clientId: text("clientId", seed.clientId, { max: 120, nullable: true }),
    siteId: text("siteId", seed.siteId, { max: 120, nullable: true }),
    agencyId: text("agencyId", seed.agencyId, { max: 120, nullable: true }),
    sourceUrl: text("sourceUrl", seed.sourceUrl, { max: 1000 }) ?? "",
    targetSiteVersionRefs: {
      originalCloneSiteVersionId: text("originalCloneSiteVersionId", seed.targetSiteVersionRefs.originalCloneSiteVersionId, { max: 120, nullable: true }),
      originalCloneRuntimeArtifactId: text("originalCloneRuntimeArtifactId", seed.targetSiteVersionRefs.originalCloneRuntimeArtifactId, { max: 120, nullable: true }),
      improvedCandidateSiteVersionId: text("improvedCandidateSiteVersionId", seed.targetSiteVersionRefs.improvedCandidateSiteVersionId, { max: 120, nullable: true }),
      improvedCandidateRuntimeArtifactId: text("improvedCandidateRuntimeArtifactId", seed.targetSiteVersionRefs.improvedCandidateRuntimeArtifactId, { max: 120, nullable: true }),
    },
    draftEdits: sanitizeDraftEdits(seed.draftEdits),
    metadata: safeMetadata(seed.metadata),
  };
}

function eventInput(input: { migrationId: string; actor: AirshipSingleSiteDraftActor; correlationId?: string | null; idempotencyKey?: string | null }) {
  return {
    actorId: text("actorId", input.actor.actorId, { max: 160 }) ?? "",
    actorType: input.actor.actorType,
    actorRole: input.actor.actorRole,
    correlationId: text("correlationId", input.correlationId, { max: 200, nullable: true }) ?? `airship:${input.migrationId}:${randomUUID()}`,
    idempotencyKey: text("idempotencyKey", input.idempotencyKey, { max: 240, nullable: true }) ?? `airship:${input.migrationId}:${randomUUID()}`,
  };
}

function rowToRecord(row: Record<string, unknown>): AirshipSingleSiteDraftRecord {
  return {
    id: String(row.id),
    migrationId: String(row.migration_id),
    tenantId: dateText(row.tenant_id),
    clientId: dateText(row.client_id),
    siteId: dateText(row.site_id),
    agencyId: dateText(row.agency_id),
    sourceUrl: String(row.source_url),
    targetSiteVersionRefs: jsonObject(row.target_site_version_refs_json) as AirshipSingleSiteDraftRecord["targetSiteVersionRefs"],
    draftEdits: sanitizeDraftEdits(jsonArray(row.draft_edits_json).map((item) => jsonObject(item) as AirshipSingleSiteDraftEdit)),
    draftStatus: String(row.draft_status) as AirshipSingleSiteDraftStatus,
    version: Number(row.version) || 1,
    semanticWatermark: String(row.semantic_watermark),
    metadata: jsonObject(row.metadata_json),
    createdByActorId: String(row.created_by_actor_id),
    updatedByActorId: String(row.updated_by_actor_id),
    acceptedAt: dateText(row.accepted_at),
    rejectedAt: dateText(row.rejected_at),
    createdAt: dateText(row.created_at) ?? "",
    updatedAt: dateText(row.updated_at) ?? "",
  };
}

async function withTransaction<T>(pool: PoolLike, fn: (client: SingleSitePgClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  let started = false;
  try {
    await client.query("begin");
    started = true;
    const result = await fn(client);
    await client.query("commit");
    started = false;
    return result;
  } catch (error) {
    if (started) {
      try {
        await client.query("rollback");
      } catch {
        // Best-effort cleanup only.
      }
    }
    throw error;
  } finally {
    client.release?.();
  }
}

export class PostgresAirshipSingleSiteDraftRepository implements AirshipSingleSiteDraftRepository {
  constructor(private readonly pool: PoolLike = getSuperadminPool()) {}

  async readCurrentDraftByMigrationId(migrationId: string): Promise<AirshipSingleSiteDraftRecord | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `
        select
          *,
          accepted_at::text as accepted_at,
          rejected_at::text as rejected_at,
          created_at::text as created_at,
          updated_at::text as updated_at
        from public.gnr8_airship_single_site_editor_drafts
        where migration_id = $1::uuid
        limit 1
        `,
        [text("migrationId", migrationId, { max: 80 })],
      ) as QueryResult<Record<string, unknown>>;
      return result.rows[0] ? rowToRecord(result.rows[0]) : null;
    } finally {
      client.release?.();
    }
  }

  async createOrReuseDraft(input: AirshipSingleSiteDraftCreateInput): Promise<AirshipSingleSiteDraftRecord> {
    const seed = seedWithSafeValues(input);
    const event = eventInput(input);
    return withTransaction(this.pool, async (client) => {
      const existing = await this.readCurrentDraftInTx(client, seed.migrationId);
      const row = existing
        ? await this.refreshDraftIdentity(client, existing, seed, event.actorId)
        : await this.insertDraft(client, seed, event.actorId);
      await this.insertEvent(client, {
        draft: row,
        action: existing ? "draft_reused" : "draft_created",
        draftEditId: null,
        event,
        summary: {
          sourceUrl: row.sourceUrl,
          savedAirshipDraft: true,
          notAppliedToLiveSite: true,
          notPublished: true,
        },
      });
      return row;
    });
  }

  async updateDraftEditText(input: AirshipSingleSiteDraftEditTextInput): Promise<AirshipSingleSiteDraftRecord> {
    const draft = await this.createOrReuseDraft(input);
    const draftEditId = text("draftEditId", input.draftEditId, { max: 160 }) ?? "";
    const proposedTextContent = text("proposedTextContent", input.proposedTextContent, { max: 5000 }) ?? "";
    const event = eventInput(input);
    return withTransaction(this.pool, async (client) => {
      const current = await this.readCurrentDraftInTx(client, draft.migrationId);
      if (!current) throw new Error("airship_draft_missing_after_create");
      const draftEdits = current.draftEdits.map((edit) =>
        edit.id === draftEditId ? { ...edit, proposedTextContent, status: edit.proposedTextContent === proposedTextContent ? edit.status : "edited" as const } : edit,
      );
      if (!draftEdits.some((edit) => edit.id === draftEditId)) throw new Error("airship_draft_edit_not_found");
      const updated = await this.updateDraft(client, current, draftEdits, event.actorId);
      await this.insertEvent(client, {
        draft: updated,
        action: "edit_saved",
        draftEditId,
        event,
        summary: { draftEditId, savedAirshipDraft: true, notAppliedToLiveSite: true, notPublished: true },
      });
      return updated;
    });
  }

  async updateDraftStyleSettings(input: AirshipSingleSiteDraftStyleSettingsInput): Promise<AirshipSingleSiteDraftRecord> {
    const draft = await this.createOrReuseDraft(input);
    const styleSettings = sanitizeDraftStyleSettings(input.styleSettings);
    const event = eventInput(input);
    return withTransaction(this.pool, async (client) => {
      const current = await this.readCurrentDraftInTx(client, draft.migrationId);
      if (!current) throw new Error("airship_draft_missing_after_create");
      const metadata = {
        ...current.metadata,
        styleSettings,
      };
      const updated = await this.updateDraftMetadata(client, current, metadata, event.actorId);
      await this.insertEvent(client, {
        draft: updated,
        action: "edit_saved",
        draftEditId: AIRSHIP_STYLE_DRAFT_EDIT_ID,
        event,
        summary: { draftEditId: AIRSHIP_STYLE_DRAFT_EDIT_ID, savedAirshipDraft: true, styleSettingsSaved: true, notAppliedToLiveSite: true, notPublished: true },
      });
      return updated;
    });
  }

  async markDraftEditAccepted(input: AirshipSingleSiteDraftEditDecisionInput): Promise<AirshipSingleSiteDraftRecord> {
    return this.markDraftEdit(input, "accepted", "edit_accepted");
  }

  async markDraftEditRejected(input: AirshipSingleSiteDraftEditDecisionInput): Promise<AirshipSingleSiteDraftRecord> {
    return this.markDraftEdit(input, "rejected", "edit_rejected");
  }

  private async markDraftEdit(
    input: AirshipSingleSiteDraftEditDecisionInput,
    status: "accepted" | "rejected",
    action: "edit_accepted" | "edit_rejected",
  ): Promise<AirshipSingleSiteDraftRecord> {
    const draft = await this.createOrReuseDraft(input);
    const draftEditId = text("draftEditId", input.draftEditId, { max: 160 }) ?? "";
    const event = eventInput(input);
    return withTransaction(this.pool, async (client) => {
      const current = await this.readCurrentDraftInTx(client, draft.migrationId);
      if (!current) throw new Error("airship_draft_missing_after_create");
      const draftEdits = current.draftEdits.map((edit) => edit.id === draftEditId ? { ...edit, status } : edit);
      if (!draftEdits.some((edit) => edit.id === draftEditId)) throw new Error("airship_draft_edit_not_found");
      const updated = await this.updateDraft(client, current, draftEdits, event.actorId);
      await this.insertEvent(client, {
        draft: updated,
        action,
        draftEditId,
        event,
        summary: { draftEditId, savedAirshipDraft: true, notAppliedToLiveSite: true, notPublished: true },
      });
      return updated;
    });
  }

  private async readCurrentDraftInTx(client: SingleSitePgClient, migrationId: string): Promise<AirshipSingleSiteDraftRecord | null> {
    const result = await client.query(
      `
      select
        *,
        accepted_at::text as accepted_at,
        rejected_at::text as rejected_at,
        created_at::text as created_at,
        updated_at::text as updated_at
      from public.gnr8_airship_single_site_editor_drafts
      where migration_id = $1::uuid
      limit 1
      for update
      `,
      [migrationId],
    ) as QueryResult<Record<string, unknown>>;
    return result.rows[0] ? rowToRecord(result.rows[0]) : null;
  }

  private async insertDraft(client: SingleSitePgClient, seed: AirshipSingleSiteDraftSeed, actorId: string): Promise<AirshipSingleSiteDraftRecord> {
    const draftStatus = deriveDraftStatus(seed.draftEdits);
    const watermark = semanticWatermark({
      migrationId: seed.migrationId,
      sourceUrl: seed.sourceUrl,
      targetSiteVersionRefs: seed.targetSiteVersionRefs,
      draftEdits: seed.draftEdits,
      draftStatus,
      version: 1,
    });
    const result = await client.query(
      `
      insert into public.gnr8_airship_single_site_editor_drafts (
        migration_id,
        tenant_id,
        client_id,
        site_id,
        agency_id,
        source_url,
        target_site_version_refs_json,
        draft_edits_json,
        draft_status,
        version,
        semantic_watermark,
        metadata_json,
        created_by_actor_id,
        updated_by_actor_id
      )
      values ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, 1, $10, $11::jsonb, $12, $12)
      returning *, accepted_at::text as accepted_at, rejected_at::text as rejected_at, created_at::text as created_at, updated_at::text as updated_at
      `,
      [
        seed.migrationId,
        seed.tenantId,
        seed.clientId,
        seed.siteId,
        seed.agencyId,
        seed.sourceUrl,
        JSON.stringify(seed.targetSiteVersionRefs),
        JSON.stringify(seed.draftEdits),
        draftStatus,
        watermark,
        JSON.stringify(seed.metadata),
        actorId,
      ],
    ) as QueryResult<Record<string, unknown>>;
    return rowToRecord(result.rows[0]);
  }

  private async refreshDraftIdentity(
    client: SingleSitePgClient,
    current: AirshipSingleSiteDraftRecord,
    seed: AirshipSingleSiteDraftSeed,
    actorId: string,
  ): Promise<AirshipSingleSiteDraftRecord> {
    const watermark = semanticWatermark({
      migrationId: current.migrationId,
      sourceUrl: seed.sourceUrl,
      targetSiteVersionRefs: seed.targetSiteVersionRefs,
      draftEdits: current.draftEdits,
      draftStatus: current.draftStatus,
      version: current.version,
    });
    const result = await client.query(
      `
      update public.gnr8_airship_single_site_editor_drafts
      set
        tenant_id = $2,
        client_id = $3,
        site_id = $4,
        agency_id = $5,
        source_url = $6,
        target_site_version_refs_json = $7::jsonb,
        semantic_watermark = $8,
        metadata_json = $9::jsonb,
        updated_by_actor_id = $10,
        updated_at = now()
      where id = $1::uuid
      returning *, accepted_at::text as accepted_at, rejected_at::text as rejected_at, created_at::text as created_at, updated_at::text as updated_at
      `,
      [
        current.id,
        seed.tenantId,
        seed.clientId,
        seed.siteId,
        seed.agencyId,
        seed.sourceUrl,
        JSON.stringify(seed.targetSiteVersionRefs),
        watermark,
        JSON.stringify(metadataWithPreservedStyleSettings(seed.metadata, current.metadata)),
        actorId,
      ],
    ) as QueryResult<Record<string, unknown>>;
    return rowToRecord(result.rows[0]);
  }

  private async updateDraft(
    client: SingleSitePgClient,
    current: AirshipSingleSiteDraftRecord,
    draftEdits: AirshipSingleSiteDraftEdit[],
    actorId: string,
  ): Promise<AirshipSingleSiteDraftRecord> {
    const nextVersion = current.version + 1;
    const draftStatus = deriveDraftStatus(draftEdits);
    const watermark = semanticWatermark({
      migrationId: current.migrationId,
      sourceUrl: current.sourceUrl,
      targetSiteVersionRefs: current.targetSiteVersionRefs,
      draftEdits,
      draftStatus,
      version: nextVersion,
    });
    const result = await client.query(
      `
      update public.gnr8_airship_single_site_editor_drafts
      set
        draft_edits_json = $2::jsonb,
        draft_status = $3,
        version = $4,
        semantic_watermark = $5,
        updated_by_actor_id = $6,
        accepted_at = case when $3 = 'accepted' then now() else accepted_at end,
        rejected_at = case when $3 = 'rejected' then now() else rejected_at end,
        updated_at = now()
      where id = $1::uuid
      returning *, accepted_at::text as accepted_at, rejected_at::text as rejected_at, created_at::text as created_at, updated_at::text as updated_at
      `,
      [current.id, JSON.stringify(draftEdits), draftStatus, nextVersion, watermark, actorId],
    ) as QueryResult<Record<string, unknown>>;
    return rowToRecord(result.rows[0]);
  }

  private async updateDraftMetadata(
    client: SingleSitePgClient,
    current: AirshipSingleSiteDraftRecord,
    metadata: Record<string, unknown>,
    actorId: string,
  ): Promise<AirshipSingleSiteDraftRecord> {
    const nextVersion = current.version + 1;
    const watermark = semanticWatermark({
      migrationId: current.migrationId,
      sourceUrl: current.sourceUrl,
      targetSiteVersionRefs: current.targetSiteVersionRefs,
      draftEdits: current.draftEdits,
      draftStatus: current.draftStatus,
      version: nextVersion,
    });
    const result = await client.query(
      `
      update public.gnr8_airship_single_site_editor_drafts
      set
        version = $2,
        semantic_watermark = $3,
        metadata_json = $4::jsonb,
        updated_by_actor_id = $5,
        updated_at = now()
      where id = $1::uuid
      returning *, accepted_at::text as accepted_at, rejected_at::text as rejected_at, created_at::text as created_at, updated_at::text as updated_at
      `,
      [current.id, nextVersion, watermark, JSON.stringify(safeMetadata(metadata as AirshipSingleSiteDraftSeed["metadata"])), actorId],
    ) as QueryResult<Record<string, unknown>>;
    return rowToRecord(result.rows[0]);
  }

  private async insertEvent(
    client: SingleSitePgClient,
    input: {
      draft: AirshipSingleSiteDraftRecord;
      action: "draft_created" | "draft_reused" | "edit_saved" | "edit_accepted" | "edit_rejected";
      draftEditId: string | null;
      event: ReturnType<typeof eventInput>;
      summary: Record<string, unknown>;
    },
  ): Promise<void> {
    const idempotencySeed = `${input.event.idempotencyKey}:${input.action}:${input.draftEditId ?? "draft"}`;
    const idempotencyKey =
      idempotencySeed.length <= 240 ? idempotencySeed : `airship:${input.draft.migrationId}:${stableDigest(idempotencySeed)}`;

    await client.query(
      `
      insert into public.gnr8_airship_single_site_editor_draft_events (
        draft_id,
        migration_id,
        event_index,
        event_action,
        draft_edit_id,
        draft_status,
        actor_id,
        actor_type,
        actor_role,
        summary_json,
        metadata_json,
        correlation_id,
        idempotency_key
      )
      values (
        $1::uuid,
        $2::uuid,
        coalesce((select max(event_index) + 1 from public.gnr8_airship_single_site_editor_draft_events where draft_id = $1::uuid), 1),
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9::jsonb,
        $10::jsonb,
        $11,
        $12
      )
      on conflict (idempotency_key) do nothing
      `,
      [
        input.draft.id,
        input.draft.migrationId,
        input.action,
        input.draftEditId,
        input.draft.draftStatus,
        input.event.actorId,
        input.event.actorType,
        input.event.actorRole,
        JSON.stringify(input.summary),
        JSON.stringify({ serviceVersion: AIRSHIP_SINGLE_SITE_DRAFT_SERVICE_VERSION }),
        input.event.correlationId,
        idempotencyKey,
      ],
    );
  }
}

export class AirshipSingleSiteDraftService {
  constructor(private readonly repository: AirshipSingleSiteDraftRepository = new PostgresAirshipSingleSiteDraftRepository()) {}

  readCurrentDraft(migrationId: string): Promise<AirshipSingleSiteDraftRecord | null> {
    return this.repository.readCurrentDraftByMigrationId(text("migrationId", migrationId, { max: 80 }) ?? "");
  }

  createOrReuseDraft(input: AirshipSingleSiteDraftCreateInput): Promise<AirshipSingleSiteDraftRecord> {
    return this.repository.createOrReuseDraft({ ...input, ...seedWithSafeValues(input) });
  }

  updateDraftEditText(input: AirshipSingleSiteDraftEditTextInput): Promise<AirshipSingleSiteDraftRecord> {
    return this.repository.updateDraftEditText({
      ...input,
      ...seedWithSafeValues(input),
      draftEditId: text("draftEditId", input.draftEditId, { max: 160 }) ?? "",
      proposedTextContent: text("proposedTextContent", input.proposedTextContent, { max: 5000 }) ?? "",
    });
  }

  updateDraftStyleSettings(input: AirshipSingleSiteDraftStyleSettingsInput): Promise<AirshipSingleSiteDraftRecord> {
    return this.repository.updateDraftStyleSettings({
      ...input,
      ...seedWithSafeValues(input),
      styleSettings: sanitizeDraftStyleSettings(input.styleSettings),
    });
  }

  markDraftEditAccepted(input: AirshipSingleSiteDraftEditDecisionInput): Promise<AirshipSingleSiteDraftRecord> {
    return this.repository.markDraftEditAccepted({
      ...input,
      ...seedWithSafeValues(input),
      draftEditId: text("draftEditId", input.draftEditId, { max: 160 }) ?? "",
    });
  }

  markDraftEditRejected(input: AirshipSingleSiteDraftEditDecisionInput): Promise<AirshipSingleSiteDraftRecord> {
    return this.repository.markDraftEditRejected({
      ...input,
      ...seedWithSafeValues(input),
      draftEditId: text("draftEditId", input.draftEditId, { max: 160 }) ?? "",
    });
  }
}
