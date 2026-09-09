export type AirshipAIProviderId = "openai" | "gemini" | "anthropic" | "groq" | "openrouter";
export type AirshipAgentPurpose = "airship_editor";
export type AirshipAgentCostPosture = "cheap" | "balanced" | "best";
export type AirshipAIProviderConnectionStatus = "connected" | "not_connected" | "test_failed" | "read_unavailable" | "planned";

export type AirshipOpenAIProviderStatusReadModel = {
  provider: "openai";
  scope: "airship_editor";
  ownerScope: "internal_superadmin";
  connected: boolean;
  status: "missing" | "connected" | "revoked" | "encryption_not_configured" | "read_error";
  maskedKey: string | null;
  model: string;
  lastTestedAt: string | null;
  lastTestStatus: "passed" | "failed" | null;
  createdAt: string | null;
  updatedAt: string | null;
  canUseAiCommands: boolean;
};

export type AirshipAIProviderReadModel = {
  provider: AirshipAIProviderId;
  displayName: string;
  purpose: AirshipAgentPurpose;
  maskedKey: string | null;
  model: string | null;
  connectionStatus: AirshipAIProviderConnectionStatus;
  enabled: boolean;
  planned: boolean;
  note: string;
};

export type AirshipAgentProfileReadModel = {
  profileId: string;
  profileName: string;
  provider: AirshipAIProviderId;
  model: string;
  purpose: AirshipAgentPurpose;
  costPosture: AirshipAgentCostPosture;
  enabled: boolean;
  defaultProfile: boolean;
  providerConnectionStatus: AirshipAIProviderConnectionStatus;
  canUseAiCommands: boolean;
  source: "derived_from_openai_byok_status" | "safe_default_unavailable";
};

export type AirshipAgentProfileSelection = {
  status: "selected" | "unavailable";
  activeProfile: AirshipAgentProfileReadModel | null;
  diagnostics: string[];
};

export type AirshipAgencyAISettingsReadModel = {
  version: "airship-13-agency-ai-settings:v1";
  generatedAt: string;
  scope: "agency_level";
  ownerScope: "internal_superadmin";
  title: "AI Settings";
  openAIProviderStatus: AirshipOpenAIProviderStatusReadModel;
  providers: AirshipAIProviderReadModel[];
  profiles: AirshipAgentProfileReadModel[];
  selectedAirshipProfile: AirshipAgentProfileSelection;
  flags: {
    readOnly: true;
    providerExecutionAdded: false;
    rawKeysReturned: false;
    liveSiteMutation: false;
    activePointerMutation: false;
    publishes: false;
    dryRun: false;
    shadowPublish: false;
    rollback: false;
    sourceCapture: false;
  };
};
