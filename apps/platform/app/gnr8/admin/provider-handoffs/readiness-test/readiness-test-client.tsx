"use client";

import React, { useMemo, useState } from "react";

import {
  callReadinessSeedRoute,
  type ReadinessSeedResultModel,
} from "@/app/gnr8/admin/provider-handoffs/readiness-test/readiness-test-presenter";

export function ProviderHandoffReadinessTestClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReadinessSeedResultModel | null>(null);

  const forbiddenControls = useMemo(
    () => ["execute", "retry execution", "dispatch", "run worker", "DNS write", "provider call"],
    [],
  );

  async function onCreateOrReuseSeed() {
    setLoading(true);
    try {
      const next = await callReadinessSeedRoute(fetch);
      setResult(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Readiness seed request failed closed.";
      setResult({
        ok: false,
        status: 500,
        message,
        setupMessage: "Check DATABASE_URL/schema and route health, then retry.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        padding: 18,
        maxWidth: 920,
        margin: "0 auto",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        background: "#f3f6fb",
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22 }}>Admin-only readiness test</h1>
      <p style={{ margin: "8px 0 0 0", color: "#374151", fontWeight: 600 }}>Execution blocked</p>
      <p style={{ margin: "4px 0 0 0", color: "#4b5563" }}>Control-plane review / dry-run artifact inspection only</p>
      <p style={{ margin: "10px 0 0 0", color: "#7c2d12" }}>
        Required production env flag: <code>GNR8_ADMIN_PROVIDER_HANDOFF_READINESS_SEED_ENABLED=1</code>
      </p>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <button
          type="button"
          onClick={onCreateOrReuseSeed}
          disabled={loading}
          style={{
            border: "1px solid #2563eb",
            background: loading ? "#93c5fd" : "#2563eb",
            color: "#ffffff",
            borderRadius: 8,
            padding: "10px 12px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Seeding readiness handoff..." : "Create or reuse deterministic readiness test handoff"}
        </button>

        <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13 }}>
          Forbidden controls are intentionally absent: {forbiddenControls.join(", ")}.
        </div>
      </section>

      {result ? (
        <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Seed response</h2>
          {result.ok ? (
            <>
              <div><strong>ok:</strong> true</div>
              <div><strong>handoffId:</strong> {result.handoffId}</div>
              <div><strong>readinessUrl:</strong> {result.readinessUrl}</div>
              <div><strong>reusedExisting:</strong> {String(result.reusedExisting)}</div>
              <div><strong>executionBlocked:</strong> {String(result.executionBlocked)}</div>
              <div><strong>nextAllowedAction:</strong> {result.nextAllowedAction}</div>
              <div><strong>diagnostics:</strong> {result.diagnostics.join(", ") || "none"}</div>
              <div><strong>warning:</strong> {result.warning || "none"}</div>
              <a href={result.readinessUrl} style={{ display: "inline-block", marginTop: 10 }}>
                Open readiness inspection
              </a>
            </>
          ) : (
            <>
              <div><strong>ok:</strong> false</div>
              <div><strong>status:</strong> {result.status}</div>
              <div><strong>error:</strong> {result.message}</div>
              <div><strong>setup:</strong> {result.setupMessage}</div>
            </>
          )}
        </section>
      ) : null}
    </main>
  );
}
