function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

export function createGovernanceAuthorizationIntentEndpoint(handoffId: string): string {
  return `/api/gnr8/admin/provider-handoffs/${encodeURIComponent(sanitizeToken(handoffId))}/authorization`;
}

export async function submitGovernanceAuthorizationIntent(input: {
  handoffId: string;
  authorizationStatus: "not_requested" | "pending_authorization" | "authorized_for_future_execution" | "denied";
  authorizationReason: string;
  fetchImpl?: typeof fetch;
  reload?: () => void;
}): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(createGovernanceAuthorizationIntentEndpoint(input.handoffId), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      authorizationStatus: input.authorizationStatus,
      authorizationReason: sanitizeToken(input.authorizationReason),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
    const message = sanitizeToken(payload.error) || `Failed to save authorization intent (HTTP ${response.status}).`;
    return { ok: false, errorMessage: message };
  }

  const reload = input.reload ?? (() => window.location.reload());
  reload();
  return { ok: true };
}
