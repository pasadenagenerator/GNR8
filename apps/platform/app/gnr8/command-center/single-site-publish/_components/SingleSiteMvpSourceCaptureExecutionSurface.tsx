"use client";

import {
  createSingleSiteMvpSourceCaptureRedactedResult,
  createSingleSiteMvpSourceCaptureRequestBody,
  hasExactSingleSiteMvpSourceCaptureConfirmation,
  SINGLE_SITE_MVP_SOURCE_CAPTURE_CONFIRMATION,
  SINGLE_SITE_MVP_SOURCE_CAPTURE_ROUTE_PATH,
  type SingleSiteMvpSourceCaptureExecutionInput,
  type SingleSiteMvpSourceCaptureRedactedResult,
} from "@/gnr8/single-site/single-site-mvp-source-capture-execution-contract";
import React, { useMemo, useState, type ChangeEvent, type FormEvent } from "react";

const EMPTY_FORM: SingleSiteMvpSourceCaptureExecutionInput = {
  clientId: "",
  agencyId: "",
  url: "",
  rehearsalPosture: "internal test",
  idempotencyKey: "",
  correlationId: "",
  explicitConfirmation: "",
};

function inputStyle() {
  return {
    width: "100%",
    boxSizing: "border-box" as const,
    border: "1px solid #d1d5db",
    borderRadius: 6,
    padding: "8px",
    color: "#111827",
    background: "#fff",
    fontFamily: "monospace",
    fontSize: 12,
  };
}

function updateField(
  value: SingleSiteMvpSourceCaptureExecutionInput,
  field: keyof SingleSiteMvpSourceCaptureExecutionInput,
  next: string,
): SingleSiteMvpSourceCaptureExecutionInput {
  return { ...value, [field]: next };
}

function redactedResultRows(result: SingleSiteMvpSourceCaptureRedactedResult) {
  return [
    ["Route", result.route],
    ["HTTP Status", result.httpStatus ?? "request_failed"],
    ["OK", result.ok ?? "redacted"],
    ["Result", result.resultStatus],
    ["Diagnostics Count", result.diagnosticsCount],
    ["Redactions Count", result.redactionsCount],
    ["Mutation Flags", result.mutationFlagsStatus],
    ["Error", result.error ?? "none"],
  ] as const;
}

export function SingleSiteMvpSourceCaptureExecutionSurface() {
  const [form, setForm] = useState<SingleSiteMvpSourceCaptureExecutionInput>(EMPTY_FORM);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<SingleSiteMvpSourceCaptureRedactedResult | null>(null);
  const exactConfirmation = hasExactSingleSiteMvpSourceCaptureConfirmation(form);
  const canSubmit = useMemo(() => {
    return Boolean(
      form.clientId.trim() &&
        form.agencyId.trim() &&
        form.url.trim() &&
        form.rehearsalPosture.trim() &&
        form.idempotencyKey.trim() &&
        form.correlationId.trim() &&
        exactConfirmation,
    );
  }, [form, exactConfirmation]);

  const onChange = (field: keyof SingleSiteMvpSourceCaptureExecutionInput) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((current) => updateField(current, field, event.target.value));
    };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || pending) return;

    setPending(true);
    setResult(null);

    try {
      const response = await fetch(SINGLE_SITE_MVP_SOURCE_CAPTURE_ROUTE_PATH, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createSingleSiteMvpSourceCaptureRequestBody(form)),
      });
      const body = await response.json().catch(() => null);
      setResult(createSingleSiteMvpSourceCaptureRedactedResult({ httpStatus: response.status, body }));
    } catch {
      setResult(createSingleSiteMvpSourceCaptureRedactedResult({
        httpStatus: null,
        body: null,
        fallbackError: "SOURCE_CAPTURE_BROWSER_REQUEST_FAILED",
      }));
    } finally {
      setPending(false);
    }
  };

  return (
    <section style={{ border: "1px solid #fecaca", borderRadius: 10, background: "#fff", padding: 14 }}>
      <div style={{ display: "grid", gap: 4, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: "#991b1b" }}>Source Capture Execution</h2>
        <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>
          Superadmin-only source-capture request surface for the selected single-site MVP rehearsal site.
        </p>
      </div>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
          <label style={{ display: "grid", gap: 4, color: "#475569", fontSize: 13 }}>
            clientId
            <input name="clientId" value={form.clientId} onChange={onChange("clientId")} style={inputStyle()} />
          </label>
          <label style={{ display: "grid", gap: 4, color: "#475569", fontSize: 13 }}>
            agencyId
            <input name="agencyId" value={form.agencyId} onChange={onChange("agencyId")} style={inputStyle()} />
          </label>
          <label style={{ display: "grid", gap: 4, color: "#475569", fontSize: 13 }}>
            url
            <input name="url" value={form.url} onChange={onChange("url")} style={inputStyle()} />
          </label>
          <label style={{ display: "grid", gap: 4, color: "#475569", fontSize: 13 }}>
            rehearsalPosture
            <input name="rehearsalPosture" value={form.rehearsalPosture} onChange={onChange("rehearsalPosture")} style={inputStyle()} />
          </label>
          <label style={{ display: "grid", gap: 4, color: "#475569", fontSize: 13 }}>
            idempotencyKey
            <input name="idempotencyKey" value={form.idempotencyKey} onChange={onChange("idempotencyKey")} style={inputStyle()} />
          </label>
          <label style={{ display: "grid", gap: 4, color: "#475569", fontSize: 13 }}>
            correlationId
            <input name="correlationId" value={form.correlationId} onChange={onChange("correlationId")} style={inputStyle()} />
          </label>
        </div>
        <label style={{ display: "grid", gap: 4, color: "#475569", fontSize: 13 }}>
          explicitConfirmation
          <textarea
            name="explicitConfirmation"
            value={form.explicitConfirmation}
            onChange={onChange("explicitConfirmation")}
            rows={3}
            style={{ ...inputStyle(), resize: "vertical" }}
          />
        </label>
        <div style={{ border: "1px solid #fee2e2", borderRadius: 8, background: "#fff1f2", padding: 10, minWidth: 0 }}>
          <div style={{ color: "#991b1b", fontSize: 12, fontWeight: 900, marginBottom: 4 }}>Required exact confirmation</div>
          <code style={{ color: "#111827", fontSize: 12, overflowWrap: "anywhere" }}>
            {SINGLE_SITE_MVP_SOURCE_CAPTURE_CONFIRMATION}
          </code>
        </div>
        <button
          type="submit"
          disabled={!canSubmit || pending}
          style={{
            justifySelf: "start",
            border: "1px solid #991b1b",
            borderRadius: 6,
            padding: "8px 12px",
            background: canSubmit && !pending ? "#991b1b" : "#f1f5f9",
            color: canSubmit && !pending ? "#fff" : "#64748b",
            cursor: canSubmit && !pending ? "pointer" : "not-allowed",
            fontWeight: 900,
          }}
        >
          {pending ? "Sending Source Capture POST" : "Send Source Capture POST"}
        </button>
      </form>
      {result ? (
        <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
          <h3 style={{ margin: "0 0 8px", fontSize: 15, color: "#0f172a" }}>Redacted Response Status</h3>
          <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            {redactedResultRows(result).map(([label, value]) => (
              <div key={label} style={{ minWidth: 0 }}>
                <dt style={{ marginBottom: 4, fontSize: 12, color: "#64748b" }}>{label}</dt>
                <dd style={{ margin: 0, color: "#111827", fontFamily: "monospace", fontSize: 12, overflowWrap: "anywhere" }}>
                  {String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </section>
  );
}
