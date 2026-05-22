"use client";

import React, { useState } from "react";
import { submitOperatorReviewIntent } from "@/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/operator-review-intent-submit";

type OperatorReviewIntentFormProps = {
  handoffId: string;
};

const REVIEW_STATUSES = [
  "pending_review",
  "approved_for_future_execution",
  "rejected",
  "needs_changes",
] as const;

function sanitizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

export function OperatorReviewIntentForm(props: OperatorReviewIntentFormProps) {
  const [reviewStatus, setReviewStatus] = useState<(typeof REVIEW_STATUSES)[number]>("pending_review");
  const [reviewReason, setReviewReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await submitOperatorReviewIntent({
        handoffId: props.handoffId,
        reviewStatus,
        reviewReason,
      });
      if (!result.ok) {
        setErrorMessage(result.errorMessage);
        return;
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save review intent.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, background: "#f9fafb" }}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 14 }}>Create operator review</h3>
      <p style={{ margin: "0 0 10px 0", color: "#7f1d1d", fontSize: 13 }}>
        Saving review intent does not execute provider actions.
      </p>
      <label style={{ display: "block", marginBottom: 8 }}>
        <span style={{ display: "block", marginBottom: 4 }}>Status</span>
        <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as (typeof REVIEW_STATUSES)[number])}>
          {REVIEW_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "block", marginBottom: 8 }}>
        <span style={{ display: "block", marginBottom: 4 }}>Reason</span>
        <textarea
          value={reviewReason}
          onChange={(event) => setReviewReason(event.target.value)}
          rows={3}
          style={{ width: "100%", maxWidth: 560 }}
          placeholder="Review notes (intent only)"
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save review intent"}
      </button>
      {errorMessage ? <p style={{ color: "#991b1b", marginTop: 8 }}>{errorMessage}</p> : null}
    </form>
  );
}
