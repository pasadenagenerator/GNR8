import type { ValidationRunResult } from "@/gnr8/validation/validation-contract";
import { runFirstRealSiteValidation } from "@/gnr8/validation/runtime/run-first-real-site-validation";

export type ValidationShellError = {
  message: string;
  stack: string | null;
};

export type ValidationShellResponse =
  | {
      kind: "validation_shell_response_v1";
      fixtureId: "real-site-01";
      ok: true;
      result: ValidationRunResult;
      error: null;
    }
  | {
      kind: "validation_shell_response_v1";
      fixtureId: "real-site-01";
      ok: false;
      result: null;
      error: ValidationShellError;
    };

/**
 * Temporary phase-1 validation shell integration.
 * - Executes the existing deterministic `runFirstRealSiteValidation` runner server-side.
 * - Returns a structured response instead of throwing so UIs can fail gracefully.
 */
export async function runValidationShellRealSite01(options?: { requestId?: string }): Promise<ValidationShellResponse> {
  try {
    const result = await runFirstRealSiteValidation({ requestId: options?.requestId ?? "validation-real-site-01" });
    return { kind: "validation_shell_response_v1", fixtureId: "real-site-01", ok: true, result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack ?? null : null;
    return { kind: "validation_shell_response_v1", fixtureId: "real-site-01", ok: false, result: null, error: { message, stack } };
  }
}

