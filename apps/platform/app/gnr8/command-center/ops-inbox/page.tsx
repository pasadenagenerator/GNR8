import { getPublishShadowOpsInboxViewModel } from "@/gnr8/aaf/aaf-publish-shadow-ops-inbox-view-model";
import { requireSuperadminUserIdForPage } from "@/src/auth/require-superadmin-user-id";

import { getCommandCenterSitesViewModel } from "../_lib/command-center-view-model";
import {
  OpsInboxShell,
  sortOpsInboxItems,
  type OpsInboxShellSourceState,
  type OpsInboxShellViewModel,
} from "./_components/OpsInboxShell";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function text(value: unknown, fallback = "-"): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

export async function getOpsInboxShellViewModel(input: {
  actorId: string;
}): Promise<OpsInboxShellViewModel> {
  const commandCenterModel = await getCommandCenterSitesViewModel();
  const candidates = commandCenterModel.rows
    .map((row) => ({
      siteId: row.summary.site_id,
      siteVersionId: row.migration.latest_site_version_id,
      clientId: row.summary.client_id,
      siteLabel: row.summary.client_name ?? row.summary.domain ?? row.summary.site_id,
    }))
    .filter((candidate): candidate is {
      siteId: string;
      siteVersionId: string;
      clientId: string | null;
      siteLabel: string;
    } => Boolean(candidate.siteId && candidate.siteVersionId));

  const models = await Promise.all(
    candidates.map(async (candidate) => {
      const model = await getPublishShadowOpsInboxViewModel({
        actorId: input.actorId,
        actorRole: "platform_superadmin",
        clientId: candidate.clientId,
        siteId: candidate.siteId,
        siteVersionId: candidate.siteVersionId,
        intendedPublishTarget: "production",
        intendedPublishStage: "production",
        trustedPublishEnvironment: "production",
      });

      return {
        candidate,
        model,
      };
    }),
  );

  const sourceStates: OpsInboxShellSourceState[] = models.map(({ candidate, model }) => ({
    state: model.state,
    siteLabel: text(model.items[0]?.siteLabel, candidate.siteLabel),
    siteVersionLabel: text(model.items[0]?.siteVersionSummary, candidate.siteVersionId),
    unavailableStateLabel: model.unavailableStateLabel,
    emptyStateLabel: model.emptyStateLabel,
  }));

  const items = sortOpsInboxItems(models.flatMap(({ model }) => model.items));
  const unavailableCount = sourceStates.filter((source) => source.state === "unavailable").length;
  const emptyCount = sourceStates.filter((source) => source.state === "empty" || source.state === "not_applicable").length;

  return {
    generatedAt: new Date().toISOString(),
    candidateCount: candidates.length,
    unavailableCount,
    emptyCount,
    sourceStates,
    items,
  };
}

export default async function OpsInboxPage() {
  const actorId = await requireSuperadminUserIdForPage();
  const model = await getOpsInboxShellViewModel({ actorId });

  return <OpsInboxShell model={model} />;
}
