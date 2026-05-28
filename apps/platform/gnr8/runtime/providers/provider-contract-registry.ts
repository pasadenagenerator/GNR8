export type ProviderId =
  | "openprovider"
  | "realtime_register"
  | "inwx"
  | "netim"
  | "vercel"
  | "netlify"
  | "cloudflare"
  | "railway"
  | "stripe"
  | "paddle"
  | "polar"
  | "inngest"
  | "trigger_dev"
  | "temporal"
  | "github"
  | "gitlab"
  | "openai"
  | "anthropic"
  | "gemini"
  | "groq"
  | "mistral"
  | "supabase"
  | "r2"
  | "s3"
  | "clerk"
  | "auth0"
  | "supabase_auth";

export type ProviderCategory =
  | "registrar"
  | "deployment"
  | "commerce"
  | "execution"
  | "source_control"
  | "ai"
  | "storage"
  | "identity";

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
  displayName: string;
  providerType: "registrar";
  providerCategory: ProviderCategory;
  environment: ProviderEnvironment;
  status: ProviderStatus;
  capabilities: Readonly<Record<CapabilityKey, boolean>>;
  readiness: readonly ["not_configured" | "sandbox_verified", "control_plane_only" | "sandbox_verified"];
  boundaries: readonly ["execution_blocked", "read_only"];
  advisor: readonly ProviderContractAdvisorCard[];
  links?: ProviderContractLinks;
};

const DEFAULT_PLACEHOLDER_ADVISOR: readonly ProviderContractAdvisorCard[] = [
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
];

function createPlaceholderProviderContract(
  providerId: ProviderId,
  displayName: string,
  providerCategory: ProviderCategory,
): ProviderContract {
  return {
    providerId,
    displayName,
    providerType: "registrar",
    providerCategory,
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
    advisor: DEFAULT_PLACEHOLDER_ADVISOR,
  };
}

const OPENPROVIDER_PROVIDER_CONTRACT: ProviderContract = {
  providerId: "openprovider",
  displayName: "Openprovider",
  providerType: "registrar",
  providerCategory: "registrar",
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

const REALTIME_REGISTER_PROVIDER_CONTRACT = createPlaceholderProviderContract(
  "realtime_register",
  "Realtime Register",
  "registrar",
);
const INWX_PROVIDER_CONTRACT = createPlaceholderProviderContract("inwx", "INWX", "registrar");
const NETIM_PROVIDER_CONTRACT = createPlaceholderProviderContract("netim", "Netim", "registrar");

const VERCEL_PROVIDER_CONTRACT = createPlaceholderProviderContract("vercel", "Vercel", "deployment");
const NETLIFY_PROVIDER_CONTRACT = createPlaceholderProviderContract("netlify", "Netlify", "deployment");
const CLOUDFLARE_PROVIDER_CONTRACT = createPlaceholderProviderContract("cloudflare", "Cloudflare", "deployment");
const RAILWAY_PROVIDER_CONTRACT = createPlaceholderProviderContract("railway", "Railway", "deployment");

const STRIPE_PROVIDER_CONTRACT = createPlaceholderProviderContract("stripe", "Stripe", "commerce");
const PADDLE_PROVIDER_CONTRACT = createPlaceholderProviderContract("paddle", "Paddle", "commerce");
const POLAR_PROVIDER_CONTRACT = createPlaceholderProviderContract("polar", "Polar", "commerce");

const INNGEST_PROVIDER_CONTRACT = createPlaceholderProviderContract("inngest", "Inngest", "execution");
const TRIGGER_DEV_PROVIDER_CONTRACT = createPlaceholderProviderContract("trigger_dev", "Trigger.dev", "execution");
const TEMPORAL_PROVIDER_CONTRACT = createPlaceholderProviderContract("temporal", "Temporal", "execution");

const GITHUB_PROVIDER_CONTRACT = createPlaceholderProviderContract("github", "GitHub", "source_control");
const GITLAB_PROVIDER_CONTRACT = createPlaceholderProviderContract("gitlab", "GitLab", "source_control");

const OPENAI_PROVIDER_CONTRACT = createPlaceholderProviderContract("openai", "OpenAI", "ai");
const ANTHROPIC_PROVIDER_CONTRACT = createPlaceholderProviderContract("anthropic", "Anthropic", "ai");
const GEMINI_PROVIDER_CONTRACT = createPlaceholderProviderContract("gemini", "Gemini", "ai");
const GROQ_PROVIDER_CONTRACT = createPlaceholderProviderContract("groq", "Groq", "ai");
const MISTRAL_PROVIDER_CONTRACT = createPlaceholderProviderContract("mistral", "Mistral", "ai");

const SUPABASE_PROVIDER_CONTRACT = createPlaceholderProviderContract("supabase", "Supabase", "storage");
const R2_PROVIDER_CONTRACT = createPlaceholderProviderContract("r2", "R2", "storage");
const S3_PROVIDER_CONTRACT = createPlaceholderProviderContract("s3", "S3", "storage");

const CLERK_PROVIDER_CONTRACT = createPlaceholderProviderContract("clerk", "Clerk", "identity");
const AUTH0_PROVIDER_CONTRACT = createPlaceholderProviderContract("auth0", "Auth0", "identity");
const SUPABASE_AUTH_PROVIDER_CONTRACT = createPlaceholderProviderContract("supabase_auth", "Supabase Auth", "identity");

export const PROVIDER_CONTRACT_REGISTRY = [
  OPENPROVIDER_PROVIDER_CONTRACT,
  REALTIME_REGISTER_PROVIDER_CONTRACT,
  INWX_PROVIDER_CONTRACT,
  NETIM_PROVIDER_CONTRACT,
  VERCEL_PROVIDER_CONTRACT,
  NETLIFY_PROVIDER_CONTRACT,
  CLOUDFLARE_PROVIDER_CONTRACT,
  RAILWAY_PROVIDER_CONTRACT,
  STRIPE_PROVIDER_CONTRACT,
  PADDLE_PROVIDER_CONTRACT,
  POLAR_PROVIDER_CONTRACT,
  INNGEST_PROVIDER_CONTRACT,
  TRIGGER_DEV_PROVIDER_CONTRACT,
  TEMPORAL_PROVIDER_CONTRACT,
  GITHUB_PROVIDER_CONTRACT,
  GITLAB_PROVIDER_CONTRACT,
  OPENAI_PROVIDER_CONTRACT,
  ANTHROPIC_PROVIDER_CONTRACT,
  GEMINI_PROVIDER_CONTRACT,
  GROQ_PROVIDER_CONTRACT,
  MISTRAL_PROVIDER_CONTRACT,
  SUPABASE_PROVIDER_CONTRACT,
  R2_PROVIDER_CONTRACT,
  S3_PROVIDER_CONTRACT,
  CLERK_PROVIDER_CONTRACT,
  AUTH0_PROVIDER_CONTRACT,
  SUPABASE_AUTH_PROVIDER_CONTRACT,
] as const satisfies readonly ProviderContract[];

export const PROVIDER_CONTRACT_BY_ID: Readonly<Record<ProviderId, ProviderContract>> = {
  openprovider: OPENPROVIDER_PROVIDER_CONTRACT,
  realtime_register: REALTIME_REGISTER_PROVIDER_CONTRACT,
  inwx: INWX_PROVIDER_CONTRACT,
  netim: NETIM_PROVIDER_CONTRACT,
  vercel: VERCEL_PROVIDER_CONTRACT,
  netlify: NETLIFY_PROVIDER_CONTRACT,
  cloudflare: CLOUDFLARE_PROVIDER_CONTRACT,
  railway: RAILWAY_PROVIDER_CONTRACT,
  stripe: STRIPE_PROVIDER_CONTRACT,
  paddle: PADDLE_PROVIDER_CONTRACT,
  polar: POLAR_PROVIDER_CONTRACT,
  inngest: INNGEST_PROVIDER_CONTRACT,
  trigger_dev: TRIGGER_DEV_PROVIDER_CONTRACT,
  temporal: TEMPORAL_PROVIDER_CONTRACT,
  github: GITHUB_PROVIDER_CONTRACT,
  gitlab: GITLAB_PROVIDER_CONTRACT,
  openai: OPENAI_PROVIDER_CONTRACT,
  anthropic: ANTHROPIC_PROVIDER_CONTRACT,
  gemini: GEMINI_PROVIDER_CONTRACT,
  groq: GROQ_PROVIDER_CONTRACT,
  mistral: MISTRAL_PROVIDER_CONTRACT,
  supabase: SUPABASE_PROVIDER_CONTRACT,
  r2: R2_PROVIDER_CONTRACT,
  s3: S3_PROVIDER_CONTRACT,
  clerk: CLERK_PROVIDER_CONTRACT,
  auth0: AUTH0_PROVIDER_CONTRACT,
  supabase_auth: SUPABASE_AUTH_PROVIDER_CONTRACT,
};
