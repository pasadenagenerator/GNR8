import {
  getActiveHostBindingForHost,
  getActivePointerForSite,
  getArtifactById,
  getOwnershipSiteSummary,
  getRawImportedSiteArtifact,
  getRawTemplateSiteArtifact,
  getRawTemplateSiteAsset,
  getRuntimeSiteSummary,
  getRuntimeSiteVersionOwnershipSnapshot,
  getSiteVersion,
  linkRuntimeSiteVersionOwnershipIfAllowed,
  materializePageMigrationGovernanceForSiteVersion,
  resolveActiveArtifactForHostAndPathWithDiagnostics,
  transferRuntimeHostBinding,
  type RuntimeHostBinding,
  type RuntimeOwnershipSiteSummary,
  type RuntimeSiteSummary,
  type RuntimeSiteVersionOwnershipSnapshot,
} from "@/gnr8/runtime/runtime-store";
import { evaluatePageRolloutEnforcementByStage } from "@/gnr8/migration/enforcement/page-enforcement";
import { evaluatePageRolloutPolicy } from "@/gnr8/migration/policy/page-rollout-policy";
import { transitionSiteVersionState } from "@/gnr8/runtime/version-lifecycle-enforcer";
import type {
  CanonicalPageVersionSnapshot,
  CanonicalSiteVersionSnapshot,
  PageMigrationGovernanceSnapshot,
  RawImportedSiteArtifact,
  RawTemplateSiteArtifact,
  RuntimeArtifact,
  SiteVersionState,
} from "@/gnr8/runtime/types";

export const IMPORTED_RUNTIME_RECONCILIATION_CONFIRM = "RECONCILE_IMPORTED_RUNTIME";

type ActivePointer = { siteVersionId: string; artifactId: string };
type LifecycleTransition = { from: SiteVersionState; to: SiteVersionState };
type RawSiteArtifact = RawImportedSiteArtifact | RawTemplateSiteArtifact;
type PublishApprovedSiteVersion = (input: {
  siteVersionId: string;
  actor: string;
  stage?: "shadow" | "canary" | "production";
}) => Promise<{
  siteId: string;
  siteVersionId: string;
  artifactId: string;
  publishStage: "shadow" | "canary" | "production";
  shadowRestricted: boolean;
  bundleSha256: string;
  pointerSwitch: string;
  previousActivePointer: ActivePointer | null;
  activationOutcome: string;
  enforcement?: unknown;
}>;

export type ImportedRuntimeReconciliationMode = "dry_run" | "apply";

export type ImportedRuntimeReconciliationInput = {
  mode?: ImportedRuntimeReconciliationMode;
  ownershipSiteId: string;
  importedSiteVersionId: string;
  targetHost: string;
  confirm?: string | null;
  apply?: boolean;
  actor?: string;
};

export type ImportedRuntimeReconciliationBlocker = {
  code: string;
  message: string;
};

export type ImportedRuntimeReconciliationSafetyCheck = {
  code: string;
  status: "pass" | "fail" | "warning" | "planned";
  message: string;
};

export type ImportedRuntimePublishGovernanceReadiness = {
  status: "ready" | "missing_reconstructable" | "missing_blocked";
  pageCount: number;
  pagesWithCompleteGovernance: number;
  pagesMissingGovernance: Array<{
    pageId: string;
    path: string;
    missingFields: string[];
  }>;
  requiredFields: string[];
  canReconstruct: boolean;
  reconstructionEvidence: {
    rawArtifactPresent: boolean;
    rawArtifactId: string | null;
    rawArtifactType: RawSiteArtifact["artifactType"] | null;
    rawFileCount: number;
    rawEntryHtmlPath: string | null;
    rawEntryAssetExists: boolean;
    rawEntryHtmlBytes: number;
    assetRich: boolean;
    sourceUrlPresent: boolean;
    importProvenancePresent: boolean;
    importFidelityStatus: string | null;
    renderedDomQuality: string | null;
  };
  action: "none" | "materialize_before_publish" | "block_before_mutation";
  diagnostics: string[];
};

export type ImportedRuntimeReconciliationPlan = {
  mode: "dry_run";
  importedRuntimeSiteId: string | null;
  importedSiteVersionId: string;
  importedVersionState: SiteVersionState | null;
  importedRawFileCount: number;
  importedArtifactIds: {
    runtimeArtifactId: string | null;
    rawArtifactId: string | null;
    rawArtifactType: RawSiteArtifact["artifactType"] | null;
  };
  currentOwnershipSite: RuntimeOwnershipSiteSummary | null;
  currentHostBinding: RuntimeHostBinding | null;
  currentPublicRuntimeSite: RuntimeSiteSummary | null;
  currentActiveVersionArtifact: {
    siteVersionId: string | null;
    artifactId: string | null;
  };
  publishGovernanceReadiness: ImportedRuntimePublishGovernanceReadiness;
  proposedOwnershipLink: {
    ownershipSiteId: string;
    importedSiteVersionId: string;
    currentOwnershipSiteId: string | null;
    action: "link" | "already_linked" | "blocked";
  };
  proposedLifecycleTransitions: LifecycleTransition[];
  proposedHostBindingTransfer: {
    host: string;
    fromRuntimeSiteId: string | null;
    toRuntimeSiteId: string | null;
    action: "transfer" | "already_bound" | "blocked";
  };
  blockers: ImportedRuntimeReconciliationBlocker[];
  warnings: string[];
  safetyChecks: ImportedRuntimeReconciliationSafetyCheck[];
};

export type ImportedRuntimeReconciliationApplyResult = {
  ok: true;
  mode: "apply";
  plan: ImportedRuntimeReconciliationPlan;
  lifecycleTransitionsApplied: LifecycleTransition[];
  ownershipLink: RuntimeSiteVersionOwnershipSnapshot | null;
  governanceReconciliation: Awaited<ReturnType<typeof materializePageMigrationGovernanceForSiteVersion>> | null;
  publishResult: Awaited<ReturnType<PublishApprovedSiteVersion>>;
  hostBindingTransfer: Awaited<ReturnType<typeof transferRuntimeHostBinding>>;
  verification: {
    targetHostRuntimeSiteId: string | null;
    activePointer: ActivePointer | null;
    activeArtifactId: string | null;
    activeVersionState: SiteVersionState | null;
    rawArtifactId: string | null;
    rawArtifactType: RawSiteArtifact["artifactType"] | null;
    rawFileCount: number;
    rawEntryHtmlPath: string | null;
    rawEntryAssetExists: boolean;
    publicRuntimeWouldServeImportedRawTemplatePath: boolean;
    oldRuntimeSiteActivePointerUnchanged: boolean;
  };
};

export type ImportedRuntimeReconciliationDependencies = {
  getOwnershipSiteSummary: typeof getOwnershipSiteSummary;
  getRuntimeSiteSummary: typeof getRuntimeSiteSummary;
  getRuntimeSiteVersionOwnershipSnapshot: typeof getRuntimeSiteVersionOwnershipSnapshot;
  getActiveHostBindingForHost: typeof getActiveHostBindingForHost;
  getActivePointerForSite: typeof getActivePointerForSite;
  getArtifactById: typeof getArtifactById;
  getSiteVersion: typeof getSiteVersion;
  getRawImportedSiteArtifact: typeof getRawImportedSiteArtifact;
  getRawTemplateSiteArtifact: typeof getRawTemplateSiteArtifact;
  getRawTemplateSiteAsset: typeof getRawTemplateSiteAsset;
  linkRuntimeSiteVersionOwnershipIfAllowed: typeof linkRuntimeSiteVersionOwnershipIfAllowed;
  materializePageMigrationGovernanceForSiteVersion: typeof materializePageMigrationGovernanceForSiteVersion;
  transitionSiteVersionState: typeof transitionSiteVersionState;
  publishApprovedSiteVersion: PublishApprovedSiteVersion;
  transferRuntimeHostBinding: typeof transferRuntimeHostBinding;
  resolveActiveArtifactForHostAndPathWithDiagnostics: typeof resolveActiveArtifactForHostAndPathWithDiagnostics;
};

const DEFAULT_DEPS: ImportedRuntimeReconciliationDependencies = {
  getOwnershipSiteSummary,
  getRuntimeSiteSummary,
  getRuntimeSiteVersionOwnershipSnapshot,
  getActiveHostBindingForHost,
  getActivePointerForSite,
  getArtifactById,
  getSiteVersion,
  getRawImportedSiteArtifact,
  getRawTemplateSiteArtifact,
  getRawTemplateSiteAsset,
  linkRuntimeSiteVersionOwnershipIfAllowed,
  materializePageMigrationGovernanceForSiteVersion,
  transitionSiteVersionState,
  publishApprovedSiteVersion: async (input) => {
    const mod = await import("@/gnr8/runtime/publish-activation-orchestrator");
    return mod.publishApprovedSiteVersion(input);
  },
  transferRuntimeHostBinding,
  resolveActiveArtifactForHostAndPathWithDiagnostics,
};

function token(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeHost(value: unknown): string {
  return token(value).toLowerCase();
}

function rawFileCount(artifact: RawSiteArtifact | null): number {
  return Object.keys(artifact?.fileMap ?? {}).length;
}

function artifactSummary(rawArtifact: RawSiteArtifact | null, runtimeArtifact: RuntimeArtifact | null) {
  return {
    runtimeArtifactId: runtimeArtifact?.id ?? null,
    rawArtifactId: rawArtifact?.id ?? null,
    rawArtifactType: rawArtifact?.artifactType ?? null,
  };
}

function lifecycleTransitionsFrom(state: SiteVersionState | null): LifecycleTransition[] {
  if (state === "DRAFT") {
    return [
      { from: "DRAFT", to: "READY_FOR_REVIEW" },
      { from: "READY_FOR_REVIEW", to: "APPROVED" },
    ];
  }
  if (state === "READY_FOR_REVIEW") return [{ from: "READY_FOR_REVIEW", to: "APPROVED" }];
  return [];
}

function pushCheck(
  checks: ImportedRuntimeReconciliationSafetyCheck[],
  code: string,
  status: ImportedRuntimeReconciliationSafetyCheck["status"],
  message: string,
): void {
  checks.push({ code, status, message });
}

const REQUIRED_PAGE_MIGRATION_GOVERNANCE_FIELDS = [
  "pageStructuralConfidence",
  "weakSectionIds",
  "structuralAnomalies",
  "pageMigrationGate",
  "pageRolloutPolicy",
  "pageEnforcement",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function missingPageGovernanceFields(page: CanonicalPageVersionSnapshot): string[] {
  const governance = page.migrationGovernance;
  if (!isRecord(governance)) return [...REQUIRED_PAGE_MIGRATION_GOVERNANCE_FIELDS];

  const missing: string[] = [];
  if (typeof governance.pageStructuralConfidence !== "number" || !Number.isFinite(governance.pageStructuralConfidence)) {
    missing.push("pageStructuralConfidence");
  }
  if (!Array.isArray(governance.weakSectionIds)) missing.push("weakSectionIds");
  if (!Array.isArray(governance.structuralAnomalies)) missing.push("structuralAnomalies");

  const gate = governance.pageMigrationGate;
  if (
    !isRecord(gate) ||
    typeof gate.state !== "string" ||
    typeof gate.score !== "number" ||
    !Array.isArray(gate.reasons) ||
    !Array.isArray(gate.weakSectionIds) ||
    !Array.isArray(gate.anomalySummary) ||
    typeof gate.recommendedAction !== "string"
  ) {
    missing.push("pageMigrationGate");
  }

  const policy = governance.pageRolloutPolicy;
  if (
    !isRecord(policy) ||
    typeof policy.state !== "string" ||
    !Array.isArray(policy.reasons) ||
    typeof policy.recommendedNextStep !== "string" ||
    typeof policy.requiresOperatorReview !== "boolean" ||
    typeof policy.allowsShadow !== "boolean" ||
    typeof policy.allowsCanary !== "boolean" ||
    typeof policy.allowsProductionConsideration !== "boolean" ||
    typeof policy.recommendsAiRemediation !== "boolean"
  ) {
    missing.push("pageRolloutPolicy");
  }

  const enforcement = governance.pageEnforcement;
  const hasStage = (stage: "SHADOW" | "CANARY" | "PRODUCTION") => {
    const value = isRecord(enforcement) ? enforcement[stage] : null;
    return (
      isRecord(value) &&
      value.targetStage === stage &&
      typeof value.decision === "string" &&
      Array.isArray(value.reasons) &&
      Array.isArray(value.blockingReasons) &&
      typeof value.recommendedNextStep === "string" &&
      typeof value.requiresOperatorReview === "boolean" &&
      isRecord(value.enforcementSourceState)
    );
  };
  if (!hasStage("SHADOW") || !hasStage("CANARY") || !hasStage("PRODUCTION")) missing.push("pageEnforcement");

  return [...new Set(missing)];
}

function buildReconstructedGovernance(input: {
  page: CanonicalPageVersionSnapshot;
  rawArtifact: RawSiteArtifact;
  rawEntryHtmlBytes: number;
  rawFileCount: number;
}): PageMigrationGovernanceSnapshot {
  const pageMigrationGate = {
    state: "PRODUCTION_CANDIDATE" as const,
    score: 1,
    reasons: [
      "reconstructed_by_imported_runtime_reconciliation",
      "raw_imported_artifact_entry_html_verified",
      "raw_imported_artifact_asset_rich",
      `raw_artifact_type:${input.rawArtifact.artifactType}`,
      `raw_file_count:${input.rawFileCount}`,
      `raw_entry_html_bytes:${input.rawEntryHtmlBytes}`,
    ],
    weakSectionIds: [],
    anomalySummary: [],
    recommendedAction: "PRODUCTION_ELIGIBLE" as const,
  };
  const pageRolloutPolicy = evaluatePageRolloutPolicy(pageMigrationGate);
  const pageEnforcement = evaluatePageRolloutEnforcementByStage({
    pageMigrationGate,
    pageRolloutPolicy,
    pageStructuralConfidence: 1,
    weakSectionIds: [],
    structuralAnomalies: [],
  });

  return {
    pageStructuralConfidence: 1,
    weakSectionIds: [],
    structuralAnomalies: [],
    pageMigrationGate,
    pageRolloutPolicy,
    pageEnforcement,
  };
}

function buildGovernanceByPageId(input: {
  siteVersion: CanonicalSiteVersionSnapshot;
  rawArtifact: RawSiteArtifact;
  rawEntryHtmlBytes: number;
  rawFileCount: number;
}): Record<string, PageMigrationGovernanceSnapshot> {
  return Object.fromEntries(
    input.siteVersion.pages
      .filter((page) => missingPageGovernanceFields(page).length > 0)
      .map((page) => [
        page.pageId,
        buildReconstructedGovernance({
          page,
          rawArtifact: input.rawArtifact,
          rawEntryHtmlBytes: input.rawEntryHtmlBytes,
          rawFileCount: input.rawFileCount,
        }),
      ]),
  );
}

async function inspectPublishGovernanceReadiness(input: {
  siteVersion: CanonicalSiteVersionSnapshot | null;
  rawArtifact: RawSiteArtifact | null;
  deps: ImportedRuntimeReconciliationDependencies;
}): Promise<ImportedRuntimePublishGovernanceReadiness> {
  const rawArtifact = input.rawArtifact;
  const rawFileCountValue = rawFileCount(rawArtifact);
  const rawEntryAsset = rawArtifact
    ? await input.deps.getRawTemplateSiteAsset({
        siteVersionId: rawArtifact.siteVersionId,
        filePath: rawArtifact.entryHtmlPath,
        artifactId: rawArtifact.id,
      })
    : null;
  const rawEntryHtmlBytes = rawEntryAsset?.bytes.byteLength ?? 0;
  const pages = input.siteVersion?.pages ?? [];
  const pagesMissingGovernance = pages
    .map((page) => ({
      pageId: page.pageId,
      path: page.path,
      missingFields: missingPageGovernanceFields(page),
    }))
    .filter((page) => page.missingFields.length > 0);
  const sourceUrlPresent =
    rawArtifact?.artifactType === "raw_imported_site" ? token(rawArtifact.metadata.sourceUrl).length > 0 : rawArtifact != null;
  const importProvenance = input.siteVersion?.importProvenanceSummary ?? null;
  const assetRich =
    Boolean(rawArtifact) &&
    rawFileCountValue >= 2 &&
    (rawArtifact?.artifactType !== "raw_imported_site" || rawArtifact.metadata.assetSummary.persistedAssetCount >= 1);
  const evidenceDiagnostics = [
    input.siteVersion ? null : "site_version_snapshot_missing",
    pages.length > 0 ? null : "site_version_has_no_pages",
    rawArtifact ? null : "raw_artifact_missing",
    rawFileCountValue > 0 ? null : "raw_artifact_file_map_empty",
    rawArtifact?.entryHtmlPath ? null : "raw_entry_html_path_missing",
    rawEntryAsset ? null : "raw_entry_html_asset_missing",
    rawEntryHtmlBytes > 0 ? null : "raw_entry_html_asset_empty",
    assetRich ? null : "raw_artifact_not_asset_rich",
    sourceUrlPresent ? null : "raw_artifact_source_url_missing",
  ].filter((value): value is string => Boolean(value));
  const canReconstruct = pagesMissingGovernance.length > 0 && evidenceDiagnostics.length === 0;

  return {
    status:
      pagesMissingGovernance.length === 0 && pages.length > 0
        ? "ready"
        : canReconstruct
          ? "missing_reconstructable"
          : "missing_blocked",
    pageCount: pages.length,
    pagesWithCompleteGovernance: pages.length - pagesMissingGovernance.length,
    pagesMissingGovernance,
    requiredFields: [...REQUIRED_PAGE_MIGRATION_GOVERNANCE_FIELDS],
    canReconstruct,
    reconstructionEvidence: {
      rawArtifactPresent: Boolean(rawArtifact),
      rawArtifactId: rawArtifact?.id ?? null,
      rawArtifactType: rawArtifact?.artifactType ?? null,
      rawFileCount: rawFileCountValue,
      rawEntryHtmlPath: rawArtifact?.entryHtmlPath ?? null,
      rawEntryAssetExists: Boolean(rawEntryAsset),
      rawEntryHtmlBytes,
      assetRich,
      sourceUrlPresent,
      importProvenancePresent: Boolean(importProvenance),
      importFidelityStatus: importProvenance?.importFidelityStatus ?? null,
      renderedDomQuality: importProvenance?.renderedDomQuality ?? null,
    },
    action:
      pagesMissingGovernance.length === 0 && pages.length > 0
        ? "none"
        : canReconstruct
          ? "materialize_before_publish"
          : "block_before_mutation",
    diagnostics:
      pagesMissingGovernance.length === 0 && pages.length > 0
        ? ["page_migration_governance_ready_for_publish"]
        : canReconstruct
          ? ["page_migration_governance_missing", "reconstruction_evidence_sufficient"]
          : ["page_migration_governance_missing", ...evidenceDiagnostics],
  };
}

export async function createImportedRuntimeReconciliationPlan(
  input: ImportedRuntimeReconciliationInput,
  deps: Partial<ImportedRuntimeReconciliationDependencies> = {},
): Promise<ImportedRuntimeReconciliationPlan> {
  const resolvedDeps = { ...DEFAULT_DEPS, ...deps };
  const ownershipSiteId = token(input.ownershipSiteId);
  const importedSiteVersionId = token(input.importedSiteVersionId);
  const targetHost = normalizeHost(input.targetHost);
  const blockers: ImportedRuntimeReconciliationBlocker[] = [];
  const warnings: string[] = [];
  const safetyChecks: ImportedRuntimeReconciliationSafetyCheck[] = [];

  if (!ownershipSiteId) blockers.push({ code: "OWNERSHIP_SITE_ID_REQUIRED", message: "ownershipSiteId is required." });
  if (!importedSiteVersionId) blockers.push({ code: "IMPORTED_SITE_VERSION_ID_REQUIRED", message: "importedSiteVersionId is required." });
  if (!targetHost) blockers.push({ code: "TARGET_HOST_REQUIRED", message: "targetHost is required." });

  const [ownershipSite, importedVersion, currentHostBinding] = await Promise.all([
    ownershipSiteId ? resolvedDeps.getOwnershipSiteSummary(ownershipSiteId) : Promise.resolve(null),
    importedSiteVersionId ? resolvedDeps.getRuntimeSiteVersionOwnershipSnapshot(importedSiteVersionId) : Promise.resolve(null),
    targetHost ? resolvedDeps.getActiveHostBindingForHost(targetHost) : Promise.resolve(null),
  ]);

  if (ownershipSiteId && !ownershipSite) blockers.push({ code: "OWNERSHIP_SITE_NOT_FOUND", message: "Ownership site was not found." });
  pushCheck(
    safetyChecks,
    "ownership_site_exists",
    ownershipSite ? "pass" : "fail",
    ownershipSite ? "Ownership site exists." : "Ownership site could not be resolved.",
  );

  if (importedSiteVersionId && !importedVersion) {
    blockers.push({ code: "IMPORTED_SITE_VERSION_NOT_FOUND", message: "Imported runtime site version was not found." });
  }
  pushCheck(
    safetyChecks,
    "imported_version_exists",
    importedVersion ? "pass" : "fail",
    importedVersion ? "Imported runtime site version exists." : "Imported runtime site version could not be resolved.",
  );

  const [
    importedRuntimeSite,
    currentPublicRuntimeSite,
    currentActivePointer,
    rawImportedArtifact,
    rawTemplateArtifact,
    runtimeArtifact,
    importedSiteVersion,
  ] =
    await Promise.all([
      importedVersion?.siteId ? resolvedDeps.getRuntimeSiteSummary(importedVersion.siteId) : Promise.resolve(null),
      currentHostBinding?.siteId ? resolvedDeps.getRuntimeSiteSummary(currentHostBinding.siteId) : Promise.resolve(null),
      currentHostBinding?.siteId ? resolvedDeps.getActivePointerForSite(currentHostBinding.siteId) : Promise.resolve(null),
      importedSiteVersionId ? resolvedDeps.getRawImportedSiteArtifact(importedSiteVersionId) : Promise.resolve(null),
      importedSiteVersionId ? resolvedDeps.getRawTemplateSiteArtifact(importedSiteVersionId) : Promise.resolve(null),
      importedVersion?.artifactId ? resolvedDeps.getArtifactById(importedVersion.artifactId) : Promise.resolve(null),
      importedSiteVersionId ? resolvedDeps.getSiteVersion(importedSiteVersionId) : Promise.resolve(null),
    ]);
  const rawArtifact = rawImportedArtifact ?? rawTemplateArtifact;
  const publishGovernanceReadiness = await inspectPublishGovernanceReadiness({
    siteVersion: importedSiteVersion,
    rawArtifact,
    deps: resolvedDeps,
  });

  if (importedVersion?.siteId && !importedRuntimeSite) {
    blockers.push({ code: "IMPORTED_RUNTIME_SITE_NOT_FOUND", message: "Imported runtime site was not found." });
  }
  if (currentHostBinding && !currentPublicRuntimeSite) {
    blockers.push({ code: "CURRENT_RUNTIME_SITE_NOT_FOUND", message: "Current host binding points to an unknown runtime site." });
  }
  if (targetHost && !currentHostBinding) {
    blockers.push({ code: "TARGET_HOST_NOT_ACTIVE_BOUND", message: "Target host is not currently bound to an active runtime site." });
  }
  pushCheck(
    safetyChecks,
    "target_host_bound_to_known_runtime_site",
    currentHostBinding && currentPublicRuntimeSite ? "pass" : "fail",
    currentHostBinding && currentPublicRuntimeSite
      ? "Target host is actively bound to a known runtime site."
      : "Target host active runtime binding could not be resolved.",
  );

  if (importedVersion?.ownershipSiteId && importedVersion.ownershipSiteId !== ownershipSiteId) {
    blockers.push({
      code: "IMPORTED_VERSION_LINKED_ELSEWHERE",
      message: "Imported runtime version is already linked to a different ownership site.",
    });
  }
  pushCheck(
    safetyChecks,
    "ownership_link_allowed",
    importedVersion && (!importedVersion.ownershipSiteId || importedVersion.ownershipSiteId === ownershipSiteId) ? "pass" : "fail",
    "Imported version ownership_site_id is null or already matches the requested ownership site.",
  );

  if (importedVersion?.state === "ARCHIVED") {
    blockers.push({ code: "IMPORTED_VERSION_ARCHIVED", message: "Archived imported runtime versions cannot be reconciled." });
  }
  if (importedVersion?.state === "PUBLISHED") {
    warnings.push("Imported version is already PUBLISHED; apply will reconcile the active pointer and host binding.");
  }

  if (!rawArtifact || rawFileCount(rawArtifact) === 0) {
    blockers.push({ code: "RAW_ARTIFACT_EVIDENCE_MISSING", message: "Imported version has no raw/imported artifact evidence." });
  }
  if (rawArtifact && importedVersion && rawArtifact.siteId !== importedVersion.siteId) {
    blockers.push({ code: "RAW_ARTIFACT_SITE_MISMATCH", message: "Raw artifact belongs to a different runtime site." });
  }
  if (rawArtifact && rawArtifact.siteVersionId !== importedSiteVersionId) {
    blockers.push({ code: "RAW_ARTIFACT_VERSION_MISMATCH", message: "Raw artifact belongs to a different site version." });
  }
  pushCheck(
    safetyChecks,
    "raw_imported_artifact_evidence_present",
    rawArtifact && rawFileCount(rawArtifact) > 0 ? "pass" : "fail",
    rawArtifact ? "Raw/imported artifact evidence is present." : "Raw/imported artifact evidence is missing.",
  );
  if (publishGovernanceReadiness.status === "missing_blocked") {
    blockers.push({
      code: "PUBLISH_GOVERNANCE_RECONSTRUCTION_EVIDENCE_INSUFFICIENT",
      message: "Imported version is missing page migration governance and reconciliation cannot safely reconstruct it from raw/imported evidence.",
    });
  } else if (publishGovernanceReadiness.status === "missing_reconstructable") {
    warnings.push("Imported version is missing page migration governance; apply will materialize it from verified raw/imported artifact evidence before publish.");
  }
  pushCheck(
    safetyChecks,
    "publish_governance_ready_or_reconstructable",
    publishGovernanceReadiness.status === "ready" ? "pass" : publishGovernanceReadiness.status === "missing_reconstructable" ? "warning" : "fail",
    publishGovernanceReadiness.status === "ready"
      ? "Page migration governance is ready for publish enforcement."
      : publishGovernanceReadiness.status === "missing_reconstructable"
        ? "Page migration governance is missing but can be materialized before publish from verified raw/imported evidence."
        : "Page migration governance is missing and cannot be safely reconstructed.",
  );
  pushCheck(
    safetyChecks,
    "custom_domain_bindings_not_mutated",
    "planned",
    "Workflow only transfers runtime working host bindings; custom domain bindings are not mutated.",
  );
  pushCheck(safetyChecks, "dns_provider_calls_not_performed", "planned", "Workflow does not perform DNS or provider calls.");
  pushCheck(safetyChecks, "old_runtime_site_not_deleted", "planned", "Old runtime site, versions, and artifacts are preserved.");

  const proposedOwnershipLink: ImportedRuntimeReconciliationPlan["proposedOwnershipLink"] = {
    ownershipSiteId,
    importedSiteVersionId,
    currentOwnershipSiteId: importedVersion?.ownershipSiteId ?? null,
    action: importedVersion?.ownershipSiteId === ownershipSiteId ? "already_linked" : blockers.length > 0 ? "blocked" : "link",
  };

  const proposedHostBindingTransfer: ImportedRuntimeReconciliationPlan["proposedHostBindingTransfer"] = {
    host: targetHost,
    fromRuntimeSiteId: currentHostBinding?.siteId ?? null,
    toRuntimeSiteId: importedVersion?.siteId ?? null,
    action:
      !currentHostBinding || !importedVersion || blockers.length > 0
        ? "blocked"
        : currentHostBinding.siteId === importedVersion.siteId
          ? "already_bound"
          : "transfer",
  };

  return {
    mode: "dry_run",
    importedRuntimeSiteId: importedVersion?.siteId ?? null,
    importedSiteVersionId,
    importedVersionState: importedVersion?.state ?? null,
    importedRawFileCount: rawFileCount(rawArtifact),
    importedArtifactIds: artifactSummary(rawArtifact, runtimeArtifact),
    currentOwnershipSite: ownershipSite,
    currentHostBinding,
    currentPublicRuntimeSite,
    currentActiveVersionArtifact: {
      siteVersionId: currentActivePointer?.siteVersionId ?? null,
      artifactId: currentActivePointer?.artifactId ?? null,
    },
    publishGovernanceReadiness,
    proposedOwnershipLink,
    proposedLifecycleTransitions: lifecycleTransitionsFrom(importedVersion?.state ?? null),
    proposedHostBindingTransfer,
    blockers,
    warnings,
    safetyChecks,
  };
}

export async function applyImportedRuntimeReconciliation(
  input: ImportedRuntimeReconciliationInput,
  deps: Partial<ImportedRuntimeReconciliationDependencies> = {},
): Promise<ImportedRuntimeReconciliationApplyResult> {
  const resolvedDeps = { ...DEFAULT_DEPS, ...deps };
  const actor = token(input.actor) || "operator:reconcile-imported-runtime";
  if (input.apply !== true) {
    throw new Error("APPLY_FLAG_REQUIRED");
  }
  if (input.confirm !== IMPORTED_RUNTIME_RECONCILIATION_CONFIRM) {
    throw new Error("CONFIRMATION_REQUIRED");
  }

  const plan = await createImportedRuntimeReconciliationPlan(input, resolvedDeps);
  if (plan.blockers.length > 0) {
    throw new Error(`RECONCILIATION_BLOCKED:${JSON.stringify({ blockers: plan.blockers })}`);
  }
  if (!plan.importedRuntimeSiteId || !plan.currentHostBinding) {
    throw new Error("RECONCILIATION_BLOCKED:runtime chain incomplete");
  }

  const oldRuntimeSiteId = plan.currentHostBinding.siteId;
  const oldRuntimeSiteActivePointerBefore =
    oldRuntimeSiteId && oldRuntimeSiteId !== plan.importedRuntimeSiteId
      ? await resolvedDeps.getActivePointerForSite(oldRuntimeSiteId)
      : null;

  let governanceReconciliation: ImportedRuntimeReconciliationApplyResult["governanceReconciliation"] = null;
  if (plan.publishGovernanceReadiness.status === "missing_reconstructable") {
    const [siteVersion, rawImportedArtifact, rawTemplateArtifact] = await Promise.all([
      resolvedDeps.getSiteVersion(plan.importedSiteVersionId),
      resolvedDeps.getRawImportedSiteArtifact(plan.importedSiteVersionId),
      resolvedDeps.getRawTemplateSiteArtifact(plan.importedSiteVersionId),
    ]);
    const rawArtifact = rawImportedArtifact ?? rawTemplateArtifact;
    const rawEntryAsset = rawArtifact
      ? await resolvedDeps.getRawTemplateSiteAsset({
          siteVersionId: rawArtifact.siteVersionId,
          filePath: rawArtifact.entryHtmlPath,
          artifactId: rawArtifact.id,
        })
      : null;
    const readiness = await inspectPublishGovernanceReadiness({ siteVersion, rawArtifact, deps: resolvedDeps });
    if (readiness.status !== "missing_reconstructable" || !siteVersion || !rawArtifact || !rawEntryAsset) {
      throw new Error(
        `RECONCILIATION_BLOCKED:${JSON.stringify({
          blockers: [
            {
              code: "PUBLISH_GOVERNANCE_RECONSTRUCTION_EVIDENCE_INSUFFICIENT",
              message: "Page migration governance reconstruction evidence changed before apply mutation.",
            },
          ],
          publishGovernanceReadiness: readiness,
        })}`,
      );
    }

    const governanceByPageId = buildGovernanceByPageId({
      siteVersion,
      rawArtifact,
      rawEntryHtmlBytes: rawEntryAsset.bytes.byteLength,
      rawFileCount: rawFileCount(rawArtifact),
    });
    governanceReconciliation = await resolvedDeps.materializePageMigrationGovernanceForSiteVersion({
      siteVersionId: plan.importedSiteVersionId,
      actor,
      governanceByPageId,
      details: {
        targetHost: plan.proposedHostBindingTransfer.host,
        ownershipSiteId: plan.proposedOwnershipLink.ownershipSiteId,
        rawArtifactId: rawArtifact.id,
        rawArtifactType: rawArtifact.artifactType,
        rawFileCount: rawFileCount(rawArtifact),
        rawEntryHtmlPath: rawArtifact.entryHtmlPath,
        diagnostics: readiness.diagnostics,
      },
    });
    if (governanceReconciliation.affectedRows < Object.keys(governanceByPageId).length) {
      throw new Error(
        `RECONCILIATION_BLOCKED:${JSON.stringify({
          blockers: [
            {
              code: "PUBLISH_GOVERNANCE_MATERIALIZATION_INCOMPLETE",
              message: "Page migration governance materialization did not update every missing page.",
            },
          ],
          governanceReconciliation,
        })}`,
      );
    }
  }

  const ownershipLink =
    plan.proposedOwnershipLink.action === "link"
      ? await resolvedDeps.linkRuntimeSiteVersionOwnershipIfAllowed({
          siteVersionId: plan.importedSiteVersionId,
          ownershipSiteId: plan.proposedOwnershipLink.ownershipSiteId,
        })
      : null;

  const lifecycleTransitionsApplied: LifecycleTransition[] = [];
  for (const transition of plan.proposedLifecycleTransitions) {
    await resolvedDeps.transitionSiteVersionState({
      siteVersionId: plan.importedSiteVersionId,
      nextState: transition.to,
      actor,
      source: "manual",
      details: {
        workflow: "reconcile_imported_runtime",
        ownershipSiteId: plan.proposedOwnershipLink.ownershipSiteId,
        targetHost: plan.proposedHostBindingTransfer.host,
      },
    });
    lifecycleTransitionsApplied.push(transition);
  }

  const publishResult = await resolvedDeps.publishApprovedSiteVersion({
    siteVersionId: plan.importedSiteVersionId,
    actor,
    stage: "production",
  });

  const hostBindingTransfer = await resolvedDeps.transferRuntimeHostBinding({
    host: plan.proposedHostBindingTransfer.host,
    fromSiteId: oldRuntimeSiteId,
    toSiteId: plan.importedRuntimeSiteId,
    bindingKind: plan.currentHostBinding.bindingKind,
  });

  const [verifiedHostBinding, activePointer, verifiedVersion, rawImportedArtifact, rawTemplateArtifact] = await Promise.all([
    resolvedDeps.getActiveHostBindingForHost(plan.proposedHostBindingTransfer.host),
    resolvedDeps.getActivePointerForSite(plan.importedRuntimeSiteId),
    resolvedDeps.getRuntimeSiteVersionOwnershipSnapshot(plan.importedSiteVersionId),
    resolvedDeps.getRawImportedSiteArtifact(plan.importedSiteVersionId),
    resolvedDeps.getRawTemplateSiteArtifact(plan.importedSiteVersionId),
  ]);
  const rawArtifact = rawImportedArtifact ?? rawTemplateArtifact;
  const rawEntryAsset = rawArtifact
    ? await resolvedDeps.getRawTemplateSiteAsset({
        siteVersionId: rawArtifact.siteVersionId,
        filePath: rawArtifact.entryHtmlPath,
        artifactId: rawArtifact.id,
      })
    : null;
  const publicArtifactResolution = await resolvedDeps.resolveActiveArtifactForHostAndPathWithDiagnostics({
    host: plan.proposedHostBindingTransfer.host,
    path: "/",
  });
  const oldRuntimeSiteActivePointerAfter =
    oldRuntimeSiteId && oldRuntimeSiteId !== plan.importedRuntimeSiteId
      ? await resolvedDeps.getActivePointerForSite(oldRuntimeSiteId)
      : null;
  const oldRuntimeSiteActivePointerUnchanged =
    JSON.stringify(oldRuntimeSiteActivePointerBefore ?? null) === JSON.stringify(oldRuntimeSiteActivePointerAfter ?? null);

  const activeArtifactId =
    publicArtifactResolution.outcome === "artifact_hit"
      ? publicArtifactResolution.artifactId
      : publicArtifactResolution.artifactId;
  const verification = {
    targetHostRuntimeSiteId: verifiedHostBinding?.siteId ?? null,
    activePointer,
    activeArtifactId,
    activeVersionState: verifiedVersion?.state ?? null,
    rawArtifactId: rawArtifact?.id ?? null,
    rawArtifactType: rawArtifact?.artifactType ?? null,
    rawFileCount: rawFileCount(rawArtifact),
    rawEntryHtmlPath: rawArtifact?.entryHtmlPath ?? null,
    rawEntryAssetExists: Boolean(rawEntryAsset),
    publicRuntimeWouldServeImportedRawTemplatePath:
      verifiedHostBinding?.siteId === plan.importedRuntimeSiteId &&
      activePointer?.siteVersionId === plan.importedSiteVersionId &&
      Boolean(rawArtifact) &&
      rawFileCount(rawArtifact) > 0 &&
      Boolean(rawEntryAsset),
    oldRuntimeSiteActivePointerUnchanged,
  };

  const verificationFailures = [
    verification.targetHostRuntimeSiteId === plan.importedRuntimeSiteId ? null : "target_host_not_bound_to_imported_runtime_site",
    verification.activePointer?.siteVersionId === plan.importedSiteVersionId ? null : "active_pointer_not_imported_version",
    verification.rawArtifactId ? null : "raw_artifact_missing_after_apply",
    verification.rawEntryAssetExists ? null : "raw_entry_asset_missing_after_apply",
    verification.oldRuntimeSiteActivePointerUnchanged ? null : "old_runtime_site_active_pointer_changed",
  ].filter((value): value is string => Boolean(value));

  if (verificationFailures.length > 0) {
    throw new Error(`RECONCILIATION_VERIFICATION_FAILED:${JSON.stringify({ failures: verificationFailures, verification })}`);
  }

  return {
    ok: true,
    mode: "apply",
    plan,
    lifecycleTransitionsApplied,
    ownershipLink,
    governanceReconciliation,
    publishResult,
    hostBindingTransfer,
    verification,
  };
}
