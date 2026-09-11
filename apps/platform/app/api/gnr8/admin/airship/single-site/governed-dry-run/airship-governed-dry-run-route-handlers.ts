import {
  runAirshipGovernedDryRun,
  type AirshipGovernedDryRunOutput,
} from "@/gnr8/single-site/airship-governed-dry-run-service";
import { requireSuperadminUserId } from "@/src/auth/require-superadmin-user-id";

type ActionMode = "run_governed_dry_run";

type RouteDeps = {
  requireSuperadminUserId: () => Promise<string>;
  runAirshipGovernedDryRun: typeof runAirshipGovernedDryRun;
};

type ActionBody = Record<string, unknown> & {
  actionMode?: unknown;
  migrationId?: unknown;
  readinessPackageId?: unknown;
  reviewRecordId?: unknown;
  candidateVersionId?: unknown;
  artifactId?: unknown;
  draftId?: unknown;
  draftVersion?: unknown;
  correlationId?: unknown;
  idempotencyKey?: unknown;
};

const POST_BODY_KEYS = new Set([
  "actionMode",
  "migrationId",
  "readinessPackageId",
  "reviewRecordId",
  "candidateVersionId",
  "artifactId",
  "draftId",
  "draftVersion",
  "correlationId",
  "idempotencyKey",
]);
const FORBIDDEN_KEYS = new Set([
  "actor",
  "actorId",
  "actorRole",
  "actorType",
  "role",
  "userId",
  "principal",
  "superadminUserId",
  "apiKey",
  "secret",
  "token",
  "authorization",
  "credential",
  "providerPayload",
  "publish",
  "publishMode",
  "shadowPublish",
  "rollback",
  "sourceCapture",
  "activePointer",
  "runtimeMutation",
  "liveSiteMutation",
]);
const UUIDISH = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function int(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function bodyRecord(body: unknown): ActionBody | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as ActionBody;
}

async function parseRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function statusForAuthError(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Unauthorized") return 401;
  if (message.startsWith("Forbidden")) return 403;
  return 500;
}

function validateUnknownKeys(record: Record<string, unknown>): string[] {
  const errors: string[] = [];
  for (const key of Object.keys(record).sort()) {
    if (FORBIDDEN_KEYS.has(key)) errors.push(`airship_governed_dry_run_forbidden_field:${key}`);
    if (!POST_BODY_KEYS.has(key)) errors.push(`airship_governed_dry_run_unknown_field:${key}`);
  }
  return Array.from(new Set(errors)).sort();
}

function validateRefs(body: ActionBody): string[] {
  const errors: string[] = [];
  for (const field of ["migrationId", "readinessPackageId", "reviewRecordId", "candidateVersionId", "artifactId", "draftId"] as const) {
    const value = text(body[field]);
    if (!value) errors.push(`airship_governed_dry_run_${field}_required`);
    else if (!UUIDISH.test(value)) errors.push(`airship_governed_dry_run_${field}_invalid`);
  }
  if (!int(body.draftVersion)) errors.push("airship_governed_dry_run_draftVersion_invalid");
  return errors;
}

function baseMutationFlags() {
  return {
    dryRunRecordMutation: false,
    dryRunAttemptExecuted: false,
    dryRun: true,
    publishes: false,
    shadowPublish: false,
    runtimeMutation: false,
    activePointerChanged: false,
    liveSiteMutated: false,
    sourceCapture: false,
    providerCall: false,
  };
}

function failure(status: number, error: string, diagnostics: string[]): Response {
  return Response.json(
    {
      ok: false,
      error,
      diagnostics,
      labels: [
        "Airship governed dry-run",
        "Dry-run only",
        "No publish",
        "No shadow-publish",
        "Active pointer unchanged",
        "Live CHS unchanged",
      ],
      mutationFlags: baseMutationFlags(),
      redactions: ["serverActor", "requestActorOverrides", "rawProviderPayloads", "rawSqlErrors", "stackTraces", "secrets", "tokens", "cookies", "billingData"],
    },
    { status, headers: { "cache-control": "no-store" } },
  );
}

function success(output: AirshipGovernedDryRunOutput): Response {
  return Response.json(
    {
      ok: true,
      status: output.status,
      serviceVersion: output.serviceVersion,
      refs: output.refs,
      readiness: output.readiness,
      result: output.result,
      dryRunResult: output.dryRunResult,
      nextStep: output.nextStep,
      labels: [
        "Airship governed dry-run completed",
        "Dry-run only",
        "No publish",
        "No shadow-publish",
        "Active pointer unchanged",
        "Live CHS unchanged",
      ],
      idempotency: {
        scope: "airship_publish_readiness_governed_dry_run",
        reused: output.status === "reused",
        idempotencyKey: output.result.idempotencyKey,
        activePointerChanged: false,
      },
      mutationFlags: output.mutationFlags,
    },
    { status: output.status === "created" ? 201 : 200, headers: { "cache-control": "no-store" } },
  );
}

export function createAirshipGovernedDryRunRouteHandlers(deps: Partial<RouteDeps> = {}) {
  const resolvedDeps: RouteDeps = {
    requireSuperadminUserId,
    runAirshipGovernedDryRun,
    ...deps,
  };

  return {
    async POST(request: Request): Promise<Response> {
      let actorId: string;
      try {
        actorId = await resolvedDeps.requireSuperadminUserId();
      } catch (error) {
        return failure(statusForAuthError(error), "SUPERADMIN_REQUIRED", ["airship_governed_dry_run_superadmin_required"]);
      }

      const body = bodyRecord(await parseRequestBody(request));
      if (!body) return failure(400, "INVALID_AIRSHIP_GOVERNED_DRY_RUN_BODY", ["airship_governed_dry_run_body_must_be_object"]);

      const bodyErrors = [...validateUnknownKeys(body), ...validateRefs(body)];
      if (bodyErrors.length > 0) return failure(400, "INVALID_AIRSHIP_GOVERNED_DRY_RUN_BODY", bodyErrors);

      const actionMode = text(body.actionMode) as ActionMode;
      if (actionMode !== "run_governed_dry_run") {
        return failure(400, "INVALID_AIRSHIP_GOVERNED_DRY_RUN_BODY", ["airship_governed_dry_run_action_mode_invalid"]);
      }

      try {
        const output = await resolvedDeps.runAirshipGovernedDryRun({
          migrationId: text(body.migrationId),
          readinessPackageId: text(body.readinessPackageId),
          reviewRecordId: text(body.reviewRecordId),
          candidateVersionId: text(body.candidateVersionId),
          artifactId: text(body.artifactId),
          draftId: text(body.draftId),
          draftVersion: int(body.draftVersion) ?? 0,
          actorId,
          correlationId: text(body.correlationId) || null,
          idempotencyKey: text(body.idempotencyKey) || null,
        });
        return success(output);
      } catch (error) {
        const diagnostic = error instanceof Error ? error.message : "airship_governed_dry_run_failed";
        return failure(409, "AIRSHIP_GOVERNED_DRY_RUN_REFUSED", [diagnostic]);
      }
    },
  };
}
