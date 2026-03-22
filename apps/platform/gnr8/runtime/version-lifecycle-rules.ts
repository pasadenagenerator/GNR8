import type { SiteVersionState } from "@/gnr8/runtime/types";

export const ALLOWED_TRANSITIONS: Record<SiteVersionState, SiteVersionState[]> = {
  DRAFT: ["READY_FOR_REVIEW"],
  READY_FOR_REVIEW: ["APPROVED"],
  APPROVED: ["PUBLISHED"],
  PUBLISHED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function assertLifecycleTransition(input: { currentState: SiteVersionState; nextState: SiteVersionState }): void {
  const allowed = ALLOWED_TRANSITIONS[input.currentState] ?? [];
  if (!allowed.includes(input.nextState)) {
    throw new Error(`Invalid SiteVersion transition: ${input.currentState} -> ${input.nextState}`);
  }
}
