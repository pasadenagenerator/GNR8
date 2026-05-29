import type { ProviderId } from "@/gnr8/runtime/providers/provider-contract-registry";

export type CredentialReferenceBindingScope = "global" | "agency" | "project" | "environment";
export type CredentialReferenceOwnerScope = "global" | "agency" | "project" | "environment";
export type CredentialReferenceEnvironmentScope = "global" | "sandbox" | "preview" | "staging" | "production";
export type CredentialReferenceSecretType =
  | "provider_api_credentials"
  | "ai_provider_api_key"
  | "communication_provider_api_key";
export type CredentialReferenceStatus = "missing" | "configured_reference_only";
export type CredentialReferenceResolutionState = "disabled";

export type CredentialReferencePreview = {
  credentialReferenceId: string;
  providerId: ProviderId;
  bindingScope: CredentialReferenceBindingScope;
  ownerScope: CredentialReferenceOwnerScope;
  environmentScope: CredentialReferenceEnvironmentScope;
  secretType: CredentialReferenceSecretType;
  status: CredentialReferenceStatus;
  resolutionState: CredentialReferenceResolutionState;
  executionAllowed: false;
  executionBlocked: true;
  diagnostics: readonly [
    "CREDENTIAL_REFERENCE_PREVIEW_CREATED",
    "CREDENTIAL_REFERENCE_SECRET_RESOLUTION_DISABLED",
    "CREDENTIAL_REFERENCE_EXECUTION_BLOCKED",
  ];
};

export const CREDENTIAL_REFERENCE_REGISTRY_PREVIEW = [
  {
    credentialReferenceId: "cr_openprovider_global_sandbox",
    providerId: "openprovider",
    bindingScope: "global",
    ownerScope: "global",
    environmentScope: "sandbox",
    secretType: "provider_api_credentials",
    status: "configured_reference_only",
    resolutionState: "disabled",
    executionAllowed: false,
    executionBlocked: true,
    diagnostics: [
      "CREDENTIAL_REFERENCE_PREVIEW_CREATED",
      "CREDENTIAL_REFERENCE_SECRET_RESOLUTION_DISABLED",
      "CREDENTIAL_REFERENCE_EXECUTION_BLOCKED",
    ],
  },
  {
    credentialReferenceId: "cr_openai_global_placeholder",
    providerId: "openai",
    bindingScope: "global",
    ownerScope: "global",
    environmentScope: "global",
    secretType: "ai_provider_api_key",
    status: "missing",
    resolutionState: "disabled",
    executionAllowed: false,
    executionBlocked: true,
    diagnostics: [
      "CREDENTIAL_REFERENCE_PREVIEW_CREATED",
      "CREDENTIAL_REFERENCE_SECRET_RESOLUTION_DISABLED",
      "CREDENTIAL_REFERENCE_EXECUTION_BLOCKED",
    ],
  },
  {
    credentialReferenceId: "cr_resend_global_placeholder",
    providerId: "resend",
    bindingScope: "global",
    ownerScope: "global",
    environmentScope: "global",
    secretType: "communication_provider_api_key",
    status: "missing",
    resolutionState: "disabled",
    executionAllowed: false,
    executionBlocked: true,
    diagnostics: [
      "CREDENTIAL_REFERENCE_PREVIEW_CREATED",
      "CREDENTIAL_REFERENCE_SECRET_RESOLUTION_DISABLED",
      "CREDENTIAL_REFERENCE_EXECUTION_BLOCKED",
    ],
  },
] as const satisfies readonly CredentialReferencePreview[];
