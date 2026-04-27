"use client";

import { useMemo, useState } from "react";

type DomainBindingStatus = "pending" | "verifying" | "active" | "failed";
type DomainVerificationType = "cname" | "txt";

type DomainBinding = {
  id: string;
  domain: string;
  status: DomainBindingStatus;
  verificationType: DomainVerificationType | null;
  verificationValue: string | null;
  verificationHost: string | null;
  lastCheckedAt: string | null;
};

type Props = {
  agencyId: string;
  clientId: string;
  siteId: string;
  siteVersionId: string | null;
  initialDomain: string | null;
  initialDomainBinding: DomainBinding | null;
  canPublish: boolean;
};

type Notice = {
  tone: "neutral" | "success" | "error";
  text: string;
};

function normalizeDomainInput(value: string): string {
  return value.trim().toLowerCase();
}

function noticeStyle(tone: Notice["tone"]): Record<string, string> {
  if (tone === "success") return { color: "#14532d" };
  if (tone === "error") return { color: "#7f1d1d" };
  return { color: "#334155" };
}

function renderVerificationInstruction(binding: DomainBinding): string | null {
  if (!binding.verificationType || !binding.verificationValue || !binding.verificationHost) return null;
  if (binding.verificationType === "cname") {
    return `Add CNAME: ${binding.verificationHost} -> ${binding.verificationValue}`;
  }
  return `Add TXT: ${binding.verificationHost} -> ${binding.verificationValue}`;
}

export default function SiteDomainSettingsPanel(props: Props) {
  const [domain, setDomain] = useState(props.initialDomain ?? "");
  const [busyMode, setBusyMode] = useState<"connect" | "publish" | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [domainBinding, setDomainBinding] = useState<DomainBinding | null>(props.initialDomainBinding);
  const resolvedSiteVersionId = useMemo(() => (props.siteVersionId ?? "").trim() || null, [props.siteVersionId]);
  const canConnectDomain = props.canPublish && resolvedSiteVersionId != null && normalizeDomainInput(domain).length > 0;

  async function connectDomain(): Promise<void> {
    if (!canConnectDomain || !resolvedSiteVersionId) return;
    setBusyMode("connect");
    setNotice(null);
    try {
      const response = await fetch(
        `/api/gnr8/agency/clients/${encodeURIComponent(props.clientId)}/sites/${encodeURIComponent(props.siteId)}/domain`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            agencyId: props.agencyId,
            domain: normalizeDomainInput(domain),
            siteVersionId: resolvedSiteVersionId,
          }),
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        domain?: string;
        binding?: DomainBinding;
      };
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || "Failed to connect domain.");
      }
      const nextDomain = payload.domain ?? normalizeDomainInput(domain);
      setDomain(nextDomain);
      setDomainBinding(payload.binding ?? null);
      const instruction = payload.binding ? renderVerificationInstruction(payload.binding) : null;
      setNotice({
        tone: "success",
        text:
          payload.binding?.status === "active"
            ? "Domain connected and verified."
            : instruction ?? "Domain connected. DNS verification is in progress.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to connect domain.",
      });
    } finally {
      setBusyMode(null);
    }
  }

  async function publishSite(): Promise<void> {
    if (!props.canPublish || !resolvedSiteVersionId) return;
    setBusyMode("publish");
    setNotice(null);
    try {
      const response = await fetch(`/api/gnr8/runtime/versions/${encodeURIComponent(resolvedSiteVersionId)}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actor: "operator:site-settings-domain-publish",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        activated_domain_bindings?: number;
        domain_warning?: string | null;
      };
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || "Failed to publish runtime version.");
      }
      setNotice({
        tone: payload.domain_warning ? "neutral" : "success",
        text:
          payload.domain_warning ??
          `Published. Active domain bindings updated: ${Math.max(0, Number(payload.activated_domain_bindings ?? 0))}.`,
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to publish runtime version.",
      });
    } finally {
      setBusyMode(null);
    }
  }

  const verificationInstruction = domainBinding ? renderVerificationInstruction(domainBinding) : null;

  return (
    <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
      <div style={{ display: "grid", gap: 6 }}>
        <label htmlFor="site-domain-input" style={{ color: "#0f172a", fontSize: 12, fontWeight: 700 }}>
          Custom domain
        </label>
        <input
          id="site-domain-input"
          type="text"
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="example.com"
          disabled={!props.canPublish || busyMode != null}
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 13,
            color: "#0f172a",
            background: props.canPublish ? "#fff" : "#f8fafc",
          }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={connectDomain}
          disabled={!canConnectDomain || busyMode != null}
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            padding: "8px 10px",
            background: "#fff",
            color: "#0f172a",
            fontSize: 12,
            fontWeight: 700,
            cursor: canConnectDomain && busyMode == null ? "pointer" : "not-allowed",
          }}
        >
          {busyMode === "connect" ? "Connecting..." : "Connect domain"}
        </button>
        <button
          type="button"
          onClick={publishSite}
          disabled={!props.canPublish || resolvedSiteVersionId == null || busyMode != null}
          style={{
            border: "1px solid #0f172a",
            borderRadius: 8,
            padding: "8px 10px",
            background: "#0f172a",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: props.canPublish && resolvedSiteVersionId != null && busyMode == null ? "pointer" : "not-allowed",
          }}
        >
          {busyMode === "publish" ? "Publishing..." : "Publish"}
        </button>
      </div>

      {domainBinding?.status === "verifying" || domainBinding?.status === "pending" ? (
        <p style={{ margin: 0, color: "#475569", fontSize: 12 }}>
          {verificationInstruction ?? "Verification pending. Add the DNS record and wait for Vercel to verify."}
        </p>
      ) : null}
      {domainBinding?.status === "active" ? (
        <p style={{ margin: 0, color: "#14532d", fontSize: 12 }}>Domain connected.</p>
      ) : null}
      {domainBinding?.status === "failed" ? (
        <p style={{ margin: 0, color: "#7f1d1d", fontSize: 12 }}>
          Domain verification failed. Reconnect the domain and re-check DNS records.
        </p>
      ) : null}

      {notice ? (
        <p style={{ margin: 0, fontSize: 12, ...noticeStyle(notice.tone) }}>
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}
