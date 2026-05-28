export type ProviderId = "openprovider" | "realtime_register" | "inwx" | "netim";
export type ProviderType = "registrar";
export type ProviderEnvironment = "sandbox" | "unknown";
export type ProviderStatus = "connected" | "not_configured";
export type CapabilityKey = "domains" | "dns" | "availability" | "registration" | "execution";

export type ProviderContractAdvisorCard = {
  title: "Current State" | "Current Limitations" | "Missing Requirements" | "Recommended Next Step";
  items: readonly string[];
};

export type ProviderContractLinks = {
  cockpit: string;
  domains: string;
  dns: string;
};

export type ProviderContract = {
  providerId: ProviderId;
  displayName: "Openprovider" | "Realtime Register" | "INWX" | "Netim";
  providerType: ProviderType;
  environment: ProviderEnvironment;
  status: ProviderStatus;
  capabilities: Readonly<Record<CapabilityKey, boolean>>;
  readiness: readonly ["not_configured" | "sandbox_verified", "control_plane_only" | "sandbox_verified"];
  boundaries: readonly ["execution_blocked", "read_only"];
  advisor: readonly ProviderContractAdvisorCard[];
  links?: ProviderContractLinks;
};

const OPENPROVIDER_PROVIDER_CONTRACT: ProviderContract = {
  providerId: "openprovider",
  displayName: "Openprovider",
  providerType: "registrar",
  environment: "sandbox",
  status: "connected",
  capabilities: {
    domains: true,
    dns: true,
    availability: true,
    registration: false,
    execution: false,
  },
  readiness: ["sandbox_verified", "sandbox_verified"],
  boundaries: ["execution_blocked", "read_only"],
  advisor: [
    {
      title: "Current State",
      items: ["provider connected", "sandbox inventory operational", "navigation wiring operational"],
    },
    {
      title: "Current Limitations",
      items: ["read-only inventory mode", "registration intentionally disabled"],
    },
    {
      title: "Missing Requirements",
      items: ["execution governance", "production verification"],
    },
    {
      title: "Recommended Next Step",
      items: ["keep control-plane read model canonical", "add second provider contract"],
    },
  ],
  links: {
    cockpit: "/gnr8/admin/providers/openprovider",
    domains: "/gnr8/admin/providers/openprovider/domains",
    dns: "/gnr8/admin/providers/openprovider/dns",
  },
};

const REALTIME_REGISTER_PROVIDER_CONTRACT: ProviderContract = {
  providerId: "realtime_register",
  displayName: "Realtime Register",
  providerType: "registrar",
  environment: "unknown",
  status: "not_configured",
  capabilities: {
    domains: false,
    dns: false,
    availability: false,
    registration: false,
    execution: false,
  },
  readiness: ["not_configured", "control_plane_only"],
  boundaries: ["execution_blocked", "read_only"],
  advisor: [
    {
      title: "Current State",
      items: ["provider placeholder initialized", "orchestration contract compatible"],
    },
    {
      title: "Current Limitations",
      items: ["no credentials configured", "no provider APIs connected"],
    },
    {
      title: "Missing Requirements",
      items: ["provider auth layer", "provider capability normalization", "sandbox verification"],
    },
    {
      title: "Recommended Next Step",
      items: ["implement read-only provider inventory", "validate provider contract compatibility"],
    },
  ],
};

const INWX_PROVIDER_CONTRACT: ProviderContract = {
  providerId: "inwx",
  displayName: "INWX",
  providerType: "registrar",
  environment: "unknown",
  status: "not_configured",
  capabilities: {
    domains: false,
    dns: false,
    availability: false,
    registration: false,
    execution: false,
  },
  readiness: ["not_configured", "control_plane_only"],
  boundaries: ["execution_blocked", "read_only"],
  advisor: [
    {
      title: "Current State",
      items: ["provider placeholder initialized", "contract registered"],
    },
    {
      title: "Current Limitations",
      items: ["no credentials configured", "no provider APIs connected"],
    },
    {
      title: "Missing Requirements",
      items: ["provider auth layer", "capability normalization"],
    },
    {
      title: "Recommended Next Step",
      items: ["implement inventory adapters", "validate compatibility"],
    },
  ],
};

const NETIM_PROVIDER_CONTRACT: ProviderContract = {
  providerId: "netim",
  displayName: "Netim",
  providerType: "registrar",
  environment: "unknown",
  status: "not_configured",
  capabilities: {
    domains: false,
    dns: false,
    availability: false,
    registration: false,
    execution: false,
  },
  readiness: ["not_configured", "control_plane_only"],
  boundaries: ["execution_blocked", "read_only"],
  advisor: [
    {
      title: "Current State",
      items: ["provider placeholder initialized", "contract registered"],
    },
    {
      title: "Current Limitations",
      items: ["no credentials configured", "no provider APIs connected"],
    },
    {
      title: "Missing Requirements",
      items: ["provider auth layer", "capability normalization"],
    },
    {
      title: "Recommended Next Step",
      items: ["implement inventory adapters", "validate compatibility"],
    },
  ],
};

export const PROVIDER_CONTRACT_REGISTRY = [
  OPENPROVIDER_PROVIDER_CONTRACT,
  REALTIME_REGISTER_PROVIDER_CONTRACT,
  INWX_PROVIDER_CONTRACT,
  NETIM_PROVIDER_CONTRACT,
] as const satisfies readonly ProviderContract[];

export const PROVIDER_CONTRACT_BY_ID: Readonly<Record<ProviderId, ProviderContract>> = {
  openprovider: OPENPROVIDER_PROVIDER_CONTRACT,
  realtime_register: REALTIME_REGISTER_PROVIDER_CONTRACT,
  inwx: INWX_PROVIDER_CONTRACT,
  netim: NETIM_PROVIDER_CONTRACT,
};
