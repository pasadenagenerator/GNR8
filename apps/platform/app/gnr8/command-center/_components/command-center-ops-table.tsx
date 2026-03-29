"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

import { SiteAssignmentControl } from "./site-assignment-control";

type ClientOption = {
  client_id: string;
  client_name: string | null;
  agency_id: string | null;
  agency_name: string | null;
};

type SummaryRow = {
  site_id: string;
  domain: string | null;
  site_status: string;
  client_id: string | null;
  client_name: string | null;
  agency_id: string;
  ai_estimated_cost_sum: number;
  runtime_estimated_cost_sum: number;
  total_estimated_cost: number;
  cost_completeness_status: string;
};

type MarginRow = {
  margin: number;
  margin_percentage: number;
  flags: {
    is_profitable: boolean;
    is_high_cost: boolean;
    is_loss_making: boolean;
  };
};

type PlanCandidate = {
  plan_name: "STARTER" | "GROWTH" | "MANAGED";
  margin: number;
};

type SimulationRow = {
  ranked_plans: PlanCandidate[];
  plan_results: {
    STARTER: PlanCandidate | null;
    GROWTH: PlanCandidate | null;
    MANAGED: PlanCandidate | null;
  };
};

type CommandCenterRow = {
  summary: SummaryRow;
  margin: MarginRow | null;
  simulation: SimulationRow | null;
};

type SortField = "total_cost" | "margin" | "margin_percentage";
type SortDirection = "asc" | "desc";

type Props = {
  rows: CommandCenterRow[];
  clients: ClientOption[];
  agencyNameByAgencyId: Record<string, string>;
};

function shortId(value: string): string {
  if (value.length <= 8) return value;
  return `${value.slice(0, 8)}...`;
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(2)}%`;
}

function displayClientName(input: { client_name: string | null; client_id: string | null }): string {
  if (input.client_name?.trim()) return input.client_name;
  if (input.client_id?.trim()) return shortId(input.client_id);
  return "Unassigned";
}

function rowValue(row: CommandCenterRow, field: SortField): number {
  if (field === "total_cost") return row.summary.total_estimated_cost;
  if (field === "margin") return row.margin?.margin ?? Number.NEGATIVE_INFINITY;
  return row.margin?.margin_percentage ?? Number.NEGATIVE_INFINITY;
}

function badgeStyle(input: {
  textColor: string;
  background: string;
  border?: string;
}): CSSProperties {
  return {
    padding: "2px 6px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    color: input.textColor,
    background: input.background,
    border: input.border ?? "1px solid transparent",
    lineHeight: "14px",
    display: "inline-flex",
    alignItems: "center",
  };
}

function planLineStyle(isBest: boolean): CSSProperties {
  if (isBest) {
    return {
      fontWeight: 700,
      color: "#111827",
      background: "#eef2ff",
      borderRadius: 6,
      padding: "1px 6px",
      display: "inline-block",
    };
  }

  return {
    fontWeight: 500,
    color: "#6b7280",
  };
}

export function CommandCenterOpsTable(props: Props) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>("total_cost");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);
  const [showOnlyHighCost, setShowOnlyHighCost] = useState(false);
  const [showOnlyLossMaking, setShowOnlyLossMaking] = useState(false);
  const [compactMode, setCompactMode] = useState(true);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [bulkClientId, setBulkClientId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    return props.rows.filter((row) => {
      if (showOnlyUnassigned && row.summary.client_id) return false;
      if (showOnlyHighCost && !row.margin?.flags.is_high_cost) return false;
      if (showOnlyLossMaking && !row.margin?.flags.is_loss_making) return false;
      return true;
    });
  }, [props.rows, showOnlyHighCost, showOnlyLossMaking, showOnlyUnassigned]);

  const sortedRows = useMemo(() => {
    const next = [...filteredRows];
    next.sort((a, b) => {
      const aValue = rowValue(a, sortField);
      const bValue = rowValue(b, sortField);
      if (aValue !== bValue) {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      return a.summary.site_id.localeCompare(b.summary.site_id);
    });
    return next;
  }, [filteredRows, sortDirection, sortField]);

  const selectedSet = useMemo(() => new Set(selectedSiteIds), [selectedSiteIds]);

  const allVisibleSelected = sortedRows.length > 0 && sortedRows.every((row) => selectedSet.has(row.summary.site_id));
  const selectedCount = selectedSiteIds.length;

  const rowPadding = compactMode ? "6px 8px" : "10px";

  function toggleSort(field: SortField) {
    setBulkMessage(null);
    setBulkError(null);
    if (sortField === field) {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setSortField(field);
    setSortDirection("desc");
  }

  function setAllVisibleSelected(checked: boolean) {
    setBulkMessage(null);
    setBulkError(null);

    if (!checked) {
      setSelectedSiteIds((current) => current.filter((siteId) => !sortedRows.some((row) => row.summary.site_id === siteId)));
      return;
    }

    const visibleIds = sortedRows.map((row) => row.summary.site_id);
    setSelectedSiteIds((current) => {
      const merged = new Set([...current, ...visibleIds]);
      return Array.from(merged);
    });
  }

  function toggleRow(siteId: string, checked: boolean) {
    setBulkMessage(null);
    setBulkError(null);

    setSelectedSiteIds((current) => {
      if (checked) {
        const merged = new Set([...current, siteId]);
        return Array.from(merged);
      }
      return current.filter((id) => id !== siteId);
    });
  }

  async function applyBulkAssignment() {
    if (!bulkClientId || selectedSiteIds.length === 0 || bulkBusy) return;

    setBulkBusy(true);
    setBulkError(null);
    setBulkMessage(null);

    let okCount = 0;
    let failedCount = 0;

    try {
      for (const siteId of selectedSiteIds) {
        const res = await fetch("/api/gnr8/assign-site", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ siteId, clientId: bulkClientId }),
        });

        const json = (await res.json().catch(() => null)) as { ok?: boolean } | null;
        if (res.ok && json?.ok) {
          okCount += 1;
        } else {
          failedCount += 1;
        }
      }

      if (okCount > 0) {
        setBulkMessage(
          failedCount > 0
            ? `Assigned ${okCount} site${okCount === 1 ? "" : "s"}. ${failedCount} failed.`
            : `Assigned ${okCount} site${okCount === 1 ? "" : "s"}.`,
        );
      }

      if (failedCount > 0 && okCount === 0) {
        setBulkError(`Bulk assignment failed for ${failedCount} site${failedCount === 1 ? "" : "s"}.`);
      }

      if (okCount > 0) {
        setSelectedSiteIds([]);
        router.refresh();
      }
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : "Bulk assignment failed");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <section style={{ marginTop: 14, border: "1px solid #dbe2ea", background: "#fff", borderRadius: 12, padding: 14 }}>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, color: "#374151" }}>
          <input
            type="checkbox"
            checked={showOnlyUnassigned}
            onChange={(event) => setShowOnlyUnassigned(event.target.checked)}
          />
          Show only unassigned
        </label>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, color: "#374151" }}>
          <input type="checkbox" checked={showOnlyHighCost} onChange={(event) => setShowOnlyHighCost(event.target.checked)} />
          Show only high cost
        </label>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, color: "#374151" }}>
          <input
            type="checkbox"
            checked={showOnlyLossMaking}
            onChange={(event) => setShowOnlyLossMaking(event.target.checked)}
          />
          Show only loss-making
        </label>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, color: "#374151" }}>
          <input type="checkbox" checked={compactMode} onChange={(event) => setCompactMode(event.target.checked)} />
          Compact table mode
        </label>
      </div>

      {selectedCount > 0 ? (
        <div
          style={{
            marginBottom: 10,
            padding: "8px 10px",
            border: "1px solid #c7d2fe",
            borderRadius: 10,
            background: "#eef2ff",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a" }}>{selectedCount} selected</span>
          <span style={{ fontSize: 12, color: "#1f2937" }}>Assign selected to client</span>
          <select
            value={bulkClientId}
            onChange={(event) => {
              setBulkClientId(event.target.value);
              setBulkError(null);
              setBulkMessage(null);
            }}
            style={{ padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 12, background: "#fff" }}
          >
            <option value="">Select client…</option>
            {props.clients.map((client) => (
              <option key={client.client_id} value={client.client_id}>
                {client.client_name?.trim() || client.client_id}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!bulkClientId || bulkBusy}
            onClick={applyBulkAssignment}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: !bulkClientId || bulkBusy ? "#f8fafc" : "#ffffff",
              fontSize: 12,
              cursor: !bulkClientId || bulkBusy ? "not-allowed" : "pointer",
            }}
          >
            {bulkBusy ? "Applying…" : "Apply"}
          </button>
          {bulkMessage ? <span style={{ fontSize: 12, color: "#065f46" }}>{bulkMessage}</span> : null}
          {bulkError ? <span style={{ fontSize: 12, color: "#991b1b" }}>{bulkError}</span> : null}
        </div>
      ) : null}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1800 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", fontSize: 12, color: "#4b5563", borderBottom: "1px solid #e5e7eb", padding: "6px 8px" }}>
                <input
                  type="checkbox"
                  aria-label="Select all visible rows"
                  checked={allVisibleSelected}
                  onChange={(event) => setAllVisibleSelected(event.target.checked)}
                />
              </th>
              <th style={{ textAlign: "left", fontSize: 12, color: "#4b5563", borderBottom: "1px solid #e5e7eb", padding: "6px 8px" }}>
                Domain
              </th>
              <th
                style={{
                  textAlign: "left",
                  fontSize: 12,
                  color: "#4b5563",
                  borderBottom: "1px solid #e5e7eb",
                  padding: "6px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                Site ID
              </th>
              <th style={{ textAlign: "left", fontSize: 12, color: "#4b5563", borderBottom: "1px solid #e5e7eb", padding: "6px 8px" }}>
                Client
              </th>
              <th style={{ textAlign: "left", fontSize: 12, color: "#4b5563", borderBottom: "1px solid #e5e7eb", padding: "6px 8px" }}>
                Agency
              </th>
              <th style={{ textAlign: "left", fontSize: 12, color: "#4b5563", borderBottom: "1px solid #e5e7eb", padding: "6px 8px" }}>
                AI
              </th>
              <th style={{ textAlign: "left", fontSize: 12, color: "#4b5563", borderBottom: "1px solid #e5e7eb", padding: "6px 8px" }}>
                Runtime
              </th>
              <th style={{ textAlign: "left", fontSize: 12, color: "#4b5563", borderBottom: "1px solid #e5e7eb", padding: "6px 8px" }}>
                <button
                  type="button"
                  onClick={() => toggleSort("total_cost")}
                  style={{ border: "none", background: "transparent", padding: 0, fontSize: 12, cursor: "pointer", color: "#111827", fontWeight: 700 }}
                >
                  Total Cost {sortField === "total_cost" ? (sortDirection === "desc" ? "▼" : "▲") : ""}
                </button>
              </th>
              <th style={{ textAlign: "left", fontSize: 12, color: "#4b5563", borderBottom: "1px solid #e5e7eb", padding: "6px 8px" }}>
                <button
                  type="button"
                  onClick={() => toggleSort("margin")}
                  style={{ border: "none", background: "transparent", padding: 0, fontSize: 12, cursor: "pointer", color: "#111827", fontWeight: 700 }}
                >
                  Margin {sortField === "margin" ? (sortDirection === "desc" ? "▼" : "▲") : ""}
                </button>
              </th>
              <th style={{ textAlign: "left", fontSize: 12, color: "#4b5563", borderBottom: "1px solid #e5e7eb", padding: "6px 8px" }}>
                <button
                  type="button"
                  onClick={() => toggleSort("margin_percentage")}
                  style={{ border: "none", background: "transparent", padding: 0, fontSize: 12, cursor: "pointer", color: "#111827", fontWeight: 700 }}
                >
                  Margin % {sortField === "margin_percentage" ? (sortDirection === "desc" ? "▼" : "▲") : ""}
                </button>
              </th>
              <th
                style={{
                  textAlign: "left",
                  fontSize: 12,
                  color: "#4b5563",
                  borderBottom: "1px solid #e5e7eb",
                  padding: "6px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                Best Plan
              </th>
              <th
                style={{
                  textAlign: "left",
                  fontSize: 12,
                  color: "#4b5563",
                  borderBottom: "1px solid #e5e7eb",
                  padding: "6px 8px",
                  whiteSpace: "nowrap",
                }}
              >
                Plan Simulation (STARTER / GROWTH / MANAGED)
              </th>
              <th style={{ textAlign: "left", fontSize: 12, color: "#4b5563", borderBottom: "1px solid #e5e7eb", padding: "6px 8px" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={14} style={{ borderTop: "1px solid #f3f4f6", padding: "12px", fontSize: 13, color: "#6b7280" }}>
                  {props.rows.length === 0 ? "No sites found." : "No results for filter."}
                </td>
              </tr>
            ) : null}
            {sortedRows.map((row) => {
              const bestPlan = row.simulation?.ranked_plans?.[0] ?? null;
              const starter = row.simulation?.plan_results.STARTER ?? null;
              const growth = row.simulation?.plan_results.GROWTH ?? null;
              const managed = row.simulation?.plan_results.MANAGED ?? null;
              const agencyDisplay = props.agencyNameByAgencyId[row.summary.agency_id] ?? shortId(row.summary.agency_id);
              const isLossMaking = !!row.margin?.flags.is_loss_making;
              const isHighCost = !!row.margin?.flags.is_high_cost;
              const isUnassigned = !row.summary.client_id;

              let rowBackground = "#ffffff";
              if (isLossMaking) {
                rowBackground = "#fff1f2";
              } else if (isHighCost) {
                rowBackground = "#fff7ed";
              } else if (isUnassigned) {
                rowBackground = "#fefce8";
              }

              const signalBadge =
                row.summary.cost_completeness_status === "FULL_SIGNAL"
                  ? { label: "FULL_SIGNAL", style: badgeStyle({ textColor: "#065f46", background: "#ecfdf5", border: "1px solid #a7f3d0" }) }
                  : row.summary.cost_completeness_status === "PARTIAL_SIGNAL"
                    ? {
                        label: "PARTIAL_SIGNAL",
                        style: badgeStyle({ textColor: "#92400e", background: "#fffbeb", border: "1px solid #fde68a" }),
                      }
                    : { label: row.summary.cost_completeness_status, style: badgeStyle({ textColor: "#4b5563", background: "#f3f4f6" }) };

              const profitabilityBadge = isLossMaking
                ? { label: "LOSS", style: badgeStyle({ textColor: "#991b1b", background: "#fee2e2", border: "1px solid #fecaca" }) }
                : { label: "PROFITABLE", style: badgeStyle({ textColor: "#065f46", background: "#dcfce7", border: "1px solid #86efac" }) };

              const assignmentBadge = isUnassigned
                ? { label: "UNASSIGNED", style: badgeStyle({ textColor: "#854d0e", background: "#fef9c3", border: "1px solid #fde047" }) }
                : { label: "ASSIGNED", style: badgeStyle({ textColor: "#1d4ed8", background: "#dbeafe", border: "1px solid #bfdbfe" }) };

              return (
                <tr key={row.summary.site_id} style={{ background: rowBackground }}>
                  <td style={{ borderTop: "1px solid #f3f4f6", padding: rowPadding }}>
                    <input
                      type="checkbox"
                      checked={selectedSet.has(row.summary.site_id)}
                      onChange={(event) => toggleRow(row.summary.site_id, event.target.checked)}
                      aria-label={`Select ${row.summary.domain ?? row.summary.site_id}`}
                    />
                  </td>
                  <td style={{ borderTop: "1px solid #f3f4f6", padding: rowPadding, fontSize: 13 }}>
                    <div style={{ display: "grid", gap: 5 }}>
                      <span>{row.summary.domain ?? "—"}</span>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <span style={signalBadge.style}>{signalBadge.label}</span>
                        <span style={profitabilityBadge.style}>{profitabilityBadge.label}</span>
                      </div>
                    </div>
                  </td>
                  <td
                    style={{
                      borderTop: "1px solid #f3f4f6",
                      padding: rowPadding,
                      fontSize: 12,
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    }}
                  >
                    {shortId(row.summary.site_id)}
                  </td>
                  <td style={{ borderTop: "1px solid #f3f4f6", padding: rowPadding, fontSize: 13 }}>
                    <div style={{ display: "grid", gap: 5 }}>
                      <span>{displayClientName(row.summary)}</span>
                      <span style={assignmentBadge.style}>{assignmentBadge.label}</span>
                    </div>
                  </td>
                  <td style={{ borderTop: "1px solid #f3f4f6", padding: rowPadding, fontSize: 13 }}>{agencyDisplay}</td>
                  <td style={{ borderTop: "1px solid #f3f4f6", padding: rowPadding, fontSize: 13 }}>{formatMoney(row.summary.ai_estimated_cost_sum)}</td>
                  <td style={{ borderTop: "1px solid #f3f4f6", padding: rowPadding, fontSize: 13 }}>{formatMoney(row.summary.runtime_estimated_cost_sum)}</td>
                  <td style={{ borderTop: "1px solid #f3f4f6", padding: rowPadding, fontSize: 13, fontWeight: 600 }}>
                    {formatMoney(row.summary.total_estimated_cost)}
                  </td>
                  <td
                    style={{
                      borderTop: "1px solid #f3f4f6",
                      padding: rowPadding,
                      fontSize: 13,
                      color: row.margin && row.margin.margin < 0 ? "#991b1b" : "#065f46",
                      fontWeight: 600,
                    }}
                  >
                    {row.margin ? formatMoney(row.margin.margin) : "—"}
                  </td>
                  <td
                    style={{
                      borderTop: "1px solid #f3f4f6",
                      padding: rowPadding,
                      fontSize: 13,
                      color: row.margin && row.margin.margin_percentage < 0 ? "#991b1b" : "#065f46",
                    }}
                  >
                    {row.margin ? formatPercent(row.margin.margin_percentage) : "—"}
                  </td>
                  <td style={{ borderTop: "1px solid #f3f4f6", padding: rowPadding, fontSize: 13, fontWeight: 600 }}>
                    {bestPlan ? `${bestPlan.plan_name} (${formatMoney(bestPlan.margin)})` : "—"}
                  </td>
                  <td style={{ borderTop: "1px solid #f3f4f6", padding: rowPadding, fontSize: 12, lineHeight: compactMode ? "16px" : "18px" }}>
                    <div style={planLineStyle(bestPlan?.plan_name === "STARTER")}>STARTER: {starter ? formatMoney(starter.margin) : "—"}</div>
                    <div style={planLineStyle(bestPlan?.plan_name === "GROWTH")}>GROWTH: {growth ? formatMoney(growth.margin) : "—"}</div>
                    <div style={planLineStyle(bestPlan?.plan_name === "MANAGED")}>MANAGED: {managed ? formatMoney(managed.margin) : "—"}</div>
                  </td>
                  <td style={{ borderTop: "1px solid #f3f4f6", padding: rowPadding, verticalAlign: "top" }}>
                    <SiteAssignmentControl siteId={row.summary.site_id} currentClientId={row.summary.client_id} clients={props.clients} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
