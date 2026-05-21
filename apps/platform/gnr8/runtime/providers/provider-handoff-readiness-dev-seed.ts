import { createRuntimeCorrelationKey } from "@/gnr8/runtime/identity/runtime-identity";
import { createAgencyProviderSettings } from "@/gnr8/runtime/providers/agency-provider-settings";
import {
  createProviderExecutionHandoffArtifacts,
  getProviderExecutionHandoffsByCorrelationKey,
} from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-repository";
import type { RuntimeProviderExecutionHandoffArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-execution-handoff-store";
import {
  createProviderOperationApprovalArtifacts,
} from "@/gnr8/runtime/providers/runtime-provider-operation-approval-repository";
import type { RuntimeProviderOperationApprovalArtifactRecord } from "@/gnr8/runtime/providers/runtime-provider-operation-approval-store";
import { createRuntimeProviderOperationBundleFromRequest } from "@/gnr8/runtime/providers/runtime-provider-operation-orchestrator";
import {
  createRuntimeProviderWorkerPickupReadinessEvidence,
  type RuntimeProviderWorkerPickupEvidence,
} from "@/gnr8/runtime/providers/runtime-provider-worker-pickup-readiness";

const DEV_ONLY_LABEL = "DEV_TEST_ONLY_PROVIDER_HANDOFF_SEED";
const DEFAULT_SITE_ID = "dev_readiness_seed_site";
const DEFAULT_SITE_VERSION_ID = "00000000-0000-0000-0000-00000000d365";

export type ProviderHandoffReadinessDevSeedOutput = {
  label: typeof DEV_ONLY_LABEL;
  handoffId: string;
  readinessUiPath: string;
  reusedExisting: boolean;
  correlationKey: string;
  workerPickupEvidence: RuntimeProviderWorkerPickupEvidence;
};

export type ProviderHandoffReadinessDevSeedDependencies = {
  createRuntimeProviderOperationBundleFromRequest: typeof createRuntimeProviderOperationBundleFromRequest;
  createProviderOperationApprovalArtifacts: typeof createProviderOperationApprovalArtifacts;
  createProviderExecutionHandoffArtifacts: typeof createProviderExecutionHandoffArtifacts;
  getProviderExecutionHandoffsByCorrelationKey: typeof getProviderExecutionHandoffsByCorrelationKey;
  createRuntimeProviderWorkerPickupReadinessEvidence: typeof createRuntimeProviderWorkerPickupReadinessEvidence;
};

function ensureDevOrTest(nodeEnv: string): void {
  if (nodeEnv === "production") {
    throw new Error("provider_handoff_readiness_dev_seed_blocked_in_production");
  }
}

function buildDeterministicCorrelationKey(input: { siteId: string; siteVersionId: string }): string {
  return createRuntimeCorrelationKey({
    seedType: "provider_handoff_readiness_ui_dev_seed",
    providerId: "openprovider",
    environment: "sandbox",
    capability: "dns",
    operationKind: "upsert_dns_record",
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
  });
}

function readinessUiPath(handoffId: string): string {
  return `/gnr8/admin/provider-handoffs/${encodeURIComponent(handoffId)}/readiness`;
}

function mapSeedOutput(input: {
  handoff: RuntimeProviderExecutionHandoffArtifactRecord;
  reusedExisting: boolean;
  createRuntimeProviderWorkerPickupReadinessEvidence: typeof createRuntimeProviderWorkerPickupReadinessEvidence;
}): ProviderHandoffReadinessDevSeedOutput {
  const workerPickupEvidence = input.createRuntimeProviderWorkerPickupReadinessEvidence({
    handoffArtifact: input.handoff,
    executionIntent: "control_plane_simulation_only",
  });

  return {
    label: DEV_ONLY_LABEL,
    handoffId: input.handoff.handoffId,
    readinessUiPath: readinessUiPath(input.handoff.handoffId),
    reusedExisting: input.reusedExisting,
    correlationKey: input.handoff.correlationKey,
    workerPickupEvidence,
  };
}

export async function createProviderHandoffReadinessDevSeed(
  input: {
    nodeEnv?: string;
    siteId?: string;
    siteVersionId?: string;
    allowProduction?: boolean;
  } = {},
  deps: Partial<ProviderHandoffReadinessDevSeedDependencies> = {},
): Promise<ProviderHandoffReadinessDevSeedOutput> {
  const nodeEnv = String(input.nodeEnv ?? process.env.NODE_ENV ?? "development").trim().toLowerCase();
  if (input.allowProduction !== true) {
    ensureDevOrTest(nodeEnv);
  }

  const resolvedDeps: ProviderHandoffReadinessDevSeedDependencies = {
    createRuntimeProviderOperationBundleFromRequest,
    createProviderOperationApprovalArtifacts,
    createProviderExecutionHandoffArtifacts,
    getProviderExecutionHandoffsByCorrelationKey,
    createRuntimeProviderWorkerPickupReadinessEvidence,
    ...deps,
  };

  const siteId = String(input.siteId ?? DEFAULT_SITE_ID).trim() || DEFAULT_SITE_ID;
  const siteVersionId = String(input.siteVersionId ?? DEFAULT_SITE_VERSION_ID).trim() || DEFAULT_SITE_VERSION_ID;
  const correlationKey = buildDeterministicCorrelationKey({ siteId, siteVersionId });

  const existing = await resolvedDeps.getProviderExecutionHandoffsByCorrelationKey(correlationKey);
  if (existing.length > 0) {
    return mapSeedOutput({
      handoff: existing[0]!,
      reusedExisting: true,
      createRuntimeProviderWorkerPickupReadinessEvidence:
        resolvedDeps.createRuntimeProviderWorkerPickupReadinessEvidence,
    });
  }

  const planned = await resolvedDeps.createRuntimeProviderOperationBundleFromRequest({
    siteId,
    siteVersionId,
    providerCapability: "dns",
    operationKind: "upsert_dns_record",
    executionEnvironment: "sandbox",
    agencyProviderSettings: [
      createAgencyProviderSettings({
        id: "dev_seed_openprovider_sandbox_setting",
        agencyId: "dev_seed_agency",
        providerId: "openprovider",
        environment: "sandbox",
        credentialReference: "dev-seed-openprovider-sandbox",
        enabled: true,
        capabilities: ["dns", "domains"],
        createdAt: "2026-05-21T00:00:00.000Z",
        updatedAt: "2026-05-21T00:00:00.000Z",
      }),
    ],
  });

  const persistedAt = new Date().toISOString();
  const approval: RuntimeProviderOperationApprovalArtifactRecord = {
    ...planned.approvalArtifact,
    createdAt: persistedAt,
    updatedAt: persistedAt,
  };
  const handoff: RuntimeProviderExecutionHandoffArtifactRecord = {
    ...planned.handoffArtifact,
    correlationKey,
    createdAt: persistedAt,
    updatedAt: persistedAt,
  };

  await resolvedDeps.createProviderOperationApprovalArtifacts([approval]);
  await resolvedDeps.createProviderExecutionHandoffArtifacts([handoff]);

  const afterPersist = await resolvedDeps.getProviderExecutionHandoffsByCorrelationKey(correlationKey);
  const persistedHandoff = afterPersist[0];
  if (!persistedHandoff) {
    throw new Error("provider_handoff_readiness_dev_seed_persist_failed");
  }

  return mapSeedOutput({
    handoff: persistedHandoff,
    reusedExisting: false,
    createRuntimeProviderWorkerPickupReadinessEvidence:
      resolvedDeps.createRuntimeProviderWorkerPickupReadinessEvidence,
  });
}
