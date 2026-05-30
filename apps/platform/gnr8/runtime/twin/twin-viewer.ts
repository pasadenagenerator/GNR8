import type { WebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-types";

export type TwinOverview = {
  twinId: string;
  siteId: string;
  siteVersionId: string;
  workspaceId: string;
  environmentScope: string;
  status: WebsiteDigitalTwin["status"];
  contentSummary: string;
  designSummary: string;
  experienceSummary: string;
  governanceSummary: string;
  operationalSummary: string;
  lastUpdated: string;
  diagnostics: string[];
};

const TWIN_OVERVIEW_DIAGNOSTICS = {
  CREATED: "TWIN_OVERVIEW_CREATED",
} as const;

export function createTwinOverview(twin: WebsiteDigitalTwin): TwinOverview {
  return {
    twinId: twin.identity.twinId,
    siteId: twin.identity.siteId,
    siteVersionId: twin.identity.siteVersionId,
    workspaceId: twin.identity.workspaceId,
    environmentScope: twin.identity.environmentScope,
    status: twin.status,
    contentSummary: twin.snapshot.contentState.summary,
    designSummary: twin.snapshot.designState.summary,
    experienceSummary: twin.snapshot.experienceState.summary,
    governanceSummary: twin.snapshot.governanceState.summary,
    operationalSummary: twin.snapshot.operationalState.summary,
    lastUpdated: twin.identity.updatedAt,
    diagnostics: [TWIN_OVERVIEW_DIAGNOSTICS.CREATED],
  };
}
