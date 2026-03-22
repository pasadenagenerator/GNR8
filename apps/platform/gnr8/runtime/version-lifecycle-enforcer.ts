import { getVersionState, setSiteVersionState } from "@/gnr8/runtime/runtime-store";
import type { SiteVersionState } from "@/gnr8/runtime/types";
import { assertLifecycleTransition } from "@/gnr8/runtime/version-lifecycle-rules";

export async function transitionSiteVersionState(input: {
  siteVersionId: string;
  nextState: SiteVersionState;
  actor: string;
  source: "migration" | "ai" | "manual";
  details?: Record<string, unknown>;
}): Promise<{ previousState: SiteVersionState; nextState: SiteVersionState }> {
  const currentState = await getVersionState(input.siteVersionId);
  if (!currentState) throw new Error("SiteVersion not found");

  assertLifecycleTransition({ currentState, nextState: input.nextState });

  await setSiteVersionState({
    siteVersionId: input.siteVersionId,
    expectedCurrentState: currentState,
    nextState: input.nextState,
    actor: input.actor,
    source: input.source,
    details: input.details,
  });

  return { previousState: currentState, nextState: input.nextState };
}
