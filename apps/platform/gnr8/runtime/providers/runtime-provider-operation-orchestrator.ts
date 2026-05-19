import { DNS_PROVIDER_CAPABILITIES, type DnsProviderId } from "@/gnr8/runtime/dns/dns-provider-types";
import { getDnsProviderAdapter, assertDnsProviderAdapterContract } from "@/gnr8/runtime/dns/provider-adapter-registry";
import { evaluateProviderCredentialBoundary } from "@/gnr8/runtime/dns/provider-credentials-boundary";
import { evaluateProviderExecutionGate } from "@/gnr8/runtime/dns/provider-execution-gate";
import { evaluateDnsProviderImplementationReadiness } from "@/gnr8/runtime/dns/provider-implementation-readiness";
import type { RuntimeDnsReadinessPlan } from "@/gnr8/runtime/dns/runtime-dns-readiness-plan";
import type { RuntimeDomainLifecyclePlan } from "@/gnr8/runtime/domains/runtime-domain-lifecycle";
import { createRuntimeDomainExecutionDryRun } from "@/gnr8/runtime/domains/runtime-domain-execution-dry-run";
import {
  createRuntimeDomainExecutionIntent,
  type RuntimeDomainExecutionActionKind,
} from "@/gnr8/runtime/domains/runtime-domain-execution-intent";
import { createRuntimeProviderJobPlan } from "@/gnr8/runtime/provider-jobs/runtime-provider-job-planner";
import type { RuntimeProviderJob } from "@/gnr8/runtime/provider-jobs/runtime-provider-job-types";
import type {
  AgencyProviderCapability,
  AgencyProviderEnvironment,
  AgencyProviderSettings,
} from "@/gnr8/runtime/providers/agency-provider-settings";
import type { ProviderCredentialReference } from "@/gnr8/runtime/providers/provider-credential-reference";
import { resolveProviderCredentialReference } from "@/gnr8/runtime/providers/provider-credential-resolution";
import { resolveAgencyProviderSelection } from "@/gnr8/runtime/providers/agency-provider-selection";
import { createRuntimeProviderOperationBundle, type RuntimeProviderOperationBundle } from "@/gnr8/runtime/providers/runtime-provider-operation-bundle";
import { resolveRuntimeProviderCommunication } from "@/gnr8/runtime/providers/runtime-provider-communicator";

type CreateRuntimeProviderOperationBundleFromRequestInput = {
  siteId: string;
  siteVersionId?: string;
  providerCapability: AgencyProviderCapability;
  operationKind: RuntimeDomainExecutionActionKind;
  agencyProviderSettings: AgencyProviderSettings[];
  executionEnvironment: AgencyProviderEnvironment;
  credentialReferences?: ProviderCredentialReference[];
};

function toDnsProviderId(providerId: string): DnsProviderId {
  return providerId as DnsProviderId;
}

function createSyntheticLifecyclePlan(operationKind: RuntimeDomainExecutionActionKind): RuntimeDomainLifecyclePlan {
  const lifecycleActionByOperation: Partial<Record<RuntimeDomainExecutionActionKind, RuntimeDomainLifecyclePlan["nextRecommendedActions"][number]>> = {
    check_domain_availability: "check_domain_availability",
    purchase_domain: "purchase_domain",
    create_dns_zone: "configure_dns_records",
    verify_dns_record: "verify_domain_ownership",
    activate_domain_binding: "attach_domain_binding",
  };

  const lifecycleAction = lifecycleActionByOperation[operationKind];
  return {
    intent: "connect_existing_domain",
    providerId: "manual",
    currentStage: "requested",
    nextRecommendedActions: lifecycleAction ? [lifecycleAction] : [],
    blockers: [],
    warnings: [],
    statusReport: {
      hasDomainSignals: true,
      hasCustomDomain: true,
      hasActiveDomainBinding: false,
      hasDnsPlan: true,
      hasPendingDnsWork: true,
      hasVerifiedSignals: false,
    },
    correlationKey: `synthetic_lifecycle:${operationKind}`,
  };
}

function createSyntheticDnsPlan(input: {
  siteId: string;
  providerId: DnsProviderId;
  operationKind: RuntimeDomainExecutionActionKind;
}): RuntimeDnsReadinessPlan {
  const domain = `${input.siteId}.example.test`;
  const plannedRecords =
    input.operationKind === "upsert_dns_record"
      ? [
          {
            intent: "verification_txt" as const,
            domain,
            host: "_acme-challenge",
            name: `_acme-challenge.${domain}`,
            type: "txt" as const,
            value: "runtime-provider-orchestrator",
            ttlSeconds: 60,
          },
        ]
      : [];

  const requiredManualSteps =
    input.operationKind === "manual_instruction"
      ? ["execute_manual_dns_instruction"]
      : [];

  return {
    siteId: input.siteId,
    providerId: input.providerId,
    domainReadinessStatus: "ready",
    plannedRecords,
    requiredManualSteps,
    warnings: [],
    blockers: [],
    correlationKey: `synthetic_dns:${input.siteId}:${input.providerId}:${input.operationKind}`,
  };
}

function createRuntimeDomainProviderSelection(providerId: DnsProviderId) {
  return {
    selectedProviderId: providerId,
    selectionStatus: providerId === "manual" ? ("manual_required" as const) : ("selected" as const),
    providerCandidates: [{ providerId, compatible: true, reasons: [] }],
    warnings: [],
    blockers: [],
    correlationKey: `synthetic_provider_selection:${providerId}`,
  };
}

function createProviderExecutionGate(input: {
  providerId: DnsProviderId;
  environment: AgencyProviderEnvironment;
  dryRun: ReturnType<typeof createRuntimeDomainExecutionDryRun>;
  providerAdapterContractReport: Awaited<ReturnType<typeof assertDnsProviderAdapterContract>>;
}) {
  const credentialBoundary = evaluateProviderCredentialBoundary({
    providerId: input.providerId,
    environment: input.environment,
    availableCredentialNames: [],
    credentialValuesByName: {},
  });

  const readiness = evaluateDnsProviderImplementationReadiness({
    providerId: input.providerId,
    capability: DNS_PROVIDER_CAPABILITIES[input.providerId] ?? null,
    adapter: getDnsProviderAdapter(input.providerId),
    contractReport: input.providerAdapterContractReport ?? null,
  });

  return evaluateProviderExecutionGate({
    dryRun: input.dryRun,
    credentialBoundary,
    providerReadiness: readiness,
    requestedEnvironment: input.environment,
  });
}

function createRuntimeProviderJobs(input: {
  siteVersionId?: string;
  dryRun: ReturnType<typeof createRuntimeDomainExecutionDryRun>;
  executionGate: ReturnType<typeof createProviderExecutionGate>;
  environment: AgencyProviderEnvironment;
}): RuntimeProviderJob[] {
  return createRuntimeProviderJobPlan({
    dryRun: input.dryRun,
    executionGate: input.executionGate,
    environment: input.environment,
    siteVersionId: input.siteVersionId,
  });
}

function resolveSelectedProviderSetting(input: {
  agencyProviderSettings: AgencyProviderSettings[];
  selectedProviderId: AgencyProviderSettings["providerId"];
  selectedEnvironment: AgencyProviderSettings["environment"];
  providerCapability: AgencyProviderCapability;
}): AgencyProviderSettings | null {
  const candidates = input.agencyProviderSettings.filter(
    (entry) =>
      entry.enabled &&
      entry.providerId === input.selectedProviderId &&
      entry.environment === input.selectedEnvironment &&
      entry.capabilities.includes(input.providerCapability),
  );

  if (candidates.length === 0) return null;
  return [...candidates].sort((left, right) => left.id.localeCompare(right.id))[0] ?? null;
}

function resolveMatchedCredentialReference(input: {
  setting: AgencyProviderSettings;
  credentialReferences?: ProviderCredentialReference[];
}): ProviderCredentialReference | null {
  const referenceKey = input.setting.credentialReference?.trim() ?? "";
  if (!referenceKey) return null;

  return (
    input.credentialReferences?.find(
      (reference) =>
        reference.providerId === input.setting.providerId &&
        reference.environment === input.setting.environment &&
        reference.referenceKey === referenceKey,
    ) ?? null
  );
}

export async function createRuntimeProviderOperationBundleFromRequest(
  input: CreateRuntimeProviderOperationBundleFromRequestInput,
): Promise<RuntimeProviderOperationBundle> {
  const providerSelection = resolveAgencyProviderSelection({
    agencyProviderSettings: input.agencyProviderSettings,
    requiredCapability: input.providerCapability,
    preferredEnvironment: input.executionEnvironment,
  });

  const selectedProviderSetting =
    resolveSelectedProviderSetting({
      agencyProviderSettings: input.agencyProviderSettings,
      selectedProviderId: providerSelection.selectedProviderId,
      selectedEnvironment: providerSelection.environment,
      providerCapability: input.providerCapability,
    }) ??
    {
      id: "synthetic_selected_provider_setting",
      agencyId: "synthetic_agency",
      providerId: providerSelection.selectedProviderId,
      environment: providerSelection.environment,
      credentialReference: undefined,
      enabled: true,
      capabilities: [input.providerCapability],
      correlationKey: "synthetic_selected_provider_setting",
      createdAt: "1970-01-01T00:00:00.000Z",
      updatedAt: "1970-01-01T00:00:00.000Z",
    };

  const credentialResolution = resolveProviderCredentialReference({
    settings: selectedProviderSetting,
    credentialReference: resolveMatchedCredentialReference({
      setting: selectedProviderSetting,
      credentialReferences: input.credentialReferences,
    }),
  });

  const communicatorResult = resolveRuntimeProviderCommunication({
    providerId: providerSelection.selectedProviderId,
    environment: providerSelection.environment,
    capability: input.providerCapability,
    operationKind: input.operationKind,
  });

  const lifecyclePlan = createSyntheticLifecyclePlan(input.operationKind);
  const dnsReadinessPlan = createSyntheticDnsPlan({
    siteId: input.siteId,
    providerId: toDnsProviderId(providerSelection.selectedProviderId),
    operationKind: input.operationKind,
  });
  const runtimeDomainProviderSelection = createRuntimeDomainProviderSelection(toDnsProviderId(providerSelection.selectedProviderId));

  const executionIntent = createRuntimeDomainExecutionIntent({
    lifecyclePlan,
    dnsReadinessPlan,
    providerSelection: runtimeDomainProviderSelection,
  });

  const providerAdapterContractReport = await assertDnsProviderAdapterContract(providerSelection.selectedProviderId);
  const executionDryRun = createRuntimeDomainExecutionDryRun({
    intent: executionIntent,
    providerAdapterContractReport,
  });

  const executionGate = createProviderExecutionGate({
    providerId: toDnsProviderId(providerSelection.selectedProviderId),
    environment: input.executionEnvironment,
    dryRun: executionDryRun,
    providerAdapterContractReport,
  });

  const plannedJobs = createRuntimeProviderJobs({
    siteVersionId: input.siteVersionId,
    dryRun: executionDryRun,
    executionGate,
    environment: input.executionEnvironment,
  });

  return createRuntimeProviderOperationBundle({
    siteId: input.siteId,
    siteVersionId: input.siteVersionId,
    providerId: providerSelection.selectedProviderId,
    environment: providerSelection.environment,
    capability: input.providerCapability,
    operationKind: input.operationKind,
    providerSelection,
    credentialResolution,
    communicatorResult,
    executionIntent,
    executionDryRun,
    executionGate,
    plannedJobs,
  });
}
