import type { ContentResolutionDiagnostic } from "@/gnr8/content-resolution/content-resolution-types";

export const CONTENT_RESOLUTION_DIAGNOSTIC = {
  STARTED: "CONTENT_RESOLUTION_STARTED",
  COMPLETED: "CONTENT_RESOLUTION_COMPLETED",
  VALUE_RESOLVED: "CONTENT_VALUE_RESOLVED",
  VALUE_RESOLVED_FROM_FINAL_MODEL: "CONTENT_VALUE_RESOLVED_FROM_FINAL_MODEL",
  VALUE_RESOLVED_FROM_RENDER_MODEL: "CONTENT_VALUE_RESOLVED_FROM_RENDER_MODEL",
  MEDIA_RESOLVED: "CONTENT_MEDIA_RESOLVED",
  REPEATABLE_GROUP_RESOLVED: "CONTENT_REPEATABLE_GROUP_RESOLVED",
  VALUE_PARTIALLY_RESOLVED: "CONTENT_VALUE_PARTIALLY_RESOLVED",
  VALUE_UNRESOLVED_FALLBACK_USED: "CONTENT_VALUE_UNRESOLVED_FALLBACK_USED",
  BINDING_TARGET_MISSING: "CONTENT_BINDING_TARGET_MISSING",
  BINDING_SOURCE_MISSING: "CONTENT_BINDING_SOURCE_MISSING",
  REPEATABLE_GROUP_EMPTY: "CONTENT_REPEATABLE_GROUP_EMPTY",
  DEGRADED: "CONTENT_RESOLUTION_DEGRADED",
} as const;

export function sortContentResolutionDiagnostics(input: ContentResolutionDiagnostic[]): ContentResolutionDiagnostic[] {
  return input
    .slice()
    .sort((a, b) =>
      [
        a.code.localeCompare(b.code),
        (a.pageId ?? "").localeCompare(b.pageId ?? ""),
        (a.sectionId ?? "").localeCompare(b.sectionId ?? ""),
        (a.componentId ?? "").localeCompare(b.componentId ?? ""),
        (a.slotPath ?? "").localeCompare(b.slotPath ?? ""),
        a.message.localeCompare(b.message),
      ].find((value) => value !== 0) ?? 0,
    );
}
