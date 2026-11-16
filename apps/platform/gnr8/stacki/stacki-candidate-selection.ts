import { parseStackiScope, StackiDraftError, STACKI_DRAFT_MAX_REVISIONS, type StackiDraftScope } from "./stacki-draft-contract";

export type StackiCandidateSelection = { scope: StackiDraftScope; revision: number; sha256: string };
export function parseStackiCandidateSelection(value: unknown): StackiCandidateSelection {
  const v = value as StackiCandidateSelection | null;
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).sort().join() !== "revision,scope,sha256" ||
    !Number.isSafeInteger(v.revision) || v.revision < 1 || v.revision > STACKI_DRAFT_MAX_REVISIONS ||
    typeof v.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(v.sha256))
    throw new StackiDraftError(422, "STACKI_CANDIDATE_SELECTION_INVALID");
  return { scope: parseStackiScope(v.scope), revision: v.revision, sha256: v.sha256 };
}
