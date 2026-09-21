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
  refreshArtifactForVersionPublishCandidate,
} from "../runtime/runtime-store";
import { getSuperadminPool } from "@/src/superadmin/db";
import {
  sanitizeDraftStyleSettings,
  type AirshipSingleSiteDraftEdit,
  type AirshipSingleSiteDraftRecord,
  type AirshipSingleSiteDraftSectionKey,
  type AirshipSingleSiteDraftStyleSettings,
} from "./airship-single-site-draft-service";
import { maybeBuildArisAirshipMvpEvidenceSourceVersion } from "./airship-aris-mvp-draft";
import { analyzeAirshipArtifactHtmlValidity } from "./airship-valid-artifact-html";

export const AIRSHIP_SINGLE_SITE_DRAFT_CANDIDATE_SERVICE_VERSION = "airship-4-draft-candidate-service:v1" as const;

export const AIRSHIP_DRAFT_CANDIDATE_PREVIEW_ROUTE_PREFIX = "/api/gnr8/admin/single-site-studio/versions" as const;

type RuntimePrimitiveDeps = {
  getSiteVersion: typeof getSiteVersion;
  getArtifactById: typeof getArtifactById;
  getActivePointerForSite: typeof getActivePointerForSite;
  createSiteVersionFromMigration: typeof createSiteVersionFromMigration;
  buildDeterministicArtifactBundle: typeof buildDeterministicArtifactBundle;
  createArtifact: typeof createArtifact;
  refreshArtifactForVersionPublishCandidate: typeof refreshArtifactForVersionPublishCandidate;
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
  styleSettings: AirshipSingleSiteDraftStyleSettings;
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
  styleSettings: AirshipSingleSiteDraftStyleSettings;
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
  styleSettings: AirshipSingleSiteDraftStyleSettings;
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
  refreshArtifactForVersionPublishCandidate,
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

type AirshipDraftFieldKey = "headline" | "subheading" | "ctaLabel";
type AirshipDraftSectionPayload = {
  key: AirshipSingleSiteDraftSectionKey;
  label: string;
  heading: string;
  body: string;
  items: string[];
  ctaLabel: string | null;
  draftEditIds: string[];
};

function draftFieldKey(draft: Pick<AirshipSingleSiteDraftEdit, "id" | "targetSectionPage"> & {
  fieldKey?: unknown;
}): AirshipDraftFieldKey | null {
  if (draft.fieldKey === "headline" || draft.fieldKey === "subheading" || draft.fieldKey === "ctaLabel") return draft.fieldKey;
  const haystack = `${draft.id} ${draft.targetSectionPage}`.toLocaleLowerCase("en-US");
  if (/cta|call.to.action|button|contact/.test(haystack)) return "ctaLabel";
  if (/subheading|subheadline|subtitle|value.proposition|body|description/.test(haystack)) return "subheading";
  if (/headline|heading|hero|h1|title/.test(haystack)) return "headline";
  return null;
}

function draftEditForField(drafts: AirshipSingleSiteDraftEdit[], fieldKey: AirshipDraftFieldKey): AirshipSingleSiteDraftEdit | undefined {
  return drafts.find((draft) => draftFieldKey(draft) === fieldKey);
}

function draftSectionKey(draft: Pick<AirshipSingleSiteDraftEdit, "id" | "targetSectionPage"> & {
  fieldKey?: unknown;
  sectionKey?: unknown;
}): AirshipSingleSiteDraftSectionKey | null {
  if (
    draft.sectionKey === "hero" ||
    draft.sectionKey === "offers" ||
    draft.sectionKey === "proof" ||
    draft.sectionKey === "approach" ||
    draft.sectionKey === "cta" ||
    draft.sectionKey === "footer"
  ) {
    return draft.sectionKey;
  }
  const fieldKey = draftFieldKey(draft);
  if (fieldKey === "headline" || fieldKey === "subheading") return "hero";
  if (fieldKey === "ctaLabel") return "cta";
  const haystack = `${draft.id} ${draft.targetSectionPage}`.toLocaleLowerCase("en-US");
  if (/offer|service|product|ponud/.test(haystack)) return "offers";
  if (/proof|benefit|trust|brand|category|reference|partner/.test(haystack)) return "proof";
  if (/approach|process|method|workflow|delivery/.test(haystack)) return "approach";
  if (/footer|demo.note|boundary/.test(haystack)) return "footer";
  if (/cta|contact|inquiry|call.to.action/.test(haystack)) return "cta";
  return null;
}

function sectionLabel(sectionKey: AirshipSingleSiteDraftSectionKey): string {
  switch (sectionKey) {
    case "hero":
      return "Hero";
    case "offers":
      return "Offers / Services";
    case "proof":
      return "Proof / Benefits";
    case "approach":
      return "Approach / Process";
    case "cta":
      return "CTA / Contact";
    case "footer":
      return "Footer / Demo note";
  }
}

function sectionHeading(sectionKey: AirshipSingleSiteDraftSectionKey): string {
  switch (sectionKey) {
    case "hero":
      return "Homepage";
    case "offers":
      return "What the improved draft offers";
    case "proof":
      return "Proof and benefits";
    case "approach":
      return "Approach";
    case "cta":
      return "Contact";
    case "footer":
      return "Internal demo boundary";
  }
}

function splitSectionItems(value: string): string[] {
  return value
    .split(/(?:\.\s+|;\s+|\n+)/)
    .map((item) => item.replace(/\.$/, "").trim())
    .filter((item) => item.length > 0)
    .slice(0, 4);
}

function airshipDraftSectionsFromAppliedEdits(edits: AirshipSingleSiteDraftEdit[]): AirshipDraftSectionPayload[] {
  const sectionKeys: AirshipSingleSiteDraftSectionKey[] = ["offers", "proof", "approach", "cta", "footer"];
  return sectionKeys.map((sectionKey) => {
    const sectionEdits = edits.filter((edit) => draftSectionKey(edit) === sectionKey);
    const body = sectionEdits.map((edit) => edit.proposedTextContent).filter(Boolean).join(" ");
    const ctaLabel = sectionEdits.find((edit) => draftFieldKey(edit) === "ctaLabel")?.proposedTextContent ?? null;
    return {
      key: sectionKey,
      label: sectionLabel(sectionKey),
      heading: sectionKey === "cta" ? ctaLabel ?? sectionHeading(sectionKey) : sectionHeading(sectionKey),
      body,
      items: sectionKey === "offers" || sectionKey === "proof" || sectionKey === "approach" ? splitSectionItems(body) : [],
      ctaLabel,
      draftEditIds: sectionEdits.map((edit) => edit.id),
    };
  }).filter((section) => text(section.body) || text(section.ctaLabel));
}

function styleSettingsFromDraft(draft: AirshipSingleSiteDraftRecord): AirshipSingleSiteDraftStyleSettings {
  return sanitizeDraftStyleSettings(draft.metadata.styleSettings);
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
  ctaLabel: string | null;
  rejectedCtaText: string | null;
  draftSections: AirshipDraftSectionPayload[];
  styleSettings: AirshipSingleSiteDraftStyleSettings;
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
    const baseSectionProps = {
      ...currentSectionProps,
      airshipDraftHeroOverride: {
        headline: input.headline,
        subheading: input.subheading,
      },
      airshipDraftStyleOverride: {
        heroTopPadding: input.styleSettings.heroTopPadding,
        heroBottomPadding: input.styleSettings.heroBottomPadding,
        backgroundTint: input.styleSettings.backgroundTint,
        ctaColor: input.styleSettings.ctaColor,
      },
    };
    const sectionPropsWithCta = input.ctaLabel
      ? withTextField({
          props: {
            ...baseSectionProps,
            airshipDraftCtaOverride: {
              label: input.ctaLabel,
            },
          },
          preferredKeys: ["ctaLabel", "primaryCtaLabel", "buttonLabel", "cta", "label"],
          fallbackKey: "ctaLabel",
          value: input.ctaLabel,
        })
      : baseSectionProps;
    const nextSectionProps = withTextField({
      props: withTextField({
        props: sectionPropsWithCta,
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
        [targetSectionId]: stripRejectedCtaText({
          ...nextSectionProps,
          airshipDraftSections: input.draftSections,
        }, input.rejectedCtaText) as Record<string, unknown>,
        ...Object.fromEntries(input.draftSections.map((section) => [
          `airship-draft-${section.key}`,
          stripRejectedCtaText({
            heading: section.heading,
            body: section.body,
            items: section.items,
            ctaLabel: section.ctaLabel,
            airshipDraftSection: section,
          }, input.rejectedCtaText) as Record<string, unknown>,
        ])),
      },
    };
    const existingSectionIds = new Set((page.structureModel.sections ?? []).map((section) => section.id));
    const maxOrder = Math.max(-1, ...(page.structureModel.sections ?? []).map((section) => section.order));
    const addedSections = input.draftSections
      .filter((section) => !existingSectionIds.has(`airship-draft-${section.key}`))
      .map((section, sectionIndex) => ({
        id: `airship-draft-${section.key}`,
        type: section.key === "cta" ? "cta.airship" : section.key === "footer" ? "footer.airship" : "content.airship",
        order: maxOrder + sectionIndex + 1,
      }));
    if (addedSections.length > 0) {
      page.structureModel = {
        ...page.structureModel,
        sections: [...(page.structureModel.sections ?? []), ...addedSections],
      };
    }
    page.styleTokens = {
      ...page.styleTokens,
      "airship.hero.paddingTop": `${input.styleSettings.heroTopPadding}px`,
      "airship.hero.paddingBottom": `${input.styleSettings.heroBottomPadding}px`,
      "airship.hero.backgroundTint": input.styleSettings.backgroundTint,
      "airship.cta.color": input.styleSettings.ctaColor,
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

function previewRoute(siteVersionId: string, runtimeArtifactId: string): string {
  return `${AIRSHIP_DRAFT_CANDIDATE_PREVIEW_ROUTE_PREFIX}/${encodeURIComponent(siteVersionId)}/preview?mode=transformed&airshipArtifactId=${encodeURIComponent(runtimeArtifactId)}`;
}

function assertGeneratedAirshipArtifactHtml(htmlByPath: Record<string, string>, migrationId: string): void {
  const rootHtml = text(htmlByPath["/"]);
  if (!rootHtml) throw new Error("airship_draft_candidate_artifact_html_missing");
  const validity = analyzeAirshipArtifactHtmlValidity({ html: rootHtml, migrationId });
  if (validity.reasons.includes("diagnostic_fallback_marker")) {
    throw new Error("airship_draft_candidate_artifact_html_diagnostic_fallback");
  }
  if (!validity.valid) throw new Error(`airship_draft_candidate_artifact_html_invalid:${validity.reasons.join(",")}`);
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
  styleSettings: AirshipSingleSiteDraftStyleSettings;
  appliedEdits: AirshipDraftCandidatePreviewRef["appliedEdits"];
  skippedEdits: AirshipDraftCandidatePreviewRef["skippedEdits"];
}): AirshipDraftCandidatePreviewRef {
  return {
    label: "New Airship draft candidate preview",
    siteVersionId: input.candidateSiteVersionId,
    runtimeArtifactId: input.candidateRuntimeArtifactId,
    route: previewRoute(input.candidateSiteVersionId, input.candidateRuntimeArtifactId),
    mode: "transformed",
    available: true,
    unavailableReason: null,
    authNote: "Superadmin-only internal GNR8 preview. Not live, internal preview only.",
    statusLabel: "Not live, internal preview only",
    sourceLiveSiteVersionId: input.sourceLiveSiteVersionId,
    sourceLiveRuntimeArtifactId: input.sourceLiveRuntimeArtifactId,
    draftId: input.draft.id,
    draftVersion: input.draft.version,
    styleSettings: input.styleSettings,
    appliedEdits: input.appliedEdits,
    skippedEdits: input.skippedEdits,
  };
}

export function airshipDraftCandidateSemanticInput(input: {
  draft: AirshipSingleSiteDraftRecord;
  sourceLiveSiteVersionId: string;
  sourceLiveRuntimeArtifactId: string;
  styleSettings: AirshipSingleSiteDraftStyleSettings;
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
    styleSettings: input.styleSettings,
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
  const candidateSourceVersion = maybeBuildArisAirshipMvpEvidenceSourceVersion({
    draftMigrationId: input.draft.migrationId,
    sourceVersion,
    actor: input.actor,
  });

  const headlineEdit = acceptedOrSavedEdit(draftEditForField(input.draft.draftEdits, "headline"));
  const subheadingEdit = acceptedOrSavedEdit(draftEditForField(input.draft.draftEdits, "subheading"));
  if (!headlineEdit) throw new Error("accepted_headline_required");
  if (!subheadingEdit) throw new Error("saved_subheading_required");
  const ctaDraftEdit = draftEditForField(input.draft.draftEdits, "ctaLabel");
  const ctaEdit = acceptedOrSavedEdit(ctaDraftEdit);
  const rejectedCta = rejectedEdit(ctaDraftEdit);
  const acceptedEdits = input.draft.draftEdits.filter((edit) => acceptedOrSavedEdit(edit));
  const rejectedEdits = input.draft.draftEdits.filter((edit) => rejectedEdit(edit));

  const appliedEdits = acceptedEdits.map((edit) => ({
    draftEditId: edit.id,
    targetSectionPage: edit.targetSectionPage,
    appliedTextContent: edit.proposedTextContent,
  }));
  const skippedEdits = rejectedEdits.map((edit) => ({
    draftEditId: edit.id,
    targetSectionPage: edit.targetSectionPage,
    skippedTextContent: edit.proposedTextContent,
    reason: "rejected" as const,
  }));
  const styleSettings = styleSettingsFromDraft(input.draft);
  const draftSections = airshipDraftSectionsFromAppliedEdits(acceptedEdits);
  const semanticInputWatermark = airshipDraftCandidateSemanticInput({
    draft: input.draft,
    sourceLiveSiteVersionId,
    sourceLiveRuntimeArtifactId,
    styleSettings,
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
    sourceVersion: candidateSourceVersion,
    actor,
    headline: headlineEdit.proposedTextContent,
    subheading: subheadingEdit.proposedTextContent,
    ctaLabel: ctaEdit?.proposedTextContent ?? null,
    rejectedCtaText: rejectedCta?.proposedTextContent ?? null,
    draftSections,
    styleSettings,
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
    styleSettings,
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
        siteId: candidateSourceVersion.siteId,
        sourceUrl: input.draft.sourceUrl,
        actor,
        rendererCompatibilityVersion: candidateSourceVersion.rendererCompatibilityVersion,
        importProvenanceSummary: {
          ...(candidateSourceVersion.importProvenanceSummary ?? {}),
          airshipSingleSiteDraftCandidate: provenance,
        } as RuntimeImportProvenanceSummary,
        pages,
        siteVersionId: targetCandidateSiteVersionId,
        createSourceHostBinding: false,
      });

  const verifiedVersion = existingTarget ?? await deps.getSiteVersion(candidateVersion.siteVersionId);
  if (!verifiedVersion) throw new Error(`airship_draft_candidate_version_not_found:${candidateVersion.siteVersionId}`);
  const artifactBundle = deps.buildDeterministicArtifactBundle({ siteVersion: verifiedVersion, renderMode: "PREVIEW" });
  assertGeneratedAirshipArtifactHtml(artifactBundle.htmlByPath, input.draft.migrationId);
  const artifactInput = {
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
    publishStage: "shadow" as const,
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: ["AIRSHIP_DRAFT_CANDIDATE_INTERNAL_PREVIEW_ONLY"],
      pageRolloutPolicyState: ["AIRSHIP_DRAFT_CANDIDATE_NOT_LIVE"],
      pageEnforcementState: { shadow: ["ALLOW"], canary: ["REVIEW"], production: ["REVIEW"] },
      siteGateState: "AIRSHIP_DRAFT_CANDIDATE_INTERNAL_PREVIEW_ONLY",
      siteRolloutPolicyState: "AIRSHIP_DRAFT_CANDIDATE_NOT_LIVE",
      siteEnforcementState: { shadow: "ALLOW", canary: "REVIEW", production: "REVIEW" },
      publishStage: "shadow" as const,
    },
  };
  const artifact = existingTarget?.artifactId
    ? await deps.refreshArtifactForVersionPublishCandidate({
        ...artifactInput,
        artifactId: existingTarget.artifactId,
      }).then(() => ({ artifactId: existingTarget.artifactId! }))
    : await deps.createArtifact(artifactInput);
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
    previewRoute: previewRoute(candidateVersion.siteVersionId, artifact.artifactId),
    styleSettings,
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
  type CandidateRow = {
    site_version_id: string;
    artifact_id: string;
    import_provenance_summary: unknown;
    artifact_manifest: unknown;
    fallback_draft_id: string | null;
    fallback_draft_version: number | null;
    fallback_source_site_version_id: string | null;
    fallback_source_artifact_id: string | null;
  };
  const res = await pool.query<CandidateRow>(
    `
    select
      v.id::text as site_version_id,
      a.id::text as artifact_id,
      v.import_provenance_summary,
      a.manifest as artifact_manifest,
      null::text as fallback_draft_id,
      null::integer as fallback_draft_version,
      null::text as fallback_source_site_version_id,
      null::text as fallback_source_artifact_id
    from public.gnr8_runtime_site_versions v
    join public.gnr8_runtime_artifacts a on a.site_version_id = v.id
    where v.state = 'DRAFT'
      and (
        (
          v.import_provenance_summary->'airshipSingleSiteDraftCandidate'->>'serviceVersion' = $1::text
          and v.import_provenance_summary->'airshipSingleSiteDraftCandidate'->>'migrationId' = $2::text
          and ($3::text is null or v.import_provenance_summary->'airshipSingleSiteDraftCandidate'->>'draftId' = $3::text)
        )
        or (
          a.manifest->'airshipSingleSiteDraftCandidate'->>'serviceVersion' = $1::text
          and a.manifest->'airshipSingleSiteDraftCandidate'->>'migrationId' = $2::text
          and ($3::text is null or a.manifest->'airshipSingleSiteDraftCandidate'->>'draftId' = $3::text)
        )
      )
    order by v.created_at desc, v.version_no desc
    limit 1
    `,
    [AIRSHIP_SINGLE_SITE_DRAFT_CANDIDATE_SERVICE_VERSION, input.migrationId, text(input.draftId)],
  );
  let row = res.rows[0];
  if (!row) {
    const fallback = await pool.query<CandidateRow>(
      `
      select
        v.id::text as site_version_id,
        a.id::text as artifact_id,
        v.import_provenance_summary,
        a.manifest as artifact_manifest,
        r.draft_id::text as fallback_draft_id,
        r.draft_version::integer as fallback_draft_version,
        r.active_pointer_site_version_id::text as fallback_source_site_version_id,
        r.active_pointer_artifact_id::text as fallback_source_artifact_id
      from public.gnr8_airship_internal_preview_candidate_reviews r
      join public.gnr8_runtime_site_versions v on v.id = r.candidate_site_version_id
      join public.gnr8_runtime_artifacts a on a.id = r.candidate_runtime_artifact_id and a.site_version_id = v.id
      where r.migration_id = $1::uuid
        and ($2::uuid is null or r.draft_id = $2::uuid)
        and r.review_status = 'approved'
        and r.review_decision = 'approved_for_publish_readiness'
        and v.state = 'DRAFT'
        and a.publish_stage is distinct from 'production'
      order by r.reviewed_at desc, r.created_at desc
      limit 1
      `,
      [input.migrationId, text(input.draftId)],
    );
    row = fallback.rows[0];
  }
  if (!row) return null;
  const provenance = provenanceFrom(row.import_provenance_summary) ?? provenanceFrom(row.artifact_manifest);
  if (!provenance && (!row.fallback_draft_id || !row.fallback_draft_version || !row.fallback_source_site_version_id || !row.fallback_source_artifact_id)) return null;
  return {
    label: "New Airship draft candidate preview",
    siteVersionId: row.site_version_id,
    runtimeArtifactId: row.artifact_id,
    route: previewRoute(row.site_version_id, row.artifact_id),
    mode: "transformed",
    available: true,
    unavailableReason: null,
    authNote: "Superadmin-only internal GNR8 preview. Not live, internal preview only.",
    statusLabel: "Not live, internal preview only",
    sourceLiveSiteVersionId: provenance?.sourceLiveSiteVersionId ?? row.fallback_source_site_version_id ?? "",
    sourceLiveRuntimeArtifactId: provenance?.sourceLiveRuntimeArtifactId ?? row.fallback_source_artifact_id ?? "",
    draftId: provenance?.draftId ?? row.fallback_draft_id ?? "",
    draftVersion: provenance?.draftVersion ?? row.fallback_draft_version ?? 1,
    styleSettings: provenance?.styleSettings ?? sanitizeDraftStyleSettings(null),
    appliedEdits: provenance?.appliedEdits ?? [],
    skippedEdits: provenance?.skippedEdits ?? [],
  };
}
