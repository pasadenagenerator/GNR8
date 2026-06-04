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
  linkRuntimeSiteVersionOwnershipIfAllowed,
  resolveActiveArtifactForHostAndPathWithDiagnostics,
  transferRuntimeHostBinding,
  type RuntimeHostBinding,
  type RuntimeOwnershipSiteSummary,
  type RuntimeSiteSummary,
  type RuntimeSiteVersionOwnershipSnapshot,
} from "@/gnr8/runtime/runtime-store";
import { transitionSiteVersionState } from "@/gnr8/runtime/version-lifecycle-enforcer";
import type { RawImportedSiteArtifact, RawTemplateSiteArtifact, RuntimeArtifact, SiteVersionState } from "@/gnr8/runtime/types";

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
  getRawImportedSiteArtifact: typeof getRawImportedSiteArtifact;
  getRawTemplateSiteArtifact: typeof getRawTemplateSiteArtifact;
  getRawTemplateSiteAsset: typeof getRawTemplateSiteAsset;
  linkRuntimeSiteVersionOwnershipIfAllowed: typeof linkRuntimeSiteVersionOwnershipIfAllowed;
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
  getRawImportedSiteArtifact,
  getRawTemplateSiteArtifact,
  getRawTemplateSiteAsset,
  linkRuntimeSiteVersionOwnershipIfAllowed,
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

  const [importedRuntimeSite, currentPublicRuntimeSite, currentActivePointer, rawImportedArtifact, rawTemplateArtifact, runtimeArtifact] =
    await Promise.all([
      importedVersion?.siteId ? resolvedDeps.getRuntimeSiteSummary(importedVersion.siteId) : Promise.resolve(null),
      currentHostBinding?.siteId ? resolvedDeps.getRuntimeSiteSummary(currentHostBinding.siteId) : Promise.resolve(null),
      currentHostBinding?.siteId ? resolvedDeps.getActivePointerForSite(currentHostBinding.siteId) : Promise.resolve(null),
      importedSiteVersionId ? resolvedDeps.getRawImportedSiteArtifact(importedSiteVersionId) : Promise.resolve(null),
      importedSiteVersionId ? resolvedDeps.getRawTemplateSiteArtifact(importedSiteVersionId) : Promise.resolve(null),
      importedVersion?.artifactId ? resolvedDeps.getArtifactById(importedVersion.artifactId) : Promise.resolve(null),
    ]);
  const rawArtifact = rawImportedArtifact ?? rawTemplateArtifact;

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
    publishResult,
    hostBindingTransfer,
    verification,
  };
}
