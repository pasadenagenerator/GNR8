import React, { type ReactNode } from "react";

import type {
  AirshipAgencyAISettingsReadModel,
  AirshipAgentProfileReadModel,
  AirshipAIProviderConnectionStatus,
  AirshipAIProviderReadModel,
} from "@/gnr8/single-site/airship-agent-profile-types";
import { OpenAIKeyForm } from "./openai-key-form";
import type { Gnr8AiUsage, Gnr8StackiNativeAiUsage } from "@/gnr8/ai/usage-read-model";

type Props = {
  model: AirshipAgencyAISettingsReadModel;
  usage?: Gnr8AiUsage;
  nativeUsage?: Gnr8StackiNativeAiUsage;
};

function labelize(value: string): string {
  return value.replaceAll("_", " ");
}

function badge(value: string, tone: "good" | "warn" | "neutral" = "neutral") {
  const palette = {
    good: { border: "#86efac", background: "#f0fdf4", color: "#166534" },
    warn: { border: "#fbbf24", background: "#fffbeb", color: "#92400e" },
    neutral: { border: "#cbd5e1", background: "#f8fafc", color: "#334155" },
  }[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        border: `1px solid ${palette.border}`,
        borderRadius: 8,
        padding: "4px 8px",
        background: palette.background,
        color: palette.color,
        fontSize: 12,
        fontWeight: 850,
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      {labelize(value)}
    </span>
  );
}

function statusTone(status: AirshipAIProviderConnectionStatus): "good" | "warn" | "neutral" {
  if (status === "connected") return "good";
  if (status === "planned") return "neutral";
  return "warn";
}

function fact(label: string, value: ReactNode) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 850 }}>{label}</div>
      <div style={{ marginTop: 5, color: "#0f172a", fontSize: 15, fontWeight: 850, overflowWrap: "anywhere" }}>{value}</div>
    </div>
  );
}

function providerRow(provider: AirshipAIProviderReadModel) {
  return (
    <tr key={provider.provider}>
      <td style={cellStyle}><strong>{provider.displayName}</strong><div style={mutedStyle}>{provider.provider}</div></td>
      <td style={cellStyle}>{badge(provider.connectionStatus, statusTone(provider.connectionStatus))}</td>
      <td style={cellStyle}><code>{provider.maskedKey ?? "not connected"}</code></td>
      <td style={cellStyle}>{provider.model ?? "planned"}</td>
      <td style={cellStyle}>{provider.purpose}</td>
      <td style={cellStyle}>{provider.planned ? badge("planned", "neutral") : provider.enabled ? badge("enabled", "good") : badge("disabled", "warn")}</td>
      <td style={cellStyle}><span style={mutedStyle}>{provider.note}</span></td>
    </tr>
  );
}

function profileRow(profile: AirshipAgentProfileReadModel) {
  return (
    <tr key={profile.profileId}>
      <td style={cellStyle}><strong>{profile.profileName}</strong><div style={mutedStyle}>{profile.profileId}</div></td>
      <td style={cellStyle}>{profile.provider}</td>
      <td style={cellStyle}>{profile.model}</td>
      <td style={cellStyle}>{profile.purpose}</td>
      <td style={cellStyle}>{badge(profile.costPosture, profile.costPosture === "best" ? "warn" : profile.costPosture === "cheap" ? "neutral" : "good")}</td>
      <td style={cellStyle}>{profile.enabled ? badge("enabled", "good") : badge("disabled", "warn")}</td>
      <td style={cellStyle}>{profile.defaultProfile ? badge("default", "good") : badge("not default", "neutral")}</td>
    </tr>
  );
}

const cellStyle = {
  borderTop: "1px solid #e2e8f0",
  padding: "10px 8px",
  color: "#0f172a",
  fontSize: 13,
  lineHeight: 1.4,
  verticalAlign: "top",
} as const;

const headerCellStyle = {
  padding: "0 8px 8px",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 900,
  lineHeight: 1.2,
  textAlign: "left",
  textTransform: "uppercase",
} as const;

const mutedStyle = {
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.4,
  overflowWrap: "anywhere",
} as const;

export function AISettingsView({ model, usage, nativeUsage }: Props) {
  const activeProfile = model.selectedAirshipProfile.activeProfile;
  const connectedProviders = model.providers.filter((provider) => provider.connectionStatus === "connected").length;

  return (
    <main style={{ display: "grid", gap: 14, color: "#0f172a" }}>
      <section style={{ border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#0f766e", fontSize: 12, fontWeight: 900, textTransform: "uppercase" }}>Agency-level configuration</div>
            <h1 style={{ margin: "4px 0 0", fontSize: 26, lineHeight: 1.15 }}>{model.title}</h1>
            <p style={{ margin: "8px 0 0", color: "#475569", fontSize: 13, lineHeight: 1.45 }}>
              Central AI provider and Airship agent profile settings for operators. This is not live-site editing.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {badge("key management", "good")}
            {badge("no provider calls", "good")}
            {badge("no raw keys", "good")}
          </div>
        </div>
        <dl style={{ margin: "14px 0 0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {fact("Scope", labelize(model.scope))}
          {fact("Connected providers", connectedProviders)}
          {fact("Default Airship profile", activeProfile ? activeProfile.profileName : "unavailable")}
          {fact("Generated", model.generatedAt)}
        </dl>
      </section>

      <OpenAIKeyForm />

      <section style={{ border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 16 }}>
        <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Skupna poraba AI API</h2>
        {usage?.status === "available" && nativeUsage?.status === "available" &&
          <p><strong>Skupna ocenjena poraba GNR8:</strong> {(usage.estimatedUsd + nativeUsage.estimatedUsd).toFixed(6)} USD</p>}
        {usage?.status === "available" ? <>
          <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            {fact("Poskusi / pilotna meja", `${usage.attempts} / 10`)}
            {fact("Preostali poskusi", usage.remaining)}
            {fact("Vhodni / izhodni žetoni", `${usage.inputTokens} / ${usage.outputTokens}`)}
            {fact("Ocenjena poraba", `${usage.estimatedUsd.toFixed(6)} USD`)}
          </dl>
          {usage.unresolved > 0 && <p>Poskusi brez potrjene porabe: {usage.unresolved}. Za njih je rezervirana zgornja meja.</p>}
          <p style={mutedStyle}>Rezervirana zgornja meja prvotnega pilota: {usage.reservedMaximumUsd.toFixed(4)} USD. Ocena uporablja javni cenik gpt-5.4-mini. Dejansko obračunani znesek in krediti so prikazani v OpenAI.</p>
        </> : <p>Porabe trenutno ni mogoče prebrati. AI proračun ostaja uveljavljen na strežniku.</p>}
        <h3 style={{ fontSize: 16 }}>Stacki nativni AI · meja prvega preizkusa 5 USD</h3>
        {nativeUsage?.status === "available" ? <>
          <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            {fact("AI klici", nativeUsage.attempts)}
            {fact("Vhodni / izhodni žetoni", `${nativeUsage.inputTokens} / ${nativeUsage.outputTokens}`)}
            {fact("Ocenjena poraba Stackija", `${nativeUsage.estimatedUsd.toFixed(6)} USD`)}
            {fact("Preostala rezervirana meja", `${nativeUsage.remainingBudgetUsd.toFixed(2)} USD`)}
          </dl>
          {nativeUsage.unresolved > 0 && <p>Klici brez potrjene porabe: {nativeUsage.unresolved}. Njihova rezervacija ostane upoštevana.</p>}
          <p style={mutedStyle}>Za vsak klic je rezerviranih 0,10 USD; skupno največ 5 USD. To je varna zgornja meja, ne dejanski račun.</p>
        </> : <p>Podatkov o Stackijevi porabi trenutno ni mogoče prebrati.</p>}
        <a href="https://platform.openai.com/analytics/usage" target="_blank" rel="noreferrer">Odpri OpenAI porabo</a>
      </section>

      <section style={{ border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 14, overflowX: "auto" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Providers</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Provider</th>
              <th style={headerCellStyle}>Status</th>
              <th style={headerCellStyle}>Masked key</th>
              <th style={headerCellStyle}>Model</th>
              <th style={headerCellStyle}>Purpose</th>
              <th style={headerCellStyle}>Mode</th>
              <th style={headerCellStyle}>Operator note</th>
            </tr>
          </thead>
          <tbody>{model.providers.map(providerRow)}</tbody>
        </table>
      </section>

      <section style={{ border: "1px solid #dbe3ee", borderRadius: 8, background: "#fff", padding: 14, overflowX: "auto" }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Airship Agent Profiles</h2>
        {model.selectedAirshipProfile.status === "unavailable" ? (
          <p style={{ margin: "0 0 10px", color: "#92400e", fontSize: 13, lineHeight: 1.45 }}>
            Default Airship profile is unavailable. The editor will remain usable with AI commands disabled.
          </p>
        ) : null}
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              <th style={headerCellStyle}>Profile name</th>
              <th style={headerCellStyle}>Provider</th>
              <th style={headerCellStyle}>Model</th>
              <th style={headerCellStyle}>Purpose</th>
              <th style={headerCellStyle}>Cost posture</th>
              <th style={headerCellStyle}>Enabled</th>
              <th style={headerCellStyle}>Default</th>
            </tr>
          </thead>
          <tbody>{model.profiles.map(profileRow)}</tbody>
        </table>
      </section>
    </main>
  );
}
