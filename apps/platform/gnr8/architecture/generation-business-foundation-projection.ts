import type { RuntimeStoreDbOptions } from "../runtime/runtime-store";
import type { CanonicalSiteVersionSnapshot, RawImportedSiteArtifact, RawTemplateSiteFileMeta, RuntimeImportProvenanceSummary } from "../runtime/types";
import type { GenerationPreviewBundleAvailability } from "./generation-evolution-preview-boundary";
import { loadGenerationEvolutionDashboardProjection } from "./generation-evolution-dashboard-projection";

export type BusinessFoundationAttentionState =
  | "low_confidence"
  | "missing_audience"
  | "missing_offerings"
  | "missing_evidence"
  | "large_limitation_count"
  | "business_partially_understood";

export type BusinessFoundationAvailabilityState = "detected" | "partially_detected" | "not_available" | "unresolved";

export type BusinessFoundationArtifactLinkProjection = {
  label: string;
  kind: string;
  artifactId: string | null;
  canonicalId: string | null;
  status: string | null;
  href: string | null;
  referenceOnly: boolean;
  missing: boolean;
};

export type BusinessFoundationConfidenceProjection = {
  level: string | null;
  reasons: string[];
};

export type BusinessFoundationKnowledgeItemProjection = {
  id: string | null;
  domain: string;
  kind: string | null;
  statement: string;
  confidence: BusinessFoundationConfidenceProjection;
  evidenceCount: number;
  limitations: string[];
  status: string | null;
};

export type BusinessFoundationKnowledgeGroupProjection = {
  key: string;
  label: string;
  confidence: BusinessFoundationConfidenceProjection;
  evidenceCount: number;
  limitations: string[];
  statements: BusinessFoundationKnowledgeItemProjection[];
  missing: string[];
};

export type BusinessFoundationSummaryProjection = {
  businessName: string | null;
  businessIdentity: string | null;
  businessPurpose: string | null;
  businessGoals: string[];
  businessConfidence: BusinessFoundationConfidenceProjection;
  businessTone: string | null;
  trustStrategy: string | null;
  digitalPresence: string | null;
};

export type SourceWebsiteProjection = {
  url: string | null;
  hostname: string | null;
  importedAt: string | null;
  status: string | null;
  unavailableMessage: string | null;
};

export type GeneratedIterationLinkProjection = {
  label: string;
  iteration: number | null;
  status: string;
  createdAt: string | null;
  complianceState: string | null;
  previewHref: string | null;
  previewAvailable: boolean;
  resultSummary: string;
  isLatest: boolean;
  quarantined: boolean;
  approved: false;
  published: false;
};

export type BusinessFoundationHeroProjection = {
  businessName: string | null;
  sourceWebsite: SourceWebsiteProjection;
  description: string | null;
  websitePurpose: string | null;
  understandingConfidence: string | null;
  currentState: string;
  missingKnowledgeSummary: string;
  primaryLinks: {
    originalWebsiteHref: string | null;
    evolutionHref: string;
    latestGeneratedProposalHref: string | null;
  };
};

export type BusinessNarrativeProjection = {
  headline: string;
  businessIdentity: string | null;
  websitePurpose: string | null;
  goals: string[];
  trustSignals: string[];
  digitalPresence: string | null;
  uncertainties: string[];
};

export type ProductAttentionSummaryProjection = {
  businessIdentity: "understood" | "unresolved";
  websitePurpose: "understood" | "unresolved";
  offerings: "understood" | "unresolved";
  audience: "understood" | "unresolved";
  visualIdentity: BusinessFoundationAvailabilityState;
  generationReadiness: "partial" | "ready" | "unavailable";
  latestWebsiteEvolution: string;
};

export type BrandColorProjection = {
  value: string;
  label: string;
  source: string;
  confidence: string | null;
  status: "observed" | "upstream_inferred" | "unresolved";
};

export type TypographyProjection = {
  family: string;
  source: string;
  confidence: string | null;
  locallyAvailable: boolean | null;
};

export type ImportedAssetPreviewProjection = {
  filename: string;
  path: string;
  type: "logo_candidate" | "content_image" | "decorative_image" | "icon" | "font" | "video" | "document" | "other" | "unclassified";
  mediaType: string;
  source: string;
  previewHref: string | null;
  dimensions: string | null;
  sizeBytes: number | null;
};

export type ImportedAssetSummaryProjection = {
  total: number;
  logos: number;
  images: number;
  icons: number;
  fonts: number;
  videos: number;
  otherFiles: number;
  previews: ImportedAssetPreviewProjection[];
  unavailableMessage: string | null;
};

export type VisualIdentityProjection = {
  status: BusinessFoundationAvailabilityState;
  logo: {
    status: BusinessFoundationAvailabilityState;
    assetReference: string | null;
    previewHref: string | null;
    unavailableMessage: string | null;
  };
  primaryColors: BrandColorProjection[];
  secondaryColors: BrandColorProjection[];
  typography: TypographyProjection[];
  tone: string | null;
  visualStyleObservations: string[];
  confidence: string | null;
  limitations: string[];
};

export type ProductKnowledgeGapProjection = {
  label: string;
  status: "critical" | "missing" | "partial" | "unresolved";
  summary: string;
  generationImpact: string;
};

export type AdvancedTechnicalProjection = {
  siteVersionId: string;
  dryRunId: string | null;
  sourceSiteId: string | null;
  evidenceCount: number;
  diagnosticMarkers: string[];
  limitationCount: number;
};

export type BusinessFoundationOfferingsProjection = {
  knownOfferings: BusinessFoundationKnowledgeItemProjection[];
  knownServices: BusinessFoundationKnowledgeItemProjection[];
  knownProducts: BusinessFoundationKnowledgeItemProjection[];
  evidenceCount: number;
  unknownOfferings: string[];
  lowConfidenceMarkers: string[];
};

export type BusinessFoundationAudienceProjection = {
  knownAudience: BusinessFoundationKnowledgeItemProjection[];
  unknownAudience: string[];
  missingAudienceKnowledge: string[];
  confidence: BusinessFoundationConfidenceProjection;
};

export type BusinessFoundationMissingKnowledgeProjection = {
  known: BusinessFoundationKnowledgeItemProjection[];
  unknown: string[];
  assumed: string[];
};

export type BusinessFoundationTimelineStepProjection = {
  label: string;
  artifactKind: string;
  artifactId: string | null;
  contributes: string;
};

export type BusinessFoundationHealthProjection = {
  businessConfidence: BusinessFoundationConfidenceProjection;
  knownKnowledgeCount: number;
  missingKnowledgeCount: number;
  limitationCount: number;
  evidenceQuality: string;
  readinessForWebsiteGeneration: string;
};

export type GenerationBusinessFoundationProjection = {
  siteVersionId: string;
  sourceSiteId: string | null;
  dryRunId: string | null;
  summary: BusinessFoundationSummaryProjection;
  offerings: BusinessFoundationOfferingsProjection;
  audience: BusinessFoundationAudienceProjection;
  knowledgeGroups: BusinessFoundationKnowledgeGroupProjection[];
  missingKnowledge: BusinessFoundationMissingKnowledgeProjection;
  transformationStory: BusinessFoundationTimelineStepProjection[];
  businessHealth: BusinessFoundationHealthProjection;
  artifactExplorer: BusinessFoundationArtifactLinkProjection[];
  attentionStates: BusinessFoundationAttentionState[];
  diagnostics: string[];
  hero: BusinessFoundationHeroProjection;
  sourceWebsite: SourceWebsiteProjection;
  generatedIterations: GeneratedIterationLinkProjection[];
  narrative: BusinessNarrativeProjection;
  productAttentionSummary: ProductAttentionSummaryProjection;
  visualIdentity: VisualIdentityProjection;
  importedAssets: ImportedAssetSummaryProjection;
  productKnowledgeGaps: ProductKnowledgeGapProjection[];
  advancedTechnical: AdvancedTechnicalProjection;
};

type SiteVersionLoader = (siteVersionId: string) => Promise<Pick<CanonicalSiteVersionSnapshot, "id" | "siteId" | "versionNo" | "state" | "createdAt" | "importProvenanceSummary"> | null>;
type RawImportedSiteArtifactLoader = (siteVersionId: string) => Promise<RawImportedSiteArtifact | null>;
type RawTemplateSiteAssetLoader = (input: { siteVersionId: string; filePath: string; artifactId?: string | null }) => Promise<{ mediaType: string; sizeBytes: number; sha256: string } | null>;

type ProjectionRecord = {
  artifactId?: string;
  status?: string;
  createdAt?: string;
  persistedAt?: string;
  dryRunId?: string;
  artifact?: Record<string, unknown>;
  [key: string]: unknown;
};

export type GenerationBusinessFoundationProjectionOptions = RuntimeStoreDbOptions & {
  getSiteVersion?: SiteVersionLoader;
  getRawImportedSiteArtifact?: RawImportedSiteArtifactLoader;
  getRawTemplateSiteAsset?: RawTemplateSiteAssetLoader;
  getPreviewBundleAvailability?: (iteration: number) => Promise<GenerationPreviewBundleAvailability | null>;
};

const KNOWLEDGE_GROUPS = [
  ["business_identity", "Identity"],
  ["offerings", "Offerings"],
  ["goals", "Goals"],
  ["brand", "Brand"],
  ["content", "Content"],
  ["trust", "Trust"],
  ["digital_presence", "Digital Presence"],
  ["constraints", "Constraints"],
] as const;

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asArray(value: unknown): ProjectionRecord[] {
  return Array.isArray(value) ? value.filter((item): item is ProjectionRecord => asRecord(item) !== null) : [];
}

function text(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter((item): item is string => item !== null)
    : [];
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function hostnameFromUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function artifactBody(record: ProjectionRecord | null): Record<string, unknown> | null {
  return asRecord(record?.artifact) ?? null;
}

function confidence(value: unknown): BusinessFoundationConfidenceProjection {
  const record = asRecord(value);
  return {
    level: text(record?.level),
    reasons: strings(record?.reasons),
  };
}

function evidenceCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function limitationsFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      const record = asRecord(item);
      return text(record?.message ?? record?.code ?? record?.limitationId);
    })
    .filter((item): item is string => item !== null);
}

function summaryRecords(summary: RuntimeImportProvenanceSummary | null | undefined, key: string): ProjectionRecord[] {
  return asArray((summary as Record<string, unknown> | null | undefined)?.[key]);
}

function latest(records: ProjectionRecord[]): ProjectionRecord | null {
  return records.slice().sort((left, right) =>
    text(left.persistedAt)?.localeCompare(text(right.persistedAt) ?? "") ||
    text(left.artifactId)?.localeCompare(text(right.artifactId) ?? "") ||
    0).at(-1) ?? null;
}

function findRecord(records: ProjectionRecord[], predicate: (record: ProjectionRecord, artifact: Record<string, unknown> | null) => boolean): ProjectionRecord | null {
  return records.find((record) => predicate(record, artifactBody(record))) ?? null;
}

function artifactLink(input: {
  label: string;
  kind: string;
  record?: ProjectionRecord | null;
  canonicalIdKey?: string;
}): BusinessFoundationArtifactLinkProjection {
  const record = input.record ?? null;
  const artifact = artifactBody(record);
  const artifactId = text(record?.artifactId);
  return {
    label: input.label,
    kind: input.kind,
    artifactId,
    canonicalId: text(input.canonicalIdKey ? record?.[input.canonicalIdKey] ?? artifact?.[input.canonicalIdKey] : null),
    status: text(record?.status ?? artifact?.status),
    href: artifactId ? `#artifact-${artifactId}` : null,
    referenceOnly: true,
    missing: !artifactId,
  };
}

function itemProjection(item: unknown): BusinessFoundationKnowledgeItemProjection | null {
  const record = asRecord(item);
  const statement = text(record?.statement ?? record?.summary ?? record?.reason);
  const domain = text(record?.domain);
  if (!record || !statement || !domain) return null;
  return {
    id: text(record.knowledgeItemId ?? record.findingId ?? record.missingKnowledgeId ?? record.textItemId),
    domain,
    kind: text(record.kind ?? record.itemType),
    statement,
    confidence: confidence(record.confidence),
    evidenceCount: evidenceCount(record.evidenceRefs),
    limitations: limitationsFrom(record.limitations),
    status: text(record.status),
  };
}

function dbtKnowledge(dbtArtifact: Record<string, unknown> | null): BusinessFoundationKnowledgeItemProjection[] {
  return Array.isArray(dbtArtifact?.knowledgeItems)
    ? dbtArtifact.knowledgeItems.map(itemProjection).filter((item): item is BusinessFoundationKnowledgeItemProjection => item !== null)
    : [];
}

function dbtMissing(dbtArtifact: Record<string, unknown> | null): string[] {
  if (!Array.isArray(dbtArtifact?.missingKnowledge)) return [];
  return dbtArtifact.missingKnowledge
    .map((item) => {
      const record = asRecord(item);
      const domain = text(record?.domain);
      const reason = text(record?.reason);
      return reason ? `${domain ?? "unknown"}: ${reason}` : null;
    })
    .filter((item): item is string => item !== null);
}

function groupConfidence(items: BusinessFoundationKnowledgeItemProjection[], fallback: BusinessFoundationConfidenceProjection): BusinessFoundationConfidenceProjection {
  const levels = items.map((item) => item.confidence.level).filter(Boolean);
  if (levels.includes("LOW")) return { level: "LOW", reasons: [...new Set(items.flatMap((item) => item.confidence.reasons))] };
  if (levels.includes("MEDIUM")) return { level: "MEDIUM", reasons: [...new Set(items.flatMap((item) => item.confidence.reasons))] };
  return {
    level: levels.includes("HIGH") ? "HIGH" : fallback.level,
    reasons: [...new Set(items.flatMap((item) => item.confidence.reasons).concat(fallback.reasons))],
  };
}

function firstStatement(items: BusinessFoundationKnowledgeItemProjection[], domain: string): string | null {
  return items.find((item) => item.domain === domain)?.statement ?? null;
}

function statements(items: BusinessFoundationKnowledgeItemProjection[], domain: string): string[] {
  return items.filter((item) => item.domain === domain).map((item) => item.statement);
}

function allEvidenceCount(items: BusinessFoundationKnowledgeItemProjection[]): number {
  return items.reduce((total, item) => total + item.evidenceCount, 0);
}

function splitOfferingItems(items: BusinessFoundationKnowledgeItemProjection[], kindPart: string): BusinessFoundationKnowledgeItemProjection[] {
  return items.filter((item) => `${item.kind ?? ""} ${item.statement}`.toLowerCase().includes(kindPart));
}

function assumedKnowledge(items: BusinessFoundationKnowledgeItemProjection[]): string[] {
  return items
    .filter((item) => {
      const marker = `${item.kind ?? ""} ${item.statement} ${item.confidence.reasons.join(" ")}`.toLowerCase();
      return marker.includes("assum");
    })
    .map((item) => item.statement);
}

async function defaultGetSiteVersion(siteVersionId: string, options: RuntimeStoreDbOptions) {
  const { getSiteVersion } = await import("../runtime/runtime-store");
  return getSiteVersion(siteVersionId, options);
}

async function defaultGetRawImportedSiteArtifact(siteVersionId: string, options: RuntimeStoreDbOptions) {
  const { getRawImportedSiteArtifact } = await import("../runtime/runtime-store");
  return getRawImportedSiteArtifact(siteVersionId, options);
}

async function defaultGetRawTemplateSiteAsset(
  input: { siteVersionId: string; filePath: string; artifactId?: string | null },
  options: RuntimeStoreDbOptions,
) {
  const { getRawTemplateSiteAsset } = await import("../runtime/runtime-store");
  return getRawTemplateSiteAsset({ ...input, dbClient: options.dbClient });
}

function fileExtension(path: string): string {
  return path.split(/[?#]/, 1)[0]?.split(".").pop()?.toLowerCase() ?? "";
}

function classifyAsset(path: string, meta: RawTemplateSiteFileMeta): ImportedAssetPreviewProjection["type"] {
  const lower = `${path} ${meta.mediaType}`.toLowerCase();
  const extension = fileExtension(path);
  if (lower.includes("logo")) return "logo_candidate";
  if (extension === "ico" || lower.includes("favicon") || lower.includes("icon")) return "icon";
  if (meta.mediaType.startsWith("font/") || ["woff", "woff2", "ttf", "otf", "eot"].includes(extension)) return "font";
  if (meta.mediaType.startsWith("video/") || ["mp4", "webm", "mov"].includes(extension)) return "video";
  if (meta.mediaType.startsWith("image/")) return lower.includes("bg") || lower.includes("background") || lower.includes("pattern") ? "decorative_image" : "content_image";
  if (["pdf", "doc", "docx", "rtf", "odt"].includes(extension)) return "document";
  if (meta.mediaType === "application/octet-stream") return "unclassified";
  return "other";
}

function previewHref(input: { sourceSiteId: string | null; siteVersionId: string; path: string; mediaType: string }): string | null {
  if (!input.sourceSiteId) return null;
  if (!input.mediaType.startsWith("image/")) return null;
  const safePath = input.path.replace(/^\/+/, "");
  if (!safePath || safePath.split("/").some((segment) => segment === "..")) return null;
  return `/api/gnr8/runtime/preview-assets/${encodeURIComponent(input.sourceSiteId)}/${encodeURIComponent(input.siteVersionId)}/${safePath}`;
}

async function assetSummary(input: {
  sourceSiteId: string | null;
  siteVersionId: string;
  rawImportedSiteArtifact: RawImportedSiteArtifact | null;
  getRawTemplateSiteAsset: RawTemplateSiteAssetLoader;
}): Promise<ImportedAssetSummaryProjection> {
  const fileMap = input.rawImportedSiteArtifact?.fileMap ?? {};
  const baseAssets = Object.values(fileMap)
    .filter((meta) => meta.path !== input.rawImportedSiteArtifact?.entryHtmlPath)
    .map((meta): ImportedAssetPreviewProjection => {
      const type = classifyAsset(meta.path, meta);
      return {
        filename: meta.path.split("/").pop() ?? meta.path,
        path: meta.path,
        type,
        mediaType: meta.mediaType,
        source: "Original imported website file map",
        previewHref: null,
        dimensions: null,
        sizeBytes: meta.sizeBytes,
      };
    })
    .sort((left, right) => {
      const rank = (asset: ImportedAssetPreviewProjection) => {
        if (asset.type === "logo_candidate") return 0;
        if (asset.previewHref) return 1;
        if (asset.mediaType.startsWith("image/")) return 2;
        if (asset.type === "font") return 3;
        return 4;
      };
      return rank(left) - rank(right) || left.path.localeCompare(right.path);
    });
  const previewCandidates = baseAssets
    .filter((asset) => asset.mediaType.startsWith("image/"))
    .slice(0, 12);
  const verifiedPreviewHrefByPath = new Map<string, string>();
  for (const asset of previewCandidates) {
    const href = previewHref({ sourceSiteId: input.sourceSiteId, siteVersionId: input.siteVersionId, path: asset.path, mediaType: asset.mediaType });
    if (!href) continue;
    const persistedAsset = await input.getRawTemplateSiteAsset({
      siteVersionId: input.siteVersionId,
      filePath: asset.path,
      artifactId: input.rawImportedSiteArtifact?.id ?? null,
    });
    if (persistedAsset) verifiedPreviewHrefByPath.set(asset.path, href);
  }
  const assets = baseAssets.map((asset) => ({
    ...asset,
    previewHref: verifiedPreviewHrefByPath.get(asset.path) ?? null,
  }));
  const visualPreviews = assets
    .filter((asset) => asset.previewHref || asset.mediaType.startsWith("image/") || asset.type === "font")
    .slice(0, 12);
  return {
    total: baseAssets.length,
    logos: assets.filter((asset) => asset.type === "logo_candidate").length,
    images: assets.filter((asset) => asset.type === "content_image" || asset.type === "decorative_image").length,
    icons: assets.filter((asset) => asset.type === "icon").length,
    fonts: assets.filter((asset) => asset.type === "font").length,
    videos: assets.filter((asset) => asset.type === "video").length,
    otherFiles: assets.filter((asset) => !["logo_candidate", "content_image", "decorative_image", "icon", "font", "video"].includes(asset.type)).length,
    previews: visualPreviews,
    unavailableMessage: baseAssets.length === 0 ? "No imported visual assets are available in the current persisted file map." : null,
  };
}

function collectColorCandidates(summary: RuntimeImportProvenanceSummary | null | undefined): BrandColorProjection[] {
  const baseline = summary?.evidenceCaptureBaselineArtifact as unknown as Record<string, unknown> | null | undefined;
  const computedStyle = asRecord(baseline?.computedStyle);
  const candidates = Array.isArray(computedStyle?.colorCandidates) ? computedStyle.colorCandidates : [];
  return candidates
    .map((item, index): BrandColorProjection | null => {
      const record = asRecord(item);
      const value = text(record?.value);
      if (!value) return null;
      return {
        value,
        label: index === 0 ? "Observed color candidate" : `Observed color candidate ${index + 1}`,
        source: "Persisted evidence capture computed-style candidates",
        confidence: null,
        status: "observed",
      };
    })
    .filter((item): item is BrandColorProjection => item !== null)
    .slice(0, 8);
}

function collectTypography(summary: RuntimeImportProvenanceSummary | null | undefined, assets: ImportedAssetSummaryProjection): TypographyProjection[] {
  const baseline = summary?.evidenceCaptureBaselineArtifact as unknown as Record<string, unknown> | null | undefined;
  const computedStyle = asRecord(baseline?.computedStyle);
  const fonts = Array.isArray(computedStyle?.fontsDetected) ? computedStyle.fontsDetected : [];
  const localFontAvailable = assets.fonts > 0;
  return fonts
    .map((item): TypographyProjection | null => {
      const record = asRecord(item);
      const family = text(record?.family);
      if (!family) return null;
      return {
        family,
        source: text(record?.source) ?? "persisted computed-style evidence",
        confidence: text(record?.providerClassification),
        locallyAvailable: localFontAvailable,
      };
    })
    .filter((item): item is TypographyProjection => item !== null)
    .slice(0, 8);
}

function sourceWebsiteProjection(input: {
  rawImportedSiteArtifact: RawImportedSiteArtifact | null;
  siteVersion: Awaited<ReturnType<SiteVersionLoader>> | null;
  summary: RuntimeImportProvenanceSummary | null;
}): SourceWebsiteProjection {
  const url = text(input.rawImportedSiteArtifact?.metadata?.sourceUrl);
  return {
    url,
    hostname: hostnameFromUrl(url),
    importedAt: text(input.rawImportedSiteArtifact?.createdAt ?? input.siteVersion?.createdAt ?? input.summary?.captureJob?.completedAt),
    status: text(input.summary?.importFidelityStatus ?? input.summary?.renderedCaptureStatus),
    unavailableMessage: url ? null : "Original website URL is not available in the current persisted evidence.",
  };
}

function iterationResultSummary(iteration: Awaited<ReturnType<typeof loadGenerationEvolutionDashboardProjection>>["iterations"][number]): string {
  if (iteration.iteration === 2 && iteration.evolution) {
    const parts = [
      iteration.evolution.meaningfulImprovement ? "meaningful improvement" : "no persisted meaningful-improvement signal",
      iteration.evolution.newlyCompliantCategories.length > 0 ? `${iteration.evolution.newlyCompliantCategories.length} newly compliant categories` : "no newly compliant categories recorded",
      iteration.evolution.noRegressions ? "no regressions" : `${iteration.evolution.regressionCount} regressions recorded`,
      iteration.compliance.status ? `still ${iteration.compliance.status}` : "compliance state unavailable",
    ];
    return parts.join("; ");
  }
  return iteration.compliance.status
    ? `Generated proposal preview with ${iteration.compliance.status} compliance state.`
    : "Generated proposal preview exists only where persisted iteration evidence is available.";
}

function productKnowledgeGaps(input: {
  unknownOfferings: string[];
  unknownAudience: string[];
  colorCount: number;
  typographyCount: number;
  logoStatus: BusinessFoundationAvailabilityState;
  missing: string[];
  limitationCount: number;
}): ProductKnowledgeGapProjection[] {
  const gaps: ProductKnowledgeGapProjection[] = [];
  if (input.unknownAudience.length > 0) {
    gaps.push({ label: "Audience", status: "critical", summary: "Target audience remains unresolved.", generationImpact: "limits audience targeting" });
  }
  if (input.unknownOfferings.length > 0) {
    gaps.push({ label: "Offerings", status: "critical", summary: "GNR8 has not yet confirmed the service portfolio.", generationImpact: "limits service hierarchy" });
  }
  if (input.colorCount === 0) {
    gaps.push({ label: "Canonical brand colors", status: "missing", summary: "No canonical brand colors are currently persisted.", generationImpact: "limits visual brand fidelity" });
  }
  if (input.typographyCount === 0) {
    gaps.push({ label: "Canonical typography", status: "missing", summary: "Typography was not captured as canonical brand knowledge.", generationImpact: "limits visual brand fidelity" });
  }
  if (input.logoStatus !== "detected") {
    gaps.push({ label: "Confirmed logo", status: "partial", summary: "A confirmed canonical logo is not fully established in the Business Foundation projection.", generationImpact: "Affects generation confidence" });
  }
  for (const item of input.missing.slice(0, Math.max(0, 6 - gaps.length))) {
    gaps.push({ label: item.split(":", 1)[0] ?? "Missing knowledge", status: "unresolved", summary: item, generationImpact: "Affects generation confidence" });
  }
  if (gaps.length === 0 && input.limitationCount > 0) {
    gaps.push({ label: "Technical limitations", status: "partial", summary: `${input.limitationCount} persisted technical limitations remain in advanced details.`, generationImpact: "Affects generation confidence" });
  }
  return gaps;
}

export async function loadGenerationBusinessFoundationProjection(input: {
  siteVersionId: string;
  options?: GenerationBusinessFoundationProjectionOptions;
}): Promise<GenerationBusinessFoundationProjection> {
  const options = input.options ?? {};
  const siteVersion = options.getSiteVersion
    ? await options.getSiteVersion(input.siteVersionId)
    : await defaultGetSiteVersion(input.siteVersionId, options);
  const summary = siteVersion?.importProvenanceSummary ?? null;
  const rawImportedSiteArtifact = options.getRawImportedSiteArtifact
    ? await options.getRawImportedSiteArtifact(input.siteVersionId)
    : await defaultGetRawImportedSiteArtifact(input.siteVersionId, options);
  const getRawTemplateSiteAsset = options.getRawTemplateSiteAsset ??
    ((assetInput: { siteVersionId: string; filePath: string; artifactId?: string | null }) => defaultGetRawTemplateSiteAsset(assetInput, options));
  const evolutionProjection = await loadGenerationEvolutionDashboardProjection({
    siteVersionId: input.siteVersionId,
    options: {
      ...options,
      getSiteVersion: options.getSiteVersion,
      getPreviewBundleAvailability: options.getPreviewBundleAvailability,
    },
  });
  const diagnostics: string[] = [];
  const attention = new Set<BusinessFoundationAttentionState>();

  if (!summary) diagnostics.push("BUSINESS_FOUNDATION_PROVENANCE_MISSING");

  const businessDiscovery = latest(summaryRecords(summary, "businessDiscoveryArtifacts"));
  const dbtRecords = summaryRecords(summary, "digitalBusinessTwinArtifacts");
  const businessUnderstanding = latest(summaryRecords(summary, "businessUnderstandingReportArtifacts"));
  const businessAlignment = latest(summaryRecords(summary, "businessAlignmentArtifacts"));
  const websiteDesignBrief = latest(summaryRecords(summary, "websiteDesignBriefArtifacts"));
  const websiteGenerationPackage = latest(summaryRecords(summary, "websiteGenerationPackageArtifacts"));

  const alignmentArtifact = artifactBody(businessAlignment);
  const outputDbtId = text(asRecord(alignmentArtifact?.lineage)?.outputDigitalBusinessTwinId);
  const alignedDbt = findRecord(dbtRecords, (record, artifact) =>
    text(record.digitalBusinessTwinId ?? artifact?.digitalBusinessTwinId) === outputDbtId) ??
    dbtRecords.slice().reverse().find((record) => ["aligned", "confirmed"].includes(text(record.status ?? artifactBody(record)?.status) ?? "")) ??
    latest(dbtRecords);
  const sourceDbt = findRecord(dbtRecords, (record, artifact) =>
    text(record.digitalBusinessTwinId ?? artifact?.digitalBusinessTwinId) === text(asRecord(artifactBody(businessUnderstanding)?.lineage)?.sourceDigitalBusinessTwinId)) ??
    dbtRecords.find((record) => record !== alignedDbt) ??
    alignedDbt;

  const alignedDbtArtifact = artifactBody(alignedDbt);
  const knowledge = dbtKnowledge(alignedDbtArtifact);
  const missing = dbtMissing(alignedDbtArtifact);
  const topConfidence = confidence(alignedDbtArtifact?.confidence);
  const topLimitations = [
    ...limitationsFrom(alignedDbtArtifact?.limitations),
    ...limitationsFrom(artifactBody(businessDiscovery)?.limitations),
    ...limitationsFrom(artifactBody(businessUnderstanding)?.limitations),
    ...limitationsFrom(artifactBody(businessAlignment)?.limitations),
    ...limitationsFrom(artifactBody(websiteDesignBrief)?.limitations),
    ...limitationsFrom(artifactBody(websiteGenerationPackage)?.limitations),
  ];

  const knowledgeGroups = KNOWLEDGE_GROUPS.map(([key, label]) => {
    const groupItems = knowledge.filter((item) => item.domain === key);
    const groupMissing = missing.filter((item) => item.startsWith(`${key}:`));
    const limitations = [...new Set(groupItems.flatMap((item) => item.limitations))];
    return {
      key,
      label,
      confidence: groupConfidence(groupItems, topConfidence),
      evidenceCount: groupItems.reduce((total, item) => total + item.evidenceCount, 0),
      limitations,
      statements: groupItems,
      missing: groupMissing,
    };
  });

  const offeringItems = knowledge.filter((item) => item.domain === "offerings");
  const audienceItems = knowledge.filter((item) => item.domain === "audience");
  const lowConfidenceMarkers = offeringItems
    .filter((item) => item.confidence.level === "LOW" || item.confidence.level === "MEDIUM")
    .map((item) => item.id ?? item.statement);
  const unknownOfferings = missing.filter((item) => item.startsWith("offerings:"));
  const unknownAudience = missing.filter((item) => item.startsWith("audience:"));
  const assumed = assumedKnowledge(knowledge);
  const sourceSiteId = text(siteVersion?.siteId ?? businessDiscovery?.sourceSiteId ?? artifactBody(businessDiscovery)?.sourceSiteId);
  const sourceWebsite = sourceWebsiteProjection({ rawImportedSiteArtifact, siteVersion, summary });
  const importedAssets = await assetSummary({ sourceSiteId, siteVersionId: input.siteVersionId, rawImportedSiteArtifact, getRawTemplateSiteAsset });
  const logoAsset = importedAssets.previews.find((asset) => asset.type === "logo_candidate") ?? null;
  const colorCandidates = collectColorCandidates(summary);
  const typography = collectTypography(summary, importedAssets);
  const visualLimitations = [
    ...(colorCandidates.length === 0 ? ["No canonical brand colors are currently persisted."] : []),
    ...(typography.length === 0 ? ["Typography was not captured as canonical brand knowledge."] : []),
    ...topLimitations.filter((item) => item.toLowerCase().includes("asset") || item.toLowerCase().includes("brand")).slice(0, 5),
  ];
  const visualIdentity: VisualIdentityProjection = {
    status: logoAsset || colorCandidates.length > 0 || typography.length > 0 ? "partially_detected" : "unresolved",
    logo: {
      status: logoAsset ? "detected" : "unresolved",
      assetReference: logoAsset?.path ?? null,
      previewHref: logoAsset?.previewHref ?? null,
      unavailableMessage: logoAsset ? null : "No confirmed logo preview is available in the current persisted imported asset evidence.",
    },
    primaryColors: colorCandidates.slice(0, 3),
    secondaryColors: colorCandidates.slice(3, 8),
    typography,
    tone: firstStatement(knowledge, "brand"),
    visualStyleObservations: statements(knowledge, "brand"),
    confidence: topConfidence.level,
    limitations: visualLimitations,
  };

  if (topConfidence.level === "LOW" || knowledge.some((item) => item.confidence.level === "LOW")) attention.add("low_confidence");
  if (audienceItems.length === 0 || unknownAudience.length > 0) attention.add("missing_audience");
  if (offeringItems.length === 0 || unknownOfferings.length > 0) attention.add("missing_offerings");
  if (knowledge.reduce((total, item) => total + item.evidenceCount, 0) === 0) attention.add("missing_evidence");
  if (topLimitations.length >= 10) attention.add("large_limitation_count");
  if (
    missing.length > 0 ||
    ["partial", "blocked"].includes(text(alignedDbt?.status ?? alignedDbtArtifact?.status) ?? "") ||
    ["partial", "blocked"].includes(text(websiteDesignBrief?.status ?? artifactBody(websiteDesignBrief)?.status) ?? "") ||
    ["partial", "blocked"].includes(text(websiteGenerationPackage?.status ?? artifactBody(websiteGenerationPackage)?.status) ?? "")
  ) {
    attention.add("business_partially_understood");
  }

  const artifactExplorer = [
    artifactLink({ label: "Business Discovery", kind: "business_discovery", record: businessDiscovery, canonicalIdKey: "businessDiscoveryId" }),
    artifactLink({ label: "Digital Business Twin", kind: "digital_business_twin", record: sourceDbt, canonicalIdKey: "digitalBusinessTwinId" }),
    artifactLink({ label: "Business Understanding Report", kind: "business_understanding_report", record: businessUnderstanding, canonicalIdKey: "businessUnderstandingReportId" }),
    artifactLink({ label: "Business Alignment", kind: "business_alignment", record: businessAlignment, canonicalIdKey: "businessAlignmentId" }),
    artifactLink({ label: "Aligned Digital Business Twin", kind: "aligned_digital_business_twin", record: alignedDbt, canonicalIdKey: "digitalBusinessTwinId" }),
    artifactLink({ label: "Website Design Brief", kind: "website_design_brief", record: websiteDesignBrief, canonicalIdKey: "websiteDesignBriefId" }),
    artifactLink({ label: "Website Generation Package", kind: "website_generation_package", record: websiteGenerationPackage, canonicalIdKey: "websiteGenerationPackageId" }),
  ];

  const generatedIterations: GeneratedIterationLinkProjection[] = evolutionProjection.iterations.map((iteration) => ({
    label: iteration.label,
    iteration: iteration.iteration,
    status: iteration.status,
    createdAt: iteration.generatedAt,
    complianceState: iteration.compliance.status,
    previewHref: iteration.preview.route,
    previewAvailable: iteration.preview.available,
    resultSummary: iterationResultSummary(iteration),
    isLatest: iteration.iteration === Math.max(...evolutionProjection.iterations.map((item) => item.iteration)),
    quarantined: true,
    approved: false,
    published: false,
  }));
  const latestIteration = generatedIterations.find((iteration) => iteration.isLatest) ?? null;
  const productGaps = productKnowledgeGaps({
    unknownOfferings,
    unknownAudience,
    colorCount: colorCandidates.length,
    typographyCount: typography.length,
    logoStatus: visualIdentity.logo.status,
    missing,
    limitationCount: topLimitations.length,
  });
  const generationReadiness = text(websiteGenerationPackage?.status ?? artifactBody(websiteGenerationPackage)?.status);
  const narrative: BusinessNarrativeProjection = {
    headline: firstStatement(knowledge, "business_identity") ?? "Business identity is not fully available in persisted evidence.",
    businessIdentity: firstStatement(knowledge, "business_identity"),
    websitePurpose: firstStatement(knowledge, "content") ?? firstStatement(knowledge, "digital_presence"),
    goals: statements(knowledge, "goals"),
    trustSignals: statements(knowledge, "trust"),
    digitalPresence: firstStatement(knowledge, "digital_presence"),
    uncertainties: missing.slice(0, 6),
  };
  const result = {
    siteVersionId: input.siteVersionId,
    sourceSiteId,
    dryRunId: text(alignedDbt?.dryRunId ?? websiteGenerationPackage?.dryRunId ?? businessDiscovery?.dryRunId),
    summary: {
      businessName: text(siteVersion?.siteId ?? businessDiscovery?.sourceSiteId ?? artifactBody(businessDiscovery)?.sourceSiteId),
      businessIdentity: firstStatement(knowledge, "business_identity"),
      businessPurpose: firstStatement(knowledge, "content") ?? firstStatement(knowledge, "digital_presence"),
      businessGoals: statements(knowledge, "goals"),
      businessConfidence: topConfidence,
      businessTone: firstStatement(knowledge, "brand"),
      trustStrategy: firstStatement(knowledge, "trust"),
      digitalPresence: firstStatement(knowledge, "digital_presence"),
    },
    offerings: {
      knownOfferings: offeringItems,
      knownServices: splitOfferingItems(offeringItems, "service"),
      knownProducts: splitOfferingItems(offeringItems, "product"),
      evidenceCount: offeringItems.reduce((total, item) => total + item.evidenceCount, 0),
      unknownOfferings,
      lowConfidenceMarkers,
    },
    audience: {
      knownAudience: audienceItems,
      unknownAudience,
      missingAudienceKnowledge: unknownAudience,
      confidence: groupConfidence(audienceItems, topConfidence),
    },
    knowledgeGroups,
    missingKnowledge: {
      known: knowledge,
      unknown: missing,
      assumed: assumed.length > 0 ? assumed : ["No persisted assumptions were found in the business foundation artifacts."],
    },
    transformationStory: [
      {
        label: "Business Discovery",
        artifactKind: "business_discovery",
        artifactId: artifactExplorer[0].artifactId,
        contributes: "Captures deterministic website-derived business signals and limitations.",
      },
      {
        label: "Digital Business Twin",
        artifactKind: "digital_business_twin",
        artifactId: artifactExplorer[1].artifactId,
        contributes: "Turns discovery findings into structured business knowledge and missing knowledge.",
      },
      {
        label: "Business Understanding",
        artifactKind: "business_understanding_report",
        artifactId: artifactExplorer[2].artifactId,
        contributes: "Projects the Digital Business Twin into a readable business report.",
      },
      {
        label: "Business Alignment",
        artifactKind: "business_alignment",
        artifactId: artifactExplorer[3].artifactId,
        contributes: "Records governed corrections or confirmations and identifies the aligned DBT.",
      },
      {
        label: "Website Design Brief",
        artifactKind: "website_design_brief",
        artifactId: artifactExplorer[5].artifactId,
        contributes: "Transforms aligned business knowledge into website experience intent.",
      },
      {
        label: "Website Generation Package",
        artifactKind: "website_generation_package",
        artifactId: artifactExplorer[6].artifactId,
        contributes: "Transforms website intent into provider-neutral generation requirements.",
      },
    ],
    businessHealth: {
      businessConfidence: topConfidence,
      knownKnowledgeCount: knowledge.length,
      missingKnowledgeCount: missing.length,
      limitationCount: topLimitations.length,
      evidenceQuality: knowledge.some((item) => item.evidenceCount > 0) ? "evidence-linked persisted knowledge" : "missing persisted evidence references",
      readinessForWebsiteGeneration: text(websiteGenerationPackage?.status ?? artifactBody(websiteGenerationPackage)?.status) ?? "missing Website Generation Package",
    },
    artifactExplorer,
    attentionStates: [...attention],
    diagnostics,
    hero: {
      businessName: text(siteVersion?.siteId ?? businessDiscovery?.sourceSiteId ?? artifactBody(businessDiscovery)?.sourceSiteId),
      sourceWebsite,
      description: firstStatement(knowledge, "business_identity"),
      websitePurpose: firstStatement(knowledge, "content") ?? firstStatement(knowledge, "digital_presence"),
      understandingConfidence: topConfidence.level,
      currentState: attention.has("business_partially_understood") ? "Partially understood / aligned with limitations" : "Aligned with available persisted evidence",
      missingKnowledgeSummary: productGaps[0]?.summary ?? "No material missing knowledge is highlighted by the current persisted artifacts.",
      primaryLinks: {
        originalWebsiteHref: sourceWebsite.url,
        evolutionHref: `/gnr8/admin/evolution/${input.siteVersionId}`,
        latestGeneratedProposalHref: latestIteration?.previewHref ?? null,
      },
    },
    sourceWebsite,
    generatedIterations,
    narrative,
    productAttentionSummary: {
      businessIdentity: narrative.businessIdentity ? "understood" : "unresolved",
      websitePurpose: narrative.websitePurpose ? "understood" : "unresolved",
      offerings: offeringItems.length > 0 && unknownOfferings.length === 0 ? "understood" : "unresolved",
      audience: audienceItems.length > 0 && unknownAudience.length === 0 ? "understood" : "unresolved",
      visualIdentity: visualIdentity.status,
      generationReadiness: generationReadiness && !["missing", "blocked"].includes(generationReadiness) ? "partial" : "unavailable",
      latestWebsiteEvolution: evolutionProjection.evolution?.meaningfulImprovement ? "meaningful improvement" : "not available",
    },
    visualIdentity,
    importedAssets,
    productKnowledgeGaps: productGaps,
    advancedTechnical: {
      siteVersionId: input.siteVersionId,
      dryRunId: text(alignedDbt?.dryRunId ?? websiteGenerationPackage?.dryRunId ?? businessDiscovery?.dryRunId),
      sourceSiteId,
      evidenceCount: allEvidenceCount(knowledge),
      diagnosticMarkers: diagnostics,
      limitationCount: topLimitations.length,
    },
  } satisfies GenerationBusinessFoundationProjection;
  return cloneJson(result);
}
