import "server-only";

import {
  AIRSHIP_CHS_MIGRATION_ID,
  getAirshipSingleSiteEditorReadonlyProjection,
  type AirshipSingleSiteEditorReadonlyProjection,
} from "./airship-single-site-editor-readonly-projection";
import { SingleSiteStateReadRepository } from "./single-site-state-read-repository";

export const AIRSHIP_IMPORTED_SITE_ONBOARDING_PROJECTION_VERSION = "airship-15-imported-site-onboarding:v1" as const;
export const AIRSHIP_IMPORTED_SITE_ONBOARDING_SEED_MIGRATION_IDS = [AIRSHIP_CHS_MIGRATION_ID] as const;

export type AirshipOnboardingStatusTone = "good" | "warn" | "neutral";

export type AirshipImportedSiteOnboardingStatus = {
  label: string;
  detail: string;
  tone: AirshipOnboardingStatusTone;
};

export type AirshipImportedSiteOnboardingItem = {
  migrationId: string;
  siteLabel: string;
  sourceUrl: string | null;
  liveUrl: string | null;
  importSourceEvidenceStatus: AirshipImportedSiteOnboardingStatus;
  latestAirshipDraftStatus: AirshipImportedSiteOnboardingStatus;
  latestInternalPreviewCandidate: AirshipImportedSiteOnboardingStatus & {
    href: string | null;
  };
  publishedLivePointerStatus: AirshipImportedSiteOnboardingStatus & {
    href: string | null;
  };
  links: {
    overviewHref: string;
    editorHref: string;
  };
};

export type AirshipImportedSiteOnboardingProjection = {
  version: typeof AIRSHIP_IMPORTED_SITE_ONBOARDING_PROJECTION_VERSION;
  generatedAt: string;
  state: "empty" | "visible";
  items: AirshipImportedSiteOnboardingItem[];
  emptyState: {
    title: "No imported sites available for Airship yet";
    detail: string;
  };
  instrumentation: {
    repositoryReadStatus: "ok" | "unavailable";
    discoveredMigrationIdCount: number;
  };
  flags: {
    readOnly: true;
    mutatesProductionData: false;
    mutatesDraftData: false;
    imports: false;
    publishes: false;
    dryRuns: false;
    shadowPublishes: false;
    sourceCapture: false;
    activePointerMutation: false;
    providerCalls: false;
    liveSiteMutation: false;
  };
};

type BuildInput = {
  models: AirshipSingleSiteEditorReadonlyProjection[];
  generatedAt?: string | null;
  repositoryReadStatus?: AirshipImportedSiteOnboardingProjection["instrumentation"]["repositoryReadStatus"];
  discoveredMigrationIdCount?: number;
};

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function labelize(value: string): string {
  return value.replaceAll("_", " ");
}

function unique(values: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const value of values) {
    const normalized = text(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    ids.push(normalized);
  }
  return ids;
}

function availableUrl(value: unknown): string | null {
  const normalized = text(value);
  if (!normalized || /unavailable|unknown|missing/i.test(normalized)) return null;
  if (!/^https?:\/\//i.test(normalized)) return null;
  return normalized;
}

function sourceEvidenceStatus(model: AirshipSingleSiteEditorReadonlyProjection): AirshipImportedSiteOnboardingStatus {
  const summary = model.importedSiteModel.sourceEvidenceSummary;
  const tone = summary.status === "source_supported" ? "good" : "warn";
  return {
    label: labelize(summary.status),
    detail: `${labelize(model.mvpStatus)}. ${summary.detail}`,
    tone,
  };
}

function draftStatus(model: AirshipSingleSiteEditorReadonlyProjection): AirshipImportedSiteOnboardingStatus {
  const latest = model.importedSiteModel.latestDraft;
  if (!latest.draftId) {
    return {
      label: "No saved Airship draft",
      detail: model.draftPanel.drafts.length > 0
        ? `${model.draftPanel.drafts.length} source-derived draft field(s) can be opened in the editor. No saved draft is present yet.`
        : "No source-derived draft fields or saved Airship draft are available yet.",
      tone: model.draftPanel.drafts.length > 0 ? "neutral" : "warn",
    };
  }

  return {
    label: `Saved draft ${labelize(latest.draftStatus ?? "draft")}`,
    detail: `Draft ${latest.draftId}${latest.version ? ` v${latest.version}` : ""}${latest.lastSavedAt ? ` last saved ${latest.lastSavedAt}` : ""}. Not live. Not published.`,
    tone: "good",
  };
}

function previewCandidateStatus(model: AirshipSingleSiteEditorReadonlyProjection): AirshipImportedSiteOnboardingItem["latestInternalPreviewCandidate"] {
  const candidate = model.importedSiteModel.latestInternalPreviewCandidate;
  if (!candidate) {
    return {
      label: "No Airship draft candidate",
      detail: model.previews.currentImprovedPublished.available
        ? "Current improved internal preview exists, but no saved Airship draft candidate preview is present."
        : "No Airship draft candidate preview or current improved internal preview is present.",
      tone: model.previews.currentImprovedPublished.available ? "neutral" : "warn",
      href: null,
    };
  }

  return {
    label: candidate.statusLabel,
    detail: `Draft candidate ${candidate.siteVersionId}; artifact ${candidate.runtimeArtifactId}; draft ${candidate.draftId} v${candidate.draftVersion}.`,
    tone: "good",
    href: candidate.route,
  };
}

function publishedLivePointerStatus(model: AirshipSingleSiteEditorReadonlyProjection): AirshipImportedSiteOnboardingItem["publishedLivePointerStatus"] {
  const refs = model.importedSiteModel.publishedVersionRefs;
  const liveUrl = availableUrl(refs.liveUrl);
  const pointer = labelize(refs.activePointer);
  const candidate = labelize(refs.publishedCandidate);
  return {
    label: refs.activePointer === "live" ? "Live pointer present" : `Live pointer ${pointer}`,
    detail: refs.siteVersionId
      ? `Published/current candidate ${candidate}; site version ${refs.siteVersionId}; artifact ${refs.runtimeArtifactId ?? "unavailable"}.`
      : `Published/current candidate ${candidate}; site version unavailable.`,
    tone: refs.activePointer === "live" ? "good" : refs.activePointer === "unknown" ? "warn" : "neutral",
    href: liveUrl,
  };
}

function itemFromEditorModel(model: AirshipSingleSiteEditorReadonlyProjection): AirshipImportedSiteOnboardingItem | null {
  const migrationId = text(model.migrationId);
  if (!migrationId) return null;
  return {
    migrationId,
    siteLabel: model.importedSiteModel.siteLabel,
    sourceUrl: availableUrl(model.importedSiteModel.sourceUrl),
    liveUrl: availableUrl(model.importedSiteModel.liveUrl),
    importSourceEvidenceStatus: sourceEvidenceStatus(model),
    latestAirshipDraftStatus: draftStatus(model),
    latestInternalPreviewCandidate: previewCandidateStatus(model),
    publishedLivePointerStatus: publishedLivePointerStatus(model),
    links: {
      overviewHref: model.routeHref,
      editorHref: model.links.airshipEditor,
    },
  };
}

export function buildAirshipImportedSiteOnboardingProjection(input: BuildInput): AirshipImportedSiteOnboardingProjection {
  const byMigrationId = new Map<string, AirshipImportedSiteOnboardingItem>();
  for (const model of input.models) {
    const item = itemFromEditorModel(model);
    if (item) byMigrationId.set(item.migrationId, item);
  }
  const items = Array.from(byMigrationId.values())
    .sort((left, right) => left.siteLabel.localeCompare(right.siteLabel, "en-US"));

  return {
    version: AIRSHIP_IMPORTED_SITE_ONBOARDING_PROJECTION_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    state: items.length > 0 ? "visible" : "empty",
    items,
    emptyState: {
      title: "No imported sites available for Airship yet",
      detail: "Airship opens existing imported single-site migrations only. Start no import, capture, publish, dry-run, provider call, or live-site operation from this onboarding surface.",
    },
    instrumentation: {
      repositoryReadStatus: input.repositoryReadStatus ?? "ok",
      discoveredMigrationIdCount: input.discoveredMigrationIdCount ?? items.length,
    },
    flags: {
      readOnly: true,
      mutatesProductionData: false,
      mutatesDraftData: false,
      imports: false,
      publishes: false,
      dryRuns: false,
      shadowPublishes: false,
      sourceCapture: false,
      activePointerMutation: false,
      providerCalls: false,
      liveSiteMutation: false,
    },
  };
}

export async function getAirshipImportedSiteOnboardingProjection(input: {
  limit?: number;
  seedMigrationIds?: readonly string[];
  listMigrationIds?: (limit: number) => Promise<string[]>;
  getEditorProjection?: (input: { migrationId: string }) => Promise<AirshipSingleSiteEditorReadonlyProjection>;
} = {}): Promise<AirshipImportedSiteOnboardingProjection> {
  const limit = Math.max(1, Math.min(Number(input.limit) || 50, 100));
  const listMigrationIds = input.listMigrationIds ?? ((requestedLimit) => new SingleSiteStateReadRepository().listRecentMigrationIds(requestedLimit));
  const getEditorProjection = input.getEditorProjection ?? getAirshipSingleSiteEditorReadonlyProjection;
  const seedMigrationIds = input.seedMigrationIds ?? AIRSHIP_IMPORTED_SITE_ONBOARDING_SEED_MIGRATION_IDS;

  let repositoryReadStatus: AirshipImportedSiteOnboardingProjection["instrumentation"]["repositoryReadStatus"] = "ok";
  let repositoryMigrationIds: string[] = [];
  try {
    repositoryMigrationIds = await listMigrationIds(limit);
  } catch {
    repositoryReadStatus = "unavailable";
    repositoryMigrationIds = [];
  }

  const migrationIds = unique([...seedMigrationIds, ...repositoryMigrationIds]).slice(0, limit);
  const models = (await Promise.all(migrationIds.map((migrationId) =>
    getEditorProjection({ migrationId }).catch(() => null),
  ))).filter((model): model is AirshipSingleSiteEditorReadonlyProjection => Boolean(model));

  return buildAirshipImportedSiteOnboardingProjection({
    models,
    repositoryReadStatus,
    discoveredMigrationIdCount: repositoryMigrationIds.length,
  });
}
