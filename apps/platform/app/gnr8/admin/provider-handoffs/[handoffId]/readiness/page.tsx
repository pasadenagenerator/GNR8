import { headers } from "next/headers";

import { ProviderHandoffReadinessDebugView, type ProviderHandoffReadinessDebugModel } from "@/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/provider-handoff-readiness-debug-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ handoffId: string }>;
};

function normalizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => normalizeToken(value)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

async function fetchReadinessModel(handoffId: string): Promise<{ model: ProviderHandoffReadinessDebugModel; fetchError: string | null }> {
  const incomingHeaders = await headers();
  const proto = normalizeToken(incomingHeaders.get("x-forwarded-proto")) || "http";
  const host = normalizeToken(incomingHeaders.get("x-forwarded-host")) || normalizeToken(incomingHeaders.get("host")) || "localhost:3000";
  const endpoint = `${proto}://${host}/api/gnr8/runtime/provider-handoffs/${encodeURIComponent(handoffId)}/readiness`;

  try {
    const response = await fetch(endpoint, { method: "GET", cache: "no-store" });
    const payload = (await response.json()) as Record<string, unknown>;

    const model: ProviderHandoffReadinessDebugModel = {
      handoffId,
      readinessStatus: normalizeToken(payload.readinessStatus),
      executionBlocked: Boolean(payload.executionBlocked),
      blockedReasons: normalizeList(payload.blockedReasons),
      nextAllowedAction: normalizeToken(payload.nextAllowedAction),
      correlationKey: normalizeToken(payload.correlationKey),
      diagnostics: normalizeList(payload.diagnostics),
      handoffArtifact: (payload.handoffArtifact as ProviderHandoffReadinessDebugModel["handoffArtifact"]) ?? null,
      workerPickupEvidence: (payload.workerPickupEvidence as ProviderHandoffReadinessDebugModel["workerPickupEvidence"]) ?? {},
    };

    return {
      model,
      fetchError: response.ok ? null : normalizeToken(payload.error) || `HTTP_${response.status}`,
    };
  } catch (error) {
    return {
      model: {
        handoffId,
        readinessStatus: "failed_closed",
        executionBlocked: true,
        blockedReasons: ["readiness_fetch_failed_closed"],
        nextAllowedAction: "control_plane_review_and_dry_run_artifact_inspection_only",
        correlationKey: "",
        diagnostics: ["PROVIDER_HANDOFF_DEBUG_FETCH_FAILED"],
        handoffArtifact: null,
        workerPickupEvidence: {},
      },
      fetchError: error instanceof Error ? error.message : "Unknown fetch error",
    };
  }
}

export default async function ProviderHandoffReadinessDebugPage(props: PageProps) {
  const { handoffId } = await props.params;
  const normalizedHandoffId = normalizeToken(handoffId);
  const { model, fetchError } = await fetchReadinessModel(normalizedHandoffId);

  return <ProviderHandoffReadinessDebugView model={model} fetchError={fetchError} />;
}
