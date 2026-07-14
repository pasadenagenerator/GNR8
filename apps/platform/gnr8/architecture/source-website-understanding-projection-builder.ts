import { sha256Hex, stableStringify } from "../runtime/deterministic";
import type { RawImportedSiteArtifact, RuntimeImportProvenanceSummary } from "../runtime/types";
import type { CandidateDiscoveryResult } from "./candidate-discovery-contract";
import type { CandidateReviewPackage } from "./candidate-review-contract";
import type { EvidenceCaptureBaselineArtifactRecord } from "./evidence-capture-baseline-artifact";
import type { FirstLimitedDryRunOutput } from "./first-limited-dry-run-contract";
import type { ReconstructionPackage } from "./reconstruction-package-contract";
import type { StructurePlan } from "./structure-plan-contract";
import {
  SOURCE_WEBSITE_CONFIDENCE_LEVELS,
  SOURCE_WEBSITE_KNOWLEDGE_STATES,
  SOURCE_WEBSITE_READINESS_DIMENSION_KEYS,
  SOURCE_WEBSITE_READINESS_STATUSES,
  SOURCE_WEBSITE_UNDERSTANDING_CONTRACT_VERSION,
  type ReviewedCandidateState,
  type SourceAssetUnderstanding,
  type SourceBusinessSignalCandidates,
  type SourceContentUnderstanding,
  type SourceNavigationUnderstanding,
  type SourcePageUnderstanding,
  type SourceRouteUnderstanding,
  type SourceSectionUnderstanding,
  type SourceTechnicalSignals,
  type SourceTypographySignal,
  type SourceVisualIdentitySignals,
  type SourceWebsiteConfidence,
  type SourceWebsiteDiagnostic,
  type SourceWebsiteKnowledgeState,
  type SourceWebsiteLimitation,
  type SourceWebsiteReadiness,
  type SourceWebsiteReadinessDimension,
  type SourceWebsiteUnderstandingArtifactReference,
  type SourceWebsiteUnderstandingProjection,
  type SourceWebsiteUnderstandingValidationResult,
} from "./source-website-understanding-projection-contract";

type StoredArtifact = Record<string, unknown>;

export type SourceWebsiteUnderstandingBuilderInput = {
  siteVersionId: string;
  sourceSiteId: string | null;
  generatedAt?: string;
  siteVersionCreatedAt?: string | null;
  rawImportedSiteArtifact?: RawImportedSiteArtifact | null;
  provenanceSummary?: RuntimeImportProvenanceSummary | null;
  evidenceCaptureBaseline?: EvidenceCaptureBaselineArtifactRecord | null;
  firstLimitedDryRunOutput?: FirstLimitedDryRunOutput | null;
  candidateDiscoveryArtifact?: StoredArtifact | null;
  candidateDiscoveryResult?: CandidateDiscoveryResult | null;
  candidateReviewArtifact?: StoredArtifact | null;
  candidateReviewPackage?: CandidateReviewPackage | null;
  reconstructionPackageArtifact?: StoredArtifact | null;
  reconstructionPackage?: ReconstructionPackage | null;
  structurePlanArtifact?: StoredArtifact | null;
  structurePlan?: StructurePlan | null;
};

export const SOURCE_WEBSITE_UNDERSTANDING_FORBIDDEN_FIELDS = [
  "digitalBusinessTwin",
  "businessUnderstandingReport",
  "businessAlignment",
  "websiteDesignBrief",
  "websiteGenerationPackage",
  "providerPayload",
  "providerPayloads",
  "generatedProposal",
  "generatedProposals",
  "observedWebsiteModel",
  "observedWebsiteModels",
  "complianceArtifact",
  "complianceArtifacts",
  "improvementPlan",
  "improvementPlans",
  "evolutionAnalysis",
  "evolutionAnalyses",
  "publishedSiteState",
  "reactOutput",
  "generatedOutputs",
  "generatedBlocks",
  "generatedContent",
  "designTokens",
  "publishingArtifacts",
  "deploymentArtifacts",
  "executionArtifacts",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

function confidence(level: SourceWebsiteConfidence["level"], reasons: string[]): SourceWebsiteConfidence {
  return { level, reasons: [...new Set(reasons)].sort() };
}

function hostnameFromUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname || null;
  } catch {
    return null;
  }
}

function routePath(value: string | null | undefined): string {
  const clean = String(value ?? "/").split("#")[0].split("?")[0].trim().replace(/\\/g, "/");
  const withSlash = clean.startsWith("/") ? clean : `/${clean}`;
  return withSlash.replace(/\/{2,}/g, "/").replace(/\/+$/g, "") || "/";
}

function stableId(prefix: string, parts: unknown): string {
  return `${prefix}:${sha256Hex(stableStringify(parts)).slice(0, 18)}`;
}

function artifactRef(input: {
  artifact: StoredArtifact | null | undefined;
  fallbackKind: string;
  source: SourceWebsiteUnderstandingArtifactReference["source"];
  canonicalIdFields?: string[];
}): SourceWebsiteUnderstandingArtifactReference | null {
  const artifact = input.artifact;
  if (!artifact) return null;
  const canonicalId = input.canonicalIdFields
    ?.map((field) => text(artifact[field]))
    .find((value): value is string => Boolean(value)) ?? null;
  return {
    kind: text(artifact.kind) ?? text(artifact.artifactKind) ?? input.fallbackKind,
    artifactId: text(artifact.artifactId) ?? text(artifact.id),
    canonicalId,
    version: typeof artifact.artifactVersion === "number" ? artifact.artifactVersion : text(artifact.contractVersion),
    status: text(artifact.status) ?? text(artifact.validationStatus),
    createdAt: text(artifact.createdAt),
    persistedAt: text(artifact.persistedAt),
    source: input.source,
  };
}

function limitation(input: {
  code: string;
  message: string;
  severity?: SourceWebsiteLimitation["severity"];
  sourceRefs?: string[];
}): SourceWebsiteLimitation {
  return {
    limitationId: stableId("source-understanding-limitation", input),
    code: input.code,
    message: input.message,
    severity: input.severity ?? "warning",
    sourceRefs: input.sourceRefs ?? [],
  };
}

function diagnostic(code: string, message: string, sourceRefs: string[] = []): SourceWebsiteDiagnostic {
  return { code, message, sourceRefs };
}

function reviewMap(reviewPackage: CandidateReviewPackage | null | undefined): Map<string, ReviewedCandidateState> {
  const map = new Map<string, ReviewedCandidateState>();
  for (const event of reviewPackage?.reviewEvents ?? []) {
    const current = map.get(event.candidateId);
    if (!current || event.decidedAt.localeCompare((reviewPackage?.reviewEvents.find((item) => item.reviewEventId === current.reviewEventId)?.decidedAt) ?? "") >= 0) {
      map.set(event.candidateId, {
        candidateId: event.candidateId,
        decision: event.decision,
        reviewEventId: event.reviewEventId,
      });
    }
  }
  return map;
}

function reviewState(candidateId: string | null | undefined, reviews: Map<string, ReviewedCandidateState>): "unreviewed" | "approved" | "rejected" | "deferred" | "not_applicable" {
  if (!candidateId) return "not_applicable";
  return reviews.get(candidateId)?.decision ?? "unreviewed";
}

function stateFromReview(candidateId: string | null, reviews: Map<string, ReviewedCandidateState>, fallback: SourceWebsiteKnowledgeState): SourceWebsiteKnowledgeState {
  const state = candidateId ? reviews.get(candidateId)?.decision : null;
  if (state === "rejected") return "rejected";
  if (state === "approved" || state === "deferred") return "reviewed";
  return fallback;
}

function refsFromCandidate(candidate: NonNullable<SourceWebsiteUnderstandingBuilderInput["candidateDiscoveryResult"]>["candidates"][number]): string[] {
  return [...candidate.sourceEvidenceRefs, ...candidate.sourceDryRunRefs]
    .map((ref) => ref.refId)
    .filter((ref) => ref.length > 0)
    .sort();
}

function previewHref(input: { sourceSiteId: string | null; siteVersionId: string; path: string; mediaType: string }): string | null {
  if (!input.sourceSiteId || !input.mediaType.startsWith("image/")) return null;
  const safePath = input.path.replace(/^\/+/, "");
  if (!safePath || safePath.split("/").some((segment) => segment === "..")) return null;
  return `/api/gnr8/runtime/preview-assets/${encodeURIComponent(input.sourceSiteId)}/${encodeURIComponent(input.siteVersionId)}/${safePath}`;
}

function assetKind(path: string, mediaType: string): SourceAssetUnderstanding["assetKind"] {
  const lower = `${path} ${mediaType}`.toLowerCase();
  const extension = path.split(/[?#]/, 1)[0]?.split(".").pop()?.toLowerCase() ?? "";
  if (mediaType === "image/svg+xml" || extension === "svg") return "svg";
  if (extension === "ico" || lower.includes("favicon") || lower.includes("icon")) return "icon";
  if (mediaType.startsWith("font/") || ["woff", "woff2", "ttf", "otf", "eot"].includes(extension)) return "font";
  if (mediaType.startsWith("video/") || ["mp4", "webm", "mov"].includes(extension)) return "video";
  if (["pdf", "doc", "docx", "rtf", "odt"].includes(extension)) return "document";
  if (mediaType.startsWith("image/")) return "image";
  if (mediaType.includes("css")) return "stylesheet";
  if (mediaType.includes("javascript")) return "script";
  if (mediaType.includes("html")) return "html";
  return "other";
}

function semanticImages(summary: RuntimeImportProvenanceSummary | null | undefined): Array<{ src: string; alt: string | null; role: string; sectionId: string | null }> {
  const images = summary?.semanticImport?.assets?.images ?? [];
  return images.map((image) => ({
    src: image.src,
    alt: image.alt ?? null,
    role: image.role,
    sectionId: image.sectionId ?? null,
  }));
}

function buildAssets(input: SourceWebsiteUnderstandingBuilderInput, reviews: Map<string, ReviewedCandidateState>): SourceAssetUnderstanding[] {
  const fileMap = input.rawImportedSiteArtifact?.fileMap ?? {};
  const semanticBySrc = semanticImages(input.provenanceSummary);
  return Object.values(fileMap)
    .filter((meta) => meta.path !== input.rawImportedSiteArtifact?.entryHtmlPath)
    .map((meta) => {
      const semanticMatches = semanticBySrc.filter((image) => image.src === meta.path || image.src.endsWith(meta.path) || meta.path.endsWith(image.src.replace(/^\/+/, "")));
      const firstSemantic = semanticMatches[0] ?? null;
      const kind = assetKind(meta.path, meta.mediaType);
      const lower = `${meta.path} ${firstSemantic?.alt ?? ""} ${firstSemantic?.role ?? ""}`.toLowerCase();
      const isLogoCandidate = lower.includes("logo") || firstSemantic?.role === "logo";
      const candidateMeaning = isLogoCandidate ? "logo_candidate" : kind === "font" ? "typography_asset" : null;
      return {
        assetId: stableId("source-asset", { siteVersionId: input.siteVersionId, path: meta.path, sha256: meta.sha256 }),
        path: meta.path.replace(/^\/+/, ""),
        filename: meta.path.split("/").pop() ?? meta.path,
        mediaType: meta.mediaType,
        sizeBytes: meta.sizeBytes,
        sha256: meta.sha256,
        assetKind: kind,
        dimensions: null,
        usages: semanticMatches.map((image) => ({
          routePath: null,
          usageKind: "semantic_image" as const,
          evidenceRefs: [`semantic-import:image:${image.src}`],
        })),
        altText: firstSemantic?.alt ?? null,
        repeatedUsageCount: Math.max(1, semanticMatches.length),
        inventoryState: "observed",
        evidenceState: semanticMatches.length > 0 ? "structured" : "missing",
        candidateMeaningState: candidateMeaning ? stateFromReview(null, reviews, "candidate") : "unavailable",
        candidateMeaning,
        reviewState: "not_applicable",
        previewHref: previewHref({
          sourceSiteId: input.sourceSiteId,
          siteVersionId: input.siteVersionId,
          path: meta.path,
          mediaType: meta.mediaType,
        }),
        confidence: confidence(candidateMeaning ? "MEDIUM" : "LOW", [
          candidateMeaning ? "Imported asset inventory plus semantic evidence suggests a candidate meaning." : "Imported asset inventory proves file existence only.",
        ]),
        evidenceRefs: [
          `raw-imported-site:file-map:${meta.path}`,
          ...semanticMatches.map((image) => `semantic-import:image:${image.src}`),
        ].sort(),
        limitations: candidateMeaning ? ["Candidate meaning is not human-confirmed or canonical DBT visual identity."] : [],
      } satisfies SourceAssetUnderstanding;
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function buildRoutes(input: SourceWebsiteUnderstandingBuilderInput, reviews: Map<string, ReviewedCandidateState>): SourceRouteUnderstanding[] {
  const byPath = new Map<string, SourceRouteUnderstanding>();
  for (const model of input.firstLimitedDryRunOutput?.routeModels ?? []) {
    byPath.set(routePath(model.routePath), {
      routeId: stableId("source-route", { routePath: routePath(model.routePath), sourceUrl: model.sourceUrl }),
      routePath: routePath(model.routePath),
      sourceUrl: model.sourceUrl,
      title: null,
      purposeCandidate: null,
      state: "structured",
      reviewState: "not_applicable",
      confidence: confidence(model.confidenceLevel, ["First Limited Dry Run route model exists."]),
      evidenceRefs: [...model.sectionRefs, ...model.navigationRefs],
      limitations: [...model.limitationRefs],
    });
  }
  for (const candidate of input.candidateDiscoveryResult?.candidates.filter((item) => item.candidateType === "route") ?? []) {
    const path = routePath(candidate.routePath);
    const existing = byPath.get(path);
    byPath.set(path, {
      routeId: existing?.routeId ?? stableId("source-route", { candidateId: candidate.candidateId, routePath: path }),
      routePath: path,
      sourceUrl: existing?.sourceUrl ?? null,
      title: existing?.title ?? null,
      purposeCandidate: candidate.candidateStatus,
      state: stateFromReview(candidate.candidateId, reviews, "candidate"),
      reviewState: reviewState(candidate.candidateId, reviews),
      confidence: confidence(candidate.confidence.level, candidate.confidence.reasons),
      evidenceRefs: [...new Set([...(existing?.evidenceRefs ?? []), ...refsFromCandidate(candidate)])].sort(),
      limitations: [...new Set([...(existing?.limitations ?? []), ...candidate.limitations.map((item) => item.code)])].sort(),
    });
  }
  if (byPath.size === 0) {
    const url = text(input.rawImportedSiteArtifact?.metadata?.sourceUrl);
    byPath.set("/", {
      routeId: stableId("source-route", { siteVersionId: input.siteVersionId, routePath: "/" }),
      routePath: "/",
      sourceUrl: url,
      title: text(input.provenanceSummary?.semanticImport?.title),
      purposeCandidate: null,
      state: url ? "observed" : "unavailable",
      reviewState: "not_applicable",
      confidence: confidence("LOW", ["Only source import identity is available."]),
      evidenceRefs: url ? ["raw-imported-site:source-url"] : [],
      limitations: ["No structured route model is available."],
    });
  }
  return [...byPath.values()].sort((left, right) => left.routePath.localeCompare(right.routePath));
}

function buildPages(input: SourceWebsiteUnderstandingBuilderInput, routes: SourceRouteUnderstanding[]): SourcePageUnderstanding[] {
  const title = text(input.provenanceSummary?.semanticImport?.title);
  return routes.map((route) => ({
    pageId: stableId("source-page", { siteVersionId: input.siteVersionId, routePath: route.routePath }),
    routePath: route.routePath,
    title: route.title ?? (route.routePath === "/" ? title : null),
    sourceUrl: route.sourceUrl,
    availability: route.state === "unavailable" ? "unavailable" : route.state === "missing" ? "partial" : "available",
    state: route.state === "candidate" ? "structured" : route.state,
    confidence: route.confidence,
    evidenceRefs: route.evidenceRefs,
    limitations: route.limitations,
  }));
}

function navigationKind(label: string, href: string | null): SourceNavigationUnderstanding["navigationKind"] {
  const lower = `${label} ${href ?? ""}`.toLowerCase();
  if (lower.includes("facebook") || lower.includes("instagram") || lower.includes("linkedin") || lower.includes("youtube")) return "social";
  if (href?.startsWith("http")) return "external";
  if (lower.includes("contact") || lower.includes("kontakt") || lower.includes("mailto:") || lower.includes("tel:")) return "contact";
  return "primary";
}

function buildNavigation(input: SourceWebsiteUnderstandingBuilderInput, reviews: Map<string, ReviewedCandidateState>): SourceNavigationUnderstanding[] {
  const items: SourceNavigationUnderstanding[] = [];
  for (const model of input.firstLimitedDryRunOutput?.navigationModels ?? []) {
    for (const item of model.items) {
      items.push({
        navigationId: stableId("source-navigation", { routePath: model.routePath, label: item.label, href: item.href, position: item.position }),
        routePath: routePath(model.routePath),
        label: item.label,
        href: item.href,
        navigationKind: navigationKind(item.label, item.href),
        state: "structured",
        reviewState: "not_applicable",
        confidence: confidence(item.confidenceLevel, ["First Limited Dry Run navigation model exists."]),
        evidenceRefs: item.sourceEvidenceRefs,
        sourceCandidateId: null,
      });
    }
  }
  for (const item of input.provenanceSummary?.semanticImport?.navigation ?? []) {
    items.push({
      navigationId: stableId("source-navigation", { source: "semantic-import", label: item.label, href: item.href }),
      routePath: null,
      label: item.label,
      href: item.href,
      navigationKind: navigationKind(item.label, item.href),
      state: "structured",
      reviewState: "not_applicable",
      confidence: confidence("MEDIUM", ["Semantic import navigation item exists."]),
      evidenceRefs: [`semantic-import:navigation:${item.label}:${item.href}`],
      sourceCandidateId: null,
    });
  }
  for (const candidate of input.candidateDiscoveryResult?.candidates.filter((item) => item.candidateType === "navigation") ?? []) {
    items.push({
      navigationId: stableId("source-navigation", { candidateId: candidate.candidateId }),
      routePath: candidate.routePath ? routePath(candidate.routePath) : null,
      label: `Navigation candidate on ${candidate.routePath ?? "unknown route"}`,
      href: null,
      navigationKind: "unresolved",
      state: stateFromReview(candidate.candidateId, reviews, "candidate"),
      reviewState: reviewState(candidate.candidateId, reviews),
      confidence: confidence(candidate.confidence.level, candidate.confidence.reasons),
      evidenceRefs: refsFromCandidate(candidate),
      sourceCandidateId: candidate.candidateId,
    });
  }
  return items.sort((left, right) =>
    String(left.routePath ?? "").localeCompare(String(right.routePath ?? "")) ||
    left.label.localeCompare(right.label) ||
    String(left.href ?? "").localeCompare(String(right.href ?? "")));
}

function buildSections(input: SourceWebsiteUnderstandingBuilderInput, reviews: Map<string, ReviewedCandidateState>): SourceSectionUnderstanding[] {
  const sections: SourceSectionUnderstanding[] = [];
  let order = 0;
  for (const section of input.provenanceSummary?.semanticImport?.sections ?? []) {
    sections.push({
      sectionId: stableId("source-section", { source: "semantic-import", id: section.id }),
      routePath: "/",
      order: order++,
      heading: section.title,
      semanticType: section.type,
      observedBoundary: true,
      plannedOnly: false,
      state: "structured",
      reviewState: "not_applicable",
      confidence: confidence(section.confidence >= 0.7 ? "HIGH" : section.confidence >= 0.4 ? "MEDIUM" : "LOW", ["Semantic import section exists."]),
      evidenceRefs: [`semantic-import:section:${section.id}`],
      sourceCandidateId: null,
      limitations: section.diagnostics,
    });
  }
  for (const model of input.firstLimitedDryRunOutput?.sectionModels ?? []) {
    sections.push({
      sectionId: stableId("source-section", { source: "first-limited-dry-run", sectionId: model.sectionId, routePath: model.routePath }),
      routePath: routePath(model.routePath),
      order: order++,
      heading: null,
      semanticType: model.regionType,
      observedBoundary: true,
      plannedOnly: false,
      state: "structured",
      reviewState: "not_applicable",
      confidence: confidence(model.confidenceLevel, ["First Limited Dry Run section model exists."]),
      evidenceRefs: model.sourceEvidenceRefs,
      sourceCandidateId: null,
      limitations: model.limitationRefs,
    });
  }
  for (const candidate of input.candidateDiscoveryResult?.candidates.filter((item) => item.candidateType === "section") ?? []) {
    sections.push({
      sectionId: stableId("source-section", { candidateId: candidate.candidateId }),
      routePath: candidate.routePath ? routePath(candidate.routePath) : null,
      order: order++,
      heading: null,
      semanticType: null,
      observedBoundary: false,
      plannedOnly: false,
      state: stateFromReview(candidate.candidateId, reviews, "candidate"),
      reviewState: reviewState(candidate.candidateId, reviews),
      confidence: confidence(candidate.confidence.level, candidate.confidence.reasons),
      evidenceRefs: refsFromCandidate(candidate),
      sourceCandidateId: candidate.candidateId,
      limitations: candidate.limitations.map((item) => item.code),
    });
  }
  for (const planned of input.structurePlan?.plannedSections ?? []) {
    sections.push({
      sectionId: stableId("source-section-planning-context", { plannedSectionId: planned.plannedSectionId }),
      routePath: null,
      order: order++,
      heading: null,
      semanticType: "planning-context",
      observedBoundary: false,
      plannedOnly: true,
      state: "unavailable",
      reviewState: "not_applicable",
      confidence: confidence("LOW", ["StructurePlan section is planning context only and does not prove source reality."]),
      evidenceRefs: [...planned.sourceCandidateIds],
      sourceCandidateId: planned.sourceCandidateIds[0] ?? null,
      limitations: ["Planning context is intentionally separated from observed source sections."],
    });
  }
  return sections;
}

function buildContent(input: SourceWebsiteUnderstandingBuilderInput): SourceContentUnderstanding[] {
  const semantic = input.provenanceSummary?.semanticImport;
  const headings = semantic?.sections.flatMap((section) => section.title ? [section.title] : []) ?? [];
  const messages = [
    ...(semantic?.hero?.title ? [semantic.hero.title] : []),
    ...(semantic?.hero?.subtitle ? [semantic.hero.subtitle] : []),
    ...(semantic?.sections.flatMap((section) => [section.intro, ...section.items.map((item) => text(item.label) ?? text(item.title))].filter((item): item is string => Boolean(item))) ?? []),
  ].slice(0, 20);
  const forms = semantic?.sections.flatMap((section) => section.forms) ?? [];
  const ctas = [
    ...(semantic?.hero?.cta?.label ? [semantic.hero.cta.label] : []),
    ...(semantic?.sections.flatMap((section) => section.ctas.map((cta) => cta.label)) ?? []),
  ];
  const bodyTextAvailable = Boolean(
    input.provenanceSummary?.captureEvidence.renderedDomPath ||
    input.provenanceSummary?.captureEvidence.responseHtmlPath ||
    input.rawImportedSiteArtifact?.metadata?.htmlByteLength,
  );
  return [{
    contentId: stableId("source-content", { siteVersionId: input.siteVersionId, routePath: "/" }),
    routePath: "/",
    bodyTextAvailable,
    classificationStatus: messages.length > 0 || headings.length > 0 ? "structured" : bodyTextAvailable ? "unavailable" : "missing",
    headings,
    contentThemes: semantic?.sections.map((section) => section.type) ?? [],
    visibleMessages: messages,
    ctaSignals: ctas,
    contactSignals: ctas.filter((label) => /contact|kontakt|call|email|quote/i.test(label)),
    forms,
    downloads: [],
    metadata: semantic?.title ? { title: semantic.title } : {},
    structuredDataAvailable: false,
    confidence: confidence(messages.length > 0 ? "MEDIUM" : "LOW", [bodyTextAvailable ? "Body/source HTML evidence is available." : "Body/source HTML evidence is unavailable."]),
    evidenceRefs: [
      ...(semantic ? ["semantic-import"] : []),
      ...(bodyTextAvailable ? ["runtime-import:body-text-available"] : []),
    ],
    limitations: messages.length === 0 && bodyTextAvailable
      ? ["Body text exists in imported evidence, but content-level business classifiers are not materialized into this projection."]
      : [],
  }];
}

function fontSignals(input: SourceWebsiteUnderstandingBuilderInput, assets: SourceAssetUnderstanding[]): SourceTypographySignal[] {
  const signals: SourceTypographySignal[] = [];
  const typography = input.provenanceSummary?.styleSignals?.typography;
  if (typography?.headingFontFamily) {
    signals.push({
      signalId: stableId("source-typography", { role: "heading", family: typography.headingFontFamily }),
      family: typography.headingFontFamily,
      role: "heading",
      source: "style_signal_model",
      localAvailability: "unknown",
      state: "structured",
      confidence: confidence("MEDIUM", ["Style Signal model has a heading font family."]),
      evidenceRefs: ["style-signals:typography:heading"],
    });
  }
  if (typography?.bodyFontFamily) {
    signals.push({
      signalId: stableId("source-typography", { role: "body", family: typography.bodyFontFamily }),
      family: typography.bodyFontFamily,
      role: "body",
      source: "style_signal_model",
      localAvailability: "unknown",
      state: "structured",
      confidence: confidence("MEDIUM", ["Style Signal model has a body font family."]),
      evidenceRefs: ["style-signals:typography:body"],
    });
  }
  for (const asset of assets.filter((item) => item.assetKind === "font")) {
    const family = asset.filename.replace(/\.(woff2?|ttf|otf|eot)$/i, "");
    const isIconFont = /fontello|icon|glyph/i.test(family);
    signals.push({
      signalId: stableId("source-typography", { role: isIconFont ? "icon_font" : "local_font_file", path: asset.path }),
      family,
      role: isIconFont ? "icon_font" : "local_font_file",
      source: "asset_inventory",
      localAvailability: "available",
      state: "observed",
      confidence: confidence("MEDIUM", ["Local font file exists in imported asset inventory."]),
      evidenceRefs: asset.evidenceRefs,
    });
  }
  return signals.sort((left, right) => left.role.localeCompare(right.role) || left.family.localeCompare(right.family));
}

function buildVisualIdentity(input: SourceWebsiteUnderstandingBuilderInput, assets: SourceAssetUnderstanding[]): SourceVisualIdentitySignals {
  const logoAssets = assets.filter((asset) => asset.candidateMeaning === "logo_candidate");
  const styleColors = input.provenanceSummary?.styleSignals?.colors;
  const colorValues = [
    ["primary accent", styleColors?.primaryAccent ?? null],
    ["secondary accent", styleColors?.secondaryAccent ?? null],
    ...(styleColors?.neutralPalette ?? []).map((value, index) => [`neutral ${index + 1}`, value] as const),
    ["CTA color hint", styleColors?.ctaColorHint ?? null],
  ] as const;
  const colorSignals = colorValues
    .filter((entry) => typeof entry[1] === "string" && entry[1].length > 0)
    .map(([label, value]) => ({
      signalId: stableId("source-color", { label, value }),
      value: value as string,
      label,
      source: "style_signal_model" as const,
      state: "structured" as const,
      confidence: confidence("MEDIUM", ["Existing Style Signal model contains this color signal."]),
      evidenceRefs: ["style-signals:colors"],
    }));
  const limitations: SourceWebsiteLimitation[] = [];
  const unresolvedSignals: string[] = [];
  if (logoAssets.length === 0) unresolvedSignals.push("No logo candidate is materialized from existing asset/semantic evidence.");
  if (colorSignals.length === 0) {
    unresolvedSignals.push("Color evidence is unavailable or not structured in existing Style Signals.");
    limitations.push(limitation({
      code: "COLOR_CLASSIFICATION_UNAVAILABLE",
      message: "Raw CSS or style evidence may exist, but this phase does not implement a new color extraction algorithm.",
    }));
  }
  const typographySignals = fontSignals(input, assets);
  if (typographySignals.length === 0) unresolvedSignals.push("Typography evidence is unavailable or not structured.");
  return {
    logoCandidates: logoAssets.map((asset) => ({
      candidateId: stableId("source-logo-candidate", { path: asset.path, altText: asset.altText }),
      assetPath: asset.path,
      label: asset.altText ? `${asset.altText} (${asset.filename})` : asset.filename,
      state: "candidate",
      confidence: confidence("MEDIUM", ["Existing semantic import or filename evidence suggests a possible logo."]),
      signals: [
        ...(asset.altText ? [`alt text: ${asset.altText}`] : []),
        ...(asset.path.toLowerCase().includes("logo") ? ["filename/path contains logo"] : []),
        ...(asset.usages.length > 0 ? ["semantic image usage exists"] : []),
      ],
      previewHref: asset.previewHref,
      evidenceRefs: asset.evidenceRefs,
      reviewState: "not_applicable",
    })),
    colorSignals,
    typographySignals,
    iconStyleSignals: typographySignals
      .filter((signal) => signal.role === "icon_font")
      .map((signal) => ({
        signalId: stableId("source-icon-style", signal.signalId),
        label: `${signal.family} icon font signal`,
        state: "observed",
        confidence: signal.confidence,
        evidenceRefs: signal.evidenceRefs,
      })),
    imageStyleSignals: [],
    unresolvedSignals,
    limitations,
  };
}

function candidateItem(input: {
  prefix: string;
  label: string;
  source: "candidate_discovery" | "navigation" | "heading" | "semantic_import" | "unclassified_evidence";
  state?: SourceWebsiteKnowledgeState;
  evidenceRefs: string[];
}) {
  return {
    candidateId: stableId(input.prefix, { label: input.label, source: input.source, evidenceRefs: input.evidenceRefs }),
    label: input.label,
    state: input.state ?? "candidate",
    confidence: confidence("LOW", ["Source-level evidence exists, but no canonical business classifier is promoted here."]),
    source: input.source,
    evidenceRefs: input.evidenceRefs,
    reviewState: "not_applicable" as const,
    conflicts: [],
    limitations: ["Candidate is not confirmed business truth and does not mutate DBT knowledge."],
  };
}

function buildBusinessSignals(input: SourceWebsiteUnderstandingBuilderInput, content: SourceContentUnderstanding[]): SourceBusinessSignalCandidates {
  const navigationLabels = input.provenanceSummary?.semanticImport?.navigation.map((item) => item.label) ?? [];
  const headings = content.flatMap((item) => item.headings);
  const languages = input.provenanceSummary?.semanticImport?.language
    ? [{
      signalId: stableId("source-language", input.provenanceSummary.semanticImport.language),
      language: input.provenanceSummary.semanticImport.language,
      source: "semantic_import" as const,
      state: "structured" as const,
      confidence: confidence("MEDIUM", ["Semantic import language metadata exists."]),
      evidenceRefs: ["semantic-import:language"],
    }]
    : [];
  const offerings = [
    ...navigationLabels
      .filter((label) => /service|storit|produkt|product|solution|offer|legal|law|odvet|svetov/i.test(label))
      .map((label) => candidateItem({ prefix: "source-offering", label, source: "navigation", evidenceRefs: [`semantic-import:navigation:${label}`] })),
    ...headings
      .filter((label) => /service|storit|produkt|solution|legal|law|odvet|svetov/i.test(label))
      .map((label) => candidateItem({ prefix: "source-offering", label, source: "heading", evidenceRefs: [`semantic-import:heading:${label}`] })),
  ];
  const audiences = headings
    .filter((label) => /client|customer|strank|podjet|company|individual|business|you|your/i.test(label))
    .map((label) => candidateItem({ prefix: "source-audience", label, source: "heading", evidenceRefs: [`semantic-import:heading:${label}`] }));
  const trust = content.flatMap((item) => item.visibleMessages)
    .filter((label) => /experience|trusted|certified|partner|reference|years|izku|zaup|partner/i.test(label))
    .slice(0, 8)
    .map((label) => candidateItem({ prefix: "source-trust", label, source: "semantic_import", evidenceRefs: [`semantic-import:message:${label}`] }));
  const identity = content.flatMap((item) => item.visibleMessages)
    .slice(0, 3)
    .map((label) => candidateItem({ prefix: "source-identity", label, source: "semantic_import", evidenceRefs: [`semantic-import:message:${label}`] }));
  const limitations: SourceWebsiteLimitation[] = [];
  const unresolvedEvidence: string[] = [];
  if (content.some((item) => item.bodyTextAvailable) && offerings.length === 0) {
    unresolvedEvidence.push("Body text/source HTML is available, but offering evidence is not classified by an upstream source-level classifier.");
    limitations.push(limitation({
      code: "OFFERING_CLASSIFIER_MISSING",
      message: "Offering signals may exist in body copy, but WU-2 does not add a new classifier or consume downstream Business Discovery facts.",
    }));
  }
  if (content.some((item) => item.bodyTextAvailable) && audiences.length === 0) {
    unresolvedEvidence.push("Body text/source HTML is available, but audience evidence is not classified by an upstream source-level classifier.");
    limitations.push(limitation({
      code: "AUDIENCE_CLASSIFIER_MISSING",
      message: "Audience signals may exist in body copy, but WU-2 does not add a new classifier or consume downstream DBT/BUR/WDB knowledge.",
    }));
  }
  return {
    offerings,
    audiences,
    trust,
    goals: [],
    identity,
    differentiators: [],
    geography: [],
    languages,
    unresolvedEvidence,
    limitations,
  };
}

function buildTechnicalSignals(input: SourceWebsiteUnderstandingBuilderInput, content: SourceContentUnderstanding[]): SourceTechnicalSignals {
  const semantic = input.provenanceSummary?.semanticImport;
  const robots = input.provenanceSummary?.multiPageDiscovery?.robotsDiscovery;
  const sitemap = input.provenanceSummary?.multiPageDiscovery?.sitemapDiscovery;
  const canonicalEntry = input.provenanceSummary?.multiPageDiscovery?.canonicalDiscovery?.canonicalEntries?.[0];
  return {
    title: semantic?.title ?? null,
    meta: {},
    canonicalUrl: canonicalEntry?.canonicalUrl ?? null,
    headingStructure: content.flatMap((item) => item.headings),
    structuredDataAvailable: false,
    robotsEvidence: robots ? [`robots:${robots.fetchedState}`] : [],
    sitemapEvidence: sitemap ? sitemap.fetchedSitemapUrls.map((url) => `sitemap:${url}`) : [],
    languageMetadata: input.provenanceSummary?.semanticImport?.language
      ? [{
        signalId: stableId("source-language", input.provenanceSummary.semanticImport.language),
        language: input.provenanceSummary.semanticImport.language,
        source: "semantic_import",
        state: "structured",
        confidence: confidence("MEDIUM", ["Semantic import language metadata exists."]),
        evidenceRefs: ["semantic-import:language"],
      }]
      : [],
    accessibilityObservations: [],
    externalScripts: [],
    technologyHints: [],
    widgets: stringArray(input.provenanceSummary?.renderedCapture?.execution?.runtimeKind).filter(Boolean),
    socialMetadata: [],
    confidence: confidence(semantic ? "MEDIUM" : "LOW", [semantic ? "Semantic import technical signals exist." : "Technical signals are not structured."]),
    evidenceRefs: semantic ? ["semantic-import"] : [],
  };
}

function dimension(key: SourceWebsiteReadinessDimension["key"], status: SourceWebsiteReadinessDimension["status"], summary: string, evidenceRefs: string[] = []): SourceWebsiteReadinessDimension {
  return { key, status, summary, evidenceRefs };
}

function buildReadiness(input: {
  sourceUrl: string | null;
  routes: SourceRouteUnderstanding[];
  navigation: SourceNavigationUnderstanding[];
  sections: SourceSectionUnderstanding[];
  content: SourceContentUnderstanding[];
  assets: SourceAssetUnderstanding[];
  candidateDiscoveryResult: CandidateDiscoveryResult | null | undefined;
  candidateReviewPackage: CandidateReviewPackage | null | undefined;
  visualIdentity: SourceVisualIdentitySignals;
  businessSignals: SourceBusinessSignalCandidates;
  limitations: SourceWebsiteLimitation[];
}): SourceWebsiteReadiness {
  const dims: SourceWebsiteReadinessDimension[] = [
    dimension("source_acquisition", input.sourceUrl ? "ok" : "missing", input.sourceUrl ? "Source URL is persisted." : "Source URL is missing.", input.sourceUrl ? ["raw-imported-site:source-url"] : []),
    dimension("route_coverage", input.routes.length > 0 ? "ok" : "missing", `${input.routes.length} route(s) projected.`),
    dimension("navigation_coverage", input.navigation.length > 0 ? "ok" : "partial", `${input.navigation.length} navigation item(s) projected.`),
    dimension("structure_coverage", input.sections.some((item) => !item.plannedOnly) ? "partial" : "missing", `${input.sections.filter((item) => !item.plannedOnly).length} observed/source section item(s) projected.`),
    dimension("content_coverage", input.content.some((item) => item.bodyTextAvailable) ? "partial" : "missing", input.content.some((item) => item.bodyTextAvailable) ? "Body/source text evidence is available but classification may remain unresolved." : "Body/source text evidence is unavailable."),
    dimension("asset_inventory", input.assets.length > 0 ? "ok" : "missing", `${input.assets.length} imported asset(s) projected.`),
    dimension("candidate_coverage", input.candidateDiscoveryResult ? "partial" : "missing", input.candidateDiscoveryResult ? `${input.candidateDiscoveryResult.candidateCount} Candidate Discovery candidate(s) available.` : "Candidate Discovery is missing."),
    dimension("candidate_review", input.candidateReviewPackage ? "partial" : "missing", input.candidateReviewPackage ? `${input.candidateReviewPackage.reviewEvents.length} review event(s) available.` : "Candidate Review package is missing."),
    dimension("visual_identity_signals", input.visualIdentity.logoCandidates.length > 0 || input.visualIdentity.colorSignals.length > 0 || input.visualIdentity.typographySignals.length > 0 ? "partial" : "missing", "Visual identity signals are candidates or unresolved, not canonical brand identity."),
    dimension("business_signal_candidates", input.businessSignals.offerings.length > 0 || input.businessSignals.audiences.length > 0 ? "partial" : "missing", "Business signals remain source-level candidates or classifier gaps."),
    dimension("evidence_quality", input.limitations.some((item) => item.severity === "blocking") ? "blocked" : "partial", `${input.limitations.length} limitation(s) projected.`),
    dimension("unresolved_conflicts", "ok", "No source conflicts are synthesized by WU-2."),
  ];
  const blockers = input.limitations.filter((item) => item.severity === "blocking");
  const missingCritical = dims.filter((item) => item.status === "missing" || item.status === "blocked");
  const conservativeCanProceed = Boolean(input.sourceUrl && input.routes.length > 0 && input.content.some((item) => item.bodyTextAvailable) && blockers.length === 0);
  return {
    status: blockers.length > 0 ? "blocked" : conservativeCanProceed ? "ready_for_business_discovery" : missingCritical.length > 0 ? "partially_ready" : "partially_ready",
    conservativeBusinessDiscoveryCanProceed: conservativeCanProceed,
    summary: conservativeCanProceed
      ? "Conservative Business Discovery can proceed with explicit unresolved source-understanding gaps."
      : "Source understanding remains partial; missing evidence/classifiers must stay visible.",
    dimensions: dims,
    blockers,
  };
}

function collectLimitations(input: SourceWebsiteUnderstandingBuilderInput): SourceWebsiteLimitation[] {
  const limitations: SourceWebsiteLimitation[] = [];
  if (!input.rawImportedSiteArtifact) {
    limitations.push(limitation({
      code: "RAW_IMPORTED_SITE_ARTIFACT_MISSING",
      message: "Raw imported site artifact is unavailable; source identity and asset inventory are degraded.",
      severity: "blocking",
    }));
  }
  if (!input.evidenceCaptureBaseline) {
    limitations.push(limitation({
      code: "EVIDENCE_CAPTURE_BASELINE_MISSING",
      message: "Evidence Capture baseline is missing; rendered evidence coverage is degraded.",
    }));
  }
  if (!input.candidateDiscoveryResult) {
    limitations.push(limitation({
      code: "CANDIDATE_DISCOVERY_MISSING",
      message: "Candidate Discovery is missing; route/navigation/section candidates remain unavailable.",
    }));
  }
  if (!input.candidateReviewPackage) {
    limitations.push(limitation({
      code: "CANDIDATE_REVIEW_MISSING",
      message: "Candidate Review is missing; candidates remain unreviewed.",
    }));
  }
  if (!input.reconstructionPackage) {
    limitations.push(limitation({
      code: "RECONSTRUCTION_PACKAGE_MISSING",
      message: "Reconstruction Package is missing or blocked; this does not block source projection but remains lineage context.",
    }));
  } else if (input.reconstructionPackage.reconstructionPackageStatus === "blocked") {
    limitations.push(limitation({
      code: "RECONSTRUCTION_PACKAGE_BLOCKED",
      message: "Reconstruction Package is blocked; source understanding remains inspectable.",
    }));
  }
  if (!input.structurePlan) {
    limitations.push(limitation({
      code: "STRUCTURE_PLAN_MISSING",
      message: "StructurePlan planning context is missing; observed source reality remains separate.",
      severity: "info",
    }));
  }
  if (input.provenanceSummary?.sourceMode === "raw_html_fallback") {
    limitations.push(limitation({
      code: "RAW_HTML_FALLBACK_USED",
      message: "The import used raw HTML fallback; rendered understanding may be partial.",
    }));
  }
  return limitations;
}

function artifactIds(refs: SourceWebsiteUnderstandingArtifactReference[]): string[] {
  return refs
    .map((ref) => ref.artifactId ?? ref.canonicalId)
    .filter((id): id is string => Boolean(id))
    .sort();
}

function projectionIdentity(input: Omit<SourceWebsiteUnderstandingProjection, "projectionId">): string {
  const normalized = {
    ...input,
    generatedAt: null,
    lineage: {
      ...input.lineage,
      deterministicInputs: {
        ...input.lineage.deterministicInputs,
      },
    },
  };
  return `source_website_understanding_${sha256Hex(stableStringify(normalized)).slice(0, 32)}`;
}

export function buildSourceWebsiteUnderstandingProjection(input: SourceWebsiteUnderstandingBuilderInput): SourceWebsiteUnderstandingProjection {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const sourceUrl = text(input.rawImportedSiteArtifact?.metadata?.sourceUrl) ?? text(input.evidenceCaptureBaseline?.sourceUrl);
  const dryRunId = input.candidateDiscoveryResult?.dryRunId ??
    input.firstLimitedDryRunOutput?.dryRunId ??
    input.candidateReviewPackage?.dryRunId ??
    input.reconstructionPackage?.dryRunId ??
    input.structurePlan?.dryRunId ??
    null;
  const sourceArtifactRefs: SourceWebsiteUnderstandingArtifactReference[] = ([
    artifactRef({
      artifact: input.rawImportedSiteArtifact as unknown as StoredArtifact | null | undefined,
      fallbackKind: "raw_imported_site",
      source: "raw_artifact",
      canonicalIdFields: ["id"],
    }),
    input.provenanceSummary ? {
      kind: input.provenanceSummary.kind,
      artifactId: input.provenanceSummary.executionIdentity?.snapshotId ?? null,
      canonicalId: input.provenanceSummary.executionIdentity?.snapshotRunId ?? null,
      status: input.provenanceSummary.importFidelityStatus,
      createdAt: input.siteVersionCreatedAt ?? null,
      source: "runtime_summary" as const,
    } : null,
  ] as Array<SourceWebsiteUnderstandingArtifactReference | null>).filter((ref): ref is SourceWebsiteUnderstandingArtifactReference => ref !== null);
  const evidenceArtifactRefs: SourceWebsiteUnderstandingArtifactReference[] = ([
    input.evidenceCaptureBaseline ? {
      kind: input.evidenceCaptureBaseline.kind,
      artifactId: input.evidenceCaptureBaseline.captureRunId,
      canonicalId: input.evidenceCaptureBaseline.persistedRefs.rawImportArtifactId,
      version: input.evidenceCaptureBaseline.artifactVersion,
      status: input.evidenceCaptureBaseline.captureStatus,
      createdAt: null,
      persistedAt: null,
      source: "evidence_capture" as const,
    } : null,
    input.provenanceSummary?.semanticImport ? {
      kind: "semantic_import",
      artifactId: stableId("semantic-import", { siteVersionId: input.siteVersionId, title: input.provenanceSummary.semanticImport.title }),
      canonicalId: null,
      status: input.provenanceSummary.semanticImport.captureMode,
      source: "semantic_import" as const,
    } : null,
    input.firstLimitedDryRunOutput ? {
      kind: "first_limited_dry_run_output",
      artifactId: input.firstLimitedDryRunOutput.outputId,
      canonicalId: input.firstLimitedDryRunOutput.reconstructionPackageId,
      status: input.firstLimitedDryRunOutput.outputStatus,
      createdAt: input.firstLimitedDryRunOutput.createdAt,
      source: "evidence_capture" as const,
    } : null,
  ] as Array<SourceWebsiteUnderstandingArtifactReference | null>).filter((ref): ref is SourceWebsiteUnderstandingArtifactReference => ref !== null);
  const candidateArtifactRefs: SourceWebsiteUnderstandingArtifactReference[] = ([
    artifactRef({
      artifact: input.candidateDiscoveryArtifact,
      fallbackKind: "candidate_discovery_result",
      source: "candidate_discovery",
      canonicalIdFields: ["discoveryId"],
    }),
  ] as Array<SourceWebsiteUnderstandingArtifactReference | null>).filter((ref): ref is SourceWebsiteUnderstandingArtifactReference => ref !== null);
  const reviewArtifactRefs: SourceWebsiteUnderstandingArtifactReference[] = ([
    artifactRef({
      artifact: input.candidateReviewArtifact,
      fallbackKind: "candidate_review_package",
      source: "candidate_review",
      canonicalIdFields: ["reviewPackageId"],
    }),
  ] as Array<SourceWebsiteUnderstandingArtifactReference | null>).filter((ref): ref is SourceWebsiteUnderstandingArtifactReference => ref !== null);
  const reconstructionArtifactRefs: SourceWebsiteUnderstandingArtifactReference[] = ([
    artifactRef({
      artifact: input.reconstructionPackageArtifact,
      fallbackKind: "reconstruction_package",
      source: "reconstruction_package",
      canonicalIdFields: ["reconstructionPackageId"],
    }),
  ] as Array<SourceWebsiteUnderstandingArtifactReference | null>).filter((ref): ref is SourceWebsiteUnderstandingArtifactReference => ref !== null);
  const planningContextArtifactRefs: SourceWebsiteUnderstandingArtifactReference[] = ([
    artifactRef({
      artifact: input.structurePlanArtifact,
      fallbackKind: "structure_plan",
      source: "structure_plan",
      canonicalIdFields: ["structurePlanId"],
    }),
  ] as Array<SourceWebsiteUnderstandingArtifactReference | null>).filter((ref): ref is SourceWebsiteUnderstandingArtifactReference => ref !== null);
  const reviews = reviewMap(input.candidateReviewPackage);
  const assets = buildAssets(input, reviews);
  const routes = buildRoutes(input, reviews);
  const pages = buildPages(input, routes);
  const navigation = buildNavigation(input, reviews);
  const sections = buildSections(input, reviews);
  const content = buildContent(input);
  const visualIdentitySignals = buildVisualIdentity(input, assets);
  const businessSignalCandidates = buildBusinessSignals(input, content);
  const limitations = [
    ...collectLimitations(input),
    ...visualIdentitySignals.limitations,
    ...businessSignalCandidates.limitations,
  ].sort((left, right) => left.code.localeCompare(right.code));
  const technicalSignals = buildTechnicalSignals(input, content);
  const readiness = buildReadiness({
    sourceUrl,
    routes,
    navigation,
    sections,
    content,
    assets,
    candidateDiscoveryResult: input.candidateDiscoveryResult,
    candidateReviewPackage: input.candidateReviewPackage,
    visualIdentity: visualIdentitySignals,
    businessSignals: businessSignalCandidates,
    limitations,
  });
  const diagnostics = [
    ...stringArray(input.provenanceSummary?.importDiagnosticCodes).map((code) => diagnostic(code, "Runtime import diagnostic.", ["runtime-import-provenance"])),
    ...(input.candidateDiscoveryResult?.diagnostics ?? []).map((code) => diagnostic(code, "Candidate Discovery diagnostic.", ["candidate-discovery"])),
    ...(input.candidateReviewPackage?.diagnostics ?? []).map((code) => diagnostic(code, "Candidate Review diagnostic.", ["candidate-review"])),
    ...(input.reconstructionPackage?.diagnostics ?? []).map((code) => diagnostic(code, "Reconstruction Package diagnostic.", ["reconstruction-package"])),
    ...(input.structurePlan?.diagnostics ?? []).map((code) => diagnostic(code, "StructurePlan diagnostic.", ["structure-plan"])),
  ];
  const allRefs = [
    ...sourceArtifactRefs,
    ...evidenceArtifactRefs,
    ...candidateArtifactRefs,
    ...reviewArtifactRefs,
    ...reconstructionArtifactRefs,
    ...planningContextArtifactRefs,
  ];
  const withoutId: Omit<SourceWebsiteUnderstandingProjection, "projectionId"> = {
    contractVersion: SOURCE_WEBSITE_UNDERSTANDING_CONTRACT_VERSION,
    generatedAt,
    siteVersionId: input.siteVersionId,
    dryRunId,
    connectorType: input.provenanceSummary?.captureMode ?? input.provenanceSummary?.sourceMode ?? null,
    sourceIdentity: {
      siteVersionId: input.siteVersionId,
      dryRunId,
      sourceUrl,
      finalUrl: text(input.rawImportedSiteArtifact?.metadata?.finalUrl) ?? text(input.evidenceCaptureBaseline?.finalUrl),
      hostname: hostnameFromUrl(sourceUrl),
      connectorType: input.provenanceSummary?.captureMode ?? input.provenanceSummary?.sourceMode ?? null,
      importIdentity: input.provenanceSummary?.executionIdentity?.snapshotId ?? input.rawImportedSiteArtifact?.id ?? null,
      importedAt: text(input.rawImportedSiteArtifact?.createdAt ?? input.siteVersionCreatedAt),
      captureCompletedAt: input.provenanceSummary?.captureJob?.completedAt ?? null,
      sourceAvailability: input.provenanceSummary?.renderedCaptureStatus === "available" ? "available" :
        input.provenanceSummary?.renderedCaptureStatus === "partial" ? "partial" :
        input.provenanceSummary?.renderedCaptureStatus === "failed" ? "failed" :
        sourceUrl ? "partial" : "unavailable",
      languageSignals: businessSignalCandidates.languages,
      evidenceRefs: sourceUrl ? ["raw-imported-site:source-url"] : [],
    },
    sourceArtifactRefs,
    evidenceArtifactRefs,
    candidateArtifactRefs,
    reviewArtifactRefs,
    reconstructionArtifactRefs,
    planningContextArtifactRefs,
    pages,
    routes,
    navigation,
    sections,
    content,
    assets,
    visualIdentitySignals,
    businessSignalCandidates,
    technicalSignals,
    readiness,
    confidence: confidence(readiness.status === "ready_for_business_discovery" ? "MEDIUM" : "LOW", [
      readiness.summary,
      "Projection confidence is fail-closed and does not use counts alone as proof.",
    ]),
    limitations,
    diagnostics,
    lineage: {
      siteVersionId: input.siteVersionId,
      dryRunId,
      contractVersion: SOURCE_WEBSITE_UNDERSTANDING_CONTRACT_VERSION,
      sourceArtifactRefs,
      evidenceArtifactRefs,
      candidateArtifactRefs,
      reviewArtifactRefs,
      reconstructionArtifactRefs,
      planningContextArtifactRefs,
      deterministicInputs: {
        siteVersionId: input.siteVersionId,
        dryRunId,
        contractVersion: SOURCE_WEBSITE_UNDERSTANDING_CONTRACT_VERSION,
        artifactIds: artifactIds(allRefs),
      },
    },
  };
  return {
    projectionId: projectionIdentity(withoutId),
    ...withoutId,
  };
}

function validateNoForbiddenFields(value: unknown, path: string, errors: string[], seen: WeakSet<object>): void {
  if ((!isRecord(value) && !Array.isArray(value)) || seen.has(value)) return;
  seen.add(value);
  for (const [key, nested] of Object.entries(value)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (SOURCE_WEBSITE_UNDERSTANDING_FORBIDDEN_FIELDS.includes(key as never)) {
      errors.push(`${nextPath} is forbidden in Source Website Understanding Projection`);
    }
    validateNoForbiddenFields(nested, nextPath, errors, seen);
  }
}

function validateUnique(ids: string[], path: string, errors: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${path} contains duplicate id ${id}`);
    seen.add(id);
  }
}

function validateState(value: string, path: string, errors: string[]): void {
  if (!SOURCE_WEBSITE_KNOWLEDGE_STATES.includes(value as never)) errors.push(`${path} has invalid knowledge state ${value}`);
}

function validateConfidence(value: SourceWebsiteConfidence, path: string, errors: string[]): void {
  if (!SOURCE_WEBSITE_CONFIDENCE_LEVELS.includes(value?.level as never)) errors.push(`${path}.level must be LOW, MEDIUM, or HIGH`);
  if (!Array.isArray(value?.reasons)) errors.push(`${path}.reasons must be an array`);
}

function projectedItemState(value: unknown): SourceWebsiteKnowledgeState | null {
  if (!isRecord(value)) return null;
  const state = value.state ?? value.inventoryState ?? value.classificationStatus;
  return typeof state === "string" ? state as SourceWebsiteKnowledgeState : null;
}

function projectedItemConfidence(value: unknown): SourceWebsiteConfidence {
  return isRecord(value) ? value.confidence as SourceWebsiteConfidence : undefined as unknown as SourceWebsiteConfidence;
}

function validateObservedRefs(items: Array<{ state: SourceWebsiteKnowledgeState; evidenceRefs: string[] }>, path: string, errors: string[]): void {
  items.forEach((item, index) => {
    if (["observed", "structured", "candidate", "reviewed", "confirmed_source_fact", "rejected", "conflicting"].includes(item.state) && item.evidenceRefs.length === 0) {
      errors.push(`${path}[${index}] must include evidenceRefs for ${item.state} state`);
    }
  });
}

function pathLooksUnsafe(value: string): boolean {
  return value.startsWith("/") || value.includes("..") || /^[a-z]+:\/\//i.test(value) || value.startsWith("~");
}

export function validateSourceWebsiteUnderstandingProjection(value: unknown): SourceWebsiteUnderstandingValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ["Projection must be an object"], warnings };
  validateNoForbiddenFields(value, "", errors, new WeakSet<object>());

  const projection = value as SourceWebsiteUnderstandingProjection;
  if (projection.contractVersion !== SOURCE_WEBSITE_UNDERSTANDING_CONTRACT_VERSION) errors.push("contractVersion must be WU-2");
  if (!text(projection.siteVersionId)) errors.push("siteVersionId is required");
  if (!text(projection.projectionId)) errors.push("projectionId is required");
  if (!isRecord(projection.sourceIdentity)) errors.push("sourceIdentity is required");
  if (!SOURCE_WEBSITE_READINESS_STATUSES.includes(projection.readiness?.status as never)) errors.push("readiness.status is invalid");
  validateConfidence(projection.confidence, "confidence", errors);

  if (Array.isArray(projection.readiness?.dimensions)) {
    for (const key of SOURCE_WEBSITE_READINESS_DIMENSION_KEYS) {
      if (!projection.readiness.dimensions.some((item) => item.key === key)) errors.push(`readiness dimension ${key} is missing`);
    }
  } else {
    errors.push("readiness.dimensions must be an array");
  }

  validateUnique((projection.pages ?? []).map((item) => item.pageId), "pages", errors);
  validateUnique((projection.routes ?? []).map((item) => item.routeId), "routes", errors);
  validateUnique((projection.navigation ?? []).map((item) => item.navigationId), "navigation", errors);
  validateUnique((projection.sections ?? []).map((item) => item.sectionId), "sections", errors);
  validateUnique((projection.assets ?? []).map((item) => item.assetId), "assets", errors);

  for (const [path, items] of [
    ["pages", projection.pages ?? []],
    ["routes", projection.routes ?? []],
    ["navigation", projection.navigation ?? []],
    ["sections", projection.sections ?? []],
    ["content", projection.content ?? []],
    ["assets", projection.assets ?? []],
  ] as const) {
    for (const [index, item] of items.entries()) {
      const state = projectedItemState(item);
      if (state) validateState(state, `${path}[${index}].state`, errors);
      else errors.push(`${path}[${index}].state is required`);
      validateConfidence(projectedItemConfidence(item), `${path}[${index}].confidence`, errors);
    }
  }
  validateObservedRefs(projection.pages ?? [], "pages", errors);
  validateObservedRefs(projection.routes ?? [], "routes", errors);
  validateObservedRefs(projection.navigation ?? [], "navigation", errors);
  validateObservedRefs(projection.sections.filter((item) => !item.plannedOnly) ?? [], "sections", errors);
  validateObservedRefs(projection.content.map((item) => ({ state: item.classificationStatus, evidenceRefs: item.evidenceRefs })) ?? [], "content", errors);
  validateObservedRefs(projection.assets.map((item) => ({ state: item.inventoryState, evidenceRefs: item.evidenceRefs })) ?? [], "assets", errors);

  for (const [index, asset] of (projection.assets ?? []).entries()) {
    if (pathLooksUnsafe(asset.path)) errors.push(`assets[${index}].path exposes an unsafe or arbitrary path`);
    if (asset.candidateMeaningState === "confirmed_source_fact") errors.push(`assets[${index}] promotes candidate meaning to confirmed_source_fact`);
  }
  for (const [index, section] of (projection.sections ?? []).entries()) {
    if (section.plannedOnly && section.observedBoundary) errors.push(`sections[${index}] conflates StructurePlan context with observed source boundary`);
    if (section.plannedOnly && section.state !== "unavailable") errors.push(`sections[${index}] planning context must not be treated as observed source truth`);
  }
  if (projection.readiness?.status === "ready_for_business_discovery" && projection.readiness.conservativeBusinessDiscoveryCanProceed !== true) {
    errors.push("ready_for_business_discovery requires conservativeBusinessDiscoveryCanProceed");
  }
  if (projection.businessSignalCandidates?.offerings?.some((item) => item.state === "confirmed_source_fact")) {
    errors.push("offering candidates must not be promoted to confirmed source facts");
  }
  const expectedId = projectionIdentity(cloneJson({ ...projection, projectionId: undefined }) as Omit<SourceWebsiteUnderstandingProjection, "projectionId">);
  if (projection.projectionId !== expectedId) warnings.push("projectionId does not match normalized projection content");

  return { valid: errors.length === 0, errors, warnings };
}
