import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  AirshipSingleSiteDraftService,
  AIRSHIP_SINGLE_SITE_DRAFT_SERVICE_VERSION,
  type AirshipSingleSiteDraftCreateInput,
  type AirshipSingleSiteDraftRecord,
  type AirshipSingleSiteDraftRepository,
} from "./airship-single-site-draft-service";

const MIGRATION_ID = "682a09fd-8fd5-4f73-93b8-54f5d4067c63";
const PLATFORM_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SQL_PATH = path.join(PLATFORM_ROOT, "supabase/migrations/20260902120000_airship_single_site_editor_drafts.sql");

function createInput(): AirshipSingleSiteDraftCreateInput {
  return {
    migrationId: MIGRATION_ID,
    tenantId: "tenant-chs",
    clientId: "client-chs",
    siteId: "site-chs",
    agencyId: null,
    sourceUrl: "https://www.chs.si/",
    targetSiteVersionRefs: {
      originalCloneSiteVersionId: "6b172a5b-200e-471c-9599-5dc70f04ea53",
      originalCloneRuntimeArtifactId: "929106cd-fa19-47eb-9582-ce6931d0e370",
      improvedCandidateSiteVersionId: "a3f9493e-9da4-4ef8-8608-154fe6d25a0f",
      improvedCandidateRuntimeArtifactId: "1f80138a-39c2-4210-ac61-16200e5a2254",
    },
    draftEdits: [
      {
        id: "airship-chs-home-hero-headline",
        targetSectionPage: "Homepage / hero headline",
        currentTextContentSummary: "Captured CHS source headline.",
        proposedTextContent: "Less risk. More control. Better IT.",
        reasonForChange: "Stay source-supported.",
        status: "proposed",
        previewImpact: "Hero headline changes in the Airship draft preview only.",
      },
      {
        id: "airship-chs-home-contact-cta",
        targetSectionPage: "Homepage / contact call-to-action",
        currentTextContentSummary: "Captured CHS contact evidence.",
        proposedTextContent: "Contact CHS at sales@chs.si",
        reasonForChange: "Clarify contact path.",
        status: "proposed",
        previewImpact: "CTA changes in the Airship draft preview only.",
      },
    ],
    metadata: {
      serviceVersion: AIRSHIP_SINGLE_SITE_DRAFT_SERVICE_VERSION,
      projectionVersion: "airship-1-single-site-editor-readonly:v1",
      previewPersistence: "browser_local_only",
      liveSiteUrl: "https://www.chs.si/",
      liveBoundary: "not_applied_to_live_site",
    },
    actor: {
      actorId: "superadmin-test",
      actorType: "human",
      actorRole: "platform_superadmin",
    },
  };
}

function record(input: AirshipSingleSiteDraftCreateInput, overrides: Partial<AirshipSingleSiteDraftRecord> = {}): AirshipSingleSiteDraftRecord {
  return {
    id: "draft-chs",
    migrationId: input.migrationId,
    tenantId: input.tenantId,
    clientId: input.clientId,
    siteId: input.siteId,
    agencyId: input.agencyId,
    sourceUrl: input.sourceUrl,
    targetSiteVersionRefs: input.targetSiteVersionRefs,
    draftEdits: input.draftEdits,
    draftStatus: "draft",
    version: 1,
    semanticWatermark: "airship-single-site-editor-draft:test",
    metadata: input.metadata,
    createdByActorId: input.actor.actorId,
    updatedByActorId: input.actor.actorId,
    acceptedAt: null,
    rejectedAt: null,
    createdAt: "2026-09-02T00:00:00.000Z",
    updatedAt: "2026-09-02T00:00:00.000Z",
    ...overrides,
  };
}

function fakeRepository() {
  const calls: string[] = [];
  const input = createInput();
  let current = record(input);
  const repository: AirshipSingleSiteDraftRepository = {
    async readCurrentDraftByMigrationId(migrationId) {
      calls.push(`read:${migrationId}`);
      return current;
    },
    async createOrReuseDraft(nextInput) {
      calls.push("create_or_reuse");
      current = record(nextInput, { id: current.id, draftEdits: current.draftEdits, version: current.version });
      return current;
    },
    async updateDraftEditText(nextInput) {
      calls.push(`update:${nextInput.draftEditId}`);
      current = record(nextInput, {
        id: current.id,
        draftEdits: current.draftEdits.map((edit) =>
          edit.id === nextInput.draftEditId ? { ...edit, proposedTextContent: nextInput.proposedTextContent, status: "edited" } : edit,
        ),
        version: current.version + 1,
      });
      return current;
    },
    async markDraftEditAccepted(nextInput) {
      calls.push(`accept:${nextInput.draftEditId}`);
      current = record(nextInput, {
        id: current.id,
        draftEdits: current.draftEdits.map((edit) => edit.id === nextInput.draftEditId ? { ...edit, status: "accepted" } : edit),
        draftStatus: "mixed",
        version: current.version + 1,
      });
      return current;
    },
    async markDraftEditRejected(nextInput) {
      calls.push(`reject:${nextInput.draftEditId}`);
      current = record(nextInput, {
        id: current.id,
        draftEdits: current.draftEdits.map((edit) => edit.id === nextInput.draftEditId ? { ...edit, status: "rejected" } : edit),
        draftStatus: "mixed",
        version: current.version + 1,
      });
      return current;
    },
  };
  return { repository, calls };
}

test("airship draft service exposes create, read, edit save, accept, and reject operations", async () => {
  const fake = fakeRepository();
  const service = new AirshipSingleSiteDraftService(fake.repository);
  const input = createInput();

  assert.equal((await service.readCurrentDraft(MIGRATION_ID))?.id, "draft-chs");
  assert.equal((await service.createOrReuseDraft(input)).sourceUrl, "https://www.chs.si/");
  assert.equal(
    (await service.updateDraftEditText({
      ...input,
      draftEditId: "airship-chs-home-hero-headline",
      proposedTextContent: "CHS helps modernize enterprise IT",
    })).draftEdits[0]?.proposedTextContent,
    "CHS helps modernize enterprise IT",
  );
  assert.equal((await service.markDraftEditAccepted({ ...input, draftEditId: "airship-chs-home-hero-headline" })).draftEdits[0]?.status, "accepted");
  assert.equal((await service.markDraftEditRejected({ ...input, draftEditId: "airship-chs-home-contact-cta" })).draftEdits[1]?.status, "rejected");

  assert.deepEqual(fake.calls, [
    `read:${MIGRATION_ID}`,
    "create_or_reuse",
    "update:airship-chs-home-hero-headline",
    "accept:airship-chs-home-hero-headline",
    "reject:airship-chs-home-contact-cta",
  ]);
});

test("airship draft service rejects missing required edit text before repository write", async () => {
  const fake = fakeRepository();
  const service = new AirshipSingleSiteDraftService(fake.repository);

  assert.throws(
    () => service.updateDraftEditText({
      ...createInput(),
      draftEditId: "airship-chs-home-hero-headline",
      proposedTextContent: "",
    }),
    /proposedTextContent_required/,
  );
});

test("airship draft migration is closed to client roles and draft-only", () => {
  const sql = readFileSync(SQL_PATH, "utf8");

  assert.match(sql, /create table if not exists public\.gnr8_airship_single_site_editor_drafts/i);
  assert.match(sql, /create table if not exists public\.gnr8_airship_single_site_editor_draft_events/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /revoke all on table public\.gnr8_airship_single_site_editor_drafts from anon, authenticated/i);
  assert.match(sql, /revoke all on table public\.gnr8_airship_single_site_editor_draft_events from anon, authenticated/i);
  assert.match(sql, /draft events are append-only/i);
  assert.doesNotMatch(sql, /grant\s+(select|insert|update|delete)/i);
  assert.doesNotMatch(sql, /gnr8_runtime_active_pointers|active_site_version_id|publishApprovedSiteVersion|shadow_publish|dry_run/i);
});
