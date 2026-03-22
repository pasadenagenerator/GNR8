import { saveFormSubmission } from "@/gnr8/runtime/runtime-store";
import type { VersionScopedFormSubmission } from "@/gnr8/runtime/types";

export async function processVersionScopedFormSubmission(input: VersionScopedFormSubmission) {
  if (!String(input.formId ?? "").trim()) throw new Error("formId is required");
  if (!String(input.pagePath ?? "").trim()) throw new Error("pagePath is required");

  return saveFormSubmission(input);
}
