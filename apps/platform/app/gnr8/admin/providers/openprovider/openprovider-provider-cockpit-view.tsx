"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { OpenproviderDnsRecordInventoryResult } from "@/gnr8/runtime/providers/openprovider/openprovider-dns-record-inventory";
import type {
  OpenproviderDomainAvailabilityResult,
  OpenproviderDomainAvailabilityStatus,
  OpenproviderDomainAvailabilityValue,
} from "@/gnr8/runtime/providers/openprovider/openprovider-domain-availability";
import type { OpenproviderDomainInventoryResult } from "@/gnr8/runtime/providers/openprovider/openprovider-domain-inventory";

type BadgeLevel = "success" | "warning" | "critical" | "neutral";
type ProviderMode = "sandbox" | "live" | "unknown";
type AuthStatus = "connected" | "unavailable";
type AvailabilityStatus = "working" | "unavailable";
type CapabilityKey = "domains" | "dns" | "availability" | "registration" | "execution";
type CapabilityStatus = "working" | "disabled" | "blocked";
type CapabilityReadiness = "sandbox_verified" | "not_enabled" | "control_plane_only";

type CockpitPayload = {
  provider: "openprovider";
  mode: ProviderMode;
  auth: AuthStatus;
  availabilityHealth: AvailabilityStatus;
  domainsCount: number;
  dnsRecordsCount: number;
  diagnostics: string[];
  domainInventory: (OpenproviderDomainInventoryResult & { error?: string }) | { error?: string; diagnostics: string[] };
  dnsInventory: (OpenproviderDnsRecordInventoryResult & { fetchedAt: string; error?: string }) | { error?: string; diagnostics: string[] };
  availability: (OpenproviderDomainAvailabilityResult & { error?: string }) | { error?: string; diagnostics: string[] };
};

const BADGE_THEME: Record<BadgeLevel, { bg: string; border: string; text: string }> = {
  success: { bg: "#dcfce7", border: "#86efac", text: "#166534" },
  warning: { bg: "#fef3c7", border: "#fcd34d", text: "#92400e" },
  critical: { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
  neutral: { bg: "#e5e7eb", border: "#d1d5db", text: "#1f2937" },
};

function Badge(props: { level: BadgeLevel }) {
  const theme = BADGE_THEME[props.level];
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        width: 10,
        height: 10,
        minWidth: 10,
        minHeight: 10,
        borderRadius: 999,
        border: `1px solid ${theme.border}`,
        background: theme.bg,
      }}
    />
  );
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "unknown";
  return parsed.toISOString();
}

function resolveBadgeLevel(value: string): BadgeLevel {
  if (["available", "connected", "working"].includes(value)) return "success";
  if (value === "sandbox_verified") return "success";
  if (value === "not_enabled") return "warning";
  if (["empty", "unknown"].includes(value)) return "warning";
  if (value === "control_plane_only") return "critical";
  if (["blocked", "failed_closed"].includes(value)) return "critical";
  return "neutral";
}

function resolveAvailabilityBadgeLevel(value: OpenproviderDomainAvailabilityValue | undefined): BadgeLevel {
  if (value === true) return "success";
  if (value === false) return "critical";
  return "warning";
}

function SummaryCard(props: { label: string; value: string }) {
  return (
    <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
      <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 700, letterSpacing: 0.2 }}>{props.label}</div>
      <div style={{ color: "#111827", fontSize: 18, fontWeight: 700, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
        {props.value}
        <Badge level={resolveBadgeLevel(props.value)} />
      </div>
    </section>
  );
}

function renderDiagnostics(values: string[]) {
  if (values.length === 0) return <p style={{ margin: 0, color: "#4b5563" }}>No diagnostics available.</p>;
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {values.map((diagnostic) => (
        <li key={diagnostic}>{diagnostic}</li>
      ))}
    </ul>
  );
}

const CAPABILITY_KEYS: CapabilityKey[] = ["domains", "dns", "availability", "registration", "execution"];
const CAPABILITY_LABELS: Record<CapabilityKey, string> = {
  domains: "Domains",
  dns: "DNS",
  availability: "Availability",
  registration: "Registration",
  execution: "Execution",
};
const CAPABILITY_STATUS_DETAILS: Record<
  CapabilityKey,
  { status: CapabilityStatus; readiness: CapabilityReadiness; explanation: string }
> = {
  domains: {
    status: "working",
    readiness: "sandbox_verified",
    explanation: "Real provider domain inventory reads are operational through Openprovider read-only APIs.",
  },
  dns: {
    status: "working",
    readiness: "sandbox_verified",
    explanation: "Real provider DNS inventory reads are operational through Openprovider read-only APIs.",
  },
  availability: {
    status: "working",
    readiness: "sandbox_verified",
    explanation: "Real provider availability lookups are operational through Openprovider read-only APIs.",
  },
  registration: {
    status: "disabled",
    readiness: "not_enabled",
    explanation: "Provider registration flows are intentionally blocked by execution boundaries.",
  },
  execution: {
    status: "blocked",
    readiness: "control_plane_only",
    explanation: "Queue, worker, and provider execution layers remain intentionally disabled.",
  },
};

export function OpenproviderProviderCockpitView(props: { payload: CockpitPayload }) {
  const searchParams = useSearchParams();
  const requestedDomain = useMemo(() => (searchParams.get("domain") ?? "").trim().toLowerCase(), [searchParams]);
  const selectedDomain = requestedDomain || "levi-testis.com";
  const [availability, setAvailability] = useState<Partial<OpenproviderDomainAvailabilityResult>>(props.payload.availability);

  useEffect(() => {
    if (!requestedDomain) return;

    let cancelled = false;
    const endpoint = `/api/gnr8/admin/providers/openprovider/domain-availability?domain=${encodeURIComponent(requestedDomain)}`;

    void fetch(endpoint, { method: "GET", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled || !payload || typeof payload !== "object") return;
        setAvailability(payload as Partial<OpenproviderDomainAvailabilityResult>);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [requestedDomain]);

  return (
    <main
      style={{
        padding: 16,
        maxWidth: 1180,
        margin: "0 auto",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        background: "#f3f6fb",
      }}
    >
      <section
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          border: "1px solid #dbe3ea",
          borderRadius: 12,
          padding: 14,
          background: "#ffffff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>Openprovider Provider Cockpit</h1>
        <p style={{ margin: "8px 0 0 0", color: "#374151", fontWeight: 700 }}>
          Provider reality surface (read-only boundary active)
        </p>
      </section>

      <section
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 10,
        }}
      >
        <SummaryCard label="Provider" value="openprovider" />
        <SummaryCard label="Mode" value={props.payload.mode} />
        <SummaryCard label="Execution" value="blocked" />
        <SummaryCard label="Auth" value={props.payload.auth} />
        <SummaryCard label="Domains" value={String(props.payload.domainsCount)} />
        <SummaryCard label="DNS Records" value={String(props.payload.dnsRecordsCount)} />
        <SummaryCard label="Availability" value={props.payload.availabilityHealth} />
        <SummaryCard label="Boundary" value="read-only active" />
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Provider Status</h2>
        <div><strong>auth status</strong>: {props.payload.auth}</div>
        <div><strong>executionBlocked</strong>: true</div>
        <div><strong>readOnly</strong>: true</div>
        <div><strong>environment</strong>: {props.payload.mode}</div>
        <div><strong>diagnostic count</strong>: {props.payload.diagnostics.length}</div>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Provider Surfaces</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/gnr8/admin/providers/openprovider/domains" style={{ color: "#0f172a", textDecoration: "underline", fontWeight: 700 }}>
            Domain Inventory
          </Link>
          <Link href="/gnr8/admin/providers/openprovider/dns" style={{ color: "#0f172a", textDecoration: "underline", fontWeight: 700 }}>
            DNS Inventory
          </Link>
        </div>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Domain Inventory</h2>
        <div><strong>domains</strong>: {props.payload.domainsCount}</div>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>DNS Inventory</h2>
        <div><strong>records</strong>: {props.payload.dnsRecordsCount}</div>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Provider Capability Status</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {CAPABILITY_KEYS.map((capability) => {
            const details = CAPABILITY_STATUS_DETAILS[capability];
            return (
              <section key={capability} style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12 }}>
                <h3 style={{ margin: "0 0 8px 0", fontSize: 15 }}>{CAPABILITY_LABELS[capability]}</h3>
                <div style={{ marginTop: 4 }}>
                  <strong>Status:</strong> {details.status} <Badge level={resolveBadgeLevel(details.status)} />
                </div>
                <p style={{ margin: "8px 0 0 0", color: "#374151" }}>
                  <strong>Explanation:</strong> {details.explanation}
                </p>
                <div style={{ marginTop: 8 }}>
                  <strong>Readiness:</strong> {details.readiness} <Badge level={resolveBadgeLevel(details.readiness)} />
                </div>
              </section>
            );
          })}
        </div>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Availability Search</h2>
        <p style={{ margin: "0 0 10px 0", color: "#374151" }}>
          Check real provider domain availability using Openprovider read-only intelligence.
        </p>
        <form method="GET" action="/gnr8/admin/providers/openprovider" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            type="text"
            name="domain"
            placeholder="example-domain.com"
            defaultValue={requestedDomain}
            style={{ border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 10px", minWidth: 260 }}
          />
          <button
            type="submit"
            style={{
              border: "1px solid #0f172a",
              borderRadius: 8,
              background: "#0f172a",
              color: "#ffffff",
              fontWeight: 700,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Check Availability
          </button>
        </form>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Availability Intelligence</h2>
        <div><strong>domain</strong>: {String(availability.domain ?? selectedDomain)}</div>
        <div><strong>available</strong>: {String((availability.available as OpenproviderDomainAvailabilityValue | undefined) ?? "unknown")}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong>available badge</strong>:
          <Badge level={resolveAvailabilityBadgeLevel(availability.available as OpenproviderDomainAvailabilityValue | undefined)} />
        </div>
        <div><strong>status</strong>: {String((availability.status as OpenproviderDomainAvailabilityStatus | undefined) ?? "failed_closed")}</div>
        <div><strong>checkedAt</strong>: {formatDate(String(availability.checkedAt ?? ""))}</div>
      </section>

      <section style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>Safety Boundary</h2>
        <div><strong>executionAllowed</strong>: false</div>
        <div><strong>executionBlocked</strong>: true</div>
        <p style={{ margin: "8px 0 0 0", color: "#374151", fontWeight: 700 }}>Read-only boundary active</p>
      </section>

      <details style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Diagnostics</summary>
        <div style={{ marginTop: 10 }}>{renderDiagnostics(props.payload.diagnostics)}</div>
      </details>

      <details style={{ border: "1px solid #dbe3ea", borderRadius: 10, background: "#ffffff", padding: 12, marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>Raw payloads</summary>
        <pre
          style={{
            marginTop: 10,
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            background: "#0f172a",
            color: "#e2e8f0",
            borderRadius: 8,
            padding: 12,
          }}
        >
          {JSON.stringify(props.payload, null, 2)}
        </pre>
      </details>
    </main>
  );
}
