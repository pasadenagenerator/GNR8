import type {
  getActivePointerForSite,
  getPreviewHostBindingForHost,
  getSiteVersionArtifactBinding,
  upsertPreviewHostBinding,
  RuntimePreviewHostBinding,
} from "@/gnr8/runtime/runtime-store";

export const AIRSHIP_PREVIEW_HOST_BINDING_SERVICE_VERSION = "airship-21-preview-host-binding:v1" as const;
export const AIRSHIP_PREVIEW_HOST_ROOT = "app.pasadenagenerator.com" as const;

export type AirshipPreviewHostStatusTone = "good" | "warn" | "neutral";

export type AirshipPreviewHostReadback = {
  serviceVersion: typeof AIRSHIP_PREVIEW_HOST_BINDING_SERVICE_VERSION;
  label: "GNR8 demo preview, not live";
  candidateSiteVersionId: string;
  candidateArtifactId: string;
  suggestedHostname: string;
  previewUrl: string;
  binding: RuntimePreviewHostBinding | null;
  bindingStatus: {
    label: string;
    detail: string;
    tone: AirshipPreviewHostStatusTone;
  };
  activePointerStatus: {
    siteVersionId: string | null;
    artifactId: string | null;
    label: string;
    detail: string;
    tone: AirshipPreviewHostStatusTone;
  };
  externalSourceDomainStatus: {
    url: string | null;
    host: string | null;
    label: string;
    detail: string;
    tone: AirshipPreviewHostStatusTone;
  };
  action: {
    enabled: boolean;
    endpoint: "/api/gnr8/admin/airship/single-site/preview-host-binding";
    actionMode: "create_gnr8_demo_preview_host";
    disabledReason: string | null;
  };
};

export type AirshipPreviewHostBindingOutput = {
  serviceVersion: typeof AIRSHIP_PREVIEW_HOST_BINDING_SERVICE_VERSION;
  status: "created" | "reused";
  binding: RuntimePreviewHostBinding;
  previewUrl: string;
  activationNotice: "Preview host binding created. Vercel/domain activation required." | null;
  mutationFlags: {
    previewHostBindingMutation: boolean;
    activePointerMutation: false;
    publishes: false;
    customerDomainMutation: false;
    providerCall: false;
  };
};

type RuntimeDeps = {
  getSiteVersionArtifactBinding: typeof getSiteVersionArtifactBinding;
  getPreviewHostBindingForHost: typeof getPreviewHostBindingForHost;
  getActivePointerForSite: typeof getActivePointerForSite;
  upsertPreviewHostBinding: typeof upsertPreviewHostBinding;
};

const DEFAULT_DEPS: RuntimeDeps = {
  async getSiteVersionArtifactBinding(...args) {
    const mod = await import("@/gnr8/runtime/runtime-store");
    return mod.getSiteVersionArtifactBinding(...args);
  },
  async getPreviewHostBindingForHost(...args) {
    const mod = await import("@/gnr8/runtime/runtime-store");
    return mod.getPreviewHostBindingForHost(...args);
  },
  async getActivePointerForSite(...args) {
    const mod = await import("@/gnr8/runtime/runtime-store");
    return mod.getActivePointerForSite(...args);
  },
  async upsertPreviewHostBinding(...args) {
    const mod = await import("@/gnr8/runtime/runtime-store");
    return mod.upsertPreviewHostBinding(...args);
  },
};

function text(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function hostFromUrl(value: string | null | undefined): string | null {
  const normalized = text(value);
  if (!normalized) return null;
  try {
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return normalized.replace(/^https?:\/\//i, "").split(/[/?#]/)[0]?.trim().toLowerCase() || null;
  }
}

function slugPart(value: string): string {
  const normalized = value
    .toLocaleLowerCase("en-US")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^www\./, "")
    .replace(/\.[a-z0-9.-]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "imported-site";
}

export function suggestedAirshipPreviewHost(input: {
  siteLabel?: string | null;
  sourceUrl?: string | null;
  liveUrl?: string | null;
}): string {
  const label = text(input.siteLabel) ?? hostFromUrl(input.sourceUrl) ?? hostFromUrl(input.liveUrl) ?? "imported-site";
  return `${slugPart(label)}-airship.${AIRSHIP_PREVIEW_HOST_ROOT}`;
}

function normalizeHost(value: string): string {
  return value.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
}

function isGnr8PreviewHost(host: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?-airship\.app\.pasadenagenerator\.com$/.test(host);
}

function assertAllowedPreviewHost(host: string): void {
  if (!isGnr8PreviewHost(host)) {
    throw new Error("airship_preview_host_customer_domain_rejected");
  }
}

function previewUrl(host: string): string {
  return `https://${host}/`;
}

function bindingMatchesCandidate(binding: RuntimePreviewHostBinding, input: { siteId: string; candidateSiteVersionId: string; candidateArtifactId: string }): boolean {
  return binding.siteId === input.siteId &&
    binding.candidateSiteVersionId === input.candidateSiteVersionId &&
    binding.candidateArtifactId === input.candidateArtifactId;
}

async function candidateSite(input: {
  candidateSiteVersionId: string;
  candidateArtifactId: string;
  deps: RuntimeDeps;
}): Promise<{ siteId: string; artifactId: string | null }> {
  const version = await input.deps.getSiteVersionArtifactBinding(input.candidateSiteVersionId);
  if (!version) throw new Error("airship_preview_host_candidate_missing");
  if (version.artifactId && version.artifactId !== input.candidateArtifactId) {
    throw new Error("airship_preview_host_candidate_artifact_mismatch");
  }
  return version;
}

export async function readAirshipPreviewHostReadback(input: {
  candidateSiteVersionId: string | null;
  candidateArtifactId: string | null;
  siteLabel?: string | null;
  sourceUrl?: string | null;
  liveUrl?: string | null;
  hostname?: string | null;
}, depsOverride: Partial<RuntimeDeps> = {}): Promise<AirshipPreviewHostReadback | null> {
  const candidateSiteVersionId = text(input.candidateSiteVersionId);
  const candidateArtifactId = text(input.candidateArtifactId);
  if (!candidateSiteVersionId || !candidateArtifactId) return null;
  const deps = { ...DEFAULT_DEPS, ...depsOverride };
  const host = normalizeHost(text(input.hostname) ?? suggestedAirshipPreviewHost(input));
  assertAllowedPreviewHost(host);
  const site = await candidateSite({ candidateSiteVersionId, candidateArtifactId, deps });
  const [binding, activePointer] = await Promise.all([
    deps.getPreviewHostBindingForHost(host),
    deps.getActivePointerForSite(site.siteId),
  ]);
  const matchingBinding = binding && bindingMatchesCandidate(binding, { siteId: site.siteId, candidateSiteVersionId, candidateArtifactId });
  const sourceHost = hostFromUrl(input.liveUrl) ?? hostFromUrl(input.sourceUrl);
  const sourceUrl = text(input.liveUrl) ?? text(input.sourceUrl);

  return {
    serviceVersion: AIRSHIP_PREVIEW_HOST_BINDING_SERVICE_VERSION,
    label: "GNR8 demo preview, not live",
    candidateSiteVersionId,
    candidateArtifactId,
    suggestedHostname: host,
    previewUrl: previewUrl(host),
    binding,
    bindingStatus: matchingBinding
      ? {
          label: `Preview host binding ${binding.status.toLowerCase()}`,
          detail: `Binding ${binding.id} points ${host} to candidate ${candidateSiteVersionId} / artifact ${candidateArtifactId}.`,
          tone: binding.status === "ACTIVE" ? "good" : "warn",
        }
      : binding
        ? {
            label: "Preview host conflict",
            detail: `Host ${host} is already bound to ${binding.candidateSiteVersionId} / ${binding.candidateArtifactId}; creation is blocked.`,
            tone: "warn",
          }
        : {
            label: "Preview host binding missing",
            detail: `No GNR8 preview-host binding exists for ${host}. This does not require or create an active pointer.`,
            tone: "warn",
          },
    activePointerStatus: activePointer
      ? {
          siteVersionId: activePointer.siteVersionId,
          artifactId: activePointer.artifactId,
          label: "Active pointer present",
          detail: `Live pointer remains separate: ${activePointer.siteVersionId} / ${activePointer.artifactId}.`,
          tone: activePointer.siteVersionId === candidateSiteVersionId && activePointer.artifactId === candidateArtifactId ? "warn" : "neutral",
        }
      : {
          siteVersionId: null,
          artifactId: null,
          label: "No active pointer",
          detail: "Preview-host workflow does not require an active/live pointer.",
          tone: "neutral",
        },
    externalSourceDomainStatus: {
      url: sourceUrl,
      host: sourceHost,
      label: sourceHost ? "External customer domain separate" : "External customer domain unknown",
      detail: sourceHost
        ? `${sourceHost} is the customer/source domain and is not mutated by this workflow.`
        : "No customer/source domain was available in the Airship read model.",
      tone: sourceHost ? "neutral" : "warn",
    },
    action: {
      enabled: !binding,
      endpoint: "/api/gnr8/admin/airship/single-site/preview-host-binding",
      actionMode: "create_gnr8_demo_preview_host",
      disabledReason: binding ? "Preview host binding already exists or conflicts; service will not overwrite from the UI." : null,
    },
  };
}

export async function createAirshipPreviewHostBinding(input: {
  candidateSiteVersionId: string;
  candidateArtifactId: string;
  siteLabel?: string | null;
  sourceUrl?: string | null;
  liveUrl?: string | null;
  hostname?: string | null;
}, depsOverride: Partial<RuntimeDeps> = {}): Promise<AirshipPreviewHostBindingOutput> {
  const deps = { ...DEFAULT_DEPS, ...depsOverride };
  const candidateSiteVersionId = text(input.candidateSiteVersionId);
  const candidateArtifactId = text(input.candidateArtifactId);
  if (!candidateSiteVersionId || !candidateArtifactId) throw new Error("airship_preview_host_candidate_required");
  const host = normalizeHost(text(input.hostname) ?? suggestedAirshipPreviewHost(input));
  assertAllowedPreviewHost(host);
  const site = await candidateSite({ candidateSiteVersionId, candidateArtifactId, deps });
  const existing = await deps.getPreviewHostBindingForHost(host);
  if (existing) {
    if (!bindingMatchesCandidate(existing, { siteId: site.siteId, candidateSiteVersionId, candidateArtifactId })) {
      throw new Error("airship_preview_host_existing_binding_mismatch");
    }
    return {
      serviceVersion: AIRSHIP_PREVIEW_HOST_BINDING_SERVICE_VERSION,
      status: "reused",
      binding: existing,
      previewUrl: previewUrl(host),
      activationNotice: existing.status === "ACTIVE" ? null : "Preview host binding created. Vercel/domain activation required.",
      mutationFlags: {
        previewHostBindingMutation: false,
        activePointerMutation: false,
        publishes: false,
        customerDomainMutation: false,
        providerCall: false,
      },
    };
  }

  const binding = await deps.upsertPreviewHostBinding({
    siteId: site.siteId,
    host,
    candidateSiteVersionId,
    candidateArtifactId,
    status: "ACTIVE",
    bindingKind: "candidate_preview",
  });
  return {
    serviceVersion: AIRSHIP_PREVIEW_HOST_BINDING_SERVICE_VERSION,
    status: "created",
    binding,
    previewUrl: previewUrl(host),
    activationNotice: "Preview host binding created. Vercel/domain activation required.",
    mutationFlags: {
      previewHostBindingMutation: true,
      activePointerMutation: false,
      publishes: false,
      customerDomainMutation: false,
      providerCall: false,
    },
  };
}
