import type { TwinObservation } from "@/gnr8/runtime/twin/twin-observations";

export type TwinInsightSeverity = "informational" | "low" | "medium" | "high";

export type TwinInsight = {
  insightId: string;
  category: "content" | "design" | "experience" | "governance" | "operations";
  severity: TwinInsightSeverity;
  title: string;
  summary: string;
  supportingObservations: string[];
};

export const TWIN_INSIGHT_DIAGNOSTICS = {
  STARTED: "TWIN_INSIGHTS_STARTED",
  COMPLETED: "TWIN_INSIGHTS_COMPLETED",
} as const;

function hasObservationTitle(observations: TwinObservation[], title: string): boolean {
  return observations.some((observation) => observation.title === title);
}

export function generateTwinInsights(observations: TwinObservation[]): TwinInsight[] {
  const insights: TwinInsight[] = [];

  if (hasObservationTitle(observations, "Small Site Footprint")) {
    insights.push({
      insightId: "ins_content_focused_website_footprint",
      category: "content",
      severity: "informational",
      title: "Focused Website Footprint",
      summary:
        "The imported website appears to be a focused presentation-oriented site rather than a large content estate.",
      supportingObservations: ["Small Site Footprint"],
    });
  }

  if (
    hasObservationTitle(observations, "Small Site Footprint") &&
    hasObservationTitle(observations, "Homepage Successfully Identified")
  ) {
    insights.push({
      insightId: "ins_experience_primary_entry_detected",
      category: "experience",
      severity: "informational",
      title: "Primary Entry Experience Detected",
      summary:
        "A primary website entry point was successfully identified and can be evaluated as a central experience surface.",
      supportingObservations: ["Small Site Footprint", "Homepage Successfully Identified"],
    });
  }

  if (hasObservationTitle(observations, "No Asset Evidence Detected")) {
    insights.push({
      insightId: "ins_design_limited_design_evidence",
      category: "design",
      severity: "medium",
      title: "Limited Design Evidence Available",
      summary: "Design analysis confidence is limited because imported asset evidence is unavailable.",
      supportingObservations: ["No Asset Evidence Detected"],
    });
  }

  if (hasObservationTitle(observations, "Read-Only Runtime Validation")) {
    insights.push({
      insightId: "ins_governance_boundary_enforced",
      category: "governance",
      severity: "informational",
      title: "Governance Boundary Enforced",
      summary: "Website OS runtime remains within read-only governance boundaries.",
      supportingObservations: ["Read-Only Runtime Validation"],
    });
  }

  return insights;
}
