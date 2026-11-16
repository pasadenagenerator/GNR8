import { StackiDraftError, type StackiDraftScope } from "./stacki-draft-contract";

/** The same pilot boundary applies to direct draft reads/writes and editor sessions. */
export function createStackiPilotAuthorizer(
  authorize: (scope: StackiDraftScope) => Promise<{ userId: string; agencyId: string }>,
  pilotUserId: () => string | undefined,
) {
  return async (scope: StackiDraftScope) => {
    const actor = await authorize(scope);
    if (!pilotUserId() || actor.userId !== pilotUserId())
      throw new StackiDraftError(403, "STACKI_PILOT_ONLY");
    return actor;
  };
}
