function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

export function createOperatorReviewIntentEndpoint(handoffId: string): string {
  return `/api/gnr8/admin/provider-handoffs/${encodeURIComponent(sanitizeToken(handoffId))}/reviews`;
}

export async function submitOperatorReviewIntent(input: {
  handoffId: string;
  reviewStatus: "pending_review" | "approved_for_future_execution" | "rejected" | "needs_changes";
  reviewReason: string;
  fetchImpl?: typeof fetch;
  reload?: () => void;
}): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(createOperatorReviewIntentEndpoint(input.handoffId), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      reviewStatus: input.reviewStatus,
      reviewReason: sanitizeToken(input.reviewReason),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: unknown };
    const message = sanitizeToken(payload.error) || `Failed to save review intent (HTTP ${response.status}).`;
    return { ok: false, errorMessage: message };
  }

  const reload = input.reload ?? (() => window.location.reload());
  reload();
  return { ok: true };
}
