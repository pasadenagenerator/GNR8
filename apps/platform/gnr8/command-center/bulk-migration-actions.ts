import type { BulkActionItemResult, BulkActionReasonCode, BulkActionResult, BulkMigrationActionType } from "@/gnr8/command-center/bulk-action-types";
import { summarizeBulkActionResult } from "@/gnr8/command-center/bulk-action-types";
import { canPerformAction, type AgencyRole } from "@/src/auth/rbac";

type MigrationStatus = "NOT_STARTED" | "IMPORTED" | "PREVIEW_READY" | "APPROVED" | "LIVE" | "ERROR" | "UNKNOWN";

export type BulkMigrationActionItemInput = {
  site_id: string;
  domain: string | null;
  agency_id: string | null;
  status: MigrationStatus;
  latest_site_version_id: string | null;
};

type RunBulkMigrationActionsInput = {
  actorRole: AgencyRole | null;
  action: BulkMigrationActionType;
  items: BulkMigrationActionItemInput[];
};

type ParsedResponseError = {
  status: number;
  error: string;
  message: string;
};

function toErrorMessage(value: unknown): string {
  if (typeof value !== "string") return "Request failed";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Request failed";
}

function buildImportUrlFromDomain(domain: string | null): string | null {
  const raw = String(domain ?? "").trim();
  if (!raw) return null;

  try {
    const parsed = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function parseTransientSignal(input: { status?: number; message: string }): boolean {
  const normalized = input.message.toLowerCase();
  if (typeof input.status === "number" && input.status >= 500) return true;
  return (
    normalized.includes("network") ||
    normalized.includes("timeout") ||
    normalized.includes("temporar") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("service unavailable")
  );
}

function mapInvalidStateSkip(item: BulkMigrationActionItemInput, action: BulkMigrationActionType): BulkActionItemResult {
  if (action === "import" && item.status === "LIVE") {
    return {
      site_id: item.site_id,
      domain: item.domain,
      attempted: false,
      outcome: "skipped",
      reason_code: "ALREADY_LIVE",
      reason_message: "Site is already live; import skipped.",
      retryable: false,
    };
  }

  if (action === "import" && item.status === "APPROVED") {
    return {
      site_id: item.site_id,
      domain: item.domain,
      attempted: false,
      outcome: "skipped",
      reason_code: "ALREADY_APPROVED",
      reason_message: "Site version is already approved; import skipped.",
      retryable: false,
    };
  }

  if (action === "approve" && (item.status === "APPROVED" || item.status === "LIVE")) {
    return {
      site_id: item.site_id,
      domain: item.domain,
      attempted: false,
      outcome: "skipped",
      reason_code: "ALREADY_APPROVED",
      reason_message: "Site version already approved for this step.",
      retryable: false,
    };
  }

  if (action === "publish" && item.status === "LIVE") {
    return {
      site_id: item.site_id,
      domain: item.domain,
      attempted: false,
      outcome: "skipped",
      reason_code: "ALREADY_LIVE",
      reason_message: "Site is already live.",
      retryable: false,
    };
  }

  return {
    site_id: item.site_id,
    domain: item.domain,
    attempted: false,
    outcome: "skipped",
    reason_code: "INVALID_SITE_STATE",
    reason_message: `Cannot ${action} from current state ${item.status}.`,
    retryable: true,
  };
}

function classifyRequestFailure(input: {
  action: BulkMigrationActionType;
  item: BulkMigrationActionItemInput;
  error: ParsedResponseError;
}): BulkActionItemResult {
  const normalizedError = input.error.error.toLowerCase();
  const normalizedMessage = input.error.message.toLowerCase();

  if (
    normalizedError === "publish_enforcement_denied" ||
    normalizedError === "publish_enforcement_review_only_shadow_required" ||
    normalizedMessage.includes("governance")
  ) {
    return {
      site_id: input.item.site_id,
      domain: input.item.domain,
      attempted: true,
      outcome: "failed",
      reason_code: "GOVERNANCE_DENIED",
      reason_message: input.error.message,
      retryable: false,
    };
  }

  if (normalizedMessage.includes("siteversion not found") || normalizedMessage.includes("invalid siteversion transition")) {
    return {
      site_id: input.item.site_id,
      domain: input.item.domain,
      attempted: true,
      outcome: "failed",
      reason_code: "INVALID_SITE_STATE",
      reason_message: input.error.message,
      retryable: false,
    };
  }

  if (input.action === "publish" && normalizedMessage.includes("must be approved before publish")) {
    return {
      site_id: input.item.site_id,
      domain: input.item.domain,
      attempted: true,
      outcome: "failed",
      reason_code: "INVALID_SITE_STATE",
      reason_message: input.error.message,
      retryable: false,
    };
  }

  if (input.action === "import" && (normalizedMessage.includes("url must be valid") || normalizedMessage.includes("upstream html empty"))) {
    return {
      site_id: input.item.site_id,
      domain: input.item.domain,
      attempted: true,
      outcome: "failed",
      reason_code: "IMPORT_SOURCE_MISSING",
      reason_message: input.error.message,
      retryable: false,
    };
  }

  return {
    site_id: input.item.site_id,
    domain: input.item.domain,
    attempted: true,
    outcome: "failed",
    reason_code: "REQUEST_FAILED",
    reason_message: input.error.message,
    retryable: parseTransientSignal({ status: input.error.status, message: input.error.message }),
  };
}

async function parseActionFailure(res: Response): Promise<ParsedResponseError> {
  const payload = (await res.json().catch(() => null)) as { error?: unknown; message?: unknown } | null;
  return {
    status: res.status,
    error: toErrorMessage(payload?.error),
    message: toErrorMessage(payload?.message ?? payload?.error ?? `Request failed (HTTP ${res.status})`),
  };
}

async function runImport(item: BulkMigrationActionItemInput): Promise<BulkActionItemResult> {
  if (item.status !== "NOT_STARTED" && item.status !== "ERROR") {
    return mapInvalidStateSkip(item, "import");
  }

  const importUrl = buildImportUrlFromDomain(item.domain);
  if (!importUrl) {
    return {
      site_id: item.site_id,
      domain: item.domain,
      attempted: false,
      outcome: "failed",
      reason_code: "IMPORT_SOURCE_MISSING",
      reason_message: "Import requires a valid domain URL.",
      retryable: false,
    };
  }

  const res = await fetch("/api/gnr8/runtime/migrate/url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: importUrl,
      actor: "operator:command-center-import",
      slug: "/",
      agencyId: item.agency_id,
    }),
  });

  if (!res.ok) {
    return classifyRequestFailure({ action: "import", item, error: await parseActionFailure(res) });
  }

  const payload = (await res.json().catch(() => null)) as { ok?: unknown; error?: unknown } | null;
  if (!payload || payload.ok !== true) {
    return classifyRequestFailure({
      action: "import",
      item,
      error: {
        status: res.status,
        error: toErrorMessage(payload?.error),
        message: toErrorMessage(payload?.error),
      },
    });
  }

  return {
    site_id: item.site_id,
    domain: item.domain,
    attempted: true,
    outcome: "succeeded",
    reason_code: "SUCCEEDED",
    reason_message: "Import succeeded.",
    retryable: false,
  };
}

async function runApprove(item: BulkMigrationActionItemInput): Promise<BulkActionItemResult> {
  if (item.status !== "PREVIEW_READY") {
    return mapInvalidStateSkip(item, "approve");
  }

  if (!item.latest_site_version_id) {
    return {
      site_id: item.site_id,
      domain: item.domain,
      attempted: false,
      outcome: "failed",
      reason_code: "MISSING_PREVIEW",
      reason_message: "Missing latest site version ID for approval.",
      retryable: false,
    };
  }

  const res = await fetch(`/api/gnr8/runtime/versions/${item.latest_site_version_id}/approve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ actor: "operator:command-center-approve" }),
  });

  if (!res.ok) {
    return classifyRequestFailure({ action: "approve", item, error: await parseActionFailure(res) });
  }

  return {
    site_id: item.site_id,
    domain: item.domain,
    attempted: true,
    outcome: "succeeded",
    reason_code: "SUCCEEDED",
    reason_message: "Approve succeeded.",
    retryable: false,
  };
}

async function runPublish(item: BulkMigrationActionItemInput): Promise<BulkActionItemResult> {
  if (item.status !== "APPROVED") {
    return mapInvalidStateSkip(item, "publish");
  }

  if (!item.latest_site_version_id) {
    return {
      site_id: item.site_id,
      domain: item.domain,
      attempted: false,
      outcome: "failed",
      reason_code: "MISSING_PREVIEW",
      reason_message: "Missing latest site version ID for publish.",
      retryable: false,
    };
  }

  const res = await fetch(`/api/gnr8/runtime/versions/${item.latest_site_version_id}/publish`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ actor: "operator:command-center-publish" }),
  });

  if (!res.ok) {
    return classifyRequestFailure({ action: "publish", item, error: await parseActionFailure(res) });
  }

  const payload = (await res.json().catch(() => null)) as { ok?: unknown; error?: unknown } | null;
  if (payload && payload.ok === false) {
    return classifyRequestFailure({
      action: "publish",
      item,
      error: {
        status: res.status,
        error: toErrorMessage(payload.error),
        message: toErrorMessage(payload.error),
      },
    });
  }

  return {
    site_id: item.site_id,
    domain: item.domain,
    attempted: true,
    outcome: "succeeded",
    reason_code: "SUCCEEDED",
    reason_message: "Publish succeeded.",
    retryable: false,
  };
}

function classifyCaughtError(input: { item: BulkMigrationActionItemInput; error: unknown }): BulkActionItemResult {
  const message = input.error instanceof Error ? input.error.message : "Unknown bulk action failure";
  const normalized = message.toLowerCase();
  const reasonCode: BulkActionReasonCode =
    normalized.includes("failed to fetch") || normalized.includes("network") ? "REQUEST_FAILED" : "UNKNOWN_ERROR";

  return {
    site_id: input.item.site_id,
    domain: input.item.domain,
    attempted: true,
    outcome: "failed",
    reason_code: reasonCode,
    reason_message: message,
    retryable: reasonCode === "REQUEST_FAILED",
  };
}

export async function runBulkMigrationActions(input: RunBulkMigrationActionsInput): Promise<BulkActionResult> {
  const actionToPermission = {
    import: "run_migration",
    approve: "approve_migration",
    publish: "publish",
  } as const;
  const requiredPermission = actionToPermission[input.action];

  if (!canPerformAction(input.actorRole, requiredPermission)) {
    const deniedResults: BulkActionItemResult[] = input.items.map((item) => ({
      site_id: item.site_id,
      domain: item.domain,
      attempted: false,
      outcome: "failed",
      reason_code: "ROLE_FORBIDDEN",
      reason_message: "Your role is not authorized for this bulk action.",
      retryable: false,
    }));
    return summarizeBulkActionResult({
      actionType: input.action,
      totalRequested: input.items.length,
      itemResults: deniedResults,
    });
  }

  const itemResults: BulkActionItemResult[] = [];

  for (const item of input.items) {
    try {
      if (input.action === "import") {
        itemResults.push(await runImport(item));
        continue;
      }

      if (input.action === "approve") {
        itemResults.push(await runApprove(item));
        continue;
      }

      itemResults.push(await runPublish(item));
    } catch (error) {
      itemResults.push(classifyCaughtError({ item, error }));
    }
  }

  return summarizeBulkActionResult({
    actionType: input.action,
    totalRequested: input.items.length,
    itemResults,
  });
}
