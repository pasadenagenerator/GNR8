import "server-only";

import { createHash } from "node:crypto";

import type { CanonicalPageVersionInput, CanonicalSiteVersionSnapshot, RuntimeArtifact, RuntimeImportProvenanceSummary } from "../runtime/types";
import { buildDeterministicArtifactBundle } from "../runtime/artifact-builder";
import {
  bindArtifactToVersion,
  createArtifact,
  createSiteVersionFromMigration,
  getActivePointerForSite,
  getArtifactById,
  getSiteVersion,
} from "../runtime/runtime-store";
import { getSuperadminPool } from "@/src/superadmin/db";
import type { AirshipSingleSiteDraftEdit, AirshipSingleSiteDraftRecord } from "./airship-single-site-draft-service";

export const AIRSHIP_SINGLE_SITE_DRAFT_CANDIDATE_SERVICE_VERSION = "airship-4-draft-candidate-service:v1" as const;

export const AIRSHIP_DRAFT_CANDIDATE_PREVIEW_ROUTE_PREFIX = "/api/gnr8/admin/single-site-studio/versions" as const;

const HEADLINE_DRAFT_ID = "airship-chs-home-hero-headline";
const SUBHEADING_DRAFT_ID = "airship-chs-home-hero-value-proposition";
const CTA_DRAFT_ID = "airship-chs-home-contact-cta";

type RuntimePrimitiveDeps = {
  getSiteVersion: typeof getSiteVersion;
  getArtifactById: typeof getArtifactById;
  getActivePointerForSite: typeof getActivePointerForSite;
  createSiteVersionFromMigration: typeof createSiteVersionFromMigration;
  buildDeterministicArtifactBundle: typeof buildDeterministicArtifactBundle;
  createArtifact: typeof createArtifact;
  bindArtifactToVersion: typeof bindArtifactToVersion;
};

export type AirshipDraftCandidateDependencies = Partial<RuntimePrimitiveDeps>;

export type AirshipDraftCandidatePreviewRef = {
  label: "New Airship draft candidate preview";
  siteVersionId: string;
  runtimeArtifactId: string;
  route: string;
  mode: "transformed";
  available: true;
  unavailableReason: null;
  authNote: string;
  statusLabel: "Not live, internal preview only";
  sourceLiveSiteVersionId: string;
  sourceLiveRuntimeArtifactId: string;
  draftId: string;
  draftVersion: number;
  appliedEdits: Array<{
    draftEditId: string;
    targetSectionPage: string;
    appliedTextContent: string;
  }>;
  skippedEdits: Array<{
    draftEditId: string;
    targetSectionPage: string;
    skippedTextContent: string;
    reason: "rejected";
  }>;
};

export type AirshipDraftCandidateCreationOutput = {
  status: "created" | "reused";
  serviceVersion: typeof AIRSHIP_SINGLE_SITE_DRAFT_CANDIDATE_SERVICE_VERSION;
  migrationId: string;
  draftId: string;
  draftVersion: number;
  sourceLiveSiteVersionId: string;
  sourceLiveRuntimeArtifactId: string;
  candidateSiteVersionId: string;
  candidateRuntimeArtifactId: string;
  previewRoute: string;
  appliedEdits: AirshipDraftCandidatePreviewRef["appliedEdits"];
  skippedEdits: AirshipDraftCandidatePreviewRef["skippedEdits"];
  activePointerBefore: { siteVersionId: string; artifactId: string } | null;
  activePointerAfter: { siteVersionId: string; artifactId: string } | null;
  activePointerChanged: false;
  published: false;
};

type AirshipDraftCandidateProvenance = {
  serviceVersion: typeof AIRSHIP_SINGLE_SITE_DRAFT_CANDIDATE_SERVICE_VERSION;
  migrationId: string;
  draftId: string;
  draftVersion: number;
  sourceLiveSiteVersionId: string;
  sourceLiveRuntimeArtifactId: string;
  semanticInputWatermark: string;
  candidateSiteVersionId: string;
  appliedEditIds: string[];
  skippedEditIds: string[];
  appliedEdits: AirshipDraftCandidatePreviewRef["appliedEdits"];
  skippedEdits: AirshipDraftCandidatePreviewRef["skippedEdits"];
  statusLabel: "Not live, internal preview only";
  activePointerMutation: false;
  published: false;
};

const defaultRuntimeDeps: RuntimePrimitiveDeps = {
  getSiteVersion,
  getArtifactById,
  getActivePointerForSite,
  createSiteVersionFromMigration,
  buildDeterministicArtifactBundle,
  createArtifact,
  bindArtifactToVersion,
};

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function required(field: string, value: unknown): string {
  const normalized = text(value);
  if (!normalized) throw new Error(`${field}_required`);
  return normalized;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stableJsonValue(record[key]);
        return acc;
      }, {});
  }
  return value ?? null;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(stableJsonValue(value))).digest("hex");
}

function deterministicUuid(namespace: string, value: unknown): string {
  const digest = Buffer.from(sha256({ namespace, value }), "hex");
  const bytes = Uint8Array.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Buffer.from(bytes).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function acceptedOrSavedEdit(edit: AirshipSingleSiteDraftEdit | undefined): AirshipSingleSiteDraftEdit | null {
  if (!edit) return null;
  if (edit.status === "accepted" || edit.status === "edited") return edit;
  return null;
}

function rejectedEdit(edit: AirshipSingleSiteDraftEdit | undefined): AirshipSingleSiteDraftEdit | null {
  return edit?.status === "rejected" ? edit : null;
}

function sectionProps(page: CanonicalPageVersionInput): Record<string, Record<string, unknown>> {
  const props = page.contentModel.sectionProps;
  if (!props || typeof props !== "object" || Array.isArray(props)) return {};
  return props;
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date) return {};
  return value as Record<string, unknown>;
}

function firstEditableSectionId(page: CanonicalPageVersionInput): string {
  const sections = [...(page.structureModel.sections ?? [])].sort((left, right) => left.order - right.order);
  const preferred =
    sections.find((section) => /hero|header|home|legacy|content/i.test(`${section.id} ${section.type}`)) ??
    sections[0];
  if (preferred) return preferred.id;
  const existing = Object.keys(sectionProps(page))[0];
  if (existing) return existing;
  return "airship-draft-hero";
}

function withTextField(input: {
  props: Record<string, unknown>;
  preferredKeys: string[];
  fallbackKey: string;
  value: string;
}): Record<string, unknown> {
  const key = input.preferredKeys.find((candidate) => text(input.props[candidate])) ?? input.fallbackKey;
  return {
    ...input.props,
    [key]: input.value,
  };
}

function stripRejectedCtaText(value: unknown, rejectedText: string | null): unknown {
  if (!rejectedText) return value;
  if (typeof value === "string") return value.split(rejectedText).join("").replace(/\s{2,}/g, " ").trim();
  if (Array.isArray(value)) return value.map((entry) => stripRejectedCtaText(entry, rejectedText));
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, stripRejectedCtaText(entry, rejectedText)]),
    );
  }
  return value;
}

function applyAirshipHeroEdits(input: {
  sourceVersion: CanonicalSiteVersionSnapshot;
  actor: string;
  headline: string;
  subheading: string;
  rejectedCtaText: string | null;
}): CanonicalPageVersionInput[] {
  return input.sourceVersion.pages.map((sourcePage, index) => {
    const page: CanonicalPageVersionInput = {
      pageId: sourcePage.pageId,
      path: sourcePage.path,
      title: sourcePage.title,
      structureModel: cloneJson(sourcePage.structureModel),
      contentModel: cloneJson(sourcePage.contentModel),
      styleTokens: cloneJson(sourcePage.styleTokens),
      assetGraph: cloneJson(sourcePage.assetGraph),
      semanticSignals: cloneJson(sourcePage.semanticSignals),
      migrationGovernance: cloneJson(sourcePage.migrationGovernance ?? null),
      source: "manual",
      actor: input.actor,
    };
    if (index !== 0 && page.path !== "/") return page;

    const targetSectionId = firstEditableSectionId(page);
    const currentSectionProps = objectValue(sectionProps(page)[targetSectionId]);
    const nextSectionProps = withTextField({
      props: withTextField({
        props: {
          ...currentSectionProps,
          airshipDraftHeroOverride: {
            headline: input.headline,
            subheading: input.subheading,
          },
        },
        preferredKeys: ["headline", "heading", "title"],
        fallbackKey: "headline",
        value: input.headline,
      }),
      preferredKeys: ["subheading", "subheadline", "subtitle", "description", "body", "text"],
      fallbackKey: "subheading",
      value: input.subheading,
    });

    page.contentModel = {
      ...page.contentModel,
      sectionProps: {
        ...sectionProps(page),
        [targetSectionId]: stripRejectedCtaText(nextSectionProps, input.rejectedCtaText) as Record<string, unknown>,
      },
    };
    if (!page.semanticSignals.some((signal) => signal.label === "airship.draft_candidate.internal_preview_only")) {
      page.semanticSignals = [
        ...page.semanticSignals,
        { label: "airship.draft_candidate.internal_preview_only", confidence: 1, source: "manual" },
      ];
    }
    return page;
  });
}

function previewRoute(siteVersionId: string): string {
  return `${AIRSHIP_DRAFT_CANDIDATE_PREVIEW_ROUTE_PREFIX}/${encodeURIComponent(siteVersionId)}/preview?mode=transformed`;
}

function provenanceFrom(value: unknown): AirshipDraftCandidateProvenance | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const provenance = record.airshipSingleSiteDraftCandidate;
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) return null;
  const candidate = provenance as Partial<AirshipDraftCandidateProvenance>;
  if (candidate.serviceVersion !== AIRSHIP_SINGLE_SITE_DRAFT_CANDIDATE_SERVICE_VERSION) return null;
  if (!text(candidate.candidateSiteVersionId) || !text(candidate.semanticInputWatermark)) return null;
  return candidate as AirshipDraftCandidateProvenance;
}

function toPreviewRef(input: {
  candidateSiteVersionId: string;
  candidateRuntimeArtifactId: string;
  sourceLiveSiteVersionId: string;
  sourceLiveRuntimeArtifactId: string;
  draft: AirshipSingleSiteDraftRecord;
  appliedEdits: AirshipDraftCandidatePreviewRef["appliedEdits"];
  skippedEdits: AirshipDraftCandidatePreviewRef["skippedEdits"];
}): AirshipDraftCandidatePreviewRef {
  return {
    label: "New Airship draft candidate preview",
    siteVersionId: input.candidateSiteVersionId,
    runtimeArtifactId: input.candidateRuntimeArtifactId,
    route: previewRoute(input.candidateSiteVersionId),
    mode: "transformed",
    available: true,
    unavailableReason: null,
    authNote: "Superadmin-only internal GNR8 preview. Not live, internal preview only.",
    statusLabel: "Not live, internal preview only",
    sourceLiveSiteVersionId: input.sourceLiveSiteVersionId,
    sourceLiveRuntimeArtifactId: input.sourceLiveRuntimeArtifactId,
    draftId: input.draft.id,
    draftVersion: input.draft.version,
    appliedEdits: input.appliedEdits,
    skippedEdits: input.skippedEdits,
  };
}

export function airshipDraftCandidateSemanticInput(input: {
  draft: AirshipSingleSiteDraftRecord;
  sourceLiveSiteVersionId: string;
  sourceLiveRuntimeArtifactId: string;
  appliedEdits: AirshipDraftCandidatePreviewRef["appliedEdits"];
  skippedEdits: AirshipDraftCandidatePreviewRef["skippedEdits"];
}): string {
  return `airship-draft-candidate-input:${sha256({
    serviceVersion: AIRSHIP_SINGLE_SITE_DRAFT_CANDIDATE_SERVICE_VERSION,
    migrationId: input.draft.migrationId,
    draftId: input.draft.id,
    draftVersion: input.draft.version,
    sourceLiveSiteVersionId: input.sourceLiveSiteVersionId,
    sourceLiveRuntimeArtifactId: input.sourceLiveRuntimeArtifactId,
    appliedEdits: input.appliedEdits,
    skippedEdits: input.skippedEdits,
  })}`;
}

export async function createAirshipSingleSiteDraftCandidate(input: {
  draft: AirshipSingleSiteDraftRecord;
  actor: string;
  sourceLiveSiteVersionId?: string | null;
  sourceLiveRuntimeArtifactId?: string | null;
  targetCandidateSiteVersionId?: string | null;
}, dependencies: AirshipDraftCandidateDependencies = {}): Promise<AirshipDraftCandidateCreationOutput> {
  const deps = { ...defaultRuntimeDeps, ...dependencies };
  const sourceLiveSiteVersionId = required(
    "sourceLiveSiteVersionId",
    input.sourceLiveSiteVersionId ?? input.draft.targetSiteVersionRefs.improvedCandidateSiteVersionId,
  );
  const sourceLiveRuntimeArtifactId = required(
    "sourceLiveRuntimeArtifactId",
    input.sourceLiveRuntimeArtifactId ?? input.draft.targetSiteVersionRefs.improvedCandidateRuntimeArtifactId,
  );
  const sourceVersion = await deps.getSiteVersion(sourceLiveSiteVersionId);
  if (!sourceVersion) throw new Error(`source_live_site_version_not_found:${sourceLiveSiteVersionId}`);
  const sourceArtifact = await deps.getArtifactById(sourceLiveRuntimeArtifactId);
  if (!sourceArtifact) throw new Error(`source_live_runtime_artifact_not_found:${sourceLiveRuntimeArtifactId}`);
  if (sourceArtifact.siteVersionId !== sourceVersion.id) throw new Error("source_live_runtime_artifact_version_mismatch");

  const headlineEdit = acceptedOrSavedEdit(input.draft.draftEdits.find((edit) => edit.id === HEADLINE_DRAFT_ID));
  const subheadingEdit = acceptedOrSavedEdit(input.draft.draftEdits.find((edit) => edit.id === SUBHEADING_DRAFT_ID));
  if (!headlineEdit) throw new Error("accepted_headline_required");
  if (!subheadingEdit) throw new Error("saved_subheading_required");
  const rejectedCta = rejectedEdit(input.draft.draftEdits.find((edit) => edit.id === CTA_DRAFT_ID));

  const appliedEdits = [headlineEdit, subheadingEdit].map((edit) => ({
    draftEditId: edit.id,
    targetSectionPage: edit.targetSectionPage,
    appliedTextContent: edit.proposedTextContent,
  }));
  const skippedEdits = rejectedCta
    ? [{
        draftEditId: rejectedCta.id,
        targetSectionPage: rejectedCta.targetSectionPage,
        skippedTextContent: rejectedCta.proposedTextContent,
        reason: "rejected" as const,
      }]
    : [];
  const semanticInputWatermark = airshipDraftCandidateSemanticInput({
    draft: input.draft,
    sourceLiveSiteVersionId,
    sourceLiveRuntimeArtifactId,
    appliedEdits,
    skippedEdits,
  });
  const targetCandidateSiteVersionId = text(input.targetCandidateSiteVersionId) ?? deterministicUuid("airship-single-site-draft-candidate", {
    semanticInputWatermark,
    sourceLiveSiteVersionId,
  });
  if (targetCandidateSiteVersionId === sourceLiveSiteVersionId) throw new Error("draft_candidate_must_not_reuse_live_version");

  const activePointerBefore = await deps.getActivePointerForSite(sourceVersion.siteId);
  const existingTarget = await deps.getSiteVersion(targetCandidateSiteVersionId);
  const existingProvenance = provenanceFrom(existingTarget?.importProvenanceSummary);
  if (existingTarget && existingProvenance?.semanticInputWatermark !== semanticInputWatermark) {
    throw new Error("airship_draft_candidate_idempotency_conflict");
  }

  const actor = `${input.actor}:airship-draft-candidate`;
  const pages = applyAirshipHeroEdits({
    sourceVersion,
    actor,
    headline: headlineEdit.proposedTextContent,
    subheading: subheadingEdit.proposedTextContent,
    rejectedCtaText: rejectedCta?.proposedTextContent ?? null,
  });
  const provenance: AirshipDraftCandidateProvenance = {
    serviceVersion: AIRSHIP_SINGLE_SITE_DRAFT_CANDIDATE_SERVICE_VERSION,
    migrationId: input.draft.migrationId,
    draftId: input.draft.id,
    draftVersion: input.draft.version,
    sourceLiveSiteVersionId,
    sourceLiveRuntimeArtifactId,
    semanticInputWatermark,
    candidateSiteVersionId: targetCandidateSiteVersionId,
    appliedEditIds: appliedEdits.map((edit) => edit.draftEditId),
    skippedEditIds: skippedEdits.map((edit) => edit.draftEditId),
    appliedEdits,
    skippedEdits,
    statusLabel: "Not live, internal preview only",
    activePointerMutation: false,
    published: false,
  };

  const candidateVersion = existingTarget
    ? { siteId: existingTarget.siteId, siteVersionId: existingTarget.id, versionNo: existingTarget.versionNo }
    : await deps.createSiteVersionFromMigration({
        siteId: sourceVersion.siteId,
        sourceUrl: input.draft.sourceUrl,
        actor,
        rendererCompatibilityVersion: sourceVersion.rendererCompatibilityVersion,
        importProvenanceSummary: {
          ...(sourceVersion.importProvenanceSummary ?? {}),
          airshipSingleSiteDraftCandidate: provenance,
        } as RuntimeImportProvenanceSummary,
        pages,
        siteVersionId: targetCandidateSiteVersionId,
      });

  const verifiedVersion = existingTarget ?? await deps.getSiteVersion(candidateVersion.siteVersionId);
  if (!verifiedVersion) throw new Error(`airship_draft_candidate_version_not_found:${candidateVersion.siteVersionId}`);
  const artifactBundle = deps.buildDeterministicArtifactBundle({ siteVersion: verifiedVersion, renderMode: "PREVIEW" });
  const artifact = await deps.createArtifact({
    siteId: artifactBundle.siteId,
    siteVersionId: artifactBundle.siteVersionId,
    rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
    bundleSha256: artifactBundle.bundleSha256,
    htmlByPath: artifactBundle.htmlByPath,
    compiledTokenStyles: artifactBundle.compiledTokenStyles,
    assetFingerprintMap: artifactBundle.assetFingerprintMap,
    manifest: {
      ...artifactBundle.manifest,
      sourceKind: "airship_single_site_draft_candidate",
      airshipSingleSiteDraftCandidate: provenance,
    },
    publishStage: "shadow",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: ["AIRSHIP_DRAFT_CANDIDATE_INTERNAL_PREVIEW_ONLY"],
      pageRolloutPolicyState: ["AIRSHIP_DRAFT_CANDIDATE_NOT_LIVE"],
      pageEnforcementState: { shadow: ["ALLOW"], canary: ["REVIEW"], production: ["REVIEW"] },
      siteGateState: "AIRSHIP_DRAFT_CANDIDATE_INTERNAL_PREVIEW_ONLY",
      siteRolloutPolicyState: "AIRSHIP_DRAFT_CANDIDATE_NOT_LIVE",
      siteEnforcementState: { shadow: "ALLOW", canary: "REVIEW", production: "REVIEW" },
      publishStage: "shadow",
    },
  });
  await deps.bindArtifactToVersion({
    siteVersionId: candidateVersion.siteVersionId,
    artifactId: artifact.artifactId,
    rendererCompatibilityVersion: artifactBundle.rendererCompatibilityVersion,
  });

  const activePointerAfter = await deps.getActivePointerForSite(sourceVersion.siteId);
  const activePointerChanged = JSON.stringify(activePointerBefore) !== JSON.stringify(activePointerAfter);
  if (activePointerChanged) throw new Error("airship_draft_candidate_active_pointer_changed");

  return {
    status: existingTarget ? "reused" : "created",
    serviceVersion: AIRSHIP_SINGLE_SITE_DRAFT_CANDIDATE_SERVICE_VERSION,
    migrationId: input.draft.migrationId,
    draftId: input.draft.id,
    draftVersion: input.draft.version,
    sourceLiveSiteVersionId,
    sourceLiveRuntimeArtifactId,
    candidateSiteVersionId: candidateVersion.siteVersionId,
    candidateRuntimeArtifactId: artifact.artifactId,
    previewRoute: previewRoute(candidateVersion.siteVersionId),
    appliedEdits,
    skippedEdits,
    activePointerBefore,
    activePointerAfter,
    activePointerChanged: false,
    published: false,
  };
}

export async function readLatestAirshipSingleSiteDraftCandidatePreview(input: {
  migrationId: string;
  draftId?: string | null;
}): Promise<AirshipDraftCandidatePreviewRef | null> {
  const pool = getSuperadminPool();
  const res = await pool.query<{
    site_version_id: string;
    artifact_id: string;
    import_provenance_summary: unknown;
    artifact_manifest: unknown;
  }>(
    `
    select
      v.id::text as site_version_id,
      a.id::text as artifact_id,
      v.import_provenance_summary,
      a.manifest as artifact_manifest
    from public.gnr8_runtime_site_versions v
    join public.gnr8_runtime_artifacts a on a.site_version_id = v.id
    where v.state = 'DRAFT'
      and v.import_provenance_summary->'airshipSingleSiteDraftCandidate'->>'serviceVersion' = $1::text
      and v.import_provenance_summary->'airshipSingleSiteDraftCandidate'->>'migrationId' = $2::text
      and ($3::text is null or v.import_provenance_summary->'airshipSingleSiteDraftCandidate'->>'draftId' = $3::text)
    order by v.created_at desc, v.version_no desc
    limit 1
    `,
    [AIRSHIP_SINGLE_SITE_DRAFT_CANDIDATE_SERVICE_VERSION, input.migrationId, text(input.draftId)],
  );
  const row = res.rows[0];
  if (!row) return null;
  const provenance = provenanceFrom(row.import_provenance_summary) ?? provenanceFrom(row.artifact_manifest);
  if (!provenance) return null;
  return {
    label: "New Airship draft candidate preview",
    siteVersionId: row.site_version_id,
    runtimeArtifactId: row.artifact_id,
    route: previewRoute(row.site_version_id),
    mode: "transformed",
    available: true,
    unavailableReason: null,
    authNote: "Superadmin-only internal GNR8 preview. Not live, internal preview only.",
    statusLabel: "Not live, internal preview only",
    sourceLiveSiteVersionId: provenance.sourceLiveSiteVersionId,
    sourceLiveRuntimeArtifactId: provenance.sourceLiveRuntimeArtifactId,
    draftId: provenance.draftId,
    draftVersion: provenance.draftVersion,
    appliedEdits: provenance.appliedEdits ?? [],
    skippedEdits: provenance.skippedEdits ?? [],
  };
}
