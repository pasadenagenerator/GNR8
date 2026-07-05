/**
 * Phase MVP-1K-3 Observed Website Model deterministic builder.
 *
 * This builder reads quarantined Generated Website Proposal metadata and
 * operator/provider notes only. It performs no AI, provider call, code
 * execution, rendering, WGP comparison, compliance judgment, approval,
 * publishing, deployment, worker, API, UI, or runtime mutation.
 */

import { sha256Hex, stableStringify } from "../runtime/deterministic";
import {
  OBSERVED_WEBSITE_MODEL_CONTRACT_VERSION,
  validateObservedWebsiteModel,
  type ObservedAsset,
  type ObservedConstraint,
  type ObservedEvidence,
  type ObservedLimitation,
  type ObservedMessage,
  type ObservedNavigation,
  type ObservedPage,
  type ObservedSection,
  type ObservedTechnicalSignal,
  type ObservedWebsiteEvidenceSource,
  type ObservedWebsiteModelArtifact,
  type ObservedWebsiteReadiness,
  type ObservedWebsiteStatus,
  type ObservedWebsiteValidationResult,
} from "./observed-website-model-contract";
import {
  validateGeneratedWebsiteProposal,
  type GeneratedWebsiteProposalArtifact,
} from "./generated-website-proposal-contract";

export const OBSERVED_WEBSITE_MODEL_RUNTIME_VERSION = "MVP-1K-3" as const;

export type ObservedWebsiteModelOutputMetadata = {
  routes?: unknown[];
  pages?: unknown[];
  routeInventory?: unknown[];
  files?: unknown[];
  fileTree?: unknown[];
  fileInventory?: unknown[];
  navigation?: unknown[];
  sections?: unknown[];
  messages?: unknown[];
  assets?: unknown[];
  constraints?: unknown[];
  technicalSignals?: unknown[];
  diagnostics?: string[];
};

export type ObservedWebsiteModelBuildInput = {
  sourceGeneratedWebsiteProposal: GeneratedWebsiteProposalArtifact;
  sourceGeneratedWebsiteProposalArtifactId?: string;
  outputMetadata?: ObservedWebsiteModelOutputMetadata;
  createdAt?: string;
};

export class ObservedWebsiteModelBuildValidationError extends Error {
  readonly validation: ObservedWebsiteValidationResult;

  constructor(validation: ObservedWebsiteValidationResult) {
    super("Observed Website Model build input is invalid.");
    this.name = "ObservedWebsiteModelBuildValidationError";
    this.validation = validation;
  }
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function stringValue(value: unknown): string | undefined {
  return nonEmptyString(value) ?? undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort();
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function bundleRecord(proposal: GeneratedWebsiteProposalArtifact): Record<string, unknown> {
  return proposal.outputBundle as unknown as Record<string, unknown>;
}

function collectArrays(...values: unknown[]): unknown[] {
  return values.flatMap((value) => asArray(value));
}

function pathFrom(value: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const candidate = stringValue(value[key]);
    if (candidate) return candidate;
  }
  return undefined;
}

function routePath(value: unknown): string | null {
  if (typeof value === "string") return nonEmptyString(value);
  if (!isRecord(value)) return null;
  return pathFrom(value, ["routePath", "path", "href", "url"]) ?? null;
}

function evidenceId(sourceKind: ObservedWebsiteEvidenceSource, refId: string, description: string): string {
  return `observed_evidence_${sha256Hex(stableStringify({ sourceKind, refId, description })).slice(0, 20)}`;
}

function observedId(prefix: string, value: unknown): string {
  return `${prefix}_${sha256Hex(stableStringify(value)).slice(0, 20)}`;
}

function modelId(input: {
  proposal: GeneratedWebsiteProposalArtifact;
  sourceGeneratedWebsiteProposalArtifactId?: string;
  outputMetadata?: ObservedWebsiteModelOutputMetadata;
}): string {
  return `observed-website-model:${sha256Hex(stableStringify({
    sourceGeneratedWebsiteProposalId: input.proposal.generatedWebsiteProposalId,
    sourceGeneratedWebsiteProposalArtifactId: input.sourceGeneratedWebsiteProposalArtifactId ?? null,
    outputBundleId: input.proposal.outputBundle.outputBundleId,
    outputBundleStorageReference: input.proposal.outputBundle.storageReference,
    outputBundleContentHash: input.proposal.outputBundle.contentHash ?? null,
    outputMetadata: input.outputMetadata ?? null,
    contractVersion: OBSERVED_WEBSITE_MODEL_CONTRACT_VERSION,
  })).slice(0, 32)}`;
}

function baseEvidence(input: ObservedWebsiteModelBuildInput): ObservedEvidence[] {
  const proposal = input.sourceGeneratedWebsiteProposal;
  const evidence: ObservedEvidence[] = [
    {
      observedEvidenceId: evidenceId(
        "generated_website_proposal",
        proposal.generatedWebsiteProposalId,
        "Source quarantined Generated Website Proposal metadata.",
      ),
      sourceKind: "generated_website_proposal",
      refId: proposal.generatedWebsiteProposalId,
      description: "Source quarantined Generated Website Proposal metadata.",
    },
    {
      observedEvidenceId: evidenceId(
        "output_bundle_metadata",
        proposal.outputBundle.outputBundleId,
        "Generated output bundle metadata from the quarantined proposal.",
      ),
      sourceKind: "output_bundle_metadata",
      refId: proposal.outputBundle.outputBundleId,
      description: "Generated output bundle metadata from the quarantined proposal.",
    },
  ];
  if (input.sourceGeneratedWebsiteProposalArtifactId) {
    evidence.push({
      observedEvidenceId: evidenceId(
        "generated_website_proposal",
        input.sourceGeneratedWebsiteProposalArtifactId,
        "Persisted source Generated Website Proposal artifact reference.",
      ),
      sourceKind: "generated_website_proposal",
      refId: input.sourceGeneratedWebsiteProposalArtifactId,
      description: "Persisted source Generated Website Proposal artifact reference.",
    });
  }
  return uniqueBy(evidence, (item) => item.observedEvidenceId);
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const byKey = new Map<string, T>();
  for (const value of values) byKey.set(key(value), value);
  return [...byKey.values()].sort((left, right) => key(left).localeCompare(key(right)));
}

function evidenceFor(sourceKind: ObservedWebsiteEvidenceSource, refId: string, description: string): ObservedEvidence {
  return {
    observedEvidenceId: evidenceId(sourceKind, refId, description),
    sourceKind,
    refId,
    description,
  };
}

function buildPages(input: {
  records: unknown[];
  outputBundleEvidenceId: string;
}): ObservedPage[] {
  const pages = input.records.flatMap((record): ObservedPage[] => {
    const path = routePath(record);
    if (!path) return [];
    const title = isRecord(record) ? stringValue(record.title ?? record.label ?? record.name) : undefined;
    return [{
      observedPageId: observedId("observed_page", { path, title }),
      routePath: path,
      ...(title ? { title } : {}),
      source: "route_metadata",
      evidenceRefIds: [input.outputBundleEvidenceId],
      limitations: [],
      diagnostics: ["OBSERVED_PAGE_FROM_DECLARED_ROUTE_METADATA"],
    }];
  });
  return uniqueBy(pages, (page) => page.observedPageId);
}

function buildAssets(input: {
  fileRecords: unknown[];
  assetRecords: unknown[];
  entrypoints: string[];
  outputBundleEvidenceId: string;
}): ObservedAsset[] {
  const fromRecords = [
    ...input.fileRecords.map((record) => ({ record, source: "file_tree_metadata" as const })),
    ...input.assetRecords.map((record) => ({ record, source: "asset_metadata" as const })),
    ...input.entrypoints.map((entrypoint) => ({ record: entrypoint, source: "output_bundle_metadata" as const })),
  ];
  const assets = fromRecords.flatMap(({ record, source }): ObservedAsset[] => {
    const path = typeof record === "string"
      ? nonEmptyString(record)
      : isRecord(record)
        ? pathFrom(record, ["path", "filePath", "assetPath", "href", "url"])
        : null;
    if (!path) return [];
    const data = isRecord(record) ? record : {};
    const asset: ObservedAsset = {
      observedAssetId: observedId("observed_asset", { path, source }),
      path,
      assetKind: stringValue(data.kind ?? data.assetKind ?? data.role) ?? (source === "output_bundle_metadata" ? "entrypoint" : "file"),
      contentType: stringValue(data.contentType ?? data.mimeType),
      byteSize: numberValue(data.byteSize ?? data.sizeBytes ?? data.size),
      contentHash: stringValue(data.contentHash ?? data.hash),
      source,
      evidenceRefIds: [input.outputBundleEvidenceId],
      limitations: [],
      diagnostics: [source === "output_bundle_metadata"
        ? "OBSERVED_FILE_FROM_OUTPUT_BUNDLE_ENTRYPOINT"
        : "OBSERVED_FILE_FROM_DECLARED_OUTPUT_METADATA"],
    };
    return [stripUndefined(asset)];
  });
  return uniqueBy(assets, (asset) => asset.observedAssetId);
}

function buildNavigation(input: {
  records: unknown[];
  pages: ObservedPage[];
  outputBundleEvidenceId: string;
}): ObservedNavigation[] {
  const pageByRoute = new Map(input.pages.map((page) => [page.routePath, page.observedPageId]));
  const navigation = input.records.flatMap((record): ObservedNavigation[] => {
    if (!isRecord(record) && typeof record !== "string") return [];
    const href = typeof record === "string"
      ? nonEmptyString(record)
      : pathFrom(record, ["href", "targetPath", "routePath", "path", "url"]);
    const normalizedHref = href ?? undefined;
    const label = isRecord(record) ? stringValue(record.label ?? record.text ?? record.name) : undefined;
    if (!normalizedHref && !label) return [];
    const sourcePath = isRecord(record) ? pathFrom(record, ["sourceRoutePath", "sourcePath", "from"]) : undefined;
    return [stripUndefined({
      observedNavigationId: observedId("observed_navigation", { href: normalizedHref, label, sourcePath }),
      label,
      href: normalizedHref,
      sourcePageId: sourcePath ? pageByRoute.get(sourcePath) : undefined,
      targetPageId: normalizedHref ? pageByRoute.get(normalizedHref) : undefined,
      source: "navigation_metadata",
      evidenceRefIds: [input.outputBundleEvidenceId],
      limitations: [],
      diagnostics: ["OBSERVED_NAVIGATION_FROM_DECLARED_METADATA"],
    })];
  });
  return uniqueBy(navigation, (item) => item.observedNavigationId);
}

function buildSections(input: {
  records: unknown[];
  pages: ObservedPage[];
  outputBundleEvidenceId: string;
}): ObservedSection[] {
  const pageByRoute = new Map(input.pages.map((page) => [page.routePath, page.observedPageId]));
  const sections = input.records.flatMap((record): ObservedSection[] => {
    if (!isRecord(record)) return [];
    const route = pathFrom(record, ["routePath", "pagePath", "path"]);
    const label = stringValue(record.label ?? record.title ?? record.name);
    const sectionType = stringValue(record.sectionType ?? record.type ?? record.kind);
    const contentSummary = stringValue(record.contentSummary ?? record.summary ?? record.description);
    if (!route && !label && !sectionType && !contentSummary) return [];
    return [stripUndefined({
      observedSectionId: observedId("observed_section", { route, label, sectionType, contentSummary }),
      pageId: route ? pageByRoute.get(route) : undefined,
      routePath: route,
      sectionType,
      label,
      contentSummary,
      source: "section_metadata",
      evidenceRefIds: [input.outputBundleEvidenceId],
      limitations: [],
      diagnostics: ["OBSERVED_SECTION_FROM_DECLARED_METADATA"],
    })];
  });
  return uniqueBy(sections, (section) => section.observedSectionId);
}

function buildMessages(input: {
  records: unknown[];
  providerNotes: string[];
  operatorDiagnostics: string[];
  pages: ObservedPage[];
  outputBundleEvidenceId: string;
}): ObservedMessage[] {
  const pageByRoute = new Map(input.pages.map((page) => [page.routePath, page.observedPageId]));
  const declared = input.records.flatMap((record): ObservedMessage[] => {
    const summary = typeof record === "string"
      ? nonEmptyString(record)
      : isRecord(record)
        ? stringValue(record.textSummary ?? record.summary ?? record.text ?? record.message)
        : null;
    if (!summary) return [];
    const route = isRecord(record) ? pathFrom(record, ["routePath", "pagePath", "path"]) : undefined;
    return [stripUndefined({
      observedMessageId: observedId("observed_message", { summary, route, kind: "declared_content" }),
      pageId: route ? pageByRoute.get(route) : undefined,
      routePath: route,
      messageKind: "declared_content",
      textSummary: summary,
      source: "message_metadata",
      evidenceRefIds: [input.outputBundleEvidenceId],
      limitations: [],
      diagnostics: ["OBSERVED_MESSAGE_FROM_DECLARED_METADATA"],
    })];
  });
  const providerNotes = input.providerNotes.map((note) => ({
    observedMessageId: observedId("observed_message", { note, kind: "provider_note" }),
    messageKind: "provider_note" as const,
    textSummary: note,
    source: "provider_note" as const,
    evidenceRefIds: [input.outputBundleEvidenceId],
    limitations: [],
    diagnostics: ["OBSERVED_MESSAGE_FROM_PROVIDER_NOTE"],
  }));
  const operatorNotes = input.operatorDiagnostics.map((note) => ({
    observedMessageId: observedId("observed_message", { note, kind: "operator_note" }),
    messageKind: "operator_note" as const,
    textSummary: note,
    source: "operator_note" as const,
    evidenceRefIds: [input.outputBundleEvidenceId],
    limitations: [],
    diagnostics: ["OBSERVED_MESSAGE_FROM_OPERATOR_METADATA"],
  }));
  return uniqueBy([...declared, ...providerNotes, ...operatorNotes], (message) => message.observedMessageId);
}

function buildConstraints(input: {
  records: unknown[];
  limitations: string[];
  outputBundleEvidenceId: string;
}): ObservedConstraint[] {
  const constraints = [
    ...input.records.flatMap((record): string[] => {
      if (typeof record === "string") return nonEmptyString(record) ? [record.trim()] : [];
      if (!isRecord(record)) return [];
      const statement = stringValue(record.statement ?? record.description ?? record.summary);
      return statement ? [statement] : [];
    }),
    ...input.limitations,
  ].map((statement) => ({
    observedConstraintId: observedId("observed_constraint", { statement }),
    statement,
    source: "limitation" as const,
    evidenceRefIds: [input.outputBundleEvidenceId],
    limitations: [],
    diagnostics: ["OBSERVED_CONSTRAINT_FROM_PROPOSAL_LIMITATION_OR_METADATA"],
  }));
  return uniqueBy(constraints, (constraint) => constraint.observedConstraintId);
}

function buildTechnicalSignals(input: {
  records: unknown[];
  proposal: GeneratedWebsiteProposalArtifact;
  outputBundleEvidenceId: string;
}): ObservedTechnicalSignal[] {
  const bundle = input.proposal.outputBundle;
  const baseSignals: { signalType: string; value: string }[] = [
    ...(bundle.contentHash ? [{ signalType: "output_bundle_content_hash", value: bundle.contentHash }] : []),
    ...(typeof bundle.fileCount === "number" ? [{ signalType: "output_bundle_file_count", value: String(bundle.fileCount) }] : []),
    ...(typeof bundle.byteSize === "number" ? [{ signalType: "output_bundle_byte_size", value: String(bundle.byteSize) }] : []),
  ];
  const declared = input.records.flatMap((record): { signalType: string; value: string }[] => {
    if (!isRecord(record)) return [];
    const signalType = stringValue(record.signalType ?? record.type ?? record.name);
    const value = stringValue(record.value ?? record.summary ?? record.description);
    return signalType && value ? [{ signalType, value }] : [];
  });
  const signals = [...baseSignals, ...declared].map((signal) => ({
    observedTechnicalSignalId: observedId("observed_technical_signal", signal),
    signalType: signal.signalType,
    value: signal.value,
    source: "technical_metadata" as const,
    evidenceRefIds: [input.outputBundleEvidenceId],
    limitations: [],
    diagnostics: ["OBSERVED_TECHNICAL_SIGNAL_FROM_OUTPUT_METADATA"],
  }));
  return uniqueBy(signals, (signal) => signal.observedTechnicalSignalId);
}

function limitation(idSeed: string, severity: ObservedLimitation["severity"], message: string): ObservedLimitation {
  return {
    observedLimitationId: observedId("observed_limitation", { idSeed, message }),
    severity,
    message,
    source: "limitation",
  };
}

function deriveLimitations(input: {
  pages: ObservedPage[];
  fileRecordsAvailable: boolean;
  navigation: ObservedNavigation[];
  sections: ObservedSection[];
  messages: ObservedMessage[];
  assets: ObservedAsset[];
  technicalSignals: ObservedTechnicalSignal[];
  proposal: GeneratedWebsiteProposalArtifact;
}): ObservedLimitation[] {
  const limitations: ObservedLimitation[] = [];
  if (input.pages.length === 0) {
    limitations.push(limitation("routes", "warning", "Route/page inventory metadata was not available for observation."));
  }
  if (!input.fileRecordsAvailable) {
    limitations.push(limitation("files", "warning", "File tree metadata was not available beyond output bundle entrypoints."));
  }
  if (input.navigation.length === 0) {
    limitations.push(limitation("navigation", "info", "Declared navigation metadata was not available for observation."));
  }
  if (input.sections.length === 0) {
    limitations.push(limitation("sections", "info", "Declared section metadata was not available for observation."));
  }
  if (input.messages.length === 0) {
    limitations.push(limitation("messages", "info", "Declared messages or note summaries were not available for observation."));
  }
  if (input.assets.length === 0) {
    limitations.push(limitation("assets", "warning", "Declared assets or file inventory were not available for observation."));
  }
  if (input.technicalSignals.length === 0) {
    limitations.push(limitation("technical", "info", "Technical signals were not explicitly available for observation."));
  }
  for (const knownLimitation of input.proposal.knownLimitations) {
    limitations.push(limitation(`proposal-known:${knownLimitation}`, "warning", knownLimitation));
  }
  for (const knownLimitation of input.proposal.limitations) {
    limitations.push(limitation(`proposal-limitation:${knownLimitation}`, "warning", knownLimitation));
  }
  return uniqueBy(limitations, (item) => item.observedLimitationId);
}

function readiness(input: {
  status: Exclude<ObservedWebsiteStatus, "invalid" | "stale">;
  pages: ObservedPage[];
  fileRecordsAvailable: boolean;
  navigation: ObservedNavigation[];
  sections: ObservedSection[];
  messages: ObservedMessage[];
  assets: ObservedAsset[];
  technicalSignals: ObservedTechnicalSignal[];
}): ObservedWebsiteReadiness {
  return {
    status: input.status,
    observable: input.status === "observable" || input.status === "partially_observable",
    pageInventoryObserved: input.pages.length > 0,
    fileInventoryObserved: input.fileRecordsAvailable || input.assets.length > 0,
    navigationObserved: input.navigation.length > 0,
    sectionMetadataObserved: input.sections.length > 0,
    messageMetadataObserved: input.messages.length > 0,
    assetMetadataObserved: input.assets.length > 0,
    technicalSignalsObserved: input.technicalSignals.length > 0,
    blockers: input.status === "blocked" ? ["SOURCE_GENERATED_WEBSITE_PROPOSAL_BLOCKED"] : [],
    diagnostics: uniqueSorted([
      `OBSERVED_WEBSITE_MODEL_RUNTIME_VERSION:${OBSERVED_WEBSITE_MODEL_RUNTIME_VERSION}`,
      input.pages.length > 0 ? "OBSERVED_ROUTE_METADATA_PRESENT" : "OBSERVED_ROUTE_METADATA_MISSING",
      input.assets.length > 0 ? "OBSERVED_FILE_OR_ASSET_METADATA_PRESENT" : "OBSERVED_FILE_OR_ASSET_METADATA_MISSING",
    ]),
  };
}

function determineStatus(input: {
  proposal: GeneratedWebsiteProposalArtifact;
  pages: ObservedPage[];
  navigation: ObservedNavigation[];
  sections: ObservedSection[];
  messages: ObservedMessage[];
  assets: ObservedAsset[];
  technicalSignals: ObservedTechnicalSignal[];
}): Exclude<ObservedWebsiteStatus, "invalid" | "stale"> {
  if (input.proposal.status === "blocked") return "blocked";
  const observedCount = input.pages.length +
    input.navigation.length +
    input.sections.length +
    input.messages.length +
    input.assets.length +
    input.technicalSignals.length;
  if (observedCount === 0) return "not_observable";
  if (input.pages.length > 0 && input.assets.length > 0) return "observable";
  return "partially_observable";
}

function stripUndefined<T extends object>(value: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (nested !== undefined) result[key] = nested;
  }
  return result as T;
}

function metadataDiagnostics(input: ObservedWebsiteModelBuildInput): string[] {
  return uniqueSorted([
    ...input.sourceGeneratedWebsiteProposal.outputBundle.diagnostics,
    ...(input.outputMetadata?.diagnostics ?? []),
    "OBSERVED_WEBSITE_MODEL_BUILT_FROM_QUARANTINED_PROPOSAL_METADATA",
    "OBSERVED_WEBSITE_MODEL_NO_WGP_COMPARISON",
    "OBSERVED_WEBSITE_MODEL_NO_COMPLIANCE_JUDGMENT",
    "OBSERVED_WEBSITE_MODEL_NO_PROVIDER_CALL",
    "OBSERVED_WEBSITE_MODEL_NO_AI_EXECUTION",
    "OBSERVED_WEBSITE_MODEL_NO_CODE_EXECUTION",
    "OBSERVED_WEBSITE_MODEL_NO_RENDERING",
    "OBSERVED_WEBSITE_MODEL_NO_PUBLISHING_OR_RUNTIME_MUTATION",
  ]);
}

export function buildObservedWebsiteModel(input: ObservedWebsiteModelBuildInput): ObservedWebsiteModelArtifact {
  const proposalValidation = validateGeneratedWebsiteProposal(input.sourceGeneratedWebsiteProposal);
  if (!proposalValidation.valid) {
    throw new ObservedWebsiteModelBuildValidationError({
      valid: false,
      errors: proposalValidation.errors.map((error) => `sourceGeneratedWebsiteProposal.${error}`),
      warnings: proposalValidation.warnings,
    });
  }

  const proposal = input.sourceGeneratedWebsiteProposal;
  const metadata = input.outputMetadata ?? {};
  const bundle = bundleRecord(proposal);
  const evidence = baseEvidence(input);
  const outputBundleEvidence = evidence.find((item) => item.refId === proposal.outputBundle.outputBundleId)!;
  const outputBundleEvidenceId = outputBundleEvidence.observedEvidenceId;
  const routeRecords = collectArrays(
    metadata.routeInventory,
    metadata.routes,
    metadata.pages,
    bundle.routeInventory,
    bundle.routes,
    bundle.pages,
  );
  const fileRecords = collectArrays(
    metadata.fileInventory,
    metadata.files,
    metadata.fileTree,
    bundle.fileInventory,
    bundle.files,
    bundle.fileTree,
  );
  const assetRecords = collectArrays(metadata.assets, bundle.assets);
  const navigationRecords = collectArrays(metadata.navigation, bundle.navigation);
  const sectionRecords = collectArrays(metadata.sections, bundle.sections);
  const messageRecords = collectArrays(metadata.messages, bundle.messages);
  const constraintRecords = collectArrays(metadata.constraints, bundle.constraints);
  const technicalRecords = collectArrays(metadata.technicalSignals, bundle.technicalSignals);

  const pages = buildPages({ records: routeRecords, outputBundleEvidenceId });
  const entrypoints = proposal.outputBundle.entrypoints;
  const assets = buildAssets({
    fileRecords,
    assetRecords,
    entrypoints,
    outputBundleEvidenceId,
  });
  const navigation = buildNavigation({ records: navigationRecords, pages, outputBundleEvidenceId });
  const sections = buildSections({ records: sectionRecords, pages, outputBundleEvidenceId });
  const messages = buildMessages({
    records: messageRecords,
    providerNotes: proposal.providerNotes,
    operatorDiagnostics: proposal.operatorAttestation.diagnostics,
    pages,
    outputBundleEvidenceId,
  });
  const constraints = buildConstraints({
    records: constraintRecords,
    limitations: proposal.knownLimitations,
    outputBundleEvidenceId,
  });
  const technicalSignals = buildTechnicalSignals({
    records: technicalRecords,
    proposal,
    outputBundleEvidenceId,
  });
  const fileRecordsAvailable = fileRecords.length > 0;
  const status = determineStatus({ proposal, pages, navigation, sections, messages, assets, technicalSignals });
  const limitations = deriveLimitations({
    pages,
    fileRecordsAvailable,
    navigation,
    sections,
    messages,
    assets,
    technicalSignals,
    proposal,
  });
  const createdAt = input.createdAt ?? proposal.createdAt;

  const upstreamEvidence = uniqueBy([
    ...evidence,
    ...proposal.lineage.upstreamArtifactRefs.map((ref) => evidenceFor(
      "generated_website_proposal",
      ref.refId,
      ref.description ?? "Upstream artifact reference preserved from Generated Website Proposal lineage.",
    )),
  ], (item) => item.observedEvidenceId);

  const artifact: ObservedWebsiteModelArtifact = {
    observedWebsiteModelId: modelId({
      proposal,
      sourceGeneratedWebsiteProposalArtifactId: input.sourceGeneratedWebsiteProposalArtifactId,
      outputMetadata: input.outputMetadata,
    }),
    status,
    siteVersionId: proposal.siteVersionId,
    dryRunId: proposal.dryRunId,
    sourceGeneratedWebsiteProposalId: proposal.generatedWebsiteProposalId,
    sourceProviderGenerationPayloadId: proposal.sourceProviderGenerationPayloadId,
    sourceWebsiteGenerationPackageId: proposal.sourceWebsiteGenerationPackageId,
    createdAt,
    contractVersion: OBSERVED_WEBSITE_MODEL_CONTRACT_VERSION,
    lineage: stripUndefined({
      siteVersionId: proposal.siteVersionId,
      dryRunId: proposal.dryRunId,
      sourceGeneratedWebsiteProposalId: proposal.generatedWebsiteProposalId,
      sourceGeneratedWebsiteProposalArtifactId: input.sourceGeneratedWebsiteProposalArtifactId,
      sourceGeneratedWebsiteProposalStatus: proposal.status,
      sourceGeneratedWebsiteProposalContractVersion: proposal.contractVersion,
      sourceProviderGenerationPayloadId: proposal.sourceProviderGenerationPayloadId,
      sourceProviderGenerationPayloadArtifactId: proposal.lineage.sourceProviderGenerationPayloadArtifactId,
      sourceWebsiteGenerationPackageId: proposal.sourceWebsiteGenerationPackageId,
      sourceWebsiteGenerationPackageArtifactId: proposal.lineage.sourceWebsiteGenerationPackageArtifactId,
      outputBundleId: proposal.outputBundle.outputBundleId,
      operatorAttestationId: proposal.operatorAttestation.attestationId,
      observedAt: createdAt,
      upstreamArtifactRefs: upstreamEvidence,
    }),
    pages,
    navigation,
    sections,
    messages,
    assets,
    constraints,
    technicalSignals,
    evidence: upstreamEvidence,
    readiness: readiness({
      status,
      pages,
      fileRecordsAvailable,
      navigation,
      sections,
      messages,
      assets,
      technicalSignals,
    }),
    limitations,
    diagnostics: metadataDiagnostics(input),
  };

  const validation = validateObservedWebsiteModel({
    artifact,
    sourceGeneratedWebsiteProposal: proposal,
  });
  if (!validation.valid) throw new ObservedWebsiteModelBuildValidationError(validation);
  return cloneJson(artifact);
}
