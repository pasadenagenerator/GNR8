export type MigrationBatchControlAction = "run" | "resume";

export function createMigrationBatchActionEndpoint(batchId: string, action: MigrationBatchControlAction): string {
  return `/api/gnr8/admin/migration-batches/${encodeURIComponent(batchId)}/${action}`;
}

export async function submitMigrationBatchAction(input: {
  endpoint: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean; message: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(input.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "").trim()
        : "";
      return { ok: false, message: error || `Request failed with status ${response.status}` };
    }
    return { ok: true, message: "Migration batch action completed." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Migration batch action failed.",
    };
  }
}
