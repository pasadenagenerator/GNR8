import type { AirshipOnlineBuilderEditorGatewayConfig } from "./airship-online-builder-editor-gateway";
import {
  AIRSHIP_ONLINE_BUILDER_DEFAULT_LEASE_CONFIG,
  type AirshipOnlineBuilderLeaseConfig,
} from "./airship-online-builder-lease";
import type {
  AirshipOnlineBuilderDisabledReason,
  AirshipOnlineBuilderFailureReason,
  AirshipOnlineBuilderSecurityLifecycleReadback,
  AirshipOnlineBuilderWorkerClient,
} from "./airship-online-builder-worker-contract";

export type AirshipOnlineBuilderWorkerAuthRuntimeConfig = {
  configured: true;
  authMode: "bearer_token_with_hashed_storage";
  requestSigning: "hmac_sha256_timestamp_nonce";
  replayWindowSeconds: number;
};

export type AirshipOnlineBuilderSecurityLifecycleConfig = {
  durableRepository?: { configured: true; storage: "postgres_jsonb_records" } | null;
  workerAuth?: AirshipOnlineBuilderWorkerAuthRuntimeConfig | null;
  leaseManager?: AirshipOnlineBuilderLeaseConfig | null;
  editorGateway?: AirshipOnlineBuilderEditorGatewayConfig | null;
  heartbeat?: {
    configured: true;
    status?: "healthy" | "stale" | "unknown";
    lastWorkerSeenAt?: string | null;
  } | null;
  fakeTestMode?: boolean;
};

export type AirshipOnlineBuilderSecurityLifecycleGate =
  | { ok: true; readback: AirshipOnlineBuilderSecurityLifecycleReadback; diagnostics: string[] }
  | {
    ok: false;
    failureReason: Extract<
      AirshipOnlineBuilderFailureReason,
      "worker_auth_not_configured" | "lease_manager_not_configured" | "editor_gateway_not_configured"
    >;
    disabledReasons: AirshipOnlineBuilderDisabledReason[];
    readback: AirshipOnlineBuilderSecurityLifecycleReadback;
    diagnostics: string[];
  };

export function createAirshipOnlineBuilderFakeSecurityLifecycleConfig(): AirshipOnlineBuilderSecurityLifecycleConfig {
  return {
    fakeTestMode: true,
    durableRepository: { configured: true, storage: "postgres_jsonb_records" },
    workerAuth: {
      configured: true,
      authMode: "bearer_token_with_hashed_storage",
      requestSigning: "hmac_sha256_timestamp_nonce",
      replayWindowSeconds: 120,
    },
    leaseManager: AIRSHIP_ONLINE_BUILDER_DEFAULT_LEASE_CONFIG,
    editorGateway: {
      gatewayBaseUrl: "https://fake-airship-gateway.test",
      signingSecret: "fake-airship-online-builder-editor-gateway-secret",
      tokenTtlSeconds: 5 * 60,
      allowedOrigins: ["https://app.test"],
    },
    heartbeat: {
      configured: true,
      status: "healthy",
      lastWorkerSeenAt: null,
    },
  };
}

export function readAirshipOnlineBuilderSecurityLifecycle(input: {
  config?: AirshipOnlineBuilderSecurityLifecycleConfig | null;
}): AirshipOnlineBuilderSecurityLifecycleReadback {
  return {
    durableRepository: input.config?.durableRepository ? "configured" : "not_configured",
    workerAuth: input.config?.workerAuth ? "configured" : "not_configured",
    leaseManager: input.config?.leaseManager ? "configured" : "not_configured",
    leaseManagerStatus: input.config?.leaseManager ? "configured" : "not_configured",
    signedEditorGateway: input.config?.editorGateway ? "configured" : "not_configured",
    signedEditorGatewayStatus: input.config?.editorGateway ? "configured" : "not_configured",
    heartbeatStatus: input.config?.heartbeat ? input.config.heartbeat.status ?? "unknown" : "not_configured",
    lastWorkerSeenAt: input.config?.heartbeat?.lastWorkerSeenAt ?? null,
    fakeTestMode: input.config?.fakeTestMode === true,
  };
}

export function gateAirshipOnlineBuilderSecurityLifecycle(input: {
  config?: AirshipOnlineBuilderSecurityLifecycleConfig | null;
  workerClient?: AirshipOnlineBuilderWorkerClient | null;
}): AirshipOnlineBuilderSecurityLifecycleGate {
  const readback = readAirshipOnlineBuilderSecurityLifecycle({ config: input.config });
  const disabledReasons: AirshipOnlineBuilderDisabledReason[] = [];
  if (readback.workerAuth === "not_configured") disabledReasons.push("worker_auth_not_configured");
  if (readback.leaseManager === "not_configured") disabledReasons.push("lease_manager_not_configured", "remote_worker_lease_missing");
  if (readback.signedEditorGateway === "not_configured") disabledReasons.push("signed_editor_gateway_not_configured");

  if (input.config?.fakeTestMode === true && input.workerClient && !input.workerClient.testOnlyFakeWorkerClient) {
    return {
      ok: false,
      failureReason: "worker_auth_not_configured",
      disabledReasons: Array.from(new Set([...disabledReasons, "worker_auth_not_configured"])),
      readback,
      diagnostics: ["airship_online_builder_fake_test_security_config_requires_fake_worker_client"],
    };
  }
  if (!input.config?.workerAuth) {
    return {
      ok: false,
      failureReason: "worker_auth_not_configured",
      disabledReasons: Array.from(new Set(disabledReasons)),
      readback,
      diagnostics: ["airship_online_builder_worker_auth_not_configured", "no_remote_worker_launch_attempted"],
    };
  }
  if (!input.config?.leaseManager) {
    return {
      ok: false,
      failureReason: "lease_manager_not_configured",
      disabledReasons: Array.from(new Set(disabledReasons)),
      readback,
      diagnostics: ["airship_online_builder_lease_manager_not_configured", "no_remote_worker_launch_attempted"],
    };
  }
  if (!input.config?.editorGateway) {
    return {
      ok: false,
      failureReason: "editor_gateway_not_configured",
      disabledReasons: Array.from(new Set(disabledReasons)),
      readback,
      diagnostics: ["airship_online_builder_signed_editor_gateway_not_configured", "no_remote_worker_launch_attempted"],
    };
  }
  return {
    ok: true,
    readback,
    diagnostics: ["airship_online_builder_security_lifecycle_configured"],
  };
}
