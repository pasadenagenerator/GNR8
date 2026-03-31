"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

import type { BulkActionItemResult, BulkActionResult, BulkMigrationActionType } from "@/gnr8/command-center/bulk-action-types";
import { runBulkMigrationActions } from "@/gnr8/command-center/bulk-migration-actions";
import { canPerformAction, type AgencyRole } from "@/src/auth/rbac";
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

type MigrationStatus = "NOT_STARTED" | "IMPORTED" | "PREVIEW_READY" | "APPROVED" | "LIVE" | "ERROR";

type MigrationRow = {
  status: MigrationStatus;
  auto_advanced: boolean;
  automation_reason: string | null;
  latest_site_version_id: string | null;
  preview_url: string | null;
  live_url: string | null;
  latest_runtime_state: string | null;
};

type CommandCenterRow = {
  summary: SummaryRow;
  margin: MarginRow | null;
  simulation: SimulationRow | null;
  migration: MigrationRow;
};

type SortField = "total_cost" | "margin" | "margin_percentage";
type SortDirection = "asc" | "desc";
type RowAction = "import" | "generate_preview" | "approve" | "publish";

type Props = {
  rows: CommandCenterRow[];
  clients: ClientOption[];
  agencyNameByAgencyId: Record<string, string>;
  actorRole: AgencyRole | null;
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

function migrationStatusBadge(status: MigrationStatus): { label: string; style: CSSProperties } {
  if (status === "NOT_STARTED") {
    return { label: "NOT_STARTED", style: badgeStyle({ textColor: "#374151", background: "#f3f4f6", border: "1px solid #d1d5db" }) };
  }
  if (status === "IMPORTED") {
    return { label: "IMPORTED", style: badgeStyle({ textColor: "#1d4ed8", background: "#dbeafe", border: "1px solid #93c5fd" }) };
  }
  if (status === "PREVIEW_READY") {
    return { label: "PREVIEW_READY", style: badgeStyle({ textColor: "#6b21a8", background: "#f3e8ff", border: "1px solid #d8b4fe" }) };
  }
  if (status === "APPROVED") {
    return { label: "APPROVED", style: badgeStyle({ textColor: "#854d0e", background: "#fef9c3", border: "1px solid #fde047" }) };
  }
  if (status === "LIVE") {
    return { label: "LIVE", style: badgeStyle({ textColor: "#166534", background: "#dcfce7", border: "1px solid #86efac" }) };
  }
  return { label: "ERROR", style: badgeStyle({ textColor: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5" }) };
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

function actionButtonStyle(enabled: boolean): CSSProperties {
  return {
    padding: "5px 8px",
    borderRadius: 7,
    border: "1px solid #cbd5e1",
    background: enabled ? "#ffffff" : "#f8fafc",
    color: enabled ? "#111827" : "#94a3b8",
    fontSize: 11,
    fontWeight: 600,
    cursor: enabled ? "pointer" : "not-allowed",
    lineHeight: "14px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
  };
}

function bulkOutcomeStyle(item: BulkActionItemResult): CSSProperties {
  if (item.outcome === "succeeded") {
    return badgeStyle({ textColor: "#065f46", background: "#dcfce7", border: "1px solid #86efac" });
  }
  if (item.outcome === "skipped") {
    return badgeStyle({ textColor: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d" });
  }
  return badgeStyle({ textColor: "#991b1b", background: "#fee2e2", border: "1px solid #fca5a5" });
}

function formatBulkResultSummary(result: BulkActionResult): string {
  return `${result.total_succeeded} succeeded, ${result.total_failed} failed, ${result.total_skipped} skipped`;
}

function buildImportUrlFromDomain(domain: string | null): string | null {
  const raw = String(domain ?? "").trim();
  if (!raw) return null;

  try {
    const parsed = raw.includes("://") ? new URL(raw) : new URL(`https://${raw}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function CommandCenterOpsTable(props: Props) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>("total_cost");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showOnlyUnassigned, setShowOnlyUnassigned] = useState(false);
  const [showOnlyHighCost, setShowOnlyHighCost] = useState(false);
  const [showOnlyLossMaking, setShowOnlyLossMaking] = useState(false);
  const [showOnlyNotStarted, setShowOnlyNotStarted] = useState(false);
  const [showOnlyReadyForApproval, setShowOnlyReadyForApproval] = useState(false);
  const [showOnlyLive, setShowOnlyLive] = useState(false);
  const [showOnlyError, setShowOnlyError] = useState(false);
  const [showNeedsAttention, setShowNeedsAttention] = useState(false);
  const [compactMode, setCompactMode] = useState(true);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [bulkClientId, setBulkClientId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMigrationBusy, setBulkMigrationBusy] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkActionResult | null>(null);
  const [retrySelectionBySiteId, setRetrySelectionBySiteId] = useState<Record<string, boolean>>({});
  const [rowBusyBySiteId, setRowBusyBySiteId] = useState<Record<string, boolean>>({});
  const [rowErrorBySiteId, setRowErrorBySiteId] = useState<Record<string, string>>({});
  const canRunMigration = canPerformAction(props.actorRole, "run_migration");
  const canApproveMigration = canPerformAction(props.actorRole, "approve_migration");
  const canPublish = canPerformAction(props.actorRole, "publish");
  const canAssignClient = canPerformAction(props.actorRole, "assign_client");
  const canRunBulkActions = canPerformAction(props.actorRole, "bulk_actions");

  const rowBySiteId = useMemo(() => {
    const next = new Map<string, CommandCenterRow>();
    for (const row of props.rows) {
      next.set(row.summary.site_id, row);
    }
    return next;
  }, [props.rows]);

  const filteredRows = useMemo(() => {
    const hasExplicitStatusFilter = showOnlyNotStarted || showOnlyReadyForApproval || showOnlyLive || showOnlyError;

    return props.rows.filter((row) => {
      if (showOnlyUnassigned && row.summary.client_id) return false;
      if (showOnlyHighCost && !row.margin?.flags.is_high_cost) return false;
      if (showOnlyLossMaking && !row.margin?.flags.is_loss_making) return false;

      if (hasExplicitStatusFilter) {
        const status = row.migration.status;
        const matchesStatusFilter =
          (showOnlyNotStarted && status === "NOT_STARTED") ||
          (showOnlyReadyForApproval && status === "PREVIEW_READY") ||
          (showOnlyLive && status === "LIVE") ||
          (showOnlyError && status === "ERROR");
        if (!matchesStatusFilter) return false;
      }

      if (showNeedsAttention) {
        const status = row.migration.status;
        const isAttention = status === "ERROR" || status === "NOT_STARTED" || status === "PREVIEW_READY";
        if (!isAttention) return false;
      }

      return true;
    });
  }, [
    props.rows,
    showNeedsAttention,
    showOnlyError,
    showOnlyHighCost,
    showOnlyLive,
    showOnlyLossMaking,
    showOnlyNotStarted,
    showOnlyReadyForApproval,
    showOnlyUnassigned,
  ]);

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
  const bulkRetryableFailed = useMemo(
    () => bulkResult?.item_results.filter((item) => item.outcome === "failed" && item.retryable) ?? [],
    [bulkResult],
  );
  const bulkRetryableSkipped = useMemo(
    () => bulkResult?.item_results.filter((item) => item.outcome === "skipped" && item.retryable) ?? [],
    [bulkResult],
  );

  function resetFeedback() {
    setBulkMessage(null);
    setBulkError(null);
  }

  function resetBulkResult() {
    setBulkResult(null);
    setRetrySelectionBySiteId({});
  }

  function primeRetrySelection(result: BulkActionResult) {
    const nextSelection: Record<string, boolean> = {};
    for (const item of result.item_results) {
      nextSelection[item.site_id] = item.outcome === "failed" && item.retryable;
    }
    setRetrySelectionBySiteId(nextSelection);
  }

  function clearRowError(siteId: string) {
    setRowErrorBySiteId((current) => {
      if (!current[siteId]) return current;
      const next = { ...current };
      delete next[siteId];
      return next;
    });
  }

  function toggleSort(field: SortField) {
    resetFeedback();
    if (sortField === field) {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
      return;
    }
    setSortField(field);
    setSortDirection("desc");
  }

  function setAllVisibleSelected(checked: boolean) {
    resetFeedback();

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
    resetFeedback();

    setSelectedSiteIds((current) => {
      if (checked) {
        const merged = new Set([...current, siteId]);
        return Array.from(merged);
      }
      return current.filter((id) => id !== siteId);
    });
  }

  async function parseActionError(res: Response): Promise<string> {
    const payload = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
    if (payload?.error) return payload.error;
    if (payload?.message) return payload.message;
    return `Request failed (HTTP ${res.status})`;
  }

  async function runMigrationMutation(row: CommandCenterRow, action: RowAction): Promise<void> {
    if (action === "import" || action === "generate_preview") {
      if (!canRunMigration) {
        throw new Error("Your role is not authorized to run migration actions.");
      }
    } else if (action === "approve") {
      if (!canApproveMigration) {
        throw new Error("Your role is not authorized to approve migrations.");
      }
    } else if (!canPublish) {
      throw new Error("Your role is not authorized to publish migrations.");
    }

    if (action === "import") {
      const importUrl = buildImportUrlFromDomain(row.summary.domain);
      if (!importUrl) {
        throw new Error("Import requires a valid domain URL");
      }

      const res = await fetch("/api/gnr8/runtime/migrate/url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: importUrl,
          actor: "operator:command-center-import",
          slug: "/",
          agencyId: row.summary.agency_id,
        }),
      });

      const payload = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error ?? `Import failed (HTTP ${res.status})`);
      }
      return;
    }

    const siteVersionId = row.migration.latest_site_version_id;
    if (!siteVersionId) {
      throw new Error("Missing site version ID for this action");
    }

    if (action === "generate_preview") {
      const res = await fetch(`/api/gnr8/runtime/versions/${siteVersionId}/ready`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actor: "operator:command-center-preview" }),
      });
      if (!res.ok) throw new Error(await parseActionError(res));
      return;
    }

    if (action === "approve") {
      const res = await fetch(`/api/gnr8/runtime/versions/${siteVersionId}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actor: "operator:command-center-approve" }),
      });
      if (!res.ok) throw new Error(await parseActionError(res));
      return;
    }

    const res = await fetch(`/api/gnr8/runtime/versions/${siteVersionId}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ actor: "operator:command-center-publish" }),
    });
    if (!res.ok) throw new Error(await parseActionError(res));
  }

  async function applyRowMigrationAction(siteId: string, action: RowAction, doneLabel: string) {
    const row = rowBySiteId.get(siteId);
    if (!row) return;

    setRowBusyBySiteId((current) => ({ ...current, [siteId]: true }));
    clearRowError(siteId);
    resetFeedback();

    try {
      await runMigrationMutation(row, action);
      setBulkMessage(doneLabel);
      router.refresh();
    } catch (error) {
      setRowErrorBySiteId((current) => ({
        ...current,
        [siteId]: error instanceof Error ? error.message : "Migration action failed",
      }));
    } finally {
      setRowBusyBySiteId((current) => ({ ...current, [siteId]: false }));
    }
  }

  async function applyBulkAssignment() {
    if (!canAssignClient) {
      setBulkError("Your role is not authorized to assign clients.");
      return;
    }
    if (!bulkClientId || selectedSiteIds.length === 0 || bulkBusy || bulkMigrationBusy) return;

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

  async function runBulkMigrationForSiteIds(action: BulkMigrationActionType, siteIds: string[]) {
    setBulkMigrationBusy(true);
    setBulkError(null);
    setBulkMessage(null);
    resetBulkResult();

    try {
      const inputRows = siteIds.map((siteId) => {
        const row = rowBySiteId.get(siteId);
        if (!row) {
          return {
            site_id: siteId,
            domain: null,
            agency_id: null,
            status: "UNKNOWN" as const,
            latest_site_version_id: null,
          };
        }

        return {
          site_id: row.summary.site_id,
          domain: row.summary.domain,
          agency_id: row.summary.agency_id,
          status: row.migration.status,
          latest_site_version_id: row.migration.latest_site_version_id,
        };
      });

      const result = await runBulkMigrationActions({
        actorRole: props.actorRole,
        action,
        items: inputRows,
      });

      setBulkResult(result);
      primeRetrySelection(result);
      setBulkMessage(`Bulk ${action}: ${formatBulkResultSummary(result)}.`);

      if (result.total_succeeded > 0) {
        router.refresh();
      }
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : "Bulk migration action failed");
    } finally {
      setBulkMigrationBusy(false);
    }
  }

  async function applyBulkMigrationAction(action: BulkMigrationActionType) {
    if (!canRunBulkActions) {
      setBulkError("Your role is not authorized for bulk migration actions.");
      return;
    }
    if (selectedSiteIds.length === 0 || bulkMigrationBusy || bulkBusy) return;
    await runBulkMigrationForSiteIds(action, selectedSiteIds);
  }

  async function retryFailedBulkItems() {
    if (!bulkResult || bulkMigrationBusy || bulkBusy) return;
    const retryIds = bulkRetryableFailed.map((item) => item.site_id);
    if (retryIds.length === 0) return;
    await runBulkMigrationForSiteIds(bulkResult.action_type, retryIds);
  }

  async function retrySkippedBulkItems() {
    if (!bulkResult || bulkMigrationBusy || bulkBusy) return;
    const retryIds = bulkRetryableSkipped.map((item) => item.site_id);
    if (retryIds.length === 0) return;
    await runBulkMigrationForSiteIds(bulkResult.action_type, retryIds);
  }

  async function retrySelectedBulkItems() {
    if (!bulkResult || bulkMigrationBusy || bulkBusy) return;
    const retryIds = Object.entries(retrySelectionBySiteId)
      .filter(([, selected]) => selected)
      .map(([siteId]) => siteId);
    if (retryIds.length === 0) return;
    await runBulkMigrationForSiteIds(bulkResult.action_type, retryIds);
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
          <input
            type="checkbox"
            checked={showOnlyNotStarted}
            onChange={(event) => setShowOnlyNotStarted(event.target.checked)}
          />
          Show NOT_STARTED
        </label>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, color: "#374151" }}>
          <input
            type="checkbox"
            checked={showOnlyReadyForApproval}
            onChange={(event) => setShowOnlyReadyForApproval(event.target.checked)}
          />
          Show READY_FOR_APPROVAL
        </label>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, color: "#374151" }}>
          <input type="checkbox" checked={showOnlyLive} onChange={(event) => setShowOnlyLive(event.target.checked)} />
          Show LIVE
        </label>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, color: "#374151" }}>
          <input type="checkbox" checked={showOnlyError} onChange={(event) => setShowOnlyError(event.target.checked)} />
          Show ERROR
        </label>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, color: "#374151" }}>
          <input type="checkbox" checked={showNeedsAttention} onChange={(event) => setShowNeedsAttention(event.target.checked)} />
          Needs Attention
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
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a" }}>{selectedCount} selected</span>
            <span style={{ fontSize: 12, color: "#1f2937" }}>Bulk migration actions</span>
            <button
              type="button"
              title={canRunBulkActions ? undefined : "Not allowed for your role"}
              disabled={bulkMigrationBusy || bulkBusy || !canRunBulkActions}
              onClick={() => applyBulkMigrationAction("import")}
              style={actionButtonStyle(!bulkMigrationBusy && !bulkBusy && canRunBulkActions)}
            >
              {bulkMigrationBusy ? "Running…" : "Import"}
            </button>
            <button
              type="button"
              title={canRunBulkActions ? undefined : "Not allowed for your role"}
              disabled={bulkMigrationBusy || bulkBusy || !canRunBulkActions}
              onClick={() => applyBulkMigrationAction("approve")}
              style={actionButtonStyle(!bulkMigrationBusy && !bulkBusy && canRunBulkActions)}
            >
              {bulkMigrationBusy ? "Running…" : "Approve"}
            </button>
            <button
              type="button"
              title={canRunBulkActions ? undefined : "Not allowed for your role"}
              disabled={bulkMigrationBusy || bulkBusy || !canRunBulkActions}
              onClick={() => applyBulkMigrationAction("publish")}
              style={actionButtonStyle(!bulkMigrationBusy && !bulkBusy && canRunBulkActions)}
            >
              {bulkMigrationBusy ? "Running…" : "Publish"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
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
              title={canAssignClient ? undefined : "Not allowed for your role"}
              disabled={!bulkClientId || bulkBusy || bulkMigrationBusy || !canAssignClient}
              onClick={applyBulkAssignment}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: !bulkClientId || bulkBusy || bulkMigrationBusy || !canAssignClient ? "#f8fafc" : "#ffffff",
                fontSize: 12,
                cursor: !bulkClientId || bulkBusy || bulkMigrationBusy || !canAssignClient ? "not-allowed" : "pointer",
              }}
            >
              {bulkBusy ? "Applying…" : "Apply"}
            </button>
          </div>

          {bulkMessage ? <span style={{ fontSize: 12, color: "#065f46" }}>{bulkMessage}</span> : null}
          {bulkError ? <span style={{ fontSize: 12, color: "#991b1b" }}>{bulkError}</span> : null}
        </div>
      ) : null}

      {bulkResult ? (
        <div
          style={{
            marginBottom: 10,
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 10,
            background: "#f8fafc",
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#111827" }}>
              Bulk {bulkResult.action_type}: {formatBulkResultSummary(bulkResult)}
            </span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>
              attempted {bulkResult.total_attempted} of {bulkResult.total_requested}
            </span>
            <button
              type="button"
              disabled={bulkRetryableFailed.length === 0 || bulkMigrationBusy || bulkBusy}
              onClick={retryFailedBulkItems}
              style={actionButtonStyle(bulkRetryableFailed.length > 0 && !bulkMigrationBusy && !bulkBusy)}
            >
              Retry failed ({bulkRetryableFailed.length})
            </button>
            <button
              type="button"
              disabled={bulkRetryableSkipped.length === 0 || bulkMigrationBusy || bulkBusy}
              onClick={retrySkippedBulkItems}
              style={actionButtonStyle(bulkRetryableSkipped.length > 0 && !bulkMigrationBusy && !bulkBusy)}
            >
              Retry skipped ({bulkRetryableSkipped.length})
            </button>
            <button
              type="button"
              disabled={bulkMigrationBusy || bulkBusy}
              onClick={retrySelectedBulkItems}
              style={actionButtonStyle(!bulkMigrationBusy && !bulkBusy)}
            >
              Retry selected
            </button>
          </div>

          {bulkMessage ? <span style={{ fontSize: 12, color: "#065f46" }}>{bulkMessage}</span> : null}
          {bulkError ? <span style={{ fontSize: 12, color: "#991b1b" }}>{bulkError}</span> : null}

          <div style={{ maxHeight: 240, overflowY: "auto", display: "grid", gap: 6 }}>
            {bulkResult.item_results
              .filter((item) => item.outcome !== "succeeded")
              .map((item) => {
                const canRetrySelect = item.retryable && (item.outcome === "failed" || item.outcome === "skipped");
                return (
                  <label
                    key={`${bulkResult.action_type}-${item.site_id}-${item.reason_code}`}
                    style={{
                      display: "grid",
                      gap: 4,
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      padding: "7px 8px",
                      background: "#ffffff",
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="checkbox"
                        checked={!!retrySelectionBySiteId[item.site_id]}
                        disabled={!canRetrySelect}
                        onChange={(event) =>
                          setRetrySelectionBySiteId((current) => ({
                            ...current,
                            [item.site_id]: event.target.checked,
                          }))
                        }
                      />
                      <span style={{ fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                        {shortId(item.site_id)}
                      </span>
                      <span style={bulkOutcomeStyle(item)}>{item.outcome.toUpperCase()}</span>
                      <span style={badgeStyle({ textColor: "#334155", background: "#e2e8f0", border: "1px solid #cbd5e1" })}>{item.reason_code}</span>
                      <span style={{ fontSize: 11, color: item.retryable ? "#166534" : "#6b7280" }}>
                        retryable: {item.retryable ? "yes" : "no"}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#374151" }}>
                      {item.domain ? `${item.domain}: ` : ""}
                      {item.reason_message}
                    </div>
                  </label>
                );
              })}
          </div>
        </div>
      ) : null}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 2200 }}>
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
                Status
              </th>
              <th style={{ textAlign: "left", fontSize: 12, color: "#4b5563", borderBottom: "1px solid #e5e7eb", padding: "6px 8px" }}>
                Migration Actions
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
                Ownership Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={15} style={{ borderTop: "1px solid #f3f4f6", padding: "12px", fontSize: 13, color: "#6b7280" }}>
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
              const rowBusy = !!rowBusyBySiteId[row.summary.site_id];
              const rowError = rowErrorBySiteId[row.summary.site_id];
              const migrationBadge = migrationStatusBadge(row.migration.status);

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
                  <td style={{ borderTop: "1px solid #f3f4f6", padding: rowPadding, fontSize: 12, verticalAlign: "top" }}>
                    <div style={{ display: "grid", gap: 5 }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={migrationBadge.style}>{migrationBadge.label}</span>
                        {row.migration.auto_advanced ? (
                          <span
                            title={row.migration.automation_reason ?? "Automatically advanced from deterministic migration evidence."}
                            style={badgeStyle({ textColor: "#0f172a", background: "#e2e8f0", border: "1px solid #cbd5e1" })}
                          >
                            AUTO
                          </span>
                        ) : null}
                      </div>
                      {row.migration.latest_runtime_state ? (
                        <span style={{ color: "#6b7280", fontSize: 11 }}>Runtime: {row.migration.latest_runtime_state}</span>
                      ) : null}
                      {row.migration.auto_advanced && row.migration.automation_reason ? (
                        <span style={{ color: "#6b7280", fontSize: 11 }}>Reason: {row.migration.automation_reason}</span>
                      ) : null}
                    </div>
                  </td>
                  <td style={{ borderTop: "1px solid #f3f4f6", padding: rowPadding, fontSize: 12, verticalAlign: "top" }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {row.migration.status === "NOT_STARTED" ? (
                          <button
                            type="button"
                            title={canRunMigration ? undefined : "Not allowed for your role"}
                            disabled={rowBusy || !canRunMigration}
                            onClick={() => applyRowMigrationAction(row.summary.site_id, "import", "Import action started.")}
                            style={actionButtonStyle(!rowBusy && canRunMigration)}
                          >
                            {rowBusy ? "Running…" : "Import"}
                          </button>
                        ) : null}

                        {row.migration.status === "IMPORTED" ? (
                          <button
                            type="button"
                            title={canRunMigration ? undefined : "Not allowed for your role"}
                            disabled={rowBusy || !row.migration.latest_site_version_id || !canRunMigration}
                            onClick={() => applyRowMigrationAction(row.summary.site_id, "generate_preview", "Preview generation requested.")}
                            style={actionButtonStyle(!rowBusy && !!row.migration.latest_site_version_id && canRunMigration)}
                          >
                            {rowBusy ? "Running…" : "Generate Preview"}
                          </button>
                        ) : null}

                        {row.migration.status === "PREVIEW_READY" ? (
                          <>
                            {row.migration.preview_url ? (
                              <a href={row.migration.preview_url} target="_blank" rel="noreferrer" style={actionButtonStyle(true)}>
                                Open Preview
                              </a>
                            ) : null}
                            <button
                              type="button"
                              title={canApproveMigration ? undefined : "Not allowed for your role"}
                              disabled={rowBusy || !row.migration.latest_site_version_id || !canApproveMigration}
                              onClick={() => applyRowMigrationAction(row.summary.site_id, "approve", "Approval action completed.")}
                              style={actionButtonStyle(!rowBusy && !!row.migration.latest_site_version_id && canApproveMigration)}
                            >
                              {rowBusy ? "Running…" : "Approve"}
                            </button>
                          </>
                        ) : null}

                        {row.migration.status === "APPROVED" ? (
                          <button
                            type="button"
                            title={canPublish ? undefined : "Not allowed for your role"}
                            disabled={rowBusy || !row.migration.latest_site_version_id || !canPublish}
                            onClick={() => applyRowMigrationAction(row.summary.site_id, "publish", "Publish action completed.")}
                            style={actionButtonStyle(!rowBusy && !!row.migration.latest_site_version_id && canPublish)}
                          >
                            {rowBusy ? "Running…" : "Publish"}
                          </button>
                        ) : null}

                        {row.migration.status === "LIVE" ? (
                          row.migration.live_url ? (
                            <a href={row.migration.live_url} target="_blank" rel="noreferrer" style={actionButtonStyle(true)}>
                              View Live
                            </a>
                          ) : (
                            <span style={{ color: "#6b7280", fontSize: 11 }}>Live domain unavailable</span>
                          )
                        ) : null}

                        {row.migration.status === "ERROR" ? (
                          <button
                            type="button"
                            title={canRunMigration ? undefined : "Not allowed for your role"}
                            disabled={rowBusy || !canRunMigration}
                            onClick={() => applyRowMigrationAction(row.summary.site_id, "import", "Retry import requested.")}
                            style={actionButtonStyle(!rowBusy && canRunMigration)}
                          >
                            {rowBusy ? "Running…" : "Retry Import"}
                          </button>
                        ) : null}
                      </div>

                      {rowError ? <span style={{ color: "#991b1b", fontSize: 11 }}>{rowError}</span> : null}
                    </div>
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
                    <SiteAssignmentControl
                      siteId={row.summary.site_id}
                      currentClientId={row.summary.client_id}
                      clients={props.clients}
                      disabled={!canAssignClient}
                      disabledReason={!canAssignClient ? "Assignment restricted by role." : undefined}
                    />
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
