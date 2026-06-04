import assert from "node:assert/strict";
import test from "node:test";

import { createReconcileImportedRuntimeRouteHandlers } from "@/app/api/gnr8/admin/hosting-operations/reconcile-imported-runtime/reconcile-imported-runtime-route-handlers";
import {
  applyImportedRuntimeReconciliation,
  createImportedRuntimeReconciliationPlan,
  IMPORTED_RUNTIME_RECONCILIATION_CONFIRM,
  type ImportedRuntimeReconciliationDependencies,
} from "@/gnr8/runtime/imported-runtime-reconciliation";
import type {
  RuntimeHostBinding,
  RuntimeOwnershipSiteSummary,
  RuntimeSiteSummary,
  RuntimeSiteVersionOwnershipSnapshot,
} from "@/gnr8/runtime/runtime-store";
import type { RawImportedSiteArtifact, RuntimeArtifact, SiteVersionState } from "@/gnr8/runtime/types";

const OWNERSHIP_SITE_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_OWNERSHIP_SITE_ID = "00000000-0000-4000-8000-000000000099";
const IMPORTED_SITE_ID = "site_7c77126de646f746b3bd";
const OLD_SITE_ID = "site_old_runtime";
const IMPORTED_VERSION_ID = "88253466-783e-4484-8b68-df6c83b8a11c";
const OLD_VERSION_ID = "11111111-1111-4111-8111-111111111111";
const TARGET_HOST = "maver.app.pasadenagenerator.com";

type FakeState = {
  ownershipSites: Map<string, RuntimeOwnershipSiteSummary>;
  runtimeSites: Map<string, RuntimeSiteSummary>;
  versions: Map<string, RuntimeSiteVersionOwnershipSnapshot>;
  hostBinding: RuntimeHostBinding | null;
  activePointers: Map<string, { siteVersionId: string; artifactId: string }>;
  runtimeArtifacts: Map<string, RuntimeArtifact>;
  rawArtifacts: Map<string, RawImportedSiteArtifact>;
  writes: {
    ownershipLinks: number;
    transitions: Array<{ from: SiteVersionState; to: SiteVersionState }>;
    publishes: number;
    transfers: number;
  };
};

function runtimeArtifact(input: { id: string; siteId: string; siteVersionId: string }): RuntimeArtifact {
  return {
    id: input.id,
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    rendererCompatibilityVersion: "gnr8-renderer-v1",
    htmlByPath: { "/": "<html>runtime artifact</html>" },
    compiledTokenStyles: "",
    assetFingerprintMap: {},
    manifest: {},
    publishStage: "production",
    shadowRestricted: false,
    artifactGovernance: {
      pageGateState: [],
      pageRolloutPolicyState: [],
      pageEnforcementState: { shadow: [], canary: [], production: [] },
      siteGateState: "passed",
      siteRolloutPolicyState: "passed",
      siteEnforcementState: { shadow: "ALLOW", canary: "ALLOW", production: "ALLOW" },
      publishStage: "production",
    },
    bundleSha256: "sha",
    createdAt: "2026-06-01T00:00:00.000Z",
  };
}

function rawArtifact(fileCount = 374): RawImportedSiteArtifact {
  const fileMap: RawImportedSiteArtifact["fileMap"] = {
    "index.html": { path: "index.html", mediaType: "text/html", sizeBytes: 27, sha256: "sha-index" },
  };
  for (let i = 1; i < fileCount; i += 1) {
    const path = `assets/file-${i}.css`;
    fileMap[path] = { path, mediaType: "text/css", sizeBytes: 10, sha256: `sha-${i}` };
  }
  return {
    id: "raw-artifact-imported",
    artifactType: "raw_imported_site",
    siteId: IMPORTED_SITE_ID,
    siteVersionId: IMPORTED_VERSION_ID,
    entryHtmlPath: "index.html",
    assetBasePath: ".",
    fileMap,
    metadata: {
      sourceUrl: "https://maver.example",
      finalUrl: "https://maver.example",
      htmlByteLength: 27,
      diagnostics: { codes: [] },
      assetSummary: { persistedAssetCount: fileCount - 1, externalFallbackAssetCount: 0 },
    },
    createdAt: "2026-06-01T00:00:00.000Z",
  };
}

function createState(overrides: {
  ownershipSiteMissing?: boolean;
  importedOwnershipSiteId?: string | null;
  importedState?: SiteVersionState;
  rawEvidenceMissing?: boolean;
} = {}): FakeState {
  const importedRuntimeArtifact = runtimeArtifact({
    id: "runtime-artifact-imported-existing",
    siteId: IMPORTED_SITE_ID,
    siteVersionId: IMPORTED_VERSION_ID,
  });
  const oldRuntimeArtifact = runtimeArtifact({
    id: "runtime-artifact-old",
    siteId: OLD_SITE_ID,
    siteVersionId: OLD_VERSION_ID,
  });
  const ownershipSites = new Map<string, RuntimeOwnershipSiteSummary>();
  if (!overrides.ownershipSiteMissing) {
    ownershipSites.set(OWNERSHIP_SITE_ID, {
      id: OWNERSHIP_SITE_ID,
      name: "Maver",
      status: "draft",
      domain: TARGET_HOST,
      orgId: "client-1",
      agencyId: "agency-1",
    });
  }

  return {
    ownershipSites,
    runtimeSites: new Map([
      [
        IMPORTED_SITE_ID,
        {
          id: IMPORTED_SITE_ID,
          sourceUrl: "https://maver.example",
          sourceHost: "maver.example",
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      [
        OLD_SITE_ID,
        {
          id: OLD_SITE_ID,
          sourceUrl: "https://old.example",
          sourceHost: TARGET_HOST,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
        },
      ],
    ]),
    versions: new Map([
      [
        IMPORTED_VERSION_ID,
        {
          id: IMPORTED_VERSION_ID,
          siteId: IMPORTED_SITE_ID,
          versionNo: 1,
          state: overrides.importedState ?? "DRAFT",
          artifactId: importedRuntimeArtifact.id,
          ownershipSiteId: overrides.importedOwnershipSiteId ?? null,
          createdAt: "2026-06-01T00:00:00.000Z",
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ],
      [
        OLD_VERSION_ID,
        {
          id: OLD_VERSION_ID,
          siteId: OLD_SITE_ID,
          versionNo: 4,
          state: "PUBLISHED",
          artifactId: oldRuntimeArtifact.id,
          ownershipSiteId: OWNERSHIP_SITE_ID,
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
        },
      ],
    ]),
    hostBinding: {
      id: "host-binding-old",
      siteId: OLD_SITE_ID,
      host: TARGET_HOST,
      status: "ACTIVE",
      bindingKind: "shadow",
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    },
    activePointers: new Map([[OLD_SITE_ID, { siteVersionId: OLD_VERSION_ID, artifactId: oldRuntimeArtifact.id }]]),
    runtimeArtifacts: new Map([
      [importedRuntimeArtifact.id, importedRuntimeArtifact],
      [oldRuntimeArtifact.id, oldRuntimeArtifact],
    ]),
    rawArtifacts: overrides.rawEvidenceMissing ? new Map() : new Map([[IMPORTED_VERSION_ID, rawArtifact()]]),
    writes: { ownershipLinks: 0, transitions: [], publishes: 0, transfers: 0 },
  };
}

function createDeps(state: FakeState): ImportedRuntimeReconciliationDependencies {
  return {
    getOwnershipSiteSummary: async (id) => state.ownershipSites.get(id) ?? null,
    getRuntimeSiteSummary: async (id) => state.runtimeSites.get(id) ?? null,
    getRuntimeSiteVersionOwnershipSnapshot: async (id) => state.versions.get(id) ?? null,
    getActiveHostBindingForHost: async (host) =>
      state.hostBinding?.host.toLowerCase() === String(host).toLowerCase() && state.hostBinding.status === "ACTIVE"
        ? state.hostBinding
        : null,
    getActivePointerForSite: async (siteId) => state.activePointers.get(siteId) ?? null,
    getArtifactById: async (artifactId) => state.runtimeArtifacts.get(artifactId) ?? null,
    getRawImportedSiteArtifact: async (siteVersionId) => state.rawArtifacts.get(siteVersionId) ?? null,
    getRawTemplateSiteArtifact: async () => null,
    getRawTemplateSiteAsset: async (input) => {
      const artifact = state.rawArtifacts.get(input.siteVersionId);
      const file = artifact?.fileMap[input.filePath];
      if (!artifact || !file || input.artifactId !== artifact.id) return null;
      return { mediaType: file.mediaType, sizeBytes: file.sizeBytes, sha256: file.sha256, bytes: Buffer.from("<html>imported raw</html>") };
    },
    linkRuntimeSiteVersionOwnershipIfAllowed: async (input) => {
      state.writes.ownershipLinks += 1;
      const version = state.versions.get(input.siteVersionId);
      if (!version || (version.ownershipSiteId && version.ownershipSiteId !== input.ownershipSiteId)) {
        throw new Error("Runtime site version ownership link denied");
      }
      version.ownershipSiteId = input.ownershipSiteId;
      return version;
    },
    transitionSiteVersionState: async (input) => {
      const version = state.versions.get(input.siteVersionId);
      if (!version) throw new Error("SiteVersion not found");
      state.writes.transitions.push({ from: version.state, to: input.nextState });
      version.state = input.nextState;
      return { previousState: state.writes.transitions.at(-1)!.from, nextState: input.nextState };
    },
    publishApprovedSiteVersion: async (input) => {
      state.writes.publishes += 1;
      const version = state.versions.get(input.siteVersionId);
      if (!version) throw new Error("SiteVersion not found");
      if (version.state !== "APPROVED" && version.state !== "PUBLISHED") {
        throw new Error(`SiteVersion must be APPROVED before publish (current: ${version.state})`);
      }
      const artifactId = "runtime-artifact-imported-published";
      const artifact = runtimeArtifact({ id: artifactId, siteId: version.siteId, siteVersionId: version.id });
      state.runtimeArtifacts.set(artifactId, artifact);
      version.artifactId = artifactId;
      version.state = "PUBLISHED";
      state.activePointers.set(version.siteId, { siteVersionId: version.id, artifactId });
      return {
        siteId: version.siteId,
        siteVersionId: version.id,
        artifactId,
        publishStage: "production",
        shadowRestricted: false,
        enforcement: { decision: "ALLOW" },
        bundleSha256: "sha",
        pointerSwitch: "atomic_site_pointer_reassignment",
        previousActivePointer: null,
        activationOutcome: "atomic_site_pointer_reassignment",
      } as Awaited<ReturnType<ImportedRuntimeReconciliationDependencies["publishApprovedSiteVersion"]>>;
    },
    transferRuntimeHostBinding: async (input) => {
      state.writes.transfers += 1;
      if (!state.hostBinding || state.hostBinding.siteId !== input.fromSiteId) throw new Error("Active runtime host binding source mismatch");
      const previousBinding = { ...state.hostBinding };
      state.hostBinding = {
        ...state.hostBinding,
        id: "host-binding-imported",
        siteId: input.toSiteId,
        bindingKind: String(input.bindingKind ?? state.hostBinding.bindingKind),
        updatedAt: "2026-06-04T00:00:00.000Z",
      };
      return {
        host: TARGET_HOST,
        fromSiteId: input.fromSiteId,
        toSiteId: input.toSiteId,
        transferred: input.fromSiteId !== input.toSiteId,
        previousBinding,
        newBinding: state.hostBinding,
      };
    },
    resolveActiveArtifactForHostAndPathWithDiagnostics: async (input) => {
      const binding = state.hostBinding?.host.toLowerCase() === String(input.host ?? "").toLowerCase() ? state.hostBinding : null;
      const activePointer = binding ? state.activePointers.get(binding.siteId) : null;
      if (!binding || !activePointer) {
        return {
          outcome: "artifact_miss",
          host: String(input.host ?? ""),
          path: input.path,
          normalizedPath: "/",
          siteId: binding?.siteId ?? null,
          siteResolution: "none",
          hostBindingId: binding?.id ?? null,
          hostBindingKind: binding?.bindingKind ?? null,
          hostBindingStatus: binding?.status ?? null,
          domain: null,
          domainBindingId: null,
          domainBindingStatus: null,
          legacyDomainSiteVersionId: null,
          diagnostics: [],
          activeSiteVersionId: activePointer?.siteVersionId ?? null,
          artifactId: activePointer?.artifactId ?? null,
          reasonCode: "no_active_pointer",
        } as Awaited<ReturnType<ImportedRuntimeReconciliationDependencies["resolveActiveArtifactForHostAndPathWithDiagnostics"]>>;
      }
      return {
        outcome: "artifact_hit",
        host: String(input.host ?? ""),
        path: input.path,
        normalizedPath: "/",
        siteId: binding.siteId,
        siteResolution: "host_match",
        hostBindingId: binding.id,
        hostBindingKind: binding.bindingKind,
        hostBindingStatus: binding.status,
        domain: null,
        domainBindingId: null,
        domainBindingStatus: null,
        legacyDomainSiteVersionId: null,
        diagnostics: [],
        activeSiteVersionId: activePointer.siteVersionId,
        artifactId: activePointer.artifactId,
        artifact: state.runtimeArtifacts.get(activePointer.artifactId)!,
        html: "<html>runtime artifact</html>",
        resolvedPath: "/",
      } as Awaited<ReturnType<ImportedRuntimeReconciliationDependencies["resolveActiveArtifactForHostAndPathWithDiagnostics"]>>;
    },
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return {
    mode: "dry_run" as const,
    ownershipSiteId: OWNERSHIP_SITE_ID,
    importedSiteVersionId: IMPORTED_VERSION_ID,
    targetHost: TARGET_HOST,
    ...overrides,
  };
}

test("reconcile imported runtime dry-run returns plan and performs no writes", async () => {
  const state = createState();
  const plan = await createImportedRuntimeReconciliationPlan(input(), createDeps(state));

  assert.equal(plan.importedRuntimeSiteId, IMPORTED_SITE_ID);
  assert.equal(plan.importedSiteVersionId, IMPORTED_VERSION_ID);
  assert.equal(plan.importedVersionState, "DRAFT");
  assert.equal(plan.importedRawFileCount, 374);
  assert.equal(plan.importedArtifactIds.rawArtifactId, "raw-artifact-imported");
  assert.equal(plan.currentOwnershipSite?.id, OWNERSHIP_SITE_ID);
  assert.equal(plan.currentHostBinding?.siteId, OLD_SITE_ID);
  assert.equal(plan.currentPublicRuntimeSite?.id, OLD_SITE_ID);
  assert.equal(plan.currentActiveVersionArtifact.siteVersionId, OLD_VERSION_ID);
  assert.equal(plan.proposedOwnershipLink.action, "link");
  assert.deepEqual(plan.proposedLifecycleTransitions, [
    { from: "DRAFT", to: "READY_FOR_REVIEW" },
    { from: "READY_FOR_REVIEW", to: "APPROVED" },
  ]);
  assert.equal(plan.proposedHostBindingTransfer.action, "transfer");
  assert.equal(plan.blockers.length, 0);
  assert.deepEqual(state.writes, { ownershipLinks: 0, transitions: [], publishes: 0, transfers: 0 });
});

test("reconcile imported runtime dry-run detects missing ownership site", async () => {
  const state = createState({ ownershipSiteMissing: true });
  const plan = await createImportedRuntimeReconciliationPlan(input(), createDeps(state));

  assert.equal(plan.blockers.some((blocker) => blocker.code === "OWNERSHIP_SITE_NOT_FOUND"), true);
});

test("reconcile imported runtime dry-run detects imported version already linked elsewhere", async () => {
  const state = createState({ importedOwnershipSiteId: OTHER_OWNERSHIP_SITE_ID });
  const plan = await createImportedRuntimeReconciliationPlan(input(), createDeps(state));

  assert.equal(plan.blockers.some((blocker) => blocker.code === "IMPORTED_VERSION_LINKED_ELSEWHERE"), true);
  assert.equal(plan.proposedOwnershipLink.action, "blocked");
});

test("reconcile imported runtime dry-run detects missing raw artifact evidence", async () => {
  const state = createState({ rawEvidenceMissing: true });
  const plan = await createImportedRuntimeReconciliationPlan(input(), createDeps(state));

  assert.equal(plan.blockers.some((blocker) => blocker.code === "RAW_ARTIFACT_EVIDENCE_MISSING"), true);
  assert.equal(plan.importedRawFileCount, 0);
});

test("reconcile imported runtime apply links ownership", async () => {
  const state = createState();
  await applyImportedRuntimeReconciliation(
    input({ mode: "apply", apply: true, confirm: IMPORTED_RUNTIME_RECONCILIATION_CONFIRM }),
    createDeps(state),
  );

  assert.equal(state.writes.ownershipLinks, 1);
  assert.equal(state.versions.get(IMPORTED_VERSION_ID)?.ownershipSiteId, OWNERSHIP_SITE_ID);
});

test("reconcile imported runtime apply publishes imported version using publish activation", async () => {
  const state = createState();
  const result = await applyImportedRuntimeReconciliation(
    input({ mode: "apply", apply: true, confirm: IMPORTED_RUNTIME_RECONCILIATION_CONFIRM }),
    createDeps(state),
  );

  assert.equal(state.writes.publishes, 1);
  assert.equal(result.publishResult.siteVersionId, IMPORTED_VERSION_ID);
  assert.equal(state.versions.get(IMPORTED_VERSION_ID)?.state, "PUBLISHED");
});

test("reconcile imported runtime apply transfers host binding", async () => {
  const state = createState();
  const result = await applyImportedRuntimeReconciliation(
    input({ mode: "apply", apply: true, confirm: IMPORTED_RUNTIME_RECONCILIATION_CONFIRM }),
    createDeps(state),
  );

  assert.equal(state.writes.transfers, 1);
  assert.equal(result.hostBindingTransfer.fromSiteId, OLD_SITE_ID);
  assert.equal(result.hostBindingTransfer.toSiteId, IMPORTED_SITE_ID);
  assert.equal(state.hostBinding?.siteId, IMPORTED_SITE_ID);
});

test("reconcile imported runtime apply verifies final host runtime site active pointer chain", async () => {
  const state = createState();
  const result = await applyImportedRuntimeReconciliation(
    input({ mode: "apply", apply: true, confirm: IMPORTED_RUNTIME_RECONCILIATION_CONFIRM }),
    createDeps(state),
  );

  assert.equal(result.verification.targetHostRuntimeSiteId, IMPORTED_SITE_ID);
  assert.equal(result.verification.activePointer?.siteVersionId, IMPORTED_VERSION_ID);
  assert.equal(result.verification.rawArtifactId, "raw-artifact-imported");
  assert.equal(result.verification.publicRuntimeWouldServeImportedRawTemplatePath, true);
});

test("reconcile imported runtime apply leaves old runtime site active pointer intact", async () => {
  const state = createState();
  const before = state.activePointers.get(OLD_SITE_ID);
  const result = await applyImportedRuntimeReconciliation(
    input({ mode: "apply", apply: true, confirm: IMPORTED_RUNTIME_RECONCILIATION_CONFIRM }),
    createDeps(state),
  );

  assert.deepEqual(state.activePointers.get(OLD_SITE_ID), before);
  assert.equal(result.verification.oldRuntimeSiteActivePointerUnchanged, true);
  assert.equal(state.runtimeSites.has(OLD_SITE_ID), true);
  assert.equal(state.versions.has(OLD_VERSION_ID), true);
});

test("reconcile imported runtime route apply requires confirm string", async () => {
  const handlers = createReconcileImportedRuntimeRouteHandlers({
    requireSuperadminUserId: async () => "superadmin_1",
    createImportedRuntimeReconciliationPlan,
    applyImportedRuntimeReconciliation,
    reconciliationDeps: createDeps(createState()),
  });
  const response = await handlers.POST(
    new Request("http://localhost/api/gnr8/admin/hosting-operations/reconcile-imported-runtime", {
      method: "POST",
      body: JSON.stringify(input({ mode: "apply", apply: true })),
    }),
  );

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, "CONFIRMATION_REQUIRED");
});

test("reconcile imported runtime route is superadmin-only", async () => {
  const handlers = createReconcileImportedRuntimeRouteHandlers({
    requireSuperadminUserId: async () => {
      throw new Error("Forbidden: superadmin only");
    },
  });
  const response = await handlers.POST(
    new Request("http://localhost/api/gnr8/admin/hosting-operations/reconcile-imported-runtime", {
      method: "POST",
      body: JSON.stringify(input()),
    }),
  );

  assert.equal(response.status, 403);
  const body = (await response.json()) as { error: string };
  assert.equal(body.error, "Forbidden: superadmin only");
});
