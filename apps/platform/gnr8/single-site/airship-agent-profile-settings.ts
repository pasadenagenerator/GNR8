import type { AirshipOpenAIProviderStatus } from "@/gnr8/single-site/airship-openai-byok-provider";
import type {
  AirshipAgencyAISettingsReadModel,
  AirshipAgentProfileReadModel,
  AirshipAgentProfileSelection,
  AirshipAIProviderConnectionStatus,
  AirshipAIProviderId,
  AirshipAIProviderReadModel,
  AirshipOpenAIProviderStatusReadModel,
} from "@/gnr8/single-site/airship-agent-profile-types";

export const AIRSHIP_AGENCY_AI_SETTINGS_VERSION = "airship-13-agency-ai-settings:v1" as const;
const AIRSHIP_OPENAI_DEFAULT_MODEL = "gpt-5" as const;

type ReadSettingsDeps = {
  readOpenAIProviderStatus: () => Promise<AirshipOpenAIProviderStatus>;
  generatedAt: () => string;
};

const MASKED_OPENAI_KEY_PATTERN = /^sk-\.\.\.[A-Za-z0-9_-]{4}$/;
const MODEL_PATTERN = /^[A-Za-z0-9._:-]{1,80}$/;
const PLANNED_PROVIDERS: Array<{ provider: Exclude<AirshipAIProviderId, "openai">; displayName: string }> = [
  { provider: "gemini", displayName: "Gemini" },
  { provider: "anthropic", displayName: "Anthropic" },
  { provider: "groq", displayName: "Groq" },
  { provider: "openrouter", displayName: "OpenRouter" },
];

function readErrorAirshipOpenAIProviderStatus(): AirshipOpenAIProviderStatus {
  return {
    provider: "openai",
    scope: "airship_editor",
    ownerScope: "internal_superadmin",
    connected: false,
    status: "read_error",
    maskedKey: null,
    model: AIRSHIP_OPENAI_DEFAULT_MODEL,
    lastTestedAt: null,
    lastTestStatus: null,
    createdAt: null,
    updatedAt: null,
    canUseAiCommands: false,
  };
}

function safeText(value: unknown, max = 120): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function sanitizeAirshipMaskedOpenAIKey(value: unknown): string | null {
  const normalized = safeText(value, 32);
  return MASKED_OPENAI_KEY_PATTERN.test(normalized) ? normalized : null;
}

export function sanitizeAirshipModelName(value: unknown, fallback = AIRSHIP_OPENAI_DEFAULT_MODEL): string {
  const normalized = safeText(value, 80) || fallback;
  return MODEL_PATTERN.test(normalized) ? normalized : fallback;
}

export function resolveOpenAIProviderConnectionStatus(status: AirshipOpenAIProviderStatus): AirshipAIProviderConnectionStatus {
  if (status.status === "read_error") return "read_unavailable";
  if (status.connected && status.lastTestStatus === "failed") return "test_failed";
  if (status.connected && status.status === "connected") return "connected";
  return "not_connected";
}

function safeOpenAIProviderStatus(status: AirshipOpenAIProviderStatus): AirshipOpenAIProviderStatusReadModel {
  const maskedKey = sanitizeAirshipMaskedOpenAIKey(status.maskedKey);
  const connected = status.connected && status.status === "connected" && Boolean(maskedKey);
  return {
    provider: "openai",
    scope: "airship_editor",
    ownerScope: "internal_superadmin",
    connected,
    status: status.status,
    maskedKey,
    model: sanitizeAirshipModelName(status.model),
    lastTestedAt: safeText(status.lastTestedAt, 80) || null,
    lastTestStatus: status.lastTestStatus === "passed" || status.lastTestStatus === "failed" ? status.lastTestStatus : null,
    createdAt: safeText(status.createdAt, 80) || null,
    updatedAt: safeText(status.updatedAt, 80) || null,
    canUseAiCommands: status.canUseAiCommands && connected,
  };
}

function openAIProviderReadModel(status: AirshipOpenAIProviderStatusReadModel): AirshipAIProviderReadModel {
  const connectionStatus = resolveOpenAIProviderConnectionStatus(status);
  return {
    provider: "openai",
    displayName: "OpenAI BYOK",
    purpose: "airship_editor",
    maskedKey: sanitizeAirshipMaskedOpenAIKey(status.maskedKey),
    model: sanitizeAirshipModelName(status.model),
    connectionStatus,
    enabled: status.connected,
    planned: false,
    note: connectionStatus === "test_failed"
      ? "Connected metadata is present, but the latest provider test failed."
      : connectionStatus === "connected"
        ? "Connected through existing Airship OpenAI BYOK credential metadata."
        : connectionStatus === "read_unavailable"
          ? "Provider metadata could not be read safely."
          : "No active Airship OpenAI BYOK credential metadata is available.",
  };
}

function plannedProviderReadModels(): AirshipAIProviderReadModel[] {
  return PLANNED_PROVIDERS.map((provider) => ({
    provider: provider.provider,
    displayName: provider.displayName,
    purpose: "airship_editor",
    maskedKey: null,
    model: null,
    connectionStatus: "planned",
    enabled: false,
    planned: true,
    note: "Planned provider option. Credential storage and execution are not enabled in this phase.",
  }));
}

function defaultAirshipProfileFromProvider(provider: AirshipAIProviderReadModel): AirshipAgentProfileReadModel {
  const connected = provider.connectionStatus === "connected" || provider.connectionStatus === "test_failed";
  return {
    profileId: "airship-editor-default",
    profileName: "Airship Editor Default",
    provider: "openai",
    model: sanitizeAirshipModelName(provider.model),
    purpose: "airship_editor",
    costPosture: "balanced",
    enabled: connected,
    defaultProfile: true,
    providerConnectionStatus: provider.connectionStatus,
    canUseAiCommands: connected,
    source: connected ? "derived_from_openai_byok_status" : "safe_default_unavailable",
  };
}

export function selectDefaultAirshipProfile(profiles: readonly AirshipAgentProfileReadModel[]): AirshipAgentProfileSelection {
  const defaultProfile = profiles.find((profile) => profile.defaultProfile && profile.enabled);
  if (defaultProfile) {
    return {
      status: "selected",
      activeProfile: defaultProfile,
      diagnostics: ["airship_agent_default_profile_selected"],
    };
  }
  return {
    status: "unavailable",
    activeProfile: null,
    diagnostics: ["airship_agent_default_profile_unavailable"],
  };
}

function flags(): AirshipAgencyAISettingsReadModel["flags"] {
  return {
    readOnly: true,
    providerExecutionAdded: false,
    rawKeysReturned: false,
    liveSiteMutation: false,
    activePointerMutation: false,
    publishes: false,
    dryRun: false,
    shadowPublish: false,
    rollback: false,
    sourceCapture: false,
  };
}

export function buildAirshipAgencyAISettingsReadModel(input: {
  openAIProviderStatus: AirshipOpenAIProviderStatus;
  generatedAt?: string | null;
}): AirshipAgencyAISettingsReadModel {
  const openAIProviderStatus = safeOpenAIProviderStatus(input.openAIProviderStatus);
  const provider = openAIProviderReadModel(openAIProviderStatus);
  const profiles = [defaultAirshipProfileFromProvider(provider)];
  return {
    version: AIRSHIP_AGENCY_AI_SETTINGS_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    scope: "agency_level",
    ownerScope: "internal_superadmin",
    title: "AI Settings",
    openAIProviderStatus,
    providers: [provider, ...plannedProviderReadModels()],
    profiles,
    selectedAirshipProfile: selectDefaultAirshipProfile(profiles),
    flags: flags(),
  };
}

export function unavailableAirshipAgencyAISettingsReadModel(generatedAt = new Date().toISOString()): AirshipAgencyAISettingsReadModel {
  const model = buildAirshipAgencyAISettingsReadModel({
    openAIProviderStatus: readErrorAirshipOpenAIProviderStatus(),
    generatedAt,
  });
  return {
    ...model,
    selectedAirshipProfile: {
      status: "unavailable",
      activeProfile: null,
      diagnostics: ["airship_agent_profile_read_failed"],
    },
  };
}

export async function readAirshipAgencyAISettings(deps: Partial<ReadSettingsDeps> = {}): Promise<AirshipAgencyAISettingsReadModel> {
  const resolvedDeps: ReadSettingsDeps = {
    readOpenAIProviderStatus: deps.readOpenAIProviderStatus ?? (async () => {
      const { AirshipOpenAIByokProviderService } = await import("@/gnr8/single-site/airship-openai-byok-provider");
      return new AirshipOpenAIByokProviderService().status();
    }),
    generatedAt: deps.generatedAt ?? (() => new Date().toISOString()),
  };

  try {
    return buildAirshipAgencyAISettingsReadModel({
      openAIProviderStatus: await resolvedDeps.readOpenAIProviderStatus(),
      generatedAt: resolvedDeps.generatedAt(),
    });
  } catch {
    return unavailableAirshipAgencyAISettingsReadModel(resolvedDeps.generatedAt());
  }
}
