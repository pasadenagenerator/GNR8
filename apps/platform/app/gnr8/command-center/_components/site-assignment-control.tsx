"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ClientOption = {
  client_id: string;
  client_name: string | null;
  agency_id: string | null;
  agency_name: string | null;
};

type Props = {
  siteId: string;
  currentClientId: string | null;
  clients: ClientOption[];
};

function displayClientName(client: ClientOption): string {
  return client.client_name?.trim() || client.client_id;
}

export function SiteAssignmentControl(props: Props) {
  const router = useRouter();
  const [selectedClientId, setSelectedClientId] = useState<string>(props.currentClientId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canAssign = useMemo(() => {
    if (!selectedClientId) return false;
    if (busy) return false;
    return selectedClientId !== (props.currentClientId ?? "");
  }, [busy, props.currentClientId, selectedClientId]);

  async function assign() {
    if (!canAssign) return;
    setBusy(true);
    setError(null);
    setDone(false);

    try {
      const res = await fetch("/api/gnr8/assign-site", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          siteId: props.siteId,
          clientId: selectedClientId,
        }),
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? `Failed to assign client (HTTP ${res.status})`);
        return;
      }

      setDone(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign client");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6, minWidth: 220 }}>
      <select
        value={selectedClientId}
        onChange={(event) => {
          setSelectedClientId(event.target.value);
          setDone(false);
          setError(null);
        }}
        style={{
          padding: "6px 8px",
          border: "1px solid #d1d5db",
          borderRadius: 8,
          fontSize: 12,
          background: "#fff",
        }}
      >
        <option value="">Select client…</option>
        {props.clients.map((client) => (
          <option key={client.client_id} value={client.client_id}>
            {displayClientName(client)}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!canAssign}
        onClick={assign}
        style={{
          padding: "6px 8px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
          background: canAssign ? "#f3f4f6" : "#f9fafb",
          cursor: canAssign ? "pointer" : "not-allowed",
          fontSize: 12,
          color: "#111827",
        }}
      >
        {busy ? "Assigning…" : "Assign"}
      </button>
      {error ? <div style={{ color: "#991b1b", fontSize: 12 }}>{error}</div> : null}
      {!error && done ? <div style={{ color: "#065f46", fontSize: 12 }}>Assigned</div> : null}
    </div>
  );
}

