import { access } from "node:fs/promises";

import {
  AIRSHIP_BUILDER_WORKER_CONTRACT_VERSION,
  type AirshipBuilderWorkerConfig,
  type AirshipBuilderWorkerConfigReadback,
} from "./config.js";

export type AirshipBuilderWorkerHealthReadback = {
  ok: boolean;
  workerId: string;
  contractVersion: typeof AIRSHIP_BUILDER_WORKER_CONTRACT_VERSION;
  deploymentMode: AirshipBuilderWorkerConfig["deploymentMode"];
  airshipCliVersion: string | null;
  nodeVersion: string;
  capacity: {
    maxConcurrentSessions: number;
    activeSessionCount: number;
  };
  dependencies: {
    packageCache: "unknown";
    workspaceRoot: "healthy" | "degraded";
    processSupervisor: "not_started";
  };
  runtimeExecution: "disabled" | "enabled_but_unimplemented";
  boundaries: {
    noPublishMutation: true;
    noLivePointerMutation: true;
    noDnsMutation: true;
    noProviderMutation: true;
    noSourceCaptureImport: true;
  };
  diagnostics: string[];
};

export async function buildAirshipBuilderWorkerHealthReadback(
  configReadback: AirshipBuilderWorkerConfigReadback,
): Promise<AirshipBuilderWorkerHealthReadback> {
  const diagnostics = [...configReadback.diagnostics];
  let workspaceRoot: AirshipBuilderWorkerHealthReadback["dependencies"]["workspaceRoot"] = "healthy";

  try {
    await access(configReadback.config.workspaceRoot);
  } catch {
    workspaceRoot = "degraded";
    diagnostics.push(`Workspace root is not accessible: ${configReadback.config.workspaceRoot}`);
  }

  return {
    ok: configReadback.ok && workspaceRoot === "healthy",
    workerId: configReadback.config.workerId,
    contractVersion: AIRSHIP_BUILDER_WORKER_CONTRACT_VERSION,
    deploymentMode: configReadback.config.deploymentMode,
    airshipCliVersion: configReadback.config.airshipCliVersion,
    nodeVersion: configReadback.config.nodeVersion,
    capacity: {
      maxConcurrentSessions: configReadback.config.maxConcurrentSessions,
      activeSessionCount: 0,
    },
    dependencies: {
      packageCache: "unknown",
      workspaceRoot,
      processSupervisor: "not_started",
    },
    runtimeExecution: configReadback.config.noRuntimeExecution ? "disabled" : "enabled_but_unimplemented",
    boundaries: {
      noPublishMutation: true,
      noLivePointerMutation: true,
      noDnsMutation: true,
      noProviderMutation: true,
      noSourceCaptureImport: true,
    },
    diagnostics,
  };
}
