import "server-only";

import { getSupabaseServiceRolePageReadClient } from "@/src/supabase/service-role-server";

export type Gnr8AiUsage = {
  status: "available";
  attempts: number;
  completed: number;
  unresolved: number;
  remaining: number;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
  reservedMaximumUsd: number;
} | { status: "unavailable" };

type Reservation = {
  state: string;
  reserved_micro_usd: number;
  input_tokens: number | null;
  output_tokens: number | null;
};

/** Shared Airship and Stacki pilot ledger; estimates use uncached mini list rates. */
export function summarizeGnr8AiUsage(rows: Reservation[]): Gnr8AiUsage {
  if (rows.length > 10 || rows.some(row =>
    !["reserved", "completed", "uncertain"].includes(row.state) || row.reserved_micro_usd !== 7500 ||
    (row.input_tokens !== null && (!Number.isSafeInteger(row.input_tokens) || row.input_tokens < 0)) ||
    (row.output_tokens !== null && (!Number.isSafeInteger(row.output_tokens) || row.output_tokens < 0))))
    return { status: "unavailable" };
  const completed = rows.filter(row => row.state === "completed" && row.input_tokens !== null && row.output_tokens !== null);
  const inputTokens = completed.reduce((sum, row) => sum + row.input_tokens!, 0);
  const outputTokens = completed.reduce((sum, row) => sum + row.output_tokens!, 0);
  return {
    status: "available", attempts: rows.length, completed: completed.length,
    unresolved: rows.length - completed.length, remaining: 10 - rows.length,
    inputTokens, outputTokens,
    estimatedUsd: (inputTokens * 0.75 + outputTokens * 4.5) / 1_000_000,
    reservedMaximumUsd: rows.length * 0.0075,
  };
}

export async function readGnr8AiUsage(): Promise<Gnr8AiUsage> {
  const client = getSupabaseServiceRolePageReadClient();
  if (!client) return { status: "unavailable" };
  const { data, error } = await client.from("gnr8_ai_trial_reservations")
    .select("state,reserved_micro_usd,input_tokens,output_tokens")
    .eq("scope", "gnr8:internal:pilot-1").limit(11);
  if (error || !Array.isArray(data)) return { status: "unavailable" };
  return summarizeGnr8AiUsage(data as Reservation[]);
}
