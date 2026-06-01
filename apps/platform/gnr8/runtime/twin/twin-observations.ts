import type { WebsiteDigitalTwin } from "@/gnr8/runtime/twin/twin-types";

export type TwinObservationSeverity = "informational" | "low" | "medium" | "high";

export type TwinObservation = {
  observationId: string;
  category: "content" | "design" | "experience" | "governance" | "operations";
  severity: TwinObservationSeverity;
  title: string;
  summary: string;
  evidence: string;
};

export const TWIN_OBSERVATION_DIAGNOSTICS = {
  STARTED: "TWIN_OBSERVATIONS_STARTED",
  COMPLETED: "TWIN_OBSERVATIONS_COMPLETED",
} as const;

function parseCount(summary: string, key: string): number | null {
  const match = summary.match(new RegExp(`${key}=([0-9]+)`));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseBoolean(summary: string, key: string): boolean | null {
  const match = summary.match(new RegExp(`${key}=(true|false)`));
  if (!match) return null;
  return match[1] === "true";
}

export function generateTwinObservations(twin: WebsiteDigitalTwin): TwinObservation[] {
  const contentSummary = twin.snapshot.contentState.summary;
  const designSummary = twin.snapshot.designState.summary;
  const experienceSummary = twin.snapshot.experienceState.summary;

  const pageCount = parseCount(contentSummary, "pages");
  const assetCount = parseCount(designSummary, "assets");
  const homepageDetected = parseBoolean(experienceSummary, "homepageDetected");
  const observations: TwinObservation[] = [];

  if (pageCount !== null && pageCount <= 2) {
    observations.push({
      observationId: `obs_content_small_site_${twin.identity.siteVersionId}`,
      category: "content",
      severity: "informational",
      title: "Small Site Footprint",
      summary: "Imported site contains a limited number of pages.",
      evidence: `pageCount=${pageCount}`,
    });
  }

  if (assetCount !== null && assetCount === 0) {
    observations.push({
      observationId: `obs_design_no_assets_${twin.identity.siteVersionId}`,
      category: "design",
      severity: "medium",
      title: "No Asset Evidence Detected",
      summary: "No imported asset evidence was detected.",
      evidence: `assetCount=${assetCount}`,
    });
  }

  if (homepageDetected === true) {
    observations.push({
      observationId: `obs_experience_homepage_identified_${twin.identity.siteVersionId}`,
      category: "experience",
      severity: "informational",
      title: "Homepage Successfully Identified",
      summary: "Homepage structure was identified during import.",
      evidence: `homepageDetected=${String(homepageDetected)}`,
    });
  }

  observations.push({
    observationId: `obs_governance_read_only_runtime_${twin.identity.siteVersionId}`,
    category: "governance",
    severity: "informational",
    title: "Read-Only Runtime Validation",
    summary: "Workspace Overview is operating in read-only mode.",
    evidence: "readOnly=true",
  });

  return observations.filter((observation) => observation.summary.trim().length > 0);
}
