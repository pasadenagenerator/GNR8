"use client";

import React, { useState } from "react";
import { submitGovernanceAuthorizationIntent } from "@/app/gnr8/admin/provider-handoffs/[handoffId]/readiness/governance-authorization-intent-submit";

type GovernanceAuthorizationIntentFormProps = {
  handoffId: string;
};

const AUTHORIZATION_STATUSES = [
  "not_requested",
  "pending_authorization",
  "authorized_for_future_execution",
  "denied",
] as const;

export function GovernanceAuthorizationIntentForm(props: GovernanceAuthorizationIntentFormProps) {
  const [authorizationStatus, setAuthorizationStatus] = useState<(typeof AUTHORIZATION_STATUSES)[number]>("pending_authorization");
  const [authorizationReason, setAuthorizationReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const result = await submitGovernanceAuthorizationIntent({
        handoffId: props.handoffId,
        authorizationStatus,
        authorizationReason,
      });
      if (!result.ok) {
        setErrorMessage(result.errorMessage);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save authorization intent.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, background: "#f9fafb" }}>
      <h3 style={{ margin: "0 0 8px 0", fontSize: 14 }}>Save governance authorization intent</h3>
      <p style={{ margin: "0 0 10px 0", color: "#7f1d1d", fontSize: 13 }}>
        Intent only. Execution remains blocked even when authorized for future execution.
      </p>
      <label style={{ display: "block", marginBottom: 8 }}>
        <span style={{ display: "block", marginBottom: 4 }}>Status</span>
        <select
          value={authorizationStatus}
          onChange={(event) => setAuthorizationStatus(event.target.value as (typeof AUTHORIZATION_STATUSES)[number])}
        >
          {AUTHORIZATION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "block", marginBottom: 8 }}>
        <span style={{ display: "block", marginBottom: 4 }}>Reason</span>
        <textarea
          value={authorizationReason}
          onChange={(event) => setAuthorizationReason(event.target.value)}
          rows={3}
          style={{ width: "100%", maxWidth: 560 }}
          placeholder="Authorization rationale (intent only)"
        />
      </label>
      <button type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Save authorization intent"}
      </button>
      {errorMessage ? <p style={{ color: "#991b1b", marginTop: 8 }}>{errorMessage}</p> : null}
    </form>
  );
}
